import { Pool } from 'pg';

// Single read-only pool reused across HMR reloads in dev.
const g = globalThis as unknown as { _pgPool?: Pool };
const pool = g._pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
if (process.env.NODE_ENV !== 'production') g._pgPool = pool;

export async function q<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  const res = await pool.query(text, params);
  return res.rows as T[];
}

/** satang/coin-minor → "฿1,234.50" */
export function baht(minor: number | string | null | undefined): string {
  const n = Number(minor ?? 0) / 100;
  return '฿' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
