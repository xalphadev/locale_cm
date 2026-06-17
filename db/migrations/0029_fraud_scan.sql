-- ============================================================================
-- 0029_fraud_scan.sql — lightweight fraud signal: flag abnormal check-in velocity.
--
-- A first, cheap trust-and-safety net: a user racking up many check-ins in a short
-- window (bot / GPS-spoof / stamp farming) gets a fraud_cases row opened for staff
-- to review. Idempotent — won't reopen a user who already has an open/in-review case.
-- Run on a schedule via db/jobs/run-jobs.sh; staff triage in the back-office.
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_scan_fraud(p_window interval DEFAULT interval '1 hour', p_threshold int DEFAULT 6)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE n_opened int;
BEGIN
  INSERT INTO fraud_cases(subject_type, subject_id, risk_score, state, auto_action, city_id)
  SELECT 'user', c.user_id, LEAST(100, count(*) * 15)::numeric, 'open', 'flagged_velocity', c.city_id
    FROM check_ins c
   WHERE c.created_at >= now() - p_window
   GROUP BY c.user_id, c.city_id
  HAVING count(*) >= p_threshold
     AND NOT EXISTS (
       SELECT 1 FROM fraud_cases f
        WHERE f.subject_type='user' AND f.subject_id=c.user_id AND f.state IN ('open','in_review'));
  GET DIAGNOSTICS n_opened = ROW_COUNT;
  RETURN jsonb_build_object('ran_at', now(), 'fraud_cases_opened', n_opened, 'window', p_window::text, 'threshold', p_threshold);
END $$;

COMMENT ON FUNCTION fn_scan_fraud(interval, int) IS 'Open fraud_cases for users exceeding check-in velocity. Idempotent. Run via db/jobs/run-jobs.sh.';
