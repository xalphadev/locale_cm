import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q } from '@/lib/db';
import { loadAmenityCatalog } from '@/lib/amenities';
import { Icon, isUuid } from '../../../ui';
import { RoomForm } from '../../RoomForm';
import { MTopbar } from '../../../MTopbar';
import { updateStayUnitAction, setStayUnitManagedAction } from '../../../../actions';

export const dynamic = 'force-dynamic';

export default async function EditRoom({ params, searchParams }: { params: { id: string }; searchParams: { error?: string; rej?: string } }) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  if (!acc.offers_stay) redirect('/merchant');
  const [u] = isUuid(params.id) ? await q<any>(`SELECT *, to_char(available_from,'YYYY-MM-DD') available_from_ymd FROM stay_units WHERE id=$1 AND place_id=$2 AND deleted_at IS NULL`, [params.id, acc.place_id]) : [];
  if (!u) {
    return (<><MTopbar back="/merchant/rooms" backLabel="ห้องพัก" title="ไม่พบห้องพัก" /></>);
  }
  const typeNoun = acc.room_mode === 'unique' ? 'ห้อง' : 'รูปแบบห้อง';
  const cat = await loadAmenityCatalog();
  const hasBoard = !!acc.manages_stay && acc.room_mode !== 'unique';
  const [pc] = hasBoard ? await q<{ n: number }>(`SELECT count(*)::int n FROM stay_room WHERE stay_unit_id=$1 AND deleted_at IS NULL`, [u.id]) : [{ n: 0 }];
  return (
    <>
      <MTopbar back={`/merchant/rooms/${u.id}`} backLabel={`รายละเอียด${typeNoun}`} title={`แก้ไข${typeNoun}`} />
      {searchParams?.error === 'name' && <div className="banner-err">กรุณากรอกชื่อ{typeNoun}</div>}
      {searchParams?.error === 'upload' && <div className="banner-err">อัปโหลดรูปไม่สำเร็จ {searchParams.rej} รูป (ต้องเป็น JPG/PNG/WEBP/GIF และไม่เกิน 6MB) — รูปเดิมยังอยู่ ลองใหม่อีกครั้ง</div>}
      <RoomForm action={updateStayUnitAction.bind(null, u.id)} u={u} submitLabel="บันทึกการแก้ไข" managed={!!u.managed} noun={typeNoun} stayKind={acc.stay_kind} amenOpts={cat.amenity} buildOpts={cat.building} billOpts={cat.bills} />
      {hasBoard && (pc?.n || 0) > 0 && (
        <form className="autocount" action={setStayUnitManagedAction.bind(null, u.id, !u.managed)}>
          <span className="autocount-l"><b>นับห้องว่างอัตโนมัติ</b><span>จำนวนห้องว่างที่ลูกค้าเห็น นับจากห้องจริงในผัง ({pc.n} ห้อง) ที่ตั้งเป็น “ว่าง”</span></span>
          <button className={`dbtn sm ${u.managed ? 'primary' : ''}`} type="submit">{u.managed ? 'อัตโนมัติ ✓' : 'ใช้คำนวณ'}</button>
        </form>
      )}
    </>
  );
}
