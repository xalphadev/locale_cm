import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { Icon } from '../../ui';
import { updateShopAction } from '../../../actions';
import GeoPicker from '../GeoPicker';
import { PhotoUpload } from '../../PhotoUpload';
import { HoursEditor } from '../../HoursEditor';

export const dynamic = 'force-dynamic';

const NIMMAN_LNG = 98.967, NIMMAN_LAT = 18.796;
function parsePoint(geo: string | null) {
  if (!geo) return null;
  const m = /POINT\(([-\d.]+)\s+([-\d.]+)\)/i.exec(geo);
  return m ? { lng: parseFloat(m[1]), lat: parseFloat(m[2]) } : null;
}

// Edit form for the shop info — kept separate from the read-only /merchant/shop view so opening the
// page doesn't drop the owner straight into editable fields. updateShopAction redirects back to the view.
export default async function ShopEdit() {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  const [p] = await q<any>(
    `SELECT name_i18n, description_i18n, address_i18n, image_urls, opening_hours, phone, line_id, website, sells_products, offers_stay, manages_stay, room_mode, geo::text geo FROM places WHERE id=$1`, [acc.place_id]);
  const pt = parsePoint(p?.geo);
  const unpinned = !pt || (Math.abs(pt.lng - NIMMAN_LNG) < 1e-4 && Math.abs(pt.lat - NIMMAN_LAT) < 1e-4);
  return (
    <>
      <div className="mback"><Link href="/merchant/shop"><Icon n="chevL" size={18} /> ข้อมูลร้าน</Link></div>
      <h1 className="phead"><span className="phead-ic"><Icon n="edit" size={18} /></span> แก้ไขข้อมูลร้าน</h1>
      <form className="form mform" action={updateShopAction} encType="multipart/form-data">
        <section className="fsec">
          <div className="fsec-h"><span className="fsec-ic"><Icon n="store" size={15} /></span> ข้อมูลร้าน</div>
          <div className="field"><label>ชื่อร้าน</label><input name="name_th" defaultValue={i18n(p?.name_i18n)} /></div>
          <div className="field"><label>รายละเอียดร้าน</label><textarea name="desc_th" defaultValue={i18n(p?.description_i18n)} style={{ minHeight: 84 }} placeholder="เล่าเรื่องร้าน จุดเด่น เมนู/สินค้าแนะนำ" /></div>
        </section>

        <section className="fsec">
          <div className="fsec-h"><span className="fsec-ic"><Icon n="image" size={15} /></span> รูปร้าน <span className="lbl-opt">(ลูกค้าเห็นเป็นแกลเลอรี)</span></div>
          <PhotoUpload existing={p?.image_urls} label="แตะเพื่อเลือกรูปร้าน หรือลากมาวาง" />
          <p className="fhint">รูปหน้าร้าน/ตึก · ล็อบบี้ · ส่วนกลาง/สระ · บรรยากาศ — รูปแรกเป็นรูปปกที่ลูกค้าเห็นก่อน (รูปห้องแยกใส่ที่ “ห้องพัก”)</p>
        </section>

        <section className="fsec">
          <div className="fsec-h"><span className="fsec-ic"><Icon n="pin" size={15} /></span> ช่องทางติดต่อ</div>
          <div className="fgrid">
            <div className="field"><label>เบอร์โทร</label><input name="phone" defaultValue={p?.phone || ''} placeholder="08x-xxx-xxxx" /></div>
            <div className="field"><label>LINE ID</label><input name="line_id" defaultValue={p?.line_id || ''} placeholder="@yourshop" /></div>
          </div>
          <div className="field"><label>เว็บไซต์</label><input name="website" defaultValue={p?.website || ''} placeholder="https://..." /></div>
          <p className="fhint">LINE / เบอร์โทรคือช่องทางที่ลูกค้าใช้ติดต่อสั่งซื้อหรือจองโดยตรง</p>
        </section>

        <section className="fsec">
          <div className="fsec-h"><span className="fsec-ic"><Icon n="clock" size={15} /></span> เวลาเปิด-ปิด <span className="lbl-opt">(ลูกค้าเห็น “เปิดอยู่/ปิด”)</span></div>
          <HoursEditor value={p?.opening_hours} />
          <p className="fhint">ติ๊กวันที่เปิด แล้วใส่เวลา — ลูกค้าจะเห็นสถานะ “เปิดอยู่ตอนนี้/ปิด” อัตโนมัติตามเวลาเชียงใหม่</p>
        </section>

        <section className="fsec">
          <div className="fsec-h"><span className="fsec-ic"><Icon n="tag" size={15} /></span> ร้านนี้มีอะไรบ้าง</div>
          <label className="check"><input type="checkbox" name="sells_products" defaultChecked={!!p?.sells_products} /> ร้านมีสินค้าขาย — เปิดเมนู “สินค้า” + แสดงแถบสินค้าให้ลูกค้า</label>
          <label className="check" style={{ marginTop: 8 }}><input type="checkbox" name="offers_stay" defaultChecked={!!p?.offers_stay} /> มีห้องพักให้เช่า — เปิดเมนู “ห้องพัก” + ขึ้นในหน้า “ที่พัก” ของลูกค้า</label>
          <label className="check" style={{ marginTop: 8 }}><input type="checkbox" name="manages_stay" defaultChecked={!!p?.manages_stay} /> ใช้ระบบจัดการห้อง — เปิดเมนู “ผังห้อง” (วางห้องจริง · คุมห้องว่าง · ปฏิทินรายวัน)</label>
          <p className="fhint">ปิดอันไหน เมนูนั้นจะถูกซ่อน และรายการที่เผยแพร่ไว้จะถูกซ่อนจากลูกค้า · “ผังห้อง” ใช้บริหารห้องภายใน ไม่บังคับว่าต้องเผยแพร่</p>
          <div className="field" style={{ marginTop: 12 }}>
            <label>รูปแบบห้องของที่พักนี้</label>
            <div className="modecards">
              <label className="modecard">
                <input type="radio" name="room_mode" value="multi" defaultChecked={(p?.room_mode || 'multi') !== 'unique'} />
                <span className="modecard-b"><b>หลายห้องเหมือนกัน</b><span>หอพัก · อพาร์ตเมนต์ — ตั้งราคา/รูปทีละแบบ + มีผังห้องคุมห้องว่าง</span></span>
              </label>
              <label className="modecard">
                <input type="radio" name="room_mode" value="unique" defaultChecked={p?.room_mode === 'unique'} />
                <span className="modecard-b"><b>แต่ละห้องไม่เหมือนกัน</b><span>รีสอร์ท · เกสต์เฮาส์ — แต่ละห้องมีชื่อ/ราคา/รูปของตัวเอง</span></span>
              </label>
            </div>
            <p className="fhint">ตั้งได้ต่อสาขา · “หลายห้องเหมือนกัน” = ราคาเดียวหลายห้อง (เปิดผังห้อง) · “แต่ละห้องไม่เหมือนกัน” = แต่ละห้องมีชื่อ/ราคา/รูปของตัวเอง</p>
          </div>
        </section>

        <section className="fsec">
          <div className="fsec-h"><span className="fsec-ic"><Icon n="pin" size={15} /></span> ที่อยู่ & ตำแหน่งบนแผนที่</div>
          <div className="field"><label>ที่อยู่ <span className="lbl-opt">(ลูกค้าเห็น)</span></label><input name="address_th" defaultValue={i18n(p?.address_i18n)} placeholder="เช่น 12/3 ถ.นิมมานเหมินท์ ซ.9 ต.สุเทพ อ.เมือง เชียงใหม่ 50200" /></div>
          {unpinned && <div className="banner-err" style={{ marginBottom: 8 }}>ยังไม่ได้ปักหมุด — ลูกค้าจะหาคุณบนแผนที่ “ที่พัก” ไม่เจอ</div>}
          <GeoPicker lat0={pt?.lat ?? null} lng0={pt?.lng ?? null} />
        </section>

        <button className="btn btn-primary mform-save" type="submit">บันทึก</button>
      </form>
      <p className="note">ในเวอร์ชันนี้การแก้ข้อมูลมีผลทันที — โปรดักชันจะให้ทีมงานตรวจก่อนเผยแพร่ (ข้อมูล LINE/เบอร์โทรคือช่องทางที่ลูกค้าใช้ติดต่อสั่งซื้อ)</p>
    </>
  );
}
