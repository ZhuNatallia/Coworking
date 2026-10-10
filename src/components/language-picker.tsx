"use client";

import { Check } from "lucide-react";
import { useTransition } from "react";
import { setLocale } from "@/app/actions/auth";
import { useI18n } from "@/lib/i18n/client";
import { LOCALE_NAMES, LOCALES } from "@/lib/i18n/config";
import { cx } from "./ui-core";

/** Switches the app language right away; the whole screen re-renders in the chosen language. */
export function LanguagePicker({ compact = false }: { compact?: boolean }) {
  const { locale, t } = useI18n();
  const [pending, startTransition] = useTransition();

  return (
    <div
      role="radiogroup"
      aria-label={t("profile.language")}
      aria-busy={pending}
      className={cx("grid gap-2", compact ? "grid-cols-4" : "grid-cols-2", pending && "opacity-60")}
    >
      {LOCALES.map((l) => {
        const active = l === locale;
        return (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={active}
            lang={l}
            disabled={pending}
            onClick={() => !active && startTransition(() => setLocale(l))}
            className={cx(
              "flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-2 text-[15px] font-medium transition",
              active ? "border-brand-solid bg-brand-solid text-white" : "border-line bg-surface text-ink",
            )}
          >
            {active && !compact && <Check className="size-4" strokeWidth={3} />}
            {compact ? l.toUpperCase() : LOCALE_NAMES[l]}
          </button>
        );
      })}
    </div>
  );
}
