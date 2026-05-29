'use client';

/**
 * TeraLoka — BALAPOR Lifecycle Distribution Card
 * Fase 2.5 (29 Mei 2026) — "potret utuh" 8-state
 * ------------------------------------------------------------
 * Satu view non-overlap yang jumlahnya = total. Jawab pertanyaan
 * "150 laporan ini lagi nyangkut di mana?".
 *
 * Beda peran dengan ReportStats (lensa triage yg saling iris):
 *   - ReportStats  = "perlu perhatian" (urgent, pending>2j, stalemate)
 *   - card ini     = distribusi lengkap 8-state, mutually exclusive
 *
 * Data dari GET /admin/balapor/summary (summary.lifecycle) — global,
 * lepas dari filter. Tooltip hover jelasin tiap state (biar admin
 * lain gak bingung). Klik legenda → filter list ke state itu.
 */

import { Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LifecycleVizItem {
  key: string;
  label: string;
  /** Solid fill (aman light+dark). */
  color: string;
  /** Tooltip 1 baris. */
  desc: string;
}

/** Urutan = alur pipeline (masuk → proses → hasil → masalah → tolak). */
const LIFECYCLE_VIZ: LifecycleVizItem[] = [
  { key: 'pending',   label: 'Pending',   color: '#BA7517', desc: 'Menunggu tinjauan tim — belum diverifikasi.' },
  { key: 'reviewing', label: 'Reviewing', color: '#378ADD', desc: 'Sedang dimoderasi tim TeraLoka.' },
  { key: 'verified',  label: 'Verified',  color: '#1D9E75', desc: 'Tercatat resmi — belum tentu naik BAKABAR.' },
  { key: 'published', label: 'Published', color: '#7F77DD', desc: 'Sudah naik jadi berita di BAKABAR.' },
  { key: 'resolved',  label: 'Resolved',  color: '#639922', desc: 'Pelapor konfirmasi masalah sudah selesai di lapangan.' },
  { key: 'stalemate', label: 'Stalemate', color: '#D85A30', desc: 'Buntu: 3+ feedback negatif atau >14 hari tanpa kemajuan. Kandidat BAKABAR.' },
  { key: 'stale',     label: 'Stale',     color: '#888780', desc: 'Sunyi: >30 hari tanpa civic feedback sama sekali.' },
  { key: 'rejected',  label: 'Rejected',  color: '#E24B4A', desc: 'Gagal verifikasi / ditolak.' },
];

interface LifecycleDistributionProps {
  /** summary.lifecycle dari GET /admin/balapor/summary. */
  lifecycle: Record<string, number>;
  /** summary.total — denominator + label. */
  total: number;
  /** Klik state → apply lifecycle filter. */
  onStateClick?: (state: string) => void;
}

export function LifecycleDistribution({
  lifecycle,
  total,
  onStateClick,
}: LifecycleDistributionProps) {
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Layers size={15} className="text-balapor" />
          <h3 className="text-sm font-bold text-text">Distribusi Status Laporan</h3>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted bg-surface-muted px-2 py-1 rounded">
          {total.toLocaleString('id-ID')} total · non-overlap
        </span>
      </div>

      {/* Stacked bar (proporsi = jumlah, sums to total) */}
      <div className="flex h-3.5 w-full rounded-full overflow-hidden mb-4 bg-surface-muted">
        {LIFECYCLE_VIZ.map((s) => {
          const count = lifecycle[s.key] ?? 0;
          if (count === 0) return null;
          return (
            <div
              key={s.key}
              style={{ flexGrow: count, backgroundColor: s.color }}
              title={`${s.label}: ${count}`}
            />
          );
        })}
      </div>

      {/* Legend grid (clickable + tooltip) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {LIFECYCLE_VIZ.map((s) => {
          const count = lifecycle[s.key] ?? 0;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => onStateClick?.(s.key)}
              aria-label={`${s.label}: ${count} laporan. ${s.desc}`}
              className={cn(
                'group relative flex items-center gap-2 px-2.5 py-2 rounded-lg text-left',
                'border border-border bg-surface',
                'hover:bg-surface-muted hover:border-balapor/40 transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-balapor/30',
              )}
            >
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: s.color }}
                aria-hidden="true"
              />
              <span className="text-xs text-text-secondary flex-1 truncate">{s.label}</span>
              <span className="text-sm font-extrabold text-text tabular-nums">{count}</span>
              <span className="text-[10px] text-text-muted tabular-nums min-w-[28px] text-right">
                {pct(count)}%
              </span>

              {/* Tooltip hover */}
              <span
                role="tooltip"
                className={cn(
                  'pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20',
                  'w-max max-w-[220px] px-2.5 py-1.5 rounded-lg shadow-lg',
                  'bg-text text-surface text-[11px] leading-snug font-medium normal-case',
                  'opacity-0 group-hover:opacity-100 transition-opacity duration-150',
                )}
              >
                {s.desc}
              </span>
            </button>
          );
        })}
      </div>

      {/* Footnote */}
      <p className="text-[11px] text-text-muted leading-relaxed mt-3 pt-3 border-t border-border">
        8 status saling eksklusif — jumlah selalu = total. Klik untuk filter laporan.
      </p>
    </div>
  );
}
