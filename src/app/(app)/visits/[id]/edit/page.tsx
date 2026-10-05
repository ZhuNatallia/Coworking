import { notFound, redirect } from "next/navigation";
import { deleteVisit, resetVisitOverride } from "@/app/actions/schedule";
import { Card, Page, PageHeader } from "@/components/ui";
import { VisitForm } from "@/components/visit-form";
import { requireAdmin } from "@/lib/auth/current";
import { formatWeekdayDayMonth } from "@/lib/dates";
import { db } from "@/lib/db";
import { loadRefs, officeLabel } from "@/lib/queries";

export default async function EditVisitPage(props: PageProps<"/visits/[id]/edit">) {
  await requireAdmin();
  const { id } = await props.params;
  const [visit] = await db().select("visits", { eq: { id } });
  if (!visit) notFound();
  if (visit.status === "done" || visit.status === "in_progress") redirect(`/visits/${id}`);
  const refs = await loadRefs();

  return (
    <>
      <PageHeader title="Изменить визит" subtitle={officeLabel(refs, visit.office_id)} back={`/visits/${id}?tab=info`} />
      <Page>
        <p className="text-sm text-muted">
          {visit.schedule_id
            ? "Изменения касаются только этого визита. Регулярное расписание офиса останется прежним."
            : "Разовый визит вне расписания."}
        </p>
        <Card>
          <VisitForm refs={refs} visit={visit} />
        </Card>
        {visit.schedule_id && visit.is_override && visit.origin_date && (
          <form action={resetVisitOverride} className="flex flex-col gap-1">
            <input type="hidden" name="id" value={visit.id} />
            <button type="submit" className="w-full py-3 text-sm font-medium text-brand-600">
              Вернуть как в расписании
            </button>
            <p className="text-center text-xs text-muted">По расписанию: {formatWeekdayDayMonth(visit.origin_date)}</p>
          </form>
        )}
        {!visit.schedule_id && visit.status === "planned" && (
          <form action={deleteVisit}>
            <input type="hidden" name="id" value={visit.id} />
            <button type="submit" className="w-full py-3 text-sm font-medium text-danger-700">
              Удалить разовый визит
            </button>
          </form>
        )}
      </Page>
    </>
  );
}
