"use client";

import { Leaf } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";

export function Logo() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <span className="flex size-20 items-center justify-center rounded-[28px] bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-700/20">
        <Leaf className="size-10" strokeWidth={2} />
      </span>
      <div>
        <p className="text-3xl font-bold tracking-tight text-brand-700">OfficeCare</p>
        <p className="mt-1 text-muted">
          {t("app.tagline1")}
          <br />
          {t("app.tagline2")}
        </p>
      </div>
    </div>
  );
}
