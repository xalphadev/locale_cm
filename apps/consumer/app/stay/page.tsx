import { q, i18n, DEMO_USER } from '@/lib/db';
import { Icon } from '../icons';
import { RoomCard, roomVacancy } from '../RoomCard';
import { STAY_AMENITIES, facetLabel } from '@/lib/facets';
import { parsePoint, isDefaultGeo } from '@/lib/geo';
import StayMapView from './StayMapView';

export const dynamic = 'force-dynamic';

const KINDS: Record<string, [string, string][]> = {
  monthly: [['dorm', 'หอพัก'], ['apartment', 'อพาร์ตเมนต์']],
  daily: [['homestay', 'โฮมสเตย์'], ['guesthouse', 'เกสต์เฮาส์'], ['hotel', 'โรงแรม']],
};
const SORTS: Record<string, { k: string; l: string }[]> = {
  monthly: [{ k: '', l: 'มาใหม่' }, { k: 'soon', l: 'ว่างเร็วๆนี้' }, { k: 'cheap', l: 'ราคาประหยัด' }],
  daily: [{ k: '', l: 'มาใหม่' }, { k: 'vacant', l: 'ว่างวันนี้' }, { k: 'cheap', l: 'ราคาประหยัด' }],
};
const FURNISH: [string, string][] = [['furnished', 'เฟอร์ครบ'], ['partial', 'เฟอร์บางส่วน'], ['unfurnished', 'ไม่มีเฟอร์']];
// price buckets (price_minor satang): [key, label, [lo, hi]]
const PRICE: Record<string, [string, string, [number | null, number | null]][]> = {
  monthly: [['lt5k', '<5พัน', [null, 500000]], ['5_10k', '5–10พัน', [500000, 1000000]], ['10_20k', '10–20พัน', [1000000, 2000000]], ['20k', '20พัน+', [2000000, null]]],
  daily: [['lt800', '<800', [null, 80000]], ['800_1500', '800–1500', [80000, 150000]], ['1500', '1500+', [150000, null]]],
};
const CAPS: [string, string][] = [['1', '1 ท่าน'], ['2', '2 ท่าน'], ['3', '3+ ท่าน']];

export default async function Stay({ searchParams }: { searchParams: Record<string, string> }) {
  const mode = searchParams?.mode === 'daily' ? 'daily' : 'monthly';
  const kinds = KINDS[mode];
  const kind = kinds.some(([k]) => k === searchParams?.kind) ? searchParams.kind : '';
  const sorts = SORTS[mode];
  const sort = sorts.some((s) => s.k === searchParams?.sort) ? searchParams.sort : '';
  const am = String(searchParams?.am || '').split(',').map((x) => x.trim()).filter((x) => STAY_AMENITIES.includes(x));
  const fr = ['furnished', 'partial', 'unfurnished'].includes(searchParams?.fr || '') ? searchParams.fr : '';
  const qtext = String(searchParams?.q || '').slice(0, 60).trim();
  const pr = PRICE[mode].some((b) => b[0] === searchParams?.pr) ? searchParams.pr : '';
  const cap = ['1', '2', '3'].includes(searchParams?.cap || '') ? searchParams.cap : '';
  const view = searchParams?.view === 'map' ? 'map' : 'list';
  const adv = searchParams?.adv === '1';
  const focus = typeof searchParams?.focus === 'string' ? searchParams.focus : undefined;

  let rows: any[] = [];
  try {
    const where = [`su.status='published'`, `p.status='published'`, `p.is_visible`, `su.rental_mode=$1`];
    const params: any[] = [mode];
    where.push(mode === 'monthly' ? `su.available_units>0` : `su.daily_status<>'full'`);
    if (kind) { params.push(kind); where.push(`p.stay_kind=$${params.length}`); }
    if (am.length) { params.push(am); where.push(`su.unit_amenities @> $${params.length}::text[]`); }
    if (mode === 'monthly' && fr) { params.push(fr); where.push(`su.furnished=$${params.length}`); }
    if (qtext) { params.push('%' + qtext + '%'); const n = params.length; where.push(`(su.name_i18n->>'th' ILIKE $${n} OR su.name_i18n->>'en' ILIKE $${n} OR p.name_i18n->>'th' ILIKE $${n} OR p.name_i18n->>'en' ILIKE $${n} OR d.name_i18n->>'th' ILIKE $${n})`); }
    if (pr) { const [, , [lo, hi]] = PRICE[mode].find((b) => b[0] === pr)!; if (lo != null) { params.push(lo); where.push(`su.price_minor>=$${params.length}`); } if (hi != null) { params.push(hi); where.push(`su.price_minor<$${params.length}`); } }
    if (cap) { params.push(Number(cap)); where.push(`su.capacity>=$${params.length}`); }
    const order = mode === 'monthly'
      ? (sort === 'soon' ? 'su.available_from NULLS FIRST, su.created_at DESC' : sort === 'cheap' ? 'su.price_minor ASC NULLS LAST' : 'su.created_at DESC')
      : (sort === 'vacant' ? `(su.daily_status='vacant') DESC, su.created_at DESC` : sort === 'cheap' ? 'su.price_minor ASC NULLS LAST' : 'su.created_at DESC');
    params.push(DEMO_USER); const sIdx = params.length;
    rows = await q<any>(
      `SELECT su.id, su.name_i18n, su.rental_mode, su.price_minor, su.price_period, su.price_text_i18n, su.image_urls,
              su.available_units, su.available_from, su.daily_status, su.availability_updated_at,
              su.capacity, su.deposit_minor, su.min_stay, su.furnished,
              p.id place_id, p.name_i18n shop_name, p.stay_kind, p.line_id, p.phone, p.geo::text geo,
              EXISTS(SELECT 1 FROM saved_places sp WHERE sp.place_id=p.id AND sp.user_id=$${sIdx}) saved
         FROM stay_units su JOIN places p ON p.id=su.place_id LEFT JOIN districts d ON d.id=p.district_id
        WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT 60`, params);
  } catch { /* db down */ }

  // group rows → one pin per place (active mode only); omit un-pinned (default/no geo) honestly
  const byPlace: Record<string, any> = {}; const seenUnpinned = new Set<string>();
  for (const r of rows) {
    const pt = parsePoint(r.geo);
    if (!pt || isDefaultGeo(pt.lng, pt.lat)) { seenUnpinned.add(r.place_id); continue; }
    // count only units the LIST would show as live-vacant (post stale-decay), so the pin badge
    // can't claim more vacant rooms than the cards present.
    const vac = roomVacancy(r).cls === 'season' ? (r.rental_mode === 'monthly' ? r.available_units : 1) : 0;
    const g = byPlace[r.place_id] || (byPlace[r.place_id] = { id: r.place_id, name: i18n(r.shop_name), lat: pt.lat, lng: pt.lng, kind: r.stay_kind, vac: 0, priceFrom: null as number | null });
    g.vac += vac;
    if (r.price_minor != null) g.priceFrom = g.priceFrom == null ? r.price_minor : Math.min(g.priceFrom, r.price_minor);
  }
  const unpinned = [...seenUnpinned].filter((id) => !byPlace[id]).length;
  const pins = Object.values(byPlace).map((g: any) => ({
    ...g, priceFrom: g.priceFrom != null ? Math.round(g.priceFrom / 100) : null,
    badge: g.vac > 0 ? `ว่าง ${g.vac}` : 'สอบถาม', live: g.vac > 0,
  }));

  const cur = { mode, kind, sort, am: am.join(','), fr, q: qtext, pr, cap, view, adv: adv ? '1' : '' };
  const href = (patch: Partial<typeof cur>) => {
    const s = { ...cur, ...patch }; const u = new URLSearchParams();
    if (s.mode !== 'monthly') u.set('mode', s.mode);
    if (s.kind) u.set('kind', s.kind); if (s.sort) u.set('sort', s.sort);
    if (s.am) u.set('am', s.am); if (s.fr) u.set('fr', s.fr);
    if (s.q) u.set('q', s.q); if (s.pr) u.set('pr', s.pr); if (s.cap) u.set('cap', s.cap);
    if (s.view === 'map') u.set('view', 'map'); if (s.adv === '1') u.set('adv', '1');
    const qs = u.toString(); return qs ? `/stay?${qs}` : '/stay';
  };
  const toggleAm = (a: string) => { const set = new Set(am); set.has(a) ? set.delete(a) : set.add(a); return href({ am: [...set].join(',') }); };
  const advCount = am.length + (fr ? 1 : 0) + (pr ? 1 : 0) + (cap ? 1 : 0);
  // hidden inputs carry all OTHER active filters through the GET search form (else searching resets them)
  const hidden: [string, string][] = [];
  if (mode !== 'monthly') hidden.push(['mode', mode]);
  if (kind) hidden.push(['kind', kind]); if (sort) hidden.push(['sort', sort]);
  if (am.length) hidden.push(['am', am.join(',')]); if (fr) hidden.push(['fr', fr]);
  if (pr) hidden.push(['pr', pr]); if (cap) hidden.push(['cap', cap]); if (view === 'map') hidden.push(['view', 'map']);
  if (adv) hidden.push(['adv', '1']);

  return (
    <>
      <div className="top">
        <a className="back" href="/"><Icon n="back" size={18} /> สำรวจ</a>
        <div className="hi">หอพัก · อพาร์ตเมนต์ · โฮมสเตย์ ในนิมมาน/ใกล้ มช.</div><h1>ที่พัก</h1>
      </div>

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

      {/* compact filter rows: single-line horizontal scroll; advanced filters collapsed behind a button */}
      <div className="facetbar frow">
        <a href={href({ view: 'list' })} className={`facet ${view === 'list' ? 'on' : ''}`}><Icon n="feed" size={13} /> รายการ</a>
        <a href={href({ view: 'map' })} className={`facet ${view === 'map' ? 'on' : ''}`}><Icon n="map" size={13} /> แผนที่</a>
        <span className="frow-sep" />
        <a href={href({ kind: '' })} className={`facet ${!kind ? 'on' : ''}`}>ทั้งหมด</a>
        {kinds.map(([k, l]) => <a key={k} href={href({ kind: k })} className={`facet ${kind === k ? 'on' : ''}`}>{l}</a>)}
      </div>
      <div className="facetbar frow">
        <a className={`facet ${adv ? 'on' : ''}`} href={href({ adv: adv ? '' : '1' })}><Icon n="dots" size={14} /> ตัวกรอง{advCount ? ` · ${advCount}` : ''} {adv ? '▲' : '▾'}</a>
        {sorts.map((srt) => <a key={srt.k} href={href({ sort: srt.k })} className={`facet ${sort === srt.k ? 'on' : ''}`}>{srt.l}</a>)}
        {advCount > 0 && <a className="facet-clear" href={href({ am: '', fr: '', pr: '', cap: '' })}>ล้าง</a>}
      </div>
      {adv && (<>
        <div className="facetbar frow">
          {PRICE[mode].map(([k, l]) => <a key={k} href={href({ pr: pr === k ? '' : k })} className={`facet ${pr === k ? 'on' : ''}`}>฿{l}</a>)}
          {CAPS.map(([k, l]) => <a key={k} href={href({ cap: cap === k ? '' : k })} className={`facet ${cap === k ? 'on' : ''}`}>{l}</a>)}
        </div>
        <div className="facetbar frow">
          {STAY_AMENITIES.map((a) => <a key={a} href={toggleAm(a)} className={`facet ${am.includes(a) ? 'on' : ''}`}>{facetLabel(a)}</a>)}
          {mode === 'monthly' && FURNISH.map(([k, l]) => <a key={k} href={href({ fr: fr === k ? '' : k })} className={`facet ${fr === k ? 'on' : ''}`}>{l}</a>)}
        </div>
      </>)}

      {view === 'map' ? (
        <>
          <StayMapView pins={pins} focus={focus} />
          {unpinned > 0 && <p className="shopnote" style={{ margin: '6px 16px' }}><Icon n="pin" size={13} /> ที่พัก {unpinned} แห่งยังไม่ได้ปักหมุด จึงยังไม่ขึ้นบนแผนที่</p>}
        </>
      ) : (
        <>
          <h2 style={{ padding: '0 16px', margin: '12px 0 2px' }}>{mode === 'monthly' ? 'ห้องเช่ารายเดือน' : 'ที่พักรายวัน'} ({rows.length})</h2>
          <div className="staylist">
            {rows.map((r) => <RoomCard key={r.id} u={r} variant="wide" placeId={r.place_id} saved={r.saved} line_id={r.line_id} phone={r.phone} shopName={i18n(r.shop_name)} shopHref={`/place/${r.place_id}`} />)}
          </div>
          {rows.length === 0 && <p className="empty">ไม่พบที่พักที่ตรงตัวกรอง — ลองเอาตัวกรองออกบ้าง</p>}
        </>
      )}
      <p className="shopnote" style={{ margin: '6px 16px 22px' }}><Icon n="chat" size={13} /> ติดต่อที่พักโดยตรงเพื่อสอบถาม/จอง — Soi Hop ยังไม่มีระบบจอง/ชำระเงินในแอป</p>
    </>
  );
}
