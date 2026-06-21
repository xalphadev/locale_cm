-- 0042_reviews_one_per_user_place.sql
-- A user holds ONE opinion per place (they EDIT it, not stack reviews). Enforce it with a UNIQUE index so
-- submitReviewAction can upsert atomically (removes the SELECT-then-INSERT race). De-dupe existing rows first,
-- keeping the most recent per (user, place). NULL user_id (anonymous/legacy) rows are left alone (NULLs are
-- distinct in a UNIQUE index, so they never conflict).
DELETE FROM reviews r USING reviews r2
  WHERE r.user_id = r2.user_id AND r.place_id = r2.place_id AND r.user_id IS NOT NULL
    AND (r.created_at < r2.created_at OR (r.created_at = r2.created_at AND r.id < r2.id));

CREATE UNIQUE INDEX IF NOT EXISTS uq_reviews_user_place ON reviews(user_id, place_id);

-- Align the default with the actual policy: reviews are gated to verified visitors (a check-in fact) and
-- post-moderated (visible immediately; abuse handled by the existing report→hide flow at /reports). There is
-- no pending-approval queue, so 'pending' would mean invisible-forever. A new review is therefore 'approved'.
ALTER TABLE reviews ALTER COLUMN moderation_status SET DEFAULT 'approved';
