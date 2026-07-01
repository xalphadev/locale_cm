import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { Icon } from '../ui';
import { setRoomGroupTermAction } from '../../actions';
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
            su.name_i18n unit_name, su.rental_mode, g.contact_name guest_name, g.contact_phone guest_phone,
            ten.tenant_name, ten.rent_minor
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
       -- structured tenant + rent from the active lease (0058), if recorded
       LEFT JOIN LATERAL (
         SELECT t.full_name tenant_name, l.rent_minor
           FROM stay_lease l JOIN stay_tenant t ON t.id = l.tenant_id AND t.deleted_at IS NULL
          WHERE l.room_id = r.id AND l.status='active' AND l.deleted_at IS NULL
          ORDER BY l.created_at DESC LIMIT 1
       ) ten ON true
      WHERE r.place_id=$1 AND r.deleted_at IS NULL ORDER BY r.floor NULLS FIRST, r.code`, [acc.place_id]);

  const vacant = rooms.filter((r) => r.occupancy_status === 'vacant').length;
  const occupied = rooms.filter((r) => r.occupancy_status === 'occupied').length;
  const reserved = rooms.filter((r) => r.occupancy_status === 'reserved').length;
  const maint = rooms.filter((r) => r.occupancy_status === 'maintenance').length;
  const totalForBar = rooms.length || 1;
  const seg = (n: number) => `${((n / totalForBar) * 100).toFixed(2)}%`;
  const roomsData = rooms.map((r) => ({
    id: r.id, code: r.code, floor: r.floor, room_kind: r.room_kind, status: r.occupancy_status,
    occupied_until: r.occupied_until, note: r.note, type: r.unit_name ? i18n(r.unit_name) : '', monthly: r.rental_mode !== 'daily',
    guest: r.tenant_name || r.guest_name || null, guestPhone: r.guest_phone || null,
    rent: r.rent_minor ? Math.round(Number(r.rent_minor) / 100) : null,
  }));
  const term = acc.room_group_term || 'ชั้น';
  const soonRows = await q<any>(
    `SELECT r.id, r.code, r.floor, to_char(r.occupied_until,'YYYY-MM-DD') occupied_until,
            (CASE WHEN r.occupied_until < CURRENT_DATE + 7 THEN 0 WHEN r.occupied_until < CURRENT_DATE + 31 THEN 1 ELSE 2 END) bucket
       FROM stay_room r WHERE r.place_id=$1 AND r.deleted_at IS NULL AND r.status='active'
         AND r.occupancy_status IN ('occupied','reserved') AND r.occupied_until IS NOT NULL
         AND r.occupied_until >= CURRENT_DATE AND r.occupied_until < CURRENT_DATE + 45
      ORDER BY r.occupied_until`, [acc.place_id]);
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
      <RoomHub active="board" title="ผังห้อง" />

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
          <div className="rb-hero">
            <div className="rb-hero-num"><b style={{ color: ST.vacant.color }}>{vacant}</b><span>ห้องว่าง<i> / {rooms.length}</i></span></div>
            <div className="rb-hero-bar">
              <div className="occbar-track">
                {vacant > 0 && <span style={{ width: seg(vacant), background: ST.vacant.color }} title={`ว่าง ${vacant}`} />}
                {occupied > 0 && <span style={{ width: seg(occupied), background: ST.occupied.color }} title={`มีผู้เช่า ${occupied}`} />}
                {reserved > 0 && <span style={{ width: seg(reserved), background: ST.reserved.color }} title={`จอง ${reserved}`} />}
                {maint > 0 && <span style={{ width: seg(maint), background: ST.maintenance.color }} title={`ปิดซ่อม ${maint}`} />}
              </div>
              <span className="rb-hero-pct">ใช้งาน {rooms.length ? Math.round(((rooms.length - vacant) / rooms.length) * 100) : 0}%</span>
            </div>
            <div className="rb-hero-leg">
              {vacant > 0 && <span><i style={{ background: ST.vacant.color }} /> <em style={{ color: ST.vacant.color }}>○</em> ว่าง {vacant}</span>}
              {occupied > 0 && <span><i style={{ background: ST.occupied.color }} /> <em style={{ color: ST.occupied.color }}>●</em> มีผู้เช่า {occupied}</span>}
              {reserved > 0 && <span><i style={{ background: ST.reserved.color }} /> <em style={{ color: ST.reserved.color }}>◐</em> จอง {reserved}</span>}
              {maint > 0 && <span><i style={{ background: ST.maintenance.color }} /> <em style={{ color: ST.maintenance.color }}>✕</em> ปิดซ่อม {maint}</span>}
            </div>
          </div>
          {(soonRows.length > 0 || hasDaily) && (
            <div className="rb-teasers">
              {soonRows.length > 0 && <a href="#soon" className="occteaser-chip"><Icon n="clock" size={13} /> ว่างเร็ว {soonRows.length}</a>}
              {hasDaily && <a href="#daily" className="occteaser-chip"><Icon n="calendar" size={13} /> วันนี้ เข้า {checkIns.length} · ออก {checkOuts.length}</a>}
            </div>
          )}

          <RoomBoard rooms={roomsData} groupTerm={term} groupAction={setRoomGroupTermAction} />

          {(() => {
            // collapsed-by-default "who's in which room" list — the compact chip grid lost the at-a-glance
            // tenant view, so this brings it back without un-compacting the board (native <details>, no JS)
            const inhouse = roomsData.filter((r: any) => (r.status === 'occupied' || r.status === 'reserved') && r.monthly);
            return inhouse.length > 0 ? (
              <details id="who" className="guestpanel">
                <summary><Icon n="users" size={14} /> ผู้เข้าพักตอนนี้ <span className="listcount">{inhouse.length}</span></summary>
                <div className="guestpanel-list">
                  {inhouse.map((r: any) => (
                    <div className="guestrow" key={r.id}>
                      <Link href={`/merchant/units/${r.id}`} className="guestrow-l">
                        <span className="guestrow-rm" style={{ color: ST[r.status]?.color }}>ห้อง {r.code}</span>
                        <span className="guestrow-nm">{r.guest || r.note || <i style={{ opacity: .5 }}>ยังไม่ระบุชื่อ</i>}</span>
                        {r.rent && <span className="guestrow-until">฿{r.rent.toLocaleString()}/ด</span>}
                        {r.occupied_until && <span className="guestrow-until">ว่าง {fmtD(r.occupied_until)}</span>}
                      </Link>
                      {r.guestPhone && <a className="dbtn sm" href={`tel:${r.guestPhone}`} aria-label={`โทร ${r.guestPhone}`}><Icon n="chat" size={14} /> โทร</a>}
                    </div>
                  ))}
                </div>
              </details>
            ) : null;
          })()}

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

        </>
      )}
    </>
  );
}
