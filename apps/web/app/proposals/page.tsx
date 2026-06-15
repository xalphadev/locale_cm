import { q, i18n } from '@/lib/db';
import { approveProposalAction } from '../actions';

export const dynamic = 'force-dynamic';

type Row = {
  id: string; target_type: string; name_i18n: any; category: string; subcategory: string;
  price_band: string | null; lng: string | null; lat: string | null; starts_at: string | null;
  proposed_by: string; created_at: string;
};

export default async function ReviewQueue({ searchParams }: { searchParams: { created?: string; approved?: string; error?: string } }) {
  let rows: Row[] = [];
  let err: string | null = null;
  try {
    rows = await q<Row>(
      `SELECT cp.id, cp.target_type::text AS target_type,
              COALESCE(cp.diff->'after'->'name_i18n', cp.diff->'after'->'title_i18n') AS name_i18n,
              COALESCE(cp.diff->'after'->>'category', cp.diff->'after'->>'kind')       AS category,
              cp.diff->'after'->>'subcategory'  AS subcategory,
              cp.diff->'after'->>'price_band'   AS price_band,
              cp.diff->'after'->>'lng'          AS lng,
              cp.diff->'after'->>'lat'          AS lat,
              to_char((cp.diff->'after'->>'starts_at')::timestamptz,'DD Mon HH24:MI') AS starts_at,
              cp.proposed_by,
              to_char(cp.created_at,'YYYY-MM-DD HH24:MI') AS created_at
       FROM change_proposals cp
       WHERE cp.status='pending' AND cp.target_type IN ('place','event')
       ORDER BY cp.created_at DESC`);
  } catch (e: any) { err = String(e?.message ?? e); }

  return (
    <>
      <h1>Review queue <span className="note">({rows.length} pending)</span></h1>
      {searchParams?.created && <div className="banner-ok">✓ ส่ง proposal แล้ว — รออนุมัติด้านล่าง</div>}
      {searchParams?.approved && <div className="banner-ok">✓ อนุมัติแล้ว — ร้านขึ้นจริงใน Places + แอปลูกค้า</div>}
      {searchParams?.error && <p className="bad" style={{ padding: '.6rem .9rem', borderRadius: 8 }}>⚠ {searchParams.error}</p>}
      {err && <p className="note">DB error: {err}</p>}

      <table>
        <thead><tr><th>Type</th><th>Name</th><th>Category</th><th>When / where</th><th>Submitted</th><th>Action</th></tr></thead>
        <tbody>
          {rows.map((r) => {
            const isEvent = r.target_type === 'event';
            return (
              <tr key={r.id}>
                <td><span className={`pill ${isEvent ? 'warn' : 'ok'}`}>{isEvent ? 'event' : 'place'}</span></td>
                <td>{i18n(r.name_i18n) || <span className="note">(no name)</span>}</td>
                <td>{r.category}{r.subcategory ? ` · ${r.subcategory}` : ''}</td>
                <td className="mono">{isEvent ? (r.starts_at ?? '—') : (r.lat && r.lng ? `${r.lat}, ${r.lng}` : '—')}</td>
                <td className="mono">{r.created_at}</td>
                <td>
                  <form action={approveProposalAction.bind(null, r.id)}>
                    <button className="btn btn-approve" type="submit">อนุมัติ ✓</button>
                  </form>
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && !err && <tr><td colSpan={6} className="note">ไม่มี proposal ค้าง — ไปหน้า “+ Add place” หรือ “+ Add event” เพื่อเสนอ</td></tr>}
        </tbody>
      </table>
      <p className="note">การอนุมัติเรียก <code>fn_apply_proposal</code> ผ่าน money-plane API (SoD: ผู้ตรวจ ≠ ผู้เสนอ).</p>
    </>
  );
}
