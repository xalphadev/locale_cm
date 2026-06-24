import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

// คำขอจอง merged into the unified booking menu (ระบบจองห้อง, /merchant/bookings). Kept as a redirect for
// one release so existing deep links, cached Flutter-WebView routes, and any stray ?ok=/?error= land on
// the new home. Forwards the banner params (q is preserved; the old ?status= filter maps to lenses there).
export default function LeadsRedirect({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const u = new URLSearchParams();
  for (const k of ['ok', 'error', 'q'] as const) { const v = searchParams?.[k]; if (v) u.set(k, v); }
  const qs = u.toString();
  redirect(qs ? `/merchant/bookings?${qs}` : '/merchant/bookings');
}
