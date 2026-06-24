'use client';
import { useState } from 'react';
import { createBookingAction } from '../../../actions';

// Front-desk "add a booking" form (walk-in / phone). The date fields adapt to the chosen type's mode
// (daily → check-out date; monthly → number of months). Room is auto-assigned unless picked. The action
// writes the block + a converted walk-in booking; the GiST EXCLUDE rejects a double-book (?error=full).
export function WalkInForm({ types, rooms }: {
  types: { id: string; name: string; monthly: boolean }[];
  rooms: { id: string; code: string; unitId: string }[];
}) {
  const [typeId, setTypeId] = useState(types[0]?.id || '');
  const sel = types.find((t) => t.id === typeId);
  const monthly = !!sel?.monthly;
  const typeRooms = rooms.filter((r) => r.unitId === typeId);

  return (
    <form action={createBookingAction} className="winform">
      <div className="field">
        <label>ประเภทห้อง</label>
        <select name="stay_unit_id" value={typeId} onChange={(e) => setTypeId(e.target.value)} required>
          {types.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.monthly ? 'รายเดือน' : 'รายวัน'})</option>)}
        </select>
      </div>
      <div className="field">
        <label>ห้อง</label>
        <select name="room_id" key={typeId}>
          <option value="">อัตโนมัติ (ห้องว่างห้องแรก)</option>
          {typeRooms.map((r) => <option key={r.id} value={r.id}>ห้อง {r.code}</option>)}
        </select>
      </div>
      <div className="field">
        <label>{monthly ? 'วันเข้าพัก' : 'เช็คอิน'}</label>
        <input type="date" name="start_date" required />
      </div>
      {monthly ? (
        <div className="field"><label>จำนวนเดือน</label><input type="number" name="months" min="1" max="36" defaultValue="1" required /></div>
      ) : (
        <div className="field"><label>เช็คเอาท์</label><input type="date" name="end_date" required /></div>
      )}
      <div className="field"><label>ชื่อผู้จอง</label><input name="guest_name" maxLength={80} placeholder="ชื่อ-นามสกุล (ถ้ามี)" /></div>
      <div className="field"><label>เบอร์โทร</label><input name="guest_phone" maxLength={40} inputMode="tel" placeholder="08x-xxx-xxxx" /></div>
      <div className="field"><label>จำนวนคน</label><input type="number" name="party_size" min="1" max="50" placeholder="เช่น 2" /></div>
      <div className="field"><label>ยอดที่รับชำระ (บาท)</label><input type="number" name="amount" min="0" step="1" inputMode="numeric" placeholder="ใส่ถ้ารับเงินแล้ว — จะนับเป็นรายได้" /></div>
      <button type="submit" className="btn btn-primary winform-submit">บันทึกการจอง</button>
    </form>
  );
}
