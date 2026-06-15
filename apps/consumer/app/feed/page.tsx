import { q, i18n, cover, DEMO_USER } from '@/lib/db';
import { Icon } from '../icons';
import { toggleLikeAction, addCommentAction } from '../actions';

export const dynamic = 'force-dynamic';

const THM = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const catTH = (c: string) => (c === 'eat' ? 'กิน' : c === 'see' ? 'เที่ยว' : 'ทำกิจกรรม');
const dealLabel = (t: string, pct: any, minor: any) =>
  t === 'percent_off' ? `ลด ${Math.round(Number(pct))}%` : t === 'fixed_off' ? `ลด ฿${Math.round(Number(minor) / 100)}`
    : t === 'bogo' ? '1 แถม 1' : t === 'freebie' ? 'ของแถมฟรี' : 'ดีล';
const daysLeft = (e: any) => (e ? Math.max(0, Math.ceil((new Date(e).getTime() - Date.now()) / 86400000)) : null);
function relTime(ts: any) {
  const m = (Date.now() - new Date(ts).getTime()) / 60000;
  if (m < 60) return 'เมื่อสักครู่'; if (m < 1440) return `${Math.floor(m / 60)} ชม.`; return `${Math.floor(m / 1440)} วันก่อน`;
}
const IMG_N: Record<string, number> = { deal: 3, new: 4, event: 3, verified: 1, review: 1 };

async function load() {
  const deals = await q<any>(`SELECT 'deal' kind, d.id did, d.created_at ts, p.id pid, p.name_i18n pname, p.subcategory psub, p.category::text pcat,
      d.deal_type::text deal_type, d.value_pct, d.value_minor, d.ends_at, d.quota_total, d.quota_used, d.title_i18n dtitle
    FROM deals d JOIN places p ON p.id=d.place_id WHERE d.status='active' AND (d.ends_at IS NULL OR d.ends_at>=now()) ORDER BY d.created_at DESC LIMIT 8`);
  const events = await q<any>(`SELECT 'event' kind, id eid, created_at ts, title_i18n, description_i18n, kind::text ekind,
      EXTRACT(DAY FROM starts_at)::int d, EXTRACT(MONTH FROM starts_at)::int m
    FROM events WHERE status='published' AND (ends_at IS NULL OR ends_at>=now()) ORDER BY created_at DESC LIMIT 6`);
  const reviews = await q<any>(`SELECT 'review' kind, r.id rid, r.created_at ts, p.id pid, p.name_i18n pname, p.subcategory psub, p.category::text pcat,
      r.rating, r.body_i18n, pr.display_name FROM reviews r JOIN profiles pr ON pr.user_id=r.user_id JOIN places p ON p.id=r.place_id
    WHERE r.moderation_status='approved' ORDER BY r.created_at DESC LIMIT 8`);
  const verified = await q<any>(`SELECT 'verified' kind, f.last_verified_at ts, p.id pid, p.name_i18n pname, p.subcategory psub, p.category::text pcat
    FROM data_freshness f JOIN places p ON p.id=f.place_id WHERE f.freshness_label='fresh' AND p.status='published' ORDER BY f.last_verified_at DESC LIMIT 5`);
  const news = await q<any>(`SELECT 'new' kind, created_at ts, id pid, name_i18n pname, subcategory psub, category::text pcat
    FROM places WHERE status='published' AND source='agent_seed' ORDER BY created_at DESC LIMIT 5`);
  const buckets = [deals, events, reviews, verified, news].map((a) => a.slice());
  const feed: any[] = []; let added = true;
  while (feed.length < 24 && added) { added = false; for (const b of buckets) { if (b.length) { feed.push(b.shift()); added = true; } } }

  const keys = feed.map(postKey);
  const likeRows = await q<any>(`SELECT post_key, count(*)::int c, bool_or(user_id=$2) liked FROM post_likes WHERE post_key = ANY($1) GROUP BY post_key`, [keys, DEMO_USER]);
  const cmtRows = await q<any>(`SELECT pc.post_key, pc.body, pc.created_at, pr.display_name FROM post_comments pc
    LEFT JOIN profiles pr ON pr.user_id=pc.user_id WHERE pc.post_key = ANY($1) ORDER BY pc.created_at DESC`, [keys]);
  const likes: Record<string, any> = {}; likeRows.forEach((r) => (likes[r.post_key] = r));
  const cmts: Record<string, any[]> = {}; cmtRows.forEach((r) => { (cmts[r.post_key] ||= []).push(r); });
  return { feed, likes, cmts };
}

function postKey(it: any) {
  return it.kind === 'deal' ? `deal:${it.did}` : it.kind === 'review' ? `review:${it.rid}`
    : it.kind === 'event' ? `event:${it.eid}` : `${it.kind}:${it.pid}`;
}
function poster(it: any): { name: string; sub: string; av: string; color: string } {
  const t = relTime(it.ts);
  if (it.kind === 'review') return { name: it.display_name || 'ผู้ใช้', sub: `รีวิว ${i18n(it.pname)} · ${t}`, av: (it.display_name || 'ผ')[0], color: 'var(--spark)' };
  if (it.kind === 'verified') return { name: 'ทีมงาน Soi Hop', sub: `ตรวจสอบความสด · ${t}`, av: 'S', color: 'var(--navy)' };
  if (it.kind === 'event') return { name: i18n(it.title_i18n), sub: `กิจกรรม · ${t}`, av: (i18n(it.title_i18n) || 'อ')[0], color: 'var(--accent)' };
  return { name: i18n(it.pname), sub: `${it.kind === 'deal' ? 'โปรโมชั่น' : 'เปิดใหม่'} · ${t}`, av: (i18n(it.pname) || 'ร')[0], color: 'var(--accent)' };
}

export default async function Feed() {
  let d: any = { feed: [], likes: {}, cmts: {} };
  try { d = await load(); } catch { /* db down */ }

  return (
    <>
      <div className="top"><div className="hi">อัปเดตล่าสุดรอบตัวคุณ</div><h1>ฟีด</h1></div>
      <div className="feed">
        {d.feed.length === 0 && <p className="empty">ยังไม่มีอัปเดต — รัน <code>db/test/setup-dev-db.sh</code></p>}
        {d.feed.map((it: any, i: number) => {
          const p = poster(it);
          const key = postKey(it);
          const href = it.kind === 'event' ? `/event/${it.eid}` : `/place/${it.pid}`;
          const seed = it.pid || it.eid || String(i);
          const n = IMG_N[it.kind] || 1;
          const lk = d.likes[key] || { c: 0, liked: false };
          const cl = d.cmts[key] || [];
          return (
            <div className="post" key={i}>
              <a className="post-link" href={href}>
                <div className="post-head">
                  <span className="post-av" style={{ background: p.color }}>{p.av}</span>
                  <div style={{ flex: 1, minWidth: 0 }}><div className="post-name">{p.name}</div><div className="post-sub">{p.sub}</div></div>
                  <Icon n="dots" size={18} style={{ color: 'var(--hint)' }} />
                </div>
                <div className="post-text">
                  {it.kind === 'deal' && <><span className="dl">{dealLabel(it.deal_type, it.value_pct, it.value_minor)}</span> {i18n(it.dtitle)}{daysLeft(it.ends_at) != null ? ` — เหลืออีก ${daysLeft(it.ends_at)} วัน${it.quota_total ? ` · เหลือ ${it.quota_total - it.quota_used} สิทธิ์` : ''}` : ''}</>}
                  {it.kind === 'event' && <>{i18n(it.description_i18n) || i18n(it.title_i18n)} · {it.d} {THM[it.m - 1]}</>}
                  {it.kind === 'review' && <><span style={{ color: 'var(--gold)', fontWeight: 700 }}>{'★'.repeat(it.rating)}</span> {i18n(it.body_i18n)}</>}
                  {it.kind === 'verified' && <>ทีมงานท้องถิ่นเพิ่งตรวจสอบข้อมูล <b>{i18n(it.pname)}</b> ว่าสด ใหม่ ถูกต้อง — เปิดจริง พิกัด/เวลาอัปเดตแล้ว ✓</>}
                  {it.kind === 'new' && <><b>{i18n(it.pname)}</b> เปิดใหม่แล้วในนิมมาน — {it.psub || catTH(it.pcat)} น่าไปลอง</>}
                </div>
              </a>
              {n > 1 ? (
                <div className="post-gallery">
                  {Array.from({ length: n }).map((_, k) => (
                    <a key={k} href={href} className="pg-img"><img src={cover(`${seed}-${k}`, it.psub, it.pcat, 640, 460)} alt="" loading="lazy" /></a>
                  ))}
                  <span className="pg-count"><Icon n="play" size={11} fill="currentColor" style={{ transform: 'rotate(0)' }} /> {n} รูป</span>
                </div>
              ) : (
                <a href={href}><img className="post-media" src={it.kind === 'event' ? cover('event' + it.eid, it.ekind, 'see', 680, 460) : cover(seed, it.psub, it.pcat, 680, 460)} alt="" loading="lazy" /></a>
              )}
              <div className="post-stat"><Icon n="heart" size={13} fill="var(--accent)" style={{ color: 'var(--accent)' }} /> {lk.c} · {cl.length} คอมเมนต์</div>
              <div className="post-actions">
                <form className="actf" action={toggleLikeAction.bind(null, key)}>
                  <button type="submit" className={`post-act ${lk.liked ? 'liked' : ''}`}><Icon n="heart" size={18} fill={lk.liked ? 'currentColor' : 'none'} /> ถูกใจ</button>
                </form>
                <a className="post-act" href={`#c-${i}`}><Icon n="chat" size={18} /> คอมเมนต์</a>
                <span className="post-act"><Icon n="share" size={18} /> แชร์</span>
              </div>
              <div className="post-comments" id={`c-${i}`}>
                {cl.slice(0, 2).reverse().map((c: any, j: number) => (
                  <div className="cmt" key={j}><b>{c.display_name || 'ผู้ใช้'}</b> {c.body}</div>
                ))}
                {cl.length > 2 && <div className="cmt-more">ดูคอมเมนต์ทั้งหมด {cl.length} รายการ</div>}
                <form className="cmt-form" action={addCommentAction.bind(null, key)}>
                  <input name="body" placeholder="เขียนคอมเมนต์…" autoComplete="off" maxLength={300} />
                  <button type="submit">ส่ง</button>
                </form>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
