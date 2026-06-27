'use client';
// ════════════════════════════════════════════════════════════════
// BALAUNDRY — Peta sebaran laundry per node lokasi (interaktif)
// PATH: src/components/balaundry/public/map/BalaundryKotaMap.tsx
// Clone bakos/public/map/BakosKotaMap. Leaflet + vanilla L + lazy
// markercluster (Pattern RR). Marker = jumlah_laundry; cluster = SUM.
// Klik marker → onPick(location_id, kelurahan). Center Ternate. Royal blue.
// ════════════════════════════════════════════════════════════════
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

import { useEffect, useRef } from 'react';
import type { LatLngExpression } from 'leaflet';
import L from 'leaflet';
import { MapContainer, TileLayer, useMap, ZoomControl } from 'react-leaflet';

export interface LaundryPoint {
  location_id: string;
  kelurahan: string;
  kecamatan: string | null;
  latitude: number;
  longitude: number;
  jumlah_laundry: number;
}

const TILE_LIGHT = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';
const TERNATE_CENTER: LatLngExpression = [0.79, 127.38];

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function pinSize(n: number): number { return n < 5 ? 34 : n < 10 ? 40 : 48; }

// SVG marker — local_laundry vibe (lingkaran + ikon + angka).
const PIN_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="blmap-h-ic"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M7 6.5h2"/></svg>';

/* ─── Cluster + marker layer (vanilla L via useMap) ─── */
function LaundryMarkerLayer({
  points, onPick,
}: { points: LaundryPoint[]; onPick: (id: string, nama: string) => void }) {
  const map = useMap();
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function setup() {
      await import('leaflet.markercluster'); // Pattern RR
      if (cancelled) return;
      if (layerRef.current) { map.removeLayer(layerRef.current); layerRef.current = null; }

      const valid = points.filter((p) => p.latitude != null && p.longitude != null);
      if (valid.length === 0) return;

      const cluster = L.markerClusterGroup({
        maxClusterRadius: 45,
        showCoverageOnHover: false,
        spiderfyOnMaxZoom: true,
        iconCreateFunction: (c: any) => {
          let sum = 0;
          for (const m of c.getAllChildMarkers()) sum += (m.options?.laundryCount as number) || 0;
          const size = sum < 10 ? 44 : sum < 50 ? 52 : 60;
          return L.divIcon({
            html: `<div class="blmap-circle lg">${PIN_SVG}<span class="blmap-cnum">${sum}</span></div>`,
            className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2],
          });
        },
      });

      for (const p of valid) {
        const size = pinSize(p.jumlah_laundry);
        const marker = L.marker([p.latitude, p.longitude], {
          icon: L.divIcon({
            html: `<div class="blmap-circle ">${PIN_SVG}<span class="blmap-cnum">${p.jumlah_laundry}</span></div>`,
            className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2],
          }),
          // @ts-expect-error — custom option buat sum di cluster
          laundryCount: p.jumlah_laundry,
        });
        marker.bindTooltip(
          `<b>${esc(p.kelurahan)}</b> · ${p.jumlah_laundry} laundry`,
          { direction: 'top', offset: [0, -size / 2], className: 'blmap-tip' },
        );
        marker.on('click', () => onPick(p.location_id, p.kelurahan));
        cluster.addLayer(marker);
      }

      cluster.addTo(map);
      layerRef.current = cluster;
      try {
        const b = cluster.getBounds();
        map.fitBounds(b.pad(0.25), { maxZoom: 14 });
        map.setMaxBounds(b.pad(0.6));
        map.setMinZoom(Math.max(11, map.getBoundsZoom(b.pad(0.6))));
      } catch { /* noop */ }
    }
    setup();
    return () => {
      cancelled = true;
      if (layerRef.current) { map.removeLayer(layerRef.current); layerRef.current = null; }
    };
  }, [map, points, onPick]);

  return null;
}

export function BalaundryKotaMap({
  points, onPick, height = 340, locked = false, pannable = false,
}: { points: LaundryPoint[]; onPick: (id: string, nama: string) => void; height?: number; locked?: boolean; pannable?: boolean }) {
  return (
    <div className="blmap-leaflet" style={{ height, width: '100%' }}>
      <MapContainer
        center={TERNATE_CENTER} zoom={13} minZoom={10} maxZoom={18}
        scrollWheelZoom={false}
        dragging={pannable || !locked}
        touchZoom={pannable || !locked}
        doubleClickZoom={!locked && !pannable}
        zoomControl={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer url={TILE_LIGHT} attribution={TILE_ATTR} />
        {(pannable || !locked) && <ZoomControl position="bottomright" />}
        <LaundryMarkerLayer points={points} onPick={onPick} />
      </MapContainer>
    </div>
  );
}
