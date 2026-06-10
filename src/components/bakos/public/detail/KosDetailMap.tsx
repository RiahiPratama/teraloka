'use client';

// ════════════════════════════════════════════════════════════════
// BAKOS Detail — KosDetailMap (single pin, READ-ONLY)
// PATH: src/components/bakos/public/detail/KosDetailMap.tsx
// ────────────────────────────────────────────────────────────────
// Pin presisi 1 kos di halaman detail. Beda dari BakosKotaMap (sebaran
// cluster multi-kelurahan). Dipakai HANYA kalau lat/long ada (= kos
// berlangganan; backend redactKosDetail null-kan buat yang belum bayar).
// 🛡️ dynamic(ssr:false) dari pemanggil (Leaflet pecah di SSR).
// ════════════════════════════════════════════════════════════════

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';

const TILE = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

function pinIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="width:24px;height:24px;border-radius:50% 50% 50% 0;background:#854F0B;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
  });
}

export default function KosDetailMap({ lat, lng, height = 220 }: { lat: number; lng: number; height?: number }) {
  return (
    <div style={{ height, width: '100%', borderRadius: 12, overflow: 'hidden' }}>
      <MapContainer center={[lat, lng]} zoom={16} scrollWheelZoom={false} dragging touchZoom doubleClickZoom style={{ height: '100%', width: '100%' }}>
        <TileLayer url={TILE} attribution={ATTR} />
        <Marker position={[lat, lng]} icon={pinIcon()} />
      </MapContainer>
    </div>
  );
}
