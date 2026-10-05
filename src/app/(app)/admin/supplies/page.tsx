import { createSupply, updateSupply } from "@/app/actions/admin";
import { ActionForm } from "@/components/action-form";
import { Card, Field, inputClass, Page, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/current";
import { db } from "@/lib/db";
import type { T } from "@/lib/i18n/core";
import { getI18n, getTranslator } from "@/lib/i18n/server";
import type { Supply, SupplyCategory, SupplyUnit } from "@/lib/types";

const UNITS: SupplyUnit[] = ["pcs", "pack", "roll", "bottle", "ream", "kg", "l"];
const CATEGORIES: SupplyCategory[] = ["kitchen", "bathroom", "office", "cleaning"];

/** The name field keeps the original wording; translations are only for reading. */
function SupplyFields({ supply, t }: { supply?: Supply; t: T }) {
  return (
    <>
      <Field label={t("supplies.name")}>
        <input name="name" defaultValue={supply?.name} required className={inputClass} placeholder={t("supplies.namePlaceholder")} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("supplies.unit")}>
          <select name="unit" defaultValue={supply?.unit ?? "pcs"} className={inputClass}>
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {t(`unitNames.${u}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("supplies.category")}>
          <select name="category" defaultValue={supply?.category ?? "kitchen"} className={inputClass}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`supplyCategory.${c}`)}
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
  const { t, fmt } = await getI18n();
  const supplies = await db().select("supplies", {}, [{ column: "sort_order" }, { column: "name" }]);
  const tr = await getTranslator(supplies.map((s) => s.name));
  return (
    <>
      <PageHeader title={t("supplies.title")} back="/more" />
      <Page>
        <Card className="divide-y divide-line p-0">
          {supplies.map((s) => (
            <details key={s.id} className="group">
              <summary className={`flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden ${s.active ? "" : "opacity-55"}`}>
                <span className="flex-1 font-medium">{tr(s.name)}</span>
                <span className="text-sm text-muted">
                  {t(`supplyCategory.${s.category}`)} · {fmt.unit(null, s.unit)}
                  {!s.active && ` · ${t("common.disabled")}`}
                </span>
              </summary>
              <div className="px-4 pb-4">
                <ActionForm action={updateSupply} submitLabel={t("common.save")}>
                  <input type="hidden" name="id" value={s.id} />
                  <SupplyFields supply={s} t={t} />
                  <label className="flex min-h-11 items-center gap-3">
                    <input type="checkbox" name="active" defaultChecked={s.active} className="size-6 accent-brand-600" />
                    {t("supplies.active")}
                  </label>
                </ActionForm>
              </div>
            </details>
          ))}
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">{t("supplies.new")}</h2>
          <ActionForm action={createSupply} submitLabel={t("common.add")} resetOnSuccess>
            <SupplyFields t={t} />
          </ActionForm>
        </Card>
        <p className="px-1 text-sm text-muted">{t("supplies.hint")}</p>
      </Page>
    </>
  );
}
