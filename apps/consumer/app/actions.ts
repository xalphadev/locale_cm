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
