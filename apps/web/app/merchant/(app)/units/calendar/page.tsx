import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q } from '@/lib/db';
import { Icon } from '../../ui';

export const dynamic = 'force-dynamic';

// Property-wide occupancy timeline (gap: no single view of who-is-in / what-is-free across all rooms).
// Read-only: rooms × the next 14 days, each cell busy/free derived from occupancy blocks (daily + monthly
// tenancy/maintenance) and the monthly occupancy_status. No money — operational visibility only.
const DOW = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const KCOLOR: Record<string, string> = { stay: '#3b82f6', tenancy: '#3b82f6', reserved: '#f59e0b', occupied: '#3b82f6', maintenance: '#9aa0a8', hold: '#a855f7' };
const KLABEL: Record<string, string> = { stay: 'เข้าพัก', tenancy: 'สัญญาเช่า', reserved: 'จอง', occupied: 'มีผู้เช่า', maintenance: 'ปิดซ่อม', hold: 'กันห้อง' };
const addDays = (ymd: string, n: number) => { const d = new Date(ymd + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

export default async function PropertyCalendar() {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  if (!acc.manages_stay) redirect('/merchant/rooms');
  const term = acc.room_group_term || 'ชั้น';

  const [{ today }] = await q<{ today: string }>(`SELECT to_char(CURRENT_DATE,'YYYY-MM-DD') today`);
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i));
  const rooms = await q<any>(
    `SELECT r.id, r.code, r.floor, r.occupancy_status, to_char(r.occupied_until,'YYYY-MM-DD') occupied_until, su.rental_mode,
            COALESCE(json_agg(json_build_object('s', to_char(b.start_date,'YYYY-MM-DD'), 'e', to_char(b.end_date,'YYYY-MM-DD'), 'k', b.block_kind))
                     FILTER (WHERE b.id IS NOT NULL), '[]') blocks
       FROM stay_room r
       LEFT JOIN stay_units su ON su.id = r.stay_unit_id
       LEFT JOIN stay_occupancy_block b ON b.room_id = r.id AND b.status='active' AND b.deleted_at IS NULL
            AND b.start_date < ($2::date + 14) AND (b.end_date IS NULL OR b.end_date > $2::date)
      WHERE r.place_id=$1 AND r.deleted_at IS NULL AND r.status='active'
      GROUP BY r.id, su.rental_mode
      ORDER BY r.floor NULLS FIRST, r.code`, [acc.place_id, today]);

  // busy kind for (room, date) — block wins; else a non-vacant monthly room is busy until occupied_until
  const cellOf = (room: any, ymd: string): string | null => {
    for (const b of room.blocks as any[]) if (b.s <= ymd && (!b.e || ymd < b.e)) return b.k || 'stay';
    if (room.rental_mode !== 'daily' && room.occupancy_status && room.occupancy_status !== 'vacant') {
      if (!room.occupied_until || ymd < room.occupied_until) return room.occupancy_status;
    }
    return null;
  };

  return (
    <>
      <div className="mback"><Link href="/merchant/units"><Icon n="chevL" size={17} /> ผังห้อง</Link></div>
      <h1 className="phead"><span className="phead-ic"><Icon n="calendar" size={18} /></span> ปฏิทินรวม</h1>
      <p className="note" style={{ margin: '.1rem 0 .8rem' }}>ภาพรวม 14 วันข้างหน้า — ห้องไหนมีคน / ห้องไหนว่าง ในจอเดียว (แตะห้องเพื่อจัดการ)</p>

      {rooms.length === 0 ? (
        <div className="mempty"><span className="mempty-ic"><Icon n="bed" size={26} /></span><p>ยังไม่มีห้องในผัง — เพิ่มห้องก่อน</p></div>
      ) : (
        <>
          <div className="caltl">
            <table className="caltl-t">
              <thead>
                <tr><th className="caltl-rh">ห้อง</th>{days.map((d) => { const dt = new Date(d + 'T00:00:00Z'); return <th key={d} className="caltl-dh"><span>{DOW[dt.getUTCDay()]}</span><b>{dt.getUTCDate()}</b></th>; })}</tr>
              </thead>
              <tbody>
                {rooms.map((r) => (
                  <tr key={r.id}>
                    <th className="caltl-rh"><Link href={`/merchant/units/${r.id}`}>{r.code}{r.floor ? <span className="caltl-fl"> · {term} {r.floor}</span> : null}</Link></th>
                    {days.map((d) => { const k = cellOf(r, d); return <td key={d} className="caltl-c" title={k ? KLABEL[k] || k : 'ว่าง'} style={k ? { background: KCOLOR[k] || '#3b82f6' } : undefined} />; })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="callegend">
            <span><i style={{ background: '#3b82f6' }} /> เข้าพัก/เช่า</span>
            <span><i style={{ background: '#f59e0b' }} /> จอง</span>
            <span><i style={{ background: '#9aa0a8' }} /> ปิดซ่อม</span>
            <span><i style={{ background: '#a855f7' }} /> กันห้อง</span>
            <span><i style={{ background: '#eef0f3', boxShadow: 'inset 0 0 0 1px #e0e3e8' }} /> ว่าง</span>
          </div>
        </>
      )}
    </>
  );
}
