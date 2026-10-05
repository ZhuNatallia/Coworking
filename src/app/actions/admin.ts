"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { AccountError, accountErrorText, createAccount, setPassword } from "@/lib/auth/accounts";
import { requireAdmin } from "@/lib/auth/current";
import { db, newId, nowISO } from "@/lib/db";
import { DEFAULT_TASKS } from "@/lib/domain/templates";
import { bool, oneOf, optStr, str } from "@/lib/form";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import type { Role, SupplyCategory, SupplyUnit, TaskCategory, TaskFrequency } from "@/lib/types";
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
    city_id: str(form, "city_id"),
    name: str(form, "name"),
    address: str(form, "address"),
    contact_name: optStr(form, "contact_name"),
    contact_phone: optStr(form, "contact_phone"),
    notes: optStr(form, "notes"),
  };
}

async function validateOffice(fields: ReturnType<typeof officeFields>, officeId?: string): Promise<string | null> {
  const { t } = await getI18n();
  if (!fields.name) return t("admin.officeName");
  const store = db();
  const [city] = await store.select("cities", { eq: { id: fields.city_id } });
  if (!city) return t("admin.chooseCity");
  const same = await store.select("offices", { eq: { city_id: fields.city_id } });
  if (same.some((o) => o.id !== officeId && o.name.toLowerCase() === fields.name.toLowerCase())) {
    return t("admin.officeExists", { city: city.name, name: fields.name });
  }
  return null;
}

export async function createOffice(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const fields = officeFields(form);
  const error = await validateOffice(fields);
  if (error) return { error };

  const store = db();
  const id = newId();
  await store.insert("offices", [{ id, ...fields, active: true, created_at: nowISO() }]);
  await store.insert(
    "tasks",
    DEFAULT_TASKS.map((t, i) => ({ id: newId(), office_id: id, ...t, active: true, sort_order: i })),
  );
  const supplies = await store.select("supplies", { eq: { active: true } }, [{ column: "sort_order" }]);
  await store.insert(
    "office_supplies",
    supplies.map((s, i) => ({
      id: newId(),
      office_id: id,
      supply_id: s.id,
      quantity: null,
      status: null,
      low_threshold: null,
      critical_threshold: null,
      sort_order: i,
      updated_at: null,
      updated_by: null,
    })),
  );
  redirect(`/offices/${id}`);
}

export async function updateOffice(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const id = str(form, "id");
  const fields = officeFields(form);
  const error = await validateOffice(fields, id);
  if (error) return { error };
  await db().update("offices", { eq: { id } }, { ...fields, active: bool(form, "active") });
  redirect(`/offices/${id}`);
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
      updated_at: null,
      updated_by: null,
    },
  ]);
  refresh();
  return { ok: t("admin.supplyAdded") };
}

export async function removeOfficeSupply(form: FormData) {
  await requireAdmin();
  const officeId = str(form, "office_id");
  const supplyId = str(form, "supply_id");
  const store = db();
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
