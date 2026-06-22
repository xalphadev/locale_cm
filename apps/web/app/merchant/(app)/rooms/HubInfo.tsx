'use client';
import { useState } from 'react';

// On-demand "what is รูปแบบห้อง vs ห้องจริง" — progressive disclosure so the concept is explained ONCE,
// only when summoned, instead of three permanent paragraphs/banners above the list (rooms-hub redesign).
export function HubInfo() {
  const [open, setOpen] = useState(false);
  return (
    <span className="hubinfo-wrap">
      <button type="button" className="hubinfo" aria-label="รูปแบบห้อง คืออะไร" aria-expanded={open} onClick={() => setOpen((v) => !v)}>?</button>
      {open && (
        <div className="hubpop" role="note">
          {'รูปแบบห้อง = แบบ & ราคาที่ลูกค้าเห็น (เช่น สตูดิโอ, เตียงรวม)\nห้องจริง = ห้องแต่ละห้อง (101, 102…) ที่คุณจัดในแท็บ “ผังห้อง”\nใส่ห้องจริงในผัง แล้วระบบจะนับห้องว่างให้อัตโนมัติ'}
        </div>
      )}
    </span>
  );
}
