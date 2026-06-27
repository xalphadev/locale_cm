'use client';
import { Fragment, useMemo, useState } from 'react';
import Link from 'next/link';
import { Icon } from '../ui';
import { ConfirmSubmit } from '../ConfirmSubmit';
import { addRoomBlockAction, cancelRoomBlockAction, checkInAction, checkOutAction, editRoomBlockAction, moveBlockAction, bulkBlockRoomsAction } from '../../actions';
import { useSheetAnim } from './useSheetAnim';
import DateRangePicker from '../DateRangePicker';

// Interactive property timeline (rooms × the visible day window). Bookings render as CONTINUOUS BARS with
// the guest name on them; rooms group by floor (collapsible) and are filterable + searchable for big
// properties. Tap two FREE cells in one room to block a range (addRoomBlockAction); tap a BAR to see/remove
// it (cancelRoomBlockAction). All date math is YYYY-MM-DD string compare. No schema, no money.
type Blk = { id: string; s: string; e: string | null; k: string; note: string | null; guest: string | null; ref: string | null; bid: string | null; cin: string | null; cout: string | null };
export type TLRoom = {
  id: string; code: string; floor: string | null; guest: string | null;
  rental_mode: string; occupancy_status: string; occupied_until: string | null; blocks: Blk[];
  unitId: string; unitName: string; priceMinor: number | null; pricePeriod: string | null; capacity: number | null; bedrooms: number | null; unitSort: number;
};
const DOW = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
// pastel pairs (bg + text) — softer than solid bars, dark readable text (matches the PMS reference). NO purple.
const KSTYLE: Record<string, { bg: string; fg: string }> = {
  stay: { bg: '#dbeafe', fg: '#1d4ed8' }, tenancy: { bg: '#dbeafe', fg: '#1d4ed8' }, occupied: { bg: '#dbeafe', fg: '#1d4ed8' },
  reserved: { bg: '#fef3c7', fg: '#b45309' }, maintenance: { bg: '#e9ebef', fg: '#52525b' }, hold: { bg: '#ccfbf1', fg: '#0f766e' },
};
const Kst = (k: string) => KSTYLE[k] || KSTYLE.stay;
const KLABEL: Record<string, string> = { stay: 'เข้าพัก', tenancy: 'สัญญาเช่า', reserved: 'จอง', occupied: 'มีผู้เช่า', maintenance: 'ปิดซ่อม', hold: 'กันห้อง' };

export function PropertyTimeline({ rooms, days, today, term, returnTo }: { rooms: TLRoom[]; days: string[]; today: string; term: string; returnTo: string }) {
  const [sel, setSel] = useState<{ roomId: string; code: string; a: string; b: string | null } | null>(null);
  const [open, setOpen] = useState<{ blk: Blk; code: string; roomId: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [moving, setMoving] = useState(false);
  const [typeF, setTypeF] = useState('all');
  const [qstr, setQstr] = useState('');
  const [findMode, setFindMode] = useState(false);
  const [fFrom, setFFrom] = useState<string | null>(null);
  const [fTo, setFTo] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkSel, setBulkSel] = useState<Set<string>>(new Set());
  const [bulkKind, setBulkKind] = useState<'maintenance' | 'hold'>('maintenance');
  const [bulkDates, setBulkDates] = useState(false);
  const toggleRoom = (id: string) => setBulkSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleType = (rs: TLRoom[]) => setBulkSel((p) => { const n = new Set(p); const all = rs.every((r) => n.has(r.id)); rs.forEach((r) => all ? n.delete(r.id) : n.add(r.id)); return n; });
  const bulkExit = () => { setBulkOpen(false); setBulkSel(new Set()); setBulkKind('maintenance'); setBulkDates(false); };
  const [movesOpen, setMovesOpen] = useState(false);
  const [mvq, setMvq] = useState('');
  const [toolsOpen, setToolsOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const openShown = useSheetAnim(!!open);
  const movesShown = useSheetAnim(movesOpen);
  const toolsShown = useSheetAnim(toolsOpen);
  const typeShown = useSheetAnim(typeOpen);
  const bulkShown = useSheetAnim(bulkOpen);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggle = (t: string) => setCollapsed((p) => { const n = new Set(p); n.has(t) ? n.delete(t) : n.add(t); return n; });
  const money = (m: number | null, p: string | null) => (m == null ? '' : `฿${(m / 100).toLocaleString('th-TH')}${p === 'night' ? '/คืน' : p === 'month' ? '/เดือน' : ''}`);
  const bedTag = (r: TLRoom) => (r.capacity ? `${r.capacity} คน` : r.bedrooms ? `${r.bedrooms} ห้องนอน` : '');

  const types = useMemo(() => {
    const m = new Map<string, { name: string; n: number }>();
    for (const r of rooms) { const e = m.get(r.unitId) || { name: r.unitName, n: 0 }; e.n++; m.set(r.unitId, e); }
    return [...m.entries()];
  }, [rooms]);

  const ql = qstr.trim().toLowerCase();
  const shown = rooms.filter((r) => (typeF === 'all' || r.unitId === typeF)
    && (!ql || r.code.toLowerCase().includes(ql) || (r.guest && r.guest.toLowerCase().includes(ql))));
  const groups: { id: string; rooms: TLRoom[] }[] = [];
  for (const r of shown) { const last = groups[groups.length - 1]; if (!last || last.id !== r.unitId) groups.push({ id: r.unitId, rooms: [r] }); else last.rooms.push(r); }

  const cover = (r: TLRoom, day: string): { blk: Blk | null; flag: boolean } => {
    for (const bl of r.blocks) if (bl.s <= day && (!bl.e || day < bl.e)) return { blk: bl, flag: false };
    if (r.rental_mode !== 'daily' && r.occupancy_status && r.occupancy_status !== 'vacant' && (!r.occupied_until || day < r.occupied_until)) return { blk: null, flag: true };
    return { blk: null, flag: false };
  };
  const dayOcc = (day: string) => { let occ = 0; for (const r of rooms) { const c = cover(r, day); if (c.blk || c.flag) occ++; } return { occ, pct: rooms.length ? Math.round((occ / rooms.length) * 100) : 0 }; };
  const typeAvail = (rs: TLRoom[], day: string) => rs.filter((r) => { const c = cover(r, day); return !c.blk && !c.flag; }).length;   // free rooms of this type on a day
  const inSel = (r: TLRoom, day: string) => !!sel && sel.roomId === r.id && (sel.b ? day >= sel.a && day < sel.b : day === sel.a);
  const rangeClear = (r: TLRoom, a: string, b: string) => days.every((d) => !(d >= a && d < b) || (!cover(r, d).blk && !cover(r, d).flag));
  const onFree = (r: TLRoom, day: string) => {
    if (findMode || day < today) return;   // in find-mode the header drives the range, not room cells
    setOpen(null);
    if (!sel || sel.roomId !== r.id || sel.b) setSel({ roomId: r.id, code: r.code, a: day, b: null });
    else if (day > sel.a && rangeClear(r, sel.a, day)) setSel({ ...sel, b: day });
    else setSel({ roomId: r.id, code: r.code, a: day, b: null });
  };

  // "หาห้องว่าง": tap two header dates → rooms free EVERY day across [from,to); tap a result → prefilled create
  const onHeader = (day: string) => {
    if (!findMode || day < today) return;
    if (!fFrom || fTo) { setFFrom(day); setFTo(null); }
    else if (day > fFrom) setFTo(day);
    else { setFFrom(day); setFTo(null); }
  };
  const findDays = fFrom && fTo ? days.filter((d) => d >= fFrom && d < fTo) : [];
  const freeRooms = fFrom && fTo ? rooms.filter((r) => findDays.every((d) => { const c = cover(r, d); return !c.blk && !c.flag; })) : [];
  const freeSet = new Set(freeRooms.map((r) => r.id));
  const exitFind = () => { setFindMode(false); setFFrom(null); setFTo(null); };
  const clearDates = () => { setFFrom(null); setFTo(null); };   // re-pick without leaving find-mode
  const quickBook = (r: TLRoom) => { setSel({ roomId: r.id, code: r.code, a: fFrom!, b: fTo! }); exitFind(); };
  // Thai short date "29 มิ.ย." — UTC getters (every date here is a YYYY-MM-DD UTC-compared string)
  const fmtTh = (s: string) => new Date(s + 'T00:00:00Z').toLocaleDateString('th-TH', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const findRange = fFrom && fTo ? `${fmtTh(fFrom)} – ${fmtTh(fTo)} · ${findDays.length} คืน` : '';

  // today's arrivals / departures (computed from the blocks already loaded) — only when today is in view
  const todayIn = days.includes(today);
  type Mv = { code: string; guest: string | null; blk: Blk; roomId: string };
  const arrivals: Mv[] = []; const departures: Mv[] = [];
  if (todayIn) for (const r of rooms) for (const bl of r.blocks) {
    if ((bl.k === 'stay' || bl.k === 'tenancy')) {
      if (bl.s === today) arrivals.push({ code: r.code, guest: bl.guest, blk: bl, roomId: r.id });
      if (bl.e === today) departures.push({ code: r.code, guest: bl.guest, blk: bl, roomId: r.id });
    }
  }
  const openBlk = (m: Mv) => { setOpen({ blk: m.blk, code: m.code, roomId: m.roomId }); setEditing(false); setMoving(false); setSel(null); setMovesOpen(false); };
  const activeTool = findMode ? 'หาห้องว่าง' : bulkOpen ? 'ปิดหลายห้อง' : null;   // a tool mode is live → trigger flips to exit
  const hasMoves = arrivals.length > 0 || departures.length > 0;
  const typeLabel = typeF === 'all' ? 'ทุกประเภท' : (types.find(([id]) => id === typeF)?.[1].name ?? 'ประเภท');
  const oneType = types.length <= 1;

  // build a room's cells: continuous bars (colSpan) for booked spans, single cells for free/flag days
  const cells = (r: TLRoom) => {
    const out: any[] = [];
    let i = 0;
    while (i < days.length) {
      const c = cover(r, days[i]);
      if (c.blk) {
        let span = 1;
        while (i + span < days.length && cover(r, days[i + span]).blk?.id === c.blk.id) span++;
        const blk = c.blk; const st = Kst(blk.k);
        out.push(
          <td key={i} colSpan={span} className="cal-cell" onClick={() => { setOpen(open?.blk.id === blk.id ? null : { blk, code: r.code, roomId: r.id }); setEditing(false); setMoving(false); setSel(null); }}>
            <div className="cal-bar" style={{ background: st.bg, color: st.fg }}>
              {blk.ref ? <i className="cal-bar-ref">{blk.ref}{blk.cin && !blk.cout ? <b className="cal-bar-dot" /> : null}</i> : null}
              <span>{blk.guest || KLABEL[blk.k] || ''}</span>
            </div>
          </td>,
        );
        i += span;
      } else if (c.flag) {
        out.push(<td key={i} className="cal-cell cal-busy" style={{ background: Kst(r.occupancy_status).bg }} />);
        i++;
      } else {
        const day = days[i]; const past = day < today;
        out.push(<td key={i} className={`cal-cell cal-free ${inSel(r, day) ? 'sel' : ''} ${past ? 'pa' : ''} ${day === today ? 'tdy' : ''}`} onClick={() => onFree(r, day)} />);
        i++;
      }
    }
    return out;
  };

  return (
    <>
      <div className="calctl">
        {searching || oneType ? (
          <div className="calctl-search">
            <Icon n="search" size={15} />
            <input value={qstr} onChange={(e) => setQstr(e.target.value)} placeholder="ค้นหาเลขห้อง / ชื่อแขก" inputMode="search" autoFocus={searching} onBlur={() => { if (!qstr) setSearching(false); }} />
            {qstr && <button type="button" onClick={() => { setQstr(''); if (searching) setSearching(false); }} aria-label="ล้าง"><Icon n="x" size={14} /></button>}
          </div>
        ) : (
          <>
            <button type="button" className={`calctl-type ${typeF !== 'all' ? 'on' : ''}`} onClick={() => setTypeOpen(true)}>
              <span>{typeLabel}</span><Icon n="chevD" size={14} />
            </button>
            <button type="button" className={`calctl-ic ${qstr ? 'on' : ''}`} onClick={() => setSearching(true)} aria-label="ค้นหา"><Icon n="search" size={17} /></button>
          </>
        )}
        {hasMoves && (
          <button type="button" className="calctl-ic calctl-today" onClick={() => { setMvq(''); setMovesOpen(true); setOpen(null); }} aria-label="เข้า–ออกวันนี้">
            <Icon n="calendar" size={17} /><i className="calctl-bdg">{arrivals.length + departures.length}</i>
          </button>
        )}
        <button type="button" className={`calctl-ic ${activeTool ? 'on' : ''}`} onClick={() => { activeTool ? (exitFind(), bulkExit()) : setToolsOpen(true); }} aria-label={activeTool ? `ออกจาก ${activeTool}` : 'เครื่องมือ'}>
          <Icon n={activeTool ? 'x' : 'grid'} size={17} />
        </button>
      </div>

      {toolsOpen && (
        <>
          <div className={`mbsheet-scrim ${toolsShown ? 'in' : ''}`} onClick={() => setToolsOpen(false)} />
          <div className={`mbsheet ${toolsShown ? 'in' : ''}`} role="dialog" aria-label="เครื่องมือ">
            <span className="mbsheet-handle" onClick={() => setToolsOpen(false)} aria-hidden />
            <div className="mbsheet-hd"><b>เครื่องมือ</b><button type="button" className="mbsheet-x" onClick={() => setToolsOpen(false)} aria-label="ปิด"><Icon n="x" size={16} /></button></div>
            <div className="mbsheet-body">
              <button type="button" className="caltools-row" onClick={() => { setToolsOpen(false); setFindMode(true); bulkExit(); setSel(null); setOpen(null); setMovesOpen(false); }}>
                <span className="caltools-ic"><Icon n="search" size={18} /></span>
                <span className="caltools-tx"><b>หาห้องว่าง</b><i>เลือกช่วงวัน แล้วดูห้องที่ว่างทุกวัน</i></span>
                <Icon n="chevR" size={16} />
              </button>
              <button type="button" className="caltools-row" onClick={() => { setToolsOpen(false); setBulkOpen(true); setFindMode(false); setFFrom(null); setFTo(null); setSel(null); setOpen(null); setMovesOpen(false); }}>
                <span className="caltools-ic"><Icon n="grid" size={18} /></span>
                <span className="caltools-tx"><b>ปิดหลายห้อง</b><i>ปิดซ่อม / กันห้องหลายห้องพร้อมกัน</i></span>
                <Icon n="chevR" size={16} />
              </button>
            </div>
          </div>
        </>
      )}

      {typeOpen && (
        <>
          <div className={`mbsheet-scrim ${typeShown ? 'in' : ''}`} onClick={() => setTypeOpen(false)} />
          <div className={`mbsheet ${typeShown ? 'in' : ''}`} role="dialog" aria-label="ประเภทห้อง">
            <span className="mbsheet-handle" onClick={() => setTypeOpen(false)} aria-hidden />
            <div className="mbsheet-hd"><b>ประเภทห้อง</b><button type="button" className="mbsheet-x" onClick={() => setTypeOpen(false)} aria-label="ปิด"><Icon n="x" size={16} /></button></div>
            <div className="mbsheet-body">
              <button type="button" className={`caltype-row ${typeF === 'all' ? 'on' : ''}`} onClick={() => { setTypeF('all'); setTypeOpen(false); }}>
                <span>ทุกประเภท</span><i>{rooms.length}</i>{typeF === 'all' && <Icon n="check" size={16} />}
              </button>
              {types.map(([id, t]) => (
                <button type="button" key={id || '_'} className={`caltype-row ${typeF === id ? 'on' : ''}`} onClick={() => { setTypeF(id); setTypeOpen(false); }}>
                  <span>{t.name}</span><i>{t.n}</i>{typeF === id && <Icon n="check" size={16} />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {findMode && (
        <div className="calfind">
          {!(fFrom && fTo) ? (
            <div className="calfind-row1">
              <span className="calfind-hint"><Icon n="calendar" size={14} /> {!fFrom ? 'แตะ “วันเข้า” บนหัวตาราง' : 'แตะ “วันออก” (เช็คเอาท์)'}</span>
              <button type="button" className="calfind-x" onClick={exitFind} aria-label="ปิด"><Icon n="x" size={15} /></button>
            </div>
          ) : (
            <>
              <div className="calfind-top">
                <span className={`calfind-badge ${freeRooms.length ? 'ok' : 'no'}`}><Icon n={freeRooms.length ? 'check' : 'x'} size={15} /></span>
                <div className="calfind-head">
                  <b>{freeRooms.length > 0 ? `ว่าง ${freeRooms.length} ห้อง` : 'ไม่มีห้องว่างช่วงนี้'}</b>
                  <span className="calfind-sub">{findRange}<button type="button" className="calfind-redo" onClick={clearDates}>เปลี่ยนวัน</button></span>
                </div>
                <button type="button" className="calfind-x" onClick={exitFind} aria-label="ปิด"><Icon n="x" size={16} /></button>
              </div>
              {freeRooms.length > 0 && (
                <div className="calfind-list">
                  {freeRooms.map((r) => (
                    <button type="button" key={r.id} className="calfind-room" onClick={() => quickBook(r)}>
                      <span className="calfind-rt">
                        <b>ห้อง {r.code}</b>
                        <i>{[r.unitName, r.floor ? `${term} ${r.floor}` : '', money(r.priceMinor, r.pricePeriod)].filter(Boolean).join(' · ')}</i>
                      </span>
                      <span className="calfind-go">จอง <Icon n="chevR" size={14} /></span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {bulkOpen && (
        <>
          <div className={`mbsheet-scrim ${bulkShown ? 'in' : ''}`} onClick={bulkExit} />
          <form className={`mbsheet bulksheet ${bulkShown ? 'in' : ''}`} action={bulkBlockRoomsAction} role="dialog" aria-label="ปิดหลายห้อง">
            <input type="hidden" name="returnTo" value={returnTo} />
            <input type="hidden" name="block_kind" value={bulkKind} />
            {[...bulkSel].map((id) => <input key={id} type="hidden" name="room" value={id} />)}
            <span className="mbsheet-handle" onClick={bulkExit} aria-hidden />
            <div className="mbsheet-hd"><b>ปิดหลายห้อง</b><button type="button" className="mbsheet-x" onClick={bulkExit} aria-label="ปิด"><Icon n="x" size={16} /></button></div>
            <div className="mbsheet-body bulksheet-body">
              <label className="bulk-lbl">ช่วงวันที่</label>
              <DateRangePicker fromName="start_date" toName="end_date" labelFrom="เริ่ม" labelTo="ถึง (เช็คเอาท์)" onChange={(f, t) => setBulkDates(!!(f && t))} />

              <label className="bulk-lbl">ปิดเพราะอะไร</label>
              <div className="bulkkind">
                <button type="button" className={`bulkkind-c ${bulkKind === 'maintenance' ? 'on' : ''}`} onClick={() => setBulkKind('maintenance')}>
                  <b>ปิดซ่อม</b><i>งานปรับปรุง</i>{bulkKind === 'maintenance' && <Icon n="check" size={15} />}
                </button>
                <button type="button" className={`bulkkind-c ${bulkKind === 'hold' ? 'on' : ''}`} onClick={() => setBulkKind('hold')}>
                  <b>กันห้อง</b><i>เก็บชั่วคราว</i>{bulkKind === 'hold' && <Icon n="check" size={15} />}
                </button>
              </div>

              <label className="bulk-lbl">เลือกห้อง</label>
              <div className="bulkpick">
                {groups.map((g) => {
                  const allOn = g.rooms.every((r) => bulkSel.has(r.id));
                  return (
                    <div className="bulkpick-g" key={g.id || '_'}>
                      <div className="bulkpick-gh">
                        <span>{g.rooms[0].unitName}</span>
                        <button type="button" className="bulkpick-all" onClick={() => toggleType(g.rooms)}>{allOn ? 'เอาออกทั้งหมด' : 'เลือกทั้งหมด'}</button>
                      </div>
                      <div className="bulkpick-r">
                        {g.rooms.map((r) => {
                          const on = bulkSel.has(r.id);
                          return (
                            <button type="button" key={r.id} className={`bulkchip ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => toggleRoom(r.id)}>
                              {r.code}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <input name="note" className="bulk-note" placeholder="โน้ต (เช่น ทำความสะอาดใหญ่ / งานปรับปรุง)" maxLength={120} />
            </div>
            <div className="mbsheet-foot">
              <span className="bulk-count">{bulkSel.size > 0 ? `เลือก ${bulkSel.size} ห้อง` : 'ยังไม่ได้เลือกห้อง'}</span>
              <button type="submit" className="dbtn primary bulk-go" disabled={bulkSel.size === 0 || !bulkDates}>ปิด {bulkSel.size} ห้อง</button>
            </div>
          </form>
        </>
      )}

      {shown.length === 0 ? (
        <div className="nomatch">ไม่พบห้องที่ตรงตัวกรอง</div>
      ) : (
        <div className="caltl">
          <table className="caltl-t calbars">
            <colgroup><col className="cal-col-rh" />{days.map((d) => <col key={d} className="cal-col-d" />)}</colgroup>
            <thead>
              <tr><th className="caltl-rh">ห้อง</th>{days.map((d) => { const dt = new Date(d + 'T00:00:00Z'); const o = dayOcc(d); const inR = findMode && ((fFrom && fTo && d >= fFrom && d < fTo) || (fFrom && !fTo && d === fFrom)); return <th key={d} onClick={() => onHeader(d)} className={`caltl-dh ${d === today ? 'tdy' : ''} ${findMode && d >= today ? 'pick' : ''} ${inR ? 'inr' : ''}`}><span>{DOW[dt.getUTCDay()]}</span><b>{dt.getUTCDate()}</b><span className={`caltl-occ ${o.occ ? '' : 'z'}`} title={`เข้าพัก ${o.occ}/${rooms.length}`}><i>{o.occ}</i>{o.pct}%</span></th>; })}</tr>
            </thead>
            <tbody>
              {groups.map((g) => { const t = g.rooms[0]; const col = collapsed.has(g.id); const sub = [`${g.rooms.length} ห้อง`, money(t.priceMinor, t.pricePeriod), bedTag(t)].filter(Boolean).join(' · '); return (
                <Fragment key={g.id || '_'}>
                  <tr className="cal-type">
                    <th className="cal-type-h" colSpan={days.length + 1} onClick={() => toggle(g.id)}>
                      <span className="cal-type-pin">
                        <Icon n={col ? 'chevR' : 'chevD'} size={14} />
                        <span className="cal-type-nm">{t.unitName}</span>
                        <span className="cal-type-sub">{sub}</span>
                      </span>
                    </th>
                  </tr>
                  {!col && (
                    <tr className="cal-typeav">
                      <th className="cal-typeav-rh">ว่าง</th>
                      {days.map((d) => { const a = typeAvail(g.rooms, d); return <td key={d} className={`cal-type-av ${a ? '' : 'z'}`}>{a}</td>; })}
                    </tr>
                  )}
                  {!col && g.rooms.map((r) => (
                    <tr key={r.id} className={findMode && fFrom && fTo ? (freeSet.has(r.id) ? 'cal-find-free' : 'cal-find-busy') : ''}>
                      <th className="caltl-rh"><Link href={`/merchant/units/${r.id}`}><b className="caltl-code">{r.code}</b>{r.floor ? <span className="caltl-fl">{term} {r.floor}</span> : null}</Link></th>
                      {cells(r)}
                    </tr>
                  ))}
                </Fragment>
              ); })}
            </tbody>
          </table>
        </div>
      )}

      {sel && !sel.b && <p className="note" style={{ margin: '8px 2px' }}>ห้อง {sel.code}: แตะวัน<b>เช็คเอาท์</b>อีกครั้งเพื่อเลือกช่วง · <button type="button" className="lnk-btn" onClick={() => setSel(null)}>ยกเลิก</button></p>}

      {sel && sel.b && (
        <form className="tl-add" action={addRoomBlockAction.bind(null, sel.roomId)}>
          <div className="tl-add-h">ห้อง {sel.code} · {sel.a} → {sel.b} <span className="muted">(เช็คเอาท์)</span></div>
          <input type="hidden" name="start_date" value={sel.a} />
          <input type="hidden" name="end_date" value={sel.b} />
          <div className="field"><label>ประเภท</label>
            <select name="block_kind" defaultValue="stay"><option value="stay">การจอง / เข้าพัก</option><option value="maintenance">ปิดซ่อม</option><option value="hold">กันห้อง (ชั่วคราว)</option></select>
          </div>
          <div className="fgrid">
            <div className="field"><label>ชื่อผู้จอง (ถ้าเป็นการจอง)</label><input name="guest_name" maxLength={80} placeholder="ชื่อ-นามสกุล" /></div>
            <div className="field"><label>เบอร์โทร</label><input name="guest_phone" maxLength={40} inputMode="tel" placeholder="08x-xxx-xxxx" /></div>
          </div>
          <input name="note" placeholder="โน้ต (เห็นเฉพาะคุณ)" />
          <div className="tl-add-acts">
            <button type="button" className="dbtn" onClick={() => setSel(null)}>ยกเลิก</button>
            <button type="submit" className="dbtn primary">บันทึกช่วงนี้</button>
          </div>
        </form>
      )}

      {open && (() => { const b = open.blk; const live = b.cin && !b.cout; const close = () => { setOpen(null); setEditing(false); setMoving(false); }; return (
        <>
        <div className={`mbsheet-scrim ${openShown ? 'in' : ''}`} onClick={close} />
        <div className={`mbsheet ${openShown ? 'in' : ''}`} role="dialog" aria-modal="true">
          <span className="mbsheet-handle" onClick={close} aria-hidden />
          <div className="mbsheet-body tl-sheetbody">
          <div className="tl-pop-l">
            <b>{b.ref ? `${b.ref} · ` : ''}ห้อง {open.code}{b.guest ? ` · ${b.guest}` : ''}</b>
            <span>{KLABEL[b.k] || b.k} · {b.s} → {b.e || 'ต่อเนื่อง'}{b.cout ? ' · เช็คเอาท์แล้ว' : live ? ' · กำลังพัก' : ''}{b.note ? ` · ${b.note}` : ''}</span>
          </div>
          {editing ? (
            <form className="tl-edit" action={editRoomBlockAction.bind(null, b.id)}>
              <input type="hidden" name="returnTo" value={returnTo} />
              <input type="hidden" name="block_kind" value={b.k} />
              <div className="fgrid">
                <div className="field"><label>เข้า</label><input type="date" name="start_date" defaultValue={b.s} required /></div>
                <div className="field"><label>ออก (เช็คเอาท์)</label><input type="date" name="end_date" defaultValue={b.e || ''} min={b.s} /></div>
              </div>
              <input name="note" defaultValue={b.note || ''} placeholder="โน้ต (เห็นเฉพาะคุณ)" maxLength={120} />
              <div className="tl-pop-a">
                <button type="button" className="dbtn sm" onClick={() => setEditing(false)}>ยกเลิก</button>
                <button type="submit" className="dbtn sm primary">บันทึกวันที่</button>
              </div>
            </form>
          ) : moving ? (() => {
            // dest options = other rooms free across every day this block covers (in the window); GiST is the backstop
            const blkDays = days.filter((d) => d >= b.s && (!b.e || d < b.e));
            const destOpts = rooms.filter((r) => r.id !== open.roomId && (blkDays.length === 0 || blkDays.every((d) => { const c = cover(r, d); return !c.blk && !c.flag; })));
            return (
              <form className="tl-edit" action={moveBlockAction.bind(null, b.id)}>
                <input type="hidden" name="returnTo" value={returnTo} />
                <div className="field"><label>ย้ายไปห้อง (ว่างตลอดช่วงนี้)</label>
                  <select name="dest" defaultValue="" required>
                    <option value="" disabled>เลือกห้องปลายทาง</option>
                    {destOpts.map((r) => <option key={r.id} value={r.id}>ห้อง {r.code} · {r.unitName}</option>)}
                  </select>
                </div>
                {destOpts.length === 0 && <p className="note" style={{ margin: 0 }}>ไม่มีห้องอื่นที่ว่างตลอดช่วงนี้</p>}
                <div className="tl-pop-a">
                  <button type="button" className="dbtn sm" onClick={() => setMoving(false)}>ยกเลิก</button>
                  <button type="submit" className="dbtn sm primary" disabled={destOpts.length === 0}>ย้าย →</button>
                </div>
              </form>
            );
          })() : (
            <div className="tl-pop-a">
              {b.bid && !b.cin && (
                <form action={checkInAction.bind(null, b.bid)}><input type="hidden" name="returnTo" value={returnTo} /><button type="submit" className="dbtn sm primary">เช็คอิน</button></form>
              )}
              {b.bid && live && (
                <form action={checkOutAction.bind(null, b.bid)}><input type="hidden" name="returnTo" value={returnTo} /><ConfirmSubmit message="เช็คเอาท์ห้องนี้? ห้องจะกลับมาว่างให้จองใหม่ทันที" className="dbtn sm primary">เช็คเอาท์</ConfirmSubmit></form>
              )}
              <button type="button" className="dbtn sm" onClick={() => setEditing(true)}><Icon n="calendar" size={14} /> แก้/ขยายวัน</button>
              <button type="button" className="dbtn sm" onClick={() => setMoving(true)}><Icon n="grid" size={14} /> ย้ายห้อง</button>
              {b.bid && <Link className="dbtn sm" href={`/merchant/bookings/${b.bid}`}>รายละเอียด ›</Link>}
              {!b.cin && <form action={cancelRoomBlockAction.bind(null, b.id)}><ConfirmSubmit message="เอาช่วงนี้ออก? วันที่จะกลับมาว่างให้จองใหม่ทันที" className="dbtn sm danger">เอาออก</ConfirmSubmit></form>}
              <button type="button" className="dbtn sm" onClick={close}>ปิด</button>
            </div>
          )}
          </div>
        </div>
        </>
      ); })()}

      {movesOpen && (() => {
        const mq = mvq.trim().toLowerCase();
        const hit = (m: Mv) => !mq || m.code.toLowerCase().includes(mq) || (!!m.guest && m.guest.toLowerCase().includes(mq));
        const byCode = (a: Mv, b: Mv) => a.code.localeCompare(b.code, undefined, { numeric: true });
        const arr = arrivals.filter(hit).sort(byCode);
        const dep = departures.filter(hit).sort(byCode);
        const tap = (m: Mv) => { setMovesOpen(false); openBlk(m); };
        return (
          <>
            <div className={`mbsheet-scrim ${movesShown ? 'in' : ''}`} onClick={() => setMovesOpen(false)} />
            <div className={`mbsheet ${movesShown ? 'in' : ''}`} role="dialog" aria-label="เข้า–ออกวันนี้">
              <span className="mbsheet-handle" onClick={() => setMovesOpen(false)} aria-hidden />
              <div className="mbsheet-hd"><b>เข้า–ออกวันนี้</b><button type="button" className="mbsheet-x" onClick={() => setMovesOpen(false)} aria-label="ปิด"><Icon n="x" size={16} /></button></div>
              {(arrivals.length + departures.length) > 6 && (
                <div className="calsearch tlmoves-sr">
                  <Icon n="search" size={15} />
                  <input value={mvq} onChange={(e) => setMvq(e.target.value)} placeholder="ค้นหาเลขห้อง / ชื่อแขก" inputMode="search" />
                  {mvq && <button type="button" onClick={() => setMvq('')} aria-label="ล้าง"><Icon n="x" size={13} /></button>}
                </div>
              )}
              <div className="mbsheet-body">
                {arr.length > 0 && <div className="tlmoves-sec"><span className="caltoday-l in">🛬 เข้าวันนี้ {arr.length}</span></div>}
                {arr.map((m, i) => (
                  <button type="button" key={'a' + i} className="tlmoves-row" onClick={() => tap(m)}>
                    <b>ห้อง {m.code}</b><span>{m.guest || KLABEL[m.blk.k]}</span><Icon n="chevR" size={15} />
                  </button>
                ))}
                {dep.length > 0 && <div className="tlmoves-sec"><span className="caltoday-l out">🛫 ออกวันนี้ {dep.length}</span></div>}
                {dep.map((m, i) => (
                  <button type="button" key={'d' + i} className={`tlmoves-row ${m.blk.cin && !m.blk.cout ? 'live' : ''}`} onClick={() => tap(m)}>
                    <b>ห้อง {m.code}</b><span>{m.guest || KLABEL[m.blk.k]}{m.blk.cin && !m.blk.cout ? ' · กำลังพัก' : ''}</span><Icon n="chevR" size={15} />
                  </button>
                ))}
                {arr.length === 0 && dep.length === 0 && <p className="nomatch">ไม่พบ</p>}
              </div>
            </div>
          </>
        );
      })()}

      <div className="callegend">
        <span><i style={{ background: KSTYLE.stay.bg }} /> เข้าพัก/เช่า</span>
        <span><i style={{ background: KSTYLE.reserved.bg }} /> จอง</span>
        <span><i style={{ background: KSTYLE.maintenance.bg }} /> ปิดซ่อม</span>
        <span><i style={{ background: KSTYLE.hold.bg }} /> กันห้อง</span>
        <span><i style={{ background: '#fafbfd', boxShadow: 'inset 0 0 0 1px #e0e3e8' }} /> ว่าง</span>
        <span style={{ opacity: .65 }}>แตะ 2 วัน = สร้างช่วง</span>
      </div>
    </>
  );
}
