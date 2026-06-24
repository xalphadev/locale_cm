'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

// Client shell. App-Router layouts do NOT re-render on soft navigation, so anything derived from the path
// (the active nav tab, the per-section accent, whether the account header shows) must be computed client-side
// from usePathname() — otherwise it freezes at first-load. The server layout renders the header (which holds
// the server-only Switcher) and passes it in as a node; this component just decides whether to show it.
const GLYPH: Record<string, JSX.Element> = {
  home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></>,
  tag: <><path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z" /><circle cx="7.5" cy="7.5" r="1.4" /></>,
  bed: <><path d="M3 7v11M3 12h18M21 18v-6a2 2 0 0 0-2-2H9v4" /><circle cx="6.5" cy="9.5" r="1.2" /></>,
  feed: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 9h10M7 13h6" /></>,
  store: <><path d="M4 9 5.2 4.2A1.5 1.5 0 0 1 6.7 3h10.6a1.5 1.5 0 0 1 1.5 1.2L20 9" /><path d="M4 9h16v1.5a2.7 2.7 0 0 1-5.3 0 2.7 2.7 0 0 1-5.4 0 2.7 2.7 0 0 1-5.3 0Z" /><path d="M5.5 13v7h13v-7" /></>,
  spark: <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />,
  grid: <><rect x="3" y="3" width="7.5" height="7.5" rx="1.4" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.4" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.4" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.4" /></>,
};
function MIcon({ n }: { n: string }) {
  return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{GLYPH[n]}</svg>;
}

export type Tab = { href: string; icon: string; label: string; badge?: number; exact?: boolean; match: string[] };

function secOf(path: string): string {
  if (path.startsWith('/merchant/products')) return 'products';
  if (path.startsWith('/merchant/stay') || path.startsWith('/merchant/rooms') || path.startsWith('/merchant/units') || path.startsWith('/merchant/bookings') || path.startsWith('/merchant/pricing')) return 'rooms';
  if (path.startsWith('/merchant/loyalty')) return 'loyalty';
  if (path.startsWith('/merchant/leads')) return 'leads';
  if (path.startsWith('/merchant/deals')) return 'deals';
  if (path.startsWith('/merchant/payouts')) return 'payouts';
  if (path.startsWith('/merchant/shop')) return 'shop';
  return '';
}

export function MShell({ tabs, header, children }: { tabs: Tab[]; header: ReactNode; children: ReactNode }) {
  const path = usePathname() || '/merchant';
  // The ห้องพัก section is a hub-and-spoke: /merchant/stay is the HOME (top: brand header + bottom nav),
  // but its spokes (จอง / ผังห้อง / ประเภท&ราคา) are focused DEEP pages — no brand header, no bottom nav,
  // a back-chevron to the hub instead (like every other detail page).
  const SPOKES = new Set(['/merchant/bookings', '/merchant/units', '/merchant/rooms', '/merchant/pricing']);
  const isTop = !SPOKES.has(path) && path.split('/').filter(Boolean).length <= 2;
  const sec = secOf(path);
  // The ห้องพัก hub (/merchant/stay) keeps the bottom nav (it's a section home) but DROPS the brand header —
  // its own "ห้องพัก" title leads instead, so the page isn't double-headed. The body then owns the status-bar inset.
  const showHeader = isTop && path !== '/merchant/stay';
  const active = (t: Tab) => (t.exact ? path === t.match[0] : t.match.some((m) => path.startsWith(m)));
  return (
    <div className={`mshell ${isTop ? '' : 'deep'} ${isTop && !showHeader ? 'nohdr' : ''}`}>
      {showHeader && header}
      <main className={`mbody ${sec ? 'sec-' + sec : ''}`}>{children}</main>
      <nav className="mtab">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} className={`mtab-i ${active(t) ? 'on' : ''}`}>
            <MIcon n={t.icon} />
            {t.badge ? <span className="mtab-badge">{t.badge > 9 ? '9+' : t.badge}</span> : null}
            <span>{t.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
