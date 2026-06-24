import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { Icon } from '../ui';
import { setStayUnitManagedAction, setRoomGroupTermAction } from '../../actions';
import RoomBoard from './RoomBoard';
import { RoomHub } from '../rooms/RoomHub';
import DateRangePicker from '../DateRangePicker';
import TypeCalendar from './TypeCalendar';

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

export default async function Units({ searchParams }: { searchParams: { ok?: string; error?: string; from?: string; to?: string; added?: string; skipped?: string } }) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  if (!acc.manages_stay || acc.room_mode === 'unique') redirect('/merchant');

  const types = await q<any>(`SELECT id, name_i18n, rental_mode, managed FROM stay_units WHERE place_id=$1 AND deleted_at IS NULL ORDER BY rental_mode, sort, created_at`, [acc.place_id]);
  const rooms = await q<any>(
    `SELECT r.id, r.code, r.floor, r.room_kind, r.occupancy_status, r.occupied_until, r.note, r.stay_unit_id,
            su.name_i18n unit_name, su.rental_mode, g.contact_name guest_name, g.contact_phone guest_phone
       FROM stay_room r LEFT JOIN stay_units su ON su.id = r.stay_unit_id
       -- "who's in this room right now": the guest on the active booking covering today (zero new tables)
       LEFT JOIN LATERAL (
         SELECT br.contact_name, br.contact_phone
           FROM stay_occupancy_block bk
           JOIN stay_booking_request br ON br.converted_block_id = bk.id AND br.deleted_at IS NULL
          WHERE bk.room_id = r.id AND bk.deleted_at IS NULL AND bk.status='active'
            AND bk.block_kind IN ('stay','tenancy') AND bk.span @> CURRENT_DATE
          ORDER BY bk.start_date DESC LIMIT 1
       ) g ON true
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
    guest: r.guest_name || null, guestPhone: r.guest_phone || null,
  }));
  const term = acc.room_group_term || 'ชั้น';
  const soonRows = await q<any>(
    `SELECT r.id, r.code, r.floor, to_char(r.occupied_until,'YYYY-MM-DD') occupied_until,
            (CASE WHEN r.occupied_until < CURRENT_DATE + 7 THEN 0 WHEN r.occupied_until < CURRENT_DATE + 31 THEN 1 ELSE 2 END) bucket
       FROM stay_room r WHERE r.place_id=$1 AND r.deleted_at IS NULL AND r.status='active'
         AND r.occupancy_status IN ('occupied','reserved') AND r.occupied_until IS NOT NULL
         AND r.occupied_until >= CURRENT_DATE AND r.occupied_until < CURRENT_DATE + 45
      ORDER BY r.occupied_until`, [acc.place_id]);
  const roster = rooms
    .filter((r) => r.occupancy_status === 'occupied' || r.occupancy_status === 'reserved')
    .sort((a, b) => (a.occupied_until ? String(a.occupied_until) : '9999').localeCompare(b.occupied_until ? String(b.occupied_until) : '9999'));
  const promptAutoCount = types.some((t) => !t.managed && (roomCountByUnit[t.id] || 0) > 0);
  const hasDaily = rooms.some((r) => r.rental_mode === 'daily');
  const fromQ = searchParams?.from, toQ = searchParams?.to;
  const rangeOk = /^\d{4}-\d{2}-\d{2}$/.test(fromQ || '') && /^\d{4}-\d{2}-\d{2}$/.test(toQ || '') && (toQ || '') > (fromQ || '');
  const todayRows = hasDaily ? await q<any>(
    `SELECT r.id, r.code, b.note, (b.start_date=CURRENT_DATE) is_in, (b.end_date=CURRENT_DATE) is_out
       FROM stay_occupancy_block b JOIN stay_room r ON r.id=b.room_id
      WHERE r.place_id=$1 AND r.deleted_at IS NULL AND b.status='active' AND b.deleted_at IS NULL
        AND (b.start_date=CURRENT_DATE OR b.end_date=CURRENT_DATE) ORDER BY r.code`, [acc.place_id]) : [];
  const checkIns = todayRows.filter((t: any) => t.is_in);
  const checkOuts = todayRows.filter((t: any) => t.is_out);
  const freeRooms = (hasDaily && rangeOk) ? await q<any>(
    `SELECT r.id, r.code FROM stay_room r JOIN stay_units su ON su.id=r.stay_unit_id
      WHERE r.place_id=$1 AND r.deleted_at IS NULL AND r.status='active' AND su.rental_mode='daily'
        AND NOT EXISTS (SELECT 1 FROM stay_occupancy_block b WHERE b.room_id=r.id AND b.status='active' AND b.deleted_at IS NULL AND b.block_kind IN ('stay','tenancy','maintenance') AND b.span && daterange($2::date,$3::date,'[)'))
      ORDER BY r.floor NULLS FIRST, r.code`, [acc.place_id, fromQ, toQ]) : null;
  const dayAvail = hasDaily ? await q<any>(
    `SELECT to_char(d,'YYYY-MM-DD') AS day, count(r.id)::int total,
            count(r.id) FILTER (WHERE NOT EXISTS (
              SELECT 1 FROM stay_occupancy_block b WHERE b.room_id=r.id AND b.status='active' AND b.deleted_at IS NULL
                AND b.block_kind IN ('stay','tenancy','maintenance') AND b.span @> d::date))::int free
       FROM generate_series(CURRENT_DATE, CURRENT_DATE + 34, interval '1 day') d
       CROSS JOIN stay_room r JOIN stay_units su ON su.id=r.stay_unit_id AND su.rental_mode='daily'
      WHERE r.place_id=$1 AND r.deleted_at IS NULL AND r.status='active'
      GROUP BY d ORDER BY d`, [acc.place_id]) : [];

  return (
    <>
      <RoomHub active="board" title="ผังห้อง" addHref={types.length > 0 ? '/merchant/units/new' : undefined} addLabel="เพิ่มห้อง" />

      {searchParams?.ok === 'added' && <div className="banner-ok">✓ เพิ่มห้องแล้ว</div>}
      {searchParams?.ok === 'bulk' && (
        <div className={Number(searchParams.skipped) > 0 ? 'banner-warn' : 'banner-ok'}>
          ✓ เพิ่ม {searchParams.added ?? 0} ห้องแล้ว{Number(searchParams.skipped) > 0 ? ` · ข้าม ${searchParams.skipped} ห้องที่มีเลขซ้ำอยู่แล้ว` : ''}
        </div>
      )}
      {searchParams?.ok === 'deleted' && <div className="banner-ok">✓ ลบห้องแล้ว · <Link href="/merchant/trash" style={{ color: 'inherit', fontWeight: 800, textDecoration: 'underline' }}>กู้คืนจากถังขยะ</Link></div>}
      {searchParams?.error === 'norooms' && <div className="banner-err">เพิ่มห้องจริงอย่างน้อย 1 ห้องก่อน แล้วค่อยเปิด “ใช้คำนวณ”</div>}

      {types.length === 0 ? (
        <div className="mempty">
          <span className="mempty-ic"><Icon n="bed" size={30} /></span>
          <p>ยังไม่มี “รูปแบบห้อง” — สร้างรูปแบบ (เช่น สตูดิโอ / เตียงในห้องรวม) ในเมนู “ห้องพัก” ก่อน แล้วค่อยวางห้องจริง</p>
          <Link className="btn btn-primary" href="/merchant/rooms/new">+ สร้างรูปแบบห้อง</Link>
        </div>
      ) : rooms.length === 0 ? (
        <div className="mempty">
          <span className="mempty-ic"><Icon n="bed" size={30} /></span>
          <p>ยังไม่มีห้องจริงในผัง — เพิ่มห้อง (ทีละห้อง หรือหลายห้องรวดเดียว) เพื่อเริ่มคุมห้องว่าง</p>
          <Link className="btn btn-primary" href="/merchant/units/new"><Icon n="plus" size={16} /> เพิ่มห้องแรก</Link>
        </div>
      ) : (
        <>
          <div className="occbar">
            <div className="occbar-top">
              <span><b>{rooms.length}</b> ห้อง · <b style={{ color: ST.vacant.color }}>{vacant}</b> ว่าง · <b>{rooms.length ? Math.round(((rooms.length - vacant) / rooms.length) * 100) : 0}%</b> ใช้งาน</span>
              <span className="occbar-acts">
                <Link className="occbar-leads" href="/merchant/units/calendar"><Icon n="calendar" size={14} /> ปฏิทินรวม</Link>
                <Link className="occbar-leads" href="/merchant/units/print"><Icon n="image" size={14} /> พิมพ์</Link>
                <Link className="occbar-leads" href="/merchant/bookings"><Icon n="chat" size={14} /> การจอง</Link>
              </span>
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
            {(soonRows.length > 0 || hasDaily) && (
              <div className="occteaser">
                {soonRows.length > 0 && <a href="#soon" className="occteaser-chip"><Icon n="clock" size={13} /> ว่างเร็ว {soonRows.length}</a>}
                {hasDaily && <a href="#daily" className="occteaser-chip"><Icon n="calendar" size={13} /> วันนี้ เข้า {checkIns.length} · ออก {checkOuts.length}</a>}
              </div>
            )}
          </div>

          <RoomBoard rooms={roomsData} groupTerm={term} />

          {soonRows.length > 0 && (
            <details id="soon" className="soonbox">
              <summary><Icon n="clock" size={14} /> ว่างเร็ว ๆ นี้ <span className="listcount">{soonRows.length}</span></summary>
              {BUCKETS.map((b, bi) => {
                const items = soonRows.filter((sr: any) => sr.bucket === bi);
                return items.length ? (
                  <div className="soonbox-g" key={bi}>
                    <span className="soonbox-gl">{b}</span>
                    <div className="soonbox-items">
                      {items.map((sr: any) => <Link key={sr.id} href={`/merchant/units/${sr.id}`} className="soonpill">ห้อง {sr.code} · {fmtD(sr.occupied_until)}</Link>)}
                    </div>
                  </div>
                ) : null;
              })}
            </details>
          )}

          {hasDaily && (
            <details id="daily" className="dailybox" open={rangeOk}>
              <summary><Icon n="calendar" size={14} /> รายวัน · วันนี้ · เข้า {checkIns.length} / ออก {checkOuts.length}</summary>
              {(checkIns.length > 0 || checkOuts.length > 0) && (
                <div className="soonbox-items" style={{ marginTop: 4 }}>
                  {checkIns.map((t: any) => <Link key={'i' + t.id} href={`/merchant/units/${t.id}`} className="soonpill">เข้า · {t.code}{t.note ? ` (${t.note})` : ''}</Link>)}
                  {checkOuts.map((t: any) => <Link key={'o' + t.id} href={`/merchant/units/${t.id}`} className="soonpill">ออก · {t.code}{t.note ? ` (${t.note})` : ''}</Link>)}
                </div>
              )}
              {dayAvail.length > 0 && <TypeCalendar days={dayAvail} />}
              <details className="dailyfind" open={rangeOk}>
                <summary>เช็คห้องว่างเฉพาะช่วง</summary>
                <form method="get" className="dailyfind-f">
                  <DateRangePicker mode="range" fromName="from" toName="to" labelFrom="เข้า" labelTo="ออก" />
                  <button className="btn btn-primary" type="submit" style={{ marginTop: 10 }}>เช็คห้องว่าง</button>
                </form>
                {freeRooms && (
                  <div className="dailyresult">
                    <p className="fhint">ว่างช่วง {fmtD(fromQ)} – {fmtD(toQ)} · {freeRooms.length} ห้อง</p>
                    {freeRooms.length > 0
                      ? <div className="soonbox-items">{freeRooms.map((fr: any) => <Link key={fr.id} href={`/merchant/units/${fr.id}`} className="soonpill">{fr.code}</Link>)}</div>
                      : <span className="fhint">ไม่มีห้องว่างในช่วงนี้</span>}
                  </div>
                )}
              </details>
            </details>
          )}

          <details className="grpset">
            <summary><span>จัดกลุ่มห้องตาม <b>{term}</b></span><span className="grpset-edit">เปลี่ยน</span></summary>
            <form action={setRoomGroupTermAction} className="grpset-f">
              <input name="term_custom" defaultValue={term} maxLength={16} placeholder="ชั้น" aria-label="คำเรียกกลุ่มห้อง" />
              <button className="dbtn sm primary" type="submit">บันทึก</button>
            </form>
            <p className="fhint">พิมพ์เองได้ (เช่น โซน · อาคาร · ปีก · บ้าน) — ตอนเพิ่มห้องจะถามชื่อ{term} (เช่น ริมน้ำ) แล้วจัดกลุ่มในผังให้</p>
          </details>

          {roster.length > 0 && (
            <details className="usettings">
              <summary><Icon n="users" size={14} /> ใครอยู่ห้องไหน · {roster.length} ห้อง</summary>
              <p className="fhint">รวมโน้ตของห้องที่มีผู้เช่า/จอง — เห็นเฉพาะคุณ</p>
              <div className="roster">
                {roster.map((r) => (
                  <Link key={r.id} href={`/merchant/units/${r.id}`} className="rosterrow">
                    <span className="rosterrow-rm">ห้อง {r.code}{r.floor ? ` · ${term} ${r.floor}` : ''}</span>
                    <span className="rosterrow-nt">{r.note || '—'}</span>
                    {r.occupied_until && <span className="rosterrow-un">ว่าง {fmtD(r.occupied_until)}</span>}
                  </Link>
                ))}
              </div>
            </details>
          )}
          <details className="usettings" open={promptAutoCount}>
            <summary><Icon n="bed" size={14} /> ตั้งค่า · นับห้องว่างอัตโนมัติ{promptAutoCount ? ' ●' : ''}</summary>
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
