import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { Icon, Thumb } from '../ui';
import { SUBTYPES } from './ProductForm';

export const dynamic = 'force-dynamic';
const subLabel = (k: string) => (SUBTYPES.find(([s]) => s === k) || [, k])[1];

export default async function Products({ searchParams }: { searchParams: { ok?: string } }) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  if (!acc.sells_products) redirect('/merchant');
  const rows = await q<any>(
    `SELECT id, name_i18n, subtype, price_minor, price_unit, image_urls, status, sold_out, in_season
       FROM shop_products WHERE place_id=$1 ORDER BY created_at DESC`, [acc.place_id]);
  return (
    <>
      <div className="listhead">
        <h1>สินค้า <span className="listcount">{rows.length}</span></h1>
        <a className="addbtn" href="/merchant/products/new"><Icon n="plus" size={17} /> เพิ่มสินค้า</a>
      </div>
      {searchParams?.ok === '1' && <div className="banner-ok">✓ เพิ่มสินค้าแล้ว</div>}
      {searchParams?.ok === 'updated' && <div className="banner-ok">✓ บันทึกการแก้ไขแล้ว</div>}
      {searchParams?.ok === 'deleted' && <div className="banner-ok">✓ ลบสินค้าแล้ว</div>}

      {rows.length === 0 ? (
        <div className="mempty">
          <span className="mempty-ic"><Icon n="box" size={30} /></span>
          <p>ยังไม่มีสินค้า — เพิ่มชิ้นแรกเพื่อโชว์ให้ลูกค้าเห็น</p>
          <a className="btn btn-primary" href="/merchant/products/new">+ เพิ่มสินค้าชิ้นแรก</a>
        </div>
      ) : (
        <div className="mlist">
          {rows.map((r) => (
            <a className={`mrow ${r.status === 'hidden' ? 'off' : ''}`} href={`/merchant/products/${r.id}`} key={r.id}>
              <span className="mrow-img"><Thumb images={r.image_urls} kind="product" alt={i18n(r.name_i18n)} /></span>
              <span className="mrow-body">
                <span className="mrow-nm">{i18n(r.name_i18n)}</span>
                <span className="mrow-meta">{subLabel(r.subtype)}{r.price_minor != null ? ` · ฿${Math.round(r.price_minor / 100).toLocaleString()}${r.price_unit ? '/' + r.price_unit : ''}` : ' · สอบถามราคา'}</span>
                <span className="mrow-tags">
                  {r.status === 'hidden' && <span className="t off">ซ่อนอยู่</span>}
                  {r.status !== 'hidden' && r.sold_out && <span className="t sold">หมด</span>}
                  {r.status !== 'hidden' && r.in_season && <span className="t season">ในฤดู</span>}
                </span>
              </span>
              <Icon n="chevR" size={20} className="mrow-go" />
            </a>
          ))}
        </div>
      )}
    </>
  );
}
