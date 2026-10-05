import Link from "next/link";
import { Camera, CheckCircle2, ShoppingBasket } from "lucide-react";
import { AutoSubmitForm } from "@/components/auto-submit-form";
import { Card, EmptyState, inputClass, Page, PageHeader, VisitBadge } from "@/components/ui";
import { requireUser } from "@/lib/auth/current";
import { db } from "@/lib/db";
import { addDays, formatWeekdayDayMonth, todayISO } from "@/lib/dates";
import { loadRefs, myOfficeIds, officeLabel, visitPeople } from "@/lib/queries";
import type { Visit } from "@/lib/types";

const PERIODS = [
  { key: "30", label: "30 дней", days: 30 },
  { key: "90", label: "3 месяца", days: 90 },
  { key: "365", label: "Год", days: 365 },
  { key: "all", label: "Всё время", days: null },
] as const;

const LIMIT = 60;

function one(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

export default async function HistoryPage(props: PageProps<"/history">) {
  const user = await requireUser();
  const sp = await props.searchParams;
  const admin = user.role === "admin";
  const refs = await loadRefs();
  const allowed = await myOfficeIds(user);
  const today = todayISO();

  const offices = [...refs.offices.values()].filter((o) => allowed.has(o.id));
  const cities = [...refs.cities.values()].filter((c) => offices.some((o) => o.city_id === c.id));
  const employees = [...refs.profiles.values()].filter((p) => p.active);

  const city = cities.some((c) => c.id === one(sp.city)) ? one(sp.city) : "";
  const officeParam = one(sp.office);
  const office = offices.some((o) => o.id === officeParam && (!city || o.city_id === city)) ? officeParam : "";
  const employee = admin && employees.some((p) => p.id === one(sp.employee)) ? one(sp.employee) : "";
  const period = PERIODS.find((p) => p.key === one(sp.period)) ?? PERIODS[1];

  const officeIds = office
    ? [office]
    : offices.filter((o) => !city || o.city_id === city).map((o) => o.id);

  const store = db();
  const visits: Visit[] = officeIds.length
    ? (
        await store.select(
          "visits",
          {
            in: { office_id: officeIds },
            lte: { scheduled_date: today },
            ...(period.days ? { gte: { scheduled_date: addDays(today, -period.days) } } : {}),
          },
          [{ column: "scheduled_date", ascending: false }, { column: "time", ascending: false }],
        )
      )
        .filter((v) => v.status === "done" || v.status === "skipped" || (v.status === "planned" && v.scheduled_date < today))
        .filter((v) => !employee || v.employee_1_id === employee || v.employee_2_id === employee || v.completed_by === employee)
    : [];
  const shown = visits.slice(0, LIMIT);
  const ids = shown.map((v) => v.id);

  const [tasks, photos, requests] = ids.length
    ? await Promise.all([
        store.select("visit_tasks", { in: { visit_id: ids } }),
        store.select("photos", { in: { visit_id: ids } }),
        store.select("supply_requests", { in: { created_from_visit_id: ids } }),
      ])
    : [[], [], []];

  const stats = (visitId: string) => {
    const own = tasks.filter((t) => t.visit_id === visitId && t.status !== "not_needed");
    return {
      done: own.filter((t) => t.status === "done").length,
      total: own.length,
      photos: photos.filter((p) => p.visit_id === visitId).length,
      requested: requests
        .filter((r) => r.created_from_visit_id === visitId)
        .map((r) => refs.supplies.get(r.supply_id)?.name)
        .filter(Boolean),
    };
  };

  return (
    <>
      <PageHeader title="История" subtitle="Прошлые визиты и отчёты" back="/more" />
      <Page>
        <AutoSubmitForm action="/history" className="grid grid-cols-2 gap-2">
          <select name="city" defaultValue={city} aria-label="Город" className={inputClass}>
            <option value="">Все города</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select name="office" defaultValue={office} aria-label="Офис" className={inputClass}>
            <option value="">Все офисы</option>
            {offices
              .filter((o) => !city || o.city_id === city)
              .map((o) => (
                <option key={o.id} value={o.id}>
                  {city ? o.name : officeLabel(refs, o.id)}
                </option>
              ))}
          </select>
          <select name="period" defaultValue={period.key} aria-label="Период" className={inputClass}>
            {PERIODS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
          {admin ? (
            <select name="employee" defaultValue={employee} aria-label="Сотрудник" className={inputClass}>
              <option value="">Все сотрудники</option>
              {employees.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          ) : (
            <span />
          )}
          <noscript>
            <button type="submit" className="col-span-2 min-h-12 rounded-xl bg-brand-600 font-semibold text-white">
              Показать
            </button>
          </noscript>
        </AutoSubmitForm>

        {(city || office || employee || period.key !== PERIODS[1].key) && (
          <div className="flex items-center justify-between px-1 text-sm">
            <span className="text-muted">Найдено визитов: {visits.length}</span>
            <Link href="/history" className="font-medium text-brand-600">
              Сбросить фильтры
            </Link>
          </div>
        )}

        {shown.length === 0 ? (
          <EmptyState>За выбранный период визитов нет.</EmptyState>
        ) : (
          <Card className="divide-y divide-line p-0">
            {shown.map((v) => {
              const s = stats(v.id);
              return (
                <Link key={v.id} href={`/visits/${v.id}?from=history`} className="flex flex-col gap-1 px-4 py-3 active:bg-canvas">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold">{formatWeekdayDayMonth(v.scheduled_date)}</p>
                      <p className="truncate text-sm text-muted">
                        {officeLabel(refs, v.office_id)} · {visitPeople(refs, v)}
                      </p>
                    </div>
                    <VisitBadge status={v.status} date={v.scheduled_date} today={today} />
                  </div>
                  {v.status === "done" && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 className="size-3.5 text-brand-600" />
                        {s.done} из {s.total} задач
                      </span>
                      {s.photos > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Camera className="size-3.5" />
                          {s.photos} фото
                        </span>
                      )}
                      {s.requested.length > 0 && (
                        <span className="inline-flex min-w-0 items-center gap-1 text-warn-700">
                          <ShoppingBasket className="size-3.5 shrink-0" />
                          <span className="truncate">{s.requested.join(", ")}</span>
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              );
            })}
          </Card>
        )}
        {visits.length > LIMIT && <p className="text-center text-sm text-muted">Показаны последние {LIMIT}. Уточните фильтры, чтобы увидеть остальные.</p>}
      </Page>
    </>
  );
}
