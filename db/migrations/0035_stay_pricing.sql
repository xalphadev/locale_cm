-- 0035_stay_pricing.sql — seasonal pricing (high / low season). DISPLAY-ONLY, exactly like
-- stay_units.price_minor (0020): these numbers are SHOWN to consumers and are NEVER joined to
-- coin_lots / the ledger. No payment, no transaction, no money-plane contact — booking still happens
-- off-app / via the lead inbox (0034). This stays firmly on the safe side of the e-money boundary.
--
-- Price belongs to the room TYPE (stay_units): all "Standard Twin" rooms share a price. A SEASON is a
-- named date window defined ONCE per property (stay_season); a RATE (stay_rate) overrides the type's
-- base price (stay_units.price_minor, the fallback) for that window. season_id NULL on a rate = an
-- ad-hoc window carried on the rate row itself. Read-side resolution for a given date:
--   covering season's rate for the type  →  ad-hoc rate covering the date  →  stay_units.price_minor.

CREATE TABLE IF NOT EXISTS stay_season (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id      uuid NOT NULL REFERENCES places(id),
  label_i18n    jsonb NOT NULL DEFAULT '{}'::jsonb,    -- {"th":"ไฮซีซั่น","en":"High season"}
  start_date    date NOT NULL,
  end_date      date NOT NULL,
  recurs_yearly boolean NOT NULL DEFAULT true,         -- apply the (month,day) window every year
  sort          int NOT NULL DEFAULT 0,
  deleted_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stay_season_place ON stay_season(place_id, start_date) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS stay_rate (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stay_unit_id uuid NOT NULL REFERENCES stay_units(id),
  season_id    uuid REFERENCES stay_season(id),        -- NULL = ad-hoc window on this rate row
  place_id     uuid NOT NULL REFERENCES places(id),    -- denorm for "all rates at this property"
  start_date   date,                                   -- ad-hoc window (used when season_id IS NULL)
  end_date     date,
  price_minor  bigint NOT NULL,                        -- DISPLAY-only THB satang; NEVER joined to the ledger
  price_period text NOT NULL DEFAULT 'night',          -- night | month
  note         text,
  deleted_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stay_rate_unit   ON stay_rate(stay_unit_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_stay_rate_season ON stay_rate(season_id)    WHERE season_id IS NOT NULL AND deleted_at IS NULL;
