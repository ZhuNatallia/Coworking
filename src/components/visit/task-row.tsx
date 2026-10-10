"use client";

import { Check } from "lucide-react";
import { useState, useTransition } from "react";
import { setTaskStatus } from "@/app/actions/visits";
import { cx } from "@/components/ui-core";
import { useI18n } from "@/lib/i18n/client";
import type { TaskFrequency, VisitTaskStatus } from "@/lib/types";

export interface TaskRowProps {
  id: string;
  name: string;
  doneLabel: string | null;
  frequency: TaskFrequency;
  required: boolean;
  status: VisitTaskStatus;
}

function Checkbox({ checked, label, onChange, disabled }: { checked: boolean; label: string; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        "flex min-h-12 w-full items-center gap-3 rounded-xl border px-3.5 text-left transition",
        checked ? "border-brand-500 bg-brand-50" : "border-line bg-surface",
      )}
    >
      <span
        className={cx(
          "flex size-6 shrink-0 items-center justify-center rounded-md border-2",
          checked ? "border-brand-solid bg-brand-solid text-white" : "border-line bg-surface",
        )}
      >
        {checked && <Check className="size-4" strokeWidth={3} />}
      </span>
      <span className="text-[16px]">{label}</span>
    </button>
  );
}

export function TaskRow({ id, name, doneLabel, frequency, required, status: initial }: TaskRowProps) {
  const { t } = useI18n();
  const [status, setStatus] = useState(initial);
  const [error, setError] = useState(false);
  const [, startTransition] = useTransition();

  function save(next: VisitTaskStatus) {
    const prev = status;
    setStatus(next);
    setError(false);
    startTransition(async () => {
      try {
        await setTaskStatus(id, next);
      } catch {
        setStatus(prev);
        setError(true);
      }
    });
  }

  const label = doneLabel || name;

  return (
    <div className="flex flex-col gap-2.5 py-3">
      <div className="flex items-center gap-2">
        <p className="flex-1 font-semibold">{name}</p>
        {frequency === "monthly" && <span className="rounded-lg bg-warn-50 px-2 py-0.5 text-xs font-semibold text-warn-700">{t("task.monthly")}</span>}
        {required && <span className="text-xs text-muted">{t("task.required")}</span>}
      </div>
      {frequency === "as_needed" ? (
        <>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={name}>
            {(
              [
                ["not_needed", t("task.notNeeded")],
                ["needed", t("task.needed")],
              ] as const
            ).map(([value, text]) => {
              const active = value === "not_needed" ? status === "not_needed" : status === "needed" || status === "done";
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => save(value)}
                  className={cx(
                    "min-h-11 rounded-xl border text-[15px] font-medium transition",
                    active ? "border-brand-solid bg-brand-solid text-white" : "border-line bg-surface text-ink",
                  )}
                >
                  {text}
                </button>
              );
            })}
          </div>
          {(status === "needed" || status === "done") && (
            <Checkbox checked={status === "done"} label={label} onChange={(v) => save(v ? "done" : "needed")} />
          )}
        </>
      ) : (
        <Checkbox checked={status === "done"} label={label} onChange={(v) => save(v ? "done" : "pending")} />
      )}
      {error && <p className="text-sm text-danger-700">{t("common.saveError")}</p>}
    </div>
  );
}
