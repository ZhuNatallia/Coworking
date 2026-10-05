"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset } from "@/app/actions/auth";
import { Logo } from "@/components/logo";
import { buttonStyles, Field, FormMessage, inputClass } from "@/components/ui";
import { useI18n } from "@/lib/i18n/client";

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);
  return (
    <main className="mx-auto flex min-h-screen max-w-[430px] flex-col justify-center gap-8 bg-white px-6 py-10">
      <Logo />
      <form action={action} className="flex flex-col gap-4">
        <p className="text-center text-muted">{t("forgot.intro")}</p>
        <Field label={t("login.email")}>
          <input name="email" type="email" autoComplete="email" required className={inputClass} />
        </Field>
        <FormMessage state={state} />
        <button type="submit" disabled={pending} className={buttonStyles.primary}>
          {pending ? t("forgot.sending") : t("forgot.send")}
        </button>
        <Link href="/login" className="py-2 text-center text-sm font-medium text-brand-600">
          {t("forgot.backToLogin")}
        </Link>
      </form>
    </main>
  );
}
