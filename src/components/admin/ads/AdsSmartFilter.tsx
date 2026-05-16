'use client';

/**
 * TeraLoka — AdsSmartFilter
 * Mission 8 Sub-Phase 8-C-2
 * ------------------------------------------------------------
 * SMART filter row untuk Ads Command Center.
 * Pattern mirror dari BALAPOR Sub-Sprint 1C-C-12.
 *
 * Filter dimensions:
 *   1. Status (7 statuses) — pending_payment, pending_review, active, paused,
 *                            expired, rejected, deleted
 *   2. Advertiser Type (4) — umum, politisi, pemerintah, komersial
 *   3. Search (text input) — title/body/advertiser_name
 *
 * Active filter pills muncul di bawah pill rows, click ✕ untuk remove.
 *
 * Filter values dikontrol via parent props (controlled component).
 *
 * History:
 *   - 16 Mei 2026: NEW (Sub-Phase 8-C-2)
 */

import { useState, useEffect } from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AdStatusFilter = 'all' | 'pending_payment' | 'pending_review' | 'active' | 'paused' | 'expired' | 'rejected' | 'deleted';
export type AdvertiserTypeFilter = 'all' | 'umum' | 'politisi' | 'pemerintah' | 'komersial';

export interface AdsSmartFilterProps {
  status:          AdStatusFilter;
  advertiserType:  AdvertiserTypeFilter;
  search:          string;
  onStatusChange:         (v: AdStatusFilter) => void;
  onAdvertiserTypeChange: (v: AdvertiserTypeFilter) => void;
  onSearchChange:         (v: string) => void;
  /** Counts per status, dipakai untuk badge angka di pills */
  statusCounts?:   Partial<Record<AdStatusFilter, number>>;
  /** Counts per advertiser type */
  typeCounts?:     Partial<Record<AdvertiserTypeFilter, number>>;
  className?: string;
}

// ─── Filter definitions ─────────────────────────────────────────

const STATUS_FILTERS: Array<{
  key: AdStatusFilter;
  label: string;
  classes: string;
}> = [
  { key: 'all',             label: 'Semua',          classes: 'data-active:bg-ads/12 data-active:text-ads data-active:border-ads/30' },
  { key: 'active',          label: 'Active',         classes: 'data-active:bg-status-healthy/12 data-active:text-status-healthy data-active:border-status-healthy/30' },
  { key: 'pending_review',  label: 'Review',         classes: 'data-active:bg-status-critical/12 data-active:text-status-critical data-active:border-status-critical/30' },
  { key: 'pending_payment', label: 'Pending Pay',    classes: 'data-active:bg-status-warning/12 data-active:text-status-warning data-active:border-status-warning/30' },
  { key: 'paused',          label: 'Paused',         classes: 'data-active:bg-status-info/12 data-active:text-status-info data-active:border-status-info/30' },
  { key: 'expired',         label: 'Expired',        classes: 'data-active:bg-surface-muted data-active:text-text-muted data-active:border-border' },
  { key: 'rejected',        label: 'Rejected',       classes: 'data-active:bg-balapor/12 data-active:text-balapor data-active:border-balapor/30' },
];

const TYPE_FILTERS: Array<{
  key: AdvertiserTypeFilter;
  label: string;
  emoji?: string;
}> = [
  { key: 'all',         label: 'Semua Tipe' },
  { key: 'umum',        label: 'Umum',        emoji: '🌐' },
  { key: 'politisi',    label: 'Politisi',    emoji: '🏛️' },
  { key: 'pemerintah',  label: 'Pemerintah',  emoji: '🏢' },
  { key: 'komersial',   label: 'Komersial',   emoji: '💼' },
];

// ─── Component ───────────────────────────────────────────────────

export default function AdsSmartFilter({
  status,
  advertiserType,
  search,
  onStatusChange,
  onAdvertiserTypeChange,
  onSearchChange,
  statusCounts = {},
  typeCounts = {},
  className,
}: AdsSmartFilterProps) {
  // Local search state dengan debounce (300ms) supaya gak fire tiap keystroke
  const [localSearch, setLocalSearch] = useState(search);

  useEffect(() => {
    const t = setTimeout(() => {
      if (localSearch !== search) onSearchChange(localSearch);
    }, 300);
    return () => clearTimeout(t);
  }, [localSearch, onSearchChange, search]);

  // Sync external search → local (e.g., reset from parent)
  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  const hasActiveFilters =
    status !== 'all' || advertiserType !== 'all' || search.length > 0;

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* ─── Row 1: Search + Filter Header ─── */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search input */}
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
          />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Cari title / advertiser..."
            className={cn(
              'w-full pl-9 pr-9 py-2 rounded-lg',
              'bg-surface border border-border',
              'text-[12px] text-text placeholder:text-text-subtle',
              'focus:outline-none focus:border-ads/50 focus:ring-2 focus:ring-ads/20',
              'transition-all'
            )}
          />
          {localSearch && (
            <button
              type="button"
              onClick={() => {
                setLocalSearch('');
                onSearchChange('');
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text p-1 rounded"
              title="Bersihkan pencarian"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Filter label */}
        <div className="flex items-center gap-1.5 text-text-muted text-[11px] font-bold uppercase tracking-wide">
          <SlidersHorizontal size={12} />
          Filter
        </div>
      </div>

      {/* ─── Row 2: Status pills ─── */}
      <div className="flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((f) => {
          const isActive = status === f.key;
          const count = statusCounts[f.key];
          return (
            <button
              key={f.key}
              type="button"
              data-active={isActive || undefined}
              onClick={() => onStatusChange(f.key)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full',
                'text-[11px] font-bold border transition-colors',
                isActive
                  ? 'bg-surface border-transparent'
                  : 'bg-surface border-border text-text-muted hover:text-text hover:border-text-muted/40',
                f.classes
              )}
            >
              <span>{f.label}</span>
              {typeof count === 'number' && count > 0 && (
                <span
                  className={cn(
                    'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-extrabold tabular-nums',
                    isActive ? 'bg-white/20' : 'bg-surface-muted'
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── Row 3: Advertiser Type pills ─── */}
      <div className="flex flex-wrap gap-1.5">
        {TYPE_FILTERS.map((f) => {
          const isActive = advertiserType === f.key;
          const count = typeCounts[f.key];
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => onAdvertiserTypeChange(f.key)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full',
                'text-[11px] font-bold border transition-colors',
                isActive
                  ? 'bg-ads/12 text-ads border-ads/30'
                  : 'bg-surface border-border text-text-muted hover:text-text hover:border-text-muted/40'
              )}
            >
              {f.emoji && <span className="text-[12px]" aria-hidden>{f.emoji}</span>}
              <span>{f.label}</span>
              {typeof count === 'number' && count > 0 && (
                <span
                  className={cn(
                    'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-extrabold tabular-nums',
                    isActive ? 'bg-ads/20' : 'bg-surface-muted'
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── Active filter chips (visible kalau ada filter aktif) ─── */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
            Filter aktif:
          </span>

          {status !== 'all' && (
            <FilterChip
              label={STATUS_FILTERS.find((f) => f.key === status)?.label ?? status}
              onRemove={() => onStatusChange('all')}
              colorClass="bg-ads/12 text-ads border-ads/30"
            />
          )}

          {advertiserType !== 'all' && (
            <FilterChip
              label={TYPE_FILTERS.find((f) => f.key === advertiserType)?.label ?? advertiserType}
              onRemove={() => onAdvertiserTypeChange('all')}
              colorClass="bg-ads/12 text-ads border-ads/30"
            />
          )}

          {search.length > 0 && (
            <FilterChip
              label={`"${search}"`}
              onRemove={() => {
                setLocalSearch('');
                onSearchChange('');
              }}
              colorClass="bg-bakabar/12 text-bakabar border-bakabar/30"
            />
          )}

          {/* Clear all */}
          <button
            type="button"
            onClick={() => {
              onStatusChange('all');
              onAdvertiserTypeChange('all');
              setLocalSearch('');
              onSearchChange('');
            }}
            className="text-[10px] font-bold uppercase tracking-wide text-text-muted hover:text-status-critical transition-colors px-2 py-1"
          >
            Bersihkan semua
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Internal subcomponent: FilterChip ──────────────────────────

function FilterChip({
  label,
  onRemove,
  colorClass,
}: {
  label: string;
  onRemove: () => void;
  colorClass: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full',
        'text-[10px] font-bold border',
        colorClass
      )}
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        title="Hapus filter"
      >
        <X size={10} />
      </button>
    </span>
  );
}
