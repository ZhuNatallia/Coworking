"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/current";
import { isValidISODate, todayISO } from "@/lib/dates";
import { db, newId, nowISO } from "@/lib/db";
import { clearFutureVisits, syncSchedule } from "@/lib/domain/schedule";
import { bool, oneOf, optStr, str } from "@/lib/form";
import type { Recurrence, Schedule, VisitStatus } from "@/lib/types";
import type { FormState } from "./auth";

const TIME_RE = /^\d{2}:\d{2}$/;

function visitWord(n: number) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "визит";
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return "визита";
  return "визитов";
}

export async function saveSchedule(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const store = db();
  const id = str(form, "id");
  const officeId = str(form, "office_id");
  const weekday = Number(str(form, "weekday"));
  const time = optStr(form, "time");
  const recurrence = oneOf<Recurrence>(str(form, "recurrence"), ["weekly", "alternate", "pair"], "weekly");
  const employee1 = str(form, "employee_1_id");
  const employee2 = optStr(form, "employee_2_id");
  const startsOn = str(form, "starts_on") || todayISO();

  if (!(await store.select("offices", { eq: { id: officeId } })).length) return { error: "Выберите офис" };
  if (!(weekday >= 1 && weekday <= 7)) return { error: "Выберите день недели" };
  if (time && !TIME_RE.test(time)) return { error: "Время в формате ЧЧ:ММ" };
  if (!employee1) return { error: "Назначьте сотрудника" };
  if (employee2 && employee2 === employee1) return { error: "Выберите двух разных сотрудников" };
  if (recurrence !== "weekly" && !employee2) {
    return { error: recurrence === "pair" ? "Для двух сотрудников выберите второго" : "Для очереди выберите второго сотрудника" };
  }
  if (!isValidISODate(startsOn)) return { error: "Неверная дата начала" };

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
    if (!existing) return { error: "Расписание не найдено" };
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
    plan.insert.length && `создано ${plan.insert.length} ${visitWord(plan.insert.length)}`,
    plan.update.length && `обновлено ${plan.update.length}`,
    plan.remove.length && `удалено ${plan.remove.length}`,
  ].filter(Boolean);
  return { ok: `Сохранено. ${parts.length ? `Будущие визиты: ${parts.join(", ")}.` : "Будущие визиты не изменились."}` };
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
  const id = str(form, "id");
  const store = db();
  const [visit] = await store.select("visits", { eq: { id } });
  if (!visit) return { error: "Визит не найден" };
  if (visit.status === "done" || visit.status === "in_progress") return { error: "Начатый или завершённый визит изменить нельзя" };

  const date = str(form, "scheduled_date");
  const time = optStr(form, "time");
  const employee1 = optStr(form, "employee_1_id");
  const employee2 = optStr(form, "employee_2_id");
  const status = oneOf<VisitStatus>(str(form, "status"), ["planned", "skipped"], "planned");
  if (!isValidISODate(date)) return { error: "Укажите дату" };
  if (time && !TIME_RE.test(time)) return { error: "Время в формате ЧЧ:ММ" };
  if (!employee1) return { error: "Назначьте сотрудника" };
  if (employee2 && employee2 === employee1) return { error: "Выберите двух разных сотрудников" };

  await store.update(
    "visits",
    { eq: { id } },
    { scheduled_date: date, time, employee_1_id: employee1, employee_2_id: employee2, status, is_override: true, notes: optStr(form, "notes") },
  );
  refresh();
  return { ok: "Изменения сохранены только для этого визита. Регулярное расписание не изменилось." };
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
  const officeId = str(form, "office_id");
  const date = str(form, "scheduled_date");
  const time = optStr(form, "time");
  const employee1 = optStr(form, "employee_1_id");
  const employee2 = optStr(form, "employee_2_id");
  const store = db();
  if (!(await store.select("offices", { eq: { id: officeId } })).length) return { error: "Выберите офис" };
  if (!isValidISODate(date)) return { error: "Укажите дату" };
  if (time && !TIME_RE.test(time)) return { error: "Время в формате ЧЧ:ММ" };
  if (!employee1) return { error: "Назначьте сотрудника" };
  if (employee2 && employee2 === employee1) return { error: "Выберите двух разных сотрудников" };
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
