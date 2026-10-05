import { ScheduleForm } from "@/components/schedule-form";
import { Card, Page, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/current";
import { getI18n } from "@/lib/i18n/server";
import { loadRefs } from "@/lib/queries";

export default async function NewSchedulePage(props: PageProps<"/admin/schedule/new">) {
  await requireAdmin();
  const { t } = await getI18n();
  const { office } = await props.searchParams;
  const officeId = typeof office === "string" ? office : undefined;
  const refs = await loadRefs();

  return (
    <>
      <PageHeader title={t("schedule.newTitle")} back={officeId ? `/admin/schedule?office=${officeId}` : "/admin/schedule"} />
      <Page>
        <Card>
          <ScheduleForm refs={refs} officeId={officeId} />
        </Card>
      </Page>
    </>
  );
}
