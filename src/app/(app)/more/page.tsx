import { CalendarClock, History, UserRound, Users } from "lucide-react";
import type { ReactNode } from "react";
import { Card, ListLink, Page, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/current";
import { getI18n } from "@/lib/i18n/server";

function Item({ href, icon, title, hint }: { href: string; icon: ReactNode; title: string; hint: string }) {
  return (
    <ListLink href={href}>
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">{icon}</span>
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted">{hint}</p>
        </div>
      </div>
    </ListLink>
  );
}

export default async function MorePage() {
  const user = await requireUser();
  const { t } = await getI18n();
  const admin = user.role === "admin";
  return (
    <>
      <PageHeader title={t("more.title")} />
      <Page>
        <Card className="divide-y divide-line p-0">
          <Item href="/history" icon={<History className="size-5" />} title={t("more.history")} hint={t("more.historyHint")} />
          <Item href="/admin/schedule" icon={<CalendarClock className="size-5" />} title={t("more.schedule")} hint={t("more.scheduleHint")} />
          {admin && <Item href="/admin/employees" icon={<Users className="size-5" />} title={t("nav.employees")} hint={t("more.employeesHint")} />}
          <Item href="/profile" icon={<UserRound className="size-5" />} title={t("more.profile")} hint={t("more.profileHint")} />
        </Card>
      </Page>
    </>
  );
}
