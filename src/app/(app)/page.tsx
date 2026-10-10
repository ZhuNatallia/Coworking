import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { Avatar, Card, cx, displayVisitStatus, EmptyState, LinkButton, ListLink, Page, PageHeader, SectionTitle } from "@/components/ui";
import { requireUser } from "@/lib/auth/current";
import { todayISO } from "@/lib/dates";
import { ensureVisitsGenerated } from "@/lib/domain/schedule";
import { getI18n } from "@/lib/i18n/server";
import { officeColorVars } from "@/lib/office-colors";
import { loadRefs, myOfficeIds, shortAddress, visitsInRange, type Refs } from "@/lib/queries";
import type { Profile } from "@/lib/types";

export default async function HomePage() {
  const user = await requireUser();
  await ensureVisitsGenerated();
  const today = todayISO();
  const { t, fmt } = await getI18n();
  const refs = await loadRefs();
  const admin = user.role === "admin";
  const todays = await visitsInRange(user, today, today);
  const done = todays.filter((v) => v.status === "done").length;
  const notDone = todays.filter((v) => displayVisitStatus(v.status, v.scheduled_date, today).label === "missed" || v.status === "skipped").length;

  return (
    <>
      <PageHeader title={t(admin ? "home.adminTitle" : "home.title")} subtitle={fmt.weekdayDayMonth(today)} action={<HeaderAvatar user={user} />} />
      <Page>
        <div className="grid grid-cols-2 gap-2">
          <Stat label={t("home.statDone")} value={done} tone="text-brand-600" />
          <Stat label={t("home.statNotDone")} value={notDone} tone="text-danger-700" />
        </div>
        <OfficeList user={user} refs={refs} />
        {admin && (
          <LinkButton href="/offices/new">
            <Plus className="size-5" />
            {t("offices.add")}
          </LinkButton>
        )}
      </Page>
    </>
  );
}

async function HeaderAvatar({ user }: { user: Profile }) {
  const { t } = await getI18n();
  return (
    <Link href="/profile" aria-label={t("home.profile")}>
      <Avatar name={user.name} size={40} />
    </Link>
  );
}

async function OfficeList({ user, refs }: { user: Profile; refs: Refs }) {
  const { t } = await getI18n();
  const admin = user.role === "admin";
  const allowed = await myOfficeIds(user);
  const offices = [...refs.offices.values()].filter((o) => allowed.has(o.id) && (admin || o.active));
  const cities = [...refs.cities.values()];

  return (
    <section className="flex flex-col gap-4">
      <SectionTitle icon={<Building2 className="size-5" />}>{t("nav.offices")}</SectionTitle>
      {offices.length === 0 && <EmptyState>{t("offices.noneAssigned")}</EmptyState>}
      {cities.map((city) => {
        const list = offices.filter((o) => o.city_id === city.id).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
        if (!list.length) return null;
        return (
          <div key={city.id} className="flex flex-col gap-2">
            <h2 className="px-1 text-[15px] font-semibold">{city.name}</h2>
            <Card className="divide-y divide-line p-0">
              {list.map((o) => (
                <ListLink key={o.id} href={`/offices/${o.id}`}>
                  <div className="flex items-center gap-3" style={officeColorVars(o.color)}>
                    <span
                      className={cx(
                        "flex size-10 shrink-0 items-center justify-center rounded-xl",
                        o.color ? "bg-office text-office-on ring-1 ring-inset ring-black/10" : "bg-brand-50 text-brand-600",
                      )}
                    >
                      <Building2 className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className={cx("font-medium", o.color && "text-office-ink")}>
                        {o.name}
                        {!o.active && <span className="ml-2 text-xs text-muted">{t("common.disabled")}</span>}
                      </p>
                      <p className="truncate text-sm text-muted">{shortAddress(o.address) || t("offices.noAddress")}</p>
                    </div>
                  </div>
                </ListLink>
              ))}
            </Card>
          </div>
        );
      })}
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 rounded-xl bg-surface px-3 py-2 shadow-[inset_0_0_0_1px_var(--color-line)]">
      <p className="text-[13px] text-muted">{label}</p>
      <p className={cx("text-lg font-semibold tabular-nums", tone)}>{value}</p>
    </div>
  );
}
