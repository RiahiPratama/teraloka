'use client';

// ════════════════════════════════════════════════════════════════
// SHARED — Environment / Weather Widget (v2.1 PREMIUM COMPACT)
// PATH: src/components/shared/environment/WeatherWidget.tsx
// ────────────────────────────────────────────────────────────────
// v2.1 (31 Mei 2026) — COMPACT: padatin tinggi (col-1 lebih pendek).
//   - Banner peringatan: 3 baris → 2 baris (label+denyut | event · expires →).
//   - Konten: ikon 44→36px, padding diciutin, footnote "kapal feri"
//     dilebur INLINE di sebelah pill (hemat 1 baris).
//   - Semua info tetap ada (suhu, cuaca, angin, lembap, status laut,
//     peringatan, atribusi BMKG) — cuma lebih rapat.
// v2.0 (31 Mei): premium redesign + banner Peringatan Dini BMKG + sea pill.
//
// Graceful: loading=skeleton · error/no-data=null.
// ════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

export interface WeatherWarning {
  event:       string;
  headline:    string;
  description: string;
  effective:   string;
  expires:     string;
  web:         string | null;
}

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
  sea_status_factors?: string[];
  warning:          WeatherWarning | null;
  updated_at:       string;
  source:           string;
}

interface Props {
  regionSlug: string;
  regionName?: string;
}

function getWeatherEmoji(code: number): string {
  if (code === 0) return '☀️';
  if (code === 1 || code === 2) return '⛅';
  if (code === 3 || code === 4) return '☁️';
  if (code >= 5 && code <= 50) return '🌫️';
  if (code >= 60 && code <= 63) return '🌧️';
  if (code === 80 || code === 81 || code === 82) return '🌦️';
  if (code === 95 || code === 97) return '⛈️';
  return '🌤️';
}

function seaPillStyle(status: WeatherData['sea_status']): { bg: string; text: string; ring: string } {
  if (status === 'berbahaya') return { bg: '#FEF2F2', text: '#B91C1C', ring: '#FECACA' };
  if (status === 'waspada')   return { bg: '#FFFBEB', text: '#B45309', ring: '#FDE68A' };
  return { bg: '#ECFDF5', text: '#047857', ring: '#A7F3D0' };
}

function formatWIT(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const hhmm = new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jayapura',
    }).format(d).replace(':', '.');
    return `${hhmm} WIT`;
  } catch { return ''; }
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
        if (data.success && data.data) setWeather(data.data);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [regionSlug]);

  // ── Skeleton (compact) ─────────────────────────────────────
  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 animate-pulse">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-gray-200 rounded w-2/3" />
            <div className="h-2 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !weather) return null;

  const activeWarning =
    weather.warning && Date.parse(weather.warning.expires) > Date.now()
      ? weather.warning
      : null;

  const pill = seaPillStyle(weather.sea_status);
  const isDanger = weather.sea_status === 'berbahaya';

  return (
    <div
      className="rounded-xl overflow-hidden border shadow-sm"
      style={{
        borderColor: activeWarning ? (isDanger ? '#FECACA' : '#FDE68A') : '#E2E8F0',
        background: 'linear-gradient(160deg, #FFFFFF 0%, #F0F9FF 100%)',
      }}
    >
      {/* ── BANNER PERINGATAN DINI BMKG (compact 2 baris) ───────── */}
      {activeWarning && (
        <a
          href={activeWarning.web ?? '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="block px-3 py-1.5 text-white transition-opacity hover:opacity-95"
          style={{
            background: isDanger
              ? 'linear-gradient(100deg, #DC2626 0%, #E11D48 100%)'
              : 'linear-gradient(100deg, #F59E0B 0%, #F97316 100%)',
          }}
        >
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-75 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
            </span>
            <span className="text-[9px] font-extrabold tracking-[1px] uppercase">Peringatan Dini BMKG</span>
          </div>
          <p className="text-[11px] font-bold leading-tight mt-0.5 truncate">
            {activeWarning.event} · s/d {formatWIT(activeWarning.expires)} →
          </p>
        </a>
      )}

      {/* ── Konten cuaca (compact) ──────────────────────────────── */}
      <div className="px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <span
            className="relative grid place-items-center w-9 h-9 rounded-full shrink-0"
            style={{ background: 'radial-gradient(circle at 50% 38%, rgba(8,145,178,0.20), rgba(8,145,178,0.03))' }}
            role="img"
            aria-label="Kondisi cuaca"
          >
            <span className="text-[20px] leading-none">{getWeatherEmoji(weather.weather_code)}</span>
          </span>

          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[19px] font-extrabold text-gray-900 leading-none tracking-tight">
                {weather.temperature}°C
              </span>
              <span className="text-[11px] text-gray-600 truncate">{weather.weather_desc}</span>
            </div>
            <div className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span>💨 {weather.wind_speed} km/j {weather.wind_direction}</span>
              <span className="text-gray-300">·</span>
              <span>💧 {weather.humidity}%</span>
            </div>
          </div>

          <div className="flex flex-col items-end shrink-0 gap-0.5">
            <span className="text-[8px] text-gray-400 tracking-wider uppercase font-bold">BMKG</span>
            {weather.updated_at && (
              <span className="text-[8px] text-gray-300">{formatWIT(weather.updated_at)}</span>
            )}
          </div>
        </div>

        {/* Sea-status: pill + footnote inline (hemat 1 baris) */}
        <div className="mt-2 flex items-center gap-1.5 min-w-0">
          <span
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border shrink-0"
            style={{ background: pill.bg, color: pill.text, borderColor: pill.ring }}
          >
            {weather.sea_status_label}
          </span>
          <span className="text-[8px] text-gray-400 truncate">· standar kapal feri</span>
        </div>
      </div>
    </div>
  );
}
