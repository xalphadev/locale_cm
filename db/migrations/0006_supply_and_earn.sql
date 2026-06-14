-- ============================================================================
-- Migration #1 — part 0006: Supply (moat) + EARN functions
-- Source: docs/04 §3 (edge-fn contracts C4/C5) + docs/03 (S5 moderation, S7 merchant verify).
--   fn_apply_proposal  — the SINGLE writer of live moat data (moderator approve, SoD)
--   fn_claim_verify    — merchant trust state machine (identity → finance), separate reviewers
--   fn_advance_quest   — EARN→GRANT bridge (check-in records → quest complete → auto fn_grant_coins)
--   fn_check_in        — PostGIS geofence + record + Sparks + bridge (prod path)
-- Sparks are NOT money (separate spark_events/spark_balances ledger; mutable counter OK).
-- ============================================================================

-- ── Sparks award helper (free XP, no monetary liability) ──
CREATE OR REPLACE FUNCTION award_sparks(p_user uuid, p_delta bigint, p_reason spark_reason, p_ref uuid, p_city uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_delta = 0 THEN RETURN; END IF;
  INSERT INTO spark_events(user_id,delta,reason,ref_id,city_id) VALUES(p_user,p_delta,p_reason,p_ref,p_city);
  INSERT INTO spark_balances(user_id,city_id,balance) VALUES(p_user,p_city,p_delta)
  ON CONFLICT (user_id) DO UPDATE SET balance = spark_balances.balance + p_delta, updated_at = now();
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- fn_apply_proposal: the ONLY path that writes live `places` (agent/merchant never do).
--   SoD: reviewer != proposer. Applies diff.after → places, bumps version, snapshots history,
--   refreshes data_freshness, approves the proposal + linked task. MVP: target_type='place'.
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION fn_apply_proposal(p_proposal uuid, p_reviewer uuid)
RETURNS int LANGUAGE plpgsql AS $$
DECLARE pr change_proposals%ROWTYPE; v_version int; v_city uuid; snap jsonb; prow places%ROWTYPE;
BEGIN
  SELECT * INTO pr FROM change_proposals WHERE id=p_proposal FOR UPDATE;
  IF pr.id IS NULL THEN RAISE EXCEPTION 'apply_proposal: proposal % not found', p_proposal; END IF;
  IF pr.status <> 'pending' THEN RAISE EXCEPTION 'apply_proposal: not pending (%)', pr.status; END IF;
  IF pr.proposed_by = p_reviewer THEN
    RAISE EXCEPTION 'apply_proposal: SoD — reviewer == proposer (author<>moderator)';
  END IF;
  IF pr.target_type <> 'place' OR pr.target_id IS NULL THEN
    RAISE EXCEPTION 'apply_proposal: MVP supports updating existing place only';
  END IF;

  UPDATE places SET
    name_i18n        = COALESCE(pr.diff->'after'->'name_i18n', name_i18n),
    description_i18n  = COALESCE(pr.diff->'after'->'description_i18n', description_i18n),
    opening_hours    = COALESCE(pr.diff->'after'->'opening_hours', opening_hours),
    price_band       = COALESCE((pr.diff->'after'->>'price_band')::price_band, price_band),
    status           = COALESCE((pr.diff->'after'->>'status')::place_status, status),
    is_visible       = COALESCE((pr.diff->'after'->>'is_visible')::boolean, is_visible),
    version          = version + 1,
    verified_at      = now(),
    updated_at       = now()
  WHERE id = pr.target_id
  RETURNING * INTO prow;
  v_version := prow.version; v_city := prow.city_id;

  -- shadow history: close the open row, snapshot the new version
  UPDATE places_history SET valid_to = now() WHERE place_id = pr.target_id AND valid_to IS NULL;
  snap := jsonb_build_object(
    'name_i18n', prow.name_i18n, 'description_i18n', prow.description_i18n,
    'opening_hours', prow.opening_hours, 'price_band', prow.price_band,
    'status', prow.status, 'is_visible', prow.is_visible, 'version', v_version);
  INSERT INTO places_history(place_id,version,snapshot,valid_from,change_proposal_id,city_id)
    VALUES(pr.target_id, v_version, snap, now(), p_proposal, v_city);

  INSERT INTO data_freshness(place_id,city_id,last_verified_at,verification_method,freshness_label)
    VALUES(pr.target_id, v_city, now(), 'field_visit', 'fresh')
  ON CONFLICT (place_id) DO UPDATE
    SET last_verified_at = now(), verification_method='field_visit', freshness_label='fresh';

  UPDATE change_proposals SET status='approved', reviewed_by=p_reviewer, applied_version=v_version
    WHERE id=p_proposal;
  UPDATE tasks SET status='approved' WHERE change_proposal_id=p_proposal;
  RETURN v_version;
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- fn_claim_verify: advance merchant trust state. Gate 'identity' then 'finance'; the two
--   gates must be reviewed by DIFFERENT people (SoD). finance_verified unlocks escrow/redemption.
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION fn_claim_verify(p_merchant uuid, p_gate text, p_reviewer uuid, p_points int)
RETURNS merchant_trust_state LANGUAGE plpgsql AS $$
DECLARE cur merchant_trust_state; v_city uuid; nxt merchant_trust_state;
BEGIN
  SELECT trust_state, city_id INTO cur, v_city FROM merchants WHERE id=p_merchant FOR UPDATE;
  IF cur IS NULL THEN RAISE EXCEPTION 'claim_verify: merchant % not found', p_merchant; END IF;

  IF p_gate = 'identity' THEN
    IF cur <> 'claimed_unverified' THEN RAISE EXCEPTION 'claim_verify: identity gate expects claimed_unverified (is %)', cur; END IF;
    nxt := 'identity_verified';
  ELSIF p_gate = 'finance' THEN
    IF cur <> 'identity_verified' THEN RAISE EXCEPTION 'claim_verify: finance gate expects identity_verified (is %)', cur; END IF;
    -- SoD: the finance reviewer must not be the identity reviewer
    IF EXISTS (SELECT 1 FROM merchant_proofs WHERE merchant_id=p_merchant AND gate='identity' AND reviewer_id=p_reviewer) THEN
      RAISE EXCEPTION 'claim_verify: SoD — finance reviewer == identity reviewer';
    END IF;
    nxt := 'finance_verified';
  ELSE
    RAISE EXCEPTION 'claim_verify: unknown gate %', p_gate;
  END IF;

  INSERT INTO merchant_proofs(merchant_id,city_id,method,trust_points,status,reviewer_id,gate,reviewed_at)
    VALUES(p_merchant, v_city, 'national_id_kyc', p_points, 'approved', p_reviewer, p_gate, now());
  UPDATE merchants SET trust_state=nxt, trust_points=trust_points+p_points WHERE id=p_merchant;
  RETURN nxt;
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- fn_advance_quest: the EARN→GRANT bridge. Records a qualifying step into quest_progress,
--   awards step Sparks, and when min_steps reached → completes + calls fn_grant_coins.
--   (Geofence/trust-tier is the INPUT gate, computed by fn_check_in below.)
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION fn_advance_quest(p_user uuid, p_quest uuid, p_step uuid, p_check_in uuid)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE qp quest_progress%ROWTYPE; v_min int; v_city uuid; v_bonus int; already boolean;
BEGIN
  SELECT * INTO qp FROM quest_progress WHERE user_id=p_user AND quest_id=p_quest FOR UPDATE;
  IF qp.id IS NULL THEN RAISE EXCEPTION 'advance_quest: no progress row'; END IF;
  IF qp.status <> 'in_progress' THEN RETURN qp.status; END IF;
  SELECT min_steps_required, city_id INTO v_min, v_city FROM quests WHERE id=p_quest;

  already := qp.steps_completed @> jsonb_build_array(jsonb_build_object('step_id', p_step::text));
  IF NOT already THEN
    UPDATE quest_progress
       SET steps_completed = steps_completed || jsonb_build_object('step_id',p_step::text,'check_in_id',p_check_in::text)
     WHERE id=qp.id RETURNING * INTO qp;
    SELECT bonus_spark INTO v_bonus FROM quest_steps WHERE id=p_step;
    PERFORM award_sparks(p_user, COALESCE(v_bonus,0)::bigint, 'checkin', p_check_in, v_city);
  END IF;

  IF jsonb_array_length(qp.steps_completed) >= v_min THEN
    UPDATE quest_progress SET status='completed', completed_at=now() WHERE id=qp.id;
    PERFORM fn_grant_coins(p_user, p_quest, 'grant:'||p_quest::text||':'||p_user::text);  -- bridge
    RETURN 'completed';
  END IF;
  RETURN 'in_progress';
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- fn_check_in: server-authoritative geofence (PostGIS) + record + base Sparks + bridge.
--   Requires PostGIS (ST_DWithin). The client sends raw lng/lat; the server NEVER trusts a
--   client-computed location. Tested on a PostGIS env (Supabase); not in the local stub run.
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION fn_check_in(
  p_user uuid, p_place uuid, p_quest_step uuid, p_lng double precision, p_lat double precision,
  p_method checkin_method, p_device uuid, p_radius_m int DEFAULT 80
) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v_city uuid; v_merchant uuid; v_geo geography; ok boolean; tier trust_tier; cin uuid; v_quest uuid;
BEGIN
  SELECT city_id, merchant_id, geo INTO v_city, v_merchant, v_geo FROM places WHERE id=p_place;
  IF v_city IS NULL THEN RAISE EXCEPTION 'check_in: place not found'; END IF;
  -- geofence: server-side ST_DWithin against the place's verified location
  ok := ST_DWithin(v_geo, ST_SetSRID(ST_MakePoint(p_lng,p_lat),4326)::geography, p_radius_m);
  IF NOT ok THEN RAISE EXCEPTION 'check_in: outside geofence (>% m)', p_radius_m; END IF;

  tier := CASE WHEN p_method IN ('rotating_qr','merchant_otp') THEN 'verified_visit'
               WHEN p_method='receipt' THEN 'proven_purchase' ELSE 'gps_dwell' END;
  INSERT INTO check_ins(user_id,place_id,merchant_id,city_id,quest_step_id,trust_tier,method,device_id)
    VALUES(p_user,p_place,v_merchant,v_city,p_quest_step,tier,p_method,p_device) RETURNING id INTO cin;
  PERFORM award_sparks(p_user, 5, 'checkin', cin, v_city);   -- base Sparks per check-in

  IF p_quest_step IS NOT NULL THEN
    SELECT quest_id INTO v_quest FROM quest_steps WHERE id=p_quest_step;
    -- only verified+ visits advance a trail (anti-fraud: gps_dwell alone does not grant)
    IF v_quest IS NOT NULL AND tier <> 'gps_dwell' THEN
      PERFORM fn_advance_quest(p_user, v_quest, p_quest_step, cin);
    END IF;
  END IF;
  RETURN cin;
END $$;

-- grants for the app/agent roles that write these (Sparks/moat are not money-writer-only)
GRANT INSERT ON spark_events, check_ins, places_history, merchant_proofs TO money_writer;
GRANT UPDATE ON places, change_proposals, tasks, merchants, spark_balances, data_freshness TO money_writer;
GRANT INSERT ON spark_balances, data_freshness TO money_writer;
