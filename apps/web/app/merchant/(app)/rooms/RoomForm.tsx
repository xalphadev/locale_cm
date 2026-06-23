'use client';
import { useState } from 'react';
import { Icon } from '../ui';
import { PhotoManager } from '../PhotoUpload';

type AmenOpt = { key: string; label: string };   // amenity catalog options (passed from the server page)

// local pure i18n (avoid importing the server-only @/lib/db into this client component)
const th = (j: any) => (j ? j.th || j.en || (Object.values(j)[0] as string) || '' : '');


/** Add/edit room form — `action` is createStayUnitAction or updateStayUnitAction.bind(id).
 *  Client component so the availability field + price/contract labels follow the chosen rental mode. */
export function RoomForm({ action, u, submitLabel, managed, noun = 'ห้อง', stayKind, amenOpts, buildOpts, billOpts }: { action: (fd: FormData) => void; u?: any; submitLabel: string; managed?: boolean; noun?: string; stayKind?: string; amenOpts: AmenOpt[]; buildOpts: AmenOpt[]; billOpts: AmenOpt[] }) {
  const [mode, setMode] = useState<string>(u?.rental_mode || 'monthly');
  const monthly = mode === 'monthly';
  const bills: string[] = u?.bills_included ?? [];
  const amen: string[] = u?.unit_amenities ?? [];
  const baht = (m: any) => (m != null ? Math.round(m / 100) : '');
  // per-type fields (audit wrxdo62qb): each accommodation kind surfaces the subset it needs
  const kind = stayKind || '';
  const wantRooms = ['apartment', 'condo', 'house', 'mansion'].includes(kind);   // bedrooms/bathrooms
  const wantGender = ['dorm', 'hostel'].includes(kind);
  const wantBreakfast = ['hotel', 'guesthouse', 'homestay'].includes(kind);
  const wantCancel = ['hotel', 'guesthouse', 'homestay', 'hostel'].includes(kind);
  const wantHost = ['homestay', 'guesthouse'].includes(kind);
  const wantBuilding = ['dorm', 'hostel', 'apartment', 'condo', 'mansion', 'hotel', 'guesthouse'].includes(kind);   // common/shared facilities
  const at = u?.attrs || {};
  return (
    <form className="form mform" action={action}>
      <section className="fsec">
        <div className="fsec-h"><span className="fsec-ic"><Icon n="bed" size={15} /></span> ข้อมูลห้อง</div>
        <div className="field"><label>ชื่อ{noun} <span className="req">*</span></label><input name="name_th" required defaultValue={u ? th(u.name_i18n) : ''} placeholder="เช่น ห้องสตูดิโอ แอร์ / ห้องเตียงคู่ วิวสวน" /></div>
        <div className="field"><label>รายละเอียด{noun} <span className="lbl-opt">(ลูกค้าเห็น)</span></label>
          <textarea name="description_th" defaultValue={u ? th(u.description_i18n) : ''} placeholder="จุดเด่นที่ลูกค้าควรรู้ เช่น ห้องมุม วิวสวน ระเบียงกว้าง ใกล้ BTS เดิน 5 นาที เฟอร์ครบพร้อมเข้าอยู่" style={{ minHeight: 70 }} />
          <p className="fhint">เว้นว่างได้ — ถ้าไม่กรอก ลูกค้าจะเห็นคำอธิบายรวมของร้านแทน</p></div>
        <div className="fgrid">
          <div className="field"><label>ประเภทเช่า</label>
            <select name="rental_mode" value={mode} onChange={(e) => setMode(e.target.value)}><option value="monthly">รายเดือน</option><option value="daily">รายวัน</option></select></div>
          <div className="field"><label>ราคา (บาท/{monthly ? 'เดือน' : 'คืน'})</label><input name="price" type="number" min="0" defaultValue={baht(u?.price_minor)} placeholder="5500" />
            <p className="fhint">ไม่กรอก = ลูกค้าเห็น “สอบถามราคา”</p></div>
          <div className="field"><label>รับกี่ท่าน</label><input name="capacity" type="number" min="1" max="50" defaultValue={u?.capacity ?? ''} placeholder="2" /></div>
          <div className="field"><label>ขนาด (ตร.ม.)</label><input name="room_size_sqm" type="number" min="0" defaultValue={u?.room_size_sqm ?? ''} placeholder="24" /></div>
        </div>
      </section>

      <section className="fsec">
        <div className="fsec-h"><span className="fsec-ic"><Icon n="check" size={15} /></span> สถานะห้องว่าง</div>
        {managed ? (
          // managed listing → vacancy is counted from the ผังห้อง board, not typed here
          <p className="fhint" style={{ margin: 0 }}><Icon n="grid" size={13} /> ห้องนี้นับจำนวนว่างจาก “ผังห้อง” อัตโนมัติ — แก้ที่ผังห้อง (เพิ่ม/ย้ายห้อง · ตั้งมีผู้เช่า) ไม่ใช่ที่นี่</p>
        ) : monthly ? (
          <div className="fgrid">
            <div className="field"><label>ตอนนี้ว่างกี่ห้อง</label><input name="available_units" type="number" min="0" defaultValue={u?.available_units ?? 1} />
              <p className="fhint">ลูกค้าเห็นป้าย “ว่าง N ห้อง” — ปรับเร็วๆ ได้ที่หน้ารายละเอียดห้องด้วยปุ่ม +/−</p></div>
            <div className="field"><label>ว่างให้เข้าอยู่ตั้งแต่</label><input name="available_from" type="date" defaultValue={u?.available_from_ymd || ''} />
              <p className="fhint">เว้นว่าง = เข้าอยู่ได้ทันที</p></div>
          </div>
        ) : (
          <div className="field"><label>สถานะวันนี้</label><select name="daily_status" defaultValue={u?.daily_status || 'vacant'}><option value="vacant">ว่างวันนี้</option><option value="ask">สอบถามว่าง</option><option value="full">เต็มวันนี้</option></select>
            <p className="fhint">ลูกค้าเห็นสถานะว่าง/เต็มของวันนี้ — อัปเดตได้ที่หน้ารายละเอียดห้อง</p></div>
        )}
        {/* always submit both values; the action re-derives vacancy for managed listings (fn no-ops otherwise) */}
        {managed
          ? <><input type="hidden" name="available_units" value={u?.available_units ?? 1} /><input type="hidden" name="daily_status" value={u?.daily_status || 'vacant'} /></>
          : monthly
            ? <input type="hidden" name="daily_status" value={u?.daily_status || 'vacant'} />
            : <input type="hidden" name="available_units" value={u?.available_units ?? 1} />}
      </section>

      <section className="fsec">
        <div className="fsec-h"><span className="fsec-ic"><Icon n="wallet" size={15} /></span> ค่าใช้จ่าย & สัญญา</div>
        <div className="fgrid">
          {monthly && <div className="field"><label>มัดจำ (บาท)</label><input name="deposit" type="number" min="0" defaultValue={baht(u?.deposit_minor)} placeholder="5500" /></div>}
          <div className="field"><label>{monthly ? 'สัญญาขั้นต่ำ (เดือน)' : 'เข้าพักขั้นต่ำ (คืน)'}</label><input name="min_stay" type="number" min="0" defaultValue={u?.min_stay ?? ''} placeholder={monthly ? '3' : '1'} /></div>
          <div className="field"><label>เฟอร์นิเจอร์</label><select name="furnished" defaultValue={u?.furnished || ''}><option value="">—</option><option value="furnished">เฟอร์ครบ</option><option value="partial">บางส่วน</option><option value="unfurnished">ไม่มี</option></select></div>
        </div>
        {monthly && (
          <div className="field"><label>รวมค่าใช้จ่ายในค่าเช่า</label>
            <div className="checkrow">{billOpts.map((o) => <label key={o.key} className="cbox"><input type="checkbox" name="bills" value={o.key} defaultChecked={bills.includes(o.key)} /> {o.label}</label>)}</div></div>
        )}
      </section>

      {(wantRooms || wantGender || wantBuilding || !monthly) && (
        <section className="fsec">
          <div className="fsec-h"><span className="fsec-ic"><Icon n="bed" size={15} /></span> รายละเอียดตามประเภท</div>
          {wantRooms && (
            <div className="fgrid">
              <div className="field"><label>ห้องนอน</label><input name="bedrooms" type="number" min="0" defaultValue={u?.bedrooms ?? ''} placeholder="1" /></div>
              <div className="field"><label>ห้องน้ำ</label><input name="bathrooms" type="number" min="0" defaultValue={u?.bathrooms ?? ''} placeholder="1" /></div>
            </div>
          )}
          {wantGender && (
            <div className="field"><label>เพศผู้เข้าพัก</label>
              <select name="gender_policy" defaultValue={u?.gender_policy || ''}><option value="">ทุกเพศ</option><option value="female">หญิงล้วน</option><option value="male">ชายล้วน</option></select></div>
          )}
          {!monthly && (
            <div className="fgrid">
              <div className="field"><label>เวลาเช็คอิน</label><input name="check_in_time" type="time" defaultValue={u?.check_in_time || ''} /></div>
              <div className="field"><label>เวลาเช็คเอาท์</label><input name="check_out_time" type="time" defaultValue={u?.check_out_time || ''} /></div>
            </div>
          )}
          {!monthly && wantBreakfast && (
            <div className="field"><label className="cbox"><input type="checkbox" name="attr_breakfast" defaultChecked={!!at.breakfast} /> รวมอาหารเช้า</label></div>
          )}
          {!monthly && wantCancel && (
            <div className="field"><label>นโยบายยกเลิก</label>
              <select name="attr_cancellation" defaultValue={at.cancellation || ''}><option value="">—</option><option value="flexible">ยืดหยุ่น (ยกเลิกฟรี)</option><option value="moderate">ปานกลาง</option><option value="strict">เข้มงวด</option></select></div>
          )}
          {wantHost && (
            <div className="field"><label>ข้อมูลเจ้าบ้าน / บริการ</label><textarea name="attr_host" defaultValue={at.host || ''} placeholder="เช่น เจ้าบ้านพูดอังกฤษ มีรถรับส่ง ทำอาหารเช้าให้" style={{ minHeight: 44 }} /></div>
          )}
          {wantBuilding && (
            <div className="field"><label>สิ่งอำนวยความสะดวกส่วนกลาง / อาคาร</label>
              <div className="checkrow">{buildOpts.map((o) => <label key={o.key} className="cbox"><input type="checkbox" name="building" value={o.key} defaultChecked={(at.building || []).includes(o.key)} /> {o.label}</label>)}</div>
            </div>
          )}
        </section>
      )}

      <section className="fsec">
        <div className="fsec-h"><span className="fsec-ic"><Icon n="sofa" size={15} /></span> สิ่งอำนวยความสะดวก</div>
        <div className="checkrow">{amenOpts.map((o) => <label key={o.key} className="cbox"><input type="checkbox" name="amenity" value={o.key} defaultChecked={amen.includes(o.key)} /> {o.label}</label>)}</div>
      </section>

      <section className="fsec">
        <div className="fsec-h"><span className="fsec-ic"><Icon n="image" size={15} /></span> รูปห้อง</div>
        <PhotoManager existing={u?.image_urls} />
      </section>

      <button className="btn btn-primary mform-save" type="submit">{submitLabel}</button>
    </form>
  );
}
