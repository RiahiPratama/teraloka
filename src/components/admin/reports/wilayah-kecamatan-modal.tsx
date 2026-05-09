'use client';

/**
 * TeraLoka — Wilayah Kecamatan Drill-Down Modal
 * Sub-Sprint 1C-C-12 SMART (9 Mei 2026)
 * ------------------------------------------------------------
 * Modal pop-up triggered dari row kabupaten/kota di Tab Wilayah.
 * Fetches GET /admin/balapor/by-region/:kabupatenId/kecamatan
 * Display: kecamatan list dengan stats + sortable table.
 *
 * SMART navigation (extends 1C-C-12 baseline):
 *   - Click row kecamatan → navigate ke Live Incidents filtered kecamatan
 *   - Click "Lihat semua N laporan" footer → navigate ke Live Incidents kabupaten
 *   - Click "Belum Spesifik" notice → navigate ke Live Incidents kabupaten-level-only
 *
 * Pattern reference: CivicTimelineAdminModal (1C-C-11)
 */

import { useEffect, useState, useCallback } from 'react';
import { X, MapPin, RefreshCw, AlertTriangle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ApiError, useApi } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  formatRate,
  getRateColorClass,
  getVerifiedTotal,
  type KecamatanAggregation,
  type KecamatanStats,
} from '@/types/reports-by-region';

interface WilayahKecamatanModalProps {
  open: boolean;
  kabupatenId: string | null;
  kabupatenName: string | null;
  onClose: () => void;
  /** SMART: navigate ke Live Incidents filtered by kecamatan */
  onKecamatanNavigate?: (kecamatanId: string, kecamatanName: string) => void;
  /** SMART: navigate ke Live Incidents filtered by kabupaten-level-only (no kecamatan) */
  onKabupatenLevelNavigate?: () => void;
  /** SMART: navigate ke Live Incidents filtered by kabupaten subtree (semua kecamatan) */
  onKabupatenViewAll?: () => void;
}

export function WilayahKecamatanModal({
  open,
  kabupatenId,
  kabupatenName,
  onClose,
  onKecamatanNavigate,
  onKabupatenLevelNavigate,
  onKabupatenViewAll,
}: WilayahKecamatanModalProps) {
  const api = useApi();

  const [data, setData] = useState<KecamatanAggregation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ── Fetch effect ── */
  useEffect(() => {
    if (!open || !kabupatenId || !api.token) return;

    const controller = new AbortController();

    setLoading(true);
    setError(null);

    api
      .get<KecamatanAggregation>(
        `/admin/balapor/by-region/${kabupatenId}/kecamatan`,
        { signal: controller.signal },
      )
      .then((result) => {
        setData(result);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        const message =
          err instanceof ApiError
            ? err.message
            : 'Gagal memuat data kecamatan';
        setError(message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [open, kabupatenId, api]);

  /* ── Reset state saat modal close ── */
  useEffect(() => {
    if (!open) {
      setData(null);
      setError(null);
    }
  }, [open]);

  const handleRefresh = useCallback(() => {
    if (!kabupatenId || !api.token) return;
    setLoading(true);
    setError(null);
    api
      .get<KecamatanAggregation>(
        `/admin/balapor/by-region/${kabupatenId}/kecamatan`,
      )
      .then(setData)
      .catch((err) => {
        const message =
          err instanceof ApiError ? err.message : 'Gagal refresh data';
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [kabupatenId, api]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="wilayah-modal-title"
    >
      <div
        className="bg-surface border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-lg bg-balapor/12 flex items-center justify-center shrink-0">
              <MapPin size={18} className="text-balapor" />
            </div>
            <div className="min-w-0">
              <h2
                id="wilayah-modal-title"
                className="text-base font-bold text-text truncate"
              >
                Detail Kecamatan
              </h2>
              <p className="text-xs text-text-muted truncate">
                {kabupatenName ?? '...'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRefresh}
              leftIcon={<RefreshCw size={12} />}
              disabled={loading}
            >
              Refresh
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 rounded-lg flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-muted transition-colors"
              aria-label="Tutup"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && !data && (
            <div className="flex items-center justify-center py-12">
              <RefreshCw size={20} className="text-text-muted animate-spin" />
              <span className="ml-3 text-sm text-text-muted">
                Memuat data kecamatan...
              </span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 rounded-xl bg-status-critical/8 border border-status-critical/20 px-4 py-3">
              <AlertTriangle
                size={16}
                className="text-status-critical shrink-0 mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-status-critical">
                  Gagal memuat data
                </p>
                <p className="text-xs text-text-muted mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {data && !loading && !error && (
            <KecamatanContent
              data={data}
              onKecamatanNavigate={onKecamatanNavigate}
              onKabupatenLevelNavigate={onKabupatenLevelNavigate}
              onKabupatenViewAll={onKabupatenViewAll}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Inner content ── */

interface KecamatanContentProps {
  data: KecamatanAggregation;
  onKecamatanNavigate?: (kecamatanId: string, kecamatanName: string) => void;
  onKabupatenLevelNavigate?: () => void;
  onKabupatenViewAll?: () => void;
}

function KecamatanContent({
  data,
  onKecamatanNavigate,
  onKabupatenLevelNavigate,
  onKabupatenViewAll,
}: KecamatanContentProps) {
  const totalKecamatan = data.kecamatan.length;
  const withReports = data.meta.total_kecamatan_with_reports;
  const aggregated = data.meta.total_reports_aggregated;
  const unmapped = data.meta.unmapped_reports_count;
  const totalReports = aggregated + unmapped;

  return (
    <div className="space-y-4">
      {/* Stats banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Kecamatan" value={totalKecamatan} />
        <StatCard
          label="Dgn Laporan"
          value={withReports}
          accent={withReports > 0 ? 'positive' : 'muted'}
        />
        <StatCard label="Total Laporan" value={aggregated} accent="balapor" />
        <StatCard
          label="Belum Spesifik"
          value={unmapped}
          accent={unmapped > 0 ? 'caution' : 'muted'}
          tooltip="Laporan yang attribut ke level kabupaten saja, tanpa info kecamatan"
        />
      </div>

      {/* SMART CTA: Lihat semua laporan kabupaten */}
      {totalReports > 0 && onKabupatenViewAll && (
        <button
          type="button"
          onClick={onKabupatenViewAll}
          className={cn(
            'w-full flex items-center justify-between gap-3',
            'rounded-xl bg-balapor/8 border border-balapor/20 px-4 py-3',
            'hover:bg-balapor/12 transition-colors group',
            'text-left',
          )}
        >
          <div>
            <p className="text-sm font-bold text-balapor">
              Lihat semua {totalReports} laporan di {data.kabupaten.name}
            </p>
            <p className="text-[11px] text-text-muted mt-0.5">
              Buka Live Incidents dengan filter wilayah aktif
            </p>
          </div>
          <ArrowRight
            size={18}
            className="text-balapor shrink-0 group-hover:translate-x-1 transition-transform"
          />
        </button>
      )}

      {/* Empty state — no kecamatan have reports + no unmapped */}
      {withReports === 0 && unmapped === 0 && (
        <EmptyState
          icon={<MapPin size={32} className="text-text-muted" />}
          title="Belum ada laporan"
          description="Belum ada laporan warga di kabupaten/kota ini"
        />
      )}

      {/* SMART: Unmapped notice — clickable */}
      {unmapped > 0 && (
        <button
          type="button"
          onClick={onKabupatenLevelNavigate}
          disabled={!onKabupatenLevelNavigate}
          className={cn(
            'w-full flex items-center justify-between gap-3',
            'rounded-xl bg-status-caution/8 border border-status-caution/20 px-4 py-3',
            'text-left',
            onKabupatenLevelNavigate
              ? 'hover:bg-status-caution/12 transition-colors group cursor-pointer'
              : 'cursor-default',
          )}
        >
          <div className="flex-1">
            <p className="text-xs text-text-secondary">
              <span className="font-semibold text-status-caution">
                {unmapped} laporan
              </span>{' '}
              di kabupaten/kota ini hanya teratribut ke level kabupaten — tidak
              ada info kecamatan spesifik.
            </p>
            {onKabupatenLevelNavigate && (
              <p className="text-[11px] text-status-caution font-semibold mt-1">
                Klik untuk lihat laporan ini di Live Incidents →
              </p>
            )}
          </div>
          {onKabupatenLevelNavigate && (
            <ArrowRight
              size={16}
              className="text-status-caution shrink-0 group-hover:translate-x-1 transition-transform"
            />
          )}
        </button>
      )}

      {/* Table */}
      {totalKecamatan > 0 && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-muted text-[11px] uppercase font-bold text-text-muted">
                  <th className="px-4 py-3 text-left">Kecamatan</th>
                  <th className="px-3 py-3 text-right">Total</th>
                  <th className="px-3 py-3 text-right">Urgent</th>
                  <th className="px-3 py-3 text-right">Verified</th>
                  <th className="px-3 py-3 text-right">Civic</th>
                  <th className="px-3 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {data.kecamatan.map((k) => (
                  <KecamatanRow
                    key={k.kecamatan_id}
                    stats={k}
                    onClick={
                      onKecamatanNavigate && k.total_reports > 0
                        ? () =>
                            onKecamatanNavigate(
                              k.kecamatan_id,
                              k.kecamatan_name,
                            )
                        : undefined
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Stat card ── */

function StatCard({
  label,
  value,
  accent = 'default',
  tooltip,
}: {
  label: string;
  value: number;
  accent?: 'default' | 'balapor' | 'positive' | 'caution' | 'muted';
  tooltip?: string;
}) {
  const accentClasses = {
    default: 'text-text',
    balapor: 'text-balapor',
    positive: 'text-status-positive',
    caution: 'text-status-caution',
    muted: 'text-text-muted',
  };

  return (
    <div
      className="bg-surface-muted/50 border border-border rounded-lg px-4 py-3"
      title={tooltip}
    >
      <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
        {label}
      </div>
      <div
        className={cn(
          'text-2xl font-extrabold mt-1 tabular-nums',
          accentClasses[accent],
        )}
      >
        {value}
      </div>
    </div>
  );
}

/* ── Kecamatan row (SMART: clickable kalau ada onClick) ── */

interface KecamatanRowProps {
  stats: KecamatanStats;
  onClick?: () => void;
}

function KecamatanRow({ stats, onClick }: KecamatanRowProps) {
  const verifiedTotal = getVerifiedTotal(stats);
  const isEmpty = stats.total_reports === 0;
  const isClickable = !!onClick && !isEmpty;

  return (
    <tr
      className={cn(
        'border-t border-border transition-colors',
        isEmpty
          ? 'opacity-50 cursor-default'
          : isClickable
            ? 'cursor-pointer hover:bg-balapor/8 group'
            : 'hover:bg-surface-muted/30',
      )}
      onClick={isClickable ? onClick : undefined}
    >
      <td className="px-4 py-3">
        <div className="font-semibold text-text">{stats.kecamatan_name}</div>
        {stats.bps_code && (
          <div className="text-[10px] text-text-muted mt-0.5 font-mono">
            {stats.bps_code}
          </div>
        )}
      </td>
      <td className="px-3 py-3 text-right">
        <span
          className={cn(
            'tabular-nums font-bold',
            isEmpty ? 'text-text-muted' : 'text-text',
          )}
        >
          {stats.total_reports}
        </span>
      </td>
      <td className="px-3 py-3 text-right">
        {stats.urgent > 0 ? (
          <span className="tabular-nums font-bold text-status-critical">
            {stats.urgent}
          </span>
        ) : (
          <span className="text-text-muted">—</span>
        )}
      </td>
      <td className="px-3 py-3 text-right">
        <span
          className={cn(
            'tabular-nums text-xs font-semibold',
            getRateColorClass(stats.verified_rate, stats.total_reports > 0),
          )}
        >
          {formatRate(stats.verified_rate, stats.total_reports > 0)}
        </span>
      </td>
      <td className="px-3 py-3 text-right">
        <span
          className={cn(
            'tabular-nums text-xs font-semibold',
            getRateColorClass(stats.civic_resolution_rate, verifiedTotal > 0),
          )}
        >
          {formatRate(stats.civic_resolution_rate, verifiedTotal > 0)}
        </span>
      </td>
      <td className="px-3 py-3 text-right">
        {isClickable && (
          <ArrowRight
            size={14}
            className="text-balapor inline-block opacity-0 group-hover:opacity-100 transition-opacity"
          />
        )}
      </td>
    </tr>
  );
}
