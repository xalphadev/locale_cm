import QRCode from 'qrcode';
import { q, i18n } from '@/lib/db';
import { promptpayPayload } from '@/lib/promptpay';
import PrintBtn from './PrintBtn';

export const dynamic = 'force-dynamic';

// PUBLIC tenant-facing bill (no login) — opened from the /bill/<token> link the owner shares over LINE/SMS.
// Looked up by the invoice's random public_token (0061). Shows the itemized bill + the owner's PromptPay/bank
// so the tenant can pay directly (host-direct, record-only — the platform never touches the money). Reuses the
// merchant CSS scope (root layout gives /bill a bare merchant-root body). No owner actions here.
const baht = (m: any) => '฿' + Math.round(Number(m || 0) / 100).toLocaleString();
const DOC_TITLE: Record<string, string> = { paid: 'ใบเสร็จรับเงิน', void: 'บิล (ยกเลิก)' };

export default async function PublicBill({ params }: { params: { token: string } }) {
  const ok = /^[a-f0-9]{6,64}$/.test(params.token || '');
  const [iv] = ok ? await q<any>(
    `SELECT i.id, i.period_ym, i.status, i.ref, i.total_minor, i.paid_minor,
            to_char(i.issue_date,'DD/MM/YYYY') issue_d, to_char(i.due_date,'DD/MM/YYYY') due_d, to_char(i.paid_at,'DD/MM/YYYY') paid_d,
            r.code room_code, t.full_name tenant_name,
            p.name_i18n pname, p.address_i18n paddr, p.phone pphone,
            p.pay_promptpay, p.pay_bank, p.pay_account_no, p.pay_account_name
       FROM stay_invoice i
       JOIN stay_room r ON r.id=i.room_id
       LEFT JOIN stay_tenant t ON t.id=i.tenant_id AND t.deleted_at IS NULL
       JOIN places p ON p.id=i.place_id
      WHERE i.public_token=$1 AND i.deleted_at IS NULL`, [params.token]) : [];
  if (!iv) return (<div className="printsheet" style={{ maxWidth: 560, margin: '0 auto', padding: 24 }}><p className="note">ไม่พบบิลนี้ — ลิงก์อาจไม่ถูกต้องหรือถูกยกเลิก</p></div>);
  const lines = await q<any>(`SELECT label, units, rate_minor, amount_minor FROM stay_invoice_line WHERE invoice_id=$1 ORDER BY sort`, [iv.id]);
  const title = DOC_TITLE[iv.status] || 'ใบแจ้งหนี้';
  const payTo = [
    iv.pay_promptpay ? `PromptPay ${iv.pay_promptpay}` : '',
    iv.pay_bank && iv.pay_account_no ? `${iv.pay_bank} ${iv.pay_account_no}${iv.pay_account_name ? ` (${iv.pay_account_name})` : ''}` : '',
  ].filter(Boolean);
  const remaining = Number(iv.total_minor) - Number(iv.paid_minor || 0);   // partial payments (0064): pay the balance, not the full total
  const partPaid = iv.status !== 'paid' && iv.status !== 'void' && Number(iv.paid_minor) > 0;
  // scannable PromptPay QR with the amount pre-filled — only for an unpaid bill with a PromptPay target (remaining balance)
  const ppPayload = (iv.status !== 'paid' && iv.status !== 'void' && iv.pay_promptpay && remaining > 0)
    ? promptpayPayload(iv.pay_promptpay, remaining / 100) : '';
  const qr = ppPayload ? await QRCode.toDataURL(ppPayload, { width: 220, margin: 1 }).catch(() => '') : '';

  return (
    <div className="printsheet" style={{ maxWidth: 560, margin: '0 auto', padding: '20px 18px' }}>
      <div className="print-bar"><PrintBtn /></div>
      <div className="doc-top">
        <div><div className="doc-title">{title}</div>{iv.ref ? <div className="doc-ref">เลขที่ {iv.ref}</div> : null}</div>
        <div style={{ textAlign: 'right' }}><b>{i18n(iv.pname) || 'ที่พัก'}</b>{iv.paddr ? <div className="doc-ref">{i18n(iv.paddr)}</div> : null}{iv.pphone ? <div className="doc-ref">โทร {iv.pphone}</div> : null}</div>
      </div>
      <div className="doc-parties"><div className="doc-party"><h4>ผู้เช่า</h4>{iv.tenant_name || 'ผู้เช่า'}<div className="doc-ref">ห้อง {iv.room_code}</div></div></div>
      <div className="doc-meta"><span>รอบบิล: {iv.period_ym}</span><span>วันที่ออก: {iv.issue_d}</span><span>ครบกำหนด: {iv.due_d}</span></div>
      <table className="doc-tbl">
        <thead><tr><th>รายการ</th><th className="num">จำนวน</th><th className="num">ยอด</th></tr></thead>
        <tbody>
          {lines.map((l: any, i: number) => (
            <tr key={i}><td>{l.label}</td><td className="num">{l.units != null ? `${Number(l.units)} หน่วย × ฿${(Number(l.rate_minor) / 100).toLocaleString()}` : ''}</td><td className="num">{baht(l.amount_minor)}</td></tr>
          ))}
        </tbody>
      </table>
      <div className="doc-total"><span>รวมทั้งสิ้น</span><span>{baht(iv.total_minor)}</span></div>
      {partPaid && (
        <div className="doc-meta" style={{ marginTop: 4 }}><span>ชำระแล้ว {baht(iv.paid_minor)}</span><span><b>คงเหลือ {baht(remaining)}</b></span></div>
      )}
      {iv.status === 'paid'
        ? <div className="doc-paid">✓ ชำระแล้ว{iv.paid_d ? ` · ${iv.paid_d}` : ''}</div>
        : iv.status === 'void' ? <p className="note">บิลนี้ถูกยกเลิก</p>
        : payTo.length
          ? <div className="doc-pay">
              {qr ? <div style={{ textAlign: 'center', marginBottom: 8 }}><img src={qr} alt="PromptPay QR" style={{ width: 200, height: 200 }} /><div className="doc-ref">สแกนพร้อมเพย์ · ยอด {baht(remaining)}</div></div> : null}
              <b>ชำระ {baht(remaining)} ได้ที่:</b>{payTo.map((x, i) => <div key={i}>{x}</div>)}<div className="doc-ref" style={{ marginTop: 6 }}>โอนตามยอดนี้แล้วส่งสลิปให้เจ้าของที่พักเพื่อยืนยัน</div>
            </div>
          : <p className="note">ติดต่อเจ้าของที่พักเพื่อชำระเงิน</p>}
      <p className="note" style={{ marginTop: 16, fontSize: '.78rem' }}>ค่าน้ำ/ไฟคิดตามหน่วยที่ใช้จริง × อัตราที่แจ้ง</p>
    </div>
  );
}
