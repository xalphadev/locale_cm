import { redirect } from 'next/navigation';
import { Icon } from '../icons';
import { PlaceStayCard } from './PlaceStayCard';
import { StayRailCard } from './StayRailCard';
import { SearchControls } from './SearchControls';
import { loadStay } from './query';
import { loadStayHome } from './home-query';
import { STAY_KIND_TH } from '@/lib/facets';

export const dynamic = 'force-dynamic';

function Rail({ title, items, more }: { title: string; items: any[]; more: string }) {
  if (!items.length) return null;
  return (
    <section className="staysec">
      <div className="staysec-h"><h2>{title}</h2><a className="staysec-more" href={more}>ดูทั้งหมด <Icon n="chevR" size={14} /></a></div>
      <div className="stayrail">{items.map((p) => <StayRailCard key={p.id} p={p} />)}</div>
    </section>
  );
}

// /stay = DISCOVERY HOME for accommodations. Search card on top, then curated rails (honest data, no money).
// The actual results LIST lives on /stay/search (reached via the CTA or any curated link); /stay/map = map.
export default async function Stay({ searchParams }: { searchParams: Record<string, string> }) {
  const sp = searchParams || {};
  // back-compat: an old deep search (q/dates/filters) lands on the results route, not the home
  const hasSearch = !!(sp.q || sp.kind || sp.sort || sp.am || sp.fr || sp.pr || sp.district || sp.saved
    || (sp.from && sp.to) || Number(sp.ad) > 1 || Number(sp.ch) > 0 || sp.rooms);
  if (hasSearch) redirect('/stay/search?' + new URLSearchParams(sp).toString());

  const d = await loadStay(sp);
  const home = await loadStayHome(sp);
  const { mode } = home;
  const m = mode === 'daily' ? 'mode=daily&' : '';

  return (
    <div className="staybg">
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

      <SearchControls d={d} action="/stay/search" tabsBase="/stay" />

      {home.kinds.length > 0 && (
        <section className="staysec">
          <div className="staysec-h"><h2>ตามประเภทที่พัก</h2></div>
          <div className="staytiles">
            {home.kinds.map((k) => (
              <a key={k.kind} className="staytile" href={`/stay/search?${m}kind=${k.kind}`}>
                <span className="staytile-ic"><Icon n="bed" size={19} /></span>
                <span className="staytile-tx"><b>{STAY_KIND_TH[k.kind] || 'ที่พัก'}</b><span>{k.n} ที่</span></span>
              </a>
            ))}
          </div>
        </section>
      )}

      <Rail title="ว่างคืนนี้" items={home.tonight} more="/stay/search?mode=daily&sort=vacant" />

      {home.areas.length > 0 && (
        <section className="staysec">
          <div className="staysec-h"><h2>ตามย่าน</h2></div>
          <div className="stayareas">
            {home.areas.map((a) => (
              <a key={a.slug} className="stayarea" href={`/stay/search?${m}district=${a.slug}`}>{a.name} <span className="stayarea-n">{a.n}</span></a>
            ))}
          </div>
        </section>
      )}

      <Rail title="ที่พักแนะนำ" items={home.featured} more={`/stay/search?${m}sort=new`} />
      <Rail title="ยอดนิยม" items={home.popular} more={`/stay/search?${m}sort=popular`} />
      <Rail title="ราคาคุ้มค่า" items={home.value} more={`/stay/search?${m}sort=cheap`} />

      {home.saved.length > 0 && (
        <section className="staysec">
          <div className="staysec-h"><h2>บันทึกไว้</h2><a className="staysec-more" href="/stay/search?saved=1">ดูทั้งหมด <Icon n="chevR" size={14} /></a></div>
          <div className="staylist">{home.saved.map((p: any) => <PlaceStayCard key={p.id} p={p} />)}</div>
        </section>
      )}

      <div className="staysec">
        <a className="staymaplink" href="/stay/search"><Icon n="feed" size={16} /> ดูที่พักทั้งหมด (รายการ)</a>
        <a className="staymaplink" href="/stay/map"><Icon n="map" size={16} /> ดูที่พักบนแผนที่</a>
      </div>
      <p className="shopnote" style={{ margin: '12px 16px 22px' }}><Icon n="chat" size={13} /> ติดต่อที่พักโดยตรงเพื่อสอบถาม/จอง — Locale ยังไม่มีระบบจอง/ชำระเงินในแอป</p>
    </div>
  );
}
