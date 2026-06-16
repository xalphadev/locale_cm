import { i18n } from '@/lib/db';

export const BILLS: [string, string][] = [['water', 'น้ำ'], ['electricity', 'ไฟ'], ['wifi', 'เน็ต'], ['common_fee', 'ส่วนกลาง']];
export const AMEN: [string, string][] = [['aircon', 'แอร์'], ['private_bath', 'ห้องน้ำในตัว'], ['balcony', 'ระเบียง'], ['kitchen', 'ครัว'], ['washing_machine', 'เครื่องซักผ้า'], ['parking', 'ที่จอดรถ'], ['pets_ok', 'เลี้ยงสัตว์ได้'], ['fiber_wifi', 'เน็ตไฟเบอร์']];
export const FURNISHED_TH: Record<string, string> = { furnished: 'เฟอร์ครบ', partial: 'เฟอร์บางส่วน', unfurnished: 'ไม่มีเฟอร์' };

/** Add/edit room form — `action` is createStayUnitAction or updateStayUnitAction.bind(id). */
export function RoomForm({ action, u, submitLabel }: { action: (fd: FormData) => void; u?: any; submitLabel: string }) {
  const bills: string[] = u?.bills_included ?? [];
  const amen: string[] = u?.unit_amenities ?? [];
  const baht = (m: any) => (m != null ? Math.round(m / 100) : '');
  return (
    <form className="form mform" action={action}>
      <div className="field"><label>ชื่อห้อง *</label><input name="name_th" required defaultValue={u ? i18n(u.name_i18n) : ''} placeholder="เช่น ห้องสตูดิโอ แอร์ / ห้องเตียงคู่ วิวสวน" /></div>
      <div className="grid3">
        <div className="field"><label>ประเภทเช่า</label><select name="rental_mode" defaultValue={u?.rental_mode || 'monthly'}><option value="monthly">รายเดือน</option><option value="daily">รายวัน</option></select></div>
        <div className="field"><label>ราคา (บาท)</label><input name="price" type="number" min="0" defaultValue={baht(u?.price_minor)} placeholder="5500" /></div>
        <div className="field"><label>รับกี่ท่าน</label><input name="capacity" type="number" min="1" defaultValue={u?.capacity ?? ''} placeholder="2" /></div>
      </div>
      <div className="grid3">
        <div className="field"><label>รายเดือน: ว่างกี่ห้อง</label><input name="available_units" type="number" min="0" defaultValue={u?.available_units ?? 1} /></div>
        <div className="field"><label>รายวัน: สถานะวันนี้</label><select name="daily_status" defaultValue={u?.daily_status || 'vacant'}><option value="vacant">ว่างวันนี้</option><option value="ask">สอบถามว่าง</option><option value="full">เต็มวันนี้</option></select></div>
        <div className="field"><label>เฟอร์นิเจอร์</label><select name="furnished" defaultValue={u?.furnished || ''}><option value="">—</option><option value="furnished">เฟอร์ครบ</option><option value="partial">บางส่วน</option><option value="unfurnished">ไม่มี</option></select></div>
      </div>
      <div className="grid3">
        <div className="field"><label>มัดจำ (บาท)</label><input name="deposit" type="number" min="0" defaultValue={baht(u?.deposit_minor)} placeholder="5500" /></div>
        <div className="field"><label>สัญญาขั้นต่ำ (เดือน/คืน)</label><input name="min_stay" type="number" min="0" defaultValue={u?.min_stay ?? ''} placeholder="3" /></div>
        <div className="field"><label>ขนาด (ตร.ม.)</label><input name="room_size_sqm" type="number" min="0" defaultValue={u?.room_size_sqm ?? ''} placeholder="24" /></div>
      </div>
      <div className="field"><label>รวมค่าใช้จ่าย (รายเดือน)</label>
        <div className="checkrow">{BILLS.map(([k, l]) => <label key={k} className="cbox"><input type="checkbox" name="bills" value={k} defaultChecked={bills.includes(k)} /> {l}</label>)}</div></div>
      <div className="field"><label>สิ่งอำนวยความสะดวก</label>
        <div className="checkrow">{AMEN.map(([k, l]) => <label key={k} className="cbox"><input type="checkbox" name="amenity" value={k} defaultChecked={amen.includes(k)} /> {l}</label>)}</div></div>
      <div className="field"><label>รูปห้อง (อัปโหลดได้หลายรูป)</label><input type="file" name="photos" accept="image/*" multiple /></div>
      <div className="field"><label>หรือวางลิงก์รูป (ทีละบรรทัด)</label><textarea name="image_urls" placeholder="https://...jpg" style={{ minHeight: 44 }} /></div>
      {u && u.image_urls?.length ? <p className="note">มีรูปอยู่แล้ว {u.image_urls.length} รูป — อัปโหลด/วางลิงก์ใหม่เพื่อแทนที่</p> : null}
      <button className="btn btn-primary mform-save" type="submit">{submitLabel}</button>
    </form>
  );
}
