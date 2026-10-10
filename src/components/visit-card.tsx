import { Clock, MapPin, UserRound } from "lucide-react";
import { Card, cx, LinkButton, VisitBadge } from "@/components/ui";
import { getI18n } from "@/lib/i18n/server";
import { officeColorVars } from "@/lib/office-colors";
import { officeLabel, visitPeople, type Refs } from "@/lib/queries";
import type { Visit } from "@/lib/types";

export async function VisitCard({ visit, refs, today, canWork }: { visit: Visit; refs: Refs; today: string; canWork: boolean }) {
  const { t } = await getI18n();
  const office = refs.offices.get(visit.office_id);
  const colored = officeColorVars(office?.color);
  const action =
    visit.status === "done"
      ? t("visitCard.report")
      : visit.status === "in_progress"
        ? t("visitCard.continue")
        : canWork
          ? t("visitCard.open")
          : t("visitCard.details");
  return (
    <Card className={cx("flex flex-col gap-3", colored && "border-l-[6px] border-l-office")} style={colored}>
      <div className="flex items-start gap-3">
        <span
          className={cx(
            "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full",
            colored ? "bg-office text-office-on ring-1 ring-inset ring-black/10" : "bg-brand-50 text-brand-600",
          )}
        >
          <MapPin className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className={cx("font-semibold leading-tight", colored && "text-office-ink")}>{officeLabel(refs, visit.office_id)}</p>
          {office?.address && <p className="truncate text-sm text-muted">{office.address}</p>}
        </div>
        <VisitBadge status={visit.status} date={visit.scheduled_date} today={today} />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        {visit.time && (
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-4" />
            {visit.time}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <UserRound className="size-4" />
          {t("visitCard.responsible")} <span className="text-ink">{visitPeople(refs, visit, t)}</span>
        </span>
      </div>
      <LinkButton href={`/visits/${visit.id}`} variant={visit.status === "done" ? "outline" : "primary"}>
        {action}
      </LinkButton>
    </Card>
  );
}
