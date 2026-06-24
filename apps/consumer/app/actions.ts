'use server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { q, demoUserId, i18n } from '@/lib/db';
import { saveSlip } from '@/lib/storage';
import { quoteStay } from '@/lib/quote';

/** Switch UI language (TH/EN/ZH) — sets a cookie; the cookie-aware i18n re-renders everything. */
export async function setLangAction(lang: string) {
  const v = ['en', 'zh', 'th'].includes(lang) ? lang : 'th';
  cookies().set('lang', v, { path: '/', maxAge: 31536000 });
  revalidatePath('/', 'layout');
}

const API = process.env.MONEY_API ?? 'http://127.0.0.1:3001';

/** Toggle a saved/bookmarked place for the demo user (the "เซฟที่ชอบ" feature). */
export async function toggleSaveAction(placeId: string) {
  const uid = await demoUserId();
  if (!uid) redirect('/login');
  const ex = await q(`SELECT 1 FROM saved_places WHERE user_id=$1 AND place_id=$2`, [uid, placeId]);
  if (ex.length) await q(`DELETE FROM saved_places WHERE user_id=$1 AND place_id=$2`, [uid, placeId]);
  else await q(`INSERT INTO saved_places(user_id,place_id) VALUES($1,$2) ON CONFLICT DO NOTHING`, [uid, placeId]);
  revalidatePath(`/place/${placeId}`); revalidatePath('/profile');
}

/** Toggle a like on a feed post (keyed by post_key, e.g. "deal:<id>"). */
export async function toggleLikeAction(postKey: string) {
  const uid = await demoUserId();
  if (!uid) redirect('/login');
  const ex = await q(`SELECT 1 FROM post_likes WHERE post_key=$1 AND user_id=$2`, [postKey, uid]);
  if (ex.length) await q(`DELETE FROM post_likes WHERE post_key=$1 AND user_id=$2`, [postKey, uid]);
  else await q(`INSERT INTO post_likes(post_key,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING`, [postKey, uid]);
  revalidatePath('/feed'); revalidatePath('/feed/[key]', 'page');
}

/** Add a comment to a feed post. */
export async function addCommentAction(postKey: string, formData: FormData) {
  const uid = await demoUserId();
  if (!uid) redirect('/login');
  const body = String(formData.get('body') ?? '').trim().slice(0, 300);
  if (body) await q(`INSERT INTO post_comments(post_key,user_id,body) VALUES($1,$2,$3)`, [postKey, uid, body]);
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
    `SELECT id, brand_id, city_id, cost_stamps FROM stamp_rewards WHERE id=$1 AND status='active' AND deleted_at IS NULL`, [rewardId]);
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

/** Lazy-load a page of approved reviews (8 at a time) for the dedicated reviews page / "load more". */
export async function fetchReviewsAction(placeId: string, offset: number) {
  const off = Math.max(0, Math.min(2000, Math.floor(Number(offset) || 0)));
  const rows = await q<any>(
    `SELECT r.id, r.rating, r.body_i18n, pr.display_name, to_char(r.created_at,'YYYY-MM-DD') d
       FROM reviews r LEFT JOIN profiles pr ON pr.user_id=r.user_id
      WHERE r.place_id=$1 AND r.moderation_status='approved'
      ORDER BY r.created_at DESC, r.rating DESC OFFSET $2 LIMIT 8`, [placeId, off]);
  return rows.map((r) => ({ id: r.id as string, rating: r.rating as number, body: i18n(r.body_i18n), name: r.display_name as string, d: r.d as string }));
}

/** Report a review for moderation → opens a content_reports row for staff (one per user per review). */
export async function reportReviewAction(reviewId: string) {
  const uid = await demoUserId();
  if (!uid) redirect('/login');
  const [r] = await q<any>(
    `SELECT r.place_id, p.city_id FROM reviews r JOIN places p ON p.id=r.place_id WHERE r.id=$1`, [reviewId]);
  if (!r) return;
  const dup = await q(
    `SELECT 1 FROM content_reports WHERE target_type='review' AND target_id=$1 AND reported_by=$2 AND status NOT IN ('resolved','rejected')`,
    [reviewId, uid]);
  if (!dup.length) {
    await q(
      `INSERT INTO content_reports(city_id, target_type, target_id, reported_by, reporter_role, reason_code, status)
       VALUES($1,'review',$2,$3,'consumer','inappropriate','open')`, [r.city_id, reviewId, uid]);
  }
  revalidatePath(`/place/${r.place_id}`);
}

/** Submit a booking/viewing request from a stay listing → a lead in the owner's inbox (0034).
 *  NO money: this is a request to be contacted, never a confirmed/paid reservation. Stores minimal
 *  PII (name + a contact channel + optional dates) with a consent line shown at the form; a 60-day
 *  expiry bounds retention. Anonymous visitors may submit (they provide their own contact). */
export async function submitBookingRequestAction(placeId: string, stayUnitId: string, formData: FormData) {
  const uid = await demoUserId();
  const g = (k: string) => String(formData.get(k) ?? '').trim();
  const name = g('contact_name').slice(0, 80);
  const phone = g('contact_phone').slice(0, 40);
  const line = g('contact_line').slice(0, 80);
  const message = g('message').slice(0, 500);
  const kind = ['viewing', 'booking', 'enquiry'].includes(g('request_kind')) ? g('request_kind') : 'enquiry';
  const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);
  const from = isDate(g('desired_from')) ? g('desired_from') : null;
  const to = isDate(g('desired_to')) ? g('desired_to') : null;
  const monthsRaw = parseInt(g('desired_months') || '0', 10) || 0;   // monthly lease duration
  const back = `/stay/${stayUnitId}`;
  if (!name || (!phone && !line)) redirect(`${back}?err=contact`);              // need a name + one way to reach them

  // re-prove the place is a published, publicly-listed accommodation; resolve the listing it belongs to
  const [pl] = await q<any>(`SELECT id, offers_stay FROM places WHERE id=$1 AND status='published' AND is_visible`, [placeId]);
  if (!pl || !pl.offers_stay) redirect('/stay');
  let unitId: string | null = null; let mode: string | null = null; let managed = false;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stayUnitId)) {
    const [su] = await q<any>(`SELECT id, rental_mode, managed FROM stay_units WHERE id=$1 AND place_id=$2 AND deleted_at IS NULL`, [stayUnitId, placeId]);
    if (su) { unitId = su.id; mode = su.rental_mode; managed = !!su.managed; }
  }
  // can't book dates in the past (server guard; the picker also prevents it). Bangkok day.
  const todayBkk = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  if (kind === 'booking' && mode === 'daily' && from && from < todayBkk) redirect(`${back}?err=past`);
  // anti-spam / no-money commitment: cap how many open requests one user can have at a place
  if (uid) {
    const [oc] = await q<{ n: number }>(`SELECT count(*)::int n FROM stay_booking_request WHERE requester_user_id=$1 AND place_id=$2 AND deleted_at IS NULL AND status IN ('new','contacted','scheduled')`, [uid, placeId]);
    if ((oc?.n || 0) >= 5) redirect(`${back}?err=toomany`);
  }
  // request-to-book: a dated booking only goes through when a room is actually free for those nights (managed
  // daily listings) — so the owner never gets an un-fulfillable request. Viewing/enquiry are NOT gated. No money.
  if (kind === 'booking' && mode === 'daily' && managed && unitId && from && to) {
    const [free] = await q<{ id: string }>(
      `SELECT r.id FROM stay_room r WHERE r.stay_unit_id=$1 AND r.status='active' AND r.deleted_at IS NULL
         AND NOT EXISTS (SELECT 1 FROM stay_occupancy_block bk WHERE bk.room_id=r.id AND bk.status='active' AND bk.deleted_at IS NULL
           AND bk.block_kind IN ('stay','tenancy','maintenance') AND bk.span && daterange($2::date,$3::date,'[)'))
       LIMIT 1`, [unitId, from, to]);
    if (!free) redirect(`${back}?err=full`);
  }
  const [lead] = await q<{ id: string }>(
    `INSERT INTO stay_booking_request(place_id, stay_unit_id, request_kind, rental_mode, desired_from, desired_to, desired_months,
        requester_user_id, contact_name, contact_phone, contact_line, message, channel, status, expires_at)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'app','new', now() + interval '60 days') RETURNING id`,
    [placeId, unitId, kind, mode, from, to, mode === 'monthly' ? Math.max(1, Math.min(36, monthsRaw)) : null, uid, name, phone || null, line || null, message || null]);
  // alert the place's owner of a new lead — a durable notif_outbox signal (the merchant notif dispatcher
  // routes it to the owner; the lead model is worthless if the owner isn't told). dedup per lead.
  if (lead) await q(
    `INSERT INTO notif_outbox(event_type, event_class, merchant_id, city_id, entity_type, entity_id, dedup_key, payload)
     SELECT 'stay_lead_new', 'ops', p.merchant_id, p.city_id, 'stay_booking_request', $1, 'lead:' || $1,
            jsonb_build_object('place_id', p.id, 'name', $2::text, 'kind', $3::text, 'rental_mode', $4::text)
       FROM places p WHERE p.id=$5 AND p.merchant_id IS NOT NULL
     ON CONFLICT DO NOTHING`,
    [lead.id, name, kind, mode, placeId]);
  redirect(`${back}?sent=1`);
}

/** Online booking WITH a slip payment (founder pivot 2026-06-24, host-direct model). The guest picks
 *  dates/guests, transfers to the HOST's own account and uploads the slip; we record the amount + slip on
 *  the booking spine (payment_status='submitted') for the host to verify. The platform never holds funds.
 *  Quote = base price × nights/months (same maths the form previews, so the shown amount == the recorded
 *  amount; seasonal-rate precision is a later refinement). */
export async function createPaidBookingAction(placeId: string, stayUnitId: string, formData: FormData) {
  const uid = await demoUserId();
  const g = (k: string) => String(formData.get(k) ?? '').trim();
  const name = g('contact_name').slice(0, 80);
  const phone = g('contact_phone').slice(0, 40);
  const email = g('contact_email').slice(0, 120);
  const arrival = g('arrival').slice(0, 40);
  const party = Math.max(1, Math.min(50, parseInt(g('party_size') || '1', 10) || 1));
  const method = g('payment_method') === 'bank_transfer' ? 'bank_transfer' : 'promptpay';
  const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);
  const from = isDate(g('desired_from')) ? g('desired_from') : null;
  const to = isDate(g('desired_to')) ? g('desired_to') : null;
  const months = Math.max(1, Math.min(36, parseInt(g('desired_months') || '0', 10) || 1));
  const back = `/stay/${stayUnitId}/book`;
  if (!name || !phone) redirect(`${back}?err=contact`);

  const [pl] = await q<any>(`SELECT id, offers_stay, pay_online_enabled, pay_deposit_pct FROM places WHERE id=$1 AND status='published' AND is_visible`, [placeId]);
  if (!pl || !pl.offers_stay || !pl.pay_online_enabled) redirect('/stay');
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stayUnitId);
  const [su] = isUuid ? await q<any>(`SELECT id, rental_mode, managed, price_minor, available_units, daily_status FROM stay_units WHERE id=$1 AND place_id=$2 AND deleted_at IS NULL`, [stayUnitId, placeId]) : [];
  if (!su) redirect('/stay');
  const mode = su.rental_mode;
  if (!from || (mode === 'daily' && !to)) redirect(`${back}?err=dates`);
  const todayBkk = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  if (mode === 'daily' && from < todayBkk) redirect(`${back}?err=past`);

  const base = Number(su.price_minor ?? 0);
  const rateRows = await q<any>(
    `SELECT r.price_minor, to_char(r.start_date,'YYYY-MM-DD') start, to_char(r.end_date,'YYYY-MM-DD') "end",
            to_char(s.start_date,'YYYY-MM-DD') sstart, to_char(s.end_date,'YYYY-MM-DD') send, COALESCE(s.recurs_yearly,false) recurs
       FROM stay_rate r LEFT JOIN stay_season s ON s.id = r.season_id
      WHERE r.stay_unit_id=$1 AND r.deleted_at IS NULL AND (s.id IS NULL OR s.deleted_at IS NULL)`, [su.id]);
  const rates = rateRows.map((r: any) => ({ price: Number(r.price_minor), start: r.start, end: r.end, seasonStart: r.sstart, seasonEnd: r.send, recurs: !!r.recurs }));
  const { amount } = quoteStay(mode, from, mode === 'daily' ? to : null, months, base, rates);
  if (amount <= 0) redirect(`${back}?err=price`);
  const dpct = Math.max(0, Math.min(90, Number(pl.pay_deposit_pct) || 0));
  const isDep = dpct > 0 && dpct < 100;
  const payNow = isDep ? Math.round(amount * dpct / 100) : amount;   // what the guest transfers now

  // availability guard — only take a slip when the booking can ACTUALLY be fulfilled, for every mode
  // (closes the paid-but-no-room gap; the host's verify mirrors this so a verified slip always holds a room).
  // A tiny submit→verify race remains but the GiST EXCLUDE on the block is the final double-book authority.
  let fulfillable = true;
  if (su.managed) {
    if (mode === 'daily' && from && to) {
      const [free] = await q<{ id: string }>(
        `SELECT r.id FROM stay_room r WHERE r.stay_unit_id=$1 AND r.status='active' AND r.deleted_at IS NULL
           AND NOT EXISTS (SELECT 1 FROM stay_occupancy_block bk WHERE bk.room_id=r.id AND bk.status='active' AND bk.deleted_at IS NULL
             AND bk.block_kind IN ('stay','tenancy','maintenance') AND bk.span && daterange($2::date,$3::date,'[)')) LIMIT 1`, [su.id, from, to]);
      fulfillable = !!free;
    } else if (mode === 'monthly') {
      const [free] = await q<{ id: string }>(`SELECT id FROM stay_room WHERE stay_unit_id=$1 AND status='active' AND deleted_at IS NULL AND occupancy_status='vacant' LIMIT 1`, [su.id]);
      fulfillable = !!free;
    }
  } else {
    fulfillable = mode === 'daily' ? su.daily_status !== 'full' : (Number(su.available_units) || 0) > 0;
  }
  if (!fulfillable) redirect(`${back}?err=full`);

  const slip = formData.get('slip') as File | null;
  const slipUrl = slip && typeof slip.arrayBuffer === 'function' ? await saveSlip(slip) : null;
  if (!slipUrl) redirect(`${back}?err=slip`);

  const msg = [email ? `อีเมล: ${email}` : '', arrival ? `ถึงประมาณ: ${arrival}` : ''].filter(Boolean).join(' · ') || null;
  const [bk] = await q<{ id: string; ref: string }>(
    `INSERT INTO stay_booking_request(place_id, stay_unit_id, request_kind, rental_mode, desired_from, desired_to, desired_months,
        requester_user_id, contact_name, contact_phone, party_size, message, channel, status,
        amount_minor, deposit_minor, paid_minor, payment_method, slip_url, paid_at, payment_status, expires_at)
     VALUES($1,$2,'booking',$3,$4,$5,$6,$7,$8,$9,$10,$11,'app','new',$12,$13,$14,$15,$16,now(),'submitted', now() + interval '60 days')
     RETURNING id, ref`,
    [placeId, su.id, mode, from, mode === 'daily' ? to : null, mode === 'monthly' ? months : null, uid, name, phone, party, msg, amount, isDep ? payNow : null, payNow, method, slipUrl]);
  if (bk) await q(
    `INSERT INTO notif_outbox(event_type, event_class, merchant_id, city_id, entity_type, entity_id, dedup_key, payload)
     SELECT 'stay_lead_new', 'ops', p.merchant_id, p.city_id, 'stay_booking_request', $1, 'lead:' || $1,
            jsonb_build_object('place_id', p.id, 'name', $2::text, 'kind', 'booking', 'rental_mode', $3::text, 'paid', true)
       FROM places p WHERE p.id=$4 AND p.merchant_id IS NOT NULL ON CONFLICT DO NOTHING`,
    [bk.id, name, mode, placeId]);
  redirect(`/stay/requests?booked=${bk?.ref || ''}`);
}

// Renter withdraws their OWN still-open lead (PDPA self-service + control). Soft-delete so it also
// disappears from the merchant inbox; never touch a converted one. No money anywhere.
export async function withdrawBookingRequestAction(leadId: string, _formData?: FormData) {
  const uid = await demoUserId();
  // soft-delete only (deleted_at is the withdraw signal — keeps the lead's documented status enum intact,
  // and the merchant inbox already filters deleted_at IS NULL). Terminal states can't be withdrawn.
  if (uid) await q(
    `UPDATE stay_booking_request SET deleted_at = now(), updated_at = now()
      WHERE id = $1 AND requester_user_id = $2 AND deleted_at IS NULL AND status NOT IN ('converted', 'declined')`,
    [leadId, uid]);
  redirect('/stay/requests?cancelled=1');
}

// Write/edit a review. Verified-visitor only (a check-in fact at this place — spec 8.2.2, no fake reviews) and
// post-moderated (visible immediately, the report→hide flow handles abuse). No money. One review per user/place.
export async function submitReviewAction(placeId: string, formData: FormData) {
  const uid = await demoUserId();
  if (!uid) redirect('/login');
  const rating = Math.max(0, Math.min(5, parseInt(String(formData.get('rating') ?? '0'), 10) || 0));
  const body = String(formData.get('body') ?? '').trim().slice(0, 500);
  const back0 = String(formData.get('back') ?? '');                                  // return to the page the form was on
  const back = /^\/(place|stay)\/[a-z0-9-]+$/i.test(back0) ? back0 : `/place/${placeId}`;
  if (rating < 1 || body.length < 10) redirect(`${back}?reviewed=short`);
  const [p] = await q<any>(`SELECT id, city_id, merchant_id FROM places WHERE id=$1 AND status='published'`, [placeId]);
  if (!p) redirect('/');
  const [ci] = await q<{ id: string; trust_tier: string }>(`SELECT id, trust_tier FROM check_ins WHERE user_id=$1 AND place_id=$2 ORDER BY created_at DESC LIMIT 1`, [uid, placeId]);
  if (!ci) redirect(`${back}?reviewed=visit`);                                        // must have visited
  const lang = ['en', 'zh', 'th'].includes(cookies().get('lang')?.value || '') ? cookies().get('lang')!.value : 'th';
  const bodyJson = JSON.stringify({ [lang]: body });
  const weight = ({ gps_dwell: 0.5, verified_visit: 1, proven_purchase: 1.5 } as Record<string, number>)[ci.trust_tier] ?? 1;
  // atomic upsert (0042 UNIQUE user_id,place_id): one review per place — ON CONFLICT edits it, race-free, no double-post
  await q(
    `INSERT INTO reviews(place_id, city_id, merchant_id, user_id, rating, body_i18n, original_locale, linked_check_in_id, trust_weight, moderation_status)
     VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::locale_code,$8,$9,'approved')
     ON CONFLICT (user_id, place_id) DO UPDATE SET
       rating = EXCLUDED.rating, body_i18n = EXCLUDED.body_i18n, original_locale = EXCLUDED.original_locale,
       linked_check_in_id = EXCLUDED.linked_check_in_id, trust_weight = EXCLUDED.trust_weight,
       moderation_status = 'approved', updated_at = now()`,
    [placeId, p.city_id, p.merchant_id, uid, rating, bodyJson, lang, ci.id, weight]);
  revalidatePath(back);
  revalidatePath(`/place/${placeId}`);
  redirect(`${back}?reviewed=1`);
}
