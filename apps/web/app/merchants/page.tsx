import Link from 'next/link';
import { q, i18n } from '@/lib/db';
import { PageHead, H2 } from '../adm-ui';

export const dynamic = 'force-dynamic';

// Merchant health board — the SaaS ops view: which self-service branches are alive (posting content,
// taking bookings, recording revenue) and which have gone quiet. Read-only analytics; actions stay on
// /shops (publish/approve). Revenue = SUM(amount_minor) on VERIFIED slips, same rule as the merchant's
// own /merchant/revenue page so both sides quote one number.
const baht = (minor: any) => (Number(minor || 0) / 100).toLocaleString('th-TH', { maximumFractionDigits: 0 });
const FILTERS = [{ k: '', l: 'ทั้งหมด' }, { k: 'quiet', l: 'เงียบ >30 วัน' }, { k: 'draft', l: 'ยังไม่เผยแพร่' }];

export default async function Merchants({ searchParams }: { searchParams: { f?: string } }) {
  const f = ['quiet', 'draft'].includes(searchParams?.f || '') ? searchParams!.f! : '';
  let rows: any[] = [];
  try {
    rows = await q<any>(
      `SELECT p.id, p.name_i18n, p.status::text status, p.subcategory,
              p.sells_products, p.offers_stay, p.manages_stay,
              b.name_i18n brand_name, ma.email owner_email, ma.approval_status,
              to_char(p.created_at,'DD/MM/YY') joined,
              (SELECT count(*)::int FROM shop_products sp WHERE sp.place_id=p.id AND sp.deleted_at IS NULL AND sp.status='published') products,
              (SELECT count(*)::int FROM stay_units su WHERE su.place_id=p.id AND su.deleted_at IS NULL AND su.status='published') listings,
              (SELECT count(*)::int FROM stay_booking_request br WHERE br.place_id=p.id AND br.deleted_at IS NULL AND br.created_at>now()-interval '30 days') bookings30,
              (SELECT COALESCE(sum(br.amount_minor),0)::bigint FROM stay_booking_request br WHERE br.place_id=p.id AND br.deleted_at IS NULL AND br.payment_status='verified' AND br.paid_at>now()-interval '30 days') revenue30,
              (SELECT count(*)::int FROM stay_booking_request br WHERE br.place_id=p.id AND br.deleted_at IS NULL AND br.status='new') leads_new,
              GREATEST(p.updated_at,
                COALESCE((SELECT max(sp.updated_at) FROM shop_products sp WHERE sp.place_id=p.id), '-infinity'),
                COALESCE((SELECT max(fp.created_at) FROM feed_posts fp WHERE fp.place_id=p.id), '-infinity'),
                COALESCE((SELECT max(br.updated_at) FROM stay_booking_request br WHERE br.place_id=p.id), '-infinity')
              ) last_act
         FROM places p
         JOIN brands b ON b.id=p.brand_id AND b.deleted_at IS NULL
         LEFT JOIN merchant_accounts ma ON ma.id=b.owner_account_id
        WHERE p.source='merchant' AND COALESCE(ma.approval_status,'approved') <> 'rejected'
        ORDER BY last_act DESC`);
  } catch { /* db down */ }

  const now = Date.now();
  const days = (d: any) => Math.floor((now - new Date(d).getTime()) / 86400000);
  const all = rows.map((r) => ({ ...r, quiet: days(r.last_act) > 30 }));
  const shown = f === 'quiet' ? all.filter((r) => r.quiet) : f === 'draft' ? all.filter((r) => r.status !== 'published') : all;
  const nLive = all.filter((r) => r.status === 'published').length;
  const nQuiet = all.filter((r) => r.quiet).length;
  const rev30 = all.reduce((s, r) => s + Number(r.revenue30 || 0), 0);

  return (
    <>
      <PageHead icon="pulse" title="สุขภาพร้านค้า" count={all.length}
        sub="สาขาที่มาจากพอร์ทัลร้านค้า เรียงตามความเคลื่อนไหวล่าสุด — ใครยังใช้งาน ใครกำลังเงียบหาย (ควรทักไปช่วย) · ยอดรับชำระนับเฉพาะสลิปที่ร้านยืนยันแล้ว ตรงกับหน้า “รายได้” ฝั่งร้าน" />

      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', margin: '0 0 14px', fontSize: '.92rem' }}>
        <span>เผยแพร่อยู่ <b>{nLive}</b>/{all.length}</span>
        <span>เงียบ &gt;30 วัน <b style={{ color: nQuiet ? 'var(--adm-warn, #b45309)' : undefined }}>{nQuiet}</b></span>
        <span>ยอดรับชำระรวม 30 วัน <b>฿{baht(rev30)}</b></span>
      </div>
      <div style={{ display: 'flex', gap: 6, margin: '0 0 12px' }}>
        {FILTERS.map((t) => <Link key={t.k} href={t.k ? `/merchants?f=${t.k}` : '/merchants'} className={`btn ${f === t.k ? 'btn-primary' : ''}`}>{t.l}</Link>)}
      </div>

      <H2 icon="store">สาขา ({shown.length})</H2>
      {shown.length === 0 ? <p className="note">ไม่มีร้านในกลุ่มนี้</p> : (
        <table>
          <thead><tr><th>ร้าน / สาขา</th><th>ประเภท</th><th>เจ้าของ</th><th>สินค้า</th><th>ห้องพัก</th><th>จอง 30 วัน</th><th>รับชำระ 30 วัน</th><th>ลีดใหม่</th><th>เคลื่อนไหวล่าสุด</th><th>สถานะ</th></tr></thead>
          <tbody>
            {shown.map((r) => {
              const d = days(r.last_act);
              return (
                <tr key={r.id} style={{ opacity: r.status === 'published' ? 1 : 0.6 }}>
                  <td>{i18n(r.brand_name) || '—'}{i18n(r.name_i18n) !== i18n(r.brand_name) ? <> · {i18n(r.name_i18n)}</> : null}</td>
                  <td>{r.subcategory || '—'}</td>
                  <td>{r.owner_email || '—'}{r.approval_status === 'pending' ? ' (รออนุมัติ)' : ''}</td>
                  <td>{r.sells_products ? r.products : '—'}</td>
                  <td>{r.offers_stay || r.manages_stay ? r.listings : '—'}</td>
                  <td>{r.manages_stay ? r.bookings30 : '—'}</td>
                  <td>{Number(r.revenue30) > 0 ? `฿${baht(r.revenue30)}` : '—'}</td>
                  <td>{r.leads_new > 0 ? <b>{r.leads_new}</b> : '—'}</td>
                  <td>{d <= 0 ? 'วันนี้' : `${d} วันก่อน`}{r.quiet ? ' ⚠️' : ''}</td>
                  <td>{r.status === 'published' ? '● เผยแพร่' : '○ ร่าง'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <p className="note" style={{ marginTop: 10 }}>เผยแพร่/ซ่อนร้าน และอนุมัติบัญชี ทำที่หน้า <Link href="/shops">ร้านสมัคร</Link></p>
    </>
  );
}
