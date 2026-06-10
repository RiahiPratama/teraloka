'use client';

// ════════════════════════════════════════════════════════════════
// BAKOS — KosMapPickerInner (pure Leaflet, INNER)
// PATH: src/components/bakos/owner/KosMapPickerInner.tsx
// PENANDA: L5-FE-KOS-MAP-INNER
// ────────────────────────────────────────────────────────────────
// Niru pola BalajuMapPickerLeaflet (proven) — amber, domain BAKOS sendiri.
// 🛡️ HARUS di-render via dynamic(ssr:false) dari KosMapPicker (Leaflet pecah
//    di SSR: "window/L is not defined"). divIcon custom (hindari asset rusak).
// ════════════════════════════════════════════════════════════════

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { useEffect } from 'react';

export interface LatLng { lat: number; lng: number; }

const BRAND = '#854F0B'; // amber BAKOS

function pinIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;background:${BRAND};transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
  });
}

function ClickCatcher({ onPick }: { onPick: (c: LatLng) => void }) {
  useMapEvents({ click(e) { onPick({ lat: e.latlng.lat, lng: e.latlng.lng }); } });
  return null;
}

function Recenter({ center }: { center: LatLng }) {
  const map = useMap();
  useEffect(() => { map.setView([center.lat, center.lng], map.getZoom()); }, [center.lat, center.lng, map]);
  return null;
}

export default function KosMapPickerInner({
  center, marker, onPick, height = 220,
}: {
  center: LatLng; marker: LatLng | null; onPick: (c: LatLng) => void; height?: number;
}) {
  return (
    <MapContainer center={[center.lat, center.lng]} zoom={15} style={{ height, width: '100%' }} scrollWheelZoom={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickCatcher onPick={onPick} />
      <Recenter center={center} />
      {marker && (
        <Marker
          position={[marker.lat, marker.lng]}
          icon={pinIcon()}
          draggable
          eventHandlers={{ dragend(e) { const ll = e.target.getLatLng(); onPick({ lat: ll.lat, lng: ll.lng }); } }}
        />
      )}
    </MapContainer>
  );
}
