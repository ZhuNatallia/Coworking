"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current";
import { db, newId, nowISO } from "@/lib/db";
import { applySupplyStatus, markDelivered, reopenRequest } from "@/lib/domain/supplies";
import { completionIssues, startVisit } from "@/lib/domain/visit-logic";
import { bool, optStr, str } from "@/lib/form";
import { getI18n, getTranslator } from "@/lib/i18n/server";
import { deletePhoto, MAX_PHOTO_BYTES, PHOTO_TYPES, savePhoto } from "@/lib/photos";
import { canAccessOffice, canWorkOnVisit } from "@/lib/queries";
import type { Profile, SupplyStatus, Visit, VisitTaskStatus } from "@/lib/types";

const TASK_STATUSES: VisitTaskStatus[] = ["pending", "not_needed", "needed", "done"];
const SUPPLY_STATUSES: SupplyStatus[] = ["ok", "low", "out"];

async function loadWorkableVisit(visitId: string): Promise<{ user: Profile; visit: Visit }> {
  const user = await requireUser();
  const [visit] = await db().select("visits", { eq: { id: visitId } });
  if (!visit || !canWorkOnVisit(user, visit)) throw new Error("No access to this visit");
  return { user, visit };
}

async function loadOpenVisit(visitId: string) {
  const ctx = await loadWorkableVisit(visitId);
  if (ctx.visit.status !== "in_progress") throw new Error("Visit is not in progress");
  return ctx;
}

export async function beginVisit(form: FormData) {
  const id = str(form, "id");
  const { visit } = await loadWorkableVisit(id);
  if (visit.status === "planned" || visit.status === "in_progress") await startVisit(visit);
  redirect(`/visits/${id}?step=1`);
}

export async function setTaskStatus(visitTaskId: string, status: VisitTaskStatus) {
  if (!TASK_STATUSES.includes(status)) throw new Error("Invalid status");
  const store = db();
  const [vt] = await store.select("visit_tasks", { eq: { id: visitTaskId } });
  if (!vt) throw new Error("Task not found");
  const { user } = await loadOpenVisit(vt.visit_id);
  const done = status === "done" || status === "not_needed";
  await store.update(
    "visit_tasks",
    { eq: { id: visitTaskId } },
    { status, completed_at: done ? nowISO() : null, completed_by: done ? user.id : null },
  );
}

/** Records quantity and status of one supply and keeps the "take with you" list in sync. */
export async function setSupplyState(visitSupplyId: string, quantity: number | null, status: SupplyStatus | null) {
  if (status !== null && !SUPPLY_STATUSES.includes(status)) throw new Error("Invalid status");
  if (quantity !== null && !(Number.isFinite(quantity) && quantity >= 0 && quantity < 100000)) throw new Error("Invalid quantity");
  const store = db();
  const [vs] = await store.select("visit_supplies", { eq: { id: visitSupplyId } });
  if (!vs) throw new Error("Supply not found");
  const { user, visit } = await loadOpenVisit(vs.visit_id);
  const now = nowISO();
  await store.update("visit_supplies", { eq: { id: visitSupplyId } }, { quantity, status, updated_at: now });
  await store.update(
    "office_supplies",
    { eq: { office_id: visit.office_id, supply_id: vs.supply_id } },
    { quantity, status, updated_at: now, updated_by: user.id },
  );
  await applySupplyStatus({ officeId: visit.office_id, supplyId: vs.supply_id, visitId: visit.id, userId: user.id, status, quantity });
  const [open] = await store.select("supply_requests", { eq: { office_id: visit.office_id, supply_id: vs.supply_id, status: "open" } });
  return { requestId: open?.id ?? null, fromThisVisit: open?.created_from_visit_id === visit.id };
}

/** "Delivered" from the take list or from inside a visit. */
export async function deliverRequest(requestId: string, visitId?: string) {
  const user = await requireUser();
  const store = db();
  const [request] = await store.select("supply_requests", { eq: { id: requestId } });
  if (!request || request.status !== "open") return;
  if (!(await canAccessOffice(user, request.office_id))) throw new Error("No access");
  let inVisit: string | undefined;
  if (visitId) {
    const [visit] = await store.select("visits", { eq: { id: visitId } });
    if (visit && visit.office_id === request.office_id && visit.status === "in_progress" && canWorkOnVisit(user, visit)) inVisit = visit.id;
  }
  await markDelivered(request, user.id, inVisit);
  refresh();
}

export async function undoDelivery(requestId: string) {
  const user = await requireUser();
  const store = db();
  const [request] = await store.select("supply_requests", { eq: { id: requestId } });
  if (!request || request.status !== "delivered") return;
  if (!(await canAccessOffice(user, request.office_id))) throw new Error("No access");
  await reopenRequest(request);
  refresh();
}

export interface FinishState {
  error?: string;
  issues?: string[];
}

export async function finishVisit(_prev: FinishState | undefined, form: FormData): Promise<FinishState> {
  const id = str(form, "id");
  const { user, visit } = await loadWorkableVisit(id);
  if (visit.status === "done") redirect(`/visits/${id}?finished=1`);
  const { t } = await getI18n();
  if (visit.status !== "in_progress") return { error: t("finish.notStarted") };
  const store = db();
  const [tasks, visitTasks, visitSupplies, supplies] = await Promise.all([
    store.select("tasks", { eq: { office_id: visit.office_id } }),
    store.select("visit_tasks", { eq: { visit_id: id } }),
    store.select("visit_supplies", { eq: { visit_id: id } }),
    store.select("supplies"),
  ]);
  const issues = completionIssues(tasks, visitTasks, visitSupplies, new Map(supplies.map((s) => [s.id, s.name])));
  if (issues.length && !bool(form, "confirm")) {
    const tr = await getTranslator(issues.map((i) => i.label));
    return {
      issues: issues.map((i) => t(i.kind === "task" ? "finish.taskMissing" : "finish.supplyMissing", { name: tr(i.label) })),
    };
  }
  const now = nowISO();
  const pending = visitTasks.filter((vt) => vt.status === "pending" || vt.status === "needed").map((vt) => vt.id);
  if (pending.length) await store.update("visit_tasks", { in: { id: pending } }, { status: "skipped" });
  await store.update("visits", { eq: { id } }, { status: "done", completed_at: now, completed_by: user.id, notes: optStr(form, "notes") });
  redirect(`/visits/${id}?finished=1`);
}

export async function saveVisitNotes(visitId: string, notes: string) {
  await loadOpenVisit(visitId);
  await db().update("visits", { eq: { id: visitId } }, { notes: notes.trim().slice(0, 2000) || null });
}

export async function uploadPhoto(form: FormData): Promise<{ error?: string }> {
  const visitId = str(form, "visit_id");
  const { user } = await loadOpenVisit(visitId);
  const { t } = await getI18n();
  const file = form.get("photo");
  if (!(file instanceof File) || file.size === 0) return { error: t("photos.choose") };
  if (!PHOTO_TYPES.includes(file.type)) return { error: t("photos.types") };
  if (file.size > MAX_PHOTO_BYTES) return { error: t("photos.tooBig") };
  const store = db();
  if ((await store.select("photos", { eq: { visit_id: visitId } })).length >= 10) return { error: t("photos.tooMany") };
  const id = newId();
  const key = await savePhoto(visitId, id, Buffer.from(await file.arrayBuffer()), file.type);
  await store.insert("photos", [{ id, visit_id: visitId, office_supply_id: null, url: key, created_at: nowISO(), created_by: user.id }]);
  refresh();
  return {};
}

export async function removePhoto(photoId: string) {
  const store = db();
  const [photo] = await store.select("photos", { eq: { id: photoId } });
  if (!photo?.visit_id) return;
  await loadOpenVisit(photo.visit_id);
  await store.remove("photos", { eq: { id: photoId } });
  await deletePhoto(photo.url);
  refresh();
}
