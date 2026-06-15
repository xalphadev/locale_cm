// Seed 20 REAL merchant shops (each = a merchant_account login + a place + its own products/
// rooms/feed/reviews), varied by type. Clears the prior demo shop/stay/product content and
// HIDES the old agent_seed venues (is_visible=false) so the customer side shows only these 20 —
// without deleting places (the money-plane check_ins/redemptions/tasks + quests FK them).
//
// Run:  cd apps/web && DATABASE_URL=postgres://postgres@127.0.0.1:54400/soihop node ../../db/test/seed-shops.mjs
// All accounts log in with password:  soihop1234
import { createRequire } from 'module';
import crypto from 'crypto';
// resolve 'pg' from apps/web's node_modules (this script lives in db/test/ which has none)
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const pg = require('pg');

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || 'postgres://postgres@127.0.0.1:54400/soihop' });
const q = (t, p = []) => pool.query(t, p).then((r) => r.rows);
const AGENT = '00000000-0000-4000-8000-00000000a6e7', ADMIN = '00000000-0000-4000-8000-00000000ad11';
const hashPw = (pw) => { const s = crypto.randomBytes(16); return `scrypt:${s.toString('hex')}:${crypto.scryptSync(pw, s, 64).toString('hex')}`; };

const HRS_CAFE = { mon: '07:00-18:00', tue: '07:00-18:00', wed: '07:00-18:00', thu: '07:00-18:00', fri: '07:00-19:00', sat: '08:00-19:00', sun: '08:00-18:00' };
const HRS_RES = { mon: '11:00-21:00', tue: '11:00-21:00', wed: '11:00-21:00', thu: '11:00-21:00', fri: '11:00-22:00', sat: '11:00-22:00', sun: '11:00-21:00' };
const HRS_24 = { mon: '00:00-23:59', tue: '00:00-23:59', wed: '00:00-23:59', thu: '00:00-23:59', fri: '00:00-23:59', sat: '00:00-23:59', sun: '00:00-23:59' };

const PROD = {
  cafe: [['เมล็ดกาแฟคั่ว 250 ก.', 'grocery', 32000, 'bag'], ['ดริปแบ็ก 10 ซอง', 'grocery', 18000, 'box'], ['คุกกี้เนยสด', 'bakery', 6000, 'piece']],
  restaurant: [['ข้าวซอยไก่', 'menu_item', 6900, null], ['แกงฮังเลหมู', 'menu_item', 12000, null], ['น้ำพริกอ่อง ชุดผักสด', 'menu_item', 9000, null]],
  dessert: [['ครัวซองต์เนยฝรั่งเศส', 'bakery', 6500, 'piece'], ['ชีสเค้กญี่ปุ่น', 'bakery', 9500, 'piece'], ['มาการอง 6 ชิ้น', 'bakery', 15000, 'box']],
  produce: [['มะม่วงน้ำดอกไม้สุก', 'fruit', 8000, 'kg', true], ['ผักสลัดออร์แกนิก', 'vegetable', 4500, 'bag', true], ['ลำไยอีดอสด', 'fruit', 6000, 'kg', true], ['ไข่ไก่อารมณ์ดี 10 ฟอง', 'grocery', 6500, 'box']],
};
const ROOMS = {
  monthly: (base) => [
    ['สตูดิโอ พัดลม', 'monthly', base, 'month', 3, 'ask', 1, base, 3, 20, 'partial', ['water'], ['private_bath', 'balcony']],
    ['สตูดิโอ แอร์', 'monthly', Math.round(base * 1.5), 'month', 2, 'ask', 1, Math.round(base * 1.5), 3, 26, 'furnished', ['water', 'wifi'], ['aircon', 'private_bath', 'balcony', 'fiber_wifi']],
    ['1 ห้องนอน', 'monthly', Math.round(base * 2.2), 'month', 1, 'ask', 2, Math.round(base * 2.2), 6, 35, 'furnished', ['wifi', 'common_fee'], ['aircon', 'private_bath', 'kitchen', 'washing_machine', 'parking', 'fiber_wifi']],
  ],
  daily: (base) => [
    ['ห้องเตียงคู่ วิวสวน', 'daily', base, 'night', 0, 'vacant', 2, null, 1, 22, 'furnished', [], ['aircon', 'private_bath', 'balcony', 'fiber_wifi']],
    ['ห้องครอบครัว', 'daily', Math.round(base * 1.7), 'night', 0, 'vacant', 4, null, 1, 34, 'furnished', [], ['aircon', 'private_bath', 'kitchen']],
  ],
};
const REV = {
  eat: [[5, 'อร่อยมาก บรรยากาศดี กลับมาอีกแน่นอน'], [4, 'รสชาติโอเค ราคาเป็นมิตร'], [5, 'พนักงานน่ารัก ที่จอดรถสะดวก'], [4, 'ของอร่อย แต่คนเยอะช่วงเย็น'], [5, 'ประทับใจ เมนูเด็ดต้องลอง']],
  see: [[5, 'ที่พักสะอาด เจ้าของใจดี'], [4, 'ทำเลดี เดินไปคาเฟ่ได้'], [5, 'เงียบสงบ เหมาะพักผ่อน'], [4, 'ห้องโอเคตามราคา'], [5, 'คุ้มค่ามาก แนะนำเลย']],
};

// type → builder. cat/sub/flags/content.
function build(i, type, th, en, desc) {
  const lng = +(98.962 + (i % 5) * 0.0045).toFixed(5);
  const lat = +(18.792 + Math.floor(i / 5) * 0.004).toFixed(5);
  const base = { i, th, en, desc, lng, lat, phone: `053-${(200 + i)}-${1000 + i * 7}`, line: `@soihop_shop${i}`, posts: [], nrev: 0, products: [], rooms: [] };
  const accomKinds = { dorm: 'monthly', apartment: 'monthly', condo: 'daily-no', homestay: 'daily', hotel: 'daily', guesthouse: 'daily' };
  if (type === 'cafe') return { ...base, cat: 'eat', sub: 'cafe', sells: true, hours: HRS_CAFE, amen: ['wifi', 'work_friendly', 'power_outlet', 'outdoor_seating'], price_band: '2', products: PROD.cafe, posts: ['เมล็ดกาแฟล็อตใหม่มาแล้ว วันนี้ดริปให้ลองฟรี ☕'], nrev: 4, rev: REV.eat };
  if (type === 'restaurant') return { ...base, cat: 'eat', sub: 'restaurant', sells: true, hours: HRS_RES, amen: ['thai_food', 'northern_food', 'parking', 'kid_friendly'], price_band: '2', products: PROD.restaurant, posts: ['เปิดเมนูใหม่ แกงฮังเลสูตรโบราณ!'], nrev: 5, rev: REV.eat };
  if (type === 'dessert') return { ...base, cat: 'eat', sub: 'dessert', sells: true, hours: HRS_CAFE, amen: ['aircon', 'kid_friendly', 'vegetarian'], price_band: '2', products: PROD.dessert, posts: ['เบเกอรี่อบใหม่ทุกเช้า 7 โมง'], nrev: 3, rev: REV.eat };
  if (type === 'produce') return { ...base, cat: 'see', sub: 'market', sells: true, hours: HRS_RES, amen: ['parking', 'local_crafts'], price_band: '1', products: PROD.produce, posts: ['ผลไม้ตามฤดูเข้าใหม่ทุกวัน สดจากสวน'], nrev: 2, rev: REV.eat };
  if (type === 'mixed') return { ...base, cat: 'eat', sub: 'cafe', sells: true, stay: true, kind: 'guesthouse', hours: HRS_CAFE, amen: ['wifi', 'work_friendly', 'outdoor_seating', 'parking'], price_band: '2', products: PROD.cafe, rooms: ROOMS.daily(85000), posts: ['คาเฟ่ + ที่พักในที่เดียว จองห้องทักไลน์ได้เลย'], nrev: 4, rev: REV.see };
  // accommodation kinds
  const mode = accomKinds[type] === 'monthly' ? 'monthly' : 'daily';
  const monthlyBase = { dorm: 350000, apartment: 600000, condo: 900000 };
  const dailyBase = { homestay: 89000, hotel: 180000, guesthouse: 55000 };
  const rooms = type === 'condo' ? ROOMS.monthly(900000)
    : mode === 'monthly' ? ROOMS.monthly(monthlyBase[type] || 400000)
      : ROOMS.daily(dailyBase[type] || 90000);
  return { ...base, cat: 'see', sub: type, stay: true, kind: type, hours: HRS_24, amen: ['parking', 'wheelchair'], price_band: '2', rooms, posts: ['มีห้องว่าง! สอบถามทักไลน์ได้เลย'], nrev: 3, rev: REV.see };
}

const SPEC = [
  ['cafe', 'บ้านกาแฟนิมมาน', 'Baan Coffee Nimman', 'คาเฟ่บ้านไม้อบอุ่น เมล็ดคั่วเอง นั่งทำงานได้ทั้งวัน'],
  ['cafe', 'ม่อนมุง คาเฟ่', 'Mon Mung Cafe', 'คาเฟ่วิวสวน บรรยากาศชิล กาแฟพิเศษจากดอยเหนือ'],
  ['cafe', 'สโลว์บาร์ ดอยช้าง', 'Slowbar Doi Chang', 'สโลว์บาร์เมล็ดดอยช้างแท้ ดริปมือทุกแก้ว'],
  ['cafe', 'คาเฟ่ใบไม้', 'Bai Mai Cafe', 'คาเฟ่ต้นไม้เยอะ มุมถ่ายรูปสวย ขนมโฮมเมด'],
  ['restaurant', 'ข้าวซอยลุงชาญ', 'Khao Soi Lung Chan', 'ข้าวซอยสูตรเด็ดเจ้าเก่า เปิดมา 30 ปี'],
  ['restaurant', 'ครัวเหนือนิมมาน', 'Krua Nuea Nimman', 'อาหารเหนือต้นตำรับ น้ำพริกอ่อง แกงฮังเล'],
  ['restaurant', 'ส้มตำนัวๆ', 'Somtam Nua', 'ส้มตำ ไก่ย่าง ข้าวเหนียว รสจัดจ้าน'],
  ['restaurant', 'ก๋วยเตี๋ยวเรือป้าน้อย', 'Boat Noodle Pa Noi', 'ก๋วยเตี๋ยวเรือน้ำตกเข้มข้น ลูกชิ้นเด้ง'],
  ['dessert', 'อบอุ่น เบเกอรี่', 'Op-Oun Bakery', 'เบเกอรี่อบใหม่ทุกวัน ครัวซองต์เนยฝรั่งเศส'],
  ['dessert', 'หวานเย็น ของหวาน', 'Wan Yen Dessert', 'ของหวานไทย-ฝรั่ง บิงซู เค้ก ชาไทย'],
  ['produce', 'ตลาดสดสวนผักแม่ริม', 'Mae Rim Fresh Market', 'ผักผลไม้ออร์แกนิกสดจากสวนแม่ริม ส่งทุกเช้า'],
  ['produce', 'ผลไม้ลุงเขียว', 'Lung Khiao Fruits', 'ผลไม้ตามฤดู คัดเกรด ราคาส่ง'],
  ['dorm', 'หอพักนิมมานเพลส', 'Nimman Place Dorm', 'หอพักเงียบสงบ เดิน 5 นาทีถึง มช.'],
  ['apartment', 'ดิ เออร์เบิน นิมมาน', 'The Urban Nimman', 'อพาร์ตเมนต์ใหม่ มีลิฟต์ ที่จอดรถ เครื่องซักผ้า'],
  ['condo', 'นิมมาน วัน คอนโด', 'Nimman One Condo', 'คอนโดใจกลางนิมมาน ฟิตเนส สระว่ายน้ำ รปภ.24 ชม.'],
  ['homestay', 'บ้านสวนโฮมสเตย์', 'Baan Suan Homestay', 'บ้านไม้ในสวน บรรยากาศล้านนา อาหารเช้าโฮมเมด'],
  ['hotel', 'นิมมาน แกรนด์ โฮเทล', 'Nimman Grand Hotel', 'โรงแรมบูทีคใจกลางนิมมาน ใกล้คาเฟ่และ One Nimman'],
  ['guesthouse', 'เกสต์เฮาส์ริมรั้ว', 'Rim Rua Guesthouse', 'เกสต์เฮาส์เล็กๆ ราคาเป็นมิตร เดินเที่ยวคาเฟ่ได้'],
  ['mixed', 'Slow Life คาเฟ่แอนด์สเตย์', 'Slow Life Cafe & Stay', 'คาเฟ่ + ที่พักในที่เดียว กาแฟดี ห้องสวย'],
  ['mixed', 'บ้านไม้ คาเฟ่โฮมสเตย์', 'Baan Mai Cafe Homestay', 'คาเฟ่บ้านไม้ มีห้องพักรายวันด้านบน'],
];

async function main() {
  const [{ id: city }] = await q(`SELECT id FROM cities WHERE code='CNX'`);
  const [{ id: dist }] = await q(`SELECT id FROM districts WHERE slug='nimman'`);
  const users = (await q(`SELECT user_id FROM profiles WHERE display_name IS NOT NULL LIMIT 12`)).map((r) => r.user_id);

  // clear prior demo shop/stay/product content + hide the old agent_seed venues (keep the rows: money-plane FKs)
  await q(`DELETE FROM post_comments`); await q(`DELETE FROM post_likes`);
  await q(`DELETE FROM shop_products`); await q(`DELETE FROM stay_units`); await q(`DELETE FROM feed_posts`);
  await q(`DELETE FROM merchant_accounts`);
  await q(`UPDATE places SET is_visible=false, sells_products=false, offers_stay=false, stay_kind=NULL WHERE source='agent_seed'`);
  await q(`UPDATE reviews SET moderation_status='rejected' WHERE place_id IN (SELECT id FROM places WHERE source='agent_seed')`); // hide old reviews from new shops' surfaces

  const pw = hashPw('soihop1234');
  let n = 0;
  for (let idx = 0; idx < SPEC.length; idx++) {
    const [type, th, en, desc] = SPEC[idx];
    const s = build(idx, type, th, en, desc);
    const payload = { name_i18n: { th, en }, description_i18n: { th: desc }, category: s.cat, subcategory: s.sub, status: 'published', lng: s.lng, lat: s.lat, phone: s.phone, line_id: s.line, opening_hours: s.hours, amenities: s.amen, price_band: s.price_band };
    const [{ id: pid }] = await q(`SELECT fn_create_place($1::jsonb,$2,$3,$4,$5) id`, [JSON.stringify(payload), city, dist, AGENT, ADMIN]);
    await q(`UPDATE places SET source='merchant', is_visible=true, sells_products=$2, offers_stay=$3, stay_kind=$4 WHERE id=$1`, [pid, !!s.sells, !!s.stay, s.kind || null]);
    await q(`INSERT INTO merchant_accounts(email,password_hash,display_name,phone,place_id) VALUES($1,$2,$3,$4,$5)`, [`shop${idx + 1}@soihop.dev`, pw, th, s.phone, pid]);
    for (let k = 0; k < s.products.length; k++) { const [pn, sub, price, unit, season] = s.products[k]; await q(`INSERT INTO shop_products(place_id,city_id,name_i18n,subtype,price_minor,price_unit,in_season,sort,status,author_kind) VALUES($1,$2,jsonb_build_object('th',$3::text),$4,$5,$6,$7,$8,'published','merchant')`, [pid, city, pn, sub, price, unit, !!season, k]); }
    for (let k = 0; k < s.rooms.length; k++) { const [rn, mode, price, period, avail, ds, cap, dep, min, size, furn, bills, amen] = s.rooms[k]; await q(`INSERT INTO stay_units(place_id,city_id,name_i18n,rental_mode,price_minor,price_period,available_units,daily_status,capacity,deposit_minor,min_stay,room_size_sqm,furnished,bills_included,unit_amenities,sort,status,author_kind) VALUES($1,$2,jsonb_build_object('th',$3::text),$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'published','merchant')`, [pid, city, rn, mode, price, period, avail, ds, cap, dep, min, size, furn, bills, amen, k]); }
    for (const body of s.posts) await q(`INSERT INTO feed_posts(place_id,body_i18n,image_count,status,author_kind) VALUES($1,jsonb_build_object('th',$2::text),1,'published','merchant')`, [pid, body]);
    for (let k = 0; k < s.nrev && users.length; k++) { const r = s.rev[k % s.rev.length]; await q(`INSERT INTO reviews(place_id,user_id,city_id,rating,body_i18n,moderation_status) VALUES($1,$2,$3,$4,jsonb_build_object('th',$5::text),'approved')`, [pid, users[(idx + k) % users.length], city, r[0], r[1]]); }
    await q(`INSERT INTO data_freshness(place_id,city_id,last_verified_at,verification_method,freshness_label) VALUES($1,$2,now(),'field_visit','fresh') ON CONFLICT (place_id) DO UPDATE SET last_verified_at=now(),freshness_label='fresh'`, [pid, city]);
    n++;
  }
  const [{ c: prods }] = await q(`SELECT count(*) c FROM shop_products`);
  const [{ c: rms }] = await q(`SELECT count(*) c FROM stay_units`);
  console.log(`seeded ${n} shops · ${prods} products · ${rms} rooms · login pw=soihop1234 (shop1..20@soihop.dev)`);
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
