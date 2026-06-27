import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q } from '@/lib/db';
import { Icon } from '../ui';
import { MTopbar } from '../MTopbar';

export const dynamic = 'force-dynamic';

// Revenue & occupancy dashboard (competitor-parity, no money held). Revenue = the amounts the host VERIFIED
// from uploaded slips this month (host-direct transfers). Occupancy = booked room-nights ÷ capacity. ADR =
// revenue ÷ room-nights. Plus today's check-in/out/in-house and a 14-day bookings bar chart.
const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const baht = (m: number) => `฿${Math.round(m / 100).toLocaleString('th-TH')}`;

export default async function Revenue({ searchParams }: { searchParams: { month?: string } }) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  if (!acc.manages_stay) redirect('/merchant');   // รายได้ comes from bookings — ระบบการจอง (manages_stay)
  const pid = acc.place_id;

  // selected month (?month=YYYY-MM, default current) — drives the financial summary; today + chart stay live
  const now = new Date();
  const mre = /^(\d{4})-(\d{2})$/.exec(searchParams?.month || '');
  const year = mre ? +mre[1] : now.getFullYear();
  const mon = mre ? Math.min(11, Math.max(0, +mre[2] - 1)) : now.getMonth();   // 0-11
  const fmtM = (y: number, mo: number) => `${y}-${String(mo + 1).padStart(2, '0')}`;
  const mStart = `${fmtM(year, mon)}-01`;
  const prev = fmtM(mon === 0 ? year - 1 : year, (mon + 11) % 12);
  const next = fmtM(mon === 11 ? year + 1 : year, (mon + 1) % 12);
  const isCurrent = year === now.getFullYear() && mon === now.getMonth();

  const [m] = await q<any>(
    `SELECT count(*)::int bookings,
            COALESCE(SUM(paid_minor),0)::bigint revenue,
            COALESCE(SUM(GREATEST(0, COALESCE(amount_minor,0) - COALESCE(paid_minor,0))),0)::bigint outstanding
       FROM stay_booking_request
      WHERE place_id=$1 AND deleted_at IS NULL AND payment_status='verified'
        AND paid_at >= $2::date AND paid_at < ($2::date + interval '1 month')`, [pid, mStart]);
  const [refund] = await q<any>(
    `SELECT COALESCE(SUM(refunded_minor),0)::bigint refunded FROM stay_booking_request
      WHERE place_id=$1 AND deleted_at IS NULL AND payment_status='refunded'
        AND refunded_at >= $2::date AND refunded_at < ($2::date + interval '1 month')`, [pid, mStart]);
  const [rooms] = await q<any>(`SELECT count(*)::int n FROM stay_room WHERE place_id=$1 AND status='active' AND deleted_at IS NULL`, [pid]);
  const [nz] = await q<any>(
    `SELECT COALESCE(SUM( LEAST(COALESCE(bk.end_date, mm.e), mm.e) - GREATEST(bk.start_date, mm.s) ),0)::int nights
       FROM stay_occupancy_block bk JOIN stay_room r ON r.id=bk.room_id,
            (SELECT $2::date s, ($2::date + interval '1 month')::date e) mm
      WHERE r.place_id=$1 AND r.deleted_at IS NULL AND bk.status IN ('active','completed') AND bk.deleted_at IS NULL
        AND bk.block_kind IN ('stay','tenancy') AND bk.start_date < mm.e AND COALESCE(bk.end_date, mm.e) > mm.s`, [pid, mStart]);
  const [td] = await q<any>(
    `SELECT
       (SELECT count(*) FILTER (WHERE checked_in_at::date = CURRENT_DATE)::int FROM stay_booking_request WHERE place_id=$1 AND deleted_at IS NULL) cin,
       (SELECT count(*) FILTER (WHERE checked_out_at::date = CURRENT_DATE)::int FROM stay_booking_request WHERE place_id=$1 AND deleted_at IS NULL) cout,
       (SELECT count(*) FILTER (WHERE checked_in_at IS NOT NULL AND checked_out_at IS NULL)::int FROM stay_booking_request WHERE place_id=$1 AND deleted_at IS NULL AND status='converted') inhouse,
       (SELECT count(DISTINCT bk.room_id)::int FROM stay_occupancy_block bk JOIN stay_room r ON r.id=bk.room_id WHERE r.place_id=$1 AND bk.status='active' AND bk.deleted_at IS NULL AND bk.block_kind IN ('stay','tenancy','hold','maintenance') AND bk.span @> CURRENT_DATE) busy_today`, [pid]);
  const chart = await q<any>(
    `WITH days AS (SELECT generate_series(CURRENT_DATE-13, CURRENT_DATE, interval '1 day')::date d)
     SELECT to_char(days.d,'FMDD/FMMM') lbl, count(b.id)::int n
       FROM days LEFT JOIN stay_booking_request b ON b.created_at::date = days.d AND b.place_id=$1 AND b.deleted_at IS NULL AND NOT (b.status='cancelled' OR b.payment_status IN ('rejected','refunded'))
      GROUP BY days.d ORDER BY days.d`, [pid]);

  const daysInMonth = new Date(year, mon + 1, 0).getDate();
  const roomN = rooms?.n || 0;
  const nights = nz?.nights || 0;
  const revenue = Number(m?.revenue || 0);     // money actually received (verified slips), not the quoted total
  const outstanding = Number(m?.outstanding || 0);   // verified bookings' unpaid balance (deposit taken, rest due)
  const refunded = Number(refund?.refunded || 0);
  const capacity = roomN * daysInMonth;
  const occ = capacity ? Math.round((nights / capacity) * 100) : 0;
  const adr = nights ? Math.round(revenue / nights) : 0;
  const totalRooms = roomN;
  const vacantToday = Math.max(0, totalRooms - (td?.busy_today || 0));
  const maxN = Math.max(1, ...chart.map((c) => c.n));

  return (
    <>
      <MTopbar back="/merchant/stay" backLabel="ห้องพัก" title="รายได้ & สถิติ" />

      <div className="rev">
        <div className="rev-monthnav">
          <Link className="rev-mn-b" href={`/merchant/revenue?month=${prev}`} aria-label="เดือนก่อน"><Icon n="chevL" size={18} /></Link>
          <span className="rev-mn-l">{MONTHS[mon]} {year + 543}</span>
          {isCurrent ? <span className="rev-mn-b off"><Icon n="chevR" size={18} /></span> : <Link className="rev-mn-b" href={`/merchant/revenue?month=${next}`} aria-label="เดือนถัดไป"><Icon n="chevR" size={18} /></Link>}
        </div>
        <div className="rev-hero">
          <div className="rev-hero-l">
            <span className="rev-cap">รายได้เดือน{MONTHS[mon]}</span>
            <b className="rev-rev">{baht(revenue)}</b>
            <span className="rev-sub">รับจริง · {m?.bookings || 0} การจอง · เข้าพัก {nights}/{capacity} คืน-ห้อง{outstanding > 0 ? <> · <b style={{ color: '#c2410c' }}>ค้างชำระ {baht(outstanding)}</b></> : ''}{refunded > 0 ? <> · คืนเงิน {baht(refunded)}</> : ''}</span>
          </div>
          <div className="rev-occ" title={`${nights} ÷ ${capacity} คืน`}><b>{occ}%</b><span>อัตราเข้าพัก</span></div>
        </div>

        <div className="rev-kpis">
          <div className="rev-kpi"><span>ค่าเฉลี่ย/คืน</span><b>{adr ? baht(adr) : '—'}</b></div>
          <div className="rev-kpi"><span>จำนวนคืน</span><b>{nights}</b></div>
          <div className="rev-kpi"><span>การจอง</span><b>{m?.bookings || 0}</b></div>
        </div>

        <div className="rev-today">
          <div className="rev-today-h"><Icon n="calendar" size={15} /> วันนี้</div>
          <div className="rev-today-g">
            <div className="rev-t"><b>{td?.cin || 0}</b><span>เช็คอิน</span></div>
            <div className="rev-t"><b>{td?.cout || 0}</b><span>เช็คเอาท์</span></div>
            <div className="rev-t"><b>{td?.inhouse || 0}</b><span>กำลังพัก</span></div>
            <div className="rev-t"><b>{vacantToday}<i>/{totalRooms}</i></b><span>ห้องว่าง</span></div>
          </div>
        </div>

        <div className="rev-chart-c">
          <div className="rev-chart-h">การจอง 14 วันล่าสุด</div>
          <div className="rev-chart">
            {chart.map((c, i) => (
              <div key={i} className="rev-bar-w" title={`${c.lbl}: ${c.n}`}>
                <div className="rev-bar" style={{ height: `${Math.round((c.n / maxN) * 100)}%` }}>{c.n > 0 ? <i>{c.n}</i> : null}</div>
                {i % 2 === 0 ? <span>{c.lbl}</span> : <span>&nbsp;</span>}
              </div>
            ))}
          </div>
        </div>

        <p className="note">รายได้นับจากสลิปที่คุณกด “ยืนยันการชำระ” แล้วเท่านั้น · เงินโอนเข้าบัญชีคุณโดยตรง ระบบไม่ถือเงินแทน</p>
      </div>
    </>
  );
}
