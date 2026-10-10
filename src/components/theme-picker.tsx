"use client";

import { Moon, Sun } from "lucide-react";
import { useTransition } from "react";
import { setTheme } from "@/app/actions/auth";
import { useI18n } from "@/lib/i18n/client";
import { THEMES, type Theme } from "@/lib/theme";
import { cx } from "./ui-core";

const ICONS: Record<Theme, typeof Sun> = { light: Sun, dark: Moon };

/** Switches light and dark for the whole app. Light stays light even when the phone is set to dark. */
export function ThemePicker({ theme }: { theme: Theme }) {
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();

  return (
    <div role="radiogroup" aria-label={t("profile.theme")} aria-busy={pending} className={cx("grid grid-cols-2 gap-2", pending && "opacity-60")}>
      {THEMES.map((value) => {
        const active = value === theme;
        const Icon = ICONS[value];
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={pending}
            onClick={() => !active && startTransition(() => setTheme(value))}
            className={cx(
              "flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-[15px] font-medium transition",
              active ? "border-brand-solid bg-brand-solid text-white" : "border-line bg-surface text-ink",
            )}
          >
            <Icon className="size-4" />
            {t(`profile.themes.${value}`)}
          </button>
        );
      })}
    </div>
  );
}
