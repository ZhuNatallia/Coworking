import { SearchX } from "lucide-react";
import { LinkButton } from "@/components/ui";
import { getI18n } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <SearchX className="size-12 text-muted" />
      <h1 className="text-xl font-bold">{t("errors.notFoundTitle")}</h1>
      <p className="text-sm text-muted">{t("errors.notFoundText")}</p>
      <LinkButton href="/">{t("common.toHome")}</LinkButton>
    </main>
  );
}
