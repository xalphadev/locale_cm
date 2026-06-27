'use client';
import { useState } from 'react';
import DateRangePicker from '../../DateRangePicker';

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

  return (
    <form method="get" className="avail-search">
      <div className="avail-mode">
        <button type="button" className={mode === 'monthly' ? 'on' : ''} onClick={() => switchMode('monthly')}>รายเดือน</button>
        <button type="button" className={mode === 'daily' ? 'on' : ''} onClick={() => switchMode('daily')}>รายวัน</button>
      </div>

      {mode === 'monthly' ? (
        <>
          <DateRangePicker key="m" mode="single" fromName="from" labelFrom="เข้าพักวันที่" onChange={(f) => setFrom(f)} />
          <div className="avail-fld">
            <label>อยู่กี่เดือน</label>
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
          <DateRangePicker key="d" fromName="from" toName="to" labelFrom="เช็คอิน" labelTo="เช็คเอาท์ (วันออก)" onChange={(f, t) => { setFrom(f); setTo(t); }} />
          <input type="hidden" name="mode" value="daily" />
        </>
      )}

      <div className="avail-fld">
        <label>จำนวนผู้เข้าพัก</label>
        <div className="pax-chips">
          {[1, 2, 3, 4, 5].map((n) => <button type="button" key={n} className={pax === n ? 'on' : ''} onClick={() => setPax(n)}>{n === 5 ? '5+' : n}</button>)}
        </div>
        <input type="hidden" name="pax" value={pax} />
      </div>

      <button type="submit" className="dbtn primary avail-go" disabled={!ready}>ดูห้องที่ว่าง</button>
    </form>
  );
}
