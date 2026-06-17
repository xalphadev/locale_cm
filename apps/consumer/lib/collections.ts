// Editorial "local guide" collections — curated angles a local would actually browse by, expressed as
// safe SQL conditions over places (+ the review-stats lateral `rv` available in the home/collection query).
// All conditions are author-written literals (no user input) → safe to inline.

export type Collection = {
  key: string;
  th: string;       // card title
  sub: string;      // one-line editorial subtitle
  icon: string;     // consumer Icon key
  repSub: string;   // representative subcategory → drives the deterministic cover image
  cond: string;     // SQL WHERE fragment (references p.* and rv.*)
};

export const COLLECTIONS: Collection[] = [
  { key: 'work_cafes', th: 'คาเฟ่ทำงานได้ทั้งวัน', sub: 'ไวไฟแรง มีปลั๊ก นั่งยาวสบาย', icon: 'coffee', repSub: 'cafe',
    cond: `p.category='eat' AND p.subcategory='cafe' AND p.amenities @> ARRAY['wifi','power_outlet']` },
  { key: 'local_eats', th: 'ของกินที่คนเชียงใหม่กินจริง', sub: 'ร้านท้องถิ่นแท้ ราคาเป็นมิตร', icon: 'bowl', repSub: 'restaurant',
    cond: `p.category='eat' AND p.subcategory IN ('restaurant','street_food') AND p.price_band <= 2` },
  { key: 'hidden_gems', th: 'ร้านลับ น่าค้นหา', sub: 'คะแนนดีมาก แต่ยังไม่ดังมาก', icon: 'sparkles', repSub: 'cafe',
    cond: `rv.n >= 5 AND rv.avg >= 4.5` },
  { key: 'rainy_day', th: 'หนีร้อน หนีฝน เข้าในร่ม', sub: 'แอร์เย็น พิพิธภัณฑ์ สปา ของหวาน', icon: 'flower', repSub: 'museum',
    cond: `(p.amenities @> ARRAY['aircon'] OR p.subcategory IN ('museum','spa','dessert'))` },
  { key: 'culture', th: 'วัดสวย วัฒนธรรมล้านนา', sub: 'ที่ห้ามพลาดของเมืองเก่า', icon: 'landmark', repSub: 'temple',
    cond: `p.category='see' AND p.subcategory IN ('temple','museum','landmark')` },
  { key: 'sweet_cool', th: 'ของหวานเย็นๆ คลายร้อน', sub: 'มะม่วง ไอติม น้ำแข็งไส', icon: 'cake', repSub: 'dessert',
    cond: `p.subcategory='dessert'` },
  { key: 'night_owl', th: 'สายดึก หิวค่ำ', sub: 'สตรีท บาร์ และตลาดกลางคืน', icon: 'flame', repSub: 'street_food',
    cond: `(p.subcategory IN ('bar','street_food') OR (p.category='see' AND p.subcategory='market'))` },
];

export const collectionByKey = (k: string) => COLLECTIONS.find((c) => c.key === k);
