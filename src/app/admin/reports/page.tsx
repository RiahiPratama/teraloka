'use client';

/**
 * TeraLoka — Admin Reports Page
 * Phase 2 · Batch 7b2 — Reports Live + Map
 * ------------------------------------------------------------
 * Admin BALAPOR command center — incident reports management.
 *
 * Batch 7b2 scope (current):
 * - BALAPOR map (CircleMarker by priority) aktif di Overview + Live tab
 * - Live Incidents tab ENABLED — grouped by category + priority picker
 * - Right sidebar Live tab: mini map + top locations + alert clusters
 * - Priority change via PATCH /admin/reports/:id/priority
 *
 * Previous batches:
 * - 7b1: Shell + Overview tab (stats, filters, top incidents list, sidebar)
 *
 * Batch 7b3 scope (next):
 * - Deep Dive analytics tab (tren, category chart, peak hour, user segments)
 * - Cleanup: delete AdminReportspage.tsx
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  BellRing,
  CheckCircle2,
  RefreshCw,
  Siren,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ApiError, useApi } from '@/lib/api/client';
import {
  computeReportStats,
  sortReportsByPriority,
  type Report,
  type ReportPriority,
} from '@/types/reports';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { BalaporMap } from '@/components/admin/reports/balapor-map';
import { CategoryFilter } from '@/components/admin/reports/category-filter';
import { ReportGroupList } from '@/components/admin/reports/report-group-list';
import { ReportRow } from '@/components/admin/reports/report-row';
import { ReportSidebar } from '@/components/admin/reports/report-sidebar';
import { ReportStats } from '@/components/admin/reports/report-stats';

/* ─── API response shape ─── */

interface ReportsListResponse {
  data: Report[];
  total: number;
  limit?: number;
  offset?: number;
}

/* ─── Tab state ─── */

type TabKey = 'overview' | 'live' | 'deepdive';

interface TabDef {
  key: TabKey;
  label: string;
  /** Disabled → tampilin placeholder, tidak bisa klik */
  disabled?: boolean;
  badge?: string;
}

/* ─── Toast ─── */

interface ToastData {
  message: string;
  ok: boolean;
}

/* ─── Priority filter options (inline — biar dapat hitung count) ─── */

const PRIORITY_OPTIONS = [
  { value: '', label: 'Semua Prioritas' },
  { value: 'urgent', label: '🔴 Urgent' },
  { value: 'high', label: '🟠 High' },
  { value: 'normal', label: '🟢 Normal' },
];

/* ─── Page ─── */

export default function AdminReportsPage() {
  const api = useApi();

  // Data state
  const [reports, setReports] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  // Filter state
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  // UI state
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [toast, setToast] = useState<ToastData | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Auto-refresh interval ref
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Fetch reports ── */
  useEffect(() => {
    if (!api.token) return;
    const controller = new AbortController();

    setLoading(true);
    setError(null);

    const params: Record<string, string | number> = { limit: 100 };
    if (priorityFilter) params.priority = priorityFilter;
    if (categoryFilter) params.category = categoryFilter;

    api
      .get<ReportsListResponse>('/admin/reports', {
        params,
        signal: controller.signal,
      })
      .then((data) => {
        setReports(data.data);
        setTotal(data.total);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(
          err instanceof ApiError ? err.message : 'Gagal memuat laporan'
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [api, priorityFilter, categoryFilter, retryNonce]);

  /* ── Auto-refresh 60s (only on overview/live, not deepdive) ── */
  useEffect(() => {
    if (activeTab === 'deepdive') return;
    refreshTimerRef.current = setInterval(() => {
      setRetryNonce((n) => n + 1);
    }, 60_000);
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [activeTab]);

  /* ── Toast auto-dismiss ── */
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleRefresh = useCallback(() => {
    setRetryNonce((n) => n + 1);
  }, []);

  const showToast = useCallback((message: string, ok: boolean) => {
    setToast({ message, ok });
  }, []);

  /* ── Derivations ── */
  const stats = computeReportStats(reports, total);
  const sortedReports = sortReportsByPriority(reports);
  const topIncidents = sortedReports.slice(0, 5);

  const tabs: TabDef[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'live', label: 'Live Incidents' },
    { key: 'deepdive', label: 'Deep Dive', disabled: true, badge: 'Segera' },
  ];

  /* ── Priority change handler ── */
  const handleChangePriority = useCallback(
    async (report: Report, newPriority: ReportPriority) => {
      if (newPriority === report.priority) return;

      const loadingKey = `${report.id}priority`;
      setActionLoadingId(loadingKey);

      try {
        await api.patch(`/admin/reports/${report.id}/priority`, {
          priority: newPriority,
        });
        const titlePreview = report.title.slice(0, 30) + (report.title.length > 30 ? '…' : '');
        showToast(`Priority "${titlePreview}" → ${newPriority}`, true);
        // Trigger refetch
        setRetryNonce((n) => n + 1);
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : 'Gagal mengubah priority';
        showToast(message, false);
      } finally {
        setActionLoadingId(null);
      }
    },
    [api]
  );

  const handleResetFilters = useCallback(() => {
    setPriorityFilter('');
    setCategoryFilter('');
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* ── Toast ── */}
      {toast && (
        <div
          className="fixed top-20 right-6 z-[60] pointer-events-none"
          role="status"
          aria-live="polite"
        >
          <div
            className={cn(
              'flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg',
              'font-semibold text-sm pointer-events-auto',
              toast.ok
                ? 'bg-status-healthy text-white'
                : 'bg-status-critical text-white'
            )}
          >
            {toast.ok ? (
              <CheckCircle2 size={16} className="shrink-0" />
            ) : (
              <XCircle size={16} className="shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-text tracking-tight flex items-center gap-2">
            <Siren size={24} className="text-balapor" />
            BALAPOR Command Center
          </h1>
          <p className="text-sm text-text-muted mt-1 flex items-center gap-2 flex-wrap">
            <span>
              {loading
                ? 'Memuat data…'
                : `${total.toLocaleString('id-ID')} total laporan`}
            </span>
            {stats.unhandled > 0 && !loading && (
              <>
                <span className="text-text-subtle">·</span>
                <span className="text-status-critical font-semibold">
                  {stats.unhandled} belum ditangani &gt; 2 jam
                </span>
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            leftIcon={<RefreshCw size={12} />}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="danger"
            size="sm"
            leftIcon={<BellRing size={12} />}
            disabled
            title="Akan tersedia di batch berikutnya"
          >
            Siaran Darurat
          </Button>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl bg-status-critical/8 border border-status-critical/20 px-4 py-3">
          <AlertCircle
            size={18}
            className="text-status-critical shrink-0 mt-0.5"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-status-critical">
              Gagal memuat laporan
            </p>
            <p className="text-xs text-text-muted mt-0.5">{error}</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            leftIcon={<RefreshCw size={12} />}
          >
            Retry
          </Button>
        </div>
      )}

      {/* ── Tab bar ── */}
      <div className="flex gap-1 border-b border-border" role="tablist">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => !tab.disabled && setActiveTab(tab.key)}
              disabled={tab.disabled}
              className={cn(
                'px-4 py-2 -mb-px',
                'text-sm font-semibold',
                'border-b-2 transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/20',
                isActive
                  ? 'text-balapor border-balapor'
                  : tab.disabled
                    ? 'text-text-subtle border-transparent cursor-not-allowed'
                    : 'text-text-muted border-transparent hover:text-text hover:border-border'
              )}
            >
              <span className="flex items-center gap-2">
                {tab.label}
                {tab.badge && (
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider',
                      tab.disabled
                        ? 'bg-surface-muted text-text-subtle'
                        : 'bg-balapor/12 text-balapor'
                    )}
                  >
                    {tab.badge}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Stats row ── */}
      {!error && (
        <ReportStats stats={stats} loading={loading && reports.length === 0} />
      )}

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
          {/* Left column */}
          <div className="space-y-5 min-w-0">
            {/* Category filter */}
            <div className="bg-surface border border-border rounded-xl p-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2.5">
                Filter Kategori
              </div>
              <CategoryFilter
                value={categoryFilter}
                onChange={setCategoryFilter}
              />
            </div>

            {/* Priority filter */}
            <div className="bg-surface border border-border rounded-xl p-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2.5">
                Filter Prioritas
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {PRIORITY_OPTIONS.map((opt) => {
                  const isActive = priorityFilter === opt.value;
                  return (
                    <button
                      key={opt.value || 'all'}
                      type="button"
                      onClick={() => setPriorityFilter(opt.value)}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full',
                        'text-[11px] font-semibold whitespace-nowrap',
                        'border transition-colors',
                        isActive
                          ? 'bg-balapor text-white border-balapor'
                          : 'bg-surface text-text-secondary border-border hover:bg-surface-muted'
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Top Incidents */}
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-muted/40 rounded-t-xl">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-status-critical animate-pulse" />
                  <span className="text-sm font-bold text-text">
                    Top Incidents
                  </span>
                  <span className="text-[10px] text-text-muted">
                    (urutan prioritas)
                  </span>
                </div>
                <button
                  type="button"
                  disabled
                  className="text-[11px] font-semibold text-text-subtle cursor-not-allowed"
                  title="Live Incidents tab tersedia di batch berikutnya"
                >
                  Lihat Semua →
                </button>
              </div>

              {loading && reports.length === 0 ? (
                <div className="divide-y divide-border">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-4 py-4"
                    >
                      <div className="h-2.5 w-2.5 rounded-full bg-surface-muted animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-48 bg-surface-muted animate-pulse rounded" />
                        <div className="h-2.5 w-32 bg-surface-muted animate-pulse rounded" />
                      </div>
                      <div className="h-5 w-16 bg-surface-muted animate-pulse rounded-full" />
                    </div>
                  ))}
                </div>
              ) : topIncidents.length === 0 ? (
                <div className="py-10 px-6">
                  <EmptyState
                    icon={<CheckCircle2 size={32} />}
                    title="Semua beres!"
                    description={
                      priorityFilter || categoryFilter
                        ? 'Tidak ada laporan dengan filter ini.'
                        : 'Belum ada laporan masuk. Enjoy the peace.'
                    }
                    variant="muted"
                    tone="healthy"
                    size="sm"
                    action={
                      priorityFilter || categoryFilter
                        ? {
                            label: 'Reset filter',
                            onClick: () => {
                              setPriorityFilter('');
                              setCategoryFilter('');
                            },
                          }
                        : undefined
                    }
                  />
                </div>
              ) : (
                topIncidents.map((r) => (
                  <ReportRow key={r.id} report={r} variant="full" />
                ))
              )}
            </div>

            {/* Map */}
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Siren size={14} className="text-balapor" />
                  <span className="text-sm font-bold text-text">
                    Peta Laporan Maluku Utara
                  </span>
                </div>
                <span className="text-[11px] text-text-muted tabular-nums">
                  {reports.filter((r) => r.latitude && r.longitude).length} dari{' '}
                  {reports.length} berkoordinat
                </span>
              </div>
              <div className="p-3">
                <BalaporMap
                  reports={reports}
                  height={380}
                  loading={loading && reports.length === 0}
                />
              </div>
            </div>
          </div>

          {/* Right column — sidebar */}
          <div className="space-y-4">
            {/* Total counter widget */}
            <div className="bg-surface border border-border rounded-xl p-5">
              <div className="flex items-baseline justify-between mb-4">
                <span className="text-3xl font-extrabold text-text tracking-tight">
                  {total.toLocaleString('id-ID')}
                </span>
                <span className="text-[11px] text-text-muted">
                  Total Hari Ini
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xl font-extrabold text-status-critical tabular-nums">
                    {stats.urgent}
                  </div>
                  <div className="text-[10px] text-text-muted">Urgent</div>
                </div>
                <div>
                  <div className="text-xl font-extrabold text-status-warning tabular-nums">
                    {stats.unhandled}
                  </div>
                  <div className="text-[10px] text-text-muted">
                    Belum Ditangani
                  </div>
                </div>
              </div>
            </div>

            {/* Top Incidents summary */}
            <div className="bg-surface border border-border rounded-xl p-5">
              <div className="text-sm font-bold text-text mb-3">
                Top Incidents
              </div>
              {topIncidents.length === 0 ? (
                <p className="text-xs text-text-muted">Belum ada data</p>
              ) : (
                <div className="space-y-3">
                  {topIncidents.map((r) => (
                    <div key={r.id} className="flex items-center gap-2.5">
                      <div
                        className={cn(
                          'h-2 w-2 rounded-full shrink-0',
                          r.priority === 'urgent' && 'bg-status-critical',
                          r.priority === 'high' && 'bg-status-warning',
                          r.priority === 'normal' && 'bg-status-healthy'
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold text-text truncate leading-tight">
                          {r.title}
                        </p>
                        <p className="text-[10px] text-text-muted leading-tight mt-0.5">
                          {r.location || 'Lokasi tidak tercatat'} ·{' '}
                          {timeAgoCompact(r.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Alert banner — tampil cuma kalau ada urgent */}
            {stats.urgent > 0 && (
              <div className="bg-status-critical/8 border border-status-critical/20 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Siren size={16} className="text-status-critical" />
                  <span className="text-sm font-bold text-status-critical">
                    Alert
                  </span>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Ada{' '}
                  <strong className="text-status-critical">
                    {stats.urgent} laporan URGENT
                  </strong>{' '}
                  yang perlu segera ditangani.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPriorityFilter('urgent')}
                  className="mt-3"
                >
                  Filter Urgent
                </Button>
              </div>
            )}

            {/* Quick link */}
            <Link
              href="/office/newsroom/balapor"
              className={cn(
                'block bg-surface border border-border rounded-xl p-4',
                'transition-colors hover:bg-surface-muted hover:border-balapor/30',
                'group'
              )}
            >
              <div className="text-sm font-bold text-text mb-1">
                📋 Incident Management
              </div>
              <p className="text-[11px] text-text-muted leading-relaxed">
                Buka portal wartawan untuk verifikasi dan tindak laporan.
              </p>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-balapor mt-2 group-hover:gap-1.5 transition-all">
                Buka Portal
                <ArrowRight size={11} />
              </span>
            </Link>
          </div>
        </div>
      )}

      {/* ── LIVE TAB ── */}
      {activeTab === 'live' && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
          {/* LEFT — grouped list */}
          <div className="space-y-4 min-w-0">
            {/* Filter bar */}
            <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
              {/* Category */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2">
                  Filter Kategori
                </div>
                <CategoryFilter
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                />
              </div>
              {/* Priority */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2">
                  Filter Prioritas
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {PRIORITY_OPTIONS.map((opt) => {
                    const isActive = priorityFilter === opt.value;
                    const badge =
                      opt.value === 'urgent'
                        ? stats.urgent
                        : opt.value === 'high'
                          ? stats.high
                          : opt.value === 'normal'
                            ? stats.normal
                            : null;
                    return (
                      <button
                        key={opt.value || 'all'}
                        type="button"
                        onClick={() => setPriorityFilter(opt.value)}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full',
                          'text-[11px] font-semibold whitespace-nowrap',
                          'border transition-colors',
                          isActive
                            ? 'bg-balapor text-white border-balapor'
                            : 'bg-surface text-text-secondary border-border hover:bg-surface-muted'
                        )}
                      >
                        {opt.label}
                        {badge !== null && badge > 0 && (
                          <span
                            className={cn(
                              'ml-0.5 px-1.5 py-0 rounded-full',
                              'text-[9px] font-extrabold',
                              'tabular-nums',
                              isActive
                                ? 'bg-white/25 text-white'
                                : 'bg-surface-muted text-text-muted'
                            )}
                          >
                            {badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Grouped list */}
            {loading && reports.length === 0 ? (
              <div className="bg-surface border border-border rounded-xl p-6">
                <div className="flex items-center gap-3 py-2">
                  <div className="h-5 w-5 rounded-full border-2 border-balapor border-t-transparent animate-spin" />
                  <span className="text-sm text-text-muted">
                    Memuat laporan…
                  </span>
                </div>
              </div>
            ) : (
              <ReportGroupList
                reports={reports}
                onChangePriority={handleChangePriority}
                actionLoadingId={actionLoadingId}
                previewPerGroup={3}
                hasFilter={Boolean(priorityFilter || categoryFilter)}
                onResetFilter={handleResetFilters}
              />
            )}
          </div>

          {/* RIGHT — mini map + widgets */}
          <div className="space-y-4">
            {/* Mini map */}
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                <Siren size={14} className="text-balapor" />
                <span className="text-sm font-bold text-text">Live Map</span>
              </div>
              <div className="p-3">
                <BalaporMap
                  reports={reports}
                  height={280}
                  loading={loading && reports.length === 0}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 px-3 pb-3">
                {[
                  {
                    label: 'Urgent',
                    value: stats.urgent,
                    color: 'text-status-critical',
                  },
                  {
                    label: 'Total',
                    value: total,
                    color: 'text-balapor',
                  },
                  {
                    label: 'Normal',
                    value: stats.normal,
                    color: 'text-status-healthy',
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="text-center py-2 rounded-lg bg-surface-muted/50"
                  >
                    <div
                      className={cn(
                        'text-base font-extrabold tabular-nums',
                        s.color
                      )}
                    >
                      {s.value.toLocaleString('id-ID')}
                    </div>
                    <div className="text-[9px] text-text-muted">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Locations + Alert Clusters */}
            <ReportSidebar reports={reports} />
          </div>
        </div>
      )}

      {/* ── DEEP DIVE TAB — placeholder untuk Batch 7b3 ── */}
      {activeTab === 'deepdive' && !error && (
        <EmptyState
          variant="coming"
          tone="info"
          icon={<Siren size={28} />}
          title="Deep Dive Analytics"
          description="Tab ini akan tampilkan analytics 30 hari: tren, category chart, peak hour, user segments, alert clusters."
          helper="Batch 7b3 — Session after next"
        />
      )}

      {/* ── Batch 7b2 notice ── */}
      {!error && !loading && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-balapor/8 border border-balapor/20">
          <AlertCircle size={14} className="text-balapor shrink-0" />
          <p className="text-[11px] text-text-secondary flex-1">
            <span className="font-semibold">Overview + Live Incidents aktif.</span>{' '}
            Deep Dive analytics akan tersedia di batch berikutnya.
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── Local helper — compact time (belum perlu full timeAgo di sidebar) ─── */

function timeAgoCompact(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}j`;
  return `${Math.floor(h / 24)}d`;
}
