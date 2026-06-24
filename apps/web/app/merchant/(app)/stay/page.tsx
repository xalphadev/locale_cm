import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q } from '@/lib/db';
import { Icon } from '../ui';

export const dynamic = 'force-dynamic';

const C = { vacant: '#12b76a', occupied: '#3b82f6', reserved: '#f59e0b', maint: '#9aa0a6' };

// Room-management HOME (hub). The ห้องพัก bottom tab lands here. Setup-aware: a brand-new property gets a
// "getting started" card instead of a barren 0/0/0 dashboard; once rooms exist it shows live occupancy
// (bar) + today's arrivals/departures + new-request CTA, then icon tiles that open the separate pages
// (จอง / ผังห้อง / ประเภท & ราคา / ปฏิทิน). No tabs — a launcher. No money.
export default async function StayHome() {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  if (!acc.offers_stay && !acc.manages_stay) redirect('/merchant');

  const managed = !!acc.manages_stay && acc.room_mode !== 'unique';
  const [reqs] = await q<any>(`SELECT count(*) FILTER (WHERE status='new')::int new_n, count(*)::int total FROM stay_booking_request WHERE place_id=$1 AND deleted_at IS NULL`, [acc.place_id]);
  const [tc] = await q<any>(`SELECT count(*)::int n FROM stay_units WHERE place_id=$1 AND deleted_at IS NULL`, [acc.place_id]);
  let rs: { total: number; vacant: number; occupied: number; reserved: number; maint: number } | null = null;
  let ops = { arr: 0, dep: 0, inhouse: 0 };
  let today: any[] = [];
  let soon: any[] = [];
  if (managed) {
    [rs] = await q<any>(
      `SELECT count(*)::int total,
              count(*) FILTER (WHERE occupancy_status='vacant')::int vacant,
              count(*) FILTER (WHERE occupancy_status='occupied')::int occupied,
              count(*) FILTER (WHERE occupancy_status='reserved')::int reserved,
              count(*) FILTER (WHERE occupancy_status='maintenance')::int maint
         FROM stay_room WHERE place_id=$1 AND deleted_at IS NULL AND status='active'`, [acc.place_id]);
    const [to] = await q<any>(
      `SELECT count(*) FILTER (WHERE b.start_date=CURRENT_DATE)::int arr,
              count(*) FILTER (WHERE b.end_date=CURRENT_DATE)::int dep,
              count(*) FILTER (WHERE b.span @> CURRENT_DATE)::int inhouse
         FROM stay_occupancy_block b JOIN stay_room r ON r.id=b.room_id
        WHERE r.place_id=$1 AND r.deleted_at IS NULL AND b.status='active' AND b.deleted_at IS NULL
          AND b.block_kind IN ('stay','tenancy')`, [acc.place_id]);
    ops = to || ops;
    if ((rs?.total || 0) > 0) {
      today = await q<any>(
        `SELECT r.code, b.note, (b.start_date=CURRENT_DATE) is_in, (b.end_date=CURRENT_DATE) is_out
           FROM stay_occupancy_block b JOIN stay_room r ON r.id=b.room_id
          WHERE r.place_id=$1 AND r.deleted_at IS NULL AND b.status='active' AND b.deleted_at IS NULL
            AND (b.start_date=CURRENT_DATE OR b.end_date=CURRENT_DATE) ORDER BY r.code LIMIT 10`, [acc.place_id]);
      // monthly tenancies / reservations whose room frees within 14 days — re-rent prompt
      soon = await q<any>(
        `SELECT r.code, to_char(r.occupied_until,'YYYY-MM-DD') d FROM stay_room r
          WHERE r.place_id=$1 AND r.deleted_at IS NULL AND r.status='active'
            AND r.occupancy_status IN ('occupied','reserved') AND r.occupied_until IS NOT NULL
            AND r.occupied_until >= CURRENT_DATE AND r.occupied_until < CURRENT_DATE + 14
          ORDER BY r.occupied_until LIMIT 5`, [acc.place_id]);
    }
  }
  const newN = reqs?.new_n || 0;
  const total = rs?.total || 0;
  const usePct = total ? Math.round((rs!.occupied / total) * 100) : 0;
  const pct = (n: number) => (total ? `${(n / total) * 100}%` : '0%');
  const fmtD = (d: string) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : '');
  const arrivals = today.filter((t) => t.is_in);
  const departures = today.filter((t) => t.is_out);

  // setup-aware: guide a brand-new property to the next step instead of a dead dashboard
  const setupStep = !((tc?.n || 0) > 0) ? 'types' : (managed && total === 0) ? 'rooms' : null;

  const tiles: { href: string; icon: string; label: string; stat: string; hot?: boolean; badge?: number }[] = [
    { href: '/merchant/bookings', icon: 'chat', label: 'การจอง', stat: newN > 0 ? 'มีคำขอรอตอบ' : 'คำขอ + การจอง', hot: newN > 0, badge: newN || undefined },
    ...(managed ? [{ href: '/merchant/units', icon: 'grid', label: 'ผังห้อง', stat: total > 0 ? `${rs!.vacant} ห้องว่าง` : 'เพิ่มห้องจริง' }] : []),
    { href: '/merchant/rooms', icon: 'tag', label: 'ประเภท & ราคา', stat: `${tc?.n || 0} รูปแบบ` },
    ...(managed ? [{ href: '/merchant/units/calendar', icon: 'calendar', label: 'ปฏิทินรวม', stat: 'ดูทั้งเดือน' }] : []),
  ];

  return (
    <>
      <div className="listhead"><h1>ห้องพัก</h1></div>
      <p className="roomhub-sub">ภาพรวมและการจัดการที่พักของคุณ</p>

      {setupStep ? (
        <div className="stay-onboard">
          <span className="stay-onboard-ic"><Icon n={setupStep === 'types' ? 'tag' : 'bed'} size={24} /></span>
          <div className="stay-onboard-tx">
            <div className="stay-onboard-t">{setupStep === 'types' ? 'เริ่มต้นจัดการห้องพัก' : 'เพิ่มห้องจริงในผัง'}</div>
            <div className="stay-onboard-d">{setupStep === 'types'
              ? 'ขั้นแรก สร้าง “รูปแบบห้อง” (เช่น สตูดิโอ / เตียงในห้องรวม) แล้วตั้งราคา'
              : 'ต่อไป เพิ่มห้องจริงเพื่อเริ่มคุมห้องว่างและรับจอง'}</div>
          </div>
          <Link className="btn btn-primary stay-onboard-cta" href={setupStep === 'types' ? '/merchant/rooms/new' : '/merchant/units/new'}>
            <Icon n="plus" size={16} /> {setupStep === 'types' ? 'สร้างรูปแบบห้อง' : 'เพิ่มห้องจริง'}
          </Link>
        </div>
      ) : managed ? (
        <div className="bk-summary">
          <div className="occ-line">
            <span><b style={{ color: C.vacant }}>{rs!.vacant}</b> ห้องว่าง <span className="muted">/ {total} ห้อง</span></span>
            <span className="occ-pct">ใช้งาน <b>{usePct}%</b></span>
          </div>
          <div className="occbar-track" style={{ margin: '10px 0 4px' }}>
            {rs!.vacant > 0 && <span style={{ width: pct(rs!.vacant), background: C.vacant }} />}
            {rs!.occupied > 0 && <span style={{ width: pct(rs!.occupied), background: C.occupied }} />}
            {rs!.reserved > 0 && <span style={{ width: pct(rs!.reserved), background: C.reserved }} />}
            {rs!.maint > 0 && <span style={{ width: pct(rs!.maint), background: C.maint }} />}
          </div>
          <div className="bk-sum-foot">
            <span>วันนี้ · เข้า <b>{ops.arr}</b> · ออก <b>{ops.dep}</b> · กำลังพัก <b>{ops.inhouse}</b></span>
            {newN > 0 && <Link href="/merchant/bookings?lens=new" className="occ-newcta">{newN} คำขอใหม่ ›</Link>}
          </div>
        </div>
      ) : (
        <div className="bk-summary">
          <div className="bk-sum-stats">
            <div className="bk-stat"><span className={`bk-stat-n ${newN > 0 ? 'bk-amber' : ''}`}>{newN}</span><span className="bk-stat-l">คำขอใหม่</span></div>
            <div className="bk-stat"><span className="bk-stat-n">{reqs?.total || 0}</span><span className="bk-stat-l">การจองทั้งหมด</span></div>
          </div>
        </div>
      )}

      {(arrivals.length > 0 || departures.length > 0) && (
        <div className="stay-today">
          {arrivals.map((t, i) => <div className="stay-today-row" key={`i${i}`}><span className="stt-tag in">เข้า</span><b>ห้อง {t.code}</b>{t.note ? <span className="muted">· {t.note}</span> : null}</div>)}
          {departures.map((t, i) => <div className="stay-today-row" key={`o${i}`}><span className="stt-tag out">ออก</span><b>ห้อง {t.code}</b>{t.note ? <span className="muted">· {t.note}</span> : null}</div>)}
        </div>
      )}

      {soon.length > 0 && (<>
        <p className="stayhub-h">ใกล้ครบกำหนด <span className="muted" style={{ fontWeight: 600 }}>· ใน 14 วัน</span></p>
        <div className="stay-today">
          {soon.map((sx, i) => <div className="stay-today-row" key={`s${i}`}><span className="stt-tag soon">ครบ</span><b>ห้อง {sx.code}</b><span className="muted">· {fmtD(sx.d)}</span></div>)}
        </div>
      </>)}

      <p className="stayhub-h">เมนูจัดการ</p>
      <div className="stayhub-grid">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} className={`stayhub-tile ${t.hot ? 'hot' : ''}`}>
            <span className="stayhub-top">
              <span className="stayhub-ic"><Icon n={t.icon} size={24} /></span>
              {t.badge ? <span className="stayhub-badge">{t.badge} ใหม่</span> : null}
            </span>
            <span className="stayhub-lb">{t.label}</span>
            <span className="stayhub-st">{t.stat}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
