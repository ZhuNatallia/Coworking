import type { TableName } from "@/lib/types";
import { localStore } from "./local-store";
import type { Store } from "./store";
import { supabaseStore } from "./supabase-store";

export type Backend = "supabase" | "local";

export function backend(): Backend {
  return process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? "supabase" : "local";
}

function rawStore(): Store {
  return backend() === "supabase" ? supabaseStore : localStore;
}

export const LAST_CHANGE_ID = "last_change";

/** Tables whose writes don't change anything a colleague sees on screen. */
const QUIET_TABLES = new Set<TableName>(["app_settings", "translations"]);

async function markChanged(store: Store) {
  const value = String(Date.now());
  try {
    const [row] = await store.select("app_settings", { eq: { id: LAST_CHANGE_ID } });
    if (row) await store.update("app_settings", { eq: { id: LAST_CHANGE_ID } }, { value });
    else await store.insert("app_settings", [{ id: LAST_CHANGE_ID, value }]);
  } catch (error) {
    console.error("Could not record the last change", error);
  }
}

/** Wraps writes so open screens of colleagues know to refresh. */
function withChangeTracking(store: Store): Store {
  return {
    select: (table, filter, order) => store.select(table, filter, order),
    async insert(table, rows) {
      await store.insert(table, rows);
      if (!QUIET_TABLES.has(table) && rows.length) await markChanged(store);
    },
    async update(table, filter, patch) {
      await store.update(table, filter, patch);
      if (!QUIET_TABLES.has(table)) await markChanged(store);
    },
    async remove(table, filter) {
      await store.remove(table, filter);
      if (!QUIET_TABLES.has(table)) await markChanged(store);
    },
  };
}

const tracked = { supabase: withChangeTracking(supabaseStore), local: withChangeTracking(localStore) };

export function db(): Store {
  return tracked[backend()];
}

/** Milliseconds timestamp of the latest data change, "0" if nothing was recorded yet. */
export async function lastChange(): Promise<string> {
  const [row] = await rawStore().select("app_settings", { eq: { id: LAST_CHANGE_ID } });
  return row?.value ?? "0";
}

export function newId(): string {
  return crypto.randomUUID();
}

export function nowISO(): string {
  return new Date().toISOString();
}

export type { Filter, Order, Store } from "./store";
