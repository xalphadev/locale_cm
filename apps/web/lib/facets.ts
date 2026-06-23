// Mirror of apps/consumer/lib/facets.ts — category-specific facets stored as tokens in places.amenities (text[]).
// Kept per-app because the two Next apps don't share a lib dir. Keep in sync with the consumer copy (it's the
// vocabulary the customer's filter + place detail render). Client-safe (no server deps).
export const FACET_LABELS: Record<string, string> = {
  // cafe / general
  wifi: 'Wi-Fi', power_outlet: 'มีปลั๊กไฟ', work_friendly: 'นั่งทำงานได้', pet_friendly: 'สัตว์เลี้ยงได้',
  kid_friendly: 'เด็ก/ครอบครัว', outdoor_seating: 'ที่นั่งกลางแจ้ง', aircon: 'แอร์', parking: 'ที่จอดรถ',
  vegan: 'เมนูวีแกน', vegetarian: 'เมนูมังสวิรัติ',
  // restaurant
  thai_food: 'อาหารไทย', northern_food: 'อาหารเหนือ', chinese_food: 'อาหารจีน', buffet: 'บุฟเฟ่ต์',
  live_music: 'ดนตรีสด', halal: 'ฮาลาล', no_pets: 'ห้ามนำสัตว์เลี้ยง', alcohol: 'มีแอลกอฮอล์', late_night: 'เปิดดึก',
  // see (attractions)
  free_entry: 'เข้าฟรี', photo_spot: 'จุดถ่ายรูป', guided_tour: 'มีไกด์นำชม', wheelchair: 'รถเข็นเข้าได้',
  restroom: 'มีห้องน้ำ', sunset: 'ชมพระอาทิตย์ตก', local_crafts: 'ของคราฟต์ท้องถิ่น',
  // do (activities)
  english_speaking: 'บริการภาษาอังกฤษ', beginner_friendly: 'มือใหม่ได้', booking_required: 'ต้องจองล่วงหน้า',
  pickup: 'รับ-ส่ง', couple_room: 'ห้องคู่', drop_in: 'วอล์กอินได้', materials_included: 'มีอุปกรณ์ให้',
  // stay (ที่พัก) unit amenities + furnished
  private_bath: 'ห้องน้ำในตัว', balcony: 'ระเบียง', kitchen: 'ครัว', washing_machine: 'เครื่องซักผ้า',
  fiber_wifi: 'เน็ตไฟเบอร์', pets_ok: 'เลี้ยงสัตว์ได้',
  furnished: 'เฟอร์ครบ', partial: 'เฟอร์บางส่วน', unfurnished: 'ไม่มีเฟอร์',
  // bills_included tokens
  water: 'ค่าน้ำ', electricity: 'ค่าไฟ', common_fee: 'ค่าส่วนกลาง',
  // stay building / common-area facilities
  pool: 'สระว่ายน้ำ', gym: 'ฟิตเนส', lift: 'ลิฟต์', security: 'รปภ.', cctv: 'กล้องวงจรปิด',
  garden: 'สวน', coworking: 'โต๊ะทำงานส่วนกลาง', laundry_room: 'ห้องซักผ้า',
};

// Which facets to OFFER for a subcategory (preferred) or category (fallback).
const SUB_FACETS: Record<string, string[]> = {
  cafe: ['wifi', 'work_friendly', 'power_outlet', 'pet_friendly', 'kid_friendly', 'outdoor_seating', 'vegan'],
  restaurant: ['thai_food', 'northern_food', 'chinese_food', 'buffet', 'live_music', 'halal', 'vegetarian', 'no_pets', 'alcohol'],
  street_food: ['thai_food', 'halal', 'vegetarian', 'late_night', 'parking'],
  dessert: ['vegetarian', 'vegan', 'aircon', 'kid_friendly'],
  bar: ['live_music', 'alcohol', 'outdoor_seating'],
  temple: ['free_entry', 'photo_spot', 'guided_tour', 'wheelchair', 'restroom', 'parking'],
  viewpoint: ['photo_spot', 'sunset', 'free_entry', 'parking'],
  market: ['local_crafts', 'photo_spot', 'parking', 'late_night'],
  museum: ['aircon', 'guided_tour', 'wheelchair', 'kid_friendly', 'photo_spot'],
  cooking_class: ['english_speaking', 'beginner_friendly', 'booking_required', 'pickup', 'vegetarian'],
  spa: ['booking_required', 'couple_room', 'english_speaking', 'parking'],
  muay_thai: ['beginner_friendly', 'english_speaking', 'drop_in', 'materials_included'],
  workshop: ['english_speaking', 'beginner_friendly', 'booking_required', 'materials_included'],
};
const CAT_FACETS: Record<string, string[]> = {
  eat: ['wifi', 'work_friendly', 'pet_friendly', 'kid_friendly', 'thai_food', 'buffet', 'live_music', 'vegetarian', 'halal', 'parking'],
  see: ['free_entry', 'photo_spot', 'guided_tour', 'wheelchair', 'parking', 'kid_friendly'],
  do: ['english_speaking', 'beginner_friendly', 'booking_required', 'pickup', 'parking'],
};

/** Facet tokens to offer given the active subcategory / category. */
export function facetsFor(cat?: string | null, sub?: string | null): string[] {
  return (sub && SUB_FACETS[sub]) || (cat && CAT_FACETS[cat]) || [];
}
export const facetLabel = (t: string) => FACET_LABELS[t] || t;
