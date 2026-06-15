'use client';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '../icons';

type Place = { id: string; name: string; category: string; subcategory: string | null; lat: number; lng: number; rev_n: number; rev_avg: string | null };

const NIMMAN: [number, number] = [18.7965, 98.9685];
const COLORS: Record<string, string> = { eat: '#E2603B', see: '#1E8E7E', do: '#8A5CF6' };
const catTH = (c: string) => (c === 'eat' ? 'กิน' : c === 'see' ? 'เที่ยว' : 'ทำกิจกรรม');
const FILTERS = [{ k: '', l: 'ทั้งหมด' }, { k: 'eat', l: 'กิน' }, { k: 'see', l: 'เที่ยว' }, { k: 'do', l: 'ทำกิจกรรม' }];
const cover = (id: string) => `https://picsum.photos/seed/${id.slice(0, 12)}/120/120`;

function haversine(a: [number, number], b: [number, number]) {
  const R = 6371, toR = (d: number) => (d * Math.PI) / 180;
  const dLat = toR(b[0] - a[0]), dLng = toR(b[1] - a[1]);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a[0])) * Math.cos(toR(b[0])) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}
const fmtDist = (km: number) => (km < 1 ? `${Math.round(km * 1000)} ม.` : `${km.toFixed(1)} กม.`);
const walkMin = (km: number) => Math.max(1, Math.round((km / 5) * 60));

export default function MapView({ places }: { places: Place[] }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const meRef = useRef<any>(null);
  const markerById = useRef<Record<string, any>>({});
  const cardById = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [cat, setCat] = useState('');
  const [sel, setSel] = useState<string | null>(null);
  const [me, setMe] = useState<[number, number] | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let dead = false;
    async function boot() {
      const w = window as any;
      if (!document.getElementById('leaflet-css')) {
        const l = document.createElement('link'); l.id = 'leaflet-css'; l.rel = 'stylesheet';
        l.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(l);
      }
      if (!w.L) await new Promise<void>((res, rej) => {
        const s = document.createElement('script'); s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        s.onload = () => res(); s.onerror = () => rej(); document.body.appendChild(s);
      });
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

  const shown = places
    .filter((p) => !cat || p.category === cat)
    .map((p) => ({ ...p, km: me ? haversine(me, [p.lat, p.lng]) : null }))
    .sort((a, b) => (me ? (a.km! - b.km!) : ((b.rev_n - a.rev_n) || (Number(b.rev_avg) - Number(a.rev_avg)))));

  // draw markers
  useEffect(() => {
    const w = window as any; const L = w.L; const grp = layerRef.current;
    if (!ready || !L || !grp) return;
    grp.clearLayers(); markerById.current = {};
    shown.forEach((p) => {
      const c = COLORS[p.category] || '#6B6862';
      const on = p.id === sel;
      const icon = L.divIcon({ className: 'pin-wrap', html: `<span class="pin${on ? ' on' : ''}" style="--c:${c}"></span>`, iconSize: [26, 34], iconAnchor: [13, 32] });
      const mk = L.marker([p.lat, p.lng], { icon, zIndexOffset: on ? 1000 : 0 }).addTo(grp);
      mk.on('click', () => select(p.id, true));
      markerById.current[p.id] = mk;
    });
  }, [ready, cat, sel, me]);

  function select(id: string, fromPin: boolean) {
    setSel(id);
    const p = places.find((x) => x.id === id); const map = mapRef.current;
    if (p && map) map.panTo([p.lat, p.lng]);
    if (fromPin) cardById.current[id]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }

  function locate() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const w = window as any; const L = w.L; const map = mapRef.current; if (!L || !map) return;
      const ll: [number, number] = [pos.coords.latitude, pos.coords.longitude];
      setMe(ll); map.setView(ll, 15);
      if (meRef.current) map.removeLayer(meRef.current);
      meRef.current = L.circleMarker(ll, { radius: 8, color: '#fff', weight: 3, fillColor: '#2563EB', fillOpacity: 1 }).addTo(map);
    }, undefined, { enableHighAccuracy: true, timeout: 8000 });
  }

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

      <div className="rail-head">{me ? 'แนะนำใกล้คุณ' : 'ยอดนิยมในย่าน'} · {shown.length}</div>
      <button className="locate-btn" onClick={locate}><Icon n="locate" size={20} /></button>

      <div className="map-rail">
        {shown.map((p) => (
          <a key={p.id} ref={(el) => { cardById.current[p.id] = el; }} href={`/place/${p.id}`}
            className={`map-card ${p.id === sel ? 'on' : ''}`}
            onMouseEnter={() => select(p.id, false)}>
            <img src={cover(p.id)} alt="" loading="lazy" />
            <div className="mc">
              <div className="mc-nm">{p.name}</div>
              <div className="mc-meta">
                {p.rev_n > 0 && <span className="rate"><Icon n="star" fill="currentColor" size={12} /> {p.rev_avg}</span>}
                {p.rev_n > 0 && <span className="sep">·</span>}
                {p.km != null ? <span><Icon n="locate" size={11} className="flat-ico" style={{ color: 'var(--muted)' }} /> เดิน {walkMin(p.km)} นาที</span> : <span>{catTH(p.category)}</span>}
              </div>
            </div>
          </a>
        ))}
        {shown.length === 0 && <div className="map-card" style={{ justifyContent: 'center', color: 'var(--muted)' }}>ไม่มีร้านในหมวดนี้</div>}
      </div>
    </div>
  );
}
