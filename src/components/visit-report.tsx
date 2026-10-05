import { Check, Clock, MessageSquareText, Minus, UserRound, X } from "lucide-react";
import { TranslatedText } from "@/components/translated-text";
import { Card, cx, EmptyState, RequestBadge, SupplyBadge, VisitBadge } from "@/components/ui";
import { todayISO } from "@/lib/dates";
import { db } from "@/lib/db";
import type { T } from "@/lib/i18n/core";
import { getI18n, getTranslator } from "@/lib/i18n/server";
import { localizeTasks, visitPeople, type Refs } from "@/lib/queries";
import type { TaskCategory, Visit, VisitTaskStatus } from "@/lib/types";

const CATEGORY_ORDER: TaskCategory[] = ["cleaning", "kitchen", "bathroom", "office", "extra"];

function TaskLine({ name, doneLabel, status, t }: { name: string; doneLabel: string | null; status: VisitTaskStatus; t: T }) {
  const done = status === "done";
  const notNeeded = status === "not_needed";
  return (
    <li className="flex items-start gap-2.5 py-1.5">
      <span
        className={cx(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
          done ? "bg-brand-600 text-white" : notNeeded ? "bg-canvas text-muted" : "bg-danger-50 text-danger-700",
        )}
      >
        {done ? <Check className="size-3.5" strokeWidth={3} /> : notNeeded ? <Minus className="size-3.5" /> : <X className="size-3.5" strokeWidth={3} />}
      </span>
      <span className="text-[15px]">
        {done ? doneLabel || name : name}
        {notNeeded && <span className="text-muted"> — {t("report.notNeeded")}</span>}
        {!done && !notNeeded && <span className="text-danger-700"> — {t("report.notDone")}</span>}
      </span>
    </li>
  );
}

/** Full read-only report of a visit: checklist, supplies, requests, comment and photos. */
export async function VisitReport({ visit, refs, compact = false }: { visit: Visit; refs: Refs; compact?: boolean }) {
  const store = db();
  const [{ t, fmt }, rawTasks, visitTasks, visitSupplies, requests, photos, tr] = await Promise.all([
    getI18n(),
    store.select("tasks", { eq: { office_id: visit.office_id } }),
    store.select("visit_tasks", { eq: { visit_id: visit.id } }),
    store.select("visit_supplies", { eq: { visit_id: visit.id } }),
    store.select("supply_requests", { eq: { created_from_visit_id: visit.id } }),
    store.select("photos", { eq: { visit_id: visit.id } }, [{ column: "created_at" }]),
    getTranslator([visit.notes]),
  ]);
  const tasks = compact ? rawTasks : await localizeTasks(rawTasks);
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const completedBy = visit.completed_by ? refs.profiles.get(visit.completed_by)?.name : null;
  const flagged = visitSupplies.filter((s) => s.status === "low" || s.status === "out");
  const supplies = compact ? flagged : visitSupplies;

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-2">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              {fmt.weekdayDayMonth(visit.scheduled_date)}
              {visit.time && `, ${visit.time}`}
            </p>
            <p className="inline-flex items-center gap-1.5 text-sm text-muted">
              <UserRound className="size-4" />
              {visitPeople(refs, visit, t)}
            </p>
          </div>
          <VisitBadge status={visit.status} date={visit.scheduled_date} today={todayISO()} />
        </div>
        {visit.completed_at && (
          <p className="inline-flex items-center gap-1.5 text-sm text-muted">
            <Clock className="size-4" />
            {t("report.completed", { date: fmt.dateTime(visit.completed_at) })}
            {completedBy && ` · ${completedBy}`}
          </p>
        )}
      </Card>

      {visit.notes && (
        <Card className="flex gap-3 bg-warn-50/60">
          <MessageSquareText className="mt-0.5 size-5 shrink-0 text-warn-700" />
          <TranslatedText text={tr(visit.notes)} original={visit.notes} className="whitespace-pre-line text-[15px]" />
        </Card>
      )}

      {requests.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-[15px] font-semibold">{t("report.requested")}</h2>
          <Card className="divide-y divide-line p-0">
            {requests.map((r) => {
              const supply = refs.supplies.get(r.supply_id);
              return (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{supply?.name}</p>
                    <p className="text-sm text-muted">
                      {t(r.reason === "out" ? "report.ranOut" : "report.low")}
                      {supply && r.quantity != null && ` · ${t("report.left", { qty: fmt.quantity(r.quantity, supply.unit)! })}`}
                    </p>
                  </div>
                  <RequestBadge status={r.status} />
                </div>
              );
            })}
          </Card>
        </section>
      )}

      {!compact && (
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-[15px] font-semibold">{t("report.checklist")}</h2>
          {visitTasks.length === 0 ? (
            <EmptyState>{t("report.checklistEmpty")}</EmptyState>
          ) : (
            <Card className="flex flex-col gap-3">
              {CATEGORY_ORDER.map((cat) => {
                const list = visitTasks
                  .map((vt) => ({ vt, task: taskById.get(vt.task_id) }))
                  .filter((x) => x.task?.category === cat)
                  .sort((a, b) => a.task!.sort_order - b.task!.sort_order);
                if (!list.length) return null;
                return (
                  <div key={cat}>
                    <p className="text-sm font-medium text-muted">{t(`taskCategory.${cat}`)}</p>
                    <ul>
                      {list.map(({ vt, task }) => (
                        <TaskLine key={vt.id} name={task!.name} doneLabel={task!.done_label} status={vt.status} t={t} />
                      ))}
                    </ul>
                  </div>
                );
              })}
            </Card>
          )}
        </section>
      )}

      {supplies.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-[15px] font-semibold">{t(compact ? "report.wasLow" : "report.supplies")}</h2>
          <Card className="divide-y divide-line p-0">
            {supplies.map((s) => {
              const supply = refs.supplies.get(s.supply_id);
              if (!supply) return null;
              return (
                <div key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="min-w-0 flex-1">{supply.name}</span>
                  {s.quantity != null && <span className="text-sm text-muted">{fmt.quantity(s.quantity, supply.unit)}</span>}
                  <SupplyBadge status={s.status} />
                </div>
              );
            })}
          </Card>
        </section>
      )}

      {photos.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-[15px] font-semibold">{t("report.photos")}</h2>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p) => (
              <a key={p.id} href={`/api/photos/${p.id}`} target="_blank" rel="noreferrer" className="block aspect-square overflow-hidden rounded-xl bg-canvas">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/photos/${p.id}`} alt={t("photos.alt")} className="size-full object-cover" loading="lazy" />
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
