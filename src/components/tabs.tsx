import Link from "next/link";
import { officeColorVars } from "@/lib/office-colors";
import { cx } from "./ui";

export function Tabs({
  tabs,
  active,
  color,
}: {
  tabs: { key: string; label: string; href: string }[];
  active: string;
  /** Coworking colour for the selected tab; the brand colour otherwise. */
  color?: string | null;
}) {
  return (
    <div className="flex rounded-xl bg-surface p-1 shadow-[inset_0_0_0_1px_var(--color-line)]" role="tablist" style={officeColorVars(color)}>
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          role="tab"
          aria-selected={t.key === active}
          replace
          scroll={false}
          className={cx(
            "flex min-h-10 flex-1 items-center justify-center rounded-lg text-sm font-medium",
            t.key === active ? "bg-office text-office-on" : "text-muted",
          )}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
