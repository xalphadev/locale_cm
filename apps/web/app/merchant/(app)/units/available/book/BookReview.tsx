'use client';
import { useState } from 'react';
import { addRoomBlockAction } from '../../../../actions';   // book → available → units → (app) → merchant
import { Icon } from '../../../ui';
import { useSheetAnim } from '../../useSheetAnim';

// The booking review screen. Guest input on top; a LIVE locked summary below that resolves the booking-vs-hold
// verdict as the operator types; a sticky CTA opens a confirm sheet (the final guard) whose ยืนยัน is the only
// submit → commits via the UNCHANGED addRoomBlockAction. No money moves; the deposit is just a note.
export default function BookReview(p: {
  roomId: string; code: string; unitName: string; floorLabel: string;
  from: string; to: string; dateLabel: string; spanLabel: string; months: number; pax: number;
  quoteMinor: number | null; priceLabel: string; depositNote: string; warn: string; back: string;
}) {
  const [name, setName] = useState('');
  const [confirm, setConfirm] = useState(false);
  const shown = useSheetAnim(confirm);
  const isBooking = !!name.trim();
  const first = name.trim().split(/\s+/)[0];
  const quote = p.quoteMinor != null ? `≈ ฿${Math.round(p.quoteMinor / 100).toLocaleString('th-TH')}` : '';

  const summary = (
    <div className="bookrev-sum">
      <div className="bookrev-row"><Icon n="bed" size={15} /><span>ห้อง {p.code} · {p.unitName}{p.floorLabel ? ` · ${p.floorLabel}` : ''}</span></div>
      <div className="bookrev-row"><Icon n="calendar" size={15} /><span>{p.dateLabel} · {p.spanLabel}</span></div>
      {p.pax > 0 && <div className="bookrev-row"><Icon n="users" size={15} /><span>{p.pax} คน</span></div>}
      {quote && <div className="bookrev-row bookrev-price"><b>{quote}</b><i>{p.priceLabel ? `${p.priceLabel} · ประเมิน` : 'ราคาประเมิน'}</i></div>}
      {p.depositNote && <div className="bookrev-row bookrev-dep"><Icon n="clock" size={15} /><span>{p.depositNote}</span></div>}
      {p.warn && <div className="bookrev-row bookrev-warn"><Icon n="clock" size={15} /><span>{p.warn}</span></div>}
    </div>
  );

  return (
    <form className="bookrev" action={addRoomBlockAction.bind(null, p.roomId)}>
      <input type="hidden" name="start_date" value={p.from} />
      <input type="hidden" name="end_date" value={p.to} />
      <input type="hidden" name="block_kind" value="stay" />
      <input type="hidden" name="returnTo" value={`${p.back}&bk=${p.code}`} />
      {p.pax > 0 && <input type="hidden" name="party_size" value={p.pax} />}
      {p.quoteMinor ? <input type="hidden" name="amount_minor" value={p.quoteMinor} /> : null}
      {p.months > 0 ? <input type="hidden" name="desired_months" value={p.months} /> : null}

      <p className="bookrev-step">ใส่ชื่อผู้จอง แล้วตรวจสอบก่อนยืนยัน</p>
      <div className="fgrid">
        <div className="field"><label>ชื่อผู้จอง</label>
          <input name="guest_name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoFocus placeholder="ชื่อ-นามสกุล" /></div>
        <div className="field"><label>เบอร์โทร</label>
          <input name="guest_phone" maxLength={40} inputMode="tel" placeholder="08x-xxx-xxxx" /></div>
      </div>
      <div className="field"><label>โน้ต (เห็นเฉพาะคุณ)</label>
        <input name="note" defaultValue={p.depositNote} maxLength={120} placeholder="โน้ต" /></div>

      {summary}
      <div className={`bookrev-verdict ${isBooking ? 'is-book' : 'is-hold'}`}>
        {isBooking ? `นี่จะเป็นการจองให้ คุณ${first}` : 'ยังไม่ใส่ชื่อ — นี่จะเป็นการกันห้องไว้ก่อน (เพิ่มชื่อทีหลังได้)'}
      </div>

      <div className="bookrev-cta">
        <button type="button" className={`dbtn ${isBooking ? 'primary' : ''}`} onClick={() => setConfirm(true)}>
          {isBooking ? 'ยืนยันการจอง' : 'กันห้องไว้ก่อน'}</button>
      </div>

      {confirm && (<>
        <div className={`mbsheet-scrim ${shown ? 'in' : ''}`} onClick={() => setConfirm(false)} />
        <div className={`mbsheet ${shown ? 'in' : ''}`} role="dialog" aria-label="ยืนยันการจอง">
          <span className="mbsheet-handle" onClick={() => setConfirm(false)} aria-hidden />
          <div className="mbsheet-hd">
            <b>{isBooking ? `ยืนยันจองห้อง ${p.code}?` : `กันห้อง ${p.code} ไว้ก่อน?`}</b>
            <button type="button" className="mbsheet-x" onClick={() => setConfirm(false)}><Icon n="x" size={18} /></button>
          </div>
          <div className="mbsheet-body">
            {summary}
            <p className="bookrev-confirm">{isBooking
              ? <>จองให้ <b>คุณ{first}</b> · ห้องจะถูกกันทันทีหลังยืนยัน</>
              : <>ยังไม่มีชื่อผู้จอง — <b>กันห้องไว้ก่อน</b> เพิ่มชื่อทีหลังได้</>}</p>
          </div>
          <div className="mbsheet-foot">
            <button type="button" className="dbtn" onClick={() => setConfirm(false)}>กลับไปแก้</button>
            <button type="submit" className={`dbtn ${isBooking ? 'primary' : ''}`}>{isBooking ? 'ยืนยันการจอง' : 'ยืนยันกันห้อง'}</button>
          </div>
        </div>
      </>)}
    </form>
  );
}
