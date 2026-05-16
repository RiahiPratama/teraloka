'use client';

/**
 * TeraLoka — AdsTable
 * Mission 8 Sub-Phase 8-C-1 (v2)
 * ------------------------------------------------------------
 * Container table untuk Daftar Iklan list.
 * Renders header + map AdsTableRow per ad.
 *
 * Empty state: 2 variants (no data vs filter result empty).
 *
 * History:
 *   - 16 Mei 2026: NEW v2
 */

import { List, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import AdsTableRow from './AdsTableRow';
import type { AdRow } from './AdsCommandCenter';

export interface AdsTableProps {
  ads:         AdRow[];
  showDeleted: boolean;
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
  onTransition,
  onSoftDelete,
  onRestore,
  onReject,
  className,
}: AdsTableProps) {
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
          {showDeleted
            ? 'Sampah kosong'
            : 'Belum ada iklan'}
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
      {/* Section header */}
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

      {/* Table with horizontal scroll on mobile */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[900px]">
          <thead className="bg-surface-muted/40">
            <tr>
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
