import Link from 'next/link';
import { Icon } from '../../ui';
import { ShopTypeSelect } from '../../ShopTypeSelect';
import { addShopAction } from '../../../actions';

export const dynamic = 'force-dynamic';

// Add a NEW brand/shop ("ร้าน") under the logged-in account → addShopAction (brand + first branch).
export default function NewShop({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <>
      <div className="mback"><Link href="/merchant/shops"><Icon n="chevL" size={17} /> ร้านของฉัน</Link></div>
      <h1 className="phead"><span className="phead-ic"><Icon n="store" size={18} /></span> เพิ่มร้านใหม่</h1>
      <p className="note" style={{ margin: '.1rem 0 .9rem' }}>สร้างร้าน/แบรนด์ใหม่ภายใต้บัญชีเดิม — ไม่ต้องสมัครบัญชีใหม่ และเพิ่มสาขาทีหลังได้</p>
      {searchParams?.error === 'name' && <div className="banner-err">กรุณากรอกชื่อร้าน</div>}
      {searchParams?.error === 'city' && <div className="banner-err">ระบบยังไม่พร้อมในเมืองนี้ กรุณาติดต่อทีมงาน</div>}
      <form className="form mform" action={addShopAction}>
        <section className="fsec">
          <div className="fsec-h"><span className="fsec-ic"><Icon n="store" size={15} /></span> ข้อมูลร้าน</div>
          <div className="field"><label>ชื่อร้าน *</label><input name="shop_name" required placeholder="เช่น ครัวเหนือ" /></div>
          <div className="field"><label>ประเภทร้าน *</label>
            <ShopTypeSelect />
            <p className="fhint">ระบบจะเปิดเมนูให้ตรงประเภท — เพิ่ม “สินค้า” หรือ “ห้องพัก” ทีหลังได้ที่หน้า “ร้าน”</p>
          </div>
        </section>
        <section className="fsec">
          <div className="fsec-h"><span className="fsec-ic"><Icon n="pin" size={15} /></span> ช่องทางติดต่อ</div>
          <div className="fgrid">
            <div className="field"><label>เบอร์โทร</label><input name="phone" placeholder="08x-xxx-xxxx" /></div>
            <div className="field"><label>LINE ID</label><input name="line_id" placeholder="@yourshop" /></div>
          </div>
          <p className="fhint">LINE / เบอร์โทรคือช่องทางที่ลูกค้าใช้ติดต่อร้านสาขาแรกโดยตรง (แก้ไขทีหลังได้)</p>
        </section>
        <button className="btn btn-primary mform-save" type="submit">สร้างร้าน →</button>
      </form>
    </>
  );
}
