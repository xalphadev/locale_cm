'use client';
import { useState, useRef, type FormEvent } from 'react';
import DateRangePicker, { type DateRangePickerHandle } from '../../DateRangePicker';

// The search form on หาห้องว่าง. รายเดือน = move-in date + a months stepper (computes the checkout); รายวัน =
// a date range. Plus a pax chip-stepper. All write hidden inputs the GET form carries to ?from&to&mode&pax.
const addMonths = (ymd: string, n: number) => {
  const [y, m, d] = ymd.split('-').map(Number);
  const lastDay = new Date(Date.UTC(y, m - 1 + n + 1, 0)).getUTCDate();   // clamp the day so 31 ม.ค. + 1 = 28 ก.พ. (not 3 มี.ค.)
  return new Date(Date.UTC(y, m - 1 + n, Math.min(d, lastDay))).toISOString().slice(0, 10);
};

export default function AvailabilitySearch({ defaultMode, minMonths }: { defaultMode: 'monthly' | 'daily'; minMonths: number }) {
  const [mode, setMode] = useState<'monthly' | 'daily'>(defaultMode);
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);   // daily range end
  const [months, setMonths] = useState(Math.max(1, minMonths));
  const [pax, setPax] = useState(2);
  const switchMode = (m: 'monthly' | 'daily') => { setMode(m); setFrom(null); setTo(null); };

  const monthlyTo = mode === 'monthly' && from ? addMonths(from, months) : '';
  const ready = mode === 'monthly' ? !!from : !!(from && to);

  // The CTA is never silently disabled. If a date isn't chosen yet, tapping it points the operator straight
  // at the date step — scroll to it, pulse it, and open the calendar — so there's no dead-end.
  const dateRef = useRef<DateRangePickerHandle>(null);
  const fldRef = useRef<HTMLDivElement>(null);
  const guide = () => {
    fldRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    fldRef.current?.classList.remove('pulse');
    void fldRef.current?.offsetWidth;            // reflow so the keyframe restarts on repeat taps
    fldRef.current?.classList.add('pulse');
    dateRef.current?.open();
  };
  const onSubmit = (e: FormEvent) => { if (!ready) { e.preventDefault(); guide(); } };

  return (
    <form method="get" className="avail-search" onSubmit={onSubmit}>
      <div className="avail-mode">
        <button type="button" className={mode === 'monthly' ? 'on' : ''} onClick={() => switchMode('monthly')}>รายเดือน</button>
        <button type="button" className={mode === 'daily' ? 'on' : ''} onClick={() => switchMode('daily')}>รายวัน</button>
      </div>

      {mode === 'monthly' ? (
        <>
          <div className="avail-fld avail-datefld" ref={fldRef}>
            <label>1 · เข้าพักวันไหน? <span className="avail-req">จำเป็น</span></label>
            <DateRangePicker key="m" ref={dateRef} mode="single" fromName="from" labelFrom="เข้าพักวันที่" onChange={(f) => setFrom(f)} />
          </div>
          <div className="avail-fld">
            <label>2 · อยู่กี่เดือน</label>
            <div className="avail-step">
              <button type="button" onClick={() => setMonths((m) => Math.max(1, m - 1))} aria-label="ลด">−</button>
              <b>{months} เดือน</b>
              <button type="button" onClick={() => setMonths((m) => Math.min(36, m + 1))} aria-label="เพิ่ม">+</button>
            </div>
          </div>
          <input type="hidden" name="to" value={monthlyTo} />
          <input type="hidden" name="mode" value="monthly" />
        </>
      ) : (
        <>
          <div className="avail-fld avail-datefld" ref={fldRef}>
            <label>1 · เข้าพักวันไหน? <span className="avail-req">จำเป็น</span></label>
            <DateRangePicker key="d" ref={dateRef} fromName="from" toName="to" labelFrom="เช็คอิน" labelTo="เช็คเอาท์ (วันออก)" onChange={(f, t) => { setFrom(f); setTo(t); }} />
          </div>
          <input type="hidden" name="mode" value="daily" />
        </>
      )}

      <div className="avail-fld">
        <label>{mode === 'monthly' ? '3' : '2'} · จำนวนผู้เข้าพัก</label>
        <div className="pax-chips">
          {[1, 2, 3, 4, 5].map((n) => <button type="button" key={n} className={pax === n ? 'on' : ''} onClick={() => setPax(n)}>{n === 5 ? '5+' : n}</button>)}
        </div>
        <input type="hidden" name="pax" value={pax} />
      </div>

      <button type="submit" className={`dbtn avail-go${ready ? ' primary' : ''}`}>{ready ? 'ดูห้องที่ว่าง' : 'เลือกวันเข้าพักก่อน'}</button>
    </form>
  );
}
