import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { Icon } from '../ui';
import { setLeadStatusAction, scheduleLeadAction, markNoShowAction, deleteLeadAction, convertLeadToBlockAction, convertMonthlyLeadAction } from '../../actions';

export const dynamic = 'force-dynamic';

// "คำขอจอง" — the marketplace booking/viewing lead inbox (0034). NO money: each row is a request to
// be contacted, never a paid reservation. The owner calls / LINEs the customer back directly.
const KIND_TH: Record<string, string> = { viewing: 'นัดดูห้อง', booking: 'ขอจอง', enquiry: 'สอบถาม' };
const ST: Record<string, { cls: string; label: string }> = {
  new: { cls: 'season', label: 'ใหม่' },
  contacted: { cls: 'cat', label: 'ติดต่อแล้ว' },
  scheduled: { cls: 'cat', label: 'นัดแล้ว' },
  confirmed: { cls: 'sold', label: 'ยืนยันแล้ว' },
  declined: { cls: 'off', label: 'ปฏิเสธ' },
  expired: { cls: 'off', label: 'หมดอายุ' },
  converted: { cls: 'sold', label: 'เข้าพักแล้ว' },
  no_show: { cls: 'off', label: 'ไม่มาเข้าพัก' },
};
const fmtDate = (d: any) => (d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : '');
const fmtDT = (d: any) => (d ? new Date(d).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
const FILTERS: [string, string][] = [['', 'ทั้งหมด'], ['new', 'ใหม่'], ['contacted', 'ติดต่อแล้ว'], ['scheduled', 'นัดแล้ว'], ['confirmed', 'ยืนยัน'], ['converted', 'เข้าพักแล้ว'], ['declined', 'ปฏิเสธ']];
const ago = (ts: any) => { const x = Math.floor((Date.now() - new Date(ts).getTime()) / 86400000); return x <= 0 ? 'วันนี้' : x === 1 ? 'เมื่อวาน' : `${x} วันก่อน`; };
const lineHref = (id: string) => `https://line.me/R/ti/p/~${String(id).trim().replace(/^@/, '')}`;

export default async function Leads({ searchParams }: { searchParams: { ok?: string; error?: string; status?: string; q?: string } }) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  if (!acc.offers_stay && !acc.manages_stay) redirect('/merchant');

  // filters (gap: the inbox was unfilterable + capped) — status chip + name/phone search
  const fstatus = FILTERS.some(([k]) => k && k === searchParams?.status) ? searchParams!.status! : '';
  const qtext = String(searchParams?.q || '').slice(0, 40).trim();
  const where = ['b.place_id=$1', 'b.deleted_at IS NULL']; const params: any[] = [acc.place_id];
  if (fstatus) { params.push(fstatus); where.push(`b.status=$${params.length}`); }
  if (qtext) { params.push('%' + qtext + '%'); where.push(`(b.contact_name ILIKE $${params.length} OR b.contact_phone ILIKE $${params.length})`); }
  const rows = await q<any>(
    `SELECT b.id, b.stay_unit_id, b.request_kind, b.rental_mode, b.desired_from, b.desired_to, b.desired_months,
            CASE WHEN b.expires_at < now() AND b.status <> 'converted' THEN NULL ELSE b.contact_name END contact_name,
            CASE WHEN b.expires_at < now() AND b.status <> 'converted' THEN NULL ELSE b.contact_phone END contact_phone,
            CASE WHEN b.expires_at < now() AND b.status <> 'converted' THEN NULL ELSE b.contact_line END contact_line,
            CASE WHEN b.expires_at < now() AND b.status <> 'converted' THEN NULL ELSE b.message END message,
            (b.expires_at < now() AND b.status <> 'converted') expired_pii,
            b.status, b.scheduled_at, b.created_at, su.name_i18n unit_name, su.managed
       FROM stay_booking_request b LEFT JOIN stay_units su ON su.id = b.stay_unit_id
      WHERE ${where.join(' AND ')}
      ORDER BY (b.status='new') DESC, b.created_at DESC LIMIT 100`, params);
  const newN = rows.filter((r) => r.status === 'new').length;
  const hrefF = (k: string) => { const u = new URLSearchParams(); if (k) u.set('status', k); if (qtext) u.set('q', qtext); const qs = u.toString(); return qs ? `/merchant/leads?${qs}` : '/merchant/leads'; };

  return (
    <>
      <div className="listhead">
        <h1>คำขอจอง <span className="listcount">{rows.length}</span></h1>
        {newN > 0 && <span className="t season">ใหม่ {newN}</span>}
      </div>
      <p className="note">ลูกค้ากด “ขอให้ติดต่อกลับ / นัดดูห้อง” จากหน้าที่พัก จะมาที่นี่ — โทรหรือทักไลน์กลับได้เลย (ไม่มีการชำระเงินผ่านแอป)</p>
      {searchParams?.ok === 'converted' && <div className="banner-ok">✓ ยืนยันการจองแล้ว — กันห้องตามวันที่ขอในปฏิทิน</div>}
      {searchParams?.ok === 'converted_m' && <div className="banner-ok">✓ รับเข้าพักแล้ว — ตั้งห้องเป็นไม่ว่าง / ปรับจำนวนว่าง</div>}
      {searchParams?.ok === 'scheduled' && <div className="banner-ok">✓ บันทึกนัดหมายแล้ว — ลูกค้าเห็นเวลานัดในแอป</div>}
      {searchParams?.ok === 'noshow' && <div className="banner-ok">✓ บันทึกไม่มาเข้าพัก — ปล่อยห้องคืนให้จองใหม่ได้แล้ว</div>}
      {searchParams?.error === 'full' && <div className="banner-err">ไม่มีห้องว่างในช่วงที่ขอ — เลือกห้อง/วันอื่น หรือบล็อกเองในผังห้อง</div>}
      {searchParams?.error === 'cvt' && <div className="banner-err">คำขอนี้ไม่มีวันที่ หรือไม่ใช่ห้องรายวันที่ผูกผัง จึงลงปฏิทินอัตโนมัติไม่ได้</div>}

      <div className="leadfilter">
        {FILTERS.map(([k, l]) => <a key={k || 'all'} href={hrefF(k)} className={fstatus === k ? 'on' : ''}>{l}</a>)}
      </div>
      <form className="leadsearch" action="/merchant/leads" method="get">
        {fstatus && <input type="hidden" name="status" value={fstatus} />}
        <input name="q" defaultValue={qtext} placeholder="ค้นหาชื่อ / เบอร์โทร" />
        <button type="submit" className="dbtn sm">ค้นหา</button>
        {qtext && <a className="dbtn sm" href={hrefF(fstatus)}>ล้าง</a>}
      </form>

      {rows.length === 0 ? (
        <div className="mempty"><span className="mempty-ic"><Icon n="chat" size={30} /></span><p>{fstatus || qtext ? 'ไม่พบคำขอที่ตรงตัวกรอง' : 'ยังไม่มีคำขอจอง'}</p></div>
      ) : (
        <div className="leadlist">
          {rows.map((b) => {
            const st = ST[b.status] || ST.new;
            const dates = b.desired_from
              ? `${fmtDate(b.desired_from)}${b.rental_mode === 'monthly' && b.desired_months ? ` · ${b.desired_months} เดือน` : b.desired_to ? `–${fmtDate(b.desired_to)}` : ''}`
              : '';
            return (
              <div className={`leadcard ${b.status === 'new' ? 'fresh' : ''}`} key={b.id}>
                <div className="lead-top">
                  <span className="lead-nm">{b.contact_name || 'ผู้สนใจ'}</span>
                  <span className={`t ${st.cls}`}>{st.label}</span>
                </div>
                <div className="lead-meta">
                  {KIND_TH[b.request_kind] || 'สอบถาม'}{b.unit_name ? ` · ${i18n(b.unit_name)}` : ''}{dates ? ` · ${dates}` : ''} · {ago(b.created_at)}
                </div>
                {b.status === 'scheduled' && b.scheduled_at && <div className="lead-sched"><Icon n="calendar" size={13} /> นัดดูห้อง: {fmtDT(b.scheduled_at)}</div>}
                {b.message && <div className="lead-msg">“{b.message}”</div>}
                {b.expired_pii && <p className="note" style={{ margin: '4px 0 0' }}>ข้อมูลติดต่อถูกลบอัตโนมัติตามนโยบายความเป็นส่วนตัว (เกิน 60 วัน)</p>}
                <div className="lead-contact">
                  {b.contact_phone && <a className="dbtn sm" href={`tel:${b.contact_phone}`}><Icon n="chat" size={14} /> โทร {b.contact_phone}</a>}
                  {b.contact_line && <a className="dbtn sm" href={lineHref(b.contact_line)} target="_blank" rel="noopener"><Icon n="chat" size={14} /> ไลน์ {b.contact_line}</a>}
                </div>
                <div className="lead-acts">
                  {b.managed && b.rental_mode === 'daily' && b.desired_from && b.desired_to && b.status !== 'converted' && b.status !== 'declined' &&
                    <form action={convertLeadToBlockAction.bind(null, b.id)}><button className="dbtn sm primary" type="submit"><Icon n="calendar" size={14} /> ยืนยันการจอง</button></form>}
                  {b.rental_mode === 'monthly' && b.stay_unit_id && b.status !== 'converted' && b.status !== 'declined' &&
                    <form action={convertMonthlyLeadAction.bind(null, b.id)}><button className="dbtn sm primary" type="submit"><Icon n="calendar" size={14} /> รับเข้าพัก</button></form>}
                  {b.status === 'converted' && <form action={markNoShowAction.bind(null, b.id)}><button className="dbtn sm" type="submit">ไม่มาเข้าพัก</button></form>}
                  {b.status === 'new' && <form action={setLeadStatusAction.bind(null, b.id, 'contacted')}><button className="dbtn sm" type="submit">ติดต่อแล้ว</button></form>}
                  {b.status !== 'converted' && b.status !== 'declined' && (
                    <details className="lead-sched-f">
                      <summary className="dbtn sm"><Icon n="calendar" size={14} /> นัด</summary>
                      <form action={scheduleLeadAction.bind(null, b.id)}>
                        <input type="datetime-local" name="scheduled_at" required />
                        <button className="dbtn sm primary" type="submit">บันทึกนัด</button>
                      </form>
                    </details>
                  )}
                  {b.status !== 'confirmed' && b.status !== 'declined' && <form action={setLeadStatusAction.bind(null, b.id, 'confirmed')}><button className="dbtn sm primary" type="submit">ยืนยัน</button></form>}
                  {b.status !== 'declined' && <form action={setLeadStatusAction.bind(null, b.id, 'declined')}><button className="dbtn sm" type="submit">ปฏิเสธ</button></form>}
                  <form action={deleteLeadAction.bind(null, b.id)}><button className="dbtn sm danger" type="submit" aria-label="ลบ"><Icon n="trash" size={14} /></button></form>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
