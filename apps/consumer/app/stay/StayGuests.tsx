'use client';
import { useEffect, useState } from 'react';
import { Icon } from '../icons';

// OTA-style guests (+ rooms) selector. Like DateRangePicker, it's a sheet that writes hidden inputs into
// the SURROUNDING GET form — it never navigates itself. NO money/booking: guests = a capacity FIT filter
// (su.capacity>=N per room type), rooms = a free-room COUNT filter (daily+dates only). Neutral default 1
// writes no param, so a fresh /stay never silently hides single rooms.
export default function StayGuests({ capName = 'cap', roomsName = 'rooms', initialCap = 1, initialRooms = 1, showRooms = false }:
  { capName?: string; roomsName?: string; initialCap?: number; initialRooms?: number; showRooms?: boolean }) {
  const [open, setOpen] = useState(false);
  const [guests, setGuests] = useState(() => Math.min(10, Math.max(1, initialCap || 1)));
  const [rooms, setRooms] = useState(() => Math.min(8, Math.max(1, initialRooms || 1)));

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  return (
    <>
      <div className="guestrow">
        <button type="button" className="gfield" onClick={() => setOpen(true)}>
          <Icon n="users" size={17} />
          <span className="gf-v">{guests} ท่าน</span>
        </button>
        {showRooms && (
          <button type="button" className="gfield" onClick={() => setOpen(true)}>
            <Icon n="bed" size={17} />
            <span className="gf-v">{rooms} ห้อง</span>
          </button>
        )}
      </div>

      <input type="hidden" name={capName} value={guests > 1 ? String(guests) : ''} />
      {showRooms && <input type="hidden" name={roomsName} value={rooms > 1 ? String(rooms) : ''} />}

      {open && (
        <div className="sheet-scrim" onClick={() => setOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-grab" />
            <div className="sheet-head"><b>ผู้เข้าพัก</b><button type="button" className="sheet-x" onClick={() => setOpen(false)} aria-label="ปิด"><Icon n="x" size={20} /></button></div>
            <div className="sheet-body">
              <div className="stepper">
                <div className="stepper-tx"><b>ผู้เข้าพัก</b><span>จำนวนท่านที่เข้าพัก</span></div>
                <div className="stepper-ctl">
                  <button type="button" className="stepbtn" disabled={guests <= 1} onClick={() => setGuests((n) => Math.max(1, n - 1))} aria-label="ลดผู้เข้าพัก">−</button>
                  <span className="stepval">{guests}</span>
                  <button type="button" className="stepbtn" disabled={guests >= 10} onClick={() => setGuests((n) => Math.min(10, n + 1))} aria-label="เพิ่มผู้เข้าพัก">+</button>
                </div>
              </div>
              {showRooms && (
                <div className="stepper">
                  <div className="stepper-tx"><b>จำนวนห้อง</b><span>ต้องการห้องว่างกี่ห้องในช่วงนี้</span></div>
                  <div className="stepper-ctl">
                    <button type="button" className="stepbtn" disabled={rooms <= 1} onClick={() => setRooms((n) => Math.max(1, n - 1))} aria-label="ลดห้อง">−</button>
                    <span className="stepval">{rooms}</span>
                    <button type="button" className="stepbtn" disabled={rooms >= 8} onClick={() => setRooms((n) => Math.min(8, n + 1))} aria-label="เพิ่มห้อง">+</button>
                  </div>
                </div>
              )}
            </div>
            <div className="sheet-foot">
              <button type="button" className="sheet-apply" onClick={() => setOpen(false)}>ใช้</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
