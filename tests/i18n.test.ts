import { describe, expect, it } from "vitest";
import { LOCALES, localeFromHeader } from "@/lib/i18n/config";
import { createI18n } from "@/lib/i18n/core";
import { MESSAGES } from "@/lib/i18n/messages";

const i18n = (locale: (typeof LOCALES)[number]) => createI18n(locale, MESSAGES[locale]);

function leaves(node: unknown, prefix = ""): string[] {
  if (typeof node === "string") return [prefix];
  const obj = node as Record<string, unknown>;
  if ("other" in obj && typeof obj.other === "string") return [prefix];
  return Object.entries(obj).flatMap(([k, v]) => leaves(v, prefix ? `${prefix}.${k}` : k));
}

describe("dictionaries", () => {
  it("have the same keys in every language", () => {
    const ru = leaves(MESSAGES.ru).sort();
    for (const locale of LOCALES) expect(leaves(MESSAGES[locale]).sort()).toEqual(ru);
  });

  it("keep the same placeholders as Russian", () => {
    const vars = (s: unknown) => [...JSON.stringify(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const key of leaves(MESSAGES.ru)) {
      const get = (locale: (typeof LOCALES)[number]) => key.split(".").reduce<unknown>((n, p) => (n as Record<string, unknown>)[p], MESSAGES[locale]);
      const expected = [...new Set(vars(get("ru")))];
      for (const locale of LOCALES) expect([...new Set(vars(get(locale)))], `${locale}: ${key}`).toEqual(expected);
    }
  });
});

describe("t", () => {
  it("interpolates and falls back to the key", () => {
    expect(i18n("en").t("home.reminder", { date: "Tomorrow", office: "Office 1" })).toBe("Tomorrow: service at Office 1");
    expect(i18n("de").t("nope.missing" as never)).toBe("nope.missing");
  });

  it("picks plural forms per language", () => {
    expect(i18n("ru").t("home.officesCount", { count: 1 })).toBe("1 офис");
    expect(i18n("ru").t("home.officesCount", { count: 3 })).toBe("3 офиса");
    expect(i18n("ru").t("home.officesCount", { count: 5 })).toBe("5 офисов");
    expect(i18n("en").t("home.officesCount", { count: 1 })).toBe("1 office");
    expect(i18n("en").t("home.officesCount", { count: 2 })).toBe("2 offices");
    expect(i18n("ro").t("home.officesCount", { count: 2 })).toBe("2 birouri");
    expect(i18n("ro").t("home.officesCount", { count: 20 })).toBe("20 de birouri");
  });
});

describe("fmt", () => {
  it("declines units by number", () => {
    const { fmt } = i18n("ru");
    expect(fmt.quantity(1, "roll")).toBe("1 рулон");
    expect(fmt.quantity(2, "roll")).toBe("2 рулона");
    expect(fmt.quantity(5, "roll")).toBe("5 рулонов");
    expect(fmt.quantity(11, "bottle")).toBe("11 бутылок");
    expect(fmt.quantity(22, "bottle")).toBe("22 бутылки");
    expect(fmt.quantity(0, "ream")).toBe("0 пачек");
    expect(fmt.quantity(1.5, "kg")).toBe("1,5 кг");
    expect(fmt.quantity(null, "pcs")).toBeNull();
    expect(i18n("en").fmt.quantity(1, "bottle")).toBe("1 bottle");
    expect(i18n("en").fmt.quantity(1.5, "kg")).toBe("1.5 kg");
    expect(i18n("de").fmt.quantity(3, "roll")).toBe("3 Rollen");
  });

  it("formats dates and weekdays in each language", () => {
    expect(i18n("ru").fmt.dateLong("2026-09-03")).toBe("3 сентября 2026");
    expect(i18n("en").fmt.dateLong("2026-09-03")).toBe("3 September 2026");
    expect(i18n("de").fmt.dateLong("2026-09-03")).toBe("3. September 2026");
    expect(i18n("ro").fmt.dateLong("2026-09-03")).toBe("3 septembrie 2026");
    expect(i18n("ru").fmt.weekdayShort(1)).toBe("Пн");
    expect(i18n("de").fmt.weekdayShort(7)).toBe("So");
    expect(i18n("en").fmt.weekdayLong(3)).toBe("Wednesday");
  });
});

describe("localeFromHeader", () => {
  it("picks the best supported language", () => {
    expect(localeFromHeader("fr-FR,fr;q=0.9,de;q=0.8,en;q=0.7")).toBe("de");
    expect(localeFromHeader("ro-RO")).toBe("ro");
    expect(localeFromHeader("fr")).toBeNull();
  });
});
