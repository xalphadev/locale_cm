'use client';
import { useEffect, useRef, useState } from 'react';
import { Icon } from './ui';

export const MAX_PHOTOS = 8; // keep in sync with MAX_UPLOADS in lib/storage.ts (server caps too)

// Real photo picker — uploads go to MinIO via the `photos` field (saveUploads in the action). No URL pasting.
// Files live in React state; a DataTransfer rebuilds the hidden <input>.files so add/remove before submit works.
// Shared by the room-type form (RoomForm) and the shop-info form (shop gallery).
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
