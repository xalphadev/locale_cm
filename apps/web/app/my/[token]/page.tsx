import Link from 'next/link';
import QRCode from 'qrcode';
import { q, i18n } from '@/lib/db';
import { promptpayPayload } from '@/lib/promptpay';
import { Icon } from '../../merchant/(app)/ui';
import { submitMaintenanceAction } from '../actions';

export const dynamic = 'force-dynamic';

// PUBLIC tenant self-service portal (no login) — /my/<token>, one private link the owner shares over LINE.
// Looked up by stay_lease.portal_token (0062). Shows the tenant THEIR OWN tenancy: amount owed + how to pay,
// their bills (→ printable /bill/<token>), latest water/electric usage, and contract summary. Record-only;
// the tenant pays the owner's PromptPay directly. (แจ้งซ่อม is added next.) Reuses the merchant CSS scope.
const baht = (m: any) => '฿' + Math.round(Number(m || 0) / 100).toLocaleString();
const INV_ST: Record<string, string> = { draft: 'ร่าง', issued: 'รอชำระ', paid: 'ชำระแล้ว', void: 'ยกเลิก' };
const RP: Record<string, string> = { new: 'รอรับเรื่อง', in_progress: 'กำลังซ่อม', done: 'เสร็จแล้ว', cancelled: 'ยกเลิก' };

export default async function TenantPortal({ params, searchParams }: { params: { token: string }; searchParams: { ok?: string; error?: string } }) {
  const okToken = /^[a-f0-9]{6,64}$/.test(params.token || '');
  const [ls] = okToken ? await q<any>(
    `SELECT l.id, l.rent_minor, l.deposit_minor, l.billing_day,
            to_char(l.start_date,'DD/MM/YYYY') sd, to_char(l.end_date,'DD/MM/YYYY') ed,
            r.code room_code, t.full_name tenant_name,
            p.name_i18n pname, p.phone pphone, p.pay_promptpay, p.pay_bank, p.pay_account_no, p.pay_account_name
       FROM stay_lease l
       JOIN stay_room r ON r.id=l.room_id
       LEFT JOIN stay_tenant t ON t.id=l.tenant_id AND t.deleted_at IS NULL
       JOIN places p ON p.id=l.place_id
      WHERE l.portal_token=$1 AND l.deleted_at IS NULL`, [params.token]) : [];
  if (!ls) return (<div style={{ maxWidth: 560, margin: '0 auto', padding: 'calc(24px + env(safe-area-inset-top)) 20px 24px' }}><p className="note">ไม่พบข้อมูล — ลิงก์อาจไม่ถูกต้องหรือถูกยกเลิก</p></div>);

  const [sm] = await q<any>(`SELECT COALESCE(sum(total_minor - paid_minor) FILTER (WHERE status='issued'),0) outstanding FROM stay_invoice WHERE lease_id=$1 AND deleted_at IS NULL`, [ls.id]);
  const invs = await q<any>(
    `SELECT id, public_token, period_ym, to_char(due_date,'DD/MM/YY') due_d, (status='issued' AND due_date<CURRENT_DATE) overdue, total_minor, paid_minor, status
       FROM stay_invoice WHERE lease_id=$1 AND deleted_at IS NULL ORDER BY period_ym DESC LIMIT 12`, [ls.id]);
  const util = await q<any>(
    `SELECT il.kind, il.units, il.amount_minor, i.period_ym
       FROM stay_invoice_line il JOIN stay_invoice i ON i.id=il.invoice_id
      WHERE i.lease_id=$1 AND i.deleted_at IS NULL AND il.kind IN ('electricity','water')
      ORDER BY i.period_ym DESC, il.sort LIMIT 6`, [ls.id]);
  const latestPeriod = util[0]?.period_ym;
  const latestUtil = util.filter((u: any) => u.period_ym === latestPeriod);
  const repairs = await q<any>(`SELECT detail, status, to_char(created_at,'DD/MM/YY') at FROM stay_maintenance WHERE lease_id=$1 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 10`, [ls.id]);
  const outstanding = Number(sm?.outstanding || 0);
  const payTo = [
    ls.pay_promptpay ? `PromptPay ${ls.pay_promptpay}` : '',
    ls.pay_bank && ls.pay_account_no ? `${ls.pay_bank} ${ls.pay_account_no}${ls.pay_account_name ? ` (${ls.pay_account_name})` : ''}` : '',
  ].filter(Boolean);
  const ppPayload = (outstanding > 0 && ls.pay_promptpay) ? promptpayPayload(ls.pay_promptpay, outstanding / 100) : '';
  const qr = ppPayload ? await QRCode.toDataURL(ppPayload, { width: 220, margin: 1 }).catch(() => '') : '';
  const kindTh: Record<string, string> = { electricity: 'ค่าไฟ', water: 'ค่าน้ำ' };

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: 'calc(18px + env(safe-area-inset-top)) 16px calc(18px + env(safe-area-inset-bottom))' }}>
      <div className="listhead"><h1>หน้าของฉัน</h1></div>
      {searchParams?.ok === 'repair' && <div className="banner-ok">✓ ส่งแจ้งซ่อมแล้ว — เจ้าของที่พักจะดำเนินการให้</div>}
      {searchParams?.error === 'empty' && <div className="banner-err">กรุณากรอกรายละเอียดที่ต้องการแจ้งซ่อม</div>}
      <p className="roomhub-sub">{i18n(ls.pname) || 'ที่พัก'} · ห้อง {ls.room_code}{ls.tenant_name ? ` · ${ls.tenant_name}` : ''}</p>

      <div className="bk-summary">
        <div className="bk-sum-stats">
          <div className="bk-stat"><span className={`bk-stat-n ${outstanding > 0 ? 'bk-amber' : ''}`}>{baht(outstanding)}</span><span className="bk-stat-l">ยอดค้างชำระ</span></div>
        </div>
        {outstanding > 0
          ? (payTo.length ? <div className="doc-pay" style={{ marginTop: 10 }}>
              {qr ? <div style={{ textAlign: 'center', marginBottom: 8 }}><img src={qr} alt="PromptPay QR" style={{ width: 200, height: 200 }} /><div className="doc-ref">สแกนพร้อมเพย์ · ยอด {baht(outstanding)}</div></div> : null}
              <b>ชำระ {baht(outstanding)} ได้ที่:</b>{payTo.map((x, i) => <div key={i}>{x}</div>)}<div className="doc-ref" style={{ marginTop: 6 }}>โอนแล้วส่งสลิปให้เจ้าของที่พักเพื่อยืนยัน</div></div>
            : <p className="note" style={{ margin: '6px 0 0' }}>ติดต่อเจ้าของที่พักเพื่อชำระเงิน</p>)
          : <p className="note" style={{ margin: '4px 0 0', color: 'var(--m-ok)' }}>ไม่มียอดค้าง</p>}
      </div>

      {latestUtil.length > 0 && (
        <>
          <h2 className="rsec"><span className="rsec-ic"><Icon n="spark" size={15} /></span>ค่าน้ำ-ไฟ {latestPeriod ? `(${latestPeriod})` : ''}</h2>
          <div className="factgrid">
            {latestUtil.map((u: any, i: number) => (
              <div className="factitem" key={i}>
                <div className="factitem-tx"><div className="factitem-l">{kindTh[u.kind] || u.kind}{u.units != null ? ` · ${Number(u.units)} หน่วย` : ''}</div><div className="factitem-v">{baht(u.amount_minor)}</div></div>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="rsec"><span className="rsec-ic"><Icon n="bill" size={15} /></span>บิลของฉัน</h2>
      {invs.length === 0 ? <p className="note">ยังไม่มีบิล</p> : (
        <div className="mlist">
          {invs.map((iv: any) => {
            const row = (
              <>
                <span className="mrow-body">
                  <span className="mrow-nm">{iv.period_ym} · {baht(iv.total_minor)}{iv.overdue ? ' · เกินกำหนด' : ''}{iv.status === 'issued' && Number(iv.paid_minor) > 0 ? ' · จ่ายบางส่วน' : ''}</span>
                  <span className="mrow-meta">ครบกำหนด {iv.due_d} · {INV_ST[iv.status] || iv.status}{iv.status === 'issued' && Number(iv.paid_minor) > 0 ? ` · เหลือ ${baht(Number(iv.total_minor) - Number(iv.paid_minor))}` : ''}</span>
                </span>
                {iv.status === 'paid' ? <span className="t sold">จ่ายแล้ว</span> : iv.public_token ? <span className="mrow-editlink">ดู/จ่าย</span> : null}
              </>
            );
            return iv.public_token
              ? <Link className="mrow" key={iv.id} href={`/bill/${iv.public_token}`} style={{ textDecoration: 'none', color: 'inherit' }}>{row}</Link>
              : <div className="mrow" key={iv.id} style={{ cursor: 'default' }}>{row}</div>;
          })}
        </div>
      )}

      <h2 className="rsec"><span className="rsec-ic"><Icon n="chat" size={15} /></span>แจ้งซ่อม</h2>
      <form action={submitMaintenanceAction.bind(null, params.token)} encType="multipart/form-data" style={{ marginBottom: 10 }}>
        <div className="field"><textarea name="detail" placeholder="เช่น แอร์ไม่เย็น / ก๊อกน้ำรั่ว / หลอดไฟเสีย" style={{ minHeight: 60 }} required /></div>
        <div className="field"><label>แนบรูป (ถ้ามี)</label><input type="file" name="photos" multiple accept="image/*" /></div>
        <button className="dbtn sm primary" type="submit">ส่งแจ้งซ่อม</button>
      </form>
      {repairs.length > 0 && (
        <div className="mlist">
          {repairs.map((rp: any, i: number) => (
            <div className="mrow" key={i} style={{ cursor: 'default' }}>
              <span className="mrow-body"><span className="mrow-nm">{rp.detail}</span><span className="mrow-meta">{rp.at} · {RP[rp.status] || rp.status}</span></span>
              <span className={`t ${rp.status === 'done' ? 'sold' : rp.status === 'in_progress' ? 'cat' : rp.status === 'cancelled' ? 'off' : 'season'}`}>{RP[rp.status] || rp.status}</span>
            </div>
          ))}
        </div>
      )}

      <h2 className="rsec"><span className="rsec-ic"><Icon n="feed" size={15} /></span>สัญญา</h2>
      <div className="factgrid">
        {ls.rent_minor != null ? <div className="factitem"><div className="factitem-tx"><div className="factitem-l">ค่าเช่า/เดือน</div><div className="factitem-v">{baht(ls.rent_minor)}</div></div></div> : null}
        {ls.deposit_minor != null ? <div className="factitem"><div className="factitem-tx"><div className="factitem-l">เงินประกัน</div><div className="factitem-v">{baht(ls.deposit_minor)}</div></div></div> : null}
        {ls.billing_day ? <div className="factitem"><div className="factitem-tx"><div className="factitem-l">วันชำระ</div><div className="factitem-v">ทุกวันที่ {ls.billing_day}</div></div></div> : null}
        <div className="factitem"><div className="factitem-tx"><div className="factitem-l">สัญญา</div><div className="factitem-v">{ls.sd}{ls.ed ? ` – ${ls.ed}` : ''}</div></div></div>
      </div>

      <p className="note" style={{ marginTop: 18, fontSize: '.78rem' }}>{ls.pphone ? `สอบถามเจ้าของที่พัก โทร ${ls.pphone} · ` : ''}ค่าน้ำ/ไฟคิดตามหน่วยที่ใช้จริง</p>
    </div>
  );
}
