import Link from 'next/link';
import { q, demoUserId, i18n } from '@/lib/db';
import { Icon } from '../icons';

export const dynamic = 'force-dynamic';

const ago = (d: any) => {
  const m = Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 60000));
  if (m < 1) return 'เมื่อกี้'; if (m < 60) return `${m} นาทีก่อน`;
  const h = Math.floor(m / 60); if (h < 24) return `${h} ชม.ก่อน`;
  return `${Math.floor(h / 24)} วันก่อน`;
};

export default async function Inbox() {
  const uid = await demoUserId();
  let rows: any[] = [];
  if (uid) {
    rows = await q<any>(
      `SELECT n.id, n.event_type, n.payload, n.created_at,
              p.id pid, p.name_i18n pname
         FROM notif_outbox n
         LEFT JOIN places p ON p.id = n.entity_id AND n.entity_type='place'
        WHERE n.audience_user_id=$1
        ORDER BY n.created_at DESC LIMIT 60`, [uid]);
  }

  return (
    <>
      <div className="top">
        <Link className="back" href="/"><Icon n="back" size={18} /> สำรวจ</Link>
        <h1>การแจ้งเตือน</h1>
        <p className="top-sub">ดีลจากร้านที่คุณบันทึก แต้ม และกิจกรรม</p>
      </div>
      {!uid ? (
        <p className="empty">เข้าสู่ระบบเพื่อรับการแจ้งเตือน — <Link href="/login">เข้าสู่ระบบ</Link></p>
      ) : rows.length === 0 ? (
        <p className="empty">ยังไม่มีการแจ้งเตือน — บันทึกร้านที่ชอบ แล้วเราจะเตือนเมื่อมีดีลใหม่</p>
      ) : (
        <div className="nlist">
          {rows.map((n) => {
            const title = n.payload?.title || '';
            const place = i18n(n.pname);
            const isDeal = n.event_type === 'deal_published';
            return (
              <Link className="nrow" key={n.id} href={n.pid ? `/place/${n.pid}` : '#'}>
                <span className="nic"><Icon n={isDeal ? 'tag' : 'sparkles'} size={18} /></span>
                <div className="nbody">
                  <div className="ntx">
                    {isDeal ? <><b>{place}</b> ที่คุณบันทึกมีดีลใหม่{title ? <> · {title}</> : null}</>
                      : <>{title || 'มีอัปเดตใหม่'}</>}
                  </div>
                  <div className="ntime">{ago(n.created_at)}</div>
                </div>
                <Icon n="chevR" className="ngo" size={16} />
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
