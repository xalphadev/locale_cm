import { Icon } from '../../icons';
import StayFilterSheet from '../StayFilterSheet';
import { PlaceStayCard } from '../PlaceStayCard';
import { SearchControls } from '../SearchControls';
import { loadStay, PRICE, PRICE_LABEL } from '../query';

export const dynamic = 'force-dynamic';

// Results route — the full list experience (collapsing pill + sticky toolbar + chips + list + load-more),
// reached after the user searches on the /stay home or taps any curated link. Reuses loadStay unchanged.
export default async function StaySearch({ searchParams }: { searchParams: Record<string, string> }) {
  const d = await loadStay(searchParams);
  const { mode, kind, sort, am, fr, qtext, pr, cap, rooms, fromQ, toQ, dateMode, dateQs,
    placeList, activeCount, href, recapBits } = d;
  const n = Math.min(60, Math.max(18, parseInt(searchParams?.n || '18', 10) || 18));
  const shown = placeList.slice(0, n);

  return (
    <div className="staybg">
      <div className="staytop">
        <a className="back" href="/stay"><Icon n="back" size={18} /> ที่พัก</a>
      </div>

      {/* the search recap pill — always shown here; tap to expand & edit the search inline */}
      <details className="staysearchbox">
        <summary className="staypill">
          <span className="staypill-ic"><Icon n="search" size={16} /></span>
          <span className="staypill-recap">
            <b>{qtext || 'ที่พักทั้งหมด'}</b>
            <span className="staypill-sub">{recapBits.join(' · ')}</span>
          </span>
          <span className="staypill-edit">แก้ไข <Icon n="chevR" size={15} /></span>
        </summary>
        <div className="staysearch-body"><SearchControls d={d} action="/stay/search" tabsBase="/stay/search" /></div>
      </details>

      <div className="staytools stk">
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
        {shown.map((p: any) => <PlaceStayCard key={p.id} p={p} qs={dateQs} />)}
      </div>
      {placeList.length > shown.length && (
        <a className="loadmore" href={`${href({})}${href({}).includes('?') ? '&' : '?'}n=${n + 18}`}>ดูเพิ่มเติม ({placeList.length - shown.length})</a>
      )}
      {placeList.length === 0 && (
        <p className="empty">{(cap || rooms)
          ? <>ไม่พบที่พักที่รองรับ{cap ? ` ${cap} ท่าน` : ''}{rooms ? ` · ${rooms} ห้อง` : ''} — <a href={href({ ad: '', ch: '', rooms: '' })}>ลดจำนวนผู้เข้าพัก/ห้อง</a></>
          : dateMode
            ? <>ไม่มีที่พักที่ยืนยันว่างช่วง {fromQ}–{toQ} · <a href={href({})}>ดูทั้งหมด (ไม่ระบุวัน)</a> เพื่อสอบถามที่พักโดยตรง</>
            : 'ไม่พบที่พักที่ตรงตัวกรอง — ลองเอาตัวกรองออกบ้าง'}</p>
      )}
      <p className="shopnote" style={{ margin: '6px 16px 22px' }}><Icon n="chat" size={13} /> ติดต่อที่พักโดยตรงเพื่อสอบถาม/จอง — Locale ยังไม่มีระบบจอง/ชำระเงินในแอป</p>
    </div>
  );
}
