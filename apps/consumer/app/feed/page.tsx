import { q, demoUserId } from '@/lib/db';
import { PostCard, postKey } from './parts';

export const dynamic = 'force-dynamic';

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
  const posts = await q<any>(`SELECT 'post' kind, fp.id pgid, fp.created_at ts, p.id pid, p.name_i18n pname, p.subcategory psub, p.category::text pcat,
      fp.body_i18n, fp.image_count, fp.image_urls FROM feed_posts fp JOIN places p ON p.id=fp.place_id
    WHERE fp.status='published' AND fp.deleted_at IS NULL AND p.status='published' AND p.is_visible ORDER BY fp.created_at DESC LIMIT 8`);
  const products = await q<any>(`SELECT 'product' kind, sp.id, sp.created_at ts, p.id pid, p.name_i18n pname, p.subcategory psub, p.category::text pcat,
      sp.name_i18n prod_name, sp.price_minor, sp.price_unit, sp.price_text_i18n, sp.image_urls, sp.image_count, sp.subtype
    FROM shop_products sp JOIN places p ON p.id=sp.place_id
    WHERE sp.status='published' AND sp.deleted_at IS NULL AND NOT sp.sold_out AND p.status='published' AND p.is_visible ORDER BY sp.created_at DESC LIMIT 8`);
  const buckets = [posts, products, deals, events, reviews, verified, news].map((a) => a.slice());
  const feed: any[] = []; let added = true;
  while (feed.length < 24 && added) { added = false; for (const b of buckets) { if (b.length) { feed.push(b.shift()); added = true; } } }

  const keys = feed.map(postKey);
  const uid = await demoUserId();
  const likeRows = await q<any>(`SELECT post_key, count(*)::int c, bool_or(user_id=$2) liked FROM post_likes WHERE post_key = ANY($1) GROUP BY post_key`, [keys, uid]);
  const cmtRows = await q<any>(`SELECT post_key, count(*)::int c FROM post_comments WHERE post_key = ANY($1) AND deleted_at IS NULL GROUP BY post_key`, [keys]);
  const likes: Record<string, any> = {}; likeRows.forEach((r) => (likes[r.post_key] = r));
  const cmtCount: Record<string, number> = {}; cmtRows.forEach((r) => (cmtCount[r.post_key] = r.c));
  return { feed, likes, cmtCount };
}

export default async function Feed() {
  let d: any = { feed: [], likes: {}, cmtCount: {} };
  try { d = await load(); } catch { /* db down */ }

  return (
    <>
      <div className="top"><div className="hi">อัปเดตล่าสุดรอบตัวคุณ</div><h1>ฟีด</h1></div>
      <div className="feed">
        {d.feed.length === 0 && <p className="empty">ยังไม่มีอัปเดตตอนนี้</p>}
        {d.feed.map((it: any, i: number) => {
          const key = postKey(it);
          return (
            <PostCard
              key={i}
              it={it}
              lk={d.likes[key] || { c: 0, liked: false }}
              commentCount={d.cmtCount[key] || 0}
              mode="list"
            />
          );
        })}
      </div>
    </>
  );
}
