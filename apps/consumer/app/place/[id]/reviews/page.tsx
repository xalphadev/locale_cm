import { q, i18n } from '@/lib/db';
import { Icon } from '../../../icons';
import { ReviewsFeed } from '../ReviewsFeed';

export const dynamic = 'force-dynamic';

export default async function PlaceReviews({ params }: { params: { id: string } }) {
  let p: any = null; let rev: any = null; let dist: any[] = []; let first: any[] = [];
  try {
    [p] = await q<any>(`SELECT id, name_i18n FROM places WHERE id=$1 AND status='published'`, [params.id]);
    if (p) {
      [rev] = await q<any>(`SELECT count(*)::int n, COALESCE(round(avg(rating),1),0)::text avg FROM reviews WHERE place_id=$1 AND moderation_status='approved'`, [params.id]);
      dist = await q<any>(`SELECT rating, count(*)::int c FROM reviews WHERE place_id=$1 AND moderation_status='approved' GROUP BY rating`, [params.id]);
      first = await q<any>(`SELECT r.id, r.rating, r.body_i18n, pr.display_name, to_char(r.created_at,'YYYY-MM-DD') d
        FROM reviews r LEFT JOIN profiles pr ON pr.user_id=r.user_id
        WHERE r.place_id=$1 AND r.moderation_status='approved'
        ORDER BY r.created_at DESC, r.rating DESC LIMIT 8`, [params.id]);
    }
  } catch { /* db down */ }

  if (!p) return (<><div className="top"><a className="back" href="/"><Icon n="back" size={18} /> กลับ</a><h1>ไม่พบสถานที่</h1></div></>);

  const n = rev?.n ?? 0;
  const scored = n >= 5;
  const distMap: Record<number, number> = {}; dist.forEach((r) => (distMap[r.rating] = r.c));
  const total = n || 1;

  return (
    <>
      <div className="top">
        <a className="back" href={`/place/${p.id}`}><Icon n="back" size={18} /> {i18n(p.name_i18n)}</a>
        <h1>รีวิว{n ? ` (${n})` : ''}</h1>
      </div>
      <div className="dbody">
        {scored && (
          <div className="rdist">
            <div className="rbig"><div className="n">{rev?.avg}</div><div className="s">{Array.from({ length: 5 }).map((_, k) => <Icon key={k} n="star" fill="currentColor" size={11} />)}</div><div className="c">{n} รีวิว</div></div>
            <div className="rbars">{[5, 4, 3, 2, 1].map((st) => (
              <div className="rbarrow" key={st}><span>{st}</span><span className="rtrack"><span className="rfill" style={{ width: `${Math.round(((distMap[st] || 0) / total) * 100)}%` }} /></span></div>
            ))}</div>
          </div>
        )}
        {n === 0 ? (
          <p className="empty">ยังไม่มีรีวิว</p>
        ) : (
          <ReviewsFeed placeId={p.id} total={n}
            initial={first.map((r) => ({ id: r.id, rating: r.rating, body: i18n(r.body_i18n), name: r.display_name, d: r.d }))} />
        )}
      </div>
    </>
  );
}
