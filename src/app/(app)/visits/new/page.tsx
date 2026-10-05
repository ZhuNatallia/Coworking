import { Card, Page, PageHeader } from "@/components/ui";
import { VisitForm } from "@/components/visit-form";
import { requireAdmin } from "@/lib/auth/current";
import { isValidISODate, todayISO } from "@/lib/dates";
import { getI18n } from "@/lib/i18n/server";
import { loadRefs } from "@/lib/queries";

export default async function NewVisitPage(props: PageProps<"/visits/new">) {
  await requireAdmin();
  const { t } = await getI18n();
  const { date, office } = await props.searchParams;
  const refs = await loadRefs();
  const day = isValidISODate(date) ? date : todayISO();

  return (
    <>
      <PageHeader title={t("visitForm.newTitle")} back={`/calendar?view=day&date=${day}`} />
      <Page>
        <p className="text-sm text-muted">{t("visitForm.newHint")}</p>
        <Card>
          <VisitForm refs={refs} date={day} officeId={typeof office === "string" ? office : undefined} />
        </Card>
      </Page>
    </>
  );
}
