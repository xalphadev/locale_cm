'use client';
import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { quoteStay, type Rate } from '@/lib/quote';
import { promptpayPayload } from '@/lib/promptpay';

// Single-page online-booking form: pick dates/guests → see the amount → fill contact → transfer to the
// host's account and attach the slip → submit (createPaidBookingAction). Price preview = base × nights/
// months, the SAME maths the server records, so the amount shown is the amount transferred. No money held.
type Pay = { promptpay: string | null; bank: string | null; accountNo: string | null; accountName: string | null };
const money = (m: number) => `฿${(m / 100).toLocaleString('th-TH')}`;
const ERR: Record<string, string> = {
  contact: 'กรอกชื่อและเบอร์โทร', dates: 'เลือกวันเข้าพัก', past: 'เลือกวันที่ไม่ผ่านมาแล้ว',
  price: 'ที่พักนี้ยังไม่ได้ตั้งราคา', full: 'ช่วงวันที่เลือกเต็มแล้ว ลองวันอื่น', slip: 'แนบสลิปการโอนด้วย',
};

export function BookPayForm({ action, mode, basePriceMinor, rates, depositPct, capacity, pay, err }:
  { action: (fd: FormData) => void; mode: string; basePriceMinor: number; rates: Rate[]; depositPct: number; capacity: number | null; pay: Pay; err: string | null }) {
  const isDeposit = depositPct > 0 && depositPct < 100;
  const daily = mode === 'daily';
  const today = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [months, setMonths] = useState(daily ? 0 : 3);
  const [method, setMethod] = useState<'promptpay' | 'bank_transfer'>(pay.promptpay ? 'promptpay' : 'bank_transfer');
  const [slipName, setSlipName] = useState('');
  const [qr, setQr] = useState('');

  const { amount: total, nights } = useMemo(
    () => quoteStay(mode, from || null, to || null, months, basePriceMinor, rates),
    [mode, from, to, months, basePriceMinor, rates]);
  const payNow = isDeposit && total > 0 ? Math.round(total * depositPct / 100) : total;
  const dayAfter = from ? new Date(Date.parse(from) + 86400000).toISOString().slice(0, 10) : today;
  const hasBoth = !!pay.promptpay && !!(pay.bank && pay.accountNo);

  // PromptPay QR with the amount embedded — regenerate whenever the total or method changes
  useEffect(() => {
    if (method === 'promptpay' && pay.promptpay && payNow > 0) {
      const payload = promptpayPayload(pay.promptpay, payNow / 100);
      if (payload) { QRCode.toDataURL(payload, { width: 240, margin: 1 }).then(setQr).catch(() => setQr('')); return; }
    }
    setQr('');
  }, [method, pay.promptpay, payNow]);

  return (
    <form className="bookpay" action={action}>
      {err && <div className="bookpay-err">{ERR[err] || 'กรอกข้อมูลให้ครบ'}</div>}

      <section className="bp-sec">
        <h3 className="bp-h">วันเข้าพัก</h3>
        <div className="fgrid">
          <label className="bp-fld">{daily ? 'เช็คอิน' : 'เริ่มเข้าพัก'}
            <input type="date" name="desired_from" min={today} value={from} onChange={(e) => setFrom(e.target.value)} required />
          </label>
          {daily ? (
            <label className="bp-fld">เช็คเอาท์
              <input type="date" name="desired_to" min={dayAfter} value={to} onChange={(e) => setTo(e.target.value)} required />
            </label>
          ) : (
            <label className="bp-fld">กี่เดือน
              <input type="number" name="desired_months" min={1} max={36} value={months} onChange={(e) => setMonths(Math.max(1, +e.target.value || 1))} required />
            </label>
          )}
        </div>
        <label className="bp-fld">ผู้เข้าพัก (คน)
          <input type="number" name="party_size" min={1} max={capacity || 30} defaultValue={1} />
        </label>
      </section>

      <div className="bp-total">
        <span>{isDeposit ? 'มัดจำที่ต้องชำระตอนนี้' : 'ยอดที่ต้องชำระ'}</span>
        <b>{payNow > 0 ? money(payNow) : '—'}</b>
        {total > 0 && <small>{daily ? `${nights} คืน` : `${months} เดือน`}{daily && nights ? ` · เฉลี่ย ${money(Math.round(total / nights))}/คืน` : ''}{isDeposit ? ` · มัดจำ ${depositPct}% ของ ${money(total)} · ที่เหลือจ่ายตอนเข้าพัก` : ''}</small>}
      </div>

      <section className="bp-sec">
        <h3 className="bp-h">ข้อมูลผู้จอง</h3>
        <label className="bp-fld">ชื่อ-นามสกุล *<input name="contact_name" maxLength={80} required /></label>
        <div className="fgrid">
          <label className="bp-fld">เบอร์โทร *<input name="contact_phone" inputMode="tel" maxLength={40} required /></label>
          <label className="bp-fld">อีเมล<input name="contact_email" type="email" maxLength={120} /></label>
        </div>
        <label className="bp-fld">เวลาที่คาดว่าจะถึง<input name="arrival" maxLength={40} placeholder="เช่น 14:00–15:00" /></label>
      </section>

      <section className="bp-sec">
        <h3 className="bp-h">ชำระเงิน</h3>
        <input type="hidden" name="payment_method" value={method} />
        {hasBoth && (
          <div className="bp-methods">
            <button type="button" className={method === 'promptpay' ? 'on' : ''} onClick={() => setMethod('promptpay')}>PromptPay</button>
            <button type="button" className={method === 'bank_transfer' ? 'on' : ''} onClick={() => setMethod('bank_transfer')}>โอนธนาคาร</button>
          </div>
        )}
        <div className="bp-acct">
          {method === 'promptpay' && pay.promptpay ? (
            <>
              {qr && <div className="bp-qr"><img src={qr} alt="PromptPay QR" /><span>สแกนจ่ายผ่านแอปธนาคาร · ยอดจะขึ้นอัตโนมัติ</span></div>}
              <div className="bp-acct-row"><span>PromptPay</span><b>{pay.promptpay}</b></div>
            </>
          ) : (
            <>
              {pay.bank && <div className="bp-acct-row"><span>ธนาคาร</span><b>{pay.bank}</b></div>}
              {pay.accountNo && <div className="bp-acct-row"><span>เลขบัญชี</span><b>{pay.accountNo}</b></div>}
              {pay.accountName && <div className="bp-acct-row"><span>ชื่อบัญชี</span><b>{pay.accountName}</b></div>}
            </>
          )}
          {payNow > 0 && <div className="bp-acct-amt">โอน <b>{money(payNow)}</b>{isDeposit ? ' (มัดจำ)' : ''}</div>}
        </div>
        <label className="bp-slip">
          <span>{slipName ? `📎 ${slipName}` : '＋ แนบรูปสลิปการโอน *'}</span>
          <input type="file" name="slip" accept="image/png,image/jpeg,image/webp" onChange={(e) => setSlipName(e.target.files?.[0]?.name || '')} required />
        </label>
      </section>

      <button type="submit" className="bp-submit">ยืนยันการจอง{payNow > 0 ? ` · ${money(payNow)}` : ''}</button>
      <p className="bp-foot">เงินโอนเข้าบัญชีของที่พัก<b>โดยตรง</b> · ที่พักจะตรวจสลิปแล้วยืนยันการจอง · ระบบไม่เก็บเงินแทน</p>
    </form>
  );
}
