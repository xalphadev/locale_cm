'use client';
import { useMemo, useState } from 'react';
import { Icon } from '../ui';
import { setRoomOccupancyAction } from '../../actions';

// Scalable room board for 1 → 100s of rooms: status filter + search + density toggle (cards ⇄ compact
// chips) + collapsible floors. Compact mode is the "room rack" view — dozens of rooms per screen,
// colour = status, tap → manage. Auto-compact past 24 rooms.
export type BoardRoom = {
  id: string; code: string; floor: string | null; room_kind: string; status: string;
  occupied_until: string | null; note: string | null; type: string; monthly: boolean;
};
const ST: Record<string, { label: string; color: string }> = {
  vacant: { label: 'ว่าง', color: '#12b76a' },
  occupied: { label: 'มีผู้เช่า', color: '#3b82f6' },
  reserved: { label: 'จองแล้ว', color: '#f59e0b' },
  maintenance: { label: 'ปิดซ่อม', color: '#9aa0a6' },
};
const FILTERS: [string, string][] = [['all', 'ทั้งหมด'], ['vacant', 'ว่าง'], ['occupied', 'มีผู้เช่า'], ['reserved', 'จอง'], ['maintenance', 'ปิดซ่อม']];

export default function RoomBoard({ rooms, groupTerm = 'ชั้น' }: { rooms: BoardRoom[]; groupTerm?: string }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [dense, setDense] = useState(rooms.length > 24);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rooms.length };
    for (const r of rooms) c[r.status] = (c[r.status] || 0) + 1;
    return c;
  }, [rooms]);

  const ql = query.trim().toLowerCase();
  const filtered = rooms.filter((r) =>
    (status === 'all' || r.status === status) &&
    (!ql || r.code.toLowerCase().includes(ql) || (r.type && r.type.toLowerCase().includes(ql)) || (r.note && r.note.toLowerCase().includes(ql))));

  const byFloor: Record<string, BoardRoom[]> = {}; const floors: string[] = [];
  for (const r of filtered) { const f = r.floor || '—'; if (!byFloor[f]) { byFloor[f] = []; floors.push(f); } byFloor[f].push(r); }

  return (
    <>
      <div className="rfilter">
        <div className="rfsearch">
          <Icon n="search" size={16} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ค้นหาเลขห้อง / รูปแบบ / โน้ต…" />
          {query && <button type="button" onClick={() => setQuery('')} aria-label="ล้าง"><Icon n="x" size={15} /></button>}
        </div>
        <button type="button" className={`rfdense ${dense ? 'on' : ''}`} onClick={() => setDense((d) => !d)} aria-label="สลับมุมมอง" title={dense ? 'มุมมองการ์ด' : 'มุมมองผังย่อ'}>
          <Icon n={dense ? 'feed' : 'grid'} size={17} />
        </button>
      </div>

      <div className="rfchips">
        {FILTERS.filter(([k]) => k === 'all' || counts[k]).map(([k, label]) => (
          <button key={k} type="button" className={`rfchip ${status === k ? 'on' : ''}`} onClick={() => setStatus(k)}
            style={k !== 'all' && status === k ? { background: ST[k].color, borderColor: ST[k].color } : undefined}>
            {k !== 'all' && <span className="rfdot" style={{ background: status === k ? 'rgba(255,255,255,.9)' : ST[k].color }} />}
            {label}{k !== 'all' ? ` ${counts[k] || 0}` : ''}
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

          {!collapsed[f] && (dense ? (
            <div className="rgrid">
              {byFloor[f].map((r) => {
                const st = ST[r.status] || ST.vacant;
                // [bg-tint%, ring%] — occupied stays calm but clearly blue; vacant/จอง pop stronger
                const S: number[] = ({ vacant: [42, 62], occupied: [26, 44], reserved: [44, 64], maintenance: [34, 52] } as Record<string, number[]>)[r.status] || [42, 62];
                const fs = r.code.length <= 3 ? '1rem' : r.code.length <= 5 ? '.86rem' : '.74rem';  // shrink long names so they don't overflow
                return (
                  <a className="rchip" key={r.id} href={`/merchant/units/${r.id}`} title={`${r.code} · ${st.label}`}
                    style={{ fontSize: fs, background: `color-mix(in srgb, ${st.color} ${S[0]}%, var(--m-surface,#fff))`, boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${st.color} ${S[1]}%, transparent)` } as any}>
                    {r.code}
                  </a>
                );
              })}
            </div>
          ) : (
            <div className="roomboard">
              {byFloor[f].map((r) => {
                const st = ST[r.status] || ST.vacant;
                return (
                  <div className="rtile" key={r.id} style={{ '--st': st.color } as any}>
                    <a className="rtile-main" href={`/merchant/units/${r.id}`}>
                      <div className="rtile-top">
                        <span className="rtile-code">{r.code}{r.room_kind === 'bed' ? <span className="rtile-bed">เตียง</span> : null}</span>
                        <span className="rtile-chip" style={{ color: st.color, background: `color-mix(in srgb, ${st.color} 14%, transparent)` }}>{st.label}</span>
                      </div>
                      <span className="rtile-type">{r.type || 'ไม่ระบุรูปแบบ'}{r.note ? ` · ${r.note}` : ''}</span>
                    </a>
                    {r.monthly
                      ? (
                        <form className="rtile-act" action={setRoomOccupancyAction.bind(null, r.id, r.status === 'vacant' ? 'occupied' : 'vacant')}>
                          <button type="submit">{r.status === 'vacant' ? 'ตั้งมีผู้เช่า' : 'ตั้งว่าง'}</button>
                        </form>
                      )
                      : <a className="rtile-act cal" href={`/merchant/units/${r.id}`}><Icon n="calendar" size={14} /> ปฏิทิน</a>}
                  </div>
                );
              })}
            </div>
          ))}
        </section>
      ))}
    </>
  );
}
