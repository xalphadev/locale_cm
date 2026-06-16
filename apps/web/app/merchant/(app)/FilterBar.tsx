'use client';
import { Icon } from './ui';

export type Chip = { key: string; label: string; count?: number };

/** Search box + horizontal filter-chip bar shared by the product/room/post lists. */
export function FilterBar({ query, onQuery, placeholder, chips, active, onChip }: {
  query: string; onQuery: (v: string) => void; placeholder: string;
  chips: Chip[]; active: string; onChip: (k: string) => void;
}) {
  return (
    <div className="lstools">
      <div className="msearch">
        <Icon n="search" size={18} />
        <input value={query} onChange={(e) => onQuery(e.target.value)} placeholder={placeholder} inputMode="search" aria-label={placeholder} />
        {query ? <button type="button" className="msearch-x" onClick={() => onQuery('')} aria-label="ล้าง"><Icon n="x" size={13} /></button> : null}
      </div>
      {chips.length > 1 && (
        <div className="fchips">
          {chips.map((c) => (
            <button type="button" key={c.key} className={`fchip ${active === c.key ? 'on' : ''}`} onClick={() => onChip(c.key)}>
              {c.label}{c.count != null && <span className="fcount">{c.count}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
