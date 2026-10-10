import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { DeliverButton, UndoButton } from "@/components/take-buttons";
import { Tabs } from "@/components/tabs";
import { Card, cx, EmptyState, OfficeDot, Page, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/current";
import { dateOfTimestamp } from "@/lib/dates";
import { getI18n } from "@/lib/i18n/server";
import { officeColorVars } from "@/lib/office-colors";
import { takeItems, type TakeItem } from "@/lib/queries";

function groupByOffice(items: TakeItem[]) {
  const groups = new Map<string, TakeItem[]>();
  for (const item of items) groups.set(item.request.office_id, [...(groups.get(item.request.office_id) ?? []), item]);
  return [...groups.values()];
}

export default async function TakePage(props: PageProps<"/take">) {
  const user = await requireUser();
  const { t, fmt } = await getI18n();
  const { tab } = await props.searchParams;
  const done = tab === "done";
  const items = await takeItems(user, { status: done ? "done" : "open" });
  const admin = user.role === "admin";

  return (
    <>
      <PageHeader title={t("take.title")} subtitle={t(admin ? "take.allOffices" : "take.myOffices")} />
      <Page>
        <Tabs
          active={done ? "done" : "open"}
          tabs={[
            { key: "open", label: t("take.tabOpen"), href: "/take" },
            { key: "done", label: t("take.tabDone"), href: "/take?tab=done" },
          ]}
        />
        {!done && items.length > 0 && <p className="px-1 text-sm text-muted">{t("take.hint")}</p>}
        {items.length === 0 ? (
          <EmptyState>{t(done ? "take.emptyDone" : "take.emptyOpen")}</EmptyState>
        ) : done ? (
          <Card className="divide-y divide-line p-0">
            {items.map((item) => (
              <div key={item.request.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.supply.name}</p>
                  <p className="flex items-center gap-1.5 truncate text-sm text-muted">
                    <OfficeDot color={item.officeColor} className="size-2" />
                    {item.officeLabel}
                  </p>
                  <p className="text-xs text-muted">
                    {t("take.deliveredBy", { name: item.completedByName ?? "—" })}
                    {item.request.completed_at && `, ${fmt.dateTime(item.request.completed_at)}`}
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
                  <Link
                    href={`/offices/${first.request.office_id}?tab=supplies`}
                    style={officeColorVars(first.officeColor)}
                    className={cx("inline-flex items-center gap-2 font-semibold", first.officeColor && "text-office-ink")}
                  >
                    <OfficeDot color={first.officeColor} />
                    {first.officeLabel}
                  </Link>
                  {first.nextVisit && (
                    <Link href={`/visits/${first.nextVisit.id}`} className="inline-flex items-center gap-1 text-sm text-brand-600">
                      <CalendarDays className="size-4" />
                      {fmt.weekdayDayMonth(first.nextVisit.scheduled_date)}
                    </Link>
                  )}
                </div>
                <Card className="divide-y divide-line p-0">
                  {group.map((item) => {
                    const left = fmt.quantity(item.request.quantity, item.supply.unit);
                    return (
                      <div key={item.request.id} id={item.request.id} className="flex scroll-mt-20 items-start gap-3 px-4 py-3 target:bg-brand-50">
                        <DeliverButton requestId={item.request.id} label={item.supply.name} />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{item.supply.name}</p>
                          <p className={`text-sm ${item.request.reason === "out" ? "text-danger-700" : "text-warn-700"}`}>
                            {item.request.reason === "out" ? t("take.out") : left ? t("take.lowLeft", { qty: left }) : t("take.low")}
                          </p>
                          {item.request.note && <p className="text-sm text-ink">{item.request.note}</p>}
                          {item.photos.length > 0 && (
                            <div className="mt-2 flex gap-2">
                              {item.photos.map((photo) => (
                                <a key={photo.id} href={`/api/photos/${photo.id}`} target="_blank" rel="noreferrer" className="block size-16 overflow-hidden rounded-lg bg-canvas">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={`/api/photos/${photo.id}`} alt={t("photos.altSupply")} className="size-full object-cover" />
                                </a>
                              ))}
                            </div>
                          )}
                          <p className="text-xs text-muted">
                            {t("take.markedBy", { name: item.createdByName ?? "—", date: fmt.date(dateOfTimestamp(item.request.created_at)) })}
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
