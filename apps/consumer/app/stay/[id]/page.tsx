import Link from 'next/link';
import { q, i18n, cover, demoUserId } from '@/lib/db';
import { Icon, CAT_ICON } from '../../icons';
import { toggleSaveAction, submitBookingRequestAction } from '../../actions';
import DateRangePicker from '../../DateRangePicker';
import { StayAvailability } from '../StayAvailability';
import { facetLabel, STAY_KIND_TH } from '@/lib/facets';
import { stayAmenityLabels } from '@/lib/amenities';
import { parsePoint } from '@/lib/geo';
import { RoomCard, rentText, roomVacancy, FURNISH_TH, fmtDate, stayDaysAgo } from '../../RoomCard';
import { StayGallery } from '../../Lightbox';
import { ReviewForm } from '../../place/[id]/ReviewForm';
import { ReviewsFeed } from '../../place/[id]/ReviewsFeed';

export const dynamic = 'force-dynamic';

const DKEY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const lineHref = (id?: string | null) => { if (!id) return null; const h = id.trim().replace(/^@/, ''); return /^[a-zA-Z0-9._-]+$/.test(h) ? `https://line.me/R/ti/p/~${h}` : null; };

function Fact({ icon, label, value }: { icon: string; label: string; value: string }) {
  return <div className="factitem"><span className="factitem-ic"><Icon n={icon} size={17} /></span><div className="factitem-tx"><div className="factitem-l">{label}</div><div className="factitem-v">{value}</div></div></div>;
}

export default async function StayUnitDetail({ params, searchParams }: { params: { id: string }; searchParams: { sent?: string; err?: string; from?: string; to?: string; reviewed?: string } }) {
  let u: any = null; let others: any[] = []; let seasonalRates: any[] = []; let avail: any[] = [];
  let rev: any = null; let reviews: any[] = []; let dist: any[] = []; let canReview = false; let myReview: any = null; let loggedIn = false;
  let brand: any = null; let branchCount = 0;
  try {
    const uid = await demoUserId();
    [u] = await q<any>(
      `SELECT su.id, su.name_i18n, su.description_i18n, su.rental_mode, su.price_minor, su.price_period, su.price_text_i18n,
              su.image_urls, su.available_units, su.available_from, su.daily_status, su.availability_updated_at, su.managed,
              su.capacity, su.deposit_minor, su.min_stay, su.room_size_sqm, su.furnished, su.bills_included, su.unit_amenities,
              su.bedrooms, su.bathrooms, su.gender_policy, su.check_in_time, su.check_out_time, su.attrs,
              p.id place_id, p.brand_id, p.name_i18n shop_name, p.stay_kind, p.description_i18n place_desc, p.phone, p.line_id, p.website, p.pay_online_enabled, p.manages_stay,
              p.opening_hours, p.geo::text geo, d.name_i18n district_name,
              f.freshness_label::text fresh, f.last_verified_at,
              EXISTS(SELECT 1 FROM saved_places sp WHERE sp.place_id=p.id AND sp.user_id=$2) saved
         FROM stay_units su JOIN places p ON p.id=su.place_id
         LEFT JOIN districts d ON d.id=p.district_id LEFT JOIN data_freshness f ON f.place_id=p.id
        WHERE su.id=$1 AND su.status='published' AND su.deleted_at IS NULL AND p.status='published' AND p.is_visible`, [params.id, uid]);
    if (u) {
      others = await q<any>(
        `SELECT id, name_i18n, rental_mode, price_minor, price_period, price_text_i18n, image_urls,
                available_units, available_from, daily_status, availability_updated_at, managed, capacity, deposit_minor, min_stay, furnished
           FROM stay_units WHERE place_id=$1 AND id<>$2 AND status='published' AND deleted_at IS NULL
          ORDER BY (CASE WHEN (rental_mode='monthly' AND available_units=0) OR (rental_mode='daily' AND daily_status='full') THEN 1 ELSE 0 END), sort, price_minor LIMIT 8`,
        [u.place_id, u.id]);
      // brand identity + count of OTHER published branches of the same chain (self-activates only for a real chain)
      if (u.brand_id) {
        [brand] = await q<any>(`SELECT name_i18n, logo_url FROM brands WHERE id=$1 AND deleted_at IS NULL`, [u.brand_id]);
        const [bc] = await q<any>(`SELECT count(*)::int n FROM places WHERE brand_id=$1 AND id<>$2 AND status='published'`, [u.brand_id, u.place_id]);
        branchCount = bc?.n ?? 0;
      }
      seasonalRates = await q<any>(
        `SELECT r.price_minor, r.price_period, r.start_date, r.end_date, r.season_id, s.label_i18n season_label
           FROM stay_rate r LEFT JOIN stay_season s ON s.id = r.season_id
          WHERE r.stay_unit_id=$1 AND r.deleted_at IS NULL AND (s.id IS NULL OR s.deleted_at IS NULL)
          ORDER BY r.price_minor`, [u.id]);
      if (u.rental_mode === 'daily' && u.managed) {
        avail = await q<any>(
          `SELECT to_char(d,'YYYY-MM-DD') AS day, count(r.id)::int total,
                  count(r.id) FILTER (WHERE NOT EXISTS (SELECT 1 FROM stay_occupancy_block b WHERE b.room_id=r.id AND b.status='active' AND b.deleted_at IS NULL AND b.block_kind IN ('stay','tenancy','maintenance') AND b.span @> d::date))::int free
             FROM generate_series(CURRENT_DATE, CURRENT_DATE + 60, interval '1 day') d
             CROSS JOIN stay_room r
            WHERE r.stay_unit_id=$1 AND r.status='active' AND r.deleted_at IS NULL
            GROUP BY d ORDER BY d`, [u.id]);
      }
      // reviews are place-level (place_id) — same data the /place page shows; eligibility = a check-in fact here
      [rev] = await q<any>(`SELECT count(*)::int n, COALESCE(round(avg(rating),1),0)::text avg FROM reviews WHERE place_id=$1 AND moderation_status='approved'`, [u.place_id]);
      reviews = await q<any>(`SELECT r.id, r.rating, r.body_i18n, pr.display_name, to_char(r.created_at,'YYYY-MM-DD') d FROM reviews r LEFT JOIN profiles pr ON pr.user_id=r.user_id WHERE r.place_id=$1 AND r.moderation_status='approved' ORDER BY r.created_at DESC, r.rating DESC LIMIT 8`, [u.place_id]);
      dist = await q<any>(`SELECT rating, count(*)::int c FROM reviews WHERE place_id=$1 AND moderation_status='approved' GROUP BY rating`, [u.place_id]);
      if (uid) {
        loggedIn = true;
        const [ci] = await q<any>(`SELECT 1 FROM check_ins WHERE user_id=$1 AND place_id=$2 LIMIT 1`, [uid, u.place_id]);
        canReview = !!ci;
        [myReview] = await q<any>(`SELECT rating, body_i18n FROM reviews WHERE user_id=$1 AND place_id=$2 AND moderation_status<>'rejected' LIMIT 1`, [uid, u.place_id]);
      }
    }
  } catch { /* db down */ }

  if (!u) {
    return (<><div className="top"><Link className="back" href="/stay"><Icon n="back" size={18} /> ที่พัก</Link><h1>ไม่พบห้องพัก</h1></div>
      <div className="feed"><p className="empty">ห้องนี้อาจถูกปิดหรือที่พักยังไม่เผยแพร่</p></div></>);
  }

  const monthly = u.rental_mode === 'monthly';
  // per-type display gates — mirror RoomForm's capture manifest so detail shows only the fields a kind owns
  const kind = u.stay_kind || '';
  const isRoomKind = ['apartment', 'condo', 'house', 'mansion'].includes(kind);
  const isSharedKind = ['dorm', 'hostel'].includes(kind);
  const isHostKind = ['homestay', 'guesthouse'].includes(kind);
  const isBuildingKind = ['dorm', 'hostel', 'apartment', 'condo', 'mansion', 'hotel', 'guesthouse'].includes(kind);
  const scoredP = (rev?.n ?? 0) >= 5;   // fairness gate — numeric score only with ≥5 approved reviews
  const distMap: Record<number, number> = {}; for (const dd of dist) distMap[dd.rating] = dd.c;
  const reviewTotal = (rev?.n ?? 0) || 1;
  const reD = /^\d{4}-\d{2}-\d{2}$/;
  const fromQ = reD.test(searchParams?.from || '') ? searchParams.from! : '';
  const toQ = reD.test(searchParams?.to || '') ? searchParams.to! : '';
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
  const booking = !!u.manages_stay;   // the place opted into "ระบบการจอง" — show in-app booking; else contact-only listing
  const bills: string[] = u.bills_included ?? [];
  const amen: string[] = u.unit_amenities ?? [];
  const aml = await stayAmenityLabels();           // catalog labels (incl admin-added) for display
  const alabel = (k: string) => aml[k] || facetLabel(k);

  return (
    <>
      <StayGallery images={gallery} backHref="/stay" />

      <div className="dbody">
        <span className="rkind"><Icon n={CAT_ICON[u.stay_kind] || 'bed'} size={13} /> {STAY_KIND_TH[u.stay_kind] || 'ที่พัก'}</span>
        <h1 className="rtitle">{i18n(u.name_i18n)}</h1>
        <div className="rmeta"><Icon n="pin" size={13} /> <Link href={`/place/${u.place_id}`} style={{ color: 'inherit' }}>{i18n(u.shop_name)}</Link>{u.district_name ? ` · ${i18n(u.district_name)}` : ''}</div>
        {brand && (brand.logo_url || branchCount > 0) && (
          <Link className="dhead-brand" href={`/brand/${u.brand_id}`} style={{ textDecoration: 'none' }}>
            {brand.logo_url && <img src={brand.logo_url} alt="" />}
            {branchCount > 0 ? `สาขาของ ${i18n(brand.name_i18n)} · อีก ${branchCount} สาขา` : i18n(brand.name_i18n)}
            {branchCount > 0 && <Icon n="chevR" size={14} />}
          </Link>
        )}

        <div className="rhead">
          <span className="rprice">{rentText(u)}</span>
          <span className={`rchip ${chip.cls}`}>{chip.label}</span>
        </div>
        <div className="pcfresh" style={{ margin: '2px 0 10px' }}>อัปเดตห้องว่าง {stayDaysAgo(u.availability_updated_at) <= 0 ? 'วันนี้' : `${stayDaysAgo(u.availability_updated_at)} วันก่อน`}</div>

        {cta
          ? <Link className={`roomcta-btn ${cta.cls}`} href={cta.href} {...(cta.ext ? { target: '_blank', rel: 'noopener' } : {})}><Icon n={cta.icon} size={18} /> {cta.label}</Link>
          : <span className="roomcta-btn off"><Icon n="chat" size={18} /> ติดต่อที่พัก</span>}
        {!booking && <div className="pcfresh" style={{ textAlign: 'center', margin: '6px 0 2px' }}>ที่พักนี้ไม่รับจองในแอป — ติดต่อโดยตรงเพื่อสอบถาม/จอง</div>}

        {avail.length > 0 && (<>
          <h2 className="rsec"><span className="rsec-ic"><Icon n="calendar" size={15} /></span>ปฏิทินคืนว่าง</h2>
          <StayAvailability days={avail} />
        </>)}

        {searchParams?.sent && <div className="booksent"><Icon n="check" size={16} /> ส่งคำขอแล้ว — ที่พักจะติดต่อกลับหาคุณ · <Link href="/stay/requests">ดูคำขอของฉัน</Link></div>}
        {searchParams?.err === 'contact' && <div className="bookerr">กรุณากรอกชื่อ และเบอร์โทรหรือไลน์อย่างน้อยหนึ่งช่อง</div>}
        {searchParams?.err === 'full' && <div className="bookerr">ช่วงวันที่นี้เต็มแล้ว — เลือกวันอื่น หรือดู “ปฏิทินคืนว่าง” ด้านบน</div>}
        {searchParams?.err === 'past' && <div className="bookerr">เลือกวันที่ในอนาคต — จองย้อนหลังไม่ได้</div>}
        {searchParams?.err === 'toomany' && <div className="bookerr">คุณมีคำขอที่ยังรออยู่กับที่พักนี้หลายรายการแล้ว — รอการติดต่อกลับ หรือถอนคำขอเดิมที่ “คำขอของฉัน” ก่อน</div>}
        {booking && u.pay_online_enabled && u.price_minor != null && (
          <Link className="bookpay-cta" href={`/stay/${u.id}/book`}>
            <Icon n="calendar" size={18} /> <span>จองและชำระเงินออนไลน์</span>
            <b>฿{Math.round(u.price_minor / 100).toLocaleString()}/{monthly ? 'เดือน' : 'คืน'}</b>
          </Link>
        )}
        {booking && (
        <details className="bookbox" {...(fromQ ? { open: true } : {})}>
          <summary className="bookbox-sum"><Icon n="calendar" size={17} /> ขอให้ที่พักติดต่อกลับ / นัดดู·จองห้องนี้</summary>
          <form className="bookform" action={submitBookingRequestAction.bind(null, u.place_id, u.id)}>
            <label className="bk-field"><span>ต้องการ</span>
              <select name="request_kind" defaultValue={fromQ ? 'booking' : 'viewing'}>
                <option value="viewing">นัดดูห้อง</option>
                <option value="booking">ขอจอง</option>
                <option value="enquiry">สอบถามทั่วไป</option>
              </select>
            </label>
            <DateRangePicker
              mode={monthly ? 'single' : 'range'}
              fromName="desired_from" toName="desired_to"
              labelFrom={monthly ? 'อยากเข้าอยู่' : 'เช็คอิน'} labelTo="เช็คเอาท์"
              initialFrom={fromQ || undefined} initialTo={toQ || undefined}
            />
            {monthly && (
              <label className="bk-field"><span>ระยะเวลา</span>
                <select name="desired_months" defaultValue="3">
                  <option value="1">1 เดือน</option>
                  <option value="3">3 เดือน</option>
                  <option value="6">6 เดือน</option>
                  <option value="12">12 เดือน</option>
                </select>
              </label>
            )}
            <label className="bk-field"><span>ชื่อ *</span><input name="contact_name" required placeholder="ชื่อของคุณ" /></label>
            <div className="bk-row">
              <label className="bk-field"><span>เบอร์โทร</span><input name="contact_phone" inputMode="tel" placeholder="08x-xxx-xxxx" /></label>
              <label className="bk-field"><span>LINE ID</span><input name="contact_line" placeholder="@yourid" /></label>
            </div>
            <label className="bk-field"><span>ข้อความ (ถ้ามี)</span><textarea name="message" rows={2} placeholder="เช่น อยากดูห้องวันเสาร์บ่าย" /></label>
            <p className="bookconsent">การกดส่ง = ยินยอมให้ส่งชื่อและช่องทางติดต่อของคุณให้เจ้าของที่พักเพื่อติดต่อกลับ — ไม่ใช่การจอง/ชำระเงิน</p>
            <button className="roomcta-btn line" type="submit"><Icon n="chat" size={17} /> ส่งคำขอ</button>
          </form>
        </details>
        )}

        {u.fresh && (
          <div className="trust">
            <span className="ti"><Icon n="check" size={18} /></span>
            <div className="tt"><b>ตรวจสอบโดยทีมงานท้องถิ่น</b> · {vText}<br />
              <span className="muted">ทีมงานยืนยันว่าที่พักนี้มีจริง — กันประกาศหลอก/มัดจำลม</span></div>
          </div>
        )}

        <h2 className="rsec"><span className="rsec-ic"><Icon n="bed" size={15} /></span>รายละเอียดห้อง</h2>
        <div className="factgrid">
          {isRoomKind && u.bedrooms != null && <Fact icon="bed" label="ห้องนอน" value={`${u.bedrooms} ห้อง`} />}
          {isRoomKind && u.bathrooms != null && <Fact icon="bed" label="ห้องน้ำ" value={`${u.bathrooms} ห้อง`} />}
          {u.capacity && <Fact icon="users" label="รองรับ" value={`${u.capacity} ท่าน`} />}
          {isSharedKind && u.gender_policy && <Fact icon="users" label="เพศผู้เข้าพัก" value={u.gender_policy === 'female' ? 'หญิงล้วน' : u.gender_policy === 'male' ? 'ชายล้วน' : 'ทุกเพศ'} />}
          {!monthly && u.check_in_time && <Fact icon="clock" label="เช็คอิน" value={u.check_in_time} />}
          {!monthly && u.check_out_time && <Fact icon="clock" label="เช็คเอาท์" value={u.check_out_time} />}
          {monthly && u.deposit_minor != null && <Fact icon="ticket" label="เงินมัดจำ" value={`฿${Math.round(u.deposit_minor / 100).toLocaleString()}`} />}
          {u.min_stay && <Fact icon="calendar" label="สัญญาขั้นต่ำ" value={`${u.min_stay} ${monthly ? 'เดือน' : 'คืน'}`} />}
          {u.room_size_sqm && <Fact icon="ruler" label="ขนาดห้อง" value={`${u.room_size_sqm} ตร.ม.`} />}
          {u.furnished && FURNISH_TH[u.furnished] && <Fact icon="sofa" label="เฟอร์นิเจอร์" value={FURNISH_TH[u.furnished]} />}
          {!monthly && u.attrs?.breakfast && <Fact icon="check" label="อาหารเช้า" value="รวมในราคา" />}
          {!monthly && u.attrs?.cancellation && <Fact icon="ticket" label="การยกเลิก" value={u.attrs.cancellation === 'flexible' ? 'ยกเลิกฟรี' : u.attrs.cancellation === 'moderate' ? 'ปานกลาง' : 'เข้มงวด'} />}
          {monthly && u.available_from && <Fact icon="clock" label="ว่างตั้งแต่" value={fmtDate(u.available_from)} />}
        </div>
        {isHostKind && u.attrs?.host && (<>
          <h2 className="rsec"><span className="rsec-ic"><Icon n="chat" size={15} /></span>เจ้าบ้าน / บริการ</h2>
          <p className="desc">{u.attrs.host}</p>
        </>)}

        {(amen.length > 0 || bills.length > 0) && (<>
          <h2 className="rsec"><span className="rsec-ic"><Icon n="sparkles" size={15} /></span>สิ่งอำนวยความสะดวก</h2>
          {amen.length > 0 && <div className="chips">{amen.map((a) => <span className="chip" key={a}><Icon n="check" size={12} /> {alabel(a)}</span>)}</div>}
          {bills.length > 0 && <div className="rbills"><Icon n="check" size={14} /> รวมในค่าเช่า: {bills.map((b) => alabel(b)).join(' · ')}</div>}
        </>)}

        {isBuildingKind && u.attrs?.building?.length > 0 && (<>
          <h2 className="rsec"><span className="rsec-ic"><Icon n="sparkles" size={15} /></span>ส่วนกลาง / อาคาร</h2>
          <div className="chips">{u.attrs.building.map((a: string) => <span className="chip" key={a}><Icon n="check" size={12} /> {alabel(a)}</span>)}</div>
        </>)}

        {seasonalRates.length > 0 && (<>
          <h2 className="rsec"><span className="rsec-ic"><Icon n="ticket" size={15} /></span>ราคาตามช่วง</h2>
          <div className="ratecard">
            {u.price_minor != null && <div className="rate-row"><span>ราคาปกติ</span><b>฿{Math.round(u.price_minor / 100).toLocaleString()}/{monthly ? 'เดือน' : 'คืน'}</b></div>}
            {seasonalRates.map((r, i) => (
              <div className="rate-row" key={i}>
                <span>{r.season_id ? i18n(r.season_label) : `${fmtDate(r.start_date)}–${fmtDate(r.end_date)}`}</span>
                <b>฿{Math.round(r.price_minor / 100).toLocaleString()}/{r.price_period === 'month' ? 'เดือน' : 'คืน'}</b>
              </div>
            ))}
          </div>
          <div className="pcfresh" style={{ margin: '2px 0 6px' }}>ราคาตามช่วงเป็นราคาแสดง — สอบถาม/ยืนยันกับที่พักโดยตรง</div>
        </>)}

        {(i18n(u.description_i18n) || i18n(u.place_desc)) && (<>
          <h2 className="rsec"><span className="rsec-ic"><Icon n="feed" size={15} /></span>รายละเอียด</h2>
          <p className="desc">{i18n(u.description_i18n) || i18n(u.place_desc)}</p>
        </>)}

        <h2 className="rsec"><span className="rsec-ic"><Icon n="star" size={15} /></span>รีวิว{(rev?.n ?? 0) ? ` (${rev.n})` : ''}</h2>
        <ReviewForm placeId={u.place_id} loggedIn={loggedIn} canReview={canReview} mine={myReview ? { rating: myReview.rating, body: i18n(myReview.body_i18n) } : null} status={searchParams?.reviewed} backTo={`/stay/${u.id}`} />
        {(rev?.n ?? 0) === 0 ? (
          <p className="empty">ยังไม่มีรีวิว — เป็นคนแรกที่รีวิวที่พักนี้</p>
        ) : (<>
          {scoredP ? (
            <div className="rdist">
              <div className="rbig"><div className="n">{rev?.avg}</div><div className="s">{Array.from({ length: 5 }).map((_, k) => <Icon key={k} n="star" fill="currentColor" size={11} />)}</div><div className="c">{rev?.n} รีวิว</div></div>
              <div className="rbars">{[5, 4, 3, 2, 1].map((st) => (
                <div className="rbarrow" key={st}><span>{st}</span><span className="rtrack"><span className="rfill" style={{ width: `${Math.round(((distMap[st] || 0) / reviewTotal) * 100)}%` }} /></span></div>
              ))}</div>
            </div>
          ) : (
            <p className="muted" style={{ margin: '0 0 12px' }}>ที่พักนี้ยังใหม่ — มีรีวิวจากผู้เข้าพักจริง {rev?.n} คน (ยังไม่พอแสดงคะแนนเฉลี่ย เพื่อความเป็นธรรมกับที่พักใหม่)</p>
          )}
          <ReviewsFeed placeId={u.place_id} total={rev?.n ?? 0}
            initial={reviews.map((r) => ({ id: r.id, rating: r.rating, body: i18n(r.body_i18n), name: r.display_name, d: r.d }))} />
        </>)}

        <h2 className="rsec"><span className="rsec-ic"><Icon n="pin" size={15} /></span>ที่พัก</h2>
        <div className="info">
          {u.district_name && <div className="info-row"><Icon n="pin" size={18} className="flat-ico" /><span>{i18n(u.district_name)} · เชียงใหม่</span></div>}
          {Object.keys(hours).length > 0 && <div className="info-row"><Icon n="clock" size={18} className="flat-ico" /><span className={openNow ? 'is-open' : 'is-closed'}>{openNow ? 'เปิดรับติดต่อตอนนี้' : 'นอกเวลาทำการ'}{thHr && thHr !== 'closed' ? ` · วันนี้ ${thHr}` : ''}</span></div>}
          {u.phone && <div className="info-row"><Icon n="phone" size={18} className="flat-ico" /><a href={`tel:${u.phone}`}>{u.phone}</a></div>}
          {u.line_id && <div className="info-row"><Icon n="chat" size={18} className="flat-ico" /><span>LINE: {u.line_id}</span></div>}
          {u.website && <div className="info-row"><Icon n="globe" size={18} className="flat-ico" /><Link href={u.website}>{u.website}</Link></div>}
          {pt && <div className="info-row"><Icon n="directions" size={18} className="flat-ico" /><a href={mapUrl} target="_blank">เปิดใน Google Maps</a></div>}
          <div className="info-row"><Icon n="map" size={18} className="flat-ico" /><Link href={`/stay/map?focus=${u.place_id}`}>ดูบนแผนที่ที่พัก</Link></div>
          <div className="info-row"><Icon n="bookmark" size={18} className="flat-ico" />
            <form action={toggleSaveAction.bind(null, u.place_id)}><button className="linklike" type="submit">{u.saved ? 'บันทึกที่พักนี้แล้ว' : 'บันทึกที่พักนี้'}</button></form></div>
        </div>

        {others.length > 0 && (<>
          <h2 className="rsec"><span className="rsec-ic"><Icon n="bed" size={15} /></span>ห้องอื่นในที่พักนี้</h2>
          <div className="prail">{others.map((o) => <RoomCard key={o.id} u={{ ...o, stay_kind: u.stay_kind }} line_id={u.line_id} phone={u.phone} />)}</div>
        </>)}

        {booking
          ? <p className="shopnote"><Icon n="chat" size={13} /> {u.pay_online_enabled ? 'จองและชำระเงินออนไลน์ได้ในแอป — หรือส่งคำขอจอง/นัดดูห้อง แล้วที่พักจะติดต่อกลับ' : 'ส่งคำขอจอง/นัดดูห้องได้ในแอป — ที่พักจะติดต่อกลับ'}</p>
          : <p className="shopnote"><Icon n="chat" size={13} /> ติดต่อที่พักโดยตรงเพื่อสอบถาม/จอง</p>}
      </div>
    </>
  );
}
