-- 0051: optional deposit policy for online bookings (host-direct, no funds held).
-- pay_deposit_pct = 0 → guest pays in full; 1..99 → guest transfers that % now, the rest on arrival
-- (settled host↔guest directly). The booking still records the full amount_minor + the deposit_minor paid.
ALTER TABLE places ADD COLUMN IF NOT EXISTS pay_deposit_pct int NOT NULL DEFAULT 0;
