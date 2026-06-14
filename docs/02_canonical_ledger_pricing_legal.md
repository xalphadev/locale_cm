# Canonical Specs — การเคาะ 3 จุด BLOCKING (ledger / pricing / legal)

> **เวอร์ชัน:** v1 (ผ่าน adversarial review แล้ว) · **วันที่:** 2026-06-14 · **สถานะ:** spec พร้อมเริ่ม build migration #1 หลังเจ้าของยืนยัน founder decisions + ได้ legal sign-off
> เอกสารนี้คือ **single source of truth** ของชั้นการเงิน, ราคา, และจุดยืนทางกฎหมาย — ทับล้างทุกความขัดแย้งจากร่างแรกใน `SYSTEM_PLAN.md`
> แต่ละ spec ถูกออกแบบแล้วส่งให้ skeptic agent โจมตี (ledger: บัญชี/กันโกง/lifecycle · pricing: unit-econ · legal: เช็คกฎหมายไทยจริง) แล้วแก้ตามที่พบ — ดู §D สำหรับสิ่งที่ยังต้องเจ้าของ/ทนายเคาะ

---

## สารบัญ
- A. Canonical Ledger & Money Spec
- B. Subscription Tiers, Take-Rate & Agent Compensation
- C. Legal & Regulatory Posture (Thailand)
- D. การตัดสินใจที่ยังต้องเจ้าของ/ทนายเคาะ + ความเสี่ยงคงเหลือ

---

## A. Canonical Ledger & Money Spec (ฉบับสมบูรณ์ v2 — สำหรับ migration #1)

> เอกสารนี้คือ **single source of truth** ของชั้นการเงินทั้งระบบ ทุก section อื่นต้องอ้างชื่อ account / ชื่อคอลัมน์ / หน่วย ตามนี้เท่านั้น ความขัดแย้ง 4 ดราฟต์เดิม (datamodel / loyalty / architecture / monetization) ถูกตัดสินจบในเอกสารนี้แล้ว ดู ## A.10 สำหรับตารางคำตัดสิน
>
> **v2 (รอบนี้):** ปิดช่องโหว่เชิงโครงสร้างที่ verifier พบ — (1) แยก `clearing` (transient) ออกจาก `coin_backing` (long-lived); (2) เพิ่ม **anchor invariant กับเงินสดจริง** (ไม่พึ่ง tautology ภายใน); (3) PSP fee netting; (4) gate mint บน **settled cash**; (5) lot-based burn + concurrency lock จริง; (6) ปิด redeem-after-expiry; (7) sponsor-funded lifecycle; (8) anti-self-redemption เป็น control ระดับหนึ่ง; (9) เพิ่มบัญชีที่ขาด (`bank_settlement`, `deferred_revenue`, `merchant_receivable`, `psp_fee_expense`, `platform_breakage`/`escheatment_liability`)

---

### A.0 หลักการที่ไม่ต่อรอง (Non-negotiables)

1. **Append-only double-entry ledger เท่านั้น** — ไม่มี `points INT` / `coin_balance` / `balance` ที่ `UPDATE` ได้ ที่ไหนเลยในเส้นทางเงิน ยอดคงเหลือ "ที่เป็นความจริง" ทุกตัว = `SUM(ledger_entries)` เสมอ
   > ข้อยกเว้นเดียวที่อนุญาตให้มี mutable row ในเส้นทางเงินคือ **`coin_lots.remaining_minor`** ซึ่งเป็น **lock-anchor / read-cache** ไม่ใช่ source of truth (ดู A.5.1) — มีไว้เพื่อให้ burn path มี row จริงให้ `SELECT … FOR UPDATE` ได้ (append-only SUM ล็อกไม่ได้) ค่าใน `coin_lots` ต้อง rebuild ได้จาก ledger เสมอ และถูก reconcile ทุกคืน
2. **หน่วยเงินเดียวทั้งระบบ = สตางค์ (satang = THB minor = 1/100 บาท)** เก็บเป็น `BIGINT` ห้ามใช้ `numeric`/`float` กับจำนวนเงิน
3. **1 COIN = 1 THB = 100 satang คงที่ (FIXED 1:1)** — Coin ก็เก็บเป็น `amount_minor` หน่วยสตางค์เช่นกัน ไม่มี exchange rate ปรับได้ (ดู A.8 / A.10.1)
4. **แพลตฟอร์มไม่เคยสำรองจ่าย (no platform float)** — mint Coin ได้เฉพาะเมื่อมี baht **ที่ settle แล้ว** ใน escrow ค้ำ 1:1 (mint gating ที่ระดับ DB, บน *settled* balance ไม่ใช่ authorized) และการ payout เงินสดจริงออก (REDEEM→PAYOUT) ต้องไม่เกิดก่อนเงิน PSP settle เข้าธนาคารเรา ดู A.8.7 / A.8.11 / A.6(1)
   > ผลพวง: ทุกครั้งที่หลักการนี้ "ถูกฝ่าโดยไม่ได้ตั้งใจ" (chargeback หลัง redeem, funder default, negative escrow) ระบบต้อง **ลงบัญชี exposure จริงเป็น asset/expense** (`merchant_receivable` / `bad_debt_expense`) ไม่ใช่ซ่อนเป็น liability ติดลบ (ดู A.6(7), A.8.4)
5. **Sparks ไม่อยู่ในเงิน-ledger** — แยกตารางต่างหาก (ดู ## A.4)

---

### A.1 Chart of Accounts (ชุดเดียว — canonical, ครบ)

ทุกบัญชีคือแถวใน `accounts` ระบุด้วย `account_type` enum ด้านล่าง บางชนิดมีหนึ่งแถวต่อ owner (per-merchant / per-user / per-sponsor) บางชนิดเป็น singleton ระดับแพลตฟอร์ม (ต่อ `city_id`)

| account_type | type | normal_balance | owner | currency | จุดประสงค์ (purpose) |
|---|---|---|---|---|---|
| `psp_suspense` | Asset (money-in, ยังไม่ settle) | **DR** | Platform (per city, **per PSP**) | THB | เงินที่ PSP **authorize** แล้วแต่ยังไม่ payout เข้าธนาคารเรา (**unsettled**) — reconcile กับ PSP statement ที่ **NET** เงินใน suspense **ห้ามใช้ back mint** (ดู A.8.11) |
| `bank_settlement` | Asset (settled real cash) | **DR** | Platform (per city) | THB | เงินสดจริงที่ PSP payout เข้าบัญชีธนาคารเราแล้ว = แหล่งเดียวที่ถือว่าเป็น "settled" สำหรับ mint gating และ payout |
| `psp_fee_expense` | Expense | **DR** | Platform (per city, per PSP) | THB | ค่าธรรมเนียม PSP (~2–3% + fixed) ที่หักจาก money-in (ดู A.6(1)) |
| `merchant_escrow` | Liability (เราเป็นหนี้ merchant) | **CR** | Merchant (per merchant) | THB | baht ที่ merchant prefund ค้างอยู่กับเรา = หนี้ของแพลตฟอร์มต่อ merchant (เฉพาะส่วน **available**; ส่วนที่ lock ค้ำ Coin ย้ายไป `coin_backing` ตอน GRANT) |
| `sponsor_budget` | Liability (เราเป็นหนี้ sponsor) | **CR** | Sponsor (per sponsor) | THB | งบ campaign ที่ sponsor/TAT/mall prefund — เหมือน escrow แต่ผูกกับ sponsor/campaign |
| `coin_liability` | Liability (Coin ค้างในมือ user) | **CR** | Platform (per city) | COIN | **หนี้สิน Coin ที่ยังไม่ถูก burn ทั้งระบบ** — liability อยู่ที่นี่ (ไม่ใช่ escrow.locked) ดู ## A.5 |
| `user_coin` | (contra-liability ของ user) | **DR** | User (per user) | COIN | Coin คงเหลือของ user แต่ละคน — `SUM(user_coin ทุก user) = coin_liability` เสมอ |
| `coin_backing` | Liability-backing (THB ค้ำ Coin live) | **CR** | Platform (per city, **per funder partition**) | THB | **บัญชีค้ำ Coin live โดยเฉพาะ — long-lived** ตั้งแต่ GRANT จนถึง REDEEM/EXPIRE ของ lot นั้น ค่า `funded_by` บังคับลงทุก leg เพื่อ partition ต่อ funder (ดู A.8.5) **แทน clearing เดิมในบทบาทค้ำ Coin** |
| `clearing` | Clearing/settlement (internal, **transient**) | **DR/CR (zero-target ต่อ txn)** | Platform (per city) | THB | บัญชีพักภายใน **ต้องกลับเป็น 0 ภายในทุก txn** (บังคับด้วย A.8.1b) ใช้กับ AFFILIATE / PAYOUT in-flight เท่านั้น — **ไม่ถือ backing ข้าม txn อีกต่อไป** |
| `platform_revenue` | Revenue | **CR** | Platform (per city) | THB | take-rate, subscription (recognized), affiliate, campaign fee |
| `deferred_revenue` | Liability | **CR** | Platform (per city) | THB | subscription annual ที่ยังไม่ recognize (ทยอยตัดเข้า `platform_revenue`) |
| `platform_breakage` | Revenue (เฉพาะเมื่อ policy = platform-keep) | **CR** | Platform (per city) | THB | ปลายทาง breakage **เฉพาะกรณี** ที่กฎหมาย/สัญญายอมให้แพลตฟอร์มเก็บ (ดู A.6(5), founder/legal call) |
| `escheatment_liability` | Liability | **CR** | Platform (per city) | THB | breakage ที่ต้องส่งรัฐ/กันไว้ตามกฎ unclaimed-property (ถ้า jurisdiction บังคับ) |
| `merchant_payable` | Liability (เราต้องจ่าย merchant) | **CR** | Merchant (per merchant) | THB | ส่วนรางวัลที่ redeeming merchant พึงได้รับ รอจ่ายออก (payout batch) |
| `merchant_receivable` | Asset (merchant ติดหนี้เรา) | **DR** | Merchant (per merchant) | THB | exposure จริงเมื่อ chargeback/churn ทำให้เราจ่ายไปก่อนแต่เก็บเงินคืนไม่ได้ — **แทนการปล่อย escrow ติดลบลอย ๆ** (ดู A.6(7)) |
| `bad_debt_expense` | Expense | **DR** | Platform (per city) | THB | write-off `merchant_receivable` เมื่อ recovery case ล้มเหลว |

> **หมายเหตุ:** ตัด `expiry_breakage` (COIN sink) ทิ้ง — breakage ฝั่ง COIN วัดจาก `ref_type=expiry` ใน reporting ไม่ต้องมี leg COIN ที่สาม (ดู A.6(5)) ส่วน breakage ฝั่ง **THB** มีปลายทางชัดเจน 3 ทางตาม policy: คืน funder / `platform_breakage` / `escheatment_liability`

**โครงสร้างตาราง `accounts`:**

```
accounts
├─ id              uuid PK
├─ account_type    enum   -- (ค่าจากตารางบน)
├─ owner_type      enum   -- platform | merchant | sponsor | user
├─ owner_id        uuid NULL  -- null เมื่อ platform-singleton
├─ funder_key      text NULL  -- เฉพาะ coin_backing: 'merchant:<id>' | 'sponsor:<id>' (partition)
├─ psp_key         text NULL  -- เฉพาะ psp_suspense/psp_fee_expense: 'omise'|'2c2p'|'fiuu'|'promptpay'|'alipay'|'wechat'
├─ currency        enum   -- THB | COIN          (ดู A.3 — ไม่มี SPARK ในที่นี้)
├─ normal_balance  enum   -- DR | CR
├─ city_id         uuid NOT NULL   -- multi-city ตั้งแต่ migration #1
├─ status          enum   -- active | frozen | closed
└─ UNIQUE(account_type, owner_id, funder_key, psp_key, currency, city_id)
```

> **บัญชี frozen/closed กับ append-only ledger:** การ post เข้า account ที่ `status != active` **อนุญาตเฉพาะ system-txn** (EXPIRE/REFUND/recovery) ที่ลด/ปิด obligation ของ account นั้น — ห้าม post ที่ "เพิ่ม obligation ใหม่" (เช่น GRANT, PREFUND ใหม่) บังคับด้วย trigger ตรวจ `accounts.status` ต่อ leg เหตุผล: CHURN step-2 EXPIRE ต้อง credit `merchant_escrow` ของ merchant ที่ปิดไปแล้วได้ (คุ้มครองผู้บริโภค) แต่ merchant ที่ปิดแล้วต้องรับ GRANT ใหม่ไม่ได้

> **เหตุผลที่แยก `psp_suspense` / `bank_settlement` / `clearing` / `coin_backing` ออกจากกัน 4 ทาง:**
> - `psp_suspense` (per PSP) = เงิน authorize แต่ยังไม่ settle → reconcile กับ statement PSP ที่ NET → **ห้าม mint**
> - `bank_settlement` = เงินสดจริงเข้าธนาคารเรา → settled → **เป็นฐานเดียวของ mint gating/payout**
> - `coin_backing` (per funder) = THB ค้ำ Coin live long-lived → ทำให้ A.8.5 คำนวณได้จริง ต่อ funder
> - `clearing` = transient zero-per-txn สำหรับ AFFILIATE/PAYOUT in-flight เท่านั้น
> ถ้ารวมกันจะ reconcile กับเงินจริงไม่ได้ และ chargeback/payout/coin-backing จะปนกันจนตรวจ solvency ไม่ออก (แก้ conflict monetization-vs-loyalty + ปิด tautology A.8.5)

---

### A.2 รูปแบบ `ledger_entries` (entry shape — ตัดสิน: direction column)

**คำตัดสิน: ใช้ `direction` enum (`DR`/`CR`) + `amount_minor` ที่ > 0 เสมอ — ไม่ใช้ signed amount**

```sql
ledger_transactions          -- หนึ่ง business event = หนึ่งแถว (กลุ่มของ legs)
  id                uuid PK
  txn_type          enum NOT NULL  -- ดู A.7 (PREFUND | PSP_SETTLE | FUND_QUEST | GRANT | REDEEM
                                   --  | EXPIRE | REFUND | CHARGEBACK | CHURN_SWEEP | CAMPAIGN_END
                                   --  | OWNERSHIP_TRANSFER | RECOVERY | WRITE_OFF
                                   --  | SUBSCRIPTION | SUBSCRIPTION_RECOGNIZE | AFFILIATE | PAYOUT)
  idempotency_key   text UNIQUE NOT NULL   -- กัน replay/retry (กดซ้ำ = no-op) — ดู A.8.8 (bound กับ payload)
  request_hash      text NOT NULL  -- hash(txn_type, accounts[], amount, ref_id, actor) — ผูกกับ key (A.8.8)
  city_id           uuid NOT NULL
  funded_by         text NULL      -- 'merchant:<id>' | 'sponsor:<id>' | 'platform'
  ref_type          enum NULL      -- escrow_topup | psp_settle | quest_reward_pool | coin_grant
                                   --  | redemption | expiry | reversal | recovery | write_off
                                   --  | subscription | affiliate | payout | ownership_transfer
  ref_id            uuid NULL      -- ชี้ entity ต้นทาง
  reverses_txn_id   uuid NULL FK → ledger_transactions  -- ถ้าเป็น txn กลับรายการ
  created_at        timestamptz NOT NULL DEFAULT now()
  created_by        uuid NULL      -- actor (server-side only)
  -- กัน reversal ซ้ำ: REDEEM/PREFUND หนึ่งรายการ ถูกกลับได้ไม่เกินหนึ่งครั้งต่อชนิด
  CONSTRAINT one_reversal_per_target
    EXCLUDE (reverses_txn_id WITH =, txn_type WITH =) WHERE (reverses_txn_id IS NOT NULL)

ledger_entries               -- APPEND-ONLY (no UPDATE / no DELETE)
  id                uuid PK
  seq               bigserial UNIQUE  -- monotonic ทั้งระบบ (ordering + audit replay)
  txn_id            uuid NOT NULL FK → ledger_transactions
  account_id        uuid NOT NULL FK → accounts
  direction         enum NOT NULL     -- 'DR' | 'CR'
  amount_minor      bigint NOT NULL CHECK (amount_minor > 0)   -- สตางค์ หรือ coin-minor; > 0 เสมอ
  currency          enum NOT NULL     -- THB | COIN  (ต้องตรงกับ accounts.currency)
  funded_by         text NOT NULL     -- denormalize ลงทุก leg (ตอบ "ใครจ่าย" ด้วย query เดียว + partition coin_backing)
  lot_id            uuid NULL  FK → coin_lots   -- *** บังคับบนทุก leg ที่แตะ user_coin / coin_backing ***
  expires_at        timestamptz NULL  -- บังคับบนทุก leg ที่แตะ user_coin (credit และ burn ต้องตรงกับ lot)
  city_id           uuid NOT NULL
  memo_i18n         jsonb NULL
  posted_at         timestamptz NOT NULL DEFAULT now()
  -- ทุก burn/credit leg ที่อ้าง lot ต้องมี expires_at; ทุก leg ที่อ้าง lot_id ต้องมี currency สอดคล้อง
  CONSTRAINT lot_legs_have_expiry CHECK (lot_id IS NULL OR expires_at IS NOT NULL)
```

**Immutability / Monotonicity (บังคับที่ DB):**
- `REVOKE UPDATE, DELETE ON ledger_entries, ledger_transactions FROM ALL` + `BEFORE UPDATE/DELETE` trigger ที่ `RAISE EXCEPTION` — แก้ได้เพียงโพสต์ txn กลับ (reversal) ที่ชี้ `reverses_txn_id`
- `seq bigserial` = ลำดับเขียนสากล ใช้ replay/rebuild ทุก materialized balance ได้
- การ post ทั้ง txn ทำใน Postgres transaction เดียว (atomic) — ทุก leg เกิดพร้อมกันหรือไม่เกิดเลย

**ทำไม direction column ไม่ใช่ signed amount:**
1. **ตรง accounting จริง** — DR/CR เป็นภาษาบัญชีมาตรฐาน ผู้ตรวจสอบ/นักบัญชีไทย (ภพ.20, retention 5–10 ปี) อ่านได้ตรง ไม่ต้องตีความเครื่องหมาย
2. **`CHECK (amount_minor > 0)` กันบั๊กทั้งคลาส** — signed amount เปิดช่องให้ค่าติดลบ/ศูนย์ที่ผิดความตั้งใจ และทำให้ invariant "ไม่มี Coin ติดลบ" ตรวจยากขึ้น
3. **invariant เช็คง่าย** — `SUM(DR.amount where currency=c) = SUM(CR.amount where currency=c)` ต่อ txn ต่อ currency เป็นเงื่อนไขเดียว ชัดเจน
4. **balance สูตรเดียว** — `balance(account) = Σ(DR) − Σ(CR)` ถ้า normal_balance=DR; กลับเครื่องหมายถ้า CR

---

### A.3 Currency enum (ชุดเดียว)

```
currency enum = { THB, COIN }
```
**ตัดทิ้ง `SPARK` ออกจาก currency ของเงิน-ledger** — Sparks ไม่ใช่เงิน ไม่มี backing ไม่อยู่ใน `accounts`/`ledger_entries` เลย (ดู A.4) `accounts.currency` และ `ledger_entries.currency` รับได้แค่ THB | COIN

> **FX ที่ขอบ PSP (Alipay/WeChat settle CNY):** การแปลง CNY→THB เกิด **นอก ledger ที่ขอบ PSP** — เงินที่ลงใน `psp_suspense`/`bank_settlement` เป็น **THB satang เสมอ** (ยอด THB ที่ PSP ยืนยันหลังแปลง) ส่วนต่าง FX และค่าธรรมเนียมแปลงสกุลถือเป็นส่วนหนึ่งของ `psp_fee_expense` (netting ที่ A.6(1)) ledger ไม่เก็บ CNY ไม่มี currency=CNY ใน enum

---

### A.4 Sparks — แยกออกจากเงิน-ledger (ตัดสิน: counter + event-log)

Sparks = soft XP ไม่มี monetary liability จึง **ไม่ใช้ double-entry** เก็บเป็น:

```sql
spark_balances              -- read-model cache, rebuild ได้จาก spark_events
  user_id          uuid PK
  city_id          uuid
  balance          bigint NOT NULL DEFAULT 0   -- mutable integer ได้ (ไม่ใช่เงิน)
  updated_at       timestamptz

spark_events                -- append-only log (source of truth ของ Sparks)
  id               bigserial PK
  user_id          uuid
  delta            bigint NOT NULL        -- +/- ได้ (signed ที่นี่ ok เพราะไม่ใช่เงิน)
  reason           enum   -- checkin | review | task | referral | streak_bonus | admin_adjust
  ref_id           uuid NULL
  city_id          uuid
  created_at       timestamptz DEFAULT now()
```

**เหตุผล:** (1) audit scope ทางการเงินแคบลงเหลือเฉพาะ Coins (2) Sparks เขียนบ่อยมาก (ทุก check-in) — integer + cache เพียงพอ ส่วนเงินต้อง correct 100% (3) Sparks ไม่มีวันแปลงเป็น Coin โดยตรง — ไม่มีสะพานข้าม ledger Sparks ปลดล็อกแค่ *สิทธิ์เข้าถึง* (tier/quest) ไม่ใช่ตัวจ่ายรางวัล

---

### A.5 Coin liability อยู่ที่ไหน (ตัดสิน: platform `coin_liability`)

**liability อยู่ที่ `coin_liability` (platform) เป็น source of truth** ไม่ใช่ `escrow_wallets.locked_balance`

- **ตอน GRANT:** `coin_liability` (CR, +) เพิ่มขึ้น = แพลตฟอร์มเป็นหนี้ Coin ต่อ user มากขึ้น คู่กับ `user_coin` (DR, +)
- **escrow.locked เป็น derived mirror** — `escrow_wallets` / `escrow_locks` เป็น **read-model cache เท่านั้น** (ดู A.9) ค่า lock คำนวณจาก ledger (`coin_backing` legs) ไม่ใช่ตัวตัดสิน
- **invariant ผูกสองฝั่ง:** ดู A.8.5 — `coin_liability` ผูกกับ `coin_backing` (ไม่ใช่ clearing) **per funder**

> เหตุผลที่เลือก platform-level liability: ตอบ "ทั้งระบบเป็นหนี้ Coin กี่บาท" ด้วย query เดียว (`balance(coin_liability)` ต่อ city) Finance เห็น exposure real-time

#### A.5.1 `coin_lots` — lock-anchor ของแต่ละ grant lot (แก้ปัญหา concurrency)

> **ปัญหาที่แก้ (critical):** `balance(user_coin)=SUM(ledger)` บน append-only table **ล็อกด้วย `SELECT … FOR UPDATE` ไม่ได้** (row lock บนแถวเดิมไม่กัน INSERT แถว burn ใหม่) → REDEEM พร้อมกันสองรายการต่าง idempotency_key อ่าน balance เท่ากัน ผ่าน check ทั้งคู่ → burn เกิน lot → user_coin ติดลบ + จ่ายซ้ำ **idempotency ไม่ช่วย** เพราะเป็นคนละ event

ทุก GRANT สร้างหนึ่งแถวใน `coin_lots` เป็น **lockable anchor**:

```sql
coin_lots                   -- lock-anchor + read-cache; rebuild ได้จาก ledger
  id                uuid PK            -- = lot_id ที่อ้างในทุก user_coin/coin_backing leg
  user_account_id   uuid FK → accounts (user_coin)
  funded_by         text NOT NULL      -- 'merchant:<id>' | 'sponsor:<id>'
  granted_minor     bigint NOT NULL    -- COIN-minor ที่ mint ตอน GRANT (immutable)
  remaining_minor   bigint NOT NULL    -- คงเหลือใน lot (mutable cache; = SUM ledger ของ lot นี้)
  expires_at        timestamptz NOT NULL
  state             enum  -- active | exhausted | expired | reversed
  city_id           uuid NOT NULL
  created_at        timestamptz
```

**กฎ concurrency (บังคับ):**
- **ทุก burn/credit ที่แตะ lot (REDEEM/EXPIRE/REFUND) ต้อง `SELECT … FROM coin_lots WHERE id=$lot FOR UPDATE` ก่อน** insert legs — ทำให้ REDEEM/EXPIRE/REFUND บน lot เดียวกัน **serialize** ผ่าน row lock จริง
- edge function ทั้งหมดรันที่ **isolation = REPEATABLE READ** เป็นอย่างต่ำ และใช้ `FOR UPDATE` บน lot เป็น serialization point ของ wallet นั้น
- หลัง insert burn legs ใน txn เดียวกัน อัปเดต `coin_lots.remaining_minor`/`state` (cache) — แล้ว trigger ตรวจ `remaining_minor = granted_minor − SUM(burn ของ lot) ≥ 0` มิฉะนั้น `RAISE EXCEPTION`
- `coin_lots` เป็น **cache**: nightly job rebuild `remaining_minor` จาก ledger และ alert ถ้า drift (A.8.6)

---

### A.6 Double-Entry Postings — ทุกเหตุการณ์ (สรุปทุก txn = 0 ต่อสกุล)

> สัญกรณ์: `Dr/Cr  account_type(owner)  amount  currency` ทุก txn มี `idempotency_key` หน่วยทั้งหมด = สตางค์ (THB) หรือ coin-minor (COIN, 1 COIN = 100 minor) ตัวอย่างใช้ 5,000฿ prefund และรางวัล 60฿ = 6,000 COIN-minor, take-rate 12%
>
> **funded-leg parameterization:** ทุก lifecycle posting (GRANT/REDEEM/EXPIRE/REFUND) เลือกบัญชี funder ตาม `funded_by`:
> `FUNDER_ESCROW := merchant_escrow(<id>) ถ้า funded_by='merchant:<id>'` | `sponsor_budget(<id>) ถ้า funded_by='sponsor:<id>'`
> `coin_backing` ทุก leg ต้องมี `funder_key = funded_by` (partition)

#### (1) PREFUND — Merchant เติม escrow 5,000฿ ผ่าน PSP (**บันทึก NET หัก fee**)
PSP หักค่าธรรมเนียม ~2–3% + fixed → เงินสดจริงที่จะ settle เข้าธนาคารเรา **น้อยกว่า gross** ต้องลง fee leg ตั้งแต่ money-in มิฉะนั้น escrow โต > เงินจริง (ละเมิด #4 ตั้งแต่ก่อน mint)

**1a. money-in authorized (ยังไม่ settle) — PSP กิน fee:**
สมมติ gross 500000, fee 2.9%+5satang ≈ 14505 → net 485495
```
txn_type=PREFUND, ref_type=escrow_topup, funded_by=merchant:123
Dr  psp_suspense(platform, psp=omise)   485495  THB   -- เงินที่จะ settle จริง (NET)
Dr  psp_fee_expense(platform, psp=omise) 14505  THB   -- ค่าธรรมเนียม PSP
Cr  merchant_escrow(M123)               500000  THB   -- credit merchant แบบ GROSS (นโยบาย default)
ตรวจ: SUM(THB DR)=485495+14505=500000=CR ✓
```
> **คำตัดสิน credit gross vs net (founder/finance call, default ในที่นี้ = GROSS):** เครดิต merchant เต็ม 500000 และแพลตฟอร์มรับ fee เป็น `psp_fee_expense` ของตัวเอง (ดูด fee เป็นต้นทุน acquisition) ทางเลือก NET (credit 485495) ทำได้โดยตัด fee leg แล้ว `Cr merchant_escrow=485495` — เลือกอันใดอันหนึ่ง **ทั้งระบบต้องเหมือนกัน** (ดู A.10 founder decisions)
> **สำคัญ:** `psp_suspense` ค้ำ mint ไม่ได้ (ยัง unsettled) ดู A.8.11

**1b. PSP_SETTLE — PSP payout เข้าบัญชีธนาคารเรา (settle จริง):**
```
txn_type=PSP_SETTLE, ref_type=psp_settle
Dr  bank_settlement(platform)           485495  THB   -- เงินสดจริงเข้าธนาคารเรา
Cr  psp_suspense(platform, psp=omise)   485495  THB   -- ล้าง suspense ที่ NET
ตรวจ: SUM(THB)=0 ✓ ; reconcile psp_suspense กับ statement PSP ที่ NET
```
> **migration #1: 1b เป็น MANDATORY ก่อน escrow จะ "available สำหรับ mint"** — เปลี่ยนจากดราฟต์เดิมที่ทำให้ 1b optional (นั่นเปิดช่อง platform float ละเมิด #4) ดู A.8.11: mint gating ใช้ `settled_available` ที่นับเฉพาะส่วนที่ผ่าน PSP_SETTLE แล้ว

#### (2) FUND_QUEST — Merchant/Sponsor ตั้ง reward pool (reservation เท่านั้น)
**คำตัดสิน: FUND_QUEST = reservation อย่างเดียว ไม่ post ledger; ledger ขยับตอน GRANT** — แต่ reservation **ต้อง enforce แบบ transactional** ไม่ใช่พึ่ง nightly cache (ดู A.8.7)
```
-- ไม่มี ledger leg —
-- INSERT escrow_locks(lock_reason='quest_pool', ref_id=quest_id, amount_minor=<pool>, state='active')
-- ภายใต้ FOR UPDATE บน escrow_wallet ของ funder + CHECK ว่า settled_available ≥ pool
```
> reservation นี้กิน `settled_available` (ดู A.9/A.8.7) GRANT จะ **release** reservation นี้ทีละส่วน (ดู (3))

#### (3) GRANT — User ทำ quest ครบ → mint 6,000 COIN-minor (มูลค่า 60฿) ให้ user
**สร้าง lot + ย้าย backing จาก quest_pool reservation → `coin_backing`** ในหนึ่ง txn (atomic):
```
txn_type=GRANT, funded_by=merchant:123, ref_type=coin_grant
-- 0) FOR UPDATE บน escrow_wallet(M123); ตรวจ settled_available ≥ 6000 (A.8.7/A.8.11)
-- 0) INSERT coin_lots(id=L1, funded_by='merchant:123', granted_minor=6000,
--      remaining_minor=6000, expires_at=now()+EXPIRY_DAYS, state='active')
-- 0) ลด/ปิด escrow_locks quest_pool reservation ลง 6000 (atomic, กัน double-reserve)  *** A.8.7 ***
-- THB: ย้ายจาก escrow available ไปค้ำใน coin_backing (long-lived, per funder)
Dr  merchant_escrow(M123)        6000  THB    (funded_by=merchant:123)
Cr  coin_backing(platform, funder=merchant:123)  6000  THB   (lot_id=L1)
-- COIN: เกิดหนี้สิน Coin + ใส่ wallet user (lot-tagged)
Dr  user_coin(user789)           6000  COIN   (lot_id=L1, expires_at=now()+EXPIRY_DAYS, funded_by=merchant:123)
Cr  coin_liability(platform)     6000  COIN   (lot_id=L1)
ตรวจ: SUM(THB DR=CR)=6000=6000 ✓   SUM(COIN DR=CR)=6000=6000 ✓
```
> **เปลี่ยนจากดราฟต์เดิม:** ขา THB ค้ำใน **`coin_backing`** (ไม่ใช่ `clearing`) — `clearing` กลายเป็น transient เท่านั้น แก้ปัญหา "clearing เป็นทั้ง transient และ long-lived" + ปัญหา commingle กับ AFFILIATE/PAYOUT
> **sponsor-funded:** เปลี่ยน `merchant_escrow(M123)` → `sponsor_budget(S45)` และ `funder=sponsor:45` ทุก leg
> หลัง GRANT: `coin_backing(funder=merchant:123)` ถือ THB 6,000 ค้ำ lot L1 ที่ยัง live — ปลดเมื่อ REDEEM/EXPIRE ของ lot L1 เท่านั้น (A.8.5)

#### (4) REDEEM — User เผา Coin ที่ Place (อาจคนละร้านจาก funder), take-rate 12%, **FIFO lot-based, ตรวจ expiry, ตรวจ self-redeem**
```
txn_type=REDEEM, ref_type=redemption
-- 0) เลือก lots ของ user789 ที่ expires_at > now() เรียง FIFO; FOR UPDATE ทุก lot ที่จะแตะ
--    ถ้า unexpired balance < ยอด redeem → REJECT (ไม่ partial เกินมี)
-- 0) anti-self-redemption gate (A.8.12): ถ้า redeeming_merchant == funder ของ lot
--    หรือ user ผูก KYC/device/payment เดียวกับ funder → route ไป EXPIRE-like (คืน funder) หรือ manual review
-- 0) burn FIFO ต่อ lot (ตัวอย่าง burn 6000 จาก lot L1 ทั้งก้อน)
-- COIN: burn ออกจาก wallet + ล้างหนี้สิน (lot-tagged)
Dr  coin_liability(platform)     6000  COIN   (lot_id=L1)
Cr  user_coin(user789)           6000  COIN   (lot_id=L1, expires_at=<ของ L1>)
-- THB: ปลด backing ของ lot นั้น (per funder) → จ่าย revenue + payable ร้านที่ให้ของ
Dr  coin_backing(platform, funder=merchant:123)  6000  THB   (lot_id=L1)  -- ปลดเฉพาะ backing ของ L1
Cr  platform_revenue(platform)    720  THB    -- take-rate 12% (round-half-even, residual; A.6(9))
Cr  merchant_payable(R)          5280  THB    -- 88% ให้ร้านที่ให้ของจริง (รอ payout)
-- 0) update coin_lots(L1).remaining_minor; ตั้ง state='exhausted' ถ้า 0
ตรวจ: SUM(COIN)=6000=6000 ✓   SUM(THB)=6000=720+5280 ✓
```
> **แก้ critical หลายข้อพร้อมกัน:** (a) REDEEM ตรวจ `expires_at > now()` ที่ burn-time → ปิด redeem-after-expiry TOCTOU; (b) FOR UPDATE บน lot + FIFO → ปิด double-redeem race และ EXPIRE-vs-REDEEM double-release (ทั้งคู่ contend lot lock เดียวกัน); (c) ปลด backing จาก **`coin_backing(funder)` ของ lot นั้นเป๊ะ** → ไม่รั่วข้าม funder; (d) anti-self-redemption เป็น control ระดับหนึ่ง (A.8.12) ปิดช่อง BoT e-money cash-out
> **partial redemption:** burn ข้าม lot ตาม FIFO ได้ — แต่ละ lot post คู่ COIN+THB ของตัวเอง (`lot_id` ของ lot นั้น) take-rate คำนวณต่อยอดรวม redeem ด้วย residual method (A.6(9)) แล้วกระจาย payable ตามสัดส่วน lot

#### (5) EXPIRE — Coin หมดอายุ → คืน backing (default = funder), policy-configurable + ต้องแจ้งเตือนก่อน
**ห้าม pre-spend breakage** — รับรู้เมื่อ EXPIRE เกิดจริง และปลายทาง THB กำหนดตาม **policy ที่ legal review แล้ว** (ดู A.10 + finding consumer-protection):
```
txn_type=EXPIRE, ref_type=expiry, funded_by=<ของ lot>
-- precondition: ส่ง pre-expiry notification + grace window ครบแล้ว (A.10.4)
-- 0) FOR UPDATE บน coin_lots(L1); idempotency_key = hash('EXPIRE', L1, expiry_run_id)  *** A.8.8 ***
-- COIN: ล้างหนี้ + burn wallet (lot-tagged)
Dr  coin_liability(platform)     6000  COIN   (lot_id=L1)
Cr  user_coin(user789)           6000  COIN   (lot_id=L1, expires_at=<ของ L1>)
-- THB: ปลด backing ของ lot นั้น → ปลายทางตาม breakage policy
Dr  coin_backing(platform, funder=merchant:123)  6000  THB   (lot_id=L1)
Cr  <BREAKAGE_DEST>              6000  THB
-- 0) coin_lots(L1).state='expired'
ตรวจ: SUM(COIN)=6000=6000 ✓   SUM(THB)=6000=6000 ✓
```
**`<BREAKAGE_DEST>` (คำตัดสิน policy, configurable per jurisdiction/contract — founder/legal call, ดู A.10):**
- `merchant_escrow(M123)` / `sponsor_budget(S45)` — **default: คืน funder** ("never pre-spend / platform keeps no breakage")
- `escheatment_liability(platform)` — ถ้า jurisdiction บังคับ unclaimed-property
- `platform_breakage(platform)` — เฉพาะถ้าสัญญา+กฎหมายอนุญาตให้แพลตฟอร์มเก็บ (ต้องมี legal sign-off)
> **เปลี่ยนจากดราฟต์เดิม:** breakage ฝั่ง COIN ใช้ 2 legs (ไม่มี `expiry_breakage` sink leg ที่สาม กัน double-count) — วัด breakage จาก `ref_type=expiry` ใน reporting ปลายทาง THB ต้องเป็น **first-class legal decision** ไม่ใช่ default ปริยาย และต้องผ่าน pre-expiry notification + grace (A.10.4) ก่อน post

#### (6) REFUND / REVERSAL — กลับ redemption (เช่น ร้านยิงผิด / ลูกค้าไม่ได้ของ)
**ไม่แก้แถวเดิม** — post txn ใหม่ `reverses_txn_id = <redeem txn>` กลับทิศทุก leg, **กลับด้วยจำนวนที่ stored (ไม่ recompute rounding)**:
```
txn_type=REFUND, reverses_txn_id=<T_redeem>, ref_type=reversal
-- 0) one_reversal_per_target constraint กัน double-refund (A.2); FOR UPDATE บน lot L1
-- 0) ถ้า merchant_payable(R) ถูก payout แล้ว → ต้อง clawback ก่อน (hard precondition, ดูล่าง)
-- กลับ COIN: คืน Coin เข้า wallet (lot เดิม) + ตั้งหนี้สินกลับ
Dr  user_coin(user789)           6000  COIN   (lot_id=L1, expires_at=REFUND_EXPIRY)
Cr  coin_liability(platform)     6000  COIN   (lot_id=L1)
-- กลับ THB: ดึง revenue + payable กลับมาค้ำใน coin_backing (จำนวนเดิมที่ stored: 720/5280)
Dr  platform_revenue(platform)    720  THB
Dr  merchant_payable(R)          5280  THB
Cr  coin_backing(platform, funder=merchant:123)  6000  THB   (lot_id=L1)
-- 0) coin_lots(L1).remaining_minor += 6000; state='active' (ถ้ายังไม่หมดอายุ)
ตรวจ: SUM(COIN)=6000=6000 ✓   SUM(THB)=6000=6000 ✓
```
> **คำตัดสิน REFUND expires_at (เลือกหนึ่ง, ปิด "or"):** `REFUND_EXPIRY = max(original_lot.expires_at, now() + REFUND_GRACE_DAYS)` โดย `REFUND_GRACE_DAYS` = ค่าคงที่ (เสนอ 30 วัน) — กัน Coin "เกิดมาก็หมดอายุทันที" และจำกัด window ที่ extend ได้ **และต้อง re-lock backing ใน `coin_backing` ตลอด window นั้น** (leg `Cr coin_backing` ข้างบนทำหน้าที่นี้แล้ว) coin_lots ตั้ง expires_at = REFUND_EXPIRY
> **double-refund / refund-then-redeem (แก้ critical):** (a) `one_reversal_per_target` constraint → REDEEM ถูกกลับได้ครั้งเดียว ป้องกัน coin-farming; (b) ถ้า payable ถูก payout ไปแล้ว → **clawback เป็น hard precondition** (post `Dr merchant_escrow(R)/Cr coin_backing` หรือ block จนกว่า clawback จาก payout รอบหน้าจะสำเร็จ) ไม่ใช่ async CS flow; (c) Coin ที่คืนมาใช้ lot เดิม ตรวจ expiry ปกติตอน REDEEM ครั้งถัดไป

#### (7) CHARGEBACK — PSP chargeback ของ PREFUND (**ลง exposure จริงเป็น asset ไม่ใช่ escrow ติดลบลอย**)
เงินที่เคยเข้า settle ถูกดึงกลับโดย PSP/ธนาคาร:
```
txn_type=CHARGEBACK, reverses_txn_id=<T_prefund>, ref_type=reversal
-- กรณีปกติ (escrow available พอ): กลับ money-in ที่ NET
Dr  merchant_escrow(M123)       485495  THB   -- ลด escrow ที่ available
Cr  bank_settlement(platform)   485495  THB   -- เงินจริงไหลกลับออก (ถ้า settle แล้ว)
-- (ถ้ายัง unsettled: Cr psp_suspense แทน bank_settlement)
ตรวจ: SUM(THB)=0 ✓
```
**กรณีเสี่ยง (escrow available < chargeback เพราะ baht ถูก lock ใน `coin_backing` ค้ำ Coin live หรือถูก redeem จ่ายร้านไปแล้ว):**
ห้ามปล่อย `merchant_escrow` ติดลบลอย ๆ (ซ่อน loss) — ส่วนที่เกิน available **ลงเป็น receivable จริง**:
```
-- post CHARGEBACK เท่าที่ available รองรับ + ส่วนขาดเป็น RECOVERY:
Dr  merchant_escrow(M123)       <available>   THB
Dr  merchant_receivable(M123)   <shortfall>   THB   -- *** exposure จริงบนงบ (Asset) ***
Cr  bank_settlement(platform)   485495        THB
-- ตั้ง merchant → PAYOUT_FROZEN + เปิด recovery case
```
> **แก้ critical/major:** เงินจริงไหลออกแล้ว chargeback ต้อง post ได้เสมอ — แต่ **loss ต้องปรากฏบนงบเป็น `merchant_receivable` (Asset)** ไม่ใช่ escrow ติดลบที่มองไม่เห็น Finance เห็น exposure จริง (A.5 advertise real-time exposure) ถ้า recovery ล้ม → `WRITE_OFF` (`Dr bad_debt_expense / Cr merchant_receivable`) ต้องมี **funded reserve** สำหรับ exposure นี้ และ alert ที่ aggregate (A.8.4) — นี่คือ founder/legal call เรื่องการตามเก็บหนี้ + ขนาด reserve (ดู A.10)
> **funder-default-after-redemption (แก้ critical):** ถ้า M123 chargeback **หลัง** R redeem ไปแล้ว (เงินอยู่กับ R/จ่ายออกแล้ว) → loss ตกที่ `merchant_receivable(M123)` (แพลตฟอร์มตามเก็บจาก funder ที่ผิดสัญญา) **ไม่ใช่ claw R** ที่ให้บริการโดยสุจริต — loss-allocation rule: **platform absorb เป็น bad-debt ที่มี funded reserve** เว้นแต่สัญญา R ระบุรับ settlement risk (ดู A.10) นี่คือเหตุผลที่ #4 ต้อง back mint ด้วย **settled cash** เท่านั้น เพื่อลดโอกาส chargeback หลัง settle

#### (8) CHURN_SWEEP — Merchant เลิกใช้ระบบ ทั้งที่ยังมี Coin ลูกค้าค้าง
Coin ลูกค้าค้ำด้วย `coin_backing(funder=merchant:123)` — **ไม่คืน prefund ส่วนที่ค้ำ Coin live จนกว่าจะ REDEEM/EXPIRE หมด**:
```
ขั้นที่ 1 (ตอน churn): หยุดรับ prefund/GRANT ใหม่ (set accounts.status='frozen')
  - escrow available ที่ว่าง (ไม่ค้ำ Coin) → คืน merchant ผ่าน PAYOUT ปกติ
  - baht ใน coin_backing(funder=merchant:123) ค้ำ Coin live → คงไว้ (ไม่แตะ ledger)
ขั้นที่ 2 (เมื่อ Coin live ทยอยหมดอายุ): post EXPIRE ปกติ (txn 5) — credit merchant_escrow(M123) ได้
  แม้ status='frozen'/'closed' (อนุญาต system-txn ที่ลด obligation; ดู A.1)
ขั้นที่ 3 (จัดการ leftover): ปลายทาง THB ที่เหลือหลัง Coin หมด:
  - คืน merchant: Dr merchant_escrow / (PAYOUT) — default
  - forfeit เข้าแพลตฟอร์ม (ถ้าสัญญา+กฎหมายอนุญาต):
        Dr  merchant_escrow(M123)  <leftover>  THB
        Cr  platform_breakage(platform) หรือ escheatment_liability(platform)  <leftover>  THB
        (ref_type=expiry/breakage) — *** ห้าม improvise; ต้องใช้ posting นี้เท่านั้น ***
```
> **แก้ minor:** branch "forfeit เข้าแพลตฟอร์ม" มี posting canonical ชัดเจน (`Dr merchant_escrow / Cr platform_breakage|escheatment_liability`) ไม่ปล่อยให้ implementer คิดเอง และต้อง reconcile กับ breakage policy เดียวกับ (5) — Coin ลูกค้ายัง honored จนหมดอายุ (คุ้มครองผู้บริโภค) leftover disposition = founder/legal call (ดู A.10)

#### (8b) CAMPAIGN_END — Sponsor campaign จบ ทั้งที่ยังมี Coin/budget ค้าง
```
ขั้นที่ 1: release un-granted quest_pool reservation ของ campaign (escrow_locks → state='released')
           → budget กลับเป็น sponsor_budget available
ขั้นที่ 2: Coin live ที่ออกไปแล้ว → honor จนหมดอายุ → EXPIRE (txn 5) credit sponsor_budget(S45)
ขั้นที่ 3: leftover sponsor_budget หลัง Coin หมด → คืน sponsor (PAYOUT) หรือ forfeit ตามสัญญา
           (posting เหมือน (8) ขั้น 3 แต่ owner = sponsor)
```
> **แก้ major:** sponsor-funded EXPIRE คืน **`sponsor_budget`** (ไม่ใช่ merchant_escrow) — ไม่ misroute backing ข้าม owner; un-granted reservation มี release path ชัดเจน

#### (8c) OWNERSHIP_TRANSFER — Place เปลี่ยนเจ้าของกลางคัน
```
txn_type=OWNERSHIP_TRANSFER, ref_type=ownership_transfer
-- ย้าย obligation จาก owner เก่า → ใหม่ atomic ใน txn เดียว:
Dr  merchant_escrow(OLD)        <available>  THB    Cr  merchant_escrow(NEW)  <available>  THB
Dr  merchant_payable(OLD)       <open>       THB    Cr  merchant_payable(NEW)  <open>       THB
-- coin_backing legs: re-tag funder_key เก่า→ใหม่ ด้วย reversal+repost (append-only):
Dr  coin_backing(funder=OLD)    <live>  THB         Cr  coin_backing(funder=NEW)  <live>  THB
-- update coin_lots.funded_by ของ lot ที่เกี่ยวข้อง: OLD→NEW (cache)
```
> **แก้ major:** ปิดช่อง "ownership change ทำลาย attribution A.8.5/A.8.6" — Coin ที่ออกใต้เจ้าของเก่า honored ต่อกับเจ้าของใหม่ตามสัญญาโอนกิจการ ทุกอย่างย้าย atomic หากไม่มี txn นี้ ห้ามอนุญาตให้ปิด/โอน account ที่ยังมี coin_backing live

#### (9) Rounding to satang — take-rate ที่ไม่ลงตัว (**banker's rounding + residual + drift monitor**)
```
ตัวอย่าง: redeem 6,005 COIN, take-rate 12% = 720.6 satang
คำตัดสิน rounding rule:
  take_rate_minor = round_half_even(total_burned_minor * take_rate_pct)   -- banker's rounding
  merchant_payable_minor = total_burned_minor − take_rate_minor           -- residual ลงฝั่ง merchant
→ 720.6 → take_rate = 721 ;  payable = 6005 − 721 = 5284
ตรวจ: 721 + 5284 = 6005 = ขา coin_backing ที่ปลด ✓ (ไม่มีสตางค์หาย)
```
> **แก้ major (directional bias):** เปลี่ยนจาก `round_half_up` → **`round_half_even` (banker's rounding)** เพื่อลบ bias ทิศเดียวที่เกิดเฉพาะกรณี tie .5 (half-up ดัน take-rate ขึ้นเสมอบน tie → โอนจาก merchant→platform สะสมข้าม micro-redemptions ล้านครั้ง) banker's rounding กระจาย tie สมดุล
> **กฎเหล็ก:** (a) residual method รับประกัน `take_rate + payable = total` เป๊ะ ไม่มี rounding sink account; (b) **reversal กลับด้วย stored integer take_rate เสมอ ห้าม recompute** (ป้องกัน forward+reverse ไม่ net เป็น 0); (c) **rounding-drift metric เข้า nightly reconcile** (A.11 step 6) + bound minimum redemption size เพื่อกัน satang-skim จาก micro-redemption ซ้ำ ๆ

---

### A.7 ตาราง txn_type → ขา (สรุป — funder-parameterized)

> `FUNDER := merchant_escrow(id) ถ้า funded_by=merchant:* ; sponsor_budget(id) ถ้า funded_by=sponsor:*`

| txn_type | ผูก ledger? | COIN legs | THB legs |
|---|---|---|---|
| `PREFUND` | ✓ | — | Dr psp_suspense(net) + Dr psp_fee_expense / Cr merchant_escrow(gross) |
| `PSP_SETTLE` | ✓ | — | Dr bank_settlement / Cr psp_suspense |
| `FUND_QUEST` | **✗ (reservation, transactional)** | — | — (escrow_locks + FOR UPDATE + settled-available check) |
| `GRANT` | ✓ | Dr user_coin(lot) / Cr coin_liability(lot) | Dr **FUNDER** / Cr coin_backing(funder, lot) |
| `REDEEM` | ✓ | Dr coin_liability(lot) / Cr user_coin(lot) | Dr coin_backing(funder, lot) / Cr platform_revenue + Cr merchant_payable(R) |
| `EXPIRE` | ✓ | Dr coin_liability(lot) / Cr user_coin(lot) | Dr coin_backing(funder, lot) / Cr **FUNDER** \| escheatment_liability \| platform_breakage |
| `REFUND` | ✓ | กลับ REDEEM (lot เดิม, expires_at=REFUND_EXPIRY) | กลับ REDEEM (stored amounts) → Cr coin_backing(funder, lot) |
| `CHARGEBACK` | ✓ | — | Dr merchant_escrow (+Dr merchant_receivable ถ้าขาด) / Cr bank_settlement\|psp_suspense |
| `RECOVERY` | ✓ | — | Dr bank_settlement / Cr merchant_receivable (เก็บหนี้คืนได้) |
| `WRITE_OFF` | ✓ | — | Dr bad_debt_expense / Cr merchant_receivable (เก็บไม่ได้) |
| `CHURN_SWEEP` | ✓ (เฉพาะ leftover) | — | Dr merchant_escrow / Cr (PAYOUT) \| platform_breakage \| escheatment_liability |
| `CAMPAIGN_END` | ✓ (เฉพาะ leftover) | — | Dr sponsor_budget / Cr (PAYOUT) \| platform_breakage \| escheatment_liability |
| `OWNERSHIP_TRANSFER` | ✓ | — | move escrow/payable/coin_backing OLD→NEW |
| `SUBSCRIPTION` | ✓ | — | Dr bank_settlement / Cr platform_revenue (monthly) **หรือ** Cr deferred_revenue (annual) |
| `SUBSCRIPTION_RECOGNIZE` | ✓ | — | Dr deferred_revenue / Cr platform_revenue (ทยอยรายเดือน) |
| `AFFILIATE` | ✓ | — | Dr clearing / Cr platform_revenue (clearing กลับ 0 ใน txn) |
| `PAYOUT` | ✓ | — | Dr merchant_payable / Cr clearing → Dr clearing / Cr bank_settlement (กลับ 0 ใน txn) |

---

### A.8 Invariants ที่ต้องเป็นจริงเสมอ (บังคับด้วย trigger / nightly reconcile job)

| # | Invariant | กลไกบังคับ |
|---|---|---|
| A.8.1 | **ทุก txn บาลานซ์ต่อสกุล:** `∀ txn, ∀ currency c: SUM(DR.amount where c) = SUM(CR.amount where c)` | `AFTER INSERT` deferred constraint trigger ต่อ txn ก่อน commit |
| A.8.1b | **clearing กลับ 0 ทุก txn:** `∀ txn: Σ(clearing DR) = Σ(clearing CR)` ภายใน txn เดียว (clearing transient จริง) | deferred trigger ต่อ txn |
| A.8.2 | **Corruption tripwire (ไม่ใช่ solvency):** `∀ c: SUM(DR)−SUM(CR)=0` ทั่ว ledger — **เป็น tautology ของ A.8.1** จับได้แค่บั๊กที่ bypass A.8.1 **ไม่ใช่สัญญาณ solvency** | nightly corruption check (ไม่ใช่ solvency reconcile) |
| **A.8.2s** | **★ Solvency anchor (เงินสดจริง) — ไม่ใช่ tautology:** ต่อ city `balance(bank_settlement) + balance(psp_suspense_settled_portion) ≥ balance(coin_liability)[THB-equiv] + Σ(merchant_escrow available) + Σ(sponsor_budget available) − balance(merchant_receivable)` | nightly reconcile **เทียบ statement ธนาคาร/PSP จริง** + page on-call ถ้า under-collateralized |
| A.8.3 | **No negative user_coin (per lot):** `coin_lots.remaining_minor ≥ 0` ทุก lot; `balance(user_coin(u)) ≥ 0` | **FOR UPDATE บน coin_lots row** + check ก่อน burn (REDEEM/EXPIRE/REFUND) + recompute trigger |
| A.8.4 | **No hidden loss / negative escrow:** `balance(merchant_escrow) ≥ 0` เสมอ — ส่วนขาดจาก CHARGEBACK/CHURN **ต้องลงเป็น `merchant_receivable` (Asset) + PAYOUT_FROZEN + recovery case + funded reserve** ห้าม escrow ติดลบลอย | chargeback handler + alert บน aggregate `SUM(merchant_receivable)` exposure |
| A.8.5 | **Coin backed 1:1 ต่อ funder (ไม่ใช่ tautology กับ clearing):** `∀ funder f, ∀ city: balance(coin_backing where funder=f)[THB] == Σ(live coin_liability ของ lot ที่ funded_by=f)[COIN]` | reconcile per funder per city: COIN-side = THB-side (partition บังคับให้ไม่รั่วข้าม funder) |
| A.8.6 | **Read-model ตรง ledger:** `escrow_wallets.*_cached`, `coin_lots.remaining_minor`, `escrow_locks` ทั้งหมด == ค่าที่ rebuild จาก ledger | nightly rebuild + drift alert (cache != ledger → page on-call) |
| A.8.7 | **Mint gating (settled + reservation atomic):** mint (GRANT) ได้เฉพาะเมื่อ `settled_available ≥ reward_cost` **และ** decrement quest_pool reservation ใน txn เดียวด้วย `SELECT … FOR UPDATE` บน escrow_wallet — `Σ(GRANT draws ต่อ reservation) ≤ reservation amount` | edge function `grant` (DB-enforced, ไม่พึ่ง nightly cache) |
| A.8.8 | **Idempotent + payload-bound:** `idempotency_key` UNIQUE; key ผูกกับ `request_hash` — **key ชนแต่ payload ต่าง → 409 error ไม่คืน txn เดิม**; EXPIRE key = `hash(lot_id, expiry_run)`; key มี TTL | UNIQUE + request_hash check + scope per actor/endpoint |
| A.8.9 | **Append-only:** ห้าม UPDATE/DELETE บน `ledger_entries`/`ledger_transactions` | REVOKE + block trigger |
| A.8.10 | **Sparks ไม่แตะเงิน:** ไม่มี leg currency=SPARK; Sparks อยู่เฉพาะ `spark_*` | enum constraint (currency ∈ {THB,COIN}) |
| **A.8.11** | **★ ห้าม mint/payout จากเงิน unsettled:** `settled_available := balance(merchant_escrow) ที่ทุน landed มาจาก PSP_SETTLE แล้วเท่านั้น` — เงินใน `psp_suspense` (unsettled) back mint ไม่ได้ และ PAYOUT จ่ายจาก `bank_settlement` เท่านั้น | settled-portion tracking + gate ใน grant/payout edge fn |
| **A.8.12** | **★ Anti-self-redemption (e-money boundary):** REDEEM ที่ `redeeming_merchant == funder(lot)` หรือ user ผูก KYC/device/payment เดียวกับ funder → **ห้ามสร้าง merchant_payable** ต้อง route → คืน funder (EXPIRE-like) หรือ manual review | gate ใน `redeem` edge fn (first-class control ไม่ใช่ CS afterthought) |
| **A.8.13** | **★ Sybil/farming cap:** per-(user,quest), per-(device/KYC,campaign) GRANT cap; reversal once-per-target (`one_reversal_per_target`) | grant/refund edge fn + EXCLUDE constraint |

---

### A.9 `escrow_wallets` / `escrow_locks` — read-model cache (ตัดสินชื่อ field + unit)

`escrow_wallets` **เป็น read-model cache เท่านั้น** ยอดจริงมาจาก ledger ทุกค่าหน่วย **satang (BIGINT)**:

```sql
escrow_wallets              -- cache; rebuild ได้จาก ledger เสมอ
  id                  uuid PK
  owner_type          enum   -- merchant | sponsor
  owner_id            uuid
  account_id          uuid FK → accounts   -- merchant_escrow/sponsor_budget (THB)
  city_id             uuid
  total_cached            bigint -- = balance(escrow account) [satang]
  settled_total_cached    bigint -- = ส่วนของ total ที่ landed ผ่าน PSP_SETTLE แล้ว [satang]  *** A.8.11 ***
  locked_cached           bigint -- = SUM(escrow_locks active) [satang] (quest_pool + ส่วนที่ไป coin_backing)
  available_cached        bigint -- = total_cached − locked_cached  [satang]
  settled_available_cached bigint-- = settled_total_cached − locked_cached  [satang] (ฐาน mint gating)
  low_balance_threshold   bigint -- satang; ต่ำกว่านี้ → auto-pause quest + alert
  status              enum   -- active | depleted | frozen
  updated_at          timestamptz

escrow_locks                -- reservation cache (rebuild จาก ledger coin_backing + quest reservations)
  id                  uuid PK
  escrow_wallet_id    uuid FK
  amount_minor        bigint  -- satang
  lock_reason         enum    -- quest_pool | coin_backing
  ref_id              uuid    -- quest_id / lot_id
  state               enum    -- active | released
  created_at          timestamptz
```

**คำตัดสินที่แก้ conflict ชื่อ field:**
- ดราฟต์เดิม `balance_cached` / `balance_satang` / `available_balance`+`locked_balance` → รวมเป็น **`total_cached` / `locked_cached` / `available_cached`** + เพิ่ม **`settled_total_cached` / `settled_available_cached`** (สำหรับ mint gating บน settled cash, A.8.11) ทั้งหมดเป็น cache derive จาก ledger
- หน่วย = **satang (BIGINT)** ทุกที่ (ตัดทิ้ง `numeric`)
- **`coin_grants.thb_value_locked` ถูกตัดทิ้ง** — 1:1 fixed (A.10.1) ทำให้ `coin_amount_minor` = THB ที่ lock เสมอ การเก็บแยกคือ dead column ที่เปิดช่องหลุด 1:1 (เก็บเฉพาะ `coin_amount_minor`; historical อยู่ใน ledger + `coin_lots`)

---

### A.10 คำตัดสินใหญ่ + ตารางรวมการ reconcile

#### A.10.1 — 1 COIN = 1 THB (ตัดสิน: FIXED 1:1)
**คำตัดสิน: 1 COIN = 1 THB = 100 satang คงที่ ตลอดไป (loyalty ชนะ datamodel)**
- เหตุผล: (1) liability check ตรงไปตรงมา — Coin live ทุก minor = satang ที่ lock เป๊ะ ไม่มี re-peg risk (2) ป้องกัน BoT มองเป็น e-money/stored-value ที่มี FX (3) `thb_value_locked` แยกจาก `coin_amount` = ช่องโหว่ ตัดทิ้ง
- abstract exchange rate ถูกปฏิเสธ — อยากให้ "Coin มูลค่าต่างกัน" ใช้ **reward ราคาต่างกัน** (X=50 Coin, Y=200 Coin)

#### A.10.2 — Offline redemption (ตัดสิน: online-only burn; offline = provisional opt-in, risk on merchant)
**คำตัดสิน: burn จริง + settle เงิน เกิด online เท่านั้น** — รองรับ **offline provisional capture** สำหรับ merchant opt-in:
- ออฟไลน์: merchant app ตรวจ signed voucher + one-time nonce → ออก **PROVISIONAL_BURN receipt** (ยังไม่ post ledger) เก็บ proof (nonce+GPS+timestamp+device_id) ใน outbox **พร้อม signed grace token** (ดูล่าง)
- ออนไลน์อีกครั้ง: server reconcile → ผ่าน → post `REDEEM` จริง (txn 4); fail (Coin ไม่พอ/ใช้ซ้ำ/ผิด geofence) → flag dispute, **ไม่ settle จ่าย**
- **ความเสี่ยงตกที่ merchant** ที่เลือกรับ offline (เหมือนรับเช็ค) กัน double-spend ด้วย one-time nonce + idempotency_key
- **★ provisional vs lot-expiry (แก้ minor):** signed voucher ฝัง `provisional_grace_until = expires_at + OFFLINE_GRACE` server **honor reconcile ของ outstanding nonce ได้ถึง grace นั้น แม้ EXPIRE cron จะ sweep lot ไปแล้ว** — ถ้า lot ถูก EXPIRE ไปก่อน reconcile แต่มี valid provisional receipt ภายใน grace → server **reverse EXPIRE บางส่วน (post REFUND-like คืน backing)** แล้ว post REDEEM (atomic, FOR UPDATE บน lot) มิฉะนั้น merchant ที่รับ voucher ถูกต้องจะถูกลงโทษ EXPIRE cron จึงต้อง **เช็คว่าไม่มี outstanding provisional nonce ก่อน sweep** (หรือ honor grace)
- migration #1: build **online-only ก่อน** (PROVISIONAL_BURN = Phase 2 flag per-merchant)

#### A.10.3 — ตารางรวมคำตัดสินที่ reconcile 4 ดราฟต์ + รอบ verifier v2

| ประเด็น | ดราฟต์เดิม / ปัญหา | คำตัดสิน |
|---|---|---|
| Entry shape | direction / signed / DR-CR | **direction enum DR/CR + amount_minor>0** |
| Currency enum | COIN\|THB\|SPARK | **{THB, COIN}** (SPARK ออก; FX แปลงที่ขอบ PSP เป็น THB) |
| Coin backing store | clearing (transient+long-lived ปนกัน) | **`coin_backing` per funder (long-lived); `clearing` transient เท่านั้น** |
| A.8.5 solvency | tautology (clearing==coin_liability) | **anchor กับเงินสดจริง (A.8.2s) + per-funder A.8.5** |
| PSP fee | PREFUND gross (escrow>cash) | **net booking + `psp_fee_expense`; reconcile suspense ที่ NET** |
| Settled vs authorized | 1b optional (platform float) | **1b (PSP_SETTLE) mandatory ก่อน mint; gate บน `settled_available`** |
| Lot linkage บน burn | ไม่มี (per-lot ตรวจไม่ได้) | **`lot_id`+`expires_at` บนทุก burn/backing leg + `coin_lots` lock-anchor + FIFO** |
| Concurrency burn | FOR UPDATE บน SUM (เป็นไปไม่ได้) | **FOR UPDATE บน `coin_lots` row** (REDEEM/EXPIRE/REFUND serialize) |
| Redeem-after-expiry | REDEEM ไม่เช็ค expiry | **REDEEM เช็ค `expires_at>now()` ที่ burn-time; cron = cleanup** |
| Sponsor lifecycle | hardcode merchant_escrow | **funder-parameterized (GRANT/REDEEM/EXPIRE/REFUND/CAMPAIGN_END)** |
| Self-redeem (e-money) | "founder/CS afterthought" | **A.8.12 first-class control (funder==redeemer → คืน funder/manual)** |
| Sybil/farming | mint gating แค่ pool-negative | **A.8.13 per-identity/campaign cap + reservation atomic** |
| Double-refund | reverses_txn_id ไม่ unique | **`one_reversal_per_target` constraint + clawback hard precondition** |
| Negative escrow | liability ติดลบ (ซ่อน loss) | **`merchant_receivable` (Asset) + reserve + bad_debt write-off** |
| Rounding | round_half_up (bias) | **round_half_even + residual + reverse stored value + drift monitor** |
| Missing accounts | bank_settlement/deferred/receivable/fee | **เพิ่มครบใน A.1** |
| Idempotency | ไม่ผูก payload | **ผูก `request_hash`; mismatch → 409; TTL; scope per actor** |
| Breakage legal | hardcode คืน merchant | **policy-configurable dest + pre-expiry notify + grace (A.10.4) + legal sign-off** |
| Ownership change | ไม่มี txn | **`OWNERSHIP_TRANSFER` atomic** |
| Offline vs expiry | ไม่ระบุ | **provisional grace token + EXPIRE cron honor outstanding nonce** |

#### A.10.4 — Breakage pre-expiry notification + grace (legal precondition)
ก่อน post EXPIRE ใด ๆ: ต้องส่ง **pre-expiry notification** ถึง user (เสนอ T-14 และ T-3 วัน) และผ่าน **grace window** ที่กำหนด (เสนอ ≥ 7 วันหลังวันหมดอายุที่แจ้ง) — เก็บ proof การแจ้งเป็น precondition ของ EXPIRE job ปลายทาง breakage (คืน funder / escheatment / platform-keep) ต้องผ่าน **legal sign-off ต่อ jurisdiction ก่อน migration #1 go-live** เพราะ posting hardcode อยู่ใน canonical

---

### A.11 สิ่งที่ทีม dev สร้างใน migration #1 (checklist)
1. ตาราง: `accounts`, `ledger_transactions`, `ledger_entries`, `coin_lots`, `escrow_wallets`, `escrow_locks`, `spark_balances`, `spark_events`, `coin_grants`(เก็บ `coin_amount_minor`+`expires_at` เท่านั้น), `redemptions`
2. Enums: `account_type` (ครบ A.1 รวม bank_settlement/coin_backing/deferred_revenue/merchant_receivable/bad_debt_expense/psp_fee_expense/platform_breakage/escheatment_liability), `currency` (THB|COIN), `direction` (DR|CR), `txn_type` (รวม PSP_SETTLE/CAMPAIGN_END/OWNERSHIP_TRANSFER/RECOVERY/WRITE_OFF/SUBSCRIPTION_RECOGNIZE), `ref_type`, `owner_type`
3. Constraints/triggers: `amount_minor>0`; balance-per-txn-per-currency=0 (deferred); **clearing-zero-per-txn (A.8.1b)**; append-only block (REVOKE+trigger); `idempotency_key` UNIQUE + `request_hash` bind; `one_reversal_per_target` EXCLUDE; `seq` bigserial; `lot_legs_have_expiry`; status-gate บน post เข้า frozen/closed account
4. `city_id NOT NULL` ทุกตารางการเงิน (multi-city ตั้งแต่วันแรก)
5. Edge functions (server-authoritative, txn เดียว, FOR UPDATE บน coin_lots/escrow_wallet):
   - `prefund` (net booking + fee leg), `psp_settle`
   - `grant` (mint gating บน **settled_available** + reservation decrement atomic + สร้าง coin_lots + Sybil cap A.8.13)
   - `redeem` (FIFO unexpired lots + FOR UPDATE + **expiry check** + **anti-self-redeem A.8.12** + take-rate banker's-rounding residual)
   - `expire` (cron, idempotency=hash(lot,run), FOR UPDATE, honor outstanding provisional nonce, breakage dest + notification precondition)
   - `refund` (one-reversal + clawback precondition + REFUND_EXPIRY re-lock backing)
   - `payout` (จาก bank_settlement; clearing-zero-per-txn)
6. Reconcile job (nightly): **A.8.2s (solvency anchor กับ bank/PSP statement จริง)** / A.8.5 (per funder) / A.8.6 (cache drift) / A.8.3 (lot non-negative) / **rounding-drift metric** / aggregate `merchant_receivable` exposure → alert/page on-call on drift
7. Reserve: **funded bad-debt reserve** สำหรับ `merchant_receivable` exposure (ขนาด = founder/finance call)

---

## B. Subscription Tiers, Take-Rate & Agent Compensation (Definitive)

> เอกสารนี้คือ **ฉบับชี้ขาด** ของโมเดลราคาทั้งหมด รวม subscription tier, take-rate, และค่าตอบแทน Field Agent ทุกตัวเลขและทุก ledger touchpoint align กับ **Spec A** (chart of accounts: `merchant_escrow:{id}`, `platform_revenue`, `clearing`, `user_wallet`, `coin_liability`, `coin_expired`; `ledger_transaction` + `ledger_entry` แบบ append-only double-entry, จำนวนเงินเก็บเป็น `amount_minor` หน่วยสตางค์ = 1/100 บาท)
>
> หลักการเหนือทุกอย่าง: **แพลตฟอร์มไม่เคยสำรองเงิน** Coins mint ได้ต่อเมื่อมี baht ใน escrow รองรับ Sparks ไม่เกี่ยวกับเงินใด ๆ Take-rate และ subscription ลงเป็น CR `platform_revenue` เสมอ payout/clawback ของ agent เดินผ่าน `clearing`
>
> **หมายเหตุ take-rate:** Spec A ระบุช่วง `take_rate_pct ~10–15% capped` (ตัวอย่าง REDEEM ใน Spec A ใช้ 12%) เอกสารนี้เลือก **flat 10%** เป็น default เปิดตัว (ขอบล่างของช่วง เพื่อ adoption) ปรับขึ้นได้ผ่าน `platform_config` โดยไม่ต้อง migrate — ไม่ขัด Spec A

---

### B.1 Subscription Tier — ตารางชี้ขาด (4 tiers)

**การตัดสิน:** ใช้ **4 tiers** โดยรวมจุดแข็งของทั้ง 3 ดราฟต์ — Free (claimed) เป็นปากทาง (PLG funnel), แล้วไต่ขึ้น `starter → growth → pro` ราคาอิง draft monetization (390/990/1,690) เพราะเป็นชุดที่มี Free + 3 paid ครบที่สุดและ anchor ราคาดีสำหรับ SME เชียงใหม่ ตัด tier `chain` ออกจาก "ชั้นราคา" แต่เก็บเป็น **add-on multi-location** บน Pro (ดู B.1.3) — ทำให้ enum สอดคล้องกับ datamodel ที่มีแค่ไม่กี่ค่า

**`subscriptions.plan` enum (ชี้ขาด):** `free | starter | growth | pro`
(migration #1 ต้อง **เปลี่ยน** enum เดิม `basic/pro/chain` → ค่าใหม่นี้ ; `chain` กลายเป็น flag `is_chain boolean` + `location_count int` บน Pro)

#### B.1.0 จุดยืนของ Pro (กันการขายผิดกลุ่ม — verifier MAJOR)
**Pro คือ SKU สำหรับผู้ประกอบการ multi-location (4–10 สาขา) เป็นหลัก ไม่ใช่ร้านเดี่ยว** — verifier ชี้ถูกว่า solo cafe ไม่จ่าย 2,490฿/เดือนเพื่อ analytics ดังนั้น:
1. **ลดราคา Pro entry → 1,690฿/เดือน** (จาก 2,490) เพื่อให้ช่อง 990→Pro ไม่ห่างจนกลวง
2. **ย้าย high-value analytics (export CSV/API, attribution, benchmark ย่าน) ออกมาเป็น add-on `analytics_pro` ราคา +390฿/เดือน ที่ซื้อบน Growth ได้** — ทำให้ single-location power user ซื้อ analytics ได้โดยไม่ต้องกระโดดทั้งชั้น
3. Pro ขายด้วย value "หลายสาขา + billing เดียว + seats เยอะ + placement สูงสุด" ไม่ใช่ analytics เดี่ยว
4. **Build-gate (ต้องทำก่อน lock ราคา Pro):** ทีม CM ต้องนับจำนวน F&B operator ที่มี **4–10 สาขา** จริงใน catchment (Nimman/นิมมาน + ย่านเป้าหมาย) → ถ้า < ~30 บัญชี ให้พิจารณายุบ Pro เป็น add-on `analytics_pro` + `multi_location` บน Growth แทนการมีชั้น Pro แยก (เก็บเป็น `platform_config.PRO_TIER_ENABLED`)

#### B.1.1 ตารางราคา + สิ่งที่ปลดล็อก

| Capability | **Free (Claimed)** | **Starter** | **Growth** | **Pro (multi-location SKU)** |
|---|---|---|---|---|
| ราคา / เดือน (THB) | 0 | **390** | **990** | **1,690** |
| ราคา / ปี (THB, −2 เดือน) | 0 | **3,900** | **9,900** | **16,900** |
| ส่วนลดรายปี | — | 16.7% (จ่าย 10 ได้ 12) | 16.7% | 16.7% |
| # Places (listings) | 1 | 1 | 3 | 10 (เพิ่มได้ผ่าน add-on) |
| ยืนยันความเป็นเจ้าของ (claim) | ✅ | ✅ | ✅ | ✅ |
| Deals พร้อมใช้งาน (active) | 1 | 3 | 10 | ไม่จำกัด |
| สร้าง **Quest Step** เข้าร่วม cross-merchant quest | ❌ | ✅ (เข้าร่วมที่ platform/sponsor สร้าง) | ✅ | ✅ |
| สร้าง **Quest เอง** (self-serve solo-merchant quest) | ❌ | ❌ | ✅ (1 active) | ✅ (ไม่จำกัด) |
| **Escrow Wallet + mint/redeem Coins** | ❌ (ดูหมายเหตุ) | ✅ | ✅ | ✅ |
| Analytics depth | นับ view/ทิศทาง (7 วัน) | + redemption funnel (30 วัน) | + cohort/retention, audience split (TH/EN/ZH), 12 เดือน | + (รวม add-on `analytics_pro`) export CSV/API, benchmark ย่าน, attribution |
| Featured placement | ❌ | หมุนเวียนในย่าน (best-effort) | featured ในหมวด (1 slot) | featured อันดับต้น + ป้าย "Verified Pro" + 1 sponsored-quest slot ลดราคา/ปี |
| Reply รีวิว / รูปจากร้าน | จำกัด (reply) | ✅ | ✅ + แกลเลอรี | ✅ + วิดีโอ |
| ผู้ใช้งาน (seats) ต่อบัญชี | 1 | 2 | 5 | 15 |
| Support | community | email (48 ชม.) | email (24 ชม.) | priority + onboarding call |
| Take-rate ที่จ่ายตอน redeem | n/a | **10%** (ดู B.2) | **10%** | **10%** |

**Add-on ข้ามชั้น:**
- `analytics_pro` (**+390฿/เดือน**): ปลดล็อก export CSV/API + attribution + benchmark ย่าน — **ซื้อได้บน Growth และ Pro** (รวมอยู่ใน Pro แล้ว) ; แก้ปัญหา single-location power user ที่อยากได้ analytics โดยไม่ต้องขึ้น Pro
- `multi_location` (ดู B.1.3)

#### B.1.2 หมายเหตุ Escrow บน Free tier (กฎข้อบังคับ)
- Free tier **ไม่มีสิทธิ์เปิด Escrow Wallet เอง** → mint Coins ไม่ได้ (สอดคล้อง Spec A: Coins เกิดเฉพาะตอนมี escrow รองรับ)
- **ข้อยกเว้นเดียว:** Free place สามารถเป็น **Quest Step** ในเควสต์ที่ **sponsor/platform** เป็นผู้ฟันด์ (escrow ของ sponsor) — ร้านได้ footfall ฟรีโดยไม่ต้องจ่ายรางวัลเอง นี่คือ **upgrade hook** หลัก: ร้านเห็นคนเดินเข้าจาก quest แล้วอยากออก deal เอง → อัป Starter
- เป้าหมาย Free = **claim density** (ให้ทุกร้านใน DB มีเจ้าของมายืนยัน) ไม่ใช่รายได้

#### B.1.3 Multi-location (แทน tier `chain` เดิม)
- เก็บบน **Pro** เป็น add-on: `is_chain = true`, `location_count`
- ราคา add-on: **+490 ฿/location/เดือน** (location ที่ 11 เป็นต้นไป; 10 แรกรวมใน Pro)
- ทุก location ใช้ analytics/quest/escrow ของ Pro ร่วม billing เดียว
- **Founder call:** brand/enterprise (>20 สาขา) ให้ทำเป็น **custom contract** ไม่อยู่ในตารางนี้ (default ที่แนะนำ: ราคาต่อรองรายปี + min commit)

#### B.1.4 Trial & billing
- ทุก paid tier: **30 วัน trial** (`subscriptions.status = trial`) ไม่ต้องผูกบัตร แต่ต้องเติม escrow ขั้นต่ำ 500 ฿ ก่อนเปิด redemption
- `billing_cycle = monthly | annual` (ตรง Spec A) ; annual = จ่าย 10 เดือนได้ 12
- Billing ผ่าน PSP (Omise/2C2P/Fiuu, PromptPay) → ออก `invoices` → post `platform_revenue` (ดู B.4)

---

### B.2 Take-Rate Model — ชี้ขาด: **Flat 10% + effective-rate floor (กัน regressive)**

**การตัดสิน: เลือก FLAT 10% ไม่ผูกกับ tier** เหตุผล:
1. **ความง่ายในการสื่อสาร/ขาย** — Field Agent (นักศึกษา) อธิบายได้ใน 1 ประโยค: "จ่าย 10% ของมูลค่าที่ลูกค้าแลกจริง"
2. **กันแรงจูงใจผิดเพี้ยน** — take-rate แบบ inverse (Starter จ่ายแพงกว่า Pro) จะ "ลงโทษร้านเล็ก" ที่เพิ่งเริ่ม ทำให้ churn สูง การเก็บ value-add ส่วนเพิ่มควรไปอยู่ที่ **subscription** ไม่ใช่หักจากเงินรางวัลที่ลูกค้าได้รับ
3. **ตรง Spec A** ที่ระบุ `take_rate_pct ~10–15% capped` — เลือกขอบล่าง (10%) เพื่อ adoption แล้วค่อย A/B ขึ้นทีหลังด้วย parameter ไม่ใช่ migration

**แก้ปัญหา cap แบบ regressive (verifier MAJOR):** ดราฟต์เดิมตั้ง flat cap 20฿ ทำให้รางวัลมูลค่าสูง (เช่น 1,000฿ → 20฿ = 2.0% effective) จ่ายอัตราต่ำกว่ารางวัลเล็ก (กาแฟ 25฿ → 2.5฿ = 10%) **ซึ่งเป็น regressive ที่ขัดหลักการ "ไม่ลงโทษร้านเล็ก" ของ B.2 เอง** ฉบับชี้ขาดจึงเปลี่ยนเป็น:
- **ยกเลิก flat cap** แบบบาทคงที่
- ใช้ **effective-rate band**: take-rate ต้องอยู่ในช่วง **6%–10% ของ `thb_settlement` เสมอ** (กล่าวคือ cap ที่ "ไม่ต่ำกว่า 6% effective" แทน "ไม่เกิน 20฿") → รางวัล 1,000฿ จ่าย 100฿ (10%) ไม่ได้รับส่วนลดถอยหลัง ; เส้นโค้งไม่ regressive อีกต่อไป
- ถ้าต้องการ "ผ่อน" รางวัลมูลค่าสูงจริง ใช้ **soft taper**: 10% สำหรับส่วน ≤ 300฿ และ 6% สำหรับส่วนที่เกิน 300฿ (marginal) — ยังคง progressive/flat ไม่มีจุดที่ร้านเล็กอุดหนุนร้านใหญ่

**Micro-redemption (resolve ทันที ไม่ deferral):** verifier ชี้ว่า floor 2฿ บนกาแฟ 25฿ = 10% เป็น drag กับร้านเล็กที่เราอยากได้ → **ชี้ขาด: floor = 0 สำหรับ redemption ที่ `thb_settlement` < 30฿** (ไม่เก็บ take-rate กับรางวัลจิ๋ว) ; ตั้งแต่ 30฿ ขึ้นไปใช้ 10% ปกติ ตัด `MICRO_REDEMPTION_MIN` ที่ค้างเป็น "Founder call" ออก

**พารามิเตอร์ชี้ขาด (เก็บใน `platform_config`, ปรับได้โดยไม่ต้อง migrate):**

| พารามิเตอร์ | ค่า default | หมายเหตุ |
|---|---|---|
| `TAKE_RATE_PCT` | **10%** | flat ทุก tier |
| `TAKE_RATE_MIN_EFF_PCT` | **6%** | effective rate ต้องไม่ต่ำกว่า 6% ของ `thb_settlement` (แทน flat cap แบบบาท) — กัน regressive |
| `TAKE_RATE_TAPER_THRESHOLD_THB` | **300 ฿** | ส่วนของ settlement ที่เกิน threshold คิด marginal 6% (soft taper) ; ส่วน ≤ threshold คิด 10% |
| `MICRO_REDEMPTION_FREE_BELOW_THB` | **30 ฿** | redemption ที่ `thb_settlement` < 30฿ → take-rate = 0 (ไม่กิน margin ร้านกาแฟราคาถูก) |

**สูตร (ชี้ขาด):**
```
if thb_settlement < MICRO_REDEMPTION_FREE_BELOW_THB:        take_rate_thb = 0
else:
  base   = min(thb_settlement, TAPER_THRESHOLD) × 0.10
  excess = max(thb_settlement − TAPER_THRESHOLD, 0) × 0.06
  take_rate_thb = round(base + excess)            # effective rate อยู่ใน 6%–10% เสมอ, ไม่ regressive
```
> ผลลัพธ์: กาแฟ 25฿ → 0 ; รางวัล 45฿ → 4.50฿ (10%) ; รางวัล 300฿ → 30฿ (10%) ; รางวัล 1,000฿ → 30 + 700×0.06 = 72฿ (7.2% effective, ยังสูงกว่า floor 6%) — เส้นโค้ง monotonic ไม่มีจุดที่ร้านเล็กจ่ายอัตราสูงกว่าร้านใหญ่

#### B.2.1 Posting ใน ledger (ต้องตรง Spec A เป๊ะ)
ตอน `redemptions.status → settled` ระบบ post **1 `ledger_transaction` (txn_type=`REDEEM`)** ที่มี 4 legs (sum = 0 ต่อสกุล) ; ตัวอย่างนี้ใช้ redemption มูลค่า 50฿ (take-rate 10% = 5฿):

```
txn: REDEEM, funded_by=merchant:123, ref_type=redemption, idempotency_key=redemption.id
  // ขา COIN — เผา Coins ของผู้ใช้
  - user_wallet:{user_id}        −5000  COIN     (เผา 50 COIN)
  + coin_liability                +5000  COIN     (ลด liability ฝั่ง platform)
  // ขา THB — settle escrow → ร้าน/clearing + take-rate
  - merchant_escrow:123          −5000  THB(สตางค์)  (หัก 50.00 ฿ จาก escrow ที่ล็อก)
  + clearing                     +4500  THB        (45.00 ฿ มูลค่ารางวัลสุทธิที่ settle ให้ฝั่งร้าน)
  + platform_revenue             +500   THB        (take_rate_thb = 5.00 ฿ = 10% ของ 50฿)
SUM(COIN)=0 ✓   SUM(THB)=0 ✓
```
> หมายเหตุ: Spec A ตัวอย่าง REDEEM ใช้ `merchant_payout:123` รับส่วนของร้านโดยตรง — เอกสารนี้เลือก route ผ่าน `clearing` (settlement queue) แล้วค่อยจ่ายออก เป็น superset ที่ compatible ; ถ้า migration #1 ใช้ `merchant_payout` ให้แทน `clearing` leg ด้วย `merchant_payout:{id}` ตัวเลขเท่ากัน

- `ref_type = take_rate_fee` ใช้กับ leg ที่เข้า `platform_revenue` (ตรง enum Spec A: `take_rate_fee`)
- เก็บค่าลง `redemptions.take_rate_pct` (effective), `redemptions.take_rate_thb`, `redemptions.thb_settlement`, `redemptions.ledger_txn_id`
- **Invariant:** ไม่มี redemption ใดที่ effective take-rate < 6% (ยกเว้น micro-redemption < 30฿ ที่ = 0) ; บังคับด้วย CHECK ตอนคำนวณ ก่อน post
- **Reversal/dispute:** post txn ใหม่ `txn_type=REFUND` ที่กลับทุก leg ด้วย `reversal_of` ห้ามแก้แถวเดิม (Spec A INVARIANT 2)

#### B.2.2 Breakage (Coins หมดอายุ) — ใครได้เงินคืน
- Coins expiring (Spec A): ตอน `EXPIRE` baht ที่ lock ใน escrow **คืนกลับ `merchant_escrow`** ไม่เข้า `platform_revenue` (กัน e-money/consumer-protection issue) — platform ได้ take-rate **เฉพาะตอน redeem จริง** เท่านั้น
- **Founder call:** จะเก็บ "breakage fee" 0–3% ตอนคืน escrow หรือไม่ — **default ที่แนะนำ: ไม่เก็บ (0%)** ในปีแรกเพื่อ trust แล้วค่อยพิจารณา

#### B.2.3 Redemption-abuse / collusion controls (verifier MISSING — เพิ่มใหม่)
redemption count ป้อนทั้ง take-rate revenue **และ** freshness micro-bonus ของ agent จึงต้องมี guard กัน inflate:
- **Same-user repeat cap:** ผู้ใช้คนเดียวแลก deal เดียวกันที่ร้านเดียวกันได้สูงสุด **N ครั้ง/รอบเวลา** (`platform_config.SAME_USER_REDEEM_CAP`, default 1/วัน, 4/เดือน) ; เกินกว่านั้น redemption ไม่ settle (status `flagged`)
- **Trust-tier gate:** นับเป็น redemption ที่ก่อ take-rate/bonus เฉพาะที่ trust tier ≥ `verified_visit`/`proven_purchase` (ตรง Spec A trust tier) — กัน self-redeem ปลอม
- **Agent–merchant collusion flag:** ถ้าร้านที่ agent คนหนึ่งเป็น `sold_by_agent_id` มี redemption velocity ผิดปกติ (z-score เทียบ cohort ย่าน) → freeze ทั้ง take-rate posting (review) และ freshness micro-bonus ของ agent นั้นจน manual clear ; เก็บ flag ลง `redemptions.review_status`
- **Self-redeem block:** ห้าม account ที่ผูกกับ merchant/agent เดียวกันเป็นผู้แลกรางวัลของร้านตัวเอง

---

### B.3 Field-Agent Compensation — ชี้ขาด: **ได้ทั้งสองส่วน (Dual-track)**

**การตัดสิน: Agent ได้ค่าตอบแทน 2 แทร็กพร้อมกัน** เพราะมันคือ **2 งานคนละชนิด** ที่ Spec A แยกไว้:
- **Track 1 — Data freshness (task bounty):** จ่ายต่อ `task` ที่ `approved` ผ่าน change-proposal pipeline (งาน "moat")
- **Track 2 — Sales (subscription commission):** จ่ายเมื่อ agent ปิดการขาย subscription (`subscriptions.sold_by_agent_id`)

การให้แค่อย่างเดียวจะพัง: ถ้าให้แค่ commission → ไม่มีใครดูแล data freshness ของร้านที่ไม่ยอมจ่าย ; ถ้าให้แค่ bounty → ไม่มีแรงจูงใจปิดการขาย ทั้งคู่จำเป็นต่อ flywheel

#### B.3.1 Track 1 — Task Bounty (ค่าความสด)

| `task_type` | Base bounty (THB) ต่อ task ที่ `approved` | Sparks (ให้ user-account ของ agent ด้วย) |
|---|---|---|
| `seed_new_place` (สร้างร้านใหม่ + รูป + พิกัด + เวลา) | **35 ฿** | 200 |
| `refresh_photos` | **15 ฿** | 80 |
| `verify_hours` | **12 ฿** | 60 |
| `confirm_closed` (ยืนยันร้านปิด — กัน DB เน่า) | **20 ฿** | 100 |
| `onboard_merchant` (พา merchant เข้า + claim Free) | **60 ฿** (มี clawback — ดูกฎ) | 300 |
| `activate_escrow` (merchant เติม escrow ครั้งแรก ≥ 500฿ **หรือ** เปิด deal แรก) | **30 ฿** (bonus เล็ก, มี clawback) | 150 |
| `activate_real` (มี redemption settle จริง ≥ N ครั้ง **หรือ** escrow ถูก consume จริง) | **120 ฿ (activation bonus หลัก)** | 500 |

**แก้ fake-activation (verifier CRITICAL):** ดราฟต์เดิมจ่าย bonus 120฿ ตอน "เติม escrow 500฿ ระหว่าง trial" ซึ่ง **refundable เต็มจำนวน** (B.2.2 breakage 0%) → merchant เติมแล้วถอนคืน, agent เก็บ 120฿ ฟรี ฉบับชี้ขาดจึง **แยก activation เป็น 2 ขั้น**:
1. `activate_escrow` (เติม escrow / เปิด deal) → bonus เล็ก **30฿** เท่านั้น
2. `activate_real` (**redemption settle จริง ≥ `ACTIVATION_MIN_REDEMPTIONS` (default 3) หรือ escrow ถูก consume จริง ≥ 50%**) → bonus หลัก **120฿** ผูกกับ economic event จริง ไม่ใช่ deposit ที่ขอคืนได้

**กฎ Track 1 (ชี้ขาด):**
- จ่ายเฉพาะเมื่อ `tasks.status = approved` (Content Moderator อนุมัติ change_proposal) — งานที่ `rejected` ได้ 0 ฿ (anti-spam)
- เก็บลง `tasks.reward_thb` / `tasks.reward_spark` (ตรง Spec A)
- **Bounty clawback (verifier CRITICAL — เพิ่มใหม่):** `onboard_merchant`, `activate_escrow`, `activate_real` มี **clawback window 90 วัน** — ถ้าร้าน churn หรือ "ไม่ transact จริง" (redemption settle < `ACTIVATION_MIN_REDEMPTIONS` หรือ subscription cancel) ภายใน 90 วัน → **เรียกคืน bounty 100%** (post กลับผ่าน `clearing`/`platform_expense` แบบ `AGENT_CLAWBACK`) ; เก็บ `tasks.clawback_status`, `tasks.clawback_at`
- **Reserve-hold:** bounty `activate_real` จ่ายจริง 70% ทันที, กัน 30% เป็น `agent_reserve` ปล่อยเมื่อร้านผ่าน 90 วันโดยไม่ churn (กัน cash-out แล้วหนี)
- **Accept-rate (data quality) multiplier:** ตัวคูณ bounty ตาม `agents.quality_score` (= approval rate ของ change_proposals)
  | quality_score (rolling 30d) | multiplier |
  |---|---|
  | ≥ 0.95 | **×1.20** |
  | 0.85–0.949 | ×1.00 |
  | 0.70–0.849 | ×0.80 |
  | < 0.70 | **×0.50 + เข้า coaching** ; < 0.55 ติดต่อกัน 2 รอบ → `agents.status = suspended` |
- **Merchant-quality score (verifier CRITICAL — มิติใหม่ แยกจาก quality_score):** เพิ่ม `agents.merchant_quality_score` = ฟังก์ชันของ (paid-retention rate ของร้านที่ agent เซ็น 90 วัน, redemption activity เฉลี่ย, clawback rate) — quality_score เดิมวัดแค่ data approval **ไม่ได้วัดว่าร้านจ่ายเงิน/ใช้งานจริง** จึงต้องมีมิตินี้แยก ; `merchant_quality_score < 0.6` rolling → ลด commission multiplier (B.3.2) เป็น ×0.8 และเข้า review
- **Density/territory cap:** จ่าย base bounty เต็มเฉพาะร้านที่อยู่ใน `territory` ของ agent และยังไม่ saturated ; ร้านที่ density gate ของย่านเต็มแล้ว → bounty ×0.5

#### B.3.2 Track 2 — Subscription Sales Commission

| เหตุการณ์ | Commission | เงื่อนไข |
|---|---|---|
| **ขาย subscription ใหม่** (new paid tier, invoice แรก paid) | **20% ของ MRR เดือนแรก** | starter 78฿ / growth 198฿ / pro 338฿ |
| **Annual upfront ใหม่** | **20% ของ 1 เดือน** (ไม่ใช่ 20% ของทั้งปี) | กัน payout ก้อนโตเกิน + ลด clawback risk |
| **Renewal** (ทุกการต่ออายุที่ผ่าน) | **5% ของ MRR เดือนนั้น** | จ่ายให้ agent ที่เป็น `sold_by_agent_id` เดิม ตราบที่ agent ยัง `active` |
| **Upgrade** (เช่น starter→growth) | **20% ของ "ส่วนต่าง MRR"** เดือนแรก | นับเป็น new revenue บางส่วน |

**กฎ Track 2 (ชี้ขาด):**
- ผูกกับ `subscriptions.sold_by_agent_id` (ตรง Spec A)
- **Commission trigger = invoice แรก paid จริง (หลัง trial)** ไม่ใช่ตอน sign — verifier ชี้ว่า paid tier มี 30-วัน trial ไม่ผูกบัตร ดังนั้น commission เลื่อน ≥ 30 วัน ; ถ้า trial ถูกทิ้ง (ไม่ convert) → agent ได้แค่ onboard/activate (ที่มี clawback) **commission 78฿ ไม่เกิดเลย** — สอดคล้องหลัก "จ่ายเมื่อมี revenue"
- **Clawback window = 30 วัน:** ถ้า merchant cancel/refund/chargeback ภายใน 30 วันหลัง invoice แรก → **เรียกคืน commission ใหม่ 100%** (post กลับผ่าน `clearing`)
- **Renewal commission ไม่มี clawback** (จ่ายหลังเงินเข้าจริงแล้ว)
- Recurring **freshness micro-bonus:** ทุกเดือนที่ร้าน (ที่ agent คนนี้ดูแล) ยังมี `data_freshness.freshness_label = fresh` **และ** subscription ยัง active → agent ได้ **10 ฿/ร้าน/เดือน** (เพดาน 40 ร้าน/agent/เดือน = สูงสุด 400฿) ตัดจ่ายถ้า label หล่นเป็น aging/stale

#### B.3.3 Steady-state / post-saturation income model (verifier MAJOR — เพิ่มใหม่)
ดราฟต์เดิม model แค่ "ตอน acquisition" ไม่เคย model ว่าเมื่อ territory เต็ม (Nimman มีจำนวนร้านจำกัด) agent จะเหลือรายได้เท่าไร — verifier ถูก: รายได้ใหม่ ~258฿/ร้าน ต้องเซ็น ~32 ร้านใหม่/เดือนเพื่อได้ 8,000฿ ซึ่งทำไม่ได้หลัง saturate ; recurring เดิม cap ที่ ~1,180฿/เดือน (5%×40 starter renewal 780 + freshness 400) **ต่ำกว่าค่าแรงขั้นต่ำ** สำหรับงาน data steward ที่เป็น "moat" ฉบับชี้ขาดแก้ดังนี้:
1. **ยก recurring ceiling:** renewal commission 5% → **8%** สำหรับ agent ที่ `merchant_quality_score ≥ 0.8` ; freshness micro-bonus เพดาน 40 → **80 ร้าน** (สูงสุด 800฿) → steady-state base ≈ 80 starter × (8%×390=31.2 + 10) ≈ **บนหลัก 3,000–3,300฿/เดือน** สำหรับ steward ที่ดูแล portfolio เต็ม (ยังไม่รวม task refresh bounty รายเดือน)
2. **Stewardship retainer:** agent ที่ territory `saturated` และคง `merchant_quality_score ≥ 0.8` + portfolio freshness ≥ 90% → ได้ **retainer คงที่ `platform_config.STEWARD_RETAINER` (default 2,500฿/เดือน)** แทน new-signing income ที่หายไป — ผูกกับผลลัพธ์ (freshness/retention) ไม่ใช่ schedule (กัน reclassify เป็นลูกจ้าง ดู B.3.6)
3. **Graduation path:** agent ที่ saturate territory + คุณภาพสูง → เลื่อนเป็น **`city_manager` / multi-territory lead** (override 1–2% ของ revenue ใน territory ที่ดูแล + ค่าคุม junior agents) — สร้าง career ladder ให้ best agents ไม่ churn พา freshness หนีไปด้วย
4. **เก็บ parameter ทั้งหมดใน `platform_config`** (`RENEWAL_PCT_TIERED`, `FRESHNESS_BONUS_CAP_SHOPS`, `STEWARD_RETAINER`, `CITY_MANAGER_OVERRIDE_PCT`)

#### B.3.4 Ledger posting ของ payout/clawback (ผ่าน Clearing — ตรง Spec A)
Payout ของ agent **ไม่ใช่ Coins** เป็น THB จริง เดินผ่าน `clearing`:

```
txn: AGENT_PAYOUT, ref_type=agent_payout (เพิ่มใน enum), funded_by=platform
  - clearing             −{net}  THB   (เงินออกไปจ่าย agent ผ่าน PSP/โอน)
  + platform_expense     +{gross} THB  (บัญชี expense — เพิ่มใน chart: account_type=platform_expense)
  // ขา withholding (ถ้าหัก ณ ที่จ่าย)
  + wht_payable          +{wht}  THB   (ภาษีหัก ณ ที่จ่ายค้างนำส่งสรรพากร ; net = gross − wht)
SUM(THB)=0 ✓
```
- ใช้ **`platform_expense`** + **`wht_payable`** เป็น account ใหม่ที่ migration #1 ต้องเพิ่มใน chart of accounts (Spec A enum `account_type` ขยายเป็น: `... | platform_expense | wht_payable`)
- **Clawback:** post txn `AGENT_CLAWBACK` กลับทิศ (debit `platform_expense`, credit `clearing`) อ้าง `reversal_of` — ใช้กับทั้ง commission clawback (B.3.2) และ bounty clawback (B.3.1)
- **SoD (Spec A):** คน "สร้าง" payout (Finance/Payout role) ≠ คน "อนุมัติ" (Platform Owner/City Manager) — บังคับใน DB ก่อน post

#### B.3.5 Withholding-tax & employment status (Thailand)
- **Freelance agents** (`agents.affiliation = freelance`): จ่ายแบบ "ค่าจ้างทำของ/บริการ" → **หัก ณ ที่จ่าย (WHT) 3%** ออกหนังสือรับรอง 50 ทวิ ทุกครั้งที่ payable ≥ 1,000฿/เดือน ; agent ต้องมี `kyc_status = verified` + เลขประจำตัวผู้เสียภาษีก่อนรับเงินก้อนแรก
- **CMU/Payap students / staff** (`affiliation = cmu | payap | staff`): **Founder/Legal call** — default ที่แนะนำ: ทำเป็น **freelance/บริการ (หัก 3%)** ช่วงแรกเพื่อความคล่องตัว + ไม่ต้องขึ้นทะเบียนประกันสังคม ; ถ้าโตเกิน ~20 คน full-time ค่อยพิจารณาเปลี่ยน `staff` บางส่วนเป็นลูกจ้าง (payroll + ประกันสังคม + WHT แบบเงินเดือน ม.40(1))
- **เกณฑ์แยกลูกจ้าง vs freelance** (กันความเสี่ยงแรงงาน): freelance ต้องคุมเอง — เลือกเวลา/territory ได้, ไม่มี fixed schedule, จ่ายตามผลงาน (task/commission/retainer ผูกผลลัพธ์) ไม่ใช่เงินเดือนคงที่ ถ้าเริ่มกำหนดกะ/สั่งงานรายวัน → เข้าข่ายลูกจ้าง ต้องเปลี่ยนสัญญา **(stewardship retainer ใน B.3.3 ต้องผูกกับ KPI ผลลัพธ์ ไม่ใช่ชั่วโมงทำงาน เพื่อคงสถานะ freelance)**

#### B.3.6 WHT-under-clawback & lumpy-income handling (verifier MINOR — เพิ่มใหม่)
- **WHT recovery ตอน clawback:** ถ้า commission/bounty ถูก claw หลังนำส่ง WHT แล้ว → **ไม่ขอคืนจากสรรพากรเป็นรายการ** แต่ **net กับ payout/PND.3 รอบถัดไป**: ลด WHT base ของเดือนถัดไปด้วยจำนวนที่ claw (`wht_payable` debit รอบใหม่) ; ถ้าข้ามปีภาษีให้ปรับ ภงด.3 ผ่าน amended filing — เก็บ `agent_payout.wht_adjusted_ref` ชี้รายการ original
- **Lumpy income / 50 ทวิ deterministic:** เกณฑ์ "≥ 1,000฿/เดือน" ทำให้บางเดือนออก 50 ทวิ บางเดือนไม่ออก → **ชี้ขาด: หัก WHT 3% ทุก payout ที่ ≥ 1,000฿ ในรอบ และออก 50 ทวิ สรุปรวม "รายเดือน" เสมอ** (ไม่ใช่ต่อรายการ) ; payout < 1,000฿ สะสมยกไปรวมในเดือนถัดไปเพื่อให้เกณฑ์ deterministic — เก็บ `agent_wht_ledger` (period, gross, wht, fifty_tawi_no)
- reconcile `wht_payable` กับการนำส่ง ภงด.3 รายเดือนทุกสิ้นเดือน

#### B.3.7 Unit economics ของ agent — CAC เดียว + contribution-LTV ที่ reconcile (verifier MINOR — แก้ไข)
**นิยาม CAC เดียว ใช้ทุกที่ (fully-loaded):** `CAC = onboard(60) + activate_escrow(30) + activate_real(120) + first-month commission + amortized data cost`
- amortized data cost ต่อร้าน (seed/refresh เฉลี่ย) = **~120฿**
- **CAC (Free→Starter, fully-loaded)** = 60 + 30 + 120 + 78 (commission) + 120 (data) = **408฿**
- **CAC (Free→Pro)** = 60 + 30 + 120 + 338 + 120 = **668฿**

> ดราฟต์เดิมใช้ CAC=258 ในที่หนึ่งและ 378 ในอีกที่ในย่อหน้าเดียวกัน (inconsistent) — ฉบับนี้ pin **CAC=408฿ (Starter)** ใช้ทุกที่

**Contribution-LTV (สมมติ Starter อยู่เฉลี่ย 14 เดือน, sub gross margin 85%) — bridge เต็ม:**
| รายการ | ฿ ตลอด 14 เดือน |
|---|---|
| Subscription gross margin (390×14×0.85) | +4,641 |
| Take-rate revenue สุทธิ (สมมติ ~150฿/เดือน margin หลัง settlement cost) | +2,100 |
| − Renewal commission (8%×390×13 รอบ ต่อ) | −406 |
| − Freshness micro-bonus (10×14) | −140 |
| − Payment/PSP processing (~2.5% ของ sub+take) | −~230 |
| **Contribution LTV** | **≈ +5,965฿** |

- **LTV:CAC** = 5,965 / 408 ≈ **14.6** (สูงกว่าเป้า 3 มาก แม้รวม recurring agent payout + take-rate แล้ว)
- **Payback (sub-only contribution):** margin Starter หลัง renewal 8% (31.2฿) + freshness 10฿ ≈ 390×0.85 − 41 ≈ 290฿/เดือน → คืน CAC 408฿ ใน **~1.4 เดือน** (รวม data cost) — ยังต่ำกว่าเป้า 6–9 เดือนมาก
- **Target cost ต่อ verified+activated listing:** seed(35) + onboard(60) + activate_escrow(30) + activate_real(120) ≈ 245฿ + overhead quality/density ≈ **เป้า ≤ 280฿** (ขึ้นจากเดิมเพราะ activation แยก 2 ขั้น แต่ตัวเลขจริงสะท้อน economic event จริง ไม่ใช่ deposit ปลอม)

---

### B.4 Subscription posting ใน ledger (เสา a)
ตอน invoice paid (PSP webhook):
```
txn: SUBSCRIPTION, txn_type=SUBSCRIPTION, ref_type=subscription, funded_by=merchant:123
  - clearing             −{amount}  THB   (เงินเข้าจาก PSP ผ่าน clearing)
  + platform_revenue     +{amount}  THB
SUM(THB)=0 ✓
```
- `invoices.amount, psp_ref, paid_at, status` (ตรง Spec A) ; commission ของ agent **ไม่หักจาก leg นี้** แต่ post แยกเป็น `AGENT_PAYOUT` (B.3.4) เพื่อให้ revenue gross ชัด

---

### B.5 ตัวอย่าง BLENDED revenue ต่อ merchant/เดือน (worked — แก้ sponsored-quest over-count)

สมมติร้านกาแฟ **Growth tier** (990฿/เดือน) ในนิมมาน:
- **Subscription:** 990 ฿ → `platform_revenue +990`
- **Redemptions เดือนนั้น:** 180 ครั้ง, รางวัลเฉลี่ย `thb_settlement` = 45 ฿/ครั้ง
  - take_rate ต่อครั้ง = 45 < 300 threshold → 45×0.10 = **4.50 ฿** (45฿ ≥ 30฿ micro-floor จึงเก็บ)
  - รวม take-rate = 180 × 4.50 = **810 ฿** → `platform_revenue +810`
- **Sponsored quest (expected-value weighted):** ดราฟต์เดิมบวก 400฿ ทั้งก้อน แต่ระบุเองว่ามีแค่ ~1/3 ของร้านเข้าร่วม sponsored quest ในเดือนหนึ่ง — verifier ถูก: **expected value = 400 × 1/3 = ~133฿** ไม่ใช่ 400 (และเงินนี้มาจาก sponsor escrow ไม่ใช่ร้าน) ; รายงานเป็น expected contribution เท่านั้น

| แหล่ง | ฿/เดือน | ledger account | หมายเหตุ |
|---|---|---|---|
| Subscription | 990 | `platform_revenue` | จากร้าน |
| Take-rate (180×4.50) | 810 | `platform_revenue` | จากร้าน |
| Sponsored-quest (EV-weighted ~1/3 participation) | ~133 | `platform_revenue` | **จาก sponsor escrow ไม่ใช่ร้าน** — รายงานแยก, ห้าม double-count ข้าม merchant |
| **Blended revenue / merchant / เดือน** | **≈ 1,933 ฿** | | (เดิม overstate ที่ 2,200) |

> **Sponsor-escrow attribution (verifier MISSING):** sponsored-quest revenue ต้องถูก allocate ตาม **redemption attribution จริง** ของแต่ละ campaign (1 sponsor escrow → กระจายตาม redemption ที่เกิดจริงต่อร้าน) **ห้ามบวก 400฿ ทับทุกร้านในแคมเปญ** เพราะจะ double-count เงิน sponsor ก้อนเดียวข้าม P&L หลายร้าน ; รายงาน sponsored-quest เป็น **platform line item แยก** พร้อม `campaign_id` attribution

หัก agent renewal commission 8%×990 = 79.2฿ + freshness micro-bonus 10฿ → **net contribution ≈ 1,844 ฿/เดือน/ร้าน Growth** (ไม่รวม sponsored ที่เป็น sponsor money)

---

### B.6 ตัวอย่าง ROI ฝั่ง merchant — sensitivity-driven (verifier CRITICAL — re-derived)

> **คำเตือนสำคัญ (verifier CRITICAL):** ROI ของร้านขึ้นกับ **incrementality** (สัดส่วน redemption ที่เป็นลูกค้าใหม่/ที่ "ไม่มาถ้าไม่มี deal") อย่างวิกฤต deal/discount app ขึ้นชื่อเรื่อง incrementality ต่ำเพราะดึงลูกค้าเดิมที่ sensitive ราคา (cannibalization) งานวิจัย loyalty/discount มัก land ที่ **10–30%** ดราฟต์เดิมใช้ **60% เป็นค่าเดียว** ซึ่ง optimistic เกินและทำให้ทั้ง pitch เปราะ ฉบับนี้ present **ช่วง 20–30% เป็น base, 60% เป็น upside เท่านั้น** และระบุ **break-even**

**ต้นทุนคงที่ของร้าน/เดือน (ที่ 180 redemptions, รางวัลเฉลี่ย 45฿):**
- ต้นทุนรางวัล COGS (มูลค่าหน้าร้าน 180×45 = 8,100฿ ; ต้นทุนส่วนเพิ่มจริง ~50%) = **4,050 ฿**
- Subscription = 990 ฿ ; Take-rate = 810 ฿
- **ต้นทุนรวม ≈ 5,850 ฿/เดือน**

**รายได้ส่วนเพิ่มต่อ incremental visit:** ยอดใช้จ่ายสุทธิ/visit = 130฿, margin 55% → กำไร/visit = **71.5฿**

**Break-even incrementality:** ต้องมี incremental visits ที่ 5,850 / 71.5 ≈ **81.8 visits** = 81.8/180 ≈ **≈ 45.5%** → **ต่ำกว่า ~46% ร้านขาดทุน**

**Sensitivity table (verifier MISSING — เพิ่ม):**

| Incrementality | Incremental visits | กำไรส่วนเพิ่ม (visits×71.5) | − ต้นทุนรวม 5,850 | **กำไรสุทธิ/เดือน** |
|---|---|---|---|---|
| 10% | 18 | 1,287 | −5,850 | **−4,563 ฿** (ขาดทุนหนัก) |
| 20% (base-low) | 36 | 2,574 | −5,850 | **−3,276 ฿** (ขาดทุน) |
| 25% | 45 | 3,218 | −5,850 | **−2,632 ฿** (ขาดทุน) |
| 30% (base-high) | 54 | 3,861 | −5,850 | **−1,989 ฿** (ขาดทุน) |
| **~45.5% (break-even)** | **82** | **5,850** | −5,850 | **≈ 0 ฿** |
| 60% (upside เท่านั้น) | 108 | 7,722 | −5,850 | **+1,872 ฿** (+32%) |

**ข้อสรุปบังคับ (build-ready):**
1. **ที่ incrementality เชิงอนุรักษ์ (20–30%) ดีลขาดทุนสำหรับร้าน** ตามโครงสร้างปัจจุบัน — ตัวเลข +1,870฿/+32%/ROAS 2.9× ในดราฟต์เดิม **ใช้เป็น selling point ไม่ได้** เพราะอิง 60% ล้วน
2. **Sales script ต้อง quote break-even (~46%) ไม่ใช่ best-case** และต้องวัด incrementality จริงต่อร้าน (new-vs-returning ผ่าน trust tier / first-visit flag ใน Spec A) ก่อนสัญญา ROAS
3. **ถ้าเศรษฐศาสตร์ไม่ปิดที่ 25% incrementality** ต้องปรับ structure: ลด reward COGS (เพดานมูลค่ารางวัล/redemption, cap redemptions/เดือน), หรือปรับ take-rate ลงสำหรับร้านที่ proven low-incrementality — **เป็น Founder call ที่ต้อง resolve ก่อน GA pricing**
4. **Requirement ใหม่:** redemption-level incrementality measurement (`redemptions.visitor_type = new | returning` จาก first-visit flag) เป็น **blocking** สำหรับการ enable ROAS messaging

---

### B.7 สรุป parameter ที่ migration #1 ต้องสร้าง (`platform_config`)
ทุกตัวเลขราคา/อัตราด้านบนเก็บใน `platform_config` (key-value, มี `effective_from`) **ไม่ hardcode** ; enum `subscriptions.plan` และ chart of accounts ต้องอัปเดตตาม B.1/B.3.4

| key | default | ref |
|---|---|---|
| `TAKE_RATE_PCT` | 10% | B.2 |
| `TAKE_RATE_MIN_EFF_PCT` | 6% | B.2 |
| `TAKE_RATE_TAPER_THRESHOLD_THB` | 300 | B.2 |
| `MICRO_REDEMPTION_FREE_BELOW_THB` | 30 | B.2 |
| `SAME_USER_REDEEM_CAP` | 1/วัน, 4/เดือน | B.2.3 |
| `ACTIVATION_MIN_REDEMPTIONS` | 3 | B.3.1 |
| `BOUNTY_CLAWBACK_DAYS` | 90 | B.3.1 |
| `RENEWAL_PCT_TIERED` | 5% / 8% (quality≥0.8) | B.3.2/B.3.3 |
| `FRESHNESS_BONUS_CAP_SHOPS` | 80 | B.3.3 |
| `STEWARD_RETAINER` | 2,500฿ | B.3.3 |
| `CITY_MANAGER_OVERRIDE_PCT` | 1–2% | B.3.3 |
| `PRO_TIER_ENABLED` | true (ทบทวนตาม B.1.0 build-gate) | B.1.0 |
| `analytics_pro` add-on | +390฿/เดือน | B.1.1 |

chart of accounts ใหม่ที่ต้องเพิ่ม (Spec A `account_type`): `platform_expense`, `wht_payable` ; `txn_type` ใหม่: `AGENT_PAYOUT`, `AGENT_CLAWBACK` ; `ref_type` ใหม่: `agent_payout`

---

## C. Legal & Regulatory Posture (Thailand)

> **คำเตือนสำคัญ (Disclaimer):** เอกสารนี้เป็น **design guidance / แนวทางการออกแบบระบบ** เพื่อให้ทีม dev สร้าง migration #1 และวาง business logic ให้สอดคล้องกับกฎหมายไทยตั้งแต่ต้น **มิใช่ความเห็นทางกฎหมาย (NOT legal advice)** และไม่ก่อให้เกิดความสัมพันธ์ทนายความ-ลูกความ ทุก "RECOMMENDED posture" ในที่นี้ต้องได้รับการ **review โดยทนายไทยที่มีใบอนุญาต** (เน้นสาย fintech / payment / PDPA / tax) ก่อน launch จริง ทุกหัวข้อจึงปิดท้ายด้วยคำถาม **"ASK YOUR LAWYER THIS"** ที่เจาะจงพอจะเอาไปคุยกับทนายได้ทันที กฎหมายและ notification อ้างอิงสถานะ ณ มิถุนายน 2026

---

### C.0 หลักการกำกับดูแลที่เป็นกระดูกสันหลัง (Reconciliation Anchor)

ความขัดแย้งหลักของ draft เดิมคือ: draft หนึ่งมอง **"Coins" เป็น stored-value / e-money** (จึงกลัวต้องขอ e-money license และ apply FIBA), อีก draft มองเป็น **"closed-loop loyalty points"** (ไม่อยู่ใต้กำกับเลย) เราตัดสินด้วยหลักกฎหมายเดียวที่ชี้ขาดทั้งระบบ:

> **e-money ตาม พ.ร.บ.ระบบการชำระเงิน พ.ศ. 2560 (Payment Systems Act B.E. 2560) นิยามว่าคือมูลค่าที่ "ผู้ใช้บริการได้ชำระเงินล่วงหน้าให้แก่ผู้ให้บริการ" (payment of money has been made to the service provider in advance) เพื่อใช้แทนเงินสด** จุดชี้ขาดคือ **"เงินไหลจากผู้ใช้ → ผู้ออก"**

> **หมายเหตุเรื่องถ้อยคำตามตัวบท:** นิยาม e-money ในตัวบทเปิดด้วยถ้อยคำว่า **"บัตรอิเล็กทรอนิกส์ที่ผู้ให้บริการออกให้ ... โดยผู้ใช้บริการได้ชำระเงินล่วงหน้า"** ("electronic card issued by a service provider ... whereby payment of money has been made to the service provider in advance") กล่าวคือตัวบทใช้คำว่า "บัตรอิเล็กทรอนิกส์" เป็น form factor ในการเขียนนิยาม **แต่ในทางปฏิบัติ ธปท. บังคับใช้กับ stored value แบบ network/app-based ด้วย** (ตัว พ.ร.บ. และประกาศลำดับรองไม่ได้จำกัดเฉพาะบัตรพลาสติก) ดังนั้น **องค์ประกอบที่เป็น trigger จริงคือ "ผู้ใช้ชำระเงินล่วงหน้า" ไม่ใช่รูปแบบว่าเป็นบัตรหรือ token ใน app** — ซึ่งตอกย้ำหลัก substance-over-form ใน C.1 และทำให้การวิเคราะห์ app-token ของเรายังตั้งอยู่บนฐานที่ถูกต้อง

ดังนั้น **Coins ต้องถูกออกแบบให้ผู้ใช้ไม่เคยจ่ายเงินซื้อ Coins เลย** Coins เกิดจาก merchant prefund escrow แล้ว mint เป็น "reward" ให้ user ฟรี นี่คือเหตุผลทางกฎหมายว่าทำไม **"Coins ต้อง merchant-funded เท่านั้น และห้าม top-up ด้วยเงิน user เด็ดขาด"** — ถ้าวันใด user ซื้อ Coins ด้วยเงิน ระบบจะกลายเป็น e-money ทันที **(นี่คือ INVARIANT ที่บังคับใน schema, ไม่ใช่แค่ policy)**

หลักนี้ส่งผลให้ทั้งระบบสอดคล้องกัน: Coins = non-cashable, no P2P, no cash-out, merchant-funded, expiring → **อยู่นอก e-money และนอก FIBA**; Escrow = ค่าบริการการตลาดที่ merchant จ่ายล่วงหน้า (ไม่ใช่เงินฝากของ public) → **อยู่นอก deposit-taking**

---

### C.1 "Coins" อยู่นอกการกำกับ e-money / stored-value ของ ธปท. หรือไม่

**Regulatory question:** Coins (non-cashable, expiring, redeem ได้เฉพาะที่ Place ของ merchant) เข้านิยาม "เงินอิเล็กทรอนิกส์ (e-money)" ตาม **พ.ร.บ.ระบบการชำระเงิน พ.ศ. 2560** และประกาศ ธปท. ว่าด้วย designated payment services หรือไม่ ถ้าเข้า ต้องขอ e-payment license จากรัฐมนตรีคลังโดยคำแนะนำของ ธปท.

**RECOMMENDED design posture:** ออกแบบให้ Coins **อยู่นอกนิยาม e-money โดยโครงสร้าง** ด้วย invariant ต่อไปนี้ (บังคับใน ledger + RLS + Edge Function):

1. **No user funding (จุดชี้ขาด):** ผู้ใช้ห้ามซื้อ/เติม Coins ด้วยเงินทุกช่องทาง Coins minted จาก Escrow Wallet ของ merchant/sponsor เท่านั้น — เพราะ e-money ต้องมี "การชำระเงินล่วงหน้าโดยผู้ใช้" ซึ่งไม่เกิดขึ้น (เทียบหลักสากล: loyalty points ที่ "ซื้อได้ด้วยเงิน" มักเข้าข่าย e-money, ส่วนที่ "ได้มาฟรี" ไม่เข้า)
2. **Non-cashable / No cash-out:** Coins แลกได้เฉพาะ reward in-kind ที่ Place ห้ามถอนเป็นเงินสด/โอนเข้าบัญชี
3. **No P2P transfer:** ห้ามโอน Coins ระหว่างผู้ใช้ (ตัด "money transfer service")
4. **Merchant-scoped redemption:** Coins burn ที่ Place ของ merchant ผู้ prefund — ใกล้เคียง closed-loop มากที่สุด
5. **Expiring:** มีวันหมดอายุชัดเจน (ตอกย้ำว่าเป็น promotional reward ไม่ใช่ store of value)
6. **แยก Sparks ออกขาด:** Sparks = soft XP ไม่มีมูลค่าบาท ไม่ redeemable — ไม่แตะกฎหมายการเงินเลย

ใน T&C ต้องระบุชัดว่า Coins เป็น **"promotional reward / สิทธิประโยชน์ส่งเสริมการขาย"** ไม่ใช่เงินหรือ stored value และไม่มีมูลค่าเงินสด

> **ข้อควรเน้น (closed-loop ไม่ใช่ข้อยกเว้นในไทย):** ใต้กฎหมายไทย ธปท. แบ่ง e-money เป็น 3 ประเภท คือ single-purpose, multi-purpose-restricted และ multi-purpose-unrestricted — **ทั้งสามประเภทอยู่ในนิยาม e-money ทันทีที่มีองค์ประกอบ "ผู้ใช้ชำระเงินล่วงหน้า"** ต่างจากบางประเทศที่ closed-loop/single-purpose ได้รับยกเว้นโดยอัตโนมัติ ดังนั้น **เกราะกันของเราคือ "user ไม่ได้จ่ายเงิน" ไม่ใช่ "ใช้ที่เดียว/closed-loop"** — การใช้เฉพาะที่ Place ของ merchant เป็นเพียงปัจจัยเสริม ไม่ใช่ฐานยกเว้นด้วยตัวมันเอง

**Residual risk:** ธปท. ใช้แนวทาง **substance-over-form** หาก redemption network ขยายจน Coins ใช้ได้ "กว้างเหมือนเงิน" ข้าม merchant จำนวนมาก หรือถ้า marketing สื่อสารว่า Coins "มีค่าเท่ากับ X บาท" จน user มองเป็นเงิน ธปท. อาจตีความเข้า e-money ได้ นอกจากนี้แม้แต่ single-purpose e-money (จ่ายให้ผู้ให้บริการรายเดียว) ก็เป็น *category* ที่ต้องพิจารณา — เกราะกันคือ "user ไม่ได้จ่ายเงิน" ไม่ใช่ "ใช้ที่เดียว"

**ASK YOUR LAWYER THIS:** *"ภายใต้ พ.ร.บ.ระบบการชำระเงิน พ.ศ. 2560 และประกาศ ธปท. ว่าด้วย designated payment services — reward token ที่ (ก) ผู้ใช้ไม่เคยจ่ายเงินซื้อ, (ข) minted จากเงิน prefund ของ merchant, (ค) แลกได้เฉพาะสินค้า/บริการที่ Place ของ merchant นั้น, (ง) ห้ามถอนเงิน/โอน/หมดอายุ — ถือว่าอยู่นอกนิยาม e-money และไม่ต้องขอ e-payment license ใช่หรือไม่ และมีเพดานจำนวน merchant ใน redemption network หรือลักษณะการตลาดใดที่จะ trip เข้า e-money?"*

---

### C.2 Merchant Prepaid Escrow เสี่ยงเป็น deposit-taking / unlicensed payment business หรือไม่

**Regulatory question:** การที่ platform ถือเงิน prefund ของ merchant ใน Escrow Wallet เข้าข่าย **"รับฝากเงินจากประชาชน" (accepting deposits from the public)** ตาม **พ.ร.บ.ธุรกิจสถาบันการเงิน พ.ศ. 2551 (Financial Institution Business Act, FIBA B.E. 2551)** หรือเป็น payment/e-money business ที่ต้องขอใบอนุญาตหรือไม่
> *(หมายเหตุชื่อทางการ: คำแปลทางการของ ธปท. ใช้ชื่อ "Financial Institution Business Act" — ใช้ "Institution" เอกพจน์ เวลาให้ทนายค้นตัวบทควรใช้ชื่อนี้)*

**RECOMMENDED design posture:** วางโครงสร้าง escrow ให้ **ไม่เข้านิยาม "เงินฝาก"** (FIBA จับ "การรับฝากเงินจากประชาชนที่ถอนคืนได้เมื่อทวงถามหรือเมื่อครบกำหนด"):

1. **เป็นค่าบริการการตลาดที่ชำระล่วงหน้า ไม่ใช่เงินฝาก:** สัญญา merchant ระบุชัดว่า prefund คือ **"การชำระล่วงหน้าสำหรับบริการการตลาด/loyalty (prepaid marketing/loyalty services)"** ที่ platform เป็นผู้ให้บริการ ไม่ใช่เงินที่ฝากไว้เพื่อถอนคืน
2. **Non-refundable on demand:** เงินใน Escrow **ถอนคืนเป็นเงินสดเมื่อทวงถามไม่ได้** ถูก ring-fence ไว้ใช้ mint Coins/จ่าย reward เท่านั้น (อาจอนุญาต refund ส่วนที่ยังไม่ commit เป็น Coins ตามเงื่อนไขสัญญา แต่ไม่ใช่ on-demand demand deposit) — นี่คือจุดแยกจาก deposit
3. **ไม่ใช่ "ประชาชน":** คู่สัญญาเป็น **merchant ที่ทำสัญญา B2B** ไม่ใช่การเปิดรับฝากจากบุคคลทั่วไป
4. **Ring-fenced / segregated:** เก็บเงิน escrow ในบัญชีแยกต่างหาก (segregated client account) ไม่ปนเงินดำเนินงาน platform; **Clearing Account** เป็นบัญชี settlement ภายในเชิงบัญชี ไม่ใช่ที่เก็บเงิน
5. **Platform เป็น agent/ผู้ให้บริการ ไม่ advance เงินเอง:** ตรงกับหลัก "platform never advances money" — Coins ที่ redeemed จะ settle ออกจาก escrow ของ merchant เท่านั้น
6. **ใช้ PSP ที่มี license สำหรับ money movement:** การรับเงินจาก merchant และจ่าย payout ผ่าน **Thai PSP ที่มีใบอนุญาตอยู่แล้ว** (Omise/2C2P/Fiuu) — platform ไม่ทำหน้าที่ payment service provider เอง

โครงสร้างนี้ทำให้ platform เป็น **operator ของ closed-loop loyalty + ผู้ให้บริการการตลาด** ที่ใช้ licensed PSP เป็นท่อเงิน ไม่ใช่สถาบันการเงินหรือ payment business

**Residual risk:** หาก escrow ปริมาณมากและ refundable มากเกินไปจน "เหมือนเงินฝาก", หรือถ้า float ที่ค้างใน escrow ถูกนำไปหาผลตอบแทน (เช่น ลงทุน/กินดอกเบี้ย) ธปท. อาจมองเป็น deposit-taking/e-money issuance ได้; การถือ float จำนวนมากเป็นพื้นที่สีเทาที่ต้องระวังเป็นพิเศษ

**ASK YOUR LAWYER THIS:** *"ภายใต้ FIBA พ.ศ. 2551 และ พ.ร.บ.ระบบการชำระเงิน พ.ศ. 2560 — เงินที่ merchant ชำระล่วงหน้าเข้าบัญชี escrow แยกต่างหาก โดยระบุในสัญญาว่าเป็นค่าบริการการตลาด/loyalty ที่ไม่คืนเมื่อทวงถาม และใช้ mint reward token เท่านั้น เข้าข่าย 'รับฝากเงินจากประชาชน' หรือต้องขอใบอนุญาต payment/e-money หรือไม่ และเงื่อนไข refund แบบใด/การจัดการ float แบบใดที่จะทำให้ถูกตีความเป็นเงินฝากหรือ e-money?"*

---

### C.3 ระยะเวลาเก็บเอกสาร (Retention) vs PDPA Data Minimization

**Regulatory question:** เอกสารการเงิน/redemption ต้องเก็บนานเท่าใดตาม **ประมวลรัษฎากร (Revenue Code)** และกฎหมายบัญชี และจะ reconcile กับหลัก PDPA data minimization อย่างไร

**RECOMMENDED design posture:**

1. **เก็บ 5 ปี เป็นค่า default, ออกแบบให้ยืดได้ถึง 7 ปี:** ตาม **มาตรา 87 ประมวลรัษฎากร** ผู้ประกอบการ VAT ต้องเก็บรายงานและเอกสารอย่างน้อย **5 ปี** และอธิบดีกรมสรรพากรกำหนดให้เก็บเกิน 5 ปีได้ **แต่ไม่เกิน 7 ปี**; **พ.ร.บ.การบัญชี พ.ศ. 2543 มาตรา 14** ก็กำหนดเก็บบัญชีและเอกสารประกอบ **อย่างน้อย 5 ปี** (อธิบดีโดยความเห็นชอบของรัฐมนตรีกำหนดให้เก็บเกิน 5 ปีได้ แต่ไม่เกิน 7 ปี) → ตั้ง retention มาตรฐาน **7 ปี** สำหรับ financial/tax records เพื่อ safe margin
2. **แยก "Financial Record" ออกจาก "Behavioral/Movement Graph":**
   - **เก็บนาน (7 ปี): redemption FACT** = ledger entry double-entry ที่มี amount, currency(Coin), merchant_id, place_id, timestamp, tax fields — ข้อมูลที่ "กฎหมายภาษีบังคับ"
   - **เก็บสั้น / aggregate / pseudonymize: movement graph** = เส้นทางพฤติกรรม, GPS trail, ลำดับการเดินทาง — ไม่จำเป็นต่อภาษี ต้อง minimize ตาม PDPA
3. **Pseudonymize ใน financial ledger:** ledger เก็บ `user_ref` (pseudonymous key) ไม่ใช่ PII ตรง; mapping `user_ref → identity` แยก table ที่ลบได้เมื่อ user ขอ erase โดยไม่กระทบความสมบูรณ์ของ ledger ที่ภาษีต้องการ (เก็บ "ข้อเท็จจริงว่ามี redemption" ไม่ใช่ "ใครเป็นใครตลอด graph")
4. **Append-only + retention tag:** ทุก ledger entry มี `retention_class` (เช่น `tax_7y`, `behavioral_short`) เพื่อให้ job ลบ/anonymize อัตโนมัติตาม class

**Residual risk:** ความตึงระหว่าง "สิทธิ erasure ของ user (PDPA ม.33)" กับ "หน้าที่เก็บเอกสารภาษี 5-7 ปี" — โดยทั่วไป legal obligation ภาษี **override** สิทธิ erasure เฉพาะส่วนที่กฎหมายบังคับเก็บ แต่ต้องลบส่วนที่เกินความจำเป็น การ "เก็บ fact ไม่เก็บ graph" ลดความเสี่ยงแต่ยังต้องให้ทนายยืนยันขอบเขต

**ASK YOUR LAWYER THIS:** *"ตามมาตรา 87 ประมวลรัษฎากร และ พ.ร.บ.การบัญชี พ.ศ. 2543 มาตรา 14 — redemption record ขั้นต่ำที่ต้องเก็บ 5-7 ปีประกอบด้วย field ใดบ้าง และเรา pseudonymize ตัว user ในส่วนนี้ได้แค่ไหนโดยยังถือว่าเป็น 'หลักฐานทางบัญชี/ภาษีที่สมบูรณ์' และเมื่อ user ใช้สิทธิ erasure ตาม PDPA เราเก็บ field ใดต่อได้โดยอ้าง legal obligation?"*

---

### C.4 PDPA พ.ศ. 2562 — Lawful Basis, สิทธิ, DPO, Breach, k-anonymity, Residency

**Regulatory question:** ภายใต้ **พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA B.E. 2562)** — ฐานทางกฎหมายต่อ dataset, สิทธิเจ้าของข้อมูล, เกณฑ์ตั้ง DPO, การแจ้งเหตุละเมิด 72 ชม., k-anonymity ของ data product, การเก็บ raw GPS ของ Field Agent, และ **data residency / cross-border** (Supabase Singapore ใช้ได้หรือต้อง host ในไทย)

**RECOMMENDED design posture:**

**(a) Lawful basis ราย dataset:**
| Dataset | ฐานกฎหมาย (PDPA) | หมายเหตุ |
|---|---|---|
| ตำแหน่งแม่นยำของผู้ใช้ (precise location, check-in/quest) | **Explicit Consent (ม.19) — recommended/conservative** | **ข้อสำคัญ: location ไม่ใช่ sensitive data ตาม ม.26** (ม.26 ระบุเฉพาะ เชื้อชาติ, ความเห็นการเมือง, ความเชื่อ/ศาสนา/ปรัชญา, พฤติกรรม/รสนิยมทางเพศ, ประวัติอาชญากรรม, สุขภาพ, ความพิการ, สหภาพแรงงาน, ข้อมูลพันธุกรรม, ข้อมูลชีวภาพ — **ไม่มี location**) เราเลือก **explicit consent โดยความระมัดระวัง (prudential)** เพราะ trajectory/continuous location re-identify ได้ง่าย ไม่ใช่เพราะตัวบทบังคับ; ทำ opt-in แยกปุ่ม granular ถอนได้ |
| สัญญา/การจ่ายเงิน Field Agents | **Contract (ม.24(3))** | จำเป็นต่อการปฏิบัติตามสัญญาจ้าง/บริการ |
| Fraud detection / abuse prevention | **Legitimate Interest (ม.24(5))** | ต้องทำ **LIA (balancing test)** เก็บเป็นเอกสาร |
| Financial/tax records | **Legal Obligation (ม.24(6))** | ตาม C.3 |
| Marketing/push ส่วนบุคคล | **Consent** | แยก consent การตลาดออกจาก consent บริการหลัก |

**(b) Data-subject rights:** ต้องรองรับ access (ม.30), rectification, erasure (ม.33), restriction (ม.34), portability (ม.31), objection (ม.32), withdraw consent (ม.19) — สร้าง **self-service privacy center** ใน app + คิว backend จัดการคำขอ; ทุก consent มี audit log (เวลา, เวอร์ชัน T&C, ฐานกฎหมาย)

**(c) DPO (ม.41):** ต้องตั้ง DPO เมื่อ core activity ต้อง **"monitor ข้อมูลส่วนบุคคลอย่างสม่ำเสมอและในระดับ large scale"** หรือประมวลผล **sensitive data ระดับ large scale** (ตามประกาศ PDPC มีผล 13 ธ.ค. 2023) → **เนื่องจาก core business คือ location tracking + loyalty profiling ของผู้ใช้จำนวนมาก เราถือว่าเข้าเกณฑ์ ตั้ง DPO ตั้งแต่ต้น** (RECOMMENDED DEFAULT — founder ตัดสินใจจ้าง in-house หรือ outsource)

**(d) Breach notification:** หน้าที่แจ้งเหตุละเมิดอยู่ที่ผู้ควบคุมข้อมูลตาม **ม.37(4)** แต่ **กรอบเวลา "72 ชั่วโมง" จริง ๆ อยู่ในประกาศ PDPC** ("หลักเกณฑ์และวิธีการในการแจ้งเหตุการละเมิดข้อมูลส่วนบุคคล" ออกตามอำนาจ ม.37) ไม่ใช่ถ้อยคำในตัว ม.37(4) เอง สาระสำคัญสำหรับ engineering:
   - แจ้ง PDPC **โดยไม่ชักช้าและเท่าที่ทำได้ภายใน 72 ชั่วโมง** นับแต่ทราบเหตุ
   - **มี safety valve: ขยายได้ถึง 15 วัน** นับแต่ทราบเหตุ หากการแจ้งภายใน 72 ชม. ทำไม่ได้ โดยต้องมีเหตุผลประกอบ → **อย่า over-rotate ออกแบบเป็น hard 72h SLA ตายตัว** ให้ runbook รองรับทั้งเส้นทางปกติและเส้นทางขยายเวลาพร้อม justification
   - **เหตุละเมิดที่ "ไม่มีความเสี่ยง" ต่อสิทธิเสรีภาพ ไม่ต้องแจ้ง PDPC เลย**; ส่วนการแจ้งเจ้าของข้อมูลจะ trigger เมื่อ "เสี่ยงสูง" ต่อสิทธิเสรีภาพเท่านั้น
   - ต้องมี **incident runbook + on-call** ตัดสิน risk-tier (no-risk / risk / high-risk) แล้วเดินเส้นทางแจ้งที่ถูกต้อง

**(e) k-anonymity ของ data product:** ข้อมูลที่ **anonymize จริง** อยู่นอก PDPA → data product (เช่น footfall/heatmap ขายให้ merchant/เมือง) ต้อง aggregate ก่อนขาย **RECOMMENDED: k ≥ 5** สำหรับ external sharing (ทุกแถวต้องมี ≥ 5 บุคคลที่แยกไม่ออก; prob. re-identification ≤ 1/k), บวก **suppression** เซลล์ที่ต่ำกว่า k, และ generalize เวลา/พื้นที่ (เช่น bin 1 ชม. × grid หยาบ) เพื่อกัน re-identification จาก location trajectory ซึ่ง re-identify ได้ง่ายเป็นพิเศษ; internal analytics อาจใช้ k ≥ 3

**(f) Raw GPS ของ Field Agent:** เก็บภายใต้ **contract basis** เพื่อ verify งาน/anti-fraud, retention **สั้น** (เสนอ raw GPS ≤ 90 วัน แล้ว aggregate/ลบ), เข้าถึงได้เฉพาะ role ที่จำเป็น (RLS), ไม่นำไปรวมใน data product ระดับบุคคล

**(g) Data residency / Cross-border (จุดสำคัญที่สุดของ C.4):** **Supabase Singapore region ใช้ได้ ภายใต้เงื่อนไข** — PDPA **ม.28/29** จำกัด cross-border transfer แต่ประกาศ PDPC (มีผล **24 มี.ค. 2024**) มี **ข้อยกเว้น cloud computing สำคัญ**: การ transit/จัดเก็บข้อมูลนอกประเทศที่ **"บุคคลที่สามเข้าถึงข้อมูลไม่ได้"** ไม่ถือเป็น "การส่ง/โอนข้อมูลข้ามแดน" — การใช้ cloud provider จึงไม่นับเป็น transfer หาก no third-party access ดังนั้น:
   - ใช้ Supabase SG ได้ แต่ต้อง **(i)** เปิด **encryption at rest + in transit**, จัดการ key อย่างรัดกุม, จำกัด third-party access; **(ii)** ลงนาม **DPA + SCC (Section 29 safeguard)** กับ Supabase เพราะ **ยังไม่มี adequacy country list** ("Green Route" ม.28 ใช้ไม่ได้) → ต้องพึ่ง **"Safeguard Route" ม.29: SCC / BCR / certification** (มีผล 24 มี.ค. 2024)
   - **RECOMMENDED:** เริ่มที่ Supabase SG + SCC/DPA + encryption + no-third-party-access (ต้นทุนต่ำ, อยู่ในกรอบ) **และออกแบบให้ย้าย region ได้** เพื่อรองรับ data localization ในอนาคต — สำหรับ sensitive/financial ที่อ่อนไหวที่สุดอาจพิจารณา in-Thailand เป็น phase ถัดไป (founder + ทนายตัดสินใจตาม cost/risk)

**(h) เพดานค่าปรับ (penalty exposure — ไว้ชั่งน้ำหนักกับการลงทุน control):** PDPA มีโทษปกครองที่ต้องนำมาประกอบการตัดสินใจ:
   - **ไม่ตั้ง DPO ตาม ม.41:** ปรับทางปกครองสูงสุด **1,000,000 บาท** (ม.82) — และในเคสจริง (เคส JIB) ค่าปรับรวมสูงถึง ~7 ล้านบาท โดยมีส่วนของการไม่ตั้ง DPO รวมอยู่ด้วย
   - **ละเมิดหน้าที่แจ้งเหตุละเมิด (breach notification):** ปรับทางปกครองสูงสุด **3,000,000 บาท**
   - **เพดานค่าปรับทางปกครองทั่วไป:** สูงสุด **5,000,000 บาท ต่อการฝ่าฝืนหนึ่งครั้ง** (สำหรับการฝ่าฝืนที่ร้ายแรงที่สุด เช่น เกี่ยวกับ sensitive data / cross-border)
   → ตัวเลขเหล่านี้แสดงว่า **การลงทุนใน DPO + breach runbook + cross-border safeguard มีต้นทุนต่ำกว่า exposure จริงมาก** ควรทำตั้งแต่ต้น

**Residual risk:** "cloud exception ใช้ได้จริงแค่ไหน" ขึ้นกับว่า Supabase (ในฐานะ processor ที่ปฏิบัติงานบนข้อมูล ไม่ใช่แค่ storage) เข้านิยาม "no third-party access" หรือไม่ — ถ้า provider ประมวลผล/เข้าถึงได้ อาจถือเป็น transfer ต้องพึ่ง SCC เต็มรูป; PDPC ยังไม่ออก adequacy list ทำให้ ม.28 ใช้ไม่ได้; การ classify "precise location เป็น sensitive หรือไม่" — ตามตัวบท ม.26 location **ไม่ใช่** sensitive แต่ PDPC ยังไม่มีแนวชี้ขาดเพิ่มเติม การเลือก explicit consent จึงเป็น conservative design ไม่ใช่ข้อบังคับตามตัวบท

**ASK YOUR LAWYER THIS:** *"(1) ภายใต้ประกาศ PDPC เรื่อง cross-border (ม.28/29, มีผล 24 มี.ค. 2024) — การ host บน Supabase Singapore (ที่มีการประมวลผล ไม่ใช่แค่จัดเก็บ) เข้าข้อยกเว้น cloud 'no third-party access' หรือเป็น transfer ที่ต้องใช้ SCC/BCR และ SCC แบบใดที่ PDPC ยอมรับ? (2) precise/continuous location ของผู้ใช้ — ในเมื่อ ม.26 ไม่ได้ระบุ location เป็น sensitive โดยตรง เราจำเป็นต้องใช้ explicit consent หรือใช้ฐาน legitimate interest/contract ได้ และความเสี่ยง re-identification เปลี่ยนคำตอบหรือไม่? (3) ด้วย profiling + location tracking ของผู้ใช้จำนวนมาก เราเข้าเกณฑ์บังคับตั้ง DPO ตาม ม.41 หรือไม่?"*

---

### C.5 ภาษี — VAT, Withholding (หัก ณ ที่จ่าย), 50-ทวิ

**Regulatory question:** ต้องจด VAT เมื่อใด (threshold 1.8 ล้านบาท/ปี), VAT ใช้กับ take-rate + subscription หรือไม่, withholding tax ต่อการจ่าย Field Agents (ลูกจ้าง vs freelancer) และ merchant payout, และหน้าที่ออกหนังสือรับรองหัก ณ ที่จ่าย (50-ทวิ)

**RECOMMENDED design posture:**

1. **VAT (7%):** ต้องจดทะเบียน VAT เมื่อรายรับเกิน **1.8 ล้านบาท/ปี** (ตาม **มาตรา 85/1 ประมวลรัษฎากร** ซึ่งกำหนดหน้าที่จดทะเบียน ต้องจด **ภายใน 30 วัน** นับแต่เกิน threshold; แนะนำ **จดก่อนเริ่มดำเนินการ** เพราะ B2B SaaS โตเร็วทะลุ threshold เร็ว) — **VAT 7% applies กับทั้ง subscription (merchant SaaS) และ redemption take-rate** เพราะเป็นค่าบริการในไทย; sponsored quests/campaigns และ data product ก็เป็นบริการ → VAT ด้วย → **ระบบต้องออก tax invoice และแยก VAT ทุก revenue line**
   > *(timestamp: ตัวเลข threshold 1.8 ล้านบาท เป็นสถานะ ณ มิ.ย. 2026; มีข้อเสนอเชิงนโยบายให้ปรับลด threshold แต่ยังไม่เป็นกฎหมาย — ออกแบบ config ให้ปรับ threshold ได้)*
2. **WHT — Field Agents (จุดที่ต้องแยกให้ชัด):**
   - ถ้า classify เป็น **ลูกจ้าง (employee, เงินเดือน 40(1))** → หัก ณ ที่จ่ายแบบ **ขั้นบันได PIT**, ยื่น **ภ.ง.ด.1 (PND1)**, ขึ้นทะเบียน + นำส่งประกันสังคม
   - ถ้าเป็น **freelancer/รับจ้างทำของ (40(2)/(8))** → โดยทั่วไปหัก **3% สำหรับค่าบริการ/รับจ้าง** บุคคลธรรมดา, ยื่น **ภ.ง.ด.3 (PND3)**
   - **RECOMMENDED DEFAULT:** ปฏิบัติต่อ Field Agents (นักศึกษา CMU/Payap จ่ายตามงาน, ไม่อยู่ใต้บังคับบัญชาเต็มเวลา) เป็น **freelancer หัก 3% (ภ.ง.ด.3)** — แต่ **founder + ทนาย/นักบัญชีต้องยืนยัน classification** เพราะถ้าโครงสร้างจริงเข้าลักษณะ "ลูกจ้าง" (มีตารางงาน/บังคับบัญชา) ต้องเป็น PND1 + ประกันสังคม การ misclassify มีความเสี่ยงย้อนหลัง
3. **WHT — Merchant payout:** การ "payout จาก escrow ไปจ่าย reward / settle" ส่วนใหญ่ไม่ใช่ "เงินได้ของ merchant ที่เราต้องหัก" (เป็นเงินของ merchant เอง) **แต่ค่าบริการที่ platform เก็บจาก merchant (take-rate/subscription) เป็น merchant ที่อาจต้องหัก ณ ที่จ่ายให้ platform** (ค่าบริการ 3% สำหรับนิติบุคคล, ยื่น **ภ.ง.ด.53 (PND53)**) → platform ในฐานะผู้รับเงินจะได้ 50-ทวิ มาเครดิตภาษี ต้องออกแบบ flow รองรับทั้งสองทิศ
4. **หนังสือรับรองหัก ณ ที่จ่าย (50-ทวิ / Section 50 bis):** ผู้จ่ายที่หักภาษี **ต้องออกหนังสือรับรอง (ฟอร์ม 50-ทวิ) ตามมาตรา 50 ทวิ ให้ผู้ถูกหัก ณ เวลาที่จ่าย/หักภาษี (at the time of withholding) ทุกครั้ง** — **แยกออกจากกำหนดเวลานำส่งภาษี:** การ **นำส่งภาษีและยื่น ภ.ง.ด. ต้องทำภายใน 7 วันนับจากสิ้นเดือน** ที่จ่าย (e-filing ขยายเป็นภายใน 15 วัน; การขยายสำหรับ e-filing มีผลช่วง 1 ก.พ. 2567 – 31 ม.ค. 2570 เงื่อนไขยื่นผ่านอินเทอร์เน็ต) → **อย่า couple การ generate 50-ทวิ เข้ากับ monthly remittance job** — 50-ทวิ ผูกกับ event การจ่าย, ส่วน 7/15 วันผูกกับรอบนำส่งรายเดือน → **ระบบ payout ต้อง generate 50-ทวิ ณ จุดจ่ายแต่ละครั้ง + เก็บ running number + export ภ.ง.ด.1/3/53 แยกเป็นรอบเดือน**

**Residual risk:** การ misclassify Field Agent (employee vs freelancer) เป็นความเสี่ยงภาษี+ประกันสังคมย้อนหลังที่ใหญ่ที่สุด; VAT บน cross-border data product/affiliate (Klook/TakeMeTour ต่างชาติ) มีประเด็น place-of-supply ที่ต้องดูเพิ่ม

**ASK YOUR LAWYER THIS:** *"(1) Field Agents (นักศึกษาจ่ายตามงาน/รายชิ้น onboarding merchant) ควร classify เป็นลูกจ้าง (ภ.ง.ด.1 + ประกันสังคม) หรือ freelancer (หัก 3% ภ.ง.ด.3) และเส้นแบ่งอยู่ตรงไหน? (2) VAT 7% ต้อง charge บน take-rate, subscription, sponsored campaign และ data product ทั้งหมดหรือไม่ และมี revenue line ใดที่ได้ 0%/ยกเว้น (รวมประเด็น place-of-supply ของ affiliate ต่างชาติ)? (3) flow การออก 50-ทวิ ณ จุดจ่าย และนำส่ง ภ.ง.ด.1/3/53 สำหรับทั้ง (ก) เราจ่าย Field Agent และ (ข) merchant หักเราจาก service fee — ตั้งค่าอย่างไรให้ครบมาตรา 50 ทวิ และมาตรา 85/1 เรื่องจดทะเบียน VAT?"*

---

### C.6 Foreign-merchant / Chinese-payment (Alipay/WeChat) Acquiring + FX/Settlement

**Regulatory question:** การรับชำระ Alipay/WeChat (และ UnionPay) จากนักท่องเที่ยวจีน และประเด็น FX/settlement ภายใต้ exchange control ของไทย ต้องวางอย่างไร

**RECOMMENDED design posture:**

1. **อย่ารับ/clear ข้ามแดนเอง — เสียบผ่าน licensed acquirer/PSP:** ตั้งแต่ **30 ต.ค. 2025** มี **cross-border QR linkage ไทย-จีน** (ผ่าน NITMX + Alipay/WeChat/UnionPay) โดยมี **ธนาคารไทย (เช่น กรุงเทพ, กรุงไทย) เป็น settlement bank** → ออกแบบให้รับ Chinese payment ผ่าน **Thai PSP/acquirer ที่มี license อยู่แล้ว** (2C2P/Omise/Fiuu หรือธนาคาร) ซึ่งจัดการ FX และ settle เป็น **บาท (THB)** ให้ merchant — platform ไม่ทำหน้าที่ acquirer/FX เอง
2. **Settlement เป็น THB เพื่ออยู่ในกรอบ exchange control:** PSP settle เป็นบาทตรงเข้า merchant ลด FX risk และสอดคล้องข้อกำหนดควบคุมแลกเปลี่ยนเงินของไทย — platform จับเฉพาะ **take-rate (THB)** หลัง settle
3. **แยก payment rail ออกจาก loyalty rail:** การชำระค่าสินค้าจริง (Alipay/WeChat → merchant ผ่าน PSP) **แยกขาดจาก Coins/Escrow** — Coins ยังคงเป็น reward layer ที่ไม่แตะเงินตราต่างประเทศ ทำให้ FX/cross-border อยู่ในมือ licensed party ทั้งหมด
4. **KYC/compliance ของ foreign merchant:** ผูกผ่าน onboarding ของ PSP (PSP เป็นผู้รับภาระ KYC/AML ของ payment) — platform เก็บเฉพาะ merchant profile สำหรับ loyalty

**Residual risk:** หาก platform เริ่มถือ/แปลงเงินตราต่างประเทศเอง หรือทำ multi-currency wallet จะเข้าข่าย FX business / payment business ที่ต้อง license; การพึ่ง PSP ทำให้ความเสี่ยงนี้ต่ำ แต่ commercial term/fee กับ PSP ต้อง review

**ASK YOUR LAWYER THIS:** *"หากเรารับ Alipay/WeChat/UnionPay ผ่าน Thai PSP/acquirer ที่มี license และ settle เป็น THB เข้า merchant โดย platform ไม่ถือ/แปลงเงินตราต่างประเทศเองและเก็บเฉพาะ take-rate เป็นบาท — เรายังต้องขอ FX license หรือ payment license ใด ๆ ภายใต้ exchange control และ พ.ร.บ.ระบบการชำระเงิน หรือไม่ และมีจุดใดใน flow ที่ทำให้เราถูกมองเป็น acquirer/FX operator?"*

---

### C.7 สรุป Compliance Posture (Migration #1 Implications)

| ประเด็น | Posture | สิ่งที่ต้องบังคับใน migration #1 / schema |
|---|---|---|
| Coins ≠ e-money | ผู้ใช้ห้ามจ่ายเงินซื้อ Coins (เกราะคือ "no user funding" ไม่ใช่ "closed-loop") | ledger ไม่มี path "user money → Coins"; Coins source = escrow เท่านั้น; constraint บังคับ |
| Escrow ≠ deposit | ค่าบริการการตลาด, ring-fenced, ไม่ refund on demand | `escrow_wallet` แยก `clearing_account`; segregated; ผ่าน licensed PSP |
| Retention | 7 ปี (tax: ม.87 Revenue Code + ม.14 Accounting Act) vs minimize (behavioral) | `retention_class` ต่อ ledger entry; pseudonymous `user_ref` ใน financial ledger |
| PDPA | consent(location, conservative)/contract(agent)/LI(fraud)/legal(tax) | `lawful_basis` + `consent_log` + audit; RLS ตาม role; raw GPS ≤ 90 วัน |
| Breach | 72 ชม. (ประกาศ PDPC) + safety valve 15 วัน; no-risk = ไม่ต้องแจ้ง | incident runbook + risk-tier classifier + on-call (ไม่ hard-code 72h SLA ตายตัว) |
| Cross-border | Supabase SG + SCC/DPA + encryption, ออกแบบให้ย้าย region ได้ | สถาปัตยกรรม region-portable; ตั้ง DPO |
| Data product | k ≥ 5 (external), suppression + generalization | pipeline aggregate ก่อน export; ห้าม raw บุคคลใน data product |
| ภาษี | VAT 7% ทุก revenue line (จด ม.85/1 ภายใน 30 วัน); WHT 3% Field Agent (default); 50-ทวิ ออก ณ จุดจ่าย | flow ออก tax invoice + 50-ทวิ (event-based) + export ภ.ง.ด.1/3/53 (รอบเดือน) |
| FX/China pay | ผ่าน licensed Thai PSP, settle THB | payment rail แยกจาก loyalty rail |
| Penalty exposure | DPO 1M / breach 3M / ceiling 5M ต่อการฝ่าฝืน → ลงทุน control คุ้ม | (governance, ไม่ใช่ schema) — ใช้ประกอบ founder decision |

---

## D. การตัดสินใจที่ยังต้องเจ้าของ/ทนายเคาะ + ความเสี่ยงคงเหลือ

### D.1 Ledger

**Founder decisions (พร้อมข้อเสนอแนะ):**

1. **PSP money-in crediting: credit merchant GROSS (platform absorbs PSP fee as acquisition cost) vs NET (merchant bears fee).**
   - 👉 _แนะนำ:_ Default to GROSS in the spec for simplicity and merchant-friendliness, but confirm with finance; whichever is chosen must be uniform system-wide and reflected in psp_fee_expense booking.
2. **Breakage destination on EXPIRE / CHURN / CAMPAIGN_END leftover: return-to-funder vs platform_breakage (platform keeps) vs escheatment_liability (remit to state).**
   - 👉 _แนะนำ:_ Get TH legal sign-off per instrument class BEFORE migration #1 go-live, since postings are hardcoded in canonical. Default return-to-funder is the lowest-regulatory-risk; only switch to platform-keep with explicit legal opinion and contractual basis.
3. **Negative-escrow bad-debt reserve: size and funding source for merchant_receivable exposure from chargeback/funder-default after redemption.**
   - 👉 _แนะนำ:_ Fund a reserve sized to historical chargeback + funder-default rates times average outstanding backing; treat platform absorption (not clawing good-faith redeemer R) as the default loss-allocation unless R's TOS explicitly assigns settlement risk.
4. **Rounding policy: banker's rounding (round_half_even) vs documented platform-revenue bias.**
   - 👉 _แนะนำ:_ Adopt round_half_even to remove directional bias; if finance prefers to keep the bias as revenue, document it explicitly and still ship the rounding-drift monitor.
5. **REFUND_GRACE_DAYS and pre-expiry notification schedule / grace window for breakage.**
   - 👉 _แนะนำ:_ Propose REFUND_GRACE_DAYS=30 and notifications at T-14/T-3 with >=7-day post-expiry grace; calibrate with legal/CS and consumer-protection requirements.
6. **Anti-self-redemption strictness: hard-block funder==redeemer vs route to manual review, and how aggressively to link identities (KYC/device/payment).**
   - 👉 _แนะนำ:_ Hard-route same-entity and same-KYC/device/payment to funder-return; send looser correlations to manual review. Treat this as the core e-money compliance boundary, not a CS afterthought.
7. **Sybil/farming GRANT caps: per-(user,quest) and per-(device/KYC,campaign) limits.**
   - 👉 _แนะนำ:_ Set conservative initial caps and tune from campaign data; enforce inside the grant edge function under the reservation lock so they cannot be bypassed by account count.

**ความเสี่ยงคงเหลือ:**

- Solvency anchor A.8.2s is only as good as the bank/PSP statement feed: it is a nightly reconcile, not a synchronous gate, so a same-day burst of chargebacks can transiently under-collateralize before the next run detects it. A near-real-time exposure stream would tighten this but is out of migration-#1 scope.
- Anti-self-redemption (A.8.12) blocks direct funder==redeemer and same-KYC/device/payment links, but sophisticated multi-account collusion through unrelated-looking identities can still extract value at a 12% cost; full Sybil defense depends on identity-binding/KYC quality not specified here.
- Breakage destination, gross-vs-net PSP crediting, churn/campaign-leftover forfeit, and bad-debt reserve sizing are left as explicit founder/legal calls — go-live is blocked on TH legal sign-off that issuer-return (or platform-keep) breakage is permissible for this instrument class and that it does not trip BoT e-money/stored-value classification.
- coin_lots.remaining_minor and escrow caches are mutable read-models; if a bug bypasses the recompute trigger, drift is only caught nightly (A.8.6). The ledger remains source of truth and rebuildable, but stale caches could briefly mis-gate mints between reconciles.
- FIFO partial-redemption across many small lots increases lock contention and posting volume per REDEEM; high-throughput redemption on wallets with many tiny lots may need batching/perf tuning not specified.
- Provisional-offline reverse-then-redeem within grace adds a path that reverses an already-posted EXPIRE; this is correct but increases reconcile complexity and must be carefully tested for idempotency under retries.
- REFUND_GRACE_DAYS, OFFLINE_GRACE, pre-expiry notification timings, Sybil caps, and minimum-redemption-size are proposed constants only — they need product/finance calibration before launch.

### D.2 Pricing

**Founder decisions (พร้อมข้อเสนอแนะ):**

1. **Reward-COGS vs take-rate corrective lever if measured incrementality < 25% (B.6 point 3)**
   - 👉 _แนะนำ:_ Default: cap per-redemption reward value and cap redemptions/month per merchant to bound COGS rather than cutting take-rate; only cut take-rate for merchants with proven-low incrementality. Resolve before GA pricing, not after.
2. **Breakage fee 0-3% on escrow return at Coin expiry (B.2.2)**
   - 👉 _แนะนำ:_ Keep 0% in year one for trust; revisit once redemption/expiry data exists. Note that with the new activate_real gating, fake-activation no longer depends on this being 0%.
3. **Employment classification of CMU/Payap/staff agents and the stewardship retainer (B.3.3, B.3.5)**
   - 👉 _แนะนำ:_ Treat as freelance/service (3% WHT) initially; keep the retainer strictly KPI/outcome-linked (no fixed schedule, no daily tasking) to preserve freelance status. Re-evaluate to payroll only past ~20 full-time-equivalent agents.
4. **Keep the standalone Pro tier vs collapse into Growth add-ons (B.1.0 build-gate)**
   - 👉 _แนะนำ:_ Run the catchment count of 4-10 location F&B operators first. If < ~30 accounts, set PRO_TIER_ENABLED=false and sell analytics_pro + multi_location add-ons on Growth instead of maintaining a hollow Pro anchor.
5. **MICRO_REDEMPTION_FREE_BELOW_THB threshold (resolved to 30 in B.2, but a pricing lever)**
   - 👉 _แนะนำ:_ Launch at 30 baht to maximize small-cafe adoption; monitor margin impact and raise/lower via config without migration.

**ความเสี่ยงคงเหลือ:**

- Whether the deal economics actually close at 25% incrementality is unresolved by spec changes alone (B.6 point 3). If real measured incrementality on launch cohorts lands at 10-30%, the reward-COGS or take-rate structure must change BEFORE GA pricing. This is now an explicit blocking Founder call, but the corrective lever (reward cap vs take-rate cut) is not yet chosen.
- The lower take-rate from the 6% effective floor + sub-30-baht micro-free reduces platform take-rate revenue on big and tiny rewards versus the old flat-cap model; the LTV take-rate line (~150/mo net) is an assumption that needs validation against the new curve and real reward-size distribution.
- Steward retainer (2,500/mo, B.3.3) is a fixed-amount payment; even though it is KPI-linked, a fixed monthly figure paid to a freelance agent month after month raises Thai labor-reclassification risk (B.3.5). Legal should confirm the retainer structure does not create an employment relationship.
- Pro tier viability still depends on the B.1.0 build-gate headcount of 4-10 location operators in the catchment; if that count is thin, Pro should collapse into Growth add-ons. The spec defers this to a CM data-collection step rather than resolving it.
- merchant_quality_score and the 90-day bounty clawback add operational/accounting complexity (reserve-hold, partial payouts, cross-period WHT netting); reconciliation tooling and the agent_reserve / agent_wht_ledger tables must be built and tested before agent payouts go live.
- Sensitivity table in B.6 holds reward value, basket size (130), and margin (55%) fixed while varying only incrementality; real ROI also moves with those, so a single break-even of ~46% is itself a point estimate that should be stress-tested on the other inputs.

### D.3 Legal

**Founder decisions (พร้อมข้อเสนอแนะ):**

1. **DPO hiring model: in-house vs outsourced DPO-as-a-service.**
   - 👉 _แนะนำ:_ Appoint a DPO from day one (the spec already treats location-tracking + loyalty-profiling at scale as triggering s.41). Start with an outsourced/fractional DPO to control cost, with a contractual path to bring it in-house once headcount and data volume grow. Weigh against the up-to-1M baht non-appointment fine plus the broader 5M ceiling — controls are far cheaper than exposure.
2. **Data residency phasing: stay on Supabase Singapore vs move sensitive/financial data in-Thailand.**
   - 👉 _แนะนำ:_ Launch on Supabase SG with signed DPA + s.29 SCC + encryption at rest/in transit + restricted third-party access, and build region-portable architecture now. Defer in-Thailand hosting for the most sensitive financial/location data to a later phase, decided with the lawyer once the 'no-third-party-access' cloud-exception question is answered and cost/risk is clearer.
3. **Field Agent classification: freelancer (3% WHT, PND.3) vs employee (PND.1 + social security).**
   - 👉 _แนะนำ:_ Default to freelancer/3% for pay-per-task students with no full-time supervision, but get a written lawyer/accountant opinion BEFORE scaling the field force. If real-world control (schedules, supervision, exclusivity) drifts toward employment, switch to PND.1 + social security early to avoid the largest retroactive tax/SSO liability in the spec.
4. **Escrow refund policy: how refundable to make merchant prefund without tripping deposit-taking.**
   - 👉 _แนะนำ:_ Permit refunds only on the uncommitted (not-yet-minted-to-Coins) portion under contract terms, and explicitly bar on-demand/demand-deposit-style withdrawal. Keep float ring-fenced in a segregated account and do NOT invest it or earn yield on it. Have the lawyer set the precise refund threshold that keeps it on the marketing-services side of the FIBA/e-money line.
5. **VAT registration timing: register pre-launch vs wait for the 1.8M threshold.**
   - 👉 _แนะนำ:_ Register for VAT before commencing operations rather than waiting to cross 1.8M, given B2B SaaS revenue ramps fast and the s.85/1 30-day clock is unforgiving. Treat the 1.8M figure as configurable (a proposal to lower the threshold is pending and could become law).
6. **Breach-notification SLA design: rigid 72h vs tiered runbook.**
   - 👉 _แนะนำ:_ Do not engineer a hard 72h SLA. Build a risk-tier classifier (no-risk / risk / high-risk) into the incident runbook so the team uses the 72h path normally, invokes the documented 15-day extension with justification when 72h is infeasible, and skips PDPC notification entirely for no-risk breaches — only triggering individual notice on high risk.

**ความเสี่ยงคงเหลือ:**

- BoT substance-over-form on Coins: if the redemption network broadens across many merchants or marketing communicates 'Coins = X baht,' BoT may still read it into e-money despite the no-user-funding invariant. The invariant is necessary but not by itself a guarantee of a definitive exemption — no PDPC/BoT ruling confirms the posture.
- Escrow float and refund terms remain a grey zone: large refundable balances or yield-bearing float could be recharacterized as deposit-taking (FIBA) or e-money issuance. Contract refund mechanics and float handling need lawyer sign-off.
- Cloud 'no third-party access' exception is unsettled for Supabase as a processor that operates on (not merely stores) the data — may collapse into a full s.29 SCC/BCR transfer; PDPC has issued no adequacy list, so s.28 Green Route stays unavailable.
- Location-as-sensitive is legally open: s.26 does not list location, but PDPC could later prescribe 'other data affecting the data subject in a similar manner.' The explicit-consent design is conservative and safe either way, but the legal classification is not settled.
- Field Agent employee-vs-contractor classification is the largest retroactive tax + social-security risk; the freelancer/3% default must be confirmed against the actual operational control structure (schedules, supervision).
- VAT place-of-supply for cross-border data product / foreign affiliates (Klook/TakeMeTour) is unresolved and may change which revenue lines are 7%, 0%, or exempt.
- DPO mandatory-trigger determination under s.41 still depends on lawyer confirmation of 'large scale' + 'regular monitoring'; the spec defaults to appointing a DPO, which is conservative but a cost decision.
- Penalty figures (1M/3M/5M) are administrative-fine ceilings; actual enforcement posture and aggregation across multiple contraventions (cf. the ~7M JIB case) can exceed single-line ceilings — treat as floor-of-exposure planning, not a cap.
