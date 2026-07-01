-- 0063_stay_maintenance.sql — แจ้งซ่อม / maintenance requests. The tenant submits from their portal (/my,
-- token-scoped, no login) with a detail + photos; the owner sees an inbox (/merchant/repairs) and moves the
-- status new → in_progress → done (or cancelled). Closes the competitor gap (HORGA 24h แจ้งเรื่อง, Yeeraf repair
-- log). Not money — an operational request log. Photos reuse the room upload bucket. Soft-delete per 0026.
CREATE TABLE IF NOT EXISTS stay_maintenance (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id    uuid NOT NULL REFERENCES places(id),
  lease_id    uuid REFERENCES stay_lease(id),
  room_id     uuid REFERENCES stay_room(id),
  detail      text NOT NULL,
  photos      text[] NOT NULL DEFAULT '{}',
  status      text NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_progress','done','cancelled')),
  source      text NOT NULL DEFAULT 'tenant',            -- tenant | owner
  owner_note  text,
  resolved_at timestamptz,
  deleted_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stay_maint_place ON stay_maintenance(place_id, status, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_stay_maint_lease ON stay_maintenance(lease_id, created_at DESC) WHERE deleted_at IS NULL;
