import { addDays, isoWeek, isoWeekday, todayISO } from "@/lib/dates";
import { db, newId, nowISO } from "@/lib/db";
import type { Schedule, Visit } from "@/lib/types";

export const HORIZON_DAYS = 84;

export interface PlannedSlot {
  date: string;
  time: string | null;
  employee_1_id: string;
  employee_2_id: string | null;
}

export interface SchedulePlan {
  insert: PlannedSlot[];
  update: { id: string; slot: PlannedSlot }[];
  remove: string[];
}

export function employeesFor(schedule: Pick<Schedule, "recurrence" | "employee_1_id" | "employee_2_id">, date: string) {
  if (schedule.recurrence === "pair") {
    return { employee_1_id: schedule.employee_1_id, employee_2_id: schedule.employee_2_id };
  }
  if (schedule.recurrence === "alternate" && schedule.employee_2_id) {
    const first = isoWeek(date) % 2 === 0;
    return { employee_1_id: first ? schedule.employee_1_id : schedule.employee_2_id, employee_2_id: null };
  }
  return { employee_1_id: schedule.employee_1_id, employee_2_id: null };
}

export function scheduleSlots(schedule: Schedule, today: string, horizonDays = HORIZON_DAYS): PlannedSlot[] {
  if (!schedule.active) return [];
  const from = schedule.starts_on > today ? schedule.starts_on : today;
  const end = addDays(today, horizonDays);
  const first = addDays(from, (schedule.weekday - isoWeekday(from) + 7) % 7);
  const slots: PlannedSlot[] = [];
  for (let d = first; d <= end; d = addDays(d, 7)) {
    const e = employeesFor(schedule, d);
    slots.push({ date: d, time: schedule.time, employee_1_id: e.employee_1_id, employee_2_id: e.employee_2_id });
  }
  return slots;
}

/**
 * Decide how to bring a schedule's future visits in line with the schedule.
 * Only planned, non-overridden visits from today on are touched; started, finished,
 * skipped and manually edited visits are left exactly as they are.
 */
export function planScheduleVisits(
  schedule: Schedule,
  existing: Pick<Visit, "id" | "origin_date" | "status" | "is_override" | "time" | "employee_1_id" | "employee_2_id">[],
  today: string,
  horizonDays = HORIZON_DAYS,
): SchedulePlan {
  const slots = scheduleSlots(schedule, today, horizonDays);
  const slotByDate = new Map(slots.map((s) => [s.date, s]));
  const existingDates = new Set<string>();
  const plan: SchedulePlan = { insert: [], update: [], remove: [] };

  for (const v of existing) {
    if (!v.origin_date || v.origin_date < today) continue;
    existingDates.add(v.origin_date);
    if (v.status !== "planned" || v.is_override) continue;
    const slot = slotByDate.get(v.origin_date);
    if (!slot) {
      plan.remove.push(v.id);
    } else if (
      v.time !== slot.time ||
      v.employee_1_id !== slot.employee_1_id ||
      (v.employee_2_id ?? null) !== slot.employee_2_id
    ) {
      plan.update.push({ id: v.id, slot });
    }
  }
  for (const slot of slots) if (!existingDates.has(slot.date)) plan.insert.push(slot);
  return plan;
}

export async function syncSchedule(schedule: Schedule, today = todayISO()): Promise<SchedulePlan> {
  const store = db();
  const existing = await store.select("visits", { eq: { schedule_id: schedule.id }, gte: { origin_date: today } });
  const plan = planScheduleVisits(schedule, existing, today);

  if (plan.remove.length) await store.remove("visits", { in: { id: plan.remove } });
  for (const { id, slot } of plan.update) {
    await store.update(
      "visits",
      { eq: { id } },
      { scheduled_date: slot.date, time: slot.time, employee_1_id: slot.employee_1_id, employee_2_id: slot.employee_2_id },
    );
  }
  await store.insert(
    "visits",
    plan.insert.map((slot) => ({
      id: newId(),
      office_id: schedule.office_id,
      schedule_id: schedule.id,
      origin_date: slot.date,
      scheduled_date: slot.date,
      time: slot.time,
      employee_1_id: slot.employee_1_id,
      employee_2_id: slot.employee_2_id,
      status: "planned",
      is_override: false,
      started_at: null,
      completed_at: null,
      completed_by: null,
      notes: null,
      created_at: nowISO(),
    })),
  );
  return plan;
}

/** Removes future untouched visits of a schedule that is being deleted or switched off. */
export async function clearFutureVisits(scheduleId: string, today = todayISO()) {
  await db().remove("visits", {
    eq: { schedule_id: scheduleId, status: "planned", is_override: false },
    gte: { origin_date: today },
  });
}

const GENERATED_KEY = "visits_generated_on";

/** Extends every active schedule up to the horizon once per day. */
export async function ensureVisitsGenerated(today = todayISO()) {
  const store = db();
  const [setting] = await store.select("app_settings", { eq: { id: GENERATED_KEY } });
  if (setting?.value === today) return;
  try {
    const schedules = await store.select("schedules", { eq: { active: true } });
    for (const s of schedules) await syncSchedule(s, today);
    if (setting) await store.update("app_settings", { eq: { id: GENERATED_KEY } }, { value: today });
    else await store.insert("app_settings", [{ id: GENERATED_KEY, value: today }]);
  } catch (err) {
    // A parallel request may have generated the same visits first; the unique index keeps data consistent.
    console.error("ensureVisitsGenerated", err);
  }
}
