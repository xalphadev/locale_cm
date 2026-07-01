import { cookies } from 'next/headers';
import { q, i18n, demoUserId } from '@/lib/db';
import { roomVacancy, roomImg } from '../RoomCard';
import { STAY_KINDS } from '@/lib/facets';
import { parsePoint, isDefaultGeo } from '@/lib/geo';

const AKEY = /^[a-z0-9_]+$/;   // amenity/building keys are an admin catalog now — accept any well-formed key

// Shared stay-search data loader for BOTH the list (/stay) and the full-screen map (/stay/map) routes,
// so the two views are one continuous search: identical SQL, grouping, pins, filters, and URL state.
// No money anywhere — search + display + a contact lead only.

export const SORTS: Record<string, string[]> = { monthly: ['', 'near', 'soon', 'cheap', 'new', 'popular'], daily: ['', 'near', 'vacant', 'cheap', 'new', 'popular'] };
// price buckets (price_minor satang): key → [lo, hi]
export const PRICE: Record<string, Record<string, [number | null, number | null]>> = {
  monthly: { lt5k: [null, 500000], '5_10k': [500000, 1000000], '10_20k': [1000000, 2000000], '20k': [2000000, null] },
  daily: { lt800: [null, 80000], '800_1500': [80000, 150000], '1500': [150000, null] },
};
// compact Thai labels for the quick-filter price chips (must mirror PRICE keys)
export const PRICE_LABEL: Record<string, Record<string, string>> = {
  monthly: { lt5k: '‹5พัน', '5_10k': '5–10พัน', '10_20k': '1–2หมื่น', '20k': '2หมื่น+' },
  daily: { lt800: '‹800', '800_1500': '800–1,500', '1500': '1,500+' },
};
// server-side Thai date read-back for the collapsed search pill (no UTC drift: day math on UTC-midnight)
const TH_ABBR = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const fmtThai = (s: string) => { const [, m, d] = s.split('-'); return `${Number(d)} ${TH_ABBR[Number(m) - 1]}`; };
const nightsOf = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

export type StayPin = { id: string; name: string; lat: number; lng: number; kind: string; priceFrom: number | null; badge: string; live: boolean; img: string };

// group stay_unit rows → one ACCOMMODATION (place) per card (the StayPlace shape PlaceStayCard consumes).
// Shared by loadStay (list/map) and loadStayHome (curated rails) so both speak one universe.
export function groupStayRows(rows: any[], dateMode = false) {
  const byId: Record<string, any> = {}; const ord: string[] = [];
  for (const r of rows) {
    let g = byId[r.place_id];
    if (!g) {
      const pt = parsePoint(r.geo);
      g = byId[r.place_id] = {
        id: r.place_id, name: i18n(r.shop_name), district: i18n(r.district_name), kind: r.stay_kind,
        period: r.price_period, units: 0, vac: 0, priceMin: null as number | null, priceMax: null as number | null,
        payOnline: !!r.pay_online_enabled && !!r.manages_stay,   // "จองออนไลน์ได้" only if the place opted into ระบบการจอง
        saved: !!r.saved, img: roomImg(r), lat: pt?.lat ?? null, lng: pt?.lng ?? null,
        rating: r.rating, ratingN: Number(r.rating_n ?? 0),
      };
      ord.push(r.place_id);
    }
    g.units++;
    if (dateMode) g.vac += (r.free_rooms || 0);
    else if (roomVacancy(r).cls === 'season') g.vac += (r.rental_mode === 'monthly' ? r.available_units : 1);
    if (r.price_minor != null) { const b = Math.round(r.price_minor / 100); g.priceMin = g.priceMin == null ? b : Math.min(g.priceMin, b); g.priceMax = g.priceMax == null ? b : Math.max(g.priceMax, b); }
  }
  return ord.map((id) => byId[id]);
}

export async function loadStay(searchParams: Record<string, string>) {
  const mode = searchParams?.mode === 'daily' ? 'daily' : 'monthly';
  const kind = String(searchParams?.kind || '').split(',').map((x) => x.trim()).filter((x) => STAY_KINDS.includes(x));
  const sort = SORTS[mode].includes(searchParams?.sort) ? searchParams.sort : '';
  const am = String(searchParams?.am || '').split(',').map((x) => x.trim()).filter((x) => AKEY.test(x)).slice(0, 20);
  const fr = String(searchParams?.fr || '').split(',').map((x) => x.trim()).filter((x) => ['furnished', 'partial', 'unfurnished'].includes(x));
  const qtext = String(searchParams?.q || '').slice(0, 60).trim();
  const pr = PRICE[mode][searchParams?.pr] ? searchParams.pr : '';
  // occupancy: adults + children = total guests → capacity FIT filter (no money/age pricing). neutral = 1 adult.
  const adults = Math.max(1, Math.min(10, parseInt(searchParams?.ad || '1', 10) || 1));
  const children = Math.max(0, Math.min(6, parseInt(searchParams?.ch || '0', 10) || 0));
  const guests = adults + children;
  const cap = guests >= 2 ? String(guests) : '';   // active when total ≥ 2 → su.capacity>=N
  const focus = typeof searchParams?.focus === 'string' ? searchParams.focus : undefined;
  // nightly date search: real availability for [from,to) computed from blocks (managed daily only)
  const reD = /^\d{4}-\d{2}-\d{2}$/;
  const fromQ = mode === 'daily' && reD.test(searchParams?.from || '') ? searchParams.from : '';
  const toQ = mode === 'daily' && reD.test(searchParams?.to || '') ? searchParams.to : '';
  const dateMode = !!fromQ && !!toQ && toQ > fromQ;
  const dateQs = dateMode ? `?from=${fromQ}&to=${toQ}` : '';
  // rooms: shown/selectable in ALL daily mode (so the field sits beside guests like an OTA), but the FILTER
  // applies only with a real date range (the one branch where g.vac = genuine free-room count). Neutral 0/1.
  const roomsN = mode === 'daily' ? Math.max(0, Math.min(8, parseInt(searchParams?.rooms || '0', 10) || 0)) : 0;
  const rooms = roomsN >= 2 ? roomsN : 0;
  const district = /^[a-z_]+$/.test(searchParams?.district || '') ? searchParams.district : '';   // district slug deep-link
  const savedOnly = searchParams?.saved === '1';
  const online = searchParams?.online === '1';   // only places that accept online booking + payment
  const beds = ['1', '2', '3', '4'].includes(searchParams?.beds || '') ? searchParams.beds : '';   // min bedrooms (apt/condo/house)
  const gender = ['female', 'male'].includes(searchParams?.gender || '') ? searchParams.gender : '';   // dorm/hostel
  const bam = String(searchParams?.bam || '').split(',').map((x) => x.trim()).filter((x) => AKEY.test(x)).slice(0, 20);   // common-area facilities (attrs.building[])

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
    if (beds) { params.push(Number(beds)); where.push(`su.bedrooms>=$${params.length}`); }
    if (gender) { params.push(gender); where.push(`su.gender_policy=$${params.length}`); }
    if (online) where.push('(p.pay_online_enabled AND p.manages_stay)');
    if (bam.length) { params.push(JSON.stringify(bam)); where.push(`su.attrs->'building' @> $${params.length}::jsonb`); }
    if (district) { params.push(district); where.push(`d.slug=$${params.length}`); }
    if (savedOnly && uid) { params.push(uid); where.push(`EXISTS (SELECT 1 FROM saved_places sp2 WHERE sp2.place_id=p.id AND sp2.user_id=$${params.length})`); }
    const popOrder = `(SELECT avg(rv.rating) FROM reviews rv WHERE rv.place_id=p.id AND rv.moderation_status='approved') DESC NULLS LAST, (SELECT count(*) FROM reviews rv WHERE rv.place_id=p.id AND rv.moderation_status='approved') DESC, su.created_at DESC`;
    let order = sort === 'popular' ? popOrder
      : sort === 'cheap' ? 'su.price_minor ASC NULLS LAST'
      : sort === 'new' ? 'su.created_at DESC'
      : mode === 'monthly'
        ? (sort === 'soon' ? 'su.available_from NULLS FIRST, su.created_at DESC' : 'su.created_at DESC')
        : (sort === 'vacant' ? `(su.daily_status='vacant') DESC, su.created_at DESC` : 'su.created_at DESC');
    // near-me lens (same c_geo cookie as home): sort=near = pure distance; the DEFAULT sort goes
    // near-first in 2km rings (recency breaks ties inside a ring). Un-pinned Nimman-default places
    // aren't excluded — coarse is fine for ordering. No cookie → 'near' quietly falls back to default.
    const gm = /^(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)$/.exec(cookies().get('c_geo')?.value ?? '');
    if (gm) {
      params.push(+gm[2], +gm[1]);
      const distExpr = `ST_Distance(p.geo, ST_SetSRID(ST_MakePoint($${params.length - 1},$${params.length}),4326)::geography)`;
      if (sort === 'near') order = distExpr;
      else if (sort === '') order = `width_bucket(${distExpr}, 0, 10000, 5), ${order}`;
    }
    params.push(uid); const sIdx = params.length;
    rows = await q<any>(
      `SELECT su.id, su.name_i18n, su.rental_mode, su.price_minor, su.price_period, su.price_text_i18n, su.image_urls,
              su.available_units, su.available_from, su.daily_status, su.availability_updated_at, su.managed,
              su.capacity, su.deposit_minor, su.min_stay, su.furnished,
              p.id place_id, p.name_i18n shop_name, p.stay_kind, p.line_id, p.phone, p.geo::text geo, d.name_i18n district_name, p.pay_online_enabled, p.manages_stay,
              EXISTS(SELECT 1 FROM saved_places sp WHERE sp.place_id=p.id AND sp.user_id=$${sIdx}) saved,
              (SELECT round(avg(rv.rating),1) FROM reviews rv WHERE rv.place_id=p.id AND rv.moderation_status='approved') rating,
              (SELECT count(*) FROM reviews rv WHERE rv.place_id=p.id AND rv.moderation_status='approved') rating_n${freeSel}
         FROM stay_units su JOIN places p ON p.id=su.place_id LEFT JOIN districts d ON d.id=p.district_id
        WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT 60`, params);
  } catch { /* db down */ }

  // group rows → one card per place (shared groupStayRows); rooms is a POST-GROUP filter on the honest
  // free-room count g.vac (never a hold/reservation).
  const placeList = groupStayRows(rows, dateMode).filter((g) => !(dateMode && rooms >= 2) || g.vac >= rooms);
  const pinned = placeList.filter((g) => g.lat != null && !isDefaultGeo(g.lng, g.lat));
  const unpinned = placeList.length - pinned.length;
  const pins: StayPin[] = pinned.map((g) => ({
    id: g.id, name: g.name, lat: g.lat, lng: g.lng, kind: g.kind, img: g.img,
    priceFrom: g.priceMin, badge: g.vac > 0 ? `ว่าง ${g.vac}` : 'สอบถาม', live: g.vac > 0,
  }));

  // cap (guests) + rooms are PRIMARY search dimensions (own recap bits), not counted as "ตัวกรอง N"
  const activeCount = kind.length + (sort ? 1 : 0) + am.length + fr.length + (pr ? 1 : 0) + (beds ? 1 : 0) + (gender ? 1 : 0) + bam.length + (online ? 1 : 0);

  // URL builder shared by both routes: pass base='/stay' or '/stay/map'; dates ride along so the
  // list↔map toggle and the quick chips never drop an active date search.
  const cur = { mode, kind: kind.join(','), sort, am: am.join(','), fr: fr.join(','), q: qtext, pr, ad: adults > 1 ? String(adults) : '', ch: children > 0 ? String(children) : '', rooms: rooms ? String(rooms) : '', district, saved: savedOnly ? '1' : '', beds, gender, bam: bam.join(','), online: online ? '1' : '' };
  const href = (patch: Partial<typeof cur> = {}, base = '/stay/search') => {
    const s = { ...cur, ...patch }; const u = new URLSearchParams();
    if (s.mode !== 'monthly') u.set('mode', s.mode);
    if (s.kind) u.set('kind', s.kind); if (s.sort) u.set('sort', s.sort);
    if (s.am) u.set('am', s.am); if (s.fr) u.set('fr', s.fr);
    if (s.q) u.set('q', s.q); if (s.pr) u.set('pr', s.pr);
    if (s.ad) u.set('ad', s.ad); if (s.ch) u.set('ch', s.ch); if (s.mode === 'daily' && s.rooms) u.set('rooms', s.rooms);
    if (s.district) u.set('district', s.district); if (s.saved) u.set('saved', s.saved);
    if (s.beds) u.set('beds', s.beds); if (s.gender) u.set('gender', s.gender); if (s.bam) u.set('bam', s.bam);
    if (s.online) u.set('online', s.online);
    if (s.mode === 'daily' && dateMode) { u.set('from', fromQ as string); u.set('to', toQ as string); }
    const qs = u.toString(); return qs ? `${base}?${qs}` : base;
  };

  // hidden inputs carry the active filters through the GET search/date forms (else searching resets them).
  // NOTE: dates are NOT in here (the staydates form owns from/to via the picker); the name-search form
  // adds them separately so a name search keeps the date range.
  const hidden: [string, string][] = [];
  if (mode !== 'monthly') hidden.push(['mode', mode]);
  if (kind.length) hidden.push(['kind', kind.join(',')]); if (sort) hidden.push(['sort', sort]);
  if (am.length) hidden.push(['am', am.join(',')]); if (fr.length) hidden.push(['fr', fr.join(',')]);
  if (pr) hidden.push(['pr', pr]);   // NOTE: cap/rooms are NOT here — the who/when form owns them via StayGuests/picker
  if (district) hidden.push(['district', district]); if (savedOnly) hidden.push(['saved', '1']);
  if (beds) hidden.push(['beds', beds]); if (gender) hidden.push(['gender', gender]); if (bam.length) hidden.push(['bam', bam.join(',')]);
  if (online) hidden.push(['online', '1']);

  const searched = !!qtext || dateMode || !!cap || !!district || savedOnly || activeCount > 0;
  const recapBits = [mode === 'daily' ? 'รายวัน' : 'รายเดือน'];
  if (dateMode) recapBits.push(`${fmtThai(fromQ as string)}–${fmtThai(toQ as string)} · ${nightsOf(fromQ as string, toQ as string)} คืน`);
  if (cap) recapBits.push(`${cap} ท่าน`);
  if (dateMode && rooms) recapBits.push(`${rooms} ห้อง`);
  if (online) recapBits.push('จองออนไลน์ได้');
  if (activeCount > 0) recapBits.push(`ตัวกรอง ${activeCount}`);

  return {
    mode, kind, sort, am, fr, qtext, pr, cap, adults, children, rooms, beds, gender, bam, online, focus, fromQ, toQ, dateMode, dateQs,
    placeList, pins, unpinned, activeCount, hidden, href, searched, recapBits,
  };
}
