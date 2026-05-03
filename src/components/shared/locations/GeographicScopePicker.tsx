'use client';

/**
 * TeraLoka — Geographic Scope Picker
 * Pre-Sprint #0 Step 6 — Geographic Foundation
 * ────────────────────────────────────────────────────────────
 * Reusable cross-service location picker untuk:
 *   - BALAPOR /lapor (citizen submit)
 *   - BALAPOR /admin/balapor (admin filter scope)
 *   - BAKOS, BAANTAR, BAJASA, BAKABAR, BADONASI (future)
 *
 * 4-state state machine:
 *   1. COLLAPSED — button only ("Pilih wilayah ▾")
 *   2. EXPANDED  — drawer/dropdown open (Tier 1+2 default)
 *   3. DRILLED   — sub-menu after click (children of selected parent)
 *   4. MULTI     — pill-based (DEFER Phase 2, build support, UI disabled)
 *
 * Mobile UX (Locked Q2 = Hybrid):
 *   - Desktop (≥768px): inline dropdown panel
 *   - Mobile  (<768px): bottom sheet 70% height
 *
 * Features:
 *   - Search autocomplete (debounced 300ms)
 *   - GPS button → reverse-geo auto-detect
 *   - localStorage persistence per role/context (storageKey prop)
 *   - Brand color customization (brandColor prop, default #003526)
 *   - Sofifi badge ⭐ (provincial capital metadata)
 *   - Haptic feedback on mobile (cultural fit Maluku Utara)
 *
 * USAGE:
 *   <GeographicScopePicker
 *     value={scope}
 *     onChange={(scope, breadcrumb) => {
 *       setScope(scope);
 *       setLocationText(breadcrumb?.display_short ?? '');
 *     }}
 *     defaultType="kelurahan"
 *     allowGps={true}
 *     storageKey="balapor_citizen_scope"
 *     brandColor="#003526"
 *   />
 */

import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { isMobile, triggerHaptic } from '@/utils/pwa-utils';
import { ThemeContext } from '@/lib/theme/theme-provider';
import {
  useLocationTree,
  useLocationChildren,
  useLocationSearch,
  useLocationBreadcrumb,
  useReverseGeo,
} from './use-locations';
import {
  type Location,
  type LocationScope,
  type LocationBreadcrumb,
  type LocationTreeNode,
  type LocationType,
  LOCATION_TYPE_LABEL,
  LOCATION_TYPE_ICON,
  isProvincialCapital,
  DEFAULT_BRAND_COLOR,
} from './locations-types';

// ─── Props ─────────────────────────────────────────────────────

export interface GeographicScopePickerProps {
  /** Current selected scope (controlled component) */
  value?: LocationScope | null;

  /** Called when user selects/changes scope */
  onChange: (scope: LocationScope | null, breadcrumb?: LocationBreadcrumb) => void;

  /** Filter allowed types user can pick (default: all) */
  allowedTypes?: LocationType[];

  /** Show GPS button untuk auto-detect via reverse-geo */
  allowGps?: boolean;

  /** Brand color override (hex) — default '#003526' TeraLoka */
  brandColor?: string;

  /** Persist last selection in localStorage with this key */
  storageKey?: string;

  /** Size variant */
  size?: 'compact' | 'full';

  /** Placeholder text saat empty */
  placeholder?: string;

  /** Disabled state */
  disabled?: boolean;

  /** Class name for outer wrapper */
  className?: string;
}

// ─── Helpers ───────────────────────────────────────────────────

function formatRefDisplay(ref: { id: string; name: string; type: LocationType }): string {
  if (ref.type === 'kota' && !ref.name.startsWith('Kota ')) {
    return `Kota ${ref.name}`;
  }
  if (ref.type === 'kabupaten' && !ref.name.startsWith('Kabupaten ')) {
    return `Kabupaten ${ref.name}`;
  }
  if (isProvincialCapital(ref.id)) {
    return `${ref.name} ⭐`;
  }
  return ref.name;
}

function loadStoredScope(storageKey?: string): LocationScope | null {
  if (!storageKey || typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.id && parsed?.type) {
      return { id: parsed.id, type: parsed.type };
    }
  } catch {
    // Silent fail (corrupted localStorage)
  }
  return null;
}

function saveScopeToStorage(storageKey: string | undefined, scope: LocationScope | null): void {
  if (!storageKey || typeof window === 'undefined') return;
  try {
    if (scope) {
      localStorage.setItem(storageKey, JSON.stringify(scope));
    } else {
      localStorage.removeItem(storageKey);
    }
  } catch {
    // Silent fail (storage quota exceeded, etc)
  }
}

/**
 * Auto-lift hex color untuk readability di dark mode.
 * Convert hex → HSL → bump lightness → kembali ke hex.
 *
 * Match codebase pattern: globals.css punya status colors lifted 15-20%
 * untuk dark bg. Apply same principle untuk brand color custom.
 *
 * Example:
 *   '#003526' (TeraLoka green dark) di dark mode → '#0a6448' (lifted ~30%)
 *   '#DC2626' (red urgent) di dark mode → '#ed5959' (lifted ~30%)
 *   '#F59E0B' (orange) — already bright, lift minimal pengaruh
 */
function liftColorForDark(hex: string, lightnessBoost = 30): string {
  // Sanitize input — fallback kalau invalid hex
  const cleanHex = hex.replace('#', '').trim();
  if (!/^[0-9a-f]{6}$/i.test(cleanHex)) return hex;

  // hex → RGB
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);

  // RGB → HSL
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    switch (max) {
      case rNorm: h = ((gNorm - bNorm) / delta + (gNorm < bNorm ? 6 : 0)) / 6; break;
      case gNorm: h = ((bNorm - rNorm) / delta + 2) / 6; break;
      case bNorm: h = ((rNorm - gNorm) / delta + 4) / 6; break;
    }
  }

  // Bump lightness (cap at 0.85 untuk avoid washed-out)
  const newL = Math.min(0.85, l + lightnessBoost / 100);

  // HSL → RGB
  const hueToRgb = (p: number, q: number, t: number): number => {
    let tNorm = t;
    if (tNorm < 0) tNorm += 1;
    if (tNorm > 1) tNorm -= 1;
    if (tNorm < 1 / 6) return p + (q - p) * 6 * tNorm;
    if (tNorm < 1 / 2) return q;
    if (tNorm < 2 / 3) return p + (q - p) * (2 / 3 - tNorm) * 6;
    return p;
  };

  let newR = newL;
  let newG = newL;
  let newB = newL;

  if (s !== 0) {
    const q = newL < 0.5 ? newL * (1 + s) : newL + s - newL * s;
    const p = 2 * newL - q;
    newR = hueToRgb(p, q, h + 1 / 3);
    newG = hueToRgb(p, q, h);
    newB = hueToRgb(p, q, h - 1 / 3);
  }

  // RGB → hex
  const toHex = (n: number): string => {
    const hex = Math.round(n * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
}

// ════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════

export default function GeographicScopePicker({
  value,
  onChange,
  allowedTypes,
  allowGps = false,
  brandColor = DEFAULT_BRAND_COLOR,
  storageKey,
  size = 'full',
  placeholder = 'Pilih wilayah',
  disabled = false,
  className,
}: GeographicScopePickerProps) {
  // ─── State ────────────────────────────────────────────────────
  const [open, setOpen] = useState(false);
  const [drillStack, setDrillStack] = useState<Location[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobile, setMobile] = useState(false);

  // ─── Theme-aware brand color ─────────────────────────────────
  // Auto-lift brandColor di dark mode untuk readability.
  // Mirror codebase pattern (status colors lifted 15-20% di dark bg).
  // Fallback safe: kalau ThemeContext gak available, pakai brandColor as-is.
  const themeCtx = useContext(ThemeContext);
  const resolvedTheme = themeCtx?.resolvedTheme ?? 'light';
  const effectiveBrandColor = useMemo(
    () => (resolvedTheme === 'dark' ? liftColorForDark(brandColor, 30) : brandColor),
    [resolvedTheme, brandColor],
  );

  // ─── Restore last selection on mount ─────────────────────────
  useEffect(() => {
    if (!value && storageKey) {
      const stored = loadStoredScope(storageKey);
      if (stored) {
        // Don't auto-select, just notify parent (parent decides whether to apply)
        // We could call onChange(stored), but that may trigger unintended re-renders.
        // Better: parent reads from localStorage themselves if they want default.
      }
    }
  }, [value, storageKey]);

  // ─── Mobile detection ─────────────────────────────────────────
  useEffect(() => {
    setMobile(isMobile());
  }, []);

  // ─── Lock body scroll on mobile drawer open ──────────────────
  useEffect(() => {
    if (open && mobile && typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [open, mobile]);

  // ─── Data hooks ──────────────────────────────────────────────
  const currentParentId = drillStack[drillStack.length - 1]?.id ?? null;

  const treeQuery = useLocationTree(null, open && !currentParentId && !searchQuery);
  const childrenQuery = useLocationChildren(
    currentParentId,
    undefined,
    open && !!currentParentId && !searchQuery,
  );
  const searchResultsQuery = useLocationSearch(searchQuery, undefined, 30);
  const breadcrumbQuery = useLocationBreadcrumb(value?.id ?? null);
  const reverseGeo = useReverseGeo();

  // ─── Derived ─────────────────────────────────────────────────
  const displayLabel = useMemo(() => {
    if (!value) return placeholder;
    if (breadcrumbQuery.data) {
      return breadcrumbQuery.data.display_short;
    }
    if (breadcrumbQuery.loading) return 'Memuat…';
    return placeholder;
  }, [value, breadcrumbQuery.data, breadcrumbQuery.loading, placeholder]);

  // List items shown di panel (search > drilled children > tree root)
  const listItems = useMemo(() => {
    if (searchQuery && searchQuery.trim().length >= 2) {
      return searchResultsQuery.data ?? [];
    }
    if (currentParentId && childrenQuery.data) {
      return childrenQuery.data;
    }
    // Tree root: flatten Tier 1 children
    if (Array.isArray(treeQuery.data)) {
      return treeQuery.data.flatMap((province) => province.children ?? []);
    }
    return [];
  }, [searchQuery, searchResultsQuery.data, currentParentId, childrenQuery.data, treeQuery.data]);

  const isLoading =
    (searchQuery && searchResultsQuery.loading) ||
    (currentParentId && childrenQuery.loading) ||
    (!searchQuery && !currentParentId && treeQuery.loading);

  const isLocationPickable = useCallback(
    (loc: { type: LocationType }) => {
      if (!allowedTypes || allowedTypes.length === 0) return true;
      return allowedTypes.includes(loc.type);
    },
    [allowedTypes],
  );

  // ─── Event handlers ──────────────────────────────────────────
  const handleOpen = useCallback(() => {
    if (disabled) return;
    setOpen(true);
    setSearchQuery('');
    setDrillStack([]);
    triggerHaptic('tap');
  }, [disabled]);

  const handleClose = useCallback(() => {
    setOpen(false);
    setSearchQuery('');
    setDrillStack([]);
  }, []);

  const handleSelect = useCallback(
    (location: Location, currentBreadcrumb?: LocationBreadcrumb) => {
      if (!isLocationPickable(location)) {
        // Not directly pickable → drill instead
        setDrillStack((stack) => [...stack, location]);
        setSearchQuery('');
        triggerHaptic('tap');
        return;
      }

      const scope: LocationScope = { type: location.type, id: location.id };
      onChange(scope, currentBreadcrumb);
      saveScopeToStorage(storageKey, scope);
      triggerHaptic('success');
      handleClose();
    },
    [isLocationPickable, onChange, storageKey, handleClose],
  );

  const handleDrillBack = useCallback(() => {
    setDrillStack((stack) => stack.slice(0, -1));
    setSearchQuery('');
    triggerHaptic('tap');
  }, []);

  const handleClear = useCallback(() => {
    onChange(null, undefined);
    saveScopeToStorage(storageKey, null);
    triggerHaptic('tap');
    handleClose();
  }, [onChange, storageKey, handleClose]);

  const handleGps = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Browser tidak mendukung geolokasi. Pilih lokasi manual.');
      return;
    }

    triggerHaptic('tap');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const result = await reverseGeo.execute(pos.coords.latitude, pos.coords.longitude);
        if (result) {
          const scope: LocationScope = { type: result.type, id: result.location_id };
          onChange(scope, undefined); // breadcrumb akan auto-fetch via useLocationBreadcrumb
          saveScopeToStorage(storageKey, scope);
          triggerHaptic('success');
          handleClose();
        } else {
          // Phase 1: koordinat belum di-seed → fallback manual
          alert(
            'Lokasi GPS tidak ditemukan dalam database (Phase 1: koordinat belum lengkap). ' +
              'Silakan pilih lokasi manual.',
          );
          triggerHaptic('error');
        }
      },
      (err) => {
        triggerHaptic('error');
        alert(`Gagal akses GPS: ${err.message}`);
      },
      { timeout: 10000, maximumAge: 60000 },
    );
  }, [reverseGeo, onChange, storageKey, handleClose]);

  // ─── Render: Trigger Button (Collapsed state) ────────────────
  const triggerButton = (
    <button
      type="button"
      onClick={handleOpen}
      disabled={disabled}
      className={cn(
        'flex items-center justify-between gap-2 w-full',
        'rounded-lg border-2 transition-all duration-150',
        size === 'compact' ? 'px-3 py-2 text-sm' : 'px-4 py-3 text-base',
        'bg-surface text-text',
        'hover:border-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current',
        disabled && 'opacity-50 cursor-not-allowed',
        !value && 'text-text-muted',
        className,
      )}
      style={{
        borderColor: value ? effectiveBrandColor : undefined,
      }}
    >
      <span className="flex items-center gap-2 truncate">
        <span
          className="material-symbols-outlined shrink-0"
          style={{ fontSize: size === 'compact' ? 18 : 20, color: effectiveBrandColor }}
          aria-hidden
        >
          {value ? 'location_on' : 'location_off'}
        </span>
        <span className="truncate">{displayLabel}</span>
      </span>
      <span
        className="material-symbols-outlined shrink-0 text-text-muted"
        aria-hidden
      >
        expand_more
      </span>
    </button>
  );

  // ─── Render: Panel content (shared desktop dropdown + mobile sheet) ──
  const panelContent = (
    <div className="flex flex-col h-full">
      {/* Header: title + close + (back button if drilled) */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          {drillStack.length > 0 && (
            <button
              type="button"
              onClick={handleDrillBack}
              className="material-symbols-outlined text-text-muted hover:text-text"
              aria-label="Kembali"
              style={{ fontSize: 22 }}
            >
              arrow_back
            </button>
          )}
          <span className="text-sm font-semibold truncate">
            {drillStack.length > 0
              ? formatRefDisplay(drillStack[drillStack.length - 1])
              : 'Pilih wilayah'}
          </span>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="material-symbols-outlined text-text-muted hover:text-text"
          aria-label="Tutup"
          style={{ fontSize: 22 }}
        >
          close
        </button>
      </div>

      {/* Breadcrumb trail (when drilled) */}
      {drillStack.length > 0 && (
        <div className="flex-shrink-0 px-4 py-2 bg-surface-muted border-b border-border text-xs text-text-muted truncate">
          {drillStack.map((loc, i) => (
            <span key={loc.id}>
              {i > 0 && ' › '}
              {formatRefDisplay(loc)}
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-border">
        <div className="relative">
          <span
            className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
            style={{ fontSize: 18 }}
            aria-hidden
          >
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari wilayah…"
            className={cn(
              'w-full pl-10 pr-3 py-2 rounded-lg',
              'bg-surface text-text text-sm',
              'border border-border focus:outline-none',
              'focus:ring-2 focus:ring-current focus:border-current',
            )}
            style={{ outlineColor: effectiveBrandColor }}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-text-muted text-sm">
            <span className="material-symbols-outlined animate-spin mr-2" style={{ fontSize: 18 }}>
              progress_activity
            </span>
            Memuat…
          </div>
        ) : listItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-text-muted text-sm">
            <span className="material-symbols-outlined mb-2" style={{ fontSize: 32 }}>
              search_off
            </span>
            {searchQuery ? 'Tidak ada hasil' : 'Tidak ada wilayah'}
          </div>
        ) : (
          <ul role="listbox" className="divide-y divide-border">
            {listItems.map((loc) => {
              const pickable = isLocationPickable(loc);
              const hasChildren = loc.type !== 'kelurahan' && loc.type !== 'desa';
              const isSelected = value?.id === loc.id;

              return (
                <li key={loc.id} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    onClick={() => handleSelect(loc)}
                    className={cn(
                      'w-full flex items-center justify-between gap-3 px-4 py-3',
                      'hover:bg-surface-muted active:bg-surface-muted/70',
                      'transition-colors text-left',
                      isSelected && 'font-semibold',
                    )}
                    style={isSelected ? { color: effectiveBrandColor } : undefined}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="material-symbols-outlined shrink-0 text-text-muted"
                        style={{ fontSize: 20 }}
                        aria-hidden
                      >
                        {LOCATION_TYPE_ICON[loc.type]}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm text-text truncate">
                          {formatRefDisplay(loc)}
                        </div>
                        <div className="text-xs text-text-muted">
                          {LOCATION_TYPE_LABEL[loc.type]}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {pickable && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full border"
                          style={{ borderColor: effectiveBrandColor, color: effectiveBrandColor }}
                        >
                          Pilih
                        </span>
                      )}
                      {hasChildren && (
                        <span
                          className="material-symbols-outlined text-text-muted"
                          style={{ fontSize: 20 }}
                          aria-hidden
                        >
                          chevron_right
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer: GPS + Reset buttons */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-border flex items-center gap-2">
        {allowGps && (
          <button
            type="button"
            onClick={handleGps}
            disabled={reverseGeo.loading}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg',
              'border-2 text-sm font-medium transition-all',
              'hover:bg-surface-muted disabled:opacity-50 disabled:cursor-wait',
            )}
            style={{ borderColor: effectiveBrandColor, color: effectiveBrandColor }}
          >
            <span
              className={cn(
                'material-symbols-outlined',
                reverseGeo.loading && 'animate-spin',
              )}
              style={{ fontSize: 18 }}
              aria-hidden
            >
              {reverseGeo.loading ? 'progress_activity' : 'my_location'}
            </span>
            {reverseGeo.loading ? 'Mendeteksi…' : 'Pakai GPS'}
          </button>
        )}
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className={cn(
              'px-3 py-2 rounded-lg text-sm font-medium',
              'border border-border text-text-muted hover:bg-surface-muted',
              'transition-all',
            )}
          >
            Reset
          </button>
        )}
      </div>

      {/* Error display */}
      {(treeQuery.error || childrenQuery.error || searchResultsQuery.error || reverseGeo.error) && (
        <div className="flex-shrink-0 px-4 py-2 bg-status-critical/10 text-status-critical text-xs">
          {treeQuery.error || childrenQuery.error || searchResultsQuery.error || reverseGeo.error}
        </div>
      )}
    </div>
  );

  // ─── Render: Final composition ───────────────────────────────
  return (
    <>
      {triggerButton}

      {open && (
        <>
          {/* Backdrop */}
          <div
            className={cn(
              'fixed inset-0 z-40 bg-black/60 transition-opacity',
              mobile ? 'block' : 'block',
            )}
            onClick={handleClose}
            aria-hidden
          />

          {/* Panel */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Pilih wilayah"
            className={cn(
              'fixed z-50 bg-surface-elevated shadow-2xl border border-border ring-1 ring-white/5 flex flex-col',
              mobile
                ? 'inset-x-0 bottom-0 h-[80vh] max-h-[700px] rounded-t-2xl' // bottom sheet mobile (cap 700px)
                : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[600px] max-h-[85vh] rounded-2xl', // centered modal desktop (fixed 600px, ceiling 85vh)
            )}
          >
            {panelContent}
          </div>
        </>
      )}
    </>
  );
}
