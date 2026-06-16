'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { q, withTx, DEMO_AGENT, DEMO_ADMIN } from '@/lib/db';
import { hashPassword, verifyPassword, setSession, clearSession, currentAccount } from '@/lib/auth';
import { saveUploads, MAX_UPLOADS } from '@/lib/storage';

// Nimman center — default shop location at signup (the merchant can't drop a pin in the MVP form).
const NIMMAN = { lng: 98.967, lat: 18.796 };
// Shop-type → (category, subcategory) + DEFAULT capabilities. The type chosen at signup sets
// whether the shop sells products and/or has rooms — which drives the portal tabs. All editable
// later in /merchant/shop. `general` = a plain shop/service (no products, no rooms): feed + info only.
const SHOP_TYPES: Record<string, { category: string; subcategory: string; sells?: boolean; stay?: boolean }> = {
  cafe: { category: 'eat', subcategory: 'cafe', sells: true },
  restaurant: { category: 'eat', subcategory: 'restaurant', sells: true },
  street_food: { category: 'eat', subcategory: 'street_food', sells: true },
  dessert: { category: 'eat', subcategory: 'dessert', sells: true },
  market: { category: 'see', subcategory: 'market', sells: true },
  shop: { category: 'see', subcategory: 'shop', sells: true },
  general: { category: 'see', subcategory: 'service' },   // ร้านค้า/บริการทั่วไป — neither products nor rooms
  // accommodations — auto-flag offers_stay + stay_kind
  dorm: { category: 'see', subcategory: 'dorm', stay: true },
  apartment: { category: 'see', subcategory: 'apartment', stay: true },
  condo: { category: 'see', subcategory: 'condo', stay: true },
  mansion: { category: 'see', subcategory: 'mansion', stay: true },
  house: { category: 'see', subcategory: 'house', stay: true },
  homestay: { category: 'see', subcategory: 'homestay', stay: true },
  guesthouse: { category: 'see', subcategory: 'guesthouse', stay: true },
  hotel: { category: 'see', subcategory: 'hotel', stay: true },
};
const s = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
// whole-baht string → integer minor units, rejecting blank / NaN / Infinity (a Server Action
// accepts any posted value, so 'Infinity'/'1e309' would otherwise reach an int column and 500).
const bahtToMinor = (raw: string) => (raw && Number.isFinite(Number(raw)) ? Math.max(0, Math.round(Number(raw) * 100)) : null);
// Capability guard. The bottom-tab UI only HIDES products/rooms for a shop that lacks the flag;
// this enforces it at the trust boundary so a shop can't publish rows its type says it has none of
// by hitting the route/Server Action directly. (place_id scoping already blocks cross-tenant writes.)
function requireCap(acc: any, cap: 'sells_products' | 'offers_stay') {
  if (!acc?.place_id) redirect('/merchant/login');
  if (!acc[cap]) redirect('/merchant');
}

// ── multi-entity helpers (0022): one account → many brands ("ร้าน") → many branches/places ("สาขา"/"ที่พัก") ──
// A signup shop_type → a coarse brand_kind (display hint only; the per-branch sells_products/offers_stay
// flags stay authoritative for what the customer actually sees).
function brandKindOf(type: string): string {
  const t = SHOP_TYPES[type];
  if (!t) return 'shop';
  if (t.stay) return 'stay';
  return t.category === 'eat' ? 'eat' : 'shop';
}

/** Create a brand ("ร้าน") owned by an account (portal plane; merchant_id stays NULL until it transacts). */
async function createBrand(c: any, opts: { ownerAccountId: string; cityId: string; name: string; type: string }): Promise<string> {
  const r = await c.query(
    `INSERT INTO brands(owner_account_id, city_id, name_i18n, brand_kind, status)
     VALUES($1,$2,jsonb_build_object('th',$3::text),$4,'active') RETURNING id`,
    [opts.ownerAccountId, opts.cityId, opts.name, brandKindOf(opts.type)]);
  return r.rows[0].id as string;
}

/** Create a branch/accommodation place ("สาขา"/"ที่พัก") under a brand. Same SoD-guarded writer
 *  (fn_create_place) + capability flags as signup; the pin defaults to Nimman (editable in /merchant/shop).
 *  Created as DRAFT — manageable immediately, public only after staff review. */
async function createBranchPlace(c: any, opts: {
  cityId: string; distId: string | null; brandId: string; shopName: string; type: string;
  phone?: string; lineId?: string;
}): Promise<string> {
  const spec = SHOP_TYPES[opts.type] ?? SHOP_TYPES.cafe;
  const payload = {
    name_i18n: { th: opts.shopName },
    category: spec.category, subcategory: spec.subcategory, status: 'draft',
    lng: NIMMAN.lng, lat: NIMMAN.lat,
    ...(opts.phone ? { phone: opts.phone } : {}),
    ...(opts.lineId ? { line_id: opts.lineId } : {}),
  };
  const pl = (await c.query(
    `SELECT fn_create_place($1::jsonb, $2, $3, $4, $5) id`,
    [JSON.stringify(payload), opts.cityId, opts.distId, DEMO_AGENT, DEMO_ADMIN])).rows[0];
  await c.query(
    `UPDATE places SET sells_products=$2, offers_stay=$3, stay_kind=$4, source='merchant', brand_id=$5 WHERE id=$1`,
    [pl.id, !!spec.sells, !!spec.stay, spec.stay ? spec.subcategory : null, opts.brandId]);
  return pl.id as string;
}

/** Self-service signup → creates the shop (published via fn_create_place) + the login account, then logs in. */
export async function signupAction(formData: FormData) {
  const email = s(formData, 'email').toLowerCase();
  const pw = s(formData, 'password');
  const shopName = s(formData, 'shop_name');
  const phone = s(formData, 'phone');
  const lineId = s(formData, 'line_id');
  const type = SHOP_TYPES[s(formData, 'shop_type')] ? s(formData, 'shop_type') : 'cafe';
  const err = (m: string) => redirect(`/merchant/signup?error=${encodeURIComponent(m)}`);

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) err('อีเมลไม่ถูกต้อง');
  if (pw.length < 8) err('รหัสผ่านอย่างน้อย 8 ตัวอักษร');
  if (!shopName) err('กรุณากรอกชื่อร้าน');

  const [city] = await q<{ id: string }>(`SELECT id FROM cities WHERE code='CNX'`);
  if (!city) err('ระบบยังไม่พร้อมในเมืองนี้ กรุณาติดต่อทีมงาน');
  const [dist] = await q<{ id: string }>(`SELECT id FROM districts WHERE slug='nimman'`);

  // Atomic signup = account → brand → first branch, in one transaction. The account is INSERTed FIRST
  // so the email-unique race (23505) aborts BEFORE any brand/place row exists (no orphans). The first
  // shop is its own brand ("ร้าน"); the owner adds more brands/branches later from the portal. The place
  // is DRAFT — fully manageable immediately, public only after staff review (avoids signup spam going live).
  let accId = '';
  try {
    accId = await withTx(async (c) => {
      const acc = (await c.query<{ id: string }>(
        `INSERT INTO merchant_accounts(email, password_hash, display_name, phone)
         VALUES($1,$2,$3,$4) RETURNING id`,
        [email, hashPassword(pw), shopName, phone || null])).rows[0];
      const brandId = await createBrand(c, { ownerAccountId: acc.id, cityId: city.id, name: shopName, type });
      const placeId = await createBranchPlace(c, {
        cityId: city.id, distId: dist?.id ?? null, brandId, shopName, type, phone, lineId,
      });
      // place_id = the legacy "home" mirror; active_place_id = the branch the portal opens on.
      await c.query(`UPDATE merchant_accounts SET place_id=$2, active_place_id=$2 WHERE id=$1`, [acc.id, placeId]);
      return acc.id;
    });
  } catch (e: any) {
    if (e?.code === '23505') err('อีเมลนี้ถูกใช้แล้ว');  // unique_violation on email
    throw e;
  }

  setSession(accId);
  revalidatePath('/'); // staff dashboard place count
  redirect('/merchant');
}

export async function loginAction(formData: FormData) {
  const email = s(formData, 'email').toLowerCase();
  const pw = s(formData, 'password');
  const [acc] = await q<any>(`SELECT id, password_hash FROM merchant_accounts WHERE email=$1 AND status='active' AND deleted_at IS NULL`, [email]);
  if (!acc || !verifyPassword(pw, acc.password_hash)) redirect('/merchant/login?error=1');
  setSession(acc.id);
  redirect('/merchant');
}

export async function logoutAction() {
  clearSession();
  redirect('/merchant/login');
}

// ── scoped management (tenancy: always resolve place_id from the session, NEVER from the form) ──

export async function createMerchantProductAction(formData: FormData) {
  const acc = await currentAccount();
  requireCap(acc, 'sells_products');
  const nameTh = s(formData, 'name_th');
  if (!nameTh) redirect('/merchant/products/new?error=name');
  const subtype = s(formData, 'subtype') || 'other';
  const priceMinor = bahtToMinor(s(formData, 'price'));
  const unit = s(formData, 'price_unit') || null;
  const pasted = s(formData, 'image_urls').split(/[\n,]/).map((u) => u.trim()).filter((u) => /^https?:\/\//.test(u));
  const urls = [...await saveUploads(formData.getAll('photos') as File[], 'products'), ...pasted];
  const inSeason = !!formData.get('in_season');
  await q(
    `INSERT INTO shop_products(place_id, name_i18n, subtype, price_minor, price_unit, image_urls, image_count, in_season, status, author_kind)
     VALUES($1, jsonb_build_object('th',$2::text), $3, $4, $5, $6, $7, $8, 'published', 'merchant')`,
    [acc.place_id, nameTh, subtype, priceMinor, unit, urls.length ? urls : null, urls.length || 1, inSeason]);
  revalidatePath('/merchant/products');
  redirect('/merchant/products?ok=1');
}

/** Toggle a boolean flag on one of the merchant's OWN products. flag ∈ sold_out|in_season|available_today; or hide/show. */
export async function setProductFlagAction(productId: string, flag: string) {
  const acc = await currentAccount();
  requireCap(acc, 'sells_products');
  if (flag === 'hide') await q(`UPDATE shop_products SET status='hidden', updated_at=now() WHERE id=$1 AND place_id=$2`, [productId, acc.place_id]);
  else if (flag === 'show') await q(`UPDATE shop_products SET status='published', updated_at=now() WHERE id=$1 AND place_id=$2`, [productId, acc.place_id]);
  else if (['sold_out', 'in_season', 'available_today'].includes(flag))
    await q(`UPDATE shop_products SET ${flag} = NOT ${flag}, updated_at=now() WHERE id=$1 AND place_id=$2`, [productId, acc.place_id]);
  revalidatePath('/merchant/products', 'layout'); // list + detail
}

/** Edit one of the merchant's OWN products. New photos/urls replace image_urls; none → keep existing. */
export async function updateMerchantProductAction(productId: string, formData: FormData) {
  const acc = await currentAccount();
  requireCap(acc, 'sells_products');
  const nameTh = s(formData, 'name_th');
  if (!nameTh) redirect(`/merchant/products/${productId}/edit?error=name`);
  const subtype = s(formData, 'subtype') || 'other';
  const priceMinor = bahtToMinor(s(formData, 'price'));
  const unit = s(formData, 'price_unit') || null;
  const inSeason = !!formData.get('in_season');
  const pasted = s(formData, 'image_urls').split(/[\n,]/).map((u) => u.trim()).filter((u) => /^https?:\/\//.test(u));
  // Edit replaces image_urls only when new images arrive (CASE below). If some uploads were
  // rejected (bad type / >6MB) we'd otherwise silently overwrite the gallery with the survivors,
  // so abort and keep the existing images — the merchant retries with valid files.
  const photos = (formData.getAll('photos') as File[]).filter((f) => f && f.size > 0);
  const tried = Math.min(photos.length, MAX_UPLOADS); // saveUploads caps at MAX_UPLOADS — don't count the overflow as a rejection
  const saved = await saveUploads(photos, 'products');
  if (tried && saved.length < tried) redirect(`/merchant/products/${productId}/edit?error=upload&rej=${tried - saved.length}`);
  const urls = [...saved, ...pasted];
  await q(
    `UPDATE shop_products SET name_i18n=jsonb_build_object('th',$3::text), subtype=$4, price_minor=$5, price_unit=$6, in_season=$7,
       image_urls = CASE WHEN $8::text[] IS NOT NULL THEN $8 ELSE image_urls END,
       image_count = CASE WHEN $8::text[] IS NOT NULL THEN COALESCE(array_length($8,1),1) ELSE image_count END,
       updated_at=now()
     WHERE id=$1 AND place_id=$2`,
    [productId, acc.place_id, nameTh, subtype, priceMinor, unit, inSeason, urls.length ? urls : null]);
  revalidatePath('/merchant/products');
  redirect('/merchant/products?ok=updated');
}

export async function deleteProductAction(productId: string) {
  const acc = await currentAccount();
  requireCap(acc, 'sells_products');
  // Soft delete: keep the row (price/photos/history) — hidden from every read, restorable later.
  await q(`UPDATE shop_products SET deleted_at=now(), updated_at=now() WHERE id=$1 AND place_id=$2 AND deleted_at IS NULL`, [productId, acc.place_id]);
  revalidatePath('/merchant/products');
  redirect('/merchant/products?ok=deleted');
}

/** Restore a soft-deleted product from the recycle bin (deleted_at → NULL). Ownership-scoped;
 *  no capability gate so an item under a currently-off capability is still recoverable. */
export async function restoreProductAction(productId: string) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  await q(`UPDATE shop_products SET deleted_at=NULL, updated_at=now() WHERE id=$1 AND place_id=$2 AND deleted_at IS NOT NULL`, [productId, acc.place_id]);
  revalidatePath('/merchant/trash'); revalidatePath('/merchant/products', 'layout'); revalidatePath('/merchant');
  redirect('/merchant/trash?ok=restored');
}

export async function createMerchantPostAction(formData: FormData) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  const body = s(formData, 'body').slice(0, 500);
  if (!body) redirect('/merchant/post/new?error=body');
  const pasted = s(formData, 'image_urls').split(/[\n,]/).map((u) => u.trim()).filter((u) => /^https?:\/\//.test(u));
  const urls = [...await saveUploads(formData.getAll('photos') as File[], 'posts'), ...pasted];
  await q(
    `INSERT INTO feed_posts(place_id, body_i18n, image_count, image_urls, status, author_kind)
     VALUES($1, jsonb_build_object('th',$2::text), $3, $4, 'published', 'merchant')`,
    [acc.place_id, body, urls.length || 1, urls.length ? urls : null]);
  revalidatePath('/merchant/post');
  redirect('/merchant/post?ok=1');
}

/** Edit one of the merchant's OWN feed posts. New photos/urls replace image_urls; none → keep. */
export async function updateMerchantPostAction(postId: string, formData: FormData) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  const body = s(formData, 'body').slice(0, 500);
  if (!body) redirect(`/merchant/post/${postId}/edit?error=body`);
  const pasted = s(formData, 'image_urls').split(/[\n,]/).map((u) => u.trim()).filter((u) => /^https?:\/\//.test(u));
  const photos = (formData.getAll('photos') as File[]).filter((f) => f && f.size > 0);
  const tried = Math.min(photos.length, MAX_UPLOADS); // saveUploads caps at MAX_UPLOADS — don't count the overflow as a rejection
  const saved = await saveUploads(photos, 'posts');
  if (tried && saved.length < tried) redirect(`/merchant/post/${postId}/edit?error=upload&rej=${tried - saved.length}`);
  const urls = [...saved, ...pasted];
  await q(
    `UPDATE feed_posts SET body_i18n=jsonb_build_object('th',$3::text),
       image_urls = CASE WHEN $4::text[] IS NOT NULL THEN $4 ELSE image_urls END,
       image_count = CASE WHEN $4::text[] IS NOT NULL THEN COALESCE(array_length($4,1),1) ELSE image_count END
     WHERE id=$1 AND place_id=$2`,
    [postId, acc.place_id, body, urls.length ? urls : null]);
  revalidatePath('/merchant/post', 'layout');
  redirect('/merchant/post?ok=updated');
}

/** Hide/show one of the merchant's OWN posts (hidden posts drop out of the customer feed). */
export async function setPostFlagAction(postId: string, flag: string) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  if (flag === 'hide') await q(`UPDATE feed_posts SET status='hidden' WHERE id=$1 AND place_id=$2`, [postId, acc.place_id]);
  else if (flag === 'show') await q(`UPDATE feed_posts SET status='published' WHERE id=$1 AND place_id=$2`, [postId, acc.place_id]);
  revalidatePath('/merchant/post', 'layout');
}

export async function deletePostAction(postId: string) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  // Soft delete (ownership-scoped): retire the post + its comments, but KEEP likes (toggle data).
  // Everything stays for history/restore; the deleted_at IS NULL guard on reads hides it from the feed.
  const del = await q<{ id: string }>(`UPDATE feed_posts SET deleted_at=now() WHERE id=$1 AND place_id=$2 AND deleted_at IS NULL RETURNING id`, [postId, acc.place_id]);
  if (del.length) {
    await q(`UPDATE post_comments SET deleted_at=now() WHERE post_key=$1 AND deleted_at IS NULL`, [`post:${postId}`]);
  }
  revalidatePath('/merchant/post');
  redirect('/merchant/post?ok=deleted');
}

/** Restore a soft-deleted post from the recycle bin — symmetric to delete: brings back the post
 *  AND the comments retired with it (likes were never removed). Ownership-scoped. */
export async function restorePostAction(postId: string) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  const r = await q<{ id: string }>(`UPDATE feed_posts SET deleted_at=NULL WHERE id=$1 AND place_id=$2 AND deleted_at IS NOT NULL RETURNING id`, [postId, acc.place_id]);
  if (r.length) await q(`UPDATE post_comments SET deleted_at=NULL WHERE post_key=$1 AND deleted_at IS NOT NULL`, [`post:${postId}`]);
  revalidatePath('/merchant/trash'); revalidatePath('/merchant/post', 'layout'); revalidatePath('/merchant');
  redirect('/merchant/trash?ok=restored');
}

export async function updateShopAction(formData: FormData) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  const nameTh = s(formData, 'name_th');
  const descTh = s(formData, 'desc_th');
  const phone = s(formData, 'phone');
  const lineId = s(formData, 'line_id');
  const website = s(formData, 'website');
  const sells = !!formData.get('sells_products');
  const offersStay = !!formData.get('offers_stay');
  await q(
    `UPDATE places SET
       name_i18n = CASE WHEN $2<>'' THEN jsonb_set(COALESCE(name_i18n,'{}'),'{th}',to_jsonb($2::text)) ELSE name_i18n END,
       description_i18n = CASE WHEN $3<>'' THEN jsonb_set(COALESCE(description_i18n,'{}'),'{th}',to_jsonb($3::text)) ELSE description_i18n END,
       phone = NULLIF($4,''), line_id = NULLIF($5,''), website = NULLIF($6,''),
       sells_products = $7, offers_stay = $8, updated_at = now()
     WHERE id = $1`,
    [acc.place_id, nameTh, descTh, phone, lineId, website, sells, offersStay]);

  // Clearing a capability also hides its now-unreachable child rows: the portal tab disappears,
  // so without this the published products/rooms would linger on the consumer side with no way to
  // manage them. (Re-checking the flag doesn't auto-republish — the merchant shows each row again.)
  if (!sells) await q(`UPDATE shop_products SET status='hidden', updated_at=now() WHERE place_id=$1 AND status='published'`, [acc.place_id]);
  if (!offersStay) await q(`UPDATE stay_units SET status='hidden', updated_at=now() WHERE place_id=$1 AND status='published'`, [acc.place_id]);

  // Location pin: write only when both coords are finite AND inside the Chiang Mai bbox.
  // Clamp-and-skip — a save of just name/phone must never zero an existing good geo.
  const lat = Number(s(formData, 'lat')), lng = Number(s(formData, 'lng'));
  if (isFinite(lat) && isFinite(lng) && lng >= 98.6 && lng <= 99.3 && lat >= 18.5 && lat <= 19.2) {
    await q(`SELECT fn_set_place_geo($1, $2, $3)`, [acc.place_id, String(lng), String(lat)]);
  }

  revalidatePath('/merchant/shop'); revalidatePath('/merchant');
  redirect('/merchant/shop?ok=1');
}

// ── stay units (rooms) — same tenancy discipline as products (place_id from session, never form) ──

export async function createStayUnitAction(formData: FormData) {
  const acc = await currentAccount();
  requireCap(acc, 'offers_stay');
  const nameTh = s(formData, 'name_th');
  if (!nameTh) redirect('/merchant/rooms/new?error=name');
  const mode = s(formData, 'rental_mode') === 'daily' ? 'daily' : 'monthly';
  const period = mode === 'daily' ? 'night' : 'month';
  const num = (k: string) => { const v = s(formData, k); return v !== '' && Number.isFinite(Number(v)) ? Number(v) : null; };
  const priceMinor = num('price') != null ? Math.max(0, Math.round(num('price')! * 100)) : null;
  const depositMinor = num('deposit') != null ? Math.max(0, Math.round(num('deposit')! * 100)) : null;
  // blank vacancy on create → 1 (matches the form default), never silently "full" (0)
  const availUnits = mode === 'monthly' ? Math.max(0, Math.round(num('available_units') ?? 1)) : 0;
  const dailyStatus = mode === 'daily' && ['vacant', 'full', 'ask'].includes(s(formData, 'daily_status')) ? s(formData, 'daily_status') : 'ask';
  const furnished = ['furnished', 'partial', 'unfurnished'].includes(s(formData, 'furnished')) ? s(formData, 'furnished') : null;
  const bills = formData.getAll('bills').map(String).filter(Boolean);
  const amen = formData.getAll('amenity').map(String).filter(Boolean);
  const pasted = s(formData, 'image_urls').split(/[\n,]/).map((u) => u.trim()).filter((u) => /^https?:\/\//.test(u));
  const urls = [...await saveUploads(formData.getAll('photos') as File[], 'rooms'), ...pasted];
  await q(
    `INSERT INTO stay_units(place_id, name_i18n, rental_mode, price_minor, price_period, available_units, daily_status,
        capacity, deposit_minor, min_stay, room_size_sqm, furnished, bills_included, unit_amenities,
        image_urls, image_count, status, author_kind)
     VALUES($1, jsonb_build_object('th',$2::text), $3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'published','merchant')`,
    [acc.place_id, nameTh, mode, priceMinor, period, availUnits, dailyStatus,
      num('capacity'), depositMinor, num('min_stay'), num('room_size_sqm'), furnished,
      bills.length ? bills : null, amen.length ? amen : null, urls.length ? urls : null, urls.length || 1]);
  revalidatePath('/merchant/rooms');
  redirect('/merchant/rooms?ok=1');
}

/** +/- the monthly vacancy count AND restamp freshness in one tap — the 10-second update. */
export async function updateVacancyAction(unitId: string, delta: number) {
  const acc = await currentAccount();
  requireCap(acc, 'offers_stay');
  // clamp to a single step — the UI only ever sends ±1, but a Server Action accepts any
  // caller value; bounding it removes the int4-overflow / non-integer paths.
  const step = Math.max(-1, Math.min(1, Math.trunc(Number(delta)) || 0));
  await q(`UPDATE stay_units SET available_units=GREATEST(0, available_units + $3), availability_updated_at=now(), updated_at=now()
           WHERE id=$1 AND place_id=$2`, [unitId, acc.place_id, step]);
  revalidatePath('/merchant/rooms', 'layout'); // list + detail
}

/** Cycle daily availability vacant→full→ask→vacant, or hide/show — restamps freshness on cycle. */
export async function setStayUnitFlagAction(unitId: string, flag: string) {
  const acc = await currentAccount();
  requireCap(acc, 'offers_stay');
  if (flag === 'hide') await q(`UPDATE stay_units SET status='hidden', updated_at=now() WHERE id=$1 AND place_id=$2`, [unitId, acc.place_id]);
  else if (flag === 'show') await q(`UPDATE stay_units SET status='published', updated_at=now() WHERE id=$1 AND place_id=$2`, [unitId, acc.place_id]);
  else if (flag === 'cycle_daily')
    await q(`UPDATE stay_units SET daily_status = CASE daily_status WHEN 'vacant' THEN 'full' WHEN 'full' THEN 'ask' ELSE 'vacant' END,
               availability_updated_at=now(), updated_at=now() WHERE id=$1 AND place_id=$2`, [unitId, acc.place_id]);
  revalidatePath('/merchant/rooms', 'layout'); // list + detail
}

/** Edit one of the merchant's OWN rooms. New photos/urls replace image_urls; none → keep existing. */
export async function updateStayUnitAction(unitId: string, formData: FormData) {
  const acc = await currentAccount();
  requireCap(acc, 'offers_stay');
  const nameTh = s(formData, 'name_th');
  if (!nameTh) redirect(`/merchant/rooms/${unitId}/edit?error=name`);
  const mode = s(formData, 'rental_mode') === 'daily' ? 'daily' : 'monthly';
  const period = mode === 'daily' ? 'night' : 'month';
  const num = (k: string) => { const v = s(formData, k); return v !== '' && Number.isFinite(Number(v)) ? Number(v) : null; };
  const priceMinor = num('price') != null ? Math.max(0, Math.round(num('price')! * 100)) : null;
  const depositMinor = num('deposit') != null ? Math.max(0, Math.round(num('deposit')! * 100)) : null;
  // blank vacancy → null = "leave unchanged" (the SQL COALESCEs it), never silently zero to "full"
  const availUnits = num('available_units') != null ? Math.max(0, Math.round(num('available_units')!)) : null;
  const dailyStatus = ['vacant', 'full', 'ask'].includes(s(formData, 'daily_status')) ? s(formData, 'daily_status') : 'ask';
  const furnished = ['furnished', 'partial', 'unfurnished'].includes(s(formData, 'furnished')) ? s(formData, 'furnished') : null;
  const bills = formData.getAll('bills').map(String).filter(Boolean);
  const amen = formData.getAll('amenity').map(String).filter(Boolean);
  const pasted = s(formData, 'image_urls').split(/[\n,]/).map((u) => u.trim()).filter((u) => /^https?:\/\//.test(u));
  const photos = (formData.getAll('photos') as File[]).filter((f) => f && f.size > 0);
  const tried = Math.min(photos.length, MAX_UPLOADS); // saveUploads caps at MAX_UPLOADS — don't count the overflow as a rejection
  const saved = await saveUploads(photos, 'rooms');
  if (tried && saved.length < tried) redirect(`/merchant/rooms/${unitId}/edit?error=upload&rej=${tried - saved.length}`);
  const urls = [...saved, ...pasted];
  await q(
    // available_units/daily_status are written only for the row's ACTIVE mode, so toggling
    // rental_mode never zeroes the other mode's value; for monthly, COALESCE keeps the live count
    // when the vacancy box was left blank. ($4=mode, $7=availUnits|null, $8=dailyStatus.)
    `UPDATE stay_units SET name_i18n=jsonb_build_object('th',$3::text), rental_mode=$4, price_minor=$5, price_period=$6,
       available_units = CASE WHEN $4='monthly' THEN COALESCE($7, available_units) ELSE available_units END,
       daily_status    = CASE WHEN $4='daily'   THEN $8 ELSE daily_status END,
       capacity=$9, deposit_minor=$10, min_stay=$11, room_size_sqm=$12, furnished=$13,
       bills_included = CASE WHEN $4='monthly' THEN $14 ELSE bills_included END, unit_amenities=$15,
       image_urls = CASE WHEN $16::text[] IS NOT NULL THEN $16 ELSE image_urls END,
       image_count = CASE WHEN $16::text[] IS NOT NULL THEN COALESCE(array_length($16,1),1) ELSE image_count END,
       availability_updated_at=now(), updated_at=now()
     WHERE id=$1 AND place_id=$2`,
    [unitId, acc.place_id, nameTh, mode, priceMinor, period, availUnits, dailyStatus,
      num('capacity'), depositMinor, num('min_stay'), num('room_size_sqm'), furnished,
      bills.length ? bills : null, amen.length ? amen : null, urls.length ? urls : null]);
  revalidatePath('/merchant/rooms');
  redirect('/merchant/rooms?ok=updated');
}

export async function deleteStayUnitAction(unitId: string) {
  const acc = await currentAccount();
  requireCap(acc, 'offers_stay');
  // Soft delete: retain the unit + its history; hidden from reads, restorable later.
  await q(`UPDATE stay_units SET deleted_at=now(), updated_at=now() WHERE id=$1 AND place_id=$2 AND deleted_at IS NULL`, [unitId, acc.place_id]);
  revalidatePath('/merchant/rooms');
  redirect('/merchant/rooms?ok=deleted');
}

/** Restore a soft-deleted room/unit from the recycle bin (deleted_at → NULL). Ownership-scoped. */
export async function restoreStayUnitAction(unitId: string) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  await q(`UPDATE stay_units SET deleted_at=NULL, updated_at=now() WHERE id=$1 AND place_id=$2 AND deleted_at IS NOT NULL`, [unitId, acc.place_id]);
  revalidatePath('/merchant/trash'); revalidatePath('/merchant/rooms', 'layout'); revalidatePath('/merchant');
  redirect('/merchant/trash?ok=restored');
}

// ── multi-entity navigation: switch active branch, add a brand ("ร้าน"), add a branch ("สาขา") ──

/** Switch the portal's ACTIVE branch. Trust boundary: the UPDATE only lands when the target place
 *  sits under a brand THIS account owns, so a forged placeId no-ops (you can't switch into a branch
 *  you don't own). The signed cookie is untouched — only this advisory pointer moves. */
export async function setActiveContextAction(placeId: string) {
  const acc = await currentAccount();
  if (!acc) redirect('/merchant/login');
  await q(
    `UPDATE merchant_accounts ma SET active_place_id = $2
       WHERE ma.id = $1
         AND EXISTS (SELECT 1 FROM places p JOIN brands b ON b.id = p.brand_id
                      WHERE p.id = $2 AND b.owner_account_id = ma.id AND b.deleted_at IS NULL)`,
    [acc.id, placeId]);
  revalidatePath('/merchant', 'layout');
  redirect('/merchant');
}

/** "เพิ่มร้าน" — add a NEW shop/brand to the logged-in account: a fresh brand + its first branch,
 *  then open it as the active context. Same shop_type → capability mapping as signup. */
export async function addShopAction(formData: FormData) {
  const acc = await currentAccount();
  if (!acc) redirect('/merchant/login');
  const shopName = s(formData, 'shop_name');
  if (!shopName) redirect('/merchant/shops/new?error=name');
  const type = SHOP_TYPES[s(formData, 'shop_type')] ? s(formData, 'shop_type') : 'cafe';
  const phone = s(formData, 'phone'), lineId = s(formData, 'line_id');
  const [city] = await q<{ id: string }>(`SELECT id FROM cities WHERE code='CNX'`);
  if (!city) redirect('/merchant/shops/new?error=city');
  const [dist] = await q<{ id: string }>(`SELECT id FROM districts WHERE slug='nimman'`);
  const placeId = await withTx(async (c) => {
    const brandId = await createBrand(c, { ownerAccountId: acc.id, cityId: city.id, name: shopName, type });
    return createBranchPlace(c, { cityId: city.id, distId: dist?.id ?? null, brandId, shopName, type, phone, lineId });
  });
  await q(`UPDATE merchant_accounts SET active_place_id=$2 WHERE id=$1`, [acc.id, placeId]);
  revalidatePath('/merchant', 'layout');
  redirect('/merchant');
}

/** "เพิ่มสาขา" — add a NEW branch to an EXISTING brand the account owns, then switch to it.
 *  brand_id arrives from the form but is re-proven against ownership before any write. */
export async function addBranchAction(formData: FormData) {
  const acc = await currentAccount();
  if (!acc) redirect('/merchant/login');
  const brandId = s(formData, 'brand_id');
  const [brand] = await q<{ id: string; city_id: string | null }>(
    `SELECT id, city_id FROM brands WHERE id=$1 AND owner_account_id=$2 AND status='active' AND deleted_at IS NULL`, [brandId, acc.id]);
  if (!brand) redirect('/merchant/shops');                 // not yours / not found → fail closed
  const branchName = s(formData, 'shop_name');
  if (!branchName) redirect(`/merchant/shops/${brandId}/new?error=name`);
  const type = SHOP_TYPES[s(formData, 'shop_type')] ? s(formData, 'shop_type') : 'cafe';
  const phone = s(formData, 'phone'), lineId = s(formData, 'line_id');
  const cityId = brand.city_id ?? (await q<{ id: string }>(`SELECT id FROM cities WHERE code='CNX'`))[0]?.id;
  const [dist] = await q<{ id: string }>(`SELECT id FROM districts WHERE slug='nimman'`);
  const placeId = await withTx(async (c) =>
    createBranchPlace(c, { cityId, distId: dist?.id ?? null, brandId, shopName: branchName, type, phone, lineId }));
  await q(`UPDATE merchant_accounts SET active_place_id=$2 WHERE id=$1`, [acc.id, placeId]);
  revalidatePath('/merchant', 'layout');
  redirect('/merchant');
}

// ── loyalty: per-brand Stamp program (0023). Non-money, in-kind. Scoped to the account's active brand. ──

/** "เริ่มโปรแกรมสะสมแต้ม" — the one-decision setup: create the brand's program + its first reward. */
export async function createLoyaltyProgramAction(formData: FormData) {
  const acc = await currentAccount();
  if (!acc?.brand_id) redirect('/merchant/login');
  const rewardName = s(formData, 'reward_name');
  if (!rewardName) redirect('/merchant/loyalty?error=reward');
  const visits = Math.max(1, Math.min(99, parseInt(s(formData, 'visits'), 10) || 6));
  const pointsName = s(formData, 'points_name') || 'แต้ม';
  await withTx(async (c) => {
    const exists = (await c.query(`SELECT id FROM stamp_programs WHERE brand_id=$1`, [acc.brand_id])).rows[0];
    if (exists) return;  // one program per brand (idempotent)
    const prog = (await c.query(
      `INSERT INTO stamp_programs(brand_id, city_id, points_name_i18n)
       VALUES($1, (SELECT city_id FROM places WHERE id=$2), jsonb_build_object('th',$3::text)) RETURNING id`,
      [acc.brand_id, acc.place_id, pointsName])).rows[0];
    await c.query(
      `INSERT INTO stamp_rewards(program_id, brand_id, city_id, title_i18n, kind, cost_stamps)
       VALUES($1, $2, (SELECT city_id FROM places WHERE id=$3), jsonb_build_object('th',$4::text), 'free_item', $5)`,
      [prog.id, acc.brand_id, acc.place_id, rewardName, visits]);  // 1 stamp/visit → cost_stamps = visits
  });
  revalidatePath('/merchant/loyalty'); revalidatePath('/merchant', 'layout');
  redirect('/merchant/loyalty?ok=created');
}

/** Add a reward / privilege to the brand's catalog (denominated in the brand's own Stamps). */
export async function createRewardAction(formData: FormData) {
  const acc = await currentAccount();
  if (!acc?.brand_id) redirect('/merchant/login');
  const [prog] = await q<{ id: string }>(`SELECT id FROM stamp_programs WHERE brand_id=$1`, [acc.brand_id]);
  if (!prog) redirect('/merchant/loyalty');
  const title = s(formData, 'title');
  if (!title) redirect('/merchant/loyalty/rewards/new?error=name');
  const cost = Math.max(1, Math.min(9999, parseInt(s(formData, 'cost'), 10) || 1));
  const kind = ['free_item', 'discount', 'privilege'].includes(s(formData, 'kind')) ? s(formData, 'kind') : 'free_item';
  await q(
    `INSERT INTO stamp_rewards(program_id, brand_id, city_id, title_i18n, kind, cost_stamps)
     VALUES($1, $2, (SELECT city_id FROM places WHERE id=$3), jsonb_build_object('th',$4::text), $5, $6)`,
    [prog.id, acc.brand_id, acc.place_id, title, kind, cost]);
  revalidatePath('/merchant/loyalty');
  redirect('/merchant/loyalty?ok=reward');
}

/** Delete one of the brand's OWN rewards. */
export async function deleteRewardAction(rewardId: string) {
  const acc = await currentAccount();
  if (!acc?.brand_id) redirect('/merchant/login');
  // Soft delete: keep the reward (past redemptions reference it); hidden from catalog, restorable.
  await q(`UPDATE stamp_rewards SET deleted_at=now() WHERE id=$1 AND brand_id=$2 AND deleted_at IS NULL`, [rewardId, acc.brand_id]);
  revalidatePath('/merchant/loyalty');
  redirect('/merchant/loyalty?ok=reward_deleted');
}

/** Restore a soft-deleted reward from the recycle bin (deleted_at → NULL). Brand-scoped. */
export async function restoreRewardAction(rewardId: string) {
  const acc = await currentAccount();
  if (!acc?.brand_id) redirect('/merchant/login');
  await q(`UPDATE stamp_rewards SET deleted_at=NULL WHERE id=$1 AND brand_id=$2 AND deleted_at IS NOT NULL`, [rewardId, acc.brand_id]);
  revalidatePath('/merchant/trash'); revalidatePath('/merchant/loyalty', 'layout'); revalidatePath('/merchant');
  redirect('/merchant/trash?ok=restored');
}

/** Counter: confirm a customer's pending redemption → fn_redeem_stamps (fail-closed, idempotent).
 *  Ownership re-checked: the redemption must belong to this account's active brand. */
export async function confirmRedemptionAction(redemptionId: string) {
  const acc = await currentAccount();
  if (!acc?.brand_id) redirect('/merchant/login');
  const [r] = await q<{ id: string }>(
    `SELECT id FROM shop_redemptions WHERE id=$1 AND brand_id=$2 AND status='pending'`, [redemptionId, acc.brand_id]);
  if (r) await q(`SELECT fn_redeem_stamps($1)`, [redemptionId]);
  revalidatePath('/merchant/loyalty/redeem');
  redirect('/merchant/loyalty/redeem?ok=1');
}

// ── claim/onboard: take over an existing (agent-seeded, unclaimed) place → account + brand + link ──

/** Claim an EXISTING place that has no brand yet: create the login account + a brand, attach the place
 *  (sets brand_id + source='merchant'), and log in. MVP has no KYC gate — real claim needs verification
 *  (agent code / proof); this is the onboarding skeleton. */
export async function claimPlaceAction(formData: FormData) {
  const placeId = s(formData, 'place_id');
  const email = s(formData, 'email').toLowerCase();
  const pw = s(formData, 'password');
  const err = (m: string) => redirect(`/merchant/claim/${placeId}?error=${encodeURIComponent(m)}`);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) err('อีเมลไม่ถูกต้อง');
  if (pw.length < 8) err('รหัสผ่านอย่างน้อย 8 ตัวอักษร');

  // re-check the place is real AND still unclaimed (brand_id IS NULL) — fail closed on a race
  const [pl] = await q<any>(`SELECT id, name_i18n, city_id FROM places WHERE id=$1 AND brand_id IS NULL`, [placeId]);
  if (!pl) err('ร้านนี้ถูกเคลมไปแล้ว หรือไม่พบ');
  const displayName = (pl.name_i18n && (pl.name_i18n.th || pl.name_i18n.en)) || 'ร้านค้า';

  let accId = '';
  try {
    accId = await withTx(async (c) => {
      const acc = (await c.query<{ id: string }>(
        `INSERT INTO merchant_accounts(email, password_hash, display_name) VALUES($1,$2,$3) RETURNING id`,
        [email, hashPassword(pw), displayName])).rows[0];
      const brand = (await c.query<{ id: string }>(
        `INSERT INTO brands(owner_account_id, city_id, name_i18n, status) VALUES($1,$2,$3,'active') RETURNING id`,
        [acc.id, pl.city_id, pl.name_i18n])).rows[0];
      // attach the place only if STILL unclaimed (guards a concurrent claim)
      const upd = await c.query(
        `UPDATE places SET brand_id=$2, source='merchant', is_visible=true WHERE id=$1 AND brand_id IS NULL RETURNING id`,
        [placeId, brand.id]);
      if (!upd.rows.length) throw new Error('claim_race');
      await c.query(`UPDATE merchant_accounts SET place_id=$2, active_place_id=$2 WHERE id=$1`, [acc.id, placeId]);
      return acc.id;
    });
  } catch (e: any) {
    if (e?.code === '23505') err('อีเมลนี้ถูกใช้แล้ว');
    if (e?.message === 'claim_race') err('ร้านนี้เพิ่งถูกเคลมไป');
    throw e;
  }
  setSession(accId);
  revalidatePath('/'); // staff dashboard counts
  redirect('/merchant');
}
