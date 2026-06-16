import { q } from './db';

// OAuth (Google + LINE) — standard authorization-code flow. Credentials come from env; a provider
// with no client id/secret is treated as disabled (its button is hidden). The id_token payload is
// decoded after a server-side token exchange (TLS + our client_secret) — harden with JWKS in prod.
export type Provider = 'google' | 'line';

const CFG: Record<Provider, { authUrl: string; tokenUrl: string; scope: string; id?: string; secret?: string; label: string }> = {
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth', tokenUrl: 'https://oauth2.googleapis.com/token',
    scope: 'openid email profile', id: process.env.GOOGLE_CLIENT_ID, secret: process.env.GOOGLE_CLIENT_SECRET, label: 'Google',
  },
  line: {
    authUrl: 'https://access.line.me/oauth2/v2.1/authorize', tokenUrl: 'https://api.line.me/oauth2/v2.1/token',
    scope: 'openid profile email', id: process.env.LINE_CHANNEL_ID, secret: process.env.LINE_CHANNEL_SECRET, label: 'LINE',
  },
};

export const PROVIDERS: Provider[] = ['google', 'line'];
export const providerLabel = (p: Provider) => CFG[p].label;
export const isProvider = (p: string): p is Provider => p === 'google' || p === 'line';
export const providerEnabled = (p: Provider): boolean => !!(CFG[p].id && CFG[p].secret);
export const enabledProviders = (): Provider[] => PROVIDERS.filter(providerEnabled);

export function authorizeUrl(p: Provider, origin: string, state: string): string {
  const c = CFG[p];
  const u = new URL(c.authUrl);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('client_id', c.id!);
  u.searchParams.set('redirect_uri', `${origin}/auth/${p}/callback`);
  u.searchParams.set('scope', c.scope);
  u.searchParams.set('state', state);
  return u.toString();
}

function decodeJwtPayload(jwt: string): any {
  try { return JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString('utf8')); } catch { return {}; }
}

/** Exchange code → id_token → {sub,email,name}. Returns null on any failure. */
export async function exchangeCode(p: Provider, origin: string, code: string): Promise<{ sub: string; email?: string; name?: string } | null> {
  const c = CFG[p];
  const body = new URLSearchParams({
    grant_type: 'authorization_code', code, redirect_uri: `${origin}/auth/${p}/callback`, client_id: c.id!, client_secret: c.secret!,
  });
  const res = await fetch(c.tokenUrl, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body, cache: 'no-store' });
  if (!res.ok) return null;
  const tok: any = await res.json();
  const claims = tok.id_token ? decodeJwtPayload(tok.id_token) : {};
  if (!claims.sub) return null;
  return { sub: String(claims.sub), email: claims.email, name: claims.name || claims.nickname };
}

/** Find-or-create the users row for an OAuth identity (dedup by email when present). */
export async function upsertOAuthUser(p: Provider, sub: string, email: string | undefined, name: string | undefined, lang: string): Promise<string> {
  const [exist] = await q<any>(`SELECT user_id FROM user_identities WHERE provider=$1 AND provider_user_id=$2`, [p, sub]);
  if (exist) return exist.user_id;
  let userId: string | null = null;
  if (email) {
    const [byEmail] = await q<any>(
      `SELECT user_id FROM user_credentials WHERE email=$1 UNION SELECT user_id FROM user_identities WHERE email=$1 LIMIT 1`, [email]);
    userId = byEmail?.user_id ?? null;
  }
  if (!userId) {
    const [u] = await q<any>(
      `INSERT INTO users(id, primary_locale, auth_providers, status)
       VALUES(gen_random_uuid(), $1, jsonb_build_array($2::text), 'active') RETURNING id`,
      [['th', 'en', 'zh'].includes(lang) ? lang : 'th', p]);
    userId = u.id;
    await q(`INSERT INTO profiles(user_id, display_name) VALUES($1,$2) ON CONFLICT (user_id) DO NOTHING`, [userId, name ?? null]);
    await q(`SELECT fn_set_audience_segment($1)`, [userId]);
  }
  await q(`INSERT INTO user_identities(provider, provider_user_id, user_id, email, display_name)
           VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`, [p, sub, userId, email ?? null, name ?? null]);
  return userId!;
}
