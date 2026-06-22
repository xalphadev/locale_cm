import { q, i18n } from './db';

// Admin-managed amenity catalog (stay_amenity, migration 0044) — the single source of truth that replaced the
// hardcoded merchant constants + consumer facets. Server-only (queries the DB); pass results into client forms.
export type AmenOpt = { key: string; label: string };
export type AmenityCatalog = { amenity: AmenOpt[]; building: AmenOpt[]; bills: AmenOpt[] };

/** Active options grouped for the form/filter chips, in admin sort order. */
export async function loadAmenityCatalog(): Promise<AmenityCatalog> {
  const rows = await q<{ grp: string; key: string; label_i18n: any }>(
    `SELECT grp, key, label_i18n FROM stay_amenity WHERE active ORDER BY grp, sort, key`);
  const pick = (g: string): AmenOpt[] => rows.filter((r) => r.grp === g).map((r) => ({ key: r.key, label: i18n(r.label_i18n) }));
  return { amenity: pick('amenity'), building: pick('building'), bills: pick('bills') };
}

/** key → label for DISPLAY, including inactive rows so an existing selection of a retired key still renders. */
export async function amenityLabels(): Promise<Record<string, string>> {
  const rows = await q<{ key: string; label_i18n: any }>(`SELECT key, label_i18n FROM stay_amenity`);
  const m: Record<string, string> = {};
  for (const r of rows) m[r.key] = i18n(r.label_i18n);
  return m;
}
