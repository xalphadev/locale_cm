-- ============================================================================
-- seed-feed-social.sql — seed likes + comments so the feed looks alive. Keys match the
-- feed's post_key scheme (deal:/review:/new:/verified:/event:). Re-runnable. Requires 0017.
-- Reviewer users 00000000-0000-4000-8000-0000000000{00..23} exist (from seed-reviews).
-- ============================================================================
-- LIKES
INSERT INTO post_likes(post_key, user_id)
SELECT 'deal:'||d.id, ('00000000-0000-4000-8000-'||lpad(to_hex(g),12,'0'))::uuid
FROM deals d, generate_series(0,6) g WHERE d.status='active' ON CONFLICT DO NOTHING;
INSERT INTO post_likes(post_key, user_id)
SELECT 'review:'||r.id, ('00000000-0000-4000-8000-'||lpad(to_hex(g),12,'0'))::uuid
FROM reviews r, generate_series(0,4) g WHERE r.moderation_status='approved' ON CONFLICT DO NOTHING;
INSERT INTO post_likes(post_key, user_id)
SELECT 'new:'||p.id, ('00000000-0000-4000-8000-'||lpad(to_hex(g),12,'0'))::uuid
FROM places p, generate_series(0,5) g WHERE p.source='agent_seed' AND p.status='published' ON CONFLICT DO NOTHING;
INSERT INTO post_likes(post_key, user_id)
SELECT 'event:'||e.id, ('00000000-0000-4000-8000-'||lpad(to_hex(g),12,'0'))::uuid
FROM events e, generate_series(0,3) g WHERE e.status='published' ON CONFLICT DO NOTHING;

-- COMMENTS
INSERT INTO post_comments(post_key, user_id, body)
SELECT 'deal:'||d.id, ('00000000-0000-4000-8000-'||lpad(to_hex(g),12,'0'))::uuid,
       (ARRAY['น่าไปมาก! 😋','ขอบคุณสำหรับโปรฯ','เพิ่งไปมา คุ้มจริง','ยังเหลือสิทธิ์ไหมคะ'])[1+g]
FROM deals d, generate_series(0,2) g WHERE d.status='active' ON CONFLICT DO NOTHING;
INSERT INTO post_comments(post_key, user_id, body)
SELECT 'new:'||p.id, ('00000000-0000-4000-8000-'||lpad(to_hex(g),12,'0'))::uuid,
       (ARRAY['เปิดใหม่น่าลอง!','อยู่ตรงไหนเหรอ','ไปมาแล้ว บรรยากาศดี'])[1+g]
FROM places p, generate_series(0,2) g WHERE p.source='agent_seed' AND p.status='published'
  AND (SELECT count(*) FROM reviews r WHERE r.place_id=p.id AND r.moderation_status='approved') < 5
ON CONFLICT DO NOTHING;

SELECT 'FEED SOCIAL — likes='||(SELECT count(*) FROM post_likes)||' comments='||(SELECT count(*) FROM post_comments) AS seeded;
