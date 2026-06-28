import { redirect } from 'next/navigation';
import Link from 'next/link';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { MTopbar } from '../../MTopbar';
import { Icon } from '../../ui';
import AvailabilitySearch from './AvailabilitySearch';
import { isDate, fmtTh, nightsOf, monthsOf, baht, perTh } from './avail-utils';

export const dynamic = 'force-dynamic';

// "หาห้องว่าง" — standalone availability search→book. Pick รายเดือน (move-in + months) or รายวัน (date range)
// + จำนวนผู้เข้าพัก → see free rooms (capacity-matched, with a price estimate, min-stay + deposit shown as a
// NOTE) → book one (a name = a booking, no name = a hold). No money — operational booking only.
const coll = (x: string, y: string) => (x || '').localeCompare(y || '', undefined, { numeric: true, sensitivity: 'base' });

export default async function AvailableRooms({ searchParams }: { searchParams: { from?: string; to?: string; mode?: string; pax?: string; ok?: string; error?: string; bk?: string } }) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  if (!acc.manages_stay) redirect('/merchant/rooms');
  const term = acc.room_group_term || 'ชั้น';

  const from = isDate(searchParams?.from || '') ? searchParams!.from! : '';
  const to = isDate(searchParams?.to || '') ? searchParams!.to! : '';
  const ready = !!from && !!to && to > from;
  const searchMonthly = searchParams?.mode === 'monthly';
  const pax = Math.max(0, Math.min(20, parseInt(searchParams?.pax || '', 10) || 0));

  // default the search mode + min months from THIS property's inventory (mixed daily/monthly is possible)
  const [inv] = await q<{ has_m: boolean | null; minm: number | null }>(
    `SELECT bool_or(rental_mode='monthly') has_m, min(min_stay) FILTER (WHERE rental_mode='monthly') minm
       FROM stay_units WHERE place_id=$1 AND deleted_at IS NULL AND rental_mode IS NOT NULL`, [acc.place_id]);
  const defaultMode = inv?.has_m ? 'monthly' : 'daily';
  const minMonths = Math.max(1, inv?.minm || 1);

  let groups: { id: string; name: string; rooms: any[] }[] = [];
  let freeCount = 0; let nights = 0; let months = 0;
  if (ready) {
    nights = nightsOf(from, to); months = monthsOf(from, to);
    const rows = await q<any>(
      `SELECT r.id, r.code, r.floor, r.stay_unit_id,
              su.name_i18n unit_name, su.price_minor, su.price_period, su.capacity, su.sort unit_sort, su.rental_mode, su.min_stay, su.deposit_minor
         FROM stay_room r
         LEFT JOIN stay_units su ON su.id = r.stay_unit_id
        WHERE r.place_id = $1 AND r.deleted_at IS NULL AND r.status='active'
          AND NOT EXISTS (
            SELECT 1 FROM stay_occupancy_block b
             WHERE b.room_id = r.id AND b.status='active' AND b.deleted_at IS NULL
               AND b.span && daterange($2::date, $3::date, '[)'))
          AND NOT (su.rental_mode <> 'daily' AND r.occupancy_status IS NOT NULL AND r.occupancy_status <> 'vacant'
                   AND (r.occupied_until IS NULL OR r.occupied_until > $2::date))
        ORDER BY su.sort NULLS LAST, su.name_i18n->>'th', r.code`,
      [acc.place_id, from, to]);
    const mapped = rows.map((r: any) => ({
      id: r.id, code: r.code, floor: r.floor, unitId: r.stay_unit_id || '',
      unitName: r.unit_name ? i18n(r.unit_name) : 'ไม่ระบุประเภท',
      priceMinor: r.price_minor != null ? Number(r.price_minor) : null, pricePeriod: r.price_period || null,
      capacity: r.capacity || null, unitSort: r.unit_sort ?? 9999,
      monthly: r.rental_mode === 'monthly', minStay: r.min_stay || 0, depositMinor: r.deposit_minor != null ? Number(r.deposit_minor) : 0,
    })).sort((a, b) => (a.unitSort - b.unitSort) || coll(a.unitName, b.unitName) || coll(a.code, b.code));
    freeCount = mapped.length;
    for (const r of mapped) { const g = groups[groups.length - 1]; if (!g || g.id !== r.unitId) groups.push({ id: r.unitId, name: r.unitName, rooms: [r] }); else g.rooms.push(r); }
  }

  const back = `/merchant/units/available?from=${from}&to=${to}${searchMonthly ? '&mode=monthly' : ''}${pax ? `&pax=${pax}` : ''}`;
  const barSpan = searchMonthly ? `${months} เดือน` : `${nights} คืน`;

  return (
    <>
      <MTopbar back="/merchant/stay" backLabel="ห้องพัก" title="หาห้องว่าง" />

      {searchParams?.ok === 'booked' && <div className="banner-ok">✓ จองห้อง {searchParams.bk || ''} ให้แล้ว · <Link href="/merchant/units/calendar" style={{ color: 'inherit', fontWeight: 800, textDecoration: 'underline' }}>ดูในปฏิทิน</Link></div>}
      {searchParams?.ok === 'blocked' && <div className="banner-ok">✓ กันห้อง {searchParams.bk || ''} ไว้แล้ว</div>}
      {searchParams?.error === 'overlap' && <div className="banner-err">ห้องนี้เพิ่งถูกจองไป — เลือกห้องอื่น</div>}
      {searchParams?.error === 'daterange' && <div className="banner-err">วันออกต้องอยู่หลังวันเข้า</div>}
      {searchParams?.error === 'date' && <div className="banner-err">วันที่ไม่ถูกต้อง</div>}

      {!ready ? (
        <div className="avail-empty">
          <div className="avail-hero">
            <span className="avail-empty-ic"><Icon n="calendar" size={26} /></span>
            <p className="avail-empty-t">ลูกค้าอยากเข้าพักช่วงไหน?</p>
            <p className="avail-empty-s">เลือกช่วงวัน · จำนวนคน แล้วดูห้องที่ว่างทันที</p>
          </div>
          <AvailabilitySearch defaultMode={defaultMode} minMonths={minMonths} />
        </div>
      ) : (
        <section className="avail-results">
          <a className="avail-bar" href="/merchant/units/available">
            <span className="avail-bar-main">
              <b>ว่าง {freeCount} ห้อง</b>
              <span className="avail-range">{fmtTh(from)} – {fmtTh(to)} · {barSpan}{pax ? ` · ${pax} คน` : ''}</span>
            </span>
            <span className="avail-redo">เปลี่ยน<Icon n="chevR" size={13} /></span>
          </a>
          {freeCount === 0 ? (
            <div className="mempty"><span className="mempty-ic"><Icon n="bed" size={26} /></span>
              <p>ไม่มีห้องว่างช่วง {fmtTh(from)} – {fmtTh(to)} — <a href="/merchant/units/available">เปลี่ยนวัน</a></p></div>
          ) : groups.map((g) => (
            <div className="avail-grp" key={g.id || '_'}>
              <div className="avail-grp-h"><span>{g.name}</span><i>{g.rooms.length} ว่าง</i></div>
              {g.rooms.map((r: any) => {
                const span = r.monthly ? months : nights;
                const spanLabel = r.monthly ? `${months} เดือน` : `${nights} คืน`;
                const quoteMinor = r.priceMinor != null ? r.priceMinor * span : null;
                const capWarn = pax > 0 && r.capacity != null && r.capacity < pax;
                const minWarn = r.minStay > 0 && span < r.minStay;
                const unit = r.monthly ? 'เดือน' : 'คืน';
                // capacity + min-stay-info + deposit live in the quiet fine line; only an UNDER-MINIMUM stay earns a
                // loud flag (it's the one actionable mismatch). capacity-under is a calm amber-text note, not a pill.
                const fineRest = [
                  r.minStay > 0 && !minWarn ? `ขั้นต่ำ ${r.minStay} ${unit}` : '',
                  r.depositMinor ? `มัดจำ ${baht(r.depositMinor)}` : '',
                ].filter(Boolean).join(' · ');
                return (
                  <Link key={r.id} className="avail-room avail-room--link"
                    href={`/merchant/units/available/book?room=${r.id}&from=${from}&to=${to}${searchMonthly ? '&mode=monthly' : ''}${pax ? `&pax=${pax}` : ''}`}>
                    <span className="avail-room-sum">
                      <span className="avail-rt">
                        <span className="avail-rt-1">
                          <b>ห้อง {r.code}</b>
                          {minWarn && <span className="avail-match warn"><Icon n="clock" size={11} />ขั้นต่ำ {r.minStay} {unit}</span>}
                        </span>
                        <span className="avail-rt-meta">{[r.floor ? `${term} ${r.floor}` : '', r.priceMinor != null ? `${baht(r.priceMinor)}${perTh(r.pricePeriod)}` : ''].filter(Boolean).join(' · ')}</span>
                        {quoteMinor != null && <span className="avail-quote"><b>≈ {baht(quoteMinor)}</b><i>{spanLabel}</i></span>}
                        {(r.capacity || fineRest) && (
                          <span className="avail-fine">
                            {r.capacity ? <span className={capWarn ? 'fine-cap' : ''}>รับ {r.capacity} คน</span> : null}
                            {r.capacity && fineRest ? ' · ' : ''}{fineRest}
                          </span>
                        )}
                      </span>
                      <span className="avail-go-pill">จอง<Icon n="chevR" size={14} /></span>
                    </span>
                  </Link>
                );
              })}
            </div>
          ))}
        </section>
      )}
    </>
  );
}
