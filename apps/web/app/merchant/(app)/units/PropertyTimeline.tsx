'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Icon } from '../ui';
import { ConfirmSubmit } from '../ConfirmSubmit';
import { addRoomBlockAction, cancelRoomBlockAction } from '../../actions';

// Interactive property timeline (rooms × the visible day window). Tap two FREE cells in one room to block a
// range (create a booking / maintenance / hold via addRoomBlockAction); tap a BUSY cell to see/remove its
// block (cancelRoomBlockAction). Monthly rooms occupied by the board flag (no block) show busy but aren't
// removable here (manage from the room). All date math is YYYY-MM-DD string compare. No schema, no money.
type Blk = { id: string; s: string; e: string | null; k: string; note: string | null };
export type TLRoom = {
  id: string; code: string; floor: string | null; guest: string | null;
  rental_mode: string; occupancy_status: string; occupied_until: string | null; blocks: Blk[];
};
const DOW = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const KCOLOR: Record<string, string> = { stay: '#3b82f6', tenancy: '#3b82f6', reserved: '#f59e0b', occupied: '#3b82f6', maintenance: '#9aa0a8', hold: '#0ea5a4' };
const KLABEL: Record<string, string> = { stay: 'เข้าพัก', tenancy: 'สัญญาเช่า', reserved: 'จอง', occupied: 'มีผู้เช่า', maintenance: 'ปิดซ่อม', hold: 'กันห้อง' };

export function PropertyTimeline({ rooms, days, today, term }: { rooms: TLRoom[]; days: string[]; today: string; term: string }) {
  const [sel, setSel] = useState<{ roomId: string; code: string; a: string; b: string | null } | null>(null);
  const [open, setOpen] = useState<{ blk: Blk; code: string } | null>(null);

  // what covers (room, day): a real block (removable) | flag-busy (monthly, not removable) | free
  const cover = (r: TLRoom, day: string): { blk: Blk | null; flag: boolean } => {
    for (const bl of r.blocks) if (bl.s <= day && (!bl.e || day < bl.e)) return { blk: bl, flag: false };
    if (r.rental_mode !== 'daily' && r.occupancy_status && r.occupancy_status !== 'vacant' && (!r.occupied_until || day < r.occupied_until)) return { blk: null, flag: true };
    return { blk: null, flag: false };
  };
  const inSel = (r: TLRoom, day: string) => !!sel && sel.roomId === r.id && (sel.b ? day >= sel.a && day < sel.b : day === sel.a);
  // a range is selectable only if every night in [a,b) is free (no block / no flag) — so you can't span a booking
  const rangeClear = (r: TLRoom, a: string, b: string) => days.every((d) => !(d >= a && d < b) || (!cover(r, d).blk && !cover(r, d).flag));

  const onCell = (r: TLRoom, day: string, c: { blk: Blk | null; flag: boolean }) => {
    if (day < today) return;
    if (c.blk) { setOpen(open?.blk.id === c.blk.id ? null : { blk: c.blk, code: r.code }); setSel(null); return; }
    if (c.flag) { setOpen(null); setSel(null); return; }   // flag-busy: not creatable/removable here
    setOpen(null);
    if (!sel || sel.roomId !== r.id || sel.b) setSel({ roomId: r.id, code: r.code, a: day, b: null });   // fresh range
    else if (day > sel.a && rangeClear(r, sel.a, day)) setSel({ ...sel, b: day });   // set check-out (range must be clear)
    else setSel({ roomId: r.id, code: r.code, a: day, b: null });                     // earlier tap / blocked span → restart
  };

  return (
    <>
      <div className="caltl">
        <table className="caltl-t">
          <thead>
            <tr><th className="caltl-rh">ห้อง</th>{days.map((d) => { const dt = new Date(d + 'T00:00:00Z'); return <th key={d} className={`caltl-dh ${d === today ? 'tdy' : ''}`}><span>{DOW[dt.getUTCDay()]}</span><b>{dt.getUTCDate()}</b></th>; })}</tr>
          </thead>
          <tbody>
            {rooms.map((r) => (
              <tr key={r.id}>
                <th className="caltl-rh"><Link href={`/merchant/units/${r.id}`}>{r.code}{r.guest ? <span className="caltl-guest"> · {r.guest}</span> : r.floor ? <span className="caltl-fl"> · {term} {r.floor}</span> : null}</Link></th>
                {days.map((d) => {
                  const c = cover(r, d); const k = c.blk?.k || (c.flag ? r.occupancy_status : null); const past = d < today;
                  return (
                    <td key={d} className={`caltl-c caltl-cx ${d === today ? 'tdy' : ''} ${inSel(r, d) ? 'sel' : ''} ${past ? 'pa' : ''}`}
                      title={k ? KLABEL[k] || k : 'ว่าง — แตะเพื่อเลือกช่วง'} onClick={() => onCell(r, d, c)}
                      style={k ? { background: KCOLOR[k] || '#3b82f6' } : undefined} />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sel && !sel.b && <p className="note" style={{ margin: '8px 2px' }}>ห้อง {sel.code}: แตะวัน<b>เช็คเอาท์</b>อีกครั้งเพื่อเลือกช่วง · <button type="button" className="lnk-btn" onClick={() => setSel(null)}>ยกเลิก</button></p>}

      {sel && sel.b && (
        <form className="tl-add" action={addRoomBlockAction.bind(null, sel.roomId)}>
          <div className="tl-add-h">ห้อง {sel.code} · {sel.a} → {sel.b} <span className="muted">(เช็คเอาท์)</span></div>
          <input type="hidden" name="start_date" value={sel.a} />
          <input type="hidden" name="end_date" value={sel.b} />
          <div className="field"><label>ประเภท</label>
            <select name="block_kind" defaultValue="stay"><option value="stay">การจอง / เข้าพัก</option><option value="maintenance">ปิดซ่อม</option><option value="hold">กันห้อง (ชั่วคราว)</option></select>
          </div>
          <div className="fgrid">
            <div className="field"><label>ชื่อผู้จอง (ถ้าเป็นการจอง)</label><input name="guest_name" maxLength={80} placeholder="ชื่อ-นามสกุล" /></div>
            <div className="field"><label>เบอร์โทร</label><input name="guest_phone" maxLength={40} inputMode="tel" placeholder="08x-xxx-xxxx" /></div>
          </div>
          <input name="note" placeholder="โน้ต (เห็นเฉพาะคุณ)" />
          <div className="tl-add-acts">
            <button type="button" className="dbtn" onClick={() => setSel(null)}>ยกเลิก</button>
            <button type="submit" className="dbtn primary">บันทึกช่วงนี้</button>
          </div>
        </form>
      )}

      {open && (
        <div className="tl-pop">
          <div className="tl-pop-l">
            <b>ห้อง {open.code}</b>
            <span>{KLABEL[open.blk.k] || open.blk.k} · {open.blk.s} → {open.blk.e || 'ต่อเนื่อง'}{open.blk.note ? ` · ${open.blk.note}` : ''}</span>
          </div>
          <div className="tl-pop-a">
            <button type="button" className="dbtn sm" onClick={() => setOpen(null)}>ปิด</button>
            <form action={cancelRoomBlockAction.bind(null, open.blk.id)}><ConfirmSubmit message="เอาช่วงนี้ออก? วันที่จะกลับมาว่างให้จองใหม่ทันที" className="dbtn sm danger">เอาออก</ConfirmSubmit></form>
          </div>
        </div>
      )}

      <div className="callegend">
        <span><i style={{ background: '#3b82f6' }} /> เข้าพัก/เช่า</span>
        <span><i style={{ background: '#f59e0b' }} /> จอง</span>
        <span><i style={{ background: '#9aa0a8' }} /> ปิดซ่อม</span>
        <span><i style={{ background: '#0ea5a4' }} /> กันห้อง</span>
        <span><i style={{ background: '#eef0f3', boxShadow: 'inset 0 0 0 1px #e0e3e8' }} /> ว่าง</span>
        <span style={{ opacity: .65 }}>แตะ 2 วัน = สร้างช่วง</span>
      </div>
    </>
  );
}
