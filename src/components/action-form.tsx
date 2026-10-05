"use client";

import { startTransition, useActionState, useEffect, useRef, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n/client";
import { buttonStyles, cx, FormMessage } from "./ui";

type State = { error?: string; ok?: string } | undefined;

export function ActionForm({
  action,
  children,
  submitLabel,
  pendingLabel,
  variant = "primary",
  className,
  resetOnSuccess = false,
}: {
  action: (prev: State, form: FormData) => Promise<State>;
  children: ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  variant?: keyof typeof buttonStyles;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const { t } = useI18n();
  const [state, formAction, pending] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (resetOnSuccess && state?.ok) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form
      ref={ref}
      action={formAction}
      // Submitting through a transition keeps typed values when the server returns an error.
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => formAction(data));
      }}
      className={cx("flex flex-col gap-3", className)}
    >
      {children}
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className={buttonStyles[variant]}>
        {pending ? pendingLabel ?? t("common.saving") : submitLabel}
      </button>
    </form>
  );
}
