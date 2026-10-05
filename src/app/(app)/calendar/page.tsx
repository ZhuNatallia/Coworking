import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Tabs } from "@/components/tabs";
import { Card, cx, displayVisitStatus, EmptyState, Page, PageHeader, VisitBadge } from "@/components/ui";
import { VisitCard } from "@/components/visit-card";
import { requireUser } from "@/lib/auth/current";
import { addDays, addMonths, endOfMonth, isValidISODate, startOfMonth, startOfWeek, todayISO } from "@/lib/dates";
import type { I18n } from "@/lib/i18n/core";
import { getI18n } from "@/lib/i18n/server";
import { canWorkOnVisit, loadRefs, visitPeople, visitsInRange, type Refs } from "@/lib/queries";
import type { Profile, Visit, VisitStatus } from "@/lib/types";

const VIEWS = ["day", "week", "month"] as const;
type View = (typeof VIEWS)[number];

const DOT: Record<VisitStatus, string> = {
  planned: "bg-brand-600",
  in_progress: "bg-warn-700",
  done: "bg-muted/70",
  skipped: "bg-danger-700",
};

const WEEK = [1, 2, 3, 4, 5, 6, 7];

function href(view: View, date: string) {
  return `/calendar?view=${view}&date=${date}`;
}

function range(view: View, date: string, { fmt }: I18n): { from: string; to: string; prev: string; next: string; title: string } {
  if (view === "day") {
    return { from: date, to: date, prev: addDays(date, -1), next: addDays(date, 1), title: fmt.weekdayDayMonth(date) };
  }
  if (view === "week") {
    const from = startOfWeek(date);
    const to = addDays(from, 6);
    return { from, to, prev: addDays(from, -7), next: addDays(from, 7), title: `${fmt.dayMonth(from)} — ${fmt.dayMonth(to)}` };
  }
  const from = startOfMonth(date);
  return { from, to: endOfMonth(date), prev: addMonths(date, -1), next: addMonths(date, 1), title: fmt.monthYear(date) };
}

export default async function CalendarPage(props: PageProps<"/calendar">) {
  const user = await requireUser();
  const i18n = await getI18n();
  const { t } = i18n;
  const sp = await props.searchParams;
  const view: View = VIEWS.find((v) => v === sp.view) ?? "week";
  const today = todayISO();
  const date = isValidISODate(sp.date) ? sp.date : today;
  const r = range(view, date, i18n);
  const refs = await loadRefs();
  const visits = await visitsInRange(user, view === "month" ? startOfWeek(r.from) : r.from, view === "month" ? addDays(startOfWeek(r.to), 6) : r.to);
  const admin = user.role === "admin";

  return (
    <>
      <PageHeader
        title={t("calendar.title")}
        subtitle={t(admin ? "calendar.allVisits" : "calendar.myVisits")}
        action={
          admin && (
            <Link
              href={`/visits/new?date=${view === "day" ? date : today}`}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 text-sm font-semibold text-white"
            >
              <Plus className="size-4" />
              {t("calendar.newVisit")}
            </Link>
          )
        }
      />
      <Page>
        <Tabs
          active={view}
          tabs={[
            { key: "day", label: t("calendar.day"), href: href("day", date) },
            { key: "week", label: t("calendar.week"), href: href("week", date) },
            { key: "month", label: t("calendar.month"), href: href("month", date) },
          ]}
        />
        <div className="flex items-center gap-2">
          <Link href={href(view, r.prev)} aria-label={t("common.back")} className="flex size-10 items-center justify-center rounded-full bg-white shadow-[inset_0_0_0_1px_var(--color-line)]">
            <ChevronLeft className="size-5" />
          </Link>
          <p className="flex-1 text-center font-semibold">{r.title}</p>
          <Link href={href(view, r.next)} aria-label={t("common.forward")} className="flex size-10 items-center justify-center rounded-full bg-white shadow-[inset_0_0_0_1px_var(--color-line)]">
            <ChevronRight className="size-5" />
          </Link>
        </div>
        {(today < r.from || today > r.to) && (
          <Link href={href(view, today)} className="-mt-2 self-center text-sm font-medium text-brand-600">
            {t("calendar.backToToday")}
          </Link>
        )}

        {view === "day" && <DayView visits={visits} refs={refs} today={today} user={user} i18n={i18n} />}
        {view === "week" && <WeekView from={r.from} visits={visits} refs={refs} today={today} i18n={i18n} />}
        {view === "month" && <MonthView month={r.from} visits={visits} today={today} i18n={i18n} />}
      </Page>
    </>
  );
}

function DayView({ visits, refs, today, user, i18n }: { visits: Visit[]; refs: Refs; today: string; user: Profile; i18n: I18n }) {
  if (!visits.length) return <EmptyState>{i18n.t("calendar.noVisitsDay")}</EmptyState>;
  return (
    <>
      {visits.map((v) => (
        <VisitCard key={v.id} visit={v} refs={refs} today={today} canWork={canWorkOnVisit(user, v)} />
      ))}
    </>
  );
}

function WeekView({ from, visits, refs, today, i18n: { t, fmt } }: { from: string; visits: Visit[]; refs: Refs; today: string; i18n: I18n }) {
  const days = WEEK.map((_, i) => addDays(from, i));
  return (
    <Card className="divide-y divide-line p-0">
      {days.map((d, i) => {
        const list = visits.filter((v) => v.scheduled_date === d);
        const isToday = d === today;
        return (
          <div key={d} className="flex gap-3 px-3 py-3">
            <Link
              href={href("day", d)}
              className={cx(
                "flex w-12 shrink-0 flex-col items-center justify-center self-start rounded-xl py-1.5",
                isToday ? "bg-brand-600 text-white" : "bg-canvas text-ink",
              )}
            >
              <span className={cx("text-xs", isToday ? "text-white/80" : "text-muted")}>{fmt.weekdayShort(i + 1)}</span>
              <span className="text-lg font-semibold leading-tight">{Number(d.slice(8))}</span>
            </Link>
            <div className="flex min-w-0 flex-1 flex-col gap-2 self-center">
              {list.length === 0 && <p className="text-sm text-muted">{t("calendar.noVisits")}</p>}
              {list.map((v) => {
                const office = refs.offices.get(v.office_id);
                const status = displayVisitStatus(v.status, v.scheduled_date, today);
                return (
                  <Link key={v.id} href={`/visits/${v.id}`} className="flex items-center gap-2 rounded-xl bg-canvas px-3 py-2 active:bg-line">
                    <span className={cx("size-2 shrink-0 rounded-full", DOT[status.tone])} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium">
                        {office?.name ?? t("common.office")}
                        <span className="font-normal text-muted"> · {office ? refs.cities.get(office.city_id)?.name : ""}</span>
                      </p>
                      <p className="truncate text-sm text-muted">
                        {v.time && `${v.time} · `}
                        {visitPeople(refs, v, t)}
                      </p>
                    </div>
                    {status.tone !== "planned" && <VisitBadge status={v.status} date={v.scheduled_date} today={today} />}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </Card>
  );
}

function MonthView({ month, visits, today, i18n: { t, fmt } }: { month: string; visits: Visit[]; today: string; i18n: I18n }) {
  const first = startOfWeek(month);
  const last = addDays(startOfWeek(endOfMonth(month)), 6);
  const days: string[] = [];
  for (let d = first; d <= last; d = addDays(d, 1)) days.push(d);
  const monthKey = month.slice(0, 7);

  return (
    <Card className="p-2">
      <div className="grid grid-cols-7 text-center text-xs font-medium text-muted">
        {WEEK.map((d) => (
          <span key={d} className="py-1.5">
            {fmt.weekdayShort(d)}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const list = visits.filter((v) => v.scheduled_date === d);
          const inMonth = d.slice(0, 7) === monthKey;
          const isToday = d === today;
          return (
            <Link
              key={d}
              href={href("day", d)}
              aria-label={t("calendar.dayVisits", { date: fmt.dayMonth(d), count: list.length })}
              className={cx(
                "flex aspect-square flex-col items-center justify-center gap-1 rounded-xl text-sm",
                isToday ? "bg-brand-600 font-semibold text-white" : list.length ? "bg-brand-50" : "",
                !inMonth && "opacity-40",
              )}
            >
              {Number(d.slice(8))}
              <span className="flex h-1.5 gap-0.5">
                {list.slice(0, 4).map((v) => (
                  <span
                    key={v.id}
                    className={cx("size-1.5 rounded-full", isToday ? "bg-white" : DOT[displayVisitStatus(v.status, v.scheduled_date, today).tone])}
                  />
                ))}
              </span>
            </Link>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 px-2 pb-1 text-xs text-muted">
        {(["planned", "in_progress", "done", "skipped"] as const).map((tone) => (
          <Legend key={tone} tone={tone} label={t(`visitStatus.${tone}`)} />
        ))}
      </div>
    </Card>
  );
}

function Legend({ tone, label }: { tone: VisitStatus; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cx("size-2 rounded-full", DOT[tone])} />
      {label}
    </span>
  );
}
