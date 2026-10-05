import { ActionForm } from "@/components/action-form";
import { Field, inputClass } from "@/components/ui";
import { getI18n } from "@/lib/i18n/server";
import type { City, Office } from "@/lib/types";
import type { FormState } from "@/app/actions/auth";

export async function OfficeForm({
  action,
  cities,
  office,
  defaultCityId,
}: {
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  cities: City[];
  office?: Office;
  defaultCityId?: string;
}) {
  const { t } = await getI18n();
  return (
    <ActionForm action={action} submitLabel={t(office ? "common.save" : "office.create")}>
      {office && <input type="hidden" name="id" value={office.id} />}
      <Field label={t("office.city")}>
        <select name="city_id" defaultValue={office?.city_id ?? defaultCityId ?? cities[0]?.id} className={inputClass} required>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("office.name")}>
        <input name="name" defaultValue={office?.name} placeholder="Office 4" required className={inputClass} />
      </Field>
      <Field label={t("office.address")}>
        <input name="address" defaultValue={office?.address} placeholder="Musterstraße 10, 80331 München" className={inputClass} />
      </Field>
      <Field label={t("office.contact")}>
        <input name="contact_name" defaultValue={office?.contact_name ?? ""} className={inputClass} />
      </Field>
      <Field label={t("office.phone")}>
        <input name="contact_phone" type="tel" defaultValue={office?.contact_phone ?? ""} className={inputClass} />
      </Field>
      <Field label={t("office.notes")} hint={t("office.notesHint")}>
        <textarea name="notes" rows={3} defaultValue={office?.notes ?? ""} className={`${inputClass} py-3`} />
      </Field>
      {office && (
        <label className="flex min-h-12 items-center gap-3">
          <input type="checkbox" name="active" defaultChecked={office.active} className="size-6 accent-brand-600" />
          <span>{t("office.active")}</span>
        </label>
      )}
    </ActionForm>
  );
}
