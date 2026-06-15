-- ============================================================================
-- 0016_saves.sql — user-saved/bookmarked places (the "เซฟที่ชอบ" feature).
-- Consumer-state only (not money). One row per (user, place).
-- ============================================================================
CREATE TABLE IF NOT EXISTS saved_places (
  user_id    uuid NOT NULL REFERENCES users(id),
  place_id   uuid NOT NULL REFERENCES places(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, place_id)
);
CREATE INDEX IF NOT EXISTS idx_saved_user ON saved_places(user_id, created_at DESC);
