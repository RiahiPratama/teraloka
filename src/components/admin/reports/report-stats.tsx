'use client';

/**
 * TeraLoka — ReportStats
 * Phase 2 · Batch 7b1 — Reports Page Migration
 * ------------------------------------------------------------
 * Stats row untuk reports page — 4 metric cards.
 *
 * Metrics:
 * - Total         → semua laporan
 * - Urgent        → priority=urgent
 * - High          → priority=high
 * - Belum Ditangani → status=pending AND >2 jam
 *
 * Design parallel dengan UserStats (Users page) — consistency across admin.
 */

import type { ReactNode } from 'react';
import { AlertOctagon, AlertTriangle, Clock, Flame, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReportStats as ReportStatsData } from '@/types/reports';

export interface ReportStatsProps {
  stats: ReportStatsData;
  /** Optional — count laporan dengan lifecycle_state='stalemate' (Sub-Sprint 1C-C-2) */
  stalemateCount?: number;
  loading?: boolean;
  className?: string;
}

interface StatDef {
  id: string;
  icon: ReactNode;
  label: string;
  value: number;
  sub: string;
  /** Tailwind classes untuk icon bubble + value color */
  iconBg: string;
  valueColor: string;
}

export function ReportStats({ stats, stalemateCount, loading = false, className }: ReportStatsProps) {
  const items: StatDef[] = [
    {
      id: 'total',
      icon: <Flame size={18} />,
      label: 'Total Laporan',
      value: stats.total,
      sub: `${stats.pending.toLocaleString('id-ID')} pending`,
      iconBg: 'bg-balapor/12 text-balapor',
      valueColor: 'text-balapor',
    },
    {
      id: 'urgent',
      icon: <AlertOctagon size={18} />,
      label: 'Urgent',
      value: stats.urgent,
      sub: 'Perlu segera',
      iconBg: 'bg-status-critical/12 text-status-critical',
      valueColor: 'text-status-critical',
    },
    {
      id: 'high',
      icon: <AlertTriangle size={18} />,
      label: 'High',
      value: stats.high,
      sub: 'Prioritas tinggi',
      iconBg: 'bg-status-warning/12 text-status-warning',
      valueColor: 'text-status-warning',
    },
    {
      id: 'unhandled',
      icon: <Clock size={18} />,
      label: 'Belum Ditangani',
      value: stats.unhandled,
      sub: 'Pending > 2 jam',
      iconBg:
        stats.unhandled > 0
          ? 'bg-status-critical/12 text-status-critical'
          : 'bg-surface-muted text-text-muted',
      valueColor:
        stats.unhandled > 0 ? 'text-status-critical' : 'text-text',
    },
  ];

  // Sub-Sprint 1C-C-2: Stalemate card (lifecycle integration)
  // Only render kalau caller provide stalemateCount (Phase 4 backend deployed)
  if (typeof stalemateCount === 'number') {
    items.push({
      id: 'stalemate',
      icon: <ShieldAlert size={18} />,
      label: 'Stalemate',
      value: stalemateCount,
      sub: 'Belum ada progress',
      iconBg:
        stalemateCount > 0
          ? 'bg-orange-100 text-orange-700'
          : 'bg-surface-muted text-text-muted',
      valueColor:
        stalemateCount > 0 ? 'text-orange-700' : 'text-text',
    });
  }

  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3', className)}>
      {items.map((s) => (
        <div
          key={s.id}
          className={cn(
            'flex items-center gap-3 p-4',
            'bg-surface border border-border rounded-xl',
            'transition-colors'
          )}
        >
          <div
            className={cn(
              'flex items-center justify-center h-10 w-10 rounded-lg shrink-0',
              s.iconBg
            )}
          >
            {s.icon}
          </div>
          <div className="min-w-0">
            {loading ? (
              <>
                <div className="h-7 w-12 rounded bg-surface-muted animate-pulse mb-1.5" />
                <div className="h-2.5 w-20 rounded bg-surface-muted animate-pulse" />
              </>
            ) : (
              <>
                <div
                  className={cn(
                    'text-2xl font-extrabold tabular-nums leading-none tracking-tight',
                    s.valueColor
                  )}
                >
                  {s.value.toLocaleString('id-ID')}
                </div>
                <div className="text-[11px] text-text-muted mt-1 leading-tight">
                  {s.sub}
                </div>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
