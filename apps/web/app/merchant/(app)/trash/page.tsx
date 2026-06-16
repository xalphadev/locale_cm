import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { Icon } from '../ui';
import {
  restoreProductAction, restoreStayUnitAction, restorePostAction, restoreRewardAction,
} from '../../actions';

export const dynamic = 'force-dynamic';

// Recycle bin — every soft-deleted item (deleted_at IS NOT NULL) for the active branch / brand,
// with a one-tap "กู้คืน" (restore). No permanent-delete button by design: the whole point of the
// soft-delete model is that nothing is lost, so this page only restores + lets the owner look back.
const fmtDate = (ts: any) => (ts ? new Date(ts).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) : '');
const baht = (m: any) => (m != null ? `฿${Math.round(m / 100).toLocaleString()}` : 'สอบถามราคา');
const preview = (s: string, n = 70) => { const t = (s || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n).trimEnd() + '…' : t; };

export default async function Trash({ searchParams }: { searchParams: { ok?: string } }) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');

  let products: any[] = [], rooms: any[] = [], posts: any[] = [], rewards: any[] = [];
  try {
    // products / rooms / posts are branch-scoped (place_id); rewards are brand-scoped (brand_id) — same
    // tenancy the rest of the portal uses. No capability gate so nothing becomes unrecoverable.
    products = await q<any>(`SELECT id, name_i18n, price_minor, deleted_at FROM shop_products WHERE place_id=$1 AND deleted_at IS NOT NULL ORDER BY deleted_at DESC`, [acc.place_id]);
    rooms = await q<any>(`SELECT id, name_i18n, price_minor, rental_mode, deleted_at FROM stay_units WHERE place_id=$1 AND deleted_at IS NOT NULL ORDER BY deleted_at DESC`, [acc.place_id]);
    posts = await q<any>(`SELECT id, body_i18n, deleted_at FROM feed_posts WHERE place_id=$1 AND deleted_at IS NOT NULL ORDER BY deleted_at DESC`, [acc.place_id]);
    if (acc.brand_id) rewards = await q<any>(`SELECT id, title_i18n, kind, cost_stamps, deleted_at FROM stamp_rewards WHERE brand_id=$1 AND deleted_at IS NOT NULL ORDER BY deleted_at DESC`, [acc.brand_id]);
  } catch { /* db down */ }

  const total = products.length + rooms.length + posts.length + rewards.length;

  return (
    <>
      <div className="mback"><a href="/merchant"><Icon n="chevL" size={17} /> หน้าหลัก</a></div>
      <h1 className="phead"><span className="phead-ic"><Icon n="trash" size={18} /></span> ถังขยะ</h1>
      <p className="note" style={{ margin: '.1rem 0 1rem' }}>รายการที่ลบจะถูกเก็บไว้ที่นี่ ไม่ได้หายถาวร — กด “กู้คืน” เพื่อนำกลับมาแสดงเหมือนเดิม</p>
      {searchParams?.ok === 'restored' && <div className="banner-ok">✓ กู้คืนแล้ว — รายการกลับมาแสดงเหมือนเดิม</div>}

      {total === 0 ? (
        <div className="mempty">
          <span className="mempty-ic"><Icon n="trash" size={26} /></span>
          <p>ถังขยะว่าง — ยังไม่มีรายการที่ลบ</p>
        </div>
      ) : (
        <>
          {products.length > 0 && (<>
            <div className="menu-label">สินค้า ({products.length})</div>
            <div className="mlist">
              {products.map((r) => (
                <div className="mrow" key={r.id}>
                  <span className="mrow-img"><span className="ph"><Icon n="box" size={24} /></span></span>
                  <div className="mrow-body">
                    <div className="mrow-nm">{i18n(r.name_i18n)}</div>
                    <div className="mrow-meta">{baht(r.price_minor)} · ลบเมื่อ {fmtDate(r.deleted_at)}</div>
                  </div>
                  <form action={restoreProductAction.bind(null, r.id)}>
                    <button className="dbtn primary sm" type="submit"><Icon n="restore" size={15} /> กู้คืน</button>
                  </form>
                </div>
              ))}
            </div>
          </>)}

          {rooms.length > 0 && (<>
            <div className="menu-label">ห้องพัก ({rooms.length})</div>
            <div className="mlist">
              {rooms.map((r) => (
                <div className="mrow" key={r.id}>
                  <span className="mrow-img"><span className="ph"><Icon n="bed" size={24} /></span></span>
                  <div className="mrow-body">
                    <div className="mrow-nm">{i18n(r.name_i18n)}</div>
                    <div className="mrow-meta">{r.rental_mode === 'daily' ? 'รายวัน' : 'รายเดือน'} · {baht(r.price_minor)} · ลบเมื่อ {fmtDate(r.deleted_at)}</div>
                  </div>
                  <form action={restoreStayUnitAction.bind(null, r.id)}>
                    <button className="dbtn primary sm" type="submit"><Icon n="restore" size={15} /> กู้คืน</button>
                  </form>
                </div>
              ))}
            </div>
          </>)}

          {posts.length > 0 && (<>
            <div className="menu-label">โพสต์ ({posts.length})</div>
            <div className="mlist">
              {posts.map((r) => (
                <div className="mrow" key={r.id}>
                  <span className="mrow-img"><span className="ph"><Icon n="feed" size={24} /></span></span>
                  <div className="mrow-body">
                    <div className="mrow-nm">{preview(i18n(r.body_i18n)) || 'โพสต์'}</div>
                    <div className="mrow-meta">โพสต์ในฟีด · ลบเมื่อ {fmtDate(r.deleted_at)}</div>
                  </div>
                  <form action={restorePostAction.bind(null, r.id)}>
                    <button className="dbtn primary sm" type="submit"><Icon n="restore" size={15} /> กู้คืน</button>
                  </form>
                </div>
              ))}
            </div>
          </>)}

          {rewards.length > 0 && (<>
            <div className="menu-label">ของรางวัล ({rewards.length})</div>
            <div className="mlist">
              {rewards.map((r) => (
                <div className="mrow" key={r.id}>
                  <span className="mrow-img"><span className="ph"><Icon n={r.kind === 'privilege' ? 'spark' : r.kind === 'discount' ? 'tag' : 'box'} size={24} /></span></span>
                  <div className="mrow-body">
                    <div className="mrow-nm">{i18n(r.title_i18n)}</div>
                    <div className="mrow-meta">ของรางวัล · ใช้ {r.cost_stamps} แต้ม · ลบเมื่อ {fmtDate(r.deleted_at)}</div>
                  </div>
                  <form action={restoreRewardAction.bind(null, r.id)}>
                    <button className="dbtn primary sm" type="submit"><Icon n="restore" size={15} /> กู้คืน</button>
                  </form>
                </div>
              ))}
            </div>
          </>)}

          <p className="note" style={{ marginTop: 14 }}>รายการที่กู้คืนจะกลับไปสถานะเดิม (เผยแพร่/ซ่อน ตามก่อนลบ) — ตรวจในแต่ละเมนูได้อีกครั้ง</p>
        </>
      )}
    </>
  );
}
