import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { REQUEST_STATUS_LABEL, SUPPLY_STATUS_LABEL, VISIT_STATUS_LABEL } from "@/lib/labels";
import type { RequestStatus, SupplyStatus, VisitStatus } from "@/lib/types";

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function PageHeader({
  title,
  subtitle,
  back,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: string;
  action?: ReactNode;
}) {
  return (
    <header className="pt-safe sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
      <div className="flex min-h-14 items-center gap-2 px-4 py-2">
        {back && (
          <Link href={back} aria-label="Назад" className="-ml-2 flex size-10 shrink-0 items-center justify-center rounded-full text-ink active:bg-canvas">
            <ChevronLeft className="size-6" />
          </Link>
        )}
        <div className={cx("min-w-0 flex-1", back && "text-center")}>
          <h1 className={cx("truncate font-bold text-ink", back ? "text-[17px]" : "text-2xl")}>{title}</h1>
          {subtitle && <p className="truncate text-sm text-muted">{subtitle}</p>}
        </div>
        {action ? <div className="shrink-0">{action}</div> : back ? <div className="w-8 shrink-0" /> : null}
      </div>
    </header>
  );
}

export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("flex flex-col gap-4 px-4 pb-28 pt-4", className)}>{children}</div>;
}

export function Card({ children, className, ...rest }: ComponentProps<"div">) {
  return (
    <div className={cx("rounded-2xl border border-line bg-white p-4 shadow-[0_1px_2px_rgba(16,24,20,0.04)]", className)} {...rest}>
      {children}
    </div>
  );
}

export function SectionTitle({ icon, children, action }: { icon?: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      {icon && <span className="text-brand-600">{icon}</span>}
      <h2 className="flex-1 text-[15px] font-semibold text-ink">{children}</h2>
      {action}
    </div>
  );
}

const buttonBase =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-[16px] font-semibold transition active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none";

export const buttonStyles = {
  primary: cx(buttonBase, "bg-brand-600 text-white hover:bg-brand-700"),
  secondary: cx(buttonBase, "bg-canvas text-ink hover:bg-line"),
  outline: cx(buttonBase, "border border-line bg-white text-ink hover:bg-canvas"),
  danger: cx(buttonBase, "bg-danger-50 text-danger-700 hover:bg-danger-200"),
};

export function LinkButton({
  href,
  variant = "primary",
  className,
  children,
}: {
  href: string;
  variant?: keyof typeof buttonStyles;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={cx(buttonStyles[variant], className)}>
      {children}
    </Link>
  );
}

const visitBadge: Record<VisitStatus, string> = {
  planned: "bg-canvas text-muted",
  in_progress: "bg-warn-50 text-warn-700",
  done: "bg-brand-50 text-brand-700",
  skipped: "bg-danger-50 text-danger-700",
};

export function displayVisitStatus(status: VisitStatus, date: string, today: string): { label: string; tone: VisitStatus } {
  if (status === "planned" && date < today) return { label: "Не выполнено", tone: "skipped" };
  return { label: VISIT_STATUS_LABEL[status], tone: status };
}

export function VisitBadge({ status, date, today }: { status: VisitStatus; date?: string; today?: string }) {
  const { label, tone } = date && today ? displayVisitStatus(status, date, today) : { label: VISIT_STATUS_LABEL[status], tone: status };
  return <span className={cx("inline-flex shrink-0 items-center rounded-lg px-2.5 py-1 text-xs font-semibold", visitBadge[tone])}>{label}</span>;
}

const supplyBadge: Record<SupplyStatus, string> = {
  ok: "bg-brand-50 text-brand-700",
  low: "bg-warn-50 text-warn-700",
  out: "bg-danger-50 text-danger-700",
};

export function SupplyBadge({ status }: { status: SupplyStatus | null }) {
  if (!status) return <span className="rounded-lg bg-canvas px-2.5 py-1 text-xs font-semibold text-muted">Не отмечено</span>;
  return <span className={cx("rounded-lg px-2.5 py-1 text-xs font-semibold", supplyBadge[status])}>{SUPPLY_STATUS_LABEL[status]}</span>;
}

export function RequestBadge({ status }: { status: RequestStatus }) {
  const tone = status === "open" ? "bg-warn-50 text-warn-700" : status === "delivered" ? "bg-brand-50 text-brand-700" : "bg-canvas text-muted";
  return <span className={cx("rounded-lg px-2.5 py-1 text-xs font-semibold", tone)}>{REQUEST_STATUS_LABEL[status]}</span>;
}

const AVATAR_COLORS = ["#2f8a57", "#c2410c", "#7c3aed", "#0369a1", "#be185d", "#4d7c0f", "#a16207"];

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const hash = [...name].reduce((h, c) => h + c.charCodeAt(0), 0);
  return (
    <span
      className="inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.42, background: AVATAR_COLORS[hash % AVATAR_COLORS.length] }}
      aria-hidden
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

export function ListLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={cx("flex items-center gap-3 px-4 py-3.5 active:bg-canvas", className)}>
      <div className="min-w-0 flex-1">{children}</div>
      <ChevronRight className="size-5 shrink-0 text-muted" />
    </Link>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-line bg-white/60 px-4 py-6 text-center text-sm text-muted">{children}</p>;
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "min-h-12 w-full rounded-xl border border-line bg-white px-3.5 text-[16px] text-ink outline-none placeholder:text-muted/70 focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export function FormMessage({ state }: { state?: { error?: string; ok?: string } }) {
  if (state?.error) return <p className="rounded-xl bg-danger-50 px-3.5 py-2.5 text-sm text-danger-700" role="alert">{state.error}</p>;
  if (state?.ok) return <p className="rounded-xl bg-brand-50 px-3.5 py-2.5 text-sm text-brand-700" role="status">{state.ok}</p>;
  return null;
}
