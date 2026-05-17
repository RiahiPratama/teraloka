'use client';

/**
 * TeraLoka — AdsTable (v3 — Sub-Phase 8-E-5)
 * Mission 8 Sub-Phase 8-C-1 → 8-E-5
 * ------------------------------------------------------------
 * Container table untuk Daftar Iklan list.
 * Renders header + map AdsTableRow per ad.
 *
 * Sub-Phase 8-E-5 Changes:
 *   - ADD select-all checkbox di header
 *   - ADD bulk action footer bar (disabled placeholder — 8-E-6 will wire)
 *   - ADD props: selectedAdIds, onSelectionChange
 *
 * History:
 *   - 16 Mei 2026: v2 NEW
 *   - 17 Mei 2026: v3 (Sub-Phase 8-E-5) — bulk selection UI prep
 */

import { List, Trash2, CheckSquare, Square, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import AdsTableRow from './AdsTableRow';
import type { AdRow } from './AdsCommandCenter';

export interface AdsTableProps {
  ads:         AdRow[];
  showDeleted: boolean;
  /** Sub-Phase 8-E-5 NEW: bulk selection */
  selectedAdIds: Set<string>;
  onSelectionChange: (newSelection: Set<string>) => void;
  onTransition: (adId: string, to: string) => void | Promise<void>;
  onSoftDelete: (adId: string, title: string) => void | Promise<void>;
  onRestore:    (adId: string) => void | Promise<void>;
  onReject:     (adId: string, title: string) => void | Promise<void>;
  className?: string;
}

const TH_BASE =
  'px-3 py-2.5 text-left text-[10px] font-bold text-text-muted uppercase tracking-wider whitespace-nowrap';

export default function AdsTable({
  ads,
  showDeleted,
  selectedAdIds,
  onSelectionChange,
  onTransition,
  onSoftDelete,
  onRestore,
  onReject,
  className,
}: AdsTableProps) {
  // ─── Bulk selection logic ──────────────────────────────────────
  const allIds = ads.map((a) => a.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedAdIds.has(id));
  const someSelected = !allSelected && allIds.some((id) => selectedAdIds.has(id));
  const selectedCount = selectedAdIds.size;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(allIds));
    }
  };

  const handleRowSelect = (adId: string) => {
    const newSet = new Set(selectedAdIds);
    if (newSet.has(adId)) {
      newSet.delete(adId);
    } else {
      newSet.add(adId);
    }
    onSelectionChange(newSet);
  };

  const handleClearSelection = () => {
    onSelectionChange(new Set());
  };

  // ─── Empty state ────────────────────────────────────────────────
  if (ads.length === 0) {
    return (
      <div
        className={cn(
          'bg-surface border border-border rounded-xl',
          'flex flex-col items-center justify-center py-16 px-4',
          className
        )}
      >
        {showDeleted ? (
          <Trash2 className="text-text-subtle mb-3" size={36} />
        ) : (
          <List className="text-text-subtle mb-3" size={36} />
        )}
        <p className="text-[13px] font-semibold text-text">
          {showDeleted ? 'Sampah kosong' : 'Belum ada iklan'}
        </p>
        <p className="text-[11px] text-text-muted mt-1">
          {showDeleted
            ? 'Tidak ada iklan di Sampah saat ini.'
            : 'Iklan akan tampil di sini setelah advertiser onboarding.'}
        </p>
      </div>
    );
  }

  // ─── Main render ────────────────────────────────────────────────
  return (
    <div
      className={cn(
        'bg-surface border border-border rounded-xl overflow-hidden',
        className
      )}
    >
      {/* ── Section header ── */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-ads/12 text-ads shrink-0">
            <List size={14} />
          </div>
          <div className="min-w-0">
            <h3 className="text-[12px] font-bold text-text uppercase tracking-wider">
              Daftar Iklan ({ads.length})
            </h3>
            <p className="text-[10px] text-text-muted">
              Klik action button per row untuk aksi cepat
            </p>
          </div>
        </div>
      </div>

      {/* ── Sub-Phase 8-E-5: Bulk action bar (visible when selection > 0) ── */}
      {selectedCount > 0 && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-ads/8 border-b border-ads/20">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-ads">
              {selectedCount} dipilih
            </span>
            <button
              type="button"
              onClick={handleClearSelection}
              className="text-[10px] font-bold text-text-muted hover:text-text underline transition-colors"
            >
              Bersihkan
            </button>
          </div>

          {/* Bulk action buttons (DISABLED — wire di Sub-Sprint 8-E-6) */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled
              className={cn(
                'px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wide',
                'bg-status-info/12 text-status-info opacity-50 cursor-not-allowed',
                'border border-status-info/30'
              )}
              title="Bulk Pause — Coming Sub-Sprint 8-E-6"
            >
              ⏸ Pause All
            </button>
            <button
              type="button"
              disabled
              className={cn(
                'px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wide',
                'bg-status-healthy/12 text-status-healthy opacity-50 cursor-not-allowed',
                'border border-status-healthy/30'
              )}
              title="Bulk Resume — Coming Sub-Sprint 8-E-6"
            >
              ▶ Resume All
            </button>
            <button
              type="button"
              disabled
              className={cn(
                'px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wide',
                'bg-balapor/12 text-balapor opacity-50 cursor-not-allowed',
                'border border-balapor/30'
              )}
              title="Bulk Soft-Delete — Coming Sub-Sprint 8-E-6"
            >
              🗑 Hapus All
            </button>
            <span className="text-[9px] text-text-muted italic ml-1">
              (8-E-6)
            </span>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[920px]">
          <thead className="bg-surface-muted/40">
            <tr>
              {/* Checkbox column header */}
              <th className={cn(TH_BASE, 'w-10')}>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="flex items-center justify-center w-5 h-5 rounded hover:bg-surface-muted transition-colors"
                  title={allSelected ? 'Bersihkan pilihan' : 'Pilih semua'}
                >
                  {allSelected ? (
                    <CheckSquare size={14} className="text-ads" />
                  ) : someSelected ? (
                    <div className="flex items-center justify-center w-3.5 h-3.5 rounded bg-ads">
                      <Minus size={10} className="text-white" strokeWidth={3} />
                    </div>
                  ) : (
                    <Square size={14} className="text-text-muted" />
                  )}
                </button>
              </th>
              <th className={TH_BASE}>Iklan</th>
              <th className={TH_BASE}>Advertiser</th>
              <th className={TH_BASE}>Status</th>
              <th className={TH_BASE}>Posisi</th>
              <th className={TH_BASE}>Region</th>
              <th className={cn(TH_BASE, 'text-right')}>Impressi</th>
              <th className={cn(TH_BASE, 'text-right')}>CTR</th>
              <th className={cn(TH_BASE, 'text-right')}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {ads.map((ad) => (
              <AdsTableRow
                key={ad.id}
                ad={ad}
                isSelected={selectedAdIds.has(ad.id)}
                onSelectToggle={handleRowSelect}
                onTransition={onTransition}
                onSoftDelete={onSoftDelete}
                onRestore={onRestore}
                onReject={onReject}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
