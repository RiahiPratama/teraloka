'use client';

/**
 * TeraLoka — RegionalMapLeaflet (Inner component, Leaflet-based)
 * Phase 2 · Batch 6c — Regional Map Fix
 * ------------------------------------------------------------
 * Real geographic map dari Maluku Utara pakai react-leaflet v5.
 * Tidak untuk di-import langsung — selalu via <RegionalMap />
 * (wrapper di regional-map.tsx) yang handle dynamic import SSR-safe.
 *
 * Fitur:
 * - CartoDB Positron (light) / Dark Matter (dark) — auto-switch via useTheme
 * - 10 kabupaten/kota + Sofifi (ibukota provinsi) sebagai markers
 * - Custom DivIcon markers dengan color coding dari cityStats
 * - Popup on click: nama wilayah + ibukota + count
 * - Fit bounds otomatis untuk cover seluruh Maluku Utara
 *
 * Tile sources (free, no API key):
 * - Light: CartoDB Positron
 * - Dark:  CartoDB Dark Matter
 *
 * Attribution: © OpenStreetMap contributors © CARTO
 */

import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo } from 'react';
import type { LatLngExpression } from 'leaflet';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { useTheme } from '@/lib/theme';
import type { CityKey, CityStat } from './regional-map';

/* ─── City data — 10 kabupaten/kota + Sofifi ─── */

interface CityData {
  key: CityKey;
  name: string;
  capital: string;
  lat: number;
  lng: number;
  /** Sofifi = ibukota provinsi (styling dibedakan) */
  isProvincialCapital?: boolean;
}

const CITIES: CityData[] = [
  { key: 'kota-ternate',       name: 'Kota Ternate',          capital: 'Ternate',  lat: 0.7893,  lng: 127.3670 },
  { key: 'kota-tidore',        name: 'Kota Tidore Kepulauan', capital: 'Soasio',   lat: 0.7400,  lng: 127.4400 },
  { key: 'halmahera-barat',    name: 'Halmahera Barat',       capital: 'Jailolo',  lat: 1.0800,  lng: 127.5000 },
  { key: 'halmahera-tengah',   name: 'Halmahera Tengah',      capital: 'Weda',     lat: 0.3300,  lng: 128.0833 },
  { key: 'halmahera-utara',    name: 'Halmahera Utara',       capital: 'Tobelo',   lat: 1.7300,  lng: 128.0000 },
  { key: 'halmahera-selatan',  name: 'Halmahera Selatan',     capital: 'Labuha',   lat: -0.6333, lng: 127.4833 },
  { key: 'halmahera-timur',    name: 'Halmahera Timur',       capital: 'Maba',     lat: 1.0500,  lng: 128.3833 },
  { key: 'kepulauan-sula',     name: 'Kepulauan Sula',        capital: 'Sanana',   lat: -2.0500, lng: 125.9833 },
  { key: 'pulau-morotai',      name: 'Pulau Morotai',         capital: 'Daruba',   lat: 2.2833,  lng: 128.4000 },
  { key: 'pulau-taliabu',      name: 'Pulau Taliabu',         capital: 'Bobong',   lat: -1.7833, lng: 124.6833 },
  { key: 'sofifi',             name: 'Sofifi',                capital: 'Ibukota Provinsi', lat: 0.7500, lng: 127.5833, isProvincialCapital: true },
];

/* ─── Tile provider URLs ─── */

const TILE_LIGHT =
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_DARK =
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

/* ─── Tone → color mapping ─── */

const TONE_COLORS: Record<NonNullable<CityStat['tone']>, string> = {
  info: '#3B82F6',
  warning: '#F59E0B',
  critical: '#EF4444',
  healthy: '#10B981',
};

const DEFAULT_COLOR = '#003526'; // brand teal
const PROVINCIAL_COLOR = '#E8963A'; // brand orange untuk Sofifi

/* ─── Custom divIcon factory ─── */

function createMarkerIcon(options: {
  color: string;
  count?: number;
  isProvincialCapital?: boolean;
  size?: number;
}): L.DivIcon {
  const { color, count, isProvincialCapital, size = 28 } = options;
  const hasCount = count !== undefined && count > 0;
  const displayCount = hasCount ? (count! > 99 ? '99+' : String(count)) : '';
  const actualSize = hasCount ? Math.min(40, size + Math.log2(count! + 1) * 2) : size;
  const pulse = hasCount ? 'animate-pulse' : '';

  const starMarker = isProvincialCapital
    ? `<div style="position:absolute; top:-6px; right:-6px; width:14px; height:14px; background:${PROVINCIAL_COLOR}; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:8px; color:#fff; border:1.5px solid #fff; box-shadow:0 2px 4px rgba(0,0,0,0.3);">★</div>`
    : '';

  const countLabel = hasCount
    ? `<span style="color:#fff; font-weight:700; font-size:${actualSize > 32 ? '10px' : '9px'}; letter-spacing:-0.2px; font-variant-numeric:tabular-nums;">${displayCount}</span>`
    : '';

  const html = `
    <div style="position:relative; width:${actualSize}px; height:${actualSize}px;">
      ${hasCount ? `<div class="${pulse}" style="position:absolute; inset:-4px; background:${color}; border-radius:50%; opacity:0.25;"></div>` : ''}
      <div style="
        position:absolute;
        inset:0;
        background:${color};
        border-radius:50%;
        border:2px solid #fff;
        box-shadow:0 2px 6px rgba(0,0,0,0.25);
        display:flex;
        align-items:center;
        justify-content:center;
        cursor:pointer;
        transition:transform 0.15s ease;
      "
      onmouseover="this.style.transform='scale(1.1)'"
      onmouseout="this.style.transform='scale(1)'"
      >
        ${countLabel || '<div style="width:6px; height:6px; background:#fff; border-radius:50%;"></div>'}
      </div>
      ${starMarker}
    </div>
  `;

  return L.divIcon({
    className: 'teraloka-map-marker',
    html,
    iconSize: [actualSize, actualSize],
    iconAnchor: [actualSize / 2, actualSize / 2],
    popupAnchor: [0, -actualSize / 2],
  });
}

/* ─── Auto-fit bounds on mount ─── */

function FitBoundsOnMount({ padding = 20 }: { padding?: number }) {
  const map = useMap();
  useEffect(() => {
    const bounds = L.latLngBounds(CITIES.map((c) => [c.lat, c.lng]));
    map.fitBounds(bounds, { padding: [padding, padding] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

/* ─── Props ─── */

export interface RegionalMapLeafletProps {
  cityStats?: Partial<Record<CityKey, CityStat>>;
  height: number;
  onCityClick?: (city: CityKey) => void;
  center?: [number, number];
  zoom?: number;
}

/* ─── Main component ─── */

export function RegionalMapLeaflet({
  cityStats,
  height,
  onCityClick,
  center,
  zoom,
}: RegionalMapLeafletProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const tileUrl = isDark ? TILE_DARK : TILE_LIGHT;

  // Default center ke Maluku Utara tengah kalau tidak di-override
  const initialCenter: LatLngExpression = center ?? [0.5, 127.8];
  const initialZoom = zoom ?? 7;

  // Memoize marker data
  const markers = useMemo(
    () =>
      CITIES.map((city) => {
        const stat = cityStats?.[city.key];
        const color = city.isProvincialCapital
          ? PROVINCIAL_COLOR
          : stat?.tone
            ? TONE_COLORS[stat.tone]
            : DEFAULT_COLOR;

        return {
          city,
          stat,
          icon: createMarkerIcon({
            color,
            count: stat?.count,
            isProvincialCapital: city.isProvincialCapital,
          }),
        };
      }),
    [cityStats]
  );

  return (
    <div
      className="relative w-full rounded-lg overflow-hidden border border-border"
      style={{ height }}
    >
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        minZoom={6}
        maxZoom={11}
        scrollWheelZoom={false}
        // Boundaries Maluku Utara approximate — biar user gak bisa pan keluar jauh
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

        <FitBoundsOnMount />

        {markers.map(({ city, stat, icon }) => (
          <Marker
            key={city.key}
            position={[city.lat, city.lng]}
            icon={icon}
            eventHandlers={
              onCityClick
                ? {
                    click: () => onCityClick(city.key),
                  }
                : undefined
            }
          >
            <Popup>
              <div style={{ minWidth: 140, fontFamily: 'Outfit, system-ui, sans-serif' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#0F172A', marginBottom: 2 }}>
                  {city.name}
                  {city.isProvincialCapital && (
                    <span style={{ marginLeft: 6, fontSize: 10, color: PROVINCIAL_COLOR, fontWeight: 600 }}>
                      ★ Ibukota
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: '#64748B', marginBottom: stat?.count ? 6 : 0 }}>
                  {city.capital}
                </div>
                {stat?.count !== undefined && stat.count > 0 && (
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: stat.tone ? TONE_COLORS[stat.tone] : DEFAULT_COLOR,
                      marginTop: 4,
                      paddingTop: 4,
                      borderTop: '1px solid #E5E7EB',
                    }}
                  >
                    {stat.count.toLocaleString('id-ID')} item aktif
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Overlay legenda kecil di pojok kanan atas */}
      <div
        className="absolute top-2 right-2 z-[500] flex items-center gap-1.5 px-2 py-1 rounded-md bg-surface/90 backdrop-blur-sm border border-border text-[10px] font-semibold text-text-muted shadow-sm pointer-events-none"
        style={{ fontFeatureSettings: '"tnum"' }}
      >
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ background: PROVINCIAL_COLOR }}
        />
        <span>Ibukota Provinsi</span>
      </div>
    </div>
  );
}
