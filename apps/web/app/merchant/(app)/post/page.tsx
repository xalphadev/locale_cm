import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { Icon, Thumb } from '../ui';

export const dynamic = 'force-dynamic';
const fmtDate = (ts: any) => new Date(ts).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
const preview = (s: string, n = 90) => { const t = (s || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n).trimEnd() + '…' : t; };

export default async function Posts({ searchParams }: { searchParams: { ok?: string } }) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  const rows = await q<any>(
    `SELECT fp.id, fp.body_i18n, fp.image_urls, fp.status, fp.created_at,
            (SELECT count(*) FROM post_likes    WHERE post_key = 'post:' || fp.id)::int likes,
            (SELECT count(*) FROM post_comments WHERE post_key = 'post:' || fp.id)::int comments
       FROM feed_posts fp WHERE fp.place_id=$1 ORDER BY fp.created_at DESC`, [acc.place_id]);
  return (
    <>
      <div className="listhead">
        <h1>โพสต์ <span className="listcount">{rows.length}</span></h1>
        <a className="addbtn" href="/merchant/post/new"><Icon n="plus" size={17} /> เขียนโพสต์</a>
      </div>
      {searchParams?.ok === '1' && <div className="banner-ok">✓ โพสต์แล้ว — ลูกค้าเห็นในแท็บ “อัปเดต”</div>}
      {searchParams?.ok === 'updated' && <div className="banner-ok">✓ บันทึกการแก้ไขแล้ว</div>}
      {searchParams?.ok === 'deleted' && <div className="banner-ok">✓ ลบโพสต์แล้ว</div>}
      <p className="note">โพสต์ข่าวสาร/โปรของร้านลงฟีดลูกค้า — กดถูกใจและคอมเมนต์ได้ทันที</p>

      {rows.length === 0 ? (
        <div className="mempty">
          <span className="mempty-ic"><Icon n="feed" size={30} /></span>
          <p>ยังไม่มีโพสต์ — เขียนโพสต์แรกเพื่อบอกข่าวสาร/โปรโมชันให้ลูกค้า</p>
          <a className="btn btn-primary" href="/merchant/post/new">+ เขียนโพสต์แรก</a>
        </div>
      ) : (
        <div className="mlist">
          {rows.map((r) => (
            <a className={`mrow ${r.status === 'hidden' ? 'off' : ''}`} href={`/merchant/post/${r.id}`} key={r.id}>
              <span className="mrow-img"><Thumb images={r.image_urls} kind="post" /></span>
              <span className="mrow-body">
                <span className="mrow-nm post">{preview(i18n(r.body_i18n))}</span>
                <span className="mrow-meta">{fmtDate(r.created_at)} · <Icon n="heart" size={12} className="mi" /> {r.likes} · <Icon n="chat" size={12} className="mi" /> {r.comments}</span>
                {r.status === 'hidden' && <span className="mrow-tags"><span className="t off">ซ่อนอยู่</span></span>}
              </span>
              <Icon n="chevR" size={20} className="mrow-go" />
            </a>
          ))}
        </div>
      )}
    </>
  );
}
