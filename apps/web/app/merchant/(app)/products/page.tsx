import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { SUBTYPES } from './ProductForm';
import { ProductList } from './ProductList';

export const dynamic = 'force-dynamic';
const subLabel = (k: string) => (SUBTYPES.find(([s]) => s === k) || [, k])[1];

export default async function Products({ searchParams }: { searchParams: { ok?: string } }) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  if (!acc.sells_products) redirect('/merchant');
  const rows = await q<any>(
    `SELECT id, name_i18n, subtype, price_minor, price_unit, image_urls, status, sold_out, in_season
       FROM shop_products WHERE place_id=$1 ORDER BY created_at DESC`, [acc.place_id]);
  const items = rows.map((r) => ({
    id: r.id,
    name: i18n(r.name_i18n),
    meta: `${subLabel(r.subtype)}${r.price_minor != null ? ` · ฿${Math.round(r.price_minor / 100).toLocaleString()}${r.price_unit ? '/' + r.price_unit : ''}` : ' · สอบถามราคา'}`,
    image_urls: r.image_urls, status: r.status, sold_out: r.sold_out, in_season: r.in_season,
  }));
  return (
    <>
      {searchParams?.ok === '1' && <div className="banner-ok">✓ เพิ่มสินค้าแล้ว</div>}
      {searchParams?.ok === 'updated' && <div className="banner-ok">✓ บันทึกการแก้ไขแล้ว</div>}
      {searchParams?.ok === 'deleted' && <div className="banner-ok">✓ ลบสินค้าแล้ว</div>}
      <ProductList items={items} />
    </>
  );
}
