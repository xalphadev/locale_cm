import { Pool } from 'pg';

const g = globalThis as unknown as { _pgPool?: Pool };
const pool = g._pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
if (process.env.NODE_ENV !== 'production') g._pgPool = pool;

export async function q<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  const res = await pool.query(text, params);
  return res.rows as T[];
}

/** The stable demo "logged-in" customer (seeded by seed-interactive.sql). Falls back if absent. */
export const DEMO_USER = '00000000-0000-4000-8000-0000000000d0';
export async function demoUserId(): Promise<string | null> {
  const a = await q<{ id: string }>(`SELECT id FROM users WHERE id=$1`, [DEMO_USER]);
  if (a[0]) return DEMO_USER;
  const b = await q<{ user_id: string }>(
    `SELECT user_id FROM quest_progress WHERE status='in_progress' ORDER BY created_at DESC LIMIT 1`);
  return b[0]?.user_id ?? null;
}

// i18n is cookie-aware (reads the `lang` cookie) so one language toggle re-renders everything.
export { i18n, getLocale } from './i18n';
/** coin-minor → whole Coins (1 COIN = 100 minor). NEVER shown next to a ฿ value (e-money rule). */
export const coins = (minor: number | string | null | undefined) => Math.round(Number(minor ?? 0) / 100);
export { cover } from './img';
