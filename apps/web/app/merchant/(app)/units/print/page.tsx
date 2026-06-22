import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import PrintTrigger from './PrintTrigger';

export const dynamic = 'force-dynamic';
const STW: Record<string, string> = { vacant: 'ว่าง', occupied: 'มีผู้เช่า', reserved: 'จองแล้ว', maintenance: 'ปิดซ่อม' };
const fmtD = (d: any) => (d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : '');

// Clean B&W print sheet of the whole board — for posting at the counter or LINEing to a caretaker who has
// no app login. Status is shown IN WORDS (not just color) so it survives a mono print. @media print hides
// the app chrome (see globals.css). Read-only; reuses the room status the board already stores.
export default async function PrintBoard() {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  if (!acc.manages_stay || acc.room_mode === 'unique') redirect('/merchant');
  const term = acc.room_group_term || 'ชั้น';
  const rooms = await q<any>(
    `SELECT code, floor, occupancy_status, occupied_until, note FROM stay_room
       WHERE place_id=$1 AND deleted_at IS NULL AND status='active' ORDER BY floor NULLS FIRST, code`, [acc.place_id]);
  const byFloor: Record<string, any[]> = {}; const floors: string[] = [];
  for (const r of rooms) { const f = r.floor || '—'; if (!byFloor[f]) { byFloor[f] = []; floors.push(f); } byFloor[f].push(r); }
  const counts: Record<string, number> = { vacant: 0, occupied: 0, reserved: 0, maintenance: 0 };
  for (const r of rooms) counts[r.occupancy_status] = (counts[r.occupancy_status] || 0) + 1;

  return (
    <div className="printsheet">
      <div className="print-bar"><PrintTrigger /><Link className="dbtn sm" href="/merchant/units">← กลับผังห้อง</Link></div>
      <div className="print-head">
        <h1>{i18n(acc.place_name) || 'ผังห้อง'}</h1>
        <span>ผังห้อง · {new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })} · {rooms.length} ห้อง — ว่าง {counts.vacant} · มีผู้เช่า {counts.occupied} · จอง {counts.reserved} · ซ่อม {counts.maintenance}</span>
      </div>
      {floors.map((f) => (
        <div className="print-grp" key={f}>
          <h2>{f === '—' ? `ไม่ระบุ${term}` : `${term} ${f}`} <em>({byFloor[f].length})</em></h2>
          <table className="print-tbl">
            <tbody>
              {byFloor[f].map((r, i) => (
                <tr key={i}>
                  <td className="pc-code">{r.code}</td>
                  <td className="pc-st">{STW[r.occupancy_status] || 'ว่าง'}</td>
                  <td className="pc-un">{r.occupied_until ? `ว่าง ${fmtD(r.occupied_until)}` : ''}</td>
                  <td className="pc-nt">{r.note || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
