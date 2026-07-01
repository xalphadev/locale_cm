import { q, i18n } from './db';

// Reads the admin-managed amenity catalog (stay_amenity, migration 0044) — the same table the merchant form
// writes against. Server-only; pass results into the (client) filter sheet and use the label map on detail.
export type AmenOpt = { key: string; label: string };

/** Active in-unit amenities + common-area facilities, for the /stay filter chips (admin sort order). */
export async function loadStayFacets(): Promise<{ amenity: AmenOpt[]; building: AmenOpt[] }> {
  const rows = await q<{ grp: string; key: string; label_i18n: any }>(
    `SELECT grp, key, label_i18n FROM stay_amenity WHERE active AND grp IN ('amenity','building') ORDER BY grp, sort, key`);
  const pick = (g: string): AmenOpt[] => rows.filter((r) => r.grp === g).map((r) => ({ key: r.key, label: i18n(r.label_i18n) }));
  return { amenity: pick('amenity'), building: pick('building') };
}

/** key → label for DISPLAY on the stay detail page (all rows incl inactive). */
export async function stayAmenityLabels(): Promise<Record<string, string>> {
  const rows = await q<{ key: string; label_i18n: any }>(`SELECT key, label_i18n FROM stay_amenity`);
  const m: Record<string, string> = {};
  for (const r of rows) m[r.key] = i18n(r.label_i18n);
  return m;
}

// ── place facets (place_facet, 0068) — the admin-managed successor of the hardcoded facets.ts lists ──

export type PlaceFacet = { key: string; label: string; cats: string[]; subs: string[]; active: boolean };

/** The whole place-facet catalog, admin sort order (one query; includes inactive for label lookups). */
export async function loadPlaceFacets(): Promise<PlaceFacet[]> {
  const rows = await q<any>(`SELECT key, label_i18n, cats, subs, active FROM place_facet ORDER BY sort, key`);
  return rows.map((r) => ({ key: r.key, label: i18n(r.label_i18n), cats: r.cats || [], subs: r.subs || [], active: !!r.active }));
}

/** Facet tokens to OFFER for a subcategory (preferred) else category — the old facetsFor(), DB-backed. */
export function offerFacets(list: PlaceFacet[], cat?: string | null, sub?: string | null): string[] {
  const live = list.filter((f) => f.active);
  const bySub = sub ? live.filter((f) => f.subs.includes(sub)) : [];
  if (bySub.length) return bySub.map((f) => f.key);
  return cat ? live.filter((f) => f.cats.includes(cat)).map((f) => f.key) : [];
}

/** key → label map from a loaded catalog (all rows — an inactive key still labels old places). */
export function facetLabelMap(list: PlaceFacet[]): Record<string, string> {
  const m: Record<string, string> = {};
  for (const f of list) m[f.key] = f.label;
  return m;
}
