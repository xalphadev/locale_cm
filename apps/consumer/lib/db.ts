import { Pool } from 'pg';

const g = globalThis as unknown as { _pgPool?: Pool };
const pool = g._pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
if (process.env.NODE_ENV !== 'production') g._pgPool = pool;

export async function q<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  const res = await pool.query(text, params);
  return res.rows as T[];
}

/** A consistent demo "logged-in" customer (the one with the most Sparks). */
export async function demoUserId(): Promise<string | null> {
  const r = await q<{ user_id: string }>(`SELECT user_id FROM spark_balances ORDER BY balance DESC LIMIT 1`);
  return r[0]?.user_id ?? null;
}

export function i18n(j: any, locale = 'th'): string {
  if (!j) return '';
  return j[locale] || j.en || j.th || Object.values(j)[0] as string || '';
}
/** coin-minor → whole Coins (1 COIN = 100 minor). NEVER shown next to a ฿ value (e-money rule). */
export const coins = (minor: number | string | null | undefined) => Math.round(Number(minor ?? 0) / 100);
