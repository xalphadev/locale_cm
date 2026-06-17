import { q, i18n } from '@/lib/db';
import { approveClaimAction, rejectClaimAction } from '../actions';
import { PageHead } from '../adm-ui';

export const dynamic = 'force-dynamic';

type Row = {
  id: string; place_id: string; name_i18n: any; subcategory: string | null; category: string;
  phone: string | null; email: string; note: string | null; created_at: string;
};

// Staff review queue for MANUAL ownership claims (phone-OTP claims self-verify and never appear here).
// Approving flips places.claim_verified_at → unlocks loyalty + the consumer "verified by owner" badge.
export default async function Claims({ searchParams }: { searchParams: { approved?: string; rejected?: string } }) {
  let rows: Row[] = [];
  let err: string | null = null;
  try {
    rows = await q<Row>(
      `SELECT pc.id, pc.place_id, p.name_i18n, p.subcategory, p.category::text category,
              p.phone, ma.email, pc.note,
              to_char(pc.created_at,'YYYY-MM-DD HH24:MI') AS created_at
         FROM place_claims pc
         JOIN places p ON p.id = pc.place_id
         JOIN merchant_accounts ma ON ma.id = pc.account_id
        WHERE pc.method='manual_review' AND pc.status='pending'
        ORDER BY pc.created_at`);
  } catch (e: any) { err = String(e?.message ?? e); }

  const [stat] = await q<{ verified: string; pending_otp: string }>(
    `SELECT (SELECT count(*) FROM places WHERE claim_verified_at IS NOT NULL) verified,
            (SELECT count(*) FROM place_claims WHERE method='phone_otp' AND status='pending') pending_otp`)
    .catch(() => [{ verified: '?', pending_otp: '?' }] as any);

  return (
    <>
      <PageHead icon="shield" title="ยืนยันเจ้าของร้าน" count={rows.length}
        sub="คำขอ “ให้ทีมงานตรวจสอบ” จากเจ้าของที่เคลมร้าน — อนุมัติแล้วร้านจะได้สถานะยืนยัน (ปลดล็อกแต้มสะสม + ตรายืนยันฝั่งลูกค้า). การยืนยันด้วย OTP ทางเบอร์ร้านจะทำเองอัตโนมัติ ไม่ต้องผ่านหน้านี้" />
      {searchParams?.approved && <div className="banner-ok">✓ ยืนยันแล้ว — ร้านปลดล็อกฟีเจอร์เต็มและขึ้นตรายืนยัน</div>}
      {searchParams?.rejected && <div className="banner-ok">ปฏิเสธคำขอแล้ว — ร้านยังไม่ได้รับการยืนยัน</div>}
      {err && <p className="note">DB error: {err}</p>}

      <p className="note" style={{ margin: '.2rem 0 1rem' }}>
        ร้านที่ยืนยันแล้วทั้งหมด: <b>{stat?.verified ?? 0}</b> · รอ OTP (เจ้าของทำเอง): <b>{stat?.pending_otp ?? 0}</b>
      </p>

      <table>
        <thead><tr><th>ร้าน</th><th>หมวด</th><th>เบอร์ในระบบ</th><th>ผู้ขอ</th><th>ข้อความ</th><th>ส่งเมื่อ</th><th>จัดการ</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td><a href={`/places`} title={r.place_id}>{i18n(r.name_i18n) || <span className="note">(ไม่มีชื่อ)</span>}</a></td>
              <td>{r.subcategory || r.category}</td>
              <td className="mono">{r.phone || '—'}</td>
              <td className="mono">{r.email}</td>
              <td style={{ maxWidth: 280, whiteSpace: 'normal' }}>{r.note || <span className="note">—</span>}</td>
              <td className="mono">{r.created_at}</td>
              <td>
                <div style={{ display: 'flex', gap: 6 }}>
                  <form action={approveClaimAction.bind(null, r.id)}>
                    <button className="btn btn-approve" type="submit">อนุมัติ ✓</button>
                  </form>
                  <form action={rejectClaimAction.bind(null, r.id)}>
                    <button className="btn ghost" type="submit">ปฏิเสธ</button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && !err && <p className="note">ไม่มีคำขอรอตรวจสอบ — เจ้าของร้านส่วนใหญ่ยืนยันเองผ่าน OTP ทางเบอร์ร้านได้ทันที</p>}
    </>
  );
}
