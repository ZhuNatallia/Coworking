import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

const MIGRATIONS_DIR = path.join(__dirname, "..", "supabase", "migrations");
const MIGRATIONS = fs
  .readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf8"));

// Minimal stand-ins for the parts of Supabase the migration relies on.
const SUPABASE_STUBS = `
  create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean);
`;

const ADMIN = "00000000-0000-0000-0000-00000000000a";
const PETER = "00000000-0000-0000-0000-00000000000b";
const MAX = "00000000-0000-0000-0000-00000000000c";

let pg: PGlite;

async function as<T>(user: string, sql: string): Promise<T[]> {
  await pg.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${user}', false);`);
  try {
    return (await pg.query<T>(sql)).rows;
  } finally {
    await pg.exec(`reset role;`);
  }
}

beforeAll(async () => {
  pg = new PGlite();
  await pg.exec(SUPABASE_STUBS);
  for (const sql of MIGRATIONS) await pg.exec(sql);
  await pg.exec(`
    grant usage on schema public, auth to authenticated;
    grant all on all tables in schema public to authenticated;
    grant execute on all functions in schema public, auth to authenticated;

    insert into auth.users (id) values ('${ADMIN}'), ('${PETER}'), ('${MAX}');
    insert into profiles (id, name, email, role) values
      ('${ADMIN}', 'Anna', 'anna@example.com', 'admin'),
      ('${PETER}', 'Peter', 'peter@example.com', 'employee'),
      ('${MAX}', 'Max', 'max@example.com', 'employee');
    insert into cities (id, name) values ('10000000-0000-0000-0000-000000000001', 'München');
    insert into offices (id, city_id, name) values
      ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Office 1'),
      ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Office 2');
    insert into schedules (office_id, weekday, employee_1_id) values
      ('20000000-0000-0000-0000-000000000001', 1, '${PETER}'),
      ('20000000-0000-0000-0000-000000000002', 3, '${MAX}');
    insert into supplies (id, name, unit) values ('30000000-0000-0000-0000-000000000001', 'Кофе в зернах', 'kg');
  `);
});

describe("migrations", () => {
  it("gives every profile a supported language", async () => {
    const { rows } = await pg.query<{ locale: string }>("select distinct locale from profiles");
    expect(rows.map((r) => r.locale)).toEqual(["ru"]);
    await expect(pg.exec(`update profiles set locale = 'fr' where id = '${PETER}'`)).rejects.toThrow();
  });

  it("lets employees read translations but not write them", async () => {
    await pg.exec(`insert into translations (id, lang, source, text) values ('h1', 'en', 'Кофе', 'Coffee')`);
    expect(await as(PETER, "select text from translations")).toEqual([{ text: "Coffee" }]);
    await expect(as(PETER, `insert into translations (id, lang, source, text) values ('h2', 'de', 'Чай', 'Tee')`)).rejects.toThrow();
  });

  it("creates the photos bucket", async () => {
    const { rows } = await pg.query<{ id: string }>("select id from storage.buckets");
    expect(rows.map((r) => r.id)).toEqual(["photos"]);
  });

  it("allows only one open request per office and supply", async () => {
    const insert = `insert into supply_requests (office_id, supply_id, reason)
      values ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'low')`;
    await pg.exec(insert);
    await expect(pg.exec(insert)).rejects.toThrow(/supply_requests_one_open/);
    await pg.exec(`update supply_requests set status = 'delivered'`);
    await pg.exec(insert);
  });

  it("rejects a rotation without a second employee", async () => {
    await expect(
      pg.exec(`insert into schedules (office_id, weekday, recurrence, employee_1_id)
        values ('20000000-0000-0000-0000-000000000001', 2, 'alternate', '${PETER}')`),
    ).rejects.toThrow();
  });

  it("lets an employee see only offices they are scheduled for", async () => {
    const peter = await as<{ name: string }>(PETER, "select name from offices order by name");
    expect(peter.map((o) => o.name)).toEqual(["Office 1"]);
    const admin = await as<{ name: string }>(ADMIN, "select name from offices order by name");
    expect(admin).toHaveLength(2);
  });

  it("blocks employees from editing offices and schedules", async () => {
    await as(PETER, `update offices set name = 'Hacked'`);
    await as(PETER, `delete from schedules`);
    const { rows } = await pg.query<{ n: number }>("select count(*)::int as n from offices where name = 'Hacked'");
    expect(rows[0].n).toBe(0);
    const s = await pg.query<{ n: number }>("select count(*)::int as n from schedules");
    expect(s.rows[0].n).toBe(2);
  });

  it("shows take-with-you items only for the employee's offices", async () => {
    expect(await as(PETER, "select id from supply_requests where status = 'open'")).toHaveLength(1);
    expect(await as(MAX, "select id from supply_requests")).toHaveLength(0);
  });
});
