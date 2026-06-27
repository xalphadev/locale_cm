import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { MTopbar } from '../../MTopbar';
import { Icon } from '../../ui';
import { addRoomBlockAction } from '../../../actions';
import AvailabilitySearch from './AvailabilitySearch';

export const dynamic = 'force-dynamic';

// "หาห้องว่าง" — a standalone availability search (replaces the on-calendar tap-the-header find-mode):
// pick a date range with the picker → see the rooms free EVERY night of that range → expand a room to
// book it (guest name/phone optional, GiST-guarded). No money — operational booking only.
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const fmtTh = (s: string) => { const [, m, d] = s.split('-'); return `${Number(d)} ${TH[Number(m) - 1]}`; };
const nightsOf = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
const money = (m: number | null, p: string | null) => (m == null ? '' : `฿${(m / 100).toLocaleString('th-TH')}${p === 'night' ? '/คืน' : p === 'month' ? '/เดือน' : ''}`);
const coll = (x: string, y: string) => (x || '').localeCompare(y || '', undefined, { numeric: true, sensitivity: 'base' });

export default async function AvailableRooms({ searchParams }: { searchParams: { from?: string; to?: string; ok?: string; error?: string } }) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  if (!acc.manages_stay) redirect('/merchant/rooms');
  const term = acc.room_group_term || 'ชั้น';

  const from = isDate(searchParams?.from || '') ? searchParams!.from! : '';
  const to = isDate(searchParams?.to || '') ? searchParams!.to! : '';
  const ready = !!from && !!to && to > from;

  let groups: { id: string; name: string; rooms: any[] }[] = [];
  let freeCount = 0; let nights = 0;
  if (ready) {
    nights = nightsOf(from, to);
    const rows = await q<any>(
      `SELECT r.id, r.code, r.floor, r.stay_unit_id,
              su.name_i18n unit_name, su.price_minor, su.price_period, su.capacity, su.sort unit_sort
         FROM stay_room r
         LEFT JOIN stay_units su ON su.id = r.stay_unit_id
        WHERE r.place_id = $1 AND r.deleted_at IS NULL AND r.status='active'
          AND NOT EXISTS (
            SELECT 1 FROM stay_occupancy_block b
             WHERE b.room_id = r.id AND b.status='active' AND b.deleted_at IS NULL
               AND b.span && daterange($2::date, $3::date, '[)'))
          AND NOT (su.rental_mode <> 'daily' AND r.occupancy_status IS NOT NULL AND r.occupancy_status <> 'vacant'
                   AND (r.occupied_until IS NULL OR r.occupied_until > $2::date))
        ORDER BY su.sort NULLS LAST, su.name_i18n->>'th', r.code`,
      [acc.place_id, from, to]);
    const mapped = rows.map((r: any) => ({
      id: r.id, code: r.code, floor: r.floor, unitId: r.stay_unit_id || '',
      unitName: r.unit_name ? i18n(r.unit_name) : 'ไม่ระบุประเภท',
      priceMinor: r.price_minor != null ? Number(r.price_minor) : null, pricePeriod: r.price_period || null,
      capacity: r.capacity || null, unitSort: r.unit_sort ?? 9999,
    })).sort((a, b) => (a.unitSort - b.unitSort) || coll(a.unitName, b.unitName) || coll(a.code, b.code));
    freeCount = mapped.length;
    for (const r of mapped) { const g = groups[groups.length - 1]; if (!g || g.id !== r.unitId) groups.push({ id: r.unitId, name: r.unitName, rooms: [r] }); else g.rooms.push(r); }
  }

  const back = `/merchant/units/available?from=${from}&to=${to}`;

  return (
    <>
      <MTopbar back="/merchant/stay" backLabel="ห้องพัก" title="หาห้องว่าง" />

      {searchParams?.ok === 'booked' && <div className="banner-ok">✓ จองห้องให้แล้ว</div>}
      {searchParams?.ok === 'blocked' && <div className="banner-ok">✓ บันทึกแล้ว</div>}
      {searchParams?.error === 'overlap' && <div className="banner-err">ห้องนี้เพิ่งถูกจองไป — เลือกห้องอื่น</div>}
      {searchParams?.error === 'daterange' && <div className="banner-err">วันเช็คเอาท์ต้องอยู่หลังวันเช็คอิน</div>}
      {searchParams?.error === 'date' && <div className="banner-err">วันที่ไม่ถูกต้อง</div>}

      {!ready ? (
        <div className="avail-empty">
          <span className="avail-empty-ic"><Icon n="calendar" size={28} /></span>
          <p className="avail-empty-t">ลูกค้าอยากเข้าพักช่วงไหน?</p>
          <p className="avail-empty-s">เลือกช่วงวันที่ แล้วดูห้องที่ว่างทุกคืน</p>
          <AvailabilitySearch />
        </div>
      ) : (
        <section className="avail-results">
          <div className="avail-bar">
            <b>ว่าง {freeCount} ห้อง</b>
            <span className="avail-range">{fmtTh(from)} – {fmtTh(to)} · {nights} คืน</span>
            <a className="avail-redo" href="/merchant/units/available">เปลี่ยนวัน</a>
          </div>
          {freeCount === 0 ? (
            <div className="mempty"><span className="mempty-ic"><Icon n="bed" size={26} /></span>
              <p>ไม่มีห้องว่างช่วง {fmtTh(from)} – {fmtTh(to)} — <a href="/merchant/units/available">เปลี่ยนวัน</a></p></div>
          ) : groups.map((g) => (
            <div className="avail-grp" key={g.id || '_'}>
              <div className="avail-grp-h"><span>{g.name}</span><i>{g.rooms.length} ห้องว่าง</i></div>
              {g.rooms.map((r: any) => (
                <details className="avail-room" key={r.id}>
                  <summary className="avail-room-sum">
                    <span className="avail-rt">
                      <b>ห้อง {r.code}</b>
                      <i>{[g.name, r.floor ? `${term} ${r.floor}` : '', money(r.priceMinor, r.pricePeriod), r.capacity ? `${r.capacity} คน` : ''].filter(Boolean).join(' · ')}</i>
                    </span>
                    <span className="avail-go-pill">จอง<Icon n="chevR" size={14} /></span>
                  </summary>
                  <form className="avail-book" action={addRoomBlockAction.bind(null, r.id)}>
                    <input type="hidden" name="start_date" value={from} />
                    <input type="hidden" name="end_date" value={to} />
                    <input type="hidden" name="block_kind" value="stay" />
                    <input type="hidden" name="returnTo" value={back} />
                    <div className="fgrid">
                      <div className="field"><label>ชื่อผู้จอง</label><input name="guest_name" maxLength={80} placeholder="ชื่อ-นามสกุล" /></div>
                      <div className="field"><label>เบอร์โทร</label><input name="guest_phone" maxLength={40} inputMode="tel" placeholder="08x-xxx-xxxx" /></div>
                    </div>
                    <input name="note" maxLength={120} placeholder="โน้ต (เห็นเฉพาะคุณ)" />
                    <button type="submit" className="dbtn primary">จองห้อง {r.code} · {nights} คืน</button>
                  </form>
                </details>
              ))}
            </div>
          ))}
        </section>
      )}
    </>
  );
}
