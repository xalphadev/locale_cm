'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { q, withTx, DEMO_AGENT, DEMO_ADMIN } from '@/lib/db';
import { hashPassword, verifyPassword, setSession, clearSession, currentAccount } from '@/lib/auth';

// Nimman center — default shop location at signup (the merchant can't drop a pin in the MVP form).
const NIMMAN = { lng: 98.967, lat: 18.796 };
// Shop-type → (category, subcategory) for the platform taxonomy.
const SHOP_TYPES: Record<string, { category: string; subcategory: string; stay?: boolean }> = {
  cafe: { category: 'eat', subcategory: 'cafe' },
  restaurant: { category: 'eat', subcategory: 'restaurant' },
  street_food: { category: 'eat', subcategory: 'street_food' },
  dessert: { category: 'eat', subcategory: 'dessert' },
  market: { category: 'see', subcategory: 'market' },
  shop: { category: 'see', subcategory: 'shop' },
  // accommodations — picking one of these auto-flags places.offers_stay + stay_kind
  dorm: { category: 'see', subcategory: 'dorm', stay: true },
  apartment: { category: 'see', subcategory: 'apartment', stay: true },
  homestay: { category: 'see', subcategory: 'homestay', stay: true },
  hotel: { category: 'see', subcategory: 'hotel', stay: true },
  guesthouse: { category: 'see', subcategory: 'guesthouse', stay: true },
};
const s = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();

/** Self-service signup → creates the shop (published via fn_create_place) + the login account, then logs in. */
export async function signupAction(formData: FormData) {
  const email = s(formData, 'email').toLowerCase();
  const pw = s(formData, 'password');
  const shopName = s(formData, 'shop_name');
  const phone = s(formData, 'phone');
  const lineId = s(formData, 'line_id');
  const type = SHOP_TYPES[s(formData, 'shop_type')] ? s(formData, 'shop_type') : 'cafe';
  const sells = !!formData.get('sells_products');
  const err = (m: string) => redirect(`/merchant/signup?error=${encodeURIComponent(m)}`);

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) err('อีเมลไม่ถูกต้อง');
  if (pw.length < 8) err('รหัสผ่านอย่างน้อย 8 ตัวอักษร');
  if (!shopName) err('กรุณากรอกชื่อร้าน');

  const [city] = await q<{ id: string }>(`SELECT id FROM cities WHERE code='CNX'`);
  if (!city) err('ระบบยังไม่พร้อมในเมืองนี้ กรุณาติดต่อทีมงาน');
  const [dist] = await q<{ id: string }>(`SELECT id FROM districts WHERE slug='nimman'`);
  const { category, subcategory, stay: isStay } = SHOP_TYPES[type];

  // Create as DRAFT — the shop is fully manageable in the portal immediately, but only goes
  // public to customers after staff review (apps/web /shops). This avoids anonymous signups
  // pushing live spam venues onto the consumer surfaces.
  const payload = {
    name_i18n: { th: shopName },
    category, subcategory, status: 'draft',
    lng: NIMMAN.lng, lat: NIMMAN.lat,
    ...(phone ? { phone } : {}),
    ...(lineId ? { line_id: lineId } : {}),
  };

  // Atomic: place-create + flags + account INSERT in one transaction so a failed signup (e.g. the
  // email-unique race) never leaves an orphaned place behind. fn_create_place is the portable,
  // SoD-guarded place writer (geo + freshness + history).
  let accId = '';
  try {
    accId = await withTx(async (c) => {
      const pl = (await c.query<{ id: string }>(
        `SELECT fn_create_place($1::jsonb, $2, $3, $4, $5) id`,
        [JSON.stringify(payload), city.id, dist?.id ?? null, DEMO_AGENT, DEMO_ADMIN])).rows[0];
      await c.query(`UPDATE places SET sells_products=$2, offers_stay=$3, stay_kind=$4, source='merchant' WHERE id=$1`,
        [pl.id, sells, !!isStay, isStay ? subcategory : null]);
      const acc = (await c.query<{ id: string }>(
        `INSERT INTO merchant_accounts(email, password_hash, display_name, phone, place_id)
         VALUES($1,$2,$3,$4,$5) RETURNING id`,
        [email, hashPassword(pw), shopName, phone || null, pl.id])).rows[0];
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
  const [acc] = await q<any>(`SELECT id, password_hash FROM merchant_accounts WHERE email=$1 AND status='active'`, [email]);
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
  if (!acc?.place_id) redirect('/merchant/login');
  const nameTh = s(formData, 'name_th');
  if (!nameTh) redirect('/merchant/products?error=name');
  const subtype = s(formData, 'subtype') || 'other';
  const priceRaw = s(formData, 'price'); // whole baht
  const priceMinor = priceRaw && !isNaN(Number(priceRaw)) ? Math.max(0, Math.round(Number(priceRaw) * 100)) : null;
  const unit = s(formData, 'price_unit') || null;
  const urls = s(formData, 'image_urls').split(/[\n,]/).map((u) => u.trim()).filter((u) => /^https?:\/\//.test(u));
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
  if (!acc?.place_id) redirect('/merchant/login');
  if (flag === 'hide') await q(`UPDATE shop_products SET status='hidden', updated_at=now() WHERE id=$1 AND place_id=$2`, [productId, acc.place_id]);
  else if (flag === 'show') await q(`UPDATE shop_products SET status='published', updated_at=now() WHERE id=$1 AND place_id=$2`, [productId, acc.place_id]);
  else if (['sold_out', 'in_season', 'available_today'].includes(flag))
    await q(`UPDATE shop_products SET ${flag} = NOT ${flag}, updated_at=now() WHERE id=$1 AND place_id=$2`, [productId, acc.place_id]);
  revalidatePath('/merchant/products');
}

export async function deleteProductAction(productId: string) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  await q(`DELETE FROM shop_products WHERE id=$1 AND place_id=$2`, [productId, acc.place_id]);
  revalidatePath('/merchant/products');
}

export async function createMerchantPostAction(formData: FormData) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  const body = s(formData, 'body').slice(0, 500);
  if (!body) redirect('/merchant/post?error=body');
  const n = Math.min(4, Math.max(1, Number(formData.get('image_count')) || 1));
  const urls = s(formData, 'image_urls').split(/[\n,]/).map((u) => u.trim()).filter((u) => /^https?:\/\//.test(u));
  await q(
    `INSERT INTO feed_posts(place_id, body_i18n, image_count, image_urls, status, author_kind)
     VALUES($1, jsonb_build_object('th',$2::text), $3, $4, 'published', 'merchant')`,
    [acc.place_id, body, urls.length || n, urls.length ? urls : null]);
  revalidatePath('/merchant/post');
  redirect('/merchant/post?ok=1');
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
  revalidatePath('/merchant/shop'); revalidatePath('/merchant');
  redirect('/merchant/shop?ok=1');
}

// ── stay units (rooms) — same tenancy discipline as products (place_id from session, never form) ──

export async function createStayUnitAction(formData: FormData) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  const nameTh = s(formData, 'name_th');
  if (!nameTh) redirect('/merchant/rooms?error=name');
  const mode = s(formData, 'rental_mode') === 'daily' ? 'daily' : 'monthly';
  const period = mode === 'daily' ? 'night' : 'month';
  const num = (k: string) => { const v = s(formData, k); return v !== '' && !isNaN(Number(v)) ? Number(v) : null; };
  const priceMinor = num('price') != null ? Math.max(0, Math.round(num('price')! * 100)) : null;
  const depositMinor = num('deposit') != null ? Math.max(0, Math.round(num('deposit')! * 100)) : null;
  const availUnits = mode === 'monthly' ? Math.max(0, Math.round(num('available_units') ?? 0)) : 0;
  const dailyStatus = mode === 'daily' && ['vacant', 'full', 'ask'].includes(s(formData, 'daily_status')) ? s(formData, 'daily_status') : 'ask';
  const furnished = ['furnished', 'partial', 'unfurnished'].includes(s(formData, 'furnished')) ? s(formData, 'furnished') : null;
  const bills = formData.getAll('bills').map(String).filter(Boolean);
  const amen = formData.getAll('amenity').map(String).filter(Boolean);
  const urls = s(formData, 'image_urls').split(/[\n,]/).map((u) => u.trim()).filter((u) => /^https?:\/\//.test(u));
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
  if (!acc?.place_id) redirect('/merchant/login');
  await q(`UPDATE stay_units SET available_units=GREATEST(0, available_units + $3), availability_updated_at=now(), updated_at=now()
           WHERE id=$1 AND place_id=$2`, [unitId, acc.place_id, delta]);
  revalidatePath('/merchant/rooms');
}

/** Cycle daily availability vacant→full→ask→vacant, or hide/show — restamps freshness on cycle. */
export async function setStayUnitFlagAction(unitId: string, flag: string) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  if (flag === 'hide') await q(`UPDATE stay_units SET status='hidden', updated_at=now() WHERE id=$1 AND place_id=$2`, [unitId, acc.place_id]);
  else if (flag === 'show') await q(`UPDATE stay_units SET status='published', updated_at=now() WHERE id=$1 AND place_id=$2`, [unitId, acc.place_id]);
  else if (flag === 'cycle_daily')
    await q(`UPDATE stay_units SET daily_status = CASE daily_status WHEN 'vacant' THEN 'full' WHEN 'full' THEN 'ask' ELSE 'vacant' END,
               availability_updated_at=now(), updated_at=now() WHERE id=$1 AND place_id=$2`, [unitId, acc.place_id]);
  revalidatePath('/merchant/rooms');
}

export async function deleteStayUnitAction(unitId: string) {
  const acc = await currentAccount();
  if (!acc?.place_id) redirect('/merchant/login');
  await q(`DELETE FROM stay_units WHERE id=$1 AND place_id=$2`, [unitId, acc.place_id]);
  revalidatePath('/merchant/rooms');
}
