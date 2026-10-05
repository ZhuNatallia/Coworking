"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AccountError, checkCredentials, sendPasswordReset, setPassword } from "@/lib/auth/accounts";
import { endSession, requireUser, startSession } from "@/lib/auth/current";
import { db } from "@/lib/db";

export type FormState = { error?: string; ok?: string; email?: string } | undefined;

function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function login(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Введите email и пароль", email };
  const profile = await checkCredentials(email, password);
  if (!profile) return { error: "Неверный email или пароль", email };
  await startSession(profile.id);
  redirect(safeNext(form.get("next")));
}

export async function logout() {
  await endSession();
  redirect("/login");
}

export async function requestPasswordReset(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim();
  if (!email) return { error: "Введите email" };
  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;
  const sent = await sendPasswordReset(email, `${origin}/reset-password`);
  if (!sent) return { error: "В локальном режиме письма не отправляются. Пароль может сменить администратор." };
  return { ok: "Если такой email зарегистрирован, мы отправили письмо со ссылкой для нового пароля." };
}

export async function updateOwnProfile(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = String(form.get("name") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!name) return { error: "Имя не может быть пустым" };
  await db().update("profiles", { eq: { id: user.id } }, { name });
  if (password) {
    try {
      await setPassword(user.id, password);
    } catch (e) {
      if (e instanceof AccountError) return { error: e.message };
      throw e;
    }
  }
  refresh();
  return { ok: "Сохранено" };
}
