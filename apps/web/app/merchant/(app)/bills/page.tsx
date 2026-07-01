import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q } from '@/lib/db';
import { Icon } from '../ui';
import { MTopbar } from '../MTopbar';
import { generateAllInvoicesAction, markInvoicePaidAction } from '../../actions';

export const dynamic = 'force-dynamic';

// Bills hub (0059): every monthly rent+utility invoice across the property, one place to see who owes and to
// mark paid — plus "ออกบิลทั้งหอเดือนนี้" (batch-generate this month for every active lease). Record-only:
// marking paid records the owner collected offline; the platform never holds funds. Monthly-mode only.
const INV_ST: Record<string, string> = { draft: 'ร่าง', issued: 'รอชำระ', paid: 'ชำระแล้ว', void: 'ยกเลิก' };
const baht = (m: any) => '฿' + Math.round(Number(m || 0) / 100).toLocaleString();
const FILTERS = [{ k: 'unpaid', label: 'รอชำระ' }, { k: 'paid', label: 'ชำระแล้ว' }, { k: 'all', label: 'ทั้งหมด' }];

export default async function Bills({ searchParams }: { searchParams: { f?: string; ok?: string; made?: string; existing?: string; norent?: string; nometer?: string } }) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  if (!acc.manages_stay) redirect('/merchant/rooms');
  if (acc.stay_mode === 'nightly') redirect('/merchant/stay');   // monthly billing only

  const f = ['unpaid', 'paid', 'all'].includes(searchParams?.f || '') ? searchParams!.f! : 'unpaid';
  const cond = f === 'paid' ? `i.status='paid'` : f === 'all' ? `i.status<>'void'` : `i.status='issued'`;
  const [sum] = await q<any>(
    `SELECT count(*) FILTER (WHERE status='issued')::int unpaid_n,
            COALESCE(sum(total_minor) FILTER (WHERE status='issued'),0) unpaid_sum,
            count(*) FILTER (WHERE status='paid')::int paid_n
       FROM stay_invoice WHERE place_id=$1 AND deleted_at IS NULL`, [acc.place_id]);
  const invoices = await q<any>(
    `SELECT i.id, i.period_ym, to_char(i.due_date,'DD/MM/YY') due_d, i.total_minor, i.status,
            r.id room_id, r.code room_code, t.full_name tenant_name
       FROM stay_invoice i
       JOIN stay_room r ON r.id=i.room_id
       LEFT JOIN stay_tenant t ON t.id=i.tenant_id AND t.deleted_at IS NULL
      WHERE i.place_id=$1 AND i.deleted_at IS NULL AND ${cond}
      ORDER BY (i.status='issued') DESC, i.due_date, i.period_ym DESC LIMIT 200`, [acc.place_id]);

  const made = parseInt(searchParams?.made || '', 10) || 0;
  const existing = parseInt(searchParams?.existing || '', 10) || 0;
  const norent = parseInt(searchParams?.norent || '', 10) || 0;
  const nometer = parseInt(searchParams?.nometer || '', 10) || 0;

  return (
    <>
      <MTopbar back="/merchant/stay" backLabel="ห้องพัก" title="บิล / ใบแจ้งหนี้" />

      {searchParams?.ok === 'batch' && <div className="banner-ok">✓ ออกบิลเดือนนี้ {made} ใบ{existing ? ` · ข้ามที่มีอยู่แล้ว ${existing}` : ''}{norent ? ` · ยังไม่ตั้งค่าเช่า ${norent}` : ''}{nometer ? ` · บางใบยังไม่รวมค่าน้ำ/ไฟ (มิเตอร์ไม่ครบ) ${nometer}` : ''}</div>}
      {searchParams?.ok === 'paid' && <div className="banner-ok">✓ บันทึกว่าชำระแล้ว</div>}

      <div className="bk-summary">
        <div className="bk-sum-stats">
          <div className="bk-stat"><span className={`bk-stat-n ${(sum?.unpaid_n || 0) > 0 ? 'bk-amber' : ''}`}>{sum?.unpaid_n || 0}</span><span className="bk-stat-l">บิลรอชำระ</span></div>
          <div className="bk-stat"><span className="bk-stat-n">{baht(sum?.unpaid_sum)}</span><span className="bk-stat-l">ยอดค้างรวม</span></div>
          <div className="bk-stat"><span className="bk-stat-n">{sum?.paid_n || 0}</span><span className="bk-stat-l">ชำระแล้ว</span></div>
        </div>
      </div>

      <form action={generateAllInvoicesAction} style={{ margin: '4px 0 12px' }}>
        <button className="dbtn primary" type="submit"><Icon n="plus" size={16} /> ออกบิลทั้งหอ (เดือนนี้)</button>
        <p className="note" style={{ margin: '6px 0 0' }}>สร้างบิลเดือนนี้ให้ทุกสัญญาที่ตั้งค่าเช่าแล้ว · ห้องที่ออกบิลเดือนนี้ไปแล้วจะถูกข้าม · ค่าน้ำ/ไฟคิดจากมิเตอร์ที่จดไว้</p>
      </form>

      <div className="segtabs">
        {FILTERS.map((t) => <Link key={t.k} href={`/merchant/bills?f=${t.k}`} className={`segtab ${f === t.k ? 'on' : ''}`}>{t.label}</Link>)}
      </div>

      {invoices.length === 0 ? (
        <p className="note">{f === 'unpaid' ? 'ไม่มีบิลค้างชำระ 🎉' : 'ยังไม่มีบิลในหมวดนี้'}</p>
      ) : (
        <div className="mlist">
          {invoices.map((iv) => (
            <div className="mrow" key={iv.id} style={{ cursor: 'default' }}>
              <Link href={`/merchant/bills/${iv.id}`} className="mrow-body" style={{ textDecoration: 'none', color: 'inherit' }}>
                <span className="mrow-nm">ห้อง {iv.room_code} · {iv.tenant_name || 'ผู้เช่า'}</span>
                <span className="mrow-meta">{iv.period_ym} · {baht(iv.total_minor)} · ครบกำหนด {iv.due_d} · {INV_ST[iv.status] || iv.status}</span>
              </Link>
              {iv.status === 'issued'
                ? <form action={markInvoicePaidAction.bind(null, iv.id)}><input type="hidden" name="back" value="/merchant/bills" /><button className="dbtn sm primary" type="submit"><Icon n="check" size={14} /> จ่ายแล้ว</button></form>
                : iv.status === 'paid' ? <span className="t sold">ชำระแล้ว</span> : null}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
