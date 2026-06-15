-- ============================================================================
-- 0017_feed_social.sql — feed engagement (likes + comments). Keyed by a stable
-- post_key string (e.g. 'deal:<uuid>', 'review:<uuid>', 'new:<placeid>') so it works
-- over the auto-generated feed without a heavy posts table. Consumer-state only.
-- ============================================================================
CREATE TABLE IF NOT EXISTS post_likes (
  post_key   text NOT NULL,
  user_id    uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_key, user_id)
);
CREATE INDEX IF NOT EXISTS idx_post_likes_key ON post_likes(post_key);

CREATE TABLE IF NOT EXISTS post_comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_key   text NOT NULL,
  user_id    uuid NOT NULL REFERENCES users(id),
  body       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_post_comments_key ON post_comments(post_key, created_at);
