import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, ChevronLeft, ChevronRight, Clock, MapPin, Pencil, Phone, ShoppingBag, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { beginVisit } from "@/app/actions/visits";
import { Tabs } from "@/components/tabs";
import { Avatar, buttonStyles, Card, cx, EmptyState, LinkButton, Page, PageHeader, SectionTitle, VisitBadge } from "@/components/ui";
import { FinishForm } from "@/components/visit/finish-form";
import { PhotoUploader } from "@/components/visit/photo-uploader";
import { SupplyRow } from "@/components/visit/supply-row";
import { TaskRow } from "@/components/visit/task-row";
import { VisitReport } from "@/components/visit-report";
import { requireUser } from "@/lib/auth/current";
import { dateOfTimestamp, formatDate, formatWeekdayDayMonth, todayISO } from "@/lib/dates";
import { db } from "@/lib/db";
import { quantityLabel } from "@/lib/labels";
import { canWorkOnVisit, loadRefs, officeLabel, visitPeople, type Refs } from "@/lib/queries";
import type { Profile, SupplyCategory, TaskCategory, Visit } from "@/lib/types";

const TAB_KEYS = ["visit", "prev", "info"] as const;

const STEPS: { title: string; tasks: TaskCategory[]; supplies: SupplyCategory[] }[] = [
  { title: "Уборка", tasks: ["cleaning"], supplies: ["cleaning"] },
  { title: "Кухня", tasks: ["kitchen"], supplies: ["kitchen"] },
  { title: "Санузел и офис", tasks: ["bathroom", "office", "extra"], supplies: ["bathroom", "office"] },
  { title: "Завершение", tasks: [], supplies: [] },
];

async function previousVisit(visit: Visit): Promise<Visit | null> {
  const done = await db().select("visits", { eq: { office_id: visit.office_id, status: "done" }, lte: { scheduled_date: visit.scheduled_date } }, [
    { column: "scheduled_date", ascending: false },
    { column: "completed_at", ascending: false },
  ]);
  return done.find((v) => v.id !== visit.id && (v.scheduled_date < visit.scheduled_date || (v.completed_at ?? "") < (visit.completed_at ?? "~"))) ?? null;
}

export default async function VisitPage(props: PageProps<"/visits/[id]">) {
  const user = await requireUser();
  const { id } = await props.params;
  const sp = await props.searchParams;
  const [visit] = await db().select("visits", { eq: { id } });
  if (!visit || !canWorkOnVisit(user, visit)) notFound();
  const refs = await loadRefs();
  const tab = TAB_KEYS.find((k) => k === sp.tab) ?? "visit";
  const step = Math.min(STEPS.length, Math.max(1, Number(sp.step) || 1));
  const office = refs.offices.get(visit.office_id);

  if (visit.status === "done" && sp.finished === "1") return <FinishedScreen visit={visit} refs={refs} />;

  const base = `/visits/${id}`;
  return (
    <>
      <PageHeader
        title={office?.name ?? "Визит"}
        subtitle={`${refs.cities.get(office?.city_id ?? "")?.name ?? ""} · ${formatWeekdayDayMonth(visit.scheduled_date)}${visit.time ? `, ${visit.time}` : ""}`}
        back={sp.from === "history" ? "/history" : user.role === "admin" ? `/calendar?view=day&date=${visit.scheduled_date}` : "/"}
      />
      <Page>
        <Tabs
          active={tab}
          tabs={[
            { key: "visit", label: "Визит", href: visit.status === "in_progress" ? `${base}?step=${step}` : base },
            { key: "prev", label: "Прошлый визит", href: `${base}?tab=prev` },
            { key: "info", label: "Инфо", href: `${base}?tab=info` },
          ]}
        />
        {tab === "visit" && visit.status === "in_progress" && <Wizard visit={visit} refs={refs} step={step} />}
        {tab === "visit" && visit.status === "planned" && <StartScreen visit={visit} refs={refs} />}
        {tab === "visit" && visit.status === "done" && <VisitReport visit={visit} refs={refs} />}
        {tab === "visit" && visit.status === "skipped" && (
          <EmptyState>
            Визит отменён.
            {visit.notes && <span className="mt-1 block text-ink">{visit.notes}</span>}
          </EmptyState>
        )}
        {tab === "prev" && <PrevTab visit={visit} refs={refs} />}
        {tab === "info" && <InfoTab visit={visit} refs={refs} user={user} />}
      </Page>
    </>
  );
}

async function openRequestsFor(officeId: string) {
  return db().select("supply_requests", { eq: { office_id: officeId, status: "open" } }, [{ column: "created_at" }]);
}

async function StartScreen({ visit, refs }: { visit: Visit; refs: Refs }) {
  const today = todayISO();
  const office = refs.offices.get(visit.office_id);
  const [prev, requests] = await Promise.all([previousVisit(visit), openRequestsFor(visit.office_id)]);
  const prevFlagged = prev ? await db().select("visit_supplies", { eq: { visit_id: prev.id }, in: { status: ["low", "out"] } }) : [];

  return (
    <>
      <Card className="flex flex-col gap-2.5">
        <div className="flex items-start gap-3">
          <MapPin className="mt-0.5 size-5 shrink-0 text-brand-600" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{officeLabel(refs, visit.office_id)}</p>
            {office?.address && <p className="text-sm text-muted">{office.address}</p>}
          </div>
          <VisitBadge status={visit.status} date={visit.scheduled_date} today={today} />
        </div>
        <p className="inline-flex items-center gap-2 text-sm text-muted">
          <Clock className="size-4" />
          {formatWeekdayDayMonth(visit.scheduled_date)}
          {visit.time && `, ${visit.time}`}
        </p>
        <p className="inline-flex items-center gap-2 text-sm text-muted">
          <UserRound className="size-4" />
          {visitPeople(refs, visit)}
        </p>
        {visit.notes && <p className="rounded-xl bg-warn-50 px-3 py-2 text-sm text-warn-700">{visit.notes}</p>}
      </Card>

      <section className="flex flex-col gap-2">
        <SectionTitle icon={<ShoppingBag className="size-5" />}>Взять с собой</SectionTitle>
        {requests.length === 0 ? (
          <p className="px-1 text-sm text-muted">Ничего брать не нужно.</p>
        ) : (
          <Card className="divide-y divide-line p-0">
            {requests.map((r) => {
              const supply = refs.supplies.get(r.supply_id);
              return (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{supply?.name}</p>
                    <p className="text-sm text-muted">
                      {r.reason === "out" ? "Нет совсем" : `Заканчивается${supply && r.quantity != null ? `, осталось ${quantityLabel(r.quantity, supply.unit)}` : ""}`}
                      {r.created_by && ` · ${refs.profiles.get(r.created_by)?.name}, ${formatDate(dateOfTimestamp(r.created_at))}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </Card>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <SectionTitle
          action={
            prev && (
              <Link href={`/visits/${visit.id}?tab=prev`} className="text-sm font-medium text-brand-600">
                Подробнее
              </Link>
            )
          }
        >
          Прошлый визит
        </SectionTitle>
        {!prev ? (
          <p className="px-1 text-sm text-muted">Это первый визит в офис.</p>
        ) : (
          <Card className="flex flex-col gap-1.5">
            <p className="font-medium">
              {formatWeekdayDayMonth(prev.scheduled_date)} · {visitPeople(refs, prev)}
            </p>
            {prevFlagged.length > 0 ? (
              <p className="text-sm text-warn-700">
                Заканчивалось: {prevFlagged.map((s) => refs.supplies.get(s.supply_id)?.name).filter(Boolean).join(", ")}
              </p>
            ) : (
              <p className="text-sm text-muted">Всё было в порядке.</p>
            )}
            {prev.notes && <p className="text-sm">«{prev.notes}»</p>}
          </Card>
        )}
      </section>

      <form action={beginVisit}>
        <input type="hidden" name="id" value={visit.id} />
        <button type="submit" className={cx(buttonStyles.primary, "w-full")}>
          Начать визит
        </button>
      </form>
      {visit.scheduled_date > today && <p className="-mt-2 text-center text-sm text-muted">Визит запланирован на {formatDate(visit.scheduled_date)}.</p>}
    </>
  );
}

function StepNav({ visitId, step }: { visitId: string; step: number }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {step > 1 ? (
        <LinkButton href={`/visits/${visitId}?step=${step - 1}`} variant="outline">
          <ChevronLeft className="size-5" />
          Назад
        </LinkButton>
      ) : (
        <span />
      )}
      {step < STEPS.length && (
        <LinkButton href={`/visits/${visitId}?step=${step + 1}`}>
          Далее
          <ChevronRight className="size-5" />
        </LinkButton>
      )}
    </div>
  );
}

async function Wizard({ visit, refs, step }: { visit: Visit; refs: Refs; step: number }) {
  const store = db();
  const [tasks, visitTasks, visitSupplies, requests, photos] = await Promise.all([
    store.select("tasks", { eq: { office_id: visit.office_id } }, [{ column: "sort_order" }]),
    store.select("visit_tasks", { eq: { visit_id: visit.id } }),
    store.select("visit_supplies", { eq: { visit_id: visit.id } }),
    openRequestsFor(visit.office_id),
    store.select("photos", { eq: { visit_id: visit.id } }, [{ column: "created_at" }]),
  ]);
  const def = STEPS[step - 1];
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const stepTasks = visitTasks
    .filter((vt) => def.tasks.includes(taskById.get(vt.task_id)?.category as TaskCategory))
    .sort((a, b) => def.tasks.indexOf(taskById.get(a.task_id)!.category) - def.tasks.indexOf(taskById.get(b.task_id)!.category) || taskById.get(a.task_id)!.sort_order - taskById.get(b.task_id)!.sort_order);
  const stepSupplies = visitSupplies
    .filter((vs) => def.supplies.includes(refs.supplies.get(vs.supply_id)?.category as SupplyCategory))
    .sort((a, b) => (refs.supplies.get(a.supply_id)?.sort_order ?? 0) - (refs.supplies.get(b.supply_id)?.sort_order ?? 0));
  const requestBySupply = new Map(requests.map((r) => [r.supply_id, r]));

  return (
    <>
      <ol className="flex gap-1.5" aria-label="Шаги визита">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex flex-1 flex-col gap-1">
            <Link href={`/visits/${visit.id}?step=${i + 1}`} aria-current={i + 1 === step ? "step" : undefined} className="flex flex-col gap-1">
              <span className={cx("h-1.5 rounded-full", i + 1 <= step ? "bg-brand-600" : "bg-line")} />
              <span className={cx("truncate text-[11px]", i + 1 === step ? "font-semibold text-ink" : "text-muted")}>{s.title}</span>
            </Link>
          </li>
        ))}
      </ol>
      <h2 className="text-xl font-bold">
        Шаг {step}. {def.title}
      </h2>

      {step < STEPS.length ? (
        <>
          {stepTasks.length > 0 && (
            <Card className="divide-y divide-line py-1">
              {stepTasks.map((vt) => {
                const t = taskById.get(vt.task_id)!;
                return <TaskRow key={vt.id} id={vt.id} name={t.name} doneLabel={t.done_label} frequency={t.frequency} required={t.required} status={vt.status} />;
              })}
            </Card>
          )}
          {stepSupplies.length > 0 && (
            <section className="flex flex-col gap-2">
              <h3 className="px-1 text-[15px] font-semibold">Расходные материалы</h3>
              <Card className="divide-y divide-line py-1">
                {stepSupplies.map((vs) => {
                  const supply = refs.supplies.get(vs.supply_id)!;
                  const r = requestBySupply.get(vs.supply_id);
                  return (
                    <SupplyRow
                      key={vs.id}
                      id={vs.id}
                      visitId={visit.id}
                      name={supply.name}
                      unit={supply.unit}
                      quantity={vs.quantity}
                      status={vs.status}
                      request={
                        r
                          ? {
                              id: r.id,
                              fromThisVisit: r.created_from_visit_id === visit.id,
                              byName: r.created_by ? refs.profiles.get(r.created_by)?.name ?? null : null,
                              date: formatDate(dateOfTimestamp(r.created_at)),
                            }
                          : null
                      }
                    />
                  );
                })}
              </Card>
            </section>
          )}
          {stepTasks.length === 0 && stepSupplies.length === 0 && <EmptyState>На этом шаге задач нет.</EmptyState>}
        </>
      ) : (
        <Card className="flex flex-col gap-4">
          <PhotoUploader visitId={visit.id} photos={photos} />
          <FinishForm visitId={visit.id} notes={visit.notes} />
        </Card>
      )}
      <StepNav visitId={visit.id} step={step} />
    </>
  );
}

async function PrevTab({ visit, refs }: { visit: Visit; refs: Refs }) {
  const prev = await previousVisit(visit);
  if (!prev) return <EmptyState>Предыдущих визитов в этот офис ещё не было.</EmptyState>;
  return <VisitReport visit={prev} refs={refs} />;
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5">
      <span className="text-sm text-muted">{label}</span>
      <div className="text-[15px]">{children}</div>
    </div>
  );
}

function InfoTab({ visit, refs, user }: { visit: Visit; refs: Refs; user: Profile }) {
  const office = refs.offices.get(visit.office_id);
  const people = [visit.employee_1_id, visit.employee_2_id].filter(Boolean).map((pid) => refs.profiles.get(pid!)).filter(Boolean);
  const editable = user.role === "admin" && (visit.status === "planned" || visit.status === "skipped");
  return (
    <>
      <Card className="divide-y divide-line py-1.5">
        <InfoRow label="Офис">{officeLabel(refs, visit.office_id)}</InfoRow>
        <InfoRow label="Адрес">{office?.address || "—"}</InfoRow>
        <InfoRow label="Контактное лицо">{office?.contact_name || "—"}</InfoRow>
        <InfoRow label="Телефон">
          {office?.contact_phone ? (
            <a href={`tel:${office.contact_phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 font-medium text-brand-600">
              <Phone className="size-4" />
              {office.contact_phone}
            </a>
          ) : (
            "—"
          )}
        </InfoRow>
        <InfoRow label="Сотрудники">
          <ul className="mt-1 flex flex-col gap-2">
            {people.map((p) => (
              <li key={p!.id} className="flex items-center gap-2">
                <Avatar name={p!.name} size={28} />
                {p!.name}
              </li>
            ))}
          </ul>
        </InfoRow>
        <InfoRow label="Комментарий к офису">{office?.notes || "—"}</InfoRow>
        <InfoRow label="Тип визита">
          {visit.schedule_id ? (visit.is_override ? "По расписанию, изменён вручную" : "По расписанию") : "Разовый"}
        </InfoRow>
      </Card>
      <LinkButton href={`/offices/${visit.office_id}`} variant="outline">
        Карточка офиса
      </LinkButton>
      {editable && (
        <LinkButton href={`/visits/${visit.id}/edit`} variant="outline">
          <Pencil className="size-5" />
          Изменить этот визит
        </LinkButton>
      )}
    </>
  );
}

function FinishedScreen({ visit, refs }: { visit: Visit; refs: Refs }) {
  return (
    <div className="flex min-h-[80dvh] flex-col items-center justify-center gap-5 px-6 text-center">
      <CheckCircle2 className="size-20 text-brand-600" strokeWidth={1.5} />
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold">Визит завершён</h1>
        <p className="text-muted">
          {officeLabel(refs, visit.office_id)} · {formatWeekdayDayMonth(visit.scheduled_date)}
        </p>
        <p className="text-muted">Спасибо! Отчёт сохранён, список «Взять с собой» обновлён.</p>
      </div>
      <div className="flex w-full flex-col gap-3">
        <LinkButton href="/">На главную</LinkButton>
        <LinkButton href={`/visits/${visit.id}`} variant="outline">
          Посмотреть отчёт
        </LinkButton>
      </div>
    </div>
  );
}
