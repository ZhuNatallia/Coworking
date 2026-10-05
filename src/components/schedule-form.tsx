import { saveSchedule } from "@/app/actions/schedule";
import { ActionForm } from "@/components/action-form";
import { Field, inputClass } from "@/components/ui";
import { todayISO } from "@/lib/dates";
import type { MessageKey } from "@/lib/i18n/core";
import { getI18n } from "@/lib/i18n/server";
import { officeLabel, type Refs } from "@/lib/queries";
import type { Recurrence, Schedule } from "@/lib/types";

const RECURRENCE_OPTIONS: { value: Recurrence; title: MessageKey; hint: MessageKey }[] = [
  { value: "weekly", title: "schedule.weekly", hint: "schedule.weeklyHint" },
  { value: "alternate", title: "schedule.alternate", hint: "schedule.alternateHint" },
  { value: "pair", title: "schedule.pair", hint: "schedule.pairHint" },
];

export async function ScheduleForm({ refs, schedule, officeId }: { refs: Refs; schedule?: Schedule; officeId?: string }) {
  const { t, fmt } = await getI18n();
  const employees = [...refs.profiles.values()].filter((p) => p.active);
  const offices = [...refs.offices.values()].filter((o) => o.active).sort((a, b) => officeLabel(refs, a.id).localeCompare(officeLabel(refs, b.id)));
  const people = (
    <>
      {employees.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </>
  );

  return (
    <ActionForm action={saveSchedule} submitLabel={t(schedule ? "schedule.save" : "schedule.create")}>
      {schedule && <input type="hidden" name="id" value={schedule.id} />}
      {schedule ? (
        <input type="hidden" name="office_id" value={schedule.office_id} />
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
        <Field label={t("schedule.weekday")}>
          <select name="weekday" defaultValue={schedule?.weekday ?? 1} className={inputClass}>
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <option key={d} value={d}>
                {fmt.weekdayLong(d)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("common.time")}>
          <input type="time" name="time" defaultValue={schedule?.time ?? "10:00"} className={inputClass} />
        </Field>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium text-muted">{t("schedule.how")}</legend>
        {RECURRENCE_OPTIONS.map((o) => (
          <label
            key={o.value}
            className="flex cursor-pointer gap-3 rounded-xl border border-line bg-white p-3 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50"
          >
            <input
              type="radio"
              name="recurrence"
              value={o.value}
              defaultChecked={(schedule?.recurrence ?? "weekly") === o.value}
              className="mt-0.5 size-5 shrink-0 accent-brand-600"
            />
            <span>
              <span className="block font-medium">{t(o.title)}</span>
              <span className="block text-sm text-muted">{t(o.hint)}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <Field label={t("schedule.employee1")}>
        <select name="employee_1_id" defaultValue={schedule?.employee_1_id ?? ""} required className={inputClass}>
          <option value="" disabled>
            {t("schedule.choose")}
          </option>
          {people}
        </select>
      </Field>
      <Field label={t("schedule.employee2")} hint={t("schedule.employee2Hint")}>
        <select name="employee_2_id" defaultValue={schedule?.employee_2_id ?? ""} className={inputClass}>
          <option value="">{t("schedule.notChosen")}</option>
          {people}
        </select>
      </Field>
      <Field label={t("schedule.startsOn")}>
        <input type="date" name="starts_on" defaultValue={schedule?.starts_on ?? todayISO()} className={inputClass} />
      </Field>
      {schedule && (
        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" name="active" defaultChecked={schedule.active} className="size-6 accent-brand-600" />
          {t("schedule.active")}
        </label>
      )}
      <p className="text-sm text-muted">{t("schedule.note")}</p>
    </ActionForm>
  );
}
