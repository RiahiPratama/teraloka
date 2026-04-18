'use client';

/**
 * TeraLoka — SystemHealthCard
 * Phase 2 · Batch 4c — Domain Components
 * ------------------------------------------------------------
 * Panel live kondisi infrastruktur: API uptime, DB latency,
 * WA gateway (Fonnte), Supabase Storage, dll.
 *
 * Phase 1 reality: Endpoint real-time belum ada. Data passed via props
 * (manual update) — siap di-wire ke `/admin/system-health/live` di Phase 3+.
 *
 * Visual:
 * - Row per metric: icon + label + value + status dot
 * - Optional trend (improved/degraded dari baseline)
 * - Warning banner footer kalau ada metric non-healthy
 *
 * Contoh:
 *   <SystemHealthCard
 *     metrics={[
 *       { id: 'api',    label: 'API Uptime',  value: '99.98%', status: 'healthy', icon: <Server size={14} /> },
 *       { id: 'db',     label: 'DB Latency',  value: '45ms',   status: 'healthy', icon: <Database size={14} /> },
 *       { id: 'fonnte', label: 'Fonnte WA',   value: 'Online', status: 'healthy', icon: <MessageSquare size={14} /> },
 *       { id: 'cdn',    label: 'Supabase Storage', value: 'Online', status: 'healthy', icon: <Cloud size={14} /> },
 *     ]}
 *   />
 *
 *   // With warning
 *   <SystemHealthCard
 *     metrics={[...]}
 *     warning="Fonnte response time naik. Monitor via /admin/system-health"
 *   />
 */

import { type ReactNode } from 'react';
import { Activity, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { StatusDot } from '@/components/ui/status-dot';

export type HealthStatus = 'healthy' | 'warning' | 'critical' | 'unknown';

export interface HealthMetric {
  id: string;
  label: string;
  /** Nilai display — bebas format ("99.98%", "45ms", "Online", "3/3") */
  value: string;
  status: HealthStatus;
  /** Icon di kiri label */
  icon?: ReactNode;
  /** Trend indicator opsional */
  trend?: {
    direction: 'up' | 'down' | 'flat';
    label: string;
  };
}

export interface SystemHealthCardProps {
  metrics: HealthMetric[];
  title?: string;
  /** Pesan warning di footer (muncul otomatis jika ada metric non-healthy) */
  warning?: string;
  /** Link "Detail →" di footer */
  detailHref?: string;
  loading?: boolean;
  className?: string;
}

const STATUS_DOT: Record<HealthStatus, 'healthy' | 'warning' | 'critical' | 'neutral'> = {
  healthy: 'healthy',
  warning: 'warning',
  critical: 'critical',
  unknown: 'neutral',
};

const TREND_STYLE: Record<
  NonNullable<HealthMetric['trend']>['direction'],
  { color: string; arrow: string }
> = {
  up: { color: 'text-status-healthy', arrow: '↑' },
  down: { color: 'text-status-critical', arrow: '↓' },
  flat: { color: 'text-text-muted', arrow: '→' },
};

export function SystemHealthCard({
  metrics,
  title = 'System Health',
  warning,
  detailHref,
  loading = false,
  className,
}: SystemHealthCardProps) {
  // Auto-detect warning kalau ada metric non-healthy dan tidak pass warning manual
  const nonHealthy = metrics.filter(
    (m) => m.status === 'warning' || m.status === 'critical'
  );
  const autoWarning =
    !warning && nonHealthy.length > 0
      ? `${nonHealthy.length} metric perlu perhatian.`
      : warning;

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="flex-row items-center gap-2 mb-3">
        <Activity size={16} className="text-syshealth shrink-0" />
        <CardTitle className="text-sm flex-1">{title}</CardTitle>
        {!loading && (
          <StatusDot
            status={
              nonHealthy.some((m) => m.status === 'critical')
                ? 'critical'
                : nonHealthy.length > 0
                  ? 'warning'
                  : 'healthy'
            }
            size="sm"
            animated={nonHealthy.length > 0 ? 'pulse' : 'none'}
            srLabel="System status indicator"
          />
        )}
      </CardHeader>

      <CardContent className="p-0 flex-1">
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-10 rounded-lg bg-surface-muted animate-pulse"
              />
            ))}
          </div>
        ) : metrics.length === 0 ? (
          <p className="text-xs text-text-muted text-center py-4">
            Belum ada metric terdaftar.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {metrics.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                {/* Icon + label */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {m.icon && (
                    <span className="text-text-muted shrink-0">{m.icon}</span>
                  )}
                  <span className="text-xs font-medium text-text-secondary truncate">
                    {m.label}
                  </span>
                </div>

                {/* Trend (optional) */}
                {m.trend && (
                  <span
                    className={cn(
                      'text-[10px] font-semibold tabular-nums shrink-0',
                      TREND_STYLE[m.trend.direction].color
                    )}
                  >
                    {TREND_STYLE[m.trend.direction].arrow} {m.trend.label}
                  </span>
                )}

                {/* Value */}
                <span className="text-xs font-bold tabular-nums text-text shrink-0">
                  {m.value}
                </span>

                {/* Status dot */}
                <StatusDot
                  status={STATUS_DOT[m.status]}
                  size="xs"
                  animated={m.status === 'critical' ? 'ping' : 'none'}
                  srLabel={`${m.label}: ${m.status}`}
                  className="shrink-0"
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {!loading && autoWarning && (
        <div className="mt-3 pt-3 border-t border-border flex items-start gap-2">
          <AlertCircle
            size={14}
            className={cn(
              'shrink-0 mt-0.5',
              nonHealthy.some((m) => m.status === 'critical')
                ? 'text-status-critical'
                : 'text-status-warning'
            )}
          />
          <p className="text-[11px] text-text-secondary leading-relaxed flex-1">
            {autoWarning}
          </p>
          {detailHref && (
            <a
              href={detailHref}
              className="text-[11px] font-semibold text-brand-teal hover:text-brand-teal-light no-underline shrink-0"
            >
              Detail →
            </a>
          )}
        </div>
      )}
    </Card>
  );
}
