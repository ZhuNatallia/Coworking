import { createVisit, updateVisit } from "@/app/actions/schedule";
import { ActionForm } from "@/components/action-form";
import { Field, inputClass } from "@/components/ui";
import { getI18n } from "@/lib/i18n/server";
import { officeLabel, type Refs } from "@/lib/queries";
import type { Visit } from "@/lib/types";

export async function VisitForm({ refs, visit, date, officeId }: { refs: Refs; visit?: Visit; date?: string; officeId?: string }) {
  const { t } = await getI18n();
  const employees = [...refs.profiles.values()].filter((p) => p.active);
  const offices = [...refs.offices.values()].filter((o) => o.active).sort((a, b) => officeLabel(refs, a.id).localeCompare(officeLabel(refs, b.id)));
  const people = employees.map((p) => (
    <option key={p.id} value={p.id}>
      {p.name}
    </option>
  ));

  return (
    <ActionForm action={visit ? updateVisit : createVisit} submitLabel={t(visit ? "visitForm.saveOne" : "visitForm.create")}>
      {visit ? (
        <input type="hidden" name="id" value={visit.id} />
      ) : (
        <Field label={t("common.office")}>
          <select name="office_id" defaultValue={officeId} required className={inputClass}>
            {offices.map((o) => (
              <option key={o.id} value={o.id}>
                {officeLabel(refs, o.id)}
              </option>
            ))}
          </select>
        </Field>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("visitForm.date")}>
          <input type="date" name="scheduled_date" defaultValue={visit?.scheduled_date ?? date} required className={inputClass} />
        </Field>
        <Field label={t("common.time")}>
          <input type="time" name="time" defaultValue={visit?.time ?? "10:00"} className={inputClass} />
        </Field>
      </div>
      <Field label={t("schedule.employee1")}>
        <select name="employee_1_id" defaultValue={visit?.employee_1_id ?? ""} required className={inputClass}>
          <option value="" disabled>
            {t("schedule.choose")}
          </option>
          {people}
        </select>
      </Field>
      <Field label={t("schedule.employee2")}>
        <select name="employee_2_id" defaultValue={visit?.employee_2_id ?? ""} className={inputClass}>
          <option value="">{t("visitForm.notNeeded")}</option>
          {people}
        </select>
      </Field>
      {visit && (
        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" name="status" value="skipped" defaultChecked={visit.status === "skipped"} className="size-6 accent-brand-600" />
          {t("visitForm.cancel")}
        </label>
      )}
      <Field label={t("visitForm.comment")}>
        <textarea name="notes" defaultValue={visit?.notes ?? ""} rows={2} className={`${inputClass} py-3`} placeholder={t("visitForm.commentPlaceholder")} />
      </Field>
    </ActionForm>
  );
}
