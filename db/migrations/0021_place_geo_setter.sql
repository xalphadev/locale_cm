-- ============================================================================
-- 0021_place_geo_setter.sql — let a merchant set their place's location (the map pin).
--
-- Until now every merchant place was created at the hardcoded Nimman center, so a
-- vacancy map would cluster every shop on one dot. This adds a portable geo writer
-- the merchant portal (updateShopAction) calls when a merchant drops/drag their pin.
--
-- Reuses _place_geo_sql (0013): it returns a SQL EXPRESSION FRAGMENT (PostGIS
-- ST_SetSRID(ST_MakePoint(..),4326)::geography in prod; a WKT 'POINT(lng lat)' literal
-- on the dev text-stub), so it MUST be interpolated via EXECUTE format(), never bound
-- as a $n param — exactly how fn_apply_proposal writes geo. Self-service shop-geo edits
-- are low-risk and go direct (like updateShopAction), NOT through change_proposals.
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_set_place_geo(p_id uuid, p_lng text, p_lat text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_geo_sql text;
BEGIN
  IF p_lng IS NULL OR p_lat IS NULL THEN RETURN; END IF;
  v_geo_sql := _place_geo_sql(p_lng, p_lat);
  IF v_geo_sql IS NULL THEN RETURN; END IF;
  -- NB: do NOT touch verified_at — that's the staff freshness/ranking signal, not a geo edit.
  EXECUTE format('UPDATE places SET geo=%s, updated_at=now() WHERE id=$1', v_geo_sql)
    USING p_id;
END $$;
