import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { Icon } from '../ui';
import { ConfirmSubmit } from '../ConfirmSubmit';
import { RoomHub } from '../rooms/RoomHub';
import { setLeadStatusAction, scheduleLeadAction, markNoShowAction, deleteLeadAction, convertLeadToBlockAction, convertMonthlyLeadAction, cancelBookingAction, checkInAction, checkOutAction } from '../../actions';

export const dynamic = 'force-dynamic';

// "ระบบจองห้อง" — the unified booking menu. ONE home for a reservation's whole life: the marketplace
// lead inbox (stay_booking_request, 0034) PLUS the confirmed booking (an anonymous occupancy block,
// 0033, linked via converted_block_id). Still NO money: a row is a request/booking to be managed, never
// a paid reservation. This page is reservation-LENSED (ต้องทำ / วันนี้ / จะมาถึง / กำลังพัก / …) over the
// same spine the old /merchant/leads inbox read; /merchant/leads now redirects here.
const KIND_TH: Record<string, string> = { viewing: 'นัดดูห้อง', booking: 'ขอจอง', enquiry: 'สอบถาม' };
const CH_TH: Record<string, string> = { walk_in: 'Walk-in', phone: 'โทร', line: 'ไลน์' };
// 'confirmed' is ADVISORY (agreed by phone, room NOT held) vs 'converted' (block exists, room held) —
// labels keep that distinction explicit so an owner never reads "ยืนยัน" as "room is locked".
const ST: Record<string, { cls: string; label: string }> = {
  new: { cls: 'season', label: 'ใหม่' },
  contacted: { cls: 'cat', label: 'ติดต่อแล้ว' },
  scheduled: { cls: 'cat', label: 'นัดแล้ว' },
  confirmed: { cls: 'cat', label: 'ตกลงแล้ว · ยังไม่กันห้อง' },
  declined: { cls: 'off', label: 'ปฏิเสธ' },
  expired: { cls: 'off', label: 'หมดอายุ' },
  converted: { cls: 'sold', label: 'จองในปฏิทินแล้ว' },
  no_show: { cls: 'off', label: 'ไม่มาเข้าพัก' },
  cancelled: { cls: 'off', label: 'ยกเลิกแล้ว' },
};
const fmtDate = (d: any) => (d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : '');
const fmtDT = (d: any) => (d ? new Date(d).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
const ago = (ts: any) => { const x = Math.floor((Date.now() - new Date(ts).getTime()) / 86400000); return x <= 0 ? 'วันนี้' : x === 1 ? 'เมื่อวาน' : `${x} วันก่อน`; };
const lineHref = (id: string) => `https://line.me/R/ti/p/~${String(id).trim().replace(/^@/, '')}`;
// pg returns date/timestamptz as JS Date — format with LOCAL getters (see memory) to a comparable YYYY-MM-DD.
const ymd = (d: any) => { if (!d) return ''; const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };

// reservation lenses — derived from (status, dates) on the current schema, NO new columns (P0).
const LENSES: { key: string; label: string }[] = [
  { key: 'todo', label: 'ต้องทำ' },
  { key: 'today', label: 'วันนี้' },
  { key: 'upcoming', label: 'จะมาถึง' },
  { key: 'inhouse', label: 'กำลังพัก' },
  { key: 'new', label: 'คำขอใหม่' },
  { key: 'all', label: 'ทั้งหมด' },
];

export default async function Bookings({ searchParams }: { searchParams: { ok?: string; error?: string; lens?: string; q?: string } }) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  if (!acc.manages_stay) redirect('/merchant');   // การจอง belongs to ระบบการจอง (manages_stay)

  const lens = LENSES.some((l) => l.key === searchParams?.lens) ? searchParams!.lens! : 'todo';
  const qtext = String(searchParams?.q || '').slice(0, 40).trim();
  const where = ['b.place_id=$1', 'b.deleted_at IS NULL']; const params: any[] = [acc.place_id];
  if (qtext) { params.push('%' + qtext + '%'); where.push(`(b.contact_name ILIKE $${params.length} OR b.contact_phone ILIKE $${params.length} OR r.code ILIKE $${params.length})`); }
  // BookingView: spine LEFT JOIN block + room so daily (block-backed) and monthly/unmanaged (desired_* only)
  // read identically; COALESCE(block dates, desired_*) is the unified span. PII keeps its 60-day redaction.
  const rows = await q<any>(
    `SELECT b.id, b.stay_unit_id, b.request_kind, b.rental_mode, b.desired_months, b.channel,
            COALESCE(bk.start_date, b.desired_from) AS from_d,
            COALESCE(bk.end_date, b.desired_to) AS to_d,
            CASE WHEN b.expires_at < now() AND b.status <> 'converted' THEN NULL ELSE b.contact_name END contact_name,
            CASE WHEN b.expires_at < now() AND b.status <> 'converted' THEN NULL ELSE b.contact_phone END contact_phone,
            CASE WHEN b.expires_at < now() AND b.status <> 'converted' THEN NULL ELSE b.contact_line END contact_line,
            CASE WHEN b.expires_at < now() AND b.status <> 'converted' THEN NULL ELSE b.message END message,
            (b.expires_at < now() AND b.status <> 'converted') expired_pii,
            b.status, b.scheduled_at, b.created_at, b.converted_block_id, b.checked_in_at, b.checked_out_at, b.payment_status, b.amount_minor, su.name_i18n unit_name, su.managed, r.code AS room_code
       FROM stay_booking_request b
       LEFT JOIN stay_units su ON su.id = b.stay_unit_id
       LEFT JOIN stay_occupancy_block bk ON bk.id = b.converted_block_id AND bk.deleted_at IS NULL
       LEFT JOIN stay_room r ON r.id = COALESCE(bk.room_id, b.room_id)
      WHERE ${where.join(' AND ')}
      ORDER BY (b.status='new') DESC, COALESCE(bk.start_date, b.desired_from, b.created_at::date) ASC, b.created_at DESC
      LIMIT 200`, params);

  const today = ymd(new Date());
  // per-row derived flags (reservation classification on the current schema)
  const tag = (b: any) => {
    const f = ymd(b.from_d), t = ymd(b.to_d);
    const checkedIn = !!b.checked_in_at && !b.checked_out_at;   // really staying now (real status, not date-derived)
    const checkedOut = !!b.checked_out_at;
    const arrival = b.status === 'converted' && !checkedIn && !checkedOut && f === today;       // due to arrive today
    const departure = b.status === 'converted' && !checkedOut && !!t && t === today;            // due to leave today
    const inhouse = checkedIn;
    const upcoming = b.status === 'converted' && !checkedIn && !checkedOut && !!f && f > today;  // future arrival
    const past = checkedOut || (b.status === 'converted' && !checkedIn && !!t && t < today);     // settled
    return { arrival, departure, inhouse, upcoming, checkedIn, checkedOut, past };
  };
  const inLens = (b: any) => {
    const g = tag(b);
    switch (lens) {
      case 'today': return g.arrival || g.departure || g.inhouse;
      case 'upcoming': return g.upcoming;
      case 'inhouse': return g.inhouse;
      case 'new': return b.status === 'new';
      case 'all': return true;
      default: // 'todo' — open leads + active/upcoming stays; hide settled (declined/expired/no_show/cancelled/checked-out)
        return !['declined', 'expired', 'no_show', 'cancelled'].includes(b.status) && !g.past;
    }
  };
  const shown = rows.filter(inLens);
  const newN = rows.filter((r) => r.status === 'new').length;
  const hrefL = (k: string) => { const u = new URLSearchParams(); if (k && k !== 'todo') u.set('lens', k); if (qtext) u.set('q', qtext); const qs = u.toString(); return qs ? `/merchant/bookings?${qs}` : '/merchant/bookings'; };

  return (
    <>
      <RoomHub active="bookings" title="การจอง" addHref={acc.manages_stay ? '/merchant/bookings/new' : undefined} addLabel="เพิ่มจองเอง" />

      {searchParams?.ok === 'converted' && <div className="banner-ok">✓ ยืนยันการจองแล้ว — กันห้องตามวันที่ขอในปฏิทิน</div>}
      {searchParams?.ok === 'converted_m' && <div className="banner-ok">✓ รับเข้าพักแล้ว — ตั้งห้องเป็นไม่ว่าง / ปรับจำนวนว่าง</div>}
      {searchParams?.ok === 'scheduled' && <div className="banner-ok">✓ บันทึกนัดหมายแล้ว — ลูกค้าเห็นเวลานัดในแอป</div>}
      {searchParams?.ok === 'noshow' && <div className="banner-ok">✓ บันทึกไม่มาเข้าพัก — ปล่อยห้องคืนให้จองใหม่ได้แล้ว</div>}
      {searchParams?.ok === 'cancelled' && <div className="banner-ok">✓ ยกเลิกการจองแล้ว — ปล่อยห้องคืนให้ว่างแล้ว</div>}
      {searchParams?.ok === 'created' && <div className="banner-ok">✓ เพิ่มการจองแล้ว — กันห้องในปฏิทินเรียบร้อย</div>}
      {searchParams?.ok === 'checkin' && <div className="banner-ok">✓ เช็คอินแล้ว</div>}
      {searchParams?.ok === 'checkout' && <div className="banner-ok">✓ เช็คเอาท์แล้ว — ปล่อยห้องคืนให้ว่างแล้ว</div>}
      {searchParams?.error === 'full' && <div className="banner-err">ไม่มีห้องว่างในช่วงที่ขอ — เลือกห้อง/วันอื่น หรือบล็อกเองในผังห้อง</div>}
      {searchParams?.error === 'cvt' && <div className="banner-err">คำขอนี้ไม่มีวันที่ หรือไม่ใช่ห้องรายวันที่ผูกผัง จึงลงปฏิทินอัตโนมัติไม่ได้</div>}

      <div className="leadfilter bk-lenses">
        {LENSES.map((l) => <a key={l.key} href={hrefL(l.key)} className={lens === l.key ? 'on' : ''}>{l.label}{l.key === 'new' && newN > 0 ? ` ${newN}` : ''}</a>)}
      </div>
      <form className="leadsearch" action="/merchant/bookings" method="get">
        {lens !== 'todo' && <input type="hidden" name="lens" value={lens} />}
        <input name="q" defaultValue={qtext} placeholder="ค้นหา ชื่อ / เบอร์ / ห้อง" />
        <button type="submit" className="dbtn sm">ค้นหา</button>
        {qtext && <a className="dbtn sm" href={hrefL(lens)}>ล้าง</a>}
      </form>

      {shown.length === 0 ? (
        <div className="mempty"><span className="mempty-ic"><Icon n="chat" size={30} /></span><p>{qtext ? 'ไม่พบการจองที่ตรงคำค้น' : lens === 'todo' ? 'ไม่มีรายการที่ต้องทำ — เคลียร์หมดแล้ว 🎉' : 'ยังไม่มีรายการในมุมมองนี้'}</p></div>
      ) : (
        <div className="leadlist">
          {shown.map((b) => {
            const st = ST[b.status] || ST.new;
            const g = tag(b);
            const dates = b.from_d
              ? `${fmtDate(b.from_d)}${b.rental_mode === 'monthly' && b.desired_months ? ` · ${b.desired_months} เดือน` : b.to_d ? `–${fmtDate(b.to_d)}` : ''}`
              : '';
            return (
              <div className={`leadcard ${b.status === 'new' ? 'fresh' : ''}`} key={b.id}>
                <Link href={`/merchant/bookings/${b.id}`} className="lead-top bk-link">
                  <span className="lead-nm">{b.contact_name || 'ผู้สนใจ'}</span>
                  <span className="bk-badges">
                    {b.payment_status === 'submitted' && <span className="t warn"><Icon n="wallet" size={11} /> รอตรวจสลิป</span>}
                    {g.checkedIn && <span className="t season">กำลังเข้าพัก</span>}
                    {g.arrival && <span className="t season">เข้าวันนี้</span>}
                    {g.departure && <span className="t cat">ออกวันนี้</span>}
                    <span className={`t ${st.cls}`}>{st.label}</span>
                  </span>
                </Link>
                <div className="lead-meta">
                  {KIND_TH[b.request_kind] || 'สอบถาม'}{b.channel && CH_TH[b.channel] ? ` · ${CH_TH[b.channel]}` : ''}{b.unit_name ? ` · ${i18n(b.unit_name)}` : ''}{b.room_code ? ` · ห้อง ${b.room_code}` : ''}{dates ? ` · ${dates}` : ''} · {ago(b.created_at)}
                </div>
                {b.status === 'scheduled' && b.scheduled_at && <div className="lead-sched"><Icon n="calendar" size={13} /> นัดดูห้อง: {fmtDT(b.scheduled_at)}</div>}
                {b.message && <div className="lead-msg">“{b.message}”</div>}
                {b.expired_pii && <p className="note" style={{ margin: '4px 0 0' }}>ข้อมูลติดต่อถูกลบอัตโนมัติตามนโยบายความเป็นส่วนตัว (เกิน 60 วัน)</p>}
                <div className="lead-contact">
                  {b.contact_phone && <a className="dbtn sm" href={`tel:${b.contact_phone}`}><Icon n="chat" size={14} /> โทร {b.contact_phone}</a>}
                  {b.contact_line && <a className="dbtn sm" href={lineHref(b.contact_line)} target="_blank" rel="noopener"><Icon n="chat" size={14} /> ไลน์ {b.contact_line}</a>}
                </div>
                <div className="lead-acts">
                  {b.managed && b.rental_mode === 'daily' && b.from_d && b.to_d && b.status !== 'converted' && b.status !== 'declined' &&
                    <form action={convertLeadToBlockAction.bind(null, b.id)}><button className="dbtn sm primary" type="submit"><Icon n="calendar" size={14} /> ยืนยันการจอง</button></form>}
                  {b.rental_mode === 'monthly' && b.stay_unit_id && b.status !== 'converted' && b.status !== 'declined' &&
                    <form action={convertMonthlyLeadAction.bind(null, b.id)}><ConfirmSubmit message="รับลูกค้าเข้าพักรายเดือนและตั้งห้องเป็นไม่ว่าง? จำนวนห้องว่างจะลดลง (แก้ไขได้จากผังห้อง)" className="dbtn sm primary"><Icon n="calendar" size={14} /> รับเข้าพัก</ConfirmSubmit></form>}
                  {b.status === 'converted' && b.converted_block_id && !b.checked_in_at && !b.checked_out_at && <form action={checkInAction.bind(null, b.id)}><button className="dbtn sm primary" type="submit"><Icon n="check" size={14} /> เช็คอิน</button></form>}
                  {b.checked_in_at && !b.checked_out_at && <form action={checkOutAction.bind(null, b.id)}><ConfirmSubmit message="เช็คเอาท์ผู้เข้าพักนี้? ห้องจะถูกปล่อยคืนให้ว่างทันที" className="dbtn sm primary"><Icon n="check" size={14} /> เช็คเอาท์</ConfirmSubmit></form>}
                  {b.status === 'converted' && b.rental_mode === 'daily' && !b.checked_in_at && <form action={markNoShowAction.bind(null, b.id)}><ConfirmSubmit message="บันทึกว่าลูกค้าไม่มาเข้าพัก? ห้องที่กันไว้จะถูกปล่อยคืนให้จองใหม่ได้ทันที" className="dbtn sm">ไม่มาเข้าพัก</ConfirmSubmit></form>}
                  {b.status === 'converted' && b.rental_mode === 'monthly' && !b.checked_out_at && <form action={cancelBookingAction.bind(null, b.id)}><ConfirmSubmit message="ยกเลิกการเข้าพักรายเดือนนี้? ห้องจะถูกปล่อยคืนให้ว่างทันที" className="dbtn sm">ยกเลิกการเข้าพัก</ConfirmSubmit></form>}
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
                  {b.status !== 'confirmed' && b.status !== 'converted' && b.status !== 'declined' && <form action={setLeadStatusAction.bind(null, b.id, 'confirmed')}><button className="dbtn sm" type="submit">ตกลง (ยังไม่กันห้อง)</button></form>}
                  {b.status !== 'declined' && <form action={setLeadStatusAction.bind(null, b.id, 'declined')}><button className="dbtn sm" type="submit">ปฏิเสธ</button></form>}
                  <form action={deleteLeadAction.bind(null, b.id)}><ConfirmSubmit message="ลบคำขอจองนี้? ข้อมูลติดต่อของลูกค้า (เบอร์/LINE) จะหายจากกล่องคำขอ — กู้คืนเองไม่ได้" className="dbtn sm danger" aria-label="ลบ"><Icon n="trash" size={14} /></ConfirmSubmit></form>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
