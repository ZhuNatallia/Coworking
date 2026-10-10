"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { AccountError, accountErrorText, createAccount, setPassword } from "@/lib/auth/accounts";
import { requireAdmin, requireUser } from "@/lib/auth/current";
import { db, newId, nowISO } from "@/lib/db";
import { clearSupplyPhotos } from "@/lib/domain/supplies";
import { DEFAULT_TASKS } from "@/lib/domain/templates";
import { bool, oneOf, optStr, str } from "@/lib/form";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { isOfficeColor } from "@/lib/office-colors";
import { deletePhoto, MAX_PHOTO_BYTES, PHOTO_TYPES, savePhoto } from "@/lib/photos";
import { canAccessOffice } from "@/lib/queries";
import type { Role, SupplyCategory, SupplyStatus, SupplyUnit, TaskCategory, TaskFrequency } from "@/lib/types";
import type { FormState } from "./auth";

const UNITS: SupplyUnit[] = ["pcs", "pack", "roll", "bottle", "ream", "kg", "l"];
const SUPPLY_CATEGORIES: SupplyCategory[] = ["kitchen", "bathroom", "office", "cleaning"];
const TASK_CATEGORIES: TaskCategory[] = ["cleaning", "kitchen", "bathroom", "office", "extra"];
const FREQUENCIES: TaskFrequency[] = ["weekly", "monthly", "as_needed"];

// ---------------------------------------------------------------- cities

export async function createCity(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const { t } = await getI18n();
  const name = str(form, "name");
  if (!name) return { error: t("admin.cityName") };
  const store = db();
  const cities = await store.select("cities");
  if (cities.some((c) => c.name.toLowerCase() === name.toLowerCase())) return { error: t("admin.cityExists") };
  await store.insert("cities", [{ id: newId(), name, sort_order: cities.length, created_at: nowISO() }]);
  refresh();
  return { ok: t("admin.cityAdded", { name }) };
}

// ---------------------------------------------------------------- offices

function officeFields(form: FormData) {
  return {
    name: str(form, "name"),
    address: str(form, "address"),
    contact_name: optStr(form, "contact_name"),
    contact_phone: optStr(form, "contact_phone"),
    notes: optStr(form, "notes"),
    color: isOfficeColor(str(form, "color")) ? str(form, "color") : null,
  };
}

/** Match an existing city by name, or create one so the office can join a new group. */
async function resolveCity(name: string): Promise<{ id: string; name: string } | { error: string }> {
  const { t } = await getI18n();
  if (!name) return { error: t("admin.cityName") };
  const store = db();
  const cities = await store.select("cities");
  const found = cities.find((c) => c.name.toLowerCase() === name.toLowerCase());
  if (found) return found;
  const id = newId();
  await store.insert("cities", [{ id, name, sort_order: cities.length, created_at: nowISO() }]);
  return { id, name };
}

async function officeWithCity(form: FormData, officeId?: string) {
  const { t } = await getI18n();
  const fields = officeFields(form);
  if (!fields.name) return { error: t("admin.officeName") };
  const city = await resolveCity(str(form, "city"));
  if ("error" in city) return { error: city.error };
  const same = await db().select("offices", { eq: { city_id: city.id } });
  if (same.some((o) => o.id !== officeId && o.name.toLowerCase() === fields.name.toLowerCase())) {
    return { error: t("admin.officeExists", { city: city.name, name: fields.name }) };
  }
  return { fields: { ...fields, city_id: city.id } };
}

export async function createOffice(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const prepared = await officeWithCity(form);
  if ("error" in prepared) return { error: prepared.error };
  const fields = prepared.fields;

  const store = db();
  const id = newId();
  await store.insert("offices", [{ id, ...fields, active: true, created_at: nowISO() }]);
  await store.insert(
    "tasks",
    DEFAULT_TASKS.map((t, i) => ({ id: newId(), office_id: id, ...t, active: true, sort_order: i })),
  );
  redirect(`/offices/${id}`);
}

export async function updateOffice(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const id = str(form, "id");
  const prepared = await officeWithCity(form, id);
  if ("error" in prepared) return { error: prepared.error };
  await db().update("offices", { eq: { id } }, { ...prepared.fields, active: bool(form, "active") });
  redirect(`/offices/${id}`);
}

/** Removes an office and everything that belongs only to it, including stored photos. */
export async function deleteOffice(form: FormData) {
  await requireAdmin();
  const id = str(form, "id");
  const store = db();
  const [office] = await store.select("offices", { eq: { id } });
  if (!office) redirect("/");

  const [visits, supplies] = await Promise.all([
    store.select("visits", { eq: { office_id: id } }),
    store.select("office_supplies", { eq: { office_id: id } }),
  ]);
  const visitIds = visits.map((v) => v.id);
  const supplyIds = supplies.map((s) => s.id);
  const [visitPhotos, supplyPhotos] = await Promise.all([
    visitIds.length ? store.select("photos", { in: { visit_id: visitIds } }) : Promise.resolve([]),
    supplyIds.length ? store.select("photos", { in: { office_supply_id: supplyIds } }) : Promise.resolve([]),
  ]);
  const photos = [...visitPhotos, ...supplyPhotos];
  for (const photo of photos) await deletePhoto(photo.url);
  if (photos.length) await store.remove("photos", { in: { id: photos.map((p) => p.id) } });
  if (visitIds.length) {
    await store.remove("visit_tasks", { in: { visit_id: visitIds } });
    await store.remove("visit_supplies", { in: { visit_id: visitIds } });
  }
  await store.remove("supply_requests", { eq: { office_id: id } });
  await store.remove("office_supplies", { eq: { office_id: id } });
  await store.remove("office_mail", { eq: { office_id: id } });
  await store.remove("tasks", { eq: { office_id: id } });
  await store.remove("schedules", { eq: { office_id: id } });
  await store.remove("visits", { eq: { office_id: id } });
  await store.remove("offices", { eq: { id } });
  redirect("/");
}

// ---------------------------------------------------------------- office checklist

export async function saveTask(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const id = str(form, "id");
  const officeId = str(form, "office_id");
  const { t } = await getI18n();
  const name = str(form, "name");
  if (!name) return { error: t("admin.taskName") };
  const frequency = oneOf(str(form, "frequency"), FREQUENCIES, "weekly");
  const fields = {
    name,
    done_label: optStr(form, "done_label"),
    category: oneOf(str(form, "category"), TASK_CATEGORIES, "extra"),
    frequency,
    required: bool(form, "required"),
  };
  const store = db();
  if (id) {
    await store.update("tasks", { eq: { id, office_id: officeId } }, fields);
  } else {
    const existing = await store.select("tasks", { eq: { office_id: officeId } });
    await store.insert("tasks", [{ id: newId(), office_id: officeId, ...fields, active: true, sort_order: existing.length }]);
  }
  refresh();
  return { ok: t(id ? "admin.taskSaved" : "admin.taskAdded") };
}

/** Tasks already used in visits are switched off rather than deleted, so history stays complete. */
export async function removeTask(form: FormData) {
  await requireAdmin();
  const id = str(form, "id");
  const store = db();
  const used = await store.select("visit_tasks", { eq: { task_id: id } });
  if (used.length) await store.update("tasks", { eq: { id } }, { active: false });
  else await store.remove("tasks", { eq: { id } });
  refresh();
}

export async function restoreTask(form: FormData) {
  await requireAdmin();
  await db().update("tasks", { eq: { id: str(form, "id") } }, { active: true });
  refresh();
}

// ---------------------------------------------------------------- office supplies

export async function addOfficeSupply(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const officeId = str(form, "office_id");
  const supplyId = str(form, "supply_id");
  const { t } = await getI18n();
  if (!supplyId) return { error: t("admin.chooseSupply") };
  const store = db();
  const existing = await store.select("office_supplies", { eq: { office_id: officeId } });
  if (existing.some((s) => s.supply_id === supplyId)) return { error: t("admin.supplyInOffice") };
  await store.insert("office_supplies", [
    {
      id: newId(),
      office_id: officeId,
      supply_id: supplyId,
      quantity: null,
      status: null,
      low_threshold: null,
      critical_threshold: null,
      sort_order: existing.length,
      note: null,
      updated_at: null,
      updated_by: null,
    },
  ]);
  refresh();
  return { ok: t("admin.supplyAdded") };
}

const SUPPLY_STATUSES = ["ok", "low", "out"] as const satisfies readonly SupplyStatus[];

/** Records stock on the office card and keeps the home "needed" list in step. */
export async function setOfficeSupplyStatus(form: FormData) {
  const user = await requireUser();
  const officeId = str(form, "office_id");
  const supplyId = str(form, "supply_id");
  const raw = str(form, "status");
  if (!SUPPLY_STATUSES.includes(raw as SupplyStatus)) return;
  const status = raw as SupplyStatus;
  if (!(await canAccessOffice(user, officeId))) return;
  const store = db();
  const now = nowISO();
  const note = optStr(form, "note")?.slice(0, 500) ?? null;
  await store.update(
    "office_supplies",
    { eq: { office_id: officeId, supply_id: supplyId } },
    { status, note, updated_at: now, updated_by: user.id },
  );
  const [open] = await store.select("supply_requests", { eq: { office_id: officeId, supply_id: supplyId, status: "open" } });
  if (status === "low" || status === "out") {
    const [row] = await store.select("office_supplies", { eq: { office_id: officeId, supply_id: supplyId } });
    const quantity = row?.quantity ?? null;
    if (!open) {
      await store.insert("supply_requests", [
        {
          id: newId(),
          office_id: officeId,
          supply_id: supplyId,
          quantity,
          reason: status,
          status: "open",
          note,
          created_from_visit_id: null,
          created_by: user.id,
          created_at: now,
          completed_at: null,
          completed_by: null,
        },
      ]);
    } else {
      await store.update("supply_requests", { eq: { id: open.id } }, { reason: status, quantity, note });
    }
  } else if (open) {
    await store.update(
      "supply_requests",
      { eq: { id: open.id } },
      { status: "cancelled", completed_at: now, completed_by: user.id },
    );
  }
  if (status === "ok") await clearSupplyPhotos(officeId, supplyId);
  refresh();
}

/** Saves the inspection note without changing the stock status. Copies it onto the open request. */
export async function setOfficeSupplyNote(officeSupplyId: string, note: string) {
  const user = await requireUser();
  const store = db();
  const [row] = await store.select("office_supplies", { eq: { id: officeSupplyId } });
  if (!row || !(await canAccessOffice(user, row.office_id))) return;
  const text = note.trim().slice(0, 500) || null;
  await store.update("office_supplies", { eq: { id: row.id } }, { note: text });
  const [open] = await store.select("supply_requests", {
    eq: { office_id: row.office_id, supply_id: row.supply_id, status: "open" },
  });
  if (open) await store.update("supply_requests", { eq: { id: open.id } }, { note: text });
  refresh();
}

const SUPPLY_PHOTO_LIMIT = 4;

export async function uploadOfficePhoto(form: FormData): Promise<{ error?: string }> {
  const user = await requireUser();
  const officeSupplyId = str(form, "office_supply_id");
  const { t } = await getI18n();
  const store = db();
  const [row] = await store.select("office_supplies", { eq: { id: officeSupplyId } });
  if (!row || !(await canAccessOffice(user, row.office_id))) return { error: t("photos.failed") };
  const file = form.get("photo");
  if (!(file instanceof File) || file.size === 0) return { error: t("photos.choose") };
  if (!PHOTO_TYPES.includes(file.type)) return { error: t("photos.types") };
  if (file.size > MAX_PHOTO_BYTES) return { error: t("photos.tooBig") };
  if ((await store.select("photos", { eq: { office_supply_id: officeSupplyId } })).length >= SUPPLY_PHOTO_LIMIT) {
    return { error: t("photos.tooManySupply") };
  }
  const id = newId();
  const key = await savePhoto(officeSupplyId, id, Buffer.from(await file.arrayBuffer()), file.type);
  await store.insert("photos", [
    { id, visit_id: null, office_supply_id: officeSupplyId, url: key, created_at: nowISO(), created_by: user.id },
  ]);
  refresh();
  return {};
}

export async function removeOfficePhoto(photoId: string) {
  const user = await requireUser();
  const store = db();
  const [photo] = await store.select("photos", { eq: { id: photoId } });
  if (!photo?.office_supply_id) return;
  const [row] = await store.select("office_supplies", { eq: { id: photo.office_supply_id } });
  if (!row || !(await canAccessOffice(user, row.office_id))) return;
  await store.remove("photos", { eq: { id: photoId } });
  await deletePhoto(photo.url);
  refresh();
}

export async function removeOfficeSupply(form: FormData) {
  await requireAdmin();
  const officeId = str(form, "office_id");
  const supplyId = str(form, "supply_id");
  const store = db();
  await clearSupplyPhotos(officeId, supplyId);
  await store.remove("office_supplies", { eq: { office_id: officeId, supply_id: supplyId } });
  await store.update(
    "supply_requests",
    { eq: { office_id: officeId, supply_id: supplyId, status: "open" } },
    { status: "cancelled", completed_at: nowISO() },
  );
  refresh();
}

// ---------------------------------------------------------------- supplies catalog

export async function createSupply(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const { t } = await getI18n();
  const name = str(form, "name");
  if (!name) return { error: t("admin.enterName") };
  const store = db();
  const all = await store.select("supplies");
  if (all.some((s) => s.name.toLowerCase() === name.toLowerCase())) return { error: t("admin.supplyExists") };
  await store.insert("supplies", [
    {
      id: newId(),
      name,
      unit: oneOf(str(form, "unit"), UNITS, "pcs"),
      category: oneOf(str(form, "category"), SUPPLY_CATEGORIES, "kitchen"),
      active: true,
      sort_order: all.length,
    },
  ]);
  refresh();
  return { ok: t("admin.supplyCreated", { name }) };
}

/** Adds a material to one office. Reuses a catalog name when it already exists. */
export async function addOfficeMaterial(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const { t } = await getI18n();
  const officeId = str(form, "office_id");
  const name = str(form, "name");
  if (!name) return { error: t("admin.enterName") };
  const store = db();
  const existing = await store.select("office_supplies", { eq: { office_id: officeId } });
  const all = await store.select("supplies");
  let supply = all.find((s) => s.name.toLowerCase() === name.toLowerCase());
  if (supply && existing.some((row) => row.supply_id === supply!.id)) return { error: t("admin.supplyInOffice") };
  if (!supply) {
    const id = newId();
    supply = {
      id,
      name,
      unit: oneOf(str(form, "unit"), UNITS, "pcs"),
      category: oneOf(str(form, "category"), SUPPLY_CATEGORIES, "kitchen"),
      active: true,
      sort_order: all.length,
    };
    await store.insert("supplies", [supply]);
  }
  await store.insert("office_supplies", [
    {
      id: newId(),
      office_id: officeId,
      supply_id: supply.id,
      quantity: null,
      status: null,
      low_threshold: null,
      critical_threshold: null,
      sort_order: existing.length,
      note: null,
      updated_at: null,
      updated_by: null,
    },
  ]);
  refresh();
  return { ok: t("admin.supplyCreated", { name: supply.name }) };
}

export async function updateSupply(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const { t } = await getI18n();
  const id = str(form, "id");
  const name = str(form, "name");
  if (!name) return { error: t("admin.enterName") };
  await db().update(
    "supplies",
    { eq: { id } },
    {
      name,
      unit: oneOf(str(form, "unit"), UNITS, "pcs"),
      category: oneOf(str(form, "category"), SUPPLY_CATEGORIES, "kitchen"),
      active: bool(form, "active"),
    },
  );
  refresh();
  return { ok: t("admin.saved") };
}

// ---------------------------------------------------------------- employees

export async function createEmployee(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const { t } = await getI18n();
  const name = str(form, "name");
  const email = str(form, "email");
  if (!name || !email) return { error: t("admin.nameEmail") };
  try {
    await createAccount({
      name,
      email,
      password: String(form.get("password") ?? ""),
      role: oneOf<Role>(str(form, "role"), ["admin", "employee"], "employee"),
      locale: oneOf<Locale>(str(form, "locale"), LOCALES, DEFAULT_LOCALE),
    });
  } catch (e) {
    if (e instanceof AccountError) return { error: accountErrorText(e, t) };
    throw e;
  }
  redirect("/admin/employees");
}

export async function updateEmployee(_prev: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const { t } = await getI18n();
  const id = str(form, "id");
  const name = str(form, "name");
  if (!name) return { error: t("admin.personName") };
  const role = oneOf<Role>(str(form, "role"), ["admin", "employee"], "employee");
  const active = bool(form, "active");
  const locale = oneOf<Locale>(str(form, "locale"), LOCALES, DEFAULT_LOCALE);
  if (id === admin.id && (role !== "admin" || !active)) {
    return { error: t("admin.selfLock") };
  }
  await db().update("profiles", { eq: { id } }, { name, role, active, locale });
  const password = String(form.get("password") ?? "");
  if (password) {
    try {
      await setPassword(id, password);
    } catch (e) {
      if (e instanceof AccountError) return { error: accountErrorText(e, t) };
      throw e;
    }
  }
  refresh();
  return { ok: t(password ? "admin.savedPassword" : "admin.saved") };
}
