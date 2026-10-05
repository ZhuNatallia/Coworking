import { SearchX } from "lucide-react";
import { LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <SearchX className="size-12 text-muted" />
      <h1 className="text-xl font-bold">Страница не найдена</h1>
      <p className="text-sm text-muted">Возможно, она удалена или у вас нет к ней доступа.</p>
      <LinkButton href="/">На главную</LinkButton>
    </main>
  );
}
