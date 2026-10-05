import { notFound } from "next/navigation";
import { updateOffice } from "@/app/actions/admin";
import { OfficeForm } from "@/components/office-form";
import { Card, Page, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/current";
import { getI18n } from "@/lib/i18n/server";
import { loadRefs } from "@/lib/queries";

export default async function EditOfficePage(props: PageProps<"/offices/[id]/edit">) {
  await requireAdmin();
  const { t } = await getI18n();
  const { id } = await props.params;
  const refs = await loadRefs();
  const office = refs.offices.get(id);
  if (!office) notFound();
  return (
    <>
      <PageHeader title={t("offices.editTitle")} back={`/offices/${id}`} />
      <Page>
        <Card>
          <OfficeForm action={updateOffice} cities={[...refs.cities.values()]} office={office} />
        </Card>
      </Page>
    </>
  );
}
