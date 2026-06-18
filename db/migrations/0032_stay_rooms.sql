-- 0032_stay_rooms.sql — PHYSICAL rooms (the real management depth). One row = one occupiable unit
-- (a numbered room, or a bed in a dorm), as opposed to stay_units which stays the LISTING / room-TYPE.
--
-- NO money, NO structured tenant identity. A per-room `occupancy_status` is the owner's fast MONTHLY
-- state ("301 is occupied, free again 1 Jan"); NIGHTLY date-range blocks live in 0033. The optional
-- free-text `note` is the ONLY place a tenant NAME may appear — owner-entered, for their own memory
-- (NOT a structured occupant record; no national-ID/passport/contact). Soft-delete per 0026.
--
-- Relationship: stay_units (TYPE: "Standard Twin x6") --< stay_room (the 6 physical rooms). The
-- marketplace count available_units becomes COUNT(vacant stay_room) once a listing is `managed`
-- (0031 + fn_stay_refresh_vacancy in 0033). stay_unit_id is NULLABLE so a room can exist before it's
-- tied to a listing, and legacy listings with no rooms keep their hand-typed counts unchanged.

CREATE EXTENSION IF NOT EXISTS btree_gist;   -- needed by the occupancy EXCLUDE constraint in 0033

CREATE TABLE IF NOT EXISTS stay_room (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id         uuid NOT NULL REFERENCES places(id),
  stay_unit_id     uuid REFERENCES stay_units(id),     -- the LISTING/type this room instances (NULL ok)
  merchant_id      uuid REFERENCES merchants(id),      -- denorm, mirrors stay_units (money-plane bridge; NULL until tx)
  code             text NOT NULL,                      -- "201", "A-3", "Bed-4" — the owner's room label
  floor            text,                               -- "1" | "G" | "ชั้น 3" — free text (mixed conventions)
  room_kind        text NOT NULL DEFAULT 'room',       -- room | bed (a dorm berth)
  parent_room_id   uuid REFERENCES stay_room(id),      -- a bed's parent dorm room (NULL for whole rooms)
  capacity         int,                                -- physical capacity (beds in a private room)
  -- MONTHLY fast-path occupancy (owner-set current state; NIGHTLY uses 0033 date blocks instead)
  occupancy_status text NOT NULL DEFAULT 'vacant',     -- vacant | occupied | reserved | maintenance
  occupied_until   date,                               -- expected free date (NULL = open-ended / unknown)
  note             text,                               -- owner's private memo (may contain a tenant name)
  attrs            jsonb NOT NULL DEFAULT '{}'::jsonb,  -- per-room overrides (size, amenities)
  sort             int NOT NULL DEFAULT 0,
  status           text NOT NULL DEFAULT 'active',     -- active | inactive
  deleted_at       timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_stay_room_code  ON stay_room(place_id, code)              WHERE deleted_at IS NULL;
CREATE INDEX        IF NOT EXISTS idx_stay_room_unit  ON stay_room(stay_unit_id, occupancy_status) WHERE deleted_at IS NULL;
CREATE INDEX        IF NOT EXISTS idx_stay_room_place ON stay_room(place_id, status)             WHERE deleted_at IS NULL;
