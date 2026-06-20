// Read-only per-night availability calendar for a managed daily listing (consumer). Shows which nights
// are open (≥1 room free) vs full — NO room counts, NO owner notes, NO booking action (no money).
// Availability is "as of now"; the traveler confirms with the property. Server component (no JS).
const TH_MONTH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const DOW = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function StayAvailability({ days, months = 2 }: { days: { day: string; free: number; total: number }[]; months?: number }) {
  const map = new Map(days.map((d) => [d.day, d]));
  const today = days[0]?.day ?? ymd(new Date());
  const base = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1, 1);
  return (
    <div className="savail">
      {Array.from({ length: months }, (_, mi) => {
        const m = new Date(base.getFullYear(), base.getMonth() + mi, 1);
        const y = m.getFullYear(), mo = m.getMonth();
        const lead = new Date(y, mo, 1).getDay();
        const dim = new Date(y, mo + 1, 0).getDate();
        return (
          <div className="savail-m" key={mi}>
            <div className="savail-mh">{TH_MONTH[mo]} {y + 543}</div>
            <div className="savail-dow">{DOW.map((d) => <span key={d}>{d}</span>)}</div>
            <div className="savail-grid">
              {Array.from({ length: lead }, (_, i) => <span key={'x' + i} />)}
              {Array.from({ length: dim }, (_, i) => {
                const day = ymd(new Date(y, mo, i + 1));
                const info = map.get(day);
                const cls = !info ? 'pa' : info.free > 0 ? 'fr' : 'no';
                return <div key={day} className={`savail-d ${cls} ${day === today ? 'td' : ''}`} title={info ? (info.free > 0 ? 'ว่าง' : 'เต็ม') : ''}>{i + 1}</div>;
              })}
            </div>
          </div>
        );
      })}
      <div className="savail-legend"><span><i className="fr" /> ว่าง</span><span><i className="no" /> เต็ม</span></div>
      <p className="savail-note">ว่าง ณ ตอนนี้ — ยืนยัน/จองกับที่พักโดยตรง (ไม่มีระบบจอง/จ่ายเงินในแอป)</p>
    </div>
  );
}
