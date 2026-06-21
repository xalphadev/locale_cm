import { Icon } from '../icons';
import StayFilterSheet from './StayFilterSheet';
import { PlaceStayCard } from './PlaceStayCard';
import DateRangePicker from '../DateRangePicker';
import StayGuests from './StayGuests';
import { loadStay, PRICE, PRICE_LABEL } from './query';

export const dynamic = 'force-dynamic';

export default async function Stay({ searchParams }: { searchParams: Record<string, string> }) {
  const d = await loadStay(searchParams);
  const { mode, kind, sort, am, fr, qtext, pr, cap, rooms, fromQ, toQ, dateMode, dateQs,
    placeList, activeCount, hidden, href, searched, recapBits } = d;
  // server load-more (no infinite-scroll JS): ?n bumps the batch; SQL already caps at 60
  const n = Math.min(60, Math.max(18, parseInt(searchParams?.n || '18', 10) || 18));
  const shown = placeList.slice(0, n);

  // the search apparatus, shared by the expanded (fresh visitor) and collapsed (re-open) states
  const searchControls = (
    <div className="staycard">
      <form className="staysearch" method="GET" action="/stay">
        {hidden.map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
        {dateMode && <><input type="hidden" name="from" value={fromQ as string} /><input type="hidden" name="to" value={toQ as string} /></>}
        {cap && <input type="hidden" name="cap" value={cap} />}
        {rooms ? <input type="hidden" name="rooms" value={String(rooms)} /> : null}
        <Icon n="search" size={17} />
        <input name="q" defaultValue={qtext} placeholder="ค้นหาชื่อที่พัก / ย่าน" autoComplete="off" />
        {qtext && <a className="ss-x" href={href({ q: '' })} aria-label="ล้างคำค้น"><Icon n="x" size={16} /></a>}
      </form>
      <div className="segmented">
        <a href={href({ mode: 'monthly', kind: '', sort: '', fr: '', pr: '' })} className={`seg ${mode === 'monthly' ? 'on' : ''}`}>เช่ารายเดือน</a>
        <a href={href({ mode: 'daily', kind: '', sort: '', fr: '', pr: '' })} className={`seg ${mode === 'daily' ? 'on' : ''}`}>เช่ารายวัน</a>
      </div>
      {/* where/when/who in one form → one CTA. The picker writes from/to; StayGuests writes cap/rooms;
          hidden[] carries the rest. (Renders in both modes — guests applies to monthly leases too.) */}
      <form className="staydates" method="GET" action="/stay">
        {hidden.map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
        {mode === 'daily' && <DateRangePicker mode="range" compact fromName="from" toName="to" labelFrom="เช็คอิน" labelTo="เช็คเอาท์" initialFrom={fromQ || undefined} initialTo={toQ || undefined} />}
        <StayGuests capName="cap" roomsName="rooms" initialCap={Number(cap) || 1} initialRooms={rooms || 1} showRooms={mode === 'daily'} roomsLive={dateMode} />
        <button type="submit" className="staydates-go"><Icon n="search" size={15} /> {mode === 'daily' ? 'ค้นหาวันว่าง' : 'ค้นหา'}</button>
        {dateMode && <a className="staydates-clear" href={href({})}>ล้างวันที่</a>}
      </form>
    </div>
  );

  return (
    <>
      <div className="staytop">
        <a className="back" href="/"><Icon n="back" size={18} /> สำรวจ</a>
        <div className="staytop-row">
          <span className="staytop-ic"><Icon n="bed" size={23} /></span>
          <div className="staytop-tx">
            <h1>ที่พัก</h1>
            <div className="staytop-sub">หอพัก · อพาร์ตเมนต์ · โฮมสเตย์ ในนิมมาน / ใกล้ มช.</div>
          </div>
        </div>
      </div>

      {searched ? (
        <details className="staysearchbox">
          <summary className="staypill">
            <span className="staypill-ic"><Icon n="search" size={16} /></span>
            <span className="staypill-recap">
              <b>{qtext || 'ที่พักทั้งหมด'}</b>
              <span className="staypill-sub">{recapBits.join(' · ')}</span>
            </span>
            <span className="staypill-edit">แก้ไข <Icon n="chevR" size={15} /></span>
          </summary>
          <div className="staysearch-body">{searchControls}</div>
        </details>
      ) : searchControls}

      {/* sticky results toolbar: count + view toggle (map = its own route), then quick-filter chips */}
      <div className={`staytools ${searched ? 'stk' : ''}`}>
        <div className="staytools-top">
          <span className="staycount">พบ <b>{placeList.length}</b> ที่พัก</span>
          <div className="vtgroup">
            <span className="vtg on"><Icon n="feed" size={14} /> รายการ</span>
            <a href={href({}, '/stay/map')} className="vtg"><Icon n="map" size={14} /> แผนที่</a>
          </div>
        </div>
        <div className="staychips">
          <StayFilterSheet mode={mode} q={qtext} kind={kind} sort={sort} am={am} fr={fr} pr={pr} count={activeCount} from={fromQ as string} to={toQ as string} />
          <a href={href({ sort: sort === 'cheap' ? '' : 'cheap' })} className={`qchip ${sort === 'cheap' ? 'on' : ''}`}>ราคาถูกสุด</a>
          {Object.keys(PRICE[mode]).map((k) => (
            <a key={k} href={href({ pr: pr === k ? '' : k })} className={`qchip ${pr === k ? 'on' : ''}`}>{PRICE_LABEL[mode][k]}</a>
          ))}
        </div>
      </div>

      <h2 style={{ padding: '0 16px', margin: '12px 0 2px' }}>{mode === 'monthly' ? 'ที่พักให้เช่ารายเดือน' : dateMode ? 'ห้องว่างตามวันที่เลือก' : 'ที่พักรายวัน'}</h2>
      <div className="staylist">
        {shown.map((p) => <PlaceStayCard key={p.id} p={p} qs={dateQs} />)}
      </div>
      {placeList.length > shown.length && (
        <a className="loadmore" href={`${href({})}${href({}).includes('?') ? '&' : '?'}n=${n + 18}`}>ดูเพิ่มเติม ({placeList.length - shown.length})</a>
      )}
      {placeList.length === 0 && (
        <p className="empty">{(cap || rooms)
          ? <>ไม่พบที่พักที่รองรับ{cap ? ` ${cap} ท่าน` : ''}{rooms ? ` · ${rooms} ห้อง` : ''} — <a href={href({ cap: '', rooms: '' })}>ลดจำนวนผู้เข้าพัก/ห้อง</a></>
          : dateMode
            ? <>ไม่มีที่พักที่ยืนยันว่างช่วง {fromQ}–{toQ} · <a href={href({})}>ดูทั้งหมด (ไม่ระบุวัน)</a> เพื่อสอบถามที่พักโดยตรง</>
            : 'ไม่พบที่พักที่ตรงตัวกรอง — ลองเอาตัวกรองออกบ้าง'}</p>
      )}
      <p className="shopnote" style={{ margin: '6px 16px 22px' }}><Icon n="chat" size={13} /> ติดต่อที่พักโดยตรงเพื่อสอบถาม/จอง — Locale ยังไม่มีระบบจอง/ชำระเงินในแอป</p>
    </>
  );
}
