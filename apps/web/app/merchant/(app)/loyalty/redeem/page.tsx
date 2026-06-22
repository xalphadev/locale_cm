import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { Icon } from '../../ui';
import { confirmRedemptionAction } from '../../../actions';

export const dynamic = 'force-dynamic';

// Counter: confirm customers' pending stamp redemptions. Customer initiates in the consumer app;
// the merchant confirms here → fn_redeem_stamps burns the stamps (fail-closed, idempotent).
export default async function Redeem({ searchParams }: { searchParams: { ok?: string } }) {
  const acc = await currentAccount();
  if (!acc?.brand_id) redirect('/merchant/login');
  const pend = await q<any>(
    `SELECT sr.id, sr.cost_stamps, r.title_i18n, substr(sr.user_id::text,1,8) uref
       FROM shop_redemptions sr JOIN stamp_rewards r ON r.id = sr.reward_id
      WHERE sr.brand_id=$1 AND sr.status='pending'
      ORDER BY sr.created_at DESC`, [acc.brand_id]);

  return (
    <>
      <div className="mback"><Link href="/merchant/loyalty"><Icon n="chevL" size={17} /> แต้มสะสม</Link></div>
      <h1 className="phead"><span className="phead-ic"><Icon n="check" size={18} /></span> แลกแต้มที่เคาน์เตอร์</h1>
      <p className="note" style={{ margin: '.1rem 0 1rem' }}>ลูกค้ากดแลกในแอป → รายการขึ้นที่นี่ → กด “ยืนยัน” เพื่อตัดแต้มแล้วมอบของรางวัล</p>
      {searchParams?.ok && <div className="banner-ok">✓ ยืนยันการแลกแล้ว — มอบของรางวัลให้ลูกค้าได้เลย</div>}

      {pend.length === 0 ? (
        <div className="mempty">
          <span className="mempty-ic"><Icon n="check" size={26} /></span>
          <p>ยังไม่มีรายการรอแลก — เมื่อลูกค้ากดแลกในแอป จะขึ้นที่นี่</p>
        </div>
      ) : (
        <div className="mlist">
          {pend.map((p) => (
            <div className="mrow" key={p.id}>
              <span className="mrow-img"><span className="ph"><Icon n="spark" size={24} /></span></span>
              <div className="mrow-body">
                <div className="mrow-nm">{i18n(p.title_i18n)}</div>
                <div className="mrow-meta">ลูกค้า #{p.uref} · ใช้ {p.cost_stamps} แต้ม</div>
              </div>
              <form action={confirmRedemptionAction.bind(null, p.id)}>
                <button className="dbtn primary sm" type="submit">ยืนยัน</button>
              </form>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
