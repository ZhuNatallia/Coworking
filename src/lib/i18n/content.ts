import { createHash } from "node:crypto";
import { db, nowISO } from "@/lib/db";
import type { Locale } from "./config";

/**
 * Machine translation of text people type in (task and supply names, comments) via Google Translate.
 * Results are cached in memory and in the `translations` table, so each text is sent to Google once per language.
 * With GOOGLE_TRANSLATE_API_KEY set, the official Cloud Translation API is used; otherwise the free web endpoint.
 */

type Lookup = (text: string | null | undefined) => string;

const REQUEST_TIMEOUT_MS = 5000;
const PARALLEL_REQUESTS = 4;
const MAX_MEMORY_ENTRIES = 5000;

const globalForCache = globalThis as unknown as { __officecareTranslations?: Map<string, string> };
const memory = (globalForCache.__officecareTranslations ??= new Map());

function cacheKey(lang: Locale, text: string) {
  return createHash("sha1").update(`${lang}:${text}`).digest("hex");
}

function remember(key: string, value: string) {
  if (memory.size >= MAX_MEMORY_ENTRIES) memory.delete(memory.keys().next().value!);
  memory.set(key, value);
}

const CYRILLIC = /[\u0400-\u04FF]/;
const LATIN = /[A-Za-zÀ-ÿĂăÂâÎîȘșȚțŞşŢţ]/;

/** Text without letters (numbers, codes) and Russian text shown to Russian readers stay as they are. */
function needsTranslation(text: string, lang: Locale) {
  if (!/\p{L}/u.test(text)) return false;
  if (lang === "ru") return !CYRILLIC.test(text) || LATIN.test(text);
  return true;
}

/** Translates all texts into `lang` and returns a lookup that falls back to the original. */
export async function translator(texts: (string | null | undefined)[], lang: Locale): Promise<Lookup> {
  const unique = [...new Set(texts.map((t) => t?.trim()).filter((t): t is string => !!t && needsTranslation(t, lang)))];
  const result = new Map<string, string>();
  const missing: { text: string; key: string }[] = [];

  for (const text of unique) {
    const key = cacheKey(lang, text);
    const hit = memory.get(key);
    if (hit !== undefined) result.set(text, hit);
    else missing.push({ text, key });
  }

  if (missing.length) {
    try {
      const stored = new Map<string, string>();
      for (let i = 0; i < missing.length; i += 100) {
        const ids = missing.slice(i, i + 100).map((m) => m.key);
        for (const r of await db().select("translations", { in: { id: ids } })) stored.set(r.id, r.text);
      }
      for (let i = missing.length - 1; i >= 0; i--) {
        const value = stored.get(missing[i].key);
        if (value === undefined) continue;
        result.set(missing[i].text, value);
        remember(missing[i].key, value);
        missing.splice(i, 1);
      }
    } catch (error) {
      console.error("Could not read cached translations", error);
    }
  }

  if (missing.length) {
    const translated = await googleTranslate(
      missing.map((m) => m.text),
      lang,
    );
    const fresh = missing
      .map((m, i) => ({ ...m, value: translated[i] }))
      .filter((m): m is typeof m & { value: string } => typeof m.value === "string");
    for (const m of fresh) {
      result.set(m.text, m.value);
      remember(m.key, m.value);
    }
    if (fresh.length) {
      const created_at = nowISO();
      await db()
        .insert(
          "translations",
          fresh.map((m) => ({ id: m.key, lang, source: m.text, text: m.value, created_at })),
        )
        .catch(() => {
          // Another request saved the same translation first.
        });
    }
  }

  return (text) => {
    if (!text) return text ?? "";
    return result.get(text.trim()) ?? text;
  };
}

export async function translateOne(text: string | null | undefined, lang: Locale): Promise<string> {
  return (await translator([text], lang))(text);
}

/** Returns translations in input order; entries that failed stay undefined. */
async function googleTranslate(texts: string[], lang: Locale): Promise<(string | undefined)[]> {
  const key = process.env.GOOGLE_TRANSLATE_API_KEY;
  try {
    if (key) return await officialApi(texts, lang, key);
    const out: (string | undefined)[] = new Array(texts.length);
    let next = 0;
    await Promise.all(
      Array.from({ length: Math.min(PARALLEL_REQUESTS, texts.length) }, async () => {
        while (next < texts.length) {
          const i = next++;
          out[i] = await freeEndpoint(texts[i], lang)
            .catch(() => new Promise((r) => setTimeout(r, 400)).then(() => freeEndpoint(texts[i], lang)))
            .catch(() => undefined);
        }
      }),
    );
    return out;
  } catch (error) {
    console.error("Google Translate failed", error);
    return [];
  }
}

async function officialApi(texts: string[], lang: Locale, key: string): Promise<string[]> {
  const out: string[] = [];
  for (let i = 0; i < texts.length; i += 100) {
    const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ q: texts.slice(i, i + 100), target: lang, format: "text" }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Cloud Translation ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as { data: { translations: { translatedText: string }[] } };
    out.push(...json.data.translations.map((t) => t.translatedText));
  }
  return out;
}

async function freeEndpoint(text: string, lang: Locale): Promise<string> {
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.search = new URLSearchParams({ client: "gtx", sl: "auto", tl: lang, dt: "t", q: text }).toString();
  const res = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Google Translate ${res.status}`);
  const json = (await res.json()) as [[string, string][]];
  return json[0].map((segment) => segment[0]).join("");
}
