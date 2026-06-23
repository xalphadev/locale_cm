import Link from 'next/link';
import { q, i18n, cover } from '@/lib/db';
import { Icon } from '../../icons';
import { openNow, freshLabel } from '@/lib/local';

export const dynamic = 'force-dynamic';

const catTH = (c: string) => (c === 'eat' ? 'กิน' : c === 'see' ? 'เที่ยว' : c === 'do' ? 'ทำกิจกรรม' : '');
const MIN_REVIEWS = 5;
const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

// Chain overview: one brand's identity (logo · story · brand-wide loyalty) + every published branch.
// Reached from the "สาขาของ {แบรนด์}" chip on /place/[id] and /stay/[id].
export default async function BrandPage({ params }: { params: { id: string } }) {
  let brand: any = null; let branches: any[] = []; let stamp: any = null;
  if (isUuid(params.id)) {
    try {
      [brand] = await q<any>(`SELECT name_i18n, logo_url, description_i18n FROM brands WHERE id=$1 AND status='active' AND deleted_at IS NULL`, [params.id]);
      if (brand) {
        branches = await q<any>(
          `SELECT p.id, p.name_i18n, p.category::text category, p.subcategory, p.price_band::text price_band,
                  p.opening_hours, p.image_urls, p.address_i18n, p.offers_stay, p.stay_kind,
                  d.name_i18n district_name, fr.last_verified_at, rv.n::int rev_n, rv.avg::text rev_avg
             FROM places p
             LEFT JOIN districts d ON d.id=p.district_id
             LEFT JOIN data_freshness fr ON fr.place_id=p.id
             LEFT JOIN LATERAL (SELECT count(*) n, round(avg(rating),1) avg FROM reviews r WHERE r.place_id=p.id AND r.moderation_status='approved') rv ON true
            WHERE p.brand_id=$1 AND p.status='published' AND p.is_visible
            ORDER BY rv.n DESC NULLS LAST, p.created_at`, [params.id]);
        const [sprog] = await q<any>(`SELECT points_name_i18n FROM stamp_programs WHERE brand_id=$1 AND status='active'`, [params.id]);
        if (sprog) {
          const srew = await q<any>(`SELECT title_i18n, cost_stamps FROM stamp_rewards WHERE brand_id=$1 AND status='active' AND deleted_at IS NULL ORDER BY cost_stamps LIMIT 3`, [params.id]);
          stamp = { pointsName: i18n(sprog.points_name_i18n) || 'แต้ม', rewards: srew };
        }
      }
    } catch { /* db down */ }
  }

  if (!brand) {
    return (<><div className="top"><Link className="back" href="/"><Icon n="back" size={18} /> สำรวจ</Link><h1>ไม่พบแบรนด์</h1></div></>);
  }
  const name = i18n(brand.name_i18n);
  const desc = i18n(brand.description_i18n);

  return (
    <>
      <div className="top">
        <Link className="back" href="/"><Icon n="back" size={18} /> สำรวจ</Link>
      </div>

      <div className="brandhero">
        {brand.logo_url && <img className="brandhero-logo" src={brand.logo_url} alt="" />}
        <div className="brandhero-tx">
          <h1 className="brandhero-name">{name}</h1>
          <div className="brandhero-sub"><Icon n="store" size={13} /> {branches.length} สาขา</div>
        </div>
      </div>
      {desc && <p className="brandhero-desc">{desc}</p>}

      {stamp && (
        <div className="brandpad">
          <section className="pstamp">
            <div className="pstamp-h"><span className="pstamp-ic"><Icon n="sparkles" size={17} /></span> สะสม{stamp.pointsName} · ใช้ได้ทุกสาขา</div>
            <div className="pstamp-sub">
              {stamp.rewards[0] ? `ครบ ${stamp.rewards[0].cost_stamps} แลก${i18n(stamp.rewards[0].title_i18n)}` : `เก็บ${stamp.pointsName}ที่สาขาใดก็ได้`} — แต้มรวมทุกสาขา ดูบัตรในกระเป๋า
            </div>
          </section>
        </div>
      )}

      <h2 className="brandsec">สาขาทั้งหมด ({branches.length})</h2>
      <div className="llist">
        {branches.map((p) => {
          const n = p.rev_n || 0; const avg = Number(p.rev_avg) || 0;
          const scored = n >= MIN_REVIEWS;
          const cls = avg >= 4.5 ? 'hi' : avg >= 3.8 ? 'mid' : 'lo';
          const open = openNow(p.opening_hours);
          const fresh = freshLabel(p.last_verified_at);
          const where = i18n(p.address_i18n) || (p.district_name ? i18n(p.district_name) : (p.offers_stay ? 'ที่พัก' : 'สาขา'));
          return (
            <Link className="lrow" href={`/place/${p.id}`} key={p.id}>
              <span className="lthumb-wrap"><img className="lthumb" src={(p.image_urls && p.image_urls[0]) || cover(p.id, p.subcategory, p.category, 170, 170)} alt="" loading="lazy" /></span>
              <div className="lc">
                <div className="lname">{i18n(p.name_i18n)}</div>
                <div className="lmeta">
                  {open.open ? <span className={`openpip ${open.closesSoon ? 'soon' : ''}`}><i /> {open.label}</span>
                    : open.label ? <span className="openpip closed"><i /> {open.label}</span> : null}
                  <span className="lwhere">{p.offers_stay ? `ที่พัก${p.district_name ? ' · ' + i18n(p.district_name) : ''}` : where}</span>
                  {scored && <><span className="mdot">·</span><span>{n} รีวิว</span></>}
                </div>
                {fresh && <div className="lfresh"><Icon n="check" size={11} /> {fresh}</div>}
              </div>
              {scored ? <span className={`score ${cls}`}>{p.rev_avg}</span> : <span className="newbadge">ใหม่<br />น่าลอง</span>}
            </Link>
          );
        })}
        {branches.length === 0 && <p className="empty">ยังไม่มีสาขาที่เผยแพร่</p>}
      </div>
    </>
  );
}
