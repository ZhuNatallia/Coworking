import { describe, expect, it } from "vitest";
import { employeesFor, planScheduleVisits, scheduleSlots } from "@/lib/domain/schedule";
import type { Schedule, Visit } from "@/lib/types";

const base: Schedule = {
  id: "s1",
  office_id: "o1",
  weekday: 1,
  time: "10:00",
  recurrence: "weekly",
  employee_1_id: "anna",
  employee_2_id: null,
  starts_on: "2026-01-01",
  active: true,
  created_at: "2026-01-01T00:00:00Z",
};

function visit(origin: string, patch: Partial<Visit> = {}): Visit {
  return {
    id: `v-${origin}`,
    office_id: "o1",
    schedule_id: "s1",
    origin_date: origin,
    scheduled_date: origin,
    time: "10:00",
    employee_1_id: "anna",
    employee_2_id: null,
    status: "planned",
    is_override: false,
    started_at: null,
    completed_at: null,
    completed_by: null,
    notes: null,
    created_at: "",
    ...patch,
  };
}

describe("scheduleSlots", () => {
  it("creates one visit per week for 12 weeks, starting today when it matches", () => {
    const slots = scheduleSlots(base, "2026-10-05");
    expect(slots[0].date).toBe("2026-10-05");
    expect(slots).toHaveLength(13);
    expect(slots.at(-1)!.date).toBe("2026-12-28");
  });

  it("skips to the next matching weekday", () => {
    expect(scheduleSlots({ ...base, weekday: 3 }, "2026-10-05")[0].date).toBe("2026-10-07");
  });

  it("produces nothing for an inactive schedule", () => {
    expect(scheduleSlots({ ...base, active: false }, "2026-10-05")).toEqual([]);
  });
});

describe("employeesFor", () => {
  it("alternates by ISO week parity", () => {
    const s = { ...base, recurrence: "alternate" as const, employee_2_id: "peter" };
    expect(employeesFor(s, "2026-10-12").employee_1_id).toBe("anna"); // week 42
    expect(employeesFor(s, "2026-10-05").employee_1_id).toBe("peter"); // week 41
  });

  it("assigns both people for a pair", () => {
    expect(employeesFor({ ...base, recurrence: "pair", employee_2_id: "peter" }, "2026-10-05")).toEqual({
      employee_1_id: "anna",
      employee_2_id: "peter",
    });
  });

  it("keeps the reserve person off weekly visits", () => {
    expect(employeesFor({ ...base, employee_2_id: "peter" }, "2026-10-05").employee_2_id).toBeNull();
  });
});

describe("planScheduleVisits", () => {
  const today = "2026-10-05";

  it("only inserts missing dates", () => {
    const plan = planScheduleVisits(base, [visit("2026-10-05"), visit("2026-10-12")], today);
    expect(plan.insert.map((s) => s.date)).not.toContain("2026-10-05");
    expect(plan.insert.map((s) => s.date)).not.toContain("2026-10-12");
    expect(plan.insert).toHaveLength(11);
    expect(plan.update).toEqual([]);
    expect(plan.remove).toEqual([]);
  });

  it("reassigns future planned visits when the employee changes", () => {
    const plan = planScheduleVisits({ ...base, employee_1_id: "peter" }, [visit("2026-10-12")], today);
    expect(plan.update).toEqual([{ id: "v-2026-10-12", slot: expect.objectContaining({ employee_1_id: "peter" }) }]);
  });

  it("removes planned visits that no longer match the weekday", () => {
    const plan = planScheduleVisits({ ...base, weekday: 2 }, [visit("2026-10-12")], today);
    expect(plan.remove).toEqual(["v-2026-10-12"]);
  });

  it("never touches started, finished, skipped, overridden or past visits", () => {
    const existing = [
      visit("2026-09-28", { status: "planned" }),
      visit("2026-10-05", { status: "in_progress" }),
      visit("2026-10-12", { status: "done" }),
      visit("2026-10-19", { status: "skipped" }),
      visit("2026-10-26", { is_override: true, employee_1_id: "max", scheduled_date: "2026-10-27" }),
    ];
    const plan = planScheduleVisits({ ...base, employee_1_id: "peter", weekday: 2 }, existing, today);
    expect(plan.update).toEqual([]);
    expect(plan.remove).toEqual([]);
  });

  it("does not recreate a visit an admin moved to another day", () => {
    const moved = visit("2026-10-12", { is_override: true, scheduled_date: "2026-10-14" });
    const plan = planScheduleVisits(base, [moved], today);
    expect(plan.insert.map((s) => s.date)).not.toContain("2026-10-12");
  });

  it("removes everything planned when the schedule is switched off", () => {
    const plan = planScheduleVisits({ ...base, active: false }, [visit("2026-10-12"), visit("2026-10-19")], today);
    expect(plan.remove).toHaveLength(2);
    expect(plan.insert).toEqual([]);
  });
});
