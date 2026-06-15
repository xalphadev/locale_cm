import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q } from '@/lib/db';
import { RoomForm } from '../../RoomForm';
import { updateStayUnitAction, deleteStayUnitAction } from '../../../../actions';

export const dynamic = 'force-dynamic';

export default async function EditRoom({ params, searchParams }: { params: { id: string }; searchParams: { error?: string; rej?: string } }) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  if (!acc.offers_stay) redirect('/merchant');
  const [u] = await q<any>(`SELECT * FROM stay_units WHERE id=$1 AND place_id=$2`, [params.id, acc.place_id]);
  if (!u) {
    return (<><div className="mback"><a href="/merchant/rooms">← ห้องพัก</a></div><h1>ไม่พบห้องพัก</h1></>);
  }
  return (
    <>
      <div className="mback"><a href="/merchant/rooms">← ห้องพัก</a></div>
      <h1>แก้ไขห้องพัก</h1>
      {searchParams?.error === 'name' && <div className="banner-err">กรุณากรอกชื่อห้อง</div>}
      {searchParams?.error === 'upload' && <div className="banner-err">อัปโหลดรูปไม่สำเร็จ {searchParams.rej} รูป (ต้องเป็น JPG/PNG/WEBP/GIF และไม่เกิน 6MB) — รูปเดิมยังอยู่ ลองใหม่อีกครั้ง</div>}
      <RoomForm action={updateStayUnitAction.bind(null, u.id)} u={u} submitLabel="บันทึกการแก้ไข" />
      <form className="delwrap" action={deleteStayUnitAction.bind(null, u.id)}>
        <button className="mini danger" type="submit">ลบห้องนี้</button>
      </form>
    </>
  );
}
