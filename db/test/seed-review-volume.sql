-- ============================================================================
-- seed-review-volume.sql — vary review COUNTS across venues so the fair-rating UI is
-- demoable: some venues cross the "show score" threshold (>=5), some stay "ใหม่ น่าลอง"
-- (<5, protected from volatility), some become high-avg "ร้านลับ". Re-runnable (only
-- bumps venues still under 5). Requires seed-reviews (gives each venue 3 to start).
-- ============================================================================
INSERT INTO reviews(place_id, city_id, user_id, rating, body_i18n, original_locale, trust_weight, moderation_status)
SELECT p.id, p.city_id,
       ('00000000-0000-4000-8000-' || lpad(to_hex(g.n % 36), 12, '0'))::uuid,
       (ARRAY[5,5,4,5,5,4,5,5,4,5])[1 + (g.n % 10)],
       jsonb_build_object('th', (ARRAY['ประทับใจมาก กลับมาอีกแน่นอน','บรรยากาศดี บริการน่ารัก','คุ้มค่า แนะนำเลย','ชอบมาก เป็นร้านประจำ','ดีงาม ไม่ผิดหวัง'])[1 + (g.n % 5)]),
       'th'::locale_code, 1, 'approved'::moderation_st
FROM (VALUES
  ('Rakngao Slow Bar & Roastery', 9), ('Khao Soi Mae Sai Nimman', 6),
  ('Wat Umong (Suan Phutthatham)', 8), ('Doi Suthep Viewpoint (Pha Dudao)', 7),
  ('Thai Kitchen Garden Cooking School', 4), ('Chang Phueak Muay Thai Camp', 5),
  ('Mokmok Coffee Roasters', 3), ('Baan Maisak Espresso Bar', 2)
) AS t(en, extra)
JOIN places p ON p.name_i18n->>'en' = t.en
  AND (SELECT count(*) FROM reviews r3 WHERE r3.place_id = p.id) < 5
CROSS JOIN LATERAL generate_series(1, t.extra) AS g(n);

SELECT 'REVIEW VOLUME — scored(>=5)='||count(*) FILTER (WHERE n>=5)||' new(<5)='||count(*) FILTER (WHERE n<5) AS seeded
FROM (SELECT p.id, count(r.*) n FROM places p LEFT JOIN reviews r ON r.place_id=p.id AND r.moderation_status='approved'
      WHERE p.status='published' GROUP BY p.id) s;
