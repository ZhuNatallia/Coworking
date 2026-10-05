import type { TableName, Tables } from "@/lib/types";

type Scalar = string | number | boolean | null;

export interface Filter<T> {
  eq?: Partial<Record<keyof T, Scalar>>;
  neq?: Partial<Record<keyof T, Scalar>>;
  in?: Partial<Record<keyof T, Scalar[]>>;
  gte?: Partial<Record<keyof T, string | number>>;
  lte?: Partial<Record<keyof T, string | number>>;
}

export interface Order<T> {
  column: keyof T & string;
  ascending?: boolean;
}

/**
 * Minimal table access shared by the Supabase and local file backends.
 * Rows carry app-generated ids, so both backends behave the same.
 */
export interface Store {
  select<K extends TableName>(table: K, filter?: Filter<Tables[K]>, order?: Order<Tables[K]>[]): Promise<Tables[K][]>;
  insert<K extends TableName>(table: K, rows: Tables[K][]): Promise<void>;
  update<K extends TableName>(table: K, filter: Filter<Tables[K]>, patch: Partial<Tables[K]>): Promise<void>;
  remove<K extends TableName>(table: K, filter: Filter<Tables[K]>): Promise<void>;
}

export function matches<T>(row: T, filter: Filter<T> = {}): boolean {
  const r = row as Record<string, unknown>;
  for (const [k, v] of Object.entries(filter.eq ?? {})) if ((r[k] ?? null) !== v) return false;
  for (const [k, v] of Object.entries(filter.neq ?? {})) if ((r[k] ?? null) === v) return false;
  for (const [k, v] of Object.entries(filter.in ?? {})) if (!(v as Scalar[]).includes((r[k] ?? null) as Scalar)) return false;
  for (const [k, v] of Object.entries(filter.gte ?? {})) if (r[k] == null || (r[k] as string | number) < (v as string | number)) return false;
  for (const [k, v] of Object.entries(filter.lte ?? {})) if (r[k] == null || (r[k] as string | number) > (v as string | number)) return false;
  return true;
}

export function sortRows<T>(rows: T[], order: Order<T>[] = []): T[] {
  if (!order.length) return rows;
  return [...rows].sort((a, b) => {
    for (const { column, ascending = true } of order) {
      const av = (a as Record<string, unknown>)[column] as string | number | null;
      const bv = (b as Record<string, unknown>)[column] as string | number | null;
      if (av === bv) continue;
      if (av == null) return 1;
      if (bv == null) return -1;
      return (av < bv ? -1 : 1) * (ascending ? 1 : -1);
    }
    return 0;
  });
}
