import { q, i18n, DEMO_USER } from '@/lib/db';
import { Icon, CAT_ICON } from '../../icons';
import { toggleSaveAction } from '../../actions';
import { facetLabel } from '@/lib/facets';
import { parsePoint } from '@/lib/geo';
import { Collage } from '../../feed/parts';
import { RoomCard, rentText, roomVacancy, roomImages, FURNISH_TH, fmtDate, stayDaysAgo } from '../../RoomCard';

export const dynamic = 'force-dynamic';

const DAYS: [string, string][] = [['mon', 'จันทร์'], ['tue', 'อังคาร'], ['wed', 'พุธ'], ['thu', 'พฤหัส'], ['fri', 'ศุกร์'], ['sat', 'เสาร์'], ['sun', 'อาทิตย์']];
const DKEY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const lineHref = (id?: string | null) => { if (!id) return null; const h = id.trim().replace(/^@/, ''); return /^[a-zA-Z0-9._-]+$/.test(h) ? `https://line.me/R/ti/p/~${h}` : null; };

export default async function StayUnitDetail({ params }: { params: { id: string } }) {
  let u: any = null; let others: any[] = [];
  try {
    [u] = await q<any>(
      `SELECT su.id, su.name_i18n, su.description_i18n, su.rental_mode, su.price_minor, su.price_period, su.price_text_i18n,
              su.image_urls, su.available_units, su.available_from, su.daily_status, su.availability_updated_at,
              su.capacity, su.deposit_minor, su.min_stay, su.room_size_sqm, su.furnished, su.bills_included, su.unit_amenities,
              p.id place_id, p.name_i18n shop_name, p.stay_kind, p.description_i18n place_desc, p.phone, p.line_id, p.website,
              p.opening_hours, p.geo::text geo, d.name_i18n district_name,
              f.freshness_label::text fresh, f.last_verified_at,
              EXISTS(SELECT 1 FROM saved_places sp WHERE sp.place_id=p.id AND sp.user_id=$2) saved
         FROM stay_units su JOIN places p ON p.id=su.place_id
         LEFT JOIN districts d ON d.id=p.district_id LEFT JOIN data_freshness f ON f.place_id=p.id
        WHERE su.id=$1 AND su.status='published' AND p.status='published' AND p.is_visible`, [params.id, DEMO_USER]);
    if (u) {
      others = await q<any>(
        `SELECT id, name_i18n, rental_mode, price_minor, price_period, price_text_i18n, image_urls,
                available_units, available_from, daily_status, availability_updated_at, capacity, deposit_minor, min_stay, furnished
           FROM stay_units WHERE place_id=$1 AND id<>$2 AND status='published'
          ORDER BY (CASE WHEN (rental_mode='monthly' AND available_units=0) OR (rental_mode='daily' AND daily_status='full') THEN 1 ELSE 0 END), sort, price_minor LIMIT 8`,
        [u.place_id, u.id]);
    }
  } catch { /* db down */ }

  if (!u) {
    return (<><div className="top"><a className="back" href="/stay"><Icon n="back" size={18} /> ที่พัก</a><h1>ไม่พบห้องพัก</h1></div>
      <div className="feed"><p className="empty">ห้องนี้อาจถูกปิดหรือที่พักยังไม่เผยแพร่</p></div></>);
  }

  const monthly = u.rental_mode === 'monthly';
  const chip = roomVacancy(u);
  const imgs = roomImages(u);
  const pt = parsePoint(u.geo);
  const mapUrl = pt ? `https://www.google.com/maps/search/?api=1&query=${pt.lat},${pt.lng}` : '#';
  const hours = u.opening_hours ?? {};
  const dkey = DKEY[new Date().getDay()];
  const thHr = hours[dkey];
  const hhmm = new Date().toTimeString().slice(0, 5);
  const openNow = !!(thHr && thHr !== 'closed' && hhmm >= thHr.split('-')[0] && hhmm <= thHr.split('-')[1]);
  const vDays = u.last_verified_at ? Math.floor((Date.now() - new Date(u.last_verified_at).getTime()) / 86400000) : null;
  const vText = vDays == null ? '' : vDays <= 0 ? 'วันนี้' : vDays === 1 ? 'เมื่อวาน' : `${vDays} วันก่อน`;
  const line = lineHref(u.line_id);
  const cta = line ? { href: line, label: 'ทักไลน์สอบถาม/จองห้องนี้', icon: 'chat' as const, ext: true, cls: 'line' }
    : u.phone ? { href: `tel:${u.phone}`, label: 'โทรสอบถาม', icon: 'phone' as const, ext: false, cls: 'tel' } : null;

  const bills: string[] = u.bills_included ?? [];
  const amen: string[] = u.unit_amenities ?? [];

  return (
    <>
      <div className="top"><a className="back" href="/stay"><Icon n="back" size={18} /> ที่พัก</a></div>
      <Collage imgs={imgs} href="#" />

      <div className="dbody">
        <span className="fact" style={{ marginBottom: 6 }}><Icon n={CAT_ICON[u.stay_kind] || 'bed'} size={14} /> {facetLabel(u.stay_kind) || 'ที่พัก'}</span>
        <h1 className="rtitle">{i18n(u.name_i18n)}</h1>
        <div className="rmeta">ที่ <b>{i18n(u.shop_name)}</b>{u.district_name ? ` · ${i18n(u.district_name)}` : ''}</div>

        <div className="rhead">
          <span className="rprice">{rentText(u)}</span>
          <span className={`rchip ${chip.cls}`}>{chip.label}</span>
        </div>
        <div className="pcfresh" style={{ margin: '2px 0 10px' }}>อัปเดตห้องว่าง {stayDaysAgo(u.availability_updated_at) <= 0 ? 'วันนี้' : `${stayDaysAgo(u.availability_updated_at)} วันก่อน`}</div>

        {cta
          ? <a className={`roomcta-btn ${cta.cls}`} href={cta.href} {...(cta.ext ? { target: '_blank', rel: 'noopener' } : {})}><Icon n={cta.icon} size={18} /> {cta.label}</a>
          : <span className="roomcta-btn off"><Icon n="chat" size={18} /> ติดต่อที่พัก</span>}
        <div className="pcfresh" style={{ textAlign: 'center', margin: '6px 0 2px' }}>ไม่มีระบบจอง/จ่ายเงินในแอป — ติดต่อที่พักโดยตรง</div>

        {u.fresh && (
          <div className="trust">
            <span className="ti"><Icon n="check" size={18} /></span>
            <div className="tt"><b>ตรวจสอบโดยทีมงานท้องถิ่น</b> · {vText}<br />
              <span className="muted">ทีมงานยืนยันว่าที่พักนี้มีจริง — กันประกาศหลอก/มัดจำลม</span></div>
          </div>
        )}

        <h2>รายละเอียดห้อง</h2>
        <div className="chips">
          {u.capacity && <span className="chip">รับ {u.capacity} ท่าน</span>}
          {monthly && u.available_from && <span className="chip">ว่าง {fmtDate(u.available_from)}</span>}
          {u.deposit_minor != null && <span className="chip">มัดจำ ฿{Math.round(u.deposit_minor / 100).toLocaleString()}</span>}
          {u.min_stay && <span className="chip">ขั้นต่ำ {u.min_stay} {monthly ? 'เดือน' : 'คืน'}</span>}
          {u.room_size_sqm && <span className="chip">{u.room_size_sqm} ตร.ม.</span>}
          {u.furnished && FURNISH_TH[u.furnished] && <span className="chip">{FURNISH_TH[u.furnished]}</span>}
        </div>

        {bills.length > 0 && (<><h3 className="rsub">รวมในค่าเช่า</h3><div className="chips">{bills.map((b) => <span className="chip" key={b}><Icon n="check" size={12} /> {facetLabel(b)}</span>)}</div></>)}
        {amen.length > 0 && (<><h3 className="rsub">สิ่งอำนวยความสะดวก</h3><div className="chips">{amen.map((a) => <span className="chip" key={a}>{facetLabel(a)}</span>)}</div></>)}
        {(i18n(u.description_i18n) || i18n(u.place_desc)) && <p className="desc">{i18n(u.description_i18n) || i18n(u.place_desc)}</p>}

        <h2>ที่พัก</h2>
        <div className="info">
          {u.district_name && <div className="info-row"><Icon n="pin" size={18} className="flat-ico" /><span>{i18n(u.district_name)} · เชียงใหม่</span></div>}
          {Object.keys(hours).length > 0 && <div className="info-row"><Icon n="clock" size={18} className="flat-ico" /><span className={openNow ? 'is-open' : 'is-closed'}>{openNow ? 'เปิดรับติดต่อตอนนี้' : 'นอกเวลาทำการ'}{thHr && thHr !== 'closed' ? ` · วันนี้ ${thHr}` : ''}</span></div>}
          {u.phone && <div className="info-row"><Icon n="phone" size={18} className="flat-ico" /><a href={`tel:${u.phone}`}>{u.phone}</a></div>}
          {u.line_id && <div className="info-row"><Icon n="chat" size={18} className="flat-ico" /><span>LINE: {u.line_id}</span></div>}
          {u.website && <div className="info-row"><Icon n="globe" size={18} className="flat-ico" /><a href={u.website}>{u.website}</a></div>}
          {pt && <div className="info-row"><Icon n="directions" size={18} className="flat-ico" /><a href={mapUrl} target="_blank">เปิดใน Google Maps</a></div>}
          <div className="info-row"><Icon n="map" size={18} className="flat-ico" /><a href={`/stay?view=map&focus=${u.place_id}`}>ดูบนแผนที่ที่พัก</a></div>
          <div className="info-row"><Icon n="bookmark" size={18} className="flat-ico" />
            <form action={toggleSaveAction.bind(null, u.place_id)}><button className="linklike" type="submit">{u.saved ? 'บันทึกที่พักนี้แล้ว' : 'บันทึกที่พักนี้'}</button></form></div>
        </div>

        {others.length > 0 && (<>
          <h2>ห้องอื่นในที่พักนี้</h2>
          <div className="prail">{others.map((o) => <RoomCard key={o.id} u={{ ...o, stay_kind: u.stay_kind }} line_id={u.line_id} phone={u.phone} />)}</div>
        </>)}

        <p className="shopnote"><Icon n="chat" size={13} /> ไม่มีระบบจอง/จ่ายเงินในแอป — ติดต่อที่พักโดยตรงเพื่อสอบถาม/จอง</p>
      </div>
    </>
  );
}
