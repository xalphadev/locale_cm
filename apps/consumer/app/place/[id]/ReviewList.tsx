'use client';
import { useState } from 'react';
import { Icon } from '../../icons';
import { reportReviewAction } from '../../actions';

export type Review = { id?: string; rating: number; body: string; name: string; d: string };
type Sort = 'latest' | 'top' | 'detailed';
const SORTS: [Sort, string][] = [['latest', 'ล่าสุด'], ['top', 'คะแนนสูง'], ['detailed', 'ละเอียด']];

/** Reviews list with search + sort chips (mirrors the ref's Review tab). Reviews arrive pre-resolved
 *  (i18n applied server-side) so this stays a pure client component. */
export function ReviewList({ reviews }: { reviews: Review[] }) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('latest');
  const ql = q.trim().toLowerCase();

  const list = reviews
    .filter((r) => !ql || r.body.toLowerCase().includes(ql) || (r.name || '').toLowerCase().includes(ql))
    .slice() // don't mutate the prop
    .sort((a, b) => (sort === 'top' ? b.rating - a.rating : sort === 'detailed' ? (b.body?.length || 0) - (a.body?.length || 0) : 0));

  return (
    <>
      {reviews.length > 2 && (
        <div className="rvtools">
          <div className="rvsearch">
            <Icon n="search" size={16} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาในรีวิว" inputMode="search" aria-label="ค้นหาในรีวิว" />
            {q && <button type="button" className="rvsearch-x" onClick={() => setQ('')} aria-label="ล้างคำค้น"><Icon n="x" size={13} /></button>}
          </div>
          <div className="rvchips">
            {SORTS.map(([k, l]) => (
              <button key={k} type="button" className={`rvchip ${sort === k ? 'on' : ''}`} onClick={() => setSort(k)}>{l}</button>
            ))}
          </div>
        </div>
      )}

      {list.length === 0 ? (
        <p className="muted" style={{ margin: '4px 0 12px' }}>ไม่พบรีวิวที่ตรงกับคำค้น</p>
      ) : list.map((r, i) => (
        <div className="review" key={i}>
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
    </>
  );
}
