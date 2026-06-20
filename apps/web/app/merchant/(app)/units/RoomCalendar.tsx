'use client';
import { useState } from 'react';
import { Icon } from '../ui';
import { addRoomBlockAction, cancelRoomBlockAction } from '../../actions';

// Per-room month calendar (daily rooms). VIEW = see which nights are free/booked; tap two free days to
// block a range (check-in → check-out, end exclusive → checkout night stays free), tap a booked day to
// see its note + remove. Reuses the existing addRoomBlockAction / cancelRoomBlockAction (no new action,
// no schema). All date math is YYYY-MM-DD string comparison (no JS UTC drift).
type Blk = { id: string; start_date: string; end_date: string | null; note: string | null; block_kind: string };

const TH_MONTH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const DOW = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const KIND: Record<string, string> = { stay: '#3b82f6', tenancy: '#3b82f6', maintenance: '#9aa0a6' };

export default function RoomCalendar({ roomId, blocks, months = 3 }: { roomId: string; blocks: Blk[]; months?: number }) {
  const today = ymd(new Date());
  const [a, setA] = useState<string | null>(null);   // selected check-in
  const [b, setB] = useState<string | null>(null);   // selected check-out (exclusive)
  const [open, setOpen] = useState<string | null>(null); // tapped booked block id

  const blockOn = (day: string) => blocks.find((bl) => bl.start_date <= day && (bl.end_date == null || day < bl.end_date));
  const inSel = (day: string) => !!a && (b ? day >= a && day < b : day === a);

  const onDay = (day: string, booked: Blk | undefined) => {
    if (day < today) return;
    if (booked) { setOpen(open === booked.id ? null : booked.id); setA(null); setB(null); return; }
    setOpen(null);
    if (!a || b) { setA(day); setB(null); }      // start a fresh range
    else if (day > a) setB(day);                  // set check-out
    else setA(day);                               // earlier tap → new start
  };

  const now = new Date();
  return (
    <div className="rcal">
      {Array.from({ length: months }, (_, mi) => {
        const m = new Date(now.getFullYear(), now.getMonth() + mi, 1);
        const y = m.getFullYear(), mo = m.getMonth();
        const lead = new Date(y, mo, 1).getDay();
        const dim = new Date(y, mo + 1, 0).getDate();
        return (
          <div className="rcal-m" key={mi}>
            <div className="rcal-mh">{TH_MONTH[mo]} {y + 543}</div>
            <div className="rcal-dow">{DOW.map((d) => <span key={d}>{d}</span>)}</div>
            <div className="rcal-grid">
              {Array.from({ length: lead }, (_, i) => <span key={'x' + i} />)}
              {Array.from({ length: dim }, (_, i) => {
                const day = ymd(new Date(y, mo, i + 1));
                const booked = blockOn(day);
                const past = day < today;
                const c = booked ? (KIND[booked.block_kind] || '#9aa0a6') : null;
                return (
                  <button type="button" key={day} disabled={past} title={booked ? (booked.note || 'ไม่ว่าง') : 'ว่าง'}
                    className={`rcal-d ${booked ? 'bk' : 'fr'} ${inSel(day) ? 'sel' : ''} ${past ? 'pa' : ''} ${day === today ? 'td' : ''}`}
                    style={c ? { background: `color-mix(in srgb,${c} 16%,#fff)`, color: `color-mix(in srgb,${c} 60%,#1a1a1a)`, boxShadow: `inset 0 0 0 1.5px color-mix(in srgb,${c} 30%,#fff)` } : undefined}
                    onClick={() => onDay(day, booked)}>
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {a && !b && <p className="fhint">แตะวัน <b>เช็คเอาท์</b> (วันที่ลูกค้าออก) อีกครั้งเพื่อบล็อกช่วง</p>}
      {a && b && (
        <form className="rcal-add" action={addRoomBlockAction.bind(null, roomId)}>
          <div className="rcal-add-r"><span>บล็อก {a} → {b} <em>(เช็คเอาท์)</em></span><button type="button" className="rcal-x" onClick={() => { setA(null); setB(null); }}>ยกเลิก</button></div>
          <input type="hidden" name="start_date" value={a} />
          <input type="hidden" name="end_date" value={b} />
          <input name="note" placeholder="โน้ต (เช่น จองผ่านไลน์ คุณเอ) — เห็นเฉพาะคุณ" />
          <button className="btn btn-primary" type="submit">บล็อกช่วงนี้</button>
        </form>
      )}
      {open && (() => {
        const bl = blocks.find((x) => x.id === open); if (!bl) return null;
        return (
          <div className="rcal-pop">
            <span>{bl.start_date} → {bl.end_date || 'ต่อเนื่อง'}{bl.note ? ` · ${bl.note}` : ''}</span>
            <form action={cancelRoomBlockAction.bind(null, bl.id)}><button className="dbtn sm" type="submit">เอาออก</button></form>
          </div>
        );
      })()}

      <div className="rcal-legend"><span><i className="fr" /> ว่าง</span><span><i className="bk" /> ไม่ว่าง</span><span style={{ opacity: .6 }}>แตะ 2 วัน = บล็อกช่วง</span></div>
    </div>
  );
}
