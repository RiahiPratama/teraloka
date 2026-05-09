'use client';

/**
 * TeraLoka — ReportRow
 * Phase 2 · Batch 7b1 — Reports Page Migration
 * Updated: 8 Mei 2026 — Sub-Sprint 1C-C-10 civic badge + clickable photo
 * Updated: 9 Mei 2026 — Sub-Sprint 1C-C-13 Phase 1.5 BARU badge (Discovery UX)
 * ------------------------------------------------------------
 * Single report row untuk list tampilan di Overview + Live tabs.
 *
 * 2 variants:
 * - compact → untuk Overview preview (Top 5) — 1 line title + location + time
 * - full    → untuk Live tab — with location, time, unhandled warning, photos count
 *
 * Sub-Sprint 1C-C-10 additions:
 * - Civic feedback badge (compact) saat follow_up_current_status !== null
 * - Clickable photo icon → trigger onPhotoClick callback (open lightbox)
 *
 * Sub-Sprint 1C-C-13 Phase 1.5 additions (Discovery UX):
 * - "BARU" badge untuk laporan < 24h (admin discoverability fix)
 * - Visual cue prominent di group views supaya admin spot new submissions
 *
 * Location display priority (TD-008 fix):
 *   location_name (dari JOIN public.locations) > location (legacy text) > omit
 */

import { Camera, MapPin, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PriorityBadge } from './priority-badge';
import {
  getCategoryConfig,
  getBestLocation,
  getFollowUpConfig,
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
  /**
   * Sub-Sprint 1C-C-10 — Click handler khusus icon foto.
   * Caller pass callback untuk open photo lightbox.
   * Kalau provided + photos > 0, photo icon jadi clickable button.
   */
  onPhotoClick?: (report: Report) => void;
  /**
   * Sub-Sprint 1C-C-11 — Click handler khusus civic feedback badge.
   * Caller pass callback untuk open admin civic timeline modal.
   * Kalau provided + ada civic status, badge jadi clickable button.
   */
  onCivicClick?: (report: Report) => void;
  /** Optional additional className */
  className?: string;
}

/**
 * Compute apakah laporan termasuk "baru" (< 24h dari sekarang).
 * Used untuk Sub-Sprint 1C-C-13 Phase 1.5 BARU badge (Discovery UX).
 */
function isNewReport(createdAt: string): boolean {
  const NEW_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 jam
  try {
    const created = new Date(createdAt).getTime();
    if (isNaN(created)) return false;
    return Date.now() - created < NEW_THRESHOLD_MS;
  } catch {
    return false;
  }
}

export function ReportRow({
  report,
  variant = 'full',
  actionSlot,
  onClick,
  onPhotoClick,
  onCivicClick,
  className,
}: ReportRowProps) {
  const unhandled = isUnhandled(report);
  const isNew = isNewReport(report.created_at);
  const isClickable = Boolean(onClick);
  const categoryConfig = getCategoryConfig(report.category);
  const photoCount = report.photos?.length ?? 0;
  const displayLocation = getBestLocation(report);
  const civicConfig = getFollowUpConfig(report.follow_up_current_status);

  // Photo icon: clickable kalau onPhotoClick provided + ada foto
  const isPhotoClickable = Boolean(onPhotoClick) && photoCount > 0;

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
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Display ID (BL-2026-XXXX) — Sub-Sprint 1C-C-10 */}
          {report.display_id && (
            <span
              className="shrink-0 font-mono text-[10px] text-text-muted tracking-tight"
              title="Nomor laporan publik"
            >
              {report.display_id}
            </span>
          )}

          {/* BARU badge — Sub-Sprint 1C-C-13 Phase 1.5 (Discovery UX) */}
          {isNew && (
            <span
              className={cn(
                'shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full',
                'text-[9px] font-extrabold uppercase tracking-wider',
                'bg-balapor text-white',
                'animate-pulse'
              )}
              title={`Laporan baru — masuk ${timeAgo(report.created_at)}`}
              aria-label="Laporan baru"
            >
              <Sparkles size={9} className="shrink-0" />
              BARU
            </span>
          )}

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
          {/* Sub-Sprint 1C-C-10/11 — Civic feedback badge (clickable kalau onCivicClick provided) */}
          {civicConfig && variant === 'full' && (
            onCivicClick ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCivicClick(report);
                }}
                className={cn(
                  'shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full',
                  'text-[9px] font-bold uppercase tracking-wide border cursor-pointer',
                  'hover:opacity-80 transition-opacity',
                  civicConfig.badgeBg,
                  civicConfig.badgeText,
                  civicConfig.badgeBorder
                )}
                title={`Lihat timeline civic feedback: ${civicConfig.label}`}
                aria-label={`Lihat timeline civic feedback ${report.title}`}
              >
                <span aria-hidden="true">{civicConfig.emoji}</span>
                {civicConfig.compactLabel}
              </button>
            ) : (
              <span
                className={cn(
                  'shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full',
                  'text-[9px] font-bold uppercase tracking-wide border',
                  civicConfig.badgeBg,
                  civicConfig.badgeText,
                  civicConfig.badgeBorder
                )}
                title={`Civic feedback: ${civicConfig.label}`}
              >
                <span aria-hidden="true">{civicConfig.emoji}</span>
                {civicConfig.compactLabel}
              </span>
            )
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
            {displayLocation && (
              <>
                <span className="text-text-subtle" aria-hidden="true">·</span>
                <span className="flex items-center gap-0.5 min-w-0">
                  <MapPin size={10} className="shrink-0" />
                  <span className="truncate">{displayLocation}</span>
                </span>
              </>
            )}
            <span className="text-text-subtle shrink-0" aria-hidden="true">·</span>
            <span className="shrink-0">{timeAgo(report.created_at)}</span>
            {photoCount > 0 && (
              <>
                <span className="text-text-subtle shrink-0" aria-hidden="true">·</span>
                {isPhotoClickable ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPhotoClick?.(report);
                    }}
                    className={cn(
                      'flex items-center gap-0.5 shrink-0 px-1.5 py-0.5 rounded',
                      'text-balapor hover:bg-balapor/10 transition-colors',
                      'font-semibold'
                    )}
                    title={`Lihat ${photoCount} foto bukti`}
                  >
                    <Camera size={10} />
                    {photoCount}
                  </button>
                ) : (
                  <span className="flex items-center gap-0.5 shrink-0">
                    <Camera size={10} />
                    {photoCount}
                  </span>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="text-[10px] text-text-muted mt-0.5 truncate">
            {displayLocation ? `📍 ${displayLocation} · ` : ''}
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
    isNew && 'bg-balapor/[0.04]',  // subtle background highlight untuk row baru
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
