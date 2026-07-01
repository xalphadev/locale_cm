import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q } from '@/lib/db';
import crypto from 'crypto';
import { headers } from 'next/headers';
import { Icon, isUuid } from '../../../ui';
import { MTopbar } from '../../../MTopbar';
import ShareLink from '../../../ShareLink';
import { markInvoicePaidAction, applyLateFeeAction } from '../../../../actions';

export const dynamic = 'force-dynamic';

// Tenant statement / บัญชีลูกหนี้ (0059): a lease's running AR — total billed vs paid vs outstanding, an
// overdue flag, and the full invoice history. Record-only. "+ ค่าปรับ" adds a flat late-fee line to an
// overdue unpaid bill (owner-set policy). Each row links to the printable bill document.
const baht = (m: any) => '฿' + Math.round(Number(m || 0) / 100).toLocaleString();
const INV_ST: Record<string, string> = { draft: 'ร่าง', issued: 'รอชำระ', paid: 'ชำระแล้ว', void: 'ยกเลิก' };

export default async function TenantStatement({ params, searchParams }: { params: { leaseId: string }; searchParams: { ok?: string; error?: string } }) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  if (!acc.manages_stay) redirect('/merchant/rooms');
  const [ls] = isUuid(params.leaseId) ? await q<any>(
    `SELECT l.id, l.rent_minor, l.room_id, l.portal_token, r.code room_code, t.full_name tenant_name, p.utility_rates
       FROM stay_lease l
       JOIN stay_room r ON r.id=l.room_id
       LEFT JOIN stay_tenant t ON t.id=l.tenant_id AND t.deleted_at IS NULL
       JOIN places p ON p.id=l.place_id
      WHERE l.id=$1 AND l.place_id=$2 AND l.deleted_at IS NULL`, [params.leaseId, acc.place_id]) : [];
  if (!ls) return (<MTopbar back="/merchant/bills" backLabel="บิล" title="ไม่พบสัญญา" />);
  const [sm] = await q<any>(
    `SELECT COALESCE(sum(total_minor) FILTER (WHERE status<>'void'),0) billed,
            COALESCE(sum(total_minor) FILTER (WHERE status='paid'),0) paid,
            COALESCE(sum(total_minor) FILTER (WHERE status='issued'),0) outstanding,
            COALESCE(sum(total_minor) FILTER (WHERE status='issued' AND due_date<CURRENT_DATE),0) overdue,
            count(*) FILTER (WHERE status='issued' AND due_date<CURRENT_DATE)::int overdue_n
       FROM stay_invoice WHERE lease_id=$1 AND place_id=$2 AND deleted_at IS NULL`, [ls.id, acc.place_id]);
  const invs = await q<any>(
    `SELECT id, period_ym, to_char(due_date,'DD/MM/YY') due_d, (status='issued' AND due_date<CURRENT_DATE) overdue,
            total_minor, status FROM stay_invoice WHERE lease_id=$1 AND place_id=$2 AND deleted_at IS NULL
      ORDER BY period_ym DESC`, [ls.id, acc.place_id]);
  const lateFee = Number(ls.utility_rates?.late_fee_minor || 0);
  const back = `/merchant/bills/tenant/${ls.id}`;
  // lazy-mint the tenant's private portal link (/my/<token>), race-safe (persist-or-reread)
  let ptoken: string = ls.portal_token;
  if (!ptoken) {
    const cand = crypto.randomBytes(9).toString('hex');
    const [row] = await q<{ portal_token: string }>(`UPDATE stay_lease SET portal_token=$2 WHERE id=$1 AND portal_token IS NULL RETURNING portal_token`, [ls.id, cand]);
    ptoken = row ? row.portal_token : ((await q<{ portal_token: string }>(`SELECT portal_token FROM stay_lease WHERE id=$1`, [ls.id]))[0]?.portal_token || cand);
  }
  const host = headers().get('host') || '';
  const myUrl = `${host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https'}://${host}/my/${ptoken}`;

  return (
    <>
      <MTopbar back="/merchant/bills" backLabel="บิล" title="บัญชีลูกหนี้" />
      {searchParams?.ok === 'paid' && <div className="banner-ok">✓ บันทึกว่าชำระแล้ว</div>}
      {searchParams?.ok === 'latefee' && <div className="banner-ok">✓ เพิ่มค่าปรับในบิลแล้ว</div>}
      {searchParams?.error === 'nolatefee' && <div className="banner-err">ยังไม่ได้ตั้งค่าปรับจ่ายช้า — ตั้งได้ในหน้า “ราคา”</div>}
      {searchParams?.error === 'notoverdue' && <div className="banner-err">บิลนี้ยังไม่เกินกำหนด</div>}

      <div className="dtags" style={{ marginBottom: 12 }}>
        <span className="t cat"><Icon n="chat" size={12} /> {ls.tenant_name || 'ผู้เช่า'}</span>
        <span className="t off">ห้อง {ls.room_code}</span>
        {ls.rent_minor != null && <span className="t season">ค่าเช่า {baht(ls.rent_minor)}/ด</span>}
      </div>

      <div className="paycard" style={{ marginBottom: 12 }}>
        <ShareLink url={myUrl} label="ลิงก์ของผู้เช่า (หน้าของฉัน — ดูบิล/ค่าน้ำไฟ/จ่ายเงิน) · ส่งให้ผู้เช่าทาง LINE" />
      </div>

      <div className="bk-summary">
        <div className="bk-sum-stats">
          <div className="bk-stat"><span className={`bk-stat-n ${(sm?.outstanding || 0) > 0 ? 'bk-amber' : ''}`}>{baht(sm?.outstanding)}</span><span className="bk-stat-l">ค้างชำระ</span></div>
          <div className="bk-stat"><span className="bk-stat-n">{baht(sm?.paid)}</span><span className="bk-stat-l">ชำระแล้ว</span></div>
          <div className="bk-stat"><span className="bk-stat-n">{baht(sm?.billed)}</span><span className="bk-stat-l">ออกบิลรวม</span></div>
        </div>
        {(sm?.overdue_n || 0) > 0 && <p className="note" style={{ margin: '4px 0 0', color: '#d92d20' }}>⚠ เกินกำหนด {sm.overdue_n} บิล · {baht(sm.overdue)}</p>}
      </div>

      {invs.length === 0 ? <p className="note">ยังไม่มีบิล</p> : (
        <div className="mlist">
          {invs.map((iv: any) => (
            <div className="mrow" key={iv.id} style={{ cursor: 'default' }}>
              <Link href={`/merchant/bills/${iv.id}`} className="mrow-body" style={{ textDecoration: 'none', color: 'inherit' }}>
                <span className="mrow-nm">{iv.period_ym} · {baht(iv.total_minor)}{iv.overdue ? ' · เกินกำหนด' : ''}</span>
                <span className="mrow-meta">ครบกำหนด {iv.due_d} · {INV_ST[iv.status] || iv.status}</span>
              </Link>
              {iv.status === 'issued' ? (
                <div className="lead-acts">
                  {iv.overdue && lateFee > 0 && <form action={applyLateFeeAction.bind(null, iv.id)}><input type="hidden" name="back" value={back} /><button className="dbtn sm" type="submit">+ ค่าปรับ</button></form>}
                  <form action={markInvoicePaidAction.bind(null, iv.id)}><input type="hidden" name="back" value={back} /><button className="dbtn sm primary" type="submit"><Icon n="check" size={14} /> จ่ายแล้ว</button></form>
                </div>
              ) : iv.status === 'paid' ? <span className="t sold">ชำระแล้ว</span> : null}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
