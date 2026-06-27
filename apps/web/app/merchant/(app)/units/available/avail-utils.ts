// Shared helpers for the หาห้องว่าง search list + the /book review page (one source of truth).
export const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
export const fmtTh = (s: string) => { const [, m, d] = s.split('-'); return `${Number(d)} ${TH[Number(m) - 1]}`; };
export const nightsOf = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
export const monthsOf = (a: string, b: string) => { const [ay, am, ad] = a.split('-').map(Number); const [by, bm, bd] = b.split('-').map(Number); return Math.max(1, (by - ay) * 12 + (bm - am) + (bd >= ad ? 0 : -1)); };
export const baht = (m: number) => `฿${Math.round(m / 100).toLocaleString('th-TH')}`;
export const perTh = (p: string | null) => (p === 'night' ? '/คืน' : p === 'month' ? '/เดือน' : '');
