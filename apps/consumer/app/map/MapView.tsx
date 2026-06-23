'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '../icons';
import { cover, pickCover } from '../../lib/img';   // pure module — NOT @/lib/db (db pulls server-only auth into this client component)

type Place = { id: string; name: string; category: string; subcategory: string | null; lat: number; lng: number; rev_n: number; rev_avg: string | null; image_urls?: string[] | null };

const NIMMAN: [number, number] = [18.7965, 98.9685];
const COLORS: Record<string, string> = { eat: '#F4A52B', see: '#2B74FF', do: '#8A5CF6' };
const catTH = (c: string) => (c === 'eat' ? 'กิน' : c === 'see' ? 'เที่ยว' : 'ทำกิจกรรม');
const FILTERS = [{ k: '', l: 'ทั้งหมด' }, { k: 'eat', l: 'กิน' }, { k: 'see', l: 'เที่ยว' }, { k: 'do', l: 'ทำกิจกรรม' }];

function haversine(a: [number, number], b: [number, number]) {
  const R = 6371, toR = (d: number) => (d * Math.PI) / 180;
  const dLat = toR(b[0] - a[0]), dLng = toR(b[1] - a[1]);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a[0])) * Math.cos(toR(b[0])) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}
const walkMin = (km: number) => Math.max(1, Math.round((km / 5) * 60));
const loadCss = (id: string, href: string) => { if (!document.getElementById(id)) { const l = document.createElement('link'); l.id = id; l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l); } };
const loadJs = (src: string) => new Promise<void>((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = () => res(); s.onerror = () => rej(); document.body.appendChild(s); });

export default function MapView({ places, focus }: { places: Place[]; focus?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const meRef = useRef<any>(null);
  const cardById = useRef<Record<string, HTMLAnchorElement | null>>({});
  const focused = useRef(false);
  const [cat, setCat] = useState('');
  const [qtext, setQtext] = useState('');
  const [sel, setSel] = useState<string | null>(null);
  const [me, setMe] = useState<[number, number] | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let dead = false;
    async function boot() {
      const w = window as any;
      loadCss('leaflet-css', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
      loadCss('mcl-css', 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css');
      loadCss('mcl-css-d', 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css');
      if (!w.L) await loadJs('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');
      if (!w.L.markerClusterGroup) await loadJs('https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js');
      if (dead || mapRef.current || !hostRef.current) return;
      const L = w.L;
      const map = L.map(hostRef.current, { zoomControl: false, attributionControl: false }).setView(NIMMAN, 15);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
      L.control.zoom({ position: 'bottomright' }).addTo(map);
      L.control.attribution({ position: 'bottomleft', prefix: false }).addAttribution('© OpenStreetMap, © CARTO').addTo(map);
      layerRef.current = L.markerClusterGroup({ maxClusterRadius: 46, showCoverageOnHover: false, spiderfyOnMaxZoom: true });
      map.addLayer(layerRef.current);
      mapRef.current = map;
      setReady(true);
    }
    boot();
    return () => { dead = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []);

  const ql = qtext.trim().toLowerCase();
  const shown = places
    .filter((p) => !cat || p.category === cat)
    .filter((p) => !ql || p.name.toLowerCase().includes(ql))
    .map((p) => ({ ...p, km: me ? haversine(me, [p.lat, p.lng]) : null }))
    .sort((a, b) => (me ? (a.km! - b.km!) : ((b.rev_n - a.rev_n) || (Number(b.rev_avg) - Number(a.rev_avg)))));

  useEffect(() => {
    const w = window as any; const L = w.L; const grp = layerRef.current;
    if (!ready || !L || !grp) return;
    grp.clearLayers();
    shown.forEach((p) => {
      const c = COLORS[p.category] || '#6B6862';
      const on = p.id === sel;
      const img = pickCover(p.image_urls, p.id, p.subcategory, p.category, 80, 80);
      const kmText = p.km == null ? '' : p.km < 1 ? `${Math.round(p.km * 1000)} ม.` : `${p.km.toFixed(1)} กม.`;
      const icon = L.divIcon({
        className: 'pinx-wrap',
        html: `<span class="pinx${on ? ' on' : ''}" style="--c:${c}"><span class="pinx-ph" style="background-image:url('${img}')"></span>${kmText ? `<span class="pinx-km">${kmText}</span>` : ''}</span>`,
        iconSize: [56, 70], iconAnchor: [28, 47],
      });
      const mk = L.marker([p.lat, p.lng], { icon, zIndexOffset: on ? 1000 : 0 });
      mk.on('click', () => select(p.id, true));
      grp.addLayer(mk);
    });
  }, [ready, cat, sel, me, qtext]);

  // deep-link focus (from /map?focus=id)
  useEffect(() => {
    if (!ready || focused.current || !focus) return;
    if (places.some((p) => p.id === focus)) { focused.current = true; select(focus, true); }
  }, [ready]);

  function select(id: string, fromPin: boolean) {
    setSel(id);
    const p = places.find((x) => x.id === id); const map = mapRef.current;
    if (p && map) map.setView([p.lat, p.lng], Math.max(map.getZoom(), 16));
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
        <div className="map-searchrow">
          <Link className="map-back" href="/"><Icon n="back" size={18} /></Link>
          <div className="map-search">
            <Icon n="search" size={17} />
            <input value={qtext} onChange={(e) => { setQtext(e.target.value); setSel(null); }} placeholder="ค้นหาร้าน / สถานที่" inputMode="search" aria-label="ค้นหาร้าน / สถานที่" />
            {qtext && <button type="button" className="map-search-x" onClick={() => setQtext('')} aria-label="ล้างคำค้น"><Icon n="x" size={14} /></button>}
          </div>
        </div>
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
          <Link key={p.id} ref={(el) => { cardById.current[p.id] = el; }} href={`/place/${p.id}`}
            className={`map-card ${p.id === sel ? 'on' : ''}`} onMouseEnter={() => select(p.id, false)}>
            <img src={pickCover(p.image_urls, p.id, p.subcategory, p.category, 160, 160)} alt="" loading="lazy" />
            <div className="mc">
              <div className="mc-nm">{p.name}</div>
              <div className="mc-meta">
                {p.rev_n > 0 && <span className="rate"><Icon n="star" fill="currentColor" size={12} /> {p.rev_avg}</span>}
                {p.rev_n > 0 && <span className="sep">·</span>}
                {p.km != null ? <span><Icon n="locate" size={11} className="flat-ico" style={{ color: 'var(--muted)' }} /> เดิน {walkMin(p.km)} นาที</span> : <span>{catTH(p.category)}</span>}
              </div>
            </div>
          </Link>
        ))}
        {shown.length === 0 && <div className="map-card" style={{ justifyContent: 'center', color: 'var(--muted)' }}>ไม่มีร้านในหมวดนี้</div>}
      </div>
    </div>
  );
}
