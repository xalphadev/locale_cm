import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { currentAccount } from '@/lib/auth';
import { i18n } from '@/lib/db';
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
};
function MIcon({ n }: { n: string }) {
  return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{GLYPH[n]}</svg>;
}
// cap = capability flag this tab needs (null = always shown). Tabs adapt to the shop's type.
const TABS = [
  { href: '/merchant', icon: 'home', label: 'ภาพรวม', cap: null, match: (p: string) => p === '/merchant' },
  { href: '/merchant/products', icon: 'tag', label: 'สินค้า', cap: 'sells_products', match: (p: string) => p.startsWith('/merchant/products') },
  { href: '/merchant/rooms', icon: 'bed', label: 'ห้องพัก', cap: 'offers_stay', match: (p: string) => p.startsWith('/merchant/rooms') },
  { href: '/merchant/loyalty', icon: 'spark', label: 'แต้ม', cap: null, match: (p: string) => p.startsWith('/merchant/loyalty') },
  { href: '/merchant/shop', icon: 'store', label: 'ร้าน', cap: null, match: (p: string) => p.startsWith('/merchant/shop') },
];

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const acc = await currentAccount();
  if (!acc) redirect('/merchant/login');
  const path = headers().get('x-pathname') || '/merchant';
  const live = acc.place_status === 'published';
  const tabs = TABS.filter((t) => !t.cap || acc[t.cap]);
  return (
    <div className="mshell">
      <header className="mtop">
        <span className="mtop-ava">{(i18n(acc.brand_name) || i18n(acc.place_name) || acc.display_name || 'ร').trim().charAt(0)}</span>
        <div className="mtop-l">
          <div className="mtop-brand">SOI HOP · ร้านค้า</div>
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
      <main className="mbody">{children}</main>
      <nav className="mtab">
        {tabs.map((t) => <a key={t.href} href={t.href} className={`mtab-i ${t.match(path) ? 'on' : ''}`}><MIcon n={t.icon} /><span>{t.label}</span></a>)}
      </nav>
    </div>
  );
}
