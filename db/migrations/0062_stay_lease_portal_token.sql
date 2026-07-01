-- 0062_stay_lease_portal_token.sql — a random per-lease token so the owner can give the TENANT one private
-- link, /my/<token>, to a no-login self-service page: their bills + amount owed, water/electric usage, contract
-- summary, and (next) แจ้งซ่อม. Same bearer-token model as the bill link (0061) — unguessable (72-bit), revocable
-- (re-mint), scoped to this one tenancy. Record-only; the tenant pays the owner's PromptPay directly.
ALTER TABLE stay_lease ADD COLUMN IF NOT EXISTS portal_token text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_stay_lease_portal_token ON stay_lease(portal_token) WHERE portal_token IS NOT NULL;
