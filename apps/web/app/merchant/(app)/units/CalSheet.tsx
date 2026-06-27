'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '../ui';
import { useSheetAnim } from './useSheetAnim';

// Custom Thai month-grid date picker that slides up as a bottom sheet (replaces the OS <input type=date>).
// Tap the range pill → pick any day → navigate the calendar window there (?d=…), preserving ?w=month.
const DOW = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const TH_M = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const addD = (s: string, n: number) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return ymd(d); };

export function CalSheet({ start, winLen, month, today, label }: { start: string; winLen: number; month: boolean; today: string; label: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [cur, setCur] = useState(() => { const d = new Date(start + 'T00:00:00Z'); return { y: d.getUTCFullYear(), m: d.getUTCMonth() }; });
  // re-sync the displayed month to the live window after a soft-nav (prev/next/วันนี้) — the lazy initializer
  // only runs at mount, so without this the picker reopens on a stale, browsed-away month with no highlight.
  useEffect(() => { const d = new Date(start + 'T00:00:00Z'); setCur({ y: d.getUTCFullYear(), m: d.getUTCMonth() }); }, [start]);
  const shown = useSheetAnim(open);

  const go = (s: string) => { router.push(`/merchant/units/calendar?d=${s}${month ? '&w=month' : ''}`); setOpen(false); };
  const winEnd = addD(start, winLen - 1);   // inclusive last day of the viewed window
  const first = new Date(Date.UTC(cur.y, cur.m, 1));
  const gridStart = new Date(first); gridStart.setUTCDate(1 - first.getUTCDay());
  const cells = Array.from({ length: 42 }, (_, i) => { const d = new Date(gridStart); d.setUTCDate(gridStart.getUTCDate() + i); return d; });
  const shift = (n: number) => setCur((c) => { const d = new Date(Date.UTC(c.y, c.m + n, 1)); return { y: d.getUTCFullYear(), m: d.getUTCMonth() }; });

  return (
    <>
      <button type="button" className="calstep-r" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}>
        <span>{label}</span><Icon n="chevD" size={15} />
      </button>
      {open && (
        <>
          <div className={`mbsheet-scrim ${shown ? 'in' : ''}`} onClick={() => setOpen(false)} />
          <div className={`mbsheet ${shown ? 'in' : ''}`} role="dialog" aria-label="เลือกวันที่">
            <span className="mbsheet-handle" onClick={() => setOpen(false)} aria-hidden />
            <div className="mbsheet-body calsheet-body">
              <div className="calsheet-mh">
                <button type="button" className="calsheet-mb" onClick={() => shift(-1)} aria-label="เดือนก่อน"><Icon n="chevL" size={18} /></button>
                <b>{TH_M[cur.m]} {cur.y + 543}</b>
                <button type="button" className="calsheet-mb" onClick={() => shift(1)} aria-label="เดือนถัดไป"><Icon n="chevR" size={18} /></button>
              </div>
              <div className="calsheet-dow">{DOW.map((d) => <span key={d}>{d}</span>)}</div>
              <div className="calsheet-grid">
                {cells.map((d) => {
                  const s = ymd(d); const inM = d.getUTCMonth() === cur.m;
                  const cls = [s === today ? 'is-today' : '', (s >= start && s <= winEnd) ? 'in-win' : '', s === start ? 'is-sel' : '', !inM ? 'is-other' : ''].filter(Boolean).join(' ');
                  return <button type="button" key={s} className={`calsheet-d ${cls}`} onClick={() => go(s)}>{d.getUTCDate()}</button>;
                })}
              </div>
              <div className="calsheet-foot">
                <button type="button" className="calsheet-now" onClick={() => go(today)}>วันนี้</button>
                <button type="button" className="calsheet-close" onClick={() => setOpen(false)}>ปิด</button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
