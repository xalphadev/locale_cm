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
