import { q, demoUserId, i18n, cover } from '@/lib/db';
import { Icon, CAT_ICON, KIND_ICON } from './icons';

export const dynamic = 'force-dynamic';

const catTH = (c: string) => (c === 'eat' ? 'กิน' : c === 'see' ? 'เที่ยว' : 'ทำกิจกรรม');
const THM = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const CATS = [
  { i: 'coffee', l: 'คาเฟ่', qs: 'sub=cafe' }, { i: 'bowl', l: 'ร้านอาหาร', qs: 'sub=restaurant' },
  { i: 'flame', l: 'สตรีทฟู้ด', qs: 'sub=street_food' }, { i: 'cake', l: 'ของหวาน', qs: 'sub=dessert' },
  { i: 'landmark', l: 'ที่เที่ยว', qs: 'cat=see' }, { i: 'palette', l: 'กิจกรรม', qs: 'cat=do' },
  { i: 'flower', l: 'สปา', qs: 'sub=spa' }, { i: 'dumbbell', l: 'มวยไทย', qs: 'sub=muay_thai' },
];
const FILTERS = [{ k: '', l: 'ทั้งหมด' }, { k: 'eat', l: 'กิน' }, { k: 'see', l: 'เที่ยว' }, { k: 'do', l: 'ทำกิจกรรม' }];

const PCOLS = `p.id, p.name_i18n, p.category::text category, p.subcategory, f.freshness_label::text fresh,
  rv.n::int rev_n, rv.avg::text rev_avg`;
const PJOIN = `FROM places p
  LEFT JOIN data_freshness f ON f.place_id=p.id
  LEFT JOIN LATERAL (SELECT count(*) n, round(avg(rating),1) avg FROM reviews r
                     WHERE r.place_id=p.id AND r.moderation_status='approved') rv ON true`;

async function load(cat: string, sub: string, query: string) {
  const uid = await demoUserId();
  const isFilter = !!(cat || sub || query);
  const places = await q<any>(
    `SELECT ${PCOLS} ${PJOIN}
     WHERE p.status='published' AND p.is_visible
       AND ($1='' OR p.category::text=$1) AND ($2='' OR p.subcategory=$2)
       AND ($3='' OR p.name_i18n->>'th' ILIKE '%'||$3||'%' OR p.name_i18n->>'en' ILIKE '%'||$3||'%')
     ORDER BY ${isFilter ? 'rv.n DESC NULLS LAST' : 'p.verified_at DESC NULLS LAST'} LIMIT 30`,
    [cat, sub, query]);
  if (isFilter) return { mode: 'filter' as const, places };

  const [hero] = await q<any>(
    `SELECT ${PCOLS} ${PJOIN}
     WHERE p.status='published' AND p.is_visible ORDER BY rv.n DESC NULLS LAST, rv.avg DESC NULLS LAST LIMIT 1`);
  const community = await q<any>(
    `SELECT r.rating, r.body_i18n, pr.display_name, p.id pid, p.name_i18n pname, p.subcategory psub, p.category::text pcat
     FROM reviews r JOIN profiles pr ON pr.user_id=r.user_id JOIN places p ON p.id=r.place_id
     WHERE r.moderation_status='approved' ORDER BY r.created_at DESC LIMIT 4`);
  const [quest] = await q<any>(
    `SELECT id, title_i18n, min_steps_required FROM quests WHERE status='active' ORDER BY is_featured DESC, created_at LIMIT 1`);
  let stamps = 0;
  if (quest && uid) {
    const [qp] = await q<any>(`SELECT COALESCE(jsonb_array_length(steps_completed),0) n FROM quest_progress WHERE user_id=$1 AND quest_id=$2`, [uid, quest.id]);
    stamps = qp ? Number(qp.n) : 0;
  }
  const events = await q<any>(
    `SELECT id, title_i18n, kind, is_recurring, EXTRACT(DAY FROM starts_at)::int d, EXTRACT(MONTH FROM starts_at)::int m
     FROM events WHERE status='published' AND (ends_at IS NULL OR ends_at >= now()) ORDER BY starts_at LIMIT 4`);
  const nearby = places.filter((p: any) => p.id !== hero?.id).slice(0, 10);
  return { mode: 'home' as const, hero, nearby, community, quest, stamps, events };
}

const Stars = ({ v, size = 13 }: { v: string; size?: number }) =>
  <span className="rate"><Icon n="star" fill="currentColor" size={size} /> {v}</span>;

function MiniCard({ p }: { p: any }) {
  return (
    <a className="mini" href={`/place/${p.id}`}>
      <div className="ph"><img src={cover(p.id, p.subcategory, p.category, 440, 300)} alt="" loading="lazy" /><div className="scrim" style={{ opacity: .28 }} /></div>
      <div className="mb"><div className="nm">{i18n(p.name_i18n)}</div>
        <div className="mmeta">{p.rev_n > 0 ? <Stars v={p.rev_avg} /> : <span>ใหม่</span>}<span className="sep">·</span><span>{catTH(p.category)}</span></div></div>
    </a>
  );
}

export default async function Discover({ searchParams }: { searchParams: { cat?: string; sub?: string; q?: string } }) {
  const cat = ['eat', 'see', 'do'].includes(searchParams?.cat ?? '') ? searchParams!.cat! : '';
  const sub = (searchParams?.sub ?? '').replace(/[^a-z_]/g, '');
  const query = (searchParams?.q ?? '').trim().slice(0, 40);
  let d: any;
  try { d = await load(cat, sub, query); }
  catch {
    return (<><div className="appbar"><div><div className="greet">Soi Hop</div><div className="loc">เชียงใหม่</div></div></div>
      <div className="body"><p className="empty">ยังต่อฐานข้อมูลไม่ได้ — รัน <code>db/test/setup-dev-db.sh</code></p></div></>);
  }

  const header = (
    <>
      <div className="appbar">
        <div><div className="greet">สำรวจรอบตัวคุณ</div>
          <div className="loc"><Icon n="pin" size={18} style={{ color: 'var(--accent)' }} /> นิมมาน, เชียงใหม่ <Icon n="chevD" size={15} /></div></div>
        <div className="acts">
          <span className="iconbtn"><Icon n="bell" size={21} /><span className="badge-dot" /></span>
          <a className="avatar-btn" href="/profile">ก</a>
        </div>
      </div>
      <form className="searchbar" action="/"><Icon n="search" size={20} />
        <input name="q" defaultValue={query} placeholder="ค้นหาร้าน ที่เที่ยว กิจกรรม รอบตัวคุณ…" /></form>
    </>
  );

  if (d.mode === 'filter') {
    return (
      <>
        {header}
        <div className="filters">
          {FILTERS.map((f) => <a key={f.k} href={f.k ? `/?cat=${f.k}` : '/'} className={`fpill ${cat === f.k && !sub ? 'on' : ''}`}>{f.l}</a>)}
        </div>
        <div className="body" style={{ paddingTop: 8 }}>
          <h2 style={{ marginTop: 4 }}>{query ? `ผลค้นหา “${query}”` : sub ? sub : catTH(cat)} <span className="muted">({d.places.length})</span></h2>
          {d.places.map((p: any) => (
            <a className="pcard" key={p.id} href={`/place/${p.id}`}>
              <div className="ph"><img src={cover(p.id)} alt="" loading="lazy" /><div className="scrim" />
                {p.fresh === 'fresh' && <span className="chip-top frost"><Icon n="check" size={13} /> ตรวจสอบแล้ว</span>}</div>
              <div className="cc"><div className="eyebrow">{catTH(p.category)}{p.subcategory ? ` · ${p.subcategory}` : ''}</div>
                <div className="nm">{i18n(p.name_i18n)}</div>
                <div className="meta">{p.rev_n > 0 && <Stars v={p.rev_avg} size={14} />}{p.rev_n > 0 && <span className="sep">·</span>}<span>เดิน 4 นาที</span></div></div>
            </a>
          ))}
          {d.places.length === 0 && <p className="empty">ไม่พบผลลัพธ์ — ลองคำอื่นหรือเลือกหมวดอื่น</p>}
        </div>
      </>
    );
  }

  const need = d.quest?.min_steps_required ?? 3;
  return (
    <>
      {header}

      <div className="cats">
        {CATS.map((c) => (
          <a className="cat" key={c.l} href={`/?${c.qs}`}><span className="ci"><Icon n={c.i} size={26} /></span><span className="cl">{c.l}</span></a>
        ))}
      </div>

      {d.hero && (
        <a className="edhero" href={`/place/${d.hero.id}`}>
          <img src={cover(d.hero.id, d.hero.subcategory, d.hero.category, 680, 850)} alt="" />
          <div className="scrim" />
          <span className="frost" style={{ position: 'absolute', top: 14, left: 14 }}><Icon n={CAT_ICON[d.hero.subcategory] || CAT_ICON[d.hero.category]} size={14} /> {catTH(d.hero.category)}</span>
          <span className="bm"><Icon n="bookmark" size={18} /></span>
          <div className="ec">
            <div className="eyebrow" style={{ color: 'rgba(255,255,255,.85)' }}>ที่เด็ดประจำย่าน</div>
            <h2>{i18n(d.hero.name_i18n)}</h2>
            <div className="em">{d.hero.rev_n > 0 && <><span className="rate" style={{ color: '#fff' }}><Icon n="star" fill="#FFC95A" size={15} style={{ color: '#FFC95A' }} /> {d.hero.rev_avg}</span><span className="sep">·</span></>}<span>{d.hero.subcategory || catTH(d.hero.category)} · เดิน 5 นาที</span></div>
          </div>
        </a>
      )}

      {d.nearby.length > 0 && (
        <>
          <div className="sec"><h2>ใกล้คุณตอนนี้</h2><a className="more" href="/map"><Icon n="map" size={14} style={{ verticalAlign: '-.2em' }} /> ดูบนแผนที่</a></div>
          <div className="hscroll">{d.nearby.map((p: any) => <MiniCard key={p.id} p={p} />)}</div>
        </>
      )}

      {d.community.length > 0 && (
        <>
          <div className="sec"><h2>ชุมชนกำลังพูดถึง</h2><a className="more" href="/community">ดูทั้งหมด</a></div>
          {d.community.map((r: any, i: number) => (
            <a className="crev" key={i} href={`/place/${r.pid}`}>
              <img className="cphoto" src={cover(r.pid, r.psub, r.pcat, 160, 160)} alt="" loading="lazy" />
              <div className="cw">
                <div className="ctop"><span className="avatar">{(r.display_name || 'ผ')[0]}</span><span className="cname">{r.display_name || 'ผู้ใช้'}</span>
                  <span className="cstars">{Array.from({ length: r.rating }).map((_, k) => <Icon key={k} n="star" fill="currentColor" size={12} />)}</span></div>
                <div className="cbody">{i18n(r.body_i18n)}</div>
                <div className="cplace"><Icon n="pin" size={13} className="flat-ico" /> {i18n(r.pname)}</div>
              </div>
            </a>
          ))}
        </>
      )}

      {d.quest && (
        <>
          <div className="sec"><h2>ภารกิจสะสมแสตมป์</h2></div>
          <a className="qbanner" href="/passport">
            <span className="qi"><Icon n="ticket" size={24} /></span>
            <div className="qt">
              <div className="qname">{i18n(d.quest.title_i18n)}</div>
              <div className="qbar"><div className="qfill" style={{ width: `${Math.round((d.stamps / need) * 100)}%` }} /></div>
              <div className="qsub">เก็บแล้ว {d.stamps}/{need} แสตมป์ · รับฟรีกาแฟ</div>
            </div>
            <span className="qgo"><Icon n="chevR" size={20} /></span>
          </a>
        </>
      )}

      {d.events.length > 0 && (
        <>
          <div className="sec"><h2>กิจกรรมเร็วๆ นี้</h2></div>
          <div className="body" style={{ paddingTop: 0, paddingBottom: 0 }}>
            {d.events.map((e: any) => (
              <a className="erow" key={e.id} href={`/event/${e.id}`}><div className="ethumb"><Icon n={KIND_ICON[e.kind] || 'sparkles'} size={26} /></div>
                <div><div className="nm">{i18n(e.title_i18n)}</div><div className="meta"><Icon n="calendar" size={13} className="flat-ico" style={{ color: 'var(--muted)' }} /> {e.d} {THM[e.m - 1]}{e.is_recurring ? ' · ทุกสัปดาห์' : ''}</div></div>
                <span className="chev"><Icon n="chevR" size={18} /></span></a>
            ))}
          </div>
        </>
      )}
      <div style={{ height: 8 }} />
    </>
  );
}
