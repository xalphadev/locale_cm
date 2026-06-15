import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q } from '@/lib/db';
import { ProductForm } from '../../ProductForm';
import { updateMerchantProductAction, deleteProductAction } from '../../../../actions';

export const dynamic = 'force-dynamic';

export default async function EditProduct({ params, searchParams }: { params: { id: string }; searchParams: { error?: string; rej?: string } }) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  if (!acc.sells_products) redirect('/merchant');
  const [p] = await q<any>(`SELECT * FROM shop_products WHERE id=$1 AND place_id=$2`, [params.id, acc.place_id]);
  if (!p) {
    return (<><div className="mback"><a href="/merchant/products">← สินค้า</a></div><h1>ไม่พบสินค้า</h1></>);
  }
  return (
    <>
      <div className="mback"><a href="/merchant/products">← สินค้า</a></div>
      <h1>แก้ไขสินค้า</h1>
      {searchParams?.error === 'name' && <div className="banner-err">กรุณากรอกชื่อสินค้า</div>}
      {searchParams?.error === 'upload' && <div className="banner-err">อัปโหลดรูปไม่สำเร็จ {searchParams.rej} รูป (ต้องเป็น JPG/PNG/WEBP/GIF และไม่เกิน 6MB) — รูปเดิมยังอยู่ ลองใหม่อีกครั้ง</div>}
      <ProductForm action={updateMerchantProductAction.bind(null, p.id)} p={p} submitLabel="บันทึกการแก้ไข" />
      <form className="delwrap" action={deleteProductAction.bind(null, p.id)}>
        <button className="mini danger" type="submit">ลบสินค้านี้</button>
      </form>
    </>
  );
}
