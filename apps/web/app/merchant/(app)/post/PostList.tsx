'use client';
import { useState } from 'react';
import { Icon, Thumb } from '../ui';
import { FilterBar } from '../FilterBar';

type Item = { id: string; body: string; date: string; likes: number; comments: number; image_urls: string[] | null; status: string };
const TESTS: Record<string, (i: Item) => boolean> = {
  all: () => true,
  live: (i) => i.status !== 'hidden',
  hidden: (i) => i.status === 'hidden',
};
const DEFS = [['all', 'ทั้งหมด'], ['live', 'แสดงอยู่'], ['hidden', 'ซ่อน']] as const;

export function PostList({ items }: { items: Item[] }) {
  const [q, setQ] = useState('');
  const [chip, setChip] = useState('all');
  const ql = q.trim().toLowerCase();
  const chips = DEFS.map(([key, label]) => ({ key, label, count: key === 'all' ? undefined : items.filter(TESTS[key]).length }));
  const filtered = items.filter((i) => TESTS[chip](i) && (!ql || i.body.toLowerCase().includes(ql)));
  return (
    <>
      <div className="listhead">
        <h1>โพสต์ <span className="listcount">{items.length}</span></h1>
        <a className="addbtn" href="/merchant/post/new"><Icon n="plus" size={17} /> เขียนโพสต์</a>
      </div>
      <p className="note">โพสต์ข่าวสาร/โปรของร้านลงฟีดลูกค้า — กดถูกใจและคอมเมนต์ได้ทันที</p>
      {items.length === 0 ? (
        <div className="mempty">
          <span className="mempty-ic"><Icon n="feed" size={30} /></span>
          <p>ยังไม่มีโพสต์ — เขียนโพสต์แรกเพื่อบอกข่าวสาร/โปรโมชันให้ลูกค้า</p>
          <a className="btn btn-primary" href="/merchant/post/new">+ เขียนโพสต์แรก</a>
        </div>
      ) : (
        <>
          <FilterBar query={q} onQuery={setQ} placeholder="ค้นหาโพสต์…" chips={chips} active={chip} onChip={setChip} />
          {filtered.length === 0 ? (
            <div className="nomatch">ไม่พบโพสต์ที่ตรงกับที่ค้นหา</div>
          ) : (
            <div className="mlist">
              {filtered.map((r) => (
                <a className={`mrow ${r.status === 'hidden' ? 'off' : ''}`} href={`/merchant/post/${r.id}`} key={r.id}>
                  <span className="mrow-img"><Thumb images={r.image_urls} kind="post" /></span>
                  <span className="mrow-body">
                    <span className="mrow-nm post">{r.body}</span>
                    <span className="mrow-meta">{r.date} · <Icon n="heart" size={12} className="mi" /> {r.likes} · <Icon n="chat" size={12} className="mi" /> {r.comments}</span>
                    {r.status === 'hidden' && <span className="mrow-tags"><span className="t off">ซ่อนอยู่</span></span>}
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
