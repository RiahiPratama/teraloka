'use client';

/**
 * TeraLoka — AdFormSectionTargeting
 * Mission 8 Sub-Phase 8-B α (Batch 1) → β (Batch 2)
 * SESI 5C-B (18 Mei 2026): Auto-populate positions from pricing_tier_data
 * SESI 11 Batch 2 (30 Mei 2026): Badge status jujur (+video +animated)
 * SESI 11 Spine Langkah 4 (30 Mei 2026): SLOT-DRIVEN view
 * ------------------------------------------------------------
 * Section 3 form: Targeting (positions + regions).
 *
 * SESI 11 Spine Langkah 4 — SLOT-DRIVEN (de-confuse):
 *   Penyakit lama: admin disuruh scan 11 posisi + jargon dimensi buat nyari
 *   2-3 yang relevan. Itu cara mikir AdOps/inventaris bocor ke alur bikin-iklan.
 *
 *   Obat: paket UDAH nentuin slot (positions_allowed). Jadi default cuma tampil
 *   SLOT PAKET dalam bahasa manusia ("Banner samping artikel", bukan "300×208")
 *   + tombol Upload → PositionCreativeModal (Statis/Dinamis/DCA gated by tier).
 *   Inventaris penuh (11 posisi) disimpan di balik "Tambah slot lain (lanjutan)"
 *   buat diskresi admin — GAK kebuang, cuma gak dipaksa muncul.
 *
 *   Fallback: kalau tier gak punya positions_allowed → langsung tampil checklist
 *   lengkap (behavior lama).
 *
 * SESI 11 Batch 2 update:
 *   - creativeStatus tambah deteksi 'video' (position_video_sources) +
 *     'animated' (position_animation_timelines). Badge jujur.
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
  Plus,      // SESI 11 L4 — "tambah slot lain"
  Upload,    // SESI 11 L4 — slot card upload
  Pencil,    // SESI 11 L4 — slot card ganti
  ArrowLeft, // SESI 11 L4 — balik ke slot paket
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
type PageScope = 'homepage' | 'slug' | 'kanal' | 'both';

const PAGE_SCOPE_DISPLAY: Record<PageScope, { label: string; short: string; icon: typeof Home; color: string }> = {
  homepage: { label: 'Homepage BAKABAR',       short: 'Homepage',     icon: Home,     color: 'text-bakabar' },
  slug:     { label: 'Slug Artikel BAKABAR',   short: 'Artikel',      icon: FileText, color: 'text-baronda' },
  kanal:    { label: 'Halaman Kanal/Kategori', short: 'Kanal',        icon: MapPin,   color: 'text-ads' },
  both:     { label: 'Homepage + Slug',        short: 'Home+Artikel', icon: Globe2,   color: 'text-analytics' },
};

// Page group → page scope mapping (untuk visual hint)
const PAGE_GROUP_TO_SCOPE: Record<string, PageScope> = {
  banner_area:       'both',
  sidebar:           'slug',
  in_article_native: 'slug',
  hero_special:      'homepage',
};

// SESI 11 L4: scope dalam bahasa manusia (buat slot card)
const SCOPE_HUMAN: Record<PageScope, string> = {
  homepage: 'Muncul di homepage',
  slug:     'Muncul di halaman artikel',
  kanal:    'Muncul di halaman Kanal/Kategori',
  both:     'Muncul di homepage + artikel',
};

const PAGE_GROUP_LABEL: Record<string, { group: string; description: string }> = {
  banner_area:       { group: 'Banner Area',                      description: 'Slot horizontal — high visibility' },
  sidebar:           { group: 'Skyscraper & Banner Sidebar',      description: 'Banner vertikal di pinggir konten (kiri / kanan)' },
  in_article_native: { group: 'In-Article & Native',              description: 'Inline di artikel — native blend' },
  hero_special:      { group: 'Hero & Special',                   description: 'Slot premium / region-targeted' },
};

// SESI 11 Phase 1B (29 Mei 2026): POSITION_GROUPS AUTO-DERIVED dari
// POSITION_RENDER_METADATA. Sumber tunggal kebenaran.
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
    pageScope?:    PageScope;
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
      pageScope:    meta.pageScope ?? PAGE_GROUP_TO_SCOPE[meta.pageGroup] ?? 'both',
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

// SESI 11 L4: creative status type (mirror modal priority)
type CreativeStatus = 'default' | 'image' | 'dca' | 'animated' | 'video';

export default function AdFormSectionTargeting() {
  const { state, setField, errorFor } = useAdForm();
  const [expanded, setExpanded] = useState(true);
  // SESI 5E Phase 3a: Modal state untuk per-position creative editor
  const [editingPositionKey, setEditingPositionKey] = useState<string | null>(null);
  // SESI 11 L4: toggle slot-driven (default) vs full inventory (lanjutan)
  const [showAllPositions, setShowAllPositions] = useState(false);

  const positionsError = errorFor('positions');
  const isPolitisi = state.advertiser_type === 'politisi';

  // SESI 5C-B (Q2 SOFT): Auto-populate positions saat tier dipilih
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

  // SESI 11 L4: SLOT PAKET — positions_allowed tier, filter non-dormant +
  // compatible format + (kalau politisiOnly) cuma buat politisi.
  const tierSlots: PositionRenderMetadata[] = (state.pricing_tier_data?.positions_allowed ?? [])
    .map((key) => {
      try {
        return getPositionMetadata(key);
      } catch {
        return null;
      }
    })
    .filter((m): m is PositionRenderMetadata =>
      !!m &&
      m.mountStatus !== 'dormant' &&
      isPositionCompatibleWithFormat(m, state.ad_format) &&
      !(m.politisiOnly && !isPolitisi),
    );

  const totalPositions = POSITION_GROUPS.reduce((n, g) => n + g.positions.length, 0);
  const extraSlotCount = Math.max(0, totalPositions - tierSlots.length);

  // SESI 11 L4: helper hitung creative status per posisi
  // FIX status bohong: cuma hitung frame DCA yang ADA gambarnya (image_url terisi).
  // Modal nge-seed 2 frame kosong pas buka DCA — itu JANGAN dihitung "2 banner".
  const statusFor = (key: string): { status: CreativeStatus; dcaCount: number } => {
    const hasVideo       = !!state.position_video_sources[key];
    const hasAnimated    = !!state.position_animation_timelines[key];
    const dcaCount       = (state.position_frames[key] ?? []).filter((f) => f.image_url?.trim()).length;
    const hasDCA         = dcaCount > 0;
    const hasCustomImage = !!state.images[key];
    const status: CreativeStatus =
      hasVideo         ? 'video'
      : hasAnimated    ? 'animated'
      : hasDCA         ? 'dca'
      : hasCustomImage ? 'image'
      : 'default';
    return { status, dcaCount };
  };

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

  // SESI 11 L4: pakai slot-driven kalau ada slot paket + admin belum buka inventaris
  const useSlotView = tierSlots.length > 0 && !showAllPositions;

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
              3. Penempatan & Banner
            </h3>
            <p className="text-[11px] text-text-muted mt-0.5">
              Upload banner buat tiap slot paket + atur wilayah
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
                {useSlotView ? 'Slot Banner Paket' : 'Posisi Tayang'}{' '}
                <span className="text-status-critical">*</span>
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

            {/* SESI 8: Advertorial mode banner — show dim per advertorial format */}
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

            {/* ════════════════════════════════════════════════════════
                SESI 11 L4: SLOT-DRIVEN VIEW (default) vs FULL INVENTORY
                ════════════════════════════════════════════════════════ */}
            {useSlotView ? (
              // ─── Slot paket (bahasa manusia + Upload → modal) ───
              <div className="flex flex-col gap-2">
                <p className="text-[11px] text-text-muted mb-0.5 flex items-center gap-1.5">
                  <Sparkles size={12} className="text-ads shrink-0" />
                  Paket <strong className="text-text">{state.pricing_tier_data?.tier_name}</strong>:
                  {' '}{tierSlots.length} slot — upload banner buat tiap slot.
                </p>

                {tierSlots.map((meta) => {
                  const { status, dcaCount } = statusFor(meta.key);
                  return (
                    <SlotCard
                      key={meta.key}
                      meta={meta}
                      status={status}
                      dcaCount={dcaCount}
                      onEdit={() => setEditingPositionKey(meta.key)}
                    />
                  );
                })}

                {extraSlotCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAllPositions(true)}
                    className="mt-1 w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-dashed border-border text-[11px] font-bold text-text-muted hover:bg-surface-muted hover:text-text transition-colors"
                  >
                    <Plus size={13} />
                    Tambah slot lain (lanjutan) — {extraSlotCount} posisi inventaris
                  </button>
                )}
              </div>
            ) : (
              // ─── Full inventory (checklist lengkap — diskresi/AdOps) ───
              <div className="flex flex-col gap-3">
                {tierSlots.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAllPositions(false)}
                    className="self-start inline-flex items-center gap-1 text-[11px] font-bold text-ads hover:text-ads/80 transition-colors"
                  >
                    <ArrowLeft size={12} />
                    Balik ke slot paket
                  </button>
                )}

                {/* SESI 5C-B: Tier hint banner kalau tier dipilih */}
                {state.pricing_tier_data && (
                  <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-ads/8 border border-ads/30">
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

                {POSITION_GROUPS.map((group) => {
                  return (
                    <div
                      key={group.group}
                      className="rounded-lg border border-border bg-surface-muted/30 p-3"
                    >
                      <div className="mb-2">
                        <p className="text-[11px] font-bold text-text">
                          {group.group}
                        </p>
                        <p className="text-[10px] text-text-muted">
                          {group.description}
                        </p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {group.positions.map((pos) => {
                          const isActive = state.positions.includes(pos.key);
                          const isDisabled = (pos.politisiOnly && !isPolitisi) || pos.isDormant;
                          const isSuggestedTier = tierSuggestedSet.has(pos.key); // SESI 5C-B

                          // SESI 11 Batch 2: badge jujur (video > animated > dca > image > default).
                          const { status: creativeStatus, dcaCount } = statusFor(pos.key);

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
                              {/* SESI 8: Format-aware dim resolution */}
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
                                        {pos.pageScope && (
                                          <span
                                            className={cn(
                                              'inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-bold border shrink-0',
                                              pos.pageScope === 'homepage' && 'bg-bakabar/8 border-bakabar/30 text-bakabar',
                                              pos.pageScope === 'slug'     && 'bg-baronda/8 border-baronda/30 text-baronda',
                                              pos.pageScope === 'kanal'    && 'bg-ads/8 border-ads/30 text-ads',
                                              pos.pageScope === 'both'     && 'bg-analytics/8 border-analytics/30 text-analytics',
                                            )}
                                            title={SCOPE_HUMAN[pos.pageScope]}
                                          >
                                            {PAGE_SCOPE_DISPLAY[pos.pageScope].short}
                                          </span>
                                        )}
                                      </div>
                                      {/* SESI 8: Format-aware dim hint */}
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

                              {/* Status badge + Edit Creative button (only kalau aktif) */}
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
            )}
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

// ─── SESI 11 L4: Sub-Component SlotCard ────────────────────────────
// Kartu slot paket — bahasa manusia, dimensi sekunder, tombol Upload/Ganti.

function SlotCard({
  meta,
  status,
  dcaCount,
  onEdit,
}: {
  meta:     PositionRenderMetadata;
  status:   CreativeStatus;
  dcaCount: number;
  onEdit:   () => void;
}) {
  const scope = PAGE_GROUP_TO_SCOPE[meta.pageGroup] ?? 'both';
  const scopeText = SCOPE_HUMAN[scope];
  const done = status !== 'default';

  const statusText =
    status === 'video'      ? '🎬 Video siap'
    : status === 'animated' ? '✨ Animasi siap'
    : status === 'dca'      ? `🔄 ${dcaCount} banner gonta-ganti`
    : status === 'image'    ? '🖼️ Banner siap'
    : 'Belum diisi';

  const statusCls =
    status === 'video'      ? 'text-cyan-600 dark:text-cyan-400'
    : status === 'animated' ? 'text-purple-600 dark:text-purple-400'
    : status === 'dca'      ? 'text-ads'
    : status === 'image'    ? 'text-status-healthy'
    : 'text-text-subtle';

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-3 rounded-lg border bg-surface transition-colors',
        done ? 'border-status-healthy/40' : 'border-border',
      )}
    >
      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-baronda/10 text-baronda shrink-0">
        <Target size={16} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-text truncate">{meta.label}</p>
        <p className="text-[10px] text-text-muted truncate">
          {scopeText} · ukuran {meta.realDim}
        </p>
      </div>

      <span className={cn('text-[10px] font-bold shrink-0 hidden sm:inline', statusCls)}>
        {statusText}
      </span>

      <button
        type="button"
        onClick={onEdit}
        className={cn(
          'shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold border transition-colors',
          done
            ? 'border-border text-text-muted hover:bg-surface-muted'
            : 'border-ads/40 text-ads hover:bg-ads/8',
        )}
      >
        {done ? <><Pencil size={12} /> Ganti</> : <><Upload size={12} /> Upload</>}
      </button>
    </div>
  );
}
