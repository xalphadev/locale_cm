-- 0038_stay_units_available.sql — ONE place for the per-date availability predicate (the SAME one the
-- GiST EXCLUDE in 0033 enforces), so the consumer date search, the detail calendar, and the merchant
-- tools can never drift on what "available" means. Read-only, set-returning; reuses stay_occupancy_block.span.
--
-- A nightly TYPE is available for [p_from, p_to) iff ≥1 of its ACTIVE physical rooms has NO overlapping
-- active stay/tenancy/maintenance block. Returns the count of free rooms (the bookable units) per type.
-- Daily + MANAGED only (unmanaged daily has no physical rooms; monthly is a different model).
CREATE OR REPLACE FUNCTION fn_stay_units_available(p_city_id uuid, p_from date, p_to date)
RETURNS TABLE(stay_unit_id uuid, free_rooms int)
LANGUAGE sql STABLE AS $$
  SELECT su.id, count(r.id)::int AS free_rooms
    FROM stay_units su
    JOIN places p   ON p.id = su.place_id
    JOIN stay_room r ON r.stay_unit_id = su.id AND r.status = 'active' AND r.deleted_at IS NULL
   WHERE su.rental_mode = 'daily' AND su.managed AND su.deleted_at IS NULL
     AND p.city_id = p_city_id
     AND NOT EXISTS (
       SELECT 1 FROM stay_occupancy_block b
        WHERE b.room_id = r.id AND b.status = 'active' AND b.deleted_at IS NULL
          AND b.block_kind IN ('stay','tenancy','maintenance')
          AND b.span && daterange(p_from, p_to, '[)'))
   GROUP BY su.id
   HAVING count(r.id) > 0;
$$;
