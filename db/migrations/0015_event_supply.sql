-- ============================================================================
-- 0015_event_supply.sql — route EVENTS through the same agent→admin supply pipeline.
--   • proposal_target gains 'event' (ADD VALUE autocommits before the fns below use it).
--   • fn_create_event: insert one approved event (the event analogue of fn_create_place).
--   • fn_apply_proposal (REPLACE): adds an 'event' branch; the 'place' path is byte-for-byte
--     the 0013 logic (unchanged) so the verified place flow keeps working.
-- MVP scope: event CREATE only (target_id NULL). Event EDIT is not yet supported.
-- ============================================================================
ALTER TYPE proposal_target ADD VALUE IF NOT EXISTS 'event';

-- ── fn_create_event: insert one new event, return its id ─────────────────────
CREATE OR REPLACE FUNCTION fn_create_event(
  p_after jsonb, p_city uuid, p_district uuid, p_proposed_by uuid, p_reviewer uuid)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v_id uuid; v_starts timestamptz; v_ends timestamptz;
BEGIN
  IF p_proposed_by = p_reviewer THEN
    RAISE EXCEPTION 'create_event: SoD — reviewer == proposer (author<>moderator)';
  END IF;
  IF (p_after->'title_i18n') IS NULL THEN RAISE EXCEPTION 'create_event: title_i18n required'; END IF;
  IF (p_after->>'kind') IS NULL THEN RAISE EXCEPTION 'create_event: kind required'; END IF;
  IF (p_after->>'starts_at') IS NULL THEN RAISE EXCEPTION 'create_event: starts_at required'; END IF;
  v_starts := (p_after->>'starts_at')::timestamptz;
  v_ends   := NULLIF(p_after->>'ends_at','')::timestamptz;
  IF v_ends IS NOT NULL AND v_ends < v_starts THEN
    RAISE EXCEPTION 'create_event: ends_at < starts_at';
  END IF;

  INSERT INTO events(city_id, district_id, place_id, title_i18n, description_i18n, kind,
    starts_at, ends_at, is_recurring, recurrence, status, is_featured, source)
  VALUES(p_city, p_district, NULLIF(p_after->>'place_id','')::uuid,
    p_after->'title_i18n', p_after->'description_i18n', p_after->>'kind',
    v_starts, v_ends,
    COALESCE((p_after->>'is_recurring')::boolean, false),
    NULLIF(p_after->>'recurrence',''),
    'published', COALESCE((p_after->>'is_featured')::boolean, false), 'agent_seed')
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

-- ── fn_apply_proposal: event dispatch + (unchanged) place create/edit ─────────
CREATE OR REPLACE FUNCTION fn_apply_proposal(p_proposal uuid, p_reviewer uuid)
RETURNS int LANGUAGE plpgsql AS $$
DECLARE pr change_proposals%ROWTYPE; v_version int; v_city uuid; v_newid uuid;
        v_geo_sql text; snap jsonb; prow places%ROWTYPE; a jsonb;
BEGIN
  SELECT * INTO pr FROM change_proposals WHERE id=p_proposal FOR UPDATE;
  IF pr.id IS NULL THEN RAISE EXCEPTION 'apply_proposal: proposal % not found', p_proposal; END IF;
  IF pr.status <> 'pending' THEN RAISE EXCEPTION 'apply_proposal: not pending (%)', pr.status; END IF;
  IF pr.proposed_by = p_reviewer THEN
    RAISE EXCEPTION 'apply_proposal: SoD — reviewer == proposer (author<>moderator)';
  END IF;
  a := pr.diff->'after';

  -- ── EVENT (create only) ────────────────────────────────────────────────────
  IF pr.target_type = 'event' THEN
    IF pr.target_id IS NOT NULL THEN
      RAISE EXCEPTION 'apply_proposal: event edit not supported in MVP (create only)';
    END IF;
    v_newid := fn_create_event(a, pr.city_id,
                 NULLIF(a->>'district_id','')::uuid, pr.proposed_by, p_reviewer);
    UPDATE change_proposals
       SET status='approved', reviewed_by=p_reviewer, target_id=v_newid, applied_version=1
     WHERE id=p_proposal;
    UPDATE tasks SET status='approved' WHERE change_proposal_id=p_proposal;
    RETURN 1;
  END IF;

  IF pr.target_type <> 'place' THEN
    RAISE EXCEPTION 'apply_proposal: only target_type place|event is supported';
  END IF;

  -- ── NEW place (no target yet) ──────────────────────────────────────────────
  IF pr.target_id IS NULL THEN
    v_newid := fn_create_place(a, pr.city_id,
                 NULLIF(a->>'district_id','')::uuid, pr.proposed_by, p_reviewer);
    UPDATE change_proposals
       SET status='approved', reviewed_by=p_reviewer, target_id=v_newid, applied_version=1
     WHERE id=p_proposal;
    UPDATE tasks SET status='approved' WHERE change_proposal_id=p_proposal;
    RETURN 1;
  END IF;

  -- ── EDIT existing place: every editable column (COALESCE preserves unchanged) ─
  UPDATE places SET
    name_i18n       = COALESCE(a->'name_i18n', name_i18n),
    description_i18n = COALESCE(a->'description_i18n', description_i18n),
    address_i18n    = COALESCE(a->'address_i18n', address_i18n),
    opening_hours   = COALESCE(a->'opening_hours', opening_hours),
    phone           = COALESCE(NULLIF(a->>'phone',''), phone),
    line_id         = COALESCE(NULLIF(a->>'line_id',''), line_id),
    website         = COALESCE(NULLIF(a->>'website',''), website),
    category        = COALESCE((a->>'category')::place_cat, category),
    subcategory     = COALESCE(NULLIF(a->>'subcategory',''), subcategory),
    category_id     = COALESCE(NULLIF(a->>'category_id','')::uuid, category_id),
    district_id     = COALESCE(NULLIF(a->>'district_id','')::uuid, district_id),
    price_band      = COALESCE(NULLIF(a->>'price_band','')::price_band, price_band),
    amenities       = COALESCE(CASE WHEN jsonb_typeof(a->'amenities') = 'array'
                        THEN ARRAY(SELECT jsonb_array_elements_text(a->'amenities')) END, amenities),
    payment_accepts = COALESCE(CASE WHEN jsonb_typeof(a->'payment_accepts') = 'array'
                        THEN ARRAY(SELECT jsonb_array_elements_text(a->'payment_accepts')) END, payment_accepts),
    status          = COALESCE((a->>'status')::place_status, status),
    is_visible      = COALESCE((a->>'is_visible')::boolean, is_visible),
    version         = version + 1,
    verified_at     = now(),
    updated_at      = now()
  WHERE id = pr.target_id
  RETURNING * INTO prow;
  v_version := prow.version; v_city := prow.city_id;

  -- geo update (dynamic; only when new coords were proposed)
  IF (a ? 'lng') AND (a ? 'lat') THEN
    v_geo_sql := _place_geo_sql(a->>'lng', a->>'lat');
    EXECUTE format('UPDATE places SET geo=%s WHERE id=$1', v_geo_sql) USING pr.target_id;
  END IF;

  UPDATE places_history SET valid_to = now() WHERE place_id = pr.target_id AND valid_to IS NULL;
  snap := jsonb_build_object(
    'name_i18n', prow.name_i18n, 'description_i18n', prow.description_i18n,
    'opening_hours', prow.opening_hours, 'price_band', prow.price_band,
    'category', prow.category, 'subcategory', prow.subcategory,
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
