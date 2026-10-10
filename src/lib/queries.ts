import { cache } from "react";
import { addDays, todayISO } from "@/lib/dates";
import { db } from "@/lib/db";
import { translator } from "@/lib/i18n/content";
import type { T } from "@/lib/i18n/core";
import { getLocale } from "@/lib/i18n/server";
import type { City, Office, Profile, Schedule, Supply, SupplyRequest, Task, Visit } from "@/lib/types";

export interface Refs {
  profiles: Map<string, Profile>;
  cities: Map<string, City>;
  offices: Map<string, Office>;
  supplies: Map<string, Supply>;
}

/** Small reference tables, loaded once per request. Supply names are in the reader's language. */
export const loadRefs = cache(async (): Promise<Refs> => {
  const store = db();
  const [profiles, cities, offices, supplies, locale] = await Promise.all([
    store.select("profiles", {}, [{ column: "name" }]),
    store.select("cities", {}, [{ column: "sort_order" }, { column: "name" }]),
    store.select("offices", {}, [{ column: "name" }]),
    store.select("supplies", {}, [{ column: "sort_order" }, { column: "name" }]),
    getLocale(),
  ]);
  const tr = await translator(
    supplies.map((s) => s.name),
    locale,
  );
  return {
    profiles: new Map(profiles.map((p) => [p.id, p])),
    cities: new Map(cities.map((c) => [c.id, c])),
    offices: new Map(offices.map((o) => [o.id, o])),
    supplies: new Map(supplies.map((s) => [s.id, { ...s, name: tr(s.name) }])),
  };
});

/** Task names and done labels in the reader's language. */
export async function localizeTasks<T extends Pick<Task, "name" | "done_label">>(tasks: T[]): Promise<T[]> {
  const tr = await translator(
    tasks.flatMap((t) => [t.name, t.done_label]),
    await getLocale(),
  );
  return tasks.map((t) => ({ ...t, name: tr(t.name), done_label: t.done_label ? tr(t.done_label) : t.done_label }));
}

export function officeLabel(refs: Refs, officeId: string): string {
  const office = refs.offices.get(officeId);
  if (!office) return "—";
  const city = refs.cities.get(office.city_id);
  return city ? `${city.name} — ${office.name}` : office.name;
}

export function shortAddress(address: string): string {
  return address.split(",")[0];
}

export function visitPeople(refs: Refs, v: Pick<Visit, "employee_1_id" | "employee_2_id">, t: T): string {
  return [v.employee_1_id, v.employee_2_id]
    .filter(Boolean)
    .map((id) => refs.profiles.get(id!)?.name ?? "—")
    .join(" + ") || t("visitCard.unassigned");
}

export function isMyVisit(user: Profile, v: Pick<Visit, "employee_1_id" | "employee_2_id">): boolean {
  return v.employee_1_id === user.id || v.employee_2_id === user.id;
}

export function canWorkOnVisit(user: Profile, v: Pick<Visit, "employee_1_id" | "employee_2_id">): boolean {
  return user.role === "admin" || isMyVisit(user, v);
}

/** Offices the user is scheduled for or has visits in. Admins get every office. */
export const myOfficeIds = cache(async (user: Profile): Promise<Set<string>> => {
  const store = db();
  if (user.role === "admin") return new Set((await store.select("offices")).map((o) => o.id));
  const [s1, s2, v1, v2] = await Promise.all([
    store.select("schedules", { eq: { employee_1_id: user.id, active: true } }),
    store.select("schedules", { eq: { employee_2_id: user.id, active: true } }),
    store.select("visits", { eq: { employee_1_id: user.id } }),
    store.select("visits", { eq: { employee_2_id: user.id } }),
  ]);
  return new Set([...s1, ...s2, ...v1, ...v2].map((r) => r.office_id));
});

export async function canAccessOffice(user: Profile, officeId: string): Promise<boolean> {
  return (await myOfficeIds(user)).has(officeId);
}

/** Visits in a date range: everything for admins (or `mine`), own visits for employees. */
export async function visitsInRange(user: Profile, from: string, to: string, opts: { mine?: boolean } = {}): Promise<Visit[]> {
  const store = db();
  const range = { gte: { scheduled_date: from }, lte: { scheduled_date: to } };
  const order = [{ column: "scheduled_date" as const }, { column: "time" as const }];
  if (user.role === "admin" && !opts.mine) return store.select("visits", range, order);
  const [a, b] = await Promise.all([
    store.select("visits", { ...range, eq: { employee_1_id: user.id } }, order),
    store.select("visits", { ...range, eq: { employee_2_id: user.id } }, order),
  ]);
  const seen = new Set<string>();
  return [...a, ...b]
    .filter((v) => !seen.has(v.id) && seen.add(v.id))
    .sort((x, y) => (x.scheduled_date + (x.time ?? "")).localeCompare(y.scheduled_date + (y.time ?? "")));
}

export interface TakeItem {
  request: SupplyRequest;
  supply: Supply;
  officeLabel: string;
  officeColor: string | null;
  cityName: string;
  createdByName: string | null;
  completedByName: string | null;
  /** Next planned visit of the current user to this office, if any. */
  nextVisit: Visit | null;
  photos: { id: string }[];
}

export async function takeItems(
  user: Profile,
  opts: { status: "open" | "done"; officeIds?: Set<string> },
): Promise<TakeItem[]> {
  const store = db();
  const refs = await loadRefs();
  const offices = opts.officeIds ?? (await myOfficeIds(user));
  const today = todayISO();
  const requests =
    opts.status === "open"
      ? await store.select("supply_requests", { eq: { status: "open" } }, [{ column: "created_at", ascending: false }])
      : await store.select(
          "supply_requests",
          { eq: { status: "delivered" }, gte: { completed_at: addDays(today, -30) } },
          [{ column: "completed_at", ascending: false }],
        );
  const upcoming = await visitsInRange(user, today, addDays(today, 28), { mine: true });
  const supplyRows = await store.select("office_supplies");
  const rowByPair = new Map(supplyRows.filter((r) => offices.has(r.office_id)).map((r) => [`${r.office_id}:${r.supply_id}`, r.id]));
  const rowIds = [...rowByPair.values()];
  const photos = rowIds.length ? await store.select("photos", { in: { office_supply_id: rowIds } }, [{ column: "created_at" }]) : [];
  const photosByRow = new Map<string, { id: string }[]>();
  for (const photo of photos) {
    if (!photo.office_supply_id) continue;
    photosByRow.set(photo.office_supply_id, [...(photosByRow.get(photo.office_supply_id) ?? []), { id: photo.id }]);
  }

  return requests
    .filter((r) => offices.has(r.office_id) && refs.supplies.has(r.supply_id))
    .map((r) => {
      const office = refs.offices.get(r.office_id);
      const rowId = rowByPair.get(`${r.office_id}:${r.supply_id}`);
      return {
        request: r,
        supply: refs.supplies.get(r.supply_id)!,
        officeLabel: officeLabel(refs, r.office_id),
        officeColor: office?.color ?? null,
        cityName: office ? refs.cities.get(office.city_id)?.name ?? "" : "",
        createdByName: r.created_by ? refs.profiles.get(r.created_by)?.name ?? null : null,
        completedByName: r.completed_by ? refs.profiles.get(r.completed_by)?.name ?? null : null,
        nextVisit: upcoming.find((v) => v.office_id === r.office_id && v.status !== "done" && v.status !== "skipped") ?? null,
        photos: opts.status === "open" && rowId ? photosByRow.get(rowId) ?? [] : [],
      };
    })
    .sort((a, b) => (a.nextVisit?.scheduled_date ?? "9999").localeCompare(b.nextVisit?.scheduled_date ?? "9999"));
}

export function scheduleSummary(s: Schedule, refs: Refs, t: T): string {
  const name = (id: string | null) => (id ? refs.profiles.get(id)?.name ?? "—" : "—");
  const a = name(s.employee_1_id);
  const b = name(s.employee_2_id);
  if (s.recurrence === "pair") return t("schedule.summaryPair", { a, b });
  if (s.recurrence === "alternate") return t("schedule.summaryAlternate", { a, b });
  return s.employee_2_id ? t("schedule.summaryBackup", { a, b }) : a;
}

export function assignedFromSchedules(schedules: Schedule[], refs: Refs, t: T) {
  const people: { id: string; name: string; note: string }[] = [];
  for (const s of schedules.filter((x) => x.active)) {
    const push = (id: string | null, note: string) => {
      if (!id || people.some((p) => p.id === id)) return;
      people.push({ id, name: refs.profiles.get(id)?.name ?? "—", note });
    };
    if (s.recurrence === "weekly") {
      push(s.employee_1_id, t("office.roleMain"));
      push(s.employee_2_id, t("office.roleBackup"));
    } else if (s.recurrence === "alternate") {
      push(s.employee_1_id, t("office.roleAlternate"));
      push(s.employee_2_id, t("office.roleAlternate"));
    } else {
      push(s.employee_1_id, t("office.rolePair"));
      push(s.employee_2_id, t("office.rolePair"));
    }
  }
  return people;
}
