import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { RoomForm } from '../RoomForm';
import { createStayUnitAction } from '../../../actions';

export const dynamic = 'force-dynamic';

export default async function NewRoom({ searchParams }: { searchParams: { error?: string } }) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  if (!acc.offers_stay) redirect('/merchant');
  return (
    <>
      <div className="mback"><a href="/merchant/rooms">← ห้องพัก</a></div>
      <h1>เพิ่มห้องพัก</h1>
      {searchParams?.error === 'name' && <div className="banner-err">กรุณากรอกชื่อห้อง</div>}
      <RoomForm action={createStayUnitAction} submitLabel="เพิ่มห้อง" />
    </>
  );
}
