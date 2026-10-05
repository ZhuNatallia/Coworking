import Link from "next/link";
import { BellRing, CalendarCheck, ChevronDown, Package } from "lucide-react";
import { TakePreview } from "@/components/take-preview";
import { Avatar, Card, EmptyState, Page, PageHeader, SectionTitle } from "@/components/ui";
import { VisitCard } from "@/components/visit-card";
import { requireUser } from "@/lib/auth/current";
import { addDays, formatDateLong, formatWeekdayDayMonth, todayISO } from "@/lib/dates";
import { ensureVisitsGenerated } from "@/lib/domain/schedule";
import { quantityLabel } from "@/lib/labels";
import { canWorkOnVisit, isMyVisit, loadRefs, officeLabel, takeItems, visitsInRange, type TakeItem } from "@/lib/queries";
import type { Profile } from "@/lib/types";

export default async function HomePage() {
  const user = await requireUser();
  await ensureVisitsGenerated();
  return user.role === "admin" ? <AdminHome user={user} /> : <EmployeeHome user={user} />;
}

function HeaderAvatar({ user }: { user: Profile }) {
  return (
    <Link href="/profile" aria-label="Профиль">
      <Avatar name={user.name} size={40} />
    </Link>
  );
}

async function EmployeeHome({ user }: { user: Profile }) {
  const today = todayISO();
  const refs = await loadRefs();
  const [todays, upcoming, allTake] = await Promise.all([
    visitsInRange(user, today, today),
    visitsInRange(user, addDays(today, 1), addDays(today, 14)),
    takeItems(user, { status: "open" }),
  ]);
  const soonOffices = new Set([...todays, ...upcoming.filter((v) => v.scheduled_date <= addDays(today, 7))].map((v) => v.office_id));
  const take = allTake.filter((i) => soonOffices.has(i.request.office_id));
  const next = upcoming.find((v) => v.status === "planned");

  return (
    <>
      <PageHeader title="Сегодня" subtitle={formatWeekdayDayMonth(today)} action={<HeaderAvatar user={user} />} />
      <Page>
        <section className="flex flex-col gap-2">
          <SectionTitle icon={<CalendarCheck className="size-5" />}>Сегодняшние визиты</SectionTitle>
          {todays.length === 0 ? (
            <EmptyState>Сегодня визитов нет.</EmptyState>
          ) : (
            todays.map((v) => <VisitCard key={v.id} visit={v} refs={refs} today={today} canWork />)
          )}
        </section>

        {next && <Reminder dateLabel={next.scheduled_date === addDays(today, 1) ? "Завтра" : formatDateLong(next.scheduled_date)} office={officeLabel(refs, next.office_id)} items={allTake.filter((i) => i.request.office_id === next.office_id)} href={`/visits/${next.id}`} />}

        <TakePreview items={take} />
      </Page>
    </>
  );
}

function Reminder({ dateLabel, office, items, href }: { dateLabel: string; office: string; items: TakeItem[]; href: string }) {
  return (
    <Link href={href}>
      <Card className="flex gap-3 border-brand-200 bg-brand-50">
        <BellRing className="mt-0.5 size-5 shrink-0 text-brand-600" />
        <div className="text-sm">
          <p className="font-semibold text-brand-800">
            {dateLabel} обслуживание {office}
          </p>
          {items.length > 0 && (
            <p className="mt-1 text-brand-800/80">Не забудьте взять: {items.map((i) => i.supply.name.toLowerCase()).join("; ")}</p>
          )}
        </div>
      </Card>
    </Link>
  );
}

async function AdminHome({ user }: { user: Profile }) {
  const today = todayISO();
  const refs = await loadRefs();
  const [todays, take] = await Promise.all([visitsInRange(user, today, today), takeItems(user, { status: "open" })]);
  const mine = todays.filter((v) => isMyVisit(user, v));
  const others = todays.filter((v) => !isMyVisit(user, v));
  const stats = {
    total: todays.length,
    done: todays.filter((v) => v.status === "done").length,
    progress: todays.filter((v) => v.status === "in_progress").length,
  };
  const notDone = stats.total - stats.done - stats.progress;

  const bySupply = new Map<string, TakeItem[]>();
  for (const item of take) bySupply.set(item.supply.id, [...(bySupply.get(item.supply.id) ?? []), item]);
  const needed = [...bySupply.values()].sort((a, b) => b.length - a.length);

  return (
    <>
      <PageHeader title="Добро пожаловать!" subtitle={formatWeekdayDayMonth(today)} action={<HeaderAvatar user={user} />} />
      <Page>
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Всего визитов" value={stats.total} tone="bg-white" />
          <Stat label="Выполнено" value={stats.done} tone="bg-brand-50 text-brand-700" />
          <Stat label="В процессе" value={stats.progress} tone="bg-warn-50 text-warn-700" />
          <Stat label="Не выполнено" value={notDone} tone="bg-danger-50 text-danger-700" />
        </div>

        {mine.length > 0 && (
          <section className="flex flex-col gap-2">
            <SectionTitle icon={<CalendarCheck className="size-5" />}>Мои визиты сегодня</SectionTitle>
            {mine.map((v) => (
              <VisitCard key={v.id} visit={v} refs={refs} today={today} canWork />
            ))}
          </section>
        )}

        <section className="flex flex-col gap-2">
          <SectionTitle
            icon={<Package className="size-5" />}
            action={
              <Link href="/take" className="text-sm font-medium text-brand-600">
                Весь список
              </Link>
            }
          >
            Требуются материалы
          </SectionTitle>
          {needed.length === 0 ? (
            <EmptyState>Все офисы обеспечены.</EmptyState>
          ) : (
            <Card className="divide-y divide-line p-0">
              {needed.map((items) => (
                <details key={items[0].supply.id} className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                    <span className={`size-2.5 rounded-full ${items.some((i) => i.request.reason === "out") ? "bg-danger-700" : "bg-warn-700"}`} />
                    <span className="flex-1 font-medium">{items[0].supply.name}</span>
                    <span className="text-sm text-muted">{officesCount(items.length)}</span>
                    <ChevronDown className="size-4 text-muted transition group-open:rotate-180" />
                  </summary>
                  <ul className="flex flex-col gap-2 px-4 pb-3 pl-9 text-sm">
                    {items.map((i) => (
                      <li key={i.request.id} className="flex justify-between gap-2">
                        <span>
                          <span className="text-muted">{i.cityName} → </span>
                          {refs.offices.get(i.request.office_id)?.name}
                        </span>
                        <span className={i.request.reason === "out" ? "text-danger-700" : "text-warn-700"}>
                          {i.request.reason === "out" ? "нет" : `осталось ${quantityLabel(i.request.quantity, i.supply.unit) ?? "мало"}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </Card>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <SectionTitle icon={<CalendarCheck className="size-5" />}>Все визиты сегодня</SectionTitle>
          {others.length === 0 ? (
            <EmptyState>{mine.length ? "Других визитов сегодня нет." : "Сегодня визитов нет."}</EmptyState>
          ) : (
            others.map((v) => <VisitCard key={v.id} visit={v} refs={refs} today={today} canWork={canWorkOnVisit(user, v)} />)
          )}
        </section>
      </Page>
    </>
  );
}

function officesCount(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  const word = mod10 === 1 && mod100 !== 11 ? "офис" : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? "офиса" : "офисов";
  return `${n} ${word}`;
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`rounded-2xl border border-line p-4 ${tone}`}>
      <p className="text-sm opacity-80">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
    </div>
  );
}
