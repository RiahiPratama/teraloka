'use client';

/**
 * TeraLoka — SOS List Table
 * Bridge Sprint Day 12 Step 7 Batch B1 (10 Mei 2026)
 * ------------------------------------------------------------
 * Table list SOS dengan filter chips, search, pagination.
 *
 * Theming: CSS variables (auto-adaptive light + dark via .dark class).
 * Pattern reference: wilayah-tab.tsx, pelapor-tab.tsx (CSS vars convention).
 *
 * Hotfix evening 10 Mei 2026:
 *   - Replace bg-white/text-gray-* hardcoded → CSS variables
 */

import Link from 'next/link';
import { useState } from 'react';
import { Search, Inbox, ArrowRight } from 'lucide-react';
import type { AdminSosCall, AdminSosListResult } from '@/types/sos-admin';
import { STATUS_META } from '@/types/sos-admin';
import { EMERGENCY_TYPE_OPTIONS, type EmergencyType } from '@/types/sos';
import type { SosStatus } from '@/types/sos';

interface SosListTableProps {
  result: AdminSosListResult | null;
  isLoading: boolean;
  filterStatus: SosStatus | 'all' | 'active';
  filterType: EmergencyType | 'all';
  searchTerm: string;
  onFilterStatusChange: (status: SosStatus | 'all' | 'active') => void;
  onFilterTypeChange: (type: EmergencyType | 'all') => void;
  onSearchChange: (term: string) => void;
  onPageChange: (offset: number) => void;
}

export function SosListTable({
  result,
  isLoading,
  filterStatus,
  filterType,
  searchTerm,
  onFilterStatusChange,
  onFilterTypeChange,
  onSearchChange,
  onPageChange,
}: SosListTableProps) {
  const [searchInput, setSearchInput] = useState(searchTerm);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchChange(searchInput.trim());
  };

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* Filter Header */}
      <div
        className="p-4 space-y-3"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        {/* Status Filter Chips */}
        <div className="flex flex-wrap gap-2">
          <FilterChip
            active={filterStatus === 'all'}
            onClick={() => onFilterStatusChange('all')}
            label="Semua"
          />
          <FilterChip
            active={filterStatus === 'pending'}
            onClick={() => onFilterStatusChange('pending')}
            label="Menunggu"
            color="amber"
          />
          <FilterChip
            active={filterStatus === 'active'}
            onClick={() => onFilterStatusChange('active')}
            label="Aktif"
            color="blue"
          />
          <FilterChip
            active={filterStatus === 'resolved'}
            onClick={() => onFilterStatusChange('resolved')}
            label="Selesai"
            color="emerald"
          />
          <FilterChip
            active={filterStatus === 'false_alarm'}
            onClick={() => onFilterStatusChange('false_alarm')}
            label="False Alarm"
            color="gray"
          />
        </div>

        {/* Type filter + Search */}
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={filterType}
            onChange={(e) => onFilterTypeChange(e.target.value as EmergencyType | 'all')}
            className="px-3 py-2 rounded-xl text-sm font-medium focus:outline-none min-w-[160px]"
            style={{
              background: 'var(--color-surface)',
              color: 'var(--color-text-secondary)',
              border: '2px solid var(--color-border)',
            }}
          >
            <option value="all">Semua Jenis</option>
            {EMERGENCY_TYPE_OPTIONS.map((meta) => (
              <option key={meta.type} value={meta.type}>
                {meta.label}
              </option>
            ))}
          </select>

          <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
                style={{ color: 'var(--color-text-muted)' }}
              />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Cari display_id atau catatan..."
                className="w-full pl-9 pr-3 py-2 rounded-xl text-sm focus:outline-none"
                style={{
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  border: '2px solid var(--color-border)',
                }}
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-sm font-bold active:scale-95 transition"
              style={{
                background: 'var(--color-primary)',
                color: '#FFFFFF',
              }}
            >
              Cari
            </button>
          </form>
        </div>
      </div>

      {/* Table Content */}
      {isLoading ? (
        <SosListSkeleton />
      ) : !result || result.data.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr
                  style={{
                    background: 'var(--color-surface-muted)',
                    borderBottom: '1px solid var(--color-border)',
                  }}
                >
                  <th
                    className="text-left text-[10px] font-bold uppercase tracking-wider px-4 py-3"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    Display ID
                  </th>
                  <th
                    className="text-left text-[10px] font-bold uppercase tracking-wider px-4 py-3"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    Jenis
                  </th>
                  <th
                    className="text-left text-[10px] font-bold uppercase tracking-wider px-4 py-3"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    Status
                  </th>
                  <th
                    className="text-left text-[10px] font-bold uppercase tracking-wider px-4 py-3 hidden md:table-cell"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    GPS
                  </th>
                  <th
                    className="text-left text-[10px] font-bold uppercase tracking-wider px-4 py-3 hidden lg:table-cell"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    Waktu
                  </th>
                  <th
                    className="text-right text-[10px] font-bold uppercase tracking-wider px-4 py-3"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((sos) => (
                  <SosRow key={sos.id} sos={sos} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div
            className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            style={{ borderTop: '1px solid var(--color-border)' }}
          >
            <p
              className="text-xs"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Menampilkan {result.page_offset + 1}–
              {Math.min(result.page_offset + result.data.length, result.total)} dari {result.total} SOS
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => onPageChange(Math.max(result.page_offset - result.page_size, 0))}
                disabled={result.page_offset === 0}
                className="px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'var(--color-surface)',
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)',
                }}
              >
                ← Sebelumnya
              </button>
              <button
                onClick={() => onPageChange(result.page_offset + result.page_size)}
                disabled={result.page_offset + result.data.length >= result.total}
                className="px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'var(--color-surface)',
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)',
                }}
              >
                Selanjutnya →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Single Row Component ──────────────────────────────────────

function SosRow({ sos }: { sos: AdminSosCall }) {
  const typeMeta = EMERGENCY_TYPE_OPTIONS.find((m) => m.type === sos.emergency_type);
  const statusMeta = STATUS_META[sos.status];
  const StatusIcon = statusMeta.Icon;

  return (
    <tr
      className="hover:opacity-80 transition"
      style={{ borderBottom: '1px solid var(--color-border-muted)' }}
    >
      <td className="px-4 py-3">
        <Link
          href={`/admin/balapor/sos/${sos.id}`}
          className="font-mono text-sm font-bold hover:underline"
          style={{ color: 'var(--color-balapor)' }}
        >
          {sos.display_id}
        </Link>
      </td>
      <td className="px-4 py-3">
        {typeMeta && (
          <div className="flex items-center gap-2">
            <div
              className={`
                h-7 w-7 rounded-lg
                bg-gradient-to-br ${typeMeta.gradientFrom} ${typeMeta.gradientTo}
                flex items-center justify-center flex-shrink-0
              `}
            >
              <span
                className="material-symbols-outlined text-white text-sm leading-none"
                style={{ fontVariationSettings: "'FILL' 1, 'wght' 600" }}
              >
                {typeMeta.iconName}
              </span>
            </div>
            <span
              className="text-sm font-semibold"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {typeMeta.label}
            </span>
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        <span
          className={`
            inline-flex items-center gap-1
            px-2 py-1 rounded-lg text-xs font-bold
            ${statusMeta.bgClass} ${statusMeta.textClass} ${statusMeta.borderClass} border
          `}
        >
          <StatusIcon className="h-3 w-3" strokeWidth={2.5} />
          {statusMeta.label}
        </span>
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        {sos.latitude !== null && sos.longitude !== null ? (
          <span
            className="font-mono text-xs"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {sos.latitude.toFixed(4)}, {sos.longitude.toFixed(4)}
          </span>
        ) : (
          <span
            className="text-xs"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Tidak ada GPS
          </span>
        )}
      </td>
      <td
        className="px-4 py-3 hidden lg:table-cell text-xs"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {formatRelativeTime(sos.created_at)}
      </td>
      <td className="px-4 py-3 text-right">
        <Link
          href={`/admin/balapor/sos/${sos.id}`}
          className="inline-flex items-center gap-1 text-xs font-bold hover:underline"
          style={{ color: 'var(--color-balapor)' }}
        >
          Detail
          <ArrowRight className="h-3 w-3" strokeWidth={2.5} />
        </Link>
      </td>
    </tr>
  );
}

// ─── Filter Chip ───────────────────────────────────────────────

function FilterChip({
  active,
  onClick,
  label,
  color = 'gray',
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color?: 'amber' | 'blue' | 'emerald' | 'gray';
}) {
  // Active colors keep semantic per filter intent (intentional visualization)
  const activeColorMap: Record<string, string> = {
    amber: 'var(--color-status-warning)',
    blue: 'var(--color-status-info)',
    emerald: 'var(--color-status-healthy)',
    gray: 'var(--color-primary)',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
      style={
        active
          ? {
              background: activeColorMap[color],
              color: '#FFFFFF',
              border: `2px solid ${activeColorMap[color]}`,
            }
          : {
              background: 'var(--color-surface)',
              color: 'var(--color-text-secondary)',
              border: '2px solid var(--color-border)',
            }
      }
    >
      {label}
    </button>
  );
}

// ─── Empty State ───────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="py-16 text-center">
      <div
        className="inline-flex h-16 w-16 items-center justify-center rounded-full mb-3"
        style={{ background: 'var(--color-surface-muted)' }}
      >
        <Inbox
          className="h-7 w-7"
          strokeWidth={2}
          style={{ color: 'var(--color-text-muted)' }}
        />
      </div>
      <p
        className="text-sm font-bold"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        Belum ada SOS
      </p>
      <p
        className="text-xs mt-1"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Sesuaikan filter atau coba cari
      </p>
    </div>
  );
}

// ─── Loading Skeleton ──────────────────────────────────────────

function SosListSkeleton() {
  return (
    <div className="p-4 space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-3 animate-pulse">
          <div
            className="h-10 w-10 rounded-lg flex-shrink-0"
            style={{ background: 'var(--color-surface-muted)' }}
          />
          <div className="flex-1 space-y-2">
            <div
              className="h-3 rounded w-1/3"
              style={{ background: 'var(--color-surface-muted)' }}
            />
            <div
              className="h-2 rounded w-2/3"
              style={{ background: 'var(--color-border-muted)' }}
            />
          </div>
          <div
            className="h-6 w-20 rounded-lg"
            style={{ background: 'var(--color-surface-muted)' }}
          />
        </div>
      ))}
    </div>
  );
}

// ─── Helper: Format Relative Time ──────────────────────────────

function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return 'Baru saja';
  if (diffMin < 60) return `${diffMin}m lalu`;
  if (diffHour < 24) return `${diffHour}j lalu`;
  if (diffDay < 7) return `${diffDay}h lalu`;

  return new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
