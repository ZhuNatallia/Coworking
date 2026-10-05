export function str(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export function optStr(form: FormData, key: string): string | null {
  return str(form, key) || null;
}

export function num(form: FormData, key: string): number | null {
  const raw = str(form, key).replace(",", ".");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function bool(form: FormData, key: string): boolean {
  const v = form.get(key);
  return v === "on" || v === "true" || v === "1";
}

export function oneOf<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}
