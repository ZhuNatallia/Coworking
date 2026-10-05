import { Boxes, CalendarClock, CalendarDays, History, ShoppingBag, UserRound } from "lucide-react";
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
          {admin && <Item href="/take" icon={<ShoppingBag className="size-5" />} title={t("take.title")} hint={t("more.takeHint")} />}
          {!admin && <Item href="/calendar" icon={<CalendarDays className="size-5" />} title={t("calendar.title")} hint={t("more.calendarHint")} />}
          <Item href="/history" icon={<History className="size-5" />} title={t("more.history")} hint={t("more.historyHint")} />
          {admin && (
            <>
              <Item href="/admin/schedule" icon={<CalendarClock className="size-5" />} title={t("more.schedule")} hint={t("more.scheduleHint")} />
              <Item href="/admin/supplies" icon={<Boxes className="size-5" />} title={t("more.supplies")} hint={t("more.suppliesHint")} />
            </>
          )}
          <Item href="/profile" icon={<UserRound className="size-5" />} title={t("more.profile")} hint={t("more.profileHint")} />
        </Card>
      </Page>
    </>
  );
}
