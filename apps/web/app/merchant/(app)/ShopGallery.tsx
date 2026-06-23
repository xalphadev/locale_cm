'use client';
import { useState, useEffect, useRef } from 'react';
import { Icon } from './ui';

// Read-only photo viewer for the merchant branch page: a cover + a thumbnail strip (so the owner sees every
// photo at a glance) and a fullscreen lightbox (tap any → swipe / arrows / dots / counter / Esc) so they can
// check exactly what customers see. Portaled to <body>, so its classes (.mlb-*) are NOT .merchant-root-scoped.
function Lightbox({ images, index, setIndex, onClose }: {
  images: string[]; index: number; setIndex: (u: (i: number) => number) => void; onClose: () => void;
}) {
  const touchX = useRef<number | null>(null);
  const n = images.length;
  const go = (d: number) => setIndex((i) => (i + d + n) % n);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % n);
      else if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + n) % n);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [n, onClose, setIndex]);
  return (
    <div className="mlb" onClick={onClose} role="dialog" aria-modal="true">
      <button className="mlb-btn mlb-close" onClick={(e) => { e.stopPropagation(); onClose(); }} aria-label="ปิด"><Icon n="x" size={22} /></button>
      {n > 1 && <span className="mlb-count">{index + 1} / {n}</span>}
      {n > 1 && <button className="mlb-btn mlb-arrow mlb-prev" onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label="ก่อนหน้า"><Icon n="chevR" size={26} style={{ transform: 'scaleX(-1)' }} /></button>}
      <img className="mlb-img" src={images[index]} alt="" draggable={false}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => { const s = touchX.current; touchX.current = null; if (s == null) return; const dx = e.changedTouches[0].clientX - s; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); }} />
      {n > 1 && <button className="mlb-btn mlb-arrow mlb-next" onClick={(e) => { e.stopPropagation(); go(1); }} aria-label="ถัดไป"><Icon n="chevR" size={26} /></button>}
      {n > 1 && (
        <div className="mlb-dots" onClick={(e) => e.stopPropagation()}>
          {images.map((_, i) => <button key={i} className={`mlb-dot ${i === index ? 'on' : ''}`} onClick={() => setIndex(() => i)} aria-label={`รูปที่ ${i + 1}`} />)}
        </div>
      )}
    </div>
  );
}

export function ShopGallery({ images }: { images: string[] }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const n = images.length;
  const view = (i: number) => { setIndex(i); setOpen(true); };
  return (
    <>
      <div className="dhero">
        <button type="button" className="shopgal-cover" onClick={() => view(0)} aria-label="ดูรูปทั้งหมด">
          <img src={images[0]} alt="" />
        </button>
        <span className="dcount"><Icon n="image" size={13} /> {n} รูป</span>
      </div>
      {n > 1 && (
        <div className="shopgal-thumbs">
          {images.map((u, i) => (
            <button type="button" className={`shopgal-thumb ${i === index ? 'on' : ''}`} key={u} onClick={() => view(i)} aria-label={`ดูรูปที่ ${i + 1}`}>
              <img src={u} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
      {open && <Lightbox images={images} index={index} setIndex={setIndex} onClose={() => setOpen(false)} />}
    </>
  );
}
