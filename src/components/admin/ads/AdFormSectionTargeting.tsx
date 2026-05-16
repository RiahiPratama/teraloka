'use client';

/**
 * TeraLoka — AdFormSectionTargeting
 * Mission 8 Sub-Phase 8-B (α / Batch 1)
 * ------------------------------------------------------------
 * Section 3 form: Targeting (positions + regions).
 *
 * Fields:
 *   - positions[] (checkbox grouped, min 1)
 *     - Banner Area: top_leaderboard, inline_banner, banner, homepage_hero_banner
 *     - Sidebar: skyscraper_left, skyscraper_right, sidebar
 *     - In-Article: in_article, native, trending_native
 *     - Hero: political_banner, region_stack, homepage
 *   - target_regions[] | null (null = semua region)
 *     - "Semua Maluku Utara" toggle = null
 *     - 12 kabupaten/kota Maluku Utara checkbox
 *
 * Politisi advertiser → political_banner exclusive option.
 */

import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Check,
  Target,
  MapPin,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdForm } from './AdFormProvider';

// 13 positions grouped by visual area di BAKABAR
const POSITION_GROUPS: Array<{
  group: string;
  description: string;
  positions: Array<{ key: string; label: string; size: string; politisiOnly?: boolean }>;
}> = [
  {
    group:       'Banner Area',
    description: 'Slot horizontal — high visibility',
    positions: [
      { key: 'top_leaderboard',      label: 'Top Billboard',       size: '1680×220' },
      { key: 'inline_banner',        label: 'Inline 8:1',          size: '1600×200' },
      { key: 'banner',               label: 'Banner Generic',      size: 'Vary'     },
      { key: 'homepage_hero_banner', label: 'Hero Fallback',       size: 'Hero'     },
    ],
  },
  {
    group:       'Sidebar',
    description: 'Slot vertikal kanan/kiri konten',
    positions: [
      { key: 'skyscraper_left',  label: 'Sidebar Slot Kiri',  size: '160×600' },
      { key: 'skyscraper_right', label: 'Sidebar Slot Kanan', size: '160×600' },
      { key: 'sidebar',          label: 'Sidebar Generic',    size: 'Vary'    },
    ],
  },
  {
    group:       'In-Article & Native',
    description: 'Inline di artikel — native blend',
    positions: [
      { key: 'in_article',      label: 'In Article',         size: 'Inline' },
      { key: 'native',          label: 'Native In-Article',  size: 'Inline' },
      { key: 'trending_native', label: 'Trending Native',    size: 'Inline' },
    ],
  },
  {
    group:       'Hero & Special',
    description: 'Slot premium / region-targeted',
    positions: [
      { key: 'political_banner', label: 'Politisi Banner',    size: 'Hero', politisiOnly: true },
      { key: 'region_stack',     label: 'Stack Banner Region', size: 'Block' },
      { key: 'homepage',         label: 'Homepage Generic',   size: 'Vary'  },
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

            <div className="flex flex-col gap-3">
              {POSITION_GROUPS.map((group) => (
                <div
                  key={group.group}
                  className="rounded-lg border border-border bg-surface-muted/30 p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-[11px] font-bold text-text">
                        {group.group}
                      </p>
                      <p className="text-[10px] text-text-muted">
                        {group.description}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {group.positions.map((pos) => {
                      const isActive = state.positions.includes(pos.key);
                      const isDisabled = pos.politisiOnly && !isPolitisi;
                      return (
                        <label
                          key={pos.key}
                          className={cn(
                            'flex items-center gap-2 px-2.5 py-1.5 rounded border text-[11px] transition-colors',
                            isDisabled
                              ? 'opacity-40 cursor-not-allowed bg-surface border-border'
                              : isActive
                                ? 'bg-baronda/8 border-baronda/40 cursor-pointer'
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
                            <div className="font-semibold text-text truncate">
                              {pos.label}
                              {pos.politisiOnly && (
                                <span className="ml-1 text-[9px] text-status-warning">
                                  🏛️
                                </span>
                              )}
                            </div>
                            <div className="text-[9px] text-text-muted">
                              {pos.size}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
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
