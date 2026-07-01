-- 0064_stay_invoice_partial_payment.sql
-- Partial payments for monthly rent bills (record-only). Until now stay_invoice was binary:
-- status flipped to 'paid' with no amount recorded. We add paid_minor (satang received so far)
-- so a bill can be part-paid — mirroring the nightly stay_booking_request.paid_minor model.
--
-- Design choice: NO new 'partial' status value (keeps the status CHECK + all the status-FILTER
-- read-sites intact). A part-paid bill STAYS status='issued' (it still has a balance); "partial"
-- is derived in the UI from paid_minor>0 AND paid_minor<total_minor. A bill flips to 'paid' only
-- when paid_minor >= total_minor. Outstanding = total_minor - paid_minor; collected = paid_minor.

ALTER TABLE stay_invoice ADD COLUMN IF NOT EXISTS paid_minor bigint NOT NULL DEFAULT 0;

-- backfill: existing fully-paid bills have received their full total
UPDATE stay_invoice SET paid_minor = total_minor WHERE status = 'paid' AND paid_minor = 0;
