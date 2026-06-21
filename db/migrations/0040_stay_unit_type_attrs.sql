-- ============================================================================
-- 0040_stay_unit_type_attrs.sql — per-TYPE accommodation detail (additive, no money).
-- stay_units was one generic shape; add the high-value type-specific fields as typed columns
-- (indexable/filterable) + a jsonb `attrs` bag for the long tail (breakfast, cancellation, host,
-- meals, building amenities, electricity rate, house rules). Each accommodation kind surfaces the
-- subset it needs via a per-kind manifest in the app. All nullable → zero impact on existing rows.
-- ============================================================================
ALTER TABLE stay_units
  ADD COLUMN IF NOT EXISTS bedrooms       int,
  ADD COLUMN IF NOT EXISTS bathrooms      int,
  ADD COLUMN IF NOT EXISTS gender_policy  text,   -- 'any' | 'female' | 'male'  (dorm/hostel)
  ADD COLUMN IF NOT EXISTS check_in_time  text,   -- 'HH:MM' (nightly)
  ADD COLUMN IF NOT EXISTS check_out_time text,
  ADD COLUMN IF NOT EXISTS attrs          jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_stay_units_bedrooms ON stay_units(bedrooms) WHERE bedrooms IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stay_units_gender   ON stay_units(gender_policy) WHERE gender_policy IS NOT NULL;
