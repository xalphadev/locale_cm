import { Icon } from '../icons';
import { toggleSaveAction } from '../actions';
import { STAY_KIND_TH as KIND_TH } from '@/lib/facets';

const PERIOD_TH: Record<string, string> = { month: 'เดือน', night: 'คืน' };

export type StayPlace = {
  id: string; name: string; district: string; kind: string; period: string;
  units: number; vac: number; priceMin: number | null; priceMax: number | null; saved: boolean; img: string;
  rating?: string | null; ratingN?: number;
};

/** One ACCOMMODATION on the /stay list (groups its rooms). Tap → /place/[id] (shows all rooms). No LINE CTA here. */
export function PlaceStayCard({ p, qs }: { p: StayPlace; qs?: string }) {
  const href = `/place/${p.id}${qs || ''}`;
  const per = PERIOD_TH[p.period] || p.period;
  const price = p.priceMin == null ? 'สอบถามราคา'
    : p.priceMin === p.priceMax ? `฿${p.priceMin.toLocaleString()}/${per}`
      : `฿${p.priceMin.toLocaleString()}–${(p.priceMax ?? p.priceMin).toLocaleString()}/${per}`;
  const chip = p.vac > 0 ? { cls: 'season', label: `ว่าง ${p.vac} ห้อง${qs ? ' ช่วงนี้' : ''}` } : { cls: 'ask', label: 'สอบถามห้องว่าง' };
  const scored = (p.ratingN ?? 0) >= 5; // fairness: numeric score only once a place has ≥5 verified reviews
  return (
    <div className="scard">
      <a className="scard-img" href={href}>
        <img src={p.img} alt="" loading="lazy" />
        <span className={`pchip ${chip.cls}`}>{chip.label}</span>
      </a>
      <div className="scard-body">
        <div className="scard-head">
          <a className="scard-nm" href={href}>{p.name}</a>
          {scored && <span className="scard-rate"><Icon n="star" size={12} fill="currentColor" /> {p.rating}</span>}
        </div>
        <div className="scard-loc"><Icon n="pin" size={12} /> {KIND_TH[p.kind] || 'ที่พัก'}{p.district ? ` · ${p.district}` : ''}{p.units > 1 ? ` · ${p.units} แบบห้อง` : ''}</div>
        <div className="scard-foot">
          <span className="scard-price">{price}</span>
          <a className="scard-go" href={href}>ดูห้องว่าง <Icon n="chevR" size={14} /></a>
        </div>
      </div>
      <form className="scard-save" action={toggleSaveAction.bind(null, p.id)}>
        <button type="submit" aria-label="บันทึก" className={p.saved ? 'on' : ''}><Icon n="heart" size={16} fill={p.saved ? 'currentColor' : 'none'} /></button>
      </form>
    </div>
  );
}
