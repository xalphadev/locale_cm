'use client';
import { useState } from 'react';
import { Icon } from '../ui';

// "รูปแบบห้อง vs ห้องจริง" explained ONCE, on demand — a centered modal (readable, never the cramped
// anchored tooltip). Progressive disclosure so the concept isn't a permanent wall of text above the list.
export function HubInfo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="hubinfo" aria-label="รูปแบบห้อง คืออะไร" onClick={() => setOpen(true)}>?</button>
      {open && (
        <div className="hubpop-scrim" onClick={() => setOpen(false)}>
          <div className="hubpop" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="hubpop-h">
              <span>รูปแบบห้อง กับ ห้องจริง</span>
              <button type="button" className="hubpop-x" onClick={() => setOpen(false)} aria-label="ปิด"><Icon n="x" size={16} /></button>
            </div>
            <div className="hubpop-row">
              <span className="hubpop-k">รูปแบบห้อง</span>
              <span className="hubpop-v">แบบ &amp; ราคาที่ลูกค้าเห็น — เช่น สตูดิโอ, เตียงรวม</span>
            </div>
            <div className="hubpop-row">
              <span className="hubpop-k">ห้องจริง</span>
              <span className="hubpop-v">ห้องแต่ละห้อง (101, 102…) ที่คุณจัดในแท็บ “ผังห้อง”</span>
            </div>
            <p className="hubpop-foot"><Icon n="check" size={13} /> ใส่ห้องจริงในผัง แล้วระบบนับห้องว่างให้อัตโนมัติ</p>
          </div>
        </div>
      )}
    </>
  );
}
