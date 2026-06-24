-- 0050: slip-based online booking payment (founder pivot 2026-06-24).
-- HOST-DIRECT model: the guest transfers to the HOST's own PromptPay / bank account, uploads a
-- slip, the host verifies it. The platform NEVER holds funds (no e-money license, no escrow) —
-- this is money RECORDING, not processing. price_minor / stay_rate stop being display-only.

-- where each place/branch receives money (the account shown to the guest at checkout)
ALTER TABLE places ADD COLUMN IF NOT EXISTS pay_promptpay text;       -- PromptPay id (phone / national id)
ALTER TABLE places ADD COLUMN IF NOT EXISTS pay_bank text;            -- bank name (display)
ALTER TABLE places ADD COLUMN IF NOT EXISTS pay_account_no text;      -- account number (display)
ALTER TABLE places ADD COLUMN IF NOT EXISTS pay_account_name text;    -- account holder name
ALTER TABLE places ADD COLUMN IF NOT EXISTS pay_online_enabled boolean NOT NULL DEFAULT false;  -- accept online booking+slip

-- the money + slip on the existing booking spine (no new table — extends stay_booking_request)
ALTER TABLE stay_booking_request ADD COLUMN IF NOT EXISTS amount_minor bigint;     -- total quoted to the guest
ALTER TABLE stay_booking_request ADD COLUMN IF NOT EXISTS deposit_minor bigint;    -- deposit requested (null = pay in full)
ALTER TABLE stay_booking_request ADD COLUMN IF NOT EXISTS paid_minor bigint;       -- amount the guest paid (per slip)
ALTER TABLE stay_booking_request ADD COLUMN IF NOT EXISTS payment_method text;     -- 'promptpay' | 'bank_transfer'
ALTER TABLE stay_booking_request ADD COLUMN IF NOT EXISTS slip_url text;           -- uploaded transfer slip
ALTER TABLE stay_booking_request ADD COLUMN IF NOT EXISTS paid_at timestamptz;     -- when the slip was submitted
-- none = contact-only lead (today's behaviour) | submitted = slip uploaded, awaiting host | verified | rejected
ALTER TABLE stay_booking_request ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'none';
