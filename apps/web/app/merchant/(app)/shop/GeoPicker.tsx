'use client';
import { useEffect, useRef, useState } from 'react';
import { NIMMAN_LNG, NIMMAN_LAT, isDefaultGeo } from '@/lib/geo';

// "Drag the map, the pin stays centred" location picker (the Grab/Google mobile pattern) — far easier on a
// touchscreen than dragging a tiny marker. The centred coords write into the hidden lat/lng inputs that submit
// with updateShopAction, so it still degrades to manual entry (paste a Google Maps coordinate) without JS.
const loadCss = (id: string, href: string) => { if (!document.getElementById(id)) { const l = document.createElement('link'); l.id = id; l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l); } };
const loadJs = (src: string) => new Promise<void>((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = () => res(); s.onerror = () => rej(); document.body.appendChild(s); });

export default function GeoPicker({ lat0, lng0 }: { lat0?: number | null; lng0?: number | null }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [lat, setLat] = useState(lat0 != null ? String(lat0) : '');
  const [lng, setLng] = useState(lng0 != null ? String(lng0) : '');
  const [ready, setReady] = useState(false);
  const [locating, setLocating] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    let dead = false;
    (async () => {
      const w = window as any;
      loadCss('leaflet-css', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
      if (!w.L) { try { await loadJs('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'); } catch { if (!dead) setErr('โหลดแผนที่ไม่สำเร็จ — กรอกพิกัดเองด้านล่างได้'); return; } }
      if (dead || mapRef.current || !hostRef.current) return;
      const L = w.L;
      const start: [number, number] = [lat0 ?? NIMMAN_LAT, lng0 ?? NIMMAN_LNG];
      const map = L.map(hostRef.current, { attributionControl: false, zoomControl: true }).setView(start, 16);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
      // coords = the map centre (where the fixed pin points). Settle on moveend to avoid re-rendering per frame.
      const sync = () => { const c = map.getCenter(); setLat(c.lat.toFixed(6)); setLng(c.lng.toFixed(6)); };
      map.on('moveend', sync);
      mapRef.current = map;
      setReady(true);
      setTimeout(() => map.invalidateSize(), 50);   // the map mounts inside a form that may still be laying out
    })();
    return () => { dead = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []);

  function recenter(a: number, b: number) {
    if (isFinite(a) && isFinite(b) && mapRef.current) mapRef.current.setView([a, b], mapRef.current.getZoom());
  }
  function locate() {
    if (!navigator.geolocation) { setErr('อุปกรณ์นี้ไม่รองรับการหาตำแหน่ง'); return; }
    setErr(''); setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocating(false); const a = pos.coords.latitude, b = pos.coords.longitude; setLat(a.toFixed(6)); setLng(b.toFixed(6)); recenter(a, b); },
      (e) => { setLocating(false); setErr(e.code === 1 ? 'ไม่ได้อนุญาตให้เข้าถึงตำแหน่ง — เปิดสิทธิ์ใน Settings หรือเลื่อนแผนที่เอง' : 'หาตำแหน่งไม่สำเร็จ ลองใหม่อีกครั้ง'); },
      { enableHighAccuracy: true, timeout: 8000 });
  }

  const nlat = parseFloat(lat), nlng = parseFloat(lng);
  const pinned = isFinite(nlat) && isFinite(nlng) && !isDefaultGeo(nlat, nlng);

  return (
    <div className="geopick">
      <div className="geopick-mapwrap">
        <div ref={hostRef} className="geopick-map" />
        {!ready && <div className="geopick-loading">กำลังโหลดแผนที่…</div>}
        {ready && (
          <div className="geopick-pin" aria-hidden>
            <svg width="34" height="44" viewBox="0 0 24 32"><path d="M12 0C5.37 0 0 5.37 0 12c0 8.5 12 20 12 20s12-11.5 12-20C24 5.37 18.63 0 12 0z" fill="#2B74FF" stroke="#fff" strokeWidth="1.5" /><circle cx="12" cy="12" r="4.4" fill="#fff" /></svg>
          </div>
        )}
        <button type="button" className="geopick-gps" onClick={locate} disabled={locating || !ready}>
          {locating ? 'กำลังหา…' : '◎ ตำแหน่งของฉัน'}
        </button>
      </div>

      <div className={`geopick-status ${pinned ? 'ok' : ''}`}>
        {pinned ? '✓ ปักหมุดแล้ว — เลื่อนแผนที่เพื่อปรับให้ตรงขึ้น' : 'เลื่อนแผนที่ให้หมุดอยู่ตรงตำแหน่งร้านจริง (ลูกค้าใช้หาคุณบนแผนที่)'}
      </div>
      {err && <p className="geopick-err">{err}</p>}

      <details className="geopick-manual" open={!ready && !!err}>
        <summary>ใส่พิกัดเอง / วางจาก Google Maps</summary>
        <div className="geopick-row">
          {/* update state freely while typing; move the map on blur so moveend's sync can't clobber mid-type */}
          <label>พิกัดเหนือ-ใต้ (lat)<input name="lat" value={lat} inputMode="decimal" placeholder="18.7965"
            onChange={(e) => setLat(e.target.value)} onBlur={() => recenter(parseFloat(lat), parseFloat(lng))} /></label>
          <label>พิกัดออก-ตก (lng)<input name="lng" value={lng} inputMode="decimal" placeholder="98.9685"
            onChange={(e) => setLng(e.target.value)} onBlur={() => recenter(parseFloat(lat), parseFloat(lng))} /></label>
        </div>
      </details>
    </div>
  );
}
