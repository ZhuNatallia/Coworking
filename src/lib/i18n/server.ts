import { cookies, headers } from "next/headers";
import { cache } from "react";
import { getCurrentUser } from "@/lib/auth/current";
import { translator } from "./content";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, localeFromHeader, type Locale } from "./config";
import { createI18n } from "./core";
import { MESSAGES } from "./messages";

/** The signed-in user's language, then the browser cookie, then the browser language. */
export const getLocale = cache(async (): Promise<Locale> => {
  const user = await getCurrentUser();
  if (isLocale(user?.locale)) return user.locale;
  const cookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(cookie)) return cookie;
  return localeFromHeader((await headers()).get("accept-language")) ?? DEFAULT_LOCALE;
});

export const getI18n = cache(async () => i18nFor(await getLocale()));

export function i18nFor(locale: Locale) {
  return createI18n(locale, MESSAGES[locale]);
}

/** Machine translation of user-entered texts into the reader's language. */
export async function getTranslator(texts: (string | null | undefined)[]) {
  return translator(texts, await getLocale());
}
