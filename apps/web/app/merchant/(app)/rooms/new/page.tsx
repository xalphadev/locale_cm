import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { loadAmenityCatalog } from '@/lib/amenities';
import { Icon } from '../../ui';
import { MTopbar } from '../../MTopbar';
import { RoomForm } from '../RoomForm';
import { createStayUnitAction } from '../../../actions';

export const dynamic = 'force-dynamic';

export default async function NewRoom({ searchParams }: { searchParams: { error?: string } }) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  if (!acc.offers_stay) redirect('/merchant');
  const typeNoun = acc.room_mode === 'unique' ? 'ห้อง' : 'รูปแบบห้อง';
  const backLabel = acc.room_mode === 'unique' ? 'ห้อง' : 'ห้องพัก';
  const cat = await loadAmenityCatalog();
  return (
    <>
      <MTopbar back="/merchant/rooms" backLabel={backLabel} title={`เพิ่ม${typeNoun}`} />
      {searchParams?.error === 'name' && <div className="banner-err">กรุณากรอกชื่อ{typeNoun}</div>}
      <RoomForm action={createStayUnitAction} submitLabel={`เพิ่ม${typeNoun}`} noun={typeNoun} stayKind={acc.stay_kind} amenOpts={cat.amenity} buildOpts={cat.building} billOpts={cat.bills} />
    </>
  );
}
