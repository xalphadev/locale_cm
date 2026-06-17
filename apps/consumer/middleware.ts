import { NextRequest, NextResponse } from 'next/server';

// First-run onboarding journey:
//   brand-new visitor (no `seen_welcome` cookie) who isn't logged in (no `u_session`)
//   opens the app root `/` → sent to /welcome ONCE. /welcome sets the cookie on mount, and its
//   primary CTA ("เริ่มใช้งาน") goes straight to `/` (home) — no login/register required.
//   Returning visitors and logged-in users land on the home feed directly.
//   Only the root is guarded, so deep links (/place/…, /stay, …) are never intercepted.
export function middleware(req: NextRequest) {
  const seen = req.cookies.get('seen_welcome');
  const session = req.cookies.get('u_session');
  if (!seen && !session) {
    return NextResponse.redirect(new URL('/welcome', req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ['/'] };
