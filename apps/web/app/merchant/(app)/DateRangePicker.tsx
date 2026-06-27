'use client';
import { useEffect, useMemo, useState } from 'react';
import { Icon } from './ui';

// OTA-style date-range picker (merchant build — mirrors the consumer one). Full-screen scrolling
// months + connecting range band; writes chosen dates into hidden form inputs so the existing Server
// Actions read them unchanged. mode='single' picks one date.
const THMONTH = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const THMON_ABBR = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const THDOW = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์'];
const DOW = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
const DAY = 86400000;
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtPill = (d: Date) => `${THDOW[d.getDay()]} ${d.getDate()} ${THMON_ABBR[d.getMonth()]}`;
const midnight = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

export default function DateRangePicker({
  mode = 'range', fromName, toName, labelFrom = 'เช็คอิน', labelTo = 'เช็คเอาท์', months = 12, allowPast = false, onChange,
}: {
  mode?: 'range' | 'single'; fromName: string; toName?: string; labelFrom?: string; labelTo?: string; months?: number; allowPast?: boolean;
  onChange?: (from: string | null, to: string | null) => void;
}) {
  const today = useMemo(() => midnight(new Date()), []);
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState<Date | null>(null);
  const [to, setTo] = useState<Date | null>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const monthsList = useMemo(
    () => Array.from({ length: months }, (_, i) => new Date(today.getFullYear(), today.getMonth() + i, 1)),
    [today, months]);

  const pick = (d: Date) => {
    if (mode === 'single') { setFrom(d); return; }
    if (!from || (from && to)) { setFrom(d); setTo(null); return; }
    if (+d <= +from) { setFrom(d); setTo(null); return; }
    setTo(d);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { onChange?.(from ? ymd(from) : null, to ? ymd(to) : null); }, [from, to]);

  const nights = from && to ? Math.round((+to - +from) / DAY) : 0;
  const valid = mode === 'single' ? !!from : !!(from && to);
  const cta = mode === 'single' ? (from ? 'ตกลง' : 'เลือกวัน') : valid ? `ตกลง (${nights} คืน)` : from ? 'เลือกวันสิ้นสุด' : 'เลือกวันเริ่ม';

  return (
    <div className="drp">
      <button type="button" className="drp-trigger" onClick={() => setOpen(true)}>
        <span className="drp-tp">
          <span className="drp-tl">{labelFrom}</span>
          <span className={`drp-tv ${from ? '' : 'ph'}`}>{from ? fmtPill(from) : 'เลือกวัน'}</span>
        </span>
        {mode === 'range' && (
          <>
            <Icon n="chevR" size={16} />
            <span className="drp-tp">
              <span className="drp-tl">{labelTo}</span>
              <span className={`drp-tv ${to ? '' : 'ph'}`}>{to ? fmtPill(to) : 'เลือกวัน'}</span>
            </span>
          </>
        )}
        <Icon n="calendar" size={18} />
      </button>

      <input type="hidden" name={fromName} value={from ? ymd(from) : ''} />
      {mode === 'range' && toName && <input type="hidden" name={toName} value={to ? ymd(to) : ''} />}

      {open && (
        <div className="drp-overlay" role="dialog" aria-modal="true">
          <div className="drp-head">
            <button type="button" className="drp-x" onClick={() => setOpen(false)} aria-label="ปิด"><Icon n="x" size={22} /></button>
            <span className="drp-title">{mode === 'single' ? 'เลือกวัน' : 'เลือกช่วงวันที่'}</span>
            <span />
          </div>

          {mode === 'range' && (
            <div className="drp-summary">
              <div className="drp-sp"><span className="drp-tl">{labelFrom}</span><b>{from ? fmtPill(from) : '—'}</b></div>
              <Icon n="chevR" size={18} />
              <div className="drp-sp"><span className="drp-tl">{labelTo}</span><b>{to ? fmtPill(to) : '—'}</b></div>
            </div>
          )}

          <div className="drp-dow">{DOW.map((d) => <span key={d}>{d}</span>)}</div>

          <div className="drp-scroll">
            {monthsList.map((m, mi) => {
              const y = m.getFullYear(), mo = m.getMonth();
              const lead = new Date(y, mo, 1).getDay();
              const days = new Date(y, mo + 1, 0).getDate();
              const hasRange = !!(from && to && +to > +from);
              return (
                <div className="drp-month" key={mi}>
                  <div className="drp-mlabel">{THMONTH[mo]} {y + 543}</div>
                  <div className="drp-grid">
                    {Array.from({ length: lead }, (_, i) => <span className="drp-day empty" key={`e${i}`} />)}
                    {Array.from({ length: days }, (_, i) => {
                      const d = midnight(new Date(y, mo, i + 1));
                      const t = +d;
                      const off = !allowPast && t < +today;
                      const isFrom = !!from && t === +from, isTo = !!to && t === +to;
                      const inR = !!from && !!to && t > +from && t < +to;
                      const inBand = hasRange && (isFrom || isTo || inR);
                      const col = d.getDay(), dayNum = i + 1;
                      const cls = ['drp-day', off ? 'off' : '',
                        (isFrom || isTo) ? 'sel' : '', t === +today && !isFrom && !isTo ? 'today' : '',
                        inBand ? 'band' : '', inBand && isFrom ? 'bl' : '', inBand && isTo ? 'br' : '',
                        inBand && (isFrom || col === 0 || dayNum === 1) ? 'rl' : '',
                        inBand && (isTo || col === 6 || dayNum === days) ? 'rr' : ''].filter(Boolean).join(' ');
                      return (
                        <button type="button" className={cls} key={i} disabled={off} onClick={() => pick(d)}>
                          <span className="drp-d">{i + 1}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="drp-foot">
            <button type="button" className="drp-ok" disabled={!valid} onClick={() => setOpen(false)}>{cta}</button>
          </div>
        </div>
      )}
    </div>
  );
}
