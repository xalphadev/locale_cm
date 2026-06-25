'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { q, withTx, DEMO_AGENT, DEMO_ADMIN } from '@/lib/db';
import { hashPassword, verifyPassword, setSession, clearSession, currentAccount } from '@/lib/auth';
import { saveUploads, MAX_UPLOADS } from '@/lib/storage';
import { SOCIAL_CHANNELS } from '@/lib/socials';
import { NIMMAN_LNG, NIMMAN_LAT, inCmBbox } from '@/lib/geo';
import { PLACE_DETAILS } from '@/lib/placedetails';

// Nimman center — default shop location at signup (the merchant can't drop a pin in the MVP form).
const NIMMAN = { lng: NIMMAN_LNG, lat: NIMMAN_LAT };
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
function requireCap(acc: any, cap: 'sells_products' | 'offers_stay' | 'manages_stay') {
  if (!acc?.place_id) redirect('/merchant/login');
  if (!acc[cap]) redirect('/merchant');
}
// Ownership-verification gate. Claiming/creating a place grants management, but full privileges
// (loyalty/Stamps + the consumer "verified by owner" badge) stay locked until the active branch
// is proven owned (phone OTP or staff review → places.claim_verified_at). Fail-closed: send the
// owner to the verify flow rather than letting an unverified branch open a points program.
function requireVerified(acc: any) {
  if (!acc?.place_id) redirect('/merchant/login');
  if (!acc.verified) redirect('/merchant/verify?need=loyalty');
}
// '+66 81 472 6145' → '+66 8x-xxx-6145' (reveal only last 4 + the leading group, dev-safe to show)
function maskPhone(raw: string | null | undefined): string {
  const digits = String(raw ?? '').replace(/[^\d+]/g, '');
  if (digits.replace(/\D/g, '').length < 6) return 'เบอร์ในระบบ';
  const last4 = digits.slice(-4);
  const head = digits.startsWith('+') ? digits.slice(0, 3) : digits.slice(0, 2);
  return `${head} ${digits.startsWith('+') ? digits[3] : digits[2]}x-xxx-${last4}`;
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
  // Accommodation defaults: publish to marketplace (offers_stay) + a room_mode from the kind —
  // homestay/guesthouse/house = 'unique' (each room its own listing), the rest = 'multi' (types + a
  // room board). manages_stay (the ผังห้อง board) is on only for 'multi'. All editable in /merchant/shop.
  const roomMode = spec.stay && ['homestay', 'guesthouse', 'house'].includes(opts.type) ? 'unique' : 'multi';
  await c.query(
    `UPDATE places SET sells_products=$2, offers_stay=$3, manages_stay=$4, room_mode=$5, stay_kind=$6, source='merchant', brand_id=$7 WHERE id=$1`,
    [pl.id, !!spec.sells, !!spec.stay, !!spec.stay && roomMode === 'multi', roomMode, spec.stay ? spec.subcategory : null, opts.brandId]);
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
  // website: block non-http(s) schemes (javascript:/data: → stored XSS on the public consumer page) and
  // normalize a bare domain to https. NULLIF in the query turns '' back to NULL.
  let website = s(formData, 'website');
  if (website) {
    if (/^https?:\/\//i.test(website)) { /* already a safe absolute URL */ }
    else if (/^[a-z][a-z0-9+.-]*:/i.test(website)) website = '';   // some other scheme → drop it
    else website = 'https://' + website;                            // bare domain → assume https
  }
  const sells = !!formData.get('sells_products');
  const offersStay = !!formData.get('offers_stay');
  const managesStay = !!formData.get('manages_stay');   // runs the room-management SaaS (0031); orthogonal to publishing
  const roomMode = ['multi', 'unique'].includes(s(formData, 'room_mode')) ? s(formData, 'room_mode') : 'multi';
  const addressTh = s(formData, 'address_th').slice(0, 300).trim();
  // shop gallery: new files → MinIO, then rebuild image_urls from the PhotoManager order manifest (photo_order:
  // a JSON array of existing-URL | "new:k"). Existing URLs are validated against this place's own set so a
  // forged manifest can't inject arbitrary image URLs. Absent manifest → legacy "new uploads replace" behaviour.
  const photos = (formData.getAll('photos') as File[]).filter((f) => f && f.size > 0);
  const tried = Math.min(photos.length, MAX_UPLOADS);
  const saved = await saveUploads(photos, 'places');
  if (tried && saved.length < tried) redirect('/merchant/shop/edit?error=upload');
  let imageUrls: string[] | null = null;
  const rawOrder = s(formData, 'photo_order');
  if (rawOrder) {
    const [curImg] = await q<{ image_urls: string[] | null }>(`SELECT image_urls FROM places WHERE id=$1`, [acc.place_id]);
    const allowed = new Set(curImg?.image_urls || []);
    let order: unknown[] = [];
    try { order = JSON.parse(rawOrder); } catch { order = []; }
    const final: string[] = [];
    for (const tok of Array.isArray(order) ? order : []) {
      if (typeof tok !== 'string') continue;
      if (tok.startsWith('new:')) { const k = parseInt(tok.slice(4), 10); if (saved[k]) final.push(saved[k]); }
      else if (allowed.has(tok)) final.push(tok);
    }
    imageUrls = final.slice(0, MAX_UPLOADS);   // [] = owner removed every photo (intended)
  } else if (saved.length) {
    imageUrls = saved;
  }
  // opening hours from the per-day editor (h_mon … h_sun → "HH:MM-HH:MM" | "closed"). Only persist if the
  // owner set at least one OPEN day, so saving the form for an unrelated edit can't wipe hours to all-closed.
  const hrs: Record<string, string> = {};
  for (const k of ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']) {
    const v = s(formData, 'h_' + k);
    if (v === 'closed') hrs[k] = 'closed';
    else if (/^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/.test(v)) hrs[k] = v;
  }
  const hrsJson = Object.values(hrs).some((v) => v !== 'closed') ? JSON.stringify(hrs) : null;
  // extra contact channels (FB/IG/TikTok/WhatsApp → places.socials jsonb, 0046). The form is the single
  // editor and always submits these inputs, so an empty field = the owner cleared it → store NULL.
  const socials: Record<string, string> = {};
  for (const ch of SOCIAL_CHANNELS) { const v = s(formData, 's_' + ch.key).slice(0, 200); if (v) socials[ch.key] = v; }
  const socialsJson = Object.keys(socials).length ? JSON.stringify(socials) : null;
  // place facilities/highlights (places.amenities token[]): the edit form renders a checkbox for every offered
  // facet AND every currently-set token, so a normal save re-submits all current ones → nothing is dropped.
  const amen = [...new Set((formData.getAll('amenity') as string[]).map(String).filter((t) => /^[a-z0-9_]+$/.test(t)))].slice(0, 40);
  // per-category extra info (places.details jsonb, 0047) — the form renders only the category's fields, so only
  // those submit; read every known key + keep the non-empty ones. The form is the single editor → empty = cleared.
  const details: Record<string, string> = {};
  for (const k of [...new Set(Object.values(PLACE_DETAILS).flat().map((f) => f.key))]) { const v = s(formData, 'detail_' + k).slice(0, 400); if (v) details[k] = v; }
  const detailsJson = Object.keys(details).length ? JSON.stringify(details) : null;
  // read the capability flags BEFORE the update so we can react to a toggle (off→on republishes child
  // rows, on→off hides them) without disturbing per-listing hide/show when the capability is unchanged.
  const [prev] = await q<{ sells_products: boolean; offers_stay: boolean }>(`SELECT sells_products, offers_stay FROM places WHERE id=$1`, [acc.place_id]);
  await q(
    `UPDATE places SET
       name_i18n = CASE WHEN $2<>'' THEN jsonb_set(COALESCE(name_i18n,'{}'),'{th}',to_jsonb($2::text)) ELSE name_i18n END,
       description_i18n = CASE WHEN $3<>'' THEN jsonb_set(COALESCE(description_i18n,'{}'),'{th}',to_jsonb($3::text)) ELSE description_i18n END,
       address_i18n = CASE WHEN $11<>'' THEN jsonb_build_object('th',$11::text) ELSE NULL END,
       phone = NULLIF($4,''), line_id = NULLIF($5,''), website = NULLIF($6,''),
       sells_products = $7, offers_stay = $8, manages_stay = $9, room_mode = $10,
       image_urls  = CASE WHEN $12::text[] IS NOT NULL THEN $12 ELSE image_urls END,
       image_count = CASE WHEN $12::text[] IS NOT NULL THEN COALESCE(array_length($12,1),0) ELSE image_count END,
       opening_hours = CASE WHEN $13::jsonb IS NOT NULL THEN $13::jsonb ELSE opening_hours END,
       socials = $14::jsonb,
       amenities = $15::text[],
       details = $16::jsonb,
       updated_at = now()
     WHERE id = $1`,
    [acc.place_id, nameTh, descTh, phone, lineId, website, sells, offersStay, managesStay, roomMode, addressTh, imageUrls, hrsJson, socialsJson, amen.length ? amen : null, detailsJson]);

  // Toggling a capability OFF hides its child rows (the tab disappears); toggling it back ON restores
  // exactly those, so re-enabling brings the listings back instead of stranding them as hidden.
  // Unchanged capability → leave per-listing hide/show as the owner set it.
  if (prev?.sells_products && !sells) await q(`UPDATE shop_products SET status='hidden', updated_at=now() WHERE place_id=$1 AND status='published'`, [acc.place_id]);
  else if (!prev?.sells_products && sells) await q(`UPDATE shop_products SET status='published', updated_at=now() WHERE place_id=$1 AND status='hidden' AND deleted_at IS NULL`, [acc.place_id]);
  if (prev?.offers_stay && !offersStay) await q(`UPDATE stay_units SET status='hidden', updated_at=now() WHERE place_id=$1 AND status='published'`, [acc.place_id]);
  else if (!prev?.offers_stay && offersStay) await q(`UPDATE stay_units SET status='published', updated_at=now() WHERE place_id=$1 AND status='hidden' AND deleted_at IS NULL`, [acc.place_id]);

  // Location pin: write only when both coords are finite AND inside the Chiang Mai bbox.
  // Clamp-and-skip — a save of just name/phone must never zero an existing good geo.
  const lat = Number(s(formData, 'lat')), lng = Number(s(formData, 'lng'));
  if (inCmBbox(lat, lng)) {
    await q(`SELECT fn_set_place_geo($1, $2, $3)`, [acc.place_id, String(lng), String(lat)]);
  }

  revalidatePath('/merchant/shop'); revalidatePath('/merchant');
  redirect('/merchant/shop?ok=1');
}

/** Edit a BRAND's shared identity (name / logo / story). Brand-level, applies across all its branches.
 *  Ownership re-proven (owner_account_id) — never trust the brandId from the form alone. */
export async function updateBrandAction(brandId: string, formData: FormData) {
  const acc = await currentAccount();
  if (!acc) redirect('/merchant/login');
  if (!UUID_RE.test(brandId)) redirect('/merchant/shops');
  const [b] = await q<{ id: string }>(`SELECT id FROM brands WHERE id=$1 AND owner_account_id=$2 AND deleted_at IS NULL`, [brandId, acc.id]);
  if (!b) redirect('/merchant/shops');
  const nameTh = s(formData, 'name_th');
  const descTh = s(formData, 'desc_th').slice(0, 2000).trim();
  // logo = a single image (first uploaded) → brands.logo_url; no new upload keeps the existing logo
  const photos = (formData.getAll('photos') as File[]).filter((f) => f && f.size > 0);
  const saved = await saveUploads(photos.slice(0, 1), 'brands');
  const logo = saved[0] || '';
  await q(
    `UPDATE brands SET
       name_i18n = CASE WHEN $2<>'' THEN jsonb_build_object('th',$2::text) ELSE name_i18n END,
       description_i18n = CASE WHEN $3<>'' THEN jsonb_build_object('th',$3::text) ELSE NULL END,
       logo_url = CASE WHEN $4<>'' THEN $4 ELSE logo_url END
     WHERE id=$1`,
    [brandId, nameTh, descTh, logo]);
  revalidatePath('/merchant/shops'); revalidatePath('/merchant', 'layout');
  redirect('/merchant/shops?ok=brand');
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
  // deposit is a monthly-tenancy concept; the daily form hides it, so never persist one for daily
  const depositMinor = mode === 'monthly' && num('deposit') != null ? Math.max(0, Math.round(num('deposit')! * 100)) : null;
  const descTh = s(formData, 'description_th').slice(0, 2000).trim();
  // available_from is monthly-only ("ว่างให้เข้าอยู่ตั้งแต่"); blank = available now (NULL)
  const availFrom = mode === 'monthly' && /^\d{4}-\d{2}-\d{2}$/.test(s(formData, 'available_from')) ? s(formData, 'available_from') : null;
  // blank vacancy on create → 1 (matches the form default), never silently "full" (0)
  const availUnits = mode === 'monthly' ? Math.max(0, Math.round(num('available_units') ?? 1)) : 0;
  const dailyStatus = mode === 'daily' && ['vacant', 'full', 'ask'].includes(s(formData, 'daily_status')) ? s(formData, 'daily_status') : 'ask';
  const furnished = ['furnished', 'partial', 'unfurnished'].includes(s(formData, 'furnished')) ? s(formData, 'furnished') : null;
  const bills = formData.getAll('bills').map(String).filter((k) => KEY_RE.test(k)).slice(0, 20);
  const amen = formData.getAll('amenity').map(String).filter((k) => KEY_RE.test(k)).slice(0, 40);
  // photos upload to MinIO via saveUploads (resized to WebP); no URL pasting
  const urls = await saveUploads(formData.getAll('photos') as File[], 'rooms');
  const gender = ['female', 'male'].includes(s(formData, 'gender_policy')) ? s(formData, 'gender_policy') : null;
  const reTime = /^\d{1,2}:\d{2}$/;
  const ci = mode === 'daily' && reTime.test(s(formData, 'check_in_time')) ? s(formData, 'check_in_time') : null;
  const co = mode === 'daily' && reTime.test(s(formData, 'check_out_time')) ? s(formData, 'check_out_time') : null;
  const attrs: Record<string, any> = {};
  if (formData.get('attr_breakfast')) attrs.breakfast = true;
  const canc = s(formData, 'attr_cancellation'); if (['flexible', 'moderate', 'strict'].includes(canc)) attrs.cancellation = canc;
  const hostInfo = s(formData, 'attr_host').slice(0, 500).trim(); if (hostInfo) attrs.host = hostInfo;
  const building = formData.getAll('building').map(String).filter((k) => KEY_RE.test(k)).slice(0, 40);
  if (building.length) attrs.building = building;
  await q(
    `INSERT INTO stay_units(place_id, name_i18n, description_i18n, rental_mode, price_minor, price_period, available_units, available_from, daily_status,
        capacity, deposit_minor, min_stay, room_size_sqm, furnished, bills_included, unit_amenities,
        bedrooms, bathrooms, gender_policy, check_in_time, check_out_time, attrs,
        image_urls, image_count, status, author_kind, published_to_marketplace)
     VALUES($1, jsonb_build_object('th',$2::text), CASE WHEN $23::text <> '' THEN jsonb_build_object('th',$23::text) END,
        $3,$4,$5,$6,$24::date,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20::jsonb,$21,$22,'published','merchant',$25)`,
    [acc.place_id, nameTh, mode, priceMinor, period, availUnits, dailyStatus,
      num('capacity'), depositMinor, num('min_stay'), num('room_size_sqm'), furnished,
      bills.length ? bills : null, amen.length ? amen : null,
      num('bedrooms'), num('bathrooms'), gender, ci, co, JSON.stringify(attrs),
      urls.length ? urls : null, urls.length || 1, descTh, availFrom,
      priceMinor != null && urls.length > 0]);   // only show on the marketplace once it has a price + ≥1 photo
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
  // managed listings derive vacancy from the ผังห้อง board — snap back to the computed count so a manual
  // +/− can't desync them (fn self-guards: it RETURNs early for hand-typed / unmanaged listings).
  await q(`SELECT fn_stay_refresh_vacancy($1)`, [unitId]);
  revalidatePath('/merchant/rooms', 'layout'); // list + detail
}

/** Cycle daily availability vacant→full→ask→vacant, or hide/show — restamps freshness on cycle. */
export async function setStayUnitFlagAction(unitId: string, flag: string) {
  const acc = await currentAccount();
  requireCap(acc, 'offers_stay');
  if (flag === 'hide') await q(`UPDATE stay_units SET status='hidden', updated_at=now() WHERE id=$1 AND place_id=$2`, [unitId, acc.place_id]);
  else if (flag === 'show') await q(`UPDATE stay_units SET status='published', updated_at=now() WHERE id=$1 AND place_id=$2`, [unitId, acc.place_id]);
  else if (flag === 'cycle_daily') {
    await q(`UPDATE stay_units SET daily_status = CASE daily_status WHEN 'vacant' THEN 'full' WHEN 'full' THEN 'ask' ELSE 'vacant' END,
               availability_updated_at=now(), updated_at=now() WHERE id=$1 AND place_id=$2`, [unitId, acc.place_id]);
    await q(`SELECT fn_stay_refresh_vacancy($1)`, [unitId]); // managed daily snaps back to the computed status
  }
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
  // deposit is monthly-only (daily form hides it) → clear it for daily, set it for monthly
  const depositMinor = mode === 'monthly' && num('deposit') != null ? Math.max(0, Math.round(num('deposit')! * 100)) : null;
  const descTh = s(formData, 'description_th').slice(0, 2000).trim();
  const availFrom = mode === 'monthly' && /^\d{4}-\d{2}-\d{2}$/.test(s(formData, 'available_from')) ? s(formData, 'available_from') : null;
  // blank vacancy → null = "leave unchanged" (the SQL COALESCEs it), never silently zero to "full"
  const availUnits = num('available_units') != null ? Math.max(0, Math.round(num('available_units')!)) : null;
  const dailyStatus = ['vacant', 'full', 'ask'].includes(s(formData, 'daily_status')) ? s(formData, 'daily_status') : 'ask';
  const furnished = ['furnished', 'partial', 'unfurnished'].includes(s(formData, 'furnished')) ? s(formData, 'furnished') : null;
  const bills = formData.getAll('bills').map(String).filter((k) => KEY_RE.test(k)).slice(0, 20);
  const amen = formData.getAll('amenity').map(String).filter((k) => KEY_RE.test(k)).slice(0, 40);
  // new photos upload to MinIO and REPLACE image_urls; none → keep existing (CASE in SQL). No URL pasting.
  const photos = (formData.getAll('photos') as File[]).filter((f) => f && f.size > 0);
  const tried = Math.min(photos.length, MAX_UPLOADS); // saveUploads caps at MAX_UPLOADS — don't count the overflow as a rejection
  const saved = await saveUploads(photos, 'rooms');
  if (tried && saved.length < tried) redirect(`/merchant/rooms/${unitId}/edit?error=upload&rej=${tried - saved.length}`);
  // rebuild image_urls from the PhotoManager order manifest (photo_order: existing-URL | "new:k"); existing URLs
  // are validated against this unit's own set (anti-injection). Absent manifest → legacy replace-on-upload.
  let imageUrls: string[] | null = null;
  const rawOrder = s(formData, 'photo_order');
  if (rawOrder) {
    const [curImg] = await q<{ image_urls: string[] | null }>(`SELECT image_urls FROM stay_units WHERE id=$1 AND place_id=$2`, [unitId, acc.place_id]);
    const allowed = new Set(curImg?.image_urls || []);
    let order: unknown[] = [];
    try { order = JSON.parse(rawOrder); } catch { order = []; }
    const final: string[] = [];
    for (const tok of Array.isArray(order) ? order : []) {
      if (typeof tok !== 'string') continue;
      if (tok.startsWith('new:')) { const k = parseInt(tok.slice(4), 10); if (saved[k]) final.push(saved[k]); }
      else if (allowed.has(tok)) final.push(tok);
    }
    imageUrls = final.slice(0, MAX_UPLOADS);   // [] = owner removed every photo (intended)
  } else if (saved.length) {
    imageUrls = saved;
  }
  const gender = ['female', 'male'].includes(s(formData, 'gender_policy')) ? s(formData, 'gender_policy') : null;
  const reTime = /^\d{1,2}:\d{2}$/;
  const ci = mode === 'daily' && reTime.test(s(formData, 'check_in_time')) ? s(formData, 'check_in_time') : null;
  const co = mode === 'daily' && reTime.test(s(formData, 'check_out_time')) ? s(formData, 'check_out_time') : null;
  const attrs: Record<string, any> = {};
  if (formData.get('attr_breakfast')) attrs.breakfast = true;
  const canc = s(formData, 'attr_cancellation'); if (['flexible', 'moderate', 'strict'].includes(canc)) attrs.cancellation = canc;
  const hostInfo = s(formData, 'attr_host').slice(0, 500).trim(); if (hostInfo) attrs.host = hostInfo;
  const building = formData.getAll('building').map(String).filter((k) => KEY_RE.test(k)).slice(0, 40);
  if (building.length) attrs.building = building;
  await q(
    // available_units/daily_status are written only for the row's ACTIVE mode, so toggling
    // rental_mode never zeroes the other mode's value; for monthly, COALESCE keeps the live count
    // when the vacancy box was left blank. ($4=mode, $7=availUnits|null, $8=dailyStatus.)
    `UPDATE stay_units SET name_i18n=jsonb_build_object('th',$3::text), rental_mode=$4, price_minor=$5, price_period=$6,
       description_i18n = CASE WHEN $23::text <> '' THEN jsonb_build_object('th',$23::text) END,
       available_from   = CASE WHEN $4='monthly' THEN $24::date ELSE available_from END,
       available_units = CASE WHEN $4='monthly' THEN COALESCE($7, available_units) ELSE available_units END,
       daily_status    = CASE WHEN $4='daily'   THEN $8 ELSE daily_status END,
       capacity=$9, deposit_minor=$10, min_stay=$11, room_size_sqm=$12, furnished=$13,
       bills_included = CASE WHEN $4='monthly' THEN $14 ELSE bills_included END, unit_amenities=$15,
       bedrooms=$17, bathrooms=$18, gender_policy=$19, check_in_time=$20, check_out_time=$21, attrs=$22::jsonb,
       image_urls = CASE WHEN $16::text[] IS NOT NULL THEN $16 ELSE image_urls END,
       image_count = CASE WHEN $16::text[] IS NOT NULL THEN COALESCE(array_length($16,1),1) ELSE image_count END,
       availability_updated_at=now(), updated_at=now()
     WHERE id=$1 AND place_id=$2`,
    [unitId, acc.place_id, nameTh, mode, priceMinor, period, availUnits, dailyStatus,
      num('capacity'), depositMinor, num('min_stay'), num('room_size_sqm'), furnished,
      bills.length ? bills : null, amen.length ? amen : null, imageUrls,
      num('bedrooms'), num('bathrooms'), gender, ci, co, JSON.stringify(attrs), descTh, availFrom]);
  // managed listings keep their ผังห้อง-derived vacancy — re-derive so the edit form can't override it
  // (fn no-ops for unmanaged listings, so hand-typed ones keep exactly what the form set).
  await q(`SELECT fn_stay_refresh_vacancy($1)`, [unitId]);
  // re-derive marketplace visibility from the FINAL state: a listing only shows to guests with a price + ≥1 photo
  await q(`UPDATE stay_units SET published_to_marketplace = (price_minor IS NOT NULL AND COALESCE(array_length(image_urls,1),0) > 0) WHERE id=$1 AND place_id=$2 AND deleted_at IS NULL`, [unitId, acc.place_id]);
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

/** Restore a soft-deleted physical room (parity with listing restore — deleted rooms were unrecoverable). */
export async function restoreRoomAction(roomId: string) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  const [r] = await q<{ stay_unit_id: string | null }>(`UPDATE stay_room SET deleted_at=NULL, updated_at=now() WHERE id=$1 AND place_id=$2 AND deleted_at IS NOT NULL RETURNING stay_unit_id`, [roomId, acc.place_id]);
  if (r) await refreshUnitVacancy(r.stay_unit_id);
  revalidatePath('/merchant/trash'); revalidatePath('/merchant/units', 'layout');
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
  // land in the FULL branch editor so the rest of the branch data (address/photos/hours/map) gets filled —
  // the create form only captures name/type/contact, so add → edit is one continuous "complete the branch" flow.
  redirect('/merchant/shop/edit?new=1');
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
  // land in the FULL branch editor so the rest of the branch data (address/photos/hours/map) gets filled —
  // the create form only captures name/type/contact, so add → edit is one continuous "complete the branch" flow.
  redirect('/merchant/shop/edit?new=1');
}

// ── loyalty: per-brand Stamp program (0023). Non-money, in-kind. Scoped to the account's active brand. ──

/** "เริ่มโปรแกรมสะสมแต้ม" — the one-decision setup: create the brand's program + its first reward. */
export async function createLoyaltyProgramAction(formData: FormData) {
  const acc = await currentAccount();
  if (!acc?.brand_id) redirect('/merchant/login');
  requireVerified(acc);   // points programs require a verified (owner-proven) branch
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
  requireVerified(acc);
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
  redirect('/merchant/verify?claimed=1');  // claimed → now prove ownership to unlock full privileges
}

// ── ownership verification (0027): prove control of a claimed/created branch ──────────────────────

/** Self-serve: issue a one-time code to the branch's listed phone. Dev surfaces the code in the URL
 *  (no SMS gateway); production wires an SMS send here and never returns the code. */
export async function startClaimOtpAction() {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  if (acc.verified) redirect('/merchant/verify?ok=already');
  if (!acc.place_phone) redirect('/merchant/verify?error=nophone');
  // 6-digit code, deterministic-free. crypto-grade not required for a dev OTP; avoid 0-padding loss.
  const code = String(100000 + Math.floor(Math.random() * 900000));
  const masked = maskPhone(acc.place_phone);
  await q(
    `INSERT INTO place_claims(place_id, account_id, method, status, otp_code, otp_expires_at, attempts, contact_masked)
     VALUES($1,$2,'phone_otp','pending',$3, now()+interval '10 minutes', 0, $4)`,
    [acc.place_id, acc.id, code, masked]);
  revalidatePath('/merchant/verify');
  // DEV: pass the code so the demo can complete without SMS. Remove the `dev` param once SMS is wired.
  const devParam = process.env.NODE_ENV === 'production' ? '' : `&dev=${code}`;
  redirect(`/merchant/verify?sent=1${devParam}`);
}

/** Confirm the OTP → flip the branch to verified. Fail-closed: latest pending code, not expired,
 *  <5 attempts, exact match. Wrong codes increment attempts; expiry/lockout force a resend. */
export async function confirmClaimOtpAction(formData: FormData) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  if (acc.verified) redirect('/merchant/verify?ok=already');
  const entered = s(formData, 'code').replace(/\D/g, '');
  const [c] = await q<any>(
    `SELECT id, otp_code, attempts, (otp_expires_at < now()) AS expired
       FROM place_claims
      WHERE place_id=$1 AND account_id=$2 AND method='phone_otp' AND status='pending'
      ORDER BY created_at DESC LIMIT 1`, [acc.place_id, acc.id]);
  if (!c) redirect('/merchant/verify?error=nocode');
  if (c.expired) redirect('/merchant/verify?error=expired');
  if (c.attempts >= 5) redirect('/merchant/verify?error=locked');
  if (entered !== c.otp_code) {
    await q(`UPDATE place_claims SET attempts=attempts+1 WHERE id=$1`, [c.id]);
    redirect('/merchant/verify?error=badcode');
  }
  await withTx(async (cx) => {
    await cx.query(`UPDATE place_claims SET status='verified', otp_code=NULL, resolved_at=now() WHERE id=$1`, [c.id]);
    await cx.query(`UPDATE places SET claim_verified_at=now() WHERE id=$1`, [acc.place_id]);
  });
  revalidatePath('/merchant', 'layout'); revalidatePath('/merchant/verify');
  redirect('/merchant/verify?ok=verified');
}

/** Fallback: request a manual ownership review (staff approve via doc / field check). Records a
 *  pending claim; does NOT grant verification — staff resolution flips places.claim_verified_at. */
export async function requestClaimReviewAction(formData: FormData) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  if (acc.verified) redirect('/merchant/verify?ok=already');
  const note = s(formData, 'note').slice(0, 500);
  // one open manual request per branch (idempotent-ish): skip if already pending
  const [open] = await q<{ id: string }>(
    `SELECT id FROM place_claims WHERE place_id=$1 AND method='manual_review' AND status='pending'`, [acc.place_id]);
  if (!open) {
    await q(
      `INSERT INTO place_claims(place_id, account_id, method, status, note) VALUES($1,$2,'manual_review','pending',$3)`,
      [acc.place_id, acc.id, note || null]);
  }
  revalidatePath('/merchant/verify');
  redirect('/merchant/verify?ok=submitted');
}

// ── deals / promotions (merchant self-serve) ─────────────────────────────────────────────────────
// deals.merchant_id is the money-plane id; a self-signup brand may not have one yet, so create it
// lazily and link brands.merchant_id (also the anchor for future payouts).
async function ensureMerchant(c: any, acc: any): Promise<string> {
  const [b] = (await c.query(`SELECT merchant_id FROM brands WHERE id=$1`, [acc.brand_id])).rows;
  if (b?.merchant_id) return b.merchant_id;
  const m = (await c.query(
    `INSERT INTO merchants(city_id, display_name_i18n, trust_state)
     VALUES((SELECT city_id FROM places WHERE id=$1), jsonb_build_object('th',$2::text), 'claimed_unverified')
     RETURNING id`, [acc.place_id, acc.display_name || 'ร้านค้า'])).rows[0];
  await c.query(`UPDATE brands SET merchant_id=$2 WHERE id=$1`, [acc.brand_id, m.id]);
  return m.id;
}

/** Create a promotion on the active branch. Verified branches only (same gate as loyalty). */
export async function createMerchantDealAction(formData: FormData) {
  const acc = await currentAccount();
  if (!acc?.brand_id) redirect('/merchant/login');
  requireVerified(acc);
  const title = s(formData, 'title');
  if (!title) redirect('/merchant/deals/new?error=title');
  const type = ['percent_off', 'fixed_off', 'bogo', 'freebie'].includes(s(formData, 'deal_type')) ? s(formData, 'deal_type') : 'percent_off';
  const pct = type === 'percent_off' ? Math.min(90, Math.max(1, parseInt(s(formData, 'value_pct'), 10) || 0)) : null;
  const minor = type === 'fixed_off' ? bahtToMinor(s(formData, 'value_baht')) : null;
  if (type === 'percent_off' && !pct) redirect('/merchant/deals/new?error=value');
  if (type === 'fixed_off' && !minor) redirect('/merchant/deals/new?error=value');
  const terms = s(formData, 'terms');
  const quotaN = parseInt(s(formData, 'quota'), 10);
  const quotaTotal = quotaN > 0 ? Math.min(99999, quotaN) : null;
  const days = Math.min(60, Math.max(1, parseInt(s(formData, 'days'), 10) || 7));
  await withTx(async (c) => {
    const mid = await ensureMerchant(c, acc);
    const dl = (await c.query(
      `INSERT INTO deals(place_id, merchant_id, city_id, title_i18n, terms_i18n, deal_type, value_pct, value_minor,
                         starts_at, ends_at, quota_total, status)
       VALUES($1, $2, (SELECT city_id FROM places WHERE id=$1), jsonb_build_object('th',$3::text),
              CASE WHEN $4 <> '' THEN jsonb_build_object('th',$4::text) END,
              $5::deal_type, $6, $7, now(), now() + ($8 || ' days')::interval, $9, 'active'::deal_status)
       RETURNING id`,
      [acc.place_id, mid, title, terms, type, pct, minor, String(days), quotaTotal])).rows[0];
    // notify everyone who saved this place (deal → savers). dedup per (deal,user) so re-runs don't double.
    await c.query(
      `INSERT INTO notif_outbox(event_type, event_class, audience_user_id, merchant_id, city_id,
                                entity_type, entity_id, dedup_key, payload)
       SELECT 'deal_published', 'marketing', sp.user_id, $2, (SELECT city_id FROM places WHERE id=$1),
              'place', $1, 'deal:'||$3||':'||sp.user_id,
              jsonb_build_object('place_id', $1, 'title', $4::text)
         FROM saved_places sp WHERE sp.place_id=$1`,
      [acc.place_id, mid, dl.id, title]);
  });
  revalidatePath('/merchant/deals'); revalidatePath('/');  // home deal rail
  redirect('/merchant/deals?ok=created');
}

/** Pause / resume / end one of the active branch's own deals. */
export async function setDealStatusAction(dealId: string, status: string) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  const st = ['active', 'paused', 'expired'].includes(status) ? status : 'paused';
  await q(`UPDATE deals SET status=$3::deal_status WHERE id=$1 AND place_id=$2`, [dealId, acc.place_id, st]);
  revalidatePath('/merchant/deals'); revalidatePath('/');
  redirect('/merchant/deals?ok=updated');
}

// ── payouts: merchant requests a withdrawal of settled earnings (intent only) ─────────────────────
// The actual money move happens money-plane on staff approval (fn_payout_merchant via the API).
// app_content can NEVER post the ledger; here it only checks the balance and records the request.
export async function createPayoutRequestAction(formData: FormData) {
  const acc = await currentAccount();
  if (!acc?.brand_id) redirect('/merchant/login');
  requireVerified(acc);
  const amountMinor = bahtToMinor(s(formData, 'amount'));
  if (!amountMinor) redirect('/merchant/payouts?error=amount');
  let err = '';
  try {
    await withTx(async (c) => {
      const mid = await ensureMerchant(c, acc);
      const [bal] = (await c.query(
        `SELECT COALESCE(SUM(CASE WHEN e.direction='CR' THEN e.amount_minor ELSE -e.amount_minor END),0)::bigint payable
           FROM ledger_entries e JOIN accounts a ON a.id=e.account_id
          WHERE a.account_type='merchant_payable' AND a.owner_type='merchant' AND a.owner_id=$1`, [mid])).rows;
      if (Number(amountMinor) > Number(bal?.payable || 0)) throw new Error('over_balance');
      const open = (await c.query(`SELECT 1 FROM payout_requests WHERE merchant_id=$1 AND status='requested'`, [mid])).rows;
      if (open.length) throw new Error('pending_exists');
      await c.query(
        `INSERT INTO payout_requests(merchant_id, account_id, city_id, amount_minor, status)
         VALUES($1, $2, (SELECT city_id FROM places WHERE id=$3), $4, 'requested')`,
        [mid, acc.id, acc.place_id, amountMinor]);
    });
  } catch (e: any) {
    if (e?.message === 'over_balance') err = 'balance';
    else if (e?.message === 'pending_exists') err = 'pending';
    else throw e;
  }
  if (err) redirect(`/merchant/payouts?error=${err}`);
  revalidatePath('/merchant/payouts');
  redirect('/merchant/payouts?ok=requested');
}

// ── room management (0031-0035): PHYSICAL rooms + occupancy + nightly date-blocks. NO money — these
//    are display/ops state, never joined to the ledger. Tenancy: every write scopes on acc.place_id
//    (rooms) or re-proves the room's place ownership (blocks). Gated by the manages_stay capability. ──
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);
const ROOM_STATUS = ['vacant', 'occupied', 'reserved', 'maintenance'];
const KEY_RE = /^[a-z0-9_]+$/;   // amenity/building/bills keys are the admin catalog (0044) — accept any well-formed key

/** Recompute a managed listing's marketplace vacancy from its physical rooms (projection, 0033). No-op for unmanaged. */
async function refreshUnitVacancy(stayUnitId: string | null | undefined) {
  if (stayUnitId) await q(`SELECT fn_stay_refresh_vacancy($1)`, [stayUnitId]);
}

/** Add a physical room to the active branch (optionally tied to a listing/type for vacancy rollup). */
export async function createRoomAction(formData: FormData) {
  const acc = await currentAccount();
  requireCap(acc, 'manages_stay');
  const code = s(formData, 'code');
  if (!code) redirect('/merchant/units?error=code');
  const floor = s(formData, 'floor') || null;
  const kind = s(formData, 'room_kind') === 'bed' ? 'bed' : 'room';
  const capV = s(formData, 'capacity');
  const capacity = capV && Number.isFinite(Number(capV)) ? Math.max(0, Math.trunc(Number(capV))) : null;
  // status at creation — so a board with already-occupied rooms can be backfilled (else every new room shows
  // as a fake vacancy in the customer's "ว่าง N"). occupied_until only carries for occupied/reserved.
  const status = ROOM_STATUS.includes(s(formData, 'occupancy_status')) ? s(formData, 'occupancy_status') : 'vacant';
  const occUntil = (status === 'occupied' || status === 'reserved') && isDate(s(formData, 'occupied_until')) ? s(formData, 'occupied_until') : null;
  const note = s(formData, 'note').slice(0, 300).trim() || null;
  // the linked listing must be the account's own (re-prove ownership); a forged stay_unit_id → null
  const wantUnit = s(formData, 'stay_unit_id');
  let okUnit: string | null = null;
  if (UUID_RE.test(wantUnit)) {
    const [u] = await q<{ id: string }>(`SELECT id FROM stay_units WHERE id=$1 AND place_id=$2 AND deleted_at IS NULL`, [wantUnit, acc.place_id]);
    okUnit = u?.id ?? null;
  }
  try {
    await q(`INSERT INTO stay_room(place_id, stay_unit_id, code, floor, room_kind, capacity, occupancy_status, occupied_until, note) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [acc.place_id, okUnit, code, floor, kind, capacity, status, occUntil, note]);
  } catch (e: any) {
    if (e?.code === '23505') redirect('/merchant/units?error=dupe'); // unique (place_id, code)
    throw e;
  }
  // Invariant: a type that has physical rooms is auto-managed. Promote BEFORE refresh —
  // refreshUnitVacancy no-ops while managed=false, so the order matters (else available_units stays stale-typed).
  if (okUnit) await q(`UPDATE stay_units SET managed=true, updated_at=now() WHERE id=$1 AND place_id=$2 AND deleted_at IS NULL AND NOT managed`, [okUnit, acc.place_id]);
  await refreshUnitVacancy(okUnit);
  revalidatePath('/merchant/units'); revalidatePath('/merchant');
  redirect('/merchant/units?ok=added');
}

/** Set one room's current occupancy (monthly fast-path). Restamps the listing's vacancy projection. */
export async function setRoomOccupancyAction(roomId: string, status: string) {
  const acc = await currentAccount();
  requireCap(acc, 'manages_stay');
  const st = ['vacant', 'occupied', 'reserved', 'maintenance'].includes(status) ? status : 'vacant';
  const [r] = await q<{ stay_unit_id: string | null }>(
    `UPDATE stay_room SET occupancy_status=$3, occupied_until = CASE WHEN $3='vacant' THEN NULL ELSE occupied_until END, updated_at=now()
       WHERE id=$1 AND place_id=$2 AND deleted_at IS NULL RETURNING stay_unit_id`, [roomId, acc.place_id, st]);
  if (r) {
    await q(`INSERT INTO stay_room_event(room_id, place_id, event_kind, meta) VALUES($1,$2,'status_change',jsonb_build_object('to',$3::text))`, [roomId, acc.place_id, st]);
    await refreshUnitVacancy(r.stay_unit_id);
  }
  revalidatePath('/merchant/units', 'layout');
}

/** Set occupancy for MANY rooms at once (board multi-select + undo). items carry a per-room status, so the
 *  same action does a bulk apply (all one status) AND an undo (each room back to its previous status). */
export async function setRoomsOccupancyBulkAction(items: { id: string; status: string }[]) {
  const acc = await currentAccount();
  requireCap(acc, 'manages_stay');
  const STS = ['vacant', 'occupied', 'reserved', 'maintenance'];
  const valid = (Array.isArray(items) ? items : []).filter((i) => i && typeof i.id === 'string' && STS.includes(i.status)).slice(0, 500);
  if (!valid.length) return;
  const affected = new Set<string>();
  for (const status of STS) {
    const ids = valid.filter((i) => i.status === status).map((i) => i.id);
    if (!ids.length) continue;
    const rows = await q<{ stay_unit_id: string | null }>(
      `UPDATE stay_room SET occupancy_status=$3, occupied_until = CASE WHEN $3='vacant' THEN NULL ELSE occupied_until END, updated_at=now()
         WHERE id = ANY($1::uuid[]) AND place_id=$2 AND deleted_at IS NULL RETURNING stay_unit_id`, [ids, acc.place_id, status]);
    for (const r of rows) if (r.stay_unit_id) affected.add(r.stay_unit_id);
    await q(`INSERT INTO stay_room_event(room_id, place_id, event_kind, meta)
               SELECT unnest($1::uuid[]), $2, 'status_change', jsonb_build_object('to',$3::text,'bulk',true)`, [ids, acc.place_id, status]);
  }
  for (const uid of affected) await refreshUnitVacancy(uid);
  revalidatePath('/merchant/units', 'layout');
}

/** Set just the "free again" date on an occupied/reserved room — captured inline on the room detail so the
 *  owner doesn't detour through the edit form. Empty clears it. */
export async function setRoomOccupiedUntilAction(roomId: string, formData: FormData) {
  const acc = await currentAccount();
  requireCap(acc, 'manages_stay');
  const d = s(formData, 'occupied_until');
  const until = /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
  await q(`UPDATE stay_room SET occupied_until=$3, updated_at=now() WHERE id=$1 AND place_id=$2 AND deleted_at IS NULL`, [roomId, acc.place_id, until]);
  revalidatePath('/merchant/units', 'layout');
}

/** Edit a room's details (code / floor / capacity / private note / expected free date). */
export async function updateRoomAction(roomId: string, formData: FormData) {
  const acc = await currentAccount();
  requireCap(acc, 'manages_stay');
  const code = s(formData, 'code');
  if (!code) redirect(`/merchant/units/${roomId}/edit?error=code`);
  const floor = s(formData, 'floor') || null;
  const note = s(formData, 'note') || null;     // owner's private memo (may contain a tenant name; not used elsewhere)
  const ou = s(formData, 'occupied_until');
  const occUntil = isDate(ou) ? ou : null;
  const capV = s(formData, 'capacity');
  const capacity = capV && Number.isFinite(Number(capV)) ? Math.max(0, Math.trunc(Number(capV))) : null;
  const [r] = await q<{ stay_unit_id: string | null }>(
    `UPDATE stay_room SET code=$3, floor=$4, note=$5, occupied_until=$6, capacity=$7, updated_at=now()
       WHERE id=$1 AND place_id=$2 AND deleted_at IS NULL RETURNING stay_unit_id`,
    [roomId, acc.place_id, code, floor, note, occUntil, capacity]);
  if (r) await refreshUnitVacancy(r.stay_unit_id);
  revalidatePath('/merchant/units', 'layout');
  redirect(`/merchant/units/${roomId}?ok=updated`);
}

/** Soft-delete a room (kept for history; drops out of every read + the vacancy rollup). */
export async function deleteRoomAction(roomId: string) {
  const acc = await currentAccount();
  requireCap(acc, 'manages_stay');
  const [r] = await q<{ stay_unit_id: string | null }>(
    `UPDATE stay_room SET deleted_at=now(), updated_at=now() WHERE id=$1 AND place_id=$2 AND deleted_at IS NULL RETURNING stay_unit_id`, [roomId, acc.place_id]);
  if (r) await refreshUnitVacancy(r.stay_unit_id);
  revalidatePath('/merchant/units'); revalidatePath('/merchant');
  redirect('/merchant/units?ok=deleted');
}

/** Soft-delete many rooms at once from the board's multi-select (recoverable in ถังขยะ). */
export async function deleteRoomsBulkAction(ids: string[]) {
  const acc = await currentAccount();
  requireCap(acc, 'manages_stay');
  const list = (Array.isArray(ids) ? ids : []).filter((x) => typeof x === 'string').slice(0, 500);
  if (!list.length) return;
  const rows = await q<{ stay_unit_id: string | null }>(
    `UPDATE stay_room SET deleted_at=now(), updated_at=now() WHERE id = ANY($1::uuid[]) AND place_id=$2 AND deleted_at IS NULL RETURNING stay_unit_id`, [list, acc.place_id]);
  const affected = new Set<string>(); for (const r of rows) if (r.stay_unit_id) affected.add(r.stay_unit_id);
  for (const uid of affected) await refreshUnitVacancy(uid);
  revalidatePath('/merchant/units', 'layout');
}

/** Toggle whether a listing's marketplace vacancy is SYSTEM-computed from rooms (managed) or hand-typed. */
export async function setStayUnitManagedAction(unitId: string, on: boolean) {
  const acc = await currentAccount();
  requireCap(acc, 'manages_stay');
  if (on) {
    // cutover safety (docs/13 §5): don't let system-computed vacancy take over until physical rooms
    // exist — else the listing would flip to "0 ว่าง" mid-backfill while the owner is still adding rooms.
    const [c] = await q<{ n: number }>(`SELECT count(*)::int n FROM stay_room WHERE stay_unit_id=$1 AND place_id=$2 AND status='active' AND deleted_at IS NULL`, [unitId, acc.place_id]);
    if (!c || c.n === 0) { revalidatePath('/merchant/units'); redirect('/merchant/units?error=norooms'); }
  } else {
    // invariant: a type that HAS physical rooms must stay auto-managed — can't drop back to a hand-typed
    // counter (that's the "unmanaged-with-rooms" state that makes the typed number contradict the board).
    const [c] = await q<{ n: number }>(`SELECT count(*)::int n FROM stay_room WHERE stay_unit_id=$1 AND place_id=$2 AND status='active' AND deleted_at IS NULL`, [unitId, acc.place_id]);
    if (c && c.n > 0) { revalidatePath('/merchant/units'); redirect(`/merchant/rooms/${unitId}/edit?error=hasrooms`); }
  }
  await q(`UPDATE stay_units SET managed=$3, updated_at=now() WHERE id=$1 AND place_id=$2 AND deleted_at IS NULL`, [unitId, acc.place_id, !!on]);
  if (on) await refreshUnitVacancy(unitId);
  revalidatePath('/merchant/units', 'layout'); revalidatePath('/merchant/rooms', 'layout');
}

/** Nightly: block a date range on a room (anonymous — no occupant, no money). DB rejects overlaps. */
export async function addRoomBlockAction(roomId: string, formData: FormData) {
  const acc = await currentAccount();
  requireCap(acc, 'manages_stay');
  const from = s(formData, 'start_date');
  const to = s(formData, 'end_date');
  if (!isDate(from)) redirect(`/merchant/units/${roomId}?error=date`);
  const end = isDate(to) ? to : null;
  if (end && end <= from) redirect(`/merchant/units/${roomId}?error=daterange`);   // no 0-/negative-day spans (GiST only guards overlap)
  const note = s(formData, 'note') || null;
  const [r] = await q<{ stay_unit_id: string | null; rental_mode: string | null }>(`SELECT r.stay_unit_id, su.rental_mode FROM stay_room r LEFT JOIN stay_units su ON su.id=r.stay_unit_id WHERE r.id=$1 AND r.place_id=$2 AND r.deleted_at IS NULL`, [roomId, acc.place_id]);
  if (!r) redirect('/merchant/units');
  const kindIn = s(formData, 'block_kind');
  const blockKind = ['stay', 'tenancy', 'maintenance', 'hold'].includes(kindIn) ? kindIn : 'stay';   // monthly → tenancy/maintenance/hold
  const leadMode = r.rental_mode === 'monthly' ? 'monthly' : 'daily';
  const guestName = s(formData, 'guest_name').slice(0, 80);
  const guestPhone = s(formData, 'guest_phone').slice(0, 40);
  try {
    const [blk] = await q<{ id: string }>(`INSERT INTO stay_occupancy_block(room_id, place_id, block_kind, start_date, end_date, note) VALUES($1,$2,$3,$4,$5,$6) RETURNING id`,
      [roomId, acc.place_id, blockKind, from, end, note]);
    // optional guest → a converted walk-in/phone lead, so the booking shows in the คำขอจอง roster (still no money)
    if (guestName && r.stay_unit_id) await q(
      `INSERT INTO stay_booking_request(place_id, stay_unit_id, request_kind, rental_mode, desired_from, desired_to, contact_name, contact_phone, channel, status, converted_block_id, expires_at)
       VALUES($1,$2,'booking',$3,$4,$5,$6,$7,'walk_in','converted',$8, now() + interval '60 days')`,
      [acc.place_id, r.stay_unit_id, leadMode, from, end, guestName, guestPhone || null, blk.id]);
  } catch (e: any) {
    if (e?.code === '23P01') redirect(`/merchant/units/${roomId}?error=overlap`); // exclusion_violation (double-book)
    throw e;
  }
  await refreshUnitVacancy(r.stay_unit_id);
  revalidatePath(`/merchant/units/${roomId}`); revalidatePath('/merchant/units');
  redirect(`/merchant/units/${roomId}?ok=${guestName ? 'booked' : 'blocked'}`);
}

/** Edit an existing occupancy block's dates/note (gap: bookings were cancel-only). GiST EXCLUDE still
 *  rejects an overlap with OTHER active blocks; the row never conflicts with itself. */
export async function editRoomBlockAction(blockId: string, formData: FormData) {
  const acc = await currentAccount();
  requireCap(acc, 'manages_stay');
  const [b] = await q<{ room_id: string; stay_unit_id: string | null }>(
    `SELECT b.room_id, r.stay_unit_id FROM stay_occupancy_block b JOIN stay_room r ON r.id=b.room_id
      WHERE b.id=$1 AND r.place_id=$2 AND b.deleted_at IS NULL`, [blockId, acc.place_id]);
  if (!b) redirect('/merchant/units');
  const from = s(formData, 'start_date');
  if (!isDate(from)) redirect(`/merchant/units/${b.room_id}?error=date`);
  const to = s(formData, 'end_date');
  const end = isDate(to) ? to : null;
  if (end && end <= from) redirect(`/merchant/units/${b.room_id}?error=daterange`);   // no 0-/negative-day spans
  const note = s(formData, 'note') || null;
  const kindIn = s(formData, 'block_kind');
  const blockKind = ['stay', 'tenancy', 'maintenance', 'hold'].includes(kindIn) ? kindIn : null;
  try {
    await q(`UPDATE stay_occupancy_block SET start_date=$2, end_date=$3, note=$4, block_kind=COALESCE($5, block_kind), updated_at=now() WHERE id=$1 AND place_id=$6 AND deleted_at IS NULL`, [blockId, from, end, note, blockKind, acc.place_id]);
  } catch (e: any) {
    if (e?.code === '23P01') redirect(`/merchant/units/${b.room_id}?error=overlap`);
    throw e;
  }
  await refreshUnitVacancy(b.stay_unit_id);
  revalidatePath(`/merchant/units/${b.room_id}`); revalidatePath('/merchant/units', 'layout');
  const back = s(formData, 'returnTo');
  redirect(back || `/merchant/units/${b.room_id}?ok=blocked`);   // returnTo keeps an edit done from the calendar on the calendar
}

/** One-tap "block tonight" for a daily room (today → tomorrow). The GiST EXCLUDE rejects an overlap. */
export async function blockTonightAction(roomId: string) {
  const acc = await currentAccount();
  requireCap(acc, 'manages_stay');
  const [r] = await q<{ stay_unit_id: string | null }>(`SELECT stay_unit_id FROM stay_room WHERE id=$1 AND place_id=$2 AND deleted_at IS NULL`, [roomId, acc.place_id]);
  if (!r) redirect('/merchant/units');
  try {
    await q(`INSERT INTO stay_occupancy_block(room_id, place_id, block_kind, start_date, end_date) VALUES($1,$2,'stay',CURRENT_DATE,CURRENT_DATE + 1)`, [roomId, acc.place_id]);
  } catch (e: any) {
    if (e?.code === '23P01') redirect(`/merchant/units/${roomId}?error=overlap`);
    throw e;
  }
  await refreshUnitVacancy(r.stay_unit_id);
  revalidatePath('/merchant/units', 'layout');
  redirect(`/merchant/units/${roomId}?ok=blocked`);
}

/** Move a tenant from one room to a vacant one — relocates the free-text note + occupied_until, flips
 *  statuses, logs both sides. No money/contract/ID; destination must be vacant. */
export async function moveTenantAction(srcId: string, formData: FormData) {
  const acc = await currentAccount();
  requireCap(acc, 'manages_stay');
  const destId = s(formData, 'dest');
  if (!UUID_RE.test(destId) || destId === srcId) redirect(`/merchant/units/${srcId}?error=dest`);
  const rows = await q<any>(`SELECT id, code, occupancy_status, note, occupied_until, stay_unit_id FROM stay_room WHERE id = ANY($1::uuid[]) AND place_id=$2 AND deleted_at IS NULL`, [[srcId, destId], acc.place_id]);
  const src = rows.find((r: any) => r.id === srcId);
  const dest = rows.find((r: any) => r.id === destId);
  if (!src || !dest) redirect('/merchant/units');
  if (dest.occupancy_status !== 'vacant') redirect(`/merchant/units/${srcId}?error=occupied`);
  // P1: move the monthly tenancy block too (it now backs the calendar). Block FIRST so a GiST overlap on
  // the destination room aborts BEFORE we touch the board flags — no partial/desynced state.
  try {
    await q(`UPDATE stay_occupancy_block SET room_id=$2, updated_at=now()
               WHERE room_id=$1 AND place_id=$3 AND block_kind='tenancy' AND status='active' AND deleted_at IS NULL`,
      [srcId, destId, acc.place_id]);
  } catch (e: any) {
    if (e?.code === '23P01') redirect(`/merchant/units/${srcId}?error=occupied`);
    throw e;
  }
  await q(`UPDATE stay_room SET occupancy_status='occupied', note=$3, occupied_until=$4, updated_at=now() WHERE id=$1 AND place_id=$2`, [destId, acc.place_id, src.note, src.occupied_until]);
  await q(`UPDATE stay_room SET occupancy_status='vacant', note=NULL, occupied_until=NULL, updated_at=now() WHERE id=$1 AND place_id=$2`, [srcId, acc.place_id]);
  await q(`INSERT INTO stay_room_event(room_id, place_id, event_kind, meta) VALUES
             ($1,$3,'move_out',jsonb_build_object('to',$2::text,'to_code',$5::text)),
             ($2,$3,'move_in', jsonb_build_object('from',$1::text,'from_code',$4::text))`, [srcId, destId, acc.place_id, src.code, dest.code]);
  await refreshUnitVacancy(src.stay_unit_id);
  if (dest.stay_unit_id && dest.stay_unit_id !== src.stay_unit_id) await refreshUnitVacancy(dest.stay_unit_id);
  revalidatePath('/merchant/units', 'layout');
  redirect(`/merchant/units/${destId}?ok=moved`);
}

/** Close the loop: turn an agreed booking lead into a real calendar block (daily/managed). Auto-assigns
 *  the first room of the type free for the requested dates; the GiST EXCLUDE resolves any off-app race.
 *  No money — it only records the agreed dates as occupied + links the lead. */
export async function convertLeadToBlockAction(leadId: string) {
  const acc = await currentAccount();
  requireCap(acc, 'manages_stay');
  const [b] = await q<any>(`SELECT id, stay_unit_id, desired_from, desired_to, rental_mode, contact_name FROM stay_booking_request WHERE id=$1 AND place_id=$2 AND deleted_at IS NULL`, [leadId, acc.place_id]);
  if (!b || !b.stay_unit_id || b.rental_mode !== 'daily' || !b.desired_from || !b.desired_to) redirect('/merchant/bookings?error=cvt');
  const [room] = await q<{ id: string }>(
    `SELECT r.id FROM stay_room r WHERE r.stay_unit_id=$1 AND r.status='active' AND r.deleted_at IS NULL
        AND NOT EXISTS (SELECT 1 FROM stay_occupancy_block bk WHERE bk.room_id=r.id AND bk.status='active' AND bk.deleted_at IS NULL
          AND bk.block_kind IN ('stay','tenancy','maintenance') AND bk.span && daterange($2::date,$3::date,'[)'))
      ORDER BY r.code LIMIT 1`, [b.stay_unit_id, b.desired_from, b.desired_to]);
  if (!room) redirect('/merchant/bookings?error=full');
  try {
    const [blk] = await q<{ id: string }>(
      `INSERT INTO stay_occupancy_block(room_id, place_id, block_kind, start_date, end_date, note) VALUES($1,$2,'stay',$3,$4,$5) RETURNING id`,
      [room.id, acc.place_id, b.desired_from, b.desired_to, b.contact_name ? `จองผ่านแอป: ${b.contact_name}` : 'จองผ่านแอป']);
    await q(`UPDATE stay_booking_request SET status='converted', converted_block_id=$2, updated_at=now() WHERE id=$1 AND place_id=$3`, [leadId, blk.id, acc.place_id]);
    await refreshUnitVacancy(b.stay_unit_id);
  } catch (e: any) {
    if (e?.code === '23P01') redirect('/merchant/bookings?error=full');
    throw e;
  }
  revalidatePath('/merchant/bookings'); revalidatePath('/merchant/units', 'layout');
  redirect('/merchant/bookings?ok=converted');
}

/** Close a MONTHLY lead in-app (no money). Managed listing → occupy the first vacant room until
 *  (move-in + N months). Unmanaged listing (vacancy counter) → decrement available_units. Marks converted. */
export async function convertMonthlyLeadAction(leadId: string) {
  const acc = await currentAccount();
  requireCap(acc, 'manages_stay');
  const [b] = await q<any>(`SELECT id, stay_unit_id, desired_from, desired_months, rental_mode, contact_name FROM stay_booking_request WHERE id=$1 AND place_id=$2 AND deleted_at IS NULL`, [leadId, acc.place_id]);
  if (!b || !b.stay_unit_id || b.rental_mode !== 'monthly') redirect('/merchant/bookings?error=cvt');
  const months = Math.max(1, Math.min(36, Number(b.desired_months) || 1));
  const [su] = await q<{ managed: boolean }>(`SELECT managed FROM stay_units WHERE id=$1 AND place_id=$2 AND deleted_at IS NULL`, [b.stay_unit_id, acc.place_id]);
  if (!su) redirect('/merchant/bookings?error=cvt');
  let blockId: string | null = null;
  if (su.managed) {
    const [room] = await q<{ id: string }>(
      `SELECT id FROM stay_room WHERE stay_unit_id=$1 AND status='active' AND deleted_at IS NULL AND occupancy_status='vacant' ORDER BY code LIMIT 1`, [b.stay_unit_id]);
    if (!room) redirect('/merchant/bookings?error=full');
    const tnote = b.contact_name ? `เข้าอยู่ผ่านแอป: ${b.contact_name}` : 'เข้าอยู่ผ่านแอป';
    // P1: a monthly tenancy now creates a BOUNDED tenancy block (move-in + N months) so it shows on the
    // calendar, is GiST-protected against double-book, and can be cancelled/moved like a nightly stay.
    // Block FIRST (the GiST EXCLUDE is the double-book authority); the room flag mirrors it.
    try {
      const [blk] = await q<{ id: string }>(
        `INSERT INTO stay_occupancy_block(room_id, place_id, block_kind, start_date, end_date, note)
           VALUES($1,$2,'tenancy', COALESCE($3::date, CURRENT_DATE),
                  (COALESCE($3::date, CURRENT_DATE) + ($4 || ' months')::interval)::date, $5) RETURNING id`,
        [room.id, acc.place_id, b.desired_from, String(months), tnote]);
      blockId = blk.id;
    } catch (e: any) {
      if (e?.code === '23P01') redirect('/merchant/bookings?error=full');
      throw e;
    }
    await q(
      `UPDATE stay_room SET occupancy_status='occupied', occupied_until=(COALESCE($3::date, CURRENT_DATE) + ($4 || ' months')::interval)::date, note=$5, updated_at=now() WHERE id=$1 AND place_id=$2`,
      [room.id, acc.place_id, b.desired_from, String(months), tnote]);
  } else {
    const [u] = await q<{ available_units: number }>(
      `UPDATE stay_units SET available_units=GREATEST(0, available_units-1), availability_updated_at=now(), updated_at=now() WHERE id=$1 AND place_id=$2 AND available_units>0 RETURNING available_units`, [b.stay_unit_id, acc.place_id]);
    if (!u) redirect('/merchant/bookings?error=full');
  }
  await q(`UPDATE stay_booking_request SET status='converted', converted_block_id=$3, updated_at=now() WHERE id=$1 AND place_id=$2`, [leadId, acc.place_id, blockId]);
  await refreshUnitVacancy(b.stay_unit_id);
  revalidatePath('/merchant/bookings'); revalidatePath('/merchant/units', 'layout');
  redirect('/merchant/bookings?ok=converted_m');
}

/** Host verifies an online-booking slip: mark the payment verified AND hold the room in one step (creates
 *  the occupancy block, GiST-guarded, mode-aware — same as a manual convert). Money stays host-direct; this
 *  only records that the host accepted the transfer. */
export async function verifySlipAction(leadId: string) {
  const acc = await currentAccount();
  requireCap(acc, 'manages_stay');
  const [b] = await q<any>(`SELECT id, ref, requester_user_id, stay_unit_id, desired_from, desired_to, desired_months, rental_mode, contact_name, status, converted_block_id FROM stay_booking_request WHERE id=$1 AND place_id=$2 AND deleted_at IS NULL AND payment_status='submitted'`, [leadId, acc.place_id]);
  if (!b) redirect('/merchant/bookings');
  await q(`UPDATE stay_booking_request SET payment_status='verified', updated_at=now() WHERE id=$1 AND place_id=$2`, [leadId, acc.place_id]);
  // notify the guest their booking is confirmed (consumer inbox → /stay/requests). Walk-ins have no user → skip.
  if (b.requester_user_id) await q(
    `INSERT INTO notif_outbox(event_type, event_class, audience_user_id, city_id, entity_type, entity_id, dedup_key, payload)
     SELECT 'stay_booking_verified','ops',$2,p.city_id,'place',p.id,'bkverify:'||$3, jsonb_build_object('title',$4::text)
       FROM places p WHERE p.id=$1 ON CONFLICT DO NOTHING`,
    [acc.place_id, b.requester_user_id, b.id, `จองสำเร็จ! ที่พักยืนยันการชำระเงินแล้ว · ${b.ref}`]);
  // hold the room (skip if already converted, e.g. a re-verify)
  if (b.status !== 'converted' && b.stay_unit_id) {
    if (b.rental_mode === 'daily' && b.desired_from && b.desired_to) {
      const [room] = await q<{ id: string }>(
        `SELECT r.id FROM stay_room r WHERE r.stay_unit_id=$1 AND r.status='active' AND r.deleted_at IS NULL
            AND NOT EXISTS (SELECT 1 FROM stay_occupancy_block bk WHERE bk.room_id=r.id AND bk.status='active' AND bk.deleted_at IS NULL
              AND bk.block_kind IN ('stay','tenancy','maintenance') AND bk.span && daterange($2::date,$3::date,'[)'))
          ORDER BY r.code LIMIT 1`, [b.stay_unit_id, b.desired_from, b.desired_to]);
      if (!room) redirect(`/merchant/bookings/${leadId}?error=full`);
      try {
        const [blk] = await q<{ id: string }>(
          `INSERT INTO stay_occupancy_block(room_id, place_id, block_kind, start_date, end_date, note) VALUES($1,$2,'stay',$3,$4,$5) RETURNING id`,
          [room.id, acc.place_id, b.desired_from, b.desired_to, b.contact_name ? `จองออนไลน์: ${b.contact_name}` : 'จองออนไลน์']);
        await q(`UPDATE stay_booking_request SET status='converted', converted_block_id=$2, updated_at=now() WHERE id=$1 AND place_id=$3`, [leadId, blk.id, acc.place_id]);
        await refreshUnitVacancy(b.stay_unit_id);
      } catch (e: any) { if (e?.code === '23P01') redirect(`/merchant/bookings/${leadId}?error=full`); throw e; }
    } else if (b.rental_mode === 'monthly') {
      const months = Math.max(1, Math.min(36, Number(b.desired_months) || 1));
      const [su] = await q<{ managed: boolean }>(`SELECT managed FROM stay_units WHERE id=$1 AND place_id=$2 AND deleted_at IS NULL`, [b.stay_unit_id, acc.place_id]);
      if (su?.managed) {
        const [room] = await q<{ id: string }>(`SELECT id FROM stay_room WHERE stay_unit_id=$1 AND status='active' AND deleted_at IS NULL AND occupancy_status='vacant' ORDER BY code LIMIT 1`, [b.stay_unit_id]);
        if (!room) redirect(`/merchant/bookings/${leadId}?error=full`);
        const tnote = b.contact_name ? `จองออนไลน์: ${b.contact_name}` : 'จองออนไลน์';
        let blockId: string;
        try {
          const [blk] = await q<{ id: string }>(
            `INSERT INTO stay_occupancy_block(room_id, place_id, block_kind, start_date, end_date, note)
               VALUES($1,$2,'tenancy', COALESCE($3::date, CURRENT_DATE), (COALESCE($3::date, CURRENT_DATE) + ($4 || ' months')::interval)::date, $5) RETURNING id`,
            [room.id, acc.place_id, b.desired_from, String(months), tnote]);
          blockId = blk.id;
        } catch (e: any) { if (e?.code === '23P01') redirect(`/merchant/bookings/${leadId}?error=full`); throw e; }
        await q(`UPDATE stay_room SET occupancy_status='occupied', occupied_until=(COALESCE($3::date, CURRENT_DATE) + ($4 || ' months')::interval)::date, note=$5, updated_at=now() WHERE id=$1 AND place_id=$2`, [room.id, acc.place_id, b.desired_from, String(months), tnote]);
        await q(`UPDATE stay_booking_request SET status='converted', converted_block_id=$3, updated_at=now() WHERE id=$1 AND place_id=$2`, [leadId, acc.place_id, blockId]);
      } else {
        await q(`UPDATE stay_units SET available_units=GREATEST(0, available_units-1), availability_updated_at=now(), updated_at=now() WHERE id=$1 AND place_id=$2 AND available_units>0`, [b.stay_unit_id, acc.place_id]);
        await q(`UPDATE stay_booking_request SET status='converted', updated_at=now() WHERE id=$1 AND place_id=$2`, [leadId, acc.place_id]);
      }
      await refreshUnitVacancy(b.stay_unit_id);
    }
  }
  revalidatePath('/merchant/bookings'); revalidatePath('/merchant/units', 'layout'); revalidatePath('/merchant');
  redirect(`/merchant/bookings/${leadId}?ok=verified`);
}

/** Host rejects an online-booking slip (wrong amount / unreadable). Records it; the booking is NOT held.
 *  The guest sees "สลิปไม่ผ่าน" and contacts the host. No room is taken; no money moved. */
export async function rejectSlipAction(leadId: string) {
  const acc = await currentAccount();
  requireCap(acc, 'manages_stay');
  const [r] = await q<any>(`UPDATE stay_booking_request SET payment_status='rejected', updated_at=now() WHERE id=$1 AND place_id=$2 AND payment_status='submitted' RETURNING requester_user_id, ref`, [leadId, acc.place_id]);
  if (r?.requester_user_id) await q(
    `INSERT INTO notif_outbox(event_type, event_class, audience_user_id, city_id, entity_type, entity_id, dedup_key, payload)
     SELECT 'stay_booking_rejected','ops',$2,p.city_id,'place',p.id,'bkreject:'||$3, jsonb_build_object('title',$4::text)
       FROM places p WHERE p.id=$1 ON CONFLICT DO NOTHING`,
    [acc.place_id, r.requester_user_id, leadId, `สลิปไม่ผ่าน — กรุณาติดต่อที่พัก · ${r.ref}`]);
  revalidatePath('/merchant/bookings');
  redirect(`/merchant/bookings/${leadId}?ok=rejected`);
}

/** Record that the host returned a guest's deposit/payment (the money moved bank-to-bank between them; the
 *  platform never held it). Marks payment_status='refunded' so it drops out of revenue, and tells the guest. */
export async function markRefundedAction(leadId: string) {
  const acc = await currentAccount();
  requireCap(acc, 'manages_stay');
  const [r] = await q<any>(
    `UPDATE stay_booking_request SET refunded_at=now(), refunded_minor=COALESCE(paid_minor, amount_minor), payment_status='refunded', updated_at=now()
      WHERE id=$1 AND place_id=$2 AND payment_status IN ('submitted','verified','rejected') AND refunded_at IS NULL
      RETURNING requester_user_id, ref`, [leadId, acc.place_id]);
  if (r?.requester_user_id) await q(
    `INSERT INTO notif_outbox(event_type, event_class, audience_user_id, city_id, entity_type, entity_id, dedup_key, payload)
     SELECT 'stay_booking_refunded','ops',$2,p.city_id,'place',p.id,'bkrefund:'||$3, jsonb_build_object('title',$4::text)
       FROM places p WHERE p.id=$1 ON CONFLICT DO NOTHING`,
    [acc.place_id, r.requester_user_id, leadId, `ที่พักคืนเงินให้แล้ว · ${r.ref}`]);
  revalidatePath('/merchant/bookings');
  redirect(`/merchant/bookings/${leadId}?ok=refunded`);
}

/** Record the remaining balance the host collected at check-in (cash/transfer, host-direct). Bumps paid_minor
 *  (capped at the quoted amount) so the booking is fully paid + revenue reflects money actually received. */
export async function collectBalanceAction(leadId: string, formData: FormData) {
  const acc = await currentAccount();
  requireCap(acc, 'manages_stay');
  const add = bahtToMinor(s(formData, 'amount'));
  if (add == null || add <= 0) redirect(`/merchant/bookings/${leadId}`);
  await q(
    `UPDATE stay_booking_request
        SET paid_minor = LEAST(COALESCE(amount_minor, COALESCE(paid_minor,0) + $3), COALESCE(paid_minor,0) + $3), updated_at = now()
      WHERE id=$1 AND place_id=$2 AND deleted_at IS NULL AND payment_status='verified'`, [leadId, acc.place_id, add]);
  revalidatePath('/merchant/bookings'); revalidatePath('/merchant');
  redirect(`/merchant/bookings/${leadId}?ok=collected`);
}

/** Remove a nightly block (soft cancel). Frees the dates and refreshes the listing's vacancy. */
export async function cancelRoomBlockAction(blockId: string) {
  const acc = await currentAccount();
  requireCap(acc, 'manages_stay');
  const [b] = await q<{ room_id: string; stay_unit_id: string | null }>(
    `UPDATE stay_occupancy_block b SET status='cancelled', deleted_at=now(), updated_at=now()
       FROM stay_room r WHERE b.id=$1 AND b.room_id=r.id AND r.place_id=$2 AND b.deleted_at IS NULL
       RETURNING b.room_id, r.stay_unit_id`, [blockId, acc.place_id]);
  if (b) await refreshUnitVacancy(b.stay_unit_id);
  revalidatePath('/merchant/units', 'layout');
}

// ── booking / viewing leads (0034): the marketplace "ขอให้ติดต่อกลับ" inbox. Minimal PII (contact +
//    desired dates), NEVER a money flow — a lead, not a paid reservation. Owner-side status workflow;
//    the consumer-side submit lives in the consumer app. Place-scoped (the lead row is the owner's). ──
export async function setLeadStatusAction(leadId: string, status: string) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  const st = ['new', 'contacted', 'scheduled', 'confirmed', 'declined'].includes(status) ? status : 'contacted';
  await q(`UPDATE stay_booking_request SET status=$3, updated_at=now() WHERE id=$1 AND place_id=$2 AND deleted_at IS NULL`, [leadId, acc.place_id, st]);
  revalidatePath('/merchant/bookings'); revalidatePath('/merchant');
}

export async function deleteLeadAction(leadId: string) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  await q(`UPDATE stay_booking_request SET deleted_at=now(), updated_at=now() WHERE id=$1 AND place_id=$2 AND deleted_at IS NULL`, [leadId, acc.place_id]);
  revalidatePath('/merchant/bookings'); revalidatePath('/merchant');
}

/** No-show: a confirmed booking whose guest never came. Free the held room (cancel the block) so it can be
 *  rebooked, and close the request. No money, so this is the only commitment lever after confirmation. */
export async function markNoShowAction(leadId: string) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  const [b] = await q<{ converted_block_id: string | null }>(`SELECT converted_block_id FROM stay_booking_request WHERE id=$1 AND place_id=$2 AND status='converted' AND deleted_at IS NULL`, [leadId, acc.place_id]);
  // only DAILY bookings hold a recorded occupancy block we can release; a monthly stay occupies a room with no
  // back-link, so freeing it must be done from the room board. Bail (no orphaned status) if there's no block.
  if (!b || !b.converted_block_id) redirect('/merchant/bookings');
  const [blk] = await q<{ stay_unit_id: string | null }>(
    `UPDATE stay_occupancy_block bk SET status='cancelled', deleted_at=now(), updated_at=now()
       FROM stay_room r WHERE bk.id=$1 AND bk.room_id=r.id AND r.place_id=$2 AND bk.deleted_at IS NULL
       RETURNING r.stay_unit_id`, [b.converted_block_id, acc.place_id]);
  if (blk) await refreshUnitVacancy(blk.stay_unit_id);
  await q(`UPDATE stay_booking_request SET status='no_show', updated_at=now() WHERE id=$1 AND place_id=$2`, [leadId, acc.place_id]);
  revalidatePath('/merchant/bookings'); revalidatePath('/merchant/units', 'layout'); revalidatePath('/merchant');
  redirect('/merchant/bookings?ok=noshow');
}

/** Set a viewing appointment date+time on a lead (status → scheduled). The renter sees it in คำขอของฉัน. */
export async function scheduleLeadAction(leadId: string, formData: FormData) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  const whenRaw = s(formData, 'scheduled_at');                                        // datetime-local 'YYYY-MM-DDTHH:MM'
  const when = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(whenRaw) ? whenRaw : null;
  await q(`UPDATE stay_booking_request SET status='scheduled', scheduled_at=$3, updated_at=now() WHERE id=$1 AND place_id=$2 AND deleted_at IS NULL`, [leadId, acc.place_id, when]);
  revalidatePath('/merchant/bookings'); revalidatePath('/merchant');
  redirect('/merchant/bookings?ok=scheduled');
}

/** Cancel a CONVERTED booking symmetrically (guest cancelled / owner voided). Releases the held room and
 *  marks the booking 'cancelled'. Daily + monthly-managed: cancel the linked block (and clear the room's
 *  board flag for a tenancy). Unmanaged monthly (no block): restore the vacancy counter. No money. */
export async function cancelBookingAction(leadId: string) {
  const acc = await currentAccount();
  requireCap(acc, 'manages_stay');
  const [b] = await q<{ rental_mode: string; converted_block_id: string | null; stay_unit_id: string | null }>(
    `SELECT rental_mode, converted_block_id, stay_unit_id FROM stay_booking_request WHERE id=$1 AND place_id=$2 AND status='converted' AND deleted_at IS NULL`, [leadId, acc.place_id]);
  if (!b) redirect('/merchant/bookings');
  if (b.converted_block_id) {
    // block-backed (daily 'stay' or monthly 'tenancy'): cancel it; for a tenancy also free the room flag.
    const [blk] = await q<{ room_id: string; block_kind: string; stay_unit_id: string | null }>(
      `UPDATE stay_occupancy_block bk SET status='cancelled', deleted_at=now(), updated_at=now()
         FROM stay_room r WHERE bk.id=$1 AND bk.room_id=r.id AND r.place_id=$2 AND bk.deleted_at IS NULL
         RETURNING bk.room_id, bk.block_kind, r.stay_unit_id`, [b.converted_block_id, acc.place_id]);
    if (blk?.block_kind === 'tenancy') {
      await q(`UPDATE stay_room SET occupancy_status='vacant', note=NULL, occupied_until=NULL, updated_at=now() WHERE id=$1 AND place_id=$2`, [blk.room_id, acc.place_id]);
    }
    if (blk) await refreshUnitVacancy(blk.stay_unit_id);
  } else if (b.rental_mode === 'monthly' && b.stay_unit_id) {
    // unmanaged monthly (vacancy counter, no block): give the unit back. Managed-legacy monthly without a
    // block can't be traced to a room here → just mark cancelled; the owner frees the room on the board.
    await q(`UPDATE stay_units SET available_units=available_units+1, availability_updated_at=now(), updated_at=now()
               WHERE id=$1 AND place_id=$2 AND managed=false`, [b.stay_unit_id, acc.place_id]);
    await refreshUnitVacancy(b.stay_unit_id);
  }
  await q(`UPDATE stay_booking_request SET status='cancelled', updated_at=now() WHERE id=$1 AND place_id=$2`, [leadId, acc.place_id]);
  revalidatePath('/merchant/bookings'); revalidatePath('/merchant/units', 'layout'); revalidatePath('/merchant');
  redirect('/merchant/bookings?ok=cancelled');
}

/** Walk-in / phone booking the owner creates directly (not from a consumer lead). Picks the chosen room or
 *  auto-assigns the first free room of the type for the dates, writes the occupancy block (stay/tenancy) +
 *  a converted walk-in booking row (incl. party_size + room_id). Managed listings only — it needs a real
 *  room to hold. Block FIRST (GiST EXCLUDE = double-book authority). No money. */
export async function createBookingAction(formData: FormData) {
  const acc = await currentAccount();
  requireCap(acc, 'manages_stay');
  const unitId = s(formData, 'stay_unit_id');
  const roomIdIn = s(formData, 'room_id');
  const from = s(formData, 'start_date');
  if (!UUID_RE.test(unitId) || !isDate(from)) redirect('/merchant/bookings/new?error=input');
  const [su] = await q<{ rental_mode: string | null; managed: boolean }>(`SELECT rental_mode, managed FROM stay_units WHERE id=$1 AND place_id=$2 AND deleted_at IS NULL`, [unitId, acc.place_id]);
  if (!su || !su.managed) redirect('/merchant/bookings/new?error=input');
  const monthly = su.rental_mode === 'monthly';
  const months = Math.max(1, Math.min(36, Number(s(formData, 'months')) || 1));
  // end date as a concrete string for both modes (monthly = from + N months, bounded; computed in pg to avoid TZ drift)
  let end: string;
  if (monthly) {
    const [d] = await q<{ d: string }>(`SELECT to_char(($1::date + ($2 || ' months')::interval)::date,'YYYY-MM-DD') d`, [from, String(months)]);
    end = d.d;
  } else {
    const toRaw = s(formData, 'end_date');
    if (!isDate(toRaw) || toRaw <= from) redirect('/merchant/bookings/new?error=date');
    end = toRaw;
  }
  // resolve room: explicit (must belong to the type) else auto-pick the first room free for the span
  let roomId: string | null = null;
  if (UUID_RE.test(roomIdIn)) {
    const [r] = await q<{ id: string }>(`SELECT id FROM stay_room WHERE id=$1 AND stay_unit_id=$2 AND place_id=$3 AND status='active' AND deleted_at IS NULL`, [roomIdIn, unitId, acc.place_id]);
    if (r) roomId = r.id;
  }
  if (!roomId) {
    const [r] = await q<{ id: string }>(
      `SELECT r.id FROM stay_room r WHERE r.stay_unit_id=$1 AND r.status='active' AND r.deleted_at IS NULL
          AND NOT EXISTS (SELECT 1 FROM stay_occupancy_block bk WHERE bk.room_id=r.id AND bk.status='active' AND bk.deleted_at IS NULL
            AND bk.block_kind IN ('stay','tenancy','maintenance') AND bk.span && daterange($2::date,$3::date,'[)'))
        ORDER BY r.code LIMIT 1`, [unitId, from, end]);
    if (!r) redirect('/merchant/bookings/new?error=full');
    roomId = r.id;
  }
  const name = s(formData, 'guest_name').slice(0, 80);
  const phone = s(formData, 'guest_phone').slice(0, 40);
  const partyRaw = Number(s(formData, 'party_size'));
  const party = Number.isFinite(partyRaw) && partyRaw > 0 ? Math.min(50, Math.round(partyRaw)) : null;
  const note = name ? `${monthly ? 'เข้าอยู่' : 'จอง'}ที่เคาน์เตอร์: ${name}` : (monthly ? 'เข้าอยู่ walk-in' : 'จอง walk-in');
  // optional money taken at the counter — recorded as already-verified (no slip), so it counts in revenue
  const amountMinor = bahtToMinor(s(formData, 'amount'));
  const paidNow = amountMinor != null && amountMinor > 0;
  let blockId: string;
  try {
    const [blk] = await q<{ id: string }>(
      `INSERT INTO stay_occupancy_block(room_id, place_id, block_kind, start_date, end_date, note) VALUES($1,$2,$3,$4,$5,$6) RETURNING id`,
      [roomId, acc.place_id, monthly ? 'tenancy' : 'stay', from, end, note]);
    blockId = blk.id;
  } catch (e: any) {
    if (e?.code === '23P01') redirect('/merchant/bookings/new?error=full');
    throw e;
  }
  if (monthly) await q(`UPDATE stay_room SET occupancy_status='occupied', occupied_until=$3, note=$4, updated_at=now() WHERE id=$1 AND place_id=$2`, [roomId, acc.place_id, end, note]);
  await q(
    `INSERT INTO stay_booking_request(place_id, stay_unit_id, room_id, request_kind, rental_mode, desired_from, desired_to, desired_months, party_size, contact_name, contact_phone, channel, status, converted_block_id, expires_at,
        amount_minor, paid_minor, payment_method, paid_at, payment_status)
     VALUES($1,$2,$3,'booking',$4,$5,$6,$7,$8,$9,$10,'walk_in','converted',$11, now() + interval '60 days',
        $12,$12,$13, CASE WHEN $12 IS NOT NULL THEN now() END, $14)`,
    [acc.place_id, unitId, roomId, su.rental_mode, from, monthly ? null : end, monthly ? months : null, party, name || null, phone || null, blockId,
     paidNow ? amountMinor : null, paidNow ? 'cash' : null, paidNow ? 'verified' : 'none']);
  await refreshUnitVacancy(unitId);
  revalidatePath('/merchant/bookings'); revalidatePath('/merchant/units', 'layout'); revalidatePath('/merchant');
  redirect('/merchant/bookings?ok=created');
}

/** Check in a converted booking — stamp the arrival + write a check_in event against the held room.
 *  Source of truth = the timestamp (no new status), so the loop closes without a status-vocabulary change. */
export async function checkInAction(leadId: string, formData?: FormData) {
  const acc = await currentAccount();
  requireCap(acc, 'manages_stay');
  const [b] = await q<{ converted_block_id: string | null; checked_in_at: any }>(
    `SELECT converted_block_id, checked_in_at FROM stay_booking_request WHERE id=$1 AND place_id=$2 AND status='converted' AND deleted_at IS NULL`, [leadId, acc.place_id]);
  if (!b || !b.converted_block_id || b.checked_in_at) redirect('/merchant/bookings');
  const [blk] = await q<{ room_id: string }>(
    `SELECT bk.room_id FROM stay_occupancy_block bk JOIN stay_room r ON r.id=bk.room_id WHERE bk.id=$1 AND r.place_id=$2 AND bk.deleted_at IS NULL`, [b.converted_block_id, acc.place_id]);
  await q(`UPDATE stay_booking_request SET checked_in_at=now(), updated_at=now() WHERE id=$1 AND place_id=$2`, [leadId, acc.place_id]);
  if (blk) await q(`INSERT INTO stay_room_event(room_id, block_id, place_id, event_kind) VALUES($1,$2,$3,'check_in')`, [blk.room_id, b.converted_block_id, acc.place_id]);
  revalidatePath('/merchant/bookings'); revalidatePath('/merchant/units', 'layout'); revalidatePath('/merchant');
  const back = formData?.get('returnTo') as string | null;
  redirect(back || '/merchant/bookings?ok=checkin');
}

/** Check out a converted booking — stamp the departure, write a check_out event, complete the block (so the
 *  date frees for rebooking) and free the room. Tenancy (monthly) also clears the board flag. No money. */
export async function checkOutAction(leadId: string, formData?: FormData) {
  const acc = await currentAccount();
  requireCap(acc, 'manages_stay');
  const [b] = await q<{ converted_block_id: string | null; checked_out_at: any }>(
    `SELECT converted_block_id, checked_out_at FROM stay_booking_request WHERE id=$1 AND place_id=$2 AND status='converted' AND deleted_at IS NULL`, [leadId, acc.place_id]);
  if (!b || !b.converted_block_id || b.checked_out_at) redirect('/merchant/bookings');
  await q(`UPDATE stay_booking_request SET checked_out_at=now(), updated_at=now() WHERE id=$1 AND place_id=$2`, [leadId, acc.place_id]);
  const [blk] = await q<{ room_id: string; block_kind: string; stay_unit_id: string | null }>(
    `UPDATE stay_occupancy_block bk SET status='completed', updated_at=now()
       FROM stay_room r WHERE bk.id=$1 AND bk.room_id=r.id AND r.place_id=$2 AND bk.deleted_at IS NULL
       RETURNING bk.room_id, bk.block_kind, r.stay_unit_id`, [b.converted_block_id, acc.place_id]);
  if (blk) {
    await q(`INSERT INTO stay_room_event(room_id, block_id, place_id, event_kind) VALUES($1,$2,$3,'check_out')`, [blk.room_id, b.converted_block_id, acc.place_id]);
    if (blk.block_kind === 'tenancy') await q(`UPDATE stay_room SET occupancy_status='vacant', note=NULL, occupied_until=NULL, updated_at=now() WHERE id=$1 AND place_id=$2`, [blk.room_id, acc.place_id]);
    await refreshUnitVacancy(blk.stay_unit_id);
  }
  revalidatePath('/merchant/bookings'); revalidatePath('/merchant/units', 'layout'); revalidatePath('/merchant');
  const back = formData?.get('returnTo') as string | null;
  redirect(back || '/merchant/bookings?ok=checkout');
}

// ── seasonal pricing (0035): DISPLAY-only rates per room-TYPE, by season window. NEVER joined to the
//    ledger / coin_lots — these are numbers SHOWN to customers, no payment. A season is place-level;
//    a rate overrides a type's base price (stay_units.price_minor) for that window. Place-scoped. ──
function requireStayOwner(acc: any) {
  if (!acc?.place_id) redirect('/merchant/login');
  if (!acc.offers_stay && !acc.manages_stay) redirect('/merchant');
}

export async function createSeasonAction(formData: FormData) {
  const acc = await currentAccount();
  requireStayOwner(acc);
  const label = s(formData, 'label');
  const from = s(formData, 'start_date'); const to = s(formData, 'end_date');
  if (!label) redirect('/merchant/pricing?error=label');
  if (!isDate(from) || !isDate(to)) redirect('/merchant/pricing?error=date');
  const recurs = formData.get('recurs_yearly') != null;
  await q(`INSERT INTO stay_season(place_id, label_i18n, start_date, end_date, recurs_yearly)
           VALUES($1, jsonb_build_object('th',$2::text), $3, $4, $5)`, [acc.place_id, label, from, to, recurs]);
  revalidatePath('/merchant/pricing');
  redirect('/merchant/pricing?ok=season');
}

export async function deleteSeasonAction(seasonId: string) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  // soft-delete the season AND any rates that referenced it (both place-scoped)
  await q(`UPDATE stay_season SET deleted_at=now(), updated_at=now() WHERE id=$1 AND place_id=$2 AND deleted_at IS NULL`, [seasonId, acc.place_id]);
  await q(`UPDATE stay_rate   SET deleted_at=now(), updated_at=now() WHERE season_id=$1 AND place_id=$2 AND deleted_at IS NULL`, [seasonId, acc.place_id]);
  revalidatePath('/merchant/pricing');
  redirect('/merchant/pricing?ok=season_deleted');
}

export async function createRateAction(formData: FormData) {
  const acc = await currentAccount();
  requireStayOwner(acc);
  const wantUnit = s(formData, 'stay_unit_id');
  const [su] = UUID_RE.test(wantUnit)
    ? await q<{ id: string; rental_mode: string }>(`SELECT id, rental_mode FROM stay_units WHERE id=$1 AND place_id=$2 AND deleted_at IS NULL`, [wantUnit, acc.place_id])
    : [];
  if (!su) redirect('/merchant/pricing?error=unit');
  const priceMinor = bahtToMinor(s(formData, 'price'));
  if (priceMinor == null) redirect('/merchant/pricing?error=price');
  const period = su.rental_mode === 'monthly' ? 'month' : 'night';
  // prefer a named season; only fall back to an ad-hoc window when no (owned) season is chosen
  const wantSeason = s(formData, 'season_id');
  let okSeason: string | null = null;
  if (UUID_RE.test(wantSeason)) {
    const [se] = await q<{ id: string }>(`SELECT id FROM stay_season WHERE id=$1 AND place_id=$2 AND deleted_at IS NULL`, [wantSeason, acc.place_id]);
    okSeason = se?.id ?? null;
  }
  const from = s(formData, 'start_date'); const to = s(formData, 'end_date');
  const adFrom = !okSeason && isDate(from) ? from : null;
  const adTo = !okSeason && isDate(to) ? to : null;
  await q(`INSERT INTO stay_rate(stay_unit_id, season_id, place_id, start_date, end_date, price_minor, price_period)
           VALUES($1,$2,$3,$4,$5,$6,$7)`, [su.id, okSeason, acc.place_id, adFrom, adTo, priceMinor, period]);
  revalidatePath('/merchant/pricing');
  redirect('/merchant/pricing?ok=rate');
}

export async function deleteRateAction(rateId: string) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  await q(`UPDATE stay_rate SET deleted_at=now(), updated_at=now() WHERE id=$1 AND place_id=$2 AND deleted_at IS NULL`, [rateId, acc.place_id]);
  revalidatePath('/merchant/pricing');
  redirect('/merchant/pricing?ok=rate_deleted');
}

/** Save where this place RECEIVES money for online bookings (host-direct slip model — the platform never
 *  holds funds). Online booking can only be enabled once there's at least one receiving channel. No money
 *  is processed here; this is just the account the guest transfers to + uploads a slip against. */
export async function updateStayPaymentAction(formData: FormData) {
  const acc = await currentAccount();
  requireStayOwner(acc);
  const promptpay = s(formData, 'pay_promptpay').slice(0, 40) || null;
  const bank = s(formData, 'pay_bank').slice(0, 60) || null;
  const accNo = s(formData, 'pay_account_no').slice(0, 40) || null;
  const accName = s(formData, 'pay_account_name').slice(0, 120) || null;
  const hasChannel = !!(promptpay || (bank && accNo));
  const enabled = !!formData.get('pay_online_enabled') && hasChannel;
  const depositPct = Math.max(0, Math.min(90, parseInt(s(formData, 'pay_deposit_pct') || '0', 10) || 0));
  await q(`UPDATE places SET pay_promptpay=$2, pay_bank=$3, pay_account_no=$4, pay_account_name=$5, pay_online_enabled=$6, pay_deposit_pct=$7 WHERE id=$1`,
    [acc.place_id, promptpay, bank, accNo, accName, enabled, depositPct]);
  revalidatePath('/merchant/pricing');
  redirect(`/merchant/pricing?ok=pay${!enabled && !!formData.get('pay_online_enabled') ? '&warn=nochannel' : ''}`);
}

/** Bulk-add rooms from a numeric run (floor "1", 1–10 → 101–110) OR a free-typed list ("101, 102, A1" for
 *  non-sequential / named units) — the fast way to lay out a dorm. Existing codes are skipped + reported. */
export async function createRoomsBulkAction(formData: FormData) {
  const acc = await currentAccount();
  requireCap(acc, 'manages_stay');
  const floor = s(formData, 'floor') || null;
  // Codes come EITHER from a free-typed list ("101, 102, A1" — non-sequential / named) OR a numeric range
  // (start–end). A non-empty list wins. Both dedupe + cap at 200/run; existing codes are skipped + reported.
  const listRaw = s(formData, 'codes').trim();
  let codes: string[];
  if (listRaw) {
    codes = [...new Set(
      listRaw.split(/[\s,]+/).map((x) => x.replace(/[^\p{L}\p{N}\-_]/gu, '').slice(0, 24)).filter(Boolean),
    )].slice(0, 200);
    if (!codes.length) redirect('/merchant/units/new?error=range');
  } else {
    const prefix = s(formData, 'prefix').replace(/[^\p{L}\p{N}\-_ ]/gu, '').trim();
    const start = parseInt(s(formData, 'start'), 10);
    const end = parseInt(s(formData, 'end'), 10);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || end - start > 199) redirect('/merchant/units/new?error=range');
    // an explicit prefix wins; else a numeric floor keeps the dorm convention (floor 1 → 101–110, zero-padded),
    // while a named group (โซน "ริมน้ำ") prefixes its own name unpadded ("ริมน้ำ1").
    const floorIsNum = !!floor && /^\d+$/.test(floor);
    const base = prefix || floor || '';
    const pad = (!prefix && floorIsNum) ? 2 : 0;
    codes = [];
    for (let n = start; n <= end; n++) codes.push(`${base}${pad ? String(n).padStart(pad, '0') : n}`);
  }
  const wantUnit = s(formData, 'stay_unit_id');
  let okUnit: string | null = null;
  if (UUID_RE.test(wantUnit)) {
    const [u] = await q<{ id: string }>(`SELECT id FROM stay_units WHERE id=$1 AND place_id=$2 AND deleted_at IS NULL`, [wantUnit, acc.place_id]);
    okUnit = u?.id ?? null;
  }
  const capV = s(formData, 'capacity');
  const capacity = capV && Number.isFinite(Number(capV)) ? Math.max(0, Math.trunc(Number(capV))) : null;   // applied to every room in the run
  const status = ROOM_STATUS.includes(s(formData, 'occupancy_status')) ? s(formData, 'occupancy_status') : 'vacant';
  const occUntil = (status === 'occupied' || status === 'reserved') && isDate(s(formData, 'occupied_until')) ? s(formData, 'occupied_until') : null;
  const kind = s(formData, 'room_kind') === 'bed' ? 'bed' : 'room';   // dorm/hostel beds (flat leaves; each counts as one vacancy)
  // RETURNING the codes actually inserted → existing codes are skipped by ON CONFLICT and reported back,
  // so the owner never thinks all N were added when some already existed (silent-skip trap).
  const made = await q<{ code: string }>(
    `INSERT INTO stay_room(place_id, stay_unit_id, code, floor, room_kind, capacity, occupancy_status, occupied_until)
       SELECT $1, $2, c, $4, $8, $5, $6, $7 FROM unnest($3::text[]) c
     ON CONFLICT (place_id, code) WHERE deleted_at IS NULL DO NOTHING
     RETURNING code`,
    [acc.place_id, okUnit, codes, floor, capacity, status, occUntil, kind]);
  const added = made.length;
  const skipped = codes.length - added;
  // a type that just gained real rooms is auto-managed — promote BEFORE refresh (refreshUnitVacancy no-ops if managed=false)
  if (okUnit && added > 0) await q(`UPDATE stay_units SET managed=true, updated_at=now() WHERE id=$1 AND place_id=$2 AND deleted_at IS NULL AND NOT managed`, [okUnit, acc.place_id]);
  await refreshUnitVacancy(okUnit);
  revalidatePath('/merchant/units'); revalidatePath('/merchant');
  redirect(`/merchant/units?ok=bulk&added=${added}&skipped=${skipped}`);
}

/** Set how this property labels its room groups (ชั้น / โซน / อาคาร / ตึก). Board headers + add-room
 *  form adapt — a dorm groups by floor, a resort by zone. The per-room value stays in stay_room.floor. */
export async function setRoomGroupTermAction(formData: FormData) {
  const acc = await currentAccount();
  requireCap(acc, 'manages_stay');
  // accept a preset OR a custom word ("ปีก", "บ้าน", "ตึก A") — owners group however their property is
  // laid out, not just by floor. Keep letters/numbers/space only, ≤16 chars; fall back to ชั้น.
  const raw = (s(formData, 'term_custom') || s(formData, 'term')).replace(/[^\p{L}\p{N} ]/gu, '').trim().slice(0, 16);
  const term = raw || 'ชั้น';
  await q(`UPDATE places SET room_group_term=$2, updated_at=now() WHERE id=$1`, [acc.place_id, term]);
  revalidatePath('/merchant/units', 'layout');
}
