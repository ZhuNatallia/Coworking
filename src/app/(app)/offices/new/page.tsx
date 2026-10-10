import { createOffice } from "@/app/actions/admin";
import { OfficeForm } from "@/components/office-form";
import { Card, Page, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/current";
import { getI18n } from "@/lib/i18n/server";
import { loadRefs } from "@/lib/queries";

export default async function NewOfficePage() {
  await requireAdmin();
  const { t } = await getI18n();
  const cities = [...(await loadRefs()).cities.values()];
  return (
    <>
      <PageHeader title={t("offices.newTitle")} back="/" />
      <Page>
        <Card>
          <OfficeForm action={createOffice} cities={cities} />
        </Card>
        <p className="px-1 text-sm text-muted">{t("offices.newHint")}</p>
      </Page>
    </>
  );
}
