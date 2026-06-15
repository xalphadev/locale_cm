'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '../icons';
import { STAY_AMENITIES, facetLabel } from '@/lib/facets';

const KINDS: Record<string, [string, string][]> = {
  monthly: [['dorm', 'หอพัก'], ['apartment', 'อพาร์ตเมนต์']],
  daily: [['homestay', 'โฮมสเตย์'], ['guesthouse', 'เกสต์เฮาส์'], ['hotel', 'โรงแรม']],
};
const SORTS: Record<string, [string, string][]> = {
  monthly: [['', 'มาใหม่'], ['soon', 'ว่างเร็วๆนี้'], ['cheap', 'ราคาประหยัด']],
  daily: [['', 'มาใหม่'], ['vacant', 'ว่างวันนี้'], ['cheap', 'ราคาประหยัด']],
};
const PRICE: Record<string, [string, string][]> = {
  monthly: [['lt5k', '<5พัน'], ['5_10k', '5–10พัน'], ['10_20k', '10–20พัน'], ['20k', '20พัน+']],
  daily: [['lt800', '<800'], ['800_1500', '800–1500'], ['1500', '1500+']],
};
const CAPS: [string, string][] = [['1', '1 ท่าน'], ['2', '2 ท่าน'], ['3', '3+ ท่าน']];
const FURNISH: [string, string][] = [['furnished', 'เฟอร์ครบ'], ['partial', 'เฟอร์บางส่วน'], ['unfurnished', 'ไม่มีเฟอร์']];

type Props = {
  mode: string; view: string; q: string;
  kind: string; sort: string; am: string[]; fr: string; pr: string; cap: string; count: number;
};

export default function StayFilterSheet(p: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [s, setS] = useState({ kind: p.kind, sort: p.sort, am: [...p.am], fr: p.fr, pr: p.pr, cap: p.cap });

  function openSheet() { setS({ kind: p.kind, sort: p.sort, am: [...p.am], fr: p.fr, pr: p.pr, cap: p.cap }); setOpen(true); }
  const single = (key: 'kind' | 'sort' | 'fr' | 'pr' | 'cap', val: string) => setS((x) => ({ ...x, [key]: x[key] === val ? '' : val }));
  const toggleAm = (a: string) => setS((x) => ({ ...x, am: x.am.includes(a) ? x.am.filter((y) => y !== a) : [...x.am, a] }));
  function clearAll() { setS({ kind: '', sort: '', am: [], fr: '', pr: '', cap: '' }); }
  function apply() {
    const u = new URLSearchParams();
    if (p.mode !== 'monthly') u.set('mode', p.mode);
    if (p.q) u.set('q', p.q);
    if (p.view === 'map') u.set('view', 'map');
    if (s.kind) u.set('kind', s.kind);
    if (s.sort) u.set('sort', s.sort);
    if (s.am.length) u.set('am', s.am.join(','));
    if (s.fr) u.set('fr', s.fr);
    if (s.pr) u.set('pr', s.pr);
    if (s.cap) u.set('cap', s.cap);
    const qs = u.toString();
    setOpen(false);
    router.push(qs ? `/stay?${qs}` : '/stay');
  }

  const Chip = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: any }) =>
    <button type="button" className={`fchip ${on ? 'on' : ''}`} onClick={onClick}>{children}</button>;

  return (
    <>
      <button type="button" className={`filterbtn ${p.count ? 'has' : ''}`} onClick={openSheet}>
        <Icon n="dots" size={15} /> ตัวกรอง{p.count ? ` · ${p.count}` : ''}
      </button>

      {open && (
        <div className="sheet-scrim" onClick={() => setOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-grab" />
            <div className="sheet-head"><b>ตัวกรอง</b><button type="button" className="sheet-x" onClick={() => setOpen(false)} aria-label="ปิด"><Icon n="x" size={20} /></button></div>
            <div className="sheet-body">
              <div className="fsec"><div className="fsec-h">ประเภทที่พัก</div><div className="fchips">{KINDS[p.mode].map(([k, l]) => <Chip key={k} on={s.kind === k} onClick={() => single('kind', k)}>{l}</Chip>)}</div></div>
              <div className="fsec"><div className="fsec-h">ช่วงราคา</div><div className="fchips">{PRICE[p.mode].map(([k, l]) => <Chip key={k} on={s.pr === k} onClick={() => single('pr', k)}>฿{l}</Chip>)}</div></div>
              <div className="fsec"><div className="fsec-h">รองรับ</div><div className="fchips">{CAPS.map(([k, l]) => <Chip key={k} on={s.cap === k} onClick={() => single('cap', k)}>{l}</Chip>)}</div></div>
              {p.mode === 'monthly' && <div className="fsec"><div className="fsec-h">เฟอร์นิเจอร์</div><div className="fchips">{FURNISH.map(([k, l]) => <Chip key={k} on={s.fr === k} onClick={() => single('fr', k)}>{l}</Chip>)}</div></div>}
              <div className="fsec"><div className="fsec-h">สิ่งอำนวยความสะดวก</div><div className="fchips">{STAY_AMENITIES.map((a) => <Chip key={a} on={s.am.includes(a)} onClick={() => toggleAm(a)}>{facetLabel(a)}</Chip>)}</div></div>
              <div className="fsec"><div className="fsec-h">เรียงลำดับ</div><div className="fchips">{SORTS[p.mode].map(([k, l]) => <Chip key={k || 'new'} on={s.sort === k} onClick={() => single('sort', k)}>{l}</Chip>)}</div></div>
            </div>
            <div className="sheet-foot">
              <button type="button" className="sheet-clear" onClick={clearAll}>ล้างทั้งหมด</button>
              <button type="button" className="sheet-apply" onClick={apply}>ดูผลลัพธ์</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
