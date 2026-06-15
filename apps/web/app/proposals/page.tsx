import { q, i18n } from '@/lib/db';
import { approveProposalAction } from '../actions';

export const dynamic = 'force-dynamic';

type Row = {
  id: string; name_i18n: any; category: string; subcategory: string;
  price_band: string | null; phone: string | null; lng: string | null; lat: string | null;
  proposed_by: string; created_at: string;
};

export default async function ReviewQueue({ searchParams }: { searchParams: { created?: string; approved?: string; error?: string } }) {
  let rows: Row[] = [];
  let err: string | null = null;
  try {
    rows = await q<Row>(
      `SELECT cp.id,
              cp.diff->'after'->'name_i18n'     AS name_i18n,
              cp.diff->'after'->>'category'     AS category,
              cp.diff->'after'->>'subcategory'  AS subcategory,
              cp.diff->'after'->>'price_band'   AS price_band,
              cp.diff->'after'->>'phone'        AS phone,
              cp.diff->'after'->>'lng'          AS lng,
              cp.diff->'after'->>'lat'          AS lat,
              cp.proposed_by,
              to_char(cp.created_at,'YYYY-MM-DD HH24:MI') AS created_at
       FROM change_proposals cp
       WHERE cp.status='pending' AND cp.target_type='place'
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
        <thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Coords</th><th>Submitted</th><th>Action</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{i18n(r.name_i18n) || <span className="note">(no name)</span>}</td>
              <td>{r.category}{r.subcategory ? ` · ${r.subcategory}` : ''}</td>
              <td className="mono">{r.price_band ? '฿'.repeat(Number(r.price_band)) : '—'}</td>
              <td className="mono">{r.lat && r.lng ? `${r.lat}, ${r.lng}` : '—'}</td>
              <td className="mono">{r.created_at}</td>
              <td>
                <form action={approveProposalAction.bind(null, r.id)}>
                  <button className="btn btn-approve" type="submit">อนุมัติ ✓</button>
                </form>
              </td>
            </tr>
          ))}
          {rows.length === 0 && !err && <tr><td colSpan={6} className="note">ไม่มี proposal ค้าง — ไปหน้า “+ Add place” เพื่อเสนอร้านใหม่</td></tr>}
        </tbody>
      </table>
      <p className="note">การอนุมัติเรียก <code>fn_apply_proposal</code> ผ่าน money-plane API (SoD: ผู้ตรวจ ≠ ผู้เสนอ).</p>
    </>
  );
}
