-- 0059_stay_invoice_meter.sql — STEP 2: monthly rent+utility INVOICE + utility METER readings + per-property
-- utility RATES. Record-only (satang), NEVER joined to the ledger/coin_lots (same posture as stay_lease /
-- stay_units.deposit_minor). The platform records the bill + a "paid" event; the owner collects offline.
--
-- สคบ. (controlled residential-lease contract): utilities MUST be billed at the ACTUAL MEA/PEA/waterworks
-- per-unit rate — NO markup (penalty ≤1yr / ≤100k). The owner enters that rate; each bill line SNAPSHOTS the
-- rate + the two meter readings so units×rate is shown transparently and an issued bill can't change
-- retroactively. An invoice must be issued ≥3 days before its due date (enforced in generateInvoiceAction).
-- Rent is VAT-exempt (ม.81(1)(ต)); utilities/services are VAT-able ONLY above the 1.8M THB/yr threshold, so VAT
-- is OFF by default (opt-in via utility_rates.vat_enabled). EXCLUDED from the pillar-4 data product.

-- per-property utility tariffs the owner enters (ตามจริง). keys (satang): electricity_minor_per_unit,
-- water_minor_per_unit, water_flat_minor, common_fee_minor; water_mode ('metered'|'flat'); vat_enabled, vat_pct.
-- per-lease override lives in the existing stay_lease.attrs.utility_rates.
ALTER TABLE places ADD COLUMN IF NOT EXISTS utility_rates jsonb NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS stay_meter_reading (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id      uuid NOT NULL REFERENCES places(id),
  room_id       uuid NOT NULL REFERENCES stay_room(id),
  lease_id      uuid REFERENCES stay_lease(id),           -- tenancy the reading was taken under (audit); survives turnover
  utility       text NOT NULL CHECK (utility IN ('electricity','water')),
  reading_value numeric(12,2) NOT NULL,                   -- cumulative meter number; usage = curr − prev
  read_on       date NOT NULL DEFAULT CURRENT_DATE,
  note          text,
  created_by    uuid,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stay_meter_room ON stay_meter_reading(room_id, utility, read_on DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_stay_meter_room_day ON stay_meter_reading(room_id, utility, read_on);

CREATE TABLE IF NOT EXISTS stay_invoice (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id       uuid NOT NULL REFERENCES places(id),
  lease_id       uuid NOT NULL REFERENCES stay_lease(id),
  room_id        uuid NOT NULL REFERENCES stay_room(id),
  tenant_id      uuid REFERENCES stay_tenant(id),
  period_ym      text NOT NULL,                           -- 'YYYY-MM' rent month
  issue_date     date NOT NULL,
  due_date       date NOT NULL,
  subtotal_minor bigint NOT NULL DEFAULT 0,
  vat_minor      bigint NOT NULL DEFAULT 0,
  total_minor    bigint NOT NULL DEFAULT 0,
  status         text NOT NULL DEFAULT 'issued' CHECK (status IN ('draft','issued','paid','void')),
  paid_at        timestamptz,
  paid_note      text,
  ref            text,                                    -- human bill no
  note           text,
  created_by     uuid,
  deleted_at     timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_stay_invoice_lease_period ON stay_invoice(lease_id, period_ym) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_stay_invoice_place ON stay_invoice(place_id, status) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS stay_invoice_line (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id   uuid NOT NULL REFERENCES stay_invoice(id) ON DELETE CASCADE,
  kind         text NOT NULL CHECK (kind IN ('rent','electricity','water','common_fee','service','other')),
  label        text NOT NULL,
  units        numeric(12,2),                             -- metered units (curr−prev) for electricity/water
  rate_minor   bigint,                                    -- per-unit tariff SNAPSHOTTED at generation
  prev_reading numeric(12,2),
  curr_reading numeric(12,2),
  amount_minor bigint NOT NULL,
  vatable      boolean NOT NULL DEFAULT false,
  sort         smallint NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_stay_invoice_line_inv ON stay_invoice_line(invoice_id);
