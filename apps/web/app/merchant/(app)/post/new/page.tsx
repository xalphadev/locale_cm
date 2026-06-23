import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { Icon } from '../../ui';
import { PostForm } from '../PostForm';
import { createMerchantPostAction } from '../../../actions';
import { MTopbar } from '../../MTopbar';

export const dynamic = 'force-dynamic';

export default async function NewPost({ searchParams }: { searchParams: { error?: string } }) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  return (
    <>
      <MTopbar back="/merchant/post" backLabel="โพสต์" title="เขียนโพสต์" />
      {searchParams?.error === 'body' && <div className="banner-err">กรุณาพิมพ์ข้อความโพสต์</div>}
      <PostForm action={createMerchantPostAction} submitLabel="โพสต์เลย" />
    </>
  );
}
