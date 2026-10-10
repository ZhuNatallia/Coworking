export const THEMES = ["light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

export const DEFAULT_THEME: Theme = "light";
export const THEME_COOKIE = "oc_theme";

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}
