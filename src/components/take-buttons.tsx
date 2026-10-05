"use client";

import { Check, Undo2 } from "lucide-react";
import { useTransition } from "react";
import { deliverRequest, undoDelivery } from "@/app/actions/visits";
import { cx } from "@/components/ui-core";
import { useI18n } from "@/lib/i18n/client";

export function DeliverButton({ requestId, label }: { requestId: string; label: string }) {
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      onClick={() => startTransition(() => deliverRequest(requestId))}
      disabled={pending}
      aria-label={t("take.deliver", { name: label })}
      className={cx(
        "flex size-8 shrink-0 items-center justify-center rounded-lg border-2 transition",
        pending ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white text-transparent hover:border-brand-500",
      )}
    >
      <Check className="size-5" strokeWidth={3} />
    </button>
  );
}

export function UndoButton({ requestId }: { requestId: string }) {
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      onClick={() => startTransition(() => undoDelivery(requestId))}
      disabled={pending}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted hover:bg-canvas"
    >
      <Undo2 className="size-4" />
      {t("take.undo")}
    </button>
  );
}
