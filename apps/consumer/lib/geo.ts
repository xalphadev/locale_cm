// Shared geo helpers (client-safe). geo is stored as geography(POINT) in prod, text in the dev stub;
// both read back via geo::text as "POINT(lng lat)".
export function parsePoint(geo: string | null): { lng: number; lat: number } | null {
  if (!geo) return null;
  const m = /POINT\(([-\d.]+)\s+([-\d.]+)\)/i.exec(geo);
  return m ? { lng: parseFloat(m[1]), lat: parseFloat(m[2]) } : null;
}

// Nimman center — the default a merchant place gets at signup until they drop a real pin.
export const NIMMAN_LNG = 98.967;
export const NIMMAN_LAT = 18.796;
/** True if a coordinate is still the un-pinned Nimman default (so the vacancy map can omit it honestly). */
export function isDefaultGeo(lng: number, lat: number): boolean {
  return Math.abs(lng - NIMMAN_LNG) < 1e-4 && Math.abs(lat - NIMMAN_LAT) < 1e-4;
}
