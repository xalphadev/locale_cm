'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Icon, Thumb } from '../ui';
import { FilterBar } from '../FilterBar';

type Item = { id: string; name: string; meta: string; image_urls: string[] | null; status: string; sold_out: boolean; in_season: boolean };
const TESTS: Record<string, (i: Item) => boolean> = {
  all: () => true,
  live: (i) => i.status !== 'hidden',
  hidden: (i) => i.status === 'hidden',
  sold: (i) => i.status !== 'hidden' && i.sold_out,
  season: (i) => i.status !== 'hidden' && i.in_season,
};
const DEFS = [['all', 'ทั้งหมด'], ['live', 'แสดงอยู่'], ['hidden', 'ซ่อน'], ['sold', 'หมด'], ['season', 'ในฤดู']] as const;

export function ProductList({ items }: { items: Item[] }) {
  const [q, setQ] = useState('');
  const [chip, setChip] = useState('all');
  const ql = q.trim().toLowerCase();
  const chips = DEFS.map(([key, label]) => ({ key, label, count: key === 'all' ? undefined : items.filter(TESTS[key]).length }));
  const filtered = items.filter((i) => TESTS[chip](i) && (!ql || i.name.toLowerCase().includes(ql)));
  return (
    <>
      <div className="listhead">
        <h1>สินค้า <span className="listcount">{items.length}</span></h1>
        <Link className="addbtn" href="/merchant/products/new"><Icon n="plus" size={17} /> เพิ่มสินค้า</Link>
      </div>
      {items.length === 0 ? (
        <div className="mempty">
          <span className="mempty-ic"><Icon n="box" size={30} /></span>
          <p>ยังไม่มีสินค้า — เพิ่มชิ้นแรกเพื่อโชว์ให้ลูกค้าเห็น</p>
          <Link className="btn btn-primary" href="/merchant/products/new">+ เพิ่มสินค้าชิ้นแรก</Link>
        </div>
      ) : (
        <>
          <FilterBar query={q} onQuery={setQ} placeholder="ค้นหาสินค้า…" chips={chips} active={chip} onChip={setChip} />
          {filtered.length === 0 ? (
            <div className="nomatch">ไม่พบสินค้าที่ตรงกับที่ค้นหา</div>
          ) : (
            <div className="mlist">
              {filtered.map((r) => (
                <Link className={`mrow ${r.status === 'hidden' ? 'off' : ''}`} href={`/merchant/products/${r.id}`} key={r.id}>
                  <span className="mrow-img"><Thumb images={r.image_urls} kind="product" alt={r.name} /></span>
                  <span className="mrow-body">
                    <span className="mrow-nm">{r.name}</span>
                    <span className="mrow-meta">{r.meta}</span>
                    <span className="mrow-tags">
                      {r.status === 'hidden' && <span className="t off">ซ่อนอยู่</span>}
                      {r.status !== 'hidden' && r.sold_out && <span className="t sold">หมด</span>}
                      {r.status !== 'hidden' && r.in_season && <span className="t season">ในฤดู</span>}
                    </span>
                  </span>
                  <Icon n="chevR" size={20} className="mrow-go" />
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
