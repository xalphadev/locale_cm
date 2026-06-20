'use client';
import { useState } from 'react';
import { Icon, Thumb } from '../ui';

type Item = { id: string; name: string; meta: string; image_urls: string[] | null; status: string; monthly: boolean; vacant: boolean; full: boolean; availLabel: string; availCls: string; managed: boolean; physical: number };

// Two INDEPENDENT filter axes, combinable (AND): rental MODE (รายเดือน/รายวัน) and STATUS (ว่าง/เต็ม/ซ่อน).
// They used to share one single-select chip row, so "รายเดือน ที่ว่าง" was impossible.
const STATS: [string, string][] = [['all', 'ทั้งหมด'], ['vacant', 'ว่าง'], ['full', 'เต็ม'], ['hidden', 'ซ่อน']];
const MTEST: Record<string, (i: Item) => boolean> = { all: () => true, monthly: (i) => i.monthly, daily: (i) => !i.monthly };
const STEST: Record<string, (i: Item) => boolean> = {
  all: () => true,
  vacant: (i) => i.status !== 'hidden' && i.vacant,
  full: (i) => i.status !== 'hidden' && i.full,
  hidden: (i) => i.status === 'hidden',
};

export function RoomList({ items, noun = 'ห้องพัก', hasBoard }: { items: Item[]; noun?: string; hasBoard?: boolean }) {
  const [q, setQ] = useState('');
  const [mode, setMode] = useState('all');
  const [status, setStatus] = useState('all');
  const ql = q.trim().toLowerCase();
  const filtered = items.filter((i) => MTEST[mode](i) && STEST[status](i) && (!ql || i.name.toLowerCase().includes(ql)));
  const floating = hasBoard ? items.filter((i) => i.physical === 0).length : 0;
  return (
    <>
      {floating > 0 && (
        <div className="banner-warn">มี {floating} ประเภทยังไม่มีห้องจริงในผัง — เพิ่มห้องในผังเพื่อให้นับห้องว่างอัตโนมัติ</div>
      )}
      {items.length === 0 ? (
        <div className="mempty">
          <span className="mempty-ic"><Icon n="bed" size={30} /></span>
          <p>ยังไม่มีห้อง — เพิ่มห้องแรกเพื่อให้ลูกค้าเห็นห้องว่าง</p>
          <a className="btn btn-primary" href="/merchant/rooms/new">+ เพิ่มห้องแรก</a>
        </div>
      ) : (
        <>
          <div className="lstools">
            <div className="msearch">
              <Icon n="search" size={18} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`ค้นหา${noun}…`} inputMode="search" aria-label={`ค้นหา${noun}`} />
              {q ? <button type="button" className="msearch-x" onClick={() => setQ('')} aria-label="ล้าง"><Icon n="x" size={13} /></button> : null}
            </div>
            <div className="ffilters">
              <select className="ffmode" value={mode} onChange={(e) => setMode(e.target.value)} aria-label="โหมด">
                <option value="all">ทุกโหมด</option>
                <option value="monthly">รายเดือน</option>
                <option value="daily">รายวัน</option>
              </select>
              <div className="fchips ffstatus">
                {STATS.map(([k, l]) => <button type="button" key={k} className={`fchip ${status === k ? 'on' : ''}`} onClick={() => setStatus(k)}>{l}{k !== 'all' && <span className="fcount">{items.filter(STEST[k]).length}</span>}</button>)}
              </div>
            </div>
          </div>
          {filtered.length === 0 ? (
            <div className="nomatch">ไม่พบห้องที่ตรงกับตัวกรอง</div>
          ) : (
            <div className="mlist">
              {filtered.map((r) => (
                <a className={`mrow ${r.status === 'hidden' ? 'off' : ''}`} href={`/merchant/rooms/${r.id}`} key={r.id}>
                  <span className="mrow-img"><Thumb images={r.image_urls} kind="room" alt={r.name} /></span>
                  <span className="mrow-body">
                    <span className="mrow-nm">{r.name}</span>
                    <span className="mrow-meta">{r.meta}</span>
                    <span className="mrow-tags">
                      {r.status === 'hidden' && <span className="t off">ซ่อนอยู่</span>}
                      <span className={`t ${r.availCls}`}>{r.availLabel}</span>
                      {hasBoard && (r.physical > 0
                        ? <span className="t link"><Icon n="grid" size={11} /> {r.physical} ห้องในผัง</span>
                        : <span className="t warn">⚠ ยังไม่มีห้องในผัง</span>)}
                    </span>
                  </span>
                  <Icon n="chevR" size={20} className="mrow-go" />
                </a>
              ))}
            </div>
          )}
        </>
      )}
      {hasBoard && items.some((i) => i.managed) && (
        <p className="note" style={{ marginTop: 10 }}>รวมห้องจริงในผัง {items.reduce((s, i) => s + i.physical, 0)} ห้อง — ตรงกับแท็บ “ผังห้อง”</p>
      )}
    </>
  );
}
