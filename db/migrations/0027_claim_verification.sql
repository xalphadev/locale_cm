-- ============================================================================
-- 0027_claim_verification.sql — ownership verification for claimed places.
--
-- Claiming an agent-seeded place (0022 brands flow) grants management access but
-- leaves the place UNVERIFIED: full privileges (loyalty/Stamps, the consumer
-- "verified by owner" badge) stay locked until the claimant proves they control
-- the business. Two proof paths:
--   • phone_otp     — a one-time code to the place's listed phone (self-serve)
--   • manual_review — submit a request; platform staff approve (doc / field check)
--
-- `places.claim_verified_at` is the single source of truth: NULL = unverified.
-- ============================================================================

ALTER TABLE places ADD COLUMN IF NOT EXISTS claim_verified_at timestamptz;

CREATE TABLE IF NOT EXISTS place_claims (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id        uuid NOT NULL REFERENCES places(id),
  account_id      uuid NOT NULL REFERENCES merchant_accounts(id),
  method          text NOT NULL,                       -- 'phone_otp' | 'manual_review'
  status          text NOT NULL DEFAULT 'pending',     -- 'pending' | 'verified' | 'rejected'
  otp_code        text,                                -- 6-digit (dev: plaintext); cleared on success
  otp_expires_at  timestamptz,
  attempts        int  NOT NULL DEFAULT 0,             -- wrong-code attempts (lockout at 5)
  contact_masked  text,                                -- e.g. '+66 8x-xxx-4145'
  note            text,                                -- manual: applicant message / reviewer note
  reviewer_id     uuid,
  created_at      timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz
);

CREATE INDEX IF NOT EXISTS ix_place_claims_place    ON place_claims(place_id);
CREATE INDEX IF NOT EXISTS ix_place_claims_account  ON place_claims(account_id);
CREATE INDEX IF NOT EXISTS ix_place_claims_pending  ON place_claims(status) WHERE status = 'pending';
