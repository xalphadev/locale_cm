'use server';
import { revalidatePath } from 'next/cache';
import { q, demoUserId } from '@/lib/db';

const API = process.env.MONEY_API ?? 'http://127.0.0.1:3001';

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
