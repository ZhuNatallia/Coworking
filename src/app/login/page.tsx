import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { getCurrentUser } from "@/lib/auth/current";
import { backend } from "@/lib/db";
import { LoginForm } from "./login-form";

export default async function LoginPage(props: PageProps<"/login">) {
  if (await getCurrentUser()) redirect("/");
  const { next } = await props.searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-[430px] flex-col justify-center gap-10 bg-white px-6 py-10">
      <Logo />
      <LoginForm next={typeof next === "string" ? next : "/"} />
      <p className="text-center text-sm text-muted">
        Нет аккаунта? Попросите администратора добавить вас.
        {backend() === "local" && (
          <span className="mt-3 block rounded-xl bg-canvas px-3 py-2 text-xs">
            Локальный режим. Демо: anna@example.com или peter@example.com, пароль officecare
          </span>
        )}
      </p>
    </main>
  );
}
