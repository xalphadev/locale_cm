import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { Icon } from '../../ui';
import { ProductForm } from '../ProductForm';
import { createMerchantProductAction } from '../../../actions';

export const dynamic = 'force-dynamic';

export default async function NewProduct({ searchParams }: { searchParams: { error?: string } }) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  if (!acc.sells_products) redirect('/merchant');
  return (
    <>
      <div className="mback"><Link href="/merchant/products"><Icon n="chevL" size={18} /> สินค้า</Link></div>
      <h1>เพิ่มสินค้า</h1>
      {searchParams?.error === 'name' && <div className="banner-err">กรุณากรอกชื่อสินค้า</div>}
      <ProductForm action={createMerchantProductAction} submitLabel="เพิ่มสินค้า" />
    </>
  );
}
