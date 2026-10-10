import fs from "node:fs";
import path from "node:path";
import type { TableName, Tables } from "@/lib/types";
import { matches, sortRows, type Filter, type Order, type Store } from "./store";

export interface LocalCredential {
  id: string;
  password_hash: string;
}

type LocalData = { [K in TableName]: Tables[K][] } & { local_credentials: LocalCredential[] };

const TABLES: (TableName | "local_credentials")[] = [
  "profiles",
  "cities",
  "offices",
  "schedules",
  "visits",
  "tasks",
  "visit_tasks",
  "supplies",
  "office_supplies",
  "visit_supplies",
  "supply_requests",
  "photos",
  "app_settings",
  "translations",
  "day_marks",
  "office_mail",
  "local_credentials",
];

export const LOCAL_DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(LOCAL_DATA_DIR, "db.json");

const globalForDb = globalThis as unknown as { __officecareLocal?: { data: LocalData; mtime: number } };

function emptyData(): LocalData {
  return Object.fromEntries(TABLES.map((t) => [t, []])) as unknown as LocalData;
}

function load(): LocalData {
  const mtime = fs.existsSync(DB_FILE) ? fs.statSync(DB_FILE).mtimeMs : 0;
  const cached = globalForDb.__officecareLocal;
  if (cached && cached.mtime === mtime && TABLES.every((t) => t in cached.data)) return cached.data;
  const data = emptyData();
  if (mtime) {
    const parsed = JSON.parse(fs.readFileSync(DB_FILE, "utf8")) as Partial<LocalData>;
    for (const t of TABLES) (data as Record<string, unknown[]>)[t] = (parsed as Record<string, unknown[]>)[t] ?? [];
  }
  globalForDb.__officecareLocal = { data, mtime };
  return data;
}

function save(data: LocalData) {
  fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 1));
  fs.renameSync(tmp, DB_FILE);
  globalForDb.__officecareLocal = { data, mtime: fs.statSync(DB_FILE).mtimeMs };
}

function clone<T>(v: T): T {
  return structuredClone(v);
}

export const localStore: Store & {
  credentials: {
    get(id: string): LocalCredential | undefined;
    set(id: string, hash: string): void;
  };
  reset(): void;
} = {
  async select<K extends TableName>(table: K, filter?: Filter<Tables[K]>, order?: Order<Tables[K]>[]) {
    const rows = (load()[table] as Tables[K][]).filter((r) => matches(r, filter));
    return clone(sortRows(rows, order));
  },

  async insert<K extends TableName>(table: K, rows: Tables[K][]) {
    const data = load();
    const list = data[table] as Tables[K][];
    for (const row of rows) {
      const id = (row as { id: string }).id;
      if (list.some((r) => (r as { id: string }).id === id)) throw new Error(`Duplicate id in ${table}: ${id}`);
      list.push(clone(row));
    }
    save(data);
  },

  async update<K extends TableName>(table: K, filter: Filter<Tables[K]>, patch: Partial<Tables[K]>) {
    const data = load();
    let changed = false;
    for (const row of data[table] as Tables[K][]) {
      if (matches(row, filter)) {
        Object.assign(row as object, clone(patch));
        changed = true;
      }
    }
    if (changed) save(data);
  },

  async remove<K extends TableName>(table: K, filter: Filter<Tables[K]>) {
    const data = load();
    const before = data[table].length;
    (data as Record<string, unknown[]>)[table] = (data[table] as Tables[K][]).filter((r) => !matches(r, filter));
    if (data[table].length !== before) save(data);
  },

  credentials: {
    get(id) {
      return load().local_credentials.find((c) => c.id === id);
    },
    set(id, hash) {
      const data = load();
      const existing = data.local_credentials.find((c) => c.id === id);
      if (existing) existing.password_hash = hash;
      else data.local_credentials.push({ id, password_hash: hash });
      save(data);
    },
  },

  reset() {
    save(emptyData());
  },
};
