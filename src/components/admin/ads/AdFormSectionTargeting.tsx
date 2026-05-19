'use client';

/**
 * TeraLoka — AdFormSectionTargeting
 * Mission 8 Sub-Phase 8-B α (Batch 1) → β (Batch 2)
 * SESI 5C-B (18 Mei 2026): Auto-populate positions from pricing_tier_data
 * ------------------------------------------------------------
 * Section 3 form: Targeting (positions + regions).
 *
 * Batch 2 update:
 *   - Tambah visual hint per group: page scope semantic
 *     "Tayang di: Homepage / Slug Detail / Keduanya"
 *   - Reality verified via grep production code:
 *     - top_leaderboard, trending_native, homepage_hero_banner = HOMEPAGE
 *     - in_article, native, skyscraper_*, inline_banner = SLUG detail
 *     - banner, sidebar, homepage = generic (kedua page)
 *
 * SESI 5C-B update (Q2 SOFT auto-populate):
 *   - useEffect watching state.pricing_tier_data
 *   - Saat tier dipilih → auto-set positions = tier.positions_allowed
 *   - Admin TETAP bisa edit (uncheck/check posisi setelahnya)
 *   - Visual badge "Disarankan tier" per checkbox yang ada di tier.positions_allowed
 *
 * Fields:
 *   - positions[] (checkbox grouped, min 1)
 *   - target_regions[] | null (null = semua region)
 */

import { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Check,
  Target,
  MapPin,
  Info,
  FileText,
  Home,
  Globe2,
  Sparkles,  // SESI 5C-B — "Disarankan tier" badge
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdForm } from './AdFormProvider';

// Page scope label per group (visual hint, semantic only — backend trust positions)
type PageScope = 'homepage' | 'slug' | 'both';

const PAGE_SCOPE_DISPLAY: Record<PageScope, { label: string; icon: typeof Home; color: string }> = {
  homepage: { label: 'Homepage BAKABAR',           icon: Home,    color: 'text-bakabar' },
  slug:     { label: 'Slug Artikel BAKABAR',       icon: FileText, color: 'text-baronda' },
  both:     { label: 'Homepage + Slug',            icon: Globe2,  color: 'text-analytics' },
};

// 13 positions grouped by visual area + page scope hint
// SESI 5D (18 Mei 2026): + description tooltip ("muncul di mana di public")
//                       + aspectGuide (recommended image aspect ratio)
const POSITION_GROUPS: Array<{
  group:       string;
  description: string;
  pageScope:   PageScope;
  positions:   Array<{ 
    key:           string; 
    label:         string; 
    size:          string; 
    description?:  string;        // NEW: tooltip muncul di mana
    aspectGuide?:  string;        // NEW: rekomendasi aspect ratio image
    politisiOnly?: boolean;
  }>;
}> = [
  {
    group:       'Banner Area',
    description: 'Slot horizontal — high visibility',
    pageScope:   'both',
    positions: [
      { key: 'top_leaderboard',      label: 'Top Billboard',       size: '1680×220', description: 'Paling atas halaman, di bawah header navigasi', aspectGuide: 'Horizontal panjang (7.6:1)' },
      { key: 'inline_banner',        label: 'Inline 8:1',          size: '1600×200', description: 'Banner di tengah artikel/feed', aspectGuide: 'Horizontal (8:1)' },
      { key: 'banner',               label: 'Banner Generic',      size: 'Vary',     description: 'Banner fleksibel — auto-fit container', aspectGuide: 'Responsive' },
      { key: 'homepage_hero_banner', label: 'Hero Fallback',       size: 'Hero',     description: 'Banner backup kalau slot hero utama kosong', aspectGuide: 'Horizontal (16:9 atau 21:9)' },
    ],
  },
  {
    group:       'Sidebar',
    description: 'Slot vertikal kanan/kiri konten',
    pageScope:   'slug',
    positions: [
      { key: 'skyscraper_left',  label: 'Sidebar Slot Kiri',  size: '160×600', description: 'Sidebar kiri artikel BAKABAR, sticky scroll', aspectGuide: 'Vertikal tipis (1:3.75)' },
      { key: 'skyscraper_right', label: 'Sidebar Slot Kanan', size: '160×600', description: 'Sidebar kanan artikel BAKABAR, sticky scroll', aspectGuide: 'Vertikal tipis (1:3.75)' },
      { key: 'sidebar',          label: 'Sidebar Generic',    size: 'Vary',    description: 'Sidebar fleksibel cross-page', aspectGuide: 'Vertikal responsive' },
    ],
  },
  {
    group:       'In-Article & Native',
    description: 'Inline di artikel — native blend',
    pageScope:   'slug',
    positions: [
      { key: 'in_article',      label: 'In Article',         size: 'Inline', description: 'Di tengah body artikel, format banner image', aspectGuide: 'Horizontal (16:9 atau 4:3)' },
      { key: 'native',          label: 'Native In-Article',  size: 'Inline', description: 'Advertorial yang menyatu dengan flow artikel', aspectGuide: 'Native (auto match konteks)' },
      { key: 'trending_native', label: 'Trending Native',    size: 'Inline', description: 'Sticky di section "Trending Now" homepage + slug', aspectGuide: 'Card thumbnail (1:1 atau 4:3)' },
    ],
  },
  {
    group:       'Hero & Special',
    description: 'Slot premium / region-targeted',
    pageScope:   'homepage',
    positions: [
      { key: 'political_banner', label: 'Politisi Banner',    size: 'Hero',  description: 'Banner KPU compliance khusus advertiser politisi', aspectGuide: 'Horizontal (16:9)', politisiOnly: true },
      { key: 'region_stack',     label: 'Stack Banner Region', size: 'Block', description: 'Banner di section per-kabupaten di homepage', aspectGuide: 'Card (4:3)' },
      { key: 'homepage',         label: 'Homepage Generic',   size: 'Vary',  description: 'Banner fleksibel cross-section homepage', aspectGuide: 'Responsive' },
    ],
  },
];

// 12 kabupaten/kota Maluku Utara (per memory: GPS backfill done)
const REGIONS = [
  { key: 'ternate',           label: 'Ternate' },
  { key: 'tidore',            label: 'Tidore Kepulauan' },
  { key: 'halbar',            label: 'Halmahera Barat' },
  { key: 'haltim',            label: 'Halmahera Timur' },
  { key: 'halsel',            label: 'Halmahera Selatan' },
  { key: 'halteng',           label: 'Halmahera Tengah' },
  { key: 'halut',             label: 'Halmahera Utara' },
  { key: 'kepsul',            label: 'Kepulauan Sula' },
  { key: 'morotai',           label: 'Pulau Morotai' },
  { key: 'pulau_taliabu',     label: 'Pulau Taliabu' },
  { key: 'sula_sanana',       label: 'Sula Sanana' },
  { key: 'maluku_utara',      label: 'Provinsi Maluku Utara' },
];

export default function AdFormSectionTargeting() {
  const { state, setField, errorFor } = useAdForm();
  const [expanded, setExpanded] = useState(true);

  const positionsError = errorFor('positions');
  const isPolitisi = state.advertiser_type === 'politisi';

  // SESI 5C-B (Q2 SOFT): Auto-populate positions saat tier dipilih
  // Re-fire setiap tier ID changes (tier baru = positions baru).
  // Admin tetap bisa uncheck setelahnya (SOFT, not STRICT).
  useEffect(() => {
    const allowed = state.pricing_tier_data?.positions_allowed;
    if (allowed && allowed.length > 0) {
      setField('positions', allowed);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.pricing_tier_data?.id]);

  // Quick lookup set untuk badge "Disarankan tier"
  const tierSuggestedSet = new Set<string>(
    state.pricing_tier_data?.positions_allowed ?? [],
  );

  const togglePosition = (key: string) => {
    const current = state.positions;
    if (current.includes(key)) {
      setField('positions', current.filter((p) => p !== key));
    } else {
      setField('positions', [...current, key]);
    }
  };

  const toggleRegion = (key: string) => {
    const current = state.target_regions ?? [];
    if (current.includes(key)) {
      const next = current.filter((r) => r !== key);
      setField('target_regions', next.length === 0 ? null : next);
    } else {
      setField('target_regions', [...current, key]);
    }
  };

  const setAllRegions = () => setField('target_regions', null);

  const isComplete = state.positions.length > 0;

  return (
    <section className="bg-surface border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-3 p-4 hover:bg-surface-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-baronda/12 text-baronda shrink-0">
            <Target size={16} />
          </div>
          <div className="min-w-0 text-left">
            <h3 className="text-[13px] font-bold text-text uppercase tracking-wider">
              3. Targeting Posisi & Wilayah
            </h3>
            <p className="text-[11px] text-text-muted mt-0.5">
              Di mana iklan tayang + siapa yang lihat
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isComplete && (
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-status-healthy/12 text-status-healthy">
              <Check size={12} />
            </span>
          )}
          {expanded ? (
            <ChevronUp size={16} className="text-text-muted" />
          ) : (
            <ChevronDown size={16} className="text-text-muted" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-5 border-t border-border">
          {/* Positions */}
          <div className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[11px] font-bold uppercase tracking-wide text-text-muted">
                Posisi Tayang <span className="text-status-critical">*</span>
              </label>
              <span className="text-[10px] text-text-muted">
                {state.positions.length} dipilih
              </span>
            </div>

            {positionsError && (
              <p className="text-[10px] text-status-critical mb-2">
                {positionsError}
              </p>
            )}

            {/* SESI 5C-B: Tier hint banner kalau tier dipilih */}
            {state.pricing_tier_data && (
              <div className="mb-2 flex items-start gap-2 px-3 py-2 rounded-md bg-ads/8 border border-ads/30">
                <Sparkles size={12} className="text-ads shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-ads">
                    Posisi disarankan tier: {state.pricing_tier_data.tier_name}
                  </p>
                  <p className="text-[10px] text-text-muted mt-0.5 leading-relaxed">
                    Posisi dengan badge ⭐ direkomendasi tier. Admin bisa uncheck/check sesuai kebutuhan.
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              {POSITION_GROUPS.map((group) => {
                const ScopeIcon = PAGE_SCOPE_DISPLAY[group.pageScope].icon;
                return (
                  <div
                    key={group.group}
                    className="rounded-lg border border-border bg-surface-muted/30 p-3"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-text">
                          {group.group}
                        </p>
                        <p className="text-[10px] text-text-muted">
                          {group.description}
                        </p>
                      </div>
                      {/* Page scope badge */}
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold border shrink-0',
                          group.pageScope === 'homepage' && 'bg-bakabar/8 border-bakabar/30 text-bakabar',
                          group.pageScope === 'slug'     && 'bg-baronda/8 border-baronda/30 text-baronda',
                          group.pageScope === 'both'     && 'bg-analytics/8 border-analytics/30 text-analytics',
                        )}
                      >
                        <ScopeIcon size={9} />
                        {PAGE_SCOPE_DISPLAY[group.pageScope].label}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {group.positions.map((pos) => {
                        const isActive = state.positions.includes(pos.key);
                        const isDisabled = pos.politisiOnly && !isPolitisi;
                        const isSuggestedTier = tierSuggestedSet.has(pos.key); // SESI 5C-B
                        return (
                          <label
                            key={pos.key}
                            className={cn(
                              'flex items-center gap-2 px-2.5 py-1.5 rounded border text-[11px] transition-colors',
                              isDisabled
                                ? 'opacity-40 cursor-not-allowed bg-surface border-border'
                                : isActive
                                  ? 'bg-baronda/8 border-baronda/40 cursor-pointer'
                                  : isSuggestedTier
                                    ? 'bg-ads/4 border-ads/30 hover:bg-ads/8 cursor-pointer'
                                    : 'bg-surface border-border hover:bg-surface-muted cursor-pointer'
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={isActive}
                              disabled={isDisabled}
                              onChange={() => togglePosition(pos.key)}
                              className="accent-baronda shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-text truncate flex items-center gap-1">
                                {pos.label}
                                {pos.politisiOnly && (
                                  <span className="ml-1 text-[9px] text-status-warning">
                                    🏛️
                                  </span>
                                )}
                                {isSuggestedTier && !isDisabled && (
                                  <span
                                    className="inline-flex items-center gap-0.5 text-[8px] font-bold text-ads"
                                    title="Direkomendasi tier ini"
                                  >
                                    ⭐
                                  </span>
                                )}
                              </div>
                              {/* SESI 5D: description tooltip "muncul di mana di public" */}
                              {pos.description && (
                                <div className="text-[9px] text-text-muted mt-0.5 leading-tight">
                                  {pos.description}
                                </div>
                              )}
                              <div className="text-[9px] text-text-subtle mt-0.5">
                                {pos.size}
                                {pos.aspectGuide && (
                                  <span className="ml-1 text-text-muted">· {pos.aspectGuide}</span>
                                )}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Target regions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold uppercase tracking-wide text-text-muted">
                Targeting Wilayah
              </label>
              <span className="text-[10px] text-text-muted">
                {state.target_regions === null
                  ? 'Semua region'
                  : `${state.target_regions.length} region`}
              </span>
            </div>

            <div className="flex items-start gap-2 p-2.5 mb-2 rounded-lg bg-status-info/8 border border-status-info/30">
              <Info size={12} className="text-status-info shrink-0 mt-0.5" />
              <p className="text-[10px] text-status-info leading-relaxed">
                Pilih <strong>Semua Region</strong> kalau iklan tayang di seluruh
                Maluku Utara. Atau pilih region spesifik untuk geo-targeting.
              </p>
            </div>

            {/* "Semua region" master toggle */}
            <label
              className={cn(
                'flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer mb-2 transition-colors',
                state.target_regions === null
                  ? 'bg-baronda/8 border-baronda/40'
                  : 'bg-surface border-border hover:bg-surface-muted'
              )}
            >
              <input
                type="radio"
                name="region-mode"
                checked={state.target_regions === null}
                onChange={setAllRegions}
                className="accent-baronda shrink-0"
              />
              <div className="min-w-0">
                <p className="text-[12px] font-bold text-text">
                  🌏 Semua Region Maluku Utara
                </p>
                <p className="text-[10px] text-text-muted mt-0.5">
                  Iklan tayang di semua kabupaten/kota
                </p>
              </div>
            </label>

            {/* Specific regions */}
            <label
              className={cn(
                'flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer mb-2 transition-colors',
                state.target_regions !== null
                  ? 'bg-baronda/8 border-baronda/40'
                  : 'bg-surface border-border hover:bg-surface-muted'
              )}
            >
              <input
                type="radio"
                name="region-mode"
                checked={state.target_regions !== null}
                onChange={() => setField('target_regions', state.target_regions ?? [])}
                className="accent-baronda shrink-0"
              />
              <div className="min-w-0">
                <p className="text-[12px] font-bold text-text">
                  <MapPin size={11} className="inline mr-1" />
                  Pilih region spesifik
                </p>
                <p className="text-[10px] text-text-muted mt-0.5">
                  Geo-targeting per kabupaten/kota
                </p>
              </div>
            </label>

            {/* Region checkbox grid (only shown if specific mode) */}
            {state.target_regions !== null && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mt-2 p-3 rounded-lg bg-surface-muted/30 border border-border">
                {REGIONS.map((r) => {
                  const isActive = state.target_regions!.includes(r.key);
                  return (
                    <label
                      key={r.key}
                      className={cn(
                        'flex items-center gap-2 px-2.5 py-1.5 rounded border text-[11px] cursor-pointer transition-colors',
                        isActive
                          ? 'bg-baronda/12 border-baronda/40 text-text font-semibold'
                          : 'bg-surface border-border text-text-muted hover:bg-surface-muted'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={() => toggleRegion(r.key)}
                        className="accent-baronda shrink-0"
                      />
                      <span className="truncate">{r.label}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
