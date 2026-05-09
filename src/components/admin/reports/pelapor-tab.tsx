'use client';

/**
 * TeraLoka — Pelapor Tab (Reporter Aggregation)
 * Sub-Sprint 1C-C-13 Phase 3 (9 Mei 2026)
 * Updated: 9 Mei 2026 — TD-061-A + TD-061-B fix
 *   - TD-061-A: Wire onReportClick → ReportDetailModal popup di atas drawer
 *   - TD-061-B: Accept initialReporterId prop untuk cross-tab nav dari Audit Log
 * ------------------------------------------------------------
 * Tab "Pelapor" untuk admin BALAPOR command center.
 *
 * Sections:
 *   1. Search bar (phone last 4, name, pseudonym)
 *   2. Sort dropdown (latest_activity / total_reports / first_seen)
 *   3. Filters (urgent reports, spam reports)
 *   4. List rows (clickable → open detail drawer)
 *   5. Detail drawer (slide from right, Phase 3 read-only)
 *   6. Report detail modal (NEW — pop di atas drawer saat report row di-click)
 *
 * Phase 3 Scope:
 *   - Read-only display
 *   - Action buttons di drawer = disabled placeholder
 *
 * Phase 4 (next sprint):
 *   - Wire reveal/contact action buttons
 *   - Modal flow dengan reason input + audit log integration
 *
 * Phase 5 (last):
 *   - SMART navigation (click row → filter Live Incidents by reporter_id)
 *
 * Pattern reference: WilayahTab (wilayah-tab.tsx)
 */

import { useEffect, useState, useCallback } from 'react';
import {
  Search,
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  Users,
  Calendar,
  Smartphone,
  Globe,
  AlertCircle,
  Eye,
  MessageCircle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ApiError, useApi } from '@/lib/api/client';
import { EmptyState } from '@/components/ui/empty-state';
import { PelaporDetailDrawer } from './pelapor-detail-drawer';
import { ReportDetailModal } from './report-detail-modal';
import {
  type ReporterAggregate,
  type ReporterSortKey,
  getAnonymityLabel,
  getAnonymityColorClass,
  getAnonymityIcon,
  computeResolutionRate,
  formatRate,
  SORT_OPTIONS,
} from '@/types/reporters';
import { timeAgo } from '@/types/reports';

interface PelaporTabProps {
  active: boolean;
  nonce: number;
  onToast: (message: string, ok: boolean) => void;
  /** SMART: navigate ke Live Incidents dengan reporter filter (Phase 5) */
  onNavigateToReports?: (filter: { reporterId: string; reporterName: string }) => void;
  /** TD-061-B: Cross-tab nav dari Audit Log — auto-open drawer untuk reporter ini */
  initialReporterId?: string | null;
  /** TD-061-B: Callback setelah initialReporterId dikonsumsi (parent reset state) */
  onInitialReporterConsumed?: () => void;
}

export function PelaporTab({
  active,
  nonce,
  onToast,
  onNavigateToReports,
  initialReporterId,
  onInitialReporterConsumed,
}: PelaporTabProps) {
  const api = useApi();

  const [reporters, setReporters] = useState<ReporterAggregate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  // Filter state
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sortBy, setSortBy] = useState<ReporterSortKey>('latest_activity');
  const [hasUrgentReports, setHasUrgentReports] = useState(false);
  const [hasSpamReports, setHasSpamReports] = useState(false);

  // Drawer state
  const [drawerReporterId, setDrawerReporterId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // TD-061-A: Report detail modal state (pop di atas drawer)
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  /* ── Fetch effect ── */
  useEffect(() => {
    if (!active || !api.token) return;

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set('page', '1');
    params.set('limit', '50');
    params.set('sortBy', sortBy);
    if (search.trim().length > 0) params.set('search', search.trim());
    if (hasUrgentReports) params.set('hasUrgentReports', 'true');
    if (hasSpamReports) params.set('hasSpamReports', 'true');

    // NOTE: useApi client unwraps `parsed.data` automatically.
    // Backend ok(c, array, meta) → client returns just the array (meta dropped).
    // Total derived from array.length (no server pagination count exposed).
    api
      .get<ReporterAggregate[]>(
        `/admin/balapor/by-reporter?${params.toString()}`,
        { signal: controller.signal },
      )
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setReporters(list);
        setTotal(list.length);
      })
      .catch((err) => {
        if (err instanceof ApiError) {
          setError(err.message);
          onToast(err.message, false);
        } else if (err.name !== 'AbortError') {
          setError('Gagal load daftar pelapor');
          onToast('Gagal load daftar pelapor', false);
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [active, nonce, api, sortBy, search, hasUrgentReports, hasSpamReports, onToast]);

  /* ── Search debounce ── */
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearch(searchInput);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchInput]);

  /* ── TD-061-B: Auto-open drawer saat initialReporterId set (cross-tab nav) ── */
  useEffect(() => {
    if (!active || !initialReporterId) return;
    setDrawerReporterId(initialReporterId);
    setDrawerOpen(true);
    // Notify parent — initialReporterId sudah dikonsumsi, biar gak re-trigger
    onInitialReporterConsumed?.();
  }, [active, initialReporterId, onInitialReporterConsumed]);

  const handleRefresh = useCallback(() => {
    setSearchInput('');
    setSearch('');
    setHasUrgentReports(false);
    setHasSpamReports(false);
    setSortBy('latest_activity');
  }, []);

  const handleRowClick = useCallback((reporterId: string) => {
    setDrawerReporterId(reporterId);
    setDrawerOpen(true);
  }, []);

  const handleDrawerClose = useCallback(() => {
    setDrawerOpen(false);
    // Keep reporterId untuk smooth re-open animation
    setTimeout(() => setDrawerReporterId(null), 200);
  }, []);

  /* ── TD-061-A: Handler click report row di drawer ── */
  const handleReportClick = useCallback((reportId: string) => {
    setSelectedReportId(reportId);
  }, []);

  const handleReportModalClose = useCallback(() => {
    setSelectedReportId(null);
  }, []);

  if (!active) return null;

  const hasActiveFilter =
    search.trim().length > 0 || hasUrgentReports || hasSpamReports || sortBy !== 'latest_activity';

  return (
    <>
      <div className="space-y-4">
        {/* ── Header bar ── */}
        <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-balapor" />
              <h2 className="text-sm font-bold text-text">Daftar Pelapor</h2>
              <span className="text-[11px] font-bold text-text-muted">
                {total} pelapor terdaftar
              </span>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-text-muted hover:text-text hover:bg-surface-muted transition-colors"
              title="Reset filter"
            >
              <RefreshCw size={12} />
              Reset
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari nama, pseudonim, atau 4 digit terakhir nomor HP..."
              className={cn(
                'w-full pl-9 pr-3 py-2 rounded-lg',
                'bg-surface-muted/40 border border-border',
                'text-[12px] text-text placeholder-text-muted',
                'focus:outline-none focus:ring-2 focus:ring-balapor/30 focus:border-balapor',
              )}
            />
          </div>

          {/* Sort + Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as ReporterSortKey)}
                className={cn(
                  'appearance-none pl-3 pr-8 py-1.5 rounded-lg',
                  'bg-surface-muted/40 border border-border',
                  'text-[11px] font-semibold text-text',
                  'focus:outline-none focus:ring-2 focus:ring-balapor/30',
                  'cursor-pointer',
                )}
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={12}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
              />
            </div>

            <button
              type="button"
              onClick={() => setHasUrgentReports((v) => !v)}
              className={cn(
                'px-2.5 py-1.5 rounded-lg text-[11px] font-semibold',
                'transition-colors border',
                hasUrgentReports
                  ? 'bg-status-critical/12 text-status-critical border-status-critical/30'
                  : 'bg-surface-muted/40 text-text-muted border-border hover:bg-surface-muted',
              )}
            >
              🔴 Punya Urgent
            </button>

            <button
              type="button"
              onClick={() => setHasSpamReports((v) => !v)}
              className={cn(
                'px-2.5 py-1.5 rounded-lg text-[11px] font-semibold',
                'transition-colors border',
                hasSpamReports
                  ? 'bg-status-warning/12 text-status-warning border-status-warning/30'
                  : 'bg-surface-muted/40 text-text-muted border-border hover:bg-surface-muted',
              )}
            >
              ⚠️ Punya Spam
            </button>
          </div>
        </div>

        {/* ── List ── */}
        {loading && (
          <div className="bg-surface border border-border rounded-xl py-12 flex flex-col items-center gap-3">
            <Loader2 size={24} className="text-balapor animate-spin" />
            <span className="text-xs text-text-muted">Loading daftar pelapor...</span>
          </div>
        )}

        {error && !loading && (
          <div className="bg-surface border border-border rounded-xl py-10 px-6">
            <EmptyState
              icon={<AlertTriangle size={32} />}
              title="Gagal load pelapor"
              description={error}
              variant="muted"
              size="sm"
            />
          </div>
        )}

        {!loading && !error && reporters.length === 0 && (
          <div className="bg-surface border border-border rounded-xl py-10 px-6">
            <EmptyState
              icon={<Users size={32} />}
              title={hasActiveFilter ? 'Tidak ada match' : 'Belum ada pelapor'}
              description={
                hasActiveFilter
                  ? 'Tidak ada pelapor dengan filter ini. Coba reset.'
                  : 'Belum ada pelapor terdaftar. Pelapor anonim murni (tanpa akun) tidak masuk daftar.'
              }
              variant="muted"
              size="sm"
              action={
                hasActiveFilter
                  ? { label: 'Reset filter', onClick: handleRefresh }
                  : undefined
              }
            />
          </div>
        )}

        {!loading && !error && reporters.length > 0 && (
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            {reporters.map((rep, idx) => (
              <PelaporRow
                key={rep.reporter_id}
                reporter={rep}
                onClick={() => handleRowClick(rep.reporter_id)}
                isLast={idx === reporters.length - 1}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Detail Drawer ── */}
      <PelaporDetailDrawer
        reporterId={drawerReporterId}
        open={drawerOpen}
        onClose={handleDrawerClose}
        onToast={onToast}
        onReportClick={handleReportClick}
        onNavigateToReports={onNavigateToReports}
      />

      {/* ── TD-061-A: Report Detail Modal (pop di atas drawer) ── */}
      <ReportDetailModal
        reportId={selectedReportId}
        onClose={handleReportModalClose}
        onToast={onToast}
      />
    </>
  );
}

/* ════════════════════════════════════════════════════════════════
   PelaporRow — Single reporter row
   ════════════════════════════════════════════════════════════════ */

interface PelaporRowProps {
  reporter: ReporterAggregate;
  onClick: () => void;
  isLast: boolean;
}

function PelaporRow({ reporter: r, onClick, isLast }: PelaporRowProps) {
  const resolutionRate = computeResolutionRate(r);
  const hasIndicators =
    r.spam_count > 0 || r.distinct_ips_count > 1 || r.reveal_count > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-start gap-3 w-full px-4 py-3 text-left',
        'hover:bg-surface-muted/40 transition-colors',
        !isLast && 'border-b border-border',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-balapor/30 focus-visible:ring-inset',
      )}
    >
      {/* Avatar */}
      <div
        className="h-10 w-10 rounded-full flex items-center justify-center bg-balapor/10 text-xl shrink-0"
        aria-hidden="true"
      >
        {getAnonymityIcon(r.anonymity_level_dominant)}
      </div>

      {/* Main content */}
      <div className="min-w-0 flex-1">
        {/* Title row */}
        <div className="flex items-center gap-1.5 flex-wrap mb-1">
          <span className="text-[13px] font-bold text-text truncate">
            {r.name_display || 'Pelapor'}
          </span>
          <span
            className={cn(
              'shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide',
              getAnonymityColorClass(r.anonymity_level_dominant),
            )}
          >
            {getAnonymityLabel(r.anonymity_level_dominant)}
          </span>
          <span className="font-mono text-[11px] text-text-muted">
            {r.phone_masked || '****'}
          </span>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-text-muted">
          <span className="flex items-center gap-0.5">
            <Calendar size={10} />
            {timeAgo(r.latest_report_at)}
          </span>
          <span className="text-text-subtle" aria-hidden="true">·</span>
          <span className="flex items-center gap-0.5">
            <Smartphone size={10} />
            {r.distinct_devices_count} device
          </span>
          {r.distinct_ips_count > 0 && (
            <>
              <span className="text-text-subtle" aria-hidden="true">·</span>
              <span className="flex items-center gap-0.5">
                <Globe size={10} />
                {r.distinct_ips_count} IP
              </span>
            </>
          )}
          {r.reveal_count > 0 && (
            <>
              <span className="text-text-subtle" aria-hidden="true">·</span>
              <span className="flex items-center gap-0.5 text-balapor font-semibold">
                <Eye size={10} />
                {r.reveal_count}× revealed
              </span>
            </>
          )}
          {r.contact_count > 0 && (
            <>
              <span className="text-text-subtle" aria-hidden="true">·</span>
              <span className="flex items-center gap-0.5 text-balapor font-semibold">
                <MessageCircle size={10} />
                {r.contact_count}× contacted
              </span>
            </>
          )}
        </div>

        {/* Status counts row */}
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {r.pending_count > 0 && (
            <CountChip
              label="Pending"
              value={r.pending_count}
              color="bg-status-warning/12 text-status-warning"
            />
          )}
          {r.reviewing_count > 0 && (
            <CountChip
              label="Reviewing"
              value={r.reviewing_count}
              color="bg-balapor/12 text-balapor"
            />
          )}
          {r.verified_count > 0 && (
            <CountChip
              label="Verified"
              value={r.verified_count}
              color="bg-status-healthy/12 text-status-healthy"
            />
          )}
          {r.published_count > 0 && (
            <CountChip
              label="Published"
              value={r.published_count}
              color="bg-balapor/12 text-balapor"
            />
          )}
          {r.rejected_count > 0 && (
            <CountChip
              label="Rejected"
              value={r.rejected_count}
              color="bg-status-critical/12 text-status-critical"
            />
          )}
          {r.spam_count > 0 && (
            <CountChip
              label="Spam"
              value={r.spam_count}
              color="bg-status-critical/12 text-status-critical"
            />
          )}
        </div>

        {/* Indicators */}
        {hasIndicators && (
          <div className="flex items-center gap-1.5 mt-1.5">
            {r.distinct_ips_count > 1 && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-status-warning">
                <AlertCircle size={10} />
                Multi-IP
              </span>
            )}
            {r.spam_count > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-status-critical">
                <AlertCircle size={10} />
                {r.spam_count} spam
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right column: total + resolution */}
      <div className="shrink-0 text-right">
        <div className="text-xl font-bold text-text">{r.total_reports}</div>
        <div className="text-[10px] text-text-muted">laporan</div>
        <div className="text-[10px] text-balapor font-semibold mt-1">
          {formatRate(resolutionRate)} ✓
        </div>
      </div>
    </button>
  );
}

function CountChip({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold',
        color,
      )}
    >
      <span>{value}</span>
      <span className="opacity-80">{label}</span>
    </span>
  );
}
