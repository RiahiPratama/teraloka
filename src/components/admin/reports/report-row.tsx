'use client';

/**
 * TeraLoka — ReportRow
 * Phase 2 · Batch 7b1 — Reports Page Migration
 * ------------------------------------------------------------
 * Single report row untuk list tampilan di Overview + Live tabs.
 *
 * 2 variants:
 * - compact → untuk Overview preview (Top 5) — 1 line title + location + time
 * - full    → untuk Live tab — with location, time, unhandled warning, photos count
 *
 * Priority picker (3 tombol quick-change) akan di-tambah di Batch 7b2
 * via `actionSlot` prop (render prop pattern).
 */

import { Camera, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PriorityBadge } from './priority-badge';
import {
  getCategoryConfig,
  isUnhandled,
  timeAgo,
  type Report,
} from '@/types/reports';
import type { ReactNode } from 'react';

export interface ReportRowProps {
  report: Report;
  /** Layout variant — default 'full' */
  variant?: 'compact' | 'full';
  /** Action slot untuk render priority picker dll (dipakai di Batch 7b2) */
  actionSlot?: ReactNode;
  /** Optional click handler — buka detail view */
  onClick?: (report: Report) => void;
  /** Optional additional className */
  className?: string;
}

export function ReportRow({
  report,
  variant = 'full',
  actionSlot,
  onClick,
  className,
}: ReportRowProps) {
  const unhandled = isUnhandled(report);
  const isClickable = Boolean(onClick);
  const categoryConfig = getCategoryConfig(report.category);
  const photoCount = report.photos?.length ?? 0;

  const content = (
    <>
      {/* Priority dot (indicator di paling kiri) */}
      <div
        className={cn(
          'shrink-0 rounded-full',
          variant === 'compact' ? 'h-2 w-2' : 'h-2.5 w-2.5',
          report.priority === 'urgent' && 'bg-status-critical',
          report.priority === 'high' && 'bg-status-warning',
          report.priority === 'normal' && 'bg-status-healthy'
        )}
        aria-hidden="true"
      />

      {/* Title + meta */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              'font-bold text-text truncate',
              variant === 'compact' ? 'text-[12px]' : 'text-[13px]'
            )}
          >
            {report.title}
          </span>
          {unhandled && (
            <span
              className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide bg-status-critical/12 text-status-critical"
              title="Pending > 2 jam"
            >
              ⚠ Pending
            </span>
          )}
        </div>

        {variant === 'full' ? (
          <div className="flex items-center gap-2 mt-1 text-[11px] text-text-muted">
            <span className="flex items-center gap-1">
              <span aria-hidden="true">{categoryConfig.emoji}</span>
              <span className="capitalize">
                {report.category || 'lainnya'}
              </span>
            </span>
            {report.location && (
              <>
                <span className="text-text-subtle" aria-hidden="true">·</span>
                <span className="flex items-center gap-0.5 min-w-0">
                  <MapPin size={10} className="shrink-0" />
                  <span className="truncate">{report.location}</span>
                </span>
              </>
            )}
            <span className="text-text-subtle shrink-0" aria-hidden="true">·</span>
            <span className="shrink-0">{timeAgo(report.created_at)}</span>
            {photoCount > 0 && (
              <>
                <span className="text-text-subtle shrink-0" aria-hidden="true">·</span>
                <span className="flex items-center gap-0.5 shrink-0">
                  <Camera size={10} />
                  {photoCount}
                </span>
              </>
            )}
          </div>
        ) : (
          <div className="text-[10px] text-text-muted mt-0.5 truncate">
            {report.location ? `📍 ${report.location} · ` : ''}
            {timeAgo(report.created_at)}
          </div>
        )}
      </div>

      {/* Priority badge */}
      <div className="shrink-0">
        <PriorityBadge
          priority={report.priority}
          size={variant === 'compact' ? 'xs' : 'sm'}
        />
      </div>

      {/* Optional action slot */}
      {actionSlot && <div className="shrink-0">{actionSlot}</div>}
    </>
  );

  const baseClasses = cn(
    'flex items-center gap-3 px-4 py-3',
    'border-b border-border last:border-b-0',
    'transition-colors',
    unhandled && 'bg-status-critical/[0.02]',
    isClickable && 'cursor-pointer hover:bg-surface-muted/40',
    className
  );

  if (isClickable) {
    return (
      <button
        type="button"
        onClick={() => onClick?.(report)}
        className={cn(baseClasses, 'w-full text-left')}
      >
        {content}
      </button>
    );
  }

  return <div className={baseClasses}>{content}</div>;
}
