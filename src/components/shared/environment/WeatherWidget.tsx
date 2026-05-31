// ════════════════════════════════════════════════════════════════
// SHARED — Environment / Weather Widget
// PATH: src/components/shared/environment/WeatherWidget.tsx
// ────────────────────────────────────────────────────────────────
//
// Compact weather card. Display BMKG real-time forecast per region MalUt.
//
// Subject category: environmental data (atmospheric)
// Layer: cross-domain reusable utility
//
// Consumers (current + future):
//   - BAKABAR RegionSection (Sprint 2A Batch C — current)
//   - TeraLoka homepage (future)
//   - BAPASIAR ojek laut status (future)
//   - BAKOS event detail page (future)
//
// Data flow:
//   useEffect → fetch /api/v1/environment/weather?region={slug}
//             → Backend: shared/environment/weather.ts engine
//                        → resolve ADM4 (DB lookup atau Sofifi shortcut)
//                        → fetch BMKG API
//                        → return normalized WeatherData
//             → Edge cache 3h Vercel
//
// Graceful states:
//   - Loading: skeleton pulse
//   - Error / no data: return null (widget hidden, no layout disruption)
//
// Skip rule (caller-side):
//   - Caller responsibility untuk skip render kalau region tidak applicable
//     (e.g., 'nasional' di BAKABAR — handle di RegionSection, not here)
//
// History:
//   - 15 Mei 2026: Created (Sprint 2A Batch C v3 FINAL)
//     Refactored 3x: bakabar/ → shared/locations/ → shared/environment/
//   - 31 Mei 2026: + footnote sumber ambang (standar kapal feri BMKG) —
//     transparansi anti-misleading. Status laut sekarang ikut weather_code.
// ════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

export interface WeatherData {
  region:           string;
  region_name:      string;
  adm4_code:        string;
  weather_desc:     string;
  weather_code:     number;
  temperature:      number;
  humidity:         number;
  wind_speed:       number;
  wind_direction:   string;
  sea_status:       'aman' | 'waspada' | 'berbahaya';
  sea_status_label: string;
  updated_at:       string;
  source:           string;
}

interface Props {
  /** Region slug: ternate|tidore|sofifi|halbar|halut|halteng|halsel|haltim|morotai|sula|taliabu */
  regionSlug: string;
  /** Optional display name (used in fallback states). Defaults to region_name from API. */
  regionName?: string;
}

// ── BMKG weather code → emoji mapping ─────────────────────────
function getWeatherEmoji(code: number): string {
  if (code === 0) return '☀️';                                      // Cerah
  if (code === 1 || code === 2) return '⛅';                        // Cerah Berawan
  if (code === 3 || code === 4) return '☁️';                       // Berawan
  if (code >= 5 && code <= 50) return '🌫️';                        // Kabut / Asap
  if (code >= 60 && code <= 63) return '🌧️';                       // Hujan
  if (code === 80 || code === 81 || code === 82) return '🌦️';     // Hujan lokal
  if (code === 95 || code === 97) return '⛈️';                     // Hujan petir
  return '🌤️';
}

// ── Sea status visual color ───────────────────────────────────
function getSeaStatusColor(status: WeatherData['sea_status']): string {
  if (status === 'berbahaya') return 'text-red-600';
  if (status === 'waspada')   return 'text-amber-600';
  return 'text-emerald-600';
}

// ════════════════════════════════════════════════════════════════

export default function WeatherWidget({ regionSlug, regionName }: Props) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  useEffect(() => {
    fetch(`${API}/environment/weather?region=${regionSlug}`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data) {
          setWeather(data.data);
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [regionSlug]);

  // ── Skeleton (loading) ─────────────────────────────────────
  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-3 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-gray-200 rounded w-2/3" />
            <div className="h-2 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  // ── Graceful hide (error / no data) ────────────────────────
  if (error || !weather) {
    return null;
  }

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3.5 py-3">
      <div className="flex items-center gap-3">

        {/* Big weather emoji */}
        <span className="text-3xl shrink-0 leading-none" role="img" aria-label="Kondisi cuaca">
          {getWeatherEmoji(weather.weather_code)}
        </span>

        <div className="flex-1 min-w-0">
          {/* Line 1: Temperature + Description */}
          <div className="flex items-baseline gap-1.5 mb-0.5">
            <span className="text-xl font-bold text-gray-900 leading-none">
              {weather.temperature}°C
            </span>
            <span className="text-[11px] text-gray-700 truncate">
              {weather.weather_desc}
            </span>
          </div>

          {/* Line 2: Wind + Sea Status */}
          <div className="text-[10px] text-gray-500 truncate flex items-center gap-1">
            <span>💨 {weather.wind_speed} km/j {weather.wind_direction}</span>
            <span className="text-gray-300">·</span>
            <span className={`font-semibold ${getSeaStatusColor(weather.sea_status)}`}>
              {weather.sea_status_label}
            </span>
          </div>

          {/* Line 3: Footnote sumber ambang (transparansi anti-misleading) */}
          <p className="text-[8px] text-gray-400 mt-0.5 truncate">
            Status: standar kapal feri (BMKG)
          </p>
        </div>

        {/* BMKG attribution */}
        <span className="text-[8px] text-gray-400 shrink-0 tracking-wider uppercase font-bold self-start">
          BMKG
        </span>
      </div>
    </div>
  );
}
