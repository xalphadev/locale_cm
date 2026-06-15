-- ============================================================================
-- 0014_events.sql — dated EVENTS / กิจกรรม (the gap flagged in the data-model map).
-- A standalone happening with a date window (festival, walking-street market,
-- live performance, seasonal). Distinct from:
--   • places.category='do'  (recurring activity AT a venue: cooking class, spa)
--   • quests                (the cross-merchant points game)
-- An event MAY pin to a place (place_id) or be area-wide (district only).
-- No geo column → area events have no point; venue events inherit places.geo.
-- ============================================================================
CREATE TYPE event_status AS ENUM ('draft','published','cancelled','ended');

CREATE TABLE IF NOT EXISTS events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id         uuid NOT NULL REFERENCES cities(id),
  district_id     uuid REFERENCES districts(id),
  place_id        uuid REFERENCES places(id),           -- nullable: area-wide events
  title_i18n      jsonb NOT NULL,
  description_i18n jsonb,
  kind            text  NOT NULL,                        -- festival|market|performance|workshop|seasonal
  starts_at       timestamptz NOT NULL,
  ends_at         timestamptz,
  is_recurring    boolean NOT NULL DEFAULT false,
  recurrence      text,                                  -- e.g. 'weekly:sun' (free-form for MVP)
  cover_media_id  uuid,
  status          event_status NOT NULL DEFAULT 'draft',
  is_featured     boolean NOT NULL DEFAULT false,
  source          place_source NOT NULL DEFAULT 'agent_seed',
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT events_window_ck CHECK (ends_at IS NULL OR ends_at >= starts_at)
);
CREATE INDEX IF NOT EXISTS idx_events_city_time ON events(city_id, starts_at) WHERE status='published';
