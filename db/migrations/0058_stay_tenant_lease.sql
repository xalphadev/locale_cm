-- 0058_stay_tenant_lease.sql — STEP 1 of dorm/apartment management: structured TENANT identity + LEASE record.
-- Replaces the free-text stay_room.note name for monthly residents and seeds the whole monthly side
-- (rent invoicing, utility billing, deposit settlement all hang off these). RECORD-ONLY: rent/deposit/advance
-- are display values in satang, NEVER joined to the ledger/coin_lots (same posture as stay_units.deposit_minor,
-- 0020). The platform records money; it never holds or routes it.
--
-- PDPA: lawful basis = CONTRACT PERFORMANCE (ม.24(3)) + LEGAL OBLIGATION (ม.24(6)) — tenant data is collected
-- to run the lease, so there is NO consent flow/column (a privacy notice is shown at the form instead).
-- Data-minimized: store national_id_last4 ONLY — never the full 13-digit number, never an ID-card image
-- (PDPC guidance: photographing IDs is often เกินความจำเป็น). Soft-delete (deleted_at, per 0026) lets an owner
-- honour a PDPA erasure request. EXCLUDED from the pillar-4 data product (like stay_booking_request, docs/13 §2).
--
-- A lease bridges 1:1 to the EXISTING anonymous tenancy spine (stay_occupancy_block, block_kind='tenancy', 0033)
-- via block_id — the GiST double-book authority + calendar rendering stay unchanged; the lease only adds
-- identity + terms beside the block.

CREATE TABLE IF NOT EXISTS stay_tenant (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id           uuid NOT NULL REFERENCES places(id),
  requester_user_id  uuid REFERENCES users(id),          -- bridge to the consumer account when from an in-app lead
  full_name          text NOT NULL,
  phone              text,
  line_id            text,
  email              text,
  emergency_name     text,
  emergency_phone    text,
  national_id_last4  text,                                -- last 4 ONLY — never the full id, never an image (PDPA)
  address_note       text,
  attrs              jsonb NOT NULL DEFAULT '{}',
  deleted_at         timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stay_tenant_place ON stay_tenant(place_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS stay_lease (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id            uuid NOT NULL REFERENCES places(id),
  tenant_id           uuid NOT NULL REFERENCES stay_tenant(id),
  room_id             uuid NOT NULL REFERENCES stay_room(id),
  block_id            uuid REFERENCES stay_occupancy_block(id),    -- 1:1 bridge to the tenancy spine (0033)
  stay_unit_id        uuid REFERENCES stay_units(id),
  booking_request_id  uuid REFERENCES stay_booking_request(id),    -- provenance: which lead this came from
  start_date          date NOT NULL,
  end_date            date,                                        -- NULL = open-ended monthly tenancy
  rent_minor          bigint,                                      -- monthly rent (satang), record-only
  deposit_minor       bigint,                                      -- เงินประกัน, record-only
  advance_minor       bigint,                                      -- เงินล่วงหน้า, record-only (สคบ.: deposit+advance ≤ 3×rent)
  billing_day         smallint CHECK (billing_day BETWEEN 1 AND 31),
  deposit_return_days smallint NOT NULL DEFAULT 7,                 -- สคบ.: deposit returned within 7 days of move-out
  status              text NOT NULL DEFAULT 'active',              -- active | ended | cancelled
  note                text,
  attrs               jsonb NOT NULL DEFAULT '{}',
  created_by          uuid,                                        -- merchant_accounts.id of the creator (no FK; cross-plane)
  deleted_at          timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stay_lease_room  ON stay_lease(room_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_stay_lease_place ON stay_lease(place_id, status) WHERE deleted_at IS NULL;
-- one ACTIVE lease per tenancy block (the 1:1 bridge); NULL block_id (unmanaged listings) is exempt.
CREATE UNIQUE INDEX IF NOT EXISTS idx_stay_lease_block_active ON stay_lease(block_id)
  WHERE status='active' AND deleted_at IS NULL AND block_id IS NOT NULL;
