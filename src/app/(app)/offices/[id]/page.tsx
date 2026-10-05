import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, History, Pencil, Phone } from "lucide-react";
import type { ReactNode } from "react";
import { addOfficeSupply, removeOfficeSupply, removeTask, restoreTask, saveTask } from "@/app/actions/admin";
import { ActionForm } from "@/components/action-form";
import { Tabs } from "@/components/tabs";
import { Avatar, Card, EmptyState, Field, inputClass, LinkButton, Page, PageHeader, SupplyBadge } from "@/components/ui";
import { requireUser } from "@/lib/auth/current";
import { formatDateTime, WEEKDAY_LONG } from "@/lib/dates";
import { db } from "@/lib/db";
import { FREQUENCY_LABEL, quantityLabel, SUPPLY_CATEGORY_LABEL, TASK_CATEGORY_LABEL } from "@/lib/labels";
import { assignedFromSchedules, canAccessOffice, loadRefs } from "@/lib/queries";
import type { Task, TaskCategory } from "@/lib/types";

const TAB_KEYS = ["info", "tasks", "supplies"] as const;

export default async function OfficePage(props: PageProps<"/offices/[id]">) {
  const user = await requireUser();
  const { id } = await props.params;
  const { tab: tabParam } = await props.searchParams;
  const refs = await loadRefs();
  const office = refs.offices.get(id);
  if (!office || !(await canAccessOffice(user, id))) notFound();
  const admin = user.role === "admin";
  const tab = TAB_KEYS.find((k) => k === tabParam) ?? "info";
  const city = refs.cities.get(office.city_id);

  return (
    <>
      <PageHeader title={office.name} subtitle={city?.name} back="/offices" />
      <Page>
        <Tabs
          active={tab}
          tabs={[
            { key: "info", label: "Информация", href: `/offices/${id}` },
            { key: "tasks", label: "Задачи", href: `/offices/${id}?tab=tasks` },
            { key: "supplies", label: "Расходники", href: `/offices/${id}?tab=supplies` },
          ]}
        />
        {tab === "info" && <InfoTab officeId={id} admin={admin} />}
        {tab === "tasks" && <TasksTab officeId={id} admin={admin} />}
        {tab === "supplies" && <SuppliesTab officeId={id} admin={admin} />}
      </Page>
    </>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5">
      <span className="text-sm text-muted">{label}</span>
      <div className="text-[15px]">{children}</div>
    </div>
  );
}

async function InfoTab({ officeId, admin }: { officeId: string; admin: boolean }) {
  const refs = await loadRefs();
  const office = refs.offices.get(officeId)!;
  const schedules = await db().select("schedules", { eq: { office_id: officeId, active: true } });
  const people = assignedFromSchedules(schedules, refs);
  const days = [...new Set(schedules.map((s) => s.weekday))].sort().map((d) => WEEKDAY_LONG[d - 1]);

  return (
    <>
      <Card className="divide-y divide-line py-1.5">
        <Row label="Название">{office.name}</Row>
        <Row label="Город">{refs.cities.get(office.city_id)?.name}</Row>
        <Row label="Адрес">{office.address || "—"}</Row>
        <Row label="Контактное лицо">{office.contact_name || "—"}</Row>
        <Row label="Телефон">
          {office.contact_phone ? (
            <a href={`tel:${office.contact_phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 font-medium text-brand-600">
              <Phone className="size-4" />
              {office.contact_phone}
            </a>
          ) : (
            "—"
          )}
        </Row>
        <Row label="День обслуживания">{days.length ? days.join(", ") : "Расписание не задано"}</Row>
        <Row label="Назначенные сотрудники">
          {people.length ? (
            <ul className="mt-1 flex flex-col gap-2">
              {people.map((p) => (
                <li key={p.id} className="flex items-center gap-2">
                  <Avatar name={p.name} size={28} />
                  {p.name} <span className="text-sm text-muted">({p.note})</span>
                </li>
              ))}
            </ul>
          ) : (
            "—"
          )}
        </Row>
        <Row label="Комментарий">{office.notes || "—"}</Row>
      </Card>
      <div className="grid grid-cols-2 gap-3">
        <LinkButton href={`/history?office=${officeId}`} variant="outline">
          <History className="size-5" />
          История
        </LinkButton>
        {admin && (
          <LinkButton href={`/admin/schedule?office=${officeId}`} variant="outline">
            <CalendarClock className="size-5" />
            Расписание
          </LinkButton>
        )}
      </div>
      {admin && (
        <LinkButton href={`/offices/${officeId}/edit`} variant="outline">
          <Pencil className="size-5" />
          Редактировать
        </LinkButton>
      )}
    </>
  );
}

const CATEGORY_ORDER: TaskCategory[] = ["cleaning", "kitchen", "bathroom", "office", "extra"];

function TaskFields({ task }: { task?: Task }) {
  return (
    <>
      <Field label="Название">
        <input name="name" defaultValue={task?.name} required className={inputClass} placeholder="Например: Протереть окна" />
      </Field>
      <Field label="Подпись при выполнении" hint="Показывается у галочки и в отчёте">
        <input name="done_label" defaultValue={task?.done_label ?? ""} className={inputClass} placeholder="Окна протёрты" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Раздел">
          <select name="category" defaultValue={task?.category ?? "extra"} className={inputClass}>
            {CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>
                {TASK_CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Как часто">
          <select name="frequency" defaultValue={task?.frequency ?? "weekly"} className={inputClass}>
            {(Object.keys(FREQUENCY_LABEL) as Task["frequency"][]).map((f) => (
              <option key={f} value={f}>
                {FREQUENCY_LABEL[f]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <label className="flex min-h-11 items-center gap-3">
        <input type="checkbox" name="required" defaultChecked={task?.required} className="size-6 accent-brand-600" />
        Обязательная задача
      </label>
    </>
  );
}

async function TasksTab({ officeId, admin }: { officeId: string; admin: boolean }) {
  const tasks = await db().select("tasks", { eq: { office_id: officeId } }, [{ column: "sort_order" }]);
  const active = tasks.filter((t) => t.active);
  const inactive = tasks.filter((t) => !t.active);

  return (
    <>
      {active.length === 0 && <EmptyState>Задач пока нет.</EmptyState>}
      {CATEGORY_ORDER.map((cat) => {
        const list = active.filter((t) => t.category === cat);
        if (!list.length) return null;
        return (
          <section key={cat} className="flex flex-col gap-2">
            <h2 className="px-1 text-[15px] font-semibold">{TASK_CATEGORY_LABEL[cat]}</h2>
            <Card className="divide-y divide-line p-0">
              {list.map((t) => (
                <details key={t.id} className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{t.name}</p>
                      <p className="text-sm text-muted">
                        {FREQUENCY_LABEL[t.frequency]}
                        {t.required && " · обязательная"}
                      </p>
                    </div>
                    {admin && <Pencil className="size-4 text-muted" />}
                  </summary>
                  {admin && (
                    <div className="flex flex-col gap-3 px-4 pb-4">
                      <ActionForm action={saveTask} submitLabel="Сохранить задачу">
                        <input type="hidden" name="id" value={t.id} />
                        <input type="hidden" name="office_id" value={officeId} />
                        <TaskFields task={t} />
                      </ActionForm>
                      <form action={removeTask}>
                        <input type="hidden" name="id" value={t.id} />
                        <button type="submit" className="w-full py-2 text-sm font-medium text-danger-700">
                          Убрать из чек-листа
                        </button>
                      </form>
                    </div>
                  )}
                </details>
              ))}
            </Card>
          </section>
        );
      })}

      {admin && (
        <Card>
          <h2 className="mb-3 font-semibold">Новая задача</h2>
          <ActionForm action={saveTask} submitLabel="Добавить задачу" resetOnSuccess>
            <input type="hidden" name="office_id" value={officeId} />
            <TaskFields />
          </ActionForm>
        </Card>
      )}

      {admin && inactive.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-sm font-semibold text-muted">Убранные задачи</h2>
          <Card className="divide-y divide-line p-0">
            {inactive.map((t) => (
              <form key={t.id} action={restoreTask} className="flex items-center gap-3 px-4 py-3">
                <input type="hidden" name="id" value={t.id} />
                <span className="flex-1 text-muted">{t.name}</span>
                <button type="submit" className="text-sm font-medium text-brand-600">
                  Вернуть
                </button>
              </form>
            ))}
          </Card>
        </section>
      )}
    </>
  );
}

async function SuppliesTab({ officeId, admin }: { officeId: string; admin: boolean }) {
  const refs = await loadRefs();
  const rows = await db().select("office_supplies", { eq: { office_id: officeId } }, [{ column: "sort_order" }]);
  const present = new Set(rows.map((r) => r.supply_id));
  const available = [...refs.supplies.values()].filter((s) => s.active && !present.has(s.id));

  return (
    <>
      {rows.length === 0 ? (
        <EmptyState>Расходные материалы не добавлены.</EmptyState>
      ) : (
        <Card className="divide-y divide-line p-0">
          {rows.map((r) => {
            const supply = refs.supplies.get(r.supply_id);
            if (!supply) return null;
            return (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{supply.name}</p>
                  <p className="text-sm text-muted">
                    {SUPPLY_CATEGORY_LABEL[supply.category]}
                    {r.quantity != null && ` · ${quantityLabel(r.quantity, supply.unit)}`}
                    {r.updated_at && ` · ${formatDateTime(r.updated_at)}`}
                  </p>
                </div>
                <SupplyBadge status={r.status} />
                {admin && (
                  <form action={removeOfficeSupply}>
                    <input type="hidden" name="office_id" value={officeId} />
                    <input type="hidden" name="supply_id" value={r.supply_id} />
                    <button type="submit" className="px-1 text-xl leading-none text-muted" aria-label={`Убрать ${supply.name}`}>
                      ×
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </Card>
      )}
      {admin && (
        <Card>
          {available.length === 0 ? (
            <p className="text-sm text-muted">
              Все материалы из списка уже добавлены. Новый материал можно создать в разделе{" "}
              <Link href="/admin/supplies" className="font-medium text-brand-600">
                Расходные материалы
              </Link>
              .
            </p>
          ) : (
            <ActionForm action={addOfficeSupply} submitLabel="Добавить материал" variant="outline">
              <input type="hidden" name="office_id" value={officeId} />
              <select name="supply_id" className={inputClass} aria-label="Материал">
                {available.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </ActionForm>
          )}
        </Card>
      )}
    </>
  );
}
