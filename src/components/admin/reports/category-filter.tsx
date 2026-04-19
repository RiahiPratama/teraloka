'use client';

/**
 * TeraLoka — CategoryFilter
 * Phase 2 · Batch 7b1 — Reports Page Migration
 * ------------------------------------------------------------
 * Pills filter untuk kategori laporan. 8 kategori + "Semua".
 *
 * Design:
 * - Horizontal scroll di mobile, wrap di desktop
 * - Active state: balapor bg + white text
 * - Inactive: surface + border + muted text
 *
 * Usage:
 *   <CategoryFilter
 *     value={categoryFilter}
 *     onChange={setCategoryFilter}
 *   />
 */

import { cn } from '@/lib/utils';
import { CATEGORY_FILTER_OPTIONS } from '@/types/reports';

export interface CategoryFilterProps {
  /** Current value — '' untuk "Semua" */
  value: string;
  onChange: (value: string) => void;
  /** Optional className untuk container */
  className?: string;
}

export function CategoryFilter({ value, onChange, className }: CategoryFilterProps) {
  return (
    <div
      className={cn(
        'flex gap-1.5 flex-wrap',
        className
      )}
      role="tablist"
      aria-label="Filter kategori laporan"
    >
      {CATEGORY_FILTER_OPTIONS.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value || 'all'}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(opt.value)}
            className={cn(
              'inline-flex items-center gap-1.5',
              'px-3 py-1.5 rounded-full',
              'text-[11px] font-semibold whitespace-nowrap',
              'border transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/20',
              isActive
                ? 'bg-balapor text-white border-balapor shadow-sm'
                : 'bg-surface text-text-secondary border-border hover:bg-surface-muted hover:text-text'
            )}
          >
            <span className="shrink-0" aria-hidden="true">
              {opt.emoji}
            </span>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
