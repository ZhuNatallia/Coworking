import { saveSchedule } from "@/app/actions/schedule";
import { ActionForm } from "@/components/action-form";
import { Field, inputClass } from "@/components/ui";
import { todayISO, WEEKDAY_LONG } from "@/lib/dates";
import { officeLabel, type Refs } from "@/lib/queries";
import type { Recurrence, Schedule } from "@/lib/types";

const RECURRENCE_OPTIONS: { value: Recurrence; title: string; hint: string }[] = [
  { value: "weekly", title: "Каждую неделю", hint: "Один сотрудник ходит каждую неделю. Второй — резервный, на визиты не назначается." },
  { value: "alternate", title: "По очереди", hint: "Сотрудник 1 — в чётные недели, сотрудник 2 — в нечётные." },
  { value: "pair", title: "Вдвоём", hint: "Оба сотрудника приходят вместе на каждый визит." },
];

export function ScheduleForm({ refs, schedule, officeId }: { refs: Refs; schedule?: Schedule; officeId?: string }) {
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
    <ActionForm action={saveSchedule} submitLabel={schedule ? "Сохранить расписание" : "Создать расписание"}>
      {schedule && <input type="hidden" name="id" value={schedule.id} />}
      {schedule ? (
        <input type="hidden" name="office_id" value={schedule.office_id} />
      ) : (
        <Field label="Офис">
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
        <Field label="День недели">
          <select name="weekday" defaultValue={schedule?.weekday ?? 1} className={inputClass}>
            {WEEKDAY_LONG.map((d, i) => (
              <option key={d} value={i + 1}>
                {d}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Время">
          <input type="time" name="time" defaultValue={schedule?.time ?? "10:00"} className={inputClass} />
        </Field>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium text-muted">Как ходят сотрудники</legend>
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
              <span className="block font-medium">{o.title}</span>
              <span className="block text-sm text-muted">{o.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <Field label="Сотрудник 1">
        <select name="employee_1_id" defaultValue={schedule?.employee_1_id ?? ""} required className={inputClass}>
          <option value="" disabled>
            Выберите сотрудника
          </option>
          {people}
        </select>
      </Field>
      <Field label="Сотрудник 2" hint="Для «Каждую неделю» — резервный, можно не выбирать">
        <select name="employee_2_id" defaultValue={schedule?.employee_2_id ?? ""} className={inputClass}>
          <option value="">Не выбран</option>
          {people}
        </select>
      </Field>
      <Field label="Действует с">
        <input type="date" name="starts_on" defaultValue={schedule?.starts_on ?? todayISO()} className={inputClass} />
      </Field>
      {schedule && (
        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" name="active" defaultChecked={schedule.active} className="size-6 accent-brand-600" />
          Расписание активно
        </label>
      )}
      <p className="text-sm text-muted">
        Визиты создаются автоматически на 12 недель вперёд. Прошедшие, начатые и вручную изменённые визиты не меняются.
      </p>
    </ActionForm>
  );
}
