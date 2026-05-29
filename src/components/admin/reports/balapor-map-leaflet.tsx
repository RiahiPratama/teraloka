'use client';

/**
 * TeraLoka — BalaporMapLeaflet (Inner component, Leaflet-based)
 * Phase 2 · Batch 7b2 — Reports Map
 * Updated: 10 Mei 2026 — Day 3-4 A3 Admin Live Map Cluster
 *   - Replace CircleMarker → DivIcon Marker (untuk cluster compatibility)
 *   - Add MarkerClusterLayer (vanilla L.markerClusterGroup via useMap hook)
 *   - Custom cluster icon: color by dominant priority, size by count
 * Hotfix 10 Mei: Lazy-load markercluster plugin (Pattern RR — avoid
 *   "L is not defined" saat module eval order tidak dijamin di Next.js).
 * ------------------------------------------------------------
 * Real geographic map untuk laporan BALAPOR pakai react-leaflet v5
 * + leaflet.markercluster plugin (lazy loaded).
 *
 * Cluster behavior:
 * - maxClusterRadius: 50
 * - disableClusteringAtZoom: 11
 * - spiderfyOnMaxZoom: true
 *
 * Cluster icon visual:
 * - Color: red kalau ada urgent, orange kalau ada high, green kalau normal
 * - Size: 36/44/52 px berdasarkan count (<10 / <50 / >=50)
 *
 * Attribution: © OpenStreetMap contributors © CARTO
 */

import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
// NOTE: leaflet.markercluster JS plugin di-lazy load di useEffect.
// Top-level import bikin "L is not defined" karena plugin assume L
// global tersedia saat module eval, padahal ESM order tidak dijamin.

import { useEffect, useMemo, useState } from 'react';
import type { LatLngExpression } from 'leaflet';
import L from 'leaflet';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { useTheme } from '@/lib/theme';
import {
  PRIORITY_CONFIG,
  timeAgo,
  getCategoryConfig,
  type MapPoint,
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

/* ─── Resolve koordinat map per point ─── */

/**
 * Point yang udah ke-resolve koordinatnya, siap plot.
 * _lat/_lng = koordinat final. _isGps = true kalau GPS exact (presisi penuh).
 */
type ResolvedPoint = MapPoint & { _lat: number; _lng: number; _isGps: boolean };

/**
 * Resolve koordinat 1 point:
 *   - Utamakan map_latitude/map_longitude (resolved backend: GPS-else-centroid)
 *   - Fallback ke latitude/longitude (kompat response lama tanpa map_*)
 *   - _isGps: dari coord_source==='gps', else tebak dari adanya GPS mentah
 * Return null kalau gak ada koordinat sama sekali (tak ke-plot).
 */
function resolvePoint(r: MapPoint): ResolvedPoint | null {
  const lat = r.map_latitude ?? r.latitude ?? null;
  const lng = r.map_longitude ?? r.longitude ?? null;
  if (lat === null || lng === null) return null;
  const isGps =
    r.coord_source != null
      ? r.coord_source === 'gps'
      : r.latitude != null && r.longitude != null;
  return { ...r, _lat: lat, _lng: lng, _isGps: isGps };
}

/* ─── Build individual marker DivIcon (replace CircleMarker) ─── */

function buildMarkerIcon(priority: ReportPriority, isGps: boolean): L.DivIcon {
  const config = PRIORITY_CONFIG[priority];
  const size = config.mapMarkerRadius * 2;

  if (isGps) {
    // GPS exact → titik SOLID presisi (isi penuh, border tegas) — setara SOS
    return L.divIcon({
      html: `<div style="
        width:${size}px;
        height:${size}px;
        border-radius:50%;
        background:${config.hex};
        border:2px solid white;
        box-shadow:0 1px 3px rgba(0,0,0,0.3);
        opacity:0.95;
      "></div>`,
      className: 'balapor-priority-marker balapor-marker-gps',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  }

  // Centroid (perkiraan kelurahan/induk) → RING dashed, isi semi-transparan.
  // Sinyal visual jujur: "ini perkiraan area, BUKAN titik GPS persis".
  const ringSize = size + 2;
  return L.divIcon({
    html: `<div style="
      width:${ringSize}px;
      height:${ringSize}px;
      border-radius:50%;
      background:${config.hex}2E;
      border:2px dashed ${config.hex};
      box-shadow:0 1px 2px rgba(0,0,0,0.2);
      opacity:0.85;
    "></div>`,
    className: 'balapor-priority-marker balapor-marker-centroid',
    iconSize: [ringSize, ringSize],
    iconAnchor: [ringSize / 2, ringSize / 2],
  });
}

/* ─── Build popup HTML (manual, biar kerja dengan vanilla Leaflet marker) ─── */

function buildPopupHTML(r: ResolvedPoint): string {
  const config = PRIORITY_CONFIG[r.priority];
  const categoryConfig = getCategoryConfig(r.category);
  const locName = r.location_name || r.location || null;
  const locationStr = locName ? ` · 📍 ${escapeHtml(locName)}` : '';
  const timeStr = r.created_at ? timeAgo(r.created_at) : '';

  // Hint sumber koordinat — jujur soal presisi
  const coordHint = r._isGps
    ? '📍 Lokasi GPS tepat'
    : `🏘️ Perkiraan ${escapeHtml(r.coord_source || 'wilayah')}`;
  const coordColor = r._isGps ? '#0F766E' : '#94A3B8';

  return `
    <div style="min-width:200px;font-family:Outfit,system-ui,sans-serif">
      <div style="font-weight:700;font-size:13px;color:#0F172A;margin-bottom:4px;line-height:1.3">
        ${escapeHtml(r.title)}
      </div>
      <div style="font-size:11px;color:#64748B;margin-bottom:6px">
        <span aria-hidden="true">${categoryConfig.emoji}</span>
        <span style="text-transform:capitalize">${escapeHtml(r.category || 'lainnya')}</span>${locationStr}
      </div>
      ${timeStr ? `<div style="font-size:11px;color:#94A3B8;margin-bottom:6px">${timeStr}</div>` : ''}
      <div style="font-size:10px;color:${coordColor};margin-bottom:8px">
        ${coordHint}
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

// Type minimal — buildClusterIcon di-pass ke L.markerClusterGroup
// dimana cluster.getChildCount/getAllChildMarkers tersedia
interface ClusterLike {
  getChildCount: () => number;
  getAllChildMarkers: () => Array<{
    options: { _balaporPriority?: ReportPriority };
  }>;
}

function buildClusterIcon(cluster: ClusterLike): L.DivIcon {
  const count = cluster.getChildCount();
  const markers = cluster.getAllChildMarkers();

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
  reports: ResolvedPoint[];
  onMarkerClick?: (report: MapPoint) => void;
}

function MarkerClusterLayer({ reports, onMarkerClick }: MarkerClusterLayerProps) {
  const map = useMap();
  const [pluginReady, setPluginReady] = useState(false);

  /* ── Lazy-load plugin (avoid SSR + ESM order issue) ── */
  useEffect(() => {
    let cancelled = false;
    import('leaflet.markercluster')
      .then(() => {
        if (!cancelled) setPluginReady(true);
      })
      .catch((err) => {
        console.error('Failed to load leaflet.markercluster:', err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* ── Setup cluster group setelah plugin ready ── */
  useEffect(() => {
    if (!pluginReady) return;

    // markerClusterGroup attached to L after plugin module evaluated
    const clusterGroup = (
      L as unknown as {
        markerClusterGroup: (opts: Record<string, unknown>) => L.LayerGroup;
      }
    ).markerClusterGroup({
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
    const bounds =
      reports.length > 0
        ? L.latLngBounds(
            reports.map((r) => [r._lat, r._lng] as [number, number])
          )
        : null;

    for (const r of reports) {
      const marker = L.marker([r._lat, r._lng], {
        icon: buildMarkerIcon(r.priority, r._isGps),
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
    if (reports.length === 1 && bounds) {
      map.setView(bounds.getCenter(), 10);
    } else if (reports.length > 1 && bounds) {
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 10 });
    }

    return () => {
      map.removeLayer(clusterGroup);
    };
  }, [map, reports, onMarkerClick, pluginReady]);

  return null;
}

/* ─── Props ─── */

export interface BalaporMapLeafletProps {
  reports: MapPoint[];
  height: number;
  onMarkerClick?: (report: MapPoint) => void;
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

  // Resolve koordinat tiap point: GPS-else-centroid (map_* dulu, fallback latitude/longitude)
  const reportsWithCoords = useMemo<ResolvedPoint[]>(
    () =>
      reports
        .map(resolvePoint)
        .filter((r): r is ResolvedPoint => r !== null),
    [reports]
  );

  const hasCoords = reportsWithCoords.length > 0;
  const gpsCount = useMemo(
    () => reportsWithCoords.filter((r) => r._isGps).length,
    [reportsWithCoords]
  );
  const approxCount = reportsWithCoords.length - gpsCount;

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

        {/* Divider + coord-source legend (presisi vs perkiraan) */}
        <span className="inline-block w-px h-4 bg-border" aria-hidden="true" />
        <div className="flex items-center gap-1.5" title="GPS exact dari perangkat pelapor">
          <span
            className="inline-block rounded-full border border-white"
            style={{ width: 10, height: 10, background: '#64748B' }}
          />
          <span className="text-[10px] font-semibold text-text-muted">
            GPS{gpsCount > 0 ? ` ${gpsCount}` : ''}
          </span>
        </div>
        <div className="flex items-center gap-1.5" title="Perkiraan centroid kelurahan/wilayah (bukan titik persis)">
          <span
            className="inline-block rounded-full"
            style={{ width: 10, height: 10, background: '#64748B2E', border: '1.5px dashed #64748B' }}
          />
          <span className="text-[10px] font-semibold text-text-muted">
            Perkiraan{approxCount > 0 ? ` ${approxCount}` : ''}
          </span>
        </div>
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
              Belum ada laporan untuk dipetakan
            </p>
            <p className="text-[11px] text-text-muted mt-1.5 leading-relaxed">
              Pin muncul saat ada laporan berlokasi — GPS persis maupun perkiraan wilayah.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
