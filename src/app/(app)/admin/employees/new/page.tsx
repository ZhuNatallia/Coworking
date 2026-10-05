import { createEmployee } from "@/app/actions/admin";
import { ActionForm } from "@/components/action-form";
import { Card, Field, inputClass, Page, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/current";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/accounts";

export default async function NewEmployeePage() {
  await requireAdmin();
  return (
    <>
      <PageHeader title="Новый сотрудник" back="/admin/employees" />
      <Page>
        <Card>
          <ActionForm action={createEmployee} submitLabel="Создать сотрудника">
            <Field label="Имя">
              <input name="name" required className={inputClass} />
            </Field>
            <Field label="Email" hint="Сотрудник входит по этому адресу">
              <input name="email" type="email" required className={inputClass} />
            </Field>
            <Field label="Пароль" hint={`Не короче ${MIN_PASSWORD_LENGTH} символов. Передайте его сотруднику лично.`}>
              <input name="password" type="text" required minLength={MIN_PASSWORD_LENGTH} autoComplete="off" className={inputClass} />
            </Field>
            <Field label="Роль">
              <select name="role" defaultValue="employee" className={inputClass}>
                <option value="employee">Сотрудник</option>
                <option value="admin">Администратор</option>
              </select>
            </Field>
          </ActionForm>
        </Card>
      </Page>
    </>
  );
}
