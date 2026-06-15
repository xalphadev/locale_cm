import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { updateShopAction } from '../../actions';

export const dynamic = 'force-dynamic';

export default async function Shop({ searchParams }: { searchParams: { ok?: string } }) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  const [p] = await q<any>(
    `SELECT name_i18n, description_i18n, phone, line_id, website, sells_products, offers_stay FROM places WHERE id=$1`, [acc.place_id]);
  return (
    <>
      <h1>ข้อมูลร้าน</h1>
      {searchParams?.ok && <div className="banner-ok">✓ บันทึกแล้ว</div>}
      <form className="form" action={updateShopAction}>
        <div className="field"><label>ชื่อร้าน</label><input name="name_th" defaultValue={i18n(p?.name_i18n)} /></div>
        <div className="field"><label>รายละเอียดร้าน</label><textarea name="desc_th" defaultValue={i18n(p?.description_i18n)} style={{ minHeight: 80 }} placeholder="เล่าเรื่องร้าน จุดเด่น เมนู/สินค้าแนะนำ" /></div>
        <div className="grid2">
          <div className="field"><label>เบอร์โทร</label><input name="phone" defaultValue={p?.phone || ''} placeholder="08x-xxx-xxxx" /></div>
          <div className="field"><label>LINE ID</label><input name="line_id" defaultValue={p?.line_id || ''} placeholder="@yourshop" /></div>
        </div>
        <div className="field"><label>เว็บไซต์</label><input name="website" defaultValue={p?.website || ''} placeholder="https://..." /></div>
        <label className="check"><input type="checkbox" name="sells_products" defaultChecked={!!p?.sells_products} /> ร้านมีสินค้าขาย (แสดงแถบ “สินค้าในร้าน” ให้ลูกค้า)</label>
        <label className="check"><input type="checkbox" name="offers_stay" defaultChecked={!!p?.offers_stay} /> มีห้องพักให้เช่า (แสดงแถบ “ห้องว่าง” + ขึ้นในหน้า “ที่พัก” — จัดการห้องที่เมนู “ห้องพัก”)</label>
        <button className="btn btn-primary" type="submit">บันทึก</button>
      </form>
      <p className="note">ในเวอร์ชันนี้การแก้ข้อมูลมีผลทันที — โปรดักชันจะให้ทีมงานตรวจก่อนเผยแพร่ (ข้อมูล LINE/เบอร์โทรคือช่องทางที่ลูกค้าใช้ติดต่อสั่งซื้อ)</p>
    </>
  );
}
