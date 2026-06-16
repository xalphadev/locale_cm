import { q, baht } from '@/lib/db';
import { PageHead, H2, Icon } from './adm-ui';

export const dynamic = 'force-dynamic';

async function load() {
  const [places] = await q<{ total: string; published: string }>(
    `SELECT count(*) total, count(*) FILTER (WHERE status='published') published FROM places`);
  const merchants = await q<{ trust_state: string; n: string }>(
    `SELECT trust_state, count(*) n FROM merchants GROUP BY trust_state ORDER BY 2 DESC`);
  const [quests] = await q<{ active: string }>(`SELECT count(*) active FROM quests WHERE status='active'`);
  const [coin] = await q<{ outstanding: string }>(
    `SELECT COALESCE(SUM(remaining_minor),0) outstanding FROM coin_lots WHERE state='active'`);
  const [esc] = await q<{ settled: string; total: string }>(
    `SELECT COALESCE(SUM(settled_available_cached),0) settled, COALESCE(SUM(total_cached),0) total FROM escrow_wallets`);
  const [rev] = await q<{ bal: string }>(
    `SELECT COALESCE(SUM(CASE WHEN e.direction='CR' THEN amount_minor ELSE -amount_minor END),0) bal
     FROM ledger_entries e JOIN accounts a ON a.id=e.account_id WHERE a.account_type='platform_revenue'`);
  const [redm] = await q<{ n: string; settled: string }>(
    `SELECT count(*) n, COALESCE(SUM(thb_settlement),0) settled FROM redemptions WHERE status='settled'`);
  const [recon] = await q<{ status: string; break_minor: string; created_at: string;
    anchor_lhs_minor: string; anchor_rhs_minor: string }>(
    `SELECT status, break_minor, created_at, anchor_lhs_minor, anchor_rhs_minor
     FROM reconciliation_runs ORDER BY created_at DESC LIMIT 1`);
  return { places, merchants, quests, coin, esc, rev, redm, recon };
}

export default async function Dashboard() {
  let d: Awaited<ReturnType<typeof load>>;
  try {
    d = await load();
  } catch (e: any) {
    return (
      <>
        <PageHead icon="pulse" title="ภาพรวมระบบ" sub="สถานะความมั่นคงทางการเงินและตัวเลขหลักของแพลตฟอร์ม" />
        <p className="note">ต่อฐานข้อมูลไม่ได้ — ตั้งค่า <code>DATABASE_URL</code> ใน <code>apps/web/.env</code>
          {' '}(สิทธิ์อ่านอย่างเดียว), รัน <code>db/migrations</code> แล้วโหลดใหม่</p>
        <pre className="note">{String(e?.message ?? e)}</pre>
      </>
    );
  }
  const reconOk = d.recon?.status === 'pass';
  return (
    <>
      <PageHead icon="pulse" title="ภาพรวมระบบ"
        sub="อ่านอย่างเดียวจากบัญชีแยกประเภทกลาง — การเคลื่อนไหวเงินทุกรายการผ่าน money-plane เท่านั้น ไม่ใช่หน้านี้" />

      <div className={`adm-hero ${reconOk ? '' : 'bad'}`}>
        <div className="adm-hero-ic"><Icon n="shield" size={26} /></div>
        <div>
          <div className="adm-hero-k">การกระทบยอดความมั่นคง (solvency reconciliation)</div>
          <div className="adm-hero-v">
            {d.recon ? <span className={`pill ${reconOk ? 'ok' : 'bad'}`}>{d.recon.status}</span> : '—'}
            {d.recon && !reconOk && <span className="note mono">break {baht(d.recon.break_minor)}</span>}
            {d.recon && reconOk && <span className="note">หนี้เหรียญถูกหนุนหลังครบ 1:1</span>}
          </div>
        </div>
        {d.recon && (
          <div className="adm-hero-meta">coin_liability = backing
            <b>{baht(d.recon.anchor_lhs_minor)} = {baht(d.recon.anchor_rhs_minor)}</b>
          </div>
        )}
      </div>

      <div className="cards">
        <div className="stat"><span className="stat-ic"><Icon n="spark" size={17} /></span>
          <div className="k">เหรียญคงค้าง (Coin liability)</div><div className="v mono">{baht(d.coin.outstanding)}</div>
          <div className="note">หนุนหลัง 1:1 ด้วยเอสโครว์</div></div>
        <div className="stat"><span className="stat-ic"><Icon n="wallet" size={17} /></span>
          <div className="k">เอสโครว์พร้อมใช้</div><div className="v mono">{baht(d.esc.settled)}</div>
          <div className="note">มินต์เหรียญได้ทันที</div></div>
        <div className="stat"><span className="stat-ic"><Icon n="ledger" size={17} /></span>
          <div className="k">รายได้แพลตฟอร์ม (take-rate)</div><div className="v mono">{baht(d.rev.bal)}</div></div>
        <div className="stat"><span className="stat-ic"><Icon n="pin" size={17} /></span>
          <div className="k">สถานที่เผยแพร่</div><div className="v mono">{d.places.published} / {d.places.total}</div></div>
        <div className="stat"><span className="stat-ic"><Icon n="flag" size={17} /></span>
          <div className="k">เควสต์ที่ใช้งาน</div><div className="v mono">{d.quests.active}</div></div>
        <div className="stat"><span className="stat-ic"><Icon n="receipt" size={17} /></span>
          <div className="k">การแลกที่ชำระแล้ว</div><div className="v mono">{d.redm.n}</div>
          <div className="note mono">{baht(d.redm.settled)}</div></div>
      </div>

      <H2 icon="users">ร้านค้าแยกตามระดับความน่าเชื่อถือ</H2>
      <table><thead><tr><th>trust_state</th><th>count</th></tr></thead><tbody>
        {d.merchants.map((m) => (<tr key={m.trust_state}><td>{m.trust_state}</td><td className="mono">{m.n}</td></tr>))}
      </tbody></table>
    </>
  );
}
