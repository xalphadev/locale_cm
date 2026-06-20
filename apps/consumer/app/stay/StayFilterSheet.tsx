'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '../icons';
import { STAY_AMENITIES, STAY_KINDS, STAY_KIND_TH, facetLabel } from '@/lib/facets';
const SORTS: Record<string, [string, string][]> = {
  monthly: [['', 'มาใหม่'], ['soon', 'ว่างเร็วๆนี้'], ['cheap', 'ราคาประหยัด']],
  daily: [['', 'มาใหม่'], ['vacant', 'ว่างวันนี้'], ['cheap', 'ราคาประหยัด']],
};
const PRICE: Record<string, [string, string][]> = {
  monthly: [['lt5k', '<5พัน'], ['5_10k', '5–10พัน'], ['10_20k', '10–20พัน'], ['20k', '20พัน+']],
  daily: [['lt800', '<800'], ['800_1500', '800–1500'], ['1500', '1500+']],
};
const FURNISH: [string, string][] = [['furnished', 'เฟอร์ครบ'], ['partial', 'เฟอร์บางส่วน'], ['unfurnished', 'ไม่มีเฟอร์']];
const MULTI = 'เลือกได้หลายอย่าง';
const ONE = 'เลือก 1 อย่าง';

type Props = {
  mode: string; q: string; basePath?: string; from?: string; to?: string;
  kind: string[]; sort: string; am: string[]; fr: string[]; pr: string; count: number;
};

export default function StayFilterSheet(p: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const init = () => ({ kind: [...p.kind], sort: p.sort, am: [...p.am], fr: [...p.fr], pr: p.pr });
  const [s, setS] = useState(init);

  function openSheet() { setS(init()); setOpen(true); }
  // single-select (radio): ช่วงราคา · รองรับ · เรียงลำดับ — click again to clear
  const single = (key: 'sort' | 'pr', val: string) => setS((x) => ({ ...x, [key]: x[key] === val ? '' : val }));
  // multi-select (checkbox): ประเภทที่พัก · เฟอร์นิเจอร์ · สิ่งอำนวยความสะดวก
  const multi = (key: 'kind' | 'am' | 'fr', val: string) =>
    setS((x) => ({ ...x, [key]: x[key].includes(val) ? x[key].filter((y) => y !== val) : [...x[key], val] }));
  function clearAll() { setS({ kind: [], sort: '', am: [], fr: [], pr: '' }); }
  function apply() {
    const u = new URLSearchParams();
    if (p.mode !== 'monthly') u.set('mode', p.mode);
    if (p.q) u.set('q', p.q);
    if (p.mode === 'daily' && p.from && p.to) { u.set('from', p.from); u.set('to', p.to); }   // keep the date search
    if (s.kind.length) u.set('kind', s.kind.join(','));
    if (s.sort) u.set('sort', s.sort);
    if (s.am.length) u.set('am', s.am.join(','));
    if (s.fr.length) u.set('fr', s.fr.join(','));
    if (s.pr) u.set('pr', s.pr);
    const qs = u.toString();
    setOpen(false);
    const base = p.basePath || '/stay';                                                       // /stay or /stay/map
    router.push(qs ? `${base}?${qs}` : base);
  }

  const selected = s.kind.length + s.am.length + s.fr.length + (s.sort ? 1 : 0) + (s.pr ? 1 : 0);

  const Chip = ({ on, onClick, check = false, children }: { on: boolean; onClick: () => void; check?: boolean; children: any }) =>
    <button type="button" className={`fchip ${on ? 'on' : ''}`} onClick={onClick}>{check && on && <Icon n="check" size={13} className="fchip-ck" />}{children}</button>;

  const Sec = ({ icon, title, hint, children }: { icon: string; title: string; hint: string; children: any }) =>
    <div className="fsec">
      <div className="fsec-h"><span className="fsec-ic"><Icon n={icon} size={15} /></span>{title}<span className="fsec-hint">{hint}</span></div>
      <div className="fchips">{children}</div>
    </div>;

  return (
    <>
      <button type="button" className={`filterbtn ${p.count ? 'has' : ''}`} onClick={openSheet}>
        <Icon n="sort" size={15} /> ตัวกรอง{p.count ? ` · ${p.count}` : ''}
      </button>

      {open && (
        <div className="sheet-scrim" onClick={() => setOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-grab" />
            <div className="sheet-head"><b>ตัวกรอง</b><button type="button" className="sheet-x" onClick={() => setOpen(false)} aria-label="ปิด"><Icon n="x" size={20} /></button></div>
            <div className="sheet-body">
              <Sec icon="bed" title="ประเภทที่พัก" hint={MULTI}>
                {STAY_KINDS.map((k) => <Chip key={k} on={s.kind.includes(k)} check onClick={() => multi('kind', k)}>{STAY_KIND_TH[k]}</Chip>)}
              </Sec>
              <Sec icon="tag" title="ช่วงราคา" hint={ONE}>
                {PRICE[p.mode].map(([k, l]) => <Chip key={k} on={s.pr === k} onClick={() => single('pr', k)}>฿{l}</Chip>)}
              </Sec>
              {p.mode === 'monthly' && (
                <Sec icon="sofa" title="เฟอร์นิเจอร์" hint={MULTI}>
                  {FURNISH.map(([k, l]) => <Chip key={k} on={s.fr.includes(k)} check onClick={() => multi('fr', k)}>{l}</Chip>)}
                </Sec>
              )}
              <Sec icon="sparkles" title="สิ่งอำนวยความสะดวก" hint={MULTI}>
                {STAY_AMENITIES.map((a) => <Chip key={a} on={s.am.includes(a)} check onClick={() => multi('am', a)}>{facetLabel(a)}</Chip>)}
              </Sec>
              <Sec icon="sort" title="เรียงลำดับ" hint={ONE}>
                {SORTS[p.mode].map(([k, l]) => <Chip key={k || 'new'} on={s.sort === k} onClick={() => single('sort', k)}>{l}</Chip>)}
              </Sec>
            </div>
            <div className="sheet-foot">
              <button type="button" className="sheet-clear" onClick={clearAll}>ล้างทั้งหมด</button>
              <button type="button" className="sheet-apply" onClick={apply}>ดูผลลัพธ์{selected ? ` (${selected})` : ''}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
