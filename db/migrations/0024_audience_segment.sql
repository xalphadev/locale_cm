-- 0024_audience_segment.sql — populate users.audience_segment for the tourist-vs-local analytic (P7).
--
-- users.audience_segment (local|nomad_expat|tourist_west|tourist_cn) has NO writer today, so the P7
-- "audience mix" dashboard has nothing to show. This adds the WRITER: a function that DERIVES the
-- segment from the user's app language (primary_locale) — the same signal the onboarding/auth flow has —
-- plus a one-time backfill of existing users. Heuristic only (locale-based); refine later with
-- stay-length / auth-provider (e.g. distinguishing nomad_expat from tourist_west needs more signal).
-- Real onboarding should call fn_set_audience_segment(user) right after the user picks a language.

CREATE OR REPLACE FUNCTION fn_set_audience_segment(p_user uuid)
RETURNS audience_seg LANGUAGE plpgsql AS $$
DECLARE seg audience_seg; loc locale_code;
BEGIN
  SELECT primary_locale INTO loc FROM users WHERE id = p_user;
  IF loc IS NULL THEN RETURN NULL; END IF;
  seg := CASE loc WHEN 'zh' THEN 'tourist_cn' WHEN 'en' THEN 'tourist_west' ELSE 'local' END;
  UPDATE users SET audience_segment = seg WHERE id = p_user;
  RETURN seg;
END $$;

-- backfill existing users (NULL only) from their language
UPDATE users SET audience_segment =
  CASE primary_locale WHEN 'zh' THEN 'tourist_cn' WHEN 'en' THEN 'tourist_west' ELSE 'local' END::audience_seg
WHERE audience_segment IS NULL;
