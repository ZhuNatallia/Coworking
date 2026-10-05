import type { SupplyUnit } from "@/lib/types";
import { INTL_LOCALE, type Locale } from "./config";
import type { ru } from "./messages/ru";

export interface Plural {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

type Leaf = string | Plural;

type Paths<T> = {
  [K in keyof T & string]: T[K] extends Leaf ? K : `${K}.${Paths<T[K]>}`;
}[keyof T & string];

/** Same keys as the Russian dictionary; plural forms may differ per language. */
export type Messages<T = typeof ru> = {
  [K in keyof T]: T[K] extends string ? string : T[K] extends Plural ? Plural : Messages<T[K]>;
};

export type MessageKey = Paths<typeof ru>;
export type Vars = Record<string, string | number>;

const APP_TIME_ZONE = "Europe/Berlin";

function lookup(messages: Messages, key: string): Leaf | undefined {
  let node: unknown = messages;
  for (const part of key.split(".")) {
    if (node == null || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node as Leaf | undefined;
}

function capitalize(s: string) {
  return s.charAt(0).toLocaleUpperCase() + s.slice(1);
}

function utcDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function createI18n(locale: Locale, messages: Messages) {
  const intl = INTL_LOCALE[locale];
  const plural = new Intl.PluralRules(intl);
  const number = new Intl.NumberFormat(intl, { maximumFractionDigits: 2 });
  const dateFmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(intl, { timeZone: "UTC", ...opts });
  const short = dateFmt({ weekday: "short" });
  const long = dateFmt({ weekday: "long" });
  // 2024-01-01 is a Monday.
  const weekdayShort = Array.from({ length: 7 }, (_, i) => capitalize(short.format(utcDate(`2024-01-0${i + 1}`)).replace(".", "")));
  const weekdayLong = Array.from({ length: 7 }, (_, i) => capitalize(long.format(utcDate(`2024-01-0${i + 1}`))));

  function t(key: MessageKey, vars?: Vars): string {
    const entry = lookup(messages, key);
    if (entry == null) return key;
    let text: string;
    if (typeof entry === "string") text = entry;
    else {
      const count = Number(vars?.count ?? 0);
      text = entry[plural.select(count) as keyof Plural] ?? entry.other;
    }
    if (!vars) return text;
    return text.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m));
  }

  const fmt = {
    number: (n: number) => number.format(n),
    /** "2 рулона", "1,5 kg" */
    quantity(quantity: number | null, unit: SupplyUnit): string | null {
      if (quantity == null) return null;
      return t(`units.${unit}`, { count: quantity, n: number.format(quantity) });
    },
    /** Unit word that fits the number: "рулона" next to a stepper showing 2. */
    unit(quantity: number | null, unit: SupplyUnit): string {
      return t(`units.${unit}`, { count: quantity ?? 5, n: "" }).trim();
    },
    /** 05.10.2026 */
    date: (date: string) => dateFmt({ day: "2-digit", month: "2-digit", year: "numeric" }).format(utcDate(date)),
    /** 5 октября 2026 */
    dateLong: (date: string) => dateFmt({ day: "numeric", month: "long", year: "numeric" }).format(utcDate(date)).replace(" г.", ""),
    /** 5 октября */
    dayMonth: (date: string) => dateFmt({ day: "numeric", month: "long" }).format(utcDate(date)),
    /** Понедельник, 5 октября */
    weekdayDayMonth: (date: string) => capitalize(dateFmt({ weekday: "long", day: "numeric", month: "long" }).format(utcDate(date))),
    /** Октябрь 2026 */
    monthYear: (date: string) => capitalize(dateFmt({ month: "long", year: "numeric" }).format(utcDate(date)).replace(" г.", "")),
    /** 05.10.2026, 19:46 in office time */
    dateTime: (iso: string) =>
      new Intl.DateTimeFormat(intl, {
        timeZone: APP_TIME_ZONE,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(iso)),
    /** 1 = Monday … 7 = Sunday */
    weekdayShort: (isoDay: number) => weekdayShort[isoDay - 1],
    weekdayLong: (isoDay: number) => weekdayLong[isoDay - 1],
    weekdayEvery: (isoDay: number) => t(`weekdays.every${isoDay}` as MessageKey),
    list: (items: string[]) => new Intl.ListFormat(intl, { style: "short", type: "conjunction" }).format(items),
  };

  return { locale, t, fmt };
}

export type I18n = ReturnType<typeof createI18n>;
export type T = I18n["t"];
