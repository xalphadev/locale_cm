'use client';
import { useState } from 'react';
import { addRoomBlockAction } from '../../../actions';
import { Icon } from '../../ui';

// The per-room book form on the หาห้องว่าง results. Reactive submit: a name → a real booking ("จองให้ คุณX"),
// no name → a hold ("กันห้องไว้ก่อน") — so the operator always knows which outcome they're about to commit.
export default function AvailBookForm({ roomId, code, from, to, back, spanLabel, pax, amountMinor, months, depositNote }: {
  roomId: string; code: string; from: string; to: string; back: string; spanLabel: string;
  pax: number; amountMinor: number | null; months: number; depositNote: string;
}) {
  const [name, setName] = useState('');
  const first = name.trim().split(/\s+/)[0];
  return (
    <form className="avail-book" action={addRoomBlockAction.bind(null, roomId)}>
      <input type="hidden" name="start_date" value={from} />
      <input type="hidden" name="end_date" value={to} />
      <input type="hidden" name="block_kind" value="stay" />
      <input type="hidden" name="returnTo" value={`${back}&bk=${code}`} />
      {pax > 0 && <input type="hidden" name="party_size" value={pax} />}
      {amountMinor ? <input type="hidden" name="amount_minor" value={amountMinor} /> : null}
      {months > 0 ? <input type="hidden" name="desired_months" value={months} /> : null}
      <div className="avail-book-recap">
        <Icon n="bed" size={15} />
        <span>ห้อง {code} · {spanLabel}{pax > 0 ? ` · ${pax} คน` : ''}</span>
        {amountMinor ? <b className="avail-book-amt">≈ ฿{Math.round(amountMinor / 100).toLocaleString('th-TH')}</b> : null}
      </div>
      <div className="fgrid">
        <div className="field"><label>ชื่อผู้จอง</label><input name="guest_name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="ชื่อ-นามสกุล" /></div>
        <div className="field"><label>เบอร์โทร</label><input name="guest_phone" maxLength={40} inputMode="tel" placeholder="08x-xxx-xxxx" /></div>
      </div>
      <div className="field"><input name="note" defaultValue={depositNote} maxLength={120} placeholder="โน้ต (เห็นเฉพาะคุณ)" /></div>
      <button type="submit" className={`dbtn ${name.trim() ? 'primary' : 'avail-hold'}`}>
        {name.trim() ? `จองให้ คุณ${first} · ${spanLabel}` : `กันห้อง ${code} ไว้ก่อน`}
      </button>
      {!name.trim() && <p className="avail-book-hint">ยังไม่ใส่ชื่อ = กันห้องไว้ก่อน เพิ่มชื่อทีหลังได้</p>}
    </form>
  );
}
