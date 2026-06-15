import { q, i18n } from '@/lib/db';
import { Icon } from '../icons';
import { RoomCard } from '../RoomCard';
import { STAY_AMENITIES, facetLabel } from '@/lib/facets';

export const dynamic = 'force-dynamic';

const KINDS: Record<string, [string, string][]> = {
  monthly: [['dorm', 'หอพัก'], ['apartment', 'อพาร์ตเมนต์']],
  daily: [['homestay', 'โฮมสเตย์'], ['guesthouse', 'เกสต์เฮาส์'], ['hotel', 'โรงแรม']],
};
const SORTS: Record<string, { k: string; l: string }[]> = {
  monthly: [{ k: '', l: 'มาใหม่' }, { k: 'soon', l: 'ว่างเร็วๆนี้' }, { k: 'cheap', l: 'ราคาประหยัด' }],
  daily: [{ k: '', l: 'มาใหม่' }, { k: 'vacant', l: 'ว่างวันนี้' }, { k: 'cheap', l: 'ราคาประหยัด' }],
};
const FURNISH: [string, string][] = [['furnished', 'เฟอร์ครบ'], ['partial', 'เฟอร์บางส่วน'], ['unfurnished', 'ไม่มีเฟอร์']];

export default async function Stay({ searchParams }: { searchParams: { mode?: string; kind?: string; sort?: string; am?: string; fr?: string } }) {
  const mode = searchParams?.mode === 'daily' ? 'daily' : 'monthly';
  const kinds = KINDS[mode];
  const kind = kinds.some(([k]) => k === searchParams?.kind) ? searchParams!.kind! : '';
  const sorts = SORTS[mode];
  const sort = sorts.some((s) => s.k === searchParams?.sort) ? searchParams!.sort! : '';
  const am = String(searchParams?.am || '').split(',').map((x) => x.trim()).filter((x) => STAY_AMENITIES.includes(x));
  const fr = ['furnished', 'partial', 'unfurnished'].includes(searchParams?.fr || '') ? searchParams!.fr! : '';

  let rows: any[] = [];
  try {
    const where = [`su.status='published'`, `p.status='published'`, `p.is_visible`, `su.rental_mode=$1`];
    const params: any[] = [mode];
    where.push(mode === 'monthly' ? `su.available_units>0` : `su.daily_status<>'full'`);
    if (kind) { params.push(kind); where.push(`p.stay_kind=$${params.length}`); }
    if (am.length) { params.push(am); where.push(`su.unit_amenities @> $${params.length}::text[]`); }
    if (mode === 'monthly' && fr) { params.push(fr); where.push(`su.furnished=$${params.length}`); }
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

  // state-merge URL builder
  const cur = { mode, kind, sort, am: am.join(','), fr };
  const href = (patch: Partial<typeof cur>) => {
    const s = { ...cur, ...patch };
    const u = new URLSearchParams();
    if (s.mode && s.mode !== 'monthly') u.set('mode', s.mode);
    if (s.kind) u.set('kind', s.kind); if (s.sort) u.set('sort', s.sort);
    if (s.am) u.set('am', s.am); if (s.fr) u.set('fr', s.fr);
    const qs = u.toString(); return qs ? `/stay?${qs}` : '/stay';
  };
  const toggleAm = (a: string) => { const set = new Set(am); set.has(a) ? set.delete(a) : set.add(a); return href({ am: [...set].join(',') }); };
  const activeFilters = am.length + (fr ? 1 : 0);

  return (
    <>
      <div className="top">
        <a className="back" href="/"><Icon n="back" size={18} /> สำรวจ</a>
        <div className="hi">หอพัก · อพาร์ตเมนต์ · โฮมสเตย์ ในนิมมาน/ใกล้ มช.</div><h1>ที่พัก</h1>
      </div>
      {/* mode is the primary split — switching it resets kind/sort/furnished */}
      <div className="segmented">
        <a href={href({ mode: 'monthly', kind: '', sort: '', fr: '' })} className={`seg ${mode === 'monthly' ? 'on' : ''}`}>เช่ารายเดือน</a>
        <a href={href({ mode: 'daily', kind: '', sort: '', fr: '' })} className={`seg ${mode === 'daily' ? 'on' : ''}`}>เช่ารายวัน</a>
      </div>
      <div className="facetbar">
        <a href={href({ kind: '' })} className={`facet ${!kind ? 'on' : ''}`}>ทั้งหมด</a>
        {kinds.map(([k, l]) => <a key={k} href={href({ kind: k })} className={`facet ${kind === k ? 'on' : ''}`}>{l}</a>)}
      </div>
      <div className="segmented" style={{ paddingTop: 0 }}>
        {sorts.map((srt) => <a key={srt.k} href={href({ sort: srt.k })} className={`seg ${sort === srt.k ? 'on' : ''}`}>{srt.l}</a>)}
      </div>
      {/* deep filters: amenities (multi) + furnished (monthly) */}
      <div className="facetbar">
        {STAY_AMENITIES.map((a) => <a key={a} href={toggleAm(a)} className={`facet ${am.includes(a) ? 'on' : ''}`}>{facetLabel(a)}</a>)}
        {mode === 'monthly' && FURNISH.map(([k, l]) => <a key={k} href={href({ fr: fr === k ? '' : k })} className={`facet ${fr === k ? 'on' : ''}`}>{l}</a>)}
        {activeFilters > 0 && <a className="facet-clear" href={href({ am: '', fr: '' })}>ล้าง</a>}
      </div>
      <h2 style={{ padding: '0 16px', margin: '12px 0 2px' }}>{mode === 'monthly' ? 'ห้องเช่ารายเดือน' : 'ที่พักรายวัน'} ({rows.length})</h2>
      <div className="pgrid">
        {rows.map((r) => <RoomCard key={r.id} u={r} line_id={r.line_id} phone={r.phone} shopName={i18n(r.shop_name)} shopHref={`/place/${r.place_id}`} />)}
      </div>
      {rows.length === 0 && <p className="empty">ไม่พบที่พักที่ตรงตัวกรอง — ลองเอาตัวกรองออกบ้าง</p>}
      <p className="shopnote" style={{ margin: '6px 16px 22px' }}><Icon n="chat" size={13} /> ติดต่อที่พักโดยตรงเพื่อสอบถาม/จอง — Soi Hop ยังไม่มีระบบจอง/ชำระเงินในแอป</p>
    </>
  );
}
