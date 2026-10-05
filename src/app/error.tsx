"use client";

import { TriangleAlert } from "lucide-react";
import { buttonStyles } from "@/components/ui";
import { useI18n } from "@/lib/i18n/client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <TriangleAlert className="size-12 text-warn-700" />
      <h1 className="text-xl font-bold">{t("errors.errorTitle")}</h1>
      <p className="text-sm text-muted">{t("errors.errorText")}</p>
      <button type="button" onClick={reset} className={buttonStyles.primary}>
        {t("errors.retry")}
      </button>
    </main>
  );
}
