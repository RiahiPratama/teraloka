'use client';

/**
 * TeraLoka — StatusDot
 * Phase 2 · Batch 3c — Feedback & Navigation
 * ------------------------------------------------------------
 * Dot indicator kecil untuk status services / items.
 * Dipakai di: sidebar nav items, service health strip, KPI badge,
 * user online status, live indicator.
 *
 * Sizes: xs (6px) / sm (8px) / md (10px)
 *
 * Status:
 * - healthy   → hijau
 * - warning   → kuning
 * - critical  → merah
 * - info      → biru
 * - neutral   → abu (default)
 * - off       → off state (transparent ring)
 *
 * Animated:
 * - pulse   → pulse opacity (gentle "alive" feel)
 * - ping    → expanding ring animation (alert attention — critical/warning)
 *
 * Contoh:
 *   <StatusDot status="healthy" />
 *   <StatusDot status="critical" animated="ping" />
 *   <StatusDot status="healthy" size="md" label="System Online" />
 *
 * Kalau kasih `label`, output-nya dot + text side by side.
 */

import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type DotStatus = 'healthy' | 'warning' | 'critical' | 'info' | 'neutral' | 'off';
type DotSize = 'xs' | 'sm' | 'md';
type DotAnimation = 'none' | 'pulse' | 'ping';

export interface StatusDotProps extends HTMLAttributes<HTMLSpanElement> {
  status?: DotStatus;
  size?: DotSize;
  animated?: DotAnimation;
  /** Label text — kalau ada, render dot + label berdampingan */
  label?: string;
  /** Untuk screen reader kalau dot standalone tanpa label visual */
  srLabel?: string;
}

const DOT_SIZES: Record<DotSize, string> = {
  xs: 'h-1.5 w-1.5',
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
};

const DOT_COLORS: Record<DotStatus, string> = {
  healthy: 'bg-status-healthy',
  warning: 'bg-status-warning',
  critical: 'bg-status-critical',
  info: 'bg-status-info',
  neutral: 'bg-text-subtle',
  off: 'bg-transparent border border-border',
};

const PING_COLORS: Record<DotStatus, string> = {
  healthy: 'bg-status-healthy',
  warning: 'bg-status-warning',
  critical: 'bg-status-critical',
  info: 'bg-status-info',
  neutral: 'bg-text-subtle',
  off: 'bg-transparent',
};

const LABEL_COLORS: Record<DotStatus, string> = {
  healthy: 'text-status-healthy',
  warning: 'text-status-warning',
  critical: 'text-status-critical',
  info: 'text-status-info',
  neutral: 'text-text-muted',
  off: 'text-text-subtle',
};

export const StatusDot = forwardRef<HTMLSpanElement, StatusDotProps>(
  function StatusDot(
    {
      status = 'neutral',
      size = 'sm',
      animated = 'none',
      label,
      srLabel,
      className,
      ...props
    },
    ref
  ) {
    const dot = (
      <span className="relative inline-flex shrink-0">
        {animated === 'ping' && (
          <span
            aria-hidden="true"
            className={cn(
              'absolute inline-flex h-full w-full rounded-full opacity-75',
              'animate-ping',
              PING_COLORS[status]
            )}
          />
        )}
        <span
          className={cn(
            'relative inline-flex rounded-full',
            DOT_SIZES[size],
            DOT_COLORS[status],
            animated === 'pulse' && 'animate-pulse'
          )}
        />
      </span>
    );

    // Dot standalone
    if (!label) {
      return (
        <span
          ref={ref}
          role="status"
          aria-label={srLabel ?? status}
          className={cn('inline-flex items-center', className)}
          {...props}
        >
          {dot}
        </span>
      );
    }

    // Dot + label
    return (
      <span
        ref={ref}
        role="status"
        className={cn('inline-flex items-center gap-1.5', className)}
        {...props}
      >
        {dot}
        <span
          className={cn(
            'text-xs font-medium leading-none',
            LABEL_COLORS[status]
          )}
        >
          {label}
        </span>
      </span>
    );
  }
);
