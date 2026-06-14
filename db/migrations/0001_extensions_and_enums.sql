-- ============================================================================
-- Migration #1 — part 0001: Extensions & Enums
-- Soi Hop loyalty platform. Source of truth: docs/04_mvp_scope_and_data_model.md §2.2
-- All enums created with FULL canonical values even if MVP doesn't walk every path
-- (avoids costly ALTER TYPE ADD VALUE later). Requires PostgreSQL 15+ (NULLS NOT DISTINCT).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()

-- ── Ledger core (locked v1.0 + ratified v1.1) ───────────────────────────────
CREATE TYPE currency      AS ENUM ('THB','COIN');                 -- no SPARK (Sparks are not money, A.3)
CREATE TYPE ledger_dir    AS ENUM ('DR','CR');
CREATE TYPE acct_owner    AS ENUM ('platform','merchant','sponsor','user','agent','payee');
CREATE TYPE acct_status   AS ENUM ('active','frozen','closed');

-- 25 canonical account types (v1.0 21 + v1.1 ratified 4). expiry_breakage is CUT
-- (canonical THB breakage = platform_breakage). platform_goodwill_budget = pending_ratification.
CREATE TYPE account_type AS ENUM (
  'psp_suspense','bank_settlement','psp_fee_expense',
  'merchant_escrow','sponsor_budget','coin_liability','user_coin','coin_backing',
  'clearing','platform_revenue','deferred_revenue',
  'platform_breakage','escheatment_liability',
  'merchant_payable','merchant_receivable','bad_debt_expense',
  'platform_expense','agent_reserve',
  'wht_payable','vat_output_payable','vat_input_claimable','vat_carryforward',
  'payout_suspense','wht_credit_received',
  'platform_goodwill_budget'
);

-- 22 canonical txn types (v1.0 17 + v1.1 5)
CREATE TYPE txn_type AS ENUM (
  'PREFUND','PSP_SETTLE','FUND_QUEST','GRANT','REDEEM','EXPIRE','REFUND','CHARGEBACK',
  'CHURN_SWEEP','OWNERSHIP_TRANSFER','CAMPAIGN_END',
  'SUBSCRIPTION','SUBSCRIPTION_RECOGNIZE','AFFILIATE','PAYOUT','RECOVERY','WRITE_OFF',
  'AGENT_PAYOUT','AGENT_CLAWBACK','WHT_REMIT','VAT_REMIT','MERCHANT_CLAWBACK'
);

CREATE TYPE ledger_ref_type AS ENUM (
  'escrow_topup','psp_settle','quest_reward_pool','coin_grant','redemption','expiry',
  'reversal','recovery','write_off','subscription','affiliate','payout','ownership_transfer',
  'agent_payout','merchant_settlement','merchant_clawback','wht_remit','vat_remit',
  'wht_trueup','vat_trueup','payout_batch','payout_suspense','escheatment','goodwill_fund'
);

-- ── Domain enums ────────────────────────────────────────────────────────────
CREATE TYPE place_cat       AS ENUM ('eat','see','do');
CREATE TYPE price_band      AS ENUM ('1','2','3','4');           -- ฿ ฿฿ ฿฿฿ ฿฿฿฿
CREATE TYPE place_status    AS ENUM ('draft','published','temporarily_closed','permanently_closed');
CREATE TYPE place_source    AS ENUM ('agent_seed','merchant','google_places_seed');
CREATE TYPE rollout_status  AS ENUM ('planned','seeding','live');
CREATE TYPE locale_code     AS ENUM ('th','en','zh');
CREATE TYPE audience_seg    AS ENUM ('local','nomad_expat','tourist_west','tourist_cn');
CREATE TYPE user_status     AS ENUM ('active','suspended','banned');
CREATE TYPE kyc_status      AS ENUM ('pending','verified','rejected');
-- merchant trust state machine (SYSTEM_PLAN §7.1.1) — separate from kyc_status (identity-only)
CREATE TYPE merchant_trust_state AS ENUM
  ('claimed_unverified','identity_verified','finance_verified','payout_frozen','suspended','closed','disputed');
CREATE TYPE merchant_proof_method AS ENUM
  ('phone_otp','domain_email','onpremise_code','onpremise_qr','dbd_juristic','vat_por20','bank_name_match','national_id_kyc');
CREATE TYPE merchant_user_role AS ENUM ('owner','manager','cashier');
CREATE TYPE auth_provider   AS ENUM ('line','apple','google','wechat');
CREATE TYPE app_role        AS ENUM ('customer','platform_owner','platform_admin','merchant',
   'field_agent','content_moderator','city_manager','brand_sponsor','support_cs',
   'finance_payout','analyst_api','dpo');                        -- 12 canonical roles
CREATE TYPE consent_purpose AS ENUM ('location_checkin','marketing','analytics_anon','data_product');
CREATE TYPE lawful_basis    AS ENUM ('consent','contract','legitimate_interest');
CREATE TYPE media_owner     AS ENUM ('place','review','quest','profile','campaign');
CREATE TYPE media_kind      AS ENUM ('image','video');
CREATE TYPE moderation_st   AS ENUM ('pending','approved','rejected');
CREATE TYPE deal_type       AS ENUM ('percent_off','fixed_off','bogo','freebie');
CREATE TYPE deal_status     AS ENUM ('scheduled','active','paused','expired');
CREATE TYPE quest_type      AS ENUM ('standard','sponsored','festival');
CREATE TYPE quest_status    AS ENUM ('draft','active','paused_zero_balance','ended');
CREATE TYPE trust_tier      AS ENUM ('gps_dwell','verified_visit','proven_purchase');
CREATE TYPE checkin_method  AS ENUM ('gps_dwell','rotating_qr','merchant_otp','receipt');
CREATE TYPE qprogress_st    AS ENUM ('in_progress','completed','redeemed','expired');
CREATE TYPE escrow_owner    AS ENUM ('merchant','sponsor');
CREATE TYPE escrow_status   AS ENUM ('active','depleted','frozen');
CREATE TYPE lock_reason     AS ENUM ('quest_pool','coin_backing');
CREATE TYPE lot_state       AS ENUM ('active','exhausted','expired','reversed');
CREATE TYPE grant_source    AS ENUM ('quest_completion','campaign','manual_admin','goodwill','quest_comp');
CREATE TYPE redeem_init     AS ENUM ('merchant_qr','merchant_otp');   -- no customer_static QR
CREATE TYPE redemption_st   AS ENUM ('pending','settled','expired','reversed','flagged');
CREATE TYPE spark_reason    AS ENUM ('checkin','review','task','referral','streak_bonus','admin_adjust');
CREATE TYPE sub_plan        AS ENUM ('free','starter','growth','pro');
CREATE TYPE billing_cycle   AS ENUM ('monthly','annual');
CREATE TYPE sub_status      AS ENUM ('trial','active','past_due','cancelled');
CREATE TYPE sponsor_tier    AS ENUM ('mall','brand','tat_gov');
CREATE TYPE agent_affil     AS ENUM ('cmu','payap','staff','freelance');
CREATE TYPE agent_status    AS ENUM ('active','suspended','offboarded');
CREATE TYPE task_type       AS ENUM ('seed_new_place','refresh_photos','verify_hours',
   'confirm_closed','onboard_merchant','activate_escrow','activate_real');
CREATE TYPE task_status     AS ENUM ('assigned','submitted','approved','rejected');
CREATE TYPE proposal_target AS ENUM ('place','deal','media','hours');
CREATE TYPE proposal_status AS ENUM ('pending','approved','rejected','superseded');
CREATE TYPE freshness_label AS ENUM ('fresh','aging','stale');
-- Subsystem
CREATE TYPE ticket_kind     AS ENUM ('review_dispute','money_dispute','agent_dispute',
   'psp_dispute','quest_dispute','privacy_request','general');
CREATE TYPE ticket_status   AS ENUM ('new','triaged','in_progress','awaiting_reporter',
   'awaiting_merchant','pending_money_action','escalated','auto_resolved','resolved','rejected','closed');
CREATE TYPE payout_track    AS ENUM ('merchant_settlement','agent_earning');
CREATE TYPE payout_b_state  AS ENUM ('draft','pending_review','approved','releasing',
   'settled','partially_failed','reconciled','cancelled');
CREATE TYPE payout_i_state  AS ENUM ('queued','sent','settled','failed','held','reversed');
CREATE TYPE report_status   AS ENUM ('open','triaging','in_review','resolved','rejected','escalated_legal');
CREATE TYPE freeze_level    AS ENUM ('paused','frozen');
CREATE TYPE fraud_state     AS ENUM ('open','in_review','confirmed_fraud','cleared','escalated');
