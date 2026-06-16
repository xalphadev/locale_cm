import { q, demoUserId, coins, i18n } from '@/lib/db';
import { Icon } from '../icons';
import { redeemStampRewardAction } from '../actions';

export const dynamic = 'force-dynamic';

export default async function Wallet() {
  let sparks = 0, coinMinor = 0, expiry: string | null = null, readyReward = false;
  let stampCards: any[] = [];
  let down = false;
  try {
    const uid = await demoUserId();
    if (uid) {
      const [sb] = await q<any>(`SELECT balance FROM spark_balances WHERE user_id=$1`, [uid]);
      sparks = sb ? Number(sb.balance) : 0;
      const [c] = await q<any>(
        `SELECT COALESCE(SUM(remaining_minor),0) m, to_char(MIN(expires_at),'DD/MM/YYYY') exp
         FROM coin_lots WHERE user_id=$1 AND state='active'`, [uid]);
      coinMinor = c ? Number(c.m) : 0; expiry = c?.exp ?? null;
      const [rr] = await q<any>(`SELECT 1 FROM quest_progress WHERE user_id=$1 AND status='completed' LIMIT 1`, [uid]);
      readyReward = !!rr;

      // my shop stamp cards (per brand) + each brand's rewards + which are waiting at the counter
      const cards = await q<any>(
        `SELECT sb.brand_id, sb.balance, b.name_i18n brand_name, sp.points_name_i18n
           FROM stamp_balances sb
           JOIN brands b ON b.id = sb.brand_id
           JOIN stamp_programs sp ON sp.brand_id = sb.brand_id AND sp.status='active'
          WHERE sb.user_id=$1 AND sb.balance > 0 ORDER BY sb.updated_at DESC`, [uid]);
      if (cards.length) {
        const ids = cards.map((c: any) => c.brand_id);
        const rewards = await q<any>(
          `SELECT id, brand_id, title_i18n, cost_stamps FROM stamp_rewards
            WHERE brand_id = ANY($1) AND status='active' ORDER BY cost_stamps`, [ids]);
        const pend = await q<any>(`SELECT reward_id FROM shop_redemptions WHERE user_id=$1 AND status='pending'`, [uid]);
        const pset = new Set(pend.map((p: any) => p.reward_id));
        stampCards = cards.map((c: any) => ({
          ...c,
          rewards: rewards.filter((r: any) => r.brand_id === c.brand_id).map((r: any) => ({ ...r, pending: pset.has(r.id) })),
        }));
      }
    }
  } catch { down = true; }

  if (down) return (<><div className="top"><div className="hi">ยอดสะสม</div><h1>กระเป๋าของฉัน</h1></div>
    <div className="body"><p className="empty">ต่อฐานข้อมูลไม่ได้</p></div></>);

  return (
    <>
      <div className="top"><div className="hi">ยอดสะสม</div><h1>กระเป๋าของฉัน</h1></div>
      <div className="body">
        <div className="bal">
          <div className="balcard sp">
            <div className="lab"><Icon n="sparkles" size={15} style={{ verticalAlign: '-.18em' }} /> Sparks</div>
            <div className="v">{sparks}</div>
            <div className="note">สะสมเลื่อนระดับ · แลกของไม่ได้</div>
          </div>
          <div className="balcard co">
            <div className="lab"><Icon n="ticket" size={15} style={{ verticalAlign: '-.18em' }} /> Coins</div>
            <div className="v">{coins(coinMinor)}</div>
            <div className="note">แลกของจริงที่ร้าน · ถอนเป็นเงินสดไม่ได้{expiry ? ` · หมดอายุ ${expiry}` : ''}</div>
          </div>
        </div>

        {stampCards.length > 0 && (
          <section>
            <h2 style={{ marginTop: 4 }}>สมุดแสตมป์ของฉัน</h2>
            {stampCards.map((c: any) => {
              const pn = i18n(c.points_name_i18n) || 'แต้ม';
              const next = c.rewards.find((r: any) => r.cost_stamps > c.balance);
              const target = (next ? next.cost_stamps : (c.rewards.length ? c.rewards[c.rewards.length - 1].cost_stamps : c.balance)) || 1;
              const pct = Math.min(100, Math.round((c.balance / target) * 100));
              const ready = c.rewards.filter((r: any) => r.cost_stamps <= c.balance);
              return (
                <div className="stampcard" key={c.brand_id}>
                  <div className="stampcard-h">
                    <span className="stampcard-nm">{i18n(c.brand_name)}</span>
                    <span className="stampcard-bal">{c.balance} {pn}</span>
                  </div>
                  <div className="stampbar"><span style={{ width: `${pct}%` }} /></div>
                  {next && <div className="stampcard-next">อีก {next.cost_stamps - c.balance} {pn} → {i18n(next.title_i18n)}</div>}
                  {ready.map((r: any) => r.pending ? (
                    <div className="stampredeem pending" key={r.id}><Icon n="check" size={14} /> รอพนักงานยืนยัน — โชว์หน้านี้ที่เคาน์เตอร์</div>
                  ) : (
                    <form action={redeemStampRewardAction.bind(null, r.id)} key={r.id}>
                      <button className="stampredeem" type="submit">แลก {i18n(r.title_i18n)} · ใช้ {r.cost_stamps} {pn}</button>
                    </form>
                  ))}
                </div>
              );
            })}
          </section>
        )}

        <div className="shield">
          <Icon n="check" size={18} />
          <span>ทุกเหรียญค้ำด้วย<b>เงินบาทจริง</b>ที่ร้านพาร์ตเนอร์ฝากไว้ — มีมูลค่าจริงเสมอ ไม่ใช่แต้มลอยๆ ที่หมดค่า</span>
        </div>

        <h2>รางวัลของฉัน</h2>
        {readyReward ? (
          <div className="reward-row">
            <div className="seal"><Icon n="coffee" size={22} style={{ color: '#fff' }} /></div>
            <div><div style={{ fontWeight: 700 }}>ฟรีกาแฟ 1 แก้ว</div>
              <div className="muted">ให้พนักงานสแกนที่เคาน์เตอร์เพื่อแลก</div></div>
            <span className="ready">พร้อมแลก</span>
          </div>
        ) : (
          <p className="muted">ยังไม่มีรางวัลพร้อมแลก — ทำเควสต์ให้ครบก่อนนะ</p>
        )}
        <p className="muted" style={{ marginTop: 18, fontSize: '.78rem' }}>
          * Coins เป็นแต้มสะสมของร้านพาร์ตเนอร์ ใช้แลกของที่ร้านเท่านั้น ไม่ใช่เงินอิเล็กทรอนิกส์ และแลกเป็นเงินสดไม่ได้
        </p>
      </div>
    </>
  );
}
