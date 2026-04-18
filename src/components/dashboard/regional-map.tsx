'use client';

/**
 * TeraLoka — RegionalMap
 * Phase 2 · Batch 4c — Domain Components
 * ------------------------------------------------------------
 * Peta regional Maluku Utara dengan 9 pin kota (placeholder).
 * Bukan peta geografis akurat — representasi visual schematic
 * untuk spatial context.
 *
 * Phase 1 reality: endpoint aggregate count per city BELUM ADA.
 * Peta show pin saja tanpa badge count default. Bisa aggregat saat
 * `cityStats` prop di-pass.
 *
 * Cities (9):
 * - Morotai (atas)
 * - Tobelo, Jailolo, Sidangoli, Sofifi (Halmahera main)
 * - Ternate, Tidore (kecil barat)
 * - Bacan (selatan Halmahera)
 * - Sanana (Sulabesi, barat daya)
 *
 * Contoh:
 *   // Pin saja (pre-aggregate)
 *   <RegionalMap />
 *
 *   // Dengan aggregation
 *   <RegionalMap
 *     cityStats={{
 *       ternate: { count: 12, tone: 'warning' },
 *       sofifi: { count: 3 },
 *       tobelo: { count: 1 },
 *     }}
 *     legend="Jumlah laporan aktif per kota"
 *   />
 */

import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';

export type CityKey =
  | 'morotai'
  | 'tobelo'
  | 'jailolo'
  | 'sidangoli'
  | 'sofifi'
  | 'ternate'
  | 'tidore'
  | 'bacan'
  | 'sanana';

interface CityStat {
  count: number;
  tone?: 'info' | 'warning' | 'critical' | 'healthy';
}

export interface RegionalMapProps {
  cityStats?: Partial<Record<CityKey, CityStat>>;
  title?: string;
  legend?: string;
  /** Tinggi area map (px) */
  height?: number;
  loading?: boolean;
  onCityClick?: (city: CityKey) => void;
  className?: string;
}

/* ─── City positions & labels ───
   Koordinat di SVG viewBox 400×280. Aproksimasi schematic,
   bukan geografi presisi.
*/
const CITIES: Record<CityKey, { x: number; y: number; label: string }> = {
  morotai:   { x: 310, y: 48,  label: 'Morotai'   },
  tobelo:    { x: 275, y: 108, label: 'Tobelo'    },
  jailolo:   { x: 190, y: 152, label: 'Jailolo'   },
  sidangoli: { x: 215, y: 172, label: 'Sidangoli' },
  sofifi:    { x: 240, y: 190, label: 'Sofifi'    },
  ternate:   { x: 150, y: 180, label: 'Ternate'   },
  tidore:    { x: 163, y: 200, label: 'Tidore'    },
  bacan:     { x: 210, y: 240, label: 'Bacan'     },
  sanana:    { x: 70,  y: 230, label: 'Sanana'    },
};

const TONE_COLOR: Record<NonNullable<CityStat['tone']>, string> = {
  info: 'var(--color-status-info)',
  warning: 'var(--color-status-warning)',
  critical: 'var(--color-status-critical)',
  healthy: 'var(--color-status-healthy)',
};

/* ─── Component ─── */

export function RegionalMap({
  cityStats,
  title = 'Distribusi Regional',
  legend,
  height = 300,
  loading = false,
  onCityClick,
  className,
}: RegionalMapProps) {
  const [hoveredCity, setHoveredCity] = useState<CityKey | null>(null);
  const hasData =
    cityStats && Object.values(cityStats).some((s) => s && s.count > 0);

  const totalPoints = hasData
    ? Object.values(cityStats!).reduce((sum, s) => sum + (s?.count ?? 0), 0)
    : 0;

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="flex-row items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <MapPin size={16} className="text-brand-teal shrink-0" />
          <CardTitle className="text-sm">{title}</CardTitle>
        </div>
        {hasData && (
          <span className="text-[11px] font-semibold text-text-muted tabular-nums">
            Total: {totalPoints.toLocaleString('id-ID')}
          </span>
        )}
      </CardHeader>

      <CardContent className="p-0 flex-1">
        {loading ? (
          <div
            className="w-full rounded-lg bg-surface-muted animate-pulse"
            style={{ height }}
          />
        ) : (
          <div
            className="relative w-full rounded-lg bg-surface-muted overflow-hidden"
            style={{ height }}
          >
            <svg
              viewBox="0 0 400 280"
              className="w-full h-full"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Water texture — subtle dots pattern */}
              <defs>
                <pattern
                  id="water-dots"
                  x="0"
                  y="0"
                  width="20"
                  height="20"
                  patternUnits="userSpaceOnUse"
                >
                  <circle
                    cx="10"
                    cy="10"
                    r="0.6"
                    fill="var(--color-border)"
                    opacity="0.5"
                  />
                </pattern>
              </defs>
              <rect width="400" height="280" fill="url(#water-dots)" />

              {/* Halmahera main island — K-shape approximation */}
              <path
                d="M 200 70 Q 230 65 260 85 Q 290 105 285 140 Q 280 175 260 200 Q 240 220 225 210 Q 210 195 205 170 Q 195 150 185 130 Q 178 105 200 70 Z"
                fill="var(--color-surface)"
                stroke="var(--color-border)"
                strokeWidth="1"
              />

              {/* Morotai — atas terpisah */}
              <ellipse
                cx="310"
                cy="48"
                rx="28"
                ry="20"
                fill="var(--color-surface)"
                stroke="var(--color-border)"
                strokeWidth="1"
              />

              {/* Ternate — pulau kecil kiri */}
              <circle
                cx="150"
                cy="180"
                r="12"
                fill="var(--color-surface)"
                stroke="var(--color-border)"
                strokeWidth="1"
              />

              {/* Tidore — di bawah Ternate */}
              <circle
                cx="163"
                cy="200"
                r="10"
                fill="var(--color-surface)"
                stroke="var(--color-border)"
                strokeWidth="1"
              />

              {/* Bacan — selatan Halmahera */}
              <path
                d="M 185 230 Q 210 225 235 232 Q 240 250 215 260 Q 185 258 180 245 Z"
                fill="var(--color-surface)"
                stroke="var(--color-border)"
                strokeWidth="1"
              />

              {/* Sulabesi/Sanana — barat daya */}
              <path
                d="M 40 218 Q 75 212 105 222 Q 112 240 95 250 Q 55 252 35 240 Z"
                fill="var(--color-surface)"
                stroke="var(--color-border)"
                strokeWidth="1"
              />

              {/* City markers */}
              {(Object.entries(CITIES) as [CityKey, typeof CITIES[CityKey]][]).map(
                ([key, city]) => {
                  const stat = cityStats?.[key];
                  const hasCount = stat && stat.count > 0;
                  const color = stat?.tone
                    ? TONE_COLOR[stat.tone]
                    : 'var(--color-brand-teal)';
                  const radius = hasCount
                    ? Math.min(8, 4 + Math.log2(stat.count + 1) * 1.2)
                    : 3.5;
                  const isHover = hoveredCity === key;

                  return (
                    <g
                      key={key}
                      onMouseEnter={() => setHoveredCity(key)}
                      onMouseLeave={() => setHoveredCity(null)}
                      onClick={onCityClick ? () => onCityClick(key) : undefined}
                      className={cn(onCityClick && 'cursor-pointer')}
                    >
                      {/* Pulse ring saat hasCount */}
                      {hasCount && (
                        <circle
                          cx={city.x}
                          cy={city.y}
                          r={radius + 3}
                          fill={color}
                          opacity="0.25"
                          className="animate-pulse"
                        />
                      )}
                      {/* Dot marker */}
                      <circle
                        cx={city.x}
                        cy={city.y}
                        r={radius}
                        fill={color}
                        stroke="var(--color-surface)"
                        strokeWidth="1.5"
                      />
                      {/* Count label di atas dot */}
                      {hasCount && (
                        <text
                          x={city.x}
                          y={city.y + 0.5}
                          fontSize="8"
                          fontWeight="700"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="var(--color-surface)"
                          className="pointer-events-none select-none tabular-nums"
                        >
                          {stat.count > 99 ? '99+' : stat.count}
                        </text>
                      )}
                      {/* City name */}
                      <text
                        x={city.x}
                        y={city.y + radius + 10}
                        fontSize="9"
                        fontWeight={isHover ? '700' : '500'}
                        textAnchor="middle"
                        fill="var(--color-text-secondary)"
                        className="pointer-events-none select-none"
                      >
                        {city.label}
                      </text>
                    </g>
                  );
                }
              )}
            </svg>

            {/* Overlay info badge (top-right) */}
            {hoveredCity && cityStats?.[hoveredCity] && (
              <div className="absolute top-2 right-2 bg-surface-elevated border border-border rounded-lg shadow-sm px-2.5 py-1.5 pointer-events-none">
                <div className="text-[10px] font-semibold text-text-muted leading-none">
                  {CITIES[hoveredCity].label}
                </div>
                <div className="text-sm font-bold text-text tabular-nums mt-0.5">
                  {cityStats[hoveredCity]!.count.toLocaleString('id-ID')}
                </div>
              </div>
            )}
          </div>
        )}

        {legend && !loading && (
          <p className="text-[11px] text-text-muted mt-3 leading-relaxed">
            {legend}
          </p>
        )}
        {!hasData && !loading && !legend && (
          <p className="text-[11px] text-text-muted mt-3">
            9 kota aktif — aggregasi per lokasi aktif setelah data masuk.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
