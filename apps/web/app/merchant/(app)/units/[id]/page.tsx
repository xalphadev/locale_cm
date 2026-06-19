import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { Icon, isUuid } from '../../ui';
import { setRoomOccupancyAction, addRoomBlockAction, cancelRoomBlockAction } from '../../../actions';
import DateRangePicker from '../../DateRangePicker';

export const dynamic = 'force-dynamic';

const OCC: Record<string, { cls: string; label: string }> = {
  vacant: { cls: 'season', label: 'ว่าง' },
  occupied: { cls: 'sold', label: 'มีผู้เช่า' },
  reserved: { cls: 'cat', label: 'จองแล้ว' },
  maintenance: { cls: 'off', label: 'ปิดซ่อม' },
};
const fmt = (d: any) => (d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : '');
const STATUSES = [
  { k: 'vacant', label: 'ว่าง', color: '#12b76a' },
  { k: 'occupied', label: 'มีผู้เช่า', color: '#3b82f6' },
  { k: 'reserved', label: 'จองแล้ว', color: '#f59e0b' },
  { k: 'maintenance', label: 'ปิดซ่อม', color: '#9aa0a6' },
];

function Fact({ ic, l, v }: { ic: string; l: string; v: string }) {
  return (
    <div className="factitem">
      <span className="factitem-ic"><Icon n={ic} size={17} /></span>
      <div className="factitem-tx"><div className="factitem-l">{l}</div><div className="factitem-v">{v}</div></div>
    </div>
  );
}

// READ-ONLY room detail. The edit form lives at /units/[id]/edit (reached via "แก้ไข") so tapping a room
// shows its details + day-to-day status, not an editable form straight away. Quick status toggle + the
// nightly calendar stay here (they're the frequent operational actions); renaming/regrouping is on edit.
export default async function RoomUnit({ params, searchParams }: { params: { id: string }; searchParams: { ok?: string; error?: string } }) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  if (!acc.manages_stay || acc.room_mode === 'unique') redirect('/merchant');

  const [r] = isUuid(params.id)
    ? await q<any>(
      `SELECT r.*, su.name_i18n unit_name, su.rental_mode FROM stay_room r LEFT JOIN stay_units su ON su.id = r.stay_unit_id
         WHERE r.id=$1 AND r.place_id=$2 AND r.deleted_at IS NULL`, [params.id, acc.place_id])
    : [];
  if (!r) return (<><div className="mback"><a href="/merchant/units"><Icon n="chevL" size={18} /> ผังห้อง</a></div><h1>ไม่พบห้อง</h1></>);

  const monthly = r.rental_mode !== 'daily';
  const term = acc.room_group_term || 'ชั้น';
  const o = OCC[r.occupancy_status] || OCC.vacant;
  const blocks = monthly ? [] : await q<any>(
    `SELECT id, start_date, end_date, note FROM stay_occupancy_block
       WHERE room_id=$1 AND status='active' AND deleted_at IS NULL AND (end_date IS NULL OR end_date >= CURRENT_DATE)
       ORDER BY start_date`, [r.id]);

  return (
    <>
      <div className="mback"><a href="/merchant/units"><Icon n="chevL" size={18} /> ผังห้อง</a></div>
      {searchParams?.ok === 'updated' && <div className="banner-ok">✓ บันทึกแล้ว</div>}
      {searchParams?.ok === 'blocked' && <div className="banner-ok">✓ บันทึกช่วงไม่ว่างแล้ว</div>}
      {searchParams?.error === 'overlap' && <div className="banner-err">ช่วงวันที่นี้ทับกับที่จองไว้แล้ว</div>}
      {searchParams?.error === 'date' && <div className="banner-err">กรุณาเลือกวันเริ่ม</div>}

      <div className="listhead">
        <h1>ห้อง {r.code}</h1>
        <a className="addbtn" href={`/merchant/units/${r.id}/edit`}><Icon n="edit" size={16} /> แก้ไข</a>
      </div>
      <div className="dtags" style={{ marginBottom: 14 }}>
        <span className="t cat"><Icon n="bed" size={12} /> {r.unit_name ? i18n(r.unit_name) : 'ไม่ระบุรูปแบบ'}</span>
        <span className={`t ${o.cls}`}>{o.label}</span>
        {r.floor && <span className="t off">{term} {r.floor}</span>}
      </div>

      <div className="availcard" style={{ display: 'block' }}>
        <div className="availcard-k">สถานะห้อง — แตะเพื่อเปลี่ยน</div>
        <div className="statuspick">
          {STATUSES.map((s) => (
            <form action={setRoomOccupancyAction.bind(null, r.id, s.k)} key={s.k}>
              <button type="submit" className={`statuspick-i ${r.occupancy_status === s.k ? 'on' : ''}`}
                style={r.occupancy_status === s.k ? { background: `color-mix(in srgb,${s.color} 14%,#fff)`, color: `color-mix(in srgb,${s.color} 62%,#1a1a1a)`, boxShadow: `inset 0 0 0 2px ${s.color}` } : undefined}>
                <i style={{ background: s.color }} /> {s.label}
              </button>
            </form>
          ))}
        </div>
        {r.occupied_until && r.occupancy_status !== 'vacant' && <div className="availcard-f" style={{ marginTop: 9 }}><Icon n="clock" size={12} /> ว่างอีกครั้ง {fmt(r.occupied_until)}</div>}
      </div>

      <h2 className="rsec"><span className="rsec-ic"><Icon n="bed" size={15} /></span> รายละเอียด</h2>
      <div className="factgrid">
        <Fact ic="bed" l="ประเภท" v={r.unit_name ? i18n(r.unit_name) : 'ไม่ระบุรูปแบบ'} />
        {r.floor ? <Fact ic="grid" l={term} v={String(r.floor)} /> : null}
        {r.capacity ? <Fact ic="users" l="รับได้" v={`${r.capacity} ท่าน`} /> : null}
        {monthly && r.occupied_until && r.occupancy_status !== 'vacant' ? <Fact ic="clock" l="ว่างอีกครั้ง" v={fmt(r.occupied_until)} /> : null}
      </div>
      {r.note ? <p className="note" style={{ marginTop: 8 }}><b>โน้ต:</b> {r.note} <span style={{ opacity: .6 }}>(เห็นเฉพาะคุณ)</span></p> : null}

      {!monthly && (
        <>
          <h2 className="rsec"><span className="rsec-ic"><Icon n="calendar" size={15} /></span> ช่วงที่ไม่ว่าง (ปฏิทิน)</h2>
          {blocks.length === 0
            ? <p className="note">ยังไม่มีช่วงจอง — ห้องนี้ว่างทุกวัน</p>
            : (
              <div className="mlist">
                {blocks.map((b) => (
                  <div className="mrow" key={b.id}>
                    <span className="mrow-body">
                      <span className="mrow-nm">{fmt(b.start_date)}{b.end_date ? ` – ${fmt(b.end_date)}` : ' เป็นต้นไป'}</span>
                      {b.note && <span className="mrow-meta">{b.note}</span>}
                    </span>
                    <form action={cancelRoomBlockAction.bind(null, b.id)}><button className="dbtn sm" type="submit">เอาออก</button></form>
                  </div>
                ))}
              </div>
            )}
          <form className="fsec" action={addRoomBlockAction.bind(null, r.id)}>
            <div className="fsec-h"><span className="fsec-ic"><Icon n="plus" size={15} /></span> เพิ่มช่วงไม่ว่าง</div>
            <DateRangePicker mode="range" fromName="start_date" toName="end_date" labelFrom="เช็คอิน" labelTo="เช็คเอาท์" />
            <div className="field"><label>โน้ต</label><input name="note" placeholder="เช่น จองผ่านไลน์" /></div>
            <button className="btn btn-primary" type="submit">+ บล็อกช่วงนี้</button>
          </form>
        </>
      )}
    </>
  );
}
