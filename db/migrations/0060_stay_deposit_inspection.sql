-- 0060_stay_deposit_inspection.sql — STEP 2 (ง): security-deposit settlement + move-in/out room inspection.
-- Record-only (satang), NEVER joined to the ledger/coin_lots — the owner returns the deposit directly; the
-- system records the held amount, itemized deductions, the refundable balance, and WHEN it was refunded.
-- สคบ.: deposit returned within 7 days of lease end (stay_lease.deposit_return_days), deductions only for
-- tenant-caused damage — hence itemized deductions for transparency. Inspections keep move-in/out photos +
-- notes to justify deductions. EXCLUDED from the pillar-4 data product; purge with the lease on PDPA erasure.

CREATE TABLE IF NOT EXISTS stay_deposit_settlement (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id         uuid NOT NULL REFERENCES places(id),
  lease_id         uuid NOT NULL REFERENCES stay_lease(id),
  room_id          uuid REFERENCES stay_room(id),
  tenant_id        uuid REFERENCES stay_tenant(id),
  deposit_minor    bigint NOT NULL DEFAULT 0,          -- held amount (snapshot from the lease at settlement)
  deductions       jsonb NOT NULL DEFAULT '[]',         -- [{label, amount_minor}] — itemized (สคบ. transparency)
  deductions_minor bigint NOT NULL DEFAULT 0,           -- sum of deductions
  refund_minor     bigint NOT NULL DEFAULT 0,           -- max(0, deposit - deductions)
  refunded_at      timestamptz,                         -- when the owner returned it (record-only)
  refunded_note    text,
  note             text,                                -- reason/detail of deductions
  created_by       uuid,
  deleted_at       timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_stay_deposit_lease ON stay_deposit_settlement(lease_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS stay_inspection (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id    uuid NOT NULL REFERENCES places(id),
  lease_id    uuid REFERENCES stay_lease(id),
  room_id     uuid NOT NULL REFERENCES stay_room(id),
  kind        text NOT NULL CHECK (kind IN ('move_in','move_out')),
  photos      text[] NOT NULL DEFAULT '{}',
  note        text,
  created_by  uuid,
  deleted_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stay_inspection_lease ON stay_inspection(lease_id, kind) WHERE deleted_at IS NULL;
