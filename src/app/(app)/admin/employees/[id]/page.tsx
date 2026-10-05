import { notFound } from "next/navigation";
import { updateEmployee } from "@/app/actions/admin";
import { ActionForm } from "@/components/action-form";
import { LocaleSelect } from "@/components/locale-select";
import { Avatar, Card, Field, inputClass, Page, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/current";
import { db } from "@/lib/db";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { loadRefs, officeLabel } from "@/lib/queries";

export default async function EmployeePage(props: PageProps<"/admin/employees/[id]">) {
  await requireAdmin();
  const { t, fmt } = await getI18n();
  const { id } = await props.params;
  const store = db();
  const [person] = await store.select("profiles", { eq: { id } });
  if (!person) notFound();
  const refs = await loadRefs();
  const [s1, s2] = await Promise.all([
    store.select("schedules", { eq: { employee_1_id: id, active: true } }),
    store.select("schedules", { eq: { employee_2_id: id, active: true } }),
  ]);
  const schedules = [...s1, ...s2.filter((s) => !s1.some((x) => x.id === s.id))];

  return (
    <>
      <PageHeader title={person.name} back="/admin/employees" />
      <Page>
        <Card className="flex items-center gap-4">
          <Avatar name={person.name} size={52} />
          <div className="min-w-0">
            <p className="font-semibold">{person.name}</p>
            <p className="truncate text-sm text-muted">{person.email}</p>
          </div>
        </Card>
        <Card>
          <ActionForm action={updateEmployee} submitLabel={t("common.save")}>
            <input type="hidden" name="id" value={person.id} />
            <Field label={t("employees.name")}>
              <input name="name" defaultValue={person.name} required className={inputClass} />
            </Field>
            <Field label={t("employees.role")}>
              <select name="role" defaultValue={person.role} className={inputClass}>
                <option value="employee">{t("roles.employee")}</option>
                <option value="admin">{t("roles.admin")}</option>
              </select>
            </Field>
            <Field label={t("employees.language")}>
              <LocaleSelect defaultValue={isLocale(person.locale) ? person.locale : DEFAULT_LOCALE} />
            </Field>
            <Field label={t("employees.newPassword")} hint={t("employees.keepPassword")}>
              <input name="password" type="text" autoComplete="off" className={inputClass} />
            </Field>
            <label className="flex min-h-12 items-center gap-3">
              <input type="checkbox" name="active" defaultChecked={person.active} className="size-6 accent-brand-600" />
              {t("employees.canLogin")}
            </label>
          </ActionForm>
        </Card>
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-[15px] font-semibold">{t("employees.schedule")}</h2>
          <Card className="divide-y divide-line p-0">
            {schedules.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted">{t("employees.noSchedule")}</p>
            ) : (
              schedules.map((s) => (
                <div key={s.id} className="px-4 py-3">
                  <p className="font-medium">{officeLabel(refs, s.office_id)}</p>
                  <p className="text-sm text-muted">
                    {fmt.weekdayEvery(s.weekday)} · {t(`recurrence.${s.recurrence}`)}
                    {s.recurrence === "weekly" && s.employee_2_id === id && ` · ${t("employees.backup")}`}
                  </p>
                </div>
              ))
            )}
          </Card>
        </section>
      </Page>
    </>
  );
}
