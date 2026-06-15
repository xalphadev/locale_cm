import { q, demoUserId, coins } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function Wallet() {
  let sparks = 0, coinMinor = 0, expiry: string | null = null, readyReward = false;
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
    }
  } catch { down = true; }

  if (down) return (<><div className="top"><h1>Wallet 👛</h1></div>
    <div className="body"><p className="muted">ต่อฐานข้อมูลไม่ได้</p></div></>);

  return (
    <>
      <div className="top"><div className="hi">กระเป๋าของฉัน</div><h1>Wallet 👛</h1></div>
      <div className="body">
        <div className="bal">
          <div className="pill sp">
            <div className="lab">✦ Sparks</div>
            <div className="v">{sparks}</div>
            <div className="note">สะสมเลื่อนระดับ · แลกของไม่ได้</div>
          </div>
          <div className="pill co">
            <div className="lab">◉ Coins</div>
            <div className="v">{coins(coinMinor)}</div>
            <div className="note">แลกของจริงที่ร้าน · ถอนเป็นเงินสดไม่ได้{expiry ? ` · หมดอายุ ${expiry}` : ''}</div>
          </div>
        </div>

        <h2>รางวัลของฉัน</h2>
        {readyReward ? (
          <div className="reward-row">
            <div className="seal">☕</div>
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
