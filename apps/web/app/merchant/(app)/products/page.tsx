import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { thumb } from '@/lib/img';
import { setProductFlagAction } from '../../actions';
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
        <a className="addbtn" href="/merchant/products/new">+ เพิ่มสินค้า</a>
      </div>
      {searchParams?.ok === '1' && <div className="banner-ok">✓ เพิ่มสินค้าแล้ว</div>}
      {searchParams?.ok === 'updated' && <div className="banner-ok">✓ บันทึกการแก้ไขแล้ว</div>}
      {searchParams?.ok === 'deleted' && <div className="banner-ok">✓ ลบสินค้าแล้ว</div>}

      {rows.length === 0 ? (
        <div className="mempty">
          <p>ยังไม่มีสินค้า — เพิ่มชิ้นแรกเพื่อโชว์ให้ลูกค้าเห็น</p>
          <a className="btn btn-primary" href="/merchant/products/new">+ เพิ่มสินค้าชิ้นแรก</a>
        </div>
      ) : (
        <div className="mlist">
          {rows.map((r) => (
            <div className={`mrow ${r.status === 'hidden' ? 'off' : ''}`} key={r.id}>
              <a className="mrow-img" href={`/merchant/products/${r.id}/edit`}>
                <img src={thumb(r.image_urls, 'p' + r.id, r.subtype, 'eat')} alt="" loading="lazy" />
              </a>
              <a className="mrow-body" href={`/merchant/products/${r.id}/edit`}>
                <div className="mrow-nm">{i18n(r.name_i18n)}</div>
                <div className="mrow-meta">{subLabel(r.subtype)}{r.price_minor != null ? ` · ฿${Math.round(r.price_minor / 100).toLocaleString()}${r.price_unit ? '/' + r.price_unit : ''}` : ' · สอบถามราคา'}</div>
                <div className="mrow-tags">
                  {r.status === 'hidden' && <span className="t off">ซ่อนอยู่</span>}
                  {r.sold_out && <span className="t sold">หมด</span>}
                  {r.in_season && <span className="t season">ในฤดู</span>}
                </div>
              </a>
              <div className="mrow-acts">
                <form action={setProductFlagAction.bind(null, r.id, 'sold_out')}><button className="mini" type="submit">{r.sold_out ? 'มีของ' : 'หมด'}</button></form>
                <form action={setProductFlagAction.bind(null, r.id, r.status === 'hidden' ? 'show' : 'hide')}><button className="mini" type="submit">{r.status === 'hidden' ? 'แสดง' : 'ซ่อน'}</button></form>
                <a className="mini edit" href={`/merchant/products/${r.id}/edit`}>แก้ไข</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
