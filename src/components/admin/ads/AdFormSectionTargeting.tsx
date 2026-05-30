'use client';

/**
 * TeraLoka — AdFormSectionTargeting
 * Mission 8 Sub-Phase 8-B α (Batch 1) → β (Batch 2)
 * SESI 5C-B (18 Mei 2026): Auto-populate positions from pricing_tier_data
 * SESI 11 Batch 2 (30 Mei 2026): Badge status jujur (+video +animated)
 * ------------------------------------------------------------
 * Section 3 form: Targeting (positions + regions).
 *
 * SESI 11 Batch 2 update:
 *   - creativeStatus tambah deteksi 'video' (position_video_sources) +
 *     'animated' (position_animation_timelines). Sebelumnya cuma kenal
 *     default/image/dca → posisi yang udah ada video/animated muncul
 *     "⚪ Pakai default" (NIPU). Sekarang badge jujur.
 *
 * Batch 2 (16 Mei) update:
 *   - Tambah visual hint per group: page scope semantic
 *     "Tayang di: Homepage / Slug Detail / Keduanya"
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
  Ruler,     // SESI 8 — dimensi format-aware icon
  Ban,       // SESI 8 — format incompatibility icon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdForm } from './AdFormProvider';
// SESI 5E Phase 3a (19 Mei 2026): Position-First Creative Modal
import PositionCreativeModal from './PositionCreativeModal';
// SESI 8 (24 Mei 2026): Format-aware dim helpers
// SESI 11 Phase 1B (29 Mei 2026): + POSITION_RENDER_METADATA untuk auto-derive
// POSITION_GROUPS dari single source of truth.
import {
  POSITION_RENDER_METADATA,
  getPositionMetadata,
  getRecommendedDimForFormat,
  getAspectRatioForFormat,
  isPositionCompatibleWithFormat,
  type PositionRenderMetadata,
} from './position-render-metadata';

// Page scope label per group (visual hint, semantic only — backend trust positions)
type PageScope = 'homepage' | 'slug' | 'both';

const PAGE_SCOPE_DISPLAY: Record<PageScope, { label: string; icon: typeof Home; color: string }> = {
  homepage: { label: 'Homepage BAKABAR',           icon: Home,    color: 'text-bakabar' },
  slug:     { label: 'Slug Artikel BAKABAR',       icon: FileText, color: 'text-baronda' },
  both:     { label: 'Homepage + Slug',            icon: Globe2,  color: 'text-analytics' },
};

// Page group → page scope mapping (untuk visual hint)
const PAGE_GROUP_TO_SCOPE: Record<string, PageScope> = {
  banner_area:       'both',
  sidebar:           'slug',
  in_article_native: 'slug',
  hero_special:      'homepage',
};

const PAGE_GROUP_LABEL: Record<string, { group: string; description: string }> = {
  banner_area:       { group: 'Banner Area',                      description: 'Slot horizontal — high visibility' },
  sidebar:           { group: 'Skyscraper & Banner Sidebar',      description: 'Banner vertikal di pinggir konten (kiri / kanan)' },
  in_article_native: { group: 'In-Article & Native',              description: 'Inline di artikel — native blend' },
  hero_special:      { group: 'Hero & Special',                   description: 'Slot premium / region-targeted' },
};

// SESI 11 Phase 1B (29 Mei 2026): POSITION_GROUPS AUTO-DERIVED dari
// POSITION_RENDER_METADATA. Sumber tunggal kebenaran. Hardcoded list udah
// drop (dulu duplikasi data, drift risk tinggi).
//
// Dormant positions (mountStatus='dormant') tetap tampil tapi:
//   - Checkbox DISABLED (gak bisa centang)
//   - Badge "BELUM AKTIF" merah
//   - Tooltip jelasin kenapa gak bisa pakai
// Tujuan: admin tau slot itu EXIST di sistem (planning Phase 2), tapi gak
// bisa accidentally upload iklan ke posisi yang gak akan tayang.
const POSITION_GROUPS: Array<{
  group:       string;
  description: string;
  pageScope:   PageScope;
  positions:   Array<{
    key:           string;
    label:         string;
    size:          string;
    politisiOnly?: boolean;
    isDormant:     boolean;
    dormantNote?:  string;
  }>;
}> = (() => {
  const grouped: Record<string, typeof POSITION_GROUPS[number]['positions']> = {};

  const metaValues = Object.values(POSITION_RENDER_METADATA) as PositionRenderMetadata[];
  for (const meta of metaValues) {
    if (!grouped[meta.pageGroup]) grouped[meta.pageGroup] = [];
    grouped[meta.pageGroup].push({
      key:          meta.key,
      label:        meta.label,
      size:         meta.realDim,
      politisiOnly: meta.politisiOnly,
      isDormant:    meta.mountStatus === 'dormant',
      dormantNote:  meta.mountNote,
    });
  }

  return Object.entries(grouped).map(([pageGroup, positions]) => ({
    group:       PAGE_GROUP_LABEL[pageGroup]?.group       ?? pageGroup,
    description: PAGE_GROUP_LABEL[pageGroup]?.description ?? '',
    pageScope:   PAGE_GROUP_TO_SCOPE[pageGroup]           ?? 'both',
    positions,
  }));
})();

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
  // SESI 5E Phase 3a: Modal state untuk per-position creative editor
  const [editingPositionKey, setEditingPositionKey] = useState<string | null>(null);

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

            {/* SESI 8 (24 Mei 2026): Advertorial mode banner — show dim per advertorial format */}
            {state.ad_format === 'text' && (
              <div className="mb-2 flex items-start gap-2 px-3 py-2 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-700/40">
                <FileText size={12} className="text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300">
                    Mode: Advertorial (text format)
                  </p>
                  <p className="text-[10px] text-amber-700/80 dark:text-amber-400/70 mt-0.5 leading-relaxed">
                    Dimensi gambar di kartu posisi disesuaikan untuk advertorial. Posisi non-compatible
                    {' '}<Ban size={9} className="inline-block align-middle" /> di-disable.
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
                        const isDisabled = (pos.politisiOnly && !isPolitisi) || pos.isDormant;
                        const isSuggestedTier = tierSuggestedSet.has(pos.key); // SESI 5C-B

                        // SESI 5E Phase 3a: Detect creative status untuk badge
                        // SESI 11 Batch 2 (30 Mei 2026): +video +animated (badge jujur).
                        // Priority: video > animated > dca > image > default (mirror modal).
                        const hasVideo       = !!state.position_video_sources[pos.key];
                        const hasAnimated    = !!state.position_animation_timelines[pos.key];
                        const hasDCA         = (state.position_frames[pos.key]?.length ?? 0) > 0;
                        const hasCustomImage = !!state.images[pos.key];
                        const creativeStatus: 'default' | 'image' | 'dca' | 'animated' | 'video' =
                          hasVideo       ? 'video'
                          : hasAnimated  ? 'animated'
                          : hasDCA       ? 'dca'
                          : hasCustomImage ? 'image'
                          : 'default';
                        const dcaCount = state.position_frames[pos.key]?.length ?? 0;

                        return (
                          <div
                            key={pos.key}
                            className={cn(
                              'rounded border transition-colors overflow-hidden',
                              isDisabled
                                ? 'opacity-40 bg-surface border-border'
                                : isActive
                                  ? 'bg-baronda/8 border-baronda/40'
                                  : isSuggestedTier
                                    ? 'bg-ads/4 border-ads/30 hover:bg-ads/8'
                                    : 'bg-surface border-border hover:bg-surface-muted'
                            )}
                          >
                            {/* SESI 8 (24 Mei 2026): Format-aware dim resolution
                                Pull metadata + compute dim string based on state.ad_format.
                                Show "incompatible" indicator kalau ad_format='text' + position
                                tidak support advertorial. */}
                            {(() => {
                              const meta = getPositionMetadata(pos.key);
                              const dimForFormat = getRecommendedDimForFormat(meta, state.ad_format);
                              const aspectForFormat = getAspectRatioForFormat(meta, state.ad_format);
                              const isCompatible = isPositionCompatibleWithFormat(meta, state.ad_format);
                              const isAdvertorialMode = state.ad_format === 'text';
                              return (
                                <label
                                  className={cn(
                                    'flex items-center gap-2 px-2.5 py-1.5 text-[11px]',
                                    isDisabled || !isCompatible ? 'cursor-not-allowed' : 'cursor-pointer'
                                  )}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isActive}
                                    disabled={isDisabled || !isCompatible}
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
                                      {/* SESI 11 Phase 1B (29 Mei 2026): Badge dormant —
                                          slot ada di metadata tapi belum di-mount di frontend.
                                          Disable checkbox + tooltip kasih tau admin biar gak
                                          accidentally upload iklan yang gak akan tayang. */}
                                      {pos.isDormant && (
                                        <span
                                          className="ml-1 px-1 py-0.5 rounded text-[8px] font-extrabold uppercase bg-status-critical/12 text-status-critical"
                                          title={pos.dormantNote ?? 'Posisi ini belum di-mount di frontend. Phase 2.'}
                                        >
                                          Belum Aktif
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
                                      {!isCompatible && (
                                        <span
                                          className="inline-flex items-center gap-0.5 text-[8px] font-bold text-status-warning"
                                          title="Tidak support format advertorial"
                                        >
                                          <Ban size={9} />
                                        </span>
                                      )}
                                    </div>
                                    {/* SESI 8: Format-aware dim hint (Option A — switch by ad_format) */}
                                    <div className={cn(
                                      'flex items-center gap-1 text-[10px] mt-0.5',
                                      isAdvertorialMode && isCompatible
                                        ? 'text-ads font-semibold'
                                        : 'text-text-muted'
                                    )}>
                                      <Ruler size={9} className="shrink-0" />
                                      <span className="truncate">
                                        {!isCompatible
                                          ? 'Hanya untuk banner image'
                                          : `${dimForFormat} · ${aspectForFormat}`}
                                      </span>
                                    </div>
                                  </div>
                                </label>
                              );
                            })()}

                            {/* SESI 5E Phase 3a: Status badge + Edit Creative button (only kalau aktif) */}
                            {/* SESI 11 Batch 2: badge tambah video + animated */}
                            {isActive && !isDisabled && (
                              <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 border-t border-border/50 bg-surface/40">
                                <span className={cn(
                                  'inline-flex items-center gap-1 text-[9px] font-bold',
                                  creativeStatus === 'video'    ? 'text-cyan-600 dark:text-cyan-400' :
                                  creativeStatus === 'animated'  ? 'text-purple-600 dark:text-purple-400' :
                                  creativeStatus === 'dca'       ? 'text-ads' :
                                  creativeStatus === 'image'     ? 'text-status-healthy' :
                                  'text-text-muted'
                                )}>
                                  {creativeStatus === 'video'
                                    ? '🎬 Video'
                                    : creativeStatus === 'animated'
                                      ? '✨ Animasi GSAP'
                                      : creativeStatus === 'dca'
                                        ? `🔄 DCA · ${dcaCount} variants`
                                        : creativeStatus === 'image'
                                          ? '🖼️ Custom image'
                                          : '⚪ Pakai default'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setEditingPositionKey(pos.key)}
                                  className="text-[9px] font-bold text-ads hover:underline shrink-0"
                                >
                                  {creativeStatus === 'default' ? '+ Upload Banner' : '✏️ Edit Banner'}
                                </button>
                              </div>
                            )}
                          </div>
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

      {/* SESI 5E Phase 3a: Position Creative Modal popup */}
      {editingPositionKey && (
        <PositionCreativeModal
          positionKey={editingPositionKey}
          isOpen={!!editingPositionKey}
          onClose={() => setEditingPositionKey(null)}
        />
      )}
    </section>
  );
}
