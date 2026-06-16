import { Icon } from '../../ui';
import { ShopTypeSelect } from '../../ShopTypeSelect';
import { addShopAction } from '../../../actions';

export const dynamic = 'force-dynamic';

// Add a NEW brand/shop ("ร้าน") under the logged-in account → addShopAction (brand + first branch).
export default function NewShop({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <>
      <h1 className="phead"><span className="phead-ic"><Icon n="store" size={18} /></span> เพิ่มร้านใหม่</h1>
      <p className="note">สร้างร้าน/แบรนด์ใหม่ภายใต้บัญชีเดิม — ไม่ต้องสมัครบัญชีใหม่ และเพิ่มสาขาทีหลังได้</p>
      {searchParams?.error === 'name' && <div className="banner-err">กรุณากรอกชื่อร้าน</div>}
      {searchParams?.error === 'city' && <div className="banner-err">ระบบยังไม่พร้อมในเมืองนี้ กรุณาติดต่อทีมงาน</div>}
      <form className="form mform" action={addShopAction}>
        <div className="field"><label>ชื่อร้าน *</label><input name="shop_name" required placeholder="เช่น ครัวเหนือ" /></div>
        <div className="field"><label>ประเภทร้าน *</label>
          <ShopTypeSelect />
          <p className="note" style={{ marginTop: 6 }}>ระบบจะเปิดเมนูให้ตรงประเภท — เพิ่ม “สินค้า” หรือ “ห้องพัก” ทีหลังได้ที่หน้า “ร้าน”</p>
        </div>
        <div className="grid2">
          <div className="field"><label>เบอร์โทร</label><input name="phone" placeholder="08x-xxx-xxxx" /></div>
          <div className="field"><label>LINE ID</label><input name="line_id" placeholder="@yourshop" /></div>
        </div>
        <button className="btn btn-primary mform-save" type="submit">สร้างร้าน →</button>
      </form>
      <p className="note"><a href="/merchant/shops">← กลับไปร้านของฉัน</a></p>
    </>
  );
}
