import { ActionForm } from "@/components/action-form";
import { Field, inputClass } from "@/components/ui";
import { getI18n } from "@/lib/i18n/server";
import { isOfficeColor, OFFICE_COLOR_KEYS, officeColorVars } from "@/lib/office-colors";
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
      <Field label={t("office.city")} hint={t("office.cityHint")}>
        <input
          name="city"
          list="office-cities"
          defaultValue={cities.find((c) => c.id === (office?.city_id ?? defaultCityId))?.name ?? ""}
          placeholder={t("offices.cityPlaceholder")}
          required
          className={inputClass}
        />
        <datalist id="office-cities">
          {cities.map((c) => (
            <option key={c.id} value={c.name} />
          ))}
        </datalist>
      </Field>
      <Field label={t("office.name")}>
        <input name="name" defaultValue={office?.name} placeholder="The Orange Loft" required className={inputClass} />
      </Field>
      <Field label={t("office.address")}>
        <input name="address" defaultValue={office?.address} placeholder="Marktplatz 10, 87616 Marktoberdorf" className={inputClass} />
      </Field>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-medium text-muted">{t("office.color")}</legend>
        <div className="grid grid-cols-7 gap-2">
          <ColorOption value="" label={t("office.colorNone")} checked={!isOfficeColor(office?.color)} />
          {OFFICE_COLOR_KEYS.map((c) => (
            <ColorOption key={c} value={c} label={t(`office.colors.${c}`)} checked={office?.color === c} />
          ))}
        </div>
        <p className="text-sm text-muted">{t("office.colorHint")}</p>
      </fieldset>
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

function ColorOption({ value, label, checked }: { value: string; label: string; checked: boolean }) {
  return (
    <label title={label} className="cursor-pointer" style={officeColorVars(value)}>
      <input type="radio" name="color" value={value} defaultChecked={checked} className="peer sr-only" />
      <span className="sr-only">{label}</span>
      <span
        aria-hidden
        className={`flex aspect-square w-full items-center justify-center rounded-full border border-black/10 ring-offset-2 transition peer-checked:ring-2 peer-checked:ring-ink peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500 ${
          value ? "bg-office" : "bg-surface text-muted"
        }`}
      >
        {!value && <span className="block h-0.5 w-5 rotate-45 rounded bg-current" />}
      </span>
    </label>
  );
}
