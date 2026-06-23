import Link from 'next/link';
import { q, i18n, pickCover } from '@/lib/db';
import { Icon } from '../icons';

export const dynamic = 'force-dynamic';

export default async function Community() {
  let reviewers: any[] = [], recent: any[] = [], down = false;
  try {
    reviewers = await q<any>(
      `SELECT pr.display_name, count(*)::int n FROM reviews r JOIN profiles pr ON pr.user_id=r.user_id
       WHERE r.moderation_status='approved' GROUP BY pr.display_name ORDER BY n DESC, pr.display_name LIMIT 12`);
    recent = await q<any>(
      `SELECT r.rating, r.body_i18n, pr.display_name, p.id pid, p.name_i18n pname, p.subcategory psub, p.category::text pcat, p.image_urls pimg,
              to_char(r.created_at,'YYYY-MM-DD') d
       FROM reviews r JOIN profiles pr ON pr.user_id=r.user_id JOIN places p ON p.id=r.place_id
       WHERE r.moderation_status='approved' ORDER BY r.created_at DESC LIMIT 24`);
  } catch { down = true; }

  return (
    <>
      <div className="top"><Link className="back" href="/"><Icon n="back" size={18} /> กลับ</Link>
        <div className="hi">ชาวซอยฮ็อปกำลังพูดถึง</div><h1>ชุมชน</h1></div>

      {down ? <div className="body"><p className="empty">ต่อฐานข้อมูลไม่ได้</p></div> : (
        <>
          <div className="sec"><h2>นักรีวิวเด่น</h2></div>
          <div className="reviewers">
            {reviewers.map((r, i) => (
              <div className="reviewer" key={i}>
                <div className="rav">{(r.display_name || 'ผ')[0]}</div>
                <div className="rn">{r.display_name}</div>
                <div className="rc">{r.n} รีวิว</div>
              </div>
            ))}
          </div>

          <div className="sec"><h2>รีวิวล่าสุด</h2></div>
          {recent.map((r, i) => (
            <Link className="crev" key={i} href={`/place/${r.pid}`}>
              <img className="cphoto" src={pickCover(r.pimg, r.pid, r.psub, r.pcat, 160, 160)} alt="" loading="lazy" />
              <div className="cw">
                <div className="ctop"><span className="avatar">{(r.display_name || 'ผ')[0]}</span><span className="cname">{r.display_name || 'ผู้ใช้'}</span>
                  <span className="cstars">{Array.from({ length: r.rating }).map((_, k) => <Icon key={k} n="star" fill="currentColor" size={12} />)}</span></div>
                <div className="cbody">{i18n(r.body_i18n)}</div>
                <div className="cplace"><Icon n="pin" size={13} className="flat-ico" /> {i18n(r.pname)} · {r.d}</div>
              </div>
            </Link>
          ))}
        </>
      )}
    </>
  );
}
