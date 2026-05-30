'use client';

/**
 * TeraLoka — BalaporPublicMap (Pure Leaflet Map)
 * Bridge Sprint Day 10 (10 Mei 2026) — Public Live Map Component
 * ------------------------------------------------------------
 * Privacy-aware live map untuk landing page BALAPOR + future /peta route.
 *
 * Differences vs admin BalaporMapLeaflet:
 *   - LIGHT THEME ONLY (consistent with landing page aesthetic)
 *   - NO pelapor info di popup (backend already filtered)
 *   - NO photo references (backend hide photos)
 *   - GPS already degraded di backend (~100m blur, anti-stalking)
 *   - Cluster behavior simpler (single style, no theme variants)
 *
 * Pattern reference: src/components/admin/reports/balapor-map-leaflet.tsx
 *
 * Hotfix Pattern (RR): Lazy-load markercluster plugin via async import
 *   untuk avoid "L is not defined" di Next.js SSR pre-render phase.
 */

import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

import { useEffect, useRef, useState } from 'react';
import type { LatLngExpression } from 'leaflet';
import L from 'leaflet';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';

/* ════════════════════════════════════════════════════════════════
   Types — match backend PublicReport shape
   ════════════════════════════════════════════════════════════════ */

export interface PublicReport {
  id: string;
  display_id: string | null;
  title: string;
  category: string | null;
  priority: 'urgent' | 'high' | 'normal';
  status: 'verified' | 'published';
  location_name: string | null;
  location_type: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  has_bakabar_article: boolean;
}

export interface BalaporPublicMapProps {
  /** Reports to display on map */
  reports: PublicReport[];
  /** Optional height override (default 400px) */
  height?: number | string;
  /** Optional initial zoom (default 7 = province-level Maluku Utara) */
  initialZoom?: number;
  /** Disable cluster behavior (default false — cluster aktif) */
  disableCluster?: boolean;
  /**
   * Full-page mode (untuk halaman /peta dedicated):
   * peta interaktif langsung (tanpa overlay kunci), tinggi penuh (gak di-cap mobile),
   * scroll-wheel zoom aktif. Default false = mode embed (terkunci, compact mobile).
   */
  fullView?: boolean;
}

/* ════════════════════════════════════════════════════════════════
   Visual Config (light theme, public-friendly)
   ════════════════════════════════════════════════════════════════ */

const PRIORITY_HEX: Record<'urgent' | 'high' | 'normal', string> = {
  urgent: '#EF4444',
  high: '#F59E0B',
  normal: '#10B981',
};

const PRIORITY_LABEL: Record<'urgent' | 'high' | 'normal', string> = {
  urgent: 'Urgent',
  high: 'Tinggi',
  normal: 'Normal',
};

const PRIORITY_RADIUS: Record<'urgent' | 'high' | 'normal', number> = {
  urgent: 12,
  high: 9,
  normal: 7,
};

const CATEGORY_ICON: Record<string, string> = {
  keamanan: 'shield',
  infrastruktur: 'construction',
  lingkungan: 'forest',
  layanan_publik: 'account_balance',
  kesehatan: 'health_and_safety',
  pendidikan: 'school',
  transportasi: 'directions_car',
  lainnya: 'category',
};

const CATEGORY_LABEL: Record<string, string> = {
  keamanan: 'Keamanan',
  infrastruktur: 'Infrastruktur',
  lingkungan: 'Lingkungan',
  layanan_publik: 'Layanan Publik',
  kesehatan: 'Kesehatan',
  pendidikan: 'Pendidikan',
  transportasi: 'Transportasi',
  lainnya: 'Lainnya',
};

/* ─── Tile provider (light only — landing page aesthetic) ─── */

const TILE_LIGHT =
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

/* ─── Maluku Utara province center ─── */

const MAP_CENTER: LatLngExpression = [0.5, 127.8];
const DEFAULT_ZOOM = 7;

/**
 * MALUT_BOUNDS — Strict geographic boundaries Maluku Utara
 * SW corner: -3.0°S, 124.0°E (Pulau Sula southwest)
 * NE corner:  3.0°N, 130.5°E (Halmahera Utara northeast)
 *
 * User cannot pan/zoom outside these bounds. maxBoundsViscosity=1.0
 * makes the boundary "sticky" — map immediately bounces back if user
 * tries to pan beyond.
 */
const MALUT_BOUNDS: [[number, number], [number, number]] = [
  [-3.0, 124.0], // Southwest
  [3.0, 130.5],  // Northeast
];

/* ════════════════════════════════════════════════════════════════
   Helpers
   ════════════════════════════════════════════════════════════════ */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function timeAgoID(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Baru saja';
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} hari lalu`;
  return `${Math.floor(d / 30)} bln lalu`;
}

/* ─── Build individual marker DivIcon ─── */

function buildMarkerIcon(priority: 'urgent' | 'high' | 'normal'): L.DivIcon {
  const hex = PRIORITY_HEX[priority];
  const radius = PRIORITY_RADIUS[priority];
  const size = radius * 2;

  return L.divIcon({
    html: `<div style="
      width:${size}px;
      height:${size}px;
      border-radius:50%;
      background:${hex};
      border:2px solid white;
      box-shadow:0 1px 3px rgba(0,0,0,0.3);
      opacity:0.92;
    "></div>`,
    className: 'balapor-public-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/* ─── Material Symbols inline (HTML string — popup Leaflet, konsisten w/ landing) ─── */

function msIcon(name: string, size = 14, color = '#6b7280'): string {
  return `<span class="material-symbols-outlined" style="font-size:${size}px;line-height:1;vertical-align:-3px;color:${color}">${name}</span>`;
}

/* ─── Build popup HTML — privacy-aware (NO pelapor info) ─── */

function buildPopupHTML(r: PublicReport): string {
  const hex = PRIORITY_HEX[r.priority];
  const priorityLabel = PRIORITY_LABEL[r.priority];
  const categoryKey = (r.category ?? 'lainnya').toLowerCase();
  const catIcon = CATEGORY_ICON[categoryKey] ?? 'category';
  const categoryLabel = CATEGORY_LABEL[categoryKey] ?? 'Lainnya';

  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;min-width:220px;max-width:260px">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;flex-wrap:wrap">
        <span style="
          display:inline-block;
          padding:2px 8px;
          background:${hex};
          color:white;
          border-radius:10px;
          font-size:9px;
          font-weight:700;
          letter-spacing:0.5px;
          text-transform:uppercase
        ">${priorityLabel}</span>
        ${
          r.display_id
            ? `<span style="
              font-family:ui-monospace,monospace;
              font-size:10px;
              color:#6b7280;
              font-weight:600;
              letter-spacing:0.3px
            ">${escapeHtml(r.display_id)}</span>`
            : ''
        }
        ${
          r.has_bakabar_article
            ? `<span style="
              display:inline-block;
              padding:2px 6px;
              background:#003526;
              color:white;
              border-radius:8px;
              font-size:9px;
              font-weight:700;
              letter-spacing:0.3px
            ">${msIcon('newspaper', 11, '#ffffff')} BAKABAR</span>`
            : ''
        }
      </div>
      <h3 style="
        margin:0 0 6px 0;
        font-size:14px;
        font-weight:700;
        color:#1f2937;
        line-height:1.4
      ">${escapeHtml(r.title)}</h3>
      <div style="font-size:12px;color:#6b7280;line-height:1.5">
        <div style="margin-bottom:2px;display:flex;align-items:center;gap:4px">${msIcon(catIcon, 14, '#6b7280')} ${escapeHtml(categoryLabel)}</div>
        ${
          r.location_name
            ? `<div style="margin-bottom:2px;display:flex;align-items:center;gap:4px">${msIcon('location_on', 14, '#9ca3af')} ${escapeHtml(r.location_name)}</div>`
            : ''
        }
        <div style="display:flex;align-items:center;gap:4px">${msIcon('schedule', 14, '#9ca3af')} ${escapeHtml(timeAgoID(r.created_at))}</div>
      </div>
    </div>
  `;
}

/* ════════════════════════════════════════════════════════════════
   MarkerClusterLayer (vanilla L.markerClusterGroup via useMap)
   ════════════════════════════════════════════════════════════════ */

function MarkerClusterLayer({
  reports,
  disableCluster,
}: {
  reports: PublicReport[];
  disableCluster: boolean;
}) {
  const map = useMap();
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function setupLayer() {
      // Lazy-load plugin (Pattern RR — avoid "L is not defined" SSR error)
      if (!disableCluster) {
        await import('leaflet.markercluster');
      }

      if (cancelled) return;

      // Cleanup previous layer
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }

      // Filter reports yang punya valid GPS
      const validReports = reports.filter(
        (r) => r.latitude !== null && r.longitude !== null,
      );

      if (validReports.length === 0) return;

      // Create layer (cluster atau plain layer group)
      let layer: L.LayerGroup;

      if (disableCluster) {
        layer = L.layerGroup();
      } else {
        layer = L.markerClusterGroup({
          maxClusterRadius: 50,
          disableClusteringAtZoom: 11,
          spiderfyOnMaxZoom: true,
          showCoverageOnHover: false,
          iconCreateFunction: (cluster: any) => {
            const markers = cluster.getAllChildMarkers();
            const count = markers.length;

            // Determine dominant priority (urgent > high > normal)
            let hasUrgent = false;
            let hasHigh = false;
            for (const m of markers) {
              const p = m.options?.balaporPriority as string | undefined;
              if (p === 'urgent') hasUrgent = true;
              else if (p === 'high') hasHigh = true;
            }
            const color = hasUrgent
              ? PRIORITY_HEX.urgent
              : hasHigh
                ? PRIORITY_HEX.high
                : PRIORITY_HEX.normal;

            // Size by count
            const size = count < 10 ? 36 : count < 50 ? 44 : 52;

            return L.divIcon({
              html: `<div style="
                width:${size}px;
                height:${size}px;
                border-radius:50%;
                background:${color};
                border:3px solid white;
                box-shadow:0 2px 6px rgba(0,0,0,0.25);
                color:white;
                font-weight:800;
                font-size:13px;
                display:flex;
                align-items:center;
                justify-content:center;
                opacity:0.95;
              ">${count}</div>`,
              className: 'balapor-public-cluster',
              iconSize: [size, size],
              iconAnchor: [size / 2, size / 2],
            });
          },
        });
      }

      // Add markers
      for (const r of validReports) {
        const marker = L.marker([r.latitude!, r.longitude!], {
          icon: buildMarkerIcon(r.priority),
          // @ts-expect-error — custom option for cluster icon logic
          balaporPriority: r.priority,
        });
        marker.bindPopup(buildPopupHTML(r), {
          maxWidth: 280,
          className: 'balapor-public-popup',
        });
        layer.addLayer(marker);
      }

      layer.addTo(map);
      layerRef.current = layer;
    }

    setupLayer();

    return () => {
      cancelled = true;
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, reports, disableCluster]);

  return null;
}

/* ════════════════════════════════════════════════════════════════
   Main Component
   ════════════════════════════════════════════════════════════════ */

/**
 * Embed (landing) = preview statis: drag/zoom mati + touch-action:pan-y di container
 * → scroll halaman lewat di atas peta lancar (gak ke-trap), tanpa overlay yang
 * bisa nutupin tombol section. fullView (/reports/peta) = interaktif penuh.
 */
export function BalaporPublicMap({
  reports,
  height = 400,
  initialZoom = DEFAULT_ZOOM,
  disableCluster = false,
  fullView = false,
}: BalaporPublicMapProps) {
  const [compact, setCompact] = useState(false);

  // Mobile = peta lebih pendek biar gak mendominasi layar (skip di fullView)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 768px)');
    const apply = () => setCompact(mq.matches);
    apply();
    mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, []);

  const h = typeof height === 'number' ? (compact && !fullView ? Math.min(height, 300) : height) : height;

  return (
    <div
      className={fullView ? undefined : 'balapor-embed-map'}
      style={{
        width: '100%',
        height: typeof h === 'number' ? `${h}px` : h,
        borderRadius: 14,
        overflow: 'hidden',
        border: '1px solid #e5e7eb',
        position: 'relative',
      }}
    >
      {/* Embed: izinkan scroll vertikal halaman lewat di atas peta (anti scroll-trap, tanpa overlay) */}
      {!fullView && (
        <style>{`.balapor-embed-map .leaflet-container { touch-action: pan-y !important; }`}</style>
      )}
      <MapContainer
        center={MAP_CENTER}
        zoom={initialZoom}
        minZoom={6}
        maxZoom={18}
        maxBounds={MALUT_BOUNDS}
        maxBoundsViscosity={1.0}
        scrollWheelZoom={fullView}
        dragging={fullView}
        touchZoom={fullView}
        doubleClickZoom={fullView}
        zoomControl={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer url={TILE_LIGHT} attribution={TILE_ATTRIBUTION} />
        <MarkerClusterLayer reports={reports} disableCluster={disableCluster} />
      </MapContainer>
    </div>
  );
}
