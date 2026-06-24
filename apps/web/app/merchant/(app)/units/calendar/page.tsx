import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q } from '@/lib/db';
import { Icon } from '../../ui';
import { MTopbar } from '../../MTopbar';
import { PropertyTimeline } from '../PropertyTimeline';

export const dynamic = 'force-dynamic';

// Property-wide occupancy timeline: rooms × a 14-day window (slideable), each cell busy/free from occupancy
// blocks + the monthly occupancy_status, with today's column highlighted and the current guest shown per
// room. Read-managed: tap a room to act on it. No money — operational visibility only.
const WIN = 14;
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const addDays = (ymd: string, n: number) => { const d = new Date(ymd + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const fmtRange = (a: string, b: string) => {
  const m = (s: string) => new Date(s + 'T00:00:00Z').toLocaleDateString('th-TH', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  return `${m(a)} – ${m(b)}`;
};

export default async function PropertyCalendar({ searchParams }: { searchParams: { d?: string } }) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  if (!acc.manages_stay) redirect('/merchant/rooms');
  const term = acc.room_group_term || 'ชั้น';

  const [{ today }] = await q<{ today: string }>(`SELECT to_char(CURRENT_DATE,'YYYY-MM-DD') today`);
  const start = isDate(searchParams?.d || '') ? searchParams!.d! : today;
  const days = Array.from({ length: WIN }, (_, i) => addDays(start, i));
  const endExcl = addDays(start, WIN);
  const prev = addDays(start, -WIN), next = addDays(start, WIN);

  const rooms = await q<any>(
    `SELECT r.id, r.code, r.floor, r.occupancy_status, to_char(r.occupied_until,'YYYY-MM-DD') occupied_until, su.rental_mode,
            g.contact_name guest_name,
            COALESCE(json_agg(json_build_object('id', b.id, 's', to_char(b.start_date,'YYYY-MM-DD'), 'e', to_char(b.end_date,'YYYY-MM-DD'), 'k', b.block_kind, 'note', b.note))
                     FILTER (WHERE b.id IS NOT NULL), '[]') blocks
       FROM stay_room r
       LEFT JOIN stay_units su ON su.id = r.stay_unit_id
       LEFT JOIN stay_occupancy_block b ON b.room_id = r.id AND b.status='active' AND b.deleted_at IS NULL
            AND b.start_date < $3::date AND (b.end_date IS NULL OR b.end_date > $2::date)
       LEFT JOIN LATERAL (
         SELECT br.contact_name FROM stay_occupancy_block bk
           JOIN stay_booking_request br ON br.converted_block_id = bk.id AND br.deleted_at IS NULL
          WHERE bk.room_id = r.id AND bk.deleted_at IS NULL AND bk.status='active'
            AND bk.block_kind IN ('stay','tenancy') AND bk.span @> CURRENT_DATE
          ORDER BY bk.start_date DESC LIMIT 1
       ) g ON true
      WHERE r.place_id=$1 AND r.deleted_at IS NULL AND r.status='active'
      GROUP BY r.id, su.rental_mode, g.contact_name
      ORDER BY r.floor NULLS FIRST, r.code`, [acc.place_id, start, endExcl]);

  const tlRooms = rooms.map((r) => ({
    id: r.id, code: r.code, floor: r.floor, guest: r.guest_name || null,
    rental_mode: r.rental_mode, occupancy_status: r.occupancy_status, occupied_until: r.occupied_until, blocks: r.blocks || [],
  }));

  return (
    <>
      <MTopbar back="/merchant/stay" backLabel="ห้องพัก" title="ปฏิทินรวม" />

      <div className="calnav">
        <Link className="calnav-b" href={`/merchant/units/calendar?d=${prev}`} aria-label="ก่อนหน้า"><Icon n="chevL" size={18} /></Link>
        <span className="calnav-r">{fmtRange(start, days[WIN - 1])}</span>
        <Link className="calnav-b" href={`/merchant/units/calendar?d=${next}`} aria-label="ถัดไป"><Icon n="chevR" size={18} /></Link>
        {start !== today && <Link className="calnav-today" href="/merchant/units/calendar">วันนี้</Link>}
      </div>

      {rooms.length === 0 ? (
        <div className="mempty"><span className="mempty-ic"><Icon n="bed" size={26} /></span><p>ยังไม่มีห้องในผัง — <Link href="/merchant/units/new">เพิ่มห้อง</Link>ก่อน</p></div>
      ) : (
        <PropertyTimeline rooms={tlRooms} days={days} today={today} term={term} />
      )}
    </>
  );
}
