import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q } from '@/lib/db';
import { Icon, isUuid } from '../../../ui';
import { MTopbar } from '../../../MTopbar';
import { updateRoomAction, deleteRoomAction } from '../../../../actions';

export const dynamic = 'force-dynamic';

// Edit form for ONE physical room — split off /units/[id] (the read-only detail) so tapping a room shows
// its info first; you reach this via the "แก้ไข" button. updateRoomAction redirects back to the detail.
export default async function EditRoomUnit({ params, searchParams }: { params: { id: string }; searchParams: { error?: string } }) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  if (!acc.manages_stay || acc.room_mode === 'unique') redirect('/merchant');
  const [r] = isUuid(params.id)
    ? await q<any>(`SELECT r.*, su.rental_mode FROM stay_room r LEFT JOIN stay_units su ON su.id = r.stay_unit_id WHERE r.id=$1 AND r.place_id=$2 AND r.deleted_at IS NULL`, [params.id, acc.place_id])
    : [];
  if (!r) return (<><MTopbar back="/merchant/units" backLabel="ผังห้อง" title="ไม่พบห้อง" /></>);
  const monthly = r.rental_mode !== 'daily';
  const term = acc.room_group_term || 'ชั้น';
  return (
    <>
      <MTopbar back={`/merchant/units/`} backLabel="รายละเอียดห้อง" title={`แก้ไขห้อง `} />
      {searchParams?.error === 'code' && <div className="banner-err">กรุณาใส่เลข/ชื่อห้อง</div>}
      <form className="form mform" action={updateRoomAction.bind(null, r.id)}>
        <section className="fsec">
          <div className="fsec-h"><span className="fsec-ic"><Icon n="edit" size={15} /></span> ข้อมูลห้อง</div>
          <div className="fgrid">
            <div className="field"><label>เลข/ชื่อห้อง <span className="req">*</span></label><input name="code" defaultValue={r.code} required /></div>
            <div className="field"><label>{term}</label><input name="floor" defaultValue={r.floor || ''} placeholder={term === 'ชั้น' ? '1' : 'เช่น ริมน้ำ'} /></div>
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
      <form className="delwrap" action={deleteRoomAction.bind(null, r.id)}>
        <button className="dbtn danger" type="submit"><Icon n="trash" size={17} /> ลบห้องนี้</button>
      </form>
    </>
  );
}
