# Engagement & Social Layer (Gamification)

> **เวอร์ชัน:** v1 (ผ่าน economy/legal + quality/ethics review) · **วันที่:** 2026-06-14
> ชั้น "ความสนุก/มีส่วนร่วม" ต่อยอดจาก 10 docs เดิม. **หลักการแกน: gamify หนักบน Sparks (ฟรี), Coins/ของจริงต้องผ่าน money-gate เสมอ.** ทุกฟีเจอร์ติดป้าย PURE-FLUTTER / SERVER-GATED / LEGAL-CHECK
> align: doc 02/02b (Sparks/Coins/SEAM-1/COGS cap), doc 05 (Flutter+Realtime+NestJS), doc 06 (design system)

**สารบัญ:** §1 Engagement Economy & Framework · §2 Social & Community · §3 Co-op Quests & Seasonal Collectibles · §4 Variable Rewards, Contests & Legal Line · §5 Flutter Mapping, Screens & Rollout

---

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

---

## 2. Social & Community Features

> **หลักการกำกับของ section นี้ (ยึดตาม guardrails + 10 docs เดิม — locked):**
> 1. **Social layer ทั้งหมดวิ่งบน Sparks (✦ violet `#7C5CFF`) หรือ activity เท่านั้น — ไม่แตะ Coins.** Leaderboard/feed/title/profile ห้าม rank หรือแสดงด้วย Coins (◉ gold `#C9962A`)/มูลค่าบาท (toxic + เป็น e-money signal ที่ ธปท. จับ). อ้าง `SYSTEM_PLAN §3 (Sparks = soft XP, NEVER redeemable)` + `06 §1.2 / §1.7 (ห้ามแสดงเลขบาท face-value คู่ Coin; ◉ = icon-only)`.
> 2. **ทุก reward ที่เป็น Coin/ของจริงจาก social loop (referral/co-op/contest) ต้องวิ่งผ่าน SEAM-1 money-gate เดิม** — edge fn เดียว → (1) reward-COGS cap A2.4 → (2) fraud-gate A.8.12 anti-self-redemption + A.8.13 Sybil + velocity → (3) per-funder settled-solvency (`02b §SEAM-1`). **ไม่มี social feature ใด mint นอก gate, ไม่มีประตูหลัง.**
> 3. **PDPA: เก็บ "fact" ไม่เก็บ "graph"** เป็น posture ที่ locked ทั้งระบบ (`SYSTEM_PLAN §3029`). friends graph เป็น **ข้อยกเว้นที่ user opt-in สร้างเอง** เท่านั้น — minimized, visibility-controlled, ลบได้ และ **ห้ามเอา friends graph / contact-hash / feed ไปป้อน analytics / data-product / movement-graph / H3 aggregate** (firewall เด็ดขาด, ดู §2.0 firewall list).
> 4. **Moderation reuse S5** — report/block/harassment ของ social UGC ใช้ `content_reports` + `moderation_actions` + reason-code taxonomy เดิม (`toxicity_harassment`, `spam_ad`, `pdpa_doxxing`, `defamation`, `impersonation`, `extortion`, `illegal_content`) + shadow-ban + notice-and-action. **ไม่สร้าง moderation engine ใหม่.**
> 5. **3 audiences:** tourist (เก็บแต้มเร็ว, day-one shareable, proof-of-trip) · local/nomad (retention base: streak + leaderboard ย่าน + community + contribution) · Chinese FIT (shareable ออก RED/WeChat).
> 6. **★ INVARIANT — RNG transitivity (locked, จาก economy-critical):** random outcome ใด ๆ ที่เป็น **input สู่การปลด Coin/ของจริง (ตรงหรือ transitive — เช่น "rare cosmetic → ปลด Coin")** ต้องเป็น **server-authoritative RNG, log ใน `chance_draws`, ทั้งกลไก = [LEGAL-CHECK]**. client RNG อนุญาต **เฉพาะ** เมื่อ outcome และ downstream ทุก unlock เป็น Sparks/cosmetic ล้วน และ **ไม่มีวันไป gate ของจริง** (ดู §2.4 V5). cosmetic/collectible = **non-transferable + non-tradable เด็ดขาด** → ไม่มีวันมี secondary-market value (กัน re-import e-money/loot-box ผ่านตลาดมือสอง).

---

### 2.0 Architecture — social อยู่ตรงไหนของ stack

```
 Flutter (consumer)            Supabase                       NestJS money-plane
 ┌───────────────────┐   ┌──────────────────────┐   ┌────────────────────────────┐
 │ Friends / Feed /   │   │ social.* tables       │   │ SEAM-1 edge-fn (single)    │
 │ Leaderboard / Share│◀─▶│ + Realtime channels   │   │  (1) COGS cap (A2.4)        │
 │ Tips / Titles /    │   │ + RLS (visibility)    │   │  (2) fraud-gate:           │
 │  (Rive/Lottie/     │   │ Sparks = int+event log│   │      A.8.12 self-redeem     │
 │   CustomPainter)   │   │ chance_draws (RNG log)│   │      A.8.13 Sybil + velocity│
 └─────────┬─────────┘   └──────────┬───────────┘   │  (3) per-funder solvency    │
           │  Sparks/feed/rank        │ NO Coin write  └─────────────┬──────────────┘
           │  (PURE-FLUTTER)          │ from client                  │ COIN MINT ONLY
           └──────────────────────────┴──────────────────────────────┘
                  referral/co-op/contest Coin → SEAM-1 (SERVER-GATED)
```

- **Sparks-only surfaces** (friends list, feed, leaderboard render, titles, flair, tips, cosmetics) = Supabase + Realtime; client เขียน Sparks event ตรงไม่ได้ — Sparks accrual route ผ่าน server (`spark_reason` enum เดิม: `checkin/review/task/referral/streak_bonus`) แต่ **ไม่แตะ ledger/escrow** (Sparks = integer + event log แยกจาก Coin ledger, `SYSTEM_PLAN §78`).
- **★ Sparks accrual ทุก path (รวม batch/collective/referral instant) ต้องผ่าน A.8.13 per-recipient Sybil/velocity check** — suppress duplicate ภายใน identity-cluster ก่อนเครดิต (กัน multi-account farm Sparks → ปลด access-gated quest, ดู §2.2/§2.4).
- **Coin/ของจริงที่ social loop แตะ** = referral vesting (§2.4 V3), co-op Coin completion (§2.4 V4), contest real-value prize (§2.3 A6) → ทุกตัววิ่ง SEAM-1 เต็ม. **Sparks ปลด "access" สู่ quest ได้ แต่ access **ไม่เคย bypass** SEAM-1 ตอน Coin mint — identity ถูก re-check ที่ mint-time เสมอ.**

**Firewall list (PDPA — ห้าม join เข้า data-product/analytics เด็ดขาด):** `social.friend_requests`, `social.friends`, contact-hash match-set (ephemeral, ไม่ persist), `social.activity_events` feed, `social.blocks`. ทั้งหมด render social อย่างเดียว.

---

### 2.1 Friends — เพิ่มเพื่อน + ดู activity (opt-in) + privacy + blocking

| # | Feature | Tag | Flutter tech | Server / touchpoint |
|---|---------|-----|--------------|---------------------|
| F1a | **เพิ่มเพื่อนผ่าน QR (My Soi Code)** | **[PURE-FLUTTER]** rotating token | `mobile_scanner` | `social.friend_requests`; QR = rotating per-user social token |
| F1b | **เพิ่มเพื่อนผ่าน username / LINE deep-link** | **[LEGAL-CHECK-LITE]** PDPA consent | LINE SDK (platform channel) | `social.friend_requests`; `auth_provider='line'` (`04`) |
| F1c | **เพิ่มเพื่อนผ่าน contacts (hashed)** | **[LEGAL-CHECK]** PDPA — non-user graph leak | client-side SHA-256+salt | ephemeral match only (ดู PDPA gate) |
| **F1d** | **~~Nearby (BLE) "คนใกล้คุณ"~~** | **🚫 [DEFERRED / BLOCKED — V1]** | — | **ตัดออกจาก MVP/V1 (ดู resolution ด้านล่าง)** |
| F2 | **Friend list + request (accept/ignore)** + rate-limit | **[PURE-FLUTTER]** | `ListView` + avatar + tier badge ✦ | RLS: เห็นกันได้ต่อเมื่อ **สองฝั่ง accept** (mutual) |
| F3 | **ดู activity ของเพื่อน (places/stamps/badges)** | **[LEGAL-CHECK]** PDPA visibility | feed card (§2.3) | `social.activity_events` + `visibility` per-event |
| F4 | **Privacy controls (per-field visibility)** | **[PURE-FLUTTER]** (เป็น control เอง) | toggle group ใน Profile | RLS policy ตาม `visibility` enum |
| F5 | **Block / Unfriend / Report user** | **[LEGAL-CHECK]** harassment → S5 | bottom-sheet action | `social.blocks` + handoff → `content_reports` (S5) |

**★ F1d Nearby — RESOLVE contradiction → DROP for V1 (critique critical, แก้ §2.1↔§5.2 ขัดกัน):**
> เดิม draft ติด BLE "Nearby people" เป็นช่องเพิ่มเพื่อน แต่ `§5.2(A)/§5.5` posture ตัด location-discovery แบบ "คนใกล้คุณ" ทิ้ง (เป็น real-time proximity disclosure = PDPA surface ที่ sensitive สูงสุด). **ตัดสินใจยึด posture เข้ม:** **V1 ไม่ ship Nearby** — เหลือเฉพาะ QR / username / hashed-contacts. ถ้าจะ revive ในอนาคต ต้อง: **DPO sign-off + double opt-in + ephemeral coarse (neighborhood-level) เท่านั้น + ไม่ persist พิกัด + `consent_purpose='nearby_proximity'` แยก**. mark `F1d = BLOCKED` ใน feature table เพื่อกัน ship ใต้ wording หลวมของ §2.1. → **OPEN_DECISION C11 (PDPA location-social).**

**Add-friend ที่ ship จริง — 3 ช่องทาง (จับ 3 audiences):**
- 🌍 **QR (My Soi Code)** — tourist: เจอกันที่ Ristr8to ยื่น QR ให้สแกน → เพื่อนทันที (ไม่ต้องแลกเบอร์). **rotating per-user token, ไม่ใช่ static** (กัน scrape/replay). ปลอดภัยสุด, default channel.
- 🇹🇭 **LINE / username deep-link** — local/nomad + Chinese FIT (WeChat ในอนาคต): deep-link เปิดแอป, ต้อง mutual-accept. consent dialog ก่อนแชร์ identity.
- 📇 **Contacts (hashed, ephemeral)** — "เพื่อนคุณกี่คนอยู่บน Locale" — **client-side hash (SHA-256 + salt) → match บน server เป็น hash เท่านั้น**. ต้อง consent dialog แยกก่อนเข้าถึง contacts.

**★ F1c Contacts hardening (critique major — hashed graph ยัง leak non-user social graph):**
- **per-request ephemeral matching เท่านั้น** — server **ไม่ persist** contact-hash set ของใครเลย; compute match แล้ว **discard ทันที**, ไม่เก็บเป็น graph.
- **ห้าม cross-user correlation ของ contact hashes** (กัน server reconstruct who-knows-whom). ใช้ **per-user salt** (ไม่ใช่ shared salt) + salt rotation → hash ของคนเดียวกันจาก 2 user ไม่ correlatable.
- **ห้ามสร้าง edge ไป non-user เด็ดขาด** — คนที่ไม่ได้ลงทะเบียน/ไม่ได้ consent จะไม่มีวันมี node/edge ในระบบ.
- consent แยก granular (`consent_purpose='contact_match'`) + DPO sign-off ครอบ hash-match design + salt-rotation (ไม่ใช่แค่ "เรา hash แล้ว"). → เข้า `§1.5 PDPA baseline` + firewall list §2.0.

**Privacy model — `visibility` enum (per activity-event + per profile-field):**

| ค่า | ใครเห็น | default |
|-----|---------|---------|
| `private` | เฉพาะตัวเอง | — |
| `friends` | เพื่อน mutual เท่านั้น | **default ของ activity feed** |
| `neighborhood` | คนในย่านเดียว (cohort, pseudonymous, ไม่ระบุตัวตนเต็ม) | leaderboard / wall scope |
| `public` | ทุกคน (เฉพาะ profile + titles + avatar) | titles/avatar |

> **PDPA gate (F1/F3):** friends graph = **personal data ที่ user สร้างเอง** → opt-in ชัดเจน, แยก `consent_purpose='social_graph'` ออกจาก `location_checkin`/`marketing` (ขยาย consent enum เดิม, `03 notif.policy.consent_purpose` + `SYSTEM_PLAN §275`). **default = private/solo**, ผู้ใช้เลือกเปิดเอง. friends graph + contact-hash **firewall จาก data-product** (ห้าม join เข้า aggregate/H3 cell — ละเมิด "เก็บ fact ไม่เก็บ graph").

**Blocking + harassment (F5) — reuse S5 ทั้งดุ้น:**

```
User ─ "Block @somchai" ──▶ social.blocks (สองทาง: ตัด feed/leaderboard/request ทันที, silent)
User ─ "Report user"   ──▶ content_report(reason_code = toxicity_harassment | pdpa_doxxing
                            | impersonation | extortion)  ──▶ S5 queue (SLA + shadow-ban เดิม)
```
- **Block = client-immediate + silent** (อีกฝ่ายไม่รู้ว่าโดน block — posture S5.5.2): ตัดมองเห็นกันทั้ง feed/leaderboard cohort/friend-request.
- **Report user** map ตรงเข้า reason-code เดิม: `toxicity_harassment`, `pdpa_doxxing` (เอาชื่อจริง/รูป bystander มาโพสต์), `impersonation` (สวมรอยร้าน/คนดัง). legal/doxxing = auto-hide ทันที + DPO lane (S5.3.3).
- Friend-request **rate-limit ต่อ user/วัน** (กัน friend-spam) + same-device/KYC cluster spam → ป้อนเข้า A.8.13 Sybil signal เดิม.
- **★ Notice + appeal (critique minor — silent suppression ต้องมี transparency):** block-effect ไม่ต้องแจ้งคู่กรณี (ถูกต้องตาม shadow-ban) แต่ **false-positive ฝั่ง report/auto-hide ต้องมี appeal path** (ดู §2.2 L4 สำหรับ leaderboard-freeze appeal เดียวกัน). flag ให้ DPO review ตาม PDPA fairness/transparency.

---

### 2.2 Leaderboards — scoped, Sparks/activity เท่านั้น, anti-toxicity, anti-farming

| # | Feature | Tag | Flutter tech | Server / touchpoint |
|---|---------|-----|--------------|---------------------|
| L1 | **Scoped leaderboards (friends / ย่าน / เมือง / seasonal)** | **[PURE-FLUTTER]** Sparks-only | Realtime `ListView` + rank-change anim | `social.leaderboard_snapshots` (verified-Sparks agg) |
| L2 | **Leagues + small cohorts (≤30) + reset cycle + tenure-band** | **[PURE-FLUTTER]** anti-toxicity | tier-badge Rive | cohort assignment job (server) |
| L3 | **Seasonal festival board (Yi Peng / Songkran/Pi Mai Mueang)** | **[PURE-FLUTTER]** | festival-skinned board + Lottie | ผูก festival passport เดิม |
| L4 | **Anti-farming guard (velocity / cohort z-score) + appeal** | **[PURE-FLUTTER→signal]** | "under review" state | reuse anti-fraud velocity engine (S1.5/A.8.13) — Sparks-side |

**กฎเหล็ก (locked):** **rank บน Sparks (✦) หรือ activity-count เท่านั้น — NEVER Coins/baht.** rank คนด้วยเงินที่ถือ = toxic + e-money signal (`guardrail` + `06 §1.2`). board ห้ามมี ◉ Coin หรือเลขบาทเด็ดขาด.

**★ Verified-tier ranking input (critique minor — กัน soft check-in ปั๊ม rank):**
> `leaderboard_snapshots` นับเฉพาะ **verified-tier Sparks (จาก `verified_visit` T2+ / counter-scan rotating QR)** เข้า rank. soft/optimistic check-in (`gps_dwell` T1) accrue เข้า tier/fun ได้ แต่ **excluded หรือ down-weighted ใน ranking** — สอดคล้อง `§1.5 "ranking = activity ที่ verified แล้ว ไม่ใช่ raw count"` + canonical trust-weight `gps_dwell(T1)=1.0 / verified_visit(T2)=3.0` (`03 §S5.1`). กัน fake/soft check-in inflate rank ราคาถูก.

**Scope ladder (จับ 3 audiences):**

| Scope | ใคร | จับ audience | reset |
|-------|-----|--------------|-------|
| **Friends** | เพื่อน mutual | tourist (กลุ่มเพื่อนเที่ยวด้วยกัน) | weekly |
| **ย่าน (Nimman / Old City)** | คนในย่านเดียว, cohort ≤30, **+ tenure-band** | local/nomad (retention core) | weekly + season |
| **เมือง (Chiang Mai)** | top ของแต่ละย่าน (ไม่ใช่ทุกคนปนกัน) | local power-user | monthly |
| **Seasonal (Yi Peng/Pi Mai Mueang)** | ผู้ร่วมเทศกาล | ทุกกลุ่ม + Chinese FIT (shareable) | จบเทศกาล |

**Anti-toxicity design (ethical, ไม่ punishing):**
- **Small cohorts (≤30):** ไม่เอาทั้งเมือง rank ใบเดียว — แบ่ง cohort เล็กให้ทุกคนมีโอกาสติด top (Duolingo league). คนใหม่ไม่เจอ #9,999.
- **★ Tenure/activity banding (critique minor — geo-only cohort ทำให้ tourist demoralized):** cohort assign **ไม่ใช่แค่ geography** — แยก band ตาม tenure/activity ด้วย → **tourist แข่งกับ tourist, newcomer แข่งกับ newcomer**, ไม่ใช่ 2-day tourist ติด cohort เดียวกับ local power-user (โครงสร้างชนะไม่ได้). ขยาย logic เดียวกับ citywide-tier ลงมาถึง cohort.
- **Leagues (Bronze→Lanna-Gold ✦):** promote/relegate ตาม Sparks ของรอบ → คนเก่งแข่งคนเก่ง.
- **★ Soft relegation (critique minor — demotion = shame vector):** relegation = **opportunity framing ไม่ใช่ loss-animation** ("ลงไป Silver — เก็บ ✦ อีกนิดกลับขึ้น Gold ได้"); **lowest league = promotion-only, no demotion** (กันคนเริ่มต้นเจอ shame).
- **Weekly reset** + **★ soften the cliff (critique minor — weekly reset = real cliff):** แสดง **"all-time best ✦"** คู่กับ weekly number → reset ไม่ลบความรู้สึก progress; carry เศษ standing เล็กน้อย.
- **แสดง rank-band ไม่ใช่ absolute** สำหรับคนนอก top-10 ("Top 20%") → ลด shame อันดับท้าย.
- **opt-out ได้:** visibility `private` → ยังเล่น quest/streak ปกติ.
- **★ Calm mode (critique minor — aggregate countdown/counter pressure):** ผู้ใช้ urgency-sensitive เปิด **"calm mode"** ซ่อน countdown + live-counter ทั้งแอป โดย collection/progress ยังอยู่ครบ. จำกัด **จำนวน urgency-surface ที่เห็นพร้อมกัน** (budget) — กัน "ล้อมด้วยนาฬิกาเดิน" ที่ ethics section บอกว่าจะเลี่ยง.

**Anti-farming (Sparks-side, reuse engine เดิม):**
- Sparks accrual มี **per-action cap + diminishing returns** (เช็คอินร้านเดิมซ้ำวันเดียว = Sparks ลดหลั่น) — กันปั๊ม check-in.
- **cohort z-score velocity:** Sparks พุ่งผิด cohort → flag + **freeze leaderboard eligibility** (ไม่ freeze Sparks เพื่อ tier — แค่ตัดออกจาก board) → manual review. ใช้ velocity engine เดียวกับ S1.5 (ไม่สร้างใหม่).
- **★ Appeal + transparent state (critique minor + legal_flag — velocity false-positive ต่อ superfan):** freeze ต้องมี **visible "rank ของคุณกำลังตรวจสอบ" state + self-serve appeal** — real Nimman regular ที่เช็คอินเยอะจริง **ห้ามถูก silent shadow-remove**. flag DPO review (PDPA fairness/transparency).
- same-device/KYC cluster หลาย account ไต่ board = A.8.13 Sybil → board suppress.
- เพราะ leaderboard = Sparks (ไม่ใช่เงิน) **ความเสียหายจาก farming = cosmetic** (rank ปลอม) ไม่ใช่ financial → safe-by-design.

**ASCII — Neighborhood Leaderboard (NEW screen):**

```
┌──────────────────────────────────────────┐
│  ‹  LEADERBOARD                    ⓘ  ⚙   │   ⚙ = visibility/opt-out/calm-mode
│  ┌──────┬──────────┬──────────┬────────┐  │
│  │Friends│ NIMMAN ●│  เมือง   │ Yi Peng│  │   scope tabs (active=Nimman)
│  └──────┴──────────┴──────────┴────────┘  │
│  🏆 Lanna-Gold League · เหลือ 3 วัน รีเซ็ต │   league + reset countdown
│  Cohort 28 คน · รุ่นเดียวกัน (newcomer)    │   small cohort + tenure-band
│  ✦ best ตลอดกาล: 1,820                     │   all-time best (soften reset cliff)
│ ─────────────────────────────────────────  │
│  #1  🥇 @noi_cnx    ✦ 1,240   🔺2   [Local]│   ✦=Sparks violet (NO ◉/baht)
│  #2  🥈 @malee       ✦ 1,180   ▬          │
│  #3  🥉 @tomtom_th   ✦   990   🔺5         │
│ ─────────────────────────────────────────  │
│  #11 ▸ คุณ (You)     ✦   540   🔺3  ◀━━━━━ │   pinned "you", rank-change (a11y announce)
│  #12   @backpacker   ✦   520   🔻1  [Visitor]
│ ─────────────────────────────────────────  │
│  ⬆ อีก ✦20 แซง @backpacker · เช็คอิน 1 ร้าน │   actionable nudge (Sparks)
└──────────────────────────────────────────┘
   ห้ามมีบนจอนี้:  ◉ Coin · เลขบาท · "เงินรวม"
```
- **Flutter:** Supabase Realtime channel `lb:nimman:gold` → `AnimatedList` rank-change (slide + `TweenAnimationBuilder` count-up ✦); "you" row pinned sticky-header; league badge = Rive state-machine.
- **★ a11y (critique minor):** rank-change **announce ผ่าน semantics** ("คุณขึ้นอันดับ 11") ไม่ใช่ animation อย่างเดียว; rank ใช้ **label/number ไม่พึ่งสีล้วน** (Sparks violet มี ✦ glyph + ตัวเลขกำกับ); reduced-motion = static list.
- **Server:** materialized `leaderboard_snapshots` (verified-Sparks agg ต่อ cohort/scope/season) refresh ตาม interval — **ไม่ query ledger**, ไม่มี write path จาก client.

---

### 2.3 Activity Feed / Community Wall + Contribution — consent + moderation (reuse S5)

| # | Feature | Tag | Flutter tech | Server / touchpoint |
|---|---------|-----|--------------|---------------------|
| A1 | **Friends activity feed (visited/stamp/badge/tier-up)** | **[LEGAL-CHECK]** PDPA visibility | Realtime feed `ListView` + stamp anim | `social.activity_events` (visibility-scoped) |
| A2 | **Neighborhood community wall (ย่าน Nimman)** | **[LEGAL-CHECK]** UGC → S5 moderation | tabbed feed | wall posts = UGC → `content_reports` |
| A3 | **Reactions (✦ react / 🙏 / 🔥) — no free-text by default** | **[PURE-FLUTTER]** | tap-burst micro-anim (Flame/confetti) | `social.reactions` |
| A4 | **Comments (opt-in, moderated)** | **[LEGAL-CHECK]** UGC → S5 | comment sheet | reuse S5 toxicity/shadow-ban |
| A5 | **Auto-generated moments + content-reveal ("เก็บครบ Cafe-Hop!")** | **[PURE-FLUTTER]** | celebratory card | server emits event, no PII beyond opt-in |
| **A6** | **Structured local tip (1 ต่อ place, fixed-field) + "helpful" recognition** | **[PURE-FLUTTER]** contribution loop | fixed-field sheet (low mod surface) | `social.place_tips` + helpful-count |
| **A7** | **Creator trail (curated/invite-only beta สำหรับ trusted local)** | **[LEGAL-CHECK]** UGC + (ถ้า Coin) SERVER-GATED | trail builder (gated rollout) | reuse S5 + SEAM-1 ถ้ามี Coin reward |

**สิ่งที่เข้า feed (activity_events) — Sparks/activity เท่านั้น:**
- ✅ "เยือน Graph Cafe", "เก็บแสตมป์ 3/5 Nimman Cafe-Hop", "ปลดล็อก badge นักล่าคาเฟ่", "ขึ้น tier Lanna Explorer", "ติด Top-3 ย่าน Nimman".
- ❌ **ห้ามขึ้น feed เด็ดขาด:** "ได้ 60 Coins", "แลกกาแฟฟรีมูลค่า ฿70", redemption amount, wallet balance. Coin earn/redeem = **private financial fact** ไม่ใช่ social content (`06 §1.2` + e-money posture). feed celebrate **achievement** ไม่ใช่ **money**.

**★ Variable reward of CONTENT + SOCIAL, ไม่ใช่แค่ quantity (critique major — hollow-points/treadmill risk):**
> draft เดิมให้ variable reward แค่ "จำนวน" (x2 Sparks) = variable reward ที่อ่อนสุด → local เล่นหลายเดือนแล้ว hollow. เพิ่ม **3 ชั้น novelty** (engagement numerator, ไม่ใช่แค่ safety denominator):
> 1. **Place-specific content-reveal:** check-in **ปลดเนื้อหา** ไม่ใช่แค่ counter — เกร็ด Lanna lore, tip บาริสต้า/เมนูลับ, **stamp ARTWORK เฉพาะร้าน (artist-collab)**. ทุก check-in **เผยอะไรบางอย่าง**. ต้องมี **content pipeline** ป้อน novelty (ไม่งั้น loop = treadmill) — owned by content/ops, social section consume.
> 2. **Social variable reward:** surprise in-feed "คนใน cohort เชียร์ streak คุณ" / "เพื่อนเพิ่งแซงคุณ" — social novelty ไม่เก่า (A1/A3). นี่คือ dopamine ที่ retain locals.
> 3. **World-changing collective (visible สำหรับ local):** neighborhood-level collective progress ที่ **เปลี่ยน map state จริง** ("Nimman ครบ 10k check-in → ทั้งย่านได้ festival map-skin"). collective Sparks bonus = `[PURE-FLUTTER]` แต่ **ต้องผ่าน A.8.13 per-recipient Sybil check ตอน batch grant** (กัน N fake-account รับ collective bonus เร่ง access; ดู §2.0/§2.4 V4).

**Consent + visibility (A1/A2):**
- feed default = `friends`, opt-in per-category ("ให้เพื่อนเห็นการเช็คอินไหม?"). check-in post แบบ **delayed/coarse** ("วันนี้เที่ยว Nimman") ไม่ใช่ realtime pin (กัน stalking — location social = sensitivity สูงสุด).
- community wall = `neighborhood` scope, **ไม่เปิดพิกัดเรียลไทม์ของผู้โพสต์**.
- **firewall:** activity_events render social อย่างเดียว — **ห้าม feed เข้า analytics/data-product** (เก็บ fact ไม่เก็บ graph).

**★ A6 Contribution loop (critique minor — consume-only loop plateaus; contribution compounds):**
- local ทิ้ง **structured tip 1 อันต่อ place** (fixed-field, low moderation surface เหมือน fixed-set reactions) → earn **recognition title** "นักบอกต่อย่าน Nimman". **"tip ของคุณช่วยนักท่องเที่ยว 12 คน" = first-class social reward** (ไม่ใช่เงิน).
- treat UGC = **engine** มี S5 เป็น guardrail, **ไม่ใช่เหตุผลเลื่อน**. creator-trail (A7) ดึงมาเป็น **curated/invite-only beta สำหรับ trusted local** (ไม่ใช่ far-V2 legal blocker) — creator-status = local moat ที่แข็งสุด. ถ้า creator-trail ปลด Coin → ส่วนนั้น SERVER-GATED ผ่าน SEAM-1.

**Moderation tie-in (A2/A4/A6/A7 — reuse S5 100%):**
- wall post / comment / tip / trail = **UGC** → `content_reports` + auto-toxicity (S5.5: LLM multilingual TH/EN/ZH + Thai profanity lexicon) + shadow-ban (reversible via `moderation_actions.prev_state`).
- reason-code เดิมครอบคลุม: `toxicity_harassment`, `spam_ad`, `pdpa_doxxing`, `defamation`, `illegal_content`, `impersonation`. **ไม่ต้องเพิ่ม taxonomy ใหม่.**
- **A3 reactions แบบ fixed-set (✦/🙏/🔥) เป็น default** → ลด moderation surface (ไม่มี free-text ให้ harass); comments = opt-in tier ที่ผ่าน toxicity gate.

**ASCII — Friends Activity Feed (NEW screen, ใต้ Profile/Home):**

```
┌──────────────────────────────────────────┐
│  FEED   [ เพื่อน ● ][ ย่าน Nimman ]    🔔  │
│ ─────────────────────────────────────────  │
│  ✦ @malee  ·  2 ชม.                         │
│  เก็บแสตมป์ 4/5 · "Nimman Cafe-Hop" ☕       │   achievement (NO Coin)
│  [ ◉stamp art เฉพาะร้าน ]        🙏 12  🔥 4 │   content-reveal + reactions (fixed-set)
│ ─────────────────────────────────────────  │
│  💬 @noi cheered streak ของคุณ!             │   social variable reward (dopamine)
│ ─────────────────────────────────────────  │
│  🏅 @tomtom_th ขึ้น tier "Lanna Explorer"   │   tier-up moment
│         ✦ react   ·   แสดงความยินดี         │
│ ─────────────────────────────────────────  │
│  🎉 คุณกับ @noi เก็บครบ Cafe-Hop พร้อมกัน!   │   auto co-op moment
│         แชร์ →  [LINE] [RED] [WeChat]        │   virality hook (§2.4)
│ ─────────────────────────────────────────  │
│  ⚑ รายงานโพสต์   ·   ซ่อนจากฟีด              │   → S5 content_report
└──────────────────────────────────────────┘
```

> **★ Community-vote / contest prize (A6/A7/photo-challenge) — REAL value (critique major, ม.8 chance-adjacent):** ถ้า contest/photo-challenge ตัดสิน **ของจริง (Coin/物) ด้วย community vote** → **[LEGAL-CHECK]** (popularity-lottery / vote-ring manipulation, เส้น skill-contest↔lottery เบลอ). กฎ: real-value prize ต้อง **(a) neutral-judge adjudication (criteria เขียนชัด) หรือ (b) จำกัด vote-outcome ให้เป็น Sparks/badge เท่านั้น**. ถ้า vote ตัดสินของจริง → legal sign-off ม.8 + **audited vote-integrity log** + prize cap ผ่าน sponsor escrow + COGS cap (ไม่ขึ้นกับยอด vote) + clawback. **bystander ในรูป → on-device face-blur = MANDATORY ก่อน submit** (PDPA + image rights). → **OPEN_DECISION C13.**

---

### 2.4 Social Virality Loops — share + invite (reuse referral anti-fraud vesting)

| # | Feature | Tag | Flutter tech | Server / touchpoint |
|---|---------|-----|--------------|---------------------|
| V1 | **Share achievement → LINE / RED / WeChat / IG** | **[PURE-FLUTTER]** Sparks-only content | `share_plus` + achievement card (`CustomPainter`/`RepaintBoundary`) | deep-link gen (server), no Coin |
| **V1b** | **Day-one single-stamp share card (zero-friend, zero-set)** | **[PURE-FLUTTER]** tourist MVP hook | 1-tap card render | server deep-link token |
| V2 | **"เพื่อนคุณ @X เก็บ badge Y" social-proof push** | **[PURE-FLUTTER]** | in-feed + push | reuse S2 notification (consent-gated, capped) |
| V3 | **Invite friends → referral reward** | **[SERVER-GATED]** Coin via SEAM-1 + **[gated]** instant Sparks | invite sheet + progress | **reuse referral + anti-fraud vesting** |
| V4 | **Co-op "เก็บ quest พร้อมเพื่อน" / squad** | **[PURE-FLUTTER]** Sparks bonus · **[SERVER-GATED]** ถ้าปลด Coin | shared-progress UI (Realtime) | Sparks bonus = free (Sybil-checked); Coin = SEAM-1 |
| V5 | **Random "mystery referral bonus"** | **[LEGAL-CHECK]** chance-based real reward | spin/scratch anim | **server-authoritative RNG + ม.8 permit + chance_draws** |

**V1 — Share (PURE-FLUTTER, ปลอดภัยสุด, จับ Chinese FIT):**
- share = **achievement card ที่เป็น Sparks/collectible** (stamp art, badge, "ครบ Cafe-Hop") — **ไม่มี Coin/baht บนการ์ดแชร์** (หลุดออก RED/WeChat = e-money signal สู่ public).
- **Chinese FIT first-class:** การ์ด shareable สำหรับ **RED (小红书) / WeChat Moments** — สวย, มี QR/deep-link กลับแอป (`share_plus` + native WeChat/RED SDK ผ่าน platform channel, `05 stack`). tourist แชร์เป็น **proof-of-trip**.
- generate card = client render (`RepaintBoundary` → image), deep-link token = server (กัน forge), **ไม่มี reward ตัดสินตอน share** (กัน farming).

**★ V1b — Day-one tourist hook (critique major — funnel ช้าเกินสำหรับ tourist fast-win):**
> draft อ้างว่าจับ tourist fast-win แต่ path จริงช้า: ต้อง opt-in social → add friend / เก็บ set ให้ครบ ก่อนมี proof-of-trip; reward จริงเป็น deterministic ที่ **set-completion** เท่านั้น (5-stamp) — 3-day tourist แทบไม่ทัน. **แก้:**
> - **single check-in แรก mint artifact สวยทันที** — "I'm in Chiang Mai" Lanna postcard ฝัง art ของร้าน, location-stamped, **shareable 1-tap ออก RED/WeChat/LINE โดยไม่ต้อง opt-in social, ไม่ต้องเก็บ set ครบ**. ทำให้ **single-stamp shareable** ไม่ใช่แค่ set-completion.
> - เพิ่ม **"3-stop tourist starter trail"** (cafe + temple + market) จบในบ่ายเดียว → **guaranteed deterministic small real reward** (ผ่าน SEAM-1, ไม่ random) → tourist ได้ real-value win ตั้งแต่ day-one.
> - **ดึง minimal share-card path เข้า MVP** (ไม่ใช่เลื่อนไป V1) — กลุ่ม volume สูง/tenure ต่ำสุดต้องมีของตั้งแต่ ship แรก.

**★ V2 — Social-proof push (critique major — streak/push vs anti-addiction contradiction):**
> daily-streak + loss-aversion + reminder-push = primitive ของ addiction; ต้อง reconcile กับ anti-addiction posture. กฎ social-push:
> - streak-reminder/social-proof push = **1 gentle reminder ต่อวันสูงสุด, ห้ามหลัง ~20:00**, ผูก quiet-hours (`03 notif.preferences.quiet_hours` default `[22,8)`), `max_marketing_day` cap, consent-gated (`marketing_optin` opt-IN).
> - **frame streak = WEEKLY consistency ("5 of 7 วัน") ไม่ใช่ unbroken-daily** → ตัด single-miss cliff (Apple Fitness model). missing streak **ไม่ zero** progress ที่สำคัญ (decouple retention จาก streak).
> - "พอแล้ววันนี้ 🌙" nudge ต้อง **fire จริง** (define trigger: session-length/late-hour). freeze = **auto-applied (ไม่ต้องกดเอง), อย่างน้อย 1/สัปดาห์**, + 48h repair window; freeze ซื้อด้วย Sparks = **fixed low cost + monthly cap** (กัน farm จน streak ไร้ความหมาย, กัน expensive จน punish-anxiety). *(streak engine owned by §1.4; social section บังคับ push-discipline + weekly-framing เท่านั้น.)*

**V3 — Invite friends = ห้ามสร้างใหม่ ให้ reuse referral เดิม (SERVER-GATED):**

```
 Inviter ── share invite link (deep-link) ──▶ Invitee installs + LINE/Apple login
                                                      │
            ┌─────────────────────────────────────────┘
            ▼
   ✦ Sparks — ★ GATED ไม่ instant-on-signup: ปลดเมื่อ invitee ทำ genuine
     verified action (verified_visit T2 / จบ quest แรก) + A.8.13 Sybil cap
            │
            ▼  Coin reward = VESTED ไม่ instant
   SEAM-1 (NestJS) ── existing referral anti-fraud vesting ──┐
   ├ invitee ต้องทำ "genuine action" จริง (เช็คอิน T2+ / จบ quest แรก)
   ├ A.8.13 Sybil cap: per-device / per-KYC / per-campaign
   ├ A.8.12: inviter≠invitee identity-cluster (กัน self-invite farm)
   ├ settled-cash + COGS cap + sponsor/platform-goodwill funder จริง
   └ vesting window (invitee active N วัน) → ค่อย mint Coin lot ──┘
```
- **★ Instant both-sided Sparks = Sybil amplifier → ปิดช่อง (critique major):** draft เดิมให้ "Sparks instant + generous ทั้งสองฝั่งทุก invite" → mass fake-account farm ได้ (แต่ละ throwaway invitee mint Sparks ให้ inviter ทันที; Sparks ขับ leaderboard + ปลด access-gated quest). **แก้:** invite-Sparks **ต้องผ่าน A.8.13 Sybil/velocity cap เดียวกับ Coin**, **cap ต่อ inviter/วัน + ต่อ identity-cluster**, และ **contingent บน invitee ถึง minimal trust event (verified action) ไม่ใช่แค่ signup**. Sparks ฝั่ง invite ยัง generous ได้ แต่ **หลัง genuine action** (loop ยังติด, farm ไม่ได้).
- **Coin ฝั่ง invite = vested + gated** ผ่าน referral anti-fraud vesting เดิม. **ไม่ตัดสินบน client, ไม่ instant Coin.** reuse ทั้งดุ้น — section นี้ไม่นิยาม economics ใหม่.

**V4 — Co-op squad (จับทุกกลุ่ม):**
- "ชวนเพื่อนเก็บ Nimman Cafe-Hop พร้อมกัน" → shared progress bar (Realtime). **Sparks co-op bonus = PURE-FLUTTER** (ฟรี, surprise ได้) — **แต่ batch/collective grant ต้องผ่าน A.8.13 per-recipient Sybil check** (กัน N fake-account รับ co-op/collective Sparks เร่ง access).
- ถ้า co-op ปลด **Coin** reward → ส่วนนั้น **[SERVER-GATED]** ผ่าน quest-completion SEAM-1 (`grant_coins` per-member + COGS cap), ไม่ใช่ social layer ตัดสิน.
- **★ Anti-collusion ring (critique critical — group-quest โดน real human ring + complicit merchant):** verified_visit พิสูจน์ presence ไม่ใช่ absence-of-self-dealing. กฎ co-op Coin:
  - **group-membership → identity-cluster edge เป็น BLOCKING input เข้า SEAM-1 fraud-gate step 2** (ไม่ใช่แค่ analytics signal) — wire จริงตอน mint (ปิด gap `02b A2.9-#2` visibility≠fraud-gate).
  - **per-merchant-per-correlated-identity-group velocity cap** + **recurring-quest cooldown** → human ring เดิม (4 เพื่อน + cafe สมรู้) re-harvest "กาแฟฟรีคนละแก้ว" ทุกรอบ seasonal ไม่ได้.
  - **merchant-side anti-self-redemption:** flag ร้านที่ redemption กระจุกจาก recurring identity-cluster เดียว (ขยาย A.8.12 ไปฝั่ง funder).

**V5 — Random/mystery bonus (⚠ LEGAL-CHECK, ต้อง sign-off):**
- "spin/scratch ลุ้น mystery referral bonus" = **chance-based reward of real value** → เข้าข่าย **พ.ร.บ.การพนัน ม.8 (ชิงโชค/แถมพก)** → **ต้องผ่าน Thai legal sign-off ก่อน ship**.
- **★ "sponsor-funded + free entry" ≠ safe-harbor (critique minor — แก้ framing เกือบ-GO):** ม.8 ชิงโชค/แถมพก **ต้องขอ permit จากกรมการปกครองก่อน แม้แจกฟรี/ไม่มี consideration**. ดังนั้น free-entry sponsor draw = **permit-required ไม่ใช่ GO**. กฎเข้ม: **random real-value mechanic ใด ๆ = BLOCKED จนกว่าจะมี (a) ม.8 permit on file + (b) counsel sign-off reference**, feature-flag **default OFF**, build-time enforcement (เปิด flag ไม่ได้ถ้าไม่มี recorded legal-approval ref). → **OPEN_DECISION C12 (ม.8 permit tracker).**
- **default ที่แนะนำ = หลีกเลี่ยง random สำหรับของจริง.** ใช้ **deterministic-by-effort** แทน: "ชวนครบ 3 คน active → guaranteed กาแฟฟรี" (ปลดเมื่อทำครบ X, ไม่สุ่ม) — ปลอดภัยกว่า, ไม่ติด gambling law.
- **★ RNG transitivity (critique critical — cosmetic-laundered Coin):** ถ้ายืนยันทำ random ของจริง: **server-authoritative outcome (ไม่ตัดสินบน client), log ใน `chance_draws`, transparent odds (แสดง %), sponsor-funded ผ่าน SEAM-1 + COGS cap**, legal review. **และ:** ถ้า client RNG ตัดสิน "rare cosmetic" ที่ **ปลด Coin ต่อ (transitive)** → ทั้งกลไกเป็น [LEGAL-CHECK] + RNG ต้อง server-side (client RNG ห้าม gate ของจริงแม้ทางอ้อม — §2.0 INVARIANT #6). → **เลื่อนเป็น open decision, ไม่ ship MVP.**
- **★ Replay/idempotency hardening (critique major — spin outcome replay → double mint):** ทุก spin bind กับ **single-use server-issued draw token ใน `chance_draws`**; `grant_coins` ใช้ **`idempotency_key = hash(draw_id)`** → replay = no-op. mint เกิด **server-side ตอน draw (หรือ reserve atomic)**, ไม่ใช่ trigger จาก client หลัง animation. **client animation = cosmetic, ไม่เคย authorize mint.**
- **★ a11y (critique minor):** spin/scratch ต้องมี **"tap to reveal" path เสมอ** (blind user scratch ไม่ได้) + **announce outcome** ผ่าน semantics; reduced-motion = reveal-direct.
- **ถ้า random ให้แค่ Sparks (✦, ไม่ใช่ของจริง) = ปลอดภัย** → spin-for-Sparks เล่นสนุกได้เลย (PURE-FLUTTER, client RNG OK) **ก็ต่อเมื่อ outcome และ downstream ทุก unlock เป็น Sparks/cosmetic ล้วน ไม่ gate ของจริงเลย** (§2.0 INVARIANT #6). **กฎ: random OK บน Sparks-ปิดวงจร, random ของจริง (ตรงหรือ transitive) = LEGAL-CHECK.**

> **★ First-N collective Coin drop (live-events §3.4) — mirror สู่ social co-op (critique critical):** "ถ้าเมืองถึงเป้า → sponsor ปล่อย Coin ให้ X คนแรก" = **latency race** (ตัดสินด้วย arrival timing/network/device) ⇒ functionally chance + farm-pruned ไป bot/multi-account ที่ยิง request เร็วสุด ⇒ **arguably ลุ้นโชค ม.8**. **ตัดสิน: reclassify [LEGAL-CHECK] (ไม่ safe-by-default)** + แทนด้วย **deterministic-by-effort: "ทุกคนที่ทำครบ X ได้ จนกว่า pool/COGS cap หมด"** + grant-fail fallback (ไม่ silent loss) + **server-side per-identity-cluster rate-limit บน claim endpoint** (bot ชนะ race ไม่ได้). *(rule owned by economy/live-events doc; mirror ที่นี่เพราะ collective drop ผูก co-op/social surface.)*

---

### 2.5 Light Identity / Recognition — titles + neighborhood flair + Lanna depth

| # | Feature | Tag | Flutter tech | Server / touchpoint |
|---|---------|-----|--------------|---------------------|
| I1 | **Earned titles (คำเมือง-flavored, "Nimman Regular", "ผู้บอกต่อย่าน")** | **[PURE-FLUTTER]** | title chip บน profile/feed | `social.titles` (verified-activity-derived) |
| I2 | **Neighborhood flair / badge (ย่านที่ active สุด)** | **[PURE-FLUTTER]** | Lanna-motif flair (Rive) | derived จาก verified check-in fact |
| I3 | **Profile card (tier ✦ + collectibles + titles)** | **[LEGAL-CHECK]** visibility | profile screen | RLS visibility |
| I4 | **Avatar / Lanna cosmetic unlocks (Sparks-spend)** | **[PURE-FLUTTER]** | cosmetic shop (Sparks sink) | Sparks event-log only |

- **Titles = activity-earned, ไม่ใช่เงิน:** "Nimman Regular" (verified check-in ย่าน Nimman ≥N), "Temple Pilgrim" (Old City), seasonal title.
- **★ Lanna cultural depth, ไม่ใช่ naming-skin (critique major — surface-level/designed-from-outside):**
  - **(1) คำเมือง (Northern Thai) ในชื่อ/copy** + คำแปล → สอนภาษาเมืองเล็ก ๆ ทุก visit; พิจารณา **tua mueang (Lanna script) เป็น collectible motif**.
  - **(2) "Craft trail" collectible** ผูก artisan economy จริง (ร่ม Bor Sang, เครื่องเงิน Wua Lai, เซรามิก Sankampaeng) → driver footfall ไป makers ไม่ใช่แค่ cafe.
  - **(3) Temple loop = สร้าง RESPECT เข้า mechanic:** check-in ปลด etiquette guidance (แต่งกาย, เงียบ, ไม่หันหลังให้พระประธาน), **geofence ที่ลานวัด ไม่ใช่พระอุโบสถ**; **ต้องมี temple/Sangha consent/partnership gate** (กัน monetize sacred space โดยไม่มี buy-in — reputational/regulatory risk). treat = **[LEGAL-CHECK] cultural** → **OPEN_DECISION C13 (religious-site consent).**
  - **(4) Reframe Songkran = Pi Mai Mueang / rod nam dam hua (elder-blessing)** ไม่ใช่ "Survivor" (เลี่ยง foreigner water-fight cliché). authenticity = moat vs generic competitor.
- **★ Neighborhood flair + pay-neutrality (critique minor — paid-placement distorts authentic discovery):** flair Lanna-motif ของย่านที่ active สุด — local รู้สึกเป็น "เจ้าถิ่น". **merchant-paid visibility ต้องมี label "sponsored/promoted" ทุกจุดที่ payment มีผลต่อสิ่งที่ user เห็น** (featured quest/trail/festival placement); **core neighborhood collectible set = editorially curated / pay-neutral** — paid visibility เพิ่ม reach ได้ **แต่ซื้อเข้า curated cultural collectible set ไม่ได้** (firewall: authentic-discovery promise survives).
- **★ I4 = Sparks sink + non-transferable invariant (critique minor — secondary-market re-imports e-money/loot-box):** ใช้ Sparks ปลด cosmetic (avatar frame ลายล้านนา, stamp skin) → Sparks มีปลายทางสนุก **โดยไม่แตะเงิน**. cosmetic ซื้อด้วย Sparks (free XP) **เท่านั้น ไม่ใช่บาท ไม่ใช่ Coin** (กัน pay-to-win-with-real-money). **cosmetic/collectible = strictly non-transferable + non-tradable** → ไม่มีวันได้ secondary-market value (trading/gifting = **OFF, [LEGAL-CHECK]**; ถ้า revive ต้อง gambling + e-money legal review + ยืนยัน rarity-foil item ไม่ใช่ subject ของ paid/random acquisition). *(set trading/gifting owned by economy §3.3; mirror invariant ที่นี่เพราะ cosmetic = social identity surface.)*
- **profile visibility (I3):** titles/avatar = `public` ได้, activity history/friends = ตาม visibility control (F4). **ห้ามโชว์ Coin balance บน public profile.**

---

### 2.6 สรุป classification + audience coverage

| กลุ่ม | จับด้วย social feature ไหน |
|-------|---------------------------|
| **Tourist (days-long)** | **day-one single-stamp share card (V1b)**, 3-stop starter trail (V1b), QR add-friend (F1a), share proof-of-trip (V1), friends leaderboard weekly + tenure-band cohort (L1/L2), co-op กับเพื่อนร่วมทริป (V4), fast collectible moments (A5) |
| **Local + nomad (retention base)** | neighborhood leaderboard + league + soft-relegation + reset-softener (L1/L2), community wall + **structured tip contribution (A6) + creator-trail beta (A7)**, content-reveal + social variable reward (A1/A3), neighborhood flair + Lanna-depth titles (I1/I2), weekly-framed streak (V2), Sparks cosmetic sink (I4) |
| **Chinese FIT** | shareable card → RED/WeChat (V1/V1b), WeChat/LINE add-friend (F1b), seasonal festival board shareable (L3), title สะสมโชว์ได้ (I3) |

**Classification rollup:**
- **PURE-FLUTTER (ship freely):** leaderboard render, feed, reactions, titles, flair, Sparks-share, day-one card (V1b), structured tips (A6), co-op Sparks bonus *(Sybil-checked)*, Sparks-spin *(ปิดวงจร Sparks)*, cosmetic sink.
- **SERVER-GATED (SEAM-1):** invite/referral Coin reward (V3), **invite instant-Sparks (A.8.13 Sybil cap)**, co-op Coin completion (V4), creator-trail Coin (A7), collective/batch Sparks grant *(per-recipient Sybil check)*.
- **LEGAL-CHECK:** contacts add-friend hashed-graph (F1c), **Nearby BLE → BLOCKED/DEFERRED V1 (F1d)**, activity visibility (F3/A1/A2/I3), block→harassment (F5), community-vote/contest real-value prize (A6/A7), **random real-reward + RNG-transitivity (V5)**, **first-N collective Coin drop mirror (§3.4)**, temple/sacred-site gamification (I1 Temple loop).

**OPEN_DECISIONS เปิดใหม่จาก social section (เสนอเพิ่มเข้า `OPEN_DECISIONS §C`, ปัจจุบันสุดที่ C10):**
| # | ประเด็น | จุดยืนแนะนำ | risk |
|---|---------|------------|------|
| **C11** | PDPA location-social (Nearby BLE / leaderboard live-dot) | **OFF/BLOCKED V1**; revive ต้อง DPO + double-opt-in + ephemeral coarse + `consent_purpose` แยก | PDPA สูงสุด |
| **C12** | ม.8 ชิงโชค permit (V5 random / first-N drop / sponsor draw) | flag default OFF จนมี permit + counsel ref on file | ม.8 / สลาก |
| **C13** | community-vote real-value prize + bystander face-blur + religious-site consent | neutral-judge หรือ Sparks-only; face-blur MANDATORY; temple consent gate | ม.8-adjacent + PDPA + cultural |
| **C14** | prize-income / WHT บน contest + recurring creator Coin payout | จัดการที่ S4 payout (นอก money-gate) | tax |

> **Cross-border (C7 เดิม):** social graph + (coarse) location-social อยู่ Supabase SG → DPA + s.29 SCC + encryption; **location-social = sensitivity สูงสุด ห้ามปล่อย "move in-TH ภายหลัง" drift เกิน location-social launch.**

---

## 3. Co-op Quests & Seasonal Collectibles

> **ที่ส่วนนี้ทำ:** เพิ่มชั้น **group + time-boxed engagement** บนระบบ Quest/Passport เดิม โดย **gamify หนักที่ Sparks (ฟรี/ปลอดภัย)** และให้ทุกจุดที่แตะ **Coins/รางวัลจริง route ผ่าน money-gate เดิม** (NestJS money-plane → ledger → escrow + COGS cap + anti-fraud) เท่านั้น
>
> **ยึด invariant เดิมทั้งหมด (ห้ามแตะ):**
> - **Sparks = soft XP ฟรี · NOT redeemable** → ขับ group progress / collectible meta / leaderboard / live-event count ได้อิสระ แจกได้ใจกว้าง variable surprising
> - **Coins = baht-backed · mint โดย server เท่านั้น** ผ่าน `FUND_QUEST` (reservation, **ไม่ post ledger leg** — 02 §A.7(2)) → `GRANT` (mint lot ตอน complete, 02 §A.7(3)) ผ่าน **SEAM-1 universal mint/value-gate** (02b §A2.5) เรียงลำดับ: `(1) reward-COGS cap (A2.4) → (2) fraud-gate: A.8.12 anti-self-redemption + A.8.13 Sybil + velocity → (3) per-funder settled-solvency (A.8.5 + A.8.11)` — ภายใต้ `FOR UPDATE` บน lot/escrow/budget row ใน txn เดียว
> - **Leaderboard บน Sparks/activity เท่านั้น** ไม่เคยจัดอันดับด้วย Coins/เงิน
> - **ห้ามแสดงเลขบาทคู่ Coin** ฝั่งผู้ใช้ (06 §1.2 locked) — รางวัลสื่อเชิงคุณภาพ ("☕ ฟรี 1 แก้ว") เลขบาทอยู่ได้เฉพาะ merchant/admin screen
> - **random-reward มูลค่าจริง = LEGAL-CHECK** (พ.ร.บ.การพนัน พ.ศ. 2478 ม.8 / พ.ร.บ.สลากฯ) → default ใช้ **deterministic "ทำครบ X = การันตีได้"**

---

### 3.0 INVARIANT ที่ส่วนนี้ผูกเพิ่ม (ปิดช่องที่ critique ชี้)

> 5 ข้อนี้คือ root-cause fix จากรอบ critique — เป็น **กฎที่ทุก feature ในส่วนนี้ต้องผ่าน** ไม่ใช่ note ประกอบ

| # | INVARIANT (ใหม่/ตอกย้ำ) | ปิดช่องอะไร | บังคับที่ไหน |
|---|---|---|---|
| **INV-A** | **ไม่มี "race for real value"** — รางวัล Coin/ของจริงห้ามจัดสรรด้วย "ใครยิง request ถึง server ก่อน" (latency race). ใช้ **deterministic-by-effort เท่านั้น**: "ทุกคนที่ทำครบ X ได้ จนกว่า pool/COGS cap หมด"; pool หมด → ทุกคนที่เหลือ eligible ได้ **grant-fail fallback** (ไม่เงียบหาย, ไม่ error แดง) | first-N latency-race = chance allocation + bot-prunable = อาจเข้าข่าย ม.8 "ลุ้นโชค" (critique critical EL-1) | §3.4 collective drop; claim endpoint มี per-identity-cluster rate-limit |
| **INV-B** | **Transitive-RNG rule** — random outcome ใด ๆ ที่เป็น **input สู่การปลดล็อก Coin/มูลค่าจริง แม้ทางอ้อม** (เช่น "สุ่มได้ rare foil → foil ปลด Coin") = **server-authoritative RNG, log ใน `chance_draws`, ทั้งกลไก = [LEGAL-CHECK] (ม.8)**. Client-side RNG อนุญาต **เฉพาะ** เมื่อ outcome และ downstream unlock **ทุกชั้นเป็น Sparks/cosmetic และไม่มีวันไป gate มูลค่าจริง** | "cosmetic ฟอกความเสี่ยง" — random item เป็น cosmetic แต่ consequence เป็นเงิน (critique critical EL-2) | §3.3 mystery/surprise drop, set-completion meta-reward |
| **INV-C** | **Group membership = BLOCKING fraud-gate edge** — group/co-op membership ต้อง wire เป็น **edge จริงเข้า identity-graph ที่ SEAM-1 step-2 อ่านตอน mint** ไม่ใช่แค่ analytics signal. + **per-merchant × correlated-identity-cluster velocity cap** + **recurring-quest cooldown** + **merchant-side anti-self-redemption** (ขยาย A.8.12 ไปฝั่ง funder: ร้านที่ redemption กระจุกจาก identity-cluster เดียวซ้ำ ๆ → flag) | colluding merchant / real ring 4 คน+ร้านสมรู้ รีด "กาแฟฟรีคนละแก้ว" ซ้ำทุกรอบ (critique critical EL-3) | **ขึ้นกับ founder-call A2.10-#8 + wiring D8 m#3** — ดู §3.7 dependency |
| **INV-D** | **Batch/collective Sparks ผ่าน Sybil cap ต่อ recipient** — collective city-goal Sparks bonus (batch grant ทุกคน) **ต้องผ่าน A.8.13 Sybil/velocity ต่อผู้รับ** (suppress duplicate ใน identity-cluster); และ **ACCESS ที่ Sparks ปลดล็อก ไม่เคย bypass SEAM-1 fraud-gate ตอน Coin mint** | farmer N fake account รับ collective Sparks ทั้ง N → เร่งทุกตัวเข้าใกล้ Coin-quest access (critique major EL) | batch-grant edge fn; ตอกย้ำใน §1.5 anti-gaming baseline (ส่วนกลาง) |
| **INV-E** | **Cosmetic/collectible = non-transferable, non-tradable เด็ดขาด** → ไม่มีวันเกิด secondary-market value → ไม่ re-import e-money/loot-box exposure เข้า "safe cosmetic track" | foil rarity + tradable → secondary market = มูลค่าจริง (critique minor EL) | §3.3 trading/gifting = OFF + invariant; revisit ต้อง legal review (ม.8 + e-money) |

> **★ gate boundary (ตอกย้ำ):** ฝั่ง **Sparks/badge/progress/cosmetic = client ตัดสินได้ ปลอดภัย แจกได้ใจกว้าง**; ฝั่ง **eligibility-to-mint + mint + random-ที่ gate มูลค่าจริง = server-authoritative 100%** — client **ไม่เคย** ตัดสินว่าใครได้ Coin และ **ไม่เคย** เป็น RNG ที่ตัดสิน rare-tier ซึ่งปลดมูลค่าจริง. "ก๊วน/เมืองทำครบ" เป็นแค่ *signal*; **gate เป็นคนตัดสิน reward จริงทีละคน**

---

### 3.1 หลักการ 4 ข้อของส่วนนี้

| # | หลักการ | เหตุผล |
|---|---------|--------|
| 1 | **Group = Sparks-first, Coin-gated** | progress ร่วม / "rally N เพื่อน" / group passport = Sparks ล้วน (ปลอดภัย แจกได้). **group bonus ที่เป็น Coin = mint ต่อ member ผ่าน gate เดิม** ไม่ใช่ "mint ก้อนเดียวให้กลุ่ม" (กัน fake group farm; INV-C) |
| 2 | **Collectible meta-reward = deterministic** | "เก็บครบ set → ปลดล็อก" ไม่ใช่สุ่ม → ไม่เข้าข่ายพนัน; meta-reward ใหญ่ที่สุดควรเป็น **cosmetic/Sparks (PURE-FLUTTER)**; ถ้าเป็น Coin → SERVER-GATED ปกติ. **random ที่ปลดมูลค่าจริง แม้ทางอ้อม = LEGAL-CHECK (INV-B)** |
| 3 | **FOMO อย่างมีจริยธรรม** | limited-time = **"โอกาสเก็บของสะสมรอบนี้"** ไม่ใช่ "จ่ายเงินจริงตอนนี้ไม่งั้นเสียดาย". countdown โปร่งใส, ไม่มี pay-with-real-money เร่ง, collectible ที่พลาด **กลับมาได้ปีหน้า** (festival วน). **+ aggregate-pressure budget + "calm mode"** ปิด countdown/live-counter ได้ (ลด urgency-anxiety สะสม — critique minor QE) |
| 4 | **Variable reward of CONTENT/SOCIAL > of QUANTITY** | "×2 Sparks วันนี้" คือ variable-reward ที่อ่อนที่สุด → loop กลวงสำหรับ local. **ทุกการกระทำต้องเผยอะไรใหม่** (Lanna lore, hidden menu, stamp artwork เฉพาะร้าน) + **social novelty** ("เพื่อนเพิ่งแซงคุณ") + **โลกเปลี่ยนเห็นได้** (ย่านถึงเป้า → map skin เทศกาลทั้งย่าน) — critique major QE "hollow loop" |

---

### 3.2 CO-OP / GROUP QUESTS — เดินด้วยกัน เก็บแสตมป์ด้วยกัน

**Metaphor:** group passport = "สมุดเดินทางเล่มเดียวที่หลายคนปั๊มแสตมป์ลงร่วมกัน" (เป็น *view* เหนือ `quest_progress` + `quest_group` membership — ไม่ใช่ economy ใหม่; ตรง 06 §1.5 Passport = view เหนือ `quest_progress`)

#### ฟีเจอร์ย่อย + classification

| ฟีเจอร์ | คำอธิบาย (Chiang Mai example) | Sparks / Coin | Tag |
|---------|-------------------------------|---------------|-----|
| **Group passport (shared progress)** | Mali + เพื่อน 3 คนตั้งกลุ่ม "Nimman Cafe-Hop ก๊วนเรา" — แสตมป์ของทุกคนรวมขึ้น progress ring เดียว, ใครเช็คอินร้านไหนขึ้น avatar คนนั้นบนช่องแสตมป์ | progress = **activity** (ฟรี); แต่ละ check-in ยัง mint Sparks ส่วนตัวตามเดิม | **[PURE-FLUTTER]** |
| **Rally N friends (recruit goal)** | "ชวนให้ครบ 5 คนเข้าก๊วน → ปลดล็อก **group bonus Sparks** + group badge 'ก๊วนซอยนิมมาน'" | **Sparks + badge ล้วน** | **[PURE-FLUTTER]** |
| **Co-op step (ต้องหลายคนทำ)** | step "ก๊วนต้องเช็คอิน Graph Cafe ครบ ≥3 คนในวันเดียว" จึงเปิด step ถัด | logic = activity gate; reward ระหว่างทาง = Sparks | **[PURE-FLUTTER]** |
| **Group completion Sparks bonus** | จบ group quest → ทุกคนได้ Sparks multiplier (เช่น ×1.5) + "completed together" confetti | **Sparks** (variable/surprising ได้) — **batch grant ผ่าน Sybil cap ต่อ recipient (INV-D)** | **[PURE-FLUTTER]** |
| **Content micro-reward (ต่อ check-in)** | เช็คอินร้าน → เผย **stamp artwork เฉพาะร้าน (artist-collab) + เกร็ด Lanna/คำเมือง + เมนูลับ** | content reveal = ฟรี (variable-of-content) | **[PURE-FLUTTER]** |
| **Social variable-reward** | "Bee เพิ่งแซงคุณในก๊วน" / "มีคนในก๊วนเชียร์ streak คุณ" (fixed-set reaction, ไม่ใช่ free-text) | social signal = ฟรี | **[PURE-FLUTTER]** + **[LEGAL-CHECK]** (PDPA opt-in/visibility) |
| **Group Coin bonus (real reward)** | จบ group quest → "ก๊วนนี้ได้กาแฟฟรีคนละแก้ว" (sponsor/merchant-funded) | **Coin — mint ต่อ-member ผ่าน gate (INV-C)** | **[SERVER-GATED]** |
| **Group-vs-group challenge** | ก๊วน CMU vs ก๊วน Payap แข่งใครเก็บแสตมป์ Old City มากกว่าในเดือนนี้ | **Sparks/activity leaderboard เท่านั้น** | **[PURE-FLUTTER]** + social → **[LEGAL-CHECK]** (PDPA, §3.6) |
| **Group friends-graph / invite** | membership + invite link + เห็น avatar เพื่อนในกลุ่ม. **เฉพาะ QR/username/hashed-contacts (per-request ephemeral, ไม่ persist graph, ไม่สร้าง edge ไป non-user)** — **ไม่มี BLE "คนใกล้คุณ"** (ตัดออก ตรง stricter posture §5.2/§5.5) | social data exposure | **[LEGAL-CHECK]** (PDPA opt-in/visibility/block) |

> **★ contradiction resolved (critique major EL — F1 "Nearby"):** location-social proximity ("คนใกล้คุณ" ผ่าน BLE/nearby_connections) = surface PDPA อ่อนไหวสูงสุด → **MVP/V1 ตัดทิ้ง** (ยึด posture เข้มของ §5.2/§5.5 เหนือ §2.1 ที่หลวมกว่า). group invite ใช้ **QR / username / hashed-contacts** เท่านั้น. ถ้าจะรื้อ Nearby กลับมา → ต้อง **DPO sign-off + double opt-in + coarse ระดับย่าน + ไม่ persist + consent_purpose เฉพาะ** และ mark feature เป็น **DEFERRED/BLOCKED** ในตาราง F1 (กันหลุด ship ใต้ wording หลวม)

#### 3.2.a Group Coin bonus — เดินผ่าน money-gate อย่างไร (ละเอียด)

> **กฎเหล็ก:** group reward ที่เป็น **Coin ไม่เคย mint เป็น "ก้อนเดียวให้กลุ่ม"** — mint **แยกต่อ member** ที่ผ่าน eligibility จริง ผ่าน edge fn `grant_coins` เดียวกับ quest ปกติ (single mint path, SEAM-1). "ก๊วน" เป็นแค่ **trigger/condition layer ฝั่ง Sparks** ที่ตัดสินว่า member คนนั้นมีสิทธิ์ — แล้วส่งต่อให้ gate ตัดสิน reward จริง **คนต่อคน**

```
FUND_QUEST (เริ่ม group quest) — reservation เท่านั้น, ไม่ post ledger (02 §A.7(2)):
  funder = merchant:Ristr8to หรือ sponsor:Maya
  INSERT escrow_locks(lock_reason='quest_pool', ref_id=quest_id,
                      amount_minor = reward_per_member × max_members_cap)
  ภายใต้ FOR UPDATE บน escrow_wallet ของ funder + CHECK settled_available ≥ pool   (A.8.7)
  → reservation กิน settled_available "ไม่ post ledger leg"; GRANT จะ release ทีละส่วน

ตอนกลุ่มทำครบ → server loop ต่อ member ที่ผ่าน eligibility (server-authoritative):
  for each member m where member_is_eligible(m):     ← eligibility ตัดสินฝั่ง server เท่านั้น
      grant_coins(user=m, funder, idempotency_key=hash('GROUPQUEST', quest_id, m))
      └─ SEAM-1 gate (per member, ภายใต้ FOR UPDATE บน escrow/coin_backing row, txn เดียว):
         (1) reward-COGS cap (A2.4):
             ASSERT reward_value ≤ REWARD_PER_REDEMPTION_CAP_THB                 (B1, BLOCKING)
             ASSERT Σ(REDEEM thb_settlement funder ในเดือน)+draw ≤ MERCHANT_MONTHLY_COGS_CAP_THB (B2)
         (2) fraud-gate: A.8.12 anti-self-redemption (+ funder-side ext, INV-C)
                         + group↔identity-cluster edge (BLOCKING input, INV-C — ดู §3.7 dep)
                         + A.8.13 Sybil + velocity (รวม per-merchant×cluster cap + recurring cooldown)
         (3) per-funder settled-solvency (A.8.5 + A.8.11)
      → ผ่าน: GRANT (สร้าง coin_lot, ย้าย quest_pool reservation → coin_backing, set expires_at)
      → ไม่ผ่าน (fraud-flag): member นั้น HOLD → manual review (slate --hold, ไม่เขียว/แดง — 06 §1.4)
      → ถ้า escrow หมดกลางทาง (member N+1) → grant-fail fallback "กำลังมอบรางวัล…/We're finalizing
        your reward" (06 §1.4 coin-mint loading state) — ไม่โทษผู้ใช้, ไม่ error แดง, ไม่เงียบหาย
```

**ผลลัพธ์:** ความเสียหายสูงสุด = escrow ที่ funder prefund (escrow-as-risk-cap เดิม) — group quest **ไม่เพิ่ม exposure** เกิน pool ที่ reserve ไว้ และ **ทุก member นับเข้า COGS cap เดียวกัน** ของ funder → fake group ไม่สามารถ mint เกิน cap

#### 3.2.b ANTI-COLLUSION — fake group + colluding ring ห้ามรีดเงิน (เทมเพลตจาก referral vesting §5.9 #6)

> **ภัย 2 ชั้น:** (1) สร้าง 5 account ปลอม / 1 คนสวมหลายเครื่อง → ตั้ง "ก๊วน" → ทำครบ → รีด Coin คนละแก้ว = self-redemption เชิงกลุ่ม; **(2) [critique critical EL-3] ring คนจริง 4 คน + ร้านสมรู้ร่วมคิด** ทำ verified-visit จริงทุกคน → รีด "กาแฟฟรีคนละแก้ว" **ซ้ำทุกรอบ recurring/seasonal** — verified_visit พิสูจน์ "การมา" ไม่พิสูจน์ "ไม่ self-dealing"

| ชั้นป้องกัน | กลไก (อิง control ที่มีอยู่แล้ว) |
|------------|-------------------------------|
| **1. Trust↔value coupling** | step ที่จะ mint Coin ต้อง `min_trust_level` สูง (`verified_visit`/`proven_purchase` ผ่าน rotating QR ฝั่งร้าน, 02 §A.8) ไม่ใช่ `gps_dwell` — fake group เช็คอินจริงไม่ได้ |
| **2. Group vesting (mirror referral)** | Coin group-bonus **ไม่ mint ทันทีตอนกลุ่มจบ** — member แต่ละคนต้องมี **T2/T3 activity จริง** ในกลุ่ม (เช่น verified visit ≥2 ของ *แต่ละ* member ภายใน window) ก่อน gate ปล่อย mint คนนั้น (ตรง §5.9 #6) |
| **3. Identity-graph cluster edge (BLOCKING, ไม่ใช่ analytics — INV-C)** | wire **group membership** เข้า identity-graph (device, IP/BSSID, payment instrument, referral/group graph) เป็น **edge ที่ SEAM-1 step-2 อ่านตอน mint จริง** → ถ้า members ของก๊วน cluster เป็น ring เดียว → A.8.13 Sybil + community-detection flag → **block/HOLD ที่ mint** (ไม่ใช่แค่ flag หลังบ้าน). 02b A2.9-#2 ยอมรับตรง ๆ: **"visibility ≠ fraud-gate coverage → ต้อง wire เป็น edge จริง"** — ดู dependency §3.7 |
| **4. Merchant-side anti-self-redemption (ขยาย A.8.12 ไปฝั่ง funder — INV-C ใหม่)** | นอกจาก user-side: **flag merchant ที่ redemption กระจุกตัวจาก identity-cluster เดียวซ้ำ ๆ** (recurring ring) → HOLD + manual review. + **per-merchant × correlated-identity-cluster velocity cap** + **recurring-quest cooldown** (ก๊วน/cluster เดิม claim Coin จาก quest วนซ้ำไม่ได้ทุกรอบติด ๆ) |
| **5. anti-self-redemption (A.8.12) ตอน redeem** | ตอน *redeem* Coin ที่ counter: ถ้า redeeming merchant ผูก identity-cluster เดียวกับ member → **HOLD** (`--hold` slate, ไม่เขียว/แดง — 06 §1.4) ไป manual review |
| **6. Group caps** | `max_members_cap` ต่อ group quest + earn cap ต่อ user/device/วัน (§5.8) + 1 user อยู่ได้ N group active — bound farm surface |
| **7. min trust ของผู้ตั้งกลุ่ม** | ตั้ง group quest ที่มี Coin bonus ได้เฉพาะ user ที่ผ่าน tier/trust ขั้นต่ำ (ลด throwaway group) |

> **สรุป gate boundary:** ฝั่ง **Sparks/badge/progress = client ตัดสินได้ ปลอดภัย**; ฝั่ง **eligibility-to-mint + mint = server-authoritative 100%** — client **ไม่เคย** ตัดสินว่าใครได้ Coin. "ก๊วนทำครบ" เป็นแค่ *signal*; **gate เป็นคนตัดสิน reward จริงทีละคน**

#### 3.2.c Wireframe — Group Passport (NEW)

```
┌─ Group Passport ───────────────────────────────┐
│  👥 "ก๊วนซอยนิมมาน"        Nimman Cafe-Hop ☕    │
│  ●Mali ●Bee ●Nok ●+2   [เชิญเพื่อน ↗]            │  ← rally goal: 5/5 ✓ (Sparks unlock)
│  ───────────────────────────────────────────   │     เชิญ = QR/username/contacts (ไม่มี Nearby)
│  ความคืบหน้าก๊วน   ●●●●●●●●○○○○   8/12 stamps     │  ← activity (ฟรี)
│  ┌──────┐ ┌──────┐ ┌──────┐                     │
│  │Ristr8│ │Graph │ │Akha  │   ← ช่องแสตมป์ร่วม    │
│  │ ✓●Mali│ │ ✓●Bee │ │ ◻    │     avatar=ใครปั๊ม   │
│  │“อู้จา”│ │artwork│ │ ◻    │   ← เกร็ดคำเมือง/art  │  ← variable-of-content (ฟรี)
│  └──────┘ └──────┘ └──────┘                     │
│  ✨ Bee เพิ่งแซงคุณ! · Nok เชียร์ streak คุณ      │  ← social variable-reward (opt-in)
│  ───────────────────────────────────────────   │
│  🏅 รางวัลก๊วน (Sparks): +1.5× เมื่อจบพร้อมกัน    │  ← PURE-FLUTTER, variable ได้
│  ☕ โบนัสก๊วน: กาแฟฟรี "คนละแก้ว"                │  ← SERVER-GATED (ไม่มีเลขบาท §1.2)
│     ⓘ ออกให้ทีละคนเมื่อยืนยันการเยือนจริง         │  ← สื่อ vesting/per-member อย่างสุภาพ
│  ───────────────────────────────────────────   │
│  ⚖ ก๊วนคุณ vs ก๊วน PayZone   อันดับ Sparks #2    │  ← leaderboard = Sparks เท่านั้น
│  ── ห้ามมีบนจอนี้: ◉ Coin-count · เลขบาท ──      │
└─────────────────────────────────────────────────┘
```
**Flutter tech:** Rive สำหรับ avatar-into-stamp (คนปั๊มแสตมป์), Supabase Realtime channel `quest_group:{id}` → live progress/avatar updates, confetti (เบา) ตอน rally-goal/group-complete, CustomPainter สำหรับ shared progress ring. **reduced-motion → fade เท่านั้น** (06 §1.6); **a11y:** rank/progress อ่านเป็น semantics ("ก๊วนคุณอันดับ 2") ไม่พึ่ง animation, avatar มี text label
**Server/ledger touchpoint:** `quest_group` + membership (Sparks/activity) แยกขาดจาก ledger; Coin bonus → `FUND_QUEST` reservation → per-member `grant_coins` ผ่าน SEAM-1; Realtime broadcast = activity ไม่ใช่ money event

---

### 3.3 SEASONAL COLLECTIBLES & LIMITED DROPS — เก็บให้ครบ set

> ผูกตรงปฏิทินเทศกาลเชียงใหม่ (SYSTEM_PLAN §8.5.3) — collectible เก็บได้เฉพาะหน้าต่างเทศกาล → เห็นช่องว่างใน Passport → กลับมาเก็บปีถัด. **cosmetic/collectible = non-transferable, non-tradable (INV-E)**

#### ปฏิทิน collectible เชียงใหม่ (concrete — เพิ่มชั้นวัฒนธรรมจริง, ไม่ใช่ naming skin)

> **★ cultural authenticity (critique major QE):** layer วัฒนธรรมเดิมเป็น "ชื่อเทศกาล" ผิวเผิน → ยกระดับด้วย **คำเมือง + Lanna craft economy + temple respect** (ต้องมี Northern-Thai cultural consultant + artisan/temple partnership จริง). titles/copy แสดง **คำเมืองพร้อมคำแปล** (สอนภาษาเล็กน้อยทุกครั้ง). **Songkran ผูกความหมายล้านนา "ป๋าเวณีปี๋ใหม่เมือง / รดน้ำดำหัวผู้เฒ่า"** ไม่ใช่ "Songkran Survivor" ที่ลื่นไปทาง cliché น้ำสาด

| ช่วง | Collectible set (ตัวอย่าง) | กลไก |
|------|---------------------------|------|
| **Yi Peng / Loy Krathong (พ.ย.)** | **"ชุดโคมยี่เป็ง" 5 ดวง** — เก็บแสตมป์โคมจากจุดชมโคมรอบคูเมือง + วัดพันเตา + ประตูท่าแพ + ริมปิง + ลอยกระทงสะพานนวรัฐ | stamp ลายโคม, countdown, "ปีนี้เท่านั้น (วนกลับปีหน้า)" |
| **Songkran / ปี๋ใหม่เมือง (13–15 เม.ย.)** | **"ชุดป๋าเวณีปี๋ใหม่เมือง"** — Tha Phae → Wat Phra Singh (ขนทรายเข้าวัด) → คูเมือง + จุดรดน้ำดำหัว | passport ลายล้านนา, limited, TAT-sponsored ได้; copy เน้นความหมาย ไม่ใช่ water-fight cliché |
| **Sunday Walking Street (รายสัปดาห์)** | **"ชุดถนนคนเดินราชดำเนิน"** — เก็บ 4 โซน street-food/หัตถกรรม | recurring collectible, set รายเดือน |
| **Flower Festival (ก.พ.)** | **"ชุดมหกรรมไม้ดอก"** — สวนสาธารณะหนองบวกหาด + ขบวนรถบุปผชาติ | seasonal badge |
| **Inthakin / ใส่ขันดอก (พ.ค.–มิ.ย.)** | **"ชุดเสาอินทขิล"** วัดเจดีย์หลวง | culture set, ดึงนอกไฮซีซัน — **ต้องมี temple-consent gate (§3.6)** |
| **Lanna Craft Trail (ทั้งปี)** | **"ชุดหัตถกรรมล้านนา"** — ร่มบ่อสร้าง (สันกำแพง) + เครื่องเงินวัวลาย + เครื่องปั้นดินเผา | ดึง footfall เข้า **artisan economy จริง** ไม่ใช่แค่คาเฟ่ (cultural moat) |

#### ฟีเจอร์ย่อย + classification

| ฟีเจอร์ | คำอธิบาย | Sparks / Coin | Tag |
|---------|----------|---------------|-----|
| **Collectible stamp set** | เก็บแสตมป์โคม 5 ดวงให้ครบใน Passport เทศกาล | stamp = activity; แต่ละชิ้น mint Sparks | **[PURE-FLUTTER]** |
| **Set-completion meta-reward (deterministic)** | "เก็บครบ 5 โคม → ปลดล็อก **badge ทองคำ 'ผู้พิทักษ์โคมยี่เป็ง' + passport skin โคมเรืองแสง'**" | **Sparks + cosmetic ล้วน** | **[PURE-FLUTTER]** |
| **Set meta-reward เป็น Coin** | "ครบ set → กาแฟฟรี" (sponsor-funded, deterministic ไม่สุ่ม) | **Coin — gate ปกติ** | **[SERVER-GATED]** |
| **Collectible cosmetics (avatar/passport skin)** | skin โคม, ตรายางลายสาดน้ำ, avatar frame เทศกาล — **non-transferable (INV-E)** | **ไม่ใช่ Coin, ไม่ใช่เงิน** | **[PURE-FLUTTER]** |
| **Single-stamp shareable artifact (NEW — tourist hook)** | **check-in แรกเดียว** → mint **โปสการ์ดล้านนา "I'm in Chiang Mai" + art ของร้าน** แชร์ RED/WeChat/LINE 1 แตะ — **ไม่ต้อง opt-in social, ไม่ต้องครบ set** | cosmetic/Sparks ล้วน (ไม่มี Coin/บาทบนการ์ดแชร์) | **[PURE-FLUTTER]** |
| **Limited drop countdown (FOMO)** | nav badge + countdown "เหลือ 3 วันเก็บโคม" — **อยู่ใน aggregate-pressure budget + ปิดได้ใน calm mode** | UI signal | **[PURE-FLUTTER]** |
| **Set trading / gifting** | แลก/ของขวัญ collectible ระหว่างเพื่อน | **เสนอ ไม่ทำใน MVP — OFF (INV-E)** | **[LEGAL-CHECK]** (transferable+scarce = secondary market = e-money/พนัน-adjacent; revisit ต้อง ม.8 + e-money review) |
| **Mystery/surprise drop (สุ่ม)** | "เปิดกล่องลุ้นแสตมป์" | ถ้า reward **และ downstream ทุกชั้น = Sparks/cosmetic ล้วน** (RNG client ได้) → ok; ถ้า random เป็น **input สู่ Coin/มูลค่าจริง แม้ทางอ้อม** (rare foil → Coin) → **server RNG + log chance_draws + ทั้งกลไก LEGAL-CHECK (INV-B)** | — | **[LEGAL-CHECK]** |

> **★ Cosmetics = safe soft-reward (สำคัญ):** avatar/passport skin, stamp ink, frame — **ไม่มี baht backing, ไม่ redeemable, ไม่ใช่ Coin, non-transferable (INV-E)** → แจกได้อิสระเหมือน Sparks (ship freely). เป็น **meta-reward ที่ทรงพลังที่สุดโดยไม่แตะ economy เลย** — ตอบโจทย์ collectible-completion drive ของ tourist + bragging ของ local โดย **ไม่สร้าง liability**. ห้ามขายด้วยเงินจริง (pay-to-win); ปลดล็อกด้วย Sparks/achievement เท่านั้น. **เพราะ non-tradable → ไม่มีวันได้ secondary-market value → safe-cosmetic claim ยังจริง**

> **★ tourist fast-win (critique major QE):** path สู่ shareable-win แรกของ tourist เดิม **ช้า+gated** (ต้อง opt-in social + ครบ 5-stamp set ที่ time-boxed). แก้: **(1) single-stamp shareable artifact** ใน MVP (check-in เดียว = การ์ดสวยแชร์ได้ทันที ไม่ต้องครบ set/ไม่ต้อง opt-in); **(2) "3-stop tourist starter trail"** (คาเฟ่+วัด+ตลาด จบในบ่ายเดียว) ให้ **deterministic small real reward วันแรก**; **(3) ดึง minimal share-card path เข้า MVP** (ไม่เลื่อนไป V1)

#### 3.3.a FOMO อย่างมีจริยธรรม (ethical limited-time)

| ทำ ✅ | เลี่ยง ❌ |
|-------|----------|
| countdown โปร่งใส + "เก็บได้อีกครั้งปีหน้า (เทศกาลวนกลับ)" | "หมดแล้วหมดเลยตลอดกาล" บน collectible หลัก (manufactured scarcity) |
| meta-reward ใหญ่ = **deterministic** ("ครบ set = การันตีได้") | สุ่ม reward จริง / loot box ที่ต้องลุ้น (และ random→Coin ทางอ้อม, INV-B) |
| เร่งด้วย **กิจกรรม** (ไปเที่ยวจริง) | เร่งด้วย **เงินจริง** ("จ่าย ฿ ปลดล็อกตอนนี้") — pay-to-win |
| nudge เทศกาล tone "อย่าพลาดของสะสมรอบนี้" (06 tourist tone) | guilt/loss-aversion รุนแรง, นับถอยหลังหลอก, reset แบบลงโทษ |
| streak/collectible มี **forgiveness แบบ weekly** ("5 จาก 7 วัน" ไม่ใช่ unbroken-daily) + **auto-freeze ≥1/สัปดาห์** + repair window 48h | punishing daily-streak ที่พลาดวันเดียว = ศูนย์ (single-miss cliff) |
| **aggregate-pressure budget:** จำกัดจำนวน countdown/live-counter ที่เห็นพร้อมกัน + **"calm mode"** ซ่อน countdown/counter (collection คงอยู่) | จอเต็มไปด้วยนาฬิกานับถอยหลัง + counter วิ่งตลอด = urgency-anxiety สะสม (critique minor QE) |

> **★ streak (cross-ref §1.4):** สเปกหลักของ streak/forgiveness อยู่ส่วนกลาง — ส่วนนี้ผูกเฉพาะ collectible: ใช้ **weekly consistency model + auto-freeze (ไม่ต้องกดเอง) + repair 48h**; freeze ซื้อด้วย Sparks ได้ที่ **fixed low cost + monthly cap** (กัน farm จน streak ไร้ความหมาย); **ห้าม late-night nudge (>20:00)**, reminder ≤1 ครั้งแบบสุภาพ

#### 3.3.b Wireframe — Collectible Set "ชุดโคมยี่เป็ง" (NEW)

```
┌─ Yi Peng Collectible ──── ⏳ เหลือ 3 วัน ──────┐  ⓘ ปิด countdown ได้ใน Calm Mode
│        🏮  ชุดโคมยี่เป็ง 2026  (limited)        │  ← ribbon "limited" + countdown โปร่งใส
│        “โกมไฟ” (โคม · Lanna)                     │  ← คำเมือง + คำแปล (สอนทีละนิด)
│   ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐      │
│   │ 🏮  │ │ 🏮  │ │ 🏮  │ │ [?] │ │ [?] │      │  ← เก็บแล้ว=เรือง+ICON ✓, ยังไม่เก็บ=
│   │ท่าแพ│ │พันเตา│ │ริมปิง│ │ว่าง │ │ว่าง │      │     ICON [?]+label "ว่าง" (ไม่พึ่งสี/แสง)
│   └─────┘ └─────┘ └─────┘ └─────┘ └─────┘      │
│        ✦ +40 Sparks/ดวง  •  3/5 เก็บแล้ว        │  ← Sparks (violet ✦)
│   ─────────────────────────────────────────    │
│   🎁 ครบ set ปลดล็อก (การันตี ไม่ต้องลุ้น):       │  ← DETERMINISTIC meta-reward
│      • 🏅 badge ทอง "ผู้พิทักษ์โคม"  (Sparks)     │  ← PURE-FLUTTER
│      • 🎨 passport skin "โคมเรืองแสง"  (cosmetic) │  ← PURE-FLUTTER · non-transferable
│      • ☕ กาแฟฟรี 1 แก้ว @ร้านพันธมิตร  ⓘ          │  ← SERVER-GATED (ไม่มีเลขบาท §1.2)
│   ─────────────────────────────────────────    │
│   [ เก็บโคมดวงถัดไป → นำทาง ]   [ แชร์การ์ด ↗ ]  │  ← single-stamp ก็แชร์ได้ (tourist hook)
│   ↻ เทศกาลนี้กลับมาทุกปี — พลาดปีนี้ เก็บปีหน้าได้  │  ← ethical FOMO (ลด harm)
│   ── ห้ามมีบนจอนี้: ◉ Coin-count · เลขบาท ──    │
└─────────────────────────────────────────────────┘
```
**Flutter tech:** Lottie/Rive โคมเรืองแสง + ลอยขึ้น, shader glow บนช่องที่เก็บแล้ว, CustomPainter set-grid, `flutter_animate` reveal ตอนเก็บครบ. **reduced-motion → fade เท่านั้น (06 §1.6); a11y:** ช่อง collectible ใช้ **ICON+label (✓/[?]) ไม่พึ่งสี/ความสว่างอย่างเดียว** (06 §1.7 "อย่าใช้สีตัวเดียวสื่อความหมาย"); gyro foil-sheen มี **tap-to-shimmer fallback**; reveal มี "tap เพื่อดูผล" + อ่านผล
**Server/ledger touchpoint:** stamp set + cosmetic unlock = **ไม่แตะ ledger** (Sparks/achievement store); ☕ Coin line ผูก `quest_type='festival'`, `funded_by='sponsor:TAT'` หรือ merchant → `grant_coins` ผ่าน SEAM-1 ตอน complete (**deterministic, ไม่สุ่ม**; ถ้าเป็น random→Coin = INV-B)

---

### 3.4 LIVE EVENTS — "Cafe Crawl Weekend" ทั้งเมือง

> city-wide time-boxed event ที่ทุกคนเล่นพร้อมกัน + เห็น real-time participation count → ความรู้สึก "ทั้งเมืองกำลังทำสิ่งเดียวกัน" (powerful retention moment); sponsor tie-in เป็น upside รายได้

#### ฟีเจอร์ย่อย + classification

| ฟีเจอร์ | คำอธิบาย (Chiang Mai example) | Sparks / Coin | Tag |
|---------|-------------------------------|---------------|-----|
| **Live participation count** | "🔴 2,481 คนกำลัง crawl คาเฟ่อยู่ตอนนี้" real-time | activity counter | **[PURE-FLUTTER]** |
| **City-wide collective goal** | "ทั้งเมืองเช็คอินคาเฟ่ครบ 10,000 ครั้งสุดสัปดาห์นี้ → ปลดล็อก **city Sparks bonus** ให้ทุกคน" | **Sparks (collective) — batch grant ผ่าน Sybil cap ต่อ recipient (INV-D)** | **[PURE-FLUTTER]** |
| **Neighborhood collective perk (NEW — world-changing)** | "Nimman ถึง 10k check-in → **map ทั้งย่านได้ skin เทศกาล** + ปลด neighborhood perk จริง (sponsor-funded ถ้าเป็น Coin)" | Sparks/cosmetic = ฟรี; ถ้าเป็น Coin perk → gate | **[PURE-FLUTTER]** / Coin → **[SERVER-GATED]** |
| **Live event leaderboard** | อันดับ Sparks ในอีเวนต์ (scoped: per-district/per-university) — **นับเฉพาะ verified-tier (T2+) activity** | **Sparks/activity เท่านั้น** | **[PURE-FLUTTER]** + **[LEGAL-CHECK]** (social/PDPA) |
| **Sponsor unlock tier (Coin)** | "Maya sponsor: คนที่ crawl ครบ 3 ร้านในอีเวนต์ → กาแฟฟรี" (deterministic) | **Coin — gate ปกติ** | **[SERVER-GATED]** |
| **Collective-goal Coin drop (deterministic-by-effort)** | "ถ้าเมืองถึงเป้า → **ทุกคนที่ทำครบ X ได้ จนกว่า pool/COGS cap หมด**" (ไม่ใช่ "X คนแรก") | **Coin — gate + cap; pool หมด → grant-fail fallback** | **[SERVER-GATED]** |
| **Live event feed** | "Bee เพิ่งเก็บแสตมป์ที่ Graph Cafe" activity feed | social exposure | **[LEGAL-CHECK]** (PDPA opt-in/visibility) |

> **★★ RECLASSIFY (critique critical EL-1) — "first-N collective Coin drop" ไม่ปลอดภัยโดย default:** การให้ Coin จริงแก่ **"ผู้ร่วม X คนแรก"** ในอีเวนต์ทั้งเมืองพร้อมกัน **ไม่ใช่ deterministic-by-effort** — มันคือ **latency race** ที่ตัดสินด้วยเวลามาถึง server (เน็ต/เครื่อง/bot) = **functionally chance allocation + farm-prunable เข้าหา bot/multi-account ที่ยิงเร็วสุด** และอาจเข้าข่าย "ลุ้นโชค" ม.8 (ผู้ใช้การันตี outcome ด้วย skill/effort ไม่ได้). **ดังนั้น:**
> - **ตัด first-N race ออก** → ใช้ **INV-A: "ทุกคนที่ทำครบ X ได้ จนกว่า pool/COGS cap หมด"** (deterministic-by-effort, bounded ด้วย escrow/COGS cap เดิม)
> - pool หมด → ทุกคนที่เหลือ eligible ได้ **grant-fail fallback** (06 §1.4) ไม่เงียบหาย
> - **server-side per-identity-cluster rate-limit บน claim endpoint** (bot ชนะ race ไม่ได้ แม้ในกรณีที่ยังมี timing component)
> - ถ้ายืนยันจะทำ first-N/สุ่มผู้โชคดีจริง → **[LEGAL-CHECK] ม.8** (sponsor-funded, server-authoritative draw, odds โปร่งใส, **permit จากกรมการปกครอง** + legal sign-off) — ดู §3.6

#### 3.4.a Wireframe — Live Event "Cafe Crawl Weekend" (NEW)

```
┌─ 🔴 LIVE · Cafe Crawl Weekend ───── เสาร์–อาทิตย์ ─┐  ⓘ Calm Mode ซ่อน counter ได้
│   ☕ ทั้งเชียงใหม่กำลังตะลุยคาเฟ่!                    │
│        2,481 คน  🟢 กำลัง crawl ตอนนี้               │  ← Supabase Realtime presence
│        🎉 +37 ใหม่ (celebratory-on-arrival)          │     (activity count, ไม่ใช่เงิน;
│   ─────────────────────────────────────────────    │      ฉลองตอนถึง ไม่ใช่เกจกดดันวิ่งตลอด)
│   เป้าหมายทั้งเมือง  ███████████░░░  8,640/10,000   │  ← collective goal (activity)
│   🎉 ถึงเป้า → ทุกคนได้ ✦ Sparks bonus              │  ← PURE-FLUTTER (Sybil-capped ต่อคน)
│   🗺 Nimman ถึง 10k → map ย่านได้ skin เทศกาล!     │  ← world-changing (variable-of-content)
│   ─────────────────────────────────────────────    │
│   อันดับเขตคุณ (Nimman)        คุณ #14 · ✦ 320      │  ← Sparks leaderboard, verified-tier
│   ─────────────────────────────────────────────    │
│   🤝 Maya sponsor: crawl ครบ 3 ร้าน → ☕ กาแฟฟรี    │  ← SERVER-GATED (funded_by=sponsor:Maya)
│      ⓘ ทุกคนที่ทำครบได้ จนกว่ารางวัลจะหมด           │     deterministic-by-effort (ไม่ใช่ X คนแรก)
│   ─────────────────────────────────────────────    │
│   📣 Live feed   ●Bee เก็บแสตมป์ @Graph  · เมื่อครู่ │  ← [LEGAL-CHECK] opt-in, ปิดได้
│   [ เริ่ม crawl → ]        [ แชร์ไป RED/WeChat ↗ ]  │  ← Chinese-FIT shareable (ไม่มี Coin/บาท)
│   ── ห้ามมีบนจอนี้: ◉ Coin-count · เลขบาท ──        │
└─────────────────────────────────────────────────────┘
```
**Flutter tech:** Supabase Realtime **presence + broadcast** สำหรับ live count/feed, Flame/particle สำหรับ count-up celebration ตอนถึงเป้า, Lottie milestone burst, share-sheet → RED/WeChat (Chinese-FIT), `AnimatedCounter` (tabular nums). **reduced-motion → fade; a11y:** counter **อ่านเฉพาะตอนข้าม milestone** (ไม่ใช่อ่านทุก +37 = hostile ต่อ screen reader), leaderboard อ่าน "คุณขยับเป็นอันดับ X" ผ่าน semantics
**Server/ledger touchpoint:** participation count + collective goal + leaderboard = Supabase Realtime/aggregate (no ledger); sponsor Coin tier → `funded_by='sponsor:Maya'` escrow → `grant_coins` per-user ผ่าน SEAM-1 + COGS cap จำกัด pool; **collective Sparks bonus = batch Sparks event (Sybil-capped ต่อ recipient, INV-D) ไม่แตะ Coins**

---

### 3.5 สรุป classification ของส่วนนี้

| Tag | features (ส่วนนี้) | gate ที่ต้องผ่าน |
|-----|---------------------|------------------|
| **[PURE-FLUTTER]** | group passport/progress, rally-N, co-op step, group Sparks bonus, content/social micro-reward, collectible stamp set, set Sparks/cosmetic meta-reward, **cosmetics (skin/frame, non-transferable)**, single-stamp shareable artifact, limited countdown, live count, collective Sparks goal, neighborhood map-skin perk, Sparks leaderboards | ไม่มี money-gate — ship freely. **แต่ batch/collective Sparks ต้องผ่าน A.8.13 Sybil/velocity ต่อ recipient (INV-D)**; cosmetic = non-tradable (INV-E) |
| **[SERVER-GATED]** | group Coin bonus, set Coin meta-reward, sponsor Coin unlock tier, **collective-goal Coin drop (deterministic "ทุกคนที่ครบ X จนกว่า pool หมด" — ไม่ใช่ first-N)**, neighborhood Coin perk | `FUND_QUEST` reservation → per-member/user `grant_coins` → **SEAM-1: COGS cap → fraud-gate(A.8.12 + funder-side ext + group↔cluster edge + A.8.13/velocity + per-merchant×cluster cap + recurring cooldown) → settled-solvency**; pool หมด → grant-fail fallback |
| **[LEGAL-CHECK]** | mystery/surprise drop ที่ random→Coin (INV-B), **first-N/สุ่มผู้โชคดี collective drop (RECLASSIFIED, ม.8)**, set trading/gifting (INV-E OFF), group friends-graph + invite, group-vs-group/live leaderboard + activity feed, social/content feed, **temple/sacred-site collectible (Inthakin ฯลฯ)** | **ม.8 พ.ร.บ.การพนัน/พ.ร.บ.สลาก sign-off + permit** สำหรับ random-real-value; **PDPA sign-off** (opt-in + visibility + block/harassment + data-minimization; location-social = sensitivity สูงสุด → BLE Nearby ตัดออก) สำหรับ social; **temple/Sangha consent gate** สำหรับ sacred-site |

> **invariant ที่ส่วนนี้ไม่เคยละเมิด (รวม INV-A..E):** (1) ไม่ mint Coin นอก gate; (2) ไม่ตัดสิน reward จริงที่ client; **(2b) client ไม่เป็น RNG ที่ปลดมูลค่าจริงแม้ทางอ้อม (INV-B)**; (3) leaderboard บน Sparks/activity (verified-tier) เท่านั้น; (4) random-real-value → deterministic หรือ legal-flag; **(4b) ไม่มี latency-race for real value (INV-A)**; (5) ไม่แสดงเลขบาทคู่ Coin (06 §1.2); (6) social = opt-in + PDPA (ไม่มี BLE Nearby); **(6b) cosmetic/collectible = non-transferable (INV-E)**; (7) ความเสียหายสูงสุด = escrow ที่ funder prefund (escrow-as-risk-cap); **(8) collective/batch Sparks ผ่าน Sybil cap ต่อ recipient (INV-D)**

---

### 3.6 LEGAL / PDPA / CULTURAL GATE — ส่วนนี้ต้องเคาะอะไรก่อน ship

> ผูกตรงกับ OPEN_DECISIONS tracker — feature-flag default **OFF** จนกว่า sign-off + permit จะมีในแฟ้ม; **build-time enforcement**: flag เปิดไม่ได้ถ้าไม่มี reference ของ legal-approval ที่บันทึกไว้

| ประเด็น | จุดยืน (ระหว่างรอ) | สถานะ / tracker |
|---|---|---|
| **ม.8 พ.ร.บ.การพนัน พ.ศ. 2478 (ชิงโชค/แถมพก)** — random real-value: mystery drop ที่ random→Coin (INV-B), first-N/สุ่มผู้โชคดี collective drop | **BLOCKED จนได้ permit จากกรมการปกครอง + counsel sign-off** — "sponsor-funded + free entry ≠ safe harbor": ม.8 ต้องขอ **permit ก่อน แม้ free entry**. feature-flag OFF, track **permit application** ไม่ใช่แค่ lawyer-opinion | **[NEW tracker C11] LEGAL/BLOCKING-GA** |
| **พ.ร.บ.สลากฯ + ม.8** — จับสลาก/สุ่มผู้โชคดี/number-ticket draw | exposure เพิ่มเหนือ ม.8; default หลีกเลี่ยง ใช้ deterministic | **[NEW tracker C12] LEGAL/BLOCKING-GA** |
| **RECLASSIFY first-N collective drop** | latency-race for real value → treat as ม.8 chance-adjacent **หรือ** แทนด้วย deterministic INV-A | ผูก C11 |
| **PDPA (พ.ร.บ.คุ้มครองข้อมูลฯ)** — group friends-graph/invite, activity-visibility, live leaderboard live-dot, location-coarse presence | DPO sign-off + **opt-in default-private** + visibility control + block/report + data-minimization **ก่อน V1**. **BLE "Nearby people" = ตัดออก** (ขัด §5.2/§5.5 → ยึด stricter). **hashed-contacts: per-request ephemeral, ไม่ persist graph, ไม่สร้าง edge ไป non-user, ไม่ shared-salt correlation** | **[NEW tracker C13] LEGAL/BLOCKING-GA** (+ C7 cross-border, C8 DPO เดิม) |
| **PDPA cross-border** — social/location บน Supabase SG | DPA + s.29 SCC + encryption; พิจารณา migrate sensitive location-social in-TH ก่อน enable | **C7 เดิม** |
| **Temple/sacred-site gamification** — Temple Pilgrim, Inthakin, geofenced check-in ที่วัดที่ใช้งานจริง | **consent/partnership gate กับวัด/คณะสงฆ์** (treat เหมือน LEGAL-CHECK); check-in **ปลด etiquette guidance** (แต่งกาย, เงียบ, ไม่หันหลังให้พระประธาน), **geofence ที่ลานวัด ไม่ใช่พระอุโบสถ/พื้นที่ประกอบศาสนกิจ**; ไม่ monetize พื้นที่ศักดิ์สิทธิ์โดยไม่มี buy-in | **[NEW tracker C13a] LEGAL/cultural BLOCKING-GA** |
| **Prize-income / WHT** — real-value contest prize เกิน threshold + recurring Coin payout | อาจเป็นเงินได้ที่ต้องหัก ณ ที่จ่าย + จัดประเภทผู้รับ — out of scope money-gate แต่ต้อง handle ที่ S4 payout | **[NEW tracker C14] LEGAL** |
| **Silent suppression transparency** — velocity-freeze leaderboard / shadow-suppress real superfan (false-positive) | ต้องมี **"rank under review" state + self-serve appeal path** (ไม่เงียบลงโทษ best user); flag DPO fairness/transparency | ผูก C13 |
| **Sponsored/paid-placement disclosure** — merchant subscription ซื้อ "visibility" | **label "sponsored/promoted" ทุกที่ที่ merchant payment มีอิทธิพลต่อสิ่งที่ user เห็น** (featured quest/trail/festival placement); **core neighborhood collectible set = editorially curated / pay-neutral** — paid visibility เพิ่ม reach ได้ แต่ **ซื้อเข้า curated cultural set ไม่ได้** (firewall) | quality gate |

---

### 3.7 BUILD DEPENDENCIES — สิ่งที่ต้องต่อสายก่อน rely (honest residual)

> ส่วนนี้ "build-ready by design" แต่ **2 control พึ่ง wiring/founder-call ที่ยังเปิดอยู่** — ห้าม assert ว่าปิดแล้ว

| dependency | สถานะจริง | ผลถ้ายังไม่ทำ |
|---|---|---|
| **group↔identity-cluster edge เป็น BLOCKING input ที่ SEAM-1 step-2 (INV-C)** | ขึ้นกับ **A2.10-#8 founder-call** (goodwill↔identity edge pattern) + **D8 wiring** (transitive identity-graph + cluster edge → m#3) — ปัจจุบัน MVP arm แค่ `exact funder==redeemer` + device/payment/kyc hash (D8 m#1) | group collusion (real ring + colluding merchant) จับได้แค่ "visibility" ไม่ block ที่ mint → **Group Coin bonus ต้อง gate ที่ min_trust สูง + vesting + per-merchant×cluster cap (ชั้น 1,2,4,6) เป็น compensating control จนกว่า edge จะ wire** |
| **per-merchant monthly COGS accumulator (FOR UPDATE) ใน grant/redeem edge-fn** | **D1/D7 wiring** — ปัจจุบันมี CS path + nightly detect, ต้องทำ prevent-at-mint | `cogs_budget_cap` ยังไม่ใช่ preventive control เต็มตัว → escrow-as-risk-cap ยังคุม exposure สูงสุดอยู่ (loss bounded แต่ cap อาจ overshoot ภายในเดือนก่อน nightly จับ) |
| **`REWARD_PER_REDEMPTION_CAP_THB` (B1) + `MERCHANT_MONTHLY_COGS_CAP_THB` (B2)** | **BLOCKING SET-BEFORE-BUILD** — cap=null → invariant inert | **ทุก [SERVER-GATED] feature ในส่วนนี้ ship ไม่ได้** จนกว่า founder ตั้ง B1/B2 (fail-closed, default-deny) |
| **chance_draws table + single-use draw token + idempotency_key=hash(draw_id)** | required ก่อนเปิด **ใด ๆ** ที่เป็น random-real-value (INV-B) | random→Coin โดยไม่มี → replay mint ซ้ำได้ + ไม่มี audit; ดังนั้น default = mechanic เหล่านี้ **OFF จน C11 + table พร้อม** |

> **★ contribution loop (critique minor QE — pull forward):** loop ที่ส่วนนี้เป็น consume-and-collect ล้วน → plateau เร็วสำหรับ local. **ดึงเข้า MVP/V1:** (1) local ทิ้ง **structured tip 1 อันต่อที่ (fixed-field, moderation surface ต่ำ)** + ได้ **recognition title** ("ผู้รู้ซอยนิมมาน"); "tip ของคุณช่วยผู้มาเยือน 12 คน" = first-class social reward; (2) **creator-trail = curated/invite-only beta สำหรับ local ที่ trusted** (ไม่เลื่อนไป far-V2) — creator-status คือ local moat แข็งสุด; UGC = engine โดยมี S5 เป็น guardrail ไม่ใช่เหตุผลให้ defer

---

### 3.8 รายการที่ "ไม่ได้ทำในส่วนนี้" (rejects / out-of-scope — note + why)

> critique หลายข้อแตะ feature ที่ **เจ้าของอยู่ section อื่น** — fold เฉพาะ "ส่วนที่ทับ" engagement นี้ ที่เหลือ route กลับเจ้าของ (กัน duplicate-spec + กัน section นี้บวม)

| critique item | disposition ในส่วนนี้ | เหตุผล route ออก |
|---|---|---|
| **§2.4 V3 referral "instant Sparks both-sides" = Sybil amplifier** (major EL) | **REJECT-from-this-section** (แต่ INV-D ครอบหลักการเดียวกันสำหรับ collective/group Sparks) | referral invite-flow เจ้าของคือ §2.4/§5.9 — fold fix (Sybil cap + invitee-genuine-action gate บน instant Sparks) **ที่นั่น**; ส่วนนี้แค่ใช้ group invite ซึ่งผูก INV-C/D แล้ว |
| **§4.2 Spin/Scratch reveal replay + idempotency** (major EL) | **PARTIAL** — fold หลักการ (single-use draw token + idempotency + chance_draws) เข้า INV-B + §3.7 สำหรับ mystery/random drop ของส่วนนี้ | กลไก spin-wheel เต็มเจ้าของ §4.2 — รายละเอียด animation/slice route ที่นั่น |
| **§4.4 Photo Challenge / community-vote real-value prize = popularity-lottery** (major EL) | **REJECT-from-this-section** | UGC contest เจ้าของ §4.4 — fold fix (neutral-judge หรือ vote→Sparks/badge เท่านั้น, ม.8 [C13], mandatory face-blur, vote-integrity audit) **ที่นั่น** |
| **§2.1 F1 hashed-contacts no-graph-persistence** (major EL) | **PARTIAL** — fold เฉพาะ group invite path (per-request ephemeral, no non-user edge) ใน §3.2/§3.6 | contacts-upload เต็มเจ้าของ §2.1/PDPA baseline §1.5 |
| **§2.1 F1 BLE Nearby contradiction** (major EL) | **FOLDED** (resolve to OFF ในส่วนนี้ + ตาราง F1 mark DEFERRED/BLOCKED) | แต่การ mark ตาราง F1 จริงต้องทำที่ §2.1 ด้วย — ผูก C13 |
| **§1.4 streak design (auto-freeze/weekly/price)** (major QE) | **PARTIAL** — fold cross-ref + ผูกเฉพาะ collectible streak ใน §3.3.a | สเปก streak เต็มเจ้าของ §1.4 |
| **§2.2 leaderboard cohort tenure-band + soft relegation + appeal** (minor QE) | **PARTIAL** — fold verified-tier ranking (§3.4) + appeal path (§3.6); tenure-band + soft-relegation route §2.2 | cohort assignment เจ้าของ §2.2 |

---

## 4. Variable Rewards, Contests & the Legal Line

> **ขอบเขตหมวดนี้:** หมวดนี้ออกแบบ "ส่วนที่เสี่ยงที่สุด" ของ engagement layer — รางวัลแบบสุ่ม/เซอร์ไพรส์ และ contest ที่มีรางวัล — โดยยึด guardrail เดิมทั้งหมด: **gamify หนักได้บน Sparks (ฟรี ปลอดภัย สุ่มได้)** แต่ **อะไรก็ตามที่จ่าย Coin หรือของจริง ต้องวิ่งผ่าน money-gate เดิม** (NestJS money-plane → `GRANT` → `coin_backing`/`sponsor_budget` + COGS cap + anti-fraud) ผ่าน **SEAM-1 universal mint/value-gate** (doc 02b A2.5): `(1) reward-COGS cap → (2) fraud-gate: A.8.12 anti-self-redemption + A.8.13 Sybil + velocity → (3) settled-solvency` — ลำดับเดียว ทุก path และ **การสุ่มของจริง = vector กฎหมายใหม่** (พ.ร.บ.การพนัน / สลาก) ที่ระบบเดิมยังไม่เคยแตะ → ต้อง flag legal sign-off เป็น C11–C14 ใน `OPEN_DECISIONS.md`
>
> **คำเตือน (เหมือน doc 02 §C.0):** หมวดนี้คือ *design guidance / แนวทางการออกแบบ ไม่ใช่ความเห็นทางกฎหมาย (NOT legal advice)* ทุก "RECOMMENDED" ต้องผ่านทนายไทยสาย gaming/fintech/PDPA ก่อน launch — กฎหมายอ้างอิงสถานะ ณ มิ.ย. 2026

---

### 4.1 หลักการชี้ขาดของทั้งหมวด (the Legal Line)

มีเส้นแบ่งสองเส้นที่ตัดสินทุกฟีเจอร์ในหมวดนี้:

```
            เส้นที่ 1 (money-gate)              เส้นที่ 2 (gambling-line)
                  │                                    │
  รางวัลคืออะไร?  │   รางวัลตัดสินยังไง?               │
                  │                                    │
  Sparks/cosmetic │  client ตัดสินได้ (RNG บนเครื่อง)  │  ไม่แตะกฎหมายการพนัน
  ───────────────┼──────────────────────────────────┼────────────────────
  Coin/ของจริง    │  server ตัดสินเท่านั้น (no client │  ถ้า "สุ่ม" → เข้าข่าย
                  │  RNG) ผ่าน SEAM-1 gate            │  พนัน/สลาก → LEGAL
```

**กฎเหล็ก 5 ข้อของหมวดนี้:**

1. **No client RNG for real value** — ผลแพ้/ชนะของ Coin หรือของจริง **ห้ามตัดสินบน Flutter เด็ดขาด** client เล่นได้แค่ *animation ของผลที่ server ตัดสินมาแล้ว* (server ส่ง outcome → client เล่น spin/scratch ให้ตรงผลนั้น) ตรงกับ guardrail "ห้ามตัดสินรางวัลจริงบน client" และหลัก celebration-honesty (ห้าม fire confetti/haptic ก่อน server-confirm)
2. **Transitivity rule — ความสุ่มที่ "ป้อนเข้า" รางวัลจริงก็คือสุ่มรางวัลจริง** *(critique-critical: cosmetic-RNG-gates-Coin laundering)* — ถ้าผลสุ่มใด ๆ เป็น **input ของการปลด Coin/ของจริง แม้โดยอ้อม** (เช่น "สุ่มได้ rare foil → foil ปลด Coin") → ผลนั้น**ต้อง server-authoritative RNG, log ลง `chance_draws`, และกลไกทั้งชุด = [LEGAL-CHECK]** — เหมือน vector Sparks→access→mint client RNG อนุญาตได้ **เฉพาะเมื่อ outcome และ downstream unlock ทุกชั้นเป็น Sparks/cosmetic ล้วน และไม่มีทาง gate มูลค่าจริง** ("cosmetic ที่ปลด Coin" = ไม่ใช่ cosmetic ในสายตา gate)
3. **Random + real value = gambling vector** — ทันทีที่ผลเป็น *random* และรางวัล *มีมูลค่าจริง* (Coin = baht-backed) ต้องสันนิษฐานว่าเข้าข่าย **พ.ร.บ.การพนัน พ.ศ. 2478** (เล่นเสี่ยงโชคได้-เสียทรัพย์) หรือ **พ.ร.บ.สำนักงานสลากฯ** (ลอตเตอรี/จับสลาก) → flag LEGAL ทุกครั้ง — รวมถึง **chance เชิงแฝง** เช่น latency-race "X คนแรก" (ดู กฎข้อ 5)
4. **Deterministic > Random สำหรับของจริง** — เลือก "ทำครบ X = ได้แน่นอน" แทน "สุ่มลุ้น" เมื่อใดก็ตามที่รางวัลมีมูลค่า เพราะ deterministic ไม่มีองค์ประกอบ "เสี่ยงโชค" → ออกนอกนิยามการพนันเชิงโครงสร้าง (เหมือนที่ Coins ออกนอก e-money เชิงโครงสร้างด้วย "user ไม่จ่ายเงิน")
5. **"คนแรก/จำนวนจำกัดแบบแข่งเวลา" = chance เชิงแฝง ไม่ใช่ deterministic** *(critique-critical: first-N latency race)* — การให้ Coin/ของจริงแก่ "ผู้ร่วม X คนแรก" ในอีเวนต์พร้อมกันทั้งเมือง **ไม่ใช่ deterministic-by-effort** แต่เป็น **race ที่ตัดสินด้วย latency/อุปกรณ์/เน็ต** → ผู้เล่นการันตีผลด้วยฝีมือ/ความพยายามไม่ได้ → เข้าข่าย "ลุ้นโชค" ม.8 **และ** เป็นช่อง bot/multi-account ยิง request เร็วสุดกวาดรางวัล → **ต้องแปลงเป็น deterministic "ทุกคนที่ทำครบ X ได้ จนกว่า pool/COGS cap หมด"** (default ที่ §3.4 แนะนำอยู่แล้ว) ห้ามใช้ "X คนแรก" กับมูลค่าจริง

> **ถ้าจำเป็นต้องสุ่มของจริง → 4 เงื่อนไขพร้อมกัน (ทุกข้อ + permit):** (ก) **server-authoritative** (no client RNG, log `chance_draws`); (ข) **transparent odds** (โชว์อัตราจริงในแอป ตรง chance_draws audit); (ค) **sponsor-funded** (`funded_by='sponsor:<id>'` ไม่ใช่ user จ่ายเข้าเล่น — "ไม่มี consideration จากผู้เล่น" = shield หลักเหมือน e-money); (ง) **legal sign-off + ม.8 permit on file** ก่อน
>
> **ทำไม sponsor-funded + ฟรีเข้าเล่น เป็น shield แต่ไม่ใช่ safe-harbor** *(critique-minor: ไม่ใช่ near-GO):* นิยามการพนันต้องมี "การได้เสียทรัพย์/ลงเงินเพื่อลุ้น" (consideration) — ถ้าผู้เล่น **ไม่เสียอะไรเลยเพื่อเข้าเล่น** (ไม่จ่ายเงิน/ไม่จ่าย Coin/ไม่ซื้อตั๋ว — แค่ check-in/ทำ quest ฟรี) และรางวัลมาจากงบ sponsor ที่ prefund ผ่าน `sponsor_budget` → ใกล้ "ชิงโชคส่งเสริมการขาย" มากกว่า "การพนัน" **แต่ ชิงโชค/การเล่นแถมพกฯ ทางการค้ายังต้องขออนุญาตล่วงหน้าจากกรมการปกครอง/นายทะเบียน ตามมาตรา 8 พ.ร.บ.การพนัน — แม้ฟรีเข้าเล่น 100%** ดังนั้น **ทุก random-real-value mechanic = BLOCKED จนกว่าจะมี (1) ม.8 permit จริง + (2) lawyer sign-off on file** ไม่ใช่แค่ "lawyer opinion" — feature-flag default OFF และ **build-time enforcement: flag เปิดไม่ได้จนกว่ามี recorded legal-approval reference (permit no.) ผูกกับ C11/C12** (ดู §4.6 + 4.7)

---

### 4.2 Variable / Surprise Rewards — ตารางกลไก + classification

**หลักการ "two-track":** กลไกหน้าตาเหมือนกัน (spin, scratch, mystery box) แต่ **เนื้อในแยกเป็น 2 track เด็ดขาด** — track ฟรีบน Sparks/cosmetic สุ่มได้สนุกเต็มที่ [PURE-FLUTTER]; track ที่ payout Coin/ของจริง (หรือ cosmetic ที่ **ปลด** Coin ตาม transitivity rule 4.1(2)) = [LEGAL-CHECK] + server-authoritative เสมอ

| กลไก | track Sparks/cosmetic (ฟรี) | track Coin/ของจริง | classification |
|---|---|---|---|
| **Lucky Stamp (แสตมป์เสี่ยงดวง)** | check-in แล้วแสตมป์ที่ปั๊มลง passport "เปล่งประกาย" สุ่ม +5 ถึง +50 Sparks + เสี่ยงได้ rare stamp foil (cosmetic ที่ **ไม่ปลดอะไรที่มีมูลค่า**) — สุ่มบน client ได้ | ถ้า rare stamp = ปลด Coin reward → **ทั้งการสุ่ม rare ต้อง server-RNG + log chance_draws** (transitivity 4.1(2)) + นับเป็น lucky-draw | ฟรี-และไม่ปลดมูลค่า = **PURE-FLUTTER** · ปลด Coin (แม้ผ่าน foil) = **LEGAL-CHECK** |
| **Spin Wheel (วงล้อ)** | "วงล้อ Sparks ประจำวัน" หมุนได้ 1 ครั้ง/วัน → 10–200 Sparks + badge สุ่ม — client RNG ได้ | "วงล้อ sponsor" ลุ้น Coin/ของจริง (เช่น TAT festival wheel) | ฟรี = **PURE-FLUTTER** · sponsor-Coin = **LEGAL-CHECK** |
| **Scratch Card (ขูดบัตร)** | ขูดได้ Sparks/sticker/avatar frame — cosmetic ล้วน | ขูดลุ้น Coin/voucher ร้าน | ฟรี = **PURE-FLUTTER** · Coin = **LEGAL-CHECK** |
| **Mystery Box / กล่องสุ่ม** | กล่องเปิดได้ cosmetic loot (stamp skin, map theme, profile flair) — **ไม่มี Coin ในกล่อง + ของในกล่องห้ามปลด Coin (transitivity) + non-tradable เด็ดขาด** | ❌ **ห้ามทำ track Coin ของ mystery box** — ใกล้ gacha/loot-box เกินไป เสี่ยงทั้งพนันและประเด็น minor protection | ฟรี-cosmetic เท่านั้น = **PURE-FLUTTER** (Coin = ตัดทิ้ง) |
| **Surprise-but-Guaranteed** | — | **รางวัลรับประกัน แต่ "ตัวไหน" สุ่มจาก pool ที่มูลค่าใกล้กัน** (เช่น ครบ quest ได้ของแน่ แต่จะได้ "กาแฟ/ขนม/ชา" สุ่ม) | **SERVER-GATED** (ดู 4.3 — แนะนำสุด) |
| **Every-Nth Guaranteed** | — | **visit ที่ N รับประกันได้ Coin** (เช่น check-in ครบ 5 ร้าน = แลกฟรี 1) deterministic ล้วน | **SERVER-GATED** |

> **กฎเหล็ก cosmetic = zero liability เฉพาะเมื่อ "ปิดวง"** *(critique-minor: secondary-market / tradable rarity)*: ของ cosmetic/collectible (foil, skin, frame, rare stamp) **ต้อง non-transferable + non-tradable + ไม่มี gifting เด็ดขาด** เพื่อให้ "ไม่มีตลาดรอง" → ไม่ได้มูลค่าจริง → ปลอดทั้ง e-money และ loot-box gambling การเปิด trading/gifting ในอนาคต **ต้อง legal review พนัน+e-money ก่อน** และยืนยันว่า rare-foil ได้มาแบบ "จ่ายเงิน/สุ่มเสียเงิน" ไม่ได้ (ผูกกับ C-tracker §3 set-trading ที่ default OFF)

> **Chiang Mai examples:**
> - *Lucky Stamp ฟรี:* เดิน Nimman Soi 9 check-in ที่ Ristr8to → แสตมป์ latte-art เปล่งประกายสุ่ม +30 Sparks + 1/50 ได้ "gold foil latte stamp" (cosmetic ขึ้น passport, ไม่ปลด Coin, ไม่ trade ได้) — **PURE-FLUTTER ship ได้เลย**
> - *Songkran Spin sponsor:* ช่วงสงกรานต์ sponsor (แบรนด์เครื่องดื่ม) ตั้งงบใน `sponsor_budget` → user ที่ทำ "Songkran water-trail quest" ครบ ได้สิทธิ์หมุน 1 ครั้ง ลุ้น Coin (กาแฟฟรี) odds โชว์ชัด "ลุ้นรางวัลใหญ่ 1/200" + ป้าย **"Sponsored"** — **LEGAL-CHECK** (ชิงโชค ม.8 + permit) + server ตัดสิน
> - *Yi Peng Surprise-Guaranteed:* ครบ "ลอยกระทง 3 จุด" → ได้ Coin reward แน่นอน แต่ร้านที่แลกได้สุ่มจาก 5 ร้านพันธมิตร (มูลค่าใกล้กัน) — **SERVER-GATED ไม่ใช่ LEGAL** เพราะ "ได้แน่ ไม่มีแพ้"

#### ASCII wireframe — Spin Wheel (sponsor-Coin track, server-authoritative)

```
┌──────────── ลุ้นโชคสงกรานต์ · [Sponsored: ████] ──────────┐
│                                                         │
│                  ╭─────────────╮                        │
│              ╭───┤ ☕ │ ✦ │ 🎁 ├───╮     ◄ pointer       │
│             │ ✦  ├───┼───┼───┤  ☕ │                     │
│             │    │ 🎁│ ✦ │ ☕│     │   ← วงล้อนี้คือ      │
│              ╰───┤ ✦ │ ☕│ ✦ ├───╯     "การเล่น animation │
│                  ╰─────────────╯        ของผลที่ server   │
│                                          ส่งมาแล้ว"       │
│   ┌─────────────────────────────────────────────────┐   │
│   │ 🔒 อัตราโปร่งใส (transparent odds · ตรง chance_draws):│
│   │   ☕ กาแฟฟรี ........... 1 / 200                  │   │
│   │   ✦ 50 Sparks .......... 150 / 200               │   │
│   │   🎁 sticker ........... 49 / 200                │   │
│   │   "งบรางวัลสนับสนุนโดย sponsor · เล่นฟรี ไม่เสีย    │   │
│   │    Coin/เงิน · จัดโดยได้รับอนุญาตเลขที่ ███"        │   │
│   └─────────────────────────────────────────────────┘   │
│              [ หมุน (สิทธิ์ฟรี 1/วัน) ]                   │
│   ⓘ "แตะเพื่อดูผล" (a11y: ไม่ต้องหมุนเองก็ได้)            │
└─────────────────────────────────────────────────────────┘
  ⚠ Flutter เล่นแค่ animation · ผล + การ mint Coin = server
  ⚠ ห้ามมีบนจอนี้: เลขบาท (~฿xx) · ปุ่ม "ซื้อสิทธิ์หมุน"
```

> **a11y (critique-minor):** สำหรับ screen-reader/reduced-motion/ผู้ที่ขูด-หมุนเองไม่ได้ → ต้องมี path **"แตะเพื่อดูผล" (tap-to-reveal)** ที่ข้าม animation และ **ประกาศ outcome ด้วย semantics** ("คุณได้: กาแฟฟรี 1 แก้ว"); reveal-direct เป็น a11y feature ไม่ใช่แค่ reduced-motion fallback

**Flutter tech:** วงล้อ = Flame หรือ `CustomPainter` + `AnimationController` (easing `Curves.decelerate` ให้ pointer หยุดตรง slice ที่ server กำหนด); Lucky Stamp foil = Rive state-machine (idle→reveal); confetti = `confetti` package; haptic `HapticFeedback.mediumImpact()` ตอน reveal. **สำคัญ:** client รับ `{outcome_id, slice_index, reward_ref, draw_token}` จาก server *ก่อน* เล่น animation — แล้ว tween ให้หยุดตรง `slice_index` ที่ส่งมา ไม่ใช่สุ่มเอง; **animation outcome เป็น cosmetic ล้วน ไม่เคย authorize การ mint**

**Server/ledger touchpoints (track Coin) — replay-safe:** *(critique-major: idempotency/replay hardening)*
- `POST /reward/spin` (NestJS) → ตรวจ free-entry guard (ห้ามมี consideration) → ออก **single-use `draw_token`** + เรียก **server RNG** (auditable seed) → **เขียนผลลง `chance_draws` (append-only) ทันทีที่จุดสุ่ม** (ไม่ใช่หลัง animation); ผลเป็น Coin → mint ที่ draw-time (หรือ atomically reserve) ผ่าน SEAM-1 `GRANT`: `funded_by='sponsor:<id>'`, สร้าง `coin_lots`, ผ่าน **COGS cap + fraud-gate (A.8.12/A.8.13/velocity)** เดิม — **ไม่มีประตูหลัง mint**
- **`grant` ต้องใช้ `idempotency_key = hash('SPIN', draw_id)`** (ผูก request_hash ตาม A.8.8) → client replay outcome token = **no-op** ไม่ mint ซ้ำ; client ทำได้แค่เล่น animation ของผลที่ mint/reserve ไปแล้ว
- `chance_draws` (ใหม่, append-only) เก็บ `{draw_id, user_ref, mechanic, seed, odds_snapshot, outcome_id, reward_ref, ts}` → พิสูจน์ odds จริงตรงที่โฆษณา (regulator + ผู้เล่นตรวจได้) + เป็น single-source-of-truth ของผล
- Sparks track → `spark_events(reason='lucky_draw')` เท่านั้น ไม่แตะ ledger เลย

---

### 4.3 SAFE alternatives — ออกแบบให้สนุกแต่ออกนอกเส้นพนัน

แทนที่จะดัน random-Coin (แพง LEGAL + เสี่ยง) ใช้ 3 แพทเทิร์นนี้เป็น default สำหรับ "ความเซอร์ไพรส์ที่มีมูลค่าจริง":

| แพทเทิร์น | นิยาม | ทำไมออกนอกพนัน | classification |
|---|---|---|---|
| **A. Surprise-but-Guaranteed** | "ได้รางวัลแน่นอน 100% แต่ *ตัวไหน* เป็นเซอร์ไพรส์ จาก pool ที่ทุกตัวมูลค่าใกล้กัน" | ไม่มี "แพ้" = ไม่มีการได้-เสีย = ไม่ใช่เสี่ยงโชค (ผู้เล่นได้รางวัลเสมอ ความสุ่มเป็นแค่ flavour) | **SERVER-GATED** |
| **B. Every-Nth Guaranteed** | "ครบ N ครั้ง/N ร้าน ได้ Coin แน่นอน" + progress bar เห็น N ชัด | deterministic เต็ม ผูกกับ effort ไม่ใช่ chance | **SERVER-GATED** |
| **C. Sponsor-funded transparent-odds draw** | random จริง แต่เข้า 4 เงื่อนไข 4.1 ครบ + ม.8 permit | ใช้เมื่อ "ลุ้นรางวัลใหญ่" จำเป็นต่อ campaign (rare) | **LEGAL-CHECK** |

> **ทำไม A คือ sweet spot:** ได้ dopamine ของ "ลุ้นว่าจะได้อะไร" (variable-reward จิตวิทยา) โดย **ไม่มี downside risk** ให้ผู้ใช้เลย — จึงเลี่ยงทั้ง gambling vector *และ* dark-pattern (ไม่หลอกให้ลุ้นแล้วเสียดาย) ตรง guardrail "ethical gamification"
>
> **Surprise pool ต้องมูลค่าใกล้กันจริง** ไม่งั้นกลายเป็น "ลุ้นได้ของแพง/ของถูก" = สอด chance-of-value กลับเข้ามา — บังคับใน config ว่าทุกตัวใน guaranteed pool ต้องอยู่ในแถบ COGS เดียวกัน (เช่น 50–60 บาท ทุกตัว ภายใต้ `REWARD_PER_REDEMPTION_CAP_THB`)
>
> **Variable reward ของ "เนื้อหา/สังคม" ไม่ใช่แค่ "ปริมาณ"** *(quality-major: hollow-loop):* variable reward ที่อ่อนสุดคือ "25 vs 50 Sparks" (ปริมาณ) — ที่ retain จริงคือ **surprise-of-CONTENT/SOCIAL/IDENTITY**: เช่น check-in ปลดเกร็ดล้านนา/เมนูลับ/แสตมป์ศิลปะเฉพาะร้าน (artist-collab) หรือ social-surprise ("เพื่อนใน cohort เชียร์ streak คุณ"). Surprise-but-Guaranteed จึงควรพ่วง **content/social novelty** ไม่ใช่สุ่มแค่จำนวน — แต่ของที่มี *มูลค่าจริง* ต้องยังวิ่งผ่าน gate; content/social surprise ที่ไม่มีมูลค่า = PURE-FLUTTER (รายละเอียด pipeline เนื้อหาอยู่หมวด loop-quality)

**Server/ledger:** A และ B วิ่งผ่าน `GRANT` (SEAM-1) เดิม 100% — ต่างจาก quest ปกติแค่ "ตัวเลือก reward_ref ถูกสุ่มจาก equal-value pool ที่ **server ตอน mint** (สุ่มหลัง pass gate แล้ว ไม่ใช่สุ่มว่าจะได้/ไม่ได้)" → ยังนับเป็น deterministic grant ในสายตา ledger (1 quest-completion = 1 grant แน่นอน). **pool/cap-exhaustion fallback (บังคับ):** ถ้า pool/COGS cap หมดระหว่าง campaign ผู้ที่ทำครบเงื่อนไขแล้วทุกคน**ต้องได้ grant-fail fallback ที่ชัดเจน** (เช่น Sparks ชดเชย + แจ้งล่วงหน้า) **ห้าม "เงียบแล้วไม่ได้"** — กัน latency-loss แบบ chance (สอดกับ 4.1 กฎ 5)

---

### 4.4 Contests & Challenges — UGC + prizes ผ่าน gate

Contest คือ engagement ที่ทรงพลังกับทุก audience (tourist อยากโชว์รูปสวย, local อยากชนะ leaderboard, จีนอยาก shareable ไป RED/WeChat) — แต่มี 2 ความเสี่ยง: **UGC moderation** (รูป/โหวต = ของจริงที่ต้อง moderate) และ **prize = ของจริง** (ต้องผ่าน gate + contest-law)

| ฟีเจอร์ contest | กลไก | UGC? | prize? | classification |
|---|---|---|---|---|
| **Photo Challenge** ("best Nimman latte art") | user ส่งรูป (ต้องมี check-in T2+ ที่ร้านนั้นก่อนส่ง) → leaderboard โหวต **หรือ** กรรมการตัดสิน | ✅ รูป + caption | Sparks/badge = GO · Coin/ของจริง = gated | รูป Sparks = **LEGAL-CHECK** (UGC) · Coin prize = **SERVER-GATED + LEGAL-CHECK** |
| **Community Voting** (โหวตรูป/ร้าน) | กด vote/heart, จัดอันดับ | ✅ (เปิดทาง brigading/abuse) | reputation/Sparks **เท่านั้น** ถ้าโหวตตัดสิน | **LEGAL-CHECK** (sensitive-social + manipulation) |
| **Leaderboard-with-prizes** | **อันดับบน Sparks/activity (T2+ verified) เท่านั้น** (ไม่เคยบน Coin) top-N ได้ prize | — | ของจริง → gate | leaderboard = **PURE-FLUTTER** · prize layer = **SERVER-GATED** |
| **Creator-authored Trails** (UGC quest) | local/KOL สร้าง "trail" (เช่น "เส้นกาแฟ specialty คนคั่ว") ให้คนอื่นเดิน — **curated/invite-only beta สำหรับ trusted local** | ✅ (route + รูป + ข้อความ) | creator ได้ Sparks/badge/recognition title · ถ้าได้ Coin = gated | **LEGAL-CHECK** (UGC + creator-payout note) |
| **Structured local tip** (เกร็ด/ทิปต่อร้าน, fixed-field) | local ทิ้ง tip โครงสร้างตายตัว 1 ทิป/ร้าน → "ทิปคุณช่วยผู้มาเยือน 12 คน" | ✅ (low-surface, fixed-field) | recognition title เท่านั้น | **LEGAL-CHECK** (UGC เบา) — ดู note contribution-loop |

> **กฎเหล็ก leaderboard (จาก guardrail + design system §1.2):** จัดอันดับบน **Sparks หรือ activity-count เท่านั้น ไม่เคยบน Coin/มูลค่าเงินที่ถือ** — การจัดอันดับคนด้วยเงินทั้ง toxic และเป็น e-money signal (ทำให้ Coin ดูเป็น "ยอดเงิน" ที่สะสมแข่งกัน) ตรงกับ design system §1.2 "ห้ามแสดง Coins คู่กับมูลค่าบาทบนฝั่งผู้ใช้". **activity ที่นับเข้า rank = verified-tier (T2/`verified_visit`) เท่านั้น** *(critique-minor)* — soft/gps_dwell check-in ให้ fun/tier ได้แต่ **ลดน้ำหนัก/ไม่นับใน ranking** กัน soft-check-in farm ดันอันดับ (สอดกับ `trust_weight` S5.1.2)

> **Contribution loop ดึงเข้า MVP/V1, ไม่ใช่ V2-blocker** *(quality-minor: consume-only vs co-create):* loop ที่ retain local ที่สุดคือ **contribution** ("ฉันคือคน Nimman ตัวจริง คนเดินเส้นของฉัน") ไม่ใช่ consumption (check-in/collect/rank). ดังนั้น (ก) **structured local tip** (fixed-field, moderation surface ต่ำ, reuse fixed-set reactions) เข้า MVP/V1 ได้เลย; (ข) **creator-trails = curated/invite-only beta สำหรับ trusted local** ดึง forward ไม่ใช่ดอง V2 — treat UGC เป็น *engine* โดยมี S5 เป็น *guardrail* ไม่ใช่เหตุผลที่จะ defer

#### 4.4.1 UGC moderation = reuse S5 (ไม่สร้างใหม่)

รูป/caption/route/tip ของ contest ทุกชิ้น **วิ่งเข้า pipeline S5 เดิม** ไม่ทำ moderation แยก:

- **Submission gate:** ส่งรูปเข้า photo challenge ได้เฉพาะถ้ามี `check_ins.trust_tier ≥ verified_visit (T2)` ที่ร้านนั้น ใน window — **เข้มกว่า gate เขียนรีวิว** (S5.1.1 ใช้ `gps_dwell` ขั้นต่ำ) โดยตั้งใจ เพื่อกัน drive-by/ขโมยรูปคนไม่เคยไป
- **Auto + report moderation:** ทุก submission เข้า `content_reports` ได้ — **เพิ่ม `contest_entry` เข้า enum `target_type` เดิม** (review | review_photo | place_photo | merchant_response | **contest_entry**) → triage S5.2.3 (`severity_score`) → console เดียว Tab C (media) ของ Content Moderator; pHash dedup กันรูปซ้ำ/ขโมยรูป (มีใน S5.6)
- **Reason codes ที่ต้องระวังเป็นพิเศษใน contest:** `pdpa_doxxing` (รูปติดหน้า bystander/พนักงาน — สูงมากใน street photo เชียงใหม่), `illegal_content`, `impersonation` (ขโมยรูปคนอื่นมาแข่ง) — ใช้ disposition เดิม S5.3.1
- **Disqualify = `moderation_actions(action='remove')`** + ถ้า entry นั้นชนะไปแล้วและ prize เป็น Coin → ต้อง **clawback ผ่าน REFUND/reversal เดิม** (S4) ไม่ใช่ลบเฉย ๆ (เงินออกแล้วต้องมี txn กลับ)

> **PDPA hook (contest = สูงกว่า review ปกติ):** photo challenge เปิดเผยตัวตน + สถานที่ + เวลา ของ subject → ต้อง **opt-in consent แยก** สำหรับ "เผยแพร่รูปสู่สาธารณะ/leaderboard" (มี `consent_purpose` เฉพาะ), visibility control (สาธารณะ/เพื่อน/ส่วนตัว default-private), block/harassment reuse กลไกเดิม; **on-device face-blur tool (Flutter) = MANDATORY ก่อนส่ง ไม่ใช่ optional** *(critique-flag: keep BLOCKING-GA)* สำหรับรูปที่ติดบุคคลที่สาม (data minimization) + DPO sign-off ครอบ design นี้ (C13)

#### 4.4.2 Prize routing — ผ่าน gate เดิมทุกบาท

```
  Contest winner ตัดสิน (neutral-judge / leaderboard rank ที่ผ่าน anti-brigading)
                    │
         ┌──────────┴───────────┐
         ▼                      ▼
   prize = Sparks/badge    prize = Coin/ของจริง
   (cosmetic)              │
         │                 ▼
   spark_events     ┌─────────────────────────────┐
   เท่านั้น          │ SEAM-1 money-gate (เหมือนทุก │
   [PURE-FLUTTER]   │ value path):                 │
                    │  (1) COGS cap                │
                    │  (2) fraud A.8.12/A.8.13/vel │
                    │  GRANT funded_by='sponsor:X' │
                    │  → coin_lots → ledger 2-entry │
                    └─────────────────────────────┘
                    หรือของจริง (มิใช่ Coin) → S4 payout flow + 50-ทวิ (C.5)
```

- **Prize ไม่เคยตัดสินบน client** — winner คำนวณ server-side จาก vote/rank ที่ผ่าน anti-brigading; การ mint Coin prize = `GRANT` (SEAM-1, sponsor-funded) ผ่าน cap + fraud-gate ทุกตัว
- **โหวตตัดสินมูลค่าจริง = popularity-lottery → ต้องคุม** *(critique-major):* prize ที่เป็น Coin/ของจริง **ต้องเลือกอย่างใดอย่างหนึ่ง**: (ก) **neutral-judge adjudication** (เกณฑ์ตัดสินเขียนชัด, กรรมการเป็นกลาง — skill-based แท้) **หรือ** (ข) **ถ้าให้ community-vote ตัดสิน → จำกัด outcome เป็น Sparks/badge เท่านั้น** ห้าม Coin/ของจริง. ถ้ายืนยันให้ vote ตัดสินมูลค่าจริง → treat เป็น **[LEGAL-CHECK] ม.8 chance/manipulation-adjacent** + legal sign-off + **vote-integrity audit log** + prize ถูก cap ด้วย sponsor escrow + COGS cap โดยไม่ขึ้นกับยอดโหวต (กัน mobilize-to-win) + clawback (4.4.1)
- **ของจริงที่ไม่ใช่ Coin** (เช่น "ตั๋วเครื่องบิน sponsor") → ออกนอก Coin-ledger ไปทาง **S4 payout/voucher** + ออกเอกสารภาษีตาม C.5 (ของรางวัล >threshold อาจเป็นเงินได้ที่ต้องหัก ณ ที่จ่าย + ออก 50-ทวิ)
- **Anti-brigading บน vote:** ผูก vote weight กับ verified-visitor/account-age เหมือน `trust_weight` S5.1.2 — 1 คน-device-IP cluster โหวตได้น้อย, sock-puppet ถูกลดน้ำหนัก

> **Contest-law note (พ.ร.บ.การพนัน ม.8 — ชิงโชค/การเล่นแถมพกฯ):** contest ที่ **ตัดสินด้วยฝีมือ/คุณภาพ (skill-based: รูปสวยสุด, latte art ดีสุด — ตัดสินโดยกรรมการเป็นกลาง)** โดยทั่วไป **ไม่ใช่การพนัน** เพราะไม่ใช่ "เสี่ยงโชค" — แต่ทันทีที่มี **องค์ประกอบสุ่ม/popularity-race เลือกผู้ชนะ** (เช่น "สุ่มผู้โชคดีจากผู้ส่ง", lucky draw จากคนที่ทำครบ, หรือ vote-mobilization ที่ตัดมูลค่าจริง) → กลายเป็น **ชิงโชคที่ต้องขออนุญาตจัดการเล่นแถมพกฯ ตาม ม.8** (ขออนุญาตล่วงหน้า กรมการปกครอง/นายทะเบียน, แจ้งของรางวัล, ประกาศผล) → **flag LEGAL** เส้นแบ่ง = **skill ตัดสินโดยกรรมการเป็นกลาง (GO-ish) vs chance/popularity (ต้องขออนุญาต)**

> **Temple/sacred-site theme = consent gate** *(quality-flag):* contest/quest ที่ตั้งธีมที่ **วัด/พื้นที่ศักดิ์สิทธิ์ที่ใช้งานจริง** (Temple Pilgrim, Inthakin) ต้องมี **consent/partnership ของวัด/คณะสงฆ์** + geofence ที่ลานวัด ไม่ใช่พระอุโบสถ + ฝัง etiquette guidance (การแต่งกาย/เงียบ) — treat เป็น **LEGAL-CHECK เชิงวัฒนธรรม** (reputational/regulatory) ก่อนเปิด

---

### 4.5 DECISION TREE — รางวัลนี้ไปทางไหน?

ใช้ tree นี้กับ *ทุก* ฟีเจอร์ที่ให้รางวัล ก่อนเขียนโค้ด:

```
                    [ ฟีเจอร์นี้ให้รางวัลอะไร? ]
                              │
        ┌─────────────────────┴─────────────────────┐
        ▼                                            ▼
  Sparks / cosmetic ล้วน                   Coin / ของจริง (มูลค่า)
  (XP, badge, foil, skin)                  — หรือ cosmetic ที่ "ปลด" Coin
        │                                    (transitivity 4.1·2 → ฝั่งขวา)
        ▼                                          │
  ┌──────────────────────┐         [ ผลตัดสินด้วยอะไร? ]
  │ สุ่มได้ไหม?            │                       │
  │ + downstream ไม่ปลด    │   ┌──────────────────┴──────────────────┐
  │   Coin เลย?           │   ▼                                     ▼
  └──────┬───────────────┘   DETERMINISTIC                     RANDOM / CHANCE
         │ ใช่               (ทำครบ X = ได้แน่,                 (สุ่ม, ลุ้น, จับสลาก,
         ▼                  surprise-but-guaranteed,           "X คนแรก" latency-race)
   ┌───────────┐            every-Nth · ไม่ race เวลา)               │
   │PURE-FLUTTER│                  │                          ┌───────┴────────┐
   │client RNG  │                  ▼                          ▼                ▼
   │ ok, ship   │            ┌──────────────┐          ฟรีเข้าเล่น +      มี consideration
   └───────────┘            │ SERVER-GATED  │          sponsor-funded +    (ผู้เล่นจ่าย Coin/
   spark_events            │ GRANT → SEAM-1 │          transparent odds +  เงิน/ซื้อสิทธิ์เล่น)
   เท่านั้น                │ COGS+fraud      │          server RNG +              │
                          │ (no client RNG, │          ม.8 permit                ▼
                          │ pool-exhaust    │                │            ╔══════════════╗
                          │ fallback)       │                ▼            ║  ❌ ห้ามทำ    ║
                          └──────────────┘          ┌──────────────┐    ║ = พนันชัดเจน  ║
                                                    │ LEGAL-CHECK   │    ║ (consideration║
                                                    │ ชิงโชค ม.8     │    ║ + chance +    ║
                                                    │ + server RNG  │    ║ prize)        ║
                                                    │ + permit+sign │    ╚══════════════╝
                                                    │ flag OFF จน    │
                                                    │ permit on file │
                                                    └──────────────┘
```

**คำถาม checklist (ตอบทุกข้อก่อน build):**
1. รางวัลเป็น Sparks/cosmetic หรือ Coin/ของจริง? → ถ้า Coin/ของจริง **ห้ามตัดสินบน client**
2. cosmetic ที่ให้ "ปลด Coin/ของจริง" ไหม (แม้โดยอ้อม)? → ถ้าใช่ ปฏิบัติเหมือน Coin (transitivity 4.1·2: server-RNG + LEGAL)
3. ผลสุ่มไหม — รวม "X คนแรก/แข่งเวลา"? → ถ้าสุ่ม/race + มูลค่าจริง → gambling vector → LEGAL (แปลง first-N เป็น "ทุกคนที่ครบ X จน cap หมด")
4. ผู้เล่นต้อง "เสียอะไร" เพื่อเข้าเล่นไหม (Coin/เงิน/ซื้อสิทธิ์)? → **ถ้าใช่ + สุ่ม + รางวัลจริง = ❌ ห้ามทำ**
5. ถ้าสุ่มของจริง: server ตัดสิน + odds โปร่งใส + sponsor-funded + **ม.8 permit on file** + ทนายเซ็น ครบไหม?
6. มี UGC ไหม? → เข้า S5 pipeline + PDPA consent + face-blur บังคับ
7. มี leaderboard ไหม? → บน Sparks/**activity ที่ verified (T2+)** เท่านั้น ไม่เคยบน Coin
8. prize ตัดสินด้วยโหวต community ไหม? → ถ้าใช่และ prize เป็นมูลค่าจริง → กรรมการเป็นกลาง หรือลด prize เป็น Sparks/badge

---

### 4.6 GO vs NEEDS-SIGN-OFF — รายการชัดเจน

#### ✅ GO (ship ได้, ไม่ต้องรอ legal — แต่ตาม guardrail เดิม)

| กลไก | classification | เหตุผล |
|---|---|---|
| Lucky Stamp / Spin / Scratch ที่ให้ **Sparks/cosmetic ล้วน + ไม่ปลด Coin** | PURE-FLUTTER | Sparks ไม่มีมูลค่าบาท ไม่ redeemable + cosmetic non-tradable → ไม่แตะทั้ง e-money และพนัน |
| Mystery box ที่มี **cosmetic loot เท่านั้น (non-tradable, ไม่ปลด Coin)** | PURE-FLUTTER | ไม่มี value ในกล่อง → ไม่ใช่ value gambling |
| **Surprise-but-Guaranteed** Coin (ได้แน่ ตัวไหนเซอร์ไพรส์, equal-value pool, มี exhaustion-fallback) | SERVER-GATED | ไม่มี "แพ้" = ไม่เสี่ยงโชค + ผ่าน SEAM-1 |
| **Every-Nth Guaranteed** Coin | SERVER-GATED | deterministic ผูก effort + ผ่าน gate |
| **Skill-based contest** (latte art, photo สวยสุด ตัดสินโดยกรรมการเป็นกลาง) prize = **Sparks/badge** | PURE-FLUTTER (UGC→S5) | ตัดสินด้วยฝีมือ ไม่สุ่ม + รางวัลไม่มีมูลค่าเงิน |
| **Leaderboard บน Sparks/activity (T2+ verified)** (ไม่มี prize เงิน) | PURE-FLUTTER | จัดอันดับ XP ปลอดภัย |
| **Structured local tip** (recognition title, ไม่มีมูลค่าเงิน) | PURE-FLUTTER (UGC→S5) | contribution loop เบา, prize เป็น recognition |

#### ⚠ NEEDS LEGAL SIGN-OFF (build เป็น feature-flag ปิดไว้, เปิดเมื่อทนายเซ็น + permit on file)

| กลไก | classification | Thai-law rationale | tracker |
|---|---|---|---|
| Spin/scratch/lucky-draw ที่ payout **Coin/ของจริงแบบสุ่ม** (รวม cosmetic-ที่-ปลด-Coin) | LEGAL-CHECK | **ม.8 พ.ร.บ.การพนัน** — ลุ้นโชค/การเล่นแถมพกฯ ต้องขออนุญาต**ล่วงหน้า** (กรมการปกครอง) **แม้ฟรีเข้าเล่น** | **C11** (ใหม่) |
| **"X คนแรก" collective Coin drop** (latency-race allocation) | LEGAL-CHECK *(reclassified จาก SERVER-GATED)* | race เวลา = chance เชิงแฝง ม.8 + farm/bot hole → **default ต้องแปลงเป็น deterministic "ทุกคนที่ครบ X จน pool/cap หมด"**; ถ้ายืนยัน race → permit | **C11** |
| **Skill-contest ที่มี Coin/ของจริงเป็น prize** | SERVER-GATED + LEGAL-CHECK | prize routing ผ่าน SEAM-1 (SERVER) + ถ้ามี chance/popularity-vote เลือกผู้ชนะ → ม.8 (LEGAL); ของรางวัล >threshold อาจมีภาษี ณ ที่จ่าย (C.5) | **C11** |
| **Community-vote ตัดสินมูลค่าจริง** (popularity-lottery) | LEGAL-CHECK *(reclassified)* | โหวตตัดสินเงิน = chance/manipulation-adjacent ม.8 → ต้อง neutral-judge หรือลด prize เป็น Sparks/badge + vote-integrity audit | **C13** |
| **Random selection of winner** จากผู้ส่ง (จับสลากผู้โชคดี) | LEGAL-CHECK | สุ่มเลือกผู้ชนะ = ชิงโชค/จับสลาก ม.8 (+ ถ้าออกเป็นเลข/ใบ อาจแตะ **พ.ร.บ.สลากฯ**) | **C12** (ใหม่) |
| Photo challenge / community voting / creator trails / local tip (**UGC สาธารณะ**) | LEGAL-CHECK | **PDPA** (เผยแพร่ตัวตน/สถานที่/รูป bystander → face-blur บังคับ + consent_purpose แยก) + defamation/CCA ม.14/16 (caption) — reuse S5 แต่ต้อง consent design + DPO review | **C13** (ใหม่) |
| Creator-authored trail ที่ creator **ได้ Coin payout** (รวม recurring) | SERVER-GATED + LEGAL-CHECK | payout ผ่าน SEAM-1 (SERVER); creator ได้เงินสม่ำเสมอ → อาจเข้าข่ายเงินได้ที่ต้องหัก ณ ที่จ่าย + classification ผู้รับ (เทียบ C6 field agent / C.5) | **C14** (ใหม่) |

#### ❌ ห้ามทำ (โครงสร้างผิดกฎหมาย/guardrail ตั้งแต่ต้น)

| กลไก | เหตุผล |
|---|---|
| **Pay-to-spin / ซื้อสิทธิ์เล่นด้วยเงินหรือ Coin** เพื่อลุ้นของจริง | consideration + chance + prize = **การพนันเต็มตัว** (และ user จ่ายเงิน = trip e-money ด้วย) |
| **Gacha/loot-box ที่มี Coin/ของจริงในกล่อง หรือ cosmetic-ที่-ปลด-Coin** | loot-box value-gambling (รวม transitivity laundering) + minor-protection risk |
| **Leaderboard จัดอันดับด้วย Coin/มูลค่าเงินที่ถือ** | toxic + e-money signal (Coin ดูเป็นยอดเงิน) — ผิด guardrail + design system §1.2 |
| **Client ตัดสินผลรางวัลจริง / client RNG → mint Coin** (หรือ replay outcome token → mint ซ้ำ) | ละเมิด money-gate (มินต์ value นอก gate) — แก้ด้วย idempotency `hash('SPIN',draw_id)` |
| **P2P โอน Coin เป็นรางวัล contest** | ผิด invariant "no P2P" (trip e-money — C1) |
| **cosmetic/collectible แบบ tradable/giftable** (ทำให้มีตลาดรอง = มูลค่าจริง) | re-import e-money + loot-box exposure เข้า "safe cosmetic" track |

---

### 4.7 Cross-cut hardening — Sparks-as-fuel ไม่ให้กลายเป็น farm-amplifier

หมวดนี้พิงสมมุติฐานเดียว: **"farm Sparks ได้ แต่ farm มูลค่าจริงไม่ได้"** — สมมุติฐานนี้ *ถือได้เฉพาะเมื่อ* access-gate และ batch-grant ทุกตัว re-check identity ที่จุด mint จริง ดังนั้น:

- **Group-quest collusion = BLOCKING wired input** *(critique-critical):* การ wire "group-membership → identity-cluster edge" **ต้องเป็น input ที่ block ได้ของ SEAM-1 step-2 (fraud-gate) จริง ไม่ใช่แค่ analytics** — เพราะ **visibility (SEAM-5) ≠ fraud-gate coverage** (doc 02b A2.9-#2). `verified_visit` พิสูจน์ "มาจริง" แต่ไม่พิสูจน์ "ไม่ self-deal" → ring มนุษย์จริง 4 คน + คาเฟ่สมรู้ harvest "กาแฟฟรีคนละแก้ว" ซ้ำทุกรอบได้ ต้องเพิ่ม: (1) **per-merchant-per-correlated-cluster velocity cap**; (2) **recurring/seasonal-quest cooldown** ต่อ ring; (3) **merchant-side anti-self-redemption** — flag ร้านที่ redemption กระจุกจาก identity-cluster เดิมซ้ำ (ขยาย A.8.12 ไปฝั่ง funder)
- **Batch/collective Sparks grant ต้องผ่าน A.8.13 ต่อ recipient** *(critique-major):* collective city-goal Sparks bonus (batch ให้ทุกคน) **ต้องวิ่งผ่าน A.8.13 Sybil/velocity ต่อผู้รับ** (suppress duplicate ภายใน identity-cluster) — เพราะ Sparks ปลด access เข้า SERVER-GATED quest → farmer N บัญชีจะเร่ง access ทั้ง N ได้ถ้า batch ไม่เช็ค; **และ access ที่ปลดด้วย Sparks ไม่เคย bypass SEAM-1 fraud-gate ตอน mint Coin** (เป็น invariant ของ anti-gaming baseline)
- **Spin/draw mint = idempotent ผูก draw token** *(critique-major):* ทุกการ mint จาก spin/scratch ใช้ `idempotency_key=hash('SPIN',draw_id)` + `chance_draws` เป็น single-use token; replay = no-op (ดู 4.2)
- **Referral/invite "instant Sparks ทั้งสองฝั่ง" — REJECT-ไปจัดการที่ §2.4** *(critique-major, นอก section นี้)*: ปัญหา instant both-sided invite-Sparks เป็น Sybil amplifier เป็นของ §2.4 referral โดยตรง (ไม่ใช่ contest/variable-reward) — **เหตุผล reject เข้าหมวดนี้:** กลไกอยู่คนละ surface; **แต่ขอ cross-reference หลักการเดียวกัน:** invite-Sparks ต้องผูก A.8.13 cap + "invitee ต้องทำ verified action จริง" ก่อนปล่อย Sparks (ไม่ใช่ on-signup) — ให้ §2.4 บังคับ ไม่ใช่ §4

---

### 4.8 สรุป touchpoints (สำหรับ build)

- **money-gate (SEAM-1):** ทุก Coin reward (สุ่มหรือไม่) วิ่งผ่าน `GRANT` เดิม `funded_by='sponsor:<id>'` → `(1) COGS cap → (2) fraud A.8.12/A.8.13/velocity → (3) settled-solvency` → `coin_lots` → ledger double-entry — **ไม่มีประตูหลัง mint** (ตรง invariant doc 02b A2.5 SEAM-1)
- **ตารางใหม่ที่ต้องเพิ่ม:** `chance_draws` (append-only audit ของ `{draw_id, seed, odds_snapshot, outcome_id, reward_ref}` + single-use token สำหรับ track LEGAL) ; enum `content_reports.target_type` += `contest_entry` ; `spark_events.reason` += `lucky_draw` (cosmetic/Sparks track)
- **idempotency:** spin/draw → grant ใช้ `idempotency_key=hash('SPIN',draw_id)` (A.8.8 payload-bound) → replay no-op; mint ที่ draw-time ไม่ใช่ client-triggered
- **identity-graph wiring (BLOCKING):** group-membership edge + recurring-quest cooldown + merchant-side anti-self-redemption → ต้องเป็น input ที่ fail-closed ของ SEAM-1 step-2 (ขยาย A.8.12/A.8.13) — wire เข้า D3 identity-graph re-score hook (OPEN_DECISIONS §D)
- **batch Sparks:** collective/city-goal Sparks grant ผ่าน A.8.13 ต่อ recipient; access ที่ปลดด้วย Sparks ไม่ bypass SEAM-1
- **S5 reuse:** contest UGC ทั้งหมด → `content_reports` + `moderation_actions` + verified-visitor gate (T2+, เข้มกว่า S5.1.1) + triage (S5.2.3) + pHash (S5.6) — ไม่สร้าง moderation ใหม่; face-blur on-device = MANDATORY
- **S4 + tax:** ของรางวัลที่ไม่ใช่ Coin → S4 payout/voucher + 50-ทวิ / WHT ตาม C.5 (prize-income); creator recurring Coin payout → classification ผู้รับ (C14)
- **Flutter:** วงล้อ/ขูดบัตร = Flame/`CustomPainter` + `AnimationController` เล่น *ผลที่ server ส่งมา* ; Rive สำหรับ stamp reveal ; `confetti` + haptic ; **a11y: tap-to-reveal + announce outcome ทุก mechanic**; face-blur ก่อนส่งรูป — **client ไม่มี RNG ที่ตัดสินมูลค่า**
- **ป้าย "Sponsored":** ทุก surface ที่ merchant/sponsor จ่ายมีอิทธิพลต่อสิ่งที่ user เห็น (spin sponsor, featured quest/trail) ต้อง label "Sponsored/โปรโมต" ชัด; collectible-set วัฒนธรรมหลักยัง editorially-curated/pay-neutral (กัน pay-for-placement กลืน authentic discovery)
- **OPEN_DECISIONS เพิ่ม:** **C11** (random real-value reward + first-N race / ม.8 ชิงโชค — permit-required, build-time flag gate), **C12** (lucky-draw winner-selection / ม.8 + สลาก), **C13** (contest UGC PDPA/face-blur/defamation + community-vote-real-value), **C14** (creator Coin payout classification + prize-income WHT) — ทั้งหมด `LEGAL` ; C13(face-blur) + C11(permit-before-ship) = `BLOCKING-GA`

#### Critique disposition — variable-contests scope (รับ / ปฏิเสธ + เหตุผล)

| # | finding (severity) | disposition | ที่แก้ |
|---|---|---|---|
| 1 | first-N collective Coin drop = latency-race chance (**critical**) | **รับ** | 4.1 กฎ 5 + reclassify SERVER-GATED→LEGAL-CHECK ใน 4.6 + exhaustion-fallback 4.3 |
| 2 | client-RNG cosmetic ที่ gate Coin (transitivity) (**critical**) | **รับ** | 4.1 กฎ 2 (transitivity invariant) + Lucky-Stamp/mystery-box row 4.2 + checklist Q2 |
| 3 | group-quest collusion (merchant/ring) ไม่ block ที่ mint (**critical**) | **รับ** | 4.7 BLOCKING wired edge + per-cluster velocity + recurring cooldown + merchant anti-self-redemption |
| 4 | collective Sparks batch = farm amplifier เข้า access-gate (**major**) | **รับ** | 4.7 batch ผ่าน A.8.13 ต่อ recipient + access ไม่ bypass SEAM-1 |
| 5 | spin reveal replay / no idempotency (**major**) | **รับ** | 4.2 single-use draw_token + `idempotency_key=hash('SPIN',draw_id)` + mint ที่ draw-time |
| 6 | vote-decided real-value = popularity-lottery (**major**) | **รับ** | 4.4.2 neutral-judge หรือ Sparks/badge-only + vote-integrity audit + reclassify LEGAL 4.6 |
| 7 | sponsor-funded+free-entry ใกล้ safe-harbor เกิน (**minor**) | **รับ** | 4.1 "shield ≠ safe-harbor" + BLOCKED-จน-permit + build-time flag enforcement 4.6/4.8 |
| 8 | leaderboard ranking ไม่บังคับ T2+ verified ทุกที่ (**minor**) | **รับ** | 4.4 leaderboard row + กฎเหล็ก + checklist Q7 |
| 9 | set trading/gifting risk re-import value เข้า cosmetic track (**minor**) | **รับ** | 4.2 cosmetic non-transferable/non-tradable invariant + ❌-list 4.6 |
| 10 | referral instant both-sided Sparks = Sybil amplifier (**major**) | **ปฏิเสธ-ในหมวดนี้** | กลไกอยู่ §2.4 referral (คนละ surface) — cross-ref หลักการใน 4.7 ให้ §2.4 บังคับ A.8.13 + verified-action gate |
| 11 | hollow-loop / variable-reward ของ "ปริมาณ" อ่อน (**quality-major**) | **รับบางส่วน** | 4.3 note content/social surprise (ส่วน loop/content-pipeline ลึกอยู่หมวด loop-quality) |
| 12 | contribution loop ถูก defer (creator trails) (**quality-minor**) | **รับ** | 4.4 structured-tip เข้า MVP + creator-trail = curated/invite-only beta (forward) |
| 13 | a11y ของ spin/scratch reveal (**quality-minor**) | **รับ** | 4.2 tap-to-reveal + announce outcome (a11y feature ไม่ใช่แค่ reduced-motion) |
| 14 | temple/sacred-site gamification consent (**quality-flag**) | **รับ** | 4.4.2 temple consent gate (LEGAL-CHECK วัฒนธรรม) |
| 15 | pay-for-placement / sponsored disclosure (**quality-minor**) | **รับ** | 4.8 "Sponsored" label + collectible-set pay-neutral |
| 16 | streaks / FOMO-countdown / cultural-naming depth / cohort-banding (**quality major/minor**) | **ปฏิเสธ-ในหมวดนี้** | อยู่ §1.3/§1.4/§2.2/§2.5 (streak, leaderboard-toxicity, culture, FOMO) — ไม่ใช่ variable-reward/contest gate; ฝากหมวดที่เป็นเจ้าของ |
| 17 | F1 Nearby/BLE + contacts-hash PDPA (**major×2**) | **ปฏิเสธ-ในหมวดนี้** | อยู่ §2.1 social-graph/§5.2 (location-social cut) — ไม่ใช่ rewards/contest; ฝาก §2/§5 + DPO |
| 18 | cohort z-score shadow-freeze ไม่มี appeal (**legal-flag**) | **ปฏิเสธ-ในหมวดนี้** | leaderboard-eligibility อยู่ §2.2; transparency/appeal เป็นของหมวดนั้น |

---

## 5. Flutter Implementation Mapping, New Screens & Rollout

> **หลักการกำกับ section นี้ (สืบทอดจาก guardrails + doc 02b SEAM-1 + doc 04 §1.5/§1.7 + doc 06):**
> 1. **Sparks = client-rich, money = server-gated.** อนิเมชัน/particle/leaderboard ที่ขับด้วย Sparks หรือ cosmetic วาดบน client ได้เต็มที่ — แต่ **ห้าม client ตัดสินรางวัลจริง (Coin) เด็ดขาด**; ทุก Coin วิ่งผ่าน `grant_coins` / `cs_grant_goodwill` (single mint path, SEAM-1) เท่านั้น.
> 2. **render money จาก `coin_lots` เท่านั้น** (ตารางการเงินตัวเดียวที่ client มี SELECT policy ตาม doc04 §3); Sparks จาก `spark_balances`. **ห้ามแตะ `ledger_entries`.**
> 3. **Realtime = read-path เท่านั้น** (leaderboard/feed/co-op presence). Realtime **ไม่เคย** เป็น write-path ของเงิน — มัน broadcast ผลที่ NestJS post เข้า ledger แล้ว.
> 4. **สีคุมความหมาย (doc06 §1.2 locked):** Sparks ✦ violet `#7C5CFF` · Coins ◉ metallic gold `#C9962A` · brand amber `#E8852C` (CTA เท่านั้น) · jade `#1E8E7E` (earn/social) · teak `#5A4632` (passport ink). **ตัวเลขเงิน = ink-900 เสมอ · ห้ามมูลค่าบาทฝั่งผู้ใช้.**
> 5. **กฎ randomness-transitivity (เพิ่มจาก critique-critical):** ผลสุ่มใด ๆ ที่เป็น **input ไปสู่การปลด Coin/ของจริง — แม้ทางอ้อม** (เช่น "สุ่มได้ rare foil → foil ปลด Coin") **ต้องเป็น server-authoritative RNG**, log ใน `chance_draws`, และทั้งกลไกเป็น **[LEGAL-CHECK]**. **client RNG อนุญาตเฉพาะเมื่อผลและทุก downstream unlock เป็น Sparks/cosmetic ล้วน และไม่มีทางกลายเป็นมูลค่าจริงได้เลย.** เส้นนี้คือเส้นเดียวกับ Sparks→access→mint: ของที่สุ่มเป็น cosmetic ได้ แต่ **ผลลัพธ์ทางการเงินของมันต้อง server ตัดสิน.**
> 6. **กฎ access-never-bypass-mint (เพิ่มจาก critique-major):** Sparks ปลด *สิทธิ์เข้าถึง* quest ได้ แต่ **การ mint Coin ที่ปลายทางต้องผ่าน SEAM-1 fraud-gate (step 2) เสมอ** — access ที่ปลดด้วย Sparks **ไม่เคย bypass** identity/Sybil/velocity check ที่ mint. batch/collective Sparks grant ทุกชนิดวิ่งผ่าน A.8.13 Sybil/velocity ต่อผู้รับ (suppress duplicate ใน identity cluster).

---

### 5.1 Flutter Tech Map — เครื่องมือที่ถูกตัวกับ feature + performance budget

| Engagement feature type | เครื่องมือ Flutter ที่ถูกตัว | ทำไม | Classification | Performance budget |
|---|---|---|---|---|
| **Mascot / interactive collectible** (น้องช้าง "Soi mascot", reactive stamp, tier-pet) | **Rive** (state-machine, runtime input) | Rive รับ input (tap/streak-count/tier) แล้วเล่น state ต่างกันใน 1 artboard — เบากว่า video, vector, แตะตอบสนองได้ | [PURE-FLUTTER] | mascot artboard 1 ตัว/หน้าจอ; cache state-machine controller; pause เมื่อ off-screen (`VisibilityDetector`) |
| **Designer-authored celebration** (coin-mint shimmer, badge-unlock, festival burst) | **Lottie** (designer ส่ง .json จาก AE) | hand-off จาก motion designer ตรง ๆ, ไม่ต้องโค้ด; ดีกับ one-shot ที่ไม่ต้อง interactive | mint shimmer = **[SERVER-GATED]** (เล่น *หลัง* grant_coins สำเร็จ); badge/Sparks burst = **[PURE-FLUTTER]** | preload .json ของ celebration ที่ "กำลังจะถึง" (quest 4/5); one-shot แล้ว dispose; ห้ามค้าง composition ใน memory |
| **Mini-game / treasure-hunt / map mini-quest** (Songkran water-splash, Yi Peng lantern-release, "tap to catch") | **Flame** (2D game loop บน Flutter) | game loop + sprite + collision; แยก surface จาก main widget tree | reward = Sparks/cosmetic → **[PURE-FLUTTER]**; reward = Coin/real → **[SERVER-GATED]** (score เป็น *input* ที่ server ตัดสิน, ไม่ใช่ client) | Flame component เปิดเฉพาะตอนเข้า mini-game route; เป้า 60fps; cap particle; ปิด loop เมื่อ pause |
| **Foil / shine / holographic** (rare stamp, legendary badge, seasonal cover) | **Fragment shader** (`.frag`, Flutter `FragmentProgram`) | gradient-sweep / angle-reactive sheen ทำบน GPU — ถูกกว่าซ้อน 30 sprite | sheen = cosmetic → **[PURE-FLUTTER]**; **ถ้า rarity/foil-tier ปลด Coin → ทั้ง draw เป็น [LEGAL-CHECK] + [SERVER-GATED]** (transitivity rule §guard-5: foil ที่ผลปลดเงินต้องมาจาก server RNG, client ไม่สุ่มว่าใครได้ rare) | 1–2 shader pass/หน้าจอ; ผูก sheen กับ gyroscope **throttle ~30Hz**; fallback static gradient เมื่อ `prefers-reduced-motion` หรือ low-end; **tap-to-shimmer fallback** สำหรับเครื่องที่เอียงไม่ได้/mount ไว้ (a11y §5.6) |
| **Particle / confetti / Sparks-float** (stamp-thud splatter, +Sparks rise, leaderboard rank-up) | **`confetti` pkg + CustomPainter** | particle จำนวนจำกัด, วาดเองคุม budget ได้; CustomPainter สำหรับ progress-ring/passport-page | **[PURE-FLUTTER]** | particle ≤120 ต่อ burst; **off the hot path** (overlay layer แยก, ไม่ rebuild list); honor reduced-motion → fade |
| **Live leaderboard / activity feed / co-op presence** | **Supabase Realtime** (Postgres changes + presence) | live rank/feed/"เพื่อนอยู่ในร้านนี้" ฟรีจาก read-path (doc05 P1: อ่านจาก read replica) | **[SUPABASE-REALTIME read]** — ranking = Sparks/activity **ห้าม Coin** | subscribe เฉพาะ scope ที่เห็น (district/friends); debounce UI update ~500ms; unsubscribe on dispose; ไม่ rebuild ทั้ง list ต่อ event |
| **Light AR** (festival selfie-frame, scan-to-collect lantern, place-overlay) | **AR plugin เบา** (`ar_flutter_plugin`/ARCore-ARKit) หรือ camera + overlay + ML Kit | tourist/Chinese-FIT shareable; แต่ AR หนัก → ใช้แบบ "selfie frame + sticker" ก่อน, full-plane-detect ทีหลัง | selfie/sticker = **[PURE-FLUTTER]**; scan-to-collect-Coin = **[SERVER-GATED]** (scan = check-in input, Coin จาก grant_coins) | AR session เปิดเฉพาะ route นั้น + ปิดทันทีที่ออก (กิน battery/thermal); degrade เป็น static frame บนเครื่องไม่รองรับ; **on-device face-blur ของ bystander = บังคับก่อน share/submit** (PDPA §5.5) |
| **Spin-wheel / scratch-card surface** | **Flame หรือ CustomPainter + Lottie reveal** | UI หมุน/ขูดทำ client; **แต่ผลลัพธ์มาจาก server** | **[LEGAL-CHECK] + [SERVER-GATED]** — ดู §5.4 V2 + §5.5 | render แค่ animation ของผลที่ server ส่งมาแล้ว; **client ไม่สุ่มผล**; **animation outcome = cosmetic ไม่ authorize mint** (mint เกิด server-side ตอน draw, idempotent); reduced-motion / blind → "แตะเพื่อเปิดผล" ตรง |

**Performance budget — กฎรวม (ผูกกับ doc06 §1.6 motion + §1.7 a11y):**

- **เป้า frame:** 60fps baseline, 120fps บนจอ ProMotion/high-refresh สำหรับ scroll + leaderboard; **heavy effect (shader/Flame/AR) ห้ามอยู่บน hot path** ของ map scroll / list scroll / check-in.
- **Lazy-load + preload-ahead:** asset หนัก (Rive mascot, festival Lottie, shader) **lazy-load** ตอนเข้า route; แต่ **preload celebration ของ value-capture ที่ใกล้ถึง** (quest stamp N-1 → preload mint shimmer) เพื่อ moment ไม่กระตุก.
- **Off-screen pause:** ทุก animated surface ต้อง pause เมื่อไม่เห็น (`VisibilityDetector` / `TickerMode`) — ไม่เผา GPU บน tab ที่ซ่อน.
- **Isolate offload:** Realtime payload diff + leaderboard sort/merge ที่ใหญ่ → compute ใน `Isolate`/`compute()` ไม่บล็อก UI thread (ขับ Chinese-FIT share-card render ด้วย).
- **reduced-motion / low-end degrade:** ทุก effect มี fallback (particle→fade, shader→static gradient, AR→static frame) — บังคับตาม doc06 §1.7. **first-stamp ห้ามฉลองก่อน server-confirm** (doc06 §1.6) → ใช้ provisional state เดียวกันกับ flow มีอยู่.
- **Skia/Impeller:** ปล่อย Impeller จัด shader/particle; ทดสอบ jank บน Android mid-range (segment TH/Chinese-FIT ราคาถูก) เป็น gate ของ release.
- **Aggregate-pressure budget (เพิ่มจาก critique-minor FOMO-honesty):** จำกัดจำนวน countdown/urgency surface ที่ผู้ใช้เห็นพร้อมกันต่อจอ; live participation counter = **celebratory-on-arrival ไม่ใช่นาฬิกาเดินตลอด**. มี **"calm mode"** (ผูก a11y settings) ที่ซ่อน countdown + live counter โดยคงตัว collection/progress ไว้ครบ — สำหรับผู้ใช้ที่ไวต่อ urgency-anxiety.

---

### 5.2 New Screens / Components — ที่ต้องเพิ่มเหนือ doc 06

doc 06 มี: passport/stamp (§1.5), quest detail (§2.6), wallet (Sparks/Coins แยก, §2.9), bottom-nav 5 แท็บ (Home·Discover·**Passport**·Wallet·Profile, §1 v2 #5), neighborhood leaderboard (5.C4), agent leaderboard (§4.6). **เลเยอร์ social/engagement เพิ่มเข้าใต้ Passport tab + Profile** (ไม่เพิ่มแท็บที่ 6 — รักษา canonical 5-tab) ดังนี้:

**A) Friends / Social Graph (ใต้ Profile · opt-in)** [PURE-FLUTTER · PDPA LEGAL-CHECK]

```
┌───────────────────────────────────┐
│ ← เพื่อน                    [+ เพิ่ม]│  paper bg #FBF6EE
│ ┌───────────────────────────────┐ │
│ │ 🔒 เปิดระบบเพื่อน?             │ │ ← opt-in gate (ปิด default)
│ │ เพื่อนเห็นชื่อ+กิจกรรมย่านคุณ    │ │   PDPA consent card
│ │ ปิดเมื่อไหร่ก็ได้ · [เปิด]      │ │
│ └───────────────────────────────┘ │
│ คำขอ (2)                           │
│  • somchai_cnx   [รับ] [ปฏิเสธ]    │
│ เพื่อน (12)                         │
│  ✦ Nok      #3 Nimman · 🔥21วัน    │ ← Sparks rank, ไม่มี Coin
│  ✦ Beam     #7 Santitham           │
│      ⋯ [ดูโปรไฟล์] [บล็อก] [รายงาน]│ ← harassment handling
└───────────────────────────────────┘
```
- **เพิ่มเพื่อนด้วย QR / username / hashed-contacts-opt-in เท่านั้น** — **ไม่มี location-discovery "คนใกล้คุณ" และ ไม่มี BLE/`nearby_connections` proximity-add** (location-social = sensitivity สูงสุด; **ตัดออกจาก MVP/V1**, ดู §5.5 + DEFERRED ใน §5.4). แสดงเฉพาะ `display_name` + Sparks-rank/streak/badge — **ไม่เคยแสดง Coin/มูลค่า/ตำแหน่งสด.**
- **hashed-contacts firewall (เพิ่มจาก critique-major):** match แบบ **per-request ephemeral เท่านั้น** — ไม่ persist ชุด contact-hash, **ไม่ correlate contact-hash ข้ามผู้ใช้** (กัน reconstruct social-graph ของคนที่ไม่ได้ยินยอม), **ไม่สร้าง edge ไปยัง non-user**, แยก granular consent เฉพาะ contacts. match แล้ว discard ไม่เก็บเป็น graph — ตรง firewall "เก็บ fact ไม่เก็บ graph" ของ doc04 PDPA baseline.
- ทุกแถวมี **block + report** (mirror entry → S1 Support/moderation queue ที่ doc07 เป็นเจ้าของ). blocked = หายจาก feed/leaderboard ของกันและกัน.

**B) Leaderboard Hub (ใต้ Passport tab · ขยายจาก 5.C4)** [PURE-FLUTTER read · SUPABASE-REALTIME]

```
┌───────────────────────────────────┐
│ 🏆 อันดับ        [ย่าน][เพื่อน][ฤดู]│ ← 3 scope tab (NEVER global money)
│  scope: Nimman · มือใหม่ · สัปดาห์นี้│ ← cohort = ย่าน × tenure-band
│ ┌───────────────────────────────┐ │
│ │ 1 🥇 BaristaBoy      1,240 ✦   │ │  ✦ violet · เลข ink-900
│ │ 2 🥈 chiangmaicat      980 ✦   │ │  ● live dot = อยู่ในย่านตอนนี้
│ │ 3 🥉 นก (คุณ)          910 ✦   │ │  ← ตัวเอง highlight (jade ring)
│ │ 4    nomad_jane        870 ✦   │ │
│ └───────────────────────────────┘ │
│ อีก 70 ✦ แซง #2!                   │ ← actionable gap (ขับ return)
│ all-time best: 1,510 ✦             │ ← progress ไม่ถูกลบทุกสัปดาห์
│ [รีเซ็ตทุกจันทร์] · opt-out อันดับ  │ ← PDPA visibility control
└───────────────────────────────────┘
```
- **ranking = Sparks/activity เท่านั้น** (`spark_balances` scope `district_id` หรือ friends-set + weekly window). **ห้าม ranking บน Coin/เงินที่ถือ** (toxic + e-money signal — guardrail, ผูก doc06 §4.7/5.C4). live ● มาจาก Realtime presence (opt-in, แสดง "อยู่ในย่าน" coarse ไม่ใช่พิกัด).
- **นับเฉพาะ verified-tier Sparks (เพิ่มจาก critique-minor):** leaderboard aggregate นับเฉพาะ activity Sparks จาก **T2+/`verified_visit`** (rotating_qr/proven_purchase); soft/optimistic `gps_dwell` Sparks สะสมเข้า tier/fun แต่ **excluded/down-weighted ใน ranking** — กัน fake/soft check-in ดันอันดับถูก ๆ.
- **cohort = ย่าน × tenure-band (เพิ่มจาก critique-minor toxicity):** แบ่ง cohort ด้วย **ทั้งย่านและ tenure/activity-band** (มือใหม่แข่งมือใหม่, นักท่องเที่ยวไม่โดน local power-user ถล่ม) — ขยาย tier-banding ที่ doc06 ทำระดับเมืองลงมาที่ neighborhood. cohort ≤30, league, rank-band สำหรับนอก top-10 (ไม่ใช่อันดับ shaming).
- **soft relegation:** ตก league = framing แบบโอกาส ("คุณลง Silver — เก็บอีก X ✦ กลับขึ้นได้") **ไม่มี loss-animation**; league ล่างสุด = promote-only ไม่ relegate.
- **velocity-freeze โปร่งใส + appeal (เพิ่มจาก critique-minor + legal):** z-score velocity freeze ต้องไม่ silent — แสดง state **"อันดับกำลังตรวจสอบ"** + self-serve appeal path; กัน false-positive ที่ลบ superfan จริงออกเงียบ ๆ (PDPA fairness/transparency → DPO review).
- **opt-out → ตัวเองหายจากอันดับสาธารณะ** แต่ยังเห็น rank ตัวเอง (private). reset window แสดงชัด + คง **all-time best** คู่กับเลขสัปดาห์ = softener กัน weekly-cliff = ไม่ใช่ dark-pattern FOMO ถาวร.

**C) Group-Quest Lobby (co-op cafe-hop)** [PURE-FLUTTER lobby + SUPABASE-REALTIME · reward = SERVER-GATED]

```
┌───────────────────────────────────┐
│ 👥 ก๊วน Cafe-Hop · "Nimman Crew"   │
│ เก็บครบ 5 ร้าน *รวมก๊วน* → ปลดล็อก  │ ← co-op goal (deterministic-by-effort)
│ ┌──────┬──────┬──────┬──────┬─────┐│
│ │✦Nok  │✦คุณ  │ ?    │ ?    │ ?   ││ ← ใครเก็บช่องไหน (Realtime)
│ │ ร้าน1│ ร้าน2│      │      │     ││
│ └──────┴──────┴──────┴──────┴─────┘│
│ ความคืบหน้า 2/5 · เหลือ 3 ร้าน      │
│ 🎁 รางวัล: กาแฟฟรีทั้งก๊วน ☕        │ ← ของรางวัล, ไม่มีบาท
│   (มอบเมื่อครบ · ผ่านเคาน์เตอร์ร้าน) │ ← มอบทีละคนผ่าน grant_coins
│ [เชิญเพื่อน] [แชร์ลิงก์ก๊วน]        │
└───────────────────────────────────┘
```
- lobby state (ใครอยู่/ใครเก็บอะไร) = **Realtime presence + broadcast** (read-path). **รางวัล Coin ของแต่ละคน mint แยกผ่าน `grant_coins` ของคนนั้น** เมื่อก๊วนปิด goal — escrow pool ต้อง `fund_quest` ครอบ N คน (`escrow_locks(lock_reason='quest_pool')`), COGS cap ของ funder บังคับต่อ redemption เหมือนเดิม. **co-op = deterministic-by-effort ("ครบ X รวมกัน → ทุกคนที่ทำได้ ได้")** ไม่ random ไม่แข่งความเร็ว → ปลอด gambling.
- **anti-collusion = BLOCKING wired (เพิ่มจาก critique-critical):** verified_visit (rotating QR ที่เคาน์เตอร์) พิสูจน์ *การอยู่จริง* แต่ไม่กัน *ring จริงที่สมคบ* (เพื่อน 4 คน + คาเฟ่ร่วมมือ harvest "กาแฟฟรีคนละแก้ว" ซ้ำทุก recurring/seasonal group quest). ต้องทำ:
  1. **group-membership → identity-cluster edge เป็น input ที่ wire เข้า SEAM-1 fraud-gate (step 2) จริง** (ไม่ใช่แค่ analytics signal) — visibility (SEAM-5) ≠ fraud-gate coverage (ตรง doc02b A2.9-#2). [โหลด `identity_graph` ที่ m#3; ก่อนหน้านั้น co-op-Coin **gate ที่ device-overlap + gate goodwill/co-op-at-scale** ตาม doc04 §1.5 #3 ทางเลือก]
  2. **per-merchant × per-correlated-identity-cluster velocity cap** + **recurring-quest cooldown** กัน ring เดิม re-harvest ทุกรอบ.
  3. **merchant-side anti-self-redemption:** flag ร้านที่ redemption กระจุกจาก identity cluster เดิมซ้ำ ๆ (ขยาย A.8.12 ไปฝั่ง funder).

**D) Collectible-Set Gallery (ใต้ Passport · ขยาย badge case)** [PURE-FLUTTER]

```
┌───────────────────────────────────┐
│ 📖 คอลเลกชัน      สะสม 7/12 ย่าน    │
│ ┌─────┐┌─────┐┌─────┐┌╌╌╌╌┐┌╌╌╌╌┐ │
│ │🛕 ✓ ││☕ ✓ ││🎨 ✓ ││ 🔒 ││ 🔒 │ │ teak ink stamp · 🔒/✓ ไอคอน
│ │วัด  ││คาเฟ่││อาร์ต││ล็อค││ล็อค│ │ ← locked/earned = ไอคอน+label
│ └─────┘└─────┘└─────┘└╌╌╌╌┘└╌╌╌╌┘ │   (ไม่พึ่งสี/ความสว่างอย่างเดียว)
│ ── ชุดฤดูกาล (limited) ──          │
│ ┌─────┐┌─────┐  ✦ rare foil sheen │ ← fragment shader (gyro/tap)
│ │🏮 ✓ ││💧   │  "ป๋าเวณียี่เป็ง 2026"│ ← คำเมือง + คำแปล
│ └─────┘└╌╌╌╌┘  ◷ หมดเขต 9 วัน      │ ← FOMO ที่ healthy (มี timer)
│ เก็บครบชุด → 🏅 badge "เจ้าถิ่น CNX"│ ← reward = Sparks/badge (ไม่มี Coin)
└───────────────────────────────────┘
```
- ใช้ **passport/stamp metaphor เดิม** (doc06 §1.5): empty = dashed outline, เก็บแล้ว = teak ink stamp + วันที่. **rare/seasonal = fragment-shader foil sheen (cosmetic ล้วน, ผูก gyro/tap)**. set-completion reward = **Sparks + badge** (variant ไม่มี escrow card, ตรง doc06 Seasonal/Collectible Quest Card) → tourist "fast collectible win" + local long-term collection ในจอเดียว.
- **invariant: cosmetic/collectible = non-transferable, non-tradable เด็ดขาด (เพิ่มจาก critique-minor).** ไม่มี trade/gift → ไม่มี secondary market → foil-rarity **ไม่มีวันได้มูลค่าจริง** (กัน re-import e-money/loot-box เข้า track ที่เคลมว่า "zero liability"). ถ้าจะเปิด gifting ภายหลัง = ต้อง gambling+e-money legal review + ยืนยันว่า rare-foil ห้ามเป็น subject ของการได้มาแบบ paid/random.
- **transitivity guard (เพิ่มจาก critique-critical):** ถ้าวันใด rare-foil tier ถูกออกแบบให้ *ปลด Coin* → ทั้ง draw ของ rare-tier ต้องเป็น **server-authoritative RNG + `chance_draws` + [LEGAL-CHECK]** (§guard-5). MVP: foil = cosmetic ล้วน, **set-completion = deterministic-by-effort** เท่านั้น.
- **variable reward of CONTENT/SOCIAL (เพิ่มจาก critique-major hollow-loop):** แต่ละ stamp ปลด **เนื้อหาเฉพาะที่** — เกร็ด Lanna lore / เคล็ดบาริสต้า / เมนูลับ / **stamp ARTWORK เฉพาะร้าน (artist-collab)** — ให้ check-in *เผยอะไรใหม่* ไม่ใช่แค่ +1 counter. ต้องมี **content pipeline** ป้อน novelty (ไม่งั้น loop = treadmill ของ "ตัวเลขขึ้น"); จับคู่ craft-trail §5.5 cultural.

**E) Activity Feed (ใต้ Passport · opt-in)** [PURE-FLUTTER · SUPABASE-REALTIME · PDPA]

```
┌───────────────────────────────────┐
│ 🗞 ความเคลื่อนไหว (เพื่อน · ย่าน)    │
│ • ✦ Nok เก็บแสตมป์ที่ Graph Cafe   │ ← activity, ไม่ใช่ money
│ • 🎉 มีคนในย่านเชียร์ streak คุณ!   │ ← social variable reward
│ • 🏅 Beam ได้ badge "Santitham"    │
│ • 👥 ก๊วน "Nimman Crew" ปิด quest!  │
│ • 🔥 Nok streak แตะ 21 วัน          │
│   ─────────────────────────────    │
│ 🔕 ตั้งค่าความเป็นส่วนตัว          │ ← data minimization
└───────────────────────────────────┘
```
- feed = **Sparks/badge/streak/quest events เท่านั้น** (จาก `spark_events` + badge unlock). **ไม่เคย post "ได้ Coin/รางวัลมูลค่า X"** (กัน e-money signal + กัน flexing เงิน). visibility ต่อ event-type เลือกได้ (เก็บ streak/badge แต่ซ่อน check-in). default = friends-only.
- **social variable reward (เพิ่มจาก critique-major hollow-loop):** surprise-social ("เพื่อนเพิ่งแซงคุณ" / "มีคนในย่านเชียร์ streak คุณ") = dopamine ที่ไม่หมดอายุเหมือน variable-of-quantity — เป็น retention numerator จริงสำหรับ local ที่เล่นยาว.

**F) Scratch / Spin Surface (V2 · legal-gated)** [LEGAL-CHECK + SERVER-GATED]

```
┌───────────────────────────────────┐
│ 🎟 การ์ดขูด (สปอนเซอร์: ร้าน X)     │
│ ┌───────────────────────────────┐ │
│ │   ▓▓▓▓ ขูดเพื่อเปิด ▓▓▓▓       │ │ ← CustomPainter mask
│ │   (ผลถูกกำหนดโดยเซิร์ฟเวอร์)    │ │   client = animation เท่านั้น
│ │   [แตะเพื่อเปิดผล]             │ │ ← a11y/blind/reduced-motion path
│ └───────────────────────────────┘ │
│ โอกาส (โปร่งใส): ☕30% 🍰20% ✦50%  │ ← transparent odds (บังคับ)
│ 🏷 สปอนเซอร์โดย ร้าน X · ตรวจ legal │ ← sponsored label + sign-off
└───────────────────────────────────┘
```
- **client ไม่สุ่ม** — ขอผลจาก server (server-authoritative RNG ใน NestJS); UI เล่นแค่ reveal. **animation outcome เป็น cosmetic ไม่ authorize mint.**
- **replay/idempotency hardening (เพิ่มจาก critique-major):** ทุก spin ผูก **single-use server-issued draw token** บันทึกใน `chance_draws`; ถ้าผล = Coin → `grant_coins`/`cs_grant_goodwill` ใช้ **`idempotency_key = hash(draw_id)`** → replay token = no-op; mint เกิด **server-side ตอน draw (หรือ atomically reserved)** ไม่ใช่ client trigger หลัง animation. COGS cap + sponsor-funded budget บังคับ.
- **ต้องผ่าน ม.8 permit + gambling/lottery sign-off ก่อน ship** (§5.5). default ของ MVP/V1 = **ไม่มี random** (prefer deterministic).
- **paid-placement disclosure (เพิ่มจาก critique-minor):** ทุก surface ที่ merchant จ่ายเพื่อ influence สิ่งที่ผู้ใช้เห็น (sponsored quest/trail/festival placement/scratch sponsor) ต้องติดป้าย **"สปอนเซอร์/ได้รับการสนับสนุน"** ชัด; **firewall: paid visibility เพิ่ม reach ได้ แต่ห้าม "ซื้อ" เข้า curated cultural collectible set** — ชุดสะสมวัฒนธรรมแกนกลางต้อง editorially-curated / pay-neutral เพื่อรักษาสัญญา authentic-discovery.

**G) Zero-State Tourist Hook — Single-Stamp Share Artifact (MVP · ใหม่)** [PURE-FLUTTER]
> *เพิ่มจาก critique-major "tourist fast-win เป็น slow-win จริง": MVP เดิมแทบไม่มีอะไรให้นักท่องเที่ยว tenure สั้นที่ไม่มีเพื่อน/streak/history.*

```
┌───────────────────────────────────┐
│  ✶ เช็คอินแรกของคุณในเชียงใหม่! ✶  │
│ ┌───────────────────────────────┐ │
│ │   [Lanna postcard · art ร้าน]  │ │ ← artifact สวย, location-stamped
│ │   "I'm in Chiang Mai · Nimman" │ │   ✦ Sparks +1 (ไม่มี Coin/บาท)
│ │   ☕ Graph Cafe · 14 มิ.ย. 2026 │ │
│ └───────────────────────────────┘ │
│ [แชร์ → RED] [WeChat] [LINE] [บันทึก]│ ← one-tap, ไม่ต้อง opt-in social
└───────────────────────────────────┘
```
- **first single check-in มินต์ artifact สวย shareable ทันที** (Lanna postcard + art ร้าน) → share ไป RED/WeChat/LINE one-tap, **ไม่ต้อง opt-in social, ไม่ต้องเก็บครบ set**. แชร์ **ห้ามมี Coin/บาท** บน artifact (กัน e-money signal). render share-card ใน Isolate.
- **single-stamp shareable** (ไม่ใช่เฉพาะ set-completion) + **"3-stop tourist starter trail" (คาเฟ่+วัด+ตลาด) จบได้ในบ่ายเดียว** → ให้ **deterministic small real reward (Coin)** วันแรกผ่าน `grant_coins` (escrow ร้าน) → tourist ได้ value-win จริง 1 ครั้งใน day-1. ดึง minimal share-card path เข้า **MVP** (ไม่รอ V1).

**H) Local Contribution Loop — Structured Tip (MVP/V1 · ใหม่)** [PURE-FLUTTER · S5-moderated]
> *เพิ่มจาก critique-minor "consume-and-collect ไม่ใช่ co-create": loop ที่ทนที่สุดสำหรับ local คือ contribution (เป็นเสียงท้องถิ่นที่ถูกยอมรับ) — เดิมถูกเลื่อนไป V2/LEGAL-CHECK.*

```
┌───────────────────────────────────┐
│ ✍️ ทิปจากคนท้องถิ่น · Graph Cafe   │
│  [เมนูลับ▾] [ช่วงเวลาดี▾] [ที่นั่ง▾]│ ← fixed-field (moderation ต่ำ)
│  "สั่ง dirty ตอนบ่าย มุมริมหน้าต่าง"│
│  ─────────────────────────────    │
│  🏅 ทิปคุณช่วยผู้มาเยือนแล้ว 12 คน  │ ← first-class social reward
└───────────────────────────────────┘
```
- local ทิ้ง **structured tip ต่อร้าน 1 อัน** (fixed-field เหมือน fixed-set reactions ที่มีอยู่ → moderation surface ต่ำ ผ่าน S5 guardrail ไม่ใช่เหตุเลื่อน) + ได้ **recognition title** ("คนช่วยมากที่สุดในย่าน"). **"ทิปคุณช่วยผู้มาเยือน 12 คน" = social reward ชั้นหนึ่ง** = local moat ที่แข็งสุด.
- **creator-trail = curated/invite-only beta สำหรับ trusted local** (ดึงมาจาก far-V2 legal-blocker) — creator-status คือ local moat; treat UGC เป็น engine มี S5 เป็น guardrail, ไม่ใช่เหตุ defer.

**I) Photo Challenge / Community Voting** [SERVER-GATED · LEGAL-CHECK ถ้าให้ของจริง]
> *เพิ่มจาก critique-major "vote-decided real prize = popularity-lottery".*

- รางวัลตัดสินด้วยโหวต = **ถ้ารางวัลเป็น Sparks/badge → OK [PURE-FLUTTER]**. **ถ้าโหวตตัดสิน Coin/ของจริง → ต้องเป็น neutral-judge adjudication (เกณฑ์เป็นเอกสาร) หรือ จำกัดผลโหวตที่ Sparks/badge เท่านั้น**; ถ้ายืนยันให้โหวตตัดสินมูลค่าจริง = **[LEGAL-CHECK] ม.8 chance-adjacent** + legal sign-off + vote-integrity audit log. prize pool **cap ด้วย sponsor escrow + COGS cap ไม่ขึ้นกับยอดโหวต** + clawback. anti-brigading (S5 trust-weight) ยังคงไว้.
- **on-device face-blur ของ bystander = บังคับก่อน submit** (PDPA + image rights ในที่สาธารณะเชียงใหม่); consent เผยแพร่ subject ที่ identify ได้ = explicit (BLOCKING-GA).

---

### 5.3 Server / Ledger Touchpoints — ใครเรียก NestJS vs client vs Realtime

| Feature | Path | Touchpoint ที่ชัด | กฎ |
|---|---|---|---|
| Streak counter + streak bonus | **pure-client display + Sparks** | `spark_events(reason='streak_bonus')` → `spark_balances` (non-money, อยู่นอก money-ledger; `spark_reason` enum doc04) | client คำนวณ streak จาก check-in days; bonus เป็น Sparks ผ่าน spark path, **ไม่แตะ ledger** |
| Neighborhood / friends / seasonal leaderboard | **Supabase Realtime read** | SELECT `spark_balances` scope `district_id`/friends + window (**verified-tier T2+ เท่านั้น**); subscribe Postgres changes (P1: read replica) | **read-only**; ranking = verified-tier Sparks; **ไม่มี write-path เงิน** |
| Activity feed + co-op lobby presence | **Supabase Realtime read + presence** | broadcast `spark_events`/badge unlock; presence = อยู่ในย่าน/ก๊วน (coarse) | opt-in; แสดง activity ไม่ใช่ money |
| Collectible-set / badge unlock | **pure-client + Sparks** | badge จาก completion evaluator; set reward = Sparks+badge (variant ไม่มี escrow) | cosmetic + Sparks; **non-transferable**; ปลอด legal (เว้น rare-foil→Coin = §guard-5) |
| **Collective Sparks bonus (city-goal batch)** | **batch Sparks + Sybil-gated** | ถึงเป้า → batch `spark_events` ต่อผู้ร่วม | **batch grant วิ่งผ่าน A.8.13 Sybil/velocity ต่อผู้รับ** (suppress duplicate ใน identity cluster); access ที่ Sparks ปลด **ไม่ bypass** SEAM-1 mint-gate (§guard-6) |
| Group-quest **Coin reward** | **NestJS money-gate** | `fund_quest`/`join_quest` (escrow lock pool ครอบ N คน) → ต่อคน `grant_coins` (SEAM-1: COGS cap → fraud-gate → settled-solvency → mint + `coin_lots`) | **ทุก Coin วิ่ง grant_coins**; deterministic-by-effort; **group-membership→identity-cluster edge = BLOCKING input ที่ fraud-gate step 2**; per-merchant×cluster velocity cap + recurring cooldown |
| **First-N / "X คนแรก" collective Coin drop** | **NestJS money-gate · RECLASSIFY → LEGAL-CHECK** | **ห้าม latency-race**; ใช้ deterministic-by-effort "ทุกคนที่ทำครบ X ได้ จน pool/COGS cap หมด" → pool หมด = ทุกคน eligible ที่เหลือได้ **grant-fail fallback ไม่ใช่ loss เงียบ** | latency race = chance allocation (ม.8) + farm-prone (bot ยิงเร็วชนะ) → **[LEGAL-CHECK]**; per-identity-cluster rate-limit ที่ claim endpoint |
| Quest/AR scan-to-collect **Coin** | **NestJS money-gate** | scan = `check_in` (non-money) → ปิด quest → `grant_coins` handoff (EARN→GRANT bridge, doc04 §1.7 #4 / contract C5) | client ส่ง check-in input; **server ตัดสินรางวัล** |
| Mini-game (Flame) reward | **แยกตาม reward** | Sparks → `spark_events`; Coin → score เป็น input → `grant_coins` | client **ไม่ตัดสิน Coin จาก score**; server re-validate |
| Coin-mint celebration (Lottie/confetti) | **client เล่นหลัง server ok** | เล่นเมื่อ `grant_coins` คืน success + อ่านยอดใหม่จาก `coin_lots` | **ห้ามเล่น mint ก่อน grant สำเร็จ** (เหมือน first-stamp rule doc06 §1.6) |
| Wallet / Coin balance + expiry | **client read `coin_lots`** | `coin_lots(remaining_minor, expires_at, state)` — ตารางการเงินตัวเดียวที่ client SELECT ได้ | **ห้ามอ่าน `ledger_entries`**; ไม่มีมูลค่าบาท |
| Streak-freeze "ซื้อด้วย Sparks" | **pure-client + Sparks** | debit `spark_events`; **ไม่ใช่ Coin** (กัน pay-to-win-real-money); **fixed low Sparks cost + monthly cap** (กัน farm จน meaningless) | freeze ซื้อด้วย Sparks เท่านั้น; ดู streak contract §5.6 |
| Referral **Sparks (both-sided)** | **Sybil-gated Sparks** | invite Sparks **ผูก A.8.13 Sybil/velocity ต่อ inviter/day + per identity cluster** | **instant both-sided Sparks ต้อง gate เหมือน Coin** (เพิ่มจาก critique-major): invite-Sparks ผูกเงื่อนไข **invitee ต้องทำ genuine verified action** ไม่ใช่แค่ signup; cap/inviter/day + per cluster |
| Scratch/spin random reward | **NestJS RNG + money-gate (V2)** | server RNG → `chance_draws` (single-use draw token) → ถ้า Coin: `grant_coins`/`cs_grant_goodwill` (sponsor budget) `idempotency_key=hash(draw_id)` | **client ไม่สุ่ม**; replay = no-op; sponsor-funded; ม.8 permit + legal sign-off |
| Friends/feed notification | **NestJS S2 outbox** | S2 transactional template (3 ภาษา), consent-gated, low-volume | push เฉพาะ opt-in (doc06 §2.11 primer); ไม่ spam; ดู quiet-hours §5.6 |

> **เส้นกฎเหล็ก (ย้ำ):** ไม่มี engagement feature ใด **มินต์ value นอก gate**. Sparks/cosmetic/social = client + Realtime read (Sparks ทุก batch ผ่าน Sybil cap; access ไม่ bypass mint-gate); **ทุกอย่างที่กลายเป็น Coin หรือของจริง — แม้ผ่านการสุ่มทางอ้อม = `grant_coins`/`cs_grant_goodwill` ตัวเดียว** (single mint path, ไม่มีประตูหลัง — ตรง doc02b SEAM-1). Realtime ไม่เคยเขียนเงิน. **ผลสุ่มที่ปลด Coin = server RNG เสมอ.**

---

### 5.4 Phased Rollout — MVP → V1 → V2 (broad-system / dense-rollout)

> สอดคล้องหลัก "สร้างกว้างวันแรก เปิดตัวทีละย่าน" (README §1): schema/edge-fn ของทั้ง 3 เฟสมี hook เผื่อไว้ตั้งแต่ migration #1 (`spark_reason` enum ครบ, `quest_progress.reward_grant_id`, `escrow_locks(quest_pool)`) — **เฟสคือการเปิด UI/feature ทีละชั้น ไม่ใช่การ re-architect.** *(หมายเหตุ: identity-correlation surface สำหรับ co-op/goodwill anti-collusion ที่เต็มตัวมาที่ m#3 ตาม doc04 §1.5 #3 — ก่อนหน้านั้น gate co-op-Coin/goodwill-at-scale ตามทางเลือกที่ founder เคาะ.)*

| Phase | ship อะไร | Classification รวม | Flutter tech | เหตุผล (retention/cost/legal) |
|---|---|---|---|---|
| **MVP** (cheap · high-retention · zero-legal) | • Streak counter + streak-freeze (Sparks, contract §5.6)<br>• Neighborhood leaderboard (Sparks, weekly reset, tenure-banded)<br>• Seasonal collectible / Weekly Drop (Sparks+badge)<br>• Collectible-set gallery + badge case (content-reward layer)<br>• Soi mascot (Rive) + stamp-collect/mint celebration<br>• **Single-stamp share artifact + 3-stop tourist starter trail (G)**<br>• **Structured local tip + recognition title (H, lightweight)** | **[PURE-FLUTTER]** ทั้งหมด ยกเว้น mint shimmer + 3-stop trail reward ที่ผูก grant_coins ที่มีอยู่แล้ว | Rive (mascot), Lottie (mint/badge), confetti+CustomPainter (Sparks/ring), Realtime (1 leaderboard scope), fragment shader (rare foil cosmetic) | ขับ D7/D30 ของ local/nomad (doc06 §5.C) ด้วย Sparks ล้วน + **ให้ tourist zero-state win + shareable วันแรก** — ไม่เปลือง escrow ส่วนใหญ่, ไม่แตะ legal, ไม่ต้อง 6-tab |
| **V1** (friends / co-op · social PDPA) | • Friends graph (opt-in, block/report, **QR/username/hashed-contacts เท่านั้น**)<br>• Friends leaderboard scope<br>• Activity feed (opt-in, Sparks/badge + social-cheer)<br>• Group-quest lobby (co-op) + co-op Coin reward<br>• Light AR festival selfie-frame (cosmetic)<br>• Creator-trail curated/invite-only beta (H) | social = **[PDPA LEGAL-CHECK]** · co-op Coin = **[SERVER-GATED]** · selfie = **[PURE-FLUTTER]** | Realtime presence + broadcast, AR plugin (selfie/sticker, face-blur), Flame (festival mini-game Sparks) | viral/retention หลังมีฐาน; **ต้องผ่าน PDPA review** (consent, visibility, block, data-min, hashed-contact ephemerality) ก่อนเปิด. co-op = deterministic-by-effort → ปลอด gambling; group→cluster edge wired ที่ fraud-gate |
| **V2** (contests / variable reward · หลัง legal) | • Scratch/spin surface (random)<br>• Sponsor contest / lucky-draw (real prize)<br>• Variable/surprise Coin reward (server-side RNG)<br>• Vote-decided real-value prize (เฉพาะถ้ามี neutral-judge/permit) | **[LEGAL-CHECK] + [SERVER-GATED]** ทั้งหมด | CustomPainter/Flame reveal (client = animation เท่านั้น), NestJS RNG + `chance_draws` | **ห้าม ship จนกว่า ม.8 permit + gambling/lottery sign-off ผ่าน** (§5.5). prefer deterministic ก่อนเสมอ; random = server-authoritative + odds โปร่งใส + sponsor-funded + idempotent draw token |

- **DEFERRED / BLOCKED (กัน ship ใต้ wording ที่หลวมกว่า):** **BLE / `nearby_connections` "Nearby people" friend-discovery = ตัดออกจาก MVP/V1** (real-time proximity disclosure = PDPA surface ที่ sensitive สุด). ถ้า revive ภายหลัง ต้อง **DPO sign-off + double opt-in + ephemeral coarse (neighborhood-level) + no persistence + dedicated `consent_purpose`**. คงไว้แค่ QR/username/hashed-contacts add-friend.

**Audience coverage ต่อเฟส:** MVP = **local/nomad** (streak/leaderboard/collection ทั้งปี + contribution title, ปลอด season) + **tourist** (**single-stamp share artifact + 3-stop starter trail = real win + shareable day-1** ไม่รอ set-completion). V1 = **Chinese-FIT** (AR selfie-frame + co-op = shareable ไป RED/WeChat; share-card render ใน Isolate) + social retention ของทุกกลุ่ม + creator-status moat ของ local. V2 = upside ของ sponsor-funded contest หลังมีฐานพอ.

---

### 5.5 Legal / PDPA / Cultural Gate Checklist (ฝากเข้า OPEN_DECISIONS §C — เสนอเลข C11–C15)

| รายการ | Phase | เงื่อนไขก่อน ship |
|---|---|---|
| **Friends / leaderboard / feed / profile** = personal data | V1 | opt-in consent (ปิด default) · visibility control ต่อ event-type · block + report → S1 queue · data minimization (display_name + Sparks-rank เท่านั้น) · **ไม่มี location-discovery social** · wording ตรง PDPA consent center คำต่อคำ (doc06 §1.7) · **DPO sign-off** |
| **hashed-contacts matching** (F1) | V1 | per-request **ephemeral** เท่านั้น (ไม่ persist contact-hash set) · **ไม่ correlate ข้ามผู้ใช้** (กัน reconstruct graph ของ non-user; กัน shared-salt correlation) · **ไม่สร้าง edge ไป non-user** · granular consent แยก · **DPO sign-off ครอบ hash-match design + salt handling** (ไม่ใช่แค่ "เรา hash แล้ว") — ผูก doc04 firewall "เก็บ fact ไม่เก็บ graph" |
| **Location-based social / BLE "Nearby"** = sensitivity สูงสุด | DEFERRED → V1+ ถ้า revive | **ตัดออก MVP/V1**; ถ้า revive: DPO sign-off + double opt-in + ephemeral coarse (neighborhood-level) + no persistence + dedicated `consent_purpose`; **ไม่เปิดพิกัดสด/แผนที่เพื่อน**; ผูกกฤษฎีกา geo ที่ใช้ check-in อยู่แล้ว |
| **Random reward of real value** (spin/scratch/gacha/lucky-draw + **first-N latency race** + rare-foil→Coin transitive) | V2 — **BLOCKING-GA · C11** | **ม.8 พ.ร.บ.การพนัน/แถมพก/ชิงโชค sign-off + permit จากกรมการปกครอง (จำเป็นแม้ free-entry/sponsor-funded — free entry ≠ safe harbor)** · server-authoritative RNG (client ไม่สุ่ม, รวม transitive foil) · `chance_draws` single-use token + idempotent grant · odds โปร่งใส · sponsor-funded · Coin วิ่ง grant_coins/cs_grant_goodwill + COGS cap · **prefer deterministic เสมอ** · **feature-flag default OFF + build-time enforcement: เปิดไม่ได้จนกว่ามี recorded legal-approval reference** |
| **Lottery / จับสลากผู้โชคดี / number-ticket draw** | V2 — **BLOCKING-GA · C12** | ม.8 + พ.ร.บ.สำนักงานสลากกินแบ่งฯ; lottery-law exposure เกิน ม.8; permit + counsel sign-off |
| **Vote-decided REAL-value prize** (Photo Challenge) | V1/V2 — **C13** | **neutral-judge adjudication (เกณฑ์เป็นเอกสาร) หรือ จำกัดผลโหวต = Sparks/badge เท่านั้น**; ถ้าโหวตตัดสินมูลค่าจริง = ม.8 chance-adjacent → legal sign-off + vote-integrity audit log; prize cap ด้วย sponsor escrow + COGS cap ไม่ขึ้นกับยอดโหวต + clawback; **face-blur bystander บังคับ** |
| **Co-op / contest Coin reward (รวม first-N)** | V1/V2 | deterministic-by-effort = ปลอด gambling (**first-N latency-race = ห้าม**, ใช้ "ทุกคนทำครบ X จน cap หมด" + grant-fail fallback); ทุก Coin ผ่าน money-gate + escrow `fund_quest`; **group→identity-cluster edge = BLOCKING input ที่ fraud-gate step 2** + per-merchant×cluster velocity cap + recurring cooldown + merchant-side anti-self-redeem; anti-self-redeem ที่ redeem เดิม |
| **Referral Sparks (instant both-sided)** | V1 | A.8.13 Sybil/velocity cap ต่อ inviter/day + per identity cluster; invite-Sparks ผูก **invitee genuine verified action** ไม่ใช่ signup; access ที่ Sparks ปลด ไม่ bypass mint-gate |
| **ranking discipline** | ทุกเฟส | leaderboard บน **verified-tier (T2+) Sparks/activity เท่านั้น** — **ห้าม Coin/เงินถือ** (e-money signal + toxic), ผูก doc06 §4.7/5.C4; velocity-freeze ต้องมี **transparency state + appeal** (กัน silent shadow-remove → DPO fairness review) |
| **Temple / sacred-site gamification** (Temple Pilgrim, Inthakin, geofenced check-in) | MVP+ — **C14 (cultural LEGAL-CHECK)** | **temple/Sangha consent/partnership gate** (กัน monetize sacred space โดยไม่ buy-in); check-in ปลด **etiquette guidance** (แต่งกาย, เงียบ, ไม่หันหลังให้พระประธาน); **geofence ที่ลานวัด ไม่ใช่พระอุโบสถ**; reframe Songkran รอบความหมายล้านนา (ป๋าเวณีปี๋ใหม่เมือง / รดน้ำดำหัว) ไม่ใช่ "Survivor" |
| **Withholding-tax / prize-income** | V2 | **C15 / ผูก C5/C6** — รางวัลมูลค่าจริงเกิน threshold + creator Coin payout ที่เกิดซ้ำ อาจเป็นเงินได้ที่ต้อง WHT + จำแนกผู้รับ; นอก money-gate แต่ต้องจัดที่ S4 payout |
| **Cross-border (PDPA)** | V1 | **C7** — social/location data บน Supabase SG: DPA + s.29 SCC + encryption; location-social = highest-sensitivity → พิจารณา migrate in-TH ก่อนเปิด location-social (อย่าให้ drift) |

---

### 5.6 Streak Contract + Anti-Addiction Reconciliation (เพิ่มจาก critique-major)

> doc06 §1.6 ห้าม "ฉลองก่อน server-confirm" + ห้าม mechanic ที่รางวัลการเปิดแอปทั้งวัน; แต่ streak + reminder push + social-proof = canonical addiction primitive. ต้อง **reconcile ให้ forgive ไม่ใช่ abuse** — สเปกชัด ไม่ assert:

- **โครงสร้าง = WEEKLY consistency ("5 จาก 7 วัน") ไม่ใช่ unbroken-daily** → ตัด single-miss cliff ทิ้ง (โมเดล Apple Fitness "สัปดาห์นี้"); decouple retention ระยะยาวออกจาก streak → พลาดวันเดียว **ไม่ zero progress ที่สำคัญ**.
- **freeze = auto-applied (ไม่ต้องให้ผู้ใช้กดเอง)**, อย่างน้อย 1/สัปดาห์ + **streak-repair window 48h** (กลับมาภายใน 48 ชม. = กู้ streak). ถ้าซื้อ freeze ด้วย Sparks = **fixed low cost + monthly cap** (กัน farm จน meaningless และกัน expensive จนกลับมา punish-anxiety).
- **reminder discipline:** streak-reminder push = **1 ข้อความเบา/วันเท่านั้น**, **hard quiet-hours ห้ามหลัง ~20:00**, deny location/push → ไม่มี geo-push; nudge **"พอแล้ววันนี้ 🌙"** ต้อง fire จริง (trigger = session ยาว/late-night) ตรงค่านิยม anti-addiction. ผูก S2 outbox consent-gated (doc06 §2.11 primer).

---

### 5.7 Accessibility per Engagement Surface (เพิ่มจาก critique-minor a11y)

> base design system มี a11y discipline (reduced-motion fallback, SR label 3 ภาษา, haptic-off, first-stamp provisional). surface ใหม่ของ engagement ต้องไม่หลุด:

- **Leaderboard rank-change:** ประกาศผ่าน semantics **"คุณขยับเป็นอันดับ 11"** ไม่ใช่ animate อย่างเดียว.
- **Live participation counter:** ประกาศเฉพาะ **milestone crossing** ไม่ใช่ทุก tick (SR ที่อ่าน "+37" รัว ๆ = hostile).
- **Spin/scratch reveal:** มี **"แตะเพื่อเปิดผล" เสมอ** (blind ขูดไม่ได้) + ประกาศ outcome; reduced-motion = reveal ตรง (กรอบเป็น a11y ไม่ใช่แค่ motion).
- **Collectibles locked/earned:** ใช้ **ICON/label ชัด (🔒/✓)** ไม่พึ่งสี/ความสว่างอย่างเดียว (Sparks=violet ก็ต้องมีไอคอน ✦ + คำ).
- **Gyro foil sheen:** **tap-to-shimmer fallback** สำหรับเครื่องที่เอียง/mount ไม่ได้ (ไม่ใช่แค่ reduced-motion).
- **Cognitive a11y:** ระบบ Sparks vs Coins vs cosmetics vs tiers vs leagues = ซ้อนกันหลายชั้น → ให้ **plain-language "ระบบนี้ทำงานยังไง"** + เลี่ยงบังคับผู้ใช้ track หลาย currency พร้อมกัน.

---

## ภาคผนวก: ความเสี่ยงคงเหลือ
### §1 Engagement Economy & Framework
- C11–C14 are referenced by this section but do NOT yet exist in OPEN_DECISIONS.md (current C-section ends at C10). They must be added to OPEN_DECISIONS.md for the trackers/feature-flag gates cited here to be real; until then the 'flag OFF until tracker' enforcement has no backing row.
- Several folded rules assert backend/fraud-gate wiring that is itself still open in the ledger docs: group→identity-cluster edge depends on A2.10-#8 (goodwill↔identity edge still a founder call) and the organic-path COGS accumulator (D1/A2.10-#9). The framework states the requirement, but the enforcement is only as strong as those unresolved wiring decisions — same 'visibility ≠ coverage' risk it warns about.
- Feature-level implementations (spin idempotency/draw-token in §4, leaderboard_snapshots aggregation in §2.2, merchant-side recon SQL in S4/S6, contact-hash ephemeral matching) are intentionally deferred to their owning sections; framework only sets principles. If those sections do not implement the cited rules, the constitution is unenforced.
- Cultural/sacred-site and Lanna-depth guardrails (§1.6) require external human partners (Northern Thai consultants, Sangha/temple consent, artisans) — these are organizational/legal dependencies the doc cannot itself satisfy; shipping temple loops before consent is obtained would violate the new [LEGAL-CHECK] gate.
- §1.7 ASCII diagrams and Thai inline characters may render with minor column misalignment in some markdown viewers (pre-existing risk inherited from the draft's wide bilingual tables); content is correct but visual fidelity in Figma/handoff should be spot-checked.
- The new file is 08_engagement_framework.md (next sequential after 07); if the team expected this section to live inside an existing doc or under a different number, the path/numbering should be confirmed. No existing doc was modified.
- Some critique findings were scoped to sibling sections (§2–§5) and only their framework-level principle was folded; the concrete feature reclassifications (e.g., tagging §3.4 collective drop, §4.4 voting, §4.2 lucky stamp) still need to be applied in those sections to fully close the critical findings end-to-end.

### §2 Social & Community
- New OPEN_DECISIONS C11-C14 are proposed by this section but do not yet exist in docs/OPEN_DECISIONS.md (which currently ends at C10). A doc owner must actually append them or the LEGAL-CHECK gates reference dangling trackers.
- Several fixes are mirrored from sibling economy/live-events specs not present in this repo's loaded set (§3.x live-events, §4.x spin/photo-challenge, §5.x privacy posture). The mirrored invariants (first-N drop reclassification, set-trading non-transferability, RNG transitivity, group-quest collusion) must be kept in sync with the authoritative section; if the economy doc is edited independently they can drift.
- The 'content pipeline' that feeds place-specific novelty (lore/tips/artist-collab stamp art) is asserted as required but owned by content/ops — if it is not staffed/built, the §2.3 anti-hollow-points fix is design-only and the loop reverts to a quantity treadmill.
- Streak engine details (freeze auto-apply, weekly framing, repair window) are owned by §1.4; this section only mandates the social-push discipline and weekly framing. If §1.4 keeps unbroken-daily semantics, the anti-addiction contradiction is only half-resolved.
- Temple/Sangha consent partnership (C13) is a real-world relationship dependency, not a code change; the Temple Pilgrim loop must not ship until that partnership exists, which is outside engineering control.
- Day-one tourist hook (V1b) is pulled into MVP here, but MVP scope is governed by doc 04 — pulling share-card + 3-stop starter trail forward needs doc 04 scope sign-off or it remains a recommendation, not a committed build item.
- Verified-tier-only leaderboard ranking depends on counter-scan/rotating-QR (verified_visit T2) being live at MVP; if T2 verification is not yet wired for all check-ins, ranking may have insufficient verified volume and need an interim down-weight policy rather than hard exclusion.
- Per-user salt + rotation for contact hashing (F1c) materially complicates server-side match (cannot precompute a global hash index); engineering must confirm the matching design is feasible at acceptable latency, or the privacy posture and the feature may conflict.

### §3 Co-op Quests & Seasonal Collectibles
- INV-C (group↔identity-cluster edge as a BLOCKING mint-time fraud-gate input) is NOT yet enforceable: it depends on founder-call OPEN_DECISIONS A2.10-#8 (goodwill↔identity edge pattern) and D8 wiring (transitive identity-graph -> milestone m#3). MVP only arms exact funder==redeemer + device/payment/kyc-hash (D8 m#1). Until wired, group-Coin collusion by a genuine human ring + colluding merchant is mitigated only by compensating controls (high min_trust, vesting, per-merchant x cluster velocity cap, recurring cooldown) — detection-leaning, not hard-blocking. Flagged in §3.7.
- per-merchant monthly COGS accumulator (FOR UPDATE) is still a D1/D7 wiring item; until built, cogs_budget_cap is a detect/nightly control rather than fully preventive-at-mint, so intra-month overshoot within the escrow-bounded pool is possible before nightly recon catches it. Escrow-as-risk-cap still bounds maximum loss.
- Tracker entries C11/C12/C13/C13a/C14 are NEW and do not yet exist in OPEN_DECISIONS.md (which currently ends at C10). They are referenced as proposals; the orchestrator/parent doc must actually register them (and add the ม.8 Gambling Act treatment, which is absent from all current docs) for the legal gating to be real.
- Resolving F1 'Nearby' to OFF and marking it DEFERRED/BLOCKED must also be applied in §2.1's own feature table; this section only states the resolution. If §2.1 ships under its looser wording, the contradiction re-opens — cross-section edit still required.
- The transitive-RNG invariant (INV-B) and any random-real-value mechanic require a chance_draws table + single-use server-issued draw token + idempotency_key=hash(draw_id) that are not yet specified as built artifacts here; those mechanics must remain feature-flagged OFF until both the ม.8 permit (C11) and the audit/idempotency plumbing exist.
- Line-number citations in the original DRAFT (e.g. 'SYSTEM_PLAN §5.4 line 1652') did not match this repo's current docs; I replaced them with semantic doc anchors (02 §A.7, 02b §A2.5, 06 §1.2/§1.4/§1.6). If the parent expects exact line refs against a specific doc revision, those anchors should be re-pinned at integration time.
- Several QE fixes (variable-reward content pipeline, single-stamp share artifact, 3-stop starter trail, local-tip contribution loop, creator-trail invite beta) are specified as requirements but imply MVP-scope expansion and a content/artist-collab + cultural-consultant + temple-partnership pipeline that is organizational, not just code — these are dependencies the build plan must resource, not guarantees met by this spec.
- Temple/sacred-site consent gate (C13a) is asserted as BLOCKING-GA but real-world Sangha/temple partnership sign-off is outside the system's control; Inthakin and Temple-Pilgrim collectibles cannot ship until that consent exists, which may slow the culture-set roadmap.

### §4 Variable Rewards, Contests & Legal Line
- Section §4 is finalized as standalone markdown but was NOT written into a file in docs/. The new section presumes a host engagement-layer document (it references §1.1, §2.1 F1, §2.4, §3.4, §5.2 etc. that do not yet exist in docs/). When that doc is assembled, the §-cross-references must be reconciled and section numbers may need renumbering.
- OPEN_DECISIONS.md currently ends at C10; C11-C14 are specified here but not yet appended to the tracker file. The 'build-time flag enforcement requiring a recorded permit reference' for C11/C12 is a control that must actually be implemented in the feature-flag system — currently only a written requirement.
- New schema objects (chance_draws table, content_reports.target_type += contest_entry, spark_events.reason += lucky_draw) are specified but not yet added to migration #1 (doc 04) or the canonical ledger DDL; they need DDL + RLS before build.
- The group-collusion BLOCKING edge (group-membership -> identity-cluster) depends on the identity-graph re-score hook (OPEN_DECISIONS D3) which is itself an open wiring dependency; until D3 lands, the merchant-side anti-self-redemption and per-cluster velocity cap cannot be enforced at mint, so the §4.7 control is design-only.
- All ม.8 / สลาก / PDPA / prize-income legal positions are design guidance only and remain unverified — they require a licensed Thai gaming/fintech/PDPA lawyer plus an actual กรมการปกครอง permit before any LEGAL-CHECK mechanic ships; the doc treats these as BLOCKING but the sign-offs are not obtained.
- Rejected findings (#10 referral instant Sparks, #16 streak/FOMO/culture/cohort, #17 F1 Nearby/contacts-hash PDPA, #18 cohort z-score shadow-freeze appeal) are deferred to their owning sections (§1.x/§2.x/§5.x). They are genuine critical/major issues that MUST be folded into those sections separately — this section only cross-references them and does not resolve them.

### §5 Flutter Mapping, Screens & Rollout
- chance_draws table does not yet exist in doc04 schema (only fraud_signals/fraud_cases per doc04 line 76). The spec references it as a required V2 build artifact (draw token + idempotency), consistent with how the draft gates V2 — but it must be added to the edge-fn/schema surface before any random-real-value feature ships. Not a contradiction, but a forward dependency to land in a migration.
- Full group-membership -> identity-cluster anti-collusion enforcement depends on identity_graph/account_links which doc04 §1.5 #3 defers to migration #3. Before m#3, co-op-Coin and goodwill-at-scale can only be gated at device-overlap + exact funder==redeemer; the spec gates co-op/goodwill-at-scale accordingly, but the BLOCKING fraud-gate edge for human-ring collusion is only fully enforceable at m#3 — this is an inherited e-money-boundary limitation, declared not assumed-away.
- OPEN_DECISIONS §C tracker numbers C11-C15 are PROPOSED by this section but not yet written into OPEN_DECISIONS.md (no edit made to that file per task scope = finalize the section only). A follow-up edit to OPEN_DECISIONS.md is needed to actually register C11-C15 and avoid number collision.
- spark_reason enum in doc04 (line 337) is fixed at ('checkin','review','task','referral','streak_bonus','admin_adjust'). The draft's earlier phrasing 'streak_bonus tied out of currency enum' was imprecise; finalized spec states Sparks live on spark_events outside the money-ledger (correct), but any NEW spark reasons implied by collective-bonus/social-cheer/co-op events may need enum additions in a migration — a schema dependency to confirm.
- Several new surfaces (§5.2G single-stamp share artifact, §5.2H structured tip, §5.2I photo voting) are pulled into MVP/V1 from later phases. This expands MVP build scope vs the original draft; founder/eng must confirm capacity. The reward-funded parts (3-stop trail Coin) still ride existing grant_coins/escrow so no new money-path, but the share-card render, content pipeline, and S5 tip-moderation are net-new client/ops work.
- Temple/Sangha consent-partnership gate (C14) is a cultural-legal sensitivity with no precedent in the existing docs and no defined owner; it is flagged BLOCKING for religious-site quests but the partnership process itself is undefined and could delay any temple-pilgrim loop.
- The build-time enforcement that a random-real-value feature flag 'cannot be enabled without a recorded legal-approval reference' is specified as a requirement but the enforcement mechanism (CI check / config schema) is not designed here — it is asserted, and must be implemented to be real rather than policy-on-paper.
