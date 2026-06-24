import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { Icon } from '../../ui';
import { MTopbar } from '../../MTopbar';
import { WalkInForm } from './WalkInForm';

export const dynamic = 'force-dynamic';

// Add a booking by hand (walk-in / phone). Managed listings only — it needs a real room to hold.
export default async function NewBooking({ searchParams }: { searchParams: { error?: string } }) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  if (!acc.manages_stay) redirect('/merchant/bookings');

  const types = await q<any>(`SELECT id, name_i18n, rental_mode FROM stay_units WHERE place_id=$1 AND deleted_at IS NULL AND managed=true ORDER BY rental_mode, sort, created_at`, [acc.place_id]);
  const rooms = await q<any>(`SELECT id, code, stay_unit_id FROM stay_room WHERE place_id=$1 AND deleted_at IS NULL AND status='active' ORDER BY code`, [acc.place_id]);
  const t = types.map((x: any) => ({ id: x.id, name: i18n(x.name_i18n), monthly: x.rental_mode === 'monthly' }));
  const r = rooms.map((x: any) => ({ id: x.id, code: x.code, unitId: x.stay_unit_id }));

  return (
    <>
      <MTopbar back="/merchant/bookings" backLabel="การจอง" title="เพิ่มการจอง" />
      <div className="bk-detail">
        {searchParams?.error === 'full' && <div className="banner-err">ห้องที่เลือกไม่ว่างในช่วงนั้น — เลือกห้อง/วันอื่น</div>}
        {searchParams?.error === 'date' && <div className="banner-err">วันเช็คเอาท์ต้องหลังวันเช็คอิน</div>}
        {searchParams?.error === 'input' && <div className="banner-err">ข้อมูลไม่ครบ — เลือกประเภทห้องและวันเข้าพัก</div>}
        {t.length === 0 || r.length === 0 ? (
          <div className="mempty">
            <span className="mempty-ic"><Icon n="bed" size={30} /></span>
            <p>ต้องมีรูปแบบห้อง + ห้องจริงในผังก่อน จึงจะเพิ่มการจองเองได้</p>
          </div>
        ) : (
          <>
            <p className="note" style={{ marginTop: 0 }}>บันทึกการจองที่รับเองหน้าร้าน/ทางโทรศัพท์ — กันห้องในปฏิทินทันที (ไม่มีการชำระเงินผ่านแอป)</p>
            <WalkInForm types={t} rooms={r} />
          </>
        )}
      </div>
    </>
  );
}
