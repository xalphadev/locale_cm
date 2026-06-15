// Natural-language intent parser (client-safe, rule-based — no external API).
// "อยากไปคาเฟ่ใกล้ๆ ฉัน มี wifi" → { sub:'cafe', facets:['wifi'], nearMe:true }.
// Maps a free-text query onto the structured filters we already run on our data.
// (Upgrade path: swap parse() for an LLM call that returns the same shape.)
import { facetLabel } from './facets';

const has = (q: string, kws: string[]) => kws.some((k) => q.includes(k));

const SUB_KW: Record<string, string[]> = {
  cafe: ['กาแฟ', 'คาเฟ่', 'coffee', 'cafe', 'ดริป', 'ลาเต้', 'สโลว์บาร์'],
  restaurant: ['ร้านอาหาร', 'กินข้าว', 'restaurant', 'มื้อ', 'ดินเนอร์'],
  street_food: ['สตรีท', 'สตรีทฟู้ด', 'ริมทาง', 'street food', 'รถเข็น'],
  dessert: ['ของหวาน', 'ขนม', 'เค้ก', 'dessert', 'ไอติม', 'ไอศกรีม', 'หวาน'],
  temple: ['วัด', 'temple', 'ทำบุญ', 'ไหว้พระ'],
  viewpoint: ['จุดชมวิว', 'วิว', 'viewpoint', 'ภูเขา', 'พระอาทิตย์'],
  market: ['ตลาด', 'market', 'ถนนคนเดิน', 'เดินเล่น'],
  museum: ['พิพิธภัณฑ์', 'museum', 'หอศิลป์', 'ศิลปะ'],
  spa: ['สปา', 'นวด', 'spa', 'massage', 'ผ่อนคลาย'],
  muay_thai: ['มวยไทย', 'มวย', 'muay', 'boxing', 'ต่อย'],
  cooking_class: ['คลาสทำอาหาร', 'ทำอาหาร', 'cooking', 'เรียนทำ'],
  workshop: ['เวิร์กช็อป', 'workshop', 'คราฟต์', ' diy'],
};
const CAT_KW: Record<string, string[]> = {
  eat: ['กิน', 'หิว', 'อาหาร', 'eat', 'food', 'อร่อย'],
  see: ['เที่ยว', 'ที่เที่ยว', 'see', 'sightsee', 'แลนด์มาร์ก'],
  do: ['กิจกรรม', 'ทำกิจกรรม', 'activity', 'เล่น'],
};
const FACET_KW: Record<string, string[]> = {
  wifi: ['wifi', 'wi-fi', 'ไวไฟ', 'เน็ต', 'อินเตอร์เน็ต'],
  work_friendly: ['ทำงาน', 'นั่งทำงาน', 'work', 'laptop', 'โน้ตบุ๊ก', 'ติวหนังสือ', 'อ่านหนังสือ'],
  pet_friendly: ['สัตว์เลี้ยง', 'หมา', 'แมว', 'สุนัข', 'pet'],
  kid_friendly: ['เด็ก', 'ครอบครัว', 'kid', 'family', 'ลูก'],
  outdoor_seating: ['กลางแจ้ง', 'นั่งนอก', 'outdoor', 'สวน'],
  parking: ['ที่จอด', 'จอดรถ', 'parking'],
  vegan: ['วีแกน', 'vegan', 'plant based'],
  vegetarian: ['มังสวิรัติ', 'เจ', 'vegetarian'],
  thai_food: ['อาหารไทย', 'ไทย', 'thai'],
  northern_food: ['อาหารเหนือ', 'เหนือ', 'ข้าวซอย', 'northern'],
  buffet: ['บุฟเฟ่', 'บุฟเฟต์', 'buffet'],
  live_music: ['ดนตรีสด', 'ดนตรี', 'live music', 'วงดนตรี'],
  halal: ['ฮาลาล', 'halal', 'มุสลิม'],
  free_entry: ['เข้าฟรี', 'ฟรี', 'free'],
  photo_spot: ['ถ่ายรูป', 'ถ่ายภาพ', 'photo', 'เช็คอิน', 'มุมถ่าย'],
  english_speaking: ['ภาษาอังกฤษ', 'english', 'พูดอังกฤษ'],
  booking_required: ['จอง', 'booking', 'reserve'],
};
const NEAR_KW = ['ใกล้', 'แถวนี้', 'รอบตัว', 'รอบๆ', 'near', 'nearby', 'ใกล้ฉัน', 'ใกล้นี้', 'แถวๆ', 'ระยะเดิน'];
const SUB_TH: Record<string, string> = {
  cafe: 'คาเฟ่', restaurant: 'ร้านอาหาร', street_food: 'สตรีทฟู้ด', dessert: 'ของหวาน', temple: 'วัด',
  viewpoint: 'จุดชมวิว', market: 'ตลาด', museum: 'พิพิธภัณฑ์', spa: 'สปา', muay_thai: 'มวยไทย',
  cooking_class: 'คลาสทำอาหาร', workshop: 'เวิร์กช็อป',
};
const CAT_TH: Record<string, string> = { eat: 'ที่กิน', see: 'ที่เที่ยว', do: 'กิจกรรม' };

export type Intent = { sub?: string; cat?: string; facets: string[]; nearMe: boolean; matched: boolean; chips: string[] };

export function parse(raw: string): Intent {
  const q = (raw || '').toLowerCase();
  let sub: string | undefined;
  for (const [k, kws] of Object.entries(SUB_KW)) if (has(q, kws)) { sub = k; break; }
  let cat: string | undefined;
  if (!sub) for (const [k, kws] of Object.entries(CAT_KW)) if (has(q, kws)) { cat = k; break; }
  const facets = Object.entries(FACET_KW).filter(([, kws]) => has(q, kws)).map(([k]) => k);
  const nearMe = has(q, NEAR_KW);
  const matched = !!(sub || cat || facets.length || nearMe);
  const chips: string[] = [];
  if (sub) chips.push(SUB_TH[sub]); else if (cat) chips.push(CAT_TH[cat]);
  facets.forEach((f) => chips.push(facetLabel(f)));
  if (nearMe) chips.push('ใกล้คุณ');
  return { sub, cat, facets, nearMe, matched, chips };
}
