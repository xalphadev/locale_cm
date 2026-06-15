'use client';
import { useEffect, useRef } from 'react';

type Pin = { lat: number; lng: number; cat: string };
const COLORS: Record<string, string> = { eat: '#FF5436', see: '#16A06A', do: '#8A5CF6' };

export default function MapPeek({ pins }: { pins: Pin[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  useEffect(() => {
    let dead = false;
    async function boot() {
      const w = window as any;
      if (!document.getElementById('leaflet-css')) {
        const l = document.createElement('link'); l.id = 'leaflet-css'; l.rel = 'stylesheet';
        l.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(l);
      }
      if (!w.L) await new Promise<void>((res, rej) => { const s = document.createElement('script'); s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; s.onload = () => res(); s.onerror = () => rej(); document.body.appendChild(s); });
      if (dead || mapRef.current || !ref.current) return;
      const L = w.L;
      const m = L.map(ref.current, { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, tap: false }).setView([18.7965, 98.9685], 14);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(m);
      pins.forEach((p) => {
        const c = COLORS[p.cat] || '#6C6C74';
        L.marker([p.lat, p.lng], { interactive: false, icon: L.divIcon({ className: 'pin-wrap', html: `<span class="pindot" style="--c:${c}"></span>`, iconSize: [11, 11], iconAnchor: [6, 6] }) }).addTo(m);
      });
      mapRef.current = m;
    }
    boot();
    return () => { dead = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []);
  return (
    <a className="mappeek" href="/map">
      <div ref={ref} className="mappeek-host" />
      <div className="mappeek-cta"><span>สำรวจบนแผนที่</span><span className="mappeek-chip">{pins.length} ที่ใกล้คุณ</span></div>
    </a>
  );
}
