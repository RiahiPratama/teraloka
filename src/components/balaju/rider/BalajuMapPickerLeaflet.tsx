'use client';

/**
 * TeraLoka — BalajuMapPickerLeaflet (Pure Leaflet, inner)
 * F7-1b-i (5 Jun 2026)
 * ------------------------------------------------------------
 * Peta pilih 1 titik: tap peta ATAU geser pin → koordinat keluar via onPick.
 * OSM tiles (GRATIS, no API key). Light theme. Mobile-first.
 *
 * Hotfix Pattern (RR): import 'leaflet' + CSS di top, komponen ini HANYA
 * di-render via dynamic(ssr:false) dari wrapper — aman dari "window/L
 * is not defined" saat SSR.
 *
 * Default marker icon Leaflet rusak di bundler (path gambar) — kita pakai
 * divIcon custom (dot warna brand) biar nggak perlu asset eksternal.
 */

import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { useEffect } from 'react';
import type { LatLng } from './BalajuMapPicker';

const BRAND = '#1B6B4A';

// divIcon: pin dot brand (hindari asset marker default Leaflet yg rusak di bundler).
function pinIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:22px;height:22px;border-radius:50% 50% 50% 0;
      background:${BRAND};transform:rotate(-45deg);
      border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
  });
}

// Nangkep tap di peta → onPick.
function ClickCatcher({ onPick }: { onPick: (c: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

// Re-center peta saat center prop berubah (mis. dari GPS / autocomplete nanti).
function Recenter({ center }: { center: LatLng }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], map.getZoom());
  }, [center.lat, center.lng, map]);
  return null;
}

export function BalajuMapPickerLeaflet({
  center,
  marker,
  onPick,
  height,
}: {
  center: LatLng;
  marker: LatLng | null;
  onPick: (c: LatLng) => void;
  height: number;
}) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={15}
      style={{ height, width: '100%' }}
      scrollWheelZoom={false}
    >
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
          eventHandlers={{
            dragend(e) {
              const ll = e.target.getLatLng();
              onPick({ lat: ll.lat, lng: ll.lng });
            },
          }}
        />
      )}
    </MapContainer>
  );
}
