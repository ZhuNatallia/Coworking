"use client";

import { Check, Circle } from "lucide-react";
import { useTransition } from "react";
import { setDayMark } from "@/app/actions/calendar";
import { useI18n } from "@/lib/i18n/client";
import type { DayMark } from "@/lib/types";
import { cx } from "./ui-core";

/** Marks one calendar day as planned or done. Tapping the active mark clears it. */
export function DayMarkPicker({ date, status }: { date: string; status: DayMark["status"] | null }) {
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();

  function choose(next: DayMark["status"]) {
    startTransition(() => setDayMark(date, status === next ? "none" : next));
  }

  return (
    <div className="flex flex-col gap-2">
      <div role="group" aria-label={t("calendar.markHint")} aria-busy={pending} className={cx("grid grid-cols-2 gap-2", pending && "opacity-60")}>
        <button
          type="button"
          aria-pressed={status === "planned"}
          disabled={pending}
          onClick={() => choose("planned")}
          className={cx(
            "flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-[15px] font-medium",
            status === "planned" ? "border-brand-solid bg-brand-solid text-white" : "border-line bg-surface text-ink",
          )}
        >
          <Circle className="size-4" />
          {t("visitStatus.planned")}
        </button>
        <button
          type="button"
          aria-pressed={status === "done"}
          disabled={pending}
          onClick={() => choose("done")}
          className={cx(
            "flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-[15px] font-medium",
            status === "done" ? "border-brand-solid bg-brand-solid text-white" : "border-line bg-surface text-ink",
          )}
        >
          <Check className="size-4" />
          {t("visitStatus.done")}
        </button>
      </div>
      <p className="text-sm text-muted">{t("calendar.markHint")}</p>
    </div>
  );
}
