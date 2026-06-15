-- ============================================================================
-- seed-profile.sql — give the demo consumer a profile + a few saved places.
-- Runs LAST (after seed-venues), so the rich venues exist to bookmark. Requires 0016.
-- ============================================================================
\set du '00000000-0000-4000-8000-0000000000d0'
INSERT INTO profiles(user_id, display_name) VALUES (:'du', 'คุณนักเดินซอย')
  ON CONFLICT (user_id) DO UPDATE SET display_name = EXCLUDED.display_name;

INSERT INTO saved_places(user_id, place_id)
  SELECT :'du', id FROM places
   WHERE status='published'
     AND name_i18n->>'en' IN ('Rakngao Slow Bar & Roastery','Wat Umong (Suan Phutthatham)','Khao Soi Mae Sai Nimman')
  ON CONFLICT DO NOTHING;

SELECT 'PROFILE saves='||count(*) AS seeded FROM saved_places WHERE user_id=:'du';
