import Link from 'next/link';
import { Icon } from '../icons';
import DateRangePicker from '../DateRangePicker';
import StayGuests from './StayGuests';

// The shared search card (.staycard) rendered identically on the /stay home AND the /stay/search results page.
// `action` = where the GET forms submit (home → /stay/search so the CTA lands on results; results → itself).
// `tabsBase` = base for the เช่ารายเดือน/เช่ารายวัน tabs (home keeps /stay so toggling reflows the rails;
// results uses /stay/search). All other links use the loader's href() default (/stay/search).
export function SearchControls({ d, action = '/stay/search', tabsBase = '/stay/search' }:
  { d: any; action?: string; tabsBase?: string }) {
  const { mode, hidden, href, qtext, fromQ, toQ, dateMode, adults, children, rooms } = d;
  const carry = (
    <>
      {hidden.map(([k, v]: [string, string]) => <input key={k} type="hidden" name={k} value={v} />)}
    </>
  );
  return (
    <div className="staycard">
      <div className="staytabs">
        <Link href={href({ mode: 'monthly', kind: '', sort: '', fr: '', pr: '' }, tabsBase)} className={`staytab ${mode === 'monthly' ? 'on' : ''}`}>เช่ารายเดือน</Link>
        <Link href={href({ mode: 'daily', kind: '', sort: '', fr: '', pr: '' }, tabsBase)} className={`staytab ${mode === 'daily' ? 'on' : ''}`}>เช่ารายวัน</Link>
      </div>
      <form className="staysearch" method="GET" action={action}>
        {carry}
        {dateMode && <><input type="hidden" name="from" value={fromQ} /><input type="hidden" name="to" value={toQ} /></>}
        {adults > 1 && <input type="hidden" name="ad" value={String(adults)} />}
        {children > 0 && <input type="hidden" name="ch" value={String(children)} />}
        {rooms ? <input type="hidden" name="rooms" value={String(rooms)} /> : null}
        <span className="gf-ic"><Icon n="search" size={17} /></span>
        <span className="gf-cell"><span className="gf-l">ค้นหา</span><input name="q" defaultValue={qtext} placeholder="ชื่อที่พัก / ย่าน" autoComplete="off" /></span>
        {qtext && <Link className="ss-x" href={href({ q: '' }, action)} aria-label="ล้างคำค้น"><Icon n="x" size={16} /></Link>}
      </form>
      {/* where/when/who in one form → one CTA. picker writes from/to; StayGuests writes ad/ch/rooms; hidden carries the rest. */}
      <form className="staydates" method="GET" action={action}>
        {carry}
        {mode === 'daily' && <DateRangePicker mode="range" split fromName="from" toName="to" labelFrom="เช็คอิน" labelTo="เช็คเอาท์" initialFrom={fromQ || undefined} initialTo={toQ || undefined} />}
        <StayGuests adultsName="ad" childrenName="ch" roomsName="rooms" initialAdults={adults} initialChildren={children} initialRooms={rooms || 1} showRooms={mode === 'daily'} roomsLive={dateMode} />
        <button type="submit" className="staydates-go"><Icon n="search" size={15} /> {mode === 'daily' ? 'ค้นหาวันว่าง' : 'ค้นหา'}</button>
        {dateMode && <Link className="staydates-clear" href={href({}, action)}>ล้างวันที่</Link>}
      </form>
    </div>
  );
}
