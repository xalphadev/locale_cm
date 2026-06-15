# Soi Hop — Indispensability Strategy ("ขาดระบบนี้ไม่ได้")

> From a 5-lens analysis (daily-habit · lock-in · network/social · merchant-lock-in · essential-utility)
> synthesised against what's already built. Goal: make users **and** merchants dependent.

## The thesis

- **Consumer:** own the *"where do I eat/drink right now"* reflex (the daily trigger Google can't match for indie CM venues), then make leaving hurt by compounding four **non-portable, user-owned assets** — verified-visit review reputation, a months-deep taste profile, earned status/streak, and intent-tagged saved lists. A fresh account elsewhere can't reconstruct any of them.
- **Merchant:** own the **regulars graph + ROI truth**. Because PDPA means *we* hold the pseudonymous identity graph, the longer a merchant runs, the deeper their irreplaceable cohort/RFM history, their only proven new-vs-returning incrementality number, and their locked escrow float become.
- **The binding loop:** one verified geofenced **check-in** simultaneously (a) pays the consumer a variable Spark + feeds their streak/taste/review-weight, and (b) writes the merchant's regulars-CRM + incrementality ledger. Every daily consumer habit-action is also a daily deepening of merchant lock-in.

## Top features — ranked by (lock-in impact × buildable-now)

| # | Feature | Tables | Effort | Now | Why it creates dependency |
|---|---------|--------|--------|-----|---------------------------|
| 1 | **Honest Open-Now rail** (kill the hardcoded "เปิดอยู่"); time-of-day default (coffee 07–11 / lunch 11–14 / dinner 17–22) | opening_hours, data_freshness, geo | M | ✅ | Makes the app reliably useful at every meal time — the precondition for the daily reflex; the one fact Google is most wrong about for indie venues. |
| 2 | **Variable surprise Sparks on check-in** (first-of-day jackpot / ×2 day / mystery) | spark_events, check_ins | S | ✅ | The dopamine beat that flat-5 Sparks kills; Sparks have no baht value → ม.8-clean, no COGS-cap gate. |
| 3 | **Coin-expiry loss-aversion sweep** ("฿X expiring in N days — spend nearby") | coin_lots, notif_outbox, deals | S | ✅ | Loss-aversion over **real baht already earned** = strongest weekly re-open pull; costs nothing (unspent returns to funder). |
| 4 | **Intent-rich saved lists** (want/been/favorite + notes) + "saved, open now" | saved_places (+ state/note) | S | ✅ | Curation labour + intent tags are accreted personal state painful to rebuild elsewhere. |
| 5 | **Merchant regulars CRM + proven incrementality** (new-vs-returning, RFM, audience split; k-anon) | redemptions.visitor_type, check_ins, users.audience_segment | M | ✅ | We're the only party that can hold the regulars graph + prove the channel's lift — the merchant can't evaluate or leave without us. |
| 6 | **Forgiving weekly streak + verified-tier ladder** (5-of-7, auto-freeze, 48h repair, never zeroes) | check_ins, spark_events, profiles.spark_tier | M | ✅ | Months-grinded status = textbook switching cost; forgiving design avoids churn/anti-addiction risk. |
| 7 | **Asymmetric follow graph + verified social-proof card** ("@noi + 3 you follow checked in here") | social_follows (new, thin), check_ins.trust_tier, saved_places | S–M | ✅ | First true network effect — every follow makes discovery better; trust-tier-gated so it can't be farmed. |

**Deferred (gated):** co-op **Coin** quest squads + vested **Coin** referrals — bind real escrow to social actions, so they MUST wait on SEAM-1 anti-collusion (A.8.12 anti-self / A.8.13 Sybil-velocity) as blocking inputs, else a 4-friend + complicit-café ring farms free coffee. Build their Sparks-only halves now.

## Three releases

1. **HABIT** (own the daily reflex; 100% free-Sparks/read-side, no Coin gate): #1 Open-Now → #2 Variable Sparks → #4 saved+open-now + meal-time push. **Metric:** D1/D7 retention + meal-time DAU; % users with check-in N-of-7 days.
2. **LOCK-IN** (compound the assets): #3 Coin-expiry sweep → #6 streak+tier → "For you" taste personalization → Collections/itineraries. **Metric:** D90 / 6-month cohort survival; % of 6-mo users holding ≥2 compounding assets.
3. **NETWORK / MERCHANT** (effects that decay for others when you leave + supply gravity): #7 follow graph + social proof → friends leaderboard → trilingual proof-of-trip share (Chinese-FIT). **Merchant:** #5 CRM/ROI → clearing statement + auto-topup → win-back. Then unlock gated Coin co-op/referrals. **Metric:** follow-graph density + K-factor; merchant NRR >100% / single-digit churn at ≥90-day cohorts.

## The 2 risks to avoid

1. **Legal (ม.8) + e-money leakage:** randomness/jackpots ONLY on Sparks (zero value = not gambling); never a random Coin, never a ฿/Coin figure on any public/social/leaderboard/share surface; the Coin-expiry push is OK only as a `transactional` account event. RNG never touches the money plane.
2. **Dark-pattern trust erosion + cold-start:** Thailand is notification-saturated — punitive daily streaks, fake countdowns, after-20:00 nags, or an over-promised ROI card that goes red will *accelerate* churn. Defend with forgiving streaks, ≤1 useful push/day + quiet-hours, **honest open-now** (show "unverified — call first", never a fake "Open"), honest incrementality. Bootstrap the empty graph by suggesting high-trust reviewers (not contact import — PDPA); keep Release 1 fully valuable for a *solo* user.
