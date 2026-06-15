import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';

export const dynamic = 'force-dynamic';

const CONSUMER = process.env.CONSUMER_BASE ?? 'http://127.0.0.1:3003';

export default async function Dashboard() {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  const [stats] = await q<any>(
    `SELECT (SELECT count(*) FROM shop_products WHERE place_id=$1 AND status='published') products,
            (SELECT count(*) FROM feed_posts   WHERE place_id=$1 AND status='published') posts`, [acc.place_id]);
  const live = acc.place_status === 'published';
  return (
    <>
      <h1>สวัสดี, {i18n(acc.place_name) || acc.display_name}</h1>
      <div className={`pstatus ${live ? 'on' : ''}`}>{live ? '● ร้านของคุณเผยแพร่แล้ว — ลูกค้าเห็นได้' : '○ ร้านยังไม่เผยแพร่ — รอทีมงานตรวจสอบ'}</div>
      <div className="pcards">
        <a className="pstat" href="/merchant/products"><div className="n">{stats?.products ?? 0}</div><div className="l">สินค้า</div></a>
        <a className="pstat" href="/merchant/post"><div className="n">{stats?.posts ?? 0}</div><div className="l">โพสต์ในฟีด</div></a>
      </div>
      <div className="pquick">
        <a className="btn btn-primary" href="/merchant/products">+ เพิ่มสินค้า</a>
        <a className="btn" href="/merchant/post">+ โพสต์ลงฟีด</a>
        <a className="btn" href="/merchant/shop">แก้ข้อมูลร้าน</a>
        {acc.place_id && <a className="btn ghost" href={`${CONSUMER}/place/${acc.place_id}`} target="_blank">ดูหน้าร้านที่ลูกค้าเห็น ↗</a>}
      </div>
      <p className="note">การซื้อขายทั้งหมดติดต่อกับลูกค้าโดยตรง (LINE / โทร) — Soi Hop เป็นที่โชว์ร้านและสินค้า ไม่รับชำระเงินแทนร้าน</p>
    </>
  );
}
