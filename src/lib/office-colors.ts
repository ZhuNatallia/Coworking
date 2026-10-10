import type { CSSProperties } from "react";

/**
 * Colours a coworking can be marked with. `accent` is the stripe, dot and filled tile.
 * `ink` is the name on a light surface, `inkDark` the same name on a dark surface.
 * `soft` and `softDark` are the tinted backgrounds. `on` is the icon colour on an `accent` fill.
 * The first six match the Allgäu Coworking locations.
 */
export const OFFICE_COLORS = {
  green: { accent: "#2f9e5b", ink: "#1d6b3d", inkDark: "#8ed4a8", soft: "#e6f4ea", softDark: "#173228", on: "#ffffff" },
  blue: { accent: "#2563b8", ink: "#1d4f93", inkDark: "#9ec0f5", soft: "#e6eefa", softDark: "#15243c", on: "#ffffff" },
  lime: { accent: "#84c225", ink: "#4a7a0c", inkDark: "#c8e86a", soft: "#f0f8dc", softDark: "#24320c", on: "#2f4f06" },
  grey: { accent: "#868d96", ink: "#4a505b", inkDark: "#d5dbe2", soft: "#eef0f2", softDark: "#2a3036", on: "#ffffff" },
  purple: { accent: "#633c92", ink: "#633c92", inkDark: "#c9b0ea", soft: "#f1ebf8", softDark: "#2a2040", on: "#ffffff" },
  white: { accent: "#cfd9e3", ink: "#4f6880", inkDark: "#d7e6f5", soft: "#f6f9fb", softDark: "#24303a", on: "#4f6880" },
  red: { accent: "#d64545", ink: "#a12f2f", inkDark: "#f0a8a4", soft: "#fbeaea", softDark: "#3a1c1c", on: "#ffffff" },
  orange: { accent: "#e8781a", ink: "#a4510c", inkDark: "#f5c07a", soft: "#fdf0e3", softDark: "#3a2814", on: "#ffffff" },
  yellow: { accent: "#e6b10a", ink: "#856604", inkDark: "#f0d56a", soft: "#fdf6dc", softDark: "#332a0c", on: "#5c4703" },
  pink: { accent: "#d63c84", ink: "#9d1d58", inkDark: "#f0a8cc", soft: "#fce8f1", softDark: "#3a1828", on: "#ffffff" },
  teal: { accent: "#0f9488", ink: "#0f6b63", inkDark: "#8ed9d0", soft: "#e1f4f2", softDark: "#123230", on: "#ffffff" },
  brown: { accent: "#94643c", ink: "#6e4a2b", inkDark: "#e0c0a0", soft: "#f3ebe3", softDark: "#322418", on: "#ffffff" },
} as const;

export type OfficeColor = keyof typeof OFFICE_COLORS;

export const OFFICE_COLOR_KEYS = Object.keys(OFFICE_COLORS) as OfficeColor[];

export function isOfficeColor(value: unknown): value is OfficeColor {
  return typeof value === "string" && value in OFFICE_COLORS;
}

/** CSS variables behind the `office`, `office-ink` and `office-soft` Tailwind colours. */
export function officeColorVars(color: string | null | undefined): CSSProperties | undefined {
  if (!isOfficeColor(color)) return undefined;
  const c = OFFICE_COLORS[color];
  return {
    "--office": c.accent,
    "--office-ink": `light-dark(${c.ink}, ${c.inkDark})`,
    "--office-soft": `light-dark(${c.soft}, ${c.softDark})`,
    "--office-on": c.on,
  } as CSSProperties;
}
