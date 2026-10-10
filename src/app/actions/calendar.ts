"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth/current";
import { isValidISODate } from "@/lib/dates";
import { db, nowISO } from "@/lib/db";
import type { DayMark } from "@/lib/types";

const STATUSES = ["planned", "done"] as const;

export async function setDayMark(date: string, status: DayMark["status"] | "none") {
  const user = await requireUser();
  if (!isValidISODate(date)) throw new Error("Invalid date");
  const store = db();
  if (status === "none") {
    await store.remove("day_marks", { eq: { id: date } });
  } else if ((STATUSES as readonly string[]).includes(status)) {
    const patch = { status, updated_by: user.id, updated_at: nowISO() };
    const [existing] = await store.select("day_marks", { eq: { id: date } });
    if (existing) await store.update("day_marks", { eq: { id: date } }, patch);
    else await store.insert("day_marks", [{ id: date, ...patch }]);
  } else {
    throw new Error("Invalid status");
  }
  refresh();
}
