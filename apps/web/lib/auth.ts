import { cookies } from 'next/headers';
import crypto from 'crypto';
import { q } from './db';

// Self-service merchant portal auth. Credentials live in merchant_accounts (the money-plane
// users table has no password). Passwords: scrypt. Session: an HMAC-signed cookie (no DB session
// table needed for the MVP). NOT used by the staff back-office, which stays unauthenticated in dev.
// Fail closed in production: a missing secret would make every m_session cookie forgeable
// (anyone could sign a token for any account id → cross-tenant takeover). In dev we allow a
// known default so localhost works without setup. Set MERCHANT_SESSION_SECRET in any real deploy.
// Resolved lazily (per use), NOT at module load: `next build` runs with NODE_ENV=production but no
// secret in the build env — a top-level throw there would fail the build. Still fail-closed at
// runtime: signing/verifying a cookie without the secret throws on the first request, so an
// m_session can never run on a known/public key.
function secret(): string {
  const s = process.env.MERCHANT_SESSION_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === 'production') throw new Error('MERCHANT_SESSION_SECRET is required in production');
  return 'locale-dev-merchant-secret-change-me';
}
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
  return `${id}.${crypto.createHmac('sha256', secret()).update(id).digest('hex')}`;
}
function unsign(token: string): string | null {
  const i = token.lastIndexOf('.');
  if (i < 0) return null;
  const id = token.slice(0, i);
  const sig = Buffer.from(token.slice(i + 1));
  const exp = Buffer.from(crypto.createHmac('sha256', secret()).update(id).digest('hex'));
  return sig.length === exp.length && crypto.timingSafeEqual(sig, exp) ? id : null;
}

export function setSession(accountId: string) {
  cookies().set(COOKIE, sign(accountId), {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
    path: '/', maxAge: 60 * 60 * 24 * 30,
  });
}
export function clearSession() { cookies().delete(COOKIE); }

/** The logged-in merchant account joined to its ACTIVE branch, or null. Tenancy anchor.
 *
 * Multi-entity (0022): one account owns N brands ("ร้าน"), each owning N places ("สาขา"/"ที่พัก").
 * The cookie still signs ONLY the account id — the trust boundary is brand-ownership, re-proven
 * here every request: the active branch is resolved as the FIRST of {active_place_id, the legacy
 * home place_id, the oldest owned place} that is actually owned (its brand.owner_account_id = me).
 * A forged active_place_id therefore can never resolve to a place the account doesn't own; it just
 * falls through to a place it does. `acc.place_id` (returned) = the active branch, so every page /
 * Server Action that scopes on `acc.place_id` stays correct and ownership-proven, unchanged. */
export async function currentAccount(): Promise<any | null> {
  const tok = cookies().get(COOKIE)?.value;
  if (!tok) return null;
  const id = unsign(tok);
  if (!id) return null;
  const [a] = await q<any>(
    `WITH acct AS (
       SELECT * FROM merchant_accounts WHERE id = $1 AND status = 'active' AND deleted_at IS NULL
     ),
     resolved AS (
       SELECT a.*, COALESCE(
         (SELECT px.id FROM places px JOIN brands bx ON bx.id = px.brand_id AND bx.deleted_at IS NULL
            WHERE bx.owner_account_id = a.id AND px.id = a.active_place_id),
         (SELECT px.id FROM places px JOIN brands bx ON bx.id = px.brand_id AND bx.deleted_at IS NULL
            WHERE bx.owner_account_id = a.id AND px.id = a.place_id),
         (SELECT px.id FROM places px JOIN brands bx ON bx.id = px.brand_id AND bx.deleted_at IS NULL
            WHERE bx.owner_account_id = a.id ORDER BY px.created_at LIMIT 1)
       ) AS eff_place_id
       FROM acct a
     )
     SELECT r.id, r.email, r.display_name, r.phone, r.status,
            r.eff_place_id AS place_id,
            p.name_i18n place_name, p.status::text place_status,
            (p.claim_verified_at IS NOT NULL) AS verified, p.phone AS place_phone, p.source::text AS place_source,
            p.sells_products, p.offers_stay, p.category::text category, p.subcategory,
            b.id AS brand_id, b.name_i18n AS brand_name,
            (SELECT count(*)::int FROM brands bb
               WHERE bb.owner_account_id = r.id AND bb.status = 'active' AND bb.deleted_at IS NULL) AS brand_count,
            (SELECT count(*)::int FROM places pp JOIN brands bb ON bb.id = pp.brand_id AND bb.deleted_at IS NULL
               WHERE bb.owner_account_id = r.id) AS branch_count
       FROM resolved r
       LEFT JOIN places p ON p.id = r.eff_place_id
       LEFT JOIN brands b ON b.id = p.brand_id AND b.deleted_at IS NULL`, [id]);
  return a ?? null;
}
