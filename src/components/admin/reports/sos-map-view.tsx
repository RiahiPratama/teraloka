'use client';

/**
 * TeraLoka — SOS Map View (Single Marker + Accuracy Circle)
 * Bridge Sprint Day 12 Step 7 Batch B2 (10 Mei 2026)
 * ------------------------------------------------------------
 * Display single SOS GPS marker dengan circle accuracy indicator.
 * Pattern reference: balapor-map-leaflet.tsx (lazy plugin load).
 *
 * Untuk multi-marker map view (Tab SOS list mode), pakai
 * BalaporMapLeaflet existing dengan adapt SOS shape ke Report shape.
 */

import 'leaflet/dist/leaflet.css';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Circle, useMap } from 'react-leaflet';
import { useTheme } from '@/lib/theme';
import type { LatLngExpression } from 'leaflet';
import type { AdminSosCall } from '@/types/sos-admin';
import { EMERGENCY_TYPE_OPTIONS } from '@/types/sos';

const TILE_LIGHT = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png';

interface SosMapViewProps {
  sos: AdminSosCall;
  height?: number;
}

export function SosMapView({ sos, height = 320 }: SosMapViewProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const tileUrl = isDark ? TILE_DARK : TILE_LIGHT;

  // Kalau gak ada GPS, render placeholder
  if (sos.latitude === null || sos.longitude === null) {
    return (
      <div
        className="rounded-2xl flex flex-col items-center justify-center"
        style={{
          height,
          background: 'var(--color-surface-muted)',
          border: '1px solid var(--color-border)',
        }}
      >
        <p
          className="text-sm font-bold"
          style={{ color: 'var(--color-text-muted)' }}
        >
          GPS tidak tersedia
        </p>
        <p
          className="text-xs mt-1"
          style={{ color: 'var(--color-text-subtle)' }}
        >
          Pelapor tidak memberikan koordinat lokasi
        </p>
      </div>
    );
  }

  const center: LatLngExpression = [sos.latitude, sos.longitude];
  const accuracy = sos.gps_accuracy_meters ?? 100; // default 100m kalau null

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        border: '1px solid var(--color-border)',
        height,
      }}
    >
      <MapContainer
        center={center}
        zoom={16}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          url={tileUrl}
          attribution="&copy; OpenStreetMap"
        />

        {/* Accuracy circle (transparent area) */}
        <Circle
          center={center}
          radius={accuracy}
          pathOptions={{
            color: '#EF4444',
            fillColor: '#EF4444',
            fillOpacity: 0.15,
            weight: 2,
          }}
        />

        {/* SOS marker */}
        <SosMarker sos={sos} />
      </MapContainer>
    </div>
  );
}

// ─── SOS Marker Component (custom HTML icon) ──────────────────

function SosMarker({ sos }: { sos: AdminSosCall }) {
  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (sos.latitude === null || sos.longitude === null) return;

    const typeMeta = EMERGENCY_TYPE_OPTIONS.find(
      (m) => m.type === sos.emergency_type,
    );

    // Custom HTML marker — gradient ring + emergency type icon
    const iconHtml = `
      <div style="
        position: relative;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: linear-gradient(135deg, #EF4444, #DC2626);
          box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.3), 0 4px 12px rgba(239, 68, 68, 0.4);
          animation: sos-pulse 2s ease-in-out infinite;
        "></div>
        <span class="material-symbols-outlined" style="
          position: relative;
          color: white;
          font-size: 20px;
          font-variation-settings: 'FILL' 1, 'wght' 700;
        ">
          ${typeMeta?.iconName ?? 'emergency'}
        </span>
      </div>
      <style>
        @keyframes sos-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      </style>
    `;

    const customIcon = L.divIcon({
      html: iconHtml,
      className: 'sos-custom-marker',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    const marker = L.marker([sos.latitude, sos.longitude], {
      icon: customIcon,
    }).addTo(map);

    // Popup minimal
    marker.bindPopup(`
      <div style="font-family: system-ui; padding: 4px;">
        <strong>${sos.display_id}</strong><br/>
        <span style="color: #6b7280; font-size: 11px;">
          ${typeMeta?.label ?? sos.emergency_type}
        </span>
      </div>
    `);

    markerRef.current = marker;

    return () => {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
    };
  }, [map, sos]);

  return null;
}
