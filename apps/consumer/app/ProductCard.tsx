import { i18n, cover, thumb } from '@/lib/db';
import { Icon } from './icons';

const SUB2POOL: Record<string, string> = {
  fruit: 'market', vegetable: 'market', bakery: 'dessert', menu_item: 'restaurant',
  craft: 'market', souvenir: 'market', grocery: 'market', other: 'market',
};
export const SUBTYPE_TH: Record<string, string> = {
  fruit: 'ผลไม้', vegetable: 'ผัก', bakery: 'เบเกอรี', menu_item: 'เมนูร้าน',
  craft: 'งานคราฟต์', souvenir: 'ของฝาก', grocery: 'ของชำ', other: 'อื่นๆ',
};
const UNIT_TH: Record<string, string> = { kg: 'กก.', piece: 'ชิ้น', bag: 'ถุง', box: 'กล่อง', cup: 'แก้ว', jar: 'กระปุก' };

/** Plain RETAIL price for display only (never the loyalty Coin value). */
export function priceText(pr: any): string {
  if (pr.price_text_i18n) return i18n(pr.price_text_i18n);
  if (pr.price_minor == null) return 'สอบถามราคา';
  const u = pr.price_unit ? `/${UNIT_TH[pr.price_unit] || pr.price_unit}` : '';
  return `฿${Math.round(Number(pr.price_minor) / 100).toLocaleString()}${u}`;
}
/** LINE deep link from a stored line_id, when it looks like a valid handle (else null → fall back to phone). */
export function lineHref(lineId?: string | null): string | null {
  if (!lineId) return null;
  const h = lineId.trim().replace(/^@/, '');
  return /^[a-zA-Z0-9._-]+$/.test(h) ? `https://line.me/R/ti/p/~${h}` : null;
}
export function productImg(pr: any): string {
  if (pr.image_urls && pr.image_urls.length) return thumb(pr.image_urls[0]);
  return cover(`prod-${pr.id}`, SUB2POOL[pr.subtype] || 'market', 'eat', 360, 360);
}

/** Non-transactional product card: shows the item + a "contact the shop" CTA (LINE → phone). No cart/checkout. */
export function ProductCard({ pr, line_id, phone, shopName, shopHref }: {
  pr: any; line_id?: string | null; phone?: string | null; shopName?: string; shopHref?: string;
}) {
  const line = lineHref(line_id);
  const cta = line ? { href: line, label: 'ทักไลน์สั่ง', icon: 'chat' as const, ext: true, cls: 'line' }
    : phone ? { href: `tel:${phone}`, label: 'โทรสั่ง', icon: 'phone' as const, ext: false, cls: 'tel' }
      : null;
  return (
    <div className={`prodcard${pr.sold_out ? ' is-sold' : ''}`}>
      <div className="pcimg">
        <img src={productImg(pr)} alt="" loading="lazy" />
        {pr.sold_out ? <span className="pchip sold">หมดแล้ว</span>
          : pr.in_season ? <span className="pchip season">ในฤดู</span>
            : pr.available_today ? <span className="pchip today">มีวันนี้</span> : null}
      </div>
      <div className="pcbody">
        {shopName && (shopHref
          ? <a className="pcshop" href={shopHref}><Icon n="pin" size={11} /> {shopName}</a>
          : <span className="pcshop"><Icon n="pin" size={11} /> {shopName}</span>)}
        <div className="pcname">{i18n(pr.name_i18n)}</div>
        <div className="pcprice">{priceText(pr)}</div>
        {cta
          ? <a className={`pcbuy ${cta.cls}`} href={cta.href} {...(cta.ext ? { target: '_blank', rel: 'noopener' } : {})}><Icon n={cta.icon} size={14} /> {cta.label}</a>
          : <span className="pcbuy off"><Icon n="chat" size={14} /> ติดต่อร้าน</span>}
      </div>
    </div>
  );
}
