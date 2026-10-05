"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { login } from "@/app/actions/auth";
import { buttonStyles, Field, FormMessage, inputClass } from "@/components/ui";
import { useI18n } from "@/lib/i18n/client";

export function LoginForm({ next }: { next: string }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(login, undefined);
  const [show, setShow] = useState(false);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <Field label={t("login.email")}>
        <input
          key={state?.email}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          defaultValue={state?.email}
          placeholder="anna@example.com"
          className={inputClass}
        />
      </Field>
      <Field label={t("login.password")}>
        <div className="relative">
          <input
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            required
            className={`${inputClass} pr-12`}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted"
            aria-label={t(show ? "login.hidePassword" : "login.showPassword")}
          >
            {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </div>
      </Field>
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className={`${buttonStyles.primary} mt-2`}>
        {pending ? t("login.pending") : t("login.submit")}
      </button>
      <Link href="/forgot-password" className="py-2 text-center text-sm font-medium text-brand-600">
        {t("login.forgot")}
      </Link>
    </form>
  );
}
