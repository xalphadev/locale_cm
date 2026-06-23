// Client-safe geo constants + helpers (NO server deps) — the single Chiang Mai default and WKT parsing, shared by
// the server readiness check (lib/readiness.ts) AND the client GeoPicker, so "is it actually pinned?" and the
// fallback map centre can never drift apart (they used to: 98.967/18.796 vs 18.7965/98.9685).
export const NIMMAN_LNG = 98.967, NIMMAN_LAT = 18.796;
export const CM_BBOX = { minLng: 98.6, maxLng: 99.3, minLat: 18.5, maxLat: 19.2 };

export function parsePoint(geo: string | null) {
  if (!geo) return null;
  const m = /POINT\(([-\d.]+)\s+([-\d.]+)\)/i.exec(geo);
  return m ? { lng: parseFloat(m[1]), lat: parseFloat(m[2]) } : null;
}

/** A pin still sitting on the Chiang Mai default (within ~11 m) = effectively "not placed yet". */
export function isDefaultGeo(lat: number, lng: number) {
  return Math.abs(lng - NIMMAN_LNG) < 1e-4 && Math.abs(lat - NIMMAN_LAT) < 1e-4;
}

/** Inside the Chiang Mai bounding box — the only coords we accept on save. */
export function inCmBbox(lat: number, lng: number) {
  return isFinite(lat) && isFinite(lng) && lng >= CM_BBOX.minLng && lng <= CM_BBOX.maxLng && lat >= CM_BBOX.minLat && lat <= CM_BBOX.maxLat;
}
