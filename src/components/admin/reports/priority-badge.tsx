'use client';

/**
 * TeraLoka — PriorityBadge
 * Phase 2 · Batch 7b1 — Reports Page Migration
 * ------------------------------------------------------------
 * Reusable priority badge untuk reports.
 *
 * Usage:
 *   <PriorityBadge priority="urgent" />            // 🔴 Urgent
 *   <PriorityBadge priority="high" size="xs" />    // smaller
 *   <PriorityBadge priority="normal" showEmoji={false} /> // text only
 *   <PriorityBadge priority="urgent" withDot />    // pakai dot bukan emoji
 *
 * Color mapping (dari PRIORITY_CONFIG):
 * - urgent → status-critical (red)
 * - high   → status-warning (amber)
 * - normal → status-healthy (green)
 */

import { cn } from '@/lib/utils';
import { PRIORITY_CONFIG, type ReportPriority } from '@/types/reports';

type BadgeSize = 'xs' | 'sm' | 'md';

export interface PriorityBadgeProps {
  priority: ReportPriority;
  /** Size variant — default sm */
  size?: BadgeSize;
  /** Tampilkan emoji di depan label. Default true. */
  showEmoji?: boolean;
  /** Pakai dot bulat di depan, bukan emoji. Override showEmoji. */
  withDot?: boolean;
  /** Tampilkan label text. Default true. */
  showLabel?: boolean;
  className?: string;
}

const SIZE_STYLES: Record<BadgeSize, string> = {
  xs: 'px-1.5 py-0.5 text-[10px]',
  sm: 'px-2 py-0.5 text-[11px]',
  md: 'px-2.5 py-1 text-xs',
};

const DOT_SIZE: Record<BadgeSize, string> = {
  xs: 'h-1.5 w-1.5',
  sm: 'h-2 w-2',
  md: 'h-2 w-2',
};

/** Mapping priority → Tailwind class (static, safe untuk purge) */
const PRIORITY_BG_TEXT: Record<ReportPriority, string> = {
  urgent: 'bg-status-critical/12 text-status-critical border-status-critical/25',
  high: 'bg-status-warning/12 text-status-warning border-status-warning/25',
  normal: 'bg-status-healthy/12 text-status-healthy border-status-healthy/25',
};

const PRIORITY_DOT: Record<ReportPriority, string> = {
  urgent: 'bg-status-critical',
  high: 'bg-status-warning',
  normal: 'bg-status-healthy',
};

export function PriorityBadge({
  priority,
  size = 'sm',
  showEmoji = true,
  withDot = false,
  showLabel = true,
  className,
}: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full',
        'font-bold whitespace-nowrap border',
        SIZE_STYLES[size],
        PRIORITY_BG_TEXT[priority],
        className
      )}
    >
      {withDot ? (
        <span className={cn('rounded-full shrink-0', DOT_SIZE[size], PRIORITY_DOT[priority])} />
      ) : showEmoji ? (
        <span className="shrink-0" aria-hidden="true">
          {config.emoji}
        </span>
      ) : null}
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}
