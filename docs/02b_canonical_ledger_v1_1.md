# Canonical Ledger v1.1 — Amendment

> **เวอร์ชัน:** v1.1 · **วันที่:** 2026-06-14 · **สถานะ:** ผ่าน forensic-accountant + invariant-integrity + completeness review
> ส่วนขยายของ `02_canonical_ledger_pricing_legal.md` (§A) — ปิด gap ที่ 6 subsystems (doc 03) เปิดออก: เพิ่มบัญชีภาษี/payout/goodwill + txn + ล็อก seam-enforcement invariant + assign เจ้าของทุก unowned flow
> **precedence:** v1.0 §A (locked) > v1.1 §A2 > B/C/S1–S6

---

## A2. Canonical Ledger v1.1 — Amendment

> **เวอร์ชัน:** v1.1 (amendment) · **วันที่:** 2026-06-14 · **สถานะ:** DEFINITIVE — extends locked v1.0 (§A) เท่านั้น **ห้ามขัด** v1.0
> **ขอบเขต:** ปิดทุก gap ที่ 6 operational subsystems (S1–S6) เปิดออก โดย **ratify** account/txn_type/invariant ที่เดิมเป็น "level-(ค) canonical-pending" ให้เป็น **canonical** พร้อม posting เต็ม + assign เจ้าของทุก unowned flow + lock 5 seam-enforcement invariants ระดับระบบ
> **กฎทับซ้อน (precedence):** v1.0 §A (locked) > v1.1 §A2 (amendment) > B/C/S1–S6 (implementation). ที่ใดขัดกัน ยึด v1.0 ก่อน แล้วจึง A2. **A2 ห้าม assert ว่าสิ่งที่ v1.0 ตัดทิ้ง/ยังไม่ lock เป็น "locked แล้ว"** — ทุกตัวที่ขัด v1.0 ต้องติด `pending_ratification` หรือยึดชื่อ v1.0
> **lockstep rule (non-negotiable):** ทุก account/txn_type ที่ ratify ใน A2 **ต้องเข้า S6 reconciliation enumeration พร้อมกัน** (§A2.7) มิฉะนั้น recon จะ flag เป็น "foreign account" → false break. ห้าม ratify account โดยไม่ปรับ S6 ในรอบเดียวกัน — **และห้าม post leg เข้า account ที่ยังไม่อยู่ใน A2.1 CoA**

---

### A2.0 สรุปการตัดสินใจ (Decision Ledger)

| # | ประเด็นที่ subsystem เปิด | คำตัดสิน v1.1 |
|---|---|---|
| 1 | S4 ต้องการ tax/expense/suspense accounts (level-ค) | **RATIFY** 9 บัญชี (A2.1) เข้า CoA + S6 enumeration |
| 2 | AGENT_PAYOUT/AGENT_CLAWBACK/WHT_REMIT/VAT_REMIT/MERCHANT_CLAWBACK | **RATIFY** 5 txn_type (A2.2) + posting เต็ม (A2.3) |
| 3 | `agent_reserve` ถูก post เป็น ledger leg แต่ไม่อยู่ใน CoA (3 verifiers, CRITICAL) | **RATIFY `agent_reserve`** (Liability, CR, THB, per agent) เข้า CoA + S6 enumeration + เพิ่ม **AGENT_PAYOUT reserve-hold leg** ที่ fund มัน (A2.1/A2.3.1/A2.3.2) |
| 4 | AGENT_CLAWBACK ดราฟต์ B.3.4 ทิ้ง `clearing` ข้างเดียว → trip A.8.1b | **FIX:** default = ไม่แตะ clearing (`Dr agent_reserve / Cr platform_expense`) |
| 5 | merchant_payable clawback หลัง payout แล้ว = ไม่มีเจ้าของ | **S4 owns** `MERCHANT_CLAWBACK` (A2.3.5) — hard precondition ก่อน S1 REFUND |
| 6 | reward-COGS cap ไม่มีใครบังคับ | `cogs_budget_cap` = **hard mint-gate** (ทุก path) + **S6 invariant** + **S4 recon detect** (A2.4) — **inert-until-sized** จน founder เคาะตัวเลข (A2.10-#3) |
| 7 | RECOVERY/WRITE_OFF lifecycle กระจาย S1/S4/S6 | **S4 owns** state machine `merchant_receivable → RECOVERY → WRITE_OFF` (A2.6) |
| 8 | erasure อ่าน dispute/fraud/suspense ข้าม subsystem ไม่ได้ | **contract `cs_open_obligations(user_ref)`** (A2.6) — fail-closed |
| 9 | goodwill Coin (platform-funded apology) | **build-ready default = `sponsor:platform_goodwill` partition** (visible ต่อ S6 อยู่แล้ว); dedicated `platform_goodwill_budget` = **`pending_ratification`** จน founder + BoT/e-money sign-off (A2.9) |
| 10 | naming: `platform_breakage` vs `expiry_breakage` | **canonical = `platform_breakage`** (locked v1.0 doc02 line 54/60/321 ตัด `expiry_breakage` ทิ้ง) — A2 ยึด v1.0; rename เป็น genuine founder call (A2.10-#1), **ไม่ใช่ locked** |
| 11 | invariant per-subsystem แต่ value ข้าม seam | **lock 5 seam-enforcement invariants ระดับระบบ** (A2.5) |
| 12 | payout_suspense / escheatment_liability / wht_credit_received = orphan (ไม่มี posting) | **เพิ่ม canonical posting** ครบ (A2.3.7/A2.3.8/A2.3.9) — ปิด silent-zero ที่ทำให้ erasure-gate / CIT-credit ตรวจไม่เจอ |

> **★ Verifier-fix corrections (รอบ v1.1) — สรุปที่กลับ DRAFT:** (a) ดราฟต์ A2.8 อ้าง `expiry_breakage` เป็น `[v1.0]` locked — **ผิด, v1.0 ตัดทิ้ง** → กลับเป็น `platform_breakage`. (b) ดราฟต์ A2.9 ratify dedicated goodwill account เป็น canonical — **กลับเป็น pending_ratification** ตาม source (doc03 line 372/378/2681). (c) `agent_reserve` ถูก post แต่ไม่ ratify — **เพิ่มเข้า CoA**. (d) goodwill prefund `Dr platform_revenue` = ไม่มี settled cash ค้ำ — **กลับเป็น `Dr bank_settlement` (cash-funded) เท่านั้น** + recognize เป็น expense ไม่ใช่ contra-revenue

---

### A2.1 Chart of Accounts — ฉบับสมบูรณ์ (v1.0 locked + ratified ใหม่)

> หน่วย satang BIGINT; 1 COIN = 1 THB FIXED. `[v1.0]` = locked เดิม (ห้ามแก้ — ตรวจกับ doc02 §A.1 lines 41–60); `[NEW v1.1]` = ratify ในรอบนี้ (เข้า S6 enumeration พร้อมกัน — A2.7). **กฎ single-currency-per-account:** 1 account = 1 currency เสมอ (COIN xor THB)

| account_type | type | normal_balance | currency | owner | สถานะ | จุดประสงค์ |
|---|---|---|---|---|---|---|
| `psp_suspense` | Asset | DR | THB | Platform (per city, per PSP) | [v1.0] | เงิน PSP authorize ยังไม่ settle; reconcile NET; ห้าม back mint |
| `bank_settlement` | Asset | DR | THB | Platform (per city) | [v1.0] | เงินสด settled จริง = ฐานเดียวของ mint gating + payout |
| `psp_fee_expense` | Expense | DR | THB | Platform (per city, per PSP) | [v1.0] | ค่าธรรมเนียม PSP (netting A.6(1)) |
| `merchant_escrow` | Liability | CR | THB | Merchant | [v1.0] | escrow available ของ merchant (ส่วน lock ไป coin_backing ตอน GRANT) |
| `sponsor_budget` | Liability | CR | THB | Sponsor (per sponsor; **+ partition `sponsor:platform_goodwill`** = goodwill build-ready default, A2.9) | [v1.0] | งบ campaign sponsor/TAT; partition goodwill (build-ready จนกว่า dedicated account จะ ratify) |
| `coin_liability` | Liability | CR | COIN | Platform (per city) | [v1.0] | หนี้ Coin ยังไม่ burn ทั้งระบบ |
| `user_coin` | contra-Liability | DR | COIN | User | [v1.0] | Coin คงเหลือต่อ user; `Σ(user_coin)=coin_liability` |
| `coin_backing` | Liability-backing | CR | THB | Platform (per city, per funder partition) | [v1.0] | THB ค้ำ Coin live long-lived; `funder_key` บังคับทุก leg (A.8.5) |
| `clearing` | transient | DR/CR (zero per txn) | THB | Platform (per city) | [v1.0] | settlement-in-flight; **ต้องกลับ 0 ทุก txn** (A.8.1b) |
| `platform_revenue` | Revenue | CR | THB | Platform (per city) | [v1.0] | take-rate, subscription, affiliate, campaign fee (gross, **ก่อน VAT**) |
| `deferred_revenue` | Liability | CR | THB | Platform (per city) | [v1.0] | subscription annual ที่ยังไม่ recognize |
| `platform_breakage` | Revenue (เฉพาะเมื่อ policy=platform-keep) | CR | THB | Platform (per city) | **[v1.0]** | ปลายทาง breakage ฝั่ง **THB** กรณีกฎหมาย/สัญญายอมให้แพลตฟอร์มเก็บ (doc02 A.1 line 54, A.6(5)/(8)). **★ชื่อ canonical ตาม locked v1.0 — ไม่ใช่ `expiry_breakage`** (A2.8) |
| `escheatment_liability` | Liability | CR | THB | Platform (per city) | **[v1.0]** | breakage/unclaimed-payout ที่ต้องกัน/ส่งรัฐ (legal-conditional; doc02 A.1 line 55) |
| `merchant_payable` | Liability | CR | THB | Merchant | [v1.0] | ส่วนรางวัลที่ redeeming merchant พึงได้ รอ payout |
| `merchant_receivable` | Asset | DR | THB | Merchant | [v1.0] | exposure จริงจาก chargeback/funder-default (แทน escrow ติดลบ) |
| `bad_debt_expense` | Expense | DR | THB | Platform (per city) | **[v1.0]** | write-off `merchant_receivable` เมื่อ recovery ล้ม (WRITE_OFF; doc02 A.1 line 58) |
| `platform_expense` | Expense | DR | THB | Platform (per city) | **[NEW v1.1 / ตาม B.3.4 line 893]** | ค่าตอบแทน agent (gross) + platform OPEX + goodwill expense recognition (A2.3.6) |
| `agent_reserve` | Liability | CR | THB | Agent (per agent) | **[NEW v1.1 — RATIFIED, ปิด critical]** | งบ reserve-hold 30% ของ bounty `activate_real` (B.3.1) กันไว้จน clawback window 90 วันผ่าน; เป็น **ledger account จริง** เพราะ AGENT_PAYOUT/AGENT_CLAWBACK post leg เข้า/ออกตรง ๆ (doc02 B.3.1 line 725, doc03 S4.3.3 line 1551) |
| `wht_payable` | Liability | CR | THB | Platform (per city) | **[NEW v1.1]** | WHT 3% หัก agent ค้างนำส่งสรรพากร (ภงด.3) |
| `vat_output_payable` | Liability | CR | THB | Platform (per city) | **[NEW v1.1]** | VAT 7% ขาย ค้างนำส่ง (ภพ.30) |
| `vat_input_claimable` | Asset | DR | THB | Platform (per city) | **[NEW v1.1]** | VAT ซื้อหักได้ (PSP fee ฯลฯ) |
| `vat_carryforward` | Asset | DR | THB | Platform (per city) | **[NEW v1.1]** | excess VAT ซื้อ (input>output) ที่ยกไปเดือนถัด/ขอคืน — ทำให้ VAT_REMIT sum-to-zero ทุก branch (A2.3.4) |
| `payout_suspense` | Liability | CR | THB | Payee (per payee) | **[NEW v1.1]** | payout ตีกลับ/ค้างจ่าย ยังเป็นหนี้ผู้รับ (S4.5.2 line 1658) |
| `wht_credit_received` | Asset (contra-tax) | DR | THB | Platform (per city) | **[NEW v1.1]** | 50-ทวิ ขาเข้า (merchant หักเรา PND.53) = เครดิต CIT (C.5 ข้อ3) |
| `platform_goodwill_budget` | Liability | CR | THB | Platform (per city) | **[NEW v1.1 — `pending_ratification`, legal-flag A2.9]** | งบ goodwill Coin ที่ platform prefund (**post-sign-off migration target**; ก่อนนั้นใช้ `sponsor:platform_goodwill` partition) |

> **หมายเหตุการ ratify:**
> - `platform_breakage`, `escheatment_liability`, `bad_debt_expense` อยู่ใน locked v1.0 CoA (doc02 A.1) อยู่แล้ว → A2 enumerate ให้ครบเพื่อกัน foreign-flag (S6.1.1 line 2411)
> - **`agent_reserve` (ปิด critical):** source จัด level-(ข) เป็น "ตาราง" (doc03 line 1357) แต่ posting B.3.1/S4.3.3 post **leg ledger จริง** เข้า/ออกมัน (`Dr agent_reserve … THB`). leg ลง ledger ได้เฉพาะ account ใน CoA → A2 ตัดความกำกวม **ratify เป็น account ระดับบัญชี** + S6 enumeration; ส่วน "ตาราง `agent_reserve`" ของ S4 = sub-ledger/cache ที่ rebuild จาก balance(agent_reserve) ตาม A.8.6
> - `platform_goodwill_budget` ติด **`pending_ratification`** (S6 รู้จัก ไม่ flag foreign แต่ยังไม่ active เป็น solvency line) จน founder + BoT/e-money sign-off (A2.9/A2.10-#2)

---

### A2.2 txn_type — ฉบับสมบูรณ์ (v1.0 + ratified ใหม่)

| txn_type | สถานะ | สรุปขา |
|---|---|---|
| PREFUND, PSP_SETTLE, FUND_QUEST, GRANT, REDEEM, EXPIRE, REFUND, CHARGEBACK, CHURN_SWEEP, OWNERSHIP_TRANSFER, CAMPAIGN_END, SUBSCRIPTION, SUBSCRIPTION_RECOGNIZE, AFFILIATE, PAYOUT | [v1.0] | ตาม A.6/A.7 ไม่แก้ |
| `RECOVERY` | [v1.0, doc02 A.7 line 431] | Dr bank_settlement / Cr merchant_receivable — **S4 owns lifecycle** (A2.6) |
| `WRITE_OFF` | [v1.0, doc02 A.7 line 432] | Dr bad_debt_expense / Cr merchant_receivable — **S4 owns** (A2.6) |
| `AGENT_PAYOUT` | **[NEW v1.1]** | จ่าย agent: platform_expense gross + WHT 3% + **reserve-hold 30%** + net→bank (A2.3.1, 50-ทวิ event รายเดือน) |
| `AGENT_CLAWBACK` | **[NEW v1.1]** | เรียกคืน bounty/commission จาก `agent_reserve` — **FIX: ไม่แตะ clearing ข้างเดียว** (A2.3.2) |
| `WHT_REMIT` | **[NEW v1.1]** | นำส่ง wht_payable → net 0 ต่อ cycle (A2.3.3) |
| `VAT_REMIT` | **[NEW v1.1]** | นำส่ง vat_output − vat_input (branch-conditional, A2.3.4) |
| `MERCHANT_CLAWBACK` | **[NEW v1.1]** | เรียกคืน merchant settlement ที่ payout แล้ว → กัน merchant_payable ติดลบ (A2.3.5) |

> ref_type ใหม่ที่ ratify: `merchant_settlement`, `merchant_clawback`, `wht_remit`, `vat_remit`, `wht_trueup`, `vat_trueup`, `payout_batch`, `payout_suspense`, `escheatment`, `goodwill_fund`

---

### A2.3 Double-Entry Postings — ทุก txn ใหม่/แก้ไข (sum-to-zero ต่อสกุล, amount_minor>0)

> **กฎร่วม:** ทุก leg `amount_minor > 0` (doc02 A.2 line 122 CHECK) — leg ที่จะเป็น 0 ต้อง **drop ทิ้ง** ไม่ใช่ post 0. ทุก txn sum-to-zero ต่อสกุล (A.8.1)

#### A2.3.1 AGENT_PAYOUT — gross 5,000฿, WHT 3% = 150฿, **reserve-hold 30% = 1,500฿**, net cash = 3,350฿

> **★ FIX (critical, 3 verifiers):** ดราฟต์เดิมจ่าย net=gross−WHT ตรงเข้า bank โดย **ไม่มี leg ที่ fund `agent_reserve`** → account ที่ AGENT_CLAWBACK ดึงคืนไม่เคยถูกเติม. B.3.1 บังคับจ่ายจริง 70% กัน 30% → ต้องมี `Cr agent_reserve` leg

```
txn_type=AGENT_PAYOUT, ref_type=agent_payout, funded_by=platform
```
| direction | account | amount_minor (satang) | currency |
|---|---|---|---|
| Dr | `platform_expense`(platform) | 500000 | THB |
| Cr | `wht_payable`(platform) | 15000 | THB |
| Cr | `agent_reserve`(agent) | 150000 | THB |
| Cr | `clearing`(platform) | 335000 | THB |
| Dr | `clearing`(platform) | 335000 | THB |
| Cr | `bank_settlement`(platform) | 335000 | THB |

ตรวจ: Σ(DR)=500000+335000=835000 = Σ(CR)=15000+150000+335000+335000=835000 ✓ ; clearing Σ(DR)=Σ(CR)=335000 → กลับ 0 (A.8.1b) ✓
side effect: `agent_wht_ledger(agent,period).gross_minor += 500000`; posted_wht += allocated share (A2.7 wht_recon — round ที่ monthly grain ครั้งเดียว); `agent_reserve(agent)` += 150000 (ปล่อยเมื่อพ้น 90 วันโดยไม่ churn → `Dr agent_reserve / Cr clearing → Dr clearing / Cr bank_settlement` หรือถ้า churn → AGENT_CLAWBACK A2.3.2); 50-ทวิ ออก **รายเดือนรวม** ไม่ใช่ต่อ payout (B.3.6)
> **กรณีไม่กัน reserve (commission ปกติ ไม่ใช่ activation bounty):** drop `Cr agent_reserve` leg, net cash = gross−WHT (เพิ่ม `Cr clearing` เป็น 485000) — โครงเดียวกัน

#### A2.3.2 AGENT_CLAWBACK — **FIX: ห้าม clearing ข้างเดียว** (ดราฟต์ B.3.4 ผิด → trip A.8.1b → global FROZEN)

**เคส 1 (DEFAULT — มี `agent_reserve` พอ; ไม่แตะ clearing):**
```
txn_type=AGENT_CLAWBACK, reverses_txn_id=<T_bounty>, ref_type=agent_payout
```
| direction | account | amount | currency |
|---|---|---|---|
| Dr | `agent_reserve`(agent) | claw | THB |
| Cr | `platform_expense`(platform) | claw | THB |

ตรวจ: Σ(THB)=0 ✓ ; **ไม่มี clearing leg → ไม่ trip A.8.1b** ✓ ; `agent_reserve(agent)` ถูกเติมจาก AGENT_PAYOUT (A2.3.1) แล้วจึงมียอดให้ดึง

**เคส 2 (reserve ไม่พอ / เรียกเงินคืนจากรอบจ่ายจริง — clearing ต้องบาลานซ์ในตัว txn):**
| direction | account | amount | currency |
|---|---|---|---|
| Dr | `clearing`(platform) | claw | THB |
| Cr | `platform_expense`(platform) | claw | THB |
| Dr | `agent_reserve`(agent) \| `bank_settlement`(platform) | claw | THB |
| Cr | `clearing`(platform) | claw | THB |

ตรวจ: clearing Σ(DR)=Σ(CR)=claw → 0 ✓
> **กฎเหล็ก:** ดราฟต์เดิม "Dr clearing / Cr platform_expense" (ข้างเดียว) **FORBIDDEN** — S6 A.8.1b จับเป็น break → global FROZEN ทันที (doc03 line 2443). **`claw` amount = gross ของ income event เดิม** (ไม่ใช่ net); WHT ที่ posted ไปแล้วของ event นั้น netting ที่รอบ N+1 ผ่าน **capped offset** (B.3.6/S4.7.3 line 1745) — **cap ไม่ให้กด wht_base ต่ำกว่า legitimately-earned floor ของ income event นั้น**, excess offset = tracked receivable (ไม่ใช่ WHT suppressor), ข้ามปีภาษี → amended ภงด.3

#### A2.3.3 WHT_REMIT — นำส่ง wht_payable → net 0 ต่อ cycle (+ **wht_trueup leg, ปิด major**)

> **★ FIX (major):** ดราฟต์ใส่ `Σ wht_trueup` ใน WHT_REMIT แต่ **ไม่ระบุ double-entry ของ trueup** → wht_payable พิสูจน์ว่า net 0 ไม่ได้. per-payout leg = `round` ของ allocated share, แต่ certificate base = `round(monthly_aggregate × 3%)` ครั้งเดียว → ต่างกัน satang. ต้องมี trueup leg ปิดส่วนต่าง **ก่อน** remit

**ขั้น A — `wht_trueup` ณ month-close (post ก่อน WHT_REMIT, ต่อ agent,period):**
```
txn_type=AGENT_PAYOUT, ref_type=wht_trueup    -- adjustment leg
delta = round(monthly_aggregate × 3%) − Σ(per-payout posted wht legs)
```
| direction | account | amount | currency | เงื่อนไข |
|---|---|---|---|---|
| Dr | `platform_expense`(platform) | \|delta\| | THB | ถ้า delta>0 (certificate > per-payout sum) |
| Cr | `wht_payable`(platform) | \|delta\| | THB | ถ้า delta>0 |
| Dr | `wht_payable`(platform) | \|delta\| | THB | ถ้า delta<0 |
| Cr | `platform_expense`(platform) | \|delta\| | THB | ถ้า delta<0 |

ตรวจ: Σ(THB)=0 ✓ ; หลัง trueup → `Σ(per-payout wht legs) + delta == agent_wht_ledger.wht_minor` (wht_recon pass). ถ้า delta=0 → drop ทั้ง txn

**ขั้น B — WHT_REMIT (นำส่งยอดที่ reconcile แล้ว):**
```
txn_type=WHT_REMIT, ref_type=wht_remit
```
| direction | account | amount | currency |
|---|---|---|---|
| Dr | `wht_payable`(platform) | balance(wht_payable) ทั้ง city ณ cutoff | THB |
| Cr | `bank_settlement`(platform) | เท่ากัน | THB |

ตรวจ: Σ(THB)=0 ✓ ; **precondition:** `wht_recon` pass → `wht_payable` reconcile **ลง 0 ทุก cycle** (round ที่ monthly grain ครั้งเดียว)

#### A2.3.4 VAT_REMIT — branch-conditional (ภพ.30 รายเดือน ภายในวันที่ 15) + **vat_trueup, ปิด minor**

> **★ FIX (minor ×2):** (a) ดราฟต์ list `Cr bank_settlement` แบบ unconditional → ถ้า output==input leg เป็น 0 (ผิด amount_minor>0); ถ้า input>output txn ไม่ sum-to-zero. (b) ไม่มี vat_trueup mirror wht_trueup → vat_output พิสูจน์ net 0 ไม่ได้

**ขั้น A — `vat_trueup` ณ month-close (ปิด satang drift ระหว่าง per-line VAT split กับ ภพ.20 aggregate):**
```
txn_type=VAT_REMIT, ref_type=vat_trueup
delta = Σ(ภพ.20 certificate VAT base) − Σ(per-line vat_output_payable legs)
Dr/Cr vat_output_payable  vs  platform_revenue  ตาม sign(delta)   -- โครงเดียวกับ wht_trueup
```
ตรวจ: Σ(THB)=0 ✓ ; delta=0 → drop

**ขั้น B — VAT_REMIT (3 branch, ทุก leg >0, ทุก branch sum-to-zero):**
```
txn_type=VAT_REMIT, ref_type=vat_remit
```
- **(a) output > input** (นำส่งส่วนต่าง):
  `Dr vat_output_payable (output) / Cr vat_input_claimable (input) / Cr bank_settlement (output−input>0)`
- **(b) output == input** (ไม่นำส่ง, **drop bank leg**):
  `Dr vat_output_payable (output) / Cr vat_input_claimable (input)` เท่านั้น
- **(c) input > output** (ยกไป/ขอคืน — **balancing leg = `vat_carryforward`**):
  `Dr vat_output_payable (output) / Dr vat_carryforward (input−output>0) / Cr vat_input_claimable (input)`

ตรวจทุก branch: Σ(THB)=0 ✓ ; **vat_output net 0 หลัง remit ทุก cycle**. `vat_carryforward` ถูก consume เดือนถัด (`Dr vat_input_claimable / Cr vat_carryforward` ตอนคำนวณ) หรือ refund (`Dr bank_settlement / Cr vat_carryforward` เมื่อรัฐคืน)

**VAT/WHT legs บน SUBSCRIPTION + take-rate (extension ของ A.7 rows):**
- **SUBSCRIPTION (monthly, VAT-inclusive 990฿):** `Dr bank_settlement 99000 / Cr platform_revenue 92523 / Cr vat_output_payable 6477` (ออก ภพ.20; satang drift ปิดที่ `vat_trueup`)
- **SUBSCRIPTION annual:** `Dr bank_settlement / Cr deferred_revenue (net VAT) / Cr vat_output_payable (VAT ทั้งก้อน ณ tax point)`; recognize: `Dr deferred_revenue / Cr platform_revenue` รายเดือน **ไม่แตะ VAT**
- **Take-rate VAT (monthly split job, net-of-reversal):** `Dr platform_revenue / Cr vat_output_payable` (ส่วน VAT ของ take-rate เดือนนั้น) + ออก ภพ.20 รวมต่อ merchant
- **REFUND/CHARGEBACK ของ take-rate-bearing REDEEM (cross-period):** ถ้า VAT split แล้ว → reverse `Dr vat_output_payable / Cr platform_revenue` + auto credit-note (ภพ.20 chain). ถ้า reverse **ข้ามรอบ remit** (split+remit ในเดือน M, reverse เดือน M+1) → credit-note ลด vat_output ของเดือน M+1; ถ้าทำให้ vat_output(M+1) ติดลบ → ส่วนเกินไป `vat_carryforward` (เครดิตขอคืน) — กัน over-remit (S4.8.5, invariant `vat_revenue_recon`)
- **Merchant settlement payout = ไม่หัก WHT** (เงินของ merchant เอง, C.5 ข้อ3); **merchant หักเราเป็น service fee → ดู A2.3.9 (`wht_credit_received`)**

#### A2.3.5 MERCHANT_CLAWBACK — **S4 owns; แก้ cross-gap S1↔S4** (REFUND ดึง merchant_payable หลัง payout แล้ว)

> **ปัญหา:** S1 REFUND debit `merchant_payable(R)` เพื่อดึงส่วนร้านกลับ — แต่ถ้า **payout ไปแล้ว** จะดัน `merchant_payable` ติดลบ (ละเมิด A.8.4-spirit). S4/A.7 PAYOUT_HOLD กันได้แค่ payout **ใหม่** ไม่ recover ของจ่ายแล้ว → ต้องมี canonical reversal (doc03 line 368)

**เคส A (recoverable — หักจาก payout รอบถัดของ R / เรียกเงินคืน):**
```
txn_type=MERCHANT_CLAWBACK, reverses_txn_id=<T_payout>, ref_type=merchant_clawback
```
| direction | account | amount | currency |
|---|---|---|---|
| Dr | `bank_settlement`(platform) | claw | THB |
| Cr | `clearing`(platform) | claw | THB |
| Dr | `clearing`(platform) | claw | THB |
| Cr | `merchant_payable`(R) | claw | THB |

ตรวจ: clearing Σ(DR)=Σ(CR)=claw → 0 (A.8.1b) ✓ ; `merchant_payable(R)` กลับมาบวก → S1 REFUND post `Dr merchant_payable(R) / Cr coin_backing(funder,lot)` ได้โดยไม่ติดลบ

**เคส B (unrecoverable — R ไม่จ่ายคืน/ปิดร้าน → exposure จริงเป็น asset):**
| direction | account | amount | currency |
|---|---|---|---|
| Dr | `merchant_receivable`(R) | claw | THB |
| Cr | `merchant_payable`(R) | claw | THB |

→ ตั้ง R `PAYOUT_FROZEN` + เปิด recovery case → ตามเก็บด้วย `RECOVERY` (Dr bank_settlement / Cr merchant_receivable); เก็บไม่ได้ → `WRITE_OFF` (Dr bad_debt_expense / Cr merchant_receivable). **hard precondition:** S1 REFUND จะ **block** จนกว่า MERCHANT_CLAWBACK สำเร็จ — ไม่ปล่อย async (ปิด cross-gap S1↔S4, doc03 line 368)

#### A2.3.6 Goodwill GRANT funding — **build-ready = `sponsor:platform_goodwill` partition; cash-funded เท่านั้น**

> **★ FIX (critical + minor):** (a) ดราฟต์ prefund `Dr platform_revenue / Cr platform_goodwill_budget` → **platform_revenue เป็น income-statement ไม่ใช่เงินสด** → coin_backing ถูกค้ำด้วย "revenue recognition" ไม่ใช่ settled THB → ละเมิด SEAM-5/A.8.11/goodwill_backing. (b) goodwill เป็น economic cost ควร recognize เป็น expense ไม่ใช่ contra-revenue. **build-ready ตาม source (doc03 line 374) = `sponsor:platform_goodwill` partition** ของ `sponsor_budget` (first-class, S6 เห็นอยู่แล้ว); dedicated account = post-sign-off target (A2.9)

**ขั้น 0 — prefund งบ goodwill (เป็นรอบ, Finance — settled cash ค้ำก่อน A.8.11, เท่านั้น):**
```
txn_type=PREFUND→PSP_SETTLE (หรือ internal funding ที่ลงปลายทาง settled), ref_type=goodwill_fund
funded_by='sponsor:platform_goodwill'
```
| direction | account | amount | currency |
|---|---|---|---|
| Dr | `platform_expense`(platform) | X | THB |
| Cr | `sponsor_budget`(sponsor:platform_goodwill) | X | THB |

ตรวจ: Σ(THB)=0 ✓. **เงื่อนไขบังคับ:** ต้องมี `bank_settlement` ที่ settled แล้ว ≥ X **earmarked** สำหรับ goodwill **ก่อน** post grant (A.8.11) — งบ goodwill backing โดย settled cash จริง ไม่ใช่ revenue. **recognize เป็น expense** (`Dr platform_expense`) ไม่ใช่ `Dr platform_revenue` → ไม่ลด top-line, ไม่บิดเบือน take-rate/incrementality reporting (B.6/D.1)
> **หมายเหตุ accounting:** ขา prefund เคลื่อน obligation เข้า budget; settled cash ที่ค้ำ obligation นั้นมาจาก mint-gate A.8.11 ที่ตรวจ `settled_available` ก่อน grant — goodwill_backing (A2.7) assert `balance(sponsor:platform_goodwill) ≥ 0 AND settled-backed`

**ขั้น grant — goodwill Coin ให้ user (จาก ticket, ผ่าน universal mint-gate A2.5):**
```
txn_type=GRANT, funded_by='sponsor:platform_goodwill', ref_type=coin_grant, idempotency_key=hash('GOODWILL',ticket_id)
-- 0) SELECT … FROM escrow_wallets WHERE funder='sponsor:platform_goodwill' FOR UPDATE (กัน concurrent-grant race)
-- 0) universal gate: cogs-cap + fraud-gate(A.8.12/A.8.13/velocity, รวม goodwill↔identity-cluster edge A2.9-#2) + per-city goodwill ceiling + per-user/per-CS cap + settled_available(A.8.11)
-- 0) INSERT coin_lots(funded_by='sponsor:platform_goodwill', expires_at=now()+EXPIRY_DAYS)
```
| direction | account | amount | currency | lot |
|---|---|---|---|---|
| Dr | `sponsor_budget`(sponsor:platform_goodwill) | coin | THB | Lg |
| Cr | `coin_backing`(platform, funder='sponsor:platform_goodwill') | coin | THB | Lg |
| Dr | `user_coin`(user) | coin | COIN | Lg |
| Cr | `coin_liability`(platform) | coin | COIN | Lg |

ตรวจ: Σ(THB)=coin=coin ✓ ; Σ(COIN)=coin=coin ✓. goodwill Coin **backed 1:1 ด้วยเงิน settled จริง**; A.8.5 per-funder ครอบ `coin_backing(sponsor:platform_goodwill) == live goodwill coin_liability` อยู่แล้ว (sponsor_budget เป็น first-class)
> **goodwill A.8.12 (REQUIRED-before-go-live, ไม่ assert benign):** goodwill = platform-funded redeemable ข้ามร้าน → **ต้องนิยาม** ว่า redeeming merchant ที่ controlling identity อยู่ใน identity-cluster ของผู้รับ goodwill **trip A.8.12_resid หรือไม่** (insider/collusion = self-redemption เชิง substance แม้ funder≠redeemer). wire edge นี้เข้า identity-graph ให้ SEAM-1 step(2) จับ — **visibility (SEAM-5) ≠ fraud-gate coverage** (A2.9-#2)
> **migration → dedicated account:** เมื่อ founder + BoT/e-money sign-off ผ่าน (A2.10-#2) → migrate balance `sponsor:platform_goodwill` เข้า `platform_goodwill_budget` (โครง posting เปลี่ยน funder/account เท่านั้น, peg 1:1 ทำให้ solvency arithmetic ไม่เปลี่ยน) แล้ว flip `pending_ratification` → ratified

#### A2.3.7 Payout bounce → suspense (**ปิด orphan payout_suspense, major**)

> **★ FIX (major):** ดราฟต์อ่าน `payout_suspense_balance > 0` ใน cs_open_obligations แต่ **ไม่มี posting ใดเขียนเข้า account** → balance อ่านได้ 0 เสมอ → erasure-gate ปิดไม่อยู่. source doc03 S4.5.2 line 1658 มี posting อยู่แล้ว

```
txn_type=PAYOUT, ref_type=payout_suspense (reversal), reverses_txn_id=<T_payout>
```
| direction | account | amount | currency |
|---|---|---|---|
| Dr | `bank_settlement`(platform) | net | THB |
| Cr | `payout_suspense`(payee) | net | THB |

ตรวจ: Σ(THB)=0 ✓. จ่ายใหม่เมื่อ payee แก้ bank: `Dr payout_suspense / Cr clearing → Dr clearing / Cr bank_settlement` (clearing กลับ 0). **WHT ไม่ reverse** ถ้านำส่งแล้ว (เงินได้เกิด ณ วันจ่าย; จ่ายใหม่ไม่หักซ้ำ). เปลี่ยน bank = high-impact → SEAM-3 (step-up MFA + cool-down + SoD)

#### A2.3.8 Escheatment sweep (**ปิด orphan escheatment_liability + assign owner, major**)

> **★ FIX (major):** ดราฟต์ ratify `escheatment_liability` แต่ **ไม่มี posting ใด route value เข้า** + ไม่มีเจ้าของ flow. มี 2 ทางเข้า:

**(1) Unclaimed payout > 90 วัน — S4 owns (S4 ถือ payout_suspense):**
```
txn_type=PAYOUT, ref_type=escheatment, reverses_txn_id=<T_suspense>
```
| direction | account | amount | currency |
|---|---|---|---|
| Dr | `payout_suspense`(payee) | bal | THB |
| Cr | `escheatment_liability`(platform) | bal | THB |

**(2) Breakage policy=escheatment (EXPIRE/CHURN_SWEEP/CAMPAIGN_END leftover) — owner = ผู้ถือ EXPIRE (S6 recon/sweep):**
`Dr coin_backing(funder,lot) | merchant_escrow | sponsor_budget / Cr escheatment_liability` (THB leg ของ breakage เมื่อ `<BREAKAGE_DEST>=escheatment_liability`, doc02 A.6(5) line 313/376)

ตรวจ: Σ(THB)=0 ✓. disposition >90 วัน + threshold = founder/legal call ต่อ jurisdiction (A2.10-#5)

#### A2.3.9 Merchant service-fee inbound WHT (**ปิด orphan wht_credit_received, major**)

> **★ FIX (major):** ดราฟต์อธิบาย `wht_credit_received` ใน prose แต่ **ไม่มี leg ที่ debit มัน** → CIT-credit tracking ตรวจไม่เจอ. merchant นิติบุคคลหักเรา 3% (PND.53) ตอนจ่าย service fee → เราเป็นผู้ถูกหัก (C.5 ข้อ3, doc03 line 1750)

เมื่อเก็บ take-rate/subscription จาก merchant ที่หัก WHT (รับสุทธิ + 50-ทวิ ขาเข้า), service-fee invoice leg:
| direction | account | amount | currency |
|---|---|---|---|
| Dr | `bank_settlement`(platform) | net (fee − wht) | THB |
| Dr | `wht_credit_received`(platform) | wht (3% ของ fee) | THB |
| Dr | `vat_input_claimable` *(ถ้า applicable)* | — | THB |
| Cr | `platform_revenue`(platform) | fee (base) | THB |
| Cr | `vat_output_payable` *(ถ้า fee VAT-bearing)* | — | THB |

ตรวจ: Σ(THB)=0 ✓. `wht_credit_received` reconcile กับ PND.53 ที่ merchant ยื่น → เครดิต CIT. ภงด.53 export อ่าน account นี้ (S4.9.1 line 1846)

---

### A2.4 Reward-COGS Cap Model — `cogs_budget_cap` (hard mint-gate + S6 invariant + S4 precheck)

> **ที่มา (LOCKED pricing B.6/D.1):** ร้าน break-even ที่ ~46% incrementality → ต้อง **bound reward COGS** ด้วย 2 cap. เดิม **ไม่มีใครบังคับ** → A2 ทำให้เป็น primitive ระดับระบบ
> **★ สถานะ INERT-UNTIL-SIZED (verifier major + source line 2968):** machinery (mint-gate + invariant + S4 detect) สร้างครบ **แต่ตัวเลข cap (`REWARD_PER_REDEMPTION_CAP_THB`, `MERCHANT_MONTHLY_COGS_CAP_THB`) เป็น founder call ที่ค้าง (A2.10-#3)**. จนกว่าจะ set → ASSERT เทียบ null = **ไม่ fire meaningfully** → ห้าม enable D7/CS-initiated GRANT path ที่พึ่ง cap นี้เป็น control จนกว่า cap ถูก set. ติด flag `cogs_cap_unset` ใน config

**สองชั้น cap (เก็บใน `platform_config`, per-merchant override ได้):**
- `REWARD_PER_REDEMPTION_CAP_THB` — มูลค่ารางวัลต่อ 1 redemption (per-redemption cap)
- `MERCHANT_MONTHLY_COGS_CAP_THB[merchant,month]` — เพดาน COGS รวมต่อร้านต่อเดือน

**measurement basis (canonical เดียว — ปิด minor inconsistency):** ใช้ **`Σ(REDEEM thb_settlement ของ funder=merchant:X ในเดือน)`** เป็นฐาน (ตรง S4.4.5 line 1638). ฐานนี้ **เทียบเท่า** `Σ(reward COGS landed บน coin_backing funder=merchant)` และ `Σ(escrow drawn funder=merchant)` เพราะ GRANT เคลื่อน escrow→coin_backing 1:1 และ REDEEM burn ตามนั้น → S6/S4 คำนวณเลขเดียวกัน. **`reward_value` (per-redemption gate)** = **`thb_settlement` ของ redemption นั้น** (= face THB ของ lot ที่ถูก burn, peg 1:1) — นิยามชัดสำหรับ implementer

**(1) Hard mint-gate precondition (ledger edge fn — บังคับทุก mint path ไม่มีข้อยกเว้น):**
ก่อน post `GRANT` หรือ `REDEEM` ใด ๆ — **รวม goodwill, D7 quest-comp, CS-initiated** — edge fn ตรวจ (ภายใต้ `FOR UPDATE` บน escrow_wallet/budget row):
```
ASSERT reward_value ≤ REWARD_PER_REDEMPTION_CAP_THB                       -- per-redemption
ASSERT Σ(REDEEM thb_settlement ของ funder=merchant:X ใน month) + this_draw
       ≤ MERCHANT_MONTHLY_COGS_CAP_THB[X,month]                            -- per-merchant monthly
มิฉะนั้น → REJECT mint + freeze GRANT scope ของ funder นั้น
(ถ้า cap = null → fail-closed REJECT พร้อม flag cogs_cap_unset; ไม่ปล่อย mint โดยไม่มี cap)
```
> **ปิดช่อง D7 (CRITICAL):** quest-comp GRANT ต้องเรียกผ่าน **edge fn `cs_grant_goodwill` เดียวกัน** (single mint path) — `GOODWILL_USER_CAP` นับรวม D7 GRANT ด้วย (doc03 line 487/489); ไม่มี GRANT path ที่สองที่ค้ำด้วย escrow ของ funder บริสุทธิ์โดยเลี่ยง cap (ตรง doc03 line 331/489/496)
> **★ residual (verifier major, ต้องยืนยันก่อน rely):** D7/CS path ปิดแล้วที่ `cs_grant_goodwill`. แต่ **organic `grant`/`redeem` edge fn ต้อง embed per-merchant monthly COGS accumulator ภายใต้ FOR UPDATE เดียวกัน** จริง — A2.4 บังคับเป็น **required build artifact**; source ปัจจุบัน S1 ครอบเฉพาะ CS path, S4 detect ที่ nightly เท่านั้น (lagging). จน organic edge-fn accumulator implement + cap set → 3 ชั้นเหลือ S6 nightly + S4 settlement = **detect-after-drain ไม่ใช่ prevent**

**(2) S6 recon invariant `cogs_budget_cap` (A2.7):** `∀ merchant,month: Σ(REDEEM thb_settlement funder=merchant) ≤ REWARD_BUDGET_CAP[merchant,month]` → **BREAK → PAUSE GRANT(merchant)** (nightly + intraday)

**(3) S4 escrow precheck (settlement/recon side):** nightly recon คำนวณ Σ(REDEEM thb_settlement per merchant/month) เทียบ cap → breach = `payout_breaks(merchant_budget_cap)` + **freeze merchant GRANT scope** (signal ไป grant edge fn) — กัน innocent-funder escrow ถูก drain (S4.4.5)

> สามชั้นนี้ทำงานร่วม: mint-gate กันที่ต้นทาง, S6 จับ residual ที่หลุด live gate, S4 detect/freeze ที่ settlement — **ไม่มี mint path ใดเลี่ยงทั้งสาม** (เมื่อ cap ถูก set + organic accumulator wired)

---

### A2.5 SEAM-ENFORCEMENT Invariants ระดับระบบ (root-cause fix)

> **root cause:** invariant ถูกนิยาม per-subsystem แต่ value ไหลข้าม seam → exploit. A2 lock 5 ข้อนี้เป็น **system-wide** พร้อมกลไกบังคับเชิงเทคนิค

**SEAM-1 — UNIVERSAL MINT/VALUE-GATE (single ordered gate ทุก path):**
ทุก value-moving path — GRANT / REDEEM / REFUND / goodwill / D7 quest-comp / CS-initiated — **ไม่ว่า subsystem ใด initiate** ต้องผ่าน gate เรียงลำดับเดียวกัน:
```
(1) reward-COGS cap (A2.4)  →  (2) fraud-gate: A.8.12 anti-self-redemption (+ goodwill↔identity-cluster edge A2.9-#2) + A.8.13 Sybil + velocity
                            →  (3) per-funder settled-solvency (A.8.5 + A.8.2s + A.8.11)
```
**บังคับ:** ทุก mint/value path route ผ่าน **edge fn เดียว** (`cs_grant_goodwill` สำหรับ CS/D7/goodwill; `grant`/`redeem` สำหรับ flow ปกติ) ที่ embed gate ทั้ง 3 ขั้นใน txn เดียว ภายใต้ `FOR UPDATE` บน lot/escrow/budget row. **ไม่มี subsystem มีประตูหลัง** — S1/S5 ทำได้แค่เรียก edge fn ไม่ post เอง. **required artifact:** organic `grant`/`redeem` ต้อง embed accumulator ของ A2.4 จริง (ไม่ใช่แค่ CS path)

**SEAM-2 — FAIL-CLOSED บนทุก loss-bearing condition (ไม่มี WARN-only):**
| เงื่อนไข | response |
|---|---|
| `SUM(merchant_receivable) > funded reserve` (100%) | **auto-PAUSE GRANT** (WARN ที่ 70%) — เปลี่ยนจาก WARN-only |
| rounding bias ทิศเดียว (sign-test ข้าม N วัน) | **BREAK → PAUSE** GRANT+REDEEM (drift สุ่มในแบนด์ยัง WARN) |
| A.8.12 residual hit | **freeze ทั้ง funder/identity-cluster** (ไม่ใช่แค่แถวที่ match) + เปิด `fraud_case` |
บังคับด้วย S6.1.6 freeze state machine (`platform_freeze_state` อ่านก่อนทุก money op). **reserve size = founder call (A2.10-#4)** — founder ตัดสิน "ขนาด" ไม่ใช่ "จะ freeze ไหม"

**SEAM-3 — PAYOUT SoD ข้าม bank-change AND batch:**
actor ที่ approve การเปลี่ยน payout-bank ของ payee ภายใน `BANK_CHANGE_COOLDOWN_HOURS` (default 72) **ห้าม** เป็น creator **หรือ** approver ของ batch ที่จ่าย payee นั้น. bank-change → out-of-band notify ทุก channel + cool-down (24h) ก่อน payout แรกเข้าบัญชีใหม่.
**บังคับ:** constraint join `audit_log(bank_change) × payout_items.bank_change_approver × payout_batches.created_by/approved_by` (S4.6.1a) + per-item flag ที่ approver ต้อง explicit clear. **bank-change ทุก path ต้องผ่าน audited channel เดียว** (ถ้าเขียน bank_snapshot ตรงเลี่ยง audit_log → constraint bypass ได้)

**SEAM-4 — REAL→REAL account consolidation = FORBIDDEN by design:**
ห้าม merge/move Coin หรือ payout-bank ระหว่าง real account **ที่เคยถือ `coin_lot` หรือ payout bank** — เด็ดขาด. legit duplicate case ต้อง: **DPO + Finance dual-control** + **identity-graph re-score A.8.12 ข้าม source+target** (merge เขียน edge ให้ cluster trip self-redemption เป็น 1 entity) + **24h REDEEM/payout cool-down**. CS ทำไม่ได้ (S1.4.2/S3.4b). guest→real ปลอดภัยเพราะ guest mint Coin ไม่ได้

**SEAM-5 — Goodwill & platform-funded mint visible to S6 (no invisible float):**
goodwill และ platform-funded mint ทุกตัว **ต้องค้ำด้วย settled THB จริง** ที่ S6 solvency invariant เห็น — ผ่าน `sponsor:platform_goodwill` partition (build-ready) หรือ `platform_goodwill_budget` (post-ratify) ที่อยู่ใน A.8.2s REQUIRED (per-funder line) + A.8.5 per-funder + invariant `goodwill_backing` (A2.7). **ไม่มี contra ลอย, ไม่มี float ใต้ recon, ไม่มี prefund จาก non-cash (platform_revenue)**

---

### A2.6 Unowned-Flow Ownership Assignments

| Flow | เจ้าของเดียว | กลไก/canonical |
|---|---|---|
| **merchant_payable clawback (payout แล้ว)** | **S4** | `MERCHANT_CLAWBACK` (A2.3.5) = hard precondition ก่อน S1 REFUND; กัน merchant_payable ติดลบ |
| **reward-COGS cap enforcement** | **mint-gate (ledger edge fn) + S6 (`cogs_budget_cap`) + S4 (recon detect/freeze)** | A2.4 สามชั้น (inert-until-sized) |
| **RECOVERY/WRITE_OFF state machine** (`merchant_receivable` lifecycle) | **S4** | `chargeback → merchant_receivable → RECOVERY → WRITE_OFF`; S1 เปิด case + route → S4 (ไม่ run end-to-end เอง); S6 จับ aggregate exposure vs reserve |
| **payout_suspense bounce + escheatment (unclaimed payout)** | **S4** | A2.3.7 (bounce) + A2.3.8(1) (escheatment >90d) — S4 ถือ payout_suspense |
| **breakage→escheatment (EXPIRE/CHURN leftover)** | **ผู้ถือ EXPIRE/CHURN (S6 sweep)** | A2.3.8(2) — THB leg ของ breakage policy=escheatment |
| **Erasure cross-query** | **contract `cs_open_obligations(user_ref)`** (S1 expose; S3 owns gate; อ่าน S1/S4/S6) | A2.6.1 |

#### A2.6.1 Contract `cs_open_obligations(user_ref)` — erasure cross-subsystem (fail-closed)
```
cs_open_obligations(user_ref) → {
  has_open_dispute        : bool,   -- S1 support_tickets (subject_user_ref, active set)
  has_pending_money_action: bool,   -- S1 PENDING_MONEY_ACTION ค้าง
  fraud_score             : numeric,-- S6 fraud_score store
  has_false_claim_flag    : bool,   -- S1/S6 D1 false-claim / goodwill-abuse ใน window
  has_open_fraud_case     : bool,   -- S6 fraud_cases ∈ {open,in_review,escalated}
  payout_suspense_balance : bigint, -- S4 balance(payout_suspense for payee) — เขียนโดย A2.3.7
  has_open_receivable     : bool,   -- S4 merchant_receivable / negative-position pending recovery
  last_card_funded_txn_at : ts,     -- S6.1.5 chargeback-window (120–180 วัน)
}
```
**S3 erasure BLOCK ถ้า:** `has_open_dispute || has_pending_money_action || has_false_claim_flag || fraud_score ≥ threshold || has_open_fraud_case || payout_suspense_balance > 0 || has_open_receivable || chargeback_window ยังไม่พ้น` → ตั้ง `ERASURE_BLOCKED` ภายใต้ legal-obligation/legitimate-interest. **Edge fn `erase-account` เรียก read-only RPC แต่ละ subsystem; RPC ใด fail/ไม่ resolve → fail-CLOSED** (ห้ามลบเมื่อยืนยัน eligibility ไม่ได้). เก็บ **tombstone hash (non-PII)** ให้ late CHARGEBACK/RECOVERY post กลับได้หลัง erase

---

### A2.7 S6 Reconciliation Invariant Set — ฉบับอัปเดต (ปิด foreign-flag + เพิ่ม tax/cogs/goodwill)

**Account enumeration (S6 รู้จัก — ไม่ flag foreign):** v1.0 locked CoA (รวม `platform_breakage`, `escheatment_liability`, `bad_debt_expense`) + `platform_expense, agent_reserve, wht_payable, vat_output_payable, vat_input_claimable, vat_carryforward, payout_suspense, wht_credit_received` (ratified) + `platform_goodwill_budget` (**ติด flag `pending_ratification`** จน sign-off — รู้จัก ไม่ flag foreign แต่ยังไม่ active เป็น solvency line). บัญชีที่ยังรอ formal ratify ติด flag `pending_ratification` ใน `detail_jsonb` — **ไม่ใช่ break, ไม่ใช่เงียบ**
> **★ enumeration เพิ่ม unconditionally (verifier major):** `platform_goodwill_budget` **อยู่ใน flat enumeration list ทันทีที่มี row ใน CoA** (ไม่ขึ้นกับว่า conditional `goodwill_backing` solvency check active หรือไม่) → balance บนมันไม่ถูก foreign-flag แม้ migration #1 ยังอยู่บน sponsor partition. `goodwill_backing` เป็น solvency assertion เพิ่มบนนั้น

**Invariant set (เพิ่มจาก A.8.x ของ v1.0):**
| code | คำอธิบาย | response |
|---|---|---|
| A.8.1 / A.8.1b / A.8.2 | txn balance / clearing→0 / corruption tripwire | BREAK → FROZEN (รวมจับ AGENT_CLAWBACK single-sided) |
| **A.8.2s** | solvency anchor (canonical **narrow** RHS = `coin_liability + escrow_avail + sponsor_avail − merchant_receivable`; **ไม่บวก payable/tax**) — S6 owns สูตร, S4 ห้ามขยาย. **goodwill coin_liability ยังอยู่ใน REQUIRED** (มันคือ coin_liability ปกติ) ค้ำด้วย `sponsor:platform_goodwill`/`platform_goodwill_budget` ฝั่ง HAVE (doc03 line 2461); เฉพาะ payable/WHT/VAT ที่ถูกตัดออก — "narrow" ไม่ได้แปลว่าตัด goodwill | BREAK → freeze + page (intraday + nightly) |
| A.8.3 / A.8.4 / A.8.5 / A.8.6 / A.8.7 / A.8.11 / A.8.12_resid / A.8.13 | ตาม v1.0 (A.8.4 receivable>reserve → **auto-PAUSE 100% / WARN 70%**; A.8.5 รวม funder `sponsor:platform_goodwill`/`platform:goodwill`; A.8.12_resid → freeze **ทั้ง cluster** + รวม goodwill↔identity edge A2.9-#2) | ตาม SEAM-2 |
| **`cogs_budget_cap`** | `∀ merchant,month: Σ(REDEEM thb_settlement funder=merchant) ≤ REWARD_BUDGET_CAP[merchant,month]` (basis เดียวกับ S4) — **inert จนกว่า cap ถูก set** | BREAK → PAUSE GRANT(merchant) |
| **`goodwill_backing`** | (conditional — active เมื่อ goodwill ใช้งาน) `balance(sponsor:platform_goodwill \| platform_goodwill_budget[city]) ≥ 0` **settled-backed** AND `coin_backing(funder=goodwill) == live goodwill coin_liability` | BREAK → freeze GRANT(goodwill)/city |
| **`wht_recon`** | ต่อ (agent,period): `Σ(per-payout WHT legs) + wht_trueup == agent_wht_ledger.wht_minor`; **WHT รายเดือนคำนวณครั้งเดียวที่ monthly grain** (round(aggregate×3%), ไม่ sum per-payout round); trueup posted ก่อน remit (A2.3.3) | BREAK → **block WHT_REMIT** จน reconcile → `wht_payable` **net 0 ต่อ cycle** |
| **`vat_revenue_recon`** | `Σ(platform_revenue moves) == Σ(ภพ.20 line ± credit note)` ต่อ period; `vat_trueup` ปิด satang drift; **vat_output net 0 หลัง VAT_REMIT** | reversal ไม่มี credit-note = BREAK |
| `payable_coverage` (S4-owned, แยกจาก A.8.2s) | `LHS_pay = bank + settled_suspense − A.8.2s_RHS` ≥ `RHS_pay = merchant_payable + wht_payable + vat_output − vat_input − wht_credit`. **★ haircut (verifier major):** เพราะ A.8.2s_RHS หัก `merchant_receivable` ออก → LHS เท่ากับบวก receivable กลับเข้า coverage. `merchant_receivable` = distressed exposure → **haircut เป็น reserve-adjusted value (หรือ exclude)** ก่อนเข้า LHS เพื่อไม่ให้ doubtful asset นับเป็น liquid cover สำหรับ statutory tax remittance | LHS<RHS → page + FREEZE payout รอบถัด |

> **กฎ multi-payout WHT (lock):** agent หลาย payout ในเดือน → WHT คิด **monthly grain ครั้งเดียว** บน aggregate; per-payout leg = **allocated share** + `wht_trueup` (A2.3.3, double-entry กำหนดชัด) ปิดส่วนต่าง ก่อน WHT_REMIT (กัน satang drift, ทำให้ wht_recon pass). batch จะ `approved` ไม่ได้ถ้า `daily_solvency`(S6) **และ** `payable_coverage`(S4) ไม่ pass ทั้งคู่ (ผูก `solvency_check_id` + `payable_check_id`)

---

### A2.8 Naming Fix + AGENT_CLAWBACK Clearing Fix

**(1) Breakage account naming — ★ กลับ DRAFT (verifier critical ×3):** canonical = **`platform_breakage`** (THB, Revenue, CR, per city) ตาม **locked v1.0** doc02 §A.1 line 54.
> **หลักฐาน v1.0:** doc02 line 60 "**ตัด `expiry_breakage` (COIN sink) ทิ้ง**", line 321 "breakage ฝั่ง COIN ใช้ 2 legs (ไม่มี `expiry_breakage` sink leg ที่สาม)", EXPIRE/CHURN_SWEEP/CAMPAIGN_END (line 313/428/433/434) ใช้ `platform_breakage`, migration enum (line 549) มี `platform_breakage`. doc03 S4.2 line 1361 + S6.1.3 line 2445 **ปฏิเสธ** rename เป็น `expiry_breakage` โดยตรง (ตรง canon).
> **ดราฟต์เดิมผิด:** A2.1/A2.8 ดราฟต์ mark `expiry_breakage` เป็น `[v1.0]` locked และอ้าง override doc02/doc03 — **ขัด precedence rule (v1.0 > A2) และขัด locked CoA**. ถ้าปล่อยไว้ S6 enumeration (ใช้ `platform_breakage`) จะ flag ทุก EXPIRE leg ที่ post `expiry_breakage` เป็น **foreign account → false A.8.x break → global FROZEN** — exact lockstep failure ที่ A2.7 อ้างว่าป้องกัน.
> **คำตัดสิน A2:** (ก) **ใช้ `platform_breakage`** เป็นปลายทาง THB-keep (CoA A2.1 + S6 enumeration); (ข) breakage ฝั่ง **COIN** = 2-leg `ref_type=expiry` measurement **ไม่มี sink leg ที่สาม** (กัน double-count, ตรง doc02 line 321) — **ไม่มี account `expiry_breakage`**; (ค) single-currency rule → ห้ามให้ account เดียวเป็นทั้ง COIN sink และ THB revenue. **การ rename → `expiry_breakage` เป็น genuine canonical CHANGE** ที่ต้อง founder sign-off (A2.10-#1) **ไม่ใช่ already-locked** — ถ้า founder เลือก rename ภายหลัง ต้อง update doc02/doc03/S6 enumeration/EXPIRE/CHURN postings พร้อมกัน

**(2) AGENT_CLAWBACK clearing fix:** ดราฟต์ B.3.4 "Dr clearing / Cr platform_expense" (single-sided) **FORBIDDEN** → ใช้ A2.3.2 (default = ไม่แตะ clearing: `Dr agent_reserve / Cr platform_expense` — โดย `agent_reserve` ถูก fund จาก AGENT_PAYOUT reserve-hold leg A2.3.1; ถ้าต้อง route ผ่าน clearing → ต้องมี leg ปิด clearing ในใจ txn เดียว). S6 A.8.1b จับ single-sided เป็น break → global FROZEN (พฤติกรรมถูกต้อง — S6 ไม่ผ่อนปรน, doc03 line 2443)

---

### A2.9 Goodwill Resolution + Legal Flag — ★ กลับ DRAFT (verifier critical: governance/precedence)

**คำตัดสิน (build-ready vs deferred — ตาม source priority, doc03 line 374/378/2681):**
- **build-ready DEFAULT = `sponsor_budget` partition `funder_key='sponsor:platform_goodwill'`** (owner=platform-as-internal-sponsor per city). first-class account → S6 A.8.5/A.8.2s ครอบอยู่แล้ว, ไม่ต้องเพิ่ม primitive. **prefund = `Dr platform_expense / Cr sponsor_budget(sponsor:platform_goodwill)` ด้วย settled cash จริง** (A2.3.6) — recognize เป็น expense, ไม่ใช่ contra-revenue, ไม่ใช่ prefund จาก non-cash
- **dedicated `platform_goodwill_budget` = `pending_ratification` (DEFERRED option, NOT locked):** ดราฟต์เดิม ratify เป็น "first-class canonical / RECOMMENDED" — **ผิด governance**. source บังคับ: ต้องเป็น **canonical-change decision (founder + BoT/e-money legal review)** ก่อนใส่ A.1 + update S6 enumeration + A.8.2s RHS + A.8.5; "**ห้ามถือว่า locked แล้ว**". A2 จึง **demote เป็น post-sign-off migration target**: row อยู่ใน CoA (เพื่อ S6 enumeration เห็น ไม่ flag foreign) แต่ติด `pending_ratification` จน A2.10-#2 เคาะ. peg 1:1 → dedicated-vs-partition ไม่เปลี่ยน solvency arithmetic จึง migrate ทีหลังได้ปลอดภัย

**S6 visibility (SEAM-5, active บน partition ทันที):** A.8.2s REQUIRED นับ `sponsor_budget(sponsor:platform_goodwill) available` + A.8.5 per-funder (`coin_backing(sponsor:platform_goodwill) == live goodwill coin_liability`) + invariant `goodwill_backing` (balance≥0 settled-backed) + per-city ceiling + `SELECT FOR UPDATE` บน budget row ขณะ grant

**★ LEGAL FLAG (founder + BoT/e-money legal sign-off ก่อน go-live):** goodwill Coin = **platform-funded** redeemable ที่ merchant ใด ๆ → กระทบ:
1. **BoT e-money boundary (C.1):** เกราะคือ "user ไม่ได้จ่ายเงิน" — แต่ "redeemable ข้าม merchant กว้าง" ดัน substance-over-form เข้าใกล้ multi-purpose stored-value → ทนายต้องยืนยันว่า platform-funded reward ที่ redeem ข้ามร้าน **ไม่ trip** e-money (ไม่ใช่ assert ลอย ๆ, doc03 line 2681)
2. **A.8.12 anti-self-redemption — REQUIRED-before-go-live (ไม่ assert benign ใน body):** goodwill funder = platform, naive funder==redeemer check **ไม่ trip** — **แต่** insider/colluding identity ที่คุม redeeming merchant + รับ goodwill Coin = self-redemption เชิง substance. **ต้องนิยาม** ว่า redeeming merchant ที่ controlling identity อยู่ใน cluster ของผู้รับ trip `A.8.12_resid` หรือไม่ แล้ว wire edge เข้า identity-graph (SEAM-1 step 2). **visibility ≠ fraud-gate coverage**
3. **per-city ceiling + per-user/per-CS cap** บังคับกัน goodwill-farming (S1.5)
> จนกว่า sign-off → **ใช้ `sponsor:platform_goodwill` partition** (visible ต่อ S6 อยู่แล้ว) แล้ว migrate เข้า dedicated account หลังเคาะ

---

### A2.10 Founder/Legal Calls ที่เปิดไว้ (genuine — ต้องเคาะก่อน lock)

1. **Breakage account name** — A2 ยึด **`platform_breakage`** (locked v1.0). ถ้า founder ต้องการ rename → genuine canonical change (update doc02/doc03/S6 enumeration/EXPIRE/CHURN postings พร้อมกัน) + เลือก breakage destination policy (return-funder / platform-keep / escheatment) ต่อ instrument class + TH legal sign-off (BoT e-money + consumer-protection)
2. **Goodwill dedicated account + BoT e-money classification** (A2.9 legal flag) — platform-funded cross-merchant redeemable; build-ready ใช้ `sponsor:platform_goodwill` partition ไปก่อน, dedicated = post-sign-off
3. **Reward-COGS cap sizes** (`REWARD_PER_REDEMPTION_CAP_THB`, `MERCHANT_MONTHLY_COGS_CAP_THB`) — **blocking ก่อน enable D7/CS GRANT** (cap=null → invariant inert); corrective lever (reward cap vs take-rate cut) ถ้า measured incrementality < 25% (D.2)
4. **Bad-debt reserve size** สำหรับ `merchant_receivable` exposure + threshold auto-PAUSE GRANT (founder ตัดสินขนาด ไม่ใช่ "จะ freeze ไหม" — SEAM-2) + reserve-adjusted haircut ใน payable_coverage
5. **Unclaimed `payout_suspense` > 90 วัน disposition** → `escheatment_liability` (A2.3.8(1); legal sign-off ต่อ jurisdiction, S4-4)
6. **Bank-change cool-down window** (24–72h) + WHT employment-status ของ agent (freelance 3% vs ลูกจ้าง) — C.5/B.3.5
7. **VAT-inclusive vs exclusive pricing** ทั้งระบบ (default inclusive, S4-2) + solvency-fail override = dual Owner-approve + step-up MFA ซ้อน (S4-7)
8. **goodwill↔user-identity-cluster A.8.12 edge** (A2.9-#2) — platform-as-funder อยู่ใน redeemer's cluster ได้หรือไม่ → ต้องนิยาม + wire เข้า identity-graph ก่อน go-live
9. **organic grant/redeem edge-fn COGS accumulator** (A2.4 residual) — required build artifact ยืนยันว่า organic path embed per-merchant monthly accumulator ภายใต้ FOR UPDATE (ไม่ใช่แค่ CS path) ก่อน rely cogs_budget_cap เป็น preventive control

---

## ภาคผนวก: การตัดสินใจที่ยังต้องเจ้าของ/ทนายเคาะ + ความเสี่ยงคงเหลือ

### Founder/Legal decisions
1. **Breakage account naming: keep locked v1.0 `platform_breakage` (THB) vs rename to `expiry_breakage` system-wide (A2.10-#1)**
   - 👉 Keep `platform_breakage` as canonical (it is what v1.0 locked and what S6/S4 already enumerate). Do NOT rename — the draft's claim that expiry_breakage is locked is factually wrong (doc02 cut it). If a rename is still desired for clarity, treat it as a genuine canonical change requiring a coordinated migration of doc02/doc03/S6 enumeration/EXPIRE/CHURN postings, not an amendment-time assertion.
2. **Goodwill account form + BoT e-money classification (A2.10-#2): dedicated platform_goodwill_budget vs sponsor:platform_goodwill partition, and whether cross-merchant platform-funded Coin trips e-money boundary**
   - 👉 Ship on the sponsor:platform_goodwill partition (build-ready, S6-visible, no new primitive). Obtain BoT/e-money + anti-self-redemption (A.8.12) legal sign-off before promoting the dedicated platform_goodwill_budget out of pending_ratification. Define the goodwill-funder ↔ identity-cluster A.8.12 edge before enabling goodwill at scale.
3. **Reward-COGS cap sizes REWARD_PER_REDEMPTION_CAP_THB and MERCHANT_MONTHLY_COGS_CAP_THB (A2.10-#3) — blocking before GA / before D7/CS GRANT**
   - 👉 Set both before enabling any D7/CS-initiated GRANT path; the invariant is inert and fails closed until sized. Calibrate from the locked pricing model (~46% break-even incrementality, B.6/D.1) and add the corrective lever (reward cap vs take-rate cut) if measured incrementality < 25%.
4. **Bad-debt reserve size for merchant_receivable + auto-PAUSE-GRANT threshold + payable_coverage haircut (A2.10-#4)**
   - 👉 Decide the reserve magnitude (not whether to freeze — SEAM-2 mandates fail-closed at 100%, WARN at 70%). Apply a reserve-adjusted haircut to merchant_receivable inside payable_coverage so distressed exposure is not counted as liquid cover for statutory WHT/VAT remittance.
5. **Unclaimed payout_suspense >90-day disposition into escheatment_liability (A2.10-#5) and the >90d threshold per jurisdiction**
   - 👉 Adopt the A2.3.8(1) S4-owned escheatment sweep (Dr payout_suspense / Cr escheatment_liability) as default, gated on per-jurisdiction legal sign-off; confirm the exact unclaimed-property window per jurisdiction before enabling automatic sweeps.
6. **VAT-inclusive vs exclusive pricing system-wide + agent WHT employment status (freelance 3% vs employee) + bank-change cool-down window 24-72h (A2.10-#6/#7)**
   - 👉 Default VAT-inclusive (S4-2) and freelance-3% WHT for agents, applied uniformly across all subsystems; set BANK_CHANGE_COOLDOWN_HOURS = 72 as the conservative default. Require dual Owner-approve + stacked step-up MFA for any solvency-fail override.

### ความเสี่ยงคงเหลือ
- cogs_budget_cap is INERT until founder sets REWARD_PER_REDEMPTION_CAP_THB and MERCHANT_MONTHLY_COGS_CAP_THB (A2.10-#3). Until then ASSERTs compare against null; the spec forces fail-closed REJECT, which means D7/CS-initiated GRANT cannot be enabled until caps are set.
- The organic grant/redeem edge-fn per-merchant monthly COGS accumulator under FOR UPDATE is asserted as a required build artifact but no source implementation exists yet (source S1 covers only the CS path, S4 detects at nightly grain). Until built, the cap is detect-after-drain, not prevent-at-mint.
- platform_goodwill_budget remains pending_ratification pending founder + BoT/e-money legal sign-off (A2.10-#2). Build-ready path uses the sponsor:platform_goodwill partition; migration to the dedicated account is post-sign-off.
- Goodwill cross-merchant redeemability vs BoT e-money boundary (A2.9-#1) and the goodwill-funder ↔ user-identity-cluster A.8.12 edge (A2.9-#2 / A2.10-#8) are unresolved legal/identity-graph definitions; spec marks them REQUIRED-before-go-live but cannot self-resolve them.
- Bad-debt reserve size for merchant_receivable and the payable_coverage haircut value are unset founder calls (A2.10-#4); SEAM-2 fail-closed at 100% references a reserve whose magnitude is not yet pinned.
- A.8.2s / payable_coverage remain nightly+intraday reconciles, not synchronous gates — a same-day burst of chargebacks or a same-day bank redirect can transiently breach solvency or pay a redirected item before the next run (inherited S4 residual).
- The breakage rename to expiry_breakage, if the founder later chooses it (A2.10-#1), requires a coordinated update of doc02/doc03/S6 enumeration/EXPIRE/CHURN postings in one migration; A2 keeps platform_breakage as locked until then.
- agent_reserve is ratified as a ledger account here, but the source also describes an agent_reserve TABLE (S4 sub-ledger). The two must be reconciled at build: the table is treated as a cache/sub-ledger rebuilt from balance(agent_reserve) under A.8.6, but S4 must confirm it does not double-account.
- SoD/bank-change and real->real merge enforcement (SEAM-3/SEAM-4) depend on all bank-change writes funneling through one audited channel and on S3/S4 implementing the declared constraint joins and identity-graph re-score hooks; if a CS tool writes bank_snapshot directly, the cool-down/SoD can be bypassed.
- Several invariants depend on cooperating edge-fn changes owned by other subsystems (grant/redeem/payout/prefund reading platform_freeze_state and the COGS mint-gate); if not adopted, S6 recon degrades to detect-only rather than preventive.
