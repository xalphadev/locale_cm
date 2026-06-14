import { q, baht } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function Money() {
  let recon: any[] = [], escrow: any[] = [], txns: any[] = [], err: string | null = null;
  try {
    recon = await q(
      `SELECT status, break_minor, anchor_lhs_minor, anchor_rhs_minor, to_char(created_at,'YYYY-MM-DD HH24:MI') t
       FROM reconciliation_runs ORDER BY created_at DESC LIMIT 10`);
    escrow = await q(
      `SELECT COALESCE(m.display_name_i18n->>'en','—') name, w.total_cached, w.settled_available_cached,
              w.locked_cached, w.status::text
       FROM escrow_wallets w LEFT JOIN merchants m ON m.id=w.owner_id ORDER BY w.total_cached DESC LIMIT 20`);
    txns = await q(
      `SELECT lt.txn_type::text, to_char(lt.created_at,'MM-DD HH24:MI') t,
              COALESCE((SELECT string_agg(DISTINCT e.currency::text,'+') FROM ledger_entries e WHERE e.txn_id=lt.id),'') ccy,
              (SELECT COALESCE(SUM(amount_minor),0) FROM ledger_entries e WHERE e.txn_id=lt.id AND e.direction='DR' AND e.currency='THB') thb
       FROM ledger_transactions lt ORDER BY lt.created_at DESC LIMIT 25`);
  } catch (e: any) { err = String(e?.message ?? e); }
  if (err) return (<><h1>Money &amp; Recon</h1><p className="note">DB error: {err}</p></>);

  return (
    <>
      <h1>Money &amp; Reconciliation</h1>

      <h2>Reconciliation runs (solvency anchor)</h2>
      <table>
        <thead><tr><th>When</th><th>Status</th><th>coin_liability (LHS)</th><th>backing (RHS)</th><th>break</th></tr></thead>
        <tbody>{recon.map((r, i) => (
          <tr key={i}><td className="mono">{r.t}</td>
            <td><span className={`pill ${r.status === 'pass' ? 'ok' : 'bad'}`}>{r.status}</span></td>
            <td className="mono">{baht(r.anchor_lhs_minor)}</td><td className="mono">{baht(r.anchor_rhs_minor)}</td>
            <td className="mono">{baht(r.break_minor)}</td></tr>))}
          {recon.length === 0 && <tr><td colSpan={5} className="note">No runs — call fn_reconcile_solvency.</td></tr>}
        </tbody>
      </table>

      <h2>Escrow wallets</h2>
      <table>
        <thead><tr><th>Merchant</th><th>Total</th><th>Settled-available</th><th>Locked</th><th>Status</th></tr></thead>
        <tbody>{escrow.map((w, i) => (
          <tr key={i}><td>{w.name}</td><td className="mono">{baht(w.total_cached)}</td>
            <td className="mono">{baht(w.settled_available_cached)}</td><td className="mono">{baht(w.locked_cached)}</td>
            <td><span className="pill ok">{w.status}</span></td></tr>))}
          {escrow.length === 0 && <tr><td colSpan={5} className="note">No escrow yet.</td></tr>}
        </tbody>
      </table>

      <h2>Recent ledger transactions</h2>
      <table>
        <thead><tr><th>When</th><th>Type</th><th>Currencies</th><th>THB moved</th></tr></thead>
        <tbody>{txns.map((t, i) => (
          <tr key={i}><td className="mono">{t.t}</td><td>{t.txn_type}</td><td className="mono">{t.ccy}</td>
            <td className="mono">{baht(t.thb)}</td></tr>))}
          {txns.length === 0 && <tr><td colSpan={4} className="note">No txns yet.</td></tr>}
        </tbody>
      </table>
    </>
  );
}
