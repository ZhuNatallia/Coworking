import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { Card, EmptyState, SectionTitle } from "@/components/ui";
import { getI18n } from "@/lib/i18n/server";
import type { TakeItem } from "@/lib/queries";

export async function TakePreview({ items, limit = 5 }: { items: TakeItem[]; limit?: number }) {
  const { t } = await getI18n();
  return (
    <section className="flex flex-col gap-2">
      <SectionTitle
        icon={<ShoppingBag className="size-5" />}
        action={
          <Link href="/take" className="text-sm font-medium text-brand-600">
            {t("take.seeAll")}
          </Link>
        }
      >
        {t("take.title")}
      </SectionTitle>
      {items.length === 0 ? (
        <EmptyState>{t("take.emptyOpen")}</EmptyState>
      ) : (
        <Card className="divide-y divide-line p-0">
          {items.slice(0, limit).map((item) => (
            <Link key={item.request.id} href={`/take#${item.request.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-canvas">
              <span
                className={`size-6 shrink-0 rounded-md border-2 ${item.request.reason === "out" ? "border-danger-200 bg-danger-50" : "border-warn-200 bg-warn-50"}`}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{item.supply.name}</p>
                <p className="truncate text-sm text-muted">{item.officeLabel}</p>
              </div>
              <span className={`text-xs font-semibold ${item.request.reason === "out" ? "text-danger-700" : "text-warn-700"}`}>
                {t(item.request.reason === "out" ? "supplyStatus.out" : "supplyStatus.low")}
              </span>
            </Link>
          ))}
          {items.length > limit && (
            <Link href="/take" className="block px-4 py-3 text-center text-sm font-medium text-brand-600">
              {t("take.moreCount", { count: items.length - limit })}
            </Link>
          )}
        </Card>
      )}
    </section>
  );
}
