'use client';

/**
 * TeraLoka — ServiceHealthItem
 * Phase 2 · Batch 4b — Domain Components
 * ------------------------------------------------------------
 * Kartu kecil yang merepresentasikan status 1 service.
 * Dipakai sebagai building block dari ServiceHealthStrip.
 *
 * Dual encoding:
 * - Service color (identity)  → left border + icon bubble
 * - Status dot (kondisi)      → top-right indicator (healthy/warning/critical/offline/coming)
 *
 * Contoh:
 *   <ServiceHealthItem
 *     service="bakabar"
 *     icon={<FileText size={14} />}
 *     label="BAKABAR"
 *     status="healthy"
 *     metric="4 draft"
 *   />
 *
 *   <ServiceHealthItem
 *     service="baantar"
 *     icon={<Package size={14} />}
 *     label="BAANTAR"
 *     status="coming"
 *   />
 */

import Link from 'next/link';
import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { StatusDot } from '@/components/ui/status-dot';
import { type ServiceKey } from '@/components/ui/badge';

export type ServiceHealthStatus =
  | 'healthy'
  | 'warning'
  | 'critical'
  | 'offline'
  | 'coming';

export interface ServiceHealthItemProps {
  service: ServiceKey;
  icon: ReactNode;
  label: string;
  status: ServiceHealthStatus;
  /** Metric/sub-info kecil di bawah label (e.g. "4 draft", "120ms latency") */
  metric?: string;
  /** Link ke service command center */
  href?: string;
  onClick?: () => void;
  className?: string;
}

/* ─── Service color mapping (icon + left accent) ─── */

const ICON_BG: Record<ServiceKey, string> = {
  bakabar: 'bg-bakabar-muted text-bakabar',
  balapor: 'bg-balapor-muted text-balapor',
  badonasi: 'bg-badonasi-muted text-badonasi',
  bakos: 'bg-bakos-muted text-bakos',
  properti: 'bg-properti-muted text-properti',
  kendaraan: 'bg-kendaraan-muted text-kendaraan',
  baantar: 'bg-baantar-muted text-baantar',
  bapasiar: 'bg-bapasiar-muted text-bapasiar',
  baronda: 'bg-baronda-muted text-baronda',
  ppob: 'bg-ppob-muted text-ppob',
  event: 'bg-event-muted text-event',
  finansial: 'bg-finansial-muted text-finansial',
  ads: 'bg-ads-muted text-ads',
  ticker: 'bg-ticker-muted text-ticker',
  notifwa: 'bg-notifwa-muted text-notifwa',
  analytics: 'bg-analytics-muted text-analytics',
  syshealth: 'bg-syshealth-muted text-syshealth',
  trustsafety: 'bg-trustsafety-muted text-trustsafety',
  users: 'bg-users-muted text-users',
  roles: 'bg-roles-muted text-roles',
};

const BORDER_COLOR: Record<ServiceKey, string> = {
  bakabar: 'border-l-bakabar',
  balapor: 'border-l-balapor',
  badonasi: 'border-l-badonasi',
  bakos: 'border-l-bakos',
  properti: 'border-l-properti',
  kendaraan: 'border-l-kendaraan',
  baantar: 'border-l-baantar',
  bapasiar: 'border-l-bapasiar',
  baronda: 'border-l-baronda',
  ppob: 'border-l-ppob',
  event: 'border-l-event',
  finansial: 'border-l-finansial',
  ads: 'border-l-ads',
  ticker: 'border-l-ticker',
  notifwa: 'border-l-notifwa',
  analytics: 'border-l-analytics',
  syshealth: 'border-l-syshealth',
  trustsafety: 'border-l-trustsafety',
  users: 'border-l-users',
  roles: 'border-l-roles',
};

/* ─── Status mapping (dot + animation) ─── */

const STATUS_MAP: Record<
  ServiceHealthStatus,
  {
    dotStatus: 'healthy' | 'warning' | 'critical' | 'neutral' | 'off';
    animation: 'none' | 'pulse' | 'ping';
    label: string;
  }
> = {
  healthy: { dotStatus: 'healthy', animation: 'none', label: 'Normal' },
  warning: { dotStatus: 'warning', animation: 'pulse', label: 'Peringatan' },
  critical: { dotStatus: 'critical', animation: 'ping', label: 'Kritis' },
  offline: { dotStatus: 'neutral', animation: 'none', label: 'Offline' },
  coming: { dotStatus: 'off', animation: 'none', label: 'Coming soon' },
};

export function ServiceHealthItem({
  service,
  icon,
  label,
  status,
  metric,
  href,
  onClick,
  className,
}: ServiceHealthItemProps) {
  const isInteractive = Boolean(href || onClick);
  const isComing = status === 'coming';
  const statusMeta = STATUS_MAP[status];

  const content = (
    <div
      className={cn(
        'group relative flex items-center gap-2.5 p-2.5 rounded-lg',
        'bg-surface border border-border border-l-[3px]',
        BORDER_COLOR[service],
        'transition-all duration-150',
        isInteractive && !isComing && 'hover:shadow-sm hover:bg-surface-elevated',
        isComing && 'opacity-60',
        className
      )}
      title={`${label} · ${statusMeta.label}`}
    >
      {/* Icon bubble */}
      <div
        className={cn(
          'flex items-center justify-center h-8 w-8 rounded-lg shrink-0',
          ICON_BG[service]
        )}
      >
        {icon}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-text leading-tight truncate">
          {label}
        </div>
        {(metric || isComing) && (
          <div className="text-[10px] text-text-muted mt-0.5 leading-tight truncate">
            {isComing ? 'Coming soon' : metric}
          </div>
        )}
      </div>

      {/* Status dot (pojok kanan atas) */}
      <StatusDot
        status={statusMeta.dotStatus}
        size="sm"
        animated={statusMeta.animation}
        srLabel={`${label}: ${statusMeta.label}`}
        className="shrink-0"
      />
    </div>
  );

  if (isComing) return content;

  if (href) {
    return (
      <Link href={href} className="block no-underline">
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="text-left w-full">
        {content}
      </button>
    );
  }

  return content;
}
