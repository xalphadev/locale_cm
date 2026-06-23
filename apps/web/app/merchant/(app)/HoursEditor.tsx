'use client';
import { useState } from 'react';

// Per-day opening hours editor. Emits one hidden field per day (h_mon … h_sun) as "HH:MM-HH:MM" or "closed" —
// the exact shape the consumer reads (opening_hours = { mon:"09:00-18:00", sun:"closed", … }) and openNow()
// parses. Single shift per day (covers most shops); the consumer still renders multi-range strings if seeded.
const DAYS: [string, string][] = [
  ['mon', 'จันทร์'], ['tue', 'อังคาร'], ['wed', 'พุธ'], ['thu', 'พฤหัสบดี'], ['fri', 'ศุกร์'], ['sat', 'เสาร์'], ['sun', 'อาทิตย์'],
];
const parse = (v?: string) => {
  const m = /(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/.exec(v || '');
  return m ? { on: true, open: m[1], close: m[2] } : { on: false, open: '09:00', close: '18:00' };
};

export function HoursEditor({ value }: { value?: Record<string, string> }) {
  const [days, setDays] = useState<Record<string, { on: boolean; open: string; close: string }>>(
    () => Object.fromEntries(DAYS.map(([k]) => [k, parse(value?.[k])])));
  const set = (k: string, patch: Partial<{ on: boolean; open: string; close: string }>) =>
    setDays((d) => ({ ...d, [k]: { ...d[k], ...patch } }));
  const copyMon = () => setDays((d) => Object.fromEntries(DAYS.map(([k]) => [k, { ...d.mon }])));

  return (
    <div className="hrs">
      {DAYS.map(([k, label]) => {
        const d = days[k];
        const val = d.on && d.open && d.close ? `${d.open}-${d.close}` : 'closed';
        return (
          <div className={`hrs-row ${d.on ? '' : 'off'}`} key={k}>
            <label className="hrs-day"><input type="checkbox" checked={d.on} onChange={(e) => set(k, { on: e.target.checked })} /> {label}</label>
            {d.on ? (
              <span className="hrs-times">
                <input type="time" value={d.open} onChange={(e) => set(k, { open: e.target.value })} />
                <span className="hrs-dash">–</span>
                <input type="time" value={d.close} onChange={(e) => set(k, { close: e.target.value })} />
              </span>
            ) : <span className="hrs-closed">ปิด</span>}
            <input type="hidden" name={`h_${k}`} value={val} />
          </div>
        );
      })}
      <button type="button" className="hrs-copy" onClick={copyMon}>ใช้เวลาวันจันทร์กับทุกวัน</button>
    </div>
  );
}
