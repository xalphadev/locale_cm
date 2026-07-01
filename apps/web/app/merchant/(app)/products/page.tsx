import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { SUBTYPES } from './ProductForm';
import { ProductList } from './ProductList';
import { createShopSectionAction, updateShopSectionAction, deleteShopSectionAction } from '../../actions';
import { ConfirmSubmit } from '../ConfirmSubmit';

export const dynamic = 'force-dynamic';
const subLabel = (k: string) => (SUBTYPES.find(([s]) => s === k) || [, k])[1];

export default async function Products({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  if (!acc.sells_products) redirect('/merchant');
  const sections = await q<any>(
    `SELECT id, name_i18n, sort FROM shop_section WHERE place_id=$1 AND deleted_at IS NULL ORDER BY sort, created_at`, [acc.place_id]);
  // list follows the CUSTOMER's menu order: section (by sort) → item sort → newest
  const rows = await q<any>(
    `SELECT sp.id, sp.name_i18n, sp.subtype, sp.price_minor, sp.price_unit, sp.image_urls, sp.status, sp.sold_out, sp.in_season, sp.is_recommended, sp.stock_qty,
            sec.name_i18n sec_name
       FROM shop_products sp LEFT JOIN shop_section sec ON sec.id=sp.section_id AND sec.deleted_at IS NULL
      WHERE sp.place_id=$1 AND sp.deleted_at IS NULL
      ORDER BY sec.sort NULLS LAST, sec.created_at, sp.sort, sp.created_at DESC`, [acc.place_id]);
  const items = rows.map((r) => ({
    id: r.id,
    name: i18n(r.name_i18n),
    meta: `${subLabel(r.subtype)}${r.price_minor != null ? ` · ฿${Math.round(r.price_minor / 100).toLocaleString()}${r.price_unit ? '/' + r.price_unit : ''}` : ' · สอบถามราคา'}${r.stock_qty != null ? ` · เหลือ ${r.stock_qty}` : ''}`,
    image_urls: r.image_urls, status: r.status, sold_out: r.sold_out, in_season: r.in_season,
    recommended: !!r.is_recommended,
    group: r.sec_name ? i18n(r.sec_name) : (sections.length ? 'ไม่จัดหมวด' : ''),
  }));
  return (
    <>
      {searchParams?.ok === '1' && <div className="banner-ok">✓ เพิ่มสินค้าแล้ว</div>}
      {searchParams?.ok === 'updated' && <div className="banner-ok">✓ บันทึกการแก้ไขแล้ว</div>}
      {searchParams?.ok === 'deleted' && <div className="banner-ok">✓ ลบสินค้าแล้ว</div>}
      {searchParams?.ok === 'section' && <div className="banner-ok">✓ บันทึกหมวดแล้ว</div>}
      {searchParams?.ok === 'secdeleted' && <div className="banner-ok">✓ ลบหมวดแล้ว — เมนูในหมวดยังอยู่ (ย้ายไป “ไม่จัดหมวด”)</div>}
      {searchParams?.error === 'secname' && <div className="banner-err">กรุณาตั้งชื่อหมวด</div>}
      <ProductList items={items} />

      {/* menu sections (0066): what the customer's menu is grouped by — สร้าง/แก้/ลบที่นี่ */}
      <details style={{ margin: '14px 0' }} open={sections.length === 0 && items.length > 0}>
        <summary className="dbtn sm" style={{ display: 'inline-block', cursor: 'pointer', listStyle: 'none' }}>
          จัดหมวดเมนูร้าน ({sections.length})
        </summary>
        <p className="fhint" style={{ margin: '8px 0 6px' }}>หมวดจะแสดงเป็นหัวข้อในเมนูหน้าร้านของลูกค้า เรียงตาม “ลำดับ” จากน้อยไปมาก · กำหนดหมวดให้เมนูแต่ละรายการในหน้าแก้ไขสินค้า</p>
        {sections.map((sc: any) => (
          <div key={sc.id} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
            <form action={updateShopSectionAction.bind(null, sc.id)} style={{ display: 'flex', gap: 6, flex: 1 }}>
              <input name="name" defaultValue={i18n(sc.name_i18n)} maxLength={60} required style={{ flex: 1 }} />
              <input name="sort" type="number" defaultValue={sc.sort} style={{ width: 72 }} aria-label="ลำดับ" />
              <button className="dbtn sm" type="submit">บันทึก</button>
            </form>
            <form action={deleteShopSectionAction.bind(null, sc.id)}>
              <ConfirmSubmit className="dbtn sm" message={`ลบหมวด “${i18n(sc.name_i18n)}”? เมนูในหมวดจะย้ายไป “ไม่จัดหมวด”`}>ลบ</ConfirmSubmit>
            </form>
          </div>
        ))}
        <form action={createShopSectionAction} style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <input name="name" placeholder="เพิ่มหมวดใหม่ เช่น กาแฟ / เมนูข้าว" maxLength={60} required style={{ flex: 1 }} />
          <input name="sort" type="number" defaultValue={100} style={{ width: 72 }} aria-label="ลำดับ" />
          <button className="dbtn sm primary" type="submit">+ เพิ่มหมวด</button>
        </form>
      </details>
    </>
  );
}
