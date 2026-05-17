'use client';

/**
 * TeraLoka — AdsTable (v5 — Sub-Phase 8-E-6 Mini C)
 * Mission 8 Sub-Phase 8-C-1 → 8-E-5 → 8-E-6
 * ------------------------------------------------------------
 * v5 Changes (Sub-Phase 8-E-6 Mini C):
 *   - ADD onPreview prop forwarded ke AdsTableRow
 *
 * History:
 *   - 17 Mei 2026: v3 (Sub-Phase 8-E-5) bulk selection UI prep
 *   - 17 Mei 2026: v4 (Sub-Phase 8-E-6) bulk action buttons enabled
 *   - 17 Mei 2026: v5 (Mini C) +onPreview prop forward
 */

import { List, Trash2, CheckSquare, Square, Minus, Pause, Play, Trash } from 'lucide-react';
import { cn } from '@/lib/utils';
import AdsTableRow from './AdsTableRow';
import type { AdRow } from './AdsCommandCenter';

export type BulkActionType = 'pause' | 'resume' | 'soft_delete';

export interface AdsTableProps {
  ads:         AdRow[];
  showDeleted: boolean;
  selectedAdIds: Set<string>;
  onSelectionChange: (newSelection: Set<string>) => void;
  onBulkAction: (action: BulkActionType, adIds: string[]) => void | Promise<void>;
  /** Sub-Phase 8-E-6 Mini C: preview modal trigger */
  onPreview: (ad: AdRow) => void;
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
  onBulkAction,
  onPreview,
  onTransition,
  onSoftDelete,
  onRestore,
  onReject,
  className,
}: AdsTableProps) {
  const allIds = ads.map((a) => a.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedAdIds.has(id));
  const someSelected = !allSelected && allIds.some((id) => selectedAdIds.has(id));
  const selectedCount = selectedAdIds.size;

  const selectedAds = ads.filter((a) => selectedAdIds.has(a.id));
  const pausableCount   = selectedAds.filter((a) => a.status === 'active' && !a.deleted_at).length;
  const resumableCount  = selectedAds.filter((a) => a.status === 'paused' && !a.deleted_at).length;
  const deletableCount  = selectedAds.filter((a) => !a.deleted_at).length;

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

  const handleBulkPause = () => {
    if (pausableCount === 0) return;
    const eligibleIds = selectedAds
      .filter((a) => a.status === 'active' && !a.deleted_at)
      .map((a) => a.id);
    onBulkAction('pause', eligibleIds);
  };

  const handleBulkResume = () => {
    if (resumableCount === 0) return;
    const eligibleIds = selectedAds
      .filter((a) => a.status === 'paused' && !a.deleted_at)
      .map((a) => a.id);
    onBulkAction('resume', eligibleIds);
  };

  const handleBulkDelete = () => {
    if (deletableCount === 0) return;
    const eligibleIds = selectedAds
      .filter((a) => !a.deleted_at)
      .map((a) => a.id);
    onBulkAction('soft_delete', eligibleIds);
  };

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

  return (
    <div
      className={cn(
        'bg-surface border border-border rounded-xl overflow-hidden',
        className
      )}
    >
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
              Klik icon mata untuk preview iklan
            </p>
          </div>
        </div>
      </div>

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

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleBulkPause}
              disabled={pausableCount === 0}
              className={cn(
                'inline-flex items-center gap-1 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wide transition-colors',
                'border border-status-info/30',
                pausableCount > 0
                  ? 'bg-status-info/12 text-status-info hover:bg-status-info/20 cursor-pointer'
                  : 'bg-status-info/12 text-status-info opacity-30 cursor-not-allowed'
              )}
              title={pausableCount > 0 ? `Pause ${pausableCount} ads aktif` : 'Tidak ada ads aktif yang dipilih'}
            >
              <Pause size={11} />
              Pause All
              {pausableCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-status-info/20 tabular-nums">
                  {pausableCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={handleBulkResume}
              disabled={resumableCount === 0}
              className={cn(
                'inline-flex items-center gap-1 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wide transition-colors',
                'border border-status-healthy/30',
                resumableCount > 0
                  ? 'bg-status-healthy/12 text-status-healthy hover:bg-status-healthy/20 cursor-pointer'
                  : 'bg-status-healthy/12 text-status-healthy opacity-30 cursor-not-allowed'
              )}
              title={resumableCount > 0 ? `Resume ${resumableCount} ads paused` : 'Tidak ada ads paused yang dipilih'}
            >
              <Play size={11} />
              Resume All
              {resumableCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-status-healthy/20 tabular-nums">
                  {resumableCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={deletableCount === 0}
              className={cn(
                'inline-flex items-center gap-1 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wide transition-colors',
                'border border-balapor/30',
                deletableCount > 0
                  ? 'bg-balapor/12 text-balapor hover:bg-balapor/20 cursor-pointer'
                  : 'bg-balapor/12 text-balapor opacity-30 cursor-not-allowed'
              )}
              title={deletableCount > 0 ? `Hapus ${deletableCount} ads ke Sampah (wajib reason)` : 'Tidak ada ads valid yang dipilih'}
            >
              <Trash size={11} />
              Hapus All
              {deletableCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-balapor/20 tabular-nums">
                  {deletableCount}
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[980px]">
          <thead className="bg-surface-muted/40">
            <tr>
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
                onPreview={onPreview}
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
