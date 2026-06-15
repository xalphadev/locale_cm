'use client';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '../icons';

type Pin = { id: string; name: string; lat: number; lng: number; kind: string; vac: number; priceFrom: number | null; badge: string; live: boolean };

const NIMMAN: [number, number] = [18.7965, 98.9685];
const KIND_COLORS: Record<string, string> = { dorm: '#8A5CF6', apartment: '#1A73E8', homestay: '#16A06A', hotel: '#F4A52B', guesthouse: '#EA580C' };
const KIND_TH: Record<string, string> = { dorm: 'หอพัก', apartment: 'อพาร์ตเมนต์', homestay: 'โฮมสเตย์', hotel: 'โรงแรม', guesthouse: 'เกสต์เฮาส์' };
const loadCss = (id: string, href: string) => { if (!document.getElementById(id)) { const l = document.createElement('link'); l.id = id; l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l); } };
const loadJs = (src: string) => new Promise<void>((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = () => res(); s.onerror = () => rej(); document.body.appendChild(s); });

export default function StayMapView({ pins, focus }: { pins: Pin[]; focus?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const cardById = useRef<Record<string, HTMLAnchorElement | null>>({});
  const focused = useRef(false);
  const [sel, setSel] = useState<string | null>(null);
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

  useEffect(() => {
    const w = window as any; const L = w.L; const grp = layerRef.current;
    if (!ready || !L || !grp) return;
    grp.clearLayers();
    pins.forEach((p) => {
      const c = p.live ? (KIND_COLORS[p.kind] || '#1A73E8') : '#9AA0A6';
      const on = p.id === sel;
      const icon = L.divIcon({ className: 'pin-wrap', html: `<span class="stay-pin${on ? ' on' : ''}" style="--c:${c}"><b>${p.badge}</b></span>`, iconSize: [54, 26], iconAnchor: [27, 26] });
      const mk = L.marker([p.lat, p.lng], { icon, zIndexOffset: (on ? 2000 : 0) + (p.live ? 500 : 0) });
      mk.on('click', () => select(p.id, true));
      grp.addLayer(mk);
    });
    if (pins.length && !focused.current && !focus) {
      try { grp.getBounds().isValid() && mapRef.current.fitBounds(grp.getBounds().pad(0.25), { maxZoom: 16 }); } catch { /* single pin */ }
    }
  }, [ready, sel, pins]);

  useEffect(() => {
    if (!ready || focused.current || !focus) return;
    if (pins.some((p) => p.id === focus)) { focused.current = true; select(focus, true); }
  }, [ready]);

  function select(id: string, fromPin: boolean) {
    setSel(id);
    const p = pins.find((x) => x.id === id); const map = mapRef.current;
    if (p && map) map.setView([p.lat, p.lng], Math.max(map.getZoom(), 16));
    if (fromPin) cardById.current[id]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }

  return (
    <div className="staymap">
      <div ref={hostRef} className="leaflet-host" />
      {!ready && <div className="map-loading">กำลังโหลดแผนที่…</div>}
      <div className="map-rail">
        {pins.map((p) => (
          <a key={p.id} ref={(el) => { cardById.current[p.id] = el; }} href={`/place/${p.id}`}
            className={`map-card ${p.id === sel ? 'on' : ''}`} onMouseEnter={() => select(p.id, false)}>
            <div className="mc">
              <div className="mc-nm">{p.name}</div>
              <div className="mc-meta">
                <span className={`rchip ${p.live ? 'season' : 'ask'}`} style={{ fontSize: '.7rem', padding: '.1rem .45rem' }}>{p.badge}</span>
                <span className="sep">·</span>
                <span>{KIND_TH[p.kind] || 'ที่พัก'}{p.priceFrom != null ? ` · เริ่ม ฿${p.priceFrom.toLocaleString()}` : ''}</span>
              </div>
            </div>
            <Icon n="chevR" size={18} className="flat-ico" />
          </a>
        ))}
        {pins.length === 0 && <div className="map-card" style={{ justifyContent: 'center', color: 'var(--muted)' }}>ไม่มีที่พักที่ปักหมุดในตัวกรองนี้</div>}
      </div>
    </div>
  );
}
