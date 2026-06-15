'use client';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '../icons';

type Place = { id: string; name: string; category: string; subcategory: string | null; lat: number; lng: number; rev_n: number; rev_avg: string | null };

const NIMMAN: [number, number] = [18.7965, 98.9685];
const COLORS: Record<string, string> = { eat: '#E2603B', see: '#1E8E7E', do: '#8A5CF6' };
const catTH = (c: string) => (c === 'eat' ? 'กิน' : c === 'see' ? 'เที่ยว' : 'ทำกิจกรรม');
const FILTERS = [{ k: '', l: 'ทั้งหมด' }, { k: 'eat', l: 'กิน' }, { k: 'see', l: 'เที่ยว' }, { k: 'do', l: 'ทำกิจกรรม' }];

function haversine(a: [number, number], b: [number, number]) {
  const R = 6371, toR = (d: number) => (d * Math.PI) / 180;
  const dLat = toR(b[0] - a[0]), dLng = toR(b[1] - a[1]);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a[0])) * Math.cos(toR(b[0])) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s)); // km
}

export default function MapView({ places }: { places: Place[] }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const meRef = useRef<any>(null);
  const [cat, setCat] = useState('');
  const [sel, setSel] = useState<Place | null>(null);
  const [me, setMe] = useState<[number, number] | null>(null);
  const [ready, setReady] = useState(false);

  // load Leaflet from CDN (browser only)
  useEffect(() => {
    let dead = false;
    async function boot() {
      const w = window as any;
      if (!document.getElementById('leaflet-css')) {
        const l = document.createElement('link'); l.id = 'leaflet-css'; l.rel = 'stylesheet';
        l.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(l);
      }
      if (!w.L) {
        await new Promise<void>((res, rej) => {
          const s = document.createElement('script'); s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          s.onload = () => res(); s.onerror = () => rej(); document.body.appendChild(s);
        });
      }
      if (dead || mapRef.current || !hostRef.current) return;
      const L = w.L;
      const map = L.map(hostRef.current, { zoomControl: false, attributionControl: false }).setView(NIMMAN, 15);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
      L.control.zoom({ position: 'bottomright' }).addTo(map);
      L.control.attribution({ position: 'bottomleft', prefix: false }).addAttribution('© OpenStreetMap, © CARTO').addTo(map);
      mapRef.current = map; layerRef.current = L.layerGroup().addTo(map);
      setReady(true);
    }
    boot();
    return () => { dead = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []);

  // (re)draw markers when ready / filter changes
  useEffect(() => {
    const w = window as any; const L = w.L; const map = mapRef.current; const grp = layerRef.current;
    if (!ready || !L || !grp) return;
    grp.clearLayers();
    const shown = places.filter((p) => !cat || p.category === cat);
    shown.forEach((p) => {
      const c = COLORS[p.category] || '#6B6862';
      const icon = L.divIcon({ className: 'pin-wrap', html: `<span class="pin" style="--c:${c}"></span>`, iconSize: [26, 34], iconAnchor: [13, 32] });
      const mk = L.marker([p.lat, p.lng], { icon }).addTo(grp);
      mk.on('click', () => { setSel(p); map.panTo([p.lat, p.lng]); });
    });
  }, [ready, cat, places]);

  function locate() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const w = window as any; const L = w.L; const map = mapRef.current; if (!L || !map) return;
      const ll: [number, number] = [pos.coords.latitude, pos.coords.longitude];
      setMe(ll); map.setView(ll, 15);
      if (meRef.current) map.removeLayer(meRef.current);
      meRef.current = L.circleMarker(ll, { radius: 8, color: '#fff', weight: 3, fillColor: '#2563EB', fillOpacity: 1 }).addTo(map);
    }, () => { /* denied — stay on Nimman */ }, { enableHighAccuracy: true, timeout: 8000 });
  }

  const dist = (p: Place) => (me ? haversine(me, [p.lat, p.lng]) : null);
  const fmtDist = (km: number) => (km < 1 ? `${Math.round(km * 1000)} ม.` : `${km.toFixed(1)} กม.`);

  return (
    <div className="mapscreen">
      <div ref={hostRef} className="leaflet-host" />

      <div className="map-top">
        <a className="map-back" href="/"><Icon n="back" size={18} /></a>
        <div className="map-filters">
          {FILTERS.map((f) => (
            <button key={f.k} className={`fpill ${cat === f.k ? 'on' : ''}`} onClick={() => { setCat(f.k); setSel(null); }}>{f.l}</button>
          ))}
        </div>
      </div>

      {!ready && <div className="map-loading">กำลังโหลดแผนที่…</div>}

      <button className="locate-btn" onClick={locate}><Icon n="locate" size={20} /></button>

      {sel ? (
        <a className="map-sheet" href={`/place/${sel.id}`}>
          <button className="sheet-x" onClick={(e) => { e.preventDefault(); setSel(null); }}><Icon n="x" size={16} /></button>
          <img className="sheet-img" src={`https://picsum.photos/seed/${sel.id.slice(0, 12)}/200/200`} alt="" />
          <div className="sheet-c">
            <div className="sheet-eyebrow">{catTH(sel.category)}{sel.subcategory ? ` · ${sel.subcategory}` : ''}</div>
            <div className="sheet-nm">{sel.name}</div>
            <div className="sheet-meta">
              {sel.rev_n > 0 && <span className="rate"><Icon n="star" fill="currentColor" size={13} /> {sel.rev_avg} <span style={{ opacity: .7 }}>({sel.rev_n})</span></span>}
              {dist(sel) != null && <><span className="sep">·</span><span><Icon n="locate" size={12} className="flat-ico" style={{ color: 'var(--muted)' }} /> {fmtDist(dist(sel)!)}</span></>}
            </div>
          </div>
          <Icon n="chevR" size={20} style={{ color: 'var(--hint)' }} />
        </a>
      ) : (
        <div className="map-hint">{me ? 'แตะหมุดเพื่อดูข้อมูลร้าน' : 'แตะ ◎ เพื่อใช้ตำแหน่งปัจจุบัน · แตะหมุดดูข้อมูล'}</div>
      )}
    </div>
  );
}
