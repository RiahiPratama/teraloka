'use client';

/**
 * TeraLoka — ReportSidebar
 * Phase 2 · Batch 7b2 — Reports Map
 * ------------------------------------------------------------
 * Right sidebar untuk Live Incidents tab. Gabungan dari 2 widget:
 *
 * 1. Top Locations — rank lokasi yang paling banyak laporannya (top 5)
 * 2. Alert Clusters — laporan urgent ter-cluster per lokasi
 *
 * Alasan digabung di 1 file: tight coupling dengan data yang sama
 * (reports array), styling + spacing konsisten, less file sprawl.
 *
 * Map Live tab (mini) di-render terpisah di page.tsx.
 */

import { cn } from '@/lib/utils';
import { MapPin, Siren } from 'lucide-react';
import {
  timeAgo,
  topLocations,
  type Report,
} from '@/types/reports';

export interface ReportSidebarProps {
  reports: Report[];
  /** Max locations to show. Default 5. */
  locationLimit?: number;
  /** Max urgent alerts to show. Default 3. */
  alertLimit?: number;
  className?: string;
}

export function ReportSidebar({
  reports,
  locationLimit = 5,
  alertLimit = 3,
  className,
}: ReportSidebarProps) {
  const locations = topLocations(reports, locationLimit);
  const urgentReports = reports.filter((r) => r.priority === 'urgent').slice(0, alertLimit);
  const totalUrgent = reports.filter((r) => r.priority === 'urgent').length;

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* ── Top Locations ── */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <MapPin size={14} className="text-balapor" />
          <h3 className="text-sm font-bold text-text">Top Locations</h3>
        </div>

        {locations.length === 0 ? (
          <p className="text-xs text-text-muted leading-relaxed">
            Belum ada data lokasi.
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {locations.map((loc, i) => {
              const rankColor =
                i === 0
                  ? 'bg-status-critical'
                  : i === 1
                    ? 'bg-status-warning'
                    : 'bg-status-healthy';
              return (
                <div
                  key={loc.location}
                  className="flex items-center gap-2.5"
                >
                  <div
                    className={cn(
                      'flex items-center justify-center shrink-0',
                      'h-5 w-5 rounded-full',
                      'text-[9px] font-extrabold text-white',
                      rankColor
                    )}
                    aria-label={`Rank ${i + 1}`}
                  >
                    {i + 1}
                  </div>
                  <span className="flex-1 min-w-0 text-[12px] font-semibold text-text truncate">
                    {loc.location}
                  </span>
                  <span className="shrink-0 text-[12px] font-extrabold text-text tabular-nums">
                    {loc.count}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Alert Clusters — cuma tampil kalau ada urgent ── */}
      {totalUrgent > 0 && (
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Siren size={14} className="text-status-critical" />
              <h3 className="text-sm font-bold text-text">Alert Clusters</h3>
            </div>
            {totalUrgent > alertLimit && (
              <span className="text-[10px] font-semibold text-text-muted">
                +{totalUrgent - alertLimit} lainnya
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {urgentReports.map((r) => (
              <div
                key={r.id}
                className={cn(
                  'rounded-lg px-3 py-2.5',
                  'bg-status-critical/5 border border-status-critical/15'
                )}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className={cn(
                      'shrink-0 px-1.5 py-0.5 rounded',
                      'text-[9px] font-extrabold uppercase tracking-wide',
                      'bg-status-critical text-white'
                    )}
                  >
                    Urgent
                  </span>
                  <span className="text-[11px] font-bold text-text truncate">
                    {r.title}
                  </span>
                </div>
                <p className="text-[10px] text-text-muted truncate leading-relaxed">
                  📍 {r.location || 'Lokasi tidak tercatat'} ·{' '}
                  {timeAgo(r.created_at)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state — kalau tidak ada urgent, tampilin reassurance */}
      {totalUrgent === 0 && locations.length > 0 && (
        <div className="bg-status-healthy/5 border border-status-healthy/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Siren size={14} className="text-status-healthy" />
            <h3 className="text-sm font-bold text-status-healthy">
              Tidak ada cluster urgent
            </h3>
          </div>
          <p className="text-[11px] text-text-secondary leading-relaxed">
            Tidak ada laporan dengan prioritas urgent saat ini.
          </p>
        </div>
      )}
    </div>
  );
}
