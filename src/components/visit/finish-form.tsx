"use client";

import { AlertTriangle } from "lucide-react";
import { startTransition, useActionState, useState } from "react";
import { finishVisit, saveVisitNotes } from "@/app/actions/visits";
import { buttonStyles, Field, FormMessage, inputClass } from "@/components/ui";
import { useI18n } from "@/lib/i18n/client";

export function FinishForm({ visitId, notes }: { visitId: string; notes: string | null }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(finishVisit, undefined);
  const [confirmed, setConfirmed] = useState(false);
  const issues = state?.issues ?? [];

  return (
    <form
      action={action}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="flex flex-col gap-3"
    >
      <input type="hidden" name="id" value={visitId} />
      <Field label={t("finish.comment")} hint={t("finish.commentHint")}>
        <textarea
          name="notes"
          defaultValue={notes ?? ""}
          rows={4}
          maxLength={2000}
          onBlur={(e) => void saveVisitNotes(visitId, e.target.value).catch(() => undefined)}
          className={`${inputClass} py-3`}
          placeholder={t("finish.placeholder")}
        />
      </Field>

      {issues.length > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border border-warn-200 bg-warn-50 p-3.5" role="alert">
          <p className="inline-flex items-center gap-2 font-semibold text-warn-700">
            <AlertTriangle className="size-5" />
            {t("finish.notAll")}
          </p>
          <ul className="list-disc pl-5 text-sm text-warn-700">
            {issues.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
          <label className="mt-1 flex min-h-11 items-center gap-3 text-[15px]">
            <input type="checkbox" name="confirm" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="size-6 accent-brand-600" />
            {t("finish.confirm")}
          </label>
        </div>
      )}
      <FormMessage state={state} />
      <button type="submit" disabled={pending || (issues.length > 0 && !confirmed)} className={buttonStyles.primary}>
        {pending ? t("finish.pending") : t("finish.submit")}
      </button>
    </form>
  );
}
