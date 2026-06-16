# 📑 Master Index — ระบบชุมชนท่องเที่ยว/ไลฟ์สไตล์ท้องถิ่น (เชียงใหม่)

> **สถานะ:** เอกสารออกแบบระบบ (ยังไม่เขียนโค้ด) · **อัปเดต:** 2026-06-14
> เริ่มอ่านที่ไฟล์นี้ → ไป [OPEN_DECISIONS.md](OPEN_DECISIONS.md) เพื่อดูสิ่งที่ต้องเคาะ → แล้วเจาะรายระบบตามสารบัญด้านล่าง

---

## 1. ระบบนี้คืออะไร (Product Thesis)

แอปมือถือ **community ท่องเที่ยว+ไลฟ์สไตล์ท้องถิ่น** เริ่มที่เชียงใหม่ ขยายต่อจังหวัดอื่นได้ — รวบรวมที่ **กิน / เที่ยว / ทำกิจกรรม** พร้อมโปรโมชั่น รีวิว และ **เกมสะสมแต้มข้ามร้าน** (ไป Cafe A + B + ร้านข้าว C → แลกกาแฟฟรี)

**สิ่งที่ทำให้ขายได้และก๊อปยาก (moat):**
1. **เครือข่าย Quest ข้ามร้านของร้านอิสระ** — สิ่งที่ Wongnai/Google/The1 ทำไม่ได้เชิงโครงสร้าง (ทบต้น: ยิ่งมีร้าน quest ยิ่งรวย)
2. **ข้อมูลสดยืนยันโดย Field Agent** (นักศึกษา มช./พายัพ) — แก้ปัญหา cold-start + เป็นทีมขาย
3. **3 ภาษาในร้านเดียว** (ไทย/อังกฤษ/จีน) — เชียงใหม่เป็นที่เดียวที่ 3 กลุ่มชนกันทุกวัน
4. **แลกของจริงต้องมาจริง** → ถ่วงน้ำหนักรีวิว = แก้ปัญหารีวิวปลอม

> หลักการเหนือทุกอย่าง: *ระบบสร้างกว้างตั้งแต่วันแรก แต่ปูข้อมูล/เปิดตัวทีละย่าน* (เลี่ยง "แผนที่ว่างเปล่า" = ตัวฆ่าแอป local อันดับ 1)

---

## 2. สถาปัตยกรรมโดยย่อ

```
                    ┌──────────────────────────────────────────┐
   Consumer App ────┤  Flutter (consumer + role-gated agent)    │
   (TH/EN/ZH)       └──────────────────────────────────────────┘
                                      │
   Merchant/Admin ── Next.js+Refine ──┤   Counter PWA (scan <5s)
   Web Dashboard                      │
                                      ▼
              ┌──────────────────────────────────────────────┐
              │  NestJS money-plane (TS) + worker  ← เจ้าของ  │
              │  ตรรกะเงิน (grant/redeem/payout/tax/recon)    │
              └──────────────────────────────────────────────┘
                                      │ money_writer role
                                      ▼
              ┌──────────────────────────────────────────────┐
              │  Supabase data-plane: Postgres + Auth + RLS   │
              │  + Storage + Realtime · PostGIS · Mapbox      │
              │  ─ Double-entry LEDGER (เงิน, satang) ─────── │ ← หัวใจ
              │    + plpgsql gate fn + DB invariants          │
              │  ─ Sparks (XP, แยกจากเงิน) ────────────────── │
              └──────────────────────────────────────────────┘
                 │            │            │            │
            Thai PSP /    LINE Msg     Object       Analytics
          Alipay/WeChat     API      Storage+CDN   (PostHog/Sentry)
```
> สถาปัตยกรรมเต็ม + เหตุผล + เส้นทาง scale P0→P3 อยู่ใน [doc 05](05_stack_decision.md)

- **12 roles** (Role + Scope + ABAC): Customer, Platform Owner/Admin, Merchant, Field Agent, Content Moderator, City Manager, Brand/Sponsor, Support/CS, Finance/Payout, Analyst/API-Partner, DPO
- **2 สกุล:** Sparks (ฟรี) / Coins (มูลค่าบาท, merchant-prefunded escrow, non-cashable)
- **ระบบปฏิบัติการ 6 ตัว (S1–S6):** Support/ข้อพิพาท · Notification · Auth/Identity · Payout/ภาษี · Review moderation · Observability/Reconciliation/DR

---

## 3. สารบัญเอกสาร (อ่านตามลำดับนี้)

| # | ไฟล์ | เนื้อหา | ขนาด |
|---|---|---|---|
| 0 | **README.md** (ไฟล์นี้) | ภาพรวม + จุดเริ่ม | — |
| 1 | [SYSTEM_PLAN.md](SYSTEM_PLAN.md) | แผนระบบเต็ม 13 ส่วน: data model, RBAC, loyalty engine, field-agent ops, merchant, consumer app, monetization, tech architecture, roadmap/GTM | ~3,400 บรรทัด |
| 2 | [02_canonical_ledger_pricing_legal.md](02_canonical_ledger_pricing_legal.md) | **ledger v1.0** + **ราคา/take-rate/agent comp** + **กฎหมายไทย** (locked, ผ่าน adversarial review) | ~1,160 บรรทัด |
| 2b | [02b_canonical_ledger_v1_1.md](02b_canonical_ledger_v1_1.md) | **ledger v1.1 amendment** — เพิ่มบัญชีภาษี/payout/goodwill + txn + 5 seam-enforcement invariants (ปิดวง) | — |
| 3 | [03_operational_subsystems.md](03_operational_subsystems.md) | **S1–S6** ระบบปฏิบัติการ (ผ่าน integration review + money/security red-team) | ~2,970 บรรทัด |
| 4 | [04_mvp_scope_and_data_model.md](04_mvp_scope_and_data_model.md) | **MVP scope** (feature cut) + **ERD/migration #1 DDL** + **RLS/constraints/edge-functions** (สะพานไป build) | ~1,785 บรรทัด |
| 5 | [05_stack_decision.md](05_stack_decision.md) | **ADR เลือก stack** (judge panel 5 ทางเลือก) → Hybrid-TS: Flutter + Next/Refine + **NestJS money-plane** + Supabase/Postgres + เส้นทาง scale P0→P3 | — |
| 6 | [06_ux_ui_design.md](06_ux_ui_design.md) | **UX/UI blueprint**: design system (Lanna-modern, "Locale") + IA + ASCII wireframes (consumer/merchant/counter/agent) + hero flows | ~3,265 บรรทัด |
| 7 | [07_admin_console_and_missing_screens.md](07_admin_console_and_missing_screens.md) | **Admin/Moderator console** (back-office S1–S6: moderation queue, merchant verify, finance/payout, solvency/freeze, DPO/PDPA, city manager) + หน้าจอที่ขาด (review composer, merchant signup, agent appeal) | ~2,337 บรรทัด |
| 8 | [08_engagement_social_layer.md](08_engagement_social_layer.md) | **Engagement & Social layer** (gamification): Sparks-as-fuel doctrine + social/leaderboard + co-op/seasonal collectibles + variable-rewards & กฎหมายพนัน + Flutter mapping/rollout. ทุกฟีเจอร์ติดป้าย PURE-FLUTTER/SERVER-GATED/LEGAL-CHECK | ~1,599 บรรทัด |
| 9 | [09_build_roadmap.md](09_build_roadmap.md) | **Build Roadmap → Nimman pilot**: integrated 5-track timeline (eng/field-ops/legal/product/team) + critical path + gates + first-2-weeks + critique-fixes. ~26-30 wk to pilot | ~720 บรรทัด |
| 10 | [10_business_plan.md](10_business_plan.md) | **แผนธุรกิจ & หาลูกค้า (GTM)**: คืออะไร/ทำอะไร · 4 ขารายได้ + ราคา · moat · **แนวทางหาลูกค้า** (supply-first ปูพรมทีละย่าน, founder-led sales, field-agent, ช่องนักท่องเที่ยว) · growth motions · คู่แข่ง · KPIs · ความเสี่ยง/กฎหมาย | — |
| ★ | [OPEN_DECISIONS.md](OPEN_DECISIONS.md) | **tracker** รวมการตัดสินใจ + พารามิเตอร์ + legal sign-off ทั้งหมด | — |

> **หมายเหตุ:** doc 05 **ปรับ** backend จาก baseline เดิม (money logic ใน Supabase Edge Functions/Deno ที่ §10/doc04 §3) → **NestJS money-plane (TypeScript)** ที่เป็นเจ้าของตรรกะเงิน ส่วน **plpgsql gate functions + DB invariants + migration #1 schema ใช้ต่อได้ทั้งหมด** (เปลี่ยนแค่ชั้น orchestration ไม่ใช่ ledger)

**precedence (ที่ใดขัดกัน):** ledger v1.0 (§A ใน doc 02) > v1.1 (§A2 ใน doc 02b) > pricing/legal (B/C) > subsystems (S1–S6)

---

## 4. หัวใจที่ต้องเข้าใจก่อน build

1. **เงินทุกบาทเดินผ่าน ledger เท่านั้น** — ห้าม `UPDATE` ยอดตรงๆ ที่ไหนเลย ทุกการชดเชย/รางวัล/ภาษี = post txn ที่บาลานซ์เป็นศูนย์
2. **มินต์ Coin ได้เฉพาะเงินที่ settle จริง** (gate บน `bank_settlement`) — แพลตฟอร์มไม่สำรองจ่าย
3. **anti-self-redemption = เส้นกฎหมาย e-money** — ห้ามให้ร้าน redeem Coin ที่ตัวเองค้ำเพื่อถอนเป็นเงินสด
4. **ทุก path ที่ขยับเงินผ่าน gate เดียวกัน** (COGS cap + fraud-gate + solvency) ไม่ว่าจะมาจาก subsystem ไหน — ไม่มีประตูหลัง
5. **migration #1 ต้องมี `merchant_id` + `city_id` ทุกตารางการเงิน** + ratify ทุกบัญชีเข้า S6 reconciliation พร้อมกัน

---

## 5. สถานะ & ขั้นต่อไป

**เสร็จแล้ว:** แผนระบบเต็ม · canonical ledger/pricing/legal (v1.0 + v1.1 ปิดวง) · 6 subsystem ปฏิบัติการ · **MVP scope + ERD/migration #1 + RLS/edge-functions** — ทั้งหมดผ่าน adversarial review และสอดคล้องกันเอง พร้อมระดับเริ่ม build

**ก่อน build:** เคาะพารามิเตอร์ใน [OPEN_DECISIONS.md](OPEN_DECISIONS.md) §B (โดยเฉพาะ COGS caps ที่ block D7/CS grant)
**ก่อน go-live:** legal sign-off §C (e-money, escrow, agent classification)
**ตัวเลือกถัดไป:** เขียน SQL migration #1 จริง (จาก doc 04) + scaffold โปรเจกต์ · หรือ user flow/wireframe ฝั่งผู้ใช้ · หรือ vertical-slice prototype ของ Nimman Cafe-Hop loop
