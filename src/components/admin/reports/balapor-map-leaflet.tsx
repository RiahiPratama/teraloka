'use client';

/**
 * TeraLoka — BalaporMapLeaflet (Inner component, Leaflet-based)
 * Phase 2 · Batch 7b2 — Reports Map
 * Updated: 10 Mei 2026 — Day 3-4 A3 Admin Live Map Cluster
 *   - Replace CircleMarker → DivIcon Marker (untuk cluster compatibility)
 *   - Add MarkerClusterLayer (vanilla L.markerClusterGroup via useMap hook)
 *   - Custom cluster icon: color by dominant priority, size by count
 * ------------------------------------------------------------
 * Real geographic map untuk laporan BALAPOR pakai react-leaflet v5
 * + leaflet.markercluster plugin.
 *
 * Tidak untuk di-import langsung — selalu via <BalaporMap />
 * (wrapper di balapor-map.tsx) yang handle dynamic import SSR-safe.
 *
 * Cluster behavior:
 * - maxClusterRadius: 50 (default, balanced)
 * - disableClusteringAtZoom: 11 (di zoom tinggi tampil individual)
 * - spiderfyOnMaxZoom: true (spiderfy markers tumpuk di max zoom)
 * - showCoverageOnHover: false (gak distract admin saat hover)
 *
 * Cluster icon visual:
 * - Color: gradient red kalau ada urgent, orange kalau ada high, green kalau normal
 * - Size: 36/44/52 px berdasarkan count (<10 / <50 / >=50)
 *
 * Marker individual visual:
 * - DivIcon styled circle (mimic CircleMarker dari versi sebelumnya)
 * - Size dari PRIORITY_CONFIG.mapMarkerRadius * 2
 *
 * Attribution: © OpenStreetMap contributors © CARTO
 */

import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';

import { useEffect, useMemo } from 'react';
import type { LatLngExpression } from 'leaflet';
import L from 'leaflet';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { useTheme } from '@/lib/theme';
import {
  PRIORITY_CONFIG,
  timeAgo,
  getCategoryConfig,
  type Report,
  type ReportPriority,
} from '@/types/reports';

/* ─── Tile provider URLs ─── */

const TILE_LIGHT =
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_DARK =
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

/* ─── Maluku Utara center ─── */

const MAP_CENTER: LatLngExpression = [0.5, 127.8];
const DEFAULT_ZOOM = 7;

/* ─── HTML escape helper untuk popup ─── */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ─── Build individual marker DivIcon (replace CircleMarker) ─── */

function buildMarkerIcon(priority: ReportPriority): L.DivIcon {
  const config = PRIORITY_CONFIG[priority];
  const size = config.mapMarkerRadius * 2;

  return L.divIcon({
    html: `<div style="
      width:${size}px;
      height:${size}px;
      border-radius:50%;
      background:${config.hex};
      border:2px solid white;
      box-shadow:0 1px 3px rgba(0,0,0,0.3);
      opacity:0.9;
    "></div>`,
    className: 'balapor-priority-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/* ─── Build popup HTML (manual, biar kerja dengan vanilla Leaflet marker) ─── */

function buildPopupHTML(r: Report): string {
  const config = PRIORITY_CONFIG[r.priority];
  const categoryConfig = getCategoryConfig(r.category);
  const locationStr = r.location ? ` · 📍 ${escapeHtml(r.location)}` : '';

  return `
    <div style="min-width:200px;font-family:Outfit,system-ui,sans-serif">
      <div style="font-weight:700;font-size:13px;color:#0F172A;margin-bottom:4px;line-height:1.3">
        ${escapeHtml(r.title)}
      </div>
      <div style="font-size:11px;color:#64748B;margin-bottom:6px">
        <span aria-hidden="true">${categoryConfig.emoji}</span>
        <span style="text-transform:capitalize">${escapeHtml(r.category || 'lainnya')}</span>${locationStr}
      </div>
      <div style="font-size:11px;color:#94A3B8;margin-bottom:8px">
        ${timeAgo(r.created_at)}
      </div>
      <div style="
        display:inline-flex;align-items:center;gap:4px;
        font-size:10px;font-weight:700;padding:2px 8px;
        border-radius:20px;
        background:${config.hex}22;color:${config.hex};
        border:1px solid ${config.hex}44;
      ">
        ${config.emoji} ${config.label}
      </div>
    </div>
  `;
}

/* ─── Cluster icon factory (color by dominant priority, scale by count) ─── */

interface ClusterMarker extends L.Marker {
  options: L.MarkerOptions & { _balaporPriority?: ReportPriority };
}

function buildClusterIcon(cluster: L.MarkerCluster): L.DivIcon {
  const count = cluster.getChildCount();
  const markers = cluster.getAllChildMarkers() as ClusterMarker[];

  // Hitung dominant priority — kalau ada urgent → red, kalau high → orange, else green
  let urgent = 0;
  let high = 0;
  for (const m of markers) {
    const p = m.options._balaporPriority;
    if (p === 'urgent') urgent++;
    else if (p === 'high') high++;
  }

  let bg: string;
  let border: string;
  if (urgent > 0) {
    bg = 'linear-gradient(135deg, #EF4444, #DC2626)';
    border = '#EF4444';
  } else if (high > 0) {
    bg = 'linear-gradient(135deg, #F59E0B, #D97706)';
    border = '#F59E0B';
  } else {
    bg = 'linear-gradient(135deg, #10B981, #059669)';
    border = '#10B981';
  }

  // Size by count
  const size = count < 10 ? 36 : count < 50 ? 44 : 52;
  const fontSize = count < 100 ? 13 : 11;

  return L.divIcon({
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${bg};
      border:3px solid white;
      border-radius:50%;
      box-shadow:0 2px 8px rgba(0,0,0,0.3), 0 0 0 1px ${border}33;
      display:flex;align-items:center;justify-content:center;
      color:white;font-weight:700;font-size:${fontSize}px;
      font-family:Outfit,system-ui,sans-serif;
    ">${count}</div>`,
    className: 'balapor-cluster-icon',
    iconSize: L.point(size, size),
  });
}

/* ─── MarkerClusterLayer — imperative Leaflet via useMap hook ─── */

interface MarkerClusterLayerProps {
  reports: Array<Report & { latitude: number; longitude: number }>;
  onMarkerClick?: (report: Report) => void;
}

function MarkerClusterLayer({ reports, onMarkerClick }: MarkerClusterLayerProps) {
  const map = useMap();

  useEffect(() => {
    // Type assertion needed — markerClusterGroup di-attach via side-effect import
    const clusterGroup = (L as unknown as {
      markerClusterGroup: (opts: L.MarkerClusterGroupOptions) => L.MarkerClusterGroup;
    }).markerClusterGroup({
      iconCreateFunction: buildClusterIcon,
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      disableClusteringAtZoom: 11,
      animate: true,
      animateAddingMarkers: false,
      chunkedLoading: true,
    });

    // Auto-fit bounds setup
    const bounds = L.latLngBounds(
      reports.map((r) => [r.latitude, r.longitude] as [number, number])
    );

    for (const r of reports) {
      const marker = L.marker([r.latitude, r.longitude], {
        icon: buildMarkerIcon(r.priority),
        // Attach priority untuk clusterIcon dominant calc
        _balaporPriority: r.priority,
      } as L.MarkerOptions & { _balaporPriority: ReportPriority });

      marker.bindPopup(buildPopupHTML(r));

      if (onMarkerClick) {
        marker.on('click', () => onMarkerClick(r));
      }

      clusterGroup.addLayer(marker);
    }

    map.addLayer(clusterGroup);

    // Auto-fit
    if (reports.length === 1) {
      map.setView(bounds.getCenter(), 10);
    } else if (reports.length > 1) {
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 10 });
    }

    return () => {
      map.removeLayer(clusterGroup);
    };
  }, [map, reports, onMarkerClick]);

  return null;
}

/* ─── Props ─── */

export interface BalaporMapLeafletProps {
  reports: Report[];
  height: number;
  onMarkerClick?: (report: Report) => void;
}

/* ─── Main component ─── */

export function BalaporMapLeaflet({
  reports,
  height,
  onMarkerClick,
}: BalaporMapLeafletProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const tileUrl = isDark ? TILE_DARK : TILE_LIGHT;

  // Filter reports yang punya koordinat
  const reportsWithCoords = useMemo(
    () =>
      reports.filter(
        (r): r is Report & { latitude: number; longitude: number } =>
          r.latitude !== null && r.longitude !== null
      ),
    [reports]
  );

  const hasCoords = reportsWithCoords.length > 0;

  return (
    <div
      className="relative w-full rounded-lg overflow-hidden border border-border"
      style={{ height }}
    >
      <MapContainer
        center={MAP_CENTER}
        zoom={DEFAULT_ZOOM}
        minZoom={6}
        maxZoom={12}
        scrollWheelZoom={false}
        maxBounds={[
          [-4, 122],
          [4, 132],
        ]}
        maxBoundsViscosity={1.0}
        style={{ height: '100%', width: '100%', background: 'transparent' }}
        attributionControl={true}
      >
        <TileLayer
          key={isDark ? 'dark' : 'light'}
          url={tileUrl}
          attribution={TILE_ATTRIBUTION}
          maxZoom={19}
        />

        {hasCoords && (
          <MarkerClusterLayer
            reports={reportsWithCoords}
            onMarkerClick={onMarkerClick}
          />
        )}
      </MapContainer>

      {/* Legend overlay — bottom left */}
      <div
        className="absolute bottom-2 left-2 z-[500] flex items-center gap-3 px-3 py-1.5 rounded-md bg-surface/90 backdrop-blur-sm border border-border shadow-sm pointer-events-none"
      >
        {(Object.keys(PRIORITY_CONFIG) as Array<keyof typeof PRIORITY_CONFIG>).map(
          (p) => (
            <div key={p} className="flex items-center gap-1.5">
              <span
                className="inline-block rounded-full border border-white"
                style={{
                  width: 10,
                  height: 10,
                  background: PRIORITY_CONFIG[p].hex,
                }}
              />
              <span className="text-[10px] font-semibold text-text-muted capitalize">
                {p}
              </span>
            </div>
          )
        )}
      </div>

      {/* No coords overlay */}
      {!hasCoords && (
        <div
          className="absolute inset-0 z-[400] flex items-center justify-center bg-black/30 rounded-lg pointer-events-none"
          aria-live="polite"
        >
          <div className="bg-surface/95 backdrop-blur-sm rounded-xl px-6 py-5 text-center border border-border shadow-lg max-w-xs">
            <div className="text-3xl mb-2" aria-hidden="true">📍</div>
            <p className="text-sm font-bold text-text leading-tight">
              Belum ada laporan dengan koordinat GPS
            </p>
            <p className="text-[11px] text-text-muted mt-1.5 leading-relaxed">
              Pin akan muncul saat user mengizinkan akses lokasi.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
