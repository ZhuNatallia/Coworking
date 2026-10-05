import { Boxes, CalendarClock, CalendarDays, History, ShoppingBag, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { Card, ListLink, Page, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/current";

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
  const admin = user.role === "admin";
  return (
    <>
      <PageHeader title="Ещё" />
      <Page>
        <Card className="divide-y divide-line p-0">
          {admin && <Item href="/take" icon={<ShoppingBag className="size-5" />} title="Взять с собой" hint="Что привезти в офисы" />}
          {!admin && <Item href="/calendar" icon={<CalendarDays className="size-5" />} title="Календарь" hint="Мои визиты" />}
          <Item href="/history" icon={<History className="size-5" />} title="История" hint="Прошлые визиты и отчёты" />
          {admin && (
            <>
              <Item href="/admin/schedule" icon={<CalendarClock className="size-5" />} title="Расписание" hint="Регулярные визиты по офисам" />
              <Item href="/admin/supplies" icon={<Boxes className="size-5" />} title="Расходные материалы" hint="Список материалов и единицы" />
            </>
          )}
          <Item href="/profile" icon={<UserRound className="size-5" />} title="Профиль" hint="Имя, пароль, установка на телефон" />
        </Card>
      </Page>
    </>
  );
}
