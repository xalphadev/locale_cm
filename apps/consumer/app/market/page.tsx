import Link from 'next/link';
import { cookies } from 'next/headers';
import { q, i18n } from '@/lib/db';
import { Icon } from '../icons';
import GeoCapture from '../GeoCapture';
import { ProductCard, SUBTYPE_TH } from '../ProductCard';

export const dynamic = 'force-dynamic';

const SUBS = ['fruit', 'vegetable', 'bakery', 'souvenir', 'craft', 'grocery', 'menu_item'];
const SORTS = [{ k: '', l: 'มาใหม่' }, { k: 'near', l: 'ใกล้ฉัน' }, { k: 'season', l: 'ในฤดู' }, { k: 'today', l: 'วันนี้มีของ' }];

export default async function Market({ searchParams }: { searchParams: { sub?: string; sort?: string; q?: string } }) {
  const sub = searchParams?.sub && SUBTYPE_TH[searchParams.sub] ? searchParams.sub : '';
  const sort = ['near', 'season', 'today'].includes(searchParams?.sort || '') ? searchParams!.sort! : '';
  const qtext = String(searchParams?.q || '').slice(0, 60).trim();
  // near-me lens — same c_geo cookie/pattern as home; products rank by their SHOP's distance
  const gm = /^(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)$/.exec(cookies().get('c_geo')?.value ?? '');
  const pt = gm ? { lat: +gm[1], lng: +gm[2] } : null;

  let rows: any[] = [];
  try {
    const where = [`sp.status='published'`, `sp.deleted_at IS NULL`, `p.status='published'`, `p.is_visible`, `NOT sp.sold_out`];
    const params: any[] = [];
    if (sub) { params.push(sub); where.push(`sp.subtype=$${params.length}`); }
    if (sort === 'today') where.push(`sp.available_today`);
    if (qtext) { params.push('%' + qtext + '%'); const n = params.length; where.push(`(sp.name_i18n->>'th' ILIKE $${n} OR sp.name_i18n->>'en' ILIKE $${n} OR p.name_i18n->>'th' ILIKE $${n})`); }
    let order = sort === 'season' ? 'sp.in_season DESC, sp.created_at DESC' : 'sp.created_at DESC';
    if (pt) {
      params.push(pt.lng, pt.lat);
      const distExpr = `ST_Distance(p.geo, ST_SetSRID(ST_MakePoint($${params.length - 1},$${params.length}),4326)::geography)`;
      if (sort === 'near') order = `${distExpr}, sp.created_at DESC`;
      else if (!sort) order = `width_bucket(${distExpr}, 0, 10000, 5), ${order}`;
    }
    rows = await q<any>(`SELECT sp.id, sp.name_i18n, sp.subtype, sp.price_minor, sp.price_unit, sp.price_text_i18n, sp.image_urls,
        sp.in_season, sp.available_today, sp.sold_out, p.id place_id, p.name_i18n shop_name, p.line_id, p.phone
      FROM shop_products sp JOIN places p ON p.id=sp.place_id
      WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT 60`, params);
  } catch { /* db down */ }

  const href = (nextSub: string, nextSort: string, nextQ: string = qtext) => {
    const u = new URLSearchParams();
    if (nextSub) u.set('sub', nextSub); if (nextSort) u.set('sort', nextSort); if (nextQ) u.set('q', nextQ);
    const qs = u.toString(); return qs ? `/market?${qs}` : '/market';
  };

  return (
    <>
      <GeoCapture want={sort === 'near'} has={!!pt} />
      <div className="top">
        <Link className="back" href="/"><Icon n="back" size={18} /> สำรวจ</Link>
        <div className="hi">ของสด ของฝาก จากร้านในนิมมาน</div><h1>ตลาดท้องถิ่น</h1>
      </div>
      <form className="staysearch" method="GET" action="/market">
        {sub && <input type="hidden" name="sub" value={sub} />}
        {sort && <input type="hidden" name="sort" value={sort} />}
        <Icon n="search" size={17} />
        <input name="q" defaultValue={qtext} placeholder="ค้นหาสินค้า / ร้าน" autoComplete="off" />
        {qtext && <Link className="ss-x" href={href(sub, sort, '')} aria-label="ล้างคำค้น"><Icon n="x" size={16} /></Link>}
      </form>
      <div className="segmented">{SORTS.map((s) => <Link key={s.k} href={href(sub, s.k)} className={`seg ${sort === s.k ? 'on' : ''}`}>{s.l}</Link>)}</div>
      <div className="facetbar">
        <Link href={href('', sort)} className={`facet ${!sub ? 'on' : ''}`}>ทั้งหมด</Link>
        {SUBS.map((s) => <Link key={s} href={href(s, sort)} className={`facet ${sub === s ? 'on' : ''}`}>{SUBTYPE_TH[s]}</Link>)}
      </div>
      <h2 style={{ padding: '0 16px', margin: '12px 0 2px' }}>{sub ? SUBTYPE_TH[sub] : 'สินค้าทั้งหมด'} ({rows.length})</h2>
      <div className="pgrid">
        {rows.map((r) => <ProductCard key={r.id} pr={r} line_id={r.line_id} phone={r.phone} shopName={i18n(r.shop_name)} shopHref={`/place/${r.place_id}`} />)}
      </div>
      {rows.length === 0 && <p className="empty">{qtext ? `ไม่พบสินค้าที่ตรงกับ “${qtext}”` : 'ยังไม่มีสินค้าในหมวดนี้'}</p>}
      <p className="shopnote" style={{ margin: '6px 16px 22px' }}><Icon n="chat" size={13} /> ทุกสินค้าติดต่อซื้อกับร้านโดยตรง — Locale ไม่รับชำระเงินในแอป</p>
    </>
  );
}
