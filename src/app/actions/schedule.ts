"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/current";
import { isValidISODate, todayISO } from "@/lib/dates";
import { db, newId, nowISO } from "@/lib/db";
import { clearFutureVisits, syncSchedule } from "@/lib/domain/schedule";
import { bool, oneOf, optStr, str } from "@/lib/form";
import { getI18n } from "@/lib/i18n/server";
import type { Recurrence, Schedule, VisitStatus } from "@/lib/types";
import type { FormState } from "./auth";

const TIME_RE = /^\d{2}:\d{2}$/;

export async function saveSchedule(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const { t } = await getI18n();
  const store = db();
  const id = str(form, "id");
  const officeId = str(form, "office_id");
  const weekday = Number(str(form, "weekday"));
  const time = optStr(form, "time");
  const recurrence = oneOf<Recurrence>(str(form, "recurrence"), ["weekly", "alternate", "pair"], "weekly");
  const employee1 = str(form, "employee_1_id");
  const employee2 = optStr(form, "employee_2_id");
  const startsOn = str(form, "starts_on") || todayISO();

  if (!(await store.select("offices", { eq: { id: officeId } })).length) return { error: t("schedule.errOffice") };
  if (!(weekday >= 1 && weekday <= 7)) return { error: t("schedule.errWeekday") };
  if (time && !TIME_RE.test(time)) return { error: t("schedule.errTime") };
  if (!employee1) return { error: t("schedule.errEmployee") };
  if (employee2 && employee2 === employee1) return { error: t("schedule.errDifferent") };
  if (recurrence !== "weekly" && !employee2) {
    return { error: t(recurrence === "pair" ? "schedule.errPairSecond" : "schedule.errAlternateSecond") };
  }
  if (!isValidISODate(startsOn)) return { error: t("schedule.errStart") };

  const fields = {
    office_id: officeId,
    weekday,
    time,
    recurrence,
    employee_1_id: employee1,
    employee_2_id: employee2,
    starts_on: startsOn,
    active: id ? bool(form, "active") : true,
  };

  let schedule: Schedule;
  if (id) {
    const [existing] = await store.select("schedules", { eq: { id } });
    if (!existing) return { error: t("schedule.errNotFound") };
    await store.update("schedules", { eq: { id } }, fields);
    schedule = { ...existing, ...fields };
  } else {
    schedule = { id: newId(), ...fields, created_at: nowISO() };
    await store.insert("schedules", [schedule]);
  }

  const plan = await syncSchedule(schedule);
  if (!id) redirect(`/admin/schedule/${schedule.id}?created=${plan.insert.length}`);
  refresh();
  const parts = [
    plan.insert.length && t("schedule.createdN", { count: plan.insert.length }),
    plan.update.length && t("schedule.updatedN", { count: plan.update.length }),
    plan.remove.length && t("schedule.removedN", { count: plan.remove.length }),
  ].filter((p): p is string => !!p);
  return { ok: `${t("schedule.saved")} ${parts.length ? t("schedule.changes", { list: parts.join(", ") }) : t("schedule.noChanges")}` };
}

export async function deleteSchedule(form: FormData) {
  await requireAdmin();
  const id = str(form, "id");
  const store = db();
  const [schedule] = await store.select("schedules", { eq: { id } });
  if (!schedule) redirect("/admin/schedule");
  await clearFutureVisits(id);
  await store.update("visits", { eq: { schedule_id: id } }, { schedule_id: null });
  await store.remove("schedules", { eq: { id } });
  redirect(`/admin/schedule?office=${schedule.office_id}`);
}

/** Admin edit of one visit. Marks it as an exception so the schedule never overwrites it. */
export async function updateVisit(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const { t } = await getI18n();
  const id = str(form, "id");
  const store = db();
  const [visit] = await store.select("visits", { eq: { id } });
  if (!visit) return { error: t("visitForm.errNotFound") };
  if (visit.status === "done" || visit.status === "in_progress") return { error: t("visitForm.errLocked") };

  const date = str(form, "scheduled_date");
  const time = optStr(form, "time");
  const employee1 = optStr(form, "employee_1_id");
  const employee2 = optStr(form, "employee_2_id");
  const status = oneOf<VisitStatus>(str(form, "status"), ["planned", "skipped"], "planned");
  if (!isValidISODate(date)) return { error: t("visitForm.errDate") };
  if (time && !TIME_RE.test(time)) return { error: t("schedule.errTime") };
  if (!employee1) return { error: t("schedule.errEmployee") };
  if (employee2 && employee2 === employee1) return { error: t("schedule.errDifferent") };

  await store.update(
    "visits",
    { eq: { id } },
    { scheduled_date: date, time, employee_1_id: employee1, employee_2_id: employee2, status, is_override: true, notes: optStr(form, "notes") },
  );
  refresh();
  return { ok: t("visitForm.saved") };
}

/** Puts an edited visit back under the control of its schedule. */
export async function resetVisitOverride(form: FormData) {
  await requireAdmin();
  const id = str(form, "id");
  const store = db();
  const [visit] = await store.select("visits", { eq: { id } });
  if (!visit?.schedule_id || !visit.origin_date || visit.status === "done" || visit.status === "in_progress") return;
  const [schedule] = await store.select("schedules", { eq: { id: visit.schedule_id } });
  await store.update(
    "visits",
    { eq: { id } },
    { is_override: false, scheduled_date: visit.origin_date, status: "planned" },
  );
  if (schedule) await syncSchedule(schedule);
  refresh();
}

export async function createVisit(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const { t } = await getI18n();
  const officeId = str(form, "office_id");
  const date = str(form, "scheduled_date");
  const time = optStr(form, "time");
  const employee1 = optStr(form, "employee_1_id");
  const employee2 = optStr(form, "employee_2_id");
  const store = db();
  if (!(await store.select("offices", { eq: { id: officeId } })).length) return { error: t("schedule.errOffice") };
  if (!isValidISODate(date)) return { error: t("visitForm.errDate") };
  if (time && !TIME_RE.test(time)) return { error: t("schedule.errTime") };
  if (!employee1) return { error: t("schedule.errEmployee") };
  if (employee2 && employee2 === employee1) return { error: t("schedule.errDifferent") };
  const id = newId();
  await store.insert("visits", [
    {
      id,
      office_id: officeId,
      schedule_id: null,
      origin_date: null,
      scheduled_date: date,
      time,
      employee_1_id: employee1,
      employee_2_id: employee2,
      status: "planned",
      is_override: true,
      started_at: null,
      completed_at: null,
      completed_by: null,
      notes: optStr(form, "notes"),
      created_at: nowISO(),
    },
  ]);
  redirect(`/visits/${id}`);
}

export async function deleteVisit(form: FormData) {
  await requireAdmin();
  const id = str(form, "id");
  const store = db();
  const [visit] = await store.select("visits", { eq: { id } });
  if (!visit || visit.schedule_id || visit.status !== "planned") return;
  await store.remove("visits", { eq: { id } });
  redirect(`/calendar?view=day&date=${visit.scheduled_date}`);
}
