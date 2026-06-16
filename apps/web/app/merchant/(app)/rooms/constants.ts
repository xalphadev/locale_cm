// Shared room field labels — kept in a plain module so both the (client) RoomForm and the
// (server) room detail page can import them without crossing the client/server boundary.
export const BILLS: [string, string][] = [['water', 'น้ำ'], ['electricity', 'ไฟ'], ['wifi', 'เน็ต'], ['common_fee', 'ส่วนกลาง']];
export const AMEN: [string, string][] = [['aircon', 'แอร์'], ['private_bath', 'ห้องน้ำในตัว'], ['balcony', 'ระเบียง'], ['kitchen', 'ครัว'], ['washing_machine', 'เครื่องซักผ้า'], ['parking', 'ที่จอดรถ'], ['pets_ok', 'เลี้ยงสัตว์ได้'], ['fiber_wifi', 'เน็ตไฟเบอร์']];
export const FURNISHED_TH: Record<string, string> = { furnished: 'เฟอร์ครบ', partial: 'เฟอร์บางส่วน', unfurnished: 'ไม่มีเฟอร์' };
