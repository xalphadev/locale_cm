import { q } from '@/lib/db';
import { PageHead } from '../adm-ui';

export const dynamic = 'force-dynamic';

type Row = {
  id: string; name: string; category: string; subcategory: string | null;
  status: string; version: number; district: string | null;
  freshness: string | null; verified_at: string | null;
};

export default async function Places() {
  let rows: Row[] = [];
  let err: string | null = null;
  try {
    rows = await q<Row>(
      `SELECT p.id, COALESCE(p.name_i18n->>'en', p.name_i18n->>'th') name, p.category::text,
              p.subcategory, p.status::text, p.version, d.slug district,
              f.freshness_label::text freshness, to_char(p.verified_at,'YYYY-MM-DD') verified_at
       FROM places p
       LEFT JOIN districts d ON d.id=p.district_id
       LEFT JOIN data_freshness f ON f.place_id=p.id
       ORDER BY p.updated_at DESC LIMIT 200`);
  } catch (e: any) { err = String(e?.message ?? e); }

  if (err) return (<><PageHead icon="pin" title="สถานที่" /><p className="note">DB error: {err}</p></>);
  return (
    <>
      <PageHead icon="pin" title="สถานที่" count={rows.length}
        sub="รายการสถานที่ทั้งหมดในแคตตาล็อก (ล่าสุด 200 รายการ) — สถานะ เวอร์ชัน และความสดของข้อมูล" />
      <table>
        <thead><tr><th>Name</th><th>Category</th><th>District</th><th>Status</th><th>Ver</th><th>Freshness</th><th>Verified</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.name}</td>
              <td>{r.category}{r.subcategory ? ` · ${r.subcategory}` : ''}</td>
              <td>{r.district ?? '—'}</td>
              <td><span className={`pill ${r.status === 'published' ? 'ok' : 'warn'}`}>{r.status}</span></td>
              <td className="mono">{r.version}</td>
              <td>{r.freshness ? <span className={`pill ${r.freshness === 'fresh' ? 'ok' : r.freshness === 'aging' ? 'warn' : 'bad'}`}>{r.freshness}</span> : '—'}</td>
              <td className="mono">{r.verified_at ?? '—'}</td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={7} className="note">No places yet — seed via the agent change-proposal flow.</td></tr>}
        </tbody>
      </table>
    </>
  );
}
