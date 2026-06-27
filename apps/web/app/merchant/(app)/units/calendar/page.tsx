import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { Icon } from '../../ui';
import { MTopbar } from '../../MTopbar';
import { PropertyTimeline } from '../PropertyTimeline';
import { CalJump } from '../CalJump';

export const dynamic = 'force-dynamic';

// Property-wide occupancy timeline: rooms × a slideable window (2 weeks or a month). Bookings render as
// continuous bars with the guest name; rooms group by floor, filterable + searchable for big properties.
// Read-managed: tap a free span to block, tap a bar to manage. No money — operational visibility only.
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const addDays = (ymd: string, n: number) => { const d = new Date(ymd + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const fmtRange = (a: string, b: string) => {
  const m = (s: string) => new Date(s + 'T00:00:00Z').toLocaleDateString('th-TH', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  return `${m(a)} – ${m(b)}`;
};
const coll = (x: string, y: string) => (x || '').localeCompare(y || '', undefined, { numeric: true, sensitivity: 'base' });

export default async function PropertyCalendar({ searchParams }: { searchParams: { d?: string; w?: string; ok?: string; error?: string; made?: string; skipped?: string } }) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  if (!acc.manages_stay) redirect('/merchant/rooms');
  const term = acc.room_group_term || 'ชั้น';

  const month = searchParams?.w === 'month';
  const WIN = month ? 30 : 14;
  const [{ today }] = await q<{ today: string }>(`SELECT to_char(CURRENT_DATE,'YYYY-MM-DD') today`);
  const start = isDate(searchParams?.d || '') ? searchParams!.d! : today;
  const days = Array.from({ length: WIN }, (_, i) => addDays(start, i));
  const endExcl = addDays(start, WIN);
  const prev = addDays(start, -WIN), next = addDays(start, WIN);
  const qs = (d: string) => `?d=${d}${month ? '&w=month' : ''}`;
  const vqs = (w: string) => `?${w === 'month' ? 'w=month&' : ''}d=${start}`;

  const rooms = await q<any>(
    `SELECT r.id, r.code, r.floor, r.occupancy_status, to_char(r.occupied_until,'YYYY-MM-DD') occupied_until, su.rental_mode,
            r.stay_unit_id, su.name_i18n unit_name, su.price_minor, su.price_period, su.capacity, su.bedrooms, su.sort unit_sort,
            g.contact_name guest_name,
            COALESCE(json_agg(json_build_object('id', b.id, 's', to_char(b.start_date,'YYYY-MM-DD'), 'e', to_char(b.end_date,'YYYY-MM-DD'), 'k', b.block_kind, 'note', b.note, 'guest', brb.contact_name, 'ref', brb.ref,
                     'bid', CASE WHEN brb.status='converted' THEN brb.id END, 'cin', brb.checked_in_at, 'cout', brb.checked_out_at))
                     FILTER (WHERE b.id IS NOT NULL), '[]') blocks
       FROM stay_room r
       LEFT JOIN stay_units su ON su.id = r.stay_unit_id
       LEFT JOIN stay_occupancy_block b ON b.room_id = r.id AND b.status='active' AND b.deleted_at IS NULL
            AND b.start_date < $3::date AND (b.end_date IS NULL OR b.end_date > $2::date)
       LEFT JOIN stay_booking_request brb ON brb.converted_block_id = b.id AND brb.deleted_at IS NULL
       LEFT JOIN LATERAL (
         SELECT br.contact_name FROM stay_occupancy_block bk
           JOIN stay_booking_request br ON br.converted_block_id = bk.id AND br.deleted_at IS NULL
          WHERE bk.room_id = r.id AND bk.deleted_at IS NULL AND bk.status='active'
            AND bk.block_kind IN ('stay','tenancy') AND bk.span @> CURRENT_DATE
          ORDER BY bk.start_date DESC LIMIT 1
       ) g ON true
      WHERE r.place_id=$1 AND r.deleted_at IS NULL AND r.status='active'
      GROUP BY r.id, su.rental_mode, su.name_i18n, su.price_minor, su.price_period, su.capacity, su.bedrooms, su.sort, g.contact_name`, [acc.place_id, start, endExcl]);

  const tlRooms = rooms
    .map((r) => ({
      id: r.id, code: r.code, floor: r.floor, guest: r.guest_name || null,
      rental_mode: r.rental_mode, occupancy_status: r.occupancy_status, occupied_until: r.occupied_until, blocks: r.blocks || [],
      unitId: r.stay_unit_id || '', unitName: r.unit_name ? i18n(r.unit_name) : 'ไม่ระบุประเภท',
      priceMinor: r.price_minor != null ? Number(r.price_minor) : null, pricePeriod: r.price_period || null,
      capacity: r.capacity || null, bedrooms: r.bedrooms || null, unitSort: r.unit_sort ?? 9999,
    }))
    .sort((a, b) => (a.unitSort - b.unitSort) || coll(a.unitName, b.unitName) || coll(a.code, b.code));   // by type, then natural code

  return (
    <>
      <MTopbar back="/merchant/stay" backLabel="ห้องพัก" title="ปฏิทินรวม" />

      {searchParams?.ok === 'moved' && <div className="banner-ok">✓ ย้ายห้องแล้ว</div>}
      {searchParams?.ok === 'blocked' && <div className="banner-ok">✓ บันทึกแล้ว</div>}
      {searchParams?.ok === 'bulk' && <div className="banner-ok">✓ ปิด {searchParams.made || 0} ห้องแล้ว{Number(searchParams.skipped) > 0 ? ` · ข้าม ${searchParams.skipped} ห้อง (มีจองทับช่วงนี้)` : ''}</div>}
      {searchParams?.error === 'norooms' && <div className="banner-err">เลือกห้องอย่างน้อยหนึ่งห้อง</div>}
      {searchParams?.error === 'overlap' && <div className="banner-err">ห้องปลายทางมีจองทับช่วงนี้แล้ว — เลือกห้องอื่น</div>}
      {searchParams?.error === 'dest' && <div className="banner-err">เลือกห้องปลายทางก่อน</div>}
      {searchParams?.error === 'daterange' && <div className="banner-err">วันเช็คเอาท์ต้องอยู่หลังวันเช็คอิน</div>}

      <div className="calnav">
        <Link className="calnav-b" href={`/merchant/units/calendar${qs(prev)}`} aria-label="ก่อนหน้า"><Icon n="chevL" size={18} /></Link>
        <span className="calnav-r">{fmtRange(start, days[WIN - 1])}</span>
        <Link className="calnav-b" href={`/merchant/units/calendar${qs(next)}`} aria-label="ถัดไป"><Icon n="chevR" size={18} /></Link>
        <CalJump value={start} month={month} />
        {start !== today && <Link className="calnav-today" href={`/merchant/units/calendar${month ? '?w=month' : ''}`}>วันนี้</Link>}
      </div>
      <div className="calview">
        <Link className={`calview-i ${!month ? 'on' : ''}`} href={`/merchant/units/calendar${vqs('2wk')}`}>2 สัปดาห์</Link>
        <Link className={`calview-i ${month ? 'on' : ''}`} href={`/merchant/units/calendar${vqs('month')}`}>1 เดือน</Link>
      </div>

      {tlRooms.length === 0 ? (
        <div className="mempty"><span className="mempty-ic"><Icon n="bed" size={26} /></span><p>ยังไม่มีห้องในผัง — <Link href="/merchant/units/new">เพิ่มห้อง</Link>ก่อน</p></div>
      ) : (
        <PropertyTimeline rooms={tlRooms} days={days} today={today} term={term} returnTo={`/merchant/units/calendar?d=${start}${month ? '&w=month' : ''}`} />
      )}
    </>
  );
}
