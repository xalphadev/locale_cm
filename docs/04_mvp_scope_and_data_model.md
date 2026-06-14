# MVP Scope & Data Model (Migration #1)

> **เวอร์ชัน:** v1 (ผ่าน canonical-fidelity + MVP-loop review) · **วันที่:** 2026-06-14
> สะพานจาก “แผน” ไป “build”: ตัด scope v1, ERD + migration #1 (DDL), RLS/constraints/edge-functions — สอดคล้องกับ canonical ledger (doc 02/02b)
> หลักการ: **build the SYSTEM broad, SEED the DATA dense** — schema กว้างเท่าระบบเต็ม, เปิด UI/ข้อมูลเฉพาะ Nimman ก่อน
>
> **🔧 หมายเหตุ runtime (ดู [doc 05](05_stack_decision.md)):** ที่ใดเอกสารนี้เขียน **"edge-fn" / "Edge Function"** ให้อ่านเป็น **endpoint ของ NestJS money-plane (TypeScript)** ซึ่งเป็นเจ้าของตรรกะเงิน (ตามคำตัดสิน stack C2 — Hybrid TypeScript) — *ไม่ใช่* Supabase Edge Function/Deno อีกต่อไป. **ตรรกะ gate ทั้งหมด, plpgsql gate+post functions, DB invariants, RLS และ schema ในเอกสารนี้ไม่เปลี่ยน** — เปลี่ยนแค่ runtime ที่ orchestrate (Deno → NestJS) + มี worker process แยกสำหรับ recon/payout/expire. money-critical write ผ่าน DB role `money_writer` เพียงรายเดียว.

---

## 1. MVP Scope — v1 ทำอะไร / ไม่ทำอะไร

> **หลักการกำกับ:** *Build the SYSTEM broad, SEED the DATA dense.* MVP **ไม่ตัด** ความกว้างของระบบ (multi-tenant, multi-city, eat/see/do ครบ, ledger เต็ม CoA) และ **ไม่ตัด** compliance boundary (anti-self-redemption, append-only ledger, settled-cash mint gating) — MVP ตัดเฉพาะ **ความลึกเชิง operational (depth)** และ **footprint ของการเปิดตัว (Nimman district เดียว)** เท่านั้น. migration #1 สร้าง schema กว้างเท่าระบบเต็ม; โค้ด/UI เปิดเฉพาะ subset; การ seed ข้อมูล + featured quest เปิดตัวที่ **Nimman** เพื่อไม่ให้แผนที่ว่าง.
>
> **ข้อยกเว้นเดียวของ "schema กว้างเท่าระบบเต็ม":** identity-correlation surface (`identity_graph` / `account_links`) เลื่อนไป migration #3 ตามดีไซน์ §2.7 — ผลคือ control บางตัว (A.8.12 anti-self-redemption, goodwill↔identity edge, SEAM-4 re-score) **บังคับได้แค่ subset ของ arm ที่วันแรก** (ดู §1.5 #3 และ §1.6 #4). นี่คือเส้นแบ่งเดียวที่ "ความกว้าง" ถูกผ่อนจริงใน MVP และต้องถูกประกาศตรงไปตรงมา ไม่ใช่ assert ว่า full.

### 1.1 MVP Thesis (one-line)

> **"พิสูจน์ cross-merchant loyalty loop ที่ Nimman: นักท่องเที่ยว/nomad เดิน Cafe-Hop ข้าม 3–5 ร้านที่ escrow จริง → check-in → จบ quest → mint Coins ที่หนุนหลังด้วยเงิน merchant prefund → เดินไป redeem ของจริงที่เคาน์เตอร์อีกร้านใน <5 วินาที โดยทุกบาท/ทุก Coin ตรวจสอบได้บน append-only ledger และของฟรีไม่รั่ว"**

Smallest lovable product = **หนึ่ง featured quest ("Nimman Cafe-Hop")** ที่เดินได้จริงครบวง EARN→GRANT→REDEEM บนร้านที่ escrow เติมจริง ~15–25 ร้านในย่าน Nimman ที่ผ่าน Density Gate. ทุกอย่างอื่นคือ supporting cast.

### 1.2 Feature Matrix

เกณฑ์ 3 คอลัมน์:
- **IN-MVP** = build เต็ม, เปิดให้ผู้ใช้/ร้านจริงใช้ตั้งแต่ launch.
- **MINIMAL (manual/stub)** = มีในระบบเพราะ loop/compliance ต้องการ แต่ทำแบบ manual/ops-run/feature-flag/UI ขั้นต่ำ (ไม่ใช่ automated/self-serve เต็ม).
- **DEFERRED** = ไม่ build ใน MVP (schema อาจมีรองรับ แต่ไม่มีโค้ด/UI).

#### A. Consumer App (Flutter)

| Feature | IN-MVP | MINIMAL (manual/stub) | DEFERRED |
|---|---|---|---|
| Onboarding (zero-signup wall, value-before-identity, persona branch) | ✅ guest browse + deferred auth ที่ first-stamp | — | persona-tuned push tone อัตโนมัติ |
| Auth (LINE/Apple/Google/WeChat) | ✅ LINE + Apple + Google | WeChat = MINIMAL (เปิดปุ่ม แต่ Chinese FIT เป็น secondary จน Chang Klan/Night Bazaar phase) | — |
| Discovery — eat/see/do (map-first hybrid, Mapbox, freshness halo) | ✅ ครบ 3 หมวด (schema กว้าง, ข้อมูล dense ที่ Nimman) | — | — |
| Place detail + freshness badge ("Verified in person X days ago") | ✅ | — | — |
| Search / filter (category, open-now, price, distance, accepts-PromptPay/Alipay) | ✅ filter หลัก | vibe-tags + mixed-language search = MINIMAL (curated subset) | semantic/RED-POI deep-link |
| Passport / Quests (active quest, progress, escrow-aware pause) | ✅ (1 featured quest + standard quests) | — | collectibles/seasonal (Yi Peng/Songkran passport) |
| Check-in (tiered trust: gps_dwell / rotating_qr / proven_purchase) | ✅ ครบ 3 tier (anti-fraud core); check-in เป็น **non-money** ไม่ mint เอง — เมื่อ step สุดท้ายปิด quest จะ trigger handoff ไป `grant_coins` (§1.7 #4) | receipt-OCR tier = MINIMAL/manual | — |
| Redemption (merchant-initiated, rotating QR/OTP, geofenced, server-burn) | ✅ online-only burn (กฎเหล็ก); anti-self-redemption gate = **exact funder==redeemer + device-overlap arm** (KYC/payment-cluster arm = m#3, §1.5 #3) | — | offline PROVISIONAL_BURN (A.10.2, Phase 2 per-merchant flag); full KYC/payment-cluster anti-self arm (m#3) |
| Wallet (Sparks vs Coins แยกชัด, expiry timeline, no withdraw) | ✅ render projection — **Coin balance/expiry อ่านจาก `coin_lots` (remaining_minor, expires_at, state)** ซึ่งเป็นตารางการเงินตัวเดียวที่ client มี SELECT policy; Sparks จาก `spark_balances`. ห้าม render จาก `ledger_entries` (ปิด client) | — | — |
| Reviews (verified-visitor weighted, auto-translate) | ✅ submit + verified-visitor gate | auto-translate UGC = MINIMAL (on-demand, cache) | review reply gallery/video |
| Notifications (S2) | ✅ transactional (quest done, Coin expiry, redemption result) | geo-nudge push + marketing = MINIMAL (consent-gated, low volume) | broadcast/privileged fan-out |

#### B. Merchant (Web Next.js+Refine + Counter PWA)

| Feature | IN-MVP | MINIMAL (manual/stub) | DEFERRED |
|---|---|---|---|
| Claim / verify (trust state machine CLAIMED→IDENTITY_VERIFIED→FINANCE_VERIFIED) | ✅ Agent-led on-premise code path — **ต้องมี `merchant_trust_state` enum/column + claim/verify transition (edge-fn หรือ agent task pipeline)** ใน m#1; `kyc_status` (identity-only) เพียงตัวเดียวแทน FINANCE_VERIFIED ไม่ได้ (§1.7 #3). prefund/psp_settle ต้องอ่าน FINANCE_VERIFIED ก่อนปล่อย top-up | self-serve identity upload + finance review = MINIMAL (human review by ops, SoD enforced) | full self-serve liveness KYC |
| Dashboard (escrow balance, alerts, verification status) | ✅ core | analytics depth = MINIMAL | — |
| Deals / promotions | ✅ basic (1–3 active via Change Proposal) | scheduling/audience-filter = MINIMAL | — |
| Quest join / create cross-merchant quest | ✅ **join/fund** platform/featured quest — ผ่าน `fund_quest` edge-fn (FUND_QUEST txn + `escrow_locks` quest_pool reservation, §1.7 #1); ขาดอันนี้ = `grant_coins` GATE 3 decrement reservation ที่ไม่เคยถูกสร้าง | **create** self-serve quest = MINIMAL (ops-assisted; Growth+ gating later) | merchant-built quest invite-flow |
| Escrow top-up (PromptPay/card → PREFUND→PSP_SETTLE) | ✅ ครบ (mint gated on settled cash) | auto-topup config = MINIMAL | — |
| Redemption scan (Counter Scanner PWA, staff sub-account) | ✅ scan + OTP fallback (<5s); merchant-side **nonce issuer** ที่เขียน `redemptions.qr_nonce/valid_until` ก่อนลูกค้าสแกน = ต้องมีใน m#1 (redeem GATE 0 สมมติว่า nonce มีอยู่แล้ว, §1.7 #5) | offline queue tolerance = MINIMAL | — |
| Analytics (footfall, tourist/local split, redemption ROI, you-owe/owed) | footfall + redemption count = ✅ basic | ROI / cross-merchant balance = MINIMAL (read-model) | export CSV/API, benchmark ย่าน (add-on `analytics_pro`) |
| Billing / subscription | — | MINIMAL (manual invoice; `free`/`starter` only at launch) | full self-serve tier upgrade, annual deferred-revenue UI |

#### C. Field Agent (Flutter role-gated)

| Feature | IN-MVP | MINIMAL (manual/stub) | DEFERRED |
|---|---|---|---|
| Territory (geofenced PostGIS polygon, Nimman Soi 1–17) | ✅ | — | auto-subdivision >250 places |
| Tasks (seed_place / verify_hours / refresh_photos / onboard_merchant) | ✅ core task types | scheduler auto-generation จาก Freshness SLA = MINIMAL (manager assigns manually at launch) | anti-cherry-pick ratio engine |
| Submit (Change Proposal เท่านั้น — ไม่เขียน live data) | ✅ **กฎเหล็ก, full** | — | — |
| Moderation (author≠moderator SoD) | ✅ Content Moderator approve queue — apply ผ่าน `apply_proposal`/`moderate_proposal` edge-fn ที่เป็น **ผู้เขียน live `places` + bump version + เขียน `places_history` ตัวเดียว** (§1.7 #2); ถ้าขาด proposal ถูก mark approved แต่ data ไม่ขึ้น live → Density Gate ไม่ถึงได้เลยผ่าน path ที่ถูกกฎหมาย | mod tooling = MINIMAL (shared queue, basic diff view) | bulk/auto-approve trusted fields |

#### D. Back-Office (S1–S6)

| Subsystem | IN-MVP | MINIMAL (manual/stub) | DEFERRED |
|---|---|---|---|
| **S1 Dispute/Support** | ticket container + verdict linkage to ledger txn | ✅ **MINIMAL = manual dispute via ops**: `cs_refund` / `cs_grant_goodwill` edge fn เรียกผ่านเดียวกัน, ops ตัดสินด้วยมือ; goodwill ผ่าน `sponsor:platform_goodwill` partition | full ticketing UI, auto-routing, SLA engine |
| **S2 Notification** | event-bus + outbox + transactional templates (3 ภาษา) | geo-push pipeline + marketing = MINIMAL | privileged broadcast control (breach fan-out) |
| **S4 Payout/Tax** | PAYOUT + AGENT_PAYOUT postings, SoD (creator≠approver), `payout_batches`/`payout_items` | ✅ **MINIMAL = weekly manual payout run** (ops-triggered, dual-control); WHT 3% / VAT 7% legs posted แต่ remit = manual | automated batch scheduler, full tax-invoice (ภพ.20) automation, escheatment sweep |
| **S5 Moderation** | `content_reports` + `moderation_actions` (append-only) | MINIMAL = manual review queue (shared with change_proposal tooling) | auto-detection (toxicity/spam/pHash), shadow-ban engine, appeal flow |
| **S6 Recon/Freeze** | ✅ **nightly reconcile (A.8.2s solvency anchor, A.8.5 per-funder, A.8.6 cache drift) + `platform_freeze_state`** | fraud pipeline = MINIMAL (`fraud_signals`/`fraud_cases` tables + core rules: impossible_travel, velocity, self-redeem-exact-arm; manual triage) | full graph-based Sybil detection (m#3 identity_graph), intraday recon, DR multi-region failover |

### 1.3 ภาษา (TH/EN/ZH) และ Revenue Streams ใน MVP

**ภาษา — แนะนำ: ship TH + EN เต็ม, ZH = MINIMAL ที่ launch**
- **TH 100% + EN 100%** = bar ของ Density Gate สำหรับ Nimman (audience: Thai local/nomad + Western tourist — ทั้งคู่หนาแน่นที่ Nimman). Schema เป็น `*_i18n jsonb {th,en,zh}` + ตาราง `translations` ครบ 3 ภาษาตั้งแต่ migration #1 (ไม่ re-architect).
- **ZH (简体)** = MINIMAL (≥80% curated content, UI strings ครบ, WeChat login เปิดแต่ secondary). **ZH เต็ม + Alipay/WeChat first-class เลื่อนไปเปิดตอน Chang Klan/Night Bazaar** ที่ Chinese FIT หนาแน่นจริง (ตรง District Sequence #4). เหตุผล: Nimman audience จริงคือ TH/EN-dominant; ดัน ZH เต็มที่ Nimman = เปลือง content-ops โดยไม่มี demand.

**Revenue streams — เปิด 2 จาก 4 ใน MVP:**

| เสา | สถานะ MVP | เหตุผล |
|---|---|---|
| (b) **Take-rate** (flat 10%, micro-redeem <30฿ = 0, taper 300฿) | ✅ **ON** | คือ unit-economics ของ loyalty loop เอง — เปิดพร้อม redemption แรก. `platform_revenue` leg post ตั้งแต่ txn REDEEM แรก |
| (a) **Subscription** (free/starter/growth/pro) | MINIMAL | เปิดแค่ `free` (claim density) + `starter` (escrow+redeem). billing = manual invoice. `growth`/`pro` analytics + add-on = later |
| (c) **Sponsored quest / festival campaign** | DEFERRED | ต้องการ sponsor onboarding + campaign tooling; เปิดตอน Old City temple-trail / Yi Peng (Phase 1–2). *(schema `sponsors`/`campaigns` + `sponsor_budget` (รวม partition `sponsor:platform_goodwill`) มีตั้งแต่ migration #1)* |
| (d) **Affiliate / data product** (Klook/TakeMeTour, k-anon) | DEFERRED | ต้องการ traffic volume + k-anonymity (k≥25) ที่ MVP ยังไม่ถึง. `affiliate_clicks` + `AFFILIATE` txn มี schema รองรับ |

### 1.4 Data Density Gate ก่อนเปิด Consumer Launch (Nimman)

**กฎเหล็ก: ห้ามยิง consumer marketing เข้า Nimman จนกว่าจะผ่าน gate ครบทุกข้อ** (เครื่องมือหลักกัน empty map). Bar สำหรับ MVP (ปรับ ZH ตาม §1.3):

| เกณฑ์ (ต่อ district = Nimman) | Bar MVP | วัดจาก schema |
|---|---|---|
| Place coverage (เทียบ Google Places baseline) | **≥ 90%** | **ต้องมี denominator เก็บใน schema** (เช่น `districts.coverage_baseline int` หรือ `platform_config` key ต่อ district) — m#1 มี `place_source='google_places_seed'` นับ numerator ได้ แต่ baseline/target ยังไม่อยู่ใน schema → ไม่มี denominator = วัด gate นี้เป็น single query ไม่ได้ (ตรงกับ gap ที่ SYSTEM_PLAN §12 flag ไว้: "refresh denominator ของ Density Gate"). **ต้องเพิ่มก่อน gate ใช้งานจริง** |
| รูปถ่ายต่อ Place (agent ถ่ายเอง) | **≥ 5 รูปคุณภาพ** | `media(owner_type='place')` count/place |
| ข้อมูลครบ (hours, price_band, category, geo) | **100%** ของ live places | NOT NULL check บน `places.*` ที่ `status='published'` |
| Trilingual completeness | **TH 100% / EN 100% / ZH ≥ 80%** (ผ่อน ZH สำหรับ MVP) | scan `name_i18n`/`description_i18n` jsonb keys + `_mt` marker (ไม่มี computed column → scan ไม่ใช่ indexed query; เพิ่ม completeness flag/view ได้ถ้าต้องการ) |
| Active Quest ในย่าน | **≥ 3 quest** (รวม 1 featured "Nimman Cafe-Hop") | `quests` ที่ `status='active'` + `district_id` + `is_featured` |
| Merchant ที่มี Escrow เติมจริง | **≥ 5 merchant** (settled, มี coin_backing พร้อม mint) | `escrow_wallets.settled_total_cached>0` |
| Active promotions | **≥ 10** promo สด | `deals` ที่ `status='active'` |

> **5/7 เกณฑ์ query ได้ตรงจาก m#1 schema**; เกณฑ์ "place coverage ≥90%" ต้องเพิ่ม baseline denominator (ข้างบน) และ trilingual เป็น scan ไม่ใช่ indexed — ทั้งสองเป็น **build prerequisite ของ gate** ไม่ใช่ของ loop, จึงไม่บล็อก migration #1 แต่บล็อกการ "ปิด gate ได้จริง".
>
> ก่อนผ่าน = "seeding mode" (agent ทำงาน, ผู้ใช้เห็น pin แต่ไม่มีโฆษณา). หลังผ่าน = ปลด paid social + micro-influencer + One Nimman/Maya in-mall activation **เฉพาะ Nimman**. Manager sign-off ปิด gate (Wk 4 ของ strike-team playbook).

### 1.5 MINIMAL-but-PRESENT ใน MVP — เพราะ loop/compliance ต้องการแม้ในวันแรก

สิ่งเหล่านี้ **ดูเหมือนตัดได้แต่ตัดไม่ได้** เพราะถ้าขาด loyalty loop พังหรือผิด compliance ทันที:

1. **Ledger เต็ม CoA + tenancy keys = FULL ตั้งแต่ migration #1** (ไม่ใช่ minimal). ครบทั้ง **25 `account_type`** ของ canonical A2.1 (v1.0 §A.1 + ratified v1.1) — รวม `bank_settlement`, `coin_backing`, `merchant_receivable`, `clearing`, `wht_payable`, `vat_output_payable`, `vat_input_claimable`, **`vat_carryforward`**, `payout_suspense`, `agent_reserve`, `platform_expense`, `platform_breakage`, `escheatment_liability`, `bad_debt_expense`, และ `platform_goodwill_budget` (ติด `pending_ratification` — S6 รู้จัก ไม่ flag foreign แต่ยังไม่ active เป็น solvency line). `expiry_breakage` **ถูกตัดทิ้ง** ตาม v1.0 (COIN breakage วัดจาก `ref_type=expiry` 2-leg, ไม่มี sink ที่สาม) — อย่า rename กลับ. เหตุผลที่ต้องครบวันแรก: append-only ledger backfill ไม่ได้, และ S6 enumeration จะ flag "foreign account" ถ้า post leg เข้า account ที่ยังไม่อยู่ใน CoA → false break → global FROZEN (lockstep rule A2.7). `city_id NOT NULL` ทุกตารางการเงิน.
2. **Settled-cash mint gating (A.8.11) = ON.** mint Coin ได้เฉพาะหลัง `PSP_SETTLE` landed ที่ `bank_settlement` — แพลตฟอร์มไม่เคยสำรองเงิน. 1b (PSP_SETTLE) เป็น **MANDATORY** ก่อน escrow "available สำหรับ mint" ใน MVP; `prefund` ทิ้งเงินไว้ที่ `psp_suspense` (unsettled) ซึ่ง back mint ไม่ได้.
3. **Anti-self-redemption (A.8.12) = ON — แต่ MVP บังคับได้เฉพาะ subset ของ arm (ประกาศตรง ไม่ assert ว่า full).** canonical A.8.12 ต้อง route เมื่อ redeemer ผูก **KYC / device / payment** เดียวกับ funder. แต่ดีไซน์ §2.7 เลื่อน `identity_graph` + `account_links` ไป migration #3 (m#1 มีแค่ `devices.device_fingerprint` + `merchants.owner_user_id`). **ผลที่บังคับได้จริงวันแรก:**
   - (ก) `redeeming_merchant == funder(lot)` — **exact, บังคับครบ** ✅
   - (ข) device-fingerprint overlap ระหว่าง redeemer กับ owner_user_id ของ funder-merchant — **partial** ✅
   - (ค) KYC-cluster / shared-payment-instrument arm, goodwill↔identity-cluster edge (A2.9-#2), และ SEAM-4 identity-graph re-score — **ยังบังคับไม่ได้จน m#3** ❌
   
   **ทางเลือก build (founder เคาะ — ดู §1.6 #4):** *(a)* ดึง minimal identity-correlation surface เข้า m#1 (device-fingerprint join ทำได้อยู่แล้ว; เพิ่ม thin `payment_instrument_hash` + `kyc_hash` column บน users/devices) → arm (ค) บางส่วนคำนวณได้วันแรก; **หรือ** *(b)* ยอมรับ scope ว่า MVP = "exact funder==redeemer + device-overlap เท่านั้น; KYC/payment-cluster arm + goodwill↔identity edge land กับ identity_graph ที่ m#3" แล้ว **gate goodwill-at-scale บนเงื่อนไขนั้น** (ตรง A2.9-#2 "before enabling goodwill at scale"). กรณีใดก็ตาม นี่คือ **e-money compliance boundary ของ ธปท.** — โหลดหนักพอที่จะต้องประกาศชัด ไม่ใช่ปล่อยให้ดู full.
4. **`coin_lots` lock-anchor + FIFO unexpired + FOR UPDATE = ON.** REDEEM/EXPIRE/REFUND serialize ผ่าน row lock จริง (`SELECT … FOR UPDATE`, REPEATABLE READ, FIFO `expires_at` WHERE state='active'); REDEEM เช็ค `expires_at > now()` ที่ burn-time. ขาดอันนี้ = double-redeem race + user_coin ติดลบ + จ่ายซ้ำ.
5. **Append-only + balance invariants = ON (full set).** `REVOKE UPDATE,DELETE` + block trigger บน `ledger_entries`/`ledger_transactions` (A.8.9); แก้ได้แค่ post reversal (`reverses_txn_id`) + `one_reversal_per_target` EXCLUDE constraint (A.8.13). **invariant ที่ต้องบังคับจริงในวันแรก: (A.8.1) sum-to-zero ต่อ currency ต่อ txn — deferred constraint trigger; และ (A.8.1b) clearing-flat ต่อ txn = `Σ(DR amount_minor WHERE account_type='clearing') = Σ(CR … clearing)` เป็น first-class invariant แยกจาก A.8.1.** A.8.1b ต้อง implement เป็น branch จริง (join `ledger_entries`→`accounts` resolve account_type) **ไม่ใช่ prose comment** — เพราะ per-currency sum-to-zero ผ่านได้แม้ clearing ค้างยอด THB (เคส single-sided `Dr clearing / Cr platform_expense` ของ AGENT_CLAWBACK draft ที่ v1.1 ระบุว่า trip A.8.1b → global FROZEN) → ถ้าไม่มี branch จะ "miss" break ที่ควร "detect". + acceptance test post clearing-imbalanced txn แล้ว assert rollback.
6. **Reward-COGS cap (A2.4) machinery = present แต่ INERT-UNTIL-SIZED.** mint-gate ตรวจ `REWARD_PER_REDEMPTION_CAP_THB` + `MERCHANT_MONTHLY_COGS_CAP_THB`; ค่าทั้งสองเป็น founder call (§1.6 #1) — ถ้า null → fail-closed REJECT (flag `cogs_cap_unset`). ตั้งค่าก่อน enable D7/CS-initiated GRANT.
7. **Change Proposal invariant = ON (full).** Agent/Merchant ไม่เคยเขียน live data — ทุก edit ผ่าน `change_proposals` + moderation (author≠moderator SoD, CHECK `reviewed_by <> proposed_by`). live write ตัวเดียวที่ถูกกฎหมายคือ `apply_proposal` edge-fn (§1.7 #2). คือทั้ง moat และ anti-fraud.
8. **Nightly reconcile (S6) = ON minimal.** A.8.2s solvency anchor เทียบ bank/PSP statement จริง (narrow RHS, รวม goodwill coin_liability) + A.8.5 per-funder + A.8.6 cache-drift + `platform_freeze_state` (อ่านก่อนทุก money op). คือ tripwire ว่าเงินจริงพอค้ำ Coin ที่ค้างไหม.
9. **Manual dispute + manual payout via ops (S1/S4 MINIMAL).** มี edge fn เดียว (`cs_refund`/`cs_grant_goodwill`/`payout`) ที่ embed gate ครบ; ops เรียกด้วยมือ. ไม่มี "ประตูหลัง" ที่ mint/refund/payout เลี่ยง gate (SEAM-1).
10. **Multi-tenancy + multi-city + eat/see/do breadth = FULL.** `merchant_id` + `city_id` + place `category enum (eat/see/do)` + RLS scope tree (scope-in-token, no recursive RLS) ตั้งแต่วันแรก — เปิดเมือง/ย่านใหม่ = INSERT scope ไม่ใช่ code change. *(ข้อยกเว้นเดียวของ breadth = identity-graph เลื่อน m#3, §1.5 #3.)*

### 1.6 Scope Decisions สำหรับ Founder (ต้องเคาะ — decisive defaults เสนอไว้)

| # | Decision | คำแนะนำ (default) |
|---|---|---|
| 1 | **Reward-COGS cap sizes** (`REWARD_PER_REDEMPTION_CAP_THB`, `MERCHANT_MONTHLY_COGS_CAP_THB`) — **BLOCKING ก่อน GA / ก่อน D7/CS GRANT** | ตั้งทั้งคู่ก่อน launch redemption; calibrate จาก ~46% break-even incrementality (pricing B.6/D.1). cap inert + fail-closed จนกว่าจะ set |
| 2 | **ZH ใน MVP เต็มหรือ minimal** | **Minimal ที่ Nimman, เต็มที่ Chang Klan** (§1.3) — ประหยัด content-ops ตาม demand จริง |
| 3 | **Subscription tiers ที่เปิด launch** | `free` + `starter` only; billing manual. `growth`/`pro` + `analytics_pro` add-on = post-MVP |
| 4 | **Goodwill account form + anti-self arm depth ที่ MVP** | ship บน `sponsor:platform_goodwill` partition (build-ready, S6-visible). **เลือก §1.5 #3 ทางเลือก (a) หรือ (b)** — ถ้า (b) (device-overlap-only ที่ launch) ต้อง **gate goodwill-at-scale ไว้จน identity_graph (m#3)** + นิยาม goodwill↔identity-cluster A.8.12 edge ก่อน; ขอ BoT/e-money + A.8.12 sign-off ก่อน promote `platform_goodwill_budget` ออกจาก `pending_ratification` |
| 5 | **Bad-debt reserve size** สำหรับ `merchant_receivable` + auto-PAUSE-GRANT threshold | founder ตัดสิน "ขนาด" (ไม่ใช่ "จะ freeze ไหม" — SEAM-2 บังคับ fail-closed ที่ 100%, WARN 70%) |
| 6 | **Breakage destination policy** (EXPIRE/CHURN leftover → return-funder / `platform_breakage` / `escheatment_liability`) + pre-expiry notify+grace (A.10.4) | default = **คืน funder** ("platform keeps no breakage") ปีแรก; ต้อง TH legal sign-off ก่อน go-live เพราะ posting hardcode ใน canonical |
| 7 | **Offline redemption** | online-only burn ใน MVP; PROVISIONAL_BURN = Phase 2 per-merchant flag (A.10.2) |
| 8 | **VAT-inclusive vs exclusive** + agent WHT status (freelance 3%) + bank-change cool-down | default VAT-inclusive, freelance-3%, `BANK_CHANGE_COOLDOWN_HOURS=72` |

### 1.7 Build-ready dependencies — server-authoritative writers ที่ scope IN-MVP บังคับให้มีใน migration #1

scope §1.2 ประกาศหลายฟีเจอร์เป็น IN-MVP ที่ **RLS ปฏิเสธ client write ทุกตาราง escrow/ledger/places** (SEAM-1 "ไม่มีประตูหลัง") — ดังนั้นต้องมี edge-fn/transition ฝั่ง server เป็น **ผู้เขียนตัวเดียวที่ถูกกฎหมาย**. ถ้าขาด loop ขาดวงทันที. ต้อง land ใน m#1 (ไม่ใช่ schema-only):

1. **`fund_quest` / `join_quest` edge-fn** — `FOR UPDATE` บน `escrow_wallets`; ASSERT `settled_available ≥ reward_pool_size`; INSERT `escrow_locks(lock_reason='quest_pool', ref_id=quest_id)`; POST `FUND_QUEST` txn (escrow available→locked); set quest active. **ขาด = `grant_coins` GATE 3 decrement reservation ที่ไม่เคยถูกสร้าง → fail-closed (quest จ่ายไม่ได้เลย) หรือ mint against unreserved balance (double-spend escrow ข้าม concurrent quests, ละเมิด A.8.7).** IN-MVP เพราะ Matrix B/C ลิสต์ quest join เป็น IN-MVP และ Nimman Cafe-Hop พึ่งมัน.
2. **`apply_proposal` / `moderate_proposal` edge-fn (service_role)** — atomically: flip `change_proposals.status='approved'` (enforce reviewer≠proposer ที่ boundary ด้วย, defense-in-depth), copy diff → live `places`, bump `places.version`, close `places_history.valid_to` เดิม + insert snapshot ใหม่ (`change_proposal_id`), update `data_freshness.last_verified_*`, set `tasks.status='approved'`. **เป็น writer ตัวเดียวของ live moat data** → ขาด = data ไม่ขึ้น live → consumer ไม่เห็น Nimman places ที่ agent seed → Density Gate ไปไม่ถึง. IN-MVP เพราะ Change Proposal invariant = FULL.
3. **`merchant_trust_state` enum/column + claim/verify transition** (claimed/identity_verified/finance_verified) — `kyc_status` (3 ค่า, identity-only) แทน FINANCE_VERIFIED ไม่ได้. ต้องมี machine-readable gate ที่ `prefund`/`psp_settle` อ่านก่อนปล่อย escrow top-up ของร้านที่ยังไม่ finance-verified. transition ผ่าน edge-fn หรือ agent task pipeline (Agent-led claim path). IN-MVP เพราะ Matrix B ลิสต์ 3-state machine เป็น IN-MVP.
4. **Quest-completion → `grant_coins` handoff** — `check_in` (non-money) ต้อง evaluate `quest_progress` ตอน check-in สุดท้าย; เมื่อถึง `min_steps_required` → set `quest_progress.status='completed'` + invoke `grant_coins` (atomic step เดียว/ถัดไป) + set `reward_grant_id`. นี่คือ **EARN→GRANT bridge ที่สำคัญที่สุดของ consumer loop** — ต้องตั้งชื่อ/ระบุ writer ชัด (in-`check_in` หรือ dedicated `complete_quest` edge-fn), ห้ามปล่อยเป็น implicit seam.
5. **Counter-scan nonce issuer** — merchant-side generator ที่เขียน `redemptions.qr_nonce` + `valid_until` **ก่อน** ลูกค้าสแกน; `redeem` GATE 0 สมมติว่า nonce มีอยู่แล้ว. ต้องนิยามแยกจาก `redeem` edge-fn. IN-MVP เพราะ Redemption scan = IN-MVP.

> เหล่านี้ไม่ใช่ scope ใหม่ — เป็น **build prerequisite ของ scope ที่ประกาศ IN-MVP ไปแล้ว**. ดีไซน์ปัจจุบัน (§3.3 edge surface) มี `check_in, grant_coins, redeem, prefund, psp_settle, expire, payout` แต่ **ขาดทั้ง 5 ตัวนี้** — ต้องเพิ่มเข้า edge-fn surface ของ migration #1 เพื่อให้ scope build-ready จริง.

---

## 2. ERD & Migration #1 (Schema)

> **ขอบเขต section นี้:** แปลง design ใน `SYSTEM_PLAN.md §3/§7` + canonical ledger (`02_*` v1.0 / `02b_*` v1.1) + subsystems S1–S6 เป็น **migration #1 ที่ build ได้จริง**. หลักการบังคับ: ระบบเป็น **BROAD** (รองรับ eat/see/do + multi-tenant + multi-city ตั้งแต่แถวแรก) แต่ rollout เป็น **DENSE** (seed + featured-quest เริ่มที่นิมมาน). Migration #1 จึงมี **โครงตารางกว้างเต็ม + ledger CoA ครบ 100%** แต่ตัด *operational depth* ของบาง subsystem ไปเป็น migration ถัด ๆ ไป (ดู §2.7).
>
> **กฎเหล็กที่ schema ต้องบังคับ (ไม่ใช่ convention):** (1) เงินทุกตัว = `BIGINT` หน่วยสตางค์ (`*_minor`) — ห้าม `numeric`/`float` ในเส้นทางเงิน; (2) `city_id NOT NULL` ทุกตารางธุรกิจ; `merchant_id` ทุกตารางที่ผูกร้าน; (3) ledger append-only (REVOKE + trigger); (4) 1 COIN = 1 THB = 100 minor (FIXED); (5) i18n = `jsonb *_i18n` per-field + ตาราง `translations` กลาง (ดู §2.6).
>
> **boundary ของ section นี้ (สำคัญ — อ่านก่อน build):** §2 นิยาม **schema + DB-level constraints/triggers** เท่านั้น. กลไกที่เป็น *runtime logic* — RLS policy bodies, JWT/Custom-Access-Token claim shape, และ **edge-function surface** (`grant`/`redeem`/`prefund`/`psp_settle`/`expire`/`payout`/`fund_quest`/`apply_proposal`/`cs_grant_goodwill`) — อยู่ใน §3. §2 รับผิดชอบ "ให้ hook ครบ" (column/table/constraint ที่ logic เหล่านั้นต้องใช้); การ wire logic เป็นของ §3. ทุกจุดที่ §2 ต้องพึ่ง writer ใน §3 มี **edge-fn contract map** ที่ §2.4.1 กำกับไว้ชัด ห้าม implied seam.

---

### 2.1 ERD / Relationship Map (จัดกลุ่มตาม bounded context)

ใช้สัญกรณ์: `A ──< B` = A 1:N B (B ถือ FK ชี้ A) · `A ─1:1─ B` · `(tenant)` = ถือ `city_id`/`merchant_id`

```
─────────────────────────────────────────────────────────────────────────────
DOMAIN A — GEO / TENANCY                                  (รากของ multi-tenancy)
─────────────────────────────────────────────────────────────────────────────
cities ──< districts ──< places                          cities = "CNX" แถวแรก
cities ──< merchants                                     districts.rollout_status = seeding(นิมมาน)
place_categories ──< places          (lookup: category enum + subcategory slug + name_i18n)
merchants ──< places                 places.merchant_id NULLABLE (วัด/ที่สาธารณะไม่มีเจ้าของ)
places ─1:1─ places_history(version)  ─1:1─ data_freshness
districts.coverage_baseline           = denominator ของ Density-Gate place-coverage (SYSTEM_PLAN §11.2)

─────────────────────────────────────────────────────────────────────────────
DOMAIN B — IDENTITY
─────────────────────────────────────────────────────────────────────────────
auth.users(Supabase) ─1:1─ users ─1:1─ profiles
users ──< user_roles (role enum + scope_city_id/scope_merchant_id)
users ──< devices         (identity-graph anchor, last_geo_coarse, device_fingerprint)
users ──< consents        (PDPA, versioned, append-only)
users ──< account_links   (auth-provider link audit; DEFERRED detail → m#3)
merchants ──< merchant_users  (staff sub-accounts: owner|manager|cashier)
merchants ──< merchant_proofs (trust-points accumulator → trust_state machine; §2.3)
roles = static seed (12 canonical roles)

─────────────────────────────────────────────────────────────────────────────
DOMAIN C — CONTENT
─────────────────────────────────────────────────────────────────────────────
places ──< deals (tenant)          places ──< reviews (tenant)
{place|review|quest|profile|campaign} ──< media (polymorphic owner_type/owner_id, tenant)
reviews ── linked_check_in_id ──> check_ins   (trust_weight derive จาก trust_tier)

─────────────────────────────────────────────────────────────────────────────
DOMAIN D — GAMIFICATION
─────────────────────────────────────────────────────────────────────────────
quests ──< quest_steps ──> places            quests.funding_escrow_wallet_id ──> escrow_wallets
quests ── sponsor_id ──> sponsors            quests.status: paused_zero_balance (auto)
users ──< quest_progress ──> quests          quest_progress.reward_grant_id ──> coin_grants
users ──< check_ins ──> places/quest_steps   check_ins.device_id ──> devices (impossible-travel)
passports = view/surface เหนือ quest_progress (ไม่ใช่ตารางใหม่ — ดู §2.7)
```
> **handoff ที่ §3 ต้อง wire (consumer EARN→GRANT bridge):** check_in สุดท้ายที่ทำให้ครบ `quests.min_steps_required` → set `quest_progress.status='completed'` แล้วเรียก mint edge-fn → set `quest_progress.reward_grant_id`. คอลัมน์ทั้งหมดมีพร้อม; ตัว writer = §3 (ดู §2.4.1 contract C5).
```
─────────────────────────────────────────────────────────────────────────────
DOMAIN E — LEDGER (หัวใจ) ⭐  append-only double-entry, satang BIGINT
─────────────────────────────────────────────────────────────────────────────
accounts ──< ledger_entries >── ledger_transactions      (sum-to-zero/currency/txn + clearing-flat/txn)
ledger_transactions ── reverses_txn_id ──> ledger_transactions (self-ref)
accounts(user_coin) ──< coin_lots ──< ledger_entries.lot_id  (lock-anchor, FIFO burn)
coin_grants ── ledger_txn_id ──> ledger_transactions     (mint event record)
redemptions ── ledger_txn_id ──> ledger_transactions     (burn event record)
escrow_wallets ─1:1─ accounts(merchant_escrow|sponsor_budget)   ──< escrow_locks
users ─1:1─ spark_balances ──< spark_events              (Sparks = แยกจากเงิน-ledger)

─────────────────────────────────────────────────────────────────────────────
DOMAIN F — MONETIZATION
─────────────────────────────────────────────────────────────────────────────
sponsors ─1:1─ escrow_wallets        sponsors ──< campaigns ──> quests[]
merchants ──< subscriptions ── sold_by_agent_id ──> agents
platform_config (singleton kv, ปรับ take-rate/cap/cogs โดยไม่ migrate)
affiliate_clicks, invoices → DEFERRED detail (ดู §2.7)

─────────────────────────────────────────────────────────────────────────────
DOMAIN G — FIELD OPS (moat)        H — GOVERNANCE
─────────────────────────────────────────────────────────────────────────────
agents ──< territories             change_proposals ──> places (target) ──> places_history
agents ──< tasks ── change_proposal_id ──> change_proposals
merchants ── onboarded_by_agent_id ──> agents
audit_log (append-only, prev_hash/row_hash chain)   data_freshness ─1:1─ places

─────────────────────────────────────────────────────────────────────────────
SUBSYSTEM TABLES (MVP-needed subset of S1/S2/S4/S5/S6)
─────────────────────────────────────────────────────────────────────────────
S1: support_tickets ──< ticket_events / ticket_evidence ; dispute_verdicts
    support_tickets ── resolution_ledger_txn_id ──> ledger_transactions
S2: notif_outbox  (transactional outbox; row ผูกใน business txn เดียวกัน)
S4: payout_batches ──< payout_items ──> accounts ; agent_wht_ledger
S5: content_reports ──< moderation_actions      (UGC takedown — แยกจาก change_proposals)
S6: fraud_cases ; reconciliation_runs ; platform_freeze_state (edge fn อ่านก่อนทุก money op)
```

**Tenancy invariant (cheat-sheet):** ทุกตารางใน A–H ถือ `city_id NOT NULL`. ตารางที่ผูกร้าน (`places, deals, reviews, media, check_ins, redemptions, escrow_wallets, subscriptions, change_proposals, quest_steps, content_reports, support_tickets`) ถือ `merchant_id` (NULLABLE เฉพาะที่ design ระบุ เช่น `places`). Ledger แยกบัญชีด้วย `city_id + accounts.owner_id`.

---

### 2.2 Enums (canonical — ค่าครบทุกตัว)

> **กฎ:** enum ทุกตัวสร้างใน migration #1 พร้อมค่าครบ แม้ MVP ยังไม่เดินทุก path — กัน enum migration ภายหลัง (Postgres `ALTER TYPE ADD VALUE` แพง + ผูก transaction). ตัด `SPARK` ออกจาก `currency` (Sparks ไม่ใช่เงิน).
>
> **ยืนยัน completeness (canonical audit):** `account_type` = **25 ค่าเป๊ะตาม A2.1** (v1.0 21 + v1.1 ratified 4: `platform_expense`, `agent_reserve`, `wht_payable`/`vat_*`/`payout_suspense`/`wht_credit_received` group, `platform_goodwill_budget` pending) — รวม `vat_carryforward` ที่ทำให้ `VAT_REMIT` sum-to-zero ทุก branch. `txn_type` = **22 ค่า** (17 v1.0 + 5 v1.1). `expiry_breakage` ถูกตัด (canonical = `platform_breakage`); `platform_goodwill_budget` add-เป็น-enum แต่ **pending_ratification** (ดู §2.5).

```sql
-- ── Ledger core (locked v1.0 + ratified v1.1) ──
CREATE TYPE currency      AS ENUM ('THB','COIN');                 -- ไม่มี SPARK (A.3)
CREATE TYPE ledger_dir    AS ENUM ('DR','CR');
CREATE TYPE acct_owner    AS ENUM ('platform','merchant','sponsor','user','agent','payee');
CREATE TYPE acct_status   AS ENUM ('active','frozen','closed');

CREATE TYPE account_type AS ENUM (
  -- v1.0 locked (doc02 §A.1)
  'psp_suspense','bank_settlement','psp_fee_expense',
  'merchant_escrow','sponsor_budget','coin_liability','user_coin','coin_backing',
  'clearing','platform_revenue','deferred_revenue',
  'platform_breakage','escheatment_liability',           -- THB breakage dest (ไม่ใช่ expiry_breakage — ตัดทิ้ง)
  'merchant_payable','merchant_receivable','bad_debt_expense',
  -- v1.1 ratified (doc02b §A2.1)
  'platform_expense','agent_reserve',
  'wht_payable','vat_output_payable','vat_input_claimable','vat_carryforward',
  'payout_suspense','wht_credit_received',
  'platform_goodwill_budget'                              -- pending_ratification (legal sign-off) — ดู §2.5
);

CREATE TYPE txn_type AS ENUM (
  -- v1.0
  'PREFUND','PSP_SETTLE','FUND_QUEST','GRANT','REDEEM','EXPIRE','REFUND','CHARGEBACK',
  'CHURN_SWEEP','OWNERSHIP_TRANSFER','CAMPAIGN_END',
  'SUBSCRIPTION','SUBSCRIPTION_RECOGNIZE','AFFILIATE','PAYOUT','RECOVERY','WRITE_OFF',
  -- v1.1
  'AGENT_PAYOUT','AGENT_CLAWBACK','WHT_REMIT','VAT_REMIT','MERCHANT_CLAWBACK'
);

CREATE TYPE ledger_ref_type AS ENUM (
  'escrow_topup','psp_settle','quest_reward_pool','coin_grant','redemption','expiry',
  'reversal','recovery','write_off','subscription','affiliate','payout','ownership_transfer',
  'agent_payout','merchant_settlement','merchant_clawback','wht_remit','vat_remit',
  'wht_trueup','vat_trueup','payout_batch','payout_suspense','escheatment','goodwill_fund'
);

-- ── Domain enums ──
CREATE TYPE place_cat       AS ENUM ('eat','see','do');
CREATE TYPE price_band      AS ENUM ('1','2','3','4');           -- ฿ ฿฿ ฿฿฿ ฿฿฿฿
CREATE TYPE place_status    AS ENUM ('draft','published','temporarily_closed','permanently_closed');
CREATE TYPE place_source    AS ENUM ('agent_seed','merchant','google_places_seed');
CREATE TYPE rollout_status  AS ENUM ('planned','seeding','live');
CREATE TYPE locale_code     AS ENUM ('th','en','zh');
CREATE TYPE audience_seg    AS ENUM ('local','nomad_expat','tourist_west','tourist_cn');
CREATE TYPE user_status     AS ENUM ('active','suspended','banned');
CREATE TYPE kyc_status      AS ENUM ('pending','verified','rejected');
-- merchant trust state machine (SYSTEM_PLAN §7.1.1) — แยกจาก kyc_status (identity-only) ⭐
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
CREATE TYPE redeem_init     AS ENUM ('merchant_qr','merchant_otp');   -- ห้าม customer_static
CREATE TYPE redemption_st   AS ENUM ('pending','settled','expired','reversed','flagged');
CREATE TYPE spark_reason    AS ENUM ('checkin','review','task','referral','streak_bonus','admin_adjust');
CREATE TYPE sub_plan        AS ENUM ('free','starter','growth','pro');   -- ตัด basic/chain (B.1)
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
```

---

### 2.3 DOMAIN A–D — Geo / Identity / Content / Gamification (DDL)

```sql
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
  slug              text NOT NULL,                         -- 'nimman','old-city'
  boundary          geography(POLYGON,4326),
  rollout_status    rollout_status NOT NULL DEFAULT 'planned',
  coverage_baseline int,                                   -- Density-Gate denominator: #place "ควรอยู่"
                                                           --   จาก Google-Places seed (SYSTEM_PLAN §11.2);
                                                           --   coverage% = #published / coverage_baseline
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (city_id, slug)
);
CREATE INDEX idx_districts_boundary ON districts USING GIST (boundary);

CREATE TABLE place_categories (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category     place_cat NOT NULL,
  subcategory  text NOT NULL,                              -- slug: 'cafe','temple','cooking_class'
  name_i18n    jsonb NOT NULL,
  icon         text,
  UNIQUE (category, subcategory)
);

CREATE TABLE merchants (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),  -- = merchant_id ทั่วระบบ
  city_id              uuid NOT NULL REFERENCES cities(id),
  legal_name           text,
  display_name_i18n    jsonb NOT NULL,
  juristic_id          text,                               -- เลขนิติบุคคล 13 หลัก (DBD)
  tax_id_enc           bytea,                              -- encrypted (KYC/ภพ.20)
  owner_user_id        uuid,                               -- FK → users (deferred-add; ดู §2.4)
  -- identity / trust ──────────────────────────────────────────────────────
  kyc_status           kyc_status NOT NULL DEFAULT 'pending',  -- identity proof เดี่ยว (NID/ภพ.20)
  trust_state          merchant_trust_state NOT NULL DEFAULT 'claimed_unverified',  -- ⭐ state machine
  trust_points         int NOT NULL DEFAULT 0,             -- สะสมจาก merchant_proofs (SYSTEM_PLAN §7.1.2)
  kyc_hash             text,                               -- A.8.12: KYC-cluster correlation (hashed)
  -- finance ───────────────────────────────────────────────────────────────
  escrow_wallet_id     uuid,                               -- FK เพิ่มหลังสร้าง escrow_wallets
  subscription_id      uuid,                               -- FK เพิ่มหลังสร้าง subscriptions
  payout_bank_enc      bytea,                              -- encrypted; เปลี่ยน → trust_state=payout_frozen
  onboarded_by_agent_id uuid,                              -- FK → agents (deferred-add; ดู §2.4)
  payout_frozen        boolean NOT NULL DEFAULT false,     -- A.8.4 chargeback/recovery (แยกจาก trust_state)
  status               acct_status NOT NULL DEFAULT 'active',
  created_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_merchants_city  ON merchants(city_id);
CREATE INDEX idx_merchants_trust ON merchants(trust_state);
-- ★ FINANCE_VERIFIED gate (mvp_loop major): prefund/psp_settle/redeem edge-fn (§3) อ่าน trust_state
--   ก่อนอนุญาต money op — kyc_status (3 ค่า identity-only) map ไม่ครบ 3-state machine จึงต้องมี column นี้.
--   mapping: claimed_unverified=ห้ามแตะเงิน · identity_verified=top-up escrow ได้/ออก redemption ไม่ได้ ·
--            finance_verified=ออก redemption + รับ payout ได้ · payout_frozen=redeem ได้/payout ไม่ได้.

CREATE TABLE places (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id     uuid REFERENCES merchants(id),           -- NULLABLE (วัด/ที่สาธารณะ)
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
  opening_hours   jsonb,                                   -- OSM-style per-day + exceptions
  price_band      price_band,
  amenities       text[],
  payment_accepts text[],
  status          place_status NOT NULL DEFAULT 'draft',
  is_visible      boolean NOT NULL DEFAULT true,           -- guest/anon browse gate (RLS §3.1) — ซ่อนได้โดยไม่ลบ
  source          place_source NOT NULL DEFAULT 'agent_seed',
  verified_at     timestamptz,
  version         int NOT NULL DEFAULT 1,                  -- bump ทุก change_proposal approve
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_places_geo       ON places USING GIST (geo);          -- PostGIS map/geofence
CREATE INDEX idx_places_city_dist ON places(city_id, district_id);
CREATE INDEX idx_places_merchant  ON places(merchant_id);
CREATE INDEX idx_places_cat       ON places(category, subcategory);
CREATE INDEX idx_places_visible   ON places(city_id, district_id) WHERE status='published' AND is_visible;
-- ★ is_visible (minor fix): RLS policy public_reads_published_places (§3.1) อ้าง column นี้;
--   ถ้าไม่มี → policy create fail → deny-by-default → guest map คืน 0 published place (IN-MVP feature พัง).

-- shadow history (versioned moat data; เขียนทุกครั้งที่ proposal approve)
CREATE TABLE places_history (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id      uuid NOT NULL REFERENCES places(id),
  version       int NOT NULL,
  snapshot      jsonb NOT NULL,                            -- name/desc/geo/hours/price/category/status
  valid_from    timestamptz NOT NULL,
  valid_to      timestamptz,
  change_proposal_id uuid,                                 -- ที่มาของ version นี้
  city_id       uuid NOT NULL,
  UNIQUE (place_id, version)
);

CREATE TABLE data_freshness (
  place_id                  uuid PRIMARY KEY REFERENCES places(id),
  city_id                   uuid NOT NULL,
  last_verified_at          timestamptz,
  last_verified_by_agent_id uuid,                          -- FK → agents (deferred-add; ดู §2.4)
  verification_method       text,                          -- field_visit|merchant_self|google_seed
  freshness_label           freshness_label NOT NULL DEFAULT 'stale'  -- derive ผ่าน job; cache ที่นี่
);

-- ════════ B. IDENTITY ════════
CREATE TABLE users (
  id               uuid PRIMARY KEY,                       -- = auth.uid()
  primary_locale   locale_code NOT NULL DEFAULT 'th',
  auth_providers   jsonb NOT NULL DEFAULT '[]',            -- [{provider,sub}]
  home_city_id     uuid REFERENCES cities(id),
  audience_segment audience_seg,
  kyc_hash         text,                                   -- A.8.12: KYC-cluster correlation (hashed, nullable)
  status           user_status NOT NULL DEFAULT 'active',
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE profiles (
  user_id         uuid PRIMARY KEY REFERENCES users(id),
  display_name    text,
  avatar_media_id uuid,                                    -- FK media (deferred-add)
  spark_tier      text                                     -- cache จากยอด Sparks
);

CREATE TABLE roles ( role app_role PRIMARY KEY, description text );  -- 12-row seed

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

-- merchant staff sub-accounts (SYSTEM_PLAN §7.2.3 merchant_user)
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

-- merchant trust-proof accumulator (SYSTEM_PLAN §7.1.2; reviewer_id ≠ proposer for SoD §7.1.3)
CREATE TABLE merchant_proofs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id   uuid NOT NULL REFERENCES merchants(id),
  city_id       uuid NOT NULL REFERENCES cities(id),
  method        merchant_proof_method NOT NULL,
  trust_points  int NOT NULL DEFAULT 0,
  status        moderation_st NOT NULL DEFAULT 'pending',  -- identity/finance review verdict
  reviewer_id   uuid REFERENCES users(id),
  gate          text,                                      -- 'identity' | 'finance' (ซึ่ง human-review gate)
  doc_url_enc   bytea,                                     -- encrypted (PDPA)
  reviewed_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_merchant_proofs_merchant ON merchant_proofs(merchant_id);

CREATE TABLE devices (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES users(id),
  device_fingerprint text NOT NULL,                        -- hashed (A.8.12 device-cluster arm)
  payment_instrument_hash text,                            -- A.8.12 payment-cluster arm (hashed PAN/PromptPay)
  platform           text,                                 -- ios|android
  push_token         text,
  last_geo_coarse    geography(POINT,4326),                -- coarse only (PDPA)
  risk_score         numeric DEFAULT 0,
  city_id            uuid REFERENCES cities(id),
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_devices_user ON devices(user_id);
CREATE INDEX idx_devices_fp   ON devices(device_fingerprint);
CREATE INDEX idx_devices_pi   ON devices(payment_instrument_hash) WHERE payment_instrument_hash IS NOT NULL;
-- ★ A.8.12 correlation surface (major fix): MVP เดิม defer identity_graph/account_links → m#3 ทำให้
--   anti-self-redemption ประเมินได้แค่ funder==redeemer (exact). เพิ่ม device_fingerprint +
--   payment_instrument_hash (devices) + kyc_hash (users/merchants) ใน m#1 → redeem edge-fn (§3)
--   ประเมิน KYC/device/payment arm ของ A.8.12 ได้ "ที่ launch" (BoT e-money boundary).
--   ส่วน fraud-graph depth เต็ม (transitive cluster, scoring) ยัง defer → m#3 (ดู §2.7).

CREATE TABLE consents (                                    -- PDPA, append-only (ห้าม update เดิม)
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
  owner_id          uuid NOT NULL,                         -- polymorphic
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
-- Density-Gate "photos/place ≥ 5": COUNT(*) FILTER (owner_type='place') GROUP BY owner_id

CREATE TABLE deals (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id    uuid NOT NULL REFERENCES places(id),
  merchant_id uuid NOT NULL REFERENCES merchants(id),
  city_id     uuid NOT NULL REFERENCES cities(id),
  title_i18n  jsonb NOT NULL, terms_i18n jsonb,
  deal_type   deal_type NOT NULL,
  value_minor bigint,                                      -- ถ้าเป็นมูลค่าเงิน = satang
  value_pct   numeric,                                     -- ถ้าเป็น percent_off (rate field, ไม่ใช่เงิน)
  starts_at   timestamptz, ends_at timestamptz,
  quota_total int, quota_used int NOT NULL DEFAULT 0,
  audience_filter jsonb,
  status      deal_status NOT NULL DEFAULT 'scheduled',
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_deals_place ON deals(place_id) WHERE status='active';
-- Density-Gate "active promotions ≥ 10": COUNT(*) WHERE status='active' per district (join place)

CREATE TABLE reviews (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id          uuid NOT NULL REFERENCES places(id),
  merchant_id       uuid REFERENCES merchants(id),
  city_id           uuid NOT NULL REFERENCES cities(id),
  user_id           uuid NOT NULL REFERENCES users(id),
  rating            int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body_i18n         jsonb,
  original_locale   locale_code,
  linked_check_in_id uuid,                                 -- FK → check_ins (deferred-add; ดู §2.4)
  trust_weight      numeric NOT NULL DEFAULT 1,            -- derive จาก check_ins.trust_tier
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
  sponsor_id      uuid,                                    -- FK → sponsors (deferred-add; ดู §2.4)
  funding_escrow_wallet_id uuid,                           -- FK → escrow_wallets (deferred-add; ดู §2.4)
  reward_coin_minor bigint NOT NULL DEFAULT 0,             -- satang (1 COIN = 100 minor)
  reward_spark_amount int NOT NULL DEFAULT 0,
  min_steps_required int NOT NULL DEFAULT 1,
  starts_at       timestamptz, ends_at timestamptz,
  is_featured     boolean NOT NULL DEFAULT false,          -- launch featured-quest (นิมมาน)
  status          quest_status NOT NULL DEFAULT 'draft',
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_quests_city_dist ON quests(city_id, district_id) WHERE status='active';
-- Density-Gate "active quests ≥ 3 incl 1 featured": COUNT/bool_or(is_featured) WHERE status='active'

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
  geo_coarse    geography(POINT,4326),                     -- ephemeral; purge raw หลัง N วัน
  dwell_seconds int,
  device_id     uuid REFERENCES devices(id),
  risk_flags    text[],                                    -- impossible_travel|velocity_cap|...
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_checkins_user_dev ON check_ins(user_id, device_id, created_at);  -- impossible-travel
CREATE INDEX idx_checkins_place    ON check_ins(place_id);
-- (เพิ่ม FK reviews.linked_check_in_id → check_ins ที่นี่ — ดู §2.4 forward-ref list)

CREATE TABLE quest_progress (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id),
  quest_id        uuid NOT NULL REFERENCES quests(id),
  city_id         uuid NOT NULL REFERENCES cities(id),
  steps_completed jsonb NOT NULL DEFAULT '[]',             -- [{step_id, check_in_id}]
  status          qprogress_st NOT NULL DEFAULT 'in_progress',
  completed_at    timestamptz,
  reward_grant_id uuid,                                    -- FK → coin_grants (deferred-add; ดู §2.4)
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, quest_id)
);
CREATE INDEX idx_qprogress_user ON quest_progress(user_id);
-- passports = surface/view เหนือ quest_progress (ไม่ทำเป็น physical table ใน m#1 — §2.7)
-- EARN→GRANT bridge (mvp_loop minor): completed_at/reward_grant_id เป็น hook; writer = §3 (contract C5)
```

---

### 2.4 DOMAIN E — FULL LEDGER (DDL + constraints + append-only)

> นี่คือ **ฐานราก migration #1 ที่ต้องครบ 100% โดยไม่สนใจว่า MVP เดิน path ไหน** — CoA เต็ม, lock-anchor, sum-to-zero, **clearing-flat per txn**, append-only.

```sql
-- ── Chart of Accounts ──
CREATE TABLE accounts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_type  account_type NOT NULL,
  owner_type    acct_owner NOT NULL,
  owner_id      uuid,                                      -- null = platform singleton
  funder_key    text,                                     -- coin_backing เท่านั้น: 'merchant:<id>'|'sponsor:<id>'|'sponsor:platform_goodwill'
  psp_key       text,                                     -- psp_suspense/psp_fee_expense: 'omise'|'2c2p'|'fiuu'|'promptpay'|'alipay'|'wechat'
  currency      currency NOT NULL,                        -- 1 account = 1 currency (COIN xor THB)
  normal_balance ledger_dir NOT NULL,
  city_id       uuid NOT NULL REFERENCES cities(id),
  status        acct_status NOT NULL DEFAULT 'active',
  created_at    timestamptz NOT NULL DEFAULT now()
);
-- unique account identity ต่อ owner/funder/psp/currency/city (NULLS NOT DISTINCT = PG15+)
CREATE UNIQUE INDEX uq_accounts ON accounts
  (account_type, owner_id, funder_key, psp_key, currency, city_id) NULLS NOT DISTINCT;

-- ── Transactions (1 business event = 1 row, group ของ legs) ──
CREATE TABLE ledger_transactions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  txn_type        txn_type NOT NULL,
  idempotency_key text NOT NULL UNIQUE,                    -- A.8.8 กัน replay
  request_hash    text NOT NULL,                           -- ผูก payload; key ชน+payload ต่าง → 409
  city_id         uuid NOT NULL REFERENCES cities(id),
  funded_by       text,                                    -- 'merchant:<id>'|'sponsor:<id>'|'platform'
  ref_type        ledger_ref_type,
  ref_id          uuid,
  reverses_txn_id uuid REFERENCES ledger_transactions(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid                                     -- actor (server-side only)
);
-- A.2: REDEEM/PREFUND ถูกกลับได้ไม่เกินหนึ่งครั้งต่อชนิด (กัน double-refund/coin-farming)
ALTER TABLE ledger_transactions ADD CONSTRAINT one_reversal_per_target
  EXCLUDE (reverses_txn_id WITH =, txn_type WITH =) WHERE (reverses_txn_id IS NOT NULL);
CREATE INDEX idx_ltxn_ref ON ledger_transactions(ref_type, ref_id);

-- ── Entries (APPEND-ONLY) ──
CREATE TABLE ledger_entries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seq          bigserial UNIQUE,                           -- monotonic write-order ทั้งระบบ (replay/snapshot pin)
  txn_id       uuid NOT NULL REFERENCES ledger_transactions(id),
  account_id   uuid NOT NULL REFERENCES accounts(id),
  direction    ledger_dir NOT NULL,
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),   -- > 0 เสมอ; ทิศทางบอกด้วย direction
  currency     currency NOT NULL,                          -- ต้องตรง accounts.currency (trigger)
  funded_by    text NOT NULL,                              -- denormalize ลงทุก leg (partition coin_backing)
  lot_id       uuid REFERENCES coin_lots(id),              -- บังคับทุก leg ที่แตะ user_coin/coin_backing
  expires_at   timestamptz,
  city_id      uuid NOT NULL REFERENCES cities(id),
  memo_i18n    jsonb,
  posted_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lot_legs_have_expiry CHECK (lot_id IS NULL OR expires_at IS NOT NULL)
);
CREATE INDEX idx_entries_txn     ON ledger_entries(txn_id);
CREATE INDEX idx_entries_account ON ledger_entries(account_id, posted_at);
CREATE INDEX idx_entries_lot     ON ledger_entries(lot_id) WHERE lot_id IS NOT NULL;

-- Append-only enforcement (A.8.9)
REVOKE UPDATE, DELETE ON ledger_entries, ledger_transactions FROM PUBLIC;
CREATE FUNCTION ledger_block_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'ledger is append-only (post a reversal instead)'; END $$;
CREATE TRIGGER trg_entries_immutable  BEFORE UPDATE OR DELETE ON ledger_entries
  FOR EACH ROW EXECUTE FUNCTION ledger_block_mutation();
CREATE TRIGGER trg_ltxn_immutable     BEFORE UPDATE OR DELETE ON ledger_transactions
  FOR EACH ROW EXECUTE FUNCTION ledger_block_mutation();

-- ════════ Per-txn balance invariants — DEFERRED CONSTRAINT TRIGGERS (fire ที่ COMMIT) ════════
-- (A.8.1) sum-to-zero ต่อสกุล + (A.8.1b) clearing กลับ 0 ต่อ txn = สอง invariant แยกกัน ⭐
--   ★ A.8.1b ต้อง implement เป็น branch จริง — ไม่ใช่ comment placeholder. per-currency sum-to-zero
--     PASS ได้แม้ clearing ค้างยอดไม่เป็น 0 (clearing net กับ THB account อื่น) → txn ที่ทิ้ง clearing
--     ข้างเดียว (เช่น forbidden 'Dr clearing / Cr platform_expense' ของ AGENT_CLAWBACK draft) จะหลุด
--     ถ้าไม่มี clearing-flat → S6 จับไม่ได้ → ควร global FROZEN แต่กลับเงียบ. ต้อง join accounts เพื่อ
--     resolve account_type='clearing'.
CREATE FUNCTION ledger_assert_txn_balanced() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE imbalance bigint;
BEGIN
  -- A.8.1: ∀currency: SUM(DR)=SUM(CR) ต่อ txn
  SELECT count(*) INTO imbalance FROM (
    SELECT e.currency,
           SUM(CASE WHEN e.direction='DR' THEN e.amount_minor ELSE -e.amount_minor END) AS net
    FROM ledger_entries e
    WHERE e.txn_id = NEW.txn_id
    GROUP BY e.currency
    HAVING SUM(CASE WHEN e.direction='DR' THEN e.amount_minor ELSE -e.amount_minor END) <> 0
  ) bad;
  IF imbalance > 0 THEN
    RAISE EXCEPTION 'A.8.1 violated: txn % not sum-to-zero per currency', NEW.txn_id;
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER trg_txn_balanced AFTER INSERT ON ledger_entries
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ledger_assert_txn_balanced();

-- A.8.1b clearing-flat: SUM(DR clearing)=SUM(CR clearing) ต่อ txn (join accounts → account_type)
CREATE FUNCTION ledger_assert_clearing_flat() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE net bigint;
BEGIN
  SELECT COALESCE(SUM(CASE WHEN e.direction='DR' THEN e.amount_minor ELSE -e.amount_minor END),0)
    INTO net
  FROM ledger_entries e JOIN accounts a ON a.id = e.account_id
  WHERE e.txn_id = NEW.txn_id AND a.account_type = 'clearing';
  IF net <> 0 THEN
    RAISE EXCEPTION 'A.8.1b violated: clearing not flat-to-zero in txn % (net=%)', NEW.txn_id, net;
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER trg_clearing_flat AFTER INSERT ON ledger_entries
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ledger_assert_clearing_flat();
-- acceptance test (บังคับใน CI, §3.5): post txn ที่ clearing ค้างยอด → ต้อง ROLLBACK ด้วย A.8.1b.

-- ── coin_lots: lock-anchor / read-cache (A.5.1) ──
CREATE TABLE coin_lots (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),  -- = lot_id ที่อ้างในทุก leg
  user_account_id uuid NOT NULL REFERENCES accounts(id),       -- user_coin account
  user_id         uuid NOT NULL REFERENCES users(id),
  grant_txn_id    uuid NOT NULL REFERENCES ledger_transactions(id),
  funder_key      text NOT NULL,                            -- 'merchant:<id>'|'sponsor:<id>'|'sponsor:platform_goodwill'
  granted_minor   bigint NOT NULL CHECK (granted_minor > 0),  -- immutable
  remaining_minor bigint NOT NULL CHECK (remaining_minor >= 0), -- mutable cache = SUM ledger ของ lot
  expires_at      timestamptz NOT NULL,
  state           lot_state NOT NULL DEFAULT 'active',
  city_id         uuid NOT NULL REFERENCES cities(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);
-- FIFO unexpired burn: REDEEM/EXPIRE/REFUND ทำ SELECT … FOR UPDATE บนแถวนี้ก่อน insert legs
CREATE INDEX idx_coinlots_fifo ON coin_lots(user_id, expires_at)
  WHERE state='active';
-- ★ wallet read-model (mvp_loop minor): client อ่าน Coin balance/expiry-timeline จาก coin_lots
--   (remaining_minor, expires_at, state) — เป็น "ตารางเงิน" เดียวที่มี customer SELECT policy (RLS §3.1).
--   ledger_entries ปิดต่อ client; Sparks อ่านจาก spark_balances. ไม่มี wallet path ที่ต้องอ่าน ledger ฝั่ง client.

-- ── Escrow read-model cache (A.9) — ยอดจริงมาจาก ledger ทุกค่า satang ──
CREATE TABLE escrow_wallets (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type               escrow_owner NOT NULL,
  owner_id                 uuid NOT NULL,                  -- merchant_id|sponsor_id
  account_id               uuid NOT NULL REFERENCES accounts(id),  -- merchant_escrow|sponsor_budget (THB)
  city_id                  uuid NOT NULL REFERENCES cities(id),
  total_cached             bigint NOT NULL DEFAULT 0,      -- = balance(escrow account)
  settled_total_cached     bigint NOT NULL DEFAULT 0,      -- ส่วนที่ landed ผ่าน PSP_SETTLE (A.8.11)
  locked_cached            bigint NOT NULL DEFAULT 0,
  available_cached         bigint NOT NULL DEFAULT 0,      -- total − locked
  settled_available_cached bigint NOT NULL DEFAULT 0,      -- ฐาน mint gating (Density-Gate criterion 6 อ่านที่นี่)
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
  state            text NOT NULL DEFAULT 'active',         -- active | released
  city_id          uuid NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);
-- ★ FUND_QUEST hook (mvp_loop major): escrow_locks(lock_reason='quest_pool', ref_id=quest_id) คือ
--   reservation ที่ grant edge-fn GATE 3 (A.8.7) decrement. row นี้สร้างโดย fund_quest edge-fn (§3,
--   contract C3) เท่านั้น — ห้าม client เขียน (RLS deny). schema มี hook ครบ; writer = §3.

-- ── Sparks — แยกจากเงิน-ledger (A.4) ──
CREATE TABLE spark_balances (
  user_id    uuid PRIMARY KEY REFERENCES users(id),
  city_id    uuid REFERENCES cities(id),
  balance    bigint NOT NULL DEFAULT 0,                    -- mutable integer ได้ (ไม่ใช่เงิน)
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE spark_events (                                -- append-only source of truth ของ Sparks
  id         bigserial PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES users(id),
  delta      bigint NOT NULL,                              -- +/- ได้ (ไม่ใช่เงิน)
  reason     spark_reason NOT NULL,
  ref_id     uuid,
  city_id    uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── Mint event record (A.9: เก็บแค่ coin_amount_minor + expires_at; ตัด thb_value_locked) ──
CREATE TABLE coin_grants (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid NOT NULL REFERENCES users(id),
  source_type              grant_source NOT NULL,
  source_id                uuid,                            -- quest_progress.id ฯลฯ
  funding_escrow_wallet_id uuid NOT NULL REFERENCES escrow_wallets(id),
  lot_id                   uuid REFERENCES coin_lots(id),
  coin_amount_minor        bigint NOT NULL CHECK (coin_amount_minor > 0),
  expires_at               timestamptz NOT NULL,
  ledger_txn_id            uuid NOT NULL REFERENCES ledger_transactions(id),
  city_id                  uuid NOT NULL REFERENCES cities(id),
  created_at               timestamptz NOT NULL DEFAULT now()
);

-- ── Redemption (merchant-initiated, server-burn) ──
CREATE TABLE redemptions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES users(id),
  place_id           uuid REFERENCES places(id),
  merchant_id        uuid NOT NULL REFERENCES merchants(id),
  city_id            uuid NOT NULL REFERENCES cities(id),
  deal_or_quest_ref  uuid,
  coin_amount_burned bigint NOT NULL CHECK (coin_amount_burned > 0),  -- coin-minor
  thb_settlement     bigint NOT NULL,                       -- satang หักจาก escrow (= cogs measurement basis A2.4)
  take_rate_pct      numeric,                               -- effective (เก็บ stored, reversal ไม่ recompute)
  take_rate_minor    bigint NOT NULL DEFAULT 0,             -- satang → platform_revenue
  initiation         redeem_init NOT NULL,                  -- merchant_qr|merchant_otp (ห้าม static)
  qr_nonce           text,                                  -- rotating, ใช้ครั้งเดียว (counter-scan generator = §3)
  valid_until        timestamptz,                           -- time-boxed (~90s)
  geofence_ok        boolean,
  linked_check_in_id uuid REFERENCES check_ins(id),
  ledger_txn_id      uuid REFERENCES ledger_transactions(id),
  review_status      text,                                  -- B.2.3 collusion flag
  status             redemption_st NOT NULL DEFAULT 'pending',
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_redemptions_nonce ON redemptions(qr_nonce) WHERE qr_nonce IS NOT NULL;
CREATE INDEX idx_redemptions_merchant ON redemptions(merchant_id, created_at);
-- ★ counter-scan hook (mvp_loop missing): qr_nonce/valid_until เป็น hook ของ rotating-QR/OTP generator.
--   redeem GATE 0 (§3) สมมติว่า nonce ถูกสร้างแล้วก่อนลูกค้าสแกน → writer ของ nonce row = merchant-side
--   issue edge-fn (§3, contract C6). schema พร้อม; logic = §3.
```

#### 2.4.1 FK forward-references ที่ต้อง resolve ในไฟล์ migration เดียว (full set) ⭐

> migration #1 เป็นไฟล์เดียว execute top-to-bottom — inline `REFERENCES` ที่ชี้ตารางที่ยัง **ไม่เกิด** จะ fail (`relation does not exist`). ดราฟต์เดิม call out แค่ 2 ตัว (`escrow_wallet_id`/`subscription_id`); แท้จริงมี **ครบชุดด้านล่าง** ที่ต้องเป็น trailing `ALTER TABLE … ADD CONSTRAINT … FOREIGN KEY` (สร้างหลังตารางปลายทางครบทั้งหมด). ห้ามทิ้ง inline ที่ชี้ forward.

| ตาราง.คอลัมน์ | → ปลายทาง | เหตุผล (forward/backward) |
|---|---|---|
| `merchants.owner_user_id` | `users(id)` | users (Domain B) เกิดหลัง merchants (Domain A) |
| `merchants.onboarded_by_agent_id` | `agents(id)` | agents (Domain G) เกิดหลังสุด |
| `merchants.escrow_wallet_id` | `escrow_wallets(id)` | escrow_wallets (Domain E) เกิดหลัง; circular กับ escrow_wallets.owner_id |
| `merchants.subscription_id` | `subscriptions(id)` | subscriptions (Domain F) เกิดหลัง |
| `data_freshness.last_verified_by_agent_id` | `agents(id)` | agents เกิดหลังสุด |
| `reviews.linked_check_in_id` | `check_ins(id)` | check_ins เกิดหลัง reviews (ใน Domain D) |
| `quests.sponsor_id` | `sponsors(id)` | sponsors (Domain F) เกิดหลัง quests (Domain D) |
| `quests.funding_escrow_wallet_id` | `escrow_wallets(id)` | escrow_wallets (Domain E) เกิดหลัง quests |
| `quest_progress.reward_grant_id` | `coin_grants(id)` | coin_grants (Domain E) เกิดหลัง quest_progress |
| `tasks.change_proposal_id` | `change_proposals(id)` | change_proposals (Domain H) เกิดหลัง tasks (Domain G) |

> ทางเลือก: จะ **เรียงลำดับ create** ให้ referenced precede referencer ก็ได้ แต่มี cycle จริง (`merchants ↔ escrow_wallets ↔ subscriptions`, `quests ↔ escrow_wallets`) → trailing-ALTER เป็นวิธีเดียวที่ปิดทุก cycle. แนะนำ trailing-ALTER ทั้งชุดเพื่อความสม่ำเสมอ.

> **edge-fn contract map (§2 → §3 — schema ตั้ง hook, §3 เป็น writer):**
> - **C3 `fund_quest`/`join_quest`** — FOR UPDATE escrow_wallets; ASSERT `settled_available ≥ pool`; INSERT `escrow_locks(quest_pool)`; POST `FUND_QUEST`; set `quests.status='active'`. (grant GATE 3 decrement reservation นี้)
> - **C4 `apply_proposal`/`moderate_proposal`** — writer เดียวของ live moat data: flip `change_proposals.status='approved'` (enforce reviewer≠proposer ซ้ำ defense-in-depth กับ `proposal_sod` CHECK), copy diff → `places`, bump `places.version`, close old `places_history.valid_to` + insert new snapshot (`change_proposal_id`), update `data_freshness.last_verified_*`, set `tasks.status='approved'`.
> - **C5 quest-completion evaluator** — last qualifying check_in → ถ้าครบ `min_steps_required` set `quest_progress.status='completed'` + เรียก mint → set `reward_grant_id`.
> - **C6 counter-scan issuer** — merchant-side สร้าง `redemptions.qr_nonce`/`valid_until` ก่อนลูกค้าสแกน.
> ทุก writer ข้างบนเป็น service_role edge-fn ใน §3 (client เขียนตรงไม่ได้ — RLS deny). §2 รับประกันว่า column/constraint/lock-anchor พร้อม.

---

### 2.5 DOMAIN F–H + Subsystem tables (DDL ย่อ)

```sql
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
  is_chain           boolean NOT NULL DEFAULT false,       -- multi-location add-on (แทน tier chain)
  location_count     int NOT NULL DEFAULT 1,
  sold_by_agent_id   uuid REFERENCES agents(id),           -- commission track
  status             sub_status NOT NULL DEFAULT 'trial',
  current_period_end timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_subs_merchant ON subscriptions(merchant_id);

CREATE TABLE platform_config (                             -- kv ปรับ take-rate/cap/cogs โดยไม่ migrate (B.2/A2.4)
  key            text PRIMARY KEY,                         -- TAKE_RATE_PCT, REWARD_PER_REDEMPTION_CAP_THB,
                                                           --   MERCHANT_MONTHLY_COGS_CAP_THB, PRO_TIER_ENABLED,
                                                           --   flags: cogs_cap_unset / goodwill_pending ...
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
  payout_account_enc bytea,                                -- encrypted
  quality_score numeric NOT NULL DEFAULT 1,                -- approval rate ของ change_proposals
  merchant_quality_score numeric,                          -- B.3.1 paid-retention ของร้านที่เซ็น
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
  reward_thb_minor   bigint NOT NULL DEFAULT 0,            -- satang
  reward_spark       int NOT NULL DEFAULT 0,
  clawback_status    text,                                 -- B.3.1 90-day clawback window
  change_proposal_id uuid,                                 -- FK → change_proposals (trailing-add; ดู §2.4.1)
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- change_proposals: agent/merchant ห้ามเขียน live; ทุกแก้ผ่านที่นี่ ⭐ (writer ของ "live" = apply_proposal §3/C4)
CREATE TABLE change_proposals (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type        proposal_target NOT NULL,
  target_id          uuid,                                 -- null = สร้างใหม่
  merchant_id        uuid REFERENCES merchants(id),
  city_id            uuid NOT NULL REFERENCES cities(id),
  proposed_by        uuid NOT NULL REFERENCES users(id),
  proposer_role      app_role NOT NULL,
  diff               jsonb NOT NULL,                       -- before → after
  evidence_media_ids uuid[],
  evidence_geo       geography(POINT,4326),
  status             proposal_status NOT NULL DEFAULT 'pending',
  reviewed_by        uuid REFERENCES users(id),            -- Content Moderator
  applied_version    int,                                  -- → places_history
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT proposal_sod CHECK (reviewed_by IS NULL OR reviewed_by <> proposed_by)  -- SoD
);
CREATE INDEX idx_proposals_status ON change_proposals(status, city_id);

-- ════════ H. GOVERNANCE ════════
CREATE TABLE audit_log (                                   -- append-only + hash chain (S6)
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

-- ════════ SUBSYSTEM — S1 Support ════════
CREATE TABLE dispute_verdicts (                            -- shared object S1↔S5 (review-extortion fix)
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  linked_redemption_id uuid REFERENCES redemptions(id),
  verdict          text NOT NULL,                          -- merchant_at_fault|false_claim|inconclusive|merchant_delivered
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
  linked_report_id     uuid,                               -- → content_reports (S5)
  linked_entity_type   text, linked_entity_id uuid,
  status        ticket_status NOT NULL DEFAULT 'new',
  priority      text, sla_due_at timestamptz, resolve_due_at timestamptz,
  assigned_to   uuid, fraud_score numeric DEFAULT 0,
  resolution_type text, verdict_id uuid REFERENCES dispute_verdicts(id),
  resolution_ledger_txn_id uuid REFERENCES ledger_transactions(id),  -- ทุกชดเชยมี txn จริง
  pii_unmasked  boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), resolved_at timestamptz, closed_at timestamptz
);
CREATE TABLE ticket_events (                               -- APPEND-ONLY timeline
  id bigserial PRIMARY KEY, ticket_id uuid NOT NULL REFERENCES support_tickets(id),
  actor_id uuid, actor_role text, event_type text, payload_jsonb jsonb,
  step_up_ref uuid, created_at timestamptz NOT NULL DEFAULT now()
);

-- ════════ SUBSYSTEM — S2 Notification (transactional outbox) ════════
CREATE TABLE notif_outbox (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type       text NOT NULL,                          -- redemption.receipt ...
  event_class      text NOT NULL,                          -- transactional|privileged|marketing
  audience_user_id uuid REFERENCES users(id),
  merchant_id      uuid, city_id uuid NOT NULL,
  entity_type      text, entity_id uuid,
  dedup_key        text,                                   -- 1 receipt/redemption
  payload          jsonb,
  dispatched_at    timestamptz,                            -- FOR UPDATE SKIP LOCKED pump
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dedup_key)
);
CREATE INDEX idx_notif_outbox_pending ON notif_outbox(created_at) WHERE dispatched_at IS NULL;

-- ════════ SUBSYSTEM — S4 Payout / Tax ════════
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
  solvency_check_id uuid REFERENCES reconciliation_runs(id),  -- A.8.2s ต้อง pass ก่อน approve
  payable_check_id  uuid REFERENCES reconciliation_runs(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sod_creator_ne_approver CHECK (approved_by IS NULL OR approved_by <> created_by),  -- SEAM-3 SoD
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
CREATE TABLE agent_wht_ledger (                            -- 50-ทวิ รายเดือน (ภงด.3)
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES agents(id),
  tax_period text NOT NULL,                                -- 'YYYY-MM'
  gross_minor bigint NOT NULL DEFAULT 0, clawback_offset_minor bigint NOT NULL DEFAULT 0,
  wht_base_minor bigint NOT NULL DEFAULT 0, wht_minor bigint NOT NULL DEFAULT 0,
  wht_trueup_minor bigint NOT NULL DEFAULT 0,
  fifty_tawi_no text, state text NOT NULL DEFAULT 'accrued',
  UNIQUE (agent_id, tax_period)
);

-- ════════ SUBSYSTEM — S5 Content Moderation ════════
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
  UNIQUE (target_type, target_id, reported_by)             -- กัน report ซ้ำ
);
CREATE TABLE moderation_actions (                          -- APPEND-ONLY (reversible ผ่าน prev_state)
  id bigserial PRIMARY KEY,
  report_id uuid REFERENCES content_reports(id),
  target_type text, target_id uuid, action text,
  actor_user_id uuid, actor_role text, reason_code text, reason_note_i18n jsonb,
  prev_state jsonb, city_id uuid, created_at timestamptz NOT NULL DEFAULT now()
);

-- ════════ SUBSYSTEM — S6 Fraud / Recon / Freeze ════════
CREATE TABLE reconciliation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid REFERENCES cities(id), run_date date,
  kind text NOT NULL,                                      -- daily_solvency|payable_coverage|psp_recon|cogs_budget_cap|...
  status text NOT NULL,                                    -- pass|break_detected|resolved
  ledger_high_seq bigint,                                  -- snapshot pin (S6.1.2)
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
  resolution_note text, city_id uuid NOT NULL
);
CREATE INDEX idx_fraud_cases_subject ON fraud_cases(subject_id, state);  -- erasure-gate query (S3)
CREATE TABLE platform_freeze_state (                       -- edge fn อ่านก่อนทุก money op
  scope_key      text PRIMARY KEY,                         -- 'global'|'city:CNX'|'merchant:123'|'identity-cluster:<id>'
  frozen_ops     text[] NOT NULL DEFAULT '{}',             -- ['GRANT','REDEEM','PAYOUT','PREFUND']
  freeze_event_id uuid, updated_at timestamptz NOT NULL DEFAULT now()
);
```

> **goodwill account (`platform_goodwill_budget`):** ค่า enum ถูก add ใน migration #1 (เพื่อกัน enum-migration ภายหลัง + ให้ S6 recon รู้จัก ไม่ flag foreign) แต่ **ยังไม่สร้างแถว account / ไม่เดิน mint path** จน founder + BoT/e-money legal sign-off ผ่าน — ระหว่างนี้ goodwill ใช้ partition `funder_key='sponsor:platform_goodwill'` บน `sponsor_budget` (A2.9). ติด flag `cogs_cap_unset`/`goodwill_pending` ใน `platform_config`. **goodwill↔identity-cluster edge (A2.9-#2)** ต้องนิยามก่อน enable goodwill at scale — ใช้ correlation surface (`devices.payment_instrument_hash`, `users/merchants.kyc_hash`) ที่ §2.3 ตั้งไว้ ให้ SEAM-1 step(2) จับ insider/collusion ได้ (visibility ≠ fraud-gate coverage).

---

### 2.6 i18n + Versioning Strategy (เลือก + เหตุผล)

**คำตัดสิน i18n = hybrid 2 ชั้น (ไม่เลือกอย่างเดียว):**

1. **Per-field `jsonb *_i18n`** สำหรับ content สั้น/ผูกแน่นกับ row (`places.name_i18n`, `deals.title_i18n`, `quests.title_i18n`, `districts.name_i18n`, ...). โครง `{"th":"...","en":"...","zh":"...","_src":"th","_mt":["zh"]}` (`_src`=ต้นฉบับ, `_mt`=machine-translated → moderator review).
   - **เหตุผลที่เลือก jsonb แทน translations table สำหรับ field พวกนี้:** อ่านครั้งเดียวได้ครบ 3 ภาษา **ไม่ต้อง join** (สำคัญกับ map/listing ที่ดึงหลายร้อย place/วินาที) + เขียน RLS ง่าย (i18n อยู่ใน row เดียวกับ tenancy key) + atomic กับ `places_history` versioning.
   - **Density-Gate trilingual completeness (criterion 4):** วัดจาก key TH/EN ครบ + `_mt`-marker บน ZH (TH 100%/EN 100%/ZH≥80%) — เป็น jsonb-scan ไม่ใช่ indexed query; ยอมรับเป็น batch gate-check (รัน per-district ตอนตรวจ gate ไม่ใช่ hot path).
2. **ตาราง `translations(key, locale, text, namespace, is_machine, reviewed_by)` กลาง** สำหรับ UI strings + taxonomy labels + content ยาว/reused — แชร์ข้าม row, มี translation workflow แยก. **(DEFERRED → migration #2; MVP ใช้ jsonb + bundle ฝั่ง client ไปก่อน).**

**Fallback chain:** `user.primary_locale → city.default_locale → en`. Reviews (UGC) เก็บ `original_locale` + on-demand MT cache.

**Versioning:** `places` = full version (`places.version` + shadow `places_history` + `valid_from/valid_to`) เขียนทุกครั้งที่ `change_proposal` approve ผ่าน apply_proposal (§3/C4) (moat data + audit). `ledger_entries`/`audit_log`/`consents` = immutable append-only ("version" = reversal/แถวใหม่). UGC ทั่วไป (reviews body) = soft update + `updated_at` + moderation log. `deals` terms = snapshot ใน history เมื่อแก้ (DEFERRED `deals_history` → m#2).

---

### 2.7 ตารางที่ DEFER ไป migration ถัด ๆ ไป (ไม่อยู่ใน m#1)

> หลักการตัด: m#1 ตัด **operational depth** ไม่ตัด category breadth/multi-tenancy/full-ledger CoA. ทุกตัวด้านล่างมี enum/CoA hook พร้อมแล้ว — เพิ่มได้โดยไม่ต้องแก้ของเดิม.

| ตาราง | เหตุผลที่ defer | migration เป้าหมาย |
|---|---|---|
| `translations` (i18n table) | MVP ใช้ jsonb + client bundle พอ | #2 |
| `passports` (physical) | เป็น **view/surface** เหนือ `quest_progress` ใน m#1 | #2 (ถ้าต้อง denormalize) |
| `invoices` | billing detail; SUBSCRIPTION post `platform_revenue` ได้ก่อน | #2 |
| `affiliate_clicks` | เสา d (booking commission) ไม่อยู่ใน launch loop | #2 |
| `account_links`, `identity_graph` (depth) | auth-link audit + **fraud-graph depth เต็ม** (transitive cluster, scoring, re-score). **MVP มี correlation surface ขั้นต่ำพอประเมิน A.8.12 ที่ launch แล้ว** (`devices.device_fingerprint` + `payment_instrument_hash`, `users/merchants.kyc_hash`) — ดูหมายเหตุ A.8.12 ด้านล่าง | #3 (anti-fraud depth) |
| `notif_templates`, `notif_preferences`, `notif_deliveries` | m#1 มีแค่ `notif_outbox` (transactional receipts); template/consent depth ตามทีหลัง | #2 |
| `ticket_evidence` (`dispute_verdicts`/`ticket_events` ใส่แล้ว) | evidence dedup เป็น depth | #2 |
| `tax_invoices`, `wht_credit_received`(table), `payout_breaks`, `psp_settlement_lines`, `bank_statement_lines`, `recon_check_results`, `freeze_events`, `fraud_signals` | tax/recon **machinery** ครบ-เต็มเป็น S4/S6 depth; m#1 มี `payout_batches/items`, `agent_wht_ledger`, `reconciliation_runs`, `fraud_cases`, `platform_freeze_state` พอเริ่ม | #3 (finance/fraud depth) |
| `data_processing_records` (RoPA) | compliance doc; ไม่ block runtime | #2 |
| `escrow_locks` reservation pump, `places.opening_hours` exceptions detail | depth | #2 |

> **★ A.8.12 anti-self-redemption — ขอบเขตที่ launch (อ่านคู่ §1.5 #3):** §1.5 #3 ประกาศ A.8.12 เป็น first-class control ที่ launch. ด้วย correlation surface ขั้นต่ำใน m#1 (`devices.device_fingerprint`, `devices.payment_instrument_hash`, `users.kyc_hash`/`merchants.kyc_hash`, `merchants.owner_user_id`) redeem edge-fn (§3) ประเมินได้ **3 arm ที่ launch**: (a) `redeeming_merchant == funder` (exact), (b) device-fingerprint overlap ระหว่าง redeemer กับ funder-merchant.owner_user_id, (c) payment-instrument / KYC-hash overlap. ส่วนที่ยัง defer → m#3 คือ **fraud-graph depth** (transitive multi-hop cluster, weighted scoring, SEAM-4 identity-graph re-score). **เงื่อนไข goodwill-at-scale:** ก่อน enable goodwill mint ในวงกว้าง ต้อง wire goodwill↔identity-cluster edge (A2.9-#2) เข้า fraud-graph depth ของ m#3 — จนกว่านั้นจำกัด goodwill volume ผ่าน `GOODWILL_USER_CAP`/per-city ceiling ใน `platform_config`.

> **สำคัญ (lockstep):** แม้ defer ตาราง tax/recon depth — **CoA enums (`vat_*`, `wht_*`, `payout_suspense`, `escheatment_liability`, `platform_expense`, `agent_reserve`) + txn_type (`WHT_REMIT`/`VAT_REMIT`/`AGENT_PAYOUT`/...) ต้องอยู่ครบใน m#1** ตาม lockstep rule (A2.7): ห้าม ratify account โดยไม่เข้า S6 enumeration พร้อมกัน, และ recon ห้าม flag เป็น foreign account.

---

### 2.8 Build readiness — สิ่งที่ §2 ส่งมอบ vs สิ่งที่ §3 ต้อง wire (เพื่อให้ MVP loop ปิด)

> §2 (schema) build-ready แล้ว แต่ **MVP loop จะปิดได้ต่อเมื่อ §3 wire edge-fn ตาม contract C3–C6**. ตารางนี้ทำให้ seam ชัด ไม่ implied — กัน "ตารางครบแต่ไม่มี writer".

| MVP loop edge | schema hook (§2 มีครบ) | writer ที่ §3 ต้อง wire | สถานะ |
|---|---|---|---|
| Merchant join/fund quest | `escrow_locks(quest_pool)`, `txn_type=FUND_QUEST`, `quests.funding_escrow_wallet_id` | **C3 `fund_quest`** | hook พร้อม; edge-fn = §3 |
| Agent proposal → live | `change_proposals`+`proposal_sod`, `places.version`, `places_history`, `data_freshness`, `tasks` | **C4 `apply_proposal`** | hook พร้อม; edge-fn = §3 |
| Merchant claim/verify | `merchants.trust_state`+`trust_points`, `merchant_proofs`, `merchant_users` | trust-state transition (agent task pipeline `activate_real`/`activate_escrow` + finance review) | **schema fix แล้วใน m#1**; transition = §3 |
| Consumer complete-quest → mint | `quest_progress.completed_at`/`reward_grant_id`, `coin_grants`, `coin_lots` | **C5 completion evaluator → grant** | hook พร้อม; edge-fn = §3 |
| Consumer wallet render | `coin_lots`(customer SELECT), `spark_balances` | client read (ไม่แตะ ledger) | **ปิดได้ด้วย schema เดียว** |
| Density-Gate measurement | `districts.coverage_baseline`, `media`, `places` NOT NULL, `escrow_wallets.settled_*`, `quests`, `deals` | gate query per district | **7/7 criteria measurable** หลังเพิ่ม baseline |
| Redeem (counter) | `redemptions.qr_nonce`/`valid_until`, `redeem_init`, `coin_lots` FIFO | **C6 nonce issuer** + redeem | hook พร้อม; edge-fn = §3 |

---

## 3. RLS, DB-enforced Invariants & Edge Functions

> **ขอบเขตของหัวข้อนี้:** ชั้นบังคับใช้ (enforcement layer) ที่นั่งระหว่าง data model (migration #1) กับ application code — แบ่งเป็น 3 ระนาบที่ต้องไม่ทับซ้อนกัน: **RLS** (กั้น *ใครอ่าน/เขียนแถวไหน*), **DB constraints/triggers** (บังคับ *invariant ที่ผิดไม่ได้แม้แต่ครั้งเดียว* — append-only, sum-to-zero, clearing-flat, lot non-negative), และ **Edge Functions** (เจ้าของ *value-moving path* ที่ server-authoritative ทั้งหมด — mint/burn/payout/fund-quest/moderation-apply). หลักเหล็ก: **Flutter/Next.js เป็น UX-only; ไม่มี client ตัวใด INSERT เข้า `ledger_entries`/`escrow_*`/live moat data ได้โดยตรง** — money path + live-data write เดินผ่าน Edge Function ที่ใช้ `service_role` เท่านั้น และ RLS ก็ตั้ง deny-by-default บนตารางการเงินอยู่แล้ว
>
> **ขอบเขตที่เป็นของ §2 (data model) ไม่ใช่ §3:** ลำดับสร้างตาราง + FK forward-reference (เช่น `merchants.owner_user_id→users`, `onboarded_by_agent_id→agents`, `quests.sponsor_id`/`funding_escrow_wallet_id`, `reviews.linked_check_in_id→check_ins`, `quest_progress.reward_grant_id→coin_grants`, `tasks.change_proposal_id→change_proposals` นอกเหนือจาก `escrow_wallet_id`/`subscription_id` ที่ §2.4 เรียกไว้แล้ว 2 ตัว), การมี column `is_visible`/`merchant_trust_state`/coverage-baseline — ทั้งหมดเป็นของ §2. §3 เพียง **อ้างอิงและ enable RLS** บนตารางเหล่านั้น ตรงไหนที่ §3 พึ่ง column/ordering ของ §2 จะ flag ไว้ explicit เพื่อให้สอง section ปิด gap พร้อมกัน (lockstep). คำตัดสินที่ §3 บังคับเพื่อไม่ให้ตัวเองพังคือ: **policy/edge-fn ห้ามอ้าง column ที่ §2 ยังไม่มี** — เห็นได้ใน policy (4) ด้านล่างที่ตัด `is_visible` ทิ้ง.

---

### 3.1 RLS Approach — Scope-in-Token (ไม่มี recursive table lookup)

**ปัญหารากที่ต้องเลี่ยง:** ถ้า RLS policy ของทุกตารางต้อง `SELECT … FROM user_roles JOIN territories …` เพื่อรู้สิทธิ์ → เกิด **recursive RLS** (policy เรียก table ที่เองมี policy), ช้า, และเสี่ยง infinite recursion. **คำตัดสิน canonical (อ้าง §S3.2): scope เดินทางมากับ JWT** — RLS อ่านจาก `auth.jwt()` (in-memory, ไม่ query table) เท่านั้น.

#### (ก) Custom JWT claims ที่ RLS อ่าน

Claim ถูกเซ็ตโดย **Custom Access Token Auth Hook** ตอน mint token. ทุก scope-claim เป็น **array** เพื่อรองรับ user ที่ถือหลาย role / หลาย entity (เช่น เจ้าของ 2 ร้านใน Nimman + เป็น Customer ด้วย):

```jsonc
{
  "sub": "550e8400-e29b-41d4-a716-446655440789",  // = auth.uid() — identity เดียวทั้งระบบ (§S3.0), UUID
  "is_anonymous": false,
  "aal": "aal1",                          // aal1 | aal2 (step-up) — gate high-impact action
  "app_metadata": {
    "roles":           ["Customer","Merchant"],   // role[] — flatten จาก role_assignments (12 canonical roles §4)
    "scope_city_ids":  ["8c1f…cnx-uuid"],          // city PK (UUID) ที่ subject มีสิทธิ์ (เชียงใหม่)
    "merchant_ids":    ["a3d9…m123-uuid"],         // entity scope: ร้านที่เป็นเจ้าของ/พนักงาน (merchants.id UUID)
    "territory_ids":   ["f70b…nimman-uuid"],       // district scope ของ Field Agent (districts.id UUID)
    "claims_ver":      42                          // bump เมื่อ scope เปลี่ยน (revoke gate)
  }
}
```

> **★ FIX (review minor — uuid-cast vs slug):** ดราฟต์เดิมใส่ slug มนุษย์อ่าน (`"cnx"`/`"m_123"`/`"nimman"`) ใน scope-claim แต่ helper cast เป็น `uuid[]` และ policy เทียบกับ column UUID (`cities.id`/`merchants.id`/`districts.id` เป็น UUID PK ทั้งหมด) → `'cnx'::uuid` raise **invalid input syntax for type uuid** ตอน runtime → **ทุก scoped policy พัง** (merchant/agent อ่านอะไรไม่ได้เลย). **คำตัดสิน:** Custom Access Token hook **emit ค่า UUID PK** ลง `scope_city_ids`/`merchant_ids`/`territory_ids` (ไม่ใช่ slug) — slug มนุษย์อ่าน (`cnx`, `nimman`) อยู่ที่ระดับ display เท่านั้น ไม่เข้า JWT. helper คง `::uuid[]` ไว้. (ถ้าภายหลัง founder ยืนกรานให้ JWT ถือ slug → ต้องเปลี่ยน helper return type + ทุก column comparison เป็น `text` แล้ว resolve slug→uuid ที่ edge ก่อน mint token — เป็น genuine change ไม่ใช่ตอนนี้.)

**Helper functions (STABLE, ไม่ query table)** — ทุก policy เรียกผ่านตัวนี้:

```sql
create schema if not exists auth_scope;

create function auth_scope.merchant_ids() returns uuid[] language sql stable as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' -> 'merchant_ids')::jsonb, '[]'::jsonb
  )::text::uuid[];
$$;

create function auth_scope.territory_ids() returns uuid[] language sql stable as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' -> 'territory_ids')::jsonb, '[]'::jsonb
  )::text::uuid[];
$$;

create function auth_scope.city_ids() returns uuid[] language sql stable as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' -> 'scope_city_ids')::jsonb, '[]'::jsonb
  )::text::uuid[];
$$;

create function auth_scope.has_role(r text) returns boolean language sql stable as $$
  select r = any(
    coalesce((auth.jwt() -> 'app_metadata' -> 'roles')::jsonb, '[]'::jsonb)::text[]
  );
$$;
```

#### (ข) ตัวอย่าง RLS policy (4 ตัว — ครอบ pattern หลักทั้งหมด)

```sql
-- เปิด RLS ทุกตาราง (deny-by-default) — โดยเฉพาะตารางการเงินที่ห้าม client แตะ
alter table places          enable row level security;
alter table escrow_wallets  enable row level security;
alter table escrow_locks    enable row level security;  -- quest_pool/coin_backing reservation — service_role-only write
alter table coin_lots       enable row level security;
alter table tasks           enable row level security;
alter table change_proposals enable row level security;
alter table ledger_entries  enable row level security;  -- ไม่มี policy เลย → ปิดสนิทต่อ anon/authenticated
                                                          -- เขียนได้เฉพาะ service_role (bypass RLS) ใน Edge Fn

-- (1) MERCHANT เห็นเฉพาะ place + escrow ของร้านตัวเอง — อ่าน claim ล้วน ไม่ join
create policy merchant_owns_places on places for select
  using ( merchant_id = any(auth_scope.merchant_ids()) );

create policy merchant_owns_escrow on escrow_wallets for select
  using ( owner_type = 'merchant'
          and owner_id = any(auth_scope.merchant_ids()) );

-- (2) CUSTOMER เห็นเฉพาะ coin_lots ของตัวเอง (กระเป๋า Coin ส่วนตัว) — ผูกกับ auth.uid() ตรง ๆ
create policy customer_owns_lots on coin_lots for select
  using ( user_id = auth.uid() );
-- หมายเหตุ A: customer "เขียน" lot ไม่ได้ (ไม่มี INSERT/UPDATE policy) — mint เกิดใน Edge Fn เท่านั้น (SEAM-1)
-- หมายเหตุ B (review mvp-minor — wallet read-model): consumer wallet เรนเดอร์ยอด Coin + เส้น expiry จาก
--   coin_lots(remaining_minor, expires_at, state) — *ตารางการเงินตัวเดียวที่ client อ่านได้*; Sparks จาก
--   spark_balances. **ห้ามมี wallet path ใดอ่าน ledger_entries ฝั่ง client** (ledger ไม่มี customer SELECT
--   policy → ปิดสนิท). ยอด = SUM(coin_lots.remaining_minor) ของ lot ที่ state='active' AND expires_at>now().

-- (3) FIELD AGENT เห็น/รับงานเฉพาะใน territory ของตน (เช่น Nimman) — เป็น role + scope สองชั้น
create policy agent_reads_own_territory_tasks on tasks for select
  using ( auth_scope.has_role('Field Agent')
          and district_id = any(auth_scope.territory_ids()) );
-- Agent ห้ามเขียน live data — เขียนได้แค่ change_proposals (moderated):
create policy agent_proposes_in_territory on change_proposals for insert
  with check ( auth_scope.has_role('Field Agent')
               and district_id = any(auth_scope.territory_ids()) );
-- Agent อ่าน proposal ของตัวเอง; Moderator/City Manager อ่านได้ทั้ง queue ใน city scope:
create policy agent_reads_own_proposals on change_proposals for select
  using ( proposed_by = auth.uid()
          or ( (auth_scope.has_role('Content Moderator') or auth_scope.has_role('City Manager'))
               and city_id = any(auth_scope.city_ids()) ) );
-- *การ "apply" proposal เข้า live (places + places_history) ไม่มี policy ให้ client เลย* — เกิดใน
--  apply_proposal edge fn (service_role) เท่านั้น (ดู §3.3) → moderator ไม่มีประตู write live data ตรง

-- (4) PUBLIC อ่าน place ที่ published แล้วเท่านั้น (แผนที่ฝั่ง consumer) — รวม guest/anon
create policy public_reads_published_places on places for select
  to anon, authenticated
  using ( status = 'published' );
-- ★ FIX (review minor — is_visible): ดราฟต์เดิมมี `and is_visible = true` แต่ §2 places DDL ไม่มี column
--   `is_visible` → policy create ล้มเหลว → บนตาราง deny-by-default แปลว่า consumer map (guest/anon browse,
--   IN-MVP) คืน *0 published places*. คำตัดสิน: พับ visibility เข้า `status` (un-publish = status≠'published')
--   แล้ว gate ด้วย status='published' อย่างเดียว. ถ้า §2 เพิ่ม is_visible ภายหลังเพื่อ soft-hide แยกจาก
--   publish lifecycle → เพิ่ม column ที่ §2 *ก่อน* แล้วค่อยเติม clause กลับ (lockstep, ห้ามอ้าง column ผี).
```

> **กฎที่ห้ามฝ่าฝืนใน RLS:** (ก) **ห้าม subquery ที่ชี้กลับตารางที่มี RLS** — ใช้ claim เท่านั้น; (ข) ตารางการเงิน (`ledger_*`, `coin_lots` ฝั่ง write, `escrow_wallets`/`escrow_locks` ฝั่ง write) **ไม่มี INSERT/UPDATE policy เลย** → client เขียนตรงไม่ได้ มีแต่ `service_role` ใน Edge Fn ที่ bypass RLS ได้; (ค) policy หลายตัวบนตารางเดียว = OR กัน (เช่น place หนึ่ง merchant เห็นทั้ง draft+published ของตัวเอง, public เห็นเฉพาะ published); (ง) **policy ห้ามอ้าง column ที่ data model ยังไม่ประกาศ** — RLS table ที่ policy create fail = ปิดสนิท (deny-all) ซึ่งบน consumer-facing table = outage เงียบ.

#### (ค) Stale-claim / Revoke gate (สำคัญต่อ ledger/escrow)

JWT มีอายุ (เสนอ access TTL = 15 นาที) → "เพิ่มสิทธิ์" รอ TTL ได้, แต่ "ถอนสิทธิ์/ban/`OWNERSHIP_TRANSFER` ร้าน" ต้องมีผล **ทันที**:

| เหตุการณ์ | กลไก | latency |
|---|---|---|
| เพิ่ม merchant / ย้าย territory | trigger `UPDATE auth.users SET raw_app_meta_data` + bump `claims_ver` → claim ใหม่รอบ refresh | ≤ TTL (15 นาที) |
| ถอนสิทธิ์ / ban / เปลี่ยนเจ้าของร้าน | `auth.admin.signOut(uid, scope:'global')` (revoke refresh tokens) **+** ตาราง `min_claims_ver` (= `users.min_claims_ver` / `revoked_claims_ver` ตาม S3) ให้ Edge Fn เช็ค `jwt.claims_ver >= users.min_claims_ver` มิฉะนั้น 401 | ทันที |

> เหตุผลที่ revoke ต้องทันที: กัน window ที่ ex-owner ของร้านใน Nimman ยัง mutate escrow / สั่ง redeem ได้หลังโอนร้าน (`OWNERSHIP_TRANSFER`, §A.7).

---

### 3.2 DB-Level Invariants — CONSTRAINTS / TRIGGERS

ระดับนี้คือ invariant ที่ **ผิดไม่ได้แม้แต่ครั้งเดียว** จึงต้องอยู่ที่ DB ไม่ใช่ app layer (กัน bug/path ใหม่ bypass). อ้าง §A.2 / §A.8 / §A2.

#### (1) Append-only บน ledger (§A.8.9) — REVOKE + block trigger

```sql
-- ชั้นที่ 1: ถอนสิทธิ์ระดับ grant (กัน UPDATE/DELETE ทั้ง role ปกติ)
revoke update, delete on ledger_transactions, ledger_entries from public, authenticated, anon, service_role;

-- ชั้นที่ 2: block trigger (กันแม้แต่ owner/superuser path ที่หลุดมา)
create function ledger_block_mutation() returns trigger language plpgsql as $$
begin
  raise exception 'ledger is append-only (A.8.9): % forbidden on %', tg_op, tg_table_name
    using errcode = 'check_violation';
end; $$;

create trigger no_update_delete_entries
  before update or delete on ledger_entries
  for each row execute function ledger_block_mutation();
create trigger no_update_delete_txns
  before update or delete on ledger_transactions
  for each row execute function ledger_block_mutation();
```
> แก้รายการได้ทางเดียว = post `txn` กลับ (reversal) ที่ชี้ `reverses_txn_id`. `coin_lots.remaining_minor`/`state` แก้ได้ (เป็น cache mutable แถวเดียวที่อนุญาตในเส้นทางเงิน) แต่ถูกคุมด้วย non-negative trigger ใน (5).

#### (2) `amount_minor > 0` — CHECK (§A.2 line 122)

```sql
amount_minor bigint not null check (amount_minor > 0)   -- satang หรือ coin-minor; > 0 เสมอ
```
> เลือก `direction DR/CR + amount_minor>0` แทน signed amount เพราะ (ก) ตรงภาษาบัญชีไทย (ภพ.20, retention 5–10 ปี) (ข) CHECK เดียวกันบั๊กทั้งคลาส "ค่าติดลบ/ศูนย์โดยไม่ตั้งใจ". Leg ที่จะเป็น 0 (เช่น VAT branch ที่ output==input, A2.3.4(b); wht/vat_trueup delta=0) ต้อง **drop ทิ้งทั้ง leg** ไม่ใช่ post 0.

#### (3) Sum-to-zero ต่อ currency ต่อ txn (§A.8.1) — deferred constraint trigger

ต้อง **deferred** เพราะ leg แรกของ txn ทำให้ยอดไม่ balance ชั่วคราว ระหว่าง INSERT หลาย leg ใน txn เดียว — ตรวจ ณ `COMMIT` เท่านั้น:

```sql
create function ledger_assert_balanced() returns trigger language plpgsql as $$
declare bad record;
begin
  for bad in
    select e.txn_id, e.currency,
           sum(case when e.direction='DR' then e.amount_minor else 0 end) as dr,
           sum(case when e.direction='CR' then e.amount_minor else 0 end) as cr
    from ledger_entries e
    where e.txn_id = coalesce(new.txn_id, old.txn_id)
    group by e.txn_id, e.currency
    having sum(case when e.direction='DR' then e.amount_minor else 0 end)
         <> sum(case when e.direction='CR' then e.amount_minor else 0 end)
  loop
    raise exception 'txn % not balanced in % (DR=% CR=%) [A.8.1]',
      bad.txn_id, bad.currency, bad.dr, bad.cr using errcode='check_violation';
  end loop;
  return null;
end; $$;

create constraint trigger ledger_balanced_per_txn
  after insert on ledger_entries
  deferrable initially deferred
  for each row execute function ledger_assert_balanced();
```

#### (4) Clearing-nets-to-zero ต่อ txn (§A.8.1b) — **second deferred constraint trigger (DDL จริง — ปิด review major)**

> **★ FIX (review major — A.8.1b annotated-but-not-implemented):** ดราฟต์เดิมทิ้ง A.8.1b ไว้เป็น *prose placeholder comment* ("`-- ภายใน after-trigger เดียวกัน: เพิ่มเงื่อนไข … clearing legs only`") ไม่มี DDL. แต่ A.8.1b เป็น **first-class locked invariant แยกจาก sum-to-zero** (doc02 line 448, doc02b A2.7 line 412 = `BREAK → FROZEN`). ปัญหาคือ per-currency sum-to-zero ใน (3) **ผ่านอยู่แล้ว** เมื่อ clearing net กับ THB-account ตัวอื่น — ดังนั้น txn ที่ทิ้ง clearing ถือ THB ค้าง (เช่น ดราฟต์ `AGENT_CLAWBACK` ผิด `Dr clearing / Cr platform_expense` ข้างเดียว ที่ v1.1 A2.3.2/A2.8 บอกว่า **trip A.8.1b → global FROZEN**) จะ **ผ่าน trigger (3) เงียบ** = ความต่างระหว่าง *detect* กับ *miss* ของ SEAM-relevant break. ต้องมี trigger จริงที่ filter `account_type='clearing'`.

`clearing` ต้องเป็น transient จริง (ไม่ถือ balance ข้าม txn) → `Σ(clearing DR) = Σ(clearing CR)` ภายใน txn เดียว. ต้อง join `ledger_entries → accounts` เพื่อ resolve `account_type` (claim ไม่มีข้อมูลนี้):

```sql
create function ledger_assert_clearing_flat() returns trigger language plpgsql as $$
declare bad record;
begin
  for bad in
    select e.txn_id,
           sum(case when e.direction='DR' then e.amount_minor else 0 end) as dr,
           sum(case when e.direction='CR' then e.amount_minor else 0 end) as cr
    from ledger_entries e
    join accounts a on a.id = e.account_id
    where e.txn_id = coalesce(new.txn_id, old.txn_id)
      and a.account_type = 'clearing'            -- *เฉพาะ clearing legs* (แยกจาก coin_backing long-lived)
    group by e.txn_id
    having sum(case when e.direction='DR' then e.amount_minor else 0 end)
         <> sum(case when e.direction='CR' then e.amount_minor else 0 end)
  loop
    raise exception 'clearing not flat in txn % (DR=% CR=%) [A.8.1b] — transient account must net to 0 per txn',
      bad.txn_id, bad.dr, bad.cr using errcode='check_violation';
  end loop;
  return null;
end; $$;

create constraint trigger ledger_clearing_flat_per_txn
  after insert on ledger_entries
  deferrable initially deferred
  for each row execute function ledger_assert_clearing_flat();
```
> แยกชัดจาก `coin_backing` (long-lived per funder) — ตัวนั้น **ไม่** ต้อง net 0 ต่อ txn. trigger นี้กัน bug ที่เคยปน clearing เป็นทั้ง transient + long-lived และจับ single-sided `AGENT_CLAWBACK`/`MERCHANT_CLAWBACK` draft (A2.3.2/A2.3.5) ที่ลืมปิด clearing leg. **acceptance test (มีใน §3.5):** post txn ที่ clearing DR≠CR (เช่น `Dr clearing / Cr platform_expense` ข้างเดียว) → ต้อง rollback ที่ COMMIT.

#### (5) `coin_lots` non-negative + FOR UPDATE pattern (§A.8.3)

`balance(user_coin)=SUM(ledger)` บน append-only table **ล็อกด้วย FOR UPDATE ไม่ได้** (row lock บนแถวเดิมไม่กัน INSERT แถว burn ใหม่ → double-redeem race). คำตัดสิน: ทุก GRANT สร้างหนึ่งแถว `coin_lots` เป็น **lockable anchor**; ทุก burn/credit (REDEEM/EXPIRE/REFUND) ต้อง `SELECT … FROM coin_lots WHERE id=$lot FOR UPDATE` ก่อน insert legs:

```sql
remaining_minor bigint not null check (remaining_minor >= 0)   -- ไม่มีวันติดลบ

create function lot_assert_non_negative() returns trigger language plpgsql as $$
begin
  if new.remaining_minor < 0 then
    raise exception 'coin_lot % over-burned (remaining=%) [A.8.3]', new.id, new.remaining_minor
      using errcode='check_violation';
  end if;
  -- กัน cache drift: remaining_minor ต้อง = granted_minor − SUM(burn ของ lot นี้)
  return new;
end; $$;
create trigger lot_non_negative before update on coin_lots
  for each row execute function lot_assert_non_negative();
```
> Edge Fn ทั้งหมดรันที่ isolation **REPEATABLE READ** เป็นอย่างต่ำ และใช้ `FOR UPDATE` บน `coin_lots` row เป็น serialization point ของ wallet นั้น — REDEEM/EXPIRE/REFUND บน lot เดียวกัน serialize ผ่าน row lock จริง.

#### (6) Idempotency — UNIQUE + payload-bound (§A.8.8)

```sql
idempotency_key text not null unique,                 -- กัน replay/retry
request_hash     text not null                         -- hash(txn_type, accounts[], amount, ref_id, actor)
-- กฎ: key ชน แต่ payload (request_hash) ต่าง → 409 (ไม่คืน txn เดิม). EXPIRE key = hash(lot_id, expiry_run).
-- goodwill GRANT key = hash('GOODWILL', ticket_id) (A2.3.6); FUND_QUEST key = hash('FUND_QUEST', quest_id, funding_round).
```

#### (7) Single-currency-per-account + lot-leg expiry

```sql
-- ทุก leg ต้อง currency ตรงกับ accounts.currency (DB enforce, ไม่พึ่ง app) — A2.1 single-currency-per-account
create function leg_currency_matches_account() returns trigger language plpgsql as $$
declare acct_ccy currency;
begin
  select currency into acct_ccy from accounts where id = new.account_id;
  if acct_ccy <> new.currency then
    raise exception 'leg currency % <> account currency % (single-currency-per-account)',
      new.currency, acct_ccy using errcode='check_violation';
  end if;
  return new;
end; $$;
create trigger leg_currency_guard before insert on ledger_entries
  for each row execute function leg_currency_matches_account();

-- ทุก leg ที่อ้าง lot ต้องมี expires_at (credit + burn ต้องตรงกับ lot)
constraint lot_legs_have_expiry check (lot_id is null or expires_at is not null)
```

#### (8) อื่น ๆ ที่ migration #1 ต้องมี

- `one_reversal_per_target` — `EXCLUDE (reverses_txn_id WITH =, txn_type WITH =) WHERE (reverses_txn_id IS NOT NULL)` (กัน double-refund/double-clawback, A.8.13).
- `seq bigserial UNIQUE` บน `ledger_entries` — monotonic ทั้งระบบ (replay/rebuild ทุก materialized balance).
- `city_id NOT NULL` ทุกตารางการเงิน (multi-city ตั้งแต่วันแรก; Nimman = district ใน `cnx`). solvency recon รันต่อ `city_id` + ต่อ funder line.
- Status-gate: post เข้า account ที่ `status != active` (frozen/closed) อนุญาตเฉพาะ reversal/recovery txn.
- `payout_batches`: `CHECK (created_by <> approved_by)` (SoD ระดับ row — ดู SEAM-3).
- `merchant_escrow ≥ 0` (ห้าม escrow ติดลบ — ส่วนขาดไป `merchant_receivable`, A.8.4 / SEAM-2).

---

### 3.3 Edge Function Surface (server-authoritative) — ลำดับ GATE

ทุก value-moving path + ทุก live-data write เดินผ่าน Edge Function ที่ใช้ `service_role`, รันใน **Postgres transaction เดียว (atomic)**, isolation ≥ **REPEATABLE READ**, และ `FOR UPDATE` บน lot/escrow/budget/proposal row. **ไม่มี subsystem ใดมีประตูหลัง** — S1 (support) / S5 (moderation) ทำได้แค่ *เรียก* Edge Fn ไม่ post ledger / ไม่เขียน live data เอง (SEAM-1).

> **Money ops ทุกตัวต้องอ่าน `platform_freeze_state` ก่อนเริ่ม** (SEAM-2): paused → REJECT ก่อนแตะ row ใด ๆ. Money ops ที่จ่ายให้ merchant (redeem settle, payout) ต้องเช็ค merchant อยู่ใน **`FINANCE_VERIFIED`** (ดู `claim_verify` ด้านล่าง) มิฉะนั้น route เข้า hold.

#### `check_in` — PostGIS geofence + dwell + trust tier
> เป็น **non-money path** (เขียน `check_ins` + `spark_events`) แต่ผลลัพธ์ (`trust_tier`) ป้อน fraud-gate ของ redeem/review ทีหลัง — จึงต้อง server-authoritative.

```
GATE 1 · CONSENT     consents(purpose='location_checkin', granted=true)          มิฉะนั้น REJECT
GATE 2 · PROXIMITY   ST_DWithin(device.geom, place.geom, RADIUS=120m)            มิฉะนั้น tier=remote (no Spark)
GATE 3 · DWELL       ≥2 ping ใน radius ห่างกัน ≥90s (กัน drive-by / ไฟแดง)        → tier=gps_dwell
GATE 4 · TRUST TIER  resolve tier: remote < gps_dwell < verified_visit < proven_purchase
                     (proven_purchase ต้องผูก REDEEM/POS event)
GATE 5 · ANTI-SPOOF  accuracy ≤ threshold + velocity sanity (กัน GPS spoof)       fail → tier ค้างที่ remote + fraud signal
→ WRITE check_ins(trust_tier, place_id, user_id) ; INSERT spark_events(reason='checkin')
→ พิกัดดิบ DISCARD ทันที (เก็บแค่ boolean ผ่าน geofence — PDPA minimization §C.4(f))
→ GATE 6 · QUEST-COMPLETION EVAL (review mvp-minor — EARN→GRANT bridge ต้องมีชื่อ):
    ถ้า check-in นี้เป็น step ของ quest → UPDATE quest_progress (step++); ถ้าถึง min_steps_required
    → set quest_progress.status='completed' แล้ว **เรียก grant_coins (universal mint path) ใน atomic step
       ถัดไป** set reward_grant_id ← coin_grants. **check_in ไม่ mint เอง** (เป็น non-money) — มันแค่
       trigger grant_coins ซึ่งวิ่งผ่าน SEAM-1 gate ครบ. ทางเลือกเทียบเท่า: แยก `complete_quest` edge fn ที่
       check_in เรียกตอนจบ. *ห้ามปล่อยให้ handoff นี้ implicit* — มันคือ edge ที่สำคัญที่สุดของ consumer loop.
```

#### `fund_quest` (join_quest) — lock escrow → quest_pool reservation + FUND_QUEST  **(NEW — ปิด review major; IN-MVP)**
> **★ FIX (review major — fund_quest ขาดหายทั้ง edge-fn surface):** merchant loop step "join/fund quest" + grant GATE 3 ที่ "decrement quest_pool reservation (A.8.7)" **ทั้งคู่พึ่ง reservation ที่ไม่เคยถูกสร้าง** เพราะ RLS ปิด client write บน `escrow_locks`/`escrow_wallets`/ledger และ "ไม่มีประตูหลัง" → ไม่มี server path สร้าง `quest_pool` lock + post `FUND_QUEST`. ผลคือ grant GATE 3 จะ fail-closed (quest จ่ายไม่ได้เลย) หรือร้ายกว่า mint จาก unreserved balance (double-spend escrow ข้าม concurrent quest, ทำลาย A.8.7). **เป็น IN-MVP** เพราะ Feature Matrix B/C list quest "join" เป็น IN-MVP และ Nimman Cafe-Hop พึ่งมัน.

```
0 · PRECOND   ASSERT merchant ∈ FINANCE_VERIFIED (IDENTITY_VERIFIED พอสำหรับ top-up แต่ quest payout ต้อง redeem-capable)
              ASSERT freeze-state != paused
1 · LOCK      SELECT … FROM escrow_wallets WHERE id=$funder FOR UPDATE                  (serialization point)
2 · SOLVENCY  ASSERT settled_available_cached ≥ reward_pool_size                        (A.8.11 — settled cash เท่านั้น)
3 · RESERVE   INSERT escrow_locks(lock_reason='quest_pool', ref_id=quest_id, amount_minor=pool, state='active')
4 · POST      FUND_QUEST (atomic, sum-to-zero ต่อสกุล; เคลื่อน available → locked ของ merchant_escrow):
              idempotency_key = hash('FUND_QUEST', quest_id, funding_round)
              bump locked_cached / available_cached / settled_available_cached
5 · ACTIVATE  UPDATE quests.status='active' (ถ้าเงื่อนไขครบ)
→ ผล: grant_coins GATE 3 มี reservation จริงให้ decrement (atomic, ภายใต้ FOR UPDATE เดียวกันกับ pool)
```

#### `grant_coins` — COGS cap → fraud-gate → settled-solvency → mint + lot  **(SEAM-1 ORDER — บังคับ)**
> ลำดับ gate **ห้ามสลับ** เพราะ SEAM-1 ผูกกับมัน. ทุก mint path (organic quest GRANT, goodwill, D7 quest-comp, CS-initiated) route ผ่าน gate ชุดเดียวกัน ภายใต้ `FOR UPDATE` บน escrow/budget row เดียว.

```
0 · LOCK            SELECT … FROM escrow_wallets WHERE id=$funder FOR UPDATE   (serialization point)
1 · COGS CAP (A2.4) ASSERT reward_value ≤ REWARD_PER_REDEMPTION_CAP_THB
                    ASSERT Σ(REDEEM thb_settlement funder=merchant:X ใน month) + this_draw
                           ≤ MERCHANT_MONTHLY_COGS_CAP_THB[X,month]
                    (cap=null → fail-closed REJECT + flag cogs_cap_unset)        ← per-merchant accumulator ภายใต้ lock เดียวกัน
                    *required artifact (A2.4 residual):* organic grant/redeem ต้อง embed accumulator นี้จริง
                    ภายใต้ FOR UPDATE เดียวกัน — ไม่ใช่แค่ CS path; มิฉะนั้น cap = detect-after-drain ไม่ใช่ prevent
2 · FRAUD GATE      A.8.12 anti-self-redemption + A.8.13 Sybil cap (per-user/quest, per-device/campaign) + velocity
                    fail → REJECT + freeze funder/identity-cluster + เปิด fraud_case
                    *MVP scope (ดู redeem GATE 4):* exact funder==grantee + device-fingerprint overlap คำนวณได้ที่ m#1;
                    KYC/payment-cluster arm + goodwill↔identity edge = m#3 (identity_graph)
3 · SETTLED SOLVENCY ASSERT settled_available ≥ reward_cost                       (A.8.11: เฉพาะเงินที่ผ่าน PSP_SETTLE)
                    decrement quest_pool reservation (สร้างโดย fund_quest) ใน txn เดียว (A.8.7)  (atomic — กัน double-reserve)
4 · MINT + LOT      INSERT coin_lots(granted_minor, remaining_minor, expires_at, state='active')
                    POST GRANT (atomic, sum-to-zero ต่อสกุล):
                      Dr merchant_escrow(M)        N THB   (funded_by=merchant:X)
                      Cr coin_backing(funder=M)    N THB   (lot_id=L)
                      Dr user_coin(grantee)        N COIN  (lot_id=L, expires_at)
                      Cr coin_liability(platform)  N COIN  (lot_id=L)
```

#### `redeem` — merchant proof → geofence → FOR UPDATE lot → anti-self-redeem → burn → settle minus take-rate  **(SEAM-1 ORDER)**

```
0 · MERCHANT PROOF  ตรวจ merchant rotating-QR / one-time nonce / OTP (merchant_present proof, กัน remote redeem)
                    nonce นี้ออกโดย issue_redemption_nonce (ด้านล่าง) — GATE 0 *consume* nonce ที่มีอยู่แล้ว
1 · GEOFENCE        ST_DWithin(user.geom, redeeming_place.geom, RADIUS) + trust_tier ≥ verified_visit
2 · SELECT + LOCK   เลือก lots ของ user ที่ expires_at > now() เรียง FIFO ; SELECT … FOR UPDATE ทุก lot ที่จะแตะ
                    ถ้า unexpired balance < ยอด redeem → REJECT (ไม่ partial เกินมี)
3 · COGS CAP        (เหมือน grant — per-redemption + per-merchant monthly accumulator ภายใต้ lock เดียวกัน)
4 · ANTI-SELF (A.8.12)  ถ้า redeeming_merchant == funder(lot) หรือ user คลัสเตอร์เดียวกับ funder
                    → ห้ามสร้าง merchant_payable ; route → คืน funder (EXPIRE-like) หรือ manual review
5 · BURN FIFO       POST REDEEM ต่อ lot (lot-tagged, sum-to-zero ต่อสกุล):
                      Dr coin_liability   N COIN (lot_id=L)   / Cr user_coin  N COIN (lot_id=L)
                      Dr coin_backing(funder)  N THB (lot_id=L)
                      Cr platform_revenue  take THB  (take-rate, round-half-even residual)
                      Cr merchant_payable(R)  (N−take) THB    (ร้านที่ให้ของจริง — รอ payout)
6 · CACHE           UPDATE coin_lots.remaining_minor ; state='exhausted' ถ้า 0
                    (trigger ตรวจ remaining_minor ≥ 0)
```
> เหตุผลลำดับ: lock lot **ก่อน** anti-self (gate 2→4) เพื่อให้ EXPIRE-vs-REDEEM race contend lot lock เดียวกัน; COGS cap (3) ต้องอยู่ก่อน burn (5) เพราะมัน gate การ "สร้าง payable".
>
> **★ FIX (review major — A.8.12 cluster arm คำนวณไม่ได้ที่ MVP; downgrade claim):** canonical A.8.12 (doc02 line 460) ต้อง route เมื่อ redeemer ผูก **KYC/device/payment** เดียวกับ funder — ไม่ใช่แค่ exact funder==redeemer. แต่ §2.7 **defer `identity_graph` + `account_links` ไป migration #3** (MVP มีแค่ `devices`+`users.auth_providers`+`merchants.owner_user_id`). ดังนั้นที่ **m#1 ประเมินได้จริงเฉพาะ:** (a) `redeeming_merchant == funder` (exact, ครบ); (b) **device-fingerprint overlap** ระหว่าง redeemer กับ owner_user_id ของ funder-merchant (partial). **ประเมินไม่ได้ที่ m#1:** KYC-cluster arm, shared-payment-instrument arm, goodwill↔identity-cluster edge (A2.9-#2 ที่ SEAM-1 step 2 ต้องการ), และ SEAM-4 identity-graph re-score. นี่คือเส้น BoT e-money — gap จึง load-bearing. **คำตัดสิน (เลือก option-b ของ verifier เพราะ option-a ดึง identity surface เข้า m#1 = scope creep ที่ §2.7 ปฏิเสธไปแล้ว):**
> - **m#1 (launch):** A.8.12 = `exact funder==redeemer` **+** `device-fingerprint overlap (redeemer ↔ funder-merchant owner)` เท่านั้น. hit ทั้งสอง = ห้ามสร้าง merchant_payable → route คืน funder / manual review.
> - **m#3 (identity_graph land):** เปิด KYC/payment-cluster arm + goodwill↔identity edge + SEAM-4 cross-source re-score (A.8.12_resid เต็มรูป).
> - **gate goodwill-at-scale บนสิ่งนี้:** ตรง A2.9-#2 "define goodwill↔identity-cluster edge **before enabling goodwill at scale**" → goodwill GRANT ที่ม้วนเกิน per-user/per-CS cap ถูก block จนกว่า m#3 wire edge เสร็จ (ก่อนหน้านั้น goodwill อยู่ได้แค่ small-cap CS apology ที่ §1.5 #3 ปรับ claim เป็น "exact funder==redeemer + device-overlap only at MVP; KYC/payment-cluster + goodwill↔identity arm land with identity_graph in m#3").

#### `issue_redemption_nonce` — merchant-side rotating QR/OTP generator  **(NEW — ปิด review minor; feeds redeem GATE 0)**
> **★ FIX (review minor — redeem GATE 0 สมมติว่า nonce มีอยู่แล้วโดยไม่มี generator):** merchant-present proof (`redemptions.qr_nonce` / `valid_until` / `initiation ∈ {merchant_qr, merchant_otp}`) ต้องถูก *ออก* ก่อน customer scan. เป็น non-money (เขียน `redemptions` row สถานะ `pending` เท่านั้น ยังไม่ post ledger) แต่ต้อง server-authoritative กัน static-QR replay.

```
0 · PRECOND   ASSERT merchant ∈ FINANCE_VERIFIED (redeem-capable) + freeze-state != paused
1 · ROTATE    gen one-time qr_nonce + valid_until = now()+90s (time-boxed, §1.5 #2)
2 · WRITE     INSERT redemptions(status='pending', initiation, qr_nonce, valid_until, place_id, merchant_id, city_id)
→ redeem GATE 0 จะ consume nonce นี้ (one-time): match + expire check → flip pending→settled ภายใน redeem txn
```

#### `claim_verify` (merchant trust-state advance)  **(NEW — ปิด review major; IN-MVP, Agent-led)**
> **★ FIX (review major — trust-state machine ไม่มีใน m#1 / ไม่มี edge fn):** Feature Matrix B mark claim/verify (`CLAIMED_UNVERIFIED → IDENTITY_VERIFIED → FINANCE_VERIFIED`) เป็น IN-MVP และ `FINANCE_VERIFIED` คือ precondition ที่ gate ว่า merchant top-up/mint/redeem ได้ไหม. แต่ `merchants` มีแค่ `kyc_status('pending','verified','rejected')` (identity-only — map ไม่ได้กับ 3-state machine; แสดง `FINANCE_VERIFIED` ไม่ได้). **schema fix เป็นของ §2** (เพิ่ม `merchant_trust_state` enum column `claimed_unverified|identity_verified|finance_verified|payout_frozen` — ดู §7.1.1 state machine); **§3 รับผิดชอบ edge-fn + gate readability:**

```
INPUT       on-premise code (Agent-delivered) | DBD/ภพ.20 | bank name-match | KYC — สะสม trust pts (§7.1.2)
GATE-SoD    identity reviewer ≠ finance reviewer (กัน insider; บังคับซ้ำที่ function boundary + RLS)
TRANSITION  claimed_unverified → identity_verified (trust pts ≥ 40 + 1 human review)
            identity_verified → finance_verified  (bank name-match + KYC + finance reviewer approve)
            *→ payout_frozen* เมื่อเปลี่ยน bank/owner (redeem ยังทำได้, payout ออกไม่ได้ — §7.1.1)
→ WRITE     UPDATE merchants.merchant_trust_state (service_role; client ไม่มี policy เขียน state ตรง)
```
> **gate readability (review major — finance-verified ต้องอ่านได้):** `fund_quest` / `issue_redemption_nonce` / `redeem`(settle) / `payout` **ทั้งหมดอ่าน `merchants.merchant_trust_state = 'finance_verified'` เป็น precondition**; `prefund`/`psp_settle` (top-up เงินเข้า) ต้อง `≥ identity_verified`. ถ้า §2 ยังไม่เพิ่ม column → ใช้ stopgap `kyc_status='verified' == finance_verified` ชั่วคราว **แต่บันทึกเป็น lockstep debt** (3-state ที่ claim IN-MVP ยังไม่ครบจน §2 เพิ่ม column).

#### `apply_proposal` (moderate → live) — เขียน live moat data + places_history version bump  **(NEW — ปิด review major; IN-MVP)**
> **★ FIX (review major — ไม่มี edge fn เอา approved proposal เข้า live):** `change_proposals` + `proposal_sod CHECK(reviewed_by ≠ proposed_by)` + `places.version` + `places_history` มีครบ และ §2 บอก "version bump ทุกครั้งที่ approve เขียน places_history". แต่ไม่มี edge/RPC ที่ทำ transaction apply-and-commit — RLS ไม่ให้ agent/merchant เขียน live และไม่ได้ให้ moderator path เขียนตรงเช่นกัน (โดยตั้งใจ). ถ้าไม่มี fn นี้ proposal mark approved ได้แต่ moat data ไม่เคยขึ้น live → consumer "discover place" ไม่เห็น Nimman ที่ agent ปู, Density Gate ไป 100% completeness ไม่ได้เลยผ่านทางถูกกฎหมายทางเดียว. **เป็น writer เดียวของ live moat data ต้องมีใน m#1** (Change Proposal invariant = FULL/IN-MVP).

```
0 · SoD       ASSERT reviewer != proposer (defense-in-depth กับ DB CHECK proposal_sod)
              ASSERT reviewer ∈ {Content Moderator, City Manager} AND proposal.city_id ∈ reviewer scope
1 · ATOMIC (txn เดียว):
    a) UPDATE change_proposals SET status='approved', reviewed_by, reviewed_at
    b) apply diff → UPDATE places (versioned fields: name_i18n/description_i18n/geo/address_i18n/
       opening_hours/price_band/status/category/subcategory) ; places.version += 1
    c) close prior history: UPDATE places_history SET valid_to=now() WHERE place_id=$p AND valid_to IS NULL
    d) INSERT places_history(place_id, version, snapshot, change_proposal_id, valid_from=now(), valid_to=NULL)
    e) UPDATE data_freshness.last_verified_* (ฟีด freshness badge §8.2.3)
    f) IF proposal ผูก task → UPDATE tasks.status='approved' (ปลด agent reward path; clawback window เริ่มนับ)
→ live moat data ขึ้นทันที; reject path = status='rejected' + reason (ไม่แตะ places)
```

#### `prefund` + `psp_settle`
- `prefund` (net booking): post `PREFUND` — `Dr psp_suspense (NET) + Dr psp_fee_expense / Cr merchant_escrow (GROSS)`. เงินใน `psp_suspense` ยัง unsettled → **ค้ำ mint ไม่ได้** (A.8.11). precondition: merchant `≥ identity_verified`.
- `psp_settle` (MANDATORY ก่อน escrow available): post `PSP_SETTLE` — `Dr bank_settlement / Cr psp_suspense` เมื่อ PSP payout เข้าบัญชีธนาคารจริง; bump `settled_total_cached`. ทำให้ escrow ส่วนนั้น "available สำหรับ mint" (ฐาน `settled_available` ของ gate 3 ใน grant).

#### `expire` (cron)
- Idempotency = `hash(lot_id, expiry_run)`; `FOR UPDATE` บน lot; precondition: ผ่าน pre-expiry notification + grace window (A.10.4, legal sign-off) **และ** ไม่มี outstanding provisional nonce (offline honor). Post EXPIRE → คืน backing สู่ funder (breakage dest ตาม policy: return-funder / `platform_breakage` THB-keep / `escheatment_liability` — A2.3.8).

#### `payout` (SoD + step-up)
- จ่ายจาก `bank_settlement` เท่านั้น (A.8.11); clearing-nets-to-zero ต่อ txn (A.8.1b — trigger (4) บังคับ). precondition: payee merchant `finance_verified` (ไม่ใช่ `payout_frozen`). **SoD:** creator ≠ approver (DB CHECK บน `payout_batches`) + ผ่าน bank-change cool-down (SEAM-3). **Step-up:** `approve_payout` ต้อง `auth.jwt()->>'aal' = 'aal2'` + `amr` timestamp สด + TOTP (staff).

---

### 3.4 5 SEAM Invariants — บังคับที่ชั้นไหน

| SEAM | สาระ | DB | Edge Fn | Recon job |
|---|---|---|---|---|
| **SEAM-1** Universal mint/value-gate | ทุก path ผ่าน gate เรียง **COGS cap → fraud-gate → settled-solvency** ใน Edge Fn เดียว ภายใต้ `FOR UPDATE` | sum-to-zero, clearing-flat (A.8.1b), lot non-negative, append-only (กัน post นอก path) | **เจ้าของหลัก** — `grant`/`redeem`/`cs_grant_goodwill` embed gate 3 ขั้นตามลำดับ + organic accumulator (A2.4 required artifact); `fund_quest` สร้าง reservation ให้ gate 3 มีของจริง decrement; RLS ปิด write ตรงทุกตารางการเงิน. **fraud-gate step 2 ที่ m#1 = exact funder==redeemer + device-overlap; KYC/payment-cluster + goodwill↔identity edge = m#3** | S6 nightly `cogs_budget_cap` จับ residual ที่หลุด live gate |
| **SEAM-2** Fail-closed บน loss | `Σ(merchant_receivable) > reserve` → auto-PAUSE GRANT (100%, WARN 70%); rounding bias → BREAK; A.8.12 residual → freeze cluster | CHECK `merchant_escrow ≥ 0` (no negative escrow) | อ่าน `platform_freeze_state` **ก่อนทุก money op** → ถ้า paused → REJECT (ทุก fn รวม fund_quest/issue_nonce/redeem/payout) | S6 reconcile คำนวณ receivable/reserve + rounding sign-test ข้าม N วัน → set freeze state |
| **SEAM-3** Payout SoD ข้าม bank-change AND batch | actor ที่ approve bank-change ภายใน cooldown (default 72h) ห้ามเป็น creator/approver ของ batch | `payout_batches CHECK(created_by<>approved_by)` | `payout` enforce join `audit_log(bank_change) × payout_items.bank_change_approver × payout_batches`; aal2 + cool-down; bank-change ทุก path ผ่าน audited channel เดียว | recon ตรวจ orphan/SoD-bypass ใน batch history |
| **SEAM-4** ห้าม real→real merge ของ Coin/payout account | merge/move Coin/payout-bank ระหว่าง real account ที่เคยถือ lot/bank = FORBIDDEN | trigger บล็อก re-point `coin_lots.user_id` / payout bank ของ real→real | merge flow ต้อง DPO + Finance dual-control + 24h cool-down; CS ทำไม่ได้. **identity-graph re-score (A.8.12 ข้าม source+target) = m#3** (m#1 ทำ exact+device-overlap re-check เท่านั้น) | identity-graph re-score (community detection) ตรวจ cluster ใหม่ — **active เมื่อ identity_graph land (m#3)** |
| **SEAM-5** Goodwill/platform-mint visible to S6 | goodwill ต้องค้ำ settled THB จริงผ่าน `sponsor:platform_goodwill` partition (ไม่มี float ลอย) | partition `funder_key='sponsor:platform_goodwill'` บน coin_backing; prefund = `Dr platform_expense / Cr sponsor_budget` (cash-funded, ไม่ใช่ contra-revenue) | `cs_grant_goodwill` mint จาก partition นี้ (ผ่าน gate SEAM-1 ครบ). **visibility (SEAM-5) ≠ fraud-gate coverage (A.8.12 edge ยังรอ m#3)** | A.8.2s solvency anchor **REQUIRED** นับ goodwill partition; A.8.5 per-funder รวม goodwill; `goodwill_backing` (settled-backed) |

> **สรุปการแบ่งชั้น:** DB บังคับ invariant ที่ "ผิดไม่ได้เด็ดขาด + ตรวจในระดับ row/txn" (append-only, sum-to-zero, **clearing-flat A.8.1b**, lot≥0, SoD-row, single-currency, no-negative-escrow). Edge Fn บังคับ "ลำดับ gate + atomicity + lock + freeze-state read + finance-verified gate" (SEAM-1/2/3/4 ฝั่ง enforce-at-write) และ **เป็นเจ้าของ value-moving + live-data-write path ทั้งหมด** (mint/burn/fund-quest/moderation-apply/nonce-issue). Recon job (nightly + intraday) จับ "drift + residual + cross-funder solvency + cache≠ledger" ที่ live gate มองไม่เห็น (A.8.2s/A.8.5/A.8.6 + SEAM-5 visibility) แล้ว **set freeze state ป้อนกลับ SEAM-2**. ไม่มี invariant ใดพึ่งชั้นเดียว — money path สำคัญทุกตัวมีอย่างน้อย 2 ชั้น. **ข้อยกเว้นที่บันทึก:** A.8.12 cluster arm + SEAM-4 re-score มีแค่ DB+Edge ชั้น exact/device ที่ m#1 — ชั้น identity-graph (cluster เต็ม) land m#3; ก่อนหน้านั้น recon ชั้นนี้ degrade เป็น detect-partial.

---

### 3.5 Build-Readiness Acceptance Checklist

- [ ] **RLS:** ทุกตารางการเงิน (`ledger_*`, `coin_lots`, `escrow_*`) `ENABLE ROW LEVEL SECURITY` + **ไม่มี INSERT/UPDATE policy** สำหรับ `anon`/`authenticated`; helper `auth_scope.*()` เป็น STABLE และไม่ query ตารางที่มี RLS (ทดสอบ: ไม่มี recursive lookup).
- [ ] **RLS no phantom column:** ทุก policy create สำเร็จบน schema จริง — โดยเฉพาะ `public_reads_published_places` ใช้ `status='published'` อย่างเดียว (ไม่มี `is_visible`); ทดสอบ guest/anon เห็น published places > 0 (กัน deny-all outage).
- [ ] **JWT scope = uuid:** Custom Access Token hook emit UUID PK ลง `scope_city_ids`/`merchant_ids`/`territory_ids`; ทดสอบ scoped policy (merchant/agent read) ไม่ raise `invalid input syntax for type uuid`.
- [ ] **Wallet read-model:** consumer wallet เรนเดอร์ Coin จาก `coin_lots` (remaining_minor/expires_at/state) + Sparks จาก `spark_balances`; ทดสอบไม่มี client path อ่าน `ledger_entries` (ledger ปิดสนิทต่อ client).
- [ ] **Append-only:** `REVOKE UPDATE,DELETE` + block trigger บน `ledger_transactions`/`ledger_entries`; ทดสอบ UPDATE/DELETE ต้อง raise exception ทุกครั้ง.
- [ ] **Sum-to-zero:** deferred constraint trigger fire ที่ COMMIT; ทดสอบ txn ไม่ balance (ต่อ currency) ต้อง rollback.
- [ ] **Clearing-flat (A.8.1b — DDL จริง):** second deferred constraint trigger `ledger_clearing_flat_per_txn` (join accounts, filter account_type='clearing') fire ที่ COMMIT; **ทดสอบ post `Dr clearing / Cr platform_expense` ข้างเดียว → rollback** (single-sided AGENT_CLAWBACK draft) + ทดสอบ clearing-balanced PAYOUT ผ่าน.
- [ ] **amount_minor>0 / single-currency / lot-expiry:** CHECK + trigger ครบ; ทดสอบ leg 0/negative และ currency-mismatch ถูกปฏิเสธ.
- [ ] **coin_lots concurrency:** ทดสอบ 2 REDEEM พร้อมกันบน lot เดียว (REPEATABLE READ + FOR UPDATE) → serialize, ไม่มี over-burn, `remaining_minor ≥ 0`.
- [ ] **Idempotency:** UNIQUE `idempotency_key`; replay เดิม = no-op; key ชน payload ต่าง → 409.
- [ ] **fund_quest (NEW):** integration test ยืนยัน `fund_quest` สร้าง `escrow_locks(quest_pool)` + post `FUND_QUEST` ภายใต้ FOR UPDATE + ASSERT settled_available; แล้ว `grant_coins` GATE 3 decrement reservation จริง (ไม่ใช่ mint จาก unreserved); ทดสอบ 2 concurrent quest จาก escrow เดียว ไม่ over-reserve.
- [ ] **apply_proposal (NEW):** test approve → places updated + version++ + places_history (close old valid_to + insert snapshot with change_proposal_id) + task='approved' atomic; reviewer==proposer → REJECT (function + DB CHECK); ไม่มี client path เขียน places live.
- [ ] **issue_redemption_nonce (NEW):** nonce one-time + valid_until time-boxed; redeem GATE 0 consume แล้ว replay nonce เดิม → REJECT; precondition finance_verified.
- [ ] **claim_verify / finance-verified gate (NEW):** trust-state advance ผ่าน SoD (identity≠finance reviewer); `fund_quest`/`issue_redemption_nonce`/`redeem`-settle/`payout` block ถ้า merchant ไม่ finance_verified. *(lockstep กับ §2: ต้องมี `merchant_trust_state` column; ถ้ายังไม่มี → stopgap `kyc_status='verified'` + บันทึก debt.)*
- [ ] **Quest-completion → mint handoff:** test last qualifying check_in → quest_progress.completed + เรียก grant_coins (ผ่าน SEAM-1) + set reward_grant_id; handoff มีชื่อ (check_in GATE 6 หรือ complete_quest) ไม่ implicit.
- [ ] **SEAM-1 gate order:** integration test ยืนยัน `grant`/`redeem` รัน **COGS cap → fraud-gate → settled-solvency** ตามลำดับ; ทุก path (organic + goodwill + CS) route ผ่าน Edge Fn เดียว; organic accumulator embed จริงภายใต้ FOR UPDATE; ไม่มี client เขียน ledger ตรงได้.
- [ ] **A.8.12 MVP scope (downgraded claim):** test exact funder==redeemer → route; device-fingerprint overlap (redeemer ↔ funder-merchant owner) → route; **ยืนยันว่า KYC/payment-cluster arm + goodwill↔identity edge ติด flag "m#3 (identity_graph)" ไม่ assert ว่า full-at-launch**; goodwill-at-scale ถูก gate จนกว่า edge นั้น wire.
- [ ] **SEAM-2/3/4/5:** freeze-state อ่านก่อนทุก money op; `payout_batches` SoD CHECK + bank-change cooldown join; real→real Coin merge ถูกบล็อก (re-score เต็มรอ m#3); goodwill partition ปรากฏใน A.8.2s/A.8.5 recon + cash-funded (ไม่ใช่ contra-revenue).
- [ ] **Step-up:** `approve_payout` / `OWNERSHIP_TRANSFER` / `export_pii` บังคับ `aal=aal2` + `amr` สด.
- [ ] **Multi-city:** `city_id NOT NULL` ทุกตารางการเงิน; seed Nimman (`district` ใน `cnx`) แต่ schema ไม่ hardcode เมือง/ย่าน.
- [ ] **§2 lockstep dependencies (cross-ref, ไม่ใช่ §3 fix แต่ block §3 ถ้าค้าง):** FK forward-reference ที่ §3 enable RLS บนนั้นต้อง resolve ที่ §2 (สร้างตารางตามลำดับ หรือ trailing `ALTER TABLE … ADD CONSTRAINT` ให้ครบ ไม่ใช่แค่ 2 ตัว `escrow_wallet_id`/`subscription_id` — รวม `owner_user_id`, `onboarded_by_agent_id`, `quests.sponsor_id`/`funding_escrow_wallet_id`, `reviews.linked_check_in_id`, `quest_progress.reward_grant_id`, `tasks.change_proposal_id`); column `merchant_trust_state`, `is_visible` (ถ้าจะใช้ soft-hide), per-district coverage baseline (Density Gate denominator) — ทั้งหมดเป็นของ §2.
- [ ] **Founder gates ที่ block go-live (ค้างจาก doc):** `REWARD_PER_REDEMPTION_CAP_THB` + `MERCHANT_MONTHLY_COGS_CAP_THB` ต้องถูก set (มิฉะนั้น cap fail-closed = block mint, block D7/CS GRANT); bad-debt reserve size; breakage destination legal sign-off ต่อ jurisdiction; goodwill BoT/e-money sign-off + goodwill↔identity edge ก่อน enable goodwill at scale.

---

## ภาคผนวก: ความเสี่ยงคงเหลือ
### scope
- REJECTED as out-of-section (with reason): canonical_fidelity minor #3 (RLS public_reads_published_places references non-existent places.is_visible), #4 (RLS helper casts JWT slug ids 'cnx'/'m_123'/'nimman' to uuid[] → runtime invalid-input error breaking every scoped policy), and #5 (unacknowledged FK forward-references owner_user_id/onboarded_by_agent_id/quests.sponsor_id etc. fail top-to-bottom). These are pure migration-DDL bugs in §2.3/§2.4/§3.1 of the build doc, not the MVP-scope spec — they do not change any scope claim, so they are not folded into this section. They remain OPEN against the migration document and must be fixed there before m#1 runs (is_visible bug in particular silently zeroes the guest map, an IN-MVP feature).
- The A.8.1b clearing-flat invariant is, per the review, currently only a prose placeholder in §3.2 of the build doc (the implemented ledger_assert_balanced groups by currency only and does NOT filter account_type='clearing'). §1.5 #5 now mandates it as a real branch + acceptance test, but the actual DDL fix lives in the migration document and is still outstanding — until implemented, a clearing-imbalanced txn (e.g. forbidden single-sided AGENT_CLAWBACK) passes silently instead of tripping FROZEN.
- The five §1.7 edge-fn/writer dependencies are declared IN-MVP prerequisites but are ABSENT from the current §3.3 edge-function surface (check_in/grant_coins/redeem/prefund/psp_settle/expire/payout). Until added to migration #1, the merchant join/fund-quest step, the change-proposal→live-data path (and thus Density Gate attainment), the FINANCE_VERIFIED escrow gate, the quest-completion→mint bridge, and counter-scan nonce issuance have no server-authoritative implementation — the loop cannot close end-to-end.
- Founder decision §1.6 #4 is now load-bearing for compliance, not just accounting form: choosing option (b) (device-overlap-only anti-self arm at MVP) hard-gates goodwill-at-scale on the m#3 identity_graph and on defining the goodwill↔identity-cluster A.8.12 edge (A2.9-#2) before go-live. If goodwill is enabled at scale before m#3 lands, the KYC/payment-cluster self-redemption arm and SEAM-4 re-score are unenforced — a BoT e-money boundary gap.
- Density Gate criterion (1) 'coverage ≥90%' cannot be evaluated as a single query until a per-district baseline denominator is added to schema, and the Google-Places seed ETL (dedup, category mapping, licensing of non-persistable Google data, denominator refresh) is itself flagged unspecified in SYSTEM_PLAN §12 — the gate's marketing-go/no-go decision depends on resolving both.

### erd
- REJECTED (out of erd scope, §3.1-owned): RLS helper uuid-cast vs JWT-slug mismatch and JWT carrying slugs ('cnx','m_123','nimman') instead of uuid PKs. These are about §3.1 auth_scope.*() helper bodies + the Custom Access Token hook + the example JWT, not §2 schema. §2 confirms cities.id/merchants.id/districts.id are uuid PKs; the resolution (emit uuid PKs into claims and keep ::uuid[] cast, OR switch helpers+columns to text) must be applied in §3.1, not here. Flagged for the §3 finalizer.
- DEFERRED to §3 (schema hooks now present, writers not): edge functions fund_quest (C3), apply_proposal (C4), quest-completion->grant evaluator (C5), and counter-scan nonce issuer (C6) are NOT defined in §2. §2.8 + §2.4.1 make the contracts explicit, but until §3 implements these as service_role edge-fns the MVP loop does not actually close (no legal write path to create quest_pool reservations, take proposals live, mint on completion, or issue redemption nonces).
- A.8.12 at launch covers exact-funder, device-fingerprint, payment-instrument, and KYC-hash arms only. Transitive/multi-hop identity-cluster detection, weighted risk scoring, and SEAM-4 identity-graph re-score remain in m#3 (identity_graph/account_links). Goodwill-at-scale must stay capped via platform_config (GOODWILL_USER_CAP/per-city ceiling) until the goodwill<->identity-cluster edge is wired into m#3 fraud-graph depth.
- kyc_hash / payment_instrument_hash are nullable correlation columns — their anti-self-redemption value depends on the hashing/population pipeline (§3 + ingestion) actually writing them at KYC and payment-add time. If left unpopulated, the A.8.12 KYC/payment arms silently degrade to device+exact-funder only. The population job is a §3/ingestion responsibility not covered by §2.
- merchant_trust_state vs merchants.payout_frozen vs accounts.status are now three overlapping freeze/state signals. §2 documents the mapping (trust_state=lifecycle gate; payout_frozen=A.8.4 chargeback freeze; accounts.status=ledger-post gate) but §3 must ensure the trust-state transition logic and the chargeback handler do not contradict (e.g. payout_frozen vs trust_state='payout_frozen' kept in sync).
- Density-Gate trilingual completeness (criterion 4) is a jsonb key-scan, not an indexed/generated column — acceptable as a per-district batch gate-check but will not perform as a hot-path query; if gate evaluation needs to be frequent/large-scale a generated completeness flag should be added in a later migration.

### enforcement
- REJECTED for §3 (data-model scope) — canonical_fidelity MINOR #5 (unacknowledged FK forward-references) and mvp_loop MINOR (Density Gate coverage baseline denominator): these are §2 migration-ordering / schema-column concerns, not enforcement-layer changes. Folding actual DDL ordering or a coverage_baseline column into the enforcement section would be miscategorization. Captured instead as an explicit §3.5 lockstep cross-ref item so §2 closes them in the same migration; if §2 ships without resolving the full FK set, §3's RLS-enabled tables fail to create top-to-bottom.
- The merchant_trust_state finance-verified gate (mvp major) depends on a §2 schema column that does not yet exist; §3 specifies the edge-fn + gate and a kyc_status='verified' stopgap, but until §2 adds the enum column the 3-state machine claimed IN-MVP is only partially representable (recorded as lockstep debt).
- A.8.12 remains structurally partial at m#1 by design: only exact funder==redeemer + device-fingerprint overlap are computable until identity_graph/account_links land in m#3. The KYC/payment-cluster arm, the goodwill<->identity-cluster edge (A2.9-#2), and SEAM-4 cross-source re-score are the BoT e-money compliance boundary and are gated 'before goodwill at scale' / m#3 — this is the explicitly downgraded claim, not a fully closed control.
- cogs_budget_cap stays INERT-until-sized: the per-merchant monthly accumulator is now mandated as a required build artifact embedded in organic grant/redeem under FOR UPDATE, but REWARD_PER_REDEMPTION_CAP_THB and MERCHANT_MONTHLY_COGS_CAP_THB are unset founder calls (A2.10-#3) — until set, the cap fails closed and D7/CS GRANT cannot be enabled.
- The new edge functions (fund_quest, apply_proposal, issue_redemption_nonce, claim_verify, check_in GATE 6) are specified at gate/posting level but their exact column wiring (e.g., quests.funding_round, places_history snapshot shape, data_freshness field names) must be confirmed against the final §2 DDL during build; mismatches surface as integration-test failures, not silent passes.
- Breakage destination posting (return-funder vs platform_breakage vs escheatment_liability) and goodwill BoT/e-money classification remain founder/legal sign-offs (A2.10-#1/#2/#5) that block go-live but cannot be resolved at the enforcement-spec layer.
