'use server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { q, demoUserId, DEMO_USER } from '@/lib/db';

/** Switch UI language (TH/EN/ZH) — sets a cookie; the cookie-aware i18n re-renders everything. */
export async function setLangAction(lang: string) {
  const v = ['en', 'zh', 'th'].includes(lang) ? lang : 'th';
  cookies().set('lang', v, { path: '/', maxAge: 31536000 });
  revalidatePath('/', 'layout');
}

const API = process.env.MONEY_API ?? 'http://127.0.0.1:3001';

/** Toggle a saved/bookmarked place for the demo user (the "เซฟที่ชอบ" feature). */
export async function toggleSaveAction(placeId: string) {
  const ex = await q(`SELECT 1 FROM saved_places WHERE user_id=$1 AND place_id=$2`, [DEMO_USER, placeId]);
  if (ex.length) await q(`DELETE FROM saved_places WHERE user_id=$1 AND place_id=$2`, [DEMO_USER, placeId]);
  else await q(`INSERT INTO saved_places(user_id,place_id) VALUES($1,$2) ON CONFLICT DO NOTHING`, [DEMO_USER, placeId]);
  revalidatePath(`/place/${placeId}`); revalidatePath('/profile');
}

/** Toggle a like on a feed post (keyed by post_key, e.g. "deal:<id>"). */
export async function toggleLikeAction(postKey: string) {
  const ex = await q(`SELECT 1 FROM post_likes WHERE post_key=$1 AND user_id=$2`, [postKey, DEMO_USER]);
  if (ex.length) await q(`DELETE FROM post_likes WHERE post_key=$1 AND user_id=$2`, [postKey, DEMO_USER]);
  else await q(`INSERT INTO post_likes(post_key,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING`, [postKey, DEMO_USER]);
  revalidatePath('/feed'); revalidatePath('/feed/[key]', 'page');
}

/** Add a comment to a feed post. */
export async function addCommentAction(postKey: string, formData: FormData) {
  const body = String(formData.get('body') ?? '').trim().slice(0, 300);
  if (body) await q(`INSERT INTO post_comments(post_key,user_id,body) VALUES($1,$2,$3)`, [postKey, DEMO_USER, body]);
  revalidatePath('/feed'); revalidatePath('/feed/[key]', 'page');
}

/** Check in at a quest stop → advances the quest (and mints the reward when the last step lands). */
export async function checkInAction(questId: string, stepId: string) {
  const uid = await demoUserId();
  await fetch(`${API}/actions/checkin`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ userId: uid, questId, stepId }), cache: 'no-store',
  });
  revalidatePath('/passport'); revalidatePath('/'); revalidatePath('/wallet');
}

/** Redeem the earned Coins at a partner merchant (never the funder — anti-self-redemption). */
export async function redeemAction() {
  const uid = await demoUserId();
  const lot = (await q<any>(
    `SELECT remaining_minor, funder_key FROM coin_lots WHERE user_id=$1 AND state='active' ORDER BY expires_at LIMIT 1`, [uid]))[0];
  if (!lot) return;
  const m = (await q<any>(
    `SELECT id FROM merchants WHERE trust_state='finance_verified' AND ('merchant:'||id) <> $1 LIMIT 1`, [lot.funder_key]))[0];
  if (!m) return;
  await fetch(`${API}/money/redeem`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'idempotency-key': `consumer-redeem-${uid}-${Date.now()}` },
    body: JSON.stringify({ userId: uid, redeemMerchantId: m.id, coinMinor: Number(lot.remaining_minor) }), cache: 'no-store',
  });
  revalidatePath('/passport'); revalidatePath('/wallet');
}

// ── Stamps (per-shop loyalty, 0023). Non-money; in-kind redemption confirmed by the shop. ──

/** Redeem a shop reward with the brand's Stamps → create a PENDING redemption (single-use nonce)
 *  that the shop confirms at the counter (/merchant/loyalty/redeem → fn_redeem_stamps). The customer
 *  shows the code; the merchant-initiated confirm is what burns the stamps (no static customer QR). */
export async function redeemStampRewardAction(rewardId: string) {
  const uid = await demoUserId();
  if (!uid) return;
  const [rw] = await q<any>(
    `SELECT id, brand_id, city_id, cost_stamps FROM stamp_rewards WHERE id=$1 AND status='active'`, [rewardId]);
  if (!rw) return;
  const [bal] = await q<any>(`SELECT balance FROM stamp_balances WHERE user_id=$1 AND brand_id=$2`, [uid, rw.brand_id]);
  if (!bal || Number(bal.balance) < rw.cost_stamps) return;                       // not enough stamps
  const [pend] = await q<any>(
    `SELECT id FROM shop_redemptions WHERE user_id=$1 AND reward_id=$2 AND status='pending'`, [uid, rewardId]);
  if (pend) { revalidatePath('/wallet'); return; }                                // already waiting at counter
  const [pl] = await q<any>(`SELECT id FROM places WHERE brand_id=$1 LIMIT 1`, [rw.brand_id]);
  await q(
    `INSERT INTO shop_redemptions(user_id,brand_id,place_id,city_id,reward_id,cost_stamps,nonce,valid_until,idempotency_key)
     VALUES($1,$2,$3,$4,$5,$6, gen_random_uuid()::text, now() + interval '15 minutes', $7)`,
    [uid, rw.brand_id, pl?.id ?? null, rw.city_id, rewardId, rw.cost_stamps, `cstamp-${uid}-${rewardId}-${Date.now()}`]);
  revalidatePath('/wallet');
}

/** Check in at a place to earn the brand's Stamp + platform Sparks (server-authoritative geofence).
 *  Calls fn_shop_checkin (PostGIS ST_DWithin) — runs on a real PostGIS DB; the local stub can't. */
export async function stampCheckInAction(placeId: string, lng: number, lat: number) {
  const uid = await demoUserId();
  if (!uid) return;
  await q(`SELECT fn_shop_checkin($1,$2,$3,$4,'gps_dwell',NULL)`, [uid, placeId, lng, lat]);
  revalidatePath(`/place/${placeId}`); revalidatePath('/wallet');
}

/** Spend platform Sparks on a cosmetic from the Sparks store (floored, idempotent, non-transferable).
 *  Stable idempotency key per (user,reward) so a double-tap can't double-charge a one-time cosmetic. */
export async function spendSparksAction(rewardId: string) {
  const uid = await demoUserId();
  if (!uid) return;
  const owned = await q(`SELECT 1 FROM user_cosmetics WHERE user_id=$1 AND reward_id=$2`, [uid, rewardId]);
  if (owned.length) { revalidatePath('/sparks'); return; }                       // already owned
  try { await q(`SELECT spend_sparks($1,$2,$3)`, [uid, rewardId, `cspark-${uid}-${rewardId}`]); }
  catch { /* insufficient Sparks / out of stock — the UI already gates this; swallow for the demo */ }
  revalidatePath('/sparks'); revalidatePath('/wallet');
}
