'use client';

/**
 * TeraLoka — LocationAutocomplete
 * SESI 5A SUB-BATCH GEO (18 Mei 2026)
 * ────────────────────────────────────────────────────────────────────
 * Slim autocomplete untuk pick lokasi by NAME (text string output).
 *
 * Sister component dari GeographicScopePicker dengan use case berbeda:
 *   - GeographicScopePicker → controlled LocationScope { type, id } untuk
 *     forms yang link ke locations table via FK (e.g. BALAPOR /lapor)
 *   - LocationAutocomplete  → text string output untuk forms yang store
 *     location sebagai TEXT (e.g. advertiser_accounts.business_kabupaten)
 *
 * REUSE: useLocationSearch hook (debounce 300ms + AbortController + min 2 chars)
 *
 * USAGE:
 *   import { LocationAutocomplete } from '@/components/shared/locations';
 *
 *   <LocationAutocomplete
 *     value={form.business_kabupaten}
 *     onChange={(v) => setField('business_kabupaten', v)}
 *     placeholder="Cari kabupaten / kota..."
 *   />
 *
 * History:
 *   - v1 (18 Mei initial): basic autocomplete
 *   - v2 (18 Mei UX fix):  + Hierarchy sort (provinsi→kota→kabupaten→
 *                          kecamatan→kelurahan→desa) + exact match boost.
 *                          Fix backend return order yang chaotic.
 *
 * Sort priority:
 *   1. Exact name match (case-insensitive) — goes to TOP
 *   2. Location type hierarchy (broader first)
 *   3. Alphabetical (Indonesian collation)
 *
 * Features:
 *   - Optional type filter (single LocationType)
 *   - Show type badge di dropdown
 *   - Free text fallback (lokasi gak ada di DB tetap bisa save)
 *   - Outside click close dropdown
 *   - Loading spinner during fetch
 *   - Clear button (X) untuk reset
 *
 * Future enhancement (defer):
 *   - Multi-type filter (e.g. ['kabupaten', 'kota'] explicit set)
 *   - Grouped sections by type ("🏙️ Kota" / "📍 Kecamatan")
 *   - Recent locations cache
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { MapPin, X, Loader2, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocationSearch } from './use-locations';
import {
  type LocationType,
  type Location,
  LOCATION_TYPE_LABEL,
} from './locations-types';

// ─── Hierarchy Priority ─────────────────────────────────────────
// Lower number = higher in dropdown.
// Tier 1: Provinsi (paling broad)
// Tier 2: Kota & Kabupaten (paling sering dicari untuk business address)
// Tier 3: Kecamatan
// Tier 4: Kelurahan & Desa (paling granular)

const TYPE_PRIORITY: Record<LocationType, number> = {
  provinsi:  0,
  kota:      1,
  kabupaten: 2,
  kecamatan: 3,
  kelurahan: 4,
  desa:      5,
};

export interface LocationAutocompleteProps {
  /** Current value (text string, e.g. "Ternate") */
  value: string;

  /** Called when user selects suggestion OR types free text */
  onChange: (name: string) => void;

  /** Optional filter by location type (single) */
  type?: LocationType;

  /** Placeholder text */
  placeholder?: string;

  /** Disabled state */
  disabled?: boolean;

  /** Allow free text save (default true) — kalau false, hanya bisa pick dari dropdown */
  allowFreeText?: boolean;
}

export default function LocationAutocomplete({
  value,
  onChange,
  type,
  placeholder,
  disabled,
  allowFreeText = true,
}: LocationAutocompleteProps) {
  const [searchTerm, setSearchTerm] = useState(value);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external value changes (e.g. edit mode pre-fill)
  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  // ─── Existing hook: debounce 300ms + AbortController + min 2 chars ───
  const { data: results, loading, error } = useLocationSearch(searchTerm, type, 10);

  // ─── Sort: exact match → type priority → alphabetical ──────────
  const sortedOptions = useMemo<Location[]>(() => {
    if (!results || results.length === 0) return [];

    const term = searchTerm.toLowerCase().trim();

    return results.slice().sort((a, b) => {
      // 1. Exact name match goes to TOP
      const aExact = a.name.toLowerCase() === term ? 1 : 0;
      const bExact = b.name.toLowerCase() === term ? 1 : 0;
      if (aExact !== bExact) return bExact - aExact;

      // 2. Type hierarchy priority (broader first)
      const aPriority = TYPE_PRIORITY[a.type] ?? 99;
      const bPriority = TYPE_PRIORITY[b.type] ?? 99;
      if (aPriority !== bPriority) return aPriority - bPriority;

      // 3. Alphabetical (Indonesian collation)
      return a.name.localeCompare(b.name, 'id');
    });
  }, [results, searchTerm]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (val: string) => {
    setSearchTerm(val);
    if (allowFreeText) onChange(val); // emit immediately for free text
    setShowDropdown(true);
  };

  const handleSelect = (location: Location) => {
    setSearchTerm(location.name);
    onChange(location.name);
    setShowDropdown(false);
  };

  const handleClear = () => {
    setSearchTerm('');
    onChange('');
    setShowDropdown(false);
  };

  const handleFocus = () => {
    if (sortedOptions.length > 0) setShowDropdown(true);
  };

  const showNoResultsHint =
    allowFreeText &&
    searchTerm.length >= 2 &&
    !loading &&
    !error &&
    sortedOptions.length === 0;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin
          size={12}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
        />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={handleFocus}
          placeholder={placeholder ?? 'Cari lokasi...'}
          disabled={disabled}
          className="w-full pl-8 pr-7 py-2 rounded-md bg-surface border border-border text-[12px] text-text placeholder:text-text-subtle focus:outline-none focus:border-ads/50 focus:ring-2 focus:ring-ads/20 disabled:opacity-50"
        />

        {/* Right icon: loading / clear / nothing */}
        {loading ? (
          <Loader2
            size={11}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ads animate-spin"
          />
        ) : searchTerm && !disabled ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-surface-muted"
            tabIndex={-1}
          >
            <X size={10} className="text-text-muted" />
          </button>
        ) : null}
      </div>

      {/* Dropdown Suggestions */}
      {showDropdown && sortedOptions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-md shadow-2xl max-h-60 overflow-y-auto z-50">
          {sortedOptions.map((loc) => {
            const isSelected = loc.name.toLowerCase() === searchTerm.toLowerCase();
            return (
              <button
                key={loc.id}
                type="button"
                onClick={() => handleSelect(loc)}
                className={cn(
                  'w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-surface-muted transition-colors',
                  isSelected && 'bg-ads/8',
                )}
              >
                <MapPin size={11} className="text-text-muted shrink-0" />
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-[12px] font-semibold truncate',
                      isSelected ? 'text-ads' : 'text-text',
                    )}
                  >
                    {loc.name}
                  </p>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-surface-muted text-text-muted">
                  {LOCATION_TYPE_LABEL[loc.type]}
                </span>
                {isSelected && <Check size={11} className="text-ads shrink-0" />}
              </button>
            );
          })}
        </div>
      )}

      {/* Error hint */}
      {error && (
        <p className="flex items-center gap-1 text-[10px] text-balapor mt-1">
          <AlertCircle size={9} />
          Gagal load lokasi — input tetap bisa di-save sebagai free text
        </p>
      )}

      {/* No results hint (free text fallback) */}
      {showNoResultsHint && (
        <p className="text-[10px] text-text-muted mt-1">
          💡 Tidak ada lokasi cocok di DB — disimpan sebagai free text
        </p>
      )}
    </div>
  );
}
