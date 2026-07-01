import Link from 'next/link';
import { q, i18n, cover, coverSet, pickCover, demoUserId } from '@/lib/db';
import { openNow as computeOpen, bkkNow } from '@/lib/local';
import { Icon, CAT_ICON, KIND_ICON } from '../../icons';
import { toggleSaveAction } from '../../actions';
import { facetLabel } from '@/lib/facets';
import { SOCIAL_CHANNELS, socialHref } from '@/lib/socials';
import { detailFields } from '@/lib/placedetails';
import { ProductCard, lineHref } from '../../ProductCard';
import { RoomCard } from '../../RoomCard';
import { HeroZoom, HeroThumbs, GalleryGrid } from '../../Lightbox';
import ShareButton from '../../ShareButton';
import { ReviewsFeed } from './ReviewsFeed';
import { ReviewForm } from './ReviewForm';
import { PlaceTabs } from './PlaceTabs';
import CheckInButton from './CheckInButton';

export const dynamic = 'force-dynamic';

// merchant portal base (claim flow lives there) — same convention as the portal's CONSUMER_BASE
const MERCHANT_BASE = process.env.MERCHANT_BASE ?? 'http://127.0.0.1:3002';

const catTH = (c: string) => (c === 'eat' ? 'กิน' : c === 'see' ? 'เที่ยว' : 'ทำกิจกรรม');
const dealLabel = (t: string, pct: any, minor: any) =>
  t === 'percent_off' ? `ลด ${Math.round(Number(pct))}%` : t === 'fixed_off' ? `ลด ฿${Math.round(Number(minor) / 100)}`
    : t === 'bogo' ? '1 แถม 1' : t === 'freebie' ? 'ของแถมฟรี' : 'ดีล';
const daysLeft = (e: any) => (e ? Math.max(0, Math.ceil((new Date(e).getTime() - Date.now()) / 86400000)) : null);
const DAYS: [string, string][] = [['mon', 'จันทร์'], ['tue', 'อังคาร'], ['wed', 'พุธ'], ['thu', 'พฤหัส'], ['fri', 'ศุกร์'], ['sat', 'เสาร์'], ['sun', 'อาทิตย์']];
const DKEY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const THM = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const STAY_TH: Record<string, string> = { dorm: 'หอพัก', apartment: 'อพาร์ตเมนต์', condo: 'คอนโด', mansion: 'แมนชั่น', house: 'บ้าน', homestay: 'โฮมสเตย์', hotel: 'โรงแรม', guesthouse: 'เกสต์เฮาส์' };
// human "good for" highlights derived from raw amenities — a quick-scan summary above the full list
const GOODFOR: { keys: string[]; label: string }[] = [
  { keys: ['wifi', 'work_friendly', 'power_outlet'], label: 'นั่งทำงาน' },
  { keys: ['outdoor_seating', 'garden_seating'], label: 'นั่งกลางแจ้ง' },
  { keys: ['kid_friendly'], label: 'พาเด็ก/ครอบครัว' },
  { keys: ['pet_friendly'], label: 'พาสัตว์เลี้ยง' },
  { keys: ['parking', 'street_parking'], label: 'มีที่จอดรถ' },
  { keys: ['vegan', 'vegan_options', 'vegetarian', 'vegetarian_options'], label: 'มังสวิรัติ/วีแกน' },
  { keys: ['live_music'], label: 'ดนตรีสด' },
  { keys: ['aircon', 'air_conditioning'], label: 'ห้องแอร์เย็น' },
  { keys: ['photo_spot'], label: 'ถ่ายรูปสวย' },
  { keys: ['group_friendly'], label: 'มาเป็นกลุ่ม' },
  { keys: ['halal', 'halal_options'], label: 'ฮาลาล' },
  { keys: ['late_night'], label: 'เปิดดึก' },
  // see / do highlights (so attractions & activities also get the quick-scan row, not just cafes)
  { keys: ['beginner_friendly', 'drop_in'], label: 'มือใหม่ก็ได้' },
  { keys: ['couple_room'], label: 'มาเป็นคู่' },
  { keys: ['english_speaking'], label: 'นักท่องเที่ยวต่างชาติ' },
  { keys: ['guided_tour'], label: 'มีไกด์นำชม' },
];

function parsePoint(geo: string | null) {
  if (!geo) return null;
  const m = /POINT\(([-\d.]+)\s+([-\d.]+)\)/i.exec(geo);
  return m ? { lng: parseFloat(m[1]), lat: parseFloat(m[2]) } : null;
}

export default async function PlaceDetail({ params, searchParams }: { params: { id: string }; searchParams: { view?: string; from?: string; to?: string; reviewed?: string } }) {
  const reD = /^\d{4}-\d{2}-\d{2}$/;
  const dq = { from: reD.test(searchParams?.from || '') ? searchParams.from! : '', to: reD.test(searchParams?.to || '') ? searchParams.to! : '' };
  const dateQs = dq.from && dq.to && dq.to > dq.from ? `?from=${dq.from}&to=${dq.to}` : '';
  let p: any = null; let events: any[] = []; let quests: any[] = []; let rev: any = null; let reviews: any[] = []; let dist: any[] = []; let videoUrl: string | null = null; let deals: any[] = []; let products: any[] = []; let units: any[] = []; let mediaImgs: any[] = []; let stamp: any = null; let similar: any[] = []; let canReview = false; let myReview: any = null; let loggedIn = false; let brand: any = null; let siblings: any[] = [];
  try {
    const uid = await demoUserId();
    [p] = await q<any>(
      `SELECT p.id, p.name_i18n, p.description_i18n, p.address_i18n, p.category::text category, p.image_urls,
              p.subcategory, p.phone, p.line_id, p.website, p.socials, p.details, p.price_band::text price_band,
              p.offers_stay, p.stay_kind, p.brand_id, p.district_id, (p.claim_verified_at IS NOT NULL) AS owner_verified,
              p.opening_hours, p.amenities, p.geo::text geo, d.name_i18n district_name,
              f.freshness_label::text fresh, f.last_verified_at,
              EXISTS(SELECT 1 FROM saved_places sp WHERE sp.place_id=p.id AND sp.user_id=$2) saved
       FROM places p LEFT JOIN districts d ON d.id=p.district_id LEFT JOIN data_freshness f ON f.place_id=p.id
       WHERE p.id=$1 AND p.status='published'`, [params.id, uid]);
    if (p) {
      events = await q<any>(`SELECT id, title_i18n, kind, EXTRACT(DAY FROM starts_at)::int d, EXTRACT(MONTH FROM starts_at)::int m FROM events WHERE place_id=$1 AND status='published' ORDER BY starts_at`, [params.id]);
      quests = await q<any>(`SELECT DISTINCT q.id, q.title_i18n FROM quest_steps qs JOIN quests q ON q.id=qs.quest_id WHERE qs.place_id=$1 AND q.status IN ('active','draft')`, [params.id]);
      if (p.brand_id) {
        const [sprog] = await q<any>(`SELECT points_name_i18n FROM stamp_programs WHERE brand_id=$1 AND status='active'`, [p.brand_id]);
        if (sprog) {
          const [bal] = await q<any>(`SELECT balance FROM stamp_balances WHERE user_id=$1 AND brand_id=$2`, [uid, p.brand_id]);
          const srew = await q<any>(`SELECT title_i18n, cost_stamps FROM stamp_rewards WHERE brand_id=$1 AND status='active' AND deleted_at IS NULL ORDER BY cost_stamps LIMIT 3`, [p.brand_id]);
          stamp = { pointsName: i18n(sprog.points_name_i18n) || 'แต้ม', balance: bal ? Number(bal.balance) : 0, rewards: srew };
        }
      }
      [rev] = await q<any>(`SELECT count(*)::int n, COALESCE(round(avg(rating),1),0)::text avg FROM reviews WHERE place_id=$1 AND moderation_status='approved'`, [params.id]);
      reviews = await q<any>(`SELECT r.id, r.rating, r.body_i18n, pr.display_name, to_char(r.created_at,'YYYY-MM-DD') d FROM reviews r LEFT JOIN profiles pr ON pr.user_id=r.user_id WHERE r.place_id=$1 AND r.moderation_status='approved' ORDER BY r.created_at DESC, r.rating DESC LIMIT 8`, [params.id]);
      dist = await q<any>(`SELECT rating, count(*)::int c FROM reviews WHERE place_id=$1 AND moderation_status='approved' GROUP BY rating`, [params.id]);
      if (uid) {   // review eligibility: verified-visitor only (a check-in fact at this place) + their own existing review (edit)
        loggedIn = true;
        const [ci] = await q<any>(`SELECT 1 FROM check_ins WHERE user_id=$1 AND place_id=$2 LIMIT 1`, [uid, params.id]);
        canReview = !!ci;
        [myReview] = await q<any>(`SELECT id, rating, body_i18n FROM reviews WHERE user_id=$1 AND place_id=$2 AND moderation_status<>'rejected' ORDER BY created_at DESC LIMIT 1`, [uid, params.id]);
      }
      const [vid] = await q<any>(`SELECT storage_path FROM media WHERE owner_type='place' AND owner_id=$1 AND kind='video' AND moderation_status='approved' LIMIT 1`, [params.id]);
      videoUrl = vid?.storage_path ?? null;
      mediaImgs = await q<any>(`SELECT storage_path FROM media WHERE owner_type='place' AND owner_id=$1 AND kind='image' AND moderation_status='approved' LIMIT 12`, [params.id]);
      deals = await q<any>(`SELECT id, deal_type::text deal_type, value_pct, value_minor, title_i18n, terms_i18n, ends_at, quota_total, quota_used FROM deals WHERE place_id=$1 AND status='active' AND (ends_at IS NULL OR ends_at>=now()) ORDER BY ends_at NULLS LAST`, [params.id]);
      // menu order (0066): section (owner-sorted) → recommended first → item sort; sold-out sinks in-group
      products = await q<any>(`SELECT sp.id, sp.name_i18n, sp.subtype, sp.price_minor, sp.price_unit, sp.price_text_i18n, sp.image_urls,
          sp.in_season, sp.available_today, sp.sold_out, sp.is_recommended, sec.name_i18n sec_name
        FROM shop_products sp LEFT JOIN shop_section sec ON sec.id=sp.section_id AND sec.deleted_at IS NULL
        WHERE sp.place_id=$1 AND sp.status='published' AND sp.deleted_at IS NULL
        ORDER BY sec.sort NULLS LAST, sec.created_at, sp.sold_out, sp.is_recommended DESC, sp.sort, sp.created_at LIMIT 60`, [params.id]);
      units = await q<any>(`SELECT id, name_i18n, rental_mode, price_minor, price_period, price_text_i18n, image_urls,
          available_units, available_from, daily_status, availability_updated_at, capacity, deposit_minor, min_stay, furnished
        FROM stay_units WHERE place_id=$1 AND status='published' AND deleted_at IS NULL
        ORDER BY (CASE WHEN (rental_mode='monthly' AND available_units=0) OR (rental_mode='daily' AND daily_status='full') THEN 1 ELSE 0 END), sort, price_minor LIMIT 20`, [params.id]);
      // brand identity (logo) + sibling branches of the same brand — surfaces a chain; sibling list is a no-op
      // for a single-branch place (query returns nothing), so it self-activates only when a brand has 2+ places.
      if (p.brand_id) {
        [brand] = await q<any>(`SELECT name_i18n, logo_url FROM brands WHERE id=$1 AND deleted_at IS NULL`, [p.brand_id]);
        siblings = await q<any>(
          `SELECT p.id, p.name_i18n, p.address_i18n, p.image_urls, p.subcategory, p.category::text cat, p.offers_stay,
                  rv.n::int rev_n, rv.avg::text rev_avg
             FROM places p
             LEFT JOIN LATERAL (SELECT count(*) n, round(avg(rating),1) avg FROM reviews r
               WHERE r.place_id=p.id AND r.moderation_status='approved') rv ON true
            WHERE p.brand_id=$1 AND p.id<>$2 AND p.status='published'
            ORDER BY rv.n DESC NULLS LAST, p.created_at LIMIT 6`, [p.brand_id, params.id]);
      }
      // similar places: same category + nature (shop vs stay), same area first, then by popularity
      similar = await q<any>(
        `SELECT p.id, p.name_i18n, p.subcategory, p.category::text cat, p.price_band::text price_band, p.offers_stay, p.image_urls,
                rv.n::int rev_n, rv.avg::text rev_avg
           FROM places p
           LEFT JOIN LATERAL (SELECT count(*) n, round(avg(rating),1) avg FROM reviews r
             WHERE r.place_id=p.id AND r.moderation_status='approved') rv ON true
          WHERE p.status='published' AND p.is_visible AND p.id <> $1
            AND p.category=$2 AND p.offers_stay=$3
          ORDER BY (p.district_id IS NOT DISTINCT FROM $4::uuid) DESC, rv.n DESC NULLS LAST, p.verified_at DESC NULLS LAST
          LIMIT 8`, [params.id, p.category, p.offers_stay, p.district_id]);
    }
  } catch { /* db down */ }

  if (!p) {
    return (<><div className="top"><Link className="back" href="/"><Icon n="back" size={18} /> กลับ</Link><h1>ไม่พบสถานที่</h1></div>
      <div className="body"><p className="empty">สถานที่นี้อาจยังไม่เผยแพร่</p></div></>);
  }
  const pt = parsePoint(p.geo);
  // type-driven detail: a place is shown as EITHER a place-to-visit (menu/products) OR a place-to-stay
  // (rooms) — never mixed. `?view` lets a place that offers BOTH be opened in the other mode (cross-ref),
  // each in its own clearly-separated page. Default = stay for accommodations, shop for everything else.
  const offersStay = !!p.offers_stay;
  const view = searchParams?.view === 'shop' ? 'shop'
    : searchParams?.view === 'stay' && offersStay ? 'stay'
      : (offersStay ? 'stay' : 'shop');
  const isStay = view === 'stay';
  const noun = isStay ? 'ที่พัก' : p.category === 'eat' ? 'ร้าน' : 'สถานที่';   // see/do = สถานที่ (not ร้าน)
  const typeLabel = isStay ? (STAY_TH[p.stay_kind] || 'ที่พัก') : (p.subcategory || catTH(p.category));
  // cross-ref: surface the OTHER service this place offers (only when it has real content there)
  const cross = isStay
    ? (products.length > 0 ? { to: 'shop', icon: 'coffee', t: 'ที่นี่มีร้าน / คาเฟ่ด้วย', s: 'ดูเมนูและสินค้าของร้าน' } : null)
    : (offersStay && units.length > 0 ? { to: 'stay', icon: 'bed', t: 'ที่นี่มีที่พักด้วย', s: 'ดูห้องพักและราคาที่พัก' } : null);
  const hours = p.opening_hours ?? {};
  const amen: string[] = p.amenities ?? [];
  const pdetails: Record<string, string> = p.details ?? {};
  const dfields = detailFields(p.category).filter((f) => pdetails[f.key]);   // เที่ยว/กิจกรรม extra info, only the filled ones
  const goodfor = GOODFOR.filter((g) => g.keys.some((k) => amen.includes(k))).map((g) => g.label).slice(0, 6);
  // open-now computed in Chiang Mai time (Asia/Bangkok), independent of the server's timezone,
  // and tolerant of multi-range / 24h / "closed" days — was previously wrong on a non-TH host.
  const bk = bkkNow();
  const dkey = bk.dow;
  const th = hours[dkey];
  const oState = computeOpen(hours, bk);
  const openNow = oState.open;
  const vDays = p.last_verified_at ? Math.floor((Date.now() - new Date(p.last_verified_at).getTime()) / 86400000) : null;
  const vText = vDays == null ? '' : vDays <= 0 ? 'วันนี้' : vDays === 1 ? 'เมื่อวาน' : `${vDays} วันก่อน`;
  const scoredP = (rev?.n ?? 0) >= 5; // show a numeric score only with enough verified reviews
  const distMap: Record<number, number> = {}; dist.forEach((r) => (distMap[r.rating] = r.c));
  const total = (rev?.n ?? 0) || 1;
  const mapUrl = pt ? `https://www.google.com/maps/search/?api=1&query=${pt.lat},${pt.lng}` : '#';

  // aggregate every photo for this place → hero zoom + thumbnail strip. REAL photos first (uploaded
  // media + menu/room shots), then themed atmosphere fillers so even an un-photographed place shows
  // a proper multi-image gallery (atmosphere + a hint of the menu) instead of a lone cover.
  const realPhotos: string[] = [
    ...(p.image_urls || []),                       // dedicated place gallery (facade/lobby/common) first
    ...mediaImgs.map((m) => m.storage_path),
    ...products.flatMap((pr) => pr.image_urls || []),
    ...units.flatMap((u) => u.image_urls || []),
  ].filter(Boolean);
  const galleryImages: string[] = Array.from(new Set([
    ...realPhotos,
    ...coverSet(p.id, p.subcategory, p.category, 6),
  ])).slice(0, 8);
  const heroImg = galleryImages[0] || cover(p.id, p.subcategory, p.category, 1280, 860);
  const topDeal = deals[0] ? dealLabel(deals[0].deal_type, deals[0].value_pct, deals[0].value_minor) : null;

  // sticky-bar primary CTA: LINE → call → directions (Locale has no in-app booking)
  const line = lineHref(p.line_id);
  const primary = line
    ? { kind: 'line' as const, href: line, label: 'ทักทาง LINE', icon: 'chat' as const, ext: true }
    : p.phone
      ? { kind: 'phone' as const, href: `tel:${p.phone}`, label: isStay ? 'โทรหาที่พัก' : p.category === 'eat' ? 'โทรหาร้าน' : 'โทรสอบถาม', icon: 'phone' as const, ext: false }
      : { kind: 'directions' as const, href: mapUrl, label: 'ดูเส้นทาง', icon: 'directions' as const, ext: true };

  return (
    <>
      <div className="detail-hero">
        {videoUrl
          ? <video src={videoUrl} poster={heroImg} muted loop autoPlay playsInline />
          : <img src={heroImg} alt="" />}
        {videoUrl && <span className="vidtag frost"><Icon n="play" size={12} fill="currentColor" /> วิดีโอบรรยากาศ</span>}
        <div className="scrim" />
        {!videoUrl && <HeroZoom images={galleryImages} />}
        <Link className="back-fab" href="/"><Icon n="back" size={20} /></Link>
        <div className="dhero-fabs">
          <form action={toggleSaveAction.bind(null, p.id)}>
            <button className={`bm ${p.saved ? 'on' : ''}`} type="submit"><Icon n="bookmark" size={18} fill={p.saved ? 'currentColor' : 'none'} /></button>
          </form>
          <ShareButton href={`/place/${p.id}`} title={i18n(p.name_i18n)} variant="icon" />
        </div>
        {!videoUrl && <div className="hthumb-overlay"><HeroThumbs images={galleryImages} max={6} /></div>}
      </div>

      {/* header block (ref-style, below the hero) */}
      <div className="dhead">
        <div className="dhead-top">
          {topDeal && <span className="dhead-deal">{topDeal}</span>}
          <span className="dhead-rate">{scoredP
            ? <><Icon n="star" fill="#FFC95A" size={16} style={{ color: '#FFC95A', verticalAlign: '-.16em' }} /> {rev.avg} ({rev.n} รีวิว)</>
            : <span className="muted">{noun}ใหม่{(rev?.n ?? 0) > 0 ? ` · ${rev.n} รีวิว` : ''}</span>}</span>
        </div>
        <div className="dhead-main">
          <div className="dhead-tx">
            <h1 className="dhead-name">{i18n(p.name_i18n)}{p.owner_verified && (
              <span className="verifychip" title={`เจ้าของ${noun}ยืนยันตัวตนแล้ว`}><Icon n="check" size={12} /> ยืนยันโดยเจ้าของ{noun}</span>
            )}</h1>
            <div className="dhead-sub"><Icon n={isStay ? 'bed' : (CAT_ICON[p.subcategory] || CAT_ICON[p.category])} size={14} /> {isStay ? `ที่พัก${p.stay_kind ? ' · ' + typeLabel : ''}` : `${catTH(p.category)}${p.subcategory ? ' · ' + p.subcategory : ''}`}{p.district_name ? ` · ${i18n(p.district_name)}` : ''}</div>
            {brand && (brand.logo_url || siblings.length > 0) && (
              <Link className="dhead-brand" href={`/brand/${p.brand_id}`} style={{ textDecoration: 'none' }}>
                {brand.logo_url && <img src={brand.logo_url} alt="" />}
                {siblings.length > 0 ? `สาขาของ ${i18n(brand.name_i18n)}` : i18n(brand.name_i18n)}
                {siblings.length > 0 && <Icon n="chevR" size={14} />}
              </Link>
            )}
          </div>
          <a className="dhead-nav" href={pt ? mapUrl : primary.href} target="_blank" rel="noopener" aria-label="นำทาง"><Icon n="send" size={20} /></a>
        </div>
      </div>

      <PlaceTabs
        reviewCount={rev?.n ?? 0}
        gallery={<div className="dbody"><GalleryGrid images={galleryImages} /></div>}
        review={(
          <div className="dbody">
            <ReviewForm placeId={p.id} loggedIn={loggedIn} canReview={canReview} mine={myReview ? { rating: myReview.rating, body: i18n(myReview.body_i18n) } : null} status={searchParams?.reviewed} />
            {(rev?.n ?? 0) === 0 ? (
              <p className="empty">ยังไม่มีรีวิว</p>
            ) : (<>
              {scoredP ? (
                <div className="rdist">
                  <div className="rbig"><div className="n">{rev?.avg}</div><div className="s">{Array.from({ length: 5 }).map((_, k) => <Icon key={k} n="star" fill="currentColor" size={11} />)}</div><div className="c">{rev?.n} รีวิว</div></div>
                  <div className="rbars">{[5, 4, 3, 2, 1].map((st) => (
                    <div className="rbarrow" key={st}><span>{st}</span><span className="rtrack"><span className="rfill" style={{ width: `${Math.round(((distMap[st] || 0) / total) * 100)}%` }} /></span></div>
                  ))}</div>
                </div>
              ) : (
                <p className="muted" style={{ margin: '0 0 12px' }}>{noun}นี้ยังใหม่ — มีรีวิวจากผู้มาเยือนจริง {rev?.n} คน (ยังไม่พอแสดงคะแนนเฉลี่ย เพื่อความเป็นธรรมกับ{noun}ใหม่)</p>
              )}
              <ReviewsFeed placeId={p.id} total={rev?.n ?? 0}
                initial={reviews.map((r) => ({ id: r.id, rating: r.rating, body: i18n(r.body_i18n), name: r.display_name, d: r.d }))} />
            </>)}
          </div>
        )}
        about={(
          <div className="dbody">

        {stamp && (
          <section className="pstamp">
            <div className="pstamp-h"><span className="pstamp-ic"><Icon n="sparkles" size={17} /></span> สะสม{stamp.pointsName}{siblings.length > 0 ? ' · ใช้ได้ทุกสาขา' : `ที่${noun}นี้`}</div>
            <div className="pstamp-sub">คุณมี <span className="pstamp-bal">{stamp.balance} {stamp.pointsName}</span>{stamp.rewards[0] ? ` · ครบ ${stamp.rewards[0].cost_stamps} แลก${i18n(stamp.rewards[0].title_i18n)}` : ''} — ดูบัตรทั้งหมดในกระเป๋า</div>
            <CheckInButton placeId={p.id} pointsName={stamp.pointsName} />
          </section>
        )}

        {p.fresh && (
          <div className="trust">
            <span className="ti"><Icon n="check" size={18} /></span>
            <div className="tt"><b>ตรวจสอบโดยทีมงานท้องถิ่น</b> · {vText}<br />
              <span className="muted">ข้อมูล{noun}นี้การันตีความสด — ไม่ใช่ข้อมูลเก่าที่ไม่มีใครดูแล</span></div>
            <span className="tflag">แจ้งไม่ตรง</span>
          </div>
        )}

        {Object.keys(hours).length > 0 && (
          <div className="openpill" style={{ marginBottom: 12 }}>
            <Icon n="clock" size={16} className={openNow ? 'is-open' : 'is-closed'} />
            <span className={openNow ? 'is-open' : 'is-closed'}>{isStay ? (openNow ? 'เปิดรับติดต่อ' : 'นอกเวลาทำการ') : (openNow ? 'เปิดอยู่ตอนนี้' : 'ปิดอยู่')}</span>
            {th && th !== 'closed' && <span className="muted" style={{ fontWeight: 500 }}>· วันนี้ {th}</span>}
          </div>
        )}

        <div className="facts">
          {!isStay && p.price_band && <span className="fact"><Icon n="wallet" size={15} /> {'฿'.repeat(Number(p.price_band))}</span>}
          <span className="fact"><Icon n={isStay ? 'bed' : (CAT_ICON[p.subcategory] || CAT_ICON[p.category])} size={15} /> {typeLabel}</span>
          {p.district_name && <span className="fact"><Icon n="pin" size={15} /> {i18n(p.district_name)}</span>}
        </div>

        {goodfor.length > 0 && (
          <div className="goodfor">
            <span className="goodfor-h"><Icon n="sparkles" size={14} /> เหมาะสำหรับ</span>
            {goodfor.map((g) => <span className="gfpill" key={g}>{g}</span>)}
          </div>
        )}

        {i18n(p.description_i18n) && <p className="desc">{i18n(p.description_i18n)}</p>}

        {dfields.length > 0 && (
          <div className="pdetails">
            {dfields.map((f) => (
              <div className="pd-row" key={f.key}>
                <span className="pd-ic"><Icon n={f.icon} size={16} /></span>
                <div className="pd-tx"><div className="pd-l">{f.label}</div><div className="pd-v">{pdetails[f.key]}</div></div>
              </div>
            ))}
          </div>
        )}

        {cross && (
          <Link className="crossref" href={`/place/${p.id}?view=${cross.to}`}>
            <span className="crossref-ic"><Icon n={cross.icon} size={20} /></span>
            <div className="crossref-tx"><div className="crossref-t">{cross.t}</div><div className="crossref-s">{cross.s}</div></div>
            <span className="crossref-go"><Icon n="chevR" size={18} /></span>
          </Link>
        )}

        {deals.length > 0 && (
          <>
            <h2>โปรโมชั่น</h2>
            {deals.map((dl) => {
              const left = dl.quota_total ? dl.quota_total - dl.quota_used : null;
              const dd = daysLeft(dl.ends_at);
              return (
                <div className="dealrow" key={dl.id}>
                  <div className="drt"><span className="drlabel">{dealLabel(dl.deal_type, dl.value_pct, dl.value_minor)}</span> {i18n(dl.title_i18n)}</div>
                  {i18n(dl.terms_i18n) && <div className="drterms">{i18n(dl.terms_i18n)}</div>}
                  <div className="drbar">
                    {dd != null && <span className="b1">{dd === 0 ? 'วันสุดท้าย!' : `เหลืออีก ${dd} วัน`}</span>}
                    {left != null && <span className="b2">เหลือ {left} สิทธิ์</span>}
                  </div>
                  <span className="dealcta"><Icon n="ticket" size={15} /> แสดงที่เคาน์เตอร์เพื่อรับสิทธิ์</span>
                </div>
              );
            })}
          </>
        )}

        {!isStay && products.length > 0 && (() => {
          // group the (already section-ordered) rows into the owner's menu sections; a shop with no
          // sections renders exactly the old flat rail (one group, no header)
          const groups: { name: string | null; items: any[] }[] = [];
          for (const pr of products) {
            const nm = pr.sec_name ? i18n(pr.sec_name) : null;
            const g = groups.length && groups[groups.length - 1].name === nm ? groups[groups.length - 1] : null;
            if (g) g.items.push(pr); else groups.push({ name: nm, items: [pr] });
          }
          const hasSections = groups.some((g) => g.name);
          return (<>
            <h2>{p.category === 'eat' ? 'เมนูของร้าน' : p.category === 'do' ? 'กิจกรรม / คอร์ส' : 'สินค้า / ของฝาก'}</h2>
            {groups.map((g, gi) => (
              <div key={gi}>
                {hasSections && <h3 style={{ padding: '0 16px', margin: '10px 0 2px', fontSize: '.95rem' }}>{g.name || 'อื่นๆ'}</h3>}
                <div className="prail">
                  {g.items.map((pr) => <ProductCard key={pr.id} pr={pr} line_id={p.line_id} phone={p.phone} />)}
                </div>
              </div>
            ))}
            <p className="shopnote"><Icon n="chat" size={13} /> {p.category === 'eat' ? 'สนใจสินค้า? ทักร้านได้เลย — ยังไม่มีระบบจ่ายเงินในแอป ติดต่อร้านโดยตรงเพื่อสั่งซื้อ' : `สนใจ? ทักได้เลย — Locale ไม่มีระบบจ่ายเงินในแอป ติดต่อ${noun}โดยตรงเพื่อสอบถาม`}</p>
          </>);
        })()}

        {isStay && units.length > 0 && (<>
          <h2>ห้องพัก / ห้องว่าง</h2>
          <div className="prail">
            {units.map((u) => <RoomCard key={u.id} u={{ ...u, stay_kind: p.stay_kind }} line_id={p.line_id} phone={p.phone} qs={dateQs} />)}
          </div>
          <p className="shopnote"><Icon n="chat" size={13} /> ติดต่อที่พักโดยตรงเพื่อสอบถาม/จอง — Locale ยังไม่มีระบบจอง/ชำระเงินในแอป</p>
        </>)}

        <div className="info">
          {(i18n(p.address_i18n) || p.district_name) && <div className="info-row"><Icon n="pin" size={18} className="flat-ico" /><span>{i18n(p.address_i18n) || `${i18n(p.district_name)} · เชียงใหม่`}</span></div>}
          {p.phone && <div className="info-row"><Icon n="phone" size={18} className="flat-ico" /><a href={`tel:${p.phone}`}>{p.phone}</a></div>}
          {p.line_id && <div className="info-row"><Icon n="chat" size={18} className="flat-ico" /><span>LINE: {p.line_id}</span></div>}
          {p.website && <div className="info-row"><Icon n="globe" size={18} className="flat-ico" /><a href={p.website} target="_blank" rel="noopener">{p.website.replace(/^https?:\/\//, '')}</a></div>}
          {p.socials && SOCIAL_CHANNELS.filter((ch) => p.socials[ch.key]).map((ch) => (
            <div className="info-row" key={ch.key}><Icon n={ch.icon} size={18} className="flat-ico" /><a href={socialHref(ch.key, p.socials[ch.key])} target="_blank" rel="noopener">{ch.label}: {String(p.socials[ch.key]).replace(/^https?:\/\//, '')}</a></div>
          ))}
          {pt && <div className="info-row"><Icon n="directions" size={18} className="flat-ico" /><a href={mapUrl} target="_blank">เปิดใน Google Maps</a></div>}
          <div className="info-row"><Icon n="map" size={18} className="flat-ico" /><Link href={`/map?focus=${p.id}`}>ดูบนแผนที่ในแอป</Link></div>
        </div>

        {Object.keys(hours).length > 0 && (
          <details className="hoursbox">
            <summary>
              <Icon n="clock" size={16} className="flat-ico" />
              <span className="hb-label">{isStay ? 'เวลาทำการ' : 'เวลาเปิด-ปิด'}</span>
              <span className="hb-today">{!th || th === 'closed' ? 'วันนี้ปิด' : `วันนี้ ${th}`}</span>
              <Icon n="chevD" size={16} className="hb-caret" />
            </summary>
            <div className="hours">
              {DAYS.map(([k, label]) => (
                <div className="hour-row" key={k} style={k === dkey ? { fontWeight: 600 } : undefined}>
                  <span>{label}{k === dkey ? ' · วันนี้' : ''}</span>
                  <span style={{ color: !hours[k] || hours[k] === 'closed' ? 'var(--muted)' : 'var(--text)', fontWeight: 600 }}>{!hours[k] || hours[k] === 'closed' ? 'ปิด' : hours[k]}</span>
                </div>
              ))}
            </div>
          </details>
        )}

        {amen.length > 0 && (<><h2>สิ่งอำนวยความสะดวก</h2><div className="chips">{amen.map((a) => <span className="chip" key={a}>{facetLabel(a)}</span>)}</div></>)}

        {quests.length > 0 && (<>
          <h2>อยู่ในเควสต์</h2>
          {quests.map((qu) => <Link className="erow" key={qu.id} href="/passport"><div className="ethumb" style={{ background: 'linear-gradient(135deg,#E7C56A,#C9962A)' }}><Icon n="ticket" size={24} /></div>
            <div><div className="nm">{i18n(qu.title_i18n)}</div><div className="meta">เช็คอินที่นี่เพื่อเก็บแสตมป์</div></div><span className="chev"><Icon n="chevR" size={18} /></span></Link>)}
        </>)}

        {events.length > 0 && (<>
          <h2>กิจกรรมที่นี่</h2>
          {events.map((e) => <Link className="erow" key={e.id} href={`/event/${e.id}`}><div className="ethumb"><Icon n={KIND_ICON[e.kind] || 'sparkles'} size={24} /></div>
            <div><div className="nm">{i18n(e.title_i18n)}</div><div className="meta"><Icon n="calendar" size={13} className="flat-ico" style={{ color: 'var(--muted)' }} /> {e.d} {THM[e.m - 1]}</div></div><span className="chev"><Icon n="chevR" size={18} /></span></Link>)}
        </>)}

        {siblings.length > 0 && (<>
          <h2>สาขาอื่นของแบรนด์นี้</h2>
          <div className="openrail">
            {siblings.map((s) => (
              <Link className="openc" key={s.id} href={`/place/${s.id}`}>
                <div className="op"><img src={(s.image_urls && s.image_urls[0]) || cover(s.id, s.subcategory, s.cat, 300, 200)} alt="" loading="lazy" /></div>
                <div className="onm">{i18n(s.name_i18n)}</div>
                <div className="ometa">{i18n(s.address_i18n) || (s.offers_stay ? 'ที่พัก' : 'สาขา')}{(s.rev_n || 0) >= 5 ? ` · ★ ${s.rev_avg}` : ''}</div>
              </Link>
            ))}
          </div>
        </>)}

        {similar.length > 0 && (<>
          <h2>{isStay ? 'ที่พักใกล้เคียง' : `${noun}ใกล้เคียง`}</h2>
          <div className="openrail">
            {similar.map((s) => {
              const sc = (s.rev_n || 0) >= 5;
              return (
                <Link className="openc" key={s.id} href={`/place/${s.id}`}>
                  <div className="op"><img src={pickCover(s.image_urls, s.id, s.subcategory, s.cat, 300, 200)} alt="" loading="lazy" /></div>
                  <div className="onm">{i18n(s.name_i18n)}</div>
                  <div className="ometa">{s.subcategory || catTH(s.cat)}{sc ? ` · ★ ${s.rev_avg}` : ''}{s.price_band ? ` · ${'฿'.repeat(Number(s.price_band))}` : ''}</div>
                </Link>
              );
            })}
          </div>
        </>)}

        {!p.brand_id && (
          <a className="claimcta" href={`${MERCHANT_BASE}/merchant/claim/${p.id}`} target="_blank" rel="noopener">
            <span className="claimcta-ic"><Icon n="store" size={19} /></span>
            <div className="claimcta-tx"><b>เป็นเจ้าของ{noun}นี้?</b><span>เคลมเพื่อแก้ข้อมูล เพิ่มรูป/เมนู และเปิดแต้มสะสม</span></div>
            <Icon n="chevR" size={18} className="claimcta-go" />
          </a>
        )}
          </div>
        )}
      />

      <div className="detailbar">
        <div className="db-ics">
          {primary.kind !== 'directions' && <a className="db-ic" href={mapUrl} target="_blank" rel="noopener" aria-label="เส้นทาง"><Icon n="directions" size={22} /></a>}
          {line && p.phone && <a className="db-ic" href={`tel:${p.phone}`} aria-label="โทร"><Icon n="phone" size={22} /></a>}
        </div>
        <a className={`db-primary ${primary.kind === 'line' ? 'line' : ''}`} href={primary.href} {...(primary.ext ? { target: '_blank', rel: 'noopener' } : {})}>
          <Icon n={primary.icon} size={18} /> {primary.label}
        </a>
      </div>
    </>
  );
}
