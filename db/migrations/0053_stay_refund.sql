-- 0053_stay_refund.sql — record offline refunds (host-direct model, platform holds no money).
-- When a host returns a deposit/payment to a guest (after a rejected slip, a cancellation, or an
-- un-fulfillable booking) the money moves bank-to-bank between them; we only RECORD that it happened
-- so both sides have a clear trail and refunded bookings drop out of the revenue total.
ALTER TABLE stay_booking_request ADD COLUMN IF NOT EXISTS refunded_at timestamptz;
ALTER TABLE stay_booking_request ADD COLUMN IF NOT EXISTS refunded_minor bigint;
