// "Local" runtime helpers — make the app aware of the moment (Chiang Mai time): time-of-day framing,
// open-now from a place's opening_hours, and a human freshness label from data_freshness.
// All computed in Asia/Bangkok regardless of the server's own timezone.

const DOW = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

export type Now = { h: number; min: number; mins: number; dow: string };

/** Current wall-clock in Chiang Mai (Asia/Bangkok), independent of the host TZ. */
export function bkkNow(): Now {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Bangkok', hour12: false, weekday: 'short', hour: '2-digit', minute: '2-digit',
  });
  const parts = Object.fromEntries(f.formatToParts(new Date()).map((p) => [p.type, p.value]));
  let h = parseInt(parts.hour, 10) % 24;
  const min = parseInt(parts.minute, 10);
  const wd = String(parts.weekday).toLowerCase().slice(0, 3); // 'mon'..'sun'
  return { h, min, mins: h * 60 + min, dow: wd };
}

export type Daypart = { key: 'dawn' | 'morning' | 'midday' | 'afternoon' | 'evening' | 'late'; greet: string; tagline: string; icon: string; sub: string };

/** Time-of-day framing for the home hero — greeting + what people look for now. */
export function daypart(n: Now = bkkNow()): Daypart {
  const h = n.h;
  if (h >= 5 && h < 10) return { key: 'morning', greet: 'อรุณสวัสดิ์', tagline: 'หากาแฟแก้วเช้า ☕', icon: 'coffee', sub: 'คาเฟ่และมื้อเช้าที่เปิดอยู่ตอนนี้' };
  if (h >= 10 && h < 14) return { key: 'midday', greet: 'มื้อกลางวันแล้ว', tagline: 'กินอะไรดีตอนนี้ 🍜', icon: 'bowl', sub: 'ร้านอาหารใกล้คุณที่เปิดอยู่' };
  if (h >= 14 && h < 17) return { key: 'afternoon', greet: 'บ่ายชิลๆ', tagline: 'นั่งคาเฟ่ หรือเที่ยวเบาๆ 🌤️', icon: 'coffee', sub: 'คาเฟ่ ของหวาน และที่เที่ยวใกล้ๆ' };
  if (h >= 17 && h < 21) return { key: 'evening', greet: 'ค่ำนี้', tagline: 'กิน เดินเล่น หรือหามื้อเย็น 🌆', icon: 'flame', sub: 'ร้านเย็นๆ ตลาด และที่เปิดถึงดึก' };
  if (h >= 21 || h < 1) return { key: 'late', greet: 'ดึกแล้ว', tagline: 'ยังหิว? หาที่เปิดดึก 🌙', icon: 'sparkles', sub: 'ร้านและบาร์ที่ยังเปิดอยู่' };
  return { key: 'dawn', greet: 'เช้าตรู่', tagline: 'เริ่มวันก่อนใคร 🌅', icon: 'sparkles', sub: 'ที่เปิดเช้าและตลาดเช้า' };
}

function parseRange(seg: string): [number, number] | null {
  const m = /(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/.exec(seg);
  if (!m) return null;
  const a = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  let b = parseInt(m[3], 10) * 60 + parseInt(m[4], 10);
  if (b === 0) b = 1440;            // "..-00:00" = midnight close
  return [a, b];
}

export type OpenState = { open: boolean; closesSoon: boolean; label: string };

/** Is this place open right now? opening_hours = { mon:"08:00-17:00, 18:00-22:00", wed:"closed", ... } */
export function openNow(openingHours: any, n: Now = bkkNow()): OpenState {
  if (!openingHours || typeof openingHours !== 'object') return { open: false, closesSoon: false, label: '' };
  const today = String(openingHours[n.dow] ?? '').trim();
  if (!today || /closed|ปิด/i.test(today)) return { open: false, closesSoon: false, label: 'วันนี้ปิด' };
  if (/24\s*ชม|00:00-24:00|00:00-23:59|24\/7/i.test(today)) return { open: true, closesSoon: false, label: 'เปิด 24 ชม.' };
  for (const seg of today.split(',')) {
    const r = parseRange(seg);
    if (!r) continue;
    const [a, b] = r;
    if (n.mins >= a && n.mins < b) {
      const closesSoon = b - n.mins <= 45;
      const hh = Math.floor(b % 1440 / 60), mm = b % 60;
      return { open: true, closesSoon, label: closesSoon ? `ใกล้ปิด · ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}` : 'เปิดอยู่' };
    }
    // opening later today?
    if (n.mins < a) {
      const hh = Math.floor(a / 60), mm = a % 60;
      return { open: false, closesSoon: false, label: `เปิด ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}` };
    }
  }
  return { open: false, closesSoon: false, label: 'ปิดแล้ววันนี้' };
}

/** data_freshness.last_verified_at → "ทีมงานเช็คเมื่อวันนี้ / X วันก่อน" (a trust signal vs stale listings). */
export function freshLabel(lastVerifiedAt: string | Date | null | undefined): string | null {
  if (!lastVerifiedAt) return null;
  const days = Math.floor((Date.now() - new Date(lastVerifiedAt).getTime()) / 86400000);
  if (days <= 0) return 'ทีมงานเช็ควันนี้';
  if (days === 1) return 'ทีมงานเช็คเมื่อวานนี้';
  if (days <= 30) return `ทีมงานเช็คเมื่อ ${days} วันก่อน`;
  if (days <= 90) return `ทีมงานเช็คเมื่อ ${Math.round(days / 7)} สัปดาห์ก่อน`;
  return null; // too old to advertise
}
