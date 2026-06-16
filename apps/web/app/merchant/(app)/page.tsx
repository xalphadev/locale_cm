import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { Icon } from './ui';

export const dynamic = 'force-dynamic';

const CONSUMER = process.env.CONSUMER_BASE ?? 'http://127.0.0.1:3003';

export default async function Dashboard() {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  const sells = !!acc.sells_products;
  const stay = !!acc.offers_stay;
  const [stats] = await q<any>(
    `SELECT (SELECT count(*) FROM shop_products WHERE place_id=$1 AND status='published') products,
            (SELECT count(*) FROM stay_units    WHERE place_id=$1 AND status='published') rooms,
            (SELECT count(*) FROM feed_posts    WHERE place_id=$1 AND status='published') posts`, [acc.place_id]);
  const live = acc.place_status === 'published';
  return (
    <>
      <h1>สวัสดี, {i18n(acc.place_name) || acc.display_name}</h1>
      <div className={`pstatus ${live ? 'on' : ''}`}>{live ? '● ร้านของคุณเผยแพร่แล้ว — ลูกค้าเห็นได้' : '○ ร้านยังไม่เผยแพร่ — รอทีมงานตรวจสอบ'}</div>
      <div className="pcards">
        {sells && <a className="pstat" href="/merchant/products"><span className="pstat-ic"><Icon n="tag" size={18} /></span><div className="n">{stats?.products ?? 0}</div><div className="l">สินค้า</div></a>}
        {stay && <a className="pstat" href="/merchant/rooms"><span className="pstat-ic"><Icon n="bed" size={18} /></span><div className="n">{stats?.rooms ?? 0}</div><div className="l">ห้องพัก</div></a>}
        <a className="pstat" href="/merchant/post"><span className="pstat-ic"><Icon n="feed" size={18} /></span><div className="n">{stats?.posts ?? 0}</div><div className="l">โพสต์ในฟีด</div></a>
      </div>
      <div className="pquick">
        <a className="btn btn-primary" href="/merchant/post/new"><Icon n="feed" size={17} /> โพสต์ลงฟีด</a>
        {sells && <a className="btn" href="/merchant/products/new"><Icon n="plus" size={17} /> เพิ่มสินค้า</a>}
        {stay && <a className="btn" href="/merchant/rooms/new"><Icon n="plus" size={17} /> เพิ่มห้องพัก</a>}
        <a className="btn" href="/merchant/shop"><Icon n="store" size={17} /> แก้ข้อมูลร้าน</a>
        {acc.place_id && <a className="btn ghost" href={`${CONSUMER}/place/${acc.place_id}`} target="_blank"><Icon n="ext" size={16} /> ดูหน้าร้านที่ลูกค้าเห็น</a>}
      </div>
      {!sells && !stay && (
        <p className="note">ร้านของคุณตั้งเป็น "ร้านทั่วไป" — โพสต์ลงฟีดเพื่อโปรโมทได้เลย หากต้องการเพิ่มเมนู "สินค้า" หรือ "ห้องพัก" เปิดได้ที่หน้า "ร้าน"</p>
      )}
      <p className="note">การซื้อขายทั้งหมดติดต่อกับลูกค้าโดยตรง (LINE / โทร) — Soi Hop เป็นที่โชว์ร้านและสินค้า ไม่รับชำระเงินแทนร้าน</p>
    </>
  );
}
