'use client';

/**
 * TeraLoka — RegionalMap (Public API Wrapper)
 * Phase 2 · Batch 6c — Regional Map Fix (Leaflet)
 * ------------------------------------------------------------
 * Wrapper thin yang dynamically import komponen Leaflet-based.
 * Leaflet butuh `window` global (manipulasi DOM) — tidak SSR-safe.
 * Pattern Next.js standard: split jadi wrapper + inner component,
 * inner-nya di-load via `dynamic(..., { ssr: false })`.
 *
 * API identik dengan versi sebelumnya (SVG schematic) — no breaking
 * change di call-site. Props `cityStats`, `legend`, `onCityClick`
 * tetap compatible.
 *
 * Contoh (tidak berubah):
 *   <RegionalMap />
 *
 *   <RegionalMap
 *     cityStats={{
 *       'kota-ternate': { count: 12, tone: 'warning' },
 *       'halmahera-utara': { count: 3 },
 *     }}
 *     legend="Distribusi laporan per kabupaten/kota"
 *     onCityClick={(city) => router.push(`/admin/reports?city=${city}`)}
 *   />
 */

import dynamic from 'next/dynamic';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';

/* ─── 10 Kabupaten/Kota Maluku Utara (+ Sofifi ibukota provinsi) ─── */

export type CityKey =
  | 'kota-ternate'
  | 'kota-tidore'
  | 'halmahera-barat'
  | 'halmahera-tengah'
  | 'halmahera-utara'
  | 'halmahera-selatan'
  | 'halmahera-timur'
  | 'kepulauan-sula'
  | 'pulau-morotai'
  | 'pulau-taliabu'
  | 'sofifi';

export interface CityStat {
  count: number;
  tone?: 'info' | 'warning' | 'critical' | 'healthy';
}

export interface RegionalMapProps {
  cityStats?: Partial<Record<CityKey, CityStat>>;
  title?: string;
  legend?: string;
  /** Tinggi area map (px). Default 320. */
  height?: number;
  loading?: boolean;
  onCityClick?: (city: CityKey) => void;
  /** Override center (default: Maluku Utara tengah) */
  center?: [number, number];
  /** Override zoom level (default: 7) */
  zoom?: number;
  className?: string;
}

/* ─── Dynamic import inner (Leaflet) — SSR-safe ─── */

const LeafletRegionalMap = dynamic(
  () =>
    import('./regional-map-leaflet').then((m) => m.RegionalMapLeaflet),
  {
    ssr: false,
    loading: () => (
      <div
        className="w-full rounded-lg bg-surface-muted animate-pulse"
        style={{ height: 320 }}
      />
    ),
  }
);

/* ─── Loading skeleton state ─── */

function MapSkeleton({ height }: { height: number }) {
  return (
    <div
      className="w-full rounded-lg bg-surface-muted animate-pulse"
      style={{ height }}
    />
  );
}

/* ─── Wrapper ─── */

export function RegionalMap({
  cityStats,
  title = 'Distribusi Regional',
  legend,
  height = 320,
  loading = false,
  onCityClick,
  center,
  zoom,
  className,
}: RegionalMapProps) {
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
          <MapSkeleton height={height} />
        ) : (
          <LeafletRegionalMap
            cityStats={cityStats}
            height={height}
            onCityClick={onCityClick}
            center={center}
            zoom={zoom}
          />
        )}

        {legend && !loading && (
          <p className="text-[11px] text-text-muted mt-3 leading-relaxed">
            {legend}
          </p>
        )}
        {!hasData && !loading && !legend && (
          <p className="text-[11px] text-text-muted mt-3">
            10 kabupaten/kota Maluku Utara — aggregasi per wilayah aktif setelah data masuk.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
