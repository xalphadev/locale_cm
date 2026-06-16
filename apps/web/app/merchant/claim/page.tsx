import { q, i18n } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Claim an existing (agent-seeded, unclaimed) place. Search → pick → claim form.
export default async function Claim({ searchParams }: { searchParams: { q?: string } }) {
  const qq = (searchParams.q || '').trim();
  let results: any[] = [];
  if (qq.length >= 2) {
    results = await q<any>(
      `SELECT id, name_i18n, subcategory, category::text category FROM places
        WHERE brand_id IS NULL AND status <> 'permanently_closed'
          AND (name_i18n->>'th' ILIKE $1 OR name_i18n->>'en' ILIKE $1)
        ORDER BY name_i18n->>'th' LIMIT 20`, [`%${qq}%`]);
  }
  return (
    <div className="portal-auth" style={{ maxWidth: 480 }}>
      <div className="pa-brand">Locale · ร้านค้า</div>
      <h1>เคลมร้านของคุณ</h1>
      <p className="note">ร้านคุณอยู่ใน Locale อยู่แล้ว? ค้นหาแล้วเคลมเพื่อเข้ามาดูแลเอง — ลงสินค้า โพสต์ และเปิดแต้มสะสม</p>
      <form className="form" method="get" style={{ margin: '14px 0' }}>
        <div className="field"><label>ชื่อร้าน</label><input name="q" defaultValue={qq} placeholder="พิมพ์ชื่อร้าน เช่น บ้านกาแฟ" autoFocus /></div>
        <button className="btn btn-primary mform-save" type="submit">ค้นหา</button>
      </form>

      {qq.length >= 2 && (results.length ? (
        <div className="mlist">
          {results.map((r) => (
            <a className="mrow" href={`/merchant/claim/${r.id}`} key={r.id}>
              <span className="mrow-img"><span className="ph">{(i18n(r.name_i18n) || 'ร').trim().charAt(0)}</span></span>
              <div className="mrow-body">
                <div className="mrow-nm">{i18n(r.name_i18n)}</div>
                <div className="mrow-meta">{r.subcategory || r.category} · ยังไม่มีเจ้าของดูแล</div>
              </div>
              <span className="mrow-go" aria-hidden>→</span>
            </a>
          ))}
        </div>
      ) : (
        <p className="note">ไม่พบร้านที่ยังไม่ถูกเคลม — <a href="/merchant/signup">สร้างร้านใหม่</a> ได้เลย</p>
      ))}

      <p className="note" style={{ marginTop: 16 }}>ไม่เจอร้าน? <a href="/merchant/signup">สร้างร้านใหม่</a> · มีบัญชีแล้ว? <a href="/merchant/login">เข้าสู่ระบบ</a></p>
    </div>
  );
}
