-- ============================================================================
-- 0039_stay_lead_pdpa.sql — PDPA enforcement for booking leads (no money).
-- stay_booking_request carries minimal contact PII with a 60-day expires_at, but nothing aged it out.
-- Extend the scheduled maintenance pass to REDACT contact fields on expired, non-converted leads (and mark
-- them 'expired'). Converted leads are an active tenancy record and are left intact. Idempotent.
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_run_maintenance() RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
  n_expired int; n_activated int; n_fresh int; n_otp int; n_lead int;
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

  RETURN jsonb_build_object(
    'ran_at', now(),
    'deals_expired', n_expired,
    'deals_activated', n_activated,
    'freshness_relabelled', n_fresh,
    'otp_swept', n_otp,
    'leads_redacted', n_lead
  );
END $$;

COMMENT ON FUNCTION fn_run_maintenance() IS 'Idempotent scheduled maintenance: deal expiry/activation, freshness decay, OTP sweep, booking-lead PII redaction. Run via db/jobs/run-jobs.sh (cron).';
