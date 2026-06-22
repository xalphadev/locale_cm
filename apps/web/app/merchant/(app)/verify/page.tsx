import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { Icon } from '../ui';
import { startClaimOtpAction, confirmClaimOtpAction, requestClaimReviewAction } from '../../actions';

export const dynamic = 'force-dynamic';

const OTP_ERR: Record<string, string> = {
  nophone: 'ร้านนี้ยังไม่มีเบอร์โทรในระบบ — ใช้วิธี “ให้ทีมงานตรวจสอบ” แทน',
  nocode: 'ยังไม่ได้ขอรหัส — กดส่งรหัสก่อน',
  expired: 'รหัสหมดอายุแล้ว — ขอรหัสใหม่อีกครั้ง',
  badcode: 'รหัสไม่ถูกต้อง ลองใหม่อีกครั้ง',
  locked: 'ใส่รหัสผิดหลายครั้ง — ขอรหัสใหม่อีกครั้ง',
};

// Ownership verification — unlocks loyalty/Stamps + the consumer "verified by owner" badge.
export default async function Verify({ searchParams }: {
  searchParams: { sent?: string; dev?: string; ok?: string; error?: string; claimed?: string; need?: string };
}) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  const name = i18n(acc.place_name) || 'ร้านของคุณ';

  // ── already verified ──
  if (acc.verified) {
    return (
      <>
        <h1 className="phead"><span className="phead-ic"><Icon n="check" size={18} /></span> ยืนยันความเป็นเจ้าของแล้ว</h1>
        <div className="banner-ok">✓ “{name}” ได้รับการยืนยันแล้ว — เปิดแต้มสะสมและฟีเจอร์เต็มได้ทันที</div>
        <Link className="bigcta" href="/merchant/loyalty"><Icon n="spark" size={19} /> ไปตั้งค่าแต้มสะสม</Link>
        <p className="note" style={{ marginTop: 12 }}>ลูกค้าจะเห็นตรา <b>“ยืนยันโดยเจ้าของร้าน”</b> บนหน้าร้านของคุณ</p>
      </>
    );
  }

  const [pendingManual] = await q<any>(
    `SELECT created_at FROM place_claims WHERE place_id=$1 AND method='manual_review' AND status='pending' ORDER BY created_at DESC LIMIT 1`,
    [acc.place_id]);
  const [lastOtp] = await q<any>(
    `SELECT contact_masked FROM place_claims WHERE place_id=$1 AND method='phone_otp' ORDER BY created_at DESC LIMIT 1`,
    [acc.place_id]);
  const sent = searchParams?.sent === '1';

  return (
    <>
      <h1 className="phead"><span className="phead-ic"><Icon n="lock" size={17} /></span> ยืนยันความเป็นเจ้าของร้าน</h1>
      <p className="note" style={{ margin: '.1rem 0 1rem' }}>
        “{name}” ถูกเพิ่มไว้ในระบบโดยทีมงาน — ยืนยันว่าคุณเป็นเจ้าของจริง เพื่อปลดล็อก
        <b> แต้มสะสม</b> และตรา <b>“ยืนยันโดยเจ้าของร้าน”</b> ที่ลูกค้าเห็น (ตอนนี้คุณแก้ข้อมูล/ลงสินค้า/โพสต์ได้แล้ว)
      </p>

      {searchParams?.claimed === '1' && <div className="banner-ok">✓ เคลมร้านสำเร็จ — อีกขั้นเดียวเพื่อปลดล็อกเต็ม</div>}
      {searchParams?.need && <div className="banner-err">ต้องยืนยันความเป็นเจ้าของก่อน จึงจะเปิด{searchParams.need === 'deals' ? 'ดีล/โปรโมชั่น' : 'แต้มสะสม'}ได้</div>}
      {searchParams?.ok === 'submitted' && <div className="banner-ok">✓ ส่งคำขอแล้ว — ทีมงานจะตรวจสอบและยืนยันให้</div>}
      {searchParams?.error && OTP_ERR[searchParams.error] && <div className="banner-err">{OTP_ERR[searchParams.error]}</div>}

      {/* ── method 1: phone OTP ── */}
      {sent ? (
        <section className="fsec">
          <div className="fsec-h"><span className="fsec-ic"><Icon n="check" size={15} /></span> ใส่รหัสยืนยัน 6 หลัก</div>
          <p className="fhint">ส่งรหัสไปที่ {lastOtp?.contact_masked || 'เบอร์ร้านในระบบ'} แล้ว (รหัสหมดอายุใน 10 นาที)</p>
          {searchParams?.dev && (
            <div className="banner-ok" style={{ fontVariantNumeric: 'tabular-nums' }}>
              โหมดเดโม (ยังไม่ต่อ SMS): รหัสของคุณคือ <b style={{ letterSpacing: 2 }}>{searchParams.dev}</b>
            </div>
          )}
          <form className="form mform" action={confirmClaimOtpAction}>
            <div className="field">
              <label>รหัส OTP</label>
              <input name="code" inputMode="numeric" pattern="[0-9]*" maxLength={6} required placeholder="● ● ● ● ● ●"
                     autoFocus style={{ letterSpacing: 6, fontSize: 20, textAlign: 'center' }} />
            </div>
            <button className="btn btn-primary mform-save" type="submit">ยืนยันรหัส →</button>
          </form>
          <form action={startClaimOtpAction}>
            <button className="btn" type="submit" style={{ marginTop: 8 }}>ส่งรหัสใหม่อีกครั้ง</button>
          </form>
        </section>
      ) : (
        <section className="fsec">
          <div className="fsec-h"><span className="fsec-ic"><Icon n="check" size={15} /></span> วิธีที่ 1 · ยืนยันด้วยเบอร์ร้าน (เร็วที่สุด)</div>
          <p className="fhint">เราจะส่งรหัส 6 หลักไปที่เบอร์ของร้านที่บันทึกไว้ในระบบ {acc.place_phone ? `(${maskInline(acc.place_phone)})` : ''}</p>
          {acc.place_phone ? (
            <form action={startClaimOtpAction}>
              <button className="btn btn-primary mform-save" type="submit">ส่งรหัสยืนยัน</button>
            </form>
          ) : (
            <p className="banner-err">ร้านนี้ยังไม่มีเบอร์โทรในระบบ — ใช้วิธีที่ 2 ด้านล่าง</p>
          )}
        </section>
      )}

      {/* ── method 2: manual review ── */}
      <section className="fsec" style={{ marginTop: 14 }}>
        <div className="fsec-h"><span className="fsec-ic"><Icon n="store" size={15} /></span> วิธีที่ 2 · ให้ทีมงานตรวจสอบ</div>
        {pendingManual ? (
          <p className="fhint">⏳ ส่งคำขอแล้ว — รอทีมงานตรวจสอบเอกสาร/ลงพื้นที่ จะแจ้งผลให้ทราบ</p>
        ) : (
          <>
            <p className="fhint">เบอร์ในระบบไม่ใช่ของคุณ? แจ้งทีมงานพร้อมข้อมูลยืนยัน (เช่น ทะเบียนพาณิชย์ หรือให้เจ้าหน้าที่ลงพื้นที่)</p>
            <form className="form mform" action={requestClaimReviewAction}>
              <div className="field">
                <label>ข้อความถึงทีมงาน (ไม่บังคับ)</label>
                <textarea name="note" rows={3} placeholder="เช่น ผมเป็นเจ้าของร้าน เบอร์ใหม่คือ … / มีทะเบียนพาณิชย์ยืนยันได้" />
              </div>
              <button className="btn mform-save" type="submit">ส่งให้ทีมงานตรวจสอบ</button>
            </form>
          </>
        )}
      </section>
    </>
  );
}

// inline (lighter) phone mask for the hint — mirrors maskPhone() in actions.ts
function maskInline(raw: string): string {
  const d = String(raw).replace(/[^\d+]/g, '');
  const last4 = d.slice(-4);
  return `${d.slice(0, d.startsWith('+') ? 3 : 2)} …${last4}`;
}
