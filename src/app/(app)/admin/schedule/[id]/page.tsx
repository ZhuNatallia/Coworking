import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteSchedule } from "@/app/actions/schedule";
import { ScheduleForm } from "@/components/schedule-form";
import { Card, FormMessage, Page, PageHeader, VisitBadge } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/current";
import { todayISO } from "@/lib/dates";
import { db } from "@/lib/db";
import { getI18n } from "@/lib/i18n/server";
import { loadRefs, officeLabel, visitPeople } from "@/lib/queries";

export default async function EditSchedulePage(props: PageProps<"/admin/schedule/[id]">) {
  await requireAdmin();
  const { t, fmt } = await getI18n();
  const { id } = await props.params;
  const { created } = await props.searchParams;
  const store = db();
  const [schedule] = await store.select("schedules", { eq: { id } });
  if (!schedule) notFound();
  const refs = await loadRefs();
  const today = todayISO();
  const upcoming = (await store.select("visits", { eq: { schedule_id: id }, gte: { scheduled_date: today } }, [{ column: "scheduled_date" }])).slice(0, 6);

  return (
    <>
      <PageHeader title={t("schedule.title")} subtitle={officeLabel(refs, schedule.office_id)} back={`/admin/schedule?office=${schedule.office_id}`} />
      <Page>
        {typeof created === "string" && <FormMessage state={{ ok: t("schedule.created", { count: created }) }} />}
        <Card>
          <ScheduleForm refs={refs} schedule={schedule} />
        </Card>

        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-[15px] font-semibold">{t("schedule.upcoming")}</h2>
          {upcoming.length === 0 ? (
            <p className="px-1 text-sm text-muted">{t("schedule.noUpcoming")}</p>
          ) : (
            <Card className="divide-y divide-line p-0">
              {upcoming.map((v) => (
                <Link key={v.id} href={`/visits/${v.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-canvas">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {fmt.weekdayDayMonth(v.scheduled_date)}
                      {v.time && `, ${v.time}`}
                    </p>
                    <p className="text-sm text-muted">
                      {visitPeople(refs, v, t)}
                      {v.is_override && ` · ${t("schedule.overridden")}`}
                    </p>
                  </div>
                  <VisitBadge status={v.status} date={v.scheduled_date} today={today} />
                </Link>
              ))}
            </Card>
          )}
        </section>

        <form action={deleteSchedule}>
          <input type="hidden" name="id" value={schedule.id} />
          <button type="submit" className="w-full py-3 text-sm font-medium text-danger-700">
            {t("schedule.delete")}
          </button>
          <p className="text-center text-xs text-muted">{t("schedule.deleteHint")}</p>
        </form>
      </Page>
    </>
  );
}
