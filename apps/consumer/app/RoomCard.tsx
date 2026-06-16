import { i18n, cover, thumb } from '@/lib/db';
import { Icon } from './icons';
import { lineHref } from './ProductCard';
import { toggleSaveAction } from './actions';

const PERIOD_TH: Record<string, string> = { month: 'เดือน', night: 'คืน' };
export const FURNISH_TH: Record<string, string> = { furnished: 'เฟอร์ครบ', partial: 'เฟอร์บางส่วน', unfurnished: 'ไม่มีเฟอร์' };
const THM = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
export const fmtDate = (d: any) => { const t = new Date(d); return `${t.getDate()} ${THM[t.getMonth()]}`; };
export const stayDaysAgo = (ts: any) => Math.floor((Date.now() - new Date(ts).getTime()) / 86400000);
export const staleAfter = (mode: string) => (mode === 'daily' ? 3 : 14);

export function rentText(u: any): string {
  if (u.price_text_i18n) return i18n(u.price_text_i18n);
  if (u.price_minor == null) return 'สอบถามราคา';
  return `฿${Math.round(Number(u.price_minor) / 100).toLocaleString()}/${PERIOD_TH[u.price_period] || u.price_period}`;
}
export function roomImg(u: any): string {
  if (u.image_urls && u.image_urls.length) return thumb(u.image_urls[0]);
  return cover(`stay-${u.id}`, u.stay_kind || 'stay', 'see', 360, 360);
}
export function roomImages(u: any): string[] {
  return (u.image_urls && u.image_urls.length) ? u.image_urls : [roomImg(u)];
}
/** Mode-aware vacancy chip with owner-freshness decay (stale-vacant → neutral "สอบถามห้องว่าง"). */
export function roomVacancy(u: any): { cls: string; label: string } {
  const monthly = u.rental_mode === 'monthly';
  let chip = monthly
    ? (u.available_units > 0 ? { cls: 'season', label: `ว่าง ${u.available_units} ห้อง` } : { cls: 'sold', label: 'เต็ม' })
    : (u.daily_status === 'vacant' ? { cls: 'season', label: 'ว่างวันนี้' }
      : u.daily_status === 'full' ? { cls: 'sold', label: 'เต็มวันนี้' } : { cls: 'ask', label: 'สอบถามว่าง' });
  if (stayDaysAgo(u.availability_updated_at) > staleAfter(u.rental_mode) && chip.cls === 'season') chip = { cls: 'ask', label: 'สอบถามห้องว่าง' };
  return chip;
}

/** Non-transactional accommodation card. Mode-aware vacancy chip + a "contact the place" CTA (LINE → phone).
 *  Vacancy that's gone stale (no owner update past the threshold) degrades to a neutral "สอบถามห้องว่าง". */
export function RoomCard({ u, line_id, phone, shopName, shopHref, variant = 'grid', placeId, saved }: {
  u: any; line_id?: string | null; phone?: string | null; shopName?: string; shopHref?: string;
  variant?: 'grid' | 'wide'; placeId?: string; saved?: boolean;
}) {
  const line = lineHref(line_id);
  const cta = line ? { href: line, label: 'ทักไลน์สอบถามห้อง', icon: 'chat' as const, ext: true, cls: 'line' }
    : phone ? { href: `tel:${phone}`, label: 'โทรสอบถาม', icon: 'phone' as const, ext: false, cls: 'tel' }
      : null;
  const monthly = u.rental_mode === 'monthly';
  const chip = roomVacancy(u);
  const href = `/stay/${u.id}`;
  const freshTxt = `อัปเดตห้องว่าง ${stayDaysAgo(u.availability_updated_at) <= 0 ? 'วันนี้' : `${stayDaysAgo(u.availability_updated_at)} วันก่อน`}`;

  const facts: string[] = [];
  if (u.capacity) facts.push(`${u.capacity} ท่าน`);
  if (monthly && u.available_from) facts.push(`ว่าง ${fmtDate(u.available_from)}`);
  if (u.deposit_minor != null) facts.push(`มัดจำ ฿${Math.round(u.deposit_minor / 100).toLocaleString()}`);
  if (u.min_stay) facts.push(`ขั้นต่ำ ${u.min_stay} ${monthly ? 'เดือน' : 'คืน'}`);
  if (u.furnished && FURNISH_TH[u.furnished]) facts.push(FURNISH_TH[u.furnished]);

  // wide list-ROW card (used on /stay): image LEFT, info RIGHT — compact, one per row
  if (variant === 'wide') {
    return (
      <div className="scard">
        <a className="scard-img" href={href}>
          <img src={roomImg(u)} alt="" loading="lazy" />
          <span className={`pchip ${chip.cls}`}>{chip.label}</span>
        </a>
        <div className="scard-body">
          <a className="scard-nm" href={href}>{i18n(u.name_i18n)}</a>
          {shopName && <div className="scard-loc"><Icon n="pin" size={12} /> {shopName}</div>}
          {facts.length > 0 && <div className="scard-facts">{facts.join(' · ')}</div>}
          <div className="scard-foot">
            <span className="scard-price">{rentText(u)}</span>
            {cta
              ? <a className={`pcbuy sm ${cta.cls}`} href={cta.href} {...(cta.ext ? { target: '_blank', rel: 'noopener' } : {})}><Icon n={cta.icon} size={14} /> {cta.label}</a>
              : <span className="pcbuy sm off"><Icon n="chat" size={14} /> ติดต่อ</span>}
          </div>
        </div>
        {placeId && (
          <form className="scard-save" action={toggleSaveAction.bind(null, placeId)}>
            <button type="submit" aria-label="บันทึก" className={saved ? 'on' : ''}><Icon n="heart" size={16} fill={saved ? 'currentColor' : 'none'} /></button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="prodcard">
      <a className="pcimg" href={href}>
        <img src={roomImg(u)} alt="" loading="lazy" />
        <span className={`pchip ${chip.cls}`}>{chip.label}</span>
      </a>
      <div className="pcbody">
        {shopName && (shopHref
          ? <a className="pcshop" href={shopHref}><Icon n="pin" size={11} /> {shopName}</a>
          : <span className="pcshop"><Icon n="pin" size={11} /> {shopName}</span>)}
        <a className="pcname" href={href}>{i18n(u.name_i18n)}</a>
        <div className="pcprice">{rentText(u)}</div>
        {facts.length > 0 && <div className="pcfacts">{facts.join(' · ')}</div>}
        <div className="pcfresh">{freshTxt}</div>
        {cta
          ? <a className={`pcbuy ${cta.cls}`} href={cta.href} {...(cta.ext ? { target: '_blank', rel: 'noopener' } : {})}><Icon n={cta.icon} size={14} /> {cta.label}</a>
          : <span className="pcbuy off"><Icon n="chat" size={14} /> ติดต่อที่พัก</span>}
      </div>
    </div>
  );
}
