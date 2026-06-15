import { q, i18n, cover } from '@/lib/db';
import { Icon, KIND_ICON } from '../icons';

export const dynamic = 'force-dynamic';

const THM = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const dealLabel = (t: string, pct: any, minor: any) =>
  t === 'percent_off' ? `ลด ${Math.round(Number(pct))}%` : t === 'fixed_off' ? `ลด ฿${Math.round(Number(minor) / 100)}`
    : t === 'bogo' ? '1 แถม 1' : t === 'freebie' ? 'ของแถมฟรี' : 'ดีล';
const daysLeft = (e: any) => (e ? Math.max(0, Math.ceil((new Date(e).getTime() - Date.now()) / 86400000)) : null);
function relTime(ts: any) {
  const m = (Date.now() - new Date(ts).getTime()) / 60000;
  if (m < 60) return 'เมื่อสักครู่';
  if (m < 1440) return `${Math.floor(m / 60)} ชม.ที่แล้ว`;
  return `${Math.floor(m / 1440)} วันก่อน`;
}

async function loadFeed() {
  const deals = await q<any>(`SELECT 'deal' kind, d.created_at ts, p.id pid, p.name_i18n pname, p.subcategory psub, p.category::text pcat,
      d.deal_type::text deal_type, d.value_pct, d.value_minor, d.ends_at, d.quota_total, d.quota_used, d.title_i18n dtitle
    FROM deals d JOIN places p ON p.id=d.place_id WHERE d.status='active' AND (d.ends_at IS NULL OR d.ends_at>=now()) ORDER BY d.created_at DESC LIMIT 8`);
  const events = await q<any>(`SELECT 'event' kind, created_at ts, id eid, title_i18n, kind::text ekind,
      EXTRACT(DAY FROM starts_at)::int d, EXTRACT(MONTH FROM starts_at)::int m
    FROM events WHERE status='published' AND (ends_at IS NULL OR ends_at>=now()) ORDER BY created_at DESC LIMIT 6`);
  const reviews = await q<any>(`SELECT 'review' kind, r.created_at ts, p.id pid, p.name_i18n pname, p.subcategory psub, p.category::text pcat,
      r.rating, r.body_i18n, pr.display_name
    FROM reviews r JOIN profiles pr ON pr.user_id=r.user_id JOIN places p ON p.id=r.place_id
    WHERE r.moderation_status='approved' ORDER BY r.created_at DESC LIMIT 8`);
  const verified = await q<any>(`SELECT 'verified' kind, f.last_verified_at ts, p.id pid, p.name_i18n pname, p.subcategory psub, p.category::text pcat
    FROM data_freshness f JOIN places p ON p.id=f.place_id WHERE f.freshness_label='fresh' AND p.status='published' ORDER BY f.last_verified_at DESC LIMIT 5`);
  const news = await q<any>(`SELECT 'new' kind, created_at ts, id pid, name_i18n pname, subcategory psub, category::text pcat
    FROM places WHERE status='published' AND source='agent_seed' ORDER BY created_at DESC LIMIT 5`);
  // round-robin interleave for type diversity (no ad-dump / no single type dominating)
  const buckets = [deals, events, reviews, verified, news].map((a) => a.slice());
  const feed: any[] = []; let added = true;
  while (feed.length < 26 && added) { added = false; for (const b of buckets) { if (b.length) { feed.push(b.shift()); added = true; } } }
  return feed;
}

const HEAD: Record<string, { icon: string; label: string; color: string }> = {
  deal: { icon: 'tag', label: 'โปรโมชั่นใหม่', color: 'var(--promo)' },
  event: { icon: 'calendar', label: 'กิจกรรมใกล้มาถึง', color: 'var(--accent)' },
  review: { icon: 'chat', label: 'รีวิวใหม่จากชุมชน', color: 'var(--spark)' },
  verified: { icon: 'check', label: 'ตรวจสอบความสดแล้ว', color: 'var(--score)' },
  new: { icon: 'sparkles', label: 'เปิดใหม่ในย่าน', color: 'var(--accent)' },
};

export default async function Feed() {
  let feed: any[] = [];
  try { feed = await loadFeed(); } catch { /* db down */ }

  return (
    <>
      <div className="top"><div className="hi">อัปเดตล่าสุดรอบตัวคุณ</div><h1>ฟีด</h1></div>
      <div className="feed">
        {feed.length === 0 && <p className="empty">ยังไม่มีอัปเดต — รัน <code>db/test/setup-dev-db.sh</code></p>}
        {feed.map((it, i) => {
          const h = HEAD[it.kind];
          const href = it.kind === 'event' ? `/event/${it.eid}` : `/place/${it.pid}`;
          return (
            <a className="fitem" key={i} href={href}>
              <div className="fhead"><Icon n={h.icon} size={15} style={{ color: h.color }} /><span>{h.label}</span><span className="ftime">{relTime(it.ts)}</span></div>
              <div className="fbody">
                {it.kind === 'review'
                  ? <span className="avatar" style={{ width: 50, height: 50, borderRadius: 12, fontSize: '1.2rem' }}>{(it.display_name || 'ผ')[0]}</span>
                  : <img className="fthumb" src={it.kind === 'event' ? cover('event' + it.eid, it.ekind, 'see', 200, 200) : cover(it.pid, it.psub, it.pcat, 200, 200)} alt="" loading="lazy" />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {it.kind === 'deal' && <>
                    <div className="ftitle">{i18n(it.pname)}</div>
                    <div className="fsub"><b style={{ color: 'var(--promo-ink)', background: 'var(--promo)', padding: '.05rem .35rem', borderRadius: 5 }}>{dealLabel(it.deal_type, it.value_pct, it.value_minor)}</b> {i18n(it.dtitle)}{daysLeft(it.ends_at) != null ? ` · อีก ${daysLeft(it.ends_at)} วัน` : ''}</div></>}
                  {it.kind === 'event' && <><div className="ftitle">{i18n(it.title_i18n)}</div><div className="fsub">{it.d} {THM[it.m - 1]} · นิมมาน</div></>}
                  {it.kind === 'review' && <><div className="ftitle">{it.display_name} <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{'★'.repeat(it.rating)}</span></div><div className="fsub">รีวิว {i18n(it.pname)} — {i18n(it.body_i18n)}</div></>}
                  {it.kind === 'verified' && <><div className="ftitle">{i18n(it.pname)}</div><div className="fsub">ทีมงานท้องถิ่นตรวจสอบข้อมูลแล้ว · {relTime(it.ts)}</div></>}
                  {it.kind === 'new' && <><div className="ftitle">{i18n(it.pname)}</div><div className="fsub">เปิดใหม่ · {it.psub || it.pcat}</div></>}
                </div>
                <span className="fcta"><Icon n="chevR" size={18} /></span>
              </div>
            </a>
          );
        })}
      </div>
    </>
  );
}
