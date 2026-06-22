import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q } from '@/lib/db';
import { Icon, isUuid } from '../../../ui';
import { PostForm } from '../../PostForm';
import { updateMerchantPostAction } from '../../../../actions';

export const dynamic = 'force-dynamic';

export default async function EditPost({ params, searchParams }: { params: { id: string }; searchParams: { error?: string; rej?: string } }) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  const [p] = isUuid(params.id) ? await q<any>(`SELECT * FROM feed_posts WHERE id=$1 AND place_id=$2 AND deleted_at IS NULL`, [params.id, acc.place_id]) : [];
  if (!p) {
    return (<><div className="mback"><Link href="/merchant/post"><Icon n="chevL" size={18} /> โพสต์</Link></div><h1>ไม่พบโพสต์</h1></>);
  }
  return (
    <>
      <div className="mback"><Link href={`/merchant/post/${p.id}`}><Icon n="chevL" size={18} /> รายละเอียดโพสต์</Link></div>
      <h1>แก้ไขโพสต์</h1>
      {searchParams?.error === 'body' && <div className="banner-err">กรุณาพิมพ์ข้อความโพสต์</div>}
      {searchParams?.error === 'upload' && <div className="banner-err">อัปโหลดรูปไม่สำเร็จ {searchParams.rej} รูป (ต้องเป็น JPG/PNG/WEBP/GIF และไม่เกิน 6MB) — รูปเดิมยังอยู่ ลองใหม่อีกครั้ง</div>}
      <PostForm action={updateMerchantPostAction.bind(null, p.id)} post={p} submitLabel="บันทึกการแก้ไข" />
    </>
  );
}
