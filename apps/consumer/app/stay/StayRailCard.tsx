import { STAY_KIND_TH as KIND_TH } from '@/lib/facets';

const PERIOD_TH: Record<string, string> = { month: 'เดือน', night: 'คืน' };

// Compact vertical card for the /stay home discovery rails (image on top). Tap → /place/[id]. No money.
export function StayRailCard({ p }: { p: any }) {
  const per = PERIOD_TH[p.period] || p.period;
  const price = p.priceMin == null ? 'สอบถามราคา'
    : p.priceMin === p.priceMax ? `฿${p.priceMin.toLocaleString()}/${per}`
      : `฿${p.priceMin.toLocaleString()}+/${per}`;
  const scored = (p.ratingN ?? 0) >= 5;
  return (
    <a className="rcard" href={`/place/${p.id}`}>
      <div className="rcard-img">
        <img src={p.img} alt="" loading="lazy" />
        {p.vac > 0 && <span className="pchip season">ว่าง {p.vac}</span>}
      </div>
      <div className="rcard-nm">{p.name}</div>
      <div className="rcard-meta">{KIND_TH[p.kind] || 'ที่พัก'}{p.district ? ` · ${p.district}` : ''}{scored ? ` · ★ ${p.rating}` : ''}</div>
      <div className="rcard-price">{price}</div>
    </a>
  );
}
