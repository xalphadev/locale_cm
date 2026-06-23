import { i18n } from './db';
import { parsePoint, isDefaultGeo } from './geo';

// Single source of truth for "is this branch complete enough to look good to customers?" — used by the
// read-only branch view (/merchant/shop) AND the dashboard nudge (/merchant) so the two can't drift.
// Geo constants/parsing live in ./geo (client-safe, shared with the GeoPicker).
export { NIMMAN_LNG, NIMMAN_LAT, parsePoint } from './geo';

/** The 5 things a branch needs to look complete to customers. Pass a places row with
 *  image_urls, address_i18n, geo (::text), opening_hours, phone, line_id. */
export function shopReadiness(p: any) {
  const pt = parsePoint(p?.geo ?? null);
  // a pin still on the Chiang Mai default → treat as "not pinned"
  const pinned = !!pt && !isDefaultGeo(pt.lat, pt.lng);
  const ready = [
    { ok: (p?.image_urls || []).filter(Boolean).length > 0, label: 'รูป' },
    { ok: !!i18n(p?.address_i18n), label: 'ที่อยู่' },
    { ok: pinned, label: 'ปักหมุด' },
    { ok: Object.keys(p?.opening_hours || {}).length > 0, label: 'เวลาเปิด-ปิด' },
    { ok: !!(p?.phone || p?.line_id), label: 'ช่องทางติดต่อ' },
  ];
  const missing = ready.filter((r) => !r.ok).map((r) => r.label);
  const pct = Math.round(((ready.length - missing.length) / ready.length) * 100);
  return { pt, pinned, ready, missing, pct };
}
