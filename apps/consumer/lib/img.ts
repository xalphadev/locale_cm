// Client-safe image helper (no server deps). Real, category-relevant photos via LoremFlickr
// (keyword-matched Flickr images; ?lock makes them deterministic per place). Swap for owned
// media (the `media` table) in production.
const KW: Record<string, string> = {
  cafe: 'cafe,coffee', restaurant: 'thai,restaurant,food', street_food: 'streetfood,thailand',
  dessert: 'dessert,sweets', bar: 'bar,cocktail',
  temple: 'temple,thailand', viewpoint: 'mountain,viewpoint', market: 'market,asia', museum: 'museum,art',
  cooking_class: 'cooking,thaifood', spa: 'spa,massage', muay_thai: 'muaythai,boxing', workshop: 'workshop,craft',
  // event kinds
  festival: 'festival,lantern', performance: 'concert,music', seasonal: 'flowers,festival',
};
const CKW: Record<string, string> = { eat: 'food,restaurant', see: 'travel,thailand', do: 'leisure,activity' };

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 100000;
}

/** Cover photo for a venue/event. Pass subcategory + category for a relevant image. */
export function cover(seed: string, sub?: string | null, cat?: string | null, w = 640, h = 480): string {
  const kw = (sub && KW[sub]) || (cat && CKW[cat]) || 'chiangmai,cafe';
  return `https://loremflickr.com/${w}/${h}/${kw}?lock=${hash(seed || 'soihop')}`;
}
