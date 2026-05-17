'use client';

/**
 * TeraLoka — AdsSmartFilter (v2 — Sub-Phase 8-E-5)
 * Mission 8 Sub-Phase 8-C-2 → 8-E-5
 * ------------------------------------------------------------
 * SMART filter row untuk Ads Command Center.
 * Pattern mirror dari BALAPOR Sub-Sprint 1C-C-12.
 *
 * Filter dimensions:
 *   1. Status (7 statuses)
 *   2. Advertiser Type (4)
 *   3. Search (text input)
 *   4. Region (10 kabupaten/kota Maluku Utara) — Sub-Phase 8-E-5
 *   5. Date Range (4 preset: all/7d/30d/90d) — Sub-Phase 8-E-5
 *   6. Sort By (4 options) — Sub-Phase 8-E-5
 *
 * Region source: STATIC list 10 kabupaten/kota official Maluku Utara
 * (Permendagri 72/2019, match drizki/geografis dataset).
 *
 * History:
 *   - 16 Mei 2026: v1 NEW (Sub-Phase 8-C-2)
 *   - 17 Mei 2026: v2 (Sub-Phase 8-E-5) — region/date/sort filters
 */

import { useState, useEffect } from 'react';
import { Search, X, SlidersHorizontal, MapPin, Calendar, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Filter type exports ─────────────────────────────────────────

export type AdStatusFilter = 'all' | 'pending_payment' | 'pending_review' | 'active' | 'paused' | 'expired' | 'rejected' | 'deleted';
export type AdvertiserTypeFilter = 'all' | 'umum' | 'politisi' | 'pemerintah' | 'komersial';

// Sub-Phase 8-E-5: 10 kabupaten/kota Maluku Utara (Permendagri 72/2019)
export type AdRegionFilter =
  | 'all'
  | 'kota_ternate'
  | 'kota_tidore'
  | 'hal_utara'
  | 'hal_barat'
  | 'hal_tengah'
  | 'hal_timur'
  | 'hal_selatan'
  | 'sula'
  | 'morotai'
  | 'taliabu';

export type AdDateRangeFilter = 'all' | 'last_7d' | 'last_30d' | 'last_90d';

export type AdSortBy = 'created_desc' | 'ends_asc' | 'impression_desc' | 'name_asc';

// ─── Region mapping (canonical → display label) ─────────────────

export const REGION_OPTIONS: Array<{
  key:   AdRegionFilter;
  label: string;
  /** Canonical strings yang akan di-match dengan ad.target_regions */
  matchValues: string[];
}> = [
  { key: 'all',         label: 'Semua Region',        matchValues: [] },
  { key: 'kota_ternate', label: 'Kota Ternate',        matchValues: ['Kota Ternate', 'Ternate'] },
  { key: 'kota_tidore',  label: 'Kota Tidore',         matchValues: ['Kota Tidore Kepulauan', 'Tidore'] },
  { key: 'hal_utara',    label: 'Halmahera Utara',     matchValues: ['Halmahera Utara'] },
  { key: 'hal_barat',    label: 'Halmahera Barat',     matchValues: ['Halmahera Barat'] },
  { key: 'hal_tengah',   label: 'Halmahera Tengah',    matchValues: ['Halmahera Tengah'] },
  { key: 'hal_timur',    label: 'Halmahera Timur',     matchValues: ['Halmahera Timur'] },
  { key: 'hal_selatan',  label: 'Halmahera Selatan',   matchValues: ['Halmahera Selatan'] },
  { key: 'sula',         label: 'Kepulauan Sula',      matchValues: ['Kepulauan Sula'] },
  { key: 'morotai',      label: 'Pulau Morotai',       matchValues: ['Pulau Morotai'] },
  { key: 'taliabu',      label: 'Pulau Taliabu',       matchValues: ['Pulau Taliabu'] },
];

// ─── Date range mapping ─────────────────────────────────────────

export const DATE_RANGE_OPTIONS: Array<{
  key:   AdDateRangeFilter;
  label: string;
  days:  number | null;
}> = [
  { key: 'all',      label: 'Semua Waktu', days: null },
  { key: 'last_7d',  label: '7 Hari',      days: 7 },
  { key: 'last_30d', label: '30 Hari',     days: 30 },
  { key: 'last_90d', label: '90 Hari',     days: 90 },
];

// ─── Sort mapping ──────────────────────────────────────────────

export const SORT_OPTIONS: Array<{
  key:   AdSortBy;
  label: string;
}> = [
  { key: 'created_desc',     label: 'Terbaru'         },
  { key: 'ends_asc',         label: 'Akan Berakhir'   },
  { key: 'impression_desc',  label: 'Top Impression'  },
  { key: 'name_asc',         label: 'Advertiser A-Z'  },
];

// ─── Component props ────────────────────────────────────────────

export interface AdsSmartFilterProps {
  status:          AdStatusFilter;
  advertiserType:  AdvertiserTypeFilter;
  search:          string;
  /** Sub-Phase 8-E-5 NEW props */
  region:          AdRegionFilter;
  dateRange:       AdDateRangeFilter;
  sortBy:          AdSortBy;

  onStatusChange:         (v: AdStatusFilter)         => void;
  onAdvertiserTypeChange: (v: AdvertiserTypeFilter)   => void;
  onSearchChange:         (v: string)                 => void;
  onRegionChange:         (v: AdRegionFilter)         => void;
  onDateRangeChange:      (v: AdDateRangeFilter)      => void;
  onSortByChange:         (v: AdSortBy)               => void;

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
  region,
  dateRange,
  sortBy,
  onStatusChange,
  onAdvertiserTypeChange,
  onSearchChange,
  onRegionChange,
  onDateRangeChange,
  onSortByChange,
  statusCounts = {},
  typeCounts = {},
  className,
}: AdsSmartFilterProps) {
  // Local search state dengan debounce (300ms)
  const [localSearch, setLocalSearch] = useState(search);

  useEffect(() => {
    const t = setTimeout(() => {
      if (localSearch !== search) onSearchChange(localSearch);
    }, 300);
    return () => clearTimeout(t);
  }, [localSearch, onSearchChange, search]);

  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  const hasActiveFilters =
    status !== 'all' ||
    advertiserType !== 'all' ||
    search.length > 0 ||
    region !== 'all' ||
    dateRange !== 'all' ||
    sortBy !== 'created_desc';

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* ─── Row 1: Search + Filter Header ─── */}
      <div className="flex items-center gap-2 flex-wrap">
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

      {/* ─── Row 4: Sub-Phase 8-E-5 NEW — Region + Date + Sort ─── */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Region Dropdown */}
        <div className="relative">
          <MapPin
            size={12}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
          />
          <select
            value={region}
            onChange={(e) => onRegionChange(e.target.value as AdRegionFilter)}
            className={cn(
              'pl-7 pr-7 py-1.5 rounded-full appearance-none cursor-pointer',
              'bg-surface border text-[11px] font-bold transition-colors',
              region !== 'all'
                ? 'bg-baronda/12 text-baronda border-baronda/30'
                : 'border-border text-text-muted hover:text-text hover:border-text-muted/40'
            )}
            title="Filter by region"
          >
            {REGION_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>{opt.label}</option>
            ))}
          </select>
          <svg
            className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted pointer-events-none"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Date Range Preset Pills */}
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-surface border border-border">
          <Calendar size={12} className="text-text-muted" />
          {DATE_RANGE_OPTIONS.map((opt) => {
            const isActive = dateRange === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => onDateRangeChange(opt.key)}
                className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors',
                  isActive
                    ? 'bg-bakabar/12 text-bakabar'
                    : 'text-text-muted hover:text-text'
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Sort Dropdown */}
        <div className="relative">
          <ArrowUpDown
            size={12}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
          />
          <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value as AdSortBy)}
            className={cn(
              'pl-7 pr-7 py-1.5 rounded-full appearance-none cursor-pointer',
              'bg-surface border text-[11px] font-bold transition-colors',
              sortBy !== 'created_desc'
                ? 'bg-ads/12 text-ads border-ads/30'
                : 'border-border text-text-muted hover:text-text hover:border-text-muted/40'
            )}
            title="Sort by"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>{opt.label}</option>
            ))}
          </select>
          <svg
            className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted pointer-events-none"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* ─── Active filter chips ─── */}
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

          {region !== 'all' && (
            <FilterChip
              label={REGION_OPTIONS.find((f) => f.key === region)?.label ?? region}
              onRemove={() => onRegionChange('all')}
              colorClass="bg-baronda/12 text-baronda border-baronda/30"
            />
          )}

          {dateRange !== 'all' && (
            <FilterChip
              label={DATE_RANGE_OPTIONS.find((f) => f.key === dateRange)?.label ?? dateRange}
              onRemove={() => onDateRangeChange('all')}
              colorClass="bg-bakabar/12 text-bakabar border-bakabar/30"
            />
          )}

          {sortBy !== 'created_desc' && (
            <FilterChip
              label={`Sort: ${SORT_OPTIONS.find((f) => f.key === sortBy)?.label}`}
              onRemove={() => onSortByChange('created_desc')}
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

          <button
            type="button"
            onClick={() => {
              onStatusChange('all');
              onAdvertiserTypeChange('all');
              onRegionChange('all');
              onDateRangeChange('all');
              onSortByChange('created_desc');
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
