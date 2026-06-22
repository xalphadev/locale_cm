import Link from 'next/link';
import { q, demoUserId, i18n } from '@/lib/db';
import { Icon } from '../icons';
import { spendSparksAction } from '../actions';

export const dynamic = 'force-dynamic';

// Sparks store — the platform-points SINK. Spend Sparks (earned via check-in/streak) on cosmetics.
// Non-money, non-transferable (the cosmetic is yours only); never a ฿ figure.
export default async function SparksStore() {
  let sparks = 0; let items: any[] = []; let down = false;
  try {
    const uid = await demoUserId();
    if (uid) {
      const [sb] = await q<any>(`SELECT balance FROM spark_balances WHERE user_id=$1`, [uid]);
      sparks = sb ? Number(sb.balance) : 0;
      const owned = new Set((await q<any>(`SELECT reward_id FROM user_cosmetics WHERE user_id=$1`, [uid])).map((r: any) => r.reward_id));
      const rewards = await q<any>(
        `SELECT id, name_i18n, description_i18n, cost_sparks FROM platform_rewards
          WHERE status='active' AND kind='cosmetic' ORDER BY cost_sparks`);
      items = rewards.map((r: any) => ({ ...r, owned: owned.has(r.id) }));
    }
  } catch { down = true; }

  if (down) return (<><div className="top"><Link className="back" href="/wallet"><Icon n="back" size={18} /> กระเป๋า</Link><h1>ร้านค้า Sparks</h1></div>
    <div className="body"><p className="empty">ต่อฐานข้อมูลไม่ได้</p></div></>);

  return (
    <>
      <div className="top">
        <Link className="back" href="/wallet"><Icon n="back" size={18} /> กระเป๋า</Link>
        <div className="hi">แต้มแอป · แลกของแต่ง</div>
        <h1>ร้านค้า Sparks</h1>
        <div className="sparkbal"><Icon n="sparkles" size={15} style={{ verticalAlign: '-.18em' }} /> {sparks} Sparks</div>
      </div>
      <div className="body">
        <p className="muted" style={{ marginTop: -2, marginBottom: 14, fontSize: '.86rem' }}>
          เอา Sparks ที่สะสมจากการเช็คอิน/สตรีค มาแลกของแต่งโปรไฟล์ — ของพวกนี้ของคุณคนเดียว โอน/ขายต่อไม่ได้ และไม่ใช่เงิน
        </p>
        {items.length === 0 ? (
          <p className="empty">ยังไม่มีของให้แลกตอนนี้</p>
        ) : (
          <div className="cosgrid">
            {items.map((it: any) => {
              const cost = it.cost_sparks;
              const afford = sparks >= cost;
              return (
                <div className={`coscard ${it.owned ? 'owned' : ''}`} key={it.id}>
                  <div className="cosart"><Icon n="sparkles" size={28} /></div>
                  <div className="cosnm">{i18n(it.name_i18n)}</div>
                  <div className="coscost">{cost} Sparks</div>
                  {it.owned ? (
                    <div className="cosbtn owned"><Icon n="check" size={13} /> มีแล้ว</div>
                  ) : afford ? (
                    <form action={spendSparksAction.bind(null, it.id)}><button className="cosbtn" type="submit">แลก</button></form>
                  ) : (
                    <div className="cosbtn off">อีก {cost - sparks}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
