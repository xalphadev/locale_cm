import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { Icon } from '../../ui';
import { createRoomAction, createRoomsBulkAction } from '../../../actions';

export const dynamic = 'force-dynamic';

// Dedicated "add room" page — kept OFF the board so the list view isn't mixed with forms. Two clear
// modes: one room, or a numeric run (101–110) for laying out a dorm fast.
export default async function NewRoom({ searchParams }: { searchParams: { error?: string } }) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  if (!acc.manages_stay || acc.room_mode === 'unique') redirect('/merchant');

  const types = await q<any>(`SELECT id, name_i18n FROM stay_units WHERE place_id=$1 AND deleted_at IS NULL ORDER BY rental_mode, sort, created_at`, [acc.place_id]);
  const term = acc.room_group_term || 'ชั้น';

  const back = <div className="mback"><a href="/merchant/units"><Icon n="chevL" size={18} /> ผังห้อง</a></div>;
  if (types.length === 0) {
    return (
      <>
        {back}
        <div className="mempty">
          <span className="mempty-ic"><Icon n="bed" size={30} /></span>
          <p>สร้าง “รูปแบบห้อง” (เช่น สตูดิโอ / เตียงในห้องรวม) ในเมนู “ห้องพัก” ก่อน แล้วค่อยเพิ่มห้องจริง</p>
          <a className="btn btn-primary" href="/merchant/rooms/new">+ สร้างรูปแบบห้อง</a>
        </div>
      </>
    );
  }

  return (
    <>
      {back}
      {searchParams?.error === 'code' && <div className="banner-err">กรุณาใส่เลข/ชื่อห้อง</div>}
      {searchParams?.error === 'dupe' && <div className="banner-err">เลขห้องนี้มีอยู่แล้ว</div>}
      {searchParams?.error === 'range' && <div className="banner-err">ช่วงเลขห้องไม่ถูกต้อง — ใส่เลขเริ่ม–สิ้นสุด (ไม่เกิน 200 ห้อง)</div>}
      <h1 className="phead"><span className="phead-ic"><Icon n="plus" size={18} /></span> เพิ่มห้อง</h1>

      <form className="form mform" action={createRoomAction}>
        <section className="fsec">
          <div className="fsec-h"><span className="fsec-ic"><Icon n="bed" size={15} /></span> เพิ่มทีละห้อง</div>
          <div className="fgrid">
            <div className="field"><label>เลข/ชื่อห้อง *</label><input name="code" placeholder="101" required /></div>
            <div className="field"><label>{term}</label><input name="floor" placeholder={term === 'ชั้น' ? '1' : 'เช่น ริมน้ำ'} /></div>
          </div>
          <div className="fgrid">
            <div className="field"><label>รูปแบบห้อง</label>
              <select name="stay_unit_id" defaultValue="">
                <option value="">— ไม่ระบุ —</option>
                {types.map((t) => <option key={t.id} value={t.id}>{i18n(t.name_i18n)}</option>)}
              </select>
            </div>
            <div className="field"><label>รับได้ (ท่าน)</label><input name="capacity" type="number" min="0" placeholder="2" /></div>
          </div>
          <button className="btn btn-primary" type="submit">+ เพิ่มห้อง</button>
        </section>
      </form>

      <form className="form mform" action={createRoomsBulkAction}>
        <section className="fsec">
          <div className="fsec-h"><span className="fsec-ic"><Icon n="plus" size={15} /></span> เพิ่มหลายห้องรวดเดียว</div>
          <p className="fhint">ใส่{term} “1” · เลขเริ่ม 1 ถึง 10 → ได้ห้อง 101–110 อัตโนมัติ (เลขห้องที่มีอยู่แล้วจะถูกข้าม)</p>
          <div className="fgrid">
            <div className="field"><label>{term}</label><input name="floor" placeholder={term === 'ชั้น' ? '1' : 'เช่น ริมน้ำ'} /></div>
            <div className="field"><label>รูปแบบห้อง</label>
              <select name="stay_unit_id" defaultValue="">
                <option value="">— ไม่ระบุ —</option>
                {types.map((t) => <option key={t.id} value={t.id}>{i18n(t.name_i18n)}</option>)}
              </select>
            </div>
          </div>
          <div className="fgrid">
            <div className="field"><label>เลขห้องเริ่ม *</label><input name="start" type="number" min="0" placeholder="1" required /></div>
            <div className="field"><label>ถึงเลข *</label><input name="end" type="number" min="0" placeholder="10" required /></div>
          </div>
          <button className="btn btn-primary" type="submit">+ เพิ่มหลายห้อง</button>
        </section>
      </form>
    </>
  );
}
