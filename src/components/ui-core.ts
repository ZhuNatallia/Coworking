import type { VisitStatus } from "@/lib/types";

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export type DisplayVisitStatus = VisitStatus | "missed";

/** A planned visit whose date has passed shows as missed. `label` is a key under `visitStatus`. */
export function displayVisitStatus(status: VisitStatus, date: string, today: string): { label: DisplayVisitStatus; tone: VisitStatus } {
  if (status === "planned" && date < today) return { label: "missed", tone: "skipped" };
  return { label: status, tone: status };
}
