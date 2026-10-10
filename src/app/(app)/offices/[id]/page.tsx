import { notFound } from "next/navigation";
import { CalendarClock, History, Pencil, Phone } from "lucide-react";
import type { ReactNode } from "react";
import { addOfficeMaterial, addOfficeSupply, removeOfficeSupply, removeTask, restoreTask, saveTask, setOfficeSupplyStatus } from "@/app/actions/admin";
import { addOfficeMail, removeOfficeMail } from "@/app/actions/mail";
import { ActionForm } from "@/components/action-form";
import { DeleteOfficeButton } from "@/components/delete-office-button";
import { SupplyPhotos } from "@/components/supply-photos";
import { Tabs } from "@/components/tabs";
import { TranslatedText } from "@/components/translated-text";
import { Avatar, Card, EmptyState, Field, inputClass, LinkButton, OfficeDot, Page, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/current";
import { db } from "@/lib/db";
import type { T } from "@/lib/i18n/core";
import { getI18n, getTranslator } from "@/lib/i18n/server";
import { assignedFromSchedules, canAccessOffice, loadRefs, localizeTasks } from "@/lib/queries";
import type { SupplyCategory, SupplyStatus, SupplyUnit, Task, TaskCategory, TaskFrequency } from "@/lib/types";

const SUPPLY_UNITS: SupplyUnit[] = ["pcs", "pack", "roll", "bottle", "ream", "kg", "l"];
const SUPPLY_CATEGORIES: SupplyCategory[] = ["kitchen", "bathroom", "office", "cleaning"];
const SUPPLY_STATUSES = ["ok", "low", "out"] as const satisfies readonly SupplyStatus[];
const STATUS_BUTTON: Record<SupplyStatus, string> = {
  ok: "border-brand-solid bg-brand-solid text-white",
  low: "border-warn-700 bg-warn-50 text-warn-700",
  out: "border-danger-700 bg-danger-50 text-danger-700",
};

const TAB_KEYS = ["info", "tasks", "supplies", "mail"] as const;

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
      <PageHeader title={office.name} subtitle={city?.name} back="/" color={office.color} />
      <Page>
        <Tabs
          active={tab}
          color={office.color}
          tabs={[
            { key: "info", label: t("office.tabInfo"), href: `/offices/${id}` },
            { key: "tasks", label: t("office.tabTasks"), href: `/offices/${id}?tab=tasks` },
            { key: "supplies", label: t("office.tabSupplies"), href: `/offices/${id}?tab=supplies` },
            { key: "mail", label: t("office.tabMail"), href: `/offices/${id}?tab=mail` },
          ]}
        />
        {tab === "info" && <InfoTab officeId={id} admin={admin} />}
        {tab === "tasks" && <TasksTab officeId={id} admin={admin} />}
        {tab === "supplies" && <SuppliesTab officeId={id} admin={admin} />}
        {tab === "mail" && <MailTab officeId={id} />}
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
        <Row label={t("office.name")}>
          <span className="inline-flex items-center gap-2">
            <OfficeDot color={office.color} className="size-4" />
            {office.name}
          </span>
        </Row>
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
        <LinkButton href={`/admin/schedule?office=${officeId}`} variant="outline">
          <CalendarClock className="size-5" />
          {t("office.schedule")}
        </LinkButton>
      </div>
      {admin && (
        <>
          <LinkButton href={`/offices/${officeId}/edit`} variant="outline">
            <Pencil className="size-5" />
            {t("office.edit")}
          </LinkButton>
          <DeleteOfficeButton id={officeId} label={t("office.delete")} confirmText={t("office.deleteConfirm", { name: office.name })} />
        </>
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

async function MailTab({ officeId }: { officeId: string }) {
  const { t, fmt } = await getI18n();
  const refs = await loadRefs();
  const rows = await db().select("office_mail", { eq: { office_id: officeId } }, [{ column: "created_at", ascending: false }]);
  const tr = await getTranslator(rows.map((row) => row.instruction));

  return (
    <>
      <Card>
        <ActionForm action={addOfficeMail} submitLabel={t("mail.add")} resetOnSuccess>
          <input type="hidden" name="office_id" value={officeId} />
          <Field label={t("mail.recipient")}>
            <input name="recipient" className={inputClass} placeholder={t("mail.recipientPlaceholder")} />
          </Field>
          <Field label={t("mail.instruction")}>
            <textarea name="instruction" rows={2} className={`${inputClass} py-3`} placeholder={t("mail.instructionPlaceholder")} />
          </Field>
        </ActionForm>
      </Card>
      {rows.length === 0 ? (
        <EmptyState>{t("mail.empty")}</EmptyState>
      ) : (
        <Card className="p-0">
          <table className="w-full table-fixed border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-muted">
                <th className="w-[34%] px-3 py-2 font-medium">{t("mail.recipient")}</th>
                <th className="px-3 py-2 font-medium">{t("mail.instruction")}</th>
                <th className="w-8 px-1 py-2">
                  <span className="sr-only">{t("mail.remove")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-line align-top last:border-0">
                  <td className="px-3 py-2.5">
                    <span className="block font-medium">{row.recipient}</span>
                    <span className="mt-1 block text-xs text-muted">
                      {fmt.dateTime(row.created_at)}
                      {row.created_by && ` · ${refs.profiles.get(row.created_by)?.name ?? ""}`}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <TranslatedText text={tr(row.instruction)} original={row.instruction} />
                  </td>
                  <td className="px-1 py-2 text-right">
                    <form action={removeOfficeMail}>
                      <input type="hidden" name="id" value={row.id} />
                      <button type="submit" className="px-1 text-xl leading-none text-muted" aria-label={t("mail.remove")}>
                        ×
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}

async function SuppliesTab({ officeId, admin }: { officeId: string; admin: boolean }) {
  const { t, fmt } = await getI18n();
  const refs = await loadRefs();
  const rows = await db().select("office_supplies", { eq: { office_id: officeId } }, [{ column: "sort_order" }]);
  const photos = rows.length
    ? await db().select("photos", { in: { office_supply_id: rows.map((r) => r.id) } }, [{ column: "created_at" }])
    : [];
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
              <div key={r.id} className="flex flex-col gap-2 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{supply.name}</p>
                    <p className="text-sm text-muted">
                      {t(`supplyCategory.${supply.category}`)}
                      {r.quantity != null && ` · ${fmt.quantity(r.quantity, supply.unit)}`}
                      {r.updated_at && ` · ${fmt.dateTime(r.updated_at)}`}
                    </p>
                  </div>
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
                <form action={setOfficeSupplyStatus} className="flex flex-col gap-2">
                  <input type="hidden" name="office_id" value={officeId} />
                  <input type="hidden" name="supply_id" value={r.supply_id} />
                  <div className="grid grid-cols-3 gap-2">
                    {SUPPLY_STATUSES.map((status) => (
                      <button
                        key={status}
                        type="submit"
                        name="status"
                        value={status}
                        className={`min-h-11 rounded-xl border px-1 text-[13px] font-semibold leading-tight ${
                          r.status === status ? STATUS_BUTTON[status] : "border-line bg-surface text-ink"
                        }`}
                      >
                        {t(`supplyStatus.${status}`)}
                      </button>
                    ))}
                  </div>
                  <SupplyPhotos
                    officeSupplyId={r.id}
                    note={r.note}
                    photos={photos.filter((p) => p.office_supply_id === r.id)}
                  />
                </form>
              </div>
            );
          })}
        </Card>
      )}
      {admin && available.length > 0 && (
        <Card>
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
        </Card>
      )}
      {admin && (
        <Card>
          <h2 className="mb-3 font-semibold">{t("supplies.new")}</h2>
          <ActionForm action={addOfficeMaterial} submitLabel={t("common.add")} resetOnSuccess>
            <input type="hidden" name="office_id" value={officeId} />
            <Field label={t("supplies.name")}>
              <input name="name" required className={inputClass} placeholder={t("supplies.namePlaceholder")} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("supplies.unit")}>
                <select name="unit" defaultValue="pcs" className={inputClass}>
                  {SUPPLY_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {t(`unitNames.${u}`)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t("supplies.category")}>
                <select name="category" defaultValue="kitchen" className={inputClass}>
                  {SUPPLY_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {t(`supplyCategory.${c}`)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </ActionForm>
          <p className="mt-3 text-sm text-muted">{t("supplies.hint")}</p>
        </Card>
      )}
    </>
  );
}
