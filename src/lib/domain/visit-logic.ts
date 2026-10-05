import { endOfMonth, startOfMonth } from "@/lib/dates";
import { db, newId, nowISO } from "@/lib/db";
import type { OfficeSupply, Task, Visit, VisitSupply, VisitTask } from "@/lib/types";

/** Weekly and as-needed tasks always apply; a monthly task applies until it is done once in the month. */
export function applicableTasks(tasks: Task[], monthlyDoneTaskIds: Set<string>): Task[] {
  return tasks.filter((t) => t.active && (t.frequency !== "monthly" || !monthlyDoneTaskIds.has(t.id)));
}

export function isTaskComplete(status: VisitTask["status"]): boolean {
  return status === "done" || status === "not_needed";
}

export interface CompletionIssue {
  kind: "task" | "supply";
  label: string;
}

export function completionIssues(
  tasks: Pick<Task, "id" | "name" | "required">[],
  visitTasks: Pick<VisitTask, "task_id" | "status">[],
  visitSupplies: Pick<VisitSupply, "supply_id" | "status">[],
  supplyNames: Map<string, string>,
): CompletionIssue[] {
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const issues: CompletionIssue[] = [];
  for (const vt of visitTasks) {
    const task = taskById.get(vt.task_id);
    if (task?.required && !isTaskComplete(vt.status)) issues.push({ kind: "task", label: task.name });
  }
  for (const vs of visitSupplies) {
    if (!vs.status) issues.push({ kind: "supply", label: supplyNames.get(vs.supply_id) ?? "Материал" });
  }
  return issues;
}

/** Moves a planned visit to "in progress" and snapshots its checklist and supplies. Idempotent. */
export async function startVisit(visit: Visit) {
  const store = db();
  if (visit.status === "planned") {
    await store.update("visits", { eq: { id: visit.id } }, { status: "in_progress", started_at: nowISO() });
  }

  const existingTasks = await store.select("visit_tasks", { eq: { visit_id: visit.id } });
  if (!existingTasks.length) {
    const tasks = await store.select("tasks", { eq: { office_id: visit.office_id, active: true } });
    const monthlyIds = tasks.filter((t) => t.frequency === "monthly").map((t) => t.id);
    const doneMonthly = new Set<string>();
    if (monthlyIds.length) {
      const monthVisits = await store.select("visits", {
        eq: { office_id: visit.office_id },
        gte: { scheduled_date: startOfMonth(visit.scheduled_date) },
        lte: { scheduled_date: endOfMonth(visit.scheduled_date) },
      });
      const otherIds = monthVisits.filter((v) => v.id !== visit.id).map((v) => v.id);
      if (otherIds.length) {
        const done = await store.select("visit_tasks", { in: { visit_id: otherIds, task_id: monthlyIds }, eq: { status: "done" } });
        for (const d of done) doneMonthly.add(d.task_id);
      }
    }
    await store.insert(
      "visit_tasks",
      applicableTasks(tasks, doneMonthly).map((t) => ({
        id: newId(),
        visit_id: visit.id,
        task_id: t.id,
        status: "pending",
        notes: null,
        completed_at: null,
        completed_by: null,
      })),
    );
  }

  const existingSupplies = await store.select("visit_supplies", { eq: { visit_id: visit.id } });
  if (!existingSupplies.length) {
    const officeSupplies: OfficeSupply[] = await store.select("office_supplies", { eq: { office_id: visit.office_id } });
    await store.insert(
      "visit_supplies",
      officeSupplies.map((os) => ({
        id: newId(),
        visit_id: visit.id,
        supply_id: os.supply_id,
        quantity: os.quantity,
        status: os.status,
        notes: null,
        updated_at: null,
      })),
    );
  }
}
