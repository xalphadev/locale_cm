import { q, i18n } from '@/lib/db';
import { approvePayoutAction, rejectPayoutAction } from '../actions';
import { PageHead } from '../adm-ui';

export const dynamic = 'force-dynamic';

const baht = (m: any) => '฿' + (Number(m || 0) / 100).toLocaleString('th-TH', { maximumFractionDigits: 0 });

// Withdrawal approvals. Approve → fn_payout_merchant via the money API (SoD, idempotent, balance-checked).
export default async function Payouts({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  let rows: any[] = []; let err: string | null = null;
  try {
    rows = await q<any>(
      `SELECT pr.id, pr.amount_minor, to_char(pr.requested_at,'YYYY-MM-DD HH24:MI') requested_at,
              m.display_name_i18n,
              (SELECT COALESCE(SUM(CASE WHEN e.direction='CR' THEN e.amount_minor ELSE -e.amount_minor END),0)
                 FROM ledger_entries e JOIN accounts a ON a.id=e.account_id
                WHERE a.account_type='merchant_payable' AND a.owner_type='merchant' AND a.owner_id=pr.merchant_id) payable
         FROM payout_requests pr JOIN merchants m ON m.id=pr.merchant_id
        WHERE pr.status='requested' ORDER BY pr.requested_at`);
  } catch (e: any) { err = String(e?.message ?? e); }

  return (
    <>
      <PageHead icon="wallet" title="คำขอถอนเงิน" count={rows.length}
        sub="อนุมัติ = โอนจริงผ่านระบบบัญชีกลาง (fn_payout_merchant: แยกผู้สร้าง/ผู้อนุมัติ, กันจ่ายเกินยอด, idempotent). ต้องเปิด money API (พอร์ต 3001)" />
      {searchParams?.ok === 'paid' && <div className="banner-ok">✓ อนุมัติและตั้งโอนแล้ว — ลงบัญชีเรียบร้อย</div>}
      {searchParams?.ok === 'rejected' && <div className="banner-ok">ปฏิเสธคำขอแล้ว</div>}
      {searchParams?.error && <p className="bad" style={{ padding: '.6rem .9rem', borderRadius: 8 }}>⚠ {searchParams.error}</p>}
      {err && <p className="note">DB error: {err}</p>}

      <table>
        <thead><tr><th>ร้าน</th><th>ขอถอน</th><th>ยอดถอนได้</th><th>ขอเมื่อ</th><th>จัดการ</th></tr></thead>
        <tbody>
          {rows.map((r) => {
            const over = Number(r.amount_minor) > Number(r.payable);
            return (
              <tr key={r.id}>
                <td>{i18n(r.display_name_i18n)}</td>
                <td className="mono">{baht(r.amount_minor)}</td>
                <td className="mono">{baht(r.payable)} {over && <span className="pill bad">เกินยอด</span>}</td>
                <td className="mono">{r.requested_at}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <form action={approvePayoutAction.bind(null, r.id)}><button className="btn btn-approve" type="submit" disabled={over}>อนุมัติ & โอน</button></form>
                    <form action={rejectPayoutAction.bind(null, r.id)}><button className="btn ghost" type="submit">ปฏิเสธ</button></form>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 && !err && <p className="note">ไม่มีคำขอถอนที่รออนุมัติ</p>}
    </>
  );
}
