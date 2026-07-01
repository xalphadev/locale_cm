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

/** Staff approves a merchant ACCOUNT (0065 gate) — the console opens on their next request.
 *  Judgment-only review of the signup form data (founder decision 2026-07-02, no documents). */
export async function approveMerchantAccountAction(accountId: string) {
  await q(
    `UPDATE merchant_accounts SET approval_status='approved', approved_at=now(), approval_note=NULL
      WHERE id=$1 AND approval_status='pending'`, [accountId]);
  revalidatePath('/shops');
  redirect('/shops?ok=approved');
}
/** Staff rejects a merchant account; the optional note is shown to them on /merchant/pending. */
export async function rejectMerchantAccountAction(accountId: string, formData: FormData) {
  const note = String(formData.get('note') ?? '').trim().slice(0, 300);
  await q(
    `UPDATE merchant_accounts SET approval_status='rejected', approved_at=now(), approval_note=$2
      WHERE id=$1 AND approval_status='pending'`, [accountId, note || null]);
  revalidatePath('/shops');
  redirect('/shops?ok=rejected');
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

// ── moderation + fraud (back-office trust & safety) ──────────────────────────────────────────────

/** Hide a reported review (moderation_status=rejected) and resolve the report. */
export async function hideReviewAction(reviewId: string, reportId: string) {
  await q(`UPDATE reviews SET moderation_status='rejected' WHERE id=$1`, [reviewId]);
  await q(`UPDATE content_reports SET status='resolved', resolution='review hidden', handled_by=$2, resolved_at=now() WHERE id=$1`, [reportId, DEMO_ADMIN]);
  revalidatePath('/reports'); redirect('/reports?ok=hidden');
}

/** Dismiss a report — the review stays live. */
export async function dismissReportAction(reportId: string) {
  await q(`UPDATE content_reports SET status='rejected', resolution='dismissed', handled_by=$2, resolved_at=now() WHERE id=$1`, [reportId, DEMO_ADMIN]);
  revalidatePath('/reports'); redirect('/reports?ok=dismissed');
}

/** Resolve a fraud case: confirm (fraud) or clear (false positive). */
export async function setFraudStateAction(caseId: string, state: string) {
  const st = ['confirmed_fraud', 'cleared'].includes(state) ? state : 'cleared';
  await q(`UPDATE fraud_cases SET state=$2::fraud_state, resolved_at=now(), assigned_to=$3 WHERE id=$1`, [caseId, st, DEMO_ADMIN]);
  revalidatePath('/reports'); redirect('/reports?ok=fraud');
}

// ── payouts: approve a merchant withdrawal → settle via the money-plane API (money_writer) ─────────
/** Approve + settle: calls fn_payout_merchant through the API (SoD creator<>approver, idempotent,
 *  balance-checked). The web role can't post the ledger — only the money API can. */
export async function approvePayoutAction(reqId: string) {
  const [r] = await q<{ merchant_id: string; amount_minor: string; status: string }>(
    `SELECT merchant_id, amount_minor, status FROM payout_requests WHERE id=$1`, [reqId]);
  if (!r || r.status !== 'requested') redirect('/payouts?error=' + encodeURIComponent('คำขอนี้ถูกจัดการไปแล้ว'));
  const idem = `payout-req:${reqId}`;
  const res = await fetch(`${API_BASE}/money/payout`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'idempotency-key': idem },
    body: JSON.stringify({ merchantId: r.merchant_id, amountMinor: Number(r.amount_minor), createdBy: DEMO_AGENT, approvedBy: DEMO_ADMIN }),
    cache: 'no-store',
  }).catch(() => null);
  if (!res || !res.ok) {
    const t = res ? await res.text() : 'ต่อ money API ไม่ได้ (เปิดบริการที่พอร์ต 3001)';
    redirect(`/payouts?error=${encodeURIComponent(t.slice(0, 160))}`);
  }
  const { id: txn } = await res.json();
  await q(`UPDATE payout_requests SET status='paid', ledger_txn_id=$2, idempotency_key=$3, resolved_by=$4, resolved_at=now() WHERE id=$1`,
    [reqId, txn, idem, DEMO_ADMIN]);
  revalidatePath('/payouts'); redirect('/payouts?ok=paid');
}

/** Reject a withdrawal request (no money moves). */
export async function rejectPayoutAction(reqId: string) {
  await q(`UPDATE payout_requests SET status='rejected', resolved_by=$2, resolved_at=now() WHERE id=$1 AND status='requested'`, [reqId, DEMO_ADMIN]);
  revalidatePath('/payouts'); redirect('/payouts?ok=rejected');
}

/** Admin: add/edit a row in the amenity catalog (stay_amenity, 0044) — feeds the merchant room form +
 *  consumer filter + detail pages. Re-adding an existing (grp,key) updates its label/sort and re-activates. */
export async function addAmenityAction(formData: FormData) {
  const grp = String(formData.get('grp') ?? '').trim();
  const key = String(formData.get('key') ?? '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  const label = String(formData.get('label') ?? '').trim().slice(0, 60);
  const sort = Number(formData.get('sort')) || 100;
  if (!['amenity', 'building', 'bills'].includes(grp) || !key || !label) redirect('/reports/amenities?err=1');
  await q(`INSERT INTO stay_amenity(grp, key, label_i18n, sort) VALUES($1,$2,jsonb_build_object('th',$3::text),$4)
           ON CONFLICT (grp, key) DO UPDATE SET label_i18n=EXCLUDED.label_i18n, sort=EXCLUDED.sort, active=true, updated_at=now()`,
    [grp, key, label, sort]);
  revalidatePath('/reports/amenities');
  redirect('/reports/amenities?ok=saved');
}

/** Admin: hide/show a catalog row (active flag) — never deletes, so an existing selection of the key still
 *  renders on detail pages; it just stops being offered in the form/filter. */
export async function toggleAmenityAction(grp: string, key: string) {
  await q(`UPDATE stay_amenity SET active = NOT active, updated_at=now() WHERE grp=$1 AND key=$2`, [grp, key]);
  revalidatePath('/reports/amenities');
  redirect('/reports/amenities?ok=saved');
}
