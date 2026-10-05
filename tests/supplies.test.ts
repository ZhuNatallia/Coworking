import { describe, expect, it } from "vitest";
import { decideRequest } from "@/lib/domain/supplies";
import { applicableTasks, completionIssues } from "@/lib/domain/visit-logic";
import type { Task } from "@/lib/types";

describe("decideRequest", () => {
  const open = { id: "r1", reason: "low" as const, created_from_visit_id: "week1" };

  it("creates a request when a supply runs low", () => {
    expect(decideRequest("low", undefined, "week1")).toEqual({ kind: "create", reason: "low" });
    expect(decideRequest("out", undefined, "week1")).toEqual({ kind: "create", reason: "out" });
  });

  it("does not duplicate: coffee low three weeks in a row stays one request", () => {
    expect(decideRequest("low", open, "week2")).toEqual({ kind: "none" });
    expect(decideRequest("low", open, "week3")).toEqual({ kind: "none" });
  });

  it("escalates low to out on the same request", () => {
    expect(decideRequest("out", open, "week2")).toEqual({ kind: "update", id: "r1", reason: "out" });
  });

  it("drops a request the same visit created when the choice is corrected", () => {
    expect(decideRequest("ok", open, "week1")).toEqual({ kind: "delete", id: "r1" });
  });

  it("closes an older request when the office is stocked again", () => {
    expect(decideRequest("ok", open, "week2")).toEqual({ kind: "cancel", id: "r1" });
  });

  it("does nothing when all is fine", () => {
    expect(decideRequest("ok", undefined, "week1")).toEqual({ kind: "none" });
    expect(decideRequest(null, undefined, "week1")).toEqual({ kind: "none" });
  });
});

describe("visit checklist", () => {
  const task = (id: string, patch: Partial<Task> = {}): Task => ({
    id,
    office_id: "o1",
    name: id,
    done_label: null,
    category: "cleaning",
    frequency: "weekly",
    required: true,
    active: true,
    sort_order: 0,
    ...patch,
  });

  it("includes a monthly task only until it is done that month", () => {
    const tasks = [task("trash"), task("fridge", { frequency: "monthly" }), task("old", { active: false })];
    expect(applicableTasks(tasks, new Set()).map((t) => t.id)).toEqual(["trash", "fridge"]);
    expect(applicableTasks(tasks, new Set(["fridge"])).map((t) => t.id)).toEqual(["trash"]);
  });

  it("flags required tasks that are open or needed but not done, and unset supplies", () => {
    const tasks = [task("vacuum", { frequency: "as_needed" }), task("floor", { frequency: "as_needed" }), task("trash"), task("mail", { required: false })];
    const issues = completionIssues(
      tasks,
      [
        { task_id: "vacuum", status: "not_needed" },
        { task_id: "floor", status: "needed" },
        { task_id: "trash", status: "pending" },
        { task_id: "mail", status: "pending" },
      ],
      [
        { supply_id: "coffee", status: "low" },
        { supply_id: "water", status: null },
      ],
      new Map([["water", "Вода"]]),
    );
    expect(issues).toEqual([
      { kind: "task", label: "floor" },
      { kind: "task", label: "trash" },
      { kind: "supply", label: "Вода" },
    ]);
  });
});
