'use client';

/**
 * TeraLoka — KPICard
 * Phase 2 · Batch 4a — Domain Components
 * Batch 6b Update: Added jasa to ICON_BG (21 services)
 * ------------------------------------------------------------
 * Kartu KPI untuk dashboard Overview (5 cards atas):
 * Users, Listing, Artikel, Kampanye, Laporan — masing-masing punya
 * service color identity dari globals.css.
 *
 * Features:
 * - Dual encoding: service color (identity) + status dot (kondisi)
 * - Count-up animation saat value naik (smooth, 800ms)
 * - Badge secondary metric (draft/pending count)
 * - Trend indicator (↑/↓/→) dengan percentage
 * - Empty state otomatis saat value === 0
 * - Clickable (navigate ke detail page)
 * - Link via `href` atau `onClick`
 *
 * Contoh:
 *   <KPICard
 *     service="users"
 *     icon={<Users size={20} />}
 *     label="Users"
 *     value={0}
 *     sublabel="Pengguna terdaftar"
 *     href="/admin/users"
 *     emptyMessage="Belum ada user"
 *   />
 *
 *   <KPICard
 *     service="bakabar"
 *     icon={<FileText size={20} />}
 *     label="Artikel"
 *     value={7}
 *     sublabel="BAKABAR"
 *     badge={{ label: '7 draft', tone: 'warning' }}
 *     trend={{ direction: 'up', value: '+2 minggu ini' }}
 *     href="/admin/articles"
 *   />
 */

import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Badge, type ServiceKey } from '@/components/ui/badge';

interface TrendData {
  direction: 'up' | 'down' | 'flat';
  /** Tampilan, e.g. "+12%", "-3", "+2 minggu ini" */
  value: string;
}

interface KPIBadge {
  label: string;
  tone?: 'neutral' | 'info' | 'warning' | 'critical' | 'healthy';
}

export interface KPICardProps {
  /** Service key untuk identity color (bakabar, balapor, users, dll) */
  service: ServiceKey;
  /** Icon dari Lucide */
  icon: ReactNode;
  /** Label utama e.g. "Users", "Artikel" */
  label: string;
  /** Nilai metric utama */
  value: number;
  /** Deskripsi kecil di bawah label */
  sublabel?: string;
  /** Badge secondary — biasanya pending/draft count */
  badge?: KPIBadge;
  /** Trend indicator opsional */
  trend?: TrendData;
  /** Link ke detail page */
  href?: string;
  /** Callback kalau gak pakai href */
  onClick?: () => void;
  /** Label saat value = 0 (empty state) */
  emptyMessage?: string;
  /** Loading skeleton */
  loading?: boolean;
  className?: string;
}

/* ─── Service color class mapping ───
   Tailwind perlu class literal supaya gak di-purge. Pakai explicit object.
*/

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
  jasa: 'bg-jasa-muted text-jasa',
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

const TREND_STYLE: Record<TrendData['direction'], { color: string; arrow: string }> = {
  up: { color: 'text-status-healthy', arrow: '↑' },
  down: { color: 'text-status-critical', arrow: '↓' },
  flat: { color: 'text-text-muted', arrow: '→' },
};

/* ─── Count-up hook ───
   Smooth animation dari 0 ke target value. Pakai requestAnimationFrame
   untuk perf bagus. Kalau value kecil atau sama, langsung set.
*/

function useCountUp(target: number, duration = 800): number {
  const [display, setDisplay] = useState(target);
  const prevTarget = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === prevTarget.current) return;

    // Value kecil (< 10) atau SSR → instant
    if (target < 10) {
      setDisplay(target);
      prevTarget.current = target;
      return;
    }

    const startValue = prevTarget.current;
    const startTime = performance.now();
    const diff = target - startValue;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + diff * eased);
      setDisplay(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        prevTarget.current = target;
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return display;
}

/* ─── Component ─── */

export function KPICard({
  service,
  icon,
  label,
  value,
  sublabel,
  badge,
  trend,
  href,
  onClick,
  emptyMessage,
  loading = false,
  className,
}: KPICardProps) {
  const displayValue = useCountUp(value);
  const isEmpty = !loading && value === 0;
  const isClickable = Boolean(href || onClick);

  const cardContent = (
    <>
      {/* Header: icon + badge */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div
          className={cn(
            'flex items-center justify-center h-11 w-11 rounded-xl shrink-0',
            ICON_BG[service]
          )}
        >
          {icon}
        </div>
        {badge && !loading && (
          <Badge
            variant="status"
            status={badge.tone ?? 'neutral'}
            size="sm"
          >
            {badge.label}
          </Badge>
        )}
      </div>

      {/* Value */}
      <div className="mb-1">
        {loading ? (
          <div className="h-9 w-16 rounded-md bg-surface-muted animate-pulse" />
        ) : isEmpty ? (
          <div className="text-3xl font-bold text-text-subtle tabular-nums">—</div>
        ) : (
          <div className="text-3xl font-bold text-text tabular-nums leading-none">
            {displayValue.toLocaleString('id-ID')}
          </div>
        )}
      </div>

      {/* Label + sublabel */}
      <div className="mb-2">
        <div className="text-sm font-semibold text-text">{label}</div>
        {sublabel && !isEmpty && (
          <div className="text-xs text-text-muted mt-0.5">{sublabel}</div>
        )}
        {isEmpty && emptyMessage && (
          <div className="text-xs text-text-muted mt-0.5">{emptyMessage}</div>
        )}
      </div>

      {/* Trend */}
      {trend && !loading && !isEmpty && (
        <div
          className={cn(
            'flex items-center gap-1 text-xs font-semibold',
            TREND_STYLE[trend.direction].color
          )}
        >
          <span aria-hidden="true">{TREND_STYLE[trend.direction].arrow}</span>
          <span>{trend.value}</span>
        </div>
      )}
    </>
  );

  const baseClasses = cn(
    'relative flex flex-col bg-surface border border-border rounded-xl p-4',
    'transition-colors duration-150',
    isClickable && 'hover:border-border cursor-pointer hover:bg-surface-elevated',
    className
  );

  if (href && !loading) {
    return (
      <Link href={href} className={cn(baseClasses, 'no-underline')}>
        {cardContent}
      </Link>
    );
  }

  if (onClick && !loading) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(baseClasses, 'text-left w-full')}
      >
        {cardContent}
      </button>
    );
  }

  return <div className={baseClasses}>{cardContent}</div>;
}
