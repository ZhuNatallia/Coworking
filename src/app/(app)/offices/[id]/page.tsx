import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, History, Pencil, Phone } from "lucide-react";
import type { ReactNode } from "react";
import { addOfficeSupply, removeOfficeSupply, removeTask, restoreTask, saveTask } from "@/app/actions/admin";
import { ActionForm } from "@/components/action-form";
import { Tabs } from "@/components/tabs";
import { TranslatedText } from "@/components/translated-text";
import { Avatar, Card, EmptyState, Field, inputClass, LinkButton, Page, PageHeader, SupplyBadge } from "@/components/ui";
import { requireUser } from "@/lib/auth/current";
import { db } from "@/lib/db";
import type { T } from "@/lib/i18n/core";
import { getI18n, getTranslator } from "@/lib/i18n/server";
import { assignedFromSchedules, canAccessOffice, loadRefs, localizeTasks } from "@/lib/queries";
import type { Task, TaskCategory, TaskFrequency } from "@/lib/types";

const TAB_KEYS = ["info", "tasks", "supplies"] as const;

export default async function OfficePage(props: PageProps<"/offices/[id]">) {
  const user = await requireUser();
  const { t } = await getI18n();
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
            { key: "info", label: t("office.tabInfo"), href: `/offices/${id}` },
            { key: "tasks", label: t("office.tabTasks"), href: `/offices/${id}?tab=tasks` },
            { key: "supplies", label: t("office.tabSupplies"), href: `/offices/${id}?tab=supplies` },
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
  const { t, fmt } = await getI18n();
  const refs = await loadRefs();
  const office = refs.offices.get(officeId)!;
  const [schedules, tr] = await Promise.all([db().select("schedules", { eq: { office_id: officeId, active: true } }), getTranslator([office.notes])]);
  const people = assignedFromSchedules(schedules, refs, t);
  const days = [...new Set(schedules.map((s) => s.weekday))].sort().map((d) => fmt.weekdayLong(d));

  return (
    <>
      <Card className="divide-y divide-line py-1.5">
        <Row label={t("office.name")}>{office.name}</Row>
        <Row label={t("office.city")}>{refs.cities.get(office.city_id)?.name}</Row>
        <Row label={t("office.address")}>{office.address || "—"}</Row>
        <Row label={t("office.contact")}>{office.contact_name || "—"}</Row>
        <Row label={t("office.phone")}>
          {office.contact_phone ? (
            <a href={`tel:${office.contact_phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 font-medium text-brand-600">
              <Phone className="size-4" />
              {office.contact_phone}
            </a>
          ) : (
            "—"
          )}
        </Row>
        <Row label={t("office.serviceDay")}>{days.length ? days.join(", ") : t("office.noSchedule")}</Row>
        <Row label={t("office.assigned")}>
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
        <Row label={t("office.notes")}>{office.notes ? <TranslatedText text={tr(office.notes)} original={office.notes} /> : "—"}</Row>
      </Card>
      <div className="grid grid-cols-2 gap-3">
        <LinkButton href={`/history?office=${officeId}`} variant="outline">
          <History className="size-5" />
          {t("office.history")}
        </LinkButton>
        {admin && (
          <LinkButton href={`/admin/schedule?office=${officeId}`} variant="outline">
            <CalendarClock className="size-5" />
            {t("office.schedule")}
          </LinkButton>
        )}
      </div>
      {admin && (
        <LinkButton href={`/offices/${officeId}/edit`} variant="outline">
          <Pencil className="size-5" />
          {t("office.edit")}
        </LinkButton>
      )}
    </>
  );
}

const CATEGORY_ORDER: TaskCategory[] = ["cleaning", "kitchen", "bathroom", "office", "extra"];
const FREQUENCIES: TaskFrequency[] = ["weekly", "monthly", "as_needed"];

/** Edit fields keep the original wording; translations are only for reading. */
function TaskFields({ task, t }: { task?: Task; t: T }) {
  return (
    <>
      <Field label={t("tasks.name")}>
        <input name="name" defaultValue={task?.name} required className={inputClass} placeholder={t("tasks.namePlaceholder")} />
      </Field>
      <Field label={t("tasks.doneLabel")} hint={t("tasks.doneLabelHint")}>
        <input name="done_label" defaultValue={task?.done_label ?? ""} className={inputClass} placeholder={t("tasks.doneLabelPlaceholder")} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("tasks.category")}>
          <select name="category" defaultValue={task?.category ?? "extra"} className={inputClass}>
            {CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>
                {t(`taskCategory.${c}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("tasks.frequency")}>
          <select name="frequency" defaultValue={task?.frequency ?? "weekly"} className={inputClass}>
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {t(`frequency.${f}`)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <label className="flex min-h-11 items-center gap-3">
        <input type="checkbox" name="required" defaultChecked={task?.required} className="size-6 accent-brand-600" />
        {t("tasks.required")}
      </label>
    </>
  );
}

async function TasksTab({ officeId, admin }: { officeId: string; admin: boolean }) {
  const { t } = await getI18n();
  const tasks = await db().select("tasks", { eq: { office_id: officeId } }, [{ column: "sort_order" }]);
  const localized = new Map((await localizeTasks(tasks)).map((task) => [task.id, task.name]));
  const active = tasks.filter((task) => task.active);
  const inactive = tasks.filter((task) => !task.active);

  return (
    <>
      {active.length === 0 && <EmptyState>{t("tasks.empty")}</EmptyState>}
      {CATEGORY_ORDER.map((cat) => {
        const list = active.filter((task) => task.category === cat);
        if (!list.length) return null;
        return (
          <section key={cat} className="flex flex-col gap-2">
            <h2 className="px-1 text-[15px] font-semibold">{t(`taskCategory.${cat}`)}</h2>
            <Card className="divide-y divide-line p-0">
              {list.map((task) => (
                <details key={task.id} className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{localized.get(task.id)}</p>
                      <p className="text-sm text-muted">
                        {t(`frequency.${task.frequency}`)}
                        {task.required && ` · ${t("tasks.requiredShort")}`}
                      </p>
                    </div>
                    {admin && <Pencil className="size-4 text-muted" />}
                  </summary>
                  {admin && (
                    <div className="flex flex-col gap-3 px-4 pb-4">
                      <ActionForm action={saveTask} submitLabel={t("tasks.save")}>
                        <input type="hidden" name="id" value={task.id} />
                        <input type="hidden" name="office_id" value={officeId} />
                        <TaskFields task={task} t={t} />
                      </ActionForm>
                      <form action={removeTask}>
                        <input type="hidden" name="id" value={task.id} />
                        <button type="submit" className="w-full py-2 text-sm font-medium text-danger-700">
                          {t("tasks.remove")}
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
          <h2 className="mb-3 font-semibold">{t("tasks.new")}</h2>
          <ActionForm action={saveTask} submitLabel={t("tasks.add")} resetOnSuccess>
            <input type="hidden" name="office_id" value={officeId} />
            <TaskFields t={t} />
          </ActionForm>
        </Card>
      )}

      {admin && inactive.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-sm font-semibold text-muted">{t("tasks.removed")}</h2>
          <Card className="divide-y divide-line p-0">
            {inactive.map((task) => (
              <form key={task.id} action={restoreTask} className="flex items-center gap-3 px-4 py-3">
                <input type="hidden" name="id" value={task.id} />
                <span className="flex-1 text-muted">{localized.get(task.id)}</span>
                <button type="submit" className="text-sm font-medium text-brand-600">
                  {t("common.restore")}
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
  const { t, fmt } = await getI18n();
  const refs = await loadRefs();
  const rows = await db().select("office_supplies", { eq: { office_id: officeId } }, [{ column: "sort_order" }]);
  const present = new Set(rows.map((r) => r.supply_id));
  const available = [...refs.supplies.values()].filter((s) => s.active && !present.has(s.id));

  return (
    <>
      {rows.length === 0 ? (
        <EmptyState>{t("officeSupplies.empty")}</EmptyState>
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
                    {t(`supplyCategory.${supply.category}`)}
                    {r.quantity != null && ` · ${fmt.quantity(r.quantity, supply.unit)}`}
                    {r.updated_at && ` · ${fmt.dateTime(r.updated_at)}`}
                  </p>
                </div>
                <SupplyBadge status={r.status} />
                {admin && (
                  <form action={removeOfficeSupply}>
                    <input type="hidden" name="office_id" value={officeId} />
                    <input type="hidden" name="supply_id" value={r.supply_id} />
                    <button type="submit" className="px-1 text-xl leading-none text-muted" aria-label={t("officeSupplies.remove", { name: supply.name })}>
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
              {t("officeSupplies.allAdded")}{" "}
              <Link href="/admin/supplies" className="font-medium text-brand-600">
                {t("officeSupplies.catalog")}
              </Link>
              .
            </p>
          ) : (
            <ActionForm action={addOfficeSupply} submitLabel={t("officeSupplies.add")} variant="outline">
              <input type="hidden" name="office_id" value={officeId} />
              <select name="supply_id" className={inputClass} aria-label={t("officeSupplies.material")}>
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
