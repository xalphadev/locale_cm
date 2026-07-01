-- 0065: merchant account approval gate (founder decision 2026-07-02, docs/brief.md vision review)
-- A new self-service signup must WAIT for platform approval before the console opens.
-- This is a second, ACCOUNT-level gate — distinct from the two existing layers we keep:
--   • place status draft→published  (content visibility, staff publish on /shops)
--   • place_claims / phone OTP      (branch OWNERSHIP verification, gates loyalty/deals)
-- Review is judgment-only on the submitted form data (no documents required — founder choice),
-- so signup collects nothing new and no extra PDPA surface appears.

-- Backfill trick: DEFAULT 'approved' grandfathers every existing account in the ADD,
-- then the default flips to 'pending' so all future signups queue for review.
ALTER TABLE merchant_accounts ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved';
ALTER TABLE merchant_accounts ALTER COLUMN approval_status SET DEFAULT 'pending';

DO $$ BEGIN
  ALTER TABLE merchant_accounts ADD CONSTRAINT chk_merchant_approval
    CHECK (approval_status IN ('pending','approved','rejected'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE merchant_accounts ADD COLUMN IF NOT EXISTS approved_at   timestamptz;  -- when a staff decision was made (either way)
ALTER TABLE merchant_accounts ADD COLUMN IF NOT EXISTS approval_note text;         -- staff note; shown to the merchant on reject

-- the admin queue lists pending accounts; partial index keeps it cheap forever
CREATE INDEX IF NOT EXISTS idx_merchant_accounts_pending
  ON merchant_accounts(created_at) WHERE approval_status = 'pending';
