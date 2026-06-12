'use client';

// ════════════════════════════════════════════════════════════════
// BAKOS Detail — KosDetailMap (single marker, READ-ONLY) — ala Airbnb
// PATH: src/components/bakos/public/detail/KosDetailMap.tsx
// ────────────────────────────────────────────────────────────────
// Marker = ikon RUMAH bulat (bukan pin) + lingkaran privacy radius
// (lokasi persis disamarkan — record-only, sama semangat Airbnb).
// Klik peta → MODAL FULL-SCREEN (peta besar + tombol tutup).
// 🛡️ dynamic(ssr:false) dari pemanggil (Leaflet pecah di SSR).
// PENANDA: BK-MAP-HOUSE
// ════════════════════════════════════════════════════════════════

import 'leaflet/dist/leaflet.css';
import { useState, useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Circle } from 'react-leaflet';

const TILE = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

// Ikon rumah bulat (hitam) dengan rumah putih di tengah — ala Airbnb.
function houseIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `
      <div style="width:46px;height:46px;border-radius:50%;background:#1F2937;
        display:flex;align-items:center;justify-content:center;
        border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.35)">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff"
          strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/>
          <path d="M9.5 20v-5h5v5"/>
        </svg>
      </div>`,
    iconSize: [46, 46],
    iconAnchor: [23, 23],   // center (bukan tip pin — ini bulat)
  });
}

function MapBody({ lat, lng, interactive }: { lat: number; lng: number; interactive: boolean }) {
  return (
    <MapContainer
      center={[lat, lng]} zoom={15}
      scrollWheelZoom={interactive} dragging={interactive}
      touchZoom={interactive} doubleClickZoom={interactive}
      zoomControl={interactive}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer url={TILE} attribution={ATTR} />
      {/* privacy radius — lokasi persis disamarkan (record-only) */}
      <Circle center={[lat, lng]} radius={260}
        pathOptions={{ color: '#1F2937', weight: 0, fillColor: '#1F2937', fillOpacity: 0.10 }} />
      <Marker position={[lat, lng]} icon={houseIcon()} />
    </MapContainer>
  );
}

export default function KosDetailMap({ lat, lng, height = 220 }: { lat: number; lng: number; height?: number }) {
  const [open, setOpen] = useState(false);

  // kunci scroll body saat modal terbuka + tutup via Escape
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <>
      {/* Peta preview (non-interaktif) — klik buka modal full */}
      <div
        className="bkd-map-preview"
        style={{ height, width: '100%', borderRadius: 12, overflow: 'hidden', position: 'relative', cursor: 'pointer' }}
        onClick={() => setOpen(true)}
        role="button"
        aria-label="Perbesar peta lokasi"
      >
        <div style={{ pointerEvents: 'none', height: '100%' }}>
          <MapBody lat={lat} lng={lng} interactive={false} />
        </div>
        {/* tombol perbesar (pojok kanan-atas, ala Airbnb) */}
        <div className="bkd-map-expand" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1F2937"
            strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/>
          </svg>
        </div>
      </div>

      {/* MODAL full-screen */}
      {open && (
        <div className="bkd-map-modal" role="dialog" aria-modal="true">
          <div className="bkd-map-modal-body">
            <MapBody lat={lat} lng={lng} interactive={true} />
          </div>
          <button className="bkd-map-close" onClick={() => setOpen(false)} aria-label="Tutup peta">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1F2937"
              strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18"/><path d="M6 6l12 12"/>
            </svg>
          </button>
        </div>
      )}
    </>
  );
}
