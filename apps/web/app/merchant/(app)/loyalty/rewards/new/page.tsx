import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { Icon } from '../../../ui';
import { createRewardAction } from '../../../../actions';

export const dynamic = 'force-dynamic';

export default async function NewReward({ searchParams }: { searchParams: { error?: string } }) {
  const acc = await currentAccount();
  if (!acc?.brand_id) redirect('/merchant/login');
  const [prog] = await q<any>(`SELECT points_name_i18n FROM stamp_programs WHERE brand_id=$1`, [acc.brand_id]);
  if (!prog) redirect('/merchant/loyalty');
  const pointsName = i18n(prog.points_name_i18n) || 'แต้ม';

  return (
    <>
      <div className="mback"><a href="/merchant/loyalty"><Icon n="chevL" size={17} /> แต้มสะสม</a></div>
      <h1 className="phead"><span className="phead-ic"><Icon n="spark" size={18} /></span> เพิ่มของรางวัล</h1>
      {searchParams?.error === 'name' && <div className="banner-err">กรุณากรอกชื่อรางวัล</div>}
      <form className="form mform" action={createRewardAction}>
        <section className="fsec">
          <div className="fsec-h"><span className="fsec-ic"><Icon n="spark" size={15} /></span> ของรางวัล / สิทธิพิเศษ</div>
          <div className="field"><label>รางวัล *</label><input name="title" required placeholder="เช่น เค้ก 1 ชิ้น / ส่วนลด 20% / ลัดคิว VIP" /></div>
          <div className="fgrid">
            <div className="field"><label>ใช้กี่ {pointsName} *</label><input name="cost" type="number" defaultValue="6" min="1" inputMode="numeric" required /></div>
            <div className="field"><label>ประเภท</label>
              <select name="kind" defaultValue="free_item">
                <option value="free_item">ของแถม (ของฟรี)</option>
                <option value="discount">ส่วนลด</option>
                <option value="privilege">สิทธิพิเศษ (VIP/ลัดคิว/อื่น ๆ)</option>
              </select>
            </div>
          </div>
        </section>
        <button className="btn btn-primary mform-save" type="submit">เพิ่มรางวัล →</button>
      </form>
    </>
  );
}
