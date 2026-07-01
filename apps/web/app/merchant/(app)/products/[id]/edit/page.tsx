import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { Icon, isUuid } from '../../../ui';
import { ProductForm } from '../../ProductForm';
import { updateMerchantProductAction } from '../../../../actions';
import { MTopbar } from '../../../MTopbar';

export const dynamic = 'force-dynamic';

export default async function EditProduct({ params, searchParams }: { params: { id: string }; searchParams: { error?: string; rej?: string } }) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  if (!acc.sells_products) redirect('/merchant');
  const [p] = isUuid(params.id) ? await q<any>(`SELECT * FROM shop_products WHERE id=$1 AND place_id=$2 AND deleted_at IS NULL`, [params.id, acc.place_id]) : [];
  if (!p) {
    return (<><MTopbar back="/merchant/products" backLabel="สินค้า" title="ไม่พบสินค้า" /></>);
  }
  const sections = (await q<any>(`SELECT id, name_i18n FROM shop_section WHERE place_id=$1 AND deleted_at IS NULL ORDER BY sort, created_at`, [acc.place_id]))
    .map((sc) => ({ id: sc.id, name: i18n(sc.name_i18n) }));
  return (
    <>
      <MTopbar back={`/merchant/products/${p.id}`} backLabel="รายละเอียดสินค้า" title="แก้ไขสินค้า" />
      {searchParams?.error === 'name' && <div className="banner-err">กรุณากรอกชื่อสินค้า</div>}
      {searchParams?.error === 'upload' && <div className="banner-err">อัปโหลดรูปไม่สำเร็จ {searchParams.rej} รูป (ต้องเป็น JPG/PNG/WEBP/GIF และไม่เกิน 6MB) — รูปเดิมยังอยู่ ลองใหม่อีกครั้ง</div>}
      <ProductForm action={updateMerchantProductAction.bind(null, p.id)} p={p} submitLabel="บันทึกการแก้ไข" sections={sections} />
    </>
  );
}
