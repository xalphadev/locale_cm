import { q, demoUserId, i18n, cover } from '@/lib/db';

export const dynamic = 'force-dynamic';

const catTH = (c: string) => (c === 'eat' ? 'กิน' : c === 'see' ? 'เที่ยว' : 'ทำกิจกรรม');
const eIcon = (k: string) => ({ festival: '🎆', market: '🛍️', performance: '🎭', workshop: '🎨', seasonal: '🌸' } as any)[k] ?? '✨';
const THM = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const CATS = [
  { e: '☕', l: 'คาเฟ่', qs: 'sub=cafe' }, { e: '🍜', l: 'ร้านอาหาร', qs: 'sub=restaurant' },
  { e: '🌶️', l: 'สตรีทฟู้ด', qs: 'sub=street_food' }, { e: '🍰', l: 'ของหวาน', qs: 'sub=dessert' },
  { e: '⛩️', l: 'ที่เที่ยว', qs: 'cat=see' }, { e: '🎨', l: 'กิจกรรม', qs: 'cat=do' },
  { e: '💆', l: 'สปา', qs: 'sub=spa' }, { e: '🥊', l: 'มวยไทย', qs: 'sub=muay_thai' },
];
const FILTERS = [{ k: '', l: 'ทั้งหมด' }, { k: 'eat', l: '☕ กิน' }, { k: 'see', l: '⛩️ เที่ยว' }, { k: 'do', l: '🎨 ทำกิจกรรม' }];

const PLACE_COLS = `p.id, p.name_i18n, p.category::text category, p.subcategory, f.freshness_label::text fresh,
  rv.n::int rev_n, rv.avg::text rev_avg`;
const PLACE_JOIN = `FROM places p
  LEFT JOIN data_freshness f ON f.place_id=p.id
  LEFT JOIN LATERAL (SELECT count(*) n, round(avg(rating),1) avg FROM reviews r
                     WHERE r.place_id=p.id AND r.moderation_status='approved') rv ON true`;

async function load(cat: string, sub: string, query: string) {
  const uid = await demoUserId();
  const isFilter = !!(cat || sub || query);

  const places = await q<any>(
    `SELECT ${PLACE_COLS} ${PLACE_JOIN}
     WHERE p.status='published' AND p.is_visible
       AND ($1='' OR p.category::text=$1) AND ($2='' OR p.subcategory=$2)
       AND ($3='' OR p.name_i18n->>'th' ILIKE '%'||$3||'%' OR p.name_i18n->>'en' ILIKE '%'||$3||'%')
     ORDER BY ${isFilter ? 'rv.n DESC NULLS LAST' : 'p.verified_at DESC NULLS LAST'} LIMIT 30`,
    [cat, sub, query]);
  if (isFilter) return { mode: 'filter' as const, places };

  const popular = await q<any>(
    `SELECT ${PLACE_COLS} ${PLACE_JOIN}
     WHERE p.status='published' AND p.is_visible ORDER BY rv.n DESC NULLS LAST, rv.avg DESC NULLS LAST LIMIT 10`);
  const community = await q<any>(
    `SELECT r.rating, r.body_i18n, pr.display_name, p.id pid, p.name_i18n pname, p.category::text pcat
     FROM reviews r JOIN profiles pr ON pr.user_id=r.user_id JOIN places p ON p.id=r.place_id
     WHERE r.moderation_status='approved' ORDER BY r.created_at DESC LIMIT 8`);
  const [quest] = await q<any>(
    `SELECT id, title_i18n, min_steps_required FROM quests WHERE status='active' ORDER BY is_featured DESC, created_at LIMIT 1`);
  let stamps = 0;
  if (quest && uid) {
    const [qp] = await q<any>(`SELECT COALESCE(jsonb_array_length(steps_completed),0) n FROM quest_progress WHERE user_id=$1 AND quest_id=$2`, [uid, quest.id]);
    stamps = qp ? Number(qp.n) : 0;
  }
  const events = await q<any>(
    `SELECT id, title_i18n, kind, is_recurring, EXTRACT(DAY FROM starts_at)::int d, EXTRACT(MONTH FROM starts_at)::int m
     FROM events WHERE status='published' AND (ends_at IS NULL OR ends_at >= now()) ORDER BY starts_at LIMIT 6`);
  return { mode: 'home' as const, places, popular, community, quest, stamps, events };
}

function MiniCard({ p }: { p: any }) {
  return (
    <a className="mini" href={`/place/${p.id}`}>
      <div className="ph"><img src={cover(p.id, 420, 280)} alt="" loading="lazy" /><div className="scrim" style={{ opacity: .35 }} />
        {p.fresh === 'fresh' && <span className="chip-top frost"><span className="gdot" style={{ background: '#36D399' }} /></span>}</div>
      <div className="mb">
        <div className="nm">{i18n(p.name_i18n)}</div>
        <div className="mmeta">
          {p.rev_n > 0 ? <span className="rate"><span className="s">★</span> {p.rev_avg} <span style={{ opacity: .7 }}>({p.rev_n})</span></span> : <span>ใหม่</span>}
          <span className="sep">·</span><span>{catTH(p.category)}</span>
        </div>
      </div>
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

  // ── App bar + search (shared) ──
  const header = (
    <>
      <div className="appbar">
        <div><div className="greet">สวัสดีตอนบ่าย ☀️</div><div className="loc">📍 นิมมานเหมินท์ ▾</div></div>
        <div className="acts">
          <span className="iconbtn">🔔<span className="badge-dot" /></span>
          <span className="avatar-btn">ก</span>
        </div>
      </div>
      <form className="searchbar" action="/"><span>🔍</span>
        <input name="q" defaultValue={query} placeholder="ค้นหาร้าน ที่เที่ยว กิจกรรม รอบตัวคุณ…" /></form>
    </>
  );

  // ── FILTER / SEARCH RESULTS ──
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
                {p.fresh === 'fresh' && <span className="chip-top frost"><span className="gdot" style={{ background: '#36D399' }} /> ตรวจสอบล่าสุด</span>}</div>
              <div className="cc"><div className="eyebrow">{catTH(p.category)}{p.subcategory ? ` · ${p.subcategory}` : ''}</div>
                <div className="nm">{i18n(p.name_i18n)}</div>
                <div className="meta">{p.rev_n > 0 && <span className="rate"><span className="s">★</span> {p.rev_avg} ({p.rev_n})</span>}{p.rev_n > 0 && <span className="sep">·</span>}<span>เดิน 4 นาที</span></div></div>
            </a>
          ))}
          {d.places.length === 0 && <p className="empty">ไม่พบผลลัพธ์ — ลองคำอื่นหรือเลือกหมวดอื่น</p>}
        </div>
      </>
    );
  }

  // ── HOME FEED ──
  const need = d.quest?.min_steps_required ?? 3;
  return (
    <>
      {header}

      {/* quick category icons */}
      <div className="cats">
        {CATS.map((c) => (
          <a className="cat" key={c.l} href={`/?${c.qs}`}><span className="ci">{c.e}</span><span className="cl">{c.l}</span></a>
        ))}
      </div>

      {/* stories — new in the neighborhood */}
      {d.places.length > 0 && (
        <div className="stories">
          {d.places.slice(0, 8).map((p: any) => (
            <a className="story" key={p.id} href={`/place/${p.id}`}>
              <div className="ring"><img src={cover(p.id, 160, 160)} alt="" loading="lazy" /></div>
              <div className="sl">{i18n(p.name_i18n)}</div>
            </a>
          ))}
        </div>
      )}

      {/* featured carousel */}
      <div className="sec"><h2>น่าสนใจวันนี้</h2></div>
      <div className="hscroll">
        {d.quest && (
          <a className="feat" href="/passport">
            <img src={cover('quest' + d.quest.id, 600, 750)} alt="" />
            <div className="scrim" />
            <span className="chip-top frost"><span className="gdot" /> ภารกิจ</span>
            <div className="fc"><div className="eyebrow">QUEST</div><h3>{i18n(d.quest.title_i18n)}</h3>
              <div className="meta">เก็บ {need} แสตมป์ · ฟรีกาแฟ</div></div>
          </a>
        )}
        {d.popular.slice(0, 6).map((p: any) => (
          <a className="feat" key={p.id} href={`/place/${p.id}`}>
            <img src={cover(p.id, 600, 750)} alt="" loading="lazy" /><div className="scrim" />
            <div className="fc"><div className="eyebrow">{catTH(p.category)}{p.subcategory ? ` · ${p.subcategory}` : ''}</div>
              <h3>{i18n(p.name_i18n)}</h3>
              <div className="meta">{p.rev_n > 0 && <span className="rate"><span className="s">★</span> {p.rev_avg}</span>}{p.rev_n > 0 && <span className="sep">·</span>}<span>เดิน 4 นาที</span></div></div>
          </a>
        ))}
      </div>

      {/* popular carousel */}
      <div className="sec"><h2>🔥 ฮิตตอนนี้</h2><a className="more" href="/?cat=eat">ดูทั้งหมด</a></div>
      <div className="hscroll">{d.popular.map((p: any) => <MiniCard key={p.id} p={p} />)}</div>

      {/* community reviews feed — the "soul" */}
      {d.community.length > 0 && (
        <>
          <div className="sec"><h2>💬 รีวิวล่าสุดจากชุมชน</h2></div>
          {d.community.map((r: any, i: number) => (
            <a className="crev" key={i} href={`/place/${r.pid}`}>
              <img className="cphoto" src={cover(r.pid, 160, 160)} alt="" loading="lazy" />
              <div className="cw">
                <div className="ctop"><span className="avatar">{(r.display_name || 'ผ')[0]}</span><span className="cname">{r.display_name || 'ผู้ใช้'}</span>
                  <span className="cstars">{'★'.repeat(r.rating)}</span></div>
                <div className="cbody">{i18n(r.body_i18n)}</div>
                <div className="cplace">📍 {i18n(r.pname)}</div>
              </div>
            </a>
          ))}
        </>
      )}

      {/* quest mini (demoted, not the headline) */}
      {d.quest && (
        <>
          <div className="sec"><h2>🎯 ภารกิจสะสมแสตมป์</h2></div>
          <a className="qmini" href="/passport">
            <img src={cover('q2' + d.quest.id, 640, 360)} alt="" />
            <div className="scrim" />
            <div className="qc"><div className="eyebrow" style={{ color: 'rgba(255,255,255,.85)' }}>เดินซอย เก็บแสตมป์</div>
              <h3>{i18n(d.quest.title_i18n)}</h3>
              <div className="qtrack">
                {Array.from({ length: need }).map((_, i) => <span key={i} className={`qs ${i < d.stamps ? 'on' : ''}`}>{i < d.stamps ? '✓' : i + 1}</span>)}
                <span style={{ marginLeft: 8, fontSize: '.82rem' }}>{d.stamps}/{need} · ฟรีกาแฟ</span>
              </div>
            </div>
          </a>
        </>
      )}

      {/* events */}
      {d.events.length > 0 && (
        <>
          <div className="sec"><h2>📅 กิจกรรม &amp; เทศกาล</h2></div>
          <div className="body" style={{ paddingTop: 0, paddingBottom: 0 }}>
            {d.events.map((e: any) => (
              <a className="erow" key={e.id} href={`/event/${e.id}`}><div className="ethumb">{eIcon(e.kind)}</div>
                <div><div className="nm">{i18n(e.title_i18n)}</div><div className="meta">📅 {e.d} {THM[e.m - 1]}{e.is_recurring ? ' · ทุกสัปดาห์' : ''}</div></div>
                <span className="chev">›</span></a>
            ))}
          </div>
        </>
      )}

      {/* explore all */}
      <div className="sec"><h2>สำรวจรอบตัว</h2></div>
      <div className="body" style={{ paddingTop: 0 }}>
        {d.places.slice(0, 8).map((p: any) => (
          <a className="pcard" key={p.id} href={`/place/${p.id}`}>
            <div className="ph"><img src={cover(p.id)} alt="" loading="lazy" /><div className="scrim" />
              {p.fresh === 'fresh' && <span className="chip-top frost"><span className="gdot" style={{ background: '#36D399' }} /> ตรวจสอบล่าสุด</span>}</div>
            <div className="cc"><div className="eyebrow">{catTH(p.category)}{p.subcategory ? ` · ${p.subcategory}` : ''}</div>
              <div className="nm">{i18n(p.name_i18n)}</div>
              <div className="meta">{p.rev_n > 0 && <span className="rate"><span className="s">★</span> {p.rev_avg} ({p.rev_n})</span>}{p.rev_n > 0 && <span className="sep">·</span>}<span>เดิน 4 นาที</span></div></div>
          </a>
        ))}
      </div>
    </>
  );
}
