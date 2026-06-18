-- 0033_stay_occupancy.sql — date-range occupancy for NIGHTLY (and optional monthly tenancy periods),
-- the anonymous availability calendar, an append-only room audit, + the projection fn that feeds the
-- marketplace vacancy back into stay_units.
--
-- ANONYMOUS by design: a block is (room, date-range, kind, optional note) — NO occupant identity, NO
-- money. The GiST EXCLUDE constraint makes this REAL management: the DB itself refuses to double-book
-- a physical room for stay/tenancy/maintenance. `hold` and cancelled/soft-deleted rows are exempt so a
-- soft hold never hard-blocks. stay_room_event is an append-only audit (no deleted_at), matching the
-- project's immutable-log instinct (0003/0023) but money-free.

CREATE TABLE IF NOT EXISTS stay_occupancy_block (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     uuid NOT NULL REFERENCES stay_room(id),
  place_id    uuid NOT NULL REFERENCES places(id),     -- denorm for property-wide calendar scans
  block_kind  text NOT NULL DEFAULT 'stay',            -- stay(nightly) | tenancy(monthly) | hold | maintenance
  start_date  date NOT NULL,
  end_date    date,                                    -- NULL / far-future = open-ended monthly tenancy
  span        daterange GENERATED ALWAYS AS (daterange(start_date, end_date, '[)')) STORED,
  status      text NOT NULL DEFAULT 'active',          -- active | cancelled | completed
  note        text,                                    -- owner memo (may contain a name); no structured occupant
  created_by  uuid REFERENCES users(id),
  deleted_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  -- a physical room cannot hold two ACTIVE physical blocks over the same dates (holds are exempt)
  CONSTRAINT stay_block_no_overlap EXCLUDE USING gist (room_id WITH =, span WITH &&)
    WHERE (status = 'active' AND block_kind IN ('stay','tenancy','maintenance') AND deleted_at IS NULL)
);
CREATE INDEX IF NOT EXISTS idx_stay_block_room  ON stay_occupancy_block USING gist (room_id, span)  WHERE status='active' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_stay_block_place ON stay_occupancy_block USING gist (place_id, span) WHERE status='active' AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS stay_room_event (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id       uuid NOT NULL REFERENCES stay_room(id),
  block_id      uuid REFERENCES stay_occupancy_block(id),
  place_id      uuid NOT NULL REFERENCES places(id),
  event_kind    text NOT NULL,    -- move_in|move_out|check_in|check_out|block|unblock|status_change|maintenance_open|maintenance_close
  effective_at  timestamptz NOT NULL DEFAULT now(),
  actor_user_id uuid REFERENCES users(id),
  meta          jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stay_room_event_room ON stay_room_event(room_id, effective_at DESC);

-- ── projection: recompute a MANAGED listing's marketplace vacancy from its physical rooms ──
-- Writes into the SAME stay_units columns the consumer /stay browse already reads (available_units,
-- daily_status, availability_updated_at) so the read side needs NO change. No-op for unmanaged rows.
--   monthly → available_units = # rooms whose current state is vacant (stay_room.occupancy_status)
--   daily   → daily_status    = 'vacant' if any room is free TODAY (no active block over today), else 'full'
CREATE OR REPLACE FUNCTION fn_stay_refresh_vacancy(p_stay_unit_id uuid) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  v_mode    text;
  v_managed boolean;
BEGIN
  SELECT rental_mode, managed INTO v_mode, v_managed FROM stay_units WHERE id = p_stay_unit_id;
  IF NOT FOUND OR NOT v_managed THEN RETURN; END IF;

  IF v_mode = 'daily' THEN
    UPDATE stay_units su SET
      daily_status = CASE WHEN EXISTS (
        SELECT 1 FROM stay_room r
         WHERE r.stay_unit_id = su.id AND r.deleted_at IS NULL AND r.status = 'active'
           AND NOT EXISTS (
             SELECT 1 FROM stay_occupancy_block b
              WHERE b.room_id = r.id AND b.status = 'active' AND b.deleted_at IS NULL
                AND b.block_kind IN ('stay','tenancy','maintenance')
                AND b.span @> CURRENT_DATE)
      ) THEN 'vacant' ELSE 'full' END,
      availability_updated_at = now(), updated_at = now()
     WHERE su.id = p_stay_unit_id;
  ELSE
    UPDATE stay_units su SET
      available_units = (
        SELECT count(*) FROM stay_room r
         WHERE r.stay_unit_id = su.id AND r.deleted_at IS NULL AND r.status = 'active'
           AND r.occupancy_status = 'vacant'),
      availability_updated_at = now(), updated_at = now()
     WHERE su.id = p_stay_unit_id;
  END IF;
END $$;
