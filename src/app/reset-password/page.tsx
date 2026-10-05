"use client";

import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/logo";
import { buttonStyles, Field, FormMessage, inputClass } from "@/components/ui";

const MIN_LENGTH = 8;

export default function ResetPasswordPage() {
  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    return url && key ? createClient(url, key) : null;
  }, []);
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<{ error?: string; ok?: string }>();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data: s }) => s.session && setReady(true));
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  async function submit(form: FormData) {
    const password = String(form.get("password") ?? "");
    if (password.length < MIN_LENGTH) return setState({ error: `Пароль должен быть не короче ${MIN_LENGTH} символов` });
    setPending(true);
    const { error } = await supabase!.auth.updateUser({ password });
    setPending(false);
    if (error) return setState({ error: error.message });
    await supabase!.auth.signOut();
    setState({ ok: "Пароль обновлён. Теперь можно войти." });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-[430px] flex-col justify-center gap-8 bg-white px-6 py-10">
      <Logo />
      {!supabase ? (
        <FormMessage state={{ error: "Сброс пароля по почте работает только с Supabase. Попросите администратора задать новый пароль." }} />
      ) : !ready && !state?.ok ? (
        <p className="text-center text-muted">Проверяем ссылку… Если ничего не происходит, запросите новое письмо.</p>
      ) : (
        <form action={submit} className="flex flex-col gap-4">
          <Field label="Новый пароль" hint={`Не короче ${MIN_LENGTH} символов`}>
            <input name="password" type="password" autoComplete="new-password" required className={inputClass} />
          </Field>
          <FormMessage state={state} />
          {!state?.ok && (
            <button type="submit" disabled={pending} className={buttonStyles.primary}>
              Сохранить пароль
            </button>
          )}
        </form>
      )}
      <Link href="/login" className="py-2 text-center text-sm font-medium text-brand-600">
        Ко входу
      </Link>
    </main>
  );
}
