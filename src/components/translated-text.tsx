"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/client";

/** Machine-translated text written by a colleague, with a switch to the original wording. */
export function TranslatedText({ text, original, className }: { text: string; original: string; className?: string }) {
  const { t } = useI18n();
  const [showOriginal, setShowOriginal] = useState(false);
  const differs = text.trim() !== original.trim();
  return (
    <span className={className}>
      {showOriginal ? original : text}
      {differs && (
        <button
          type="button"
          onClick={() => setShowOriginal((v) => !v)}
          className="ml-2 inline-block text-xs font-medium text-brand-700 underline underline-offset-2"
          aria-pressed={showOriginal}
        >
          {t("common.original")}
        </button>
      )}
    </span>
  );
}
