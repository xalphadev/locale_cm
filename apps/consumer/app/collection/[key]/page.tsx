import { q, i18n, cover } from '@/lib/db';
import { Icon } from '../../icons';
import { collectionByKey } from '@/lib/collections';
import { openNow, freshLabel } from '@/lib/local';

export const dynamic = 'force-dynamic';

const catTH = (c: string) => (c === 'eat' ? 'กิน' : c === 'see' ? 'เที่ยว' : 'ทำกิจกรรม');
const MIN_REVIEWS = 5;

export default async function CollectionPage({ params }: { params: { key: string } }) {
  const col = collectionByKey(params.key);
  if (!col) {
    return (<><div className="top"><a className="back" href="/"><Icon n="back" size={18} /> สำรวจ</a><h1>ไม่พบคอลเลกชัน</h1></div></>);
  }

  let rows: any[] = [];
  try {
    rows = await q<any>(
      `SELECT p.id, p.name_i18n, p.category::text category, p.subcategory, p.price_band::text price_band,
              p.opening_hours, fr.last_verified_at, rv.n::int rev_n, rv.avg::text rev_avg
         FROM places p
         LEFT JOIN data_freshness fr ON fr.place_id=p.id
         LEFT JOIN LATERAL (SELECT count(*) n, round(avg(rating),1) avg FROM reviews r
           WHERE r.place_id=p.id AND r.moderation_status='approved') rv ON true
        WHERE p.status='published' AND p.is_visible AND NOT p.offers_stay AND (${col.cond})
        ORDER BY rv.n DESC NULLS LAST, p.verified_at DESC NULLS LAST LIMIT 60`);
  } catch { /* db down */ }

  return (
    <>
      <div className="top">
        <a className="back" href="/"><Icon n="back" size={18} /> สำรวจ</a>
        <div className="hi"><Icon n={col.icon} size={15} /> ไกด์ท้องถิ่น</div>
        <h1>{col.th}</h1>
        <p className="top-sub">{col.sub} · {rows.length} ที่</p>
      </div>
      <div className="llist">
        {rows.map((p) => {
          const n = p.rev_n || 0; const avg = Number(p.rev_avg) || 0;
          const scored = n >= MIN_REVIEWS;
          const cls = avg >= 4.5 ? 'hi' : avg >= 3.8 ? 'mid' : 'lo';
          const open = openNow(p.opening_hours);
          const fresh = freshLabel(p.last_verified_at);
          return (
            <a className="lrow" href={`/place/${p.id}`} key={p.id}>
              <span className="lthumb-wrap"><img className="lthumb" src={cover(p.id, p.subcategory, p.category, 170, 170)} alt="" loading="lazy" /></span>
              <div className="lc">
                <div className="lname">{i18n(p.name_i18n)}</div>
                <div className="lmeta">
                  {open.open ? <span className={`openpip ${open.closesSoon ? 'soon' : ''}`}><i /> {open.label}</span>
                    : open.label ? <span className="openpip closed"><i /> {open.label}</span> : null}
                  <span>{p.subcategory || catTH(p.category)}</span>
                  {p.price_band && <><span className="mdot">·</span><span>{'฿'.repeat(Number(p.price_band))}</span></>}
                  {scored && <><span className="mdot">·</span><span>{n} รีวิว</span></>}
                </div>
                {fresh && <div className="lfresh"><Icon n="check" size={11} /> {fresh}</div>}
              </div>
              {scored ? <span className={`score ${cls}`}>{p.rev_avg}</span> : <span className="newbadge">ใหม่<br />น่าลอง</span>}
            </a>
          );
        })}
        {rows.length === 0 && <p className="empty">ยังไม่มีร้านในคอลเลกชันนี้</p>}
      </div>
    </>
  );
}
