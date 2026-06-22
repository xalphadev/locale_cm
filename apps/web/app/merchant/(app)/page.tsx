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
  const mode = acc.room_mode || 'multi';   // 'unique' (resort) manages rooms directly → no separate ผังห้อง board
  const [stats] = await q<any>(
    `SELECT (SELECT count(*) FROM shop_products WHERE place_id=$1 AND status='published' AND deleted_at IS NULL) products,
            (SELECT count(*) FROM stay_units    WHERE place_id=$1 AND status='published' AND deleted_at IS NULL) rooms,
            (SELECT count(*) FROM feed_posts    WHERE place_id=$1 AND status='published' AND deleted_at IS NULL) posts,
            (SELECT count(*) FROM stay_booking_request WHERE place_id=$1 AND status='new' AND deleted_at IS NULL) leads`, [acc.place_id]);
  // recycle-bin count: soft-deleted items for this branch (place) + brand (rewards) — drives the menu badge
  const [trash] = await q<any>(
    `SELECT (SELECT count(*) FROM shop_products WHERE place_id=$1 AND deleted_at IS NOT NULL)
          + (SELECT count(*) FROM stay_units    WHERE place_id=$1 AND deleted_at IS NOT NULL)
          + (SELECT count(*) FROM feed_posts    WHERE place_id=$1 AND deleted_at IS NOT NULL)
          + (SELECT count(*) FROM stamp_rewards WHERE brand_id=$2 AND deleted_at IS NOT NULL) n`,
    [acc.place_id, acc.brand_id ?? null]);
  const trashN = Number(trash?.n ?? 0);
  const live = acc.place_status === 'published';

  return (
    <>
      <div className={`bigstatus ${live ? 'on' : ''}`}>
        <span className="bigstatus-dot" />
        <span>{live ? 'ร้านเผยแพร่แล้ว ลูกค้าเห็นร้านคุณได้' : 'รอทีมงานตรวจ — ร้านยังไม่ขึ้นให้ลูกค้าเห็น'}</span>
      </div>

      {!acc.verified && (
        <a className="verifybanner" href="/merchant/verify">
          <span className="vb-ic"><Icon n="lock" size={18} /></span>
          <span className="vb-tx"><b>ยืนยันความเป็นเจ้าของร้าน</b><br />ปลดล็อกแต้มสะสม + ตรา “ยืนยันโดยเจ้าของร้าน” ที่ลูกค้าเห็น</span>
          <Icon n="chevR" className="vb-go" size={18} />
        </a>
      )}

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
            <span className="menu-tx">{mode === 'unique' ? 'ห้อง' : 'ห้องพัก'}</span>
            <span className="menu-val">{stats?.rooms ?? 0}</span>
            <Icon n="chevR" className="menu-go" size={18} />
          </a>
        )}
        {(stay || acc.manages_stay) && (
          <a className="menu-row" href="/merchant/leads">
            <span className="menu-ic"><Icon n="chat" size={20} /></span>
            <span className="menu-tx">คำขอจอง</span>
            {(stats?.leads ?? 0) > 0 ? <span className="menu-badge-new">ใหม่ {stats.leads}</span> : null}
            <Icon n="chevR" className="menu-go" size={18} />
          </a>
        )}
        {(stay || acc.manages_stay) && (
          <a className="menu-row" href="/merchant/pricing">
            <span className="menu-ic"><Icon n="wallet" size={20} /></span>
            <span className="menu-tx">ราคาตามฤดู</span>
            <Icon n="chevR" className="menu-go" size={18} />
          </a>
        )}
        <a className="menu-row" href={acc.verified ? '/merchant/loyalty' : '/merchant/verify?need=loyalty'}>
          <span className="menu-ic"><Icon n="spark" size={21} /></span>
          <span className="menu-tx">แต้มสะสม · ของรางวัล</span>
          {!acc.verified && <span className="menu-lock"><Icon n="lock" size={14} /> ล็อก</span>}
          <Icon n="chevR" className="menu-go" size={18} />
        </a>
        <a className="menu-row" href={acc.verified ? '/merchant/deals' : '/merchant/verify?need=deals'}>
          <span className="menu-ic"><Icon n="tag" size={20} /></span>
          <span className="menu-tx">ดีล · โปรโมชั่น</span>
          {!acc.verified && <span className="menu-lock"><Icon n="lock" size={14} /> ล็อก</span>}
          <Icon n="chevR" className="menu-go" size={18} />
        </a>
        <a className="menu-row" href={acc.verified ? '/merchant/payouts' : '/merchant/verify?need=payouts'}>
          <span className="menu-ic"><Icon n="wallet" size={20} /></span>
          <span className="menu-tx">ถอนเงิน · รายได้</span>
          {!acc.verified && <span className="menu-lock"><Icon n="lock" size={14} /> ล็อก</span>}
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
        <a className="menu-row" href="/merchant/trash">
          <span className="menu-ic"><Icon n="trash" size={20} /></span>
          <span className="menu-tx">ถังขยะ · รายการที่ลบ</span>
          {trashN > 0 ? <span className="menu-val">{trashN}</span> : null}
          <Icon n="chevR" className="menu-go" size={18} />
        </a>
      </div>

      {!sells && !stay && (
        <p className="note">ร้านของคุณตั้งเป็น “ร้านทั่วไป” — ถ้าอยากเพิ่ม “สินค้า” หรือ “ห้องพัก” เปิดได้ที่ “ข้อมูลร้าน”</p>
      )}
      <p className="note">การซื้อขายติดต่อลูกค้าโดยตรง (LINE / โทร) — Locale เป็นที่โชว์ร้าน ไม่รับชำระเงินแทนร้าน</p>
    </>
  );
}
