import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteSchedule } from "@/app/actions/schedule";
import { ScheduleForm } from "@/components/schedule-form";
import { Card, FormMessage, Page, PageHeader, VisitBadge } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/current";
import { formatWeekdayDayMonth, todayISO } from "@/lib/dates";
import { db } from "@/lib/db";
import { loadRefs, officeLabel, visitPeople } from "@/lib/queries";

export default async function EditSchedulePage(props: PageProps<"/admin/schedule/[id]">) {
  await requireAdmin();
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
      <PageHeader title="Расписание" subtitle={officeLabel(refs, schedule.office_id)} back={`/admin/schedule?office=${schedule.office_id}`} />
      <Page>
        {typeof created === "string" && <FormMessage state={{ ok: `Расписание создано. Запланировано визитов: ${created}.` }} />}
        <Card>
          <ScheduleForm refs={refs} schedule={schedule} />
        </Card>

        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-[15px] font-semibold">Ближайшие визиты</h2>
          {upcoming.length === 0 ? (
            <p className="px-1 text-sm text-muted">Нет запланированных визитов.</p>
          ) : (
            <Card className="divide-y divide-line p-0">
              {upcoming.map((v) => (
                <Link key={v.id} href={`/visits/${v.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-canvas">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {formatWeekdayDayMonth(v.scheduled_date)}
                      {v.time && `, ${v.time}`}
                    </p>
                    <p className="text-sm text-muted">
                      {visitPeople(refs, v)}
                      {v.is_override && " · изменён вручную"}
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
            Удалить расписание
          </button>
          <p className="text-center text-xs text-muted">Будущие запланированные визиты удалятся, история сохранится.</p>
        </form>
      </Page>
    </>
  );
}
