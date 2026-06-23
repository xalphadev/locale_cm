import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentAccount } from '@/lib/auth';
import { q, i18n } from '@/lib/db';
import { Icon } from '../../ui';
import { MTopbar } from '../../MTopbar';
import { updateShopAction } from '../../../actions';
import GeoPicker from '../GeoPicker';
import { PhotoManager } from '../../PhotoUpload';
import { HoursEditor } from '../../HoursEditor';
import { SOCIAL_CHANNELS } from '@/lib/socials';
import { facetsFor, facetLabel } from '@/lib/facets';
import { detailFields } from '@/lib/placedetails';
import { parsePoint } from '@/lib/geo';

export const dynamic = 'force-dynamic';

// Edit form for the shop info — kept separate from the read-only /merchant/shop view so opening the
// page doesn't drop the owner straight into editable fields. updateShopAction redirects back to the view.
export default async function ShopEdit({ searchParams }: { searchParams: { new?: string; error?: string } }) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  const [p] = await q<any>(
    `SELECT name_i18n, description_i18n, address_i18n, image_urls, opening_hours, phone, line_id, website, socials,
            category::text category, subcategory, amenities, details, sells_products, offers_stay, manages_stay, room_mode, geo::text geo
       FROM places WHERE id=$1`, [acc.place_id]);
  const socials: Record<string, string> = p?.socials || {};
  const details: Record<string, string> = p?.details || {};
  const dfields = detailFields(p?.category);   // เที่ยว/กิจกรรม get extra info fields; eat/stay get none
  // place facilities/highlights (places.amenities token[]): offer the facets relevant to this place's
  // category, plus any tokens already set (so an existing/legacy token is never silently dropped on save).
  const curAmen: string[] = p?.amenities || [];
  const amenShown = [...new Set([...facetsFor(p?.category, p?.subcategory), ...curAmen])];
  const pt = parsePoint(p?.geo);
  // word adapts to the account's reality: a single-location owner sees "ร้าน"; a multi-branch owner sees
  // "สาขา" for the location being edited (the business itself stays "ร้าน") — one vocabulary, never mixed.
  const noun = (acc.branch_count ?? 1) > 1 ? 'สาขา' : 'ร้าน';
  return (
    <>
      <MTopbar back="/merchant/shop" backLabel={`ข้อมูล${noun}`} title={`แก้ไขข้อมูล${noun}`} />
      {(acc.branch_count ?? 1) > 1 && <p className="note" style={{ margin: '-.3rem 0 .9rem' }}><Icon n="store" size={13} /> กำลังแก้สาขา <b>{i18n(acc.place_name) || acc.display_name || 'สาขานี้'}</b> · ร้าน {i18n(acc.brand_name) || '—'}</p>}
      {searchParams?.new && <div className="banner-ok">✓ เพิ่ม{noun}แล้ว — กรอก <b>ที่อยู่ · รูป{noun} · เวลาเปิด-ปิด</b> ให้ครบ เพื่อให้ลูกค้าเห็นข้อมูลเต็ม</div>}
      {searchParams?.error === 'upload' && <div className="banner-err">อัปโหลดรูปบางรูปไม่สำเร็จ — ลองใหม่ (JPG/PNG/WEBP)</div>}
      <form className="form mform" action={updateShopAction} encType="multipart/form-data">
        <section className="fsec">
          <div className="fsec-h"><span className="fsec-ic"><Icon n="store" size={15} /></span> ข้อมูล{noun}</div>
          <div className="field"><label>ชื่อ{noun}</label><input name="name_th" defaultValue={i18n(p?.name_i18n)} /></div>
          <div className="field"><label>รายละเอียด{noun}</label><textarea name="desc_th" defaultValue={i18n(p?.description_i18n)} style={{ minHeight: 84 }} placeholder={`เล่าเรื่อง${noun} จุดเด่น เมนู/สินค้าแนะนำ`} /></div>
        </section>

        <section className="fsec">
          <div className="fsec-h"><span className="fsec-ic"><Icon n="image" size={15} /></span> รูป{noun} <span className="lbl-opt">(ลูกค้าเห็นเป็นแกลเลอรี)</span></div>
          <PhotoManager existing={p?.image_urls} label={`แตะเพื่อเพิ่มรูป${noun} หรือลากมาวาง`} />
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
          <div className="fsub">โซเชียล <span className="lbl-opt">(ใส่เท่าที่มี — วางลิงก์หรือ @ชื่อก็ได้)</span></div>
          <div className="fgrid">
            {SOCIAL_CHANNELS.map((ch) => (
              <div className="field" key={ch.key}><label>{ch.label}</label><input name={'s_' + ch.key} defaultValue={socials[ch.key] || ''} placeholder={ch.ph} /></div>
            ))}
          </div>
        </section>

        <section className="fsec">
          <div className="fsec-h"><span className="fsec-ic"><Icon n="clock" size={15} /></span> เวลาเปิด-ปิด <span className="lbl-opt">(ลูกค้าเห็น “เปิดอยู่/ปิด”)</span></div>
          <HoursEditor value={p?.opening_hours} />
          <p className="fhint">ติ๊กวันที่เปิด แล้วใส่เวลา — ลูกค้าจะเห็นสถานะ “เปิดอยู่ตอนนี้/ปิด” อัตโนมัติตามเวลาเชียงใหม่</p>
        </section>

        {amenShown.length > 0 && (
          <section className="fsec">
            <div className="fsec-h"><span className="fsec-ic"><Icon n="spark" size={15} /></span> สิ่งอำนวยความสะดวก &amp; จุดเด่น <span className="lbl-opt">(ลูกค้าใช้กรองค้นหา)</span></div>
            <div className="checkrow">
              {amenShown.map((t) => (
                <label key={t} className="cbox"><input type="checkbox" name="amenity" value={t} defaultChecked={curAmen.includes(t)} /> {facetLabel(t)}</label>
              ))}
            </div>
            <p className="fhint">ติ๊กสิ่งที่{noun}มี — แสดงเป็นชิปในหน้าของลูกค้า และช่วยให้ลูกค้ากรองหา{noun}เจอง่ายขึ้น</p>
          </section>
        )}

        {dfields.length > 0 && (
          <section className="fsec">
            <div className="fsec-h"><span className="fsec-ic"><Icon n="feed" size={15} /></span> ข้อมูลเพิ่มเติม <span className="lbl-opt">(ลูกค้าเห็น)</span></div>
            {dfields.map((f) => (
              <div className="field" key={f.key}><label>{f.label}</label><textarea name={'detail_' + f.key} defaultValue={details[f.key] || ''} placeholder={f.ph} style={{ minHeight: 58 }} /></div>
            ))}
            <p className="fhint">ช่วยให้ลูกค้าวางแผนมาง่ายขึ้น — เว้นว่างได้ถ้ายังไม่มี</p>
          </section>
        )}

        <section className="fsec">
          <div className="fsec-h"><span className="fsec-ic"><Icon n="tag" size={15} /></span> {noun}นี้มีอะไรบ้าง</div>
          <label className="check"><input type="checkbox" name="sells_products" defaultChecked={!!p?.sells_products} /> ร้านมีสินค้าขาย — เปิดเมนู “สินค้า” + แสดงแถบสินค้าให้ลูกค้า</label>
          <label className="check" style={{ marginTop: 8 }}><input type="checkbox" name="offers_stay" defaultChecked={!!p?.offers_stay} /> มีห้องพักให้เช่า — เปิดเมนู “ห้องพัก” + ขึ้นในหน้า “ที่พัก” ของลูกค้า</label>
          {/* room-management + room-mode are details of "มีห้องพัก" — nested under it, auto-hidden when offers_stay is off (pure CSS :has, no JS). manages_stay value persists either way so a manage-only owner is never silently wiped. */}
          <div className="staygrp">
            <label className="check"><input type="checkbox" name="manages_stay" defaultChecked={!!p?.manages_stay} /> ใช้ระบบจัดการห้อง — เปิดเมนู “ผังห้อง” (วางห้องจริง · คุมห้องว่าง · ปฏิทินรายวัน)</label>
            <p className="fhint">“ผังห้อง” ใช้บริหารห้องภายใน (เช็คอิน · ห้องว่าง · ปฏิทินรายวัน) — ไม่บังคับว่าต้องเผยแพร่ให้ลูกค้า</p>
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
          </div>
          <p className="fhint">ปิดเมนูไหน เมนูนั้นและรายการที่เผยแพร่ไว้จะถูกซ่อนจากลูกค้า</p>
        </section>

        <section className="fsec">
          <div className="fsec-h"><span className="fsec-ic"><Icon n="pin" size={15} /></span> ที่อยู่ & ตำแหน่งบนแผนที่</div>
          <div className="field"><label>ที่อยู่ <span className="lbl-opt">(ลูกค้าเห็น)</span></label><input name="address_th" defaultValue={i18n(p?.address_i18n)} placeholder="เช่น 12/3 ถ.นิมมานเหมินท์ ซ.9 ต.สุเทพ อ.เมือง เชียงใหม่ 50200" /></div>
          <GeoPicker lat0={pt?.lat ?? null} lng0={pt?.lng ?? null} />
        </section>

        <button className="btn btn-primary mform-save" type="submit">บันทึก</button>
      </form>
      <p className="note">ในเวอร์ชันนี้การแก้ข้อมูลมีผลทันที — โปรดักชันจะให้ทีมงานตรวจก่อนเผยแพร่ (ข้อมูล LINE/เบอร์โทรคือช่องทางที่ลูกค้าใช้ติดต่อสั่งซื้อ)</p>
    </>
  );
}
