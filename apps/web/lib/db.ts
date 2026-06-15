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

/** Pick a locale string out of an i18n jsonb object. */
export function i18n(j: any, locale = 'th'): string {
  if (!j) return '';
  return j[locale] || j.en || j.th || (Object.values(j)[0] as string) || '';
}

// Back-office demo identities (seeded by db/test/seed-agents.sql) + money-plane API base.
export const DEMO_AGENT = '00000000-0000-4000-8000-00000000a6e7';
export const DEMO_ADMIN = '00000000-0000-4000-8000-00000000ad11';
export const API_BASE = process.env.MONEY_API ?? 'http://127.0.0.1:3001';
