# UX/UI Design Blueprint (MVP — Nimman Cafe-Hop)

> **เวอร์ชัน:** v1 (ผ่าน UX heuristic + flow-completeness review) · **วันที่:** 2026-06-14
> blueprint สำหรับ build/ลง Figma: design system + IA + ASCII wireframes + hero flows. โฟกัส MVP loop. working app name = **Soi Hop** (ปรับได้)
> สอดคล้องกับ feature scope ใน doc 04, money model doc 02/02b, stack doc 05

**สารบัญ:** Design System & Brand · Consumer App (IA+Wireframes) · Merchant Web + Counter PWA · Field Agent Mode · Hero Flow Storyboards

---

## 1. Design System & Brand Foundation

> **เวอร์ชัน:** v2 (UX/UI blueprint — finalized) · **วันที่:** 2026-06-14
> ขอบเขต: brand direction + color + typography (TH/EN/ZH) + component library + iconography + motion + accessibility + trilingual switching
> หลักการกำกับ: *Lanna-modern* — อบอุ่น/ท้องถิ่นแต่สะอาด, อ่านง่ายทันที 3 ภาษา, แยก **Sparks** (ฟรี/XP) กับ **Coins** (หนุนด้วยบาท/แลกได้/หมดอายุ) ให้ **ชัดเด็ดขาด ห้ามสื่อว่าถอนเป็นเงินสดได้ และห้ามแสดง Coins คู่กับมูลค่าบาทบนฝั่งผู้ใช้**
> Platform split: **mobile = Flutter** (consumer + role-gated agent) ใช้ token ชุดเดียวกับ Material 3 / Cupertino-friendly · **web = Next.js+Refine** (merchant/admin/moderator) + **Counter PWA** ใช้ web pattern + token ชุดเดียวกันผ่าน CSS variables
>
> **Changelog v1→v2 (จาก critique, designsystem-scope):** (1) Coin gold แยกออกจาก brand amber เป็น *metallic gold* คนละ hue-family + ย้าย freshness-aging/warning ออกจาก amber → แก้ semantic overload; (2) ลบมูลค่าบาทออกจากทุก Coin surface ฝั่งผู้ใช้ (reward = เชิงคุณภาพ); (3) typography: headline/CTA แสดง **active-locale เดียว** — stack 3 ภาษาเฉพาะการ์ดเลือกภาษา + bundle ZH สำหรับ glyph ที่ stack; (4) freshness แยก **null/never-verified** ออกจาก **stale**; (5) NAV canonical = Home·Discover·Passport·Wallet·Profile (sync กับ §2.x); (6) Counter scanner ได้ component-states ครบ (warming/denied/LINE-blocked/hold); (7) ตัวเลขเงินใช้ ink ไม่ใช่ gold (contrast). รายการ reject + เหตุผล ดู §1.10.

---

### 1.1 Brand Direction — "Lanna-modern"

**ชื่อแอปที่เลือก (working name, ADJUSTABLE):** **`Soi Hop`** — สะกด/แสดงผลเป็น **ซอยฮ็อป / Soi Hop / 巷跳 (xiàng tiào)**

**เหตุผลที่เลือก `Soi Hop` เหนือผู้เข้าชิงอื่น:**

| ผู้เข้าชิง | ข้อดี | ทำไมไม่เลือก (MVP) |
|---|---|---|
| **Soi Hop** ✅ | "ซอย" = ถนนเล็กในเมืองที่ฝรั่ง/nomad รู้จักแล้ว (Soi 1–17 ของนิมมานคือสนามจริง §1.4); "Hop" สื่อ cafe-hop / cross-merchant loop ตรงตัว north-star = Nimman Cafe-Hop; สั้น 2 พยางค์ ออกเสียงได้ทั้ง 3 ภาษา; เป็นกริยาได้ ("ไป hop กัน") | — (เลือกอันนี้) |
| Lanna Loop | บอกพื้นที่ + loyalty loop ชัด, alliteration ดี | ผูกกับ "Lanna/เชียงใหม่" แน่นไป — ขัดวิสัยทัศน์ multi-city; rename ตอนขยายเมือง |
| Roam CNX | ดูสากล, "CNX" = รหัสสนามบินที่ทัวริสต์รู้จัก | "Roam" generic + ชน roaming/SIM; CNX ผูกเชียงใหม่อีก |
| Passport CM | สื่อ metaphor passport/stamp ตรง | "CM" ผูกเมือง; "Passport" ทำให้สับสนกับเอกสารเดินทางจริง (เสี่ยงตอน onboarding ทัวริสต์) |
| Wandr | เท่, สั้น | generic เกินไป, ไม่สื่อ loyalty/loop, ชนแอปท่องเที่ยวจำนวนมาก |

> **หมายเหตุ:** `Soi Hop` = working name; brand metaphor (passport/stamp) เป็นแกนภาพไม่ขึ้นกับชื่อ → เปลี่ยนชื่อภายหลังไม่กระทบ design system. คำว่า **"Passport"** = *ชื่อฟีเจอร์* (สมุดสะสมแสตมป์ quest) ไม่ใช่ชื่อแอป — แยกบทบาทชัด.

**Tagline 3 ภาษา:**
- 🇹🇭 **"เดินซอย เก็บแสตมป์ แลกของจริง"** (เดินซอย = สำรวจ, เก็บแสตมป์ = quest progress, แลกของจริง = Coins redeem ของจริง ไม่ใช่เงิน)
- 🇬🇧 **"Hop the soi. Collect stamps. Earn real treats."** (เลี่ยงคำ cash/money/withdraw โดยเจตนา — ใช้ "treats")
- 🇨🇳 **"逛巷子 · 集印章 · 换好礼"** (guàng xiàngzi · jí yìnzhāng · huàn hǎo lǐ — ใช้ "好礼=ของขวัญ" ไม่ใช่ "现金=เงินสด")

**บุคลิกแบรนด์:** อบอุ่น · เป็นมิตรกับคนท้องถิ่น · เชื่อถือได้ (ข้อมูลสด verified) · เล่นสนุกแบบสะสม (collectible) · **ไม่ใช่** fintech แข็งกระด้าง และ **ไม่ใช่** เกมพนัน. โทนภาพ = กระดาษสาล้านนา + แดดบ่ายเชียงใหม่ + ลายปูนปั้น/ฉลุไม้ลดทอนเป็น geometric สะอาด.

**Brand keywords → design translation:**
- *อบอุ่น/แดดบ่าย* → primary warm amber (ดอกทองกวาว/ขมิ้น) + พื้นหลังกระดาษสาออฟไวต์
- *ล้านนา* → accent jade/teal (ใบไม้/เซรามิกเซลาดอน) + ลายฉลุเป็น border ของ stamp
- *collectible/สนุก* → passport stamp metaphor, ink-stamp texture, ring-progress
- *เชื่อถือได้* → freshness badge ระบบสี + เส้น/มุมโค้งคงที่ ไม่รก

---

### 1.2 Color System

> **กฎเหล็กของสี (locked):**
> 1. **Sparks ≠ Coins ≠ Brand ≠ Freshness — สี่ความหมายนี้ต้องแยก hue ออกจากกัน.** Coins ต้อง **ไม่** ใช้ green-money/dollar semantics.
> 2. **amber (brand) สงวนไว้สำหรับ brand/CTA/active-nav เท่านั้น** — ห้ามให้ amber พ่วงความหมาย "ของรางวัล" หรือ "ข้อมูลเก่า" หรือ "เตือน" อีกต่อไป (แก้ semantic overload v1).
> 3. **Coins = metallic gold คนละ family กับ brand amber**; Sparks = violet.
> 4. **Freshness-aging + --warning ย้ายออกจาก amber** ไปเป็น *bronze/ochre* (aging) และ *amber-danger-adjacent* ที่ไม่ชนทั้ง brand และ gold (warning) — รายละเอียดด้านล่าง.

**Brand core (light):**

| Token | Hex | ใช้ที่ |
|---|---|---|
| `--brand-primary` (Tamarind Amber) | `#E8852C` | ปุ่มหลัก, active nav, แบรนด์ **(เท่านั้น — ไม่ใช้สื่อ Coins/aging/warning)** |
| `--brand-primary-pressed` | `#C46A1A` | pressed/hover |
| `--brand-secondary` (Lanna Jade) | `#1E8E7E` | accent, link, secondary CTA, stamp ring, check-in context |
| `--brand-tertiary` (Teak Brown) | `#5A4632` | stamp ink, passport เส้นขอบ, heading บนกระดาษ |
| `--surface-paper` (Saa Off-white) | `#FBF6EE` | พื้นหลังหลัก (กระดาษสา) |
| `--surface-card` | `#FFFFFF` | card |
| `--surface-sunk` | `#F2EADD` | input/well |
| `--ink-900` (text primary) | `#221B12` | ข้อความหลัก |
| `--ink-600` (text secondary) | `#5C5346` | ข้อความรอง |
| `--ink-400` (text muted/hint) | `#8A8170` | placeholder, meta |
| `--hairline` | `#E6DDCE` | เส้นแบ่ง |

**Dark mode:**

| Token | Hex | หมายเหตุ |
|---|---|---|
| `--surface-paper` | `#15110C` | น้ำตาลเข้มอุ่น (คงอารมณ์กระดาษ) |
| `--surface-card` | `#1F1A13` | |
| `--surface-sunk` | `#2A2317` | |
| `--brand-primary` | `#F59E42` | amber สว่างขึ้นเพื่อ contrast ≥4.5 |
| `--brand-secondary` | `#3FB9A6` | jade สว่างขึ้น |
| `--ink-900` | `#F4ECDD` | |
| `--ink-600` | `#C2B7A4` | |
| `--ink-400` | `#8E836F` | |
| `--hairline` | `#3A3225` | |

**Currency color coding (CRITICAL — Sparks vs Coins, แก้ semantic overload):**

| | Sparks (ฟรี XP) | Coins (หนุนบาท, แลกได้, หมดอายุ) |
|---|---|---|
| สีหลัก light | **Spark Violet `#7C5CFF`** | **Coin Metallic Gold `#C9962A`** (deep metallic, แยก hue/lightness จาก brand-amber `#E8852C` ชัด — ดู note ด้านล่าง) |
| accent/foil | violet sheen | gold-foil hi-light `#E3B koš台`→ใช้ `#E6C158` เป็น highlight บนเหรียญ (ไม่ใช่บนตัวเลข) |
| สีหลัก dark | `#9B82FF` | `#E0B452` |
| ไอคอน | ✦ ประกายไฟ (spark/four-point star) | ◉ เหรียญ (coin disc, ขอบหยัก) |
| pill bg / text | violet-50 `#EEEAFF` / violet-700 `#5B3FD9` | gold-50 `#FBF1D8` / **ตัวเลข = `--ink-900` `#221B12`** (ดู §1.7 — ตัวเลขเงินใช้ ink เสมอ, gold สงวนไว้ที่ ◉ icon/ขอบเท่านั้น) |
| ห้ามใช้ | สีเขียว, สัญลักษณ์ $/฿ เดี่ยว ๆ ที่สื่อเงินสด | สีเขียว, $/wallet-cash, คำว่า "ถอน/withdraw/cash out", **และห้ามแสดงมูลค่าบาท (~฿xx) คู่กับ Coin บนฝั่งผู้ใช้** |
| คำกำกับบังคับ (ผู้ใช้) | "สะสมเลื่อนระดับ · แลกของไม่ได้" | "แลกของจริงที่ร้าน · หมดอายุ DD/MM · ถอนเป็นเงินสดไม่ได้" |

> **เหตุผลที่ Coins = metallic gold คนละ hue จาก brand amber (แก้ critique-critical):** v1 ให้ Coin gold "อิง brand-primary family" ทำให้ amber เดียวแบก 4 ความหมาย (brand / CTA / Coins / aging+warning) — สับสนสายตาตรงจุดที่ load-bearing ที่สุดของทั้งผลิตภัณฑ์. v2 ดึง Coin ไปเป็น **deep metallic gold `#C9962A`** (เข้ม/เมทัลลิกกว่า, อิงเหรียญทองจริง) + ใช้ **foil highlight เฉพาะบนรูปเหรียญ** ไม่ใช่บนพื้น/ตัวเลข → mental model = arcade-token/loyalty-point ที่ใช้ในร้านได้ ไม่ใช่ wallet เงิน. ป้องกัน BoT/e-money perception ที่ระดับภาพ.

> **กฎมูลค่าบาท (locked — แก้ critique-critical "baht face value"):** **ห้ามแสดงเลขบาท (~฿70 / value) คู่กับยอด Coin ในทุก surface ฝั่งผู้ใช้** (wallet, quest reward preview, passport reward seal, coin-mint). Coin สื่อด้วย **ของรางวัลที่ปลดล็อก** เท่านั้น (เช่น "☕ กาแฟฟรี 1 แก้ว", "ขนมอบ 1 ชิ้น") ห้ามเป็น "= ฿70" หรือ "60 Coins = ฿70". เลขบาทอยู่ได้เฉพาะ **merchant/admin screens** (COGS/escrow/payout — single-currency-per-field อยู่แล้ว) และ **ห้าม mirror กลับมาฝั่งผู้ใช้.** เหตุผล: การวางเหรียญคู่บาทตายตัวสอน mental model แปลง Coin→บาท = cash-out exactly ที่เราต้องเลี่ยง.

**Freshness badge — 4 สถานะ (แยก never-verified ออกจาก stale; ตรง enum `freshness_label`):**

| สถานะ | ความหมาย | สี light (bg) | สี dark (bg) | ไอคอน | ข้อความ TH / EN / ZH |
|---|---|---|---|---|---|
| **fresh** | verified ≤ 7 วัน | Fresh Green `#2BA84A` (`#E5F6E9`) | `#46C766` (`#16321E`) | ● | "ตรวจสด X วัน" / "Verified Xd ago" / "X天前实地核实" |
| **aging** | 8–21 วัน | **Bronze/Ochre `#B06A12`** (`#F4E6CE`) — *ไม่ใช่ brand-amber* | `#D2933C` (`#33260F`) | ◐ | "ตรวจเมื่อ X วัน" / "Verified Xd ago" / "X天前核实" |
| **stale** | 22+ วัน (เคยตรวจ แต่เก่า) | Slate `#7A8290` (`#ECEEF1`) | `#9AA3B0` (`#23262B`) | ○ | "ข้อมูลอาจไม่อัปเดต" / "May be outdated" / "信息可能已过时" |
| **never-verified** (null) | ยังไม่เคยมี agent ตรวจ | Neutral Slate-outline `#9AA3B0` + เส้น dashed (`#F4F5F6`) | `#6E7682` dashed (`#1C1F23`) | ◌ (dashed ring) | "ยังไม่เคยตรวจสอบ" / "Not yet verified by an agent" / "尚未实地核实" |

> **หมายเหตุ (แก้ critique-major "stale=null collapse"):** v1 รวม "null" เข้ากับ "stale" → ที่ที่ไม่เคยมีคนตรวจถูกแสดงว่า "อาจไม่อัปเดต" เหมือนที่ที่เคยตรวจเมื่อ 22 วันก่อน — overclaim trust ตรงจุดที่เป็น moat ของผลิตภัณฑ์. v2 แยก **never-verified (◌ dashed)** ออกชัด = "unknown/unverified" ไม่ใช่ "decaying". แนะนำ down-rank/suppress never-verified ใน AHA feed (อยู่ที่ §2 IA) เพื่อ first-impression = "verified by people here" จริง.
> **green = ใช้ที่ freshness:fresh เท่านั้น** (semantic "ผ่าน/สด" ปลอดภัย ไม่ปนเงิน). Coins ไม่แตะเขียวเด็ดขาด.

**Semantic (state) colors — light / dark (ย้าย warning ออกจาก brand-amber):**

| Token | Light | Dark | ใช้ |
|---|---|---|---|
| `--success` | `#2BA84A` | `#46C766` | สำเร็จ, check-in ผ่าน, redeem สำเร็จ |
| `--warning` | **`#C77A0F`** (ochre-deep, แยกจาก brand `#E8852C` และ gold `#C9962A`) | `#E59A3A` | escrow paused, Coin ใกล้หมดอายุ *ระดับ caution* (สถานะ "ใกล้หมด") |
| `--danger` | `#D64545` | `#F26A6A` | error, redeem fail, geofence fail, **Coin near-expiry บนการ์ด gold (ใช้ ⚠ + danger ไม่ใช่ amber-on-gold)** |
| `--info` | `#1E8E7E` | `#3FB9A6` | hint, freshness aging note |
| `--focus-ring` | `#1E8E7E` | `#3FB9A6` | keyboard focus (≥3:1 กับพื้น) |
| `--hold` (Counter manual-review) | **`#7A8290` slate-neutral** | `#9AA3B0` | Counter ผลที่สาม "ต้องตรวจสอบเพิ่มเติม" — *ไม่ใช่ green, ไม่ใช่ red* (ดู §1.4 Counter states) |

> **กฎ near-expiry บนการ์ด Coin (แก้ critique-critical overload):** เมื่อ Coin lot ใกล้หมดอายุ **ห้ามวาง element สี amber ทับบนการ์ด gold** (จะกลืน). ใช้ **danger treatment + ไอคอน ⚠ + ข้อความเต็ม** แทน (text มีอยู่แล้ว) เพื่อให้ "ของรางวัล (gold)" กับ "เตือนหมดอายุ (danger ⚠)" แยกชัดทั้งรูปทรงและสี.

---

### 1.3 Typography — Trilingual (TH / Latin / Simplified-Chinese)

**Font pairing (พิจารณา x-height, รูปวรรณยุกต์ไทย, สระบน/ล่าง, Hanzi stroke weight):**

| สคริปต์ | Font | Weights | เหตุผล |
|---|---|---|---|
| **Latin (EN)** | **Inter** | 400/500/600/700 | x-height สูง อ่านชัดบนจอเล็ก, ตัวเลข tabular (Coin/Sparks/ราคา), จับคู่ Noto Sans Thai สนิท |
| **Thai (TH)** | **Noto Sans Thai** (loopless) หรือ **IBM Plex Sans Thai** | 400/500/600/700 | metric match กับ Inter, weight ครบ, รองรับสระซ้อน/วรรณยุกต์ครบ; loopless = "modern" |
| **Simplified-Chinese (ZH)** | **Noto Sans SC** | 400/500/700 | คู่ official ของ Noto family, stroke match, ครอบคลุม GB2312+ |
| **ตัวเลข/เงิน (ทุกภาษา)** | **Inter Tabular Nums** | 600 | บังคับ tabular สำหรับ Coin/Sparks/baht — เลขไม่ขยับเวลานับ animation |
| **Brand display / stamp** | **Inter Display 700** + custom wordmark | 700/800 | heading ใหญ่, ชื่อ quest บน passport |

> **กฎ headline ภาษาเดียว (locked — แก้ critique-major "stacked 3-line headline"):** headline / CTA / body แสดง **เฉพาะ active-locale เดียว** ตาม locale ปัจจุบัน. **ห้าม stack TH+EN+ZH 3 บรรทัดในหัวเรื่อง/ปุ่ม** (v1 first-run S1/S2 ทำแบบนี้ → overflow ที่ dynamic-type 200% + lh ไทยสูง, รบกวน AHA scan, และ render ZH ด้วย fallback font บนเครื่อง non-ZH เพราะ SC lazy-load). **trilingual stacking อนุญาตเฉพาะการ์ดเลือกภาษา** (ที่ซึ่ง endonym 3 ภาษา = *เนื้อหา* ของการ์ดเอง) — ดู §1.8.

> **กลยุทธ์ font loading (แก้ critique "ZH fallback font mismatch"):**
> - bundle **Inter + Noto Sans Thai** ใน app (TH/EN = default audience นิมมาน).
> - **bundle subset ของ Noto Sans SC** สำหรับ glyph ที่ปรากฏใน *การ์ดเลือกภาษา + app-name wordmark + endonym* (เช่น 简体中文 / 巷跳) เพื่อให้ตรงนั้น render ตรง typographic ทุกเครื่อง **โดยไม่รอ lazy-load**; ส่วน ZH UGC/UI ที่เหลือ **lazy-load Noto Sans SC เต็ม** เมื่อ locale=zh.
> - เนื่องจาก headline เป็น active-locale เดียว → จะไม่มี ZH glyph ใน headline บนเครื่อง TH/EN อีก → ปัญหา fallback-font บน stacked-ZH หายไปโดยปริยาย.
> - fallback chain: `Inter → Noto Sans Thai → Noto Sans SC → system`.

**Type scale (mobile base 16px / 1rem · token ร่วม Flutter+web):**

| Token | Size | LH (Latin) | **LH (Thai)** | Weight | ใช้ |
|---|---|---|---|---|---|
| `display` | 30 | 1.20 (36) | **1.45 (44)** | 700 | ชื่อ quest/passport hero |
| `h1` | 24 | 1.25 (30) | **1.50 (36)** | 700 | screen title |
| `h2` | 20 | 1.30 (26) | **1.50 (30)** | 600 | section/card title |
| `h3` | 17 | 1.35 (23) | **1.55 (26)** | 600 | place name |
| `body` | 15 | 1.45 (22) | **1.65 (25)** | 400 | เนื้อหา |
| `body-sm` | 13 | 1.45 (19) | **1.65 (22)** | 400 | meta/secondary |
| `caption` | 11 | 1.40 (15) | **1.60 (18)** | 500 | badge/chip/timestamp |
| `num-lg` | 28 | 1.10 | 1.10 | 700 tab | Coin/Sparks ยอดใหญ่ **(สี = ink-900, ไม่ใช่ gold — §1.7)** |
| `num-pill` | 13 | 1.0 | 1.0 | 600 tab | ใน pill **(สี = ink-900)** |

> **กฎ line-height ไทย (locked):** ไทยต้องการ lh สูงกว่า Latin ~12–18% เพราะสระบน (◌ิ ◌ี ◌ึ ◌ื) + วรรณยุกต์ (◌่ ◌้ ◌๊ ◌๋) ซ้อน 2 ชั้น และสระล่าง (◌ุ ◌ู). lh แน่นเท่า Latin → วรรณยุกต์ชนบรรทัดบน. **Flutter:** `TextStyle.height` แยก locale ผ่าน theme extension `ThaiTextHeights`. **Web:** `:lang(th){ line-height: var(--lh-th) }`. ZH ใช้ lh กลาง (1.5).

> **กฎ mixed-script (locked):** หนึ่งบรรทัดอาจมี TH+EN+ZH ปนได้ในระดับ *เนื้อหา* (เช่นชื่อร้าน "ร้าน Graph Café 咖啡") — **ต่างจากกฎ headline ภาษาเดียวข้างต้น** (ซึ่งคุม UI string). บังคับ vertical-align baseline ร่วม + lh ตาม "สคริปต์ที่สูงสุดในบรรทัด" (ไทย/จีน). ห้าม clip ascender/descender. ชื่อร้านคงต้นฉบับเสมอ.

---

### 1.4 Core Component Library

> ทุก component ใช้ design token เดียว, radius scale = `r-sm 8 / r-md 12 / r-lg 16 / r-xl 24 / r-pill 999`, spacing 4-pt grid, elevation อ่อน (warm shadow `rgba(90,70,50,.12)`).

**Buttons:**

| ชนิด | สเปก | ใช้ |
|---|---|---|
| Primary | bg amber, **ink-on-amber `#221B12`**, h=48, r-md, weight 600 | CTA หลัก ("เริ่ม Quest", "เช็คอิน") |
| Secondary | outline jade 1.5px, text jade, h=48 | รอง |
| Ghost/Text | text jade, no bg | tertiary |
| Destructive | text danger | ยกเลิก/ลบ |
| FAB (map) | amber circle 56, ไอคอน scan/locate | "สแกน QR" บนแผนที่ |
| Counter-PWA action | h≥56 (lunch-rush, นิ้วใหญ่), text ใหญ่ 20 | merchant redeem / OTP keypad |

ปุ่มทุกตัว: tap target ≥48×48 (เกิน 44 min), disabled = 38% opacity + คงข้อความ, loading = spinner คงขนาด (ไม่ยุบ).

**Cards:**

- **Place Card** — รูป 16:9 บน, freshness badge มุมขวาบนของรูป (4 สถานะ §1.2), ชื่อ (h3) + หมวด chip + price band (฿฿) + ระยะทาง + promo pill (ถ้ามี). variant `compact` (list) และ `map-peek` (bottom sheet ครึ่งใบ).
- **Quest Card** — สไตล์ "ตั๋ว/ticket" ขอบหยัก (perforation), แถบ progress ring (เก็บ X/N stamp), **reward pill = ของรางวัลเชิงคุณภาพ ("ฟรีกาแฟ ☕") — ไม่มีเลขบาท** (§1.2), escrow state ("พร้อมแลก" / "พักชั่วคราว" ถ้า `paused_zero_balance`). featured quest มี ribbon "แนะนำ/Featured/精选".
- **Seasonal/Collectible Quest Card (variant)** — reward = Sparks + badge (ไม่มี Coin/escrow card), มี FOMO countdown + ribbon "limited". *(เป็น documented variant ของ Quest Card; ไม่มี escrow treatment — รองรับ §2.6/§5.C seasonal.)*
- **Stamp / Passport collectible** — ดู §1.5.

**Chips / Filters:**
- หมวด: `กิน EAT 吃` `เที่ยว SEE 看` `ทำ DO 玩` (ไอคอน + label), selected = bg jade-tint + เส้น jade.
- filter pills: `เปิดตอนนี้ Open now` `ราคา ฿–฿฿฿฿` `ใกล้ฉัน` `รับ PromptPay/Alipay` `มี Quest`.
- chip h=32, r-pill, tap target ขยาย touch ≥44 ผ่าน padding hit-area.

**Freshness Badge** (pill เล็ก, 4 สถานะ §1.2):

```
┌─────────────────────────┐
│ ● ตรวจสด 3 วัน          │  fresh   = green
├─────────────────────────┤
│ ◐ ตรวจ 12 วัน           │  aging   = bronze/ochre (ไม่ใช่ brand-amber)
├─────────────────────────┤
│ ○ อาจไม่อัปเดต          │  stale   = slate (เคยตรวจ แต่เก่า >21วัน)
├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤
┊ ◌ ยังไม่เคยตรวจสอบ      ┊  never   = slate-outline + dashed (null/unknown)
└╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘
```
แตะ → tooltip: "ตรวจในสถานที่จริงโดย Field Agent เมื่อ {date} · {method}" / "Verified in person by a local agent". never-verified tooltip: "ยังไม่มี Field Agent ไปตรวจที่นี่ / No agent has verified this place yet".

**Coin / Sparks pills (ตัวเลข = ink, gold เฉพาะ ◉ icon):**

```
┌────────────┐   ┌─────────────┐
│ ◉ 120 Coins│   │ ✦ 340 Sparks │
└────────────┘   └─────────────┘
  ◉=gold disc       ✦=violet
  เลข=ink-900        เลข=ink-900
"แลกของจริง"      "เลื่อนระดับ"
```
- Coin pill: **◉ = metallic gold (icon only)**, ตัวเลข = ink-900 tabular, แตะ → wallet (เห็น expiry timeline). **ห้ามไอคอน $/฿/wallet-cash; ห้ามแสดงมูลค่าบาท.**
- Sparks pill: ✦ violet (icon), ตัวเลข = ink-900 tabular, แตะ → progress/tier. มีคำ "แลกของไม่ได้" บน wallet เสมอ.

**Bottom Nav (consumer, Flutter — 5 ช่อง · canonical):**

```
┌────────────────────────────────────────────────┐
│  🏠        🗺️         📖         🎟️       👤   │
│ Home    Discover  Passport   Wallet   Profile  │
│ หน้าหลัก  ค้นพบ    พาสปอร์ต   กระเป๋า  โปรไฟล์  │
└────────────────────────────────────────────────┘
```
- **5 แท็บ canonical = Home · Discover · Passport · Wallet · Profile** (sync กับ §2.x IA + SYSTEM_PLAN §8.2; แก้ critique-minor ที่ v1 เคยเขียน "Discover/Search/.../Me" — เลิกใช้ชุดนั้น). i18n key = `nav.home / nav.discover / nav.passport / nav.wallet / nav.profile`.
- active = amber ไอคอน + label, inactive = ink-400.
- **Agent mode**: ไม่เพิ่มแท็บที่ 6 — สลับผ่าน "โหมด" ใน Profile (role-gated) → nav กลายเป็น `แผนที่งาน / งานของฉัน / กล้องส่ง / สถานะ / โปรไฟล์`. token เดียวกัน, สีหัวเปลี่ยนเป็น **jade** เพื่อบอก context "กำลังทำงาน Agent".
- **Counter PWA / Merchant web**: ไม่ใช้ bottom nav — web pattern (sidebar/top-bar). Counter = single-screen scanner.

**Map Markers (Mapbox):**

```
   ┌───┐         ┌───┐         ┌───┐         ┌╌╌╌┐
   │🍜 │ fresh   │🛕 │aging    │🎨 │stale    ┊🍜 ┊ never
   └─▼─┘ ●green  └─▼─┘ ◐bronze └─▼─┘ ○slate  └╌▼╌┘ ◌dashed
  EAT(amber)   SEE(jade)     DO(teak)      (down-ranked)
```
- teardrop pin, สีพื้นตามหมวด (eat=amber, see=jade, do=teak), **halo วงนอก = freshness** (green / bronze / slate / dashed-slate) → "freshness halo".
- มี quest มี ⭐ corner. cluster = ตัวเลขในวงกลม amber. selected = ขยาย + bounce.
- promo สด = 💥 จุดเล็ก. user location = jade dot + accuracy ring.
- never-verified pin = ขอบ dashed + down-rank (ไม่เด่นใน AHA feed).

**QR Scan Sheet (consumer check-in):**

```
┌────────────────────────────────┐
│  ✕                             │
│        สแกนเพื่อเช็คอิน         │   ← headline: active-locale เดียว
│  ┌──────────────────────────┐  │
│  │   [ camera viewfinder ]  │  │
│  │      ┌──────────┐        │  │
│  │      │  ▢ ▢ ▢   │ frame  │  │
│  │      └──────────┘        │  │
│  └──────────────────────────┘  │
│  ● อยู่ในรัศมีร้าน (geofence ok) │   jade chip
│  ─────────── หรือ ───────────  │
│  [ ใส่รหัส 6 หลักจากร้าน  ]    │   OTP fallback (เด่นเสมอ)
└────────────────────────────────┘
```
- bottom sheet เต็ม, r-xl, geofence status chip (jade=อยู่ในรัศมี / bronze=ขยับเข้าใกล้).
- **2 บริบทแยกด้วยสี:** check-in (earn, **jade** accent) vs redeem (gold accent + merchant-shown rotating code). ลูกค้า **สแกน** เพื่อ earn; **merchant** โชว์ rotating code ตอน redeem (no static customer QR).
- error states: ไม่อยู่ในรัศมี → "เข้าใกล้ร้านอีกหน่อย" + ระยะ; กล้องถูกปฏิเสธ → ปุ่มไป settings + OTP fallback เด่น; รหัสหมดเวลา → "รหัสหมดอายุ ขอใหม่".

**Counter PWA scanner — component states (merchant; แก้ critique-major camera + critique-major hold-state):**

> Counter เป็น component ที่ design-system ต้องนิยาม *ทุก state ของกล้อง + ผลลัพธ์* เพราะ user = เจ้าของร้านอายุ ~55 กลาง lunch-rush; black box = dead-end.

```
[A] CAMERA-WARMING            [B] CAMERA-DENIED → OTP-PRIMARY
┌──────────────────────┐     ┌──────────────────────┐
│ ░░ กำลังเปิดกล้อง… ░░ │     │ กล้องเปิดไม่ได้       │
│ ░░  (skeleton)   ░░  │     │ ใส่รหัส 6 หลักแทน:    │
│                      │     │ ┌──┬──┬──┬──┬──┬──┐   │  ← OTP keypad
│ [ หรือใส่รหัสมือ ]   │     │ │  │  │  │  │  │  │   │     = PRIMARY
└──────────────────────┘     │ └──┴──┴──┴──┴──┴──┘   │     (ไม่ใช่ link เล็ก)
                             │ [ ลองเปิดกล้องอีกครั้ง ]│  ← 1-tap re-grant
                             └──────────────────────┘

[C] LINE in-app browser blocked   [D] VALIDATING (money-action loading)
┌──────────────────────┐         ┌──────────────────────┐
│ เปิดใน Chrome/Safari  │         │   ⟳ กำลังตรวจสอบ…    │  neutral
│ เพื่อใช้กล้อง          │         │   (server burn ค้างอยู่)│
│ [ เปิดเบราว์เซอร์ → ]  │         │   อย่าปิดหน้าจอ        │
│ หรือใช้รหัส 6 หลัก →  │         └──────────────────────┘
└──────────────────────┘

[E] APPROVED            [F] REJECTED           [G] HOLD / manual-review
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│ ✅  ส่งของได้  │       │ ❌  ใช้ไม่ได้  │       │ ⏸  ต้องตรวจสอบ │  --hold
│   (green เต็ม)│       │  (red เต็ม)  │       │   เพิ่มเติม    │  slate-neutral
│  +sound+haptic│       │ +เหตุผล plain │       │ แจ้งทีมงาน —   │  (ไม่ใช่ green
└──────────────┘       │ +ทางออก      │       │ ไม่ใช่การปฏิเสธ │   ไม่ใช่ red)
                       └──────────────┘       │ (ไม่มี try-again)│
                                              └──────────────┘
```
- **[A] warming** skeleton + "กำลังเปิดกล้อง…" + ลิงก์ลง OTP. **pre-warm `getUserMedia` ตอน PWA launch.**
- **[B] denied** → OTP keypad เป็น **surface หลัก** ทันที (ไม่ใช่ลิงก์เล็ก) + ปุ่ม re-grant 1 แตะ. **OTP path ต้องพิสูจน์ได้ว่า <5s ด้วยตัวเอง** (guaranteed fallback).
- **[C] LINE in-app webview** → ตรวจ UA; ถ้ากล้องถูกบล็อก → "เปิดใน Chrome/Safari" หรือ default ไป OTP.
- **[D] VALIDATING** = money-action loading ระหว่าง decode → ผล (rotating code ยัง valid). คู่กับฝั่งลูกค้า "กำลังตรวจสอบที่เคาน์เตอร์…".
- **[E]/[F]/[G]** = ผล 3 ทาง. **[G] HOLD ใช้ `--hold` slate-neutral** สำหรับ self-redeem-flagged (A.8.12) + velocity soft-freeze — แยกชัดจาก green-approve และ red-reject, ไม่มี try-again loop, ไม่ revealquest internals. **REJECTED (insufficient/ยังไม่ครบ) แสดงเป็นกลาง** "รหัสนี้ยังใช้ไม่ได้ — ให้ลูกค้าตรวจในแอป" ไม่เปิดเผย progress ลูกค้า (แก้ critique-major leak — design-system คุมว่า reject copy = neutral, ไม่ teach-the-game).

**Money-action loading states (consumer side, design-system tokens):**
- **redeem "กำลังตรวจสอบที่เคาน์เตอร์…"** (rotating code ยัง valid) — neutral spinner, ปุ่ม lock.
- **coin-mint "กำลังมอบรางวัล…"** — ก่อน grant สำเร็จ; ถ้า grant fail (escrow drained ระหว่าง check-in สุดท้าย→mint) → fallback state แยกจาก escrow-paused pre-block.
- **first-stamp provisional "กำลังบันทึกแสตมป์…"** — state ชั่วคราวก่อน server-confirm (ดู §1.6 — ห้ามเล่น celebration เต็มก่อนยืนยัน stamp แรก).

**Stamp / Passport collectible:** ดู §1.5.

---

### 1.5 Iconography + Passport / Stamp Metaphor

**ระบบไอคอน:** เส้น 1.75px (outline) + filled variant สำหรับ active. มุมโค้ง 2px. ชุดเดียว (Phosphor/Lucide-style) ปรับ corner ให้อุ่น. หมวดหลัก custom: 🍜 (eat/khao-soi bowl), 🛕 (see/temple chedi), 🎨 (do/activity). **ห้าม**ไอคอน $ / 💵 / 🏦 ที่ไหนกับ Coins.

**Passport / Stamp metaphor (แกนกลาง collectible):**
- **Passport** = สมุดสะสม (เป็น *view* เหนือ `quest_progress`, ไม่ใช่ตารางใหม่). หน้าตา = สมุดเดินทางกระดาษสา, แต่ละหน้า = 1 quest, ช่องว่าง = stamp ที่ยังไม่เก็บ.
- **Stamp** = ตราหมึกล้านนา (วงกลม/แปดเหลี่ยม, ลายฉลุไม้/ปูนปั้นลดทอน, สี teak ink บนกระดาษ). ว่าง = outline จาง (dashed); เก็บแล้ว = ink-stamp เต็ม + เลขลำดับ + วันที่.
- **Reward seal** = แสตมป์พิเศษ (gold foil, ◉) = Coin reward ที่ปลดล็อกเมื่อครบ N stamp — **แสดงเป็นของรางวัล ไม่มีเลขบาท** (§1.2).
- **Seasonal passport** (Yi Peng/Songkran, DEFERRED แต่ design รองรับ): cover พิเศษ + stamp ลายโคม/สาดน้ำ + ribbon "limited" → FOMO.

```
   PASSPORT — "Nimman Cafe-Hop"  ☕  [Featured]
   เก็บ 3 จาก 5 → ปลดล็อกกาแฟฟรี
   ┌─────┐ ┌─────┐ ┌─────┐ ┌╌╌╌╌╌┐ ┌╌╌╌╌╌┐
   │ ✦☕  │ │ ✦☕  │ │ ✦☕  │ ┊  ?  ┊ ┊  ?  ┊
   │ #1  │ │ #2  │ │ #3  │ ┊     ┊ ┊     ┊
   │6/14 │ │6/14 │ │6/15 │ ┊     ┊ ┊     ┊
   └─────┘ └─────┘ └─────┘ └╌╌╌╌╌┘ └╌╌╌╌╌┘
     เก็บ    เก็บ    เก็บ    ว่าง    ว่าง
   ┌───────────────────────────────────────┐
   │  ◉  REWARD: กาแฟฟรี 1 แก้ว             │  gold seal
   │     ปลดล็อกที่ stamp ที่ 3 ✓ พร้อมแลก  │  ← ไม่มี "= ฿xx" / coin-count
   │     [ แลกที่เคาน์เตอร์ → ]              │
   └───────────────────────────────────────┘
```
> **แก้ critique-critical (baht face value):** v1 reward seal แสดง "(60 Coins)" / "มูลค่า ~฿70". v2 reward seal แสดง **ของรางวัลที่ปลดล็อกเท่านั้น** ("กาแฟฟรี 1 แก้ว") — ไม่มีเลข Coin, ไม่มีเลขบาท บนฝั่งผู้ใช้.

---

### 1.6 Motion Principles

**หลัก:** เร็ว, มีจุดหมาย, ฉลองตอน "เก็บค่า" (value-capture = north-star time-to-first-stamp), ไม่หน่วงงาน. respect `prefers-reduced-motion` (ตัด particle/bounce, เหลือ fade).

| Animation | สเปก | ที่ |
|---|---|---|
| **First-stamp provisional** | spinner เบา + "กำลังบันทึกแสตมป์…" (ไม่มี confetti/haptic) | **stamp แรก** ระหว่างรอ server-confirm — *ห้ามฉลองเต็มก่อนยืนยัน* (ดู note) |
| **Stamp-collect (confirmed)** | ตรายางกระแทกลง: scale 1.3→1.0, overshoot, ink-splatter, +haptic "thud" (medium), 380ms `easeOutBack` | check-in **ยืนยันแล้ว** → ปั๊มลงสมุด (first stamp ที่ยืนยัน = confetti เบาครั้งเดียว) |
| **Coin-mint** | เหรียญ gold "ผุด" + หมุน 1 รอบ + count-up (tabular num, สี ink) + ประกายเดียว, 500ms | quest complete → grant Coins. **ต้องคู่ข้อความ "หมดอายุ DD/MM · แลกของจริง" เสมอ (ไม่มีเลขบาท)** |
| **Sparks-gain** | ✦ ลอยขึ้น fade, violet, 300ms, ไม่มีเสียงเงิน | ได้ Sparks (เบากว่า coin → "ไม่ใช่เงิน") |
| **Redeem-burn** | seal → "REDEEMED ✓" + เส้น strike, 250ms, haptic success | server-burn สำเร็จ |
| **Map fly-to** | camera ease 600ms, marker bounce-in | เลือกหมุด/ผลค้นหา |
| **Freshness pulse** | fresh halo เต้นเบา 1 ครั้งตอนโหลด | เน้น "สด" (เฉพาะ fresh) |
| **Page/sheet** | sheet slide-up 250ms `easeOut`, nav fade-through 200ms | ทั่วไป |

> **กฎ first-stamp ห้ามฉลองก่อนยืนยัน (แก้ critique-major "optimistic rollback ของ north-star event"):** stamp แรก = activation moment ที่ออกแบบให้ dopamine สูงสุด — **ต้องรอ online server-confirm ก่อนเล่น confetti+haptic+stamp-thud**. ใช้ provisional "กำลังบันทึกแสตมป์…" ระหว่างรอ. ปั๊ม optimistic+rollback อนุญาตเฉพาะ check-in ถัด ๆ ไป (low-stakes) — **ห้ามฉลองแล้วถอนคืน** เพราะ revoke แสตมป์แรกที่ฉลองไปแล้ว ทำลาย trust หนักกว่าไม่เคยให้.

> **ความแตกต่างเชิงเจตนา:** coin-mint อลังกว่า sparks-gain เสมอ (Coin = มูลค่าจริง แต่ต้องแลกที่ร้าน ไม่ใช่เงินสด). count-up ใช้สี **ink** (ไม่ใช่ gold) เพื่อ contrast + ตอกย้ำว่า "ตัวเลขคือยอด ไม่ใช่ธนบัตร". stamp-collect = moment "เสพติดเชิงบวก" ตรง north-star.

> **Coin expiry (token-level note, แก้ critique-minor dark-pattern):** coin-mint pair ข้อความหมดอายุตั้งแต่วินาทีที่ได้ (ดีอยู่แล้ว). **กฎความเป็นธรรม:** reward ที่ earn เต็มแล้ว **ต้องไม่ทั้งหมดอายุและถูก pause พร้อมกัน** — ถ้า escrow paused ใกล้ Coin หมดอายุ ให้ **auto-extend expiry = ระยะเวลา pause** (logic อยู่ฝั่ง backend; design-system ต้องมี copy "ขยายเวลาให้แล้วเพราะร้านพักชั่วคราว" + near-expiry ใช้ danger ⚠ ไม่ใช่ amber-on-gold §1.2).

---

### 1.7 Accessibility

- **Contrast (verified, แก้ critique-minor):** ทุก text ≥ **4.5:1** (body) / **3:1** (large ≥24px หรือ ≥19px bold).
  - amber-on-white ผ่านเฉพาะ large → ปุ่ม primary ใช้ **ink เข้มบน amber** (`#221B12` on `#E8852C` ≈ 6.9:1 ✓), ไม่ใช่ขาวบน amber (`#FFF` on `#E8852C` ≈ 2.0:1 ✗).
  - **ตัวเลขเงินถือเป็น data ที่ต้อง ≥4.5:1 เสมอ ไม่ว่าขนาด** → ตัวเลข Coin/Sparks ใช้ **ink-900 บนพื้น pill/การ์ด** (เช่น ink บน white ≈ 16:1 ✓, ink บน gold-50 `#FBF1D8` ✓). **ห้ามใช้ Coin-gold `#C9962A`/`#F0A91B` เป็นสีตัวเลขบนพื้นขาว** (`#F0A91B` on white ≈ 2.0:1 ✗; แม้ `#C9962A` ก็ ~3.0:1 ผ่านแค่ large marginally) — **gold สงวนไว้ที่ ◉ icon/ขอบเหรียญเท่านั้น**.
  - Spark violet text `#5B3FD9` บน violet-50 `#EEEAFF` ✓ (≥4.5:1). semantic/freshness tint ทดสอบครบ light+dark.
- **อย่าใช้สีตัวเดียวสื่อความหมาย:** freshness (4 สถานะ) + currency มี **ไอคอน + ข้อความ** เสมอ. Coin vs Sparks ต่างทั้งรูปไอคอน (◉ vs ✦), สี, และคำกำกับ. near-expiry = ⚠ + danger + ข้อความ (ไม่พึ่งสีเดียว).
- **Tap targets ≥ 44×44** (เป้า 48 บน CTA; Counter PWA ≥56 สำหรับ lunch-rush + ผู้ใช้สูงวัย; OTP keypad ปุ่ม ≥56).
- **Dynamic type:** รองรับ OS scaling ถึง ~200% โดย layout ไม่แตก (Flutter `MediaQuery.textScaler` clamp 0.9–1.6; web `rem`-based). **headline ภาษาเดียว (§1.3) = ไม่ overflow จาก stack 3 บรรทัด.** ตัวเลขเงินไม่ตัดทอน.
- **การ render ไทย:** ฟอนต์จัดวรรณยุกต์/สระซ้อนถูก (Noto/Plex Thai), lh สูงตาม §1.3, **ห้าม `letter-spacing` บนไทย** (สระหลุด), **ห้าม all-caps transform บนไทย**.
- **การ render จีน:** Noto Sans SC, ไม่บีบ tracking, line-break ตาม CJK rule, ตัวเลข/หน่วยไม่แยกจากคำ.
- **RTL:** ไม่มีในขอบเขต (th/en/zh LTR) — แต่ layout ใช้ logical properties (`start/end`) เผื่ออนาคต ไม่ฮาร์ดโค้ด left/right.
- **Screen reader / semantics:** ทุกไอคอนปุ่มมี label 3 ภาษาตาม locale (จาก i18n catalog เดียวกับ UI); freshness/currency อ่านเป็นข้อความเต็ม ("Coins, แลกของจริง, หมดอายุ ..."); never-verified อ่าน "ยังไม่เคยตรวจสอบ"; map marker + Counter result states มี a11y label.
- **Motion:** เคารพ reduced-motion (ตัด stamp-thud/confetti/particle → fade); haptic ปิดได้. **first-stamp provisional ก็เคารพ reduced-motion** (เหลือ text-state).
- **Geofence/permission errors** อธิบายเป็นภาษา + ทางออก (OTP fallback) เสมอ ไม่ทิ้ง dead-end — รวม Counter camera-denied/LINE-blocked (§1.4).
- **Privacy copy (a11y of consent, แก้ critique-major):** ข้อความ permission-priming ต้อง **ตรงและป้องกันได้** — ใช้ "เราใช้ตำแหน่งเฉพาะตอนเช็คอิน/แลกรางวัล และไม่สร้างแผนที่การเดินทางต่อเนื่องของคุณ" **ห้าม** absolute "เราไม่เก็บตำแหน่งเลย" (ขัด check-in geo + anti-fraud + geo-cluster analytics → เสี่ยง PDPA). คำนี้ต้อง **ตรงกับ wording ในศูนย์ consent PDPA แบบคำต่อคำ**. *(การ์ด priming เองอยู่ §2; design-system กำหนดเพียง pattern ข้อความ.)*

---

### 1.8 Trilingual Switching Pattern

**กฎ default locale:** เลือกจาก (1) ตัวเลือกผู้ใช้ที่บันทึก → (2) `users.primary_locale` → (3) OS locale → (4) เมือง default (`cities.default_locale='th'` สำหรับ CNX). persona branch ตอน onboarding เซ็ต hint แต่ **ไม่บังคับ** ภาษา.

**กฎแสดงผลภาษา (locked, สอดคล้อง §1.3):**
- **UI strings (headline / CTA / body / nav label) = active-locale เดียว** — ไม่ stack 3 ภาษา.
- **trilingual stacking ใช้ได้ที่เดียว = การ์ดเลือกภาษา** (ที่ซึ่ง endonym 3 ภาษาคือ *เนื้อหา* ของการ์ด ไม่ใช่ chrome).

**จุดสลับภาษา:**
1. **Onboarding** — การ์ดเลือกภาษา 3 ปุ่ม **เขียนด้วยภาษาตัวเอง** ("ภาษาไทย / English / 简体中文") ก่อนเข้าเนื้อหา (zero-signup wall — สลับได้โดยไม่ login). *นี่คือที่เดียวที่ 3 ภาษาปรากฏพร้อมกัน — glyph ZH ที่นี่ bundle subset ไว้ (§1.3) → render ตรงทุกเครื่อง.*
2. **ตลอดการใช้** — สลับใน **Profile → ภาษา / Language / 语言** ทันที (hot-swap ไม่ต้อง restart; Flutter `Locale` provider + `intl`).
3. **กล่อง toggle เร็ว (content-level)** — ที่หัว screen ที่มี UGC เยอะ (place detail, review): chip ระดับ **เนื้อหา** แยกจาก **ภาษา UI** (nomad อ่าน UI อังกฤษ แต่อยากเห็นรีวิวไทยต้นฉบับ).

```
  Place detail header  (UI = active-locale เดียว; toggle คุมเฉพาะ "เนื้อหา")
  ┌──────────────────────────────────────────┐
  │ Graph Café                                │  ชื่อร้าน = ต้นฉบับเสมอ
  │ เนื้อหา/Content:  [ ต้นฉบับ | TH | EN | ZH ]│  ← แปล UGC on-demand
  └──────────────────────────────────────────┘
```

**กฎเนื้อหา 3 ภาษา (จาก schema `*_i18n {th,en,zh}` + ตาราง `translations`):**
- ถ้าภาษาที่เลือก **ไม่มีคำแปล** → fallback `selected → en → th` + marker เล็ก "แปลอัตโนมัติ / auto-translated / 机器翻译" (ตรง `_mt` marker) เพื่อความโปร่งใส.
- ZH = MINIMAL ที่ launch: UI strings ครบ 3 ภาษา แต่ UGC บางส่วน fallback EN + ป้าย auto-translate. **ไม่มี dead text** — เสมอมี fallback อ่านได้.
- ชื่อร้านคงต้นฉบับเสมอ + transliteration เสริมในวงเล็บถ้ามี.

**Component-level i18n:** ทุก label เป็น key (ไม่ฮาร์ดโค้ด); ความยาว 3 ภาษาต่างกัน (ไทย ~+20% จากอังกฤษ, จีนสั้น) → ปุ่ม/chip ใช้ min-width + **ห้ามตัด `...` บนปุ่ม CTA สำคัญ** (ให้ wrap 2 บรรทัด + lh ไทยสูงตาม §1.3). เพราะ headline/CTA = ภาษาเดียว → ไม่ต้องเผื่อความสูงสำหรับ 3 บรรทัดอีกต่อไป (คืน vertical space ให้ AHA content).

---

### 1.9 สรุป Token (ส่งต่อ section ถัดไปได้ทันที)

```
COLOR  : brand-primary #E8852C  ← brand/CTA/active-nav เท่านั้น (ไม่พ่วง Coins/aging/warning)
         secondary(jade) #1E8E7E · tertiary(teak) #5A4632
         Coins = METALLIC GOLD #C9962A (◉ icon/ขอบเท่านั้น; ตัวเลข=ink) ← คนละ hue จาก brand amber
         Sparks = violet #7C5CFF (✦)            ← ห้ามปน, ห้ามเขียว, ห้ามสื่อเงินสด, ห้ามเลขบาทคู่ Coin
         freshness  fresh=green#2BA84A / aging=BRONZE#B06A12 / stale=slate#7A8290 / never=slate-dashed
                    (4 สถานะ — null/never แยกจาก stale)
         semantic   success#2BA84A / warning=OCHRE#C77A0F / danger#D64545 / info#1E8E7E / hold=slate
                    (warning ย้ายออกจาก amber; near-expiry บนการ์ด gold ใช้ danger+⚠ ไม่ใช่ amber)
TYPE   : Inter(EN) + Noto Sans Thai(TH) + Noto Sans SC(ZH: subset bundled สำหรับ picker/wordmark, เต็ม=lazy)
         Inter tabular nums(เงิน, สี ink) · lh ไทย +12–18% เหนือ Latin
         HEADLINE/CTA = active-locale เดียว (stack 3 ภาษาเฉพาะการ์ดเลือกภาษา)
RADIUS : 8/12/16/24/pill   SPACING: 4-pt grid   ELEV: warm shadow rgba(90,70,50,.12)
TARGET : ≥44 (CTA 48, Counter/OTP ≥56)  ·  contrast ≥4.5 (เลขเงิน=ink เสมอ)  ·  ink-on-amber
NAV    : consumer 5-tab = Home · Discover · Passport · Wallet · Profile  ← canonical (sync §2.x/SYSTEM_PLAN)
         agent = role-gated mode swap (jade header) · merchant/counter/admin = web pattern, ไม่มี bottom nav
COUNTER: scanner states = warming / denied→OTP-primary / LINE-blocked / VALIDATING / approved / rejected(neutral) / HOLD(slate)
MOTION : first-stamp PROVISIONAL ก่อน confirm → stamp-collect(thud, ฉลองหลังยืนยันเท่านั้น)
         coin-mint(>sparks-gain, count-up=ink, +expiry copy) · redeem-burn · reduced-motion safe
PRIVACY: location copy = "ใช้เฉพาะตอนเช็คอิน/แลก, ไม่สร้างแผนที่เดินทางต่อเนื่อง" (ตรง PDPA consent คำต่อคำ)
META   : app name "Soi Hop" (ADJUSTABLE) · passport = feature ไม่ใช่ชื่อแอป
```

---

### 1.10 Critique disposition — designsystem scope (รับ / ปฏิเสธ + เหตุผล)

**รับเข้า (fold-in) — แก้ในสเปกนี้:**

| # | severity | ประเด็น | แก้ที่ |
|---|---|---|---|
| 1 | critical | Coins แสดงมูลค่าบาท (e-money mental model) | §1.2 (กฎมูลค่าบาท), §1.5 (reward seal ไม่มีบาท), §1.6 (coin-mint), §1.9 |
| 2 | critical | amber overload (brand=Coins=aging=warning) | §1.2 (Coin→metallic gold #C9962A; aging→bronze; warning→ochre; near-expiry→danger+⚠), §1.9 |
| 3 | critical | trilingual stacked headline + ZH lazy-fallback font | §1.3 (headline active-locale เดียว; ZH subset bundled), §1.8, §1.9 |
| 4 | major | freshness stale=null รวมกัน | §1.2 (4 สถานะ + never-verified ◌ dashed), §1.4 badge, §1.9 |
| 5 | major | Counter camera permission/warming/LINE/hold states หาย | §1.4 (Counter scanner states A–G) |
| 6 | minor | Coin-gold-on-white contrast เสี่ยง | §1.7 (เลขเงิน=ink เสมอ; gold เฉพาะ icon; ระบุ ratio), §1.2 |
| 7 | minor | nav label ขัดกัน (§1.4 vs §2.1) | §1.4 + §1.9 → canonical Home·Discover·Passport·Wallet·Profile |
| 8 | minor | Coin expiry dark-pattern (pause+expire) | §1.6 (auto-extend on pause + copy; near-expiry=danger ⚠) |
| 9 | major | first-stamp optimistic rollback (north-star) | §1.6 (first-stamp provisional, ห้ามฉลองก่อน confirm) + §1.4 loading state |
| 10 | major | privacy copy absolute "ไม่ track" เกินจริง | §1.7 (pattern copy ตรง PDPA; การ์ดเองอยู่ §2) |
| 11 | major | Counter insufficient leak quest internals | §1.4 (reject copy = neutral, ไม่ reveal progress) |

**ปฏิเสธ / นอกขอบเขต §1 (เหตุผล — ส่งต่อ section ที่ถูกต้อง):**

- **AHA <60s / permission-gate blocks clock (critical)** → เป็น *flow ordering* (S1/S2/S3) ของ §2.2/§5.A ไม่ใช่ token/component. §1 ให้ hook ที่จำเป็นแล้ว (permission copy §1.7, non-blocking banner เป็นไปได้ด้วย token เดิม) — การ reconcile ลำดับหน้าจอเป็นงาน §2/§5.
- **Redeem geofence double-check false-block (major)** → กติกา backend/geofence radius + staff override = §2.8/§3.2 logic, ไม่ใช่ design-system. §1 รองรับแล้วด้วย Counter HOLD state (slate, ไม่ใช่ red) + error copy ทางออก.
- **Wallet auth-on-open dead-end (major)** → auth-trigger placement = §2.9 IA. §1 ไม่ได้นิยาม auth gate; ให้เพียง currency explainer pattern.
- **Agent liveness "random angle" friction (minor)** → anti-fraud capture rule = §4.3; ไม่แตะ token/component ของ §1.
- **Cross-reference renumber §5.0 (minor)** & **missing screens ทั้งหมด** (moderator console, merchant signup, review composer, push primer, badge detail, agent playbook, billing/settings ฯลฯ) → เป็น *screen/IA* gaps ของ §2–§5. §1 รับเฉพาะส่วนที่เป็น component/token (เช่น Counter hold-state, money-action loading, seasonal quest variant, never-verified badge) ซึ่ง fold เข้าแล้ว; การ "วาดหน้าจอ" จริงอยู่ section ปลายทาง.

> หลักการ filter: §1 = **brand + token + component + a11y + i18n typography**. รับ finding ที่เปลี่ยน *สี/ฟอนต์/contrast/รูปทรง component/สถานะ component/copy-pattern*; ส่งต่อ finding ที่เป็น *ลำดับ flow / auth boundary / การวาดหน้าจอใหม่ / กติกา backend*. ทุก reject ระบุปลายทางไว้เพื่อไม่ให้หล่นหาย.

---

## 2. Consumer App — IA & Wireframes

> **ขอบเขต section นี้:** แปลง Consumer UX (SYSTEM_PLAN §8) เป็น **IA tree + ASCII wireframes ที่ build ได้จริงบน Flutter** — โฟกัส MVP loop = **Nimman Cafe-Hop** (EARN → GRANT → REDEEM). ทุก wireframe กำกับด้วย: components · เป้าหมายผู้ใช้ · สิ่งที่ต้องเกิด · empty/error/offline state · i18n + a11y notes.
>
> **North-star ที่คุม layout ทุกหน้า:** **TTFS — Time-to-First-Stamp**. ทุก surface ในส่วน First-Run → Home → Place → Check-in ออกแบบเพื่อบีบเวลาตั้งแต่เปิดแอป → เก็บแสตมป์แรกสำเร็จ (`first_stamp_succeeded`). เป้า AHA < 60 วิ ถึง **pixels ของ nearby content จริง** (nearby + promo + 1 featured quest) — ไม่ใช่แค่ "route S3 เข้าแล้ว", first stamp ภายใน session แรก.
>
> **กฎเหล็กที่ UI ห้ามฝ่าฝืน (locked):**
> 1. **Zero signup wall** — browse/search/place-detail/quest-detail/**quest-start** = guest 100%. Auth เด้งเฉพาะตอน "first value-capture" (first stamp / save / review / open wallet *ที่มี value จริง*).
> 2. **Sparks ✨ ≠ Coins 🪙** — แยกชัดทุก visual + wording. **ห้ามมีปุ่มถอน/โอน/แลกเป็นเงินสด** ที่ใดในแอป (e-money boundary ของ ธปท.). **ห้ามแสดงมูลค่าบาท (฿) คู่กับ Coins บนทุก consumer surface** — Coins สื่อด้วย "รางวัลที่ปลดล็อก" (กาแฟฟรี / ขนม) เท่านั้น.
> 3. **Redeem = merchant-initiated** — ผู้ใช้ไม่เคยถือ static QR; โชว์ progress แล้ว "ให้พนักงานสแกน/ใส่รหัส" เท่านั้น.
> 4. **Escrow-aware** — quest/รางวัลที่ escrow=0 ขึ้น "พักชั่วคราว" อย่างสุภาพ ไม่โทษผู้ใช้ ไม่ให้เก็บ stamp ที่ mint Coins ไม่ได้.

> **CHANGELOG (critique fold-in v2 — critical/major first):**
> - **[C1] AHA<60s un-gated:** S1 permission ไม่ block clock อีกต่อไป — S3 AHA Home render ก่อนด้วย coarse/IP-location, location-priming = **non-blocking bottom-sheet เหนือ live map**; S2 Persona = deferrable-by-default. AHA = "pixels of real nearby content". (§2.2)
> - **[C2] Coins ถอด ฿ face value:** ลบ "มูลค่า ~฿70" ออกจากทุก consumer Coin surface (Quest reward preview, Wallet, Redeem) → เหลือ qualitative ("กาแฟ 1 แก้ว"). มูลค่าบาทอยู่ฝั่ง merchant เท่านั้น. (§2.6, §2.8, §2.9)
> - **[C3] แก้ amber semantic overload:** Coin = **metallic gold (#C8881C deeper, distinct hue)** แยกจาก brand-amber (#E8852C = CTA/nav/aging). Near-expiry Coin lot ใช้ **danger treatment + ⚠** ไม่ใช่ amber-on-gold. (§2.9, token note)
> - **[M] negative-assurance copy:** S1 เปลี่ยนจาก "ไม่เก็บเส้นทาง" (เคลมเกินจริง) → "ใช้ตำแหน่งเฉพาะตอนเช็คอิน/แลก และไม่สร้างแผนที่การเดินทางต่อเนื่อง" ตรงกับ PDPA center wording. (§2.2, §2.10)
> - **[M] trilingual headline:** เลิก stack 3 บรรทัด — headline/CTA แสดง **active-locale บรรทัดเดียว**; trilingual stacking สงวนเฉพาะ language-picker card. กัน dynamic-type overflow + ZH fallback-font. (§2.2 ทั้งหมด)
> - **[M] freshness null split:** แยก "ยังไม่เคยตรวจสอบ" (last_verified_at IS NULL) ออกจาก "stale/อาจไม่อัปเดต" (verified แต่เก่า). never-verified down-rank ใน AHA. (§2.5, §2.2)
> - **[M] Wallet guest:** เปิด Wallet เป็น guest = **read-only explainer** (ไม่ใช่ auth modal ทันที) — auth ยิงเฉพาะ value-capture จริง. (§2.9)
> - **[M] first-stamp ห้าม optimistic:** first stamp ต้อง **online-confirm** ก่อน celebration; provisional "กำลังบันทึก…" จน server ยืนยัน. optimistic+rollback ใช้เฉพาะ stamp ถัด ๆ ไป. (§2.7)
> - **[M] nav canonical:** ยึด **Home/Discover/Passport/Wallet/Profile** (แก้ §1.4 ให้ตรง). (§2.1)
> - **[M] guest quest-start persist:** quest-start ของ guest = device-scoped persist; เพิ่ม recovery/merge ถ้า session หายก่อน first stamp. (§2.6)
> - **[M] redeem geofence false-block:** redeem-time geofence = **indoor radius ใจกว้าง + แยก "GPS อ่อน" ออกจาก "อยู่ไกลจริง"**; ไม่ hard-reject ลูกค้าที่อยู่หน้าเคาน์เตอร์. (§2.8)
> - **[M] money-action loading:** เพิ่ม state "กำลังตรวจที่เคาน์เตอร์…" (redeem) และ "กำลังออกรางวัล…" + grant-fail fallback (quest-complete mint). (§2.7, §2.8)
> - **[m] Coin numeral contrast:** ตัวเลข Coin ใช้ **ink #221B12** (clear 4.5:1), gold สงวนเฉพาะ icon/accent. (§2.9 a11y)
> - **[m] Coin expiry fairness:** expiry ใจกว้าง + แจ้งตอน grant; ถ้า escrow paused ใกล้ coin หมดอายุ → **auto-extend = ระยะ pause**; recovery path blame-free. (§2.6, §2.9)
> - **[m] Place CTA out-of-range:** Place Detail CTA pre-warn ระยะ/ยังเปิด sheet ที่โชว์ navigate-state (ไม่ tap→dead sheet). (§2.5)
> - **เพิ่ม screens ที่ critique ชี้ว่าขาด (consumer):** Wallet-guest explainer (§2.9), freshness never-verified (§2.5), first-stamp provisional (§2.7), auth-merge-conflict (§2.7), redeem-ready-but-paused (§2.8), push opt-in primer (§2.12), DSAR/delete confirm (§2.10), location-services-OFF deep-link (§2.2), search no-normalized-match (§2.4), review composer + report (§2.13), quest-complete mint loading (§2.7), seasonal/collectible detail + badge detail (§2.6), guest quest recovery (§2.6), Chinese-FIT RED-list import (§2.14).
> - **REJECTS (out of consumer scope — fix อยู่ section อื่น):** Counter PWA camera-permission/LINE-webview, Counter REJECTED reason leak, Counter third manual-review state, Counter VALIDATING loading → **merchant §3.2.g** (ไม่ใช่ consumer surface). Moderator/admin console, merchant signup/billing/settings/redemptions-list/payout-bank, agent appeal/playbook/onboarding/liveness-angle, SoD reviewer screens → **merchant §3 / agent §4**. §5.0 cross-ref renumber → **storyboard §5** (เป็น handoff index ไม่ใช่ consumer wireframe). ส่วน "field-agent role revoked mid-session fallback" = consumer-mode fallback แต่ trigger/logic อยู่ §4.0 → ปล่อยให้ §4 เป็นเจ้าของ, §2 รับเฉพาะ render customer-mode ปกติ.

---

### 2.1 Screen Map — IA Tree (Flutter)

Bottom nav 5 แท็บ (icon-first, label ตาม locale) — **canonical set ที่ทั้ง design-system handoff + IA build + analytics ต้องใช้ตรงกัน:** **Home · Discover · Passport · Wallet · Profile**. Field-Agent เป็น **role-gated MODE** (ไม่ใช่แท็บ; ปลดล็อกใน Profile เมื่อ `user_roles` มี `field_agent` — รายละเอียดอยู่ section Field Agent).

```
Consumer App (Flutter · TH/EN/简体中文)
│
├─ ROOT — First-Run (one-time, guest, NON-blocking)            [GUEST]
│   ├─ S0  Splash / locale auto-detect (device locale → th|en|zh)
│   ├─ S1  AHA Home FIRST (coarse/IP location → instant value)  ★ no gate
│   │        ↳ Location-priming = bottom-sheet เหนือ live map (in-context, ข้ามได้)
│   │        ↳ OS permission dialog → {precise|approx|denied}   (เมื่อกด/contextual)
│   └─ S2  Persona nudge (inline chip, deferrable-by-default)   ← ไม่กิน full screen
│
├─ TAB 1 — Home  (= S1 AHA, map-first hybrid)                   [GUEST→]
│   ├─ Map pane (Mapbox, freshness halo, eat/see/do pins)
│   ├─ List pane (rails: Featured Quest · Live Promos · Nearby · Trending · Seasonal)
│   ├─ Category toggle  [Eat · See · Do · Open now]
│   ├─ Active-Quest banner (sticky, ถ้ามี quest in_progress)
│   └─ → Place Detail · → Quest Detail · → Check-in
│
├─ TAB 2 — Discover / Search                                    [GUEST→]
│   ├─ Search bar (mixed-language: ไทย↔EN↔pinyin)
│   ├─ Filter sheet (category · open-now · price · distance · accepts · vibe · dietary · quest-linked)
│   ├─ Results (list ⇄ map toggle)
│   └─ → Place Detail
│
├─ Place Detail  (modal/route จากทุก surface)                   [GUEST→]
│   ├─ Hero gallery · name(3-lang) · category · price
│   ├─ Freshness badge (fresh / aging / stale / **never-verified**)
│   ├─ Open-now · live promo (countdown) · "in N quests" chip
│   ├─ Pay rails (PromptPay/Alipay/WeChat) · dietary · map/route/call
│   ├─ Verified-visitor reviews (auto-translate) → Review Composer
│   └─ CTA: [เช็คอิน / เก็บแสตมป์]  (distance-aware) → Check-in flow
│
├─ TAB 3 — Passport / Quests                                    [GUEST view+start / AUTH collect]
│   ├─ Active Quests (stamp progress 3/5, next-stop nav)
│   ├─ Quest Detail (escrow-aware) + Seasonal/Collectible Detail (Sparks+badge variant)
│   ├─ Collectibles / Seasonal (Yi Peng · Songkran — FOMO)
│   ├─ Badge case → Badge Detail / all-badges
│   └─ Guest quest-start recovery (session lost ก่อน first stamp)
│
├─ Check-in Flow  (จาก Place / Quest / Home banner)             [AUTH at first stamp]
│   ├─ Geofence + dwell detect
│   ├─ Method picker: GPS-dwell (T1) | Scan merchant QR (T2) | [proven purchase T3]
│   ├─ ▸ AUTH WALL (เฉพาะ first stamp ของ guest) → LINE/Apple/Google/WeChat
│   │     └─ merge-conflict path (guest progress ชนกับ account เดิม)
│   ├─ first-stamp PROVISIONAL ("กำลังบันทึก…" จน server-confirm)  ★ no optimistic
│   └─ Success + stamp-collect animation (+Sparks, Step n/N)
│
├─ Redeem Flow (customer side)  (จาก Wallet / Quest reward)     [AUTH]
│   ├─ Reward ready ("คุณได้กาแฟฟรี")  / ready-but-paused block
│   ├─ Geofence confirm (indoor-generous) → "ให้พนักงานสแกน" (rotating QR/OTP, TTL)
│   ├─ "กำลังตรวจที่เคาน์เตอร์…" (in-flight) → Merchant scans → server burns Coin
│   └─ Success receipt (+ unlock verified-visitor review)
│
├─ TAB 4 — Wallet                                               [GUEST explainer / AUTH full]
│   ├─ GUEST → read-only explainer (Sparks=XP / Coins=รางวัล · ไม่มี auth-wall)
│   ├─ Sparks ✨ card (XP · tier · ไม่มีวันแลกเป็นเงิน)
│   ├─ Coins 🪙 card (balance · expiry timeline · NO withdraw · ไม่มี ฿)
│   ├─ Tier progression + Badge case
│   └─ Redemption history (fact only, PDPA)
│
├─ TAB 5 — Profile                                              [GUEST partial / AUTH full]
│   ├─ Language switch (TH/EN/简体中文 override device)
│   ├─ Persona toggle (Tourist Trail ↔ Local Streaks)
│   ├─ Linked logins · payment methods
│   ├─ PDPA center (consent toggles · my-data DSAR · delete account + confirm)
│   ├─ Chinese-FIT: RED-list paste/import (fuzzy-match my list)
│   └─ Field-Agent MODE entry (ถ้า role-gated)
│
└─ Cross-cutting overlays
    ├─ Auth Sheet (modal, persona-ordered, guest-progress merge + conflict path)
    ├─ Offline banner + queued-action toasts
    ├─ Push opt-in primer (consent-gated, persona tone, trigger = post first-stamp)
    └─ Error/empty states (per screen, ดูแต่ละ wireframe)
```

**Auth boundary cheat-sheet (reconciled):** `[GUEST]` = ไม่ต้อง login · `[GUEST→]` = browse + **quest-start** แบบ guest, action ที่เป็น value-capture เด้ง auth · `[AUTH]` = ต้อง login. **Wallet ไม่ใช่ auth-on-open อีกต่อไป** — guest เปิดได้แบบ read-only explainer; auth ยิงเฉพาะตอนมี value จริงจะบันทึก (first stamp). ทุกแท็บอื่นเข้าได้แบบ guest.

---

### 2.2 (a) First-Run — Zero-Signup → AHA (un-gated)

**หลักการที่เปลี่ยน (critique C1):** การวัด TTFS/AHA เริ่มที่ `app_open` แต่เดิมเราบังคับ S1 permission → OS dialog → S2 persona **ก่อน** เห็น value = เสี่ยงเกิน 60 วิ. ตอนนี้ **render AHA Home ก่อนเลย** ด้วย coarse/IP-based location, แล้วค่อย prime permission/persona **แบบ non-blocking ใน context**. ทั้งหมดยัง **guest** — ไม่มีหน้า login.

ลำดับใหม่: **S0 Splash → S1 AHA Home (พร้อม coarse data) → [in-context] Location priming sheet → [inline] Persona nudge.**

#### S1 — AHA Home FIRST (instant value, < 60s) ⭐ (เป้า AHA จริง)

```
┌───────────────────────────────────────────────┐
│ 📍 Nimman (โดยประมาณ) ✨0 🪙0   [TH▾]          │ ← coarse loc, guest 0, ไม่มี login
├───────────────────────────────────────────────┤
│ ╔═══════════════════════════════════════════╗ │
│ ║   🗺  MAPBOX (coarse → precise เมื่ออนุญาต) ║ │ ← render ทันที ไม่รอ permission
│ ║        • • ◉(halo) •   (pins: 🍜📸🎯)       ║ │
│ ║                            [⊕ re-center]   ║ │
│ ╚═══════════════════════════════════════════╝ │
│ [Eat][See][Do][🕐 Open now]   ↕ ลากดูรายการ     │
├───────────────────────────────────────────────┤
│ ╔══ ⭐ FEATURED QUEST ═══════════════════════╗ │
│ ║ 🎯 Nimman Cafe-Hop                          ║ │ ← ชื่อ active-locale บรรทัดเดียว
│ ║ เยือน 3 ใน 5 คาเฟ่ → ฟรีกาแฟ 1 แก้ว         ║ │
│ ║ ▢▢▢▢▢  0/5   [ ดูเส้นทาง · เริ่ม → ]        ║ │ ← AHA hook
│ ╚═══════════════════════════════════════════╝ │
│ ─ 💸 โปรสดใกล้คุณ ─────────────────────────────│
│ │Graph Cafe  ลด15% ⏳ถึง18:00 · 200m 🟢open │ →│
│ ─ 📍 ใกล้คุณตอนนี้ (15) ───────────────────────│
│ │Ristr8to ☕ ฿฿ ·150m· ✅verified 3d· 🎯Step │ →│
│ │One Nimman 📸 ·400m· 🟢open ·★4.6           │ →│
├───────────────────────────────────────────────┤
│ ╔═ 📍 เปิดตำแหน่งเพื่อร้านที่ใกล้กว่านี้ ── [✕]═╗│ ← non-blocking priming sheet
│ ║ เราใช้ตำแหน่งเฉพาะตอนเช็คอิน/แลกรางวัล      ║│   (เหนือ live map, ปัดทิ้งได้)
│ ║ และไม่สร้างแผนที่การเดินทางต่อเนื่องของคุณ  ║│ ← defensible PDPA copy (M)
│ ║         [ เปิดตำแหน่ง ]   [ ภายหลัง ]        ║│
│ ╚═══════════════════════════════════════════╝│
├───────────────────────────────────────────────┤
│  🏠Home  🔍Discover  📖Passport  💰Wallet  👤  │
└───────────────────────────────────────────────┘
```
- **Components:** location header (district โดยประมาณ + guest balances ✨0/🪙0 + lang switch), Mapbox map (coarse→precise) w/ freshness halo + re-center FAB, category chips, map↕list drag-grip, **Featured Quest card (AHA hook)**, Live Promos rail, Nearby rail, **non-blocking location-priming bottom-sheet** (เหนือ map, ปัดทิ้งได้), bottom nav.
- **เป้าหมายผู้ใช้:** ภายในไม่กี่วินาทีเห็น "มีอะไรน่าทำใกล้ฉันตอนนี้" + 1 เกมจับต้องได้ ("เยือน 3 ได้กาแฟฟรี") — **โดยไม่ต้องผ่านหน้า permission/persona ก่อน**.
- **สิ่งที่ต้องเกิด:** `app_open` → coarse/IP geolocate → PostGIS nearest-Places → render ~15 pins + rails **ทันที**; emit `home_loaded{nearby_count, ms_to_first_place}` — **วัดต่อ 60s budget; AHA = pixels of real nearby content ไม่ใช่ route เข้า**. กด priming "เปิดตำแหน่ง" → OS dialog → `location_permission_prompt_shown` → `location_permission_result{precise|approx|denied}` → upgrade pins เป็น precise. กด Featured = `quest_card_viewed`; "เริ่ม" = `quest_started` (**guest persist device-scoped, ยังไม่ขอ auth** — auth รอ first stamp).
- **Permission result paths:**
  - *precise* → upgrade nearby เป็นรัศมีจริง.
  - *approx* → nearby ระดับย่าน; check-in จะขอ precise ภายหลัง.
  - *denied* → คง coarse/Old City default + sticky banner เบา ๆ "เปิดตำแหน่งเพื่อร้านที่ใกล้กว่า".
  - *location services OFF (device-level)* → S1b deep-link screen (ดูด้านล่าง).
- **Empty/edge states:**
  - *0 nearby (นอกย่าน density)* → "ยังไม่มีร้านในรัศมีนี้" + ปุ่ม "ดูที่ Nimman" (เด้งไปย่าน seed dense — กัน empty map ตาม Density Gate).
  - *no featured quest in area* → แทนด้วย Trending rail (ไม่ทิ้ง slot ว่าง).
- **Offline:** cached tiles + last Places + banner "ออฟไลน์ — ข้อมูลล่าสุดเมื่อ X"; promo countdown freeze + "เชื่อมต่อเพื่ออัปเดต".
- **i18n:** **headline/CTA แสดง active-locale บรรทัดเดียว** (ไม่ stack 3 ภาษา — critique M); quest title curated `name_th/en/zh`; promo "ถึง 18:00" = locale time; ฿ + เลขท้องถิ่น (ฝั่ง place price; ไม่เกี่ยว Coins).
- **a11y:** map มี list-equivalent (ทุก pin มีใน list); freshness badge มีสี+ข้อความ+icon; pins มี semantic label; priming sheet ปิดด้วย screen reader ได้; chips อ่าน state.

#### S1b — Location Services OFF (device-level) — deep-link

```
┌───────────────────────────────────────────────┐
│ ← ตำแหน่งถูกปิดที่เครื่อง                         │
│        📍✕  (illustration)                       │
│   ตำแหน่ง (Location Services) ปิดอยู่ที่เครื่อง    │
│   เปิดเพื่อให้เราหาร้านใกล้คุณได้                  │
│   ┌─────────────────────────────────────────┐  │
│   │   เปิดการตั้งค่าตำแหน่ง / Open Settings   │  │ ← deep-link OS settings
│   └─────────────────────────────────────────┘  │
│   ดูแบบไม่เปิดตำแหน่งก่อน  (Old City) →          │ ← fallback path
└───────────────────────────────────────────────┘
```
- **เกิดเมื่อ:** ระบบตรวจ device location service = off (ต่างจาก app-permission denied). deep-link ไป OS Settings; secondary = Old City fallback. ไม่เป็น dead-end.

#### S2 — Persona nudge (inline, deferrable-by-default)

แทนที่ full-screen persona เดิม → **inline nudge** ที่ไม่ block AHA. โผล่เป็น chip/sheet เบา ๆ หลัง render value แล้ว (หรือใน Profile ทีหลัง). ข้ามคือ default.

```
─ inline persona nudge (เหนือ rails, ปัดทิ้งได้) ─
┌───────────────────────────────────────────────┐
│ ปรับให้ตรงคุณ:  [🧳 มาเที่ยว] [🏠 อยู่ที่นี่] [✕] │ ← 1 แตะ, ไม่บังคับ
└───────────────────────────────────────────────┘
   language-picker (กดธง [TH▾] บน header) = card เดียวที่ stack 3 ภาษา:
┌───────────────────────────────────────────────┐
│   ภาษา / Language / 语言                         │ ← endonym = content, stacking OK ที่นี่
│   ( ◯ ไทย   ◉ English   ◯ 简体中文 )            │
└───────────────────────────────────────────────┘
```
- **Components:** inline persona chips (Visiting / Live here) + dismiss; language-picker (**card เดียวในแอปที่ stack 3 ภาษา** — เพราะ endonym คือ content). FIT zh = เลือกผ่าน language-picker → set persona-hint=FIT + locale=zh.
- **สิ่งที่ต้องเกิด:** เลือก = set `audience_segment` hint (tourist_west / local|nomad / tourist_cn) — **เป็นแค่ตัวปรับ ranking + tone + lang default ไม่ใช่ feature gate**; emit `persona_selected{segment}`. ข้าม = default tourist_west ถ้า locale=en, local ถ้า locale=th, tourist_cn ถ้า locale=zh.
- **States:** ข้ามได้ทุกเมื่อ (no dead-end); สลับใน Profile (§2.10).
- **i18n:** **persona chips แสดง active-locale บรรทัดเดียว**; language-picker = trilingual endonym (ข้อยกเว้นเดียว).
- **a11y:** chips มี text label ไม่พึ่ง emoji; radio group (language) announced state.

---

### 2.3 (b) Home — Map-First Hybrid (steady state)

หน้าเดียวกับ S1 แต่ในสถานะ steady (อาจ auth แล้ว, มี active quest). เพิ่ม **sticky active-quest banner** เมื่อมี quest `in_progress`.

```
┌───────────────────────────────────────────────┐
│ 📍 Nimman          ✨120  🪙2 ⏳7d   [EN▾]     │ ← auth: ยอดจริง (Coins=จำนวน, ไม่มี ฿)
├───────────────────────────────────────────────┤
│ ╔══ 🎯 ACTIVE: Nimman Cafe-Hop  ▓▓▓░░ 3/5 ══╗ │ ← sticky active-quest banner
│ ║ ร้านถัดไป: Ristr8to · 150m  [ นำทาง → ]     ║ │
│ ╚═══════════════════════════════════════════╝ │
│ ╔═══════════════════════════════════════════╗ │
│ ║   🗺  MAPBOX                                ║ │
│ ║   ◉you  ①②③ done(✓)  ④⑤ quest-stop(◯)     ║ │ ← quest stops หมายเลขบน map
│ ║                            [⊕ re-center]   ║ │
│ ╚═══════════════════════════════════════════╝ │
│ [Eat][See][Do][🕐Open now]      ═══ ↕ grip ═══ │
├───────────────────────────────────────────────┤
│ ─ 💸 Live Promos ─────────────────────────────│
│ ─ 📍 Nearby (open now) ───────────────────────│
│ ─ 🔥 Trending in Nimman ──────────────────────│
│ ─ 🏮 Yi Peng collectible (ถ้าในช่วงเทศกาล) ───│
├───────────────────────────────────────────────┤
│  🏠  🔍  📖  💰  👤                            │
└───────────────────────────────────────────────┘
```
- **Components:** header (district + ✨/🪙 balances + nearest coin-expiry hint — **เป็นจำนวน Coin ไม่มี ฿**), **active-quest banner** (progress + next-stop + nav), map (numbered quest stops, done=✓/pending=◯, freshness halo), drag-grip (full-map / split / full-list), category chips, rails feed.
- **เป้าหมายผู้ใช้:** กลับมาแล้วรู้ทันทีว่า "เหลืออีกกี่ร้านจบ quest + ร้านถัดไปอยู่ไหน" → drive การเดินต่อ (TTFS / repeat).
- **สิ่งที่ต้องเกิด:** ranking = relevance(distance × freshness × rating × promo) ปรับน้ำหนักตาม persona (**never-verified down-rank**); quest banner กด = ไป Quest Detail / นำทางไป next stop.
- **States:**
  - *no active quest* → ซ่อน banner, rail Featured Quest กลับมาเด่น.
  - *quest paused (escrow=0)* → banner เปลี่ยนเป็น "⏸ พักชั่วคราว — รางวัลกำลังเติม" (ไม่ใช่ error สีแดง; ดู §2.6).
  - *all stops done* → banner = "ครบแล้ว! ไปแลกกาแฟฟรี →" (ลิงก์ Redeem).
- **Offline:** banner + cached; "นำทาง" เปิด map cache; promo freeze.
- **i18n:** "ร้านถัดไป/Next/下一站" active-locale; distance = เมตร ทุก locale ในไทย.
- **a11y:** drag-grip มี discrete buttons สำรอง (map/split/list); progress bar มี text "3/5" คู่กับ visual.

---

### 2.4 (c) Discover / Search — Filters

```
┌───────────────────────────────────────────────┐
│ ← [ 🔍 ค้นหาร้าน, ย่าน, เมนู…           ] ⓧ    │ ← mixed-lang search
├───────────────────────────────────────────────┤
│ [⚙ ตัวกรอง 3]   [≡ List | 🗺 Map]   sort: ⭐ ▾ │ ← filter count + list/map + sort
├───────────────────────────────────────────────┤
│ active chips: [Eat ⓧ][Open now ⓧ][微信支付 ⓧ] │ ← removable active filters
├───────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────┐ │
│ │ Ristr8to  ☕Cafe ฿฿                        │ │
│ │ ★4.6 · 150m · 🟢open ·22:00               │ │
│ │ ✅ verified 3d · 🎯 Cafe-Hop Step          │ │
│ │ 💸 ลด15% ถึง18:00                          │ │
│ └───────────────────────────────────────────┘ │
│ ┌───────────────────────────────────────────┐ │
│ │ Graph Cafe …                              │ │
│ └───────────────────────────────────────────┘ │
└───────────────────────────────────────────────┘

  ── Filter Sheet (กด ⚙ เลื่อนขึ้น) ────────────
┌───────────────────────────────────────────────┐
│ ตัวกรอง / Filters                 [ล้าง] [ปิด]│
│ Category   ▢Eat ▢See ▢Do  +sub(cafe/temple…) │
│ 🕐 Open now            ( ●—— off )            │
│ Price       [฿][฿฿][฿฿฿][฿฿฿฿]                 │ ← price ของร้าน (ไม่เกี่ยว Coins)
│ Distance    ◉500m ◯1km ◯3km ◯ทั้งแผนที่        │
│ Accepts     ▢PromptPay ▢Alipay ▢WeChat ▢cash  │ ← FIT critical
│ Vibe        ▢workspace ▢instagram ▢quiet…     │ ← curated taxonomy (แปลได้)
│ Dietary     ▢เจ ▢vegan ▢halal ▢gluten-free    │
│ ▢ เฉพาะที่เป็น Quest Step                       │
│  ┌─────────────────────────────────────────┐  │
│  │       แสดง 23 ร้าน / Show 23 places       │  │ ← live count
│  └─────────────────────────────────────────┘  │
└───────────────────────────────────────────────┘
```
- **Components:** search bar (clearable), filter button w/ active-count badge, list⇄map toggle, sort dropdown (relevance/distance/rating), removable active-filter chips, result cards, filter bottom-sheet (category+sub, open-now, price, distance, **accepts**, vibe, dietary, quest-linked) + live count + apply.
- **เป้าหมายผู้ใช้:** หาร้านตรงเงื่อนไข persona (FIT: "รับ WeChat Pay" · nomad: "workspace + open now" · tourist: "open now + ฿฿ + ใกล้").
- **สิ่งที่ต้องเกิด:** filter = client+server query; **accepts WeChat/Alipay** first-class; vibe/dietary จาก curated taxonomy → แปล deterministic 3 ภาษา; search รองรับ ไทย↔EN↔pinyin ผ่าน alias/normalized index; emit `search_performed{filters}`.
- **Empty/error:**
  - *0 results (filter)* → "ไม่เจอร้านที่ตรงเงื่อนไข" + ปุ่ม "ผ่อนตัวกรอง" (เสนอ relax distance/price อันแรก) + ปุ่มล้าง.
  - *search no match (term)* → "ลองคำอื่น" + แสดง popular nearby แทน.
  - ***no-normalized-match (mixed-script edge)*** → user พิมพ์ Hanzi หา place ที่มีแต่ชื่อไทย / พิมพ์ pinyin ที่ normalize ไม่เจอ → "ไม่พบชื่อนี้ในภาษาที่พิมพ์ — ลองชื่อภาษาไทย/อังกฤษ หรือค้นจากหมวด" + suggest nearby + ปุ่มเปลี่ยนเป็น browse-by-category (กัน dead-end จาก script mismatch).
- **Offline:** ค้นได้เฉพาะ cached set + banner "ค้นเฉพาะข้อมูลที่โหลดไว้".
- **i18n:** filter labels จาก i18n catalog; vibe/dietary จาก translation table; "ปิด/Done/完成" active-locale; live count เลขท้องถิ่น.
- **a11y:** checkboxes/radios มี label + state; sort/filter เปิดด้วย keyboard/switch; result card อ่านลำดับ name→category→distance→signal.

---

### 2.5 (d) Place Detail — Freshness + Trust (4-state freshness)

```
┌───────────────────────────────────────────────┐
│ ←                          ♡ บันทึก   ⤴ แชร์   │ ← save (auth-gated), share
│ ╔═══════════════════════════════════════════╗ │
│ ║   [ รูป cover / gallery  ‹ • • • › ]        ║ │ ← hero (Agent-shot photos)
│ ╚═══════════════════════════════════════════╝ │
│ Ristr8to · 锐特八度  ☕ Eat · ฿฿               │
│ ★ 4.6  (จาก verified visitors)                │ ← weighted by trust tier
│ ┌─────────────────────────────────────────┐  │
│ │ ✅ ตรวจสอบกับสถานที่จริง 3 วันที่แล้ว        │  │ ← FRESHNESS BADGE (4 states)
│ │    โดย local agent                        │  │
│ └─────────────────────────────────────────┘  │
├───────────────────────────────────────────────┤
│ 🟢 Open now · ปิด 22:00 · 350m  [นำทาง]       │
│ 💸 ลด 15% ถึง 18:00  ⏳02:14:30               │ ← live promo countdown
│ 🎯 อยู่ใน 2 quests:  Nimman Cafe-Hop (Step) ▸ │ ← "this place is in N quests"
├───────────────────────────────────────────────┤
│ 💳 รับ: PromptPay · 支付宝 · 微信支付           │ ← FIT critical
│ 🥗 เจ/vegetarian available                     │
│ ☎ โทร · 💬 LINE · WeChat ร้าน                  │
├───────────────────────────────────────────────┤
│ รีวิว (เฉพาะคนที่ไปจริง · Visited ✓)            │
│  [ 🌐 แปลเป็นภาษาของฉัน ▾ ]                     │ ← auto-translate UGC
│  "กาแฟดีมาก…"  ★5  Visited ✓ · translated     │
├───────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐  │
│ │   🎯  เช็คอิน / เก็บแสตมป์   (150m)        │  │ ← distance-aware CTA → Check-in
│ └─────────────────────────────────────────┘  │
└───────────────────────────────────────────────┘
```

**Freshness badge — 4 states (critique M: แยก null ออกจาก stale):**
```
fresh  (<30d)  →  ✅ ตรวจสอบกับสถานที่จริง 3 วันที่แล้ว · โดย local agent   (เขียว)
aging  (30-90d)→  🕐 ตรวจสอบล่าสุด 45 วันที่แล้ว · อาจมีเปลี่ยนแปลง        (amber/brand)
stale  (>90d)  →  ⚠ ตรวจสอบนานแล้ว (>90 วัน) · อาจไม่อัปเดต              (จาง + เทา)
NULL   (never) →  ◌ ยังไม่เคยตรวจสอบโดย agent · ข้อมูลยังไม่ยืนยัน         (เทา/neutral)
```
- **Components:** hero gallery (Agent photos), name (real + transliteration), category+price, **trust-weighted rating**, **FRESHNESS BADGE (4-state: fresh/aging/stale/never-verified)**, open-now+hours+distance+route, live-promo countdown, **"in N quests" chip**, pay rails, dietary, contact, verified-visitor reviews w/ translate, sticky **distance-aware Check-in CTA**.
- **เป้าหมายผู้ใช้:** ตัดสินใจ "ไปไหม/ไปตอนนี้ได้ไหม/จ่ายได้ไหม" ด้วยข้อมูลที่ **เชื่อถือได้ว่าสด หรือรู้ชัดว่ายังไม่ยืนยัน** แล้วเริ่ม check-in.
- **สิ่งที่ต้องเกิด:** freshness ดึงจาก `data_freshness.last_verified_at` + `freshness_label`; **`last_verified_at IS NULL` → render "never-verified" (ไม่ใช่ stale)** — never-verified ห้ามเคลม "verified by people here" (รักษา moat); rating = weighted mean ด้วย `trust_weight`; review เขียนได้เฉพาะคนมี check-in/redemption fact ที่นี่; emit `place_detail_viewed{place_id, category, freshness_state}`.
- **CTA out-of-range behavior (critique M):** CTA แสดงระยะทางเสมอ ("เช็คอิน · 150m"). ถ้า **อยู่นอก geofence** → CTA **ยังกดได้** แต่เปิด Check-in sheet ที่ขึ้น navigate-state ("ไปที่ร้าน · 1.2km") ทันที (ไม่ tap→dead sheet); ถ้าอยู่ในระยะ → เข้า method picker เลย. ระยะที่ขึ้นบนปุ่ม = pre-warn.
- **States:**
  - *closed now* → "🔴 ปิดแล้ว · เปิด 08:00 พรุ่งนี้" + CTA check-in ยัง active (อาจ check-in นอกเวลาได้ตาม quest rule).
  - *no reviews yet* → "ยังไม่มีรีวิวจากคนที่ไปจริง — ไปเช็คอินเป็นคนแรก".
  - *no promo* → ซ่อน row. *not in any quest* → ซ่อน quest chip.
  - *save/review เป็น guest* → กด → auth sheet (value-capture).
- **Offline:** เคยเปิด → cached full; ไม่เคย → "เชื่อมต่อเพื่อดูร้านนี้"; check-in ยังทำได้ optimistic (queue) — **ยกเว้น first stamp** (ดู §2.7).
- **i18n:** ชื่อร้าน = original + แปล (ไม่บังคับ); review auto-translate on-demand + "translated" + ปุ่มดู original; fallback chain zh→en→th; ฿/วันที่ locale-aware (ฝั่ง place price/freshness date).
- **a11y:** countdown มี text + ไม่ใช่สีอย่างเดียว; freshness badge 4-state มี icon+text+color ทุก state; gallery มี page indicator; CTA ≥48dp.

---

### 2.6 (e) Passport / Quest — Nimman Cafe-Hop ⭐ (escrow-aware, no ฿)

**Passport** = surface เหนือ `quest_progress` (ไม่ใช่ตารางใหม่). หน้านี้คือ "สมุดสะสมแสตมป์ดิจิทัล". **Coin reward สื่อด้วย "ของที่ปลดล็อก" ไม่มีมูลค่าบาท** (critique C2).

```
── Passport (tab) ─────────────────────────────
┌───────────────────────────────────────────────┐
│ 📖 Passport               [Active][Collectible]│
├───────────────────────────────────────────────┤
│ ╔══ 🎯 Nimman Cafe-Hop ══════════════════════╗ │
│ ║  ☕✓ ☕✓ ☕✓ ◯ ◯     3/5                    ║ │ ← stamp progress
│ ║  รางวัล: ☕ ฟรีกาแฟ 1 แก้ว                   ║ │ ← qualitative (ไม่มี ฿)
│ ║  ร้านถัดไป: Ristr8to ·150m  [ ดูเส้นทาง → ] ║ │
│ ╚═══════════════════════════════════════════╝ │
│ ╔══ 🏮 Yi Peng Lantern Trail (seasonal) ═════╗ │
│ ║  เก็บได้ถึง 15 พ.ย. · ⏳ 4 วัน  0/3         ║ │ ← FOMO countdown
│ ║  รางวัล: 🎖 badge + ✨ Sparks (ไม่มี escrow) ║ │ ← seasonal variant
│ ╚═══════════════════════════════════════════╝ │
│  Badge case: 🥇🎖🏅 …        [ ดูทั้งหมด → ]    │ → Badge Detail
└───────────────────────────────────────────────┘

── Quest Detail (กดเข้า Nimman Cafe-Hop) ──────
┌───────────────────────────────────────────────┐
│ ← 🎯 Nimman Cafe-Hop                           │ ← title active-locale
│  เยือน 3 ใน 5 คาเฟ่พาร์ตเนอร์ → ฟรีกาแฟ 1 แก้ว │
│  ▓▓▓░░  3/5  ·  หมดเขต 30 มิ.ย.               │
├───────────────────────────────────────────────┤
│ ╔═══ 🗺 แผนที่ stops (trail) ════════════════╗ │
│ ║   ①✓ ②✓ ③✓ ──── ④◯ ──── ⑤◯               ║ │ ← stops บน map
│ ╚═══════════════════════════════════════════╝ │
│  STAMPS                                         │
│  ① Graph Cafe   ☕ ✓ เก็บแล้ว 12 มิ.ย.         │
│  ② Akha Ama     ☕ ✓ เก็บแล้ว 13 มิ.ย.         │
│  ③ Roast8ry     ☕ ✓ เก็บแล้ว 14 มิ.ย.         │
│  ④ Ristr8to     ☕ ◯ ·150m  [ เช็คอิน → ]     │ ← next, actionable
│  ⑤ Nimman Coffee☕ ◯ ·420m                     │
├───────────────────────────────────────────────┤
│  🎁 REWARD                                      │
│  ┌─────────────────────────────────────────┐  │
│  │ ☕ ฟรีกาแฟ 1 แก้ว ที่ร้านพาร์ตเนอร์         │  │ ← qualitative, NO ฿
│  │ แลกได้หลังครบ 5 stamp                       │  │
│  │ ✅ รางวัลพร้อม (พร้อมแลก)                   │  │ ← escrow funded (neutral OK)
│  └─────────────────────────────────────────┘  │
└───────────────────────────────────────────────┘

── Seasonal/Collectible Detail (Sparks+badge variant) ──
┌───────────────────────────────────────────────┐
│ ← 🏮 Yi Peng Lantern Trail                     │
│  เยือน 3 จุดลอยกระทง → 🎖 badge + ✨300        │
│  ▓░░  0/3  ·  ⏳ หมดเขต 15 พ.ย. (อีก 4 วัน)   │ ← FOMO, no escrow card
├───────────────────────────────────────────────┤
│ ╔═ 🗺 stops ═════════════════════════════════╗ │
│ ║   ①◯ Three Kings  ②◯ Tha Phae  ③◯ Ping R. ║ │
│ ╚═══════════════════════════════════════════╝ │
│  🎁 REWARD: 🎖 Yi Peng Collector badge + ✨300  │ ← Sparks-only, ไม่มี Coin/escrow
│  (รางวัลสะสม ไม่ใช่ของแลกที่ร้าน — ไม่มี escrow) │
└───────────────────────────────────────────────┘
```
- **Components:** Passport tabs (Active / Collectible), per-quest card (stamp row visual, reward qualitative, next-stop), seasonal collectible w/ countdown, badge case → **Badge Detail**; Quest Detail = title, progress + deadline, **stops map (trail)**, ordered stamp list (done w/ date, next = actionable), **reward (qualitative, escrow-state indicator)**; **Seasonal/Collectible Detail = variant ไม่มี escrow card, reward = Sparks+badge**.
- **เป้าหมายผู้ใช้:** เห็นว่า "เก็บไปกี่ร้าน เหลือกี่ร้าน รางวัลคืออะไร แลกได้เมื่อไร" แล้วเดินไปเก็บต่อ.
- **สิ่งที่ต้องเกิด:** progress จาก `quest_progress.steps_completed`; reward จาก `quests.reward_coin_amount` แต่ **render เป็นชื่อของรางวัล ไม่ใช่จำนวนบาท**; "next stop" = nearest pending step; กดเช็คอินที่ next stop → Check-in flow.
- **Escrow-aware states (locked):**
  - *funded* → "✅ รางวัลพร้อม (พร้อมแลก)".
  - *paused_zero_balance* → reward card สีกลาง (ไม่แดง): **"⏸ รางวัลพักชั่วคราว — กำลังเติม"** + step ที่จะ mint Coins ไม่ได้ขึ้น "พักชั่วคราว" และ **disable การเก็บ stamp ที่ปิด quest** (ไม่ปล่อยให้ user เก็บแล้ว mint ไม่ได้) — แต่ check-in สะสม Sparks ยังทำได้. ไม่โทษผู้ใช้.
  - **Coin-expiry fairness (critique m):** ถ้า quest paused ใกล้ coin ที่ earn แล้วจะหมดอายุ → **auto-extend coin expiry = ระยะเวลา pause** (กัน "ถูกเร่งให้รีบแลกแต่ของพัก"). แสดง "⏸ พักชั่วคราว — วันหมดอายุถูกเลื่อนให้อัตโนมัติ".
- **Empty/recovery states:**
  - *no active quest* → "ยังไม่ได้เริ่ม quest — ลอง Nimman Cafe-Hop" + ปุ่มไป.
  - *guest* → ดู quest detail ได้เต็ม + **start ได้ (device-scoped persist)**; กด "เก็บแสตมป์" → auth.
  - ***guest quest-start recovery (critique M):*** ถ้า guest start quest แล้วปิดแอป/session หายก่อน first stamp → กลับมาเปิดเจอ banner เบา ๆ "คุณเริ่ม Nimman Cafe-Hop ไว้ — เก็บต่อได้เลย" (อ่านจาก device-scoped guest progress). ถ้า device storage หาย → quest กลับเป็น 0/5 พร้อม CTA เริ่มใหม่ (no error, no blame). เมื่อ first stamp → merge เข้า account (§2.7).
  - *no seasonal* → ซ่อน collectible card.
- **Offline:** render จาก local cache (progress, stops map pack ถ้าดาวน์โหลด "Quest pack").
- **i18n:** quest title + step name = curated 3-lang แสดง active-locale; วันหมดเขต = locale date (พ.ศ./ค.ศ.).
- **a11y:** stamp state มี icon(✓/◯)+สี+ข้อความ "เก็บแล้ว/ยังไม่เก็บ"; progress มี "3/5" text; reward เป็นข้อความ (ชื่อของรางวัล).

---

### 2.7 (f) Check-in Flow — Tiered Trust + Defer-Auth + First-Stamp Confirm

จุดนี้คือ **TTFS stop-clock** (first stamp). Trust tier: GPS-dwell (T1) < scan merchant QR (T2) < proven purchase (T3). **First stamp = activation = ต้อง server-confirm ก่อน celebration (critique M — ห้าม optimistic).**

```
①  GEOFENCE DETECT (จาก Place/Quest CTA)
┌───────────────────────────────────────────────┐
│ ← เช็คอินที่ Ristr8to                           │
│         📍 (radar/pulse animation)              │
│   ✅ คุณอยู่ในร้านแล้ว (in range)               │
│   เลือกวิธีเก็บแสตมป์:                           │
│   ┌─────────────────────────────────────────┐  │
│   │ 📡 อยู่ที่นี่สักครู่ (GPS)        +10✨    │  │ ← T1 gps_dwell
│   └─────────────────────────────────────────┘  │
│   ┌─────────────────────────────────────────┐  │
│   │ 📷 สแกน QR บนโต๊ะร้าน      +20✨ verified │  │ ← T2 scan merchant QR
│   └─────────────────────────────────────────┘  │
│   (T3 proven purchase = ผูกตอน redeem)          │
└───────────────────────────────────────────────┘
   │ ถ้าห่างเกิน geofence (มาจาก Place CTA distance-aware):
   └→ "ไปที่ร้านเพื่อเช็คอิน · 1.2km  [ นำทาง → ]" (เก็บไม่ได้ — กันกดมั่ว)

②  AUTH WALL — เฉพาะ FIRST STAMP ของ guest ⚠️
┌───────────────────────────────────────────────┐
│         เก็บแสตมป์แรกของคุณ! 🎉                  │
│   เข้าสู่ระบบเพื่อบันทึก progress (ไม่หาย)       │
│   ┌─────────────────────────────────────────┐  │
│   │  💚  เข้าสู่ระบบด้วย LINE                 │  │ ← persona-ordered (TH→LINE first)
│   └─────────────────────────────────────────┘  │
│   [  Apple  ] [ Google ] [ 微信 WeChat ]        │
│   progress ของ guest จะถูกผูกเข้าบัญชี ✓        │ ← merge promise
│                              [ ภายหลัง ]        │ ← can dismiss (lose nothing browsed)
└───────────────────────────────────────────────┘
   │ ถ้า guest progress ชนกับ account เดิม (provider มีบัญชีอยู่แล้ว):
   ▼
②b AUTH MERGE-CONFLICT (critique missing-screen)
┌───────────────────────────────────────────────┐
│        บัญชีนี้มี progress อยู่แล้ว              │
│   เราเจอบัญชี LINE นี้ที่เคยเล่นไว้              │
│   • progress ปัจจุบัน (guest): Cafe-Hop 3/5    │
│   • บัญชีเดิม: Cafe-Hop 1/5, Temple 2/4         │
│   เลือกวิธีรวม:                                  │
│   ┌─────────────────────────────────────────┐  │
│   │ รวมแบบเก็บความคืบหน้าที่ดีที่สุด (แนะนำ)   │  │ ← max-merge per quest
│   └─────────────────────────────────────────┘  │
│   [ ใช้บัญชีเดิม ] [ ใช้ของตอนนี้ ]             │ ← explicit choices, no silent loss
│   (Coins/รางวัลที่ earn แล้วไม่หาย — รวมทั้งหมด) │
└───────────────────────────────────────────────┘

③  FIRST-STAMP PROVISIONAL  ★ (ห้าม optimistic — critique M)
┌───────────────────────────────────────────────┐
│              ☕ … 📖                            │ ← ไม่มี confetti/haptic ตอนนี้
│         กำลังบันทึกแสตมป์ของคุณ…                 │ ← provisional, รอ server
│         (ยืนยันตำแหน่งกับเซิร์ฟเวอร์)            │
│              ⟳ (spinner)                        │
└───────────────────────────────────────────────┘
   │ server: geofence + anti-fraud PASS  →  ③✓
   │ server: FAIL → "ยังเช็คอินไม่สำเร็จ ลองอีกครั้ง" (ไม่เคย celebrate ก่อน confirm)

③✓ SUCCESS + STAMP-COLLECT ANIMATION (หลัง confirm เท่านั้น)
┌───────────────────────────────────────────────┐
│            ☕  ⟶  📖  (stamp drops in)          │ ← celebration หลัง server-confirm
│              ✨ +10 Sparks                      │
│        Step 4/5 · Nimman Cafe-Hop               │
│        เหลืออีก 1 ร้าน → ฟรีกาแฟ! 🎁            │ ← drive next
│   ┌─────────────────────────────────────────┐  │
│   │      ไปร้านสุดท้าย (Nimman Coffee) →      │  │
│   └─────────────────────────────────────────┘  │
│           [ ดู Passport ]                       │
└───────────────────────────────────────────────┘

③↻ QUEST-COMPLETE → COIN MINT loading (step สุดท้ายปิด quest)
┌───────────────────────────────────────────────┐
│            🎉 ครบ 5/5 แล้ว!                      │
│         กำลังออกรางวัลของคุณ…   ⟳                │ ← EARN→GRANT bridge in-flight
│   │ grant_coins FAIL (escrow drained ระหว่างนั้น):│
│   │  "รางวัลพักชั่วคราว — กำลังเติม เราจะออกให้   │ ← distinct จาก pre-block
│   │   อัตโนมัติเมื่อพร้อม" (Sparks เก็บแล้ว ไม่หาย)│
│   │ grant_coins OK → "☕ ได้กาแฟฟรี! ไปแลก →"    │
└───────────────────────────────────────────────┘
```
- **Components:** geofence radar, in-range confirm, **method picker (T1 GPS-dwell / T2 scan QR)**, QR scanner (camera), auth sheet (persona-ordered + merge promise + **merge-conflict path** + "ภายหลัง"), **first-stamp provisional state**, success screen w/ stamp-into-passport animation + Sparks + next-step nudge, **quest-complete mint loading + grant-fail fallback**.
- **เป้าหมายผู้ใช้:** เก็บแสตมป์ที่ร้านให้สำเร็จเร็วที่สุด → ลด TTFS.
- **สิ่งที่ต้องเกิด:** client เช็ค geofence(PostGIS)+dwell → ถ้า first-stamp ของ guest → AUTH → **merge guest progress เข้า account (max-merge, ห้ามเสีย Step แรก, conflict = ให้ผู้ใช้เลือก)** → **first stamp ต้องรอ server-confirm ก่อน celebrate** → server บันทึก check-in fact + mint Sparks + advance `quest_progress`; **ถ้า step สุดท้ายปิด quest → handoff → grant_coins (mint) พร้อม mint-loading state** (EARN→GRANT bridge); emit `checkin_attempted` → `auth_wall_shown{trigger:first_stamp}` → `auth_completed` → `first_stamp_succeeded` (★ activation, **หลัง server-confirm**) → `quest_step_completed` → (`quest_completed` → `coins_minted` ถ้าปิด quest).
- **Error/edge states:**
  - *out of geofence* → CTA = "ไปที่ร้าน · ระยะทาง" (กดเก็บไม่ได้).
  - *QR scan invalid/expired* → "รหัสหมดอายุ ลองสแกนใหม่".
  - *impossible-travel / device cap* (server) → "ไม่สามารถเช็คอินได้ตอนนี้" + ลิงก์ support (ไม่เปิดเผยกลไก anti-fraud).
  - *quest paused (escrow=0)* → check-in สะสม Sparks ได้ แต่ stamp ที่ปิด quest = "พักชั่วคราว" (§2.6).
  - *auth dismissed ("ภายหลัง")* → กลับ browse; stamp ยังไม่บันทึก (value-capture ต้อง identity).
  - *camera permission denied* → fallback ไป T1 GPS-dwell + ลิงก์ Settings.
- **Offline (critique M — first-stamp ข้อยกเว้น):**
  - *first stamp* → **ต้อง online** เพื่อ confirm ก่อน celebrate; ถ้า offline → "ต้องเชื่อมต่อเพื่อเก็บแสตมป์แรก" (กัน celebrate-แล้ว-rollback).
  - *stamp ถัด ๆ ไป (subsequent)* → **optimistic + queue**; sync เมื่อเน็ตกลับ; ถ้า fail ตอน sync → rollback อย่างสุภาพ + แจ้ง (low-stakes, ไม่ใช่ activation moment).
- **i18n:** auth buttons persona-ordered (TH→LINE, west→Apple/Google, FIT→WeChat/Apple — Google อาจใช้ไม่ได้บางเครื่อง CN); copy active-locale.
- **a11y:** success animation มี text equivalent + ไม่ flash/strobe (vestibular safe); reduce-motion → fade แทน drop; provisional spinner มี text "กำลังบันทึก…"; method buttons ≥48dp + label trust level เป็นข้อความ.

---

### 2.8 (g) Redeem Flow (customer side) — Merchant-Initiated

> **กฎเหล็ก:** ผู้ใช้ไม่เคยถือ static QR. ฝั่ง customer = แสดง progress → "ให้พนักงานสแกน" เท่านั้น. Burn เกิดที่ server หลังร้าน scan rotating QR/OTP. **Online-only** (ต้อง burn + escrow check real-time). **ไม่แสดงมูลค่าบาท** (critique C2).

```
①  REWARD READY (จาก Wallet/Quest)
┌───────────────────────────────────────────────┐
│ ← แลกรางวัล                                     │
│        🎉 คุณได้ฟรีกาแฟ 1 แก้ว!                 │
│        จาก Nimman Cafe-Hop (5/5 ✓)             │
│   ┌─────────────────────────────────────────┐  │
│   │ ☕ ฟรีกาแฟ 1 แก้ว                          │  │ ← qualitative, NO ฿
│   │ แลกได้ที่: ร้านพาร์ตเนอร์ (เลือกร้าน ▾)    │  │
│   │ หมดอายุ: 31 ก.ค. ⏳                        │  │
│   └─────────────────────────────────────────┘  │
│   ┌─────────────────────────────────────────┐  │
│   │           พร้อมแลกตอนนี้ →                 │  │ ← ต้องอยู่ที่ร้าน
│   └─────────────────────────────────────────┘  │
└───────────────────────────────────────────────┘

①b READY-BUT-PAUSED (escrow paused ตอนกดแลก — critique missing-screen)
┌───────────────────────────────────────────────┐
│        ⏸ รางวัลนี้พักชั่วคราว                   │ ← neutral, ไม่แดง, ไม่โทษ
│   ร้านกำลังเติมทุนรางวัล แลกได้เร็ว ๆ นี้        │
│   วันหมดอายุถูกเลื่อนให้อัตโนมัติระหว่างพัก ✓     │ ← auto-extend (fairness m)
│   [ แจ้งเตือนเมื่อพร้อม ]   [ กลับ ]            │ ← blame-free recovery
│   (platform ไม่สำรองจ่าย — รางวัลของคุณไม่หาย)   │
└───────────────────────────────────────────────┘

②  AT-COUNTER — show to staff (merchant scans)
┌───────────────────────────────────────────────┐
│        ให้พนักงานสแกนหน้าจอนี้                  │
│   ╔═══════════════════════════════════════╗   │
│   ║   ▟▙▟▙ ROTATING QR ▟▙▟▙                ║   │ ← rotating, TTL ~60-90s
│   ║   ▙▟▙▟  (หมุนทุกไม่กี่วินาที)            ║   │
│   ╚═══════════════════════════════════════╝   │
│        หรือบอกรหัส OTP:  4 8 2 9               │ ← merchant-eyeball fallback
│        ⏳ รหัสหมดใน 0:47   [ รีเฟรช ]          │
│        ☕ ฟรีกาแฟ 1 แก้ว · ที่ Ristr8to         │ ← qualitative, no ฿
│        ✅ คุณอยู่ในร้าน                         │ ← indoor-generous geofence
└───────────────────────────────────────────────┘
         │ ②b customer in-flight (critique M — money-action loading):
         ▼
②c VERIFYING (หลังร้านสแกน, ก่อน success)
┌───────────────────────────────────────────────┐
│           กำลังตรวจที่เคาน์เตอร์…   ⟳            │ ← rotating code ยัง valid
│           อย่าเพิ่งปิดหน้าจอ                     │ ← ปุ่มแลก lock (idempotent)
└───────────────────────────────────────────────┘
         │ server: geofence(indoor-generous) + time-box + escrow>0 → BURN (double-entry)
         ▼
③  SUCCESS RECEIPT
┌───────────────────────────────────────────────┐
│                 ✅                              │
│         แลกสำเร็จ! ☕ ฟรีกาแฟ 1 แก้ว            │
│         ที่ Ristr8to · 14:32 น.                 │
│   ─────────────────────────────────────────    │
│   🪙 -1 reward  ·  คงเหลือ 🪙 1                 │ ← coin จำนวน (ไม่มี ฿)
│   ใบเสร็จ #RDM-8821 (fact, PDPA)               │
│   ✍️ ตอนนี้คุณรีวิวร้านนี้ได้ (Visited ✓)       │ ← unlock verified review → §2.13
│           [ เสร็จ ]   [ เขียนรีวิว ]            │
└───────────────────────────────────────────────┘
```
- **Components:** reward-ready card (reward qualitative + venue picker + expiry), **ready-but-paused block**, **at-counter screen (rotating QR + OTP fallback + TTL countdown + indoor-generous geofence confirm)**, **verifying/in-flight state**, success receipt (burned amount as count + balance + receipt id + review-unlock).
- **เป้าหมายผู้ใช้:** แลกของจริงที่เคาน์เตอร์ได้ใน < 5 วินาที (จับคู่กับ Counter PWA ฝั่งร้าน).
- **สิ่งที่ต้องเกิด:** กด "พร้อมแลก" → client ยืนยัน geofence (**indoor-generous radius**) → server ออก `redemptions.qr_nonce` + `valid_until` → ผู้ใช้โชว์ → ร้าน scan/ใส่ OTP → **verifying state** → server ตรวจ geofence+time-box+`escrow>0` → **BURN coin (double-entry, FIFO coin_lots)** + หัก escrow + ลง clearing + take-rate → success; emit `redeem_attempted` → `redeem_succeeded{reward, coins_burned}`.
- **Geofence false-block fix (critique M):** redeem-time geofence ใช้ **รัศมีในร่ม (indoor) ใจกว้าง** + **แยก "GPS อ่อน/ไม่มีสัญญาณ" ออกจาก "อยู่ไกลจริง"** — สัญญาณอ่อนไม่อ่านเป็น fraud; ฝั่ง gate ที่เชื่อถือได้คือ **merchant device** (เคาน์เตอร์อยู่กับที่/ยืนยันได้) ไม่ใช่ GPS ลูกค้าที่ drift. ลูกค้าที่ยืนหน้าเคาน์เตอร์ห้ามโดน hard red-reject (staff override → async review อยู่ฝั่ง Counter §3.2.g — ไม่ใช่ consumer surface นี้).
- **Error/edge states (locked):**
  - *escrow=0 / quest paused (ตอนกดแลก)* → ①b ready-but-paused (neutral, auto-extend expiry).
  - *out of geofence (ไกลจริง ไม่ใช่สัญญาณอ่อน)* → "ต้องอยู่ที่ร้านเพื่อแลก".
  - *QR/OTP expired before scan* → "รหัสหมดอายุ" + [รีเฟรช] (ออก nonce ใหม่).
  - *coin expired* → "รางวัลนี้หมดอายุแล้ว" (สอดคล้อง expiry timeline ใน Wallet; แต่ดู auto-extend §2.6/§2.9).
  - *double-tap/refresh race* → server idempotent (1 nonce burn ครั้งเดียว); UI lock ปุ่มหลังกด (verifying state).
  - **OFFLINE** → block: "ต้องเชื่อมต่ออินเทอร์เน็ตเพื่อแลก" (online-only by design).
- **i18n:** "ให้พนักงานสแกน / Show to staff / 给店员扫描" active-locale; OTP เป็นตัวเลข (อ่านง่ายข้ามภาษา); expiry date locale-aware.
- **a11y:** OTP เป็น text ขนาดใหญ่ (merchant-eyeball + low-vision); QR มี OTP fallback เสมอ; countdown มี text + audio cue option; verifying มี text; success มี haptic + text.

---

### 2.9 (h) Wallet — Sparks vs Coins (NO Withdraw, NO ฿, guest-explainer)

> **กฎเหล็ก:** Sparks ✨ และ Coins 🪙 แยกชัด **ทุก visual + wording**. **ไม่มีปุ่มถอน/โอน/cash-out ที่ใดเลย** · **ไม่แสดงมูลค่าบาทคู่ Coins** (e-money boundary). Wallet = render projection จาก ledger (`coin_lots` + `spark_balances`). **guest เปิดได้เป็น read-only explainer (ไม่มี auth-wall ทันที — critique M).**

```
── Wallet (tab) · GUEST = read-only explainer ──
┌───────────────────────────────────────────────┐
│ 💰 Wallet                                       │
│  ✨ Sparks = แต้มเล่นเกม (XP) สำหรับ tier/badge  │ ← อธิบาย, ไม่มี auth modal
│  🪙 Coins = เหรียญแลกของจริงที่ร้าน              │
│  เก็บแสตมป์แรกของคุณ แล้วยอดจะเริ่มสะสมที่นี่     │
│   ┌─────────────────────────────────────────┐  │
│   │      เริ่มเก็บแสตมป์ (ไป Passport) →       │  │ ← ลิงก์ value-capture จริง
│   └─────────────────────────────────────────┘  │
│   (auth จะถามตอนเก็บแสตมป์แรกเท่านั้น)            │
└───────────────────────────────────────────────┘

── Wallet (tab) · AUTH ─────────────────────────
┌───────────────────────────────────────────────┐
│ 💰 Wallet                                       │
│ ╔══ ✨ SPARKS ════════════════════════════════╗│
│ ║  ✨ 1,240                                     ║│
│ ║  แต้มสะสม / XP — สำหรับ tier & badge          ║│
│ ║  ⛔ แลกเป็นเงินไม่ได้ (ไม่มีวัน)               ║│ ← explicit non-redeemable
│ ║  Tier: 🥈 Silver  ▓▓▓▓░░ อีก 260 → Gold      ║│
│ ╚══════════════════════════════════════════════╝│
│ ╔══ 🪙 COINS (metallic gold #C8881C) ══════════╗│ ← hue แยกจาก brand-amber (C3)
│ ║  🪙 2                                          ║│ ← ตัวเลขสี ink (#221B12) contrast (m)
│ ║  เหรียญแลกของจริงที่ร้านพาร์ตเนอร์             ║│ ← NO ฿ anywhere
│ ║  ┌─ ⏳ จะหมดอายุ ────────────────────────┐    ║│ ← EXPIRY TIMELINE
│ ║  │ ⚠ ☕ฟรีกาแฟ · 31 ก.ค. (อีก 7 วัน)       │    ║│ ← near-expiry = DANGER + ⚠
│ ║  │   🥐ฟรีขนม · 30 ก.ย.                     │    ║│   (ไม่ใช่ amber-on-gold)
│ ║  └────────────────────────────────────────┘    ║│
│ ║  ┌──────────────────────────────────────┐     ║│
│ ║  │         แลกของ / Redeem →             │     ║│ ← → Redeem flow §2.8
│ ║  └──────────────────────────────────────┘     ║│
│ ║  (ไม่มีปุ่มถอน/โอน — Coins ไม่ใช่เงิน)          ║│ ← explicit NO withdraw
│ ╚══════════════════════════════════════════════╝│
│  🎖 Badges:  🥇 🏮 ☕×5 …    [ ดูทั้งหมด → ]     │ → Badge Detail (§2.6)
│  ── ประวัติการแลก (fact) ─────────────────────  │
│  ✅ ฟรีกาแฟ · Ristr8to · 14 มิ.ย.               │
└───────────────────────────────────────────────┘
```
- **Components:** **guest read-only explainer** (Sparks/Coins อธิบาย + ลิงก์ Passport, ไม่มี auth modal); **Sparks card** (balance, "XP — ไม่แลกเป็นเงิน", tier + next-tier progress); **Coins card** (balance เป็นจำนวน, "แลกของจริงที่ร้าน", **expiry timeline per-lot soonest-first**, near-expiry = **danger + ⚠**, **Redeem CTA**, explicit "no withdraw"); badge case → Badge Detail; redemption history (fact only).
- **เป้าหมายผู้ใช้:** เข้าใจ "ฉันมีแต้มเล่นเกม (Sparks) กับเหรียญแลกของจริง (Coins) ที่บางอันใกล้หมดอายุ" → กระตุ้น redeem ก่อนหมดอายุ — **โดยไม่เกิดภาพ "ฉันถือเงิน X บาท"**.
- **สิ่งที่ต้องเกิด:** Sparks จาก `spark_balances`; Coins balance/expiry จาก **`coin_lots`** (`remaining_minor`, `expires_at`, `state='active'`) — **ห้าม render จาก `ledger_entries`** (ปิด client); **render เป็น "ของที่แลกได้" (ชื่อรางวัล) ไม่ใช่จำนวนบาท**; tier derive จาก Sparks; expiry per-lot เรียง soonest-first + เน้น lot ใกล้หมด (T-14/T-3 nudge); Redeem → §2.8.
- **Coin-expiry fairness (critique m):** expiry แจ้งตั้งแต่ตอน grant (coin-mint animation pairs expiry text); ถ้า escrow paused ใกล้หมดอายุ → **auto-extend = ระยะ pause** (เลื่อนให้เอง, แสดงใน timeline); recovery path blame-free.
- **States:**
  - *guest เปิดแท็บ* → **read-only explainer (ไม่ใช่ auth modal)**.
  - *0 Coins (auth)* → "ยังไม่มีเหรียญ — เล่น quest เพื่อรับ" + ลิงก์ Passport.
  - *0 Sparks (เพิ่งสมัคร)* → "เช็คอินครั้งแรกเพื่อรับ Sparks".
  - *coin near expiry* → lot ใช้ **danger treatment + ⚠** + "ใกล้หมดอายุ — แลกเลย" (ไม่ใช่ amber-on-gold).
- **Offline:** render last-cached balances + banner "ยอดล่าสุดเมื่อ X — เชื่อมต่อเพื่ออัปเดต"; Redeem disabled (online-only).
- **i18n:** "แต้มสะสม/XP" vs "เหรียญแลกของ" wording ต่อ locale (canonical naming); วันหมดอายุ locale date; ตัวเลขท้องถิ่น.
- **a11y:** Sparks/Coins แยกด้วย icon+heading+border ไม่พึ่งสีอย่างเดียว; **Coin numeral ใช้ ink (#221B12) clear 4.5:1**, gold สงวนเฉพาะ 🪙 icon/accent (ไม่ render gold-on-white เป็น text); near-expiry มี ⚠ + text "ใกล้หมดอายุ" + danger color (ไม่พึ่งสีเดียว); "ไม่แลกเป็นเงิน" / "ไม่มีปุ่มถอน" เป็นข้อความชัด (a11y + compliance).

> **Token note (critique C3 — แก้ amber overload):** Coin = **metallic gold #C8881C** (deeper, distinct hue family) **แยกจาก brand-amber #E8852C** (CTA/active-nav/aging-freshness/--warning). **ห้าม render --warning amber ใน Coins card** — near-expiry ใช้ danger (red family) + ⚠ icon. Coin numeral = ink #221B12 (data ต้อง clear 4.5:1 ไม่ว่าขนาด).

---

### 2.10 (i) Profile + Language + PDPA + DSAR

```
┌───────────────────────────────────────────────┐
│ 👤 Profile                                      │
│  ┌──┐  Mia · 🥈 Silver · ✨1,240               │
│  │🙂│  เข้าระบบด้วย Apple                       │
│  └──┘  [ guest? → เข้าสู่ระบบ ]                 │
├───────────────────────────────────────────────┤
│ 🌐 ภาษา / Language / 语言                        │
│    ( ◯ ไทย   ◉ English   ◯ 简体中文 )           │ ← override device (endonym card)
├───────────────────────────────────────────────┤
│ 🧭 โหมด: ( ◉ Tourist Trail  ◯ Local Streaks )  │ ← persona toggle (ปรับได้ทุกเมื่อ)
├───────────────────────────────────────────────┤
│ 🔗 บัญชีที่เชื่อม:  LINE ✓  Apple ✓  +เพิ่ม     │
│ 💳 วิธีจ่าย: PromptPay · Alipay · WeChat        │
│ 📕 (FIT) นำเข้ารายการ RED/小红书  →             │ ← Chinese-FIT import (§2.14)
├───────────────────────────────────────────────┤
│ 🔒 PDPA / ความเป็นส่วนตัว                        │
│    ▸ ตำแหน่ง (เฉพาะตอนเช็คอิน/แลก)  ( ●— on )  │ ← copy ตรงกับ S1 priming (M)
│    ▸ แจ้งเตือน/การตลาด          ( —● off )      │ ← marketing consent แยก
│    ▸ ขอข้อมูลของฉัน (DSAR)                      │ → DSAR confirm
│    ▸ ลบบัญชี                                    │ → Delete confirm
├───────────────────────────────────────────────┤
│ 🧰 Field Agent MODE  (ถ้าได้รับสิทธิ์)  →       │ ← role-gated entry
│ ─────────────────────────────────────────────  │
│ ช่วยเหลือ · เงื่อนไข · ออกจากระบบ               │
└───────────────────────────────────────────────┘

── DSAR / Delete confirm (critique missing-screen) ──
┌───────────────────────────────────────────────┐
│ ← ลบบัญชี                                       │
│   การลบบัญชีจะลบ progress, badges, Coins ที่    │
│   ยังไม่ได้แลก (Coins ที่ลบแล้วกู้คืนไม่ได้).      │
│   ┌─ ⚠ ตรวจพบภาระค้าง ─────────────────────┐  │ ← open-obligations block
│   │ คุณมี Coins ใกล้หมดอายุ 1 รายการ และ      │  │
│   │ รางวัลรอแลก — แลก/จัดการก่อนจึงจะลบได้     │  │
│   └─────────────────────────────────────────┘  │
│   พิมพ์ "ลบบัญชี" เพื่อยืนยัน:  [__________]     │ ← typed confirm step
│   [ ยกเลิก ]                 [ ลบถาวร ]         │ ← destructive, disabled จน confirm
└───────────────────────────────────────────────┘
```
- **Components:** identity header, **language switch (TH/EN/简体中文 override device)**, **persona toggle**, linked logins + payment methods, **(FIT) RED-list import entry**, **PDPA center** (location/marketing consent แยก lawful basis — **wording ตรงกับ S1 priming**, DSAR, delete), **delete/DSAR confirm w/ open-obligations block + typed confirm**, **Field-Agent MODE (role-gated)**, support/terms/logout.
- **เป้าหมายผู้ใช้:** ควบคุมภาษา/persona/ความเป็นส่วนตัว และ (ถ้าเป็น agent) เข้าโหมดทำงาน.
- **สิ่งที่ต้องเกิด:** language = rebuild MaterialApp locale ทันที (hot, ไม่ restart); persona toggle = ปรับ ranking/tone (เขียน `audience_segment`); consent toggles = versioned write `consents` (append-only) ต่อ purpose; **delete = DSAR gate (ตรวจ open obligations: unredeemed Coins / pending redemption ก่อน), typed-confirm กันพลาด**; DSAR export = "ขอข้อมูลของฉัน".
- **Consent-copy alignment (critique M):** ข้อความ consent ตำแหน่งใน PDPA center = **identical กับ S1 priming** ("ใช้ตำแหน่งเฉพาะตอนเช็คอิน/แลก และไม่สร้างแผนที่การเดินทางต่อเนื่อง") — priming promise = consent record.
- **States:**
  - *guest* → header แสดง CTA login; language/persona ทำได้ (local); PDPA/DSAR/agent ซ่อนหรือ disabled.
  - *no agent role* → ซ่อน Field Agent MODE.
  - *marketing off* → ไม่ส่ง geo-push (push primer ไม่ขึ้น).
  - *delete w/ open obligations* → block + ชี้ให้แลก/จัดการก่อน (ไม่ปล่อยให้ลบทั้งที่มีของค้าง).
- **Offline:** toggles คิวไว้ sync; "เชื่อมต่อเพื่อบันทึก" สำหรับ DSAR/delete.
- **i18n:** เปลี่ยนภาษาแล้วทั้งแอป re-render; fallback chain zh→en→th; segmented control 3 ภาษาแสดง endonym.
- **a11y:** toggles มี on/off label เป็นข้อความ; persona/language radio group announced state; delete มี typed-confirm step (กันพลาด) + ปุ่ม destructive disabled จน confirm.

---

### 2.11 Cross-Cutting: Empty / Error / Offline + TTFS Instrumentation

**Offline matrix (ฝั่ง consumer):**

| ความสามารถ | Offline behavior |
|---|---|
| Map + nearby ที่เพิ่งโหลด | cache tiles + Places · แสดงได้ + banner |
| Place detail ที่เคยเปิด | cached · ดูซ้ำได้ |
| Passport / Quest progress | render จาก local cache |
| **First stamp (activation)** | ❌ **online-only** — ต้อง server-confirm ก่อน celebrate (กัน rollback) |
| **Check-in (stamp ถัด ๆ ไป)** | optimistic + **queue** → sync; fail ตอน sync → rollback สุภาพ |
| **Redemption** | ❌ online-only — "ต้องเชื่อมต่อเพื่อแลก" |
| รูป/รีวิว | queue ส่งภายหลัง (review → pending-moderation เมื่อ sync) |
| Quest pack (offline) | ดาวน์โหลด trail+steps ล่วงหน้า (Old City Temple Trail / Cafe-Hop) |

**Empty-state เจตนา (กัน "แผนที่ว่าง" = ตัวฆ่าแอป local):** ทุก list rail มี fallback ที่ดึงไปย่าน dense (Nimman) แทนการโชว์ว่าง — สอดคล้อง Density Gate. **never-verified places ถูก down-rank ใน AHA** เพื่อให้ first impression เป็น "verified by people here" จริง.

**Error principle:** anti-fraud server-side **ไม่เปิดเผยกลไก** ฝั่ง user (impossible-travel/device-cap → "ไม่สามารถเช็คอินได้ตอนนี้" + support link). Escrow=0 = "พักชั่วคราว" (neutral, ไม่โทษผู้ใช้, ไม่แดง). **First stamp ไม่ celebrate ก่อน server-confirm** (ห้าม celebrate-แล้ว-revoke).

**TTFS funnel (analytics taxonomy — instrument ทุกหน้าใน section นี้):**
```
app_open(first) → home_loaded{nearby_count, ms_to_first_place}   ← ★ AHA = real pixels, budget 60s
 → [location_permission_result{precise|approx|denied}]            (non-blocking, contextual)
 → quest_started(guest, device-scoped) → place_detail_viewed{freshness_state}
 → checkin_attempted{trust_tier}
 → auth_wall_shown{trigger:first_stamp} → auth_completed{provider,persona}
 → [merge / merge_conflict_resolved]
 ► first_stamp_succeeded   ← ★ TTFS stop-clock (activation, AFTER server-confirm)
 → quest_step_completed → quest_completed → coins_minted
 → redeem_attempted → redeem_succeeded{reward, coins_burned}
```
- **AHA redefined:** วัด `ms_to_first_place` ต่อ **60s budget** = เวลาเห็น "pixels ของ nearby content จริง" (ไม่ใช่ route เข้า S3). permission/persona = non-blocking หลัง AHA.
- **Activation** = `first_stamp_succeeded` (**หลัง server-confirm**) ใน session แรก (หรือ ≤24 ชม.). Dashboard แยกตาม **persona × ภาษา × geo-cluster** (Nimman / Old City / Santitham / CMU). Funnel หลัก daily: `app_open → home_loaded → checkin_attempted → first_stamp_succeeded`.

**a11y baseline (ทั้ง app):** tap target ≥48dp · ไม่พึ่งสีอย่างเดียวสื่อ state (icon+text เสมอ — สำคัญกับ freshness 4-state/expiry/paused) · reduce-motion → fade แทน animation drop · dynamic type scaling (headline active-locale บรรทัดเดียว กัน overflow) · semantic labels บน map pins + balances · trilingual screen-reader strings จาก i18n catalog เดียวกับ UI · **Coin numeral = ink, currency data clear 4.5:1**.

---

### 2.12 Push Opt-In Primer (consent-gated overlay)

> **Trigger:** หลัง **first stamp success** (หรือ first streak) — ช่วงที่ผู้ใช้เพิ่งได้คุณค่า จึงเต็มใจรับ nudge. consent-gated; deny → ไม่ส่ง geo-push (สอดคล้อง §2.10 marketing toggle).

```
─ overlay (เหนือ success screen, persona-toned) ─
┌───────────────────────────────────────────────┐
│              🔔 (illustration)                  │
│   อยากให้เราเตือนตอนใกล้จบ quest /              │ ← persona tone (tourist/local/FIT)
│   มีโปรสดใกล้คุณไหม?                             │
│   • ร้านถัดไปของ quest อยู่ใกล้                  │
│   • โปร/รางวัลใกล้หมดเวลา                        │
│   ┌─────────────────────────────────────────┐  │
│   │            เปิดแจ้งเตือน                   │  │ ← allow → OS push dialog
│   └─────────────────────────────────────────┘  │
│              [ ไม่เป็นไร ]                       │ ← not-now (no dead-end)
└───────────────────────────────────────────────┘
```
- **Components:** persona-toned rationale, 2-bullet value, allow (→ OS push dialog), not-now.
- **สิ่งที่ต้องเกิด:** allow → request OS push permission → consent write (`consents`, purpose=marketing/push); deny/not-now → ไม่ส่ง geo-push; emit `push_primer_shown{trigger}` → `push_primer_result{allow|deny}`.
- **States:** *marketing toggle off ใน Profile* → primer ไม่ขึ้นเลย; *not-now* → re-ask ได้ภายหลังที่ contextual moment (ไม่สแปม).
- **i18n/a11y:** active-locale; allow/not-now ≥48dp; rationale อ่านได้ screen reader.

---

### 2.13 Review Composer + Report (verified-visitor UGC)

> เข้าจาก Place Detail (§2.5) หรือ Redeem success (§2.8). **เขียนได้เฉพาะคนมี check-in/redemption fact ที่ร้านนั้น** (verified-visitor). ทุกรีวิวเข้า **content moderation** ก่อน publish.

```
── Review Composer ────────────────────────────
┌───────────────────────────────────────────────┐
│ ← เขียนรีวิว · Ristr8to            Visited ✓    │ ← verified-visitor badge
│   ให้คะแนน:  ★ ★ ★ ★ ☆                         │ ← star input (required)
│   ┌─────────────────────────────────────────┐  │
│   │ เล่าประสบการณ์ของคุณ…                      │  │ ← text (ภาษาที่พิมพ์ = original)
│   └─────────────────────────────────────────┘  │
│   📷 แนบรูป (ไม่บังคับ)  [ + เพิ่มรูป ]          │ ← photo (EXIF/pHash reuse anti-fraud)
│   เขียนเป็นภาษา: ( ◉ ไทย ◯ EN ◯ 中文 )          │ ← original-language tag
│   ┌─────────────────────────────────────────┐  │
│   │                ส่งรีวิว                    │  │
│   └─────────────────────────────────────────┘  │
└───────────────────────────────────────────────┘

── states ──
submitted → "ส่งแล้ว · รอตรวจสอบ" (pending-moderation, ยังไม่ขึ้นสาธารณะ)
published → ขึ้นในรายการรีวิว (Visited ✓ · translated on-demand)
rejected  → "รีวิวไม่ผ่านการตรวจสอบ" + เหตุผลย่อ + แก้/ส่งใหม่ได้

── Report this review (จาก review list) ────────
┌───────────────────────────────────────────────┐
│ รายงานรีวิวนี้:                                  │
│  ◯ สแปม/โฆษณา  ◯ ไม่เหมาะสม  ◯ ไม่ตรงร้าน      │
│  ◯ อื่น ๆ [____]        [ ส่งรายงาน ]           │ → moderation queue (§5/admin)
└───────────────────────────────────────────────┘
```
- **Components:** star input (required), text field (original-language note), photo attach (anti-fraud EXIF/pHash reuse), original-language tag, submit; states submitted/published/rejected; **report-review affordance** บน review list.
- **สิ่งที่ต้องเกิด:** submit → INSERT review + `linked_check_in_id` → enter content moderation → publish/reject; rating ถ่วงด้วย `trust_weight` (จาก check-in trust tier); report → support/moderation queue (เจ้าของ = admin section, ไม่ใช่ consumer).
- **States:** *guest/ไม่มี visit fact* → ไม่เห็นปุ่มเขียน (เห็นแต่ "ไปเช็คอินเป็นคนแรก"); *offline* → queue ส่งเมื่อ sync → pending-moderation.
- **i18n:** เขียนภาษาใดก็ได้ + tag original; แสดงผลกับคนอื่น = auto-translate on-demand + "translated" + ดู original.
- **a11y:** star input keyboard/switch-accessible + text label "4 จาก 5 ดาว"; photo attach มี label; report options radio + label.

---

### 2.14 Chinese-FIT — RED/小红书 List Import

> เข้าจาก Profile (§2.10, FIT only/contextual). ลูกค้าจีน FIT มักมาพร้อม "list ร้านที่เซฟจาก 小红书" — ให้ paste/import แล้ว fuzzy-match กับ Places ในระบบ → ลด TTFS ของ segment นี้.

```
┌───────────────────────────────────────────────┐
│ ← 导入我的清单 / นำเข้ารายการของฉัน              │
│   วางลิงก์/ข้อความจาก 小红书 หรือพิมพ์ชื่อร้าน:  │
│   ┌─────────────────────────────────────────┐  │
│   │ (paste here…)                            │  │ ← paste RED text/links
│   └─────────────────────────────────────────┘  │
│        [ จับคู่กับร้านในระบบ / Match ]          │
├───────────────────────────────────────────────┤
│  ผลการจับคู่ (fuzzy):                            │
│  ✅ Ristr8to ←→ "锐特八度咖啡"   [ ดูร้าน ]      │ ← matched
│  ✅ Graph Cafe ←→ "Graph咖啡"   [ ดูร้าน ]       │
│  ❓ "宁曼某甜品店"  ไม่พบในระบบ  [ ข้าม ]         │ ← no-match (graceful)
│        [ บันทึกที่จับคู่ได้ → Saved ]           │
└───────────────────────────────────────────────┘
```
- **Components:** paste field (RED text/links), match button, fuzzy-match result list (matched → place link / no-match → skip), save-matched.
- **สิ่งที่ต้องเกิด:** paste → server fuzzy-match (name alias/transliteration/pinyin/pHash) → คืน matched Places; matched บันทึกเป็น "saved" (auth-gated เหมือน save); no-match = แสดงเฉย ๆ ไม่ error.
- **States:** *0 match* → "ยังไม่พบร้านในรายการนี้ — ลองค้นทีละร้าน" + ลิงก์ Discover; *guest* → save = auth (value-capture).
- **i18n:** UI active-locale (มักเป็น zh สำหรับ segment นี้); match แสดงทั้งชื่อระบบ + ชื่อจาก RED.
- **a11y:** result list อ่านลำดับ matched-name → status; skip/save ≥48dp.

---

## 3. Merchant Web + Counter PWA — Wireframes

> **ขอบเขต:** ฝั่งร้านค้าทั้งหมด — สองพื้นผิว (surface) ที่ต้องแยกขาดกันชัด ๆ:
> - **WEB (Next.js + Refine, desktop-first):** งาน admin-heavy ที่ทำบนจอใหญ่/คีย์บอร์ด — signup/claim/verify, escrow, quest, deals, analytics, billing, settings, payout. RBAC + RLS scope ด้วย `merchant_id` + `city_id` ทุก query.
> - **COUNTER PWA (mobile-first, no-install):** จุดเดียวที่อยู่ "หน้าเคาน์เตอร์" — staff สแกน/อ่านโค้ดเพื่อ **REDEEM (burn Coins)** ใน <5 วินาที. เปิดจาก LINE PWA / browser bookmark ไม่ต้องลง app.
>
> **กฎทอง 2 ข้อที่ครอบทั้ง section (จาก founder anti-fraud):**
> 1. **เงินเข้าได้ก่อนเงินออกเสมอ** — top-up escrow ทำได้ที่ `IDENTITY_VERIFIED`; แต่ **ออก redemption + รับ payout** บังคับ `FINANCE_VERIFIED` (human finance review เสมอ ไม่ว่ามาทางไหน). อ้าง capability matrix §7.1.1.
> 2. **REDEEM ต้อง merchant-initiated · time-boxed · rotating · geofenced · server-burned.** ห้าม static customer QR ที่ trigger การ burn เด็ดขาด. ทิศ EARN = ลูกค้าสแกน table-tent ของร้าน; ทิศ REDEEM = staff สแกน/อ่านโค้ดของลูกค้า.

> **i18n หมายเหตุรวม:** Dashboard รองรับ TH / EN / 简体 (toggle ที่ header, default ตาม browser locale). **ป้าย UI ในไวร์เฟรมแสดงเฉพาะภาษาที่ active (locale-active, ไม่ stack 3 บรรทัด)** — ในเอกสารนี้เขียนหลายภาษาเพื่อสื่อความ แต่ runtime แสดงภาษาเดียว; ที่เดียวที่โชว์หลายภาษาพร้อมกันคือ language-picker เอง. ตัวเลขเงินทุกจุดแสดงสกุล **฿ (THB)** สำหรับ escrow/payout และ **COIN** สำหรับยอด Coin — **ห้ามปนกันในช่องเดียว** (single-currency-per-field, สอดคล้อง ledger A2.1). **ห้ามใช้คำว่า "ถอนเงิน/cash-out/withdraw" กับ Coin เด็ดขาด** — Coin = หนี้รางวัล redeemable เท่านั้น.

> **กฎ "฿ คู่ Coin" — merchant-only (จาก critique critical#2):** การแสดงมูลค่า ฿ ข้าง ๆ จำนวนรางวัล/COGS/escrow **อนุญาตเฉพาะหน้าจอ merchant** (เพราะร้านต้องคุมต้นทุนจริง) — **ห้าม mirror ตรรกะ "Coin = ฿X" นี้ไปฝั่ง consumer เด็ดขาด** (กัน mental model แบบ stored-value/e-money). Counter PWA ที่ staff/ลูกค้าเห็นร่วมกัน **ไม่โชว์ ฿ ของ Coin/take-rate** — โชว์แค่ "รางวัลอะไร + สำเร็จ/ไม่".

> **กฎสี (จาก critique critical#3, merchant-relevant):** ฝั่ง merchant ใช้ ฿ THB ไม่ใช้ Coin-gold pill จึงเลี่ยง amber overloading ของ consumer ได้ส่วนใหญ่ — แต่ **state เตือน (low-balance/aging/near-cap) ต้องคู่ ⚠ icon + ข้อความเสมอ ไม่พึ่งสี amber อย่างเดียว**, และ Counter result ใช้ "เขียว/แดง/อำพัน" ที่แยกด้วย **รูปทรง + ไอคอน + เสียง + haptic** ไม่พึ่ง hue ล้วน.

---

### 3.0 Navigation & RBAC overview (เมนูหลัก + สิทธิ์ตาม role/trust-state)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  [LOGO]  ร้านกาแฟ Ristr8to ▾        🔔 3   TH/EN/简体 ▾    👤 owner@.. ▾        │ ← topbar
├────────────────┬─────────────────────────────────────────────────────────────┤
│ ⌂ Home         │   <CONTENT AREA — เปลี่ยนตามเมนู (a)–(j)>                     │
│ 📍 Places      │                                                              │
│ 🏷 Deals       │   เมนูที่ "ล็อก" จะมี 🔒 + tooltip:                          │
│ 🎯 Quests      │     "ต้องยืนยันการเงินก่อน / Finance-verify required"        │
│ 💰 Escrow      │                                                              │
│ 🎟 Redemptions │   Banner สถานะ trust อยู่บนสุดของทุกหน้า (ดู 3.1.b)          │
│ 📊 Analytics   │                                                              │
│ 🧾 Billing     │                                                              │
│ ⚙ Settings     │   (Settings ครอบ: โปรไฟล์ร้าน · staff sub-accounts ·         │
│ 🏦 Payout      │    payout-bank · ภาษา · re-verify) — ดู 3.1.h/3.1.i          │
│ ───────────    │                                                              │
│ 📲 เปิด Counter │  ← ปุ่มเด่น: เปิด Counter PWA (mobile) / โชว์ QR ให้ยิงมือถือ│
└────────────────┴─────────────────────────────────────────────────────────────┘
```

**Capability ตาม trust-state (gating ที่ UI ต้องบังคับ — sync กับ capability matrix §7.1.1):**

| เมนู / action | CLAIMED_UNVERIFIED | IDENTITY_VERIFIED | FINANCE_VERIFIED | PAYOUT_FROZEN |
|---|:---:|:---:|:---:|:---:|
| Home · Places (draft) · Settings · เห็น analytics ตัวเอง | ✅ | ✅ | ✅ | ✅ |
| Content ขึ้น live · Deals · Quests · Escrow top-up | 🔒 | ✅ | ✅ | ✅ |
| **ออก Redemption (Counter PWA)** | 🔒 | 🔒 | ✅ | ✅ |
| ตั้ง/เปลี่ยน payout bank | 🔒 | 🔒 | ✅ | 🔒 re-verify |
| **รับ payout settlement (เงินออก)** | 🔒 | 🔒 | ✅ | ❌ ค้าง clearing |

> **หมายเหตุ PAYOUT_FROZEN (sync §7.1.1):** ลูกค้ายัง redeem ได้ปกติ (ไม่ลงโทษลูกค้าจากปัญหาฝั่งร้าน) — Coin ที่ลูกค้า burn ค้างใน Clearing Account รอ payout ตอน unfreeze (double-entry: เงินไม่หาย แค่ค้าง).

**Role ภายในร้าน (staff sub-accounts):** `owner` (ทุกอย่าง) · `manager` (ทุกอย่างยกเว้น bank/billing) · `cashier` (**Counter PWA เท่านั้น** — ยิง redeem ได้ แต่แตะเงิน/bank/analytics ไม่ได้). RBAC บังคับใน Refine `accessControlProvider` + Postgres RLS. การสร้าง/จัดการ sub-account ทำที่ **Settings → Staff (3.1.h)**.

---

### 3.1.a Merchant signup / onboarding entry — deep-link claim landing → auth → verify (FIX completeness-critical: cross-surface handoff Agent §4.5 → Merchant)

> **เป้าหมาย:** ปิดช่องว่าง "หน้าจอแรก" ที่ critique ชี้ — เดิม flow Agent ส่ง `claim_code` (QR deep-link) ให้เจ้าของ "สแกน/พิมพ์ในแอป Merchant" แต่ **ไม่เคยมีหน้าจอ signup/landing**. หน้านี้คือสะพานจาก "Agent onboards" → "authenticated dashboard + verify stepper" โดยมี claim-code ผูกมาแล้ว.

**(a1) Deep-link landing — มาจากสแกน QR ที่ Agent มอบ (pre-filled claim_code):**
```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         ยืนยันการเป็นเจ้าของร้าน                                │
│                         Claim your shop on <Platform>                          │
│                                                                                │
│        ┌──────────────────────────────────────────────────────┐               │
│        │  📍 ร้านที่กำลังเชื่อม:                                │               │
│        │     ☕ ร้านกาแฟ Ristr8to · ถ.นิมมาน ซ.7 · เชียงใหม่    │ ← จาก place_id│
│        │     โค้ดอ้างอิง: CLM-4F2-9KQ   ✓ ผูกกับ QR แล้ว        │   ใน deep-link│
│        └──────────────────────────────────────────────────────┘               │
│                                                                                │
│   ถ้านี่คือร้านของคุณ → เข้าสู่ระบบ/สมัครเพื่อยืนยันต่อ                          │
│                                                                                │
│        [ ดำเนินการต่อ → ]        [ นี่ไม่ใช่ร้านของฉัน (รายงาน) ]              │
└──────────────────────────────────────────────────────────────────────────────┘
```
- **`claim_code` ถูก bind ใน session** ตั้งแต่ landing → ส่งต่อไปทุกขั้นจนถึง verify (ไม่ต้องพิมพ์ซ้ำ).
- ปุ่ม "นี่ไม่ใช่ร้านของฉัน" → เปิด report (กัน QR หลุดไปผิดคน) ไม่สร้างบัญชี.

**(a2) Auth / account-create — เลือกวิธีเข้าระบบ:**
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  เข้าสู่ระบบร้านค้า / Merchant sign-in                                          │
│                                                                                │
│   [  เข้าด้วย LINE  ]   ← แนะนำสำหรับร้านไทย (default ปุ่มบนสุด)               │
│   [  อีเมล + รหัสผ่าน  ]                                                       │
│   [  Apple / Google  ]   (ถ้าเปิดใช้)                                          │
│                                                                                │
│   ⓘ บัญชีนี้จะกลายเป็น "owner" ของร้าน Ristr8to หลังยืนยัน                     │
└──────────────────────────────────────────────────────────────────────────────┘
```
- หลัง auth สำเร็จ → route เข้า **3.1.b verify stepper** โดย **claim_code pre-bound** (Step① ช่องโค้ดเติมให้อัตโนมัติ, รอกด "ยืนยันโค้ด").

**Edge / empty / error states:**
- **เจ้าของไม่มี LINE/สมาร์ทโฟน (FIX: §4.5 สัญญาไว้แต่ไม่มีจอ):** ปุ่ม "ไม่มี LINE/มือถือสมาร์ท?" → จอ fallback: "ให้เจ้าหน้าที่ช่วยตั้งค่าด้วยอีเมล + รหัสผ่าน ที่หน้าร้าน" + ช่องอีเมล/รหัสผ่าน แบบ minimal + หมายเหตุ "เจ้าหน้าที่จะไม่เห็นรหัสผ่านคุณ" + ปุ่มขอความช่วยเหลือทาง support.
- **claim_code หมดอายุ/ใช้แล้ว:** "ลิงก์ยืนยันหมดอายุ — ขอ QR ใหม่จากเจ้าหน้าที่ที่มาที่ร้าน".
- **บัญชีนี้เคยผูกร้านอื่นแล้ว:** ถามว่า "เพิ่มร้านใหม่ในบัญชีเดิม?" (multi-place owner) แทนสร้างซ้ำ.
- **claim ซ้อน (DISPUTED):** ถ้ามีคน claim place เดียวกันค้างอยู่ → banner ส้ม + เข้าคิว dispute (ดู 3.1.b).

**i18n / a11y:** ปุ่ม auth เรียงตาม persona (LINE บนสุดสำหรับไทย); ทุก label locale-active; ปุ่มใหญ่พอแตะด้วยนิ้ว (≥44px). ชื่อร้านใน landing อ่านออกเสียงโดย screen reader พร้อม "โค้ดอ้างอิง CLM dash...".

---

### 3.1.b Claim / Verify flow — trust ladder (CLAIMED → IDENTITY → FINANCE)

> **เป้าหมายของ merchant:** ไต่จาก "เพิ่งสมัคร" ไป "ออก redemption ได้". **สิ่งที่ต้องเกิด:** UI ทำให้ "ขั้นต่อไปคืออะไร + ต้องใช้หลักฐานอะไร + เหลืออีกกี่แต้ม trust" ชัดเสมอ — ระบบสะสม **trust points** ไม่ใช่ pass/fail เดี่ยว (§7.1.2). **on-premise code จาก Agent = 40 pts = ผ่านเกณฑ์ identity ในก้าวเดียว** สำหรับร้านเล็ก. ถ้ามาจาก 3.1.a โค้ดถูกเติมในช่องให้แล้ว.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ยืนยันร้านของคุณ / Verify your shop                          ✕              │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│   ●━━━━━━━━━━━━━●━━━━━━━━━━━━━○━━━━━━━━━━━━━○                                   │
│   เริ่ม        ① ยืนยันตัวตน    ② ยืนยันการเงิน   ✓ พร้อมออกรางวัล             │
│   Claimed      Identity        Finance         Ready to redeem                  │
│                ◀ คุณอยู่ที่นี่   (aria-current="step")                          │
│                                                                                │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  STEP ①  ยืนยันตัวตน (Identity)        Trust:  ▓▓▓▓▓▓░░░░  40 / 40 ✓    │  │
│  │                                          (aria-valuenow=40 valuemax=40)  │  │
│  │  เลือกอย่างน้อย 1 วิธี (สะสม ≥40 แต้ม + ผ่านการตรวจ 1 ครั้ง):           │  │
│  │                                                                          │  │
│  │  ⭐ มีโค้ดจากเจ้าหน้าที่ที่มาที่ร้าน?  (แนะนำ — แข็งสุดสำหรับร้านเล็ก)    │  │
│  │     ┌──────────────────────────────────────┐                            │  │
│  │     │  รหัสหน้าร้าน:  [ 4 8 2 - _ _ _ ]    │  +40 แต้ม                    │  │
│  │     │  On-premise code (pre-filled จาก QR) │  [ ยืนยันโค้ด ]            │  │
│  │     └──────────────────────────────────────┘                            │  │
│  │                                                                          │  │
│  │  ── หรือยืนยันด้วยตัวเอง / or self-serve ──                              │  │
│  │  ◻ สแกน QR ที่หน้าร้าน + ถ่ายรูปหน้าร้าน (geofenced)      +30 แต้ม      │  │
│  │  ◻ อีเมลโดเมนธุรกิจ  (@yourcafe.co.th)                    +20 แต้ม      │  │
│  │  ◻ หนังสือรับรองนิติบุคคล (DBD 13 หลัก)  [อัปโหลด]        +50 แต้ม      │  │
│  │  ◻ ใบ ภพ.20 (VAT)  [อัปโหลด → OCR]                        +50 แต้ม      │  │
│  │  ◻ เบอร์โทร OTP  (จำเป็นทุกราย)                            +10 แต้ม ✓    │  │
│  │                                                                          │  │
│  │  สถานะการตรวจ: ⏳ รอเจ้าหน้าที่ตรวจ — โดยปกติภายใน 24 ชม.               │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                                │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  STEP ②  ยืนยันการเงิน (Finance)  🔒 ปลดเมื่อผ่าน Step ①               │  │
│  │     • บัญชีรับเงิน + ชื่อตรงเจ้าของ (PromptPay name / micro-deposit)     │  │
│  │     • บัตรประชาชน/พาสปอร์ตผู้รับเงิน (KYC, เก็บเข้ารหัส PDPA)            │  │
│  │     ⓘ ตรวจโดยทีมการเงิน (คนละคนกับผู้ตรวจตัวตน) ภายใน 48 ชม.            │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                                │
│                                          [ บันทึกร่าง ]   [ ส่งตรวจ → ]        │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Components:** stepper (Claimed→Identity→Finance→Ready) · trust-points progress bar (ไต่จริงตามหลักฐานที่ผ่าน) · on-premise code input (segmented, monospace, pre-fill จาก deep-link) · proof checklist พร้อมแต้ม · review-status pill (⏳ pending / ✓ approved / ✗ rejected+reason / ↺ request-more) · Step② locked-state.

**On-premise code (agent-delivered) — flow ที่ต้องเกิด:**
1. Field Agent ไปถึงร้านจริง → ในแอป Agent กดสร้าง **โค้ดสุ่ม 6 หลัก** ผูก `place_id` + `agent_id` + TTL สั้น (เช่น 15 นาที, single-use).
2. Merchant พิมพ์/มาพร้อม pre-fill → server ตรวจ match + ยังไม่หมดอายุ → **+40 trust pts** + บันทึก `merchant_proof(method='on_premise_code', trust_points=40, reviewer=agent)`.
3. เข้า **Gate 1 (Identity review)** ของ moderator: ตรวจรูปหน้าร้านตรง pin? เอกสารอ่านออก/ชื่อตรง? ไม่ใช่ร้านที่มีคน claim ซ้อน (dedupe name+geo)? → `IDENTITY_VERIFIED` หรือ reject+reason หรือ request-more.
> **หมายเหตุ handoff (FIX completeness-critical):** Gate 1 (Identity) และ Gate 2 (Finance — ผู้ตรวจคนละคน) คือ **หน้าจอ Admin/Moderator console** ที่ยังไม่อยู่ใน section นี้ (เป็น orphan ที่ critique ชี้). ระบุไว้เป็น cross-subsystem hook ใน 3.3 — ฝั่ง merchant เห็นแค่ "ผลลัพธ์" (pending/approved/rejected+reason/request-more).

**Edge / empty / error states:**
- **โค้ดผิด/หมดอายุ:** inline แดง "รหัสไม่ถูกต้องหรือหมดอายุ — ขอรหัสใหม่จากเจ้าหน้าที่". ไม่บอกว่าผิดตรงไหน (กัน brute-force); rate-limit 5 ครั้ง/นาที.
- **trust ยังไม่ถึง 40:** ปุ่ม "ส่งตรวจ" disabled + helper "เหลืออีก N แต้ม — เพิ่มหลักฐานอีก 1 อย่าง".
- **claim ซ้อน (DISPUTED):** banner ส้ม "มีผู้อื่นกำลังยืนยันร้านนี้ — ทีมงานกำลังตรวจสอบ" + เปิด dispute case, ทั้งคู่ค้างที่ CLAIMED.
- **rejected:** card แดง + เหตุผลจาก reviewer + ปุ่ม "แก้แล้วส่งใหม่" (วน loop กลับ stepper เดิม, claim_code คงเดิม); เก็บ audit (reviewer_id, ts, before/after, reason — append-only).
- **DBD/OCR ล้มเหลว:** fallback ให้ upload manual + ติดธง "ตรวจด้วยคน".
- **empty (เพิ่ง claim):** แสดงเฉพาะ Step① เปิด, Step② เทา, พร้อม CTA เดียว.

**i18n / a11y:** ชื่อเอกสารราชการคงคำไทย + วงเล็บ EN (เช่น "หนังสือรับรองนิติบุคคล (DBD certificate)"). Stepper มี `aria-current="step"`; progress bar มี `aria-valuenow/valuemax` + ข้อความ "40 จาก 40 แต้ม" (ไม่พึ่งสีอย่างเดียว). โค้ด input อ่านออกเสียงทีละหลัก. โฟกัสวิ่งเข้า field ถัดไปอัตโนมัติเมื่อกรอกครบ 3 หลักแรก.

---

### 3.1.c Dashboard Home — escrow + low-balance alert + today's redemptions + verification status

> **เป้าหมาย:** glanceable "วันนี้ร้านเป็นยังไง + มีอะไรต้องทำ". **สิ่งที่ต้องเกิด:** escrow ใกล้หมด → เตือนก่อน quest pause; action ค้างเด่นชัด; เปิด Counter ได้ใน 1 คลิก.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ⚠ ยอด Escrow เหลือน้อย — Quest อาจถูกพักภายใน ~2 วัน   [ เติมเงิน ฿ ]  ✕    │ ← low-bal alert (sticky, ⚠+ข้อความ ไม่พึ่งสี)
├──────────────────────────────────────────────────────────────────────────────┤
│  สวัสดี Ristr8to ☕   วันนี้ จ.10 มิ.ย. 2569                                   │
│                                                                                │
│  ┌───────────────────────┐ ┌───────────────────────┐ ┌────────────────────┐  │
│  │ 💰 ESCROW ใช้ได้จริง   │ │ 🎟 REDEEM วันนี้       │ │ ✅ สถานะร้าน        │  │
│  │                       │ │                       │ │                    │  │
│  │   ฿ 1,240.00          │ │   18 ครั้ง            │ │  FINANCE_VERIFIED  │  │
│  │   settled available    │ │   มูลค่ารางวัล ฿720    │ │  ออกรางวัลได้ ✓     │  │
│  │  ─────────────────     │ │   take-rate ฿86       │ │                    │  │
│  │  🔒 ล็อกใน quest ฿900  │ │   ล่าสุด 09:42 ✓      │ │  payout: ปกติ      │  │
│  │  ⏳ รอ settle ฿0       │ │                       │ │                    │  │
│  │  [ เติม ]  [ ledger ]  │ │  [ ดูทั้งหมด → 3.1.f ] │ │  [ จัดการ → 3.1.i ]│  │
│  └───────────────────────┘ └───────────────────────┘ └────────────────────┘  │
│                                                                                │
│  สิ่งที่ต้องทำ / To-do                                                          │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ • 🎯 Quest "Nimman Cafe-Hop" — งบรางวัลเหลือ 13%  → เติม หรือ พัก       │  │
│  │ • 📍 แก้เวลาเปิด-ปิด (EN/简体 ยังว่าง)  → 2 ฟิลด์รอแปล                  │  │
│  │ • 🧾 ใบกำกับภาษีเดือน พ.ค. พร้อมดาวน์โหลด  → 3.1.g                       │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                                │
│  📊 7 วันล่าสุด  ▁▃▅▇▆▄▅  footfall · redemption    [ เปิด Analytics → ]       │
│                                                                                │
│            ┌──────────────────────────────────────────────────┐               │
│            │   📲  เปิดหน้าจอยิงรางวัล (Counter)               │ ← ปุ่มเด่นสุด │
│            │       Scan to redeem                              │               │
│            └──────────────────────────────────────────────────┘               │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Components:** low-balance sticky alert (dismissible/snooze) · 3 KPI cards (Escrow / Today's redemptions / Verification) · to-do list (actionable, deep-link ไปจอปลายทางจริง) · 7-day sparkline · primary CTA เปิด Counter PWA.

**นิยามตัวเลข (ต้องตรงกับ ledger เพื่อกัน "เลขหลอก"):**
- **Escrow ใช้ได้จริง = `settled_available`** = ส่วนที่ผ่าน PSP_SETTLE แล้ว และยัง **ไม่ถูกล็อก** ใน quest reservation. แยกแสดง 3 แถว: `available` / 🔒 `locked in quests` / ⏳ `รอ settle (psp_suspense)` — เพราะ "รอ settle ค้ำ mint ไม่ได้" (A.8.11).
- **REDEEM วันนี้:** count + Σ มูลค่ารางวัล (face THB ที่ burn) + Σ take-rate (~12%) — aggregate เท่านั้น. (฿ ที่นี่ merchant-only, ไม่ mirror ฝั่ง consumer.)

**Edge / empty / error states:**
- **escrow = 0 / quest paused:** alert เปลี่ยนเป็นแดง + ⚠ "Quest ถูกพักแล้ว — ลูกค้าทำครบจะยังไม่ได้รางวัลจนกว่าจะเติม" + ปุ่มเติมเด่น.
- **trust < FINANCE_VERIFIED:** card สถานะแสดง stepper ย่อ + CTA "ยืนยันต่อ" แทน (deep-link → 3.1.b); ปุ่ม Counter เป็น 🔒.
- **PAYOUT_FROZEN:** banner เหลือง + ⚠ "การจ่ายเงินถูกพักเพื่อยืนยันใหม่ — ลูกค้ายัง redeem ได้ปกติ" (ย้ำว่าไม่ลงโทษลูกค้า; Coin ที่ burn ค้างใน clearing รอ unfreeze) + CTA "ยืนยันใหม่ → 3.1.i".
- **empty (ร้านใหม่ ยังไม่มี redeem):** KPI โชว์ "—" + onboarding tip "ตั้ง Quest แรกเพื่อเริ่มดึงลูกค้า".
- **data โหลดล้ม:** skeleton + retry; ไม่โชว์ ฿0 หลอก.

**i18n / a11y:** วันที่แสดงปฏิทินไทย (พ.ศ.) ในโหมด TH, ค.ศ. ในโหมด EN/简体. KPI cards เป็น landmark `region` มี `aria-label`. สีเตือน (แดง/ส้ม/เหลือง) คู่กับไอคอน + ข้อความเสมอ.

---

### 3.1.d Escrow top-up — prefund (PromptPay / card → settled before mintable)

> **เป้าหมาย:** เอาเงินบาทเข้า escrow เพื่อเอาไปทำ Coin รางวัล. **สิ่งที่ต้องเกิด:** ชัดว่าเงิน "พร้อมใช้จริง" ต้องรอ settle ก่อน (PromptPay ~ทันที, card ~ไม่กี่นาที), credit แบบ GROSS (แพลตฟอร์มดูด PSP fee เอง), และ auto-topup กัน quest pause.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  เติมเงิน Escrow / Top up escrow                                  ✕          │
├──────────────────────────────────────────────────────────────────────────────┤
│  ยอดใช้ได้จริงตอนนี้:  ฿1,240.00   (🔒 ล็อกใน quest ฿900 · ⏳ รอ settle ฿0)  │
│                                                                                │
│  เติมจำนวน / Amount                                                            │
│  ┌──────────────┐   ปุ่มลัด:  [ +฿500 ] [ +฿1,000 ] [ +฿3,000 ] [ +฿5,000 ]  │
│  │  ฿ 3,000     │                                                              │
│  └──────────────┘                                                              │
│                                                                                │
│  วิธีจ่าย / Payment                                                            │
│  ( • ) PromptPay QR      — ได้ใช้ทันทีหลังชำระ (แนะนำ)                        │
│  ( ◦ ) บัตรเครดิต/เดบิต  — settle ~2–5 นาที                                  │
│                                                                                │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  สรุป / Summary                                                          │  │
│  │   เติมเข้า escrow (เครดิตเต็มจำนวน)        ฿ 3,000.00                     │  │
│  │   ค่าธรรมเนียมผู้ให้บริการชำระเงิน          แพลตฟอร์มรับให้ ✓ (ฟรี)        │  │
│  │   ─────────────────────────────────────────────────                     │  │
│  │   คุณจ่าย                                  ฿ 3,000.00                     │  │
│  │   escrow ใช้ได้จริง: ฿1,240 → ฿4,240  (หลังเงิน settle)                  │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                                │
│  ◻ เติมอัตโนมัติเมื่อต่ำกว่า [ ฿500 ] เติมครั้งละ [ ฿2,000 ]  (auto-topup)    │
│                                                                                │
│                                         [ ยกเลิก ]   [ จ่ายด้วย PromptPay → ]  │
└──────────────────────────────────────────────────────────────────────────────┘

   หลังชำระ →  ┌───────────────────────────────┐
               │ ⏳ ได้รับการชำระแล้ว           │
               │    รอยืนยันเงินเข้า (settle)... │  PREFUND posted → psp_suspense
               │    ▓▓▓▓▓▓▓▓░░  PromptPay        │
               │ ✅ เงินพร้อมใช้แล้ว +฿3,000     │  PSP_SETTLE posted → bank_settlement
               │    escrow ใช้ได้จริง ฿4,240     │     → ตอนนี้ mintable
               └───────────────────────────────┘
```

**Ledger mapping (สิ่งที่เกิดหลังบ้าน — ไม่โชว์ merchant แต่ขับ state ของ UI):**
- กด "จ่าย" → **PREFUND**: `Dr psp_suspense (net) + Dr psp_fee_expense (platform รับ) / Cr merchant_escrow (GROSS ฿3,000)`. UI โชว์ "⏳ รอยืนยัน".
- PSP จ่ายเข้าธนาคารเรา → **PSP_SETTLE** (mandatory): `Dr bank_settlement / Cr psp_suspense`. **เฉพาะตอนนี้** ยอดถึงนับเป็น `settled_available` (mintable). UI flip เป็น "✅ พร้อมใช้".

**Edge / empty / error states:**
- **PromptPay หมดอายุ QR:** "QR หมดเวลา — สร้างใหม่"; ไม่ post ledger.
- **card declined / chargeback เสี่ยง:** ไม่เครดิต escrow; แสดง error เป็นกลาง.
- **settle ค้าง > X นาที:** card ค้าง "⏳ ยังรอเงิน settle — quest ที่พึ่งยอดนี้จะยังพักไว้" (ย้ำว่ายังเอาไป mint ไม่ได้, กันเข้าใจผิด).
- **min/max:** ขั้นต่ำ ฿100; เกิน threshold ใหญ่ → ขอ confirm + อาจ step-up auth.
- **auto-topup ต้องผูก card/mandate ที่ valid** — ถ้าไม่มีให้ disable toggle + ลิงก์ไปผูก.

**i18n / a11y:** "ค่าธรรมเนียม...แพลตฟอร์มรับให้" ต้องสื่อชัดทุกภาษา (กันเข้าใจว่าโดนหัก). สถานะ settle ใช้ live region `aria-live="polite"`. ปุ่มลัดจำนวนมี `aria-label` เต็ม ("เติมห้าร้อยบาท").

---

### 3.1.e Quest join / fund — pick reward · set pool · COGS cap guardrail

> **เป้าหมาย:** ร้านตั้ง/เข้าร่วม cross-merchant quest (เช่น "Nimman Cafe-Hop": แวะ 3 ใน N → ฟรีกาแฟร้านที่ 4) แล้วใส่งบรางวัล. **สิ่งที่ต้องเกิด:** เลือกรางวัล → ตั้ง pool → ระบบ **enforce COGS cap** (กันแจกจนขาดทุน — break-even ที่ ~46% incrementality, B.6/D.1) → reserve เงินจาก settled_available แบบ transactional.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ตั้งงบรางวัล Quest:  Nimman Cafe-Hop ☕            (cross-merchant trail)   ✕ │
├──────────────────────────────────────────────────────────────────────────────┤
│  บทบาทของร้านคุณ:  ( • ) ผู้สนับสนุน (ออกงบ)   ( ◦ ) ร้านปลายทางที่ให้ของ      │
│  ⓘ ลูกค้าอาจได้ Coin จากร้านคุณ แล้วไปใช้ที่ร้านอื่นในเส้นทาง (ดู you-owe)     │
│                                                                                │
│  รางวัลที่ออก / Reward                                                          │
│  ( • ) กาแฟฟรี 1 แก้ว   มูลค่า [ ฿60 ]      ◯ ส่วนลด ฿…   ◯ ของแถม…           │
│   ⓘ ฿ นี้คือต้นทุนฝั่งร้าน (COGS) — ฝั่งลูกค้าเห็นแค่ "กาแฟฟรี" ไม่เห็นเลขบาท   │
│                                                                                │
│  เงื่อนไขปลดล็อก:  แวะ [ 3 ] ร้าน จาก [ 6 ] ร้านในเส้นทาง                       │
│                                                                                │
│  งบรางวัลรวม (reward pool)                                                      │
│  ┌──────────────┐   ≈ จ่ายได้ราว [ 50 ] รางวัล  (฿3,000 ÷ ฿60)               │
│  │  ฿ 3,000     │   หักจาก escrow ใช้ได้จริง ฿1,240 → ต้องเติมอีก ฿1,760 ⚠   │
│  └──────────────┘                                                              │
│                                                                                │
│  ┌─ เพดานต้นทุนรางวัล (COGS cap) ─────────────────────────────────────────┐  │
│  │  • ต่อ 1 รางวัล:        ฿60  ✓  (เพดาน ฿80)                              │  │
│  │  • รวมทั้งเดือน (ร้านนี้): ฿3,000 + ใช้ไป ฿1,200 = ฿4,200               │  │
│  │                          ▓▓▓▓▓▓▓░░░  ฿4,200 / ฿6,000  ✓  ภายในเพดาน      │  │
│  │  ⓘ เกินเพดาน = ระบบจะหยุดออกรางวัลอัตโนมัติ (กันแจกขาดทุน)              │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                                │
│  ระยะเวลา: [ 10 มิ.ย. ] – [ 10 ก.ค. ]   ⏰ Yi Peng festival boost (add-on)    │
│                                                                                │
│              [ บันทึกร่าง ]   [ เติม escrow ก่อน ฿1,760 ]   [ เริ่ม Quest → ]  │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Ledger / cap mapping:**
- "เริ่ม Quest" → **FUND_QUEST** = **reservation เท่านั้น ไม่ post ledger leg**: `INSERT escrow_locks(reason='quest_pool', amount=pool)` ภายใต้ `FOR UPDATE` + `CHECK settled_available ≥ pool` (A.8.7). เงินจะขยับ ledger จริงตอน **GRANT** (ลูกค้าทำครบ) เท่านั้น.
- **COGS cap = hard mint-gate 2 ชั้น** (A2.4): `reward_value ≤ REWARD_PER_REDEMPTION_CAP_THB` (per redeem) **และ** `Σ(REDEEM thb_settlement ของร้านนี้/เดือน) + this ≤ MERCHANT_MONTHLY_COGS_CAP_THB`. **เกิน → REJECT mint + freeze GRANT scope ของร้านนั้น** (ลูกค้าที่ทำครบหลังจากนั้นจะไม่ได้ Coin จนกว่าจะมีงบ/รอบใหม่).
- **สถานะ INERT-UNTIL-SIZED (verifier major):** ถ้า cap ยังไม่ถูกตั้งค่า (founder call ค้าง) → gate **fail-closed REJECT** พร้อม flag `cogs_cap_unset`. **UI implication:** จนกว่า cap จะถูกตั้ง ห้ามเปิด path ที่พึ่ง cap เป็น control; แสดง cap bar เป็น "กำลังตั้งค่า" แทนตัวเลขปลอม.

**Edge / empty / error states:**
- **escrow ไม่พอ:** ปุ่มหลักกลายเป็น "เติม escrow ก่อน ฿X" (chain ไป 3.1.d); ห้ามเริ่ม quest โดยไม่มีเงินค้ำ.
- **เกิน per-redemption cap:** field รางวัลแดง "มูลค่าเกินเพดาน ฿80 ต่อรางวัล — ลดลงหรือขอปรับเพดาน".
- **ใกล้ monthly cap:** bar เหลือง + ⚠ "งบเดือนนี้ใกล้เต็ม — ออกได้อีกราว N รางวัล".
- **cap_unset:** banner "เพดานต้นทุนยังไม่ถูกตั้งค่าโดยทีมแพลตฟอร์ม — ยังเปิด quest แบบจ่ายรางวัลไม่ได้ชั่วคราว" (fail-closed, ไม่ปล่อยผ่าน).
- **trust < IDENTITY_VERIFIED:** เมนู Quests ทั้งหมด 🔒.
- **ร้านปลายทางที่ไม่ใช่ผู้สนับสนุน:** ซ่อนช่อง pool, แสดงแค่ "เข้าร่วมเป็นจุดแลกรางวัล" + ส่วนแบ่งที่จะได้รับ (88% หลัง take-rate).

**i18n / a11y:** คำว่า "COGS / ต้นทุนรางวัล" ให้ภาษาชาวบ้าน ("งบที่จ่ายเป็นของแถม"). cap bar `role="progressbar"` + ข้อความตัวเลขเสมอ. การคำนวณ "≈ N รางวัล" อัปเดต live เมื่อแก้ pool/มูลค่า.

---

### 3.1.f Redemptions full-list (FIX completeness-minor: §3.0 nav 🎟 ปลายทางไม่มีจอ)

> **เป้าหมาย:** ปลายทางของ "ดูทั้งหมด" จาก KPI card — ประวัติ redemption ราย transaction (aggregate-safe, ไม่ drill ถึงตัวบุคคล), reconcile กับ clearing/payout, และดู state ที่ต้องตาม (hold/review).

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Redemptions / ประวัติการจ่ายรางวัล      ช่วง: [ 7 วัน ▾ ]  [ ⬇ export(Pro) ]│
├──────────────────────────────────────────────────────────────────────────────┤
│  สรุป: 18 ครั้งวันนี้ · มูลค่า ฿720 · take-rate ฿86 · สุทธิเข้า payable ฿634   │
│  ───────────────────────────────────────────────────────────────────────────  │
│  เวลา   │ รางวัล          │ ลูกค้า  │ Coin จากร้าน │ สถานะ                      │
│  ───────┼─────────────────┼─────────┼──────────────┼──────────────────────────  │
│  09:42  │ ☕ กาแฟฟรี       │ A***    │ ร้านเรา      │ ✓ สำเร็จ → payable        │
│  09:31  │ 🍰 เค้ก          │ B***    │ ร้านอื่น     │ ✓ สำเร็จ (you-owed +฿88)  │
│  09:18  │ ☕ กาแฟฟรี       │ C***    │ ร้านเรา      │ ⏳ ค้าง clearing (frozen) │
│  08:55  │ ☕ กาแฟฟรี       │ D***    │ ร้านเรา      │ 🟡 รอตรวจ (self-redeem)   │ ← hold, ไม่ใช่ปฏิเสธ
│  ───────┴─────────────────┴─────────┴──────────────┴──────────────────────────  │
│  ⓘ ชื่อลูกค้า masked (PDPA) · ตัวเลขเป็น aggregate · drill ถึงบุคคลไม่ได้       │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Edge / empty / error states:**
- **empty:** "ยังไม่มีการจ่ายรางวัล — เปิด Counter เพื่อเริ่ม" + ปุ่มเปิด Counter.
- **PAYOUT_FROZEN:** แถวสถานะ "⏳ ค้าง clearing" + tooltip "รอ unfreeze".
- **row hold (self-redeem/velocity):** badge เหลือง "🟡 รอตรวจ" + ลิงก์ support; **ไม่แสดงเป็น "ปฏิเสธ"** (เป็น hold).

**i18n / a11y:** table sortable + keyboard-navigable; ชื่อ masked อ่านเป็น "ลูกค้านิรนาม"; สถานะใช้ไอคอน + ข้อความ.

---

### 3.1.g Billing — subscription tier + invoices/tax download (FIX completeness-minor: §3.0 nav 🧾 ปลายทางไม่มีจอ)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Billing / การเรียกเก็บเงิน                                                     │
├──────────────────────────────────────────────────────────────────────────────┤
│  แผนปัจจุบัน:  Growth  ฿XXX/เดือน   [ เปลี่ยนแผน ]                              │
│  ┌──────────┬──────────────┬──────────────┬──────────────┐                     │
│  │          │  Free        │  Growth ★    │  Pro         │                     │
│  │ Deals    │  1 active    │  หลายรายการ  │  ไม่จำกัด+schedule                  │
│  │ Analytics│  7 วัน       │  90 วัน      │  ไม่จำกัด+export+benchmark          │
│  └──────────┴──────────────┴──────────────┴──────────────┘                     │
│                                                                                │
│  ใบกำกับภาษี / Invoices                                                         │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  พ.ค. 2569   ฿XXX   ชำระแล้ว ✓        [ ⬇ ดาวน์โหลด PDF ]               │  │
│  │  เม.ย. 2569  ฿XXX   ชำระแล้ว ✓        [ ⬇ ดาวน์โหลด PDF ]               │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                                │
│  ⓘ Billing นี้คือค่าบริการแพลตฟอร์ม — แยกขาดจาก escrow/payout (คนละกระเป๋า)    │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Edge:** **role=cashier/manager → 🔒 Billing** (เฉพาะ owner). **invoice ยังไม่ออก →** "รอบนี้กำลังคำนวณ". **a11y:** ตารางแผนมี caption; ปุ่มดาวน์โหลดมี `aria-label` ระบุเดือน.

---

### 3.1.h Settings — staff sub-accounts (cashier) + โปรไฟล์ร้าน + ภาษา (FIX completeness-minor: §3.0 RBAC พูดถึง cashier แต่ไม่มีจอสร้าง)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Settings  ▸  พนักงาน (Staff)                              [ + เพิ่มพนักงาน ]  │
├──────────────────────────────────────────────────────────────────────────────┤
│  ชื่อ        │ บทบาท     │ เข้าถึง                      │ สถานะ                 │
│  ───────────┼───────────┼──────────────────────────────┼──────────────────────  │
│  คุณ (เจ้าของ)│ owner     │ ทุกอย่าง                     │ 🟢 active             │
│  น้องเอ      │ manager   │ ทุกอย่าง ยกเว้น bank/billing │ 🟢 active             │
│  หนิง        │ cashier   │ Counter PWA เท่านั้น         │ 🟢 active · [PIN ↻]   │
│  ───────────┴───────────┴──────────────────────────────┴──────────────────────  │
│                                                                                │
│  ┌─ เพิ่มพนักงาน ───────────────────────────────────────────────────────────┐ │
│  │  ชื่อ [ หนิง ]   บทบาท ( ◦ manager  • cashier )                           │ │
│  │  วิธีเข้า: cashier ใช้ PIN 6 หลัก (ปลด session ยาวบน Counter) — ไม่เห็นเงิน│ │
│  │  ⚠ cashier แตะ bank/analytics/billing ไม่ได้ (RBAC + RLS บังคับ)          │ │
│  │                                   [ ยกเลิก ]   [ สร้าง + ออก PIN → ]      │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **PIN rotation:** owner/manager กด "↻" รี-issue PIN ของ cashier ได้ทุกเมื่อ (กรณีพนักงานออก).
- **Tabs อื่นใน Settings:** โปรไฟล์ร้าน (ชื่อ/เวลา/ภาพ — เป็น Change Proposal), ภาษา default, การแจ้งเตือน.

**Edge / a11y:** ลบ cashier → revoke session ทันที (Counter ที่ค้างต้อง re-PIN ล้มเหลว). role chip มีข้อความ ไม่พึ่งสี. ปุ่ม "สร้าง" disabled จนกรอกครบ.

---

### 3.1.i Payout-bank management + re-verify / step-up (PAYOUT_FROZEN) (FIX completeness-minor: §3.3 สัญญาไว้แต่ไม่มีจอ)

> **เป้าหมาย:** จุดที่ "เงินออก" — ผูก/เปลี่ยนบัญชี payout. **กฎ anti-takeover:** เปลี่ยน bank/owner/เบอร์หลัก → `PAYOUT_FROZEN` + step-up auth + แจ้งทุกช่อง (กันโจรกรรมบัญชีดูด escrow).

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Payout / บัญชีรับเงิน                                สถานะ: FINANCE_VERIFIED  │
├──────────────────────────────────────────────────────────────────────────────┤
│  บัญชีรับ payout ปัจจุบัน:  ธ.กสิกรไทย ••••3421   ชื่อ: บจก. ริสเตรโต ✓         │
│  รอบจ่ายถัดไป:  จ. 16 มิ.ย. · ยอดสุทธิรอจ่าย ฿1,460 (จาก clearing)             │
│                                                                                │
│  [ เปลี่ยนบัญชีรับเงิน ]                                                        │
│                                                                                │
│  ┌─ ⚠ เปลี่ยนบัญชี = ต้องยืนยันใหม่ ──────────────────────────────────────┐  │
│  │  เพื่อความปลอดภัย การเปลี่ยนบัญชีจะ:                                      │  │
│  │   1. พัก payout ชั่วคราว (PAYOUT_FROZEN) — ลูกค้ายัง redeem ได้ปกติ      │  │
│  │   2. ขอยืนยันตัวตนเพิ่ม (step-up: OTP + KYC ซ้ำ)                          │  │
│  │   3. แจ้งเตือนทุกช่อง (อีเมล + LINE + เบอร์เดิม)                          │  │
│  │  เงินที่ค้างจะไม่หาย — ค้างใน clearing จนยืนยันเสร็จ                      │  │
│  │                                   [ ยกเลิก ]   [ เข้าใจแล้ว ดำเนินการ → ]│  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘

   สถานะ PAYOUT_FROZEN →  ┌───────────────────────────────────────┐
                          │ 🔒 payout ถูกพักเพื่อยืนยันบัญชีใหม่    │
                          │   ▸ ยืนยัน step-up OTP   [ ดำเนินการ ] │
                          │   ▸ ทีมการเงินตรวจ ~48 ชม.            │
                          │   ลูกค้ายัง redeem ได้ · เงินค้าง clearing
                          └───────────────────────────────────────┘
```

**Edge / a11y:** role=owner เท่านั้น; step-up ล้มเหลว → ยัง frozen, ไม่ปลด. ข้อความ frozen ใช้ ⚠/🔒 + ข้อความ ไม่พึ่งสี. ย้ำเสมอ "ลูกค้าไม่ได้รับผลกระทบ".

---

### 3.1.j Deals & Promotions

> **เป้าหมาย:** โพสต์ดีล/โปรของวันนี้ (ผูกกับ "freshness badge" + today's price ฝั่ง consumer). **สิ่งที่ต้องเกิด:** ทุกการแก้ content = **Change Proposal** เข้า moderation queue เดียวกับ Agent (merchant ที่ verified แล้วได้ trust weight สูง → บางฟิลด์ auto-approve).

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ดีล & โปรโมชัน / Deals                                  [ + สร้างดีล ]       │
├──────────────────────────────────────────────────────────────────────────────┤
│  สถานะ │ ดีล                          │ ภาษา      │ ช่วงเวลา        │ เหลือ   │
│  ───────┼──────────────────────────────┼───────────┼─────────────────┼───────  │
│  🟢 live │ ลาเต้ลด 20% ก่อน 11 โมง       │ TH EN 简体 │ ทุกวัน 8–11น.   │ 30/วัน  │
│  🟡 รอตรวจ│ เค้กส้มซื้อ1แถม1             │ TH ·· ··  │ 10–12 มิ.ย.     │ 50      │ ← Change Proposal pending
│  ⚪ ร่าง  │ Affogato หน้าร้อน             │ TH ·· ··  │ —               │ —       │
│  ───────┴──────────────────────────────┴───────────┴─────────────────┴───────  │
│                                                                                │
│  ┌─ แก้ดีล: "เค้กส้มซื้อ1แถม1" ──────────────────────────────────────────┐    │
│  │  ⚠ การแก้ไขจะเข้าคิวตรวจก่อนขึ้นจริง (Change Proposal)                  │    │
│  │                                                                         │    │
│  │  ชื่อดีล   TH [ เค้กส้มซื้อ1แถม1        ]                                │    │
│  │           EN [ ⚠ ยังไม่ได้แปล ]  简体 [ ⚠ 未翻译 ]   [ แปลอัตโนมัติ ]   │    │
│  │  ช่วงเวลา [10 มิ.ย.]–[12 มิ.ย.]   จำกัด [50] ชิ้น                       │    │
│  │  รูป      [ 🖼 อัปโหลด ]                                                 │    │
│  │                                                                         │    │
│  │  diff:  + ขยายเวลาถึง 12 มิ.ย.   ~ เพิ่มลิมิต 40→50                     │    │
│  │                          [ บันทึกร่าง ]   [ ส่งตรวจ ]                    │    │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Components:** deals table (status pill: live/pending-review/draft/expired) · i18n completeness chips (เน้นภาษาที่ยังว่าง) · editor พร้อม **diff view** (+/~ ของ Change Proposal) · auto-translate helper (ต้องให้ merchant review ก่อน publish). Tier limit ตาม Billing (3.1.g).

**Edge / empty / error states:**
- **i18n ไม่ครบ:** เตือนแต่ไม่บล็อก (อย่างน้อย TH); ฝั่ง consumer fallback แสดงภาษาที่มี.
- **rejected proposal:** แสดงเหตุผล + ปุ่มแก้; ดีลเดิม (ถ้ามี live) ยังคงอยู่.
- **เกิน tier limit:** "แผน Free โพสต์ได้ 1 ดีล — อัปเกรดเพื่อโพสต์เพิ่ม" → Billing (3.1.g).
- **empty:** illustration + "สร้างดีลแรกเพื่อให้ลูกค้าเห็นโปรวันนี้".

**i18n / a11y:** auto-translate ติดป้าย "แปลโดยเครื่อง — โปรดตรวจ". diff ใช้สัญลักษณ์ +/~/− ไม่พึ่งสีล้วน. table sortable + keyboard-navigable.

---

### 3.1.k Analytics — footfall · tourist/local split · redemption ROI · you-owe/owed

> **เป้าหมาย:** ตอบ "ของฟรีที่แจกคุ้มไหม + ใครมาร้านเรา + cross-merchant เราเป็นหนี้หรือเขาเป็นหนี้". **สิ่งที่ต้องเกิด:** ทุกตัวเลขเป็น aggregate + PDPA-safe (k-anonymity suppress cell n<5, ห้าม drill ถึงตัวบุคคล, ไม่เก็บ movement graph).

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Analytics            ช่วง: [ 30 วันล่าสุด ▾ ]   [ ⬇ export (Pro) ]           │
├──────────────────────────────────────────────────────────────────────────────┤
│  ┌── Footfall (verified visit) ──────────┐  ┌── นักท่องเที่ยว vs คนท้องถิ่น ──┐ │
│  │  รวม 1,284 visit   ▲12% จากเดือนก่อน  │  │  Local/Nomad ████████░ 52%      │ │
│  │  ▁▂▃▅▆▇▆▅▃▂▁▂▃▅▇  (ตามชั่วโมง)        │  │  Western      ███░░░░░░ 21%      │ │
│  │  พีค 9–11 โมง                          │  │  Chinese FIT  ████░░░░░ 27% ↑    │ │
│  └────────────────────────────────────────┘  │  ⓘ อิงภาษาแอป+ผู้ให้บริการล็อกอิน│ │
│                                               │     ไม่ติดตามเส้นทางบุคคล        │ │
│  ┌── Redemption ROI ─────────────────────┐    └─────────────────────────────────┘ │
│  │  รายได้ส่วนเพิ่ม (purchase-proven) ฿18,400                                  │ │
│  │  − ต้นทุนรางวัล (Coin ที่ burn)        ฿3,120                                │ │
│  │  − take-rate แพลตฟอร์ม                 ฿  430                                │ │
│  │  ─────────────────────────────────────────                                 │ │
│  │  ROI สุทธิ  +฿14,850   (×4.2)   🟢 คุ้ม   [benchmark ย่าน Nimman: ×3.1]     │ │
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
│  ┌── Cross-merchant: คุณเป็นหนี้ / มีคนเป็นหนี้คุณ (you owe / owed) ──────────┐ │
│  │  คุณเป็นหนี้ (สปอนเซอร์ Coin ที่ไป redeem ร้านอื่น)     − ฿1,180          │ │
│  │  มีคนเป็นหนี้คุณ (ลูกค้า redeem ที่ร้านคุณ จาก Coin ร้านอื่น) + ฿2,640    │ │
│  │  ──────────────────────────────────────────────                          │ │
│  │  สุทธิ:  + ฿1,460  (จะได้รับใน payout รอบถัดไป)   ⓘ อ่านจาก clearing       │ │
│  └─────────────────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────────┘
```

**นิยาม (กันตัวเลขหลอก):**
- **Footfall** = จำนวน **verified visit** (check-in ที่ผ่าน trust ≥ GPS-dwell) — ไม่ใช่ raw scan.
- **Tourist/local split** = สัดส่วน segment อิง **ภาษาแอป + auth provider** (LINE→มัก local, WeChat/Alipay→Chinese FIT) **โดยไม่เก็บ movement graph**.
- **Redemption ROI** = `incremental revenue (purchase-proven) − (มูลค่า Coin ที่ burn + take-rate)`.
- **You owe / owed** = ยอดสุทธิ cross-merchant อ่านจาก **clearing / merchant_payable**. **นี่คือหัวใจ loyalty game** — ต้องโปร่งใส.

**Tier gating:** Free = footfall 7 วัน · Growth = 90 วัน + split + you-owe/owed · Pro = ไม่จำกัด + export + benchmark ย่าน. (ดู Billing 3.1.g)

**Edge / empty / error states:**
- **n < 5 ใน segment:** แสดง "— (ข้อมูลน้อยเกินไป)" แทนตัวเลข (k-anonymity).
- **ยังไม่มี redemption:** ROI card = "ยังไม่มีข้อมูลพอ — เริ่ม Quest แรก".
- **incremental revenue คำนวณไม่ได้** (ไม่มี purchase-proven visit): ROI ขึ้น "ต้องมีการพิสูจน์การซื้อเพื่อวัด ROI" + อธิบายวิธีเปิด proven-purchase check-in.
- **trust/tier ไม่พอ:** card ที่ล็อกแสดง teaser เบลอ + CTA อัปเกรด.

**i18n / a11y:** กราฟทุกตัวมีตารางข้อมูลทางเลือก (`<table>` ซ่อนสำหรับ screen reader). "you owe/owed" ใช้สี + เครื่องหมาย `+/−` + คำอธิบาย. ตัวเลขเงิน format ตาม locale.

---

### 3.2 Counter PWA — "Scan to Redeem" (<5 วินาที · no-install · non-technical)

> **นี่คือหน้าจอที่สำคัญที่สุดทั้ง section.** บริบท: เจ้าของร้านกาแฟ Nimman อายุ ~55 ช่วง 9 โมงเช้าคนต่อคิว ถือมือถือ Android เครื่องเดียว ไม่มี POS. **เป้าหมาย:** ยืนยัน + burn Coin ของลูกค้า → ส่งของ ภายใน **<5 วินาที**, ทุกอย่างทำบน LINE PWA / browser bookmark (ไม่ต้องลง app, ไม่ login ซ้ำ — session ยาว + PIN ปลด).
>
> **โมเดล 2 ทิศ (ห้ามสับสน):** **EARN** = ลูกค้าสแกน **table-tent QR ที่ร้านพิมพ์แปะไว้** (zero counter effort). **REDEEM** = **staff สแกน/อ่านโค้ดของลูกค้า** (rotating, server-burn). หน้าจอนี้ทำเฉพาะทิศ REDEEM.

#### 3.2.a สถานะ camera-warming + permission (FIX major: critique ชี้ว่า camera permission/first-frame ใน LINE in-app webview ไม่เคยมีจอ)

> **ปัญหาที่ปิด:** "เปิดมาเจอกล้องเลย (0 tap)" สมมติว่ากล้อง permission พร้อม+warm แล้ว — ซึ่งบน LINE in-app browser มักถูก re-prompt/บล็อก. จอกล้องดำเงียบ = dead-end สำหรับเจ้าของ 55 ปีช่วง rush. **OTP ต้องเป็น guaranteed fallback ที่ <5 วิ ได้ด้วยตัวเอง.**

**(warming) กล้องกำลังเปิด — pre-warm getUserMedia ตั้งแต่เปิด PWA:**
```
┌───────────────────────────────┐
│ ☕ Ristr8to · เคาน์เตอร์      │
│ 👤 หนิง (cashier) · 🟢 ออนไลน์│
├───────────────────────────────┤
│    ┌───────────────────┐      │
│    │   ⏳ กำลังเปิดกล้อง… │      │ ← skeleton + spinner (ไม่ใช่จอดำเงียบ)
│    │   Opening camera   │      │
│    └───────────────────┘      │
│  ระหว่างรอ พิมพ์รหัสได้เลย ↓   │
│  ╔═══════════════════════════╗│
│  ║   ⌨ พิมพ์รหัส 6 หลัก       ║│ ← OTP เด่นเท่ากัน ไม่ต้องรอกล้อง
│  ╚═══════════════════════════╝│
└───────────────────────────────┘
```

**(denied / LINE-blocked) กล้องถูกปฏิเสธ หรือ LINE webview บล็อก → OTP เป็น surface หลัก:**
```
┌───────────────────────────────┐
│ ⚠ ใช้กล้องไม่ได้ในหน้านี้      │
├───────────────────────────────┤
│  พิมพ์รหัสที่ลูกค้าโชว์แทน:    │ ← OTP keypad เต็มจอ = PRIMARY (ไม่ใช่ลิงก์เล็ก)
│   ┌───┬───┬───┬───┬───┬───┐   │
│   │ _ │ _ │ _ │ _ │ _ │ _ │   │
│   └───┴───┴───┴───┴───┴───┘   │
│        [ ยืนยัน → ]            │
│  ───────────────────────────  │
│  [ ขอเปิดกล้องอีกครั้ง ]       │ ← one-tap re-grant
│  ⓘ ถ้าเปิดจาก LINE: แตะ ⋯ →   │
│     "เปิดด้วย Chrome/Safari"   │ ← LINE-specific guidance
└───────────────────────────────┘
```
- **detect LINE in-app browser:** ถ้าตรวจพบ + กล้องบล็อก → default ตรงไป OTP keypad + แนะ "เปิดใน Chrome/Safari".
- **pre-warm:** เรียก getUserMedia ตอน PWA launch (กัน first-frame latency กลางแดด).

#### 3.2.b สถานะหลัก — พร้อมสแกน (default หลังกล้อง warm สำเร็จ):
```
┌───────────────────────────────┐   ← มือถือเดียว, แนวตั้ง, นิ้วโป้งเดียวเอื้อมถึง
│ ☕ Ristr8to · เคาน์เตอร์      │
│ 👤 พนักงาน: หนิง (cashier)    │
│ 🟢 ออนไลน์                    │
├───────────────────────────────┤
│    ┌───────────────────┐      │
│    │   [ ช่องกล้อง ]   │ ← live│
│    │    ┌─────────┐    │   cam │
│    │    │ ░░░░░░░ │    │      │
│    │    └─────────┘    │      │
│    │  เล็งที่โค้ดลูกค้า  │      │
│    └───────────────────┘      │
│  ╔═══════════════════════════╗│
│  ║   📷  สแกนเพื่อจ่ายรางวัล  ║│ ← ปุ่มยักษ์ เต็มกว้าง สูง ~25%
│  ╚═══════════════════════════╝│
│  [ พิมพ์รหัส 6 หลักแทน ]      │ ← OTP fallback (เด่น, equal-weight)
└───────────────────────────────┘
```

#### 3.2.c สถานะ VALIDATING — กำลังตรวจกับ server (FIX major: money-action loading state ที่เดิมมีแต่ใน prose):
```
┌───────────────────────────────┐
│███████████████████████████████│
│██                           ██│
│██        ⏳ กำลังตรวจ…        ██│ ← เต็มจอ, ระหว่าง decode → ผล
│██        Validating         ██│   (ห้ามเด้งเขียวก่อน server ตอบ)
│██     ▓▓▓▓▓▓░░░░             ██│
│██   อย่าเพิ่งส่งของ           ██│ ← ย้ำ: รอผลก่อน
│███████████████████████████████│
└───────────────────────────────┘
   rotating-code ยัง valid อยู่ระหว่างนี้ · timeout → REJECTED "ลองใหม่"
```

#### 3.2.d สถานะ APPROVED — เขียวเต็มจอ + เสียง + สั่น (glanceable ข้ามไหล่):
```
┌───────────────────────────────┐
│███████████████████████████████│
│██          ✓✓✓             ██│ ← ใหญ่มาก, อ่านจากระยะแขน
│██        สำเร็จ              ██│
│██     APPROVED              ██│
│██   ☕ กาแฟฟรี 1 แก้ว        ██│ ← รางวัลที่ต้องส่งมอบ (ตัวเด่น)
│██   ลูกค้า: คุณ A***          ██│
│██   ⏱ เสร็จใน 2.1 วิ         ██│
│██     [ ยิงคนถัดไป ]         ██│ ← กลับ default ใน 4 วิอัตโนมัติ
│███████████████████████████████│
└───────────────────────────────┘
  + เสียง "ติ๊ง" + สั่น 1 ครั้ง · ไม่โชว์ ฿/take-rate/COIN math
```

#### 3.2.e สถานะ REJECTED — แดงเต็มจอ + เหตุผลสั้นที่ "ทำต่อได้" + เสียงต่าง:
```
┌───────────────────────────────┐
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│▓▓          ✕               ▓▓│
│▓▓       ใช้ไม่ได้           ▓▓│
│▓▓  รหัสหมดอายุ              ▓▓│ ← เหตุผล 1 บรรทัด (ตัวอย่างสลับได้):
│▓▓  ให้ลูกค้ากดสร้างใหม่      ▓▓│   • รหัสหมดอายุ → ขอใหม่
│▓▓   [ ลองสแกนใหม่ ]         ▓▓│   • ใช้ไปแล้ว → รางวัลนี้ถูกใช้แล้ว
│▓▓   [ พิมพ์รหัสแทน ]        ▓▓│
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
└───────────────────────────────┘
  + เสียง "บั๊ซ" (ต่างจากสำเร็จชัด)
```

> **FIX major (critique): geofence false-block — ห้ามให้ GPS ลูกค้าที่ drift กลายเป็น REJECTED ที่เคาน์เตอร์.**
> ในตึกคอนกรีตนิมมาน GPS ลูกค้า drift 50–150m เป็นปกติ → ถ้าใช้ geofence ของ "ลูกค้า" เป็น gate จะ false-reject ลูกค้าที่ยืนอยู่หน้าเคาน์เตอร์จริง — เป็น false-negative บนช่วงเวลา trust-critical ที่สุด.
> **กฎใหม่:**
> 1. **เชื่อ geofence ของ "อุปกรณ์ merchant/เคาน์เตอร์" (ตำแหน่งคงที่ verify ได้) เป็น gate หลัก** แทน GPS ลูกค้าที่ drift.
> 2. รัศมี redeem-time ใช้ค่ากว้างพอสำหรับ indoor.
> 3. **แยก "GPS อ่อน/ไม่ได้สัญญาณ" ออกจาก "อยู่ไกลจริง"** — สัญญาณอ่อน **ไม่** อ่านว่า fraud.
> 4. กรณีลูกค้ายืนยันว่าอยู่จริงแต่ GPS ยังเพี้ยน → **staff-override path → route เข้า async review** (ไม่ใช่ hard red reject). เห็นในตาราง error ด้านล่าง ("weak-GPS").

#### 3.2.f สถานะที่ 3 — HOLD / ต้องตรวจสอบเพิ่ม (อำพัน, FIX completeness-major: self-redeem A.8.12 + velocity soft-freeze ไม่เคยมีจอ — ต้องไม่ดูเหมือน reject)
```
┌───────────────────────────────┐
│▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│  ← พื้นอำพัน/เทา, รูปทรง ⏸ ต่างจาก ✓ และ ✕
│▒▒          ⏸               ▒▒│
│▒▒    ต้องตรวจสอบเพิ่มเติม     ▒▒│
│▒▒  ระบบขอตรวจรายการนี้ก่อน    ▒▒│
│▒▒  ❗ ยังไม่ต้องส่งของ        ▒▒│ ← ชัดว่า "พัก" ไม่ใช่ "ปฏิเสธ"
│▒▒  แจ้งทีมงาน / ติดต่อ support▒▒│
│▒▒   [ แจ้งทีมงาน ]           ▒▒│ ← ไม่มีปุ่ม "ลองใหม่" (ไม่ใช่ retry loop)
│▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│
└───────────────────────────────┘
  เสียง "ตึ่ง" กลาง (ต่างจากทั้งสำเร็จ/ผิด) · ใช้ร่วมกับ velocity soft-freeze
  บอกลูกค้า: "ขอเวลาตรวจสักครู่ครับ ทีมงานกำลังดูให้"
```

#### 3.2.g OTP fallback (มือเปื้อน / กล้องเสีย / จอแตก — เจ้าของ "อ่านเลขด้วยตา"):
```
┌───────────────────────────────┐
│  ลูกค้าโชว์เลข 6 หลัก          │
│  พิมพ์ลงด้านล่าง               │
│   ┌───┬───┬───┬───┬───┬───┐   │
│   │ 4 │ 8 │ 2 │ _ │ _ │ _ │   │ ← ตัวเลขใหญ่ keypad ตัวเลขเด้งทันที
│   └───┴───┴───┴───┴───┴───┘   │
│   รหัสหมุนทุก 30 วิ → replay ไม่ได้
│        [ ยืนยัน → ]            │
└───────────────────────────────┘
  เส้นทางนี้ต้องพิสูจน์ได้ว่า <5 วิ ด้วยตัวเอง (guaranteed fallback)
```

#### 3.2.h Offline-tolerant queue (เน็ตร้านหลุด — Nimman wifi งอแง):
```
┌───────────────────────────────┐
│ 🔴 ออฟไลน์ — เก็บคิวไว้ 2 รายการ│ ← แถบสถานะเปลี่ยนเป็นแดง/เทา
├───────────────────────────────┤
│  ⏳ รอยืนยัน — อย่าเพิ่งบอกว่า  │
│     จ่ายแล้ว                   │ ← ห้ามแสดง "สำเร็จ" จนกว่า server ตอบ
│  • คุณ A*** · กาแฟฟรี · 09:41  │
│  • คุณ B*** · เค้ก   · 09:43  │
│  จะยืนยันอัตโนมัติเมื่อเน็ตกลับ │
│  [ ลองเชื่อมต่อใหม่ ]          │
└───────────────────────────────┘
  REDEEM = online-only (server-burn) · offline แค่ queue ไม่ยืนยัน
```

**สิ่งที่ต้องเกิดหลังบ้าน (server-side burn — ห้าม trust client):**
1. ลูกค้ากด "ใช้รางวัล" ในแอป → สร้าง **rotating QR/OTP**: TTL ~60 วิ, **หมุนทุก 30 วิ**, ผูก `redemption_intent_id`. **(เงื่อนไข: consumer ออกโค้ดได้เฉพาะรางวัลที่ claimable จริง — กัน "ยังไม่ครบ quest" หลุดมาถึงเคาน์เตอร์, ดู error map ด้านล่าง.)**
2. staff สแกน/พิมพ์ → server ตรวจ: (a) code ยังไม่หมดอายุ (b) **geofence ผ่านโดยอิงอุปกรณ์ merchant/เคาน์เตอร์ + รัศมี indoor กว้าง** (PostGIS) (c) Coin **พอ** + ยัง **unexpired** (FIFO lot, `expires_at > now()` ที่ burn-time) (d) **ยังไม่เคย burn** (`one_reversal_per_target` / nonce single-use).
3. ผ่าน → **REDEEM** server-burn: `Dr coin_liability / Cr user_coin` (COIN) + `Dr coin_backing(funder) / Cr platform_revenue (take-rate ~12%) + Cr merchant_payable(ร้านที่ให้ของ 88%)` (THB). → จอเขียว.
4. **anti-self-redemption gate (A.8.12):** ถ้า redeeming_merchant == funder ของ lot หรือ user ผูก KYC/device/payment เดียวกับ funder → route ไป manual review (กัน cash-out วงใน) — ฝั่ง counter ขึ้น **HOLD (3.2.f)** ไม่ใช่เขียว/แดง.

**Error states (map เหตุผล → ข้อความ "ทำต่อได้" ภาษาชาวบ้าน):**

| สาเหตุ (server) | จอแสดง | สิ่งที่ staff ทำต่อ |
|---|---|---|
| **expired nonce** (เกิน 60 วิ / หมุนไปแล้ว) | REJECTED "รหัสหมดอายุ" | ให้ลูกค้ากดสร้างรหัสใหม่ |
| **weak-GPS** (สัญญาณอ่อน, แยกจาก "ไกลจริง") | REJECTED-soft "สัญญาณตำแหน่งอ่อน" | ใช้ **staff-override → async review** (ลูกค้าอยู่จริง) |
| **genuinely far** (นอกรัศมี indoor กว้าง) | REJECTED "อยู่ไกลจากร้าน" | เช็คว่าลูกค้ามาที่ร้านจริง / เปิด location |
| **reward not yet claimable** (ไม่ควรหลุดมาถึงนี่) | REJECTED-neutral "รหัสนี้ยังใช้ไม่ได้ — ให้ลูกค้าตรวจในแอป" | **ไม่เปิดเผย quest internals** ของลูกค้า (FIX major) |
| **already redeemed / reversed** | REJECTED "รางวัลนี้ถูกใช้แล้ว" | ปฏิเสธสุภาพ |
| **coin expired** (lot หมดอายุที่ burn-time) | REJECTED "รางวัลหมดอายุแล้ว" | — |
| **self-redeem flagged** (A.8.12) | **HOLD (3.2.f)** "ต้องตรวจสอบเพิ่มเติม" | ไม่ส่งของ, แจ้งทีมงาน |
| **velocity soft-freeze** (redeem พุ่งผิดสถิติ) | **HOLD (3.2.f)** "พักออกรางวัลชั่วคราว" | ติดต่อ support |
| **trust < FINANCE_VERIFIED** | REJECTED "ร้านยังออกรางวัลไม่ได้ — ยืนยันการเงินก่อน" | เปิด dashboard ยืนยัน (3.1.b) |
| **offline** | "⏳ รอยืนยัน" (ไม่ใช่ ✓) | อย่าเพิ่งบอกลูกค้าว่าจ่ายแล้ว |

> **FIX major (critique: insufficient-coins leak):** เดิม error "ทำ quest ไม่ครบ" เปิดเผย progress ส่วนตัวของลูกค้าให้ร้าน + บังคับเจ้าของอธิบายกลไก loyalty กลาง rush. **แก้:** (1) gate การออกโค้ดฝั่ง consumer — รางวัลที่ claim ไม่ได้ **ห้ามผลิตโค้ดถึงเคาน์เตอร์**; (2) ถ้ายังหลุดมา → แสดง neutral "รหัสนี้ยังใช้ไม่ได้ — ให้ลูกค้าตรวจในแอป" โดย **ไม่เผย quest internals**.

**Components ที่ต้องมี:** camera-warming skeleton · camera-denied/LINE-blocked → OTP-primary surface + re-grant · ปุ่มสแกนยักษ์ (≥25% สูงจอ) · live camera preview · **VALIDATING loading state** · rotating-code/OTP display · ผลลัพธ์เต็มจอ **3 แบบแยกด้วยรูปทรง+สี+ไอคอน+เสียง+haptic** (เขียว ✓ / แดง ✕ / อำพัน ⏸) · OTP keypad ตัวเลขใหญ่ · offline queue banner · staff identity chip (role `cashier`) · auto-return หลังสำเร็จ ~4 วิ.

**ออกแบบเพื่อ <5 วิ + ผู้ใช้ไม่เชี่ยวเทคโนโลยี:**
- **เปิดมาเจอกล้อง/OTP เลย** — แต่ **OTP เป็น guaranteed path** ถ้ากล้องไม่พร้อม (ไม่ dead-end).
- **glanceable ข้ามไหล่:** ผลลัพธ์ใช้ **รูปทรง+สี+ไอคอน+เสียง** พร้อมกัน อ่านได้จากระยะแขนกลางแดด.
- **PIN ปลด session ยาว** แทน login ทุกครั้ง; `cashier` ไม่เห็นเงิน/bank/analytics.
- **ไม่มีตัวเลข ledger/฿/COIN math ให้สับสน** — counter แสดงแค่ "รางวัลอะไร + สำเร็จ/พัก/ไม่".
- ทุกข้อความ error = "ทำต่อได้" (บอกขั้นถัดไป) ไม่ใช่ error code.

**i18n / a11y:** UI หลัก locale-active (staff ตั้งครั้งเดียว); ชื่อรางวัลแสดงตามภาษาที่ตั้ง. ผลลัพธ์ไม่พึ่งสีล้วน (✓/✕/⏸ + ข้อความ + เสียง/haptic ต่างกัน — รองรับตาบอดสี + ร้านเสียงดัง). ปุ่มใหญ่พอสำหรับ motor-impaired + มือเปื้อน. `aria-live="assertive"` ประกาศผล APPROVED/REJECTED/HOLD. รองรับ one-handed (ปุ่มหลักครึ่งล่าง). กล้องถูกปฏิเสธ → OTP keypad อัตโนมัติ + ปุ่มขอสิทธิ์ใหม่.

---

### 3.3 หมายเหตุ build / cross-subsystem hooks

- **Web:** Next.js + Refine ต่อ Supabase ตรง — Refine resources ต่อ 1 เมนู, `accessControlProvider` บังคับ capability matrix (3.0), `auditLogProvider` เก็บ Change Proposal + verification decision (append-only).
- **Counter PWA:** route **แยก** จาก Refine admin. PWA manifest + service worker สำหรับ offline queue + add-to-home-screen; **pre-warm getUserMedia ตอน launch**; detect LINE in-app browser → OTP-primary fallback + แนะ "เปิดใน Chrome/Safari".
- **Auth:** merchant login = LINE (Thai) / email-password / (Apple-Google ถ้าทำ); staff `cashier` ผูก `merchant_user` + PIN. Signup entry + deep-link claim landing = **3.1.a**.
- **ทุก write ฝั่ง merchant** (content/deal/hours/pin) = Change Proposal เข้า moderation queue เดียวกับ Field Agent (§5); merchant-verified ได้ trust weight สูง.
- **RLS:** ทุก query scope `merchant_id` + `city_id` ตั้งแต่ migration #1 (multi-tenant + multi-city).
- **Re-verify trigger:** เปลี่ยน payout bank/owner/เบอร์หลัก → PAYOUT_FROZEN + step-up auth + แจ้งทุกช่อง (กัน account-takeover ดูด escrow) — UI ที่ **3.1.i**.
- **★ Orphan dependency (จาก critique completeness-critical — อยู่นอก section นี้ ต้องสร้างแยก):** **Admin/Moderator console** ที่รับ (1) Change-Proposal review (diff+evidence+EXIF/geo/pHash, approve/reject/request-more, SoD author≠moderator); (2) Merchant **Gate 1 Identity-verify** + **Gate 2 Finance-verify** (ผู้ตรวจคนละคน). หน้าจอ merchant ใน section นี้ผลิต `change_proposals(status=pending)` และรอผลจาก console นั้น — **ถ้าไม่สร้าง console, pending จะค้างไม่มีคน resolve**. แนะนำสร้างเป็น section ใหม่บนพื้นผิว Next.js+Refine เดียวกัน.

---

## 4. Field Agent Mode — Wireframes

> **Field Agent = MODE ใน Flutter app ตัวเดียวกับ consumer** (ไม่ใช่แอปแยก) — เปิดเมื่อ JWT มี `app_metadata.app_role='field_agent'` **และ** `territory_ids[] (uuid[])` ไม่ว่าง. หลักเหล็กที่ฝังทั้ง subsystem: **Agent ไม่เคยเขียน live data — ทุก contribution เป็น `change_proposals` row ที่ผ่าน moderation (author≠moderator SoD) เสมอ; live write ตัวเดียวที่ถูกกฎหมายคือ edge-fn `apply_proposal`/`moderate_proposal` หลัง moderator approve.** นี่คือทั้ง moat (ข้อมูลสดที่ Google ทำไม่ได้) และ anti-fraud gate.
>
> **กฎ UX ของ section นี้:** anti-fraud (รูปสด · geofence 80m · EXIF · pHash) ต้อง **รู้สึกเชื่อถือได้ ไม่ใช่จับผิด** — แสดงเป็น "ตรารับรอง / progress สีเขียว" ไม่ใช่ error แดงรัวๆ และทุก gate ต้องบอก *ทำยังไงให้ผ่าน* ไม่ใช่แค่ปฏิเสธ. pay ต้องโปร่งใส **gamified** (leaderboard ระดับเขต · bounty · streak) เพื่อให้ moat เดินด้วยตัวเอง.
>
> **Schema grounding (migration #1, ชื่อ enum/column ตรง doc04):**
> - `agents(quality_score, merchant_quality_score, affiliation, status, kyc_status)` · `territories(boundary geography(POLYGON,4326), district_id)`
> - `tasks(task_type, status, reward_thb_minor /* satang */, reward_spark, clawback_status, change_proposal_id)` — `task_type` ENUM = `seed_new_place | refresh_photos | verify_hours | confirm_closed | onboard_merchant | activate_escrow | activate_real`; `task_status` ENUM = `assigned | submitted | approved | rejected`.
> - `change_proposals(target_type, diff jsonb, evidence_media_ids[], evidence_geo geography(POINT,4326), proposer_role, status, CONSTRAINT proposal_sod CHECK reviewed_by<>proposed_by)`; `proposal_status` ENUM = `pending | approved | rejected | superseded`.
> - `data_freshness(freshness_label: fresh | aging | stale, last_verified_by_agent_id, last_verified_*)` · `agent_wht_ledger` (50-ทวิ) · txn_type `AGENT_PAYOUT` / `AGENT_CLAWBACK` (reversal ผ่าน `reverses_txn_id`).
>
> **⚠ Build-ready mapping notes (เพื่อให้ wireframe ↔ schema ไม่ fork) — เป็นข้อตกลงที่ผูกใน finalize นี้:**
> 1. **Display label ≠ enum.** UI label ไทย/ENG (เช่น "VERIFY_HOURS", "VERIFY_PRICE", "ตรวจราคา") เป็น *display-only*; map กลับ enum จริง: ตรวจเวลา→`verify_hours`, ตรวจราคา→**`confirm_closed` ไม่มี enum ราคาแยก ⇒ price refresh = `change_proposals(target_type='hours')`/field-diff ภายใต้ task `verify_hours` variant** (ห้าม invent `verify_price` enum), รูป→`refresh_photos`, geo→`confirm_closed`/`seed_new_place`, ร้านใหม่→`onboard_merchant`→`activate_escrow`/`activate_real`.
> 2. **Task "lock / claim / countdown / needs-fix" = APP-LAYER.** `tasks` มีแค่ status `assigned/submitted/approved/rejected` — **ไม่มี column `claimed_by`/`lock_expires_at`**. Claim-lock + countdown เป็น state ฝั่ง orchestration (เช่น `task_locks` หรือ assignment row), ไม่ใช่ live column ที่ต้องสร้างใหม่ในนี้; wireframe annotate ที่ใช้ "lock เหลือ X ชม." = derived, server-authoritative.
> 3. **"needs-fix" = `proposal_status='superseded'` loop** (ส่ง proposal ใหม่อ้าง task เดิม) — ไม่ใช่ enum ใหม่.

---

### 4.0 Mode-Switching — Customer ↔ Agent (จุดเข้าโหมด + role-revoke fallback)

Agent หลายคนเป็น customer ด้วย (นิสิต CMU/Payap ที่ก็เดิน Cafe-Hop เอง) — สลับโหมดต้องลื่น, แต่ **โหมดต้องชัดว่าเปลี่ยน** (สี/header ต่าง) กัน action ผิดบริบท เช่นเผลอ submit proposal ตอนเที่ยวเล่น.

```
┌──────────────────────────────────────────────┐   ← Customer mode (โทนปกติ brand-amber)
│  ☰   นิมมาน · Nimman           🔔  👤        │
│ ┌──────────────────────────────────────────┐ │
│ │            [ Mapbox · discover ]          │ │
│ └──────────────────────────────────────────┘ │
│  [ EAT ] [ SEE ] [ DO ]   • Cafe-Hop quest   │
│ ──────────────────────────────────────────── │
│  Tap 👤 → bottom sheet:                       │
│  ┌────────────────────────────────────────┐  │
│  │ บัญชีของฉัน / My Account               │  │
│  │  💎 Wallet   🎫 Passport   ⚙ Settings  │  │
│  │ ───────────────────────────────────── │  │
│  │  🛠  สลับเป็นโหมด Field Agent          │  │ ← render เฉพาะเมื่อ JWT app_role='field_agent'
│  │      Switch to Agent Mode  · 切换代理   │  │   + territory_ids ไม่ว่าง (JWT+RLS gate;
│  │      ● 3 งานวันนี้ · ฿128 รออนุมัติ     │  │    client ไม่ตัดสินเอง). ตัวเลข = teaser ดึงสลับ
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
        │  tap → confirm sheet ("เข้าโหมดทำงาน?") → mode flips
        ▼
┌──────────────────────────────────────────────┐   ← AGENT mode (header teal/เข้ม + แถบ "AGENT")
│ 🛠 AGENT · CNX-NIMMAN          [↩ ออกโหมด]   │
│ ...(Agent Home §4.1)...                       │
└──────────────────────────────────────────────┘
```

**FALLBACK — role ถูกถอน (suspend) กลางทาง** *(เพิ่มใหม่: critique ระบุว่า §4.0 พูดถึงเคสนี้แต่ไม่มี wireframe)*

```
┌──────────────────────────────────────────────┐   ← เด้งกลับ Customer mode อัตโนมัติ
│  ☰   นิมมาน · Nimman           🔔  👤        │
│ ┌────────────────────────────────────────┐   │
│ │ ⚠ สิทธิ์ Field Agent ถูกระงับชั่วคราว    │   │ ← non-blocking banner (ไม่ใช่ modal กั้น)
│ │   งานที่ค้าง/เงินที่รออนุมัติยังอยู่ในระบบ │   │   ใช้ neutral/info tone ไม่ใช่แดง shaming
│ │   [ ดูเหตุผล/ติดต่อ City Manager → ]      │   │ → เปิด support_ticket kind=agent_dispute
│ └────────────────────────────────────────┘   │
│            (โหมด customer ใช้งานได้ตามปกติ)     │   ปุ่ม "สลับเป็น Agent" หายไป (ไม่ render)
└──────────────────────────────────────────────┘
```

- **เป้าหมายผู้ใช้:** สลับเข้า/ออกโหมดทำงาน โดยไม่หลงว่าตอนนี้อยู่โหมดไหน; ถ้าโดนระงับ ก็ไม่ค้างในโหมดที่ไม่มีสิทธิ์.
- **ต้องเกิดอะไร:** entry แสดงเฉพาะเมื่อ JWT `app_role='field_agent'` **และ** `territory_ids` ไม่ว่าง (gate ที่ claim + RLS). สลับโหมด = re-route ภายใน app (ไม่ logout); state เดิม (cart/quest customer) คงไว้. Agent header เปลี่ยน **สี teal + แถบป้าย "AGENT" ถาวร** = affordance ว่าอยู่โหมดทำงาน.
- **Edge/role-revoke:** role ถูกถอน → `claims_ver` mismatch ตอน refresh token → ปุ่ม "สลับ" หาย + ถ้ากำลังอยู่ในโหมด agent ให้ **เด้งกลับ customer mode + banner info** (รูปบน) ไม่ใช่ kick ออกจากแอป; งานค้าง/pay-accrual ไม่หาย (due process). ไม่มี territory active → เข้าโหมดได้แต่ Home = empty-state (§4.1).
- **i18n/a11y:** ป้ายโหมด 3 ภาษา; affordance = **ไอคอน 🛠 + สี teal + ข้อความ "AGENT"** (ไม่พึ่งสีอย่างเดียว เผื่อ color-blind). teaser ตัวเลขใช้ locale number format; banner ระงับสิทธิ์มี `aria-live="polite"`.

---

### 4.0a Becoming an Agent — Onboarding / Playbook (จุดกำเนิดของ role)

> *เพิ่มใหม่ (critique completeness: role-gated mode-switch §4.0 ไม่มี origin ที่ไปถึงได้; "playbook" ถูกอ้างใน §4.1/§4.2/§4.4/§4.6 แต่ไม่เคยวาด).*
> **Role-acquisition path:** customer **ไม่ได้** กดเป็น agent เองในแอป. การได้ `app_role='field_agent'` = **City Manager assignment** (หรือ referral → application → manual approve) → ตั้ง `agents` row + ออก `territories` + bump `claims_ver` → claim ใหม่รอบ refresh (≤ TTL 15 นาที) → ปุ่มสลับโหมดโผล่. นี่คือ control ที่ทำให้ supply-side มี gatekeeper จริง (ไม่ใช่ open self-serve = anti-Sybil ตั้งแต่ต้นทาง).

```
ENTRY (จาก deep-link คำเชิญ City Manager / banner "สมัครเป็น Field Agent")
┌────────────────────────────────────────────────────────┐
│ 🛠 เป็น Field Agent ที่นิมมาน                            │
│  เก็บข้อมูลร้านสด · พาร้านใหม่เข้าระบบ · ได้ค่าตอบแทน    │
│  ┌──────────────────────────────────────────────────┐  │
│  │ ▶ Playbook 90 วิ (TH/EN/ZH)                       │  │ ← วิดีโอ/สไลด์ "งานคืออะไร จ่ายยังไง"
│  │   • งานมาจาก Freshness SLA — ไม่ต้องหาเอง          │  │
│  │   • ทุกชิ้น = "ข้อเสนอแก้ไข" รอ moderator ตรวจ     │  │
│  │   • จ่าย PromptPay รายสัปดาห์ หัก WHT 3% (50-ทวิ)  │  │
│  └──────────────────────────────────────────────────┘  │
│  สถานะของฉัน:                                           │
│   ✅ ได้รับเชิญจาก City Manager (CNX-NIMMAN)            │ ← assignment-driven, ไม่ใช่ self-serve
│   🔲 ยืนยันตัวตน (KYC) — จำเป็นก่อนรับงานเงิน           │ ← agents.kyc_status; payout ต้อง kyc=verified
│   🔲 ผูกบัญชี PromptPay (payout_account_enc)            │
│            [ เริ่มยืนยันตัวตน → ]                        │
└────────────────────────────────────────────────────────┘
```

- **ต้องเกิดอะไร:** assignment โดย City Manager เขียน `agents` + `territories` → emit claim. KYC + payout-bind เป็น precondition ของ **การรับเงิน** (ไม่ใช่ของการรับงาน verify เล็กๆ — รับงานทำได้, แต่ `AGENT_PAYOUT` ถูก hold จน `kyc_status='verified'`). ทุก empty-state ใน §4.1/§4.4/§4.6 ที่อ้าง "playbook" ลิงก์มาที่จอนี้.
- **Edge:** ถูกเชิญแต่ยังไม่ KYC → เข้าโหมดได้, Home แสดง banner "ยืนยันตัวตนเพื่อรับเงินงานแรก". ถูกเพิกถอน assignment → §4.0 fallback.
- **i18n/a11y:** playbook + checklist 3 ภาษา; checklist ใช้ icon ✅/🔲 + label (ไม่พึ่งสี).

---

### 4.1 Agent Home — Territory Map + Freshness Heatmap + วันนี้

หน้าแรกของโหมด: เห็น **เขตตัวเอง (Nimman polygon)** ทันที, pin สีตาม freshness, งานวันนี้, รายได้สะสม + accept-rate. แดง = ข้อมูลเคยตรวจแล้วเริ่มเน่า (= เงินรออยู่); **ขาว = ยังไม่เคยตรวจ/coverage gap** (คนละความหมายกับแดง).

```
┌────────────────────────────────────────────────────────┐
│ 🛠 AGENT · CNX-NIMMAN              ⚖ Probation  [↩]    │ ← trust tier (Probation/Verified/Senior)
│ ┌────────────────────────────────────────────────────┐ │
│ │            ╔═══ Territory: Nimman Soi 1–17 ═══╗     │ │ ← territories.boundary (PostGIS polygon)
│ │            ║  ● ● fresh(เขียว)                ║     │ │   overlay บน Mapbox
│ │            ║   ◍ aging(เหลือง)  ◉◉ STALE(แดง) ║     │ │ ← data_freshness.freshness_label → สี
│ │            ║  ◉ ← "Ristr8to · hours 41วัน"   ║     │ │   tap pin = peek staleness/field ที่เน่า
│ │            ║   ▢ ยังไม่เคยตรวจ (ขาว ขอบทึบ)  ║     │ │ ← NEVER-VERIFIED (มีใน places แต่ freshness
│ │            ║   ⬚ coverage gap (เทา ขอบประ)   ║     │ │    ไม่เคย verified) — แยกจาก stale แดง
│ │            ╚══════════════════════════════════╝     │ │ ← gap (เทา) = ยังไม่มี row ใน places เลย
│ │  [🔥 Heatmap] [📍 Pins]  ◯ ของฉัน  ⊕ recenter      │ │ ← toggle heatmap vs pin
│ └────────────────────────────────────────────────────┘ │
│  ┌─ Freshness เขตนี้ ─────────────────────────────────┐ │
│  │  ตรวจแล้ว: 78% 🟡 ▓▓▓▓▓▓▓░░ (เป้า ≥90%)           │ │ ← เขียว≥90 / เหลือง75–89 / แดง<75
│  │  🔴 Stale (เคยตรวจ→เน่า): ⏰6 · 💰4 · 📷2          │ │ ← stale breakdown by field → "งานรอเงิน"
│  │  ⬜ ยังไม่เคยตรวจ: 5 ร้าน · ⬚ ยังไม่มีในระบบ: ~3   │ │ ← never-verified & gap แยกบรรทัด (trust จริง)
│  └────────────────────────────────────────────────────┘ │
│  ┌─ วันนี้ / Today ───────────────────────────────────┐ │
│  │  📋 งานที่รับไว้ 3   ·   ⏳ lock เหลือ 5ชม.        │ │ ← lock = app-layer (derived, server-auth)
│  │  💰 วันนี้: ฿128 accrued · ฿0 paid               │ │ ← accrued = ผ่าน approve รอ QA+รอบจ่าย
│  │  ✅ Accept-rate (30วัน): 88%  ×1.2 ▲             │ │ ← multiplier 0.8×–1.5× โปร่งใส
│  └────────────────────────────────────────────────────┘ │
│ ┌──────────────┬──────────────┬───────────────────────┐ │
│ │ 📋 งาน Tasks │ 📤 ส่งแล้ว    │ 💰 รายได้  🏆 อันดับ  │ │ ← bottom nav (Agent)
│ └──────────────┴──────────────┴───────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

- **เป้าหมายผู้ใช้:** เห็นทันทีว่า "เขตฉันมีอะไรเน่า / อะไรยังไม่เคยตรวจ / ฉันได้เงินเท่าไหร่ / วันนี้เหลืออะไร".
- **ต้องเกิดอะไร:** map โหลด territory polygon (RLS `district_id = any(auth_scope.territory_ids())`). pin/heatmap ระบายสีจาก `freshness_label`. **แยก 3 สถานะ trust ให้ชัด** (critique major — "stale=null collapse"): 🔴 **stale** = เคย verified แล้วเกิน SLA; ⬜ **never-verified** = มี `places` row แต่ `data_freshness.last_verified_*` IS NULL (อย่าโฆษณาว่า "อาจไม่อัปเดต" เพราะมันคือ "ยังไม่เคยตรวจ"); ⬚ **coverage gap** = ยังไม่มี row ใน `places` เลย. `accept_rate` + multiplier แสดง **โปร่งใส** เพราะมันคูณค่าจ้างจริง.
- **Edge/empty:** **ยังไม่มี territory** → empty-state "ยังไม่ได้รับมอบเขต — ติดต่อ City Manager" + ปุ่มเปิด **playbook (§4.0a)**. **GPS off / นอกเขต** → map read-only + banner "อยู่นอกเขต — รับงานได้ แต่ submit ต้องอยู่ในจุด ≤80m". **offline** → snapshot ล่าสุด + ป้าย "ออฟไลน์ · ข้อมูลอาจไม่อัปเดต".
- **Anti-fraud-feels-trustworthy:** heatmap framing = "ช่วยกันทำให้เขตเขียว" (collaborative) ไม่ใช่ surveillance. **ไม่โชว์ตำแหน่ง agent คนอื่นแบบ real-time** (PDPA C.3: เก็บ fact ไม่เก็บ movement graph).
- **i18n/a11y:** trust badge + ตัวเลขทุกตัว 3 ภาษา; freshness **สีคู่กับ icon/label เสมอ** — 🟢fresh / 🟡aging / 🔴stale / ⬜never-verified / ⬚gap (5 สถานะแยกด้วยรูปทรง+label ไม่พึ่งสี เผื่อ color-blind); map markers มี text label เปิดได้ + รายการ list-equivalent.

---

### 4.2 Task List — เรียงตาม SLA staleness + anti-cherry-pick ratio

งานไม่ได้เกิดจาก agent กดสร้าง — **scheduler generate จาก Freshness SLA** (MVP: City Manager assign manual) แล้ว enqueue เป็น `tasks(status='assigned')`. เรียงตาม `priority_score` (อายุเกิน SLA × traffic). บังคับ **ratio**: จะแตะงานเงินดี (onboard/activate) ต้องเคลียร์ verify เงินน้อยตามโควตา.

```
┌────────────────────────────────────────────────────────┐
│ 🛠 งาน Tasks · Nimman          ▾ เรียง: SLA เก่าสุด     │
│ ┌── Ratio meter (anti-cherry-pick) ──────────────────┐ │
│ │ เคลียร์ VERIFY 2/3 เพื่อปลดงาน ONBOARD 💰          │ │ ← server-side gate (ไม่ใช่ client-only)
│ │ ▓▓▓▓▓▓░░░  ⓘ ทำไม?                                 │ │ ← ⓘ = "ช่วยให้เขตไม่เน่า ไม่ใช่ลงโทษ"
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│ ⏰ ตรวจเวลา (verify_hours)·Ristr8to     🔴 stale 41วัน │ ← SLA hours=30วัน → เกิน → แดงบนสุด
│    📍 240 ม.·Soi 3   ฿8–15 · +20✨        [ รับงาน ]   │   reward_thb_minor / reward_spark
│ ─────────────────────────────────────────────────────  │
│ 💰 ตรวจราคา (hours-diff)·Graph Cafe      🟡 aging 28วัน│ ← display "ตรวจราคา"; enum= verify_hours/
│    📍 90 ม.·Soi 1    ฿8–15 · +20✨        [ รับงาน ]   │   confirm + change_proposal target='hours'
│ ─────────────────────────────────────────────────────  │
│ 📷 อัปรูป (refresh_photos)·Cottontree    🔴 stale 96วัน│ ← SLA photos=90วัน
│    📍 310 ม.·Soi 11  ฿15–25 · +30✨       [ รับงาน ]   │
│ ─────────────────────────────────────────────────────  │
│ 🆕 ตรวจร้านใหม่ (seed_new_place)·"Soi 7" ⬜ ยังไม่เคยตรวจ│ ← never-verified ≠ stale (ไม่ติดแดง)
│    📍 110 ม.·Soi 7   ฿15–25 · +30✨       [ รับงาน ]   │
│ ─────────────────────────────────────────────────────  │
│ 🏪 พาร้านเข้าระบบ (onboard_merchant)·"ร้านใหม่ Soi 7" 🔒 ล็อก│ ← เงินดีสุด ล็อกจนเคลียร์ ratio
│    📍 coverage gap   ฿40–70 · activate +฿120–250      │   place_id NULL = ร้านใหม่
│    🔒 เคลียร์ VERIFY อีก 1 งานเพื่อปลด                  │
│ ─────────────────────────────────────────────────────  │
│ 🔁 งานที่รับไว้ (lock) ────── ⏳ เหลือ 4ชม. 12น.       │ ← lock/countdown = APP-LAYER (no
│    ⏰ ตรวจเวลา·Akha Ama              [ ทำต่อ → ]       │   tasks.lock_expires_at column; derived)
└────────────────────────────────────────────────────────┘
```

- **เป้าหมายผู้ใช้:** เห็นงานคุ้ม-ใกล้-ด่วนก่อน, รู้ว่าต้องทำอะไรเพื่อปลดงานเงินดี.
- **ต้องเกิดอะไร:** เรียง default = `priority_score` (อายุเกิน SLA มากสุด/แดงสุดบน). ป้าย staleness map `task_type` ↔ SLA (hours/price 30วัน, photos 90วัน, geo on-change). **never-verified ใช้ป้าย ⬜ ไม่ใช่ 🔴** (อย่าทำให้ "ยังไม่เคยตรวจ" ดูเหมือน "เน่า"). ปุ่ม **รับงาน** = claim-lock 24–72h (app-layer assignment/`task_locks`, **ไม่ใช่ column ใหม่บน `tasks`**); primary agent ได้สิทธิ์ก่อน 6 ชม. แล้วเปิด pool. **Ratio meter บังคับจริง server-side**: onboard/activate ถูกล็อกจนเคลียร์ verify ตามโควตา (client meter = mirror ของ server verdict).
- **Edge/empty:** **คิวว่าง** → "เขตคุณสดทั้งหมด 🎉 +micro-bonus" (freshness retention = รายได้ recurring). **lock หมดเวลา** → งานเด้งกลับ pool + toast (ไม่ลงโทษ). **รับงานชนคนอื่น** (race) → "งานนี้เพิ่งถูกรับ" + refresh.
- **Anti-fraud-feels-trustworthy:** ratio อธิบายด้วย ⓘ "ทำไม?" = กติกาเกม ไม่ใช่กำแพง.
- **i18n/a11y:** task type มี icon + ชื่อ 3 ภาษา; ระยะ/เวลา/เงิน locale-formatted; countdown มี `aria-live` สำหรับ screen reader.

---

### 4.3 Submit Flow — Camera-only · GPS 80m · EXIF · pHash · เป็น Change Proposal (ไม่ใช่ live)

หัวใจ anti-fraud ของ supply side. ทุก gate AND กัน — ไม่ผ่านข้อใด = แอป **ไม่ยอม submit** (client block + **server re-verify เสมอ — client เชื่อไม่ได้**). UX framing = "ตรารับรอง" สีเขียวเมื่อผ่าน → รู้สึกเหมือนสะสมแสตมป์ ไม่ใช่ด่านตรวจ.

```
STEP 1 — GEOFENCE + CAMERA (gate รวมในจอเดียว)
┌────────────────────────────────────────────────────────┐
│ ⏰ ตรวจเวลา · Ristr8to Coffee               [ ✕ ปิด ]  │
│ ┌────────────────────────────────────────────────────┐ │
│ │                                                    │ │
│ │           [ LIVE CAMERA viewfinder ]               │ │ ← in-app camera เท่านั้น
│ │        📸 ถ่ายป้ายเวลาเปิด–ปิดหน้าร้าน              │ │   ❌ ไม่มีปุ่มเปิด gallery (block import)
│ │                                                    │ │
│ │   ┌──────────────────────────────────────────┐    │ │
│ │   │ 🟢 GPS: อยู่ในจุด · 38 ม. จากร้าน ✓       │    │ │ ← ST_DWithin(places.geo, dev, 80) → เขียว
│ │   └──────────────────────────────────────────┘    │ │   (>80m → 🔴 "เข้าใกล้ร้านอีก 12 ม.")
│ │                    (   ◉  ถ่าย   )                 │ │ ← shutter (disabled จนกว่า GPS เขียว)
│ └────────────────────────────────────────────────────┘ │
│  ตรารับรอง:  📍80m  📷สด  🕓EXIF  #️⃣ไม่ซ้ำ           │ ← 4 ดวง ทยอยเขียวเมื่อผ่าน
│             🟢      ⚪    ⚪     ⚪                      │   (label อยู่ใต้ทุกดวง — ไม่พึ่งสี)
└────────────────────────────────────────────────────────┘
        │ ถ่าย → ตรวจ EXIF(≤N นาที + GPS-in-EXIF≈device) + pHash dedup
        ▼  (ผ่านครบ → ดวง 2–4 เขียว)
STEP 2 — DIFF / FORM (before → after)
┌────────────────────────────────────────────────────────┐
│ ✏️ แก้ข้อมูล: เวลาเปิด–ปิด                              │
│ ┌─ before (live) ──────┐   ┌─ after (คุณกรอก) ───────┐ │
│ │ จ–ศ 08:00–17:00      │ → │ จ–ศ 07:30–18:00 ✏️      │ │ ← diff jsonb {field:{before,after}}
│ │ ส–อา —               │ → │ ส–อา 08:00–18:00 ✏️     │ │
│ └──────────────────────┘   └──────────────────────────┘ │
│  📷 รูปแนบ: [thumb สด ✓]  + เพิ่ม                       │ ← evidence_media_ids[]
│  ตรารับรอง:  📍🟢  📷🟢  🕓🟢  #️⃣🟢   ครบ 4/4 ✓      │
│ ┌────────────────────────────────────────────────────┐ │
│ │  ⓘ ส่งเป็น "ข้อเสนอแก้ไข" — ทีม moderator ตรวจ     │ │ ← ย้ำไม่ใช่ live write
│ │     ก่อนขึ้นจริง (ปกติ < X ชม.) ไม่ทับของเดิม      │ │
│ └────────────────────────────────────────────────────┘ │
│       [   📤 ส่งข้อเสนอ / Submit Proposal   ]          │ ← INSERT change_proposals(status='pending')
└────────────────────────────────────────────────────────┘
```

> **งานเสี่ยงสูง (onboard_merchant / activate_*):** เพิ่ม gate **Liveness** — ถ่าย "หน้าร้าน + ป้ายชื่อ".
> *(แก้ตาม critique minor — random-angle อาจถ่ายไม่ได้จริงในซอยแคบ):* มุมเป็น **"แนะนำ" ไม่ใช่บังคับตายตัว** → prompt: "ถ้าได้ ถ่ายจากด้านซ้ายให้เห็นป้าย+ประตู" + **fallback: "ถ่ายไม่ได้มุมนี้? ถ่ายมุมภายนอกที่ต่างกัน 2 มุมแทน"**. server ให้คะแนน multi-angle freshness แทนการบังคับ framing เดียว — **ห้ามกลายเป็น client-side block ที่ทำตามไม่ได้**. ตรารับรองเพิ่มดวงที่ 5 🤳 (liveness) แบบ "ผ่านได้หลายทาง".

- **เป้าหมายผู้ใช้:** เก็บหลักฐานหน้างานจริง → ส่งแก้ไข → ได้เงินเมื่อ approve.
- **ต้องเกิดอะไร (gates AND ทั้งหมด, server re-verify เสมอ):** (1) GPS `ST_DWithin(places.geo, ≤80m)` → shutter ปลดล็อก; (2) **camera-only** ไม่มี gallery import; (3) EXIF timestamp ≤ N นาที + GPS-in-EXIF ≈ device GPS; (4) pHash dedup เทียบรูปเดิม/agent อื่น; (5) diff `before→after` ชัด + อ้าง task ที่ถือ lock; (6) liveness (preferred-angle หรือ 2-มุม fallback) สำหรับงานเสี่ยงสูง. **Output = `change_proposals` row** (`diff`, `evidence_media_ids`, `evidence_geo`, `proposer_role='field_agent'`, `status='pending'`) — **ไม่แตะ `places` live เลย**. live write ตัวเดียว = `apply_proposal` edge-fn หลัง moderator approve.
- **Edge/empty/error:** **GPS >80m** → shutter disabled + เข็มทิศ "เข้าใกล้อีก 12 ม." (นำทาง ไม่ปฏิเสธห้วน). **EXIF เพี้ยน/รูปเก่า** → "รูปนี้ไม่ใช่รูปสด ลองถ่ายใหม่" (ดวง 🕓 แดง). **pHash ซ้ำ** → "เหมือนรูปที่มีอยู่แล้ว ถ่ายมุมใหม่". **offline** → capture + GPS/EXIF stamp ตอนถ่าย → queue sync; server เทียบ `capture_ts` vs `sync_ts` + ตำแหน่ง กันถ่ายที่อื่นมา sync. **lock หมดอายุระหว่างกรอก** → เตือน + ต่อ lock อัตโนมัติถ้ายังอยู่ในจุด.
- **Anti-fraud-feels-trustworthy:** gate = **"ตรารับรอง" สีเขียวสะสม** (เกม) ไม่ใช่ error wall; ทุกข้อความบอก *ทำยังไงให้ผ่าน*. PDPA microcopy (สอดคล้อง §10.7c/§S2.4 "ไม่มี movement graph"): **"ใช้ GPS เฉพาะตอน submit เพื่อยืนยันว่าอยู่หน้าร้านจริง · ไม่สร้างแผนที่การเดินทางต่อเนื่องของคุณ"** *(แก้ตาม critique major — เลี่ยง absolute "ไม่เก็บเส้นทาง" ที่ระบบทำตามไม่ได้; ใช้คำที่ defensible + ตรงกับ consent record).*
- **i18n/a11y:** ป้าย gate + microcopy 3 ภาษา; ตรารับรองมี icon+label (ไม่พึ่งสี); shutter/GPS state มี haptic + `aria-live`; ระยะเป็น metric (เมตร) ทุก locale.

---

### 4.4 Submission Status — Moderation Queue (output side) + Pay/Clawback + Appeal โปร่งใส

agent เห็นทุก proposal ที่ส่ง: pending / approved / rejected / superseded(needs-fix) — พร้อม reason และ **เงินผูกกับแต่ละสถานะแบบโปร่งใส** (accrued → QA → paid; หรือ clawback ถ้าเจอ fraud ทีหลัง).

```
┌────────────────────────────────────────────────────────┐
│ 🛠 ที่ส่งแล้ว / My Submissions      ▾ ทั้งหมด           │
│                                                        │
│ 🟡 รอตรวจ PENDING · ตรวจเวลา · Ristr8to               │ ← change_proposals.status='pending'
│    ส่ง 2ชม.ที่แล้ว · ฿12 (accrued รออนุมัติ)          │   ยังไม่ paid
│ ─────────────────────────────────────────────────────  │
│ 🟢 อนุมัติ APPROVED · ตรวจราคา · Graph Cafe           │ ← approved → apply_proposal → live
│    ✅ ขึ้นจริงแล้ว · ฿14 accrued → 🧪 QA sampling     │   pay_accrual → รอ QA + รอบจ่าย
│    จ่ายรอบ: ศุกร์นี้ (PromptPay) · หัก WHT 3%         │ ← AGENT_PAYOUT + agent_wht_ledger (50-ทวิ)
│ ─────────────────────────────────────────────────────  │
│ 🟠 ต้องแก้ NEEDS-FIX · อัปรูป · Cottontree            │ ← proposal_status='superseded' loop
│    reason: "รูปเบลอ 2 รูป — ถ่ายใหม่ภายใน 12ชม."      │   (ส่ง proposal ใหม่อ้าง task เดิม; lock คง)
│    [ 📷 ถ่ายแก้ → ]   ⏳ เหลือ 9ชม.                    │
│ ─────────────────────────────────────────────────────  │
│ 🔴 ปฏิเสธ REJECTED · ตรวจ geo · "ร้าน Soi 9"          │
│    reason code: GPS_TOO_FAR (submit ห่าง 140ม.)        │ ← reason code มาตรฐาน โปร่งใส
│    ⚠ กระทบ accept-rate · [ อุทธรณ์ / Appeal → ]       │ → เปิดฟอร์มอุทธรณ์ (4.4a)
│ ─────────────────────────────────────────────────────  │
│ ┌─ 💸 Clawback log (โปร่งใส) ───────────────────────┐ │
│ │ 12 มิ.ย. · activate "ร้านผี Soi 5" −฿180          │ │ ← AGENT_CLAWBACK (fraud หลัง QA)
│ │ เหตุ: ร้านไม่ผ่าน finance-verify · หักรอบถัดไป     │ │   reverses_txn_id ของ bounty เดิม
│ │ ⓘ ทุก clawback เดิน ledger เดียวกับ payout         │ │   (canonical: append-only, auditable)
│ └────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

- **เป้าหมายผู้ใช้:** รู้สถานะงานทุกชิ้น + เงินอยู่ขั้นไหน + แก้งานที่ตีกลับได้ทันที + มีทางอุทธรณ์.
- **ต้องเกิดอะไร:** map `change_proposals.status` (pending/approved/rejected/superseded) → สี + การ์ด. **approved** → `apply_proposal` ขึ้น live + สร้าง pay_accrual(accrued) → QA sampling (% ตาม risk+reputation) → ผ่าน + ครบรอบ → `AGENT_PAYOUT` (PromptPay, weekly, MVP manual dual-control, WHT 3% leg + `agent_wht_ledger`) → paid. **needs-fix (superseded)** → ส่งใหม่โดยไม่เสีย lock. **rejected** → reason code + กระทบ `agents.quality_score`/accept-rate + ปุ่มอุทธรณ์. **clawback** = `AGENT_CLAWBACK` (reverses bounty txn ผ่าน `reverses_txn_id`) แสดงโปร่งใส + เหตุ + หักรอบถัดไป.
- **Cross-surface handoff (สำคัญ — critique completeness critical):** การ์ด pending/approved คือ **output ของ Moderator Console** (เครื่องที่มนุษย์เทียบ diff+evidence+EXIF/geo/pHash แล้ว approve/reject/request-more ภายใต้ SoD author≠moderator). คอนโซลนั้นเป็น **Admin/Moderator surface แยก (web, Next.js+Refine) — อยู่นอกขอบเขต §4 (agent UX) โดยตั้งใจ** และต้องมี section ของตัวเอง. §4.4 ผูกกับมันด้วย: ทุก card สถานะ = mirror ของ `change_proposals.status` + `reviewed_by`/reason จากคอนโซลนั้น. *(เหตุผลที่ไม่วาด console ในนี้: มันไม่ใช่หน้าจอที่ field agent ใช้ — วาดในนี้จะปนสอง persona; ฝากเป็น residual handoff ให้ Admin section.)*
- **Edge/empty:** ยังไม่เคยส่ง → onboarding empty-state + ลิงก์ **playbook (§4.0a)**. **QA fail** → reject ย้อนหลัง + ปรับ accept-rate + ไม่จ่าย unit นั้น (แสดงเหตุชัด). **shadow-review** (สงสัยโกง, due process) → agent ไม่รู้ตัว: ทุกงาน review 100% + ค้างจ่าย — UI ดูปกติ (กัน suspend ผิดคน).
- **Anti-fraud-feels-trustworthy:** reason code มาตรฐาน + ช่อง **อุทธรณ์เสมอ** = ยุติธรรม. clawback log เปิดเผย ("ทุกบาทเดิน ledger เดียวกัน auditable").
- **i18n/a11y:** สถานะ + reason code 3 ภาษา; สี + icon + label คู่กัน; เงิน/วันที่ locale-formatted; clawback มี `aria-label` อธิบายเต็ม.

#### 4.4a Appeal — ฟอร์มอุทธรณ์ + สถานะ *(เพิ่มใหม่: critique ระบุ CTA `[อุทธรณ์]` dead-end)*

```
┌────────────────────────────────────────────────────────┐
│ ← อุทธรณ์ผลปฏิเสธ · ตรวจ geo "ร้าน Soi 9"              │
│  ผลเดิม: 🔴 REJECTED · GPS_TOO_FAR (ห่าง 140ม.)        │ ← echo reason code ที่อุทธรณ์
│  ┌────────────────────────────────────────────────┐    │
│  │ เล่าสิ่งที่เกิดขึ้น (ทำไมคิดว่าผลไม่ถูก)         │    │ ← reason text (required)
│  │ [_____________________________________________] │    │
│  └────────────────────────────────────────────────┘    │
│  📎 แนบหลักฐานเพิ่ม (ถ้ามี): [ ถ่าย/แนบรูป ]           │ ← optional re-evidence (camera, reuse EXIF/pHash)
│  ⓘ ส่งเป็นเรื่องร้องเรียน — ทีมจะตรวจซ้ำ ไม่กระทบงานอื่น │
│            [ ส่งอุทธรณ์ / Submit Appeal ]               │ → support_ticket kind='agent_dispute'
└────────────────────────────────────────────────────────┘
   สถานะในรายการ "ที่ส่งแล้ว" หลังส่ง:
   ⚖ อุทธรณ์: รอพิจารณา → (ผล) ✅ กลับคำ / ❌ ยืนผลเดิม + เหตุ
```

- **ต้องเกิดอะไร:** submit → เปิด `support_tickets(kind='agent_dispute')` (route S1/S5). card ใน §4.4 เพิ่ม sub-state **อุทธรณ์: รอพิจารณา / กลับคำ(overturned) / ยืนผลเดิม(upheld)**. ถ้า **กลับคำ** → accept-rate/quality_score คืนค่า + ถ้าเป็นเงิน → re-accrue. ถ้า **ยืนผล** → คงเดิม + แสดงเหตุ.
- **a11y:** reason field มี label ชัด; สถานะอุทธรณ์ icon+label; ปุ่ม disabled จน reason ไม่ว่าง.

---

### 4.5 Onboard-Merchant Task — สร้าง Place · มอบ Claim Code (deep-link) · วาง earn-QR · สอน Redeem

งานเงินดีสุด (bounty ฿40–70 + activation ฿120–250). agent เปลี่ยน "ร้าน" เป็น "merchant ที่ activate จริง" หน้างาน — wizard 4 ขั้น. `merchant_claim_code` (เช่น `CNX-7F3K`) ผูก `place_id` + `territory_id` + `issued_by_agent_id` เพื่อ **attribution ของ activation bonus**.

```
STEP 1 — สร้าง Place (proposal) ────────────────────────
┌────────────────────────────────────────────────────────┐
│ 🏪 พาร้านเข้าระบบ · ร้านใหม่ Soi 7        ขั้น 1/4      │
│  📷 ถ่ายหน้าร้าน+ป้าย (liveness 🤳 — มุมแนะนำ/2มุม fallback)│ ← เหมือน §4.3 + liveness แบบยืดหยุ่น
│  ชื่อร้าน 3 ภาษา · หมวด EAT/cafe · พิกัด 📍22ม. 🟢    │
│  [ ส่ง Place เป็นข้อเสนอ ]  → รอ moderate              │ ← change_proposals(target='place', target_id NULL)
└────────────────────────────────────────────────────────┘   = task_type seed_new_place
        │ approve (apply_proposal) → ได้ verified place_id → generate claim_code
        ▼
STEP 2 — มอบ Claim Code (ต่อหน้าเจ้าของร้าน) ──────────
┌────────────────────────────────────────────────────────┐
│ 🏪 พาร้านเข้าระบบ · ร้านใหม่ Soi 7        ขั้น 2/4      │
│ ┌────────────────────────────────────────────────────┐ │
│ │   รหัสรับร้าน / Claim Code                         │ │
│ │   ┌──────────────────────────────────────────┐     │ │
│ │   │           C N X - 7 F 3 K                  │     │ │ ← merchant_claim_code (สั้น อ่านง่าย)
│ │   │   [ ▦ QR → deep-link สมัคร Merchant ]      │     │ │   ผูก place_id+territory_id+agent_id
│ │   └──────────────────────────────────────────┘     │ │
│ │  สแกน QR นี้ในมือถือเจ้าของร้าน →                  │ │ ← QR encode deep-link ที่ "land ฝั่ง
│ │  เปิดหน้าสมัคร Merchant พร้อมรหัสกรอกให้แล้ว        │ │   merchant signup + claim_code pre-bound"
│ │  ⓘ ระบบ link ร้าน↔บัญชี อัตโนมัติ (กัน claim ผิด)  │ │   (handoff สัญญากับ Merchant §3.1.a)
│ │ ┌─ เจ้าของร้านไม่มี LINE/สมาร์ทโฟน? ────────────┐ │ │ ← FALLBACK ที่วาดจริง (critique critical:
│ │ │ • agent เปิด PWA Merchant บนเครื่องตัวเอง ช่วยกรอก│ │ │   §4.5 เคยสัญญาแต่ไม่มีจอ)
│ │ │ • หรือจดรหัส CNX-7F3K ให้ไปกรอกภายหลัง          │ │ │
│ │ │ • ส่งรหัสทาง SMS/LINE ให้ลูกร้านที่มีเครื่อง     │ │ │
│ │ └────────────────────────────────────────────────┘ │ │
│ └────────────────────────────────────────────────────┘ │
│  📷 ถ่ายหลักฐานการมอบ (เจ้าของ + หน้าร้าน)            │ ← บันทึกการส่งมอบ (evidence_media)
│         [ ส่งมอบแล้ว → ขั้นต่อไป ]                      │
└────────────────────────────────────────────────────────┘
        ▼
STEP 3 — วาง earn-QR Table-Tent (ลูกค้าสแกนเพื่อ check-in) ──
┌────────────────────────────────────────────────────────┐
│ 🏪 พาร้านเข้าระบบ · ร้านใหม่ Soi 7        ขั้น 3/4      │
│  📐 วาง table-tent ที่ลูกค้าเห็นชัด (เคาน์เตอร์/โต๊ะ)  │
│  ┌───────────┐  "QR นี้ = ลูกค้าสแกนเพื่อ check-in/    │ ← printed STATIC table-tent (earn-side)
│  │  ▦▦▦▦▦▦   │   สะสมแสตมป์ Cafe-Hop"                 │
│  │  ▦  Q R ▦  │  ⚠ คนละอันกับ 'QR จ่ายของรางวัล'      │ ← ย้ำแยกจาก redemption QR (merchant-init,
│  │  ▦▦▦▦▦▦   │     (redeem = ร้านเป็นคนสแกนลูกค้า)    │   rotating, server-burn — ไม่ใช่ของที่ agent วาง)
│  └───────────┘  📷 ถ่ายยืนยันตำแหน่งที่วาง            │
│                    [ วางแล้ว → ]                       │
└────────────────────────────────────────────────────────┘
        ▼
STEP 4 — สอน Redeem (<5 วิ) + Activation ───────────────
┌────────────────────────────────────────────────────────┐
│ 🏪 พาร้านเข้าระบบ · ร้านใหม่ Soi 7        ขั้น 4/4      │
│  🎓 สอนเจ้าของร้าน redeem ที่เคาน์เตอร์:               │
│   1) ลูกค้าโชว์ "ขอรับรางวัล" → ร้านเปิด PWA scanner   │ ← no-install LINE/browser PWA
│   2) สแกน QR ลูกค้า / กรอก OTP → server burn coin     │   merchant-initiated, rotating, geofenced
│   3) เห็น ✓ เขียว = จ่ายของได้   (ไม่ต้อง login POS)   │   < 5 วินาที
│  ▶ เล่นสาธิต 20 วิ (TH/EN/ZH)                          │
│  ┌─ สถานะ activation ──────────────────────────────┐  │
│  │ ⬜ claim · ⬜ enable loyalty · ⬜ prefund escrow  │  │ ← merchant.activated trigger
│  │ ปลด activation bonus ฿120–250 เมื่อร้าน escrow จริง│  │   → AGENT_PAYOUT (เข้า QA)
│  └──────────────────────────────────────────────────┘  │
│            [ ✅ จบงาน onboarding ]                      │
└────────────────────────────────────────────────────────┘
```

- **เป้าหมายผู้ใช้:** พาร้านใหม่เข้าระบบครบวง — มี place, มอบ code, วาง earn-QR, สอน redeem — แล้วรอ activation bonus.
- **ต้องเกิดอะไร:** STEP1 = `change_proposals(target='place')` (= task `seed_new_place`, ผ่าน moderation+`apply_proposal` ก่อนได้ `place_id`). STEP2 = generate `merchant_claim_code(code, place_id, territory_id, issued_by_agent_id, status='unused')`; **QR encode deep-link ที่ land ฝั่ง Merchant signup พร้อม claim_code pre-bound** (handoff สัญญากับ §3.1.a: deep-link landing → merchant auth/account-create → routed เข้า verify stepper โดยรหัสผูกไว้แล้ว). มอบต่อหน้า + ถ่ายหลักฐาน. **เคสไม่มี LINE/สมาร์ทโฟน วาดเป็น fallback จริงใน STEP2** (ไม่ใช่แค่ prose edge). STEP3 = วาง **printed static table-tent earn-QR** — **ย้ำคนละอันกับ redemption QR**. STEP4 = สอน redeem <5วิ + activation checklist. เมื่อ merchant claim code → `link merchant↔place` + stamp `onboarded_by_agent_id`; enable loyalty/prefund escrow จริง → emit `merchant.activated` → ปลด `AGENT_PAYOUT` activation bonus (attribution ผ่าน claim_code chain) → เข้า QA.
- **Edge/empty/error:** **Place proposal ถูก reject** → onboarding ค้างที่ STEP1 (ไม่ได้ code) + ลิงก์แก้/อุทธรณ์ (§4.4a). **claim_code หมดอายุ/ร้านไม่ activate** → ไม่มี activation bonus (เฉพาะ onboard bounty ที่ approve แล้ว); แสดง "รอร้าน activate". **เจ้าของไม่มี LINE/สมาร์ทโฟน** → ใช้ fallback ใน STEP2. **ร้านปลอม/สมรู้ร่วมคิด** → liveness + identity-graph cross-check → หลุด QA = clawback (§4.4).
- **Anti-fraud-feels-trustworthy:** claim code = attribution ที่ผูก "agent คนไหนพาร้านไหน + ร้านจ่าย escrow จริงไหม" end-to-end → agent มั่นใจ bonus ถึงมือถูกคน. แยก earn-QR/redeem-QR ชัด กันเจ้าของร้านสับสน (ลด dispute หน้าเคาน์เตอร์).
- **i18n/a11y:** wizard + วิดีโอสาธิต 3 ภาษา (เจ้าของร้านไทยวัย 55 / ลูกค้าจีน); claim code ตัวใหญ่ contrast สูง + อ่านออกเสียงได้; QR มี text fallback (code พิมพ์ใต้ QR); fallback box เป็น list มี aria.

---

### 4.6 Reputation & Leaderboard — Gamified Pay (bounty · streak · อันดับเขต)

ปลายทางของ gamification: ทำให้ moat เดินด้วยตัวเอง. คะแนน reputation (0–100, map `agents.quality_score`) → trust ladder → ปลดสิทธิ์ (auto-approve low-risk, bounty multiplier). leaderboard ระดับเขต = แข่งกัน healthy (badge แบบ **Sparks ภายใน — ไม่ใช่ Coins**, ไม่ปนระบบเงินลูกค้า).

```
┌────────────────────────────────────────────────────────┐
│ 🏆 อันดับ & คะแนน · Nimman                              │
│ ┌─ ฉัน ─────────────────────────────────────────────┐ │
│ │ ⚖ Verified  ·  Reputation 86/100  ·  ×1.2 bounty  │ │ ← tier ปลดสิทธิ์ + multiplier
│ │ ปลดล็อกถัดไป: Senior (รับ activate เต็ม, QA ~10%)  │ │
│ │ ▓▓▓▓▓▓▓▓░░  อีก 14 approved units                 │ │ ← aria-valuenow
│ └────────────────────────────────────────────────────┘ │
│ ┌─ Streak / quest เขต ──────────────────────────────┐ │
│ │ 🔥 ทำเขตเขียว 4 วันติด · ปิดเขต = +โบนัส streak    │ │ ← gamify ระดับเขต (freshness ≥90%)
│ └────────────────────────────────────────────────────┘ │
│  Leaderboard (approved · freshness · activation)       │
│   🥇 Nok      312 ✓ · เขต 94% · 5 ร้าน               │
│   🥈 ฉัน      268 ✓ · เขต 88% · 3 ร้าน               │
│   🥉 Beam     241 ✓ · เขต 91% · 2 ร้าน               │
│  ⓘ จัดอันดับด้วยคุณภาพ (accept-rate) ไม่ใช่ปริมาณ     │ │ ← ป้องกัน spam ขยะ
└────────────────────────────────────────────────────────┘
```

- **เป้าหมายผู้ใช้:** เห็นว่าตัวเองอยู่ตรงไหน + ทำอะไรปลดสิทธิ์/ได้เงินมากขึ้น.
- **ต้องเกิดอะไร:** reputation จาก accept-rate + QA pass + freshness retention − fraud flags (map `agents.quality_score`; false-claim/QA-fail ลด tier ตาม B.2.3). trust ladder Probation(<50 approved, ×0.8, QA 100%) → Verified(accept≥85%, auto-approve low-risk) → Senior(activate เต็ม, QA~10%). leaderboard เรียง approved units + freshness + activation; **เน้นคุณภาพ (accept-rate)** กัน farming ขยะ. **badge = Sparks-style ภายใน ไม่ใช่ Coins** — แยกขาดจากเงินลูกค้า (กัน implication ว่า leaderboard แลกเงินได้; รักษาเส้น e-money boundary).
- **Edge/empty:** agent ใหม่ → "เริ่ม Probation · ทำ 50 งานเพื่อปลด auto-approve" + ลิงก์ playbook (§4.0a). reputation ตก → **ไม่โชว์ shaming สาธารณะ** (เห็นเฉพาะตัวเอง + City Manager); shadow-review ไม่แสดงในนี้.
- **Anti-fraud-feels-trustworthy:** multiplier โปร่งใส (เห็นว่า ×1.2 เพราะคุณภาพดี) จูงใจทำดี.
- **i18n/a11y:** tier/badge/streak 3 ภาษา; อันดับมี rank ตัวเลข + ชื่อ (ไม่พึ่งเหรียญสีอย่างเดียว); progress bar มี `aria-valuenow`.

---

### 4.7 Color & Currency discipline ใน Agent Mode (กัน hue overloading)

> *(แก้แบบ scoped จาก critique critical "amber overloading" — เฉพาะส่วนที่ปรากฏใน §4):*
> - Agent mode **สงวนเขียวให้ freshness `fresh` เท่านั้น** (ไม่ใช้เขียวกับเงิน/CTA). `aging`=เหลือง, `stale`=แดง, `never-verified`=⬜(เทาอ่อน/ขาว), `coverage gap`=⬚(เทาประ) — **5 สถานะแยกด้วยรูปทรง+label เสมอ ไม่ใช่สีอย่างเดียว**.
> - header agent = **teal/เข้ม** (ไม่ใช่ brand-amber) — แยก mode ชัด + ปลดปัญหา amber ทับซ้อน CTA/aging ในจอ agent.
> - **badge/leaderboard = Sparks (ม่วง ✦) ไม่ใช่ Coins (ทอง ◉)** — agent mode ไม่ render Coin pill ของลูกค้า; เงินค่าจ้าง = ฿ THB ตัวเลข tabular-nums (currency = data ต้องผ่าน contrast ≥4.5:1 ไม่ว่า size). ห้ามวาง warning-amber บนพื้นทอง.

---

### 4.8 Residual handoffs (สิ่งที่ §4 ผูกไว้แต่จงใจไม่วาดในนี้ — ฝากให้ section อื่น)

- **Moderator/Admin Console** (review queue: diff + evidence gallery + EXIF/geo/pHash verdict + place-pin map + approve/reject/request-more, SoD author≠moderator) — เป็น input ของ §4.4 แต่เป็น web admin persona แยก. **ต้องมี section ของตัวเอง** (Next.js+Refine). §4 อ้างถึงเป็น output mirror เท่านั้น.
- **Merchant signup / deep-link claim-code landing** (ปลายทางของ QR ใน §4.5 STEP2) — เป็น Merchant surface (§3.x). §4.5 ผูก contract ของ deep-link (pre-bind claim_code) แต่จอ signup เป็นของ Merchant section.
- **QA-sampling reviewer screen สำหรับ payout** — admin/finance surface; §4.4 แสดงผลฝั่ง agent เท่านั้น.

---

## 5. Hero Flow Storyboards

> **ขอบเขตของ section นี้:** ร้อยเรียงหน้าจอจาก §2 (Consumer IA/Wireframes), §3 (Merchant), §4 (Field Agent) เข้าเป็น **5 การเดินทางครบวง (end-to-end journeys)** แบบ *screen-by-screen* — แต่ละ step เขียนเป็น 4 บรรทัด: **SCREEN** (จอที่เห็น) → **ACTION** (ผู้ใช้ทำอะไร) → **SYSTEM** (server/client ทำอะไรเบื้องหลัง + edge-fn/state-machine ที่วิ่ง) → **FEEL** (สิ่งที่เห็น/รู้สึก). ทุก storyboard ติด **🎯 UX Goal** + **📈 Metric ที่ขยับ** กำกับหัว, และปิดท้ายด้วย **⚠️ Riskiest Moment** ว่าดีไซน์ de-risk อย่างไร.
>
> **กฎที่ทุก storyboard ยึด (ล็อกจากแผน):** (1) **ZERO signup wall** — geolocate → เห็นของจริงก่อน, defer auth ไปที่ first value-capture (first stamp); (2) **AHA < 60 วินาที** วัดเป็น *pixels of real nearby content บนจอ* ไม่ใช่ "เข้า route แล้ว"; (3) **TTFS = North-star** (เวลาเปิดแอป → เก็บ stamp แรกสำเร็จที่ "server ยืนยันแล้ว"); (4) redemption = **merchant-initiated, rotating, geofenced, server-burn** — ไม่มี static customer QR; (5) Counter < 5 วินาที บนมือถือเครื่องเดียว ไม่มี POS; (6) Wallet **ห้าม imply cash-out** — Sparks (XP ฟรี) แยกขาดจาก Coins (รางวัล baht-backed, หมดอายุได้) **และ Coins ฝั่งผู้ใช้ห้ามแสดงมูลค่าบาทคู่กันเด็ดขาด** (สื่อเป็น "ของที่แลกได้" เท่านั้น).
>
> **ตำนานสัญลักษณ์ (legend):** `[ปุ่ม]` = tappable · `(•)` = สถานะ/ป้าย · `▓` = pin/ภาพ · `◷` = countdown timer · `⟳` = rotating · 🟢/🟠/🔴 = ผลลัพธ์เขียว/พักตรวจ/แดง · `→` = transition จอ. **กฎภาษา (ล็อกจาก §1.8 locale-active):** headline/CTA แสดง **ภาษาเดียวตาม active locale เท่านั้น** — การวางหลายภาษาซ้อนกันสงวนไว้เฉพาะ "การ์ดเลือกภาษา" ที่ endonym คือเนื้อหา (ดู Riskiest 5.A #5). ใน storyboard ด้านล่าง wireframe จึงเขียนภาษาเดียวต่อจอตาม persona (Emma=EN, Li Wei=简, Nok/ป้าสมจิต/Beam=TH).

---

### 5.0 Cast of Screens (จอที่ถูกอ้างซ้ำใน 5 storyboards)

อ้างจาก §2–§4 เพื่อไม่ซ้ำสเปก. **หมายเหตุ handoff:** ตารางนี้แก้ cross-reference ให้ชี้ section ถูกต้อง — จอ **consumer** อยู่ใน **§2.x**, จอ **merchant** อยู่ใน **§3.x**, จอ **agent** อยู่ใน **§4.x** (draft เดิมชี้ §3/§4 ผิดทั้งแถว, แก้แล้วด้านล่าง):

| รหัส | จอ (Screen) | client | นิยามใน (แก้แล้ว) |
|---|---|---|---|
| **S-SPLASH** | Cold-open / geo-prime (priming-in-context) | Flutter | §2.2 |
| **S-DISCOVER** | Map-first hybrid (Mapbox + carousel) — **AHA target** | Flutter | §2.2 |
| **S-PLACE** | Place detail + Freshness badge | Flutter | §2.5 |
| **S-QUEST** | Quest detail (Cafe-Hop trail) · variant: Weekly Drop (Sparks+badge) | Flutter | §2.6 |
| **S-PASSPORT** | Passport / stamp grid + leaderboard tab | Flutter | §2.6 |
| **S-CHECKIN** | Check-in sheet (tiered trust) | Flutter | §2.7 |
| **S-AUTH** | Soft auth wall (LINE/Apple/Google/WeChat/Alipay/guest) | Flutter | §2.7 |
| **S-WALLET** | Wallet (Sparks ‖ Coins, expiry timeline) · guest = read-only explainer | Flutter | §2.9 |
| **S-REDEEM-C** | Customer redeem (rotating QR/OTP) + "verifying" in-flight | Flutter | §2.8 |
| **S-PUSH-PRIME** | Push opt-in primer (consent-gated, persona-toned) | Flutter (overlay) | §2.11 |
| **S-RED-IMPORT** | RED/小红书 list paste+lookup (fuzzy-match) | Flutter | §2.2 (zh variant) |
| **S-COUNTER** | Counter Scanner PWA (idle/warming/scan/result/hold/queued) | PWA (no-install) | §3.2.g |
| **S-AGENT-MAP** | Agent territory map + task list + submission status | Flutter (role-gated) | §4.1 / §4.4 |
| **S-AGENT-CAP** | Agent capture (camera, fresh-only) + Change-Proposal review | Flutter | §4.3 |

> **Cross-surface dependencies (จออื่นที่ storyboard เรียกใช้ แต่ "ไม่ใช่หน้าจอ §5" — เป็น deliverable ของ section อื่น, ระบุไว้กัน orphan):**
> - **Moderator/Admin console** (review Change-Proposal + diff/EXIF/geo/pHash + approve/reject/request-more, SoD author≠moderator; Gate-1 Identity-verify, Gate-2 Finance-verify) → **web, §3.3 / Admin section** — 5.E ฝั่ง agent เห็นแค่ *output* (สถานะ approved/rejected). console ตัวจริงต้องมีในสเปก §3/Admin.
> - **Merchant first-time signup + deep-link claim landing** → **§3.1.a** — 5.E5 เรียกใช้เป็น step แต่จอ signup เป็นของ §3.
> - **Consumer review composer** (star+text+photo, verified-visitor) → **§2.5/§2.8** — ไม่อยู่ใน critical path ของ §5 storyboard ใด.
> - **Merchant Billing/Settings/Redemptions-list/payout-bank re-verify** → **§3.0 nav** — นอกขอบเขต §5.
> - **Agent appeal form / agent playbook+role-acquisition** → **§4.4 / §4.6** — 5.E แสดงแค่สถานะ/จุดเข้า.

---

### 5.A — TOURIST: first-run → Nimman → Cafe-Hop → 3 check-ins → free coffee ☕ (THE CORE PROOF)

> 🎯 **UX Goal:** พิสูจน์ cross-merchant loop ทั้งวงให้ Western tourist ที่ไม่เคยรู้จักแบรนด์ ภายในการเดินคาเฟ่หนึ่งบ่าย — โดยไม่มี signup wall ขวางก่อนเห็นคุณค่า.
> 📈 **Metric:** `ms_to_first_place` (vs งบ 60s, วัด "pixel ของของจริง") · `time_to_aha` (<60s) · **`TTFS` (North-star, นับเมื่อ server confirm stamp)** · `quest_start_rate` · `quest_completion_rate` · `first_redeem_rate`.
> **Persona:** Emma, นักท่องเที่ยวอังกฤษ, เพิ่งลงจากแท็กซี่ที่ One Nimman, locale = EN, ยังไม่ login.

#### Step A1 — Cold open + AHA ในจอเดียว (วินาที 0–8) · `S-SPLASH` → `S-DISCOVER`
> **เปลี่ยนจาก draft เดิม (CRITICAL fix #1):** ไม่มีจอ persona-branch คั่น และ **ไม่ยิง OS permission dialog เป็น gate ก่อนเห็นค่า**. แอปเปิดมา render map ด้วย **coarse/IP location ทันที** แล้วค่อยปู rationale ของ precise-location เป็น **bottom-sheet ในบริบทบน map ที่มีของจริงแล้ว** (priming-in-context ไม่ใช่ priming-as-gate). นาฬิกา AHA หยุดเมื่อ "เห็น pin จริง" ไม่ใช่ "เข้าจอ".
```
S-DISCOVER (เปิดมาเจอเลย, coarse/IP fix)     priming sheet (non-blocking, ทับ map สด)
┌───────────────────────────────┐            ┌───────────────────────────────┐
│ [≡] Nimman ▾      [🔍] [filter]│            │   See what's right around you │
│┌─────────────────────────────┐│            │   Turn on precise location to │
││   M A P B O X  (coarse)      ││            │   show cafes within 1 min walk│
││   ▓cafe ▓cafe ●≈you ▓cafe    ││ ← ของจริง   │   • used only at check-in /   │
││   ▓see  ▓eat  ▓do  ▓halo     ││    ทันที    │     redeem, not in background │
│└─────────────────────────────┘│            │   • we don't build a continuous│
│ ╔═══════════════════════════╗ │            │     map of your movements      │ ← copy ที่ป้องกันได้ (fix #6)
│ ║ ⭐ FEATURED · Nimman      ║ │            │ ┌───────────────────────────┐ │
│ ║ Cafe-Hop: visit 3 → free  ║ │            │ │  Turn on precise location  │ │
│ ║ coffee ☕      [See it →]  ║ │            │ └───────────────────────────┘ │
│ ╚═══════════════════════════╝ │            │  [Not now — keep browsing]    │ ← ไม่ block
│ ◀ 15 great spots near you ▶   │            └───────────────────────────────┘
│ Browse first. No sign-up.     │ ← สัญญา zero-wall
└───────────────────────────────┘
```
- **ACTION:** Emma เปิดแอป → **เห็น map + pin จริง + featured quest ทันที** (ไม่มีฟอร์ม ไม่มีจอ persona). ปุ่ม `[Not now]` ทำให้เธอ browse ต่อได้โดยไม่ต้องให้ precise location.
- **SYSTEM:** เริ่มจับ `session_started_at` (ตัวตั้ง TTFS) ที่ app_open. query `places` ใน Nimman geofence ด้วย **coarse/IP fix** (RLS `public_reads_published_places`, ไม่ต้อง auth, **ยังไม่สร้าง account**). priming sheet เป็น overlay non-blocking; OS dialog ยิงเฉพาะตอนกด `[Turn on precise location]` หรือเลื่อนเข้า check-in (A4). ถ้า deny → fallback ให้เลือก "Nimman" จาก dropdown (degrade ไม่ตาย).
- **FEEL:** "เปิดมาเห็นของจริงรอบตัวเลย ไม่มีฟอร์ม" — แรงต้านศูนย์, AHA เริ่มก่อตัวตั้งแต่วินาทีแรก.

#### Step A2 — AHA ยืนยัน + ทำความรู้จัก quest (วินาที 8–20) · `S-DISCOVER` → `S-QUEST`
> **Freshness fix (major #7):** halo แยก 3 สถานะ — **เขียวสด** (verified ≤7d) / **อมส้มอ่อน "may be outdated"** (8–21d, once-verified) / **เทา "not yet verified"** (null/never). draft เดิมยุบ null กับ stale เป็นอันเดียว = overclaim trust ของ pin ที่ไม่เคยตรวจ → แก้แล้ว, และ AHA feed **down-rank pin เทา** เพื่อให้ first impression เป็น "verified by people here" จริง.
```
S-QUEST (Cafe-Hop)
┌───────────────────────────────┐
│ ← Nimman Cafe-Hop      [share] │
│ 🎟  Collect 3 stamps           │
│ ┌───┬───┬───┬─────┐            │
│ │ ? │ ? │ ? │☕FREE│           │ ← 3 ว่าง + reward
│ └───┴───┴───┴─────┘            │
│ Visit any 3 of these 8 cafes:  │
│ • Ristr8to   0.2km 🟢verified 2d│ ← halo เขียว = สด
│ • Graph Cafe 0.4km 🟢verified 5d│
│ • (a new spot) 0.6km ⬚not yet  │ ← เทา = ไม่เคยตรวจ (ต่างจาก stale)
│   verified by an agent          │
│ Reward: a free hot coffee ☕    │ ← ไม่มีตัวเลขบาท (fix #2)
│   at Akha Ama (4th stop)        │
│ ┌───────────────────────────┐  │
│ │   Start this quest  →      │  │ ← ยังไม่ต้อง login
│ └───────────────────────────┘  │
└───────────────────────────────┘
```
- **ACTION:** Emma เห็น ~15 pin จริง + halo → แตะ `[See it →]` บน featured card → อ่าน quest → แตะ `[Start this quest]`.
- **SYSTEM:** render carousel จาก `places` (open-now, distance-sorted, **never-verified down-ranked**) + `deals` + `quests WHERE is_featured AND district='nimman'` — มาจาก seed dense ที่ผ่าน Density Gate (**ไม่มี empty map**). กด Start → สร้าง `quest_progress(status='in_progress')` ผูกกับ **guest session id** (anonymous, device-scoped, persisted ใน secure storage). **ยังไม่บังคับ login** — auth defer ไปจน "เก็บ stamp แรก".
- **FEEL:** "นี่คือ AHA" — ของจริง + ของฟรีที่เข้าใจในประโยคเดียว + passport ว่าง 3 ช่องสร้าง goal-gradient. (📈 `time_to_aha`/`ms_to_first_place` ปิดที่นี่, เป้า <60s, จริง ~12–15s).
- **Edge note (guest-start recovery, completeness #7):** guest `quest_progress` เก็บแบบ device-scoped; ถ้า Emma ปิดแอปก่อน stamp แรก แล้วกลับมา → S-DISCOVER แสดงแถบ "Resume Nimman Cafe-Hop (0/3)". ถ้า device ใหม่/clear storage → progress หาย (acceptable, ยังไม่มี value-capture); merge เกิดเฉพาะตอน auth (A5).

#### Step A3 — เดินไปคาเฟ่ที่ 1 + check-in แรก (THE STAMP) · `S-PLACE` → `S-CHECKIN`
```
S-PLACE (Ristr8to)              S-CHECKIN sheet (จาก geofence)
┌─────────────────────────┐     ┌───────────────────────────┐
│ ← Ristr8to        ❤ [⤴] │     │  📍 You're at Ristr8to     │
│ ▓▓ photo (agent-shot) ▓▓ │     │  Check in to earn a stamp  │
│ (•) 🟢 Verified 2d ago by│     │                            │
│     a local agent         │     │  ◉ Tier 1 · GPS dwell      │
│ ☕ Cafe · open till 6     │ →  │     (you're here 12s ✓)    │
│ 🎟 Counts toward Cafe-Hop │     │  ○ Tier 2 · Scan table QR  │
│ [Today: oat latte −20%]  │     │     for a stronger stamp   │
│ ┌─────────────────────┐  │     │  ┌──────────────────────┐  │
│ │  Check in here  📍   │  │     │  │  Collect stamp 1/3 →  │  │
│ └─────────────────────┘  │     │  └──────────────────────┘  │
└─────────────────────────┘     └───────────────────────────┘
   (ถ้านอก geofence: ปุ่ม              │ first stamp → auth gate
    เปลี่ยนเป็น "Walk to shop          ▼
    · 1.2km" + เปิด sheet            S-AUTH (soft wall, ดู A4)
    ที่ show navigate state)
```
- **ACTION:** Emma ถึงร้าน → แตะ `[Check in here]`. ระบบเห็นเธออยู่ในรัศมี + dwell 12s → แตะ `[Collect stamp 1/3]`.
- **SYSTEM:** `check_in` edge-fn (non-money): ตรวจ geofence (PostGIS `ST_DWithin`, **รัศมี indoor-tolerant**) + dwell + impossible-travel ข้าม `device_id`. tier = `gps_dwell` (T1) พอสำหรับ Sparks + quest step. ปุ่ม Place-Detail เมื่อ **นอกรัศมี** = แสดง "Walk to shop · 1.2km" ไม่ใช่ปุ่ม active ที่นำไปสู่ sheet ตาย. **เพราะนี่คือ first value-capture → trigger S-AUTH** (เก็บ stamp ไว้ pending จน auth สำเร็จ).
- **FEEL:** stamp กำลังจะหล่นลงช่อง 1/3 — momentum สูงสุด ก่อนเจอ auth.

#### Step A4 — ⏸ Defer-auth gate ที่ "จังหวะดีที่สุด" · `S-AUTH`
```
┌───────────────────────────────┐
│   Save your first stamp 🎟      │
│   Sign in to keep your         │
│   progress on this trip        │  ← framing = "เซฟความคืบหน้า"
│                                │     ไม่ใช่ "สมัครสมาชิก"
│ ┌───────────────────────────┐ │
│ │  Continue with Apple    │ │  ← Western: Apple/Google บนสุด
│ │  Continue with Google  G │ │
│ │  Continue with LINE   ◉  │ │
│ │  WeChat 微信登录       💬 │ │
│ └───────────────────────────┘ │
│   [Maybe later — keep browsing]│ ← ทางออก ไม่บังคับ (กฎ zero-wall)
└───────────────────────────────┘
```
- **ACTION:** Emma แตะ `Continue with Apple` → Face ID → กลับมา < 3 วินาที.
- **SYSTEM:** สร้าง `users` + `profiles`, set `audience_segment='tourist_west'` (derive จาก locale+provider), **merge guest `quest_progress` → user**. **first stamp commit แบบ provisional** (ดู FEEL + Riskiest #6): client แสดง "saving your stamp…" จน `check_in` + auth ยืนยัน server-side แล้วจึงเล่น celebration. post `spark_events(reason='checkin')`. **📈 `first_stamp_succeeded` (server-confirmed) → TTFS หยุดที่นี่**.
- **FEEL:** "เซฟแล้ว ไม่เสียของ" → หลัง server ยืนยัน stamp 1/3 หล่นลงช่องพร้อม haptic + เสียง. รางวัลของการยอม login = เห็นทันที (แต่ของจริง ไม่ใช่ของที่อาจถูก revoke).
- **First-stamp anti-rollback (major #9):** สำหรับ **stamp แรก (activation)** เท่านั้น **ต้องรอ server confirm ก่อนเล่น confetti/haptic** — แสดง state กลาง "saving your stamp…". optimistic+queue (เล่น animation ก่อน sync) สงวนไว้สำหรับ check-in ถัด ๆ ไปที่ stake ต่ำ. **ห้ามฉลอง first stamp แล้ว rollback ทีหลัง** (ทำลาย trust หนักกว่าการไม่ให้ตั้งแต่แรก).
- **Merge-conflict edge (completeness, account-merge):** ถ้า provider ที่เลือก match กับ account เดิมที่มีอยู่ → แสดงจอ "Welcome back — we found your account. Add this trip's progress?" `[Merge progress]` / `[Keep existing only]` แทนการ silently overwrite หรือ fail.
- **i18n/a11y:** ลำดับปุ่ม auth จัดตาม `audience_segment` (Western=Apple/Google บน · Thai=LINE บน · Chinese=WeChat/Alipay บน). `[Maybe later]` ต้องอยู่เสมอ. ปุ่ม ≥48dp, รองรับ VoiceOver/TalkBack. **headline/ปุ่มแสดง active-locale เดียว** (ไม่ stack 3 ภาษา).

#### Step A5 — Push primer (จังหวะหลังคุณค่าแรก) · `S-PUSH-PRIME` (overlay)
> **เพิ่มจาก completeness (major, push primer):** 5.C พึ่ง streak/weekly-drop push — primer ต้องมีจริงและ trigger ถูกจังหวะ. วางหลัง first-stamp success (มีคุณค่าให้รักษาแล้ว) ไม่ใช่ตอน cold-open.
```
┌───────────────────────────────┐
│   🎟 Stamp saved! Keep the     │
│   streak going?                │
│   Get a gentle reminder to     │
│   check in (max 1/day) + when  │
│   a new Weekly Drop lands.     │
│ ┌───────────────────────────┐ │
│ │  Allow reminders           │ │
│ └───────────────────────────┘ │
│   [Not now]                    │ ← deny → ไม่มี geo-push (§2.10)
└───────────────────────────────┘
```
- **SYSTEM:** consent-gated; grant → set notif preference + OS prompt; deny → ไม่ส่ง geo-push, ไม่ re-prompt ถี่. persona-toned copy. **ไม่ block flow** — ปิดแล้วเดินต่อไป A6 ได้.

#### Step A6 — คาเฟ่ที่ 2 และ 3 → quest complete (mint Coins) · `S-CHECKIN` → `S-PASSPORT`
```
S-PASSPORT (หลัง stamp 3 + mint)
┌───────────────────────────────┐
│  Nimman Cafe-Hop   🎟 3/3 ✓    │
│ ┌────┬────┬────┬────────────┐  │
│ │ ✓  │ ✓  │ ✓  │ ☕ UNLOCKED │  │ ← ช่อง 4 glow
│ │Rist│Grap│Roas│  TAP TO    │  │
│ │    │    │    │  CLAIM →   │  │
│ └────┴────┴────┴────────────┘  │
│  🎉 Quest complete!            │
│  You earned a free coffee ☕    │ ← reward เป็น "ของ" ไม่มีเลขบาท
│  Redeem at Akha Ama            │   (fix #2: ไม่มี "60 COINS"/"~฿70")
│ ┌───────────────────────────┐  │
│ │  Go redeem at Akha Ama →   │  │
│ └───────────────────────────┘  │
└───────────────────────────────┘
   (ระหว่าง mint: ช่อง 4 แสดง
    "minting your reward…" จน
    grant_coins สำเร็จ — ดู SYSTEM)
```
- **ACTION:** Emma check-in ครบร้านที่ 2 + 3 (auth แล้ว → ไม่มี wall อีก). ที่ stamp ที่ 3 ระบบปิด quest.
- **SYSTEM:** check-in สุดท้ายแตะ `min_steps_required` → **EARN→GRANT bridge**: set `quest_progress.status='completed'` → แสดง **"minting your reward…" loading state** → invoke `grant_coins` edge-fn → mint Coins จาก escrow ที่ merchant prefund (gated บน settled cash). **Grant-failure fallback (completeness, money-action loading):** ถ้า escrow drained ระหว่าง check-in สุดท้ายกับ mint → แสดง "We're finalizing your reward — we'll notify you shortly" (ต่างจาก escrow-paused pre-block; ไม่ใช่ error สีแดงโทษผู้ใช้, stamp ยังอยู่). สำเร็จ → Coins ลง `coin_lots(state='active', expires_at)`.
- **FEEL:** confetti + "Quest complete" + ช่อง 4 เรืองแสง. **reward สื่อด้วย "free coffee ☕" ล้วน — ไม่มีตัวเลขบาท ไม่มี "60 COINS"** (กัน mental model "ฉันถือเงิน 70 บาท").

#### Step A7 — เปิด wallet (entry) + redeem ที่ร้านที่ 4 · `S-WALLET` → `S-REDEEM-C`
> **Wallet guest fix (major #8):** ถ้าเปิด Wallet ตอนยัง guest → **ไม่เด้ง auth modal**; แสดง read-only explainer แทน. auth ยิงเฉพาะตอน first value-capture (stamp) ไม่ใช่ตอน "เปิดกระเป๋าเปล่า". (Emma ตอนนี้ login แล้ว จึงเห็น balance จริง.)
```
S-WALLET (auth'd)                S-REDEEM-C (rotating + in-flight)
┌─────────────────────────┐     ┌───────────────────────────┐
│  Wallet                  │     │  Free coffee at Akha Ama   │
│ ┌─────────┐ ┌─────────┐ │     │  Show this to the counter  │
│ │ ✨SPARKS │ │ ☕ COINS │ │     │     ███████████████        │
│ │   240    │ │ 1 reward │ │     │     ██ ⟳ QR  ██  ◷ 0:58    │ ← หมุนทุก 30s
│ │ XP only  │ │ = rewards│ │ →   │     ███████████████        │
│ │ no cash  │ │ expires  │ │     │   or read code: 4 8 2 1 9 3│ ← OTP สำรอง
│ └─────────┘ └─────────┘ │     │   📍 You're at the shop ✓  │ ← geofence (indoor-tolerant)
│ Coins ≠ money. Use them  │     │  Staff scans this — not you │
│ for real rewards only.   │     └───────────────────────────┘
│ ☕ Free coffee · Akha Ama │            state: PENDING → CODE_ISSUED
│    expires in 14 days     │     (หลังพนักงานสแกน → "Verifying
└─────────────────────────┘      at counter…" จน server ตอบ)

guest variant (ถ้ายังไม่ login):
┌─────────────────────────┐
│  Wallet                  │
│  ✨ Sparks = XP/status   │ ← read-only explainer
│  ☕ Coins = real rewards  │   (ไม่มี auth modal)
│  Sign in when you collect │
│  your first stamp to      │
│  start a balance.         │
│  [Browse quests →]        │
└─────────────────────────┘
```
- **ACTION:** Emma เดินเข้า Akha Ama → เปิด wallet → แตะ reward → ระบบเช็คว่าเธออยู่ในรัศมี → โชว์ rotating QR + 6-digit OTP สำรอง.
- **SYSTEM:** redemption state machine: `PENDING` → merchant counter เปิดจอ → `CODE_ISSUED` (rotating nonce, TTL 90s, หมุน 30s, ผูก `place_id`+`redemption_id`). **Merchant เป็นผู้สแกน**. **Coin จะแสดง count เป็น "ของที่แลกได้" (1 reward / ☕) ไม่ใช่ตัวเลขบาท** ทั้งใน wallet, quest preview และทุก consumer surface. **Coin expiry fairness (minor #12):** ถ้า escrow ของ merchant ถูก pause ใกล้วันหมดอายุของ lot → **auto-extend expiry เท่าระยะ pause** (รางวัลที่ได้มาโดยชอบ ต้องไม่ทั้ง "หมดอายุ" และ "ถูกพัก" พร้อมกัน).
- **FEEL:** "พนักงานเป็นคนสแกนให้ฉัน" — ลูกค้า initiate ไม่ได้เอง (anti-fraud ที่ผู้ใช้ไม่รู้สึกว่าโดนกั้น).
- **Wallet i18n/a11y โน้ตล็อก:** การ์ด Sparks (✨, "XP only · no cash") กับ Coins (☕, "= rewards · expires") ต่างสี+ไอคอน+คำชัด. **ห้ามมีปุ่ม withdraw/cash-out ทุกที่.** Coins แสดงเป็นรางวัล (☕ ×1) **ห้ามมีตัวเลขบาทคู่กัน**. **(cross-ref §1, palette fix #3+#11):** ตัวเลข/ป้าย Coin ต้องผ่าน contrast ≥4.5:1 (ใช้ ink สำหรับตัวเลข, สงวน gold ไว้ที่ไอคอน ◉/accent — Coin-gold #F0A91B บนพื้นขาวไม่ผ่านเกณฑ์ตัวอักษร); ป้าย **near-expiry ห้ามใช้ amber-on-gold** ให้ใช้ danger treatment + ⚠ icon; และต้องดึง Coin-gold ออกจาก brand-primary amber (ซึ่งชนกับ CTA/aging/warning) ในระดับ design-system §1.

#### Step A8 — รับกาแฟ (ผลลัพธ์) · `S-REDEEM-C` (verifying → เขียว)
```
verifying (in-flight)            redeemed
┌─────────────────────────┐     ┌───────────────────────────┐
│   Verifying at counter…  │     │            🟢              │
│   ⟳ (code still valid)   │ →   │        Redeemed!           │
│   Keep the code on screen │     │   ☕ 1 free coffee — enjoy  │
└─────────────────────────┘     │   Akha Ama · just now      │
   state: VALIDATING            │   ✨ +15 Sparks bonus       │ ← reward loop ต่อ
   (ห้ามแสดง "done" จน server)  │   Next: Old City Temples → │ ← seed การเดินทางถัดไป
                                 └───────────────────────────┘
```
- **SYSTEM:** merchant สแกนสำเร็จ → customer เห็น **"Verifying at counter…" (VALIDATING)** ระหว่าง round-trip (code ยังสด, **ห้าม imply สำเร็จ**) → `BURNING` (atomic REDEEM txn, idempotency=redemption_id) → `SETTLED` (Coin burned FIFO, take-rate เข้า platform, push ยืนยันทั้ง 2 ฝั่ง).
- **FEEL:** จอเขียว + เสียง + กาแฟจริงในมือ. **loop ปิดครบ EARN→GRANT→REDEEM.** 📈 `first_redeem_rate` ปิด.

> ⚠️ **Riskiest Moments (5.A) + วิธี de-risk:**
> 1. **AHA clock ถูก permission/persona gate บัง (CRITICAL):** ถ้ายิง OS dialog + จอ persona ก่อนเห็นของจริง → บน 4G ช้า + อ่าน rationale 3 ภาษา + รอ tile load จะเกิน 60s ถึงจอที่มีคุณค่า. **De-risk:** render map+nearby+featured **ก่อน** ด้วย coarse/IP; precise-location priming เป็น **bottom-sheet ในบริบทบน map สด** (ไม่ใช่ gate); ตัดจอ persona-branch ออกจาก flow (ทำเป็น deferred/dismissible). วัด `ms_to_first_place` เทียบงบ 60s ที่ "pixel ของของจริง".
> 2. **Permission priming copy สัญญาเกินจริง (major):** "we don't track your journey" ป้องกันไม่ได้ถ้า backend เก็บ check-in geo+timestamp + impossible-travel. **De-risk:** เปลี่ยนเป็น "used only at check-in/redeem, not in background · we don't build a continuous map of your movements" + ทำให้ data model ตรงคำ (ไม่มี continuous background location, check-in geo minimized) + ให้ copy ตรงกับ consent record ใน PDPA center.
> 3. **Auth-gate timing (major):** wall หน้า A1 = แพ้ก่อนเห็นค่า. **De-risk:** gate ที่ "เซฟ stamp แรก" — ผู้ใช้ลงทุน emotional แล้ว, framing "save progress", มี `[Maybe later]` เสมอ, รองรับ merge-conflict path.
> 4. **First stamp ถูกฉลองแล้ว rollback (major):** offline optimistic + sync-time fail = revoke ช่วง activation. **De-risk:** stamp แรก **รอ server confirm ก่อน celebrate** ("saving your stamp…"); optimistic-rollback ใช้กับ check-in ถัดไปเท่านั้น.
> 5. **Trilingual stacked headline ทำ layout/AHA พัง (major):** 3 บรรทัด/หัวข้อ + Thai line-height + dynamic type 200% = overflow + ช้า scan + ZH render เป็น fallback font บนเครื่อง non-ZH. **De-risk:** headline/CTA แสดง **active-locale เดียว**; stacking สงวนเฉพาะการ์ดเลือกภาษา.
> 6. **Coins ถูกเข้าใจผิดว่าเป็นเงิน (CRITICAL):** โชว์ "60 COINS / ~฿70" = สอนผู้ใช้ convert Coin→บาท = cash-out mental model + เสี่ยงนิยาม e-money. **De-risk:** consumer surface ทุกที่แสดง Coins เป็น **"ของที่แลกได้" (free coffee ☕)** เท่านั้น, **ไม่มีตัวเลขบาทคู่กัน**, มี "expires/= rewards only", ไม่มีปุ่มถอน; มูลค่าบาท (COGS/escrow) อยู่ฝั่ง merchant เท่านั้น.
> 7. **Redeem-time geofence false-block (major):** GPS ในตึกคอนกรีต Nimman drift 50–150m → ลูกค้ายืนที่เคาน์เตอร์แต่โดน reject "อยู่ไกล" = false-negative บนจังหวะ trust สูงสุด. **De-risk:** ใช้ indoor-tolerant radius และ/หรือ **เชื่อ geofence ของ "เครื่อง merchant" (เคาน์เตอร์ตำแหน่งคงที่) แทน GPS ลูกค้าที่ drift**; แยก "GPS อ่อน/ไม่มีสัญญาณ" ออกจาก "ไกลจริง" (อ่อน ≠ fraud); มี staff override → async review แทน hard red reject (ดู 5.D).

---

### 5.B — CHINESE FIT: 简体 onboarding → "the local layer for the trip you planned on RED" → Alipay/WeChat redeem

> 🎯 **UX Goal:** รับช่วงต่อจากนักท่องเที่ยวจีนที่ "วางแผนทริปบน 小红书 (RED/Xiaohongshu) มาแล้ว" — เปลี่ยน list ที่เซฟไว้ให้เป็น loyalty loop ที่จับต้องได้ ด้วยภาษา/payment rail ที่คุ้นมือ (WeChat/Alipay).
> 📈 **Metric:** `zh_activation_rate` · `wechat_login_rate` · **`TTFS` (จีน segment, server-confirmed)** · `alipay_redeem_success` · `red_import_match_rate`.
> **Persona:** Li Wei (李伟), FIT จากเซินเจิ้น, locale = zh-Hans, มี screenshot ร้านจาก RED ในมือถือ. **บริบทแผน:** ZH = MINIMAL ที่ Nimman, first-class เต็มตอน Chang Klan/Night Bazaar — storyboard นี้คือ path ที่ "ทำงานได้วันแรกแม้ ZH minimal".

#### Step B1 — Cold open ภาษาจีน + AHA + RED bridge · `S-DISCOVER` (zh) → `S-RED-IMPORT`
> เช่นเดียวกับ 5.A1 (fix #1): **render map ก่อน**, ไม่มี gate. **headline แสดงภาษาเดียว (简体)** ตาม locale-active (fix #5).
```
S-DISCOVER (zh, coarse/IP)            S-RED-IMPORT (paste+lookup)
┌───────────────────────────────┐     ┌───────────────────────────────┐
│ [≡] 尼曼区 ▾        [🔍][筛选] │     │  📕 从小红书导入你的清单         │
│┌─────────────────────────────┐│     │  贴上店名或截图里的文字:         │
││   MAPBOX  ▓核实的本地店       ││     │ ┌───────────────────────────┐ │
││     ●≈你   ▓   ▓halo         ││     │ │ Ristr8to, Graph, 阿卡阿玛… │ │ ← วาง/พิมพ์ชื่อร้าน
│└─────────────────────────────┘│     │ └───────────────────────────┘ │
│ ╔═══════════════════════════╗ │     │  [查找匹配 →]                   │
│ ║ ⭐ 推荐任务 Cafe-Hop       ║ │ →  │  ─────────────────────────    │
│ ║ 打卡3家 → 免费咖啡 ☕       ║ │     │  ✓ 找到 6/9 家在本app          │ ← fuzzy-match ผล
│ ║              [查看 →]      ║ │     │    其中 3 家在 Cafe-Hop 任务中  │ ← overlap × quest
│ ╚═══════════════════════════╝ │     │  [在地图上显示 →]               │
│ 先逛，无需注册                  │     └───────────────────────────────┘
│ 📕 在小红书收藏了店? [导入 →]   │ ← RED bridge hook
└───────────────────────────────┘
```
- **ACTION:** Li Wei เห็นภาษาจีน + map ของจริงทันที → แตะ `[导入]` → วางชื่อร้านจาก screenshot → ระบบ fuzzy-match → "พบ 6/9 ร้าน, 3 อยู่ใน Cafe-Hop".
- **SYSTEM:** locale=zh-Hans → โหลด `*_i18n.zh` (curated subset ≥80% ที่ Nimman). **RED-bridge = MVP-minimal (S-RED-IMPORT, §2.2 zh variant):** ไม่ deep-link API (DEFERRED) แต่ **paste/lookup** — fuzzy-match กับ `places` → highlight overlap กับ `quest_steps.place_id`. (draft เดิมบรรยาย flow นี้แต่ไม่มี wireframe → เพิ่มจอจริงแล้ว.)
- **FEEL:** "แอปนี้พูดภาษาฉัน + รู้จักร้านที่ฉันเซฟจาก RED แล้ว" — ความต่อเนื่อง planning → on-ground, AHA ที่จับใจ persona นี้.

#### Step B2 — "Local layer" value prop · `S-DISCOVER` (zh, overlap shown)
```
┌───────────────────────────────┐
│ [≡] 尼曼区 ▾        [🔍][筛选] │
│┌─────────────────────────────┐│
││   MAPBOX  ★▓你收藏的店(RED)  ││ ← pin จาก RED list = ดาวพิเศษ
││     ★▓   ●你   ▓   ▓halo     ││
│└─────────────────────────────┘│
│ ╔═══════════════════════════╗ │
│ ║ ⭐ Cafe-Hop · 你清单里有3家 ║ │ ← overlap RED × quest
│ ║ 打卡3家 → 免费咖啡 ☕       ║ │
│ ║              [查看 →]      ║ │
│ ╚═══════════════════════════╝ │
│ 💳 支持 支付宝/微信支付         │ ← payment rail ชัด
└───────────────────────────────┘
```
- **ACTION:** Li Wei เห็นว่าร้านที่เซฟจาก RED 3 ร้านอยู่ใน Cafe-Hop quest → แตะ `查看`.
- **SYSTEM:** แสดง `payment_accepts` filter (alipay/wechat) เด่น เพราะ segment นี้สนใจ "จ่ายได้ไหม" สูง. reward ทุกที่แสดงเป็น "免费咖啡 ☕" **ไม่มีตัวเลขบาท** (fix #2).
- **FEEL:** "ลิสต์ที่ฉันทำการบ้านมา = เกมที่ได้ของฟรี" — RED planning เปลี่ยนเป็น loyalty โดยไม่ต้องเริ่มใหม่.

#### Step B3 — check-in แรก → WeChat auth gate (defer เหมือนเดิม) · `S-CHECKIN` → `S-AUTH` (zh)
```
S-AUTH (zh, WeChat บนสุด)
┌───────────────────────────────┐
│   保存你的第一个印章 🎟          │ ← save your first stamp
│   登录以保存行程进度             │   (active-locale เดียว)
│ ┌───────────────────────────┐ │
│ │  微信登录 WeChat       💬  │ │ ← จีน: WeChat บนสุด
│ │  支付宝登录 Alipay     🅰  │ │
│ │  Apple / Google         │ │ ← fallback ยังอยู่เสมอ
│ └───────────────────────────┘ │
│   [稍后再说，继续浏览]           │ ← maybe later
└───────────────────────────────┘
```
- **ACTION:** check-in ร้านแรก (GPS dwell) → first value-capture → S-AUTH → Li Wei แตะ `微信登录`.
- **SYSTEM:** WeChat OAuth (native-first SDK ผ่าน platform channel). set `audience_segment='tourist_cn'`. merge guest progress (+ merge-conflict path เหมือน A4). **WeChat ที่ launch = MINIMAL แต่ปุ่มเปิดจริง** — ถ้า WeChat SDK ใน region มีปัญหา → **toast เงียบ + เลื่อนไป Apple/Google ใต้ปุ่ม ไม่ block stamp**. first stamp = provisional จน server confirm (เหมือน A4). 📈 TTFS หยุดที่นี่.
- **FEEL:** login ด้วยปุ่มเดียวที่ใช้ทุกวัน — ไม่มี friction ของ email/OTP ต่างชาติ.

#### Step B4 — สะสม 3 stamp → mint Coins → redeem แยกจาก "สแกนจ่าย" · `S-REDEEM-C` (zh)
```
S-REDEEM-C (zh, redeem ≠ payment)
┌───────────────────────────────┐
│         免费咖啡 ☕            │
│      在 Akha Ama 出示          │
│     ███████████████           │
│     ██ ⟳ 二维码 ██  ◷ 0:54    │
│     ███████████████           │
│   或报数字: 4 8 2 1 9 3        │
│   📍 你在店内 ✓               │ ← indoor-tolerant geofence
│   由店员扫描 — 非你本人扫描     │ ← staff scans, not you
│ ─────────────────────────────│
│ 💳 这是奖励兑换，非付款         │ ← "reward redeem, NOT payment"
│    付款请另用支付宝/微信        │   จ่ายบิลแยกผ่าน Alipay/WeChat
└───────────────────────────────┘
   (店员扫码后 → "正在核实…"
    จน server ตอบ, ห้าม imply 成功)
```
- **ACTION:** Li Wei สะสมครบ 3 → Coins mint → เดินเข้าร้านที่ 4 → โชว์ rotating QR ให้พนักงานสแกน. จ่าย "ค่าอื่น" (ถ้ามี) แยกผ่าน Alipay+ ตามปกติ.
- **SYSTEM:** redemption state machine เหมือน 5.A (มี "正在核实… / VALIDATING" in-flight). **จุดต่างของ persona นี้:** UI แยกชัดระหว่าง (ก) **redeem reward** (burn Coin, ฟรี) กับ (ข) **จ่ายบิล** (Alipay/WeChat Pay, เงินจริง) — กัน mental-model ปนกันที่อันตรายสุดสำหรับ persona ที่คุ้น "สแกนจ่าย" ทุกอย่าง.
- **FEEL:** "ของฟรีคือสแกนให้พนักงาน, จ่ายเงินคือ Alipay ของฉันเอง" — สองสิ่งไม่ปน.

> ⚠️ **Riskiest Moments (5.B) + de-risk:**
> 1. **"สแกนจ่าย" mental model ทับ redeem (major):** persona จีนคุ้น "ทุกอย่างสแกนจ่ายได้" → เสี่ยงเข้าใจว่า redeem = ตัดเงิน หรือ Coins = ยอดเงิน. **De-risk:** ป้าย `这是奖励兑换，非付款 · 付款请另用支付宝` + แยก redeem ออกจาก Alipay-pay เด็ดขาด + "店员扫描" ย้ำว่าลูกค้า initiate ไม่ได้ + **Coins แสดงเป็น "免费咖啡 ☕" ไม่มีเลขบาท** (fix #2).
> 2. **ZH content บาง (MINIMAL) ที่ Nimman:** ร้านบาง zh ไม่ครบ → ดูร้าง. **De-risk:** auto-MT fallback (draft, มี marker) + curated ≥80% ครอบ quest-path ก่อน + RED-import (S-RED-IMPORT) ชดเชยด้วยร้านที่ผู้ใช้รู้จักอยู่แล้ว.
> 3. **WeChat login เปราะ (B3):** SDK/region. **De-risk:** ปุ่ม WeChat บนสุดแต่ Apple/Google ยังอยู่ใต้เสมอ; fail → toast เงียบ + เลื่อน provider ถัดไป ไม่ block stamp.
> 4. **Redeem-time geofence false-block (major, ใช้ร่วม 5.A#7):** เหมือน 5.A — indoor-tolerant + เชื่อเครื่อง merchant + staff override → async review.

---

### 5.C — LOCAL / NOMAD: daily streaks → weekly drop → neighborhood leaderboard → off-season retention

> 🎯 **UX Goal:** ทำให้คนท้องถิ่น/nomad ที่อยู่ทั้งปี retain ผ่าน **Sparks economy** (ฟรี, ไม่แตะเงิน) — สร้างนิสัยรายวัน/รายสัปดาห์ที่ไม่พึ่ง high-season traffic.
> 📈 **Metric:** `D7/D30_retention` · `streak_length` · `weekly_drop_open_rate` · `leaderboard_return_rate` · **`off_season_DAU`** · `push_opt_in_rate`.
> **Persona:** Nok (นก), nomad ไทย-อังกฤษ อยู่ Nimman ประจำ, login LINE แล้ว, locale = th. มาเพื่อ "เป็นเจ้าถิ่น" ไม่ใช่ "ของฟรีจากทริป".

#### Step C1 — Home ที่จำได้ว่าเป็น "ขาประจำ" · `S-DISCOVER` (returning, th)
```
┌───────────────────────────────┐
│ สวัสดีนก 👋   🔥 streak 6 วัน   │ ← streak counter เด่นบนสุด
│ ┌───────────────────────────┐ │
│ │ 🔥 เช็คอินวันนี้ต่อ streak! │ │ ← daily nudge (1 จอเดียว)
│ │ อีก 1 วันได้ Sparks x2     │ │
│ └───────────────────────────┘ │
│┌─────────────────────────────┐│
││   MAPBOX  ●คุณ  ▓ที่ยังไม่ไป  ││ ← เน้น "ที่ยังไม่เคย"
│└─────────────────────────────┘│
│ 📦 Weekly Drop ใหม่! (ศุกร์)   │ ← teaser ของสัปดาห์
│ "5 ร้านลับ Santitham" [ดู →]  │
│ 🏆 อันดับย่าน: คุณ #3 ใน Nimman│ ← leaderboard hook
└───────────────────────────────┘
```
- **ACTION:** Nok เปิดแอปเช้านี้ → เห็น streak 6 วัน + nudge ว่าอีกวันได้ Sparks x2.
- **SYSTEM:** `spark_events(reason='streak_bonus')`; streak = consecutive check-in days. multiplier บน schema `spark_reason`. **Sparks-only (non-money)** — ไม่แตะ escrow/Coins. push nudge ส่งเฉพาะถ้า Nok grant push primer (S-PUSH-PRIME) ไว้.
- **FEEL:** "ฉันมี streak ต้องรักษา" — loss-aversion ขับ daily return.

#### Step C2 — รักษา streak ด้วย check-in เร็ว · `S-CHECKIN` (T1 พอ)
```
┌───────────────────────────────┐
│  📍 อยู่ที่ Graph Cafe          │
│  🔥 เช็คอินรักษา streak (วันที่7)│
│  ◉ GPS dwell ✓ (พอสำหรับ Sparks)│ ← T1 พอ ไม่ต้องสแกน
│  ┌───────────────────────────┐ │
│  │ เช็คอิน +20 ✨ (x2 = +40)  │ │
│  └───────────────────────────┘ │
│  💡 สแกน QR โต๊ะ = stamp แรงขึ้น│ ← upsell tier ไม่บังคับ
└───────────────────────────────┘
```
- **ACTION:** Nok check-in เร็ว (T1 GPS dwell) → streak ต่อเป็นวันที่ 7 → ได้ Sparks x2.
- **SYSTEM:** `check_in` non-money, tier `gps_dwell`. Sparks multiplier apply. ไม่มี auth wall (login แล้ว). impossible-travel guard ยังทำงาน. (check-in ซ้ำ ๆ ของผู้ใช้เก่า = optimistic+queue ได้ — anti-rollback บังคับเฉพาะ first stamp ของ persona ใหม่, ไม่ใช่ที่นี่.)
- **FEEL:** "30 วินาทีก็รักษา streak ได้" — low-effort daily habit. (Coins ต้อง quest แต่ Sparks ได้ทุกวัน = retention engine).

#### Step C3 — Weekly Drop (วันศุกร์, FOMO ที่ดี) · `S-QUEST` (variant: Sparks+badge, no-escrow)
> **เพิ่มจาก completeness (minor, seasonal variant):** Weekly Drop = **variant ของ S-QUEST** ที่ reward เป็น **Sparks + badge (ไม่มี Coin/escrow card)** + FOMO countdown — ต่างจาก escrow-aware Quest Detail ปกติ (§2.6). ระบุเป็น documented variant.
```
┌───────────────────────────────┐
│ 📦 WEEKLY DROP · ศุกร์นี้เท่านั้น│ ◷ 2วัน 4ชม
│ "5 ร้านลับ Santitham"           │
│ ┌───┬───┬───┬───┬───┐          │
│ │ ? │ ? │ ? │ ? │ ? │ → 🏅badge│ ← collectible พิเศษ
│ └───┴───┴───┴───┴───┘          │
│ • ร้านใหม่ที่ agent เพิ่งยืนยัน  │ ← freshness = ของใหม่จริง
│ • สะสมครบ → badge "Santitham    │
│   Explorer" + 200 ✨           │ ← reward = Sparks+badge
│   (ไม่มี Coin · ไม่ใช้ escrow)   │ ← variant marker
│ ⚠️ หมดศุกร์หน้า — badge หายถ้าพลาด│
│ [เริ่มเก็บ →]                   │
└───────────────────────────────┘
```
- **ACTION:** Nok เปิด Weekly Drop วันศุกร์ → เห็น 5 ร้านใหม่ + badge limited → เริ่มเก็บ.
- **SYSTEM:** `quest_type='standard'` ที่มี `starts_at/ends_at` แคบ (7 วัน) + reward = **Sparks + badge** (ไม่ใช่ Coins — ไม่ต้อง escrow, ทำได้ทุกสัปดาห์โดยไม่เปลือง merchant fund). UI ของ variant นี้ **ไม่มี escrow/Coin card**. seed จาก agent ที่เพิ่ง verify ร้านใหม่. (badge detail/all-badges view = destination ใน §2.6/§2.9, ไม่ใช่จอ §5.)
- **FEEL:** "ต้องเก็บสัปดาห์นี้ ไม่งั้นพลาด badge" — FOMO ที่ขับ weekly return โดยไม่ spam.

#### Step C4 — Neighborhood Leaderboard (สถานะทางสังคม) · `S-PASSPORT` (leaderboard tab)
```
┌───────────────────────────────┐
│ 🏆 อันดับย่าน — Nimman (สัปดาห์)│
│ ┌───────────────────────────┐ │
│ │ 1  🥇 BaristaBoy   1,240 ✨│ │
│ │ 2  🥈 chiangmaicat   980 ✨│ │
│ │ 3  🥉 นก (คุณ)        910 ✨│ │ ← ตัวเองไฮไลต์
│ │ 4     nomad_jane      870 ✨│ │
│ └───────────────────────────┘ │
│ อีก 70 ✨ แซงขึ้น #2!           │ ← actionable gap
│ [รีเซ็ตทุกจันทร์] · เฉพาะย่านคุณ │ ← scope = neighborhood
│ 🔁 ตามเพื่อนบ้าน / ดูย่านอื่น   │
└───────────────────────────────┘
```
- **ACTION:** Nok เช็คอันดับ → เห็นตัวเอง #3, ห่าง #2 แค่ 70 Sparks → ออกไปเก็บเพิ่ม.
- **SYSTEM:** leaderboard = ranking บน `spark_balances` scope `district_id` + weekly window (reset จันทร์). **Sparks only** — never money, never redeemable. PDPA: แสดง display_name อย่างเดียว, opt-out ได้.
- **FEEL:** "ฉันเป็นเจ้าถิ่นอันดับ 3 ของ Nimman" — สถานะทางสังคมระดับย่าน (เล็กพอจะไปถึง #1 ได้).

#### Step C5 — Off-season retention (burning/rainy) · `S-DISCOVER` (low-season variant)
```
┌───────────────────────────────┐
│ ☔ หน้าฝน · ย่านคุณยังมีของเล่น  │
│ ┌───────────────────────────┐ │
│ │ 🔥 streak 21 วัน — อย่าให้ขาด│ │ ← streak ยิ่งยาว ยิ่งหวง
│ │ 🏅 badge สะสม: 7/12 ย่าน    │ │ ← long-term collection
│ │ ☕ Indoor Cafe quest (กันฝน) │ │ ← seasonal-aware quest
│ └───────────────────────────┘ │
│ 📦 Weekly Drop ยังมาทุกศุกร์    │ ← จังหวะคงที่ = anchor
│ 💚 ของพรีเมียม off-season:      │
│   double Sparks ทุกเช็คอิน      │ ← ใช้ Sparks (ฟรี) ดัน DAU
└───────────────────────────────┘
```
- **ACTION:** ช่วง low-season Nok ยังเปิดแอปเพราะ streak 21 วัน + badge collection + weekly drop ตรงเวลา.
- **SYSTEM:** off-season lever = **Sparks economy ล้วน** (double-Sparks event, streak, badge, weekly drop) — ไม่พึ่ง merchant escrow/Coins (high-season-heavy). "ฐาน local/nomad ที่ agent เก็บไว้ทั้งปี" บาลานซ์ seasonality.
- **FEEL:** "ถึงไม่มีนักท่องเที่ยว ย่านฉันก็ยังมีอะไรให้เล่น" — retention ไม่ผูกกับ traffic.

> ⚠️ **Riskiest Moments (5.C) + de-risk:**
> 1. **Sparks ดูเหมือน "เงินปลอม" หรือไร้ค่า:** ถ้าไม่มี payoff จับต้อง → คนเลิกสน; ถ้าดูเหมือนเงิน → สับสนกับ Coins. **De-risk:** Sparks payoff = **สถานะ** (leaderboard/badge/tier) ไม่ใช่ของ; ป้าย "XP only · no cash" ทุกที่; สี/ไอคอน (✨) ต่างจาก Coins (☕) เด็ดขาด (และ Coin-gold ต้องดึงออกจาก amber CTA/warning ระดับ §1 — palette fix #3).
> 2. **Streak-loss churn:** ขาด 1 วัน = หมดกำลังใจ. **De-risk:** "streak freeze" 1 ครั้ง/สัปดาห์ (ซื้อด้วย Sparks) + nudge ก่อนหมดวัน (geofenced, 1 ครั้ง) ไม่ spam.
> 3. **Notification fatigue:** local เปิดทุกวัน → push มาก = uninstall. **De-risk:** push **consent-gated ผ่าน S-PUSH-PRIME** (ดู 5.A5), low-volume; daily streak nudge รวมเป็น 1 ข้อความ/วัน; Weekly Drop = ศุกร์เดียว; deny → ไม่มี geo-push.

---

### 5.D — MERCHANT: counter redeem ระหว่าง lunch rush (< 5 วินาที, มือถือเครื่องเดียว, ไม่มี POS)

> 🎯 **UX Goal:** เจ้าของร้านข้าวซอยวัย 55 ถือ Android เครื่องเดียว ช่วงเที่ยงคิวยาว — ยิง redemption ให้ลูกค้าเสร็จใน < 5 วินาที โดยไม่ต้อง login POS, ไม่ต้องลง app, ไม่ต้องคิด.
> 📈 **Metric:** **`counter_redeem_time` (<5s)** · `redeem_success_rate` · `merchant_first_redeem_completed` · `staff_redeem_share` · `otp_fallback_success_rate` (path ที่การันตี <5s).
> **Persona:** ป้าสมจิต เจ้าของร้านข้าวซอย, ไม่ใช่สาย tech, มี Counter Scanner bookmark บน home screen (agent ตั้งให้ตอน onboard — ดู 5.E).

#### Step D1 — เปิด Counter Scanner (no-install) + camera-warming/denied states · `S-COUNTER` (idle)
> **เพิ่มจาก critique (major, camera permission + LINE in-app browser):** draft เดิมสมมติกล้อง warm+permissioned แล้ว. เพิ่ม 3 state: **warming**, **permission-denied → OTP เป็น primary**, **LINE in-app browser blocked → เปิดใน Chrome/Safari หรือ default ไป OTP**.
```
idle (พร้อม)                     camera warming           camera denied / LINE-blocked
┌─────────────────────┐         ┌─────────────────────┐  ┌─────────────────────────┐
│ ร้านป้าสมจิต ●online │         │  กำลังเปิดกล้อง…     │  │ กล้องใช้ไม่ได้ในหน้านี้   │
│ ─────────────────── │         │   ▢▢▢ (skeleton)    │  │ ┌─────────────────────┐ │
│  ┌───────────────┐  │         │   ⟳                 │  │ │  ⌨ กรอกเลข 6 หลัก    │ │ ← OTP = PRIMARY
│  │ 📷 สแกนจ่าย    │  │         └─────────────────────┘  │ │  จากจอลูกค้า          │ │   (ปุ่มใหญ่เต็ม ไม่ใช่ลิงก์)
│  │    รางวัล      │  │ ← ปุ่มเดียว                       │ └─────────────────────┘ │
│  └───────────────┘  │   camera pre-warm                 │ [เปิดใน Chrome/Safari]  │ ← LINE webview → ออกนอก
│ [⌨ กรอกเลข 6 หลัก] │   ตอน launch                      │ [ขออนุญาตกล้องอีกครั้ง] │ ← re-grant 1 แตะ
│ Escrow: ฿4,200 ✓    │                                   └─────────────────────────┘
└─────────────────────┘
```
- **ACTION:** ป้าสมจิตแตะ bookmark "Counter" → PWA เปิด (session, ไม่ต้อง login) → ถ้ากล้องพร้อม เห็นปุ่มเดียว; ถ้ากล้องโดนบล็อก เห็น **OTP keypad เป็น primary surface ทันที**.
- **SYSTEM:** PWA route แยก (no-install, service worker). session ยาว, ปลดด้วย PIN ไม่ใช่ login เต็ม. role = `cashier`/`owner` (staff sub-account แตะเงิน/bank ไม่ได้). **pre-warm `getUserMedia` ตอน launch.** ตรวจ user-agent: ถ้าเป็น **LINE in-app webview** ที่กล้องถูกจำกัด → เสนอ "เปิดใน Chrome/Safari" หรือ default ไป OTP. permission-denied → fall ไป OTP keypad (primary) + ปุ่ม re-grant. อ่าน `platform_freeze_state` + escrow balance ก่อน.
- **FEEL:** "เปิดมาเจอปุ่มเดียว กดแล้วกล้องขึ้น" — และถ้ากล้องมีปัญหา **ไม่เจอจอดำตัน** แต่เจอช่องกรอกเลขทันที.

#### Step D2 — ลูกค้าโชว์ QR, ป้าสแกน (วินาที 0–3) · `S-COUNTER` (scanning) / OTP fallback
```
scanning                          OTP fallback (มือเปื้อน/จอแตก/แดด)
┌───────────────────────────────┐  ┌───────────────────────────────┐
│   เล็งกล้องไปที่จอลูกค้า          │  │   ให้ลูกค้าอ่านเลข 6 หลัก       │
│ ┌───────────────────────────┐ │  │   ┌───┬───┬───┬───┬───┬───┐  │
│ │   [ ▢ กรอบเล็งสแกน ]       │ │  │   │ 4 │ 8 │ 2 │ 1 │ 9 │ 3 │  │
│ │      ⟳ กำลังอ่าน...         │ │  │   └───┴───┴───┴───┴───┴───┘  │
│ └───────────────────────────┘ │  │   [ยืนยัน →]   (<5s ได้เช่นกัน)│
│   (ลูกค้าถือ S-REDEEM-C ⟳QR)   │  └───────────────────────────────┘
└───────────────────────────────┘
        │ auto-decode nonce            │ rotating → replay ไม่ได้
        ▼  state: CODE_ISSUED → VALIDATING (ทั้งสอง path ลง gate เดียวกัน)
```
- **ACTION:** ลูกค้าโชว์ rotating QR → ป้าเล็งกล้อง → auto-decode (ไม่ต้องกดถ่าย). **ถ้าสแกนไม่ติด → ป้าอ่านเลข 6 หลักจากลูกค้าแล้วกรอก** (path การันตี <5s).
- **SYSTEM:** scanner/OTP อ่าน nonce → POST ไป `redeem` edge-fn → **`VALIDATING` (แสดง "กำลังตรวจสอบ…")**: (1) code สด+ไม่เคยใช้? (2) **geofence — เชื่อเครื่อง merchant (เคาน์เตอร์คงที่) ไม่ใช่ GPS ลูกค้าที่ drift** (fix #7 ใช้ร่วม 5.A) (3) Coin ลูกค้าพอ? (4) impossible-travel/fraud? gate ทั้งหมด server-side. OTP กับ QR ลง gate เดียวกัน (rotating → replay ไม่ได้).
- **FEEL:** "เล็งแล้วมันอ่านเอง" — zero typing; ถ้ามือเปื้อนน้ำซุปก็มี OTP เด่นเท่ากัน.

#### Step D3 — ผลลัพธ์ 3 ทาง: เขียว / พักตรวจ / แดง (วินาที 3–5) · `S-COUNTER` (result)
> **เพิ่มจาก critique:** (major, third state) เพิ่มจอที่ 3 **"พักตรวจ/manual-review-hold"** (self-redeem-flagged A.8.12, velocity soft-freeze) ที่ **ไม่ใช่ red reject** เพราะลูกค้าอยู่ตรงหน้า. (major, reason leak) เปลี่ยน reason "ลูกค้าทำ quest ไม่ครบ" ที่ leak สถานะลูกค้า → ปิดที่ฝั่ง consumer (รหัสที่ยังแลกไม่ได้ห้ามถึงเคาน์เตอร์) และถ้าหลุดมาให้แสดงกลาง ๆ "ให้ลูกค้าตรวจในแอป".
```
🟢 สำเร็จ                  🟠 พักตรวจ (hold)            🔴 ปฏิเสธ
┌───────────────────┐     ┌───────────────────┐        ┌───────────────────┐
│        🟢 ✓        │     │        🟠 ⏸        │        │        🔴 ✕        │
│     สำเร็จ! 🔔      │     │   ต้องตรวจเพิ่ม     │        │     ใช้ไม่ได้       │
│  ☕ กาแฟฟรี 1 แก้ว  │     │   แจ้งทีมงาน        │ ← ไม่ใช่ │  ❗ โค้ดหมดอายุ      │ ← เหตุผลสั้น
│  ให้ลูกค้าได้เลย     │     │   "รออีกสักครู่ค่ะ"  │   reject  │  ให้ลูกค้ากดขอใหม่   │  (หมดอายุ/อ่อน
│ [เสร็จ — คนต่อไป →]│     │   (ไม่มี try-again)  │        │  [ลองสแกนอีกครั้ง] │   สัญญาณ — ไม่ใช่
└───────────────────┘     └───────────────────┘        └───────────────────┘   "ไกล"/"fraud")
 เสียง "ติ๊ง" + สั่น        เสียงกลาง + อมส้ม            เสียงต่ำ + แดง

  รหัสที่ "ยังแลกไม่ได้" (quest ไม่ครบ) → ห้ามออกโค้ดตั้งแต่ฝั่ง consumer.
  ถ้าหลุดมา: แสดงกลาง ๆ "รหัสนี้ยังใช้ไม่ได้ — ให้ลูกค้าตรวจในแอป"
  (ไม่เปิดเผยว่าเหลืออีกกี่ร้าน — ไม่ให้ป้าต้องสอนเกมตอนคิวยาว)
```
- **ACTION:** ป้าเห็นจอเขียว + "ติ๊ง" → ส่งกาแฟ → แตะ `[คนต่อไป]`. ถ้า **🟠 พักตรวจ** → บอกลูกค้า "รอสักครู่" (ไม่ใช่ปฏิเสธ, ไม่มี try-again loop). ถ้า **🔴 แดง** → บอกลูกค้ากดขอใหม่.
- **SYSTEM:** pass → `BURNING` (atomic REDEEM txn, idempotency=redemption_id, FIFO lot decrement) → `SETTLED` (Coin burned, take-rate เข้า `platform_revenue`, push ทั้ง 2 ฝั่ง). **hold (self-redeem A.8.12 / velocity soft-freeze)** → state กลาง, route ไป async review, ไม่ burn, ไม่ปฏิเสธถาวร. fail → `REJECTED` + เหตุผล mapped (แยก "GPS อ่อน" ออกจาก "ไกล/fraud"). **redeem-code ที่ยัง unclaimable ถูก gate ที่ฝั่ง consumer → ไม่มีทางถึงเคาน์เตอร์** (กัน reason leak). ทั้งหมด < 5 วินาที.
- **FEEL:** สี + เสียง = อ่านผลได้โดยไม่ต้องอ่านตัวหนังสือ (สำคัญสำหรับวัย 55 + คิวยาว + เสียงดัง) — และ **"พักตรวจ" ดูต่างจาก "ปฏิเสธ" ชัดเจน** ป้าไม่เผลอไล่ลูกค้า.

#### Step D4 — Offline-tolerant (เน็ตร้านหลุดช่วงพีค) · `S-COUNTER` (queued)
```
┌───────────────────────────────┐
│   ⏳ รอยืนยัน (เน็ตช้า)         │
│   อย่าเพิ่งนับว่าจ่ายแล้ว        │ ← ห้าม imply สำเร็จ
│   ระบบจะยืนยันเมื่อเน็ตกลับมา    │
│   [ค้างไว้ คิวต่อไปได้]         │
└───────────────────────────────┘
```
- **SYSTEM:** เน็ตหลุด → queue intent + แสดง "รอยืนยัน". **ห้ามนับว่าจ่ายแล้วจน server ตอบ** (กัน double-spend ขณะ offline). burn จริง + settle เกิดตอน reconcile online เท่านั้น (PROVISIONAL_BURN = Phase 2 per-merchant flag — MVP = online-only burn).
- **FEEL:** ป้าไม่ต้องตัดสินใจอะไร — ระบบบอกชัดว่า "ยังไม่จบ, ทำคิวต่อไปก่อน".

> ⚠️ **Riskiest Moments (5.D) + de-risk:**
> 1. **The merchant's FIRST redeem (existential activation):** ครั้งแรกล้มเหลว/งง → ร้านเลิกใช้ทั้งระบบ. **De-risk:** agent ทำ **dry-run redeem จำลอง** ตอน onboard (5.E6) ให้ป้าเห็นจอเขียวด้วยตาก่อนลูกค้าจริง; ปุ่มเดียว + camera auto-open + ผลเป็นสี/เสียง (อ่านไม่ต้องแปล).
> 2. **กล้องเปิดไม่ได้ / LINE in-app browser block / first-frame ช้า (major):** บน LINE webview กล้องถูกจำกัดบ่อย; budget Android กลางแดดช้า; จอดำเงียบ = ทางตันสำหรับวัย 55. **De-risk:** เพิ่ม state warming-skeleton, permission-denied → **OTP keypad เป็น primary** (ไม่ใช่ลิงก์เล็ก) + ปุ่ม re-grant, ตรวจ LINE webview → "เปิดใน Chrome/Safari" หรือ default OTP; pre-warm getUserMedia; OTP path การันตี <5s ด้วยตัวเอง.
> 3. **มือเปื้อน/จอแตก/แดดจ้า:** lunch rush จริง. **De-risk:** OTP 6-หลัก เด่นพอ ๆ กับสแกน; ผล validate เหมือนกัน (rotating → replay ไม่ได้).
> 4. **Redeem geofence false-block ลูกค้าที่อยู่ตรงหน้า (major):** GPS ลูกค้า drift ในตึก → red reject ที่ป้าแก้ไม่ได้. **De-risk:** **เชื่อ geofence ของเครื่อง merchant (เคาน์เตอร์คงที่)** ไม่ใช่ GPS ลูกค้า; แยก "GPS อ่อน" ออกจาก "ไกล/fraud"; มี **staff override → async review** แทน hard reject สำหรับลูกค้าที่ยืนยันว่าอยู่จริง.
> 5. **เน็ตหลุด → double-pay หรือ "จ่ายฟรีไม่ burn":** **De-risk:** offline = queue + "รอยืนยัน" ห้าม imply สำเร็จ; idempotency_key=redemption_id กดซ้ำไม่ burn ซ้ำ; ความเสี่ยง offline ตกที่ merchant ที่ "เลือกรับ" ไม่ใช่แพลตฟอร์ม.
> 6. **Staff (ไม่ใช่เจ้าของ) ยิง redeem:** **De-risk:** `cashier` sub-account ยิง redeem ได้ แต่แตะ escrow/bank/billing ไม่ได้ (RLS scope).
> 7. **Reason leak + queue stall จาก "quest ไม่ครบ" (major):** แสดงสถานะ quest ลูกค้าให้ร้านเห็น + ให้ป้าสอนเกมตอนคิวยาว. **De-risk:** gate ออกโค้ดที่ฝั่ง consumer (unclaimable ไม่ถึงเคาน์เตอร์); ถ้าหลุด → "ให้ลูกค้าตรวจในแอป" โดยไม่เผย internals.

---

### 5.E — AGENT: seed + onboard ร้านกาแฟ Nimman ใหม่ (moat ในงานเดียว)

> 🎯 **UX Goal:** Field Agent (นิสิต CMU) เดินเข้า Nimman ร้านใหม่ที่ยังไม่มีในระบบ → seed ข้อมูล (รูปสด/พิกัด/เวลา) → onboard เจ้าของให้ claim + ตั้ง Counter Scanner — ครบในการเยือนครั้งเดียว โดย **ไม่เคยเขียน live data** (ทุกอย่างเป็น Change Proposal).
> 📈 **Metric:** `places_seeded/agent/day` · `photo_freshness` · `merchant_onboard_rate` · `density_gate_progress` (Nimman ≥90%) · `proposal_approval_rate`.
> **Persona:** Beam (บีม), agent role-gated ในแอป consumer ตัวเดียวกัน, territory CNX-NIMMAN. **role origin (completeness):** Beam ได้ role `field_agent` ผ่าน playbook/role-acquisition ใน **§4.6** (referral หรือ City Manager assignment) — จอนั้นเป็นของ §4, storyboard นี้เริ่มหลัง role พร้อมแล้ว.

#### Step E1 — เปิด Agent Mode + รับ task · `S-AGENT-MAP`
```
┌───────────────────────────────┐
│ [≡ สลับเป็นโหมดผู้ใช้]  AGENT 🛠 │ ← role-gated, สลับโหมดในแอปเดียว
│┌─────────────────────────────┐│
││ MAPBOX · เขตของคุณ CNX-NIMMAN ││ ← territory geofence
││  ▒▒▒ polygon Soi 1–17 ▒▒▒    ││
││  ▓done ✗gap(ยังไม่มีข้อมูล)   ││ ← ช่องว่าง coverage
││  📍 ร้านใหม่ตรงนี้! (ยังไม่ seed)││
│└─────────────────────────────┘│
│ 📋 งานวันนี้ (3):              │
│ • seed_new_place · Soi 11 ☕   │ ← task จาก scheduler (ไม่เลือกเอง)
│ • verify_hours · Graph Cafe   │
│ • onboard_merchant · ร้านใหม่  │
│ Coverage Nimman: 87% → 90%🎯  │ ← Density Gate progress
└───────────────────────────────┘
```
- **ACTION:** Beam สลับเป็น Agent Mode → เห็น territory + gap + task list → แตะ `seed_new_place · Soi 11`.
- **SYSTEM:** role-gated ด้วย JWT claim (consumer+agent codebase เดียว). task generate โดย scheduler จาก Freshness SLA (anti-cherry-pick). territory = PostGIS polygon, ทำงานนอกเขตไม่ได้.
- **FEEL:** "เห็นชัดว่าตรงไหนยังขาด + งานถูกป้อนให้" — ไม่ต้องคิดว่าทำอะไรต่อ.
- **Edge note (role revoked mid-session, completeness):** ถ้า role `field_agent` ถูกถอนระหว่าง session → ปุ่ม Agent Mode หาย, แอป fallback เป็น consumer mode ปกติ (ข้อมูล draft ที่ค้างไม่ถูก submit), แสดง toast "Agent access ended". (จอ fallback เต็มอยู่ใน §4.0.)

#### Step E2 — Capture ร้านใหม่ (fresh photo only, liveness แบบไม่ block) · `S-AGENT-CAP`
> **ปรับจาก critique (minor, liveness angle friction):** angle prompt เปลี่ยนเป็น **"preferred" ไม่ใช่ hard-required** — ถ้ามุมที่สุ่มถ่ายไม่ได้ (กำแพง/รถ/ร้านติดกัน) ให้ fallback "ถ่าย 2 มุมนอกที่ต่างกัน" แล้วให้ server ให้คะแนน multi-angle แทน hard-block.
```
┌───────────────────────────────┐
│  📷 ถ่ายร้าน · Soi 11 Cafe      │
│ ┌───────────────────────────┐ │
│ │   [ live camera viewfinder]│ │ ← in-app camera เท่านั้น
│ │    🔒 ห้ามอัปจาก gallery    │ │   (fresh-only)
│ └───────────────────────────┘ │
│  📍 GPS: 18.7989, 98.9676 ✓   │ ← พิกัด auto-stamp
│  ⏱ ถ่ายสด 2 นาทีที่แล้ว        │
│  💡 ถ้าได้: ถ่ายจากมุมซ้าย       │ ← preferred (ไม่ใช่บังคับ)
│     เห็นป้าย+ประตู              │
│  ↳ ถ่ายมุมนั้นไม่ได้? เก็บ 2 มุม  │ ← fallback ไม่ block
│     นอกที่ต่างกันแทน            │
│  [▢][▢][▢][▢][＋] 4/5 รูป      │ ← ต้อง ≥5 รูป
│  [ถัดไป: กรอกข้อมูล →]         │
└───────────────────────────────┘
```
- **ACTION:** Beam ถ่ายร้าน ≥5 รูป (หน้าร้าน/เมนู/ที่นั่ง) ด้วย in-app camera → กรอก hours/price/category. ถ้ามุม preferred ถ่ายไม่ได้ → เก็บ 2 มุมนอกต่างกันแทน.
- **SYSTEM:** **fresh-only**: camera in-app เท่านั้น, ห้าม gallery (กัน stock/เก่า). GPS + timestamp stamp ทุกรูป. ≥5 รูป = bar ของ Density Gate. **liveness angle = preferred prompt + server scoring multi-angle** (ไม่ hard-require มุมเดียวที่อาจถ่ายไม่ได้). media → `media(owner_type='place')`.
- **FEEL:** "ถ่ายสดเท่านั้น" = ผู้ใช้ปลายทางเชื่อ freshness halo ได้จริง — moat ที่ Google Maps ทำไม่ได้ — **แต่ anti-fraud ไม่กลายเป็นการสอบสวนที่ถ่ายตามไม่ได้.**

#### Step E3 — Submit เป็น Change Proposal (ไม่ใช่ live) · `S-AGENT-CAP` (review)
```
┌───────────────────────────────┐
│  ตรวจก่อนส่ง · ข้อเสนอแก้ไข     │
│  ┌─────────────────────────┐  │
│  │ ร้านใหม่: Soi 11 Cafe     │  │
│  │ หมวด: eat/cafe ☕         │  │
│  │ เวลา: 8:00–18:00         │  │
│  │ ราคา: ฿฿                 │  │
│  │ รูป: 5 (สดวันนี้)         │  │
│  │ TH ✓  EN ✓  ZH (auto MT) │  │ ← trilingual ก่อนส่ง
│  └─────────────────────────┘  │
│  ⚠️ นี่คือ "ข้อเสนอ" — จะขึ้น   │
│  จริงเมื่อ moderator อนุมัติ     │ ← ย้ำกฎเหล็ก
│  [ส่งให้ moderator →]          │
└───────────────────────────────┘
        │ INSERT change_proposals (ไม่แตะ places live)
        ▼  status: pending → (moderator console, §3.3/Admin) approved → apply_proposal
```
- **ACTION:** Beam ตรวจ diff → แตะ `[ส่งให้ moderator]`.
- **SYSTEM:** **กฎเหล็ก:** agent ไม่เคยเขียน live data. INSERT `change_proposals(status='pending', proposer_role='field_agent')` เท่านั้น. live write เกิดผ่าน `apply_proposal` edge-fn หลัง **moderator (author≠moderator SoD) อนุมัติใน Admin/Moderator console** → bump `places.version` + `places_history` + `data_freshness.last_verified_*`. **(dependency, completeness critical):** console ที่ moderator review diff+evidence+EXIF/geo/pHash จริง = web surface ใน **§3.3/Admin** — ต้องมีในสเปกนั้น (ไม่ใช่จอ §5; 5.E เห็นแค่ output).
- **FEEL:** Beam เห็นชัดว่า "ของฉันยังไม่ขึ้นจนกว่าจะถูกตรวจ" — moat + anti-fraud ในจอเดียว.

#### Step E4 — ติดตามสถานะ moderation · `S-AGENT-MAP` (status tab)
```
┌───────────────────────────────┐
│  📋 ข้อเสนอของฉัน              │
│  • Soi 11 Cafe   ⏳ รอตรวจ     │
│  • Graph hours   ✓ อนุมัติแล้ว │ ← ขึ้น live แล้ว
│  • Roast8ry pic  ✗ ตีกลับ:     │
│    "รูปเบลอ ถ่ายใหม่" [อุทธรณ์] │ ← feedback ชัด + appeal CTA
│  วันนี้: 4 อนุมัติ · 1 รอ       │
│  Trust ladder: Verified 🥈      │ ← agent trust progression
└───────────────────────────────┘
```
- **ACTION:** Beam เช็คสถานะ → เห็นที่อนุมัติขึ้น live, ที่ตีกลับมี reason ชัด + ปุ่ม `[อุทธรณ์]`.
- **SYSTEM:** approved → place `status='published'` + `is_visible` → โผล่บน consumer map (S-DISCOVER) ทันที. rejected → feedback loop. agent trust ladder (Probation/Verified/Senior) ขยับตาม approval rate. **(dependency, completeness major):** ปุ่ม `[อุทธรณ์]` เปิด **agent appeal form (§4.4)** — จอ form/สถานะ appeal เป็น deliverable ของ §4, ไม่ใช่จอ §5.
- **FEEL:** "งานฉันมีผลจริง — ร้านที่ฉัน seed โผล่บนแอปแล้ว" — closeloop ที่สร้าง agent retention.

#### Step E5 — Onboard merchant หน้างาน (claim + verify) · `S-AGENT-MAP` (onboard task)
```
┌───────────────────────────────┐
│  🤝 onboard ร้าน · เจ้าของอยู่ตรงนี้│
│  ขั้นตอน (Agent-led on-premise):│
│  ① เจ้าของสแกน QR เพื่อ claim ร้าน│ ← onpremise_qr proof
│  ② ยืนยันตัวตน (โทร OTP/บัตร)    │ → trust: claimed → identity_verified
│  ③ ตั้ง Counter Scanner bookmark │ ← bookmark ลง home screen เลย
│  ④ เติม escrow (PromptPay)      │ → trust: → finance_verified
│  ┌───────────────────────────┐ │
│  │ เริ่ม onboard →            │ │
│  └───────────────────────────┘ │
└───────────────────────────────┘
```
- **ACTION:** Beam ช่วยป้าสมจิต claim ร้าน → ยืนยันตัวตน → ตั้ง Counter Scanner bookmark → ช่วยเติม escrow ครั้งแรก.
- **SYSTEM:** Agent-led on-premise: `merchant_proofs(method='onpremise_qr')` → `trust_state: claimed_unverified → identity_verified`. escrow top-up (PREFUND→PSP_SETTLE) → settled cash → `trust_state → finance_verified` (ปลดสิทธิ์ออก redemption). Beam tracked เป็น `onboarded_by_agent_id`. **(dependency, completeness critical):** จอ **merchant signup/deep-link claim landing + auth** ที่เจ้าของสแกน QR แล้วเข้าไปนั้น = **§3.1.a** (รวม "owner ไม่มี LINE/smartphone" fallback) — เป็น deliverable ของ §3, ไม่ใช่จอ §5. **earn-QR ≠ redeem-QR:** QR claim/onboard นี้คนละอันกับ rotating QR จ่ายรางวัล (ย้ำใน step ③).
- **FEEL:** ป้าได้ "ร้านพร้อมรับลูกค้า + ปุ่ม Counter บนจอ" ในนัดเดียว — ไม่ต้องนั่งตั้งค่าเอง.

#### Step E6 — ⭐ Dry-run redeem (de-risk merchant's first redeem) · `S-COUNTER` (test mode)
```
┌───────────────────────────────┐
│  🧪 ลองยิงรางวัล (โหมดทดสอบ)    │
│  Beam ถือมือถือทำเป็นลูกค้า:     │
│  → ป้าสแกน QR ทดสอบ            │
│  → 🟢 "สำเร็จ!" (จำลอง ไม่ burn) │ ← ป้าเห็นจอเขียวด้วยตา
│  "เห็นไหมคะป้า เขียว=ส่งของได้    │
│   ส้ม=รอตรวจ แดง=ให้กดใหม่"      │ ← ครอบ 3 สีของ D3
│  [ป้าลองเองอีกครั้ง →]          │ ← ทำซ้ำจนมั่นใจ
└───────────────────────────────┘
```
- **ACTION:** Beam ทำ dry-run: ถือมือถือเป็นลูกค้าจำลอง → ให้ป้าสแกน → ป้าเห็นจอเขียว → ป้าลองเองจนมั่นใจ.
- **SYSTEM:** test-mode redemption (sandbox, ไม่ burn จริง, ไม่แตะ ledger) — จำลอง flow 5.D **ครบทั้ง 3 ผลลัพธ์ (เขียว/พักตรวจ/แดง)** ให้เห็น.
- **FEEL:** ป้าผ่าน "first redeem" ในสภาพไร้ความเสี่ยง → ตอนลูกค้าจริงมา (5.D) ไม่ตื่นตระหนก. **จุดเชื่อม 5.E → 5.D ที่ de-risk activation ฝั่งร้านโดยตรง.**

> ⚠️ **Riskiest Moments (5.E) + de-risk:**
> 1. **Agent เขียน live data ตรง (ทำลาย moat + anti-fraud):** **De-risk:** UI ไม่มี "save live" — มีแค่ `[ส่งให้ moderator]`; ทุกจอ submit ย้ำ "ข้อเสนอ"; DB invariant บังคับ (agent role ไม่มีสิทธิ์ write `places`).
> 2. **รูปเก่า/stock ทำลาย freshness trust:** **De-risk:** in-app camera only, ห้าม gallery, GPS+timestamp ทุกรูป; **liveness angle = preferred + server scoring** (ไม่ hard-block มุมที่ถ่ายไม่ได้ — กัน workaround/friction กับ agent ที่ซื่อสัตย์).
> 3. **Merchant onboard แล้วทิ้ง (ไม่เคย redeem):** **De-risk:** dry-run redeem (E6) บังคับใน onboard task — ร้านต้องเห็นจอเขียวก่อน Beam จากไป; bookmark ตั้งให้บน home screen เลย.
> 4. **Onboard ไม่ครบ finance_verify → ออก redemption ไม่ได้ → ร้าน "ตายเงียบ":** **De-risk:** task onboard มี checklist 4 ขั้น; escrow top-up อยู่ในขั้นตอนเดียวกัน; trust_state แสดงให้ Beam เห็นว่า "ยังขาดอะไร".

---

### 5.F — Cross-Storyboard Risk Matrix (จุดที่ทุก flow มาบรรจบ)

| Riskiest UX Moment | เกิดใน flow | ทำไมอันตราย | ดีไซน์ de-risk อย่างไร |
|---|---|---|---|
| **AHA clock ถูก permission/persona gate บัง** | 5.A1, 5.B1 | gate ก่อนเห็นค่า + 4G ช้า + tile load → เกิน 60s ถึงจอมีคุณค่า | render map+nearby+featured ก่อน (coarse/IP) · priming เป็น in-context sheet ไม่ใช่ gate · ตัดจอ persona-branch · วัด `ms_to_first_place` |
| **Permission priming (location)** | 5.A1, 5.B1, 5.C2 | deny → empty map → loop ตายตั้งแต่ AHA; copy สัญญาเกินจริง = PDPA risk | prime *ทำไม* in-context · coarse-first · deny → district dropdown · copy "used only at check-in/redeem · no continuous map" ตรงกับ consent record |
| **Auth-gate timing + merge conflict** | 5.A4, 5.B3 | wall เร็วไป = แพ้ก่อนเห็นค่า; ช้าไป = เสีย stamp; merge ชน account เดิม | gate ที่ "first value-capture" · framing "save progress" · `[Maybe later]` เสมอ · merge-conflict → "found your account" choice |
| **First stamp ฉลองแล้ว rollback** | 5.A4 | revoke ช่วง activation = ทำลาย trust หนักกว่าไม่ให้ | stamp แรกรอ server confirm ก่อน celebrate ("saving…") · optimistic-rollback ใช้กับ check-in ถัดไปเท่านั้น |
| **Trilingual stacked headline** | 5.A1, 5.B1 | 3 บรรทัด + Thai line-height + dynamic type → overflow + ZH fallback font | headline/CTA = active-locale เดียว · stacking เฉพาะการ์ดเลือกภาษา |
| **Coins ≠ cash (e-money line)** | 5.A6/A7, 5.B4, ทุก wallet | imply cash-out + แสดงเลขบาทคู่ Coin = สอน convert→บาท = ผิดนิยาม ธปท. | consumer แสดง Coins เป็น "ของที่แลกได้ ☕" เท่านั้น · **ไม่มีตัวเลขบาทคู่กัน** · "expires" · ไม่มีปุ่มถอน · มูลค่าบาทอยู่ฝั่ง merchant เท่านั้น |
| **Coin-gold vs amber palette collision** | ทุก wallet/coin/quest | amber = brand+CTA+aging+warning ชนกับ Coin-gold = แยกไม่ออก | (§1) ดึง Coin-gold ออกจาก brand-amber · near-expiry ใช้ danger+⚠ ไม่ใช่ amber-on-gold · ตัวเลข Coin ใช้ ink (contrast ≥4.5:1) สงวน gold ที่ไอคอน |
| **Redeem geofence false-block (ลูกค้าอยู่ตรงหน้า)** | 5.A7, 5.B4, 5.D2/D3 | GPS ลูกค้า drift ในตึก → red reject ที่ staff แก้ไม่ได้ บนจังหวะ trust สูงสุด | เชื่อ geofence เครื่อง merchant (เคาน์เตอร์คงที่) · indoor-tolerant radius · แยก "GPS อ่อน" จาก "ไกล/fraud" · staff override → async review |
| **Merchant's FIRST redeem** | 5.D, เชื่อมจาก 5.E6 | ครั้งแรกพัง = ร้านเลิกใช้ทั้งระบบ | dry-run จำลองตอน onboard · ปุ่มเดียว · ผลเป็นสี/เสียง · OTP fallback |
| **Counter camera denied / LINE in-app block** | 5.D1/D2 | จอดำเงียบสำหรับวัย 55 = ทางตัน; LINE webview จำกัดกล้อง | warming-skeleton · denied → OTP keypad เป็น primary + re-grant · ตรวจ LINE webview → "เปิดใน Chrome/Safari" · pre-warm getUserMedia |
| **Counter reason leak + "quest ไม่ครบ" stall** | 5.D3 | เผยสถานะ quest ลูกค้าให้ร้าน + ให้ป้าสอนเกมตอนคิวยาว | gate ออกโค้ดที่ฝั่ง consumer (unclaimable ไม่ถึงเคาน์เตอร์) · ถ้าหลุด → "ให้ลูกค้าตรวจในแอป" ไม่เผย internals |
| **Counter ไม่มี "พักตรวจ/hold" state** | 5.D3 | self-redeem/velocity-freeze แสดงเป็น red reject ทั้งที่ลูกค้าอยู่ → ป้าไล่ลูกค้า | จอที่ 3 สีส้ม "ต้องตรวจเพิ่ม" ไม่มี try-again loop · ต่างจากเขียว+แดงชัด |
| **Money-action ไม่มี in-flight state** | 5.A6/A8, 5.D2/D3 | jump trigger→ผล โดยไม่มี loading = สับสน/กดซ้ำ | "minting your reward…" (mint) · "Verifying at counter… / VALIDATING" (redeem) · grant-failure fallback ที่ EARN→GRANT bridge |
| **"สแกนจ่าย" ทับ redeem (จีน)** | 5.B4 | persona จีนคุ้นสแกนจ่ายทุกอย่าง → คิดว่า redeem = ตัดเงิน | ป้าย "奖励兑换，非付款 · 付款请另用支付宝" · แยก redeem ออกจาก Alipay-pay · "店员扫描" |
| **Static customer QR (fraud)** | 5.A7, 5.B4, 5.D | static = ปั๊มของฟรีได้ | merchant-initiated เท่านั้น · rotating nonce TTL 90s · geofenced · server-burn |
| **Wallet auth-on-open dead-end (guest)** | 5.A7 | guest เปิด wallet เปล่าเจอ auth modal = อ่านเป็น signup wall | guest = read-only explainer ("Sparks=XP, Coins=rewards, sign in at first stamp") · auth เฉพาะ first value-capture |
| **Coin expiry + escrow pause ชนกัน** | 5.A7 | รางวัลที่ได้โดยชอบ หมดอายุ + ถูกพักพร้อมกัน = unfair | expiry generous + สื่อชัดตอน grant · ถ้า escrow paused ใกล้หมดอายุ → auto-extend เท่าระยะ pause |
| **Freshness null = stale (overclaim)** | 5.A2 | never-verified แสดงเหมือน verified 22 วัน = โกหก trust | แยก state "not yet verified" (เทา) จาก "stale" (อมส้ม) · down-rank never-verified ใน AHA feed |
| **Agent เขียน live / รูปเก่า / liveness บีบเกิน** | 5.E2–E3 | ทำลาย moat + freshness; angle บังคับที่ถ่ายไม่ได้ = friction/workaround | Change Proposal only (ไม่มี save live) · in-app camera fresh-only · GPS+timestamp · liveness = preferred + server scoring |
| **Off-season churn** | 5.C5 | high-season-dependent = ตายหน้าฝน | Sparks economy ล้วน (streak/badge/weekly drop/double-Sparks) ไม่พึ่ง traffic |
| **Push fatigue / ไม่มี primer** | 5.A5, 5.C | 5.C พึ่ง push แต่ไม่มี primer = ส่งโดยไม่ consent หรือไม่ได้ส่งเลย | S-PUSH-PRIME consent-gated หลัง first value · 1 nudge/วัน · deny → ไม่มี geo-push |

> **บรรทัดเดียวที่ร้อยทุก storyboard:** *ของจริงก่อน identity, identity ก่อนเงิน, เงิน (Coins) ก่อน redeem — และทุกชั้นที่ "เพิ่ม friction" ถูกเลื่อนไปจังหวะที่ผู้ใช้ได้คุณค่ามากพอจะยอมจ่าย friction นั้น.* TTFS (server-confirmed) คือมาตรวัดว่าเราทำสำเร็จ.

---

### 5.G — Out-of-scope dependencies (จาก critique ที่ "ไม่ใช่จอ §5" — ระบุไว้กัน orphan)

> finding เหล่านี้ touch storyboard แต่ deliverable อยู่ใน section อื่น — บันทึกไว้เพื่อ handoff ครบ ไม่ใช่ reject เฉย ๆ:
>
> - **Moderator/Admin console** (Change-Proposal review + diff/EXIF/geo/pHash, Gate-1 Identity, Gate-2 Finance, SoD author≠moderator) → **§3.3/Admin** (5.E3/E4 เห็นแค่ output). *critique critical.*
> - **Merchant signup + deep-link claim landing + "no LINE/smartphone" fallback** → **§3.1.a** (5.E5 เรียกใช้เป็น step). *critique critical.*
> - **Consumer review composer + report-UGC** → **§2.5/§2.8** (ไม่อยู่ใน critical path ของ §5 storyboard ใด). *critique critical แต่ไม่ใช่จอ heroflow.*
> - **Agent appeal form/status** → **§4.4** (5.E4 มี CTA `[อุทธรณ์]`). **Agent playbook + role-acquisition** → **§4.6** (5.E1 role origin). *critique major/minor.*
> - **Merchant Billing/Settings/Redemptions-list/payout-bank re-verify (PAYOUT_FROZEN) + staff sub-account mgmt** → **§3.0 nav**. *critique minor.*
> - **Bottom-nav label inconsistency (Discover/Search/Me vs Home/Discover/Profile) + freshness enum + palette token** → **§1/§2 design-system+IA** (ต้อง reconcile ก่อน build; §5 ใช้ชื่อ canonical Home/Discover/Passport/Wallet/Profile และ palette/contrast fix ตามที่ note ใน 5.A7). *critique minor.*
> - **Badge detail/all-badges · Place-Detail far-CTA behavior · search pinyin/mixed-script no-match** → **§2.x** (5.C3 อ้าง badge, 5.A3 อ้าง far-CTA แต่จอ detail เป็นของ §2). *critique minor.*

---

## ภาคผนวก: ความเสี่ยง/ข้อจำกัด UX คงเหลือ
### Design System & Brand
- §1 ระบุ Coin gold = metallic #C9962A และเลขเงิน=ink เพื่อแก้ contrast แต่ #C9962A-on-white ≈ 3.0:1 ผ่านแค่ large-text marginally — ต้องรัน contrast checker จริงบน gold-50 pill + dark-mode gold (#E0B452) ก่อน lock; ค่า hex อาจต้องปรับ ±1 step
- พิมพ์ผิด/อักขระเสีย 1 จุดใน §1.2 ตาราง currency (gold-foil highlight cell มีอักขระ mojibake 'koš台' หลุดเข้ามา) — ต้องแก้เป็นค่า hex highlight ที่ตั้งใจ (#E6C158) ก่อนส่ง handoff
- freshness สถานะที่ 4 (never-verified) เพิ่มใน §1 แล้ว แต่ enum จริง `freshness_label` ใน schema (§2.7/04_mvp_data_model) ยังเป็น fresh/aging/stale 3 ค่า — ต้อง confirm ว่า backend จะ derive never จาก null หรือเพิ่ม enum value (cross-section dependency, อยู่นอก §1)
- การลบมูลค่าบาทฝั่งผู้ใช้แก้ที่ design-system แล้ว แต่ wireframe จริงใน §2.5/§2.7/§2.8/§5.A และ Counter analytics §3 ยังพิมพ์ '~฿70'/'฿720' — ต้อง propagate การลบไปทุก section ปลายทาง (ไม่อยู่ในขอบเขต §1)
- Counter LINE-in-app-browser detection อาศัย UA sniffing ซึ่งเปราะ; pre-warm getUserMedia อาจยัง re-prompt ใน webview บางรุ่น — ต้อง QA บนอุปกรณ์จริง (Android budget + LINE) ก่อนยืนยัน <5s OTP-fallback path
- first-stamp 'ต้องรอ online confirm' ขัดกับ §2.11 offline matrix ที่อนุญาต optimistic check-in — ต้อง reconcile กฎ offline ของ §2.11 ให้ exempt stamp แรก (cross-section, นอก §1)
- privacy copy ต้องตรงคำต่อคำกับ PDPA consent center (§2.10/03_operational_subsystems) — §1 กำหนด pattern แต่ wording จริงต้อง sign-off โดย legal/PDPA owner
- หลาย finding ที่ปฏิเสธ (AHA gate, wallet auth-on-open, redeem geofence, moderator console, review composer ฯลฯ) ถูกชี้ไปยัง §2–§5 ใน §1.10 — ถ้า section เหล่านั้นไม่ได้รับ critique เดียวกัน อาจหล่น; ควรยืนยันว่า orchestrator ส่ง finding ไป section ปลายทางครบ

### Consumer App (IA+Wireframes)
- REJECTED findings are explicitly merchant/agent-section concerns (Counter PWA camera-permission/LINE-webview, Counter REJECTED-reason leak, Counter third manual-review/VALIDATING states, moderator/admin console, merchant signup/billing/settings/redemptions/payout, agent appeal/playbook/onboarding/liveness-angle, §5.0 cross-ref renumber). They are NOT fixed here by design — they must be folded into §3 (Merchant), §4 (Field Agent), and §5 (Storyboards). If those sections are not updated, the cross-surface handoffs (esp. consumer redeem ↔ Counter PWA, review composer ↔ moderation console) remain orphaned.
- The 'report this review' and review-submission both route to a moderation/admin queue that lives outside the consumer section; the consumer screens are drawn but the destination console is still undrawn (out of scope here).
- New token values (Coin metallic gold #C8881C, Coin numeral ink #221B12) are proposed at the section level and must be reconciled into the design-system §1.2/§1.7 palette + verified for 4.5:1 contrast against the actual Coins-card background before build; I did not have the §1 design-system file to edit, so this is a stated requirement, not a verified change.
- Bottom-nav canonicalization (Home/Discover/Passport/Wallet/Profile) and the consent-copy alignment require corresponding edits in §1.4 and the PDPA/i18n catalog; flagged in-spec but those source files were not present to edit.
- Indoor-generous redeem geofence + 'trust merchant device' resolves the consumer-side false-block, but the staff-side override → async-review path it references is a Counter PWA (§3.2.g) screen that still needs drawing for the loop to close.
- Coin auto-extend-on-pause is specified as UX intent; it implies a backend rule (extend coin_lots.expires_at by pause duration) that must be implemented in the escrow/ledger layer (§5 Loyalty Engine) — UX alone cannot guarantee it.
- Guest quest-start persistence is device-scoped: if the device clears app storage before first stamp, progress is genuinely unrecoverable (handled gracefully as a 0/5 reset, but the value is lost) — this is an accepted tradeoff of the zero-signup-wall rule, not eliminated.

### Merchant Web + Counter PWA
- REJECTED (out-of-scope, consumer-side): heuristics#1 AHA<60s S1/S2 gate, #3 amber palette เชิงลึก (Coin-gold pill/wallet), wallet auth-on-open, offline first-stamp rollback, trilingual typography ฝั่ง first-run, freshness null vs stale, bottom-nav label, §5.0 cross-ref renumber — เป็น consumer (§2/§5) ไม่กระทบ markdown ฝั่ง merchant; เฉพาะ slice ที่ทับ merchant (฿-face-value merchant-only, amber-in-warning, locale-active) ถูกดึงเข้ามาแล้ว
- REJECTED (out-of-scope completeness, consumer/agent): review composer, report-UGC, push opt-in primer, seasonal/badge detail, agent appeal/playbook/role-acquisition, guest quest-start recovery, RED-list import, consumer redeem 'verifying' + quest-complete mint loading — อยู่ §2/§4/§5; ฝั่ง merchant ครอบเฉพาะ Counter VALIDATING (3.2.c) ที่เป็น merchant surface
- ORPHAN ยังเปิดอยู่: Admin/Moderator console (Gate 1/Gate 2 + Change-Proposal review) ถูก 'note + cross-ref' แต่ตัวจอจริงต้องสร้างเป็น section แยก — ถ้าไม่สร้าง pending จาก 3.1.b/3.1.j จะค้างไม่มีคน resolve (บันทึกใน 3.3 แล้ว)
- COGS cap numbers (฿80/redeem, ฿6,000/month, take-rate ~12%, break-even ~46%) เป็น placeholder ในไวร์เฟรม — ของจริงต้องรอ founder set REWARD_PER_REDEMPTION_CAP_THB / MERCHANT_MONTHLY_COGS_CAP_THB (INERT-UNTIL-SIZED); UI fail-closed แล้วแต่ตัวเลขโชว์เป็น illustrative
- Billing tier prices แสดง '฿XXX' (ยังไม่ sizing) — ต้องเติมเมื่อ pricing locked; โครงจอ build-ready แล้ว
- staff-override → async review (weak-GPS) ต้องมี backend review pipeline + UI ฝั่ง override ที่ยังไม่ draw รายละเอียด field (ระบุ behavior แล้ว แต่ form override ยังเป็น stub)
- ASCII wireframe column alignment อาจเลื่อนเล็กน้อยเมื่อ render ใน proportional font — เป็น annotated mockup ไม่ใช่ pixel spec; ความหมาย/ลำดับ element ถูกต้องครบ

### Field Agent Mode
- Moderator/Admin Change-Proposal review console (critique completeness CRITICAL) is NOT drawn here — intentionally rejected as out-of-scope for the AGENT section because it is a separate web admin persona; §4.4/§4.8 route to it but it MUST be authored as its own section or the proposal pipeline (pending→approved) has no human-review surface. This is the single biggest unresolved cross-cutting gap.
- Merchant-side deep-link landing + first-time signup + verify stepper (critique CRITICAL) is only contracted from the agent side (§4.5 annotates what the QR must encode). The actual merchant signup/account-create/claim screens belong to the Merchant (§3.x) section and remain undrawn there.
- Schema mapping for 'price verification' is a documented workaround (verify_hours/confirm_closed + change_proposals target='hours'), not a clean enum — if the team wants a first-class price task, that is a genuine migration change (add task_type/proposal_target value), not resolvable in UX alone.
- Task claim-lock / countdown / primary-agent-6h-priority are specified as APP-LAYER orchestration (e.g. a task_locks/assignment row) because tasks has no claimed_by/lock_expires_at columns — the backing table/edge-fn for locks is assumed but not defined in migration #1 as read; needs confirmation during build.
- Consumer/merchant-only critique findings were deliberately excluded from this section (rejected as not-agent): S1 AHA permission gate, Coins baht face-value, Counter PWA camera/permission/LINE-webview/third-result states, redeem double-geofence false-block, trilingual first-run typography, wallet auth-on-open, offline first-stamp rollback, counter insufficient-coins leak, bottom-nav label fork, §5.0 broken cross-refs, review composer, money-action loading states, push opt-in primer, quest auth-boundary, seasonal/badge detail, merchant billing/settings/redemptions/payout-bank screens. These remain open in their own sections.
- The amber/Coin-gold hue-overloading critique is only partially addressed (the agent-mode slice via §4.7); the global design-system fix (pull Coin gold off brand-amber, or move aging/--warning off amber) still needs to be applied in §1.x design tokens to fully resolve it everywhere.
- Reputation tier thresholds, QA-sampling percentages, multiplier range (0.8x–1.5x), and SLA day-counts (hours/price 30d, photos 90d) are shown as concrete numbers for build-readiness but are product-policy values that should be confirmed against final S4/B.2.3 tuning before lock.

### Hero Flow Storyboards
- Palette de-collision (Coin-gold vs brand-primary amber), bottom-nav canonical label set (Home/Discover/Passport/Wallet/Profile), and the freshness enum split are ROOT-fixed in §1/§2 design-system+IA, not here. §5 only references the intended end-state; if §1/§2 aren't updated to match, the wireframes will still render with the overloaded amber and forked tab labels/analytics.
- The Moderator/Admin console, merchant first-time signup/deep-link claim landing, consumer review composer, agent appeal form, agent playbook/role-acquisition, and merchant Billing/Settings/Redemptions/payout screens are flagged as dependencies in §5.G but remain UNDRAWN — they are deliverables of §3/§4/Admin and must be specced there or these end-to-end journeys still have orphaned hand-offs.
- Several fixes assert backend behavior the spec can't unilaterally guarantee: (a) location-priming copy is only honest if the data model truly avoids continuous background location and minimizes check-in geo; (b) merchant-device-trusted geofence requires the counter device to be verifiably fixed/registered; (c) coin auto-extend-on-pause and first-stamp server-confirm-before-celebrate require corresponding edge-fn/ledger logic. These need engineering confirmation, not just UI.
- LINE in-app-browser camera support and getUserMedia pre-warm latency on budget Android are environment-dependent; the OTP-primary fallback is the guaranteed <5s path, but the actual camera-path <5s claim still needs field measurement.
- RED-import is MVP paste/lookup fuzzy-match only (deep-link API deferred); match quality on Hanzi/screenshot text vs TH/EN place names is unproven and red_import_match_rate could be low, weakening the 5.B AHA hook in practice.
- AHA via coarse/IP location can mis-place a user across district boundaries (e.g., IP geolocates to a datacenter), which would show the wrong district's seeded content on first render; the district-dropdown fallback mitigates but the default-render accuracy is a live risk.
