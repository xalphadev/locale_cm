import { q, i18n, cover, DEMO_USER } from '@/lib/db';
import { Icon, CAT_ICON } from '../../icons';
import { toggleSaveAction } from '../../actions';
import { facetLabel, STAY_KIND_TH } from '@/lib/facets';
import { parsePoint } from '@/lib/geo';
import { RoomCard, rentText, roomVacancy, FURNISH_TH, fmtDate, stayDaysAgo } from '../../RoomCard';
import { StayGallery } from '../../Lightbox';

export const dynamic = 'force-dynamic';

const DKEY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const lineHref = (id?: string | null) => { if (!id) return null; const h = id.trim().replace(/^@/, ''); return /^[a-zA-Z0-9._-]+$/.test(h) ? `https://line.me/R/ti/p/~${h}` : null; };

function Fact({ icon, label, value }: { icon: string; label: string; value: string }) {
  return <div className="factitem"><span className="factitem-ic"><Icon n={icon} size={17} /></span><div className="factitem-tx"><div className="factitem-l">{label}</div><div className="factitem-v">{value}</div></div></div>;
}

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
  // gallery: real photos if uploaded, else several varied stock room photos so there's more to see
  const gallery: string[] = (u.image_urls && u.image_urls.length >= 2) ? u.image_urls
    : (u.image_urls && u.image_urls.length === 1)
      ? [u.image_urls[0], ...[1, 2, 3].map((k) => cover(`g-${u.id}-${k}`, 'stay', 'see', 760, 520))]
      : [0, 1, 2, 3, 4].map((k) => cover(`g-${u.id}-${k}`, 'stay', 'see', 760, 520));
  const pt = parsePoint(u.geo);
  const mapUrl = pt ? `https://www.google.com/maps/search/?api=1&query=${pt.lat},${pt.lng}` : '#';
  const hours = u.opening_hours ?? {};
  const thHr = hours[DKEY[new Date().getDay()]];
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
      <StayGallery images={gallery} backHref="/stay" />

      <div className="dbody">
        <span className="rkind"><Icon n={CAT_ICON[u.stay_kind] || 'bed'} size={13} /> {STAY_KIND_TH[u.stay_kind] || 'ที่พัก'}</span>
        <h1 className="rtitle">{i18n(u.name_i18n)}</h1>
        <div className="rmeta"><Icon n="pin" size={13} /> {i18n(u.shop_name)}{u.district_name ? ` · ${i18n(u.district_name)}` : ''}</div>

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

        <h2 className="rsec"><span className="rsec-ic"><Icon n="bed" size={15} /></span>รายละเอียดห้อง</h2>
        <div className="factgrid">
          {u.capacity && <Fact icon="users" label="รองรับ" value={`${u.capacity} ท่าน`} />}
          {u.deposit_minor != null && <Fact icon="ticket" label="เงินมัดจำ" value={`฿${Math.round(u.deposit_minor / 100).toLocaleString()}`} />}
          {u.min_stay && <Fact icon="calendar" label="สัญญาขั้นต่ำ" value={`${u.min_stay} ${monthly ? 'เดือน' : 'คืน'}`} />}
          {u.room_size_sqm && <Fact icon="ruler" label="ขนาดห้อง" value={`${u.room_size_sqm} ตร.ม.`} />}
          {u.furnished && FURNISH_TH[u.furnished] && <Fact icon="sofa" label="เฟอร์นิเจอร์" value={FURNISH_TH[u.furnished]} />}
          {monthly && u.available_from && <Fact icon="clock" label="ว่างตั้งแต่" value={fmtDate(u.available_from)} />}
        </div>

        {(amen.length > 0 || bills.length > 0) && (<>
          <h2 className="rsec"><span className="rsec-ic"><Icon n="sparkles" size={15} /></span>สิ่งอำนวยความสะดวก</h2>
          {amen.length > 0 && <div className="chips">{amen.map((a) => <span className="chip" key={a}><Icon n="check" size={12} /> {facetLabel(a)}</span>)}</div>}
          {bills.length > 0 && <div className="rbills"><Icon n="check" size={14} /> รวมในค่าเช่า: {bills.map((b) => facetLabel(b)).join(' · ')}</div>}
        </>)}

        {(i18n(u.description_i18n) || i18n(u.place_desc)) && (<>
          <h2 className="rsec"><span className="rsec-ic"><Icon n="feed" size={15} /></span>รายละเอียด</h2>
          <p className="desc">{i18n(u.description_i18n) || i18n(u.place_desc)}</p>
        </>)}

        <h2 className="rsec"><span className="rsec-ic"><Icon n="pin" size={15} /></span>ที่พัก</h2>
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
          <h2 className="rsec"><span className="rsec-ic"><Icon n="bed" size={15} /></span>ห้องอื่นในที่พักนี้</h2>
          <div className="prail">{others.map((o) => <RoomCard key={o.id} u={{ ...o, stay_kind: u.stay_kind }} line_id={u.line_id} phone={u.phone} />)}</div>
        </>)}

        <p className="shopnote"><Icon n="chat" size={13} /> ไม่มีระบบจอง/จ่ายเงินในแอป — ติดต่อที่พักโดยตรงเพื่อสอบถาม/จอง</p>
      </div>
    </>
  );
}
