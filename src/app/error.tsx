"use client";

import { TriangleAlert } from "lucide-react";
import { buttonStyles } from "@/components/ui";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <TriangleAlert className="size-12 text-warn-700" />
      <h1 className="text-xl font-bold">Что-то пошло не так</h1>
      <p className="text-sm text-muted">Проверьте интернет и попробуйте ещё раз.</p>
      <button type="button" onClick={reset} className={buttonStyles.primary}>
        Повторить
      </button>
    </main>
  );
}
