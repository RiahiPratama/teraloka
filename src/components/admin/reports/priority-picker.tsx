'use client';

/**
 * TeraLoka — PriorityPicker
 * Phase 2 · Batch 7b2 — Reports Map
 * ------------------------------------------------------------
 * Quick-change priority via 3 circle buttons (urgent/high/normal).
 *
 * Active button highlighted dengan priority color. Click non-active
 * triggers `onChange` callback dengan new priority.
 *
 * Design:
 * - Size: compact (used inline di ReportRow)
 * - Emoji sebagai visual identifier (🔴🟠🟢)
 * - Tooltip on hover: "Set [priority]"
 * - Disabled saat loading (prevent double-submit)
 *
 * Usage:
 *   <PriorityPicker
 *     currentPriority={report.priority}
 *     onChange={(newPriority) => updatePriority(report.id, newPriority)}
 *     loading={isUpdating}
 *   />
 */

import { cn } from '@/lib/utils';
import { PRIORITY_CONFIG, PRIORITY_ORDER, type ReportPriority } from '@/types/reports';

export interface PriorityPickerProps {
  /** Priority saat ini — button ini akan non-clickable */
  currentPriority: ReportPriority;
  /** Callback saat user pilih priority baru (beda dari current) */
  onChange: (newPriority: ReportPriority) => void;
  /** Loading state — disable semua buttons */
  loading?: boolean;
  /** Size variant */
  size?: 'sm' | 'md';
  className?: string;
}

const SIZE_STYLES: Record<'sm' | 'md', string> = {
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-7 w-7 text-[12px]',
};

const PRIORITY_BORDER: Record<ReportPriority, string> = {
  urgent: 'border-status-critical',
  high: 'border-status-warning',
  normal: 'border-status-healthy',
};

const PRIORITY_BG_ACTIVE: Record<ReportPriority, string> = {
  urgent: 'bg-status-critical/20',
  high: 'bg-status-warning/20',
  normal: 'bg-status-healthy/20',
};

export function PriorityPicker({
  currentPriority,
  onChange,
  loading = false,
  size = 'sm',
  className,
}: PriorityPickerProps) {
  return (
    <div
      className={cn('flex items-center gap-1', className)}
      role="radiogroup"
      aria-label="Ubah prioritas laporan"
    >
      {PRIORITY_ORDER.map((p) => {
        const isActive = currentPriority === p;
        const config = PRIORITY_CONFIG[p];
        const disabled = isActive || loading;

        return (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={disabled}
            onClick={() => !disabled && onChange(p)}
            title={isActive ? `Saat ini: ${config.label}` : `Ubah ke ${config.label}`}
            className={cn(
              'flex items-center justify-center rounded-full border-2',
              'transition-all duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/30',
              SIZE_STYLES[size],
              isActive
                ? cn(PRIORITY_BORDER[p], PRIORITY_BG_ACTIVE[p], 'cursor-default')
                : 'border-border bg-surface hover:border-text-muted hover:scale-110',
              loading && !isActive && 'opacity-40 cursor-not-allowed hover:scale-100'
            )}
          >
            <span aria-hidden="true">{config.emoji}</span>
            <span className="sr-only">{config.label}</span>
          </button>
        );
      })}
    </div>
  );
}
