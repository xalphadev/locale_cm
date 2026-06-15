'use client';
import { useEffect, useRef, useState } from 'react';

// Leaflet click/drag pin picker for the merchant shop editor. Writes lat/lng into the two
// number inputs (name=lat/lng) which submit with the existing updateShopAction form — so it
// degrades to manual entry without JS, and a merchant can paste a Google Maps coordinate.
const NIMMAN: [number, number] = [18.7965, 98.9685];
const loadCss = (id: string, href: string) => { if (!document.getElementById(id)) { const l = document.createElement('link'); l.id = id; l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l); } };
const loadJs = (src: string) => new Promise<void>((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = () => res(); s.onerror = () => rej(); document.body.appendChild(s); });

export default function GeoPicker({ lat0, lng0 }: { lat0?: number | null; lng0?: number | null }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markRef = useRef<any>(null);
  const [lat, setLat] = useState(lat0 != null ? String(lat0) : '');
  const [lng, setLng] = useState(lng0 != null ? String(lng0) : '');

  useEffect(() => {
    let dead = false;
    async function boot() {
      const w = window as any;
      loadCss('leaflet-css', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
      if (!w.L) await loadJs('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');
      if (dead || mapRef.current || !hostRef.current) return;
      const L = w.L;
      const start: [number, number] = (lat0 != null && lng0 != null) ? [lat0, lng0] : NIMMAN;
      const map = L.map(hostRef.current, { attributionControl: false }).setView(start, 16);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
      const mk = L.marker(start, { draggable: true }).addTo(map);
      mk.on('dragend', () => { const ll = mk.getLatLng(); setLat(ll.lat.toFixed(6)); setLng(ll.lng.toFixed(6)); });
      map.on('click', (e: any) => { mk.setLatLng(e.latlng); setLat(e.latlng.lat.toFixed(6)); setLng(e.latlng.lng.toFixed(6)); });
      mapRef.current = map; markRef.current = mk;
    }
    boot();
    return () => { dead = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []);

  function moveTo(a: number, b: number) {
    if (isFinite(a) && isFinite(b) && markRef.current && mapRef.current) {
      markRef.current.setLatLng([a, b]); mapRef.current.setView([a, b], mapRef.current.getZoom());
    }
  }
  function locate() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const a = pos.coords.latitude, b = pos.coords.longitude;
      setLat(a.toFixed(6)); setLng(b.toFixed(6)); moveTo(a, b);
    }, undefined, { enableHighAccuracy: true, timeout: 8000 });
  }

  return (
    <div className="geopick">
      <div ref={hostRef} className="geopick-map" />
      <div className="geopick-row">
        <label>Lat<input name="lat" value={lat} inputMode="decimal" placeholder="18.7965"
          onChange={(e) => { setLat(e.target.value); moveTo(parseFloat(e.target.value), parseFloat(lng)); }} /></label>
        <label>Lng<input name="lng" value={lng} inputMode="decimal" placeholder="98.9685"
          onChange={(e) => { setLng(e.target.value); moveTo(parseFloat(lat), parseFloat(e.target.value)); }} /></label>
        <button type="button" className="mini" onClick={locate}>ใช้ตำแหน่งปัจจุบัน</button>
      </div>
      <p className="note">ลากหมุด หรือแตะบนแผนที่เพื่อปักตำแหน่งร้านจริง (ลูกค้าใช้หาคุณบนแผนที่ “ที่พัก”)</p>
    </div>
  );
}
