'use client';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './icons';

/** Fullscreen photo viewer: arrows + dots + counter, swipe (touch), keyboard (Esc/←/→),
 *  tap/click to zoom (origin follows pointer). Used by StayGallery + HeroZoom. */
function LightboxOverlay({ images, index, setIndex, onClose }: {
  images: string[]; index: number; setIndex: (updater: (i: number) => number) => void; onClose: () => void;
}) {
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const touchX = useRef<number | null>(null);
  const moved = useRef(false);
  const n = images.length;
  const go = (d: number) => { setZoom(false); setIndex((i) => (i + d + n) % n); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') { setZoom(false); setIndex((i) => (i + 1) % n); }
      else if (e.key === 'ArrowLeft') { setZoom(false); setIndex((i) => (i - 1 + n) % n); }
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prevOverflow; };
  }, [n, onClose, setIndex]);

  const originFrom = (clientX: number, clientY: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    setOrigin({
      x: Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)),
      y: Math.max(0, Math.min(100, ((clientY - r.top) / r.height) * 100)),
    });
  };

  const overlay = (
    <div className="lb" onClick={onClose} role="dialog" aria-modal="true">
      <button className="lb-btn lb-close" onClick={(e) => { e.stopPropagation(); onClose(); }} aria-label="ปิด"><Icon n="x" size={22} /></button>
      {n > 1 && <span className="lb-count">{index + 1} / {n}</span>}
      {n > 1 && (
        <button className="lb-btn lb-arrow lb-prev" onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label="ก่อนหน้า">
          <Icon n="chevR" size={26} style={{ transform: 'scaleX(-1)' }} />
        </button>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={`lb-img ${zoom ? 'zoom' : ''}`}
        src={images[index]}
        alt=""
        draggable={false}
        style={zoom ? { transformOrigin: `${origin.x}% ${origin.y}%` } : undefined}
        onClick={(e) => {
          e.stopPropagation();
          if (moved.current) { moved.current = false; return; }
          if (!zoom) originFrom(e.clientX, e.clientY, e.currentTarget);
          setZoom((z) => !z);
        }}
        onMouseMove={(e) => { if (zoom) originFrom(e.clientX, e.clientY, e.currentTarget); }}
        onTouchStart={(e) => { touchX.current = e.touches[0].clientX; moved.current = false; }}
        onTouchMove={(e) => {
          moved.current = true;
          if (zoom) originFrom(e.touches[0].clientX, e.touches[0].clientY, e.currentTarget);
        }}
        onTouchEnd={(e) => {
          const start = touchX.current; touchX.current = null;
          if (zoom || start == null) return;
          const dx = e.changedTouches[0].clientX - start;
          if (Math.abs(dx) > 40) { moved.current = true; go(dx < 0 ? 1 : -1); }
        }}
      />
      {n > 1 && (
        <button className="lb-btn lb-arrow lb-next" onClick={(e) => { e.stopPropagation(); go(1); }} aria-label="ถัดไป">
          <Icon n="chevR" size={26} />
        </button>
      )}
      {n > 1 && (
        <div className="lb-dots" onClick={(e) => e.stopPropagation()}>
          {images.map((_, i) => (
            <button key={i} className={`lb-dot ${i === index ? 'on' : ''}`} onClick={() => { setZoom(false); setIndex(() => i); }} aria-label={`รูปที่ ${i + 1}`} />
          ))}
        </div>
      )}
    </div>
  );
  if (typeof document === 'undefined') return null;
  return createPortal(overlay, document.body);
}

/** Inline swipeable gallery (arrows on desktop + dots + swipe) — tap a photo to open the zoom viewer.
 *  Renders the back button + "N รูป" count so it can drop-in replace the old static .rgallery-wrap. */
export function StayGallery({ images, backHref = '/stay' }: { images: string[]; backHref?: string }) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const touchX = useRef<number | null>(null);
  const n = images.length;
  const go = (d: number) => setIndex((i) => (i + d + n) % n);

  return (
    <div className="gal">
      <div
        className="gal-view"
        onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          const start = touchX.current; touchX.current = null;
          if (start == null) return;
          const dx = e.changedTouches[0].clientX - start;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        }}
      >
        <div className="gal-track" style={{ transform: `translateX(-${index * 100}%)` }}>
          {images.map((src, i) => (
            <button className="gal-slide" key={i} onClick={() => { setIndex(() => i); setOpen(true); }} aria-label={`ขยายรูปที่ ${i + 1}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" loading={i === 0 ? 'eager' : 'lazy'} draggable={false} />
            </button>
          ))}
        </div>
      </div>

      <a className="rgallery-back" href={backHref}><Icon n="back" size={19} /></a>

      {n > 1 && (
        <>
          <button className="gal-arrow gal-prev" onClick={() => go(-1)} aria-label="ก่อนหน้า"><Icon n="chevR" size={22} style={{ transform: 'scaleX(-1)' }} /></button>
          <button className="gal-arrow gal-next" onClick={() => go(1)} aria-label="ถัดไป"><Icon n="chevR" size={22} /></button>
          <div className="gal-dots">
            {images.map((_, i) => <button key={i} className={`gal-dot ${i === index ? 'on' : ''}`} onClick={() => setIndex(() => i)} aria-label={`ไปรูปที่ ${i + 1}`} />)}
          </div>
        </>
      )}

      <span className="rgallery-count"><Icon n="play" size={11} fill="currentColor" /> {n} รูป</span>

      {open && <LightboxOverlay images={images} index={index} setIndex={setIndex} onClose={() => setOpen(false)} />}
    </div>
  );
}

/** Transparent click layer for a single hero photo → opens the zoom viewer.
 *  Sits above the photo/scrim (z-index:1) but below the title/back-fab (z-index:2/3). */
export function HeroZoom({ images }: { images: string[] }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  return (
    <>
      <button className="hero-zoom" onClick={() => { setIndex(0); setOpen(true); }} aria-label="ขยายรูปภาพ" />
      {open && <LightboxOverlay images={images} index={index} setIndex={setIndex} onClose={() => setOpen(false)} />}
    </>
  );
}

/** Thumbnail strip under the hero (booking-app style) — tap a thumb to open the zoom viewer at that index.
 *  Last visible tile shows a "+N" overlay when there are more photos than fit. */
export function HeroThumbs({ images, max = 5 }: { images: string[]; max?: number }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  if (!images || images.length < 2) return null;
  const shown = images.slice(0, max);
  const extra = images.length - shown.length;
  return (
    <>
      <div className="hthumbs">
        {shown.map((src, i) => (
          <button className="hthumb" key={i} onClick={() => { setIndex(() => i); setOpen(true); }} aria-label={`รูปที่ ${i + 1}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" loading="lazy" draggable={false} />
            {i === max - 1 && extra > 0 && <span className="hthumb-more">+{extra}</span>}
          </button>
        ))}
      </div>
      {open && <LightboxOverlay images={images} index={index} setIndex={setIndex} onClose={() => setOpen(false)} />}
    </>
  );
}
