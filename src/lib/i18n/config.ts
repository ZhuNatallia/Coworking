export const LOCALES = ["ru", "en", "de", "ro"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "ru";
export const LOCALE_COOKIE = "oc_lang";

export const LOCALE_NAMES: Record<Locale, string> = {
  ru: "Русский",
  en: "English",
  de: "Deutsch",
  ro: "Română",
};

export const INTL_LOCALE: Record<Locale, string> = {
  ru: "ru-RU",
  en: "en-GB",
  de: "de-DE",
  ro: "ro-RO",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Picks the best supported language from an Accept-Language header. */
export function localeFromHeader(header: string | null | undefined): Locale | null {
  if (!header) return null;
  const tags = header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { lang: tag.toLowerCase().split("-")[0], q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  return tags.map((t) => t.lang).find(isLocale) ?? null;
}
