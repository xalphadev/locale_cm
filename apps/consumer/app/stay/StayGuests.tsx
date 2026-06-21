'use client';
import { useEffect, useState } from 'react';
import { Icon } from '../icons';

// OTA-style occupancy selector — ONE field (rooms · adults · children) opening a stepper sheet that writes
// hidden inputs into the surrounding GET form (like DateRangePicker; it never navigates itself). NO money /
// age pricing: adults + children = total guests for the capacity FIT filter; rooms = free-room COUNT filter
// (daily + dates only). Neutral default (1 adult) writes no param.
export default function StayGuests({
  adultsName = 'ad', childrenName = 'ch', roomsName = 'rooms',
  initialAdults = 1, initialChildren = 0, initialRooms = 1, showRooms = false, roomsLive = true,
}: {
  adultsName?: string; childrenName?: string; roomsName?: string;
  initialAdults?: number; initialChildren?: number; initialRooms?: number; showRooms?: boolean; roomsLive?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [adults, setAdults] = useState(() => Math.min(10, Math.max(1, initialAdults || 1)));
  const [children, setChildren] = useState(() => Math.min(6, Math.max(0, initialChildren || 0)));
  const [rooms, setRooms] = useState(() => Math.min(8, Math.max(1, initialRooms || 1)));

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const parts: string[] = [];
  if (showRooms) parts.push(`${rooms} ห้อง`);
  parts.push(`ผู้ใหญ่ ${adults} คน`);
  if (children > 0) parts.push(`เด็ก ${children} คน`);

  return (
    <>
      <button type="button" className="gfield" onClick={() => setOpen(true)}>
        <span className="gf-ic"><Icon n="users" size={17} /></span>
        <span className="gf-cell"><span className="gf-l">ผู้เข้าพัก</span><span className="gf-v">{parts.join(' · ')}</span></span>
        <Icon n="chevR" size={16} />
      </button>

      {adults > 1 && <input type="hidden" name={adultsName} value={String(adults)} />}
      {children > 0 && <input type="hidden" name={childrenName} value={String(children)} />}
      {showRooms && rooms > 1 && <input type="hidden" name={roomsName} value={String(rooms)} />}

      {open && (
        <div className="sheet-scrim" onClick={() => setOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-grab" />
            <div className="sheet-head"><b>ผู้เข้าพัก</b><button type="button" className="sheet-x" onClick={() => setOpen(false)} aria-label="ปิด"><Icon n="x" size={20} /></button></div>
            <div className="sheet-body">
              {showRooms && (
                <div className="stepper">
                  <div className="stepper-tx"><b>ห้อง</b><span>{roomsLive ? 'ต้องการห้องว่างกี่ห้องในช่วงนี้' : 'เลือกวันเข้าพักก่อน เพื่อกรองห้องว่าง'}</span></div>
                  <div className="stepper-ctl">
                    <button type="button" className="stepbtn" disabled={rooms <= 1} onClick={() => setRooms((n) => Math.max(1, n - 1))} aria-label="ลดห้อง">−</button>
                    <span className="stepval">{rooms}</span>
                    <button type="button" className="stepbtn" disabled={rooms >= 8} onClick={() => setRooms((n) => Math.min(8, n + 1))} aria-label="เพิ่มห้อง">+</button>
                  </div>
                </div>
              )}
              <div className="stepper">
                <div className="stepper-tx"><b>ผู้ใหญ่</b><span>อายุ 13 ปีขึ้นไป</span></div>
                <div className="stepper-ctl">
                  <button type="button" className="stepbtn" disabled={adults <= 1} onClick={() => setAdults((n) => Math.max(1, n - 1))} aria-label="ลดผู้ใหญ่">−</button>
                  <span className="stepval">{adults}</span>
                  <button type="button" className="stepbtn" disabled={adults >= 10} onClick={() => setAdults((n) => Math.min(10, n + 1))} aria-label="เพิ่มผู้ใหญ่">+</button>
                </div>
              </div>
              <div className="stepper">
                <div className="stepper-tx"><b>เด็ก</b><span>อายุ 0–12 ปี (นับเป็นผู้เข้าพัก)</span></div>
                <div className="stepper-ctl">
                  <button type="button" className="stepbtn" disabled={children <= 0} onClick={() => setChildren((n) => Math.max(0, n - 1))} aria-label="ลดเด็ก">−</button>
                  <span className="stepval">{children}</span>
                  <button type="button" className="stepbtn" disabled={children >= 6} onClick={() => setChildren((n) => Math.min(6, n + 1))} aria-label="เพิ่มเด็ก">+</button>
                </div>
              </div>
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
