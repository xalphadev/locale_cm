-- 0052_slip_retention.sql — PDPA for online-payment slips (financial PII).
-- The slip image carries bank-account details. Lead contact PII is already aged out (step 5), but slips
-- were kept forever — especially on CONVERTED bookings (an active stay), which step 5 intentionally skips.
-- Add step 7: null the slip_url reference once a booking is well past its useful life (checked out + 90d, a
-- rejected slip + 30d, or an expired booking). The DB reference goes so the app can no longer surface it; the
-- underlying storage object should be aged out by an S3/MinIO lifecycle rule on the `…/slips/` prefix.
-- CREATE OR REPLACE — idempotent; re-applies the whole function verbatim plus the new step.
CREATE OR REPLACE FUNCTION fn_run_maintenance() RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
  n_expired int; n_activated int; n_fresh int; n_otp int; n_lead int; n_stale int; n_slip int;
BEGIN
  -- 1) end deals whose window has closed
  UPDATE deals SET status='expired'
   WHERE status IN ('active','scheduled') AND ends_at IS NOT NULL AND ends_at < now();
  GET DIAGNOSTICS n_expired = ROW_COUNT;

  -- 2) bring scheduled deals live once their window opens
  UPDATE deals SET status='active'
   WHERE status='scheduled'
     AND (starts_at IS NULL OR starts_at <= now())
     AND (ends_at IS NULL OR ends_at > now());
  GET DIAGNOSTICS n_activated = ROW_COUNT;

  -- 3) decay freshness labels by age (fresh < 30d, aging < 90d, else stale)
  UPDATE data_freshness df SET freshness_label = nlabel
  FROM (
    SELECT place_id,
           (CASE WHEN last_verified_at >= now() - interval '30 days' THEN 'fresh'
                 WHEN last_verified_at >= now() - interval '90 days' THEN 'aging'
                 ELSE 'stale' END)::freshness_label AS nlabel
    FROM data_freshness
  ) s
  WHERE df.place_id = s.place_id AND df.freshness_label IS DISTINCT FROM s.nlabel;
  GET DIAGNOSTICS n_fresh = ROW_COUNT;

  -- 4) sweep stale pending phone-OTP claims (expired > 1 day ago)
  DELETE FROM place_claims
   WHERE method='phone_otp' AND status='pending'
     AND otp_expires_at IS NOT NULL AND otp_expires_at < now() - interval '1 day';
  GET DIAGNOSTICS n_otp = ROW_COUNT;

  -- 5) PDPA: age out booking-lead PII — redact contact fields on expired, non-converted requests and mark
  --    them 'expired'. Converted leads (an accepted/active stay) are left intact. Keeps the anonymized row.
  UPDATE stay_booking_request
     SET status = CASE WHEN status IN ('converted','declined') THEN status ELSE 'expired' END,
         contact_name = NULL, contact_phone = NULL, contact_line = NULL, message = NULL, updated_at = now()
   WHERE deleted_at IS NULL AND expires_at IS NOT NULL AND expires_at < now() AND status <> 'converted'
     AND (contact_name IS NOT NULL OR contact_phone IS NOT NULL OR contact_line IS NOT NULL OR message IS NOT NULL);
  GET DIAGNOSTICS n_lead = ROW_COUNT;

  -- 6) request-to-book: expire DATED bookings whose check-out has passed but were never confirmed-into-a-stay.
  UPDATE stay_booking_request
     SET status='expired', updated_at=now()
   WHERE deleted_at IS NULL AND desired_to IS NOT NULL AND desired_to < CURRENT_DATE
     AND status IN ('new','contacted','scheduled','confirmed');
  GET DIAGNOSTICS n_stale = ROW_COUNT;

  -- 7) PDPA: purge online-payment SLIPS (financial PII) past their useful life. Drops the slip_url reference;
  --    the storage object itself is aged out by the bucket lifecycle rule on the slips/ prefix.
  UPDATE stay_booking_request
     SET slip_url = NULL, updated_at = now()
   WHERE deleted_at IS NULL AND slip_url IS NOT NULL
     AND ( (checked_out_at IS NOT NULL AND checked_out_at < now() - interval '90 days')
        OR (payment_status = 'rejected' AND updated_at < now() - interval '30 days')
        OR (status = 'expired') );
  GET DIAGNOSTICS n_slip = ROW_COUNT;

  RETURN jsonb_build_object(
    'ran_at', now(),
    'deals_expired', n_expired,
    'deals_activated', n_activated,
    'freshness_relabelled', n_fresh,
    'otp_swept', n_otp,
    'leads_redacted', n_lead,
    'bookings_expired', n_stale,
    'slips_purged', n_slip
  );
END $$;

COMMENT ON FUNCTION fn_run_maintenance() IS 'Idempotent scheduled maintenance: deal expiry/activation, freshness decay, OTP sweep, booking-lead PII redaction, stale-booking expiry, payment-slip retention purge. Run via db/jobs/run-jobs.sh (cron).';
