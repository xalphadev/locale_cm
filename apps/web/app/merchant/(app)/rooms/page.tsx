import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { RoomList } from './RoomList';
import { RoomHub } from './RoomHub';
import { Icon } from '../ui';

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
  const items = rows.map((r) => {
    const monthly = r.rental_mode === 'monthly';
    const vacant = monthly ? r.available_units > 0 : r.daily_status === 'vacant';
    const full = monthly ? r.available_units === 0 : r.daily_status === 'full';
    const availLabel = monthly ? (r.available_units > 0 ? `ว่าง ${r.available_units} ห้อง` : 'เต็ม') : DAILY_TH[r.daily_status];
    const availCls = vacant ? 'season' : full ? 'sold' : 'off';
    return {
      id: r.id, name: i18n(r.name_i18n),
      meta: `${monthly ? 'รายเดือน' : 'รายวัน'}${r.price_minor != null ? ` · ฿${Math.round(r.price_minor / 100).toLocaleString()}/${monthly ? 'เดือน' : 'คืน'}` : ''} · อัปเดต ${daysAgo(r.availability_updated_at)}`,
      image_urls: r.image_urls, status: r.status, monthly, vacant, full, availLabel, availCls, managed: !!r.managed, physical: physById[r.id] || 0,
    };
  });
  const noun = acc.room_mode === 'unique' ? 'ห้อง' : 'ห้องพัก';
  const roomsN = items.reduce((a, i) => a + i.physical, 0);
  const hasBoard = !!acc.manages_stay && acc.room_mode !== 'unique';
  const steps = hasBoard
    ? [
        { done: items.length > 0, label: 'สร้างรูปแบบห้อง', href: '/merchant/rooms/new' },
        { done: roomsN > 0, label: 'เพิ่มห้องจริงในผัง (101, 102…)', href: '/merchant/units/new' },
        { done: items.some((i) => i.managed), label: 'เปิดนับห้องว่างอัตโนมัติ', href: '/merchant/units' },
      ]
    : [{ done: items.length > 0, label: 'เพิ่มห้อง', href: '/merchant/rooms/new' }];
  const setupDone = steps.every((st) => st.done);
  const doneN = steps.filter((st) => st.done).length;
  return (
    <>
      {searchParams?.ok === '1' && <div className="banner-ok">✓ เพิ่มห้องแล้ว</div>}
      {searchParams?.ok === 'updated' && <div className="banner-ok">✓ บันทึกการแก้ไขแล้ว</div>}
      {searchParams?.ok === 'deleted' && <div className="banner-ok">✓ ลบห้องแล้ว</div>}
      {!setupDone && (
        <div className="setupcard">
          <div className="setupcard-top">
            <div className="setupcard-ttl"><span className="setupcard-spark"><Icon n="spark" size={15} /></span> เริ่มต้นใช้งาน</div>
            <span className="setupcard-badge">{doneN}/{steps.length}</span>
          </div>
          <div className="setupbar"><span style={{ width: `${(doneN / steps.length) * 100}%` }} /></div>
          <div className="setupsteps">
            {steps.map((st, i) => {
              const now = !st.done && steps.slice(0, i).every((s) => s.done);
              return (
                <a key={i} href={st.href} className={`setupstep ${st.done ? 'done' : ''} ${now ? 'now' : ''}`}>
                  <span className="setupstep-ic">{st.done ? <Icon n="check" size={13} /> : i + 1}</span>
                  <span className="setupstep-tx">{st.label}</span>
                  {!st.done && <Icon n="chevR" size={16} className="setupstep-go" />}
                </a>
              );
            })}
          </div>
        </div>
      )}
      <RoomHub active="types" showSeg={!!acc.manages_stay && acc.room_mode !== 'unique'} noun={noun} addHref="/merchant/rooms/new" addLabel="เพิ่มห้อง" />
      <RoomList items={items} noun={noun} hasBoard={!!acc.manages_stay && acc.room_mode !== 'unique'} />
    </>
  );
}
