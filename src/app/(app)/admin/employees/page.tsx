import { Plus } from "lucide-react";
import { Avatar, Card, LinkButton, ListLink, Page, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/current";
import { db } from "@/lib/db";
import { isLocale } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";

export default async function EmployeesPage() {
  await requireAdmin();
  const { t } = await getI18n();
  const people = await db().select("profiles", {}, [{ column: "name" }]);
  const sorted = [...people].sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name));

  return (
    <>
      <PageHeader
        title={t("employees.title")}
        action={
          <LinkButton href="/admin/employees/new" className="min-h-10 px-3 text-sm">
            <Plus className="size-4" />
            {t("employees.add")}
          </LinkButton>
        }
      />
      <Page>
        <Card className="divide-y divide-line p-0">
          {sorted.map((p) => (
            <ListLink key={p.id} href={`/admin/employees/${p.id}`} className={p.active ? "" : "opacity-55"}>
              <div className="flex items-center gap-3">
                <Avatar name={p.name} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{p.name}</p>
                  <p className="truncate text-sm text-muted">
                    {p.email}
                    {isLocale(p.locale) && ` · ${p.locale.toUpperCase()}`}
                  </p>
                </div>
                <span
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                    !p.active ? "bg-canvas text-muted" : p.role === "admin" ? "bg-warn-50 text-warn-700" : "bg-brand-50 text-brand-700"
                  }`}
                >
                  {p.active ? t(`roles.${p.role}`) : t("employees.inactive")}
                </span>
              </div>
            </ListLink>
          ))}
        </Card>
      </Page>
    </>
  );
}
