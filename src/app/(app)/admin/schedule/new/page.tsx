import { notFound } from "next/navigation";
import { ScheduleForm } from "@/components/schedule-form";
import { Card, EmptyState, Page, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/current";
import { getI18n } from "@/lib/i18n/server";
import { loadRefs, myOfficeIds } from "@/lib/queries";

export default async function NewSchedulePage(props: PageProps<"/admin/schedule/new">) {
  const user = await requireUser();
  const allowed = await myOfficeIds(user);
  const { t } = await getI18n();
  const { office } = await props.searchParams;
  const officeId = typeof office === "string" ? office : undefined;
  if (officeId && !allowed.has(officeId)) notFound();
  const refs = await loadRefs();

  return (
    <>
      <PageHeader title={t("schedule.newTitle")} back={officeId ? `/admin/schedule?office=${officeId}` : "/admin/schedule"} />
      <Page>
        {allowed.size === 0 ? (
          <EmptyState>{t("offices.noneAssigned")}</EmptyState>
        ) : (
          <Card>
            <ScheduleForm refs={refs} officeId={officeId} officeIds={allowed} defaultEmployeeId={user.id} />
          </Card>
        )}
      </Page>
    </>
  );
}
