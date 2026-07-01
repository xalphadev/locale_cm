// Category-specific filters (facets). Stored as tokens in places.amenities text[] (no schema change).
// Client-safe (no server deps).

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
  // stay building / common-area facilities (stored in stay_units.attrs.building[])
  pool: 'สระว่ายน้ำ', gym: 'ฟิตเนส', lift: 'ลิฟต์', security: 'รปภ.', cctv: 'กล้องวงจรปิด',
  garden: 'สวน', coworking: 'โต๊ะทำงานส่วนกลาง', laundry_room: 'ห้องซักผ้า',
};

// Stay amenities / building facilities are now the admin-managed catalog (stay_amenity, migration 0044),
// loaded via apps/consumer/lib/amenities.ts — the old hardcoded STAY_AMENITIES/STAY_BUILDING lived here.

/** Accommodation types (places.stay_kind). Shown for both rental modes — a place's type is
 *  independent of whether its rooms rent monthly or daily. */
export const STAY_KINDS = ['dorm', 'hostel', 'apartment', 'condo', 'mansion', 'house', 'homestay', 'guesthouse', 'hotel'];
export const STAY_KIND_TH: Record<string, string> = {
  dorm: 'หอพัก', hostel: 'โฮสเทล', apartment: 'อพาร์ตเมนต์', condo: 'คอนโด', mansion: 'แมนชั่น', house: 'บ้านเช่า',
  homestay: 'โฮมสเตย์', guesthouse: 'เกสต์เฮาส์', hotel: 'โรงแรม', mixed: 'ที่พัก',
};

// WHICH facets are offered per category/subcategory moved to the DB (place_facet, migration 0068,
// seeded from the lists that lived here) — use loadPlaceFacets()/offerFacets() in lib/amenities.ts.
// FACET_LABELS above stays only as a DISPLAY fallback for legacy tokens + the intent parser chips.
export const facetLabel = (t: string) => FACET_LABELS[t] || t;
