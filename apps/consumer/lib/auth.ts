import { cookies } from 'next/headers';
import crypto from 'crypto';

// Consumer auth session. Mirrors the merchant portal (apps/web lib/auth): an HMAC-signed cookie
// (no DB session table), scrypt passwords. The signed value IS the users.id — so sessionUserId()
// trusts a validly-signed cookie without a DB round-trip. Self-contained (no db import) so lib/db
// can read the session without a cycle.
const SECRET = process.env.CONSUMER_SESSION_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') throw new Error('CONSUMER_SESSION_SECRET is required in production');
  return 'soihop-dev-consumer-secret-change-me';
})();
const COOKIE = 'u_session';

export function hashPassword(pw: string): string {
  const salt = crypto.randomBytes(16);
  return `scrypt:${salt.toString('hex')}:${crypto.scryptSync(pw, salt, 64).toString('hex')}`;
}
export function verifyPassword(pw: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = (stored || '').split(':');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const want = Buffer.from(hashHex, 'hex');
  const got = crypto.scryptSync(pw, Buffer.from(saltHex, 'hex'), 64);
  return want.length === got.length && crypto.timingSafeEqual(want, got);
}

function sign(id: string): string { return `${id}.${crypto.createHmac('sha256', SECRET).update(id).digest('hex')}`; }
function unsign(token: string): string | null {
  const i = token.lastIndexOf('.');
  if (i < 0) return null;
  const id = token.slice(0, i);
  const sig = Buffer.from(token.slice(i + 1));
  const exp = Buffer.from(crypto.createHmac('sha256', SECRET).update(id).digest('hex'));
  return sig.length === exp.length && crypto.timingSafeEqual(sig, exp) ? id : null;
}

export const SESSION_COOKIE = COOKIE;
export const sessionCookieOpts = {
  httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 60,
};
/** Signed cookie value for a user id — for setting on a NextResponse in OAuth route handlers. */
export function signUserId(id: string): string { return sign(id); }

export function setSession(userId: string) { cookies().set(COOKIE, sign(userId), sessionCookieOpts); }
export function clearSession() { cookies().delete(COOKIE); }

/** The logged-in customer's users.id, or null. Trusts a validly-signed cookie (no DB hit). */
export function sessionUserId(): string | null {
  const tok = cookies().get(COOKIE)?.value;
  if (!tok) return null;
  return unsign(tok);
}

// short-lived OAuth CSRF state cookie
export function setOAuthState(state: string) {
  cookies().set('oauth_state', state, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 600 });
}
export function takeOAuthState(): string | null {
  const s = cookies().get('oauth_state')?.value ?? null;
  return s;
}
