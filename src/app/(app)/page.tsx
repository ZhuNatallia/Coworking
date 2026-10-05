import Link from "next/link";
import { BellRing, CalendarCheck, ChevronDown, Package } from "lucide-react";
import { TakePreview } from "@/components/take-preview";
import { Avatar, Card, EmptyState, Page, PageHeader, SectionTitle } from "@/components/ui";
import { VisitCard } from "@/components/visit-card";
import { requireUser } from "@/lib/auth/current";
import { addDays, todayISO } from "@/lib/dates";
import { ensureVisitsGenerated } from "@/lib/domain/schedule";
import { getI18n } from "@/lib/i18n/server";
import { canWorkOnVisit, isMyVisit, loadRefs, officeLabel, takeItems, visitsInRange, type TakeItem } from "@/lib/queries";
import type { Profile } from "@/lib/types";

export default async function HomePage() {
  const user = await requireUser();
  await ensureVisitsGenerated();
  return user.role === "admin" ? <AdminHome user={user} /> : <EmployeeHome user={user} />;
}

async function HeaderAvatar({ user }: { user: Profile }) {
  const { t } = await getI18n();
  return (
    <Link href="/profile" aria-label={t("home.profile")}>
      <Avatar name={user.name} size={40} />
    </Link>
  );
}

async function EmployeeHome({ user }: { user: Profile }) {
  const today = todayISO();
  const { t, fmt } = await getI18n();
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
      <PageHeader title={t("home.title")} subtitle={fmt.weekdayDayMonth(today)} action={<HeaderAvatar user={user} />} />
      <Page>
        <section className="flex flex-col gap-2">
          <SectionTitle icon={<CalendarCheck className="size-5" />}>{t("home.todaysVisits")}</SectionTitle>
          {todays.length === 0 ? (
            <EmptyState>{t("home.noVisitsToday")}</EmptyState>
          ) : (
            todays.map((v) => <VisitCard key={v.id} visit={v} refs={refs} today={today} canWork />)
          )}
        </section>

        {next && (
          <Reminder
            dateLabel={next.scheduled_date === addDays(today, 1) ? t("home.tomorrow") : fmt.dateLong(next.scheduled_date)}
            office={officeLabel(refs, next.office_id)}
            items={allTake.filter((i) => i.request.office_id === next.office_id)}
            href={`/visits/${next.id}`}
          />
        )}

        <TakePreview items={take} />
      </Page>
    </>
  );
}

async function Reminder({ dateLabel, office, items, href }: { dateLabel: string; office: string; items: TakeItem[]; href: string }) {
  const { t, locale } = await getI18n();
  const names = items.map((i) => (locale === "ru" ? i.supply.name.toLowerCase() : i.supply.name));
  return (
    <Link href={href}>
      <Card className="flex gap-3 border-brand-200 bg-brand-50">
        <BellRing className="mt-0.5 size-5 shrink-0 text-brand-600" />
        <div className="text-sm">
          <p className="font-semibold text-brand-800">{t("home.reminder", { date: dateLabel, office })}</p>
          {items.length > 0 && <p className="mt-1 text-brand-800/80">{t("home.dontForget", { items: names.join("; ") })}</p>}
        </div>
      </Card>
    </Link>
  );
}

async function AdminHome({ user }: { user: Profile }) {
  const today = todayISO();
  const { t, fmt } = await getI18n();
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
      <PageHeader title={t("home.adminTitle")} subtitle={fmt.weekdayDayMonth(today)} action={<HeaderAvatar user={user} />} />
      <Page>
        <div className="grid grid-cols-2 gap-3">
          <Stat label={t("home.statTotal")} value={stats.total} tone="bg-white" />
          <Stat label={t("home.statDone")} value={stats.done} tone="bg-brand-50 text-brand-700" />
          <Stat label={t("home.statProgress")} value={stats.progress} tone="bg-warn-50 text-warn-700" />
          <Stat label={t("home.statNotDone")} value={notDone} tone="bg-danger-50 text-danger-700" />
        </div>

        {mine.length > 0 && (
          <section className="flex flex-col gap-2">
            <SectionTitle icon={<CalendarCheck className="size-5" />}>{t("home.myVisits")}</SectionTitle>
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
                {t("home.fullList")}
              </Link>
            }
          >
            {t("home.suppliesNeeded")}
          </SectionTitle>
          {needed.length === 0 ? (
            <EmptyState>{t("home.allStocked")}</EmptyState>
          ) : (
            <Card className="divide-y divide-line p-0">
              {needed.map((items) => (
                <details key={items[0].supply.id} className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                    <span className={`size-2.5 rounded-full ${items.some((i) => i.request.reason === "out") ? "bg-danger-700" : "bg-warn-700"}`} />
                    <span className="flex-1 font-medium">{items[0].supply.name}</span>
                    <span className="text-sm text-muted">{t("home.officesCount", { count: items.length })}</span>
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
                          {i.request.reason === "out"
                            ? t("home.none")
                            : t("home.left", { qty: fmt.quantity(i.request.quantity, i.supply.unit) ?? t("home.little") })}
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
          <SectionTitle icon={<CalendarCheck className="size-5" />}>{t("home.allVisits")}</SectionTitle>
          {others.length === 0 ? (
            <EmptyState>{t(mine.length ? "home.noOtherVisits" : "home.noVisitsToday")}</EmptyState>
          ) : (
            others.map((v) => <VisitCard key={v.id} visit={v} refs={refs} today={today} canWork={canWorkOnVisit(user, v)} />)
          )}
        </section>
      </Page>
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`rounded-2xl border border-line p-4 ${tone}`}>
      <p className="text-sm opacity-80">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
    </div>
  );
}
