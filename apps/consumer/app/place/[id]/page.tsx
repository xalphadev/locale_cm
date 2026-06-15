import { q, i18n } from '@/lib/db';

export const dynamic = 'force-dynamic';

const icon = (c: string) => (c === 'eat' ? '☕' : c === 'see' ? '⛩️' : '🎨');
const catLabel = (c: string) => (c === 'eat' ? 'ที่กิน' : c === 'see' ? 'ที่เที่ยว' : 'กิจกรรม');
const eIcon = (k: string) => ({ festival: '🎆', market: '🛍️', performance: '🎭', workshop: '🎨', seasonal: '🌸' } as any)[k] ?? '✨';
const DAYS: [string, string][] = [['mon', 'จันทร์'], ['tue', 'อังคาร'], ['wed', 'พุธ'], ['thu', 'พฤหัส'], ['fri', 'ศุกร์'], ['sat', 'เสาร์'], ['sun', 'อาทิตย์']];
const THM = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function parsePoint(geo: string | null): { lat: number; lng: number } | null {
  if (!geo) return null;
  const m = /POINT\(([-\d.]+)\s+([-\d.]+)\)/i.exec(geo);
  return m ? { lng: parseFloat(m[1]), lat: parseFloat(m[2]) } : null;
}

export default async function PlaceDetail({ params }: { params: { id: string } }) {
  let p: any = null; let events: any[] = []; let quests: any[] = []; let rev: any = null;
  try {
    [p] = await q<any>(
      `SELECT p.id, p.name_i18n, p.description_i18n, p.address_i18n, p.category::text category,
              p.subcategory, p.phone, p.line_id, p.website, p.price_band::text price_band,
              p.opening_hours, p.amenities, p.geo::text geo, d.name_i18n district_name,
              f.freshness_label::text fresh, to_char(p.verified_at,'YYYY-MM-DD') verified_at
       FROM places p
       LEFT JOIN districts d ON d.id=p.district_id
       LEFT JOIN data_freshness f ON f.place_id=p.id
       WHERE p.id=$1 AND p.status='published'`, [params.id]);
    if (p) {
      events = await q<any>(
        `SELECT title_i18n, kind, EXTRACT(DAY FROM starts_at)::int d, EXTRACT(MONTH FROM starts_at)::int m
         FROM events WHERE place_id=$1 AND status='published' ORDER BY starts_at`, [params.id]);
      quests = await q<any>(
        `SELECT DISTINCT q.id, q.title_i18n FROM quest_steps qs JOIN quests q ON q.id=qs.quest_id
         WHERE qs.place_id=$1 AND q.status IN ('active','draft')`, [params.id]);
      [rev] = await q<any>(
        `SELECT count(*)::int n, COALESCE(round(avg(rating),1),0)::text avg FROM reviews WHERE place_id=$1`, [params.id]);
    }
  } catch { /* db down */ }

  if (!p) {
    return (<><div className="top"><a className="back" href="/">‹ กลับ</a><h1>ไม่พบสถานที่</h1></div>
      <div className="body"><p className="muted">สถานที่นี้อาจยังไม่เผยแพร่ หรือถูกลบไปแล้ว</p></div></>);
  }
  const pt = parsePoint(p.geo);
  const hours = p.opening_hours ?? {};
  const amen: string[] = p.amenities ?? [];

  return (
    <>
      <div className="top">
        <a className="back" href="/">‹ กลับ</a>
        <div className="hero-emoji">{icon(p.category)}</div>
        <h1>{i18n(p.name_i18n)}</h1>
        <div className="hero-meta">
          {catLabel(p.category)}{p.subcategory ? ` · ${p.subcategory}` : ''}
          {p.price_band ? ` · ${'฿'.repeat(Number(p.price_band))}` : ''}
        </div>
        <div style={{ marginTop: 6 }}>
          {p.fresh && <span className={`badge ${p.fresh}`}>
            {p.fresh === 'fresh' ? `✓ ตรวจสอบล่าสุด ${p.verified_at ?? ''}` : p.fresh === 'aging' ? 'อัปเดตไม่นาน' : 'ยังไม่ตรวจสอบ'}</span>}
        </div>
      </div>

      <div className="body">
        {i18n(p.description_i18n) && <p className="desc">{i18n(p.description_i18n)}</p>}

        <div className="rating-row">
          <span className="stars">★ {rev && Number(rev.avg) > 0 ? rev.avg : '—'}</span>
          <span className="muted">{rev && rev.n > 0 ? `${rev.n} รีวิว` : 'ยังไม่มีรีวิว'}</span>
        </div>

        <h2>ข้อมูล</h2>
        <div className="info">
          {i18n(p.address_i18n) && <div className="info-row"><span>📍</span><span>{i18n(p.address_i18n)}{p.district_name ? ` · ${i18n(p.district_name)}` : ''}</span></div>}
          {!i18n(p.address_i18n) && p.district_name && <div className="info-row"><span>📍</span><span>{i18n(p.district_name)} · เชียงใหม่</span></div>}
          {p.phone && <div className="info-row"><span>📞</span><a href={`tel:${p.phone}`}>{p.phone}</a></div>}
          {p.line_id && <div className="info-row"><span>💬</span><span>LINE: {p.line_id}</span></div>}
          {p.website && <div className="info-row"><span>🌐</span><a href={p.website}>{p.website}</a></div>}
          {pt && <div className="info-row"><span>🗺️</span>
            <a href={`https://www.google.com/maps/search/?api=1&query=${pt.lat},${pt.lng}`} target="_blank">เปิดในแผนที่</a></div>}
        </div>

        {Object.keys(hours).length > 0 && (
          <>
            <h2>เวลาเปิด-ปิด</h2>
            <div className="hours">
              {DAYS.map(([k, label]) => (
                <div className="hour-row" key={k}>
                  <span>{label}</span>
                  <span className={!hours[k] || hours[k] === 'closed' ? 'muted' : 'mono'}>
                    {!hours[k] || hours[k] === 'closed' ? 'ปิด' : hours[k]}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {amen.length > 0 && (
          <>
            <h2>สิ่งอำนวยความสะดวก</h2>
            <div className="chips">{amen.map((a) => <span className="chip" key={a}>{a}</span>)}</div>
          </>
        )}

        {quests.length > 0 && (
          <>
            <h2>อยู่ในเควสต์</h2>
            {quests.map((qu) => <a className="card" key={qu.id} href="/passport"><div className="thumb">🎯</div>
              <div><div className="nm">{i18n(qu.title_i18n)}</div><div className="meta">เช็คอินที่นี่เพื่อเก็บแสตมป์</div></div></a>)}
          </>
        )}

        {events.length > 0 && (
          <>
            <h2>กิจกรรมที่นี่</h2>
            {events.map((e, i) => <div className="card" key={i}><div className="thumb">{eIcon(e.kind)}</div>
              <div><div className="nm">{i18n(e.title_i18n)}</div><div className="meta">📅 {e.d} {THM[e.m - 1]}</div></div></div>)}
          </>
        )}
      </div>
    </>
  );
}
