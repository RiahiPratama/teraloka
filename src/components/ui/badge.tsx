'use client';

/**
 * TeraLoka — Badge
 * Phase 2 · Batch 3c — Feedback & Navigation
 * ------------------------------------------------------------
 * Pill label untuk status, count, atau service identity.
 *
 * 3 varian utama:
 *
 * 1. Status — color-coded status
 *    <Badge variant="status" status="healthy">Aktif</Badge>
 *    <Badge variant="status" status="warning">Pending</Badge>
 *    <Badge variant="status" status="critical">Urgent</Badge>
 *    <Badge variant="status" status="info">Draft</Badge>
 *    <Badge variant="status" status="neutral">Arsip</Badge>
 *
 * 2. Service — identity color per layanan TeraLoka
 *    <Badge variant="service" service="bakabar">News</Badge>
 *    <Badge variant="service" service="balapor">Laporan</Badge>
 *    <Badge variant="service" service="badonasi">Donasi</Badge>
 *    ... (20 services total, pakai key dari globals.css)
 *
 * 3. Count — simple number badge (notification dot pattern)
 *    <Badge variant="count">12</Badge>
 *    <Badge variant="count" tone="critical">99+</Badge>
 *
 * Sizes: xs (18px) / sm (20px default) / md (24px)
 *
 * Style: solid (default) atau soft (muted background + strong text)
 */

import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/** Service keys — match CSS variables di globals.css */
export type ServiceKey =
  | 'bakabar'
  | 'balapor'
  | 'badonasi'
  | 'bakos'
  | 'properti'
  | 'kendaraan'
  | 'baantar'
  | 'bapasiar'
  | 'baronda'
  | 'ppob'
  | 'event'
  | 'finansial'
  | 'ads'
  | 'ticker'
  | 'notifwa'
  | 'analytics'
  | 'syshealth'
  | 'trustsafety'
  | 'users'
  | 'roles';

type BadgeVariant = 'status' | 'service' | 'count';
type BadgeStatus = 'healthy' | 'warning' | 'critical' | 'info' | 'neutral';
type BadgeSize = 'xs' | 'sm' | 'md';
type BadgeStyle = 'solid' | 'soft';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  /** Untuk variant='status' */
  status?: BadgeStatus;
  /** Untuk variant='service' */
  service?: ServiceKey;
  /** Untuk variant='count' — pilih tone kalau mau non-default */
  tone?: 'default' | 'critical' | 'warning' | 'info';
  size?: BadgeSize;
  style_?: BadgeStyle;
  /** Optional pulse animation (dipake buat live indicator) */
  pulse?: boolean;
}

const SIZES: Record<BadgeSize, string> = {
  xs: 'h-[18px] min-w-[18px] px-1.5 text-[10px] font-bold',
  sm: 'h-5 min-w-[20px] px-2 text-[11px] font-semibold',
  md: 'h-6 min-w-[24px] px-2.5 text-xs font-semibold',
};

/* ─── Status variant styles ─── */

const STATUS_SOLID: Record<BadgeStatus, string> = {
  healthy: 'bg-status-healthy text-white',
  warning: 'bg-status-warning text-white',
  critical: 'bg-status-critical text-white',
  info: 'bg-status-info text-white',
  neutral: 'bg-surface-muted text-text-secondary border border-border',
};

const STATUS_SOFT: Record<BadgeStatus, string> = {
  healthy: 'bg-status-healthy/12 text-status-healthy',
  warning: 'bg-status-warning/15 text-status-warning',
  critical: 'bg-status-critical/12 text-status-critical',
  info: 'bg-status-info/12 text-status-info',
  neutral: 'bg-surface-muted text-text-muted',
};

/* ─── Service variant styles ─── */

/**
 * Service styles pakai utility class dynamic.
 * Format: 'bg-{service} / bg-{service}-muted / text-{service}-strong' etc.
 *
 * NOTE: Tailwind HARUS bisa "lihat" class name lengkap di source code
 * untuk di-include ke bundle. Karena itu kita pakai explicit object,
 * bukan template literal dinamis.
 */
const SERVICE_SOLID: Record<ServiceKey, string> = {
  bakabar: 'bg-bakabar text-white',
  balapor: 'bg-balapor text-white',
  badonasi: 'bg-badonasi text-white',
  bakos: 'bg-bakos text-white',
  properti: 'bg-properti text-white',
  kendaraan: 'bg-kendaraan text-white',
  baantar: 'bg-baantar text-white',
  bapasiar: 'bg-bapasiar text-white',
  baronda: 'bg-baronda text-white',
  ppob: 'bg-ppob text-white',
  event: 'bg-event text-white',
  finansial: 'bg-finansial text-white',
  ads: 'bg-ads text-white',
  ticker: 'bg-ticker text-white',
  notifwa: 'bg-notifwa text-white',
  analytics: 'bg-analytics text-white',
  syshealth: 'bg-syshealth text-white',
  trustsafety: 'bg-trustsafety text-white',
  users: 'bg-users text-white',
  roles: 'bg-roles text-white',
};

const SERVICE_SOFT: Record<ServiceKey, string> = {
  bakabar: 'bg-bakabar-muted text-bakabar-strong',
  balapor: 'bg-balapor-muted text-balapor-strong',
  badonasi: 'bg-badonasi-muted text-badonasi-strong',
  bakos: 'bg-bakos-muted text-bakos-strong',
  properti: 'bg-properti-muted text-properti-strong',
  kendaraan: 'bg-kendaraan-muted text-kendaraan-strong',
  baantar: 'bg-baantar-muted text-baantar-strong',
  bapasiar: 'bg-bapasiar-muted text-bapasiar-strong',
  baronda: 'bg-baronda-muted text-baronda-strong',
  ppob: 'bg-ppob-muted text-ppob-strong',
  event: 'bg-event-muted text-event-strong',
  finansial: 'bg-finansial-muted text-finansial-strong',
  ads: 'bg-ads-muted text-ads-strong',
  ticker: 'bg-ticker-muted text-ticker-strong',
  notifwa: 'bg-notifwa-muted text-notifwa-strong',
  analytics: 'bg-analytics-muted text-analytics-strong',
  syshealth: 'bg-syshealth-muted text-syshealth-strong',
  trustsafety: 'bg-trustsafety-muted text-trustsafety-strong',
  users: 'bg-users-muted text-users-strong',
  roles: 'bg-roles-muted text-roles-strong',
};

/* ─── Count variant styles ─── */

const COUNT_TONE: Record<NonNullable<BadgeProps['tone']>, string> = {
  default: 'bg-surface-muted text-text-secondary',
  critical: 'bg-status-critical text-white',
  warning: 'bg-status-warning text-white',
  info: 'bg-status-info text-white',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  {
    variant = 'status',
    status = 'neutral',
    service,
    tone = 'default',
    size = 'sm',
    style_ = 'soft',
    pulse = false,
    className,
    children,
    ...props
  },
  ref
) {
  let variantClasses = '';

  if (variant === 'status') {
    variantClasses =
      style_ === 'solid' ? STATUS_SOLID[status] : STATUS_SOFT[status];
  } else if (variant === 'service' && service) {
    variantClasses =
      style_ === 'solid' ? SERVICE_SOLID[service] : SERVICE_SOFT[service];
  } else if (variant === 'count') {
    variantClasses = COUNT_TONE[tone];
  }

  return (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-1 rounded-full',
        'leading-none whitespace-nowrap select-none tabular-nums',
        SIZES[size],
        variantClasses,
        pulse && 'animate-pulse',
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
});
