import type { ReactNode } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { currentAccount } from '@/lib/auth';
import { i18n, q } from '@/lib/db';
import { logoutAction } from '../actions';
import Switcher from './Switcher';

export const dynamic = 'force-dynamic';

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
// cap = capability flag this tab needs (null = always shown). Tabs adapt to the shop's type.
const TABS = [
  { href: '/merchant', icon: 'home', label: 'ภาพรวม', cap: null, match: (p: string) => p === '/merchant' },
  { href: '/merchant/products', icon: 'tag', label: 'สินค้า', cap: 'sells_products', match: (p: string) => p.startsWith('/merchant/products') },
  { href: '/merchant/rooms', icon: 'bed', label: 'ห้องพัก', cap: 'offers_stay', match: (p: string) => p.startsWith('/merchant/rooms') || p.startsWith('/merchant/units') },
  { href: '/merchant/loyalty', icon: 'spark', label: 'แต้ม', cap: null, match: (p: string) => p.startsWith('/merchant/loyalty') },
  { href: '/merchant/shop', icon: 'store', label: 'ร้าน', cap: null, match: (p: string) => p.startsWith('/merchant/shop') },
];

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const acc = await currentAccount();
  if (!acc) redirect('/merchant/login');
  const path = headers().get('x-pathname') || '/merchant';
  const live = acc.place_status === 'published';
  // ห้องพัก + ผังห้อง are now ONE nav tab — the board is a segment inside the hub (see RoomHub), so the
  // owner never faces two parallel room menus. The tab just renames ห้องพัก → ห้อง in 'unique' mode
  // (resort, no board). Reflects the ACTIVE branch (Switcher), so one account's dorm vs resort each fit.
  const mode = acc.room_mode || 'multi';
  // new-lead count → an always-visible badge on the ห้องพัก tab (the in-app "new booking request" alert,
  // since คำขอจอง has no nav tab of its own). Outbound delivery (LINE/email) is separate infra.
  let newLeads = 0;
  if (acc.place_id && (acc.offers_stay || acc.manages_stay)) {
    const [lr] = await q<{ n: number }>(`SELECT count(*)::int n FROM stay_booking_request WHERE place_id=$1 AND status='new' AND deleted_at IS NULL`, [acc.place_id]);
    newLeads = lr?.n || 0;
  }
  const tabs = TABS
    .filter((t) => !t.cap || acc[t.cap])
    .map((t) => {
      let tt: any = (t.href === '/merchant/rooms' && mode === 'unique') ? { ...t, label: 'ห้อง' } : t;
      if (t.href === '/merchant/rooms' && newLeads > 0) tt = { ...tt, badge: newLeads };
      return tt;
    });
  // The account header (avatar + brand switcher + status + logout) belongs only on top-level pages
  // (≤2 path segments: /merchant, /merchant/rooms…). Deep pages (detail/edit/new, ≥3 segments) carry
  // their own back-link + title, so the full header there is redundant chrome — drop it.
  const isTop = path.split('/').filter(Boolean).length <= 2;
  // section identity → an in-page accent color (the chrome inside each section follows its hue; home stays blue)
  const sec = path.startsWith('/merchant/products') ? 'products'
    : (path.startsWith('/merchant/rooms') || path.startsWith('/merchant/units')) ? 'rooms'
    : path.startsWith('/merchant/loyalty') ? 'loyalty'
    : path.startsWith('/merchant/leads') ? 'leads'
    : path.startsWith('/merchant/pricing') ? 'pricing'
    : path.startsWith('/merchant/deals') ? 'deals'
    : path.startsWith('/merchant/payouts') ? 'payouts'
    : path.startsWith('/merchant/shop') ? 'shop' : '';
  return (
    <div className="mshell">
      {isTop && (
        <header className="mtop">
          <span className="mtop-ava">{(i18n(acc.brand_name) || i18n(acc.place_name) || acc.display_name || 'ร').trim().charAt(0)}</span>
          <div className="mtop-l">
            <Switcher
              accountId={acc.id}
              activePlaceId={acc.place_id}
              activeBrandName={i18n(acc.brand_name)}
              activePlaceName={i18n(acc.place_name) || acc.display_name}
            />
            <div className={`mtop-status ${live ? 'on' : ''}`}>{live ? '● เผยแพร่อยู่' : '○ รอตรวจสอบ'}</div>
          </div>
          <form action={logoutAction}><button className="mtop-out" type="submit">ออก</button></form>
        </header>
      )}
      <main className={`mbody ${sec ? 'sec-' + sec : ''}`}>{children}</main>
      <nav className="mtab">
        {tabs.map((t) => <Link key={t.href} href={t.href} className={`mtab-i ${t.match(path) ? 'on' : ''}`}><MIcon n={t.icon} />{t.badge ? <span className="mtab-badge">{t.badge > 9 ? '9+' : t.badge}</span> : null}<span>{t.label}</span></Link>)}
      </nav>
    </div>
  );
}
