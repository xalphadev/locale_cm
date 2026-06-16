'use client';
import { useState } from 'react';
import { Icon } from '../ui';
import { BILLS, AMEN } from './constants';

// local pure i18n (avoid importing the server-only @/lib/db into this client component)
const th = (j: any) => (j ? j.th || j.en || (Object.values(j)[0] as string) || '' : '');

/** Add/edit room form — `action` is createStayUnitAction or updateStayUnitAction.bind(id).
 *  Client component so the availability field + price/contract labels follow the chosen rental mode. */
export function RoomForm({ action, u, submitLabel }: { action: (fd: FormData) => void; u?: any; submitLabel: string }) {
  const [mode, setMode] = useState<string>(u?.rental_mode || 'monthly');
  const monthly = mode === 'monthly';
  const bills: string[] = u?.bills_included ?? [];
  const amen: string[] = u?.unit_amenities ?? [];
  const baht = (m: any) => (m != null ? Math.round(m / 100) : '');
  return (
    <form className="form mform" action={action}>
      <section className="fsec">
        <div className="fsec-h"><span className="fsec-ic"><Icon n="bed" size={15} /></span> ข้อมูลห้อง</div>
        <div className="field"><label>ชื่อห้อง *</label><input name="name_th" required defaultValue={u ? th(u.name_i18n) : ''} placeholder="เช่น ห้องสตูดิโอ แอร์ / ห้องเตียงคู่ วิวสวน" /></div>
        <div className="fgrid">
          <div className="field"><label>ประเภทเช่า</label>
            <select name="rental_mode" value={mode} onChange={(e) => setMode(e.target.value)}><option value="monthly">รายเดือน</option><option value="daily">รายวัน</option></select></div>
          <div className="field"><label>ราคา (บาท/{monthly ? 'เดือน' : 'คืน'})</label><input name="price" type="number" min="0" defaultValue={baht(u?.price_minor)} placeholder="5500" /></div>
          <div className="field"><label>รับกี่ท่าน</label><input name="capacity" type="number" min="1" defaultValue={u?.capacity ?? ''} placeholder="2" /></div>
          <div className="field"><label>ขนาด (ตร.ม.)</label><input name="room_size_sqm" type="number" min="0" defaultValue={u?.room_size_sqm ?? ''} placeholder="24" /></div>
        </div>
      </section>

      <section className="fsec">
        <div className="fsec-h"><span className="fsec-ic"><Icon n="check" size={15} /></span> สถานะห้องว่าง</div>
        {monthly ? (
          <div className="field"><label>ตอนนี้ว่างกี่ห้อง</label><input name="available_units" type="number" min="0" defaultValue={u?.available_units ?? 1} />
            <p className="fhint">ลูกค้าเห็นป้าย “ว่าง N ห้อง” — ปรับเร็วๆ ได้ที่หน้ารายละเอียดห้องด้วยปุ่ม +/−</p></div>
        ) : (
          <div className="field"><label>สถานะวันนี้</label><select name="daily_status" defaultValue={u?.daily_status || 'vacant'}><option value="vacant">ว่างวันนี้</option><option value="ask">สอบถามว่าง</option><option value="full">เต็มวันนี้</option></select>
            <p className="fhint">ลูกค้าเห็นสถานะว่าง/เต็มของวันนี้ — อัปเดตได้ที่หน้ารายละเอียดห้อง</p></div>
        )}
        {/* preserve the other mode's value when editing, without showing a confusing 2nd field */}
        {monthly
          ? <input type="hidden" name="daily_status" value={u?.daily_status || 'vacant'} />
          : <input type="hidden" name="available_units" value={u?.available_units ?? 1} />}
      </section>

      <section className="fsec">
        <div className="fsec-h"><span className="fsec-ic"><Icon n="wallet" size={15} /></span> ค่าใช้จ่าย & สัญญา</div>
        <div className="fgrid">
          <div className="field"><label>มัดจำ (บาท)</label><input name="deposit" type="number" min="0" defaultValue={baht(u?.deposit_minor)} placeholder="5500" /></div>
          <div className="field"><label>สัญญาขั้นต่ำ ({monthly ? 'เดือน' : 'คืน'})</label><input name="min_stay" type="number" min="0" defaultValue={u?.min_stay ?? ''} placeholder={monthly ? '3' : '1'} /></div>
          <div className="field"><label>เฟอร์นิเจอร์</label><select name="furnished" defaultValue={u?.furnished || ''}><option value="">—</option><option value="furnished">เฟอร์ครบ</option><option value="partial">บางส่วน</option><option value="unfurnished">ไม่มี</option></select></div>
        </div>
        {monthly && (
          <div className="field"><label>รวมค่าใช้จ่ายในค่าเช่า</label>
            <div className="checkrow">{BILLS.map(([k, l]) => <label key={k} className="cbox"><input type="checkbox" name="bills" value={k} defaultChecked={bills.includes(k)} /> {l}</label>)}</div></div>
        )}
      </section>

      <section className="fsec">
        <div className="fsec-h"><span className="fsec-ic"><Icon n="sofa" size={15} /></span> สิ่งอำนวยความสะดวก</div>
        <div className="checkrow">{AMEN.map(([k, l]) => <label key={k} className="cbox"><input type="checkbox" name="amenity" value={k} defaultChecked={amen.includes(k)} /> {l}</label>)}</div>
      </section>

      <section className="fsec">
        <div className="fsec-h"><span className="fsec-ic"><Icon n="image" size={15} /></span> รูปห้อง</div>
        <div className="field">
          <div className="filewrap"><span className="fw-ic"><Icon n="image" size={18} /></span><input type="file" name="photos" accept="image/*" multiple /></div>
          <p className="fhint">เลือกได้หลายรูป · JPG/PNG/WEBP ไม่เกิน 6MB ต่อรูป{u && u.image_urls?.length ? ` · มีอยู่แล้ว ${u.image_urls.length} รูป (อัปโหลดใหม่เพื่อแทนที่)` : ''}</p>
        </div>
        <div className="field"><label>หรือวางลิงก์รูป (ทีละบรรทัด)</label><textarea name="image_urls" placeholder="https://...jpg" style={{ minHeight: 44 }} /></div>
      </section>

      <button className="btn btn-primary mform-save" type="submit">{submitLabel}</button>
    </form>
  );
}
