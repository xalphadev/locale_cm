-- ============================================================================
-- 0018_feed_posts.sql — merchant/user-authored feed posts (the "ร้านโพสต์เอง" layer
-- on top of the auto-generated feed). Likes/comments reuse post_key='post:<id>' (0017).
-- image_urls optional (paste real photos); else the feed renders category placeholders.
-- ============================================================================
CREATE TABLE IF NOT EXISTS feed_posts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id       uuid REFERENCES places(id),
  author_user_id uuid REFERENCES users(id),
  author_kind    text NOT NULL DEFAULT 'merchant',          -- merchant | user | system
  body_i18n      jsonb NOT NULL DEFAULT '{}',
  image_urls     text[],
  image_count    int NOT NULL DEFAULT 1,
  status         text NOT NULL DEFAULT 'published',          -- pending | published (MVP auto-publishes)
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_feed_posts ON feed_posts(status, created_at DESC);
