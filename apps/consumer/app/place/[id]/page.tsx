import { q, i18n, cover, DEMO_USER } from '@/lib/db';
import { Icon, CAT_ICON, KIND_ICON } from '../../icons';
import { toggleSaveAction } from '../../actions';
import { facetLabel } from '@/lib/facets';
import { ProductCard, lineHref } from '../../ProductCard';
import { RoomCard } from '../../RoomCard';
import { HeroZoom, HeroThumbs } from '../../Lightbox';
import ShareButton from '../../ShareButton';
import { ReviewList } from './ReviewList';
import CheckInButton from './CheckInButton';

export const dynamic = 'force-dynamic';

const catTH = (c: string) => (c === 'eat' ? 'กิน' : c === 'see' ? 'เที่ยว' : 'ทำกิจกรรม');
const dealLabel = (t: string, pct: any, minor: any) =>
  t === 'percent_off' ? `ลด ${Math.round(Number(pct))}%` : t === 'fixed_off' ? `ลด ฿${Math.round(Number(minor) / 100)}`
    : t === 'bogo' ? '1 แถม 1' : t === 'freebie' ? 'ของแถมฟรี' : 'ดีล';
const daysLeft = (e: any) => (e ? Math.max(0, Math.ceil((new Date(e).getTime() - Date.now()) / 86400000)) : null);
const DAYS: [string, string][] = [['mon', 'จันทร์'], ['tue', 'อังคาร'], ['wed', 'พุธ'], ['thu', 'พฤหัส'], ['fri', 'ศุกร์'], ['sat', 'เสาร์'], ['sun', 'อาทิตย์']];
const DKEY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const THM = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function parsePoint(geo: string | null) {
  if (!geo) return null;
  const m = /POINT\(([-\d.]+)\s+([-\d.]+)\)/i.exec(geo);
  return m ? { lng: parseFloat(m[1]), lat: parseFloat(m[2]) } : null;
}

export default async function PlaceDetail({ params }: { params: { id: string } }) {
  let p: any = null; let events: any[] = []; let quests: any[] = []; let rev: any = null; let reviews: any[] = []; let dist: any[] = []; let videoUrl: string | null = null; let deals: any[] = []; let products: any[] = []; let units: any[] = []; let mediaImgs: any[] = []; let stamp: any = null;
  try {
    [p] = await q<any>(
      `SELECT p.id, p.name_i18n, p.description_i18n, p.address_i18n, p.category::text category,
              p.subcategory, p.phone, p.line_id, p.website, p.price_band::text price_band,
              p.offers_stay, p.stay_kind, p.brand_id,
              p.opening_hours, p.amenities, p.geo::text geo, d.name_i18n district_name,
              f.freshness_label::text fresh, f.last_verified_at,
              EXISTS(SELECT 1 FROM saved_places sp WHERE sp.place_id=p.id AND sp.user_id=$2) saved
       FROM places p LEFT JOIN districts d ON d.id=p.district_id LEFT JOIN data_freshness f ON f.place_id=p.id
       WHERE p.id=$1 AND p.status='published'`, [params.id, DEMO_USER]);
    if (p) {
      events = await q<any>(`SELECT id, title_i18n, kind, EXTRACT(DAY FROM starts_at)::int d, EXTRACT(MONTH FROM starts_at)::int m FROM events WHERE place_id=$1 AND status='published' ORDER BY starts_at`, [params.id]);
      quests = await q<any>(`SELECT DISTINCT q.id, q.title_i18n FROM quest_steps qs JOIN quests q ON q.id=qs.quest_id WHERE qs.place_id=$1 AND q.status IN ('active','draft')`, [params.id]);
      if (p.brand_id) {
        const [sprog] = await q<any>(`SELECT points_name_i18n FROM stamp_programs WHERE brand_id=$1 AND status='active'`, [p.brand_id]);
        if (sprog) {
          const [bal] = await q<any>(`SELECT balance FROM stamp_balances WHERE user_id=$1 AND brand_id=$2`, [DEMO_USER, p.brand_id]);
          const srew = await q<any>(`SELECT title_i18n, cost_stamps FROM stamp_rewards WHERE brand_id=$1 AND status='active' ORDER BY cost_stamps LIMIT 3`, [p.brand_id]);
          stamp = { pointsName: i18n(sprog.points_name_i18n) || 'แต้ม', balance: bal ? Number(bal.balance) : 0, rewards: srew };
        }
      }
      [rev] = await q<any>(`SELECT count(*)::int n, COALESCE(round(avg(rating),1),0)::text avg FROM reviews WHERE place_id=$1 AND moderation_status='approved'`, [params.id]);
      reviews = await q<any>(`SELECT r.rating, r.body_i18n, pr.display_name, to_char(r.created_at,'YYYY-MM-DD') d FROM reviews r LEFT JOIN profiles pr ON pr.user_id=r.user_id WHERE r.place_id=$1 AND r.moderation_status='approved' ORDER BY r.created_at DESC, r.rating DESC LIMIT 10`, [params.id]);
      dist = await q<any>(`SELECT rating, count(*)::int c FROM reviews WHERE place_id=$1 AND moderation_status='approved' GROUP BY rating`, [params.id]);
      const [vid] = await q<any>(`SELECT storage_path FROM media WHERE owner_type='place' AND owner_id=$1 AND kind='video' AND moderation_status='approved' LIMIT 1`, [params.id]);
      videoUrl = vid?.storage_path ?? null;
      mediaImgs = await q<any>(`SELECT storage_path FROM media WHERE owner_type='place' AND owner_id=$1 AND kind='image' AND moderation_status='approved' LIMIT 12`, [params.id]);
      deals = await q<any>(`SELECT id, deal_type::text deal_type, value_pct, value_minor, title_i18n, terms_i18n, ends_at, quota_total, quota_used FROM deals WHERE place_id=$1 AND status='active' AND (ends_at IS NULL OR ends_at>=now()) ORDER BY ends_at NULLS LAST`, [params.id]);
      products = await q<any>(`SELECT id, name_i18n, subtype, price_minor, price_unit, price_text_i18n, image_urls, in_season, available_today, sold_out
        FROM shop_products WHERE place_id=$1 AND status='published' ORDER BY sold_out, sort, created_at LIMIT 20`, [params.id]);
      units = await q<any>(`SELECT id, name_i18n, rental_mode, price_minor, price_period, price_text_i18n, image_urls,
          available_units, available_from, daily_status, availability_updated_at, capacity, deposit_minor, min_stay, furnished
        FROM stay_units WHERE place_id=$1 AND status='published'
        ORDER BY (CASE WHEN (rental_mode='monthly' AND available_units=0) OR (rental_mode='daily' AND daily_status='full') THEN 1 ELSE 0 END), sort, price_minor LIMIT 20`, [params.id]);
    }
  } catch { /* db down */ }

  if (!p) {
    return (<><div className="top"><a className="back" href="/"><Icon n="back" size={18} /> กลับ</a><h1>ไม่พบสถานที่</h1></div>
      <div className="body"><p className="empty">สถานที่นี้อาจยังไม่เผยแพร่</p></div></>);
  }
  const pt = parsePoint(p.geo);
  const hours = p.opening_hours ?? {};
  const amen: string[] = p.amenities ?? [];
  const now = new Date();
  const dkey = DKEY[now.getDay()];
  const hhmm = now.toTimeString().slice(0, 5);
  const th = hours[dkey];
  const openNow = !!(th && th !== 'closed' && hhmm >= th.split('-')[0] && hhmm <= th.split('-')[1]);
  const vDays = p.last_verified_at ? Math.floor((Date.now() - new Date(p.last_verified_at).getTime()) / 86400000) : null;
  const vText = vDays == null ? '' : vDays <= 0 ? 'วันนี้' : vDays === 1 ? 'เมื่อวาน' : `${vDays} วันก่อน`;
  const scoredP = (rev?.n ?? 0) >= 5; // show a numeric score only with enough verified reviews
  const distMap: Record<number, number> = {}; dist.forEach((r) => (distMap[r.rating] = r.c));
  const total = (rev?.n ?? 0) || 1;
  const mapUrl = pt ? `https://www.google.com/maps/search/?api=1&query=${pt.lat},${pt.lng}` : '#';

  // aggregate every photo we have for this place → hero zoom + thumbnail strip
  const galleryImages: string[] = Array.from(new Set([
    cover(p.id, p.subcategory, p.category, 1280, 860),
    ...mediaImgs.map((m) => m.storage_path),
    ...products.flatMap((pr) => pr.image_urls || []),
    ...units.flatMap((u) => u.image_urls || []),
  ].filter(Boolean)));

  // sticky-bar primary CTA: LINE → call → directions (Soi Hop has no in-app booking)
  const line = lineHref(p.line_id);
  const primary = line
    ? { kind: 'line' as const, href: line, label: 'ทักทาง LINE', icon: 'chat' as const, ext: true }
    : p.phone
      ? { kind: 'phone' as const, href: `tel:${p.phone}`, label: 'โทรหาร้าน', icon: 'phone' as const, ext: false }
      : { kind: 'directions' as const, href: mapUrl, label: 'ดูเส้นทาง', icon: 'directions' as const, ext: true };

  return (
    <>
      <div className="detail-hero">
        {videoUrl
          ? <video src={videoUrl} poster={cover(p.id, p.subcategory, p.category, 760, 500)} muted loop autoPlay playsInline />
          : <img src={cover(p.id, p.subcategory, p.category, 760, 500)} alt="" />}
        {videoUrl && <span className="vidtag frost"><Icon n="play" size={12} fill="currentColor" /> วิดีโอบรรยากาศ</span>}
        <div className="scrim" />
        {!videoUrl && <HeroZoom images={galleryImages} />}
        <a className="back-fab" href="/"><Icon n="back" size={20} /></a>
        <div className="dhero-fabs">
          <form action={toggleSaveAction.bind(null, p.id)}>
            <button className={`bm ${p.saved ? 'on' : ''}`} type="submit"><Icon n="bookmark" size={18} fill={p.saved ? 'currentColor' : 'none'} /></button>
          </form>
          <ShareButton href={`/place/${p.id}`} title={i18n(p.name_i18n)} variant="icon" />
        </div>
        <div className="dtitle">
          <span className="frost" style={{ marginBottom: 8 }}><Icon n={CAT_ICON[p.subcategory] || CAT_ICON[p.category]} size={13} /> {catTH(p.category)}{p.subcategory ? ` · ${p.subcategory}` : ''}</span>
          <h1>{i18n(p.name_i18n)}</h1>
          <div className="dmeta">{scoredP
            ? <><Icon n="star" fill="#FFC95A" size={15} style={{ color: '#FFC95A', verticalAlign: '-.18em' }} /> {rev.avg} · {rev.n} รีวิว</>
            : (rev?.n ?? 0) > 0 ? `ร้านใหม่ · ${rev.n} รีวิว` : 'ร้านใหม่ · ยังไม่มีรีวิว'}</div>
        </div>
      </div>

      <HeroThumbs images={galleryImages} />

      <div className="dbody">

        {stamp && (
          <section className="pstamp">
            <div className="pstamp-h"><span className="pstamp-ic"><Icon n="sparkles" size={17} /></span> สะสม{stamp.pointsName}ที่ร้านนี้</div>
            <div className="pstamp-sub">คุณมี <span className="pstamp-bal">{stamp.balance} {stamp.pointsName}</span>{stamp.rewards[0] ? ` · ครบ ${stamp.rewards[0].cost_stamps} แลก${i18n(stamp.rewards[0].title_i18n)}` : ''} — ดูบัตรทั้งหมดในกระเป๋า</div>
            <CheckInButton placeId={p.id} pointsName={stamp.pointsName} />
          </section>
        )}

        {p.fresh && (
          <div className="trust">
            <span className="ti"><Icon n="check" size={18} /></span>
            <div className="tt"><b>ตรวจสอบโดยทีมงานท้องถิ่น</b> · {vText}<br />
              <span className="muted">ข้อมูลร้านนี้การันตีความสด — ไม่ใช่ข้อมูลเก่าที่ไม่มีใครดูแล</span></div>
            <span className="tflag">แจ้งไม่ตรง</span>
          </div>
        )}

        {Object.keys(hours).length > 0 && (
          <div className="openpill" style={{ marginBottom: 12 }}>
            <Icon n="clock" size={16} className={openNow ? 'is-open' : 'is-closed'} />
            <span className={openNow ? 'is-open' : 'is-closed'}>{openNow ? 'เปิดอยู่ตอนนี้' : 'ปิดอยู่'}</span>
            {th && th !== 'closed' && <span className="muted" style={{ fontWeight: 500 }}>· วันนี้ {th}</span>}
          </div>
        )}

        <div className="facts">
          {p.price_band && <span className="fact"><Icon n="wallet" size={15} /> {'฿'.repeat(Number(p.price_band))}</span>}
          <span className="fact"><Icon n={CAT_ICON[p.subcategory] || CAT_ICON[p.category]} size={15} /> {p.subcategory || catTH(p.category)}</span>
          {p.district_name && <span className="fact"><Icon n="pin" size={15} /> {i18n(p.district_name)}</span>}
          {p.fresh === 'fresh' && <span className="fact"><Icon n="check" size={15} /> ตรวจสอบแล้ว</span>}
        </div>

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

        {products.length > 0 && (<>
          <h2>สินค้าในร้าน</h2>
          <div className="prail">
            {products.map((pr) => <ProductCard key={pr.id} pr={pr} line_id={p.line_id} phone={p.phone} />)}
          </div>
          <p className="shopnote"><Icon n="chat" size={13} /> สนใจสินค้า? ทักร้านได้เลย — ยังไม่มีระบบจ่ายเงินในแอป ติดต่อร้านโดยตรงเพื่อสั่งซื้อ</p>
        </>)}

        {units.length > 0 && (<>
          <h2>ห้องพัก / ห้องว่าง</h2>
          <div className="prail">
            {units.map((u) => <RoomCard key={u.id} u={{ ...u, stay_kind: p.stay_kind }} line_id={p.line_id} phone={p.phone} />)}
          </div>
          <p className="shopnote"><Icon n="chat" size={13} /> ติดต่อที่พักโดยตรงเพื่อสอบถาม/จอง — Soi Hop ยังไม่มีระบบจอง/ชำระเงินในแอป</p>
        </>)}

        {i18n(p.description_i18n) && <p className="desc">{i18n(p.description_i18n)}</p>}

        <div className="info">
          {(i18n(p.address_i18n) || p.district_name) && <div className="info-row"><Icon n="pin" size={18} className="flat-ico" /><span>{i18n(p.address_i18n) || `${i18n(p.district_name)} · เชียงใหม่`}</span></div>}
          {p.phone && <div className="info-row"><Icon n="phone" size={18} className="flat-ico" /><a href={`tel:${p.phone}`}>{p.phone}</a></div>}
          {p.line_id && <div className="info-row"><Icon n="chat" size={18} className="flat-ico" /><span>LINE: {p.line_id}</span></div>}
          {p.website && <div className="info-row"><Icon n="globe" size={18} className="flat-ico" /><a href={p.website}>{p.website}</a></div>}
          {pt && <div className="info-row"><Icon n="directions" size={18} className="flat-ico" /><a href={mapUrl} target="_blank">เปิดใน Google Maps</a></div>}
          <div className="info-row"><Icon n="map" size={18} className="flat-ico" /><a href={`/map?focus=${p.id}`}>ดูบนแผนที่ในแอป</a></div>
        </div>

        {Object.keys(hours).length > 0 && (<>
          <h2>เวลาเปิด-ปิด</h2>
          <div className="hours">
            {DAYS.map(([k, label]) => (
              <div className="hour-row" key={k} style={k === dkey ? { fontWeight: 700 } : undefined}>
                <span>{label}{k === dkey ? ' · วันนี้' : ''}</span>
                <span style={{ color: !hours[k] || hours[k] === 'closed' ? 'var(--muted)' : 'var(--text)', fontWeight: 600 }}>{!hours[k] || hours[k] === 'closed' ? 'ปิด' : hours[k]}</span>
              </div>
            ))}
          </div>
        </>)}

        {amen.length > 0 && (<><h2>สิ่งอำนวยความสะดวก</h2><div className="chips">{amen.map((a) => <span className="chip" key={a}>{facetLabel(a)}</span>)}</div></>)}

        {quests.length > 0 && (<>
          <h2>อยู่ในเควสต์</h2>
          {quests.map((qu) => <a className="erow" key={qu.id} href="/passport"><div className="ethumb" style={{ background: 'linear-gradient(135deg,#E7C56A,#C9962A)' }}><Icon n="ticket" size={24} /></div>
            <div><div className="nm">{i18n(qu.title_i18n)}</div><div className="meta">เช็คอินที่นี่เพื่อเก็บแสตมป์</div></div><span className="chev"><Icon n="chevR" size={18} /></span></a>)}
        </>)}

        {events.length > 0 && (<>
          <h2>กิจกรรมที่นี่</h2>
          {events.map((e) => <a className="erow" key={e.id} href={`/event/${e.id}`}><div className="ethumb"><Icon n={KIND_ICON[e.kind] || 'sparkles'} size={24} /></div>
            <div><div className="nm">{i18n(e.title_i18n)}</div><div className="meta"><Icon n="calendar" size={13} className="flat-ico" style={{ color: 'var(--muted)' }} /> {e.d} {THM[e.m - 1]}</div></div><span className="chev"><Icon n="chevR" size={18} /></span></a>)}
        </>)}

        {reviews.length > 0 && (<>
          <h2>รีวิว{scoredP ? ` (${rev?.n})` : ''}</h2>
          {scoredP ? (
            <div className="rdist">
              <div className="rbig"><div className="n">{rev?.avg}</div><div className="s">{Array.from({ length: 5 }).map((_, k) => <Icon key={k} n="star" fill="currentColor" size={11} />)}</div><div className="c">{rev?.n} รีวิว</div></div>
              <div className="rbars">{[5, 4, 3, 2, 1].map((st) => (
                <div className="rbarrow" key={st}><span>{st}</span><span className="rtrack"><span className="rfill" style={{ width: `${Math.round(((distMap[st] || 0) / total) * 100)}%` }} /></span></div>
              ))}</div>
            </div>
          ) : (
            <p className="muted" style={{ margin: '0 0 12px' }}>ร้านนี้ยังใหม่ — มีรีวิวจากผู้มาเยือนจริง {rev?.n} คน (ยังไม่พอแสดงคะแนนเฉลี่ย เพื่อความเป็นธรรมกับร้านใหม่)</p>
          )}
          <ReviewList reviews={reviews.map((r) => ({ rating: r.rating, body: i18n(r.body_i18n), name: r.display_name, d: r.d }))} />
        </>)}
      </div>

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
