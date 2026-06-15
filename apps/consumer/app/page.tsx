import { q, demoUserId, i18n, cover } from '@/lib/db';
import { Icon, CAT_ICON } from './icons';

export const dynamic = 'force-dynamic';

const catTH = (c: string) => (c === 'eat' ? 'กิน' : c === 'see' ? 'เที่ยว' : 'ทำกิจกรรม');
const THM = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const CATS = [
  { i: 'coffee', l: 'คาเฟ่', qs: 'sub=cafe' }, { i: 'bowl', l: 'อาหาร', qs: 'sub=restaurant' },
  { i: 'flame', l: 'สตรีท', qs: 'sub=street_food' }, { i: 'cake', l: 'ของหวาน', qs: 'sub=dessert' },
  { i: 'landmark', l: 'เที่ยว', qs: 'cat=see' }, { i: 'palette', l: 'กิจกรรม', qs: 'cat=do' },
  { i: 'flower', l: 'สปา', qs: 'sub=spa' }, { i: 'dumbbell', l: 'มวยไทย', qs: 'sub=muay_thai' },
];
const SEGS = [{ k: '', l: 'แนะนำ' }, { k: 'near', l: 'ใกล้ฉัน' }, { k: 'hot', l: 'ฮิตตอนนี้' }, { k: 'new', l: 'มาใหม่' }];
const FILTERS = [{ k: '', l: 'ทั้งหมด' }, { k: 'eat', l: 'กิน' }, { k: 'see', l: 'เที่ยว' }, { k: 'do', l: 'ทำกิจกรรม' }];
const ORDER: Record<string, string> = {
  '': 'rv.avg DESC NULLS LAST, rv.n DESC NULLS LAST', near: 'p.verified_at DESC NULLS LAST',
  hot: 'rv.n DESC NULLS LAST, rv.avg DESC NULLS LAST', new: 'p.created_at DESC',
};
const PCOLS = `p.id, p.name_i18n, p.category::text category, p.subcategory, p.price_band::text price_band, rv.n::int rev_n, rv.avg::text rev_avg`;
const PJOIN = `FROM places p LEFT JOIN LATERAL (SELECT count(*) n, round(avg(rating),1) avg FROM reviews r
  WHERE r.place_id=p.id AND r.moderation_status='approved') rv ON true`;

async function load(tab: string, cat: string, sub: string, query: string) {
  const uid = await demoUserId();
  const isFilter = !!(cat || sub || query);
  const order = isFilter ? 'rv.n DESC NULLS LAST' : (ORDER[tab] || ORDER['']);
  const places = await q<any>(
    `SELECT ${PCOLS} ${PJOIN}
     WHERE p.status='published' AND p.is_visible
       AND ($1='' OR p.category::text=$1) AND ($2='' OR p.subcategory=$2)
       AND ($3='' OR p.name_i18n->>'th' ILIKE '%'||$3||'%' OR p.name_i18n->>'en' ILIKE '%'||$3||'%')
     ORDER BY ${order} LIMIT 40`, [cat, sub, query]);
  if (isFilter) return { mode: 'filter' as const, places };
  const community = await q<any>(
    `SELECT r.rating, r.body_i18n, pr.display_name, p.id pid, p.name_i18n pname
     FROM reviews r JOIN profiles pr ON pr.user_id=r.user_id JOIN places p ON p.id=r.place_id
     WHERE r.moderation_status='approved' ORDER BY r.created_at DESC LIMIT 5`);
  const [quest] = await q<any>(`SELECT id, title_i18n, min_steps_required FROM quests WHERE status='active' ORDER BY is_featured DESC, created_at LIMIT 1`);
  let stamps = 0;
  if (quest && uid) { const [qp] = await q<any>(`SELECT COALESCE(jsonb_array_length(steps_completed),0) n FROM quest_progress WHERE user_id=$1 AND quest_id=$2`, [uid, quest.id]); stamps = qp ? Number(qp.n) : 0; }
  const events = await q<any>(`SELECT id, title_i18n, kind, EXTRACT(DAY FROM starts_at)::int d, EXTRACT(MONTH FROM starts_at)::int m FROM events WHERE status='published' AND (ends_at IS NULL OR ends_at >= now()) ORDER BY starts_at LIMIT 6`);
  return { mode: 'home' as const, places, community, quest, stamps, events };
}

function LRow({ p, rank }: { p: any; rank?: number }) {
  const avg = p.rev_n > 0 ? Number(p.rev_avg) : null;
  const cls = avg == null ? '' : avg >= 4.5 ? 'hi' : avg >= 3.8 ? 'mid' : 'lo';
  return (
    <a className="lrow" href={`/place/${p.id}`}>
      {rank != null && <span className="rank">{rank}</span>}
      <img className="lthumb" src={cover(p.id, p.subcategory, p.category, 170, 170)} alt="" loading="lazy" />
      <div className="lc">
        <div className="lname">{i18n(p.name_i18n)}</div>
        <div className="lmeta">
          <span>{p.subcategory || catTH(p.category)}</span>
          {p.price_band && <><span className="mdot">·</span><span>{'฿'.repeat(Number(p.price_band))}</span></>}
          {p.rev_n > 0 && <><span className="mdot">·</span><span>{p.rev_n} รีวิว</span></>}
          <span className="mdot">·</span><span className="open">เปิดอยู่</span>
        </div>
      </div>
      {avg != null ? <span className={`score ${cls}`}>{avg}</span> : <span className="newbadge">ใหม่</span>}
    </a>
  );
}

export default async function Discover({ searchParams }: { searchParams: { tab?: string; cat?: string; sub?: string; q?: string } }) {
  const tab = ['near', 'hot', 'new'].includes(searchParams?.tab ?? '') ? searchParams!.tab! : '';
  const cat = ['eat', 'see', 'do'].includes(searchParams?.cat ?? '') ? searchParams!.cat! : '';
  const sub = (searchParams?.sub ?? '').replace(/[^a-z_]/g, '');
  const query = (searchParams?.q ?? '').trim().slice(0, 40);
  let d: any;
  try { d = await load(tab, cat, sub, query); }
  catch {
    return (<><div className="appbar"><div><div className="greet">Soi Hop</div><div className="loc">เชียงใหม่</div></div></div>
      <div className="body"><p className="empty">ยังต่อฐานข้อมูลไม่ได้ — รัน <code>db/test/setup-dev-db.sh</code></p></div></>);
  }

  const header = (
    <>
      <div className="appbar">
        <div><div className="greet">สำรวจรอบตัวคุณ</div>
          <div className="loc"><Icon n="pin" size={18} style={{ color: 'var(--accent)' }} /> นิมมาน, เชียงใหม่ <Icon n="chevD" size={15} /></div></div>
        <div className="acts"><span className="iconbtn"><Icon n="bell" size={21} /><span className="badge-dot" /></span><a className="avatar-btn" href="/profile">ก</a></div>
      </div>
      <form className="searchbar" action="/"><Icon n="search" size={20} />
        <input name="q" defaultValue={query} placeholder="ค้นหาร้าน ที่เที่ยว กิจกรรม…" /></form>
    </>
  );

  if (d.mode === 'filter') {
    return (
      <>
        {header}
        <div className="segmented">{FILTERS.map((f) => <a key={f.k} href={f.k ? `/?cat=${f.k}` : '/'} className={`seg ${cat === f.k && !sub ? 'on' : ''}`}>{f.l}</a>)}</div>
        <h2 style={{ padding: '0 16px', margin: '10px 0 0' }}>{query ? `“${query}”` : sub || catTH(cat)} <span className="muted">({d.places.length})</span></h2>
        <div className="llist">{d.places.map((p: any) => <LRow key={p.id} p={p} />)}</div>
        {d.places.length === 0 && <p className="empty">ไม่พบผลลัพธ์ — ลองคำอื่นหรือหมวดอื่น</p>}
      </>
    );
  }

  const need = d.quest?.min_steps_required ?? 3;
  return (
    <>
      {header}

      <div className="cats">
        {CATS.map((c) => <a className="cat" key={c.l} href={`/?${c.qs}`}><span className="ci"><Icon n={c.i} size={25} /></span><span className="cl">{c.l}</span></a>)}
      </div>

      <a className="mapbanner" href="/map">
        <span className="mi"><Icon n="map" size={22} /></span>
        <div className="mt"><div className="mtt">สำรวจบนแผนที่</div><div className="mts">ร้านใกล้คุณ {d.places.length} ที่ · กรองตามหมวดได้</div></div>
        <Icon n="chevR" size={20} style={{ color: 'var(--hint)' }} />
      </a>

      {d.quest && (
        <a className="qbanner" href="/passport" style={{ margin: '10px 16px 0' }}>
          <span className="qi"><Icon n="ticket" size={24} /></span>
          <div className="qt"><div className="qname">{i18n(d.quest.title_i18n)}</div>
            <div className="qbar"><div className="qfill" style={{ width: `${Math.round((d.stamps / need) * 100)}%` }} /></div>
            <div className="qsub">เก็บแล้ว {d.stamps}/{need} แสตมป์ · รับฟรีกาแฟ</div></div>
          <span className="qgo"><Icon n="chevR" size={20} /></span>
        </a>
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
