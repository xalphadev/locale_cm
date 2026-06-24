import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { Icon, isUuid } from '../../ui';
import { MTopbar } from '../../MTopbar';
import { ConfirmSubmit } from '../../ConfirmSubmit';
import { setRoomOccupancyAction, setRoomOccupiedUntilAction, addRoomBlockAction, editRoomBlockAction, cancelRoomBlockAction, blockTonightAction, moveTenantAction, checkInAction, checkOutAction } from '../../../actions';
import DateRangePicker from '../../DateRangePicker';
import RoomCalendar from '../RoomCalendar';

export const dynamic = 'force-dynamic';

const OCC: Record<string, { cls: string; label: string }> = {
  vacant: { cls: 'season', label: 'ว่าง' },
  occupied: { cls: 'sold', label: 'มีผู้เช่า' },
  reserved: { cls: 'cat', label: 'จองแล้ว' },
  maintenance: { cls: 'off', label: 'ปิดซ่อม' },
};
const fmt = (d: any) => (d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : '');
const BKIND: Record<string, string> = { tenancy: 'สัญญาเช่า', maintenance: 'ปิดซ่อม', hold: 'กันห้อง' };   // 'stay' = no prefix
const ymd = (d: any) => (d ? (typeof d === 'string' ? d.slice(0, 10) : new Date(d).toLocaleDateString('en-CA')) : '');   // pg Date|string → YYYY-MM-DD for a date input
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
  if (!r) return (<MTopbar back="/merchant/units" backLabel="ผังห้อง" title="ไม่พบห้อง" />);

  const monthly = r.rental_mode !== 'daily';
  const term = acc.room_group_term || 'ชั้น';
  const o = OCC[r.occupancy_status] || OCC.vacant;
  const blocks = await q<any>(
    `SELECT id, to_char(start_date,'YYYY-MM-DD') start_date, to_char(end_date,'YYYY-MM-DD') end_date, note, block_kind
       FROM stay_occupancy_block
       WHERE room_id=$1 AND status='active' AND deleted_at IS NULL AND (end_date IS NULL OR end_date >= CURRENT_DATE)
       ORDER BY start_date`, [r.id]);
  const events = await q<any>(
    `SELECT event_kind, meta, to_char(created_at,'DD/MM HH24:MI') at FROM stay_room_event WHERE room_id=$1 ORDER BY created_at DESC LIMIT 12`, [r.id]);
  const evLabel = (e: any) =>
    e.event_kind === 'status_change' ? `เปลี่ยนสถานะ → ${OCC[e.meta?.to]?.label || e.meta?.to || ''}${e.meta?.bulk ? ' (หลายห้อง)' : ''}`
    : e.event_kind === 'move_in' ? `ย้ายเข้า${e.meta?.from_code ? ` (จากห้อง ${e.meta.from_code})` : ''}`
    : e.event_kind === 'move_out' ? `ย้ายออก${e.meta?.to_code ? ` (ไปห้อง ${e.meta.to_code})` : ''}`
    : e.event_kind;
  const occupiedNow = r.occupancy_status === 'occupied' || r.occupancy_status === 'reserved';
  const vacantRooms = occupiedNow
    ? await q<any>(`SELECT id, code, floor FROM stay_room WHERE place_id=$1 AND deleted_at IS NULL AND status='active' AND occupancy_status='vacant' AND id<>$2 ORDER BY floor NULLS FIRST, code`, [acc.place_id, r.id])
    : [];
  // who's in this room right now (the guest on the active booking covering today) — zero new tables
  const [guest] = occupiedNow ? await q<any>(
    `SELECT br.id booking_id, br.contact_name, br.contact_phone, br.party_size, br.checked_in_at, br.checked_out_at,
            to_char(COALESCE(bk.start_date, br.desired_from),'DD/MM/YY') from_d,
            to_char(COALESCE(bk.end_date, br.desired_to),'DD/MM/YY') to_d
       FROM stay_occupancy_block bk
       JOIN stay_booking_request br ON br.converted_block_id = bk.id AND br.deleted_at IS NULL
      WHERE bk.room_id=$1 AND bk.deleted_at IS NULL AND bk.status='active'
        AND bk.block_kind IN ('stay','tenancy') AND bk.span @> CURRENT_DATE
      ORDER BY bk.start_date DESC LIMIT 1`, [r.id]) : [];

  return (
    <>
      <MTopbar back="/merchant/units" backLabel="ผังห้อง" title={`ห้อง ${r.code}`} action={<Link href={`/merchant/units/${r.id}/edit`} aria-label="แก้ไข"><Icon n="edit" size={19} /></Link>} />
      {searchParams?.ok === 'updated' && <div className="banner-ok">✓ บันทึกแล้ว</div>}
      {searchParams?.ok === 'blocked' && <div className="banner-ok">✓ บันทึกช่วงไม่ว่างแล้ว</div>}
      {searchParams?.ok === 'booked' && <div className="banner-ok">✓ บันทึกการจองแล้ว — ดูได้ในหน้า “คำขอจอง”</div>}
      {searchParams?.error === 'overlap' && <div className="banner-err">ช่วงวันที่นี้ทับกับที่จองไว้แล้ว</div>}
      {searchParams?.error === 'date' && <div className="banner-err">กรุณาเลือกวันเริ่ม</div>}
      {searchParams?.ok === 'moved' && <div className="banner-ok">✓ ย้ายผู้เช่าแล้ว</div>}
      {searchParams?.error === 'occupied' && <div className="banner-err">ห้องปลายทางไม่ว่าง</div>}
      {searchParams?.error === 'dest' && <div className="banner-err">เลือกห้องปลายทางก่อน</div>}

      <div className="dtags" style={{ marginBottom: 14 }}>
        <span className="t cat"><Icon n="bed" size={12} /> {r.unit_name ? i18n(r.unit_name) : 'ไม่ระบุรูปแบบ'}</span>
        <span className={`t ${o.cls}`}>{o.label}</span>
        {r.floor && <span className="t off">{term} {r.floor}</span>}
      </div>

      {guest && (
        <div className="guestbox">
          <div className="guestbox-l">
            <div className="guestbox-k">ผู้เข้าพักตอนนี้{guest.checked_in_at ? ' · เช็คอินแล้ว' : ''}</div>
            <div className="guestbox-nm">{guest.contact_name || 'ไม่ระบุชื่อ'}</div>
            <div className="guestbox-meta">{guest.from_d}{guest.to_d ? `–${guest.to_d}` : ''}{guest.party_size ? ` · ${guest.party_size} คน` : ''}</div>
          </div>
          <div className="guestbox-acts">
            {guest.contact_phone && <a className="dbtn sm" href={`tel:${guest.contact_phone}`}><Icon n="phone" size={15} /> โทร</a>}
            {!guest.checked_in_at
              ? <form action={checkInAction.bind(null, guest.booking_id)}><button className="dbtn sm primary" type="submit"><Icon n="check" size={15} /> เช็คอิน</button></form>
              : <form action={checkOutAction.bind(null, guest.booking_id)}><ConfirmSubmit message="เช็คเอาท์ผู้เข้าพักนี้? ห้องจะถูกปล่อยคืนให้ว่างทันที" className="dbtn sm primary"><Icon n="check" size={15} /> เช็คเอาท์</ConfirmSubmit></form>}
          </div>
        </div>
      )}

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
        {(r.occupancy_status === 'occupied' || r.occupancy_status === 'reserved') && (
          <form className="untilform" action={setRoomOccupiedUntilAction.bind(null, r.id)}>
            <label><Icon n="clock" size={12} /> ว่างอีกครั้ง (ถ้ารู้)</label>
            <input type="date" name="occupied_until" defaultValue={ymd(r.occupied_until)} />
            <button className="dbtn sm" type="submit">บันทึก</button>
          </form>
        )}
      </div>

      {occupiedNow && vacantRooms.length > 0 && (
        <form className="moveform" action={moveTenantAction.bind(null, r.id)}>
          <label>ย้ายผู้เช่าไปห้องอื่น <span style={{ fontWeight: 400 }}>(ย้ายโน้ต + วันว่างไปด้วย)</span></label>
          <div className="moveform-row">
            <select name="dest" defaultValue="" required>
              <option value="" disabled>เลือกห้องปลายทาง (ที่ว่าง)</option>
              {vacantRooms.map((v: any) => <option key={v.id} value={v.id}>ห้อง {v.code}{v.floor ? ` · ${term} ${v.floor}` : ''}</option>)}
            </select>
            <ConfirmSubmit message="ย้ายผู้เช่าจากห้องนี้ไปห้องที่เลือก? โน้ตและวันว่างจะย้ายตามไปด้วย" className="dbtn sm">ย้าย →</ConfirmSubmit>
          </div>
        </form>
      )}

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
          <div className="rsec-h2row">
            <h2 className="rsec" style={{ margin: 0 }}><span className="rsec-ic"><Icon n="calendar" size={15} /></span> ปฏิทินรายวัน</h2>
            <form action={blockTonightAction.bind(null, r.id)}><button className="dbtn sm primary" type="submit"><Icon n="plus" size={14} /> บล็อกคืนนี้</button></form>
          </div>
          <RoomCalendar roomId={r.id} blocks={blocks} />
        </>
      )}
      {monthly && <h2 className="rsec"><span className="rsec-ic"><Icon n="calendar" size={15} /></span> ช่วงเวลา (สัญญาเช่า / ปิดซ่อม)</h2>}
      <details className="usettings" {...(monthly && blocks.length ? { open: true } : {})}>
        <summary><Icon n="calendar" size={14} /> {monthly ? 'รายการช่วง + เพิ่ม (กรอกวัน)' : 'รายการช่วง + เพิ่มแบบกรอกวัน'}</summary>
        {blocks.length === 0
          ? <p className="note">{monthly ? 'ยังไม่มีช่วงที่บันทึก — เพิ่มสัญญาเช่า / ช่วงปิดซ่อมได้' : 'ยังไม่มีช่วงจอง — ห้องนี้ว่างทุกวัน'}</p>
          : (
            <div className="mlist">
              {blocks.map((b) => (
                <details className="mrow-d" key={b.id}>
                  <summary className="mrow">
                    <span className="mrow-body">
                      <span className="mrow-nm">{BKIND[b.block_kind] ? `${BKIND[b.block_kind]} · ` : ''}{fmt(b.start_date)}{b.end_date ? ` – ${fmt(b.end_date)}` : ' เป็นต้นไป'}</span>
                      {b.note && <span className="mrow-meta">{b.note}</span>}
                    </span>
                    <span className="mrow-editlink">แก้ไข</span>
                  </summary>
                  <form className="fsec" action={editRoomBlockAction.bind(null, b.id)} style={{ margin: '6px 0 4px' }}>
                    <div className="fgrid">
                      <div className="field"><label>{monthly ? 'เริ่ม' : 'เช็คอิน'}</label><input type="date" name="start_date" defaultValue={b.start_date} required /></div>
                      <div className="field"><label>{monthly ? 'สิ้นสุด' : 'เช็คเอาท์'}</label><input type="date" name="end_date" defaultValue={b.end_date || ''} /></div>
                    </div>
                    {monthly && (
                      <div className="field"><label>ประเภท</label>
                        <select name="block_kind" defaultValue={b.block_kind || 'tenancy'}><option value="tenancy">สัญญาเช่า / ผู้เช่า</option><option value="maintenance">ปิดซ่อม</option><option value="hold">กันห้อง</option></select></div>
                    )}
                    <div className="field"><label>โน้ต</label><input name="note" defaultValue={b.note || ''} placeholder="เช่น จองผ่านไลน์" /></div>
                    <button className="dbtn sm primary" type="submit">บันทึกการแก้ไข</button>
                  </form>
                  <form action={cancelRoomBlockAction.bind(null, b.id)}><ConfirmSubmit message="เอาช่วงที่จองนี้ออก? วันที่จะกลับมาว่างให้จองใหม่ทันที" className="dbtn sm danger">เอาออก</ConfirmSubmit></form>
                </details>
              ))}
            </div>
          )}
        <form className="fsec" action={addRoomBlockAction.bind(null, r.id)} style={{ marginTop: 10 }}>
          <div className="fsec-h"><span className="fsec-ic"><Icon n="plus" size={15} /></span> {monthly ? 'เพิ่มช่วง (สัญญาเช่า / ปิดซ่อม)' : 'บันทึกการจอง / บล็อกช่วง (กรอกวัน)'}</div>
          <DateRangePicker mode="range" fromName="start_date" toName="end_date" labelFrom={monthly ? 'เริ่ม' : 'เช็คอิน'} labelTo={monthly ? 'สิ้นสุด' : 'เช็คเอาท์'} />
          {monthly && (
            <div className="field"><label>ประเภท</label>
              <select name="block_kind" defaultValue="tenancy"><option value="tenancy">สัญญาเช่า / ผู้เช่า</option><option value="maintenance">ปิดซ่อม</option><option value="hold">กันห้อง</option></select></div>
          )}
          <div className="fgrid">
            <div className="field"><label>{monthly ? 'ชื่อผู้เช่า (ถ้ามี)' : 'ชื่อผู้เข้าพัก (ถ้ามี)'}</label><input name="guest_name" placeholder="เช่น คุณสมชาย" /></div>
            <div className="field"><label>เบอร์โทร</label><input name="guest_phone" placeholder="08x-xxx-xxxx" /></div>
          </div>
          <div className="field"><label>โน้ต</label><input name="note" placeholder="เช่น จองผ่านไลน์ / ปิดซ่อม" /></div>
          <button className="btn btn-primary" type="submit">+ บันทึก</button>
          <p className="note" style={{ margin: '6px 0 0' }}>ใส่ชื่อ = บันทึกเป็น “การจอง/ผู้เช่า” (เห็นในหน้าคำขอจอง) · เว้นว่าง = บล็อกเฉยๆ (ปิดซ่อม/กันห้อง)</p>
        </form>
      </details>

      {events.length > 0 && (
        <details className="usettings">
          <summary><Icon n="clock" size={14} /> ประวัติการเปลี่ยนแปลง</summary>
          <div className="mlist">
            {events.map((e, i) => (
              <div className="mrow" key={i}>
                <span className="mrow-body"><span className="mrow-nm">{evLabel(e)}</span></span>
                <span className="mrow-meta">{e.at}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </>
  );
}
