"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { login } from "@/app/actions/auth";
import { buttonStyles, Field, FormMessage, inputClass } from "@/components/ui";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(login, undefined);
  const [show, setShow] = useState(false);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <Field label="Email">
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
      <Field label="Пароль">
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
            aria-label={show ? "Скрыть пароль" : "Показать пароль"}
          >
            {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </div>
      </Field>
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className={`${buttonStyles.primary} mt-2`}>
        {pending ? "Входим…" : "Войти"}
      </button>
      <Link href="/forgot-password" className="py-2 text-center text-sm font-medium text-brand-600">
        Забыли пароль?
      </Link>
    </form>
  );
}
