-- ============================================================================
-- seed-media.sql — demo short "vibe" clips (kind=video) on a few venues, to show the
-- cover-or-clip / inline-video decision-closing feature. Re-runnable. Requires seed-venues.
-- (Production: real clips come via agent refresh_photos + verified-visit UGC + a transcode
-- pipeline; these are placeholder CC0/sample mp4s just to demonstrate playback.)
-- ============================================================================
DELETE FROM media WHERE owner_type='place' AND kind='video';

INSERT INTO media(owner_type, owner_id, city_id, kind, storage_path, moderation_status, caption_i18n)
SELECT 'place', p.id, p.city_id, 'video', m.url, 'approved', '{"th":"คลิปบรรยากาศร้าน","en":"Vibe clip"}'::jsonb
FROM (VALUES
  ('Rakngao Slow Bar & Roastery', 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'),
  ('Mokmok Coffee Roasters',      'https://www.w3schools.com/html/mov_bbb.mp4'),
  ('Coconut House Mango Sticky Rice & Shaved Ice', 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4')
) AS m(en, url)
JOIN places p ON p.name_i18n->>'en' = m.en;

SELECT 'MEDIA video clips='||count(*) AS seeded FROM media WHERE owner_type='place' AND kind='video';
