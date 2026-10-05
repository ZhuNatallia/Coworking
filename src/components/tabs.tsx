import Link from "next/link";
import { cx } from "./ui";

export function Tabs({ tabs, active }: { tabs: { key: string; label: string; href: string }[]; active: string }) {
  return (
    <div className="flex rounded-xl bg-white p-1 shadow-[inset_0_0_0_1px_var(--color-line)]" role="tablist">
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
            t.key === active ? "bg-brand-600 text-white" : "text-muted",
          )}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
