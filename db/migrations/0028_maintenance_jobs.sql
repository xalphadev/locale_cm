-- ============================================================================
-- 0028_maintenance_jobs.sql — the "run itself" layer: one idempotent function that
-- advances time-based state, called on a schedule (cron / db/jobs/run-jobs.sh).
--
-- Without this nothing ages: deals never expire, scheduled deals never go live,
-- freshness labels never decay, stale OTP rows pile up. fn_run_maintenance() does
-- all of it in one safe pass and returns a JSON summary of what it changed.
--
-- Money/solvency reconciliation stays SEPARATE (fn_reconcile_solvency per city,
-- run by the money-plane role) — see db/jobs/run-jobs.sh.
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_run_maintenance() RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
  n_expired int; n_activated int; n_fresh int; n_otp int;
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

  RETURN jsonb_build_object(
    'ran_at', now(),
    'deals_expired', n_expired,
    'deals_activated', n_activated,
    'freshness_relabelled', n_fresh,
    'otp_swept', n_otp
  );
END $$;

COMMENT ON FUNCTION fn_run_maintenance() IS 'Idempotent scheduled maintenance: deal expiry/activation, freshness decay, OTP sweep. Run via db/jobs/run-jobs.sh (cron).';
