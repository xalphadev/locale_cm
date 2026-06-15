// Client-safe image helper (no server deps). Curated high-quality Unsplash photos per
// subcategory (multiple per category for variety, chosen deterministically per place).
// Swap for owned media (the `media` table) in production.
const POOLS: Record<string, string[]> = {
  cafe: ['1442512595331-e89e73853f31', '1554118811-1e0d58224f24', '1517701550927-30cf4ba1dba5', '1554188248-986adbb73be4'],
  restaurant: ['1559314809-0d155014e29e', '1552566626-52f8b828add9', '1565299624946-b28f40a0ae38'],
  street_food: ['1455619452474-d2be8b1e70cd', '1504674900247-0877df9cc836'],
  dessert: ['1559054663-e8d23213f55c', '1551782450-a2132b4ba21d'],
  bar: ['1559314809-0d155014e29e', '1552566626-52f8b828add9'],
  temple: ['1528181304800-259b08848526', '1599661046289-e31897846e41'],
  viewpoint: ['1464822759023-fed622ff2c3b', '1506905925346-21bda4d32df4'],
  market: ['1533777857889-4be7c70b33f7', '1488459716781-31db52582fe9'],
  museum: ['1518998053901-5348d3961a04'],
  cooking_class: ['1556910103-1c02745aae4d', '1466637574441-749b8f19452f'],
  spa: ['1544161515-4ab6ce6db874', '1540555700478-4be289fbecef'],
  muay_thai: ['1599058917212-d750089bc07e', '1571115177098-24ec42ed204d'],
  workshop: ['1466637574441-749b8f19452f', '1556910103-1c02745aae4d'],
  festival: ['1533777857889-4be7c70b33f7', '1488459716781-31db52582fe9'],
  performance: ['1518998053901-5348d3961a04'],
  seasonal: ['1464822759023-fed622ff2c3b'],
};
const CPOOL: Record<string, string[]> = {
  eat: ['1559314809-0d155014e29e', '1552566626-52f8b828add9'], see: ['1528181304800-259b08848526'], do: ['1556910103-1c02745aae4d'],
};

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Cover photo for a venue/event. Pass subcategory + category for a relevant, high-quality image. */
export function cover(seed: string, sub?: string | null, cat?: string | null, w = 640, h = 480): string {
  const pool = (sub && POOLS[sub]) || (cat && CPOOL[cat]) || POOLS.cafe;
  const id = pool[hash(seed || 'soihop') % pool.length];
  return `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&q=72&auto=format&fit=crop`;
}
