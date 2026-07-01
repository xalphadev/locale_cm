import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { logoutAction } from '../actions';

export const dynamic = 'force-dynamic';

// The waiting room for the account-level approval gate (0065). Lives OUTSIDE the (app)
// group on purpose: the portal layout redirects unapproved accounts here, so this page
// must not share that layout or the redirect would loop.
export default async function Pending() {
  const acc = await currentAccount();
  if (!acc) redirect('/merchant/login');
  if (acc.approval_status === 'approved') redirect('/merchant');
  const rejected = acc.approval_status === 'rejected';

  return (
    <div className="portal-auth">
      <div className="pa-brand">Locale · ร้านค้า</div>
      {rejected ? (
        <>
          <h1>คำขอสมัครไม่ผ่านการตรวจสอบ</h1>
          <div className="banner-err">
            ทีมงานตรวจสอบข้อมูลร้าน “{acc.display_name}” แล้ว ยังไม่สามารถเปิดใช้งานได้
            {acc.approval_note ? <> — {acc.approval_note}</> : null}
          </div>
          <p className="note">หากคิดว่าเป็นความเข้าใจผิด หรืออยากส่งข้อมูลเพิ่มเติม ติดต่อทีมงานได้เลย</p>
        </>
      ) : (
        <>
          <h1>ส่งคำขอสมัครแล้ว — รอการอนุมัติ</h1>
          <p className="note">
            ทีมงานกำลังตรวจสอบข้อมูลร้าน “{acc.display_name}” ({acc.email})
            โดยปกติใช้เวลาไม่เกิน 1 วันทำการ เมื่ออนุมัติแล้วเข้าสู่ระบบอีกครั้งเพื่อเริ่มใช้งานได้ทันที
          </p>
        </>
      )}
      <form action={logoutAction}><button className="btn" type="submit">ออกจากระบบ</button></form>
    </div>
  );
}
