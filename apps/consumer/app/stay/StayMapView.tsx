'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from '../icons';
import { STAY_KIND_TH as KIND_TH } from '@/lib/facets';

type Pin = { id: string; name: string; lat: number; lng: number; kind: string; priceFrom: number | null; badge: string; live: boolean; img: string };

const NIMMAN: [number, number] = [18.7965, 98.9685];
const KIND_COLORS: Record<string, string> = {
  dorm: '#16284D', apartment: '#1A73E8', condo: '#1559C7', mansion: '#28457C', house: '#16284D',
  homestay: '#28457C', hotel: '#F5B500', guesthouse: '#1559C7',
};
const loadCss = (id: string, href: string) => { if (!document.getElementById(id)) { const l = document.createElement('link'); l.id = id; l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l); } };
const loadJs = (src: string) => new Promise<void>((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = () => res(); s.onerror = () => rej(); document.body.appendChild(s); });

export default function StayMapView({ pins, focus, full, backHref, qs, children }: { pins: Pin[]; focus?: string; full?: boolean; backHref?: string; qs?: string; children?: ReactNode }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const cardById = useRef<Record<string, HTMLAnchorElement | null>>({});
  const railRef = useRef<HTMLDivElement>(null);
  const scrollTmr = useRef<any>(null);
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
      L.control.zoom({ position: 'topright' }).addTo(map);
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
      const icon = L.divIcon({ className: 'pin-wrap', html: `<span class="stay-pin${on ? ' on' : ''}" style="--c:${c}"><img src="${p.img}" alt="" /><b>${p.badge}</b></span>`, iconSize: [84, 32], iconAnchor: [42, 32] });
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

  // touch carousel: when a swipe settles, select the card nearest the rail centre (pans the map +
  // highlights its pin). onMouseEnter only fires on desktop, so this is the mobile equivalent.
  function onRailScroll() {
    clearTimeout(scrollTmr.current);
    scrollTmr.current = setTimeout(() => {
      const rail = railRef.current; if (!rail) return;
      const center = rail.scrollLeft + rail.clientWidth / 2;
      let best: string | null = null, bestD = Infinity;
      for (const p of pins) {
        const el = cardById.current[p.id]; if (!el) continue;
        const dd = Math.abs(el.offsetLeft + el.offsetWidth / 2 - center);
        if (dd < bestD) { bestD = dd; best = p.id; }
      }
      if (best && best !== sel) select(best, false);
    }, 120);
  }

  return (
    <div className={full ? 'mapscreen' : 'staymap'}>
      <div ref={hostRef} className="leaflet-host" />
      {full && (
        <div className="map-top">
          <div className="map-searchrow">
            <a className="map-back" href={backHref || '/stay'} aria-label="กลับไปรายการ"><Icon n="back" size={18} /></a>
            {children}
          </div>
        </div>
      )}
      {!ready && <div className="map-loading">กำลังโหลดแผนที่…</div>}
      <div className="map-rail" ref={railRef} onScroll={onRailScroll}>
        {pins.map((p) => (
          <a key={p.id} ref={(el) => { cardById.current[p.id] = el; }} href={`/place/${p.id}${qs || ''}`}
            className={`map-card ${p.id === sel ? 'on' : ''}`} onMouseEnter={() => select(p.id, false)}>
            <img src={p.img} alt="" loading="lazy" />
            <div className="mc">
              <div className="mc-nm">{p.name}</div>
              <div className="mc-meta">
                <span className={`rchip ${p.live ? 'season' : 'ask'}`}>{p.badge}</span>
                <span className="mc-kind">{KIND_TH[p.kind] || 'ที่พัก'}</span>
              </div>
              {p.priceFrom != null && <div className="mc-price">เริ่ม ฿{p.priceFrom.toLocaleString()}</div>}
            </div>
            <Icon n="chevR" size={18} className="flat-ico" />
          </a>
        ))}
        {pins.length === 0 && <div className="map-card" style={{ justifyContent: 'center', color: 'var(--muted)' }}>ไม่มีที่พักที่ปักหมุดในตัวกรองนี้</div>}
      </div>
    </div>
  );
}
