-- 0054_stay_managed_with_rooms.sql
-- Invariant: a stay_units TYPE that HAS active physical rooms is ALWAYS managed (its consumer-facing
-- vacancy is auto-derived from the room board), never an owner-typed counter. This fixes the broken
-- "unmanaged-with-rooms" state where the typed available_units (e.g. 2) contradicted the real board
-- (e.g. 11 vacant rooms). No money — projection only.
-- Idempotent: the promotion no-ops on a second run (WHERE NOT managed), and re-derive only snaps
-- already-correct counts.

-- 1) promote every type that has ≥1 active physical room to managed
UPDATE stay_units su SET managed = true, updated_at = now()
 WHERE su.deleted_at IS NULL AND NOT su.managed
   AND EXISTS (SELECT 1 FROM stay_room r WHERE r.stay_unit_id = su.id AND r.status = 'active' AND r.deleted_at IS NULL);

-- 2) re-derive available_units / daily_status from the board for every managed type that has rooms
--    (covers the rows promoted above). Uses the canonical fn so projection logic stays single-sourced.
DO $$
DECLARE rid uuid;
BEGIN
  FOR rid IN
    SELECT DISTINCT su.id FROM stay_units su
      JOIN stay_room r ON r.stay_unit_id = su.id AND r.status = 'active' AND r.deleted_at IS NULL
     WHERE su.deleted_at IS NULL AND su.managed = true
  LOOP
    BEGIN
      PERFORM fn_stay_refresh_vacancy(rid);
    EXCEPTION WHEN OTHERS THEN NULL;  -- skip a bad row; a one-time backfill must complete
    END;
  END LOOP;
END $$;
