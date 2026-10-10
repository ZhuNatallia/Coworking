import { redirect } from "next/navigation";
import { LanguagePicker } from "@/components/language-picker";
import { Logo } from "@/components/logo";
import { getCurrentUser } from "@/lib/auth/current";
import { backend } from "@/lib/db";
import { getI18n } from "@/lib/i18n/server";
import { LoginForm } from "./login-form";

export default async function LoginPage(props: PageProps<"/login">) {
  if (await getCurrentUser()) redirect("/");
  const { t } = await getI18n();
  const { next } = await props.searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-[430px] flex-col justify-center gap-10 bg-surface px-6 py-10">
      <LanguagePicker compact />
      <Logo />
      <LoginForm next={typeof next === "string" ? next : "/"} />
      <p className="text-center text-sm text-muted">
        {t("login.noAccount")}
        {backend() === "local" && <span className="mt-3 block rounded-xl bg-canvas px-3 py-2 text-xs">{t("login.demo")}</span>}
      </p>
    </main>
  );
}
