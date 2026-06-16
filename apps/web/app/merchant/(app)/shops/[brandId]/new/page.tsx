import { redirect, notFound } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { Icon, isUuid } from '../../../ui';
import { ShopTypeSelect } from '../../../ShopTypeSelect';
import { addBranchAction } from '../../../../actions';

export const dynamic = 'force-dynamic';

// Add a NEW branch ("สาขา") to an EXISTING brand the account owns → addBranchAction.
export default async function NewBranch({
  params, searchParams,
}: { params: { brandId: string }; searchParams: { error?: string } }) {
  const acc = await currentAccount();
  if (!acc) redirect('/merchant/login');
  if (!isUuid(params.brandId)) notFound();
  const [brand] = await q<any>(
    `SELECT id, name_i18n FROM brands WHERE id=$1 AND owner_account_id=$2 AND status='active'`,
    [params.brandId, acc.id]);
  if (!brand) notFound();   // not yours / not found → fail closed

  return (
    <>
      <h1 className="phead"><span className="phead-ic"><Icon n="store" size={18} /></span> เพิ่มสาขา</h1>
      <p className="note">เพิ่มสาขา/ที่พักใหม่ให้ร้าน <b>{i18n(brand.name_i18n)}</b> — แต่ละสาขามีที่อยู่ เบอร์โทร และข้อมูลของตัวเอง</p>
      {searchParams?.error === 'name' && <div className="banner-err">กรุณากรอกชื่อสาขา</div>}
      <form className="form mform" action={addBranchAction}>
        <input type="hidden" name="brand_id" value={brand.id} />
        <div className="field"><label>ชื่อสาขา *</label><input name="shop_name" required placeholder={`เช่น ${i18n(brand.name_i18n)} สาขานิมมาน`} /></div>
        <div className="field"><label>ประเภท *</label>
          <ShopTypeSelect />
          <p className="note" style={{ marginTop: 6 }}>สาขาหนึ่งอาจเป็นที่พักก็ได้ — เลือกประเภทให้ตรงกับสาขานี้</p>
        </div>
        <div className="grid2">
          <div className="field"><label>เบอร์โทร</label><input name="phone" placeholder="08x-xxx-xxxx" /></div>
          <div className="field"><label>LINE ID</label><input name="line_id" placeholder="@yourshop" /></div>
        </div>
        <button className="btn btn-primary mform-save" type="submit">เพิ่มสาขา →</button>
      </form>
      <p className="note"><a href="/merchant/shops">← กลับไปร้านของฉัน</a></p>
    </>
  );
}
