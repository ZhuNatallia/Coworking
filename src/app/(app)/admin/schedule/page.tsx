import { Plus } from "lucide-react";
import { Card, cx, EmptyState, ListLink, LinkButton, Page, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/current";
import { WEEKDAY_EVERY } from "@/lib/dates";
import { db } from "@/lib/db";
import { loadRefs, officeLabel, scheduleSummary } from "@/lib/queries";

export default async function SchedulePage(props: PageProps<"/admin/schedule">) {
  await requireAdmin();
  const { office } = await props.searchParams;
  const officeId = typeof office === "string" ? office : undefined;
  const refs = await loadRefs();
  const schedules = await db().select("schedules", officeId ? { eq: { office_id: officeId } } : {}, [{ column: "weekday" }, { column: "time" }]);
  const sorted = [...schedules].sort(
    (a, b) => Number(b.active) - Number(a.active) || officeLabel(refs, a.office_id).localeCompare(officeLabel(refs, b.office_id)),
  );
  const title = officeId && refs.offices.has(officeId) ? officeLabel(refs, officeId) : "Все офисы";

  return (
    <>
      <PageHeader title="Расписание" subtitle={title} back={officeId ? `/offices/${officeId}` : "/more"} />
      <Page>
        {sorted.length === 0 ? (
          <EmptyState>Расписание ещё не задано.</EmptyState>
        ) : (
          <Card className="divide-y divide-line p-0">
            {sorted.map((s) => (
              <ListLink key={s.id} href={`/admin/schedule/${s.id}`} className={cx(!s.active && "opacity-60")}>
                {!officeId && <p className="font-semibold">{officeLabel(refs, s.office_id)}</p>}
                <p className={cx(officeId && "font-semibold")}>
                  {WEEKDAY_EVERY[s.weekday - 1]}
                  {s.time && `, ${s.time}`}
                  {!s.active && " · выключено"}
                </p>
                <p className="text-sm text-muted">{scheduleSummary(s, refs)}</p>
              </ListLink>
            ))}
          </Card>
        )}
        <LinkButton href={officeId ? `/admin/schedule/new?office=${officeId}` : "/admin/schedule/new"}>
          <Plus className="size-5" />
          Добавить расписание
        </LinkButton>
      </Page>
    </>
  );
}
