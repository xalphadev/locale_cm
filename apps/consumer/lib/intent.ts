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

// ── planner intent: "คืนนี้มีแฟน งบ 1,000 แถวนิมมาน" → { isPlan, vibe, budget, area } ──────────────
// Same rule-based approach, scoped to the /plan itinerary engine. (Upgrade path: swap for an LLM that
// returns this shape; everything downstream — slots, budget math, the page — stays the same.)
const PLAN_KW = ['วางแผน', 'แพลน', 'plan', 'พาเที่ยว', 'พาไป', 'จัดทริป', 'จัดให้', 'จัดเส้นทาง',
  'ไปไหนดี', 'เที่ยวไหนดี', 'เที่ยวให้', 'ทริป', 'ครึ่งวัน', 'หนึ่งวัน', 'one day', 'itinerary'];
const VIBE_KW: Record<string, string[]> = {
  date: ['แฟน', 'เดท', 'เดต', 'โรแมนติก', 'คู่รัก', 'คนรัก', 'จีบ', 'ครบรอบ', 'date', 'romantic', 'วาเลนไทน์'],
  culture: ['วัด', 'วัฒนธรรม', 'ประวัติศาสตร์', 'ไหว้พระ', 'ล้านนา', 'เมืองเก่า', 'พิพิธภัณฑ์', 'culture'],
  foodie: ['สายกิน', 'กินทัวร์', 'ของกิน', 'อร่อย', 'ร้านเด็ด', 'ตามรอย', 'คาเฟ่ฮ็อป', 'หิว', 'foodie'],
  chill: ['ชิล', 'ชิว', 'สบายๆ', 'พักผ่อน', 'นั่งเล่น', 'ผ่อนคลาย', 'เที่ยวเบาๆ', 'relax', 'chill'],
};
const AREA_KW: Record<string, string[]> = {
  nimman: ['นิมมาน', 'nimman', 'เจ็ดยอด'],
  old_city: ['เมืองเก่า', 'คูเมือง', 'ในเมือง', 'old city', 'ท่าแพ', 'พระสิงห์', 'เจดีย์หลวง', 'ราชดำเนิน'],
  chang_klan: ['ช้างคลาน', 'ไนท์บาซาร์', 'night bazaar', 'อนุสาร'],
  santitham: ['สันติธรรม', 'santitham'],
  wualai: ['วัวลาย', 'wualai'],
  riverside: ['ริมปิง', 'แม่น้ำปิง', 'วัดเกต', 'ริมน้ำ', 'riverside', 'เจริญราษฎร์'],
  suthep: ['ดอยสุเทพ', 'เชิงดอย', 'สุเทพ', 'suthep', 'ห้วยแก้ว'],
  maerim: ['แม่ริม', 'mae rim', 'maerim'],
};
const TH_DIGIT: Record<string, number> = { หนึ่ง: 1, นึง: 1, สอง: 2, สาม: 3, สี่: 4, ห้า: 5, หก: 6, เจ็ด: 7, แปด: 8, เก้า: 9, สัก: 1 };

function parseBudget(q: string): { bucket: string; baht: number } | null {
  let baht: number | null = null;
  // money-cued digits: "งบ 1000", "1,000 บาท", "฿1500"
  const cue = q.match(/(?:งบ|งบประมาณ|budget|ราคา|฿)\s*([\d][\d,\.]{1,7})/) || q.match(/([\d][\d,\.]{1,7})\s*(?:บาท|฿|baht)/);
  if (cue) baht = parseInt(cue[1].replace(/[,\.]/g, ''), 10);
  // thai-word amounts: "สองพัน", "พันนึง", "ห้าร้อย"
  if (baht == null) {
    const m = q.match(/(หนึ่ง|นึง|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า|สัก)?\s*(หมื่น|พัน|ร้อย)/);
    if (m) baht = (m[1] ? TH_DIGIT[m[1]] : 1) * ({ หมื่น: 10000, พัน: 1000, ร้อย: 100 }[m[2]] || 0);
  }
  // bare number ≥100 as a last resort
  if (baht == null) { const m = q.match(/\b([\d][\d,\.]{2,6})\b/); if (m) { const n = parseInt(m[1].replace(/[,\.]/g, ''), 10); if (n >= 100 && n <= 200000) baht = n; } }
  if (baht == null || baht <= 0) return null;
  const bucket = baht <= 500 ? 'lt500' : baht <= 1000 ? '500_1000' : baht <= 2000 ? '1000_2000' : '2000plus';
  return { bucket, baht };
}

export type PlanIntent = { isPlan: boolean; vibe: string; budget: string; baht: number | null; area: string; chips: string[] };

export function parsePlan(raw: string): PlanIntent {
  const q = (raw || '').toLowerCase();
  let vibe = '';
  for (const [k, kws] of Object.entries(VIBE_KW)) if (has(q, kws)) { vibe = k; break; } // priority: date>culture>foodie>chill
  let area = '';
  for (const [k, kws] of Object.entries(AREA_KW)) if (has(q, kws)) { area = k; break; }
  const b = parseBudget(q);
  const isPlan = has(q, PLAN_KW) || !!b || vibe === 'date';
  const VIBE_TH: Record<string, string> = { date: 'เดทโรแมนติก', culture: 'สายวัฒนธรรม', foodie: 'สายกิน', chill: 'ชิลล์เบาๆ' };
  const AREA_TH: Record<string, string> = { nimman: 'นิมมาน', old_city: 'เมืองเก่า', chang_klan: 'ช้างคลาน', santitham: 'สันติธรรม', wualai: 'วัวลาย', riverside: 'ริมปิง', suthep: 'เชิงดอยสุเทพ', maerim: 'แม่ริม' };
  const chips: string[] = [];
  if (vibe) chips.push(VIBE_TH[vibe]);
  if (b) chips.push(`งบ ~฿${b.baht.toLocaleString()}`);
  if (area) chips.push(AREA_TH[area]);
  return { isPlan, vibe: vibe || 'chill', budget: b?.bucket ?? '', baht: b?.baht ?? null, area, chips };
}

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
