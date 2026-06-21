'use client';
import { useState } from 'react';
import { Icon } from '../../icons';
import { submitReviewAction } from '../../actions';

// Write/edit a review. Shown only to verified visitors (server passes canReview from a check-in fact);
// logged-out → login nudge; logged-in but no check-in → visit nudge. No money — opinion + rating only.
export function ReviewForm({ placeId, loggedIn, canReview, mine, status, backTo }: {
  placeId: string; loggedIn: boolean; canReview: boolean;
  mine: { rating: number; body: string } | null; status?: string; backTo?: string;
}) {
  const [rating, setRating] = useState(mine?.rating || 0);
  const [body, setBody] = useState(mine?.body || '');
  const editing = !!mine;

  return (
    <div className="rvform-wrap">
      {status === '1' && <div className="booksent"><Icon n="check" size={15} /> ขอบคุณ! รีวิวของคุณเผยแพร่แล้ว</div>}
      {status === 'short' && <div className="bookerr">กรุณาให้คะแนน และเขียนรีวิวอย่างน้อย 10 ตัวอักษร</div>}
      {status === 'visit' && <div className="bookerr">ต้องเช็คอินที่ร้านนี้ก่อนถึงเขียนรีวิวได้ — เพื่อรับเฉพาะรีวิวจากผู้มาเยือนจริง</div>}

      {!loggedIn ? (
        <a className="rvform-gate" href="/login"><Icon n="star" size={15} /> เข้าสู่ระบบเพื่อเขียนรีวิว</a>
      ) : !canReview ? (
        <div className="rvform-gate"><Icon n="pin" size={15} /> เช็คอินที่ร้านนี้ก่อนถึงเขียนรีวิวได้ — รับเฉพาะรีวิวจากผู้มาเยือนจริง</div>
      ) : (
        <details className="rvform" {...(editing && status ? { open: true } : {})}>
          <summary className="rvform-sum"><Icon n="star" size={16} /> {editing ? 'แก้ไขรีวิวของคุณ' : 'เขียนรีวิว'}</summary>
          <form action={submitReviewAction.bind(null, placeId)} className="rvform-body">
            {backTo && <input type="hidden" name="back" value={backTo} />}
            <div className="rvstars">
              {[1, 2, 3, 4, 5].map((s) => (
                <button type="button" key={s} className={`rvstar ${s <= rating ? 'on' : ''}`} onClick={() => setRating(s)} aria-label={`${s} ดาว`}>
                  <Icon n="star" fill={s <= rating ? 'currentColor' : 'none'} size={26} />
                </button>
              ))}
            </div>
            <input type="hidden" name="rating" value={rating} />
            <textarea name="body" value={body} onChange={(e) => setBody(e.target.value)} maxLength={500}
              placeholder="เล่าประสบการณ์ของคุณที่ร้านนี้ (อย่างน้อย 10 ตัวอักษร)" className="rvtext" />
            <div className="rvform-foot">
              <span className="muted">{body.length}/500</span>
              <button type="submit" className="rvsubmit" disabled={rating < 1 || body.trim().length < 10}>{editing ? 'บันทึกรีวิว' : 'ส่งรีวิว'}</button>
            </div>
          </form>
        </details>
      )}
    </div>
  );
}
