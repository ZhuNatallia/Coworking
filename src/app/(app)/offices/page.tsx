import { Building2, Plus } from "lucide-react";
import { createCity } from "@/app/actions/admin";
import { ActionForm } from "@/components/action-form";
import { Card, EmptyState, inputClass, LinkButton, ListLink, Page, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/current";
import { loadRefs, myOfficeIds, shortAddress } from "@/lib/queries";

export default async function OfficesPage() {
  const user = await requireUser();
  const admin = user.role === "admin";
  const refs = await loadRefs();
  const allowed = await myOfficeIds(user);
  const offices = [...refs.offices.values()].filter((o) => allowed.has(o.id) && (admin || o.active));
  const cities = [...refs.cities.values()];

  return (
    <>
      <PageHeader title="Офисы" />
      <Page>
        {offices.length === 0 && !admin && <EmptyState>Вам пока не назначены офисы.</EmptyState>}
        {cities.map((city) => {
          const list = offices.filter((o) => o.city_id === city.id).sort((a, b) => a.name.localeCompare(b.name, "ru", { numeric: true }));
          if (!list.length && !admin) return null;
          return (
            <section key={city.id} className="flex flex-col gap-2">
              <h2 className="px-1 text-[15px] font-semibold">{city.name}</h2>
              {list.length === 0 ? (
                <EmptyState>В этом городе пока нет офисов.</EmptyState>
              ) : (
                <Card className="divide-y divide-line p-0">
                  {list.map((o) => (
                    <ListLink key={o.id} href={`/offices/${o.id}`}>
                      <div className="flex items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                          <Building2 className="size-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium">
                            {o.name}
                            {!o.active && <span className="ml-2 text-xs text-muted">отключён</span>}
                          </p>
                          <p className="truncate text-sm text-muted">{shortAddress(o.address) || "Адрес не указан"}</p>
                        </div>
                      </div>
                    </ListLink>
                  ))}
                </Card>
              )}
            </section>
          );
        })}

        {admin && (
          <>
            <LinkButton href="/offices/new">
              <Plus className="size-5" />
              Добавить офис
            </LinkButton>
            <Card>
              <ActionForm action={createCity} submitLabel="Добавить город" variant="outline" resetOnSuccess>
                <input name="name" placeholder="Новый город, например Nürnberg" className={inputClass} aria-label="Название города" />
              </ActionForm>
            </Card>
          </>
        )}
      </Page>
    </>
  );
}
