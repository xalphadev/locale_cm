import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { Icon } from '../ui';
import { createRoomAction, setRoomOccupancyAction, setStayUnitManagedAction } from '../../actions';

export const dynamic = 'force-dynamic';

// "ผังห้อง" — physical-room management (0032). The owner lays out real rooms (floor/code/type) and
// flips each vacant⇄occupied; a managed listing's marketplace vacancy is then computed from these
// (fn_stay_refresh_vacancy). NO money, no tenant records — only an optional private note per room.
const OCC: Record<string, { cls: string; label: string }> = {
  vacant: { cls: 'season', label: 'ว่าง' },
  occupied: { cls: 'sold', label: 'มีผู้เช่า' },
  reserved: { cls: 'cat', label: 'จองแล้ว' },
  maintenance: { cls: 'off', label: 'ปิดซ่อม' },
};

export default async function Units({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  if (!acc.manages_stay) redirect('/merchant');

  const types = await q<any>(
    `SELECT id, name_i18n, rental_mode, managed, available_units, daily_status
       FROM stay_units WHERE place_id=$1 AND deleted_at IS NULL ORDER BY rental_mode, sort, created_at`, [acc.place_id]);
  const rooms = await q<any>(
    `SELECT r.id, r.code, r.floor, r.room_kind, r.capacity, r.occupancy_status, r.occupied_until, r.note,
            r.stay_unit_id, su.name_i18n unit_name, su.rental_mode
       FROM stay_room r LEFT JOIN stay_units su ON su.id = r.stay_unit_id
      WHERE r.place_id=$1 AND r.deleted_at IS NULL
      ORDER BY r.floor NULLS FIRST, r.code`, [acc.place_id]);
  const vacant = rooms.filter((r) => r.occupancy_status === 'vacant').length;
  const roomCountByUnit: Record<string, number> = {};
  for (const r of rooms) if (r.stay_unit_id) roomCountByUnit[r.stay_unit_id] = (roomCountByUnit[r.stay_unit_id] || 0) + 1;

  // group rooms by floor (preserve first-seen order)
  const byFloor: Record<string, any[]> = {}; const floors: string[] = [];
  for (const r of rooms) { const f = r.floor || '—'; if (!byFloor[f]) { byFloor[f] = []; floors.push(f); } byFloor[f].push(r); }

  return (
    <>
      {searchParams?.ok === 'added' && <div className="banner-ok">✓ เพิ่มห้องแล้ว</div>}
      {searchParams?.ok === 'deleted' && <div className="banner-ok">✓ ลบห้องแล้ว</div>}
      {searchParams?.error === 'dupe' && <div className="banner-err">เลขห้องนี้มีอยู่แล้ว</div>}
      {searchParams?.error === 'code' && <div className="banner-err">กรุณาใส่เลข/ชื่อห้อง</div>}
      {searchParams?.error === 'norooms' && <div className="banner-err">เพิ่มห้องจริงอย่างน้อย 1 ห้องก่อน แล้วค่อยเปิด “ใช้คำนวณ”</div>}

      <div className="listhead">
        <h1>ผังห้อง <span className="listcount">{rooms.length}</span></h1>
        <a className="addbtn" href="/merchant/leads"><Icon n="chat" size={16} /> คำขอจอง</a>
      </div>
      <p className="note">{rooms.length > 0 ? `ว่าง ${vacant}/${rooms.length} ห้อง · ` : ''}วางห้องจริง (ชั้น · เลขห้อง · รูปแบบ) แล้วกดสลับว่าง–มีผู้เช่า — จำนวนห้องว่างบนหน้าลูกค้าอัปเดตอัตโนมัติ</p>

      {types.length === 0 ? (
        <div className="mempty">
          <span className="mempty-ic"><Icon n="bed" size={30} /></span>
          <p>ยังไม่มี “รูปแบบห้อง” — สร้างรูปแบบ (เช่น สตูดิโอ / 1 ห้องนอน) ในเมนูห้องพักก่อน แล้วค่อยเพิ่มห้องจริง</p>
          <a className="btn btn-primary" href="/merchant/rooms/new">+ สร้างรูปแบบห้อง</a>
        </div>
      ) : (
        <>
          {/* per-listing: compute vacancy from real rooms, or keep hand-typed */}
          <section className="fsec">
            <div className="fsec-h"><span className="fsec-ic"><Icon n="bed" size={15} /></span> คำนวณห้องว่างจากห้องจริง</div>
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
                    : (
                      <form action={setStayUnitManagedAction.bind(null, t.id, !t.managed)}>
                        <button className={`dbtn sm ${t.managed ? 'primary' : ''}`} type="submit">{t.managed ? 'อัตโนมัติ ✓' : 'ใช้คำนวณ'}</button>
                      </form>
                    )}
                </div>
              );
            })}
            <p className="fhint">เปิด “ใช้คำนวณ” → จำนวนห้องว่างที่ลูกค้าเห็นจะนับจากห้องจริงที่ตั้งเป็น “ว่าง” (ปิด = พิมพ์ตัวเลขเองเหมือนเดิม)</p>
          </section>

          {rooms.length === 0 && (
            <div className="onboard">
              <b>เริ่มต้น 3 ขั้น</b>
              <ol>
                <li>เพิ่มห้องจริงให้ครบทุกห้อง (ด้านล่าง)</li>
                <li>กดตั้งสถานะ “ว่าง / มีผู้เช่า” ของแต่ละห้อง</li>
                <li>เปิด “ใช้คำนวณ” ที่รูปแบบห้อง — ระบบจะนับห้องว่างให้ลูกค้าเห็นอัตโนมัติ</li>
              </ol>
            </div>
          )}
          {/* add a physical room */}
          <form className="fsec" action={createRoomAction}>
            <div className="fsec-h"><span className="fsec-ic"><Icon n="plus" size={15} /></span> เพิ่มห้องจริง</div>
            <div className="fgrid">
              <div className="field"><label>เลข/ชื่อห้อง *</label><input name="code" placeholder="101" required /></div>
              <div className="field"><label>ชั้น</label><input name="floor" placeholder="1" /></div>
            </div>
            <div className="fgrid">
              <div className="field"><label>รูปแบบห้อง</label>
                <select name="stay_unit_id" defaultValue="">
                  <option value="">— ไม่ระบุ —</option>
                  {types.map((t) => <option key={t.id} value={t.id}>{i18n(t.name_i18n)}</option>)}
                </select>
              </div>
              <div className="field"><label>รับได้ (ท่าน)</label><input name="capacity" type="number" min="0" placeholder="2" /></div>
            </div>
            <button className="btn btn-primary" type="submit">+ เพิ่มห้อง</button>
          </form>

          {/* rooms grouped by floor */}
          {rooms.length === 0
            ? <p className="note">ยังไม่มีห้องจริง — เพิ่มห้องแรกด้านบน</p>
            : floors.map((f) => (
              <section key={f}>
                <h2 className="rsec"><span className="rsec-ic"><Icon n="bed" size={15} /></span> {f === '—' ? 'ไม่ระบุชั้น' : `ชั้น ${f}`}</h2>
                <div className="mlist">
                  {byFloor[f].map((r) => {
                    const o = OCC[r.occupancy_status] || OCC.vacant;
                    const monthly = r.rental_mode !== 'daily';
                    return (
                      <div className="mrow" key={r.id}>
                        <a className="mrow-body" href={`/merchant/units/${r.id}`}>
                          <span className="mrow-nm">ห้อง {r.code}{r.room_kind === 'bed' ? ' (เตียง)' : ''}</span>
                          <span className="mrow-meta">{r.unit_name ? i18n(r.unit_name) : 'ไม่ระบุรูปแบบ'}{r.note ? ` · ${r.note}` : ''}{r.occupied_until && r.occupancy_status !== 'vacant' ? ` · ว่าง ${r.occupied_until}` : ''}</span>
                          <span className="mrow-tags"><span className={`t ${o.cls}`}>{o.label}</span></span>
                        </a>
                        {monthly
                          ? (
                            <form action={setRoomOccupancyAction.bind(null, r.id, r.occupancy_status === 'vacant' ? 'occupied' : 'vacant')}>
                              <button className={`dbtn sm ${r.occupancy_status === 'vacant' ? '' : 'primary'}`} type="submit">{r.occupancy_status === 'vacant' ? 'ตั้งมีผู้เช่า' : 'ตั้งว่าง'}</button>
                            </form>
                          )
                          : <a className="dbtn sm" href={`/merchant/units/${r.id}`}>ปฏิทิน →</a>}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
        </>
      )}
    </>
  );
}
