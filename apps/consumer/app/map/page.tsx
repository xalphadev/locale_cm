import { q, i18n } from '@/lib/db';
import MapView from './MapView';

export const dynamic = 'force-dynamic';

function parsePoint(geo: string | null) {
  if (!geo) return null;
  const m = /POINT\(([-\d.]+)\s+([-\d.]+)\)/i.exec(geo);
  return m ? { lng: parseFloat(m[1]), lat: parseFloat(m[2]) } : null;
}

export default async function MapPage() {
  let rows: any[] = [];
  try {
    rows = await q<any>(
      `SELECT p.id, p.name_i18n, p.category::text category, p.subcategory, p.geo::text geo,
              rv.n::int rev_n, rv.avg::text rev_avg
       FROM places p
       LEFT JOIN LATERAL (SELECT count(*) n, round(avg(rating),1) avg FROM reviews r
                          WHERE r.place_id=p.id AND r.moderation_status='approved') rv ON true
       WHERE p.status='published' AND p.is_visible`);
  } catch { /* db down */ }

  const places = rows
    .map((r) => { const pt = parsePoint(r.geo); return pt ? {
      id: r.id, name: i18n(r.name_i18n), category: r.category, subcategory: r.subcategory,
      lat: pt.lat, lng: pt.lng, rev_n: r.rev_n ?? 0, rev_avg: r.rev_avg,
    } : null; })
    .filter(Boolean) as any[];

  return <MapView places={places} />;
}
