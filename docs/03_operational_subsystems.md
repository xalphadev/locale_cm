# Operational Subsystems — 6 ระบบที่เหลือ (S1–S6)

> **เวอร์ชัน:** v1 (ผ่าน integration review + money/security red-team แล้ว) · **วันที่:** 2026-06-14
> เติมช่องว่างที่ integration review ของ SYSTEM_PLAN จับได้ ทุกระบบ align กับ canonical specs ใน `02_canonical_ledger_pricing_legal.md` (ledger/RBAC/pricing/legal)
> แต่ละระบบถูกออกแบบ → review ความสอดคล้อง + red-team ช่องโหว่เงิน/ความปลอดภัย → finalize แก้ตามที่พบ

**สารบัญ:** S1 Support/Dispute · S2 Notification · S3 Auth/Identity · S4 Payout/Settlement/Tax · S5 Review/UGC Moderation · S6 Observability/Recon/DR

---

## S1. Support / CS & Dispute Resolution

> **ขอบเขต:** ระบบรับเรื่อง-แก้ปัญหา-ระงับข้อพิพาทของแพลตฟอร์ม ผูกกับ **Role 9 `Support/CS`** และ **Role 12 `DPO`** ตาม RBAC §4.3, ทุก action ที่ขยับเงิน/Coin เดินผ่าน **canonical ledger txn (Spec A)** เท่านั้น **ห้าม ad-hoc balance edit** เด็ดขาด — CS ไม่เคย `UPDATE` `coin_lots`/`escrow_wallets`/ledger โดยตรง ทุกการชดเชยคือการ **post txn ใหม่** (REFUND / GRANT / AGENT_PAYOUT-via-Finance) ที่บาลานซ์เป็นศูนย์ต่อสกุล
>
> **กฎเหล็กของ S1 (อ่านก่อน build):** S1 **ไม่สร้าง account ใหม่และไม่สร้าง txn_type ใหม่** นอก locked canonical (A.1 = 14 บัญชีฐาน + `platform_expense`/`wht_payable` จาก B ; A.7 txn_type 17 ตัว + `AGENT_PAYOUT`/`AGENT_CLAWBACK` จาก B) ทุก money path ของ CS ต้อง map กับ txn_type ที่มีอยู่จริงเท่านั้น
>
> **หลักการที่ S1 ยึดตาม canonical (อ้างชื่อเป๊ะ):** (1) append-only double-entry, หน่วย = satang BIGINT, 1 COIN = 1 THB; (2) `coin_lots` เป็น lock-anchor — reversal ทุกตัว `SELECT … FOR UPDATE` บน lot + `one_reversal_per_target`; (3) REFUND กลับด้วย **stored amounts ไม่ recompute rounding** (A.6(6)/(9)); (4) anti-self-redemption A.8.12 เป็น e-money boundary; (5) Sybil cap A.8.13; (6) **goodwill Coin ต้องมี funder จริงในชุด canonical เดิม** (`sponsor_budget` partition `sponsor:platform_goodwill`) ไม่ใช่ contra ลอย และ **ไม่ใช่ account ใหม่** (ดู S1.3(2) — มี note ว่าทางเลือก dedicated account ยังเป็น canonical-change ที่ค้าง legal sign-off); (7) PII unmask ผ่าน ABAC `PII_MASK` + `S*` step-up + audit (RBAC §4.6/§4.7) + DPO oversight; (8) PDPA "เก็บ fact ไม่เก็บ graph" (C.3) — ticket ผูก `subject_user_ref` pseudonymous

---

### S1.0 Cross-subsystem ownership map (ปิด seam ที่ review ชี้)

review พบว่าจุดอ่อนทั้งหมดอยู่ที่ **รอยต่อระหว่าง subsystem** — invariant ของ S1 ไม่ถูกบังคับโดย spec ข้างเคียง ตารางนี้ pin เจ้าของแต่ละ flow เพื่อกัน "money path มีหลายเจ้าของ / ไม่มีเจ้าของ":

| Flow | S1 ทำอะไร | เจ้าของ enforcement จริง | seam ที่ปิด |
|---|---|---|---|
| REFUND คืน REDEEM | ตัดสิน + เรียก edge fn `cs_refund` | **S4** owns merchant-settlement reversal (รวม `merchant_payable` clawback ที่ถูก payout แล้ว) | merchant_payable clawback (cross-gap S1↔S4) |
| Goodwill / CS-initiated GRANT | ตัดสิน + เรียก `cs_grant_goodwill` | **S6** owns solvency invariant ของ funder partition goodwill; **S4** owns การเติมงบ | goodwill float ที่ S6 มองไม่เห็น |
| Agent payout dispute (D4) | route → Finance, ไม่ post เอง | **S4** owns `AGENT_PAYOUT` (+WHT/50-ทวิ) | bare-PAYOUT mislabel + WHT leg หาย |
| Review takedown (D5) | route → S5, **ไม่เขียน moderation_status เอง** | **S5** owns `content_reports`+`moderation_actions` | takedown-via-change_proposals conflict (S1↔S5) |
| Chargeback recovery (D6) | เปิด case + route → Finance | **S4/S6** owns `merchant_receivable`→`RECOVERY`→`WRITE_OFF` state machine | RECOVERY/WRITE_OFF lifecycle กระจาย |
| Erasure eligibility (อ่าน dispute/fraud state) | **expose query `cs_open_obligations(user_ref)`** | **S3** owns erasure gate, อ่านจาก S1/S6 | erasure-evasion (S3.7 gate อ่าน state ของ S1/S6 ไม่ได้) |
| Account consolidation ที่มี Coin/escrow | **ห้าม CS ทำ**, route → DPO+Finance | **S3** owns identity-graph re-score + dual-control | real→real laundering (A.8.12 evasion) |
| Payee bank-change ก่อน payout | CS create proposal เท่านั้น + 24–72h cool-down | **S4** owns SoD ข้าม bank-change↔batch | payout SoD bypass |

> **invariant ระบบ (review root-cause fix):** ทุก value-moving path **ไม่ว่าจะ initiate จาก subsystem ไหน** ต้องผ่าน **ชุด gate เดียวกัน** = (cap + fraud-gate + per-funder solvency invariant) — S1 จึงไม่มี "ประตูหลัง" ที่ mint/refund โดยเลี่ยง control ที่ canonical บังคับ

---

### S1.1 โมเดล Ticketing

#### S1.1.1 Entity `support_tickets` (pseudo-schema)

ticket คือ **container ของ case เดียว** — ทุก money-moving action ที่ออกจาก ticket ต้องอ้าง `ledger_txn_id` กลับมา (audit trail ปิดวง)

```sql
support_tickets
  id                uuid PK
  ticket_no         text UNIQUE           -- human-readable เช่น CNX-2026-000123 (running per city)
  kind              enum                  -- *** handoff alias ของ category สำหรับ contract S5→S1 ***
                                          --  (review_dispute | money_dispute | agent_dispute | psp_dispute
                                          --   | quest_dispute | privacy_request | general) — map 1:1 กับ category group
  city_id           uuid NOT NULL         -- multi-tenant ตั้งแต่วันแรก (เหมือนทุกตารางการเงิน)
  channel           enum                  -- in_app | line_oa | email | phone | agent_relay | system_auto
  category          enum                  -- ดู S1.2 dispute taxonomy (+ general_inquiry, billing, account)
  subject_user_ref  text NULL             -- *** pseudonymous key (C.3) — ไม่เก็บ PII ตรงใน ticket body ***
  reporter_role     enum                  -- customer | merchant | agent | sponsor | system
  reporter_id       uuid NULL             -- FK → users/merchants/agents (resolve ผ่าน masked view)
  -- *** handoff contract กับ S5 (review-dispute): สอง named FK แทน single pair เดิม ***
  linked_redemption_id uuid NULL  FK → redemptions          -- redemption ที่พิพาท (D1/D2/D3/D5-money)
  linked_report_id     uuid NULL  FK → content_reports      -- *** ผูก S5 report id (review_dispute) ***
  linked_entity_type   enum NULL  -- coin_lot | payout | review | subscription | psp_charge | quest_progress
  linked_entity_id     uuid NULL  -- ref_id ของ entity อื่นที่พิพาท (กรณีไม่ใช่ redemption/report)
  status            enum                  -- ดู state machine S1.1.2
  priority          enum                  -- P1 | P2 | P3 | P4  (ดู SLA S1.1.4)
  sla_due_at        timestamptz           -- first-response deadline (คำนวณตอน assign)
  resolve_due_at    timestamptz           -- resolution deadline
  assigned_to       uuid NULL             -- CS agent (role_assignment)
  assigned_queue    enum                  -- ดู routing S1.1.3
  fraud_score       numeric DEFAULT 0     -- จาก fraud signal (S1.5) — gate goodwill/GRANT
  resolution_type   enum NULL             -- refund_redeem | goodwill_coins | quest_comp_grant | baht_refund
                                          --  | chargeback_defend | no_action | merchant_at_fault
                                          --  | escalated | duplicate
  verdict_id        uuid NULL  FK → dispute_verdicts        -- *** shared verdict กับ S5 (ดู S1.2 D1/D5) ***
  resolution_ledger_txn_id uuid NULL FK → ledger_transactions   -- *** ผูกกับ canonical txn เสมอ ***
  reopened_count    int DEFAULT 0
  pii_unmasked      boolean DEFAULT false -- เคย unmask หรือยัง (trigger audit)
  created_at        timestamptz DEFAULT now()
  resolved_at       timestamptz NULL
  closed_at         timestamptz NULL

dispute_verdicts              -- *** shared verdict object ข้าม S1↔S5 (review-extortion fix) ***
  id                uuid PK
  linked_redemption_id uuid NULL           -- key ที่ S1 และ S5 ใช้ร่วมกัน
  verdict           enum  -- merchant_at_fault | false_claim | inconclusive | merchant_delivered
  decided_by        uuid                   -- CS / moderator / system
  evidence_ref      jsonb                  -- POS log / รูป / ม.337 evidence pack pointer
  created_at        timestamptz
  -- S1 อ่าน verdict นี้ก่อน auto-refund ; S5 อ่าน verdict นี้ก่อน reweight review

ticket_events                 -- APPEND-ONLY timeline (ห้าม UPDATE/DELETE — เหมือน ledger)
  id            bigserial PK
  ticket_id     uuid FK
  actor_id      uuid          -- CS/DPO/system/reporter
  actor_role    enum
  event_type    enum          -- created | assigned | status_change | note | evidence_attached
                              --  | pii_unmask | money_action | escalated | sla_breach | merchant_notified
                              --  | verdict_recorded | erasure_blocked
  payload_jsonb jsonb         -- diff/note/evidence ref/ledger_txn_id/justification
  step_up_ref   uuid NULL     -- ผูก S* step-up challenge (ถ้า action นี้ต้อง MFA)
  created_at    timestamptz DEFAULT now()

ticket_evidence               -- หลักฐานบังคับสำหรับ dispute (S1.5 abuse control)
  id            uuid PK
  ticket_id     uuid FK
  kind          enum          -- photo | receipt | screenshot | merchant_pos_log | geo_proof | psp_doc
                              --  | quest_step_log    -- *** สำหรับ D7 proof-of-completion (S1.5) ***
  storage_key   text          -- object storage (encrypted at rest — C.4(g))
  hash          text          -- กัน tamper / กัน reuse หลักฐานเดิมข้าม ticket (dedup farming)
  submitted_by  uuid
  created_at    timestamptz
```

> **เหตุผล schema (อัปเดตตาม review):** (a) `subject_user_ref` pseudonymous ตาม C.3 — ticket เห็นว่า "user คนนี้มี dispute" โดยไม่อุ้ม PII; resolve เป็นชื่อ/เบอร์จริงต้องผ่าน unmask flow (S1.4); (b) `resolution_ledger_txn_id` บังคับให้ทุกการชดเชยมี txn จริงรองรับ — ปิดช่อง "CS แก้ยอดมือ"; (c) `ticket_events` append-only mirror หลัก append-only ของ ledger เพื่อ audit; (d) `ticket_evidence.hash` กันยื่นซ้ำหลาย ticket; **(e) เพิ่ม `linked_report_id` + `linked_redemption_id` เป็นสอง named FK และ `kind` alias เพื่อให้ contract `support_ticket(kind=…, linked_report_id, linked_redemption_id)` ที่ S5.4.2 เรียกมา map ตรง** (ปิด interface MISMATCH S5→S1); **(f) `dispute_verdicts` + `verdict_id` = verdict object เดียวที่ S1 และ S5 อ่านร่วมกัน keyed บน `linked_redemption_id`** (ปิด review-extortion double-dip — ดู S1.2 D1)

#### S1.1.2 Status State Machine (ticket-level)

```
            ┌──────────────────────────────────────────────────────────┐
            ▼                                                          │ reopen
   ┌──────────────┐   triage   ┌──────────────┐  need info  ┌──────────────────┐
   │     NEW      │──────────▶ │   TRIAGED    │───────────▶ │ AWAITING_REPORTER │
   └──────────────┘            └──────────────┘ ◀───────────└──────────────────┘
          │ auto-route                │ assign          reply │
          ▼                           ▼                       ▼
   ┌──────────────┐            ┌──────────────┐        (timeout → AUTO_CLOSE)
   │ AUTO_RESOLVED│            │  IN_PROGRESS │
   └──────────────┘            └──────┬───────┘
   (deflection bot)                   │
          │                  ┌────────┼─────────────┬────────────────┐
          │           need$  ▼        ▼ need merch   ▼ need 2nd-line  ▼ no fault
          │      ┌───────────────┐ ┌──────────────┐ ┌─────────────┐ ┌──────────┐
          │      │PENDING_MONEY  │ │AWAITING_MERCH│ │ ESCALATED   │ │ REJECTED │
          │      │  _ACTION (★)  │ │   ANT (★)    │ │ (S1.6 tier) │ └────┬─────┘
          │      └──────┬────────┘ └──────┬───────┘ └──────┬──────┘      │
          │     txn ✓   │                 │ resp/timeout    │ decided    │
          │             ▼                 ▼                 ▼            │
          │      ┌──────────────────────────────────────────────────┐  │
          └─────▶│                    RESOLVED                       │◀─┘
                 └────────────────────────┬─────────────────────────┘
                          7-day no reopen │
                                          ▼
                                   ┌──────────────┐
                                   │    CLOSED    │ (terminal; reopen→ TRIAGED ภายใน 30 วัน)
                                   └──────────────┘
```

| State | ความหมาย | ใครขยับได้ |
|---|---|---|
| `NEW` | เพิ่งสร้าง ยังไม่ triage | system |
| `TRIAGED` | จัด category/priority/queue แล้ว | CS / auto-classifier |
| `IN_PROGRESS` | CS รับงาน กำลังทำ | CS (assigned) |
| `AWAITING_REPORTER` | รอผู้แจ้งส่งข้อมูล/หลักฐาน (นาฬิกา SLA pause) | reporter |
| `AWAITING_MERCHANT` | รอร้านยืนยัน (เช่น "ลูกค้าไม่ได้ของ") | merchant (ผ่าน reply, ไม่เขียน live) |
| `PENDING_MONEY_ACTION` ★ | ตัดสินใจชดเชยแล้ว รอ **post canonical txn** (อาจรอ step-up / dual-control / fraud-gate clear) | CS + (maker-checker ตาม S1.3.1) |
| `ESCALATED` | ส่งขึ้น tier 2/3 (S1.6) | tier-2 / Finance / DPO |
| `AUTO_RESOLVED` | bot ตอบ/deflect สำเร็จ (FAQ, status lookup) | system |
| `REJECTED` | ไม่เข้าเงื่อนไขชดเชย / หลักฐานไม่พอ / ผิดฝั่งร้าน | CS |
| `RESOLVED` | จบ action แล้ว มี `resolution_ledger_txn_id` (ถ้ามีเงิน) | CS |
| `CLOSED` | ปิดถาวรหลัง 7 วันไม่ reopen | system |

> **กฎเหล็ก:** transition เข้า `RESOLVED` ที่ `resolution_type ∈ {refund_redeem, goodwill_coins, quest_comp_grant, baht_refund}` **ต้องมี `resolution_ledger_txn_id` NOT NULL** — บังคับด้วย CHECK constraint ถ้าไม่มี txn → transition fail (กันการ "ปิดงานโดยไม่ลงบัญชี")

#### S1.1.3 Queue Routing → Role `Support/CS`

routing ทำตอน `NEW → TRIAGED` ด้วย rule engine (deterministic ก่อน, ML จัด priority ทีหลัง):

| Queue | รับ category | scope ที่ assign | หมายเหตุ |
|---|---|---|---|
| `Q_MONEY` | burned-no-reward, wrong-amount, duplicate-charge | CS ที่มี cap goodwill + ผูก Finance escalation | money-moving — บังคับ evidence + fraud gate |
| `Q_MERCHANT` | dispute-review (ฝั่ง merchant payout dispute เท่านั้น) | CS + City/Regional Manager (scope เมือง) | ต้อง loop merchant ผ่าน reply |
| `Q_REVIEW` | review_dispute (content) | CS → **route ออกไป S5** ทันที (ไม่แก้ content เอง) | ดู D5 — เจ้าของคือ S5 |
| `Q_AGENT` | agent payout dispute | CS + Finance/Payout (read) | ผูก `tasks`/`agent_reserve`/clawback (B.3); money action = AGENT_PAYOUT โดย Finance |
| `Q_PSP` | PSP chargeback dispute | CS + Finance/Payout | deadline แข็งจาก acquirer (Omise/2C2P/Fiuu) |
| `Q_QUEST` | lost/contested quest progress | CS (Sparks/quest read) | Sparks นอก ledger (A.4) ; **quest-comp GRANT ผ่าน gate เดียวกับ goodwill (S1.5)** |
| `Q_GENERAL` | inquiry, billing, account | CS tier-1 | deflection bot ก่อน |
| `Q_PRIVACY` | data-subject request, erasure, unmask escalation, **account consolidation ที่มี Coin/escrow** | **DPO** (ไม่ใช่ CS) | RBAC role 12; CS route ออกทันที |

routing key:
```
route(ticket) :=
  if category ∈ MONEY_CATS              → Q_MONEY   (priority by thb_value + fraud_score)
  elif category == 'review_dispute'     → Q_REVIEW  (→ handoff S5 content_reports/moderation_actions)
  elif category == 'agent_payout'       → Q_AGENT
  elif category == 'psp_chargeback'     → Q_PSP
  elif category == 'quest_progress'     → Q_QUEST
  elif category ∈ PDPA_CATS
       OR is_account_consolidation      → Q_PRIVACY (DPO)   -- รวม merge/recover ที่บัญชีถือ coin_lot
  else                                  → Q_GENERAL (bot deflect → CS tier-1)
  AND assigned scope = ticket.city_id   -- CS เห็นเฉพาะ city ใน scope ตัวเอง (RLS §4.5)
```

#### S1.1.4 Priority / SLA Tiers

priority คำนวณจาก **(impact = money/safety) × (urgency = external deadline)**:

| Priority | เกณฑ์ (ตัวอย่าง concrete CNX) | First-response SLA | Resolution SLA |
|---|---|---|---|
| **P1** | เงินจริงเสี่ยงหาย/หมดเวลา: PSP chargeback ใกล้ deadline acquirer, payout ค้างก้อนใหญ่, สงสัย fraud ring, data breach | 1 ชม. | 8 ชม. |
| **P2** | burned-but-no-reward, duplicate charge, wrong amount (มูลค่า ≥ 100฿), merchant escrow frozen | 4 ชม. | 24 ชม. |
| **P3** | wrong amount เล็ก (< 100฿), quest progress หาย, review dispute, billing | 12 ชม. | 72 ชม. |
| **P4** | inquiry ทั่วไป, how-to, feature request | 24 ชม. | best-effort |

> SLA จับเวลาเฉพาะ state ที่ "ลูกบอลอยู่ฝั่งเรา" — `AWAITING_REPORTER`/`AWAITING_MERCHANT` **pause นาฬิกา** (กัน SLA เพี้ยนเพราะรอ external) เมื่อ `sla_due_at` ทะลุ → ยิง `ticket_events(sla_breach)` + escalate อัตโนมัติ (S1.6) ; **subscription tier ของ merchant ป้อน priority floor** ได้ (Pro = priority support ตาม B.1.1) แต่ **dispute ที่เกี่ยวเงินลูกค้า (consumer) ไม่ลด priority ตาม tier** — คุ้มครองผู้บริโภคก่อนเสมอ
>
> **review fix (merchant reply ที่อ่อน):** ฝั่ง `AWAITING_MERCHANT` ต้องมี **language-aware one-tap reply ผ่าน LINE OA** ("ฉันให้ของแล้ว + แนบรูป") และ timeout ที่ยาวขึ้น/ปรับตามภาษา — กัน SME ไทยที่ไม่ถนัด tech ถูก default แพ้เพราะตอบไม่ทัน (เกี่ยวกับ D1 consumer-protect default, ดู S1.2)

---

### S1.2 Dispute Taxonomy + State Machine ต่อชนิด

ทุก dispute มี **resolution ที่ map ตรงกับ canonical txn ที่มีอยู่จริง** (คอลัมน์ขวาสุด) — **ไม่มี txn_type ที่ S1 คิดขึ้นเอง** ; outcome ที่ไม่มีเงินคือ Sparks/quest (นอก ledger) และ content moderation (S5)

| # | Dispute | category | canonical txn ที่ใช้แก้ (เฉพาะที่อยู่ใน A.7) | เจ้าของ enforcement | บัญชีที่ขยับ |
|---|---|---|---|---|---|
| D1 | **เบิร์น Coin แล้วร้านไม่ให้ของ** | `burned_no_reward` | `REFUND` (กลับ REDEEM, lot re-lock) **หรือ** `GRANT` goodwill | S1 (gate) + S4 (clawback ถ้า payout แล้ว) | ดู S1.3 |
| D2 | **ร้านยิง redemption ผิด/ผิดจำนวน** | `wrong_amount` | `REFUND` เต็ม → (ออปชัน) `REDEEM` ใหม่ยอดถูก | S1 + S4 | กลับ REDEEM เดิม + post REDEEM ใหม่ |
| D3 | **เก็บเงินซ้ำ (duplicate charge)** | `duplicate_charge` | `REFUND` (ฝั่ง redeem) **หรือ** `CHARGEBACK` (ฝั่ง PSP prefund) **หรือ** `REFUND` ของ subscription leg | S1 + S4 (PSP) | ขึ้นกับว่าซ้ำที่ขาไหน |
| D4 | **Agent โต้แย้ง payout** | `agent_payout` | `AGENT_PAYOUT` (จ่ายเพิ่ม, +WHT) / กลับ `AGENT_CLAWBACK` ที่ผิด | **S4/Finance** (CS ไม่ post) | `clearing`→`bank_settlement`; `wht_payable`; `agent_reserve` |
| D5 | **ร้านโต้แย้งรีวิว** | `review_dispute` | **ไม่มี ledger txn** (content moderation) | **S5** (`content_reports`+`moderation_actions`) | ไม่แตะ ledger |
| D6 | **PSP chargeback** | `psp_chargeback` | `CHARGEBACK` (+ `RECOVERY`/`WRITE_OFF` ตามผล) | **S4/S6** owns lifecycle | `merchant_escrow`/`merchant_receivable`/`bank_settlement`/`bad_debt_expense` |
| D7 | **Quest progress หาย/โต้แย้ง** | `quest_progress` | **ไม่มีเงิน-ledger** (Sparks A.4) → ถ้าต้องชดเชยเป็นรางวัล = `GRANT` (ผ่าน gate เดียวกับ goodwill) | S1 (gate) + funder solvency (S6) | `spark_events` (+ `GRANT` ถ้าให้ Coin) |

> **บันทึกการ reject finding (พร้อมหลักฐาน):** review (integration.consistency + cross_gaps) อ้างว่า **`RECOVERY`/`WRITE_OFF` "ไม่ใช่ canonical"** — **ปฏิเสธ:** locked canon **A.7 ระบุทั้งสองตัวเป็น txn_type จริง** (`RECOVERY` = Dr bank_settlement / Cr merchant_receivable ; `WRITE_OFF` = Dr bad_debt_expense / Cr merchant_receivable) และ A.6(7) อ้างถึงโดยตรง ดังนั้น D6 ใช้ได้ตามเดิม **แต่ยอมรับส่วนที่ถูก:** *ownership* ของ state machine `merchant_receivable → RECOVERY → WRITE_OFF` ต้องมีเจ้าของเดียว → S1 **เปิด case + route → Finance/S4** ไม่ run end-to-end เอง (ปิด fragmentation)

#### D1 — Burned Coins, no reward (state machine — แก้ consumer-protect double-dip)

```
NEW ─▶ verify_burn ─▶ ┌─ REDEEM record found & SETTLED? ─┐
                      │                                  │
                  yes ▼                              no  ▼
            FRAUD_GATE (S1.5 ชั้น 2–3)            REJECT (ไม่มี burn → no loss; อาจ provisional fail)
                      │   ▲ ต้อง clear ก่อนไปต่อ
        ┌─────────────┼──────────────────────┐
   ร้านยอมรับผิด      ร้านปฏิเสธ/เงียบ        ร้านพิสูจน์ว่าให้ของแล้ว (POS+รูป)
        ▼             ▼                       ▼
   PENDING_MONEY    *** เช็ค verdict/ extortion signal ***   record verdict=merchant_delivered
   _ACTION:REFUND   ถ้ามี linked low-star review บน redemption เดียวกัน         │
   verdict=         → BLOCK silent-timeout auto-refund → ESCALATED              ▼
   merchant_at_fault else → consumer-protect default REFUND               REJECT + false-claim
        │             │                                                   → fraud_score↑
        ▼ post REFUND ▼ post REFUND                                       (verdict=false_claim)
   RESOLVED ◀─────────┘                                                        │
        ▲                                                                      ▼
        └──────────────── verdict_id เขียนลง dispute_verdicts (S5 อ่านต่อ) ───┘
```

> **default ฝั่งผู้บริโภค (เข้มขึ้นตาม review):** ถ้า burn เกิดจริง (REDEEM settled) และร้านพิสูจน์ไม่ได้ → **คืน Coin ด้วย `REFUND`** (lot เดิม, re-lock backing) — **แต่ auto-refund บน "ร้านเงียบจน timeout" ต้องผ่าน fraud-gate (S1.5 ชั้น 2–3) ก่อนเสมอ** และ **ถูก BLOCK ถ้ามี linked low-star review บน `linked_redemption_id` เดียวกัน** (สัญญาณ extortion → บังคับ escalate ไม่ auto-pay)
> **shared verdict (ปิด double-dip กับ S5):** ทุก D1 เขียน `dispute_verdicts(linked_redemption_id, verdict)` — ถ้า S1 ตัดสิน `merchant_at_fault` → S5 เก็บรีวิวไว้ ; ถ้า `false_claim` → S5 reweight→0 **และ** เก็บ ม.337 evidence pack ; กัน "user เก็บของได้ + ได้ refund + รีวิวกดดันค้าง" (review-extortion attack)
> loss ของรางวัลตกที่ merchant ที่บกพร่อง (REFUND ดึง `merchant_payable(R)` กลับ — ดู worked example S1.7)

#### D2 — Wrong redemption / wrong amount

```
NEW ─▶ confirm REDEEM exists & SETTLED ─▶ IN_PROGRESS
   ─▶ PENDING_MONEY_ACTION:REFUND (กลับ REDEEM เดิม "ทั้งก้อน", stored amounts)
   ─▶ [option] post REDEEM ใหม่ยอดถูกต้อง (ถ้า user/ร้านยังต้องการแลกจริง)
   ─▶ RESOLVED
```
> **ห้าม partial-edit ยอด** — REFUND กลับเต็มก้อนด้วย `one_reversal_per_target` แล้ว post REDEEM ใหม่ ยอดถูก (สอง txn) เพราะ canonical REFUND กลับด้วย **stored amount ไม่ recompute** (A.6(9)) การ "แก้จำนวน" ในก้อนเดิมทำให้ rounding/take-rate เพี้ยน ; **ถ้า `merchant_payable(R)` ถูก payout แล้ว → clawback เป็น hard precondition ก่อน REFUND (A.6(6)) — clawback นี้เป็น canonical posting `Dr merchant_escrow(R) / Cr coin_backing(funder,lot)` หรือ block จนกว่า payout รอบหน้าจะ claw สำเร็จ, และ enforcement เป็นของ S4** (cross-gap: S4 ต้อง expose merchant-settlement reversal — ดู S1.0)

#### D3 — Duplicate charge

```
NEW ─▶ classify ขาที่ซ้ำ:
  ├─ COIN redeem ซ้ำ (user เบิร์นซ้ำเพราะ retry) → ปกติ idempotency_key กันแล้ว (A.8.8)
  │     ถ้าหลุดเป็นสอง REDEEM จริง → REFUND ก้อนที่เกิน (lot re-lock, one_reversal_per_target)
  └─ THB money-in ซ้ำ (PSP เก็บ prefund/subscription ซ้ำ)
        → ตรวจกับ PSP statement → baht refund ผ่าน PSP + post กลับด้วย txn_type ที่มีจริงเท่านั้น:
           subscription ซ้ำ:   REFUND ของ leg subscription
                               (Dr platform_revenue|deferred_revenue / Cr bank_settlement, ref_type=reversal)
           prefund ซ้ำ:        CHARGEBACK หรือ REFUND escrow ส่วน uncommitted
                               (Dr merchant_escrow / Cr bank_settlement)
─▶ RESOLVED (resolution_ledger_txn_id = txn ที่กลับ)
```
> **review fix (txn_type label):** เดิมเขียน "reverse SUBSCRIPTION" — **ไม่มี txn_type นั้นใน A.7** ; vocabulary การกลับรายการ canonical คือ **`REFUND` / `CHARGEBACK` เท่านั้น** (บัญชีที่ใช้ — `platform_revenue`/`deferred_revenue`/`bank_settlement` — ถูกต้องอยู่แล้ว แก้แค่ชื่อ txn_type) → duplicate-subscription = post **`REFUND`** ที่ `reverses_txn_id` ชี้ SUBSCRIPTION txn เดิม
> **ส่วนใหญ่ duplicate ที่แท้จริงถูกกันที่ A.8.8** (idempotency_key bound กับ request_hash → กดซ้ำ = no-op หรือ 409) ticket D3 จึงมักเป็น **PSP-level dup** (เก็บบัตรซ้ำ) ที่ต้อง reconcile กับ statement จริง ไม่ใช่ ledger-level

#### D4 — Agent payout dispute (defer ทั้งหมดไป Finance/S4)

```
NEW ─▶ Q_AGENT ─▶ CS ตรวจ tasks.status / reward_thb / clawback_status / agent_reserve (read-only)
  ├─ payout น้อยไป (task approved แต่ไม่จ่าย) → ESCALATED → Finance post AGENT_PAYOUT (+WHT 3% leg)
  ├─ clawback ผิด (ร้านไม่ได้ churn จริงใน 90 วัน) → Finance กลับ AGENT_CLAWBACK + ปล่อย agent_reserve 30%
  ├─ WHT/50-ทวิ ข้องใจ → Finance (B.3.5/B.3.6 — 3% WHT, PND.3, event-based 50-ทวิ)
  └─ commission subscription ใน clawback window → รอจน window ปิด หรือ pro-rate (Finance)
─▶ RESOLVED (resolution_ledger_txn_id = AGENT_PAYOUT/AGENT_CLAWBACK ที่ Finance post)
```
> **review fix (canonical_misuse):** agent payout settle ด้วย **`AGENT_PAYOUT` (txn_type จาก B, มี leg `wht_payable` 3% + 50-ทวิ)** ไม่ใช่ bare `PAYOUT` — เดิม S1 อธิบายเป็น plain PAYOUT ทำให้ **WHT leg หาย** (tax-compliance breach) ; CS **ไม่ post เอง** money action ของ agent ผ่าน **Finance/Payout** (SoD: CS ไม่มี `create_payout`/`approve_payout` ตาม matrix §4.4) — S1 ทำได้แค่ตรวจ + escalate

#### D5 — Merchant disputes a review (handoff → S5, ไม่ใช่ change_proposals)

```
NEW ─▶ Q_REVIEW ─▶ *** handoff ทันทีไป S5 ด้วย support_ticket(kind='review_dispute',
                       linked_report_id, linked_redemption_id) ***
  S5 (Content Moderator, Role 6) ตัดสินผ่าน content_reports + moderation_actions:
  ├─ เข้าเกณฑ์ลบ/ซ่อน (defamation/fake/off-topic/paid) → moderation_action (reversible via prev_state)
  ├─ ไม่เข้าเกณฑ์ → REJECT + merchant reply ได้ตาม tier (B.1.1)
  └─ สงสัย review fraud → S5 ส่ง fraud signal (S1.5 engine เดียวกัน)
  ── ถ้ารีวิวผูกกับ money dispute (linked_redemption_id) → ใช้ dispute_verdicts ร่วมกับ D1
─▶ RESOLVED (ไม่มี ledger txn — content เท่านั้น)
```
> **review fix (S1↔S5 conflict — major):** เดิม S1 D5 เขียน review removal เป็น `change_proposals(reviews.moderation_status=rejected)` ซึ่ง **ขัด S5.2.1** ที่แยก takedown ไปที่ `content_reports`/`moderation_actions` โดยตั้งใจ (state machine, SLA, legal posture notice-and-action, reversibility ผ่าน `moderation_actions.prev_state` ต่างกัน) — **มาตรฐานเดียวคือของ S5** ; `change_proposals` ใช้กับ **forward edit ของ place data เท่านั้น** ไม่ใช่ takedown ของ UGC ดังนั้น **S1 D5 = handoff ไป S5, ไม่เขียน `moderation_status` เองผ่าน change_proposal** (CS ไม่แก้ live review เหมือน Agent ไม่เขียน live data)

#### D6 — PSP chargeback dispute (lifecycle เป็นของ S4/S6)

```
NEW(P1) ─▶ Q_PSP ─▶ Finance ─▶ representment decision (ภายใน deadline acquirer)
  ├─ defend (มีหลักฐาน merchant ใช้บริการจริง) → ส่ง evidence ให้ PSP → รอผล
  │     ชนะ → no ledger change (เงินไม่ไหลออก)
  │     แพ้  → post CHARGEBACK (A.6(7)): Dr merchant_escrow (+Dr merchant_receivable ถ้าขาด) / Cr bank_settlement
  └─ accept → post CHARGEBACK ทันที → set merchant PAYOUT_FROZEN + เปิด recovery case
─▶ recovery state machine (เจ้าของ = S4/S6, ไม่ใช่ S1):
     เก็บคืนได้ → RECOVERY (Dr bank_settlement / Cr merchant_receivable)
     เก็บไม่ได้ → WRITE_OFF (Dr bad_debt_expense / Cr merchant_receivable)
─▶ RESOLVED
```
> ตรงตาม A.6(7): ถ้า escrow available < chargeback → ส่วนขาดลง **`merchant_receivable` (Asset)** ไม่ใช่ escrow ติดลบลอย ; **ไม่ claw redeeming-merchant R ที่สุจริต** (loss ตกที่ funder ที่ chargeback, มี funded reserve A.8.4) ; **VAT coupling (review minor):** ถ้า REDEEM ที่ถูก CHARGEBACK/REFUND นี้เคยลง take-rate เข้า `platform_revenue` และ VAT-split job รันไปแล้ว → ต้อง **trigger VAT reversal + credit-note (ภพ.20)** ที่ฝั่ง **S4** (S1 แค่ flag `ref_type=reversal` ให้ S4 จับ) — กัน over-remitted output VAT

#### D7 — Lost / contested quest progress (ปิด goodwill-farming ผ่าน GRANT path)

```
NEW ─▶ Q_QUEST ─▶ ตรวจ check_ins / spark_events / quest_step completion log
  ├─ พิสูจน์ได้ว่าทำจริง (geo_proof + timestamp ตรง quest_step log) แต่ระบบไม่นับ
  │     → ชดเชย Sparks: INSERT spark_events(reason=admin_adjust)   [นอก ledger, ไม่ต้อง gate การเงิน]
  ├─ ถ้า quest ครบแล้วควรได้ Coin แต่ GRANT ไม่เกิด → post GRANT จริง
  │     *** ผ่าน gate เดียวกับ goodwill (S1.5) — ไม่ใช่ประตูหลัง ***
  └─ พิสูจน์ไม่ได้ / สงสัย GPS spoof → REJECT + fraud signal
─▶ RESOLVED
```
> **review fix (CRITICAL — D7 mint bypass):** เดิม D7 ให้ CS post `GRANT` ที่ funded โดย merchant/sponsor escrow จริง โดย **ไม่ผ่าน `cs_grant_goodwill` gate** (เพราะ `GOODWILL_USER_CAP` นับเฉพาะ goodwill lot) → เป็น **ช่องทาง mint ที่สองที่เลี่ยงทุก control** ดูด escrow ของ funder ที่บริสุทธิ์ใต้ COGS cap ที่ pricing lock ไว้ **แก้:** quest-comp GRANT ทุกตัวต้อง —
> 1. ป้อนเข้า `GOODWILL_USER_CAP` + dispute-velocity z-score (นับรวมกับ goodwill)
> 2. มี **proof-of-completion ที่ verify ได้** (`ticket_evidence.kind='quest_step_log'` + `geo_proof` ที่ timestamp ตรง quest step) เป็น hard precondition — ไม่ใช่แค่ "มี spark_events"
> 3. ตรวจ **per-merchant monthly redemption/budget cap (PRICING locked)** บน escrow ของ funder ก่อน post — ถ้า CS-initiated draw จะเกิน cap → freeze GRANT scope ของ funder นั้น
> 4. **maker-checker dual-control บังคับเสมอ** สำหรับ CS-initiated GRANT ที่ค้ำด้วย third-party funder (merchant/sponsor) **ไม่ว่าจำนวนเท่าไร** — เพราะ "ไม่ใช่เงินแพลตฟอร์มที่จะแจกเอง"
> **Sparks อยู่นอกเงิน-ledger** (A.4) — ชดเชย quest progress เป็น `spark_events` ธรรมดาไม่ต้อง gate ; แต่ทันทีที่ผลคือ "ควรได้ Coin จริง" จะเข้า gate ข้างบนทั้งหมด

---

### S1.3 Compensation / Resolution Flow (ผูกกับ canonical ledger เป๊ะ)

CS มี **3 เครื่องมือชดเชยเท่านั้น** ทุกตัวคือ canonical txn ที่มีอยู่จริง — เลือกตาม decision tree:

```
ลูกค้าเสียประโยชน์จริง?
 ├─ มี REDEEM ที่ settled และต้องคืนสภาพเดิม → (1) REFUND  (กลับ REDEEM, lot re-lock)
 ├─ ไม่มี REDEEM ให้กลับ / goodwill นอกเหตุ redeem → (2) GRANT goodwill (funder = sponsor:platform_goodwill)
 └─ ต้องคืน "เงินบาทจริง" (duplicate PSP / subscription ผิด) → (3) baht refund (REFUND/CHARGEBACK ผ่าน PSP)
```

#### (1) คืนสภาพ REDEEM → `REFUND` txn + lot re-lock

ใช้ posting **เป๊ะตาม A.6(6)** — กลับด้วย stored amount ไม่ recompute, `FOR UPDATE` บน lot, `one_reversal_per_target` กัน double-refund:

```
txn_type=REFUND, reverses_txn_id=<T_redeem>, ref_type=reversal, idempotency_key=hash('REFUND',T_redeem,ticket_id)
-- 0) FOR UPDATE บน coin_lots(L1); ตรวจ one_reversal_per_target
-- 0) ถ้า merchant_payable(R) ถูก PAYOUT แล้ว → clawback เป็น hard precondition ก่อน (A.6(6), enforce โดย S4)
Dr  user_coin(user)              <coin>  COIN  (lot_id=L1, expires_at=REFUND_EXPIRY)
Cr  coin_liability(platform)     <coin>  COIN  (lot_id=L1)
Dr  platform_revenue(platform)   <take>  THB   -- ดึง take-rate กลับ (stored)
Dr  merchant_payable(R)          <net>   THB   -- ดึงส่วนร้านกลับ (stored)
Cr  coin_backing(funder, lot=L1) <coin>  THB
-- 0) coin_lots(L1).remaining_minor += <coin>; state='active'; expires_at=REFUND_EXPIRY
ticket.resolution_ledger_txn_id = <T_refund>
```
> `REFUND_EXPIRY = max(L1.expires_at, now()+REFUND_GRACE_DAYS)` (เสนอ 30 วัน) — กัน Coin ที่คืนมา "หมดอายุทันที" (A.6(6))
> **cross-gap (S1↔S4):** กรณี `merchant_payable(R)` ถูก payout ไปแล้ว S1 **ไม่มี** กลไก claw เอง — ต้องพึ่ง **merchant-settlement reversal ที่ S4 เป็นเจ้าของ** ; ถ้า S4 ยังไม่มี flow นี้ การ REFUND จะ block (ไม่ปล่อยให้ `merchant_payable` ติดลบ) — เป็น hard precondition ไม่ใช่ async CS flow

#### (2) Goodwill Coins — **funder จริงในชุด canonical เดิม (ไม่สร้าง account ใหม่)**

> **review fix (CRITICAL canonical_misuse + MAJOR solvency):** ดราฟต์เดิมเพิ่ม **`platform_goodwill_budget` (account ใหม่) + `GRANT_GOODWILL_FUND` (txn_type ใหม่)** — **ทั้งสองไม่อยู่ใน locked CoA (A.1) / txn_type list (A.7)** การ assert เป็น canonical จึงผิดหลัก "S1 ไม่สร้าง primitive ใหม่" และ goodwill account นี้ยัง **มองไม่เห็นใน S6 solvency invariant set** (A.8.5/A.8.2s) → อาจ float ใต้ดินโดย nightly recon ไม่จับ
>
> **คำตัดสิน (build-ready default):** goodwill Coin **ค้ำด้วย funder จริงในชุด canonical เดิม** = `sponsor_budget` partition พิเศษ `funder_key='sponsor:platform_goodwill'` (owner=platform-as-internal-sponsor per city) ที่ **Finance pre-fund จากกำไรเป็นรอบ** ด้วย txn_type ที่มีอยู่จริง:
> - **เติมงบ (เป็นรอบ, Finance):** `SUBSCRIPTION_RECOGNIZE`/`AFFILIATE`-style เข้าไม่ได้ → ใช้ **`PREFUND`/`PSP_SETTLE` หรือ internal funding posting** ที่ลงปลายทางเป็น `Cr sponsor_budget(sponsor:platform_goodwill)` (ขา Dr = `platform_revenue`/`bank_settlement` ตามแหล่งทุน) — **มี THB settled จริงค้ำก่อน grant เสมอ** (A.8.11)
> - goodwill GRANT ใช้ **`GRANT` (txn_type เดิม)** funder-parameterized: `funded_by='sponsor:platform_goodwill'` — โครงเป๊ะตาม A.6(3) ทุก leg มี `funder_key` ปกติ
>
> **option (NOT build-ready, flagged):** ถ้าต้องการ dedicated account `platform_goodwill_budget` แยกจริง → **ต้องเป็น canonical-change decision (founder + BoT/e-money legal review)** ก่อน ใส่เข้า A.1 + อัปเดต S6 invariant enumeration + A.8.2s RHS + A.8.5 per-funder check ให้ครบ **ห้ามถือว่า locked แล้ว** — migration #1 ใช้ `sponsor:platform_goodwill` partition ไปก่อน

posting goodwill GRANT (txn_type เดิม `GRANT`, funder = goodwill partition):
```
-- ขั้น 0 (เติมงบ goodwill ล่วงหน้า, เป็นรอบโดย Finance — settled cash ค้ำก่อน):
txn_type=PREFUND→PSP_SETTLE (หรือ internal), ปลายทาง:
  Cr  sponsor_budget(sponsor:platform_goodwill)  <X>  THB   -- งบ goodwill ที่ funded จริง (มี THB settled)

-- ขั้น grant goodwill ให้ user (จาก ticket):
txn_type=GRANT, funded_by='sponsor:platform_goodwill', ref_type=coin_grant, idempotency_key=hash('GOODWILL',ticket_id)
  -- 0) SELECT … FROM escrow_wallets WHERE funder='sponsor:platform_goodwill' FOR UPDATE   *** กัน race ***
  -- 0) ตรวจ settled_available ≥ goodwill (mint gating A.8.7/A.8.11)
  -- 0) ตรวจ goodwill cap ต่อ user/ต่อช่วง + per-CS daily cap + fraud_score < threshold (S1.5)
  -- 0) ตรวจ per-city goodwill ceiling (ไม่ใช่แค่ per-user/per-CS) — กัน budget แห้งทั้งเมือง
  -- 0) INSERT coin_lots(funded_by='sponsor:platform_goodwill', expires_at=now()+EXPIRY_DAYS)
  Dr  sponsor_budget(sponsor:platform_goodwill)  <coin>  THB  (lot=Lg)
  Cr  coin_backing(platform, funder='sponsor:platform_goodwill') <coin> THB (lot=Lg)
  Dr  user_coin(user)              <coin>  COIN  (lot=Lg, expires_at, funded_by='sponsor:platform_goodwill')
  Cr  coin_liability(platform)     <coin>  COIN  (lot=Lg)
ticket.resolution_ledger_txn_id = <T_goodwill_grant>
```
> **ผลที่ถูกต้อง:** goodwill Coin **backed 1:1 ด้วยเงินจริง** ผ่าน funder ที่ **อยู่ใน A.8.5 per-funder check และ A.8.2s solvency anchor อยู่แล้ว** (เพราะ `sponsor_budget` เป็น first-class account) — ไม่ต้องเพิ่ม invariant ใหม่หรือ account ใหม่ ; มี lot/expiry ปกติ ; anti-self-redemption A.8.12 ใช้ได้ (goodwill funder ≠ ร้านที่ user ไปแลก จึงไม่ trip)
> **solvency freeze (review MAJOR fix):** เพราะ goodwill ผูกกับ `sponsor_budget` partition → **S6 A.8.5 บังคับ `coin_backing(sponsor:platform_goodwill) == live coin_liability ของ lot goodwill` อยู่แล้ว** และ A.8.2s นับ `sponsor_budget available` ฝั่ง REQUIRED → ถ้า partition นี้ติดลบ/under-backed nightly recon จับและ page ; **เพิ่ม invariant เฉพาะ:** `balance(sponsor:platform_goodwill) ≥ 0 AND settled-backed → BREAK = freeze GRANT(goodwill) per city` ; `FOR UPDATE` บน budget row ในขั้น grant ปิด concurrent-grant race

#### (3) Baht refund (เงินจริงไหลออก)

ใช้เฉพาะเมื่อต้องคืนเงินบาทจริง (duplicate PSP charge / subscription ผิด / escrow refund ส่วน uncommitted) — **จ่ายจาก `bank_settlement` เท่านั้น** (A.8.11) ผ่าน PSP refund API, ใช้ txn_type ที่มีจริง:
```
duplicate subscription:  REFUND  (Dr platform_revenue|deferred_revenue / Cr bank_settlement, ref_type=reversal)
escrow uncommitted refund: REFUND/CHARGEBACK (Dr merchant_escrow / Cr bank_settlement)  -- เฉพาะส่วนไม่ commit เป็น Coin (C.2)
prefund chargeback path:  CHARGEBACK (A.6(7))
```
> escrow refund **ห้าม on-demand เกินส่วน uncommitted** (FIBA boundary C.2) — refund ได้เฉพาะ baht ที่ยังไม่ถูก lock เป็น `coin_backing`

#### S1.3.1 Step-up + dual-control gate ของ money action

| Action | step-up MFA (`S*`) | dual-control (maker-checker) | บังคับที่ |
|---|---|---|---|
| `REFUND` ≤ threshold | ❌ (CS เดี่ยว, audited) | ❌ | edge fn `cs_refund` |
| `REFUND` / goodwill > threshold (เสนอ 500฿/2,000 COIN) | ✅ | ✅ (CS maker + lead/Finance checker) | edge fn + `ticket_events.step_up_ref` |
| **GRANT ที่ค้ำด้วย third-party funder (D7 quest-comp / merchant/sponsor escrow)** | ✅ | ✅ **เสมอ ไม่ว่าจำนวน** (เงิน funder ไม่ใช่เงินแพลตฟอร์ม) | `cs_grant_goodwill` (กับ funder check) |
| baht refund (เงินออกจริง) | ✅ เสมอ | ✅ (Finance checker — เหมือน `approve_payout` §4.7) | Finance edge fn |
| goodwill เกิน daily cap ต่อ CS / per-city ceiling | ✅ + lead approve | ✅ | rate-limit S1.5 |
| **payee bank-change (ก่อน payout)** | ✅ | สร้างโดย CS/payee เท่านั้น + **24–72h cool-down ก่อน batch** | §4.6 + S4 SoD (ดูล่าง) |
> สอดคล้อง §4.7: money-moving = `S*` ; CS **ไม่มี** `create_payout`/`approve_payout` (matrix §4.4) → baht refund/payout/agent วิ่งผ่าน Finance/Payout role เสมอ (SoD เด็ดขาด)
> **review fix (payout SoD bypass — CRITICAL, payout subsystem):** เมื่อ CS เป็นผู้ **create bank-change proposal** ของ payee (capability "change payout bank" creator=CS/payee) ระบบต้อง enforce ว่า **actor ที่ approve bank-change ในช่วง cool-down (24–72h) ห้ามเป็นคนสร้าง/อนุมัติ payout batch ที่จ่าย payee นั้น** (SoD ข้าม bank-change↔batch, enforce ที่ S4 ด้วย constraint join `audit_log`→`payout_batches`) + บังคับ **notify payee ทุกช่อง out-of-band** (รูป §4 รุ่น auth) ก่อน payout แรกเข้าเลขบัญชีใหม่ — กัน four-eyes bypass ที่ Finance คนเดียว redirect เงิน

---

### S1.4 PII Unmask ต่อ ticket (ABAC + audit + DPO policy)

**default = masked.** CS เห็น **masked view** เสมอ ผ่าน ABAC guard `PII_MASK` (§4.6): คืน field ที่ปกปิด (`08x-xxx-1234`, `p***@gmail.com`, ชื่อย่อ) เว้นแต่มี **active ticket + reason** การเห็นค่าจริงต้องผ่าน unmask flow ที่เป็น `S*` step-up + audit:

```
unmask(cs_subject, ticket, fields[], reason) :=
  REQUIRE ticket.status ∈ {IN_PROGRESS, PENDING_MONEY_ACTION, AWAITING_*}   -- ต้องมี case จริง
  REQUIRE ABAC PII_MASK passes ONLY IF active ticket + reason  (§4.6)
  REQUIRE step_up_mfa(cs_subject)                              -- S* (§4.7: export_pii/unmask)
  REQUIRE reason_code ∈ {verify_identity, locate_redemption, psp_dispute_doc, refund_payee, legal_request}
  REQUIRE fields ⊆ MINIMUM_NECESSARY(ticket.category)         -- data minimization (PDPA C.4)
  → reveal fields (time-boxed: หมดสิทธิ์เมื่อ ticket ออกจาก active state หรือ 60 นาที แล้วแต่ถึงก่อน)
  → WRITE audit_log + ticket_events(pii_unmask): {who, ticket, fields, reason_code, justification, IP, device, step_up_ref, ts}
  → set ticket.pii_unmasked = true
```

**DPO policy layer (Role 12 oversight):**
- ทุก `pii_unmask` ปรากฏใน **immutable audit_log** ที่ **DPO ตรวจได้** (§4.7) — DPO เป็นคนเดียวที่ "เฝ้า CS"
- field กลุ่ม **sensitive จริง (KYC, payment instrument, location trajectory)** → CS unmask ไม่ได้แม้มี ticket ต้อง **DPO approve ต่อคำขอ** (route → `Q_PRIVACY`) ; CS เห็นได้แค่ contact (ชื่อ/เบอร์/email) สำหรับ verify ตัวตน
- **erasure request (PDPA ม.33)** = DPO เท่านั้น — แต่ ledger fact คงไว้ตาม retention (C.3: เก็บ redemption FACT ผ่าน `user_ref`, ลบ mapping `user_ref→identity`) ticket body ที่อ้าง `subject_user_ref` ยัง balance ได้หลัง erase
- **abuse ของ unmask เอง:** rate-limit unmask ต่อ CS/วัน + alert DPO ถ้า CS คนเดียว unmask spike (กัน CS เป็น insider threat ดูดข้อมูล)

**S1.4.1 Erasure eligibility — interface ที่ S1 ต้อง expose ให้ S3 (review fix: erasure-evasion)**

S3.7 erasure gate ต้องอ่าน state ที่อยู่ใน S1/S6 แต่เดิม **ไม่มี interface ระบุ** → gate อาจ pass ทั้งที่มี case เปิด **S1 จึง expose query เดียว:**
```
cs_open_obligations(user_ref) → {
  has_open_dispute      : bool,   -- ticket status ∈ active set ผูก subject_user_ref
  has_pending_money_action: bool, -- PENDING_MONEY_ACTION ค้าง
  fraud_score           : numeric,
  has_false_claim_flag  : bool,   -- D1 false-claim / goodwill-abuse ใน window
  last_card_funded_txn_at: ts     -- สำหรับ chargeback-window check (ดูล่าง)
}
```
- **S3 erasure ต้อง BLOCK** ถ้า `has_open_dispute || has_pending_money_action || has_false_claim_flag || fraud_score ≥ threshold` (กัน fraud-investigation / goodwill-farming evasion ผ่าน PDPA erase) — เมื่อ block ให้ตั้ง `ERASURE_BLOCKED` ภายใต้ legal-obligation/legitimate-interest exception (เหมือนที่ S3 ทำกับ banned device) และ **preserve fraud evidence จน case ปิด**
- **chargeback-window (review observability minor):** card chargeback มาช้าได้ 120–180 วัน → S3 erasure ต้องรอ window จาก `last_card_funded_txn_at` ผ่านก่อน ; และคง **non-PII attribution token (tombstone hash)** ให้ CHARGEBACK/RECOVERY post กลับได้หลัง erase โดย identity ยังถูกลบ — กัน "erase หนีแล้ว chargeback มาทีหลังไม่มี identity ให้ผูก"
- **consistency confirm:** "erasure เก็บ financial FACT" สอดคล้องกับ S3.7/S5.6.3 (เก็บ `user_ref`, ลบ mapping) — ไม่เปลี่ยน

**S1.4.2 Account consolidation — CS ทำไม่ได้ (review fix: real→real laundering, CRITICAL)**

review ชี้ว่า **ไม่มี flow merge สอง real account** และ ops อาจมี consolidation tool ที่ re-point redeemer identity → defeat A.8.12 (same-KYC/device/payment) = ช่องล้างเงิน e-money ที่ความเสี่ยงสูงสุด **คำตัดสันใน S1:**
- **CS ห้าม consolidate / merge / move Coin หรือ payout-bank ระหว่าง real account ที่เคยถือ `coin_lot` หรือ payout bank** — เป็น "forbidden by design" (จุดยืนเดียวกับ "guest ถือ Coin ไม่ได้")
- duplicate-identity ที่ legit → route → `Q_PRIVACY` ต้อง **DPO + Finance dual-control** ; ก่อนอนุญาต REDEEM/payout ใด ๆ หลัง merge ต้อง **re-score identity-graph A.8.12 ข้ามทั้ง source+target** (merge เขียน edge เข้า identity-graph ให้ cluster trip self-redemption เป็นหนึ่ง entity) + **24h cool-down block REDEEM/payout** (รูป §S3.4)
- recovery (S3.6) เข้าบัญชีที่ถือ Coin/escrow → block REDEEM จนกว่า identity-graph re-score เสร็จ

| ระดับข้อมูล | CS เห็น default | CS unmask (S* + reason) | ต้อง DPO |
|---|---|---|---|
| contact (ชื่อ/เบอร์/email) | masked | ✅ (time-boxed, audited) | ❌ |
| redemption fact / quest status | ✅ (ของ user ที่เปิด ticket) | n/a | ❌ |
| payment instrument / KYC doc | ❌ | ❌ | ✅ DPO approve |
| location trajectory / movement graph | ❌ | ❌ | ✅ DPO (rarely; legal only) |

---

### S1.5 Abuse Controls — กัน farming goodwill/GRANT ผ่าน dispute ปลอม

goodwill + quest-comp GRANT = ช่องโหว่ที่คนจะ "แกล้งพิพาท" เพื่อขูด Coin ฟรี — บังคับ 4 ชั้น **กับทุก CS-initiated mint (goodwill GRANT และ D7 quest-comp GRANT เหมือนกัน)**:

1. **Evidence requirement (hard gate):** dispute เงิน (D1/D2/D3) ต้องมี `ticket_evidence` ≥ 1 ชิ้นที่ verify ได้ (receipt/รูป/POS log/geo proof) ก่อนเข้า `PENDING_MONEY_ACTION` ; **D7 quest-comp ต้องมี `quest_step_log` + `geo_proof` ที่ timestamp ตรง quest step** (เข้มกว่า "มี spark_events") — `evidence.hash` **unique ต่อ outcome** กันยื่นซ้ำหลาย ticket
2. **Rate-limit / cap (ผูก B.2.3 + A.8.13 + PRICING locked):**
   - per-user goodwill+quest-comp cap: จำนวนครั้ง + มูลค่ารวมต่อ rolling 30/90 วัน (`platform_config.GOODWILL_USER_CAP` — **นับรวม D7 GRANT ด้วย**) เกิน → auto-route manual review + freeze
   - per-CS daily mint budget + **per-city goodwill ceiling** เกิน → lead approve (S1.3.1)
   - **per-merchant monthly redemption/budget cap (PRICING locked, review cross-gap):** ก่อน CS-initiated GRANT ที่ค้ำด้วย escrow ของ merchant/sponsor → ตรวจว่า draw ไม่ทำให้ funder เกิน monthly cap ; ถ้าเกิน → freeze GRANT scope ของ funder + escalate (กัน CS-initiated draw ดูด escrow ใต้ COGS cap)
   - **dispute velocity:** user ที่เปิด dispute ถี่ผิด cohort (z-score) → `fraud_score` พุ่ง → goodwill/GRANT ถูก **block อัตโนมัติ**
3. **Link to fraud signals (ใช้ control ที่มีอยู่แล้ว):**
   - dispute ป้อนเข้า engine เดียวกับ **A.8.12 anti-self-redemption** และ **B.2.3 agent-merchant collusion z-score** — ถ้า user/ร้านใน dispute ตรง self-redeem/collusion flag → **ไม่ออก mint** route review
   - same KYC/device/payment เปิดหลาย ticket จากหลาย account = Sybil → freeze ทั้ง cluster
4. **Asymmetric outcome:** D1 ที่ "ร้านพิสูจน์ว่าให้ของแล้ว (POS+รูป)" → REJECT + บันทึก `verdict=false_claim` + `fraud_score`↑ + set `has_false_claim_flag` ; false-claim ซ้ำ → ลด trust tier (กระทบสิทธิ์ quest/redeem ตาม B.2.3) ; **flag นี้ block PDPA erasure (S1.4.1)** — ทำให้ farming มีต้นทุน เลี่ยงด้วย erase ไม่ได้

> **invariant:** ไม่มี path ใดที่ Coin (goodwill หรือ quest-comp) ออกได้โดย **(ก)** ไม่มี evidence verified, **(ข)** ข้าม fraud gate, **(ค)** เกิน per-funder solvency / per-merchant COGS cap, หรือ **(ง)** ไม่มี dual-control เมื่อค้ำด้วย third-party funder — **ทั้งสี่บังคับใน edge fn `cs_grant_goodwill` ซึ่งเป็น single mint path เดียวของ CS** (D7 GRANT เรียกผ่าน edge fn เดียวกันนี้ ไม่มีประตูที่สอง)

---

### S1.6 Escalation Paths

```
Tier-0  Deflection bot (FAQ, status lookup, self-service refund < micro threshold)  → AUTO_RESOLVED
Tier-1  CS agent (Q_*; goodwill/REFUND ≤ cap)                                        → RESOLVED
Tier-2  CS lead / City Manager (dispute ค้าง > SLA, goodwill > cap, merchant escalation)
Tier-3  Finance/Payout (เงินบาทจริง, chargeback, agent payout AGENT_PAYOUT, recovery/write-off)
        S5 Content Moderator (review takedown — D5)
        DPO (PII/erasure/sensitive unmask/breach-linked/account consolidation)
        Platform Owner/Admin (วงเงินสูงสุด, policy exception — S* + dual-control)
```

| Trigger | escalate → |
|---|---|
| `sla_due_at` breached | Tier-2 (auto) |
| goodwill/REFUND > threshold | Tier-2 + dual-control |
| CS-initiated GRANT ค้ำ third-party funder (D7/goodwill) | dual-control เสมอ + per-funder cap check |
| baht refund / payout / chargeback / agent payout | **Tier-3 Finance** (CS ไม่มี capability) |
| review takedown (content) | **Tier-3 S5 Content Moderator** (ไม่ใช่ CS) |
| PII sensitive / erasure / account consolidation / suspected breach | **Tier-3 DPO** + (ถ้า breach) incident runbook C.4(d) |
| fraud ring / Sybil cluster | Tier-2 → fraud team → freeze + Owner review |
| merchant escrow dispute วงเงินสูง | City Manager → Finance |

> **breach linkage (consistency confirm — ตรงกับ locked legal posture):** ถ้า ticket เผยว่าเกิด data breach (unmask ผิดคน, data leak) → trigger **incident runbook (C.4(d))**: risk-tier classifier (no-risk / risk / high-risk), 72h-path ปกติ + **safety valve 15 วัน** พร้อม justification, **skip notify ถ้า no-risk** — **ไม่ hard-code 72h SLA ตายตัว** (สอดคล้อง S2.4/S5.3.3/S6.6.4 และ C.4(d)/C.7) ; การยิง breach broadcast ต้องผ่าน path เดียวที่ privileged (DPO console + runbook service role) ไม่ใช่ producer ทั่วไป (เกี่ยวพัน S2 notification — S1 แค่ trigger ไม่ใช่ผู้ broadcast)

---

### S1.7 Worked Example — "Burned-but-no-reward" (D1) end to end

> **เคส:** คุณ A (`user789`) ทำ quest ครบ ได้ Coin 60฿ (6,000 COIN-minor) จาก lot **L1** ที่ funded โดย Merchant M123 → เดินไป redeem ที่ร้าน **R** (Graph Cafe, คนละร้านจาก funder) เพื่อแลกกาแฟ 50฿ ; ร้านสแกน QR-OTP, ระบบ post **REDEEM `T_redeem`** สำเร็จ (burn 5,000 COIN-minor, take-rate 10% = 500 satang, `merchant_payable(R)` = 4,500 satang) **แต่บาริสต้าไม่ได้ทำกาแฟให้** คุณ A เปิด ticket ใน app (ภาษาไทย)

**สถานะ ledger ก่อน dispute** (จาก `T_redeem`, ตาม A.6(4)/B.2.1):
```
coin_liability ลด 5000 COIN | user_coin(A,L1) ลด 5000 COIN | remaining(L1)=1000
coin_backing(M123,L1) ปลด 5000 THB → platform_revenue +500 THB, merchant_payable(R) +4500 THB
```

| ขั้น | event | state | actor | ledger |
|---|---|---|---|---|
| 1 | คุณ A กดแจ้ง "เบิร์นแล้วไม่ได้ของ" แนบรูปใบเสร็จ/หน้าจอ burn | `NEW` | customer (`reporter_role=customer`, `subject_user_ref`) | — |
| 2 | auto-route → `Q_MONEY`, category=`burned_no_reward`, P2 (consumer-money → P2 floor), `linked_redemption_id=T_redeem` | `TRIAGED` | system | — |
| 3 | CS รับงาน, ตรวจ `redemptions` → พบ `T_redeem` **SETTLED** จริง ; evidence hash ผ่าน (S1.5 ชั้น 1) ; **fraud-gate clear (S1.5 ชั้น 2–3) ; ไม่มี linked low-star review บน T_redeem** | `IN_PROGRESS` | CS (scope CNX) | — |
| 4 | CS ส่ง one-tap LINE reply ขอร้าน R ยืนยันว่าให้ของหรือไม่ (ผ่าน merchant reply, ไม่เขียน live) | `AWAITING_MERCHANT` (SLA pause) | merchant R | — |
| 5 | ร้าน R เงียบเกิน timeout → เพราะ fraud-gate ผ่านแล้ว + ไม่มี extortion signal → consumer-protect default ชนะ ; เขียน `dispute_verdicts(verdict=merchant_at_fault)` | `PENDING_MONEY_ACTION:REFUND` | CS | — |
| 6 | money action ≤ threshold (50฿) → CS เดี่ยว, audited (S1.3.1) ; ตรวจ `merchant_payable(R)` ยัง**ไม่ถูก payout** → ไม่ต้อง clawback | (ยัง) `PENDING_MONEY_ACTION` | CS | (about to post) |
| 7 | post **REFUND** (กลับ `T_redeem`, stored amounts, FOR UPDATE บน L1) | — | edge fn `cs_refund` | ดูด้านล่าง |
| 8 | `ticket.resolution_ledger_txn_id = T_refund` ; Coin คืนเข้า wallet คุณ A | `RESOLVED` | system | — |
| 9 | 7 วันไม่ reopen | `CLOSED` | system | — |

**REFUND posting ที่ post (เป๊ะตาม A.6(6), กลับ stored 500/4500 ไม่ recompute):**
```
txn_type=REFUND, reverses_txn_id=T_redeem, ref_type=reversal,
  idempotency_key=hash('REFUND', T_redeem, ticket.id), funded_by=merchant:123
-- 0) SELECT … FROM coin_lots WHERE id=L1 FOR UPDATE
-- 0) one_reversal_per_target ผ่าน (T_redeem ยังไม่เคยถูกกลับ)
-- 0) merchant_payable(R) ยังไม่ payout → ไม่ต้อง clawback (ถ้า payout แล้วต้อง claw ก่อน = hard precondition, S4 owns)
Dr  user_coin(user789)            5000  COIN  (lot_id=L1, expires_at=REFUND_EXPIRY)
Cr  coin_liability(platform)      5000  COIN  (lot_id=L1)
Dr  platform_revenue(platform)     500  THB                       -- ดึง take-rate กลับ (stored)
Dr  merchant_payable(R)           4500  THB                       -- ดึงส่วนร้านกลับ (stored)
Cr  coin_backing(platform, funder=merchant:123)  5000  THB  (lot_id=L1)
ตรวจ: SUM(COIN)=5000=5000 ✓   SUM(THB)=5000=500+4500 ✓
-- coin_lots(L1): remaining_minor 1000 → 6000 ; state='active' ; expires_at=max(L1.expires_at, now()+30d)
```

**ผลลัพธ์ที่ถูกต้องตาม canonical:**
- คุณ A **ได้ Coin 5,000 คืนเต็ม** (lot เดิม L1, ไม่หมดอายุทันทีเพราะ REFUND_EXPIRY) — เอาไปแลกใหม่ได้
- **loss ตกที่ร้าน R ที่บกพร่อง** (ดึง `merchant_payable(R)` 4,500 กลับ) ไม่ใช่แพลตฟอร์มสำรอง — สอดคล้อง #4 (no platform float)
- take-rate 500 ถูกดึงคืน (`platform_revenue` -500) — ถ้า VAT-split job รันไปแล้ว S4 ต้อง reverse VAT + ออก credit note (review minor)
- `coin_backing(M123,L1)` กลับมาค้ำ 5,000 (A.8.5 per-funder ยัง balance), อยู่ใน solvency anchor A.8.2s
- **audit ปิดวง:** `ticket.resolution_ledger_txn_id = T_refund` ; `T_refund.ref_id = ticket.id` ; ทุกอย่าง append-only — ไม่มี balance edit มือ
- **ถ้าร้าน R พิสูจน์ได้** (POS log + รูปกาแฟ + timestamp) ว่าให้ของแล้ว → ขั้น 5 กลายเป็น `REJECT`, `verdict=false_claim`, `fraud_score`↑, `has_false_claim_flag=true` (block erasure) ; **S5 อ่าน verdict นี้ → reweight รีวิว→0 + เก็บ ม.337 evidence ถ้ามีรีวิวกดดัน** (S1.5 ชั้น 4 + ปิด extortion double-dip)

> **ทางเลือก goodwill แทน REFUND (เมื่อ?):** ถ้า Coin หมดอายุไปแล้ว / lot ถูก EXPIRE / user อยากได้ Coin มากกว่าคืน lot เดิม → ใช้ **GRANT goodwill จาก `sponsor:platform_goodwill`** (S1.3(2)) แทน — แต่ default ของ D1 คือ REFUND เพราะคืนสภาพตรงเหตุและ loss ตกถูกฝั่ง (ร้านบกพร่อง) ; goodwill เก็บไว้สำหรับกรณีที่ "ไม่มี REDEEM ให้กลับ" หรือเป็น apology เสริม — และต้องผ่าน gate S1.5 เต็มทั้งสี่ชั้น

---

## S2. Notification Infrastructure

> **เป้าหมาย:** แก้ช่องว่างที่ระบุไว้ใน Integration Review (SYSTEM_PLAN §12.2 บรรทัด NOTIFICATION INFRASTRUCTURE) — รวม push/LINE/email/SMS/in-app ที่กระจายอยู่ใน low-balance alert (§5.3), dunning (§9.1.5), geofenced retention push (§8.5.1), re-verify (§7.1.4), quest-paused (`PAUSED_NO_FUNDS`), DSAR/erasure (§10.7f), breach (§10.7g) ให้เป็น **บริการเดียว** ที่มี channel routing, template i18n, frequency cap กลาง, consent gating ตาม PDPA และ delivery tracking
>
> **หลักการที่ไม่ต่อรอง 6 ข้อ:**
> 1. **Notification ≠ business logic** — service ผลิตและส่ง "ข้อความ" เท่านั้น ไม่ตัดสินใจทางการเงิน ledger เป็น source of truth เสมอ (ห้าม mint/burn/post จาก notif path)
> 2. **Consent gate ก่อน fan-out เสมอ** — แยก `transactional` (ส่งได้บนฐาน contract) จาก `marketing` (ต้อง opt-in ตาม PDPA ม.19) ที่ระดับ event-class ไม่ใช่ระดับปลายทาง
> 3. **Idempotent ทุกชั้น** — `dedup_key` ผูก (user, event_type, entity_id, time-bucket) กัน re-emit ของ event bus ส่งซ้ำ (สอดคล้องหลัก idempotency ของ ledger §A.6 INVARIANT 5)
> 4. **No movement graph** — geofenced pipeline ใช้พิกัดดิบ in-memory แล้วทิ้งทันที (สอดคล้อง §10.7c "เป็นไปไม่ได้ที่จะสร้าง movement graph") — และ **ไม่มี geo-context message ใดถึงคนผิด** (re-bind ownership ก่อนส่ง, §S2.8)
> 5. **Locale + channel ตาม persona** — LINE-first สำหรับ Thai, push สำหรับ Western, WeChat/in-app สำหรับ Chinese FIT (อิง auth provider ใน §3.3 `users`)
> 6. **High-trust channel = privileged primitive** *(เพิ่มจาก Red-team — breach phishing / denial-of-wallet)* — channel ที่ bypass consent/quiet-hours/frequency cap (โดยเฉพาะ `breach.notice` ที่กระจายทาง SMS+email+push ทั้ง userbase) **ไม่ใช่ fire-and-forget producer event** มันคือ break-glass ที่ต้อง dual-control + step-up + audited path + send-budget เหมือน "override-solvency-release" ของ S4 (§S2.9)

---

### S2.1 สถาปัตยกรรม (Event Bus → Notification Service → Channel Adapters)

```
┌─────────────────────────────────────────────────────────────────────┐
│ PRODUCERS (โพสต์ domain event — ไม่รู้จัก channel เลย)                  │
│  ledger triggers · escrow watcher · billing/dunning cron · redemption │
│  engine · re-verify cron · DPO console · breach runbook · agent tasks  │
│  ── หมายเหตุ: producer ทั่วไป INSERT ได้เฉพาะ event_class ∈            │
│     {transactional, marketing}; security/P1 broadcast ถูกกั้นด้วย RLS  │
│     (§S2.9) — มีเฉพาะ DPO console + incident-runbook role เท่านั้น     │
└───────────────┬─────────────────────────────────────────────────────┘
                │ INSERT INTO notif.outbox (transactional outbox)
                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ EVENT BUS = Postgres `notif.outbox` + pg_cron/LISTEN-NOTIFY pump       │
│  (เหตุผล: ไม่เพิ่ม Kafka — outbox row ผูกใน Postgres txn เดียวกับ        │
│   business write → at-least-once, ไม่มี dual-write bug)                │
│  RLS: INSERT policy แยกตาม event_class (privileged class = restricted) │
└───────────────┬─────────────────────────────────────────────────────┘
                │ Edge Function `notif-dispatcher` (pull batch, FOR UPDATE SKIP LOCKED)
                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ NOTIFICATION SERVICE (Supabase Edge Function · stateless)             │
│  1. RESOLVE   event_type → notif_policy (class, priority, channels)   │
│  2. CONSENT   check notif.preferences + consents (PDPA gate §S2.6)    │
│  3. THROTTLE  frequency cap + quiet-hours + anti-fatigue (§S2.6)      │
│  4. RENDER    template i18n + variable interpolation (§S2.3)          │
│  5. ROUTE     เลือก channel + fallback chain ตาม audience/locale      │
│  6. BIND      re-resolve endpoint + ownership ที่ SEND time (§S2.8)    │
│  7. ENQUEUE   notif.deliveries (1 row/channel-attempt)               │
└───────┬───────────┬───────────┬───────────┬───────────┬─────────────┘
        ▼           ▼           ▼           ▼           ▼
   ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌──────────┐
   │ FCM/   │  │ LINE   │  │ Email  │  │ SMS    │  │ In-App   │
   │ APNs   │  │ Msg API│  │(Resend/│  │(Thai   │  │ Inbox    │
   │ adapter│  │ adapter│  │ SES)   │  │ aggr.) │  │ (RLS tbl)│
   └───┬────┘  └───┬────┘  └───┬────┘  └───┬────┘  └────┬─────┘
       └───────────┴── webhook/callback ───┴───────────┘
                        ▼
            notif.delivery_events (sent/delivered/opened/failed/bounced)
                        ▼  retry w/ backoff หรือ fallback channel
```

**ทำไม transactional outbox ไม่ใช่ direct call:** producer ที่สำคัญส่วนใหญ่เป็น **ledger txn** (GRANT, REDEEM, EXPIRE, PAYOUT, SUBSCRIPTION) ซึ่งต้อง commit แบบ atomic การเขียน `notif.outbox` ใน Postgres txn เดียวกัน รับประกันว่า "redemption receipt จะถูกส่ง **ก็ต่อเมื่อ** redemption commit จริง" และจะไม่ส่งถ้า txn rollback ตัด dual-write race ออกตั้งแต่ design

```sql
-- โพสต์ event ภายใน business txn เดียวกัน (ตัวอย่างใน REDEEM path)
INSERT INTO notif.outbox (id, event_type, event_class, audience_user_id,
  merchant_id, city_id, entity_type, entity_id, dedup_key, payload, created_at)
VALUES (gen_random_uuid(), 'redemption.receipt', 'transactional', :user_id,
  :merchant_id, :city_id, 'redemption', :redemption_id,
  'redemption.receipt:'||:redemption_id,        -- dedup: 1 receipt/redemption
  jsonb_build_object('coin_value_thb', :value, 'place_name_i18n', :place,
                     'redeemed_at', now()),
  now());
-- commit พร้อม ledger_entries → dispatcher จับขึ้นมาส่งทีหลัง (decoupled)
-- หมายเหตุ: event_class ถูกบังคับให้ตรงกับ notif.policy.class ผ่าน trigger
--           และ RLS กั้น INSERT ของ class privileged ตาม §S2.9
```

---

### S2.2 Pseudo-schema (notif.* — RLS-protected, append-only ที่ควรเป็น)

```sql
-- ── นโยบายต่อ event_type (seed data, ไม่ใช่ runtime mutable โดย user) ──
notif.policy (
  event_type        text PK,          -- ดู taxonomy §S2.4
  class             text,             -- 'transactional' | 'marketing' | 'security'
  priority          smallint,         -- 1=critical .. 4=low (กำหนด quiet-hours bypass)
  default_channels  text[],           -- ลำดับ preferred → fallback
  consent_purpose   text,             -- NULL=transactional | 'marketing' | 'location_checkin'
  ttl_seconds       int,              -- หมดความหมายเมื่อไร (เช่น rotating-QR ไม่มีใน notif)
  bypass_quiet_hrs  bool,             -- true เฉพาะ priority 1 (security/breach/payout)
  frequency_key     text,             -- bucket สำหรับ anti-fatigue (เช่น 'geo_nudge')
  is_privileged     bool DEFAULT false,  -- true = ต้องผ่าน broadcast-control §S2.9
  deeplink_domains  text[]            -- allow-list domain/path ต่อ template (กัน phishing)
);

-- ── preference center (per user, mutable, source=ผู้ใช้/DPO) ──
notif.preferences (
  user_id           uuid PK FK,
  locale            text,             -- 'th'|'en'|'zh-Hans' (default จาก auth provider)
  channel_optin     jsonb,            -- {"push":true,"line":true,"email":true,"sms":false}
  marketing_optin   bool DEFAULT false,        -- PDPA: opt-IN เสมอ (default off)
  geo_nudge_optin   bool DEFAULT false,        -- ผูก consents.purpose='location_checkin'
  quiet_hours       int4range,        -- เช่น [22,8) ตาม Asia/Bangkok
  max_marketing_day smallint DEFAULT 2,        -- anti-fatigue cap
  msisdn_verified_at timestamptz,     -- ใช้ตัดสิน PII-bearing SMS (§S2.8)
  updated_at        timestamptz
);

-- ── event bus / outbox ──
notif.outbox (
  id uuid PK, event_type text, event_class text, audience_user_id uuid,
  merchant_id uuid, city_id uuid, entity_type text, entity_id uuid,
  dedup_key text UNIQUE,             -- กัน re-emit (สอดคล้อง §A.6 INV5)
  payload jsonb, status text DEFAULT 'pending',  -- pending|claimed|done|suppressed|purged
  incident_id uuid,                  -- non-NULL เฉพาะ privileged broadcast (§S2.9)
  created_at timestamptz, processed_at timestamptz
);

-- ── deliveries (1 row ต่อ channel-attempt) ──
notif.deliveries (
  id uuid PK, outbox_id uuid FK, user_id uuid, channel text,
  locale text, template_id text, template_version int,
  rendered_title text, rendered_body text,    -- snapshot (audit/DSAR)
  endpoint_ref text,                           -- token/email/msisdn ที่ resolve ตอน SEND
  provider_msg_id text,                        -- จาก FCM/LINE/PSP webhook
  status text,                                 -- queued|sent|delivered|opened|failed|bounced|suppressed|purged
  attempt smallint, next_retry_at timestamptz,
  suppressed_reason text,                      -- 'no_consent'|'quiet_hours'|'freq_cap'|'opt_out'|'stale_endpoint'|'owner_changed'|'erased'
  created_at timestamptz, updated_at timestamptz
);

-- ── in-app inbox (RLS: user เห็นเฉพาะของตัว) ──
notif.inbox (
  id uuid PK, user_id uuid, event_type text, title_i18n_rendered text,
  body_rendered text, deep_link text, read_at timestamptz, created_at timestamptz
);

-- ── frequency ledger (sliding window counter, purge หลัง 30 วัน) ──
notif.send_log (user_id uuid, frequency_key text, sent_at timestamptz);

-- ── broadcast control (privileged P1 fan-out — breach/DSAR mass) §S2.9 ──
notif.broadcast (
  incident_id uuid PK, event_type text,        -- 'breach.notice' | 'dsar.*'
  created_by uuid, approved_by uuid,           -- ต้อง ≠ กัน (two-person)
  step_up_at timestamptz,                       -- MFA/step-up ของผู้ approve
  send_budget int, sent_count int DEFAULT 0,    -- hard cap/incident
  killed_at timestamptz,                        -- kill-switch
  status text,                                  -- proposed|approved|firing|done|killed
  created_at timestamptz,
  CHECK (created_by <> approved_by)             -- SoD: ผู้ยิงต้องไม่ใช่ผู้อนุมัติ
);
```

---

### S2.3 Template Management + i18n (TH / EN / ZH-Hans)

**โครงสร้าง:** template เก็บแยกจาก code, versioned, แปลครบ 3 ภาษา (สอดคล้อง §3.9 i18n strategy + §10.6 translation pipeline) — ใช้ ICU MessageFormat เพื่อรองรับ plural/gender/number ของแต่ละภาษา

```sql
notif.template (
  template_id   text,           -- 'redemption.receipt'
  version       int,            -- bump เมื่อแก้ข้อความ (deliveries snapshot version ที่ใช้)
  locale        text,           -- 'th'|'en'|'zh-Hans'
  channel       text,           -- บางช่องสั้นกว่า: sms ≤ 70 char, push ≤ 178
  title_tmpl    text,           -- ICU: "{place_name} · คุณแลก {coin_value, number} COIN แล้ว"
  body_tmpl     text,
  deeplink_tmpl text,           -- ต้อง resolve อยู่ใน policy.deeplink_domains เท่านั้น (§S2.9)
  status        text,           -- draft|approved|live  (Content Moderator approve ก่อน live)
  PRIMARY KEY (template_id, version, locale, channel)
);
```

**กฎ i18n ที่บังคับ:**
- **Fallback chain ของภาษา:** `zh-Hans → en → th` (Chinese FIT ต้องไม่ตกไป Thai; §8.3 ระบุ "zh-Hans จริง ไม่ใช่ EN ผ่าน MT คุณภาพต่ำ") ส่วน Thai default → `th → en`
- **Place/merchant name** ดึงจาก `*_i18n` jsonb ที่มีอยู่แล้ว (เช่น `places.name_i18n`) — interpolate ตอน render ไม่ persist ชื่อใน template
- **Variable interpolation** ปลอดภัย: เฉพาะ key จาก `notif.outbox.payload` ที่ allow-list ต่อ template เท่านั้น (กัน template injection / PII leak ลง channel ผิด)
- **Deep-link domain allow-list** *(เพิ่มจาก Red-team — breach phishing)* — `deeplink_tmpl` ที่ render ออกมาต้อง match `policy.deeplink_domains` (host + path-prefix); **ห้าม free-text URL ใน payload ของ P1/security ทุกชนิด** — URL ที่ไม่อยู่ใน allow-list = drop delivery + alert security (ดู §S2.9)
- **เงิน/เวลา/จำนวน:** format ตาม locale (THB satang → "90.00 บาท" / "¥" ไม่ใช้, COIN แสดงเป็น "COIN" ทุกภาษา; เวลาแสดง Asia/Bangkok)
- **Channel-specific render:** push/SMS ตัดสั้น + deep-link; email/in-app เต็มรูปแบบ; LINE ใช้ Flex Message (rich card) สำหรับ receipt/quest
- **SMS = contentless** *(เพิ่มจาก Red-team — PII leak บน fallback)* — SMS template ที่มี PII (place_name/value/geo-context) **ต้อง render เป็น deep-link-only** ("คุณมีใบเสร็จใหม่ แตะดู: <allow-listed link>") ไม่ใส่ชื่อสถานที่/มูลค่าในตัว SMS เพราะ MSISDN อาจถูก recycle (§S2.8)

**ตัวอย่าง template `redemption.receipt`:**

| locale | channel | title | body |
|---|---|---|---|
| th | line | ใช้สิทธิ์สำเร็จ ✓ | คุณแลก **{place_name}** มูลค่า {coin_value} COIN เมื่อ {redeemed_at} · ขอบคุณที่ใช้บริการ |
| en | push | Redeemed ✓ | {coin_value} COIN at {place_name}. Enjoy! |
| zh-Hans | in_app | 兑换成功 ✓ | 您已在 **{place_name}** 兑换 {coin_value} COIN（{redeemed_at}） |
| th/en/zh | sms | (ไม่มี title) | คุณมีใบเสร็จใหม่ · แตะดูรายละเอียด: {deeplink} *(ไม่มี place_name/value ในตัว SMS)* |

---

### S2.4 Event Taxonomy → Channel + Priority

| event_type | class | priority | privileged | consent_purpose | preferred → fallback channels | audience | dedup_key |
|---|---|---|---|---|---|---|---|
| `escrow.low_balance` | transactional | 2 | no | none | **LINE → push → email** (Thai merchant); email→LINE | Merchant + City Mgr | `escrow.low:{merchant}:{day}` |
| `subscription.dunning` (stage 0–4) | transactional | 2 | no | none | **LINE → push → email** (§9.1.5) | Merchant | `dunning:{invoice}:{stage}` |
| `quest.paused_no_funds` | transactional | 2 | no | none | LINE → push → email | Merchant (funder) | `quest.paused:{quest}` |
| `geo.retention_nudge` | **marketing** | 4 | no | `location_checkin`+`marketing` | **push only** (no fallback) | Customer | `geo_nudge:{user}:{quest}:{day}` |
| `merchant.reverify_task` | security | 2 | no | none | **LINE → push → email** | Merchant | `reverify:{merchant}:{cycle}` |
| `redemption.receipt` | transactional | 3 | no | none | **in-app → push**; LINE if Thai | Customer | `redemption.receipt:{redemption}` |
| `payout.sent` | transactional | 1 | no | none | **email → LINE → push** (financial) | Merchant/Agent | `payout:{payout_id}` |
| `dsar.erasure_confirm` | security | 1 | **yes** | none | **email** (legal record) + in-app | Customer | `dsar:{request_id}:{stage}` |
| `breach.notice` | security | 1 | **yes** | none (legal duty) | **email → SMS → push → in-app** (broadcast) | affected users | `breach:{incident}:{user}` |
| `agent.task_assigned` | transactional | 3 | no | none | **push → LINE** (in-app agent mode) | Field Agent | `task:{task_id}` |

**กฎ priority:**
- **P1 (critical):** payout, DSAR/erasure, breach — **bypass quiet-hours + frequency cap**, multi-channel broadcast, ส่ง email เสมอ (legal/financial record). **แต่ event ที่ทำ mass fan-out (`breach.notice`, `dsar.*`) เป็น `is_privileged=true`** → ต้องผ่าน broadcast-control §S2.9 ก่อนยิง (ไม่ใช่ตรง outbox → ส่งเลย)
- **P2 (transactional important):** escrow, dunning, reverify, quest-paused — เคารพ quiet-hours แต่ **ไม่นับ marketing cap**
- **P3 (transactional routine):** receipt, agent task — in-app เป็นหลัก, push เสริม
- **P4 (marketing):** geo nudge — opt-in เท่านั้น, frequency-capped, **ไม่มี fallback channel** (ถ้า push ไม่ถึง = ไม่ส่ง ดีกว่ารบกวน)

> **Breach posture (สอดคล้อง canonical — Integration Review ยืนยัน CONSISTENT กับ S1.6 / S5.3.3 / S6.6.4):** ใช้ **tiered runbook** ไม่มี rigid 72h hard-SLA, มี 15-day valve, และ skip-notify ได้เมื่อ "no-risk" — ตรงกับ locked legal posture (§10.7g) `breach.notice` จึงเป็นเครื่องมือใน runbook ที่ผ่าน DPO assessment ไม่ใช่ trigger อัตโนมัติแบบ fire-and-forget (เสริมด้วย §S2.9)

---

### S2.5 Geofenced Push Pipeline (PostGIS + dwell + quiet-hours + frequency cap)

> ขยายจาก §8.5.1 ให้เป็น pipeline จริง — **tasteful ไม่ spam** และ **ไม่สร้าง movement graph** (§10.7c)

```
┌── Edge geo ingest (device โพสต์ coarse ping เมื่อ foreground เท่านั้น) ──┐
│ INPUT: device_id, lat/lng (in-memory only — ไม่ INSERT พิกัดดิบ)         │
└───────────────────────────────┬────────────────────────────────────────┘
        GATE 0 · CONSENT      ▼  geo_nudge_optin=true AND consents(location_checkin)=granted
        GATE 1 · QUIET HOURS  ▼  now ∉ preferences.quiet_hours (default 22:00–08:00 ICT)
        GATE 2 · PROXIMITY    ▼  ST_DWithin(device.geom, candidate_step.place.geom, 250m)
                                 candidate = quest step ที่ user "เหลืออีก 1 ร้านจบ" เท่านั้น
        GATE 3 · DWELL        ▼  มี ≥2 ping ใน radius ห่างกัน ≥90s (กัน drive-by / ไฟแดง)
        GATE 4 · FREQUENCY    ▼  send_log(geo_nudge) < max_marketing_day (default 2/วัน)
                                 AND ≥6h ตั้งแต่ geo nudge ครั้งล่าสุด
        GATE 5 · RELEVANCE    ▼  quest ยัง ACTIVE (ไม่ PAUSED_NO_FUNDS/ENDED)
                                 AND step ยังไม่เก็บ AND ยังไม่เคย nudge step นี้วันนี้
        GATE 6 · COOLDOWN     ▼  ไม่ nudge place เดิมซ้ำใน 7 วันถ้า user เพิกเฉยครั้งก่อน
                              ▼
        EMIT notif.outbox(event_type='geo.retention_nudge', dedup_key=geo_nudge:{user}:{quest}:{day})
                              ▼  พิกัดดิบถูก DISCARD ทันที (เหลือแค่ boolean "ผ่าน geofence")
```

**Tone ตาม persona (§8.1.3):** tourist = FOMO/urgency ("เหลืออีก 1 ร้านจบ Nimman Cafe-Hop · Ristr8to ห่าง 200m ⏳"), local/nomad = habit/streak ("รักษา streak 6 วัน · Graph Cafe ใกล้คุณ"). เลือก template variant จาก `profiles.persona`.

**Anti-spam guarantees:** สูงสุด 2 geo nudge/วัน, เว้น ≥6 ชม., bypass ไม่ได้ในช่วง quiet-hours, ต้อง dwell จริงไม่ใช่แค่ผ่าน, และ "เพิกเฉย = ลด" (cooldown 7 วัน ต่อ place ที่ไม่ตอบสนอง — adaptive suppression)

> **ระวัง geo-context ถึงคนผิด** *(เพิ่มจาก Red-team — PII/movement leak บน fallback)* — geo nudge เป็น **push-only ไม่มี fallback อยู่แล้ว** จึงไม่มีปัญหา channel-hop แต่ push token อาจถูก reassign ได้ ดังนั้นก่อนยิงทุกครั้งต้องผ่าน **SEND-time ownership re-bind** (§S2.8): re-resolve `devices.push_token → user_id` ปัจจุบัน ถ้า token ไม่ผูกกับ user เป้าหมายแล้ว → drop (`suppressed_reason='owner_changed'`) เพื่อกัน geo-context ("Ristr8to 200m away") ไปถึงคนแปลกหน้า ซึ่งจะละเมิดหลักไม่ต่อรองข้อ 4

---

### S2.6 Consent Gating (PDPA) + Delivery Tracking + Retries + Dedup

**Consent gate (ตามลำดับ ก่อนทุก fan-out):**

| ขั้น | ตรวจอะไร | ถ้าไม่ผ่าน |
|---|---|---|
| 1. Class split | `policy.class` = marketing? | ต้อง `preferences.marketing_optin=true` + `consents(purpose='marketing', granted=true)` (PDPA ม.19) ไม่งั้น **suppress** |
| 2. Channel opt-in | `preferences.channel_optin[channel]` | ข้าม channel นั้น → ลอง fallback ถัดไป |
| 3. Location-derived | event ใช้พิกัด? | ต้อง `consents(purpose='location_checkin', granted=true)` (§10.7a) |
| 4. Withdrawal honor | `consents.revoked_at IS NOT NULL` | suppress + log `suppressed_reason='opt_out'` (ถอนได้ทุกเมื่อ §10.7b) |

> **กฎเหล็ก PDPA:** transactional (receipt, payout, dunning, breach, DSAR) **ไม่ต้องขอ marketing consent** — ส่งบนฐาน *สัญญา/หน้าที่ตามกฎหมาย* (§10.7a lawful-basis map) แต่ marketing/geo-nudge **ต้อง opt-in** (default off) preference center ใน Profile (§8.2.6) ให้ผู้ใช้ toggle ราย channel + ราย purpose และ DPO console (§10.7f) แก้แทนได้พร้อม audit

**Delivery tracking + retry:**
- ทุก channel adapter เขียน `notif.delivery_events` จาก webhook (FCM delivery receipt, LINE webhook, PSP/email bounce) → state machine: `queued → sent → delivered → opened` หรือ `failed/bounced`
- **Retry policy:** exponential backoff `1m → 5m → 30m → 2h` สูงสุด 4 ครั้ง; หลัง max → ลอง **fallback channel ถัดไปใน chain** (เช่น LINE fail → push → email); P4 marketing ไม่ retry/fallback
- **SEND-time re-bind ก่อนทุก attempt** *(เพิ่มจาก Red-team — PII leak บน stale token / fallback)* — ดู §S2.8: re-resolve endpoint + ownership ทุก attempt/fallback ไม่ใช่ตอน enqueue
- **Hard bounce** (invalid token/email) → mark channel suppressed + flag preference center ให้ผู้ใช้แก้
- **Stale token:** FCM/APNs `NotRegistered` → ลบ `devices.push_token`, fallback ทันที (พร้อม re-bind §S2.8)

**Dedup (3 ชั้น):**
1. `notif.outbox.dedup_key UNIQUE` — กัน producer re-emit (re-trigger ของ cron/event bus)
2. **Coalescing window** — รวม event ซ้ำใน 60 วินาที (เช่น escrow แตะ low หลายครั้งใน 1 นาที = 1 alert)
3. **Cross-channel dedup** — ถ้า user เปิด in-app inbox อ่าน receipt แล้ว ภายใน TTL → ยกเลิก push ที่ค้างคิว (mark superseded)

**Rate limits + anti-fatigue (สรุป):**

| ขอบเขต | limit | เหตุผล |
|---|---|---|
| Marketing/user/วัน | ≤ `max_marketing_day` (default 2) | anti-fatigue |
| Geo nudge/user/วัน | ≤ 2, เว้น ≥6h, dwell-gated | §8.5.1 tasteful |
| Provider API (LINE/FCM) | token-bucket ต่อ provider quota | กัน 429 throttle |
| Breach broadcast | batch + jitter, **per-incident send_budget (hard cap) + kill-switch** (§S2.9) | กัน burst, กัน denial-of-wallet, ส่งทันเวลา §10.7g |
| Transactional | ไม่จำกัด (แต่ dedup) | ผู้ใช้คาดหวัง receipt/payout เสมอ |

---

### S2.7 Channel Routing Matrix (audience × locale → preferred channel)

| Audience / persona | auth provider (§3.3) | locale default | preferred channel | เหตุผล |
|---|---|---|---|---|
| **Thai / nomad** | LINE | th | **LINE → push → in-app** | LINE คือ super-app ของไทย, open-rate สูงสุด |
| **Western tourist** | Apple/Google | en (device) | **push → in-app → email** | ไม่มี LINE; push native ดีสุด |
| **Chinese FIT** | WeChat | zh-Hans | **in-app → WeChat → push** | FCM/APNs/LINE ไม่ถึงในจีน; in-app + WeChat เชื่อถือได้ |
| **Merchant** | LINE/email | th | **LINE → push (merchant app) → email** | ร้านไทยใช้ LINE OA; email สำหรับ financial record |
| **Field Agent** | LINE/Apple/Google | th | **push (agent mode) → LINE** | task ต้อง real-time ในแอป |
| **Finance/DPO/Admin** | email | th/en | **email → in-app** | audit trail, ไม่ใช้ marketing channel |

> **Genuine founder call:** ส่ง SMS ผ่าน Thai aggregator (Thaibulksms/PSP) **เฉพาะ P1** (breach, OTP-grade) เพราะ SMS ไทยมีต้นทุน ~0.30–0.50 บาท/ข้อความ และ deliverability LINE สูงกว่า — **default ที่แนะนำ: SMS = break-glass channel เท่านั้น** ไม่ใช้กับ transactional/marketing ปกติ และ SMS ที่มี PII ต้อง contentless (deep-link only, §S2.3) + ผ่าน MSISDN freshness check (§S2.8)

---

### S2.8 SEND-time Endpoint Re-bind + Erasure Purge (Red-team: PII leak บน fallback / post-erasure)

> **ปัญหาที่ปิด:** recycled MSISDN / reassigned FCM token ทำให้ receipt หรือ geo-context ไปถึง "คนใหม่" ที่ถือเบอร์/อุปกรณ์เดิม; และ notification ที่ค้างคิวอยู่ใน `notif.deliveries` ก่อน user ลบบัญชี (§3.7) ยังยิงออกได้หลัง `devices` ถูกลบ → PDPA-reportable confidentiality event และขัดหลักไม่ต่อรองข้อ 4

**กฎ re-bind (บังคับทุก attempt, ทุก fallback — ที่ SEND time ไม่ใช่ enqueue time):**
1. **Re-resolve endpoint สด** — query `devices`/`preferences`/`consents` row ปัจจุบันของ `delivery.user_id` ใหม่ ทุกครั้งก่อนส่ง ห้ามใช้ endpoint ที่ snapshot ไว้ตอน enqueue
2. **Ownership check** — ถ้า token/MSISDN/email ไม่ผูกกับ `delivery.user_id` แล้ว (เปลี่ยนเจ้าของ, ถูก reassign) → **drop** `suppressed_reason='owner_changed'` ห้าม fallback ไปยัง endpoint ที่ ownership เปลี่ยน
3. **Freshness check** — token ที่ `NotRegistered`/หมดอายุ → `suppressed_reason='stale_endpoint'`, ลบ `devices.push_token`, แล้วค่อย fallback (โดย fallback endpoint ก็ต้องผ่าน re-bind อีกชั้น)
4. **PII-bearing SMS** — ต้องมี `preferences.msisdn_verified_at` ภายใน window ที่กำหนด (เช่น ≤180 วัน) มิฉะนั้นส่งได้เฉพาะ contentless deep-link (§S2.3) — กัน recycled SIM อ่าน PII
5. **Erasure purge (เพิ่มใน cascade ของ §3.7)** — เมื่อ user ขอ erasure: `UPDATE notif.deliveries SET status='purged', suppressed_reason='erased' WHERE user_id=:u AND status IN ('queued')` และ `UPDATE notif.outbox SET status='purged' WHERE audience_user_id=:u AND status IN ('pending','claimed')` ก่อน/พร้อมลบ `devices` — กัน queued notification ยิงหลังบัญชีหาย (ประสานกับ observability finding เรื่อง queued-after-erase)

> **หมายเหตุ scope:** rendered_title/rendered_body ที่ "ส่งไปแล้ว" (status sent/delivered) เป็น audit/DSAR snapshot — erasure ใช้ pseudonymize ตามนโยบาย §3.7 (keep financial/legal fact) ส่วนที่ purge คือเฉพาะ **queued** ที่ยังไม่ส่ง

---

### S2.9 Privileged Broadcast Control (Red-team CRITICAL-adjacent: breach phishing / denial-of-wallet)

> **ปัญหาที่ปิด:** `breach.notice` (และ `dsar.*` mass) bypass consent + quiet-hours + frequency cap และ fan-out SMS+email+push ทั้ง userbase ถ้า producer ใดก็ตามที่ INSERT `notif.outbox` ได้ (service role over-privileged, SQL-injection ใน producer) ก็จะได้ primitive ส่ง phishing แบรนด์แพลตฟอร์มถึงทุกคน หรือทำ denial-of-wallet (SMS ~0.30–0.50฿ × userbase) ต้องปฏิบัติกับมันเหมือน "override-solvency-release" ของ S4 — dual-control ไม่ใช่ fire-and-forget

**กฎบังคับ (mirror S4 SoD/step-up):**
1. **Restricted emission path** — `policy.is_privileged=true` (`breach.notice`, `dsar.*`) มี **RLS INSERT policy** ที่อนุญาตเฉพาะ role `dpo_console` + `incident_runbook` เท่านั้น producer ทั่วไป (ledger trigger, cron, agent) INSERT event เหล่านี้ **ไม่ได้** — DB ปฏิเสธที่ชั้น RLS ไม่ใช่แค่ app check
2. **Two-person + step-up** — ก่อน dispatcher จะ fan-out privileged event ต้องมี `notif.broadcast` row ที่ `status='approved'`, `created_by <> approved_by` (CHECK constraint), และ `step_up_at` (MFA/step-up ของผู้อนุมัติ) ภายใน window — ไม่มี approved broadcast = outbox row ค้าง `suppressed` (ไม่ส่ง)
3. **Deep-link allow-list (P1 ทุกชนิด)** — payload ของ privileged/P1 event **ห้ามมี free-text URL** ทุก link ต้อง resolve อยู่ใน `policy.deeplink_domains` (host + path-prefix) มิฉะนั้น drop + alert security (สอดคล้อง §S2.3)
4. **Per-incident send budget + kill-switch** — `notif.broadcast.send_budget` เป็น hard cap ต่อ incident; dispatcher เพิ่ม `sent_count` แบบ atomic และหยุดเมื่อถึง budget; `killed_at` (kill-switch) หยุด fan-out กลางคันได้ทันที — ปิดทั้ง denial-of-wallet และ phishing-at-scale
5. **Audit** — ทุก broadcast log ลง audit trail (ใคร propose/approve/step-up/kill, budget, จำนวนที่ส่งจริง) เหมือน financial override

> **สอดคล้อง canonical:** ยังเคารพ breach legal posture เดิม (tiered, no rigid 72h, 15-day valve, skip-notify no-risk — §10.7g) แค่เพิ่ม "ใครยิงได้และยิงได้แค่ไหน" ไม่ได้เปลี่ยนเงื่อนไขทางกฎหมายว่าต้องแจ้งเมื่อไร — DPO ยังเป็นผู้ตัดสิน assessment, control นี้แค่กั้นไม่ให้ broadcast primitive ถูก abuse จากนอก runbook

---

## S3. Auth, Identity & Account Lifecycle

> **ขอบเขต:** ชั้น auth / identity / account-lifecycle ทั้งระบบ — flows ต่อ provider, custom JWT claims ที่ RLS อ่าน, guest→account merge, multi-provider linking, **กฎห้าม real→real consolidation (anti-laundering)**, step-up MFA, account recovery และ PDPA erasure cascade
> **อ้างอิง canonical (ห้ามขัด):** Chart of Accounts §A.1, txn_types §A.7, anti-self-redemption **§A.8.12** (e-money boundary), RBAC scope tree §4, step-up MFA §4.7, ตาราง `users`/`profiles`/`devices`/`consents` §3.3, identity-graph / community-detection §5, PDPA สิทธิ §C.4, Accounting Act ม.14 retention §C.3
> **หลักการเหนือทุกอย่าง:** server-authoritative ที่ Supabase Auth + Postgres เท่านั้น; Flutter เป็น UX-only; identity เป็น **first-class anti-fraud signal** (ผูกตรงกับ §A.8.12 / identity-graph) ไม่ใช่แค่ login — **ทุก operation ที่ re-point หรือรวม identity ต้องผ่าน A.8.12 identity-graph ก่อนปล่อย REDEEM/payout**

---

### S3.0 ภาพรวมสถาปัตยกรรม identity (1 user = หลาย provider + หลาย device)

```
Supabase Auth (auth.users)  ──1:1──►  public.users (id = auth.uid())
        │  (GoTrue: email/OTP/OAuth)        │
        │                                   ├── identities  (1 user → N providers: line/apple/google/wechat/anon)
   custom JWT claims  ◄── auth_hook ────────┤
   (role[], scope_*, aal, ids)              ├── profiles    (display/locale — §3.3)
        │                                   ├── devices     (anti-fraud, §3.3)
        ▼                                   ├── consents    (PDPA, §3.3)
   Postgres RLS  อ่าน claims               └── account_links (verification audit ของการ link)
   (ไม่ recursive table lookup)
```

**คำตัดสินรากฐาน (founder/tech call — RECOMMENDED DEFAULT):**
1. **Supabase Auth (GoTrue) เป็น identity hub** — provider ที่ GoTrue รองรับ native (Apple/Google + email OTP) ใช้ตรง; provider ที่ไม่รองรับ (LINE, WeChat) เข้าผ่าน **custom OIDC / Edge Function token-exchange** แล้ว `admin.createUser`/`linkIdentity` เพื่อให้ `auth.uid()` เป็น PK เดียวเสมอ — RLS จึงอ้าง identity เดียวทั่วทั้งระบบ
2. **`public.users.id == auth.uid()`** (ตาม §3.3) — ทุก subsystem (ledger user_coin, spark_balances, check_ins, redemptions) ผูกกับ `user_id` ตัวนี้ตัวเดียว
3. **anonymous (guest) ก็มี `auth.uid()` จริง** (GoTrue anonymous sign-in) — Sparks/quest/check-in ของ guest เขียนใต้ uid นั้น แล้ว **merge** เข้า real uid ตอน first value-capture (§S3.3)
4. **identity เป็น invariant ที่ A.8.12 ผูกตรง** — `auth.uid()` คือ key ที่ anti-self-redemption ใช้ (funder==redeemer / same KYC/device/payment). ดังนั้น **ทุก operation ที่ทำให้ Coin/payout-rail เปลี่ยน identity เจ้าของ (merge, recovery, consolidation) คือ A.8.12-sensitive** และอยู่ใต้กฎ §S3.4b

> **หมายเหตุ alignment (ยืนยันจาก review):** `roles[]` / `scope_*` claims (§S3.2) ตรงกับ 12 canonical RBAC roles §4 และกฎ SoD/step-up §4.6/§4.7; ไม่มี subsystem ใด reintroduce recursive `user_roles` JOIN ใน RLS — JWT-claim approach นี้คือ canonical pattern ที่ S1/S4/S5/S6 อ้างอิงร่วม (ไม่ต้องแก้)

---

### S3.1 Auth flows ต่อ provider (LINE / Apple / Google / WeChat / Guest)

#### ตารางตัดสิน provider ต่อ audience

| Audience | Primary provider | Mechanism บน Supabase | ตั้ง default locale | หมายเหตุ feasibility/cost |
|---|---|---|---|---|
| Thai local + nomad | **LINE Login** | Custom OIDC / token-exchange Edge Fn (GoTrue ไม่มี LINE native) | `th` | LINE Login v2.1 ฟรี; ผูก LINE Messaging API channel เดียว → ส่ง **LINE OTP / notify** ได้ (ใช้ใน step-up §S3.5) |
| Western tourist | **Apple + Google** | GoTrue native OAuth | device locale (`en` fallback) | Apple **บังคับ** ถ้ามี third-party login บน iOS (App Store Guideline 4.8) → ต้องมี Apple; Apple private-relay email = ต้อง handle no-real-email |
| Chinese FIT | **WeChat** | Custom OIDC / token-exchange Edge Fn | `zh` | ดูกล่อง feasibility ด้านล่าง |
| ทุกกลุ่ม (ลองก่อนสมัคร) | **Guest / anonymous** | GoTrue anonymous sign-in | device locale | uid จริง แต่ `is_anonymous=true`; merge ที่ §S3.3 |

> **WeChat feasibility / cost (founder call — สำคัญ):** WeChat OAuth ต้องเลือก scope ให้ถูก:
> - **WeChat Open Platform (开放平台)** — เสีย **ค่าธรรมเนียมตรวจสอบ ~US$99/ปี** ต่อ app, รองรับ "WeChat Login" ข้าม app (QR + in-app) สำหรับ **mobile app ที่ลงทะเบียนแล้ว** — นี่คือสิ่งที่เราต้องใช้สำหรับ Flutter app เพื่อให้ FIT ที่มาเที่ยวจริง login ได้
> - **ปัญหา cross-border:** การสมัคร Open Platform ปกติต้องมี **นิติบุคคลจีน (Chinese business license)** หรือผ่าน **third-party ISV/agency** ที่ถือ license แทน (มีค่าบริการรายปี) — ถ้าไม่มีนิติบุคคลจีน นี่คือ blocker จริง
> - **MAU plan B (RECOMMENDED launch posture):** ถ้า Open Platform ยังเปิดไม่ได้ทันวันแรก → ให้ FIT จีน **เข้าแบบ guest + เบอร์มือถือ (phone OTP ผ่าน 2C2P/SMS)** และ **Alipay/WeChat Pay เป็น payment rail แยกจาก auth** (acquiring ไม่ผูกกับ login) — ผู้ใช้จ่ายเงินได้โดยไม่ต้องมี WeChat *Login*; เก็บ WeChat Login ไว้เฟส 2 เมื่อจัดการ license ได้ ⚠️ **founder decision**

#### State machine ของ auth session (ทุก provider ลู่เข้าสถานะเดียว)

```
          guest sign-in                    OAuth/OIDC success            link เพิ่ม provider
ANON ──────────────────────► AUTHENTICATED(is_anonymous=true)
  │                                  │  first value-capture (§S3.3)
  │                                  ▼
  │                          MERGED → AUTHENTICATED(real, aal1)
  │                                  │  step-up (§S3.5)
  │                                  ▼
  │                          AUTHENTICATED(real, aal2)  ◄── high-impact action ต้องอยู่สถานะนี้
  │                                  │  logout / token revoke
  │                                  ▼
  └──────────────────────►   SIGNED_OUT
```

> `aal` = Authenticator Assurance Level (GoTrue claim): `aal1` = login ปกติ, `aal2` = ผ่าน step-up (TOTP/biometric/OTP) — RLS/Edge Fn เช็ค `aal=aal2` ก่อนปล่อย high-impact action (§S3.5)

---

### S3.2 Custom JWT claims ที่ RLS ใช้ (scope carried in token — ไม่ recursive lookup)

**ปัญหาที่แก้:** ถ้า RLS policy ของทุกตารางต้อง `SELECT ... FROM user_roles JOIN scopes ...` เพื่อรู้สิทธิ์ → เกิด **recursive RLS lookup** (policy เรียก table ที่เองมี policy) + ช้า + เสี่ยง infinite recursion **คำตัดสิน: scope เดินทางมากับ JWT** — RLS อ่านจาก `auth.jwt()` (in-memory, ไม่ query) เท่านั้น

#### Claim shape (เซ็ตโดย **Custom Access Token Auth Hook** ตอน mint token)

```jsonc
// payload ส่วน custom (นอกเหนือ sub/aud/exp ของ GoTrue)
{
  "sub": "u_789",                       // = auth.uid()
  "is_anonymous": false,
  "aal": "aal1",                        // aal1 | aal2 (step-up)
  "app_metadata": {
    "roles":        ["Customer","Merchant"],          // role[] — flatten จาก role_assignments (ตรงกับ 12 canonical roles §4)
    "scope_city_ids":   ["cnx"],                       // city ที่ subject มีสิทธิ์
    "scope_region_ids": [],
    "merchant_ids": ["m_123"],                         // entity scope: ร้านที่เป็นเจ้าของ/พนักงาน
    "territory_ids":["nimman"],                        // district scope ของ Field Agent
    "claims_ver":   42                                 // bump เมื่อ scope เปลี่ยน (ดู refresh)
  }
}
```

> claim ทั้งหมดเป็น **array** (`roles[]`, `scope_city_ids[]`, `merchant_ids[]`, `territory_ids[]`) เพื่อรองรับ user ที่ถือหลาย role/หลาย entity (เช่น Merchant 2 ร้าน + Customer) — ตรงกับ §4 ที่ assignment เป็น (role × scope) หลายแถว

#### RLS อ่าน claim โดยตรง (ตัวอย่าง — ไม่มี table lookup)

```sql
-- helper: ดึง array จาก JWT (STABLE, ไม่ query table)
create function auth.merchant_ids() returns uuid[] language sql stable as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' -> 'merchant_ids')::jsonb, '[]'::jsonb
  )::text::uuid[];
$$;

-- policy: Merchant เห็นเฉพาะ escrow/redemption ของร้านตัวเอง — อ่าน claim ล้วน
create policy merchant_owns_escrow on escrow_wallets for select
  using ( merchant_id = any(auth.merchant_ids()) );

-- policy: Field Agent เขียน change_proposal ได้เฉพาะใน territory ของตน
create policy agent_territory on change_proposals for insert
  with check (
    'Field Agent' = any( (auth.jwt()->'app_metadata'->'roles')::jsonb::text[] )
    and district_id = any(auth.territory_ids())
  );
```

#### กลไก refresh เมื่อ scope เปลี่ยน (ปัญหา stale claim)

`role_assignments` เปลี่ยน (เพิ่ม merchant, ย้าย territory, ถอน role) แต่ JWT ที่ user ถืออยู่ยังเป็นชุดเก่า (อายุ ~1 ชม.) → **claim ค้าง**

| Trigger เปลี่ยน scope | กลไก | latency |
|---|---|---|
| INSERT/DELETE `role_assignments` | trigger → `UPDATE auth.users SET app_metadata` (เซ็ต source ที่ hook อ่าน) + bump `claims_ver` | ทันที (ฝั่ง server state) |
| token รอบถัดไป | Custom Access Token Hook อ่าน `app_metadata` ที่ bump แล้ว → claim ใหม่ | ≤ JWT TTL (เสนอ **access TTL = 15 นาที**, refresh TTL ยาว) |
| **ต้องมีผลทันที** (ถอนสิทธิ์/ban/SoD) | **force re-auth:** `auth.admin.signOut(uid, scope:'global')` revoke refresh tokens + ตาราง `revoked_claims_ver` ให้ Edge Fn เช็ค `jwt.claims_ver >= users.min_claims_ver` มิฉะนั้น 401 | ทันที |

> **คำตัดสิน:** การ "เพิ่มสิทธิ์" รอ TTL ได้ (15 นาที); การ "ถอนสิทธิ์/ban/เปลี่ยน owner ร้าน (§A.7 OWNERSHIP_TRANSFER)" ต้อง **immediate revoke** ผ่าน `min_claims_ver` gate — กัน window ที่ ex-owner ยัง mutate ร้านได้ (สำคัญต่อ ledger/escrow)

---

### S3.3 GUEST → ACCOUNT MERGE (รวม Sparks / quest-progress / check-in ตอน first value-capture)

**เป้าหมาย:** ให้ลองเล่นก่อนสมัคร (ลด funnel friction) แต่พอจะ **capture value จริง** (redeem Coin / รับ GRANT / ผูก escrow / เขียนรีวิวที่นับ) ต้อง upgrade เป็น real account — แล้ว carry งานที่ทำไว้มาด้วย โดย **กันโกง** (guest farming)

> **ขอบเขตของ S3.3 (สำคัญ):** S3.3 ครอบคลุม **guest(anon) → real เท่านั้น**. การรวม **real → real** (ผู้ใช้สร้างบัญชีจริงซ้ำ / ops consolidation) เป็นคนละ class ที่มีความเสี่ยง laundering สูง → อยู่ใต้กฎแยก **§S3.4b** (ห้ามโดย design สำหรับบัญชีที่เคยถือ Coin/payout-bank)

#### Trigger ของ merge

Merge เกิดเมื่อ guest พยายามทำ action ใน **value-capture set** ต่อไปนี้ (action เหล่านี้ require `is_anonymous=false`):
- รับ **GRANT** (mint Coin — §A.6(3)) · ทำ **REDEEM** · ผูก payment/escrow · receive payout · เขียนรีวิวที่ติด reward · เข้าร่วม quest ที่มี Coin reward

#### กฎ dedup & conflict (merge guest_uid → real_uid)

| Asset | กฎ merge | conflict rule |
|---|---|---|
| **Sparks** (`spark_events`, §A.4) | re-point `user_id: guest→real`; rebuild `spark_balances` จาก events | **cap:** ยอด Sparks ที่ merge ได้จาก guest ≤ `GUEST_SPARK_MERGE_CAP` (เสนอ = ยอดที่ได้จาก ≤ N check-in) — กัน farm guest หลายตัวแล้วเทเข้าตัวจริง |
| **quest-progress** | union ของ step ที่ทำเสร็จ; ถ้าทั้งสอง uid ทำ step เดียวกัน → นับครั้งเดียว (idempotent ที่ `(quest_id, step_id, user)`) | step ที่ guest ทำ **ไม่ถูกนับซ้ำ** ถ้า real account ทำแล้ว |
| **check-ins** (`check_ins`) | re-point `user_id`; **dedup** ที่ `(place_id, day, user)` | check-in ที่ guest+real ทำที่ร้านเดียวกันวันเดียวกัน → 1 ครั้ง |
| **Coins (`user_coin`/lots)** | guest **mint Coin ไม่ได้เลย** (GRANT require real) → ไม่มี ledger leg ของ guest ให้ merge | ตัด conflict class นี้ทิ้งทั้งหมดที่ระดับ design |
| **devices/consents** | device ของ guest re-point ไป real; consent **ต้อง re-collect** (guest ไม่เคยให้ consent ในนาม real identity) | — |

> **คำตัดสินสำคัญ:** **guest ห้าม mint/hold Coin** (Coin คือเงิน-ledger §A.0 ต้องมี backing + KYC boundary §A.8.12). guest ถือได้แค่ **Sparks + quest-progress + check-in** (non-money). ผลคือ merge ไม่เคยแตะ `ledger_entries` เลย → ไม่มี double-entry ให้ reconcile, ไม่มี solvency risk จาก merge **และนี่คือเหตุผลที่ guest→real merge ปลอดภัยจาก A.8.12 ในขณะที่ real→real ไม่ปลอดภัย (§S3.4b)**

#### Abuse prevention (guest-farming)

| Vector | Control |
|---|---|
| สร้าง guest หลายตัว → farm Sparks → merge เทเข้าตัวจริง | `GUEST_SPARK_MERGE_CAP` + per-`device_fingerprint` cap (§3.3 `devices`): guest ที่มา **จาก device เดียวกับ real account อยู่แล้ว** → Sparks ไม่ทบ (นับ device เป็น identity) |
| guest หลายตัวบน device เดียว | 1 device → merge ได้ **ครั้งเดียวต่อ rolling window** (เสนอ 24 ชม.); เกินนั้น Sparks ของ guest ใหม่ = 0 |
| guest อายุยืนเพื่อสะสม | guest uid TTL: anonymous session ที่ไม่ convert ภายใน **30 วัน** → purge (PDPA minimization + กัน sleeper farming) |
| collusion ผูกกับ §A.8.13 Sybil cap | merge **เขียน edge ใน identity-graph** (§5 anti-fraud): guest device/IP ผูกกับ real → feed เข้า community-detection ring เดิม |

#### Sequence diagram — GUEST MERGE

```
Guest(app)   EdgeFn:auth-merge   GoTrue        Postgres(txn)        identity-graph
   │  ทำ value-capture action       │             │                     │
   │───(req + guest JWT)───────────►│             │                     │
   │                                │ ต้อง real → trigger upgrade        │
   │◄──401 NEEDS_UPGRADE────────────│             │                     │
   │  เลือก provider (LINE/Apple/WeChat)          │                     │
   │───(OAuth/OIDC)────────────────────────────►  │                     │
   │                                │◄─identity───│                     │
   │                                │ linkIdentity(guest_uid, provider) │ ← uid เดิมคงไว้
   │                                │  (ถ้า provider sub ผูกกับ real_uid อื่นแล้ว → ดู conflict ล่าง)
   │                                │───BEGIN txn──────────►            │
   │                                │   • re-point spark_events (cap)   │
   │                                │   • union quest-progress          │
   │                                │   • dedup check_ins               │
   │                                │   • is_anonymous=false            │
   │                                │   • re-collect consents           │
   │                                │───emit merge edge────────────────►│ ring check
   │                                │◄──COMMIT──────────────            │
   │◄──200 MERGED (real JWT, aal1)──│             │                     │
```

> **Conflict: provider sub ผูกกับ real account อื่นอยู่แล้ว** (เช่น guest ลองแล้วล็อกอินด้วย LINE ที่เคยสมัครไว้) → **ไม่สร้าง user ใหม่ / ไม่ merge เข้า guest** แต่ **discard guest, ล็อกอินเข้า real account เดิม**, แล้วพยายามยก Sparks/quest ของ guest มา (ภายใต้ cap + dedup เดิม) — ป้องกัน account สับสนและ orphan ledger. **กรณีนี้ไม่ใช่ real→real merge** เพราะ guest ยัง mint Coin ไม่ได้ → ไม่มี Coin/payout-bank ให้ดูดข้าม identity; ถ้า guest เคย promote เป็น real ไปแล้วและมี Coin/bank → เข้ากฎ §S3.4b (ห้าม consolidate)

---

### S3.4 MULTI-PROVIDER LINKING (LINE + Apple + WeChat → 1 user) + anti-takeover

**เป้าหมาย:** Thai-nomad ที่ใช้ LINE วันนี้, พรุ่งนี้ลง iPhone อยากใช้ Apple, ต้องเป็น **คนเดียวกัน** (Coin/Sparks/tier ไม่หาย) — แต่การ link ต้องกัน **account-takeover** (attacker link provider ของตัวเองเข้า account เหยื่อ) **และต้องไม่กลายเป็นช่องดูด Coin ข้าม identity (§S3.4b)**

> **ขอบเขตชัด:** §S3.4 = **ADD provider เข้า user เดิม 1 ตัว** (1 user ↔ N providers). มัน **ไม่** รวมสองบัญชีเข้าด้วยกัน และ **ไม่** ย้าย Coin/escrow/payout ระหว่าง user. การพยายามใช้ linking/recovery เพื่อ "ดึง" ตัวเองเข้าอีก identity แล้วเข้าถึง Coin ของ identity นั้น = laundering pattern ที่ §S3.4b ปิด

#### กฎ linking (เขียน audit ที่ `account_links`)

| กฎ | รายละเอียด |
|---|---|
| **เริ่มจากบัญชีที่ login อยู่** | link ต้องทำตอน session ของ user จริงเท่านั้น (`auth.linkIdentity`) — ไม่ใช่ "merge by matching email" อัตโนมัติ (email collision = takeover vector, โดยเฉพาะ Apple private-relay) |
| **provider ใหม่ต้อง verify ครบ** | OAuth/OIDC ของ provider ใหม่ต้อง success (พิสูจน์ครอบครอง) ก่อน link |
| **step-up ก่อน link** | การ link/unlink provider = high-impact → require **aal2** (§S3.5) — กัน attacker ที่ขโมย session ชั่วคราวมา link provider ตัวเองค้างไว้ |
| **provider sub ผูกได้ 1 user** | `UNIQUE(provider, sub)` ทั้งระบบ — sub เดียว link ได้ account เดียว; พยายาม link sub ที่มีเจ้าของแล้ว → reject + alert |
| **unlink ไม่ทำให้ orphan** | unlink provider สุดท้ายไม่ได้ (ต้องเหลือ ≥ 1 วิธี login); unlink → ส่ง notify ทุก channel ที่เหลือ |
| **link = A.8.12 identity event** | ทุก link/unlink **เขียน edge เข้า identity-graph (§5)** และ **recompute A.8.12 cluster** ก่อนปล่อย REDEEM/payout ถัดไป (ดู cool-down ล่าง) — provider ใหม่ที่ผูก device/payment ของ funder เข้ากับ redeemer = self-redemption signal |

```sql
account_links            -- audit ของการ link/unlink (immutable append-style)
  id              uuid pk
  user_id         uuid fk → users
  provider        enum   -- line | apple | google | wechat
  provider_sub    text
  action          enum   -- link | unlink
  verified_aal    text   -- 'aal2' บังคับ
  ip / device_id  ...
  created_at      timestamptz
  UNIQUE(provider, provider_sub) WHERE action='link' AND active
```

#### Anti-account-takeover controls

- **ห้าม auto-merge by email** — Apple/Google คนละ provider อาจให้ email เดียวกันได้; merge อัตโนมัติ = ช่องโหว่ → ต้อง explicit link ใน session
- **notify ทุก channel เมื่อมี link ใหม่** — LINE push + email + in-app: "มีการเพิ่มวิธีล็อกอิน X — ไม่ใช่คุณ? กดที่นี่" + revoke
- **cool-down + re-auth หลัง link** ภายในหน้าต่างเสี่ยง: หลัง link provider ใหม่ → block "เปลี่ยน payout bank / export PII / ลบบัญชี / **REDEEM / payout**" เป็นเวลา **24 ชม.** (กัน takeover-then-drain **และ link-then-launder**); REDEEM/payout ปลดล็อกเฉพาะหลัง identity-graph re-score ผ่าน (ดู §S3.4b)
- **เชื่อม identity-graph (§5):** provider ใหม่ที่ผูก device/IP ที่ flagged → manual review ก่อน activate

> **Cross-ref payout layer (S4):** กฎ "เปลี่ยน payout bank = 24h cool-down + notify ทุก channel" นี้เป็น **auth-owned primitive** แต่ S4 (payout) ต้องบังคับซ้ำที่ชั้น payout: actor ที่ approve การเปลี่ยน bank ของ payee ภายใน cool-down **ห้าม** เป็นผู้สร้าง/อนุมัติ batch ที่จ่าย payee นั้น (SoD ข้าม bank-change↔batch-create). **ความ binding ฝั่ง batch เป็นของ S4** — S3 จัดให้แค่ cool-down + notify primitive; S4 join `account_links`/audit เข้า `payout_batches` เอง

---

### S3.4b REAL → REAL CONSOLIDATION — ห้ามโดย design (anti-laundering / A.8.12 e-money boundary) 🔴 CRITICAL

**ปัญหาที่ปิด (review CRITICAL):** A.8.12 (anti-self-redemption = e-money compliance boundary) key อยู่บน `funder == redeemer / same KYC / device / payment`. ถ้ามีเครื่องมือ ops ที่ "รวมสองบัญชีจริง" หรือ recovery ที่ re-point Coin/payout ข้าม identity → funder-merchant ที่คุม account X (ถือ Coin ที่ self-redeem ไม่ได้) สามารถ **recover/link เข้า account Y บน device สะอาด แล้ว REDEEM ที่นั่น** = ฟอก escrow ของตัวเองกลับเป็นเงินสด, ทำลาย boundary BoT e-money. นี่คือ **gap ที่ความเสี่ยง compliance สูงสุด**

#### กฎเหล็ก (hard rules)

| # | กฎ | เหตุผล |
|---|---|---|
| 1 | **ไม่มี real→real account merge** สำหรับบัญชีที่ **เคยถือ `coin_lot` ใด ๆ (active/expired/redeemed) หรือเคยผูก payout bank** | ปิด laundering vector; จุดยืนเดียวกับ "guest ถือ Coin ไม่ได้" — เมื่อ Coin/payout เข้ามาเกี่ยว, identity แช่แข็ง |
| 2 | duplicate-identity ที่ **ถูกต้องตามจริง** (ผู้ใช้สร้างซ้ำโดยบังเอิญ, ยังไม่เคยมี Coin/bank) → consolidate ได้ **ภายใต้ DPO + Finance dual-control** เท่านั้น (ไม่ใช่ self-service, ไม่ใช่ CS เดี่ยว) | maker-checker; ป้องกัน single-actor identity move |
| 3 | ก่อน consolidate (กรณีอนุญาตตาม #2): **recompute A.8.12 identity-graph edges ข้าม cluster ต้นทาง+ปลายทาง**; merge **เขียน edge เข้า §5 identity-graph** เพื่อให้ cluster ที่รวมแล้ว trip self-redemption เป็น **entity เดียว** | merged cluster ต้องถูกมองเป็นหนึ่งตัวตนต่อ A.8.12 |
| 4 | หลัง consolidate/link/recovery ใด ๆ ที่แตะ identity → **block REDEEM + payout จนกว่า identity-graph re-score เสร็จ** (ต่อยอด §S3.4 24h cool-down) | กัน window ที่ใช้ identity ใหม่ redeem ก่อน graph ตามทัน |
| 5 | ไม่มี path ที่ re-point `coin_lots.owner` / `user_coin` / payout-bank ข้าม `user_id` — **ผิด design**; การโยก value ทำได้เฉพาะผ่าน canonical ledger txn (REDEEM/REFUND/PAYOUT) ที่มี double-entry, ไม่ใช่ identity re-point | ไม่ให้เกิด orphaned `coin_lots` หรือ double-counted backing |

#### Decision gate (ops/recovery/link ทุกทางต้องผ่าน)

```
ขอ consolidate / recovery-into-account / link ที่จะรวม asset ข้าม identity:
  ├─[target หรือ source เคยมี coin_lot ใด ๆ OR เคยผูก payout bank]
  │     → REJECT (ไม่มี real→real merge by design)  [กฎ#1]   🔴
  │
  └─[ทั้งสองสะอาด: ไม่เคยมี Coin/payout bank]
        → require DPO + Finance dual-control  [กฎ#2]
        → recompute A.8.12 across both clusters + write §5 edges  [กฎ#3]
        → block REDEEM/payout until graph re-score passes  [กฎ#4]
        → consolidate identity refs เท่านั้น (ไม่ re-point ledger)  [กฎ#5]
```

> **เชื่อมกับ §S3.6 recovery:** recovery เข้า account ที่ **ถือ Coin/escrow** อยู่แล้ว ต้อง human review (เดิม) **และเพิ่ม: block REDEEM จนกว่า identity-graph re-score ใหม่** — recovery คือ identity move ชนิดหนึ่ง จึงอยู่ใต้กฎ #4 เดียวกัน
> **คำตัดสิน (founder/legal):** จุดยืน "ไม่มี real→real merge สำหรับบัญชีที่แตะเงิน" คือ **non-negotiable e-money control**; ถ้าธุรกิจต้องการ consolidation จริง ๆ ในอนาคต ต้องออกแบบเป็น flow ที่ผ่าน canonical ledger (เช่น redeem→re-grant ภายใต้ KYC ใหม่) ไม่ใช่ identity re-point — และต้อง BoT/e-money legal sign-off

---

### S3.5 STEP-UP MFA ต่อ high-impact action / role (เลือก method)

ต่อยอด §4.7 (step-up triggers) — S3 ระบุ **วิธีพิสูจน์** ต่อ action/role และ mapping ไป `aal2`

#### Method matrix

| Method | เหมาะกับใคร | เมื่อใช้ | หมายเหตุ |
|---|---|---|---|
| **Biometric (passkey/WebAuthn + Face/Touch)** | ทุก role, default บนมือถือ | step-up ทั่วไป, unlock high-impact | ผูกกับ device; phishing-resistant; เป็น default ที่ดีสุดสำหรับ consumer |
| **TOTP (authenticator app)** | staff roles (Admin/Finance/DPO/Owner) | จัดการเงิน/PII/role | GoTrue MFA native; ไม่พึ่ง provider channel; บังคับสำหรับ role ที่มี `S*` ใด ๆ |
| **LINE OTP** | Thai customer/merchant ที่ใช้ LINE | step-up consumer ที่ไม่มี passkey | ส่งผ่าน LINE Messaging API channel เดียวกับ login — ต้นทุนต่ำ, คุ้นเคย |
| **Phone OTP (SMS)** | FIT จีน / fallback | recovery, ไม่มี channel อื่น | ต้นทุนสูงสุด + SIM-swap risk → ไม่ใช้กับ action การเงินถ้ามี method อื่น |

#### Action → required method (เลือก method ตาม role × ความเสี่ยง)

| Action (จาก §4.7 / §A.7) | required | acceptable method |
|---|---|---|
| `REDEEM` ยอดสูง / ผูก escrow แรก | aal2 | biometric หรือ LINE/phone OTP |
| `approve_payout` (§A.7 PAYOUT — เงินจริงออก) | aal2 + **SoD** (creator≠approver) | **TOTP บังคับ** (staff) |
| เปลี่ยน payout bank (merchant/agent) | aal2 + 24h cool-down + notify ทุก channel | biometric/TOTP (cool-down/SoD ฝั่ง batch บังคับซ้ำที่ S4 — §S3.4) |
| `grant_role` (Admin/Owner/Finance/DPO) | aal2 | TOTP บังคับ |
| `export_pii` / unmask (DPO) | aal2 + reason log | TOTP บังคับ |
| link/unlink provider (§S3.4) | aal2 | biometric/TOTP |
| **real→real consolidation (§S3.4b, กรณีอนุญาต)** | aal2 + **DPO + Finance dual-control** | TOTP บังคับทั้งสองฝั่ง |
| **เริ่ม account deletion / erasure** | aal2 + cool-down | biometric/TOTP + notify |
| `OWNERSHIP_TRANSFER` ร้าน (§A.7) | aal2 ทั้งสองฝั่ง | TOTP/biometric + immediate claim-ver revoke (§S3.2) |

> RLS/Edge Fn เช็ค `auth.jwt()->>'aal' = 'aal2'` + `amr` timestamp (step-up ต้องสดภายใน N นาที) ก่อนปล่อย action; ทุก step-up เขียน immutable audit (§4.7)

---

### S3.6 Account recovery

| สถานการณ์ | flow | control กัน takeover |
|---|---|---|
| ลืม/เปลี่ยนมือถือ แต่ยังมี ≥ 1 provider | login provider เดิม → ใช้ได้ทันที (account ไม่ผูก device เดียว) | — |
| เสีย provider หลัก (เช่นเลิก LINE) | login ด้วย provider อื่นที่ link ไว้ (§S3.4) | นี่คือเหตุผลที่แนะนำ link ≥ 2 provider |
| เสียทุก provider + ขอ recovery | คิว manual recovery: ยืนยัน control เดิม (recovery email/phone ที่ verify ไว้) + **cool-down 24–72 ชม.** + notify ทุก channel เดิม | ห้าม recover ทันที; account ที่มี **Coin/escrow ค้าง** → ต้อง **human review** ก่อนปลด **และ block REDEEM/payout จนกว่า A.8.12 identity-graph re-score ใหม่ (§S3.4b กฎ#4)** |
| staff role lockout (TOTP หาย) | recovery code (เก็บตอน enroll) หรือ Admin reset ภายใต้ **SoD** (คนละคนกับเจ้าของ) + audit | reset role-bearing account เป็น high-impact, log เสมอ |

> **Hard rule:** recovery **ห้าม bypass §S3.5** — หลัง recover สำเร็จ บัญชีกลับมาที่ `aal1`, การทำ high-impact ยังต้อง step-up ใหม่; และ **block payout/erasure 72 ชม.** หลัง full recovery (กัน recover-then-drain). recovery ที่ดึงตัวเองเข้า identity อื่นเพื่อเข้าถึง Coin ของ identity นั้น = **ห้ามตาม §S3.4b** (recovery ไม่ใช่ช่องทาง consolidate ข้ามบัญชีที่มีเงิน)

---

### S3.7 ACCOUNT DELETION / PDPA ERASURE cascade (ม.33) — pseudonymize ledger, ห้าม evade clawback/investigation

**ความตึงหลัก (§C.3 / §C.4):** PDPA ม.33 ให้สิทธิ erasure ↔ Accounting Act **ม.14 บังคับเก็บหลักฐานการเงิน 5–7 ปี** + §A ledger เป็น **append-only ห้าม DELETE**. คำตัดสิน: **erase ตัวตน, เก็บ fact ทางการเงิน** (pseudonymize ไม่ลบ ledger) + **BLOCK erasure ถ้ามี obligation / open investigation / chargeback-window ค้าง**

#### Erasure eligibility gate (เช็คก่อนเริ่ม — เป็น hard precondition; **อ่าน state ข้าม subsystem ตาม interface ที่ระบุ**)

```
ERASE อนุญาตเฉพาะเมื่อ ทั้งหมด เป็นจริง:
  ✓ ไม่มี coin_lots state=active ของ user (Coin live ที่ยังไม่ redeem/expire)        [§A.5.1]
  ✓ balance(user_coin) = 0
  ✓ ไม่มี open dispute / chargeback case ที่ user เกี่ยว                              [อ่าน S1 support_tickets, §A.6(7)]
  ✓ ไม่มี open clawback ค้าง (agent commission/bounty 90-วัน window)                  [อ่าน S4 payout_breaks / agent track, §B.3.1]  [BLOCK]
  ✓ ไม่มี merchant_receivable / negative-balance ที่ผูกกับ identity นี้                [อ่าน ledger balance, §A.6(7)]
  ✓ ไม่มี payout in-flight (clearing leg ยังไม่ปิด)                                   [§A.7 PAYOUT]
  ✓ balance(payout_suspense for payee) = 0  ← bounced payout ค้าง = แพลตฟอร์มยังเป็นหนี้ผู้ใช้  [อ่าน S4 payout_suspense, §S4.5.2]   ★ใหม่
  ✓ ไม่มี fraud_cases ในสถานะ {open, in_review, escalated} สำหรับ subject นี้           [อ่าน S6 fraud_cases, §S6.2]                ★ใหม่ [BLOCK]
  ✓ fraud_score ต่ำกว่า threshold OR ไม่มี false-claim / goodwill-abuse flag ใน window ล่าสุด  [อ่าน S6/S1 flags]                ★ใหม่
  ✓ acquirer chargeback window ผ่านแล้วบน card-funded txn ล่าสุด (เสนอ 120–180 วัน)     [อ่าน last card txn date, §S6.1.5]          ★ใหม่ [BLOCK]
มิฉะนั้น → สถานะ ERASURE_BLOCKED + แจ้งเหตุผล + คาดการณ์วันปลด (เช่น "หลัง Coin หมดอายุ / ปิด clawback window / ปิด fraud_case / พ้น chargeback window <date>")
```

> **Interface contract (ปิด cross-gap):** gate นี้ **ต้องอ่าน state จาก subsystem อื่นจริง** — มิฉะนั้น gate ผ่านได้ทั้งที่มี case เปิด:
> - dispute/chargeback open → query **S1 `support_tickets`** (subject_user_ref, status open) + **S6 `fraud_cases`(kind=chargeback_after_redeem)**
> - clawback/receivable/suspense → query **S4** (`payout_breaks` written_off?, `merchant_receivable` balance, `payout_suspense` per payee)
> - fraud investigation/score → query **S6 `fraud_cases`** + fraud_score store
> Edge Fn `erase-account` เรียก read-only RPC ของแต่ละ subsystem (idempotent, ไม่ mutate) ก่อนตัดสิน; ถ้า RPC ใดล้มเหลว/ไม่ resolve → fail-CLOSED เป็น `ERASURE_BLOCKED` (ห้ามลบเมื่อยืนยัน eligibility ไม่ได้)

> **เหตุผล (anti-evasion):** ถ้าปล่อยให้ user ที่มี **negative balance / open clawback / dispute / open fraud_case / pending chargeback / suspense ค้าง** ลบตัวเองได้ = หนีหนี้/หนีการสอบสวน fraud ผ่านสิทธิ PDPA. cascade เดิม DELETE `devices` + `spark_events` = ลบ **หลักฐาน anti-fraud ที่ใช้สอบ case** → ต้องกันก่อน. PDPA ม.33 ยอมให้ปฏิเสธ erasure เมื่อมี **legal obligation / สิทธิเรียกร้องตามกฎหมาย / legitimate interest (สอบสวน fraud)** → obligation พวกนี้เข้าข้อยกเว้น (ต้อง legal sign-off, §C.3 "ASK YOUR LAWYER")

#### ระหว่าง open fraud_case — preserve, ไม่ใช่ delete

ถ้า user มี `fraud_cases` เปิด → `ERASURE_BLOCKED` และ **PRESERVE `spark_events` / `devices` / raw fraud-evidence (raw GPS ≤90 วัน) ภายใต้ legitimate interest จนกว่า case ปิด** — ไม่รัน delete cascade เลย (ต่างจากการเก็บแค่ "hashed fraud-flag ของ banned device" ซึ่งยิงหลัง ban adjudicated เท่านั้น). พอ case ปิด + adjudicate แล้ว → ถ้าไม่ ban: เข้า gate ปกติ; ถ้า ban: เก็บ fraud-flag hash ตาม cascade ปกติ

#### Cascade ต่อ subsystem (อะไรลบ / อะไร pseudonymize / อะไรเก็บ)

| Subsystem | การกระทำ | เหตุผล |
|---|---|---|
| `auth.users` / GoTrue identities | **DELETE** (provider sub, email, phone) | ตัด login + PII auth |
| `profiles` (display_name, avatar) | **DELETE** | PII display |
| `consents` | เก็บ **proof-of-consent + เวลา erasure** (กฎหมายต้องพิสูจน์ว่าเคย/เลิก) | accountability ม.37 |
| **`ledger_entries` / `ledger_transactions`** | **PSEUDONYMIZE ไม่ลบ** — `created_by`/owner_id ของ user → **financial-attribution tombstone** (`erased:<hash>`); ลบ `memo_i18n` ที่มี PII; เก็บ amount/txn_type/seq/timestamp | append-only §A.2 + ม.14 retention; เก็บ **fact** ไม่เก็บ identity |
| **tombstone hash = anchor ของ post-erasure reversal** | tombstone (`erased:<hash>`) เป็น **non-PII financial-attribution token** ที่ CHARGEBACK/RECOVERY/REFUND ยัง post ทับได้ และ **audit↔ledger cross-check (§S6.4.2) ถือเป็น counterpart ที่ resolve ได้** | late chargeback (120+ วัน) ต้องมี identity-token ให้เกาะ มิฉะนั้น attribution หาย ★ใหม่ |
| `coin_lots` / `user_coin` account | account → `closed`; ผูกกับ tombstone (มีได้เฉพาะถ้า balance=0 ตาม gate) | §A.1 frozen/closed rule |
| `redemptions` (fact) | เก็บ **redemption fact** (place, time, amount) แต่ pseudonymize user → tombstone | §C.3: เก็บ fact ไม่เก็บ movement graph |
| `check_ins` raw geo | **DELETE raw GPS** (PostGIS point) ทั้งหมด | §C.4(f) + minimization — geo ไม่ใช่หลักฐานบัญชี |
| `spark_events` / `spark_balances` | **DELETE** (non-money §A.4) — **เว้นกรณี open fraud_case ที่ต้อง preserve (ดูด้านบน)** | ไม่มี retention obligation (ปกติ) |
| `devices` (fingerprint, geo) | **DELETE**; แต่เก็บ **hashed fraud-flag** ถ้ามีประวัติ ban — **และ preserve เต็มถ้า fraud_case ยังเปิด** | กัน ban-evasion ผ่าน erasure |
| **queued `notif.deliveries` / `notif.outbox`** | **DELETE/purge แถวที่ค้างคิวของ user นี้** เป็นส่วนหนึ่งของ cascade | กัน notification ที่ enqueue ก่อนลบยังยิงหลัง `devices` ถูกลบ → PII/geo leak ไปผิดคน (§S2.6) ★ใหม่ |
| media ที่ user อัปโหลด | DELETE หรือ orphan + ลบ EXIF/geo | minimization |
| audit log (§4.7) | เก็บ (immutable) — pseudonymize ตัว subject ถ้า log นั้นไม่ใช่หลักฐานคดี | accountability vs minimization (legal call) |

#### State machine — ERASURE

```
ACTIVE
  │  user ขอลบ (self-service privacy center §C.4) + step-up aal2 (§S3.5)
  ▼
ERASURE_REQUESTED
  │  รัน eligibility gate (S3.7 — รวม fraud_case / suspense / chargeback-window / cross-subsystem reads)
  ├──[open fraud_case]────────► ERASURE_BLOCKED + PRESERVE evidence ──(case ปิด/adjudicate)──► ERASURE_REQUESTED
  ├──[obligation/chargeback-window ค้าง]──► ERASURE_BLOCKED ──(obligation ปิด/Coin หมดอายุ/พ้น window)──► ERASURE_REQUESTED
  │
  └──[ผ่าน gate]──► GRACE (cool-down 30 วัน — กันกดพลาด/recover ได้, soft-disable login)
                       │  ครบ grace + ไม่ยกเลิก
                       ▼
                    ERASING (cascade S3.7 ใน Postgres txn ต่อ subsystem)
                       │
                       ▼
                    ERASED  (เหลือ: pseudonymized ledger + financial-attribution tombstone + redemption fact + consent proof + fraud-flag hash)
```

#### Sequence diagram — DELETION / ERASURE

```
User   PrivacyCenter   EdgeFn:erase-account   Ledger/Postgres   GoTrue   DPO-queue   S1/S4/S6(read RPC)
 │  ขอลบบัญชี              │                       │               │         │              │
 │──(req + step-up aal2)──►│                       │               │         │              │
 │                         │──run eligibility gate───────────────────────────────────────►│ (read-only)
 │                         │   ✓ no active lots / clawback / dispute / receivable / suspense
 │                         │   ✓ no open fraud_case / fraud_score ok / chargeback-window passed
 │            [BLOCKED]     │◄─ open fraud_case / suspense>0 / chargeback window open ──────│
 │◄─ "ลบไม่ได้: <เหตุผล> ถึง <date>" + PRESERVE evidence ─│       │               │         │
 │                         │                       │               │         │              │
 │            [ELIGIBLE]    │── enqueue GRACE 30d ──►│               │──notify─┤ (DPO มองเห็นคิว)
 │◄─ "จะลบใน 30 วัน ยกเลิกได้" ─────────│           │               │         │
 │   ...(30 วันผ่าน, ไม่ยกเลิก)...        │          │               │         │
 │                         │── BEGIN erase txn ────►│               │         │
 │                         │   • PSEUDONYMIZE ledger_entries → financial-attribution tombstone (ไม่ DELETE)
 │                         │   • DELETE raw check_in geo / spark_events / devices  (เว้น preserve)
 │                         │   • PURGE queued notif.deliveries/outbox ของ user
 │                         │   • keep redemption FACT (ไม่มี user identity)
 │                         │   • close coin/user accounts (balance=0)
 │                         │── DELETE auth identity ───────────────►│         │
 │                         │◄─ COMMIT ──────────────│               │         │
 │◄─ "ลบเสร็จ — เก็บเฉพาะหลักฐานบัญชีตามกฎหมาย" ─────│              │──audit──┤
```

> **เก็บ fact ไม่เก็บ graph (§C.3):** หลัง erasure ระบบ **ตอบ "redemption นี้เกิดจริง เท่าไร ที่ไหน เมื่อไร"** ได้ (ม.14) แต่ **ตอบ "ใครคนนี้เคยไปไหนบ้าง" ไม่ได้** (movement graph ถูกลบ) — นี่คือ minimization ที่ยังคง compliance ภาษี. **financial-attribution tombstone** ทำให้ late chargeback/recovery ยัง post ได้และ audit↔ledger ยัง reconcile ได้ โดย identity ยังถูกลบ
> **ASK YOUR LAWYER THIS (§C.3 ต่อยอด):** "เมื่อ user ใช้สิทธิ erasure ม.33 — (1) เราระงับ erasure ระหว่างมี **open clawback/dispute/negative balance/open fraud_case/payout_suspense ค้าง/ภายใน chargeback window** โดยอ้าง legal obligation + สิทธิเรียกร้อง + legitimate interest (สอบสวน fraud) ได้แค่ไหน; (2) ใน redemption record ที่ pseudonymize แล้ว field ใดยังถือเป็น 'หลักฐานบัญชีสมบูรณ์' ตาม ม.14; (3) เก็บ **fraud-flag hash ของ banned device** + **preserve raw fraud-evidence ระหว่าง open case** + **financial-attribution tombstone ระหว่าง chargeback window** ภายใต้ legitimate interest หลัง/ระหว่าง erasure ได้หรือไม่?"

---

## S4. Payout, Settlement & Tax Operations

> **ขอบเขต:** back-office money ops ที่นั่งทับ canonical ledger (เอกสาร A) — รับ `merchant_payable` / agent earnings ที่ ledger สร้างขึ้น แล้วเดินเงินสดจริงออกจาก `bank_settlement`, reconcile กับ statement ธนาคาร/PSP, จัดการ failed payout, แยกหน้าที่ (SoD) + step-up MFA, หัก ณ ที่จ่าย (WHT 3% agent + 50-ทวิ), VAT 7% + ใบกำกับภาษี (ภพ.20), revenue recognition (deferred → `SUBSCRIPTION_RECOGNIZE`), และ accounting export (CoA → งบการเงิน)
>
> **กฎเหล็กที่ S4 ห้ามฝ่าฝืน (อ้าง A เป๊ะ):** (1) **จ่ายจาก `bank_settlement` เท่านั้น** — เงิน `psp_suspense` (unsettled) จ่ายไม่ได้ (A.8.11); (2) ทุก PAYOUT/AGENT_PAYOUT เดินผ่าน `clearing` ที่ **กลับเป็น 0 ภายในทุก txn** (A.8.1b) — **ห้ามมี clearing leg ข้างเดียว**; (3) ผู้ "สร้าง" payout ≠ ผู้ "อนุมัติ" (SoD) **และ** ผู้อนุมัติ bank-change ≠ ผู้สร้าง batch ที่จ่าย payee นั้น (S4.6.1a); (4) ทุก movement = double-entry append-only ผ่าน `ledger_transactions` + `idempotency_key` ผูก `request_hash` (A.8.8); (5) **batch release ผูกกับ A.8.2s ที่ S6 เป็นเจ้าของ** (S4 อ่านผล ไม่นิยามสูตรเอง) + payable-coverage check (S4.4.2) ต้องผ่านก่อน release รอบ payout
>
> **★ Ownership boundary (แก้ conflict กับ S6 — สำคัญ):** **A.8.2s solvency anchor เป็นของ S6** (S6 owns the run + auto-freeze trigger) สูตร RHS เป็น **canonical narrow ตาม A.8.2s เป๊ะ** = `coin_liability[THB-equiv] + Σ(merchant_escrow available) + Σ(sponsor_budget available) − merchant_receivable`. **S4 ห้าม redefine/ขยาย A.8.2s ภายใต้ code เดิม** (ดราฟต์ก่อนหน้าทำผิดตรงนี้). ความกังวลของ S4 ที่ว่า "payable + ภาษีค้าง ก็เป็น claim ต่อเงินสด" ถูกต้อง — แต่ต้องเป็น **check แยกชื่อ `payable_coverage`** ที่ S4 เป็นเจ้าของ (S4.4.2) ไม่ใช่เปลี่ยนนิยามตัวเดียวกันสองแบบ. batch-approval gate อ่าน **ทั้งสอง** run (A.8.2s ของ S6 + payable_coverage ของ S4) ต้อง `pass` ทั้งคู่.

---

### S4.1 ภาพรวมสถาปัตยกรรม money-out (สองท่อ, รางเดียว)

มี payable **2 ชนิด** ที่ ledger สร้าง แล้ว S4 จ่ายออก:

| ท่อ | บัญชีต้นทาง (ledger) | เกิดจาก txn | ผู้รับ | WHT | VAT |
|---|---|---|---|---|---|
| **Merchant settlement** | `merchant_payable(R)` (CR liability, **canonical A.1**) | `REDEEM` (ส่วนร้านที่ให้ของ = `total_burned − take_rate`, A.6(4)) + leftover คืน funder (`CHURN_SWEEP`/`CAMPAIGN_END`/`EXPIRE` คืน funder) | redeeming merchant / funder | **ไม่หัก** (เป็นเงินของ merchant เอง ไม่ใช่เงินได้ที่เราจ่าย — C.5 ข้อ 3) | **ไม่ใช่ revenue line ของเรา** (VAT อยู่ที่ take-rate ที่เราหักไว้แล้ว) |
| **Agent earnings** | `platform_expense` (DR expense, **B.3.4**) ผ่าน `clearing` | `AGENT_PAYOUT` (task bounty + commission + retainer + override) | Field Agent (freelance) | **หัก 3% (PND.3) + 50-ทวิ** (C.5 ข้อ 2/4, B.3.5) | — (เป็น expense ขาเรา) |

ทั้งสองท่อปล่อยเงินสดจริงออกจาก **`bank_settlement` เท่านั้น** และเดินผ่าน `clearing` (transient, zero-per-txn) เป็น settlement queue:

```
                 ┌─────────────── settled cash anchor (A.8.11) ───────────────┐
ledger สร้าง →  merchant_payable / platform_expense        bank_settlement (DR asset)
batch สร้าง →   payout_items (pending) ──approve(SoD+MFA)──▶ PAYOUT txn ─┐
                                                                          ▼
                                                    Dr merchant_payable/platform_expense
                                                    Cr clearing                          (leg 1)
                                                    Dr clearing                          (leg 2)
                                                    Cr bank_settlement   ◀── เงินออกจริงผ่าน PSP/โอน
                                                    (clearing กลับ 0 ใน txn เดียว — A.8.1b)
```

> **ทำไม route ผ่าน `clearing` ไม่จ่ายตรง:** `clearing` เป็น settlement-in-flight buffer (A.1 ระบุ `clearing` ใช้กับ AFFILIATE/PAYOUT in-flight เท่านั้น, transient) ทำให้ "ledger รับรู้ภาระจ่าย (debit payable)" กับ "เงินออกจากธนาคารจริง (credit bank_settlement)" อยู่ใน txn atomic เดียว และ reconcile กับ bank statement ได้เมื่อ batch รวมหลายรายการเป็นโอนก้อนเดียว. **A.7 PAYOUT row บังคับรูปนี้:** `Dr merchant_payable / Cr clearing → Dr clearing / Cr bank_settlement` (clearing กลับ 0 ใน txn) — S4 ห้ามแตะ `clearing` แบบข้างเดียว (A.8.1b จะ trip global FROZEN)

---

### S4.2 ตารางใหม่/account ใหม่ที่ migration #1 (ส่วน S4) ต้องสร้าง

> **★ Canonical-amendment gate (แก้ canonical_misuse):** account/txn_type ที่ S4 ใช้ แบ่งเป็น 3 ระดับ — **ต้องระบุชัด อันไหน canonical แล้ว อันไหนต้องผ่าน CoA amendment** ห้ามอ้างทุกตัวว่า "canonical" ลอย ๆ:
>
> **(ก) canonical อยู่แล้วใน A.1 — ใช้ได้ทันที:** `bank_settlement`, `psp_suspense`, `merchant_payable`, `merchant_receivable`, `deferred_revenue`, `platform_revenue`, `psp_fee_expense`, `bad_debt_expense`, `escheatment_liability`, **`platform_breakage`** (★ดูหมายเหตุ breakage ล่าง), `clearing`. txn_type canonical: `PAYOUT`, `SUBSCRIPTION`, `SUBSCRIPTION_RECOGNIZE`, `AFFILIATE`, `RECOVERY`, `WRITE_OFF`, `CHURN_SWEEP`, `CAMPAIGN_END` (A.7).
> **(ข) นิยามแล้วใน B/C (locked specs) — ใช้ได้ แต่ต้อง confirm enum ถูก add ใน migration #1:** account `platform_expense`, `wht_payable` (B.3.4, B.7); txn_type `AGENT_PAYOUT`, `AGENT_CLAWBACK` (B.7); ref_type `agent_payout` (B.7); ตาราง `agent_reserve`, `agent_wht_ledger` (B.3.1/B.3.6, D.2 build-gate).
> **(ค) ใหม่จริง — S4 เสนอ ต้องผ่าน founder/canonical CoA amendment + legal ก่อน lock:** account `vat_output_payable`, `vat_input_claimable`, `payout_suspense`; txn_type `WHT_REMIT`, `VAT_REMIT`, `MERCHANT_CLAWBACK`; ตาราง `tax_invoices`, `wht_credit_received`, `payout_batches`, `payout_items`, `payout_breaks`, `reconciliation_runs`. ref_type ใหม่: `merchant_settlement`, `wht_remit`, `vat_remit`, `payout_batch`, `payout_suspense`, `merchant_clawback`.
> **กฎ lockstep:** ทุก account/txn_type ระดับ (ค) ที่ ratified ต้องอัปเดต **S6 reconciliation invariant set พร้อมกัน** เพื่อไม่ให้ tax/expense/suspense account ถูก flag เป็น "foreign account" ตอน recon. ก่อน ratify ห้ามอ้างว่าเป็น canonical.

> **★ Breakage account (REJECT review-finding — สำคัญ):** review บอกให้ rename `platform_breakage` → `expiry_breakage`. **S4 ปฏิเสธ finding นี้** เพราะขัดกับ canonical จริง: A.1 (และหมายเหตุท้าย A.1) ระบุชัด **"ตัด `expiry_breakage` (COIN sink) ทิ้ง"** และบัญชี THB breakage ที่ถูกต้องคือ **`platform_breakage`** (A.1 row + A.6(5)/(8) posting `Dr merchant_escrow / Cr platform_breakage|escheatment_liability`). ดังนั้น S4.9.1 ใช้ `platform_breakage` **ถูกต้องตาม canon** — `expiry_breakage` ไม่มีอยู่ใน CoA นี้แล้ว. (review finding น่าจะอิง CoA ของ spec รุ่นอื่นที่ไม่ใช่ A ฉบับ v2 ที่ lock ที่นี่.)

```sql
payout_batches              -- หนึ่งรอบ-หนึ่ง track-หนึ่ง city  [ระดับ (ค)]
  id                 uuid PK
  city_id            uuid NOT NULL
  track              enum    -- merchant_settlement | agent_earning
  cycle_key          text    -- 'MERCH-2026-W24-CNX' | 'AGENT-2026-06-CNX'
  period_start       date
  period_end         date
  state              enum    -- draft | pending_review | approved | releasing | settled | partially_failed | reconciled | cancelled
  total_gross_minor  bigint  -- satang
  total_wht_minor    bigint  -- satang (agent track เท่านั้น)
  total_net_minor    bigint  -- = gross − wht (ยอดโอนจริง)
  item_count         int
  created_by         uuid    -- Finance/Payout (creator)
  approved_by        uuid NULL -- ต้อง != created_by (SoD); Platform Owner/City Manager
  approved_at        timestamptz NULL
  solvency_check_id  uuid NULL FK → reconciliation_runs  -- A.8.2s (S6-owned run) ต้อง pass ก่อน approve
  payable_check_id   uuid NULL FK → reconciliation_runs  -- ★ S4-owned payable_coverage ต้อง pass ก่อน approve
  created_at         timestamptz DEFAULT now()
  CONSTRAINT sod_creator_ne_approver CHECK (approved_by IS NULL OR approved_by <> created_by)
  UNIQUE(city_id, track, cycle_key)

payout_items                -- หนึ่งรายการ-หนึ่งผู้รับ  [ระดับ (ค)]
  id                 uuid PK
  batch_id           uuid FK → payout_batches
  payee_type         enum    -- merchant | sponsor | agent
  payee_id           uuid
  source_account_id  uuid FK → accounts   -- merchant_payable(id) | platform_expense
  gross_minor        bigint
  wht_minor          bigint DEFAULT 0     -- agent: ส่วนแบ่งของ monthly WHT (S4.7.2); merchant: 0
  net_minor          bigint               -- = gross − wht
  bank_snapshot      jsonb   -- bank_code, acct_no_masked, acct_name, promptpay_id (snapshot ตอนสร้าง)
  bank_changed_at    timestamptz NULL     -- ★ เวลาที่ payee bank ถูกเปลี่ยนล่าสุด (S4.6.1a cool-down gate)
  bank_change_approver uuid NULL          -- ★ ใครอนุมัติ bank change ล่าสุด (cross-action SoD)
  state              enum    -- queued | sent | settled | failed | held | reversed
  psp_payout_ref     text NULL
  failure_code       enum NULL -- invalid_account | name_mismatch | bounce | bank_reject | timeout
  retry_count        int DEFAULT 0
  ledger_txn_id      uuid NULL FK → ledger_transactions
  idempotency_key    text UNIQUE  -- = hash('PAYOUT'|'AGENT_PAYOUT', item.id, batch.cycle_key)  (A.8.8)
  updated_at         timestamptz

agent_wht_ledger            -- B.3.6: หลักฐานหัก ณ ที่จ่ายรายเดือนต่อ agent  [ระดับ (ข)]
  id                 uuid PK
  agent_id           uuid
  tax_period         text    -- 'YYYY-MM' (ภงด.3 รายเดือน)
  gross_minor        bigint  -- รวม payout ในรอบ (aggregate)
  clawback_offset_minor bigint DEFAULT 0  -- B.3.6 net clawback ลด WHT base — capped (S4.7.3)
  wht_base_minor     bigint  -- = max(gross − capped_offset, 0)
  wht_minor          bigint  -- = round(wht_base * 3%) ★ คำนวณครั้งเดียวที่ monthly grain (S4.7.2)
  wht_trueup_minor   bigint DEFAULT 0  -- ★ ส่วนปรับให้ Σ(per-payout posted wht) = wht_minor ก่อน WHT_REMIT
  fifty_tawi_no      text    -- running number (deterministic, รายเดือน)
  fifty_tawi_issued_at timestamptz
  pnd3_export_id     uuid NULL  -- ผูกกับ batch export ภงด.3
  wht_adjusted_ref   uuid NULL  -- B.3.6 ชี้ original payout ที่ถูก claw
  state              enum    -- accrued | certificate_issued | remitted
  UNIQUE(agent_id, tax_period)

tax_invoices                -- ภพ.20 full tax invoice ต่อ revenue event (VAT output)  [ระดับ (ค)]
  id                 uuid PK
  invoice_no         text UNIQUE  -- running ต่อเนื่อง ตามมาตรา 86/4 (ห้ามข้าม/ซ้ำ)
  buyer_type         enum    -- merchant | sponsor
  buyer_id           uuid
  buyer_tax_id       text    -- เลขประจำตัวผู้เสียภาษี
  revenue_line       enum    -- subscription | take_rate | sponsored_quest | data_product | addon
  base_minor         bigint  -- ฐานก่อน VAT (satang)
  vat_minor          bigint  -- = round(base * 7%)
  total_minor        bigint  -- = base + vat
  source_txn_id      uuid FK → ledger_transactions  -- REDEEM/SUBSCRIPTION/SUBSCRIPTION_RECOGNIZE ที่ก่อ revenue
  issued_at          timestamptz
  tax_period         text    -- 'YYYY-MM' (ภพ.30)
  state              enum    -- issued | cancelled | credit_noted
  credit_note_of     uuid NULL FK → tax_invoices  -- ★ ใบลดหนี้ผูกใบเดิม (S4.8.3, REFUND path)

wht_credit_received         -- 50-ทวิ ขาเข้า: merchant หักเรา (PND.53) → เครดิตภาษีนิติบุคคล  [ระดับ (ค), C.5 ข้อ 3]
  id                 uuid PK
  payer_merchant_id  uuid    -- merchant ที่หักเรา
  service_fee_minor  bigint  -- ฐานค่าบริการ (take-rate/subscription) ที่ถูกหัก
  wht_withheld_minor bigint  -- 3% ที่ merchant หัก
  fifty_tawi_ref     text    -- เลขที่ 50-ทวิ ขาเข้า
  tax_period         text
  state              enum    -- received | reconciled_pnd53 | claimed_cit
  source_invoice_id  uuid NULL FK → tax_invoices

reconciliation_runs         -- ผลการ reconcile/solvency/coverage รายวัน (S4.4)  [ระดับ (ค)]
  id                 uuid PK
  city_id            uuid
  run_date           date
  kind               enum    -- daily_solvency(S6-owned) | payable_coverage(S4) | psp_recon | bank_recon | wht_recon | vat_recon
  status             enum    -- pass | break_detected | resolved
  anchor_lhs_minor   bigint  -- ฝั่งเงินสดจริง
  anchor_rhs_minor   bigint  -- ฝั่งภาระ
  break_minor        bigint  -- ส่วนต่าง (≤0 หรือ 0 = ผ่าน แล้วแต่ check)
  external_ref       jsonb   -- bank statement balance, PSP statement net
  created_at         timestamptz

payout_breaks               -- break-investigation workflow (S4.4)  [ระดับ (ค)]
  id                 uuid PK
  recon_run_id       uuid FK
  break_type         enum    -- missing_in_ledger | missing_in_bank | amount_mismatch | timing | unmatched_psp_fee | wht_drift | merchant_budget_cap
  amount_minor       bigint
  state              enum    -- open | investigating | resolved_adjustment | resolved_timing | written_off
  assigned_to        uuid NULL  -- Finance/Payout
  resolution_txn_id  uuid NULL  -- ledger txn ที่แก้ (ถ้ามี)
  sla_due_at         timestamptz
```

---

### S4.3 PAYOUT batches/cycles — schedule, minimum, state machine, posting

#### S4.3.1 ตารางรอบจ่าย (schedule + minimum)

> เก็บทุกค่าใน `platform_config` (`effective_from`) — ไม่ hardcode (สอดคล้อง B.7)

| พารามิเตอร์ | ค่า default | เหตุผล |
|---|---|---|
| `MERCHANT_PAYOUT_CYCLE` | **รายสัปดาห์** ตัดยอดทุก **อังคาร 23:59 ICT**, โอน **พฤหัส** | ให้เวลา settle + reconcile 1 วันทำการ; อังคารตัดยอดจับ redemption สุดสัปดาห์ครบ |
| `MERCHANT_PAYOUT_MIN_THB` | **300 ฿** | ต่ำกว่านี้ roll-over ไปรอบหน้า (กันค่าธรรมเนียมโอนกินยอดจิ๋ว) |
| `AGENT_PAYOUT_CYCLE` | **รายเดือน** ตัดยอด **สิ้นเดือน**, โอน **วันที่ 5 เดือนถัดไป** | sync กับรอบ WHT/ภงด.3 รายเดือน (B.3.6 50-ทวิ สรุปรายเดือน) |
| `AGENT_PAYOUT_MIN_THB` | **1,000 ฿** | ตรง threshold WHT/50-ทวิ (B.3.5); ต่ำกว่า roll-over (B.3.6 deterministic) |
| `PAYOUT_HOLD_ON_DISPUTE` | true | item ที่มี open refund/chargeback/collusion-flag → `held` ไม่จ่ายจนเคลียร์ |
| `PAYOUT_FROZEN_BLOCKS` | true | payee ที่ `PAYOUT_FROZEN` (A.8.4 chargeback shortfall) → exclude ทั้ง track |
| `BANK_CHANGE_COOLDOWN_HOURS` | **72** | ★ payee ที่เปลี่ยน bank ภายใน window นี้ → first payout ต่อ bank ใหม่ถูก hold + ต้อง approver re-clear (S4.6.1a) |

> **คำตัดสิน founder (default):** merchant **รายสัปดาห์**, agent **รายเดือน** (lock-step กับ WHT/PND.3). Sponsor leftover (`CAMPAIGN_END`/`CHURN_SWEEP`) เข้า merchant-settlement track แต่ payee_type=sponsor.

#### S4.3.2 Batch state machine

```
            ┌──────── nightly accrual ────────┐
            ▼                                  │
  ┌───────┐ cron ตัดยอด  ┌──────────────┐ Finance/Payout  ┌──────────┐
  │ draft │────────────▶│ pending_review│────สร้าง+ส่ง────▶│(รอ approve)│
  └───────┘ รวม payable  └──────┬───────┘                 └────┬─────┘
   (รวบ item)                   │ A.8.2s FAIL หรือ            │ Owner/CM approve
                                ▼ payable_coverage FAIL       │ + step-up MFA
                           ┌─────────┐ (page on-call)         │ SoD: approver != creator
                           │cancelled│◀── reject              ▼ + cross-action SoD (S4.6.1a)
                           └─────────┘                        ┌──────────┐
                                                              │ approved │
                                          ┌── batch dispatch ─┴─────┘
                                          ▼ (post PAYOUT/AGENT_PAYOUT txn ต่อ item)
                                    ┌──────────┐  ทุก item settled   ┌──────────┐  recon ok  ┌───────────┐
                                    │ releasing│───────────────────▶│ settled  │───────────▶│ reconciled│
                                    └────┬─────┘                     └──────────┘            └───────────┘
                                         │ บาง item failed
                                         ▼
                                  ┌────────────────┐  failed items → retry/suspense (S4.5)
                                  │partially_failed│
                                  └────────────────┘
```

**Guard rails ต่อ transition (DB-enforced):**
- `draft → pending_review`: รวมเฉพาะ item ที่ `gross ≥ MIN`, payee ไม่ `PAYOUT_FROZEN`, ไม่มี open dispute → ที่เหลือ roll-over. **★ merchant budget-cap check:** ถ้า payee เป็น merchant funder ที่ accrued redemption COGS เกิน per-merchant monthly cap (D.2 LOCKED reward-COGS caps) → flag `merchant_budget_cap` break + แจ้ง (ดู S4.4.5)
- `pending_review → approved`: **บังคับ 4 เงื่อนไขพร้อมกัน** — (a) `solvency_check_id` ชี้ A.8.2s run (**S6-owned**) ที่ `status='pass'` ภายใน 24 ชม.; (b) `payable_check_id` ชี้ `payable_coverage` run (**S4-owned**) ที่ `pass` (S4.4.2); (c) `approved_by <> created_by` (SoD CHECK); (d) approver ผ่าน **step-up MFA** + **cross-action SoD** (S4.6.1a — approver ต้องไม่ใช่คนที่อนุมัติ bank-change ของ item ใด ๆ ใน batch ภายใน cool-down)
- `approved → releasing`: post txn ต่อ item ภายใต้ idempotency_key; เงินออกจาก `bank_settlement` (A.8.11 gate ตรวจ `balance(bank_settlement) ≥ total_net`)

#### S4.3.3 PAYOUT txn posting (ตรง A.7 + A.8.1b)

**Merchant settlement (ไม่มี WHT):** — payable 5,280฿
```
txn_type=PAYOUT, ref_type=merchant_settlement, funded_by=platform, idempotency_key=hash('PAYOUT',item.id,cycle)
Dr  merchant_payable(R)        528000  THB(satang)   -- ล้างหนี้ที่ต้องจ่ายร้าน (จาก REDEEM)
Cr  clearing(platform)         528000  THB
Dr  clearing(platform)         528000  THB
Cr  bank_settlement(platform)  528000  THB           -- เงินสดออกจริงผ่าน PSP/PromptPay payout
ตรวจ: SUM(THB)=0 ✓  ; clearing: Σ(DR)=Σ(CR)=528000 → กลับ 0 (A.8.1b) ✓
```

**Agent earning (หัก WHT 3%):** — gross 5,000฿, WHT 150฿, net 4,850฿
```
txn_type=AGENT_PAYOUT, ref_type=agent_payout, funded_by=platform   (B.3.4)
Dr  platform_expense(platform)  500000  THB   -- รับรู้ค่าใช้จ่าย GROSS (satang)
Cr  clearing(platform)          485000  THB   -- net ที่จะโอนจริง
Cr  wht_payable(platform)        15000  THB   -- WHT 3% ค้างนำส่งสรรพากร (ภงด.3)
Dr  clearing(platform)          485000  THB
Cr  bank_settlement(platform)   485000  THB   -- net ออกจริง
ตรวจ: SUM(THB DR)=500000=485000+15000(CR) ✓ ; clearing Σ(DR)=Σ(CR)=485000 → 0 ✓
-- side effect: agent_wht_ledger(agent, period).gross_minor += 500000 ; posted wht += 15000
-- 50-ทวิ ออก ณ "สรุปรายเดือน" (S4.7.2) ไม่ใช่ต่อ payout (B.3.6: 50-ทวิ รายเดือนรวม)
```
> **หมายเหตุ per-payout vs monthly WHT (แก้ rounding drift, S4.7.2):** leg `wht_payable` ต่อ payout = ส่วนแบ่งของ WHT รายเดือน (allocated) ไม่ใช่ `round(gross_payout*3%)` อิสระ — เพื่อให้ `Σ(per-payout wht legs) = agent_wht_ledger.wht_minor` เป๊ะ (round ที่ monthly grain ครั้งเดียว) มิฉะนั้น `wht_payable` จะ reconcile ไม่ลง 0 ตอน `WHT_REMIT`

**AGENT_CLAWBACK (แก้ critical: clearing ต้องกลับ 0 — เดิม single-sided trip A.8.1b):**
```
-- เคส 1 (ยังไม่จ่าย agent / มี reserve): ไม่แตะ clearing เลย — หักจาก agent_reserve
txn_type=AGENT_CLAWBACK, reverses_txn_id=<T_bounty>, ref_type=agent_payout
Dr  agent_reserve(agent)        <claw>  THB   -- B.3.1 reserve-hold 30%
Cr  platform_expense(platform)  <claw>  THB   -- กลับค่าใช้จ่ายที่ตั้งไว้
ตรวจ: SUM(THB)=0 ✓ ; ไม่มี clearing leg → ไม่ trip A.8.1b ✓

-- เคส 2 (ต้อง route ผ่าน clearing เพราะเรียกเงินคืนจากรอบจ่ายจริง): clearing ต้องบาลานซ์ในตัว
Dr  clearing(platform)          <claw>  THB   -- เงินที่เรียกคืน (in-flight)
Cr  platform_expense(platform)  <claw>  THB
Dr  agent_reserve(agent)|bank_settlement  <claw>  THB  -- แหล่งเงินคืนจริง
Cr  clearing(platform)          <claw>  THB
ตรวจ: clearing Σ(DR)=Σ(CR)=<claw> → 0 (A.8.1b) ✓
```
> **กฎเหล็ก:** AGENT_CLAWBACK **ห้ามมี `Dr clearing` ข้างเดียวโดยไม่มี `Cr clearing` คู่ในtxnเดียว** (ดราฟต์/B.3.4 เดิมเขียนคลุมเครือ "Dr clearing / Cr platform_expense" → ถ้า implement ตรงตัวจะ trip S6 A.8.1b → global FROZEN). ค่า default ใช้ **เคส 1 (ไม่แตะ clearing)** เมื่อ reserve พอ

**WHT remittance (decoupled — รอบเดือน, e-filing ภายใน 15 วันหลังสิ้นเดือน):**
```
txn_type=WHT_REMIT, ref_type=wht_remit
Dr  wht_payable(platform)   <รวม WHT เดือนนั้น + Σ wht_trueup>  THB
Cr  bank_settlement(platform) <เท่ากัน>                          THB   -- นำส่งกรมสรรพากร
-- precondition: Σ(per-payout posted wht) + trueup == Σ(agent_wht_ledger.wht_minor) ทั้ง city (wht_recon pass)
```

---

### S4.4 Bank reconciliation + payable-coverage + break-investigation

#### S4.4.1 สี่ชั้นที่ต้อง reconcile

```
ชั้น 1: PSP statement (NET, per PSP)  ⟷  balance(psp_suspense per psp) + ที่ settle แล้ว
ชั้น 2: bank statement (เงินเข้า/ออกจริง) ⟷ balance(bank_settlement) + รายการ PAYOUT/AGENT_PAYOUT/WHT/VAT out
ชั้น 3: A.8.2s solvency anchor (★ S6-owned) ⟷ เงินสดจริง ≥ ภาระ coin/escrow/sponsor (canonical narrow)
ชั้น 4: payable_coverage (★ S4-owned, แยกจาก A.8.2s) ⟷ เงินสดจริง ≥ payable + ภาษีค้าง
```

#### S4.4.2 Payable-coverage check (★ S4-owned — แยกจาก A.8.2s ชัดเจน)

> **★ ทำไมแยก check (แก้ conflict กับ S6):** A.8.2s ของ S6 ครอบ coin/escrow/sponsor backing เท่านั้น (canonical narrow). เงินที่ "จะต้องจ่ายออก" (`merchant_payable` ที่ค้าง + ภาษีค้างนำส่ง) ก็เป็น claim ต่อเงินสดจริงเช่นกัน — แต่ S4 **ไม่ขยาย A.8.2s** (จะทำให้ invariant สำคัญที่สุดถูกคำนวณสองแบบใต้ code เดียว). แทนที่ด้วย check แยกชื่อ `payable_coverage`:

```
รัน nightly ต่อ city, เทียบ statement ธนาคาร/PSP จริง (ไม่ใช่ ledger เทียบ ledger):

LHS_pay (เงินสดจริงที่ถือ "ส่วนเกินหลังค้ำ A.8.2s แล้ว")
       = balance(bank_settlement) + balance(psp_suspense_settled_portion)
         − A.8.2s_RHS                                    -- หักภาระ coin/escrow/sponsor ที่ S6 ครอบแล้ว
RHS_pay (ภาระจ่ายออก + ภาษีค้าง)
       = balance(merchant_payable)
         + balance(wht_payable) + balance(vat_output_payable)
         − balance(vat_input_claimable)                  -- เครดิต VAT ซื้อหักได้
         − balance(wht_credit_received unclaimed)        -- 50-ทวิ ขาเข้า = เครดิตภาษีของเรา

INVARIANT: LHS_pay ≥ RHS_pay  (ถ้า LHS_pay < RHS_pay → page on-call + FREEZE payout รอบถัดไป)
```

> **batch จะ `approved` ไม่ได้** ถ้า run ล่าสุดของ **ทั้ง** `daily_solvency` (S6) **และ** `payable_coverage` (S4) ไม่ `pass` — ผูก `solvency_check_id` + `payable_check_id`

#### S4.4.3 Reconciliation flow (รายวัน) + state

```
1. PSP_RECON: ดึง PSP settlement file (Omise/2C2P/Fiuu) → match รายการ PSP_SETTLE ใน ledger ที่ NET
   - matched → ok ; PSP รายการที่ไม่มีใน ledger → break(missing_in_ledger)
   - ledger PSP_SETTLE ที่ไม่มีใน statement → break(missing_in_bank/timing)
2. BANK_RECON: ดึง bank statement → match PAYOUT/AGENT_PAYOUT/WHT_REMIT/VAT_REMIT (เงินออก) + PSP payout (เงินเข้า)
   - โอน payout ก้อนเดียวที่รวมหลาย item → match กับ Σ(payout_items.net) ของ batch ผ่าน bank reference
3. WHT_RECON: ★ ต่อ (agent, period) ตรวจ Σ(per-payout posted wht legs) == agent_wht_ledger.wht_minor
   → ถ้าไม่ตรง → break(wht_drift) + post wht_trueup ก่อน WHT_REMIT (S4.7.2)
4. SOLVENCY+COVERAGE: A.8.2s (S6) + payable_coverage (S4.4.2) → reconciliation_runs
5. ทุก break → INSERT payout_breaks(state=open, sla_due_at=now()+2 business days)
```

#### S4.4.4 Break-investigation workflow

| break_type | สาเหตุที่พบบ่อย | resolution | posting |
|---|---|---|---|
| `timing` | PSP settle ข้ามวัน / โอนยังไม่ clear | ปิดเองเมื่อ statement วันถัดไป match | ไม่ post (เฝ้ารอ ≤ SLA) |
| `unmatched_psp_fee` | fee จริง ≠ ที่ประมาณตอน PREFUND | ปรับ `psp_fee_expense` ส่วนต่าง | `Dr/Cr psp_fee_expense ↔ bank_settlement` |
| `amount_mismatch` | bank โอนผิดยอด / rounding | ตรวจ source → post adjustment txn | ขึ้นกับทิศ; ต้อง SoD review |
| `missing_in_bank` | payout ส่งแล้วแต่ bounce | route เข้า failed-payout (S4.5) | reverse PAYOUT → suspense |
| `missing_in_ledger` | เงินเข้า bank ที่ ledger ไม่รู้จัก | สืบ source; ห้าม mint จากเงินนี้ | post เมื่อระบุ source ได้เท่านั้น |
| `wht_drift` | Σ(per-payout wht) ≠ monthly wht_minor | post `wht_trueup` ที่ monthly grain | adjust `wht_payable` ก่อน WHT_REMIT |
| `merchant_budget_cap` | redemption COGS เกิน per-merchant monthly cap (D.2) | freeze merchant GRANT scope + escalate | ไม่ post; แจ้ง GRANT/REDEEM mint-gate (S4.4.5) |

- **SLA:** break ต้องปิดภายใน 2 วันทำการ; เกิน → escalate Finance lead. break ที่ปิดไม่ได้ > 30 วัน → `written_off` (ต้อง Owner approve + step-up MFA). **หมายเหตุ:** write-off ใช้ canonical `WRITE_OFF` txn (`Dr bad_debt_expense / Cr merchant_receivable`, A.7) — `payout_breaks.state='written_off'` เป็น workflow-state ที่ผูกกับ `WRITE_OFF` txn ไม่ใช่ txn_type ใหม่
- **กฎเหล็ก:** ไม่มี break ใดถูกปิดด้วยการ "แก้ตัวเลข cache" — แก้ได้เฉพาะ post adjustment ledger txn (append-only A.8.9) แล้วให้ cache rebuild (A.8.6)

#### S4.4.5 Per-merchant monthly reward-COGS budget cap (★ แก้ cross-gap: LOCKED COGS caps มีเจ้าของ)

> **★ ปัญหา (cross-gap):** D.2 LOCKED ตัดสิน "cap per-redemption reward value + cap redemptions/month per merchant เพื่อ bound COGS" (ร้าน break-even ที่ ~46% incrementality เท่านั้น) — แต่ไม่มี subsystem ไหน enforce/surface. S4 รับหน้าที่ **detect + surface** ฝั่ง settlement/recon (mint-gate ฝั่ง GRANT/REDEEM อยู่ที่ ledger edge fn — S4 ไม่ owns การ block mint แต่ owns การ detect breach):
- nightly recon คำนวณ `Σ(REDEEM thb_settlement ของ funder=merchant:X ในเดือน)` เทียบ `platform_config.MERCHANT_MONTHLY_COGS_CAP_THB` (per-merchant, override ได้)
- breach → `payout_breaks(merchant_budget_cap)` + **freeze merchant GRANT scope** (signal ไป ledger grant edge fn ให้ปฏิเสธ GRANT ใหม่ของ funder นั้นจน Finance clear) — กัน innocent-funder escrow ถูก drain (เชื่อมกับ D7 quest-comp GRANT abuse ที่ S1 ต้อง gate ฝั่งตน)
- per-redemption reward cap เป็น precondition ที่ **REDEEM/GRANT mint-gate** บังคับ (ledger edge fn) — S4 surface ใน recon ถ้ามี redemption ที่ทะลุ cap หลุดเข้ามา (residual)

---

### S4.5 Failed payout handling (wrong bank, bounce, retry, suspense)

#### S4.5.1 State machine ของ payout_item (failed path)

```
queued ──post PAYOUT──▶ sent ──bank confirm──▶ settled ──recon──▶ (done)
                          │
                          ├── failure_code=invalid_account/name_mismatch  ──▶ held (ต้องแก้ bank ใหม่)
                          ├── failure_code=bounce/bank_reject/timeout      ──▶ failed ──retry──▶ queued
                          └── retry_count ≥ MAX (3)                         ──▶ held → payout_suspense
```

#### S4.5.2 Posting ของ failed payout (reversal → suspense)

เมื่อ bank แจ้ง bounce **หลัง** post PAYOUT แล้ว (เงินถูกตีกลับ): post reversal เข้า `payout_suspense` (account ใหม่ ระดับ (ค), Liability CR — เงินที่ตั้งใจจ่ายแต่ตีกลับ ยังเป็นหนี้ผู้รับ):
```
txn_type=PAYOUT, ref_type=payout_suspense (reversal), reverses_txn_id=<T_payout>
Dr  bank_settlement(platform)   <net>  THB   -- เงินตีกลับเข้าบัญชีเรา
Cr  payout_suspense(payee)      <net>  THB   -- ยังเป็นหนี้ผู้รับ รอจ่ายใหม่เมื่อแก้ bank
ตรวจ: SUM(THB)=0 ✓
```
- เมื่อผู้รับแก้ bank ถูก → จ่ายใหม่: `Dr payout_suspense / Cr clearing → Dr clearing / Cr bank_settlement` (clearing กลับ 0)
- **WHT ไม่ reverse** ถ้านำส่งแล้ว — 50-ทวิ ที่ออกแล้วยังคงอยู่ (เงินได้เกิดแล้ว ณ วันจ่าย); เมื่อจ่ายใหม่ไม่หักซ้ำ (gross เดิม)
- **เปลี่ยน bank ของ payee = high-impact action → step-up MFA + audit + cool-down + cross-action SoD** (S4.6.1a)

#### S4.5.3 กฎ retry
- retry อัตโนมัติได้เฉพาะ `timeout`/transient (exponential backoff, max 3)
- `invalid_account`/`name_mismatch` → ห้าม auto-retry → `held` รอ payee แก้ข้อมูล (กันยิงซ้ำไปบัญชีผิด)
- item ที่ค้าง `payout_suspense` > 90 วัน + ติดต่อผู้รับไม่ได้ → escalate (unclaimed-payable disposition = founder/legal call, อาจเข้า `escheatment_liability` ซึ่งเป็น canonical A.1)

#### S4.5.4 Erasure-gate contract (★ S4 ↔ auth/S3 — ป้องกัน clawback/investigation evasion)
> **★ S4-side gate ที่ S3 erasure ต้องอ่าน:** ก่อน user/payee ถูก erase, S3 eligibility gate **ต้อง** query S4 ว่า:
- `balance(payout_suspense for payee) = 0` (ยังมีเงินค้างจ่าย/หนี้ payee → ห้าม erase)
- ไม่มี `payout_items.state ∈ {queued, sent, held, failed}` ค้าง (payout in-flight)
- ไม่มี open `merchant_receivable` / negative-position pending recovery
- **chargeback window ยังไม่ปิด:** transaction card-funded ล่าสุดต้องพ้น acquirer chargeback window (เสนอ 120–180 วัน) ก่อน erase — มิฉะนั้น CHARGEBACK ที่มาทีหลัง (A.6(7)) จะ post กับ identity ที่ tombstone ไปแล้ว ไม่มี attribution. S4 expose `last_card_funded_at` + `chargeback_window_clear` ให้ S3 อ่าน
- หลัง erase: รักษา non-PII financial-attribution token (tombstone hash) ที่ RECOVERY/CHARGEBACK/WRITE_OFF ยัง post ได้ และ audit↔ledger cross-check ยอมรับเป็น valid counterpart

---

### S4.6 Segregation of duties + step-up MFA + audit

#### S4.6.1 SoD matrix (creator ≠ approver — บังคับใน DB)

| Action | สร้างได้ (creator) | อนุมัติได้ (approver) | Step-up MFA |
|---|---|---|---|
| สร้าง payout batch | Finance/Payout | — | — |
| **Approve & release batch** | — | Platform Owner / City Manager | **✅** |
| Approve WHT/VAT remittance | Finance/Payout | Platform Owner | **✅** |
| เปลี่ยน payout bank ของ payee | Support/CS หรือ payee | Finance/Payout | **✅** |
| Write-off break / receivable (`WRITE_OFF`) | Finance/Payout | Platform Owner | **✅** |
| Override solvency-fail release | — | Platform Owner (สองคน, dual-approve) | **✅✅** |

- **DB enforcement:** `payout_batches.sod_creator_ne_approver` CHECK + RLS ตาม Role/Scope (A: RBAC) — approve ที่ `approved_by = created_by` ถูก reject ที่ระดับ constraint
- **Scope:** City Manager approve ได้เฉพาะ batch ที่ `city_id` อยู่ใน scope ตน (ABAC)

#### S4.6.1a Cross-action SoD: bank-change ↔ batch (★ แก้ critical: four-eyes bypass)

> **★ ปัญหา (redteam critical):** `sod_creator_ne_approver` บังคับแค่ creator≠approver **บน batch** — ไม่ผูกตัวตนที่เปลี่ยน destination bank. Finance/Payout คนเดียวจึง (1) approve bank-change ของ payee R ไปบัญชี attacker แล้ว (2) สร้าง batch ที่มี R — `bank_snapshot` ถูก capture ตอนสร้าง batch โดยคนเดียวกัน. Owner/CM approve แค่ totals/solvency ไม่ re-verify bank รายราย → เงินไหลเข้าบัญชี attacker ใน batch ที่ "four-eyes ผ่าน". แก้:

1. **Cross-action SoD constraint:** actor ที่ approve `payee bank change` ภายใน `BANK_CHANGE_COOLDOWN_HOURS` (default 72) **ห้าม** เป็น creator **หรือ** approver ของ batch ที่จ่าย payee นั้น — บังคับด้วย constraint ที่ join `audit_log`(bank_change) × `payout_items.bank_change_approver` × `payout_batches.created_by/approved_by`
2. **Per-item flag ที่ approver ต้อง explicit clear:** item ที่ `bank_changed_at` < N วัน แสดง flag "bank changed <N days ago" + re-snapshot diff ใน approval UI — Owner/CM ต้อง explicit clear ทีละรายการ (ไม่ใช่ approve totals ลอย ๆ)
3. **Out-of-band notify + cool-down (จาก auth S3.4/S3.5):** เปลี่ยน payout bank = **24h cool-down + notify ทุก channel** ก่อน payout แรกเข้าบัญชีใหม่ — payee ได้ alert out-of-band ก่อนเงินไหล (กัน CS phished/colluding redirect เงียบ ๆ)

#### S4.6.2 Audit
- ทุก state transition ของ batch/item + bank-change → `audit_log` (actor, action, before/after, MFA assertion id, ip/device)
- payout audit trail = immutable; ผูกกับ `ledger_transactions.created_by` (server-side, A.2)
- รายงาน SoD violation attempt (รวม cross-action) → alert security + DPO (ถ้าแตะ PII)

#### S4.6.3 Agent money actions = AGENT_PAYOUT ของ S4 เท่านั้น (★ inbound contract จาก S1)
> **★ แก้ canonical_misuse (S1 D4):** S1 (support/CS) **ห้าม** settle agent ด้วย bare `PAYOUT` txn (S1 D4 เดิมเขียน plain-PAYOUT clearing→bank, ตกหล่น WHT/50-ทวิ leg). agent money action ทั้งหมดต้อง defer มาที่ **S4 `AGENT_PAYOUT`** (มี WHT 3% + 50-ทวิ leg, B.3.4/B.3.5) ผ่าน Finance/Payout — สอดคล้อง SoD ของ S1 เองที่ CS ไม่สร้าง/approve payout. S4 รับ contract: agent earning เข้า agent-earning track เท่านั้น

---

### S4.7 Withholding tax (agent 3% PND.3 + 50-ทวิ event-based) + clawback netting

#### S4.7.1 หลักการ decoupling (C.5 ข้อ 4 — critical)

```
รอบเดือน (สรุป)                  ────▶  ออก 50-ทวิ รวมรายเดือน (fifty_tawi_no, running)   [B.3.6: รายเดือนรวม]
รอบนำส่ง (e-filing ภายใน 15 วัน) ────▶  WHT_REMIT + export ภงด.3                          [ผูกกับรอบนำส่ง]
```
> **★ แก้ความขัดในดราฟต์:** ดราฟต์ก่อนหน้าเขียน "ออก 50-ทวิ ทันที ณ จุด post AGENT_PAYOUT" ซึ่งขัด B.3.6 ที่ตัดสิน **"50-ทวิ สรุปรายเดือนรวมต่อ agent (ไม่ใช่ต่อรายการ)"** เพื่อ deterministic. C.5 ข้อ 4 บอกว่า 50-ทวิ ผูกกับ "การจ่าย" (event-based แยกจาก remittance) — สำหรับโมเดล agent ที่ตัดยอด **รายเดือน** "event การจ่าย" = รอบจ่ายรายเดือน ดังนั้น 50-ทวิ ออกตอน **monthly cut** (หนึ่งใบต่อ agent ต่อ tax_period) ไม่ใช่ต่อ payout item — สอดคล้องทั้ง C.5 และ B.3.6
- monthly job: รวม `agent_wht_ledger` ทั้ง city → ออก 50-ทวิ รายเดือน → export **ภงด.3** + post `WHT_REMIT` → reconcile `wht_payable` กลับ 0 ทุกสิ้นรอบ (B.3.6) **หลัง wht_recon pass** (S4.4.3 ข้อ 3)

#### S4.7.2 Lumpy income + monthly-grain WHT (deterministic — B.3.6, ★ แก้ rounding drift)
- หัก WHT 3% **ทุก payout ≥ 1,000฿** ในรอบ; payout < 1,000฿ → roll-over สะสมไปเดือนถัดไป (B.3.6 deterministic)
- **★ WHT คำนวณครั้งเดียวที่ monthly grain:** `wht_minor = round(wht_base_minor * 3%)` บน aggregate ของเดือน — **ไม่** sum `round(per-payout*3%)` (จะได้ค่าต่างจาก round(aggregate) → satang drift). per-payout AGENT_PAYOUT leg post WHT เป็น **allocated share**; ส่วนต่างที่เหลือลง `wht_trueup_minor` (true-up entry) ก่อน WHT_REMIT เพื่อให้ `Σ(per-payout posted wht) + trueup = wht_minor` เป๊ะ
- **★ wht_recon invariant (S6 kind='wht_recon'):** BREAK ถ้า `Σ(per-payout wht legs) ≠ agent_wht_ledger.wht_minor` สำหรับ (agent, period) ใด — กัน `wht_payable` reconcile ไม่ลง 0

#### S4.7.3 Clawback-vs-WHT netting (B.3.6 — ★ แก้ WHT-suppression abuse)

ถ้า bounty/commission ถูก claw (`AGENT_CLAWBACK`) **หลัง**นำส่ง WHT แล้ว → **ไม่ขอคืนสรรพากรเป็นรายการ** แต่ net กับรอบถัดไป (B.3.6):
```
รอบ N+1: capped_offset = min(clawback_offset, gross(N+1) − legitimate_earned_floor(N+1))
         wht_base = max(gross(N+1) − capped_offset, 0)
         wht_minor = round(wht_base * 3%)            -- monthly grain
agent_wht_ledger(N+1).clawback_offset_minor = capped_offset
agent_wht_ledger(N+1).wht_adjusted_ref = <ชี้ original payout>
excess_offset = clawback_offset − capped_offset      -- ★ ส่วนเกินไม่กด WHT ทิ้ง
```
> **★ แก้ major (redteam: WHT-suppression):** ดราฟต์เดิมปล่อยให้ `clawback_offset` กด `wht_base` ถึง 0 ได้ทั้งก้อน → colluding agent + clawback timing zero-out WHT บนเงินได้จริงในปีภาษีเดียวกัน (under-remit สรรพากร). แก้ด้วย **cap offset ไม่ให้กด WHT base ต่ำกว่าฐานที่หาได้จริงของ income event นั้น** — `excess_offset` ที่เกิน carry เป็น **tracked receivable** (ไม่ใช่ WHT suppressor). clawback ข้ามปีภาษี → ปรับผ่าน **amended ภงด.3** (manual, flag ใน ledger, B.3.6)
- AGENT_CLAWBACK posting → ดู S4.3.3 (เคส 1 ไม่แตะ clearing default; เคส 2 clearing บาลานซ์ในตัว)

#### S4.7.4 Merchant payout WHT considerations (C.5 ข้อ 3 — สองทิศ)
- **เราจ่าย merchant (`merchant_payable` settlement):** เป็นเงินของ merchant เอง → **ไม่ใช่เงินได้ที่เราต้องหัก** → ไม่หัก WHT, ไม่ออก 50-ทวิ ขานี้ (C.5 ข้อ 3)
- **Merchant หักเรา (service fee):** take-rate/subscription ที่เราเก็บจาก merchant = "ค่าบริการ" — merchant นิติบุคคลอาจหัก WHT 3% (PND.53) แล้วจ่ายเราสุทธิ → **เราเป็นผู้ถูกหัก** ต้องเก็บ 50-ทวิ ขาเข้ามาเครดิตภาษีนิติบุคคล → `wht_credit_received` table รับ 50-ทวิ ขาเข้า (reconcile กับ PND.53 ที่ merchant ยื่น). **บังคับตั้งแต่ migration #1** (D.2 build-gate spirit; gate ระดับ (ค))

---

### S4.8 VAT (7%) + tax invoice (ภพ.20) + revenue recognition

#### S4.8.1 VAT บนทุก revenue line (C.5 ข้อ 1)

VAT 7% applies กับ: **subscription, take-rate, sponsored quest/campaign, data product/add-on** (C.5: ทุกอันเป็นค่าบริการในไทย):

```
ตัวอย่าง subscription Growth 990฿ (VAT-inclusive — founder call default)
ฐาน base = round(990 / 1.07) = 925.23฿  ; VAT = 64.77฿
SUBSCRIPTION posting (monthly, ตรง A.7) — แตก VAT ออกจาก revenue:
Dr  bank_settlement(platform)    99000  THB(satang)   -- เงินเข้าเต็ม
Cr  platform_revenue(platform)   92523  THB           -- ฐานก่อน VAT
Cr  vat_output_payable(platform)  6477  THB           -- VAT ขายค้างนำส่ง (ภพ.30)
ตรวจ: SUM(THB)=99000=92523+6477 ✓
-- side effect: ออก tax_invoices(ภพ.20) invoice_no running, source_txn_id=<txn>
```
> **หมายเหตุ A.7 alignment:** A.7 SUBSCRIPTION row = `Dr bank_settlement / Cr platform_revenue` (หรือ `Cr deferred_revenue` annual). VAT-split leg (`Cr vat_output_payable`) เป็น **extension** ของ row นั้น — `vat_output_payable` ระดับ (ค) ต้อง ratified ก่อน lock posting นี้ลง canonical

> **คำตัดสิน (founder, default):** ราคา tier **VAT-inclusive** (ลูกค้าจ่าย 990 รวม VAT) — ลด friction SME; ภายในแตก VAT ออก. **ทั้งระบบต้องเลือกแบบเดียวกัน** (สอดคล้องหลัก A.6(1) GROSS/NET uniform)

**Take-rate VAT:** REDEEM post take-rate เต็มเข้า `platform_revenue` (A.6(4)) → **monthly VAT-split job** ย้ายส่วน VAT → `vat_output_payable` + ออก ภพ.20 รวมรายเดือนต่อ merchant:
```
txn_type=VAT_REMIT(prep) รายเดือน:
Dr  platform_revenue(platform)   <VAT ส่วน take-rate เดือนนั้น — net ของ reversal>  THB
Cr  vat_output_payable(platform) <เท่ากัน>                                          THB
```
> **★ idempotent ต่อ reversal:** VAT-split job แตกเฉพาะ **take-rate net-of-reversal** ของเดือน — ถ้า REDEEM ถูก REFUND/CHARGEBACK ก่อน split, ส่วนนั้นไม่เข้า split (ดู S4.8.5)

#### S4.8.2 VAT remittance (ภพ.30 รายเดือน ภายในวันที่ 15)
```
txn_type=VAT_REMIT, ref_type=vat_remit
Dr  vat_output_payable(platform)   <VAT ขาย>      THB
Cr  vat_input_claimable(platform)  <VAT ซื้อ>     THB   -- เครดิต VAT ซื้อ (PSP fee, ค่าใช้จ่ายมี VAT)
Cr  bank_settlement(platform)      <ส่วนต่างนำส่ง> THB
ตรวจ: SUM(THB)=0 ✓ (ถ้า input > output → ขอคืน/ยกไป)
```

#### S4.8.3 Tax invoice (ภพ.20 full tax invoice — มาตรา 86/4)
- ออก **full tax invoice** ต่อ revenue event ที่ buyer เป็น VAT-registered merchant: เลขที่ running ต่อเนื่อง (ห้ามข้าม/ซ้ำ), เลขผู้เสียภาษีผู้ซื้อ, แยก base/VAT/total, วันที่
- **abbreviated tax invoice** สำหรับ B2C ที่ไม่ขอ full (ไม่ค่อยมีในโมเดล B2B นี้)
- cancel/credit-note: ไม่แก้ใบเดิม → ออก **credit note** (`tax_invoices.state='credit_noted'`, `credit_note_of`) ผูก `source_txn_id` (append-only)

#### S4.8.4 Revenue recognition — deferred (annual subscription)

Annual subscription (จ่าย 10 ได้ 12 เดือน, B.1.1) → **ห้ามรับรู้ revenue ทั้งก้อนตอนรับเงิน** เข้า `deferred_revenue` (canonical A.1) แล้วทยอย:
```
(1) ตอน invoice annual paid — SUBSCRIPTION (annual, A.7: Cr deferred_revenue):
Dr  bank_settlement(platform)    <amount net VAT>  THB
Cr  deferred_revenue(platform)   <เท่ากัน>          THB    -- ยังไม่ recognize
Cr  vat_output_payable(platform) <VAT ทั้งก้อน>     THB    -- VAT รับรู้ ณ จุดออกใบกำกับ (tax point)

(2) ทุกสิ้นเดือน (12 รอบ) — SUBSCRIPTION_RECOGNIZE (A.7: Dr deferred_revenue / Cr platform_revenue):
Dr  deferred_revenue(platform)   <amount/12>  THB
Cr  platform_revenue(platform)   <amount/12>  THB
-- cron รายเดือน; rounding residual ลงเดือนสุดท้าย (กันสตางค์หาย, ตรง A.6(9) residual method)
ตรวจ: หลัง 12 รอบ → balance(deferred_revenue ของ sub นั้น) = 0 ✓
```
> **★ tax point vs recognition mismatch (ตั้งใจ):** VAT (output) รับรู้ **ทั้งก้อน ณ วันรับเงิน** (tax point = วันชำระ/ออกใบกำกับ) ส่วน **income recognition ทยอยรายเดือน** ผ่าน SUBSCRIPTION_RECOGNIZE. monthly recognize cron **ไม่แตะ VAT** (แตกไปแล้วตอน (1))

#### S4.8.5 REFUND/CHARGEBACK ของ take-rate-bearing REDEEM → reverse VAT + credit note (★ แก้ over-remit VAT)

> **★ ปัญหา (redteam minor):** REDEEM late ในเดือน M (take-rate booked) → VAT-split job สิ้นเดือน (VAT แตก + ภพ.20 ออก + remit วันที่ 15) → dispute REFUND เดือน M+1 → เรา remit output VAT บน take-rate ที่ claw คืนแล้ว ไม่มี credit-note path. แก้: REFUND/CHARGEBACK (A.6(6)/(7)) ของ REDEEM ที่มี take-rate ต้อง:
1. ถ้า VAT split ไปแล้ว → reverse VAT split: `Dr vat_output_payable / Cr platform_revenue` (ส่วน VAT)
2. auto-issue **credit note** กับ source ภพ.20 line (`tax_invoices.credit_note_of`, source_txn_id chain) — กัน §86/4 running-number integrity issue
3. VAT-split job split เฉพาะ **net-of-reversal** take-rate (S4.8.1) → idempotent w.r.t. reversal ที่มาทีหลัง
4. recon `A.6.9_drift`-style ระหว่าง `platform_revenue` movements กับ issued/credit-noted `tax_invoices`

---

### S4.9 Accounting export + Chart-of-Accounts → financial statements mapping

#### S4.9.1 CoA → งบการเงิน mapping

> **★ ใช้ชื่อ account ตาม canonical A.1 เป๊ะ** — `platform_breakage` (ไม่ใช่ expiry_breakage ที่ถูกตัดทิ้งใน A.1)

| ledger account_type | normal | งบ | บรรทัดงบ |
|---|---|---|---|
| `bank_settlement`, `psp_suspense` | DR | **งบแสดงฐานะการเงิน** | สินทรัพย์ — เงินสด/รายการเทียบเท่า |
| `merchant_receivable`, `vat_input_claimable` | DR | งบฐานะการเงิน | สินทรัพย์ — ลูกหนี้/ภาษีซื้อรอเครดิต |
| `merchant_escrow`, `sponsor_budget` | CR | งบฐานะการเงิน | หนี้สิน — เงินรับล่วงหน้าจาก merchant/sponsor |
| `coin_liability` (THB-equiv) + `coin_backing` | CR | งบฐานะการเงิน | หนี้สิน — ภาระ loyalty (Coin liability ค้ำ) |
| `merchant_payable`, `payout_suspense` | CR | งบฐานะการเงิน | หนี้สิน — เจ้าหนี้ค่า settlement |
| `wht_payable`, `vat_output_payable` | CR | งบฐานะการเงิน | หนี้สิน — ภาษีค้างนำส่ง |
| `deferred_revenue` | CR | งบฐานะการเงิน | หนี้สิน — รายได้รับล่วงหน้า |
| `platform_revenue` | CR | **งบกำไรขาดทุน** | รายได้ — ค่าบริการ (subscription/take-rate/affiliate) |
| `platform_breakage` | CR | งบกำไรขาดทุน | รายได้อื่น — breakage (เฉพาะ policy=platform-keep, A.6(5)) |
| `psp_fee_expense`, `platform_expense` | DR | งบกำไรขาดทุน | ค่าใช้จ่าย — ค่าธรรมเนียม PSP / ค่าตอบแทน agent |
| `bad_debt_expense` | DR | งบกำไรขาดทุน | ค่าใช้จ่าย — หนี้สูญ (WRITE_OFF) |
| `escheatment_liability` | CR | งบฐานะการเงิน | หนี้สิน — เงินรอส่งรัฐ (unclaimed) |

#### S4.9.2 Export pipeline
- **GL export (รายวัน/รายเดือน):** สรุป `ledger_entries` ต่อ account → trial balance → ส่งโปรแกรมบัญชี (FlowAccount/Express/PEAK) ผ่าน CSV/API mapping
- **Tax exports:** ภพ.30 (`vat_output_payable`/`vat_input_claimable`), ภงด.3 (`agent_wht_ledger`), ภงด.53 (`wht_credit_received` merchant service-fee WHT credit), ภงด.50 (CIT สิ้นปี)
- **Retention:** export + source ledger เก็บ **7 ปี** (`retention_class=tax_7y`, C.3 — ม.87 Revenue Code + ม.14 Accounting Act, safe margin 7 ปี) — financial fact ไม่ใช่ behavioral graph
- **Reconciliation tie-out:** ยอดทุกบรรทัดงบ = `SUM(ledger_entries)` ที่ rebuild ได้ (A.0 #1) → auditor ตรวจย้อนถึง `seq` ได้ (A.2)

---

### S4.10 Worked example — รอบ payout รายสัปดาห์ (MERCH-2026-W24-CNX)

**บริบท:** เมือง CNX (เชียงใหม่), สัปดาห์ที่ 24/2026, ตัดยอดอังคาร 10 มิ.ย. 23:59, โอนพฤหัส 12 มิ.ย.

**Step 1 — Accrual (nightly):** REDEEM settle 1,240 รายการ → สร้าง/เพิ่ม `merchant_payable` ต่อ redeeming merchant:

| Payee | gross merchant_payable | ≥ MIN 300฿? | สถานะ |
|---|---|---|---|
| ร้าน A (กาแฟ Nimman) | 18,420.00 ฿ | ✅ | queued |
| ร้าน B (ก๋วยเตี๋ยว) | 240.00 ฿ | ❌ | roll-over → W25 |
| ร้าน C (ร้านนวด) | 6,150.00 ฿ | ✅ | queued (★ bank changed 2 วันก่อน → flag) |
| ร้าน D (PAYOUT_FROZEN — chargeback case) | 4,000.00 ฿ | — | excluded (A.8.4) |

→ batch `MERCH-2026-W24-CNX`: item_count=2 (A,C), total_gross = 24,570.00฿, WHT=0 (merchant track), total_net = 24,570.00฿

**Step 2 — Solvency + coverage (พุธ 11 มิ.ย. nightly):**
```
★ A.8.2s (S6-owned, canonical narrow):
  LHS = bank_settlement 1,420,000.00 + settled suspense 0                = 1,420,000.00 ฿
  RHS = coin_liability 880,000.00 + escrow avail 310,000.00
        + sponsor avail 40,000.00 − merchant_receivable 4,000.00          = 1,226,000.00 ฿
  LHS ≥ RHS → A.8.2s PASS ✓  → run R-924(daily_solvency, pass)

★ payable_coverage (S4-owned, S4.4.2):
  LHS_pay = 1,420,000.00 − 1,226,000.00                                   = 194,000.00 ฿
  RHS_pay = merchant_payable 24,810.00 + wht_payable 5,200.00
            + vat_output_payable 47,000.00 − vat_input_claimable 8,000.00 = 69,010.00 ฿
  LHS_pay (194,000) ≥ RHS_pay (69,010) → PASS ✓ → run R-925(payable_coverage, pass)
→ ผูก batch.solvency_check_id=R-924, batch.payable_check_id=R-925
```

**Step 3 — Review & approve (พฤหัส เช้า, SoD + MFA + cross-action SoD):**
- Finance/Payout (user `fin-01`) สร้าง batch → `pending_review`
- ★ ร้าน C เปลี่ยน bank 2 วันก่อน, อนุมัติโดย `fin-02` (ไม่ใช่ `fin-01`) → cross-action SoD OK; item C flag "bank changed <72h"
- City Manager CNX (user `cm-cnx`) approve: ตรวจ `approved_by(cm-cnx) ≠ created_by(fin-01)` ✓; cm-cnx ≠ bank-change approver(fin-02) ✓; A.8.2s=pass ✓; payable_coverage=pass ✓; **explicit clear item C flag** (re-verify bank diff) → **step-up MFA** → `approved`

**Step 4 — Release (post 2 PAYOUT txns):**
```
item A: Dr merchant_payable(A) 1842000 / Cr clearing 1842000 ; Dr clearing 1842000 / Cr bank_settlement 1842000
item C: Dr merchant_payable(C)  615000 / Cr clearing  615000 ; Dr clearing  615000 / Cr bank_settlement  615000
(clearing กลับ 0 ทั้งสอง txn — A.8.1b ✓)
→ PSP PromptPay payout: 2 โอน ; batch → releasing
```

**Step 5 — Settle & reconcile (ศุกร์ 13 มิ.ย.):**
- bank statement: เงินออก 2 รายการ match `payout_items.net` (psp_payout_ref) → ทั้งคู่ `settled` → batch `settled`
- BANK_RECON match → batch `reconciled`
- หาก item C bounce (bank ใหม่ผิด): → `failed` → reverse PAYOUT เข้า `payout_suspense(C)` 6,150฿ → notify C out-of-band → จ่ายใหม่ W25 (S4.5.2)

**Step 6 — รอบ agent คู่ขนาน (AGENT-2026-06-CNX, ตัดสิ้นเดือน):** agent `ag-07` รอบ มิ.ย. gross รวม 7,200฿ → WHT คำนวณ **monthly grain** `round(7200×3%)`=216฿ → net 6,984฿; per-payout legs post WHT allocated + wht_trueup ให้ Σ=216฿; **wht_recon pass** → ออก 50-ทวิ `CNX-50T-2606-0007` (รายเดือนรวม, B.3.6); ต้นเดือน ก.ค. → `WHT_REMIT` รวม WHT ทุก agent + export ภงด.3 (e-filing ภายในวันที่ 15 ก.ค.)

---

### S4.11 Founder/legal calls (S4) — พร้อม recommended default

| # | การตัดสิน | 👉 Default ที่แนะนำ |
|---|---|---|
| S4-1 | Merchant payout cycle: รายสัปดาห์ vs รายวัน vs รายเดือน | **รายสัปดาห์** (อังคารตัด/พฤหัสโอน) — สมดุล cash-flow vs ต้นทุนโอน |
| S4-2 | VAT-inclusive vs exclusive pricing บน tier | **VAT-inclusive** — ลด friction SME; ต้องเลือกแบบเดียวทั้งระบบ |
| S4-3 | Take-rate VAT: split ใน REDEEM leg vs monthly | **Monthly VAT-split job** (net-of-reversal) + ภพ.20 take-rate รายเดือน — REDEEM leg เรียบ + idempotent ต่อ refund |
| S4-4 | Unclaimed payout_suspense > 90 วัน | **default: ตั้ง `escheatment_liability`** (canonical A.1; legal sign-off ต่อ jurisdiction) |
| S4-5 | Merchant service-fee WHT (เรา = ผู้ถูกหัก PND.53) | `wht_credit_received` รับ 50-ทวิ ขาเข้า reconcile CIT — **บังคับตั้งแต่ migration #1** |
| S4-6 | WHT remittance: e-filing (15 วัน) vs paper (7 วัน) | **e-filing** (15 วัน) — สอดคล้องช่วงขยาย 2567–2570 (C.5 ข้อ 4) |
| S4-7 | Solvency-fail override: ใครปลดล็อก | **dual Owner-approve + step-up MFA ซ้อน** — ห้าม single-person bypass A.8.2s |
| S4-8 | **★ Per-merchant monthly reward-COGS cap (D.2 LOCKED)** | **S4 recon detect + freeze GRANT scope** เมื่อ breach; mint-gate per-redemption cap บังคับที่ ledger edge fn — resolve cap size ก่อน GA pricing (D.2) |
| S4-9 | **★ Bank-change cool-down window** | **72 ชม.** + cross-action SoD + out-of-band notify ก่อน payout แรกเข้าบัญชีใหม่ |

> **★ Canonical-amendment build-gate (ต้องทำก่อน lock S4 postings):** account/txn_type ระดับ (ค) ใน S4.2 (`vat_output_payable`, `vat_input_claimable`, `payout_suspense`, `WHT_REMIT`, `VAT_REMIT`, `MERCHANT_CLAWBACK`) ต้องผ่าน **CoA amendment + founder/legal sign-off + อัปเดต S6 reconciliation invariant set พร้อมกัน** ก่อนอ้างเป็น canonical — มิฉะนั้น recon จะ flag เป็น foreign account.

> **Build-gate ก่อน go-live S4 (ตรง D.2):** ต้องสร้าง+ทดสอบ `agent_wht_ledger`, `agent_reserve`, `tax_invoices`, `wht_credit_received`, `payout_breaks`, `payable_coverage` cron, wht_recon ให้ครบก่อนเปิด payout จริง (D.2: "reconciliation tooling + agent_reserve/agent_wht_ledger ต้อง build+test ก่อน agent payout go-live").

> **★ Cross-subsystem contracts S4 ต้องตอบ (เปิดไว้ใน owner ที่ระบุ):**
> - **MERCHANT_CLAWBACK / merchant-settlement reversal (S4 owns — แก้ cross-gap S1↔S4):** S1 REFUND/CHARGEBACK ที่ debit `merchant_payable(R)` หลัง payout แล้ว ต้องมี funding source — **S4 owns** flow เรียกคืน merchant settlement ที่จ่ายไปแล้ว: post `MERCHANT_CLAWBACK` (`Dr bank_settlement|merchant_receivable / Cr clearing → Dr clearing / Cr merchant_payable` หรือหักจาก payout รอบถัดของ R) เป็น **hard precondition** ก่อน S1 REFUND สำเร็จ (A.6(6) clawback precondition). `PAYOUT_HOLD_ON_DISPUTE` กันเฉพาะ payout **ใหม่** — recover ของที่จ่ายแล้วต้องผ่าน MERCHANT_CLAWBACK นี้ (กัน `merchant_payable` ติดลบ). [ระดับ (ค) — ratify ก่อน lock]
> - **A.8.12 residual fail-closed (S4 ฝั่ง payout):** ถ้า S6 จับ `A.8.12_resid` (self-redeem หลุด live gate) → S4 **freeze payout ของทั้ง funder/identity-cluster** (ไม่ใช่แค่แถวที่ match) + เปิด fraud_case — สอดคล้อง fail-closed non-negotiable; ตรง A.8.12 e-money boundary
> - **Identity-merge ↔ payout-bank (S4 ฝั่ง auth/S3):** ห้าม real→real account consolidation ที่ re-point redeemer/payout-bank ข้าม identity โดยไม่ recompute A.8.12 identity-graph — S4 block payout ต่อ payee ที่ identity-link/recover ภายใน cool-down จน DPO+Finance dual-control clear

---

## S5. Review & UGC Moderation

> **สถานะ:** เติมช่องว่างที่ระบุไว้ใน `SYSTEM_PLAN.md` §12.2 ("REVIEW / UGC CONTENT MODERATION ไม่ครบ") — reviews มี `trust_weight` + verified-visitor gate + `moderation_status` อยู่แล้ว แต่ขาด report-abuse flow, removal criteria, การจัดการหมิ่นประมาท/PDPA, UGC moderation queue (แยกจาก `change_proposals` ของ place), merchant right-to-respond + dispute flow
> **หลักการคุม cost ของ moderation:** queue เดียว, tooling เดียว (reuse จาก §6.4 + pHash/EXIF จาก §6.3), Content Moderator คนเดียวกัน — ไม่ตั้งทีมใหม่ ใช้ automated triage ดันให้ moderator แตะเฉพาะของที่ risk สูงจริง
> **moat thesis:** Google/Wongnai รับรีวิวจาก "ใครก็ได้ที่มี account" — เราผูกน้ำหนักรีวิวกับ **proof-of-visit ระดับ cryptographic/geofenced** (`check_ins.trust_tier`) ที่ปลอมยากกว่ามาก ทำให้รีวิวปลอม/รับจ้างรีวิว **ลดน้ำหนักลงโดยอัตโนมัติ** ไม่ต้องพึ่งการจับทีหลังอย่างเดียว — นี่คือ defensibility หลักของฝั่ง content

> **[ความเป็นเจ้าของ canonical ของ "review/UGC takedown" — ตัดสินจาก integration review]** S5 คือ **เจ้าของเดียว** ของ state machine การจัดการ UGC ที่มีอยู่แล้ว (review/photo/merchant_response): takedown / reweight / shadow-ban / reinstate ทุกตัว **ต้องวิ่งผ่าน `content_reports` + `moderation_actions`** (S5.2) ไม่ใช่ `change_proposals` ฉบับนี้ resolve conflict ที่ review พบ — เดิม S1 (Support) มี flow ที่เขียน `reviews.moderation_status=rejected` ผ่าน `change_proposals`; **อันนั้นถูกแทนที่ด้วย S5**: S1 ต้อง **hand off เข้า S5** (เปิด `content_report`) ไม่ใช่เขียน moderation_status ผ่าน change-proposal เอง เหตุผลในรายละเอียดที่ S5.2.1

---

### S5.1 Review Submission + Verified-Visitor Weighting (ผูกกับ canonical trust tiers)

#### S5.1.1 Gate การเขียนรีวิว (ใครเขียนได้)
รีวิวเขียนได้ก็ต่อเมื่อมีหลักฐานว่าไปจริงในระดับขั้นต่ำ — กัน drive-by review จากคนที่ไม่เคยเข้าร้าน:

| เงื่อนไข | กฎ | เหตุผล |
|---|---|---|
| **ต้องมี check-in** | เขียน review ของ `place_id` ได้เฉพาะถ้ามี `check_ins` ของ user คนนั้นกับ place นั้น ที่ `trust_tier ≥ gps_dwell` ภายใน window (เสนอ 30 วัน) | ผูกรีวิวกับการไปจริง ตั้งแต่ระดับเขียน ไม่ใช่แค่ระดับแสดงผล |
| **1 review ต่อ visit-window** | user เขียน/แก้ได้ 1 รีวิว active ต่อ place ต่อ window (แก้ได้ แต่ไม่ spam หลาย row) | กัน rating stuffing |
| **rating 1–5 + body optional** | `rating` บังคับ, `body_i18n` optional; ติดรูปได้ผ่าน `media(owner_type='review')` | สั้น = barrier ต่ำ; รูปไป media pipeline |

> **เปลี่ยน schema เล็กน้อยจาก §3.4:** `reviews.linked_check_in_id` เปลี่ยนจาก *nullable* เป็น **บังคับ ณ submit** (อ้าง check-in ที่ผ่าน gate) — แต่เก็บ tier ที่ resolve แล้วลง column ใหม่ `verified_tier_at_submit` (snapshot) เพราะ check-in อาจถูก downgrade ทีหลังจาก anti-fraud (ดู S5.5)

#### S5.1.2 `trust_weight` — สูตรคำนวณ (canonical)
`trust_weight` เป็น **derived** จาก trust tier ของ check-in ที่ผูก + ตัวคูณ penalty จาก anti-abuse signals มันคือ **น้ำหนักในการเฉลี่ยคะแนนร้าน** ไม่ใช่คะแนนที่ user ให้:

```text
trust_weight = base_tier_weight(check_in.trust_tier)      -- ฐานจาก canonical tier
             × recency_factor                             -- รีวิวเก่าจางลงช้า ๆ
             × reviewer_reputation                         -- ประวัติ reviewer (0.5–1.0)
             × penalty_multiplier                          -- จาก S5.5 (toxicity/spam/incentivized)

base_tier_weight:
  gps_dwell        (T1) → 1.0     -- "เคยอยู่แถวนั้น" — น้ำหนักฐาน
  verified_visit   (T2) → 3.0     -- สแกน rotating QR/OTP ในร้าน — เข้าร้านจริง
  proven_purchase  (T3) → 6.0     -- ผูก redemption/บิล — ซื้อจริง (น้ำหนักสูงสุด)
  no_checkin            → 0.3     -- รีวิวเก่า/seed/นำเข้า ที่ไม่มี proof (cap ต่ำสุด)

recency_factor = clamp(0.4, 1.0,  exp(-age_days / HALF_LIFE_DAYS))   -- HALF_LIFE ≈ 180 วัน
reviewer_reputation = f(จำนวนรีวิวที่ไม่ถูก remove, % proven_purchase, อายุ account)
penalty_multiplier ∈ {1.0 ปกติ, 0.3 flagged-soft, 0.0 shadow-banned/removed}
```

> **ค่าตัวเลข T1/T2/T3 (1.0/3.0/6.0) เป็น tunable parameter — founder/data call** ปรับกับ pilot Nimman ให้ weighted mean ขยับจริงเมื่อ T3 เข้ามา (default ที่เสนอนี้ทำให้ proven_purchase 1 รีวิว = gps_dwell 6 รีวิว) จัดเป็น 1 ใน anti-fraud parameter set (เพิ่มเข้า open decision §13 ข้อ 7)

#### S5.1.3 Rating ที่แสดง (weighted mean + materialized)
```text
displayed_rating(place) = Σ(review.rating × trust_weight) / Σ(trust_weight)
                          over reviews ที่ moderation_status='approved' AND penalty_multiplier > 0

แสดงคู่กับ:
  - verified_share = % ของ weight ที่มาจาก T2+T3   ("84% จากผู้เข้าร้านที่ยืนยันแล้ว")
  - review_count_raw vs effective (Σweight)         (transparency vs Google)
```
เก็บเป็น **materialized read-model** `place_rating_agg` (rebuild ได้จาก reviews + recompute ตอน S5.5.6) ไม่ใช่คำนวณ runtime ทุก request — pattern เดียวกับ `coin_lots` เป็น cache ที่ reconcile ได้:

```sql
place_rating_agg              -- read-model cache; rebuild ได้จาก reviews
  place_id         uuid PK
  city_id          uuid
  weighted_rating  numeric    -- displayed_rating
  sum_weight       numeric
  verified_share   numeric
  review_count     int
  histogram        jsonb      -- {1:n,2:n,...} ถ่วงน้ำหนักแล้ว
  recomputed_at    timestamptz
```

> **moat vs Google/Wongnai (ตอกย้ำ):** คู่แข่งแสดง simple mean ของทุก account — รับจ้างรีวิว 50 รีวิว 5 ดาวดันคะแนนได้ตรง ๆ ของเรา 50 รีวิว `no_checkin`/`gps_dwell` รวมกัน **มีน้ำหนักน้อยกว่า proven_purchase จริงไม่กี่รีวิว** การจะ "ปลอม" ต้องผ่าน rotating-QR/OTP ในร้าน (T2) หรือ redemption จริง (T3) ซึ่งผูกกับ device graph + escrow จริง (§5.9) — ต้นทุนการโกงสูงขึ้นเป็นลำดับขั้น (cost-asymmetry defense)

---

### S5.2 Report-Abuse Flow + UGC Moderation Queue (แยกจาก place change_proposal queue, share tooling)

#### S5.2.1 ตารางใหม่ (เพิ่มเข้ากลุ่ม C — Content)

```sql
content_reports               -- การรายงาน UGC (review/photo/caption)
  id               uuid PK
  city_id          uuid NOT NULL
  target_type      enum NOT NULL   -- review | review_photo | place_photo | merchant_response
  target_id        uuid NOT NULL
  reported_by      uuid NULL FK→users   -- null = auto-detector
  reporter_role    enum            -- customer | merchant | auto_system | moderator
  reason_code      enum NOT NULL   -- ดู S5.3.1
  detail_text      text NULL
  evidence_media   uuid[] NULL     -- screenshot/หลักฐาน
  status           enum NOT NULL   -- open | triaging | in_review | resolved | rejected | escalated_legal
  resolution       enum NULL       -- no_action | removed | reweighted | shadow_banned | edited | upheld_legal
  severity         enum            -- low | medium | high | legal  (จาก triage S5.2.3)
  sla_due_at       timestamptz     -- จาก S5.3.3
  handled_by       uuid NULL FK→users  -- Content Moderator
  city_manager_ack uuid NULL       -- escalation ถ้า legal
  -- *** linkage ไปฝั่งเงิน/redemption สำหรับ dispute (S5.4.2) — เก็บที่ฝั่ง S5 ไม่พึ่ง S1 ให้มี 2 FK ***
  linked_redemption_id uuid NULL    -- REDEEM txn/redemption ที่รีวิวนี้พาดพิง (cross-ref ledger)
  linked_ticket_id     uuid NULL    -- support_ticket ใน S1 ถ้าเด้งเป็น dispute (1:1 กับ ticket)
  created_at       timestamptz DEFAULT now()
  resolved_at      timestamptz NULL
  -- กัน report ซ้ำจากคนเดิม target เดิม
  UNIQUE(target_type, target_id, reported_by)

moderation_actions            -- APPEND-ONLY log ของทุก action บน UGC (audit + reversibility)
  id               bigserial PK
  report_id        uuid NULL FK→content_reports   -- null = proactive action
  target_type      enum
  target_id        uuid
  action           enum  -- remove | reinstate | reweight | shadow_ban | unshadow
                         --  | request_edit | uphold | escalate_legal | takedown_cca
  actor_user_id    uuid FK
  actor_role       enum
  reason_code      enum
  reason_note_i18n jsonb
  prev_state       jsonb         -- snapshot ก่อน (reinstate/rollback ได้)
  city_id          uuid
  created_at       timestamptz DEFAULT now()
```

> **ทำไมแยก `content_reports` จาก `change_proposals` (และทำไม S5 owns takedown — resolve conflict S1 D5):** semantics ต่างกันชัด — `change_proposals` = "เสนอแก้ live data ของ place" (forward edit ของข้อมูลร้าน, ต้อง apply diff + version, ผ่าน `places_history`) ส่วน `content_reports` = "ขอให้รีวิว/รูปที่มีอยู่ถูกจัดการ" (takedown/reweight, ผูก legal exposure, ต้อง reversible ผ่าน `moderation_actions.prev_state`) คนละ state machine, คนละ SLA, คนละ legal posture (notice-and-action ของ content vs version-control ของ place data) **ดังนั้นการเปลี่ยน `reviews.moderation_status` / การลด weight / shadow-ban / reinstate ทุกกรณี ห้ามทำผ่าน `change_proposals`** — ถ้า S1 (Support) ต้องการให้ลบ/ลดน้ำหนักรีวิว ต้อง **เปิด `content_report` เข้า S5** แล้วให้ Content Moderator (หรือ auto-disposition) เป็นคนสั่ง action ผ่าน `moderation_actions` เท่านั้น (ดู S5.2.2 lane + S5.4.2 handoff)

#### S5.2.2 Shared tooling — Unified Moderation Console (queue เดียว, 2 lane)
Content Moderator ใช้ **console เดียว** มี filter/tab สลับ lane:

```text
┌──────────────── Moderation Console (Content Moderator) ────────────────┐
│  Tab A: Place Changes  │  Tab B: UGC Reports  │  Tab C: Media (S5.6)    │
│  (change_proposals)    │  (content_reports)   │  (media pending)        │
├────────────────────────┴──────────────────────┴────────────────────────┤
│  ใช้ร่วม:                                                                │
│   • risk_score / severity triage engine (เหมือน §6.4)                    │
│   • Accept / Reject(+reason_code) / Request-fix-or-edit  (เหมือน §6.4)   │
│   • before/after diff viewer + แผนที่จุด check-in + รูป + pHash neighbors │
│   • bulk action + SLA timer + audit_log auto-write                       │
│   • SoD: ผู้สร้าง content/proposal != ผู้ moderate (DB-enforced §3 SoD)   │
└─────────────────────────────────────────────────────────────────────────┘
```
- **reuse จาก §6.4:** triage routing (`auto-resolve` low / `queue` medium-high), reason-code taxonomy, request-fix loop, audit emit — โค้ด/UI ชุดเดียว ลด build cost
- **คนละ table/state machine แม้ console เดียว:** Tab A เขียน `change_proposals`; Tab B/C เขียน `content_reports` + `moderation_actions` เท่านั้น — ห้าม cross เพื่อรักษา legal posture (S5.2.1)
- **เพิ่มเฉพาะ UGC lane:** legal-escalation path (S5.3), merchant right-to-respond hook (S5.4), rating recompute trigger (S5.5.6)

#### S5.2.3 Triage / severity scoring (auto, ก่อนถึง moderator)
ทุก `content_report` คำนวณ `severity` อัตโนมัติ — pattern เดียวกับ `risk_score` §6.4:

```text
severity_score = s1·legal_risk(reason_code)          -- defamation/doxxing/CCA → บังคับ high/legal
               + s2·target_visibility                 -- รีวิวบนร้าน traffic สูง = เร่งด่วน
               + s3·reporter_credibility               -- merchant report คู่แข่ง vs verified customer
               + s4·auto_detector_confidence           -- จาก S5.5 (toxicity/extortion model)
               + s5·report_velocity                    -- หลายคนรายงาน target เดียว = เร่ง
               + s6·extortion_velocity_signal          -- *** low-star review + dispute บน redemption เดียวกัน (S5.4.2) ***

routing:
  legal_risk สูง (doxxing/threat/หมิ่นชัด)  → severity='legal'  → SLA 24h + escalate City Manager + legal log
  high   → คิว moderator priority, SLA 48h
  medium → คิว moderator ปกติ, SLA 72h
  low + auto_detector_confidence ต่ำ        → auto-defer (reweight soft ถ้าเข้าเกณฑ์ S5.5) ไม่กิน moderator
```

> **เหตุผล cost:** ถ้าทุก report เข้า moderator manual จะไม่ scale — auto-triage ดันให้ moderator แตะเฉพาะ legal + high + ส่วนน้อยของ medium ที่ model ไม่มั่นใจ ส่วน spam ปริมาณมากจัดการด้วย auto-reweight/shadow-ban (S5.5) reversibility มีจาก `moderation_actions.prev_state`

---

### S5.3 Removal Criteria + Defamation/Harassment/PDPA (Thai law) + Takedown SLA

#### S5.3.1 Reason-code taxonomy + removal disposition
| `reason_code` | นิยาม | ค่าเริ่มต้น disposition | ฐานกฎหมาย / เหตุผล |
|---|---|---|---|
| `off_topic` | ไม่เกี่ยวร้าน/บ่นเรื่องอื่น | reweight→0 หรือ remove | คุณภาพ content |
| `spam_ad` | โฆษณา/ลิงก์/เบอร์ขายของ | **remove** | spam |
| `fake_no_visit` | รีวิวจากคนไม่เคยไป (no/weak check-in + signal โกง) | **reweight→0 / shadow** | anti-fake-review (S5.5) |
| `incentivized_undisclosed` | รับจ้าง/แลกของแล้วไม่ disclose | **remove + flag reviewer** | policy + กกพ./ฉลาด consumer-protection |
| `toxicity_harassment` | ด่า/คุกคาม/hate ต่อพนักงาน/เจ้าของ | **remove** + เตือน | คุกคาม; เสี่ยง CCA ม.14 + อาญา |
| `defamation` | กล่าวหาเท็จทำให้ร้านเสียชื่อ (เช่น "ใส่สารเสพติด", "โกงเงิน") | **hold + legal review** (ไม่ลบทันทีถ้าอาจจริง) | **หมิ่นประมาท ป.อาญา ม.326/328 + พ.ร.บ.คอม ม.14** |
| `pdpa_doxxing` | เปิดเผยข้อมูลส่วนบุคคล (ชื่อ-สกุลพนักงาน, เบอร์, ที่อยู่บ้าน, รูปหน้า bystander) | **redact/remove เร่งด่วน** | **PDPA + พ.ร.บ.คอม ม.16 (รูปตัดต่อ/ทำให้อับอาย)** |
| `illegal_content` | ผิดกฎหมาย/ลามก/เนื้อหาอันตราย | **remove ทันที + escalate** | พ.ร.บ.คอม ม.14(4) |
| `impersonation` | แอบอ้างเป็นร้าน/คนอื่น | **remove** | |
| `extortion` | ขู่จะรีวิว 1 ดาวถ้าไม่ให้ของฟรี/เงิน | **remove + freeze reviewer + evidence pack** | กรรโชก ป.อาญา ม.337 (ดู S5.5.1) |
| `dispute_transaction` | รีวิว/ข้อกล่าวหาที่พาดพิง redemption/ธุรกรรม (เช่น "ไม่ได้ของ") | **escalate → S1 dispute** (S5 คงรีวิวไว้จน S1 verdict กลับ) | ผูกเงิน — เด้งไป S1 (S5.4.2) |

#### S5.3.2 หลักการตัดสิน defamation (Thai law — สำคัญ เพราะ exposure จริง)
ประเทศไทยหมิ่นประมาทเป็น **คดีอาญา** (ม.326/328) + พ.ร.บ.คอมพิวเตอร์ ม.14 — platform ที่เป็น "ผู้ให้บริการ" อาจร่วมรับผิดถ้า "รู้แล้วปล่อย" (ม.15) เราจึงวาง posture ที่ **ไม่ลบมั่ว (กัน censorship/SLAPP โดยร้าน) แต่ไม่ปล่อยของผิดกฎหมายชัด ๆ**:

```text
Defamation decision tree (moderator + legal):
  รีวิวเป็น "ความเห็น/ประสบการณ์โดยสุจริต"?  (ม.329 ข้อยกเว้น: ติชมโดยสุจริต/เพื่อ ปย.สาธารณะ)
    ├─ ใช่ (เช่น "กาแฟไม่อร่อย รอ 40 นาที บริการแย่")  → KEEP (อาจ merchant respond, S5.4)
    └─ ไม่ — เป็น "ข้อเท็จจริงที่กล่าวหา" ที่อาจเท็จ + เสียหายร้าย?
        ├─ มีหลักฐานชัดว่าเท็จ (เช่นกล่าวหา food poisoning ที่ไม่มีมูล)  → REMOVE + log
        └─ พิสูจน์ไม่ได้ทันที                          → HOLD (ซ่อนชั่วคราว) + legal review
                                                          + แจ้งทั้ง 2 ฝ่าย + notice window
```

> **founder/legal call (recommended default):** ใช้ **notice-and-action ไม่ใช่ notice-and-takedown อัตโนมัติ** — เมื่อร้าน report `defamation` เรา **ไม่ลบทันที** (กันร้านใช้ปุ่ม report ปิดปากรีวิวลบจริง = reputation laundering) แต่เข้า legal-review lane (SLA 24h) ถ้าเข้าเกณฑ์ผิดกฎหมายชัด/มีคำสั่งศาล → remove; ถ้าก้ำกึ่ง → คงไว้ + ให้สิทธิ merchant respond (S5.4) **ต้องมี Thai-lawyer-vetted reason-code playbook ก่อน launch** (เพิ่มเข้า open decision)

#### S5.3.3 Takedown SLA (ผูกกับ severity จาก S5.2.3)
| severity | ตัวอย่าง | action ชั่วคราว (ทันที, auto) | SLA ตัดสินถาวร | escalate |
|---|---|---|---|---|
| **legal** | doxxing, ภาพอนาจาร, ขู่ทำร้าย, คำสั่งศาล/NBTC | **auto-hide ทันที** (ก่อน human) | **24 ชม.** | City Manager + DPO (ถ้า PDPA) + ทนาย |
| **high** | toxicity ชัด, extortion, spam ระบาด | reweight→0 ชั่วคราว | **48 ชม.** | Content Moderator lead |
| **medium** | off-topic, fake สงสัย, defamation ก้ำกึ่ง | คงแสดง (เว้น auto-detector มั่นใจ) | **72 ชม.** | — |
| **low** | คุณภาพ, ซ้ำ | auto-handle | best-effort | — |

> **PDPA breach valve (canonical, สอดคล้องกับ posture ที่ locked ทั้งระบบ — S1.6/S2/S6):** ถ้า doxxing เปิดเผย personal data ของบุคคลที่สาม → trip **tiered breach runbook (canonical legal posture)** — ไม่มี rigid 72h hard-SLA, มี 15-day extension valve, skip-notify ถ้า no-risk หลัง redact; ส่งต่อ DPO ประเมิน (จุดยืนนี้ผ่าน cross-subsystem review แล้วว่า **consistent** กับ S1.6/S2.4/S6.6.4 — ไม่ต้องแก้)

---

### S5.4 Merchant Right-to-Respond + "Dispute this Review" (link → S1)

#### S5.4.1 Right-to-Respond (ตอบสาธารณะ — ไม่ใช่ลบ)
Merchant ตอบรีวิวได้ 1 ครั้งต่อรีวิว แสดงใต้รีวิวต้นฉบับ — แต่ **merchant response เองก็เป็น UGC** ที่อยู่ใต้ moderation เดียวกัน (กันร้านด่ากลับลูกค้า/doxx ลูกค้า):

```sql
merchant_responses
  id               uuid PK
  review_id        uuid FK→reviews (UNIQUE — 1 response/review)
  merchant_id      uuid FK
  responder_user_id uuid FK         -- พนักงานร้านคนไหนตอบ (accountability)
  body_i18n        jsonb
  moderation_status enum            -- pending | approved | rejected  (reuse media/review pattern)
  created_at       timestamptz
  -- merchant_response เป็น target_type ที่ report ได้ (S5.2)
```
- ตอบแล้วเข้า auto-toxicity check (S5.5) เหมือนรีวิว — ถ้าร้าน doxx ลูกค้าในคำตอบ = remove + เตือน
- ไม่กระทบ `trust_weight`/rating ของรีวิว (เป็นคนละ object)

#### S5.4.2 "Dispute this Review" → ผูกกับ S1 (Support/Dispute) — **interface ที่ตรงกับ schema จริงของ S1**
แยกชัดจาก "report abuse": **report** = ขอ moderation ตามนโยบาย; **dispute** = ร้านอ้างว่ารีวิวผูกกับ **redemption/transaction ที่มีปัญหา** (เช่น "รีวิว 1 ดาวจากคนที่ไม่เคยซื้อ" หรือ "ลูกค้า burn Coin แล้วบอกไม่ได้ของ ทั้งที่ได้") — อันนี้ข้องกับเงิน/redemption จึงต้องไป **S1 ticketing**:

```text
Merchant กด "Dispute this Review"
        │
        ▼
S5 สร้าง content_report(reason_code=fake_no_visit | dispute_transaction, status=escalated,
                        linked_redemption_id=<REDEEM txn ที่พาดพิง>)
        │  + เปิด support_ticket ใน S1 ผ่าน interface ของ S1 (ดูกล่องล่าง)
        │  + เก็บ content_report.linked_ticket_id = ticket.id (1:1)
        ▼
S1 Support/CS resolver (คนละ role จาก Content Moderator — SoD):
        ├─ ตรวจ check-in/redemption proof จริง (มี check_ins? trust_tier? redemption ผูกไหม?)
        ├─ ถ้ารีวิวอ้าง "ไม่ได้ของ" → cross-ref REDEEM txn (canonical ledger) + S1 dispute flow
        │     └─ ถ้าจริง: S1 จัดการชดเชย (REFUND/compensation Coin) — ไม่เกี่ยว rating
        └─ ผล: S1 เขียน "verdict" กลับเข้า content_report (S5 เป็นคนสั่ง action จาก verdict — ดู S5.4.3)
```

> **[แก้ interface MISMATCH ที่ review พบ — S5 ต้องเรียก S1 ตาม schema จริงของ S1]**
> `support_tickets` ของ S1 **ไม่มีคอลัมน์ `kind`** (ใช้ `category` enum) และมี **`linked_entity_type`/`linked_entity_id` เพียงคู่เดียว** (ไม่ใช่ 2 FK ชื่อ `linked_report_id` + `linked_redemption_id` แบบที่ draft เดิมสมมติ) ดังนั้น contract ที่ถูกต้องคือ:
>
> ```text
> S5 → S1 create-ticket call (ตรง schema S1):
>   support_ticket(
>     category          = 'review_dispute',          -- ค่าใหม่ใน category enum ของ S1 (ต้องเพิ่ม — ดู open decision)
>     linked_entity_type = 'content_report',          -- single linkage pair ของ S1
>     linked_entity_id   = <content_report.id>,        -- ชี้กลับมา S5
>     subject_user_ref   = <reviewer ref>              -- ตาม convention S1 (erasure-safe ref)
>   )
> ```
> - **linkage ไป redemption เก็บที่ฝั่ง S5** (`content_reports.linked_redemption_id`) ไม่ยัด FK ที่สองเข้า S1 — S1 ตามไป redemption ได้ผ่าน `content_report` → ledger (S1 มี `linked_entity_id` ชี้มาแล้ว)
> - **ฝั่ง S1 ต้องเพิ่มค่า `review_dispute` ใน `category` enum** (เป็น cross-subsystem change ที่ S5 ขอ — ใส่ open decision §13 ข้อ 9)

#### S5.4.3 Shared verdict object (ปิดช่อง "burn-and-refund double-dip" ระหว่าง S1 กับ S5 — major finding)
ปัญหาที่ review พบ: extortionist redeem ที่ร้าน R, **ได้ของจริง**, แล้วเปิด D1 ticket "burned-no-reward" พร้อมโพสต์รีวิว 1 ดาวขู่ — ถ้า R เงียบเกิน timeout, S1 consumer-protect default **refund อัตโนมัติ** (loss ตกร้าน) ขณะที่ S5 แค่ shadow-ban รีวิว (penalty 0.0) ไม่ใช่ remove/ไม่ตัดสินเป็น ม.337 → user **ได้ของ + ได้ refund** เพราะสองระบบตัดสินแยกกันโดยไม่มี verdict ร่วม นี่คือ control conflict ที่ต้องปิด:

```text
verdict object (1 ต่อ 1 redemption ที่มีทั้ง dispute + review) — keyed on linked_redemption_id:
  ผูก content_report (S5) ↔ support_ticket (S1) ผ่าน content_report.linked_redemption_id + linked_ticket_id
  field: verdict ∈ { merchant_at_fault | false_claim | inconclusive }, decided_by(S1), decided_at

กฎ cross-subsystem (บังคับทั้งสองฝั่งอ่าน verdict เดียวกัน):
  1) [S1] **บล็อก silent-timeout auto-refund** ถ้ามี content_report ที่ผูก redemption เดียวกัน
        + รีวิว low-star (≤2★) จาก reviewer คนเดียวกัน → ถือเป็น extortion/velocity signal
        → ห้าม auto-refund บน merchant silence; บังคับ escalate ให้ human + ดึง POS proof จากร้าน
        (ใช้ S5.2.3 s6·extortion_velocity_signal เป็น input เดียวกัน)
  2) [S1] consumer-protect default ยัง refund ได้ แต่ **ต้องผ่าน fraud-gate clearance ก่อน** (ไม่ใช่ refund
        เพราะร้านเงียบอย่างเดียว) — เงื่อนไขนี้เป็น precondition ที่ S5 ส่ง signal ให้
  3) verdict กลับเข้า S5 → S5 สั่ง action ผ่าน moderation_actions:
        - verdict='merchant_at_fault' → KEEP รีวิว (no_action), S1 ชดเชยตามปกติ
        - verdict='false_claim'       → S5 reweight→0 (penalty=0.0) + บันทึก **ม.337 evidence pack**
                                        (freeze reviewer ถ้าเข้าเกณฑ์ extortion S5.5.1)
        - verdict='inconclusive'      → คงรีวิว + ไม่ refund อัตโนมัติ (human call)
```
- **ขอบเขตชัด:** S5 ตัดสิน **"รีวิวอยู่/ไป/น้ำหนักเท่าไร"**; S1 ตัดสิน **"ธุรกรรม/เงินถูกต้องไหม + ชดเชยไหม"** — dispute ที่แตะเงินเด้งไป S1 เสมอ แต่ **ทั้งคู่ผูกกับ verdict object เดียว keyed on `linked_redemption_id`** เพื่อไม่ให้เกิด double-dip
- **กัน abuse ของปุ่ม dispute:** ร้าน dispute เกินอัตรา (เช่น dispute ทุกรีวิว <4★) → flag merchant + ลด weight ของ merchant report ใน triage (S5.2.3 `reporter_credibility`)
- **UX กัน SME ไทยเสียเปรียบ default:** ให้ merchant มีปุ่ม LINE one-tap "ส่งของแล้ว + รูป" + timeout ที่ยาวขึ้น/รองรับภาษา ก่อน consumer-protect จะ trigger (ลด false-positive refund จากร้านที่ตอบช้าเพราะ language barrier) — รายละเอียด timeout เป็น S1 design (open §13 ข้อ 9) แต่ S5 กำหนดว่า signal extortion ต้องบล็อก auto-refund

---

### S5.5 Automated Detection (toxicity / spam / fake / extortion / sabotage) + Shadow-ban + Rating Recompute

#### S5.5.1 Detection patterns (รันตอน submit + batch)
| Signal | จับอะไร | กลไก | action เริ่มต้น |
|---|---|---|---|
| **Toxicity / hate** | คำหยาบ/คุกคาม TH+EN+ZH | LLM/classifier multilingual + Thai profanity lexicon | score → S5.5.2 |
| **Spam / ad** | ลิงก์, เบอร์, ข้อความซ้ำ ๆ ข้ามร้าน | URL/phone regex + near-dup (text minhash) | reweight→0 / remove |
| **Fake (no-visit)** | รีวิว 5★/1★ จาก `no_checkin`/`gps_dwell` + signal โกง | trust_tier ต่ำ + device graph (§5.9) + เวลา submit เร็วผิด | **reweight→0** (ไม่ลบ — แค่ไม่ให้น้ำหนัก) |
| **Review extortion** | "ให้ฟรีไม่งั้นรีวิว 1★", ติดต่อร้านขู่ก่อนรีวิว | keyword + รีวิว 1★ จาก account ที่เพิ่ง DM ร้าน/มี pattern ขู่ + **dispute บน redemption เดียวกัน (S5.4.3 s6)** | **remove + freeze reviewer + evidence pack → กรรโชก ม.337** |
| **Competitor sabotage** | คู่แข่งจ้าง 1★ ถล่ม | burst 1★ จาก device/IP cluster เดียว, account ใหม่, ไม่มี T2+ check-in, ผูก identity graph คู่แข่ง | **reweight→0 + shadow + ring flag** (§5.9 community detection) |
| **Incentivized undisclosed** | รับของแล้วรีวิว ไม่ disclose | รีวิวผูก redemption ของ deal "แลกรีวิว" + ไม่มี disclosure tag | **บังคับ disclosure label** หรือ reweight |
| **Rating manipulation (ร้านปั๊มเอง)** | ร้านสร้าง account รีวิวตัวเอง 5★ | self-review graph: reviewer ผูก merchant device/payment (§5.9 #5) | **reweight→0 + merchant flag** |
| **Bot / template** | รีวิว generate, ภาษาแปลก, timing | perplexity/AI-text signal + submission velocity | score → triage |

#### S5.5.2 Disposition ladder — Shadow-ban (สำคัญ: ไม่ลบทันทีเสมอ)
```text
detector_score ต่ำ      → KEEP (penalty_multiplier=1.0)
medium                  → SOFT REWEIGHT (penalty_multiplier=0.3) — ยังเห็น แต่กระทบ rating น้อย
high (fake/spam/sabotage) → SHADOW-BAN:
        - รีวิว "เห็นได้เฉพาะผู้เขียน" (author เห็นว่าโพสต์แล้ว แต่ public/rating ไม่เห็น)
        - penalty_multiplier = 0.0  → ไม่กระทบ displayed_rating
        - ไม่แจ้ง reviewer (กัน fraudster ปรับตัว) — เหมือน agent shadow-review §7
legal/illegal           → HARD REMOVE + escalate (S5.3)
```
> **ทำไม shadow-ban ไม่ใช่ delete:** (1) ลด false-positive harm — คนจริงที่ถูกจับผิดยังเห็นรีวิวตัวเอง ไม่ร้องเรียน + reversible ทันทีถ้า appeal ผ่าน (S5.6.3); (2) ไม่ให้ fraud ring รู้ว่าโดนจับ → ไม่ปรับ pattern หนี; (3) audit ครบใน `moderation_actions.prev_state`

#### S5.5.3 Anti-self-redemption alignment (canonical boundary A.8.12)
รีวิว/redemption ที่ trip **anti-self-redemption** (funder==redeemer / same KYC/device/payment — canonical e-money boundary **A.8.12**) → review นั้น auto `reweight→0` ด้วย เพราะ proof-of-visit ปนเปื้อน: เป็นการ reuse signal เดียวกับ ledger ไม่สร้าง engine ใหม่ (จุดยืน reuse นี้ผ่าน review แล้วว่า **consistent** กับ S1.5/S6.2.2/S3 — ใช้ engine เดียวกัน ไม่มี primitive ใหม่)

> **สำคัญ — A.8.12 เป็น boundary ที่ moderator ปลดไม่ได้:** การที่รีวิว trip A.8.12 ไม่ใช่ "ดุลพินิจ moderator" แต่เป็น **e-money compliance boundary** ดังนั้นการ reinstate รีวิวที่ trip A.8.12 ต้องผ่านเงื่อนไขพิเศษที่ S5.6.3 (re-run boundary check เป็น hard precondition)

#### S5.5.4 Rating RECOMPUTE (เมื่อ remove/reweight)
ทุกครั้งที่ `penalty_multiplier`/`moderation_status`/`trust_weight` ของรีวิวเปลี่ยน → trigger recompute `place_rating_agg`:
```text
on moderation_action (remove|reweight|reinstate|shadow_ban|unshadow):
  1. update reviews.penalty_multiplier / moderation_status
  2. enqueue recompute(place_id)   -- debounced (รวม burst, ไม่ recompute ทุก action)
  3. recompute: weighted_rating, sum_weight, verified_share, histogram  (S5.1.3)
  4. emit audit_log(action='rating.recompute', before/after)
  5. ถ้า rating ขยับ > threshold → snapshot ใน place_rating_history (rollback ได้, เหมือน places_history)
```
- **idempotent + reconcilable:** `place_rating_agg` rebuild ได้จาก `reviews` ทั้งหมด เสมอ — nightly reconcile + alert drift (pattern เดียวกับ `coin_lots` §A.5.1)
- **reinstate ก็ recompute:** appeal ผ่าน (S5.6.3) → คืน weight → rating เด้งกลับ **แต่ต้องผ่าน boundary re-check ก่อน** (S5.6.3)

#### S5.5.5 Human-in-the-loop boundary
- auto จัดการเองได้: `reweight→0`, `shadow-ban` (reversible, low harm)
- **ต้อง moderator/legal:** `hard remove`, `defamation hold`, `extortion freeze`, `legal escalate`, `reinstate after appeal` — automated detector **เสนอ** เข้าคิว ไม่ตัดสิน removal ถาวรเอง (กัน false-positive ลบรีวิวจริง)

---

### S5.6 Photo / UGC Media Moderation (reuse pHash + EXIF) + Appeal

#### S5.6.1 Reuse pipeline จาก §6.3 (ไม่สร้างใหม่)
รูปในรีวิว/ร้านใช้ media pipeline เดียวกับ Field Agent (canonical §6.3) — `media` table มี `owner_type='review'` อยู่แล้ว:

| ชั้น (reuse §6.3) | กับ review photo | action |
|---|---|---|
| **pHash dedup** | เทียบรูปรีวิวกับ pHash ของ place เดิม + รีวิวอื่น + คลังเน็ต | รูปซ้ำ/โหลดเน็ต/หมุน-crop หนี → flag `not_original` → reweight/reject |
| **EXIF + timestamp** | EXIF GPS ตรง geofence ของ place? ถ่ายใกล้เวลา check-in? | กันรูปร้านอื่น/รูปเก่ามาแปะ (สอดคล้อง verified-visit moat) |
| **NSFW / illegal classifier** | ลามก/ความรุนแรง/illegal | hard remove + escalate (พ.ร.บ.คอม ม.14) |
| **Face / PII (PDPA)** | รูปติดหน้า bystander/พนักงาน, ป้ายทะเบียน, บัตร | blur/redact หรือ remove (PDPA doxxing — S5.3) |
| **Camera-only (optional)** | review photo ผ่อนกว่า agent (อนุญาต gallery) แต่ gallery → ลด trust ของรูป | balance UX vs proof |

> **PDPA retention (canonical):** เก็บ **derived pHash + decision FACT** ระยะยาว, purge **raw EXIF/precise GPS ภายใน retention window** (เสนอ 90 วัน, ตรงกับ §6.3) — ไม่เก็บ movement graph; รูปที่ถูก remove เก็บ hash ไว้ block re-upload แต่ purge ตัวรูปตามนโยบาย

#### S5.6.2 Media moderation flow (Tab C ของ console)
```text
review photo upload
      ▼
auto: pHash + EXIF + NSFW + face/PII   → media.moderation_status
      ├─ clean + original + ในร้าน      → approved (auto, low risk)        เห็นทันที
      ├─ ก้ำกึ่ง (gallery/EXIF gap/dup)  → pending → คิว moderator (Tab C)  ซ่อนจน approve
      └─ illegal/NSFW/doxxing            → rejected + auto-hide + escalate (S5.3)
```

#### S5.6.3 Appeal path (review + photo + shadow-ban) — **พร้อม re-check boundary ตอน reinstate**
ทั้ง content ที่ถูก remove/reweight/shadow-ban/reject มีสิทธิ์ appeal — due-process เหมือน agent shadow-review §7:

```sql
moderation_appeals
  id            uuid PK
  action_id     bigserial FK→moderation_actions   -- action ที่ค้าน
  appellant_id  uuid FK   -- reviewer หรือ merchant
  grounds_i18n  jsonb
  status        enum  -- open | reviewing | upheld | overturned
  reviewed_by   uuid  -- ต้องคนละคนกับ actor เดิม (SoD) — second-reviewer
  cosigned_by   uuid NULL  -- City Manager + fraud-team co-sign (บังคับเฉพาะ self_review/sabotage_ring)
  created_at / resolved_at
```
```text
appeal flow:
  user/merchant กด Appeal  →  moderation_appeals(open)
        ▼
  second reviewer (≠ actor เดิม, SoD)  ตรวจ prev_state + grounds + signals
        ▼
  *** [hard precondition ก่อน reinstate — ปิดช่อง self-review laundering ผ่าน appeal] ***
  ถ้า action เดิมมาจาก fake/self-review/sabotage หรือรีวิวเคย trip A.8.12 (S5.5.3):
     → RE-RUN anti-self-redemption (A.8.12) + identity-graph self-review check (§5.9) ใหม่ ณ ตอน reinstate
     → ถ้า "ยัง trip canonical boundary" → **appeal คืน penalty_multiplier > 0 ไม่ได้ ไม่ว่า moderator จะตัดสินยังไง**
        (boundary นี้ไม่ใช่ดุลพินิจ moderator — S5.5.3); overturn ได้แค่ลบ flag ที่ไม่ใช่ boundary
     → การ overturn ใด ๆ บนรีวิวที่ flagged self_review/sabotage_ring ต้อง **City Manager + fraud-team co-sign**
        ▼
        ├─ overturned (ผ่าน boundary re-check)  → moderation_action(reinstate, prev_state) → recompute rating (S5.5.4)
        └─ upheld      → คงเดิม + เหตุผล (i18n) + (ถ้า legal) ชี้สิทธิ์ร้องเรียนต่อ DPO/PDPC
  SLA appeal: 7 วัน (ปกติ) / 30 วัน (legal)
```
> **เหตุผล (minor finding — self-review reinstatement):** ถ้า appeal SoD เช็คแค่ "moderator คนละคน" แต่ไม่ re-run boundary, ร้านที่ปั๊มรีวิวตัวเอง (S5.5.1) ที่ถูก reweight→0 ตาม A.8.12 จะ appeal แล้วให้ moderator คนที่สอง (อาจ collude/ไม่รู้) overturn ตาม "grounds" → S5.5.4 คืน weight → rating พอง = laundering ผ่าน appeal ที่จุดเดียวที่ control นี้ reversible — จึงบังคับ re-run boundary เป็น hard precondition + co-sign

> **PDPA data-subject rights tie-in:** การ appeal + ขอเหตุผล + ขอลบ (erasure) ผูกกับ data-subject rights (canonical) — reviewer ขอลบรีวิวตัวเองได้ (erasure) แต่ **redemption/proof FACT ที่เป็นหลักฐานบัญชี (Accounting Act ม.14, 5–7 ปี) คงไว้** ในรูป pseudonymized: เก็บ "มี redemption เกิด" ไม่เก็บ "movement graph" (จุดยืน erasure-keeps-financial-FACT นี้ผ่าน review แล้วว่า **consistent** กับ S3.7/S1.4)

---

### S5.7 สรุป Interfaces + สิ่งที่ต้องเคาะ

**Touchpoints กับ subsystem อื่น (canonical):**
- → **check_ins.trust_tier / §5.6:** ที่มาเดียวของ `trust_weight` (gps_dwell/verified_visit/proven_purchase)
- → **§5.9 anti-fraud (device/identity graph):** reuse สำหรับ sabotage ring + self-review + extortion + boundary re-check ตอน appeal
- → **media pipeline §6.3 (pHash/EXIF):** reuse เต็มสำหรับ review photo
- → **§6.4 moderation console:** reuse triage + Accept/Reject/Request-fix + audit (แต่ Tab B/C เขียน `content_reports`/`moderation_actions` ไม่ใช่ `change_proposals`)
- → **S1 Support/Dispute (open §13 ข้อ 9):** **S5 owns review/UGC takedown** — review-dispute ที่แตะเงิน/redemption เด้งไป S1 ผ่าน interface ที่ตรง schema S1:
  `support_ticket(category='review_dispute', linked_entity_type='content_report', linked_entity_id=<content_report.id>)`
  (ไม่มี `kind`, ไม่มี 2 FK; linkage ไป redemption เก็บที่ `content_reports.linked_redemption_id`)
- → **S1 ↔ S5 shared verdict (keyed on `linked_redemption_id`):** ปิด burn-and-refund double-dip — S1 บล็อก silent-timeout auto-refund เมื่อมี linked low-star review + dispute; verdict กลับมาสั่ง action ใน S5 (S5.4.3)
- → **canonical ledger:** dispute "ไม่ได้ของ" cross-ref REDEEM/REFUND txn; anti-self-redemption boundary **A.8.12** reuse
- → **audit_log §3 + RBAC SoD:** ทุก moderation action append-only; ผู้สร้าง content ≠ ผู้ moderate ≠ ผู้ appeal-review; reinstate ของ self_review/sabotage_ring ต้อง City Manager + fraud-team co-sign

**Conflict ที่ฉบับนี้ปิด (จาก integration/red-team review):**
- **review-takedown routing (S1 D5 vs S5):** S5 เป็นเจ้าของ — takedown/reweight ผ่าน `content_reports`+`moderation_actions` ไม่ใช่ `change_proposals`; S1 D5 ต้อง hand off เข้า S5 (S5.2.1)
- **support_ticket interface mismatch (S5→S1):** แก้ให้ตรง schema จริงของ S1 (`category` enum + single linkage pair) (S5.4.2)
- **review-extortion + D1 consumer-protect double-dip:** shared verdict + บล็อก auto-refund + false_claim→reweight 0 + ม.337 (S5.4.3, S5.5.1)
- **self-review reinstatement ผ่าน appeal:** re-run A.8.12 + identity-graph เป็น hard precondition + co-sign (S5.6.3)

**ต้องเจ้าของ/ทนายเคาะ (เพิ่มเข้า §13 Open Decisions):**
1. **[LEGAL/BLOCKING]** Thai-lawyer-vetted **defamation/CCA reason-code playbook** + notice-and-action policy (ลบเมื่อไร, hold เมื่อไร, exposure ของ platform ตาม พ.ร.บ.คอม ม.15) — ก่อน launch content
2. **[DATA/FOUNDER]** ค่า `base_tier_weight` (1.0/3.0/6.0), HALF_LIFE, penalty multipliers — tune กับ pilot Nimman (รวมเข้า anti-fraud parameter set ข้อ 7)
3. **[POLICY]** review eligibility window (30 วัน?), gallery-photo อนุญาตไหม + ลด trust เท่าไร
4. **[COMPLIANCE/DPO]** retention ของ removed-review/raw EXIF (90 วัน?) vs Accounting Act FACT-retention 5–7 ปี — field ไหนเก็บต่อโดยอ้าง legal obligation เมื่อ user ขอ erasure
5. **[CROSS-SUBSYSTEM/S1]** S1 ต้อง **เพิ่มค่า `review_dispute` ใน `category` enum** ของ `support_tickets` + implement กฎ "บล็อก silent-timeout auto-refund เมื่อมี extortion/velocity signal จาก S5" + รองรับ shared verdict object (keyed on `linked_redemption_id`) — เป็น dependency ของ S5.4 (ผูกกับ S1 open §13 ข้อ 9)

---

## S6. Observability, Financial Reconciliation & Disaster Recovery

> **บทบาทของ section นี้:** เป็น **money-integrity backbone** ของระบบ — ชั้นที่ "พิสูจน์ได้ทุกคืนว่าเงินจริงในธนาคาร/PSP ≥ หนี้สิน Coin + escrow + ภาระจ่ายอื่นที่เราถือ" และเป็นชั้นที่ **freeze ระบบอัตโนมัติ** เมื่อ invariant ใด ๆ ใน Spec A.8 แตก เอกสารนี้ไม่สร้าง account/txn_type ใหม่ — มันเพียง **assert canonical invariants A.8.1–A.8.13 + A.8.2s** ที่ Spec A ล็อกไว้แล้ว, ทำให้ตรวจได้ทุกวัน, และผูกการตอบสนอง (alert → auto-pause → freeze) เข้ากับมัน
>
> **เสาหลัก 6 ต้น:** (1) Reconciliation jobs (nightly + intraday) → break-alert + freeze · (2) Fraud-detection pipeline → review queue · (3) SLO + error monitoring + on-call + money dashboards · (4) Audit-log integrity (tamper-evident) · (5) Backup/PITR + ledger replay/rebuild · (6) DR สำหรับ Supabase Singapore outage + RPO/RTO
>
> **กฎเจ้าของ invariant (สำคัญที่สุดในการ build):** S6 เป็น **เจ้าของ (owner) ของ A.8.2s solvency check และ auto-freeze trigger ทั้งหมด** — subsystem อื่น (S4 payout, S1 support, S3 auth) **อ้างอิง (reference)** สูตรและ run จาก S6 เท่านั้น **ห้ามนิยามสูตร solvency เองหรือขยาย RHS เอง** (ดู S6.1.4 — แก้ conflict S4↔S6) recon run ที่ S4 batch-approval gate อ่าน (`solvency_check_id = pass`) คือ run ของ S6 เสมอ → จึงต้องมีสูตรเดียวชนะ

---

### S6.0 หลักการที่ไม่ต่อรอง (Non-negotiables ของชั้น observability)

1. **Reconciliation อ่าน ledger เป็น source of truth เสมอ ไม่เคยอ่าน cache เป็นความจริง** — ทุก check เปรียบเทียบ `SUM(ledger_entries)` กับ (ก) เงินจริงภายนอก (bank/PSP statement) และ (ข) cache ที่ derive (`coin_lots.remaining_minor`, `escrow_wallets.*_cached`, `escrow_locks`) cache ที่ drift = สัญญาณบั๊ก ไม่ใช่ความจริงใหม่
2. **แยก tautology ออกจาก solvency** — A.8.2 (`SUM(DR)−SUM(CR)=0` ทั่ว ledger) เป็น **corruption tripwire** ไม่ใช่ solvency; solvency จริงคือ **A.8.2s** ที่ anchor กับ **เงินสดจริงภายนอก** (Spec A.8.2s, canonical line 450) job ต้องไม่หลอกตัวเองด้วย internal tautology
3. **Freeze ต้อง fail-safe (fail-closed) บนเส้นเงิน** — เมื่อ invariant การเงินแตก ระบบ **หยุด mint/redeem/payout** ก่อน แล้วค่อยให้มนุษย์ตรวจ — ไม่ใช่ "alert แล้วปล่อยให้ไหลต่อ" **กฎนี้บังคับแบบไม่มีข้อยกเว้น: ทุกเงื่อนไขที่ก่อ loss จริงต้อง fail-CLOSED** (ไม่มี WARN-only บน loss-bearing condition — ดู S6.1.6 ตารางใหม่ที่ปิดช่อง fail-open 3 จุด)
4. **Reconciliation job เป็น read-only ต่อ ledger** — job ไม่เคย UPDATE/DELETE `ledger_entries` (Spec A.8.9) การแก้ drift ทำได้แค่ (ก) rebuild cache จาก ledger หรือ (ข) post reversal/adjustment txn ใหม่ผ่าน edge function ปกติ ด้วย **canonical txn_type เท่านั้น** (RECOVERY / WRITE_OFF / REFUND / CHARGEBACK — ทั้งหมดอยู่ใน A.7 locked list; ห้ามประดิษฐ์ label เช่น "reverse SUBSCRIPTION" หรือ "merchant_payable clawback" ที่ไม่มีใน canon)
5. **Observability data เป็น operational ไม่ใช่ financial record** — metric/log/Sentry event อยู่นอก 7-year tax retention; แต่ `recon_runs` + `freeze_events` + `audit_log` เป็น **governance record** เก็บตาม `retention_class` (ดู S6.4)
6. **ทุกอย่าง 3 เมือง-ready** — recon รันต่อ `city_id` (Spec multi-city ตั้งแต่ migration #1); solvency anchor ต้องผ่าน **ต่อ city** ไม่ใช่แค่ aggregate (city หนึ่ง under-collateralized ต้องจับได้แม้ aggregate ดูบวก) — **และต้องผ่านต่อ funder line ด้วย** (funder หนึ่ง under-collateralized เช่น goodwill budget ติดลบ ต้องจับได้แม้ city aggregate ดูบวก — ดู S6.1.3 A.8.5 + invariant goodwill)

---

### S6.1 Financial Reconciliation — Nightly + Intraday Jobs

#### S6.1.1 สถาปัตยกรรม job + ตารางผลลัพธ์

Reconciliation รันด้วย **`pg_cron` + Supabase Edge Function** (orchestrator) ทุก check เขียนผลลง `recon_runs` (append-only) เพื่อให้ Finance/DPO/auditor ย้อนดูได้ และเป็นหลักฐานว่า "เราตรวจทุกคืน"

```sql
recon_runs                      -- append-only; เก็บผลทุกรอบ reconcile (governance record)
  id                uuid PK
  run_type          enum    -- nightly_full | intraday_solvency | post_freeze_verify | on_demand
  scope_city_id     uuid NULL   -- null = all cities (aggregate); ปกติรันต่อ city
  started_at        timestamptz NOT NULL
  finished_at       timestamptz NULL
  ledger_high_seq   bigint NOT NULL   -- snapshot point: seq สูงสุดที่ pin ตอนเริ่ม (ดู S6.1.2)
  status            enum    -- pass | warn | break | error
  checks_total      int
  checks_failed     int
  retention_class   text DEFAULT 'governance_7y'
  -- หมายเหตุ: S4 batch-approval อ้าง recon_runs.id เป็น solvency_check_id; A.8.2s run นี้คือ
  --           authority เดียว (S6 owns) — S4 ห้ามคำนวณ solvency เองคู่ขนาน

recon_check_results             -- หนึ่งแถวต่อ invariant ต่อ scope ต่อ run
  id                uuid PK
  run_id            uuid FK → recon_runs
  invariant_code    text NOT NULL   -- 'A.8.1' | 'A.8.2s' | 'A.8.5' | 'A.8.6' | 'A.8.3' | 'A.6.9_drift' | 'wht_recon' | 'vat_revenue_recon' | 'cogs_budget_cap' | 'goodwill_backing' ...
  scope_key         text NOT NULL   -- 'city:CNX' | 'funder:merchant:123' | 'funder:platform:goodwill' | 'lot:<uuid>' | 'agent:<id>:2026-06' | 'global'
  expected_minor    bigint NULL     -- ค่าจาก ledger / statement
  actual_minor      bigint NULL     -- ค่าจาก cache / ledger อีกฝั่ง
  drift_minor       bigint NOT NULL DEFAULT 0   -- expected − actual (satang หรือ coin-minor)
  severity          enum    -- ok | warn | break
  detail_jsonb      jsonb NULL      -- breakdown ต่อ account/lot สำหรับ debug
  created_at        timestamptz DEFAULT now()
```

> **กฎ enumeration ของ account set (แก้ canonical_misuse — S4 non-canonical accounts in lockstep):** recon ที่เดิน "ทุกบัญชีที่มีอยู่" ต้อง enumerate **account set เดียวกับ canonical CoA** บวกบัญชีที่ pricing/agent spec (B/C) ประกาศเป็นส่วนเพิ่ม — `platform_expense`, `wht_payable`, `vat_output_payable`, `vat_input_claimable`, `payout_suspense`, `escheatment_liability`, `bad_debt_expense`, `wht_credit_received` — เพื่อ **ไม่ flag บัญชีภาษี/expense/suspense เป็น "foreign account"** (false break) บัญชีเหล่านี้ปรากฏใน canonical pricing doc (line 893: `platform_expense`, `wht_payable`, txn_type `AGENT_PAYOUT`/`AGENT_CLAWBACK` = "ใหม่ที่ต้องเพิ่ม") → S6 ปฏิบัติเป็น **canonical-pending**: ถ้า CoA amendment ยังไม่ ratify, recon รู้จักบัญชีเหล่านี้แต่ติด flag `pending_ratification` ใน detail_jsonb เพื่อให้ Finance เห็นว่ายังรอเคาะ — **ไม่ใช่ break, ไม่ใช่เงียบ**

#### S6.1.2 Snapshot consistency (กัน race กับ traffic สด)

ปัญหา: ledger เขียนตลอดเวลา ถ้า job อ่าน `coin_liability` ตอน T1 แล้วอ่าน `user_coin` ตอน T2 จะ "เห็นครึ่ง txn" และ false-break

**คำตัดสิน:** ทุก nightly check รันใน transaction เดียวที่ `ISOLATION LEVEL REPEATABLE READ` และ **pin `ledger_high_seq := MAX(seq)` ตอนเริ่ม** แล้วทุก aggregate filter `WHERE seq <= ledger_high_seq` — ทำให้ทุก invariant ประเมินบน **snapshot เดียวกัน** (เพราะ `seq bigserial` คือ monotonic write-order ของทั้งระบบ ตาม Spec A.2) txn ที่ commit หลัง pin จะถูกตรวจในรอบถัดไป ไม่ก่อ false positive

#### S6.1.3 ตาราง invariant ที่ job ต้อง assert (map ตรง Spec A.8)

| invariant_code | คำอธิบาย (assert ว่า) | SQL shape (ย่อ) | severity เมื่อแตก | ความถี่ |
|---|---|---|---|---|
| **A.8.1** | ทุก txn บาลานซ์ต่อสกุล (recompute หลังบ้าน เผื่อ trigger ถูก bypass) | `∀ txn,c: SUM(DR.amount)=SUM(CR.amount)` | **BREAK → freeze** | nightly |
| **A.8.1b** | `clearing` กลับ 0 ทุก txn (transient จริง) | `∀ txn: Σ(clearing DR)=Σ(clearing CR)` | **BREAK → freeze** | nightly |
| **A.8.2** | corruption tripwire (tautology ของ A.8.1) | `∀c: SUM(DR)−SUM(CR)=0` ทั่ว ledger | **BREAK → freeze** | nightly + intraday |
| **★ A.8.2s** | **Solvency anchor กับเงินสดจริง — สูตร canonical แคบ (ดู S6.1.4)** | `bank + settled_suspense ≥ coin_liab + escrow_avail + sponsor_avail − receivable` ต่อ city | **BREAK → freeze + page** | **intraday (รายชั่วโมง)** + nightly |
| **A.8.3** | ไม่มี lot ติดลบ / user_coin ติดลบ | `∀lot: granted − SUM(burn) = remaining ≥ 0` | **BREAK → freeze redeem** | nightly + ทุก burn (trigger) |
| **A.8.4** | escrow ไม่ติดลบ / loss โผล่เป็น receivable | `∀: balance(merchant_escrow) ≥ 0`; aggregate `SUM(merchant_receivable)` ≤ reserve | escrow<0 = **BREAK**; receivable เกิน reserve = **BREAK → auto-PAUSE GRANT** ที่ 100% (WARN ที่ 70%) — **เปลี่ยนจาก WARN-only, ดู S6.1.6** | nightly + intraday |
| **★ A.8.5** | **Coin backed 1:1 ต่อ funder** (รวม funder `platform:goodwill` ถ้า goodwill ถูก ratify — ดูแถวล่าง) | `∀funder f,city: balance(coin_backing where funder=f)[THB] == Σ(live coin_liability ของ lot funded_by=f)[COIN]` | **BREAK → freeze** | nightly |
| **A.8.6** | cache == ledger-derived (escrow_wallets, coin_lots, escrow_locks) | rebuild จาก ledger เทียบ cached → drift | drift≠0 = **WARN→page**; ใหญ่/หลายแถว = **BREAK** | nightly |
| **A.8.7** | `Σ(GRANT draws ต่อ reservation) ≤ reservation amount` | per quest_pool reservation | over-draw = **BREAK** | nightly + ตอน grant (DB) |
| **A.8.11** | mint/payout มาจาก settled cash เท่านั้น | `settled_total_cached == ส่วนที่ผ่าน PSP_SETTLE`; payout legs ทุกอันมาจาก `bank_settlement` | **BREAK → freeze mint+payout** | nightly + intraday |
| **A.6.9_drift** | **rounding-drift** (banker's rounding ไม่สะสม bias) — **แยก noise vs bias** | `Σ(take_rate_minor) เทียบ Σ(thb_settlement × pct)` drift band + **sign-test ข้าม N วัน** | drift สุ่มในแบนด์ = **WARN→review**; **bias ทิศเดียวต่อเนื่อง N วัน = BREAK** (bias = บั๊ก/ขโมย ไม่ใช่ noise — ดู S6.1.6) | nightly |
| **A.8.12_resid** | ไม่มี self-redeem ที่หลุด live gate | join redemption ↔ funder identity-graph | พบ = **BREAK → freeze GRANT+REDEEM+PAYOUT ของทั้ง funder/identity-cluster** + เปิด fraud_case (เปลี่ยนจาก freeze แค่แถวเดียว — ดู S6.1.6) | nightly |
| **cogs_budget_cap** | **per-merchant monthly reward-COGS cap ไม่ทะลุ** (locked pricing lever, canonical B.6/D.1116) | `∀merchant,month: Σ(reward COGS ที่ landed บน escrow funder=merchant) ≤ REWARD_BUDGET_CAP[merchant,month]` | **BREAK → PAUSE GRANT(merchant)** | nightly + intraday |
| **goodwill_backing** | **(conditional)** ถ้า goodwill ถูก ratify: `platform_goodwill_budget` settled-backed ≥ 0 และค้ำ live goodwill liability | `balance(platform_goodwill_budget[city]) ≥ 0` AND `coin_backing(funder=platform:goodwill) == live goodwill coin_liability` | **BREAK → freeze GRANT(goodwill) ต่อ city** | nightly + intraday |
| **wht_recon** | **per-(agent,period): Σ per-payout WHT legs == monthly aggregate** | `Σ(AGENT_PAYOUT wht_payable legs) == agent_wht_ledger.wht_minor` | **BREAK → block WHT_REMIT จนกว่า reconcile** | monthly (ก่อน WHT_REMIT) |
| **vat_revenue_recon** | platform_revenue ที่เคลื่อน == invoiced/credit-noted บน tax_invoice | `Σ(platform_revenue moves) เทียบ Σ(ภพ.20 line ± credit note)` ต่อ period | drift = **WARN→review**; reversal ที่ไม่มี credit-note = **BREAK** | monthly |
| **A.8.12_residual (legacy code A.8.12_resid)** | _(merged เข้า A.8.12_resid ด้านบน)_ | — | — | — |

> **หมายเหตุ COIN vs THB ใน A.8.2s:** 1 COIN = 1 THB = 100 satang **FIXED** (Spec A.10.1) ดังนั้น `coin_liability[COIN-minor]` แปลงเป็น THB-satang ได้ตรง 1:1 ไม่มี FX risk ในการเทียบ — นี่คือเหตุผลที่ fixed-peg ถูกล็อก: ทำให้ solvency check เป็นการบวกเลขจำนวนเต็มล้วน ไม่มี rounding ในการแปลงสกุล

> **หมายเหตุ A.8.1b ↔ AGENT_CLAWBACK (cross-ref ไป S4):** S6 A.8.1b assert ว่า `clearing` ต้องกลับ 0 ในทุก txn — ถ้า S4 post `AGENT_CLAWBACK` แบบ single-sided `Dr clearing / Cr platform_expense` (ไม่มี leg ปิด clearing ใน txn เดียวกัน) **A.8.1b จะ BREAK → global FROZEN ทันที** นี่คือพฤติกรรมที่ **ถูกต้องของ S6** (S6 ทำหน้าที่จับ S4 bug) — S4 ต้องแก้ให้ clearing net 0 (เช่น `Dr agent_reserve|payable / Cr platform_expense` ไม่แตะ clearing เลย) **S6 ไม่ผ่อนปรน A.8.1b เพื่อรองรับ posting ผิดของ S4**

> **หมายเหตุ breakage account name (ปฏิเสธ review finding — ชี้ชัด):** recon enumeration ใช้ **`platform_breakage`** (canonical CoA line 54) เป็นปลายทาง breakage ฝั่ง THB — **ไม่ใช่ `expiry_breakage`** review finding ที่บอกว่า "canonical คือ expiry_breakage" **ขัดกับ canon โดยตรง**: canonical line 60/321 ระบุว่า **ตัด `expiry_breakage` (COIN sink) ทิ้งแล้ว** (วัด breakage ฝั่ง COIN จาก `ref_type=expiry` ใน reporting ไม่มี leg ที่สาม) ปลายทาง THB มี 3 ทาง: คืน funder / `platform_breakage` / `escheatment_liability` → **ปฏิเสธ finding นี้, S6 ใช้ `platform_breakage` ถูกต้องตาม canon**

#### S6.1.4 A.8.2s Solvency Anchor — หัวใจที่ลึกที่สุด (สูตร canonical แคบ — S6 เป็นเจ้าของ)

นี่คือ check เดียวที่ **ไม่พึ่ง ledger ตัวเองล้วน ๆ** — มันเทียบ ledger กับ **statement ธนาคาร + PSP จริง** เพื่อจับกรณีที่ ledger บาลานซ์สวยแต่เงินจริงหายไป

> **★ คำตัดสิน conflict S4↔S6 (critical — สูตรเดียวต้องชนะ):** invariant การเงินสำคัญที่สุดของระบบถูกคำนวณ **2 แบบภายใต้ code เดียวกัน 'A.8.2s'** — S4.4.2 ขยาย RHS เป็น `coin_liab + escrow_avail + sponsor_avail + merchant_payable + wht_payable + vat_output_payable − merchant_receivable` ส่วน S6 (และ **canonical Spec A.8.2s line 450**) ใช้ RHS แคบ `coin_liab + escrow_avail + sponsor_avail − merchant_receivable` (ไม่มี payable/tax) **canonical ชนะ → S6 owns สูตรนี้, S4 ต้องอ้างอิงไม่ใช่ขยาย** เหตุผล: A.8.2s ถาม "เงินสด settled พอค้ำ **หนี้ที่ต้องมีเงินค้ำตอนนี้** ไหม" — `merchant_payable`/`wht_payable`/`vat_output_payable` เป็น **ภาระจ่ายที่จะ settle ด้วย batch/remit ในอนาคต** ซึ่ง **ตัดจาก bank_settlement ตอนจ่าย** (ไม่ใช่หนี้ที่ต้อง pre-collateralize ด้วย cash วันนี้) การเอามารวม RHS = นับ exposure ซ้ำ และทำให้ batch-approval gate ของ S4 (ที่อ่าน run ของ S6) ตัดสินด้วยนิยามที่ไม่ตรงกัน → S4 batch อาจถูก approve/reject ผิด **S6 จึงล็อก: RHS = canonical narrow form เท่านั้น** payable/tax ถูกเฝ้าแยกผ่าน dashboard 4 (payout backlog) + invariant `wht_recon`/`vat_revenue_recon` ไม่ใช่ยัดเข้า solvency anchor

```
ต่อ city C (จาก ledger, pin ที่ ledger_high_seq):
  L_coin     = balance(coin_liability[C])                         -- หนี้ Coin คงค้าง (COIN→THB 1:1)
  L_escrow   = Σ balance(merchant_escrow available[C])            -- escrow ที่ยังไม่ค้ำ Coin
  L_sponsor  = Σ balance(sponsor_budget available[C])
  A_recv     = balance(merchant_receivable[C])                    -- exposure จริง (Asset, หักออก)
  REQUIRED   = L_coin + L_escrow + L_sponsor − A_recv             -- ภาระที่ต้องมีเงินค้ำ
                                                                  -- *** ไม่บวก payable/wht/vat (S6 owns; S4 ห้ามขยาย) ***
  -- ถ้า goodwill ถูก ratify: บวก L_goodwill = balance(coin_liability ของ lot funded_by=platform:goodwill)
  --   และค้ำด้วย balance(platform_goodwill_budget[C]) ใน HAVE-side (settled-backed) — ดู invariant goodwill_backing

ต่อ city C (เงินจริง):
  CASH_bank      = balance(bank_settlement[C])                    -- ledger-side ของเงิน settled
  CASH_suspense  = balance(psp_suspense settled-portion[C])       -- เฉพาะส่วนที่ statement PSP ยืนยันว่าจะ payout
  HAVE           = CASH_bank + CASH_suspense

External truth (S6.1.5):
  BANK_STMT      = ยอดจริงในบัญชี segregated client account (ดึงผ่าน bank API/statement import)
  PSP_STMT       = ยอด net payable ค้างจ่ายตาม statement PSP (Omise/2C2P/Fiuu/Alipay/WeChat)

ASSERT 1 (internal solvency):   HAVE ≥ REQUIRED                  -- ขาด = under-collateralized
ASSERT 2 (bank truth):          |CASH_bank − BANK_STMT|  ≤ recon_tolerance
ASSERT 3 (PSP truth):           |CASH_suspense − PSP_STMT| ≤ recon_tolerance
```

- **ASSERT 1 แตก (HAVE < REQUIRED) = ละเมิด Non-negotiable #4 ของ Spec A ("แพลตฟอร์มไม่เคยสำรองจ่าย")** → **page on-call ทันที + auto-freeze GRANT/PAYOUT ใน city นั้น** (ดู S6.1.6) นี่คือสัญญาณว่าเรากำลัง mint/จ่ายเกินเงินจริง
- **ASSERT 2/3 แตก = ledger กับเงินจริงไม่ตรง** → ส่วนใหญ่คือ missing/late settlement file หรือ chargeback ที่ยังไม่ post → เปิด recon-investigation case (ไม่ freeze ทั้งระบบทันที เว้นแต่ drift > hard threshold)
- **`recon_tolerance`** = `platform_config.RECON_TOLERANCE_SATANG` (default 0 satang สำหรับ internal A.8.1/A.8.5; **100 satang = 1 บาท** สำหรับ external bank/PSP เพื่อรองรับ rounding ของ statement ภายนอก) — drift ที่ **ไม่เป็นศูนย์แต่ยังใน 1 บาท** = WARN; เกิน = BREAK

#### S6.1.5 External statement ingestion (ทำให้ A.8.2s เป็นจริงได้)

A.8.2s จะ anchor กับเงินจริงได้ก็ต่อเมื่อเรา **ดึง statement ภายนอกเข้ามาเทียบ** สร้าง pipeline:

| แหล่ง | วิธีดึง | ความถี่ | map เข้า |
|---|---|---|---|
| **Bank (segregated client account)** | bank statement API / SFTP daily file → `bank_statement_lines` | daily (เช้า) | เทียบ `bank_settlement` legs + `PSP_SETTLE` |
| **Omise / 2C2P / Fiuu** | PSP settlement report API (net หลังหัก fee) → `psp_settlement_lines` | daily + webhook | เทียบ `psp_suspense` (NET) → trigger `PSP_SETTLE` posting |
| **Alipay / WeChat (CNY→THB)** | acquirer settlement report (ยอด THB หลัง FX ที่ขอบ PSP) | daily | FX ที่ขอบ PSP เป็น THB satang แล้ว (Spec A.3) — ledger ไม่เห็น CNY |

```sql
psp_settlement_lines            -- import จาก PSP statement; matched กับ ledger
  id, psp_key, external_ref, gross_minor, fee_minor, net_minor,
  expected_settle_date, matched_txn_id uuid NULL FK → ledger_transactions,
  match_status enum,            -- matched | unmatched | disputed | chargeback
  city_id, imported_at
```

- **Unmatched line เกิน N วัน (default T+2) = WARN→page** — เงิน PSP ที่ควร settle แต่ไม่มา = สัญญาณ PSP delay หรือ fraud
- **Chargeback line** → trigger canonical `CHARGEBACK` posting (Spec A.6(7), txn_type A.7): `Dr merchant_escrow (+Dr merchant_receivable ถ้าขาด) / Cr bank_settlement|psp_suspense` + ตั้ง merchant `PAYOUT_FROZEN` → เปิด recovery case (เก็บคืนด้วย `RECOVERY`, เก็บไม่ได้ → `WRITE_OFF`; ทั้ง 3 txn_type เป็น canonical A.7 — ปฏิเสธ review finding ที่บอกว่า RECOVERY/WRITE_OFF ไม่ canonical: canonical line 431-432/549 ระบุชัดว่าทั้งคู่อยู่ใน locked txn_type list)
- **ทำไมต้อง match บน NET ไม่ใช่ gross:** Spec A.6(1) ลง `psp_suspense` แบบ NET (หัก `psp_fee_expense` แล้ว) ดังนั้น reconcile กับ PSP statement ที่ NET เท่านั้น — ถ้าเทียบ gross จะ false-break ทุกแถว
- **Chargeback window อยู่นานกว่า lot lifecycle:** acquirer chargeback มาได้ **120+ วันหลัง redeem** (หลัง lot หมดอายุ + dispute ปิดไปแล้ว) → ผูกกับ S6.1.8 (erasure gate ต้องกัน chargeback window) เพื่อให้ CHARGEBACK/RECOVERY ยัง post ได้แม้ user erase ไปแล้ว

#### S6.1.6 Break-alert → Auto-pause → Auto-freeze response (เกณฑ์ trigger ชัดเจน — fail-closed ทุก loss-bearing path)

นี่คือส่วนที่ต้อง **concrete ที่สุด**: อะไรกระตุ้น auto-freeze, ระดับไหน, scope ไหน

```sql
freeze_events                   -- append-only; ทุก auto/manual freeze
  id uuid PK, freeze_level enum, scope_type enum, scope_id uuid NULL,
  trigger_invariant text,       -- 'A.8.2s' | 'A.8.5' | 'cogs_budget_cap' | 'goodwill_backing' | manual:<reason>
  trigger_run_id uuid NULL FK → recon_runs,
  triggered_by enum,            -- system | finance_user | platform_owner
  triggered_at timestamptz, released_at timestamptz NULL,
  released_by uuid NULL, release_reason text NULL, retention_class 'governance_7y'

platform_freeze_state           -- read-model: สถานะ freeze ปัจจุบัน (edge fn อ่านก่อนทุก money op)
  scope_key text PK,            -- 'global' | 'city:CNX' | 'merchant:123' | 'funder:sponsor:TAT' | 'funder:platform:goodwill' | 'identity-cluster:<id>'
  frozen_ops text[],            -- ['GRANT','REDEEM','PAYOUT','PREFUND'] ที่ถูกบล็อก
  freeze_event_id uuid, updated_at timestamptz
```

**State machine ของ money-flow freeze:**

```
                 invariant break / fraud cluster / manual
   NORMAL ───────────────────────────────────────────────► PAUSED ───► FROZEN
     ▲                                                        │           │
     │  finance verify + recon pass (S6.1.7)                  │           │
     └────────────────────────────────────────────────────────┴───────────┘
        release ต้อง: (1) recon re-run = pass  (2) two-person (creator≠approver, Spec RBAC SoD)
                      (3) step-up MFA ของ Finance/Platform Owner

NORMAL  = ทุก money op ทำงานปกติ
PAUSED  = บล็อก op ที่ "เพิ่ม obligation/ปล่อยเงินออก" (GRANT, PAYOUT) แต่ยอม op ที่ "ลด obligation"
          (EXPIRE, REFUND, RECOVERY) + read ทั้งหมด — กันความเสียหายโตขึ้นโดยไม่ขัง user
FROZEN  = บล็อกทุก money mutation ใน scope (รวม REDEEM) — ใช้เมื่อ corruption ที่ทำให้ burn เองก็ผิด
```

**ตารางเกณฑ์ auto-trigger (สิ่งที่ทำให้ระบบ freeze เอง — ทุก loss-bearing condition fail-CLOSED):**

| สิ่งที่ตรวจพบ | scope ที่ freeze | level | mode | เหตุผล |
|---|---|---|---|---|
| **A.8.2s ASSERT 1 แตก** (HAVE < REQUIRED) | `city:<id>` | GRANT + PAYOUT | **PAUSED** | กำลัง mint/จ่ายเกินเงินจริง — หยุดเพิ่ม exposure ทันที |
| **A.8.5 แตก** (coin_backing ≠ live liability ต่อ funder) | `funder:<key>` + city | GRANT + REDEEM ของ funder นั้น | **FROZEN** | attribution เงินค้ำเพี้ยน — burn ผิด funder ได้ |
| **A.8.1 / A.8.1b / A.8.2 แตก** | `global` | **ทุก op** | **FROZEN** | ledger corruption ระดับ structural — หยุดทุกอย่างจนกว่าจะ rebuild (รวมกรณี AGENT_CLAWBACK single-sided clearing ของ S4) |
| **A.8.3 แตก** (lot/user_coin ติดลบ) | `city:<id>` | REDEEM + EXPIRE | **FROZEN** | burn เกิน lot = double-spend เกิดแล้ว |
| **A.8.11 แตก** (mint จาก unsettled) | `city:<id>` | GRANT + PAYOUT | **PAUSED** | platform float — ละเมิด Spec A #4 |
| **escrow balance < 0** (Spec A.8.4) | `merchant:<id>` | GRANT + PAYOUT | **PAUSED** | hidden loss; route เป็น receivable + recovery |
| **`SUM(merchant_receivable)` > funded reserve** (100% ของ reserve) | `global` | GRANT (เฉพาะ new credit) | **BREAK → auto-PAUSE** (WARN ที่ 70%) | **เปลี่ยนจาก WARN-only → fail-closed:** receivable เกิน reserve = under-collateralization จริงที่ทั้งชั้นนี้มีไว้หยุด — founder ตัดสิน **ขนาด reserve** ไม่ใช่ "จะ freeze ไหม" |
| **A.8.11 แตก** (mint จาก unsettled) ... | _(ดูแถวบน)_ | | | |
| **A.8.12_resid** (self-redeem หลุด live gate) | `identity-cluster:<id>` (ทั้ง funder/cluster) | GRANT + REDEEM + PAYOUT | **FROZEN** + เปิด fraud_case | **เปลี่ยนจาก freeze แค่แถวเดียว → ทั้ง cluster:** residual hit = live gate ถูก bypass แล้ว → ring จะ adapt ถ้าจับแค่แถวที่เจอ ต้องหยุดทั้ง cluster |
| **A.6.9_drift bias** (ทิศเดียวต่อเนื่อง N วัน, sign-test) | `city:<id>` | GRANT + REDEEM | **BREAK → PAUSE** (drift สุ่ม = WARN) | **bias ทิศเดียว = บั๊ก/ขโมย ไม่ใช่ noise** — random rounding ยัง WARN, directional drift fail-closed |
| **cogs_budget_cap แตก** (per-merchant monthly reward COGS เกิน cap) | `merchant:<id>` | GRANT | **PAUSED** | locked COGS lever (B.6/D.1116) — reward COGS เกิน budget ของร้าน = ขาดทุนเกินเพดานที่ pricing เคาะ |
| **goodwill_backing แตก** (ถ้า ratify: goodwill budget ติดลบ/unsettled) | `funder:platform:goodwill` + city | GRANT(goodwill) | **FROZEN** | goodwill mint บนเงินไม่ settled = platform float (A.8.11) — ปิดช่อง goodwill insolvency ที่ aggregate อาจซ่อน |
| **CS-initiated GRANT จะทำให้ funder เกิน monthly cap** (D7 quest-comp path) | `funder:merchant:<id>` หรือ `funder:sponsor:<id>` | GRANT | **PAUSED** | D7 mint Coin หนุนด้วย escrow ของ funder จริง — ต้องเข้า cap เดียวกับ flow ปกติ (ดู S6.2.4) |
| **Fraud cluster score > hard threshold** (S6.2) | `merchant:<id>` หรือ `identity-cluster` | PAYOUT + GRANT + REDEEM (hold settlement) | **PAUSED→FROZEN ตาม signal** | กัน escrow ถูกดูดออกผ่าน collusion |
| **PSP settlement หาย > T+2** | `psp:<key>` | PAYOUT ที่อ้าง settlement นั้น | **PAUSED** | เงินจริงยังไม่เข้า ห้ามจ่ายออกก่อน (Spec A #4) |

> **กฎเหล็กของ freeze:** การ freeze **บล็อกที่ edge function ก่อน post ledger** (อ่าน `platform_freeze_state` เป็น precondition เหมือน mint-gating A.8.7) — **ไม่ใช่** ปิดด้วยการ revoke DB grant (เพราะ EXPIRE/REFUND/RECOVERY ต้องทำงานต่อได้ใน PAUSED) consumer protection: **REDEEM ของ Coin ที่ออกไปแล้วถูก honor ต่อใน PAUSED** (freeze แค่ GRANT/PAYOUT) — user ที่ถือ Coin โดยสุจริตไม่ถูกลงโทษจากปัญหาหลังบ้าน เว้นแต่ corruption ระดับ FROZEN

> **เหตุผลที่ทุก loss-bearing condition ต้อง fail-closed (ปิดช่อง fail-open 3 จุดที่ review พบ):** draft เดิมปล่อย 3 เงื่อนไขเป็น WARN-only ทั้งที่เป็น loss จริง — ขัด Non-negotiable #3 เอง: (1) `receivable > reserve` = under-collateralization ที่ทั้งชั้นมีไว้หยุด แต่ปล่อย GRANT ไหลรอ founder; (2) `A.6.9 directional bias` = slow leak ที่ไม่เคย freeze; (3) `A.8.12_resid` freeze แค่แถวเดียวให้ ring adapt ต่อ ทั้ง 3 ถูก **promote เป็น fail-closed** ในตารางบน (founder ตัดสิน parameter เช่น reserve size / N-day window ไม่ใช่ "จะหยุดไหม")

#### S6.1.7 Release / un-freeze procedure (segregation of duties)

ปลด freeze **ไม่ใช่ปุ่มเดียว** — ผูกกับ Spec RBAC (payout creator ≠ approver, step-up MFA):

1. **Diagnose:** Finance ดู `recon_check_results` ของ run ที่ break → ระบุ root cause (missing settle / cache drift / real loss)
2. **Remediate:** ถ้า cache drift → rebuild cache (S6.5.2, read-only ต่อ ledger); ถ้า missing posting → post adjustment txn ผ่าน edge function ปกติ ด้วย canonical txn_type (append-only); ถ้า real loss → post `merchant_receivable` + recovery case (`RECOVERY`/`WRITE_OFF`)
3. **Re-verify:** รัน `run_type='post_freeze_verify'` → ต้อง `status='pass'`
4. **Two-person release:** ผู้เสนอปลด (Finance/Payout role) ≠ ผู้อนุมัติ (Platform Owner/Finance lead) — **step-up MFA ทั้งสองฝั่ง** (Spec RBAC: high-impact action)
5. **Log:** `freeze_events.released_by/release_reason` + `audit_log` (tamper-evident, S6.4)

#### S6.1.8 Erasure ↔ ledger/audit reconcilability (PDPA vs financial attribution)

> **ที่มา (review — observability minor):** S3.7 pseudonymize ledger `owner_id` → tombstone (`erased:<hash>`) + ลบ `user_ref→identity` mapping และ S1.1 อ้างว่า ticket ที่อ้าง `subject_user_ref` ยัง balance หลัง erase ได้ แต่ S6.4.2 audit↔ledger cross-check และ S6.5.2 REBUILD-FROM-LEDGER **พึ่ง stable subject identity บน entries** ถ้า erasure ลบ attribution จนหมด, chargeback ที่มาช้า (120+ วัน) บน redemption ของ user ที่ erase แล้วจะ post `CHARGEBACK`/`RECOVERY` ไม่ได้ และ cross-check จะ flag counterpart ที่ resolve ไม่ออก

**คำตัดสิน (S6-side enforcement — ผูกกับ S3 erasure gate):**

1. **Tombstone = financial-attribution token ที่ reconcile ได้:** การ pseudonymize **ต้องคงโทเคน non-PII** (`erased:<hash>` ที่เสถียร) บน `ledger_entries.owner_id`/`created_by` — recovery/CHARGEBACK/RECOVERY post ทับโทเคนนี้ได้ และ S6.4.2 audit↔ledger cross-check ปฏิบัติต่อโทเคนนี้เป็น **valid counterpart** (ไม่ flag) → financial-action attribution ยังครบ แม้ identity ถูก erase
2. **Erasure eligibility gate (S3.7) ต้องกัน chargeback window:** S6 กำหนด **dependency hard precondition** ให้ S3 erasure gate — นอกจาก "ไม่มี dispute/chargeback เปิดอยู่ตอนนี้" ต้องเพิ่ม **acquirer chargeback window ผ่านไปแล้ว** (default 120–180 วันนับจาก card-funded txn ล่าสุดของ user) ก่อนอนุญาต erase เพราะ chargeback มาได้หลัง lot หมดอายุ + dispute ปิด (S6.1.5) — มิฉะนั้น CHARGEBACK posting จะไม่มี identity ให้เกาะ (S3.7 flag "ถามทนาย" อยู่แล้วว่าการคงโทเคนช่วง window เป็น legal-obligation exception)
3. **REBUILD-FROM-LEDGER ไม่พึ่ง PII:** replay ใช้ `seq` + account + funder_key + tombstone — ไม่ต้องการ raw identity → erasure ไม่ทำลาย replay determinism

---

### S6.2 Fraud-Detection Alerting Pipeline → Review Queue

> ต่อยอดจาก SYSTEM_PLAN §5.9 (8 anti-fraud layers) และ Spec A.8.12 (anti-self-redemption) / A.8.13 (Sybil cap) — section นี้ทำให้ signal เหล่านั้นไหลเข้า **review queue + scoring + auto-action** อย่างเป็นระบบ ไม่ใช่ ad-hoc

#### S6.2.1 สถาปัตยกรรม pipeline

```
   ┌──────────── เหตุการณ์สด (events) ────────────┐
   │ check_ins · redemptions · grants · payouts   │
   │ subscriptions · change_proposals · device log │
   │ cs_grant_goodwill · D7 quest-comp GRANT       │
   └──────────────────┬───────────────────────────┘
                      │  (Postgres trigger → fraud_signals INSERT; ไม่บล็อก hot path)
                      ▼
        ┌──────────────────────────────┐     ┌─────────────────────────┐
        │  Fraud Rule Engine (Edge Fn  │────►│  fraud_signals (append)  │
        │  + pg_cron batch สำหรับ graph)│     └─────────────────────────┘
        └──────────────┬───────────────┘
                       │  aggregate → score ต่อ entity (user/device/merchant/agent)
                       ▼
        ┌──────────────────────────────┐
        │  fraud_cases (review queue)   │── score ≥ soft → enqueue review
        │  + entity risk_score          │── score ≥ hard → auto-hold settlement / PAUSE
        └──────────────┬───────────────┘
                       ▼   Content Moderator + Finance/CS triage (Spec RBAC)
        ┌──────────────────────────────┐
        │  resolution: clear | confirm  │── confirm → suspend/ban + post recovery
        │  → feedback เข้า score weights │
        └──────────────────────────────┘
```

```sql
fraud_signals                   -- append-only; หนึ่ง detection ต่อแถว
  id uuid PK, signal_type enum, subject_type enum,  -- user|device|merchant|agent|redemption
  subject_id uuid, weight numeric, evidence_jsonb jsonb,
  ref_txn_id uuid NULL, ref_redemption_id uuid NULL, city_id uuid, created_at timestamptz

fraud_cases                     -- review queue (mutable status; signals immutable)
  id uuid PK, subject_type enum, subject_id uuid,
  risk_score numeric,           -- Σ weighted signals (decay ตามเวลา)
  state enum,                   -- open | in_review | confirmed_fraud | cleared | escalated
  auto_action enum,             -- none | settlement_held | payout_paused | grant_blocked
  assigned_to uuid NULL, opened_at, resolved_at, resolution_note,
  city_id uuid, retention_class 'governance_7y'
```

> **fraud_cases เป็น signal ให้ erasure gate ของ S3:** S6 ประกาศ interface ว่า S3.7 erasure eligibility ต้อง query `fraud_cases WHERE subject_id=user AND state IN ('open','in_review','escalated')` → ถ้ามี ห้าม erase (ตั้ง `ERASURE_BLOCKED` ภายใต้ legitimate-interest exception) และ **preserve spark_events/devices/raw-fraud-evidence** จนกว่า case ปิด — ปิดช่อง "erase หนี investigation" (review: auth major) S6 เป็นเจ้าของ state นี้จึงต้อง expose query นี้ให้ S3 อ่าน

#### S6.2.2 Detection rules + threshold + auto-action

| signal_type | สัญญาณ (concrete CM) | กลไกตรวจ | soft (review) | hard (auto-action) |
|---|---|---|---|---|
| **impossible_travel** | check-in นิมมาน→สันกำแพง ใน 4 นาที | speed ระหว่าง check-in ติดกัน > `IMPOSSIBLE_SPEED_KMH` (default 120 ในเมือง — config เดียว, ผูก check-in edge fn; resolve conflict 120-vs-200 km/h ใน SYSTEM_PLAN line 3340 ด้วยค่า config per-context) ผ่าน `device_id` | flag + ไม่นับ step | 3+ ครั้ง/วัน → block GRANT ของ user |
| **velocity_cap** | 50 แก้ว/ชม. ที่ร้านเดียว | redemption count ต่อ (user/device/quest/วัน) เกิน cap | throttle + flag | spike z-score > `VELOCITY_Z` → hold settlement |
| **multi_account_sybil** | 20 account ↔ 2 device (SYSTEM_PLAN Example C) | device-graph community detection (batch nightly): user↔device↔IP/BSSID↔payment instrument | ring ≥ 3 accounts/device → review | ring redeem จาก funder เดียว → freeze payout ของ ring |
| **merchant_self_redeem** | ร้าน X ปั๊ม redeem ดูด escrow คืน | A.8.12 gate ที่ redeem-time (funder==redeemer / same KYC/device/payment) + nightly residual check (A.8.12_resid, S6.1.3) | hit gate → route คืน funder/manual | pattern ยืนยัน → FROZEN payout+grant+redeem ของทั้ง identity-cluster + recovery |
| **agent_collusion** | agent เซ็นร้าน แล้วร้านนั้น redemption velocity ผิดปกติ | z-score redemption ของร้านที่ `sold_by_agent_id=A` เทียบ cohort ย่าน (Spec B.2.3) | flag → freeze freshness micro-bonus + commission ของ agent | confirmed → 90-day clawback (Spec B, txn `AGENT_CLAWBACK`) + ban agent |
| **new_account_instant_redeem** | สมัครเสร็จ redeem ทันที reward แพง | account_age < `MIN_AGE_FOR_HIGH_VALUE` + trust tier ต่ำกว่า reward | hold settlement | repeat → block |
| **referral_farming** | ปั๊ม referral ปลอม | referral ที่เพื่อนไม่มี verified visit ≥2 ใน 14 วัน (SYSTEM_PLAN §5.9 layer 6) | ไม่ vest Coin | ring → ban |
| **chargeback_after_redeem** | merchant chargeback หลัง R จ่ายไปแล้ว (Spec A.6(7)) | match PSP chargeback line ↔ redemption ที่ settle แล้ว | เปิด recovery case (`RECOVERY`) | auto: merchant → PAYOUT_FROZEN + receivable |
| **cs_grant_abuse** (D7 quest-comp) | CS post GRANT จริงให้ user อ้าง "quest ครบแต่ Coin ไม่มา" | นับ CS-initiated GRANT ต่อ user เข้า cap เดียวกับ goodwill + dispute-velocity z-score (S6.2.4) | hit cap/velocity → review | repeat/ring → block CS-grant + freeze funder GRANT scope |
| **identity_merge_launder** | funder ดูด Coin ออกผ่าน identity ที่ merge/recover (A.8.12 evasion) | re-score identity-graph เมื่อมี account link/recovery (S3.4/S3.6); cluster ที่รวม coin_lot/payout-bank ข้าม identity | flag → review + 24h cool-down block REDEEM/payout | cluster trips A.8.12 เป็น entity เดียว → freeze REDEEM ของ cluster |

- **Scoring:** `risk_score = Σ(weight × time_decay)` ต่อ entity; weight ปรับด้วย feedback loop (confirmed → ขึ้น, cleared → ลง) `platform_config.FRAUD_SOFT_THRESHOLD` / `FRAUD_HARD_THRESHOLD`
- **เชื่อมกับ freeze (S6.1.6):** hard threshold ของ `merchant_self_redeem`/`agent_collusion`/`identity_merge_launder` → `platform_freeze_state` freeze scope `identity-cluster` (ไม่ใช่แค่แถวเดียว) — **escrow-as-risk-cap** (SYSTEM_PLAN §5.9): ต่อให้หลุดทุกชั้น ความเสียหายสูงสุด = escrow ที่ funder นั้น prefund **ยกเว้น** D7 quest-comp ที่ดูด escrow funder จริง (ดู S6.2.4) ซึ่งต้อง cap แยก
- **PDPA:** identity-graph (device/IP/payment) เก็บภายใต้ **legitimate interest (anti-fraud)** + raw GPS ≤ 90 วัน (Spec C.4(f)); fraud_cases ใช้ `behavioral_short` retention ยกเว้นส่วนที่ผูก redemption FACT — **และ preserve ระหว่าง case เปิด** (override delete cascade, S6.2.1 note)

#### S6.2.3 Review queue SLA + ownership

| risk tier | owner (Spec RBAC) | SLA triage | action |
|---|---|---|---|
| hard (settlement held) | Finance/Payout + Content Moderator | ≤ 4 ชม. (เงินค้างจ่าย) | clear→release payout · confirm→recovery+ban |
| soft (review) | Content Moderator | ≤ 24 ชม. | clear / escalate |
| agent collusion | City/Regional Manager + Finance | ≤ 8 ชม. | freeze commission + clawback |
| identity merge / self-redeem cluster | DPO + Finance (dual control) | ≤ 4 ชม. | re-score identity-graph; clear→unfreeze REDEEM · confirm→ban cluster + recovery |

#### S6.2.4 COGS budget cap + CS-initiated GRANT enforcement (ปิด D7 quest-comp leak — critical)

> **ที่มา (review — support critical "D7 goodwill farming" + cross_gap "COGS caps enforced by nobody"):** D7 (lost/contested quest) ให้ CS post **GRANT จริง** หนุนด้วย **escrow ของ merchant/sponsor จริง** (ไม่ใช่ `platform_goodwill_budget`) → ถูก carve out จาก `GOODWILL_USER_CAP` และไม่ผ่าน gate `cs_grant_goodwill` → user+CS สมรู้ mint Coin หนุนด้วย escrow ของ funder บริสุทธิ์ ดูด escrow ต่ำกว่า reward cap ที่ pricing ล็อก และ **locked pricing lever (B.6/D.1116) "cap per-redemption reward value + cap redemptions/month per merchant" ไม่มีใครบังคับ**

S6 เป็นเจ้าของ **2 control ฝั่ง recon/freeze** (mint-gate precondition + nightly recon) ที่ทำให้ทุก mint path — flow ปกติ, goodwill, D7 quest-comp — อยู่ใต้ cap เดียวกัน:

1. **mint-gate precondition (ก่อน post GRANT, ทุก path รวม CS-initiated):** edge function ที่ post GRANT (รวม D7) ต้องอ่าน:
   - `cogs_budget_cap[merchant,month]` — ถ้า GRANT นี้จะทำให้ Σ(reward COGS บน escrow funder=merchant เดือนนี้) เกิน `REWARD_BUDGET_CAP` → **block + freeze GRANT scope ของ funder** (S6.1.6) เพราะ "funder ไม่ใช่เงินแพลตฟอร์มที่ CS แจกได้"
   - per-redemption reward cap — ถ้า reward value > `PER_REDEMPTION_REWARD_CAP` → block
2. **CS-initiated GRANT ต้องผ่าน gate เดียวกับ goodwill:** D7 "real GRANT" ต้อง (ก) นับเข้า dispute-velocity z-score + cap ต่อ user เหมือน goodwill; (ข) require **verifiable proof-of-completion** (geo_proof + timestamp ตรง quest step log) เป็น hard precondition — ไม่ใช่แค่ "มี spark_events"; (ค) **maker-checker dual-control** กับ CS-initiated GRANT ใด ๆ บน third-party funder **ทุกจำนวน** (funder ไม่ใช่แพลตฟอร์ม จึงไม่เคยเป็น "เงินที่แจกฟรีได้")
3. **nightly recon `cogs_budget_cap`** (S6.1.3): ตรวจย้อนว่าไม่มี merchant/sponsor ไหนทะลุ monthly budget cap — break → PAUSE GRANT(merchant) + เปิด case

> หมายเหตุ enforcement: control (1)–(2) เป็น precondition ที่ edge fn บังคับ; S6 เป็นเจ้าของ (3) recon + freeze read-model ที่ทำให้ทะลุ cap จับได้แม้ precondition ถูก bypass (defense-in-depth)

#### S6.2.5 platform_goodwill_budget — solvency visibility (conditional, ปิด goodwill float — major)

> **ที่มา (review — support major):** S1.3 เพิ่ม `platform_goodwill_budget` (Liability ใหม่, pre-fund โดย Finance) แต่ S6.1.3 invariant set เดิม **ไม่เคยกล่าวถึงมัน** → ถ้า per-grant `settled_available` check มี race หรือ Finance under-fund, goodwill Coin ถูก mint บน budget ติดลบ โดย **ไม่มี invariant freeze** และ aggregate A.8.2s อาจ "pass" เพราะ funder อื่น over-collateralized (ซ่อน goodwill insolvency)

**สถานะ canonical:** `platform_goodwill_budget` + txn `GRANT_GOODWILL_FUND` **ยังไม่อยู่ใน canonical CoA/txn_type** (canonical ledger doc ไม่มี goodwill เลย) → เป็น primitive ที่ S1 เสนอ ต้องผ่าน **founder/canonical-change + BoT e-money/anti-self-redemption (A.8.12) legal sign-off** ก่อน (goodwill = platform-funded Coin redeemable ทุกร้าน — ขอบ e-money ต้องเคาะ ไม่ใช่ assert ลอย ๆ ว่า "goodwill ไม่ trip A.8.12")

**S6 enforcement (conditional — บังคับทันทีที่ goodwill ถูก ratify):**

1. **เพิ่ม `platform_goodwill_budget` เป็น funder line ใน A.8.5:** `funder='platform:goodwill'` — `coin_backing(funder=platform:goodwill)[THB] == live goodwill coin_liability[COIN]` (per city)
2. **เพิ่มเข้า A.8.2s RHS เป็น funder line แยก** (ไม่ปนกับ funder อื่น เพื่อไม่ให้ over-collateralization ของ funder อื่นซ่อน goodwill insolvency)
3. **invariant `goodwill_backing`** (S6.1.3): `balance(platform_goodwill_budget[city]) ≥ 0 AND settled-backed` → BREAK → freeze GRANT(goodwill) ต่อ city
4. **ปิด race:** per-grant `settled_available` check ต้องเป็น `SELECT … FOR UPDATE` บนแถว budget (กัน 2 CS-grant พร้อมกันอ่าน balance ก่อน race เดียวกัน)
5. **per-city goodwill budget ceiling** ไม่ใช่แค่ per-user/per-CS cap

#### S6.2.6 Anti-self-redemption ↔ identity merge (A.8.12 e-money boundary — critical, S6 re-score ownership)

> **ที่มา (review — auth critical "real→real account absorption / laundering"):** A.8.12 key บน funder==redeemer / same KYC/device/payment → laundering play: funder คุม account X (ถือ Coin ที่ self-redeem ไม่ได้) → link/recover เข้า account Y บน clean device → redeem ที่ Y → re-point redeemer identity ทำลาย same-KYC/device check ไม่มี flow merge real→real ที่นิยามไว้

**S6 enforcement (ฝั่ง identity-graph re-score — owns A.8.12 residual recon):**

- **ห้าม real→real merge สำหรับ account ที่เคยถือ `coin_lot` หรือ payout bank** (จุดยืนเดียวกับ "guest ถือ Coin ไม่ได้") — consolidation ถูกห้ามโดย design ฝั่ง S3
- **กรณี duplicate identity ที่ legit:** require DPO+Finance dual control และ **S6 ต้อง re-score A.8.12 identity-graph edge ข้าม source+target ก่อนอนุญาต REDEEM ใด ๆ ถัดไป** (merge เขียน edge เข้า identity-graph §5 ให้ cluster ที่รวมแล้ว trip self-redemption เป็น entity เดียว) + 24h cool-down block REDEEM/payout หลัง identity link (S3.4) — recovery (S3.6) เข้า account ที่ถือ Coin/escrow ต้อง human review อยู่แล้ว → ขยายให้ **block REDEEM จนกว่า identity-graph re-score เสร็จ** (signal `identity_merge_launder`, S6.2.2)

---

### S6.3 SLOs, Error Monitoring & Money/Health Dashboards

#### S6.3.1 SLO targets (เรียงตามผลกระทบต่อเงิน)

| service / journey | SLI | SLO target | error budget | ทำไมระดับนี้ |
|---|---|---|---|---|
| **`redeem` edge fn** | success rate (เผา Coin สำเร็จ + settle) | **99.9%** | 43 นาที/เดือน | redemption fail = ลูกค้ายืนหน้าร้าน Coin หาย = trust ตาย |
| `redeem` latency | p95 | < 800 ms | — | merchant + ลูกค้ารอที่เคาน์เตอร์ |
| **`grant` edge fn** | success (mint หลังทำ quest ครบ) | 99.5% | — | quest สำเร็จแต่ไม่ได้ Coin = churn |
| **`prefund`/`psp_settle`** | success | 99.5% | — | เงิน merchant ค้าง = หยุดทั้ง flywheel |
| **reconciliation job** | nightly run completion ก่อน 06:00 | **100%** (ต้องรันทุกคืน) | 0 | คืนที่ไม่ reconcile = blind ต่อ insolvency |
| **`payout` batch** | จ่ายตรง schedule | 99% | — | merchant payout backlog = ความไม่พอใจ |
| LINE/PSP webhook ingestion | processed < 5 นาที | 99% | — | settlement/notification delay |
| Auth / RLS availability | uptime | 99.9% | — | ทั้งระบบพึ่ง Supabase Auth |

#### S6.3.2 Error monitoring stack (concrete tools)

- **Sentry** (Flutter consumer + agent mode + Edge Functions): crash, unhandled exception, edge-fn error rate; **alert rule:** `redeem` error rate > 0.1% ใน 5 นาที → page; `grant`/`payout` error spike → Slack/LINE on-call
- **PostHog** (product analytics + funnel): redemption funnel (scan QR → burn → settle), quest-completion funnel, drop-off — แยกตาม audience (TH-nomad / Western / Chinese FIT) และ locale (TH/EN/ZH); session replay เปิดเฉพาะ non-PII (mask location/PII ตาม PDPA)
- **Supabase / Postgres metrics** → Grafana: connection pool, slow query, `pg_cron` job health, RLS denial rate (spike = อาจมี attack หรือ bug)
- **Synthetic probe** (uptime canary): จำลอง redeem/grant ทุก 5 นาทีบน test merchant ในแต่ละ city — จับ outage ก่อน user
- **PII scrubbing ก่อนส่งออก:** Sentry/PostHog **ต้อง scrub** precise location, KYC, payment instrument, email/phone ก่อน leave region (PDPA + Spec C.4) — ใช้ `beforeSend` hook + server-side proxy; เก็บแค่ `ip_coarse` (ตรง audit_log convention)

#### S6.3.3 Money / Health dashboards (4 บอร์ดหลัก — Finance/Owner/DPO)

| dashboard | metric (real-time จาก ledger) | ใครดู | alert บน |
|---|---|---|---|
| **1. Solvency & Escrow Exposure** | `HAVE − REQUIRED` ต่อ city (S6.1.4 buffer, สูตร canonical แคบ); `SUM(merchant_escrow available)`; `SUM(coin_backing live)` ต่อ funder (รวม `platform:goodwill` ถ้า ratify) | Finance, Owner | buffer < `SOLVENCY_BUFFER_MIN` → page |
| **2. Outstanding Coin Liability** | `balance(coin_liability)` ต่อ city (real-time, Spec A.5); แยก funder; กราฟ mint vs burn vs expire; aging ของ lot ใกล้หมดอายุ | Finance, Owner | liability โตเร็วผิดปกติ |
| **3. Redemption Health** | redemption success rate (SLO); velocity heatmap ต่อย่าน (นิมมาน/ช้างม่อย/เมืองเก่า); flagged/held count; take-rate revenue; **per-merchant monthly reward-COGS vs budget cap** | Owner, Analyst | success < 99.9%; flagged spike; COGS เข้าใกล้ cap |
| **4. Payout Backlog & PSP + Tax** | payout queue depth + aging; PSP unmatched settlement lines; chargeback rate; `merchant_receivable` exposure vs reserve; **`merchant_payable`/`wht_payable`/`vat_output_payable` outstanding** (ภาระจ่ายในอนาคต — เฝ้าแยกจาก solvency anchor ไม่ยัดเข้า A.8.2s) | Finance/Payout | backlog > N; receivable > reserve; payable เคลื่อนผิด |

> Dashboard ทุกตัว **derive จาก ledger/recon ไม่ใช่ cache อิสระ** — "Live liability tracking" (SYSTEM_PLAN 4.x) = `balance(coin_liability)` real-time ต่อ city/merchant; Finance เห็น exposure ทุกวินาที (Spec A.5)

#### S6.3.4 On-call

- **Tier-1 (money-critical, page ทันที 24/7):** A.8.2s break, ledger FROZEN, `redeem` SLO burn, reconciliation job fail, cogs_budget_cap break, goodwill_backing break, A.8.12 cluster freeze — paging ผ่าน PagerDuty/Opsgenie + LINE บอท
- **Tier-2 (business hours):** cache drift WARN, fraud soft queue, PSP unmatched, A.6.9 random-noise WARN
- **Escalation:** Tier-1 ไม่ ack ใน 15 นาที → escalate Platform Owner; financial freeze → Finance lead + Owner เสมอ
- **Runbook ผูกกับ alert:** ทุก Tier-1 alert มี link ไป runbook (freeze diagnose S6.1.7, DR S6.6) — ลด MTTR

---

### S6.4 Audit-Log Integrity (Append-only, Tamper-Evident)

> ต่อยอด SYSTEM_PLAN `audit_log` (group H, มี `seq bigserial`, `before/after jsonb`, `ip_coarse`) — section นี้เพิ่ม **tamper-evidence** (พิสูจน์ได้ว่าไม่มีใครแก้/ลบย้อนหลัง) ซึ่งจำเป็นทั้งต่อ fraud investigation และ auditor/PDPC

#### S6.4.1 สองชั้นของ "ความจริงที่แก้ไม่ได้"

1. **Financial truth = `ledger_entries`** (Spec A.8.9): append-only ด้วย `REVOKE UPDATE/DELETE` + BEFORE UPDATE/DELETE trigger ที่ `RAISE EXCEPTION` + `seq bigserial` — แก้ได้แค่ post reversal ด้วย canonical txn_type นี่คือหลักฐานการเงินหลัก
2. **Action truth = `audit_log`**: ทุก action ที่กระทบเงิน/ข้อมูล/สิทธิ์ (`redemption.settle`, `role.grant`, `payout.approve`, `freeze.release`, `consent.revoke`, `pii.export`, `bank_change.approve`, `breach.notice.emit`)

#### S6.4.2 Tamper-evidence: hash chain

ปัญหา: append-only ป้องกัน UPDATE/DELETE ผ่าน app ได้ แต่ **DBA ที่มีสิทธิ์ superuser อาจแก้ row ตรง ๆ** — ต้องทำให้ "การแก้ย้อนหลังตรวจจับได้"

```sql
audit_log  (เพิ่มจาก SYSTEM_PLAN base)
  ... (id, seq, actor_user_id, actor_role, action, entity_type/id, before/after, city_id, ip_coarse, at) ...
  prev_hash      bytea NOT NULL    -- hash ของแถวก่อนหน้า (ตาม seq) ในเมือง/สาย เดียวกัน
  row_hash       bytea NOT NULL    -- SHA-256(seq‖actor‖action‖entity‖before‖after‖at‖prev_hash)
  -- INSERT trigger คำนวณ row_hash = sha256(canonical_json(this) || prev_hash); chain ต่อเนื่อง
```

- **Hash chain:** แต่ละแถวผูก hash ของแถวก่อน → แก้แถวกลางสายทำให้ทุก hash หลังจากนั้นเพี้ยน → **verifier job (nightly)** เดิน chain ตรวจ `row_hash` ทุกแถว ถ้าขาด/เพี้ยน = **page DPO + Owner + freeze export** (อาจมี insider tampering)
- **External anchoring (low-cost):** ทุกวัน publish `row_hash` ของแถวสุดท้าย (daily checkpoint) ไปที่ **append-only external store นอก region** (object storage แยกบัญชี + write-once / S3 Object Lock) หรือ commit ลง git repo ภายใน — ทำให้แม้ DBA แก้ทั้ง chain ก็ยังขัดกับ checkpoint ภายนอกที่ลงเวลาไว้แล้ว (poor-man's notarization โดยไม่ต้องใช้ blockchain)
- **Separation of duties บน log:** ไม่มี application role เขียน `audit_log` ได้นอกจากผ่าน trigger ที่ระบบ post; DBA ที่ลบ log ทิ้ง chain จะขาด = ตรวจเจอ
- **Reconcile audit ↔ ledger (รองรับ tombstone):** nightly cross-check — ทุก `redemption.settle`/`payout.approve` ใน `audit_log` ต้องมี `ledger_transactions` คู่ และกลับกัน (financial txn ทุกอันมี audit action) drift = WARN→investigate **โดย cross-check ปฏิบัติต่อ tombstone `erased:<hash>` เป็น valid subject counterpart** (S6.1.8) — erasure ไม่ทำให้ reconcile flag false break
- **High-impact action ต้อง dual-control + audited (ผูก review findings):** action ต่อไปนี้ต้อง log แบบ tamper-evident + บังคับ SoD/dual-control ที่ S6 ตรวจ cross-check ได้: (ก) `freeze.release` (S6.1.7); (ข) `bank_change.approve` ↔ `payout.batch.create` — **ผู้ approve bank change ของ payee ภายใน cool-down (24–72h) ต้องไม่ใช่ผู้ create/approve batch ที่จ่าย payee นั้น** (ปิด payout SoD bypass — review payout critical; constraint join `audit_log` ↔ `payout_batches`); (ค) `breach.notice.emit` — ต้องมาจาก privileged path เดียว (DPO console/incident-runbook role) + two-person + step-up (ปิด breach-broadcast phishing — review notification major; S6 ฝั่ง audit/on-call เฝ้าว่า emit มาจาก path ที่ถูก ไม่ใช่ outbox producer ทั่วไป)

---

### S6.5 Backup, PITR & Ledger Replay/Rebuild

#### S6.5.1 Backup tiers

| tier | กลไก | ความถี่ | retention | ใช้เมื่อ |
|---|---|---|---|---|
| **PITR (continuous WAL)** | Supabase Point-in-Time Recovery (WAL archiving) | ต่อเนื่อง (วินาที) | 7–28 วัน (ตาม Supabase plan; **ตั้ง ≥ 14 วัน** สำหรับ financial) | กู้ถึงวินาทีก่อน incident (เช่น bad migration, mass delete) |
| **Daily logical snapshot** | `pg_dump` ของ financial schema (ledger_*, accounts, coin_lots, escrow_*, recon_*, audit_log) → encrypted object storage | รายวัน | **7 ปี** (tax retention, Spec C.3 `tax_7y`) | long-term audit + rebuild base |
| **Cross-region replica** | logical replication / encrypted snapshot copy → region สำรอง (DR, S6.6) | near-real-time / รายชั่วโมง | 30 วัน | region outage failover |
| **Weekly cold archive** | snapshot → cold storage แยกบัญชี (immutable / object-lock) | รายสัปดาห์ | 7 ปี | ransomware / catastrophic + tamper-proof |

- **เข้ารหัสทุก backup at rest** (PDPA Spec C.4: location/KYC encryption at rest) + key แยกจาก data plane; restore test **อย่างน้อยรายไตรมาส** (backup ที่ restore ไม่ได้ = ไม่มี backup)
- **Backup ของ `ledger_entries` คือ canonical** — เพราะทุก balance/cache rebuild จากมันได้ (Spec A.0 #1)

#### S6.5.2 Ledger Replay / Rebuild — จุดแข็งของ append-only design

หัวใจ: **ทุก materialized balance และ cache rebuild ได้ 100% จาก `ledger_entries` เรียงตาม `seq`** (Spec A.2: "`seq bigserial` = ลำดับเขียนสากล ใช้ replay/rebuild ทุก materialized balance ได้") ดังนั้นแม้ cache เสียหายหรือ corrupt ทั้งหมด เรา **ไม่สูญเสียความจริงทางการเงิน** ตราบใดที่ `ledger_entries` ยังอยู่

**Procedure: REBUILD-FROM-LEDGER (documented runbook)**

```
INPUT : ledger_transactions + ledger_entries (trusted, append-only) ถึง seq = S_target
OUTPUT: coin_lots, escrow_wallets, escrow_locks, spark_balances ที่ถูกต้อง ณ S_target

ขั้นที่ 0  ตรวจ ledger integrity ก่อน rebuild:
           - A.8.1/A.8.2: ∀ txn,c SUM(DR)=SUM(CR); ∀c SUM(DR)−SUM(CR)=0 ทั่ว ledger
           - audit hash-chain (S6.4.2) valid
           ถ้าไม่ผ่าน → STOP, ใช้ PITR ก่อน (ledger เองอาจ corrupt)
ขั้นที่ 1  สร้าง cache ตารางเปล่าใน schema staging
ขั้นที่ 2  REPLAY ตาม seq ASC (deterministic; ใช้ seq+account+funder_key+tombstone, ไม่พึ่ง raw PII):
           coin_lots:       per lot_id → granted=Σ(GRANT credit), remaining=granted−Σ(burn legs),
                            state จาก remaining/expiry/reversal
           escrow_wallets:  total=balance(escrow acct); settled_total=Σ(legs ที่ทุน landed via PSP_SETTLE);
                            locked=Σ(coin_backing+quest reservation); available/settled_available derived
           escrow_locks:    จาก coin_backing legs (lot live) + quest_pool reservations ที่ยัง active
           spark_balances:  Σ(spark_events.delta) ต่อ user (แยก ledger, Spec A.4)
ขั้นที่ 3  VERIFY: เทียบ staging vs production cache → diff report (ถ้า rebuild เพื่อ repair drift)
ขั้นที่ 4  CUTOVER: atomic swap staging→production ภายใต้ maintenance window (PAUSED state, S6.1.6)
ขั้นที่ 5  POST-VERIFY: รัน recon_runs(run_type='post_freeze_verify') → ต้อง pass ก่อนปลด PAUSED
```

- **Deterministic:** ลำดับ `seq` รับประกัน replay เดิมให้ผลเดิม — ทดสอบได้ใน CI (replay snapshot → ผล cache ต้องตรง golden)
- **Partial rebuild:** rebuild ได้เฉพาะ funder/city/lot ที่ drift (A.8.6 WARN) โดยไม่ต้องทั้งระบบ — เร็วและไม่ต้อง full freeze
- **เป็น recovery path ของ A.8.6 break:** cache drift → rebuild (ไม่แตะ ledger) → re-verify; ledger ไม่เคยถูกแก้
- **Erasure-safe:** replay ไม่พึ่ง PII (ใช้ tombstone token) → user ที่ erase แล้วยัง rebuild ได้ครบ (S6.1.8)

#### S6.5.3 ความสัมพันธ์ PITR vs Replay

- **Cache เสีย, ledger ดี** → ใช้ **Replay (S6.5.2)** — เร็ว, ไม่เสีย txn ที่เกิดหลัง backup
- **Ledger เสีย/corrupt (เช่น bad migration ที่ทะลุ append-only)** → ใช้ **PITR** กู้ถึงก่อน incident แล้ว replay txn ที่ valid หลังจากนั้นจาก source (PSP webhook log, idempotency keys) — `idempotency_key` + `request_hash` (Spec A.8.8) ทำให้ re-apply ได้โดยไม่ double-post

---

### S6.6 Disaster Recovery — Supabase Singapore Region Outage

> Spec C.4(g) + C.7 + D.3.2 ล็อกว่า: launch บน **Supabase Singapore** + **region-portable architecture ตั้งแต่ต้น** + DPA + s.29 SCC + encryption — section นี้ทำให้ "region-portable" เป็น runbook จริง

#### S6.6.1 RPO / RTO targets (แยกตามความสำคัญของข้อมูล)

| data class | RPO (ข้อมูลที่ยอมเสีย) | RTO (เวลากู้คืน) | เหตุผล |
|---|---|---|---|
| **Financial ledger** (`ledger_*`, `accounts`, `coin_lots`, `escrow_*`, `audit_log`) | **≈ 0** (near-zero; ≤ วินาทีจาก WAL/replica) | **≤ 4 ชม.** | เงินจริง — เสีย txn = เสียเงิน/หนี้ที่กฎหมายต้องเก็บ 7 ปี |
| **Recon/freeze state** (`recon_runs`, `freeze_events`, `platform_freeze_state`) | ≤ 1 นาที | ≤ 4 ชม. | ต้องรู้สถานะ solvency/freeze ตอน failover |
| **Operational** (places, deals, quests, check_ins) | ≤ 5 นาที | ≤ 8 ชม. | กระทบ UX ไม่กระทบเงิน |
| **Behavioral/analytics** (raw GPS, PostHog) | ≤ 1 ชม. | best-effort | minimize อยู่แล้ว (Spec C.4(f)) เสียได้บางส่วน |

> **คำตัดสิน RPO financial = near-zero:** ledger ห้ามเสีย txn — ใช้ **synchronous-ish replication ของ WAL ไป cross-region replica** + PSP webhook เป็น replay source สำรอง ถ้า replica ตามไม่ทันตอน outage เราใช้ idempotency key reconcile กลับได้ (A.8.8)

#### S6.6.2 DR topology (region-portable)

```
        ┌────────────────────── PRIMARY: Supabase Singapore ──────────────────────┐
        │  Postgres (ledger source of truth) · Auth · Edge Fn · Storage · PostGIS  │
        └───────────┬──────────────────────────────────────────┬──────────────────┘
                    │ continuous WAL / logical replication       │ encrypted snapshot
                    ▼                                            ▼
        ┌──────────────────────────┐              ┌──────────────────────────────┐
        │ WARM STANDBY (region สำรอง)│              │ Cold archive (object-lock,    │
        │ Postgres replica (read)   │              │ แยกบัญชี, 7y, tamper-proof)    │
        │ + Edge Fn deployable      │              └──────────────────────────────┘
        └──────────────────────────┘
   External anchors (นอก region): bank/PSP statement (S6.1.5) + audit checkpoint (S6.4.2)
   → เป็น "ground truth" ที่ทำให้ reconcile ledger หลัง failover ได้
```

- **Region-portable หมายถึง:** schema/migration/Edge Function/RLS เป็น **IaC (declarative, ใน git)** — deploy ซ้ำใน region ใหม่ได้จาก code; ไม่มี hard-coded region endpoint (ผ่าน config); object storage/CDN media replicate ข้าม region
- **ทางเลือก region สำรอง (Spec D.3.2 รอ legal):** Supabase region อื่น (เช่น สำรองใน APAC) หรือ phase ย้าย financial data in-Thailand เมื่อ legal เคาะ cloud-exception — สถาปัตยกรรมรองรับทั้งสอง เพราะ portable

#### S6.6.3 Failover runbook (SG outage)

```
DETECT   synthetic probe + Supabase status + health check ล้มต่อเนื่อง > 5 นาที → DR incident
DECIDE   Platform Owner + Finance lead ประกาศ failover (two-person; ไม่ auto เพราะ split-brain risk)
ENTER PAUSED   ตั้ง platform_freeze_state(global) = PAUSE GRANT/PAYOUT ทันที
               (ระหว่าง failover ห้าม mint/จ่ายเงินจริงจน reconcile เสร็จ — กัน double-pay)
PROMOTE  promote warm standby เป็น primary (read-write); re-point Edge Fn + Auth + app config
RECONCILE หลัง promote: รัน recon_runs(post_freeze_verify) เทียบ ledger replica vs
          external anchor (bank/PSP statement + audit checkpoint) → ยืนยันไม่มี txn หาย/ซ้ำ
REPLAY GAP ถ้า replica ตามไม่ทัน (RPO gap): replay จาก PSP webhook log + idempotency keys
           (A.8.8 กัน double-post) จนกว่า A.8.2s pass
RELEASE  เมื่อ recon = pass + two-person + step-up MFA → ปลด PAUSED → NORMAL
COMMS    แจ้ง merchant/user ผ่าน LINE + in-app (TH/EN/ZH); ถ้า outage กระทบ PII availability
          ประเมินว่าเข้าเกณฑ์ breach notification หรือไม่ (S6.6.4)
          — broadcast ต้องผ่าน privileged path + two-person (S6.4.2), ไม่ใช่ outbox producer ทั่วไป
```

> **ทำไม PAUSED ระหว่าง failover ไม่ FROZEN:** REDEEM ของ Coin ที่ออกแล้วควร honor ต่อถ้า burn-path บน standby ปลอดภัย (consumer protection) — แต่ **GRANT/PAYOUT หยุด** เพราะ mint บนเงินที่ยัง reconcile ไม่เสร็จ = เสี่ยงละเมิด Spec A #4 (no float) ถ้า standby มีสัญญาณ corrupt → ยก FROZEN

#### S6.6.4 Business continuity + ผูกกับ breach runbook

- **Degraded mode:** ถ้า primary down แต่ standby ยังไม่พร้อม → app เข้า **read-only/offline mode**; merchant ใช้ **offline provisional capture** (Spec A.10.2: signed voucher + nonce + grace token) → reconcile + post REDEEM จริงเมื่อ region กลับมา — ระบบ honor outstanding nonce ภายใน `provisional_grace_until` แม้ EXPIRE cron จะ sweep (Spec A.10.2)
- **DR ≠ breach อัตโนมัติ:** region outage = availability incident; เป็น **personal-data breach** ก็ต่อเมื่อมี confidentiality/integrity loss ของ PII → เข้า **tiered breach runbook (Spec C.4(d), D.3.6):** ใช้ risk-tier classifier (no-risk / risk / high-risk), เส้นทาง 72 ชม. ปกติ + **15-day extension valve** พร้อม justification, **ไม่แจ้ง PDPC ถ้า no-risk** — **อย่า engineer hard 72h SLA ตายตัว** (Spec ล็อกจุดยืนนี้; consistent กับ S1.6/S2.4/S5.3.3)
- **Breach broadcast = controlled primitive:** การยิง breach.notice (consent/quiet-hours/frequency-cap bypass, fan-out SMS/email/push) ต้องผ่าน privileged path เดียว + two-person + step-up + deep-link domain allow-list + per-incident send budget + kill-switch (ดู S6.4.2; ปิด review notification finding ฝั่งที่ S6 ตรวจ audit ได้)
- **DR drill:** ซ้อม failover เต็มรูปแบบ **รายครึ่งปี** + restore-test รายไตรมาส → จับ config drift, วัด RTO จริง, ฝึก two-person decision

---

### S6.7 Migration #1 — สิ่งที่ทีม dev สร้างใน S6 (checklist)

1. **ตาราง:** `recon_runs`, `recon_check_results`, `psp_settlement_lines`, `bank_statement_lines`, `freeze_events`, `platform_freeze_state`, `fraud_signals`, `fraud_cases`; เพิ่มคอลัมน์ `prev_hash`/`row_hash` ใน `audit_log`
2. **Reconciliation engine (pg_cron + Edge Fn):** nightly_full (A.8.1/1b/2/2s/3/4/5/6/7/11 + A.6.9 drift + A.8.12 residual + **cogs_budget_cap + wht_recon + vat_revenue_recon + goodwill_backing[conditional]**, REPEATABLE READ + pin `ledger_high_seq`) · intraday_solvency (A.8.2s **สูตร canonical แคบ** รายชั่วโมง) · post_freeze_verify · **account-set enumeration ครอบคลุม canonical CoA + pending-ratification accounts** (S6.1.1 note)
3. **External ingestion:** bank statement import + PSP settlement match (NET, ต่อ psp_key) → trigger canonical `PSP_SETTLE`/`CHARGEBACK`; unmatched > T+2 alert; chargeback-window tracking (120–180d) ป้อน erasure gate (S6.1.8)
4. **Freeze enforcement:** edge function ทุกตัว (`grant`/`redeem`/`payout`/`prefund`) อ่าน `platform_freeze_state` เป็น precondition (เหมือน mint-gating) + **mint-gate อ่าน cogs_budget_cap + per-redemption reward cap ก่อน post GRANT ทุก path รวม D7/CS-initiated** (S6.2.4); release flow = two-person + step-up MFA; **freeze ทุก loss-bearing condition fail-closed** (S6.1.6)
5. **Fraud pipeline:** triggers → `fraud_signals`; nightly graph batch (device/identity community detection + identity-merge re-score, S6.2.6); scoring + soft/hard threshold → review queue + auto-hold (freeze ทั้ง identity-cluster ไม่ใช่แถวเดียว); **expose `fraud_cases` open-state query ให้ S3 erasure gate** (S6.2.1)
6. **Observability:** Sentry (Flutter + Edge Fn) + PostHog (funnel, PII-scrubbed `beforeSend`) + Grafana (Postgres/pg_cron); synthetic probe ต่อ city; 4 money dashboards (derive จาก ledger; รวม COGS-vs-cap + payable/tax board)
7. **Audit integrity:** hash-chain trigger บน `audit_log` + nightly chain verifier + daily external checkpoint (object-lock นอก region); audit↔ledger cross-check รองรับ tombstone; **SoD cross-check: bank_change.approve ↔ batch.create ห้าม actor เดียว ภายใน cool-down** (S6.4.2); **breach.notice.emit จาก privileged path + two-person เท่านั้น**
8. **Backup/DR:** PITR ≥ 14 วัน; daily encrypted financial snapshot (7y); cross-region replica; **REBUILD-FROM-LEDGER runbook** (deterministic, erasure-safe, CI-tested); DR failover runbook + half-yearly drill + quarterly restore test
9. **Config (`platform_config`):** `RECON_TOLERANCE_SATANG`, `SOLVENCY_BUFFER_MIN`, `IMPOSSIBLE_SPEED_KMH`, `VELOCITY_Z`, `FRAUD_SOFT/HARD_THRESHOLD`, `SAME_USER_REDEEM_CAP`, **`REWARD_BUDGET_CAP[merchant,month]`, `PER_REDEMPTION_REWARD_CAP`, `A6_9_BIAS_DAYS` (sign-test window), `BANK_CHANGE_COOLDOWN_HOURS`, `CHARGEBACK_WINDOW_DAYS`, `GOODWILL_CITY_CEILING`[conditional]**, RPO/RTO targets

---

### S6.8 การตัดสินใจที่ต้องเจ้าของ/Finance เคาะ (S6-specific)

1. **ขนาด funded bad-debt reserve** (Spec A.8.4/D.1) — `SUM(merchant_receivable)` ที่จะ trigger global GRANT-pause = เท่าไร? 👉 _แนะนำ default:_ reserve = max(1% ของ outstanding coin_liability, 50,000฿) ต่อ city; **WARN ที่ 70%, auto-PAUSE GRANT(new credit) ที่ 100%** (เปลี่ยนจาก WARN-only — founder ตัดสิน "ขนาด reserve" ไม่ใช่ "จะ freeze ไหม") — ทบทวนรายไตรมาสจาก chargeback rate จริง
2. **`recon_tolerance` ภายนอก** — bank/PSP statement rounding ยอมกี่บาท? 👉 _แนะนำ:_ internal (A.8.1/A.8.5) = **0 satang เด็ดขาด**; external bank/PSP = **100 satang (1฿)** WARN, > 1,000 satang BREAK
3. **External audit-anchor mechanism** — object-lock storage vs git-commit vs 3rd-party notary สำหรับ daily checkpoint 👉 _แนะนำ:_ เริ่มด้วย **object-lock (S3-compatible) แยกบัญชี/แยก region**; ยกระดับเป็น notary ถ้า auditor ต้องการ
4. **Region สำรองของ DR** (Spec D.3.2 รอ legal) — Supabase APAC อื่น vs in-Thailand สำหรับ financial 👉 _แนะนำ:_ launch SG + warm standby APAC region อื่น; phase financial data in-Thailand เมื่อ legal เคาะ cloud-exception
5. **PITR window** — Supabase plan ให้ 7 วัน, financial ควร ≥ 14 👉 _แนะนำ:_ อัป plan/ตั้ง WAL retention ≥ 14 วัน + daily snapshot 7 ปีชดเชยช่วงยาว
6. **Freeze severity matrix sign-off** — ตาราง S6.1.6 (อะไร PAUSE vs FROZEN) ต้องให้ Finance + Owner เซ็นรับก่อน go-live เพราะ false-freeze = หยุดรายได้, under-freeze = ปล่อย loss ไหลต่อ
7. **Per-merchant COGS budget cap sizing** (locked pricing lever B.6/D.1116) — `REWARD_BUDGET_CAP[merchant,month]` + `PER_REDEMPTION_REWARD_CAP` = เท่าไร? 👉 _แนะนำ:_ ตั้งจาก break-even incrementality ~46% (canonical B.5/B.6) ต่อ tier ของร้าน; cap redemptions/เดือน + เพดานมูลค่ารางวัล/redemption — เป็น **blocking** ก่อน enable D7/CS-initiated GRANT (มิฉะนั้น escrow ของ funder ถูกดูดต่ำกว่า cap)
8. **Goodwill ratification (ขึ้นกับ S1/founder)** — `platform_goodwill_budget` + `GRANT_GOODWILL_FUND` ยังไม่ canonical 👉 _คำตัดสิน S6:_ ถ้า ratify ต้องผ่าน **BoT e-money/A.8.12 legal sign-off** ก่อน + S6 เปิด invariant `goodwill_backing` + funder line ใน A.8.5/A.8.2s + per-city ceiling + `FOR UPDATE` race-fix ทันที (S6.2.5); ถ้าไม่ ratify ให้ route goodwill ผ่าน funder canonical ที่มีอยู่ (sponsor/merchant escrow)
9. **Chargeback window สำหรับ erasure gate** — ยืนยันกับทนายว่า การคงโทเคน financial-attribution (`erased:<hash>`) ช่วง chargeback window (120–180d) เป็น legal-obligation exception ที่ทำได้ (S3.7 flag "ถามทนาย" อยู่แล้ว) 👉 _แนะนำ:_ block erase จน window ผ่าน + คงโทเคน non-PII ตลอด

---

## ภาคผนวก: ความเสี่ยงคงเหลือต่อระบบ

### S1 Support/Dispute
- REJECTED FINDING (พร้อมหลักฐาน): review อ้าง RECOVERY/WRITE_OFF 'ไม่ใช่ canonical' — ปฏิเสธ เพราะ locked A.7 ระบุทั้งสองเป็น txn_type จริง (RECOVERY: Dr bank_settlement/Cr merchant_receivable ; WRITE_OFF: Dr bad_debt_expense/Cr merchant_receivable) และ A.6(7) อ้างถึงตรง ; ยอมรับเฉพาะส่วน ownership ของ lifecycle merchant_receivable->RECOVERY->WRITE_OFF ที่ defer ไป S4/S6
- goodwill funder ใช้ sponsor_budget partition 'sponsor:platform_goodwill' เป็น build-ready workaround — ถ้า founder/Finance ต้องการ dedicated account platform_goodwill_budget แยกจริง ต้องผ่าน canonical-change decision (เพิ่มใน A.1 + update S6 invariant enumeration + A.8.2s RHS + A.8.5) ก่อน ; ยังต้อง BoT/e-money legal review ว่า platform-funded user Coin (redeemable any merchant) ไม่ trip A.8.12 boundary — เป็นการ assert ที่ต้อง sign-off ไม่ใช่ self-evident
- cross-subsystem enforcement หลายจุดของ S1 พึ่ง spec ข้างเคียงที่ต้องสร้างให้ครบ: (a) S4 merchant-settlement reversal สำหรับ merchant_payable clawback ที่ถูก payout แล้ว ; (b) S4 SoD constraint ข้าม bank-change<->payout_batch ; (c) S4 VAT-reversal+credit-note บน REFUND ; (d) S3 erasure gate ที่เรียก cs_open_obligations + chargeback-window ; (e) S6 freeze invariant บน sponsor:platform_goodwill partition — ถ้า spec เหล่านี้ไม่ implement ตาม contract S1 จะมี gate ที่ประกาศไว้แต่ไม่มีคนบังคับ
- per-merchant monthly COGS budget cap (PRICING locked) ถูกอ้างเป็น precondition บน CS-initiated GRANT แต่ตัวเลข cap จริงและ owner ของ enforcement ฝั่ง mint-gate (GRANT/REDEEM edge fn) ยังเป็น founder call ที่ค้าง (D.2 pricing) — S1 enforce ได้เฉพาะ CS-initiated path ไม่ครอบคลุม organic GRANT/REDEEM ปกติ
- dispute_verdicts shared object ระหว่าง S1<->S5 ต้องให้ S5 implement การอ่าน verdict ก่อน reweight review ด้วย (สองทาง) ; ถ้า S5 ไม่ honor verdict การปิด extortion double-dip จะ incomplete
- RBAC references ในเอกสารอ้าง §4.x จาก SYSTEM_PLAN.md ซึ่งยังมี open question (line 3343/3393): enforcement model RLS ซ้อนกัน 3 แบบ (scope tree vs user_roles vs JWT claims) ยังไม่ reconcile — scope-check ที่ S1 พึ่ง (§4.5) ตั้งอยู่บนโมเดลที่ยัง not-locked เต็ม
- threshold ตัวเลข (REFUND/goodwill 500฿/2,000 COIN, REFUND_GRACE_DAYS 30, cool-down 24-72h, chargeback window 120-180d, per-CS/per-city goodwill ceiling) เป็นค่าเสนอ ต้อง product/finance/legal calibrate ก่อน launch (สอดคล้อง D.1 residual)

### S2 Notification
- S2.9 broadcast-control assumes canonical RBAC defines distinct 'dpo_console' and 'incident_runbook' service roles and that S3/S4-style step-up (MFA) is reusable at the notification layer; if those roles/primitives are not actually locked in the auth spec, the two-person + step-up enforcement needs a canonical-change confirmation before build.
- Erasure purge of queued notif.deliveries/outbox is specified here as an addition to the §3.7 delete cascade, but the cascade is OWNED by the auth/erasure subsystem (S3.7). This spec can only declare the interface; S3.7 must actually add notif.deliveries/notif.outbox to its delete/purge list for the fix to take effect end-to-end.
- MSISDN freshness window (suggested ≤180d) and the verification mechanism for SMS are placeholders — the actual re-verification flow for a recycled-SIM check depends on the OTP/SMS-verification capability in the auth spec, which is not specified in the provided findings.
- Deep-link domain allow-list (policy.deeplink_domains) is enforced at render/dispatch, but the seed list of allowed domains/paths per template is operational config not defined here; an empty or over-broad allow-list would silently re-open the phishing surface.
- The three CRITICAL redteam findings (D7 quest-comp GRANT, real→real account laundering, payout SoD bank-redirect) and the platform_goodwill_budget / WHT / VAT / WARN-only-invariant findings were intentionally NOT folded in — they belong to support (S1), auth (S3), payout (S4), and observability (S6), not notification. Only their notification-touching seams (breach broadcast, erasure-queued-notif) were absorbed. If the orchestrator expected cross-subsystem fixes here, that is out of scope by design.
- No reject was necessary — every finding tagged subsystem='notification' (2 of them) plus the overlapping observability queued-notif leak were applied; nothing notification-relevant was dropped.

### S3 Auth/Identity
- S4-owned binding not authored here: the payout-SoD CRITICAL (same Finance/Payout actor approves a payee bank change AND creates the batch) is only cross-referenced from S3. The auth spec supplies the cool-down + notify primitive, but the constraint joining account_links/audit_log to payout_batches must be implemented in S4 — if S4 is not updated in lockstep, the four-eyes bypass remains open at the payout layer.
- Chargeback-window threshold (120-180d) and the financial-attribution-tombstone retention are flagged 'ASK YOUR LAWYER' — they assert a legal-obligation/legitimate-interest exception to PDPA m.33 that still needs counsel sign-off before build. If counsel disallows retaining the attribution token during the window, the late-chargeback reconciliation fix would need a different mechanism.
- The eligibility gate now depends on read-only RPCs exposed by S1 (support_tickets), S4 (payout_breaks/merchant_receivable/payout_suspense), and S6 (fraud_cases/fraud_score). Those RPC contracts are named but not defined here; each owning subsystem must publish a stable read interface or the gate cannot be built. Gate is specified fail-CLOSED to be safe, but that means an RPC outage blocks all erasures (availability vs. compliance trade-off to confirm).
- S3.4b forbids real->real consolidation for money-touching accounts by design. Legitimate duplicate-identity consolidation for users who already hold Coin/payout-bank has NO supported path (must go through canonical ledger redeem->re-grant under new KYC), which is an explicit product/ops limitation requiring BoT/e-money legal sign-off if ever relaxed.
- fraud_score threshold and the 'false-claim/goodwill-abuse flag window' in the erasure gate are parameters owned partly by S1/S6; values are left as proposals and must be set jointly with the anti-fraud layer to avoid either blocking legitimate erasures or letting goodwill-farmers reset history.
- REJECTED (out of auth scope, noted for traceability): D7 quest-comp GRANT goodwill-bypass (support/S1), platform_goodwill_budget S6 invariant gap (support/observability), WHT clawback-netting & VAT timing (payout/S4), breach-broadcast phishing primitive (notification/S2), WARN-only fail-open invariants (observability/S6), review-extortion double-dip and self-review reinstatement (moderation/S5). These are real findings but owned by other subsystem specs; only their auth-touching edges (erasure gate reads, notif purge on cascade, A.8.12 identity coupling, payout-bank cool-down cross-ref) were folded here.

### S4 Payout/Settlement/Tax
- payable_coverage is an S4-OWNED check that subtracts the S6 A.8.2s RHS; this assumes S6 exposes that RHS value (or its components) in reconciliation_runs. If S6's run schema does not surface the RHS, S4 must recompute the same components, reintroducing a duplicate-definition risk. The two teams must agree on a shared read interface for the A.8.2s RHS.
- Several accounts/txn_types S4 depends on (vat_output_payable, vat_input_claimable, payout_suspense, WHT_REMIT, VAT_REMIT, MERCHANT_CLAWBACK, tax_invoices, wht_credit_received) are level-(ค) — NOT yet in the locked CoA (A.1 has 14-ish accounts / A.7 has the locked txn_type list). All level-(ค) postings remain BLOCKED on a formal CoA amendment + founder/legal sign-off + lockstep update of S6's reconciliation invariant set. Until ratified they cannot be treated as canonical.
- The MERCHANT_CLAWBACK reversal flow is asserted as S4-owned but its exact posting and the hard-precondition handshake with S1's REFUND (A.6(6)) must be co-designed with S1; this spec defines the S4 side only. The end-to-end chargeback→receivable→recovery→write-off state machine still spans S1/S4/S6 and needs one agreed owner.
- Per-merchant monthly reward-COGS cap: S4 only DETECTS/surfaces and freezes GRANT scope at recon grain (nightly). The per-redemption cap and the synchronous mint-gate block live in the ledger GRANT/REDEEM edge fn (not S4); if that gate is not implemented, S4's nightly detection is a lagging control and escrow can still be drained intraday before the next run.
- Cap-on-clawback-offset (S4.7.3) needs a precise legal/accounting definition of 'legitimately-earned floor' per income event; the spec sets the rule but the exact floor computation and the cross-year amended-ภงด.3 mechanics need accountant sign-off.
- Bank-change cross-action SoD (S4.6.1a) depends on a reliable join across audit_log (bank-change approvals) × payout_items × payout_batches; if bank changes are recorded outside audit_log (e.g., a CS tool that writes bank_snapshot directly), the cool-down/cross-action constraint can be bypassed. The bank-change path must be funneled through one audited channel.
- Chargeback-window erasure gate (120-180d) is a proposed constant pending counsel confirmation that retaining the attribution token during the window is a permitted legal-obligation exception (C.3/D.3 flag it as a lawyer question); the exact window per acquirer/card-scheme is not locked.
- A.8.2s remains a nightly reconcile, not a synchronous gate (per A/D.1 residual risk): a same-day burst of chargebacks or a same-day bank redirect can transiently breach solvency/coverage or pay a redirected item before the next run; payable_coverage inherits this lag.
- VAT-inclusive vs exclusive (S4-2) and merchant GROSS-vs-NET PSP crediting must be uniform system-wide; this spec assumes VAT-inclusive + GROSS but the choice is a founder call that other subsystems must match.

### S5 Review/UGC Moderation
- The S1 support spec is NOT present on disk in this project (/Users/xalpha/xalpha/Project/09_cm/docs has only SYSTEM_PLAN.md and 02_canonical_ledger_pricing_legal.md). The exact S1 support_tickets schema (category enum values, linked_entity_type/linked_entity_id semantics, D1 consumer-protect timeout behavior) was reconstructed from the review findings' descriptions, not read from a canonical S1 file. The interface fix in S5.4.2 must be confirmed against the actual S1 spec when it lands.
- The fixes that depend on S1 (add 'review_dispute' to category enum, block silent-timeout auto-refund on extortion/velocity signal, implement the shared verdict object) are cross-subsystem obligations S5 can only DECLARE as an interface/open-decision — they are not enforced until S1 implements them. Until then the burn-and-refund double-dip remains exploitable on the S1 side even though S5 now records the false_claim/ม.337 outcome.
- Several findings were deliberately REJECTED as out-of-scope for moderation (left for their owning subsystems): A.8.2s solvency-formula conflict (S4/S6), platform_breakage->expiry_breakage rename (S4), RECOVERY/WRITE_OFF and reverse-SUBSCRIPTION txn_types (S1/S4/S6), merchant-payable clawback gap (S1/S4), reward-COGS caps unowned (S6/S4), goodwill farming + platform_goodwill_budget solvency (support/auth), real->real account merge laundering (auth), erasure-gate omissions (auth), payout SoD / WHT / VAT timing (S4/payout), breach-broadcast phishing + geofenced-nudge PII (notification), and WARN-only fail-open invariants + post-erasure reconcile (observability). If any of these are later deemed to have a moderation-side hook, S5 may need a follow-up edit.
- canonical 02_*.md is 314KB and was only partially read (A.0-A.6 head + A.8.7-A.8.12 + targeted searches). A.8.12 was verified directly (line 460) but other canonical sections referenced by the spec (e.g., §5.9 identity-graph, §6.3/§6.4 details, §A.5.1 reconcile pattern) were not exhaustively re-read; alignment relies on the draft's existing citations plus the searched confirmations.
- The 's6 extortion_velocity_signal' added to S5.2.3 triage and the verdict-object schema are spec-level constructs; their precise weighting and the fraud-gate clearance threshold for consumer-protect refunds are left to the founder/data parameter set (open decision 2/5) and are not numerically pinned here.

### S6 Observability/Recon/DR
- REJECTED FINDING (with reason): The review claim that the canonical breakage account is 'expiry_breakage' and 'platform_breakage' is wrong is INVERTED. Canonical doc lines 54/60/321 explicitly state expiry_breakage (the COIN sink) was REMOVED and platform_breakage is the canonical THB-side breakage account. S6 correctly uses platform_breakage. If the reviewer's canon differs from /Users/xalpha/xalpha/Project/09_cm/docs/02_canonical_ledger_pricing_legal.md, the discrepancy needs founder reconciliation — but as locked here, S4 (not S6) is the one that would need a rename, and away from expiry_breakage not toward it.
- REJECTED FINDING (with reason): The review claim that RECOVERY and WRITE_OFF are non-canonical txn_types is FALSE for the locked canonical doc — both appear in the A.7 txn_type table (lines 431-432) and the migration enum list (line 549). S6's use of RECOVERY as a PAUSED-allowed op is correct. The genuinely ad-hoc labels (reverse-SUBSCRIPTION, merchant_payable clawback as a txn_type) are S1/S4 issues, not S6; S6 only added a guard forbidding such labels in its remediation path.
- platform_goodwill_budget enforcement (S6.2.5) is written as CONDITIONAL because goodwill is not in the canonical CoA at all. If founders ratify goodwill, the BoT e-money / A.8.12 legal sign-off is a hard blocker that S6 cannot resolve — the invariants are specified but inert until ratification. If goodwill is rejected, S1's D7/goodwill paths must reroute through canonical funders, which is an S1 change outside this spec.
- The COGS budget cap values (REWARD_BUDGET_CAP, PER_REDEMPTION_REWARD_CAP) are unset — S6 specifies the invariant + mint-gate machinery but the actual cap numbers are a blocking Founder/pricing call (canonical B.6 point 3 / D.1116 mark this unresolved before GA). Until set, the cogs_budget_cap invariant cannot fire meaningfully.
- Several enforced controls require cooperating changes in adjacent subsystems that S6 can only declare interfaces for, not implement: S3.7 must actually call the fraud_cases open-state query and the chargeback-window gate; the edge functions (grant/redeem/payout/prefund) owned by S4/S1 must read platform_freeze_state and the COGS mint-gate; S3 must enforce the no-real-to-real-merge rule and identity-graph re-score hook. If those subsystems don't adopt the declared interfaces, S6's recon/freeze becomes detect-only (defense-in-depth) rather than preventive.
- The merchant_payable already-paid clawback funding gap (review cross_gap, owned by S4) is NOT solvable in S6 — S6 only added a dashboard/recon surface to detect merchant_payable going negative. The canonical merchant-settlement reversal flow still needs an owner in S4.
- wht_recon and vat_revenue_recon assume the agent/tax accounts (wht_payable, vat_output_payable, agent_wht_ledger, tax_invoice) exist and are populated by S4 — these are pending-ratification per canonical line 893. The invariants are specified but depend on S4's CoA amendment landing.
- Hash-chain external anchoring and the bank_change↔batch SoD cross-check assume audit_log captures bank_change.approve and breach.notice.emit as discrete actions with resolvable actor identities — this requires the auth/payout/notification subsystems to emit those audit actions, which is asserted here but enforced elsewhere.
