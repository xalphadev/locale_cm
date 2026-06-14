## 1. Engagement Economy & Framework

> **เวอร์ชัน:** v2 (engagement layer — rulebook, finalized post-critique) · **วันที่:** 2026-06-14
> **บทบาทของ section นี้:** เป็น *รัฐธรรมนูญ* ของ engagement & social layer ทั้งหมด — ทุก feature ใน section 2–N ต้องอ้างกฎในนี้ และต้องผ่าน **classification gate** (§1.2) ก่อนถูก spec. ไม่มี feature ใดได้รับอนุญาตให้ "ตัดสินรางวัลจริงบน client", "mint มูลค่านอก money-gate", "เอาผลสุ่มไป gate มูลค่าจริง (ทางตรงหรือทางอ้อม)", หรือ "จัดสรรมูลค่าจริงด้วยการแข่ง latency".
> **align กับ locked design:** doc 02 §A.4 (Sparks = `spark_events` append-only, ไม่อยู่ใน money-ledger), doc 02b §A2.4 (`cogs_budget_cap` + B1/B2 inert-until-sized), §A2.5 (SEAM-1 universal mint-gate), §A2.6.1 (`cs_open_obligations` erasure gate), §A2.9-#2 (goodwill↔identity-cluster edge + กฎ "visibility ≠ fraud-gate coverage"), doc 05 (Flutter + Supabase Realtime + NestJS money-plane), doc 06 (Sparks=violet ✦ / Coins=metallic gold ◉, ห้ามเลขบาทคู่ Coin, celebration-honesty §1.6, a11y §1.7), OPEN_DECISIONS (B1/B2 BLOCKING, C5/C6/C7 legal, + **ใหม่: C11–C14** ที่ section นี้เปิดให้ — ดู §1.7).
>
> **Changelog v1→v2 (จาก critique — สรุปสิ่งที่ fold เข้า):** (1) เพิ่ม **transitivity invariant** §1.1 #6 — ผลสุ่ม (แม้ cosmetic) ที่เป็น *input* ของ Coin unlock = server-authoritative RNG + [LEGAL-CHECK] (critical); (2) §1.2 จัด **first-N latency race สำหรับมูลค่าจริง = [LEGAL-CHECK]** ไม่ใช่ safe-by-default + **community-vote-decided real value = [LEGAL-CHECK]** (critical/major); (3) §1.4 เขียน **streak contract** ที่เป็นรูปธรรม (weekly-consistency, auto-freeze) + แก้ contradiction reminder-push ↔ anti-addiction + เพิ่ม calm-mode/aggregate-pressure budget + sponsored-placement disclosure (major); (4) §1.5 เพิ่ม **group-membership edge = BLOCKING wired input เข้า SEAM-1 step 2** + per-cluster velocity/cooldown + merchant-side anti-self-redemption + collective/instant Sparks ต้องผ่าน Sybil cap + hashed-contacts ephemeral-no-graph + leaderboard verified-tier-only + appeal path (critical/major); (5) §1.6 เพิ่ม cultural-respect & sacred-site guardrail; (6) §1.3 เพิ่ม **variable-reward-of-content/social/contribution layer** + zero-state tourist hook (major). รายการ **reject + เหตุผล** ดู §1.8.

---

### 1.1 The SPARKS-as-Fuel Doctrine — ทำไมเรา gamify หนักบน Sparks และล็อก Coins แน่น

หลักการแกนเดียวที่ทำให้ทั้ง layer ปลอดภัย: **เราแยก "เชื้อเพลิงของความสนุก" ออกจาก "มูลค่าจริง" อย่างเด็ดขาด.**

- **SPARKS = เชื้อเพลิง (fuel).** เป็น soft XP ฟรี **ไม่มี monetary liability** (doc 02 §A.4) → เราจึง *จงใจ* ใจป้ำ, แปรผัน, เซอร์ไพรส์, ให้ถี่ได้ โดย**ไม่ก่อหนี้, ไม่แตะ e-money boundary ของ ธปท., ไม่เข้าข่ายพนัน** (เพราะของที่สุ่มได้ไม่มีมูลค่าจริง). Sparks เขียนลง `spark_events` (append-only, signed delta ได้) + cache `spark_balances` — rebuild ได้, audit scope ทางการเงิน**ไม่แตะ**. Sparks ปลดล็อกแค่ *สิทธิ์เข้าถึง* (tier/badge/leaderboard/quest-access) ไม่ใช่ตัวจ่ายรางวัลจริง.
- **COINS = มูลค่าจริง (value).** baht-backed, mint ได้เฉพาะเมื่อมี settled THB ใน escrow/sponsor รองรับ, ผ่าน **single mint path ของ NestJS money-plane** (`grant`/`redeem` หรือ `cs_grant_goodwill`) ภายใต้ SEAM-1 (§1.2). non-cashable, expiring, merchant-initiated + geofenced + anti-self-redemption. **ห้าม engagement feature ใด ๆ ตัดสินหรือ mint Coins เอง.**

**ทำไม doctrine นี้คือสิ่งที่ทำให้ "fun" กับ "safe" อยู่ด้วยกันได้:** ความสนุกของ gamification เกิดจาก *variable reward* (รางวัลแปรผัน/เซอร์ไพรส์) — แต่ variable reward ที่เป็น **มูลค่าจริง + สุ่ม** = ความเสี่ยงพนัน + e-money + COGS ที่คุมไม่ได้. เราจึงย้าย "ความแปรผัน/เซอร์ไพรส์" ทั้งหมดไปไว้ที่ **Sparks** (ที่สุ่มได้อิสระเพราะไม่มีมูลค่า) และเก็บ Coins ให้เป็น **deterministic + gated** เสมอ. นี่คือเหตุผลว่าทำไมทั้ง layer ถึงเล่นใหญ่ได้โดยไม่ระเบิด.

#### Invariants ของ doctrine (ทุก section ต้องเคารพ — ผิดข้อใด = block spec)

1. **แปรผัน/สุ่ม/เซอร์ไพรส์ → Sparks/cosmetic เท่านั้น** (free, no liability).
2. **มูลค่าจริง (Coin/ของจริง) → deterministic + ผ่าน SEAM-1 เสมอ** — ห้าม "สุ่มมูลค่าจริง".
3. **client ตัดสิน/mint มูลค่าจริงไม่ได้** — client ได้แค่ animate ผลที่ server ตัดสินมาแล้ว.
4. **ไม่จัดสรรมูลค่าจริงด้วยการแข่งเวลา (latency race / first-come)** — เพราะผลขึ้นกับ network/device/bot ไม่ใช่ skill/effort = chance เชิง substance (§1.2 / §1.4).
5. **Leaderboard/ranking = Sparks/activity เท่านั้น** — ห้าม rank ด้วย Coin/เงินถือครอง (toxic + e-money signal).
6. **★ TRANSITIVITY INVARIANT (critical, ใหม่ v2):** *ผลสุ่มใด ๆ ที่เป็น input ของการปลดมูลค่าจริง — แม้ผ่านตัวกลาง cosmetic (เช่น "สุ่มได้ rare foil → foil ปลด Coin") — ต้องถือเป็น **chance-for-value** เต็มตัว.* นั่นแปลว่า: RNG ต้อง **server-authoritative**, log ลง `chance_draws`, และ mechanic ทั้งก้อนเป็น **[LEGAL-CHECK]**. **client-side RNG อนุญาตเฉพาะเมื่อผลลัพธ์ทั้งสายปลายทาง (downstream unlock ทุกตัว) เป็น Sparks/cosmetic และ *ไม่มีทาง* gate มูลค่าจริงได้เลย.** ห้ามฟอกความสุ่มผ่านของ cosmetic แล้วให้ของ cosmetic นั้นไปปลด Coin.
7. **★ cosmetics = zero-liability ก็ต่อเมื่อ non-transferable (minor→invariant):** ของสะสม/cosmetic/collectible **โอน/แลก/ขายต่อไม่ได้เด็ดขาด** → ไม่มี secondary market → ไม่มีมูลค่าตลาดจริง. ถ้าวันใดเปิด gifting/trading = re-import ทั้ง e-money + loot-box exposure กลับเข้า "safe cosmetic track" → ต้อง gambling + e-money legal review ก่อน (default OFF, §1.8).

#### ตาราง doctrine: "Sparks ทำอะไรได้" vs "เฉพาะ money-gate ทำได้"

| มิติ | ✦ SPARKS ทำได้เลย (free, no liability) | ◉ เฉพาะ MONEY-GATE (NestJS) ทำได้ |
|---|---|---|
| **ตัดสินที่ไหน** | Client/Supabase ตัดสินได้ (optimistic ok สำหรับ Sparks ที่ไม่ award จริง) | **Server-authoritative เท่านั้น** — plpgsql gate+post fn เดียว ภายใต้ `FOR UPDATE` (doc 05) |
| **ความใจป้ำ** | **แปรผัน/สุ่ม/เซอร์ไพรส์ได้** (×2 วันนี้, jackpot Sparks, mystery Sparks) | **Deterministic เท่านั้น** ("ทำครบ X → ได้รางวัล Y") — ห้ามสุ่มมูลค่าจริง + ห้าม latency-race (§1.4) |
| **ความถี่** | สูงมาก (ทุก check-in, ทุก review, ทุก social action) — soft-cap diminishing (§1.4) | bounded ด้วย `cogs_budget_cap` (per-redemption B1 + per-merchant-monthly B2, doc 02b §A2.4) |
| **ใช้ขับ** | tier, badge, streak, leaderboard, level, title, cosmetic, collectible (non-monetary, non-transferable) | unlock Coin reward, quest Coin-payout, redeem ของจริงที่ร้าน |
| **Backing** | ไม่มี (ไม่ใช่เงิน) | **settled THB 1:1** (escrow/sponsor) — ไม่มี backing = mint ไม่ได้ (A.8.11) |
| **เป็น input ของ Coin ได้ไหม** | ได้ — แต่**ปลดได้แค่ "สิทธิ์เข้าถึง" (access)**; การ mint จริงยังต้องผ่าน SEAM-1 (§1.5). **ถ้าผลที่ใช้ปลดเป็นผลสุ่ม → invariant #6 บังคับ server-RNG + [LEGAL-CHECK]** | — (เป็นปลายทาง) |
| **Leaderboard/ranking** | ✅ จัดอันดับด้วย Sparks/activity ได้ — **เฉพาะ Sparks จาก verified-tier (T2+/`verified_visit`)** จึงนับเข้าอันดับ (§1.5) | ❌ **ห้ามจัดอันดับด้วย Coins/เงินถือครอง** (toxic + e-money signal) |
| **หมดอายุ / cashout** | ไม่หมดอายุแบบเงิน, ไม่มี cashout (ไม่ใช่เงินอยู่แล้ว) | หมดอายุ (expiring lot), **ไม่มีปุ่มถอน/โอน/แลกเงินสด** (doc 06 §1.10 + §1.1) |
| **PDPA** | event log = pseudonymous; visibility opt-in (§1.5) | + financial audit trail (S6 recon) |

> **กฎทอง (ติดทุก feature spec):** ถ้า feature ของคุณอยากให้รางวัล **ที่แปรผัน/เซอร์ไพรส์/ถี่** → จ่ายเป็น **Sparks**. ถ้าอยากให้ของจริง → ต้อง **deterministic + route ผ่าน money-gate**. ห้ามผสม "สุ่ม" กับ "มูลค่าจริง" บน client เด็ดขาด — **และห้ามให้ของ cosmetic ที่สุ่มได้ ไปปลด Coin (invariant #6).**

```
              ✦ SPARKS LANE (free, variable, client-ok)        ◉ MONEY LANE (gated, deterministic, server-only)
            ┌──────────────────────────────────────────┐     ┌────────────────────────────────────────────┐
   action → │ Sparks (อาจสุ่ม ×2/jackpot) · badge ·      │     │  SEAM-1: COGS-cap → fraud-gate → solvency    │
            │ tier · streak · leaderboard · cosmetic     │     │            ↓ (pass ทั้ง 3)                     │
            │ (non-transferable)                         │     │          grant_coins → coin_lot (expiring)    │
            └───────────────┬──────────────────────────┘     └───────────────▲────────────────────────────┘
                            │ ปลดได้แค่ "ACCESS"                               │ ต้อง DETERMINISTIC + identity re-check
                            └─────────────────────────────────────────────────┘
                              ✗ ห้าม: สุ่ม→Coin · client→mint · cosmetic-สุ่ม→Coin · latency-race→Coin
```

---

### 1.2 The 3-Tier Classification Framework — กฎเส้นทางของทุก feature

ทุก feature ใน layer นี้ **ต้องติด tag 1 ใน 3** ก่อน spec. tag กำหนด "เส้นทาง engineering + sign-off" ของ feature นั้น.

| Tag | นิยาม | เส้นทาง / ใครต้อง sign-off | ship ได้เมื่อ |
|---|---|---|---|
| **[PURE-FLUTTER]** | client/Sparks-only, ไม่แตะ Coins/มูลค่าจริง, ผลลัพธ์ทั้งสาย downstream = Sparks/cosmetic เท่านั้น (invariant #6), ไม่เผย personal data ใหม่ | Flutter + `spark_events` + Supabase Realtime. ไม่ต้องผ่าน money-plane | ship freely (ผ่าน a11y §1.7 + reduced-motion + i18n review) |
| **[SERVER-GATED]** | แตะ Coins หรือ real-world reward (mint/unlock/redeem) **ไม่ว่าโดยตรงหรือผ่านตัวกลาง** | **ต้อง route ผ่าน SEAM-1 universal mint-gate** (NestJS edge fn เดียว) | เมื่อ `cogs_budget_cap` ถูก set (B1/B2 BLOCKING) + fraud-gate wired (รวม group/cluster edge §1.5) |
| **[LEGAL-CHECK]** | (a) random/chance reward ของ**มูลค่าจริง** — **รวมผลสุ่มที่เป็น input ของ Coin แม้ผ่าน cosmetic (invariant #6)**; (b) **การจัดสรรมูลค่าจริงที่ผลขึ้นกับโชค/จังหวะ ไม่ใช่ skill/effort** — เช่น first-N latency race, community-vote-decided prize; หรือ (c) sensitive-social (friends graph, location-social, activity feed, profile exposure, contacts/BLE-nearby, sacred-site check-in) | gambling/lottery counsel (a/b) และ/หรือ PDPA DPO (c) sign-off **ก่อน** build. **random real-value = BLOCKED จนได้ ม.8 permit จริง** (§1.4) | หลังได้ legal opinion **+ permit (กรณี random/chance)** + server-authoritative + transparent odds + sponsor-funded + feature-flag default OFF ผูก tracker (C11/C12/C13) |

> **หมายเหตุ:** tag ซ้อนกันได้ — feature หนึ่งอาจเป็นทั้ง [SERVER-GATED] + [LEGAL-CHECK] (เช่น lucky-draw ที่จ่าย Coin จริง: ต้องทั้ง route money-gate **และ** ผ่าน gambling sign-off). ใน feature table ของ section อื่น ให้ติด tag ที่เข้มที่สุดที่ใช้บังคับ และ note tag รองในคอลัมน์ "why".

#### Decision rule (flowchart — แปะหัวทุก feature design, ★ ปรับ v2: เพิ่มสาขา transitivity + latency-race + vote)

```
                ┌────────────────────────────────────────────────────────┐
                │  feature นี้ AWARD อะไร / จัดสรรอย่างไร / เผยข้อมูลอะไร?  │
                └──────────────────────────┬─────────────────────────────┘
                                           │
        ┌──────────────────────────────────┼───────────────────────────────────┐
        ▼                                   ▼                                   ▼
 รางวัล/ผลลัพธ์แตะ Coins หรือ          รางวัล = Sparks/badge/cosmetic       เผย personal data ใหม่?
 real-world value? (โดยตรง หรือ        เท่านั้น และ downstream ทุกตัว         (friends/location/feed/
 ผ่าน cosmetic ที่ไป unlock —          ก็ Sparks/cosmetic? (invariant #6)    profile/contacts/BLE/
 invariant #6)                              │                               sacred-site)
        │                                   ▼                                     │
   ┌────┴───────────────┐            ┌──────────────────┐                   ┌────┴────┐
   ▼                    ▼            │ ตัดสินบน client/   │                   ▼         ▼
 จัดสรรอย่างไร?     DETERMINISTIC    │ Supabase ได้       │                 YES        NO
   │               -by-effort?       │ (client RNG ok     │                  │         │
   ▼                    │            │ เพราะไม่ gate value)│                  ▼         ▼
 RANDOM / chance /      ▼            │   YES → ✅          │            [LEGAL-CHECK]  (กลับซ้าย
 latency-race /     [SERVER-GATED]   │ [PURE-FLUTTER]     │             + PDPA gate    ดูชนิด
 vote-decided?      route SEAM-1     └──────────────────┘             (consent/       รางวัล)
   │                mint-gate                                          visibility/
   ▼                                                                   §1.5/§1.6)
[LEGAL-CHECK] + [SERVER-GATED]
 route SEAM-1 mint-gate
 + gambling sign-off + ม.8 PERMIT
 (server-RNG, transparent odds,
  sponsor-funded, flag OFF)
```

**กฎเดียวที่จำง่าย:** *"แปรผันได้ฟรีบน Sparks · ของจริงต้องผ่านประตู (deterministic-by-effort) · สุ่มของจริง/ฟอกผ่าน cosmetic/แข่ง latency/ตัดสินด้วยโหวต/เผยตัวตน = หยุดถามทนายก่อน."*

#### SEAM-1 touchpoint (สิ่งที่ [SERVER-GATED] ทุกตัวต้องเรียก)

ทุก feature ที่จ่าย Coin จริง **ห้าม post ledger เอง** — ต้องเรียก single edge fn ของ money-plane ที่ embed gate เรียงลำดับ (doc 02b §A2.5):

```
(1) reward-COGS cap (A2.4: per-redemption ≤ REWARD_PER_REDEMPTION_CAP_THB
                     + Σ(merchant month) ≤ MERCHANT_MONTHLY_COGS_CAP_THB)
                          ↓
(2) fraud-gate (A.8.12 anti-self-redemption + identity-cluster edge
                + A.8.13 Sybil/farming cap + velocity
                + ★ group-membership → identity-cluster edge (BLOCKING wired input, §1.5)
                + ★ recurring-quest cooldown / per-merchant-per-cluster velocity cap)
                          ↓
(3) per-funder settled-solvency (A.8.5 + A.8.11) — ไม่มี settled THB = REJECT
```

> **★ visibility ≠ fraud-gate coverage (doc 02b §A2.9-#2, critical):** การ "เห็น" ความสัมพันธ์ (group membership, identity edge) ใน analytics **ไม่นับเป็นการป้องกัน** จนกว่าจะ **wire เป็น input จริงของ step (2) ที่เวลา mint**. ทุก edge ที่ §1.5 ระบุว่า "เชื่อม fraud-gate" = BLOCKING ก่อน enable [SERVER-GATED] feature ที่อาศัยมัน.

> **inert-until-sized (BLOCKING):** `REWARD_PER_REDEMPTION_CAP_THB` (B1) และ `MERCHANT_MONTHLY_COGS_CAP_THB` (B2) ยังไม่ถูก set → gate **fail-closed REJECT** ทุก mint path. แปลว่า **ทุก [SERVER-GATED] engagement feature เปิดไม่ได้จนกว่า founder เคาะ cap** (doc 02b §A2.4 / OPEN_DECISIONS B1/B2). [PURE-FLUTTER] เปิดได้เลยไม่ต้องรอ.

> **prize-income / withholding (out-of-money-gate, ชี้ทางลง S4):** รางวัลมูลค่าจริงจาก contest เกิน threshold + creator Coin-payout ซ้ำ ๆ อาจเป็นเงินได้พึงประเมิน → **withholding + recipient classification ต้องจัดการที่ S4 payout** (ไม่ใช่ที่ mint-gate). เปิด tracker **C14** (prize/creator-payout tax) — ดู §1.7. *(framework แค่ชี้ pointer; รายละเอียด tax อยู่ doc 02/02b/S4, ไม่ขยายในนี้ — §1.8 reject.)*

---

### 1.3 Engagement Loop Model — Trigger → Action → Variable Reward → Investment (บน Sparks + content + social + contribution)

ใช้โครง Hook ของ Nir Eyal แต่ **เติม guardrail จริยธรรม** (§1.4) ทุกขั้น และ map กับ primitive ที่ออกแบบไว้แล้ว (tiers/badges/streaks/passport/leaderboard). **★ v2 — แก้ "hollow points":** variable reward ของ *quantity* ("25 vs 50 Sparks") เป็นรูปแบบที่อ่อนที่สุด; loop ต้องมี variable reward ของ **CONTENT / SOCIAL / CONTRIBUTION** ด้วย ไม่งั้นกลายเป็นลู่วิ่งสำหรับ local ที่เล่นยาว.

| ขั้น | กลไก | mapping กับของที่มีแล้ว | tag |
|---|---|---|---|
| **1. Trigger** | external: push/LINE notify, geofence "คุณอยู่ใกล้ Quest Step", streak-reminder (**≤1 ครั้ง/วัน, ก่อน ~20:00, quiet-hours**, §1.4). internal: นิสัย "เปิดดู Passport ตอนนั่งคาเฟ่" | seasonal passport FOMO countdown (จำกัดด้วย aggregate-pressure budget §1.4), streak reminder, neighborhood leaderboard ping | [PURE-FLUTTER] (push opt-in = [LEGAL-CHECK] PDPA) |
| **2. Action** | check-in (QR/geofence), เขียน review, ทำ agent-task, เยือน Quest Step, แชร์, react, **ทิป/contribution สั้น (fixed-field) ต่อ 1 ร้าน** | `spark_events.reason ∈ {checkin, review, task, referral, tip}` | [PURE-FLUTTER] (tip = UGC → moderation S5) |
| **3. Variable Reward — quantity** | **เซอร์ไพรส์บน Sparks เท่านั้น:** Sparks ปกติ + โอกาส "✦ bonus Sparks วันนี้ ×2", "first-check-in-of-the-day jackpot Sparks", mystery-badge progress | Sparks-gain animation (doc 06 §1.6 — เบากว่า coin, violet, ไม่มีเสียงเงิน), badge unlock, stamp-collect thud | [PURE-FLUTTER]. **ถ้ารางวัลแปรผันเป็น Coin จริง หรือ cosmetic-สุ่มที่ไปปลด Coin → [SERVER-GATED]+[LEGAL-CHECK] (invariant #6)** |
| **3b. ★ Variable Reward — CONTENT (ใหม่)** | check-in ปลด *เนื้อหาเฉพาะที่*: เกร็ดล้านนา/คำเมือง 1 คำพร้อมคำแปล, ทิปบาริสต้า, เมนูซ่อน, **stamp ARTWORK เฉพาะร้าน (artist-collab)** → ทุกครั้งที่มา = เผยอะไรใหม่ ไม่ใช่แค่ตัวเลขขึ้น | content pipeline (ต้อง spec ใน §2 — ถ้าไม่มี pipeline ป้อน novelty, loop = treadmill) | [PURE-FLUTTER] (content review) |
| **3c. ★ Variable Reward — SOCIAL (ใหม่)** | เซอร์ไพรส์ทางสังคมที่ไม่เก่า: "มีคนใน cohort เชียร์ streak คุณ", "เพื่อนเพิ่งแซงคุณ" — เด้งเป็น dopamine | scoped leaderboard + cheer (opt-in §1.5) | [PURE-FLUTTER] (social = [LEGAL-CHECK] PDPA baseline §1.5) |
| **4. Investment** | user "ลงทุน" สะสมที่ทำให้กลับมา: progress สู่ tier ถัดไป, badge case ที่เกือบครบ, streak ที่ไม่อยากเสีย, passport ที่เหลืออีก 2 แสตมป์, อันดับ leaderboard, **+ contribution identity** ("ทิปของคุณช่วยผู้มาเยือน 12 คน", title "ผู้รู้ย่านนิมมาน") | tier ladder, badge collection, streak counter, seasonal passport, scoped leaderboard, **contribution/creator recognition** (pull เข้า MVP/V1 แบบ curated, §1.8) | [PURE-FLUTTER] |

**Determinism boundary ของ loop (critical):** ขั้น 3 "variable reward" คือหัวใจของความสนุก — และเป็นจุดที่อันตรายที่สุด. กฎ: **variable/surprise = Sparks/content/social เสมอ.** ถ้า loop ปลายทางจะปลด Coin จริง ต้องเป็น **deterministic milestone** ("ครบ passport → ได้กาแฟฟรี" ผ่าน money-gate) ไม่ใช่ "หมุนลุ้นกาแฟ" และไม่ใช่ "ใครเช็คอินเร็วสุด X คนแรกได้". เซอร์ไพรส์ที่ผู้ใช้รู้สึก = Sparks/เนื้อหา/สังคมที่เด้งเกินคาด; ของจริง = รางวัลที่ "การันตีเมื่อทำสำเร็จ".

#### ★ Zero-state tourist hook (ใหม่ v2 — แก้ "fast-win ที่จริง ๆ ช้า")

ทัวริสต์ 3 วันมักทำ collectible set ไม่ครบ และ headline reward (กาแฟฟรี) เป็น deterministic เฉพาะตอน *ครบ set* → "fast collectible win" กลายเป็น slow. แก้:
- **single-stamp = shareable ทันที:** check-in *ครั้งแรกครั้งเดียว* mint artifact สวย ๆ ติดสถานที่ ("ฉันอยู่เชียงใหม่" Lanna postcard + งานศิลป์ของร้าน), แชร์ RED/WeChat/LINE ได้ใน 1 แตะ **โดยไม่ต้อง opt-in social, ไม่ต้องครบ set** (no Coin/baht บน artifact — กัน e-money signal, doc 06).
- **3-stop starter trail** (คาเฟ่ + วัด + ตลาด) จบได้ในบ่ายเดียว → ได้ **deterministic small real reward** 1 ชิ้นในวันแรก (ผ่าน money-gate).
- pull share-card path เข้า **MVP** ไม่ใช่ V1.

ตัวอย่างเชียงใหม่ (loop เต็ม):
> **trigger** geofence ping ตอนเดินผ่าน Soi 9 นิมมาน → **action** สแกน QR เช็คอินที่ Graph Café → **variable reward (quantity)** ✦ 25 Sparks + วันนี้สุ่มได้ "☀️ Afternoon Hopper bonus ×2 = 50!" → **variable reward (content)** ปลดคำเมือง "ลำขนาด = อร่อยมาก" + stamp artwork เฉพาะร้าน → **investment** เหลืออีก 1 แสตมป์จะครบ *Nimman Cafe-Hop passport* (ครบแล้ว = **deterministic** unlock ขนมอบฟรี ผ่าน money-gate, ไม่ใช่หมุนลุ้น, ไม่ใช่ X-คนแรก) → อยากกลับพรุ่งนี้.

---

### 1.4 Ethical Gamification Guardrails — สนุกจริง ไม่ใช่กับดัก

> หลักภาพรวม: **drive habit + genuine fun, ไม่ใช่ addiction-harm.** แบรนด์เป็น "collectible สนุก" ไม่ใช่ "เกมพนัน" และไม่ใช่ fintech แข็ง (doc 06 §1.1).

| กฎ | สิ่งที่ทำ | สิ่งที่**ห้าม**ทำ |
|---|---|---|
| **Forgiving streaks** (★ spec รูปธรรม §ล่าง) | **weekly-consistency model** ("5 of 7 วัน") ไม่ใช่ unbroken-daily → ตัด single-miss cliff; **auto-freeze** (ระบบใช้เอง ไม่ต้องกดจำ) ≥1/สัปดาห์; **48h streak-repair**; streak ยาว = ปลด badge (Sparks) ไม่ใช่ Coin | streak พังทันทีพลาดวันเดียวแล้วเริ่มศูนย์, ลงโทษด้วยการ "ริบ" ของที่ได้มาแล้ว, freeze ที่ต้องกดเองจนคนวิตกพลาด, freeze ราคาแพง/ถูกจน farm ได้ |
| **No real-money pay-to-win** | จ่ายเงิน (subscription merchant-side) ซื้อได้แค่ *ความสะดวก/visibility* ของร้าน. ผู้ใช้ **ไม่มี** การซื้อ Coins/Sparks ด้วยเงินสด. **★ paid placement ต้องติดป้าย "Sponsored/โปรโมต" ชัดทุกที่ที่เงินร้านมีผลต่อสิ่งที่ผู้ใช้เห็น** (featured quest/trail/festival) | ขาย Sparks/Coins/tier/อันดับ leaderboard ด้วยเงินจริง, loot-box ที่จ่ายเงินซื้อโอกาส (= ทั้ง pay-to-win + พนัน), **paid placement แทรกเข้า curated cultural collectible set** (ดู firewall ล่าง) |
| **Healthy FOMO เท่านั้น** (★ + aggregate budget) | seasonal FOMO ผูกกับ *เหตุการณ์จริง* (Yi Peng/ลอยกระทง/ปี๋ใหม่เมือง) ที่หมดจริงตามฤดู + softener "กลับมาได้ปีหน้า". **★ aggregate-pressure budget:** จำกัดจำนวน countdown/urgency surface ที่ผู้ใช้เห็นพร้อมกัน + **"calm mode"** ซ่อน countdown/live-counter ได้ (collection ยังอยู่ครบ) | countdown ปลอม/รีเซ็ตวนเพื่อเร่ง, scarcity ปลอม, dark-pattern "เหลือ 3 ที่!" ที่ไม่จริง, **ล้อมผู้ใช้ด้วยนาฬิกานับถอยหลัง/ตัวนับสดทุกจอพร้อมกัน** (urgency-anxiety แม้แต่ละอันจริง) |
| **Anti-addiction caps** | **diminishing returns**: Sparks ต่อ action ลดลงเมื่อทำซ้ำถี่ผิดปกติในวันเดียว (soft cap รายวัน), ไม่มี mechanic ที่ reward การเปิดแอปทั้งวัน, **"พอแล้ววันนี้ 🌙" nudge ต้องยิงจริง** (trigger = เกิน soft-cap action/วัน) | infinite-scroll reward, variable-ratio ที่ออกแบบให้เสพติด, แจ้งเตือนกระตุ้นกลางดึก |
| **Transparent & honest** | odds/เงื่อนไขรางวัลโชว์ชัด, "ได้ Sparks เพราะ X", ไม่มีค่าซ่อน | mechanic ที่ผู้ใช้ไม่เข้าใจว่าทำไมได้/เสีย, การ์ดสุ่มที่ปกปิด odds |
| **Sparks ≠ เงิน (ตอกย้ำ)** | ทุก Sparks surface มีคำ "สะสมเลื่อนระดับ · แลกของไม่ได้" (doc 06 §1.2) | สื่อว่า Sparks มีมูลค่า, แปลง Sparks→บาท/Coin โดยตรง (ไม่มีสะพานข้าม ledger — doc 02 §A.4) |
| **★ No-gambling-for-value (ตอกย้ำ legal)** | random real-value mechanic ทุกตัว **BLOCKED จนกว่าจะได้ ม.8 permit จาก กรมการปกครอง + legal sign-off on file** — *แม้ free entry / sponsor-funded ก็ยังต้องขออนุญาตก่อน* (ม.8 ชิงโชค/แถมพก). feature-flag default OFF, ผูก tracker C11/C12, build-time enforce ว่า flag เปิดไม่ได้ถ้าไม่มี approval reference | ปฏิบัติกับ "sponsor-funded + free entry" เหมือนเป็น GO/ship-ready, เปิด draw ด้วยแค่ legal opinion โดยไม่มี permit |

#### ★ Streak contract (รูปธรรม — แก้ "asserted ไม่ใช่ designed" + reconcile contradiction)

- **โมเดล = weekly consistency** ("ทำ 5 ใน 7 วัน" ติดต่อกัน) ไม่ใช่ "ต่อเนื่องทุกวัน" → พลาด 1 วันไม่มี cliff.
- **auto-freeze**: ระบบใช้ให้อัตโนมัติเมื่อพลาด (ไม่ต้องกด), อย่างน้อย **1/สัปดาห์**.
- **streak-repair window 48h**: re-engage ภายใน 48 ชม. คืน streak.
- **freeze ซื้อด้วย Sparks** = **ราคาคงที่ต่ำ + cap รายเดือน** → กัน farm ให้ freeze ไร้ความหมาย และกัน punish-anxiety.
- **decouple retention จาก streak**: พลาด streak **ห้าม zero สิ่งที่สำคัญ** (tier/badge/collection ไม่หาย).
- **reminder push = 1 ครั้ง/วัน, gentle, ก่อน ~20:00, มี hard quiet-hours** — แก้ contradiction กับข้อห้าม "reward การเปิดแอปทั้งวัน / late-night nudge". streak ที่ปลอดภัยต้อง *ไม่* บีบให้เข้าทุกวันแบบ compulsive.

> **กฎ celebration-honesty (จาก doc 06 §1.6):** first-stamp (activation moment) **ต้องรอ server-confirm ก่อนเล่น confetti/haptic** — ห้ามฉลองแล้ว rollback. ดีกว่าไม่เคยให้. ใช้ provisional "กำลังบันทึกแสตมป์…" ระหว่างรอ. หลักนี้ขยายไปทุก reward จริง: **ไม่ฉลองมูลค่าที่ยังไม่ commit** — รวมถึง spin/scratch: **animation = cosmetic, ไม่ authorize การ mint; mint เกิดที่ server ตอน draw แล้ว client แค่เปิดผล** (ผูก single-use draw token + idempotency, รายละเอียด §4).

> **★ Firewall (paid visibility):** paid visibility เพิ่ม *reach* ได้ แต่ **ห้ามซื้อเข้า curated cultural collectible set** — core neighborhood collectible set ต้อง editorially-curated / pay-neutral เพื่อรักษาสัญญา "authentic local discovery". ทุกจุดที่เงินร้านมีผล = ต้องมีป้าย sponsored ที่ผู้ใช้แยกออกจาก organic ได้.

> **★ Leaderboard ethics (เชื่อม §1.5 anti-toxicity + §2.2):** relegation/demotion = soft เสมอ ("คุณลงมา Silver — นี่คือวิธีไต่กลับ") ไม่มี loss-animation; league ล่างสุดพิจารณา promotion-only; **velocity-freeze ต้องมี state "อันดับกำลังตรวจสอบ" + self-serve appeal** ไม่ silent shadow-remove superfan จริง (PDPA fairness/transparency).

---

### 1.5 PDPA-for-Social Baseline — กฎพื้นฐานของทุก social feature

> social feature เผย personal data (friends graph, leaderboard, activity feed, profile, location, contacts) → ทุกตัวเป็น **[LEGAL-CHECK]** ขั้นต่ำ และต้องผ่าน baseline นี้.

| หลัก PDPA | implementation baseline (บังคับทุก social feature) |
|---|---|
| **Consent (opt-in)** | social = **opt-in เสมอ ไม่ใช่ opt-out**. default ของบัญชีใหม่ = private/solo. การเข้า leaderboard/feed/friends ต้องกด consent แยก (granular) พร้อม primer อธิบายว่าใครเห็นอะไร |
| **Visibility controls** | ทุก profile มี scope: **Private / Friends / Neighborhood / Public-pseudonymous**. leaderboard เข้าร่วมแบบ pseudonymous (display name + avatar ที่เลือกเอง) ได้ — ไม่บังคับชื่อจริง. ปิดการมองเห็นได้ทุกเมื่อ |
| **Data minimization** | เผยเท่าที่ feature ต้องการ: leaderboard โชว์ **Sparks/activity rank** ไม่โชว์ check-in history ดิบ, ไม่โชว์ตำแหน่ง real-time/live-dot พิกัด. activity feed = opt-in + เลือกได้ว่าแชร์ event ไหน |
| **★ Friend-add = QR/username/hashed-contacts เท่านั้น (V1); ไม่มี BLE "คนใกล้คุณ"** | **resolve contradiction → ยึดท่าทีเข้มของ §5.2/§5.5:** V1/MVP **ตัด BLE/nearby-people discovery ออก** (real-time proximity = surface PDPA อ่อนไหวสุด). ถ้าจะรื้อฟื้นภายหลัง → **DPO sign-off เฉพาะ + double opt-in + ephemeral coarse (ระดับย่าน) + no persistence + `consent_purpose` เฉพาะ**. ในตาราง feature ให้ mark **F1 "Nearby" = DEFERRED/BLOCKED** กันหลุด ship ใต้ wording หลวมของ §2.1 |
| **★ Hashed-contacts matching (no graph of non-users)** | client hash SHA-256+salt ดีตรงไม่เก็บ phonebook ดิบ — **แต่ shared salt ทำให้ correlate ข้ามผู้ใช้ → สร้าง social graph ของคนที่ไม่ยินยอม (รวม non-user) ได้ = ผิด data-minimization + firewall "เก็บ fact ไม่เก็บ graph".** baseline: **per-request ephemeral matching เท่านั้น (ไม่ persist contact-hash set), ไม่ correlate hash ข้ามผู้ใช้, ห้ามสร้าง edge ไปยัง non-user, consent granular แยก** — hash ถูกคำนวณแล้ว discard ไม่เก็บเป็น graph. DPO sign-off ต้องครอบ "การออกแบบ hash-match + salt rotation" ไม่ใช่แค่ "เราแฮชแล้ว" |
| **Location = sensitivity สูงสุด** | location-based social = **double opt-in + ephemeral + coarse** (ระดับย่าน ไม่ใช่พิกัด), ปิด default, ไม่เก็บ trail. ต้อง DPO sign-off เฉพาะ. **cross-border (C7): location-social sensitive พิจารณาย้าย in-TH ก่อน enable — ห้ามปล่อย drift** |
| **Blocking & harassment** | ทุก social surface มี **block / report / mute** + moderation queue (เชื่อม moderator console doc 07 / S5). blocked = หายจาก leaderboard/feed/friend ของกันและกัน. **silent suppression (block-effect, velocity-freeze) ต้องมี notice + appeal** (PDPA fairness) |
| **Erasure / DSAR** | social data ต้องลบได้ตาม `cs_open_obligations` gate (doc 02b §A2.6.1 — fail-closed). Sparks rebuild ได้จาก event log; ลบ social graph แยกได้โดยไม่กระทบ money-ledger |
| **Cross-border (C7)** | Supabase SG region + DPA + s.29 SCC + encryption (OPEN_DECISIONS C7). location/social ที่ sensitive พิจารณาย้าย in-TH ภายหลัง |
| **★ UGC bystander (photo/contest)** | รูปในที่สาธารณะเชียงใหม่จะติดบุคคลที่สาม → **on-device face-blur = MANDATORY ก่อน submit (ไม่ใช่ optional)** + consent เผยแพร่ subject ที่ระบุตัวได้ต้อง explicit. ผูก tracker C13 (BLOCKING-GA) |

#### Anti-gaming baseline — engagement metric ต้องต้านการ farm

> Sparks ฟรี → ถ้า farm ได้ง่าย จะทำให้ leaderboard/tier ไร้ความหมาย **และ** (สำคัญกว่า) ถ้า Sparks ปลด access สู่ [SERVER-GATED] reward → การ farm Sparks กลายเป็น vector ไป mint Coin. baseline:

| vector farming | การป้องกัน (baseline) |
|---|---|
| **เช็คอินรัว/ปลอม** | check-in ต้อง **geofence + server-confirm + nonce QR** (rotating, doc 05). Sparks ที่ award จริงเด้งหลัง confirm เท่านั้น (ไม่ optimistic บน event ที่ award จริง) |
| **multi-account / Sybil** | ผูก **A.8.13 Sybil/farming cap** (per-device/KYC/campaign) — เดียวกับที่ป้องกัน Coin. social action ต่อ identity-cluster มี velocity cap |
| **self-dealing (review/social farm)** | rate-limit + diminishing returns รายวัน (§1.4), trust-tier gate (review/activity จาก `verified_visit`+ เท่านั้นจึงนับเต็ม, ตรง doc 02 take-rate gate), anomaly detection ป้อน fraud-gate |
| **★ leaderboard manipulation + verified-tier ranking** | scoped leaderboard (neighborhood/friend, cohort ≤30) ทำให้ collusion ระดับเมืองไร้ผล; **ranking นับเฉพาะ Sparks จาก verified-tier (T2+/`verified_visit`) — soft/optimistic Sparks (gps_dwell) เข้า tier/fun แต่ถูก exclude/down-weight จากอันดับ** (กัน soft check-in ปั๊มอันดับถูก ๆ); cohort segment ด้วย **tenure/activity-band ไม่ใช่แค่ภูมิศาสตร์** (ทัวริสต์แข่งทัวริสต์, มือใหม่แข่งมือใหม่) |
| **★ group-quest / colluding-merchant collusion (critical)** | **min_trust `verified_visit` พิสูจน์ "มาจริง" แต่ไม่พิสูจน์ "ไม่ self-deal".** ป้องกัน: (1) **group-membership → identity-cluster edge เป็น BLOCKING wired input เข้า SEAM-1 step 2** (ไม่ใช่แค่ analytics — visibility ≠ coverage, §A2.9-#2); (2) **per-merchant-per-correlated-cluster velocity cap + recurring-quest cooldown** กัน ring เดิม (4 เพื่อน + คาเฟ่สมรู้) เก็บเกี่ยว "กาแฟฟรีคนละแก้ว" ซ้ำทุกรอบ; (3) **merchant-side anti-self-redemption** (ขยาย A.8.12 ไปฝั่ง funder) — flag ร้านที่ redemption กระจุกจาก recurring identity cluster เดียว |
| **★ collective / instant Sparks batch = farm amplifier (major)** | collective city-goal Sparks bonus (batch grant ทุก participant) + referral "Sparks instant ทั้งสองฝั่ง" = farm ได้ด้วย N บัญชีปลอม → เร่งทุกบัญชีเข้า access ของ Coin-quest. baseline: **batch/collective + instant Sparks grant ต้องผ่าน A.8.13 Sybil/velocity check ต่อผู้รับ (suppress duplicate ใน cluster เดียว)**; **invite-Sparks มี cap ต่อ inviter/วัน + ต่อ cluster และผูกกับ "invitee ทำ verified action จริง" ไม่ใช่แค่ signup**; และ **access ที่ปลดด้วย Sparks ไม่เคย bypass SEAM-1 fraud-gate ตอน mint Coin** |
| **Sparks → Coin bridge ผ่าน access** | **single mint path (SEAM-1):** แม้ farm Sparks สำเร็จ → ปลดได้แค่ *สิทธิ์เข้าถึง* quest; การ mint Coin ยังต้องผ่าน cogs-cap + fraud (รวม cluster/group edge) + solvency อยู่ดี. Sparks ไม่เคยจ่าย Coin โดยตรง (doc 02 §A.4) |

> **invariant ของ layer นี้:** "farm Sparks ได้ ก็ farm ความสนุก/ป้ายได้ — แต่ farm **มูลค่าจริงไม่ได้** เพราะทุกบาทผ่าน money-gate เดียว **และ identity ถูก re-check ที่ mint (ไม่ใช่แค่ตอนปลด access)**." นี่คือเหตุผลที่ doctrine §1.1 ทำให้เรา generous กับ Sparks ได้โดยไม่กลัว farming ทำเงินรั่ว — **แต่ generosity นั้น valid ก็ต่อเมื่อ batch/instant/collective grant ทุกตัวผ่าน Sybil cap (ข้างบน) และ access-gate re-check identity ที่ mint.**

---

### 1.6 Cultural-Respect & Sacred-Site Guardrails — ล้านนาแบบมีราก, ไม่ใช่สกินทัวริสต์

> **★ ใหม่ v2 (จาก critique cultural authenticity + sacred-site legal):** cultural layer ต้องมี *ราก* ไม่ใช่แค่ naming skin (ปฏิทินเทศกาล 5 อย่างที่ทุกแอปผิวเผินลิสต์). authenticity = moat กันคู่แข่ง generic.

| หลัก | สิ่งที่ทำ | สิ่งที่ห้าม |
|---|---|---|
| **คำเมือง / ตัวเมือง (Lanna)** | title/stamp copy ใส่คำเมืองพร้อมคำแปล (สอนนิดหน่อยทุกครั้งที่มา), พิจารณา **ตัวเมือง (tua mueang)** เป็น collectible motif | ใช้ภาษากลาง/อังกฤษล้วนแล้วแปะชื่อเทศกาลเป็นสกิน |
| **craft economy จริง** | "craft trail" collectible ผูกเศรษฐกิจช่างจริง (ร่ม บ่อสร้าง/สันกำแพง, เงินวัวลาย, เซรามิก) → ดึง footfall ไปหา maker ไม่ใช่แค่คาเฟ่ | ลิสต์เฉพาะคาเฟ่/จุดถ่ายรูปดัง |
| **★ sacred-site respect (ethical + LEGAL-CHECK)** | temple loop: check-in **ปลด etiquette guidance** (การแต่งกาย, เงียบ, ไม่หันหลังให้พระประธาน) + **geofence ที่ลานวัด ไม่ใช่พระอุโบสถ/เขตศักดิ์สิทธิ์**; **ต้องมี temple/Sangha consent/partnership ก่อน** — ไม่ monetize/gamify พื้นที่ศักดิ์สิทธิ์โดยไม่มี buy-in (เสี่ยง reputational + regulatory). จัดเป็น **[LEGAL-CHECK]** (consent gate) | gamify check-in วัดที่ใช้งานจริงโดยไม่ขออนุญาต, ส่งคนไปทำพฤติกรรมไม่เหมาะในเขตศักดิ์สิทธิ์เพื่อล่าแสตมป์ |
| **reframe เทศกาลตามความหมายล้านนา** | Songkran = **ป๋าเวณีปี๋ใหม่เมือง / รดน้ำดำหัวผู้ใหญ่** (elder-blessing) ไม่ใช่ "Survivor" water-fight cliché; Yi Peng/อินทขิล ใช้ความหมายจริง | title แบบ "Songkran Survivor" ที่ลดทอนเป็นมุก foreigner |

> ดำเนินการ: ดึง **Northern Thai cultural consultant + partner กับช่าง/วัดโดยตรง** ก่อน ship loop ที่แตะวัฒนธรรม/ศาสนา.

---

### 1.7 Accessibility Baseline (engagement surfaces ใหม่)

> base design system มี a11y discipline แล้ว (reduced-motion, screen-reader 3 ภาษา, haptic-off, first-stamp provisional — doc 06 §1.6/§1.7). engagement layer **inherit** ทั้งหมด **+ เพิ่ม spec ต่อ surface ใหม่** (ไม่งั้นมี surface ที่ a11y ไม่ครอบ):

| surface ใหม่ | a11y baseline (บังคับ) |
|---|---|
| **leaderboard rank-change (AnimatedList)** | ประกาศผ่าน semantics "คุณขยับไปอันดับ 11" — ไม่ใช่แค่ animation |
| **live participation counter** | ประกาศ **เฉพาะ milestone ที่ข้าม** ไม่ใช่ทุก tick ("+37" รัว ๆ = hostile กับ screen reader); ทำให้ celebratory-on-arrival ไม่ใช่เกจกดดันที่เดินตลอด |
| **spin/scratch reveal** | มี **"แตะเพื่อเปิดผล" เสมอ** (blind user ขูดไม่ได้) + ประกาศผล; reduced-motion = reveal-direct (กรอบเป็น a11y ไม่ใช่แค่ motion) |
| **collectible locked/earned** | ใช้ **icon/label ระบุ locked vs earned ชัด — ห้ามสื่อด้วยสี/ความสว่างอย่างเดียว** (Sparks=violet, glow vs shadow ต้องมี non-color indicator) |
| **gyro foil sheen** | มี **tap-to-shimmer fallback** สำหรับคนที่เอียงเครื่องไม่ได้/ตั้ง mount (เกินกว่าแค่ reduced-motion) |
| **cognitive a11y** | เศรษฐกิจมีหลายระบบซ้อน (Sparks/Coins/cosmetic/tier/league) → มี **plain-language "ระบบนี้ทำงานยังไง"** และหลีกเลี่ยงบังคับให้ผู้ใช้ track หลาย "สกุล" พร้อมกัน |

#### OPEN_DECISIONS ใหม่ที่ section นี้เปิด (ต้อง add เข้า tracker)

| # | ประเด็น | จุดยืน | ผูกกับ |
|---|---|---|---|
| **C11** | ม.8 permit สำหรับ random real-value mechanic (spin/scratch/lucky-draw/mystery referral Coin) | **BLOCKED** จนได้ permit จริง + sign-off; flag default OFF, build-time enforce approval ref | §1.2/§1.4, gambling §1.8 |
| **C12** | จับสลากผู้โชคดี / number-ticket draw (พ.ร.บ.สำนักงานสลากฯ เกิน ม.8) | **BLOCKED** เช่น C11 + ตรวจ lottery-law แยก | §1.2 |
| **C13** | UGC photo contest — bystander face-blur mandatory + publish-consent + community-vote-real-value | **BLOCKING-GA**; community-vote ตัดสินมูลค่าจริง = neutral-judge หรือจำกัด vote ให้ได้แค่ Sparks/badge | §1.2/§1.5 |
| **C14** | prize-income / creator-payout withholding-tax | จัดการที่ S4 payout (out-of-money-gate) — pointer เท่านั้น ใน framework | §1.2 |

---

### 1.8 สรุป rulebook + reject log (สิ่งที่ section อื่นต้องเชื่อฟัง)

**Rules (บังคับทุก section):**
1. **แปรผัน/เซอร์ไพรส์/ถี่ → Sparks/content/social เสมอ** (free, no liability, ไม่ใช่พนัน).
2. **ของจริง → deterministic-by-effort + ผ่าน SEAM-1 money-gate** (NestJS, single mint path). ห้ามตัดสิน/mint บน client. **ห้าม latency-race / first-come จัดสรรมูลค่าจริง** — ใช้ "ทุกคนที่ทำครบ X ได้ จนกว่า pool/COGS cap หมด + fallback grant-fail ไม่ใช่หายเงียบ".
3. **สุ่ม + มูลค่าจริง = [LEGAL-CHECK]** — **รวมผลสุ่มที่เป็น input ของ Coin แม้ผ่าน cosmetic (transitivity invariant §1.1 #6).** ถ้าทำ: server-RNG + log `chance_draws` + odds โปร่งใส + sponsor-funded + **ม.8 permit on file (C11/C12)** + flag OFF.
4. **Leaderboard/ranking = Sparks/activity จาก verified-tier (T2+) เท่านั้น** — ห้าม rank ด้วย Coins/เงินถือครอง; soft Sparks ไม่นับอันดับ.
5. **Social = opt-in + visibility control + minimization + block/report + appeal**; location-social/BLE-nearby = sensitivity สูงสุด (V1 ตัด BLE-nearby; hashed-contacts ephemeral-no-graph); sacred-site = consent gate.
6. **Ethical: weekly-forgiving streaks (auto-freeze), no real-money pay-to-win + sponsored-label, honest FOMO + calm-mode, anti-addiction caps, celebration-after-confirm.**
7. **ทุก feature ติด tag [PURE-FLUTTER] / [SERVER-GATED] / [LEGAL-CHECK] ก่อน spec** — [SERVER-GATED] เปิดไม่ได้จน cogs cap B1/B2 ถูก set + group/cluster edge wired; [LEGAL-CHECK] random เปิดไม่ได้จนมี permit.
8. **batch/collective/instant Sparks ทุกตัวผ่าน Sybil cap; access-gate re-check identity ที่ mint; group-membership edge = BLOCKING input เข้า SEAM-1 step 2** (visibility ≠ coverage).
9. **cosmetics/collectibles = non-transferable เด็ดขาด** (zero-liability ก็ต่อเมื่อโอน/ขายต่อไม่ได้). trading/gifting = OFF จนมี gambling+e-money review.
10. **loop ต้องมี variable reward ของ content/social/contribution ไม่ใช่แค่ quantity**; MVP มี zero-state single-stamp shareable + 3-stop starter trail; cultural layer มีรากล้านนา (§1.6).
11. **a11y baseline ต่อ engagement surface ใหม่ (§1.7)** — ห้าม ship surface ที่สื่อด้วยสี/animation อย่างเดียว.

**★ Reject log (critique findings ที่ *ไม่* fold เป็นกฎ framework — พร้อมเหตุผล):**
- **idempotency_key/single-use draw-token, replay no-op, spin→grant atomic reserve (§4.2 hardening):** *reject จาก framework body* → เป็น **feature-spec implementation detail ของ §4**, ไม่ใช่ระดับรัฐธรรมนูญ. framework **คง principle** ("animation = cosmetic, mint ที่ server, server-RNG, log chance_draws") ใน §1.1 #3/#6 + §1.4 celebration-honesty; รายละเอียด key/token อยู่ §4.
- **`leaderboard_snapshots` schema / aggregation SQL (§2.2):** reject (data-model detail). framework คง *กฎ* "verified-tier-only ranking" (§1.5) ให้ §2.2 ไป implement.
- **prize-income withholding deep treatment (C14):** reject deep-dive → critique เองระบุ "out of scope of the money-gate". framework เก็บแค่ **pointer ไป S4 + เปิด tracker C14** (§1.2/§1.7), ไม่ขยาย tax logic ในนี้.
- **per-feature merchant-side recon SQL / fraud-case schema:** reject (S1/S4/S6 owns); framework คงกฎ "merchant-side anti-self-redemption + cluster edge wired" (§1.5) เป็น requirement ให้ subsystem doc implement.
- **specific cohort/league numeric params (≤30, weekly):** คง ≤30/weekly ที่ §1.5/§2.2 ระบุไว้แล้ว เป็น reference; framework ไม่ตั้งตัวเลขใหม่ (เป็น tuning ของ §2.2) — fold เฉพาะ *หลัก* tenure-banding + soft-relegation + appeal.
