# Open Decisions & Legal Sign-off Tracker

> ตัวรวมศูนย์ของ **การตัดสินใจทั้งหมด** ข้ามทุกเอกสารออกแบบ — ใช้เป็น checklist ก่อน build / ก่อน GA / ก่อน go-live
> **อัปเดต:** 2026-06-14 · สถานะ: `LOCKED` = เคาะแล้ว · `SET-BEFORE-BUILD` = ตั้งค่าก่อนเขียนโค้ดส่วนนั้น · `BLOCKING-GA` = ต้องมีก่อนเปิดจริง · `LEGAL` = ต้องทนาย/ที่ปรึกษายืนยัน

---

## A. การตัดสินใจเชิงกลยุทธ์ที่ LOCKED แล้ว (เสาหลักของระบบ)

| # | เรื่อง | คำตัดสิน | ที่มา |
|---|---|---|---|
| A1 | ขอบเขต | **กว้าง** — ทั้งเชียงใหม่, eat/see/do, multi-tenant + multi-city ready ตั้งแต่วันแรก (แต่ปูข้อมูล/เปิดตัวทีละย่าน) | session |
| A2 | กลุ่มผู้ใช้ | **3 กลุ่ม first-class** — ไทย+nomad / ฝรั่ง / จีน FIT → 3 ภาษา TH/EN/ZH + PromptPay/Alipay/WeChat + LINE login | session |
| A3 | ใครจ่ายรางวัล | **ร้านเติมเงินล่วงหน้า (escrow)** — แพลตฟอร์มไม่สำรองจ่าย, ยอด 0 หยุด quest อัตโนมัติ | session |
| A4 | รายได้ | **4 เสา** — SaaS ร้านค้า + take-rate + sponsored quests/festival + data product/booking affiliate | session |
| A5 | incrementality / COGS | **จำกัดต้นทุนรางวัล** — cap มูลค่ารางวัลต่อครั้ง + cap งบ/redemption ต่อร้านต่อเดือน (ROI break-even ~46%) | session |
| A6 | สกุลแต้ม | **Sparks** (XP ฟรี, แลกไม่ได้) แยกจาก **Coins** (มูลค่าบาท, มินต์เมื่อร้านเติม escrow, แลกเป็นเงินสดไม่ได้, หมดอายุ) | 02 §A |
| A7 | ledger | double-entry append-only, หน่วยสตางค์ BIGINT, 1 COIN = 1 THB ตายตัว, มินต์เฉพาะเงิน PSP ที่ settle จริง | 02 §A |
| A8 | กันโกง redemption | merchant-initiated rotating QR/OTP + geofence + burn ฝั่ง server + coin_lots lock (FIFO); **anti-self-redemption = เส้นกฎหมาย e-money** | 02 §A |
| A9 | breakage account | **canonical = `platform_breakage`** (THB). `expiry_breakage` ถูก**ตัดทิ้ง** — COIN-side วัดจาก `ref_type=expiry` (2-leg). **อย่า rename กลับ** | 02b §A2.8 |
| A10 | tech stack | **C2 Hybrid-TS**: Flutter (มือถือ) · Next.js+Refine (เว็บ) · **NestJS money-plane (TS)** · PostgreSQL/Supabase (data-plane) · `money_writer` role · plpgsql gate fn + DB invariants. ปรับจาก baseline เดิม (Edge Functions/Deno → NestJS); schema/plpgsql/invariant เดิมใช้ต่อ | 05 |

---

## B. พารามิเตอร์ที่เจ้าของต้องตั้งค่า (มี default แนะนำ) — `SET-BEFORE-BUILD` / ก่อน GA

| # | พารามิเตอร์ | ค่าแนะนำ (default) | สถานะ / ผลถ้าไม่ตั้ง | ที่มา |
|---|---|---|---|---|
| B1 | `REWARD_PER_REDEMPTION_CAP_THB` | calibrate จาก pricing (~46% break-even) | **BLOCKING** — inert + fail-closed: D7/CS-initiated GRANT เปิดไม่ได้จนกว่าจะตั้ง | 02b A2.10-#3 |
| B2 | `MERCHANT_MONTHLY_COGS_CAP_THB` | calibrate ต่อ tier | **BLOCKING** เช่นเดียวกับ B1 | 02b A2.10-#3 |
| B3 | corrective lever ถ้า incrementality วัดจริง < 25% | cap reward + cap redemptions/เดือน (ไม่ลด take-rate) | ตั้งก่อน GA pricing | 02 §B |
| B4 | bad-debt reserve size (merchant_receivable) | ตามอัตรา chargeback+funder-default × outstanding backing เฉลี่ย | ตั้งก่อนเปิด GRANT จริง (SEAM-2 freeze ที่ 100%) | 02b A2.10-#4 |
| B5 | `BANK_CHANGE_COOLDOWN_HOURS` | **72** | default ได้ | 02b A2.10-#6 |
| B6 | PSP fee crediting | **GROSS** (แพลตฟอร์มรับค่าธรรมเนียม) | default ได้ ยืนยันกับ finance | 02 §A |
| B7 | rounding | **banker's (round_half_even)** + drift monitor | default ได้ | 02 §A |
| B8 | `REFUND_GRACE_DAYS` | **30** + แจ้งเตือน T-14/T-3 + grace ≥7 วันหลังหมดอายุ | default ได้ | 02 §A |
| B9 | breakage fee ตอน Coin หมดอายุ | **0%** ปีแรก (เพื่อ trust) | default ได้ revisit ภายหลัง | 02 §B |
| B10 | micro-redemption ฟรี take-rate ต่ำกว่า | **30 ฿** | default ได้ ปรับผ่าน config | 02 §B |
| B11 | Pro tier | คงไว้ถ้ามีร้าน 4-10 สาขา ≥~30 ราย ในเขต; ไม่งั้นยุบเป็น add-on บน Growth | รัน catchment count ก่อน | 02 §B |
| B12 | Sybil/farming GRANT caps | ตั้ง conservative แล้ว tune จาก campaign | บังคับใน grant edge-fn | 02 §A |

---

## C. ต้องให้ทนาย/ที่ปรึกษายืนยัน — `LEGAL` (บางตัว `BLOCKING-GA`)

| # | ประเด็น | จุดยืนแนะนำ (ระหว่างรอ) | ความเสี่ยงถ้าผิด | ที่มา |
|---|---|---|---|---|
| C1 | Coins เป็น e-money ของ ธปท. ไหม | non-cashable + ไม่ P2P + ไม่ cash-out + หมดอายุ + "ผู้ใช้ไม่เติมเงินเอง" (= shield หลัก) | **BLOCKING-GA** — ปรับ/ผิดประเภทธุรกิจ | 02 §C |
| C2 | escrow = รับฝากเงิน (FIBA) ไหม | คืนเฉพาะส่วนที่ยังไม่ mint, ห้ามถอนแบบ demand, แยกบัญชี ring-fenced, ห้ามหาดอกผล | **BLOCKING-GA** | 02 §C / A2.10 |
| C3 | goodwill Coin (platform-funded แลกข้ามร้าน) ↔ e-money / A.8.12 | ใช้ partition `sponsor:platform_goodwill` ไปก่อน (build-ready); dedicated `platform_goodwill_budget` รอ sign-off | **BLOCKING** ก่อนเปิด goodwill scale | 02b A2.9 |
| C4 | breakage destination ตอน EXPIRE | default **คืน funder** (เสี่ยงต่ำสุด); platform-keep ต้องมี legal opinion | hardcode ใน canonical → ต้องเคาะก่อน migration #1 | 02 §A.10 |
| C5 | escheatment (payout/breakage ไม่มีผู้รับ) | sweep >90 วัน → `escheatment_liability` ตาม jurisdiction | ต้อง confirm window ต่อเขต | 02b A2.10-#5 |
| C6 | สถานะจ้าง Field Agent | **freelance 3% WHT (ภงด.3)** + retainer ผูก KPI ไม่ผูกตาราง; เปลี่ยนเป็นลูกจ้างเมื่อ >~20 FTE | retroactive tax/SSO = ความเสี่ยงใหญ่สุด | 02 §C / 02b |
| C7 | data residency | Supabase SG + DPA + s.29 SCC + encryption; ย้าย sensitive in-TH ภายหลัง | PDPA cross-border | 02 §C |
| C8 | DPO | แต่งตั้ง (fractional ก่อน) ตั้งแต่วันแรก | ปรับสูงสุด 1M (+ ceiling 5M) | 02 §C |
| C9 | VAT | จดทะเบียน VAT **ก่อนเปิด** (ไม่รอ 1.8M), default VAT-inclusive | s.85/1 30 วัน | 02 §C / 02b |
| C10 | breach SLA | ไม่ hard-code 72 ชม. — ทำ risk-tier runbook (72ชม. + ขยาย 15 วัน + ข้ามถ้า no-risk) | PDPC | 02 §C |
| C11 | กลไกสุ่มได้ของจริง (spin/scratch/gacha/lucky-draw) | **เลี่ยง** — ใช้ deterministic ("ทำครบ X ได้แน่นอน"); ถ้าสุ่มจริง = server-RNG + odds โปร่งใส + sponsor-funded + legal | ม.8 พ.ร.บ.การพนัน 2478 / สลากกินแบ่ง | 08 §4 |
| C12 | "X คนแรกได้" / แข่งเวลา ชิงของจริง | **เลี่ยง** — เปลี่ยนเป็น "ทุกคนที่ทำครบ X ได้ จนกว่า pool/COGS หมด" (deterministic) | ม.8 (latency-race = chance-adjacent) | 08 §3/§4 |
| C13 | ประกวด/โหวตชุมชนชิงรางวัลจริง | ต้องมี neutral-judge + เกณฑ์ชัด (ไม่ใช่ popularity-lottery ล้วน) + WHT ภาษีรางวัล | contest law + WHT | 08 §4 |
| C14 | social ใช้ตำแหน่ง/BLE-nearby + contact-hash | **ตัด BLE/nearby ออกจาก V1** (PDPA ความอ่อนไหวสูงสุด); contact-hash ต้องไม่เผยกราฟ non-user; ภาษีรางวัล creator | PDPA + WHT | 08 §2 |

---

## D. งานที่ต้องต่อสายตอน build (wiring dependencies)

| # | งาน | เจ้าของ | หมายเหตุ |
|---|---|---|---|
| D1 | per-merchant monthly COGS accumulator (FOR UPDATE) ใน grant/redeem edge-fn | S4 + loyalty | ตอนนี้มีแต่ CS path + nightly detect → ต้องทำ prevent-at-mint |
| D2 | bank-change ทุกจุดต้องวิ่งผ่าน channel เดียว + cool-down + SoD join | S3 + S4 | ถ้า CS เขียน bank_snapshot ตรง = bypass ได้ |
| D3 | identity-graph re-score hook ตอน account link/merge/recovery | S3 + S5 | บังคับ SEAM-4 (กันฟอก Coin) |
| D4 | `cs_open_obligations(user_ref)` cross-query (dispute+fraud+suspense) | S1/S6 → S3 | erasure gate fail-closed |
| D5 | `agent_reserve` table (sub-ledger) ต้อง reconcile กับ balance(agent_reserve) account | S4 | กัน double-account |
| D6 | breach.notice / dsar.* emit เฉพาะ path เดียว (DPO console) + 2-person + deep-link allow-list | S2 | กัน mass-phishing |
| D7 | edge functions ที่ migration #1 ต้องมี (loop พัง/data ไม่ขึ้น live ถ้าขาด): `fund_quest`/`join_quest`, `apply_proposal` (ผู้เขียน live places ตัวเดียว + version bump), `claim_verify` (trust-state machine), quest-completion→`grant_coins` handoff, counter-scan nonce issuer | doc 04 §3 | จาก MVP-loop review |
| D8 | anti-self-redemption ที่ MVP: arm `exact funder==redeemer` + `device-fingerprint` + `payment-instrument-hash` + `kyc-hash` (ดึง hash เข้า m#1); transitive identity-graph + SEAM-4 re-score + goodwill↔identity edge → m#3 (goodwill-at-scale gate ที่ m#3) | doc 04 §2.7 | e-money boundary; **หมายเหตุ:** doc04 §3 ยังเขียน downgrade เหลือ 2 arm — ต้อง align ให้ตรง §2 (4 arm) |

---

## E. รายการที่เคยเป็น "ช่องโหว่" และปิดแล้ว (ไม่ต้องทำซ้ำ)

- ✅ ledger 4 ดราฟต์ขัดกัน → รวมเป็น canonical เดียว (02 §A)
- ✅ subscription tier / take-rate ขัดกัน → ล็อกชุดเดียว (02 §B)
- ✅ double-redeem race, self-redemption cash-out, platform float ก่อน PSP settle, cross-funder backing leak → แก้ (02 §A)
- ✅ D7 quest-comp mint bypass, real→real laundering, payout SoD bypass, fail-open invariants → แก้ด้วย 5 seam invariants (02b §A2.5)
- ✅ CoA ขาด tax/payout/goodwill accounts + txns → ratify (02b §A2.1/A2.2)
- ✅ breakage naming — **สอดคล้องแล้ว** = `platform_breakage`; `expiry_breakage` ที่เห็นในเอกสารเป็นบริบท "ตัดทิ้ง/ปฏิเสธ rename" เท่านั้น **อย่าหลงแก้**
