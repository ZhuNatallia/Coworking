export const APP_TIME_ZONE = "Europe/Berlin";

const DAY_MS = 86_400_000;

/** Today's date (YYYY-MM-DD) in the office time zone. */
export function todayISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function toUTC(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  return fromUTC(new Date(toUTC(date).getTime() + days * DAY_MS));
}

export function diffDays(a: string, b: string): number {
  return Math.round((toUTC(a).getTime() - toUTC(b).getTime()) / DAY_MS);
}

/** 1 = Monday … 7 = Sunday */
export function isoWeekday(date: string): number {
  const day = toUTC(date).getUTCDay();
  return day === 0 ? 7 : day;
}

export function isoWeek(date: string): number {
  const d = toUTC(date);
  const thursday = new Date(d.getTime() + (4 - (d.getUTCDay() || 7)) * DAY_MS);
  const yearStart = Date.UTC(thursday.getUTCFullYear(), 0, 1);
  return Math.ceil(((thursday.getTime() - yearStart) / DAY_MS + 1) / 7);
}

export function startOfWeek(date: string): string {
  return addDays(date, 1 - isoWeekday(date));
}

export function startOfMonth(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

export function endOfMonth(date: string): string {
  const d = toUTC(startOfMonth(date));
  return fromUTC(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)));
}

export function addMonths(date: string, months: number): string {
  const d = toUTC(startOfMonth(date));
  return fromUTC(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1)));
}

export function isValidISODate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(toUTC(value).getTime());
}

const ruFormat = (opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("ru-RU", { timeZone: "UTC", ...opts });

/** 03.09.2026 */
export function formatDate(date: string): string {
  return ruFormat({ day: "2-digit", month: "2-digit", year: "numeric" }).format(toUTC(date));
}

/** 3 сентября 2026 */
export function formatDateLong(date: string): string {
  return ruFormat({ day: "numeric", month: "long", year: "numeric" }).format(toUTC(date)).replace(" г.", "");
}

/** 3 сентября */
export function formatDayMonth(date: string): string {
  return ruFormat({ day: "numeric", month: "long" }).format(toUTC(date));
}

/** Четверг, 3 сентября */
export function formatWeekdayDayMonth(date: string): string {
  const s = ruFormat({ weekday: "long", day: "numeric", month: "long" }).format(toUTC(date));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** сентябрь 2026 */
export function formatMonthYear(date: string): string {
  const s = ruFormat({ month: "long", year: "numeric" }).format(toUTC(date)).replace(" г.", "");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const WEEKDAY_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
export const WEEKDAY_LONG = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];
export const WEEKDAY_EVERY = [
  "Каждый понедельник",
  "Каждый вторник",
  "Каждую среду",
  "Каждый четверг",
  "Каждую пятницу",
  "Каждую субботу",
  "Каждое воскресенье",
];

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: APP_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function dateOfTimestamp(iso: string): string {
  return todayISO(new Date(iso));
}
