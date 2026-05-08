'use client';

/**
 * TeraLoka — ReportGroupList
 * Phase 2 · Batch 7b2 — Reports Map
 * Updated: 8 Mei 2026 — Sub-Sprint 1C-C-10 onPhotoClick forwarding
 * ------------------------------------------------------------
 * List laporan grouped by kategori. Used di Live Incidents tab.
 *
 * Structure:
 * - Group per category (collapsible? No — flat expanded, max 3 preview per group)
 * - Header: category icon + label + count badge
 * - Rows: priority dot + title + unhandled warning + location + time + priority badge
 *         + inline priority picker (3 buttons untuk quick change)
 * - "X lainnya" footer kalau > 3 items
 *
 * Groups sorted by count desc (kategori paling rame di atas).
 * Inside each group, sorted by priority (urgent > high > normal).
 *
 * Priority picker calls parent's `onChangePriority` — parent handle API.
 */

import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';
import { CheckCircle2, Trash2, XCircle } from 'lucide-react';
import { ReportRow } from './report-row';
import { PriorityPicker } from './priority-picker';
import {
  getCategoryConfig,
  groupByCategory,
  sortReportsByPriority,
  type Report,
  type ReportPriority,
} from '@/types/reports';

export interface ReportGroupListProps {
  reports: Report[];
  /** Callback saat user ubah priority lewat picker */
  onChangePriority: (report: Report, newPriority: ReportPriority) => void;
  /** Callback verify laporan (Sub-Sprint 1C-C-4) */
  onVerify?: (report: Report) => void;
  /** Callback reject laporan (Sub-Sprint 1C-C-4) */
  onReject?: (report: Report) => void;
  /** Callback saat user click Hapus button (Sub-Sprint 1C-C-3) */
  onRequestDelete?: (report: Report) => void;
  /** Callback saat user click "+X lainnya" footer (Sub-Sprint 1C-C-4 visibility fix) */
  onShowAllCategory?: (category: string) => void;
  /**
   * Sub-Sprint 1C-C-10 — Photo lightbox trigger callback.
   * Forwarded ke ReportRow internal — opens lightbox saat user click photo icon.
   */
  onPhotoClick?: (report: Report) => void;
  /** ID + action suffix (e.g. "${id}priority") yang lagi loading */
  actionLoadingId?: string | null;
  /** Max items preview per group. Default 3. */
  previewPerGroup?: number;
  /** Filter state untuk empty state message */
  hasFilter?: boolean;
  /** Reset filter callback untuk empty state action */
  onResetFilter?: () => void;
  className?: string;
}

export function ReportGroupList({
  reports,
  onChangePriority,
  onVerify,
  onReject,
  onRequestDelete,
  onShowAllCategory,
  onPhotoClick,
  actionLoadingId,
  previewPerGroup = 3,
  hasFilter = false,
  onResetFilter,
  className,
}: ReportGroupListProps) {
  const groups = groupByCategory(reports);
  const sortedGroups = Object.entries(groups).sort((a, b) => b[1].length - a[1].length);

  if (reports.length === 0) {
    return (
      <div className={cn('bg-surface border border-border rounded-xl py-10 px-6', className)}>
        <EmptyState
          icon={<CheckCircle2 size={32} />}
          title="Semua beres!"
          description={
            hasFilter
              ? 'Tidak ada laporan dengan filter ini.'
              : 'Belum ada laporan masuk. Enjoy the peace.'
          }
          variant="muted"
          tone="healthy"
          size="sm"
          action={
            hasFilter && onResetFilter
              ? { label: 'Reset filter', onClick: onResetFilter }
              : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {sortedGroups.map(([category, items]) => {
        const config = getCategoryConfig(category);
        const sortedItems = sortReportsByPriority(items);
        const topPriority = sortedItems[0]?.priority ?? 'normal';
        const preview = sortedItems.slice(0, previewPerGroup);
        const remaining = items.length - preview.length;

        return (
          <div
            key={category}
            className="bg-surface border border-border rounded-xl overflow-hidden"
          >
            {/* Group header */}
            <div
              className={cn(
                'flex items-center gap-3 px-4 py-3',
                'border-b border-border',
                topPriority === 'urgent' && 'bg-status-critical/5',
                topPriority === 'high' && 'bg-status-warning/5',
                topPriority === 'normal' && 'bg-status-healthy/5'
              )}
            >
              <span
                className={cn(
                  'h-2.5 w-2.5 rounded-full shrink-0',
                  topPriority === 'urgent' && 'bg-status-critical',
                  topPriority === 'high' && 'bg-status-warning',
                  topPriority === 'normal' && 'bg-status-healthy'
                )}
                aria-hidden="true"
              />
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <span className="shrink-0" aria-hidden="true">
                  {config.emoji}
                </span>
                <span className="text-sm font-bold text-text capitalize">
                  {category}
                </span>
              </div>
              <span
                className={cn(
                  'shrink-0 px-2 py-0.5 rounded-full',
                  'text-[11px] font-bold',
                  topPriority === 'urgent' && 'bg-status-critical/12 text-status-critical',
                  topPriority === 'high' && 'bg-status-warning/12 text-status-warning',
                  topPriority === 'normal' && 'bg-status-healthy/12 text-status-healthy'
                )}
              >
                {items.length} laporan
              </span>
            </div>

            {/* Preview rows */}
            {preview.map((r) => {
              const isLoading = actionLoadingId === `${r.id}priority`;
              const isVerifying = actionLoadingId === `${r.id}verify`;
              const isRejecting = actionLoadingId === `${r.id}reject`;
              const canModerate = r.status === 'pending' || r.status === 'reviewing';
              return (
                <ReportRow
                  key={r.id}
                  report={r}
                  variant="full"
                  onPhotoClick={onPhotoClick}
                  actionSlot={
                    <div className="flex items-center gap-1.5">
                      <PriorityPicker
                        currentPriority={r.priority}
                        onChange={(newP) => onChangePriority(r, newP)}
                        loading={isLoading}
                        size="sm"
                      />
                      {canModerate && onVerify && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onVerify(r);
                          }}
                          disabled={isVerifying}
                          className={cn(
                            'h-6 w-6 rounded-md flex items-center justify-center',
                            'text-text-muted hover:text-status-healthy hover:bg-status-healthy/10',
                            'transition-colors disabled:opacity-50',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-healthy/30'
                          )}
                          title="Verify laporan"
                          aria-label={`Verify ${r.title}`}
                        >
                          <CheckCircle2 size={12} />
                        </button>
                      )}
                      {canModerate && onReject && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onReject(r);
                          }}
                          disabled={isRejecting}
                          className={cn(
                            'h-6 w-6 rounded-md flex items-center justify-center',
                            'text-text-muted hover:text-status-warning hover:bg-status-warning/10',
                            'transition-colors disabled:opacity-50',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-warning/30'
                          )}
                          title="Reject laporan"
                          aria-label={`Reject ${r.title}`}
                        >
                          <XCircle size={12} />
                        </button>
                      )}
                      {onRequestDelete && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRequestDelete(r);
                          }}
                          className={cn(
                            'h-6 w-6 rounded-md flex items-center justify-center',
                            'text-text-muted hover:text-status-critical hover:bg-status-critical/10',
                            'transition-colors',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-critical/30'
                          )}
                          title="Hapus laporan"
                          aria-label={`Hapus laporan ${r.title}`}
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  }
                />
              );
            })}

            {/* "X lainnya" footer — clickable untuk expand category (Sub-Sprint 1C-C-4) */}
            {remaining > 0 && (
              onShowAllCategory ? (
                <button
                  type="button"
                  onClick={() => onShowAllCategory(category)}
                  className={cn(
                    'flex items-center justify-center w-full px-4 py-2.5',
                    'border-t border-border bg-surface-muted/40',
                    'text-[11px] font-semibold text-balapor',
                    'hover:bg-balapor/8 transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-balapor/30'
                  )}
                  title={`Filter ke kategori ${config.label} untuk lihat semua`}
                >
                  +{remaining} laporan lainnya — Lihat Semua →
                </button>
              ) : (
                <div className="flex items-center justify-center px-4 py-2 border-t border-border bg-surface-muted/40">
                  <span className="text-[11px] font-semibold text-text-muted">
                    +{remaining} laporan lainnya di kategori ini
                  </span>
                </div>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}
