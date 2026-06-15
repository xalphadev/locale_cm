import { q, demoUserId, i18n, cover } from '@/lib/db';

export const dynamic = 'force-dynamic';

const catTH = (c: string) => (c === 'eat' ? 'กิน' : c === 'see' ? 'เที่ยว' : 'ทำกิจกรรม');
const eIcon = (k: string) => ({ festival: '🎆', market: '🛍️', performance: '🎭', workshop: '🎨', seasonal: '🌸' } as any)[k] ?? '✨';
const THM = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const FILTERS = [{ k: '', l: 'ทั้งหมด' }, { k: 'eat', l: '☕ กิน' }, { k: 'see', l: '⛩️ เที่ยว' }, { k: 'do', l: '🎨 ทำกิจกรรม' }];

async function load(cat: string) {
  const uid = await demoUserId();
  const [quest] = await q<any>(
    `SELECT id, title_i18n, min_steps_required FROM quests
     WHERE status='active' ORDER BY is_featured DESC, created_at LIMIT 1`);
  let stamps = 0;
  if (quest && uid) {
    const [qp] = await q<any>(
      `SELECT COALESCE(jsonb_array_length(steps_completed),0) n FROM quest_progress WHERE user_id=$1 AND quest_id=$2`,
      [uid, quest.id]);
    stamps = qp ? Number(qp.n) : 0;
  }
  const places = await q<any>(
    `SELECT p.id, p.name_i18n, p.category::text category, p.subcategory, f.freshness_label::text fresh,
            rv.n::int rev_n, rv.avg::text rev_avg
     FROM places p
     LEFT JOIN data_freshness f ON f.place_id=p.id
     LEFT JOIN LATERAL (SELECT count(*) n, round(avg(rating),1) avg FROM reviews r
                        WHERE r.place_id=p.id AND r.moderation_status='approved') rv ON true
     WHERE p.status='published' AND p.is_visible AND ($1='' OR p.category::text=$1)
     ORDER BY p.verified_at DESC NULLS LAST LIMIT 20`, [cat]);
  const events = await q<any>(
    `SELECT id, title_i18n, kind, is_recurring,
            EXTRACT(DAY FROM starts_at)::int d, EXTRACT(MONTH FROM starts_at)::int m
     FROM events WHERE status='published' AND (ends_at IS NULL OR ends_at >= now())
     ORDER BY starts_at LIMIT 6`);
  return { quest, stamps, places, events };
}

export default async function Discover({ searchParams }: { searchParams: { cat?: string } }) {
  const cat = ['eat', 'see', 'do'].includes(searchParams?.cat ?? '') ? searchParams!.cat! : '';
  let d: Awaited<ReturnType<typeof load>>;
  try { d = await load(cat); }
  catch {
    return (<><div className="top"><h1>Soi Hop</h1></div>
      <div className="body"><p className="empty">ยังต่อฐานข้อมูลไม่ได้ — รัน <code>db/test/setup-dev-db.sh</code> ก่อน</p></div></>);
  }
  const need = d.quest?.min_steps_required ?? 3;

  return (
    <>
      <div className="top">
        <div className="hi">สวัสดีตอนบ่าย ☀️</div>
        <h1>เดินซอย เก็บแสตมป์</h1>
        <div className="city">📍 นิมมานเหมินท์ · เชียงใหม่</div>
      </div>

      <div className="body" style={{ paddingBottom: 0 }}>
        {d.quest && (
          <a className="hero" href="/passport" style={{ display: 'block' }}>
            <img src={cover('quest' + d.quest.id, 600, 720)} alt="" />
            <div className="scrim" />
            <div className="htop"><span className="frost"><span className="gdot" /> แนะนำสำหรับคุณ</span>
              <span className="frost">{need} ร้าน</span></div>
            <div className="hbody">
              <div className="eyebrow" style={{ color: 'rgba(255,255,255,.85)' }}>FEATURED QUEST</div>
              <h3>{i18n(d.quest.title_i18n)}</h3>
              <div className="hsub">เก็บ {need} แสตมป์จากคาเฟ่ในนิมมาน แล้วรับฟรีกาแฟ</div>
              <div className="htrack">
                {Array.from({ length: need }).flatMap((_, i) => {
                  const els = [<div key={`s${i}`} className={`hstamp ${i < d.stamps ? 'on' : ''}`}>{i < d.stamps ? '✓' : i + 1}</div>];
                  if (i < need - 1) els.push(<div key={`c${i}`} className="hconn" />);
                  return els;
                })}
              </div>
              <div className="hreward">🪙 รางวัล: ฟรีกาแฟ 1 แก้ว · เก็บแล้ว {d.stamps}/{need}</div>
              <div className="cta">{d.stamps > 0 ? 'เก็บต่อ' : 'เริ่มเก็บแสตมป์'} →</div>
            </div>
          </a>
        )}
      </div>

      <div className="filters">
        {FILTERS.map((f) => (
          <a key={f.k} href={f.k ? `/?cat=${f.k}` : '/'} className={`fpill ${cat === f.k ? 'on' : ''}`}>{f.l}</a>
        ))}
      </div>

      <div className="body" style={{ paddingTop: 4 }}>
        {d.events.length > 0 && cat === '' && (
          <>
            <h2>กิจกรรม &amp; เทศกาลเร็วๆ นี้</h2>
            {d.events.map((e: any) => (
              <a className="erow" key={e.id} href={`/event/${e.id}`}>
                <div className="ethumb">{eIcon(e.kind)}</div>
                <div><div className="nm">{i18n(e.title_i18n)}</div>
                  <div className="meta">📅 {e.d} {THM[e.m - 1]}{e.is_recurring ? ' · ทุกสัปดาห์' : ''}</div></div>
                <span className="chev">›</span>
              </a>
            ))}
          </>
        )}

        <h2>{cat ? `${catTH(cat)} ในนิมมาน` : 'แนะนำใกล้คุณ'}</h2>
        {d.places.map((p: any) => (
          <a className="pcard" key={p.id} href={`/place/${p.id}`}>
            <div className="ph">
              <img src={cover(p.id)} alt="" loading="lazy" />
              <div className="scrim" />
              {p.fresh === 'fresh' && <span className="chip-top frost"><span className="gdot" style={{ background: '#36D399' }} /> ตรวจสอบล่าสุด</span>}
            </div>
            <div className="cc">
              <div className="eyebrow">{catTH(p.category)}{p.subcategory ? ` · ${p.subcategory}` : ''}</div>
              <div className="nm">{i18n(p.name_i18n)}</div>
              <div className="meta">
                {p.rev_n > 0 && <span className="rate"><span className="s">★</span> {p.rev_avg} <span style={{ opacity: .8 }}>({p.rev_n})</span></span>}
                {p.rev_n > 0 && <span className="sep">·</span>}
                <span>เดิน 4 นาที</span>
              </div>
            </div>
          </a>
        ))}
        {d.places.length === 0 && <p className="empty">ยังไม่มีร้านในหมวดนี้</p>}
      </div>
    </>
  );
}
