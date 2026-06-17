'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { q, API_BASE, DEMO_AGENT, DEMO_ADMIN } from '@/lib/db';

/** Merchant one-tap post to the consumer feed (caption + N photos). MVP auto-publishes. */
export async function createPostAction(formData: FormData) {
  const placeId = String(formData.get('placeId') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim().slice(0, 500);
  const n = Math.min(4, Math.max(1, Number(formData.get('image_count')) || 1));
  const urls = String(formData.get('image_urls') ?? '').split(/[\n,]/).map((u) => u.trim()).filter((u) => /^https?:\/\//.test(u));
  if (placeId && body) {
    await q(
      `INSERT INTO feed_posts(place_id, body_i18n, image_count, image_urls, status, author_kind)
       VALUES($1, jsonb_build_object('th',$2::text), $3, $4, 'published', 'merchant')`,
      [placeId, body, urls.length || n, urls.length ? urls : null]);
  }
  revalidatePath('/post');
  redirect('/post?posted=1');
}

/** Staff publishes a merchant-submitted shop (draft → live). Scoped to source='merchant'. */
export async function publishMerchantPlaceAction(placeId: string) {
  await q(`UPDATE places SET status='published', verified_at=now() WHERE id=$1 AND source='merchant'`, [placeId]);
  revalidatePath('/shops'); revalidatePath('/');
  redirect('/shops?ok=published');
}
/** Staff hides a merchant shop again (live → draft). */
export async function unpublishMerchantPlaceAction(placeId: string) {
  await q(`UPDATE places SET status='draft' WHERE id=$1 AND source='merchant'`, [placeId]);
  revalidatePath('/shops'); revalidatePath('/');
  redirect('/shops?ok=hidden');
}

/** Field agent submits a NEW place → POST /supply/proposals (lands as pending change_proposal). */
export async function createPlaceAction(formData: FormData) {
  const s = (k: string) => String(formData.get(k) ?? '').trim();
  const nameTh = s('name_th'), nameEn = s('name_en');
  const descTh = s('desc_th');
  const priceBand = s('price_band');
  const amenities = s('amenities').split(',').map((x) => x.trim()).filter(Boolean);

  const [d] = await q<{ id: string }>(`SELECT id FROM districts WHERE slug='nimman'`);

  const body: Record<string, unknown> = {
    proposedBy: DEMO_AGENT,
    nameI18n: { th: nameTh, ...(nameEn ? { en: nameEn } : {}) },
    category: s('category'),
    subcategory: s('subcategory'),
    lng: Number(s('lng')),
    lat: Number(s('lat')),
  };
  if (descTh) body.descriptionI18n = { th: descTh };
  if (d?.id) body.districtId = d.id;
  if (s('phone')) body.phone = s('phone');
  if (priceBand) body.priceBand = priceBand;
  if (amenities.length) body.amenities = amenities;

  const res = await fetch(`${API_BASE}/supply/proposals`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body), cache: 'no-store',
  });
  if (!res.ok) {
    const t = await res.text();
    redirect(`/agent?error=${encodeURIComponent(t.slice(0, 200))}`);
  }
  revalidatePath('/proposals');
  redirect('/proposals?created=1');
}

/** Field agent submits a NEW event (กิจกรรม) → POST /supply/events (pending change_proposal). */
export async function createEventAction(formData: FormData) {
  const s = (k: string) => String(formData.get(k) ?? '').trim();
  const titleTh = s('title_th'), titleEn = s('title_en'), descTh = s('desc_th');
  const [d] = await q<{ id: string }>(`SELECT id FROM districts WHERE slug='nimman'`);

  const body: Record<string, unknown> = {
    proposedBy: DEMO_AGENT,
    titleI18n: { th: titleTh, ...(titleEn ? { en: titleEn } : {}) },
    kind: s('kind'),
    startsAt: s('starts_at'),
  };
  if (descTh) body.descriptionI18n = { th: descTh };
  if (s('ends_at')) body.endsAt = s('ends_at');
  if (d?.id) body.districtId = d.id;
  if (formData.get('is_featured')) body.isFeatured = true;
  if (formData.get('is_recurring')) body.isRecurring = true;

  const res = await fetch(`${API_BASE}/supply/events`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body), cache: 'no-store',
  });
  if (!res.ok) {
    const t = await res.text();
    redirect(`/event?error=${encodeURIComponent(t.slice(0, 200))}`);
  }
  revalidatePath('/proposals');
  redirect('/proposals?created=1');
}

/** Merchant counter confirms a customer's redemption → burns Coins at THIS merchant (≠ funder, anti-self). */
export async function confirmRedeemAction(userId: string, merchantId: string) {
  const [lot] = await q<{ minor: string }>(
    `SELECT COALESCE(SUM(remaining_minor),0)::bigint minor
     FROM coin_lots WHERE user_id=$1 AND state='active' AND remaining_minor>0`, [userId]);
  const minor = Number(lot?.minor ?? 0);
  if (!minor) redirect(`/counter?m=${merchantId}&error=${encodeURIComponent('ลูกค้าไม่มีเหรียญที่แลกได้')}`);

  const res = await fetch(`${API_BASE}/money/redeem`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'idempotency-key': `counter-${merchantId}-${userId}-${Date.now()}` },
    body: JSON.stringify({ userId, redeemMerchantId: merchantId, coinMinor: minor }), cache: 'no-store',
  });
  revalidatePath('/counter'); revalidatePath('/'); revalidatePath('/money');
  if (!res.ok) {
    const t = await res.text();
    redirect(`/counter?m=${merchantId}&error=${encodeURIComponent(t.slice(0, 160))}`);
  }
  redirect(`/counter?m=${merchantId}&redeemed=1`);
}

/** Admin approves a pending proposal → POST approve (SoD enforced server-side) → place goes live. */
export async function approveProposalAction(proposalId: string) {
  const res = await fetch(`${API_BASE}/supply/proposals/${proposalId}/approve`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ reviewerId: DEMO_ADMIN }), cache: 'no-store',
  });
  revalidatePath('/proposals');
  revalidatePath('/places');
  revalidatePath('/');
  if (!res.ok) {
    const t = await res.text();
    redirect(`/proposals?error=${encodeURIComponent(t.slice(0, 200))}`);
  }
  redirect('/proposals?approved=1');
}

// ── ownership-claim review (0027): staff resolve a manual_review request ──────────────────────────
// Content-plane writes (places.claim_verified_at + place_claims), same DB role the portal uses for
// content. Approving flips the branch to verified → unlocks loyalty + the consumer "verified" badge.

/** Approve a pending manual ownership review → mark verified. */
export async function approveClaimAction(claimId: string) {
  const [c] = await q<{ place_id: string }>(
    `SELECT place_id FROM place_claims WHERE id=$1 AND method='manual_review' AND status='pending'`, [claimId]);
  if (c) {
    await q(`UPDATE place_claims SET status='verified', reviewer_id=$2, resolved_at=now() WHERE id=$1`, [claimId, DEMO_ADMIN]);
    await q(`UPDATE places SET claim_verified_at=now() WHERE id=$1 AND claim_verified_at IS NULL`, [c.place_id]);
  }
  revalidatePath('/claims');
  redirect('/claims?approved=1');
}

/** Reject a pending manual ownership review (no verification granted). */
export async function rejectClaimAction(claimId: string) {
  await q(`UPDATE place_claims SET status='rejected', reviewer_id=$2, resolved_at=now() WHERE id=$1 AND method='manual_review' AND status='pending'`, [claimId, DEMO_ADMIN]);
  revalidatePath('/claims');
  redirect('/claims?rejected=1');
}
