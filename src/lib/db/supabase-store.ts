import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { TableName, Tables } from "@/lib/types";
import type { Filter, Order, Store } from "./store";

let admin: SupabaseClient | null = null;

/** Service-role client. Server only: it bypasses row level security. */
export function supabaseAdmin(): SupabaseClient {
  if (!admin) {
    admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return admin;
}

export function supabaseAnon(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilter(query: any, filter: Filter<unknown> = {}) {
  let q = query;
  for (const [k, v] of Object.entries(filter.eq ?? {})) q = v === null ? q.is(k, null) : q.eq(k, v);
  for (const [k, v] of Object.entries(filter.neq ?? {})) q = v === null ? q.not(k, "is", null) : q.neq(k, v);
  for (const [k, v] of Object.entries(filter.in ?? {})) q = q.in(k, v as unknown[]);
  for (const [k, v] of Object.entries(filter.gte ?? {})) q = q.gte(k, v);
  for (const [k, v] of Object.entries(filter.lte ?? {})) q = q.lte(k, v);
  return q;
}

function check(error: { message: string } | null, op: string, table: string) {
  if (error) throw new Error(`Supabase ${op} ${table}: ${error.message}`);
}

export const supabaseStore: Store = {
  async select<K extends TableName>(table: K, filter?: Filter<Tables[K]>, order?: Order<Tables[K]>[]) {
    let q = applyFilter(supabaseAdmin().from(table).select("*"), filter as Filter<unknown>);
    for (const o of order ?? []) q = q.order(o.column, { ascending: o.ascending ?? true, nullsFirst: false });
    const { data, error } = await q;
    check(error, "select", table);
    return (data ?? []) as Tables[K][];
  },

  async insert<K extends TableName>(table: K, rows: Tables[K][]) {
    if (!rows.length) return;
    const { error } = await supabaseAdmin().from(table).insert(rows);
    check(error, "insert", table);
  },

  async update<K extends TableName>(table: K, filter: Filter<Tables[K]>, patch: Partial<Tables[K]>) {
    const { error } = await applyFilter(supabaseAdmin().from(table).update(patch as Record<string, unknown>), filter as Filter<unknown>);
    check(error, "update", table);
  },

  async remove<K extends TableName>(table: K, filter: Filter<Tables[K]>) {
    const { error } = await applyFilter(supabaseAdmin().from(table).delete(), filter as Filter<unknown>);
    check(error, "delete", table);
  },
};
