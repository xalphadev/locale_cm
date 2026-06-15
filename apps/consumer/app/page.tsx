import { q, demoUserId, i18n, cover, getLocale } from '@/lib/db';
import { Icon, CAT_ICON } from './icons';
import MapPeek from './MapPeek';
import LangSwitch from './LangSwitch';
import { facetsFor, facetLabel } from '@/lib/facets';
import { parse as parseIntent } from '@/lib/intent';

export const dynamic = 'force-dynamic';

function parsePoint(geo: string | null) {
  if (!geo) return null;
  const m = /POINT\(([-\d.]+)\s+([-\d.]+)\)/i.exec(geo);
  return m ? { lng: parseFloat(m[1]), lat: parseFloat(m[2]) } : null;
}

const catTH = (c: string) => (c === 'eat' ? 'กิน' : c === 'see' ? 'เที่ยว' : 'ทำกิจกรรม');
const dealLabel = (t: string, pct: any, minor: any) =>
  t === 'percent_off' ? `ลด ${Math.round(Number(pct))}%` : t === 'fixed_off' ? `ลด ฿${Math.round(Number(minor) / 100)}`
    : t === 'bogo' ? '1 แถม 1' : t === 'freebie' ? 'ของแถมฟรี' : 'ดีล';
const daysLeft = (e: any) => (e ? Math.max(0, Math.ceil((new Date(e).getTime() - Date.now()) / 86400000)) : null);
const THM =['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const CATS = [
  { i: 'coffee', l: 'คาเฟ่', qs: 'sub=cafe' }, { i: 'bowl', l: 'อาหาร', qs: 'sub=restaurant' },
  { i: 'flame', l: 'สตรีท', qs: 'sub=street_food' }, { i: 'cake', l: 'ของหวาน', qs: 'sub=dessert' },
  { i: 'bed', l: 'ที่พัก', to: '/stay' }, { i: 'landmark', l: 'เที่ยว', qs: 'cat=see' },
  { i: 'palette', l: 'กิจกรรม', qs: 'cat=do' }, { i: 'tag', l: 'ตลาด', to: '/market' },
  { i: 'flower', l: 'สปา', qs: 'sub=spa' },
];
const SEGS = [{ k: '', l: 'แนะนำ' }, { k: 'near', l: 'ใกล้ฉัน' }, { k: 'hot', l: 'ฮิตตอนนี้' }, { k: 'new', l: 'มาใหม่' }];
const FILTERS = [{ k: '', l: 'ทั้งหมด' }, { k: 'eat', l: 'กิน' }, { k: 'see', l: 'เที่ยว' }, { k: 'do', l: 'ทำกิจกรรม' }];
// Fair-ranking: discovery sorts by freshness/relevance, NOT by descending stars (don't bury
// good small/new venues). "ฮิต" is the only popularity sort, and it's by review COUNT, not avg.
const ORDER: Record<string, string> = {
  '': 'p.verified_at DESC NULLS LAST', near: 'p.verified_at DESC NULLS LAST',
  hot: 'rv.n DESC NULLS LAST', new: 'p.created_at DESC',
};
const MIN_REVIEWS = 5; // below this we don't show a numeric score (anti-volatility for small shops)
function venueBadge(n: number, avg: number): { l: string; c: string } | null {
  if (n < MIN_REVIEWS) return null;
  if (n >= 10) return { l: 'ยอดนิยม', c: 'pop' };
  if (avg >= 4.6) return { l: 'ร้านลับ น่าค้นหา', c: 'gem' };
  if (avg >= 4.2) return { l: 'เป็นที่รัก', c: 'loved' };
  return null;
}
const PCOLS = `p.id, p.name_i18n, p.category::text category, p.subcategory, p.price_band::text price_band,
  rv.n::int rev_n, rv.avg::text rev_avg, dl.deal_type::text deal_type, dl.value_pct, dl.value_minor, (vid.x IS NOT NULL) has_video`;
const PJOIN = `FROM places p
  LEFT JOIN LATERAL (SELECT count(*) n, round(avg(rating),1) avg FROM reviews r
    WHERE r.place_id=p.id AND r.moderation_status='approved') rv ON true
  LEFT JOIN LATERAL (SELECT deal_type, value_pct, value_minor FROM deals d2
    WHERE d2.place_id=p.id AND d2.status='active' AND (d2.ends_at IS NULL OR d2.ends_at>=now()) ORDER BY d2.ends_at NULLS LAST LIMIT 1) dl ON true
  LEFT JOIN LATERAL (SELECT 1 x FROM media mv
    WHERE mv.owner_type='place' AND mv.owner_id=p.id AND mv.kind='video' AND mv.moderation_status='approved' LIMIT 1) vid ON true`;

async function load(tab: string, cat: string, sub: string, query: string, facets: string[], wantResults = false) {
  const uid = await demoUserId();
  const isFilter = !!(cat || sub || query || facets.length || wantResults);
  const order = isFilter ? 'p.verified_at DESC NULLS LAST' : (ORDER[tab] || ORDER['']);
  const places = await q<any>(
    `SELECT ${PCOLS} ${PJOIN}
     WHERE p.status='published' AND p.is_visible
       AND ($1='' OR p.category::text=$1) AND ($2='' OR p.subcategory=$2)
       AND ($3='' OR p.name_i18n->>'th' ILIKE '%'||$3||'%' OR p.name_i18n->>'en' ILIKE '%'||$3||'%')
       AND (cardinality($4::text[])=0 OR p.amenities @> $4::text[])
     ORDER BY ${order} LIMIT 40`, [cat, sub, query, facets]);
  if (isFilter) return { mode: 'filter' as const, places };
  const community = await q<any>(
    `SELECT r.rating, r.body_i18n, pr.display_name, p.id pid, p.name_i18n pname
     FROM reviews r JOIN profiles pr ON pr.user_id=r.user_id JOIN places p ON p.id=r.place_id
     WHERE r.moderation_status='approved' ORDER BY r.created_at DESC LIMIT 5`);
  const [quest] = await q<any>(`SELECT id, title_i18n, min_steps_required FROM quests WHERE status='active' ORDER BY is_featured DESC, created_at LIMIT 1`);
  let stamps = 0;
  if (quest && uid) { const [qp] = await q<any>(`SELECT COALESCE(jsonb_array_length(steps_completed),0) n FROM quest_progress WHERE user_id=$1 AND quest_id=$2`, [uid, quest.id]); stamps = qp ? Number(qp.n) : 0; }
  const events = await q<any>(`SELECT id, title_i18n, kind, EXTRACT(DAY FROM starts_at)::int d, EXTRACT(MONTH FROM starts_at)::int m FROM events WHERE status='published' AND (ends_at IS NULL OR ends_at >= now()) ORDER BY starts_at LIMIT 6`);
  const pinRows = await q<any>(`SELECT geo::text geo, category::text cat FROM places WHERE status='published' AND is_visible`);
  const pins = pinRows.map((r) => { const pt = parsePoint(r.geo); return pt ? { lat: pt.lat, lng: pt.lng, cat: r.cat } : null; }).filter(Boolean);
  const deals = await q<any>(
    `SELECT d.id, d.place_id, d.deal_type::text deal_type, d.value_pct, d.value_minor, d.title_i18n,
            d.ends_at, d.quota_total, d.quota_used, p.name_i18n pname, p.subcategory psub, p.category::text pcat
     FROM deals d JOIN places p ON p.id=d.place_id
     WHERE d.status='active' AND (d.ends_at IS NULL OR d.ends_at>=now()) ORDER BY d.ends_at NULLS LAST LIMIT 8`);
  return { mode: 'home' as const, places, community, quest, stamps, events, pins, deals };
}

function LRow({ p, rank }: { p: any; rank?: number }) {
  const n = p.rev_n || 0;
  const avg = Number(p.rev_avg) || 0;
  const scored = n >= MIN_REVIEWS;
  const cls = avg >= 4.5 ? 'hi' : avg >= 3.8 ? 'mid' : 'lo';
  const vb = venueBadge(n, avg);
  return (
    <a className="lrow" href={`/place/${p.id}`} style={rank != null ? { animationDelay: `${Math.min(rank, 14) * 26}ms` } : undefined}>
      {rank != null && <span className="rank">{rank}</span>}
      <span className="lthumb-wrap">
        <img className="lthumb" src={cover(p.id, p.subcategory, p.category, 170, 170)} alt="" loading="lazy" />
        {p.has_video && <span className="vidbadge"><Icon n="play" size={11} fill="currentColor" /></span>}
      </span>
      <div className="lc">
        <div className="lname">{i18n(p.name_i18n)}</div>
        <div className="lmeta">
          {p.deal_type && <span className="promopill"><Icon n="tag" size={10} /> {dealLabel(p.deal_type, p.value_pct, p.value_minor)}</span>}
          {vb && <span className={`btag ${vb.c}`}>{vb.l}</span>}
          <span>{p.subcategory || catTH(p.category)}</span>
          {p.price_band && <><span className="mdot">·</span><span>{'฿'.repeat(Number(p.price_band))}</span></>}
          {scored && <><span className="mdot">·</span><span>{n} รีวิว</span></>}
        </div>
      </div>
      {scored
        ? <span className={`score ${cls}`}>{p.rev_avg}</span>
        : <span className="newbadge">ใหม่<br />น่าลอง</span>}
    </a>
  );
}

export default async function Discover({ searchParams }: { searchParams: { tab?: string; cat?: string; sub?: string; q?: string; f?: string } }) {
  const tab = ['near', 'hot', 'new'].includes(searchParams?.tab ?? '') ? searchParams!.tab! : '';
  let cat = ['eat', 'see', 'do'].includes(searchParams?.cat ?? '') ? searchParams!.cat! : '';
  let sub = (searchParams?.sub ?? '').replace(/[^a-z_]/g, '');
  const query = (searchParams?.q ?? '').trim().slice(0, 80);
  let facets = (searchParams?.f ?? '').split(',').map((s) => s.replace(/[^a-z_]/g, '')).filter(Boolean).slice(0, 8);

  // natural-language search: "คาเฟ่ใกล้ๆ มี wifi" → structured filters
  let nameQ = '', nearMe = false; let interpChips: string[] = [];
  if (query) {
    const it = parseIntent(query);
    if (it.matched) {
      if (it.sub) sub = it.sub; else if (it.cat) cat = it.cat;
      facets = [...new Set([...facets, ...it.facets])];
      nearMe = it.nearMe; interpChips = it.chips;
    } else { nameQ = query; }
  }

  let d: any;
  try { d = await load(tab, cat, sub, nameQ, facets, !!query); }
  catch {
    return (<><div className="appbar"><div><div className="greet">Soi Hop</div><div className="loc">เชียงใหม่</div></div></div>
      <div className="body"><p className="empty">ยังต่อฐานข้อมูลไม่ได้ — รัน <code>db/test/setup-dev-db.sh</code></p></div></>);
  }

  const header = (
    <>
      <div className="appbar">
        <div><div className="greet">สำรวจรอบตัวคุณ</div>
          <div className="loc"><Icon n="pin" size={18} style={{ color: 'var(--accent)' }} /> นิมมาน, เชียงใหม่ <Icon n="chevD" size={15} /></div></div>
        <div className="acts"><LangSwitch cur={getLocale()} /><a className="avatar-btn" href="/profile">ก</a></div>
      </div>
      <form className="searchbar" action="/"><Icon n="search" size={20} />
        <input name="q" defaultValue={query} placeholder="ลองพิมพ์: คาเฟ่ใกล้ๆ มี wifi" /></form>
    </>
  );

  if (d.mode === 'filter') {
    const fset = new Set(facets);
    const baseParams: string[] = [];
    if (nameQ) baseParams.push(`q=${encodeURIComponent(nameQ)}`);
    else { if (cat) baseParams.push(`cat=${cat}`); if (sub) baseParams.push(`sub=${sub}`); }
    const facetHref = (tok: string | null) => {
      const n = new Set(fset); if (tok) (n.has(tok) ? n.delete(tok) : n.add(tok));
      const ps = [...baseParams]; if (tok && n.size) ps.push(`f=${[...n].join(',')}`);
      return ps.length ? `/?${ps.join('&')}` : '/';
    };
    const offered = facetsFor(cat, sub);
    return (
      <>
        {header}
        {interpChips.length > 0 && (
          <div className="interp">
            <span className="interp-h"><Icon n="sparkles" size={15} style={{ color: 'var(--accent)' }} /> แนะนำสำหรับ</span>
            {interpChips.map((c, i) => <span className="ichip" key={i}>{c}</span>)}
          </div>
        )}
        {nearMe && <a className="nearcta" href="/map"><Icon n="locate" size={16} /> เรียงตามระยะใกล้ฉันบนแผนที่ →</a>}
        <div className="segmented">{FILTERS.map((f) => <a key={f.k} href={f.k ? `/?cat=${f.k}` : '/'} className={`seg ${cat === f.k && !sub ? 'on' : ''}`}>{f.l}</a>)}</div>
        {offered.length > 0 && (
          <div className="facetbar">
            {offered.map((tok) => <a key={tok} href={facetHref(tok)} className={`facet ${fset.has(tok) ? 'on' : ''}`}>{facetLabel(tok)}</a>)}
            {facets.length > 0 && <a className="facet-clear" href={facetHref(null)}>ล้าง</a>}
          </div>
        )}
        <h2 style={{ padding: '0 16px', margin: '10px 0 0' }}>{interpChips.length ? `พบ ${d.places.length} ที่ตรงใจ` : nameQ ? `“${nameQ}” (${d.places.length})` : `${sub ? facetLabel(sub) : catTH(cat)} (${d.places.length})`}</h2>
        <div className="llist">{d.places.map((p: any) => <LRow key={p.id} p={p} />)}</div>
        {d.places.length === 0 && <p className="empty">ไม่พบร้านที่ตรงตัวกรอง — ลองเอาตัวกรองออกบ้าง</p>}
      </>
    );
  }

  const need = d.quest?.min_steps_required ?? 3;
  return (
    <>
      {header}

      <div className="cats">
        {CATS.map((c) => <a className="cat" key={c.l} href={(c as any).to || `/?${(c as any).qs}`}><span className="ci"><Icon n={c.i} size={25} /></span><span className="cl">{c.l}</span></a>)}
      </div>

      <MapPeek pins={d.pins} />

      {d.quest && (
        <a className="qbanner" href="/passport" style={{ margin: '10px 16px 0' }}>
          <span className="qi"><Icon n="ticket" size={24} /></span>
          <div className="qt"><div className="qname">{i18n(d.quest.title_i18n)}</div>
            <div className="qbar"><div className="qfill" style={{ width: `${Math.round((d.stamps / need) * 100)}%` }} /></div>
            <div className="qsub">เก็บแล้ว {d.stamps}/{need} แสตมป์ · รับฟรีกาแฟ</div></div>
          <span className="qgo"><Icon n="chevR" size={20} /></span>
        </a>
      )}

      {d.deals.length > 0 && (
        <>
          <div className="sec"><h2>ดีลเด็ดใกล้คุณ</h2><span className="more" style={{ color: 'var(--muted)' }}>{d.deals.length} โปรฯ</span></div>
          <div className="dealrail">
            {d.deals.map((dl: any) => {
              const left = dl.quota_total ? dl.quota_total - dl.quota_used : null;
              const dd = daysLeft(dl.ends_at);
              return (
                <a className="dealc" key={dl.id} href={`/place/${dl.place_id}`}>
                  <div className="dp"><img src={cover(dl.place_id, dl.psub, dl.pcat, 360, 200)} alt="" loading="lazy" />
                    <span className="dbadge">{dealLabel(dl.deal_type, dl.value_pct, dl.value_minor)}</span></div>
                  <div className="db">
                    <div className="dnm">{i18n(dl.pname)}</div>
                    <div className="dt">{i18n(dl.title_i18n)}</div>
                    <div className="durg">
                      {dd != null && <span className="u1"><Icon n="clock2" size={12} className="flat-ico" style={{ color: 'var(--accent)' }} /> {dd === 0 ? 'วันสุดท้าย!' : `อีก ${dd} วัน`}</span>}
                      {left != null && <span className="u2">เหลือ {left} สิทธิ์</span>}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </>
      )}

      <div className="segmented">{SEGS.map((s) => <a key={s.k} href={s.k ? `/?tab=${s.k}` : '/'} className={`seg ${tab === s.k ? 'on' : ''}`}>{s.l}</a>)}</div>
      <div className="llist">{d.places.map((p: any, i: number) => <LRow key={p.id} p={p} rank={i + 1} />)}</div>

      {d.community.length > 0 && (
        <>
          <div className="sec"><h2>เพื่อนบ้านพูดถึง</h2><a className="more" href="/community">ดูทั้งหมด</a></div>
          <div className="llist">
            {d.community.map((r: any, i: number) => (
              <a className="act" key={i} href={`/place/${r.pid}`}>
                <span className="aav">{(r.display_name || 'ผ')[0]}</span>
                <div className="aw">
                  <div className="al"><b>{r.display_name}</b> รีวิว <b>{i18n(r.pname)}</b></div>
                  <div className="ab">{i18n(r.body_i18n)}</div>
                  <div className="as">{Array.from({ length: r.rating }).map((_, k) => <Icon key={k} n="star" fill="currentColor" size={12} />)}</div>
                </div>
              </a>
            ))}
          </div>
        </>
      )}

      {d.events.length > 0 && (
        <>
          <div className="sec"><h2>กิจกรรมเร็วๆ นี้</h2></div>
          <div className="crail">
            {d.events.map((e: any) => (
              <a className="emini" key={e.id} href={`/event/${e.id}`}>
                <div className="ep"><img src={cover('event' + e.id, e.kind, 'see', 320, 220)} alt="" loading="lazy" /></div>
                <div className="eb"><div className="en">{i18n(e.title_i18n)}</div>
                  <div className="ed"><Icon n="calendar" size={12} className="flat-ico" style={{ color: 'var(--muted)' }} /> {e.d} {THM[e.m - 1]}</div></div>
              </a>
            ))}
          </div>
        </>
      )}
      <div style={{ height: 6 }} />
    </>
  );
}
