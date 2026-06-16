import { q, DEMO_USER } from '@/lib/db';
import { Icon } from '../../icons';
import { PostCard } from '../parts';

export const dynamic = 'force-dynamic';

function splitKey(key: string): [string, string] {
  const i = key.indexOf(':');
  return i < 0 ? [key, ''] : [key.slice(0, i), key.slice(i + 1)];
}

async function loadOne(kind: string, id: string): Promise<any | null> {
  // NOTE: each branch mirrors the visibility/moderation/status gates of the feed-list query in ../page.tsx.
  // The detail route is publicly reachable by URL, so without these gates an unpublished place, an
  // unmoderated review, or an expired deal/event would render via a direct /feed/<key> link.
  if (kind === 'deal') {
    const [r] = await q<any>(`SELECT 'deal' kind, d.id did, d.created_at ts, p.id pid, p.name_i18n pname, p.subcategory psub, p.category::text pcat,
        d.deal_type::text deal_type, d.value_pct, d.value_minor, d.ends_at, d.quota_total, d.quota_used, d.title_i18n dtitle
      FROM deals d JOIN places p ON p.id=d.place_id WHERE d.id=$1 AND d.status='active' AND (d.ends_at IS NULL OR d.ends_at>=now())`, [id]);
    return r ?? null;
  }
  if (kind === 'event') {
    const [r] = await q<any>(`SELECT 'event' kind, id eid, created_at ts, title_i18n, description_i18n, kind::text ekind,
        EXTRACT(DAY FROM starts_at)::int d, EXTRACT(MONTH FROM starts_at)::int m
      FROM events WHERE id=$1 AND status='published' AND (ends_at IS NULL OR ends_at>=now())`, [id]);
    return r ?? null;
  }
  if (kind === 'review') {
    const [r] = await q<any>(`SELECT 'review' kind, r.id rid, r.created_at ts, p.id pid, p.name_i18n pname, p.subcategory psub, p.category::text pcat,
        r.rating, r.body_i18n, pr.display_name FROM reviews r JOIN profiles pr ON pr.user_id=r.user_id JOIN places p ON p.id=r.place_id
      WHERE r.id=$1 AND r.moderation_status='approved'`, [id]);
    return r ?? null;
  }
  if (kind === 'post') {
    const [r] = await q<any>(`SELECT 'post' kind, fp.id pgid, fp.created_at ts, p.id pid, p.name_i18n pname, p.subcategory psub, p.category::text pcat,
        fp.body_i18n, fp.image_count, fp.image_urls FROM feed_posts fp JOIN places p ON p.id=fp.place_id WHERE fp.id=$1 AND fp.status='published' AND p.status='published' AND p.is_visible`, [id]);
    return r ?? null;
  }
  if (kind === 'product') {
    const [r] = await q<any>(`SELECT 'product' kind, sp.id, sp.created_at ts, p.id pid, p.name_i18n pname, p.subcategory psub, p.category::text pcat,
        sp.name_i18n prod_name, sp.price_minor, sp.price_unit, sp.price_text_i18n, sp.image_urls, sp.image_count, sp.subtype
      FROM shop_products sp JOIN places p ON p.id=sp.place_id WHERE sp.id=$1 AND sp.status='published' AND NOT sp.sold_out AND p.status='published' AND p.is_visible`, [id]);
    return r ?? null;
  }
  if (kind === 'verified') {
    const [r] = await q<any>(`SELECT 'verified' kind, f.last_verified_at ts, p.id pid, p.name_i18n pname, p.subcategory psub, p.category::text pcat
      FROM data_freshness f JOIN places p ON p.id=f.place_id WHERE p.id=$1 AND f.freshness_label='fresh' AND p.status='published'`, [id]);
    return r ?? null;
  }
  if (kind === 'new') {
    const [r] = await q<any>(`SELECT 'new' kind, created_at ts, id pid, name_i18n pname, subcategory psub, category::text pcat
      FROM places WHERE id=$1 AND status='published'`, [id]);
    return r ?? null;
  }
  return null;
}

export default async function PostDetail({ params }: { params: { key: string } }) {
  const rawKey = decodeURIComponent(params.key);
  const [kind, id] = splitKey(rawKey);

  let it: any = null; let lk = { c: 0, liked: false }; let comments: any[] = [];
  try {
    it = await loadOne(kind, id);
    if (it) {
      const [l] = await q<any>(`SELECT count(*)::int c, bool_or(user_id=$2) liked FROM post_likes WHERE post_key=$1 GROUP BY post_key`, [rawKey, DEMO_USER]);
      if (l) lk = { c: l.c, liked: !!l.liked };
      comments = await q<any>(`SELECT pc.body, pc.created_at, pr.display_name FROM post_comments pc
        LEFT JOIN profiles pr ON pr.user_id=pc.user_id WHERE pc.post_key=$1 ORDER BY pc.created_at ASC`, [rawKey]);
    }
  } catch { /* db down */ }

  if (!it) {
    return (<><div className="top"><a className="back" href="/feed"><Icon n="back" size={18} /> กลับ</a><h1>ไม่พบโพสต์</h1></div>
      <div className="feed"><p className="empty">โพสต์นี้อาจถูกลบหรือหมดอายุแล้ว</p></div></>);
  }

  return (
    <>
      <div className="top"><a className="back" href="/feed"><Icon n="back" size={18} /> ฟีด</a><h1>ความคิดเห็น</h1></div>
      <div className="feed">
        <PostCard it={it} lk={lk} comments={comments} commentCount={comments.length} mode="detail" />
      </div>
    </>
  );
}
