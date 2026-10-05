import { createEmployee } from "@/app/actions/admin";
import { ActionForm } from "@/components/action-form";
import { LocaleSelect } from "@/components/locale-select";
import { Card, Field, inputClass, Page, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/current";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/accounts";
import { getI18n } from "@/lib/i18n/server";

export default async function NewEmployeePage() {
  await requireAdmin();
  const { t, locale } = await getI18n();
  return (
    <>
      <PageHeader title={t("employees.newTitle")} back="/admin/employees" />
      <Page>
        <Card>
          <ActionForm action={createEmployee} submitLabel={t("employees.create")}>
            <Field label={t("employees.name")}>
              <input name="name" required className={inputClass} />
            </Field>
            <Field label={t("login.email")} hint={t("employees.emailHint")}>
              <input name="email" type="email" required className={inputClass} />
            </Field>
            <Field label={t("employees.password")} hint={t("employees.passwordHint", { n: MIN_PASSWORD_LENGTH })}>
              <input name="password" type="text" required minLength={MIN_PASSWORD_LENGTH} autoComplete="off" className={inputClass} />
            </Field>
            <Field label={t("employees.role")}>
              <select name="role" defaultValue="employee" className={inputClass}>
                <option value="employee">{t("roles.employee")}</option>
                <option value="admin">{t("roles.admin")}</option>
              </select>
            </Field>
            <Field label={t("employees.language")}>
              <LocaleSelect defaultValue={locale} />
            </Field>
          </ActionForm>
        </Card>
      </Page>
    </>
  );
}
