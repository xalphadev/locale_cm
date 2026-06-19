import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { Icon, isUuid } from '../../ui';
import { updateRoomAction, setRoomOccupancyAction, deleteRoomAction, addRoomBlockAction, cancelRoomBlockAction } from '../../../actions';
import DateRangePicker from '../../DateRangePicker';

export const dynamic = 'force-dynamic';

const OCC: Record<string, { cls: string; label: string }> = {
  vacant: { cls: 'season', label: 'ว่าง' },
  occupied: { cls: 'sold', label: 'มีผู้เช่า' },
  reserved: { cls: 'cat', label: 'จองแล้ว' },
  maintenance: { cls: 'off', label: 'ปิดซ่อม' },
};
const fmt = (d: any) => (d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : '');

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
      {searchParams?.error === 'code' && <div className="banner-err">กรุณาใส่เลข/ชื่อห้อง</div>}

      <div className="dtitle">
        <div className="dtags">
          <span className="t cat"><Icon n="bed" size={12} /> {r.unit_name ? i18n(r.unit_name) : 'ไม่ระบุรูปแบบ'}</span>
          <span className={`t ${o.cls}`}>{o.label}</span>
        </div>
        <h1>ห้อง {r.code}{r.floor ? ` · ${term} ${r.floor}` : ''}</h1>
      </div>

      {monthly && (
        <div className="availcard">
          <div className="availcard-l">
            <div className="availcard-k">สถานะห้อง</div>
            <div className={`availcard-v ${r.occupancy_status === 'vacant' ? 'ok' : 'no'}`}>{o.label}</div>
            {r.occupied_until && r.occupancy_status !== 'vacant' && <div className="availcard-f"><Icon n="clock" size={12} /> ว่างอีกครั้ง {fmt(r.occupied_until)}</div>}
          </div>
          <form action={setRoomOccupancyAction.bind(null, r.id, r.occupancy_status === 'vacant' ? 'occupied' : 'vacant')}>
            <button className="dbtn sm" type="submit">{r.occupancy_status === 'vacant' ? 'ตั้งมีผู้เช่า →' : 'ตั้งว่าง →'}</button>
          </form>
        </div>
      )}

      <form className="form mform" action={updateRoomAction.bind(null, r.id)}>
        <section className="fsec">
          <div className="fsec-h"><span className="fsec-ic"><Icon n="edit" size={15} /></span> ข้อมูลห้อง</div>
          <div className="fgrid">
            <div className="field"><label>เลข/ชื่อห้อง *</label><input name="code" defaultValue={r.code} required /></div>
            <div className="field"><label>ชั้น</label><input name="floor" defaultValue={r.floor || ''} /></div>
          </div>
          <div className="fgrid">
            <div className="field"><label>รับได้ (ท่าน)</label><input name="capacity" type="number" min="0" defaultValue={r.capacity ?? ''} /></div>
            {monthly && <div className="field"><label>ว่างอีกครั้ง (ถ้ามีผู้เช่า)</label><input name="occupied_until" type="date" defaultValue={r.occupied_until || ''} /></div>}
          </div>
          <div className="field"><label>โน้ต (เห็นเฉพาะคุณ)</label><input name="note" defaultValue={r.note || ''} placeholder="เช่น คุณสมชาย ถึง 31 ธ.ค." /></div>
          <p className="fhint">โน้ตเป็นบันทึกส่วนตัวของคุณ — ลูกค้าไม่เห็น และเราไม่นำไปใช้ที่อื่น</p>
          <button className="btn btn-primary mform-save" type="submit">บันทึก</button>
        </section>
      </form>

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

      <form className="delwrap" action={deleteRoomAction.bind(null, r.id)}>
        <button className="dbtn danger" type="submit"><Icon n="trash" size={17} /> ลบห้องนี้</button>
      </form>
    </>
  );
}
