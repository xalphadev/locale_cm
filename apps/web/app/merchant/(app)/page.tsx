import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { Icon } from './ui';

export const dynamic = 'force-dynamic';

const CONSUMER = process.env.CONSUMER_BASE ?? 'http://127.0.0.1:3003';

// Shopkeeper home — a big, plain list menu (Thai banking-app style): one clear primary action,
// then tall tappable rows. No dense stat grid, no jargon.
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
      <div className={`bigstatus ${live ? 'on' : ''}`}>
        <span className="bigstatus-dot" />
        <span>{live ? 'ร้านเผยแพร่แล้ว ลูกค้าเห็นร้านคุณได้' : 'รอทีมงานตรวจ — ร้านยังไม่ขึ้นให้ลูกค้าเห็น'}</span>
      </div>

      <div className="menu-label">จัดการร้านนี้</div>
      <div className="menu">
        {sells && (
          <a className="menu-row" href="/merchant/products">
            <span className="menu-ic"><Icon n="tag" size={20} /></span>
            <span className="menu-tx">สินค้า</span>
            <span className="menu-val">{stats?.products ?? 0}</span>
            <Icon n="chevR" className="menu-go" size={18} />
          </a>
        )}
        {stay && (
          <a className="menu-row" href="/merchant/rooms">
            <span className="menu-ic"><Icon n="bed" size={20} /></span>
            <span className="menu-tx">ห้องพัก</span>
            <span className="menu-val">{stats?.rooms ?? 0}</span>
            <Icon n="chevR" className="menu-go" size={18} />
          </a>
        )}
        <a className="menu-row" href="/merchant/loyalty">
          <span className="menu-ic"><Icon n="spark" size={21} /></span>
          <span className="menu-tx">แต้มสะสม · ของรางวัล</span>
          <Icon n="chevR" className="menu-go" size={18} />
        </a>
        <a className="menu-row" href="/merchant/shop">
          <span className="menu-ic"><Icon n="store" size={20} /></span>
          <span className="menu-tx">ข้อมูลร้าน · ที่อยู่ · เบอร์</span>
          <Icon n="chevR" className="menu-go" size={18} />
        </a>
      </div>

      <div className="menu-label">ร้านของฉัน</div>
      <div className="menu">
        <a className="menu-row" href="/merchant/shops">
          <span className="menu-ic"><Icon n="store" size={20} /></span>
          <span className="menu-tx">ร้าน / สาขาทั้งหมด</span>
          {acc.branch_count > 1 ? <span className="menu-val">{acc.branch_count}</span> : null}
          <Icon n="chevR" className="menu-go" size={18} />
        </a>
        <a className="menu-row" href={`${CONSUMER}/place/${acc.place_id}`} target="_blank">
          <span className="menu-ic"><Icon n="eye" size={19} /></span>
          <span className="menu-tx">ดูหน้าร้านที่ลูกค้าเห็น</span>
          <Icon n="ext" className="menu-go" size={16} />
        </a>
      </div>

      {!sells && !stay && (
        <p className="note">ร้านของคุณตั้งเป็น “ร้านทั่วไป” — ถ้าอยากเพิ่ม “สินค้า” หรือ “ห้องพัก” เปิดได้ที่ “ข้อมูลร้าน”</p>
      )}
      <p className="note">การซื้อขายติดต่อลูกค้าโดยตรง (LINE / โทร) — Locale เป็นที่โชว์ร้าน ไม่รับชำระเงินแทนร้าน</p>
    </>
  );
}
