import { q, i18n, demoUserId } from '@/lib/db';
import { Icon } from '../icons';
import { roomVacancy, roomImg } from '../RoomCard';
import { STAY_AMENITIES, STAY_KINDS } from '@/lib/facets';
import { parsePoint, isDefaultGeo } from '@/lib/geo';
import StayMapView from './StayMapView';
import StayFilterSheet from './StayFilterSheet';
import { PlaceStayCard } from './PlaceStayCard';
import DateRangePicker from '../DateRangePicker';

export const dynamic = 'force-dynamic';

// validation lists (the selectable UI lives in StayFilterSheet)
const SORTS: Record<string, string[]> = { monthly: ['', 'soon', 'cheap'], daily: ['', 'vacant', 'cheap'] };
// price buckets (price_minor satang): key → [lo, hi]
const PRICE: Record<string, Record<string, [number | null, number | null]>> = {
  monthly: { lt5k: [null, 500000], '5_10k': [500000, 1000000], '10_20k': [1000000, 2000000], '20k': [2000000, null] },
  daily: { lt800: [null, 80000], '800_1500': [80000, 150000], '1500': [150000, null] },
};
// compact Thai labels for the quick-filter price chips (must mirror PRICE keys)
const PRICE_LABEL: Record<string, Record<string, string>> = {
  monthly: { lt5k: '‹5พัน', '5_10k': '5–10พัน', '10_20k': '1–2หมื่น', '20k': '2หมื่น+' },
  daily: { lt800: '‹800', '800_1500': '800–1,500', '1500': '1,500+' },
};
// server-side Thai date read-back for the collapsed search pill (no UTC drift: day math on UTC-midnight)
const TH_ABBR = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const fmtThai = (s: string) => { const [, m, d] = s.split('-'); return `${Number(d)} ${TH_ABBR[Number(m) - 1]}`; };
const nightsOf = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

export default async function Stay({ searchParams }: { searchParams: Record<string, string> }) {
  const mode = searchParams?.mode === 'daily' ? 'daily' : 'monthly';
  const kind = String(searchParams?.kind || '').split(',').map((x) => x.trim()).filter((x) => STAY_KINDS.includes(x));
  const sort = SORTS[mode].includes(searchParams?.sort) ? searchParams.sort : '';
  const am = String(searchParams?.am || '').split(',').map((x) => x.trim()).filter((x) => STAY_AMENITIES.includes(x));
  const fr = String(searchParams?.fr || '').split(',').map((x) => x.trim()).filter((x) => ['furnished', 'partial', 'unfurnished'].includes(x));
  const qtext = String(searchParams?.q || '').slice(0, 60).trim();
  const pr = PRICE[mode][searchParams?.pr] ? searchParams.pr : '';
  const cap = ['1', '2', '3'].includes(searchParams?.cap || '') ? searchParams.cap : '';
  const view = searchParams?.view === 'map' ? 'map' : 'list';
  const focus = typeof searchParams?.focus === 'string' ? searchParams.focus : undefined;
  // nightly date search: real availability for [from,to) computed from blocks (managed daily only)
  const reD = /^\d{4}-\d{2}-\d{2}$/;
  const fromQ = mode === 'daily' && reD.test(searchParams?.from || '') ? searchParams.from : '';
  const toQ = mode === 'daily' && reD.test(searchParams?.to || '') ? searchParams.to : '';
  const dateMode = !!fromQ && !!toQ && toQ > fromQ;
  const dateQs = dateMode ? `?from=${fromQ}&to=${toQ}` : '';

  let rows: any[] = [];
  try {
    const uid = await demoUserId();
    // Marketplace gate: a listing shows ONLY when its place publishes (offers_stay) AND the listing
    // itself is published_to_marketplace (0031). A manages_stay && !offers_stay tenant (private SaaS)
    // is therefore structurally invisible here — isolation by flag, not by a separate DB.
    const where = [`su.status='published'`, `su.deleted_at IS NULL`, `su.published_to_marketplace`, `p.status='published'`, `p.is_visible`, `p.offers_stay`, `su.rental_mode=$1`];
    const params: any[] = [mode];
    let freeSel = ', 0 free_rooms';
    if (dateMode) {
      // a daily TYPE is bookable for [from,to) iff ≥1 active room has no overlapping active block — same
      // predicate as fn_stay_units_available (0038) / the GiST EXCLUDE; here inlined (list isn't city-scoped)
      params.push(fromQ); const fi = params.length; params.push(toQ); const ti = params.length;
      const freeRoom = `stay_room r WHERE r.stay_unit_id=su.id AND r.status='active' AND r.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM stay_occupancy_block b WHERE b.room_id=r.id AND b.status='active' AND b.deleted_at IS NULL AND b.block_kind IN ('stay','tenancy','maintenance') AND b.span && daterange($${fi}::date,$${ti}::date,'[)'))`;
      where.push('su.managed');
      where.push(`EXISTS (SELECT 1 FROM ${freeRoom})`);
      freeSel = `, (SELECT count(*) FROM ${freeRoom})::int free_rooms`;
    } else {
      where.push(mode === 'monthly' ? `su.available_units>0` : `su.daily_status<>'full'`);
    }
    if (kind.length) { params.push(kind); where.push(`p.stay_kind = ANY($${params.length}::text[])`); }
    if (am.length) { params.push(am); where.push(`su.unit_amenities @> $${params.length}::text[]`); }
    if (mode === 'monthly' && fr.length) { params.push(fr); where.push(`su.furnished = ANY($${params.length}::text[])`); }
    if (qtext) { params.push('%' + qtext + '%'); const n = params.length; where.push(`(su.name_i18n->>'th' ILIKE $${n} OR su.name_i18n->>'en' ILIKE $${n} OR p.name_i18n->>'th' ILIKE $${n} OR p.name_i18n->>'en' ILIKE $${n} OR d.name_i18n->>'th' ILIKE $${n})`); }
    if (pr) { const [lo, hi] = PRICE[mode][pr]; if (lo != null) { params.push(lo); where.push(`su.price_minor>=$${params.length}`); } if (hi != null) { params.push(hi); where.push(`su.price_minor<$${params.length}`); } }
    if (cap) { params.push(Number(cap)); where.push(`su.capacity>=$${params.length}`); }
    const order = mode === 'monthly'
      ? (sort === 'soon' ? 'su.available_from NULLS FIRST, su.created_at DESC' : sort === 'cheap' ? 'su.price_minor ASC NULLS LAST' : 'su.created_at DESC')
      : (sort === 'vacant' ? `(su.daily_status='vacant') DESC, su.created_at DESC` : sort === 'cheap' ? 'su.price_minor ASC NULLS LAST' : 'su.created_at DESC');
    params.push(uid); const sIdx = params.length;
    rows = await q<any>(
      `SELECT su.id, su.name_i18n, su.rental_mode, su.price_minor, su.price_period, su.price_text_i18n, su.image_urls,
              su.available_units, su.available_from, su.daily_status, su.availability_updated_at, su.managed,
              su.capacity, su.deposit_minor, su.min_stay, su.furnished,
              p.id place_id, p.name_i18n shop_name, p.stay_kind, p.line_id, p.phone, p.geo::text geo, d.name_i18n district_name,
              EXISTS(SELECT 1 FROM saved_places sp WHERE sp.place_id=p.id AND sp.user_id=$${sIdx}) saved,
              (SELECT round(avg(rv.rating),1) FROM reviews rv WHERE rv.place_id=p.id AND rv.moderation_status='approved') rating,
              (SELECT count(*) FROM reviews rv WHERE rv.place_id=p.id AND rv.moderation_status='approved') rating_n${freeSel}
         FROM stay_units su JOIN places p ON p.id=su.place_id LEFT JOIN districts d ON d.id=p.district_id
        WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT 60`, params);
  } catch { /* db down */ }

  // group rooms → one ACCOMMODATION (place) per card; serves both the list and the map.
  // vac counts only units the cards show as live-vacant (post stale-decay).
  const byId: Record<string, any> = {}; const order: string[] = [];
  for (const r of rows) {
    let g = byId[r.place_id];
    if (!g) {
      const pt = parsePoint(r.geo);
      g = byId[r.place_id] = {
        id: r.place_id, name: i18n(r.shop_name), district: i18n(r.district_name), kind: r.stay_kind,
        period: r.price_period, units: 0, vac: 0, priceMin: null as number | null, priceMax: null as number | null,
        saved: !!r.saved, img: roomImg(r), lat: pt?.lat ?? null, lng: pt?.lng ?? null,
        rating: r.rating, ratingN: Number(r.rating_n ?? 0),
      };
      order.push(r.place_id);
    }
    g.units++;
    if (dateMode) g.vac += (r.free_rooms || 0);
    else if (roomVacancy(r).cls === 'season') g.vac += (r.rental_mode === 'monthly' ? r.available_units : 1);
    if (r.price_minor != null) { const b = Math.round(r.price_minor / 100); g.priceMin = g.priceMin == null ? b : Math.min(g.priceMin, b); g.priceMax = g.priceMax == null ? b : Math.max(g.priceMax, b); }
  }
  const placeList = order.map((id) => byId[id]);
  // map pins: same groups, minus the un-pinned (default/no geo) ones (counted for the footer note)
  const pinned = placeList.filter((g) => g.lat != null && !isDefaultGeo(g.lng, g.lat));
  const unpinned = placeList.length - pinned.length;
  const pins = pinned.map((g) => ({
    id: g.id, name: g.name, lat: g.lat, lng: g.lng, kind: g.kind, img: g.img,
    priceFrom: g.priceMin, badge: g.vac > 0 ? `ว่าง ${g.vac}` : 'สอบถาม', live: g.vac > 0,
  }));

  // href is only for the mode segmented + list/map toggle (server links); all other filters
  // are set by the StayFilterSheet client component.
  const cur = { mode, kind: kind.join(','), sort, am: am.join(','), fr: fr.join(','), q: qtext, pr, cap, view };
  const href = (patch: Partial<typeof cur>) => {
    const s = { ...cur, ...patch }; const u = new URLSearchParams();
    if (s.mode !== 'monthly') u.set('mode', s.mode);
    if (s.kind) u.set('kind', s.kind); if (s.sort) u.set('sort', s.sort);
    if (s.am) u.set('am', s.am); if (s.fr) u.set('fr', s.fr);
    if (s.q) u.set('q', s.q); if (s.pr) u.set('pr', s.pr); if (s.cap) u.set('cap', s.cap);
    if (s.view === 'map') u.set('view', 'map');
    const qs = u.toString(); return qs ? `/stay?${qs}` : '/stay';
  };
  const activeCount = kind.length + (sort ? 1 : 0) + am.length + fr.length + (pr ? 1 : 0) + (cap ? 1 : 0);
  // hidden inputs carry all active filters through the GET search form (else searching resets them)
  const hidden: [string, string][] = [];
  if (mode !== 'monthly') hidden.push(['mode', mode]);
  if (kind.length) hidden.push(['kind', kind.join(',')]); if (sort) hidden.push(['sort', sort]);
  if (am.length) hidden.push(['am', am.join(',')]); if (fr.length) hidden.push(['fr', fr.join(',')]);
  if (pr) hidden.push(['pr', pr]); if (cap) hidden.push(['cap', cap]); if (view === 'map') hidden.push(['view', 'map']);

  // OTA pattern: once a search exists, collapse the whole form into a recap pill (tap to re-expand).
  const searched = !!qtext || dateMode || activeCount > 0;
  const recapBits = [mode === 'daily' ? 'รายวัน' : 'รายเดือน'];
  if (dateMode) recapBits.push(`${fmtThai(fromQ)}–${fmtThai(toQ)} · ${nightsOf(fromQ, toQ)} คืน`);
  if (activeCount > 0) recapBits.push(`ตัวกรอง ${activeCount}`);
  const searchControls = (
    <>
      <form className="staysearch" method="GET" action="/stay">
        {hidden.map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
        <Icon n="search" size={17} />
        <input name="q" defaultValue={qtext} placeholder="ค้นหาชื่อที่พัก / ย่าน" autoComplete="off" />
        {qtext && <a className="ss-x" href={href({ q: '' })} aria-label="ล้างคำค้น"><Icon n="x" size={16} /></a>}
      </form>
      <div className="segmented">
        <a href={href({ mode: 'monthly', kind: '', sort: '', fr: '', pr: '' })} className={`seg ${mode === 'monthly' ? 'on' : ''}`}>เช่ารายเดือน</a>
        <a href={href({ mode: 'daily', kind: '', sort: '', fr: '', pr: '' })} className={`seg ${mode === 'daily' ? 'on' : ''}`}>เช่ารายวัน</a>
      </div>
      {mode === 'daily' && (
        <form className="staydates" method="GET" action="/stay">
          {hidden.map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
          <DateRangePicker mode="range" fromName="from" toName="to" labelFrom="เช็คอิน" labelTo="เช็คเอาท์" initialFrom={fromQ || undefined} initialTo={toQ || undefined} />
          <button type="submit" className="staydates-go"><Icon n="search" size={15} /> ค้นหาวันว่าง</button>
          {dateMode && <a className="staydates-clear" href={href({})}>ล้างวันที่</a>}
        </form>
      )}
    </>
  );

  return (
    <>
      <div className="staytop">
        <a className="back" href="/"><Icon n="back" size={18} /> สำรวจ</a>
        <div className="staytop-row">
          <span className="staytop-ic"><Icon n="bed" size={23} /></span>
          <div className="staytop-tx">
            <h1>ที่พัก</h1>
            <div className="staytop-sub">หอพัก · อพาร์ตเมนต์ · โฮมสเตย์ ในนิมมาน / ใกล้ มช.</div>
          </div>
        </div>
      </div>

      {searched ? (
        <details className="staysearchbox">
          <summary className="staypill">
            <span className="staypill-ic"><Icon n="search" size={16} /></span>
            <span className="staypill-recap">
              <b>{qtext || 'ที่พักทั้งหมด'}</b>
              <span className="staypill-sub">{recapBits.join(' · ')}</span>
            </span>
            <span className="staypill-edit">แก้ไข <Icon n="chevR" size={15} /></span>
          </summary>
          <div className="staysearch-body">{searchControls}</div>
        </details>
      ) : searchControls}

      {/* sticky results toolbar: count + view toggle, then a scrollable quick-filter chip row */}
      <div className={`staytools ${searched ? 'stk' : ''}`}>
        <div className="staytools-top">
          <span className="staycount">พบ <b>{placeList.length}</b> ที่พัก</span>
          <div className="vtgroup">
            <a href={href({ view: 'list' })} className={`vtg ${view === 'list' ? 'on' : ''}`}><Icon n="feed" size={14} /> รายการ</a>
            <a href={href({ view: 'map' })} className={`vtg ${view === 'map' ? 'on' : ''}`}><Icon n="map" size={14} /> แผนที่</a>
          </div>
        </div>
        <div className="staychips">
          <StayFilterSheet mode={mode} view={view} q={qtext} kind={kind} sort={sort} am={am} fr={fr} pr={pr} cap={cap} count={activeCount} />
          <a href={href({ sort: sort === 'cheap' ? '' : 'cheap' })} className={`qchip ${sort === 'cheap' ? 'on' : ''}`}>ราคาถูกสุด</a>
          {Object.keys(PRICE[mode]).map((k) => (
            <a key={k} href={href({ pr: pr === k ? '' : k })} className={`qchip ${pr === k ? 'on' : ''}`}>{PRICE_LABEL[mode][k]}</a>
          ))}
        </div>
      </div>

      {view === 'map' ? (
        <>
          <StayMapView pins={pins} focus={focus} />
          {unpinned > 0 && <p className="shopnote" style={{ margin: '6px 16px' }}><Icon n="pin" size={13} /> ที่พัก {unpinned} แห่งยังไม่ได้ปักหมุด จึงยังไม่ขึ้นบนแผนที่</p>}
        </>
      ) : (
        <>
          <h2 style={{ padding: '0 16px', margin: '12px 0 2px' }}>{mode === 'monthly' ? 'ที่พักให้เช่ารายเดือน' : dateMode ? 'ห้องว่างตามวันที่เลือก' : 'ที่พักรายวัน'}</h2>
          <div className="staylist">
            {placeList.map((p) => <PlaceStayCard key={p.id} p={p} qs={dateQs} />)}
          </div>
          {placeList.length === 0 && (
            <p className="empty">{dateMode
              ? <>ไม่มีที่พักที่ยืนยันว่างช่วง {fromQ}–{toQ} · <a href={href({})}>ดูทั้งหมด (ไม่ระบุวัน)</a> เพื่อสอบถามที่พักโดยตรง</>
              : 'ไม่พบที่พักที่ตรงตัวกรอง — ลองเอาตัวกรองออกบ้าง'}</p>
          )}
        </>
      )}
      <p className="shopnote" style={{ margin: '6px 16px 22px' }}><Icon n="chat" size={13} /> ติดต่อที่พักโดยตรงเพื่อสอบถาม/จอง — Locale ยังไม่มีระบบจอง/ชำระเงินในแอป</p>
    </>
  );
}
