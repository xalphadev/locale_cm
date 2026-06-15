import { q, i18n } from '@/lib/db';
import { Icon } from '../icons';
import { RoomCard } from '../RoomCard';

export const dynamic = 'force-dynamic';

const KINDS: Record<string, [string, string][]> = {
  monthly: [['dorm', 'หอพัก'], ['apartment', 'อพาร์ตเมนต์']],
  daily: [['homestay', 'โฮมสเตย์'], ['guesthouse', 'เกสต์เฮาส์'], ['hotel', 'โรงแรม']],
};
const SORTS: Record<string, { k: string; l: string }[]> = {
  monthly: [{ k: '', l: 'มาใหม่' }, { k: 'soon', l: 'ว่างเร็วๆนี้' }, { k: 'cheap', l: 'ราคาประหยัด' }],
  daily: [{ k: '', l: 'มาใหม่' }, { k: 'vacant', l: 'ว่างวันนี้' }, { k: 'cheap', l: 'ราคาประหยัด' }],
};

export default async function Stay({ searchParams }: { searchParams: { mode?: string; kind?: string; sort?: string } }) {
  const mode = searchParams?.mode === 'daily' ? 'daily' : 'monthly';
  const kinds = KINDS[mode];
  const kind = kinds.some(([k]) => k === searchParams?.kind) ? searchParams!.kind! : '';
  const sorts = SORTS[mode];
  const sort = sorts.some((s) => s.k === searchParams?.sort) ? searchParams!.sort! : '';

  let rows: any[] = [];
  try {
    const where = [`su.status='published'`, `p.status='published'`, `p.is_visible`, `su.rental_mode=$1`];
    const params: any[] = [mode];
    // mode availability gate (monthly: vacant units; daily: not marked full)
    where.push(mode === 'monthly' ? `su.available_units>0` : `su.daily_status<>'full'`);
    if (kind) { params.push(kind); where.push(`p.stay_kind=$${params.length}`); }
    const order = mode === 'monthly'
      ? (sort === 'soon' ? 'su.available_from NULLS FIRST, su.created_at DESC'
        : sort === 'cheap' ? 'su.price_minor ASC NULLS LAST' : 'su.created_at DESC')
      : (sort === 'vacant' ? `(su.daily_status='vacant') DESC, su.created_at DESC`
        : sort === 'cheap' ? 'su.price_minor ASC NULLS LAST' : 'su.created_at DESC');
    rows = await q<any>(
      `SELECT su.id, su.name_i18n, su.rental_mode, su.price_minor, su.price_period, su.price_text_i18n, su.image_urls,
              su.available_units, su.available_from, su.daily_status, su.availability_updated_at,
              su.capacity, su.deposit_minor, su.min_stay, su.furnished,
              p.id place_id, p.name_i18n shop_name, p.stay_kind, p.line_id, p.phone
         FROM stay_units su JOIN places p ON p.id=su.place_id
        WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT 60`, params);
  } catch { /* db down */ }

  const href = (m: string, k: string, s: string) => {
    const u = new URLSearchParams();
    if (m !== 'monthly') u.set('mode', m);
    if (k) u.set('kind', k); if (s) u.set('sort', s);
    const qs = u.toString(); return qs ? `/stay?${qs}` : '/stay';
  };

  return (
    <>
      <div className="top">
        <a className="back" href="/"><Icon n="back" size={18} /> สำรวจ</a>
        <div className="hi">หอพัก · อพาร์ตเมนต์ · โฮมสเตย์ ในนิมมาน/ใกล้ มช.</div><h1>ที่พัก</h1>
      </div>
      {/* mode is the primary split — different questions, columns, facets */}
      <div className="segmented">
        <a href={href('monthly', '', '')} className={`seg ${mode === 'monthly' ? 'on' : ''}`}>เช่ารายเดือน</a>
        <a href={href('daily', '', '')} className={`seg ${mode === 'daily' ? 'on' : ''}`}>เช่ารายวัน</a>
      </div>
      <div className="facetbar">
        <a href={href(mode, '', sort)} className={`facet ${!kind ? 'on' : ''}`}>ทั้งหมด</a>
        {kinds.map(([k, l]) => <a key={k} href={href(mode, k, sort)} className={`facet ${kind === k ? 'on' : ''}`}>{l}</a>)}
      </div>
      <div className="segmented" style={{ paddingTop: 0 }}>
        {sorts.map((srt) => <a key={srt.k} href={href(mode, kind, srt.k)} className={`seg ${sort === srt.k ? 'on' : ''}`}>{srt.l}</a>)}
      </div>
      <h2 style={{ padding: '0 16px', margin: '12px 0 2px' }}>{mode === 'monthly' ? 'ห้องเช่ารายเดือน' : 'ที่พักรายวัน'} ({rows.length})</h2>
      <div className="pgrid">
        {rows.map((r) => <RoomCard key={r.id} u={r} line_id={r.line_id} phone={r.phone} shopName={i18n(r.shop_name)} shopHref={`/place/${r.place_id}`} />)}
      </div>
      {rows.length === 0 && <p className="empty">ยังไม่มีที่พักในหมวดนี้ — กำลังเปิดรับเพิ่ม</p>}
      <p className="shopnote" style={{ margin: '6px 16px 22px' }}><Icon n="chat" size={13} /> ติดต่อที่พักโดยตรงเพื่อสอบถาม/จอง — Soi Hop ยังไม่มีระบบจอง/ชำระเงินในแอป</p>
    </>
  );
}
