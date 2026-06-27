import { redirect } from 'next/navigation';
import Link from 'next/link';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { MTopbar } from '../../../MTopbar';
import { Icon } from '../../../ui';
import BookReview from './BookReview';
import { isDate, fmtTh, nightsOf, monthsOf, baht, perTh } from '../avail-utils';

export const dynamic = 'force-dynamic';

// The dedicated booking step. A room + dates are already chosen on หาห้องว่าง; this page re-checks the room is
// still free (narrows the search→confirm race), shows a locked summary + the guest form, and only commits via
// the confirm dialog inside <BookReview>. No money — an operational booking/hold.
export default async function BookPage({ searchParams }: {
  searchParams: { room?: string; from?: string; to?: string; mode?: string; pax?: string };
}) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  if (!acc.manages_stay) redirect('/merchant/rooms');
  const term = acc.room_group_term || 'ชั้น';

  const roomId = searchParams?.room || '';
  const from = isDate(searchParams?.from || '') ? searchParams!.from! : '';
  const to = isDate(searchParams?.to || '') ? searchParams!.to! : '';
  const searchMonthly = searchParams?.mode === 'monthly';
  const pax = Math.max(0, Math.min(20, parseInt(searchParams?.pax || '', 10) || 0));
  const back = `/merchant/units/available?from=${from}&to=${to}${searchMonthly ? '&mode=monthly' : ''}${pax ? `&pax=${pax}` : ''}`;
  if (!roomId || !from || !to || to <= from) redirect(back);

  // re-check THIS one room is still free (same guard as the list) — a clean "เพิ่งถูกจองไป" beats a wasted form
  const [r] = await q<any>(
    `SELECT r.id, r.code, r.floor, r.stay_unit_id,
            su.name_i18n unit_name, su.price_minor, su.price_period,
            su.capacity, su.rental_mode, su.min_stay, su.deposit_minor,
            (NOT EXISTS (SELECT 1 FROM stay_occupancy_block b
               WHERE b.room_id=r.id AND b.status='active' AND b.deleted_at IS NULL
                 AND b.span && daterange($2::date,$3::date,'[)'))
             AND NOT (su.rental_mode <> 'daily' AND r.occupancy_status IS NOT NULL AND r.occupancy_status <> 'vacant'
                      AND (r.occupied_until IS NULL OR r.occupied_until > $2::date))) AS free
       FROM stay_room r LEFT JOIN stay_units su ON su.id=r.stay_unit_id
      WHERE r.id=$1 AND r.place_id=$4 AND r.deleted_at IS NULL AND r.status='active'`,
    [roomId, from, to, acc.place_id]);

  if (!r || !r.free) {
    return (<>
      <MTopbar back={back} backLabel="หาห้องว่าง" title="จองห้อง" />
      <div className="mempty"><span className="mempty-ic"><Icon n="bed" size={26} /></span>
        <p>ห้องนี้เพิ่งถูกจองไป — <Link href={back}>เลือกห้องอื่น</Link></p></div>
    </>);
  }

  const monthly = r.rental_mode === 'monthly';
  const nights = nightsOf(from, to), months = monthsOf(from, to);
  const span = monthly ? months : nights;
  const spanLabel = monthly ? `${months} เดือน` : `${nights} คืน`;
  const priceMinor = r.price_minor != null ? Number(r.price_minor) : null;
  const quoteMinor = priceMinor != null ? priceMinor * span : null;
  const minStay = r.min_stay || 0;
  const cap = r.capacity || null;
  const depositMinor = r.deposit_minor != null ? Number(r.deposit_minor) : 0;
  const depositNote = depositMinor ? `มัดจำ ${baht(depositMinor)} — เก็บตอนเข้าพัก` : '';
  const capWarn = pax > 0 && cap != null && cap < pax;
  const minWarn = minStay > 0 && span < minStay;

  return (<>
    <MTopbar back={back} backLabel="หาห้องว่าง" title={`จองห้อง ${r.code}`} />
    <BookReview
      roomId={r.id} code={r.code}
      unitName={r.unit_name ? i18n(r.unit_name) : 'ไม่ระบุประเภท'}
      floorLabel={r.floor ? `${term} ${r.floor}` : ''}
      from={from} to={to} dateLabel={`${fmtTh(from)} – ${fmtTh(to)}`}
      spanLabel={spanLabel} months={monthly ? months : 0} pax={pax}
      quoteMinor={quoteMinor}
      priceLabel={priceMinor != null ? `${baht(priceMinor)}${perTh(r.price_period || null)}` : ''}
      depositNote={depositNote}
      warn={capWarn ? `เกินจำนวนที่รับได้ (ห้องนี้รับ ${cap} คน)` : minWarn ? `ต่ำกว่าขั้นต่ำ ${minStay} ${monthly ? 'เดือน' : 'คืน'} — จองได้แต่โปรดเช็ค` : ''}
      back={back} />
  </>);
}
