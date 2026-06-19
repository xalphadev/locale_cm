import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { Icon } from '../../ui';
import { RoomForm } from '../RoomForm';
import { createStayUnitAction } from '../../../actions';

export const dynamic = 'force-dynamic';

export default async function NewRoom({ searchParams }: { searchParams: { error?: string } }) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  if (!acc.offers_stay) redirect('/merchant');
  const typeNoun = acc.room_mode === 'unique' ? 'ห้อง' : 'รูปแบบห้อง';
  const backLabel = acc.room_mode === 'unique' ? 'ห้อง' : 'ห้องพัก';
  return (
    <>
      <div className="mback"><a href="/merchant/rooms"><Icon n="chevL" size={18} /> {backLabel}</a></div>
      <h1>เพิ่ม{typeNoun}</h1>
      {searchParams?.error === 'name' && <div className="banner-err">กรุณากรอกชื่อ{typeNoun}</div>}
      <RoomForm action={createStayUnitAction} submitLabel={`เพิ่ม${typeNoun}`} noun={typeNoun} />
    </>
  );
}
