'use client';
import { useState, useTransition } from 'react';
import { Icon } from '../../icons';
import { reportReviewAction, fetchReviewsAction } from '../../actions';

export type Review = { id?: string; rating: number; body: string; name: string; d: string };

/** Reviews list — no search. On the place page it previews a few with a "ดูทั้งหมด" link; on the
 *  dedicated /reviews page it lazy-loads more on demand (8 at a time) instead of loading everything. */
export function ReviewsFeed({ placeId, initial, total, preview = false, reviewsHref }: {
  placeId: string; initial: Review[]; total: number; preview?: boolean; reviewsHref?: string;
}) {
  const [items, setItems] = useState<Review[]>(initial);
  const [pending, start] = useTransition();
  const loadMore = () => start(async () => {
    const more = await fetchReviewsAction(placeId, items.length);
    setItems((cur) => [...cur, ...more]);
  });

  return (
    <>
      {items.map((r, i) => (
        <div className="review" key={r.id || i}>
          <div className="review-top">
            <span className="rname"><span className="avatar">{(r.name || 'ผ')[0]}</span><span className="review-name">{r.name || 'ผู้ใช้'}</span></span>
            <span className="stars">{Array.from({ length: r.rating }).map((_, k) => <Icon key={k} n="star" fill="currentColor" size={13} />)}</span>
          </div>
          <div className="review-body">{r.body}</div>
          <div className="review-date">{r.d}{r.id && (
            <form action={reportReviewAction.bind(null, r.id)} style={{ display: 'inline' }}>
              <button className="rvreport" type="submit" title="รายงานรีวิวนี้"><Icon n="flag" size={12} /> รายงาน</button>
            </form>
          )}</div>
        </div>
      ))}

      {preview
        ? (total > items.length && reviewsHref && (
            <a className="rvmore" href={reviewsHref}>ดูรีวิวทั้งหมด ({total}) <Icon n="chevR" size={15} /></a>
          ))
        : (items.length < total && (
            <button className="rvmore" type="button" onClick={loadMore} disabled={pending}>
              {pending ? 'กำลังโหลด…' : `โหลดรีวิวเพิ่ม (${total - items.length})`}
            </button>
          ))}
    </>
  );
}
