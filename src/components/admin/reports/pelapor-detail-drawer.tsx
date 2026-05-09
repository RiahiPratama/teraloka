'use client';

/**
 * TeraLoka — Pelapor Detail Drawer
 * Sub-Sprint 1C-C-13 Phase 3 (9 Mei 2026)
 * ------------------------------------------------------------
 * Drawer slide-from-right untuk display detail single pelapor.
 *
 * Sections:
 *   1. Header: masked identity + close button
 *   2. Stats: aggregate counters
 *   3. Reports History: list 50 reports terbaru (clickable)
 *   4. Audit History: list 10 last audit actions
 *   5. Actions Bar: Contact + Reveal (Phase 4 placeholder, disabled)
 *
 * Phase 3 Scope:
 *   - Read-only display
 *   - Action buttons VISIBLE tapi DISABLED dengan tooltip "Coming soon"
 *   - Phase 4 will wire actual reveal + contact handlers
 *
 * Keyboard:
 *   - ESC closes drawer
 *   - Tab navigation accessible
 */

import { useEffect, useState } from 'react';
import {
  X,
  Calendar,
  Smartphone,
  Globe,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Eye,
  MessageCircle,
  ScrollText,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ApiError, useApi } from '@/lib/api/client';
import { EmptyState } from '@/components/ui/empty-state';
import {
  type ReporterDetail,
  type ReporterReportSummary,
  type ReporterAuditEntry,
  getAnonymityLabel,
  getAnonymityColorClass,
  getAnonymityIcon,
  getAccessTypeLabel,
  getAccessTypeIcon,
  computeResolutionRate,
  formatRate,
} from '@/types/reporters';
import { timeAgo } from '@/types/reports';

interface PelaporDetailDrawerProps {
  reporterId: string | null;
  open: boolean;
  onClose: () => void;
  onToast: (message: string, ok: boolean) => void;
  /** Callback saat user click report row di history list */
  onReportClick?: (reportId: string) => void;
}

export function PelaporDetailDrawer({
  reporterId,
  open,
  onClose,
  onToast,
  onReportClick,
}: PelaporDetailDrawerProps) {
  const api = useApi();
  const [detail, setDetail] = useState<ReporterDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ── Fetch detail saat drawer open ── */
  useEffect(() => {
    if (!open || !reporterId || !api.token) return;

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    // NOTE: useApi client unwraps response.data automatically.
    // Backend ok(c, ReporterDetail) → client returns ReporterDetail directly.
    api
      .get<ReporterDetail>(
        `/admin/balapor/by-reporter/${reporterId}`,
        { signal: controller.signal },
      )
      .then((data) => {
        setDetail(data);
      })
      .catch((err) => {
        if (err instanceof ApiError) {
          setError(err.message);
          onToast(err.message, false);
        } else if (err.name !== 'AbortError') {
          setError('Gagal load detail pelapor');
          onToast('Gagal load detail pelapor', false);
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [open, reporterId, api, onToast]);

  /* ── Reset state saat drawer close ── */
  useEffect(() => {
    if (!open) {
      setDetail(null);
      setError(null);
    }
  }, [open]);

  /* ── ESC key listener ── */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className={cn(
          'fixed top-0 right-0 z-50 h-full w-full sm:w-[440px]',
          'bg-surface border-l border-border',
          'flex flex-col overflow-hidden',
          'animate-in slide-in-from-right duration-200',
        )}
        role="dialog"
        aria-label="Detail pelapor"
      >
        {/* ── Header ── */}
        <header className="shrink-0 px-5 py-4 border-b border-border flex items-center justify-between bg-surface-muted/40">
          <div className="flex items-center gap-2 min-w-0">
            <ScrollText size={18} className="text-balapor shrink-0" />
            <h2 className="text-sm font-bold text-text">Detail Pelapor</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-7 w-7 rounded-md flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-muted transition-colors"
            aria-label="Close drawer"
            title="Tutup (ESC)"
          >
            <X size={16} />
          </button>
        </header>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 size={24} className="text-balapor animate-spin" />
              <span className="text-xs text-text-muted">Loading detail...</span>
            </div>
          )}

          {error && !loading && (
            <div className="px-5 py-8">
              <EmptyState
                icon={<AlertCircle size={24} />}
                title="Gagal load detail"
                description={error}
                variant="muted"
                size="sm"
              />
            </div>
          )}

          {detail && !loading && (
            <>
              {/* ── Identity Section ── */}
              <section className="px-5 py-4 border-b border-border">
                <div className="flex items-start gap-3">
                  <div
                    className="h-12 w-12 rounded-full flex items-center justify-center bg-balapor/10 text-2xl shrink-0"
                    aria-hidden="true"
                  >
                    {getAnonymityIcon(detail.anonymity_level_dominant)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-base font-bold text-text truncate">
                        {detail.name_display || 'Pelapor'}
                      </h3>
                      <span
                        className={cn(
                          'shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide',
                          getAnonymityColorClass(detail.anonymity_level_dominant),
                        )}
                      >
                        {getAnonymityLabel(detail.anonymity_level_dominant)}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-text-muted">
                      {detail.phone_masked || '****'}
                    </p>
                    {detail.pseudonym_display && (
                      <p className="text-[11px] text-text-muted mt-0.5">
                        Pernah pakai pseudonim: <span className="italic">"{detail.pseudonym_display}"</span>
                      </p>
                    )}
                    {detail.joined_at && (
                      <p className="text-[11px] text-text-muted mt-0.5 flex items-center gap-1">
                        <Calendar size={10} />
                        Bergabung {new Date(detail.joined_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                    )}
                  </div>
                </div>
              </section>

              {/* ── Stats Section ── */}
              <StatsSection detail={detail} />

              {/* ── Reports History ── */}
              <ReportsHistorySection
                reports={detail.reports}
                onReportClick={onReportClick}
              />

              {/* ── Audit History ── */}
              <AuditHistorySection audit={detail.audit_history} />
            </>
          )}
        </div>

        {/* ── Actions Bar (Phase 4 placeholder) ── */}
        {detail && !loading && (
          <footer className="shrink-0 px-5 py-3 border-t border-border bg-surface-muted/40">
            <p className="text-[10px] text-text-muted mb-2 flex items-center gap-1">
              <AlertCircle size={10} />
              Aksi privasi-sensitif — wajib alasan + audit log otomatis
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled
                className={cn(
                  'flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg',
                  'text-[12px] font-semibold',
                  'bg-surface border border-border text-text-muted',
                  'cursor-not-allowed opacity-60',
                )}
                title="Phase 4 — coming soon"
              >
                <MessageCircle size={14} />
                Contact WA
              </button>
              <button
                type="button"
                disabled
                className={cn(
                  'flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg',
                  'text-[12px] font-semibold',
                  'bg-surface border border-border text-text-muted',
                  'cursor-not-allowed opacity-60',
                )}
                title="Phase 4 — coming soon"
              >
                <Eye size={14} />
                Reveal Identity
              </button>
            </div>
          </footer>
        )}
      </aside>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════
   Sub-components
   ════════════════════════════════════════════════════════════════ */

function StatsSection({ detail }: { detail: ReporterDetail }) {
  const agg = detail.aggregate;
  const resolutionRate = computeResolutionRate(agg);

  const items = [
    { label: 'Total', value: agg.total_reports, color: 'text-text' },
    { label: 'Pending', value: agg.pending_count, color: 'text-status-warning' },
    { label: 'Verified', value: agg.verified_count, color: 'text-status-healthy' },
    { label: 'Rejected', value: agg.rejected_count, color: 'text-status-critical' },
    { label: 'Published', value: agg.published_count, color: 'text-balapor' },
    { label: 'Spam', value: agg.spam_count, color: 'text-text-muted' },
  ];

  return (
    <section className="px-5 py-4 border-b border-border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-text uppercase tracking-wider">Statistik</h3>
        <span className="text-[10px] font-bold text-text-muted">
          Resolution: <span className="text-balapor">{formatRate(resolutionRate)}</span>
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="bg-surface-muted/40 border border-border rounded-lg px-2.5 py-2"
          >
            <div className={cn('text-base font-bold', item.color)}>
              {item.value}
            </div>
            <div className="text-[10px] text-text-muted">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Forensic indicators */}
      <div className="mt-3 flex items-center gap-3 text-[11px] text-text-muted">
        <span className="flex items-center gap-1">
          <Globe size={11} />
          {detail.aggregate.distinct_ips_count} distinct IP
        </span>
        <span className="text-text-subtle" aria-hidden="true">·</span>
        <span className="flex items-center gap-1">
          <Smartphone size={11} />
          {detail.aggregate.distinct_devices_count} distinct device
        </span>
      </div>
    </section>
  );
}

function ReportsHistorySection({
  reports,
  onReportClick,
}: {
  reports: ReporterReportSummary[];
  onReportClick?: (reportId: string) => void;
}) {
  if (reports.length === 0) {
    return (
      <section className="px-5 py-6 border-b border-border">
        <h3 className="text-xs font-bold text-text uppercase tracking-wider mb-2">Riwayat Laporan</h3>
        <EmptyState
          icon={<ScrollText size={20} />}
          title="Belum ada laporan"
          description="Pelapor ini belum punya laporan tercatat."
          variant="muted"
          size="sm"
        />
      </section>
    );
  }

  return (
    <section className="px-5 py-4 border-b border-border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-text uppercase tracking-wider">Riwayat Laporan</h3>
        <span className="text-[10px] font-bold text-text-muted">
          {reports.length} laporan
        </span>
      </div>

      <div className="space-y-1.5">
        {reports.map((r) => {
          const ReportIcon =
            r.status === 'verified' || r.status === 'published'
              ? CheckCircle2
              : r.status === 'rejected'
                ? XCircle
                : AlertCircle;
          const iconColor =
            r.status === 'verified' || r.status === 'published'
              ? 'text-status-healthy'
              : r.status === 'rejected'
                ? 'text-status-critical'
                : 'text-status-warning';

          const isClickable = Boolean(onReportClick);

          const inner = (
            <>
              <ReportIcon size={12} className={cn('shrink-0 mt-0.5', iconColor)} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  {r.display_id && (
                    <span className="font-mono text-[10px] text-text-muted shrink-0">
                      {r.display_id}
                    </span>
                  )}
                  <span className="text-[12px] font-semibold text-text truncate">
                    {r.title}
                  </span>
                </div>
                <div className="text-[10px] text-text-muted flex items-center gap-1.5 flex-wrap">
                  <span className="capitalize">{r.category || 'lainnya'}</span>
                  {r.location_label && (
                    <>
                      <span className="text-text-subtle" aria-hidden="true">·</span>
                      <span>{r.location_label}</span>
                    </>
                  )}
                  <span className="text-text-subtle" aria-hidden="true">·</span>
                  <span>{timeAgo(r.created_at)}</span>
                  {r.priority === 'urgent' && (
                    <>
                      <span className="text-text-subtle" aria-hidden="true">·</span>
                      <span className="text-status-critical font-bold">URGENT</span>
                    </>
                  )}
                </div>
              </div>
            </>
          );

          const baseClasses = 'flex items-start gap-2 px-2.5 py-2 rounded-lg';

          return isClickable ? (
            <button
              key={r.id}
              type="button"
              onClick={() => onReportClick?.(r.id)}
              className={cn(baseClasses, 'w-full text-left hover:bg-surface-muted/40 transition-colors')}
            >
              {inner}
            </button>
          ) : (
            <div key={r.id} className={baseClasses}>
              {inner}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function AuditHistorySection({ audit }: { audit: ReporterAuditEntry[] }) {
  if (audit.length === 0) {
    return (
      <section className="px-5 py-4 border-b border-border">
        <h3 className="text-xs font-bold text-text uppercase tracking-wider mb-2">Audit Trail</h3>
        <p className="text-[11px] text-text-muted italic">
          Belum pernah ada akses identitas/kontak ke pelapor ini.
        </p>
      </section>
    );
  }

  return (
    <section className="px-5 py-4">
      <h3 className="text-xs font-bold text-text uppercase tracking-wider mb-3">Audit Trail</h3>

      <div className="space-y-2">
        {audit.map((entry) => (
          <div
            key={entry.id}
            className="flex items-start gap-2 px-2.5 py-2 bg-surface-muted/40 border border-border rounded-lg"
          >
            <span className="shrink-0 text-base mt-0.5" aria-hidden="true">
              {getAccessTypeIcon(entry.access_type)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[11px] font-bold text-text">
                  {getAccessTypeLabel(entry.access_type)}
                </span>
                {entry.viewed_at && (
                  <span className="text-[10px] text-text-muted">
                    {timeAgo(entry.viewed_at)}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-text-muted italic">
                "{entry.reason}"
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
