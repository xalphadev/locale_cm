-- 0061_stay_invoice_public_token.sql — a random, unguessable public token per invoice so the owner can share
-- a bill link (paste into LINE/SMS) that the TENANT opens WITHOUT a login: /bill/<token>. The token is NOT the
-- internal invoice id (which lives in owner-only /merchant URLs); it's generated lazily in the app when the
-- owner first opens the bill to share it. Record-only — the link shows the bill + the owner's PromptPay to pay.
ALTER TABLE stay_invoice ADD COLUMN IF NOT EXISTS public_token text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_stay_invoice_token ON stay_invoice(public_token) WHERE public_token IS NOT NULL;
