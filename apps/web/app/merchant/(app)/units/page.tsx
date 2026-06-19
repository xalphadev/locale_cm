import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { Icon } from '../ui';
import { setStayUnitManagedAction, setRoomGroupTermAction } from '../../actions';
import RoomBoard from './RoomBoard';
import { RoomHub } from '../rooms/RoomHub';

export const dynamic = 'force-dynamic';

// "ผังห้อง" board — VIEW only (a visual room grid by floor + occupancy summary). Adding/editing rooms
// lives on separate pages (/units/new, /units/[id]) so the list isn't tangled with forms. Status color:
// vacant=green (rentable), occupied=blue (rented), reserved=amber, maintenance=grey.
const ST: Record<string, { label: string; color: string }> = {
  vacant: { label: 'ว่าง', color: '#12b76a' },
  occupied: { label: 'มีผู้เช่า', color: '#3b82f6' },
  reserved: { label: 'จองแล้ว', color: '#f59e0b' },
  maintenance: { label: 'ปิดซ่อม', color: '#9aa0a6' },
};
const fmtD = (d: any) => (d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : '');
const BUCKETS = ['สัปดาห์นี้', 'ภายในเดือนนี้', 'เดือนหน้า'];

export default async function Units({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  if (!acc.manages_stay || acc.room_mode === 'unique') redirect('/merchant');

  const types = await q<any>(`SELECT id, name_i18n, rental_mode, managed FROM stay_units WHERE place_id=$1 AND deleted_at IS NULL ORDER BY rental_mode, sort, created_at`, [acc.place_id]);
  const rooms = await q<any>(
    `SELECT r.id, r.code, r.floor, r.room_kind, r.occupancy_status, r.occupied_until, r.note, r.stay_unit_id, su.name_i18n unit_name, su.rental_mode
       FROM stay_room r LEFT JOIN stay_units su ON su.id = r.stay_unit_id
      WHERE r.place_id=$1 AND r.deleted_at IS NULL ORDER BY r.floor NULLS FIRST, r.code`, [acc.place_id]);

  const vacant = rooms.filter((r) => r.occupancy_status === 'vacant').length;
  const occupied = rooms.filter((r) => r.occupancy_status === 'occupied').length;
  const reserved = rooms.filter((r) => r.occupancy_status === 'reserved').length;
  const maint = rooms.filter((r) => r.occupancy_status === 'maintenance').length;
  const totalForBar = rooms.length || 1;
  const seg = (n: number) => `${((n / totalForBar) * 100).toFixed(2)}%`;
  const roomCountByUnit: Record<string, number> = {};
  for (const r of rooms) if (r.stay_unit_id) roomCountByUnit[r.stay_unit_id] = (roomCountByUnit[r.stay_unit_id] || 0) + 1;
  const roomsData = rooms.map((r) => ({
    id: r.id, code: r.code, floor: r.floor, room_kind: r.room_kind, status: r.occupancy_status,
    occupied_until: r.occupied_until, note: r.note, type: r.unit_name ? i18n(r.unit_name) : '', monthly: r.rental_mode !== 'daily',
  }));
  const term = acc.room_group_term || 'ชั้น';
  const soonRows = await q<any>(
    `SELECT r.id, r.code, r.floor, r.occupied_until,
            (CASE WHEN r.occupied_until < CURRENT_DATE + 7 THEN 0 WHEN r.occupied_until < CURRENT_DATE + 31 THEN 1 ELSE 2 END) bucket
       FROM stay_room r WHERE r.place_id=$1 AND r.deleted_at IS NULL AND r.status='active'
         AND r.occupancy_status IN ('occupied','reserved') AND r.occupied_until IS NOT NULL
         AND r.occupied_until >= CURRENT_DATE AND r.occupied_until < CURRENT_DATE + 45
      ORDER BY r.occupied_until`, [acc.place_id]);

  return (
    <>
      {searchParams?.ok === 'added' && <div className="banner-ok">✓ เพิ่มห้องแล้ว</div>}
      {searchParams?.ok === 'bulk' && <div className="banner-ok">✓ เพิ่มหลายห้องแล้ว</div>}
      {searchParams?.ok === 'deleted' && <div className="banner-ok">✓ ลบห้องแล้ว</div>}
      {searchParams?.error === 'norooms' && <div className="banner-err">เพิ่มห้องจริงอย่างน้อย 1 ห้องก่อน แล้วค่อยเปิด “ใช้คำนวณ”</div>}

      <RoomHub active="board" showSeg noun="ห้องพัก" addHref={types.length > 0 ? '/merchant/units/new' : undefined} addLabel="เพิ่มห้อง" />

      {types.length === 0 ? (
        <div className="mempty">
          <span className="mempty-ic"><Icon n="bed" size={30} /></span>
          <p>ยังไม่มี “รูปแบบห้อง” — สร้างรูปแบบ (เช่น สตูดิโอ / เตียงในห้องรวม) ในเมนู “ห้องพัก” ก่อน แล้วค่อยวางห้องจริง</p>
          <a className="btn btn-primary" href="/merchant/rooms/new">+ สร้างรูปแบบห้อง</a>
        </div>
      ) : rooms.length === 0 ? (
        <div className="mempty">
          <span className="mempty-ic"><Icon n="bed" size={30} /></span>
          <p>ยังไม่มีห้องจริงในผัง — เพิ่มห้อง (ทีละห้อง หรือหลายห้องรวดเดียว) เพื่อเริ่มคุมห้องว่าง</p>
          <a className="btn btn-primary" href="/merchant/units/new"><Icon n="plus" size={16} /> เพิ่มห้องแรก</a>
        </div>
      ) : (
        <>
          <div className="occbar">
            <div className="occbar-top">
              <span><b>{rooms.length}</b> ห้อง · <b style={{ color: ST.vacant.color }}>{vacant}</b> ว่าง</span>
              <a className="occbar-leads" href="/merchant/leads"><Icon n="chat" size={14} /> คำขอจอง</a>
            </div>
            <div className="occbar-track">
              {vacant > 0 && <span style={{ width: seg(vacant), background: ST.vacant.color }} title={`ว่าง ${vacant}`} />}
              {occupied > 0 && <span style={{ width: seg(occupied), background: ST.occupied.color }} title={`มีผู้เช่า ${occupied}`} />}
              {reserved > 0 && <span style={{ width: seg(reserved), background: ST.reserved.color }} title={`จอง ${reserved}`} />}
              {maint > 0 && <span style={{ width: seg(maint), background: ST.maintenance.color }} title={`ปิดซ่อม ${maint}`} />}
            </div>
            <div className="occlegend">
              {vacant > 0 && <span><i style={{ background: ST.vacant.color }} /> ว่าง {vacant}</span>}
              {occupied > 0 && <span><i style={{ background: ST.occupied.color }} /> มีผู้เช่า {occupied}</span>}
              {reserved > 0 && <span><i style={{ background: ST.reserved.color }} /> จองแล้ว {reserved}</span>}
              {maint > 0 && <span><i style={{ background: ST.maintenance.color }} /> ปิดซ่อม {maint}</span>}
            </div>
          </div>

          {soonRows.length > 0 && (
            <div className="soonbox">
              <div className="soonbox-h"><Icon n="clock" size={14} /> ว่างเร็ว ๆ นี้ <span className="listcount">{soonRows.length}</span></div>
              {BUCKETS.map((b, bi) => {
                const items = soonRows.filter((sr: any) => sr.bucket === bi);
                return items.length ? (
                  <div className="soonbox-g" key={bi}>
                    <span className="soonbox-gl">{b}</span>
                    <div className="soonbox-items">
                      {items.map((sr: any) => <a key={sr.id} href={`/merchant/units/${sr.id}`} className="soonpill">ห้อง {sr.code} · {fmtD(sr.occupied_until)}</a>)}
                    </div>
                  </div>
                ) : null;
              })}
            </div>
          )}

          <div className="grpset">
            <div className="grpset-row">
              <span className="grpset-l">จัดกลุ่มห้องตาม</span>
              <form action={setRoomGroupTermAction} className="grpset-f">
                <input name="term_custom" defaultValue={term} maxLength={16} placeholder="ชั้น" aria-label="คำเรียกกลุ่มห้อง" />
                <button className="dbtn sm primary" type="submit">บันทึก</button>
              </form>
            </div>
            <p className="fhint">พิมพ์เองได้ (เช่น โซน · อาคาร · ปีก · บ้าน) — ตอนเพิ่มห้องจะถามชื่อ{term} (เช่น ริมน้ำ) แล้วจัดกลุ่มในผังให้</p>
          </div>

          <RoomBoard rooms={roomsData} groupTerm={term} />

          <details className="usettings">
            <summary><Icon n="bed" size={14} /> ตั้งค่า · นับห้องว่างอัตโนมัติ</summary>
            <div className="grpterm-sec">นับห้องว่างอัตโนมัติ</div>
            <p className="fhint">เปิด “ใช้คำนวณ” → จำนวนห้องว่างที่ลูกค้าเห็นจะนับจากห้องจริงที่ตั้งเป็น “ว่าง” (ปิด = พิมพ์ตัวเลขเองเหมือนเดิม)</p>
            {types.map((t) => {
              const rc = roomCountByUnit[t.id] || 0;
              return (
                <div className="mrow" key={t.id} style={{ cursor: 'default' }}>
                  <span className="mrow-body">
                    <span className="mrow-nm">{i18n(t.name_i18n)}</span>
                    <span className="mrow-meta">{t.rental_mode === 'monthly' ? 'รายเดือน' : 'รายวัน'} · {rc} ห้องจริง{t.managed ? ' · นับอัตโนมัติ' : ''}</span>
                  </span>
                  {rc === 0
                    ? <span className="dbtn sm" style={{ opacity: .45 }}>เพิ่มห้องก่อน</span>
                    : <form action={setStayUnitManagedAction.bind(null, t.id, !t.managed)}><button className={`dbtn sm ${t.managed ? 'primary' : ''}`} type="submit">{t.managed ? 'อัตโนมัติ ✓' : 'ใช้คำนวณ'}</button></form>}
                </div>
              );
            })}
          </details>
        </>
      )}
    </>
  );
}
