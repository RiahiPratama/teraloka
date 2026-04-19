'use client';

/**
 * TeraLoka — BalaporMap (Public API Wrapper)
 * Phase 2 · Batch 7b2 — Reports Map
 * ------------------------------------------------------------
 * Wrapper thin yang dynamically import komponen Leaflet-based.
 * Leaflet butuh `window` global — tidak SSR-safe.
 *
 * Pattern mirror regional-map.tsx (Batch 6c) — split jadi wrapper
 * + inner component, inner-nya di-load via `dynamic(..., { ssr: false })`.
 *
 * Contoh:
 *   <BalaporMap reports={reports} height={380} />
 *
 *   <BalaporMap
 *     reports={filteredReports}
 *     height={300}
 *     onMarkerClick={(r) => openReportDetail(r.id)}
 *   />
 */

import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import type { Report } from '@/types/reports';

/* ─── Props ─── */

export interface BalaporMapProps {
  reports: Report[];
  /** Tinggi map (px). Default 380. */
  height?: number;
  /** Loading state — tampilkan skeleton */
  loading?: boolean;
  /** Click handler pada marker */
  onMarkerClick?: (report: Report) => void;
  /** Optional className untuk wrapper */
  className?: string;
}

/* ─── Dynamic import inner (Leaflet) — SSR-safe ─── */

const LeafletBalaporMap = dynamic(
  () =>
    import('./balapor-map-leaflet').then((m) => m.BalaporMapLeaflet),
  {
    ssr: false,
    loading: () => (
      <div
        className="w-full rounded-lg bg-surface-muted animate-pulse border border-border"
        style={{ height: 380 }}
      />
    ),
  }
);

/* ─── Loading skeleton ─── */

function MapSkeleton({ height }: { height: number }) {
  return (
    <div
      className="w-full rounded-lg bg-surface-muted animate-pulse border border-border"
      style={{ height }}
    />
  );
}

/* ─── Wrapper ─── */

export function BalaporMap({
  reports,
  height = 380,
  loading = false,
  onMarkerClick,
  className,
}: BalaporMapProps) {
  return (
    <div className={cn('w-full', className)}>
      {loading ? (
        <MapSkeleton height={height} />
      ) : (
        <LeafletBalaporMap
          reports={reports}
          height={height}
          onMarkerClick={onMarkerClick}
        />
      )}
    </div>
  );
}
