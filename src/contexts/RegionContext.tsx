'use client';

/**
 * TeraLoka — RegionContext
 * Mission 8 Sub-Phase 8-D Batch C3 — Region Targeting (B+D combo)
 * ────────────────────────────────────────────────────────────────
 * Global region state untuk public-facing pages (BAKABAR + future).
 *
 * Strategy: B+D combo
 *   - B: Cookie/localStorage persist + manual toggle (always accessible)
 *   - D: First-visit modal picker (auto-show kalau belum pilih)
 *
 * Region source priority:
 *   1. localStorage['tl_region']        — persist
 *   2. URL query ?region=X              — deep link / share
 *   3. NULL (= "all", no filter)        — default fallback
 *
 * Storage:
 *   - localStorage key: 'tl_region'
 *   - Value: region slug (e.g. 'ternate') OR 'all' (explicit no-filter)
 *   - Missing key = first-visit (auto-show picker on slug page mount)
 *
 * Reference master:
 *   - src/components/bakabar/region-data.ts → REGIONS: RegionConfig[]
 *   - Filter exclude 'nasional' (kategori berita, bukan geo region)
 *
 * History:
 *   - 16 Mei 2026: NEW (Sub-Phase 8-D Batch C3)
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { REGIONS, type RegionConfig } from '@/components/bakabar/region-data';

// ────────────────────────────────────────────────────────────────
// CONSTANTS
// ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'tl_region';
const ALL_SENTINEL = 'all'; // explicit no-filter value

// Filter REGIONS untuk region picker (exclude kategori non-geo)
const PICKER_REGIONS: RegionConfig[] = REGIONS.filter(
  (r) => r.slug !== 'nasional',
);

// Valid slug whitelist (untuk validate localStorage / URL param)
const VALID_SLUGS = new Set<string>([
  ALL_SENTINEL,
  ...PICKER_REGIONS.map((r) => r.slug),
]);

// ────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────

export type RegionSlug = string;

export interface RegionContextValue {
  /** Current selected region slug. null = "all"/no-filter. */
  region: RegionSlug | null;
  /** Display label untuk current region (untuk chip toggle). */
  label: string;
  /** Short label untuk chip toggle compact mode. */
  shortLabel: string;
  /** All available region options untuk picker. */
  regions: RegionConfig[];
  /** Set new region. Pass null untuk "all". Auto-persist. */
  setRegion: (slug: RegionSlug | null) => void;
  /** Toggle picker modal. */
  pickerOpen: boolean;
  openPicker: () => void;
  closePicker: () => void;
  /** True = belum pernah pilih region (storage key missing). */
  isFirstVisit: boolean;
  /** Mark first-visit done tanpa pilih region (= 'all' / "Lewati"). */
  dismissFirstVisit: () => void;
}

// ────────────────────────────────────────────────────────────────
// CONTEXT
// ────────────────────────────────────────────────────────────────

const RegionContext = createContext<RegionContextValue | null>(null);

// ────────────────────────────────────────────────────────────────
// HELPER — Read region dari localStorage (SSR-safe)
// ────────────────────────────────────────────────────────────────

function readStoredRegion(): { slug: string | null; isFirstVisit: boolean } {
  if (typeof window === 'undefined') {
    return { slug: null, isFirstVisit: false };
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return { slug: null, isFirstVisit: true };
    }

    // Validate stored value, fallback to null kalau invalid
    if (!VALID_SLUGS.has(stored)) {
      return { slug: null, isFirstVisit: true };
    }

    // 'all' sentinel = no filter (return null)
    if (stored === ALL_SENTINEL) {
      return { slug: null, isFirstVisit: false };
    }

    return { slug: stored, isFirstVisit: false };
  } catch {
    return { slug: null, isFirstVisit: false };
  }
}

// ────────────────────────────────────────────────────────────────
// HELPER — Get URL ?region param (SSR-safe, optional)
// ────────────────────────────────────────────────────────────────

function readUrlRegion(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const params = new URLSearchParams(window.location.search);
    const param = params.get('region');
    if (param && VALID_SLUGS.has(param)) {
      return param === ALL_SENTINEL ? null : param;
    }
  } catch {
    /* noop */
  }
  return null;
}

// ────────────────────────────────────────────────────────────────
// PROVIDER
// ────────────────────────────────────────────────────────────────

export function RegionProvider({ children }: { children: ReactNode }) {
  const [region, setRegionState] = useState<RegionSlug | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Mount: hydrate dari localStorage + URL
  useEffect(() => {
    const urlRegion = readUrlRegion();
    if (urlRegion !== null) {
      // URL takes precedence (deep link / share)
      setRegionState(urlRegion);
      setIsFirstVisit(false);
      // Auto-persist URL choice ke localStorage
      try {
        window.localStorage.setItem(STORAGE_KEY, urlRegion);
      } catch { /* noop */ }
    } else {
      const { slug, isFirstVisit: firstVisit } = readStoredRegion();
      setRegionState(slug);
      setIsFirstVisit(firstVisit);
    }
    setMounted(true);
  }, []);

  const setRegion = useCallback((slug: RegionSlug | null) => {
    setRegionState(slug);
    setIsFirstVisit(false);

    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, slug ?? ALL_SENTINEL);
    } catch { /* noop — quota / private mode */ }
  }, []);

  const openPicker  = useCallback(() => setPickerOpen(true), []);
  const closePicker = useCallback(() => setPickerOpen(false), []);

  const dismissFirstVisit = useCallback(() => {
    setIsFirstVisit(false);
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, ALL_SENTINEL);
    } catch { /* noop */ }
  }, []);

  // Derive label dari region slug
  const currentRegionConfig = region
    ? PICKER_REGIONS.find((r) => r.slug === region)
    : null;

  const label      = currentRegionConfig?.label      ?? 'Semua Maluku Utara';
  const shortLabel = currentRegionConfig?.short_label ?? 'Semua MalUt';

  const value: RegionContextValue = {
    region,
    label,
    shortLabel,
    regions: PICKER_REGIONS,
    setRegion,
    pickerOpen,
    openPicker,
    closePicker,
    isFirstVisit: mounted && isFirstVisit, // gate by mount untuk SSR consistency
    dismissFirstVisit,
  };

  return (
    <RegionContext.Provider value={value}>
      {children}
    </RegionContext.Provider>
  );
}

// ────────────────────────────────────────────────────────────────
// HOOK
// ────────────────────────────────────────────────────────────────

export function useRegion(): RegionContextValue {
  const ctx = useContext(RegionContext);
  if (!ctx) {
    // Graceful fallback kalau hook dipakai di luar provider
    // (mis. ambient component yang juga di-render di non-public route)
    return {
      region: null,
      label: 'Semua Maluku Utara',
      shortLabel: 'Semua MalUt',
      regions: PICKER_REGIONS,
      setRegion: () => { /* noop */ },
      pickerOpen: false,
      openPicker: () => { /* noop */ },
      closePicker: () => { /* noop */ },
      isFirstVisit: false,
      dismissFirstVisit: () => { /* noop */ },
    };
  }
  return ctx;
}

// ────────────────────────────────────────────────────────────────
// HELPER — Build ?region=X query param
// ────────────────────────────────────────────────────────────────

/**
 * Build region query param untuk fetch URL.
 * Returns empty string kalau region null (no filter).
 *
 * Usage:
 *   const url = `${API}/public/ads?position=in_article${buildRegionParam(region)}`;
 */
export function buildRegionParam(region: RegionSlug | null): string {
  if (!region) return '';
  return `&region=${encodeURIComponent(region)}`;
}
