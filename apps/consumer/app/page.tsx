import { q, demoUserId, i18n } from '@/lib/db';

export const dynamic = 'force-dynamic';
const icon = (c: string) => (c === 'eat' ? '☕' : c === 'see' ? '⛩️' : '🎨');
const THM = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const eIcon = (k: string) => ({ festival: '🎆', market: '🛍️', performance: '🎭', workshop: '🎨', seasonal: '🌸' }[k] ?? '✨');
const eLabel = (k: string) => ({ festival: 'เทศกาล', market: 'ตลาด/มาร์เก็ต', performance: 'การแสดง', workshop: 'เวิร์กช็อป', seasonal: 'ตามฤดูกาล' }[k] ?? k);

async function load() {
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
     WHERE p.status='published' AND p.is_visible ORDER BY p.verified_at DESC NULLS LAST LIMIT 12`);
  const events = await q<any>(
    `SELECT id, title_i18n, kind, is_recurring,
            EXTRACT(DAY FROM starts_at)::int d, EXTRACT(MONTH FROM starts_at)::int m
     FROM events
     WHERE status='published' AND (ends_at IS NULL OR ends_at >= now())
     ORDER BY starts_at LIMIT 6`);
  return { quest, stamps, places, events };
}

export default async function Discover() {
  let d: Awaited<ReturnType<typeof load>>;
  try { d = await load(); }
  catch (e: any) {
    return (<><div className="top"><h1>Soi Hop</h1></div>
      <div className="body"><p className="muted">ยังต่อฐานข้อมูลไม่ได้ — รัน <code>db/test/setup-dev-db.sh</code> ก่อน</p></div></>);
  }
  const need = d.quest?.min_steps_required ?? 3;
  return (
    <>
      <div className="top">
        <div className="hi">สวัสดีตอนบ่าย ☀️</div>
        <h1>เดินซอย เก็บแสตมป์</h1>
        <div className="city">📍 นิมมานเหมินท์ · เชียงใหม่</div>
      </div>
      <div className="body">
        {d.quest && (
          <div className="quest">
            <span className="tag">★ แนะนำ</span>
            <h3>{i18n(d.quest.title_i18n)}</h3>
            <div className="sub">เก็บ {need} แสตมป์จากคาเฟ่ในนิมมาน แล้วรับของรางวัล</div>
            <div className="stamps">
              {Array.from({ length: need }).map((_, i) => (
                <div key={i} className={`st ${i < d.stamps ? 'on' : ''}`}>{i < d.stamps ? '✓' : '☕'}</div>
              ))}
            </div>
            <div className="reward">🎁 ครบ {need} แสตมป์ → ฟรีกาแฟ 1 แก้ว</div>
          </div>
        )}

        {d.events.length > 0 && (
          <>
            <h2>กิจกรรม &amp; เทศกาลเร็วๆ นี้</h2>
            {d.events.map((e: any) => (
              <a className="card" key={e.id} href={`/event/${e.id}`}>
                <div className="thumb">{eIcon(e.kind)}</div>
                <div>
                  <div className="nm">{i18n(e.title_i18n)}</div>
                  <div className="meta">📅 {e.d} {THM[e.m - 1]}{e.is_recurring ? ' · ทุกสัปดาห์' : ''} · {eLabel(e.kind)}</div>
                </div>
              </a>
            ))}
          </>
        )}

        <h2>ใกล้คุณตอนนี้</h2>
        {d.places.map((p) => (
          <a className="card" key={p.id} href={`/place/${p.id}`}>
            <div className="thumb">{icon(p.category)}</div>
            <div>
              <div className="nm">{i18n(p.name_i18n)}</div>
              <div className="meta">{p.category === 'eat' ? 'กิน' : p.category === 'see' ? 'เที่ยว' : 'ทำกิจกรรม'}
                {p.subcategory ? ` · ${p.subcategory}` : ''}</div>
              {p.rev_n > 0 && <div className="rating">★ {p.rev_avg} <span className="muted">({p.rev_n})</span></div>}
              <span className={`badge ${p.fresh ?? 'nada'}`}>
                {p.fresh === 'fresh' ? '✓ ตรวจสอบล่าสุด' : p.fresh === 'aging' ? 'อัปเดตไม่นาน' : 'ยังไม่ตรวจสอบ'}
              </span>
            </div>
          </a>
        ))}
        {d.places.length === 0 && <p className="muted">ยังไม่มีร้าน — agent กำลังเก็บข้อมูลนิมมาน</p>}
      </div>
    </>
  );
}
