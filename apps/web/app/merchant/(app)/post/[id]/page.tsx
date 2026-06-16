import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { Icon, Thumb, isUuid } from '../../ui';
import { setPostFlagAction, deletePostAction } from '../../../actions';

export const dynamic = 'force-dynamic';
const fmtDate = (ts: any) => new Date(ts).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: '2-digit' });

export default async function PostDetail({ params }: { params: { id: string } }) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  const [p] = isUuid(params.id) ? await q<any>(
    `SELECT fp.*, (SELECT count(*) FROM post_likes WHERE post_key='post:'||fp.id)::int likes,
            (SELECT count(*) FROM post_comments WHERE post_key='post:'||fp.id AND deleted_at IS NULL)::int comments
       FROM feed_posts fp WHERE fp.id=$1 AND fp.place_id=$2 AND fp.deleted_at IS NULL`, [params.id, acc.place_id]) : [];
  if (!p) return (<><div className="mback"><a href="/merchant/post"><Icon n="chevL" size={18} /> โพสต์</a></div><h1>ไม่พบโพสต์</h1></>);

  const imgs: string[] | null = p.image_urls;
  const hidden = p.status === 'hidden';
  return (
    <>
      <div className="mback"><a href="/merchant/post"><Icon n="chevL" size={18} /> โพสต์</a></div>

      <div className="dhero">
        {imgs && imgs.length ? (
          <div className="dgal">{imgs.map((src, i) => <img key={i} src={src} alt="" loading={i ? 'lazy' : 'eager'} />)}</div>
        ) : (
          <span className="dhero-ph"><Thumb images={null} kind="post" /><span>โพสต์นี้ไม่มีรูป</span></span>
        )}
        {imgs && imgs.length > 1 && <span className="dcount"><Icon n="image" size={12} /> {imgs.length} รูป</span>}
      </div>

      <div className="dtitle">
        <div className="dtags">
          <span className="t cat"><Icon n="feed" size={12} /> โพสต์ในฟีด</span>
          {hidden && <span className="t off">ซ่อนอยู่</span>}
        </div>
        <p className="dpost-body">{i18n(p.body_i18n)}</p>
        <div className="dpost-meta">
          <span><Icon n="clock" size={14} className="flat-ico" /> {fmtDate(p.created_at)}</span>
          <span><Icon n="heart" size={14} className="flat-ico" /> {p.likes} ถูกใจ</span>
          <span><Icon n="chat" size={14} className="flat-ico" /> {p.comments} คอมเมนต์</span>
        </div>
      </div>

      <h2 className="rsec"><span className="rsec-ic"><Icon n="feed" size={15} /></span> จัดการโพสต์</h2>
      <div className="dbar">
        <a className="dbtn primary" href={`/merchant/post/${p.id}/edit`}><Icon n="edit" size={18} /> แก้ไขโพสต์</a>
        <form action={setPostFlagAction.bind(null, p.id, hidden ? 'show' : 'hide')}><button className="dbtn" type="submit"><Icon n={hidden ? 'eye' : 'eyeOff'} size={18} /> {hidden ? 'แสดงในฟีดลูกค้า' : 'ซ่อนจากฟีด'}</button></form>
      </div>
      <form className="delwrap" action={deletePostAction.bind(null, p.id)}>
        <button className="dbtn danger" type="submit"><Icon n="trash" size={17} /> ลบโพสต์นี้</button>
      </form>
    </>
  );
}
