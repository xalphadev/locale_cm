// Per-category extra info stored in places.details (jsonb, migration 0047). Plain Thai strings, display-only,
// NO money. Pure helper — safe in server pages + client forms. Keep in sync with the consumer mirror.
export type DetailField = { key: string; label: string; ph: string; icon: string };

export const PLACE_DETAILS: Record<string, DetailField[]> = {
  see: [
    { key: 'best_time', label: 'ช่วงเวลาแนะนำ', ph: 'เช่น เช้าก่อน 9 โมง แดดไม่แรง คนน้อย', icon: 'clock' },
    { key: 'getting_there', label: 'การเดินทาง', ph: 'เช่น จากประตูท่าแพ ขับ 15 นาที · มีที่จอดรถ', icon: 'pin' },
  ],
  do: [
    { key: 'duration', label: 'ระยะเวลา', ph: 'เช่น 2–3 ชั่วโมง / ครึ่งวัน', icon: 'clock' },
    { key: 'includes', label: 'สิ่งที่รวมในกิจกรรม', ph: 'เช่น อุปกรณ์ครบ · วัตถุดิบ · น้ำดื่ม · เกียรติบัตร', icon: 'check' },
    { key: 'getting_there', label: 'จุดนัดพบ / การเดินทาง', ph: 'เช่น นัดพบที่ลานจอด · มีรับ-ส่งในเมือง', icon: 'pin' },
  ],
};

/** Detail fields offered for a place's category (empty for eat/stay — they use menu/rooms instead). */
export function detailFields(category?: string | null): DetailField[] {
  return (category && PLACE_DETAILS[category]) || [];
}
