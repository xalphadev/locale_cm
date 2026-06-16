// Image helper for the merchant portal — mirrors apps/consumer/lib/img.ts so list-row thumbnails
// look like the customer side: use an uploaded image_urls[0] if present, else a curated stock
// photo by subcategory/category (Unsplash CDN; deterministic per seed).
const POOLS: Record<string, string[]> = {
  cafe: ['1442512595331-e89e73853f31', '1554118811-1e0d58224f24', '1517701550927-30cf4ba1dba5', '1554188248-986adbb73be4'],
  restaurant: ['1559314809-0d155014e29e', '1552566626-52f8b828add9', '1565299624946-b28f40a0ae38'],
  street_food: ['1455619452474-d2be8b1e70cd', '1504674900247-0877df9cc836'],
  dessert: ['1559054663-e8d23213f55c', '1551782450-a2132b4ba21d'],
  market: ['1533777857889-4be7c70b33f7', '1488459716781-31db52582fe9'],
  // product subtypes
  fruit: ['1533777857889-4be7c70b33f7', '1488459716781-31db52582fe9'],
  vegetable: ['1488459716781-31db52582fe9', '1533777857889-4be7c70b33f7'],
  bakery: ['1559054663-e8d23213f55c', '1551782450-a2132b4ba21d'],
  grocery: ['1533777857889-4be7c70b33f7'],
  menu_item: ['1559314809-0d155014e29e', '1552566626-52f8b828add9'],
  craft: ['1533777857889-4be7c70b33f7'],
  souvenir: ['1533777857889-4be7c70b33f7'],
  // accommodation
  stay: ['1505693416388-ac5ce068fe85', '1522708323590-d24dbb6b0267', '1560448204-e02f11c3d0e2', '1611892440504-42a792e24d32', '1598928506311-c55ded91a20c'],
  dorm: ['1522708323590-d24dbb6b0267', '1505693416388-ac5ce068fe85'],
  apartment: ['1560448204-e02f11c3d0e2', '1631049307264-da0ec9d70304'],
  condo: ['1560448204-e02f11c3d0e2', '1631049307264-da0ec9d70304'],
  mansion: ['1560448204-e02f11c3d0e2'],
  house: ['1560448204-e02f11c3d0e2', '1505693416388-ac5ce068fe85'],
  homestay: ['1566665797739-1674de7a421a', '1598928506311-c55ded91a20c'],
  hotel: ['1611892440504-42a792e24d32', '1566665797739-1674de7a421a'],
  guesthouse: ['1598928506311-c55ded91a20c', '1522708323590-d24dbb6b0267'],
};
const CPOOL: Record<string, string[]> = {
  eat: ['1559314809-0d155014e29e', '1552566626-52f8b828add9'], see: ['1528181304800-259b08848526'], do: ['1556910103-1c02745aae4d'],
};
function hash(s: string): number { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h % 100000; }

/** Cover photo for a product/room/place. Pass a subtype + category for a relevant placeholder. */
export function cover(seed: string, sub?: string | null, cat?: string | null, w = 200, h = 200): string {
  const pool = (sub && POOLS[sub]) || (cat && CPOOL[cat]) || POOLS.cafe;
  const id = pool[hash(seed || 'locale') % pool.length];
  return `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&q=70&auto=format&fit=crop`;
}
/** First uploaded image, else a placeholder. */
export function thumb(images: string[] | null, seed: string, sub?: string | null, cat?: string | null): string {
  return (images && images.length) ? images[0] : cover(seed, sub, cat, 200, 200);
}
