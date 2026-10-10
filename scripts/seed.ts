import { loadEnvConfig } from "@next/env";
import { createAccount, normalizeEmail, setPassword } from "@/lib/auth/accounts";
import { addDays, isoWeek, isoWeekday, todayISO } from "@/lib/dates";
import { backend, db, newId } from "@/lib/db";
import { localStore } from "@/lib/db/local-store";
import { supabaseAdmin } from "@/lib/db/supabase-store";
import { employeesFor, ensureVisitsGenerated } from "@/lib/domain/schedule";
import { DEFAULT_SUPPLIES, DEFAULT_TASKS } from "@/lib/domain/templates";
import type { Office, Profile, Schedule, SupplyStatus } from "@/lib/types";

loadEnvConfig(process.cwd());

async function main() {
  const args = new Set(process.argv.slice(2));
  const store = db();
  const password = process.env.SEED_PASSWORD || "officecare";
  const today = todayISO();
  const mode = backend();
  console.log(`Backend: ${mode}. Today: ${today}`);

  async function ensureAccount(name: string, email: string, role: Profile["role"]): Promise<Profile> {
    const [existing] = await store.select("profiles", { eq: { email: normalizeEmail(email) } });
    if (existing) {
      await setPassword(existing.id, password);
      return existing;
    }
    if (mode === "supabase") {
      const { data } = await supabaseAdmin().auth.admin.listUsers({ perPage: 1000 });
      const authUser = data?.users.find((u) => u.email === normalizeEmail(email));
      if (authUser) {
        await setPassword(authUser.id, password);
        const profile: Profile = {
          id: authUser.id,
          name,
          email: normalizeEmail(email),
          role,
          avatar: null,
          active: true,
          created_at: new Date().toISOString(),
        };
        await store.insert("profiles", [profile]);
        return profile;
      }
    }
    return createAccount({ name, email, password, role });
  }

  async function ensureSupplyCatalog() {
    const existing = await store.select("supplies");
    const names = new Set(existing.map((s) => s.name));
    const rows = DEFAULT_SUPPLIES.filter((s) => !names.has(s.name)).map((s, i) => ({
      id: newId(),
      name: s.name,
      unit: s.unit,
      category: s.category,
      active: true,
      sort_order: existing.length + i,
    }));
    await store.insert("supplies", rows);
    return [...existing, ...rows];
  }

  if (args.has("--admin-only")) {
    const email = process.env.SEED_ADMIN_EMAIL;
    const name = process.env.SEED_ADMIN_NAME || "Администратор";
    if (!email) throw new Error("Set SEED_ADMIN_EMAIL (and SEED_PASSWORD) for --admin-only");
    const admin = await ensureAccount(name, email, "admin");
    await ensureSupplyCatalog();
    console.log(`Admin ready: ${admin.email} / password from SEED_PASSWORD`);
    return;
  }

  const hasData = (await store.select("cities")).length > 0;
  if (hasData && !args.has("--reset")) {
    console.log("Data already exists. Run `npm run seed -- --reset` to wipe it and load demo data again.");
    return;
  }
  if (hasData || args.has("--reset")) {
    if (mode === "local") {
      localStore.reset();
    } else {
      const order = [
        "office_mail",
        "day_marks",
        "photos",
        "visit_supplies",
        "visit_tasks",
        "supply_requests",
        "visits",
        "schedules",
        "office_supplies",
        "tasks",
        "offices",
        "cities",
        "supplies",
        "app_settings",
      ] as const;
      for (const t of order) await store.remove(t, { neq: { id: null } });
    }
    console.log("Existing data removed.");
  }

  const anna = await ensureAccount("Anna", "anna@example.com", "admin");
  const peter = await ensureAccount("Peter", "peter@example.com", "employee");
  const maria = await ensureAccount("Maria", "maria@example.com", "employee");
  const max = await ensureAccount("Max", "max@example.com", "employee");

  const now = new Date().toISOString();
  // The Allgäu Coworking locations, https://www.allgaeu-coworking.de/
  const officeDefs = [
    { key: "green", city: "Marktoberdorf", name: "The Green Room", address: "Marktplatz 10, 87616 Marktoberdorf" },
    { key: "grey", city: "Kaufbeuren", name: "The Grey House", address: "Lindauer Str. 2-4, 87600 Kaufbeuren" },
    { key: "blue", city: "Füssen", name: "The Blue Studio", address: "Kemptener Str. 7, 87629 Füssen" },
    { key: "purple", city: "Schongau", name: "The Purple Place", address: "Jugendheimweg 3b, 86956 Schongau" },
    { key: "white", city: "Weissensee", name: "The White Lake", address: "Seeweg 4, 87629 Weissensee" },
    { key: "lime", city: "Buchloe", name: "The Lime Lounge", address: "Alpina-Ring 9, 86807 Buchloe" },
  ] as const;
  const cityRows = officeDefs.map((o, i) => ({ id: newId(), name: o.city, sort_order: i, created_at: now }));
  await store.insert("cities", cityRows);
  const offices = Object.fromEntries(
    officeDefs.map((o, i) => [
      o.key,
      {
        id: newId(),
        city_id: cityRows[i].id,
        name: o.name,
        address: o.address,
        contact_name: "Allgäu Coworking GmbH",
        contact_phone: "+49 8342 7040800",
        notes: o.key === "green" ? "Ключ в цифровом ключ-боксе у входа." : null,
        color: o.key,
        active: true,
        created_at: now,
      },
    ]),
  ) as Record<(typeof officeDefs)[number]["key"], Office>;
  await store.insert("offices", Object.values(offices));

  const supplies = await ensureSupplyCatalog();
  const supplyByName = new Map(supplies.map((s) => [s.name, s]));
  const defaultQty: Record<string, number> = {
    Вода: 6,
    "Кофе в зернах": 2,
    "Кофе в капсулах": 30,
    "Мочалка для посуды": 3,
    "Жидкое мыло": 2,
    "Туалетная бумага": 8,
    Полотенца: 6,
    "Бумага для печати": 3,
    Тонер: 1,
    "Моющие средства": 2,
  };

  for (const office of Object.values(offices)) {
    await store.insert(
      "tasks",
      DEFAULT_TASKS.map((t, i) => ({ id: newId(), office_id: office.id, ...t, active: true, sort_order: i })),
    );
    await store.insert(
      "office_supplies",
      supplies.map((s, i) => ({
        id: newId(),
        office_id: office.id,
        supply_id: s.id,
        quantity: defaultQty[s.name] ?? null,
        status: "ok" as SupplyStatus,
        low_threshold: null,
        critical_threshold: null,
        sort_order: i,
        note: null,
        updated_at: now,
        updated_by: null,
      })),
    );
  }

  const wd = isoWeekday(today);
  const plusDays = (n: number) => ((wd - 1 + n) % 7) + 1;
  const evenWeek = isoWeek(today) % 2 === 0;
  // The Green Room alternates so that Peter has it today and Anna had it last week.
  const scheduleDefs: Omit<Schedule, "id" | "created_at" | "starts_on" | "active">[] = [
    {
      office_id: offices.green.id,
      weekday: wd,
      time: "10:00",
      recurrence: "alternate",
      employee_1_id: evenWeek ? peter.id : anna.id,
      employee_2_id: evenWeek ? anna.id : peter.id,
    },
    { office_id: offices.grey.id, weekday: wd, time: "14:00", recurrence: "weekly", employee_1_id: anna.id, employee_2_id: peter.id },
    { office_id: offices.blue.id, weekday: plusDays(2), time: "11:00", recurrence: "weekly", employee_1_id: peter.id, employee_2_id: null },
    { office_id: offices.purple.id, weekday: plusDays(1), time: "10:00", recurrence: "weekly", employee_1_id: max.id, employee_2_id: null },
    { office_id: offices.white.id, weekday: plusDays(3), time: "14:00", recurrence: "pair", employee_1_id: maria.id, employee_2_id: max.id },
    { office_id: offices.lime.id, weekday: plusDays(4), time: "10:00", recurrence: "weekly", employee_1_id: maria.id, employee_2_id: null },
  ];
  const schedules: Schedule[] = scheduleDefs.map((s) => ({
    ...s,
    id: newId(),
    starts_on: addDays(today, -42),
    active: true,
    created_at: now,
  }));
  await store.insert("schedules", schedules);

  const tasks = await store.select("tasks");
  const officeSupplies = await store.select("office_supplies");

  // Supply problems recorded on the most recent past visit of an office.
  const lastVisitIssues: Record<string, { supply: string; status: SupplyStatus; qty: number }[]> = {
    [offices.green.id]: [
      { supply: "Кофе в зернах", status: "low", qty: 1 },
      { supply: "Туалетная бумага", status: "out", qty: 0 },
    ],
    [offices.blue.id]: [{ supply: "Жидкое мыло", status: "low", qty: 1 }],
    [offices.white.id]: [{ supply: "Туалетная бумага", status: "low", qty: 2 }],
    [offices.lime.id]: [{ supply: "Тонер", status: "out", qty: 0 }],
  };
  const lastNotes: Record<string, string> = {
    [offices.green.id]: "Нужно привезти кофе и туалетную бумагу.",
    [offices.blue.id]: "Всё в порядке, мыло почти закончилось.",
  };

  let visitCount = 0;
  for (const s of schedules) {
    const pastDates: string[] = [];
    for (let d = addDays(today, -42); d < today; d = addDays(d, 1)) if (isoWeekday(d) === s.weekday) pastDates.push(d);
    const lastDate = pastDates[pastDates.length - 1];

    for (const [i, date] of pastDates.entries()) {
      const e = employeesFor(s, date);
      const skipped = s.office_id === offices.purple.id && i === pastDates.length - 3;
      const visitId = newId();
      const started = `${date}T${s.time ?? "10:00"}:00+02:00`;
      const finished = new Date(new Date(started).getTime() + 75 * 60_000).toISOString();
      await store.insert("visits", [
        {
          id: visitId,
          office_id: s.office_id,
          schedule_id: s.id,
          origin_date: date,
          scheduled_date: date,
          time: s.time,
          employee_1_id: e.employee_1_id,
          employee_2_id: e.employee_2_id,
          status: skipped ? "skipped" : "done",
          is_override: false,
          started_at: skipped ? null : new Date(started).toISOString(),
          completed_at: skipped ? null : finished,
          completed_by: skipped ? null : e.employee_1_id,
          notes: skipped ? "Офис был закрыт." : date === lastDate ? lastNotes[s.office_id] ?? "Всё в порядке." : "Всё в порядке.",
          created_at: now,
        },
      ]);
      visitCount++;
      if (skipped) continue;

      const officeTasks = tasks.filter((t) => t.office_id === s.office_id);
      await store.insert(
        "visit_tasks",
        officeTasks
          .filter((t) => t.frequency !== "monthly" || i % 4 === 0)
          .map((t, j) => ({
            id: newId(),
            visit_id: visitId,
            task_id: t.id,
            status: t.frequency === "as_needed" && (i + j) % 3 === 0 ? ("not_needed" as const) : ("done" as const),
            notes: null,
            completed_at: finished,
            completed_by: e.employee_1_id,
          })),
      );

      const issues = date === lastDate ? lastVisitIssues[s.office_id] ?? [] : [];
      await store.insert(
        "visit_supplies",
        officeSupplies
          .filter((os) => os.office_id === s.office_id)
          .map((os) => {
            const name = supplies.find((x) => x.id === os.supply_id)!.name;
            const issue = issues.find((x) => x.supply === name);
            return {
              id: newId(),
              visit_id: visitId,
              supply_id: os.supply_id,
              quantity: issue ? issue.qty : os.quantity,
              status: issue ? issue.status : ("ok" as SupplyStatus),
              notes: null,
              updated_at: finished,
            };
          }),
      );

      for (const issue of issues) {
        const supply = supplyByName.get(issue.supply)!;
        await store.update(
          "office_supplies",
          { eq: { office_id: s.office_id, supply_id: supply.id } },
          { status: issue.status, quantity: issue.qty, updated_at: finished, updated_by: e.employee_1_id },
        );
        await store.insert("supply_requests", [
          {
            id: newId(),
            office_id: s.office_id,
            supply_id: supply.id,
            quantity: issue.qty,
            reason: issue.status === "out" ? "out" : "low",
            status: "open",
            created_from_visit_id: visitId,
            note: null,
            created_by: e.employee_1_id,
            created_at: finished,
            completed_at: null,
            completed_by: null,
          },
        ]);
      }
    }
  }

  await store.remove("app_settings", { eq: { id: "visits_generated_on" } });
  await ensureVisitsGenerated(today);
  const future = await store.select("visits", { gte: { scheduled_date: today } });

  console.log(`Seeded: ${cityRows.length} cities, ${officeDefs.length} coworkings, ${schedules.length} schedules, ${visitCount} past visits, ${future.length} upcoming visits.`);
  console.log(`Logins (password "${password}"):`);
  for (const p of [anna, peter, maria, max]) console.log(`  ${p.email}  ${p.role}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
