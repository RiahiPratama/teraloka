'use client';

/**
 * TeraLoka — SidebarItem
 * Phase 2 · Batch 5b — Layout Shell (Navigation)
 * Batch 6b Update: Added jasa to SERVICE maps (21 services)
 * ------------------------------------------------------------
 * Atom nav — single link di sidebar. Dipakai oleh SidebarGroup
 * dan SidebarBakabarDropdown.
 *
 * Dual encoding:
 * - Service color (identity)  → icon bubble bg-muted + text-service
 * - Active state (current page) → background white/[0.06] + left accent bar
 *
 * Badge (opsional): count / "new" / custom text di kanan
 *
 * Contoh:
 *   <SidebarItem
 *     href="/admin"
 *     icon={<Zap size={15} />}
 *     label="Overview"
 *     sublabel="Dashboard utama"
 *     active
 *   />
 *
 *   <SidebarItem
 *     href="/admin/reports"
 *     service="balapor"
 *     icon={<AlertTriangle size={15} />}
 *     label="BALAPOR"
 *     sublabel="Laporan warga"
 *     badge={{ count: 4, tone: 'critical' }}
 *   />
 */

import Link from 'next/link';
import { type ReactNode, type MouseEvent } from 'react';
import { cn } from '@/lib/utils';
import { type ServiceKey } from '@/components/ui/badge';

export interface SidebarItemBadge {
  count?: number;
  label?: string;
  tone?: 'default' | 'critical' | 'warning' | 'info' | 'healthy';
}

export interface SidebarItemProps {
  href: string;
  icon: ReactNode;
  label: string;
  sublabel?: string;
  /** Service key untuk identity color. Kosong → neutral (Overview, dll) */
  service?: ServiceKey;
  active?: boolean;
  badge?: SidebarItemBadge;
  /** Indent lebih dalam (untuk child di dropdown) */
  nested?: boolean;
  /** Klik callback, mis buat close drawer mobile */
  onNavigate?: () => void;
  /** Disabled — misal coming soon service */
  disabled?: boolean;
  className?: string;
}

/* ─── Service color mapping untuk icon bubble + accent bar ─── */

const SERVICE_ICON_BG: Record<ServiceKey, string> = {
  bakabar: 'bg-bakabar/15 text-bakabar',
  balapor: 'bg-balapor/15 text-balapor',
  badonasi: 'bg-badonasi/15 text-badonasi',
  bakos: 'bg-bakos/15 text-bakos',
  properti: 'bg-properti/15 text-properti',
  kendaraan: 'bg-kendaraan/15 text-kendaraan',
  baantar: 'bg-baantar/15 text-baantar',
  bapasiar: 'bg-bapasiar/15 text-bapasiar',
  baronda: 'bg-baronda/15 text-baronda',
  jasa: 'bg-jasa/15 text-jasa',
  ppob: 'bg-ppob/15 text-ppob',
  event: 'bg-event/15 text-event',
  finansial: 'bg-finansial/15 text-finansial',
  ads: 'bg-ads/15 text-ads',
  ticker: 'bg-ticker/15 text-ticker',
  notifwa: 'bg-notifwa/15 text-notifwa',
  analytics: 'bg-analytics/15 text-analytics',
  syshealth: 'bg-syshealth/15 text-syshealth',
  trustsafety: 'bg-trustsafety/15 text-trustsafety',
  users: 'bg-users/15 text-users',
  roles: 'bg-roles/15 text-roles',
};

const SERVICE_ACCENT_BAR: Record<ServiceKey, string> = {
  bakabar: 'bg-bakabar',
  balapor: 'bg-balapor',
  badonasi: 'bg-badonasi',
  bakos: 'bg-bakos',
  properti: 'bg-properti',
  kendaraan: 'bg-kendaraan',
  baantar: 'bg-baantar',
  bapasiar: 'bg-bapasiar',
  baronda: 'bg-baronda',
  jasa: 'bg-jasa',
  ppob: 'bg-ppob',
  event: 'bg-event',
  finansial: 'bg-finansial',
  ads: 'bg-ads',
  ticker: 'bg-ticker',
  notifwa: 'bg-notifwa',
  analytics: 'bg-analytics',
  syshealth: 'bg-syshealth',
  trustsafety: 'bg-trustsafety',
  users: 'bg-users',
  roles: 'bg-roles',
};

const BADGE_TONE: Record<NonNullable<SidebarItemBadge['tone']>, string> = {
  default: 'bg-white/15 text-white',
  critical: 'bg-status-critical text-white',
  warning: 'bg-status-warning text-white',
  info: 'bg-status-info text-white',
  healthy: 'bg-status-healthy text-white',
};

/* ─── Component ─── */

export function SidebarItem({
  href,
  icon,
  label,
  sublabel,
  service,
  active = false,
  badge,
  nested = false,
  onNavigate,
  disabled = false,
  className,
}: SidebarItemProps) {
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    onNavigate?.();
  };

  const iconBubbleClass = service
    ? SERVICE_ICON_BG[service]
    : 'bg-white/[0.06] text-white/70';

  const accentBarClass = service
    ? SERVICE_ACCENT_BAR[service]
    : 'bg-brand-teal-mint';

  const content = (
    <div
      className={cn(
        'group relative flex items-center gap-2.5 rounded-lg',
        'transition-colors duration-150',
        nested ? 'pl-9 pr-2 py-1.5' : 'px-2 py-[7px]',
        active ? 'bg-white/[0.08]' : 'hover:bg-white/[0.05]',
        disabled && 'opacity-50 cursor-not-allowed',
        !disabled && 'cursor-pointer',
        className
      )}
    >
      {/* Active accent bar — left side */}
      {active && !nested && (
        <span
          aria-hidden="true"
          className={cn(
            'absolute left-0 top-1/2 -translate-y-1/2',
            'h-5 w-[3px] rounded-r-full',
            accentBarClass
          )}
        />
      )}

      {/* Icon bubble */}
      {!nested && (
        <div
          className={cn(
            'flex items-center justify-center shrink-0',
            'h-7 w-7 rounded-md',
            iconBubbleClass,
            'transition-colors duration-150'
          )}
        >
          {icon}
        </div>
      )}
      {nested && (
        <span className="text-white/50 group-hover:text-white/70 shrink-0">
          {icon}
        </span>
      )}

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            'leading-tight truncate',
            nested ? 'text-[12px]' : 'text-[12.5px]',
            active ? 'text-white font-semibold' : 'text-white/85 font-medium'
          )}
        >
          {label}
        </div>
        {sublabel && !nested && (
          <div className="text-[10.5px] text-white/45 mt-0.5 leading-tight truncate">
            {sublabel}
          </div>
        )}
      </div>

      {/* Badge */}
      {badge && (badge.count !== undefined || badge.label) && (
        <span
          className={cn(
            'shrink-0 inline-flex items-center justify-center',
            'text-[10px] font-bold tabular-nums',
            'px-1.5 h-[18px] min-w-[18px] rounded-full',
            BADGE_TONE[badge.tone ?? 'default']
          )}
        >
          {badge.count !== undefined
            ? badge.count > 99
              ? '99+'
              : badge.count
            : badge.label}
        </span>
      )}

      {/* Small active indicator dot saat active (visual accent) */}
      {active && !badge && !nested && (
        <span
          aria-hidden="true"
          className={cn(
            'shrink-0 h-1.5 w-1.5 rounded-full',
            accentBarClass
          )}
        />
      )}
    </div>
  );

  if (disabled) {
    return <div aria-disabled>{content}</div>;
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      className="no-underline block"
      aria-current={active ? 'page' : undefined}
    >
      {content}
    </Link>
  );
}
