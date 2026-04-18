'use client';

/**
 * TeraLoka — HeaderBar
 * Phase 2 · Batch 5c — Layout Shell (Header)
 * ------------------------------------------------------------
 * Top bar admin layout. Sticky, full-width main area.
 *
 * Items (kiri → kanan):
 * - Hamburger menu (mobile only)
 * - Date label Indonesia ("Sabtu, 18 April 2026")
 * - Optional page title (kalau parent route pass)
 * - Actions slot (spacer)
 * - ThemeToggle (pill)
 * - API Live indicator (pulse dot)
 *
 * Contoh:
 *   <HeaderBar onMenuClick={openDrawer} />
 *
 *   // Dengan title page-specific
 *   <HeaderBar
 *     title="Users Management"
 *     onMenuClick={openDrawer}
 *     actions={<Button>Export CSV</Button>}
 *   />
 */

import { Menu } from 'lucide-react';
import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { StatusDot } from '@/components/ui/status-dot';

export interface HeaderBarProps {
  onMenuClick?: () => void;
  /** Title opsional (kalau parent route set) */
  title?: string;
  /** Custom actions slot sebelum theme toggle */
  actions?: ReactNode;
  /** Status API ("Live", "Offline", "Degraded") */
  apiStatus?: 'live' | 'degraded' | 'offline';
  /** Tampilkan theme toggle */
  showThemeToggle?: boolean;
  className?: string;
}

/* ─── Format date Indonesia ─── */

function formatToday(): string {
  return new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/* ─── API status mapping ─── */

const API_STATUS_MAP: Record<
  NonNullable<HeaderBarProps['apiStatus']>,
  { label: string; dot: 'healthy' | 'warning' | 'critical'; ring: string }
> = {
  live: {
    label: 'API Live',
    dot: 'healthy',
    ring: 'border-status-healthy/30 bg-status-healthy/8 text-status-healthy',
  },
  degraded: {
    label: 'API Degraded',
    dot: 'warning',
    ring: 'border-status-warning/30 bg-status-warning/8 text-status-warning',
  },
  offline: {
    label: 'API Offline',
    dot: 'critical',
    ring: 'border-status-critical/30 bg-status-critical/8 text-status-critical',
  },
};

/* ─── Component ─── */

export function HeaderBar({
  onMenuClick,
  title,
  actions,
  apiStatus = 'live',
  showThemeToggle = true,
  className,
}: HeaderBarProps) {
  const status = API_STATUS_MAP[apiStatus];

  return (
    <header
      className={cn(
        'sticky top-0 z-30',
        'h-14 px-4 md:px-5',
        'bg-surface border-b border-border',
        'flex items-center gap-3',
        className
      )}
    >
      {/* Mobile hamburger */}
      {onMenuClick && (
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Buka menu"
          className={cn(
            'md:hidden inline-flex items-center justify-center shrink-0',
            'h-9 w-9 rounded-lg',
            'text-text-muted hover:text-text hover:bg-surface-muted',
            'transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal'
          )}
        >
          <Menu size={18} />
        </button>
      )}

      {/* Title + date */}
      <div className="flex-1 min-w-0 flex items-center gap-3">
        {title && (
          <h1 className="text-sm font-bold text-text truncate">{title}</h1>
        )}
        {title && (
          <span className="hidden md:inline-block text-text-subtle">·</span>
        )}
        <span className="hidden sm:inline-block text-xs text-text-muted truncate">
          {formatToday()}
        </span>
      </div>

      {/* Page-specific actions */}
      {actions && <div className="flex items-center gap-2">{actions}</div>}

      {/* Theme toggle */}
      {showThemeToggle && <ThemeToggle variant="pill" size="sm" />}

      {/* API status pill */}
      <div
        className={cn(
          'hidden sm:inline-flex items-center gap-1.5 shrink-0',
          'px-2.5 py-1 rounded-full border',
          'text-[11px] font-semibold',
          status.ring
        )}
        role="status"
        aria-label={status.label}
      >
        <StatusDot
          status={status.dot}
          size="xs"
          animated={apiStatus === 'offline' ? 'ping' : 'pulse'}
          srLabel={status.label}
        />
        <span>{status.label}</span>
      </div>
    </header>
  );
}
