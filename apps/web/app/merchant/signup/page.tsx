import Link from 'next/link';
import { signupAction } from '../actions';

export const dynamic = 'force-dynamic';

export default function Signup({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <div className="portal-auth">
      <div className="pa-brand">Locale · ร้านค้า</div>
      <h1>สมัครร้านค้า</h1>
      <p className="note">สมัครเพื่อลงข้อมูลร้าน โพสต์ลงฟีด และโชว์สินค้าให้ลูกค้าเห็น — เราไม่ยุ่งเรื่องการขาย ลูกค้าติดต่อร้านโดยตรง</p>
      {searchParams?.error && <div className="banner-err">{searchParams.error}</div>}
      <form className="form" action={signupAction}>
        <div className="field"><label>ชื่อร้าน <span className="req">*</span></label><input name="shop_name" required placeholder="เช่น รากเหง้า สโลว์บาร์" /></div>
        <div className="field"><label>ประเภทร้าน <span className="req">*</span></label>
          <select name="shop_type" defaultValue="cafe">
            <optgroup label="ร้านอาหาร / เครื่องดื่ม (มีเมนู/สินค้า)">
              <option value="cafe">คาเฟ่</option><option value="restaurant">ร้านอาหาร</option>
              <option value="street_food">สตรีทฟู้ด</option><option value="dessert">ของหวาน / เบเกอรี</option>
            </optgroup>
            <optgroup label="ร้านขายของ (มีสินค้า)">
              <option value="market">ร้านขายของ / ผลไม้ผัก</option><option value="shop">ร้านค้าอื่นๆ</option>
            </optgroup>
            <optgroup label="ที่พัก (มีห้องเช่ารายเดือน/รายวัน)">
              <option value="dorm">หอพัก</option><option value="apartment">อพาร์ตเมนต์</option>
              <option value="condo">คอนโด</option><option value="mansion">แมนชั่น</option>
              <option value="house">บ้านเช่า</option><option value="homestay">โฮมสเตย์</option>
              <option value="guesthouse">เกสต์เฮาส์</option><option value="hotel">โรงแรม</option>
            </optgroup>
            <optgroup label="อื่นๆ">
              <option value="general">ร้านค้า / บริการทั่วไป (ไม่มีสินค้า/ห้องพัก)</option>
            </optgroup>
          </select>
          <p className="note" style={{ marginTop: 6 }}>ระบบจะเปิดเมนูให้ตรงประเภท — เพิ่ม “สินค้า” หรือ “ห้องพัก” ทีหลังได้ที่หน้า “ร้าน”</p>
        </div>
        <div className="grid2">
          <div className="field"><label>เบอร์โทร</label><input name="phone" placeholder="08x-xxx-xxxx" /></div>
          <div className="field"><label>LINE ID</label><input name="line_id" placeholder="@yourshop" /></div>
        </div>
        <hr className="phr" />
        <div className="field"><label>อีเมล <span className="req">*</span></label><input name="email" type="email" required autoComplete="email" /></div>
        <div className="field"><label>รหัสผ่าน <span className="req">*</span> (อย่างน้อย 8 ตัวอักษร)</label><input name="password" type="password" required minLength={8} autoComplete="new-password" /></div>
        <button className="btn btn-primary mform-save" type="submit">สมัครและเริ่มใช้งาน →</button>
      </form>
      <p className="note">ร้านมีอยู่ใน Locale แล้ว? <Link href="/merchant/claim">เคลมร้านของคุณ</Link></p>
      <p className="note">มีบัญชีแล้ว? <Link href="/merchant/login">เข้าสู่ระบบ</Link></p>
    </div>
  );
}
