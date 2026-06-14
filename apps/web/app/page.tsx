import { q, baht } from '@/lib/db';

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
        <h1>Dashboard</h1>
        <p className="note">Could not reach the database. Set <code>DATABASE_URL</code> in <code>apps/web/.env</code>
          {' '}(a read-only role), apply <code>db/migrations</code>, then reload.</p>
        <pre className="note">{String(e?.message ?? e)}</pre>
      </>
    );
  }
  const reconOk = d.recon?.status === 'pass';
  return (
    <>
      <h1>System health</h1>
      <div className="cards">
        <div className="stat"><div className="k">Solvency reconciliation</div>
          <div className="v">{d.recon ? <span className={`pill ${reconOk ? 'ok' : 'bad'}`}>{d.recon.status}</span> : '—'}</div>
          {d.recon && !reconOk && <div className="note mono">break {baht(d.recon.break_minor)}</div>}
        </div>
        <div className="stat"><div className="k">Outstanding Coin liability</div><div className="v mono">{baht(d.coin.outstanding)}</div>
          <div className="note">backed 1:1 by escrow</div></div>
        <div className="stat"><div className="k">Escrow settled-available</div><div className="v mono">{baht(d.esc.settled)}</div>
          <div className="note">mintable now</div></div>
        <div className="stat"><div className="k">Platform revenue (take-rate)</div><div className="v mono">{baht(d.rev.bal)}</div></div>
        <div className="stat"><div className="k">Published places</div><div className="v mono">{d.places.published} / {d.places.total}</div></div>
        <div className="stat"><div className="k">Active quests</div><div className="v mono">{d.quests.active}</div></div>
        <div className="stat"><div className="k">Settled redemptions</div><div className="v mono">{d.redm.n}</div>
          <div className="note mono">{baht(d.redm.settled)}</div></div>
      </div>

      <h2>Merchants by trust state</h2>
      <table><thead><tr><th>trust_state</th><th>count</th></tr></thead><tbody>
        {d.merchants.map((m) => (<tr key={m.trust_state}><td>{m.trust_state}</td><td className="mono">{m.n}</td></tr>))}
      </tbody></table>
      <p className="note">Read-only over the canonical ledger. All money mutations go through the NestJS money-plane (never this client).</p>
    </>
  );
}
