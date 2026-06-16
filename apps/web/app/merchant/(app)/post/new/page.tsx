import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { Icon } from '../../ui';
import { PostForm } from '../PostForm';
import { createMerchantPostAction } from '../../../actions';

export const dynamic = 'force-dynamic';

export default async function NewPost({ searchParams }: { searchParams: { error?: string } }) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  return (
    <>
      <div className="mback"><a href="/merchant/post"><Icon n="chevL" size={18} /> โพสต์</a></div>
      <h1>เขียนโพสต์</h1>
      {searchParams?.error === 'body' && <div className="banner-err">กรุณาพิมพ์ข้อความโพสต์</div>}
      <PostForm action={createMerchantPostAction} submitLabel="โพสต์เลย" />
    </>
  );
}
