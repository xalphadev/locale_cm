import { q, i18n, cover, DEMO_USER } from '@/lib/db';
import { Icon, CAT_ICON, KIND_ICON } from '../../icons';
import { toggleSaveAction } from '../../actions';

export const dynamic = 'force-dynamic';

const catTH = (c: string) => (c === 'eat' ? 'กิน' : c === 'see' ? 'เที่ยว' : 'ทำกิจกรรม');
const DAYS: [string, string][] = [['mon', 'จันทร์'], ['tue', 'อังคาร'], ['wed', 'พุธ'], ['thu', 'พฤหัส'], ['fri', 'ศุกร์'], ['sat', 'เสาร์'], ['sun', 'อาทิตย์']];
const DKEY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const THM = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function parsePoint(geo: string | null) {
  if (!geo) return null;
  const m = /POINT\(([-\d.]+)\s+([-\d.]+)\)/i.exec(geo);
  return m ? { lng: parseFloat(m[1]), lat: parseFloat(m[2]) } : null;
}

export default async function PlaceDetail({ params }: { params: { id: string } }) {
  let p: any = null; let events: any[] = []; let quests: any[] = []; let rev: any = null; let reviews: any[] = []; let dist: any[] = [];
  try {
    [p] = await q<any>(
      `SELECT p.id, p.name_i18n, p.description_i18n, p.address_i18n, p.category::text category,
              p.subcategory, p.phone, p.line_id, p.website, p.price_band::text price_band,
              p.opening_hours, p.amenities, p.geo::text geo, d.name_i18n district_name,
              f.freshness_label::text fresh,
              EXISTS(SELECT 1 FROM saved_places sp WHERE sp.place_id=p.id AND sp.user_id=$2) saved
       FROM places p LEFT JOIN districts d ON d.id=p.district_id LEFT JOIN data_freshness f ON f.place_id=p.id
       WHERE p.id=$1 AND p.status='published'`, [params.id, DEMO_USER]);
    if (p) {
      events = await q<any>(`SELECT id, title_i18n, kind, EXTRACT(DAY FROM starts_at)::int d, EXTRACT(MONTH FROM starts_at)::int m FROM events WHERE place_id=$1 AND status='published' ORDER BY starts_at`, [params.id]);
      quests = await q<any>(`SELECT DISTINCT q.id, q.title_i18n FROM quest_steps qs JOIN quests q ON q.id=qs.quest_id WHERE qs.place_id=$1 AND q.status IN ('active','draft')`, [params.id]);
      [rev] = await q<any>(`SELECT count(*)::int n, COALESCE(round(avg(rating),1),0)::text avg FROM reviews WHERE place_id=$1 AND moderation_status='approved'`, [params.id]);
      reviews = await q<any>(`SELECT r.rating, r.body_i18n, pr.display_name, to_char(r.created_at,'YYYY-MM-DD') d FROM reviews r LEFT JOIN profiles pr ON pr.user_id=r.user_id WHERE r.place_id=$1 AND r.moderation_status='approved' ORDER BY r.created_at DESC, r.rating DESC LIMIT 10`, [params.id]);
      dist = await q<any>(`SELECT rating, count(*)::int c FROM reviews WHERE place_id=$1 AND moderation_status='approved' GROUP BY rating`, [params.id]);
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
  const distMap: Record<number, number> = {}; dist.forEach((r) => (distMap[r.rating] = r.c));
  const total = (rev?.n ?? 0) || 1;
  const mapUrl = pt ? `https://www.google.com/maps/search/?api=1&query=${pt.lat},${pt.lng}` : '#';

  return (
    <>
      <div className="detail-hero">
        <img src={cover(p.id, p.subcategory, p.category, 760, 500)} alt="" />
        <div className="scrim" />
        <a className="back-fab" href="/"><Icon n="back" size={20} /></a>
        <form action={toggleSaveAction.bind(null, p.id)} style={{ position: 'absolute', top: 16, right: 16, zIndex: 3 }}>
          <button className={`bm ${p.saved ? 'on' : ''}`} type="submit"><Icon n="bookmark" size={18} fill={p.saved ? 'currentColor' : 'none'} /></button>
        </form>
        <div className="dtitle">
          <span className="frost" style={{ marginBottom: 8 }}><Icon n={CAT_ICON[p.subcategory] || CAT_ICON[p.category]} size={13} /> {catTH(p.category)}{p.subcategory ? ` · ${p.subcategory}` : ''}</span>
          <h1>{i18n(p.name_i18n)}</h1>
          <div className="dmeta">{rev && rev.n > 0 ? <><Icon n="star" fill="#FFC95A" size={15} style={{ color: '#FFC95A', verticalAlign: '-.18em' }} /> {rev.avg} · {rev.n} รีวิว</> : 'ยังไม่มีรีวิว'}</div>
        </div>
      </div>

      <div className="dbody">
        <div className="dactions">
          <a className="dact" href={mapUrl} target="_blank"><Icon n="directions" size={22} />เส้นทาง</a>
          <span className="dact"><Icon n="bookmark" size={22} />บันทึก</span>
          {p.phone ? <a className="dact" href={`tel:${p.phone}`}><Icon n="phone" size={22} />โทร</a> : <span className="dact" style={{ opacity: .5 }}><Icon n="phone" size={22} />โทร</span>}
        </div>

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

        {amen.length > 0 && (<><h2>สิ่งอำนวยความสะดวก</h2><div className="chips">{amen.map((a) => <span className="chip" key={a}>{a}</span>)}</div></>)}

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
          <h2>รีวิว ({rev?.n})</h2>
          <div className="rdist">
            <div className="rbig"><div className="n">{rev?.avg}</div><div className="s">{Array.from({ length: 5 }).map((_, k) => <Icon key={k} n="star" fill="currentColor" size={11} />)}</div><div className="c">{rev?.n} รีวิว</div></div>
            <div className="rbars">{[5, 4, 3, 2, 1].map((st) => (
              <div className="rbarrow" key={st}><span>{st}</span><span className="rtrack"><span className="rfill" style={{ width: `${Math.round(((distMap[st] || 0) / total) * 100)}%` }} /></span></div>
            ))}</div>
          </div>
          {reviews.map((r, i) => (
            <div className="review" key={i}>
              <div className="review-top">
                <span className="rname"><span className="avatar">{(r.display_name || 'ผ')[0]}</span><span className="review-name">{r.display_name || 'ผู้ใช้'}</span></span>
                <span className="stars">{Array.from({ length: r.rating }).map((_, k) => <Icon key={k} n="star" fill="currentColor" size={13} />)}</span>
              </div>
              <div className="review-body">{i18n(r.body_i18n)}</div>
              <div className="review-date">{r.d}</div>
            </div>
          ))}
        </>)}
      </div>
    </>
  );
}
