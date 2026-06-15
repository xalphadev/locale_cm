'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { q, API_BASE, DEMO_AGENT, DEMO_ADMIN } from '@/lib/db';

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
