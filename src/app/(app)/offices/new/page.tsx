import { createOffice } from "@/app/actions/admin";
import { OfficeForm } from "@/components/office-form";
import { Card, EmptyState, Page, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/current";
import { loadRefs } from "@/lib/queries";

export default async function NewOfficePage() {
  await requireAdmin();
  const cities = [...(await loadRefs()).cities.values()];
  return (
    <>
      <PageHeader title="Новый офис" back="/offices" />
      <Page>
        {cities.length === 0 ? (
          <EmptyState>Сначала добавьте город на странице «Офисы».</EmptyState>
        ) : (
          <Card>
            <OfficeForm action={createOffice} cities={cities} />
          </Card>
        )}
        <p className="px-1 text-sm text-muted">Новый офис получит базовый чек-лист и все активные расходные материалы. Их можно изменить в карточке офиса.</p>
      </Page>
    </>
  );
}
