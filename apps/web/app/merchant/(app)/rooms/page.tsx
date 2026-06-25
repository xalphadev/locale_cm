import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { Icon } from '../ui';
import { RoomList } from './RoomList';
import { RoomHub } from './RoomHub';

export const dynamic = 'force-dynamic';
const DAILY_TH: Record<string, string> = { vacant: 'ว่างวันนี้', full: 'เต็มวันนี้', ask: 'สอบถามว่าง' };
const daysAgo = (ts: any) => { const d = Math.floor((Date.now() - new Date(ts).getTime()) / 86400000); return d <= 0 ? 'วันนี้' : d === 1 ? 'เมื่อวาน' : `${d} วันก่อน`; };

export default async function Rooms({ searchParams }: { searchParams: { ok?: string } }) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  if (!acc.offers_stay) redirect('/merchant');
  const rows = await q<any>(
    `SELECT id, name_i18n, rental_mode, price_minor, available_units, daily_status, availability_updated_at, image_urls, status, managed
       FROM stay_units WHERE place_id=$1 AND deleted_at IS NULL ORDER BY rental_mode, sort, created_at DESC`, [acc.place_id]);
  // physical-room count per type — a managed type's "ว่าง N" is a SUBSET of these; showing "X ห้องในผัง"
  // is what makes the type list add up to the ผังห้อง board total (else the two tabs look unrelated).
  const rc = await q<{ stay_unit_id: string; n: number }>(
    `SELECT stay_unit_id, count(*)::int n FROM stay_room
      WHERE place_id=$1 AND deleted_at IS NULL AND status='active' AND stay_unit_id IS NOT NULL GROUP BY stay_unit_id`, [acc.place_id]);
  const physById: Record<string, number> = {};
  for (const row of rc) physById[row.stay_unit_id] = row.n;
  const [pay] = await q<{ pay_online_enabled: boolean }>(`SELECT pay_online_enabled FROM places WHERE id=$1`, [acc.place_id]);
  const items = rows.map((r) => {
    const monthly = r.rental_mode === 'monthly';
    const vacant = monthly ? r.available_units > 0 : r.daily_status === 'vacant';
    const full = monthly ? r.available_units === 0 : r.daily_status === 'full';
    const availLabel = monthly ? (r.available_units > 0 ? `ว่าง ${r.available_units} ห้อง` : 'เต็ม') : DAILY_TH[r.daily_status];
    const availCls = vacant ? 'season' : full ? 'sold' : 'off';
    const physical = physById[r.id] || 0;
    const hasBoard = !!acc.manages_stay && acc.room_mode !== 'unique';
    // "health" — what's incomplete on a listing the customer sees (badges nudge the owner to finish it)
    const issues: string[] = [];
    if (!(r.image_urls && r.image_urls.filter(Boolean).length)) issues.push('ยังไม่มีรูป');
    if (r.price_minor == null) issues.push('ยังไม่ตั้งราคา');
    if (hasBoard && r.managed && physical === 0) issues.push('ยังไม่มีห้องในผัง');
    return {
      id: r.id, name: i18n(r.name_i18n),
      meta: `${monthly ? 'รายเดือน' : 'รายวัน'}${r.price_minor != null ? ` · ฿${Math.round(r.price_minor / 100).toLocaleString()}/${monthly ? 'เดือน' : 'คืน'}` : ''} · อัปเดต ${daysAgo(r.availability_updated_at)}`,
      image_urls: r.image_urls, status: r.status, monthly, vacant, full, availLabel, availCls, managed: !!r.managed, physical, issues,
    };
  });
  const noun = acc.room_mode === 'unique' ? 'ห้อง' : 'ห้องพัก';
  return (
    <>
      <RoomHub active="types" title="ประเภท & ราคา" addHref="/merchant/rooms/new" addLabel="เพิ่มห้อง" />
      <Link className="xlink" href="/merchant/pricing"><span className="xlink-ic"><Icon n="wallet" size={18} /></span><span className="xlink-tx"><b>ราคาตามฤดู & บัญชีรับเงิน</b><span>ตั้งราคาไฮ/โลว์ซีซั่น + บัญชีรับจองออนไลน์</span></span><Icon n="chevR" size={18} className="xlink-go" /></Link>
      {!pay?.pay_online_enabled && <Link className="banner-warn" href="/merchant/pricing" style={{ display: 'block', textDecoration: 'none' }}><b>ยังไม่ได้เปิดรับจองออนไลน์</b> — ตั้งบัญชี PromptPay/ธนาคาร เพื่อรับการจอง + ชำระเงินผ่านระบบ →</Link>}
      {searchParams?.ok === '1' && <div className="banner-ok">✓ เพิ่มห้องแล้ว</div>}
      {searchParams?.ok === 'updated' && <div className="banner-ok">✓ บันทึกการแก้ไขแล้ว</div>}
      {searchParams?.ok === 'deleted' && <div className="banner-ok">✓ ลบรูปแบบห้องแล้ว · <Link href="/merchant/trash" style={{ color: 'inherit', fontWeight: 800, textDecoration: 'underline' }}>กู้คืนจากถังขยะ</Link></div>}
      <RoomList items={items} noun={noun} hasBoard={!!acc.manages_stay && acc.room_mode !== 'unique'} />
    </>
  );
}
