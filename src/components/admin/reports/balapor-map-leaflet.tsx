'use client';

/**
 * TeraLoka — BalaporMapLeaflet (Inner component, Leaflet-based)
 * Phase 2 · Batch 7b2 — Reports Map
 * ------------------------------------------------------------
 * Real geographic map untuk laporan BALAPOR pakai react-leaflet v5.
 * Tidak untuk di-import langsung — selalu via <BalaporMap />
 * (wrapper di balapor-map.tsx) yang handle dynamic import SSR-safe.
 *
 * Features:
 * - CartoDB Positron (light) / Dark Matter (dark) — auto-switch via useTheme
 * - Circle markers dengan size + color berdasarkan priority
 * - Popup on click: title + kategori + lokasi + waktu + priority badge
 * - Fit bounds otomatis saat reports berubah (kalau ada coords)
 * - No coords overlay kalau tidak ada laporan dengan latitude/longitude
 *
 * Marker sizes (radius px):
 * - urgent: 12
 * - high:   9
 * - normal: 7
 *
 * Attribution: © OpenStreetMap contributors © CARTO
 */

import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo } from 'react';
import type { LatLngExpression } from 'leaflet';
import L from 'leaflet';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import { useTheme } from '@/lib/theme';
import {
  PRIORITY_CONFIG,
  timeAgo,
  getCategoryConfig,
  type Report,
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

/* ─── Auto-fit bounds on reports change ─── */

function FitBoundsOnReports({ reports }: { reports: Report[] }) {
  const map = useMap();

  useEffect(() => {
    const withCoords = reports.filter(
      (r): r is Report & { latitude: number; longitude: number } =>
        r.latitude !== null && r.longitude !== null
    );

    if (withCoords.length === 0) return;

    const bounds = L.latLngBounds(
      withCoords.map((r) => [r.latitude, r.longitude] as [number, number])
    );

    // Kalau cuma 1 marker, jangan zoom in max — keep reasonable view
    if (withCoords.length === 1) {
      map.setView(bounds.getCenter(), 10);
    } else {
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 10 });
    }
  }, [reports, map]);

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

        <FitBoundsOnReports reports={reports} />

        {reportsWithCoords.map((r) => {
          const config = PRIORITY_CONFIG[r.priority];
          const categoryConfig = getCategoryConfig(r.category);

          return (
            <CircleMarker
              key={r.id}
              center={[r.latitude, r.longitude]}
              radius={config.mapMarkerRadius}
              pathOptions={{
                fillColor: config.hex,
                color: '#fff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.85,
              }}
              eventHandlers={
                onMarkerClick
                  ? {
                      click: () => onMarkerClick(r),
                    }
                  : undefined
              }
            >
              <Popup>
                <div
                  style={{
                    minWidth: 200,
                    fontFamily: 'Outfit, system-ui, sans-serif',
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 13,
                      color: '#0F172A',
                      marginBottom: 4,
                      lineHeight: 1.3,
                    }}
                  >
                    {r.title}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: '#64748B',
                      marginBottom: 6,
                    }}
                  >
                    <span aria-hidden="true">{categoryConfig.emoji}</span>{' '}
                    <span style={{ textTransform: 'capitalize' }}>
                      {r.category || 'lainnya'}
                    </span>
                    {r.location && ` · 📍 ${r.location}`}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: '#94A3B8',
                      marginBottom: 8,
                    }}
                  >
                    {timeAgo(r.created_at)}
                  </div>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 20,
                      background: `${config.hex}22`,
                      color: config.hex,
                      border: `1px solid ${config.hex}44`,
                    }}
                  >
                    {config.emoji} {config.label}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
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
              Pin akan muncul saat user izinkan akses lokasi.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
