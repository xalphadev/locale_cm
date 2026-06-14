# Stack Decision (ADR) — สถาปัตยกรรมเทคโนโลยี

> **วันที่:** 2026-06-14 · **วิธีตัดสิน:** 5 candidate stacks → judge panel 4 มุม → synthesis
> **เกณฑ์:** scale/ต่อยอดง่าย · quality (money core) · ง่าย/ดูแลง่าย · UX ผู้ใช้

## คะแนนรวมจากกรรมการ (sum 4 มุม)

| stack | คะแนนรวม |
|---|---|
| C3 | **24.5** |
| C5 | **24** |
| C2 | **22.5** |
| C4 | **18.5** |
| C1 | **16** |
| C1 — BaaS-first velocity (Supabase all-in) | **9** |
| C4 — Unified TypeScript End-to-End (NestJS + Expo RN + Next.js) | **8** |
| C2 — Hybrid TypeScript (Supabase + NestJS money service) | **6** |
| C3 — Enterprise Typed (.NET 8 Modular Monolith) | **3** |
| C5 — Go Services for Scale | **3** |

## ✅ คำตัดสิน (Chosen Stack)

| ส่วน | เลือกใช้ |
|---|---|
| **mobile** | Flutter (Dart) — codebase เดียว consumer + Field Agent (role-gated JWT claim); Mapbox SDK, expo-camera-equiv (in-app camera + QR), geofence; ARB gen-l10n th/en/zh-Hans; WeChat/Alipay/LINE ผ่าน platform channel (native-first) |
| **web_frontend** | Next.js 14 (App Router) + Refine (TS) สำหรับ back-office S1–S6 + merchant dashboard; shadcn/ui + TanStack Query; Counter PWA = route/bundle แยก (no-install, service worker, camera scan <5s, OTP fallback). data-provider hybrid: read=Supabase PostgREST, write-money=NestJS (บังคับด้วย wrapper/lint) |
| **backend** | NestJS (TypeScript) = server-authoritative money-plane (ledger/grant/redeem/prefund/payout/tax-WHT-VAT/recon/fraud gate). Money-critical SQL = plpgsql gate+post fn เดียวต่อ txn (sum-to-zero, FOR UPDATE lot lock, idempotency upsert) เรียกใน transaction เดียว. Worker process แยก (pg-boss หรือ BullMQ+Redis) สำหรับ recon/payout-batch/expire/tax. Supabase Edge (Deno) คงไว้เฉพาะ glue เบา (webhook fan-in, media_finalize) — ไม่ถือ money. Fastify adapter, deploy api+worker จาก image เดียว co-located กับ DB |
| **database** | PostgreSQL เดียว (FIXED) + PostGIS + pgcrypto/pgsodium + Supabase Vault. append-only double-entry ledger, satang BIGINT, 25 accounts / 22 txn types. DB invariants = last line of defense: append-only REVOKE+trigger, deferred sum-to-zero, clearing-flat branch trigger, lot≥0, EXCLUDE one-reversal, SoD CHECK, idempotency. RLS = read-authz (scope-in-JWT: city/merchant/territory). money_writer dedicated role = ผู้เขียน ledger เพียงรายเดียว (NestJS). PgBouncer/Supavisor session-mode pool สำหรับ FOR UPDATE txn |
| **auth** | Supabase Auth (GoTrue) เป็น IdP เดียว: LINE OIDC / Apple / Google / WeChat (custom OIDC bridge). JWT custom claims (role/city_ids/merchant_ids/territory_ids/aal/claims_ver). RLS อ่าน claims = read-authz; NestJS verify JWKS + re-check scope + aal2 step-up = write-money-authz. ต้อง pin claim shape/claims_ver ให้ตรงกันทั้งสอง surface (กัน drift) |
| **infra** | Supabase managed (SG region) สำหรับ Postgres/Auth/Storage/Realtime. NestJS (api+worker) เป็น container บน Fly.io/Railway/Cloud Run co-located region เดียวกับ DB (latency money op ต่ำ). Redis (idempotency/rate-limit/QR-nonce) managed. Sentry + OpenTelemetry + PostHog. GitHub Actions CI รัน Jest+testcontainers (trigger จริง) + pgTAP. nightly export → warehouse. IaC ขั้นต่ำ (supabase CLI migrations versioned) |
| **key_integrations** | PSP: Omise/2C2P/Fiuu (PromptPay) + Antom/Alipay+/WeChat Pay (Chinese SDK native-first → webhook เข้า NestJS เป็น source of truth ของ PSP_SETTLE, idempotent ingest, ไม่ผ่าน client). LINE Messaging API + LIFF (S2 notify). Mapbox (tiles/SDK Flutter + GL JS web). FCM/APNs push. Google Places (seed ETL one-time → change_proposal). DeepL/Google MT (translate worker job, draft → human-verify) |

# ADR-001: เลือกสถาปัตยกรรมอ้างอิง — **C2 (Hybrid TypeScript: Supabase data-plane + NestJS money-plane)** พร้อม graft จาก C1/C3/C5

**สถานะ:** ตัดสินแล้ว (decisive) · **วันที่:** 2026-06-14 · **ผู้ตัดสิน:** Principal Architect

---

## 1) คำตัดสิน (Verdict)

เลือก **C2 เป็นสถาปัตยกรรมอ้างอิง** และ graft แนวคิดที่ดีที่สุดจากตัวรองมาเสริม:

- **Mobile:** Flutter (Dart) — codebase เดียว consumer + Field Agent (role-gated JWT). **ปิดประเด็น Flutter vs React Native: เลือก Flutter เด็ดขาด** (เหตุผลข้อ 4)
- **Web:** Next.js 14 (App Router) + Refine (TS) สำหรับ back-office S1–S6 + merchant; **Counter เป็น PWA แยก** (no-install, <5s scan)
- **Money logic:** อยู่ใน **NestJS (TS) money-plane** ที่เรียก **PL/pgSQL gate+post function เดียวต่อ txn** ภายใต้ FOR UPDATE — **ไม่ใช่ Edge Functions, ไม่ใช่ .NET/Go ในเฟส MVP** (เหตุผลข้อ 4)
- **Keep Supabase: ใช่ — แต่เป็น data-plane/BaaS เท่านั้น** (Postgres + Auth + Storage + Realtime + RLS-read) ไม่ใช่ money-plane (เหตุผลข้อ 4)
- **Web framework: Next.js + Refine** (Refine เป็น React-native, ตัดเวลา admin มหาศาล, hiring pool TH ใหญ่สุด)

**เหตุผลหนึ่งบรรทัด:** C2 เป็น **candidate เดียวที่ทำคะแนน ≥6/10 ครบทั้ง 4 lens** (scale 6.5 · money 7 · simple 6 · ux 9) ขณะที่ตัวที่ชนะ lens เดี่ยว (C3/C5 ชนะ correctness/scale แต่ได้ simplicity 3/10; C1 ชนะ simplicity แต่ money 4/10) ล้วนละเมิด founder criterion ใดcriterion หนึ่งอย่างรุนแรง C2 ให้ **ความเรียบง่าย NOW** (Supabase ยกงาน auth/storage/realtime/cron/admin ออก) พร้อม **money core ที่ decoupled จาก Deno** ทำให้ path ไปสู่ C3/C5 (extract เป็น typed/compiled service) เปิดอยู่โดยไม่ต้อง re-architect ledger.

---

## 2) Scorecard ต่อ criterion (ถ่วงน้ำหนัก money ×2)

| Criterion (น้ำหนัก) | C1 BaaS | C2 Hybrid-TS | C3 .NET | C4 Uni-TS | C5 Go |
|---|---|---|---|---|---|
| **Money correctness (×2)** | 4 | **7** | **9** | 6 | 8 |
| Scale/extensibility (×1) | 4 | 6.5 | 8.5 | 7.5 | **9** |
| Simplicity/maintain (×1) | **9** | 6 | 3 | 8 | 3 |
| End-user UX (×1) | 8 | **9** | 7 | 5 | 7 |
| **Weighted avg (money×2)/5** | 5.8 | **7.1** | **7.3** | 6.5 | 7.0 |
| **คะแนนต่ำสุดของ candidate** | 4 ❌ | **6 ✅** | 3 ❌ | 5 ⚠️ | 3 ❌ |

> **อ่าน scorecard อย่างไร:** C3 ได้ weighted สูงสุด (7.3) แต่ **simplicity 3/10 ละเมิด founder criterion "simple to build+maintain" + "simplicity NOW" โดยตรง** สำหรับทีม 3–6 คน + .NET senior หายาก/แพงในไทย = near-disqualifying friction. C5 เหมือนกัน (3/10). C1 simplicity เด่นแต่ **money 4/10 = floor บน domain ที่เสี่ยงสุด** ผิดน้ำหนักที่ founder ให้. **C2 คือตัวเดียวที่ไม่มีคะแนนต่ำกว่า 6** — นี่คือลายเซ็นของ "best-balanced" ตามโจทย์ที่ขอ balance ไม่ใช่ max ด้านเดียว.

---

## 3) สถาปัตยกรรมอ้างอิง (Reference Architecture)

```
                         ┌─────────────────────────────────────────────┐
   CLIENTS               │             SUPABASE (data-plane)           │
 ┌──────────┐  read ────▶│  Postgres + PostGIS  (FIXED, single primary)│
 │ Flutter  │  (RLS)     │  ├─ append-only double-entry ledger          │
 │ consumer │            │  ├─ 25 accounts / 22 txn types / satang BIGINT│
 │ + agent  │            │  ├─ DB invariants = LAST LINE OF DEFENSE:     │
 └────┬─────┘            │  │   append-only · sum-to-zero(deferred) ·    │
      │ write-money      │  │   clearing-flat trigger · lot≥0 · idem ·   │
      │ (NestJS only)    │  │   EXCLUDE one-reversal · SoD CHECK         │
 ┌────▼─────┐            │  ├─ RLS = read-authz (scope-in-JWT)           │
 │ Counter  │──redeem──┐ │  ├─ Auth (LINE/Apple/Google/WeChat bridge)   │
 │   PWA    │          │ │  ├─ Storage (+CDN) · Realtime (live UX free) │
 └──────────┘          │ │  └─ money_writer DB role (ONLY NestJS writes)│
 ┌──────────┐  read    │ └─────────────────────▲───────────────────────┘
 │ Next.js  │──(RLS)───┘                       │ single plpgsql gate+post
 │ + Refine │  write-money ─────┐              │ fn per txn (FOR UPDATE)
 └──────────┘                   ▼              │
                    ┌────────────────────────────────────┐
   MONEY-PLANE      │   NestJS (TS) — server-authoritative│
   (co-located w/DB)│   ledger·grant·redeem·prefund·payout│
                    │   ·tax(WHT/VAT)·recon·fraud gate     │
                    │   discriminated-unions + zod typed   │
                    │   ┌──────────────────────────────┐  │
                    │   │ WORKER process (pg-boss/BullMQ)│ │
                    │   │ recon·payout-batch·expire·tax │  │
                    │   └──────────────────────────────┘  │
                    └────────────────────────────────────┘
   PSP/LINE webhooks ──▶ NestJS (idempotent ingest = source of truth)
```

**หลักการบังคับ (hard rules):**
1. **"ไม่มีประตูหลัง":** เฉพาะ `money_writer` DB role (= NestJS) เท่านั้น INSERT ตาราง ledger ได้ — บังคับด้วย **DB GRANT + audit ไม่ใช่ convention** (graft จาก C2 weakness mitigation; ความเข้มเทียบ NetArchTest ของ C3)
2. **"gate+post ใน txn เดียว":** NestJS ส่ง decision เข้า plpgsql fn เดียวภายใต้ FOR UPDATE — **ห้ามอ่านยอด→ตัดสิน→เขียนข้าม round-trip** (ปิด race window)
3. **DB invariant เป็น referee สุดท้าย:** แม้ NestJS มี bug, imbalanced txn จะ commit ไม่ผ่าน
4. **อ่านผ่าน RLS, เขียนเงินผ่าน NestJS เท่านั้น** (เส้นแบ่ง authz ชัด)
5. **Connection pool:** money txn ใช้ **session-mode pool (Supavisor/PgBouncer session)** เท่านั้น — ห้าม transaction pool (กับดักเงียบที่ junior มองไม่เห็น)

---

## 4) แก้ทั้ง 4 ประเด็นที่ต้องตัดสินอย่างชัดเจน

**(1) Flutter vs React Native → Flutter (irreversible-ish, ตัดสินเลย).**
UX lens ให้ Flutter cohort (C1/C2/C3/C5) อยู่ระดับสูง ส่วน C4 (RN/Expo) เป็น "UX/perf laggard ชัดเจน" (5/10): map heavy-scroll/animation/rotating-QR ต้อง tune Reanimated/Skia/FlashList, native-feel ต่ำกว่า, และ **Alipay/WeChat SDK native-first ต้องเขียน Expo config-plugin/prebuild** = velocity loss ตรงจุด Chinese-payment persona ที่เป็น first-class. Flutter ได้ camera/QR/geofence deterministic บนเครื่องราคาถูก (segment TH/Chinese-FIT). แลกด้วย: ทีม TS ต้องมี Dart 1 สาย (ไม่ unify ภาษา client) — ยอมรับได้เพราะ UX ของ consumer "aha" สำคัญกว่า language purity.

**(2) Money logic อยู่ที่ไหน → NestJS (TS) ที่เรียก plpgsql, ไม่ใช่ Edge/PL-only, ไม่ใช่ .NET/Go (เฟส MVP).**
- **ทำไมไม่ Edge-only (C1):** background tier เป็นจุดอ่อนที่สุด — pg_cron+Deno ไม่มี durable queue, Edge wall-clock timeout ตัด payout/recon batch. Money correctness lens ให้ C1 = 4/10 เพราะ "ขึ้นกับวินัยว่าห้ามทำ arithmetic ใน Deno" + immature jobs. C2 แก้ตรงนี้ด้วย worker process จริง.
- **ทำไมไม่ .NET/Go (เฟส MVP):** ได้ correctness สูงสุด (C3=9, C5=8) แต่ **simplicity 3/10** + รื้อ auth/storage/realtime ที่ Supabase แถมฟรี + hiring TH หายาก. Over-engineering ก่อน PMF.
- **ทำไม NestJS:** typed domain (discriminated unions + zod) ให้ money เป็น typed model ที่ refactor ปลอดภัยกว่า PL/pgSQL/Deno; มีบ้านสำหรับ long-running jobs; **decoupled จาก Deno → migrate-out เป็น compiled service ได้ภายหลัง** (path ไป C3/C5). DB invariant คงเป็น floor ทุกตัว.

**(3) Keep Supabase → ใช่ (data-plane เท่านั้น), ไม่ใช่ all-in.**
Supabase เก่งจริงที่ Auth multi-provider/Storage/Realtime/RLS-read/Refine scaffolding — ใช้เต็มที่ ไม่ reinvent commodity. แต่ **money core ออกจาก Deno** เพื่อไม่ติด vendor lock-in ที่ชั้น moat และเปิด path data-residency in-TH (ย้าย money-plane self-host ได้โดยทิ้งแค่ Auth/Storage/Realtime ที่ replace ได้). นี่คือจุดที่ C2 เหนือ C1 (lock-in C1 กิน Auth+Realtime+Storage+Edge+money) และเหนือ C3/C5 (ไม่ต้องรื้อ commodity ทันที).

**(4) Web framework → Next.js 14 (App Router) + Refine (TS).**
Refine เป็น React-native → data-provider คุยตรงกับ Supabase PostgREST (read) ได้ + ตัดเวลา admin S1–S6 มหาศาล; hiring pool React/TS ใหญ่สุดในไทย. **ข้อควรระวังที่ต้องแก้:** Refine data-provider เป็น hybrid (read=Supabase, write-money=NestJS) เป็นจุด dev สับสน → **บังคับด้วย wrapper/lint** ให้ mutation เงินวิ่งผ่าน NestJS เท่านั้น.

---

## 5) Phased Evolution (Simplicity NOW → Clean Scale Path)

| Phase | Stack | Trigger / Rationale |
|---|---|---|
| **P0 MVP (Nimman Cafe-Hop)** | Supabase (DB+Auth+Storage+Realtime) + **NestJS api+worker 2-process จาก image เดียว** co-located กับ DB (SG) + Flutter + Next/Refine + Counter PWA | เริ่มเรียบง่ายสุดที่ยังให้ money-plane แยก — ได้ velocity ใกล้ C1 แต่ correctness 7/10 |
| **P1 หลายย่าน/หลายเมือง** | NestJS replica หลัง LB (stateless) · **read replica** (discovery/analytics/leaderboard; money write→primary) · เพิ่มเมือง = **INSERT scope row ไม่ deploy** | อ่านหนัก/Realtime contention กับ money writes |
| **P2 High volume** | **partition ledger ตาม city_id/เดือน** (append-only เหมาะ pruning) · แตก worker queue ตาม job (recon/payout/expire/notify) · graft NATS JetStream/outbox จาก C5 ถ้า fan-out หนัก | per-city เป็น natural shard seam (recon/solvency per-city อยู่แล้ว) |
| **P3 National / data-residency in-TH** | **extract money-plane: ย้าย hot-path posting จาก plpgsql→typed/compiled service (graft C3 .NET หรือ C5 Go)** ถ้า correctness/throughput บังคับ · self-host Postgres in-TH · swap Supabase Auth/Storage/Realtime ทีละตัว · shard per region / Citus | data residency หรือ money-correctness/throughput ceiling จริง — **ledger schema ไม่เปลี่ยน** |

> **เหตุผลที่ phased ชนะ over-engineer วันแรก:** ledger ไม่ถูกแตะในทุกขั้น เพราะ DB invariant + plpgsql gate fn เป็น portable; การ extract money เป็น compiled service (C3/C5) เป็น **swap ของชั้น orchestration ไม่ใช่ rewrite ของ core**.

---

## สรุปการ graft
ฐานคือ **C2**. Graft: **money_writer DB role + "no back door" บังคับด้วย GRANT** (เข้มแบบ C3 NetArchTest) · **DB invariant 3 ชั้นเต็ม** (จาก C1/C5) · **durable worker + per-city shard seam** (จาก C2/C5) · **outbox→NATS option** เก็บไว้ P2 (จาก C5) · **plan extract money→.NET/Go** เก็บไว้ P3 (จาก C3/C5) · **Refine admin scaffolding + Counter PWA <5s** (จาก C1).

## ทำไมถึงชนะ
- candidate เดียวที่ทำคะแนน ≥6/10 ครบทั้ง 4 lens (scale 6.5 · money 7 · simple 6 · ux 9) — ลายเซ็นของ best-balanced ตามโจทย์ที่ขอ balance ไม่ใช่ max ด้านเดียว; ตัวที่ชนะ lens เดี่ยวล้วนมีคะแนนต่ำสุด ≤4 ที่ละเมิด founder criterion
- money core ได้บ้านที่เหมาะ: typed domain (discriminated unions + zod, 22 txn/25 accounts) + worker process จริงสำหรับ recon/payout/tax/expire ที่ Edge Function (C1) ทำไม่ได้เพราะ wall-clock timeout — แต่คง DB invariant ทุกตัวเป็น referee สุดท้าย ทำให้ correctness ไม่ลดจาก baseline (money lens = 7, สูงกว่า C1=4 และ C4=6)
- เคารพน้ำหนัก founder ที่ให้ money หนัก โดยไม่จ่าย simplicity 3/10 แบบ C3/C5: ยังได้ Supabase ยกงาน auth/storage/realtime/cron/admin ออก → ทีม 3–6 คนทุ่มเวลาที่ moat, ถึง MVP เร็ว (ความเรียบง่าย NOW ตามที่ founder ขอ)
- UX lens ชนะ (9/10): Flutter native consumer/agent + warm NestJS ไม่มี cold-start บน counter <5s + Supabase Realtime/PostgREST read-path ให้ discovery/leaderboard/quest live ฟรี + Chinese-PSP/LINE webhook path สะอาด
- money core decoupled จาก Deno runtime → migrate-out เป็น compiled service (C3 .NET / C5 Go) หรือ self-host in-TH (data residency) ได้ภายหลัง โดยไม่แตะ ledger schema — เปิด path ไปสู่ correctness/scale ceiling ของตัวรองโดยไม่ re-architect
- per-city เป็น natural shard/partition seam เพราะ recon/solvency เป็น per-city อยู่แล้ว → scale path ชัดและตรงกับ domain (scale lens = 6.5, สูงกว่า C1=4); stateless NestJS scale แนวนอนทันที
- เส้นแบ่ง authz ชัด ไม่ซ้อนกันมั่ว: RLS เป็นเจ้าของ read-authz (scope-in-token เร็ว), NestJS เป็นเจ้าของ write-money-authz (re-verify + aal2 + freeze-state) ภายใต้ identity เดียว (Supabase JWT)

## ไอเดียที่หยิบจากตัวรองมาเสริม (grafted)
- จาก C3: บังคับ 'ไม่มีประตูหลัง' เป็น mechanism ไม่ใช่ convention — money_writer DB role + GRANT + audit (เทียบ NetArchTest ของ C3 ที่ทำให้ SEAM-1 เป็น build-failing test); และ CI merge gate ด้วย testcontainers รัน trigger rollback จริง
- จาก C3/C5: เก็บแผน extract money-plane เป็น typed/compiled service (.NET exhaustive 22-txn switch หรือ Go pure-function tax math + property/fuzz test) ไว้ใช้ที่ P3 เมื่อ correctness/throughput ceiling บังคับ — plpgsql gate fn เป็น portable seam
- จาก C1: DB invariant 3 ชั้นเต็ม (append-only/sum-to-zero/clearing-flat/lot≥0/idempotency) เป็น correct-by-construction floor + pgTAP money tests ใน ephemeral Postgres; และ Counter PWA no-install <5s + Refine admin scaffolding
- จาก C5: transactional outbox → NATS JetStream (durable, at-least-once + dedup) สำหรับ async fan-out (notify/recon/fraud/payout) เก็บไว้ graft ที่ P2 เมื่อ fan-out หนักเกิน pg-boss; ทุก async stage idempotent
- จาก C4: branded bigint (Satang) + lint กัน number ในเส้นทางเงิน (ปิดช่อง float bug เพราะ TS ไม่มี decimal-by-default) + shared posting template ใช้ร่วม write-path กับ recon worker (กัน logic drift) + 100% coverage gate บน packages/money
- จาก C4: packages/contracts (zod-gen จาก schema) เป็น single source of truth ข้าม web+backend ลด drift ระหว่าง Refine และ NestJS DTO
- จาก C2 core: per-city เป็น natural shard seam + read-replica path; co-locate NestJS กับ DB region เดียว (latency money op ต่ำ)

## เส้นทางวิวัฒนาการ (MVP → scale)

| เฟส | stack | เหตุผล |
|---|---|---|
| **P0 — MVP (Nimman Cafe-Hop)** | Supabase (Postgres+PostGIS+Auth+Storage+Realtime+RLS-read) + NestJS api+worker 2-process จาก image เดียว co-located กับ DB (SG) + Flutter (consumer+agent) + Next.js/Refine (S1–S6+merchant) + Counter PWA. plpgsql gate+post fn + DB invariants + money_writer role | เริ่มเรียบง่ายสุดที่ยังแยก money-plane: ได้ velocity ใกล้ C1 (Supabase ยกงาน commodity) แต่ correctness 7/10 เพราะมี typed service + worker จริง + DB referee. ถึง MVP เร็วด้วยทีม 3–6 คน |
| **P1 — หลายย่าน/หลายเมือง** | NestJS replica หลัง LB (stateless ทันที) + Supabase compute tier up + read replica (discovery/analytics/leaderboard; money write→primary เท่านั้น). เพิ่มเมือง = INSERT scope row ไม่ deploy | แก้ read/Realtime contention กับ money writes; multi-city scale เป็น config ไม่ใช่ code change เพราะ RLS อ้าง scope_id |
| **P2 — High volume** | partition ledger_entries ตาม city_id/เดือน (append-only เหมาะ pruning) + index recon ต่อ city + แตก worker queue ตาม job (recon/payout/expire/notify) อิสระ + graft NATS JetStream/outbox จาก C5 ถ้า fan-out หนักเกิน pg-boss | per-city เป็น natural shard key (recon/solvency per-city อยู่แล้ว); แยก async tier ออกจาก hot path ให้ scale independent |
| **P3 — National / data-residency in-TH** | extract money-plane hot-path: ย้าย posting จาก plpgsql → typed/compiled service (graft C3 .NET exhaustive-switch หรือ C5 Go pure-fn) ถ้า correctness/throughput บังคับ + self-host Postgres in-TH + swap Supabase Auth/Storage/Realtime ทีละตัว + shard per region/Citus | data residency หรือ money-correctness/throughput ceiling จริง — ledger schema + DB invariant ไม่เปลี่ยน, เป็น swap ชั้น orchestration ไม่ใช่ rewrite core. นี่คือ path ที่ทำให้ 'เริ่ม C2 แล้ว graduate' เหนือกว่า over-engineer วันแรก |

## ล็อกตอนนี้ vs เลื่อนได้

**ล็อกเลย:**
- Flutter เป็น mobile client (consumer+agent codebase เดียว) — decision ต้นทุนสูงถ้ากลับ, ตัดสินเลย
- PostgreSQL + PostGIS เป็น single source of truth (FIXED ทุก candidate อยู่แล้ว) + append-only double-entry ledger schema (25 accounts/22 txn/satang BIGINT)
- DB invariants เป็น last line of defense: append-only REVOKE+trigger, deferred sum-to-zero, clearing-flat branch trigger, lot≥0, EXCLUDE one-reversal, SoD CHECK, idempotency — ออกแบบครบตั้งแต่ m#1
- money_writer dedicated DB role = ผู้เขียน ledger เพียงรายเดียว (บังคับด้วย GRANT+audit) + กฎ 'gate+post ใน plpgsql fn เดียวต่อ txn ภายใต้ FOR UPDATE' (ปิด race) — เป็น invariant ตั้งแต่บรรทัดแรก
- scope-in-token multi-tenant model (city_ids/merchant_ids/territory_ids ใน JWT claim) + RLS อ้าง scope_id ทุกตาราง + 12-role — เพิ่มเมือง = INSERT scope ตลอดเส้น
- session-mode connection pool สำหรับ money txn (Supavisor/PgBouncer session) — ห้าม transaction pool บน FOR UPDATE txn (กับดักเงียบ)
- NestJS เป็น write-money-authz owner / RLS เป็น read-authz owner — เส้นแบ่งนี้ lock ตั้งแต่ต้น
- PSP/LINE webhook → NestJS idempotent ingest เป็น source of truth (ไม่ผ่าน client)

**เลื่อนได้:**
- ภาษาของ money-plane runtime: เริ่ม NestJS (TS) — defer การ extract เป็น .NET/Go ไปจนกว่า correctness/throughput ceiling จริง (P3); plpgsql gate fn ทำให้ swap ได้โดยไม่แตะ ledger
- NATS JetStream + transactional outbox — เริ่มด้วย pg-boss/BullMQ บน Postgres เดียวกัน, defer NATS ไปจนกว่า fan-out หนักเกิน (P2)
- read replica + partition ledger ตาม city_id/เดือน — defer จนกว่า read contention/ledger size บังคับ (P1–P2)
- multi-region / DR / Chinese-FIT latency — เริ่ม single-region SG, defer multi-region จนกว่า volume จีนหรือ DR requirement บังคับ (P3)
- self-host Postgres in-TH / swap Supabase Auth-Storage-Realtime — defer จนกว่า data-residency requirement หรือ Supabase ไม่คุ้ม (P3)
- Citus / shard per region — defer จนกว่า national scale (P3); partition-by-city มาก่อน
- WeChat OIDC bridge แบบเต็ม — เริ่มด้วย LINE/Apple/Google ก่อน, เพิ่ม WeChat เมื่อ Chinese persona เปิดจริง (custom bridge มีต้นทุน)
- branded-bigint lint + 100% money coverage gate — ตั้ง CI gate แต่ refine policy ได้ภายหลัง

## เปลี่ยนได้ vs เปลี่ยนยาก (reversibility)
- IRREVERSIBLE (high switching cost): Flutter vs RN — ทั้ง consumer+agent codebase + native SDK integration ผูกแล้วกลับยาก; เลือก Flutter เด็ดขาด
- IRREVERSIBLE-ish: ledger schema + DB invariant + double-entry model — เปลี่ยนทีหลังคือ data migration ของเงินจริง (อันตรายสุด); lock ให้ถูกตั้งแต่ m#1
- IRREVERSIBLE-ish: scope-in-token multi-tenant shape (claim structure) — ถ้า drift ภายหลังต้อง re-issue token ทั้งระบบ + แก้ RLS ทุก policy; pin claims_ver
- REVERSIBLE (decoupled by design): money-plane runtime TS→.NET/Go — plpgsql gate fn เป็น seam, swap ชั้น orchestration ไม่ใช่ ledger
- REVERSIBLE: Supabase Auth/Storage/Realtime — เป็น commodity layer, replace ทีละตัวผ่าน abstraction (ต้นทุน moderate)
- REVERSIBLE: pg-boss → NATS JetStream (worker queue), single-region → multi-region, single DB → read-replica/partition/shard — ทั้งหมดเป็น incremental ที่ไม่แตะ ledger
- REVERSIBLE: Web framework Next/Refine — admin/merchant surface สลับได้ (ต้นทุน moderate); read-path hybrid data-provider
- LOW-COST REVERSIBLE: PSP provider ต่อเมือง (Omise/2C2P/Fiuu/Antom) — webhook→NestJS เป็น port, สลับ provider = config

## สิ่งที่ยอมแลก (honest trade-offs)
- ยอมรับ: ไม่ได้ correctness สูงสุด — C3 (.NET, 9/10) และ C5 (Go, 8/10) ให้ compile-time typed money (Coin≠Thb) + exhaustive 22-txn switch ที่ TS ไม่มี (TS no-decimal → พึ่ง branded bigint + lint discipline). C2 correctness=7 พึ่งวินัยมากกว่า; mitigate ด้วย DB referee + money_writer role + lint + property test แต่ยอมรับว่าไม่ใช่ compiler-enforced เต็ม
- ยอมรับ: เพิ่ม moving part 1 ตัว (NestJS) บนทีมเล็ก = ops burden จริง (deploy/scale/monitor/secret/region co-location) — baseline Edge-only (C1) เบากว่าด้าน ops; ถ้าทีม 2–3 คนจะรู้สึกได้
- ยอมรับ: connection-pool เป็นกับดักเงียบ — money txn FOR UPDATE ต้อง session pool, ถ้า junior วางบน transaction pool ผิด = lock/prepared-statement พังเป็น production incident; ต้องบังคับ + เทรน
- ยอมรับ: dual-writer risk ถ้าวินัยหลุด — ถ้าใครให้ Refine/Edge เขียนตารางเงินผ่าน service_role อีกทาง = ละเมิด 'ไม่มีประตูหลัง'; mitigate ด้วย DB GRANT (money_writer เท่านั้น) ไม่ใช่ convention แต่ยังต้อง audit
- ยอมรับ: ไม่ unify ภาษา client — Flutter=Dart แยกจาก TS stack → ข้อได้เปรียบ 'one language' จริงแค่ web+backend ไม่ครบทั้งระบบ (C4 unify เต็มแต่แลก RN UX); เลือก UX > language purity
- ยอมรับ: Refine hybrid data-provider (read=Supabase, write-money=NestJS) เป็นจุด dev สับสนเขียน mutation ผิดทางได้ — ต้องทำ wrapper/lint ให้ชัด
- ยอมรับ: สอง auth surface (RLS อ่าน claims + NestJS verify JWKS) ถ้า claim shape/claims_ver drift = ช่องที่ read เห็นแต่ write ปฏิเสธ (หรือกลับกัน) debug ยาก — ต้อง pin contract
- ยอมรับ: single-region SG → Chinese-FIT latency + ไม่มี multi-region DR จน P3 (money core บน region เดียว = availability SPOF ชั่วคราว) — เหมือนทุก candidate ยกเว้นเมื่อทำ multi-region
- ยอมรับ inherited limitation: payable_coverage/recon ยังเป็น nightly+intraday ไม่ใช่ synchronous gate — burst chargeback/same-day bank redirect ยัง transient breach ได้ (เหมือนทุก candidate, C2 ไม่แก้จุดนี้ให้ดีขึ้น)
