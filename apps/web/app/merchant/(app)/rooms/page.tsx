import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
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
  const items = rows.map((r) => {
    const monthly = r.rental_mode === 'monthly';
    const vacant = monthly ? r.available_units > 0 : r.daily_status === 'vacant';
    const full = monthly ? r.available_units === 0 : r.daily_status === 'full';
    const availLabel = monthly ? (r.available_units > 0 ? `ว่าง ${r.available_units} ห้อง` : 'เต็ม') : DAILY_TH[r.daily_status];
    const availCls = vacant ? 'season' : full ? 'sold' : 'off';
    return {
      id: r.id, name: i18n(r.name_i18n),
      meta: `${monthly ? 'รายเดือน' : 'รายวัน'}${r.price_minor != null ? ` · ฿${Math.round(r.price_minor / 100).toLocaleString()}/${monthly ? 'เดือน' : 'คืน'}` : ''} · อัปเดต ${daysAgo(r.availability_updated_at)}`,
      image_urls: r.image_urls, status: r.status, monthly, vacant, full, availLabel, availCls, managed: !!r.managed,
    };
  });
  const noun = acc.room_mode === 'unique' ? 'ห้อง' : 'ห้องพัก';
  return (
    <>
      {searchParams?.ok === '1' && <div className="banner-ok">✓ เพิ่มห้องแล้ว</div>}
      {searchParams?.ok === 'updated' && <div className="banner-ok">✓ บันทึกการแก้ไขแล้ว</div>}
      {searchParams?.ok === 'deleted' && <div className="banner-ok">✓ ลบห้องแล้ว</div>}
      <RoomHub active="types" showSeg={!!acc.manages_stay && acc.room_mode !== 'unique'} noun={noun} addHref="/merchant/rooms/new" addLabel="เพิ่มห้อง" />
      <RoomList items={items} noun={noun} />
    </>
  );
}
