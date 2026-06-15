import { q, i18n } from '@/lib/db';
import { confirmRedeemAction } from '../actions';

export const dynamic = 'force-dynamic';

type Merchant = { id: string; name: any };
type Cust = { user_id: string; coins: string; funder_key: string };

export default async function Counter({ searchParams }: { searchParams: { m?: string; redeemed?: string; error?: string } }) {
  let merchants: Merchant[] = [];
  let customers: Cust[] = [];
  let err: string | null = null;
  try {
    merchants = await q<Merchant>(
      `SELECT id, display_name_i18n AS name FROM merchants
       WHERE trust_state='finance_verified' ORDER BY created_at LIMIT 12`);
    customers = await q<Cust>(
      `SELECT user_id, (SUM(remaining_minor)/100)::int::text AS coins, MIN(funder_key) AS funder_key
       FROM coin_lots WHERE state='active' AND remaining_minor>0
       GROUP BY user_id ORDER BY 2 DESC LIMIT 20`);
  } catch (e: any) { err = String(e?.message ?? e); }

  const active = searchParams?.m ?? merchants[0]?.id;
  const activeName = i18n(merchants.find((m) => m.id === active)?.name) || '(เลือกร้าน)';

  return (
    <>
      <h1>เคาน์เตอร์ร้านค้า <span className="note">· ยืนยันการแลกรางวัล</span></h1>
      <p className="note">การแลกเป็น <b>merchant-initiated</b> (ร้านกดยืนยัน ไม่ใช่ลูกค้ากดเอง) — money-plane เผาเหรียญฝั่งเซิร์ฟเวอร์ และบล็อกถ้าร้านนี้เป็นผู้สนับสนุนเหรียญ (anti-self-redemption).</p>

      {searchParams?.redeemed && <div className="banner-ok">✓ แลกสำเร็จ — เหรียญถูกเผา ร้านได้รับยอดตั้งพัก (ดูใน Money &amp; Recon)</div>}
      {searchParams?.error && <p className="bad" style={{ padding: '.6rem .9rem', borderRadius: 8 }}>⚠ {searchParams.error}</p>}
      {err && <p className="note">DB error: {err}</p>}

      <h2>กำลังเปิดเคาน์เตอร์เป็น: <span className="pill ok">{activeName}</span></h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem', margin: '.4rem 0 1rem' }}>
        {merchants.map((m) => (
          <a key={m.id} href={`/counter?m=${m.id}`}
             className="pill" style={{ background: m.id === active ? '#1E8E7E' : '#F2EADD', color: m.id === active ? '#fff' : '#5C5346' }}>
            {i18n(m.name) || m.id.slice(0, 8)}
          </a>
        ))}
      </div>

      <h2>ลูกค้าที่มีเหรียญพร้อมแลก</h2>
      <table>
        <thead><tr><th>ลูกค้า</th><th>เหรียญ</th><th>รางวัล</th><th>ผู้สนับสนุนเหรียญ</th><th>ยืนยัน</th></tr></thead>
        <tbody>
          {customers.map((c) => {
            const isFunder = active && c.funder_key === `merchant:${active}`;
            return (
              <tr key={c.user_id}>
                <td className="mono">{c.user_id.slice(0, 8)}</td>
                <td className="mono">🪙 {c.coins}</td>
                <td>☕ ฟรีกาแฟ</td>
                <td>{isFunder ? <span className="pill bad">ร้านนี้เอง</span> : <span className="note mono">{c.funder_key.slice(9, 17)}</span>}</td>
                <td>
                  <form action={confirmRedeemAction.bind(null, c.user_id, active!)}>
                    <button className="btn btn-approve" type="submit" disabled={!active || isFunder}
                            title={isFunder ? 'ร้านนี้เป็นผู้สนับสนุนเหรียญ — แลกไม่ได้ (anti-self)' : ''}>
                      ยืนยันแลก ✓
                    </button>
                  </form>
                </td>
              </tr>
            );
          })}
          {customers.length === 0 && !err && <tr><td colSpan={5} className="note">ยังไม่มีลูกค้าที่มีเหรียญ — ให้ลูกค้าเล่นเควสต์ในแอป :3003 จนได้เหรียญก่อน</td></tr>}
        </tbody>
      </table>
    </>
  );
}
