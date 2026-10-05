import { localStore } from "./local-store";
import type { Store } from "./store";
import { supabaseStore } from "./supabase-store";

export type Backend = "supabase" | "local";

export function backend(): Backend {
  return process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? "supabase" : "local";
}

export function db(): Store {
  return backend() === "supabase" ? supabaseStore : localStore;
}

export function newId(): string {
  return crypto.randomUUID();
}

export function nowISO(): string {
  return new Date().toISOString();
}

export type { Filter, Order, Store } from "./store";
