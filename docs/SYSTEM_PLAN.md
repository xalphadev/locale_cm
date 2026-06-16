# แผนระบบ (System Plan) — แอปชุมชนท่องเที่ยว/ไลฟ์สไตล์ท้องถิ่น เชียงใหม่

> **สถานะ:** เอกสารออกแบบระบบ (ยังไม่เขียนโค้ด) · **เวอร์ชัน:** ร่างที่ 1 · **วันที่:** 2026-06-14
> **ขอบเขตที่ยืนยันแล้ว:** ครอบคลุมทั้งเชียงใหม่ (eat/see/do) · 3 กลุ่มผู้ใช้ (ไทย+nomad / ฝรั่ง / จีน FIT) · 3 ภาษา (TH/EN/ZH) · ร้านเติมเงิน escrow · 4 เสารายได้
> **หลักการเหนือทุกอย่าง:** *ระบบสร้างกว้างตั้งแต่วันแรก แต่ปูข้อมูล/เปิดตัวทีละย่าน* เพื่อเลี่ยง "แผนที่ว่างเปล่า"

---

## สารบัญ

- 1. บทสรุปผู้บริหาร (Executive Summary)
- 2. อภิธานศัพท์ (Glossary)
- 3. Data Model & โครงสร้างข้อมูล
- 4. RBAC — Roles, Scope & Permissions
- 5. Loyalty Engine — แต้ม, เควสต์, escrow & กันโกง
- 6. Field-Agent Operations — ระบบทีมอัพเดตข้อมูล (Moat)
- 7. Merchant Subsystem — การพิสูจน์ตัวตน, dashboard, redemption
- 8. Consumer App — ฟีเจอร์, UX flows & 3 ภาษา
- 9. Monetization Modules — 4 เสารายได้
- 10. Technical Architecture & Security/PDPA
- 11. Roadmap, GTM & Org
- 12. ประเด็นความสอดคล้อง & ช่องว่างที่ต้องเติม (Integration Review)
- 13. การตัดสินใจที่ยังค้างอยู่ (Open Decisions)
- ภาคผนวก ก. ชื่อแอปที่เสนอ

---

## 1. บทสรุปผู้บริหาร

### 1.1 Product Thesis (วิทยานิพนธ์ของผลิตภัณฑ์)

แอปนี้คือ **"local loyalty layer"** ของเชียงใหม่ — ชั้นที่นั่งทับบนพฤติกรรมที่คนทำอยู่แล้ว (เดินกินคาเฟ่ Nimman, ไหว้วัด Old City, เที่ยวเทศกาล Yi Peng/Songkran) แล้วเปลี่ยนมันเป็น **เกมสะสมข้ามร้าน (cross-merchant loyalty game)** ที่จับต้องได้: เยือน Cafe A + Cafe B + Restaurant C → ได้กาแฟฟรี/ส่วนลดจริง. ผลิตภัณฑ์รวม 3 ฝั่งเข้าด้วยกัน — **discovery** (eat/see/do ที่ข้อมูลสด), **loyalty game** (Quest/Passport/Coins), และ **merchant tooling** (escrow, redemption, analytics) — โดยรองรับ **3 กลุ่มผู้ใช้ first-class** (Thai local+nomad / Western tourist / Chinese FIT) ผ่าน **trilingual TH/EN/简体中文** และ payment rails ครบ (PromptPay + Alipay/WeChat) ตั้งแต่วันแรก.

### 1.2 The Moat (คูเมืองป้องกัน)

คู่แข่งลอก *ฟีเจอร์* ได้ใน 3 เดือน แต่ลอก **"ทีมนิสิต CMU/Payap ที่เดินเก็บข้อมูลทุก soi + ปิดดีล merchant ต่อหน้า + ทำให้ข้อมูลสดตลอด"** ไม่ได้. **Field Agent subsystem** จึงเป็น moat หลัก โดยมี **กฎเหล็กข้อเดียวที่ฝังทั่วทั้งระบบ: Agent (และ Merchant) ไม่เคยเขียน live data — ทุกการแก้คือ `Change Proposal` ที่ผ่าน moderation เสมอ.** moat เสริมคือ **data freshness ที่ผู้ใช้เห็นได้** (badge "Verified in person X days ago") ซึ่งเป็น differentiator ที่ Google Maps ทำไม่ได้.

### 1.3 หลักการ Broad-System / Dense-Rollout

Tension ที่อันตรายที่สุดของ local app คือ **"แผนที่ว่าง" (empty map)** กับ **"กระจายบาง" (spreading thin)**. ทั้งระบบแก้ด้วยกฎเดียว:

> **"Build the SYSTEM broad, SEED the DATA dense."**

- **ระบบ/architecture กว้างตั้งแต่ migration #1** — `merchant_id` + `city_id` ในทุกตารางที่เกี่ยวข้อง, multi-tenant + multi-city, ครบทั้ง eat/see/do, ครบ 4 revenue pillars — เราไม่ re-architect ตอนขยาย.
- **ข้อมูลจริงบนพื้น seed ทีละ district** — Field Agent strike-team saturate ย่านหนาแน่นก่อน (Nimman → Old City → Santitham → Chang Klan → Hai Ya → suburban).
- **Consumer marketing ยิงเข้าย่านก็ต่อเมื่อย่านนั้นผ่าน Density Gate** (≥90% coverage, ≥5 รูป/place, ≥3 Quest, trilingual completeness) เพื่อให้คนแรกที่เปิดแอปในย่านนั้นเจอแผนที่ "เต็ม".

### 1.4 Subsystems ต่อกันอย่างไร (How the pieces fit)

หัวใจที่เชื่อมทุกอย่างคือ **append-only double-entry ledger** — ไม่มี mutable points integer ที่ไหนเลย ทุกยอด (Coins, Sparks, escrow baht, Clearing Account) = SUM ของ ledger entries:

| Subsystem | บทบาท | เชื่อมกับ ledger อย่างไร |
|---|---|---|
| **Data Model** (3) | นิยาม 8 bounded contexts + keys migration #1 | เป็น schema กลางของทุก subsystem |
| **RBAC** (4) | Role + Scope + ABAC, enforce ที่ RLS | คุมว่าใคร mint/burn/approve/payout ได้ + SoD |
| **Loyalty Engine** (5) | Sparks (soft XP) แยกขาดจาก Coins (baht-backed) | Coins ทุกเหรียญ backed ด้วย escrow; mint ตอน Quest complete, burn ตอน redeem |
| **Field Agent Ops** (6) | moat — saturate data + onboard merchant | Change Proposal pipeline; payout/clawback เดินผ่าน Clearing Account เดียวกัน |
| **Merchant** (7) | tiered trust, escrow top-up, counter redemption | Escrow Wallet เติม → mint Coins; redemption burn → take-rate |
| **Consumer App** (8) | zero-signup discovery + Passport + redeem | Wallet render projection จาก ledger; redemption merchant-initiated |
| **Monetization** (9) | 4 เสารายได้ลงเป็น CR `PLATFORM_REVENUE` | ทุกเสาเดินบน escrow + ledger เดียวกัน |
| **Architecture** (10) | Supabase Postgres + RLS + PostGIS + Edge Fn | บังคับ server-authoritative + PDPA-by-design |
| **Roadmap** (11) | 4 phase × Density Gate × seasonality | จัดลำดับว่า subsystem/revenue/ภาษาไหน land เมื่อไร |

### 1.5 หลักการกันโกง (Anti-fraud) ที่ฝังทั่วระบบ

Anti-fraud เป็น **existential** (ของฟรีล่อให้โกง) จึงไม่ใช่ bolt-on แต่ฝังในดีไซน์: (1) **Trust ↔ value coupling** — reward ยิ่งแพง ยิ่งต้อง trust tier สูง (GPS dwell < verified visit < proven purchase); (2) **Redemption merchant-initiated** + rotating QR/OTP + time-boxed + geofenced + burned server-side (ไม่มี static customer QR); (3) **Escrow-as-risk-cap** — ความเสียหายสูงสุด = escrow ที่ merchant prefund, แพลตฟอร์มไม่เคยขาดทุนเงินตัวเอง; (4) **PDPA-by-design** — เก็บ redemption FACT ไม่เก็บ movement graph, Coins non-cashable + expiring เพื่อพ้นนิยาม e-money ของ ธปท.

### 1.6 ข้อสรุปสำหรับ Founder

แผนทั้ง 9 section **สอดคล้องกันในระดับหลักการสูงมาก** — ทุก section ยึด canonical naming, double-entry ledger, Change Proposal invariant, merchant-prepaid escrow, และ PDPA-by-design ตรงกัน. งานที่เหลือก่อนเริ่ม dev คือ **reconcile ตัวเลขและ schema ที่ยังไม่ตรงกัน** (โดยเฉพาะ ledger account model ที่เขียน 4 แบบใน 4 section, ชื่อ/ราคา subscription tier ที่ขัดกัน, และค่า threshold ตัวเลขกันโกง) — รายละเอียดอยู่ใน consistency_issues และ consolidated_open_questions. แนะนำให้ทำ **"canonical schema spec" ฉบับเดียว (migration #1 + ledger chart-of-accounts)** เป็น source of truth ก่อนเขียนโค้ดบรรทัดแรก.

---

## 2. อภิธานศัพท์ (Glossary)

| ศัพท์ | ความหมาย |
|---|---|
| **Sparks** | สกุล soft XP ฟรี ขับเคลื่อน gamification (tiers/badges/leaderboards/streaks) ได้จาก check-in/รีวิว/task/referral NEVER redeemable แลกเป็นเงินหรือของไม่ได้เลย เก็บแยก ledger จาก Coins (architecture เก็บเป็น ledger row, loyalty เก็บเป็น integer+event log — ต้อง reconcile) |
| **Coins** | สกุล hard value หนุนหลังด้วยเงินบาทใน escrow mint ได้เฉพาะตอน merchant/sponsor prefund escrow แล้ว redeem ได้จริงที่ Place เป็น non-cashable + non-transferable + expiring เพื่อพ้นนิยาม e-money ของ ธปท. ออกแบบ 1 COIN minor = 1 THB minor (สตางค์) — ตาม loyalty |
| **Place** | listing หนึ่งร้าน/จุด (cafe/restaurant/attraction/activity venue) หมวด eat/see/do; merchant_id เป็น nullable ได้ (วัด/จุดชมวิวสาธารณะไม่มีเจ้าของบัญชี) |
| **Merchant** | บัญชีธุรกิจที่เป็นเจ้าของ Place หนึ่งหรือหลายแห่ง = หน่วย tenant หลักของ B2B; ไต่ trust state CLAIMED_UNVERIFIED → IDENTITY_VERIFIED → FINANCE_VERIFIED (+ PAYOUT_FROZEN) |
| **Quest** | trail แบบ cross-merchant (เช่น Nimman Cafe-Hop) รวมหลาย Place เป็นภารกิจ มี logic AND/OR/N_OF_M, time-boxed ได้, type = standard/sponsored/festival; mint Coins ตอน complete เท่านั้น |
| **Quest Step** | หนึ่ง required visit ภายใน Quest ผูกกับ place_id + step_order + required_trust_tier (ขั้นต่ำของ check-in ที่นับ step) |
| **Passport** | surface ความคืบหน้า Quest ของ user (สมุดสะสมแสตมป์ดิจิทัล) แสดง active quests + collectibles/seasonal + escrow-aware state (quest pause เมื่อ escrow=0) |
| **Field Agent (Agent)** | พนักงาน/นิสิต CMU/Payap ที่ saturate data + onboard merchant หน้างาน = primary moat กฎเหล็ก: ไม่เคยเขียน live data ทุก contribution เป็น Change Proposal; ไต่ trust ladder Probation/Verified/Senior |
| **Territory** | พื้นที่ geofenced (PostGIS polygon) ตามย่านเดินได้จริง ผูกกับ agent (primary+backup) id ขึ้นต้นด้วย city_id (CNX-NIMMAN); แบ่งย่อยเมื่อ density สูง (>250 places) |
| **Task** | หน่วยงานของ agent (seed_new_place/verify_hours/refresh_photos/onboard_merchant/activate_merchant/confirm_closed) generate โดย scheduler จาก Freshness SLA ไม่ใช่ agent กดสร้างเอง; มี anti-cherry-picking ratio |
| **Change Proposal** | การแก้ข้อมูลทุกอย่างจาก agent/merchant ที่รอ moderation มี diff (before→after) + proof/evidence; approve แล้วจึง apply ลง live + เขียน history version (places_history/place_version — ต้องรวมชื่อ); SoD: author != moderator |
| **Redemption** | การเผา Coins รับรางวัลที่ Place เป็น merchant-initiated + rotating QR/OTP (TTL ~60-90 วิ) + time-boxed + geofenced + burned server-side เท่านั้น ห้าม static customer QR; state machine PENDING→CODE_ISSUED→VALIDATING→BURNING→SETTLED |
| **Escrow Wallet** | balance เงินบาทที่ merchant/sponsor prefund (read-model cache, ยอดจริง derive จาก ledger) มี available vs locked; zero-balance → quest auto-pause (PAUSED_NO_FUNDS); แพลตฟอร์มไม่เคยสำรองเงิน |
| **Clearing Account** | บัญชีพักกลางของแพลตฟอร์มใน double-entry ledger ระหว่างเคลียร์ — Coins ที่ burn เข้าพักที่นี่รอ settle/payout; agent payout + redemption settlement เดินผ่านบัญชีเดียวกัน (ต้องแยกชัดจาก PSP_SUSPENSE) |
| **Density Gate** | เกณฑ์ความหนาแน่นต่อ district ที่ต้องผ่านก่อนยิง consumer marketing (≥90% coverage, ≥5 รูป/place, ข้อมูลครบ 100%, trilingual completeness, ≥3 active Quest + ≥5 merchant มี escrow) = เครื่องมือหลักกัน empty map |
| **Trust Tier (check-in)** | 3 ระดับความเชื่อถือของ check-in: gps_dwell (T1, อยู่ในรัศมี+dwell) < verified_visit (T2, สแกน rotating QR ร้าน/OTP) < proven_purchase (T3, ผูก redemption/บิล); Coins reward มูลค่าสูงบังคับ tier สูง, Sparks ใช้ T1 ได้ |
| **Double-entry Ledger** | append-only ledger ที่ทุก txn มี debit รวม = credit รวม (sum-to-zero ต่อ currency) ไม่มี mutable points integer; ทุกยอดคงเหลือ = SUM ของ entries; idempotency_key UNIQUE กัน replay; เป็นหัวใจที่เชื่อมทุก subsystem (ต้อง reconcile schema 4 แบบ) |
| **RBAC: Role + Scope + ABAC** | โมเดลสิทธิ์ 3 ด่าน: role มี capability? + scope ครอบ target? + ABAC guard (ownership/geofence/escrow funded/KYC)? enforce ที่ Postgres RLS + Edge Function; Flutter เป็น UX-only; เพิ่มเมือง = INSERT scope ไม่ใช่ code change |
| **12 Canonical Roles** | Customer, Platform Owner, Platform Admin, Merchant, Field Agent, Content Moderator, City/Regional Manager, Brand/Sponsor, Support/CS, Finance/Payout, Analyst/API-Partner, DPO |
| **Segregation of Duties (SoD)** | กฎแยกหน้าที่บังคับใน DB: payout creator != approver, proposal author != moderator, mint(fund_escrow) != redeem(issue_redemption), identity reviewer != finance reviewer ของ merchant เดียวกัน; action เสี่ยงสูงต้อง step-up MFA |
| **PDPA-by-design** | เก็บ redemption/visit FACT ไม่เก็บ movement graph; geo เก็บ coarse+ephemeral+purge raw; lawful basis ต่อ dataset; consent versioned; data_processing_records (RoPA); audit_log immutable; Coins non-cashable เลี่ยง ธปท. e-money; k-anonymity (k>=25) บน data product |
| **Merchant Prepaid Escrow** | โมเดล funding: merchant/sponsor เติมเงินบาทล่วงหน้าเข้า escrow แพลตฟอร์มไม่เคย advance money; ความเสียหายสูงสุดจากการโกง = escrow ที่ prefund (escrow-as-risk-cap) |
| **TTFS (Time-to-First-Stamp)** | North-star metric ฝั่ง consumer = เวลาตั้งแต่เปิดแอปครั้งแรก → เก็บ Quest Step/check-in แรกสำเร็จ; activation = first_stamp_succeeded ใน session แรก/24 ชม. (ต้องสรุป window) |
| **Verified Cross-merchant Quest Completion** | North-star ระยะยาวเดียวของทั้งระบบ = จำนวน quest ข้ามร้านที่ทำสำเร็จต่อเดือน รวม demand+supply+data quality+monetization ใน metric เดียว |

---

## 3. Data Model & โครงสร้างข้อมูล

> ส่วนนี้นิยาม **core entities + ความสัมพันธ์** ของระบบในระดับ conceptual ERD (ไม่ใช่ SQL DDL จริง) เพื่อให้ทีม dev เริ่ม migration ได้ทันที หลักการสำคัญที่ครอบทุก entity:
> - **Multi-tenancy keys ติดตั้งใน migration #1:** ทุกตารางที่เป็นข้อมูลธุรกิจถือ `city_id` และ (ถ้าผูกกับร้าน) `merchant_id` ตั้งแต่แถวแรก เพื่อรองรับ multi-city + multi-tenant โดยไม่ต้อง backfill ภายหลัง
> - **Loyalty = append-only double-entry ledger** ไม่มี mutable points integer ที่ไหนเลย ยอด Coins/Sparks คงเหลือคำนวณจากผลรวม ledger เสมอ
> - **Field Agent ห้ามเขียน live data** ทุกการแก้ไขข้อมูลร้าน/สถานที่จาก Agent และ Merchant ไหลผ่าน `change_proposals` เพื่อ moderation
> - **PDPA-by-design:** เก็บ "ข้อเท็จจริงของ redemption/visit" ไม่เก็บ "movement graph" raw GPS เก็บแบบ ephemeral + encrypted, แยก lawful basis ต่อ dataset

### 3.1 ภาพรวมโดเมน (Domain Map)

แบ่ง entity เป็น 8 กลุ่ม (bounded context) เพื่อให้ทีมแบ่งงานได้ชัด:

| กลุ่ม | Entities หลัก | เจ้าของ context |
|---|---|---|
| **A. Geo & Tenancy** | `cities`, `districts`, `merchants`, `places` | Platform / City Manager |
| **B. Identity** | `users`, `profiles`, `roles`, `user_roles`, `devices`, `consents` | Auth / DPO |
| **C. Content** | `media`, `deals`, `reviews`, `translations` | Content Moderator |
| **D. Gamification** | `quests`, `quest_steps`, `passports`, `quest_progress`, `check_ins` | Game team |
| **E. Ledger (financial heart)** | `accounts`, `ledger_entries`, `escrow_wallets`, `coin_grants`, `redemptions` | Finance / Payout |
| **F. Monetization** | `sponsors`, `campaigns`, `subscriptions`, `invoices`, `affiliate_clicks` | Revenue |
| **G. Field Ops (moat)** | `agents`, `territories`, `tasks`, `change_proposals` | City Manager / Moderator |
| **H. Governance** | `audit_log`, `data_processing_records`, `data_freshness` | DPO / Platform Admin |

**Convention ทั่วทั้งระบบ**
- PK = `uuid` (gen ฝั่ง DB) ทุกตาราง ยกเว้น ledger ที่เพิ่ม `seq bigint` แบบ monotonic เสริม
- ทุกตารางมี `created_at`, `updated_at` (timestamptz, UTC)
- ตารางที่ versioned ใช้รูปแบบ **shadow history table** (`*_history`) + คอลัมน์ `version int` + `valid_from`/`valid_to` (ดู 3.10)
- Soft-delete ด้วย `deleted_at` (null = active) ห้าม hard-delete ข้อมูลที่อ้างอิงใน ledger หรือ audit

---

### 3.2 กลุ่ม A — Geo & Tenancy

#### `cities`
ราก multi-city จังหวัด/เมืองที่เปิดให้บริการ Chiang Mai = แถวแรก (`code = "CNX"`)

| field | type | หมายเหตุ |
|---|---|---|
| `id` | uuid PK | |
| `code` | text unique | เช่น `CNX`, `BKK` (ISO-ish) |
| `name_i18n` | jsonb | `{th, en, zh}` ดู i18n strategy 3.9 |
| `country_code` | text | `TH` |
| `timezone` | text | `Asia/Bangkok` |
| `default_locale` | text | `th` |
| `bbox` | geography(POLYGON) | กรอบเมืองสำหรับ map default |
| `is_live` | bool | เปิดบริการจริงหรือยัง |

#### `districts`
อำเภอ/ย่านย่อย ใช้ทั้ง map filter, territory ของ agent, และ rollout แบบ district-by-district

| field | type | หมายเหตุ |
|---|---|---|
| `id` | uuid PK | |
| `city_id` | uuid FK → cities | **tenancy key** |
| `name_i18n` | jsonb | เช่น `{th:"นิมมานเหมินท์", en:"Nimman", zh:"宁曼"}` |
| `slug` | text | `nimman`, `old-city`, `santitham`, `payap-cmu` |
| `boundary` | geography(POLYGON) | PostGIS ใช้ geofence + "places ในย่านนี้" |
| `rollout_status` | enum | `planned / seeding / live` (ควบคุมการ seed ทีละย่าน) |

> ตัวอย่าง Chiang Mai districts ที่ seed รอบแรก: `nimman` (Soi 1–17, One Nimman, Maya), `old-city` (Wat Phra Singh, Wat Chedi Luang, Sunday Walking Street), `santitham`, `payap-cmu`

#### `merchants`
บัญชีธุรกิจที่เป็นเจ้าของ Place หนึ่งหรือหลายแห่ง = หน่วย tenant หลักของ B2B

| field | type | หมายเหตุ |
|---|---|---|
| `id` | uuid PK | **= `merchant_id` ทั่วระบบ** |
| `city_id` | uuid FK | tenant อยู่เมืองหลัก (สาขาข้ามเมืองได้ผ่าน places.city_id) |
| `legal_name` | text | ชื่อจดทะเบียน |
| `display_name_i18n` | jsonb | |
| `tax_id` | text (encrypted) | KYC / ออกใบกำกับ |
| `owner_user_id` | uuid FK → users | บัญชีเจ้าของ |
| `kyc_status` | enum | `pending / verified / rejected` |
| `escrow_wallet_id` | uuid FK → escrow_wallets | wallet baht prefund (1:1) |
| `subscription_id` | uuid FK → subscriptions | nullable |
| `onboarded_by_agent_id` | uuid FK → agents | ใครพาเข้าระบบ (จ่าย commission/track moat) |

#### `places`
listing หนึ่งร้าน/จุด หัวใจของ "eat / see / do" รองรับ i18n, geo, hours, price band

| field | type | หมายเหตุ |
|---|---|---|
| `id` | uuid PK | |
| `merchant_id` | uuid FK | **tenancy** nullable ได้ (วัด/สถานที่สาธารณะไม่มีเจ้าของบัญชี) |
| `city_id` | uuid FK | **tenancy** |
| `district_id` | uuid FK | ย่าน |
| `category` | enum | **`eat` / `see` / `do`** (หลัก) |
| `subcategory` | text | `cafe, restaurant, street_food, rooftop_bar` (eat) · `temple, viewpoint, museum, market` (see) · `cooking_class, muay_thai, spa, trekking, atv` (do) — ดู taxonomy 3.2.1 |
| `name_i18n` | jsonb | `{th, en, zh}` |
| `description_i18n` | jsonb | |
| `geo` | geography(POINT) | PostGIS lat/lng |
| `address_i18n` | jsonb | |
| `phone`, `line_id`, `website` | text | |
| `opening_hours` | jsonb | โครงสร้างแบบ OSM (per-day ranges + exceptions เช่น วันพระ/Songkran) |
| `price_band` | enum | `฿ / ฿฿ / ฿฿฿ / ฿฿฿฿` |
| `amenities` | text[] | `wifi, ev_charge, halal, vegan, pet_friendly, parking` |
| `payment_accepts` | text[] | `promptpay, alipay, wechat, cash, card` |
| `status` | enum | `draft / published / temporarily_closed / permanently_closed` |
| `source` | enum | `agent_seed / merchant / google_places_seed` (Google ใช้ seed ครั้งเดียว) |
| `verified_at` | timestamptz | ครั้งสุดท้ายที่ Agent ยืนยันด้วยตา (freshness) |
| `data_freshness_id` | uuid FK → data_freshness | ดู 3.8 |

**Versioned fields ของ places:** `name_i18n, description_i18n, geo, address_i18n, opening_hours, price_band, status, category, subcategory` → เก็บใน `places_history` ทุกครั้งที่ change_proposal ถูก approve

##### 3.2.1 หมายเหตุ Taxonomy
ใช้ตาราง lookup `place_categories` (`category enum`, `subcategory slug`, `name_i18n`, `icon`) แทน hardcode เพื่อให้เพิ่ม subcategory ใหม่ (เช่น `cannabis_cafe`, `craft_market`) โดยไม่แก้ schema และแปลภาษาได้ครบ 3 ภาษา

---

### 3.3 กลุ่ม B — Identity

#### `users`
บัญชี auth กลาง (เชื่อม Supabase Auth) รองรับ LINE (Thais), Apple/Google (foreigners), WeChat (จีน)

| field | type | หมายเหตุ |
|---|---|---|
| `id` | uuid PK | = Supabase `auth.uid()` |
| `primary_locale` | enum | `th / en / zh` (drives UI + ภาษา content ที่ดึง) |
| `auth_providers` | jsonb | `[{provider:"line", sub:"..."}, {provider:"apple"...}]` (รองรับ link หลาย provider) |
| `home_city_id` | uuid FK | เมืองหลักของ user |
| `audience_segment` | enum | `local / nomad_expat / tourist_west / tourist_cn` (ใช้ personalize + analytics, derive ได้) |
| `status` | enum | `active / suspended / banned` (anti-fraud) |

#### `profiles`
ข้อมูล public/ display แยกจาก auth

| field | type | |
|---|---|---|
| `user_id` | uuid PK FK → users | 1:1 |
| `display_name` | text | |
| `avatar_media_id` | uuid FK → media | |
| `spark_tier` | enum | `bronze/silver/gold/platinum` (derive จากยอด Sparks แต่ cache ที่นี่เพื่อ leaderboard) |

#### `roles` + `user_roles`
RBAC ครบ 12 role ตาม canonical naming — **scoped ได้ตาม city/merchant**

`roles`: `Customer, Platform Owner, Platform Admin, Merchant, Field Agent, Content Moderator, City/Regional Manager, Brand/Sponsor, Support/CS, Finance/Payout, Analyst/API-Partner, DPO`

`user_roles`

| field | type | หมายเหตุ |
|---|---|---|
| `user_id` | uuid FK | |
| `role` | enum | |
| `scope_city_id` | uuid FK nullable | เช่น City Manager ของ CNX เท่านั้น |
| `scope_merchant_id` | uuid FK nullable | Merchant role ผูกร้านไหน |
| `granted_by` | uuid FK → users | audit |

> RLS policies ของ Supabase อ้าง `user_roles` + `scope_*` เพื่อบังคับ multi-tenant isolation (เช่น Merchant เห็นเฉพาะ places/escrow ของ merchant_id ตัวเอง)

#### `devices`
Anti-fraud: ผูก device ↔ user สำหรับ identity-graph, per-device caps, impossible-travel

| field | type | หมายเหตุ |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `device_fingerprint` | text (hashed) | |
| `platform` | enum | `ios / android` |
| `push_token` | text | |
| `last_geo_coarse` | geography(POINT) | **coarse only** (เมือง/ย่าน ไม่ใช่ราย metre) — PDPA |
| `risk_score` | numeric | คำนวณจากพฤติกรรม |

#### `consents` (PDPA core)
บันทึก lawful basis + consent ต่อ dataset แบบ versioned ห้ามลบ

| field | type | หมายเหตุ |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `purpose` | enum | `location_checkin / marketing / analytics_anon / data_product` |
| `lawful_basis` | enum | `consent / contract / legitimate_interest` |
| `granted` | bool | |
| `policy_version` | text | เวอร์ชัน privacy policy ที่ยอมรับ |
| `granted_at` / `revoked_at` | timestamptz | |

---

### 3.4 กลุ่ม C — Content

#### `media`
รูป/วิดีโอ (Place photos, review photos, avatar, quest art) เก็บใน Supabase Storage, row นี้คือ metadata

| field | type | หมายเหตุ |
|---|---|---|
| `id` | uuid PK | |
| `owner_type` | enum | `place / review / quest / profile / campaign` (polymorphic) |
| `owner_id` | uuid | อ้างถึง row ปลายทาง |
| `merchant_id` / `city_id` | uuid FK | tenancy (denormalized เพื่อ RLS/CDN) |
| `storage_path` | text | |
| `kind` | enum | `image / video` |
| `caption_i18n` | jsonb | |
| `uploaded_by` | uuid FK → users | |
| `moderation_status` | enum | `pending / approved / rejected` |

#### `deals` (promotions)
โปรโมชัน/ดีลของร้าน (แยกจาก Quest/Coins — นี่คือดีลตรง ไม่ใช่ loyalty)

| field | type | หมายเหตุ |
|---|---|---|
| `id` | uuid PK | |
| `place_id` / `merchant_id` / `city_id` | uuid FK | tenancy |
| `title_i18n`, `terms_i18n` | jsonb | |
| `deal_type` | enum | `percent_off / fixed_off / bogo / freebie` |
| `value` | numeric | |
| `starts_at` / `ends_at` | timestamptz | seasonal (Songkran, Yi Peng) |
| `quota_total` / `quota_used` | int | จำกัดจำนวน |
| `audience_filter` | jsonb | เช่น เฉพาะ `tourist_cn` หรือ tier ≥ gold |
| `status` | enum | `scheduled / active / paused / expired` |

#### `reviews` (verified-visitor weighted)
รีวิว — น้ำหนักขึ้นกับ trust tier ของ check-in ที่พิสูจน์ว่าไปจริง

| field | type | หมายเหตุ |
|---|---|---|
| `id` | uuid PK | |
| `place_id` / `merchant_id` / `city_id` | uuid FK | tenancy |
| `user_id` | uuid FK | |
| `rating` | int (1–5) | |
| `body_i18n` | jsonb | ภาษาที่ผู้ใช้เขียน + auto-translate fields |
| `original_locale` | enum | ภาษาต้นฉบับ |
| `linked_check_in_id` | uuid FK → check_ins | nullable — มีไว้ก็ได้ verified badge |
| `trust_weight` | numeric | **derive จาก check_ins.trust_tier** (`gps_dwell < verified_visit < proven_purchase`) → ใช้ถ่วงคะแนนเฉลี่ยร้าน กัน fake review |
| `moderation_status` | enum | |

> **กลไก anti-fake-review:** คะแนนเฉลี่ยที่แสดง = weighted mean ด้วย `trust_weight` รีวิวจากคนที่ `proven_purchase` มีน้ำหนักสูงสุด รีวิวที่ไม่มี check-in เลยน้ำหนักต่ำสุด

---

### 3.5 กลุ่ม D — Gamification

#### `quests`
trail แบบ cross-merchant (เช่น "Nimman Cafe-Hop") รวมหลาย Place เป็นภารกิจ

| field | type | หมายเหตุ |
|---|---|---|
| `id` | uuid PK | |
| `city_id` / `district_id` | uuid FK | tenancy + scope ย่าน |
| `title_i18n`, `description_i18n` | jsonb | |
| `cover_media_id` | uuid FK | |
| `quest_type` | enum | `standard / sponsored / festival` |
| `sponsor_id` | uuid FK → sponsors | nullable (ถ้า sponsored/festival) |
| `funding_escrow_wallet_id` | uuid FK → escrow_wallets | **wallet ที่จ่ายรางวัล** (merchant หรือ sponsor) |
| `reward_coin_amount` | int | Coins ที่ mint ตอนจบ quest |
| `reward_spark_amount` | int | Sparks (free XP) |
| `reward_terms_i18n` | jsonb | เช่น "ฟรีกาแฟ 1 แก้ว" |
| `min_steps_required` | int | ต้องครบกี่ step |
| `starts_at` / `ends_at` | timestamptz | festival window |
| `status` | enum | `draft / active / **paused_zero_balance** / ended` |

> **Zero-balance auto-pause:** เมื่อ `escrow_wallets.balance < reward_coin_amount` ระบบเซ็ต quest → `paused_zero_balance` อัตโนมัติ (trigger/edge function) แพลตฟอร์มไม่เคยสำรองเงินให้

#### `quest_steps`
หนึ่ง step = หนึ่ง required visit ภายใน quest

| field | type | หมายเหตุ |
|---|---|---|
| `id` | uuid PK | |
| `quest_id` | uuid FK | |
| `place_id` | uuid FK | ร้านที่ต้องไป |
| `merchant_id` / `city_id` | uuid FK | denormalized tenancy |
| `step_order` | int | ลำดับ (หรือ 0 = ทำข้ามได้) |
| `required_trust_tier` | enum | ขั้นต่ำของ check-in ที่นับ (เช่นต้อง `proven_purchase`) |
| `bonus_spark` | int | |

#### `passports` + `quest_progress`
**Passport** = surface ความคืบหน้าของ user (1 user : N quest) — `quest_progress` = สถานะรายคน-ราย quest

`quest_progress`

| field | type | หมายเหตุ |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `quest_id` | uuid FK | |
| `city_id` | uuid FK | tenancy |
| `steps_completed` | uuid[] / jsonb | quest_step ids ที่ทำแล้ว (อ้าง check_in) |
| `status` | enum | `in_progress / completed / redeemed / expired` |
| `completed_at` | timestamptz | |
| `reward_grant_id` | uuid FK → coin_grants | เชื่อมไป mint Coins ตอนจบ |

#### `check_ins` (trust tier — anti-fraud core)
หลักฐานว่า user ไปถึง Place จริง = ตัวขับ quest progress + review weight แต่ **ไม่เก็บ movement graph**

| field | type | หมายเหตุ |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `place_id` | uuid FK | |
| `merchant_id` / `city_id` | uuid FK | tenancy |
| `quest_step_id` | uuid FK nullable | ถ้าเป็น check-in เพื่อ quest |
| `trust_tier` | enum | **`gps_dwell` (1) < `verified_visit` (2, สแกน QR หมุนของร้าน) < `proven_purchase` (3, ผูก redemption/บิล)** |
| `method` | enum | `gps_dwell / rotating_qr / merchant_otp / receipt` |
| `geo_coarse` | geography(POINT) | **coarse + ephemeral** — เก็บแค่ยืนยัน geofence แล้ว purge raw หลัง N วัน เก็บแค่ "fact ว่าผ่าน geofence" |
| `dwell_seconds` | int | สำหรับ tier 1 |
| `device_id` | uuid FK → devices | impossible-travel + per-device cap |
| `risk_flags` | text[] | `impossible_travel, velocity_cap, multi_account_ring` |
| `created_at` | timestamptz | time-boxed validation |

> **กฎ anti-fraud ที่ schema บังคับ:** ไม่มี static customer QR — `verified_visit` ต้องมาจาก rotating QR/OTP ฝั่งร้าน redemption เป็น **merchant-initiated** (ดู 3.6) `geo_coarse` + `dwell` ตรวจ impossible-travel ผ่าน `device_id` ข้าม check_ins

---

### 3.6 กลุ่ม E — Ledger (หัวใจการเงิน) ⭐

> **กฎเหล็ก:** ไม่มี `points` integer ที่ mutable ที่ไหนเลย ยอดคงเหลือทุกอย่าง (Coins ของ user, baht ใน escrow, Clearing Account) = **SUM ของ `ledger_entries`** double-entry: ทุก transaction มี debit รวม = credit รวม `ledger_entries` เป็น **append-only** ห้าม UPDATE/DELETE การแก้คือ posting รายการกลับ (reversal)

#### Entity shape ของ Ledger (แสดงชัดเจน)

```
accounts                          -- บัญชีในระบบ double-entry (chart of accounts)
├─ id              uuid PK
├─ account_type    enum           -- user_coin | merchant_escrow | platform_clearing
│                                  --  | platform_revenue | sponsor_funding | coin_liability
├─ owner_type      enum           -- user | merchant | sponsor | platform
├─ owner_id        uuid           -- user_id / merchant_id / sponsor_id / null(platform)
├─ currency        enum           -- COIN | THB | SPARK
├─ city_id         uuid FK        -- tenancy (Coins/escrow แยกตามเมืองได้)
├─ normal_balance  enum           -- debit | credit (ตามชนิดบัญชี)
└─ status          enum           -- active | frozen | closed

ledger_entries                    -- APPEND-ONLY, ไม่มี UPDATE/DELETE
├─ id              uuid PK
├─ seq             bigserial      -- ลำดับ monotonic ทั้งระบบ (ordering + audit)
├─ txn_id          uuid           -- จัดกลุ่ม: ทุก entry ที่มี txn_id เดียวกันต้อง balance
├─ account_id      uuid FK → accounts
├─ direction       enum           -- debit | credit
├─ amount          numeric(18,4)  -- > 0 เสมอ (ห้ามค่าติดลบ; ทิศทางบอกด้วย direction)
├─ currency        enum           -- COIN | THB | SPARK (ต้องตรงกับ account.currency)
├─ city_id         uuid FK        -- tenancy
├─ ref_type        enum           -- coin_grant | redemption | escrow_topup
│                                  --  | take_rate_fee | subscription | reversal | expiry
├─ ref_id          uuid           -- ชี้ไป entity ต้นทาง (redemption.id ฯลฯ)
├─ memo_i18n       jsonb
├─ posted_at       timestamptz
└─ reversal_of     uuid FK nullable → ledger_entries  -- ถ้าเป็นรายการกลับ

-- INVARIANT (บังคับด้วย trigger/edge function ก่อน commit):
--   ∀ txn_id:  SUM(debit.amount where same currency) = SUM(credit.amount)
--   balance(account) = SUM(credit) − SUM(debit)  (ปรับตาม normal_balance)
```

#### ตัวอย่าง flow → posting (ให้เห็นว่า double-entry ทำงานยังไง)

| เหตุการณ์ | Debit | Credit |
|---|---|---|
| **Merchant เติม escrow 5,000฿** | `merchant_escrow` (THB) +5000 | `platform_clearing` (THB) +5000 |
| **Quest จบ → mint Coins ให้ user** (เช่น 50 COIN จาก escrow ที่ผูก ฿) | `coin_liability` (platform, COIN) | `user_coin` (COIN) +50 — และ lock baht: `merchant_escrow`(THB)→`platform_clearing`(THB) เท่ามูลค่า |
| **Redemption: user เผา 50 COIN ที่ร้าน** | `user_coin` (COIN) −50 | `coin_liability` (COIN) −50 |
| **Take-rate fee 12% ของ redemption** | `merchant_escrow` (THB) | `platform_revenue` (THB) |
| **Coins หมดอายุ** | `user_coin` (COIN) | `coin_liability` (COIN) (reverse liability) |
| **Reversal/dispute** | post รายการกลับด้วย `reversal_of` | (ไม่เคยแก้แถวเดิม) |

> ดีไซน์นี้ทำให้: (1) audit ได้ 100% — เงินทุกบาท/ทุก Coin ตามรอยได้ (2) **Coins = non-cashable, expiring** ผูกกับ `coin_liability` ไม่ใช่เงินสด → หลีกเลี่ยง e-money scrutiny ของ BoT (3) แพลตฟอร์มไม่เคยสำรองเงิน — mint Coins ได้ต่อเมื่อมี baht ใน escrow รองรับ

#### `escrow_wallets`
มุมมองสรุป (read-model) ของ baht prefund ต่อ merchant/sponsor — **ยอดจริงมาจาก ledger** ตารางนี้ cache + metadata

| field | type | หมายเหตุ |
|---|---|---|
| `id` | uuid PK | |
| `owner_type` | enum | `merchant / sponsor` |
| `owner_id` | uuid | merchant_id / sponsor_id |
| `city_id` | uuid FK | tenancy |
| `account_id` | uuid FK → accounts | ผูก ledger account (THB) |
| `balance_cached` | numeric | **derived, ต้อง reconcile กับ SUM(ledger)** |
| `low_balance_threshold` | numeric | จุดเตือนก่อน auto-pause quest |
| `status` | enum | `active / depleted / frozen` |

#### `coin_grants` (mints)
บันทึก "เหตุการณ์การ mint Coins" — Coins เกิดได้เฉพาะตอน merchant/sponsor prefund escrow รองรับ

| field | type | หมายเหตุ |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | ผู้รับ |
| `source_type` | enum | `quest_completion / campaign / manual_admin` |
| `source_id` | uuid | quest_progress.id ฯลฯ |
| `funding_escrow_wallet_id` | uuid FK | escrow ที่หนุนหลัง (บังคับ ≠ null) |
| `coin_amount` | int | |
| `thb_value_locked` | numeric | baht ที่ถูก lock ใน escrow ต่อ grant นี้ |
| `expires_at` | timestamptz | **Coins expiring** |
| `ledger_txn_id` | uuid | ชี้ไป ledger txn ที่ post ตอน mint |
| `city_id` | uuid FK | tenancy |

#### `redemptions` (เผา Coins รับรางวัล — merchant-initiated)
หัวใจ anti-fraud ฝั่งการเงิน: ร้านเป็นคนเริ่ม, time-boxed, geofenced, burn ฝั่ง server

| field | type | หมายเหตุ |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `place_id` / `merchant_id` / `city_id` | uuid FK | tenancy |
| `deal_or_quest_ref` | uuid | รางวัลที่แลก |
| `coin_amount_burned` | int | |
| `thb_settlement` | numeric | baht ที่หักจาก escrow → จ่ายร้าน/clearing |
| `take_rate_pct` | numeric | ~10–15% capped |
| `take_rate_thb` | numeric | platform revenue |
| `initiation` | enum | **`merchant_qr` / `merchant_otp`** (ห้าม `customer_static`) |
| `qr_nonce` | text | rotating nonce, ใช้ครั้งเดียว |
| `valid_until` | timestamptz | **time-boxed** (เช่น 90 วินาที) |
| `geofence_ok` | bool | ผ่าน PostGIS geofence ของ place |
| `linked_check_in_id` | uuid FK | tier ≥ verified_visit |
| `ledger_txn_id` | uuid | burn + fee posting |
| `status` | enum | `pending / settled / expired / reversed` |

---

### 3.7 กลุ่ม F — Monetization (4 เสาเป็น module เท่ากัน)

#### `sponsors` (Brand/Sponsor — เสา c)
แบรนด์/ห้าง/TAT ที่ฟันด์ sponsored quest + festival campaign

| field | type | |
|---|---|---|
| `id` | uuid PK | |
| `city_id` | uuid FK | tenancy |
| `name_i18n`, `logo_media_id` | | |
| `escrow_wallet_id` | uuid FK | wallet ฟันด์ campaign |
| `tier` | enum | `mall / brand / tat_gov` |

#### `campaigns`
แคมเปญการตลาด ครอบ quest แบบ sponsored/festival (Yi Peng, Songkran passport)

| field | type | หมายเหตุ |
|---|---|---|
| `id` | uuid PK | |
| `sponsor_id` | uuid FK | nullable (platform-run ได้) |
| `city_id` / `district_id` | uuid FK | tenancy + scope |
| `quest_ids` | uuid[] | quests ภายใต้แคมเปญ |
| `budget_escrow_wallet_id` | uuid FK | |
| `kpi` | jsonb | reach, completions, redemptions |
| `window` | tstzrange | seasonal |

#### `subscriptions` + `invoices` (Merchant SaaS — เสา a)

`subscriptions`

| field | type | หมายเหตุ |
|---|---|---|
| `id` | uuid PK | |
| `merchant_id` / `city_id` | uuid FK | tenancy |
| `plan` | enum | `basic / pro / chain` |
| `billing_cycle` | enum | `monthly / annual` |
| `sold_by_agent_id` | uuid FK → agents | commission ของ agent ที่ขาย |
| `status` | enum | `trial / active / past_due / cancelled` |
| `current_period_end` | timestamptz | |

`invoices` ผูก PSP (Omise/2C2P/Fiuu), posting เข้า ledger (`platform_revenue`), fields: `amount, currency=THB, psp_ref, paid_at, status`

#### `affiliate_clicks` (เสา d — booking commission Klook/TakeMeTour)

| field | type | หมายเหตุ |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `place_id` | uuid FK | activity ที่คลิก |
| `partner` | enum | `klook / takemetour` |
| `outbound_ref` | text | tracking id |
| `commission_status` | enum | `clicked / booked / paid` |
| `city_id` | uuid FK | tenancy |

> เสา d ส่วน **data product** ไม่มีตาราง PII — สร้างจาก aggregate/anonymized views เหนือ check_ins/redemptions (k-anonymity) lawful basis = `data_product` consent ใน `consents`

---

### 3.8 กลุ่ม G — Field Ops (moat) + กลุ่ม H — Governance

#### `agents` (Field Agent — moat)
พนักงาน/นักศึกษา (CMU/Payap) ที่ saturate data + onboard merchant **ห้ามเขียน live data**

| field | type | หมายเหตุ |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | บัญชี (role = Field Agent) |
| `city_id` | uuid FK | tenancy |
| `affiliation` | enum | `cmu / payap / staff / freelance` |
| `status` | enum | `active / suspended / offboarded` |
| `kyc_status`, `payout_account` | (encrypted) | จ่ายค่าตอบแทน |
| `quality_score` | numeric | derive จาก approval rate ของ change_proposals |

#### `territories`
พื้นที่ geofence ที่ agent รับผิดชอบ (กัน task ทับซ้อน + วัด coverage)

| field | type | หมายเหตุ |
|---|---|---|
| `id` | uuid PK | |
| `agent_id` | uuid FK | |
| `city_id` / `district_id` | uuid FK | tenancy |
| `boundary` | geography(POLYGON) | PostGIS เช่น "Nimman Soi 1–9" |
| `assigned_at` / `expires_at` | timestamptz | |

#### `tasks`
หน่วยงานของ agent (ถ่ายรูปร้านใหม่, อัปเดต hours, ยืนยันร้านปิด)

| field | type | หมายเหตุ |
|---|---|---|
| `id` | uuid PK | |
| `agent_id` | uuid FK | |
| `territory_id` | uuid FK | |
| `place_id` | uuid FK nullable | ถ้าผูกร้านที่มีอยู่ |
| `task_type` | enum | `seed_new_place / verify_hours / refresh_photos / onboard_merchant / confirm_closed` |
| `status` | enum | `assigned / submitted / approved / rejected` |
| `reward_thb` / `reward_spark` | | ค่าตอบแทน |
| `change_proposal_id` | uuid FK | ผลงานที่ส่งเข้า moderation |

#### `change_proposals` (moderation — ทุกการแก้ผ่านที่นี่) ⭐
**ไม่มีการเขียน live ลง `places` ตรงๆ จาก agent/merchant** ทุก edit = proposal รอ Content Moderator approve

| field | type | หมายเหตุ |
|---|---|---|
| `id` | uuid PK | |
| `target_type` | enum | `place / deal / media / hours` |
| `target_id` | uuid nullable | null = สร้างใหม่ |
| `merchant_id` / `city_id` | uuid FK | tenancy |
| `proposed_by` | uuid FK → users | agent หรือ merchant |
| `proposer_role` | enum | `field_agent / merchant` |
| `diff` | jsonb | **before → after** ของ fields ที่จะเปลี่ยน |
| `evidence_media_ids` | uuid[] | รูปยืนยันหน้างาน + `evidence_geo` (coarse) |
| `status` | enum | `pending / approved / rejected / superseded` |
| `reviewed_by` | uuid FK | Content Moderator |
| `applied_version` | int | เลข version ที่ไป commit ใน `places_history` |

> เมื่อ approve → ระบบ apply `diff` ลง `places`, สร้างแถว `places_history` (version+1), อัปเดต `data_freshness`, และ post `audit_log`

#### `audit_log` (กลุ่ม H — Governance)
append-only ทุก action ที่มีผลต่อข้อมูล/เงิน/สิทธิ์

| field | type | |
|---|---|---|
| `id` | uuid PK / `seq` bigserial | |
| `actor_user_id` | uuid FK | |
| `actor_role` | enum | |
| `action` | text | `proposal.approve / redemption.settle / role.grant / consent.revoke` |
| `entity_type` / `entity_id` | | |
| `before` / `after` | jsonb | |
| `city_id` | uuid FK | tenancy |
| `ip_coarse`, `at` | | PDPA: ip แบบ coarse |

#### `data_freshness` (timestamp ความสดของข้อมูล place)
แยกตารางเพื่อให้ map/listing แสดง "ยืนยันล่าสุดเมื่อ X วันก่อน" และ trigger task เมื่อ stale

| field | type | หมายเหตุ |
|---|---|---|
| `place_id` | uuid PK FK | 1:1 กับ place |
| `last_verified_at` | timestamptz | ครั้งสุดท้ายที่ agent ยืนยันด้วยตา |
| `last_verified_by_agent_id` | uuid FK | |
| `verification_method` | enum | `field_visit / merchant_self / google_seed` |
| `staleness_days` | int (derived) | `now − last_verified_at` |
| `freshness_label` | enum (derived) | `fresh (<30d) / aging (30–90d) / stale (>90d)` → ป้ายบน UI + auto-create `task` |

#### `data_processing_records` (PDPA RoPA — สำหรับ DPO)
Record of Processing Activities ต่อ dataset (lawful basis, retention, encryption flag) — เอกสาร compliance ที่ผูกกับ schema จริง

---

### 3.9 i18n Strategy (TH / EN / Simplified-Chinese)

**ตัดสินใจ: ใช้ hybrid 2 ชั้น**

1. **Per-field JSONB (`*_i18n`) สำหรับ content สั้น/ผูกแน่นกับ row** — เช่น `places.name_i18n`, `deals.title_i18n`, `quests.title_i18n`
   - ข้อดี: query/อ่านครั้งเดียวได้ครบทุกภาษา, ไม่ต้อง join, เขียน RLS ง่าย
   - โครง: `{"th":"ร้านกาแฟ", "en":"Cafe", "zh":"咖啡馆", "_src":"th", "_mt":["zh"]}` โดย `_src` = ภาษาต้นฉบับ, `_mt` = ภาษาที่มาจาก machine-translation (ให้ moderator รู้ว่าควร review)

2. **ตาราง `translations` กลาง สำหรับ UI strings + content ยาว/ใช้ซ้ำ** — เช่น taxonomy labels, terms ของรางวัล, static UI
   - `translations(key, locale, text, namespace, is_machine, reviewed_by)`
   - ข้อดี: แชร์ข้าม row, จัดการ workflow แปลแยก, fallback chain ได้

**Fallback chain:** `user.primary_locale → city.default_locale → en` ถ้า field ภาษานั้นว่าง ดึง field text ดิบที่ผู้ใช้สร้าง (reviews) เก็บ `original_locale` + on-demand machine translation cache

### 3.10 Versioning Strategy (ฟิลด์ไหน versioned + ทำยังไง)

| Entity | Versioned? | กลไก |
|---|---|---|
| `places` (+hours, geo, price, category, i18n) | ✅ | `places_history` shadow table + `version int` + `valid_from/valid_to` — เขียนทุกครั้งที่ `change_proposal` approve |
| `deals` | ✅ (terms/value) | snapshot ใน history เมื่อแก้ |
| `consents`, `subscriptions` plan | ✅ | append แถวใหม่, ไม่ update เดิม |
| `ledger_entries` | ✅ (immutable) | append-only — "version" = reversal entry |
| `change_proposals.diff` | — | ตัว diff คือ record การเปลี่ยนเอง |
| `audit_log` | ✅ (immutable) | append-only |
| user-generated ทั่วไป (reviews body) | ❌ | แก้ = update + `updated_at` (เก็บ moderation log แทน) |

> **สรุปหลักการ versioning:** ข้อมูล Place (moat data) และข้อมูลการเงิน/สิทธิ์ → **เวอร์ชันเต็ม + immutable history** เพื่อ audit + rollback ข้อมูล UGC ทั่วไป → soft update ก็พอ

---

### 3.11 สรุป Multi-tenancy & Freshness keys (cheat-sheet สำหรับ migration #1)

- **ทุกตารางธุรกิจถือ `city_id`** (geo/content/gamification/ledger/ops) → RLS isolate ตามเมือง + scale multi-city
- **ตารางที่ผูกร้านถือ `merchant_id`** (places, deals, reviews, media, check_ins, redemptions, escrow, subscriptions, change_proposals) → RLS isolate ตาม tenant
- **Ledger ถือทั้ง `city_id` + `account.owner_id`** → แยกบัญชี Coins/escrow รายเมือง-รายเจ้าของได้
- **Freshness ผ่าน `places.verified_at` + ตาราง `data_freshness`** → ขับป้าย UI และ auto-generate `tasks` ของ Field Agent เมื่อ stale

---

## 4. RBAC — Roles, Scope & Permissions

> เป้าหมายของหมวดนี้: ออกแบบระบบสิทธิ์ที่ไม่ใช่ "flat role list" แต่เป็น **Role + Scope + light ABAC** — ทุก assignment คือการผูก **Role** เข้ากับ **Scope** (global / region / city / district / entity) การตัดสินใจ "อนุญาตหรือไม่" จึงต้องผ่านสองด่านเสมอ คือ (1) บทบาทนี้มี capability นี้ไหม และ (2) scope ของ assignment ครอบคลุม target ที่กำลังจะแตะหรือไม่ การออกแบบนี้ทำให้การขยายไป "อำเภอใหม่ / จังหวัดใหม่" เป็นแค่การ **เพิ่มแถวข้อมูล scope** ไม่ใช่การแก้โค้ด

### 4.1 หลักการออกแบบ (Design Principles)

1. **Separation of Role from Scope** — Role บอก "ทำอะไรได้" (capability) ส่วน Scope บอก "ทำกับพื้นที่/entity ไหนได้" คนคนเดียวมีได้หลาย assignment เช่น เป็น `Merchant` ของ Place ตัวเองใน Nimman และเป็น `Customer` ทั่วทั้งระบบพร้อมกัน
2. **Deny by default** — ถ้าไม่มี assignment ที่ทั้ง role-มี-capability และ scope-ครอบคลุม-target ผลคือ `deny` เสมอ ไม่มี implicit grant
3. **Light ABAC layer** — บน Role+Scope ยังมี attribute guard อีกชั้นสำหรับเงื่อนไขที่ scope ดิบบอกไม่ได้ เช่น `place.merchant_id == subject.merchant_id`, `quest_step.geofence.contains(device.location)`, `escrow.balance > 0`, `subject.kyc_status == 'verified'` ใช้เฉพาะที่จำเป็น ไม่เอามาแทน scope
4. **ทุกอย่างบังคับที่ DB ด้วย Supabase RLS** — RBAC ฝั่ง Flutter เป็นแค่ UX (ซ่อนปุ่ม) ความจริง enforce ที่ Postgres Row-Level Security + Edge Functions เท่านั้น ไม่มี client ใดเชื่อถือได้
5. **Field Agent / Merchant ไม่เคยเขียน live data** — ทุกการแก้ของ Agent และ Merchant เป็น `Change Proposal` ที่รอ moderation เสมอ (เป็น invariant ของทั้งระบบ ไม่ใช่แค่ของหมวดนี้)
6. **Segregation of Duties (SoD)** — คนที่ "สร้าง" payout ห้ามเป็นคน "อนุมัติ" payout การ grant role ระดับสูงต้องมี step-up MFA

### 4.2 โครงสร้าง Scope (Scope Hierarchy)

Scope เป็นต้นไม้ลำดับชั้น scope ที่สูงกว่า "ครอบคลุม" scope ที่ต่ำกว่าทั้งหมด:

```
global
 └─ region        (เช่น "Northern Thailand")
     └─ city      (เช่น Chiang Mai = city_id 50)
         └─ district  (เช่น Nimman, Old City, Santitham, Hai Ya)
             └─ entity   (place_id / merchant_id / quest_id เฉพาะตัว)
```

ตาราง core สองตัวที่ขับเคลื่อนทั้งหมด (สอดคล้องกับ migration #1 ที่ใส่ `merchant_id` + `city_id` เป็น key):

```sql
-- ลำดับชั้นพื้นที่ การเพิ่มเมือง/เขตใหม่ = INSERT แถวเดียว
scopes (
  scope_id      uuid pk,
  scope_type    text check (in 'global','region','city','district','entity'),
  parent_id     uuid references scopes,   -- ต้นไม้
  city_id       int,                       -- denormalized เพื่อ index/RLS เร็ว
  geom          geography,                 -- PostGIS polygon ของ district (geofence)
  label         text                       -- 'Nimman', 'Old City'
)

-- การผูก Role เข้ากับ Scope = หัวใจของ RBAC
role_assignments (
  assignment_id uuid pk,
  subject_id    uuid references users,
  role          text,                      -- หนึ่งใน 12 canonical roles
  scope_id      uuid references scopes,    -- ขอบเขตอำนาจ
  status        text default 'active',     -- active | suspended | expired
  granted_by    uuid references users,     -- ใครเป็นคนให้ (audit + SoD)
  expires_at    timestamptz,               -- assignment หมดอายุได้ (สำคัญกับ Agent)
  created_at    timestamptz
)
```

> `expires_at` สำคัญมากสำหรับ Field Agent (นักศึกษา CMU/Payap ที่จบเทอม/ลาออก) และสำหรับ Brand/Sponsor ที่ผูกกับช่วงแคมเปญเทศกาล (Yi Peng / Songkran)

### 4.3 บทบาทมาตรฐาน 12 บทบาท (The 12 Canonical Roles)

ทุกบทบาทระบุ **scope ปกติ**, **ทำอะไรได้**, และที่สำคัญที่สุด **"ทำอะไรไม่ได้"** (negative space คือสิ่งที่ป้องกัน privilege creep)

| # | Role | Scope ปกติ | ทำได้ (สรุป) | ทำไม่ได้ (CAN'T) |
|---|------|-----------|--------------|-------------------|
| 1 | **Customer** | global (ในฐานะผู้ใช้) / entity (Places ที่ตัวเองรีวิว) | ดู Place ทุกหมวด, เช็คอิน, ทำ Quest, สะสม Sparks/Coins, ใช้ Coins redeem, เขียนรีวิว, ผูก wallet จ่าย PromptPay/Alipay/WeChat | ไม่แก้ live data, ไม่ initiate redemption เอง (ต้องให้ Merchant สแกน/ออก OTP), ไม่เห็น PII คนอื่น, ไม่เห็น escrow/ledger, ไม่ self-issue Coins |
| 2 | **Platform Owner** | global | superuser ระดับธุรกิจ: เห็นทุกอย่าง, ตั้ง global policy, อนุมัติ payout วงเงินสูง, grant role ระดับ Admin | ถูก audit log จับทุก action, ไม่ bypass SoD (สร้าง payout เองแล้วอนุมัติเองไม่ได้), action บน PII/ledger ต้อง step-up MFA |
| 3 | **Platform Admin** | global หรือ region | จัดการ config ระบบ, จัดการ user/role (ต่ำกว่าตัวเอง), จัดการ Quest กลาง, ดู analytics รวม | ไม่ approve payout วงเงินเกิน threshold (ต้อง Owner), ไม่ grant role ที่ ≥ ระดับตัวเอง, ไม่ดู raw PII โดยไม่มีเหตุ (ผ่าน DPO flow) |
| 4 | **Merchant** | entity (Places + Escrow Wallet ของตัวเอง) | จัดการข้อมูลร้านตัวเอง (เป็น Change Proposal), ตั้งโปร, เติม Escrow Wallet, **initiate Redemption** (สแกน/ออก QR-OTP หมุน), ดู analytics ของร้านตัวเอง | ไม่แก้ live data ตรง ๆ (ทุกแก้เป็น proposal), ไม่แตะ Place ร้านอื่น, ไม่เห็น PII ลูกค้านอกเหนือ redemption fact, **ไม่ mint Coins เอง** (mint เกิดตอน prefund escrow เท่านั้น), ไม่ถอน escrow เป็นเงินสดอิสระ |
| 5 | **Field Agent** | district/territory (Territory ที่ geofence ไว้) | สำรวจ/เพิ่ม/แก้ Place ในเขตตัวเอง (เป็น Change Proposal), รับ Task, onboard Merchant หน้างาน, อัปโหลดรูป/พิกัด | **ไม่เขียน live data เด็ดขาด** (ทุกอย่างเป็น proposal รอ moderate), ไม่ทำงานนอก Territory, ไม่ moderate proposal ของตัวเอง, ไม่เห็น escrow/ledger/PII ลูกค้า, ไม่ออก redemption |
| 6 | **Content Moderator** | city หรือ region | อนุมัติ/ปฏิเสธ Change Proposal, รวม/ลบ duplicate Place, จัดการรีวิวที่ถูกรายงาน, ตรวจรูป | ไม่สร้าง proposal แล้ว approve ของตัวเอง (SoD), ไม่แก้ข้อมูลการเงิน, ไม่ grant role, ไม่เห็น PII เต็มของลูกค้า |
| 7 | **City/Regional Manager** | city หรือ region | คุมทีม Agent ในเมือง, อนุมัติ/วาง Territory + Task, ดู analytics ระดับเมือง, ตั้ง KPI การ seed ราย district | จำกัดที่ scope เมือง/ภาคตัวเอง (Chiang Mai manager ไม่แตะ Phuket), ไม่ approve payout การเงินกลาง, ไม่ grant role ข้ามเมือง |
| 8 | **Brand/Sponsor** | entity (Campaign/Sponsored Quest ของตัวเอง) | สร้าง/ฟันด์ Sponsored Quest + festival campaign, เติมงบแคมเปญเข้า escrow, ดู analytics เฉพาะแคมเปญตัวเอง (aggregate) | ไม่เห็น raw PII / movement graph (ได้แค่ aggregate), ไม่แก้ Place, ไม่ออก redemption, ผูกกับ `expires_at` ของแคมเปญ |
| 9 | **Support/CS** | global (read-heavy) / per-ticket | ดูข้อมูลผู้ใช้เท่าที่จำเป็นแก้ปัญหา (masked by default), ออก compensation Coins ในวงเงินจำกัด, ดูสถานะ redemption/quest ของผู้ใช้ที่เปิด ticket | ไม่แก้ ledger ตรง ๆ, ไม่ unmask PII เต็มโดยไม่มี ticket + เหตุผล (audited), ไม่ approve/create payout, ไม่ grant role |
| 10 | **Finance/Payout** | global (การเงิน) | สร้าง payout ให้ Merchant (settlement หลังหัก take-rate), กระทบยอด Clearing Account, ออกรายงานการเงิน, จัดการ refund escrow | **ไม่อนุมัติ payout ที่ตัวเองสร้าง** (SoD เด็ดขาด), ไม่แก้ Place/Quest, ไม่ grant role, ไม่ดู PII นอกเหนือที่จำเป็นต่อ settlement |
| 11 | **Analyst/API-Partner** | global (read-only, aggregate) | query analytics, ดึง data product แบบ anonymized ผ่าน API, สร้าง dashboard, ทำ affiliate reconciliation (Klook/TakeMeTour) | **read-only ทั้งหมด**, ไม่เห็น row-level PII, ไม่เห็น location movement graph, ไม่ write อะไรในระบบ operational, rate-limited |
| 12 | **DPO** (Data Protection Officer) | global (compliance) | ดู/จัดการ audit log การเข้าถึง PII, ดำเนินการ data subject request (เข้าถึง/ลบ/แก้ตาม PDPA), กำหนด retention policy, อนุมัติการ unmask PII | ไม่แตะ business config / การเงิน / Place, เป็น oversight ไม่ใช่ operator, action ของ DPO เองก็ถูก log (ใครเฝ้า DPO) |

> หมายเหตุ scope ที่เขียนว่า "global" ในตารางหมายถึง scope ของ **assignment** ไม่ได้แปลว่าเห็น PII ดิบ — การเข้าถึง PII ถูกคุมอีกชั้นด้วย ABAC + audit (ดู 4.6)

### 4.4 Permission Matrix

ค่าในเซลล์:
- **A** = `allow` — ทำได้ภายใน scope ของ assignment โดยไม่ต้องมีเงื่อนไข ABAC เพิ่ม
- **S** = `scoped` — ทำได้เฉพาะเมื่อ scope.covers(target) **และ** ผ่าน ABAC guard (เช่น ownership / geofence / balance)
- **—** = `deny`
- **S\*** = scoped + **step-up MFA บังคับ** (ดู 4.7)

| Capability \ Role | Cust | Owner | Admin | Merch | Agent | Mod | CityMgr | Sponsor | CS | Finance | Analyst | DPO |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `view_place` | A | A | A | A | S | S | S | A | A | A | A | A |
| `edit_place_live` | — | A | S | — | — | S | — | — | — | — | — | — |
| `propose_change` | — | A | S | S | S | S | S | — | — | — | — | — |
| `moderate_change` | — | A | S | — | — | S | S | — | — | — | — | — |
| `fund_escrow` | — | A | — | S | — | — | — | S | — | S | — | — |
| `issue_redemption` | — | — | — | S | — | — | — | — | S | — | — | — |
| `create_quest` | — | A | S | — | — | — | S | — | — | — | — | — |
| `fund_campaign` | — | A | S | — | — | — | S | S | — | S | — | — |
| `approve_payout` | — | S\* | S\* | — | — | — | — | — | — | — | — | — |
| `create_payout` | — | — | — | — | — | — | — | — | — | S | — | — |
| `grant_role` | — | S\* | S\* | — | — | — | S | — | — | — | — | — |
| `export_pii` | — | S\* | — | — | — | — | — | — | S\* | S | — | S\* |
| `view_analytics` | — | A | A | S | — | S | S | S | A | A | A | S |

**บันทึกการอ่าน matrix ที่ไม่ตรงไปตรงมา:**
- `issue_redemption` = **S** เฉพาะ Merchant และ CS เท่านั้น — Customer **ไม่เคย** initiate redemption เอง (กันทุจริต: ต้องให้ร้านสแกน/ออก rotating QR-OTP ที่ geofenced) CS ได้เพราะออก compensation ในวงเงินจำกัด
- `create_payout` กับ `approve_payout` **แยกคนละ role โดยตั้งใจ** — Finance สร้าง, Owner/Admin อนุมัติ คนเดียวกันทำทั้งสองไม่ได้ (SoD ที่ 4.7)
- `export_pii` เป็น **S\*** (step-up MFA) เกือบทุกที่ และ DPO เป็นคนเดียวที่ทำได้ในเชิง compliance/data-subject-request ส่วน Analyst ได้แค่ **S** เพราะ "PII" ที่ export คือ anonymized/aggregate เท่านั้น
- `edit_place_live` = **A/S** เฉพาะ Owner, Admin, Moderator — Merchant และ Agent เป็น **—** เพราะทุกการแก้ของพวกเขาผ่าน `propose_change` แล้วต้อง `moderate_change` ก่อนถึงจะ commit เป็น live (โมเดล Change Proposal เป็น hard invariant)
- `fund_escrow` ของ Analyst = **S** หมายถึง API-Partner/affiliate ที่เติมงบในนามแบรนด์ (กรณีพิเศษ) ปกติเป็น Merchant/Sponsor

### 4.5 กฎการตรวจ Scope (The Scope-Check Rule)

ทุก request ที่ touch resource จะผ่านฟังก์ชันตัดสินใจกลางเดียว ทั้งฝั่ง Edge Function และสะท้อนเป็น RLS policy:

```text
ALLOW(subject, capability, target) :=
    ∃ assignment ∈ role_assignments(subject) such that
        assignment.status == 'active'
        AND assignment.expires_at > now()
        AND ROLE_HAS_CAPABILITY(assignment.role, capability)        -- ด่าน 1: Role
        AND SCOPE_COVERS(assignment.scope, target.scope)            -- ด่าน 2: Scope
        AND ABAC_GUARD(capability, subject, target)                 -- ด่าน 3: attribute
    OTHERWISE deny
```

`SCOPE_COVERS(a, b)` = true เมื่อ `a` เป็น ancestor ของ `b` ในต้นไม้ scopes (หรือ a == b) — implement ด้วย PostGIS `ST_Contains(a.geom, b.geom)` สำหรับ geofence หรือ recursive CTE บน `parent_id`

**ตัวอย่างที่ 1 — Field Agent แก้ Place ใน Nimman (ผ่าน):**

```text
subject  = Agent "Ploy" (นักศึกษา CMU)
assignment = { role: Field Agent, scope: district 'Nimman', expires_at: end-of-semester }
capability = propose_change
target   = Place "Ristr8to, Nimman Soi 3"  → target.scope = district 'Nimman'

ด่าน 1: ROLE_HAS_CAPABILITY(Field Agent, propose_change) = true   ✓
ด่าน 2: SCOPE_COVERS(district 'Nimman', district 'Nimman')   = true   ✓  (ST_Contains)
ด่าน 3: ABAC: proposal เข้าคิว moderation, ไม่เขียน live          ✓
=> ALLOW (สร้าง Change Proposal สำเร็จ, รอ Moderator)
```

ถ้า Ploy พยายามแก้ Place ในเมือง Phuket → ด่าน 2 ล้มเหลว (`SCOPE_COVERS(Nimman, Phuket)=false`) → **deny** แม้ role จะมี capability

**ตัวอย่างที่ 2 — Merchant ออก redemption (ผ่านพร้อม ABAC):**

```text
subject  = Merchant "เจ้าของ Graph Cafe"
assignment = { role: Merchant, scope: entity place_id=Graph }
capability = issue_redemption
target   = Redemption{ place_id: Graph, customer: U, coins: 50 }

ด่าน 1: ROLE_HAS_CAPABILITY(Merchant, issue_redemption) = true        ✓
ด่าน 2: SCOPE_COVERS(entity Graph, place Graph) = true                ✓
ด่าน 3: ABAC_GUARD:
        - escrow.balance(Graph) >= reward cost        ✓
        - device.location ∈ geofence(Graph)           ✓  (กัน remote)
        - QR-OTP ยังไม่หมดอายุ + ไม่เคยถูก burn        ✓  (กัน replay)
        - ผ่าน per-user / per-device cap               ✓
=> ALLOW → burn Coins server-side, เขียน ledger แบบ double-entry
```

หาก escrow ของ Graph เป็นศูนย์ → ด่าน 3 ล้มเหลว → quest auto-pause, redemption ถูกปฏิเสธ (แพลตฟอร์มไม่สำรองเงินให้)

### 4.6 ABAC Guards ที่ใช้ซ้ำบ่อย

| Guard | ใช้กับ capability | เงื่อนไข |
|-------|-------------------|----------|
| `OWNS_ENTITY` | edit/fund/issue ของ Merchant | `target.merchant_id == subject.merchant_id` |
| `IN_GEOFENCE` | issue_redemption, check-in | `ST_Contains(place.geofence, device.location)` |
| `ESCROW_FUNDED` | issue_redemption | `escrow_wallet.balance >= reward_cost` |
| `NOT_SELF_AUTHORED` | moderate_change | `proposal.author_id != subject.id` (SoD) |
| `NOT_SELF_CREATED` | approve_payout | `payout.created_by != subject.id` (SoD) |
| `PII_MASK` | view_place/analytics ของ CS/Support | คืน masked field เว้นแต่มี active ticket + reason |
| `KYC_VERIFIED` | fund_escrow, create_payout | `subject.kyc_status == 'verified'` |
| `WITHIN_TERRITORY` | Field Agent tasks | `ST_Contains(territory.geom, target.geom)` |

### 4.7 Segregation of Duties (SoD) และ Step-up MFA

**กฎ SoD ที่บังคับใน DB (constraint/policy ไม่ใช่แค่ข้อตกลง):**

| กฎ | รายละเอียด | enforce ที่ |
|----|-----------|------------|
| Payout: creator ≠ approver | `Finance` สร้าง payout, `Owner/Admin` อนุมัติ — ห้ามคนเดียวกัน บังคับด้วย `CHECK created_by != approved_by` + ABAC `NOT_SELF_CREATED` | RLS + Edge Fn |
| Moderation: author ≠ moderator | คนสร้าง Change Proposal (Agent/Merchant/Mod) อนุมัติของตัวเองไม่ได้ (`NOT_SELF_AUTHORED`) | RLS |
| Mint ≠ Redeem | Coins ถูก mint เฉพาะตอน `fund_escrow`; ถูก burn เฉพาะตอน `issue_redemption` คนละ capability คนละ role path | ledger invariant |
| Grant role: ห้าม escalate ตัวเอง | grant role ที่ ≥ ระดับตัวเองไม่ได้ และ grant ให้ตัวเองไม่ได้ | Edge Fn + log |
| Dual control วงเงินสูง | payout/escrow refund เกิน threshold ต้องอนุมัติ 2 คน (maker-checker) | Edge Fn |

**Step-up MFA triggers** (เซลล์ `S*` ใน matrix) — บังคับยืนยันตัวตนซ้ำ (OTP/biometric) ก่อนทำ action แม้ session จะ login อยู่แล้ว:

- `approve_payout` ทุกครั้ง (เงินจริงออกจากระบบ)
- `grant_role` สำหรับ role ระดับ Admin/Owner/Finance/DPO
- `export_pii` / unmask PII (PDPA — บันทึก reason + audit เสมอ)
- การแก้ retention policy หรือ global financial config
- การ login จาก device/ตำแหน่งใหม่สำหรับ role ที่มี capability `S*` ใด ๆ

ทุก action ที่เป็น `S*` เขียน **immutable audit log** (who / what / target / scope / reason / IP / device / timestamp) ที่ DPO และ Owner ตรวจได้

### 4.8 การเพิ่มเมือง/เขตใหม่ = Scope Change ไม่ใช่ Code Change

นี่คือจุดที่การแยก Role ออกจาก Scope ให้ผลตอบแทน — การขยายธุรกิจไปจังหวัด/อำเภอใหม่ไม่ต้องแตะโค้ด RBAC, ไม่ deploy ใหม่:

```sql
-- เปิดอำเภอใหม่ "Mae Rim" ใต้เมือง Chiang Mai: INSERT แถวเดียว
INSERT INTO scopes (scope_type, parent_id, city_id, geom, label)
VALUES ('district', :chiang_mai_scope_id, 50, :mae_rim_polygon, 'Mae Rim');

-- เปิดจังหวัดใหม่ "Chiang Rai" ทั้งจังหวัด: INSERT region/city/districts
INSERT INTO scopes (scope_type, parent_id, label) VALUES ('city', :north_region_id, 'Chiang Rai');

-- จ้าง Field Agent คนใหม่ประจำ Mae Rim: ผูก role เข้า scope ที่เพิ่งสร้าง
INSERT INTO role_assignments (subject_id, role, scope_id, granted_by, expires_at)
VALUES (:agent_id, 'Field Agent', :mae_rim_scope_id, :city_manager_id, :semester_end);
```

ผลที่ตามมาโดยอัตโนมัติ (ไม่ต้องทำอะไรเพิ่ม):
- `SCOPE_COVERS` recursive CTE มองเห็น Mae Rim เป็นลูกของ Chiang Mai ทันที → City Manager ของ Chiang Mai คุม Mae Rim ได้เลยโดยไม่ต้อง re-grant
- RLS policies เดิมใช้ได้ทันทีเพราะอ้าง `scope_id` ไม่ได้ hardcode ชื่อเมือง
- Permission Matrix เดิมใช้ได้ทั้งหมด — capability ไม่ผูกกับพื้นที่
- รองรับ multi-tenant / multi-city ตั้งแต่ migration #1 (มี `city_id` + scope tree อยู่แล้ว)

> Anti-pattern ที่ห้ามทำ: เขียน `if city == 'Chiang Mai'` ในโค้ด, hardcode district enum, หรือสร้าง role ใหม่ต่อเมือง (`agent_chiangmai`, `agent_phuket`) — ทั้งหมดนี้ละเมิดหลัก "scope ไม่ใช่ role" และจะทำให้การขยายเป็น code change ทันที

---

## 5. Loyalty Engine — แต้ม, เควสต์, escrow & กันโกง

> นี่คือ **หัวใจของผลิตภัณฑ์** ทุกอย่างใน Loyalty Engine ออกแบบรอบหลักการเดียว: **ระบบไม่เคยสำรองเงินจ่ายแทนใคร (never advances money)** และ **มูลค่าทุกบาทต้องสาวกลับไปหา "ใครเป็นคนจ่าย" ได้เสมอ** ผ่าน double-entry ledger ที่ append-only เท่านั้น

### 5.0 ภาพรวมสถาปัตยกรรม (TL;DR สำหรับ dev)

```
                         ┌─────────────────────────────────────┐
   Customer check-in ───►│  Check-in Trust Engine (GPS/visit/   │
                         │  purchase) → advances Quest Step      │
                         └──────────────┬──────────────────────┘
                                        │ progress event
                         ┌──────────────▼──────────────────────┐
   Sparks (soft XP) ◄────│  Quest Engine (AND/OR, time-boxed)   │
   tiers/badges/streaks  │  → Quest complete → MINT reward      │
                         └──────────────┬──────────────────────┘
                                        │ reward = Coins (baht-backed)
                         ┌──────────────▼──────────────────────┐
   Escrow Wallet ───────►│  Double-Entry LEDGER (append-only,   │
   (merchant prefund)    │  entries sum to ZERO, idempotent)    │
                         └──────────────┬──────────────────────┘
                                        │ Coins held in user account
                         ┌──────────────▼──────────────────────┐
   Redemption ──────────►│  Redemption State Machine            │
   (merchant-initiated,  │  (rotating QR/OTP, geofence, burn    │
    rotating QR/OTP)     │  server-side, settle take-rate)      │
                         └──────────────┬──────────────────────┘
                                        │
                         ┌──────────────▼──────────────────────┐
   Fraud signals ───────►│  Anti-Fraud Layer (impossible-travel,│
   (everywhere)          │  device/identity graph, self-redeem) │
                         └─────────────────────────────────────┘
```

---

### 5.1 โมเดลสองสกุล: Sparks vs Coins — และทำไมต้อง **สอง ledger แยกกัน**

ระบบมีสกุลค่า (currency) สองสกุลที่ **แยกขาดจากกันโดยสิ้นเชิง** ทั้งในเชิงกฎหมาย, การบัญชี, และโครงสร้างตาราง

| มิติ | **Sparks** (soft XP) | **Coins** (hard, baht-backed) |
|------|----------------------|-------------------------------|
| ความหมาย | คะแนนสะสมฟรี ขับเคลื่อน gamification | มูลค่าจริง หนุนหลังด้วยเงินบาทใน escrow |
| ใช้ทำอะไร | tiers, badges, leaderboards, streaks | แลก (redeem) ของรางวัลจริงที่ Place |
| เกิดขึ้นเมื่อ | check-in, รีวิว, ทำ Task, ชวนเพื่อน | **เฉพาะ**ตอน Merchant/Sponsor prefund escrow แล้ว mint |
| แลกเป็นเงินได้ไหม | **ไม่มีวันแลกเป็นเงิน** (NEVER redeemable) | **non-cashable** + **expiring** (กันโดน BOT จับเป็น e-money) |
| มี backing ทางการเงินไหม | ไม่มี — เป็นแค่ตัวเลข integer ได้ | **ต้องมี** — ทุก Coin = 1 บาทใน Escrow Wallet ที่ถูกล็อก |
| โครงสร้างเก็บ | `sparks_balance` integer + `sparks_events` log | **double-entry ledger** เท่านั้น (ห้าม integer ที่ mutable) |
| ความเสี่ยงถ้าหาย/บั๊ก | แค่ XP เพี้ยน, รีคำนวณใหม่ได้ | **เงินจริงหาย** → ต้องตรวจสอบ/ออดิตได้ทุกบาท |

#### ทำไม **สอง ledger** ไม่ใช่ ledger เดียว?

1. **เหตุผลทางกฎหมาย (PDPA + BOT):** Coins ผูกกับเงินบาทจริง จึงเป็นข้อมูลการเงินที่ต้อง audit, มี retention policy, encrypt และพิสูจน์ที่มาได้ ส่วน Sparks เป็นแค่ engagement metric — เอามายุ่งกับเงินไม่ได้ การแยก ledger ทำให้ scope การ audit ทางการเงินแคบลงเหลือเฉพาะ Coins
2. **เหตุผลความเสี่ยง (liability):** Coins ที่ยังไม่ถูก burn คือ **หนี้สิน (liability)** ของแพลตฟอร์มต่อ merchant — ต้อง track real-time ว่ามี Coin ค้างในระบบกี่บาท Sparks ไม่ใช่หนี้สิน จะแจกเท่าไรก็ได้
3. **เหตุผลกันโกง:** ถ้ารวมสกุลเดียว คนโกง check-in เพื่อปั๊ม XP จะได้เงินจริงทันที การแยกทำให้ **Sparks แจกง่าย (low-trust check-in ก็ได้) แต่ Coins ต้องผ่าน trust gate สูงและ escrow จริง** เท่านั้น
4. **เหตุผล performance:** Sparks อ่าน/เขียนบ่อยมาก (ทุก check-in) — ใช้ integer + cache ได้ ส่วน Coins เขียนน้อยกว่าแต่ต้อง correct 100% — ยอมแลก performance เพื่อ correctness

> **กฎเหล็ก:** Sparks ไม่มีวันแปลงเป็น Coins โดยตรง การ "ได้ Coin" เกิดจาก **Merchant ตั้งรางวัลที่ prefund แล้ว** เท่านั้น Sparks แค่ปลดล็อก *สิทธิ์เข้าถึง* quest/tier บางอย่าง (เช่น tier Gold เห็น quest พิเศษ) แต่ไม่ใช่ตัวจ่ายรางวัล

---

### 5.2 Double-Entry Ledger — กลไกหัวใจของ Coins

Coins ใช้ **append-only double-entry ledger** — ไม่มีคอลัมน์ `coin_balance` ที่ update ได้ ทุกยอดคงเหลือคือ `SUM()` ของ entries balance ของบัญชีนั้นคำนวณสด (หรือ materialized view ที่ rebuild จาก log ได้)

#### ประเภทบัญชี (accounts)

| Account type | เจ้าของ | บทบาท |
|--------------|---------|-------|
| `merchant_escrow:{merchant_id}` | Merchant | เงินบาทที่ prefund เข้ามา (liability ของเราต่อ merchant) |
| `merchant_issuer:{merchant_id}` | Merchant | บัญชี "ผู้ออก Coin" — track ว่า merchant นี้ mint Coin ไปเท่าไร |
| `user_wallet:{user_id}` | Customer | Coin คงเหลือของผู้ใช้ |
| `clearing` | Platform | **Clearing Account** — บัญชีพักกลางของแพลตฟอร์มในระหว่างเคลียร์ |
| `platform_revenue` | Platform | รับ take-rate เมื่อ redeem สำเร็จ |
| `coin_expired` | Platform | ปลายทางของ Coin ที่หมดอายุ (breakage) — คืนกลับ escrow merchant |

#### กฎ invariant ที่ต้องบังคับใน DB (ห้ามฝ่าฝืน)

```
INVARIANT 1: ทุก transaction → SUM(amount ของทุก entry ใน txn นั้น) = 0
INVARIANT 2: entries เป็น append-only (no UPDATE, no DELETE) — บังคับด้วย
             trigger ที่ block UPDATE/DELETE + revoke สิทธิ์บน table
INVARIANT 3: ทุก entry บันทึก funded_by (merchant_id หรือ sponsor_id)
             → ตอบได้เสมอว่า "ใครจ่ายค่ากาแฟแก้วนี้"
INVARIANT 4: user_wallet balance >= 0 เสมอ (กัน Coin ติดลบ)
INVARIANT 5: idempotency_key UNIQUE → กดซ้ำ/retry ไม่ mint ซ้ำ
```

#### Schema (ย่อ)

```sql
-- หนึ่ง "เหตุการณ์" ทางการเงิน 1 แถว
ledger_transaction (
  id              uuid PK,
  txn_type        text,          -- 'PREFUND' | 'MINT_REWARD' | 'REDEEM' | 'EXPIRE' | 'REFUND'
  idempotency_key text UNIQUE NOT NULL,   -- INVARIANT 5
  city_id         bigint NOT NULL,        -- multi-city ตั้งแต่ migration #1
  funded_by       text,                   -- 'merchant:123' | 'sponsor:45' | 'TAT'  (INVARIANT 3)
  quest_id        uuid NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid          -- actor (server-side only)
)

-- หลาย "ขา" (legs) ต่อ 1 transaction — ต้องรวมกันเป็น 0
ledger_entry (
  id              uuid PK,
  txn_id          uuid FK -> ledger_transaction,
  account_type    text NOT NULL,    -- 'merchant_escrow' | 'user_wallet' | 'clearing' ...
  account_ref     text NOT NULL,    -- merchant_id / user_id / 'platform'
  amount_minor    bigint NOT NULL,  -- หน่วยสตางค์ (สตางค์ = 1/100 บาท), +/- 
  currency        text DEFAULT 'COIN',  -- 'COIN' หรือ 'THB' (เฉพาะ escrow ขา baht)
  funded_by       text NOT NULL,    -- denormalize INVARIANT 3 ลงทุก leg
  expires_at      timestamptz NULL  -- Coin มีวันหมดอายุ (lot-based, ดู 5.8)
)
-- CHECK trigger: ก่อน commit -> assert SUM(amount_minor) per txn_id = 0
```

#### ตัวอย่าง entries ของแต่ละ txn_type (อ่านจากบนลงล่างตาม lifecycle ของ 1 Coin)

**(A) PREFUND** — Merchant เติมเงิน 5,000 บาทเข้า Escrow (ผ่าน PromptPay/Omise)
```
txn: PREFUND, funded_by=merchant:123
  + merchant_escrow:123      +500000 สตางค์ (THB)   ← escrow เพิ่ม
  - clearing                 -500000 สตางค์ (THB)   ← เงินเข้ามาจาก PSP ผ่าน clearing
SUM = 0 ✓   (เงินบาทจริง ยังไม่ใช่ Coin)
```

**(B) MINT_REWARD** — User ทำ Quest ครบ → mint รางวัล Coin มูลค่า 60 บาท
```
txn: MINT_REWARD, funded_by=merchant:123, quest_id=...
  - merchant_escrow:123      -6000 สตางค์ (THB ถูกล็อก)  ← เงินบาทถูกกัน
  + merchant_issuer:123      +6000 (COIN) ออก Coin       
  - merchant_issuer:123      -6000 (COIN)                 
  + user_wallet:user_789     +6000 (COIN, expires_at=+90d, funded_by=merchant:123)
SUM(THB) = -6000+... กับ SUM(COIN)=0 ต่อสกุล ✓
```
> หมายเหตุ: เราเก็บ Coin กับ baht backing เป็น **คู่ขนาน** — 1 COIN minor = 1 THB minor (สตางค์) ที่ถูกล็อกใน escrow ทำให้ track liability ตรงๆ ได้ ทุก Coin ใน `user_wallet` มี baht ค้ำอยู่ใน `merchant_escrow` เสมอ

**(C) REDEEM** — User ใช้ 60 บาท Coin แลกกาแฟที่ Place, take-rate 12%
```
txn: REDEEM, funded_by=merchant:123
  - user_wallet:user_789     -6000 (COIN)        ← burn Coin
  + clearing                 +6000 (COIN→settle)
  -- ขา settlement เป็น THB จาก escrow ที่ล็อกไว้:
  - merchant_escrow:123(lock) -6000 (THB ปลดล็อก ออกจริง)
  + merchant_payout:123       +5280 (THB ให้ merchant 88%)
  + platform_revenue          +720  (THB take-rate 12%)
SUM ต่อสกุลเป็น 0 ✓
```

**(D) EXPIRE** — Coin หมดอายุไม่ถูกใช้ → คืนเงินบาทกลับ escrow (ดู guardrail 5.8)
```
txn: EXPIRE, funded_by=merchant:123
  - user_wallet:user_789     -6000 (COIN)        ← burn Coin ที่หมดอายุ
  + coin_expired             +6000 (COIN)
  - merchant_escrow:123(lock) -6000 (THB ปลดล็อก)
  + merchant_escrow:123      +6000 (THB คืนเข้า available)  ← เงินคืน merchant
```

> **ทำไมต้อง record `funded_by` ทุก leg:** เมื่อ Finance/Payout หรือ DPO ถามว่า "Coin ที่ user คนนี้ถืออยู่ ใครเป็นคน fund" หรือ "festival campaign ของ TAT ใช้เงินไปเท่าไร" เราตอบได้ด้วย query เดียว ไม่ต้องเดา — และทำให้ sponsored quest (เงิน sponsor) แยกออกจาก merchant-funded reward ได้ชัดในบัญชี

---

### 5.3 Escrow Wallet — prefund, auto-pause, settlement & take-rate

#### หลักการ
- Merchant (หรือ Brand/Sponsor) **เติมเงินบาทล่วงหน้า** เข้า Escrow Wallet ผ่าน Thai PSP (PromptPay/Omise) หรือ Alipay/WeChat (กรณี sponsor จีน)
- ทุกครั้งที่จะ mint Coin เป็นรางวัล ระบบ **ล็อก (reserve)** เงินบาทเท่ามูลค่า reward จาก `available` → `locked`
- **แพลตฟอร์มไม่เคยสำรองจ่ายเอง** ถ้า escrow ไม่พอ → mint ไม่ได้
- **Auto-pause-on-zero:** เมื่อ `available_balance < cost ของ reward ถัดไป` → Quest ที่ merchant คนนี้เป็นผู้ fund **ถูก pause อัตโนมัติ** ทันที (สถานะ `PAUSED_NO_FUNDS`) ผู้ใช้เห็นว่า "quest นี้พักชั่วคราว" และ merchant ได้ alert ให้เติมเงิน

```
Escrow Wallet state (per merchant):
  available_balance  = ยอดที่ใช้ mint ได้
  locked_balance     = เงินค้ำ Coin ที่ mint แล้วแต่ยังไม่ถูก redeem/expire (= liability)
  เงื่อนไข pause: available_balance < next_reward_cost  →  PAUSED_NO_FUNDS
  low-balance alert: available_balance < (7-day avg burn rate)  →  push เตือน + email agent
```

#### ใครจ่ายค่ากาแฟฟรี? — Worked Example (ตัวเลขจริง)

**สถานการณ์:** ร้าน *Ristr8to* (Nimman Soi 3) ตั้ง reward "กาแฟฟรี 1 แก้ว มูลค่า 90 บาท" ใน Quest "Nimman Cafe-Hop" (เยี่ยม 3 ร้าน) Take-rate แพลตฟอร์ม = 12%

| ขั้นตอน | เกิดอะไร | Escrow `available` | Escrow `locked` | Platform revenue |
|---------|----------|-------------------:|----------------:|----------------:|
| 0. เริ่มต้น | Ristr8to prefund 10,000 บาท | 10,000 | 0 | 0 |
| 1. User ทำ Quest ครบ | mint Coin 90 บาท ให้ user, ล็อกเงิน | 9,910 | 90 | 0 |
| 2. User เดินมาแลกที่ร้าน | redeem: burn Coin, settle | 9,910 | 0 | **+10.80** |
| 3. หลัง settle | จ่าย merchant 79.20, แพลตฟอร์มเก็บ 10.80 | 9,910 | 0 | 10.80 |

**ใครจ่ายค่ากาแฟ 90 บาท?** → **Ristr8to จ่ายเอง** จาก escrow ของตัวเอง (90 บาทออกจาก escrow) แพลตฟอร์มหักค่าธรรมเนียม 12% = 10.80 บาทจากยอดนั้น merchant ได้รับ settlement สุทธิ 79.20 บาท (= มูลค่าที่ merchant "เสีย" จริงคือต้นทุนกาแฟ + 10.80 ค่า service ให้แพลตฟอร์ม) **แพลตฟอร์มไม่เคยควักเงินเลยสักบาท**

> เหตุผลที่ merchant ยอม: เขาได้ลูกค้าเดินเข้าร้านจริง (กาแฟต้นทุนจริง ~25-30 บาท แต่ราคาขาย 90) + ลูกค้าเพิ่งไปอีก 2 ร้าน = traffic จาก cross-merchant network การเสีย 10.80 บาทถูกกว่าค่าโฆษณา CAC ปกติมาก

**กรณี sponsored quest (เงิน TAT/ห้าง):** ถ้าเป็น Quest "Songkran 2026 Old City Trail" ที่ **TAT sponsor** → reward fund มาจาก `sponsor_escrow:TAT` แทน merchant escrow `funded_by='sponsor:TAT'` ใน ledger — merchant ที่ร่วม quest ไม่เสียเงินค่ารางวัล (แต่ได้ traffic ฟรี) take-rate ยังเก็บจาก sponsor budget

---

### 5.4 Quest Mechanics — cross-merchant trail, AND/OR, seasonal, Passport UX

#### โครงสร้าง Quest

```
Quest (
  id, city_id, title_th/en/zh,
  type           : 'STANDARD' | 'SPONSORED' | 'FESTIVAL',
  funded_by      : merchant_id | sponsor_id,
  reward_coin    : มูลค่าบาทของรางวัล (mint ตอนจบ),
  reward_place_id: แลกได้ที่ Place ไหน (อาจ != ร้านใน step),
  starts_at, ends_at : NULL = ตลอดไป / มีค่า = time-boxed/seasonal,
  step_logic     : 'AND' | 'OR' | 'N_OF_M',
  required_count : สำหรับ N_OF_M (เช่น 3 of 5),
  min_trust_level: trust ขั้นต่ำที่นับ step (ดู 5.6),
  status         : 'ACTIVE' | 'PAUSED_NO_FUNDS' | 'ENDED'
)

Quest_Step (
  id, quest_id, place_id, ordinal,
  required_action : 'CHECKIN' | 'VERIFIED_VISIT' | 'PROVEN_PURCHASE',
  window_minutes  : NULL หรือกำหนดเวลาต่อ step (เช่น เยือนภายในวันเดียว)
)
```

#### Logic แบบต่างๆ (Chiang Mai examples)

| Quest | Logic | Steps |
|-------|-------|-------|
| **Nimman Cafe-Hop** | `AND` (ครบทุกร้าน) | Ristr8to + Graph Cafe + Akha Ama (Soi 1-9) ภายใน 7 วัน |
| **Old City Temple Trail** | `N_OF_M` (3 of 5) | Wat Phra Singh, Wat Chedi Luang, Wat Phan Tao, Wat Chiang Man, Wat Sri Suphan |
| **Sunday Walking Street Foodie** | `OR` (ร้านไหนก็ได้ใน list) | เลือก 1 จาก 10 ร้าน street food บนถนนราชดำเนิน |
| **Songkran Old City (FESTIVAL)** | `N_OF_M` + time-boxed | active เฉพาะ 13-15 เม.ย. 2026, TAT sponsor |

#### Passport UX (พื้นผิวความคืบหน้าของผู้ใช้)

```
┌─ Passport ──────────────────────────────┐
│  🗺  Nimman Cafe-Hop          2/3 ✓✓◻    │
│  ████████░░░░  เหลืออีก 1 ร้าน            │
│  รางวัล: ☕ กาแฟฟรี (Akha Ama) มูลค่า 90฿  │
│  ⏳ เหลือ 4 วัน  •  funded by Ristr8to     │
│  ─────────────────────────────────────  │
│  ✓ Ristr8to     เยือนแล้ว 12 มิ.ย.       │
│  ✓ Graph Cafe   เยือนแล้ว 13 มิ.ย.       │
│  ◻ Akha Ama     ยังไม่ไป → [นำทาง Mapbox] │
└──────────────────────────────────────────┘
```

- **Progression แบบเห็นได้ทันที:** แต่ละ step เปลี่ยนเป็น ✓ เมื่อ check-in ผ่าน trust gate
- **Passport stamp animation:** เมื่อ complete step → แสตมป์ปั๊ม (gamified, ปั๊ม + Sparks)
- **Sparks ระหว่างทาง / Coins ตอนจบ:** ทุก step ได้ Sparks (engagement) แต่ **Coin reward mint เฉพาะตอน Quest complete** (กัน mint เปลือง escrow ระหว่างทาง)
- **Trilingual:** title/description มี TH/EN/ZH; Passport สลับภาษาตาม user locale (LINE login → TH default, Apple/Google → device locale)
- **Seasonal surfacing:** Quest FESTIVAL เด้งขึ้นบนสุดช่วงเทศกาล (Yi Peng/Songkran) เป็น upside ขายได้

---

### 5.5 Redemption — State Machine (merchant-initiated, rotating QR/OTP, geofence, server-burn)

> **กฎกันโกงข้อแรก:** ไม่มี static customer QR เด็ดขาด ทุก redemption ต้อง **merchant เป็นผู้เริ่ม (merchant-initiated)**, มี QR/OTP ที่ **หมุนเปลี่ยน (rotating)**, **time-boxed**, ตรวจ **geofence**, และ **burn ฝั่ง server เท่านั้น**

#### State machine

```
        user มี Coin พอ + อยู่ในรัศมี Place
                    │
                    ▼
            ┌──────────────┐
            │   PENDING    │  user กด "ขอแลก" → สร้าง redemption intent
            └──────┬───────┘
                   │ merchant เปิดหน้าจอร้าน → ระบบ gen rotating code
                   ▼
            ┌──────────────┐   QR/OTP เปลี่ยนทุก 30 วิ (TOTP-style),
            │  CODE_ISSUED │   ผูกกับ place_id + redemption_id + nonce,
            └──────┬───────┘   มีอายุ 90 วินาที
                   │ user สแกน QR ของร้าน (หรือร้านสแกน QR user / กรอก OTP)
                   ▼
            ┌──────────────┐   server ตรวจ:
            │  VALIDATING  │   1) code ยังไม่หมดอายุ + ไม่เคยใช้
            └──────┬───────┘   2) geofence: user ∈ Place radius (PostGIS ST_DWithin)
                   │           3) GPS dwell + impossible-travel ผ่าน
                   │           4) user มี Coin >= reward จริง
        ┌──────────┴──────────┐
   pass │                     │ fail
        ▼                     ▼
  ┌──────────┐         ┌──────────────┐
  │ BURNING  │         │   REJECTED   │ (เหตุผล: expired/out_of_geofence/
  └────┬─────┘         └──────────────┘  insufficient/fraud_flag)
       │ server-side: เขียน REDEEM txn (5.2-C) แบบ atomic
       │ idempotency_key = redemption_id → กดซ้ำไม่ burn ซ้ำ
       ▼
  ┌──────────┐
  │ SETTLED  │  Coin burned, escrow ปลดล็อก, take-rate เข้า platform,
  └──────────┘  merchant + user เห็น receipt, push ยืนยัน
```

#### Offline fallback (เน็ตร้านล่ม / สัญญาณ Old City อ่อน)

ปัญหาจริงในเชียงใหม่: ร้านในซอยเล็ก/วัดเก่า สัญญาณไม่เสถียร

```
OFFLINE MODE:
1. Merchant app cache "signed redemption voucher" ล่วงหน้า (signed by server,
   ผูก place_id, มี short TTL เช่น 24 ชม.)
2. User แสดง redemption_id + one-time signed nonce (จาก app, ใช้ครั้งเดียว)
3. Merchant device ตรวจ signature offline → ออกใบรับชั่วคราว (PROVISIONAL_BURN)
   พร้อมเก็บ proof (nonce + GPS + timestamp + device_id) ใน outbox
4. เมื่อกลับ online → sync: server reconcile, burn จริง, settle
   ถ้า reconcile fail (เช่น Coin ไม่พอ/ใช้ซ้ำ) → flag dispute, ไม่ settle จ่าย
```

> หลักการ: offline ยอมให้ "ทำรายการเสร็จหน้าร้าน" ได้ แต่ **การ burn จริงและ settle เงินเกิดเมื่อ reconcile online เท่านั้น** — กัน double-spend ด้วย one-time nonce + idempotency key ความเสี่ยงตกอยู่กับ merchant ที่เลือกรับ offline (เหมือนรับเช็ค) ไม่ใช่แพลตฟอร์ม

---

### 5.6 Tiered Check-in Trust — GPS dwell < verified visit < proven purchase

ไม่ใช่ทุก check-in เชื่อถือได้เท่ากัน เราจัด **3 ระดับความเชื่อถือ** และ **Quest แต่ละอันกำหนด `min_trust_level`** ว่า step จะนับเมื่อถึงระดับไหน

| Level | ชื่อ | พิสูจน์ด้วย | ความเชื่อถือ | นับ Quest Step? |
|-------|------|------------|--------------|-----------------|
| **T1** | **GPS Dwell** | อยู่ในรัศมี geofence ของ Place ติดต่อกัน ≥ N นาที (เช่น 5 นาที), ไม่ใช่ GPS วูบเดียว | ต่ำ — แค่ "เคยอยู่แถวนั้น" | เฉพาะ quest ฟรี/low-stakes; ได้ Sparks เต็ม |
| **T2** | **Verified Visit** | T1 + สัญญาณยืนยันที่สอง: สแกน QR ในร้าน / merchant ยืนยัน / Wi-Fi BSSID ของร้าน / NFC tag | กลาง — "อยู่ในร้านจริง" | นับ step ของ quest ส่วนใหญ่ |
| **T3** | **Proven Purchase** | T2 + หลักฐานซื้อจริง: redemption ที่ POS / e-receipt / merchant tap "confirm purchase" | สูง — "ซื้อของจริง" | นับ step ของ quest ที่ reward สูง / sponsored |

```
กฎ: Coin reward มูลค่าสูง  →  ต้อง min_trust_level สูง (T2/T3)
    Sparks (XP)            →  T1 ก็พอ (แจกง่าย กระตุ้น engagement)
    ป้องกัน: "ขับรถผ่าน Nimman แล้วได้กาแฟฟรี" เป็นไปไม่ได้
            เพราะ reward จริงบังคับ T2+ (ต้องเข้าร้าน + ยืนยัน)
```

> เชื่อมกับ 5.5: **redemption ที่ POS ดันให้ check-in นั้นกลายเป็น T3 ย้อนหลัง** — closing the loop ระหว่าง "เยือน" กับ "ซื้อจริง" และ feed ข้อมูล proven-purchase กลับเข้า trust engine

---

### 5.7 Tiers, Badges, Streaks, Scoped Leaderboards (ขับด้วย Sparks)

ทั้งหมดนี้ใช้ **Sparks เท่านั้น** — ไม่แตะ Coins/escrow เลย

| ฟีเจอร์ | กลไก | ตัวอย่างเชียงใหม่ |
|---------|------|------------------|
| **Tiers** | สะสม Sparks → Bronze/Silver/Gold/"ขุนเขา (Doi)" tier; ปลดล็อกสิทธิ์เห็น quest พิเศษ, take ที่ดีกว่า | Gold เห็น "Hidden Santitham Local Eats" ก่อนใคร |
| **Badges** | สำเร็จ achievement | "นักล่าวัด" (เยือน 10 วัด Old City), "Nimman Regular", "สายคาเฟ่ดอย" |
| **Streaks** | check-in ต่อเนื่องรายวัน/สัปดาห์ → Sparks multiplier | ช่วยดัน retention นอกฤดู (burning/rainy season) |
| **Leaderboards (scoped)** | จัดอันดับแยกตาม scope ไม่รวมทั้งประเทศ | per-district (Nimman/Old City/Santitham), per-quest, per-university (CMU vs Payap), per-month |

> **ทำไม scoped:** leaderboard ระดับเมืองทำให้คนใหม่ท้อ (ตามไม่ทัน) การ scope ลง district/มหาลัย/รายเดือน ทำให้แข่งกับคนใกล้ตัว — และตรงกับ rollout แบบ district-by-district + ฐาน CMU/Payap students/nomads ที่เป็น core retention

---

### 5.8 Economy Guardrails — กันเศรษฐกิจพัง

| Guardrail | กลไก | เหตุผล |
|-----------|------|--------|
| **Coin expiry (lot-based)** | ทุก Coin lot มี `expires_at` (เช่น 90 วันจาก mint) หมดอายุ → EXPIRE txn คืนเงินเข้า escrow merchant | กัน liability ค้างนาน + ดัน user ให้ใช้ + กัน BOT มองเป็น stored value |
| **Earn caps** | จำกัด Coin/Sparks ที่ได้ต่อ user/วัน, ต่อ device/วัน, ต่อ quest | กัน farming |
| **Dynamic reward sizing** | reward ปรับตาม escrow คงเหลือ + เวลา (rainy season ให้ reward สูงดึงคน / Songkran ลด) | คุม burn rate ให้ตรง budget merchant |
| **Live liability tracking** | dashboard: `SUM(locked escrow)` = หนี้สิน Coin คงค้าง real-time ต่อ merchant + ทั้งระบบ | Finance เห็น exposure ทุกวินาที |
| **Never pre-spend breakage** | **ห้าม** บันทึก Coin หมดอายุเป็นรายได้ล่วงหน้า — breakage รับรู้ **เมื่อ EXPIRE txn เกิดจริง** เท่านั้น และคืน merchant ไม่ใช่เก็บเข้า platform | ความถูกต้องบัญชี + ไม่หลอกตัวเองเรื่องรายได้ |
| **Mint gating** | mint ได้เฉพาะเมื่อ escrow `available >= cost` (atomic check + lock) | บังคับ "ไม่สำรองจ่าย" ที่ระดับ DB |

```
Liability check (รันก่อน mint ทุกครั้ง, ใน transaction เดียว):
  SELECT available_balance FROM escrow WHERE merchant_id=? FOR UPDATE;
  IF available < reward_cost: 
       set quest PAUSED_NO_FUNDS; abort mint;
  ELSE: 
       lock(reward_cost); insert MINT_REWARD txn; commit;
```

---

### 5.9 Anti-Fraud Layers (กันโกง — existential)

ของฟรีดึงคนโกง ระบบมีหลายชั้นซ้อนกัน (defense in depth)

| ชั้น | ตรวจอะไร | กลไก |
|------|----------|------|
| **1. Impossible-travel** | check-in 2 จุดที่ระยะ/เวลาไปไม่ทันจริง | คำนวณ speed ระหว่าง check-in ติดกัน; เกิน threshold (เช่น >120 km/h ในเมือง) → flag + ไม่นับ step |
| **2. Geofence + dwell** | อยู่ในร้านจริงไหม | PostGIS `ST_DWithin` + ต้องอยู่ต่อเนื่อง ≥ N นาที; ไม่รับ raw GPS วูบเดียว |
| **3. Device graph** | หลาย account เครื่องเดียว / หลายเครื่องคนเดียว | fingerprint device_id; กราฟ user↔device; ถ้า N accounts redeem จาก device เดียว → ring flag |
| **4. Identity graph** | multi-account ring | เชื่อม signal: device, IP/Wi-Fi BSSID, payment instrument, referral graph, เวลา check-in pattern → community detection หา ring |
| **5. Merchant self-redemption** | ร้านปั๊ม redeem เองเพื่อดูด escrow คืน | ตรวจ: redeem จาก device/account ที่ผูกกับ merchant, อัตรา redeem ผิดปกติ (เช่น 50 แก้ว/ชม.), redeem นอกเวลาทำการ, user ใหม่เอี่ยมที่เพิ่งสมัครแล้ว redeem ทันที → hold settlement + manual review โดย Content Moderator/Finance |
| **6. Referral vesting** | ปั๊ม referral ปลอม | reward จากการชวนเพื่อน **ไม่จ่ายทันที** — vest หลังเพื่อนใหม่มี T2/T3 activity จริง ภายใน window (เช่น เพื่อนต้องทำ verified visit ≥ 2 ครั้งใน 14 วัน Coin referral ถึง mint) |
| **7. Rate / velocity caps** | abuse เชิงปริมาณ | cap ต่อ user/device/quest/วัน; sudden spike → throttle + flag |
| **8. Server-side burn only** | client แก้ค่าเอง | Coin balance ไม่เคยเชื่อ client; ทุก mutation ผ่าน Edge Function + RLS + ledger |

#### หลักการกันโกงที่ฝังในดีไซน์ (ไม่ใช่ bolt-on)
- **Trust ↔ value coupling:** reward ยิ่งแพง ยิ่งต้อง trust สูง (5.6) — โกงระดับ T1 ได้แค่ Sparks ไร้ค่าเงิน
- **Merchant-initiated redemption:** คนโกงนั่งบ้านแลกของไม่ได้ ต้องมีร้านกดเริ่ม + อยู่ในรัศมีจริง (5.5)
- **Append-only ledger:** ทุก fraud มี audit trail ย้อนได้ ใครได้ Coin เมื่อไร funded_by ใคร (5.2)
- **Escrow cap:** ต่อให้โกงทะลุทุกชั้น ความเสียหายสูงสุด = escrow ที่ merchant คนนั้น prefund — **แพลตฟอร์มไม่เคยขาดทุนเงินตัวเอง**

---

### 5.10 Concrete Chiang Mai Worked Examples (สรุปรวม end-to-end)

**Example A — Nimman Cafe-Hop (merchant-funded, AND logic)**
1. Ristr8to (Soi 3) เป็นเจ้าภาพ prefund escrow 10,000฿, ตั้ง reward กาแฟฟรี 90฿, แลกที่ Akha Ama
2. คุณ Mali check-in Ristr8to (T2: สแกน QR ในร้าน) → step 1 ✓ + Sparks
3. วันถัดไป Graph Cafe (T2) → step 2 ✓
4. Akha Ama (T2) → Quest complete → **mint Coin 90฿** (escrow lock 90, available 9,910)
5. Mali ขอแลก, พนักงาน Akha Ama เปิด rotating QR, Mali สแกน → geofence ✓, impossible-travel ✓ → server burn Coin
6. Settle: merchant payout 79.20฿, platform +10.80฿ (12%), escrow lock ปลดเป็น 0

**Example B — Songkran Old City Trail (TAT-sponsored, FESTIVAL, N_OF_M)**
1. TAT prefund `sponsor_escrow:TAT` 500,000฿ campaign budget, quest active 13-15 เม.ย. เท่านั้น
2. Logic = 3 of 5 วัด (Phra Singh, Chedi Luang, Phan Tao, Chiang Man, Sri Suphan)
3. นักท่องเที่ยวจีน (FIT) David check-in ครบ 3 วัด (T1 GPS dwell พอ เพราะ reward เป็น festival badge + Coin เล็ก 50฿ ที่ใช้ที่ร้านพันธมิตร)
4. complete → mint Coin 50฿ `funded_by='sponsor:TAT'`
5. David จ่ายผ่าน Alipay ปกติที่ร้าน + แลก Coin 50฿ ที่ One Nimman food court; settle หัก take-rate จาก TAT budget
6. ครบ campaign: TAT เห็น dashboard ว่า budget ใช้ไปเท่าไร, footfall แต่ละวัด, ไม่เกิน escrow ที่ตั้งไว้

**Example C — Merchant self-redemption ที่ถูกจับ (anti-fraud)**
1. ร้าน X (Santitham) prefund 5,000฿ ตั้งกาแฟฟรี 80฿
2. เจ้าของสร้าง 20 account ปลอมจากมือถือ 2 เครื่อง check-in วนแล้ว redeem รัวๆ เพื่อดูดเงิน escrow คืนเป็น settlement
3. Device graph: 20 accounts ↔ 2 devices → ring flag
4. Self-redemption: account ใหม่เอี่ยม redeem ทันทีในเวลากระชั้น + device ผูกกับ merchant → hold settlement
5. Content Moderator + Finance review → settlement ถูก freeze, escrow ไม่ถูกดูดออก, merchant ถูกระงับ
6. **ความเสียหายต่อแพลตฟอร์ม = 0฿** (เพราะไม่เคยสำรองจ่าย + settlement hold ก่อนออกเงิน)

---

> **สรุปหลักการที่ section นี้บังคับไว้ทั้งระบบ:** (1) สองสกุล สอง ledger — Sparks แจกฟรี, Coins ผูกเงินบาทเสมอ; (2) double-entry append-only, sum-to-zero, funded_by ทุก leg, idempotent; (3) escrow เป็นเพดานความเสี่ยง — never advance money, auto-pause-on-zero; (4) redemption merchant-initiated + rotating + geofence + server-burn; (5) trust ↔ value coupling เป็นแกนกันโกง

---

## 6. Field-Agent Operations — ระบบทีมอัพเดตข้อมูล (Moat)

> **หัวใจของ moat:** คู่แข่งลอกฟีเจอร์ได้ใน 3 เดือน แต่ลอก "ทีมนิสิตเดินเก็บข้อมูลทุก soi ใน Nimman + ปิดดีล merchant ต่อหน้า" ไม่ได้ ระบบนี้คือเครื่องจักรที่เปลี่ยนแรงงานคน (CMU/Payap) ให้เป็นข้อมูลสด + ร้านที่เปิดใช้ loyalty จริง โดยมี **กฎเหล็กข้อเดียว: Field Agent ไม่เคยเขียน live data — ทุกการแก้ไขคือ `Change Proposal` ที่ต้องผ่าน moderation เสมอ**

หลักการออกแบบ 5 ข้อที่ทุก subsection ยึด:
1. **Proof-gated** — ไม่มีหลักฐาน (GPS + รูปกล้องสด) = ไม่มี Task เสร็จ = ไม่มีเงิน
2. **Proposal-not-write** — Agent สร้าง `Change Proposal` เท่านั้น live table แตะไม่ได้
3. **SLA-driven** — Task เกิดจาก data ที่ "เก่าเกิน SLA" ไม่ใช่จาก agent อยากทำ
4. **Pay-on-approval + clawback** — จ่ายหลัง approve + QA sampling, เจอโกงทีหลังเรียกคืนได้
5. **Trust ladder** — agent ที่พิสูจน์ตัวแล้วได้ auto-approve มากขึ้น + bounty multiplier สูงขึ้น

---

### 6.1 Territory — การแบ่งพื้นที่และ Freshness Dashboard

**Territory** = พื้นที่ geofenced (PostGIS polygon) ที่ผูกกับ agent หนึ่งคน (primary) + backup ได้ ระดับเริ่มต้นแบ่งตาม "ย่านเดินได้จริง" ของเชียงใหม่ ไม่ใช่เขตการปกครอง เพราะ agent ต้องเดินถึงทุกร้านได้ใน 1 รอบ

| Territory ID | ชื่อย่าน | ขอบเขตคร่าว ๆ | Place density (เป้า) | หมายเหตุ |
|---|---|---|---|---|
| `CNX-NIMMAN` | Nimmanhaemin | Soi 1–17, One Nimman, Maya, Think Park | สูงมาก (cafe/restaurant หนาแน่น) | แบ่งย่อยเป็น `CNX-NIMMAN-N` (soi คี่) / `-S` (soi คู่) เมื่อร้าน > 250 |
| `CNX-OLDCITY` | เมืองเก่าในคูเมือง | Wat Phra Singh, Chedi Luang, Tha Phae, Sunday Walking Street | สูง (attraction + eat) | attraction หนาแน่น weight งาน "see/do" สูง |
| `CNX-SANTITHAM` | สันติธรรม | ตลาดสันติธรรม, ร้าน local | กลาง | ฐาน local/nomad year-round |
| `CNX-CMU` | รอบ มช. | หน้า มช., สวนดอก, ร้านนิสิต | กลาง-สูง | ใกล้ supply ของ agent เอง |
| `CNX-CHANGKLAN` | ช้างคลาน/ไนท์บาซาร์ | Night Bazaar, riverside | กลาง | tourist-heavy, Chinese FIT |
| `CNX-HAYA` | หายยา/วัวลาย | ถนนวัวลาย (Saturday Walking St.) | กลาง | craft/attraction |

> **Multi-city ready:** `territory_id` ขึ้นต้นด้วย `city_id` (`CNX-`) เสมอ พอขยายไป Pai/Phuket ใช้ `PAI-`, `HKT-` โดยไม่แตะ schema (สอดคล้องกับ `city_id` ใน migration #1)

**Schema (ย่อ):**
```text
territory
  id            text PK         -- 'CNX-NIMMAN'
  city_id       uuid FK         -- migration #1 key
  name_th/en/zh text
  geom          geography(POLYGON, 4326)   -- PostGIS, ใช้ ST_Contains เช็คว่าจุดอยู่ในเขต
  primary_agent_id uuid FK NULL
  backup_agent_ids uuid[]
  status        enum(active, frozen, splitting)

agent_territory_assignment   -- ประวัติการมอบหมาย (append-only, versioned)
  id, agent_id, territory_id, role(primary|backup),
  assigned_by (city_manager), valid_from, valid_to NULL
```

**Per-Territory Freshness Dashboard** (City/Regional Manager เห็น, Agent เห็นเฉพาะ territory ตัวเอง):

| Metric | นิยาม | สี/Threshold |
|---|---|---|
| **Freshness Score** | % ของ Place ในเขตที่ field ทุกตัวยังอยู่ใน SLA | เขียว ≥90 / เหลือง 75–89 / แดง <75 |
| **Stale count by field** | จำนวน Place ที่ hours/price/photos เกิน SLA | breakdown ต่อ field |
| **Coverage** | Places ที่มี vs Places ที่ Google/recon บอกว่ามีในพื้นที่ (unclaimed gap) | ชี้ร้านที่ยังไม่ onboard |
| **Activation rate** | % Place ที่ loyalty enabled / มี deal active | KPI หลักของรายได้ |
| **Open tasks / aging** | Task ค้าง + อายุเฉลี่ย | flag เขตที่ agent หาย |

Dashboard นี้คือ **เครื่องกำเนิด Task** โดยตรง (6.2) — ทุกช่อง "แดง" = Task ที่รอเงินรออยู่

---

### 6.2 Task Generation — สร้างงานจาก Freshness SLA

Task **ไม่ได้เกิดจาก agent กดสร้างเอง** แต่เกิดจาก scheduler (Supabase Edge Function / `pg_cron`) ที่สแกน live data เทียบ SLA ทุกคืน แล้ว enqueue เป็น `Task` ผูกกับ territory

**Freshness SLA matrix:**

| Field / งาน | SLA (อายุก่อน stale) | Trigger | Task type | Bounty tier |
|---|---|---|---|---|
| **Opening hours** | 30 วัน | อายุเกิน / report ว่าผิด | `VERIFY_HOURS` | base |
| **Price / menu signal** | 30 วัน | อายุเกิน | `VERIFY_PRICE` | base |
| **Photos** | 90 วัน | อายุเกิน / รูปน้อยกว่า min | `REFRESH_PHOTOS` | base+ |
| **Geo / pin** | on-change | report pin ผิด, ร้านย้าย/ปิด | `VERIFY_GEO` | base+ (ต้องไปถึงจริง) |
| **Unclaimed shop onboarding** | event-driven | coverage gap, ร้านใหม่เปิด | `ONBOARD_PLACE` | **high** |
| **Merchant activation** | event-driven | place มีแล้วแต่ยังไม่ enable loyalty | `ACTIVATE_MERCHANT` | **highest** |
| **Closure check** | report-driven | หลาย user report "ปิดแล้ว" | `VERIFY_CLOSURE` | base+ |

**Task lifecycle:**
```text
GENERATED → CLAIMED (agent กดรับ, lock 24–72h) → IN_PROGRESS
   → SUBMITTED (กลายเป็น Change Proposal) → [moderation] 
   → APPROVED → PAID   |   REJECTED (กลับ pool)   |   EXPIRED (lock หลุด, กลับ pool)
```

กฎ assignment:
- Task แสดงเฉพาะ agent ที่ territory ครอบคลุมจุดนั้น (primary ได้สิทธิ์ก่อน 6 ชม. แล้วค่อยเปิด backup/pool)
- **Anti-cherry-picking:** ระบบบังคับ ratio — จะรับ `ONBOARD/ACTIVATE` (เงินดี) ได้ ต้องเคลียร์ `VERIFY_*` (เงินน้อยแต่จำเป็น) ตามโควตา ไม่งั้น freshness เขตพัง แต่ agent รวยคนเดียว
- Task มี `priority_score` = f(อายุที่เกิน SLA, traffic ของ Place, ความสำคัญย่าน) เรียงให้เห็นงานคุ้มก่อน

```text
task
  id, city_id, territory_id, place_id NULL (null = onboard ร้านใหม่),
  type enum, status enum, priority_score numeric,
  sla_field text, target_diff_spec jsonb,  -- บอก agent ว่าต้องเก็บ field ไหน
  claimed_by uuid NULL, claimed_at, lock_expires_at,
  generated_by enum(scheduler|report|manager), created_at
```

---

### 6.3 Proof-gated Submission — หลักฐานก่อนได้ Change Proposal

นี่คือ **anti-fraud gate ที่สำคัญที่สุด** ของ supply side ทุก submission ต้องผ่านด่านพร้อมกันทั้งหมด ไม่ผ่านข้อใดข้อหนึ่ง = แอปไม่ยอม submit (client-side block + server-side re-verify เสมอ — client เชื่อไม่ได้)

**ด่านหลักฐาน (ทุกข้อ AND กัน):**

| # | Gate | กลไก | ทำไม |
|---|---|---|---|
| 1 | **GPS proximity** | จุดที่ submit ต้องอยู่ ≤ **80 m** จาก pin ของ Place (PostGIS `ST_DWithin`) | บังคับ "ไปถึงจริง" ไม่ใช่ทำที่บ้าน |
| 2 | **Camera-only photo** | เปิดจาก in-app camera เท่านั้น **block gallery import** | กันรูปเก่า/รูปโหลดเน็ต |
| 3 | **EXIF + timestamp** | verify EXIF: ถ่ายภายใน N นาทีก่อน submit + GPS ใน EXIF ตรงกับ device GPS | กัน screenshot/รูปปลอม |
| 4 | **Perceptual-hash dedup** | คำนวณ pHash ทุกรูป เทียบกับ pHash เดิมของ Place + ของ agent คนอื่น | กันส่งรูปซ้ำ/รูปที่หมุน-crop หนีนิด ๆ |
| 5 | **Diff + Task ref** | payload ต้องมี `before→after` diff ที่ชัด + อ้าง `task_id` ที่ตัวเองถือ lock | ทุก edit ตรวจสอบย้อนได้ |
| 6 | **Liveness (สำหรับงานเสี่ยงสูง)** | ONBOARD/ACTIVATE ต้องถ่าย "หน้าร้าน + ป้าย" ตาม prompt มุมที่ระบบสุ่ม | กันสมรู้ร่วมคิดกับร้านปลอม |

> **หมายเหตุ privacy/PDPA:** เราเก็บ **redemption/proof FACT** (จุด, เวลา, hash, ผ่าน/ไม่ผ่าน) ไม่เก็บ movement graph ของ agent นอกเวลางาน GPS ใช้ตอน submit เท่านั้น ขอ consent ชัดเจน เก็บ raw EXIF เท่าที่ต้องตรวจแล้ว purge ตาม retention (เช่น 90 วัน) เหลือ derived hash

**Output ของ submission = `Change Proposal` (ไม่ใช่ write):**
```text
change_proposal
  id, city_id, place_id NULL, task_id, agent_id,
  proposal_type enum(create_place|update_field|add_photo|geo_move|activate),
  diff jsonb,                    -- {field: {before, after}}
  proof jsonb,                   -- {gps:{lat,lng,acc}, dist_m, exif_ts, phash[], liveness_ok}
  risk_score numeric,            -- คำนวณ 6.4
  status enum(pending|auto_approved|in_review|approved|rejected|needs_fix),
  created_at
-- ไม่มี FK เขียนทับ place โดยตรง การ apply ทำผ่าน versioned migrate ใน 6.4
```

---

### 6.4 Moderation Queue — กลั่นกรองก่อน apply

ทุก `Change Proposal` เข้าคิว ระบบคิด **risk_score** แล้วแยกทาง:

```text
risk_score = w1·(agent_accept_rate_inverse)
           + w2·(field_sensitivity)        -- เปลี่ยน "ชื่อร้าน/พิกัด/activate" เสี่ยงสูง; เปลี่ยน "เวลาเปิด" เสี่ยงต่ำ
           + w3·(diff_magnitude)           -- แก้เยอะ = เสี่ยง
           + w4·(proof_weakness)           -- GPS acc แย่, EXIF gap, pHash ใกล้ของเดิม
           + w5·(new_agent_penalty)        -- agent ใหม่ < N งาน auto-approve ไม่ได้เลย
```

| risk_score | เส้นทาง |
|---|---|
| **Low** (เช่น verify hours โดย trusted agent, proof แน่น) | **Auto-approve** → apply + trigger pay (เข้า QA sampling pool) |
| **Medium / High** | เข้าคิว **Content Moderator** — เห็น diff, รูป before/after, proof, แผนที่จุด submit |

**Moderator actions:** `Accept` / `Reject (พร้อม reason code)` / `Request-fix` (ตีกลับให้ agent แก้ภายใน X ชม. ไม่เสีย lock)

**Versioned apply (สำคัญ — ไม่ทับข้อมูลแบบทำลายของเดิม):**
```text
place_version            -- append-only ทุกการเปลี่ยน
  id, place_id, version_no, changed_fields jsonb,
  source_proposal_id, approved_by, applied_at
place (live)             -- มี current_version_no ชี้ version ล่าสุด → rollback ได้
```
เมื่อ approve: insert `place_version` ใหม่ → อัพเดต live place ให้ชี้ version นั้น → mark proposal `approved` → emit event `proposal.approved` → **trigger pay engine (6.5)**

> ผลพลอยได้: เพราะเป็น versioned ถ้าเจอ agent โกงทีหลัง เรา **rollback field นั้นกลับ** + clawback เงินได้ในคลิกเดียว

---

### 6.5 Gamified Pay — โครงสร้างค่าตอบแทน

จ่ายเป็น **เงินบาทจริง** (ไม่ใช่ Sparks/Coins — Coins สงวนไว้สำหรับ customer reward เท่านั้น) ผ่าน PromptPay payout เป็นรอบ (เช่นรายสัปดาห์) หลังผ่าน QA

**สูตรค่าจ้าง:**
```text
payout_per_unit = base_bounty[task_type]
                × accept_rate_multiplier        -- rolling 30 วัน, 0.7×–1.5×
                + activation_bonus              -- ถ้าทำ loyalty enabled / deal posted
                + freshness_micro_bonus         -- ดูแล Place ให้สดต่อเนื่อง
```

| องค์ประกอบ | ราคา/กลไก (ตัวอย่าง — ปรับตาม unit econ 6.9) | เหตุผล |
|---|---|---|
| **Base bounty / approved unit** | VERIFY_HOURS/PRICE ฿8–15 · REFRESH_PHOTOS ฿15–25 · VERIFY_GEO ฿20–30 | จ่ายต่อ "หน่วยที่ approve" ไม่ใช่ต่อ submission |
| **Accept-rate multiplier** | rolling accept-rate → ×0.7 (แย่) ถึง ×1.5 (เยี่ยม) | จูงใจคุณภาพ ไม่ใช่ปริมาณขยะ |
| **Onboard bounty** | ฿40–70 / ร้านใหม่ที่ approve | ร้านใหม่คือ coverage growth |
| **Activation bonus** | **฿120–250** เมื่อ merchant **enable loyalty หรือ post deal จริง** (verify จาก merchant subsystem) | นี่คือเงินที่ผูกกับ "รายได้แพลตฟอร์ม" โดยตรง — จ่ายแพงสุดมีเหตุผล |
| **Freshness micro-bonus** | ฿2–5 / Place / เดือน ที่ agent ดูแลให้อยู่ใน SLA ตลอด | สร้าง recurring incentive ไม่ใช่ทำครั้งเดียวทิ้ง |
| **Streak / quest งาน** | โบนัสเมื่อปิด territory ให้เขียวทั้งเขต | gamify ระดับเขต |

**Escrowed payout + QA sampling:**
```text
proposal.approved → สร้าง pay_accrual (status=accrued, ยังไม่จ่าย)
   → สุ่ม QA sample (% ตาม risk + agent reputation) ให้ moderator/manager re-verify
      ├─ QA pass → ครบรอบ → payout (PromptPay) → status=paid
      └─ QA fail → reject ย้อนหลัง + ปรับ accept-rate + ไม่จ่าย unit นั้น
```

**Clawback (ทุก payout ผูก ledger เดียวกับ loyalty — double-entry, append-only):**
```text
ถ้าเจอ fraud ทีหลัง (เช่น ร้าน activate เป็นร้านผี, รูปปลอมที่หลุด QA):
  - post compensating ledger entry (เดบิต agent payable / เครดิต clearing)
  - หักจาก payout รอบถัดไป (หรือ flag หนี้ถ้า balance ไม่พอ)
  - rollback place_version ที่เกี่ยวข้อง
  - บันทึกใน fraud_case ผูก identity-graph
```
> ทุกบาทที่จ่าย agent เดินผ่าน `Clearing Account` ใน ledger เดียวกับ redemption ทำให้ Finance/Payout เห็นภาพเดียว auditable ตาม PDPA

---

### 6.6 Quality Scoring, Reputation & Anti-abuse

**Agent reputation** (0–100, rolling) คำนวณจาก:

| สัญญาณ | ผลต่อคะแนน |
|---|---|
| Accept-rate (approve / submit) | บวกหลัก |
| QA pass-rate | บวก/ลบหนัก |
| Reject reason "fraud/fabricated" | ลบหนักมาก + flag |
| Freshness retention (ร้านที่ดูแลไม่กลับไป stale) | บวก |
| Speed-to-fix หลัง request-fix | บวกเล็ก |
| Report จาก merchant/customer ว่า data ผิด | ลบ |

**ระดับความเชื่อ (trust ladder) → ปลดล็อกสิทธิ์:**

| Tier | เงื่อนไข | สิทธิ์ |
|---|---|---|
| Probation | agent ใหม่ < 50 approved | ไม่มี auto-approve, QA 100%, bounty ×0.8 |
| Verified | accept-rate ≥85%, QA pass ≥95% | auto-approve งาน low-risk, QA sampling ~20% |
| Senior | นาน + คะแนนสูง | รับ ACTIVATE/ONBOARD ได้เต็ม, QA ~10%, อาจช่วย shadow-review |

**Shadow-review ก่อน suspend (due process):**
ถ้า reputation ตก/มีสัญญาณโกง → เข้าโหมด **shadow** (งานยังรับได้แต่ทุก submission ถูก review 100% + ไม่จ่ายจนกว่าจะเคลียร์ + agent ไม่รู้ตัว) เก็บหลักฐานพอ → ค่อยตัดสิน suspend/clawback ป้องกัน suspend ผิดคนเพราะ false signal เดียว

**Identity-graph cross-check:** ใช้ graph เดียวกับ customer anti-fraud — ผูก device, payout account, GPS pattern; จับ ring เช่น agent + merchant สมคบกัน activate ร้านปลอมเพื่อกิน activation bonus

**Per-district leaderboard:** จัดอันดับ agent ในเขต (approved units, freshness score, activation count) — แข่งกันแบบ healthy, City Manager ใช้ดู top/bottom performer; แสดง Sparks-style badge ภายใน (ไม่ใช่ Coins)

---

### 6.7 Agent App — Feature set (Flutter เดียวกัน, role-gated)

ใช้ **codebase Flutter เดียว** กับ customer app เปิด "Agent Mode" เมื่อ role = Field Agent (gate ด้วย Supabase RLS + role claim) ทำให้ดูแล codebase เดียว, agent ที่เป็น customer ด้วยสลับโหมดได้

| หน้าจอ | ฟังก์ชัน |
|---|---|
| **My Territory map** | Mapbox map ของเขตตัวเอง, pin สีตาม freshness (เขียว/เหลือง/แดง), unclaimed gap |
| **Task list / queue** | Task เรียงตาม priority + bounty, ratio meter (โควตา verify ที่ต้องทำ), claim/lock |
| **Capture flow** | in-app camera (gallery ปิด), GPS lock indicator (เขียวเมื่อ ≤80m), liveness prompt มุมถ่าย, diff form |
| **Onboard wizard** | flow สร้าง Place ใหม่ + เก็บ merchant claim address-code (6.8) |
| **My submissions** | สถานะ proposal (pending/approved/rejected/needs-fix) + reason, ปุ่มแก้ |
| **Earnings wallet** | accrued vs paid (บาท), payout history, clawback log โปร่งใส |
| **Reputation & leaderboard** | คะแนน, tier, อันดับในเขต, badge |
| **Training / playbook** | วิธีถ่ายรูป, สคริปต์คุย merchant, นโยบาย anti-fraud (in-app, TH/EN) |

**Offline-tolerant:** Nimman/Old City สัญญาณบางจุดอ่อน — capture ทำ offline แล้ว queue sync ได้ แต่ GPS/EXIF ถูก stamp ตอนถ่าย (กันถ่ายที่อื่นมา sync ทีหลัง: server เทียบ capture_ts กับ sync_ts + ตำแหน่ง)

---

### 6.8 Merchant Claim Address-Code — สะพานเชื่อม Merchant Subsystem

นี่คือจุดที่ field-agent ส่งมอบ "ร้าน" ให้กลายเป็น "merchant ที่ activate ได้จริง" — เชื่อมตรงกับ Merchant subsystem (Section ที่ดูแล merchant onboarding/escrow)

**Flow:**
1. Agent ทำ `ONBOARD_PLACE` → Place ผ่าน moderation → ได้ `place_id` ที่ verified
2. ระบบ generate **`claim_code`** (สั้น, อ่านง่าย เช่น `CNX-7F3K`) ผูกกับ place_id + เขต + agent_id ผู้ส่งมอบ (เพื่อ attribution ของ activation bonus)
3. Agent มอบ code ให้เจ้าของร้าน **ต่อหน้า** (พิมพ์บนใบ/สติกเกอร์ติดร้าน หรือ QR ที่เปิด deep-link ลง merchant signup) — บันทึกการมอบเป็นหลักฐาน (รูปหน้าร้าน + ใคร)
4. Merchant ใช้ code ใน Merchant onboarding → ระบบ **link merchant_account ↔ place_id** อัตโนมัติ (ไม่ต้อง claim ซ้ำ, กัน claim ผิดร้าน) และ stamp `onboarded_by_agent`
5. เมื่อ merchant **enable loyalty / prefund escrow / post deal** → emit `merchant.activated` → ปลด **activation_bonus** ให้ agent ผู้ส่งมอบ (6.5) เข้า QA แล้วจ่าย

```text
merchant_claim_code
  code text PK, place_id FK, territory_id, issued_by_agent_id,
  issued_at, status enum(unused|claimed|expired),
  claimed_by_merchant_id NULL, claimed_at, expires_at
```
> Attribution chain นี้คือสิ่งที่ทำให้ "activation bonus" จ่ายถูกคนและตรวจสอบได้ — agent คนไหนพาร้านไหนเข้าระบบ + ร้านนั้นจ่ายเงิน escrow จริงไหม ผูกครบ end-to-end

---

### 6.9 Unit Economics — ต้นทุน/listing และ payback

เป้าหมายเชิงตัวเลข (สมมุติฐานเริ่มต้น ปรับด้วยข้อมูลจริงหลัง pilot Nimman):

**ต้นทุนต่อ "verified + activated listing":**

| รายการ | ต้นทุนโดยประมาณ / listing |
|---|---|
| Onboard bounty | ฿40–70 |
| Initial verify (hours/price/photos/geo) | ฿50–80 (รวมหลาย field) |
| Activation bonus (เมื่อ activate สำเร็จ) | ฿120–250 |
| Moderation + QA overhead (allocate) | ฿20–40 |
| **รวม cost / verified+activated listing** | **≈ ฿250–400** (เป้า median ~฿300) |

**Recurring freshness cost:** ฿10–30 / listing / เดือน (micro-bonus + verify รอบ SLA)

**Payback (6–9 เดือน):**
- รายได้ต่อ activated merchant ผูก 4 เสา: SaaS subscription (รายเดือน), redemption take-rate (~10–15% capped), sponsored quest, affiliate
- ถ้า ARPU ต่อ activated merchant ≈ **฿500–900/เดือน** (subscription + take-rate) → recover ฿300 + recurring ~฿20/เดือน ได้ภายใน **~1 เดือนแรกของ subscription** ต่อร้านเดี่ยว
- ระดับ portfolio: รวม CAC ทั้ง agent workforce (เงินเดือน/bounty + tooling) เทียบ MRR ที่ activated merchants สร้าง → **target blended payback 6–9 เดือน**
- **Lever สำคัญ:** activation rate (ร้าน onboard กี่ % ที่จ่ายจริง) และ accept-rate (กัน bounty รั่วไปกับงานขยะ) — สองตัวนี้คือสิ่งที่ reputation/QA/clawback ออกแบบมาเพื่อปกป้องโดยตรง

> **Seasonality note:** เดือน burning/rainy ใช้ agent ทำงาน "freshness + onboard" (cost-heavy แต่สร้าง moat); ช่วง Yi Peng/Songkran ดึง activation + sponsored festival quest (revenue-heavy) ให้ payback เร่งตัวในไฮซีซัน บาลานซ์ด้วยฐาน local/nomad ที่ agent เก็บไว้ทั้งปี

---

## 7. Merchant Subsystem — การพิสูจน์ตัวตน, Dashboard, Redemption

> **ขอบเขตของ section นี้:** ทุกอย่างที่เกิดขึ้น "ฝั่งร้านค้า" ตั้งแต่ merchant กดสมัครครั้งแรก → claim Place → พิสูจน์ตัวตน (anti-fraud-grade) → เปิดสิทธิ์ fund escrow / ตั้งบัญชีรับเงิน / ออก redemption → ใช้งาน dashboard รายวัน → ยิง redemption ที่หน้าเคาน์เตอร์ใน <5 วินาที. Subsystem นี้คือ "ประตูเงิน" ของแพลตฟอร์ม จึงต้องสมมติว่า **ทุก merchant อาจเป็นผู้โจมตี** (สร้างร้านปลอม, claim ร้านคนอื่น, ปั๊ม redemption ใส่บัญชีตัวเอง) และออกแบบ gate ตามนั้น

### 7.0 หลักการออกแบบ 5 ข้อ (design tenets)

1. **Trust เป็นแบบ tiered ไม่ใช่ boolean** — merchant ไม่ได้ "verified/ไม่ verified" แต่ไต่ระดับ `claimed-unverified → identity-verified → finance-verified`. แต่ละสิทธิ์ที่มีความเสี่ยงเรื่องเงิน (fund escrow, ตั้ง payout bank, ออก redemption) ปลดล็อกที่ระดับที่ต่างกัน
2. **เงินเข้าได้ก่อนเงินออกเสมอ** — merchant top-up Escrow Wallet เข้าได้ค่อนข้างง่าย (เพราะเขาเอาเงินมาให้เรา ความเสี่ยงต่ำ) แต่ "การออก Coins ให้ลูกค้า / การตั้งบัญชีรับ payout" ต้องผ่าน human review เพราะนั่นคือจุดที่ฉ้อโกงได้
3. **ทุกการแก้ข้อมูลคือ Change Proposal** — merchant ไม่ได้ write live data เหมือนกับ Field Agent (สอดคล้องกับ moat ในข้อ 5 ของ founder). เนื้อหา i18n, เวลาเปิด-ปิด, ตำแหน่ง pin บนแผนที่ ที่ merchant แก้ จะกลายเป็น Change Proposal เข้า moderation queue เดียวกับของ Agent (แต่ merchant ได้ trust weight สูงกว่าสำหรับ Place ที่ตัวเอง verified แล้ว → auto-approve ได้บางฟิลด์)
4. **Counter UX ต้องโง่ที่สุดเท่าที่จะเป็นไปได้** — ร้านกาแฟ Nimman ช่วง 9 โมงเช้าที่คนต่อคิวยาว เจ้าของถือมือถือเครื่องเดียว ไม่มี POS ไม่มีเวลาลง app. ทุก flow ฝั่ง redemption ต้องทำงานบน browser/LINE PWA ที่ไม่ต้องติดตั้ง และเสร็จใน <5 วินาที
5. **Re-verify เมื่อ "พื้นผิวการเงิน" เปลี่ยน** — เปลี่ยนเลขบัญชีรับเงิน, เปลี่ยนเจ้าของ juristic person, เปลี่ยนเบอร์ payout = trigger re-verification และ freeze payout ชั่วคราว (กัน account takeover ที่เปลี่ยนบัญชีแล้วดูดเงิน escrow ออก)

---

### 7.1 Claim & Verification Flow (anti-fraud-grade)

#### 7.1.1 Merchant Trust States (state machine)

```
                    [self-serve signup หรือ Agent-initiated]
                                   │
                                   ▼
                         ┌──────────────────┐
                         │ CLAIMED_UNVERIFIED│  ← เห็น dashboard ได้, แก้ draft content ได้
                         └──────────────────┘    แต่ content ไม่ขึ้น live, ห้ามแตะเงิน
                                   │
              (ผ่าน proof ระดับ identity ≥ 1 อัน + human review)
                                   ▼
                         ┌──────────────────┐
                         │ IDENTITY_VERIFIED │  ← content ขึ้น live, สร้าง deal/quest ได้,
                         └──────────────────┘    top-up escrow ได้, แต่ "ยังออก redemption ไม่ได้"
                                   │
            (ผ่าน finance review: payout bank + ownership match + KYC)
                                   ▼
                         ┌──────────────────┐
                         │ FINANCE_VERIFIED  │  ← ออก redemption ได้, รับ payout ได้ = full merchant
                         └──────────────────┘
                                   │
                 (เปลี่ยน bank / owner / ownership transfer)
                                   ▼
                  ┌─────────────────────────────┐
                  │ PAYOUT_FROZEN (re-verify)    │  ← redemption ยังทำได้ (เงิน escrow ของลูกค้าไม่ติด)
                  └─────────────────────────────┘    แต่ payout ออกไม่ได้จนกว่าจะ re-verify ผ่าน

   Side states: SUSPENDED (fraud flag), CLOSED (ร้านปิด), DISPUTED (มีคน claim ซ้อน)
```

**สิทธิ์ตามแต่ละ state (capability matrix):**

| Capability | CLAIMED_UNVERIFIED | IDENTITY_VERIFIED | FINANCE_VERIFIED | PAYOUT_FROZEN |
|---|:---:|:---:|:---:|:---:|
| เห็น dashboard / analytics ของตัวเอง | ✅ | ✅ | ✅ | ✅ |
| แก้ content (เป็น Change Proposal, ไม่ live) | ✅ | ✅ | ✅ | ✅ |
| Content ขึ้น live บนแอป | ❌ | ✅ | ✅ | ✅ |
| โพสต์ Deal / สร้าง-เข้าร่วม Quest | ❌ | ✅ | ✅ | ✅ |
| Top-up Escrow Wallet (เงินเข้า) | ❌ | ✅ | ✅ | ✅ |
| **ออก Redemption (burn Coins ให้ลูกค้า)** | ❌ | ❌ | ✅ | ✅ |
| ตั้ง / เปลี่ยน payout bank | ❌ | ❌ | ✅ | 🔒 (re-verify) |
| รับ payout settlement (เงินออก) | ❌ | ❌ | ✅ | ❌ |

> หมายเหตุสำคัญ: ใน PAYOUT_FROZEN ลูกค้ายัง redeem ได้ปกติ (ไม่ลงโทษลูกค้าจากปัญหาฝั่งร้าน) — Coins ที่ลูกค้า burn ไปจะถูก settle เข้า Clearing Account รอ payout เมื่อ unfreeze. นี่เป็นเหตุผลที่ ledger เป็น double-entry: เงินไม่หาย แค่ค้างใน Clearing Account

#### 7.1.2 Proof Methods (tiered, สะสมแต้มความเชื่อ)

แต่ละวิธีพิสูจน์ให้ **คะแนน trust** ไม่ใช่ pass/fail เดี่ยวๆ — ต้องสะสมถึง threshold ของแต่ละ state. ออกแบบให้ "ร้านเล็กที่ไม่จดทะเบียน" (รถเข็น, ร้านกาแฟ home-based แถบ Santitham) ก็ไต่ถึง FINANCE_VERIFIED ได้ โดยไม่บังคับต้องมี ภพ.20

| Proof Method | พิสูจน์อะไร | ปลดล็อกระดับ | Trust pts | ความเสี่ยง/หมายเหตุ |
|---|---|---|:---:|---|
| **Phone OTP** | คุมเบอร์ติดต่อ | — (baseline) | 10 | จำเป็นทุกราย แต่อ่อน (ใครก็มี SIM) |
| **Domain email** (`@maya.co.th`) | ผูกกับโดเมนธุรกิจ | identity | 20 | เฉพาะร้านที่มีโดเมนของตัวเอง (ห้าง/เชน) |
| **On-premise code (Agent-delivered)** | คนจริงอยู่ที่หน้าร้านจริง | identity | 40 | Field Agent ไปถึงร้าน ใส่ code ที่ระบบสุ่มให้ — **proof แข็งที่สุดสำหรับร้านเล็ก** |
| **On-premise QR (geofenced selfie-of-shop)** | พิกัดตรงกับ Place + มีหน้าร้าน | identity | 30 | merchant สแกน QR ที่ผูกกับ Place ขณะอยู่ในรัศมี geofence + ถ่ายรูปหน้าร้าน |
| **DBD juristic-person doc** (หนังสือรับรองนิติบุคคล) | นิติบุคคลมีจริง + ชื่อกรรมการ | identity (สูง) | 50 | ตรวจกับ DBD DataWarehouse API ได้ (เลขทะเบียน 13 หลัก) |
| **VAT ภพ.20** (ใบทะเบียนภาษีมูลค่าเพิ่ม) | จดทะเบียนกับสรรพากร | identity (สูง) | 50 | อัปโหลดรูป → OCR ดึงเลขผู้เสียภาษี → cross-check |
| **Bank account + name match** | บัญชีรับเงิน + ชื่อตรงกับเจ้าของ | **finance** | gate | บัญชีต้องชื่อตรงกับ juristic person หรือ verified owner (PromptPay name lookup / micro-deposit) |
| **National ID / Passport KYC** (เจ้าของ/ผู้มีอำนาจ) | ตัวบุคคลผู้รับเงิน | **finance** | gate | เก็บ encrypted (PDPA), ใช้ liveness ถ้าทำ self-serve full |

**Thresholds:**
- `IDENTITY_VERIFIED` = Phone OTP + (trust pts จาก identity proofs ≥ 40) **และ** ผ่าน human review 1 ครั้ง
- `FINANCE_VERIFIED` = IDENTITY_VERIFIED + bank name-match + KYC ผู้รับเงิน + **finance reviewer** approve (คนละคนกับ identity reviewer ได้ = separation of duties)

#### 7.1.3 Human Review Gates (ใครอนุมัติอะไร)

```
Change-proposal-style review queue, role = Content Moderator + Finance/Payout
┌────────────────────────────────────────────────────────────────┐
│ GATE 1 — Identity Review  (Content Moderator / City Manager)     │
│   ตรวจ: รูปหน้าร้านตรงกับ pin? เอกสาร DBD/ภพ.20 อ่านออก & ตรงชื่อ?  │
│         ไม่ใช่ร้านที่มีคน claim อยู่แล้ว (dedupe by name+geo)?      │
│   ผล: → IDENTITY_VERIFIED  |  reject + reason  |  request more    │
├────────────────────────────────────────────────────────────────┤
│ GATE 2 — Finance Review   (Finance/Payout role)                  │
│   ตรวจ: ชื่อบัญชีธนาคาร == ชื่อนิติบุคคล/เจ้าของ KYC ?              │
│         เบอร์/อีเมล/อุปกรณ์ ไม่ซ้ำกับ ring ที่เคยโดน ban ?         │
│         identity-graph score ต่ำกว่าเกณฑ์เสี่ยง ?                  │
│   ผล: → FINANCE_VERIFIED  |  เปิดสิทธิ์ออก redemption + payout     │
└────────────────────────────────────────────────────────────────┘
```

- **Separation of duties:** ห้ามคนเดียวกัน approve ทั้ง identity และ finance ของ merchant เดียวกัน (กัน insider fraud). บังคับใน RLS/policy
- **SLA:** Identity review ภายใน 24 ชม. (เป้า), Finance review ภายใน 48 ชม. — แสดง ETA ใน dashboard ให้ merchant
- **Audit log:** ทุก decision เก็บ reviewer_id, timestamp, before/after state, reason — แตะไม่ได้ (append-only) เพื่อ PDPA + dispute

#### 7.1.4 Re-verification triggers (anti-takeover)

| Event | ผล |
|---|---|
| เปลี่ยนเลขบัญชี payout | → `PAYOUT_FROZEN`, freeze payout, ต้อง finance re-review + micro-deposit ใหม่; แจ้งเตือนทุกช่อง (LINE/email/SMS) |
| เปลี่ยนผู้มีอำนาจ / ownership transfer | → re-run identity gate; escrow ถูก freeze ชั่วคราว (ทั้งเข้า-ออก) จนกว่าจะ confirm |
| เปลี่ยนเบอร์/อีเมลหลัก | → step-up auth (OTP เดิม + ใหม่), 24 ชม. cooldown ก่อน payout |
| Login จาก device/geo ใหม่ผิดปกติ | → step-up auth ก่อนแตะเงิน |
| Velocity ผิดปกติ (redemption พุ่งผิดสถิติร้านตัวเอง) | → auto soft-freeze redemption + แจ้ง risk team |

---

### 7.2 Merchant Dashboard (Web — Next.js + Refine)

> **เหตุผลที่แยกเป็น web ไม่ใช่ใน Flutter app:** งาน admin-heavy (จัดการ content, ดู analytics, top-up) ทำบนจอใหญ่/คีย์บอร์ดดีกว่า. Refine ให้ CRUD scaffolding + auth + RBAC สำเร็จรูป ต่อ Supabase ได้ตรง. **แต่** ส่วน redemption ที่หน้าเคาน์เตอร์ต้องใช้บนมือถือ → ทำเป็น mobile-first PWA route แยก (ดู §7.3) เพราะ Refine admin ไม่เหมาะถือยืนหน้าร้าน

#### 7.2.1 โครงเมนูหลัก

```
Merchant Dashboard
├── Home               สถานะ verification, ยอด Escrow คงเหลือ, alert (escrow ใกล้หมด → quest จะ pause), action ค้าง
├── Places             จัดการ Place หลายแห่ง: i18n content (TH/EN/简体), เวลาเปิด-ปิด, รูป, หมวด eat/see/do
│                       └─ ทุกการแก้ = Change Proposal (เห็น diff + สถานะ pending/approved)
├── Deals & Promotions โพสต์ดีล, ตั้งช่วงเวลา, จำกัดจำนวน, ภาษา
├── Quests             เข้าร่วม Quest ที่มีคนชวน / สร้าง cross-merchant Quest (เชิญร้านอื่นใน Nimman)
├── Escrow Wallet      top-up (PromptPay/บัตร), ดู ledger, ตั้ง auto-topup, แจ้งเตือน low-balance
├── Redemptions        ดูประวัติ, validate/refund, รายงานเคส dispute  (+ ปุ่มเปิด Counter Scanner PWA)
├── Analytics          footfall, tourist-vs-local, redemption ROI, "you owe / you are owed"
├── Billing            subscription tier, ใบเสร็จ/ใบกำกับภาษี, เปลี่ยนแผน
└── Settings           payout bank, ผู้ใช้ในร้าน (staff sub-accounts), verification status, ภาษา dashboard
```

#### 7.2.2 Analytics ที่ต้องมี (และนิยามให้ชัดเพื่อหลีกเลี่ยงตัวเลขหลอก)

| Metric | นิยาม | ทำไม merchant สนใจ |
|---|---|---|
| **Footfall** | จำนวน **verified visit** (check-in ที่ผ่าน trust tier ≥ GPS-dwell) แยกตามวัน/ช่วงเวลา | รู้ว่า quest ดึงคนมาจริงไหม |
| **Tourist-vs-local split** | สัดส่วนผู้มาเยือนตาม audience segment (local/nomad vs Western vs Chinese FIT) — อิงภาษา app + auth provider (LINE→มักเป็น local, Alipay/WeChat→Chinese) **โดยไม่เก็บ movement graph** | ปรับเมนู/ป้าย/ภาษาให้ตรงกลุ่ม เช่น Nimman cafe เห็น Chinese FIT เยอะ → ทำป้าย 简体 |
| **Redemption ROI** | `incremental revenue (จาก purchase-proven visit) − cost of rewards (มูลค่า Coins ที่ออก + take-rate)` | ตอบคำถามเจ้าของ: "ของฟรีที่แจกคุ้มไหม" — เป็น metric ที่ขายแผน Pro |
| **Cost of rewards** | มูลค่าบาทของ Coins ที่ถูก burn ที่ร้านนี้ในช่วงเวลา | คุมงบ escrow |
| **You owe / You are owed** | ยอดสุทธิ cross-merchant: ลูกค้าได้ Coins จาก Quest ที่ "ร้านเราเป็นสปอนเซอร์" แต่ไป redeem ที่ร้านอื่น = เราเป็นหนี้; กลับกัน = เขาเป็นหนี้เรา (อ่านจาก Clearing Account) | ความโปร่งใสของ cross-merchant economy — ใจกลางของ loyalty game |

> **PDPA-safe analytics:** ทุกตัวเลขเป็น aggregate. แสดง segment ได้แต่ห้าม drill-down ถึงตัวบุคคล. เก็บ "redemption fact" (เกิด redemption ที่ร้านนี้ เวลานี้ มูลค่านี้) ไม่เก็บ "เส้นทางการเดินของ user A". ถ้า cell ใน segment มี n < 5 ให้ suppress (k-anonymity)

#### 7.2.3 ตัวอย่าง schema (ฝั่ง merchant)

```sql
-- ทุกตารางมี city_id + merchant_id ตั้งแต่ migration #1 (ตาม founder)
merchant            (id, city_id, legal_name, juristic_id, trust_state, created_by_agent_id, ...)
merchant_proof      (id, merchant_id, method, trust_points, status, reviewer_id, doc_url_encrypted, reviewed_at)
place               (id, merchant_id, city_id, geo POINT(PostGIS), category, status)
place_content_i18n  (place_id, lang['th'|'en'|'zh-Hans'], name, description, ...)  -- via Change Proposal
escrow_wallet       (id, merchant_id, balance_satang, low_balance_threshold, auto_topup_cfg)
merchant_user       (id, merchant_id, user_id, role['owner'|'manager'|'cashier'])  -- staff sub-accounts
subscription        (merchant_id, tier, status, period_end, agent_id_sold_by)
```

---

### 7.3 Counter Redemption UX — "Dead Simple" (<5 วินาที, ไม่มี POS)

หัวใจของ subsystem นี้. แยกเป็น **2 ทิศทาง** อย่าสับสน:

```
ทิศ A — ลูกค้า "หาแต้ม" (EARN):  ลูกค้าสแกน → ระบบยืนยัน visit → ให้ Sparks/อัปเดต Quest Step
ทิศ B — ลูกค้า "ใช้แต้ม" (REDEEM): merchant ยืนยัน → burn Coins → ออกรางวัล
```

#### 7.3.1 ทิศ A — Earn (table-tent QR ที่ "ร้านพิมพ์แปะไว้")

- บนโต๊ะ/เคาน์เตอร์มี **printed QR table-tent** (ป้ายตั้งโต๊ะ) ผูกกับ `place_id`
- ลูกค้าเปิดแอป → สแกน QR → ระบบทำ **tiered check-in**:
  - QR นี้ **ไม่ใช่** ตัวให้แต้มลอยๆ มันแค่บอกว่า "ลูกค้าอ้างว่าอยู่ที่ place นี้"
  - ระบบ cross-check: GPS อยู่ในรัศมี geofence (PostGIS)? + dwell time? + ไม่ใช่ impossible-travel จาก check-in ก่อนหน้า?
  - ผ่าน → ได้ **Sparks** + นับ **Quest Step** (visit-level). การได้ **Coins/รางวัล** สงวนไว้ให้ proof แข็งกว่า (เช่น purchase-proven)
- **ทำไมปลอดภัยพอ:** QR บนโต๊ะเป็น static ก็จริง แต่ "การให้แต้ม" ไม่ได้เชื่อ QR อย่างเดียว — มันเป็น 1 ใน N สัญญาณ. คนเอา QR ไปแปะที่อื่นก็ไม่ได้แต้มเพราะ geofence ไม่ผ่าน
- เจ้าของร้านไม่ต้องทำอะไรเลยในทิศนี้ = zero counter effort

#### 7.3.2 ทิศ B — Redeem (merchant-initiated, rotating, <5 วิ)

> **กฎเหล็ก (จาก founder anti-fraud):** redemption ต้อง **merchant-initiated, time-boxed, rotating, geofenced, burned server-side**. ห้าม static customer QR เด็ดขาด

**Flow ที่เลือก (merchant สแกน เป็น default — ปลอดภัยสุด):**

```
1. ลูกค้ากด "ใช้รางวัล" ในแอป → แอปสร้าง rotating QR/code (TTL ~60 วิ, หมุนทุก 30 วิ, ผูก redemption_intent_id)
2. เจ้าของร้านเปิด Counter Scanner (LINE PWA / browser, ไม่ต้องติดตั้ง) ที่ bookmark ไว้
3. เจ้าของสแกน QR ลูกค้า → server ตรวจ: code ยังไม่หมดอายุ? merchant อยู่ใน geofence? Coins พอ? ไม่เคย burn? 
4. server burn Coins (double-entry: ผู้ใช้ −, Clearing Account +) → ขึ้นจอเขียว "สำเร็จ: ฟรีกาแฟ 1 แก้ว" 
5. เจ้าของส่งของ. จบใน <5 วินาที
```

**ทางเลือกสำรอง (เมื่อสแกนไม่สะดวก — มือเปื้อน/จอแตก):**
```
- โหมด "เจ้าของอ่านเลขด้วยตา": ลูกค้าโชว์ 6-digit rotating OTP, เจ้าของพิมพ์ลง PWA → validate เหมือนกัน
  (rotating ทุก 30 วิ จึง replay ไม่ได้)
```

**ทำไมไม่ให้ลูกค้าสแกน QR ของร้าน (reverse) เพื่อ redeem?** เพราะถ้า QR ร้านเป็นตัว trigger การ burn ฝั่งลูกค้า มันคือ static customer-side trust → ปั๊มได้. การให้ **merchant** เป็นผู้ initiate/confirm คือสิ่งที่ทำให้ของฟรีไม่รั่ว

**สเปก UX ที่ต้องบรรลุ:**
- Counter Scanner เปิดจาก **LINE PWA หรือ browser bookmark** — ไม่ต้องลง app, ไม่ต้อง login ซ้ำทุกครั้ง (session ยาว + PIN ปลด)
- ปุ่มเดียวเด่นๆ "สแกนเพื่อจ่ายรางวัล", camera เปิดทันที
- ผลลัพธ์เป็นสี + เสียง: เขียว=สำเร็จ, แดง=ปฏิเสธ (พร้อมเหตุผลสั้น "หมดอายุ/อยู่ไกลร้าน/Coins ไม่พอ")
- รองรับ **staff sub-account** (role `cashier`): พนักงานยิง redemption ได้ แต่แตะเงิน/bank/billing ไม่ได้
- Offline-tolerant: ถ้าเน็ตร้านหลุด ให้ queue + แสดง "รอยืนยัน" และห้ามนับว่าจ่ายแล้วจนกว่า server ตอบ (ป้องกัน double-spend ขณะ offline)

---

### 7.4 Subscription Tiers

3 ระดับ. หลักการตั้งราคา: **Free ต้องดีพอให้ร้านเล็กเข้ามาเติม supply ของแผนที่** (ไม่งั้นแผนที่ว่าง = ตาย), แต่ของที่ "วัด ROI ได้" และ "cross-merchant Quest" คือของที่ต้องจ่าย

| Feature | **Free (Claimed)** | **Growth** (~600–1,000 ฿/เดือน) | **Pro** (~2,000–3,000 ฿/เดือน) |
|---|:---:|:---:|:---:|
| Listing 1 Place + i18n content (TH/EN/简体) | ✅ | ✅ | ✅ (multi-Place) |
| ขึ้น live บนแอป (หลัง verify) | ✅ | ✅ | ✅ |
| โพสต์ Deal | จำกัด (เช่น 1 active) | หลายรายการ | ไม่จำกัด + schedule/ตั้งล่วงหน้า |
| รับ Coins / ออก redemption (หลัง finance-verify) | ✅ | ✅ | ✅ |
| Counter Scanner PWA + staff sub-accounts | 1 user | สูงสุด 3 | ไม่จำกัด |
| **เข้าร่วม** Quest ที่คนอื่นสร้าง | ✅ | ✅ | ✅ |
| **สร้าง** cross-merchant Quest เอง | ❌ | ✅ (จำกัดจำนวน) | ✅ ไม่จำกัด + เชิญร้านนอกเครือ |
| Analytics: footfall พื้นฐาน | ✅ (7 วันย้อนหลัง) | ✅ (90 วัน) | ✅ (ไม่จำกัด + export) |
| Tourist-vs-local split | ❌ | ✅ | ✅ + breakdown ราย segment |
| **Redemption ROI / cost-of-rewards** | ❌ | สรุปคร่าว | ✅ เต็ม + benchmark เทียบย่าน |
| "You owe / you are owed" cross-merchant balance | ❌ | ✅ | ✅ |
| ตำแหน่งใน search / featured placement | ปกติ | boost เล็กน้อย | priority + หมวด featured |
| Sponsored quest / festival campaign (ขายแยก) | — | add-on | add-on + ส่วนลด |
| Support | self-serve / community | email | priority + account manager (City Manager) |

**หมายเหตุเชิงพาณิชย์:**
- Free **ไม่** หมายถึงออก redemption ฟรีต่อแพลตฟอร์ม — ทุก redemption ยังคิด **take-rate (~10–15%, capped)** จาก escrow ตาม revenue pillar (b). Subscription คือ pillar (a) แยกกัน
- ราคาเป็น THB ตั้งใจให้ agent ขายได้ง่ายแบบ "กาแฟวันละแก้ว" (Growth ≈ 25–35 ฿/วัน)
- ภพ.20/ใบกำกับภาษีออกให้ได้ (สำคัญสำหรับร้านจดทะเบียน) → ผูกกับ Billing module

---

### 7.5 Onboarding — Agent-led vs Self-serve

มี 2 เส้นทางเข้าระบบ ทั้งคู่ลงเอยที่ state machine เดียวกัน (§7.1.1) แต่ "ความเร็วในการไต่ trust" ต่างกัน

| มิติ | **Agent-led** (เส้นทางหลัก — moat) | **Self-serve** |
|---|---|---|
| ใครเริ่ม | Field Agent ไปที่ร้านจริงในTerritory ของตน (เช่น Nimman Soi 7, รอบ Wat Phra Singh) | merchant ค้นเจอเอง / โดน QR ป้าย "ร้านนี้อยู่บน [แอป]" |
| Identity proof | Agent เป็นผู้ส่ง **on-premise code** + ถ่ายรูปหน้าร้าน + ช่วยถ่ายเอกสาร DBD/ภพ.20 → trust สูงเร็ว | merchant อัปโหลดเอง (domain email / เอกสาร / on-premise QR แบบ geofenced) |
| ความเสี่ยง claim ปลอม | ต่ำมาก (มีคนของเราอยู่หน้าร้านยืนยัน) | สูงกว่า → ต้องพึ่ง human review เข้มกว่า + dedupe |
| เวลา content ขึ้น live | เร็ว (Agent กรอก i18n + รูปให้ตั้งแต่หน้าร้าน เป็น Change Proposal) | ช้ากว่า (merchant กรอกเอง, ภาษาอาจไม่ครบ 3) |
| คนขาย subscription | Agent / City Manager ปิดการขายได้เลย (ผูก `agent_id_sold_by`) | merchant กดอัปเกรดเองใน Billing |
| ค่าตอบแทน Agent | นับเป็น **Task** สำเร็จ (onboard + verify ผ่าน gate) เข้าระบบจ่ายค่าจ้าง Agent | — |

**จุดเชื่อมกับ Field Agent subsystem (ข้อ 5):**
- Agent **ไม่เคย write live data** — ทุกอย่างที่ Agent กรอกแทนร้าน (เนื้อหา, เวลาเปิด, pin) เข้าเป็น **Change Proposal** สู่ moderation queue เดียวกัน
- เมื่อ merchant verify ตัวเองแล้ว เขา "รับช่วง" Place จาก Agent: ได้สิทธิ์แก้ content ของ Place ตัวเอง (ยังเป็น Change Proposal แต่ trust weight สูง → บางฟิลด์ auto-approve)
- Agent ที่ onboard ร้านสำเร็จ + ร้านนั้นอยู่รอด/active = ตัวชี้วัดคุณภาพ Agent (ผูกกับระบบประเมิน Agent ในข้อ 5)

**Self-serve guardrails (กัน abuse):**
- Self-serve เปิดให้ถึงแค่ `IDENTITY_VERIFIED` ได้เอง แต่ `FINANCE_VERIFIED` (สิทธิ์ออก redemption + payout) **บังคับผ่าน human finance review เสมอ** ไม่ว่ามาทางไหน
- ร้านที่ self-serve ใน Territory ที่มี Agent → ระบบ assign Agent ไป verify on-premise เป็น Task (ได้ทั้ง trust แข็งขึ้น + Agent ได้ค่าตอบแทน + แพลตฟอร์มได้ ground truth)

---

### 7.6 สรุป cross-subsystem hooks (สำหรับ dev ที่อ่านต่อ)

- **Ledger (double-entry):** redemption burn = (user Coins −, Clearing Account +); payout = (Clearing Account −, merchant bank settle). Escrow top-up = (merchant bank +, Escrow Wallet +). ห้ามใช้ integer ที่แก้ได้
- **Moderation queue:** ใช้ Change Proposal model ร่วมกับ Field Agent subsystem
- **Anti-fraud engine:** identity-graph, impossible-travel, velocity caps อยู่ส่วนกลาง — Merchant subsystem แค่เรียก/ฟัง flag
- **RLS:** ทุก query ฝั่ง merchant ต้อง scope ด้วย `merchant_id` + `city_id` (multi-tenant + multi-city ตั้งแต่ migration #1)

---

## 8. Consumer App — ฟีเจอร์, UX flows & 3 ภาษา

> เป้าหมายของ section นี้: ออกแบบ **ประสบการณ์ฝั่งผู้ใช้ทั่วไป (Customer)** ของแอป — ตั้งแต่เปิดแอปครั้งแรก, การ discover ร้าน/ที่เที่ยว/กิจกรรม, การเล่น Quest, การ check-in + redeem จนถึง retention loop ระยะยาว โดยรองรับ **3 ภาษา (TH / EN / 简体中文)** และ 3 persona (Thai local + nomad / Western tourist / Chinese FIT) เป็น first-class ทั้งหมด
>
> หลักการกลาง 3 ข้อที่คุมทุก flow ใน section นี้:
> 1. **Zero signup wall** — ผู้ใช้ต้องเห็น "value" (ร้านใกล้ตัว + โปรสด + Quest) ภายในไม่กี่วินาที โดยยังไม่ต้อง login เลย; ค่อยขอ auth ตอน "first stamp" (ตอนจะเก็บ value จริง)
> 2. **North-star = Time-to-First-Stamp (TTFS)** — ทุก surface ออกแบบเพื่อลากผู้ใช้ไปสู่ Quest Step แรกที่ stamp สำเร็จให้เร็วที่สุด
> 3. **Anti-fraud by design** — ฝั่ง user ไม่มีวันถือ static QR; การ redeem เป็น **merchant-initiated + time-boxed + geofenced + burned server-side** เสมอ (รายละเอียด check-in อยู่ใน 8.4)

---

### 8.1 First-Run / Onboarding — "ไม่มีกำแพง login"

#### 8.1.1 ปรัชญา: Value before Identity

ผู้ใช้ส่วนใหญ่ที่โหลดแอปครั้งแรกคือ **นักท่องเที่ยวที่เพิ่งลงเครื่องที่ CNX** หรือ **คนเชียงใหม่ที่เพื่อนบอกต่อ** — ทั้งคู่ไม่อดทนกับหน้า "Sign up to continue" เราจึง defer auth ออกไปให้ไกลที่สุด:

```
[เปิดแอป]
  → ขอ permission location (พร้อม rationale ชัดเจน 3 ภาษา)
  → geolocate (PostGIS nearest-Places query)
  → แสดง Home ทันที: แผนที่ + การ์ดร้านใกล้ตัว + โปรสด + 1 Featured Quest
  → ผู้ใช้เลื่อนดู / กดเข้า Place detail / กด "เริ่ม Quest" ได้ทั้งหมดแบบ guest
  → ✋ AUTH WALL จะเด้งก็ต่อเมื่อผู้ใช้กด action ที่ "เก็บ value":
       • กด "เก็บแสตมป์ Quest Step แรก" (first stamp)  ← จุดหลัก
       • กดบันทึก/เซฟ Place
       • กดเขียนรีวิว
       • เปิด Wallet
```

> **กฎเหล็ก:** browse, search, ดู Place detail, ดูโปร, ดูรายละเอียด Quest = ทำได้แบบ guest 100%. Auth ขอเฉพาะตอนผูกกับ identity จริง

#### 8.1.2 Location permission — ขอแบบ "ได้ใจ" ไม่ใช่ system popup ดิบ

ก่อนยิง OS permission dialog เราแสดง **pre-permission priming screen** (3 ภาษา) อธิบายว่า "เราใช้ตำแหน่งเพื่อหาร้านใกล้คุณและยืนยันการเช็คอิน เราไม่เก็บเส้นทางการเดินทางของคุณ" — ผูกกับ PDPA (เก็บ redemption *fact* ไม่ใช่ movement graph). ถ้าผู้ใช้ปฏิเสธ → fallback ไปที่ **city-center default (Tha Phae Gate / Old City)** พร้อม banner "เปิด location เพื่อร้านใกล้คุณ"

| สถานะ permission | พฤติกรรมแอป |
|---|---|
| Granted (precise) | nearby Places จริง + check-in ทำได้ |
| Granted (approximate) | nearby ระดับย่าน ใช้ได้ แต่ check-in จะขอ precise ตอน redeem |
| Denied | center ที่ Old City + nudge banner; browse/search ได้ปกติ |

#### 8.1.3 Persona Branch — Tourist Trail vs Local Streaks

ระหว่าง first-run เราถาม **คำถามเดียว (ข้ามได้)** ที่ swipe ง่าย:

> "Here for a visit, or you live here?" / "มาเที่ยว หรือ อยู่เชียงใหม่?" / "来旅行，还是住在这里？"

ผลของการเลือกจะ **ปรับ default ของ Home + Passport** (ไม่ได้ล็อก ผู้ใช้สลับได้ใน Profile):

| | **Tourist Trail** (tourist/FIT) | **Local Streaks** (local/nomad) |
|---|---|---|
| Home เริ่มที่ | Featured Quest แบบ "เก็บได้ในทริปนี้" (เช่น *Old City Temple Trail*, *Nimman Cafe-Hop*) | ร้านใกล้บ้าน/ออฟฟิศ + "open now" + streak ของวันนี้ |
| Passport เน้น | collectible Quests ตามทริป + festival passport | weekly streaks, tier progression, ร้านประจำ |
| Push tone | "อย่าพลาด Quest นี้ก่อนกลับ" (urgency/FOMO) | "เก็บ streak วันนี้หรือยัง" (habit) |
| Lang default | EN / 中文 (ตาม device locale) | TH |

> Persona เป็นแค่ **ตัวปรับน้ำหนัก ranking + tone** ไม่ใช่ feature gate — ทุกคนเข้าถึงทุก surface ได้

#### 8.1.4 Auth options — แตกตาม persona/ภาษา

ขอ auth ตอน first stamp เท่านั้น และแสดง **ปุ่มที่ relevant กับ persona ขึ้นก่อน** (แต่โชว์ครบทุกตัว):

| Persona | ปุ่มหลัก (เด่น) | ปุ่มรอง |
|---|---|---|
| Thai local / nomad | **LINE Login** | Apple, Google |
| Western tourist | **Apple / Google** | LINE |
| Chinese FIT | **WeChat Login**, Apple | (Google มักใช้ไม่ได้ในไทยสำหรับบางเครื่อง CN → ดัน Apple/WeChat) |

- ทุก provider map ไปยัง Supabase Auth identity เดียว (1 user = 1 `customer` row, หลาย linked identities)
- เก็บ guest progress ไว้ใน local + anonymous session id → **merge เข้า account ตอน login** (ผู้ใช้ที่เริ่ม Quest แบบ guest ต้องไม่เสีย progress ของ Step แรก)
- ขอ consent แยกชั้น (PDPA): (1) account/ToS, (2) location สำหรับ check-in, (3) marketing push — แต่ละอันมี lawful basis ของตัวเอง, toggle ได้ใน Profile

---

### 8.2 Main Surfaces — โครงหลัก 5 แท็บ

Bottom nav 5 แท็บ: **Home · Discover · Passport · Wallet · Profile** (icon-first, label เปลี่ยนตามภาษา)

#### 8.2.1 Home — "แผนที่ + ใกล้ฉัน" ผสม eat / see / do

หน้าหลักคือ **map-first hybrid**: ครึ่งบนเป็น Mapbox map (pin สีต่างกันต่อ category: 🍜 eat / 📸 see / 🎯 do), ครึ่งล่างเป็น scrollable feed การ์ด ที่ผสม 3 category เข้าด้วยกันด้วย ranking เดียว

**ลำดับ rail บน Home feed (Tourist Trail default):**
1. **Featured Quest card** (ใหญ่, มี progress ถ้าเริ่มแล้ว) — เช่น *Nimman Cafe-Hop: Soi 1–17*
2. **โปรสดใกล้คุณ (Live Promos)** — มี countdown, distance, "ใช้ได้ถึง 18:00"
3. **ใกล้คุณตอนนี้ (Nearby, open-now)** — ผสม eat/see/do
4. **Trending in Nimman / Old City** (ตาม geo-cluster ที่ผู้ใช้อยู่)
5. **Collectible / Seasonal** (ถ้าอยู่ในช่วงเทศกาล เช่น Yi Peng, Songkran, Sunday Walking Street)

- Pin บนแผนที่มี **freshness halo**: ร้านที่ Field Agent verify ภายใน X วันจะมี ring เด่น → สื่อสาร moat "ข้อมูลสด" ตั้งแต่หน้าแรก
- การ์ดทุกใบโชว์ **distance + open-now + 1 signal** (freshness badge / promo / "Quest Step ที่นี่")
- ปุ่มลอย "Re-center" + filter chip ลัด (Eat / See / Do / Open now)

#### 8.2.2 Discover / Search — filter ครบสำหรับทั้ง 3 persona

Search bar + filter sheet. Filter ที่ต้องมี (สำคัญต่อ persona ต่างกัน):

| Filter | ค่า / ตัวอย่าง | สำคัญกับใคร |
|---|---|---|
| **Category** | Eat / See / Do (+ sub: cafe, restaurant, temple, viewpoint, workshop, spa…) | ทุกคน |
| **Open now** | toggle (ใช้ opening_hours + เวลาท้องถิ่น) | tourist (เวลาจำกัด) |
| **Price** | ฿ / ฿฿ / ฿฿฿ | ทุกคน |
| **Distance** | within 500m / 1km / 3km / map area | nomad, walker |
| **Vibe / tags** | "workspace-friendly", "instagrammable", "quiet", "rooftop", "live music" | nomad, FIT |
| **Dietary** | vegetarian / vegan / halal / gluten-free / เจ | tourist, มุสลิม, FIT |
| **Quest-linked** | "เป็น Quest Step" | gamers |
| **Accepts** | PromptPay / Alipay / WeChat Pay / cash / card | **Chinese FIT (critical)** |

- **Vibe tags** มาจาก curated taxonomy (Field Agent ติด + moderation) ไม่ใช่ free-text → จึงแปล 3 ภาษาได้แบบ deterministic
- ผลลัพธ์ default sort = relevance (distance × freshness × rating × promo) ; sliders ให้เปลี่ยนเป็น distance/rating ได้
- รองรับ **search ภาษาผสม** (พิมพ์ไทยหาร้านที่ชื่ออังกฤษ, พิมพ์จีน pinyin) — ใช้ alias/normalized index

#### 8.2.3 Place Detail — หัวใจของ "ข้อมูลสด" + trust

นี่คือหน้าที่ขาย moat ของ Field Agent ออกมาให้ผู้ใช้เห็นชัดที่สุด

```
┌──────────────────────────────────────────┐
│ [รูป cover / gallery]            ♡ บันทึก  │
│ ชื่อร้าน (TH/EN/中) · 🍜 Eat · ฿฿          │
│ ★ 4.6 (จาก verified visitors)             │
│ ✅ Verified in person 3 days ago          │ ← FRESHNESS BADGE
│    by a Field Agent                        │
├──────────────────────────────────────────┤
│ 🟢 Open now · ปิด 22:00 · 350m            │
│ 💸 Live promo: ลด 15% ถึง 18:00 [countdown]│
│ 🎯 Quest Step: Nimman Cafe-Hop (2/5)       │
├──────────────────────────────────────────┤
│ Pay: PromptPay · Alipay · WeChat Pay       │ ← สำคัญกับ FIT
│ Dietary: เจ/vegetarian available           │
│ Map · เส้นทาง · โทร · LINE/Wechat ร้าน      │
├──────────────────────────────────────────┤
│ รีวิว (verified visitors only)             │
│  [auto-translated to your language ▼]      │
└──────────────────────────────────────────┘
```

- **Freshness badge** = differentiator หลัก: "Verified in person X days ago" ดึงจากเวลา Change Proposal ล่าสุดที่ approve. ถ้าเกิน threshold → badge เปลี่ยนเป็นสีจางเตือน "may be outdated"
- **Verified-visitor reviews**: เขียนรีวิวได้เฉพาะคนที่มี check-in/redemption fact ที่ Place นี้ → กัน fake review + เสริม anti-fraud narrative. แสดง badge "Visited ✓"
- รีวิวทุกอันมีปุ่ม/auto **translate** เป็นภาษาผู้ใช้ (8.3) พร้อม label "translated"
- โปรและ Quest Step แสดงตรงนี้เพื่อ convert เป็น check-in

#### 8.2.4 Passport / Quests — surface ของ progression

**Passport** = หน้ารวม Quest ที่กำลังเล่น + ที่เก็บได้ (collectible). คิดเหมือน "สมุดสะสมแสตมป์ดิจิทัล"

- **Active Quests**: progress bar ของ Quest Step (เช่น Cafe-Hop 2/5), step ถัดไปที่ใกล้สุด + ปุ่มนำทาง
- **Quest detail**: ลำดับ Step, แผนที่ trail, รางวัลเมื่อจบ (Coins / badge / free coffee), เงื่อนไข, วันหมดอายุ
- **Collectibles / Seasonal**: passport พิเศษ (Yi Peng lantern stamp, Songkran, Sunday Walking Street) — เก็บได้เฉพาะช่วงเทศกาล → FOMO + ของสะสม
- **Badge case**: badge จาก Sparks/tier
- แสดง **escrow-aware state**: ถ้า Quest โดน auto-pause เพราะ Escrow Wallet ของ merchant เป็นศูนย์ → Step นั้นขึ้น "พักชั่วคราว" อย่างสุภาพ (ไม่โทษผู้ใช้, ไม่ให้เก็บ stamp ที่จะ mint Coins ไม่ได้)

#### 8.2.5 Wallet — Sparks / Coins / Badges / Tiers (แยกสองสกุลให้ชัด)

แยก 2 สกุลเงินอย่างชัดเจนทั้ง visual และ wording (ตาม canonical naming):

| | **Sparks** ✨ | **Coins** 🪙 |
|---|---|---|
| คือ | soft XP ฟรี | hard value, ค้ำด้วยบาทใน Escrow |
| ได้จาก | check-in, streak, รีวิว, สำรวจ | จบ Quest / รางวัลที่ merchant prefund |
| ใช้ทำอะไร | tier, badge, leaderboard | **Redeem** ของจริงที่ Place |
| Redeem ได้ไหม | ❌ ไม่มีวัน | ✅ ได้ (non-cashable, มีวันหมดอายุ) |
| Wording กับผู้ใช้ | "แต้มสะสม / XP" | "เหรียญแลกของ" |

- Wallet โชว์ Coins balance + **expiry timeline** ("Coins 50 หมดอายุ 31 ก.ค.") เพื่อกระตุ้น redeem (และคงสถานะ non-cashable ให้พ้น e-money ของ ธปท.)
- โชว์ **tier ปัจจุบัน + ขีดถัดไป** (จาก Sparks) — เกม progression ฟรีที่ไม่แตะเงินจริง
- ปุ่ม **"Redeem"** → เข้าสู่ flow 8.4 (merchant-initiated)
- ไม่มีปุ่ม "ถอนเงิน/โอน Coins" เด็ดขาด — Coins ไม่ใช่เงิน
- ทุกการเปลี่ยนแปลงยอดมาจาก **double-entry ledger** (ไม่ใช่ integer ที่ client แก้ได้); Wallet แค่ render projection

#### 8.2.6 Profile — identity, ภาษา, consent, persona

- ภาษา (TH/EN/简体中文 override device), persona toggle (Tourist Trail ↔ Local Streaks)
- linked logins (LINE/Apple/Google/WeChat), payment methods
- **PDPA center**: consent toggles (location, marketing), "ขอข้อมูลของฉัน", "ลบบัญชี", retention policy ภาษาคน
- ประวัติ redemption (เก็บเป็น *fact* ตาม PDPA ไม่ใช่ movement graph)

---

### 8.3 Trilingual Design — TH / EN / 简体中文

#### 8.3.1 3 ชั้นของการแปล

| ชั้น | เนื้อหา | กลไก |
|---|---|---|
| **UI strings** | ปุ่ม, label, error, onboarding | i18n catalog (ARB/JSON ต่อ locale) จัดทำโดยทีม — แปลมือ, ตรวจคุณภาพ |
| **Curated content** | category, vibe tags, Quest title/desc, badge | จัดเก็บแบบ **multi-column / translation table** (`name_th/en/zh`) ใส่ตอน content ops; deterministic |
| **UGC** (รีวิว, รูปแคปชัน) | ผู้ใช้พิมพ์เอง | **auto-translate on demand** (machine translation) + แสดง original + label "translated"; cache คำแปล |

- **Place names**: เก็บทั้งชื่อจริง + transliteration; ไม่บังคับแปลชื่อร้าน (แสดงชื่อเดิม + ชื่อแปลถ้ามี)
- Locale-aware: วันที่/เวลา (พ.ศ. vs ค.ศ.), สกุลเงิน (฿), เลขจีน, RTL ไม่จำเป็น (3 ภาษานี้ LTR หมด)
- **Fallback chain**: zh → en → th (ถ้า content ยังไม่ถูกแปล)

#### 8.3.2 Chinese payment rails + "RED" framing

- **Payment**: Place detail + checkout โชว์ **Alipay / WeChat Pay** เป็น first-class (คนจีน scan Thai QR ได้ตั้งแต่ ต.ค. 2025) ควบคู่ PromptPay; filter "accepts WeChat/Alipay" สำคัญมากกับ FIT
- **Positioning กับ FIT**: framing = *"the local loyalty layer for the trip you planned on 小红书 (RED/Xiaohongshu)"* — คนจีนวางแผนเที่ยวจาก RED มาแล้ว แอปเราคือชั้น loyalty + redeem จริงบนพื้นที่ (ไม่แข่งกับ RED, แต่ต่อยอด)
- รองรับ **deep-link / mini-program-style entry** และ Quest ที่ตรงกับ POI ยอดฮิตบน RED (เช่น cafe ใน Nimman, viewpoint, วัด) เพื่อให้ FIT รู้สึก "ที่ที่ฉันเซฟไว้ มีใน Quest"
- ภาษา default = device locale; แต่ดัน 简体中文 + Apple/WeChat login ขึ้นก่อนสำหรับเครื่อง/locale จีน

---

### 8.4 Check-in + Redemption Flow (ฝั่ง User)

> หลักความปลอดภัย: **ผู้ใช้ไม่เคยถือ static QR ของตัวเอง**. การ redeem เกิดจากฝั่งร้านเสมอ, time-boxed, geofenced, เผา Coins ที่ server. รายละเอียด trust-tier และ anti-fraud server-side อยู่ใน section ความปลอดภัย — ที่นี่เล่า **สิ่งที่ผู้ใช้เห็น**

#### 8.4.1 Check-in (เก็บ Quest Step / stamp)

```
ผู้ใช้อยู่ที่ร้าน (เช่น Ristr8to, Nimman Soi 3)
  1. เปิด Place detail → ปุ่ม "เช็คอิน / เก็บแสตมป์"
  2. แอปเช็ค geofence (PostGIS) + dwell time (อยู่จริงพักหนึ่ง)
     → Tiered trust: GPS dwell < verified visit (scan QR ร้าน) < proven purchase
  3. ถ้านี่คือ "first stamp" ของ guest → เด้ง AUTH (8.1.4) แล้วทำต่อ
  4. server บันทึก check-in fact, mint Sparks (และ progress Quest Step)
  5. UI: แอนิเมชันแสตมป์ลง Passport + "+10 ✨ Sparks · Step 2/5" 🎉
```

- ถ้าผู้ใช้ห่างเกิน geofence → ปุ่มเป็น "ไปที่ร้านเพื่อเช็คอิน" + ระยะทาง (ไม่ปล่อยให้กดมั่ว)
- **Impossible-travel / device cap** ถูกเช็ค server-side; ฝั่ง user เห็นแค่ "ไม่สามารถเช็คอินได้ตอนนี้" + ช่องทาง support (ไม่เปิดเผยกลไก)

#### 8.4.2 Redemption (เผา Coins แลกของจริง)

```
ผู้ใช้มี Coins พอ + อยู่ที่ Place ที่ใช้ได้
  1. Wallet/Quest reward → ปุ่ม "Redeem"
  2. แอปยืนยัน geofence + แสดงรายการรางวัล (free coffee / ลด ฿X)
  3. ⚠️ ขั้นตอนต้อง MERCHANT-INITIATED:
       • ผู้ใช้กด "พร้อมแลก" → ขึ้นจอ "ให้พนักงานสแกน/ใส่รหัส"
       • ร้านสแกน rotating QR/OTP (หมุนทุกไม่กี่วินาที) ของ "คำขอแลก" นี้
         — หรือ ร้านกดยืนยันใน Merchant app
  4. server: ตรวจ geofence + time-box + escrow > 0 → BURN Coins (double-entry),
     หัก Escrow Wallet, ลง Clearing Account, คิด take-rate
  5. UI ผู้ใช้: ✅ "แลกสำเร็จ: ฟรีกาแฟ 1 แก้ว" + ใบเสร็จ redemption
```

- **ไม่มี** หน้าจอที่ผู้ใช้โชว์ QR คงที่ให้ใครก็สแกนได้ → QR/OTP เป็นของ "ธุรกรรมนี้" และหมดอายุไว
- ถ้า **Escrow = 0** → ปุ่ม redeem ของรางวัลนั้น disable + ข้อความ "รางวัลนี้พักชั่วคราว" (platform ไม่สำรองจ่าย)
- redemption สำเร็จ → ปลดสิทธิ์ "verified visitor" สำหรับเขียนรีวิว (8.2.3)

---

### 8.5 Retention Loops — ทำให้กลับมา

#### 8.5.1 Geofenced, tasteful push

- **Trigger by proximity (opt-in)**: เข้าใกล้ Quest Step ที่ยังไม่เก็บ / ร้านมีโปรสด → push "อีก 1 ร้านจบ Nimman Cafe-Hop · Ristr8to อยู่ห่าง 200m"
- มี **frequency cap + quiet hours** + relevance gating (ไม่สแปม); ทุก push ผูก consent marketing แยก (PDPA)
- ต่าง persona ต่าง tone (8.1.3): tourist = FOMO/urgency, local = habit/streak

#### 8.5.2 Streaks (local engine)

- เก็บ **daily/weekly streak** จากการ check-in → ฟรี Sparks ทวีคูณตาม streak; ฟีดเตือน "เหลือ X ชม. รักษา streak 6 วัน"
- ออกแบบเพื่อ **ฐานคนท้องถิ่น/nomad** ให้ retain ทั้งปี (กันปัญหา seasonality ช่วง burning/rainy)

#### 8.5.3 Seasonal / Festival collectible Quests + FOMO

| ช่วง | Collectible Quest (ตัวอย่าง) | กลไก FOMO |
|---|---|---|
| **Yi Peng / Loy Krathong** (พ.ย.) | *Lantern Trail* รอบคูเมือง + จุดชมโคม | badge/stamp โคมไฟ เก็บได้เฉพาะปีนี้, นับถอยหลัง |
| **Songkran** (เม.ย.) | *Old City Water Route* (Tha Phae → Wat Phra Singh) | passport ลายสงกรานต์, limited |
| **Sunday Walking Street** (ทุกอาทิตย์) | *Ratchadamnoen Night Crawl* | weekly resettable, ของสะสมรายสัปดาห์ |
| **Sponsored / festival campaign** | Quest แบรนด์/ห้าง/TAT prefund (Maya, One Nimman) | จำกัดจำนวน Coins, หมดแล้วหมดเลย |

- collectible เป็น **ของสะสมในPassport** (เห็นช่องว่างที่ยังไม่เก็บ → drive การกลับมาในเทศกาลถัดไป)
- festival passport = seasonal upside ฝั่งรายได้ (เชื่อมกับ revenue pillar sponsored quests)

#### 8.5.4 Social / referral (เบา ๆ)

- leaderboard ระดับย่าน (Nimman / Old City) จาก Sparks
- share progress/badge เป็นการ์ดสวย (LINE/RED/IG) → acquisition loop ตาม persona

---

### 8.6 Offline Tolerance (สำคัญกับ tourist)

นักท่องเที่ยวมักเน็ตหลุด (ไม่มีซิมไทย / Wi-Fi เฉพาะจุด). แอปต้องใช้งานพื้นฐานได้แบบ offline-tolerant:

| ความสามารถ | Offline behavior |
|---|---|
| Map + nearby ที่เพิ่งโหลด | **cache tiles + Places** ล่าสุด, แสดงได้ |
| Place detail ที่เคยเปิด | cache, ดูซ้ำได้ |
| Passport / Quest progress | render จาก local cache |
| **Check-in** | ทำได้แบบ optimistic + **queue**, sync เมื่อเน็ตกลับ; ถ้า geofence/anti-fraud ไม่ผ่านตอน sync → rollback อย่างสุภาพ |
| **Redemption** | ❌ ต้อง online (ต้อง burn + escrow check ที่ server แบบ real-time) — แสดง "ต้องเชื่อมต่ออินเทอร์เน็ตเพื่อแลก" |
| รูป/รีวิวที่เขียน | queue ส่งภายหลัง |

- ดาวน์โหลด **"Quest pack ออฟไลน์"** (แผนที่ trail + Step) ไว้ก่อนเดิน เช่น Old City Temple Trail ได้
- การ redeem เป็น online-only โดยตั้งใจ — เพื่อความถูกต้องของ ledger/escrow

---

### 8.7 North-Star Metric & Funnel Events

#### 8.7.1 North-star = Time-to-First-Stamp (TTFS)

> **TTFS** = เวลาตั้งแต่เปิดแอปครั้งแรก → เก็บ Quest Step / check-in แรกสำเร็จ. ยิ่งสั้น = onboarding + value delivery ดี. ทุก surface ใน 8.1–8.2 ออกแบบเพื่อบีบ TTFS

- Activation = "ผู้ใช้ที่ได้ first stamp ภายใน session แรก" (หรือภายใน 24 ชม.)
- เป้า north-star ระดับ cohort: median TTFS ต่ำ + activation rate สูง แยกตาม persona/ภาษา

#### 8.7.2 Key funnel events (analytics taxonomy)

```
app_open (first / returning)
location_permission_prompt_shown
location_permission_result {granted|approx|denied}
home_loaded {nearby_count, ms_to_first_place}
place_detail_viewed {place_id, category, freshness_days}
quest_card_viewed / quest_started {quest_id}
checkin_attempted {place_id, trust_tier}
auth_wall_shown {trigger}
auth_completed {provider, persona}
► first_stamp_succeeded  ← ★ ACTIVATION (TTFS stop-clock)
quest_step_completed {quest_id, step_idx}
quest_completed {quest_id}  → coins_minted
redeem_attempted {place_id} → redeem_succeeded {reward, coins_burned}
review_submitted {verified_visitor: true}
streak_incremented {len}
push_received → push_opened
day_n_return {n: 1/7/30}
```

- แยก dashboard ตาม persona × ภาษา × geo-cluster (Nimman / Old City / Santitham / CMU) เพื่อจูน rollout แบบ district-by-district
- funnel หลักที่ดูทุกวัน: `app_open → home_loaded → checkin_attempted → first_stamp_succeeded`

---

### 8.8 First-Run "Aha" Walkthroughs (3 persona)

#### 8.8.1 🧳 Western Tourist — "Mia, just landed at CNX"

```
1. โหลดแอปที่สนามบิน, เปิด → priming "find places near you, verify check-ins" (EN)
2. กด Allow location → Home โหลด: แผนที่ Old City + การ์ด
   "Old City Temple Trail" (Wat Phra Singh → Chedi Luang → Wat Chiang Man)
3. เลือก persona = "Here for a visit" → Tourist Trail
4. กด Quest → เห็น 4 Step + แผนที่เดินได้ + reward "free iced latte at a partner cafe"
5. เดินถึง Wat Phra Singh → กด "Get stamp" → geofence ผ่าน
6. AUTH WALL (first stamp) → กด Apple → 2 วิ
   ★ first_stamp_succeeded — TTFS ~6 นาทีจากเปิดแอป
7. แสตมป์ลง Passport + "+10 ✨ · Step 1/4". Mia เดินต่อ → ติดงอม
```
**Aha:** "เดินเที่ยววัดอยู่แล้ว ได้สะสมแสตมป์ + กาแฟฟรีตอนจบ โดยไม่ต้องสมัครก่อนเลย"

#### 8.8.2 🛵 Local / Nomad — "Top, ทำงานแถว Nimman"

```
1. เพื่อนส่งลิงก์ใน LINE → เปิดแอป (TH) → Allow location
2. persona = "อยู่เชียงใหม่" → Local Streaks; Home = ร้าน open-now รอบ Soi 11
3. เห็น "Nimman Cafe-Hop" + โปรสด "Graph Cafe ลด 15% ถึง 18:00"
4. เดินไป Graph → "เช็คอิน" → geofence ผ่าน → AUTH → LINE Login (แตะเดียว)
   ★ first_stamp_succeeded — TTFS ~4 นาที
5. "+10 ✨ · เริ่ม streak วันที่ 1" + Step 1/5 ของ Cafe-Hop
6. วันถัดไป push (TH, habit tone): "เก็บ streak วันที่ 2 — Ristr8to อยู่ห่าง 150m"
```
**Aha:** "ที่ฮอปคาเฟ่อยู่แล้วทุกวัน กลายเป็น streak + เดินครบ 5 ร้านได้กาแฟฟรี"

#### 8.8.3 🇨🇳 Chinese FIT — "Lin, วางแผนจาก 小红书 มาแล้ว"

```
1. เปิดแอป (device locale zh) → UI 简体中文, priming + Allow location
2. Home ดัน Quest ที่ตรงกับ POI ฮิตบน RED: "宁曼咖啡之旅 (Nimman Cafe-Hop)"
   — ร้านที่ Lin เซฟไว้ใน RED โผล่เป็น Quest Step
3. Place detail โชว์ "支付: 支付宝 · 微信支付" (Alipay/WeChat) ชัดเจน → มั่นใจจ่ายได้
4. ถึงร้าน → check-in → AUTH → 微信登录 (WeChat) แตะเดียว
   ★ first_stamp_succeeded
5. จ่ายค่ากาแฟด้วย WeChat สแกน Thai QR; จบ Quest → Coins → แลกของจริงที่ partner
6. framing in-app: "为你在小红书规划的行程，加上本地积分玩法"
   (loyalty layer สำหรับทริปที่คุณวางจาก RED)
```
**Aha:** "ที่ที่ฉันเซฟจาก RED มีใน Quest, จ่ายด้วย WeChat ได้, เดินครบยังได้ของแลกจริง"

---

### 8.9 สิ่งที่ section นี้ฝากให้ section อื่น (handoff)

- **Anti-fraud / Security**: ทุก trust-tier logic, rotating QR/OTP, impossible-travel, device cap, identity-graph อยู่ที่ section ความปลอดภัย — 8.4 เป็นแค่ฝั่ง UX
- **Ledger / Escrow**: Wallet (8.2.5) render จาก double-entry ledger; redemption burn + Clearing Account + take-rate อยู่ที่ section การเงิน/ledger
- **Field Agent / Freshness**: freshness badge (8.2.3) พึ่งข้อมูล Change Proposal ที่ approve จาก section Field Agent
- **Merchant app**: redemption merchant-initiated (8.4.2) ต้องมีคู่ฝั่ง Merchant app
- **i18n content pipeline**: curated translation table (8.3) ต้อง sync กับ content ops / data model (migration #1 มี `*_th/en/zh` columns)

---

## 9. Monetization Modules — 4 เสารายได้

> **หลักการกำกับ (Design Invariants ของทั้ง 4 เสา)**
> - ทุกเสารายได้ผูกกลับเข้า **double-entry ledger** เดียวกัน — ไม่มีรายได้ก้อนไหนเก็บเป็น integer ลอย ๆ นอก ledger
> - แพลตฟอร์ม **ไม่เคยสำรองเงินจ่ายล่วงหน้า** — Coins ทุกเหรียญ backed ด้วย baht ที่อยู่ใน `escrow_wallet` แล้ว
> - **Sparks ห้ามเกี่ยวข้องกับเงินทุกกรณี** (soft XP เท่านั้น) — เสารายได้ทุกตัวเดินบน **Coins** + **baht**
> - การคิดเงินทุกครั้งสร้าง **immutable transaction record** + แสดงให้ merchant เห็นแบบ transparent (ไม่มี hidden fee)
> - ทุก settlement ใส่ `merchant_id` + `city_id` (จาก migration #1) เพื่อ multi-tenant + multi-city roll-up

ภาพรวม: รายได้ของแพลตฟอร์มมาจาก 4 ท่อที่ออกแบบเป็นโมดูลอิสระแต่ใช้ ledger + escrow ร่วมกัน

| # | เสารายได้ | Buyer หลัก | กลไกคิดเงิน | ประเภท |
|---|-----------|------------|-------------|--------|
| 9.1 | **Merchant SaaS Subscription** | Merchant (ร้าน) | ค่าสมาชิกรายเดือน/รายปี | Recurring / predictable |
| 9.2 | **Redemption Take-Rate** | Merchant (หักจาก escrow) | ~10–15% capped ต่อการ redeem | Usage-based |
| 9.3 | **Sponsored Quests & Festival Campaigns** | Brand / Sponsor / Mall / TAT | งบ campaign prefund + fee | Campaign / seasonal |
| 9.4 | **Data Products + Booking Affiliate** | Mall / TAT / F&B + OTA (Klook/TakeMeTour) | ค่า subscription insight + affiliate % | Data + affiliate |

---

### 9.0 Foundation — ตารางที่ทั้ง 4 เสาใช้ร่วมกัน

ก่อนลงรายเสา นี่คือ schema กลางที่ทุกโมดูล monetization อ้างถึง (ต่อยอดจาก ledger + escrow ในหมวดก่อนหน้า):

```sql
-- บัญชีใน double-entry ledger ที่เกี่ยวกับ monetization
-- account_type: ESCROW_MERCHANT | CLEARING | PLATFORM_REVENUE | SPONSOR_BUDGET | PSP_SUSPENSE
ledger_account(
  id, city_id, owner_type, owner_id, account_type,
  currency,          -- 'THB' | 'COIN'  (1 COIN = 1 THB backed, แต่แยก currency เพื่อ control)
  created_at
)

-- ทุกการเคลื่อนไหวเงิน = แถวคู่ (debit/credit) อ้าง transaction เดียวกัน
ledger_entry(
  id, txn_id, account_id, direction,  -- 'DR' | 'CR'
  amount_minor,                       -- สตางค์ (เลี่ยง float)
  currency, city_id, merchant_id,
  created_at  -- append-only, ไม่มี UPDATE/DELETE
)

ledger_txn(
  id, kind,           -- 'SUBSCRIPTION' | 'REDEMPTION' | 'CAMPAIGN_FUND' | 'AFFILIATE' | 'TOPUP' | 'PAYOUT'
  reference_type, reference_id,       -- ชี้ไป invoice / redemption / campaign
  city_id, idempotency_key, created_at
)
```

หลักบัญชี: **revenue ทุกเสาลงเป็น CR ที่บัญชี `PLATFORM_REVENUE`** คู่กับ DR ที่ source (escrow ของ merchant, budget ของ sponsor, หรือ PSP suspense). Finance/Payout role อ่าน roll-up จากตารางนี้ได้ทันที per city / per merchant / per pillar.

---

### 9.1 เสาที่ 1 — Merchant SaaS Subscription

**Buyer:** Merchant (เจ้าของ Place หนึ่งหรือหลายแห่ง). ขายโดย **Field Agent / City Manager** แบบ door-to-door ใน Nimman, Santitham, รอบเมืองเก่า

#### 9.1.1 นิยาม Tier และสิ่งที่ปลดล็อก

| Feature | **Free / Listed** | **Starter** | **Growth** | **Pro / Multi-Place** |
|---------|:-----------------:|:-----------:|:----------:|:---------------------:|
| ราคา (เดือน) | ฿0 | ฿390 | ฿990 | ฿2,490 |
| ราคา (ปี, ~2 เดือนฟรี) | — | ฿3,900 | ฿9,900 | ฿24,900 |
| Place listing (TH/EN/中文) | 1 (read-only) | 1 | 1 | สูงสุด 5 |
| แก้ข้อมูล/รูป/เมนูเอง | ผ่าน Agent | ✓ self-serve | ✓ | ✓ |
| ตอบรีวิว | ✗ | ✓ | ✓ | ✓ |
| สร้าง Promotion (ส่วนลด/coupon) | ✗ | 1 active | ไม่จำกัด | ไม่จำกัด |
| เข้าร่วม Quest ของแพลตฟอร์ม | ✗ | ✓ | ✓ | ✓ |
| **สร้าง Quest เอง** (own-merchant trail) | ✗ | ✗ | ✓ | ✓ |
| ออก Coins / escrow rewards | ✗ | ✓ (take-rate สูงสุด) | ✓ (take-rate ลด) | ✓ (take-rate ต่ำสุด) |
| Dashboard analytics | basic | footfall + redeem | + demographic + 中文 share | + cross-Place + export CSV |
| Featured placement / boost | ✗ | ✗ | จำกัด | ✓ priority |
| API / POS webhook | ✗ | ✗ | ✗ | ✓ |
| Priority support | ✗ | email | chat | dedicated CM |

> **กลยุทธ์ราคา:** Tier ผูกกับ **take-rate ของเสา 9.2** — ยิ่ง subscription สูง take-rate ยิ่งต่ำ (เช่น Starter 15% → Pro 10%). ทำให้ร้านที่ redeem เยอะมีแรงจูงใจ upgrade, และ subscription = revenue ที่คาดเดาได้แม้ low season (burning/rainy)

#### 9.1.2 Data model

```sql
subscription_plan(
  id, code,            -- 'FREE'|'STARTER'|'GROWTH'|'PRO'
  city_id,             -- ราคาปรับตามเมืองได้ (CM vs BKK ภายหลัง)
  price_month_minor, price_year_minor,
  max_places, take_rate_bps,   -- bps = basis points (1500 = 15%)
  features_jsonb, active
)

merchant_subscription(
  id, merchant_id, plan_id, city_id,
  status,              -- 'trialing'|'active'|'past_due'|'paused'|'canceled'
  billing_cycle,       -- 'monthly'|'annual'
  current_period_start, current_period_end,
  sold_by_agent_id,    -- attribution -> Agent commission
  next_invoice_at, grace_until,
  created_at
)

invoice(
  id, merchant_id, subscription_id, city_id,
  amount_minor, tax_minor, total_minor, currency,
  status,              -- 'open'|'paid'|'failed'|'void'|'uncollectible'
  due_at, paid_at,
  psp_charge_id, promptpay_ref,
  dunning_stage,       -- 0..N
  created_at
)
```

#### 9.1.3 Billing engine (PromptPay-first)

ออกแบบเป็น engine ที่ทำงานบน Supabase Edge Function + scheduled cron, ผ่าน Thai PSP (Omise/2C2P/Fiuu):

1. **Invoice generation** — cron รายวัน หา `merchant_subscription` ที่ `next_invoice_at <= now()` → สร้าง `invoice` (open) + ledger_txn kind=`SUBSCRIPTION`
2. **Charge** — เรียก PSP:
   - **PromptPay QR** (default ไทย): ออก dynamic QR, รอ webhook `charge.complete`
   - **Card** (ทางเลือก expat/foreign owner): recurring token
3. **On paid** → ledger: **DR `PSP_SUSPENSE` / CR `PLATFORM_REVENUE`** (sub-account `subscription`), set `current_period_end += cycle`, `next_invoice_at` เลื่อนรอบถัดไป
4. **Annual** เก็บเงินก้อนเดียว, period 12 เดือน, แต่ recognize revenue แบบ deferred (Finance รู้ว่ารับรู้รายเดือน)

#### 9.1.4 Agent-sold flow

ผูกกับ Field Agent subsystem โดยตรง — Agent คือช่องทางขายหลัก:

```
Agent เดินเข้าร้าน (เช่น คาเฟ่ Nimman Soi 9)
  -> เปิด Merchant onboarding ใน app (role-gated agent mode)
  -> สร้าง merchant account + Change Proposal สำหรับ Place data (รูป/เมนู/พิกัด PostGIS)
  -> เสนอ plan, ร้านสแกน PromptPay จ่ายงวดแรกทันที
  -> merchant_subscription.sold_by_agent_id = agent
  -> Place data เข้าคิว moderation (Agent ไม่เขียน live)
```

**Commission:** `agent_commission(agent_id, subscription_id, type='new'|'renewal', amount_minor, status)`
- New sale: 20% ของ first-period (annual จูงใจ Agent ขายรายปี → cashflow ดี)
- Renewal: 5% ปีถัดไป (ตราบที่ร้านยัง active) → Agent ดูแล retention
- จ่ายผ่าน Finance/Payout หลัง invoice `paid` + clawback ถ้าร้าน refund ภายใน 30 วัน

#### 9.1.5 Dunning (ทวงหนี้ subscription)

| Stage | เวลา | การกระทำ | สิทธิ์ร้าน |
|-------|------|----------|-----------|
| 0 | T+0 (charge fail) | retry + LINE/push แจ้ง | คงสิทธิ์ |
| 1 | T+3 วัน | retry ครั้งที่ 2 + reminder TH/EN | คงสิทธิ์ (grace) |
| 2 | T+7 วัน | retry + แจ้งจะ downgrade | `past_due`, ซ่อน boost/featured |
| 3 | T+14 วัน | downgrade → Free/Listed, **pause** การออก Coins ใหม่ | quest ของร้าน auto-pause |
| 4 | T+30 วัน | mark `uncollectible`, ส่ง City Manager ตามด้วยตัว | listing เหลือ read-only |

> Escrow ที่เหลือ **ไม่ถูกริบ** เมื่อ downgrade — Coins ที่ minted ไปแล้วยัง honor ได้ (ปกป้อง customer trust + เลี่ยงปัญหา PDPA/ผู้บริโภค)

**Unit economics 9.1:** ARPU เป้าหมาย ~฿700/เดือน blended. ต้นทุน PSP PromptPay ต่ำมาก (~฿0–10/txn flat). Margin เสานี้สูง (>85%) — ใช้กลบต้นทุน Field Agent workforce (เสา moat)

---

### 9.2 เสาที่ 2 — Redemption Take-Rate

**Buyer:** Merchant (จ่ายโดยอัตโนมัติ หักจาก `escrow_wallet` ตอน redeem — ไม่มี invoice แยก)

#### 9.2.1 หลักการ

เมื่อ Customer **burn Coins** เพื่อแลกรางวัลที่ร้าน (merchant-initiated, geofenced, rotating QR/OTP — ดูหมวด anti-fraud), แพลตฟอร์มหัก **take-rate** จากมูลค่า baht ที่ปลดออกจาก escrow ในวินาทีนั้น. ทุกอย่างเกิด **server-side, atomic, ภายใน redemption transaction เดียว**

#### 9.2.2 สูตรคิด

```
ค่า reward (baht ที่ลูกค้าได้รับมูลค่าเทียบเท่า) = R
take_rate_bps = subscription_plan.take_rate_bps ของร้าน (เช่น 1200 = 12%)
fee_raw = R * take_rate_bps / 10000
fee     = min(fee_raw, fee_cap)        -- capped! (เช่น cap ฿20 ต่อ redemption)
```

- **Cap** สำคัญ: รางวัลมูลค่าสูง (เช่น คอร์สทำอาหาร ฿1,500) ไม่โดน 12% เต็ม = ฿180 แต่ติด cap ฿20 → จูงใจร้านออกรางวัลมูลค่าสูงได้
- **Floor** เลือกได้: redemption รางวัลเล็ก (กาแฟฟรี ฿60) → fee = ฿7.2, อาจตั้ง floor ฿5

| Plan | take-rate | cap/redeem |
|------|:---------:|:----------:|
| Starter | 15% (1500 bps) | ฿20 |
| Growth | 12% (1200 bps) | ฿18 |
| Pro | 10% (1000 bps) | ฿15 |

#### 9.2.3 Ledger ตอน redeem (atomic, double-entry)

ตัวอย่าง: ลูกค้าแลกกาแฟฟรีมูลค่า ฿60 ที่ร้าน Growth (12%, cap ฿18):

```
fee = min(60 * 0.12, 18) = ฿7.20

ledger_txn(kind='REDEMPTION', reference=redemption_id, idempotency_key=...)
  DR  ESCROW_MERCHANT (ร้าน)      ฿60.00   -- ปลด baht ที่ค้ำ Coins
  CR  CLEARING                    ฿52.80   -- มูลค่าสุทธิที่ใช้ honor reward
  CR  PLATFORM_REVENUE (redeem)   ฿ 7.20   -- take-rate
-- พร้อมกัน burn Coins: customer coin_balance -= 60 COIN (append entry, ไม่ใช่ UPDATE integer)
```

> **เงื่อนไขกันโกง/กัน overdraft:** ถ้า `escrow_balance < R` → redemption ถูกปฏิเสธ + quest auto-pause (zero-balance rule). แพลตฟอร์มไม่เคย advance เงิน

#### 9.2.4 Transparency ให้ merchant

Dashboard ของร้านแสดงทุก redemption แบบ line-item:

```
redemption_receipt(
  redemption_id, place_id, occurred_at,
  reward_label,            -- "Free Latte"
  reward_value_minor,      -- 6000
  take_rate_bps_applied,   -- 1200
  fee_minor,               -- 720
  fee_capped_bool,         -- false
  escrow_balance_after_minor
)
```

แสดงเป็นตาราง "วันนี้คุณจ่าย fee ฿X จาก Y การแลก" + กราฟรายเดือน + แจ้งเตือนเมื่อ escrow ใกล้หมด (ให้ top-up ผ่าน PromptPay). ความโปร่งใสนี้ลด churn

#### 9.2.5 Settlement

- Fee **ตกเป็น PLATFORM_REVENUE ทันที** ตอน redeem (realized, ไม่ต้องรอ payout cycle)
- ฝั่ง `CLEARING` (มูลค่าสุทธิที่ honor) — ถ้ารางวัลคือ "ของฟรีที่ร้านออกเอง" เงินไม่ออกนอกระบบ (ร้านแค่เสียต้นทุนของจริง); ถ้าเป็น sponsored/discount ที่ต้อง settle เป็นเงิน → Finance/Payout จ่ายร้านรอบสัปดาห์จาก CLEARING

**Unit economics 9.2:** เป็น usage-based ที่ scale ตาม engagement. ถ้าร้าน Growth มี 300 redeem/เดือน เฉลี่ย fee ฿8 → ฿2,400/เดือน/ร้าน. รวมกับ subscription ฿990 = ฿3,390. ต้นทุนส่วนเพิ่มต่อ redeem ~0 (เป็น DB write). Margin เกือบ 100% หลังหักต้นทุน PSP top-up

---

### 9.3 เสาที่ 3 — Sponsored Quests & Festival Campaigns

**Buyer:** Brand / Sponsor — coffee roaster (เช่น เจ้าของเมล็ดที่ขายให้คาเฟ่ Nimman), ธนาคาร (กระตุ้น scan-to-pay), telco, ห้าง (**Maya, One Nimman, Central Festival**), และ **TAT** (ททท.) สำหรับ festival

#### 9.3.1 Brand/Sponsor account

role ใหม่ `Brand/Sponsor` (จาก canonical roles) — แยกจาก Merchant:

```sql
sponsor(
  id, legal_name, type,        -- 'brand'|'bank'|'telco'|'mall'|'TAT'|'agency'
  city_id, billing_contact, contract_ref,
  default_budget_account_id,   -- ledger account_type='SPONSOR_BUDGET'
  created_at
)
```

Sponsor **ไม่ได้เป็นเจ้าของ Place** — เขา "ซื้อ exposure" บน Places ของ merchants หลายราย ผ่าน campaign

#### 9.3.2 Campaign builder (self-serve + agency-assisted)

UI ให้ sponsor ประกอบ campaign:

| ขั้น | เลือกอะไร | ผูกกับ data model |
|------|-----------|-------------------|
| 1. Type | Sponsored Quest \| Festival Passport \| Boosted Promotion | `campaign.kind` |
| 2. Places / Quest Steps | เลือกร้านที่เข้าร่วม (เช่น 5 คาเฟ่ Nimman Soi 1–17) | `campaign_place(campaign_id, place_id)` |
| 3. Reward pool | ตั้งงบ Coins รวม + รางวัลต่อ completion | `campaign.reward_pool_minor` |
| 4. Geofence | วาด polygon PostGIS (เช่น One Nimman + รัศมี) | `campaign.geofence geometry` |
| 5. Dates | start/end (เช่น Yi Peng 4–6 พ.ย.) | `campaign.starts_at/ends_at` |
| 6. Targeting | ภาษา (中文-only?), audience, tier | `campaign.targeting_jsonb` |
| 7. Fund | prefund budget ผ่าน PromptPay/transfer → escrow | ledger `CAMPAIGN_FUND` |

```sql
campaign(
  id, sponsor_id, city_id, kind,
  title_i18n_jsonb,            -- TH/EN/中文
  reward_pool_minor,           -- งบ Coins ที่ prefund
  platform_fee_bps,            -- ค่าบริหาร campaign (เช่น 2000 = 20%)
  geofence geometry(Polygon,4326),
  starts_at, ends_at,
  status,                      -- 'draft'|'funded'|'live'|'paused'|'completed'
  budget_account_id, created_at
)

campaign_quest(campaign_id, quest_id)          -- ถ้า kind=quest
campaign_place(campaign_id, place_id, role)    -- 'step'|'redeem_point'
```

#### 9.3.3 Budget / escrow (เหมือนกฎ merchant escrow)

- Sponsor **prefund งบเป็น baht** → ledger: **DR `PSP_SUSPENSE` / CR `SPONSOR_BUDGET`**
- แพลตฟอร์มหัก **platform_fee** (เช่น 20% ของงบ หรือ flat campaign fee) เป็น revenue ทันทีตอน fund:
  ```
  DR SPONSOR_BUDGET (fee portion) / CR PLATFORM_REVENUE (campaign)
  ```
- ส่วนที่เหลือ mint เป็น Coins สำหรับแจกเมื่อมี completion
- **Zero-balance auto-pause** เหมือน quest ปกติ: งบหมด → campaign pause
- งบเหลือปลาย campaign → คืน sponsor หรือ roll เป็น credit (ตามสัญญา)

#### 9.3.4 Festival Passports (seasonal upside)

ผลิตภัณฑ์ขายช่วงพีค **Yi Peng / Loy Krathong (พ.ย.)** และ **Songkran (เม.ย.)**:

- **Yi Peng Passport:** Quest ข้ามร้าน + วัด (Wat Phra Singh, Wat Chedi Luang) + จุดลอยกระทง + Sunday Walking Street → สะสมครบรับ badge + Coins จาก sponsor (เช่น ธนาคารหรือห้าง)
- **Songkran Water Route:** trail รอบคูเมือง + ร้านริมถนนช้างคลาน
- ขายเป็น **title sponsorship** (เช่น "Yi Peng Passport presented by [Bank]") + co-fund reward pool
- ใช้ดึง **foreign tourist + 中文 FIT** ช่วงพีค = inventory ที่ขายแพงได้ (จองล่วงหน้า 2–3 เดือน)

#### 9.3.5 Completion analytics & foot-traffic heatmaps (สินค้าที่ขายต่อ)

ทุก campaign สร้าง dataset ที่ขายกลับเป็น report (PDPA-compliant, aggregated):

```sql
campaign_metric(
  campaign_id, day,
  starts_count, step_completions, full_completions,
  unique_users, redemptions, coins_burned_minor,
  lang_breakdown_jsonb,        -- {th: .., en: .., zh: ..}
  district, peak_hour_jsonb
)
```

- **Heatmap:** density ของ verified check-in ใน geofence (aggregate, k-anonymity ≥ k threshold ก่อนแสดง) — ขายให้ห้าง/roaster/bank ดูว่า campaign ดึงคนเข้าโซนไหน
- **Conversion funnel:** เห็น start → step → full completion → redemption
- ขาย **post-campaign report** เป็น add-on (เช่น ฿15,000–50,000/report) หรือรวมใน package

#### 9.3.6 Data/permissions

- Sponsor เห็นได้แค่ **aggregate** ของ campaign ตัวเอง — **ไม่เห็น user-level, ไม่เห็น movement graph** (PDPA: เก็บ redemption fact ไม่ใช่เส้นทาง)
- Geofence + check-in dwell ใช้ lawful basis = consent (location) ที่เก็บตอน onboarding
- ทุก dataset ผ่าน DPO sign-off + k-anonymity ก่อน export

**Unit economics 9.3:** ดีลใหญ่สุด, lumpy. Campaign ทั่วไป ฿30k–150k งบ + 20% platform fee = ฿6k–30k revenue/campaign. Festival title sponsorship ฿200k–1M+. Margin สูงมาก (เป็น software + workforce ที่มีอยู่แล้ว). คานงัด seasonality: ขาย festival ชดเชย low season

---

### 9.4 เสาที่ 4 — Data Products + Booking Affiliate

แยกเป็น 2 sub-modules ที่ใช้ data ร่วมกัน

#### 9.4a — Anonymized Data Products

**Buyer:** ห้าง/เจ้าของอสังหา (เลือกทำเลใน Nimman/Santitham), **TAT** (วางนโยบายท่องเที่ยว), F&B chains (หาทำเลสาขาใหม่), ธนาคาร/telco (insight ลูกค้า)

**สินค้า:** report/dashboard subscription ระดับ **district / grid cell** ไม่ใช่ระดับบุคคล:

| Product | เนื้อหา | ราคา (ตัวอย่าง) |
|---------|---------|-----------------|
| District Footfall Index | จำนวน verified visit ต่อโซน/ชั่วโมง/วัน, trend | ฿9,900/เดือน/เมือง |
| Visitor Mix Report | สัดส่วนภาษา (TH/EN/中文), local-vs-tourist, tier | ฿15,000/quarter |
| Category Heat | eat vs see vs do demand ต่อ district + seasonality | custom |
| Site-Selection Pack | สำหรับ F&B หาทำเล: footfall + competitor density (PostGIS) | ฿50,000+/one-off |
| TAT Tourism Brief | สรุประดับจังหวัด/เทศกาล (Yi Peng, Songkran impact) | สัญญารายปี |

```sql
-- materialized view, aggregate เท่านั้น, ผ่าน k-anonymity gate
mv_district_footfall(
  city_id, district, grid_cell_h3,   -- ใช้ H3/geohash ไม่ใช่ raw GPS
  bucket_hour, visit_count,
  lang_mix_jsonb, category_mix_jsonb,
  k_anon_ok_bool                     -- false -> ถูก suppress ก่อน export
)
```

**PDPA guardrails (บังคับ):**
- เก็บ **redemption/visit FACT** + aggregate ลง H3 cell — **ไม่เก็บ per-user movement graph**
- k-anonymity threshold (เช่น k ≥ 25): cell ที่คนน้อยถูก suppress
- lawful basis = legitimate interest (aggregate) + consent (location collection)
- DPO เป็น gate ก่อนทุก data product ออก; audit log ทุก export; ไม่มี PII, ไม่มี device id ในสินค้า
- สัญญา data ระบุห้าม re-identify

#### 9.4b — Booking Affiliate (Klook / TakeMeTour)

**Buyer (รายได้มาจาก):** OTA partner — แพลตฟอร์มได้ **affiliate commission ~15–25%** ของ activity ที่ booked ผ่าน deep-link/API

**กลไก:**
- กิจกรรมแบบ ticketed ในหมวด **"DO"** (เช่น คอร์สทำอาหาร, elephant sanctuary จริยธรรม, zipline, Doi Inthanon tour, cooking class) ที่แพลตฟอร์มไม่ได้ขายเอง → ฝัง affiliate booking
- Place ที่เป็น activity venue มีปุ่ม **"จองผ่าน Klook/TakeMeTour"** พร้อม affiliate tag
- Track ผ่าน deep-link click → partner postback (booked + amount) → คำนวณ commission

```sql
affiliate_partner(id, name, commission_bps_min, commission_bps_max, payout_terms)

affiliate_link(
  id, place_id, partner_id, city_id,
  deep_link_url, sub_id,           -- attribution tag ของเรา
  active
)

affiliate_event(
  id, affiliate_link_id, place_id, partner_id,
  event_type,                      -- 'click'|'booked'|'completed'|'canceled'
  booking_ref, gross_amount_minor,
  commission_bps, commission_minor,
  status,                          -- 'pending'|'confirmed'|'paid'|'reversed'
  occurred_at
)
```

**Settlement:** partner ส่ง postback/รายงานรายเดือน → reconcile กับ `affiliate_event` → เมื่อ confirmed: **CR `PLATFORM_REVENUE` (affiliate)** (เงินเข้าจาก partner suspense). รองรับ reversal (ลูกค้ายกเลิกทัวร์)

**สำคัญด้าน gamification:** การ booking ผ่าน affiliate **ให้ Sparks** (soft XP) ได้ เพื่อกระตุ้น engagement — แต่ **ห้ามให้ Coins** (Coins backed ด้วย escrow เท่านั้น). นี่เลี่ยงปัญหาว่าแพลตฟอร์มต้องสำรองเงิน

**Unit economics 9.4:**
- Data products: near-zero marginal cost (เป็น query บน data ที่มีอยู่), margin ~95%, แต่ sales cycle ยาว (enterprise/TAT)
- Affiliate: ถ้า booking เฉลี่ย ฿1,200, commission 20% = ฿240/booking, ต้นทุน ~0. เป็น revenue ที่ไม่ต้องมี inventory เอง — pure margin. Volume ขึ้นกับ DAU ของ tourist segment

---

### 9.5 Blended Revenue View ต่อ Merchant (ภาพรวมยึดโยง)

ตัวอย่างร้านคาเฟ่ Nimman บน **Growth plan** ที่ active กลาง-สูง ใน 1 เดือน:

| ที่มา | เสา | คำนวณ | รายได้ให้แพลตฟอร์ม/เดือน |
|-------|-----|-------|--------------------------|
| Subscription | 9.1 | Growth flat | ฿990 |
| Redemption take-rate | 9.2 | 300 redeem × ฿8 fee เฉลี่ย | ฿2,400 |
| ร่วม sponsored quest | 9.3 | ส่วนแบ่ง campaign fee (เฉลี่ยต่อร้าน) | ฿600 |
| Affiliate (ถ้ามี activity ผูก) | 9.4b | 10 booking × ฿240 | ฿2,400* |
| **รวมต่อร้าน (มี activity)** | | | **~฿6,390** |
| **รวมต่อร้านคาเฟ่ทั่วไป (ไม่มี activity)** | | | **~฿3,990** |

\* affiliate มักมาจาก Place หมวด "DO" มากกว่าคาเฟ่ — ตัวเลขนี้คือ blend ระดับ portfolio

**ข้อสังเกตเชิงโครงสร้าง:**
- **Subscription (9.1)** = ฐานรายได้คาดเดาได้ → กลบต้นทุน Field Agent moat แม้ low season
- **Redemption (9.2)** = แปรผันตาม engagement → เติบโตเองเมื่อ network effect ของ Quest ทำงาน
- **Sponsored/Festival (9.3)** = upside ก้อนใหญ่ตามฤดูกาล → ชดเชย seasonality
- **Data + Affiliate (9.4)** = high-margin, ไม่ต้องมี inventory → scale ตาม DAU โดยไม่เพิ่มต้นทุนแปรผัน

ทั้ง 4 เสาเดินบน **escrow + double-entry ledger เดียวกัน** → Finance/Payout + Analyst roll-up รายได้ per pillar / per city / per merchant ได้จาก source of truth เดียว, รองรับ multi-city ตั้งแต่ migration #1

---

## 10. Technical Architecture & Security/PDPA

> **🔧 อัปเดต stack (authoritative = [doc 05](05_stack_decision.md)):** ส่วนนี้เดิมบรรยาย backend เป็น **Supabase Edge Functions (Deno)** ล้วน — **ถูก superseded แล้ว**. คำตัดสิน stack (judge panel) เลือก **C2 — Hybrid TypeScript**: ตรรกะเงินย้ายไปอยู่ใน **NestJS money-plane (TypeScript) + worker** ส่วน **Supabase ใช้เป็น data-plane** (Postgres + Auth + Storage + Realtime + RLS-read). ที่ใดส่วนนี้เขียน "Edge Function" ให้อ่านเป็น **NestJS endpoint**. **สิ่งที่ไม่เปลี่ยน:** PostgreSQL + PostGIS, plpgsql gate+post functions, DB invariants, RLS (read-authz), JWT scope-claims, ledger schema — ทั้งหมดใช้ต่อ. เพิ่ม: DB role `money_writer` (ผู้เขียน ledger รายเดียว), session-mode connection pool สำหรับ money txn, worker สำหรับ recon/payout/expire/tax. เส้นทาง scale P0→P3 (รวมการ extract money-plane เป็น .NET/Go ภายหลังโดยไม่แตะ ledger) อยู่ใน doc 05.
>
> เป้าหมายของส่วนนี้: ออกแบบ stack และ architecture ที่ "พอดีกับทีมเล็ก" (founding team 3-6 คน) แต่ scale ได้ broad ตั้งแต่วันแรก — multi-tenant, multi-city, trilingual, escrow-backed loyalty, และ field-agent moderation pipeline — โดยมี **anti-fraud** และ **PDPA** เป็น first-class concern ไม่ใช่ของแถม ทุกอย่างเลือกแบบ pragmatic: ใช้ managed service ให้มากที่สุด เขียน custom code เฉพาะจุดที่เป็น "หัวใจ" (ledger, check-in, geofence, moderation)

### 10.1 หลักการออกแบบ (Design Principles)

| หลักการ | ความหมายในทางปฏิบัติ |
|---|---|
| **Server-authoritative ทุกอย่างที่มีมูลค่า** | Coins, Sparks, check-in trust, redemption — client **เสนอ** ได้ แต่ server **ตัดสิน** เสมอ ไม่มี business logic ที่เชื่อถือได้ฝั่ง client |
| **Append-only สำหรับเงินและ trust** | Loyalty = double-entry ledger (10.4) ไม่มี `points INT` ที่ update ได้ ทุก mutation คือ row ใหม่ |
| **Propose -> Moderate -> Apply** | Field Agent / Merchant ไม่เคยเขียน live data ตรง ทุกการแก้คือ `change_proposal` ที่เข้าคิว moderation (เชื่อม section Field Agent) |
| **Multi-tenant by default** | `merchant_id` + `city_id` อยู่ในทุกตารางที่เกี่ยวข้องตั้งแต่ migration #1 บังคับ isolation ด้วย RLS ไม่ใช่ด้วย application code |
| **Buy > Build เว้นแต่เป็น moat** | Auth, payment, map tiles, push, email/OTP, object storage = ซื้อ/ใช้ managed ส่วน ledger, check-in, geofence, moderation, agent ops = build เอง |
| **PDPA by design** | เก็บ "ข้อเท็จจริงของการ redeem" ไม่เก็บ "กราฟการเดินทาง" ของผู้ใช้; raw GPS ของ agent มีอายุสั้นและถูก purge หลัง reconcile |
| **ทำให้ migrate ออกได้** | logic หลักอยู่ใน Postgres + SQL/Edge Functions ที่ portable ไม่ผูกกับ proprietary feature ของ Supabase เกินจำเป็น (กันวันที่ต้องย้ายไป self-hosted Postgres) |

### 10.2 Component Diagram (text)

```
                        ┌─────────────────────────────────────────────┐
        CLIENTS         │                  EDGE / API                  │         EXTERNAL
                        └─────────────────────────────────────────────┘
 ┌──────────────────┐
 │ Flutter App      │      ┌──────────────────────────────────────┐
 │  (iOS / Android) │      │  Supabase Edge (Deno) Functions      │      ┌────────────────────┐
 │                  │      │  — server-authoritative logic —      │      │ Thai PSP           │
 │ ┌──────────────┐ │      │                                      │◄────►│ (Omise/2C2P/Fiuu)  │
 │ │ Consumer Mode│ │─────►│  fn: checkin        (geofence+trust) │      │ PromptPay QR/charge│
 │ │ eat/see/do,  │ │ HTTPS│  fn: redeem         (burn Coins)     │      └────────────────────┘
 │ │ Passport,    │ │ +JWT │  fn: escrow_topup   (mint Coins)     │      ┌────────────────────┐
 │ │ Quests, map  │ │      │  fn: proposal_apply (moderation)     │◄────►│ Alipay+ / WeChat   │
 │ └──────────────┘ │      │  fn: payout         (Finance)        │      │ Pay acquiring      │
 │ ┌──────────────┐ │      │  fn: media_finalize (hash/EXIF)      │      │ (via PSP/Antom)    │
 │ │ Agent Mode   │ │      │  fn: translate_sync (i18n)           │      └────────────────────┘
 │ │ (role-gated) │ │      │  fn: purge_jobs     (PDPA retention) │      ┌────────────────────┐
 │ │ Task list,   │ │      └───────────────┬──────────────────────┘      │ LINE Messaging API │
 │ │ capture,     │ │                      │                             │ + LINE Login (LIFF)│◄─┐
 │ │ propose edit │ │                      ▼                             └────────────────────┘  │
 │ └──────────────┘ │      ┌──────────────────────────────────────┐      ┌────────────────────┐  │
 └──────────────────┘      │  Supabase Postgres  (single DB)      │      │ Mapbox (tiles/SDK) │  │
                           │  + PostGIS  (geofence, ST_DWithin)   │      │ display + nav      │  │
 ┌──────────────────┐ HTTPS│  + RLS  (merchant_id/city_id/terr.)  │      └────────────────────┘  │
 │ Next.js + Refine │─────►│  + pgcrypto / pgsodium (col. encrypt)│      ┌────────────────────┐  │
 │ Web Console      │ +JWT │  + pg_cron (retention/leaderboard)   │      │ Google Places API  │  │
 │  • Owner/Admin   │      │  + audit schema (append-only)        │      │ SEEDING ONLY (ETL) │  │
 │  • Merchant      │      └───────────────┬──────────────────────┘      └────────────────────┘  │
 │  • Moderator     │                      │                             ┌────────────────────┐  │
 │  • City Manager  │      ┌───────────────▼──────────────────────┐      │ Push: FCM + APNs   │  │
 │  • Finance/DPO   │      │ Supabase Storage (S3-compat)         │      └────────────────────┘  │
 │  • Sponsor       │◄────►│  media/ (photos), kyc/ (private)     │      ┌────────────────────┐  │
 └──────────────────┘      │  + image CDN / transform             │      │ Auth providers:    │──┘
                           └──────────────────────────────────────┘      │ LINE / Apple/Google│
                                          │                              └────────────────────┘
                           ┌──────────────▼───────────────────────┐
                           │ Analytics & Observability            │
                           │  PostHog (product) + Sentry (errors) │
                           │  + nightly export → warehouse (DuckDB/│
                           │    BigQuery) for data products        │
                           └──────────────────────────────────────┘
```

**ผู้รับผิดชอบของแต่ละ client:**

- **Flutter app** = ผู้ใช้ปลายทางทั้งหมด — Consumer mode (นักท่องเที่ยว/locals/nomads) และ Agent mode (เปิดด้วย role claim ใน JWT เท่านั้น ไม่ใช่คนละแอป) Agent mode reuse แผนที่/กล้อง/auth เดิม แต่เพิ่ม Task list + capture + propose-edit UI
- **Next.js 14 (App Router) + Refine** = ทุก back-office persona ที่ทำงานบนจอใหญ่ — Platform Owner/Admin, Merchant dashboard (escrow top-up, quest config, redemption report), Content Moderator queue, City/Regional Manager, Finance/Payout, DPO console, Brand/Sponsor campaign builder Refine ให้ CRUD/auth/i18n scaffolding ฟรี ลดเวลาทำ admin มหาศาล
- **Supabase Edge Functions** = ที่อยู่ของ logic ที่ห้าม client ตัดสินใจ — `checkin`, `redeem`, `escrow_topup`, `proposal_apply`, `payout`, `media_finalize` ทุกตัว validate JWT, ตรวจ RLS context, แล้วทำงานใน DB transaction
- **Postgres** = single source of truth ทั้ง relational + geo + ledger + audit ไม่แยก microservices ในเฟสแรก (ทีมเล็ก แยก service = หนี้ทาง ops)

### 10.3 Multi-tenant + Multi-city Isolation (RLS)

**โมเดล:** single database, **shared schema, row-level isolation** — ไม่ใช้ schema-per-tenant หรือ db-per-tenant (มี merchant หลายพันราย การแยก schema = ฝันร้ายของ migration) Isolation บังคับด้วย **Postgres RLS** ที่อ่าน claims จาก JWT ไม่ใช่จาก WHERE clause ในแอป (กัน dev ลืม)

**Keys ที่อยู่ในทุกตารางตั้งแต่ migration #1:**

```
city_id      uuid  NOT NULL   -- เชียงใหม่ = seed แรก, ขยายเมืองอื่นได้
merchant_id  uuid             -- NULL ได้สำหรับ data ที่ไม่ผูก merchant
territory_id uuid             -- สำหรับ scoping งาน Field Agent
```

**JWT custom claims** (set ตอน login ผ่าน Supabase Auth Hook / custom access token):

```jsonc
{
  "sub": "user-uuid",
  "role": "merchant",              // customer|merchant|agent|moderator|city_manager|admin|finance|dpo|...
  "city_ids": ["cm-uuid"],         // เมืองที่ user เข้าถึงได้ (city manager มีได้หลายเมือง)
  "merchant_ids": ["m-123"],       // merchant ที่ user เป็นเจ้าของ/พนักงาน
  "territory_ids": ["terr-nimman"] // เฉพาะ agent
}
```

> ใช้ helper `auth.jwt() -> 'role'` และ `(auth.jwt() -> 'merchant_ids')` ใน policy ห้ามอ่าน role จาก table อื่นแบบ recursive (ทำให้ RLS ช้าและ deadlock-prone) — เก็บใน JWT, refresh เมื่อ role เปลี่ยน

**ตัวอย่าง RLS policy (pseudocode SQL):**

```sql
-- ทุกตารางเปิด RLS
ALTER TABLE place ENABLE ROW LEVEL SECURITY;

-- helper: ดึง array จาก claim ได้สะดวก
CREATE FUNCTION auth.has_merchant(m uuid) RETURNS boolean AS $$
  SELECT (auth.jwt() -> 'merchant_ids') ? m::text;
$$ LANGUAGE sql STABLE;

CREATE FUNCTION auth.has_city(c uuid) RETURNS boolean AS $$
  SELECT (auth.jwt() -> 'city_ids') ? c::text
      OR (auth.jwt() ->> 'role') = 'admin';   -- admin ข้ามได้
$$ LANGUAGE sql STABLE;

-- 1) Consumer อ่าน Place ที่ published ในเมืองใดก็ได้ (public discovery)
CREATE POLICY place_read_public ON place FOR SELECT
  USING (status = 'published');

-- 2) Merchant แก้ได้เฉพาะ Place ของตัวเอง (และยังต้องผ่าน proposal flow สำหรับ field สำคัญ)
CREATE POLICY place_write_owner ON place FOR UPDATE
  USING (auth.has_merchant(merchant_id))
  WITH CHECK (auth.has_merchant(merchant_id));

-- 3) City Manager เห็น/จัดการทุก Place ในเมืองที่ตัวเองดูแล
CREATE POLICY place_city_manager ON place FOR ALL
  USING (
    (auth.jwt() ->> 'role') = 'city_manager'
    AND auth.has_city(city_id)
  );

-- 4) Field Agent: เห็นเฉพาะ Place ใน Territory ของตัวเอง, แต่แก้ไม่ได้ตรง — เขียนได้แค่ change_proposal
CREATE POLICY place_agent_read ON place FOR SELECT
  USING (
    (auth.jwt() ->> 'role') = 'field_agent'
    AND territory_id = ANY (
      SELECT (jsonb_array_elements_text(auth.jwt() -> 'territory_ids'))::uuid
    )
  );
-- (ไม่มี INSERT/UPDATE/DELETE policy ให้ agent บน table place เลย -> agent เขียนตรงไม่ได้โดยปริยาย)

-- change_proposal: agent เขียน proposal ของตัวเองได้, moderator อ่าน/อนุมัติได้
CREATE POLICY proposal_agent_insert ON change_proposal FOR INSERT
  WITH CHECK ( author_id = auth.uid() );
CREATE POLICY proposal_moderator ON change_proposal FOR ALL
  USING ( (auth.jwt() ->> 'role') IN ('moderator','city_manager','admin') );
```

**กฎเหล็ก:**
1. RLS เปิดทุกตารางที่มีข้อมูล user/merchant/financial **default deny** ตารางไหนไม่มี policy = อ่านไม่ได้
2. Edge Functions ที่ต้อง bypass RLS (เช่น ledger posting) ใช้ `service_role` key **เฉพาะใน Edge Function ที่ตรวจสิทธิ์เองแล้ว** ไม่เคยส่ง service_role ไปฝั่ง client
3. การ write live data (ledger, escrow, redemption) ห้ามทำผ่าน PostgREST ตรงจาก client — ต้องผ่าน Edge Function เท่านั้น (client มี policy แค่ SELECT/insert-proposal)

### 10.4 Loyalty Ledger & Check-in (หัวใจ + เหตุผลที่ไม่ใช้ points integer)

#### ทำไม **ห้าม** ใช้ `users.points INT`
- **เงินจริงอยู่หลัง Coins** (merchant prefund escrow เป็นบาท) ถ้า points เป็น integer ที่ update ได้ -> race condition / double-spend / ยอดเพี้ยนแล้ว reconcile กับเงินบาทไม่ได้ -> ปัญหากฎหมาย/บัญชี
- **ต้อง audit ได้ทุกสตางค์** — ทุก Coin ที่ mint ต้อง trace กลับไปยัง escrow top-up ที่ระบุได้ และทุก Coin ที่ burn ต้อง trace ไปยัง redemption ที่ Place ใด เวลาใด
- Append-only ledger ให้ **idempotency + concurrency + audit** ฟรีในตัว

#### โครงสร้าง ledger (double-entry, append-only)

```
account
  id, owner_type (merchant_escrow | user_coins | user_sparks | clearing | revenue | expiry_sink),
  owner_id, currency (COIN | SPARK), city_id, created_at

ledger_entry            -- append-only, ห้าม UPDATE/DELETE (revoke ผ่าน RLS + trigger)
  id            bigserial,
  txn_id        uuid,            -- หนึ่ง business event = หนึ่ง txn_id (กลุ่มของ entries)
  account_id    uuid,
  direction     char,           -- 'D' debit | 'C' credit
  amount        bigint,         -- เก็บเป็นหน่วยย่อย (สตางค์/coin-unit) เป็น integer เสมอ ไม่ใช่ float
  currency      text,           -- COIN | SPARK
  ref_type      text,           -- escrow_topup | checkin | quest_reward | redemption | expiry | payout
  ref_id        uuid,
  idempotency_key text UNIQUE,  -- กัน replay (กดซ้ำ/retry network)
  created_at    timestamptz default now()

-- invariant ที่ต้องเป็นจริงเสมอ: ในแต่ละ txn_id, SUM(debit) == SUM(credit) ต่อ currency
```

**ตัวอย่าง flow ของหนึ่ง redemption (free coffee ที่ Cafe B):**

```
txn_id = T1, ref_type = redemption
  D  user_coins(user)        80   COIN     -- ผู้ใช้ถูกหัก 80 coin
  C  clearing                80   COIN     -- เข้า clearing
และคู่บาทที่ settle กับ merchant (take-rate 10-15%):
  D  merchant_escrow(B)      80  บาท-coin  -- หักจาก escrow ของ Cafe B
  C  revenue(platform)       12  (15%)     -- take-rate เข้า platform
  C  clearing                68            -- ส่วนที่เป็นต้นทุนรางวัลของ merchant
```

#### Check-in: server-authoritative geofence + tiered trust

ทำใน **Edge Function `checkin`** ครอบด้วย Postgres transaction เดียว:

```
fn checkin(place_id, client_nonce, device_attestation):
  1. ตรวจ JWT, rate-limit ต่อ user + ต่อ device (per-minute / per-day cap)
  2. ดึงพิกัด place จาก DB (ไม่เชื่อพิกัดที่ client ส่ง)
  3. server-side geofence:
       SELECT ST_DWithin(place.geog, request_point.geog, place.radius_m)  -- PostGIS
     ถ้า client ส่ง GPS มา ตรวจ accuracy + ไม่เชื่อ raw GPS เดี่ยว ๆ
  4. impossible-travel check:
       last_checkin = (เวลา + พิกัดล่าสุดของ user)
       ถ้า ความเร็วที่ต้องใช้ > threshold (เช่น 200 km/h) -> flag เป็น fraud
  5. dwell check (ถ้าเป็น quest step ที่ต้องการ): ต้องมี ping ในรัศมีเกิน N นาที
  6. trust tier:
       GPS dwell        -> Spark เท่านั้น (soft)
       verified visit   -> Spark + เครดิต quest step
       proven purchase  -> ปลดล็อก Coin reward (ต้องคู่กับ merchant-initiated redeem/receipt)
  7. INSERT ledger_entry(Spark) ด้วย idempotency_key = hash(user, place, time-bucket, nonce)
     - ใช้ INSERT ... ON CONFLICT (idempotency_key) DO NOTHING
     - SELECT ... FOR UPDATE บน account row ถ้าต้องอ่าน-แล้ว-เขียน (กัน race)
  8. คืน trust tier + Sparks ที่ได้ (Coins ไม่เคยออกจาก check-in ลำพัง)
```

**Redemption ต้อง merchant-initiated เสมอ:** ผู้ใช้ไม่มี static QR; merchant กดสร้าง redemption session -> server สร้าง **rotating QR/OTP** ที่ time-boxed (เช่น 60-90 วิ) -> ผู้ใช้สแกน -> Edge Function `redeem` ตรวจ geofence + ตรวจว่า session ยังไม่หมดอายุ + burn Coins server-side ใน transaction เดียวกับการหัก escrow ห้ามมี code path ที่ burn coin จากฝั่ง client

**Concurrency model:** ใช้ `SELECT ... FOR UPDATE` บน account ที่จะถูกหัก + `idempotency_key UNIQUE` เป็น second line of defense Edge Function ห้าม commit บางส่วน — ถ้า escrow ไม่พอ (zero-balance) ให้ transaction rollback และ **auto-pause quest** (set quest.status = 'paused_no_funds') ในธุรกรรมเดียวกัน

### 10.5 Media Pipeline

ใช้กับรูปจาก Field Agent (capture หน้าร้าน/เมนู), Merchant (รูป Place), และ Customer (รูปรีวิว)

```
[Flutter camera capture]
   │  - บังคับถ่ายสด (in-app camera) สำหรับ agent task ที่ต้องพิสูจน์ตัวตนสถานที่
   │  - แนบ capture_timestamp + (optional) coarse geo + task_id
   ▼
[Client pre-check]
   │  - strip EXIF GPS ออกก่อน upload (privacy) แต่เก็บ orientation
   │  - resize ฝั่ง client เพื่อลด bandwidth
   ▼
[Direct upload -> Supabase Storage (signed URL)]   media/{city}/{merchant}/{uuid}
   ▼
[Edge Function media_finalize]  (trigger หลัง upload)
   │  1. EXIF check ฝั่ง server: ตรวจ make/model, ตรวจว่าไม่ใช่ screenshot/รูปดาวน์โหลด
   │  2. perceptual hash (pHash/dHash) -> เทียบกับ hash store
   │       - กัน agent ส่งรูปเดิมซ้ำหลาย task (fraud)
   │       - กันรูปซ้ำข้าม merchant
   │  3. NSFW / quality gate (เรียก moderation API หรือ on-device model)
   │  4. สร้าง responsive variants (thumb/feed/full) ผ่าน Supabase image transform
   │  5. insert media row (status=pending_review ถ้ามาจาก proposal)
   ▼
[CDN edge cache]  เสิร์ฟผ่าน Supabase/CDN, รูปที่ approved เท่านั้นเป็น public
```

- **pHash store** เป็นตารางง่าย ๆ `media_hash(hash bigint, media_id, merchant_id)` query ด้วย Hamming distance (BK-tree หรือ `pg` extension) — เป็นเครื่องมือ anti-fraud ของ agent workforce
- KYC images (บัตร agent, เอกสาร merchant) แยกไป bucket `kyc/` **private เสมอ** เข้าถึงผ่าน signed URL อายุสั้น + RLS ระดับ object เท่านั้น

### 10.6 i18n / Translation Pipeline (TH / EN / 简体中文)

**สอง layer:** (1) static UI strings (2) user/merchant content

```
1) STATIC UI (ปุ่ม/label/error)
   - ARB files ใน Flutter (gen-l10n), JSON/i18next ใน Next.js
   - source-of-truth = English keys; แปล TH + zh-Hans
   - workflow: dev เพิ่ม key -> export -> แปล (มืออาชีพ/agency) -> re-import -> review

2) DYNAMIC CONTENT (ชื่อ Place, คำอธิบาย, Quest, รีวิว)
   - เก็บแบบ translatable column:
       place_i18n(place_id, lang, name, description, source 'human'|'machine', status)
   - default content จาก merchant/agent = ภาษาไทย
   - Edge Function translate_sync:
       * เรียก machine translation (Google/DeepL) สร้าง draft EN + zh-Hans
       * mark source='machine', status='auto'
       * human (moderator/agent ที่ภาษานั้น) review -> status='verified'
   - แสดงผล: เลือกตาม Accept-Language / user locale, fallback chain: user-lang -> EN -> TH
```

- ชื่อสถานที่เชียงใหม่มีปัญหา transliteration (เช่น Nimmanhaemin / Nimman / นิมมานเหมินท์) -> เก็บ canonical + aliases ต่อภาษา ใช้ใน search index
- Chinese FIT users: ต้อง zh-Hans จริง ไม่ใช่ EN ผ่าน MT คุณภาพต่ำ — Place ยอดนิยม (One Nimman, Maya, Wat Phra Singh, Sunday Walking Street) ควร human-verified zh ก่อน launch
- รีวิว user: แปลแบบ on-demand (machine) แสดง "แปลโดยระบบ" ไม่ persist เป็น verified

### 10.7 Security & PDPA Architecture

#### (a) Lawful-basis map ต่อ dataset

| Dataset | Lawful basis (PDPA ม.24/26) | หมายเหตุการเก็บ |
|---|---|---|
| Account (ชื่อ, email/LINE id) | สัญญา (ให้บริการ) | จำเป็นต่อการใช้งาน |
| Precise location (check-in/dwell) | **ความยินยอม (explicit consent)** | consent แยกชัด, ถอนได้, เก็บ **fact** ไม่เก็บ trail |
| Field Agent raw GPS track | สัญญาจ้าง + legitimate interest (กันโกง) | **purge หลัง reconcile** (10.7c) |
| Redemption records | สัญญา + บัญชี/ภาษี | เก็บ "redeem ที่ Place X เวลา Y จำนวน Z coin" |
| KYC (agent/merchant payout) | หน้าที่ตามกฎหมาย (AML/ภาษี) | เข้ารหัส, access จำกัด Finance/DPO |
| Payment tokens | สัญญา; PCI handled โดย PSP | เราเก็บแค่ token/last4 ไม่เก็บ PAN |
| Reviews / UGC | สัญญา + legitimate interest | moderation |
| Analytics / data product | **legitimate interest + anonymization** | aggregate/k-anonymity เท่านั้นเมื่อขาย |
| Marketing push | ความยินยอม (opt-in) | แยก consent |

#### (b) Consent management
- ตาราง `consent(user_id, purpose, version, granted_at, withdrawn_at, source)` — append-only, เก็บ **version ของ policy** ที่ user ยอมรับ
- Granular toggles: location, marketing, data-sharing แยกกัน
- **Location consent gate:** ถ้าไม่ยินยอม -> check-in ใช้ได้แบบ manual/limited, ระบบไม่ขอ precise GPS
- ถอนยินยอมได้ทุกเมื่อ -> trigger งาน purge ของ dataset ที่อิง consent นั้น

#### (c) Retention & purge jobs (`pg_cron` + Edge `purge_jobs`)

```
- raw_agent_gps:       เก็บ <= 7-14 วัน, purge หลัง reconcile task เสร็จ
                       (เหลือแค่ผลสรุป: task ผ่าน/ไม่ผ่าน geofence — boolean + place_id)
- checkin_location:    ไม่เก็บ "เส้นทาง" ของ user; เก็บแค่ (user, place, time, trust_tier)
                       พิกัดดิบที่ใช้ตอน validate -> ทิ้งทันทีหลังตัดสิน trust
- redemption:          เก็บตามอายุบัญชี/ภาษี (เช่น 5-10 ปีตามที่กฎหมายภาษีไทยกำหนด)
- inactive account:    anonymize หลัง N ปีไม่ใช้งาน (hash PII, คง ledger แบบ pseudonymous)
- audit_log:           เก็บยาว (immutable), แต่ field ที่เป็น PII ถูก minimize
```

> หลักสำคัญ: **เราออกแบบให้ "เป็นไปไม่ได้" ที่จะสร้าง movement graph ของผู้ใช้** เพราะเราไม่เคย persist sequence ของพิกัด — เก็บแค่ "check-in fact" ที่ Place แต่ละจุด นี่คือทั้ง privacy posture และจุดขายของ data product (เราขาย aggregate, ไม่ใช่รอยเดินของคน)

#### (d) Encryption at rest
- Database: encryption at rest ระดับ disk (Supabase/cloud provider) เป็น baseline
- Column-level สำหรับ sensitive: location precise (ถ้าต้อง buffer ชั่วคราว), KYC fields, payout bank info -> `pgsodium`/`pgcrypto` (authenticated encryption), key อยู่ใน Supabase Vault/KMS ไม่อยู่ใน table
- KYC media bucket: server-side encryption + private + signed URL อายุสั้น

#### (e) Audit log
- Schema `audit.event(id, actor_id, actor_role, action, entity_type, entity_id, before, after, ip, ua, at)` — **append-only** (revoke UPDATE/DELETE, แม้แต่ service_role; เปิด `ON DELETE`/`ON UPDATE` trigger ที่ raise exception)
- ทุก privileged action (approve proposal, mint/burn coin, payout, role change, data export, consent change) ต้องเขียน audit
- Owner/Admin/Finance actions log แยก stream ที่ DPO review ได้

#### (f) DPO workflow & data-subject rights
- DPO console ใน Next.js: ค้น user, ดู consent timeline, ดู datasets ที่ถือไว้
- **DSAR (เข้าถึง/แก้ไข/ลบ/portability):** ปุ่ม "export user data" รวมจากทุก table ที่ key ด้วย user_id; "erase" = anonymize + purge (คง ledger แบบ pseudonymous เพื่อ integrity ทางบัญชี + เก็บเฉพาะที่กฎหมายบังคับ)
- SLA ตอบ DSAR ภายในกรอบ PDPA

#### (g) 72h breach readiness
- Runbook + on-call: detect (Sentry/anomaly) -> contain -> assess scope จาก audit log -> แจ้ง สคส. (PDPC) และ data subjects ภายใน 72 ชม. ตามที่กฎหมายกำหนด
- ตาราง `incident` ติดตามไทม์ไลน์ + affected-records query เตรียมไว้ล่วงหน้า
- ซ้อม tabletop ปีละครั้ง

#### (h) Coins-non-cashable legal posture (Bank of Thailand)
- **Coins ไม่ใช่ e-money:** ไม่สามารถถอนเป็นเงินสด, ไม่โอนระหว่างผู้ใช้, **หมดอายุ** (expiring), แลกได้เฉพาะ reward ที่ merchant กำหนดเท่านั้น — ออกแบบให้พ้นนิยาม e-money ของ ธปท. (กันการต้องขอใบอนุญาต e-money)
- เงินบาทจริงอยู่ใน **escrow ของ merchant** (เป็น prepaid โฆษณา/รางวัล ไม่ใช่เงินฝากของผู้ใช้); platform เป็นตัวกลาง settle take-rate ไม่เคยถือเงินของผู้ใช้
- ledger บังคับ invariant: Coins ที่หมุนเวียน <= ผลรวม escrow ที่ prefund (ไม่มีการ advance เงิน)
- ปรึกษาทนายไทย confirm ก่อน launch (เป็น open question, ดูด้านล่าง)

#### (i) Anti-fraud (สรุป architecture hooks)
- redemption merchant-initiated + rotating QR/OTP + time-boxed + geofenced + burned server-side (ไม่มี static customer QR)
- tiered check-in trust (GPS dwell < verified visit < proven purchase)
- impossible-travel + per-user/device caps + device attestation (Play Integrity / App Attest)
- identity graph: ตาราง `signal(user_id, device_id, ip, payment_fingerprint)` หา multi-account ring; flag เข้า moderation
- ทุก Coin reward ผูกกับ proven-purchase tier; Sparks (free) คุม impact ได้เพราะ never redeemable

### 10.8 Repo / Module Structure (greenfield)

ใช้ **monorepo** (pnpm + melos สำหรับ Flutter) — ทีมเล็ก, share types/i18n/constants ง่าย

```
chiangmai-platform/
├── apps/
│   ├── mobile/                  # Flutter (consumer + agent mode, role-gated)
│   │   ├── lib/features/{discover,passport,quests,checkin,agent,profile}
│   │   ├── lib/core/{auth,api,map,i18n,ledger_client}
│   │   └── l10n/                # ARB: en, th, zh-Hans
│   └── web-console/             # Next.js 14 + Refine
│       ├── app/(owner|merchant|moderator|city|finance|dpo|sponsor)
│       └── resources/           # Refine resource defs per persona
├── supabase/
│   ├── migrations/              # #1 = merchant_id + city_id + RLS baseline
│   ├── functions/               # Edge: checkin, redeem, escrow_topup,
│   │   │                        #       proposal_apply, payout, media_finalize,
│   │   │                        #       translate_sync, purge_jobs
│   ├── policies/                # RLS policies (versioned, ทดสอบแยก)
│   └── seed/                    # ETL: Google Places -> change_proposal (seeding only)
├── packages/
│   ├── shared-types/            # TS types generated จาก DB schema (zod)
│   ├── ledger/                  # double-entry helpers + invariants (SQL + TS)
│   ├── geo/                     # PostGIS helpers, geofence utils
│   ├── i18n-core/               # shared keys/locale logic
│   └── fraud/                   # pHash, impossible-travel, identity-graph rules
├── ops/
│   ├── pg_cron/                 # retention/purge, leaderboard refresh
│   ├── runbooks/                # breach-72h, payout, escrow-zero
│   └── infra/                   # IaC (ถ้าจำเป็น), env, secrets policy
└── docs/                        # design plan นี้ + ADRs
```

- **Migration #1** ต้องมี: `city`, `merchant`, `place`, `account`, `ledger_entry`, `consent`, `audit.event`, baseline RLS + `city_id/merchant_id` ในทุกตารางที่เกี่ยว — ตามคำสั่ง founder
- แยก `policies/` ออกจาก migration เพื่อทดสอบ RLS เป็นชุด (มี test suite รัน query ในบทบาทต่าง ๆ)

### 10.9 Build vs Buy

| Capability | Decision | เหตุผล |
|---|---|---|
| Auth (LINE / Apple / Google) | **Buy** (Supabase Auth + LINE OIDC) | identity เป็น solved problem; LINE Login ผ่าน OIDC/LIFF |
| Postgres + RLS + Edge | **Buy** (Supabase managed) | ทีมเล็ก ไม่ควร run DB ops เอง; portable เพราะเป็น Postgres มาตรฐาน |
| **Loyalty ledger** | **Build** | core moat + ต้อง audit เงินจริง; ไม่มี off-the-shelf ที่เชื่อใจได้ |
| **Check-in / geofence / trust** | **Build** | anti-fraud คือ existential; ต้อง server-authoritative ตาม logic เราเอง |
| **Field-agent moderation pipeline** | **Build** | primary moat; ไม่มีของสำเร็จรูป |
| Map tiles + SDK | **Buy** (Mapbox) | ถูกกว่า Google สำหรับ display ปริมาณมาก |
| Place seeding data | **Buy one-time** (Google Places API ETL) | seed อย่างเดียว -> เข้า change_proposal -> agent verify; ไม่ผูกพันต่อเนื่อง |
| Payment PromptPay | **Buy** (Thai PSP: Omise/2C2P/Fiuu) | PCI + bank rails; ห้าม build เอง |
| Alipay+/WeChat Pay | **Buy** (ผ่าน PSP/Antom acquiring) | cross-border acquiring; Chinese สแกน Thai QR ได้ตั้งแต่ ต.ค. 2025 |
| Push (FCM/APNs) | **Buy** | มาตรฐาน |
| Email/SMS OTP | **Buy** (provider) | commodity |
| Object storage + image CDN | **Buy** (Supabase Storage + transform) | พอสำหรับเฟสแรก; ย้าย S3/Cloudflare ได้ถ้าโต |
| Machine translation | **Buy** (Google/DeepL) + human verify | MT เป็น draft, คนตรวจ key content |
| Product analytics | **Buy** (PostHog) | self-host ได้ถ้าต้องการ data sovereignty |
| Error monitoring | **Buy** (Sentry) | มาตรฐาน |
| Admin/back-office UI | **Buy framework** (Refine) + build resources | scaffolding ฟรี, build เฉพาะ business logic |
| Data warehouse (data product) | **Defer / Build later** | เริ่มด้วย nightly export -> DuckDB/BigQuery เมื่อมีลูกค้า data จริง |
| Fraud/identity graph | **Build** (เริ่ม rule-based) | เริ่มง่าย ๆ ใน Postgres; ซื้อ vendor ภายหลังถ้าจำเป็น |

**สรุป:** ซื้อทุกอย่างที่เป็น commodity, build เฉพาะ 4 อย่างที่เป็น moat — **ledger, check-in/geofence, agent moderation, fraud rules** ทำให้ทีม 3-6 คนโฟกัสถูกจุด และทุก managed service ที่เลือกยัง migrate ออกได้ (Postgres-standard) เมื่อ scale บังคับ

---

## 11. Roadmap, GTM & Org

> **หลักการกำกับทั้ง section นี้ (อ่านก่อน):**
> Founder เลือก **scope กว้าง** (ทั้งเชียงใหม่ / eat+see+do / 3 กลุ่มผู้ใช้ / 4 revenue streams ตั้งแต่วันแรก) แต่ตัวฆ่าอันดับหนึ่งของ local app คือ **"แผนที่ว่าง" (empty map)** และการ **กระจายบาง (spreading thin)**.
> เราแก้ tension นี้ด้วยกฎเดียว: **"Build the SYSTEM broad, SEED the DATA dense."**
> - **ระบบ/architecture** = กว้างตั้งแต่ migration #1 (multi-tenant + multi-city, `merchant_id` + `city_id` ทุกตาราง, ทั้ง 3 หมวด) — เราไม่ build ใหม่ตอนขยาย
> - **ข้อมูลจริงบนพื้น (data seeding)** = **ทีละ district** โดย Field Agent saturate ย่านที่หนาแน่นที่สุดก่อน
> - **สิ่งที่ผู้ใช้เห็น** = "ทั้งเชียงใหม่" เสมอ แต่ **consumer marketing** จะยิงเข้าแต่ละย่าน **ก็ต่อเมื่อย่านนั้นผ่าน Density Gate** (ดูข้อ 11.2) เพื่อให้คนแรกที่เปิดแอปในย่านนั้นเจอแผนที่ที่ "เต็ม"

---

### 11.1 Phased Delivery Roadmap

ภาพรวม 4 phase ใน ~14 เดือน. แต่ละ phase ระบุชัดว่า **subsystem ไหน land เมื่อไร**, **revenue stream ไหนเปิด**, และ **ภาษาไหน turn on**.

| Phase | ช่วงเวลา | ชื่อเรียก | ขอบเขตพื้นที่จริง | Revenue ที่เปิด | ภาษา |
|---|---|---|---|---|---|
| **Phase 0** | เดือน 0–3 (12 สัปดาห์) | **Pre-launch Saturation** | Nimman เท่านั้น (Soi 1–17 + One Nimman + Maya) | (1) Merchant SaaS — sign LOI/free trial | TH + EN (data entry trilingual-ready) |
| **Phase 1** | เดือน 3–6 | **MVP / Soft Launch** | Nimman (live) + Old City (seeding) | (1) SaaS + (2) Redemption take-rate | TH + EN live, **ZH ติด UI แต่ partial data** |
| **Phase 2** | เดือน 6–10 | **V1 / Public Launch** | Nimman + Old City + Santitham + Chang Klan/Night Bazaar | (1)+(2)+(3) Sponsored Quests/Festival | **TH + EN + ZH เต็มทั้งสาม** |
| **Phase 3** | เดือน 10–14+ | **V2 / Scale & Monetize** | +Hai Ya/Wua Lai, +Mae Hia/Hang Dong (suburban), เตรียม city #2 | (1)+(2)+(3)+(4) Data products + Affiliate | Trilingual + เปิด API-partner |

#### Phase 0 — Pre-launch Saturation (เดือน 0–3) — "ยังไม่มี consumer app"
เป้าหมาย: ทำให้ Nimman **มีข้อมูลแน่นพอจะ launch** ก่อนปล่อยให้ผู้ใช้ทั่วไปเห็น.

**Subsystems ที่ build:**
- Core data model: `places`, `merchants`, `city_id`/`merchant_id` keys, PostGIS geofence columns (migration #1 ตามที่ founder กำหนด)
- **Field Agent subsystem (ตัวแรกที่ใช้งานจริง):** Agent mode ใน Flutter (role-gated), Task list, Territory geofence, **Change Proposal flow** (agent ไม่เขียน live data — ทุกอย่างเป็น proposal ที่รอ moderate)
- **Content Moderator console** (web): approve/reject change proposals
- Auth: LINE login (Thai), Apple/Google (foreigner) — agent ใช้ login เดียวกัน role-gated
- Trilingual data schema (i18n columns TH/EN/ZH) — **กรอก TH+EN ก่อน, ZH ค่อยตามใน Phase 1–2**

**Revenue:** เฉพาะ **Stream (1) Merchant SaaS** ในรูป LOI / free-trial — agent ปิดดีลตอน onboard merchant ในย่าน Nimman. ยังไม่เก็บเงินจริงเต็มที่ แต่ build pipeline.

**ยังไม่ build:** Quest engine, Coins/ledger, consumer-facing map polish, payment.

#### Phase 1 — MVP / Soft Launch (เดือน 3–6) — "เปิดให้ผู้ใช้ Nimman"
**Subsystems ที่ land:**
- **Consumer app v1:** Mapbox map, place discovery (eat/see/do filter), reviews, promotions, search
- **Loyalty core — append-only double-entry LEDGER** (ไม่ใช่ mutable integer ตามที่ founder กำหนด) + **Coins** (hard, baht-backed) + **Sparks** (soft XP)
- **Escrow Wallet** + merchant prefund flow (PromptPay ผ่าน Thai PSP — Omise/2C2P/Fiuu); **Clearing Account** ใน ledger; zero-balance auto-pause
- **Redemption engine (anti-fraud จากวันแรก):** merchant-initiated, rotating QR/OTP, time-boxed, geofenced, burned server-side. Tiered check-in trust (GPS dwell < verified visit < proven purchase)
- **Quest engine v1** (single-merchant + simple cross-merchant), Quest Step, Passport surface
- PDPA baseline: consent for location, audit log, retention = เก็บ "redemption FACT" ไม่ใช่ movement graph

**Revenue:** **(1) SaaS เก็บเงินจริง** + **(2) Redemption take-rate (~10–15%, capped)** เปิดเมื่อ Coins/Redemption live.

**ภาษา:** TH + EN live เต็ม. **ZH:** UI strings พร้อม แต่ data ยัง partial — ไม่ทำการตลาดกลุ่มจีนหนักจนกว่า ZH data จะครบ (Phase 2).

#### Phase 2 — V1 / Public Launch (เดือน 6–10) — "เชียงใหม่รู้จักเรา"
**Subsystems ที่ land:**
- **Cross-merchant Quest เต็มรูปแบบ** ("Nimman Cafe-Hop": Cafe A + Cafe B + Restaurant C -> free coffee)
- **Sponsored Quest + Festival Campaign module** (brand/mall/TAT prefund escrow เป็นสปอนเซอร์)
- Anti-fraud ขั้นสูง: impossible-travel checks, per-user/device caps, **identity-graph** จับ multi-account ring
- Tiers/badges/leaderboards ขับด้วย Sparks
- City/Regional Manager console, Brand/Sponsor portal
- **ZH data ครบ** + Alipay/WeChat (Chinese สแกน Thai QR ได้ตั้งแต่ ต.ค. 2025) เปิดสำหรับ merchant prefund/นักท่องเที่ยวจีน

**Revenue:** เพิ่ม **(3) Sponsored Quests + Festival Campaigns** — ขายให้ One Nimman, Maya, แบรนด์, TAT. ตั้งเวลาให้ตรงกับ **Yi Peng/Loy Krathong (พ.ย.)**.

**ภาษา:** **Trilingual เต็ม TH + EN + ZH** — ปลดล็อกการตลาดกลุ่มจีน FIT.

#### Phase 3 — V2 / Scale & Monetize (เดือน 10–14+)
**Subsystems ที่ land:**
- **Data product (anonymized)** — dashboard/feed สำหรับ TAT/แบรนด์/ห้าง (เคารพ PDPA: aggregate-only, ไม่ใช่ราย user)
- **Affiliate booking** — deep-link Klook / TakeMeTour ในหมวด "do/activities" + commission tracking
- **Analyst/API-Partner** read-API (scoped, rate-limited)
- Multi-city switch จริง: เปิด `city_id` ที่สอง (เช่น ภูเก็ต/ปาย) — เพราะ system กว้างมาตั้งแต่ migration #1 จึงไม่ต้อง re-architect

**Revenue:** ครบ **ทั้ง 4 streams** — (4) Data products + Affiliate commission เปิดท้ายสุดเพราะต้องมี data volume + traffic ก่อน.

---

### 11.2 GTM Motion — Density Gates, Agent Strike-Team, District Sequence

#### หลักการ: Density Gate (ประตูความหนาแน่น)
**เราจะไม่ยิง consumer marketing เข้า district ใด จนกว่าย่านนั้นจะผ่าน gate ทั้งหมด.** นี่คือเครื่องมือหลักที่กันไม่ให้ "แผนที่ว่าง":

| เกณฑ์ Density Gate (ต่อ 1 district) | Bar |
|---|---|
| Place coverage | **≥ 90%** ของ place ที่ "ควรอยู่" (เทียบกับ Google Places baseline ที่ seed มา) |
| รูปถ่ายต่อ Place | **≥ 5 รูปคุณภาพ** (ถ่ายโดย agent, ไม่ใช่ดึงจากเว็บ) |
| ข้อมูลครบ (hours, price band, category, geo) | **100%** ของ live places |
| Trilingual completeness | TH 100%, EN 100%, ZH ≥ 80% (Phase 2+) |
| Active Quest ในย่าน | **≥ 3 quest** + **≥ 5 merchant** มี Escrow Wallet เติมเงินแล้ว |
| Active promotions | **≥ 10** promo สด |

**ก่อนผ่าน gate** = ย่านนั้นอยู่ใน "seeding mode" (agent ทำงาน, ผู้ใช้เห็น pin แต่ไม่ยิงโฆษณา).
**หลังผ่าน gate** = ปลด consumer marketing (paid social, influencer, in-mall activation) เฉพาะย่านนั้น.

#### Agent Strike-Team Playbook
หนึ่ง **strike-team** = หน่วย saturate หนึ่ง district. สูตรต่อทีม:

```
1x City/Regional Manager (oversee 2–3 teams)
1x Team Lead (full-time staff)
4–6x Field Agent (นศ. CMU/Payap, part-time, geofenced ใน Territory)
1x Content Moderator (shared, ตรวจ Change Proposal ของทีม)
```

**Workflow ของ agent (4 สัปดาห์/district):**
1. **Wk 1 — Mapping sweep:** เดิน Territory ตาม geofence, จับ place ที่ขาด, ยิง Change Proposal (pin + รูป + hours)
2. **Wk 2 — Merchant onboarding:** เข้าพบเจ้าของร้านตัวจริง, sign SaaS, ตั้ง Escrow Wallet, สอน redemption (rotating QR)
3. **Wk 3 — Content depth:** เก็บรูป 5+/place, แปล TH/EN(/ZH), promo สด
4. **Wk 4 — Quest weaving:** ร้อย cross-merchant Quest ("Nimman Cafe-Hop"), ตรวจ Density Gate, ส่ง Manager sign-off
> **กฎเหล็ก:** Agent **ไม่เคยเขียน live data** — ทุก contribution เป็น **Change Proposal** ที่ Content Moderator ต้อง approve. นี่คือทั้ง quality control และ anti-fraud.

#### District Sequence (ลำดับลงพื้นที่จริง)
เรียงตาม **ความหนาแน่นเชิงพาณิชย์ + ความถี่นักท่องเที่ยว** ก่อน:

| ลำดับ | District | เหตุผล | Phase |
|---|---|---|---|
| 1 | **Nimman (Soi 1–17, One Nimman, Maya)** | คาเฟ่/ร้านอาหารหนาแน่นที่สุด, nomad+tourist+local ครบ, cross-merchant quest ง่าย | 0–1 |
| 2 | **Old City (Wat Phra Singh, Chedi Luang, Sunday Walking Street)** | attraction หนาแน่น (หมวด "see"), tourist สูง, ต่อ quest วัด+คาเฟ่ | 1–2 |
| 3 | **Santitham** | local+nomad density สูง, ราคาถูก, retention ปียาว (off-season anchor) | 2 |
| 4 | **Chang Klan / Night Bazaar** | tourist night economy, จีน FIT เยอะ -> เปิด ZH+Alipay ที่นี่ | 2 |
| 5 | **Hai Ya / Wua Lai (Saturday Walking Street)** | craft/handicraft, หมวด "do" | 3 |
| 6 | **Mae Hia / Hang Dong (suburban)** | คาเฟ่วิวดอย, weekend trip, ขยาย footprint | 3 |

**Marketing per district:** consumer push เปิดทีละย่านหลังผ่าน gate -> micro-influencer ของย่านนั้น + in-mall activation (One Nimman/Maya) + LINE OA broadcast เฉพาะ geo.

---

### 11.3 Org / Team per Phase + Agent Unit-Economics

#### Headcount per Phase

| Role | Phase 0 | Phase 1 | Phase 2 | Phase 3 |
|---|---|---|---|---|
| Founders (Product/Biz + Tech) | 2 | 2 | 2 | 2 |
| Flutter/Backend Dev | 1–2 | 2–3 | 3 | 3–4 |
| Ops Lead / Agent Program Manager | 1 | 1 | 1 | 2 |
| City/Regional Manager | 0 (founder ทำเอง) | 1 | 2 | 3 |
| Team Lead (agent) | 1 | 1–2 | 3 | 4–5 |
| Field Agent (part-time) | 4–6 | 8–12 | 18–25 | 30–40 |
| Content Moderator | 1 | 1–2 | 2–3 | 3 |
| Finance/Payout | (outsource) | 0.5 | 1 | 1 |
| DPO (PDPA) | (advisory) | **1 (แต่งตั้งจริง)** | 1 | 1 |
| Support/CS | 0 | 1 | 2 | 3 |

> **หมายเหตุ DPO:** ต้องแต่งตั้ง DPO อย่างเป็นทางการ **ตอน Phase 1** ก่อนเก็บ location consent + redemption data จริง (PDPA requirement). Phase 0 ใช้ที่ปรึกษากฎหมายภายนอกพอ.

#### Agent Unit-Economics & Pre-revenue Runway (ตัวเลข planning, ปรับได้)

```
ต่อ Field Agent 1 คน (part-time, นศ.):
  ค่าตอบแทน         ฿8,000–12,000 / เดือน (base + per-approved-proposal bonus)
  productivity      ~40–60 approved proposals / เดือน
  cost per place    ~฿150–250 (รวม onboarding + รูป + แปล)

ต่อ strike-team (5 agent + 1 lead):
  ~฿60,000–90,000 / เดือน
  saturate 1 district ใน ~4–6 สัปดาห์
```

**Pre-revenue burn (Phase 0, ก่อน revenue เข้า):**
- Agent + lead (1 team): ~฿75k/เดือน × 3 เดือน = **~฿225k**
- Dev (1–2) + founders + tooling (Supabase/Mapbox/PSP sandbox): ~฿150–250k/เดือน
- **รวม runway Phase 0 ≈ ฿1.1–1.5M** ก่อนมี redemption revenue
> **นัยสำคัญ:** เพราะ reward funding เป็น **merchant prepaid escrow** (platform ไม่เคยสำรองเงิน), burn ที่แท้จริงคือ **agent payroll + dev** เท่านั้น — ไม่มีความเสี่ยงจาก reward liability. ต้องระดมทุน/มี runway ครอบ **≥ Phase 0–1 (6 เดือน) ก่อน redemption take-rate เริ่ม cover agent cost** ในย่านที่ผ่าน gate.

---

### 11.4 Seasonality Plan

เชียงใหม่มี swing แรง: **burning season (ก.พ.–เม.ย.)** และ **rainy (มิ.ย.–ก.ย.)** ต่ำ; **Yi Peng/Loy Krathong (พ.ย.)** และ **Songkran (เม.ย.)** พุ่ง.

| ฤดู | กลยุทธ์ |
|---|---|
| **Off-season (burning/rainy)** | พึ่ง **local + resident nomad base** เป็น year-round retention engine. Quest แบบ indoor/คาเฟ่ Santitham+Nimman, "rainy-day cafe trail", Sparks streak/leaderboard เพื่อ retention. นี่คือเหตุผลที่ลำดับ #3 = Santitham (local anchor). |
| **Yi Peng / Loy Krathong (พ.ย.)** | **Festival Passport** ขายเป็น seasonal upside — sponsored quest จาก TAT/ห้าง, lantern-trail quest, จับ tourist+จีน FIT spike. เปิดพอดี Phase 2. |
| **Songkran (เม.ย.)** | Water-festival quest รอบ Old City moat, brand-sponsored, peak tourist. |
| **High season (พ.ย.–ก.พ.)** | Onboarding merchant + acquisition แรงสุด, ยิง marketing หลัง gate เปิด. |

**กฎ:** สร้าง local base **ก่อน** ฤดูพุ่ง เพื่อให้ festival เป็น "กำไรพิเศษ" ไม่ใช่ "ทั้งหมดของรายได้".

---

### 11.5 Success Metrics per Phase (North-star + Guardrail)

| Phase | North-star metric | Guardrail metrics |
|---|---|---|
| **0 Saturation** | **% Nimman ผ่าน Density Gate** (target 100% ใน wk 12) | Change-proposal approval rate ≥ 70%; cost/place ≤ ฿250; merchant LOI ≥ 30 |
| **1 MVP** | **Weekly redeeming users** (คนที่ burn Coins จริง/สัปดาห์) | Redemption fraud rate < 1%; D7 retention ≥ 25%; Escrow zero-balance pause < 10% ของ quest; PDPA consent rate |
| **2 V1** | **Cross-merchant Quest completion / สัปดาห์** | Merchant churn < 5%/เดือน; ZH data completeness ≥ 80%; sponsored-quest revenue ≥ X; impossible-travel block rate |
| **3 V2** | **Net revenue ครบ 4 streams + active districts ที่ผ่าน gate** | Data-product privacy compliance 100% aggregate; affiliate conversion; CAC payback < 6 เดือน; multi-account ring caught |

**North-star ระยะยาวเดียว:** **จำนวน "verified cross-merchant Quest completions ต่อเดือน"** — เพราะมันรวมทั้ง demand (ผู้ใช้เดิน quest), supply (merchant ร่วม), data quality (gate ผ่าน), และ monetization (redemption + sponsor) ไว้ใน metric เดียว.

---

### 11.6 Top 5 Risks + Mitigations

| # | Risk | Mitigation (carried จาก analysis) |
|---|---|---|
| 1 | **Empty map / spreading thin** — ฆ่า local app อันดับ 1 | **Density Gate** กั้น marketing; **district-by-district saturation**; system กว้างแต่ data หนา; ผู้ใช้เห็น "เต็ม" เสมอในย่านที่ launch |
| 2 | **Fraud / reward gaming** (free reward ล่อให้โกง) | Redemption **merchant-initiated + rotating QR/OTP + geofenced + time-boxed + burned server-side**; ไม่มี static customer QR; tiered trust (GPS dwell < verified < proven purchase); impossible-travel + device caps + identity-graph |
| 3 | **PDPA / BoT e-money** | DPO แต่งตั้งจริง Phase 1; lawful basis ต่อ dataset; เก็บ **redemption FACT ไม่ใช่ movement graph**; encrypt location/KYC; **Coins ต้องคง non-cashable + expiring** เลี่ยง BoT e-money scrutiny |
| 4 | **Merchant escrow แห้ง -> quest ตาย** | **Zero-balance auto-pause** + แจ้งเตือนเติม; **platform ไม่เคยสำรองเงิน**; agent/Manager ติดตาม top-up; sponsor-funded quest เป็น backup funding |
| 5 | **Seasonality demand collapse (off-season)** | สร้าง **local+nomad base ก่อน** (Santitham anchor, ลำดับ #3); year-round Quest/Sparks retention; festival เป็น upside ไม่ใช่ lifeline; ขยาย district เพื่อ diversify demand |

> **Bottom line:** กว้างในโค้ด, แน่นบนพื้น. Migration #1 รองรับทั้งเชียงใหม่และเมืองถัดไป; แต่เงิน, agent, และ marketing ทุ่มทีละย่านจนผ่าน gate ก่อนขยับ — เพื่อไม่ให้ผู้ใช้คนแรกในแต่ละย่านเจอแผนที่ว่าง.

---

## 12. ประเด็นความสอดคล้อง & ช่องว่างที่ต้องเติม (Integration Review)

### 12.1 ประเด็นความสอดคล้องระหว่างระบบย่อย (ต้อง reconcile)

- LEDGER SCHEMA แตกต่างกัน 4 แบบใน 4 section (ต้อง reconcile เป็น spec เดียวก่อน migration #1): (a) datamodel ใช้ accounts.account_type = user_coin|merchant_escrow|platform_clearing|platform_revenue|sponsor_funding|coin_liability + ledger_entries.direction + currency COIN|THB|SPARK; (b) loyalty ใช้ merchant_escrow|merchant_issuer|user_wallet|clearing|platform_revenue|coin_expired + amount_minor signed +/- (ไม่มี direction column); (c) architecture ใช้ owner_type = merchant_escrow|user_coins|user_sparks|clearing|revenue|expiry_sink + direction D/C; (d) monetization ใช้ ESCROW_MERCHANT|CLEARING|PLATFORM_REVENUE|SPONSOR_BUDGET|PSP_SUSPENSE + DR/CR. ชื่อ account, การมี/ไม่มี direction column, และ signed vs unsigned amount ขัดกันหมด ต้องเลือกแบบเดียว
- COIN_LIABILITY vs MERCHANT_ESCROW LOCK — โมเดลการ track liability ของ Coins ต่างกัน: datamodel มีบัญชี coin_liability แยก (platform เป็นเจ้าของหนี้สิน Coin) แต่ loyalty ติดตาม liability ผ่าน escrow_wallets.locked_balance (เงินบาทถูก lock ใน escrow ของ merchant) ส่วน architecture ไม่มีทั้งสอง สองโมเดลนี้ post ledger ต่างกันโดยสิ้นเชิงตอน mint/expire ต้องตัดสินว่า liability อยู่ที่ platform (coin_liability account) หรืออยู่ที่ merchant escrow (locked sub-balance)
- SUBSCRIPTION TIER ขัดกันทั้งชื่อและราคา: merchant section ใช้ 3 tiers = Free Claimed / Growth (600-1,000฿) / Pro (2,000-3,000฿); monetization section ใช้ 4 tiers = Free / Starter (390฿) / Growth (990฿) / Pro (2,490฿); datamodel ใช้ plan enum = basic/pro/chain; agentops อ้าง subscription แต่ไม่ระบุ tier ต้องรวมเป็นชุดเดียว (จำนวน tier, ชื่อ, ราคา) เพราะ agent commission, billing engine, และ take-rate ผูกกับ tier โดยตรง
- TAKE-RATE: PER-TIER vs FLAT — monetization ผูก take-rate กับ tier แบบผกผัน (Starter 15% / Growth 12% / Pro 10% + cap 15-20฿ ต่อ tier) แต่ loyalty/merchant/consumer/roadmap พูดถึง take-rate เป็นช่วงเดียว ~10-15% capped ไม่ผูก tier ต้องยืนยันว่า take-rate ขึ้นกับ subscription tier จริงหรือเป็น flat (กระทบสูตรใน redemption ledger posting)
- TRUST-TIER NAMING ไม่ตรง: datamodel/architecture/merchant/consumer ใช้ enum gps_dwell / verified_visit / proven_purchase; loyalty ใช้ T1 GPS Dwell / T2 Verified Visit / T3 Proven Purchase; quest_steps.required_action ใน loyalty ใช้ CHECKIN / VERIFIED_VISIT / PROVEN_PURCHASE (CHECKIN != gps_dwell). ต้องกำหนด enum เดียว (เสนอ gps_dwell|verified_visit|proven_purchase) แล้ว map T1/T2/T3 เป็น label เท่านั้น
- IMPOSSIBLE-TRAVEL SPEED THRESHOLD ขัดกัน: loyalty ระบุ >120 km/h ในเมือง = flag; architecture ระบุ >200 km/h = flag ต้องเลือกค่าเดียว (หรือระบุว่าเป็น per-context) เพราะเป็นพารามิเตอร์ anti-fraud ที่ใช้ใน check-in Edge Function เดียวกัน
- GEOFENCE/GPS RADIUS ไม่สอดคล้อง: agentops ใช้ GPS proximity ≤80m สำหรับ agent submission; consumer/loyalty/merchant ใช้ geofence radius ต่อ place (ไม่ระบุตัวเลข, place.radius_m); architecture ใช้ ST_DWithin(place.radius_m) ต้องนิยามว่า agent-submission radius (80m) กับ customer-checkin radius เป็นคนละค่าโดยตั้งใจ และ radius ต่อ place type (วัดใหญ่ Chedi Luang vs คาเฟ่เล็ก) ตั้งอย่างไร — มี open question ซ้ำใน agentops+consumer
- COIN = 1 THB FIXED vs ABSTRACT: loyalty ล็อก 1 COIN minor = 1 THB minor (สตางค์) เป็น decision ชัด; monetization เขียน '1 COIN = 1 THB backed แต่แยก currency เพื่อ control'; datamodel เก็บ coin_grants.thb_value_locked แยกจาก coin_amount (เปิดช่องให้ != 1:1) ต้องยืนยัน 1:1 fixed หรือยอมให้ exchange rate ปรับได้ (datamodel เปิดทาง แต่ loyalty ปิด)
- RBAC ENFORCEMENT MODEL ซ้อนกัน 3 แบบ: datamodel ใช้ roles + user_roles + scope_city_id/scope_merchant_id (enum role 12 ตัว); rbac section ใช้ scopes tree + role_assignments + ST_Contains + recursive CTE; architecture ใช้ JWT custom claims (role, city_ids[], merchant_ids[], territory_ids[]) อ่านใน RLS ทั้ง 3 อธิบายกลไกเดียวกันคนละวิธี — โดยเฉพาะ architecture เตือนห้าม recursive table lookup ใน RLS (ช้า/deadlock) แต่ rbac เสนอ recursive CTE บน scopes.parent_id ต้อง reconcile: scope tree เก็บที่ไหน, RLS อ่านจาก JWT หรือ join table
- PLACE VERSIONING TABLE ชื่อไม่ตรง: datamodel ใช้ places_history (+ version int + valid_from/valid_to, shadow history); agentops ใช้ place_version (version_no, append-only, place.current_version_no) ต้องเลือกชื่อ/โครงเดียว
- MERCHANT TRUST STATE vs KYC ENUM ไม่ตรง: merchant section ใช้ state machine CLAIMED_UNVERIFIED → IDENTITY_VERIFIED → FINANCE_VERIFIED (+ PAYOUT_FROZEN); datamodel merchants.kyc_status = pending/verified/rejected (boolean-ish 3 ค่า) ต้อง map merchant trust_state เข้ากับ schema (datamodel ยังไม่มี trust_state column)
- ESCROW BALANCE FIELD ชื่อต่างกัน: datamodel escrow_wallets.balance_cached + low_balance_threshold; loyalty available_balance/locked_balance; merchant escrow_wallet.balance_satang; monetization ledger_account (ไม่มี balance column, derive จาก SUM) ต้องนิยามว่า escrow_wallets เป็น read-model cache ของ balance ไหน (available? locked? total?) และ unit (minor/satang) ให้ตรง
- COMMISSION RATE ของ agent ไม่ตรง: monetization ระบุ subscription commission = new 20% / renewal 5% + clawback 30 วัน; agentops ระบุ activation_bonus ฿120-250 + base bounty + accept-rate multiplier แต่ไม่พูดถึง subscription %-commission; datamodel มี subscriptions.sold_by_agent_id + tasks.reward_thb สองโมเดล reward ของ agent (bounty per task vs % commission ของ subscription) ต้อง reconcile ว่า agent ได้ทั้งสองหรือเลือกอย่างเดียว
- FESTIVAL PASSPORT เป็น entity แยกหรือ quest_type: datamodel open question ถามว่าควรเป็น quest_type=festival หรือ entity แยกที่มี ticketing/paid access; loyalty ใช้ quest type FESTIVAL; monetization สร้าง campaign.kind = Festival Passport (entity แยกใน campaign) ทั้งสามมองต่างกัน ต้องตัดสินว่า festival passport = quest variant หรือ campaign product หรือ paid-ticket entity
- PSP_SUSPENSE / CLEARING ACCOUNT ใช้ไม่ตรง: monetization แยก PSP_SUSPENSE (เงินจาก PSP) ออกจาก CLEARING; loyalty ใช้ clearing เป็นทั้งจุดรับเงิน PSP และจุด settle; merchant ใช้ Clearing Account เป็นที่พัก Coins ที่ burn รอ payout; architecture ใช้ clearing เป็น settle point ต้องนิยาม chart-of-accounts ให้ชัดว่า PSP suspense กับ clearing แยกหรือรวม
- OFFLINE REDEMPTION ขัดกัน: loyalty + merchant ออกแบบ offline fallback (signed voucher + PROVISIONAL_BURN + reconcile online) ให้ทำรายการหน้าร้านได้; consumer ระบุชัด 'Redemption เป็น online-only โดยตั้งใจ' ขัดกันตรงๆ ต้องตัดสินว่า offline redemption มีหรือไม่ (ถ้ามี ใครรับความเสี่ยง merchant) — consumer section ดูจะ overrule แต่ loyalty/merchant ออกแบบไว้ละเอียด

### 12.2 ช่องว่างข้ามระบบที่ยังไม่มีใครออกแบบ (Cross-cutting Gaps)

- SUPPORT / CS / DISPUTE RESOLUTION ไม่มี section ไหนออกแบบเต็ม: role Support/CS มีใน RBAC (ออก compensation Coins, unmask PII per-ticket) และ merchant/datamodel แตะ dispute status แต่ไม่มี ticketing system, dispute state machine, SLA, หรือ flow ชดเชยเมื่อ 'ลูกค้า burn Coins แล้วร้านไม่ให้ของ' / 'ร้านยิง redemption ผิด' / 'agent payout พิพาท' — เป็น open question กระจายหลาย section แต่ไม่มีเจ้าของ design
- NOTIFICATION INFRASTRUCTURE ไม่มี design รวม: หลาย section อ้าง push/LINE/email/SMS (low-balance alert, dunning, geofenced retention push, re-verify alert, DSAR, breach notification, quest pause) แต่ไม่มี section ออกแบบ notification service, template management, channel routing, frequency cap กลาง, consent gating รวม, หรือ delivery tracking — architecture แค่ list FCM/APNs + LINE Messaging API ใน buy list
- REVIEW / UGC CONTENT MODERATION ไม่ครบ: reviews มี trust_weight + verified-visitor gate + moderation_status แต่ไม่มี flow รายงานรีวิว (report abuse), เกณฑ์ลบ, การจัดการรีวิวเชิงลบ/หมิ่นประมาท, หรือ moderation queue ของ UGC (Content Moderator queue ออกแบบเน้น change_proposal ของ place ไม่ใช่ review) — merchant ตอบรีวิวได้แต่ไม่มี flow โต้แย้ง
- OBSERVABILITY / SLO / ALERTING นอกเหนือ error monitoring: architecture list PostHog+Sentry แต่ไม่มี SLO, financial reconciliation monitoring (ledger SUM != escrow balance alert), fraud-detection alerting pipeline, on-call rotation (นอกจาก breach), หรือ dashboard health ของ escrow/redemption/payout ที่เป็นเงินจริง
- PAYOUT / SETTLEMENT OPERATIONS ขาดรายละเอียด: Finance/Payout role + create/approve payout SoD + Clearing Account มีครบในหลัก แต่ไม่มี design ของ payout batch/cycle จริง (รายสัปดาห์?), การ reconcile กับ bank statement, การจัดการ failed payout, withholding tax (ภาษีหัก ณ ที่จ่ายของ agent/merchant), หรือการออก 50 ทวิ/หนังสือรับรองหัก ณ ที่จ่าย
- ACCOUNTING / TAX / REVENUE RECOGNITION: monetization แตะ deferred revenue ของ annual subscription และออก ภพ.20/ใบกำกับภาษี แต่ไม่มี section ออกแบบ accounting integration, VAT handling (แพลตฟอร์มเก็บ VAT จาก take-rate/subscription ไหม), withholding tax flow, หรือ chart-of-accounts mapping จาก ledger → งบการเงินจริง
- DATA WAREHOUSE / ANALYTICS PIPELINE รายละเอียด: architecture เสนอ nightly export → DuckDB/BigQuery + consumer มี funnel taxonomy + monetization ขาย data product แต่ไม่มี design ของ ETL pipeline, k-anonymity enforcement engine (ใครรัน, ตรวจ k>=25 ตรงไหน), หรือ analytics API surface (Analyst/API-Partner role มี แต่ schema/rate-limit/auth ของ API ยังไม่ออกแบบ — เป็น open question ใน datamodel)
- GUEST → ACCOUNT MERGE + ACCOUNT LIFECYCLE: consumer ระบุ guest progress merge เข้า account ตอน login แต่ไม่มี section ออกแบบกลไก merge (anonymous session id → user, ชน Sparks/Quest progress ซ้ำ), account linking หลาย provider (LINE+Apple+WeChat → 1 user), account recovery, หรือ account deletion cascade ผ่านทุก subsystem (ledger เก็บ pseudonymous แต่ใครสั่ง cascade)
- ONBOARDING/AUTH SECTION ไม่มีเต็ม: ทุก section พึ่ง LINE/Apple/Google/WeChat login + JWT claims + step-up MFA แต่ไม่มี section ใดออกแบบ auth flow เต็ม (WeChat Open Platform feasibility เป็น open question ใน consumer, step-up MFA method per role เป็น open question ใน rbac) — auth เป็น dependency ของ RBAC+consumer+merchant แต่ไม่มีเจ้าของ
- SEARCH / RANKING / DISCOVERY ALGORITHM: consumer ระบุ default sort = relevance (distance × freshness × rating × promo) + search ภาษาผสม + alias index แต่ไม่มี section ออกแบบ ranking engine, search infrastructure (full-text? vector? Postgres FTS vs external), หรือ personalization weighting per persona ในเชิงเทคนิค
- INTER-CITY COIN/QUEST POLICY: datamodel open question ถาม Coins city-scoped vs global; ไม่มี section ตัดสิน cross-city behavior (user ที่ mint Coins ใน CNX ไป redeem ที่เมือง #2 ได้ไหม, leaderboard ข้ามเมือง, quest ข้ามเมือง) — กระทบ ledger account.city_id และ multi-city rollout phase 3
- MEDIA STORAGE COST / CDN / LIFECYCLE: architecture มี media pipeline + pHash + variants แต่ไม่มี cost model ของ storage (รูป 5+/place × หมื่น place × ทุก district), CDN egress cost, image lifecycle (ลบรูปเก่าตอน version ใหม่ approve ไหม), หรือ video handling (media.kind = video มีแต่ pipeline เน้น image)
- CONTENT/QUEST SEEDING ETL DETAIL: architecture+roadmap อ้าง Google Places → change_proposal seeding (one-time) แต่ไม่มี design ของ ETL จริง (dedup กับที่ agent เก็บ, mapping Google category → eat/see/do taxonomy, licensing ของ Google data ที่ห้าม persist ระยะยาว, การ refresh denominator ของ Density Gate)
- DISASTER RECOVERY / BACKUP ของ FINANCIAL LEDGER: ledger เป็น append-only source of truth ของเงินจริง แต่ไม่มี section พูดถึง backup/PITR strategy, ledger replay/rebuild procedure, หรือ business continuity ถ้า Supabase region (Singapore) ล่ม — เป็นความเสี่ยงเงินจริงที่ไม่มีใครครอบ

---

## 13. การตัดสินใจที่ยังค้างอยู่ (Open Decisions)

รายการนี้คือสิ่งที่เจ้าของระบบต้องเคาะก่อนเริ่ม build จริง (เรียงตามความสำคัญ):

1. [CRITICAL/BLOCKING] นิยาม CANONICAL LEDGER SPEC ฉบับเดียว (chart-of-accounts + entry shape) ก่อน migration #1: ตัดสินชื่อ account_type, มี direction column หรือ signed amount, currency enum, liability ที่ coin_liability(platform) vs escrow locked(merchant), แยก PSP_SUSPENSE/CLEARING หรือรวม — ขัดกัน 4 section ต้อง reconcile ก่อนเขียนโค้ดบรรทัดแรก
2. [CRITICAL] สรุป SUBSCRIPTION TIER ชุดเดียว (จำนวน/ชื่อ/ราคา) + ยืนยันว่า TAKE-RATE ผูกกับ tier (15/12/10%) หรือ flat ~10-15% + ค่า CAP บาทต่อ redemption (15-20฿?) + floor — ขัดกัน merchant vs monetization; กระทบ billing, agent commission, redemption ledger posting
3. [LEGAL/BLOCKING] ทนายไทยยืนยัน legal posture: (a) Coins พ้นนิยาม e-money ของ ธปท. จริง (non-cashable+expiring+merchant-only redeem), (b) escrow model ไม่เข้าข่าย deposit-taking/payment business ที่ต้องขอใบอนุญาต, (c) retention ของ redemption records ตามกฎหมายภาษี/บัญชี (5-10 ปี?) — ต้อง confirm ก่อน launch Phase 1
4. [POLICY] นโยบาย COIN EXPIRY: กี่วัน (90 placeholder), reset เมื่อ activity ใหม่ไหม, grace ช่วงเทศกาล, Sparks มี expiry ไหม — กระทบ coin_liability, wallet UX, breakage accounting; ต้อง Finance+legal ยืนยัน
5. [POLICY] 1 COIN = 1 THB fixed หรือ abstract exchange rate ปรับได้ — loyalty ปิด (1:1), datamodel เปิด (thb_value_locked แยก); ตัดสินก่อน design wallet+ledger
6. [DECISION] COINS/QUEST เป็น city-scoped หรือ global ข้ามเมือง (redeem/leaderboard/quest ข้ามเมือง) — กระทบ ledger account.city_id + multi-city phase 3
7. [ANTI-FRAUD TUNING] กำหนดค่าพารามิเตอร์กันโกงชุดเดียว: geofence radius ต่อ place type (วัดใหญ่ vs คาเฟ่; agent-submit 80m vs customer-checkin ?), dwell N นาทีต่อ trust tier, impossible-travel speed threshold (120 vs 200 km/h — ขัดกัน), earn caps/วัน, QR/OTP TTL (60 vs 90 วิ) — ต้อง tune กับ pilot Nimman
8. [DECISION] OFFLINE REDEMPTION มีหรือไม่ — consumer ระบุ online-only โดยตั้งใจ แต่ loyalty+merchant ออกแบบ offline voucher/PROVISIONAL_BURN ละเอียด; ขัดกันตรงๆ ต้องตัดสิน (ถ้ามี ใครรับความเสี่ยง, เพดานมูลค่า, จำกัด tier/พื้นที่ไหน)
9. [DESIGN GAP] ออกแบบ SUPPORT/CS + DISPUTE subsystem เต็ม: ticketing, dispute state machine, flow ชดเชยจาก escrow/Clearing เมื่อ burn-แล้วไม่ได้ของ/ยิงผิด/payout พิพาท, SLA, การ unmask PII per-ticket — ไม่มี section ใดเป็นเจ้าของ
10. [DESIGN GAP] ออกแบบ NOTIFICATION INFRA รวม: service, template, channel routing (push/LINE/email/SMS), frequency cap+quiet hours กลาง, consent gating, delivery tracking — กระจายทุก section ไม่มีเจ้าของ
11. [DECISION] FESTIVAL PASSPORT = quest_type variant หรือ campaign product หรือ paid-ticket entity แยก (ticketing/paid access) — datamodel/loyalty/monetization มองต่างกัน; กระทบ schema + revenue model phase 2
12. [FINANCE] AGENT COMPENSATION ชุดเดียว: pure-bounty(gig) vs base+bounty, calibrate กับ minimum wage นิสิต CMU/Payap + Thai labor law; + reconcile ว่า agent ได้ทั้ง task bounty AND subscription %-commission (20%/5%) หรือเลือกอย่างเดียว; + withholding tax flow
13. [INFRA] เลือก PSP (Omise/2C2P/Fiuu) + ช่องทาง Alipay+/WeChat acquiring (PSP เดียวกันหรือ Antom แยก) + ยืนยัน feasibility WeChat Login ใน Customer app (Open Platform tier/cost) — กระทบ integration effort + Chinese persona button
14. [COMPLIANCE] DPO fix ค่า: k-anonymity threshold (k>=25?) + H3 resolution ของ data product, retention ของ raw agent GPS (7-14 วัน) + check-in geo purge window, EXIF proof retention (90 วัน) — ต้อง DPO+legal ยืนยันก่อน data product launch
15. [INFRA] data residency: Supabase region (Singapore) เพียงพอ PDPA หรือ DPO ต้องการ data ในไทย — กระทบ build-vs-buy ของ DB hosting + DR strategy
16. [BUSINESS] funding/runway จริง (Phase 0 ~1.1-1.5M฿ เป็นประมาณการ) + เมือง #2 คือที่ไหน (Pai/Phuket/BKK) + data-product buyer หลัก (TAT/mall/brand) ที่ shape metrics ที่ต้อง instrument ตั้งแต่ phase 1
17. [DESIGN GAP] ออกแบบ AUTH/ONBOARDING section เต็ม + guest→account merge mechanism + multi-provider linking (LINE+Apple+WeChat→1 user) + step-up MFA method per role (LINE OTP vs TOTP vs biometric) + account deletion cascade — เป็น dependency ของ RBAC+consumer+merchant ไม่มีเจ้าของ
18. [DESIGN GAP] ออกแบบ PAYOUT/SETTLEMENT OPS: batch/cycle จริง, bank reconciliation, failed payout, withholding tax + 50ทวิ, VAT handling ของ take-rate/subscription, revenue recognition ของ annual sub (deferred) — แตะหลายที่แต่ไม่ครบ
19. [DESIGN GAP] reconcile RBAC enforcement: scope tree (rbac) vs roles+user_roles (datamodel) vs JWT claims (architecture) — architecture เตือนห้าม recursive table lookup ใน RLS แต่ rbac เสนอ recursive CTE; ตัดสินว่า scope ผูก JWT claim ขนาดไหน, เมื่อ scope เปลี่ยน refresh JWT อย่างไร
20. [DESIGN GAP] reconcile ชื่อ table: places_history vs place_version, merchants.kyc_status enum vs merchant trust_state machine, escrow balance fields (balance_cached vs available/locked vs balance_satang) — ทำ data model dictionary ฉบับเดียว

---

## ภาคผนวก ก. ชื่อแอปที่เสนอ (Candidate Names)

- Roam CNX — เน้น explore-and-earn, สั้น trilingual-friendly (CNX = รหัสสนามบินเชียงใหม่ ที่ทั้ง 3 กลุ่มจำได้)
- Lanna Loop — Lanna สื่อถึงอัตลักษณ์เหนือ, Loop สื่อ cross-merchant quest trail (เดินครบวง)
- Wandr / Wandr Chiang Mai — wander + reward, สะกดสั้นแบบ app brand, ออกเสียงง่ายทั้ง EN/TH/ZH
- Locale — Soi (ซอย) เป็นคำท้องถิ่นที่ tourist รู้จัก + hop สื่อ cafe-hop/quest; เล่นกับ Nimman soi 1-17 ได้ดี
- PassportCM / Passport เชียงใหม่ — ตรงกับ Passport surface ของ quest, สื่อ collectible/สะสมแสตมป์, ขยาย Passport BKK/Phuket ได้
- Doi Coin — Doi (ดอย/ภูเขา) เป็น Lanna identity + Coin สื่อ loyalty currency; จำง่าย แต่ต้องเช็คว่าไม่สื่อ crypto เกินไป
