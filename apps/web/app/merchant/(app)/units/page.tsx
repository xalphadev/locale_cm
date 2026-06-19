import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { Icon } from '../ui';
import { setStayUnitManagedAction, setRoomGroupTermAction } from '../../actions';
import RoomBoard from './RoomBoard';

export const dynamic = 'force-dynamic';

// "ผังห้อง" board — VIEW only (a visual room grid by floor + occupancy summary). Adding/editing rooms
// lives on separate pages (/units/new, /units/[id]) so the list isn't tangled with forms. Status color:
// vacant=green (rentable), occupied=blue (rented), reserved=amber, maintenance=grey.
const ST: Record<string, { label: string; color: string }> = {
  vacant: { label: 'ว่าง', color: '#1aa35a' },
  occupied: { label: 'มีผู้เช่า', color: '#3f72c4' },
  reserved: { label: 'จองแล้ว', color: '#e0992a' },
  maintenance: { label: 'ปิดซ่อม', color: '#9aa0a6' },
};

export default async function Units({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  if (!acc.manages_stay) redirect('/merchant');

  const types = await q<any>(`SELECT id, name_i18n, rental_mode, managed FROM stay_units WHERE place_id=$1 AND deleted_at IS NULL ORDER BY rental_mode, sort, created_at`, [acc.place_id]);
  const rooms = await q<any>(
    `SELECT r.id, r.code, r.floor, r.room_kind, r.occupancy_status, r.occupied_until, r.note, r.stay_unit_id, su.name_i18n unit_name, su.rental_mode
       FROM stay_room r LEFT JOIN stay_units su ON su.id = r.stay_unit_id
      WHERE r.place_id=$1 AND r.deleted_at IS NULL ORDER BY r.floor NULLS FIRST, r.code`, [acc.place_id]);

  const vacant = rooms.filter((r) => r.occupancy_status === 'vacant').length;
  const occupied = rooms.filter((r) => r.occupancy_status === 'occupied').length;
  const roomCountByUnit: Record<string, number> = {};
  for (const r of rooms) if (r.stay_unit_id) roomCountByUnit[r.stay_unit_id] = (roomCountByUnit[r.stay_unit_id] || 0) + 1;
  const roomsData = rooms.map((r) => ({
    id: r.id, code: r.code, floor: r.floor, room_kind: r.room_kind, status: r.occupancy_status,
    occupied_until: r.occupied_until, note: r.note, type: r.unit_name ? i18n(r.unit_name) : '', monthly: r.rental_mode !== 'daily',
  }));

  return (
    <>
      {searchParams?.ok === 'added' && <div className="banner-ok">✓ เพิ่มห้องแล้ว</div>}
      {searchParams?.ok === 'bulk' && <div className="banner-ok">✓ เพิ่มหลายห้องแล้ว</div>}
      {searchParams?.ok === 'deleted' && <div className="banner-ok">✓ ลบห้องแล้ว</div>}
      {searchParams?.error === 'norooms' && <div className="banner-err">เพิ่มห้องจริงอย่างน้อย 1 ห้องก่อน แล้วค่อยเปิด “ใช้คำนวณ”</div>}

      <div className="listhead">
        <h1>ผังห้อง</h1>
        {types.length > 0 && <a className="addbtn" href="/merchant/units/new"><Icon n="plus" size={17} /> เพิ่มห้อง</a>}
      </div>

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
          <div className="rsum">
            <div className="rsum-i"><b style={{ color: ST.vacant.color }}>{vacant}</b><span>ว่าง</span></div>
            <div className="rsum-i"><b style={{ color: ST.occupied.color }}>{occupied}</b><span>มีผู้เช่า</span></div>
            <div className="rsum-i"><b>{rooms.length}</b><span>ทั้งหมด</span></div>
            <a className="rsum-leads" href="/merchant/leads"><Icon n="chat" size={15} /> คำขอจอง</a>
          </div>

          <RoomBoard rooms={roomsData} groupTerm={acc.room_group_term || 'ชั้น'} />

          <details className="usettings">
            <summary><Icon n="bed" size={14} /> ตั้งค่า</summary>
            <div className="grpterm">
              <span className="grpterm-l">เรียกกลุ่มห้องว่า</span>
              <form action={setRoomGroupTermAction}>
                <select name="term" defaultValue={acc.room_group_term || 'ชั้น'}>
                  <option value="ชั้น">ชั้น</option>
                  <option value="โซน">โซน (รีสอร์ท)</option>
                  <option value="อาคาร">อาคาร</option>
                  <option value="ตึก">ตึก</option>
                </select>
                <button className="dbtn sm primary" type="submit">บันทึก</button>
              </form>
            </div>
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
