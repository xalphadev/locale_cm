import { cookies } from 'next/headers';
import crypto from 'crypto';
import { q } from './db';

// Self-service merchant portal auth. Credentials live in merchant_accounts (the money-plane
// users table has no password). Passwords: scrypt. Session: an HMAC-signed cookie (no DB session
// table needed for the MVP). NOT used by the staff back-office, which stays unauthenticated in dev.
const SECRET = process.env.MERCHANT_SESSION_SECRET || 'soihop-dev-merchant-secret-change-me';
const COOKIE = 'm_session';

export function hashPassword(pw: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(pw, salt, 64);
  return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`;
}
export function verifyPassword(pw: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = (stored || '').split(':');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const want = Buffer.from(hashHex, 'hex');
  const got = crypto.scryptSync(pw, Buffer.from(saltHex, 'hex'), 64);
  return want.length === got.length && crypto.timingSafeEqual(want, got);
}

function sign(id: string): string {
  return `${id}.${crypto.createHmac('sha256', SECRET).update(id).digest('hex')}`;
}
function unsign(token: string): string | null {
  const i = token.lastIndexOf('.');
  if (i < 0) return null;
  const id = token.slice(0, i);
  const sig = Buffer.from(token.slice(i + 1));
  const exp = Buffer.from(crypto.createHmac('sha256', SECRET).update(id).digest('hex'));
  return sig.length === exp.length && crypto.timingSafeEqual(sig, exp) ? id : null;
}

export function setSession(accountId: string) {
  cookies().set(COOKIE, sign(accountId), { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 });
}
export function clearSession() { cookies().delete(COOKIE); }

/** The logged-in merchant account joined to its single managed place, or null. Tenancy anchor. */
export async function currentAccount(): Promise<any | null> {
  const tok = cookies().get(COOKIE)?.value;
  if (!tok) return null;
  const id = unsign(tok);
  if (!id) return null;
  const [a] = await q<any>(
    `SELECT ma.id, ma.email, ma.display_name, ma.phone, ma.place_id, ma.status,
            p.name_i18n place_name, p.status::text place_status, p.sells_products, p.category::text category, p.subcategory
       FROM merchant_accounts ma LEFT JOIN places p ON p.id = ma.place_id
      WHERE ma.id = $1 AND ma.status = 'active'`, [id]);
  return a ?? null;
}
