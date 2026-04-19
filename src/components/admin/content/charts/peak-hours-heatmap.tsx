'use client';

/**
 * TeraLoka — Peak Hours Heatmap
 * Phase 2 · Batch 7e5 — Distribution Metrics
 * ------------------------------------------------------------
 * Custom SVG heatmap: 7 rows (days of week) × 24 cols (hours).
 * Intensity = pageview count.
 *
 * Kalau data sparse, tampil sebagai mostly-empty grid (expected pre-launch).
 */

import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { DAY_LABELS, type PeakHourRow } from '@/types/distribution-metrics';

interface PeakHoursHeatmapProps {
  data: PeakHourRow[];
  loading?: boolean;
}

export function PeakHoursHeatmap({ data, loading = false }: PeakHoursHeatmapProps) {
  const { matrix, maxCount, totalViews, peakDay, peakHour } = useMemo(() => {
    // Initialize 7×24 matrix
    const mat: number[][] = Array.from({ length: 7 }, () =>
      Array.from({ length: 24 }, () => 0)
    );
    let max = 0;
    let total = 0;
    let peakD = 0;
    let peakH = 0;

    for (const row of data) {
      const dow = Number(row.day_of_week) - 1; // 1-7 → 0-6
      const hr = Number(row.hour);
      const cnt = Number(row.count) || 0;
      if (dow >= 0 && dow < 7 && hr >= 0 && hr < 24) {
        mat[dow][hr] = cnt;
        total += cnt;
        if (cnt > max) {
          max = cnt;
          peakD = dow + 1;
          peakH = hr;
        }
      }
    }
    return {
      matrix: mat,
      maxCount: max,
      totalViews: total,
      peakDay: peakD,
      peakHour: peakH,
    };
  }, [data]);

  // Color scale: 0 = muted, max = brand teal
  const getColor = (count: number): string => {
    if (count === 0) return 'var(--color-surface-muted)';
    const intensity = Math.min(1, count / (maxCount || 1));
    // 6 buckets for visible gradient
    if (intensity < 0.15) return 'rgba(27, 107, 74, 0.15)';
    if (intensity < 0.3)  return 'rgba(27, 107, 74, 0.3)';
    if (intensity < 0.5)  return 'rgba(27, 107, 74, 0.5)';
    if (intensity < 0.7)  return 'rgba(27, 107, 74, 0.7)';
    if (intensity < 0.85) return 'rgba(27, 107, 74, 0.85)';
    return '#1B6B4A';
  };

  return (
    <Card padded>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-bold text-text flex items-center gap-2">
            <span>🕐</span>
            <span>Peak Reading Hours</span>
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            {totalViews} pageviews · hari × jam
          </p>
        </div>
        {maxCount > 0 && (
          <div className="text-right">
            <p className="text-[10px] text-text-subtle">Peak</p>
            <p className="text-xs font-bold text-brand-teal">
              {DAY_LABELS[peakDay]} · {String(peakHour).padStart(2, '0')}:00
            </p>
          </div>
        )}
      </div>

      {loading ? (
        <div className="h-[220px] rounded bg-surface-muted animate-pulse" />
      ) : totalViews === 0 ? (
        <div className="h-[220px] flex flex-col items-center justify-center text-center gap-1">
          <span className="text-3xl mb-1">🕐</span>
          <p className="text-sm font-semibold text-text-muted">
            Belum ada data peak hours
          </p>
          <p className="text-xs text-text-subtle max-w-[240px]">
            Heatmap akan terisi setelah pengunjung datang (post-launch)
          </p>
        </div>
      ) : (
        <div>
          {/* Grid */}
          <div className="flex gap-[2px] mb-2">
            {/* Day labels column */}
            <div className="flex flex-col gap-[2px] pt-4 pr-1">
              {[1, 2, 3, 4, 5, 6, 7].map((dow) => (
                <div
                  key={dow}
                  className="h-5 flex items-center text-[10px] text-text-muted font-medium"
                >
                  {DAY_LABELS[dow]}
                </div>
              ))}
            </div>

            {/* Heatmap grid */}
            <div className="flex-1 overflow-x-auto">
              {/* Hour labels */}
              <div className="flex gap-[2px] mb-1">
                {Array.from({ length: 24 }, (_, h) => (
                  <div
                    key={h}
                    className="w-[calc((100%-46px)/24)] min-w-[12px] text-[9px] text-text-subtle text-center"
                  >
                    {h % 3 === 0 ? h : ''}
                  </div>
                ))}
              </div>
              {/* Data rows */}
              {matrix.map((row, dowIdx) => (
                <div key={dowIdx} className="flex gap-[2px] mb-[2px]">
                  {row.map((count, hrIdx) => (
                    <div
                      key={hrIdx}
                      className="h-5 w-[calc((100%-46px)/24)] min-w-[12px] rounded-sm transition-colors"
                      style={{ backgroundColor: getColor(count) }}
                      title={`${DAY_LABELS[dowIdx + 1]} ${String(hrIdx).padStart(2, '0')}:00 — ${count} views`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 text-[10px] text-text-muted mt-3">
            <span>Less</span>
            <div className="flex gap-[2px]">
              {[0, 0.15, 0.3, 0.5, 0.7, 0.85].map((i) => (
                <div
                  key={i}
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: getColor(i * (maxCount || 1)) }}
                />
              ))}
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: '#1B6B4A' }}
              />
            </div>
            <span>More</span>
          </div>
        </div>
      )}
    </Card>
  );
}
