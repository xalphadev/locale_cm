import { NextRequest, NextResponse } from 'next/server';
import { isProvider, exchangeCode, upsertOAuthUser } from '@/lib/oauth';
import { SESSION_COOKIE, signUserId, sessionCookieOpts } from '@/lib/auth';
import { q } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /auth/google/callback?code&state → exchange code, find/create the user, set the session.
export async function GET(req: NextRequest, { params }: { params: { provider: string } }) {
  const origin = process.env.CONSUMER_BASE?.replace(/\/+$/, '') || req.nextUrl.origin;
  const p = params.provider;
  const fail = (e: string) => NextResponse.redirect(new URL(`/login?error=${e}`, origin));
  if (!isProvider(p)) return fail('provider');

  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const saved = req.cookies.get('oauth_state')?.value;
  if (!code || !state || !saved || state !== saved) return fail('state');   // CSRF guard

  const prof = await exchangeCode(p, origin, code);
  if (!prof) return fail('oauth');

  const lang = req.cookies.get('lang')?.value || 'th';
  const uid = await upsertOAuthUser(p, prof.sub, prof.email, prof.name, lang);
  // suspended/banned accounts can't re-enter via OAuth either (mirrors loginEmailAction)
  const [u] = await q<{ ok: boolean }>(`SELECT (status='active') ok FROM users WHERE id=$1`, [uid]);
  if (!u?.ok) return fail('suspended');

  const res = NextResponse.redirect(new URL('/wallet', origin));
  res.cookies.set(SESSION_COOKIE, signUserId(uid), sessionCookieOpts);
  res.cookies.delete('oauth_state');
  return res;
}
