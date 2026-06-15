-- ============================================================================
-- seed-facets.sql — standardize each venue's amenities[] to the facet tokens used by
-- the category-specific filters (lib/facets.ts). Re-runnable. Requires seed-venues.
-- ============================================================================
UPDATE places p SET amenities = v.tags FROM (VALUES
  ('Rakngao Slow Bar & Roastery',                       ARRAY['wifi','work_friendly','power_outlet','vegan','outdoor_seating']),
  ('Mokmok Coffee Roasters',                            ARRAY['wifi','work_friendly','power_outlet','pet_friendly','outdoor_seating','parking']),
  ('Baan Maisak Espresso Bar',                          ARRAY['wifi','work_friendly','power_outlet','kid_friendly']),
  ('Khao Soi Mae Sai Nimman',                           ARRAY['thai_food','northern_food','halal','parking']),
  ('Pa Daeng Grilled Pork Skewers (Nimman Soi 11)',     ARRAY['thai_food','halal','late_night']),
  ('Coconut House Mango Sticky Rice & Shaved Ice',      ARRAY['vegetarian','vegan','aircon','kid_friendly']),
  ('Wat Umong (Suan Phutthatham)',                      ARRAY['free_entry','photo_spot','wheelchair','restroom','parking']),
  ('Doi Suthep Viewpoint (Pha Dudao)',                  ARRAY['photo_spot','sunset','free_entry','parking']),
  ('Chiang Mai City Arts and Cultural Centre',          ARRAY['aircon','guided_tour','wheelchair','kid_friendly','photo_spot']),
  ('Thai Kitchen Garden Cooking School',                ARRAY['english_speaking','beginner_friendly','booking_required','pickup','vegetarian']),
  ('Ruen Mai Lanna Herbal Spa',                         ARRAY['booking_required','couple_room','english_speaking','parking']),
  ('Chang Phueak Muay Thai Camp',                       ARRAY['beginner_friendly','english_speaking','drop_in','materials_included'])
) AS v(en, tags)
WHERE p.name_i18n->>'en' = v.en;

SELECT 'FACETS set on '||count(*)||' venues' AS seeded FROM places WHERE array_length(amenities,1) > 0 AND source='agent_seed';
