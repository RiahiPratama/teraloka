'use client';

/**
 * TeraLoka — AnomalyCard
 * Phase 2 · Batch 4b — Domain Components
 * ------------------------------------------------------------
 * Kartu deteksi anomali cross-service. Nampilin insight proaktif:
 * - Spike traffic tidak normal
 * - Konversi drop mendadak
 * - Cluster laporan di satu area
 * - Response time anomali
 *
 * Phase 1 reality: Endpoint belum ada. Default ke mode "coming" dengan
 * placeholder message. Siap consume data real di Phase 3+.
 *
 * Severity levels dengan border-left color coding:
 * - info     → biru, observasi
 * - warning  → kuning, perlu monitor
 * - critical → merah, butuh tindakan segera
 *
 * Contoh:
 *   // Coming soon state (default pre-launch)
 *   <AnomalyCard />
 *
 *   // Populated state (ketika endpoint aktif)
 *   <AnomalyCard
 *     anomalies={[
 *       {
 *         id: '1',
 *         severity: 'critical',
 *         title: 'Cluster laporan di Halmahera',
 *         description: '8 laporan serupa dalam 2 jam — kemungkinan kejadian massal.',
 *         service: 'balapor',
 *         timestamp: new Date(),
 *         href: '/admin/reports?cluster=halmahera',
 *       },
 *     ]}
 *   />
 */

import Link from 'next/link';
import { Brain, ChevronRight, TrendingUp } from 'lucide-react';
import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { Badge, type ServiceKey } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';

export type AnomalySeverity = 'info' | 'warning' | 'critical';

export interface Anomaly {
  id: string;
  severity: AnomalySeverity;
  title: string;
  description: string;
  service?: ServiceKey;
  timestamp?: Date;
  icon?: ReactNode;
  href?: string;
  onClick?: () => void;
}

export interface AnomalyCardProps {
  anomalies?: Anomaly[];
  title?: string;
  /** Max item visible sebelum "Lihat semua" */
  maxVisible?: number;
  viewAllHref?: string;
  loading?: boolean;
  /** Kalau true (default pre-launch), show "Coming soon" placeholder */
  comingSoon?: boolean;
  className?: string;
}

const SEVERITY_BORDER: Record<AnomalySeverity, string> = {
  info: 'border-l-status-info',
  warning: 'border-l-status-warning',
  critical: 'border-l-status-critical',
};

const SEVERITY_BG: Record<AnomalySeverity, string> = {
  info: 'bg-status-info/5',
  warning: 'bg-status-warning/8',
  critical: 'bg-status-critical/8',
};

const SEVERITY_BADGE_TONE: Record<
  AnomalySeverity,
  'info' | 'warning' | 'critical'
> = {
  info: 'info',
  warning: 'warning',
  critical: 'critical',
};

const SEVERITY_ORDER: Record<AnomalySeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

const SEVERITY_LABEL: Record<AnomalySeverity, string> = {
  critical: 'Kritis',
  warning: 'Peringatan',
  info: 'Observasi',
};

/* ─── Relative timestamp ─── */

function formatRelative(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'Baru saja';
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.round(hours / 24);
  return `${days} hari lalu`;
}

/* ─── Single anomaly row ─── */

function AnomalyRow({ anomaly }: { anomaly: Anomaly }) {
  const content = (
    <div
      className={cn(
        'group relative rounded-lg border-l-[3px] border-y border-r border-border',
        'p-3 pr-4 transition-colors',
        SEVERITY_BORDER[anomaly.severity],
        SEVERITY_BG[anomaly.severity],
        (anomaly.href || anomaly.onClick) && 'hover:brightness-[0.98] cursor-pointer'
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          {anomaly.icon && (
            <span className="shrink-0 text-text-muted">{anomaly.icon}</span>
          )}
          <span className="text-sm font-bold text-text leading-tight">
            {anomaly.title}
          </span>
        </div>
        <Badge
          variant="status"
          status={SEVERITY_BADGE_TONE[anomaly.severity]}
          size="xs"
          className="shrink-0"
        >
          {SEVERITY_LABEL[anomaly.severity]}
        </Badge>
      </div>

      <p className="text-xs text-text-secondary leading-relaxed mb-2">
        {anomaly.description}
      </p>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[10px] text-text-muted">
          {anomaly.service && (
            <Badge
              variant="service"
              service={anomaly.service}
              size="xs"
              style_="soft"
            >
              {anomaly.service}
            </Badge>
          )}
          {anomaly.timestamp && (
            <span className="tabular-nums">
              {formatRelative(anomaly.timestamp)}
            </span>
          )}
        </div>
        {(anomaly.href || anomaly.onClick) && (
          <ChevronRight
            size={12}
            className="text-text-subtle group-hover:text-text-muted shrink-0"
          />
        )}
      </div>
    </div>
  );

  if (anomaly.href) {
    return (
      <Link href={anomaly.href} className="block no-underline">
        {content}
      </Link>
    );
  }
  if (anomaly.onClick) {
    return (
      <button type="button" onClick={anomaly.onClick} className="text-left w-full">
        {content}
      </button>
    );
  }
  return content;
}

/* ─── Component ─── */

export function AnomalyCard({
  anomalies,
  title = 'Anomaly Detection',
  maxVisible = 3,
  viewAllHref,
  loading = false,
  comingSoon = false,
  className,
}: AnomalyCardProps) {
  // Pre-launch mode: comingSoon atau anomalies undefined
  const isComing = comingSoon || anomalies === undefined;

  const sorted = anomalies
    ? [...anomalies].sort(
        (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
      )
    : [];
  const visible = sorted.slice(0, maxVisible);
  const overflow = sorted.length - visible.length;

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="flex-row items-center gap-2 mb-3">
        <Brain size={16} className="text-analytics shrink-0" />
        <CardTitle className="text-sm flex-1">{title}</CardTitle>
        {!isComing && sorted.length > 0 && (
          <Badge variant="count" tone="default" size="sm">
            {sorted.length}
          </Badge>
        )}
      </CardHeader>

      <CardContent className="p-0 flex-1">
        {loading ? (
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="h-24 rounded-lg bg-surface-muted animate-pulse"
              />
            ))}
          </div>
        ) : isComing ? (
          <EmptyState
            icon={<TrendingUp size={24} />}
            title="Fitur akan aktif"
            description="Deteksi anomali cross-service akan aktif setelah data cukup terkumpul."
            helper="Estimasi: Setelah launch + 7 hari data"
            variant="muted"
            tone="info"
            size="sm"
          />
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={<Brain size={24} />}
            title="Tidak ada anomali"
            description="Platform normal. Semua metric dalam batas wajar."
            variant="muted"
            tone="healthy"
            size="sm"
          />
        ) : (
          <div className="flex flex-col gap-2">
            {visible.map((a) => (
              <AnomalyRow key={a.id} anomaly={a} />
            ))}
            {overflow > 0 && (
              <div className="text-xs text-text-muted text-center pt-1">
                +{overflow} anomali lainnya
              </div>
            )}
          </div>
        )}
      </CardContent>

      {viewAllHref && !isComing && sorted.length > 0 && (
        <div className="border-t border-border pt-3 mt-3">
          <Link
            href={viewAllHref}
            className="text-xs font-semibold text-brand-teal hover:text-brand-teal-light no-underline inline-flex items-center gap-1"
          >
            Lihat semua anomali <ChevronRight size={12} />
          </Link>
        </div>
      )}
    </Card>
  );
}
