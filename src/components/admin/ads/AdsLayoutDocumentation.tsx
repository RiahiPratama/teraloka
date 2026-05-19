'use client';

/**
 * TeraLoka ADS — Tab Layout Iklan (Documentation Hub)
 * SESI 5D-2 (19 Mei 2026) Phase 3
 * ────────────────────────────────────────────────────────────────
 * Static documentation page yang menjelaskan:
 *   - Visual mockup wireframe Bakabar (peta posisi iklan)
 *   - Per-position detail card (dimensi, render type, component file)
 *   - Dual-usage notes (e.g., homepage_hero_banner di 2 tempat)
 *   - Recommended image asset per posisi
 *
 * Source-of-truth: POSITION_RENDER_METADATA dari position-render-metadata.ts
 *
 * Goal: admin non-developer paham layout iklan tanpa baca code.
 *
 * Tab integration:
 *   Sidebar admin ADS:
 *     - IKLAN
 *     - PRICING TIERS
 *     - ADVERTISER
 *     - LAYOUT IKLAN  ← NEW (this component)
 *
 * Usage:
 *   <AdsLayoutDocumentation />
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Layout, Eye, Info, ExternalLink, FileText,
  Image as ImageIcon, Repeat, Layers, Circle,
  Plus, ArrowRight, ListChecks,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  POSITION_RENDER_METADATA,
  getPositionsByGroup,
  computeCapacityStatus,
  formatCapacityDisplay,
  type PositionRenderMetadata,
  type PositionRenderType,
  type CapacityStatus,
} from './position-render-metadata';
import { useCapacityData } from './PositionCapacityBadge';

// ════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════

// SESI 5D-2: Base URL Bakabar untuk live preview
const BAKABAR_BASE_URL =
  typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : (process.env.NEXT_PUBLIC_BAKABAR_URL || 'https://teraloka.vercel.app');

const RENDER_TYPE_INFO: Record<PositionRenderType, {
  label:       string;
  description: string;
  icon:        React.ReactNode;
  color:       string;
}> = {
  SINGLE_FIXED: {
    label:       'Single Pool',
    description: '1 visible slot, frontend pick random 1 ad dari pool aktif per pageview.',
    icon:        <Circle size={14} />,
    color:       'text-blue-500',
  },
  CAROUSEL_MULTI: {
    label:       'Carousel Multi',
    description: 'Semua ads visible simultaneous di carousel, fokus rotate auto.',
    icon:        <Repeat size={14} />,
    color:       'text-purple-500',
  },
  LIST_STACKED: {
    label:       'List Stacked',
    description: 'N visible slots stacked vertical, top N ads render (sisanya queue).',
    icon:        <Layers size={14} />,
    color:       'text-amber-500',
  },
};

const PAGE_GROUP_INFO: Record<string, { label: string; description: string }> = {
  banner_area:        { label: 'Banner Area',       description: 'Slot horizontal high visibility (top, inline, hero)' },
  sidebar:            { label: 'Sidebar',           description: 'Slot vertikal kiri/kanan konten' },
  in_article_native:  { label: 'In-Article & Native', description: 'Inline di artikel, native blend' },
  hero_special:       { label: 'Hero & Special',    description: 'Slot premium / region-targeted' },
};

// ════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════

interface AdsLayoutDocumentationProps {
  /**
   * SESI 5D-2 Phase C: Callback untuk jump ke tab IKLAN + auto-filter posisi.
   * Optional — kalau tidak provided, link "Lihat iklan" hidden.
   */
  onJumpToAds?: (positionKey: string) => void;
}

export default function AdsLayoutDocumentation({ onJumpToAds }: AdsLayoutDocumentationProps) {
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const groups = getPositionsByGroup();
  const selectedMeta = selectedPosition ? POSITION_RENDER_METADATA[selectedPosition] : null;

  // SESI 5D-2 Phase B: Live capacity stats per posisi
  const { getActiveCount, loading: capacityLoading } = useCapacityData();

  // SESI 5D-2 Q3: Modal popup behavior — ESC close + body scroll lock
  useEffect(() => {
    if (!selectedPosition) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedPosition(null);
    };
    document.addEventListener('keydown', handleEsc);
    // Lock body scroll
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = prevOverflow;
    };
  }, [selectedPosition]);

  return (
    <div className="flex flex-col gap-4">
      {/* ─── HEADER ─── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-bold text-text flex items-center gap-2">
            <Layout size={20} className="text-ads" />
            Layout Iklan TeraLoka
          </h2>
          <p className="text-[12px] text-text-muted mt-0.5">
            Peta posisi iklan di frontend Bakabar. Klik posisi untuk detail.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-text-muted">
          <Info size={12} />
          <span>{Object.keys(POSITION_RENDER_METADATA).length} posisi total</span>
        </div>
      </div>

      {/* ─── INFO BANNER ─── */}
      <div className="rounded-lg border border-status-info/30 bg-status-info/5 p-3">
        <div className="flex items-start gap-2">
          <Info size={14} className="text-status-info shrink-0 mt-0.5" />
          <div className="text-[11px] text-text leading-relaxed">
            <p className="font-bold mb-1">Cara baca halaman ini:</p>
            <ul className="list-disc list-inside space-y-0.5 text-text-muted">
              <li><strong>Render Type</strong>: Single Pool / Carousel Multi / List Stacked — tentukan visual behavior</li>
              <li><strong>Dimensi Image Recommended</strong>: ukuran image asset untuk upload optimal</li>
              <li><strong>Page Group</strong>: di halaman/section mana posisi muncul</li>
              <li><strong>Dual-usage notes</strong>: beberapa posisi muncul di 2+ tempat</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ─── RENDER TYPE LEGEND ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {Object.entries(RENDER_TYPE_INFO).map(([type, info]) => (
          <div key={type} className="rounded-lg border border-border bg-surface p-3">
            <div className={cn('flex items-center gap-1.5 font-bold text-[11px] mb-1', info.color)}>
              {info.icon}
              {info.label}
            </div>
            <p className="text-[10px] text-text-muted leading-snug">
              {info.description}
            </p>
          </div>
        ))}
      </div>

      {/* ─── POSITION GRID BY GROUP ─── */}
      <div className="space-y-4">
        {Object.entries(groups).map(([groupKey, positions]) => (
          <div key={groupKey} className="rounded-lg border border-border bg-surface overflow-hidden">
            {/* Group header */}
            <div className="px-4 py-3 bg-surface-muted/40 border-b border-border">
              <h3 className="text-[13px] font-bold text-text">
                {PAGE_GROUP_INFO[groupKey]?.label || groupKey}
              </h3>
              <p className="text-[10px] text-text-muted mt-0.5">
                {PAGE_GROUP_INFO[groupKey]?.description}
              </p>
            </div>

            {/* Position cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3">
              {positions.map((meta) => (
                <PositionCard
                  key={meta.key}
                  meta={meta}
                  isSelected={selectedPosition === meta.key}
                  onClick={() => setSelectedPosition(
                    selectedPosition === meta.key ? null : meta.key
                  )}
                  activeCount={capacityLoading ? null : getActiveCount(meta.key)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ─── DETAIL MODAL POPUP (SESI 5D-2: convert from sticky bottom) ─── */}
      {selectedMeta && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setSelectedPosition(null)}
        >
          <div
            className="w-full max-w-4xl my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <PositionDetailCard
              meta={selectedMeta}
              activeCount={capacityLoading ? null : getActiveCount(selectedMeta.key)}
              onClose={() => setSelectedPosition(null)}
              onJumpToAds={onJumpToAds}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// SUB-COMPONENT: PositionCard (compact)
// ════════════════════════════════════════════════════════════════

interface PositionCardProps {
  meta:        PositionRenderMetadata;
  isSelected:  boolean;
  onClick:     () => void;
  activeCount: number | null;
}

function PositionCard({ meta, isSelected, onClick, activeCount }: PositionCardProps) {
  const renderInfo = RENDER_TYPE_INFO[meta.renderType];

  // Live capacity calculation
  const maxSlots = meta.recommendedMaxActive ?? meta.visualSlotCount;
  const slotsLeft = activeCount !== null ? Math.max(0, maxSlots - activeCount) : null;
  const status = activeCount !== null
    ? computeCapacityStatus(activeCount, meta.recommendedMaxActive)
    : null;
  const statusColor = status === 'over_capacity' ? 'text-status-critical'
    : status === 'near_full'                     ? 'text-amber-500'
    : status === 'available'                     ? 'text-status-warning'
    : 'text-status-healthy';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-start gap-1.5 p-3 rounded-lg border text-left transition-colors',
        isSelected
          ? 'bg-ads/8 border-ads/40'
          : 'bg-surface border-border hover:bg-surface-muted/30'
      )}
    >
      <div className="flex items-center justify-between w-full gap-2">
        <span className="text-[12px] font-bold text-text">
          {meta.label}
          {meta.politisiOnly && (
            <span className="ml-1.5 text-[9px] text-status-warning">🏛️</span>
          )}
        </span>
        <span className={cn(
          'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase',
          renderInfo.color
        )}>
          {renderInfo.icon}
          {renderInfo.label}
        </span>
      </div>

      <div className="text-[10px] text-text-muted leading-snug">
        {meta.description}
      </div>

      {/* SESI 5D-2 Phase B: Live capacity stats */}
      {activeCount !== null && (
        <div className="flex items-center gap-2 w-full pt-1">
          <span className={cn('text-[10px] font-bold', statusColor)}>
            {formatCapacityDisplay(meta, activeCount)}
          </span>
          {slotsLeft !== null && slotsLeft > 0 && (
            <span className="text-[9px] text-status-warning font-semibold">
              · {slotsLeft} slot kosong
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 w-full mt-1 pt-1.5 border-t border-border">
        <div className="flex items-center gap-1 text-[10px] text-ads font-semibold">
          <ImageIcon size={10} />
          {meta.recommendedImageDim}
        </div>
        <div className="text-[9px] text-text-subtle ml-auto">
          {meta.aspectRatio}
        </div>
        {/* SESI 5D-2: Quick link to live Bakabar (stop propagation untuk avoid card toggle) */}
        <a
          href={`${BAKABAR_BASE_URL}${meta.frontendUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-0.5 text-[9px] text-ads hover:underline shrink-0"
          title="Lihat live di Bakabar"
        >
          <ExternalLink size={9} />
          Live
        </a>
      </div>
    </button>
  );
}

// ════════════════════════════════════════════════════════════════
// SUB-COMPONENT: PositionDetailCard (expanded info)
// ════════════════════════════════════════════════════════════════

interface PositionDetailCardProps {
  meta:        PositionRenderMetadata;
  activeCount: number | null;
  onClose:     () => void;
  onJumpToAds?: (positionKey: string) => void;
}

function PositionDetailCard({ meta, activeCount, onClose, onJumpToAds }: PositionDetailCardProps) {
  const renderInfo = RENDER_TYPE_INFO[meta.renderType];

  // SESI 5D-2 Phase B: Live capacity calculation
  const maxSlots = meta.recommendedMaxActive ?? meta.visualSlotCount;
  const slotsLeft = activeCount !== null ? Math.max(0, maxSlots - activeCount) : null;
  const isFull = activeCount !== null && activeCount >= maxSlots;

  return (
    <div className="rounded-xl border-2 border-ads/40 bg-surface p-5 shadow-2xl shadow-black/40 max-h-[85vh] overflow-y-auto">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="text-[14px] font-bold text-text">
            {meta.label}
            {meta.politisiOnly && (
              <span className="ml-1.5 text-[10px] text-status-warning">🏛️ Politisi Only</span>
            )}
          </h3>
          <p className="text-[11px] text-text-muted mt-0.5">
            Position key: <code className="text-ads">{meta.key}</code>
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-[10px] text-text-muted hover:text-text px-2 py-1 rounded hover:bg-surface-muted/40"
        >
          ✕ Tutup
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
        {/* Render type */}
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wide text-text-muted mb-1">
            Render Type
          </p>
          <div className={cn('flex items-center gap-1.5 font-bold', renderInfo.color)}>
            {renderInfo.icon}
            {renderInfo.label}
          </div>
          <p className="text-[10px] text-text-muted mt-1 leading-snug">
            {renderInfo.description}
          </p>
        </div>

        {/* Capacity */}
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wide text-text-muted mb-1">
            Visual Capacity
          </p>
          <p className="text-text font-bold">
            {meta.visualSlotCount === 1
              ? '1 visible slot'
              : `${meta.visualSlotCount} visible slots`}
          </p>
          {meta.recommendedMaxActive !== null && (
            <p className="text-[10px] text-text-muted mt-0.5">
              Max recommended: {meta.recommendedMaxActive} ads aktif
            </p>
          )}
        </div>

        {/* Dimensi recommended */}
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wide text-text-muted mb-1">
            Image Dimensi (Upload Asset)
          </p>
          <p className="text-ads font-bold text-[12px]">
            📐 {meta.recommendedImageDim}
          </p>
          <p className="text-[10px] text-text-muted mt-0.5">
            {meta.aspectRatio}
          </p>
        </div>

        {/* Render Dim CSS */}
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wide text-text-muted mb-1">
            Frontend Render Dim (CSS)
          </p>
          <p className="text-text text-[10px] font-mono leading-snug">
            {meta.realDim}
          </p>
        </div>

        {/* Component file */}
        <div className="md:col-span-2 pt-2 border-t border-border/50">
          <p className="text-[9px] font-bold uppercase tracking-wide text-text-muted mb-1">
            Frontend Component
          </p>
          <code className="text-[11px] text-ads font-mono">
            <FileText size={10} className="inline mr-1" />
            {meta.component}
          </code>
        </div>

        {/* Description */}
        <div className="md:col-span-2 pt-2 border-t border-border/50">
          <p className="text-[9px] font-bold uppercase tracking-wide text-text-muted mb-1">
            Penjelasan
          </p>
          <p className="text-text leading-relaxed">
            {meta.description}
          </p>
        </div>

        {/* SESI 5D-2: Live preview link ke Bakabar */}
        <div className="md:col-span-2 pt-2 border-t border-border/50">
          <a
            href={`${BAKABAR_BASE_URL}${meta.frontendUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-ads/12 text-ads hover:bg-ads/20 text-[11px] font-bold transition-colors"
          >
            <ExternalLink size={12} />
            Lihat live di Bakabar
            <span className="text-[9px] text-text-muted ml-1">
              ({meta.frontendUrl})
            </span>
          </a>
        </div>

        {/* SESI 5D-2 Phase A+B+C: Quick Action Panel */}
        <div className="md:col-span-2 pt-3 mt-1 border-t-2 border-ads/30 bg-ads/5 -mx-4 -mb-4 px-4 pb-4 rounded-b-lg">
          <p className="text-[10px] font-bold uppercase tracking-wide text-ads mb-2">
            🚀 Quick Action Panel
          </p>

          {/* Phase B: Live capacity stats */}
          {activeCount !== null && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="rounded-lg bg-surface border border-border p-2 text-center">
                <p className="text-[8px] text-text-muted uppercase tracking-wide">Aktif</p>
                <p className="text-[14px] font-extrabold text-status-healthy mt-0.5">
                  {activeCount}
                </p>
              </div>
              <div className="rounded-lg bg-surface border border-border p-2 text-center">
                <p className="text-[8px] text-text-muted uppercase tracking-wide">Sisa Slot</p>
                <p className={cn(
                  'text-[14px] font-extrabold mt-0.5',
                  slotsLeft === 0 ? 'text-status-critical'
                    : slotsLeft && slotsLeft <= 2 ? 'text-amber-500'
                    : 'text-status-warning'
                )}>
                  {slotsLeft}
                </p>
              </div>
              <div className="rounded-lg bg-surface border border-border p-2 text-center">
                <p className="text-[8px] text-text-muted uppercase tracking-wide">Kapasitas</p>
                <p className="text-[14px] font-extrabold text-text mt-0.5">
                  {maxSlots}
                </p>
              </div>
            </div>
          )}

          {/* Phase A + C: Action buttons */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Link
              href={`/admin/ads/new?position=${meta.key}`}
              className={cn(
                'inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold transition-colors flex-1',
                isFull
                  ? 'bg-status-critical/12 text-status-critical hover:bg-status-critical/20'
                  : 'bg-ads text-white hover:bg-ads/85'
              )}
            >
              <Plus size={12} />
              {isFull
                ? 'Slot Penuh — Tambah Anyway?'
                : `Tambah Iklan untuk ${meta.label}`}
            </Link>

            {onJumpToAds && activeCount !== null && activeCount > 0 && (
              <button
                type="button"
                onClick={() => onJumpToAds(meta.key)}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-surface text-text border border-border hover:bg-surface-muted/40 text-[11px] font-bold transition-colors flex-1"
              >
                <ListChecks size={12} />
                Lihat {activeCount} iklan aktif
                <ArrowRight size={10} />
              </button>
            )}
          </div>

          {/* Capacity guidance text */}
          <p className="text-[9px] text-text-muted mt-2 leading-relaxed">
            💡 <strong>Cara manage kapasitas:</strong> Admin add ad → slot otomatis terisi.
            {' '}{maxSlots} slot tersedia ({meta.renderType === 'CAROUSEL_MULTI' ? 'carousel rotate semua ads' :
              meta.renderType === 'LIST_STACKED' ? 'stacked list' :
              'pool rotation per pageview'}).
            {' '}Untuk tambah lebih dari {maxSlots} slot, butuh ubah frontend code (defer post-launch).
          </p>
        </div>
      </div>
    </div>
  );
}
