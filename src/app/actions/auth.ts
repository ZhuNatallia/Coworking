"use server";

import { refresh } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { AccountError, accountErrorText, checkCredentials, sendPasswordReset, setPassword } from "@/lib/auth/accounts";
import { endSession, getCurrentUser, requireUser, startSession } from "@/lib/auth/current";
import { db } from "@/lib/db";
import { isLocale, LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";

export type FormState = { error?: string; ok?: string; email?: string } | undefined;

function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

async function rememberLocale(locale: Locale) {
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
}

export async function login(_prev: FormState, form: FormData): Promise<FormState> {
  const { t } = await getI18n();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: t("login.empty"), email };
  const profile = await checkCredentials(email, password);
  if (!profile) return { error: t("login.invalid"), email };
  await startSession(profile.id);
  if (isLocale(profile.locale)) await rememberLocale(profile.locale);
  redirect(safeNext(form.get("next")));
}

export async function logout() {
  await endSession();
  redirect("/login");
}

/** Switches the app language for the signed-in user (saved in the profile) or for this browser. */
export async function setLocale(locale: string) {
  if (!isLocale(locale)) return;
  const user = await getCurrentUser();
  if (user) await db().update("profiles", { eq: { id: user.id } }, { locale });
  await rememberLocale(locale);
  refresh();
}

export async function requestPasswordReset(_prev: FormState, form: FormData): Promise<FormState> {
  const { t } = await getI18n();
  const email = String(form.get("email") ?? "").trim();
  if (!email) return { error: t("forgot.emptyEmail") };
  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;
  const sent = await sendPasswordReset(email, `${origin}/reset-password`);
  if (!sent) return { error: t("forgot.localMode") };
  return { ok: t("forgot.sent") };
}

export async function updateOwnProfile(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const { t } = await getI18n();
  const name = String(form.get("name") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!name) return { error: t("profile.emptyName") };
  await db().update("profiles", { eq: { id: user.id } }, { name });
  if (password) {
    try {
      await setPassword(user.id, password);
    } catch (e) {
      if (e instanceof AccountError) return { error: accountErrorText(e, t) };
      throw e;
    }
  }
  refresh();
  return { ok: t("profile.saved") };
}
