import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { isProvider, providerEnabled, authorizeUrl } from '@/lib/oauth';

export const dynamic = 'force-dynamic';

// GET /auth/google | /auth/line → redirect to the provider's consent screen (with a CSRF state cookie).
export async function GET(req: NextRequest, { params }: { params: { provider: string } }) {
  const origin = process.env.CONSUMER_BASE?.replace(/\/+$/, '') || req.nextUrl.origin;
  const p = params.provider;
  if (!isProvider(p) || !providerEnabled(p)) return NextResponse.redirect(new URL('/login?error=provider', origin));
  const state = crypto.randomBytes(16).toString('hex');
  const res = NextResponse.redirect(authorizeUrl(p, origin, state));
  res.cookies.set('oauth_state', state, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 600 });
  return res;
}
