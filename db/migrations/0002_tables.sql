-- ============================================================================
-- Migration #1 — part 0002: Tables (Domains A–H + subsystems S1/S2/S4/S5/S6)
-- Source: docs/04_mvp_scope_and_data_model.md §2.3–§2.5
-- Ordering: referenced tables precede referencers; true cycles + cross-domain
-- forward refs are added as trailing ALTER TABLE ... ADD FOREIGN KEY (see end, §2.4.1).
-- Full ledger Chart of Accounts is created here regardless of MVP path (lockstep A2.7).
-- ============================================================================

-- ════════ A. GEO / TENANCY ════════
CREATE TABLE cities (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text NOT NULL UNIQUE,                      -- 'CNX'
  name_i18n     jsonb NOT NULL,
  country_code  text NOT NULL DEFAULT 'TH',
  timezone      text NOT NULL DEFAULT 'Asia/Bangkok',
  default_locale locale_code NOT NULL DEFAULT 'th',
  bbox          geography(POLYGON,4326),
  is_live       boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE districts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id           uuid NOT NULL REFERENCES cities(id),
  name_i18n         jsonb NOT NULL,
  slug              text NOT NULL,
  boundary          geography(POLYGON,4326),
  rollout_status    rollout_status NOT NULL DEFAULT 'planned',
  coverage_baseline int,                                   -- Density-Gate denominator (#place expected)
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (city_id, slug)
);
CREATE INDEX idx_districts_boundary ON districts USING GIST (boundary);

CREATE TABLE place_categories (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category     place_cat NOT NULL,
  subcategory  text NOT NULL,
  name_i18n    jsonb NOT NULL,
  icon         text,
  UNIQUE (category, subcategory)
);

CREATE TABLE merchants (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id              uuid NOT NULL REFERENCES cities(id),
  legal_name           text,
  display_name_i18n    jsonb NOT NULL,
  juristic_id          text,
  tax_id_enc           bytea,
  owner_user_id        uuid,                               -- FK → users (trailing)
  kyc_status           kyc_status NOT NULL DEFAULT 'pending',
  trust_state          merchant_trust_state NOT NULL DEFAULT 'claimed_unverified',
  trust_points         int NOT NULL DEFAULT 0,
  kyc_hash             text,                               -- A.8.12 KYC-cluster correlation (hashed)
  escrow_wallet_id     uuid,                               -- FK → escrow_wallets (trailing)
  subscription_id      uuid,                               -- FK → subscriptions (trailing)
  payout_bank_enc      bytea,
  onboarded_by_agent_id uuid,                              -- FK → agents (trailing)
  payout_frozen        boolean NOT NULL DEFAULT false,
  status               acct_status NOT NULL DEFAULT 'active',
  created_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_merchants_city  ON merchants(city_id);
CREATE INDEX idx_merchants_trust ON merchants(trust_state);

CREATE TABLE places (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id     uuid REFERENCES merchants(id),           -- NULLABLE (temples / public)
  city_id         uuid NOT NULL REFERENCES cities(id),
  district_id     uuid REFERENCES districts(id),
  category        place_cat NOT NULL,
  subcategory     text,
  category_id     uuid REFERENCES place_categories(id),
  name_i18n       jsonb NOT NULL,
  description_i18n jsonb,
  geo             geography(POINT,4326) NOT NULL,
  address_i18n    jsonb,
  phone           text, line_id text, website text,
  opening_hours   jsonb,
  price_band      price_band,
  amenities       text[],
  payment_accepts text[],
  status          place_status NOT NULL DEFAULT 'draft',
  is_visible      boolean NOT NULL DEFAULT true,           -- guest/anon browse gate (RLS)
  source          place_source NOT NULL DEFAULT 'agent_seed',
  verified_at     timestamptz,
  version         int NOT NULL DEFAULT 1,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_places_geo       ON places USING GIST (geo);
CREATE INDEX idx_places_city_dist ON places(city_id, district_id);
CREATE INDEX idx_places_merchant  ON places(merchant_id);
CREATE INDEX idx_places_cat       ON places(category, subcategory);
CREATE INDEX idx_places_visible   ON places(city_id, district_id) WHERE status='published' AND is_visible;

CREATE TABLE places_history (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id      uuid NOT NULL REFERENCES places(id),
  version       int NOT NULL,
  snapshot      jsonb NOT NULL,
  valid_from    timestamptz NOT NULL,
  valid_to      timestamptz,
  change_proposal_id uuid,
  city_id       uuid NOT NULL,
  UNIQUE (place_id, version)
);

CREATE TABLE data_freshness (
  place_id                  uuid PRIMARY KEY REFERENCES places(id),
  city_id                   uuid NOT NULL,
  last_verified_at          timestamptz,
  last_verified_by_agent_id uuid,                          -- FK → agents (trailing)
  verification_method       text,
  freshness_label           freshness_label NOT NULL DEFAULT 'stale'
);

-- ════════ B. IDENTITY ════════
CREATE TABLE users (
  id               uuid PRIMARY KEY,                       -- = auth.uid()
  primary_locale   locale_code NOT NULL DEFAULT 'th',
  auth_providers   jsonb NOT NULL DEFAULT '[]',
  home_city_id     uuid REFERENCES cities(id),
  audience_segment audience_seg,
  kyc_hash         text,                                   -- A.8.12 KYC-cluster correlation (hashed)
  status           user_status NOT NULL DEFAULT 'active',
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE profiles (
  user_id         uuid PRIMARY KEY REFERENCES users(id),
  display_name    text,
  avatar_media_id uuid,                                    -- FK → media (trailing)
  spark_tier      text
);

CREATE TABLE roles ( role app_role PRIMARY KEY, description text );

CREATE TABLE user_roles (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES users(id),
  role              app_role NOT NULL REFERENCES roles(role),
  scope_city_id     uuid REFERENCES cities(id),
  scope_merchant_id uuid REFERENCES merchants(id),
  granted_by        uuid REFERENCES users(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, scope_city_id, scope_merchant_id)
);
CREATE INDEX idx_user_roles_user ON user_roles(user_id);

CREATE TABLE merchant_users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  user_id     uuid NOT NULL REFERENCES users(id),
  role        merchant_user_role NOT NULL DEFAULT 'cashier',
  city_id     uuid NOT NULL REFERENCES cities(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (merchant_id, user_id)
);
CREATE INDEX idx_merchant_users_user ON merchant_users(user_id);

CREATE TABLE merchant_proofs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id   uuid NOT NULL REFERENCES merchants(id),
  city_id       uuid NOT NULL REFERENCES cities(id),
  method        merchant_proof_method NOT NULL,
  trust_points  int NOT NULL DEFAULT 0,
  status        moderation_st NOT NULL DEFAULT 'pending',
  reviewer_id   uuid REFERENCES users(id),
  gate          text,                                      -- 'identity' | 'finance'
  doc_url_enc   bytea,
  reviewed_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_merchant_proofs_merchant ON merchant_proofs(merchant_id);

CREATE TABLE devices (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES users(id),
  device_fingerprint text NOT NULL,                        -- A.8.12 device-cluster arm (hashed)
  payment_instrument_hash text,                            -- A.8.12 payment-cluster arm (hashed)
  platform           text,
  push_token         text,
  last_geo_coarse    geography(POINT,4326),                -- coarse only (PDPA)
  risk_score         numeric DEFAULT 0,
  city_id            uuid REFERENCES cities(id),
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_devices_user ON devices(user_id);
CREATE INDEX idx_devices_fp   ON devices(device_fingerprint);
CREATE INDEX idx_devices_pi   ON devices(payment_instrument_hash) WHERE payment_instrument_hash IS NOT NULL;

CREATE TABLE consents (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES users(id),
  purpose        consent_purpose NOT NULL,
  lawful_basis   lawful_basis NOT NULL,
  granted        boolean NOT NULL,
  policy_version text NOT NULL,
  city_id        uuid,
  granted_at     timestamptz, revoked_at timestamptz
);
CREATE INDEX idx_consents_user ON consents(user_id, purpose);

-- ════════ C. CONTENT ════════
CREATE TABLE media (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type        media_owner NOT NULL,
  owner_id          uuid NOT NULL,
  merchant_id       uuid REFERENCES merchants(id),
  city_id           uuid NOT NULL REFERENCES cities(id),
  storage_path      text NOT NULL,
  kind              media_kind NOT NULL DEFAULT 'image',
  caption_i18n      jsonb,
  uploaded_by       uuid REFERENCES users(id),
  moderation_status moderation_st NOT NULL DEFAULT 'pending',
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_media_owner ON media(owner_type, owner_id);

CREATE TABLE deals (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id    uuid NOT NULL REFERENCES places(id),
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  city_id     uuid NOT NULL REFERENCES cities(id),
  title_i18n  jsonb NOT NULL, terms_i18n jsonb,
  deal_type   deal_type NOT NULL,
  value_minor bigint,                                      -- satang if money
  value_pct   numeric,                                     -- rate field if percent_off
  starts_at   timestamptz, ends_at timestamptz,
  quota_total int, quota_used int NOT NULL DEFAULT 0,
  audience_filter jsonb,
  status      deal_status NOT NULL DEFAULT 'scheduled',
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_deals_place ON deals(place_id) WHERE status='active';

CREATE TABLE reviews (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id          uuid NOT NULL REFERENCES places(id),
  merchant_id       uuid REFERENCES merchants(id),
  city_id           uuid NOT NULL REFERENCES cities(id),
  user_id           uuid NOT NULL REFERENCES users(id),
  rating            int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body_i18n         jsonb,
  original_locale   locale_code,
  linked_check_in_id uuid,                                 -- FK → check_ins (trailing)
  trust_weight      numeric NOT NULL DEFAULT 1,
  moderation_status moderation_st NOT NULL DEFAULT 'pending',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_reviews_place ON reviews(place_id);

-- ════════ D. GAMIFICATION ════════
CREATE TABLE quests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id         uuid NOT NULL REFERENCES cities(id),
  district_id     uuid REFERENCES districts(id),
  title_i18n      jsonb NOT NULL, description_i18n jsonb, reward_terms_i18n jsonb,
  cover_media_id  uuid,
  quest_type      quest_type NOT NULL DEFAULT 'standard',
  sponsor_id      uuid,                                    -- FK → sponsors (trailing)
  funding_escrow_wallet_id uuid,                           -- FK → escrow_wallets (trailing)
  reward_coin_minor bigint NOT NULL DEFAULT 0,             -- satang (1 COIN = 100 minor)
  reward_spark_amount int NOT NULL DEFAULT 0,
  min_steps_required int NOT NULL DEFAULT 1,
  starts_at       timestamptz, ends_at timestamptz,
  is_featured     boolean NOT NULL DEFAULT false,
  status          quest_status NOT NULL DEFAULT 'draft',
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_quests_city_dist ON quests(city_id, district_id) WHERE status='active';

CREATE TABLE quest_steps (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id            uuid NOT NULL REFERENCES quests(id),
  place_id            uuid NOT NULL REFERENCES places(id),
  merchant_id         uuid REFERENCES merchants(id),
  city_id             uuid NOT NULL REFERENCES cities(id),
  step_order          int NOT NULL DEFAULT 0,
  required_trust_tier trust_tier NOT NULL DEFAULT 'verified_visit',
  bonus_spark         int NOT NULL DEFAULT 0,
  UNIQUE (quest_id, step_order)
);

CREATE TABLE check_ins (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id),
  place_id      uuid NOT NULL REFERENCES places(id),
  merchant_id   uuid REFERENCES merchants(id),
  city_id       uuid NOT NULL REFERENCES cities(id),
  quest_step_id uuid REFERENCES quest_steps(id),
  trust_tier    trust_tier NOT NULL,
  method        checkin_method NOT NULL,
  geo_coarse    geography(POINT,4326),                     -- ephemeral; purge raw after N days
  dwell_seconds int,
  device_id     uuid REFERENCES devices(id),
  risk_flags    text[],
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_checkins_user_dev ON check_ins(user_id, device_id, created_at);
CREATE INDEX idx_checkins_place    ON check_ins(place_id);

CREATE TABLE quest_progress (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id),
  quest_id        uuid NOT NULL REFERENCES quests(id),
  city_id         uuid NOT NULL REFERENCES cities(id),
  steps_completed jsonb NOT NULL DEFAULT '[]',
  status          qprogress_st NOT NULL DEFAULT 'in_progress',
  completed_at    timestamptz,
  reward_grant_id uuid,                                    -- FK → coin_grants (trailing)
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, quest_id)
);
CREATE INDEX idx_qprogress_user ON quest_progress(user_id);

-- ════════ E. FULL LEDGER ════════
CREATE TABLE accounts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_type  account_type NOT NULL,
  owner_type    acct_owner NOT NULL,
  owner_id      uuid,
  funder_key    text,        -- coin_backing only: 'merchant:<id>'|'sponsor:<id>'|'sponsor:platform_goodwill'
  psp_key       text,        -- psp_suspense/psp_fee_expense: 'omise'|'2c2p'|'fiuu'|'promptpay'|'alipay'|'wechat'
  currency      currency NOT NULL,
  normal_balance ledger_dir NOT NULL,
  city_id       uuid NOT NULL REFERENCES cities(id),
  status        acct_status NOT NULL DEFAULT 'active',
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_accounts ON accounts
  (account_type, owner_id, funder_key, psp_key, currency, city_id) NULLS NOT DISTINCT;

CREATE TABLE ledger_transactions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  txn_type        txn_type NOT NULL,
  idempotency_key text NOT NULL UNIQUE,                    -- A.8.8 anti-replay
  request_hash    text NOT NULL,
  city_id         uuid NOT NULL REFERENCES cities(id),
  funded_by       text,
  ref_type        ledger_ref_type,
  ref_id          uuid,
  reverses_txn_id uuid REFERENCES ledger_transactions(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid
);
-- one reversal per (target, txn_type): kills double-refund / coin-farming
ALTER TABLE ledger_transactions ADD CONSTRAINT one_reversal_per_target
  EXCLUDE (reverses_txn_id WITH =, txn_type WITH =) WHERE (reverses_txn_id IS NOT NULL);
CREATE INDEX idx_ltxn_ref ON ledger_transactions(ref_type, ref_id);

-- coin_lots: lock-anchor / read-cache (must precede ledger_entries.lot_id FK)
CREATE TABLE coin_lots (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),  -- = lot_id referenced by every COIN leg
  user_account_id uuid NOT NULL REFERENCES accounts(id),
  user_id         uuid NOT NULL REFERENCES users(id),
  grant_txn_id    uuid NOT NULL REFERENCES ledger_transactions(id),
  funder_key      text NOT NULL,
  granted_minor   bigint NOT NULL CHECK (granted_minor > 0),     -- immutable
  remaining_minor bigint NOT NULL CHECK (remaining_minor >= 0),  -- mutable cache = SUM(ledger of lot)
  expires_at      timestamptz NOT NULL,
  state           lot_state NOT NULL DEFAULT 'active',
  city_id         uuid NOT NULL REFERENCES cities(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_coinlots_fifo ON coin_lots(user_id, expires_at) WHERE state='active';

CREATE TABLE ledger_entries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seq          bigserial UNIQUE,                           -- monotonic write-order (replay/snapshot pin)
  txn_id       uuid NOT NULL REFERENCES ledger_transactions(id),
  account_id   uuid NOT NULL REFERENCES accounts(id),
  direction    ledger_dir NOT NULL,
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),   -- always > 0; direction carries sign
  currency     currency NOT NULL,
  funded_by    text NOT NULL,
  lot_id       uuid REFERENCES coin_lots(id),
  expires_at   timestamptz,
  city_id      uuid NOT NULL REFERENCES cities(id),
  memo_i18n    jsonb,
  posted_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lot_legs_have_expiry CHECK (lot_id IS NULL OR expires_at IS NOT NULL)
);
CREATE INDEX idx_entries_txn     ON ledger_entries(txn_id);
CREATE INDEX idx_entries_account ON ledger_entries(account_id, posted_at);
CREATE INDEX idx_entries_lot     ON ledger_entries(lot_id) WHERE lot_id IS NOT NULL;
-- (append-only + balance invariants installed in 0003)

CREATE TABLE escrow_wallets (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type               escrow_owner NOT NULL,
  owner_id                 uuid NOT NULL,                  -- merchant_id | sponsor_id
  account_id               uuid NOT NULL REFERENCES accounts(id),
  city_id                  uuid NOT NULL REFERENCES cities(id),
  total_cached             bigint NOT NULL DEFAULT 0,
  settled_total_cached     bigint NOT NULL DEFAULT 0,      -- landed via PSP_SETTLE (A.8.11)
  locked_cached            bigint NOT NULL DEFAULT 0,
  available_cached         bigint NOT NULL DEFAULT 0,
  settled_available_cached bigint NOT NULL DEFAULT 0,      -- mint-gating basis
  low_balance_threshold    bigint NOT NULL DEFAULT 0,
  status                   escrow_status NOT NULL DEFAULT 'active',
  updated_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_type, owner_id, city_id)
);

CREATE TABLE escrow_locks (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_wallet_id uuid NOT NULL REFERENCES escrow_wallets(id),
  amount_minor     bigint NOT NULL CHECK (amount_minor > 0),
  lock_reason      lock_reason NOT NULL,                   -- quest_pool | coin_backing
  ref_id           uuid,                                   -- quest_id | lot_id
  state            text NOT NULL DEFAULT 'active',
  city_id          uuid NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE spark_balances (
  user_id    uuid PRIMARY KEY REFERENCES users(id),
  city_id    uuid REFERENCES cities(id),
  balance    bigint NOT NULL DEFAULT 0,                    -- mutable integer (not money)
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE spark_events (
  id         bigserial PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES users(id),
  delta      bigint NOT NULL,
  reason     spark_reason NOT NULL,
  ref_id     uuid,
  city_id    uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE coin_grants (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid NOT NULL REFERENCES users(id),
  source_type              grant_source NOT NULL,
  source_id                uuid,
  funding_escrow_wallet_id uuid NOT NULL REFERENCES escrow_wallets(id),
  lot_id                   uuid REFERENCES coin_lots(id),
  coin_amount_minor        bigint NOT NULL CHECK (coin_amount_minor > 0),
  expires_at               timestamptz NOT NULL,
  ledger_txn_id            uuid NOT NULL REFERENCES ledger_transactions(id),
  city_id                  uuid NOT NULL REFERENCES cities(id),
  created_at               timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE redemptions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES users(id),
  place_id           uuid REFERENCES places(id),
  merchant_id        uuid NOT NULL REFERENCES merchants(id),
  city_id            uuid NOT NULL REFERENCES cities(id),
  deal_or_quest_ref  uuid,
  coin_amount_burned bigint NOT NULL CHECK (coin_amount_burned > 0),
  thb_settlement     bigint NOT NULL,                       -- satang from escrow (= cogs basis A2.4)
  take_rate_pct      numeric,
  take_rate_minor    bigint NOT NULL DEFAULT 0,
  initiation         redeem_init NOT NULL,                  -- merchant_qr | merchant_otp (no static)
  qr_nonce           text,                                  -- rotating, single-use
  valid_until        timestamptz,
  geofence_ok        boolean,
  linked_check_in_id uuid REFERENCES check_ins(id),
  ledger_txn_id      uuid REFERENCES ledger_transactions(id),
  review_status      text,
  visitor_type       text,                                  -- new|returning (incrementality measure, roadmap §C)
  status             redemption_st NOT NULL DEFAULT 'pending',
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_redemptions_nonce ON redemptions(qr_nonce) WHERE qr_nonce IS NOT NULL;
CREATE INDEX idx_redemptions_merchant ON redemptions(merchant_id, created_at);

-- ════════ F. MONETIZATION ════════
CREATE TABLE sponsors (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id          uuid NOT NULL REFERENCES cities(id),
  name_i18n        jsonb NOT NULL, logo_media_id uuid,
  escrow_wallet_id uuid REFERENCES escrow_wallets(id),
  tier             sponsor_tier NOT NULL DEFAULT 'brand',
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE campaigns (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id              uuid REFERENCES sponsors(id),
  city_id                 uuid NOT NULL REFERENCES cities(id),
  district_id             uuid REFERENCES districts(id),
  budget_escrow_wallet_id uuid REFERENCES escrow_wallets(id),
  kpi                     jsonb,
  starts_at timestamptz, ends_at timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE subscriptions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id        uuid NOT NULL REFERENCES merchants(id),
  city_id            uuid NOT NULL REFERENCES cities(id),
  plan               sub_plan NOT NULL DEFAULT 'free',
  billing_cycle      billing_cycle NOT NULL DEFAULT 'monthly',
  is_chain           boolean NOT NULL DEFAULT false,
  location_count     int NOT NULL DEFAULT 1,
  sold_by_agent_id   uuid,                                  -- FK → agents (trailing)
  status             sub_status NOT NULL DEFAULT 'trial',
  current_period_end timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_subs_merchant ON subscriptions(merchant_id);

CREATE TABLE platform_config (
  key            text PRIMARY KEY,
  value          jsonb NOT NULL,
  city_id        uuid REFERENCES cities(id),               -- null = global default
  effective_from timestamptz NOT NULL DEFAULT now(),
  updated_by     uuid, updated_at timestamptz NOT NULL DEFAULT now()
);

-- ════════ G. FIELD OPS ════════
CREATE TABLE agents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id),
  city_id       uuid NOT NULL REFERENCES cities(id),
  affiliation   agent_affil NOT NULL DEFAULT 'freelance',
  status        agent_status NOT NULL DEFAULT 'active',
  kyc_status    kyc_status NOT NULL DEFAULT 'pending',
  payout_account_enc bytea,
  quality_score numeric NOT NULL DEFAULT 1,
  merchant_quality_score numeric,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE territories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    uuid NOT NULL REFERENCES agents(id),
  city_id     uuid NOT NULL REFERENCES cities(id),
  district_id uuid REFERENCES districts(id),
  boundary    geography(POLYGON,4326),
  assigned_at timestamptz, expires_at timestamptz
);
CREATE INDEX idx_territories_boundary ON territories USING GIST (boundary);
CREATE TABLE tasks (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id           uuid NOT NULL REFERENCES agents(id),
  territory_id       uuid REFERENCES territories(id),
  place_id           uuid REFERENCES places(id),
  city_id            uuid NOT NULL REFERENCES cities(id),
  task_type          task_type NOT NULL,
  status             task_status NOT NULL DEFAULT 'assigned',
  reward_thb_minor   bigint NOT NULL DEFAULT 0,
  reward_spark       int NOT NULL DEFAULT 0,
  clawback_status    text,
  change_proposal_id uuid,                                  -- FK → change_proposals (trailing)
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE change_proposals (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type        proposal_target NOT NULL,
  target_id          uuid,
  merchant_id        uuid REFERENCES merchants(id),
  city_id            uuid NOT NULL REFERENCES cities(id),
  proposed_by        uuid NOT NULL REFERENCES users(id),
  proposer_role      app_role NOT NULL,
  diff               jsonb NOT NULL,
  evidence_media_ids uuid[],
  evidence_geo       geography(POINT,4326),
  status             proposal_status NOT NULL DEFAULT 'pending',
  reviewed_by        uuid REFERENCES users(id),
  applied_version    int,
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT proposal_sod CHECK (reviewed_by IS NULL OR reviewed_by <> proposed_by)
);
CREATE INDEX idx_proposals_status ON change_proposals(status, city_id);

-- ════════ H. GOVERNANCE ════════
CREATE TABLE audit_log (
  seq           bigserial PRIMARY KEY,
  actor_user_id uuid REFERENCES users(id),
  actor_role    app_role,
  action        text NOT NULL,
  entity_type   text, entity_id uuid,
  before        jsonb, after jsonb,
  city_id       uuid,
  ip_coarse     text, prev_hash text, row_hash text,
  at            timestamptz NOT NULL DEFAULT now()
);

-- ════════ SUBSYSTEM S1 — Support ════════
CREATE TABLE dispute_verdicts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  linked_redemption_id uuid REFERENCES redemptions(id),
  verdict          text NOT NULL,
  decided_by       uuid, evidence_ref jsonb,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE support_tickets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_no     text UNIQUE,
  kind          ticket_kind NOT NULL,
  city_id       uuid NOT NULL REFERENCES cities(id),
  category      text, channel text,
  subject_user_ref text,                                   -- pseudonymous (PDPA C.3)
  reporter_role text, reporter_id uuid,
  linked_redemption_id uuid REFERENCES redemptions(id),
  linked_report_id     uuid,                               -- → content_reports (no FK, avoids cycle)
  linked_entity_type   text, linked_entity_id uuid,
  status        ticket_status NOT NULL DEFAULT 'new',
  priority      text, sla_due_at timestamptz, resolve_due_at timestamptz,
  assigned_to   uuid, fraud_score numeric DEFAULT 0,
  resolution_type text, verdict_id uuid REFERENCES dispute_verdicts(id),
  resolution_ledger_txn_id uuid REFERENCES ledger_transactions(id),
  pii_unmasked  boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), resolved_at timestamptz, closed_at timestamptz
);
CREATE TABLE ticket_events (
  id bigserial PRIMARY KEY, ticket_id uuid NOT NULL REFERENCES support_tickets(id),
  actor_id uuid, actor_role text, event_type text, payload_jsonb jsonb,
  step_up_ref uuid, created_at timestamptz NOT NULL DEFAULT now()
);

-- ════════ SUBSYSTEM S2 — Notification (transactional outbox) ════════
CREATE TABLE notif_outbox (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type       text NOT NULL,
  event_class      text NOT NULL,                          -- transactional|privileged|marketing
  audience_user_id uuid REFERENCES users(id),
  merchant_id      uuid, city_id uuid NOT NULL,
  entity_type      text, entity_id uuid,
  dedup_key        text,
  payload          jsonb,
  dispatched_at    timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dedup_key)
);
CREATE INDEX idx_notif_outbox_pending ON notif_outbox(created_at) WHERE dispatched_at IS NULL;

-- ════════ SUBSYSTEM S6 — Recon / Fraud / Freeze (precedes payout: FK target) ════════
CREATE TABLE reconciliation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid REFERENCES cities(id), run_date date,
  kind text NOT NULL,                                      -- daily_solvency|payable_coverage|cogs_budget_cap|...
  status text NOT NULL,                                    -- pass|break_detected|resolved
  ledger_high_seq bigint,
  anchor_lhs_minor bigint, anchor_rhs_minor bigint, break_minor bigint,
  external_ref jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE fraud_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type text NOT NULL,                              -- user|device|merchant|agent
  subject_id uuid NOT NULL, risk_score numeric NOT NULL DEFAULT 0,
  state fraud_state NOT NULL DEFAULT 'open',
  auto_action text,                                        -- none|settlement_held|payout_paused|grant_blocked
  assigned_to uuid, opened_at timestamptz NOT NULL DEFAULT now(), resolved_at timestamptz,
  resolution_note text, city_id uuid NOT NULL REFERENCES cities(id)
);
CREATE INDEX idx_fraud_cases_subject ON fraud_cases(subject_id, state);  -- erasure-gate query (S3)
CREATE TABLE platform_freeze_state (
  scope_key      text PRIMARY KEY,                         -- 'global'|'city:CNX'|'merchant:123'|'identity-cluster:<id>'
  frozen_ops     text[] NOT NULL DEFAULT '{}',             -- ['GRANT','REDEEM','PAYOUT','PREFUND']
  freeze_event_id uuid, updated_at timestamptz NOT NULL DEFAULT now()
);

-- ════════ SUBSYSTEM S4 — Payout / Tax ════════
CREATE TABLE payout_batches (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id           uuid NOT NULL REFERENCES cities(id),
  track             payout_track NOT NULL,
  cycle_key         text NOT NULL,
  period_start date, period_end date,
  state             payout_b_state NOT NULL DEFAULT 'draft',
  total_gross_minor bigint NOT NULL DEFAULT 0,
  total_wht_minor   bigint NOT NULL DEFAULT 0,
  total_net_minor   bigint NOT NULL DEFAULT 0,
  item_count        int NOT NULL DEFAULT 0,
  created_by        uuid, approved_by uuid, approved_at timestamptz,
  solvency_check_id uuid REFERENCES reconciliation_runs(id),  -- A.8.2s must pass before approve
  payable_check_id  uuid REFERENCES reconciliation_runs(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sod_creator_ne_approver CHECK (approved_by IS NULL OR approved_by <> created_by),  -- SEAM-3
  UNIQUE (city_id, track, cycle_key)
);
CREATE TABLE payout_items (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id          uuid NOT NULL REFERENCES payout_batches(id),
  payee_type        text NOT NULL,                         -- merchant|sponsor|agent
  payee_id          uuid NOT NULL,
  source_account_id uuid REFERENCES accounts(id),
  gross_minor       bigint NOT NULL, wht_minor bigint NOT NULL DEFAULT 0, net_minor bigint NOT NULL,
  bank_snapshot     jsonb, bank_changed_at timestamptz, bank_change_approver uuid,  -- SEAM-3 SoD
  state             payout_i_state NOT NULL DEFAULT 'queued',
  psp_payout_ref    text, failure_code text, retry_count int NOT NULL DEFAULT 0,
  ledger_txn_id     uuid REFERENCES ledger_transactions(id),
  idempotency_key   text UNIQUE,
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE agent_wht_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES agents(id),
  tax_period text NOT NULL,                                -- 'YYYY-MM'
  gross_minor bigint NOT NULL DEFAULT 0, clawback_offset_minor bigint NOT NULL DEFAULT 0,
  wht_base_minor bigint NOT NULL DEFAULT 0, wht_minor bigint NOT NULL DEFAULT 0,
  wht_trueup_minor bigint NOT NULL DEFAULT 0,
  fifty_tawi_no text, state text NOT NULL DEFAULT 'accrued',
  UNIQUE (agent_id, tax_period)
);

-- ════════ SUBSYSTEM S5 — Content Moderation ════════
CREATE TABLE content_reports (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id          uuid NOT NULL REFERENCES cities(id),
  target_type      text NOT NULL,                          -- review|review_photo|place_photo|merchant_response
  target_id        uuid NOT NULL,
  reported_by      uuid REFERENCES users(id), reporter_role text,
  reason_code      text NOT NULL, detail_text text, evidence_media uuid[],
  status           report_status NOT NULL DEFAULT 'open',
  resolution       text, severity text, sla_due_at timestamptz, handled_by uuid,
  linked_redemption_id uuid REFERENCES redemptions(id),
  linked_ticket_id     uuid REFERENCES support_tickets(id),
  created_at timestamptz NOT NULL DEFAULT now(), resolved_at timestamptz,
  UNIQUE (target_type, target_id, reported_by)
);
CREATE TABLE moderation_actions (
  id bigserial PRIMARY KEY,
  report_id uuid REFERENCES content_reports(id),
  target_type text, target_id uuid, action text,
  actor_user_id uuid, actor_role text, reason_code text, reason_note_i18n jsonb,
  prev_state jsonb, city_id uuid, created_at timestamptz NOT NULL DEFAULT now()
);

-- ════════ Trailing FKs (§2.4.1) — forward refs + true cycles resolved here ════════
ALTER TABLE profiles       ADD CONSTRAINT fk_profiles_avatar       FOREIGN KEY (avatar_media_id)        REFERENCES media(id);
ALTER TABLE merchants      ADD CONSTRAINT fk_merchants_owner       FOREIGN KEY (owner_user_id)          REFERENCES users(id);
ALTER TABLE merchants      ADD CONSTRAINT fk_merchants_agent       FOREIGN KEY (onboarded_by_agent_id)  REFERENCES agents(id);
ALTER TABLE merchants      ADD CONSTRAINT fk_merchants_escrow      FOREIGN KEY (escrow_wallet_id)       REFERENCES escrow_wallets(id);
ALTER TABLE merchants      ADD CONSTRAINT fk_merchants_sub         FOREIGN KEY (subscription_id)        REFERENCES subscriptions(id);
ALTER TABLE data_freshness ADD CONSTRAINT fk_freshness_agent       FOREIGN KEY (last_verified_by_agent_id) REFERENCES agents(id);
ALTER TABLE reviews        ADD CONSTRAINT fk_reviews_checkin       FOREIGN KEY (linked_check_in_id)     REFERENCES check_ins(id);
ALTER TABLE quests         ADD CONSTRAINT fk_quests_sponsor        FOREIGN KEY (sponsor_id)             REFERENCES sponsors(id);
ALTER TABLE quests         ADD CONSTRAINT fk_quests_escrow         FOREIGN KEY (funding_escrow_wallet_id) REFERENCES escrow_wallets(id);
ALTER TABLE quest_progress ADD CONSTRAINT fk_qprogress_grant       FOREIGN KEY (reward_grant_id)        REFERENCES coin_grants(id);
ALTER TABLE subscriptions  ADD CONSTRAINT fk_subs_agent           FOREIGN KEY (sold_by_agent_id)       REFERENCES agents(id);
ALTER TABLE tasks          ADD CONSTRAINT fk_tasks_proposal        FOREIGN KEY (change_proposal_id)     REFERENCES change_proposals(id);
