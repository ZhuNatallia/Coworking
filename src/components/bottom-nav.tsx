"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, MoreHorizontal, ShoppingBag } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/core";
import { cx } from "./ui-core";

const ITEMS: { href: string; label: MessageKey; icon: typeof Home }[] = [
  { href: "/", label: "nav.home", icon: Home },
  { href: "/take", label: "nav.take", icon: ShoppingBag },
  { href: "/calendar", label: "nav.calendar", icon: CalendarDays },
  { href: "/more", label: "nav.more", icon: MoreHorizontal },
];

const MORE_PATHS = ["/more", "/history", "/profile", "/admin"];

function isActive(href: string, pathname: string, items: { href: string }[]) {
  if (href === "/") return pathname === "/" || pathname.startsWith("/visits") || pathname.startsWith("/offices");
  if (pathname === href || pathname.startsWith(`${href}/`)) return true;
  if (href === "/more") {
    const claimed = items.some((i) => i.href !== "/more" && i.href !== "/" && (pathname === i.href || pathname.startsWith(`${i.href}/`)));
    return !claimed && MORE_PATHS.some((p) => pathname.startsWith(p));
  }
  return false;
}

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useI18n();
  const items = ITEMS;
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[430px] border-t border-line bg-surface" aria-label={t("nav.menu")}>
      <ul className="flex">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(href, pathname, items);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cx(
                  "flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium",
                  active ? "text-brand-600" : "text-muted",
                )}
                aria-current={active ? "page" : undefined}
              >
                <span className={cx("flex h-7 w-12 items-center justify-center rounded-full", active && "bg-brand-50")}>
                  <Icon className="size-[22px]" strokeWidth={active ? 2.3 : 1.8} />
                </span>
                {t(label)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
