-- ============================================================================
-- 0013_place_supply.sql — close the content-ingestion gap.
--   • fn_create_place: the missing INSERT path (a brand-new venue from a JSONB payload).
--   • fn_apply_proposal (REPLACE): now (a) creates a NEW place when target_id IS NULL,
--     and (b) for edits writes EVERY editable column (geo, address, contact, category,
--     amenities, payment, district) — not just name/desc/hours/price/status/visible.
--
-- PostGIS portability: geo is built as a format() STRING executed via dynamic SQL ONLY
--   when the postgis extension is present. On the local text-stub DB it stores plain WKT.
--   => no compile-time or runtime PostGIS dependency; one migration runs in both worlds.
-- All writes keep author<>moderator SoD, version bump, places_history snapshot, freshness.
-- ============================================================================

-- ── helper: build the geo column expression for the current environment ──────
CREATE OR REPLACE FUNCTION _place_geo_sql(p_lng text, p_lat text)
RETURNS text LANGUAGE plpgsql AS $$
BEGIN
  IF p_lng IS NULL OR p_lat IS NULL THEN RETURN NULL; END IF;
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
    RETURN format('ST_SetSRID(ST_MakePoint(%s,%s),4326)::geography', p_lng::float8, p_lat::float8);
  END IF;
  RETURN format('%L', 'POINT(' || p_lng || ' ' || p_lat || ')');   -- text-stub fallback
END $$;

-- ── fn_create_place: insert one new venue, return its id ─────────────────────
CREATE OR REPLACE FUNCTION fn_create_place(
  p_after jsonb, p_city uuid, p_district uuid, p_proposed_by uuid, p_reviewer uuid)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE
  v_id uuid; v_geo_sql text; v_cat_id uuid; v_amen text[]; v_pay text[];
  v_status place_status; v_lng text; v_lat text; snap jsonb; prow places%ROWTYPE;
BEGIN
  IF p_proposed_by = p_reviewer THEN
    RAISE EXCEPTION 'create_place: SoD — reviewer == proposer (author<>moderator)';
  END IF;
  IF (p_after->'name_i18n') IS NULL THEN RAISE EXCEPTION 'create_place: name_i18n required'; END IF;
  IF (p_after->>'category') IS NULL THEN RAISE EXCEPTION 'create_place: category required'; END IF;
  v_lng := p_after->>'lng'; v_lat := p_after->>'lat';
  IF v_lng IS NULL OR v_lat IS NULL THEN RAISE EXCEPTION 'create_place: lng/lat required'; END IF;

  v_status := COALESCE((p_after->>'status')::place_status, 'published');  -- admin-approved → live
  v_geo_sql := _place_geo_sql(v_lng, v_lat);

  -- resolve category_id from the (category, subcategory) taxonomy if not supplied
  v_cat_id := NULLIF(p_after->>'category_id','')::uuid;
  IF v_cat_id IS NULL THEN
    SELECT id INTO v_cat_id FROM place_categories
     WHERE category = (p_after->>'category')::place_cat AND subcategory = p_after->>'subcategory';
  END IF;

  -- jsonb_typeof guard: tolerate a malformed payload (non-array) without erroring
  v_amen := CASE WHEN jsonb_typeof(p_after->'amenities') = 'array'
                 THEN ARRAY(SELECT jsonb_array_elements_text(p_after->'amenities')) END;
  v_pay  := CASE WHEN jsonb_typeof(p_after->'payment_accepts') = 'array'
                 THEN ARRAY(SELECT jsonb_array_elements_text(p_after->'payment_accepts')) END;

  EXECUTE format($f$
    INSERT INTO places(merchant_id, city_id, district_id, category, subcategory, category_id,
      name_i18n, description_i18n, geo, address_i18n, phone, line_id, website,
      opening_hours, price_band, amenities, payment_accepts, status, is_visible, source, verified_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8, %s, $9,$10,$11,$12,$13,$14,$15,$16,$17,true,'agent_seed',now())
    RETURNING *$f$, v_geo_sql)
  USING
    NULLIF(p_after->>'merchant_id','')::uuid,
    p_city, p_district,
    (p_after->>'category')::place_cat,
    NULLIF(p_after->>'subcategory',''),
    v_cat_id,
    (p_after->'name_i18n'),
    (p_after->'description_i18n'),
    (p_after->'address_i18n'),
    NULLIF(p_after->>'phone',''),
    NULLIF(p_after->>'line_id',''),
    NULLIF(p_after->>'website',''),
    (p_after->'opening_hours'),
    NULLIF(p_after->>'price_band','')::price_band,
    v_amen, v_pay, v_status
  INTO prow;

  v_id := prow.id;
  INSERT INTO data_freshness(place_id,city_id,last_verified_at,verification_method,freshness_label)
    VALUES(v_id, prow.city_id, now(), 'field_visit', 'fresh')
  ON CONFLICT (place_id) DO UPDATE
    SET last_verified_at=now(), verification_method='field_visit', freshness_label='fresh';

  snap := jsonb_build_object(
    'name_i18n', prow.name_i18n, 'description_i18n', prow.description_i18n,
    'opening_hours', prow.opening_hours, 'price_band', prow.price_band,
    'category', prow.category, 'subcategory', prow.subcategory,
    'status', prow.status, 'is_visible', prow.is_visible, 'version', prow.version);
  INSERT INTO places_history(place_id,version,snapshot,valid_from,city_id)
    VALUES(v_id, prow.version, snap, now(), prow.city_id);

  RETURN v_id;
END $$;

-- ── fn_apply_proposal: NEW-place create + full-column edit ────────────────────
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
  IF pr.target_type <> 'place' THEN
    RAISE EXCEPTION 'apply_proposal: only target_type=place is supported';
  END IF;
  a := pr.diff->'after';

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
