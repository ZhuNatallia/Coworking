import { Bell, ChevronDown, Languages, LogOut, Smartphone, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { logout } from "@/app/actions/auth";
import { LanguagePicker } from "@/components/language-picker";
import { Avatar, Card, Page, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/current";
import { getI18n } from "@/lib/i18n/server";
import { ProfileForm } from "./profile-form";

function Section({ icon, title, children, open }: { icon: ReactNode; title: string; children: ReactNode; open?: boolean }) {
  return (
    <details className="group" open={open}>
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
        <span className="text-brand-600">{icon}</span>
        <span className="flex-1 font-medium">{title}</span>
        <ChevronDown className="size-5 text-muted transition group-open:rotate-180" />
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}

export default async function ProfilePage() {
  const user = await requireUser();
  const { t } = await getI18n();
  return (
    <>
      <PageHeader title={t("profile.title")} />
      <Page>
        <Card className="flex items-center gap-4">
          <Avatar name={user.name} size={56} />
          <div className="min-w-0">
            <p className="text-lg font-semibold">{user.name}</p>
            <p className="truncate text-sm text-muted">{user.email}</p>
            <p className="text-sm text-brand-700">{t(`roles.${user.role}`)}</p>
          </div>
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="inline-flex items-center gap-3 font-medium">
            <Languages className="size-5 text-brand-600" />
            {t("profile.language")}
          </h2>
          <LanguagePicker />
          <p className="text-sm text-muted">{t("profile.languageHint")}</p>
        </Card>

        <Card className="divide-y divide-line p-0">
          <Section icon={<UserRound className="size-5" />} title={t("profile.personal")}>
            <ProfileForm name={user.name} />
          </Section>
          <Section icon={<Bell className="size-5" />} title={t("profile.notifications")}>
            <p className="text-sm text-muted">{t("profile.notificationsText")}</p>
          </Section>
          <Section icon={<Smartphone className="size-5" />} title={t("profile.install")}>
            <div className="flex flex-col gap-3 text-sm text-ink">
              <p>
                <b>iPhone:</b> {t("profile.iphone")}
              </p>
              <p>
                <b>Android:</b> {t("profile.android")}
              </p>
              <p className="text-muted">{t("profile.installNote")}</p>
            </div>
          </Section>
        </Card>

        <form action={logout}>
          <button type="submit" className="flex w-full items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3.5 font-medium text-danger-700">
            <LogOut className="size-5" />
            {t("profile.logout")}
          </button>
        </form>
      </Page>
    </>
  );
}
