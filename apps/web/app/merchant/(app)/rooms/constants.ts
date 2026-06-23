// Shared room field labels. Amenities / building facilities / bills moved to the admin-managed catalog
// (stay_amenity, migration 0044) — loaded via apps/web/lib/amenities.ts and passed into RoomForm as props.
// FURNISHED_TH stays here: it's a fixed enum (stay_units.furnished), not a catalog the admin extends.
export const FURNISHED_TH: Record<string, string> = { furnished: 'เฟอร์ครบ', partial: 'เฟอร์บางส่วน', unfurnished: 'ไม่มีเฟอร์' };
