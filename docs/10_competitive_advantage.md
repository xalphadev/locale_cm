# Soi Hop — Competitive Advantage & Positioning

> Derived from a 5-agent competitive analysis (vs Google Maps/TripAdvisor, Wongnai,
> Grab/LINE MAN/foodpanda, Beli/Foursquare) cross-checked against what is already built.

## Positioning

**EN —** Soi Hop is the only hyperlocal *eat / see / do* app where every listing is **verified-fresh by a paid local on the ground**, every reward is **real baht held in merchant escrow** (not points), and the whole thing is **trilingual TH/EN/ZH** for all three audiences. *The company is the indie-merchant network — not a listings directory or an ad auction.*

**TH —** ซอยฮ็อป คือแอปค้นพบ *กิน/เที่ยว/ทำกิจกรรม* ไฮเปอร์โลคัลเจ้าเดียวที่ **ข้อมูลถูกตรวจสอบความสดโดยคนท้องถิ่นที่ลงพื้นที่จริง**, **ทุกรางวัลคือเงินบาทจริงที่ร้านฝากค้ำไว้** (ไม่ใช่แต้มลอยๆ), และ **สามภาษา TH/EN/ZH** เสิร์ฟครบสามกลุ่ม — *เราคือเครือข่ายร้านอิสระ ไม่ใช่ไดเรกทอรีหรือระบบประมูลโฆษณา*

One-liner: **"Verified by a local · redeemable in baht · walkable across Nimman · trilingual for all three of you."**

## The 5 defensible moats (and why incumbents can't copy them)

| # | Moat | Why a competitor structurally can't copy it |
|---|------|---------------------------------------------|
| 1 | **Baht-backed cross-merchant escrow loyalty** — every Coin = 1 THB minted only against settled merchant escrow; quests route footfall across A+B+C indie shops | It's the *inverse* of an ad/commission business — routing real merchant cash across a no-commission in-person crawl cannibalises Grab/Wongnai/Google's model. Needs real cash on deposit + a correct double-entry ledger, not a feature flag. |
| 2 | **Paid field-agent verified freshness** — fresh/aging/stale + last-verified date, fed by CMU/Payap students via moderated change-proposals (author≠reviewer SoD), never live writes | Crowdsourced platforms have *nobody paid or accountable* for ground truth at indie-venue granularity. "Checked 6 days ago by a local" is impossible without a paid human supply chain + a moderation pipeline. |
| 3 | **Trust tied to a server-confirmed geofenced visit** — earning/redeeming needs a real, located, server-burned visit; reviews can be presence-gated | A faker would have to physically stand in the venue. Incumbents accept any-account reviews (Google blocked 292M policy-violating reviews in 2025) and can't retrofit proof-of-presence onto a decade of anonymous data. |
| 4 | **Three first-class audiences, trilingual to the data layer** — TH/EN/ZH on every place/event/review; LINE / Apple-Google / WeChat-Alipay personas off the *same* verified row | Google is blocked in China; TripAdvisor is irrelevant there; Wongnai/Beli are Thai/English single-audience. Nobody serves the Thai local + Western tourist + Chinese FIT traveller natively from one fresh, escrow-backed listing. |
| 5 | **Merchant-initiated anti-fraud redemption + provable ROI** — rotating single-use nonce burned server-side inside a PostGIS geofence; ledger records take-rate + new-vs-returning | Coupon/points fraud is rampant because redemption is customer-initiated off static codes. No ad/points platform can show baht-true, reconciled, new-vs-returning incrementality — none runs a real money ledger. |

## Where each competitor leaves the gap

- **Google Maps / TripAdvisor** — stale unaccountable data, pay-to-rank (Promoted Pins), fake-review crisis, zero loyalty, no China/ZH layer, generic global UX with no "soi you walk between."
- **Wongnai / Google reviews** — food-only, ad-driven ranking, Thai-first UX for tourists, no cross-merchant loyalty.
- **Grab / LINE MAN / foodpanda** — delivery/commission model; they don't build in-person indie footfall (we deliberately don't do delivery).
- **Beli / Foursquare** — great lists/scores/friend-graph but no baht-backed rewards, no paid freshness, thin Thailand + no ZH.

## Build roadmap to make the advantages *felt* (ranked impact/effort)

1. **Verified-Freshness seal** — "ตรวจสอบโดยคนท้องถิ่น เมื่อ X" on cards/detail + "report wrong" → change-proposal. *(S, shipped in this release)*
2. **Verified-Visit reviews** — badge + verified-first filter; trust-weighted rating. *(S)*
3. **Trilingual switch (TH/EN/ZH)** — one tap re-renders the verified listing in the visitor's language. *(M, shipped in this release)*
4. **Baht-backed reward provenance** — "รางวัลค้ำด้วยมูลค่าจริงจากร้าน X" on Wallet/Passport (qualitative, no ฿ face value — e-money compliant). *(M, shipped in this release)*
5. **Nimman Soi-Hop Trails** — named cross-category walking quests on the map. *(M)*
6. **Merchant "Verified Footfall & ROI" dashboard** — ledger-reconciled new-vs-returning. *(L — the merchant-acquisition wedge)*

**Fast-follow:** ZH-first "post-Xiaohongshu arrival mode" + shareable trilingual venue cards for Chinese-FIT acquisition (presentation over data already in the schema).
