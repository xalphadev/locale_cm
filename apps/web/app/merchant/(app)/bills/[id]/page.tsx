import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { isUuid } from '../../ui';
import PrintBtn from './PrintBtn';

export const dynamic = 'force-dynamic';

// Printable bill document (0059): renders one invoice as a formal sheet — ใบแจ้งหนี้ when still รอชำระ,
// ใบเสร็จรับเงิน once marked paid (บิลที่ยกเลิกก็ยังเปิดดูได้). Record-only; the payment block shows the
// landlord's own PromptPay/bank (host-direct — the platform never holds funds). @media print hides the app
// chrome + the print bar (globals.css), so browser print / save-PDF gives a clean sheet.
const baht = (m: any) => '฿' + Math.round(Number(m || 0) / 100).toLocaleString();
const DOC_TITLE: Record<string, string> = { paid: 'ใบเสร็จรับเงิน', void: 'บิล (ยกเลิก)' };

export default async function InvoiceDoc({ params }: { params: { id: string } }) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  if (!acc.manages_stay) redirect('/merchant/rooms');
  const [iv] = isUuid(params.id) ? await q<any>(
    `SELECT i.period_ym, i.status, i.ref, i.total_minor,
            to_char(i.issue_date,'DD/MM/YYYY') issue_d, to_char(i.due_date,'DD/MM/YYYY') due_d, to_char(i.paid_at,'DD/MM/YYYY') paid_d,
            r.code room_code, t.full_name tenant_name, t.phone tenant_phone,
            p.name_i18n pname, p.address_i18n paddr, p.phone pphone,
            p.pay_promptpay, p.pay_bank, p.pay_account_no, p.pay_account_name
       FROM stay_invoice i
       JOIN stay_room r ON r.id=i.room_id
       LEFT JOIN stay_tenant t ON t.id=i.tenant_id AND t.deleted_at IS NULL
       JOIN places p ON p.id=i.place_id
      WHERE i.id=$1 AND i.place_id=$2 AND i.deleted_at IS NULL`, [params.id, acc.place_id]) : [];
  if (!iv) return (<div className="printsheet"><div className="print-bar"><Link className="dbtn sm" href="/merchant/bills">← กลับ</Link></div><p className="note">ไม่พบบิล</p></div>);
  const lines = await q<any>(`SELECT label, units, rate_minor, amount_minor FROM stay_invoice_line WHERE invoice_id=$1 ORDER BY sort`, [params.id]);
  const title = DOC_TITLE[iv.status] || 'ใบแจ้งหนี้';
  const payTo = [
    iv.pay_promptpay ? `PromptPay ${iv.pay_promptpay}` : '',
    iv.pay_bank && iv.pay_account_no ? `${iv.pay_bank} ${iv.pay_account_no}${iv.pay_account_name ? ` (${iv.pay_account_name})` : ''}` : '',
  ].filter(Boolean);

  return (
    <div className="printsheet">
      <div className="print-bar"><PrintBtn /><Link className="dbtn sm" href="/merchant/bills">← กลับ</Link></div>

      <div className="doc-top">
        <div><div className="doc-title">{title}</div>{iv.ref ? <div className="doc-ref">เลขที่ {iv.ref}</div> : null}</div>
        <div style={{ textAlign: 'right' }}><b>{i18n(iv.pname) || 'ที่พัก'}</b>{iv.paddr ? <div className="doc-ref">{i18n(iv.paddr)}</div> : null}{iv.pphone ? <div className="doc-ref">โทร {iv.pphone}</div> : null}</div>
      </div>

      <div className="doc-parties">
        <div className="doc-party"><h4>ผู้เช่า</h4>{iv.tenant_name || 'ผู้เช่า'}{iv.tenant_phone ? <div className="doc-ref">โทร {iv.tenant_phone}</div> : null}<div className="doc-ref">ห้อง {iv.room_code}</div></div>
      </div>

      <div className="doc-meta"><span>รอบบิล: {iv.period_ym}</span><span>วันที่ออก: {iv.issue_d}</span><span>ครบกำหนด: {iv.due_d}</span></div>

      <table className="doc-tbl">
        <thead><tr><th>รายการ</th><th className="num">จำนวน</th><th className="num">ยอด</th></tr></thead>
        <tbody>
          {lines.map((l: any, i: number) => (
            <tr key={i}>
              <td>{l.label}</td>
              <td className="num">{l.units != null ? `${Number(l.units)} หน่วย × ฿${(Number(l.rate_minor) / 100).toLocaleString()}` : ''}</td>
              <td className="num">{baht(l.amount_minor)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="doc-total"><span>รวมทั้งสิ้น</span><span>{baht(iv.total_minor)}</span></div>

      {iv.status === 'paid'
        ? <div className="doc-paid">✓ ชำระแล้ว{iv.paid_d ? ` · ${iv.paid_d}` : ''}</div>
        : iv.status === 'void' ? <p className="note">บิลนี้ถูกยกเลิก</p>
        : payTo.length
          ? <div className="doc-pay"><b>ชำระเงินได้ที่:</b>{payTo.map((x, i) => <div key={i}>{x}</div>)}<div className="doc-ref" style={{ marginTop: 6 }}>โอนแล้วส่งสลิปให้เจ้าของที่พักเพื่อยืนยัน</div></div>
          : <p className="note">ชำระที่เจ้าของที่พัก</p>}

      <p className="note" style={{ marginTop: 16, fontSize: '.78rem' }}>ค่าน้ำ/ไฟคิดตามหน่วยที่ใช้จริง × อัตราที่แจ้ง · เอกสารออกจากระบบจัดการหอพัก</p>
    </div>
  );
}
