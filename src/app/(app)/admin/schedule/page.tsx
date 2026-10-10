import { Plus } from "lucide-react";
import { notFound } from "next/navigation";
import { Card, cx, EmptyState, ListLink, LinkButton, OfficeDot, Page, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/current";
import { db } from "@/lib/db";
import { getI18n } from "@/lib/i18n/server";
import { loadRefs, myOfficeIds, officeLabel, scheduleSummary } from "@/lib/queries";

export default async function SchedulePage(props: PageProps<"/admin/schedule">) {
  const user = await requireUser();
  const allowed = await myOfficeIds(user);
  const { t, fmt } = await getI18n();
  const { office } = await props.searchParams;
  const officeId = typeof office === "string" ? office : undefined;
  if (officeId && !allowed.has(officeId)) notFound();
  const refs = await loadRefs();
  const schedules = (await db().select("schedules", officeId ? { eq: { office_id: officeId } } : {}, [{ column: "weekday" }, { column: "time" }])).filter(
    (s) => allowed.has(s.office_id),
  );
  const sorted = [...schedules].sort(
    (a, b) => Number(b.active) - Number(a.active) || officeLabel(refs, a.office_id).localeCompare(officeLabel(refs, b.office_id)),
  );
  const title = officeId && refs.offices.has(officeId) ? officeLabel(refs, officeId) : t("schedule.allOffices");

  return (
    <>
      <PageHeader title={t("schedule.title")} subtitle={title} back={officeId ? `/offices/${officeId}` : "/more"} />
      <Page>
        {sorted.length === 0 ? (
          <EmptyState>{t("schedule.empty")}</EmptyState>
        ) : (
          <Card className="divide-y divide-line p-0">
            {sorted.map((s) => (
              <ListLink key={s.id} href={`/admin/schedule/${s.id}`} className={cx(!s.active && "opacity-60")}>
                {!officeId && (
                  <p className="flex items-center gap-2 font-semibold">
                    <OfficeDot color={refs.offices.get(s.office_id)?.color} />
                    {officeLabel(refs, s.office_id)}
                  </p>
                )}
                <p className={cx(officeId && "font-semibold")}>
                  {fmt.weekdayEvery(s.weekday)}
                  {s.time && `, ${s.time}`}
                  {!s.active && ` · ${t("schedule.off")}`}
                </p>
                <p className="text-sm text-muted">{scheduleSummary(s, refs, t)}</p>
              </ListLink>
            ))}
          </Card>
        )}
        <LinkButton href={officeId ? `/admin/schedule/new?office=${officeId}` : "/admin/schedule/new"}>
          <Plus className="size-5" />
          {t("schedule.add")}
        </LinkButton>
      </Page>
    </>
  );
}
