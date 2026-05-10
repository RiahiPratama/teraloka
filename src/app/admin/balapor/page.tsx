'use client';

/**
 * TeraLoka — Admin Reports Page
 * Phase 2 · Batch 7b3 — Reports Deep Dive (COMPLETE)
 * ------------------------------------------------------------
 * Admin BALAPOR command center — incident reports management.
 *
 * Batch 7b3 scope (current):
 * - Deep Dive tab ENABLED dengan analytics dari /admin/balapor/deepdive
 * - Auto-fetch saat tab dibuka pertama kali
 * - Cleanup: AdminReportspage.tsx dihapus (manual delete oleh developer)
 *
 * Previous batches:
 * - 7b1: Shell + Overview tab
 * - 7b2: Live Incidents tab + BALAPOR Leaflet map + Priority picker
 *
 * Reports page: COMPLETE migration to design system.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  MapPin,
  Newspaper,
  RefreshCw,
  ScrollText,
  Search,
  Shield,
  Siren,
  Sparkles,
  Star,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ApiError, useApi } from '@/lib/api/client';
import {
  computeReportStats,
  computeCivicDistribution,
  getBestLocation,
  getCategoryConfig,
  sortReportsByPriority,
  FOLLOW_UP_CONFIG,
  type Report,
  type ReportPriority,
} from '@/types/reports';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { BalaporMap } from '@/components/admin/reports/balapor-map';
import { CategoryFilter } from '@/components/admin/reports/category-filter';
import { DeepDiveView } from '@/components/admin/reports/deep-dive-view';
import { WilayahTab } from '@/components/admin/reports/wilayah-tab';
import { PelaporTab } from '@/components/admin/reports/pelapor-tab';
import { CivicTimelineAdminModal } from '@/components/admin/reports/civic-timeline-admin-modal';
import { DeleteReportModal } from '@/components/admin/reports/delete-report-modal';
import { PhotoLightbox } from '@/components/admin/reports/photo-lightbox';
import { PriorityPicker } from '@/components/admin/reports/priority-picker';
import { RejectReportModal } from '@/components/admin/reports/reject-report-modal';
import { ReportGroupList } from '@/components/admin/reports/report-group-list';
import { ReportRow } from '@/components/admin/reports/report-row';
import { ReportSidebar } from '@/components/admin/reports/report-sidebar';
import { ReportStats } from '@/components/admin/reports/report-stats';
import type { DeepDiveResponse } from '@/types/reports-deepdive';

/* ─── API response shape ─── */

interface ReportsListResponse {
  data: Report[];
  total: number;
  limit?: number;
  offset?: number;
}

/* ─── Tab state ─── */

type TabKey =
  | 'overview'
  | 'live'
  | 'smart_alert'
  | 'convert_bakabar'
  | 'wilayah'
  | 'pelapor'
  | 'instansi'
  | 'deepdive'
  | 'audit_log';

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

/* ─── Lifecycle filter options (Sub-Sprint 1C-C-4) ─── */

const LIFECYCLE_OPTIONS = [
  { value: '', label: 'Semua' },
  { value: 'pending', label: '🟡 Pending' },
  { value: 'reviewing', label: '🔍 Reviewing' },
  { value: 'verified', label: '✅ Verified' },
  { value: 'published', label: '📰 Published' },
  { value: 'stalemate', label: '⚠️ Stalemate' },
  { value: 'stale', label: '⏸️ Stale' },
  { value: 'resolved', label: '🎉 Resolved' },
  { value: 'rejected', label: '❌ Rejected' },
];

/* ─── SMART Filter Pill Component (Sub-Sprint 1C-C-12 SMART) ─── */

interface SmartFilterPillProps {
  icon: string;
  label: string;
  type: 'kabupaten' | 'kecamatan' | 'kab-level' | 'civic' | 'reporter';
  onClear: () => void;
}

function SmartFilterPill({ icon, label, onClear }: SmartFilterPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full',
        'bg-balapor text-white text-[11px] font-semibold',
      )}
    >
      <span aria-hidden="true">{icon}</span>
      <span className="truncate max-w-[200px]">{label}</span>
      <button
        type="button"
        onClick={onClear}
        className="h-5 w-5 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
        aria-label="Hapus filter"
        title="Hapus filter"
      >
        <X size={11} />
      </button>
    </span>
  );
}

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
  const [lifecycleFilter, setLifecycleFilter] = useState<string>('');

  // SMART navigation filters (Sub-Sprint 1C-C-12 SMART)
  const [civicFilter, setCivicFilter] = useState<string>(''); // FollowUpStatus value
  // Phase 5 SMART nav: filter reports by specific pelapor
  const [reporterFilter, setReporterFilter] = useState<{ id: string; name: string }>({
    id: '',
    name: '',
  });
  const [geoFilter, setGeoFilter] = useState<{
    kabupatenId: string;
    kabupatenName: string;
    kecamatanId: string;
    kecamatanName: string;
    kabupatenLevelOnly: boolean;
  }>({
    kabupatenId: '',
    kabupatenName: '',
    kecamatanId: '',
    kecamatanName: '',
    kabupatenLevelOnly: false,
  });
  /** Sub-Sprint 1C-C-11 hotfix — search input untuk find by display_id atau title */
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchInput, setSearchInput] = useState<string>('');
  const [searchFocused, setSearchFocused] = useState<boolean>(false);

  // Debounce search input → searchQuery (300ms)
  useEffect(() => {
    const handle = setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  // UI state
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [toast, setToast] = useState<ToastData | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Deep Dive state
  const [deepDive, setDeepDive] = useState<DeepDiveResponse | null>(null);
  const [deepDiveLoading, setDeepDiveLoading] = useState(false);
  const [deepDiveNonce, setDeepDiveNonce] = useState(0);

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
    if (lifecycleFilter) params.lifecycle_state = lifecycleFilter;
    if (searchQuery) params.search = searchQuery;
    // SMART navigation filters (Sub-Sprint 1C-C-12 SMART)
    if (civicFilter) params.civic_status = civicFilter;
    if (geoFilter.kabupatenId) params.kabupaten_id = geoFilter.kabupatenId;
    if (geoFilter.kecamatanId) params.kecamatan_id = geoFilter.kecamatanId;
    if (geoFilter.kabupatenLevelOnly) params.kabupaten_level_only = 'true';
    // Phase 5 SMART nav: filter by specific pelapor
    if (reporterFilter.id) params.reporter_id = reporterFilter.id;

    api
      .get<ReportsListResponse>('/admin/balapor', {
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
  }, [api, priorityFilter, categoryFilter, lifecycleFilter, searchQuery, civicFilter, geoFilter, reporterFilter, retryNonce]);

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
  const civicDistribution = computeCivicDistribution(reports);

  // Sub-Sprint 1C-C-2: count laporan dengan lifecycle_state='stalemate'
  // Type assertion karena Report type belum extend dengan lifecycle_state field
  // (backend admin endpoint Phase 3 already returns lifecycle_state — verified production)
  const stalemateCount = reports.filter(
    (r) => (r as Report & { lifecycle_state?: string }).lifecycle_state === 'stalemate'
  ).length;
  const sortedReports = sortReportsByPriority(reports);
  const topIncidents = sortedReports.slice(0, 5);

  // Sub-Sprint 1C-C-13 Phase 1.5 (Discovery UX) — laporan baru < 24h
  const newestReports = (() => {
    const NEW_THRESHOLD_MS = 24 * 60 * 60 * 1000;
    const now = Date.now();
    return [...reports]
      .filter((r) => {
        const created = new Date(r.created_at).getTime();
        if (isNaN(created)) return false;
        return now - created < NEW_THRESHOLD_MS;
      })
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .slice(0, 5);
  })();

  const tabs: TabDef[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'live', label: 'Live Incidents' },
    { key: 'smart_alert', label: 'Smart Alert' },
    { key: 'convert_bakabar', label: 'Convert BAKABAR' },
    { key: 'wilayah', label: 'Wilayah' },
    { key: 'pelapor', label: 'Pelapor' },
    { key: 'deepdive', label: 'Deep Dive' },
    { key: 'audit_log', label: 'Audit Log' },
    { key: 'instansi', label: 'Instansi', disabled: true, badge: 'SOON' },
  ];

  // Wilayah tab refresh nonce (Sub-Sprint 1C-C-12)
  const [wilayahNonce, setWilayahNonce] = useState(0);
  // Pelapor tab refresh nonce (Sub-Sprint 1C-C-13 Phase 3)
  const [pelaporNonce, setPelaporNonce] = useState(0);
  // TD-061-B: Cross-tab nav dari Audit Log → Pelapor tab + auto-open drawer
  const [pelaporInitialReporterId, setPelaporInitialReporterId] = useState<string | null>(null);

  /* ── TD-061-B: Handler click audit row dengan privacy action ── */
  const handleAuditPrivacyClick = useCallback(
    (entry: { action: string; reporter_id: string | null; reporter_name: string | null }) => {
      // Hanya trigger untuk privacy actions Phase 4 (forensic_reveal, contact_wa)
      // Skip identity_reveal legacy karena schema lama mungkin tidak punya reporter_id
      if (entry.action !== 'forensic_reveal' && entry.action !== 'contact_wa') return;

      if (!entry.reporter_id) {
        showToast('Reporter ID tidak tersedia di entry audit ini', false);
        return;
      }

      // Switch tab + set initial reporter untuk auto-open drawer
      setPelaporInitialReporterId(entry.reporter_id);
      setActiveTab('pelapor');
    },
    [showToast],
  );

  const handleInitialReporterConsumed = useCallback(() => {
    setPelaporInitialReporterId(null);
  }, []);

  /* ── UX Polish 10 Mei 2026: Live Incidents reporter chip → tab Pelapor ── */
  const handleReporterClickFromLive = useCallback(
    (report: { reporter_id?: string | null; reporter_display?: string | null }) => {
      if (!report.reporter_id) {
        showToast('Pelapor anonim — tidak bisa buka profil', false);
        return;
      }
      setPelaporInitialReporterId(report.reporter_id);
      setActiveTab('pelapor');
    },
    [showToast],
  );

  /* ── SMART navigate handler — used by Wilayah & Civic cards ── */
  const handleNavigateToReports = useCallback(
    (filter: {
      kabupatenId?: string;
      kabupatenName?: string;
      kecamatanId?: string;
      kecamatanName?: string;
      kabupatenLevelOnly?: boolean;
      civicStatus?: string;
      // Phase 5 SMART nav from Pelapor tab
      reporterId?: string;
      reporterName?: string;
    }) => {
      // Set geo filter
      if (filter.kabupatenId !== undefined || filter.kecamatanId !== undefined) {
        setGeoFilter({
          kabupatenId: filter.kabupatenId ?? '',
          kabupatenName: filter.kabupatenName ?? '',
          kecamatanId: filter.kecamatanId ?? '',
          kecamatanName: filter.kecamatanName ?? '',
          kabupatenLevelOnly: filter.kabupatenLevelOnly ?? false,
        });
      }
      // Set civic filter (additive)
      if (filter.civicStatus !== undefined) {
        setCivicFilter(filter.civicStatus);
      }
      // Phase 5: set reporter filter (additive)
      if (filter.reporterId !== undefined) {
        setReporterFilter({
          id: filter.reporterId,
          name: filter.reporterName ?? '',
        });
      }
      // Switch to Live Incidents tab
      setActiveTab('live');
    },
    [],
  );

  /* ── SMART clear filter handlers ── */
  const handleClearGeoFilter = useCallback(() => {
    setGeoFilter({
      kabupatenId: '',
      kabupatenName: '',
      kecamatanId: '',
      kecamatanName: '',
      kabupatenLevelOnly: false,
    });
  }, []);

  const handleClearCivicFilter = useCallback(() => {
    setCivicFilter('');
  }, []);

  // Phase 5: clear reporter filter
  const handleClearReporterFilter = useCallback(() => {
    setReporterFilter({ id: '', name: '' });
  }, []);

  const handleClearAllSmartFilters = useCallback(() => {
    handleClearGeoFilter();
    handleClearCivicFilter();
    handleClearReporterFilter();
  }, [handleClearGeoFilter, handleClearCivicFilter, handleClearReporterFilter]);

  /* ── Deep Dive fetch ── */
  useEffect(() => {
    if (activeTab !== 'deepdive') return;
    if (!api.token) return;

    const controller = new AbortController();

    setDeepDiveLoading(true);
    api
      .get<DeepDiveResponse>('/admin/balapor/deepdive', {
        signal: controller.signal,
      })
      .then((data) => {
        setDeepDive(data);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        const message =
          err instanceof ApiError
            ? err.message
            : 'Gagal memuat analytics';
        showToast(message, false);
      })
      .finally(() => {
        if (!controller.signal.aborted) setDeepDiveLoading(false);
      });

    return () => controller.abort();
  }, [activeTab, api, deepDiveNonce, showToast]);

  const handleDeepDiveRefresh = useCallback(() => {
    setDeepDiveNonce((n) => n + 1);
  }, []);

  /* ── Priority change handler ── */
  const handleChangePriority = useCallback(
    async (report: Report, newPriority: ReportPriority) => {
      if (newPriority === report.priority) return;

      const loadingKey = `${report.id}priority`;
      setActionLoadingId(loadingKey);

      try {
        await api.patch(`/admin/balapor/${report.id}/priority`, {
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
    setLifecycleFilter('');
    setSearchInput('');
  }, []);

  /* ── Stats Card Click Handler (Sub-Sprint 1C-C-8 — pintarisasi) ── */
  const handleStatCardClick = useCallback((statId: string) => {
    // Reset filter dulu, baru apply filter spesifik
    setPriorityFilter('');
    setLifecycleFilter('');
    // Note: category filter dipertahankan biar admin bisa kombinasi

    switch (statId) {
      case 'total':
        // Reset semua filter, stay di tab current
        setCategoryFilter('');
        break;
      case 'urgent':
        setPriorityFilter('urgent');
        setActiveTab('live');
        break;
      case 'high':
        setPriorityFilter('high');
        setActiveTab('live');
        break;
      case 'unhandled':
        // Pending > 2 jam → filter pending lifecycle
        setLifecycleFilter('pending');
        setActiveTab('live');
        break;
      case 'stalemate':
        setLifecycleFilter('stalemate');
        setActiveTab('live');
        break;
    }
  }, []);

  /* ── Top Incident Click Handler (Sub-Sprint 1C-C-8) ── */
  const handleTopIncidentClick = useCallback((report: Report) => {
    // Switch ke Live tab + filter ke kategori report tsb
    setCategoryFilter(report.category || '');
    setPriorityFilter('');
    setLifecycleFilter('');
    setActiveTab('live');
  }, []);

  /* ── Soft delete state + handler (Sub-Sprint 1C-C-3) ── */
  const [deleteTarget, setDeleteTarget] = useState<Report | null>(null);

  /* ── Reject modal state (Sub-Sprint 1C-C-9) ── */
  const [rejectTarget, setRejectTarget] = useState<Report | null>(null);

  /* ── Photo Lightbox state (Sub-Sprint 1C-C-10) ── */
  const [lightboxTarget, setLightboxTarget] = useState<Report | null>(null);
  /** Override photos+context untuk lightbox dari civic timeline (Sub-Sprint 1C-C-11) */
  const [lightboxOverride, setLightboxOverride] = useState<{
    photos: string[];
    initialIndex: number;
    title: string;
  } | null>(null);

  const handlePhotoClick = useCallback((report: Report) => {
    if (!report.photos || report.photos.length === 0) return;
    setLightboxTarget(report);
    setLightboxOverride(null);
  }, []);

  /* ── Civic Timeline Modal state (Sub-Sprint 1C-C-11) ── */
  const [civicTarget, setCivicTarget] = useState<Report | null>(null);

  const handleCivicClick = useCallback((report: Report) => {
    setCivicTarget(report);
  }, []);

  const handleCivicPhotoClick = useCallback(
    (photos: string[], initialIndex: number, contextTitle: string) => {
      setLightboxOverride({ photos, initialIndex, title: contextTitle });
      setLightboxTarget({ id: 'civic-context', title: contextTitle, photos } as unknown as Report);
    },
    []
  );

  /* ── Smart Alert state (Sub-Sprint 1C-C-7) ── */
  type ClusterSeverity = 'warning' | 'critical' | 'urgent';
  interface ClusterReportPreview {
    id: string;
    display_id: string | null;
    title: string;
    status: string;
    priority: string;
    created_at: string;
  }
  interface IncidentCluster {
    cluster_id: string;
    location_id: string | null;
    location_name: string | null;
    category: string;
    report_count: number;
    severity: ClusterSeverity;
    reports: ClusterReportPreview[];
    earliest_at: string;
    latest_at: string;
    pending_count: number;
    verified_count: number;
  }
  interface SmartAlertResponse {
    data: IncidentCluster[];
    meta: {
      window_days: number;
      threshold: number;
      total_reports_scanned: number;
      cluster_count: number;
      detected_at: string;
    };
  }

  const [clusters, setClusters] = useState<IncidentCluster[]>([]);
  const [clustersMeta, setClustersMeta] = useState<SmartAlertResponse['meta'] | null>(null);
  const [clustersLoading, setClustersLoading] = useState(false);
  const [clustersError, setClustersError] = useState<string | null>(null);
  const [smartAlertNonce, setSmartAlertNonce] = useState(0);
  const [expandedClusterId, setExpandedClusterId] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab !== 'smart_alert' || !api.token) return;
    const controller = new AbortController();

    setClustersLoading(true);
    setClustersError(null);

    api
      .get<SmartAlertResponse>('/admin/balapor/smart-alerts', {
        signal: controller.signal,
      })
      .then((res) => {
        setClusters(res.data);
        setClustersMeta(res.meta);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setClustersError(
          err instanceof ApiError ? err.message : 'Gagal load smart alerts'
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setClustersLoading(false);
      });

    return () => controller.abort();
  }, [activeTab, api, smartAlertNonce]);

  /* ── BAKABAR Candidates state (Sub-Sprint 1C-C-7) ── */
  type CandidateTier = 'editors_pick' | 'strong' | 'possible' | 'low';
  interface BakabarCandidate {
    id: string;
    display_id: string | null;
    title: string;
    body: string | null;
    category: string;
    status: string;
    priority: string;
    location_id: string | null;
    location_name: string | null;
    photos_count: number;
    risk_score: number;
    civic_feedback_count: number;
    in_cluster: boolean;
    is_stalemate: boolean;
    bakabar_score: number;
    tier: CandidateTier;
    score_breakdown: {
      priority: number;
      photos: number;
      body: number;
      civic: number;
      cluster: number;
      stalemate: number;
    };
    verified_at: string | null;
    created_at: string;
    has_linked_article: boolean;
  }
  interface CandidatesResponse {
    data: BakabarCandidate[];
    meta: {
      total_verified: number;
      candidates_count: number;
      min_score: number;
      tiers: { editors_pick: number; strong: number; possible: number; low: number };
      detected_at: string;
    };
  }

  const [candidates, setCandidates] = useState<BakabarCandidate[]>([]);
  const [candidatesMeta, setCandidatesMeta] = useState<CandidatesResponse['meta'] | null>(null);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [candidatesError, setCandidatesError] = useState<string | null>(null);
  const [candidateNonce, setCandidateNonce] = useState(0);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [tierFilter, setTierFilter] = useState<CandidateTier | ''>('');

  useEffect(() => {
    if (activeTab !== 'convert_bakabar' || !api.token) return;
    const controller = new AbortController();

    setCandidatesLoading(true);
    setCandidatesError(null);

    api
      .get<CandidatesResponse>('/admin/balapor/bakabar-candidates', {
        params: { limit: 50 },
        signal: controller.signal,
      })
      .then((res) => {
        setCandidates(res.data);
        setCandidatesMeta(res.meta);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setCandidatesError(
          err instanceof ApiError ? err.message : 'Gagal load candidates'
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setCandidatesLoading(false);
      });

    return () => controller.abort();
  }, [activeTab, api, candidateNonce]);

  /* ── Audit Log state (Sub-Sprint 1C-C-9) ── */
  type AuditActionType =
    | 'verify' | 'reject' | 'set_priority' | 'set_spam' | 'mark_forwarded'
    | 'soft_delete' | 'restore' | 'edit_metadata' | 'convert_bakabar'
    | 'identity_reveal'        // Legacy report-level reveal (pre-Phase 4)
    | 'forensic_reveal'        // Phase 4: reporter-level forensic reveal
    | 'contact_wa';            // Phase 4: reporter-level WA contact

  interface AuditLogEntry {
    id: string;
    report_id: string | null;       // Phase 4-Fix: nullable for identity actions
    report_display_id: string | null;
    report_title: string | null;
    report_status: string | null;
    actor_id: string;
    actor_role: string;
    action: AuditActionType | string;
    note: string | null;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string;
    // ── Phase 4-Fix-B privacy fields ──
    is_privacy_action: boolean;
    reporter_id: string | null;
    reporter_phone: string | null;
    reporter_name: string | null;
  }

  interface AuditLogResponse {
    data: AuditLogEntry[];
    meta: {
      page: number;
      limit: number;
      total: number;
      // Phase 4-Fix-B UNION breakdown
      total_report_actions: number;
      total_privacy_actions: number;
      has_more: boolean;
      fetched_at: string;
    };
  }

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditMeta, setAuditMeta] = useState<AuditLogResponse['meta'] | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditNonce, setAuditNonce] = useState(0);
  const [auditActionFilter, setAuditActionFilter] = useState<AuditActionType | ''>('');
  const [auditPage, setAuditPage] = useState(1);

  /* ── Phase 4-Fix-D: Compliance Posture KPI ── */
  interface CompliancePosture {
    actions_7d: number;
    privacy_actions_7d: number;
    privacy_ratio_7d: number;
    privacy_actions_30d: number;
    privacy_anomaly_score: number;
    actions_30d: number;
    computed_at: string;
  }
  const [posture, setPosture] = useState<CompliancePosture | null>(null);

  // Phase 4-Fix-D: Fetch posture KPI parallel dengan audit logs
  useEffect(() => {
    if (activeTab !== 'audit_log' || !api.token) return;
    const controller = new AbortController();

    api
      .get<CompliancePosture>('/admin/balapor/audit-log/posture', {
        signal: controller.signal,
      })
      .then((data) => {
        setPosture(data);
      })
      .catch((err) => {
        // Posture failure non-blocking — audit log still works
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.warn('Posture KPI fetch failed:', err);
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, auditNonce, api.token]);

  useEffect(() => {
    if (activeTab !== 'audit_log' || !api.token) return;
    const controller = new AbortController();

    setAuditLoading(true);
    setAuditError(null);

    const params: Record<string, string | number> = { page: auditPage, limit: 25 };
    if (auditActionFilter) params.action = auditActionFilter;

    api
      .get<AuditLogResponse>('/admin/balapor/audit-log', {
        params,
        signal: controller.signal,
      })
      .then((res) => {
        setAuditLogs(res.data);
        setAuditMeta(res.meta);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setAuditError(
          err instanceof ApiError ? err.message : 'Gagal load audit log'
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setAuditLoading(false);
      });

    return () => controller.abort();
  }, [activeTab, api, auditNonce, auditActionFilter, auditPage]);

  const handleConvertToArticle = useCallback(
    async (candidate: BakabarCandidate) => {
      if (
        !window.confirm(
          `Convert "${candidate.title.slice(0, 40)}..." jadi draft artikel BAKABAR via AI?`
        )
      ) {
        return;
      }

      setConvertingId(candidate.id);
      try {
        await api.post(`/admin/balapor/${candidate.id}/convert`, {});
        showToast(`📰 "${candidate.title.slice(0, 30)}..." → BAKABAR draft`, true);
        setCandidateNonce(n => n + 1);
      } catch (err) {
        const msg =
          err instanceof ApiError ? err.message : 'Gagal convert ke artikel';
        showToast(msg, false);
      } finally {
        setConvertingId(null);
      }
    },
    [api, showToast]
  );

  const handleSoftDelete = useCallback(
    async (params: {
      reportId: string;
      reason: string;
      notes: string;
      redactContent: boolean;
    }) => {
      const target = reports.find(r => r.id === params.reportId);
      const titlePreview = target
        ? target.title.slice(0, 30) + (target.title.length > 30 ? '…' : '')
        : 'Laporan';

      try {
        await api.post(`/admin/balapor/${params.reportId}/soft-delete`, {
          reason: params.reason,
          notes: params.notes,
          redact_content: params.redactContent,
        });
        showToast(`"${titlePreview}" dihapus`, true);
        setRetryNonce(n => n + 1);
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : 'Gagal menghapus laporan';
        showToast(message, false);
        throw err; // Re-throw biar modal tetap terbuka kalau gagal
      }
    },
    [api, reports, showToast]
  );

  /* ── Verify + Reject handlers (Sub-Sprint 1C-C-4) ── */
  const handleVerify = useCallback(
    async (report: Report) => {
      const titlePreview = report.title.slice(0, 30) + (report.title.length > 30 ? '…' : '');
      const loadingKey = `${report.id}verify`;
      setActionLoadingId(loadingKey);
      try {
        await api.patch(`/admin/balapor/${report.id}/verify`, {});
        showToast(`✅ "${titlePreview}" diverifikasi`, true);
        setRetryNonce(n => n + 1);
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : 'Gagal verify laporan';
        showToast(message, false);
      } finally {
        setActionLoadingId(null);
      }
    },
    [api, showToast]
  );

  const handleReject = useCallback(
    (report: Report) => {
      // Open modal instead of window.prompt (Sub-Sprint 1C-C-9 UX upgrade)
      setRejectTarget(report);
    },
    []
  );

  const handleRejectSubmit = useCallback(
    async (params: { reportId: string; reason: string }) => {
      const target = reports.find(r => r.id === params.reportId);
      const titlePreview = target
        ? target.title.slice(0, 30) + (target.title.length > 30 ? '…' : '')
        : 'Laporan';

      const loadingKey = `${params.reportId}reject`;
      setActionLoadingId(loadingKey);
      try {
        await api.patch(`/admin/balapor/${params.reportId}/reject`, {
          reason: params.reason,
        });
        showToast(`❌ "${titlePreview}" ditolak`, true);
        setRetryNonce(n => n + 1);
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : 'Gagal reject laporan';
        showToast(message, false);
        throw err; // Re-throw biar modal stay open kalau gagal
      } finally {
        setActionLoadingId(null);
      }
    },
    [api, reports, showToast]
  );

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* ── Toast ── */}
      {toast && (
        <div
          className="fixed top-20 right-6 z-[150] pointer-events-none"
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
        <ReportStats
          stats={stats}
          stalemateCount={stalemateCount}
          onCardClick={handleStatCardClick}
          loading={loading && reports.length === 0}
        />
      )}

      {/* ── Civic Feedback Distribution (Sub-Sprint 1C-C-10) ── */}
      {!error && civicDistribution.eligible_total > 0 && (
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-text">Status Tindak Lanjut Pelapor</h3>
              <p className="text-[11px] text-text-muted mt-0.5">
                Ground-truth dari pelapor di lokasi · {civicDistribution.eligible_total} laporan eligible
                · {civicDistribution.no_feedback} belum feedback
              </p>
            </div>
            <span
              className="text-[10px] font-bold uppercase tracking-wide text-text-muted bg-surface-muted px-2 py-1 rounded"
              title="Civic feedback hanya untuk laporan verified atau published"
            >
              VERIFIED + PUBLISHED
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(Object.keys(FOLLOW_UP_CONFIG) as Array<keyof typeof FOLLOW_UP_CONFIG>).map((key) => {
              const cfg = FOLLOW_UP_CONFIG[key];
              const count = civicDistribution[key];
              const pct =
                civicDistribution.eligible_total > 0
                  ? Math.round((count / civicDistribution.eligible_total) * 100)
                  : 0;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleNavigateToReports({ civicStatus: key })}
                  className={cn(
                    'rounded-lg border p-3 text-left',
                    'hover:scale-[1.02] hover:shadow-md transition-all cursor-pointer',
                    cfg.badgeBg,
                    cfg.badgeBorder
                  )}
                  title={`Lihat ${cfg.label.toLowerCase()} di Live Incidents`}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span aria-hidden="true">{cfg.emoji}</span>
                    <span className={cn('text-[10px] font-bold uppercase tracking-wide', cfg.badgeText)}>
                      {cfg.label}
                    </span>
                  </div>
                  <div className={cn('text-2xl font-extrabold tabular-nums leading-none', cfg.badgeText)}>
                    {count}
                  </div>
                  <div className="text-[10px] text-text-muted mt-1">
                    {pct}% dari eligible
                  </div>
                </button>
              );
            })}
          </div>
        </div>
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

            {/* Status filter (Sub-Sprint 1C-C-4) */}
            <div className="bg-surface border border-border rounded-xl p-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2.5">
                Filter Status
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {LIFECYCLE_OPTIONS.map((opt) => {
                  const isActive = lifecycleFilter === opt.value;
                  return (
                    <button
                      key={opt.value || 'all-lifecycle'}
                      type="button"
                      onClick={() => setLifecycleFilter(opt.value)}
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
                  onClick={() => setActiveTab('live')}
                  className="text-[11px] font-semibold text-balapor hover:text-balapor/80 transition-colors"
                  title="Buka tab Live Incidents untuk lihat semua laporan"
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
                topIncidents.map((r) => {
                  const canModerate = r.status === 'pending' || r.status === 'reviewing';
                  return (
                    <ReportRow
                      key={r.id}
                      report={r}
                      variant="full"
                      onPhotoClick={handlePhotoClick}
                      onCivicClick={handleCivicClick}
                      actionSlot={
                        <div className="flex items-center gap-1">
                          {/* Priority picker (TD-062 fix — was missing) */}
                          <PriorityPicker
                            currentPriority={r.priority}
                            onChange={(newP) => handleChangePriority(r, newP)}
                            loading={actionLoadingId === `${r.id}priority`}
                            size="sm"
                          />
                          <div className="w-px h-4 bg-border mx-1" aria-hidden="true" />
                          {canModerate && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleVerify(r);
                                }}
                                disabled={actionLoadingId === `${r.id}verify`}
                                className={cn(
                                  'h-6 w-6 rounded-md flex items-center justify-center',
                                  'text-text-muted hover:text-status-healthy hover:bg-status-healthy/10',
                                  'transition-colors disabled:opacity-50',
                                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-healthy/30'
                                )}
                                title="Verify laporan"
                                aria-label={`Verify ${r.title}`}
                              >
                                <CheckCircle2 size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReject(r);
                                }}
                                disabled={actionLoadingId === `${r.id}reject`}
                                className={cn(
                                  'h-6 w-6 rounded-md flex items-center justify-center',
                                  'text-text-muted hover:text-status-warning hover:bg-status-warning/10',
                                  'transition-colors disabled:opacity-50',
                                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-warning/30'
                                )}
                                title="Reject laporan"
                                aria-label={`Reject ${r.title}`}
                              >
                                <XCircle size={12} />
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(r);
                            }}
                            className={cn(
                              'h-6 w-6 rounded-md flex items-center justify-center',
                              'text-text-muted hover:text-status-critical hover:bg-status-critical/10',
                              'transition-colors',
                              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-critical/30'
                            )}
                            title="Hapus laporan"
                            aria-label={`Hapus laporan ${r.title}`}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      }
                    />
                  );
                })
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
            {/* Total counter widget — clickable (Sub-Sprint 1C-C-8) */}
            <div className="bg-surface border border-border rounded-xl p-5">
              <button
                type="button"
                onClick={() => handleStatCardClick('total')}
                className={cn(
                  'flex items-baseline justify-between mb-4 w-full text-left',
                  'hover:opacity-80 transition-opacity',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-balapor/30 rounded'
                )}
                title="Reset semua filter"
              >
                <span className="text-3xl font-extrabold text-text tracking-tight">
                  {total.toLocaleString('id-ID')}
                </span>
                <span className="text-[11px] text-text-muted">
                  Total Hari Ini
                </span>
              </button>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleStatCardClick('urgent')}
                  className={cn(
                    'text-left p-2 -m-2 rounded-lg',
                    'hover:bg-status-critical/8 transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-critical/30'
                  )}
                  title="Filter ke Urgent"
                >
                  <div className="text-xl font-extrabold text-status-critical tabular-nums">
                    {stats.urgent}
                  </div>
                  <div className="text-[10px] text-text-muted">Urgent</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleStatCardClick('unhandled')}
                  className={cn(
                    'text-left p-2 -m-2 rounded-lg',
                    'hover:bg-status-warning/8 transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-warning/30'
                  )}
                  title="Filter ke Pending"
                >
                  <div className="text-xl font-extrabold text-status-warning tabular-nums">
                    {stats.unhandled}
                  </div>
                  <div className="text-[10px] text-text-muted">
                    Belum Ditangani
                  </div>
                </button>
              </div>
            </div>

            {/* Top Incidents summary — clickable rows (Sub-Sprint 1C-C-8) */}
            <div className="bg-surface border border-border rounded-xl p-5">
              <div className="text-sm font-bold text-text mb-3">
                Top Incidents
              </div>
              {topIncidents.length === 0 ? (
                <p className="text-xs text-text-muted">Belum ada data</p>
              ) : (
                <div className="space-y-1">
                  {topIncidents.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleTopIncidentClick(r)}
                      className={cn(
                        'flex items-center gap-2.5 w-full text-left',
                        'p-2 -mx-2 rounded-lg',
                        'hover:bg-surface-muted transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-balapor/30'
                      )}
                      title={`Buka di Live Incidents (filter: ${r.category})`}
                    >
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
                          {getBestLocation(r) || 'Lokasi tidak tercatat'} ·{' '}
                          {timeAgoCompact(r.created_at)}
                        </p>
                      </div>
                    </button>
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
        <div className="space-y-4">
          {/* ── BARU MASUK Section (Sub-Sprint 1C-C-13 Phase 1.5) ── */}
          {newestReports.length > 0 && (
            <div className="bg-balapor/8 border border-balapor/20 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-balapor animate-pulse" />
                  <h3 className="text-sm font-bold text-balapor">Baru Masuk</h3>
                  <span className="text-[10px] font-bold text-text-muted">
                    {newestReports.length} laporan dalam 24 jam terakhir
                  </span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wide text-text-muted bg-surface-muted px-2 py-1 rounded">
                  Belum di-review prioritas
                </span>
              </div>
              <div className="bg-surface border border-border rounded-lg overflow-hidden">
                {newestReports.map((r) => {
                  const canModerate = r.status === 'pending' || r.status === 'reviewing';
                  return (
                    <ReportRow
                      key={r.id}
                      report={r}
                      variant="full"
                      onPhotoClick={handlePhotoClick}
                      onCivicClick={handleCivicClick}
                      actionSlot={
                        <div className="flex items-center gap-1">
                          {/* Priority picker (TD-062 fix — was missing) */}
                          <PriorityPicker
                            currentPriority={r.priority}
                            onChange={(newP) => handleChangePriority(r, newP)}
                            loading={actionLoadingId === `${r.id}priority`}
                            size="sm"
                          />
                          <div className="w-px h-4 bg-border mx-1" aria-hidden="true" />
                          {canModerate && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleVerify(r);
                                }}
                                disabled={actionLoadingId === `${r.id}verify`}
                                className={cn(
                                  'h-6 w-6 rounded-md flex items-center justify-center',
                                  'text-text-muted hover:text-status-healthy hover:bg-status-healthy/10',
                                  'transition-colors disabled:opacity-50',
                                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-healthy/30'
                                )}
                                title="Verify laporan"
                                aria-label={`Verify ${r.title}`}
                              >
                                <CheckCircle2 size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReject(r);
                                }}
                                disabled={actionLoadingId === `${r.id}reject`}
                                className={cn(
                                  'h-6 w-6 rounded-md flex items-center justify-center',
                                  'text-text-muted hover:text-status-warning hover:bg-status-warning/10',
                                  'transition-colors disabled:opacity-50',
                                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-warning/30'
                                )}
                                title="Reject laporan"
                                aria-label={`Reject ${r.title}`}
                              >
                                <XCircle size={12} />
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(r);
                            }}
                            className={cn(
                              'h-6 w-6 rounded-md flex items-center justify-center',
                              'text-text-muted hover:text-status-critical hover:bg-status-critical/10',
                              'transition-colors',
                              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-critical/30'
                            )}
                            title="Hapus laporan"
                            aria-label={`Hapus laporan ${r.title}`}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      }
                    />
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
          {/* LEFT — grouped list */}
          <div className="space-y-4 min-w-0">
            {/* SMART Active Filter Pills (Sub-Sprint 1C-C-12 SMART) */}
            {(geoFilter.kabupatenId || civicFilter || reporterFilter.id) && (
              <div className="bg-balapor/8 border border-balapor/20 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-balapor">
                    Filter Aktif (SMART)
                  </span>
                  <button
                    type="button"
                    onClick={handleClearAllSmartFilters}
                    className="text-[11px] font-semibold text-balapor hover:underline"
                  >
                    Hapus semua
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {geoFilter.kabupatenId && !geoFilter.kecamatanId && !geoFilter.kabupatenLevelOnly && (
                    <SmartFilterPill
                      icon="📍"
                      label={geoFilter.kabupatenName}
                      type="kabupaten"
                      onClear={handleClearGeoFilter}
                    />
                  )}
                  {geoFilter.kecamatanId && (
                    <SmartFilterPill
                      icon="🏘️"
                      label={`${geoFilter.kecamatanName}, ${geoFilter.kabupatenName}`}
                      type="kecamatan"
                      onClear={handleClearGeoFilter}
                    />
                  )}
                  {geoFilter.kabupatenLevelOnly && (
                    <SmartFilterPill
                      icon="🗺️"
                      label={`${geoFilter.kabupatenName} (level kabupaten)`}
                      type="kab-level"
                      onClear={handleClearGeoFilter}
                    />
                  )}
                  {civicFilter && (
                    <SmartFilterPill
                      icon="🤝"
                      label={FOLLOW_UP_CONFIG[civicFilter as keyof typeof FOLLOW_UP_CONFIG]?.label ?? civicFilter}
                      type="civic"
                      onClear={handleClearCivicFilter}
                    />
                  )}
                  {/* Phase 5 SMART nav: reporter filter pill */}
                  {reporterFilter.id && (
                    <SmartFilterPill
                      icon="👤"
                      label={`Pelapor: ${reporterFilter.name || 'Unknown'}`}
                      type="reporter"
                      onClear={handleClearReporterFilter}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Filter bar */}
            <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
              {/* Smart Search — Sub-Sprint 1C-C-11 (4-field + typeahead dropdown) */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2">
                  Pencarian Pintar
                </div>
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                  />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => {
                      setSearchInput(e.target.value);
                      setSearchFocused(true);
                    }}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setSearchInput('');
                        setSearchFocused(false);
                      }
                    }}
                    placeholder="Cari nomor laporan, judul, isi, atau lokasi (e.g., 0063 / Aspal / Tidore)"
                    className={cn(
                      'w-full pl-9 pr-9 py-2 rounded-lg border border-border bg-surface',
                      'text-sm text-text placeholder:text-text-subtle',
                      'focus:outline-none focus:ring-2 focus:ring-balapor/30 focus:border-balapor',
                      'transition-colors'
                    )}
                  />
                  {searchInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchInput('');
                        setSearchFocused(false);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-text-muted hover:text-text hover:bg-surface-muted transition-colors"
                      aria-label="Clear search"
                      title="Clear (ESC)"
                    >
                      <X size={14} />
                    </button>
                  )}

                  {/* Smart typeahead dropdown */}
                  {searchFocused && searchInput.trim().length >= 2 && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 z-30 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto">
                      {(() => {
                        const term = searchInput.trim().toLowerCase();
                        // Client-side filter dari reports state (instant, no API delay)
                        const matches = reports
                          .filter((r) => {
                            const fields = [
                              r.display_id,
                              r.title,
                              r.location,
                              r.location_name,
                            ];
                            return fields.some((f) => f?.toLowerCase().includes(term));
                          })
                          .slice(0, 8);

                        if (matches.length === 0) {
                          return (
                            <div className="p-4 text-center">
                              <p className="text-xs text-text-muted">
                                Tidak ada match instant untuk{' '}
                                <span className="font-mono font-bold text-text">"{searchInput}"</span>
                              </p>
                              <p className="text-[10px] text-text-muted mt-1">
                                💡 Backend juga search di body — tunggu detik untuk hasil lengkap
                              </p>
                            </div>
                          );
                        }

                        return (
                          <>
                            <div className="px-3 py-2 bg-surface-muted/50 border-b border-border">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                                {matches.length} match instan
                              </p>
                            </div>
                            {matches.map((m) => {
                              const cfg = getCategoryConfig(m.category);
                              return (
                                <button
                                  key={m.id}
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()} // prevent blur before click
                                  onClick={() => {
                                    // Set search to exact display_id untuk filter ke laporan ini
                                    setSearchInput(m.display_id || m.title);
                                    setSearchFocused(false);
                                  }}
                                  className={cn(
                                    'w-full px-3 py-2.5 text-left',
                                    'border-b border-border last:border-b-0',
                                    'hover:bg-balapor/8 transition-colors',
                                    'focus:outline-none focus:bg-balapor/8'
                                  )}
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    {m.display_id && (
                                      <span className="font-mono text-[10px] text-balapor font-bold tracking-tight">
                                        {m.display_id}
                                      </span>
                                    )}
                                    <span
                                      className={cn(
                                        'shrink-0 h-1.5 w-1.5 rounded-full',
                                        m.priority === 'urgent' && 'bg-status-critical',
                                        m.priority === 'high' && 'bg-status-warning',
                                        m.priority === 'normal' && 'bg-status-healthy'
                                      )}
                                    />
                                    <span className="text-[9px] uppercase font-bold tracking-wide text-text-muted">
                                      {m.status}
                                    </span>
                                  </div>
                                  <p className="text-xs font-bold text-text truncate mb-0.5">
                                    {m.title}
                                  </p>
                                  <p className="text-[10px] text-text-muted flex items-center gap-1.5">
                                    <span>{cfg.emoji}</span>
                                    <span className="capitalize">{m.category || 'lainnya'}</span>
                                    {(m.location_name || m.location) && (
                                      <>
                                        <span className="text-text-subtle">·</span>
                                        <span className="truncate">
                                          📍 {m.location_name || m.location}
                                        </span>
                                      </>
                                    )}
                                  </p>
                                </button>
                              );
                            })}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
                {searchQuery && !searchFocused && (
                  <div className="mt-2 space-y-1">
                    <p className="text-[10px] text-text-muted">
                      Mencari{' '}
                      <span className="font-mono font-bold text-text">"{searchQuery}"</span>
                      {' di '}
                      <span className="text-balapor font-semibold">judul · isi · ID · lokasi</span>
                      {' · '}
                      {loading ? (
                        <span className="text-text-muted italic">searching…</span>
                      ) : reports.length === 0 ? (
                        <span className="text-status-warning font-semibold">Tidak ditemukan</span>
                      ) : (
                        <span className="font-bold text-status-healthy">{reports.length} hasil</span>
                      )}
                    </p>
                    {!loading && reports.length === 0 && (
                      <p className="text-[10px] text-text-muted leading-relaxed">
                        💡 Tips: ID parsial OK (e.g., "0063" = BL-2026-0063) ·
                        cek filter Status di bawah · clear search untuk lihat semua
                      </p>
                    )}
                  </div>
                )}
              </div>
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
              {/* Status (Sub-Sprint 1C-C-4) */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2">
                  Filter Status
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {LIFECYCLE_OPTIONS.map((opt) => {
                    const isActive = lifecycleFilter === opt.value;
                    return (
                      <button
                        key={opt.value || 'all-lifecycle'}
                        type="button"
                        onClick={() => setLifecycleFilter(opt.value)}
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
                onVerify={handleVerify}
                onReject={handleReject}
                onRequestDelete={(r) => setDeleteTarget(r)}
                onShowAllCategory={(cat) => setCategoryFilter(cat)}
                onPhotoClick={handlePhotoClick}
                onCivicClick={handleCivicClick}
                onReporterClick={handleReporterClickFromLive}
                actionLoadingId={actionLoadingId}
                previewPerGroup={categoryFilter ? 999 : 3}
                hasFilter={Boolean(priorityFilter || categoryFilter || lifecycleFilter)}
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
        </div>
      )}

      {/* ── SMART ALERT TAB (Sub-Sprint 1C-C-7) ── */}
      {activeTab === 'smart_alert' && !error && (
        <div className="space-y-4">
          {/* Header bar */}
          <div className="flex items-center justify-between bg-surface border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-balapor/12 flex items-center justify-center">
                <Sparkles size={18} className="text-balapor" />
              </div>
              <div>
                <h2 className="text-base font-bold text-text">Smart Alert</h2>
                <p className="text-xs text-text-muted">
                  Cluster detection: lokasi + kategori sama dalam{' '}
                  {clustersMeta?.window_days ?? 7} hari terakhir
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSmartAlertNonce(n => n + 1)}
              leftIcon={<RefreshCw size={12} />}
              disabled={clustersLoading}
            >
              Refresh
            </Button>
          </div>

          {/* Stats summary */}
          {clustersMeta && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-surface border border-border rounded-xl p-4">
                <div className="text-[11px] text-text-muted uppercase tracking-wide font-bold mb-1">
                  Cluster Terdeteksi
                </div>
                <div className="text-2xl font-extrabold text-balapor tabular-nums">
                  {clustersMeta.cluster_count}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('live')}
                className={cn(
                  'bg-surface border border-border rounded-xl p-4 text-left',
                  'hover:border-balapor/40 hover:bg-balapor/3 transition-all',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-balapor/30'
                )}
                title="Buka di Live Incidents"
              >
                <div className="text-[11px] text-text-muted uppercase tracking-wide font-bold mb-1">
                  Reports Discan
                </div>
                <div className="text-2xl font-extrabold text-text tabular-nums">
                  {clustersMeta.total_reports_scanned}
                </div>
              </button>
              <div className="bg-surface border border-border rounded-xl p-4">
                <div className="text-[11px] text-text-muted uppercase tracking-wide font-bold mb-1">
                  Window
                </div>
                <div className="text-2xl font-extrabold text-text tabular-nums">
                  {clustersMeta.window_days}d
                </div>
                <div className="text-[10px] text-text-muted mt-0.5">
                  threshold {clustersMeta.threshold}+
                </div>
              </div>
            </div>
          )}

          {/* Loading / Error / Empty / List */}
          {clustersError && (
            <div className="bg-status-critical/8 border border-status-critical/20 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-status-critical" />
                <span className="text-sm text-text">{clustersError}</span>
              </div>
            </div>
          )}

          {clustersLoading && clusters.length === 0 && (
            <div className="bg-surface border border-border rounded-xl p-6">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 rounded-full border-2 border-balapor border-t-transparent animate-spin" />
                <span className="text-sm text-text-muted">
                  Mendeteksi cluster…
                </span>
              </div>
            </div>
          )}

          {!clustersLoading && !clustersError && clusters.length === 0 && (
            <div className="bg-surface border border-border rounded-xl p-8 text-center">
              <div className="inline-flex h-12 w-12 rounded-full bg-status-healthy/10 items-center justify-center mb-3">
                <CheckCircle2 size={24} className="text-status-healthy" />
              </div>
              <h3 className="text-sm font-bold text-text mb-1">
                Tidak ada cluster terdeteksi
              </h3>
              <p className="text-xs text-text-muted max-w-md mx-auto">
                Belum ada lokasi+kategori dengan {clustersMeta?.threshold ?? 3}+ laporan dalam{' '}
                {clustersMeta?.window_days ?? 7} hari terakhir. Algorithm berfungsi normal —
                pattern muncul saat ada incident clustering.
              </p>
            </div>
          )}

          {/* Cluster list */}
          {clusters.length > 0 && (
            <div className="space-y-3">
              {clusters.map((cluster) => {
                const isExpanded = expandedClusterId === cluster.cluster_id;
                const severityColor =
                  cluster.severity === 'urgent'
                    ? 'bg-status-critical/12 text-status-critical border-status-critical/30'
                    : cluster.severity === 'critical'
                      ? 'bg-status-warning/12 text-status-warning border-status-warning/30'
                      : 'bg-balapor/8 text-balapor border-balapor/30';

                return (
                  <div
                    key={cluster.cluster_id}
                    className={cn(
                      'bg-surface border rounded-xl overflow-hidden transition-colors',
                      cluster.severity === 'urgent'
                        ? 'border-status-critical/30'
                        : cluster.severity === 'critical'
                          ? 'border-status-warning/30'
                          : 'border-border'
                    )}
                  >
                    {/* Header (clickable to expand) */}
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedClusterId(isExpanded ? null : cluster.cluster_id)
                      }
                      className="w-full flex items-start justify-between gap-3 p-4 hover:bg-surface-muted/40 transition-colors text-left"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <span
                          className={cn(
                            'shrink-0 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border',
                            severityColor
                          )}
                        >
                          {cluster.severity}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <MapPin size={13} className="text-text-muted shrink-0" />
                            <span className="text-sm font-bold text-text truncate">
                              {cluster.location_name || 'Lokasi tidak diketahui'}
                            </span>
                            <span className="text-[10px] text-text-muted shrink-0">·</span>
                            <span className="text-xs text-text-muted capitalize">
                              {cluster.category}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-text-muted">
                            <span>
                              <strong className="text-text">{cluster.report_count}</strong>{' '}
                              laporan
                            </span>
                            {cluster.pending_count > 0 && (
                              <span className="text-status-warning">
                                {cluster.pending_count} pending
                              </span>
                            )}
                            {cluster.verified_count > 0 && (
                              <span className="text-status-healthy">
                                {cluster.verified_count} verified
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ArrowRight
                        size={14}
                        className={cn(
                          'text-text-muted shrink-0 mt-1 transition-transform',
                          isExpanded && 'rotate-90'
                        )}
                      />
                    </button>

                    {/* Expanded reports list */}
                    {isExpanded && (
                      <div className="border-t border-border bg-surface-muted/20">
                        {cluster.reports.map((r) => (
                          <div
                            key={r.id}
                            className="flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-b-0"
                          >
                            <span
                              className={cn(
                                'shrink-0 h-1.5 w-1.5 rounded-full',
                                r.priority === 'urgent' && 'bg-status-critical',
                                r.priority === 'high' && 'bg-status-warning',
                                r.priority === 'normal' && 'bg-status-healthy'
                              )}
                            />
                            <span className="font-mono text-[10px] text-text-muted shrink-0">
                              {r.display_id || '#—'}
                            </span>
                            <span className="text-sm text-text truncate flex-1">
                              {r.title}
                            </span>
                            <span
                              className={cn(
                                'shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded',
                                r.status === 'pending' && 'bg-status-warning/12 text-status-warning',
                                r.status === 'verified' && 'bg-status-healthy/12 text-status-healthy',
                                r.status === 'published' && 'bg-balapor/12 text-balapor',
                                r.status === 'rejected' && 'bg-status-critical/12 text-status-critical'
                              )}
                            >
                              {r.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── CONVERT BAKABAR TAB (Sub-Sprint 1C-C-7) ── */}
      {activeTab === 'convert_bakabar' && !error && (
        <div className="space-y-4">
          {/* Header bar */}
          <div className="flex items-center justify-between bg-surface border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-balapor/12 flex items-center justify-center">
                <Newspaper size={18} className="text-balapor" />
              </div>
              <div>
                <h2 className="text-base font-bold text-text">Convert ke BAKABAR</h2>
                <p className="text-xs text-text-muted">
                  Editor's Pick — verified reports yang scored layak naik BAKABAR
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCandidateNonce(n => n + 1)}
              leftIcon={<RefreshCw size={12} />}
              disabled={candidatesLoading}
            >
              Refresh
            </Button>
          </div>

          {/* Tier stats */}
          {candidatesMeta && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => setTierFilter(tierFilter === 'editors_pick' ? '' : 'editors_pick')}
                className={cn(
                  'bg-surface border rounded-xl p-4 text-left transition-all',
                  tierFilter === 'editors_pick'
                    ? 'border-balapor bg-balapor/8'
                    : 'border-border hover:border-balapor/40 hover:bg-balapor/3'
                )}
                title="Filter Editor's Pick"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Star size={11} className="text-balapor fill-balapor" />
                  <span className="text-[11px] text-text-muted uppercase tracking-wide font-bold">
                    Editor's Pick
                  </span>
                </div>
                <div className="text-2xl font-extrabold text-balapor tabular-nums">
                  {candidatesMeta.tiers.editors_pick}
                </div>
              </button>
              <button
                type="button"
                onClick={() => setTierFilter(tierFilter === 'strong' ? '' : 'strong')}
                className={cn(
                  'bg-surface border rounded-xl p-4 text-left transition-all',
                  tierFilter === 'strong'
                    ? 'border-status-warning bg-status-warning/8'
                    : 'border-border hover:border-status-warning/40 hover:bg-status-warning/3'
                )}
                title="Filter Strong"
              >
                <div className="text-[11px] text-text-muted uppercase tracking-wide font-bold mb-1">
                  Strong
                </div>
                <div className="text-2xl font-extrabold text-status-warning tabular-nums">
                  {candidatesMeta.tiers.strong}
                </div>
              </button>
              <button
                type="button"
                onClick={() => setTierFilter(tierFilter === 'possible' ? '' : 'possible')}
                className={cn(
                  'bg-surface border rounded-xl p-4 text-left transition-all',
                  tierFilter === 'possible'
                    ? 'border-status-healthy bg-status-healthy/8'
                    : 'border-border hover:border-status-healthy/40'
                )}
                title="Filter Possible"
              >
                <div className="text-[11px] text-text-muted uppercase tracking-wide font-bold mb-1">
                  Possible
                </div>
                <div className="text-2xl font-extrabold text-status-healthy tabular-nums">
                  {candidatesMeta.tiers.possible}
                </div>
              </button>
              <button
                type="button"
                onClick={() => setTierFilter(tierFilter === 'low' ? '' : 'low')}
                className={cn(
                  'bg-surface border rounded-xl p-4 text-left transition-all',
                  tierFilter === 'low'
                    ? 'border-text-muted bg-surface-muted'
                    : 'border-border hover:bg-surface-muted/50'
                )}
                title="Filter Low priority"
              >
                <div className="text-[11px] text-text-muted uppercase tracking-wide font-bold mb-1">
                  Low Priority
                </div>
                <div className="text-2xl font-extrabold text-text-muted tabular-nums">
                  {candidatesMeta.tiers.low}
                </div>
              </button>
            </div>
          )}

          {/* Tier filter active indicator */}
          {tierFilter && (
            <div className="flex items-center justify-between bg-balapor/8 border border-balapor/20 rounded-xl p-3">
              <span className="text-xs text-text">
                Filter aktif: <strong>{tierFilter.replace('_', ' ')}</strong>
              </span>
              <button
                type="button"
                onClick={() => setTierFilter('')}
                className="text-[11px] font-semibold text-balapor hover:text-balapor/80"
              >
                Clear filter ✕
              </button>
            </div>
          )}

          {/* Loading / Error / Empty / List */}
          {candidatesError && (
            <div className="bg-status-critical/8 border border-status-critical/20 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-status-critical" />
                <span className="text-sm text-text">{candidatesError}</span>
              </div>
            </div>
          )}

          {candidatesLoading && candidates.length === 0 && (
            <div className="bg-surface border border-border rounded-xl p-6">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 rounded-full border-2 border-balapor border-t-transparent animate-spin" />
                <span className="text-sm text-text-muted">Scoring candidates…</span>
              </div>
            </div>
          )}

          {!candidatesLoading && !candidatesError && candidates.length === 0 && (
            <div className="bg-surface border border-border rounded-xl p-8 text-center">
              <div className="inline-flex h-12 w-12 rounded-full bg-status-healthy/10 items-center justify-center mb-3">
                <CheckCircle2 size={24} className="text-status-healthy" />
              </div>
              <h3 className="text-sm font-bold text-text mb-1">
                Belum ada verified reports
              </h3>
              <p className="text-xs text-text-muted max-w-md mx-auto">
                Verify dulu beberapa laporan di tab Live Incidents — verified reports
                otomatis muncul di sini sebagai BAKABAR candidates.
              </p>
            </div>
          )}

          {/* Candidates list */}
          {candidates.length > 0 && (
            <div className="space-y-3">
              {candidates
                .filter(c => !tierFilter || c.tier === tierFilter)
                .map((candidate) => {
                  const tierColor =
                    candidate.tier === 'editors_pick'
                      ? 'bg-balapor text-white'
                      : candidate.tier === 'strong'
                        ? 'bg-status-warning/15 text-status-warning border border-status-warning/30'
                        : candidate.tier === 'possible'
                          ? 'bg-status-healthy/15 text-status-healthy border border-status-healthy/30'
                          : 'bg-surface-muted text-text-muted border border-border';

                  const tierLabel =
                    candidate.tier === 'editors_pick'
                      ? "⭐ Editor's Pick"
                      : candidate.tier === 'strong'
                        ? '🔥 Strong'
                        : candidate.tier === 'possible'
                          ? '✓ Possible'
                          : 'Low';

                  return (
                    <div
                      key={candidate.id}
                      className={cn(
                        'bg-surface border rounded-xl overflow-hidden transition-colors',
                        candidate.tier === 'editors_pick'
                          ? 'border-balapor/40'
                          : 'border-border'
                      )}
                    >
                      {/* Card body */}
                      <div className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span
                                className={cn(
                                  'shrink-0 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide',
                                  tierColor
                                )}
                              >
                                {tierLabel}
                              </span>
                              <span className="font-mono text-[10px] text-text-muted">
                                {candidate.display_id || '#—'}
                              </span>
                              {candidate.has_linked_article && (
                                <span className="text-[9px] uppercase tracking-wide font-bold text-balapor bg-balapor/12 px-1.5 py-0.5 rounded">
                                  📰 Sudah jadi artikel
                                </span>
                              )}
                            </div>
                            <h3 className="text-sm font-bold text-text mb-1 leading-tight">
                              {candidate.title}
                            </h3>
                            {candidate.body && (
                              <p className="text-xs text-text-muted line-clamp-2 leading-relaxed">
                                {candidate.body}
                              </p>
                            )}
                          </div>
                          <div className="shrink-0 text-right">
                            <div
                              className={cn(
                                'text-3xl font-extrabold tabular-nums leading-none',
                                candidate.tier === 'editors_pick'
                                  ? 'text-balapor'
                                  : candidate.tier === 'strong'
                                    ? 'text-status-warning'
                                    : 'text-text'
                              )}
                            >
                              {candidate.bakabar_score}
                            </div>
                            <div className="text-[9px] text-text-muted uppercase tracking-wide font-bold mt-0.5">
                              score / 100
                            </div>
                          </div>
                        </div>

                        {/* Meta row */}
                        <div className="flex items-center gap-3 text-[11px] text-text-muted flex-wrap">
                          <span className="flex items-center gap-1">
                            <MapPin size={11} />
                            {candidate.location_name || 'No location'}
                          </span>
                          <span>·</span>
                          <span className="capitalize">{candidate.category}</span>
                          <span>·</span>
                          <span className={cn(
                            'font-semibold',
                            candidate.priority === 'urgent' && 'text-status-critical',
                            candidate.priority === 'high' && 'text-status-warning'
                          )}>
                            {candidate.priority === 'urgent' && '🔴 '}
                            {candidate.priority === 'high' && '🟠 '}
                            {candidate.priority}
                          </span>
                          {candidate.in_cluster && (
                            <>
                              <span>·</span>
                              <span className="text-balapor font-semibold">
                                ⚡ In cluster
                              </span>
                            </>
                          )}
                          {candidate.is_stalemate && (
                            <>
                              <span>·</span>
                              <span className="text-status-warning font-semibold">
                                ⚠️ Stalemate
                              </span>
                            </>
                          )}
                        </div>

                        {/* Score breakdown */}
                        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border">
                          <span className="text-[10px] text-text-muted font-bold uppercase tracking-wide">
                            Breakdown:
                          </span>
                          <span className="text-[10px] text-text-muted">
                            Priority: <strong className="text-text">{candidate.score_breakdown.priority}</strong>
                          </span>
                          <span className="text-[10px] text-text-muted">
                            Photos: <strong className="text-text">{candidate.score_breakdown.photos}</strong> ({candidate.photos_count})
                          </span>
                          <span className="text-[10px] text-text-muted">
                            Body: <strong className="text-text">{candidate.score_breakdown.body}</strong>
                          </span>
                          {candidate.score_breakdown.civic > 0 && (
                            <span className="text-[10px] text-text-muted">
                              Civic: <strong className="text-text">{candidate.score_breakdown.civic}</strong>
                            </span>
                          )}
                          {candidate.score_breakdown.cluster > 0 && (
                            <span className="text-[10px] text-balapor font-semibold">
                              Cluster: +{candidate.score_breakdown.cluster}
                            </span>
                          )}
                          {candidate.score_breakdown.stalemate > 0 && (
                            <span className="text-[10px] text-status-warning font-semibold">
                              Stalemate: +{candidate.score_breakdown.stalemate}
                            </span>
                          )}
                        </div>

                        {/* Action row */}
                        <div className="flex items-center gap-2 pt-2">
                          {!candidate.has_linked_article ? (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleConvertToArticle(candidate)}
                              disabled={convertingId === candidate.id}
                              leftIcon={<Newspaper size={12} />}
                            >
                              {convertingId === candidate.id ? 'AI menulis…' : 'Convert ke BAKABAR'}
                            </Button>
                          ) : (
                            <span className="text-xs text-text-muted italic">
                              Sudah jadi BAKABAR article
                            </span>
                          )}
                          <Link
                            href="/office/newsroom/balapor"
                            className="text-[11px] font-semibold text-balapor hover:text-balapor/80"
                          >
                            Buka di Newsroom →
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* ── WILAYAH TAB (Sub-Sprint 1C-C-12 + SMART) ── */}
      {activeTab === 'wilayah' && (
        <WilayahTab
          active={activeTab === 'wilayah'}
          nonce={wilayahNonce}
          onToast={showToast}
          onNavigateToReports={handleNavigateToReports}
        />
      )}

      {/* ── PELAPOR TAB (Sub-Sprint 1C-C-13 Phase 3 + Phase 5 SMART nav) ── */}
      {activeTab === 'pelapor' && (
        <PelaporTab
          active={activeTab === 'pelapor'}
          nonce={pelaporNonce}
          onToast={showToast}
          onNavigateToReports={handleNavigateToReports}
          initialReporterId={pelaporInitialReporterId}
          onInitialReporterConsumed={handleInitialReporterConsumed}
        />
      )}

      {/* ── AUDIT LOG TAB (Sub-Sprint 1C-C-9) ── */}
      {activeTab === 'audit_log' && !error && (
        <div className="space-y-4">
          {/* Header bar */}
          <div className="flex items-center justify-between bg-surface border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-balapor/12 flex items-center justify-center">
                <ScrollText size={18} className="text-balapor" />
              </div>
              <div>
                <h2 className="text-base font-bold text-text">Audit Log</h2>
                <p className="text-xs text-text-muted">
                  Trail forensik semua admin action — transparency + accountability
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setAuditPage(1);
                setAuditNonce(n => n + 1);
              }}
              leftIcon={<RefreshCw size={12} />}
              disabled={auditLoading}
            >
              Refresh
            </Button>
          </div>

          {/* Phase 4-Fix-D: Compliance Posture KPI Banner */}
          {posture && (() => {
            const score = posture.privacy_anomaly_score;
            const ratio = posture.privacy_ratio_7d;
            // Tier mapping
            const tier =
              score >= 2.5 ? 'critical'
              : score >= 1.5 ? 'warning'
              : score >= 0.5 ? 'healthy'
              : 'calm';
            const tierConfig = {
              critical: {
                bg: 'bg-status-critical/8',
                border: 'border-status-critical/30',
                accent: 'text-status-critical',
                label: '⚠️ ANOMALY DETECTED',
                desc: `Privacy actions ${score.toFixed(1)}× lebih tinggi dari baseline. Investigate.`,
              },
              warning: {
                bg: 'bg-status-warning/8',
                border: 'border-status-warning/30',
                accent: 'text-status-warning',
                label: '⚡ ELEVATED',
                desc: `Privacy actions slightly elevated (${score.toFixed(1)}× baseline). Monitor.`,
              },
              healthy: {
                bg: 'bg-status-healthy/8',
                border: 'border-status-healthy/30',
                accent: 'text-status-healthy',
                label: '✓ HEALTHY',
                desc: `Privacy actions normal (${score.toFixed(1)}× baseline).`,
              },
              calm: {
                bg: 'bg-surface-muted/30',
                border: 'border-border',
                accent: 'text-text-muted',
                label: '○ CALM',
                desc: 'Privacy actions di bawah baseline atau belum ada baseline.',
              },
            }[tier];

            const lastUpdated = new Date(posture.computed_at);
            const minutesAgo = Math.floor((Date.now() - lastUpdated.getTime()) / 60000);
            const lastUpdatedLabel =
              minutesAgo < 1 ? 'just now'
              : minutesAgo < 60 ? `${minutesAgo}m ago`
              : `${Math.floor(minutesAgo / 60)}h ago`;

            return (
              <div className={cn('border rounded-xl p-4 space-y-3', tierConfig.bg, tierConfig.border)}>
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield size={14} className={tierConfig.accent} />
                    <h3 className="text-xs font-bold text-text uppercase tracking-wider">
                      Compliance Posture
                    </h3>
                    <span className={cn('text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full', tierConfig.accent, tierConfig.bg)}>
                      {tierConfig.label}
                    </span>
                  </div>
                  <span className="text-[10px] text-text-muted">
                    Updated {lastUpdatedLabel}
                  </span>
                </div>

                {/* 4 KPI cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  <div className="bg-surface border border-border rounded-lg p-3">
                    <div className="text-[10px] text-text-muted uppercase tracking-wide font-bold mb-1">
                      Total 7d
                    </div>
                    <div className="text-xl font-extrabold text-text tabular-nums">
                      {posture.actions_7d}
                    </div>
                    <div className="text-[9px] text-text-muted mt-0.5">
                      vs {posture.actions_30d} (30d)
                    </div>
                  </div>
                  <div className="bg-surface border border-border rounded-lg p-3">
                    <div className="text-[10px] text-text-muted uppercase tracking-wide font-bold mb-1">
                      Privacy 7d
                    </div>
                    <div className={cn('text-xl font-extrabold tabular-nums', tierConfig.accent)}>
                      {posture.privacy_actions_7d}
                    </div>
                    <div className="text-[9px] text-text-muted mt-0.5">
                      vs {posture.privacy_actions_30d} (30d)
                    </div>
                  </div>
                  <div className="bg-surface border border-border rounded-lg p-3">
                    <div className="text-[10px] text-text-muted uppercase tracking-wide font-bold mb-1">
                      Privacy %
                    </div>
                    <div className={cn('text-xl font-extrabold tabular-nums', tierConfig.accent)}>
                      {(ratio * 100).toFixed(0)}%
                    </div>
                    <div className="text-[9px] text-text-muted mt-0.5">
                      of all actions
                    </div>
                  </div>
                  <div className="bg-surface border border-border rounded-lg p-3">
                    <div className="text-[10px] text-text-muted uppercase tracking-wide font-bold mb-1">
                      Anomaly Score
                    </div>
                    <div className={cn('text-xl font-extrabold tabular-nums', tierConfig.accent)}>
                      {score.toFixed(2)}×
                    </div>
                    <div className="text-[9px] text-text-muted mt-0.5">
                      vs 30d avg
                    </div>
                  </div>
                </div>

                {/* Status message */}
                <div className={cn('text-xs leading-relaxed', tierConfig.accent)}>
                  {tierConfig.desc}
                </div>
              </div>
            );
          })()}

          {/* Action filter pills */}
          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2.5">
              Filter Action
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {[
                { value: '', label: 'Semua' },
                { value: 'verify', label: '✅ Verify' },
                { value: 'reject', label: '❌ Reject' },
                { value: 'soft_delete', label: '🗑️ Soft Delete' },
                { value: 'restore', label: '♻️ Restore' },
                { value: 'set_priority', label: '🏷️ Set Priority' },
                { value: 'set_spam', label: '⚠️ Spam' },
                { value: 'convert_bakabar', label: '📰 Convert BAKABAR' },
                { value: 'edit_metadata', label: '✏️ Edit' },
                { value: 'identity_reveal', label: '🔓 Identity Reveal' },
              ].map((opt) => {
                const isActive = auditActionFilter === opt.value;
                return (
                  <button
                    key={opt.value || 'all-action'}
                    type="button"
                    onClick={() => {
                      setAuditActionFilter(opt.value as AuditActionType | '');
                      setAuditPage(1);
                    }}
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

          {/* Stats summary */}
          {auditMeta && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-surface border border-border rounded-xl p-4">
                <div className="text-[11px] text-text-muted uppercase tracking-wide font-bold mb-1">
                  Total Entries
                </div>
                <div className="text-2xl font-extrabold text-balapor tabular-nums">
                  {auditMeta.total}
                </div>
              </div>
              <div className="bg-surface border border-border rounded-xl p-4">
                <div className="text-[11px] text-text-muted uppercase tracking-wide font-bold mb-1">
                  Page
                </div>
                <div className="text-2xl font-extrabold text-text tabular-nums">
                  {auditMeta.page}
                </div>
                <div className="text-[10px] text-text-muted mt-0.5">
                  {auditMeta.limit}/page
                </div>
              </div>
              <div className="bg-surface border border-border rounded-xl p-4">
                <div className="text-[11px] text-text-muted uppercase tracking-wide font-bold mb-1">
                  Showing
                </div>
                <div className="text-2xl font-extrabold text-text tabular-nums">
                  {auditLogs.length}
                </div>
                <div className="text-[10px] text-text-muted mt-0.5">
                  {auditMeta.has_more ? 'More available' : 'All shown'}
                </div>
              </div>
            </div>
          )}

          {/* Loading / Error / Empty / List */}
          {auditError && (
            <div className="bg-status-critical/8 border border-status-critical/20 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-status-critical" />
                <span className="text-sm text-text">{auditError}</span>
              </div>
            </div>
          )}

          {auditLoading && auditLogs.length === 0 && (
            <div className="bg-surface border border-border rounded-xl p-6">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 rounded-full border-2 border-balapor border-t-transparent animate-spin" />
                <span className="text-sm text-text-muted">Loading audit log…</span>
              </div>
            </div>
          )}

          {!auditLoading && !auditError && auditLogs.length === 0 && (
            <div className="bg-surface border border-border rounded-xl p-8 text-center">
              <div className="inline-flex h-12 w-12 rounded-full bg-status-healthy/10 items-center justify-center mb-3">
                <ScrollText size={24} className="text-status-healthy" />
              </div>
              <h3 className="text-sm font-bold text-text mb-1">
                Belum ada audit entries
              </h3>
              <p className="text-xs text-text-muted max-w-md mx-auto">
                Belum ada admin action yang ter-log
                {auditActionFilter && ` untuk action "${auditActionFilter}"`}.
                Setiap action moderation akan tercatat di sini secara otomatis.
              </p>
            </div>
          )}

          {/* Audit log entries list */}
          {auditLogs.length > 0 && (
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              {auditLogs.map((entry, idx) => {
                const actionConfig: Record<string, { label: string; color: string }> = {
                  verify: { label: '✅ Verify', color: 'text-status-healthy bg-status-healthy/10' },
                  reject: { label: '❌ Reject', color: 'text-status-warning bg-status-warning/10' },
                  soft_delete: { label: '🗑️ Soft Delete', color: 'text-status-critical bg-status-critical/10' },
                  restore: { label: '♻️ Restore', color: 'text-balapor bg-balapor/10' },
                  set_priority: { label: '🏷️ Set Priority', color: 'text-text bg-surface-muted' },
                  set_spam: { label: '⚠️ Spam', color: 'text-status-warning bg-status-warning/10' },
                  convert_bakabar: { label: '📰 Convert BAKABAR', color: 'text-balapor bg-balapor/10' },
                  edit_metadata: { label: '✏️ Edit', color: 'text-text bg-surface-muted' },
                  // Privacy actions (Phase 4-Fix-B) — visually distinguished
                  identity_reveal: { label: '🔓 Identity (Legacy)', color: 'text-status-critical bg-status-critical/10' },
                  forensic_reveal: { label: '🔍 Forensic Reveal', color: 'text-status-critical bg-status-critical/10' },
                  contact_wa: { label: '💬 Contact WA', color: 'text-balapor bg-balapor/10' },
                  mark_forwarded: { label: '↗️ Forward', color: 'text-text-muted bg-surface-muted' },
                };
                const config = actionConfig[entry.action] || {
                  label: entry.action,
                  color: 'text-text-muted bg-surface-muted',
                };

                const isPrivacy = entry.is_privacy_action;

                // TD-061-B: Privacy rows clickable jika action eligible + reporter_id ada
                const isClickable =
                  isPrivacy &&
                  (entry.action === 'forensic_reveal' || entry.action === 'contact_wa') &&
                  !!entry.reporter_id;

                const handleRowKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
                  if (!isClickable) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleAuditPrivacyClick({
                      action: entry.action,
                      reporter_id: entry.reporter_id ?? null,
                      reporter_name: entry.reporter_name ?? null,
                    });
                  }
                };

                return (
                  <div
                    key={entry.id}
                    onClick={
                      isClickable
                        ? () =>
                            handleAuditPrivacyClick({
                              action: entry.action,
                              reporter_id: entry.reporter_id ?? null,
                              reporter_name: entry.reporter_name ?? null,
                            })
                        : undefined
                    }
                    onKeyDown={isClickable ? handleRowKey : undefined}
                    role={isClickable ? 'button' : undefined}
                    tabIndex={isClickable ? 0 : undefined}
                    aria-label={
                      isClickable
                        ? `Buka drawer pelapor ${entry.reporter_name || 'anonim'}`
                        : undefined
                    }
                    title={isClickable ? 'Klik untuk buka drawer pelapor →' : undefined}
                    className={cn(
                      'flex items-start gap-3 p-4 transition-colors',
                      idx !== auditLogs.length - 1 && 'border-b border-border',
                      // Phase 4-Fix-B: privacy rows red-tinted background
                      isPrivacy && 'bg-status-critical/[0.04]',
                      // TD-061-B: clickable visual hint
                      isClickable &&
                        'cursor-pointer hover:bg-status-critical/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-critical/30 focus-visible:ring-inset'
                    )}
                  >
                    {/* Timestamp + action */}
                    <div className="shrink-0 w-32">
                      <div className="flex items-center gap-1 mb-1">
                        <Clock size={10} className="text-text-muted" />
                        <span className="text-[10px] text-text-muted font-mono">
                          {timeAgoCompact(entry.created_at)}
                        </span>
                      </div>
                      <span
                        className={cn(
                          'inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide',
                          config.color
                        )}
                      >
                        {config.label}
                      </span>
                      {/* Phase 4-Fix-B: PRIVACY badge */}
                      {isPrivacy && (
                        <span className="block mt-1 px-1.5 py-0.5 rounded text-[8px] font-extrabold tracking-wider bg-status-critical/15 text-status-critical w-fit">
                          🔒 PRIVACY
                        </span>
                      )}
                    </div>

                    {/* Context + details — conditional privacy vs report */}
                    <div className="flex-1 min-w-0">
                      {isPrivacy ? (
                        <>
                          {/* Privacy header */}
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-[10px] uppercase font-bold tracking-wide text-status-critical">
                              Privacy Access
                            </span>
                            {entry.report_display_id && (
                              <span className="font-mono text-[10px] text-text-muted">
                                · {entry.report_display_id}
                              </span>
                            )}
                          </div>
                          {/* Reporter context (denormalized snapshot) */}
                          <div className="text-sm font-semibold text-text mb-1 flex items-center gap-2 flex-wrap">
                            <span>{entry.reporter_name || 'Pelapor (anonim)'}</span>
                            {entry.reporter_phone && (
                              <span className="font-mono text-[11px] text-text-muted">
                                {entry.reporter_phone}
                              </span>
                            )}
                          </div>
                          {/* Reason (compliance context) */}
                          {entry.note && (
                            <div className="text-xs text-text-muted italic mb-1">
                              Alasan: "{entry.note}"
                            </div>
                          )}
                          {/* Actor + forensic IP (bold for emphasis) */}
                          <div className="flex items-center gap-2 text-[10px] text-text-muted flex-wrap">
                            <span>Diakses oleh:</span>
                            <span className="font-mono">
                              {entry.actor_role} · {entry.actor_id.slice(-6)}
                            </span>
                            {entry.ip_address && (
                              <>
                                <span>·</span>
                                <span className="font-mono font-bold text-status-critical">
                                  IP: {entry.ip_address}
                                </span>
                              </>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Report row treatment (existing) */}
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-[10px] text-text-muted">
                              {entry.report_display_id || '#—'}
                            </span>
                            {entry.report_status && (
                              <span className="text-[9px] uppercase font-bold tracking-wide text-text-muted">
                                · {entry.report_status}
                              </span>
                            )}
                          </div>
                          <div className="text-sm font-semibold text-text mb-1 truncate">
                            {entry.report_title || '(report deleted)'}
                          </div>
                          {entry.note && (
                            <div className="text-xs text-text-muted italic mb-1">
                              "{entry.note}"
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-[10px] text-text-muted">
                            <span>Actor:</span>
                            <span className="font-mono">
                              {entry.actor_role} · {entry.actor_id.slice(-6)}
                            </span>
                            {entry.ip_address && (
                              <>
                                <span>·</span>
                                <span className="font-mono">{entry.ip_address}</span>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Full timestamp */}
                    <div
                      className="shrink-0 text-[10px] text-text-muted font-mono"
                      title={new Date(entry.created_at).toLocaleString('id-ID')}
                    >
                      {new Date(entry.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </div>

                    {/* TD-061-B: Visual hint arrow untuk clickable privacy rows */}
                    {isClickable && (
                      <div
                        className="shrink-0 flex items-center text-status-critical/70"
                        aria-hidden="true"
                      >
                        <ChevronRight size={14} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {auditMeta && (auditMeta.has_more || auditPage > 1) && (
            <div className="flex items-center justify-between bg-surface border border-border rounded-xl p-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setAuditPage(p => Math.max(1, p - 1))}
                disabled={auditPage === 1 || auditLoading}
              >
                ← Previous
              </Button>
              <span className="text-xs text-text-muted">
                Page {auditMeta.page} of {Math.ceil(auditMeta.total / auditMeta.limit)}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setAuditPage(p => p + 1)}
                disabled={!auditMeta.has_more || auditLoading}
              >
                Next →
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── DEEP DIVE TAB ── */}
      {activeTab === 'deepdive' && !error && (
        <DeepDiveView
          data={deepDive}
          loading={deepDiveLoading}
          onRefresh={handleDeepDiveRefresh}
        />
      )}

      {/* ── Reports page complete notice ── */}
      {!error && !loading && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-status-healthy/8 border border-status-healthy/20">
          <AlertCircle size={14} className="text-status-healthy shrink-0" />
          <p className="text-[11px] text-text-secondary flex-1">
            <span className="font-semibold">Reports page lengkap.</span>{' '}
            Overview + Live Incidents + Deep Dive Analytics semua aktif.
          </p>
        </div>
      )}

      {/* ── Delete Report Modal (Sub-Sprint 1C-C-3) ── */}
      <DeleteReportModal
        report={
          deleteTarget
            ? {
                id: deleteTarget.id,
                title: deleteTarget.title,
                display_id: (deleteTarget as Report & { display_id?: string | null }).display_id ?? null,
              }
            : null
        }
        onClose={() => setDeleteTarget(null)}
        onSubmit={handleSoftDelete}
      />

      {/* ── Reject Report Modal (Sub-Sprint 1C-C-9) ── */}
      <RejectReportModal
        report={
          rejectTarget
            ? {
                id: rejectTarget.id,
                title: rejectTarget.title,
                display_id: (rejectTarget as Report & { display_id?: string | null }).display_id ?? null,
              }
            : null
        }
        onClose={() => setRejectTarget(null)}
        onSubmit={handleRejectSubmit}
      />

      {/* ── Photo Lightbox (Sub-Sprint 1C-C-10) ── */}
      {lightboxTarget && (
        <PhotoLightbox
          photos={lightboxOverride?.photos ?? lightboxTarget.photos}
          initialIndex={lightboxOverride?.initialIndex ?? 0}
          reportTitle={lightboxOverride?.title ?? lightboxTarget.title}
          reportDisplayId={
            lightboxOverride
              ? null
              : (lightboxTarget as Report & { display_id?: string | null }).display_id ?? null
          }
          onClose={() => {
            setLightboxTarget(null);
            setLightboxOverride(null);
          }}
        />
      )}

      {/* ── Civic Timeline Admin Modal (Sub-Sprint 1C-C-11) ── */}
      {civicTarget && (
        <CivicTimelineAdminModal
          report={{
            id: civicTarget.id,
            title: civicTarget.title,
            display_id: (civicTarget as Report & { display_id?: string | null }).display_id ?? null,
            follow_up_current_status: civicTarget.follow_up_current_status ?? null,
          }}
          onClose={() => setCivicTarget(null)}
          onPhotoClick={handleCivicPhotoClick}
        />
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
