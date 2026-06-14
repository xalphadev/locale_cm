# Build Roadmap → Nimman Pilot

> **เวอร์ชัน:** v1 (5-track plan → integrated → critique-folded) · **วันที่:** 2026-06-14
> แปลง design 11 docs เป็นแผนลงมือถึง Nimman pilot — รวมทุก track (eng + field-ops + legal + product + team). align กับ docs 02-08 + OPEN_DECISIONS
> **ความจริง:** critical path = legal lead-time (~6-10 wk) + merchant willingness-to-pay — *ไม่ใช่โค้ด*. realistic ~26-30 สัปดาห์ถึง pilot ด้วย core ~5 + agent 3→8-10

---

## A. Integrated Roadmap (5 tracks ขนานกัน)

# BUILD ROADMAP — Nimman "Cafe-Hop" Pilot (Integrated, 5 Tracks)

> **หลักการเดียวที่คุมทั้งแผน:** *build the SYSTEM broad once, then pour budget into SEEDING the DATA dense.* Empty map = ตัวฆ่าอันดับ 1 → ห้ามยิง consumer marketing จนผ่าน **Density Gate 7/7**.
>
> **ความจริงที่ต้องยอมรับ (honest):** Critical path สู่ pilot **ไม่ใช่โค้ด** — โค้ด money-core (~37 dev-wk ของ E0+E1+E2) เสร็จได้ใน ~M4 ด้วยทีมเล็ก แต่ **"เงินจริงไหล" (money-live) ถูกล็อกด้วย legal opinion lead time (~6–10 สัปดาห์) + B1/B2/B4 cap calibration ที่ต้องรอ early merchant data**. งานที่ยาวที่สุดในโรดแมปคือ **engage ทนาย fintech ไทย** ซึ่งต้องเริ่ม **W0 วันแรก** ไม่งั้นกลายเป็น bottleneck ตอน build เสร็จ. Field-agent seeding รัน **PARALLEL** เต็มตัว (gated เฉพาะ agent app + change_proposal pipeline, ไม่ใช่ money-plane). Realistic timeline ถึง pilot = **~M6–M7 (26–30 สัปดาห์)** ด้วย core 5 คน + agent ramp 3→8–10.

---

## เส้นเวลารวม (Gantt-ish view) — 5 tracks ขนานกัน

```
สัปดาห์:        W0 ──── W4 ──── W8 ──── W12 ──── W16 ──── W20 ──── W24 ── W26-30
PHASE:          │ P0 Found │── P1 Build broad ──│── P2 Seed dense ──│ P3 Pilot │ P4 post

TRACK 1 ENG:    E0═════════╗
(money critical) ╚E1 Money═══════╗
                           ╚E2 Slice══════╗
                                  ╚E3 Surfaces(agent app→consumer→counter)═══╗
                                                  ╚E4 Instrument═╗ (TTFS+solvency+density-query)

TRACK 2 FIELD:  (gated by agent app + change_proposal only)
                    ┄┄seed-only(3-4 agent)┄┄┄═══saturate ramp 4→8-10═══╗density gate close
                                                      ╚merchant onboard+escrow+sell annual═╗ FIRST REVENUE

TRACK 3 LEGAL:  ★engage counsel W0═════════════(opinion C1/C2/C4 on file ~W12-16)═══════╗MONEY-LIVE
(rate-limiter)   ★VAT+escrow acct+DPO+PSP W1═══╗  ╚C6 agent class W4  ╚DPA+SCC  ╚privacy center+breach drill═╗CONSUMER-OK

TRACK 4 PRODUCT: ┄┄define pilot+lock params┄┄  ╚B1/B2/B4 calibrate W8-12═╗  ╚AHA<60s+measurement═╗ ╚launch motion═╗GATE A→GATE B

TRACK 5 TEAM:   ★fundraise(parallel,pre-W0)═╗ founders+money-dev│hire Flutter+Web W4│Ops lead+agent W8│moderator+ramp│growth W22
```

---

## PHASE 0 — FOUNDATION (W0–W6)
**Goal:** ปลด long-lead clocks ทั้งหมดให้เริ่มเดินพร้อมกัน + วาง ledger foundation ที่ compliance-by-construction. **ไม่มีเงินจริง ไม่มีโค้ดที่เขียนเงิน.**

- **ENG (E0, 12.5 dev-wk):** migration #1 (25 CoA), 8 DB invariants รวม A.8.1b clearing-flat REAL branch (DDL+test จริง ไม่ใช่ prose), RLS scope-in-token, auth LINE/Apple/Google, pgTAP CI gate. → **M0**
- **LEGAL (L0):** ★engage ทนาย fintech/PDPA/tax + CPA + DPO **W0**; ส่ง question list C1/C2/C4/C6/C7/C8/C9; เริ่มจด VAT + ตั้ง entity + PSP onboarding + เปิดบัญชี escrow แยก **W1** (lead-time clocks เดิน).
- **PRODUCT:** lock pilot definition (Nimman, Cafe-Hop N_OF_M 3-of-5, 15–25 cafes, success/fail matrix); lock LOCKED params (take-rate 10%, tiers, agent bounty, expiry T-14/T-3); set conservative cooldown/velocity caps; เคาะ PARALLEL defaults B5/B6/B7/B8/B9/B10.
- **TEAM:** ★fundraise ปิดก่อน/ระหว่าง W0 (~4.5–8M THB, runway 9–12 เดือน); founders (CEO/BizOps + CTO/money) ลงมือ; appoint fractional DPO/ทนาย/บัญชี.
- **FIELD:** ground survey catchment (นับ F&B 4–10 สาขา → PRO_TIER_ENABLED); ยังไม่จ้าง agent.

**GATE 0 (GO/NO-GO ออกจาก P0):** M0 green (migration #1 + invariants incl A.8.1b real branch + auth + CI) **AND** funding closed (≥9–12mo runway) **AND** counsel+DPO+CPA engaged + question list ส่งแล้ว (clocks เดิน). ❌ NO-GO ถ้า A.8.1b ยัง prose-only หรือ counsel ยังไม่ engage (= money-live จะเลื่อนทุกสัปดาห์ที่ช้า).

---

## PHASE 1 — BUILD BROAD / MONEY CORE (W4–W14, overlap P0)
**Goal:** สร้าง money-plane + ปิด loop server-side. Money-plane = critical chain → founder/CTO ถือเต็มตัว, junior ห้ามแตะ ledger.

- **ENG (E1 Money Core 18.5 dev-wk → M1):** gate+post template (1 plpgsql fn/txn ใต้ FOR UPDATE, money_writer sole INSERT-er, session-pool), prefund/psp_settle, grant_coins/redeem SEAM-1 order, payout (S4), S6 recon/freeze, COGS fail-closed เมื่อ B1/B2 unset. **★ build per-merchant monthly COGS accumulator ใน organic grant/redeem edge-fn ใต้ FOR UPDATE (A2.4 residual) — ไม่งั้นเหลือแค่ detect-after-drain.**
- **ENG (E2 Vertical Slice 14 dev-wk → M2):** 5 missing edge fns (check_in+GATE6, fund_quest, issue_nonce, apply_proposal, claim_verify) + EARN-to-GRANT bridge + full ring server-side, no client writes. **★ wire `redemptions.visitor_type=new|returning` + `first_stamp_succeeded` event ตั้งแต่ redemption path แรก** (instrument สำหรับ incrementality/TTFS — ถ้าไม่ wire ตอนนี้ Gate B วัดไม่ได้).
- **ENG กันชน:** build-time feature-flag guard random-real-value default OFF (0.5 dev-wk); coverage_baseline denominator + Google Places seed ETL spec (dedup/category-map/licensing) — blocker ของ density-gate query.
- **LEGAL (L1, parallel):** ★C6 agent classification + สัญญา agent เสร็จ **~W4** (ต้องก่อนจ่าย agent ก้อนแรก); ร่าง Merchant Quest/Loyalty Agreement + consumer Coin T&C; DPA+SCC ม.29 กับ Supabase; DPO lawful-basis map + retention_class + consent log spec.
- **TEAM:** hire Flutter + Web/Counter eng **~W4** (build ขนาน money-plane); BE คนที่ 2 ทำ worker/PSP webhook/glue เพื่อ unblock founder ให้โฟกัส hot-path posting.
- **PRODUCT:** เริ่ม Finance calibration pricing model สำหรับ B1/B2.

**GATE 1 (GO/NO-GO):** M1 green (SEAM-1 endpoints ผ่าน invariants + recon/freeze + COGS fail-closed) **AND** M2 (loop closes server-side, no client writes, visitor_type+first_stamp wired) **AND** C6 agent contract on file. ❌ NO-GO ถ้า COGS accumulator ยังไม่ embed ใต้ FOR UPDATE (= prevent-at-mint หาย).

---

## PHASE 2 — SEED DENSE (W8–W22, overlap P1 อย่างหนัก)
**Goal:** strike team saturate Nimman → Density Gate 7/7; ปลด real GRANT (caps) + money-live (legal); first revenue จาก annual plans. **นี่คือ phase ที่ burn พุ่งสุด (agent payroll) และ chicken-and-egg ถูกแก้.**

> **★ จุดที่ chicken-and-egg แตก:** seed-only tasks (seed_new_place/photos/hours ผ่าน change_proposal) **เริ่มได้ทันทีที่ agent app + apply_proposal ใช้ได้ (~W8–W10)** — ไม่ต้องรอ money loop. แต่ **merchant onboard+escrow+sell + Counter redeem** ต้องรอ money-live (agent ต้องมีของไปสาธิต). → payroll ramp เป็นขั้น ไม่ใช่จ้างเต็ม 10 คน day-1.

- **FIELD (parallel, gated เฉพาะ agent app):** จ้าง Ops/Field lead + agent ชุดแรก 3–4 คน **~W8** → seed-only saturation เริ่มทันที; ramp 4→8–10 **~W14–W18** เมื่อ merchant loop พร้อมสาธิต; ปิด coverage ≥90% / 200–400 places, ≥5 รูป/place, ข้อมูล 100%, TH/EN 100% ZH≥80%, ≥3 quest (Cafe-Hop featured), ≥5–25 escrow-merchant, ≥10 promo.
- **LEGAL (L2 → unlock real GRANT, W8–W12):** ★ตั้ง B1 REWARD_PER_REDEMPTION_CAP + B2 MERCHANT_MONTHLY_COGS_CAP (calibrate ~46% break-even, pilot ~45฿ avg/cap 60฿) + B4 bad-debt reserve (SEAM-2 freeze 100%/WARN 70%) + C4 breakage destination (return-funder) → **เลิก fail-closed, real Coin GRANT เปิดได้.**
- **LEGAL (L3 → MONEY-LIVE, W12–W16):** ★written legal opinion C1 (Coins-non-e-money) / C2 (escrow-not-deposit) / C4 on file + finance-ops payout (SoD created_by≠approved_by, 50-ทวิ event-based decoupled จาก remittance รอบเดือน, จ่ายจาก bank_settlement เท่านั้น, recon รายคืน, bank-change cooldown 72h) พร้อม → **merchant prefund escrow จริง + consumer redeem Coin จริง.**
- **ENG (E3 Surfaces 21 dev-wk, sequenced):** **agent Flutter FIRST** (ปลด field seeding) → merchant web (claim/escrow/subscription) → **Counter PWA <5s** (server-burn rotating QR/OTP) → consumer Flutter + **AHA<60s onboarding** (zero signup wall, AHA Home first no-gate, first-stamp celebration-honesty) → admin minimal. → **M3 pilot-usable.**
- **TEAM:** Content Moderator 0.5–1 FTE **~W12** (proposal volume พุ่ง); FIRST REVENUE = agent ปิด annual plan (Growth 9,900฿ cash ก้อนเดียว) → ~50–80 ร้าน proves willingness-to-pay.
- **PRODUCT:** build measurement dashboard (TTFS + guardrails) + incrementality experiment design (staggered/holdout).

**GATE 2a (unlock real GRANT, ~W12):** B1+B2+B4+C4 set + COGS accumulator live. **GATE 2b (MONEY-LIVE, ~W16):** C1/C2/C4 opinion on file + finance-ops SoD/WHT/recon พร้อม. ❌ ห้ามเปิด redemption ก่อน B1+B2+C4+VAT ครบ. ❌ ห้าม pay agent ก้อนแรกก่อน C6 contract.

---

## PHASE 3 — PILOT LAUNCH (W16–W30)
**Goal:** ปิด Density Gate → soft launch → full pilot → 2 go/no-go gates. Consumer marketing เริ่ม **เฉพาะหลัง Density Gate ผ่าน**.

- **LEGAL (L4 → CONSUMER-LAUNCH, ก่อน marketing):** ★self-service privacy center live (access/erasure/portability/withdraw + DSAR queue + erasure gate fail-closed ผ่าน cs_open_obligations) + breach runbook drill 1 รอบ + T&C/consent live → **ปลด consumer marketing (PDPA).**
- **PRODUCT — Seeding mode (Wk0–4 ของ launch, no ads):** agent วาง printed QR table-tent + train 5s redeem; ผู้ใช้เห็น pin แต่ไม่มี marketing. **Manager sign-off ปิด Density Gate.**
- **ENG (E4 Instrumentation 4 dev-wk → M4):** TTFS funnel + money/solvency dashboard + Density-Gate single-query go/no-go.
- **PRODUCT — Soft launch (หลัง gate เท่านั้น):** in-mall One Nimman/Maya + micro-influencer + LINE OA + RED/nomad-community + paid social เฉพาะ Nimman; zero-state tourist hook (Lanna postcard shareable + 3-stop trail).
- **TEAM:** เพิ่ม growth/marketing 1 คน **~W22**; ลด agent → steward retainer portfolio หลัง gate.
- **PRODUCT:** measure north-star TTFS<60s, loop completion, fraud<0.5%, incrementality (visitor_type), merchant ROI.

**GATE A (Wk6 ของ launch — เปิด full pilot ไหม):** Density Gate 7/7 **AND** soft-launch TTFS median <60s + first-stamp completion ≥40%. ❌ ไม่ผ่าน = ขยาย seeding/แก้ onboarding, ห้าม scale spend.

**GATE B (end-of-pilot ~Wk14 ของ launch — scale ไหม):** measured incrementality ≥30% (เข้าใกล้ break-even 46%) **AND** merchant paid-retention ≥70% (WTP จริง = core risk) **AND** loop-completion ≥30% + redemption 150–200 + off-season local D30 ≥25%; fraud near-zero = hard guardrail (spike = no-go).

---

## PHASE 4 — POST-PILOT (หลัง Gate B)
**Goal:** ตัดสินบนข้อมูลจริง — scale หรือ fix-then-scale.

- **GO:** unlock District #2 (Old City temple-trail + sponsored/festival quest schema-ready) ด้วย playbook + param ที่ calibrate จาก Nimman; fundraise (proof points = density gate จริง + TTFS + measured incrementality ไม่ใช่ assumption 60% + paid-retention + fraud≈0); scale features m#3 (identity_graph, full Sybil graph, sponsored-quest tooling, self-serve merchant quest).
- **NO-GO:** ปัญหา = merchant WTP/incrementality → ปรับ COGS structure (B3 lever: cap reward + cap redemptions/เดือน) หรือ pricing **ก่อน** ขยายย่าน. ห้ามขยายบน unit-econ ที่ยังไม่ปิด.
- **DEFERRED:** ม.8 permit (random reward), WeChat/Alipay เต็ม (Chang Klan), WHT/VAT auto, intraday-recon, DR, offline-burn, analytics_pro, k-anonymity data product, C13 UGC contest (face-blur), full consoles.

---

## B. Critical Path · Dependencies · First 2 Weeks · Team · Risks

### B.1 Critical Path
1. W0: engage ทนาย fintech/PDPA/tax ไทย + ส่ง question list (lead time ยาวสุด ~6-10 wk → opinion C1/C2/C4) — งานเดียวที่ตัดสิน money-live, ต้องเริ่ม day-1
2. W0-W6: E0 Foundation (migration#1 + A.8.1b real branch + invariants + auth + CI) = M0 — ทุกอย่างต่อยอดจากนี้
3. W4-W14: E1 Money Core (gate+post fn ใต้ FOR UPDATE, money_writer sole, S4 payout, S6 recon) = M1 — money-plane critical chain, founder/CTO SPOF
4. W8-W14: E2 Vertical Slice (5 edge fns + EARN-to-GRANT bridge + visitor_type/first_stamp wired) = M2 loop closes server-side
5. W8-W12: ตั้ง B1/B2 COGS cap + B4 reserve (calibrate ~46% break-even, ต้องรอ early merchant data) → unlock real GRANT
6. W12-W16: legal opinion C1/C2/C4 on file + finance-ops SoD/WHT/recon พร้อม → MONEY-LIVE
7. W14-W22: E3 Surfaces — Counter PWA <5s + merchant escrow + consumer AHA<60s = M3 pilot-usable
8. ก่อน soft launch: Density Gate 7/7 ปิด (coverage≥90% via coverage_baseline + Places ETL) + privacy center/breach drill (CONSUMER-LAUNCH)
9. GATE A → full pilot → GATE B (~26-30 wk total)

### B.2 Cross-Track Dependencies
- **real Coin GRANT go-live** ⟵ blocked by: B1+B2 COGS caps set (founder+finance calibration จาก ~46% break-even, ต้องรอ early merchant data) AND C4 breakage destination legal sign-off AND COGS accumulator embedded ใต้ FOR UPDATE — fail-closed REJECT ทุก path จนกว่าจะครบ
- **money-live (merchant prefund escrow จริง + consumer redeem จริง)** ⟵ blocked by: written legal opinion C1 (Coins-non-e-money) + C2 (escrow-not-deposit/FIBA) + C4 on file AND finance-ops SoD/50-ทวิ/recon process พร้อม AND VAT registered (C9) — lead time ~12-16 wk จาก W0 engage
- **consumer marketing / soft launch** ⟵ blocked by: Density Gate 7/7 ผ่าน (Manager sign-off) AND privacy center live + breach runbook drill + T&C/consent (CONSUMER-LAUNCH, PDPA C7/C8) — Empty map = #1 killer
- **Density Gate single-query (coverage ≥90%)** ⟵ blocked by: coverage_baseline denominator ใน schema + Google Places seed ETL (dedup/category-map/licensing) — track build artifact ที่ยัง unspecified; AND apply_proposal/fund_quest edge-fn (E2); AND agent strike team deployed
- **field-agent payroll ก้อนแรก (legal-safe)** ⟵ blocked by: C6 agent classification (freelance 3% WHT vs ลูกจ้าง) + สัญญา agent (ผูก KPI ไม่ผูกตาราง) on file ~W4 — misclassify = ความเสี่ยงภาษี/SSO ย้อนหลังใหญ่สุด
- **agent merchant-onboard + sell + Counter demo (full agent ramp 8-10)** ⟵ blocked by: Counter PWA redeem + merchant claim/escrow + grant loop ใช้ได้จริง (E3, M3) — agent ต้องมีของไปสาธิต; แต่ seed-only tasks เริ่มได้ที่ agent app + apply_proposal (M2) ไม่ต้องรอ money loop
- **Gate B incrementality decision (merchant ROI)** ⟵ blocked by: redemptions.visitor_type=new|returning + first_stamp_succeeded wired ตั้งแต่ redemption path แรก (E2) AND money-live (redemption settle จริง) AND incrementality experiment instrument
- **money-plane build (E1)** ⟵ blocked by: senior money-dev (founder/CTO) onboard — bus-factor 1 SPOF บนเส้นเงิน; mitigate ด้วย DB invariant + money_writer role + 100% coverage gate + pgTAP
- **AHA<60s onboarding (TTFS measurement → Gate A)** ⟵ blocked by: check_in + first_stamp_succeeded event (E2) AND money-gate live (zero-state tourist reward ผ่าน money-gate)
- **DPA+SCC location PII collection** ⟵ blocked by: C7 opinion + DPA+SCC ม.29 ลงนามกับ Supabase ก่อนเก็บ location PII จริง — เก็บก่อนลงนาม = PDPA cross-border violation

### B.3 First 2 Weeks (ลงมือทันที)
1. W0 LEGAL (founder, ลำดับ 1 เด็ดขาด): engage ทนาย fintech/PDPA/tax ไทย (อาจสำนักเดียวถ้าครบ 3 สาย) + CPA + fractional DPO; ส่ง question list C1/C2/C4/C6/C7/C8/C9 ที่ doc 02 §C วางไว้แล้ว (เอาไปคุยได้ทันที). นี่คืองาน lead-time ยาวสุด — ทุกสัปดาห์ที่ช้า = money-live เลื่อนตรง
2. W0 TEAM: ปิด/ยืนยัน funding pre-seed/angel ~4.5-8M THB (runway 9-12 เดือน) ก่อนเริ่ม build จริง; founders (CEO/BizOps + CTO/money-plane) onboard; ตั้ง founder comp ต่ำ/deferred (swing งบ ±30%)
3. W0-W1 ENG: founder/CTO เริ่ม E0 — write migration #1 (25 CoA) + 8 DB invariants โดยเฉพาะ A.8.1b clearing-flat REAL branch (DDL+test จริง ไม่ใช่ prose-only — นี่คือ RISK ที่ระบุไว้); ตั้ง pgTAP CI gate + money_writer role + session-mode pool
4. W1 LEGAL/OPS: เริ่มจด VAT 7% (ไม่รอ 1.8M, ม.85/1) + ตั้ง entity + เปิดบัญชี escrow แยก (ring-fenced, ห้ามกินดอกเบี้ย) + PSP onboarding (Omise/2C2P/Fiuu) + แต่งตั้ง DPO — ทั้งหมด parallel, clocks เดินพร้อมกัน
5. W1-W2 PRODUCT: lock pilot definition (Nimman, Cafe-Hop N_OF_M 3-of-5, success/fail matrix) + lock LOCKED params (take-rate 10%, tiers 390/990/1690, agent bounty, expiry T-14/T-3) + เคาะ PARALLEL defaults B5-B10 (founder confirm)
6. W1-W2 ENG: scope E2's 5 missing edge fns (check_in+GATE6, fund_quest, issue_nonce, apply_proposal, claim_verify) + spec geofence/trust-tier + spec Google-Places ETL (dedup/category-map/licensing/coverage_baseline denominator) — ทั้งหมดยังไม่มีใน 3.3, blocker ของ loop+density gate
7. W2 FIELD: ground survey Nimman catchment — นับ F&B operator 4-10 สาขา → เคาะ PRO_TIER_ENABLED (ถ้า <~30 ยุบ Pro เป็น add-on); ยังไม่จ้าง agent (รอ agent app ~W8)
8. W2 TEAM: เริ่ม hiring pipeline Flutter + Web/Counter eng (lead ~3-6 wk) เพื่อให้พร้อม onboard ~W4 build ขนาน money-plane

### B.4 Team by Phase
- P0 (W0-W6): 2 founders (CEO/BizOps + CTO/money-plane lead) ลงมือเอง; fractional DPO + ทนาย fintech/PDPA/tax + CPA appointed (long-lead, อย่ารอ). ยังไม่มี FTE eng/agent. Burn ต่ำ
- P1 (W4-W14): + Flutter eng (consumer+agent app) + Web/full-stack eng (Refine merchant/admin + Counter PWA). ถ้างบพอ BE#2 ทำ worker/PSP webhook/glue เพื่อ unblock founder/CTO ให้โฟกัส hot-path posting. Core ~4-5 คน
- P2 (W8-W22): + Ops/Field lead (City Manager, senior ops, พิสูจน์ merchant ROI หน้างาน) + agent strike team ramp 3-4→8-10 (freelance 3% WHT, KPI-bound, ห้ามผูกตาราง) + Content Moderator 0.5-1 FTE (~W12 เมื่อ proposal volume พุ่ง). lead-to-agent ratio 1:6-10. Burn พุ่งสุด (agent payroll ~120k-220k/mo peak)
- P3 (W16-W30): + Growth/marketing 1 คน (~W22 สำหรับ consumer launch); agent ลดเหลือ steward portfolio (retainer 2,500฿/mo × ~5). Data/Analyst (อาจเป็น founder/ops ทำ) รัน measurement
- P4 (post-pilot): ถ้า GO → เพิ่ม eng สำหรับ scale features (identity_graph/Sybil/sponsored-quest) + city_manager เพิ่มสำหรับ District #2 (graduate best agent ตาม B.3.3). Realistic small-team ตลอด pilot = 5 core + fractional + agent 3→8

### B.5 Top Risks
1. **Legal opinion lead time (~6-10 wk) เป็น critical path จริงของทั้งโรดแมป — ถ้าไม่ engage ทนาย W0 จะ block money-live แม้ build เสร็จ (E1/E2 พร้อมแต่เปิดเงินจริงไม่ได้)**
   - 🛡 engage ทนาย+DPO+CPA W0 วันแรกพร้อม question list ที่ doc วางไว้ (compliance-by-construction → ทนายแค่ยืนยัน posture ไม่ต้อง redesign); รัน build ขนานเต็มที่ระหว่างรอ opinion; sequence E3 surfaces ให้ Counter/escrow พร้อมพอดีตอน money-live
2. **Merchant willingness-to-pay / incrementality break-even ~46% = core unproven business risk — ที่ base case 20-30% ร้านขาดทุน, เงินแก้ไม่ได้ ถ้าไม่ปิด ทั้ง first-revenue path + LTV:CAC พัง**
   - 🛡 wire redemptions.visitor_type=new|returning ตั้งแต่ redemption path แรก (E2) เพื่อวัดจริงต่อร้าน; sales script quote break-even ไม่ใช่ best-case 60%/+32%/ROAS 2.9×; corrective lever B3 (cap reward COGS + cap redemptions/เดือน) ถ้าวัด <25%; Gate B กั้นก่อน scale
3. **Field-agent payroll (~120k-220k/mo peak) = recurring cost ใหญ่สุดก่อนมีรายได้, duration ผันตาม agent velocity ที่ยังไม่พิสูจน์ = runway risk #1 (เงิน/risk ที่ยังไม่รู้, ต่างจาก eng ที่รู้ได้)**
   - 🛡 ramp agent เป็นขั้น (3-4 seed-only ก่อน, ไม่จ้างเต็ม 10 day-1); seed-only เริ่มได้ที่ agent app ไม่ต้องรอ money loop; clawback 90 วัน + quality/merchant-quality multiplier + density cap (กัน farm) + retainer ผูก KPI; ถือ runway buffer ≥9-12 เดือน; วัด velocity/conversion เร็วใน P2 ก่อนเทเงินเต็ม
4. **COGS accumulator (per-merchant monthly, FOR UPDATE) ยังไม่มี source implementation — จนสร้างเสร็จ cap เป็น detect-after-drain (S4 nightly) ไม่ใช่ prevent-at-mint → real GRANT อาจ over-mint ก่อน detect**
   - 🛡 embed organic grant/redeem edge-fn per-merchant COGS accumulator ใต้ FOR UPDATE เป็น required build artifact ใน E1 (M1 gate); ห้าม unlock real GRANT (Gate 2a) จนกว่า accumulator live ไม่ใช่แค่ B1/B2 set
5. **money-plane bus-factor 1 (founder/CTO SPOF บนเส้นเงิน, senior+careful) — bug ในเส้นเงิน = loss จริง/legal; correctness ที่ app layer พึ่งวินัยคน (doc 05 ยอมรับ C2 correctness=7)**
   - 🛡 DB invariant + money_writer sole INSERT-er + 100% coverage gate บน packages/money + pgTAP เป็น referee สุดท้าย; junior ห้ามแตะ ledger/posting/gate fn; pair/review ทุก ledger change; BE#2 ทำ glue/worker รอบ money core ให้ founder โฟกัส hot-path
6. **Density Gate 'coverage ≥90%' วัดเป็น single query ไม่ได้จนเพิ่ม coverage_baseline denominator + Google Places ETL (ยัง unspecified) → block 'ปิด gate ได้จริง' = block marketing go/no-go (Gate A)**
   - 🛡 spec + build coverage_baseline denominator + Places seed ETL (dedup/category-map/licensing/refresh) เป็น blocker-priority ใน E2/E4; ทำ density-gate query เสร็จก่อน strike team ปิด saturation (W18-20)
7. **C1 Coins-non-e-money เป็น residual legal risk: BoT substance-over-form — ถ้า redemption network กว้าง หรือ marketing สื่อ 'Coins = X บาท' อาจถูกตีเป็น e-money แม้มี no-user-funding invariant; เป็น opinion ไม่ใช่ guarantee**
   - 🛡 enforce no-user-funding invariant + Coins = promotional reward/non-cashable/no-P2P/expiring ในทั้ง T&C และ UX copy; ห้าม artifact ใดแสดง Coin/baht value (postcard ไม่มีตัวเลขเงิน); ได้ opinion ลายลักษณ์อักษร on file ก่อน mint Coin จริงตัวแรก; sponsor:platform_goodwill partition ไปก่อน (dedicated account post-sign-off)
8. **Field Agent misclassification (freelance vs ลูกจ้าง) = ความเสี่ยงภาษี+SSO ย้อนหลังใหญ่สุด; stewardship retainer 2,500฿/mo คงที่เป็นจุดเสี่ยง reclassify เป็นลูกจ้าง**
   - 🛡 C6 opinion + สัญญา agent เสร็จก่อนจ่ายก้อนแรก (~W4); ผูก retainer กับ KPI ไม่ผูกตาราง/กะ/บังคับบัญชา; agent เลือกเวลา/territory เอง; เปลี่ยนพิจารณาลูกจ้าง (ภงด.1+SSO) เมื่อ >~20 FTE; ออก 50-ทวิ event-based ทุกจุดจ่าย

---

## C. ปรับจาก Critique (ต้อง fold เข้าแผนก่อนเริ่ม)

รอบ critique จับจุดที่ต้องแก้ — ถือว่าเป็น **ส่วนหนึ่งของแผน** (override ตัวเลข/ลำดับใน §A ที่ขัดกัน):

### C.1 Dependency / ลำดับ ที่ต้องแก้
1. **Gate B ต้องตั้งที่ ~46% (break-even) ไม่ใช่ 30%** — หรือบังคับปรับ COGS (B3 lever) *ก่อน* ตัดสิน scale; ห้าม scale ย่านบนร้านที่ขาดทุนเชิงโครงสร้าง
2. **ขายแพ็กรายปี (first revenue) ต้องมี VAT-registered + Merchant Agreement + นโยบายคืนเงิน (B8 REFUND_GRACE) บนโต๊ะก่อน** — ไม่ใช่แค่ C6 (สัญญา agent); การรับเงิน prepaid 1 ปี = deferred-revenue + ภาระคืนเงิน
3. **B1/B2 COGS cap มี circular dependency** — seed จาก pricing model (ค่า conservative) ที่ Gate 2a → แล้ว re-calibrate จาก live data หลัง money-live (ระบุชัดว่าร้านชุดแรกขายบน model-based cap ที่อาจขยับ)
4. **anti-self-redemption (เส้น e-money) ตอน money-live ใช้ arm device+payment-hash+kyc-hash ที่ดึงเข้า m#1 แล้ว (doc04 §2)** + gate goodwill-at-scale/cross-merchant breadth ไว้ที่ m#3 (transitive graph) — อย่าเปิด breadth เต็มก่อน arm ครบ
5. **S6 recon worker (pg-boss/แยก process) เป็น deliverable แยก + Gate-2b dependency** — ไม่ fold ใน E4 4 dev-wk; solvency anchor ต้องรันก่อน money-live
6. **DPA+SCC กับ Supabase ต้องเซ็นก่อนเก็บ location PII ใดๆ รวม agent seed (~W8)** — เป็น hard predecessor ไม่ใช่แค่ก่อน consumer launch

### C.2 Realism (เผื่อเวลา/คน)
1. **E3 (5 surface, ~21 dev-wk, 2 eng) แน่นเกินไป** — Counter <5s + AHA<60s + trilingual ไม่มี slack → เพิ่มคน / ลด scope pilot / ยืดเวลา
2. **ทีม core 5 ขาดคนดู DevOps/infra** (Supabase+NestJS+worker+Redis+PSP-webhook+CI) — money system ต้องมีเจ้าของ infra ชัด (จ้าง/outsource)
3. **legal 6-10 wk เป็น "พื้น" ไม่ใช่ค่ากลาง** — เผื่อ buffer + fallback ถ้า opinion กลับมาแบบมีเงื่อนไข (เช่นให้แคบ redemption network)
4. **agent payroll window อาจยืด** (velocity ยังไม่พิสูจน์) — ถือ runway buffer ≥9-12 เดือน, วัด velocity/conversion เร็วใน P2 ก่อนเทเงินเต็ม
5. **money-core ~37 dev-wk understate ledger** — append-only/no-backfill ทำให้ทุก bug = loss จริง; เผื่อเวลา E1

### C.3 Gaps (track/งานที่หายไป — ต้องเพิ่ม)
1. **QA / E2E test track** เป็นงานหลัก (cross-surface loop: Flutter check-in → NestJS grant → Counter redeem + load test Counter <5s + fraud-path harness)
2. **Security review / pentest ก่อน money-live** (escrow/PII/payout bank/rotating-QR + JWT-claim-drift audit + PSP webhook replay) = gate ก่อน Gate 2b
3. **App-store / Play review lead time** (Apple Guideline 4.8 Sign-in-with-Apple, financial-app scrutiny, รอบ reject) — เผื่อ buffer ก่อน soft launch; Counter PWA ไม่ติด แต่ consumer app ติด
4. **PSP onboarding/KYB 3-8+ wk = hard gate** (loyalty/escrow model ชวนตั้งคำถาม) — เพิ่ม milestone "PSP-approved (production settle)" ก่อน Gate 2b
5. **Merchant support/success owner ช่วง pilot** — ดูแล onboarding/escrow top-up/dispute หน้าเคาน์เตอร์/redeem-fail (S1/S4 เป็น manual-via-ops) ต้องมีคนรับผิดชอบชัด
6. **Ledger backup/PITR restore-drill** ที่ Gate 2b (append-only ledger backfill ไม่ได้) — คู่กับ breach drill
7. **B1/B2 calibration owner + date + input-source pinned** (finance+founder+legal ร่วม) — เป็น param ที่เสี่ยง stall gate มากสุด
8. **Checklist กัน marketing เข้าข่าย ม.8** (ห้าม "100 คนแรกได้ X" / leaderboard ชิงรางวัล / vote ชิงของ) — owner ชัดตอน growth hire เข้า ~W22
9. **Wind-down posture ถ้า Gate B NO-GO** — Coins/escrow ค้างในระบบ: นโยบาย honor-until-expiry / refund (ผูก C2 escrow legal + คุ้มครองผู้บริโภค)

---

## D. Track Details

## 1. Engineering Track. Build-order EPICS E0-E4 to the Nimman pilot, ~70 dev-wk (BE x2 + Flutter x1-2 + FE-web x1 + tech-lead). Money-plane is the critical chain: money_writer sole ledger INSERT-er; gate+post in one plpgsql fn per txn under FOR UPDATE; session-mode pool only.

---

## 2. Field-Ops & Merchant Recruitment Track

> **บทบาท:** แทร็กฝั่งซัพพลาย + แก้ cold-start — งานภาคสนามบนพื้นที่ ~1.5 กม. ของนิมมาน หลักการ: *สร้างระบบกว้าง แต่อัดข้อมูลแน่นในเขตเดียวจนผ่าน Density Gate ก่อนเปิด consumer* (แผนที่ว่าง = ตัวฆ่าอันดับ 1)

```
(D) WTP Validation ──► ต้องผ่านก่อน commit งบ full build
        ▼
(A) Strike Team ──► (B) Saturation ──► [DENSITY GATE] ──► Consumer Launch
        └──► (C) Merchant Onboarding ──────────┘
```

### 2.A Strike Team (recruit + train)
- **CMU/Payap students** — ถูก+เยอะ+รู้จักนิมมาน (local knowledge ฟรี); จ้างผ่าน FB หางาน/บอร์ดคณะ/LINE OpenChat + referral bounty; 5-10 agents + 1-2 ops lead; คัดด้วย **paid trial** เดิน 3 ร้าน
- **ฝึกครึ่งวัน + คู่บัดดี้:** กฎทอง "agent ไม่เขียน live — ทุก edit = change_proposal"; รูป ≥5/ร้าน กล้องสด + GPS-80m + EXIF + pHash; สคริปต์พิตช์ร้าน; ฝึก 5s redeem
- **ค่าตอบแทน (freelance 3% WHT, PromptPay รายสัปดาห์):** bounty 40-80฿/ร้าน (เมื่อ approved+activated) + activation bonus 50-150฿ + accept-rate multiplier (x0.7 ที่ <60% → x1.3 ที่ ≥90%) + merchant-close commission 8-12% + **90-day clawback**
- **Anti-fraud agent:** moderate ทุก proposal; accept-rate KPI ≥80% ผูก multiplier; จับรูปแกลเลอรี/GPS spoof/ยัดหลายร้าน/copy-paste → เตือน→พัก→ตัด+clawback + audit log

### 2.B Nimman Saturation
- พื้นที่ ถนนนิมมาน + ซอย 1-17 + One Nimman/Maya/Think Park → แบ่งโซนต่อ agent; เป้า 200-400 places (เน้น cafe) แต่ละร้าน ≥5 รูปสด + เวลา + ราคา
- จังหวะ: +15-20% coverage/สัปดาห์ → ~5-6 สัปดาห์; daily standup + weekly coverage review + re-sweep

**★ DENSITY GATE — 7 เกณฑ์ (hard go/no-go, ห้ามเปิด consumer จนครบ):**

| # | เกณฑ์ | เป้า |
|---|---|---|
| 1 | Coverage % (เทียบ ground-truth) | ≥ 90% |
| 2 | ร้านมี ≥5 รูปสดผ่าน moderate | ≥ 90% |
| 3 | เวลา+ราคาถูกต้อง | ≥ 90% |
| 4 | Escrow-enabled places | ≥ 15-20 ร้าน |
| 5 | Quest-ready (Cafe-Hop) | ≥ 12-15 ร้าน |
| 6 | Redeem-trained counter + QR table-tent วางจริง | ≥ 90% ของพาร์ตเนอร์ |
| 7 | Cafe-Hop loop ครบวง end-to-end | ≥ 1 loop (อุดมคติ 2-3) |

> **Owner:** Ops Lead + Founder ร่วมเซ็น

### 2.C Merchant Onboarding
- เป้า 15-25 ร้านคาเฟ่ (เดินถึงกันได้เพื่อสร้าง loop)
- **พิตช์:** *"พาลูกค้าใกล้ๆ ที่มีแรงจูงใจให้เดินเข้าร้าน — ไม่ใช่ ads · จ่ายเฉพาะตอนแลกจริง (escrow+COGS cap) · founder price ร้านชุดแรก"*
- **Claim + Verify 2 ชั้น:** claim → ยืนยันตัวตน → ยืนยันการเงิน (PromptPay/บัญชี escrow)
- **Escrow prefund** + COGS cap/anti-fraud ต่อร้าน · agent วาง **QR table-tent** + ฝึก 5s redeem (rotating QR/OTP ฝั่งร้าน)
- **First revenue:** แพลนรายปี Verified+Quest ~5,000-8,000฿ (PromptPay), เป้าชุดแรก ~10-15 แพลน *(ดู §C.1-2: ต้องมี VAT + Merchant Agreement + refund policy ก่อนรับเงิน)*

### 2.D Willingness-To-Pay Validation (สัปดาห์ 1-4 — ก่อน full build) ⭐
> ลดความเสี่ยงธุรกิจหลัก: เจ้าของร้านยอมจ่ายจริงไหม + ดีลคุ้มไหม (break-even ~46%) — พิสูจน์ก่อนทุ่มงบ
- กลุ่มทดสอบ: 5-10 เจ้าของคาเฟ่นิมมานจริง คละขนาด
- วิธี: (1) **Paper/Concierge test** (mockup + การ์ดราคา คุยตัวต่อตัว วัดปฏิกิริยาราคา) · (2) **LOI/มัดจำ/pre-commit** (เงินจริง = สัญญาณเชื่อสุด) · (3) **Manual Cafe-Hop (Wizard-of-Oz)** รัน loop ด้วยมือ ปั้นลูกค้า 20-50 คนเดินจริง 3-5 ร้าน → วัด incrementality
- **เกณฑ์ผ่าน:** ≥50% เต็มใจจ่าย founder price + ≥3-5 LOI + สัญญาณ incrementality เข้าใกล้/เกิน 46% · **ไม่ผ่าน → หยุด/ปรับดีล/ปรับราคา ก่อน build**

### 2.E Effort / Cost / Milestones

| งาน | Person-Weeks | ต้นทุน (บาท) |
|---|---|---|
| (D) WTP Validation | 2-4 | 5k-15k |
| (A) Recruit+Train | 2-3 | 8k-20k |
| (B) Saturation (5-10 agents × 4-6 wk) | 20-40 | 60k-140k |
| (C) Merchant onboarding | 8-15 | 20k-45k |
| Ops lead overhead | 8-12 | 40k-80k |
| Misc | — | 10k-25k |
| **รวม** | **~45-75 PW** | **~150k-330k฿** |

**Milestones:** M1 WTP validated (wk4) · M2 strike team live (wk3-5) · M3 saturation 50% (wk7-8) · M4 first revenue ≥5-10 ร้าน (wk8-10) · M5 merchant loop ready (wk9-11) · **★M6 DENSITY GATE 7/7 (wk10-12)** · M7 consumer-launch ready (หลัง M6)

> **Dependencies:** (D)→ทุกอย่าง · agent app+moderation (build)→(B) · escrow+redeem→(C) · (B)+(C)→Density Gate→Consumer Launch

---

## 3. Legal, Compliance & Finance-Ops

> **บทบาทของ track นี้:** เป็น **rate-limiter ของทั้งโรดแมป** — งาน legal/finance หลายชิ้นมี lead time ยาว (ทนาย fintech ไทย, จด VAT, ตั้ง DPO, ขอ ม.8 permit) และเป็น **hard gate ก่อน "เงินจริงไหล" (BLOCKS-MONEY-LIVE)** ไม่ใช่ก่อนเขียนโค้ด. หลัก sequencing: **เริ่ม engage ทนาย + นักบัญชี + DPO ใน W0–W1 ทันที** เพราะ critical path ของ Nimman pilot ไม่ใช่โค้ด แต่คือ **legal sign-off ที่ปลด GRANT จริง**. ส่วนใหญ่ของ track นี้รัน **PARALLEL** กับ build (โค้ด ledger สร้างได้เลยเพราะ design วาง compliance-by-construction ไว้แล้ว) แต่มี **3 จุดที่ปิดประตู**: (1) ตั้ง COGS cap B1/B2 + bad-debt reserve B4 ปลด real-Coin GRANT; (2) legal sign-off ชุด C1/C2/C4 + DPO ปลด money-go-live; (3) ม.8 permit ปลดเฉพาะ engagement random-reward (ซึ่ง MVP **เลี่ยงทั้งหมด** → ไม่อยู่ใน critical path).

> **คำเตือน:** ทุกอย่างในนี้คือ **design guidance ไม่ใช่ legal advice** — RECOMMENDED posture ทุกตัวต้องผ่าน **ทนายไทยมีใบอนุญาต (สาย fintech/payment/PDPA/tax)** ก่อน go-live จริง (doc 02 §C disclaimer).

### 3.0 เส้นเวลาแบบสรุป (gate ปลดเมื่อไร)

| Phase | สัปดาห์ (รวมโรดแมป) | gate ที่ track นี้ปลด | คนรับผิดชอบหลัก |
|---|---|---|---|
| **L0 — Engage + intake** | W0–W2 | จ้างทนาย/นักบัญชี/DPO; ส่ง question list; เริ่ม VAT + entity | Founder/CEO |
| **L1 — Setup ขนาน build** | W2–W10 | DPO setup, VAT จดเสร็จ, ร่างสัญญา, เปิดบัญชี escrow แยก | DPO + Finance-Ops + Counsel |
| **L2 — Parameter lock** | W6–W12 | ตั้ง B1/B2 COGS cap + B4 reserve → **ปลด real GRANT** | Founder + Finance |
| **L3 — Money-live sign-off** | W12–W16 | legal opinion C1/C2/C4 on file + finance-ops พร้อม → **ปลด escrow/redeem จริง** | Counsel + Founder |
| **L4 — Pre-consumer-launch** | ก่อน density gate / marketing | PDPA self-service พร้อม, breach runbook drill, T&C/consent live | DPO + Eng |
| **L5 — Operate** | ตลอด pilot | payout รอบเดือน, PND.1/3/53 + 50-ทวิ, recon, agent WHT | Finance-Ops |

---

### 3.1 [BLOCKS-MONEY-LIVE] Engage Thai counsel ทันที + question list (lead time = ตัวกำหนด critical path)

**เริ่ม W0. lead time ทนาย fintech ไทย ~2–4 สัปดาห์ (engage→retainer), opinion รอบแรก ~4–8 สัปดาห์.** นี่คือ **งานที่ยาวที่สุดในทั้งโรดแมป** — ถ้าไม่เริ่มวันแรก จะกลายเป็น bottleneck ตอน build เสร็จ.

**สิ่งที่ต้องทำ (W0–W2):**
- จ้าง **fractional counsel 3 สาย** (อาจคนเดียว/สำนักเดียวถ้าครบ): (a) fintech/payment (BoT e-money, FIBA), (b) PDPA/data, (c) tax/labour. + นักบัญชี (CPA ไทย) + DPO (ดู 3.3).
- ส่ง **question list ที่ doc วางไว้แล้ว** (เอาไปคุยได้ทันที — แต่ละหัวข้อมี "ASK YOUR LAWYER THIS" เจาะจง).

**จัดลำดับคำถามตามว่า "ปิดประตูอะไร":**

| # | คำถาม (ASK YOUR LAWYER) | gate | ที่มา | ทำไมต้องก่อน |
|---|---|---|---|---|
| C1 | **Coins = e-money ตาม พ.ร.บ.ระบบการชำระเงิน 2560?** เกราะ = "user ไม่จ่ายเงินซื้อ Coins" (no-user-funding invariant) ไม่ใช่ closed-loop; มีเพดานจำนวน merchant ใน redemption network ที่ trip e-money ไหม | **BLOCKS-MONEY-LIVE** | 02 §C.1 / OD-C1 | ถ้าตอบว่า "เข้า e-money" = ต้องขอ license = pivot ทั้ง business model. ต้องรู้ก่อน mint Coin จริงตัวแรก |
| C2 | **Merchant escrow = รับฝากเงิน (FIBA)?** ค่าบริการการตลาด prefund, non-refundable-on-demand, ring-fenced, ห้ามกินดอกผล; refund แบบไหน/float เท่าไรที่ trip deposit-taking | **BLOCKS-MONEY-LIVE** | 02 §C.2 / OD-C2 | ปิดประตู prefund จริงตัวแรก + กำหนด refund clause ในสัญญา merchant |
| C4 | **Breakage destination ตอน EXPIRE/CHURN:** return-funder (default, risk ต่ำสุด) vs platform-keep vs escheatment — platform-keep ต้อง legal opinion + สัญญารองรับ | **BLOCKS-MONEY-LIVE** (hardcoded ใน canonical posting) | 02 §A.10 / OD-C4 / A2.10-#1 | posting EXPIRE/CHURN เป็น **first-class legal decision** ไม่ใช่ default ปริยาย — ต้องเคาะก่อนเปิด GRANT path ที่จะนำไปสู่ EXPIRE |
| C6 | **Field Agent = freelance (3% WHT, ภงด.3) หรือลูกจ้าง (ภงด.1+ประกันสังคม)?** เส้นแบ่งอยู่ตรงไหน; stewardship retainer 2,500฿/เดือนคงที่ทำให้ reclassify ไหม | **BLOCKS-BUILD** (ของ agent-payout flow) + risk ย้อนหลัง | 02 §C.5 / B.3.5 / OD-C6 | agent strike team เริ่มทำงาน W2–W4 → ต้องมี classification + สัญญาก่อนจ่ายเงินก้อนแรก. misclassify = ความเสี่ยงภาษี+SSO ย้อนหลังที่ใหญ่สุด |
| C7+C8 | **PDPA cross-border:** Supabase SG เข้าข้อยกเว้น cloud "no-third-party-access" หรือต้อง SCC ม.29 เต็ม; **DPO บังคับตาม ม.41 ไหม** (location tracking + profiling at scale) | **BLOCKS-CONSUMER-LAUNCH** | 02 §C.4 / OD-C7/C8 | ปลดเมื่อ consumer เริ่มเก็บ location จริง — ก่อน marketing. DPA+SCC ลงนามกับ Supabase ต้องเสร็จก่อนเก็บ PII จริง |
| C9 | **VAT 7% บน revenue line ไหนบ้าง** (take-rate/subscription/sponsored/data product); place-of-supply ของ affiliate ต่างชาติ | **PARALLEL** (จด VAT ก่อนเปิด, ดู 3.4) | 02 §C.5 / OD-C9 | จด VAT ก่อนเริ่มดำเนินการ (ม.85/1, 30 วัน) ไม่รอ 1.8M |
| C11–C13 | **gambling/lottery (ม.8 พ.ร.บ.การพนัน 2478):** random real-value reward, จับสลาก, contest community-vote ชิงของจริง | **ไม่อยู่ใน critical path ของ MVP** — engagement layer เลือก deterministic ทั้งหมด (ดู 3.6) | 08 §1.4 / OD-C11–13 | MVP ใช้ "ทำครบ X ได้แน่นอน" → **ไม่ต้องขอ permit**; เก็บคำถามนี้ไว้ post-pilot |

**ผลลัพธ์ที่ต้องการ:** **written legal opinion on file** สำหรับ C1/C2/C4 (BLOCKS-MONEY-LIVE) — ไม่ใช่แค่ "ทนายบอกว่าน่าจะได้". design ทำ compliance-by-construction ไว้แล้ว (no-user-funding invariant, segregated escrow, return-funder default) → ทนายแค่ **ยืนยัน posture** ไม่ต้อง redesign แต่ต้องได้ลายลักษณ์อักษร.

> **Effort:** Founder 1.5 person-week (W0–W2 intake + คุยรอบแรก) + counsel retainer. **Lead time จริง ~6–10 สัปดาห์กว่า opinion C1/C2/C4 จะ on file** → นี่คือเหตุผลที่ต้องเริ่ม W0.

---

### 3.2 [BLOCKS-MONEY-LIVE] Entity, contracts & escrow-account setup

**เริ่ม W1, ขนานกับ 3.1. lead time เปิดบริษัท + บัญชีธนาคารแยก ~2–4 สัปดาห์.**

**สัญญา/เอกสารที่ต้องร่าง (counsel + founder):**

| เอกสาร | gate | เนื้อหา load-bearing | dependency |
|---|---|---|---|
| **Merchant Quest/Loyalty Agreement** | BLOCKS-MONEY-LIVE | ระบุชัด prefund = **"ค่าบริการการตลาด/loyalty ชำระล่วงหน้า"** ไม่ใช่เงินฝาก; non-refundable-on-demand; refund เฉพาะส่วน uncommitted (ยังไม่ mint เป็น Coin); take-rate + VAT-inclusive; ใครรับ settlement risk (default = platform absorb) | C2 opinion |
| **Escrow / Coin T&C** (consumer-facing) | BLOCKS-CONSUMER-LAUNCH | Coins = **"promotional reward / สิทธิประโยชน์ส่งเสริมการขาย"** ไม่ใช่เงิน/stored value, ไม่มีมูลค่าเงินสด, non-cashable, no P2P, expiring; pre-expiry notice T-14/T-3 + grace ≥7 วัน | C1 opinion + doc 06 UX copy |
| **Field Agent Contract** | BLOCKS-BUILD (agent payout) | freelance/รับจ้างทำของ; เลือกเวลา/territory เอง, **ไม่มี fixed schedule/บังคับบัญชา** (คงสถานะ freelance); จ่ายตามผลงาน (task/commission/retainer **ผูก KPI ไม่ผูกตาราง**); clawback 90 วัน; ต้องมีเลขผู้เสียภาษี+KYC ก่อนรับเงิน | C6 opinion |
| **DPA + SCC (ม.29) กับ Supabase** | BLOCKS-CONSUMER-LAUNCH | cross-border safeguard; encryption at rest+in transit; no-third-party-access; region-portable | C7 opinion |
| **เปิดบัญชี escrow แยก (segregated client account)** | BLOCKS-MONEY-LIVE | ring-fenced, ไม่ปนเงิน OPEX, **ห้ามลงทุน/กินดอกเบี้ย** (กัน recharacterize เป็น deposit) | C2 opinion + ธนาคาร |
| **PSP onboarding** (Omise/2C2P/Fiuu) | BLOCKS-MONEY-LIVE | PSP เป็นท่อเงินมี license; settle THB; KYC/AML ของ payment = ภาระ PSP; แยก payment rail ออกจาก loyalty rail | — |

> **Effort:** Founder + counsel ~3 person-week ร่าง+เจรจา. **Lead time PSP contract ~2–4 สัปดาห์; เปิดบัญชี escrow ~1–2 สัปดาห์.** เริ่ม W1.

---

### 3.3 [BLOCKS-CONSUMER-LAUNCH] DPO + PDPA setup

**แต่งตั้ง DPO ใน W1 (fractional/outsourced ก่อน เพื่อคุมต้นทุน).** เหตุผล: core business = location tracking + loyalty profiling at scale → **เข้าเกณฑ์ ม.41** (RECOMMENDED default ตั้งแต่วันแรก); ไม่ตั้ง = ปรับสูงสุด 1M (เคส JIB รวม ~7M).

**งาน DPO + Eng (PARALLEL กับ build, ส่งมอบก่อน consumer-launch):**
- **Lawful-basis mapping ต่อ dataset** (W2–W4): location = explicit consent (conservative, granular opt-in ถอนได้); agent contract = contract basis; fraud = legitimate interest + เขียน **LIA balancing test**; tax = legal obligation; marketing = consent แยก.
- **Consent + audit log** (W4–W8, ร่วม Eng): ทุก consent มี timestamp + T&C version + lawful basis; แยก consent บริการหลัก vs marketing.
- **Self-service privacy center ใน app** (W6–W10, Eng owns build, DPO spec): access/rectify/erasure/restriction/portability/objection/withdraw + คิว backend จัดการ DSAR. **erasure gate fail-closed** ผ่าน `cs_open_obligations(user_ref)` (D4, ห้ามลบถ้ามี dispute/fraud/suspense ค้าง).
- **Retention policy** (W2–W6): `retention_class` ต่อ ledger entry — `tax_7y` (redemption fact: amount/currency/merchant/place/timestamp) vs `behavioral_short` (movement graph/GPS trail); raw GPS ของ agent ≤90 วัน; "เก็บ fact ไม่เก็บ graph".
- **Breach runbook + on-call** (W6–W10): **risk-tier classifier** (no-risk = ไม่แจ้ง / risk / high-risk) — **อย่า hard-code 72h ตายตัว**; ใช้เส้นทางปกติ 72ชม. + safety valve ขยาย 15 วัน + justification; emit ผ่าน path เดียว (DPO console) + 2-person + deep-link allow-list (D6, กัน mass-phishing). **ต้อง drill 1 รอบก่อน launch.**
- **k-anonymity gate ของ data product** (post-pilot, แต่ spec ตอนนี้): k≥5 external + suppression + generalize เวลา/พื้นที่.

> **Effort:** DPO ~4 person-week กระจาย W1–W12 (spec+oversight) + Eng ~3 dev-week (privacy center + consent log + breach emit path). **Gate:** privacy center + breach runbook drill เสร็จ **ก่อน consumer เก็บ PII จริง / ก่อน marketing**.

---

### 3.4 [PARALLEL → BLOCKS-MONEY-LIVE] VAT registration + accounting/WHT + finance-ops

**เริ่มจด VAT ใน W1.** จดทะเบียน **ก่อนเริ่มดำเนินการ ไม่รอ threshold 1.8M** (ม.85/1 ให้ 30 วันหลังเกิน — แต่ B2B SaaS โตเร็วทะลุเร็ว, clock ไม่ปรานี). lead time จด VAT ~1–3 สัปดาห์.

**Accounting + tax setup (นักบัญชี + Finance-Ops, PARALLEL):**
- **จด VAT 7%** ครอบทุก revenue line: subscription + take-rate + sponsored + data product (ทุกอย่างเป็นบริการในไทย) → ระบบต้องออก **tax invoice (ภพ.20) + แยก VAT ทุก revenue line**; default VAT-inclusive (B.7/A2.10-#7).
- **WHT flow 2 ทิศ** (ผูกกับ S4 payout subsystem ที่ build อยู่):
  - **ขาเราจ่าย agent:** หัก 3% (freelance), ยื่น **ภงด.3**, ออก **50-ทวิ ณ จุดจ่ายทุกครั้ง** (event-based) + เก็บ running number; reserve-hold 30% ของ activate_real bounty; clawback netting รอบถัดไป (B.3.6).
  - **ขา merchant หักเรา:** merchant นิติบุคคลหัก 3% จาก service fee → ยื่น **ภงด.53**, เราได้ 50-ทวิ มาเครดิตภาษี.
  - ถ้าบาง agent classify เป็นลูกจ้าง → **ภงด.1 + ประกันสังคม** (ตาม C6).
- **★ คำตัดสิน decoupling (load-bearing):** **อย่า couple การ generate 50-ทวิ เข้ากับ monthly remittance job** — 50-ทวิ ผูกกับ **event การจ่าย**, ส่วนนำส่ง ภงด. (ภายใน 7 วันสิ้นเดือน, e-filing 15 วัน) ผูกกับ **รอบเดือน**. ระบบ payout ต้อง generate 50-ทวิ ณ จุดจ่าย + export ภงด.1/3/53 แยกรอบเดือน. ออก 50-ทวิ **สรุปรวมรายเดือน** (ไม่ใช่ต่อรายการ), เกณฑ์ ≥1,000฿/เดือน deterministic, payout <1,000฿ สะสมยกไป (B.3.6).
- **VAT remittance** (`VAT_REMIT` = output − input, branch-conditional ผ่าน `vat_carryforward`) + **WHT remittance** (`WHT_REMIT` net 0 ต่อ cycle) — reconcile รายเดือน.

**Finance-ops เพื่อรัน payout (ผูกกับ S4 build):**
- **SoD เด็ดขาด:** คน "สร้าง" payout (Finance/Payout role) ≠ คน "อนุมัติ" (Owner/City Manager) — `CHECK (created_by <> approved_by)`; + ผู้อนุมัติ bank-change ≠ ผู้สร้าง batch ที่จ่าย payee นั้น (กัน four-eyes bypass).
- **จ่ายจาก `bank_settlement` เท่านั้น** (เงิน `psp_suspense` unsettled จ่ายไม่ได้, A.8.11); batch release ผูก A.8.2s solvency + payable-coverage check.
- **Reconciliation รายคืน + intraday:** reconcile ledger ↔ bank/PSP statement; failed-payout → `payout_suspense`; unclaimed >90 วัน → `escheatment_liability` (ต้อง legal sign-off window ต่อ jurisdiction, C5/A2.10-#5).
- **bank-change cool-down 72h** (B5 default) + notify out-of-band ทุก channel ก่อน payout เข้าเลขใหม่.

> **Effort:** นักบัญชี ~2 person-week setup + recurring; Finance-Ops ~ตั้งกระบวนการ + รัน. S4 build เป็นของ track engineering แต่ **finance-ops process + tax config เป็นของ track นี้**. **Gate:** tax config + payout SoD process พร้อม **ก่อน payout จริงตัวแรก** (agent ตัวแรกครบ approved task / merchant payout ตัวแรก).

---

### 3.5 [BLOCKS-MONEY-LIVE] Parameter blockers — ตั้งค่าที่ต้อง human decision

**เคาะใน W6–W12 (หลัง pricing model + early merchant data, ก่อนเปิด real GRANT).** เหล่านี้คือ **founder/finance call** ที่ design ทำ machinery ไว้ครบแล้ว แต่ **ค่าตัวเลขยังว่าง → fail-closed**.

| # | พารามิเตอร์ | gate | default แนะนำ / วิธี calibrate | dependency |
|---|---|---|---|---|
| **B1** | `REWARD_PER_REDEMPTION_CAP_THB` | **BLOCKS-MONEY-LIVE** — inert+fail-closed; **real GRANT เปิดไม่ได้จนตั้ง** | calibrate จาก ~46% break-even (B.6); ถ้า measured incrementality <25% → ใช้ reward-cap เป็น corrective lever (ไม่ลด take-rate) | pricing model + early redemption data |
| **B2** | `MERCHANT_MONTHLY_COGS_CAP_THB` | **BLOCKS-MONEY-LIVE** เช่น B1 | calibrate ต่อ tier; measurement = `Σ(REDEEM thb_settlement funder=merchant/เดือน)` | เดียวกับ B1 |
| **B4** | bad-debt reserve size (`merchant_receivable`) | **BLOCKS-MONEY-LIVE** ก่อนเปิด GRANT จริง | sized = chargeback+funder-default rate × outstanding backing เฉลี่ย; SEAM-2 freeze ที่ 100%, WARN 70%; + reserve-adjusted haircut ใน payable_coverage | chargeback rate estimate |
| **C4** | breakage destination | **BLOCKS-MONEY-LIVE** (ดู 3.1) | return-funder (default); platform-keep ต้อง legal opinion | C4 opinion |
| **B5** | `BANK_CHANGE_COOLDOWN_HOURS` | PARALLEL (default ได้) | 72 | — |
| **B9** | breakage fee ตอน expire | PARALLEL (default ได้) | 0% ปีแรก (trust) | — |
| **B6/B7/B8/B10** | PSP fee GROSS / banker's rounding / refund grace 30 วัน / micro-redeem free <30฿ | PARALLEL (default ได้, ยืนยันกับ finance) | ตาม OD-B | — |
| A2.10-#2 | goodwill dedicated account + BoT classification | **ไม่ block MVP** — ใช้ `sponsor:platform_goodwill` partition ไปก่อน (build-ready); dedicated = post-sign-off | — | C1 + goodwill scale |

> **★ จุดสำคัญ:** B1/B2/B4 + C4 เป็น **gate ที่ปลด "Coin จริงตัวแรก"** — ไม่ใช่งานทนาย แต่เป็น **founder + finance decision** ที่ต้องมีข้อมูลมารองรับ (pricing + chargeback estimate). machinery (mint-gate + S6 invariant + S4 detect) build เสร็จก่อนได้ แต่ **D7/CS-initiated GRANT path เปิดไม่ได้จน cap ถูก set** + ต้องยืนยัน **organic grant/redeem edge-fn embed per-merchant monthly COGS accumulator ภายใต้ FOR UPDATE** (A2.4 residual, required build artifact — ไม่งั้นเหลือแค่ detect-after-drain).

> **Effort:** Founder + Finance ~1.5 person-week (workshop + calibrate). **Lead time:** ต้องมี pricing model lock + early merchant/redemption data ก่อน → ทำได้จริง ~W8–W12.

---

### 3.6 [PARALLEL — ไม่ block MVP] Gambling/lottery posture สำหรับ engagement layer

**ไม่อยู่ใน critical path ของ Nimman pilot** — แต่ต้อง enforce ตั้งแต่ build เพื่อไม่ให้ feature หลุดเข้าโซน permit.

- **MVP engagement = deterministic ทั้งหมด** → **ไม่ต้องขอ ม.8 permit**: "ทำครบ passport → ได้กาแฟฟรีแน่นอน" (ผ่าน money-gate), ไม่ใช่ "หมุนลุ้น", ไม่ใช่ "X คนแรกได้" (latency-race = chance-adjacent, OD-C12).
- **ความแปรผัน/เซอร์ไพรส์ทั้งหมดไปอยู่ที่ Sparks** (XP ฟรี ไม่มีมูลค่า → ไม่เข้าพนัน, ไม่แตะ e-money). **Coins = deterministic + gated เสมอ.**
- **Build-time enforce:** feature-flag ของ random-real-value mechanic (spin/scratch/gacha/lucky-draw) **default OFF + เปิดไม่ได้ถ้าไม่มี approval reference** (ม.8 permit จากกรมการปกครอง + legal sign-off on file) — ผูก tracker C11/C12. **แม้ free-entry/sponsor-funded ก็ยังต้องขอ permit ก่อน** — อย่าปฏิบัติเหมือน ship-ready.
- **transitivity invariant:** ห้ามฟอกความสุ่มผ่าน cosmetic แล้วให้ cosmetic นั้นปลด Coin → ถือเป็น chance-for-value เต็มตัว.
- **เลื่อนไป post-pilot (ไม่ block):** C13 UGC photo contest (bystander face-blur mandatory + publish consent — BLOCKING-GA ถ้าจะเปิด), C14 prize/creator-payout WHT (จัดการที่ S4), BLE/nearby-people (ตัดจาก V1, PDPA อ่อนไหวสุด).

> **Effort:** Eng ~0.5 dev-week (build-time flag guard) + counsel pointer เท่านั้นใน pilot. งาน ม.8 permit จริง = post-pilot ถ้าตัดสินใจเปิด random reward.

---

### 3.7 Dependencies & critical-path สรุป

**Critical path สู่ money-live (เรียงตาม lead time):**
1. **W0** — engage counsel + ส่ง question list (lead time ยาวสุด ~6–10 wk → opinion C1/C2/C4)
2. **W1** — จด VAT + เปิดบัญชี escrow แยก + ตั้ง DPO + PSP onboarding (ขนาน)
3. **W2–W10** — ร่างสัญญา (merchant/agent/escrow/DPA) + DPO/PDPA setup ขนาน build
4. **W6–W12** — ตั้ง B1/B2/B4 + C4 (ต้องมี pricing + early data) → **ปลด real GRANT machinery**
5. **W12–W16** — legal opinion C1/C2/C4 on file + finance-ops พร้อม → **ปลด escrow/redeem จริง** (money-live)
6. **ก่อน density gate / marketing** — privacy center + breach drill + consent live → **ปลด consumer-launch**

**Hard couplings ที่พังถ้าลืม:**
- agent ทำงานก่อน C6 classification + สัญญาเสร็จ = ความเสี่ยงภาษี/SSO ย้อนหลัง (ต้องเสร็จก่อนจ่ายก้อนแรก ~W2–W4).
- เปิด real GRANT ก่อน B1/B2 set = fail-closed REJECT (ระบบกันเอง) — แต่ต้อง set ก่อน demo/pilot redemption.
- เก็บ location PII ก่อน DPA+SCC ลงนาม = PDPA cross-border violation.
- มี payout จริงก่อน SoD + 50-ทวิ flow พร้อม = tax-compliance breach (WHT leg หาย).

> **หมายเหตุทีมเล็ก:** track นี้ใช้คนน้อย (Founder + fractional counsel/DPO/CPA + Finance-Ops part-time) แต่ **lead time ยาว** → เป็น scheduling risk ไม่ใช่ effort risk. กฎเดียว: **เริ่มทุกอย่างที่มี lead time ยาวใน W0–W1 พร้อมกัน** (counsel, VAT, DPO, escrow account, PSP) แล้วปล่อยให้รันขนานกับ build.

---

## 4. Product, Parameters & Pilot GTM

> **เป้าหมายของ track นี้:** แปลง design 11 docs ให้เป็นแผน **go-to-market ของ Nimman Pilot** ที่จับต้องได้ — นิยาม pilot, เคาะ parameter ก่อน money-live, motion การเปิด consumer, แผนวัดผล, และเส้น go/no-go ที่ชัดว่า "pilot สำเร็จแล้วปลดอะไร".
> **หลักการคุม track:** *build broad, seed dense* — ห้ามยิง consumer marketing เข้า Nimman จนผ่าน **Density Gate** ครบ 7 ข้อ (doc 04 §1.4). Empty map = ตัวฆ่าอันดับ 1.
> **เจ้าของ track:** Founder/CEO (param + go/no-go) · Growth/GTM lead (launch motion + channel) · Data/Analyst (measurement) · Field-Agent Manager (density + merchant) — ทำงานทับ track 1 (build) และ track 3 (legal/ops) ที่อ้างถึงด้านล่าง.

---

### 4.1 PILOT DEFINITION — "Nimman Cafe-Hop"

**Scope (locked จาก doc 04 §1.1–1.4):**

| มิติ | ค่า pilot | ที่มา |
|---|---|---|
| District | **Nimman เดียว** (~1.5km: Soi 1–17 + One Nimman + Maya) | doc 04 §1.2 |
| Featured quest | **1 quest "Nimman Cafe-Hop"** (`is_featured`, `N_OF_M` 3-of-5) + standard quest ≥2 (รวม ≥3 active ตาม gate) | doc 04 §1.4 row 5 |
| ร้าน escrow จริง | **15–25 cafes** ที่ผ่าน Density Gate (gate bar ขั้นต่ำ = 5 merchant settled; pilot target 15–25 เพื่อ loop มีตัวเลือกพอ) | doc 04 §1.1, §1.4 row 6 |
| Loop ที่พิสูจน์ | agent seed → merchant claim+verify+prefund escrow → consumer discover → check-in (geofence) → earn Sparks/quest progress → complete quest → mint Coins (escrow-backed) → redeem ของจริงที่เคาน์เตอร์อีกร้าน **<5s** (merchant-initiated rotating QR/OTP, server-burn) | doc 04 §1.1 |
| Duration | **Seeding 4 wk → Soft launch 2 wk → Full pilot 6–8 wk** (~12–14 สัปดาห์รวม วัด retention/off-season ได้ ≥1 รอบเดือน) | strike-team playbook (doc 04 §1.4: gate ปิดที่ Wk 4) |

**Target users (ลำดับ priority — fast ROI ก่อน, retention ตาม):**
1. **Tourist + Digital nomad (PRIORITY 1 — เปิดตัว):** เก็บแต้มเร็ว, day-one shareable, proof-of-trip → ปิด loop เร็ว, พิสูจน์ incrementality ได้ไว (คนใหม่ล้วน = visitor_type มัก `new`). audience จริงของ Nimman = TH/EN-dominant (doc 04 §1.3 → ZH minimal ที่ Nimman).
2. **Local + Nomad ระยะยาว (PRIORITY 2 — retention base):** streak (weekly-consistency) + neighborhood leaderboard + community wall + contribution title → พิสูจน์ off-season retention (doc 08-social §2/§2.0).
3. **Chinese FIT = secondary** ที่ Nimman (WeChat login เปิดแต่ ZH ≥80% curated เท่านั้น); push ZH เต็มเลื่อนไป Chang Klan/Night Bazaar (doc 04 §1.3).

**Success / Fail criteria (go/no-go ของ pilot — เคาะตัวเลขก่อนเริ่ม):**

| มิติ | SUCCESS bar | FAIL trigger | วัดจาก |
|---|---|---|---|
| Density Gate (เงื่อนไขเข้า) | ผ่านครบ **7/7** ก่อน soft launch (coverage ≥90%, ≥5 รูป/place, ข้อมูลครบ 100%, TH/EN 100% ZH ≥80%, ≥3 quest, ≥5 escrow-merchant, ≥10 promo) | ไม่ผ่านภายใน Wk 6 = ปัญหา supply/agent | gate single-query (doc 04 §1.4) |
| **North-star: TTFS (time-to-first-stamp)** | median **< 60s** จากเปิดแอป→ `first_stamp_succeeded` ใน session แรก | median > 3 นาที หรือ first-stamp completion < 40% | `first_stamp_succeeded` event (doc 06 §2.2) |
| Loop completion (quest → redeem) | **≥ 30%** ของผู้เริ่ม Cafe-Hop ทำครบ quest; redemption ≥ **150–200 ครั้ง** ตลอด pilot | < 10% complete = loop พัง/รางวัลไม่จูงใจ | `quest_progress.status='completed'`, `redemptions.status='settled'` |
| **Merchant ROI / incrementality** | measured incrementality **≥ 30%** บน cohort ร้าน (พิสูจน์เข้าใกล้ break-even ~46% ด้วย param tuning); ร้านที่ ROI-positive ≥ 50% ของ cohort | < 25% = ต้องปรับ COGS structure ก่อน scale (Founder call, doc 02 B.6 #3) | `redemptions.visitor_type = new\|returning` (§4.4) |
| Redemption fraud | self-redeem / anomalous redemption **near zero** (< 0.5%) | spike จาก agent–merchant collusion z-score | `redemptions.review_status`, fraud_signals (doc 02 B.2.3) |
| Merchant retention | **≥ 70%** ของ paid merchant ต่ออายุ/ยัง active หลัง 90 วัน (= core unproven business risk) | < 50% paid-retention = WTP ไม่จริง | `subscriptions.status`, `agents.merchant_quality_score` |
| Off-season retention (local) | D30 retention local/nomad **≥ 25%** | < 10% = engagement layer ไม่ทำงาน | cohort retention |

---

### 4.2 PARAMETER DECISIONS — ก่อน money-live (เคาะใครเป็นเจ้าของ)

> **กฎเหล็ก:** `REWARD_PER_REDEMPTION_CAP_THB` (B1) + `MERCHANT_MONTHLY_COGS_CAP_THB` (B2) เป็น **inert-until-sized** — ถ้ายัง null → mint-gate **fail-closed REJECT ทุก path** → ทุก [SERVER-GATED] feature เปิดไม่ได้, real Coin GRANT ทำไม่ได้ (doc 02b A2.4 / OPEN_DECISIONS B1/B2). **นี่คือ blocking ตัวแรกของ money-live.**

| # | Parameter | ค่าแนะนำ (default) | สถานะ | เจ้าของ (ผู้เคาะ) | ที่มา |
|---|---|---|---|---|---|
| B1 | `REWARD_PER_REDEMPTION_CAP_THB` | calibrate จาก ~46% break-even; pilot เริ่ม **45฿ avg / cap ~60฿** ต่อ redemption | **BLOCKING** | Founder + Finance | OPEN_DECISIONS B1, doc 02 B.6 |
| B2 | `MERCHANT_MONTHLY_COGS_CAP_THB` | calibrate ต่อ tier (จาก sensitivity table 180 redemptions × 45฿ ≈ 8,100฿ face / ~4,050฿ จริง) | **BLOCKING** | Founder + Finance | OPEN_DECISIONS B2 |
| B3 | corrective lever ถ้า measured incrementality < 25% | **cap reward + cap redemptions/เดือน** (ไม่ลด take-rate ทั่ว, ลดเฉพาะร้าน proven-low) | ตั้งก่อน GA pricing | Founder | doc 02 B.6 #3, D.2 |
| — | `TAKE_RATE_PCT` | **10% flat ทุก tier** + `TAKE_RATE_MIN_EFF_PCT` 6% + taper threshold 300฿ + micro-free < 30฿ | LOCKED (config) | Founder/Finance ยืนยัน | doc 02 B.2 |
| — | Subscription tier price | free / **starter 390** / **growth 990** / **pro 1,690** (รายปี −2 เดือน); analytics_pro +390 add-on; multi-location +490/loc | LOCKED | Founder | doc 02 B.1 |
| — | Pro tier enable | **นับ F&B operator 4–10 สาขาใน Nimman+เป้าหมาย; ถ้า < ~30 → ยุบ Pro เป็น add-on** (`PRO_TIER_ENABLED`) | run catchment count ก่อน lock | Field-Agent Mgr + Founder | OPEN_DECISIONS B11, doc 02 B.1.0 #4 |
| — | Coin expiry + grace | pre-expiry notify **T-14/T-3**, grace ≥7 วัน, `REFUND_GRACE_DAYS` **30** | default ได้ | Founder/Legal (C4 dest) | doc 02 A.10.4, OPEN_DECISIONS B8 |
| — | Recurring-quest cooldown / per-merchant-per-cluster velocity cap | ตั้ง conservative (เช่น 1 redeem/quest/user; cooldown 24h) แล้ว tune | SET-BEFORE-BUILD | Founder + loyalty dev | doc 08-fw §1.7 mint-gate |
| — | breakage destination + fee | **คืน funder** (เสี่ยงต่ำสุด), breakage fee **0%** ปีแรก | **LEGAL sign-off ก่อน migration #1 go-live** | Founder + Lawyer (C4) | OPEN_DECISIONS C4, B9 |
| — | Agent bounty/commission | refresh_photos 15฿ · onboard 60฿ · activate_escrow 30฿ · activate_real 120฿ (70% now/30% reserve, clawback 90 วัน) · sales 20% MRR เดือนแรก · renewal 5% | LOCKED | Founder + Field-Agent Mgr | doc 02 B.3 |
| — | Bad-debt reserve (`merchant_receivable`) + auto-PAUSE threshold | ขนาดตาม chargeback+default rate; SEAM-2 freeze 100% / WARN 70% | ตั้งก่อนเปิด GRANT จริง | Founder + Finance | OPEN_DECISIONS B4, doc 04 §1.6 #5 |

**ลำดับการเคาะ:** Finance รัน calibration (B1/B2 จาก break-even) → Founder เคาะใน `platform_config` → Legal sign-off C4 (breakage dest) → ปลด fail-closed. **ห้ามเปิด redemption ก่อน B1+B2+C4+VAT(C9) ครบ.**

---

### 4.3 CONSUMER LAUNCH MOTION — Nimman

**Phase 0 — Seeding mode (Wk 0–4, ห้ามโฆษณา):** agent saturate ข้อมูล + onboard merchant + วาง printed QR table-tent + train 5s redeem. ผู้ใช้เห็น pin ได้แต่ไม่มี marketing (doc 04 §1.4). **Gate close = Manager sign-off ที่ Wk 4.**

**Phase 1 — Soft launch (Wk 5–6, หลัง gate ผ่านเท่านั้น):** ปลด in-mall activation (One Nimman/Maya) + micro-influencer + paid social **เฉพาะ Nimman** (doc 04 §1.4). เริ่มแคบ วัด TTFS + loop completion ก่อน scale spend.

**AHA < 60s onboarding (north-star = TTFS, doc 06 §2.2/§5.A):**
- **Zero signup wall:** browse/search/place/quest-detail/quest-start = guest 100%. Auth เด้งเฉพาะ first value-capture (first stamp).
- **AHA Home FIRST (S1, no gate):** render nearby content จริงด้วย coarse/IP-location; location-priming = **non-blocking bottom-sheet** (ไม่ block clock).
- **Persona branch (S2, deferrable):** เซ็ต hint tone/ภาษา (tourist เก็บเร็ว / local ใกล้บ้าน) แต่ **ไม่บังคับภาษา** (doc 06 §5.A, §1.8).
- **First-stamp = celebration-honesty:** provisional "กำลังบันทึกแสตมป์…" → **รอ server-confirm** ก่อน confetti+haptic (ห้ามฉลองแล้ว rollback — north-star event).

**Zero-state tourist hook (doc 08-social §1.3):**
- **single-stamp shareable ทันที:** check-in ครั้งแรก mint Lanna postcard + stamp artwork ของร้าน → แชร์ **RED/WeChat/LINE** 1 แตะ (ไม่ต้อง opt-in social, ไม่มี Coin/baht บน artifact = กัน e-money signal).
- **3-stop starter trail** (คาเฟ่+วัด+ตลาด) จบได้บ่ายเดียว → deterministic small real reward 1 ชิ้นในวันแรก (ผ่าน money-gate).

**Seasonal hook (ถ้า timing ใกล้เทศกาล):** ผูก festival passport กับเหตุการณ์จริง (Yi Peng/ลอยกระทง พ.ย. · ป๋าเวณีปี๋ใหม่เมือง/Songkran เม.ย.) + softener "กลับมาได้ปีหน้า" + aggregate-pressure budget/calm-mode (doc 08-social §1.4, §1.6). หมายเหตุ: festival/sponsored quest = DEFERRED schema-ready (doc 04 §1.2 row c) → เปิดเป็น layer ถ้า pilot ทับเทศกาล.

**Channels (priority):** (1) printed QR table-tent ในร้าน (agent วาง — highest-intent) · (2) In-mall activation One Nimman/Maya · (3) **LINE OA** (local/nomad) · (4) **RED/小红书 + nomad communities** (tourist/FIT virality, day-one shareable) · (5) micro-influencer ย่าน. **ทุก paid placement ติดป้าย "Sponsored/โปรโมต"** (doc 08-social §1.4).

---

### 4.4 MEASUREMENT PLAN

**North-star:** **TTFS — Time-to-First-Stamp** (median < 60s). ทุก surface First-Run→Home→Place→Check-in ออกแบบเพื่อบีบเวลานี้ (doc 06 §5.A).

**Guardrail metrics:** D1/D7/D30 retention (แยก tourist/local cohort) · loop-completion rate · redemption fraud rate (< 0.5%) · merchant paid-retention (90 วัน) · escrow burn rate (กัน empty-quest pause) · Coin breakage % (`ref_type=expiry`) · agent quality_score + merchant_quality_score.

**Incrementality experiment (BLOCKING ก่อน enable ROAS messaging — doc 02 B.6 #4):**
- **Primary instrument:** `redemptions.visitor_type = new | returning` จาก first-visit flag (per merchant). คำนวณ incrementality = สัดส่วน redemption ที่เป็น `new` (proxy ของ "ไม่มาถ้าไม่มี deal").
- **Design:** เปรียบเทียบ new-vs-returning ratio ต่อร้าน เทียบ baseline foot-traffic ก่อน-หลัง quest active; **base expectation 20–30%**, break-even **~46%**, 60% = upside เท่านั้น (ห้าม quote best-case ใน sales script — doc 02 B.6 #1/#2).
- **Strengthen (ถ้าทำได้):** staggered rollout / holdout — เปิด quest ต่างเวลากันข้ามร้าน cohort เพื่อแยก seasonal effect; cross-check redemption volume กับ POS/visit baseline.
- **Corrective trigger:** ถ้า measured < 25% → ปรับ B1/B2 (cap reward + cap redemptions/เดือน) ก่อน GA pricing (Founder call). **อย่าใช้ตัวเลข +32%/ROAS 2.9× ของ draft เดิม** (อิง 60% ล้วน, เปราะ).

**Cadence:** dashboard รายวัน (TTFS, loop, fraud) · review รายสัปดาห์ (retention cohort, merchant ROI) · go/no-go review ที่ Wk 6 (gate+TTFS) และ end-of-pilot (~Wk 14, ครบ metric matrix §4.1).

---

### 4.5 GO/NO-GO & WHAT A SUCCESSFUL PILOT UNLOCKS

**Go/No-Go gates (2 จุด):**
1. **Gate A (Wk 6 — เปิด full pilot ไหม):** Density Gate 7/7 ผ่าน **และ** soft-launch TTFS median < 60s + first-stamp completion ≥ 40%. ไม่ผ่าน = ขยาย seeding/แก้ onboarding ก่อน, ห้าม scale spend.
2. **Gate B (end-of-pilot ~Wk 14 — scale ไหม):** ผ่าน success matrix §4.1 — โดยเฉพาะ **3 ตัวชี้ขาดธุรกิจ**: (i) measured incrementality ≥ 30% (เข้าใกล้ break-even), (ii) merchant paid-retention ≥ 70% (WTP จริง = core unproven risk), (iii) loop completion + redemption volume ถึง bar. fraud near-zero เป็น hard guardrail (spike = no-go).

**SUCCESSFUL pilot ปลด:**
- **District #2 (Old City Temple Trail):** District Sequence ที่ locked = Nimman → **Old City** → Santitham → Chang Klan → Hai Ya → suburban (SYSTEM_PLAN §). Old City = temple-trail + sponsored/festival quest (TAT Songkran/Yi Peng) ที่ schema พร้อมแล้ว (DEFERRED → enable). ใช้ playbook + param ที่ calibrate จาก Nimman.
- **Chang Klan/Night Bazaar (#4):** ปลด ZH เต็ม + Alipay/WeChat first-class (Chinese FIT หนาแน่นจริง) — รอจน demand พิสูจน์.
- **Fundraise:** proof points ที่ deck ต้องมี = density gate ทำได้จริง + TTFS + measured incrementality (ไม่ใช่ assumption 60%) + merchant paid-retention + fraud-near-zero + unit-econ ที่ปิดได้หลัง param tuning.
- **Scale features (m#3+):** goodwill-at-scale (identity_graph + A.8.12 4-arm anti-self), full Sybil graph, sponsored-quest tooling, self-serve merchant quest creation, [LEGAL-CHECK] engagement (random-reward เฉพาะหลัง ม.8 permit), social layer V2.

**ถ้า NO-GO ที่ Gate B:** ปัญหาน่าจะเป็น merchant WTP/incrementality → ปรับ COGS structure (B3 lever) หรือ pricing ก่อน scale; **ห้ามขยายย่าน** บน unit-econ ที่ยังไม่ปิด.

---

> **Cross-track dependencies:** B1/B2/C4/C9 (track param+legal) บล็อก money-live → บล็อก redemption → บล็อก loop/incrementality measurement → บล็อก Gate B. Density Gate (track field-agent) บล็อก soft launch → บล็อก TTFS measurement → บล็อก Gate A. `redemptions.visitor_type` + `first_stamp_succeeded` (track build) บล็อก measurement plan §4.4.

---

## 5. Team, Budget & Runway

> ขอบเขตของส่วนนี้: วางแผน **คน-เงิน-runway** สำหรับทีมเล็ก runway-จำกัด ไปถึง **Nimman Pilot** เท่านั้น (ไม่รวม scale หลายย่าน/หลายเมือง ซึ่งเป็น P1+) ตัวเลขทั้งหมดเป็น **THB** และเป็น *rough range* — ทุกค่าผูกกับ economics ที่ lock ใน doc 02 §B (tiers 390/990/1,690 · take-rate 10% · agent bounty seed 35฿/onboard 60฿/activate_real 120฿ · steward retainer 2,500฿/เดือน · WHT 3% · CAC fully-loaded 408฿ Starter / 668฿ Pro · break-even incrementality ~46%).
> **หลักตัดสินงบ:** *build the SYSTEM broad once, then pour the budget into SEEDING the DATA dense.* ต้นทุน recurring ที่ใหญ่สุดก่อนมีรายได้คือ **field-agent payroll** ไม่ใช่ engineering — engineering เป็น one-off ก้อนหน้า, agent payroll เป็น burn ต่อเนื่องที่กิน runway.

---

### 5.0 ภาพรวม 4 phase (ผูกกับ track build อื่น)

| Phase | ช่วงเวลา (รวม) | สิ่งที่เกิด | คนหลักที่ใช้ | สถานะรายได้ |
|---|---|---|---|---|
| **P0 — Foundations** | M0 (~4–6 wk) | legal/DPO appoint, **set COGS caps B1/B2** (un-block GRANT), migration #1, hire core | founders + senior money-dev | 0 |
| **P1 — Build broad** | M1–M4 | vertical slice ของ Nimman Cafe-Hop loop (ledger→grant→redeem→counter) + 5 surface | full eng team | 0 |
| **P2 — Seed dense** | M3–M6 (overlap P1) | strike team saturate Nimman → **density gate ≥90% / 200–400 places** + agent ขาย annual plan = **first revenue** | field-agent strike team + ops lead + moderator | **first THB เข้า** (annual merchant plan) |
| **P3 — Pilot launch** | M6–M7 | consumer marketing เข้า Nimman *หลัง* density gate ผ่านเท่านั้น | growth + ops | take-rate เริ่มไหล |

> **dependency เหล็ก:** P2 (จ้าง agent เต็มทีม + จ่าย payroll) **ห้ามเริ่มก่อน** Counter PWA redeem + merchant claim/escrow + grant loop ใช้งานได้จริง (agent ต้องมีของไปขาย/สาธิต) — แต่ **seed-only tasks** (seed_new_place/photos/hours ผ่าน change_proposal) เริ่มได้ตั้งแต่ M2 ด้วย agent ชุดเล็ก เพราะไม่ต้องรอ money-plane. นี่คือเหตุผลที่ payroll ramp ขึ้นเป็นขั้น ไม่ใช่จ้างเต็ม 10 คนวันแรก.

---

### 5.1 (a) ทีมที่ต้องการ แยกตาม phase + ลำดับการ hire

#### 5.1.1 Core team (founding) — โครงสร้างเป้าหมาย 5–6 คน

| Role | จำนวน | รับผิดชอบหลัก | phase ที่ต้องมี | ระดับ/ความเสี่ยงถ้าผิดคน |
|---|---|---|---|---|
| **Founder/CEO–BizOps** | 1 (founder) | merchant willingness-to-pay (core risk), legal/finance coordination, fundraise, density-gate go/no-go | M0 | — |
| **Founder/CTO–Money-plane lead** | 1 (founder) | **NestJS money-plane + ledger + plpgsql gate fn + invariants** — งานที่ต้องการ dev *senior+ระมัดระวังสุด* ในทีม | M0 | **สูงสุด** — bug ในเส้นเงิน = loss จริง/legal; ต้องเป็นคนที่อ่าน double-entry + concurrency (FOR UPDATE/session-pool) ออก |
| **Flutter engineer** | 1 | consumer + agent app (codebase เดียว, role-gated), Mapbox/geofence/QR scan, l10n th/en/zh | M1 | mid–senior; UX "aha" สำคัญ |
| **Web/Full-stack engineer** | 1 | Next.js+Refine merchant+admin console, **Counter PWA <5s**, hybrid data-provider (read=Supabase/write=NestJS) | M1 | mid; ระวัง dual-writer trap (lint/wrapper) |
| **Ops/Field lead (City Manager)** | 1 | คุม strike team, territory assignment, density tracking, merchant pipeline, sales script | M2 | senior ops; เป็นคนที่ "พิสูจน์ merchant ROI" หน้างาน |
| **Content Moderator** | 0.5–1 | อนุมัติ change_proposals (agent ห้ามเขียน live), gate คุณภาพ data + จ่าย bounty | M2 | เริ่ม part-time/ทำเองโดย ops lead; full-time เมื่อ proposal volume สูง (M3+) |

> **money-plane = single point of correctness risk.** ถ้าทีมมีแค่ ~3 คน ให้ founder/CTO ถือ money-plane เต็มตัว และ "ห้าม" ให้ junior แตะ ledger/posting/gate fn (มี DB invariant + money_writer role เป็น referee สุดท้าย แต่ correctness ที่ application layer ยังพึ่งวินัยคน — doc 05 ยอมรับว่า C2 correctness=7 พึ่ง discipline). หากงบพอ ให้คนที่ 2 ของ backend ทำ worker/glue/PSP webhook (รอบ money core) เพื่อ unblock founder ให้โฟกัส hot-path posting.

#### 5.1.2 Fractional / external (ไม่ใช่ FTE) — ต้องมีตั้งแต่ M0

| Role | engagement | ทำไมต้องมี (blocking gate) |
|---|---|---|
| **DPO (fractional)** | retainer รายเดือน | **C8 blocking** — แต่งตั้งตั้งแต่วันแรก (โทษ PDPA สูงสุด ~1M + ceiling 5M); ดู data-residency SG+SCC |
| **ทนาย (Thai fintech/PDPA)** | project + on-call | **C1/C2/C6/C9 blocking-GA** — Coins-non-e-money opinion, escrow-not-deposit, agent freelance classification (3% WHT), VAT registration, gambling-law (เลี่ยง random reward) |
| **นักบัญชี/bookkeeper** | part-time รายเดือน | VAT filing, WHT/ภงด.3 รายเดือน (agent payout), payroll, ledger↔bank reconcile cross-check |

#### 5.1.3 Field-agent strike team — paid CMU/Payap students (the moat + the burn)

- **โครงสร้าง:** **5–10 คน** (เริ่ม 3–4 คน core ที่ M2, ramp ถึง 8–10 ที่ peak saturation M4–M5)
- **สถานะจ้าง:** **freelance 3% WHT** (C6) — จ่ายตามผลงาน (task bounty + commission + retainer ผูก KPI) *ห้ามผูกตาราง/กะ* เพื่อไม่ให้ reclassify เป็นลูกจ้าง (= ความเสี่ยงภาษี/SSO ย้อนหลังใหญ่สุด); เปลี่ยนพิจารณาเป็นลูกจ้างเมื่อ >~20 FTE
- **2 บทบาทในคนเดียว:** (1) saturate data (seed/photo/hours) + (2) onboard+ขาย subscription หน้างาน + วาง printed QR table-tent + train 5s redeem
- **lead-to-agent ratio:** 1 ops lead ต่อ ~6–10 agent (เกินนี้ต้องเลื่อน best agent เป็น city_manager/multi-territory lead ตาม graduation path B.3.3)

#### 5.1.4 ลำดับการ hire (sequence)

1. **M0:** founders (CEO + CTO/money) ลงมือเอง · แต่งตั้ง DPO + ทนาย + บัญชี (fractional) ทันที (legal เป็น long-lead, อย่ารอ)
2. **M1:** Flutter eng + Web eng (build ขนานกับ money-plane)
3. **M2:** Ops/Field lead → จ้าง agent **ชุดแรก 3–4 คน** (seed-only tasks เริ่มได้, ยังไม่ต้องรอ money loop)
4. **M3:** Content Moderator (เมื่อ proposal volume พุ่ง) · ramp agent เป็น **6–8 คน** เมื่อ merchant-onboarding loop พร้อมสาธิต
5. **M4–M5:** peak agent **8–10 คน** ช่วง push density gate
6. **M6+:** หลัง gate → ลด agent เหลือ "steward" portfolio (retainer model) + เพิ่ม growth/marketing 1 คนสำหรับ consumer launch

---

### 5.2 (b) Budget คร่าว ๆ ถึง pilot (THB)

> สมมติฐานหลัก: **~7 เดือน** ถึง pilot launch, ทีม core 5 คน + fractional + agent ramp 0→10. ตัวเลขเป็นช่วง (low–high) สำหรับเชียงใหม่ cost base (ถูกกว่า กทม.).

#### 5.2.1 รายเดือน (recurring burn)

| หมวด | ช่วง M0–M2 (build) | ช่วง M3–M6 (seed peak) | หมายเหตุ |
|---|---|---|---|
| **Engineering payroll** (3–4 eng + founders ไม่กินเงินเดือน หรือกินต่ำ) | ~250k–400k | ~250k–400k | เชียงใหม่/remote-TH; senior money-dev เป็นต้นทุนสูงสุดต่อหัว |
| **Field-agent payroll** (the biggest pre-revenue recurring cost) | ~30k–60k (3–4 คน, seed-only) | **~120k–220k** (8–10 คน peak) | ดู 5.2.3 — เป็นก้อนที่ตัดสิน runway |
| **Ops/Field lead + Moderator** | ~40k–70k | ~60k–110k | ramp ตามทีม |
| **Fractional DPO + ทนาย + บัญชี** | ~40k–90k | ~30k–60k | ทนายหนักช่วง M0–M1 (legal opinions), เบาลงหลัง sign-off |
| **Infra (stack)** | ~10k–25k | ~15k–35k | ดู 5.2.2 |
| **Tools / SaaS / misc** | ~10k–20k | ~10k–25k | Sentry/PostHog, GitHub, design, ประชุม, printed QR table-tents |
| **รวม / เดือน (rough)** | **~380k–665k** | **~485k–860k** | burn พุ่งช่วง seed peak เพราะ agent + ทีมเต็ม |

#### 5.2.2 Infra breakdown (stack — doc 05)

| รายการ | ช่วง pilot (THB/เดือน) | หมายเหตุ |
|---|---|---|
| Supabase managed (Postgres+PostGIS+Auth+Storage+Realtime, SG region) | ~3k–18k | Pro plan ช่วงเริ่ม; compute tier up เมื่อ load โต |
| NestJS api+worker hosting (Fly.io/Railway/Cloud Run, co-located SG) | ~2k–10k | 2-process จาก image เดียว; warm (no cold-start สำหรับ counter <5s) |
| Redis managed (idempotency/rate-limit/QR-nonce) | ~1k–4k | |
| Mapbox (tiles/SDK Flutter+GL JS) | ~0–6k | free tier กว้าง; โต per map-load หลัง consumer launch |
| **PSP fees** (Omise/2C2P/Fiuu PromptPay) | **~2–3% ของ throughput** | ผันตามยอด prefund+subscription จริง (variable, ไม่ใช่ fixed) — booked เป็น `psp_fee_expense` |
| Sentry + PostHog + อื่น ๆ | ~1k–3k | free/startup tier ช่วงเริ่ม |
| **รวม fixed infra** | **~10k–35k/เดือน** | เล็กมากเทียบ payroll — *infra ไม่ใช่ตัวกิน runway, คนกิน* |

#### 5.2.3 Field-agent payroll model (ก้อนที่สำคัญที่สุด) — bottom-up

ต่อ verified+activated listing target ≤ **280฿** (seed 35 + onboard 60 + activate_escrow 30 + activate_real 120 + quality/density overhead). สำหรับ Nimman density gate **200–400 places**:

- **ต้นทุน seed+activate ทั้งย่าน (one-off, ตลอด 3–4 เดือน):** 300 places × ~280฿ ≈ **~84,000฿** (ก้อน task bounty)
- **commission ขายแผน (variable):** 20% ของ MRR เดือนแรก ต่อ paid conversion (Starter 78฿/Growth 198฿) — *เป็นรายจ่ายที่ดี เพราะเกิดเฉพาะเมื่อมี revenue*
- **steward retainer หลัง saturate:** 2,500฿/เดือน/agent × ~5 steward = ~12,500฿/เดือน recurring (เริ่มหลัง gate)
- **fully-loaded peak burn:** ช่วง M4–M5 ที่ agent 8–10 คนทำงานเต็ม รวม bounty+commission+freshness+retainer + WHT gross-up + ops lead → **~120k–220k/เดือน**

> ปัจจัยที่ผันผวนสูง (unknown): **conversion Free→paid จริง**, **velocity ต่อ agent ต่อวัน** (กี่ร้าน/วัน), และ **clawback rate** (90 วัน churn). ถ้า velocity ต่ำกว่าแผน → ต้องจ้าง agent นานขึ้น = burn ยาวขึ้น = นี่คือ runway risk อันดับ 1.

#### 5.2.4 รวม budget ถึง pilot (one-off + 7 เดือน burn)

| ก้อน | ช่วง (THB) |
|---|---|
| Legal opinions one-off (e-money/escrow/PDPA/agent/VAT setup) | ~150k–400k |
| 7 เดือน operating burn (เฉลี่ย ~430k–760k/เดือน, ramp) | **~3.0M–5.3M** |
| Buffer/contingency (~15–20%, สำหรับ velocity miss) | ~0.5M–1.0M |
| **รวมประมาณการถึง Nimman pilot** | **~3.5M–6.5M THB** (≈ $100k–185k) |

> ช่วงกว้างเพราะ: founders กินเงินเดือนเท่าไร (ตัวแปรใหญ่สุด), จ้าง eng ในเชียงใหม่/remote หรือ กทม., และ agent ramp เร็ว/ช้า. **ฉากที่ realistic ที่สุดสำหรับทีม 5 core + 8 agent ≈ 4–5M THB ถึง pilot.**

---

### 5.3 (c) Runway implication & first-revenue path

#### 5.3.1 Runway math

- **Months to pilot:** ~**6–7 เดือน** (build P1 M1–M4 ขนานกับ seed P2 M3–M6, launch P3 M6–M7)
- **Avg burn:** ~**430k–760k/เดือน** (ต่ำช่วง build, สูงช่วง seed peak)
- **Runway ที่ควรมีก่อนเริ่ม:** **≥9–12 เดือน** ของ burn (~**4.5–8M THB**) — เผื่อ density gate ใช้เวลาเกินแผน + ช่วง pilot-to-traction ที่ยังไม่ break-even
- **กฎ go/no-go:** **ห้ามจุด consumer marketing จนกว่า density gate ≥90%/200–400 places ผ่าน** — ถ้าใช้เงิน marketing บนแผนที่ว่าง = เผา runway บน churn (empty map = #1 killer)

#### 5.3.2 First-revenue path — agent ขายแผนรายปีระหว่าง saturation

นี่คือ *กลไกเดียว* ที่ทำให้ runway ยืดได้ก่อน take-rate โต:

1. **annual upfront เป็นพระเอกของ cash:** annual = จ่าย 10 ได้ 12 → Growth annual = **9,900฿ เข้าก้อนเดียว** (รับรู้เป็น `deferred_revenue` แล้วทยอย recognize) — cash เข้าเต็มทันทีแม้ accounting จะ amortize
2. **agent ปิดการขายระหว่าง seed (P2):** ทุกร้านที่ saturate แล้วคือ lead ที่ agent อยู่หน้างานอยู่แล้ว — ต้นทุน sales ต่ำมาก (commission 20% เดือนแรก = 78–338฿)
3. **ตัวอย่าง runway extension:** ถ้าได้ paid conversion **~50–80 ร้าน** ในย่าน (จาก 300) ที่ Growth annual เฉลี่ย ~7,000฿ cash → **~350k–560k฿ cash เข้า** ระหว่าง pilot = ชดเชย burn ~1 เดือน. ไม่พอ break-even แต่ **พิสูจน์ willingness-to-pay** (core risk) ซึ่งสำคัญกว่าตัวเงินสำหรับรอบ fundraise ถัดไป
4. **take-rate ตามมาทีหลัง** (หลัง consumer launch P3) — ช้าและเล็กในช่วง pilot, อย่านับเป็น runway

> **Funding needed:** pre-seed/angel ~**4.5–8M THB** (เน้น runway 9–12 เดือน). milestone ที่ปลดล็อก seed round ถัดไป = **density gate ผ่าน + N ร้านจ่าย annual จริง + time-to-first-stamp ดี + redemption fraud ≈ 0** (ตัวพิสูจน์ทั้ง moat และ willingness-to-pay).

---

### 5.4 (d) Cost/risk tradeoffs ที่ใหญ่ที่สุด (be honest)

| Tradeoff / risk | สถานะ | ผลต่อ runway/แผน |
|---|---|---|
| **Field-agent unit economics** | doc 02 §B claim: CAC fully-loaded 408฿ (Starter), contribution-LTV ~5,965฿, **LTV:CAC ~14.6**, per-merchant payback **~1.4 เดือน** | *ตัวเลขนี้สวยเกินจริงถ้าอ่านผิดมุม* — มันคือ payback **ต่อร้านที่ convert+อยู่ 14 เดือนแล้ว** ไม่ใช่ payback ของ **ทั้ง field operation** ที่ต้องจ่าย payroll เต็ม 3–6 เดือนก่อนร้านแรกจ่ายเงิน. ที่ระดับองค์กร field-org ต่างหากที่ payback จริง **~6–9 เดือน** ตามโจทย์ — และขึ้นกับ **conversion rate + velocity** ที่ยังไม่พิสูจน์ |
| **6–9 เดือน CAC payback (org level)** | unknown จนกว่าจะ seed จริง | ถ้า conversion ต่ำ/velocity ช้า → agent payroll burn ยาวกว่าแผน = runway risk #1. mitigate: clawback 90 วัน + quality/merchant-quality multiplier + density cap (ลด bounty ฟาร์ม) + retainer ผูก KPI |
| **LTV:CAC ≥ 3** | ผ่านบนกระดาษ (~14.6) | **เปราะ** เพราะ LTV ขึ้นกับ **retention 14 เดือน** ที่ยังไม่มีข้อมูล + **take-rate margin** ที่ขึ้นกับ incrementality. ถ้า merchant ROI ไม่ปิด (ดูล่าง) ร้าน churn → LTV ตก → ratio พัง |
| **Merchant ROI break-even ~46% incrementality** | **core unproven business risk** (โจทย์ระบุชัด) | ที่ incrementality เชิงอนุรักษ์ 20–30% **ร้านขาดทุน** ตามโครงสร้างปัจจุบัน. ถ้าร้านไม่เห็น ROI จริง → ไม่ต่ออายุ → ทั้ง LTV และ first-revenue path พัง. **นี่คือ risk ที่เงินแก้ไม่ได้** — แก้ด้วย: วัด `visitor_type` (new/returning) จริงต่อร้าน, sales script quote break-even ไม่ใช่ best-case, และ corrective lever (cap reward COGS/cap redemptions) ถ้าวัดได้ < 25% |
| **money-plane = 1 senior dev SPOF** | ทีมเล็ก | bus-factor 1 บนเส้นเงิน. mitigate: DB invariant + money_writer role + 100% coverage gate บน packages/money + pgTAP — แต่ยังต้อง pair/review ทุก ledger change |
| **founder salary assumption** | ตัวแปรงบใหญ่สุด | ถ้า founders กินเงินเดือนเต็ม → burn +150–300k/เดือน → runway สั้นลง ~30%. realistic small-team = founders กินต่ำ/deferred |

#### 5.4.1 Realistic small-team scenario (recommended)

- **Core:** 5 คน = 2 founder (CEO/BizOps + CTO/money-plane) + 1 Flutter + 1 Web/Counter + 1 Ops-Field lead. Moderator = ops lead ทำเองช่วงแรก → จ้าง 0.5 FTE ที่ M3.
- **Fractional:** DPO + ทนาย + บัญชี (ไม่ใช่ FTE).
- **Agents:** ramp **3 → 8** (peak), freelance 3% WHT, ผูก KPI.
- **Budget:** ~**4–5M THB** ถึง pilot; **runway target ≥ 6M** (9–12 เดือน).
- **Timeline:** pilot ~M6–M7.
- **First revenue:** agent-sold annual plans ระหว่าง P2 (~50–80 ร้าน) — พิสูจน์ willingness-to-pay เพื่อปลดล็อก round ถัดไป.

#### 5.4.2 สิ่งที่ยัง unknown (ต้องวัดใน pilot, อย่าแกล้งรู้)

1. **Agent velocity** (ร้าน seed+onboard ต่อ agent ต่อวัน) — ตัวกำหนด payroll duration โดยตรง, ยังไม่มี data
2. **Free→paid conversion rate** จริง — driver ของ first-revenue และ LTV
3. **Merchant retention / churn** หลัง trial 30 วัน + หลัง 90 วัน clawback window
4. **Incrementality จริงต่อร้าน** (vs break-even ~46%) — risk ที่อาจล้มทั้ง business model
5. **เวลาจริงถึง density gate** — แผน 3–4 เดือน แต่อาจยืด → burn ยืด
6. **Founder comp + ค่าจ้าง eng จริง** ในตลาดเชียงใหม่/remote-TH — swing งบ ±30%
7. **Legal timeline** (e-money/escrow opinion) — ถ้าช้า = blocking-GA, money loop เปิดไม่ได้แม้ build เสร็จ

> **บรรทัดสรุป:** engineering เป็นต้นทุน *รู้ได้* (one-off ~4 เดือน build), แต่ **field-agent payroll + merchant willingness-to-pay** เป็นต้นทุน/risk *ที่ยังไม่รู้* และเป็นตัวตัดสิน runway จริง — จึงต้องถือ runway buffer หนา (≥9–12 เดือน) และวัด velocity/conversion/incrementality ให้เร็วที่สุดใน P2 ก่อนเทเงินเต็มเข้า agent ramp.
