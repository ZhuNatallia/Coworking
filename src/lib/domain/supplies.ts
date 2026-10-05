import { db, newId, nowISO } from "@/lib/db";
import type { SupplyRequest, SupplyStatus } from "@/lib/types";

export type RequestAction =
  | { kind: "none" }
  | { kind: "create"; reason: "low" | "out" }
  | { kind: "update"; id: string; reason: "low" | "out" }
  | { kind: "delete"; id: string }
  | { kind: "cancel"; id: string };

/**
 * What happens to the "take with you" list when a supply status is recorded during a visit.
 * There is never more than one open request per office and supply.
 */
export function decideRequest(
  status: SupplyStatus | null,
  open: Pick<SupplyRequest, "id" | "reason" | "created_from_visit_id"> | undefined,
  visitId: string,
): RequestAction {
  if (status === "low" || status === "out") {
    if (!open) return { kind: "create", reason: status };
    return open.reason === status ? { kind: "none" } : { kind: "update", id: open.id, reason: status };
  }
  if (!open) return { kind: "none" };
  // Marked fine again: drop a request this visit just created, otherwise it is no longer needed.
  return open.created_from_visit_id === visitId ? { kind: "delete", id: open.id } : { kind: "cancel", id: open.id };
}

export async function applySupplyStatus(opts: {
  officeId: string;
  supplyId: string;
  visitId: string;
  userId: string;
  status: SupplyStatus | null;
  quantity: number | null;
}) {
  const store = db();
  const [open] = await store.select("supply_requests", {
    eq: { office_id: opts.officeId, supply_id: opts.supplyId, status: "open" },
  });
  const action = decideRequest(opts.status, open, opts.visitId);
  const now = nowISO();

  switch (action.kind) {
    case "create":
      await store.insert("supply_requests", [
        {
          id: newId(),
          office_id: opts.officeId,
          supply_id: opts.supplyId,
          quantity: opts.quantity,
          reason: action.reason,
          status: "open",
          created_from_visit_id: opts.visitId,
          created_by: opts.userId,
          created_at: now,
          completed_at: null,
          completed_by: null,
        },
      ]);
      break;
    case "update":
      await store.update("supply_requests", { eq: { id: action.id } }, { reason: action.reason, quantity: opts.quantity });
      break;
    case "delete":
      await store.remove("supply_requests", { eq: { id: action.id } });
      break;
    case "cancel":
      await store.update(
        "supply_requests",
        { eq: { id: action.id } },
        { status: "cancelled", completed_at: now, completed_by: opts.userId },
      );
      break;
    case "none":
      if (open && opts.quantity !== open.quantity) {
        await store.update("supply_requests", { eq: { id: open.id } }, { quantity: opts.quantity });
      }
      break;
  }
  return action;
}

/** "Привезено": closes the request and marks the office as stocked again. */
export async function markDelivered(request: SupplyRequest, userId: string, visitId?: string) {
  const store = db();
  const now = nowISO();
  await store.update("supply_requests", { eq: { id: request.id } }, { status: "delivered", completed_at: now, completed_by: userId });
  await store.update(
    "office_supplies",
    { eq: { office_id: request.office_id, supply_id: request.supply_id } },
    { status: "ok", updated_at: now, updated_by: userId },
  );
  if (visitId) {
    await store.update("visit_supplies", { eq: { visit_id: visitId, supply_id: request.supply_id } }, { status: "ok", updated_at: now });
  }
}

/** Puts a delivered item back on the list (for accidental taps). */
export async function reopenRequest(request: SupplyRequest) {
  const store = db();
  const [open] = await store.select("supply_requests", {
    eq: { office_id: request.office_id, supply_id: request.supply_id, status: "open" },
  });
  if (open) return;
  await store.update("supply_requests", { eq: { id: request.id } }, { status: "open", completed_at: null, completed_by: null });
}
