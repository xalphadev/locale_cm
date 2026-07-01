import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { Icon } from '../../ui';
import { ProductForm } from '../ProductForm';
import { createMerchantProductAction } from '../../../actions';
import { MTopbar } from '../../MTopbar';

export const dynamic = 'force-dynamic';

export default async function NewProduct({ searchParams }: { searchParams: { error?: string } }) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  if (!acc.sells_products) redirect('/merchant');
  const sections = (await q<any>(`SELECT id, name_i18n FROM shop_section WHERE place_id=$1 AND deleted_at IS NULL ORDER BY sort, created_at`, [acc.place_id]))
    .map((sc) => ({ id: sc.id, name: i18n(sc.name_i18n) }));
  return (
    <>
      <MTopbar back="/merchant/products" backLabel="สินค้า" title="เพิ่มสินค้า" />
      {searchParams?.error === 'name' && <div className="banner-err">กรุณากรอกชื่อสินค้า</div>}
      <ProductForm action={createMerchantProductAction} submitLabel="เพิ่มสินค้า" sections={sections} />
    </>
  );
}
