'use client';

/**
 * TeraLoka — ArticleFilters
 * Phase 2 · Batch 7e2 — Content Panel Tab 1 Complete
 * ------------------------------------------------------------
 * Filter bar untuk Manajemen Artikel section.
 *
 * Controls:
 * - Search input (debounced 300ms oleh parent)
 * - Status select (All | Draft | Review | Published | Archived)
 * - Period select (All | 7d | 30d | 90d)
 *
 * Design: responsive — desktop horizontal row, mobile stacked.
 *
 * Note: Search value/onChange adalah controlled. Parent yang handle
 * debounce via useDebounce hook (atau similar).
 */

import { useEffect, useState } from 'react';
import { SearchInput } from '@/components/ui/search-input';
import { Select } from '@/components/ui/select';
import type { ArticleStatus, StatsPeriod } from '@/types/articles';

interface ArticleFiltersProps {
  /** Search input value (controlled) */
  searchValue: string;
  onSearchChange: (value: string) => void;
  /** Status filter ('' = all) */
  statusValue: ArticleStatus | '';
  onStatusChange: (value: ArticleStatus | '') => void;
  /** Period filter */
  periodValue: StatsPeriod;
  onPeriodChange: (value: StatsPeriod) => void;
  /** Optional: active filter count untuk clear-all button */
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
}

export function ArticleFilters({
  searchValue,
  onSearchChange,
  statusValue,
  onStatusChange,
  periodValue,
  onPeriodChange,
  hasActiveFilters = false,
  onClearFilters,
}: ArticleFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
      {/* Search — grow */}
      <div className="flex-1 min-w-0">
        <SearchInput
          value={searchValue}
          onChange={onSearchChange}
          placeholder="Cari judul atau slug..."
          searchSize="sm"
        />
      </div>

      {/* Status select */}
      <div className="w-full sm:w-[140px] shrink-0">
        <Select
          value={statusValue}
          onChange={(e) => onStatusChange(e.target.value as ArticleStatus | '')}
          selectSize="sm"
        >
          <option value="">Semua Status</option>
          <option value="draft">Draft</option>
          <option value="review">Review</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </Select>
      </div>

      {/* Period select */}
      <div className="w-full sm:w-[140px] shrink-0">
        <Select
          value={periodValue}
          onChange={(e) => onPeriodChange(e.target.value as StatsPeriod)}
          selectSize="sm"
        >
          <option value="all">Semua Waktu</option>
          <option value="7d">7 Hari</option>
          <option value="30d">30 Hari</option>
          <option value="90d">90 Hari</option>
        </Select>
      </div>

      {/* Clear filters button */}
      {hasActiveFilters && onClearFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          className="text-xs font-semibold text-text-muted hover:text-text underline-offset-2 hover:underline whitespace-nowrap px-2"
        >
          Clear filter
        </button>
      )}
    </div>
  );
}

/**
 * Hook helper — debounce hook untuk search input.
 * Copy dari legacy Contentpage pattern.
 *
 * Usage:
 *   const [searchInput, setSearchInput] = useState('');
 *   const search = useDebounce(searchInput, 300);
 *   // pakai `search` untuk fetch, `searchInput` untuk controlled input
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const h = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(h);
  }, [value, delay]);
  return debounced;
}
