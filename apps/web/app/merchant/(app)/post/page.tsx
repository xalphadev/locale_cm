import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { PostList } from './PostList';

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
  const items = rows.map((r) => ({
    id: r.id, body: preview(i18n(r.body_i18n)), date: fmtDate(r.created_at),
    likes: r.likes, comments: r.comments, image_urls: r.image_urls, status: r.status,
  }));
  return (
    <>
      {searchParams?.ok === '1' && <div className="banner-ok">✓ โพสต์แล้ว — ลูกค้าเห็นในแท็บ “อัปเดต”</div>}
      {searchParams?.ok === 'updated' && <div className="banner-ok">✓ บันทึกการแก้ไขแล้ว</div>}
      {searchParams?.ok === 'deleted' && <div className="banner-ok">✓ ลบโพสต์แล้ว</div>}
      <PostList items={items} />
    </>
  );
}
