import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { DeliverButton, UndoButton } from "@/components/take-buttons";
import { Tabs } from "@/components/tabs";
import { Card, EmptyState, Page, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/current";
import { dateOfTimestamp, formatDate, formatDateTime, formatWeekdayDayMonth } from "@/lib/dates";
import { quantityLabel } from "@/lib/labels";
import { takeItems, type TakeItem } from "@/lib/queries";

function groupByOffice(items: TakeItem[]) {
  const groups = new Map<string, TakeItem[]>();
  for (const item of items) groups.set(item.request.office_id, [...(groups.get(item.request.office_id) ?? []), item]);
  return [...groups.values()];
}

export default async function TakePage(props: PageProps<"/take">) {
  const user = await requireUser();
  const { tab } = await props.searchParams;
  const done = tab === "done";
  const items = await takeItems(user, { status: done ? "done" : "open" });
  const admin = user.role === "admin";

  return (
    <>
      <PageHeader title="Взять с собой" subtitle={admin ? "Все офисы" : "Мои офисы"} />
      <Page>
        <Tabs
          active={done ? "done" : "open"}
          tabs={[
            { key: "open", label: "Актуальные", href: "/take" },
            { key: "done", label: "Выполненные", href: "/take?tab=done" },
          ]}
        />
        {!done && items.length > 0 && (
          <p className="px-1 text-sm text-muted">Отметьте галочкой, когда привезёте материал в офис. Статус в офисе станет «Достаточно».</p>
        )}
        {items.length === 0 ? (
          <EmptyState>{done ? "За последние 30 дней ничего не привозили." : "Ничего брать не нужно — всего достаточно."}</EmptyState>
        ) : done ? (
          <Card className="divide-y divide-line p-0">
            {items.map((item) => (
              <div key={item.request.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.supply.name}</p>
                  <p className="truncate text-sm text-muted">{item.officeLabel}</p>
                  <p className="text-xs text-muted">
                    Привёз(ла) {item.completedByName ?? "—"}
                    {item.request.completed_at && `, ${formatDateTime(item.request.completed_at)}`}
                  </p>
                </div>
                <UndoButton requestId={item.request.id} />
              </div>
            ))}
          </Card>
        ) : (
          groupByOffice(items).map((group) => {
            const first = group[0];
            return (
              <section key={first.request.office_id} className="flex flex-col gap-2">
                <div className="flex items-end justify-between gap-2 px-1">
                  <Link href={`/offices/${first.request.office_id}?tab=supplies`} className="font-semibold">
                    {first.officeLabel}
                  </Link>
                  {first.nextVisit && (
                    <Link href={`/visits/${first.nextVisit.id}`} className="inline-flex items-center gap-1 text-sm text-brand-600">
                      <CalendarDays className="size-4" />
                      {formatWeekdayDayMonth(first.nextVisit.scheduled_date)}
                    </Link>
                  )}
                </div>
                <Card className="divide-y divide-line p-0">
                  {group.map((item) => {
                    const left = quantityLabel(item.request.quantity, item.supply.unit);
                    return (
                      <div key={item.request.id} id={item.request.id} className="flex scroll-mt-20 items-start gap-3 px-4 py-3 target:bg-brand-50">
                        <DeliverButton requestId={item.request.id} label={item.supply.name} />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{item.supply.name}</p>
                          <p className={`text-sm ${item.request.reason === "out" ? "text-danger-700" : "text-warn-700"}`}>
                            {item.request.reason === "out" ? "Нет совсем" : `Заканчивается${left ? `, осталось ${left}` : ""}`}
                          </p>
                          <p className="text-xs text-muted">
                            Отметил(а) {item.createdByName ?? "—"}, {formatDate(dateOfTimestamp(item.request.created_at))}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </Card>
              </section>
            );
          })
        )}
      </Page>
    </>
  );
}
