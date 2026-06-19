'use client';
import { useState } from 'react';
import { Icon, Thumb } from '../ui';
import { FilterBar } from '../FilterBar';

type Item = { id: string; name: string; meta: string; image_urls: string[] | null; status: string; monthly: boolean; vacant: boolean; full: boolean; availLabel: string; availCls: string };
const TESTS: Record<string, (i: Item) => boolean> = {
  all: () => true,
  monthly: (i) => i.monthly,
  daily: (i) => !i.monthly,
  vacant: (i) => i.status !== 'hidden' && i.vacant,
  full: (i) => i.status !== 'hidden' && i.full,
  hidden: (i) => i.status === 'hidden',
};
const DEFS = [['all', 'ทั้งหมด'], ['monthly', 'รายเดือน'], ['daily', 'รายวัน'], ['vacant', 'ว่าง'], ['full', 'เต็ม'], ['hidden', 'ซ่อน']] as const;

export function RoomList({ items, noun = 'ห้องพัก' }: { items: Item[]; noun?: string }) {
  const [q, setQ] = useState('');
  const [chip, setChip] = useState('all');
  const ql = q.trim().toLowerCase();
  const chips = DEFS.map(([key, label]) => ({ key, label, count: key === 'all' ? undefined : items.filter(TESTS[key]).length }));
  const filtered = items.filter((i) => TESTS[chip](i) && (!ql || i.name.toLowerCase().includes(ql)));
  return (
    <>
      <div className="listhead">
        <h1>{noun} <span className="listcount">{items.length}</span></h1>
        <a className="addbtn" href="/merchant/rooms/new"><Icon n="plus" size={17} /> เพิ่มห้อง</a>
      </div>
      <p className="note">โชว์ห้อง + บอกว่าว่างกี่ห้อง/ว่างวันนี้ไหม — ลูกค้าทักไลน์/โทรจองกับคุณเอง</p>
      {items.length === 0 ? (
        <div className="mempty">
          <span className="mempty-ic"><Icon n="bed" size={30} /></span>
          <p>ยังไม่มีห้อง — เพิ่มห้องแรกเพื่อให้ลูกค้าเห็นห้องว่าง</p>
          <a className="btn btn-primary" href="/merchant/rooms/new">+ เพิ่มห้องแรก</a>
        </div>
      ) : (
        <>
          <FilterBar query={q} onQuery={setQ} placeholder={`ค้นหา${noun}…`} chips={chips} active={chip} onChip={setChip} />
          {filtered.length === 0 ? (
            <div className="nomatch">ไม่พบห้องที่ตรงกับที่ค้นหา</div>
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
                    </span>
                  </span>
                  <Icon n="chevR" size={20} className="mrow-go" />
                </a>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
