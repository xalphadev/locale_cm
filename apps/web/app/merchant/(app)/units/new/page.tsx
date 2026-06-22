import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { Icon } from '../../ui';
import { AddRoom } from './AddRoom';

export const dynamic = 'force-dynamic';

// Dedicated "add room" page — kept OFF the board so the list view isn't mixed with forms. Two clear
// modes: one room, or a numeric run (101–110) for laying out a dorm fast.
export default async function NewRoom({ searchParams }: { searchParams: { error?: string } }) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  if (!acc.manages_stay || acc.room_mode === 'unique') redirect('/merchant');

  const types = await q<any>(`SELECT id, name_i18n, capacity FROM stay_units WHERE place_id=$1 AND deleted_at IS NULL ORDER BY rental_mode, sort, created_at`, [acc.place_id]);
  const term = acc.room_group_term || 'ชั้น';

  const back = <div className="mback"><Link href="/merchant/units"><Icon n="chevL" size={18} /> ผังห้อง</Link></div>;
  if (types.length === 0) {
    return (
      <>
        {back}
        <div className="mempty">
          <span className="mempty-ic"><Icon n="bed" size={30} /></span>
          <p>สร้าง “รูปแบบห้อง” (เช่น สตูดิโอ / เตียงในห้องรวม) ในเมนู “ห้องพัก” ก่อน แล้วค่อยเพิ่มห้องจริง</p>
          <Link className="btn btn-primary" href="/merchant/rooms/new">+ สร้างรูปแบบห้อง</Link>
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
      <h1 className="phead"><span className="phead-ic"><Icon n="plus" size={18} /></span> เพิ่มห้องจริงในผัง</h1>
      <AddRoom types={types.map((t) => ({ id: t.id, name: i18n(t.name_i18n), capacity: t.capacity ?? null }))} term={term} />
    </>
  );
}
