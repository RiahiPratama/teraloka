'use client';
// ════════════════════════════════════════════════════════════════
// BAKOS — Peta sebaran kos per KELURAHAN (interaktif)
// PATH: src/components/bakos/public/map/BakosKotaMap.tsx
// Pola Leaflet niru balapor-public-map: react-leaflet + vanilla L +
// lazy markercluster (Pattern RR). Marker = jumlah kos; cluster = SUM.
// Klik marker → onPick(location_id, kelurahan). Center Ternate.
// ════════════════════════════════════════════════════════════════
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

import { useEffect, useRef } from 'react';
import type { LatLngExpression } from 'leaflet';
import L from 'leaflet';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';

export interface KelurahanPoint {
  location_id: string;
  kelurahan: string;
  kecamatan: string | null;
  latitude: number;
  longitude: number;
  jumlah_kos: number;
}

const TILE_LIGHT = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';
const TERNATE_CENTER: LatLngExpression = [0.79, 127.38];

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function pinSize(n: number): number { return n < 5 ? 34 : n < 10 ? 40 : 48; }

/* ─── Cluster + marker layer (vanilla L via useMap) ─── */
function KosMarkerLayer({
  points, onPick,
}: { points: KelurahanPoint[]; onPick: (id: string, nama: string) => void }) {
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
          for (const m of c.getAllChildMarkers()) sum += (m.options?.kosCount as number) || 0;
          const size = sum < 10 ? 44 : sum < 50 ? 52 : 60;
          return L.divIcon({
            html: `<div class="bkmap-pin lg">${sum}</div>`,
            className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2],
          });
        },
      });

      for (const p of valid) {
        const size = pinSize(p.jumlah_kos);
        const marker = L.marker([p.latitude, p.longitude], {
          icon: L.divIcon({
            html: `<div class="bkmap-pin">${p.jumlah_kos}</div>`,
            className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2],
          }),
          // @ts-expect-error — custom option buat sum di cluster
          kosCount: p.jumlah_kos,
        });
        marker.bindTooltip(
          `<b>${esc(p.kelurahan)}</b> · ${p.jumlah_kos} kos`,
          { direction: 'top', offset: [0, -size / 2], className: 'bkmap-tip' },
        );
        marker.on('click', () => onPick(p.location_id, p.kelurahan));
        cluster.addLayer(marker);
      }

      cluster.addTo(map);
      layerRef.current = cluster;
      try { map.fitBounds(cluster.getBounds().pad(0.25), { maxZoom: 14 }); } catch { /* noop */ }
    }
    setup();
    return () => {
      cancelled = true;
      if (layerRef.current) { map.removeLayer(layerRef.current); layerRef.current = null; }
    };
  }, [map, points, onPick]);

  return null;
}

export function BakosKotaMap({
  points, onPick, height = 460, locked = false,
}: { points: KelurahanPoint[]; onPick: (id: string, nama: string) => void; height?: number; locked?: boolean }) {
  return (
    <div className="bkmap-leaflet" style={{ height, width: '100%' }}>
      <MapContainer
        center={TERNATE_CENTER} zoom={13} minZoom={11} maxZoom={18}
        scrollWheelZoom={false} dragging={!locked} touchZoom={!locked} doubleClickZoom={!locked} zoomControl={!locked}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer url={TILE_LIGHT} attribution={TILE_ATTR} />
        <KosMarkerLayer points={points} onPick={onPick} />
      </MapContainer>
    </div>
  );
}
