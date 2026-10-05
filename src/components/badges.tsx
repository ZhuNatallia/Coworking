"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import type { RequestStatus, SupplyStatus, VisitStatus } from "@/lib/types";
import { cx, displayVisitStatus } from "./ui-core";

const visitBadge: Record<VisitStatus, string> = {
  planned: "bg-canvas text-muted",
  in_progress: "bg-warn-50 text-warn-700",
  done: "bg-brand-50 text-brand-700",
  skipped: "bg-danger-50 text-danger-700",
};

export function VisitBadge({ status, date, today }: { status: VisitStatus; date?: string; today?: string }) {
  const { t } = useI18n();
  const { label, tone } = date && today ? displayVisitStatus(status, date, today) : { label: status, tone: status };
  return (
    <span className={cx("inline-flex shrink-0 items-center rounded-lg px-2.5 py-1 text-xs font-semibold", visitBadge[tone])}>
      {t(`visitStatus.${label}`)}
    </span>
  );
}

const supplyBadge: Record<SupplyStatus, string> = {
  ok: "bg-brand-50 text-brand-700",
  low: "bg-warn-50 text-warn-700",
  out: "bg-danger-50 text-danger-700",
};

export function SupplyBadge({ status }: { status: SupplyStatus | null }) {
  const { t } = useI18n();
  if (!status) return <span className="rounded-lg bg-canvas px-2.5 py-1 text-xs font-semibold text-muted">{t("supplyStatus.unset")}</span>;
  return <span className={cx("rounded-lg px-2.5 py-1 text-xs font-semibold", supplyBadge[status])}>{t(`supplyStatus.${status}`)}</span>;
}

export function RequestBadge({ status }: { status: RequestStatus }) {
  const { t } = useI18n();
  const tone = status === "open" ? "bg-warn-50 text-warn-700" : status === "delivered" ? "bg-brand-50 text-brand-700" : "bg-canvas text-muted";
  return <span className={cx("rounded-lg px-2.5 py-1 text-xs font-semibold", tone)}>{t(`requestStatus.${status}`)}</span>;
}

export function BackLink({ href }: { href: string }) {
  const { t } = useI18n();
  return (
    <Link href={href} aria-label={t("common.back")} className="-ml-2 flex size-10 shrink-0 items-center justify-center rounded-full text-ink active:bg-canvas">
      <ChevronLeft className="size-6" />
    </Link>
  );
}
