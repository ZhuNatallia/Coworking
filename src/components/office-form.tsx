import { ActionForm } from "@/components/action-form";
import { Field, inputClass } from "@/components/ui";
import type { City, Office } from "@/lib/types";
import type { FormState } from "@/app/actions/auth";

export function OfficeForm({
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
  return (
    <ActionForm action={action} submitLabel={office ? "Сохранить" : "Создать офис"}>
      {office && <input type="hidden" name="id" value={office.id} />}
      <Field label="Город">
        <select name="city_id" defaultValue={office?.city_id ?? defaultCityId ?? cities[0]?.id} className={inputClass} required>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Название">
        <input name="name" defaultValue={office?.name} placeholder="Office 4" required className={inputClass} />
      </Field>
      <Field label="Адрес">
        <input name="address" defaultValue={office?.address} placeholder="Musterstraße 10, 80331 München" className={inputClass} />
      </Field>
      <Field label="Контактное лицо">
        <input name="contact_name" defaultValue={office?.contact_name ?? ""} className={inputClass} />
      </Field>
      <Field label="Телефон">
        <input name="contact_phone" type="tel" defaultValue={office?.contact_phone ?? ""} className={inputClass} />
      </Field>
      <Field label="Комментарий" hint="Например: вход со двора, код от двери">
        <textarea name="notes" rows={3} defaultValue={office?.notes ?? ""} className={`${inputClass} py-3`} />
      </Field>
      {office && (
        <label className="flex min-h-12 items-center gap-3">
          <input type="checkbox" name="active" defaultChecked={office.active} className="size-6 accent-brand-600" />
          <span>Офис активен</span>
        </label>
      )}
    </ActionForm>
  );
}
