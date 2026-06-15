-- ============================================================================
-- seed-feed-posts.sql — a few demo merchant posts so the feed shows real "shop posted"
-- content (multi-image). Re-runnable (guards on existing). Requires 0018 + seed-venues.
-- ============================================================================
INSERT INTO feed_posts(place_id, body_i18n, image_count, status)
SELECT p.id, jsonb_build_object('th', t.cap), t.n, 'published'
FROM (VALUES
  ('Rakngao Slow Bar & Roastery', 'เมล็ดใหม่มาแล้ว! เอธิโอเปีย คั่วอ่อน หอมกลิ่นดอกไม้ วันนี้ดริปให้ลองฟรีหน้าร้าน ☕', 4),
  ('Coconut House Mango Sticky Rice & Shaved Ice', 'มะม่วงน้ำดอกไม้ลอตใหม่ หวานฉ่ำกำลังดี 🥭 ข้าวเหนียวมูนสดทุกเช้า มาก่อนได้ก่อน', 3),
  ('Khao Soi Mae Sai Nimman', 'พิเศษวันนี้! ข้าวซอยเนื้อตุ๋น หม้อใหญ่ จำนวนจำกัด มาเร็วนะครับ', 2)
) AS t(en, cap, n)
JOIN places p ON p.name_i18n->>'en' = t.en
WHERE NOT EXISTS (SELECT 1 FROM feed_posts fp WHERE fp.place_id = p.id);

SELECT 'FEED POSTS='||count(*) AS seeded FROM feed_posts WHERE status='published';
