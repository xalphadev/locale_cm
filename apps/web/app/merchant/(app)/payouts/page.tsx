import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q } from '@/lib/db';
import { Icon } from '../ui';
import { createPayoutRequestAction } from '../../actions';

export const dynamic = 'force-dynamic';

const baht = (m: any) => '฿' + (Number(m || 0) / 100).toLocaleString('th-TH', { maximumFractionDigits: 0 });
const ERR: Record<string, string> = {
  amount: 'กรอกจำนวนเงินให้ถูกต้อง', balance: 'จำนวนเกินยอดที่ถอนได้', pending: 'มีคำขอถอนที่รออนุมัติอยู่แล้ว',
};
const ST_TH: Record<string, string> = { requested: 'รออนุมัติ', paid: 'จ่ายแล้ว', rejected: 'ปฏิเสธ' };

export default async function Payouts({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  const acc = await currentAccount();
  if (!acc?.brand_id) redirect('/merchant/login');
  if (!acc.verified) {
    return (
      <>
        <h1 className="phead"><span className="phead-ic"><Icon n="lock" size={17} /></span> ถอนเงิน · รายได้</h1>
        <div className="banner-err">ฟีเจอร์นี้ล็อกอยู่ — ต้องยืนยันความเป็นเจ้าของร้านก่อน</div>
        <a className="bigcta" href="/merchant/verify?need=payouts" style={{ marginTop: 12 }}><Icon n="lock" size={18} /> ยืนยันความเป็นเจ้าของร้าน</a>
      </>
    );
  }

  // available = merchant_payable balance (read-only; settlement is money-plane)
  const [bal] = await q<any>(
    `SELECT COALESCE(SUM(CASE WHEN e.direction='CR' THEN e.amount_minor ELSE -e.amount_minor END),0)::bigint payable
       FROM ledger_entries e JOIN accounts a ON a.id=e.account_id
       JOIN brands b ON b.merchant_id=a.owner_id
      WHERE a.account_type='merchant_payable' AND a.owner_type='merchant' AND b.id=$1`, [acc.brand_id]);
  const avail = Number(bal?.payable || 0);
  const reqs = await q<any>(
    `SELECT pr.id, pr.amount_minor, pr.status, to_char(pr.requested_at,'YYYY-MM-DD HH24:MI') requested_at, pr.ledger_txn_id
       FROM payout_requests pr JOIN brands b ON b.merchant_id=pr.merchant_id
      WHERE b.id=$1 ORDER BY pr.requested_at DESC LIMIT 20`, [acc.brand_id]);

  return (
    <>
      <h1 className="phead"><span className="phead-ic"><Icon n="wallet" size={17} /></span> ถอนเงิน · รายได้</h1>
      {searchParams?.ok === 'requested' && <div className="banner-ok">✓ ส่งคำขอถอนแล้ว — รอทีมงานอนุมัติและโอน</div>}
      {searchParams?.error && <div className="banner-err">{ERR[searchParams.error] || 'เกิดข้อผิดพลาด'}</div>}

      <div className="lstats" style={{ marginTop: 4 }}>
        <div className="lstat"><div className="v">{baht(avail)}</div><div className="l">ยอดที่ถอนได้</div></div>
      </div>

      {avail > 0 ? (
        <form className="form mform" action={createPayoutRequestAction}>
          <div className="field"><label>จำนวนที่ต้องการถอน (บาท)</label>
            <input name="amount" type="number" min="1" max={Math.floor(avail / 100)} inputMode="numeric" required placeholder={String(Math.floor(avail / 100))} />
          </div>
          <button className="btn btn-primary mform-save" type="submit">ขอถอนเงิน →</button>
        </form>
      ) : (
        <p className="note" style={{ margin: '.4rem 0 1rem' }}>ยังไม่มียอดให้ถอน — รายได้จากการขาย/แลกรางวัลที่ตกตะกอนแล้วจะมาแสดงที่นี่</p>
      )}
      <p className="note">การโอนจริงทำโดยทีมงาน (แยกผู้สร้าง/ผู้อนุมัติ) ผ่านระบบบัญชีกลาง — ปลอดภัยและตรวจสอบได้</p>

      {reqs.length > 0 && (
        <>
          <div className="menu-label">ประวัติคำขอถอน</div>
          <div className="mlist">
            {reqs.map((r) => (
              <div className="mrow" key={r.id}>
                <span className="mrow-img"><span className="ph"><Icon n="wallet" size={20} /></span></span>
                <div className="mrow-body">
                  <div className="mrow-nm">{baht(r.amount_minor)}</div>
                  <div className="mrow-meta">
                    <span className={`pill ${r.status === 'paid' ? 'ok' : ''}`}>{ST_TH[r.status] || r.status}</span> · {r.requested_at}
                    {r.ledger_txn_id && <> · อ้างอิง {String(r.ledger_txn_id).slice(0, 8)}</>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
