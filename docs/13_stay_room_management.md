# 13 — ที่พัก: Room-Management SaaS (no-money) · Build Plan

> สถานะ: `LOCKED` (เคาะ 2026-06-18) · เจ้าของโครงการ + การวิเคราะห์หลายเอเจนต์
> เอกสารนี้ = แผน build ของการยกระดับ "ที่พัก" จาก showcase (0020) → ระบบบริหารห้องจริงที่ขายเป็น SaaS

## 1. ทิศทาง (ตัดสินใจแล้ว — ออกแบบรอบตรงนี้ ห้าม relitigate)

ปัจจุบัน vertical ที่พัก = **showcase แบบไม่ทำธุรกรรม** (`stay_units`, 0020): โชว์ป้ายห้องว่าง + ปุ่มทักไลน์/โทร ติดต่อนอกแอป ไม่มีจอง/ปฏิทิน/จ่ายเงิน และ `stay_units` ไม่เคย join เข้า ledger

เป้าหมายใหม่ — ทำให้เจ้าของ **บริหารห้องจริง** แล้วขายเป็น **SaaS แยกผลิตภัณฑ์**:

- **Depth:** วางโครงตึก (กี่ชั้น / กี่ห้อง / รูปแบบห้อง) + คุมห้องว่าง-ไม่ว่าง + ว่างวันไหน (รายเดือน **และ** รายวัน)
- **ไม่ทำ:** เงินในระบบ · ใบแจ้งหนี้ · ประวัติผู้เช่าแบบ structured (บัตร ปชช./สัญญา/การเงิน)
- **PII ที่ยอมเก็บ (เบามาก):** (1) ช่องโน้ตอิสระต่อห้อง/บล็อก (เจ้าของจดเอง เช่น "สมชาย ถึง 31 ธ.ค.") (2) กล่องคำขอจอง/ดูห้อง (เก็บ contact ของลูกค้าที่ทักผ่านมาร์เก็ตเพลส)
- **GTM:** console เดียว ไม่ fork · แยกด้วย capability flag `manages_stay` (ประตู SaaS) ที่ตั้งฉากกับ `offers_stay` (เผยแพร่สู่มาร์เก็ตเพลส = upsell) · เก็บเงินเจ้าของ = subscription ปกติ ไม่ชนเส้น e-money
- **Segment:** รายเดือน (หอ/อพาร์ตเมนต์) + รายวัน (เกสต์เฮาส์/โฮมสเตย์/โรงแรมเล็ก)

## 2. เส้นแดง (code-review gate)

1. **เงิน:** ห้ามถือ deposit · ห้ามสร้าง/ตรวจ QR ของแพลตฟอร์ม · ห้ามยอดค้างที่แพลตฟอร์ม settle · ห้าม "เก็บค่าเช่าออนไลน์". `stay_units.price_minor` / `deposit_minor` / `stay_rate.price_minor` = **display-only** ตลอดไป ห้าม join `coin_lots`/ledger
2. **PDPA (เบา):** เก็บแค่โน้ตเจ้าของ + lead — ไม่มีบัตร ปชช./พาสปอร์ต · กล่องคำขอจองต้องมีบรรทัดยินยอม "ข้อมูลติดต่อจะถูกส่งให้เจ้าของที่พัก" + lead หมดอายุ (`expires_at`) · โน้ต+lead **กันออกจาก data product (เสารายได้ #4)** · owner = controller, แพลตฟอร์ม = processor (ทำ DPA รายเจ้าตอน GA)

## 3. Data model (5 migration · additive · ของเดิมไม่พัง)

| Migration | ตาราง/ของที่เพิ่ม | สรุป |
|---|---|---|
| **0031** `stay_capability_and_projection_flags` | `places.manages_stay` · `stay_units.managed` · `stay_units.published_to_marketplace` | flag แยก "บริหาร" จาก "เผยแพร่" + เปิดให้เลขว่างเป็น projection |
| **0032** `stay_rooms` | `stay_room` (+ `btree_gist`) | ห้องจริง: ชั้น/เลขห้อง/รูปแบบ · `occupancy_status` (monthly fast-path) · `note` |
| **0033** `stay_occupancy` | `stay_occupancy_block` (GiST EXCLUDE) · `stay_room_event` · `fn_stay_refresh_vacancy()` | ปฏิทินรายวัน (ไม่ระบุตัวคน) + audit + projection เลขว่างกลับ `stay_units` |
| **0034** `stay_booking_request` | `stay_booking_request` | กล่อง lead จอง/ดูห้อง (contact ลูกค้า + `expires_at`) |
| **0035** `stay_pricing` | `stay_season` · `stay_rate` | ราคาตามฤดู (display-only) ผูกกับ "รูปแบบห้อง" |

**ความสัมพันธ์:** `stay_units` = รูปแบบ/listing → `stay_room` = ห้องจริง (`stay_unit_id`) → `stay_occupancy_block` = ช่วงวันที่ของห้อง · ราคาอยู่ที่ `stay_units.price_minor` (ฐาน) + `stay_rate` (override ตาม `stay_season`)

**โหมดคู่:** รายเดือน → `stay_room.occupancy_status` (เจ้าของกดว่าง/ไม่ว่างต่อห้อง) → `available_units` = นับห้องว่าง · รายวัน → `stay_occupancy_block` (บล็อกช่วงวัน, GiST กันซ้อน) → `daily_status` วันนี้คำนวณจากบล็อก · ทั้งคู่ป้อนเข้า `fn_stay_refresh_vacancy` ที่เขียนกลับคอลัมน์ที่ `/stay` อ่านอยู่แล้ว (read side ไม่ต้องแก้)

## 4. Marketplace projection

`stay_units.managed=false` (ทุกแถวเดิม) → consumer อ่าน `available_units`/`daily_status` ที่เจ้าของพิมพ์มือ เหมือนเดิมเป๊ะ · `managed=true` → `fn_stay_refresh_vacancy` คำนวณค่าจากห้องจริงเขียนทับคอลัมน์เดิม · `published_to_marketplace=false` → ตัดออกจาก `/stay` (บริหารส่วนตัวได้ ไม่โผล่สาธารณะ)

**Audit:** consumer `/stay` query ต้องกรอง `p.offers_stay AND su.published_to_marketplace` เพื่อให้ tenant `manages_stay && !offers_stay` มองไม่เห็นบนมาร์เก็ตเพลส

## 5. โรดแมป

- **P0 (foundation, ไม่มี UI เปลี่ยน):** migration 0031 + wire `manages_stay` เข้า `currentAccount()`/actions + audit `/stay` query + เส้นแดง gate ✅ *(รอบนี้)*
- **P1 (ห้องจริง + ปฏิทิน):** migration 0032–0033 + UI: จัดการโครงตึก/ห้อง, ปฏิทินว่าง, **onboarding wizard + สถานะ "partially managed"** (จุด cutover ที่เจ้าของจะ churn — ห้ามข้าม), decay story (หยุดอัปเดต → "สอบถาม")
- **P2 (lead):** migration 0034 + ปุ่ม "ขอดูห้อง/จอง" บนมาร์เก็ตเพลส + กล่อง lead ในคอนโซล + บรรทัดยินยอม
- **P3 (ราคา + monetize):** migration 0035 + UI ราคาตามฤดู + แสดง "เริ่ม ฿X" บนการ์ด + เปิด subscription + upsell

## 6. โค้ดที่ reuse (ไม่สร้างใหม่)

`lib/auth.ts currentAccount()` (tenancy) · `0022` brand→branch hierarchy · `0026` soft-delete convention (`deleted_at` + partial `_live` index) · `lib/storage.ts saveUploads(kind)` (รูป) · `requireCap()` capability gate · `RoomForm`/`RoomList`/`Switcher`/dashboard shell · `RoomCard`/`/stay` (marketplace read — ไม่แตะ)
