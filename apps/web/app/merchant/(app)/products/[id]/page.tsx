import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { Icon, Thumb, isUuid } from '../../ui';
import { SUBTYPES } from '../ProductForm';
import { setProductFlagAction, deleteProductAction } from '../../../actions';

export const dynamic = 'force-dynamic';
const subLabel = (k: string) => (SUBTYPES.find(([s]) => s === k) || [, k])[1];
const fmtDate = (ts: any) => (ts ? new Date(ts).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) : '—');

export default async function ProductDetail({ params }: { params: { id: string } }) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  if (!acc.sells_products) redirect('/merchant');
  const [p] = isUuid(params.id) ? await q<any>(`SELECT * FROM shop_products WHERE id=$1 AND place_id=$2 AND deleted_at IS NULL`, [params.id, acc.place_id]) : [];
  if (!p) return (<><div className="mback"><a href="/merchant/products"><Icon n="chevL" size={18} /> สินค้า</a></div><h1>ไม่พบสินค้า</h1></>);

  const imgs: string[] | null = p.image_urls;
  const hidden = p.status === 'hidden';
  const price = p.price_minor != null ? `฿${Math.round(p.price_minor / 100).toLocaleString()}${p.price_unit ? '/' + p.price_unit : ''}` : 'สอบถามราคา';
  return (
    <>
      <div className="mback"><a href="/merchant/products"><Icon n="chevL" size={18} /> สินค้า</a></div>

      <div className="dhero">
        {imgs && imgs.length ? (
          <div className="dgal">{imgs.map((src, i) => <img key={i} src={src} alt="" loading={i ? 'lazy' : 'eager'} />)}</div>
        ) : (
          <span className="dhero-ph"><Thumb images={null} kind="product" /><span>ยังไม่มีรูป — เพิ่มรูปในหน้าแก้ไข</span></span>
        )}
        {imgs && imgs.length > 1 && <span className="dcount"><Icon n="image" size={12} /> {imgs.length} รูป</span>}
      </div>

      <div className="dtitle">
        <div className="dtags">
          <span className="t cat"><Icon n="tag" size={12} /> {subLabel(p.subtype)}</span>
          {hidden && <span className="t off">ซ่อนอยู่</span>}
          {!hidden && p.sold_out && <span className="t sold">หมด</span>}
          {!hidden && p.in_season && <span className="t season"><Icon n="spark" size={11} /> ในฤดู</span>}
        </div>
        <h1>{i18n(p.name_i18n)}</h1>
        <div className="dprice">{price}</div>
      </div>

      <div className="info">
        <div className="info-row"><Icon n="tag" size={18} className="flat-ico" /><span>หมวดหมู่</span><b>{subLabel(p.subtype)}</b></div>
        <div className="info-row"><Icon n="wallet" size={18} className="flat-ico" /><span>ราคา</span><b>{price}</b></div>
        <div className="info-row"><Icon n={hidden ? 'eyeOff' : 'eye'} size={18} className="flat-ico" /><span>สถานะ</span><b>{hidden ? 'ซ่อนจากลูกค้า' : p.sold_out ? 'แสดงอยู่ (ของหมด)' : 'แสดงให้ลูกค้าเห็น'}</b></div>
        <div className="info-row last"><Icon n="clock" size={18} className="flat-ico" /><span>อัปเดตล่าสุด</span><b>{fmtDate(p.updated_at)}</b></div>
      </div>

      <h2 className="rsec"><span className="rsec-ic"><Icon n="store" size={15} /></span> จัดการสินค้า</h2>
      <div className="dbar">
        <a className="dbtn primary" href={`/merchant/products/${p.id}/edit`}><Icon n="edit" size={18} /> แก้ไขสินค้า</a>
        {!hidden && <form action={setProductFlagAction.bind(null, p.id, 'sold_out')}><button className="dbtn" type="submit"><Icon n="check" size={18} /> {p.sold_out ? 'มีของแล้ว' : 'ทำเป็นของหมด'}</button></form>}
        <form action={setProductFlagAction.bind(null, p.id, hidden ? 'show' : 'hide')}><button className="dbtn" type="submit"><Icon n={hidden ? 'eye' : 'eyeOff'} size={18} /> {hidden ? 'แสดงให้ลูกค้าเห็น' : 'ซ่อนจากลูกค้า'}</button></form>
      </div>
      <form className="delwrap" action={deleteProductAction.bind(null, p.id)}>
        <button className="dbtn danger" type="submit"><Icon n="trash" size={17} /> ลบสินค้านี้</button>
      </form>
    </>
  );
}
