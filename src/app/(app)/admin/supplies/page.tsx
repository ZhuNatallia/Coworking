import { createSupply, updateSupply } from "@/app/actions/admin";
import { ActionForm } from "@/components/action-form";
import { Card, Field, inputClass, Page, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/current";
import { db } from "@/lib/db";
import { SUPPLY_CATEGORY_LABEL, UNIT_LABEL, UNIT_NAME } from "@/lib/labels";
import type { Supply, SupplyCategory, SupplyUnit } from "@/lib/types";

function SupplyFields({ supply }: { supply?: Supply }) {
  return (
    <>
      <Field label="Название">
        <input name="name" defaultValue={supply?.name} required className={inputClass} placeholder="Например: Салфетки" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Единица">
          <select name="unit" defaultValue={supply?.unit ?? "pcs"} className={inputClass}>
            {(Object.keys(UNIT_NAME) as SupplyUnit[]).map((u) => (
              <option key={u} value={u}>
                {UNIT_NAME[u]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Раздел чек-листа">
          <select name="category" defaultValue={supply?.category ?? "kitchen"} className={inputClass}>
            {(Object.keys(SUPPLY_CATEGORY_LABEL) as SupplyCategory[]).map((c) => (
              <option key={c} value={c}>
                {SUPPLY_CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </>
  );
}

export default async function SuppliesPage() {
  await requireAdmin();
  const supplies = await db().select("supplies", {}, [{ column: "sort_order" }, { column: "name" }]);
  return (
    <>
      <PageHeader title="Расходные материалы" back="/more" />
      <Page>
        <Card className="divide-y divide-line p-0">
          {supplies.map((s) => (
            <details key={s.id} className="group">
              <summary className={`flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden ${s.active ? "" : "opacity-55"}`}>
                <span className="flex-1 font-medium">{s.name}</span>
                <span className="text-sm text-muted">
                  {SUPPLY_CATEGORY_LABEL[s.category]} · {UNIT_LABEL[s.unit]}
                  {!s.active && " · отключён"}
                </span>
              </summary>
              <div className="px-4 pb-4">
                <ActionForm action={updateSupply} submitLabel="Сохранить">
                  <input type="hidden" name="id" value={s.id} />
                  <SupplyFields supply={s} />
                  <label className="flex min-h-11 items-center gap-3">
                    <input type="checkbox" name="active" defaultChecked={s.active} className="size-6 accent-brand-600" />
                    Используется
                  </label>
                </ActionForm>
              </div>
            </details>
          ))}
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">Новый материал</h2>
          <ActionForm action={createSupply} submitLabel="Добавить" resetOnSuccess>
            <SupplyFields />
          </ActionForm>
        </Card>
        <p className="px-1 text-sm text-muted">Чтобы материал проверяли в офисе, добавьте его на вкладке «Расходники» в карточке офиса.</p>
      </Page>
    </>
  );
}
