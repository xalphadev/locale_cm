import { q, i18n, demoUserId } from '@/lib/db';
import { STAY_KINDS } from '@/lib/facets';
import { groupStayRows } from './query';

// Curated-rail data for the /stay DISCOVERY HOME. Every rail comes from honest fields already in our DB —
// NO money, NO booking, NO fake "deals". Same marketplace gate as loadStay so home and results are one universe.
const GATE = `su.status='published' AND su.deleted_at IS NULL AND su.published_to_marketplace AND p.status='published' AND p.is_visible AND p.offers_stay`;

export async function loadStayHome(searchParams: Record<string, string>) {
  const mode = searchParams?.mode === 'daily' ? 'daily' : 'monthly';
  let base: any[] = [], areas: any[] = [], kinds: any[] = [], tonight: any[] = [], saved: any[] = [];
  try {
    const uid = await demoUserId();
    const vac = mode === 'monthly' ? `su.available_units>0` : `su.daily_status<>'full'`;
    // $1=mode, $2=uid — card columns groupStayRows()/PlaceStayCard consume
    const cardCols = `su.id, su.name_i18n, su.rental_mode, su.price_minor, su.price_period, su.image_urls,
      su.available_units, su.daily_status, su.availability_updated_at, su.capacity,
      p.id place_id, p.name_i18n shop_name, p.stay_kind, p.geo::text geo, d.name_i18n district_name,
      EXISTS(SELECT 1 FROM saved_places sp WHERE sp.place_id=p.id AND sp.user_id=$2) saved,
      (SELECT round(avg(rv.rating),1) FROM reviews rv WHERE rv.place_id=p.id AND rv.moderation_status='approved') rating,
      (SELECT count(*) FROM reviews rv WHERE rv.place_id=p.id AND rv.moderation_status='approved') rating_n`;
    const FROM = `FROM stay_units su JOIN places p ON p.id=su.place_id LEFT JOIN districts d ON d.id=p.district_id`;

    // BASE (drives featured / popular / value) — newest first, grouped to one card per place
    const rows = await q<any>(`SELECT ${cardCols} ${FROM} WHERE ${GATE} AND su.rental_mode=$1 AND ${vac} ORDER BY p.created_at DESC LIMIT 200`, [mode, uid]);
    base = groupStayRows(rows, false);

    // ตามย่าน chips — distinct PLACES per district (matches "พบ N ที่พัก")
    areas = await q<any>(`SELECT d.slug, d.name_i18n, count(DISTINCT p.id)::int n FROM districts d JOIN places p ON p.district_id=d.id JOIN stay_units su ON su.place_id=p.id WHERE ${GATE} AND su.rental_mode=$1 GROUP BY d.slug, d.name_i18n HAVING count(DISTINCT p.id)>0 ORDER BY n DESC LIMIT 8`, [mode]);

    // ตามประเภท tiles — distinct PLACES per stay_kind
    kinds = await q<any>(`SELECT p.stay_kind, count(DISTINCT p.id)::int n FROM places p JOIN stay_units su ON su.place_id=p.id WHERE ${GATE} AND su.rental_mode=$1 AND p.stay_kind = ANY($2::text[]) GROUP BY p.stay_kind ORDER BY n DESC`, [mode, STAY_KINDS]);

    // ว่างคืนนี้ — owner-attested vacancy (daily only), NOT a hold
    if (mode === 'daily') {
      const trows = await q<any>(`SELECT ${cardCols} ${FROM} WHERE ${GATE} AND su.rental_mode='daily' AND su.daily_status='vacant' ORDER BY su.availability_updated_at DESC NULLS LAST LIMIT 30`, [mode, uid]);
      tonight = groupStayRows(trows, false).slice(0, 8);
    }

    // บันทึกไว้ — only if signed-in with saves
    if (uid) {
      const srows = await q<any>(`SELECT ${cardCols} FROM saved_places sp2 JOIN places p ON p.id=sp2.place_id JOIN stay_units su ON su.place_id=p.id LEFT JOIN districts d ON d.id=p.district_id WHERE sp2.user_id=$2 AND ${GATE} AND su.rental_mode=$1 ORDER BY sp2.created_at DESC LIMIT 60`, [mode, uid]);
      saved = groupStayRows(srows, false).slice(0, 4);
    }
  } catch { /* db down */ }

  // featured: review-credible + fresh (base is created_at DESC). DERIVED — never paid/sponsored.
  let featured = base.filter((g) => g.ratingN >= 1);
  if (featured.length < 6) { const have = new Set(featured.map((g) => g.id)); for (const g of base) { if (!have.has(g.id)) { featured.push(g); if (featured.length >= 10) break; } } }
  featured = featured.slice(0, 10);
  // popular: ≥5 approved reviews (matches PlaceStayCard fairness gate); hide whole rail if sparse
  let popular = base.filter((g) => g.ratingN >= 5).sort((a, b) => (Number(b.rating) - Number(a.rating)) || (b.ratingN - a.ratingN)).slice(0, 8);
  if (popular.length < 3) popular = [];
  // value: cheapest real price (honest substitute for a deals rail — no stay deals exist)
  const value = base.filter((g) => g.priceMin != null).sort((a, b) => (a.priceMin as number) - (b.priceMin as number)).slice(0, 8);
  if (tonight.length < 3) tonight = [];

  return {
    mode,
    kinds: kinds.filter((k) => k.n > 0).map((k) => ({ kind: k.stay_kind, n: k.n })),
    areas: areas.map((a) => ({ slug: a.slug, name: i18n(a.name_i18n), n: a.n })),
    featured, popular, value, tonight, saved,
  };
}
