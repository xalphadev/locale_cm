// Read-only property month overview: how many DAILY rooms are free each night (server component, no JS).
// Cells show the free-room count for that night; "เต็ม" when 0. Complements the per-room RoomCalendar.
const TH_MONTH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const DOW = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export default function TypeCalendar({ days, months = 2 }: { days: { day: string; free: number; total: number }[]; months?: number }) {
  const map = new Map(days.map((d) => [d.day, d]));
  const today = days[0]?.day ?? ymd(new Date());
  const base = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1, 1);
  return (
    <div className="rcal tcal">
      {Array.from({ length: months }, (_, mi) => {
        const m = new Date(base.getFullYear(), base.getMonth() + mi, 1);
        const y = m.getFullYear(), mo = m.getMonth();
        const lead = new Date(y, mo, 1).getDay();
        const dim = new Date(y, mo + 1, 0).getDate();
        return (
          <div className="rcal-m" key={mi}>
            <div className="rcal-mh">{TH_MONTH[mo]} {y + 543}</div>
            <div className="rcal-dow">{DOW.map((d) => <span key={d}>{d}</span>)}</div>
            <div className="rcal-grid">
              {Array.from({ length: lead }, (_, i) => <span key={'x' + i} />)}
              {Array.from({ length: dim }, (_, i) => {
                const day = ymd(new Date(y, mo, i + 1));
                const info = map.get(day);
                const cls = !info ? 'pa' : info.free > 0 ? 'fr' : 'no';
                return (
                  <div key={day} className={`tcal-d ${cls} ${day === today ? 'td' : ''}`} title={info ? `ว่าง ${info.free}/${info.total}` : ''}>
                    <span className="tcal-dn">{i + 1}</span>
                    {info ? <span className="tcal-c">{info.free > 0 ? info.free : 'เต็ม'}</span> : null}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      <p className="rcal-legend"><span>ตัวเลข = ห้องว่างคืนนั้น (รายวัน) · “เต็ม” = ไม่มีห้องว่าง</span></p>
    </div>
  );
}
