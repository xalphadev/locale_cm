import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { i18n, q } from '@/lib/db';
import { logoutAction } from '../actions';
import Switcher from './Switcher';
import { MShell, type Tab } from './MShell';

export const dynamic = 'force-dynamic';

// cap = capability flag this tab needs (null = always shown). match = path prefixes that light the tab.
// Active state / section accent / header visibility are all derived from the path CLIENT-SIDE in MShell —
// the layout itself never sees the path (it can't react to soft navigation), so it only ships serializable data.
const TABS: (Omit<Tab, 'badge'> & { cap: string | null })[] = [
  { href: '/merchant', icon: 'home', label: 'ภาพรวม', cap: null, exact: true, match: ['/merchant'] },
  { href: '/merchant/products', icon: 'tag', label: 'สินค้า', cap: 'sells_products', match: ['/merchant/products'] },
  { href: '/merchant/rooms', icon: 'bed', label: 'ห้องพัก', cap: 'offers_stay', match: ['/merchant/rooms', '/merchant/units'] },
  { href: '/merchant/loyalty', icon: 'spark', label: 'แต้ม', cap: null, match: ['/merchant/loyalty'] },
  { href: '/merchant/shop', icon: 'store', label: 'ร้าน', cap: null, match: ['/merchant/shop'] },
];

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const acc = await currentAccount();
  if (!acc) redirect('/merchant/login');
  const live = acc.place_status === 'published';
  // tab renames ห้องพัก → ห้อง in 'unique' mode (resort, no board); reflects the ACTIVE branch (Switcher).
  const mode = acc.room_mode || 'multi';
  // new-lead count → an always-visible badge on the ห้องพัก tab (the in-app "new booking request" alert,
  // since คำขอจอง has no nav tab of its own). Outbound delivery (LINE/email) is separate infra.
  let newLeads = 0;
  if (acc.place_id && (acc.offers_stay || acc.manages_stay)) {
    const [lr] = await q<{ n: number }>(`SELECT count(*)::int n FROM stay_booking_request WHERE place_id=$1 AND status='new' AND deleted_at IS NULL`, [acc.place_id]);
    newLeads = lr?.n || 0;
  }
  const tabs: Tab[] = TABS
    .filter((t) => !t.cap || (acc as any)[t.cap])
    .map((t) => ({
      href: t.href,
      icon: t.icon,
      label: t.href === '/merchant/rooms' && mode === 'unique' ? 'ห้อง' : t.label,
      badge: t.href === '/merchant/rooms' && newLeads > 0 ? newLeads : undefined,
      exact: !!t.exact,
      match: t.match,
    }));

  // The account header (avatar + brand switcher + status + logout). Rendered server-side (Switcher is a
  // server component with its own query) and handed to MShell, which shows it only on top-level pages.
  const header = (
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
  );

  return <MShell tabs={tabs} header={header}>{children}</MShell>;
}
