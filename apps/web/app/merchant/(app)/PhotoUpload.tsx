'use client';
import { useEffect, useRef, useState } from 'react';
import { Icon } from './ui';

export const MAX_PHOTOS = 8; // keep in sync with MAX_UPLOADS in lib/storage.ts (server caps too)

// Real photo picker — uploads go to MinIO via the `photos` field (saveUploads in the action). No URL pasting.
// Files live in React state; a DataTransfer rebuilds the hidden <input>.files so add/remove before submit works.
// Shared by the room-type form (RoomForm) and the brand logo. The shop gallery uses PhotoManager (below).
export function PhotoUpload({ existing, label }: { existing?: string[]; label?: string }) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => () => { previews.forEach((u) => URL.revokeObjectURL(u)); }, [previews]);

  const apply = (next: File[]) => {
    const capped = next.slice(0, MAX_PHOTOS);
    const dt = new DataTransfer();
    capped.forEach((f) => dt.items.add(f));
    if (inputRef.current) inputRef.current.files = dt.files;
    setFiles(capped);
    setPreviews(capped.map((f) => URL.createObjectURL(f)));
  };
  const add = (list: FileList | null) => {
    if (!list) return;
    apply([...files, ...Array.from(list).filter((f) => f.type.startsWith('image/'))]);
  };

  return (
    <>
      <input ref={inputRef} type="file" name="photos" accept="image/*" multiple hidden onChange={(e) => add(e.target.files)} />
      <div className={`upz ${drag ? 'on' : ''}`} role="button" tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files); }}>
        <span className="upz-ic"><Icon n="image" size={26} /></span>
        <b>{label || 'แตะเพื่อเลือกรูป หรือลากรูปมาวาง'}</b>
        <span className="upz-sub">JPG · PNG · WEBP — สูงสุด {MAX_PHOTOS} รูป · ระบบย่อ + อัปโหลดให้อัตโนมัติ</span>
      </div>
      {files.length > 0 && (
        <>
          <div className="upz-grid">
            {previews.map((src, i) => (
              <div className="upz-thumb" key={src}>
                <img src={src} alt="" />
                <button type="button" className="upz-x" aria-label="ลบรูปนี้" onClick={() => apply(files.filter((_, j) => j !== i))}>×</button>
                {i === 0 && <span className="upz-cover">รูปปก</span>}
              </div>
            ))}
          </div>
          <p className="fhint">เลือกแล้ว {files.length}/{MAX_PHOTOS} รูป · รูปแรกคือรูปปก — ลากเพิ่มหรือกด × เพื่อลบ</p>
        </>
      )}
      {existing && existing.length > 0 && files.length === 0 && (
        <div className="upz-existing">
          <p className="fhint"><Icon n="image" size={13} /> รูปปัจจุบัน {existing.length} รูป — เลือกรูปใหม่เพื่อ<b>แทนที่ทั้งหมด</b></p>
          <div className="upz-grid">{existing.slice(0, MAX_PHOTOS).map((u) => <div className="upz-thumb ro" key={u}><img src={u} alt="" /></div>)}</div>
        </div>
      )}
    </>
  );
}

type Item = { key: string; url?: string; file?: File; preview: string };

// Gallery manager — keeps EXISTING photos and lets the owner set the cover (first = cover), reorder, remove, and
// add more, mixing old + new. Submits two fields: the new files (DataTransfer → name="photos") AND an order
// manifest name="photo_order" = a JSON array of entries, each an existing URL or "new:k" (the k-th new file).
// The action rebuilds image_urls from the manifest (validating existing URLs against the place's own set).
export function PhotoManager({ existing, label }: { existing?: string[]; label?: string }) {
  const [items, setItems] = useState<Item[]>(() => (existing || []).filter(Boolean).slice(0, MAX_PHOTOS).map((u, i) => ({ key: 'e' + i, url: u, preview: u })));
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const orderRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef(items); itemsRef.current = items;
  useEffect(() => () => { itemsRef.current.forEach((it) => it.file && URL.revokeObjectURL(it.preview)); }, []);

  // rebuild the file input (new files in order) + the order manifest whenever the list changes
  useEffect(() => {
    const dt = new DataTransfer();
    const order: string[] = [];
    let k = 0;
    for (const it of items) {
      if (it.file) { dt.items.add(it.file); order.push('new:' + k); k++; }
      else if (it.url) order.push(it.url);
    }
    if (inputRef.current) inputRef.current.files = dt.files;
    if (orderRef.current) orderRef.current.value = JSON.stringify(order);
  }, [items]);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const news = Array.from(list).filter((f) => f.type.startsWith('image/')).map((f, i) => ({ key: `n${i}_${f.name}_${f.size}`, file: f, preview: URL.createObjectURL(f) }));
    setItems((prev) => [...prev, ...news].slice(0, MAX_PHOTOS));
  };
  const remove = (key: string) => setItems((prev) => { const it = prev.find((x) => x.key === key); if (it?.file) URL.revokeObjectURL(it.preview); return prev.filter((x) => x.key !== key); });
  const setCover = (key: string) => setItems((prev) => { const i = prev.findIndex((x) => x.key === key); if (i <= 0) return prev; const n = [...prev]; const [it] = n.splice(i, 1); n.unshift(it); return n; });
  const move = (key: string, dir: -1 | 1) => setItems((prev) => { const i = prev.findIndex((x) => x.key === key); const j = i + dir; if (i < 0 || j < 0 || j >= prev.length) return prev; const n = [...prev]; [n[i], n[j]] = [n[j], n[i]]; return n; });

  return (
    <>
      <input ref={inputRef} type="file" name="photos" accept="image/*" multiple hidden onChange={(e) => addFiles(e.target.files)} />
      <input ref={orderRef} type="hidden" name="photo_order" defaultValue={JSON.stringify((existing || []).filter(Boolean).slice(0, MAX_PHOTOS))} />
      {items.length < MAX_PHOTOS && (
        <div className={`upz ${drag ? 'on' : ''}`} role="button" tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}>
          <span className="upz-ic"><Icon n="image" size={26} /></span>
          <b>{label || 'แตะเพื่อเพิ่มรูป หรือลากรูปมาวาง'}</b>
          <span className="upz-sub">JPG · PNG · WEBP — สูงสุด {MAX_PHOTOS} รูป · ระบบย่อ + อัปโหลดให้อัตโนมัติ</span>
        </div>
      )}
      {items.length > 0 && (
        <>
          <div className="upz-grid">
            {items.map((it, i) => (
              <div className={`upz-thumb ${i === 0 ? 'is-cover' : ''}`} key={it.key}>
                <img src={it.preview} alt="" />
                <button type="button" className="upz-x" aria-label="ลบรูปนี้" onClick={() => remove(it.key)}>×</button>
                {i === 0
                  ? <span className="upz-cover">รูปปก</span>
                  : <button type="button" className="upz-setcover" onClick={() => setCover(it.key)}>ตั้งเป็นปก</button>}
                <div className="upz-move">
                  <button type="button" aria-label="เลื่อนซ้าย" disabled={i === 0} onClick={() => move(it.key, -1)}>‹</button>
                  <button type="button" aria-label="เลื่อนขวา" disabled={i === items.length - 1} onClick={() => move(it.key, 1)}>›</button>
                </div>
              </div>
            ))}
          </div>
          <p className="fhint">{items.length}/{MAX_PHOTOS} รูป · <b>รูปแรกคือรูปปก</b>ที่ลูกค้าเห็นในการ์ด — กด “ตั้งเป็นปก” หรือ ‹ › เพื่อจัดลำดับ · × เพื่อลบ</p>
        </>
      )}
    </>
  );
}
