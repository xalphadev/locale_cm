import { NextResponse, type NextRequest } from 'next/server';

// Expose the request path to server components (so the root layout can hide the STAFF nav on the
// merchant portal). Edge-safe: just forwards a header, no crypto/auth here (auth is enforced in the
// merchant (app) layout via currentAccount()).
export function middleware(req: NextRequest) {
  const h = new Headers(req.headers);
  h.set('x-pathname', req.nextUrl.pathname);
  return NextResponse.next({ request: { headers: h } });
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
