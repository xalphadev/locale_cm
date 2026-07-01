import { q, i18n } from '@/lib/db';
import {
  publishMerchantPlaceAction, unpublishMerchantPlaceAction,
  approveMerchantAccountAction, rejectMerchantAccountAction,
} from '../actions';
import { PageHead, H2 } from '../adm-ui';

export const dynamic = 'force-dynamic';

export default async function Shops({ searchParams }: { searchParams: { ok?: string } }) {
  let rows: any[] = [];
  let signups: any[] = [];
  try {
    rows = await q<any>(
      `SELECT p.id, p.name_i18n, p.status::text status, p.subcategory, p.phone, p.line_id,
              (SELECT count(*)::int FROM shop_products sp WHERE sp.place_id=p.id AND sp.deleted_at IS NULL) products
         FROM places p WHERE p.source='merchant'
        ORDER BY (p.status='draft') DESC, p.created_at DESC`);
    // account-level approval queue (0065) — judgment call on the signup form data, no documents
    signups = await q<any>(
      `SELECT ma.id, ma.display_name, ma.email, ma.phone, ma.created_at,
              p.subcategory, p.line_id
         FROM merchant_accounts ma
         LEFT JOIN places p ON p.id = ma.place_id
        WHERE ma.approval_status='pending' AND ma.deleted_at IS NULL
        ORDER BY ma.created_at`);
  } catch { /* db down */ }
  const pending = rows.filter((r) => r.status === 'draft');
  const live = rows.filter((r) => r.status === 'published');

  return (
    <>
      <PageHead icon="store" title="ร้านค้าที่สมัครเข้ามา" count={rows.length}
        sub="ร้านที่สมัครผ่านพอร์ทัลจะอยู่สถานะ “รอตรวจ” จนกว่าทีมงานจะกดเผยแพร่ — ป้องกันร้านสแปมขึ้นหน้าลูกค้าอัตโนมัติ" />
      {searchParams?.ok === 'published' && <div className="banner-ok">✓ เผยแพร่ร้านแล้ว — ลูกค้าเห็นได้</div>}
      {searchParams?.ok === 'hidden' && <div className="banner-ok">✓ ซ่อนร้านแล้ว</div>}
      {searchParams?.ok === 'approved' && <div className="banner-ok">✓ อนุมัติบัญชีแล้ว — ร้านเข้าใช้งานระบบได้ทันที</div>}
      {searchParams?.ok === 'rejected' && <div className="banner-ok">✓ ปฏิเสธคำขอสมัครแล้ว</div>}

      <H2 icon="inbox">บัญชีรออนุมัติ ({signups.length})</H2>
      {signups.length === 0 ? <p className="note">ไม่มีบัญชีรออนุมัติ</p> : (
        <table><thead><tr><th>ร้าน</th><th>ประเภท</th><th>อีเมล</th><th>ติดต่อ</th><th>สมัครเมื่อ</th><th /></tr></thead><tbody>
          {signups.map((r) => (
            <tr key={r.id}>
              <td>{r.display_name}</td><td>{r.subcategory || '—'}</td>
              <td>{r.email}</td>
              <td>{r.phone || '—'}{r.line_id ? ` · ${r.line_id}` : ''}</td>
              <td>{new Date(r.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</td>
              <td>
                <form action={approveMerchantAccountAction.bind(null, r.id)} style={{ display: 'inline' }}>
                  <button className="btn btn-approve" type="submit">อนุมัติ</button>
                </form>
                <form action={rejectMerchantAccountAction.bind(null, r.id)} style={{ display: 'inline', marginLeft: 6 }}>
                  <input name="note" placeholder="เหตุผล (ถ้าปฏิเสธ)" style={{ width: 140 }} />
                  <button className="btn" type="submit">ปฏิเสธ</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody></table>
      )}

      <H2 icon="inbox">รอตรวจสอบ ({pending.length})</H2>
      {pending.length === 0 ? <p className="note">ไม่มีร้านรอตรวจ</p> : (
        <table><thead><tr><th>ร้าน</th><th>ประเภท</th><th>ติดต่อ</th><th>สินค้า</th><th /></tr></thead><tbody>
          {pending.map((r) => (
            <tr key={r.id}>
              <td>{i18n(r.name_i18n)}</td><td>{r.subcategory || '—'}</td>
              <td>{r.phone || '—'}{r.line_id ? ` · ${r.line_id}` : ''}</td><td>{r.products}</td>
              <td><form action={publishMerchantPlaceAction.bind(null, r.id)}><button className="btn btn-approve" type="submit">เผยแพร่</button></form></td>
            </tr>
          ))}
        </tbody></table>
      )}

      <H2 icon="store">เผยแพร่แล้ว ({live.length})</H2>
      {live.length === 0 ? <p className="note">ยังไม่มีร้านที่เผยแพร่</p> : (
        <table><thead><tr><th>ร้าน</th><th>ประเภท</th><th>สินค้า</th><th /></tr></thead><tbody>
          {live.map((r) => (
            <tr key={r.id}>
              <td>{i18n(r.name_i18n)}</td><td>{r.subcategory || '—'}</td><td>{r.products}</td>
              <td><form action={unpublishMerchantPlaceAction.bind(null, r.id)}><button className="btn" type="submit">ซ่อน</button></form></td>
            </tr>
          ))}
        </tbody></table>
      )}
    </>
  );
}
