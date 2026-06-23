import { i18n } from './db';

// Single source of truth for "is this branch complete enough to look good to customers?" — used by the
// read-only branch view (/merchant/shop) AND the dashboard nudge (/merchant) so the two can't drift.
export const NIMMAN_LNG = 98.967, NIMMAN_LAT = 18.796;

export function parsePoint(geo: string | null) {
  if (!geo) return null;
  const m = /POINT\(([-\d.]+)\s+([-\d.]+)\)/i.exec(geo);
  return m ? { lng: parseFloat(m[1]), lat: parseFloat(m[2]) } : null;
}

/** The 5 things a branch needs to look complete to customers. Pass a places row with
 *  image_urls, address_i18n, geo (::text), opening_hours, phone, line_id. */
export function shopReadiness(p: any) {
  const pt = parsePoint(p?.geo ?? null);
  // an unpinned shop sits exactly on the Nimman default → treat that as "not pinned"
  const pinned = !!pt && !(Math.abs(pt.lng - NIMMAN_LNG) < 1e-4 && Math.abs(pt.lat - NIMMAN_LAT) < 1e-4);
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
