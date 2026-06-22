import Link from 'next/link';
import { q, i18n, coins, cover, demoUserId } from '@/lib/db';
import { sessionUserId } from '@/lib/auth';
import { logoutAction } from '../auth/actions';
import { Icon } from '../icons';

export const dynamic = 'force-dynamic';
const catTH = (c: string) => (c === 'eat' ? 'กิน' : c === 'see' ? 'เที่ยว' : 'ทำกิจกรรม');

export default async function Profile() {
  const loggedIn = !!sessionUserId();
  let name = 'ผู้ใช้ Locale', email: string | null = null, sparks = 0, coinMinor = 0, nSaved = 0, nReviews = 0;
  let saved: any[] = [], quests: any[] = [], down = false;
  try {
    const uid = await demoUserId();
    if (uid) {
      const [pr] = await q<any>(`SELECT display_name FROM profiles WHERE user_id=$1`, [uid]);
      if (pr?.display_name) name = pr.display_name;
      if (loggedIn) {
        const [cr] = await q<any>(
          `SELECT email FROM user_credentials WHERE user_id=$1
           UNION SELECT email FROM user_identities WHERE user_id=$1 AND email IS NOT NULL LIMIT 1`, [uid]);
        email = cr?.email ?? null;
      }
      const [sb] = await q<any>(`SELECT balance FROM spark_balances WHERE user_id=$1`, [uid]); sparks = sb ? Number(sb.balance) : 0;
      const [c] = await q<any>(`SELECT COALESCE(SUM(remaining_minor),0) m FROM coin_lots WHERE user_id=$1 AND state='active'`, [uid]); coinMinor = c ? Number(c.m) : 0;
      const [sv] = await q<any>(`SELECT count(*) n FROM saved_places WHERE user_id=$1`, [uid]); nSaved = Number(sv.n);
      const [rv] = await q<any>(`SELECT count(*) n FROM reviews WHERE user_id=$1`, [uid]); nReviews = Number(rv.n);
      saved = await q<any>(`SELECT p.id, p.name_i18n, p.category::text category, p.subcategory FROM saved_places s JOIN places p ON p.id=s.place_id WHERE s.user_id=$1 ORDER BY s.created_at DESC`, [uid]);
      quests = await q<any>(`SELECT qu.id, qu.title_i18n, qp.status::text status, COALESCE(jsonb_array_length(qp.steps_completed),0) done, qu.min_steps_required need FROM quest_progress qp JOIN quests qu ON qu.id=qp.quest_id WHERE qp.user_id=$1 ORDER BY (qp.status='in_progress') DESC, qp.created_at DESC LIMIT 5`, [uid]);
    }
  } catch { down = true; }

  if (down) return (<><div className="top"><h1>โปรไฟล์</h1></div><div className="body"><p className="empty">ต่อฐานข้อมูลไม่ได้</p></div></>);

  return (
    <>
      <div className="top" style={{ paddingBottom: 0 }}>
        <div className="phead">
          <div className="pav">{name[0]}</div>
          <div><div className="pn">{name}</div><div className="psub">{loggedIn ? (email || 'สมาชิก Locale') : 'ยังไม่ได้เข้าสู่ระบบ'}</div></div>
        </div>
        <div className="body" style={{ paddingTop: 0 }}>
          <div className="pstats">
            <div className="ptile"><div className="pv">{sparks}</div><div className="pl">Sparks</div></div>
            <div className="ptile"><div className="pv">{coins(coinMinor)}</div><div className="pl">Coins</div></div>
            <div className="ptile"><div className="pv">{nReviews}</div><div className="pl">รีวิว</div></div>
            <div className="ptile"><div className="pv">{nSaved}</div><div className="pl">เซฟไว้</div></div>
          </div>
        </div>
      </div>

      <div className="body" style={{ paddingTop: 4 }}>
        {loggedIn ? (
          <form action={logoutAction}><button className="authstrip out" type="submit">ออกจากระบบ</button></form>
        ) : (
          <Link className="authstrip in" href="/login">เข้าสู่ระบบ / สมัครสมาชิก — เพื่อสะสมแต้มของคุณเอง <span aria-hidden>›</span></Link>
        )}

        <div className="sec" style={{ padding: 0, marginTop: '.6rem' }}><h2>ที่บันทึกไว้</h2><Link className="more" href="/community">ชุมชน ›</Link></div>
        {saved.map((p) => (
          <Link className="erow" key={p.id} href={`/place/${p.id}`}>
            <div className="ethumb" style={{ background: 'none' }}><img src={cover(p.id, p.subcategory, p.category, 160, 160)} alt="" loading="lazy" /></div>
            <div><div className="nm">{i18n(p.name_i18n)}</div><div className="meta">{catTH(p.category)}{p.subcategory ? ` · ${p.subcategory}` : ''}</div></div>
            <span className="chev"><Icon n="chevR" size={18} /></span>
          </Link>
        ))}
        {saved.length === 0 && <p className="empty">ยังไม่มีที่บันทึก — แตะ <Icon n="bookmark" size={14} className="flat-ico" /> ในหน้าร้านเพื่อเก็บไว้</p>}

        <div className="sec" style={{ padding: 0 }}><h2>เควสต์ของฉัน</h2></div>
        {quests.map((qu) => (
          <Link className="erow" key={qu.id} href="/passport">
            <div className="ethumb" style={{ background: 'linear-gradient(135deg,#E7C56A,#C9962A)' }}><Icon n="ticket" size={24} /></div>
            <div><div className="nm">{i18n(qu.title_i18n)}</div><div className="meta">{qu.status === 'in_progress' ? `เก็บแล้ว ${qu.done}/${qu.need} แสตมป์` : 'เก็บครบแล้ว'}</div></div>
            <span className="chev"><Icon n="chevR" size={18} /></span>
          </Link>
        ))}
        {quests.length === 0 && <p className="empty">ยังไม่ได้เริ่มเควสต์</p>}
      </div>
    </>
  );
}
