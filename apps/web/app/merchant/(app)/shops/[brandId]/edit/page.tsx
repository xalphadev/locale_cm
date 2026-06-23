import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { Icon, isUuid } from '../../../ui';
import { PhotoUpload } from '../../../PhotoUpload';
import { updateBrandAction } from '../../../../actions';
import { MTopbar } from '../../../MTopbar';

export const dynamic = 'force-dynamic';

// Edit a BRAND's shared identity (name / logo / story) — applies to every branch of the brand. Reached from
// the brand card on /merchant/shops. Ownership re-proven here AND in updateBrandAction.
export default async function EditBrand({ params }: { params: { brandId: string } }) {
  const acc = await currentAccount();
  if (!acc) redirect('/merchant/login');
  const [b] = isUuid(params.brandId)
    ? await q<any>(`SELECT id, name_i18n, logo_url, description_i18n FROM brands WHERE id=$1 AND owner_account_id=$2 AND deleted_at IS NULL`, [params.brandId, acc.id])
    : [];
  if (!b) return (<><MTopbar back="/merchant/shops" backLabel="ร้านของฉัน" title="ไม่พบร้าน" /></>);

  return (
    <>
      <MTopbar back="/merchant/shops" backLabel="ร้านของฉัน" title="ชื่อ & โลโก้ร้าน" />
      <p className="note" style={{ margin: '-.3rem 0 .9rem' }}>ชื่อ · โลโก้ · เรื่องราว นี้<b>ใช้ร่วมทุกสาขา</b> — ส่วนที่อยู่ · รูป · เวลา ของแต่ละสาขาแก้ที่ “ข้อมูลสาขา”</p>
      <form className="form mform" action={updateBrandAction.bind(null, b.id)} encType="multipart/form-data">
        <section className="fsec">
          <div className="fsec-h"><span className="fsec-ic"><Icon n="store" size={15} /></span> ชื่อ &amp; เรื่องราว</div>
          <div className="field"><label>ชื่อร้าน</label><input name="name_th" defaultValue={i18n(b.name_i18n)} placeholder="เช่น ครัวเหนือ" /></div>
          <div className="field"><label>เรื่องราวร้าน <span className="lbl-opt">(ลูกค้าเห็น)</span></label><textarea name="desc_th" defaultValue={i18n(b.description_i18n)} style={{ minHeight: 80 }} placeholder="ที่มา จุดยืน สิ่งที่อยากให้ลูกค้าจำ" /></div>
        </section>
        <section className="fsec">
          <div className="fsec-h"><span className="fsec-ic"><Icon n="image" size={15} /></span> โลโก้ร้าน</div>
          <PhotoUpload existing={b.logo_url ? [b.logo_url] : undefined} label="แตะเพื่อเลือกโลโก้ หรือลากมาวาง" />
          <p className="fhint">ใช้รูปเดียวเป็นโลโก้ — แสดงบนหัวร้าน/การ์ดร้าน (เลือกหลายรูปจะใช้รูปแรก)</p>
        </section>
        <button className="btn btn-primary mform-save" type="submit">บันทึก</button>
      </form>
    </>
  );
}
