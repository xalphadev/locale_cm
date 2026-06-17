import { q, i18n } from '@/lib/db';
import { hideReviewAction, dismissReportAction, setFraudStateAction } from '../actions';
import { PageHead, H2 } from '../adm-ui';

export const dynamic = 'force-dynamic';

// Trust & safety hub: reported reviews (moderation) + flagged users (fraud).
export default async function Reports({ searchParams }: { searchParams: { ok?: string } }) {
  let reports: any[] = []; let frauds: any[] = []; let err: string | null = null;
  try {
    reports = await q<any>(
      `SELECT cr.id, cr.reason_code, to_char(cr.created_at,'YYYY-MM-DD HH24:MI') created_at,
              r.id review_id, r.rating, r.body_i18n, pr.display_name reporter_target,
              p.name_i18n pname,
              (SELECT count(*) FROM content_reports c2 WHERE c2.target_type='review' AND c2.target_id=cr.target_id AND c2.status NOT IN ('resolved','rejected')) report_count
         FROM content_reports cr
         JOIN reviews r ON r.id = cr.target_id AND cr.target_type='review'
         JOIN places p ON p.id = r.place_id
         LEFT JOIN profiles pr ON pr.user_id = r.user_id
        WHERE cr.status IN ('open','triaging','in_review')
        ORDER BY cr.created_at`);
    frauds = await q<any>(
      `SELECT f.id, f.subject_id, f.risk_score, f.auto_action, to_char(f.opened_at,'YYYY-MM-DD HH24:MI') opened_at,
              pr.display_name
         FROM fraud_cases f LEFT JOIN profiles pr ON pr.user_id = f.subject_id
        WHERE f.state IN ('open','in_review') ORDER BY f.risk_score DESC, f.opened_at`);
  } catch (e: any) { err = String(e?.message ?? e); }

  return (
    <>
      <PageHead icon="shield" title="ความปลอดภัย & การกำกับ" count={reports.length + frauds.length}
        sub="รีวิวที่ถูกรายงาน (ปิดได้) + ผู้ใช้ที่ถูกตั้งค่าน่าสงสัยจากการเช็คอินถี่ผิดปกติ (fraud)" />
      {searchParams?.ok === 'hidden' && <div className="banner-ok">✓ ซ่อนรีวิวแล้ว</div>}
      {searchParams?.ok === 'dismissed' && <div className="banner-ok">✓ ยกคำขอแล้ว — รีวิวยังแสดงอยู่</div>}
      {searchParams?.ok === 'fraud' && <div className="banner-ok">✓ อัปเดตเคสแล้ว</div>}
      {err && <p className="note">DB error: {err}</p>}

      <H2 icon="inbox">รีวิวที่ถูกรายงาน ({reports.length})</H2>
      {reports.length === 0 ? <p className="note">ไม่มีรีวิวที่รอตรวจ</p> : (
        <table>
          <thead><tr><th>ร้าน</th><th>รีวิว</th><th>เหตุผล</th><th>จำนวนรายงาน</th><th>เมื่อ</th><th>จัดการ</th></tr></thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id}>
                <td>{i18n(r.pname)}</td>
                <td style={{ maxWidth: 320, whiteSpace: 'normal' }}>
                  <span className="pill">{'★'.repeat(r.rating)}</span> {i18n(r.body_i18n)}
                  <div className="note" style={{ marginTop: 2 }}>โดย {r.reporter_target || 'ผู้ใช้'}</div>
                </td>
                <td className="mono">{r.reason_code}</td>
                <td className="mono">{r.report_count}</td>
                <td className="mono">{r.created_at}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <form action={hideReviewAction.bind(null, r.review_id, r.id)}><button className="btn btn-approve" type="submit">ซ่อนรีวิว</button></form>
                    <form action={dismissReportAction.bind(null, r.id)}><button className="btn ghost" type="submit">ยกคำขอ</button></form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <H2 icon="shield">เคสน่าสงสัย · เช็คอินถี่ผิดปกติ ({frauds.length})</H2>
      {frauds.length === 0 ? <p className="note">ไม่มีเคสที่รอตรวจ</p> : (
        <table>
          <thead><tr><th>ผู้ใช้</th><th>ความเสี่ยง</th><th>สาเหตุ</th><th>เปิดเมื่อ</th><th>จัดการ</th></tr></thead>
          <tbody>
            {frauds.map((f) => (
              <tr key={f.id}>
                <td>{f.display_name || <span className="mono">{String(f.subject_id).slice(0, 8)}</span>}</td>
                <td><span className={`pill ${Number(f.risk_score) >= 60 ? 'bad' : 'warn'}`}>{Math.round(Number(f.risk_score))}</span></td>
                <td className="mono">{f.auto_action || '—'}</td>
                <td className="mono">{f.opened_at}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <form action={setFraudStateAction.bind(null, f.id, 'confirmed_fraud')}><button className="btn btn-approve" type="submit">ยืนยันโกง</button></form>
                    <form action={setFraudStateAction.bind(null, f.id, 'cleared')}><button className="btn ghost" type="submit">เคลียร์</button></form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
