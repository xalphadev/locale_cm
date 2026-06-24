'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { Icon } from '../ui';
import { setRoomOccupancyAction, setRoomsOccupancyBulkAction, deleteRoomsBulkAction } from '../../actions';

// Scalable room board for 1 → 100s of rooms: status filter + search + density toggle (cards ⇄ compact
// chips) + collapsible floors. Compact mode is the "room rack" view — dozens of rooms per screen,
// colour = status, tap → manage. Auto-compact past 24 rooms.
export type BoardRoom = {
  id: string; code: string; floor: string | null; room_kind: string; status: string;
  occupied_until: string | null; note: string | null; type: string; monthly: boolean;
  guest: string | null; guestPhone: string | null;
};
const ST: Record<string, { label: string; color: string }> = {
  vacant: { label: 'ว่าง', color: '#12b76a' },
  occupied: { label: 'มีผู้เช่า', color: '#3b82f6' },
  reserved: { label: 'จองแล้ว', color: '#f59e0b' },
  maintenance: { label: 'ปิดซ่อม', color: '#9aa0a6' },
};
const FILTERS: [string, string][] = [['all', 'ทั้งหมด'], ['vacant', 'ว่าง'], ['occupied', 'มีผู้เช่า'], ['reserved', 'จอง'], ['maintenance', 'ปิดซ่อม']];
const COLL = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });   // A1, A2 … A10 (not A1, A10, A2)
const untilTxt = (d: any) => { if (!d) return ''; const dt = new Date(d); return isNaN(dt.getTime()) ? '' : dt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }); };

export default function RoomBoard({ rooms, groupTerm = 'ชั้น', groupAction }: { rooms: BoardRoom[]; groupTerm?: string; groupAction?: (fd: FormData) => void }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [typeF, setTypeF] = useState('all');
  const [dense, setDense] = useState(rooms.length > 24);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [fabOpen, setFabOpen] = useState(false);
  const [grpOpen, setGrpOpen] = useState(false);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rooms.length };
    for (const r of rooms) c[r.status] = (c[r.status] || 0) + 1;
    return c;
  }, [rooms]);
  const types = useMemo(() => [...new Set(rooms.map((r) => r.type).filter(Boolean))].sort((a, b) => COLL.compare(a, b)), [rooms]);

  const ql = query.trim().toLowerCase();
  const filtered = rooms.filter((r) =>
    (status === 'all' || r.status === status) &&
    (typeF === 'all' || r.type === typeF) &&
    (!ql || r.code.toLowerCase().includes(ql) || (r.type && r.type.toLowerCase().includes(ql)) || (r.note && r.note.toLowerCase().includes(ql)) || (r.guest && r.guest.toLowerCase().includes(ql))));

  const byFloor: Record<string, BoardRoom[]> = {}; const floors: string[] = [];
  for (const r of filtered) { const f = r.floor || '—'; if (!byFloor[f]) { byFloor[f] = []; floors.push(f); } byFloor[f].push(r); }
  floors.sort((a, b) => (a === '—' ? -1 : b === '—' ? 1 : COLL.compare(a, b)));   // unspecified floor first, then natural
  for (const f of floors) byFloor[f].sort((a, b) => COLL.compare(a.code, b.code));

  // multi-select → bulk status (with undo). The same setRoomsOccupancyBulkAction does apply + undo.
  const STATUSES = (['vacant', 'occupied', 'reserved', 'maintenance'] as const).map((k) => ({ k, label: ST[k].label, color: ST[k].color }));
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [undo, setUndo] = useState<{ items: { id: string; status: string }[]; label: string } | null>(null);
  const [, startTransition] = useTransition();
  useEffect(() => { if (!undo) return; const t = setTimeout(() => setUndo(null), 6000); return () => clearTimeout(t); }, [undo]);
  const toggleSel = (id: string) => setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectGroup = (ids: string[]) => setSelected((p) => { const n = new Set(p); const allIn = ids.every((i) => n.has(i)); ids.forEach((i) => (allIn ? n.delete(i) : n.add(i))); return n; });
  const exitSelect = () => { setSelectMode(false); setSelected(new Set()); };
  const tileClick = (e: any, id: string) => { if (selectMode) { e.preventDefault(); toggleSel(id); } };
  const applyBulk = (status: string, label: string) => {
    const prev = rooms.filter((r) => selected.has(r.id)).map((r) => ({ id: r.id, status: r.status }));
    if (!prev.length) return;
    startTransition(() => { setRoomsOccupancyBulkAction(prev.map((p) => ({ id: p.id, status }))); });
    setUndo({ items: prev, label }); exitSelect();
  };
  const doDelete = () => { const ids = [...selected]; if (!ids.length) return; if (typeof window !== 'undefined' && !window.confirm(`ลบ ${ids.length} ห้อง? กู้คืนได้ในถังขยะ`)) return; startTransition(() => { deleteRoomsBulkAction(ids); }); exitSelect(); };
  const doUndo = () => { if (!undo) return; const u = undo; startTransition(() => { setRoomsOccupancyBulkAction(u.items); }); setUndo(null); };

  return (
    <>
      <div className="rfilter">
        <div className="rfsearch">
          <Icon n="search" size={16} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ค้นหา ห้อง / ชื่อผู้เช่า / โน้ต" />
          {query && <button type="button" onClick={() => setQuery('')} aria-label="ล้าง"><Icon n="x" size={15} /></button>}
        </div>
        <button type="button" className={`rfdense ${dense ? 'on' : ''}`} onClick={() => setDense((d) => !d)} aria-label="สลับมุมมอง" title={dense ? 'มุมมองการ์ด' : 'มุมมองผังย่อ'}>
          <Icon n={dense ? 'feed' : 'grid'} size={17} />
        </button>
      </div>

      <div className="rfchips">
        {types.length > 1 && (
          <div className={`rftype ${typeF !== 'all' ? 'on' : ''}`}>
            <Icon n="bed" size={13} />
            <span>{typeF === 'all' ? 'ทุกประเภท' : typeF}</span>
            <Icon n="chevD" size={13} />
            <select value={typeF} onChange={(e) => setTypeF(e.target.value)} aria-label="กรองตามประเภทห้อง">
              <option value="all">ทุกประเภท</option>
              {types.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        )}
        {FILTERS.filter(([k]) => k === 'all' || counts[k]).map(([k, label]) => (
          <button key={k} type="button" className={`rfchip ${status === k ? 'on' : ''}`} onClick={() => setStatus(k)}
            style={k !== 'all' && status === k ? { background: ST[k].color, borderColor: ST[k].color } : undefined}>
            {k !== 'all' && <span className="rfdot" style={{ background: status === k ? 'rgba(255,255,255,.9)' : ST[k].color }} />}
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="nomatch">ไม่พบห้องที่ตรงกับตัวกรอง</div>
      ) : floors.map((f) => (
        <section className="rfloor" key={f}>
          <button type="button" className="rfloor-h" onClick={() => setCollapsed((c) => ({ ...c, [f]: !c[f] }))}>
            <span>{f === '—' ? `ไม่ระบุ${groupTerm}` : `${groupTerm} ${f}`} <em>{byFloor[f].length} ห้อง</em></span>
            <Icon n={collapsed[f] ? 'chevR' : 'chevD'} size={16} />
          </button>
          {selectMode && !collapsed[f] && <button type="button" className="rgroupsel" onClick={() => selectGroup(byFloor[f].map((r) => r.id))}>☑ เลือกทั้ง{f === '—' ? groupTerm : `${groupTerm} ${f}`}</button>}

          {!collapsed[f] && (dense ? (
            <div className="rgrid">
              {byFloor[f].map((r) => {
                // daily rooms don't carry a meaningful occupancy_status flag (the calendar/blocks are the truth)
                // → render NEUTRAL so a date-booked daily room never looks falsely "ว่าง"
                const daily = !r.monthly;
                const st = ST[r.status] || ST.vacant;
                const color = daily ? '#aab1bd' : st.color;
                // [bg-tint%, ring%] — occupied stays calm but clearly blue; vacant/จอง pop stronger; daily muted
                const S: number[] = daily ? [18, 34] : (({ vacant: [42, 62], occupied: [26, 44], reserved: [44, 64], maintenance: [34, 52] } as Record<string, number[]>)[r.status] || [42, 62]);
                const fs = r.code.length <= 3 ? '1rem' : r.code.length <= 5 ? '.86rem' : '.74rem';  // shrink long names so they don't overflow
                return (
                  <Link className={`rchip ${selected.has(r.id) ? 'rsel' : ''}`} key={r.id} href={`/merchant/units/${r.id}`} onClick={(e) => tileClick(e, r.id)} title={`${r.code} · ${daily ? 'รายวัน — ดูปฏิทิน' : st.label}`}
                    style={{ fontSize: fs, background: `color-mix(in srgb, ${color} ${S[0]}%, var(--m-surface,#fff))`, boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${color} ${S[1]}%, transparent)` } as any}>
                    {r.code}
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="roomboard">
              {byFloor[f].map((r) => {
                const daily = !r.monthly;
                const st = daily ? { label: 'รายวัน', color: '#9aa0a6' } : (ST[r.status] || ST.vacant);
                return (
                  <div className="rtile" key={r.id} style={{ '--st': st.color } as any}>
                    <Link className={`rtile-main ${selected.has(r.id) ? 'rsel' : ''}`} href={`/merchant/units/${r.id}`} onClick={(e) => tileClick(e, r.id)}>
                      <div className="rtile-top">
                        <span className="rtile-code">{r.code}{r.room_kind === 'bed' ? <span className="rtile-bed">เตียง</span> : null}</span>
                        <span className="rtile-chip" style={{ color: st.color, background: `color-mix(in srgb, ${st.color} 14%, transparent)` }}>{st.label}</span>
                      </div>
                      {r.guest ? (
                        <span className="rtile-guest"><Icon n="chat" size={12} /> {r.guest}{!daily && r.occupied_until ? <span className="rtile-note"> · ว่าง {untilTxt(r.occupied_until)}</span> : r.note ? <span className="rtile-note"> · {r.note}</span> : ''}</span>
                      ) : (!daily && (r.status === 'occupied' || r.status === 'reserved')) ? (
                        r.note
                          ? <span className="rtile-guest"><Icon n="chat" size={12} /> {r.note}{r.occupied_until ? <span className="rtile-note"> · ว่าง {untilTxt(r.occupied_until)}</span> : ''}</span>
                          : <span className="rtile-addname"><Icon n="chat" size={12} /> ใส่ชื่อผู้เช่า →</span>
                      ) : (
                        <span className="rtile-type">{r.type || 'ไม่ระบุรูปแบบ'}{daily ? <span className="rtile-note"> · ดูสถานะในปฏิทิน</span> : r.note ? ` · ${r.note}` : ''}</span>
                      )}
                    </Link>
                    {!selectMode && (r.guestPhone
                      ? <a className="rtile-act cal" href={`tel:${r.guestPhone}`}><Icon n="phone" size={14} /> โทร</a>
                      : r.monthly
                        ? (
                          <form className="rtile-act" action={setRoomOccupancyAction.bind(null, r.id, r.status === 'vacant' ? 'occupied' : 'vacant')}>
                            <button type="submit">{r.status === 'vacant' ? 'ตั้งมีผู้เช่า' : 'ตั้งว่าง'}</button>
                          </form>
                        )
                        : <Link className="rtile-act cal" href={`/merchant/units/${r.id}`}><Icon n="calendar" size={14} /> ปฏิทิน</Link>)}
                  </div>
                );
              })}
            </div>
          ))}
        </section>
      ))}

      {selectMode && (
        <div className="bulkbar">
          <span className="bulkbar-n">{selected.size ? `${selected.size} ห้อง` : 'แตะห้องที่จะเปลี่ยน'}</span>
          {selected.size > 0 && (
            <div className="bulkbar-acts">
              {STATUSES.map((s) => (
                <button key={s.k} type="button" onClick={() => applyBulk(s.k, s.label)}><i style={{ background: s.color }} /> {s.label}</button>
              ))}
            </div>
          )}
          {selected.size > 0 && <button type="button" className="bulkbar-del" onClick={doDelete}><Icon n="trash" size={14} /> ลบ</button>}
          <button type="button" className="bulkbar-x" onClick={exitSelect}>{selected.size ? 'ยกเลิก' : 'เสร็จ'}</button>
        </div>
      )}
      {undo && <div className="undotoast"><span>เปลี่ยน {undo.items.length} ห้องเป็น “{undo.label}”</span><button type="button" onClick={doUndo}>เลิกทำ</button></div>}

      {/* FAB speed-dial: เพิ่มห้อง · เลือกหลายห้อง · จัดกลุ่ม · พิมพ์ผัง — hidden while selecting (bulkbar owns the bottom) */}
      {!selectMode && (
        <>
          {fabOpen && <div className="fabmenu-scrim" onClick={() => setFabOpen(false)} />}
          <div className="fabwrap">
            {fabOpen && (
              <div className="fabmenu">
                <Link className="fabmenu-i" href="/merchant/units/new" onClick={() => setFabOpen(false)}><span className="fabmenu-ic"><Icon n="plus" size={17} /></span> เพิ่มห้อง</Link>
                <button type="button" className="fabmenu-i" onClick={() => { setSelectMode(true); setFabOpen(false); }}><span className="fabmenu-ic"><Icon n="check" size={17} /></span> เลือกหลายห้อง</button>
                {groupAction && <button type="button" className="fabmenu-i" onClick={() => { setGrpOpen(true); setFabOpen(false); }}><span className="fabmenu-ic"><Icon n="sort" size={17} /></span> จัดกลุ่มตาม {groupTerm}</button>}
                <Link className="fabmenu-i" href="/merchant/units/print" onClick={() => setFabOpen(false)}><span className="fabmenu-ic"><Icon n="image" size={17} /></span> พิมพ์ผัง</Link>
              </div>
            )}
            <button type="button" className={`rb-fabbtn ${fabOpen ? 'fab-open' : ''}`} onClick={() => setFabOpen((o) => !o)} aria-label={fabOpen ? 'ปิดเมนู' : 'เมนู'}><Icon n="plus" size={26} /></button>
          </div>
        </>
      )}

      {grpOpen && groupAction && (
        <div className="rb-scrim" onClick={() => setGrpOpen(false)}>
          <div className="rb-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="rb-sheet-h"><b>จัดกลุ่มห้องตาม</b><button type="button" onClick={() => setGrpOpen(false)} aria-label="ปิด"><Icon n="x" size={20} /></button></div>
            <form action={groupAction} className="grpset-f">
              <input name="term_custom" defaultValue={groupTerm} maxLength={16} placeholder="โซน" aria-label="คำเรียกกลุ่มห้อง" />
              <button className="dbtn sm primary" type="submit">บันทึก</button>
            </form>
            <p className="fhint">เช่น โซน · อาคาร · ปีก · บ้าน — ตอนเพิ่มห้องจะถามชื่อกลุ่มนี้</p>
          </div>
        </div>
      )}
    </>
  );
}
