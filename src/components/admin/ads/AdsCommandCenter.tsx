'use client';

/**
 * TeraLoka — AdsCommandCenter (v9 — Sub-Phase 8-E-6 Mini A+B+C)
 * Sub-Phase 8-E-6 final (17 Mei 2026)
 * ------------------------------------------------------------
 * CHANGES Sub-Phase 8-E-6 Mini A+B+C:
 *   - Mini A: ADD display_id?: string | null to AdRow type
 *   - Mini B: Replace handleBulkAction native confirm/prompt with BulkActionModal state
 *   - Mini C: Wire AdPreviewModal state + onPreview handler
 *
 * Modal stack now (3 modals):
 *   1. BulkActionModal — pause/resume/soft_delete confirm (NEW, replace native)
 *   2. AdPreviewModal — Eye icon trigger (NEW)
 *   3. DeleteAdModal + RejectAdModal — single action (existing, untouched)
 *
 * History:
 *   - 17 Mei 2026: v7 Region/Date/Sort + bulk UI prep
 *   - 17 Mei 2026: v8 wire bulk action handler (native confirm)
 *   - 17 Mei 2026: v9 (Mini A+B+C) display_id + BulkActionModal + AdPreviewModal
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  RefreshCw, Trash2, AlertCircle, CheckCircle2, Plus, X, AlarmClock,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import AdsStatsCards from './AdsStatsCards';
import AdsBottomPanels, {
  type ActionQueueKind, type ActionQueueData,
} from './AdsBottomPanels';
import AdsTable, { type BulkActionType } from './AdsTable';
import AdsSmartFilter, {
  type AdStatusFilter, type AdvertiserTypeFilter,
  type AdRegionFilter, type AdDateRangeFilter, type AdSortBy,
  REGION_OPTIONS, DATE_RANGE_OPTIONS,
} from './AdsSmartFilter';
import DeleteAdModal from './DeleteAdModal';
import RejectAdModal from './RejectAdModal';
import BulkActionModal from './BulkActionModal';
import AdPreviewModal from './AdPreviewModal';

const API =
  process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

const ACTION_QUEUE_POLL_MS = 60_000;

// ─── Types ───────────────────────────────────────────────────────

export type AdRow = {
  id:                  string;
  /** Sub-Phase 8-E-2: human-readable ID (ADS-2026-NNNN) */
  display_id?:         string | null;
  title:               string | null;
  body:                string | null;
  image_url:           string | null;
  link_url:            string | null;
  advertiser_name:     string;
  advertiser_logo_url: string | null;
  advertiser_type:     'umum' | 'politisi' | 'pemerintah' | 'komersial';
  positions:           string[];
  target_regions:      string[] | null;
  creative_frames:     any[] | null;
  ad_format:           'image' | 'text';
  status:              string;
  starts_at:           string;
  ends_at:             string;
  impression_count:    number;
  click_count:         number;
  view_count:          number;
  delete_reason:       string | null;
  deleted_at:          string | null;
  rejection_reason:    string | null;
  created_at:          string;
  updated_at:          string;
};

type ListResponse = {
  success: boolean;
  data?: {
    ads:    AdRow[];
    total:  number;
    limit:  number;
    offset: number;
  };
  error?: { code: string; message: string };
};

type ActionQueueResponse = {
  success: boolean;
  data?: ActionQueueData;
  error?: { code: string; message: string };
};

type BulkActionResponse = {
  success: boolean;
  data?: {
    action:        BulkActionType;
    total:         number;
    success_count: number;
    failed_count:  number;
    errors:        Array<{ ad_id: string; error: string }>;
  };
  error?: { code: string; message: string };
};

type Toast = { id: number; msg: string; type: 'ok' | 'err' };

type ModalState =
  | { kind: 'none' }
  | { kind: 'delete'; ad: AdRow }
  | { kind: 'reject'; ad: AdRow };

// Sub-Phase 8-E-6 Mini B: bulk modal state
type BulkModalState =
  | { open: false }
  | { open: true; action: BulkActionType; eligibleAds: AdRow[] };

// ─── Component ───────────────────────────────────────────────────

export default function AdsCommandCenter() {
  const { token, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [ads, setAds]                 = useState<AdRow[]>([]);
  const [total, setTotal]             = useState(0);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [toasts, setToasts]           = useState<Toast[]>([]);

  const [actionQueue, setActionQueue]               = useState<ActionQueueData | null>(null);
  const [actionQueueLoading, setActionQueueLoading] = useState(true);
  const actionQueuePollingRef = useRef<NodeJS.Timeout | null>(null);

  const [filterStatus, setFilterStatus]     = useState<AdStatusFilter>('all');
  const [filterType, setFilterType]         = useState<AdvertiserTypeFilter>('all');
  const [searchQuery, setSearchQuery]       = useState('');
  const [endingSoonOnly, setEndingSoonOnly] = useState(false);

  const [filterRegion, setFilterRegion]   = useState<AdRegionFilter>('all');
  const [dateRange, setDateRange]         = useState<AdDateRangeFilter>('all');
  const [sortBy, setSortBy]               = useState<AdSortBy>('created_desc');
  const [selectedAdIds, setSelectedAdIds] = useState<Set<string>>(new Set());

  const [modal, setModal]                 = useState<ModalState>({ kind: 'none' });

  // Sub-Phase 8-E-6 Mini B: bulk action modal state
  const [bulkModal, setBulkModal] = useState<BulkModalState>({ open: false });

  // Sub-Phase 8-E-6 Mini C: preview modal state
  const [previewAdId, setPreviewAdId] = useState<string | null>(null);

  useEffect(() => {
    if (filterStatus !== 'active' && endingSoonOnly) {
      setEndingSoonOnly(false);
    }
  }, [filterStatus, endingSoonOnly]);

  useEffect(() => {
    setSelectedAdIds(new Set());
  }, [filterStatus, filterType, filterRegion, dateRange, searchQuery, showDeleted]);

  const showToast = useCallback((msg: string, type: 'ok' | 'err' = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const fetchAds = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('limit', '100');
      if (showDeleted) params.set('include_deleted', 'true');

      const res = await fetch(`${API}/admin/ads/list?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json: ListResponse = await res.json();

      if (!json.success || !json.data) {
        setError(json.error?.message ?? 'Gagal memuat data iklan');
        return;
      }

      setAds(json.data.ads);
      setTotal(json.data.total);
    } catch (err: any) {
      setError(err?.message ?? 'Network error — cek koneksi internet');
    } finally {
      setLoading(false);
    }
  }, [showDeleted, token]);

  useEffect(() => {
    if (!authLoading) fetchAds();
  }, [authLoading, fetchAds]);

  const fetchActionQueue = useCallback(async (silent: boolean = false) => {
    if (!token) return;
    if (!silent) setActionQueueLoading(true);
    try {
      const res = await fetch(`${API}/admin/ads/action-queue`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json: ActionQueueResponse = await res.json();

      if (!json.success || !json.data) {
        console.error('[ActionQueue] fetch failed:', json.error?.message);
        return;
      }

      setActionQueue(json.data);
    } catch (err: any) {
      console.error('[ActionQueue] network error:', err);
    } finally {
      if (!silent) setActionQueueLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (authLoading) return;

    fetchActionQueue(false);

    actionQueuePollingRef.current = setInterval(() => {
      fetchActionQueue(true);
    }, ACTION_QUEUE_POLL_MS);

    return () => {
      if (actionQueuePollingRef.current) {
        clearInterval(actionQueuePollingRef.current);
        actionQueuePollingRef.current = null;
      }
    };
  }, [authLoading, fetchActionQueue]);

  const filteredAds = useMemo(() => {
    const now = Date.now();
    const next24h = now + 24 * 60 * 60 * 1000;

    const dateRangeCfg = DATE_RANGE_OPTIONS.find((d) => d.key === dateRange);
    const dateCutoff = dateRangeCfg?.days ? now - dateRangeCfg.days * 24 * 60 * 60 * 1000 : null;

    const regionCfg = REGION_OPTIONS.find((r) => r.key === filterRegion);
    const regionMatchValues = regionCfg?.matchValues ?? [];

    const filtered = ads.filter((ad) => {
      if (filterStatus !== 'all' && ad.status !== filterStatus) return false;
      if (filterType !== 'all' && ad.advertiser_type !== filterType) return false;

      if (filterRegion !== 'all' && regionMatchValues.length > 0) {
        const isUniversal = ad.target_regions === null;
        const isMatched = ad.target_regions?.some((r) =>
          regionMatchValues.some((m) => r.toLowerCase().includes(m.toLowerCase()))
        );
        if (!isUniversal && !isMatched) return false;
      }

      if (searchQuery.trim().length > 0) {
        const q = searchQuery.trim().toLowerCase();
        const haystack =
          `${ad.title ?? ''} ${ad.body ?? ''} ${ad.advertiser_name} ${ad.display_id ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      if (endingSoonOnly) {
        const endsMs = new Date(ad.ends_at).getTime();
        if (!(endsMs > now && endsMs < next24h)) return false;
      }

      if (dateCutoff !== null) {
        const createdMs = new Date(ad.created_at).getTime();
        if (createdMs < dateCutoff) return false;
      }

      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'created_desc':     return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'ends_asc':         return new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime();
        case 'impression_desc':  return b.impression_count - a.impression_count;
        case 'name_asc':         return a.advertiser_name.localeCompare(b.advertiser_name, 'id');
        default: return 0;
      }
    });

    return sorted;
  }, [ads, filterStatus, filterType, filterRegion, searchQuery, endingSoonOnly, dateRange, sortBy]);

  const statusCounts = useMemo(() => {
    const counts: Partial<Record<AdStatusFilter, number>> = { all: ads.length };
    ads.forEach((ad) => {
      const key = ad.status as AdStatusFilter;
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return counts;
  }, [ads]);

  const typeCounts = useMemo(() => {
    const counts: Partial<Record<AdvertiserTypeFilter, number>> = { all: ads.length };
    ads.forEach((ad) => {
      const key = ad.advertiser_type as AdvertiserTypeFilter;
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return counts;
  }, [ads]);

  // Click handlers
  const scrollToTable = useCallback(() => {
    document.getElementById('ads-table-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const scrollToSlotInventory = useCallback(() => {
    document.getElementById('slot-inventory-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleStatsCardClick = useCallback((id: string) => {
    switch (id) {
      case 'slot':    scrollToSlotInventory(); break;
      case 'active':  setFilterStatus('active'); setEndingSoonOnly(false); scrollToTable(); break;
      case 'pending': setFilterStatus('pending_review' as AdStatusFilter); setEndingSoonOnly(false); scrollToTable(); break;
      case 'ending':  setFilterStatus('active'); setEndingSoonOnly(true); scrollToTable(); break;
      case 'revenue': router.push('/admin/financial'); break;
    }
  }, [router, scrollToTable, scrollToSlotInventory]);

  const handleActionQueueClick = useCallback((kind: ActionQueueKind) => {
    switch (kind) {
      case 'pending_review':  setFilterStatus('pending_review' as AdStatusFilter); setEndingSoonOnly(false); scrollToTable(); break;
      case 'expire_soon':     setFilterStatus('active'); setEndingSoonOnly(true); scrollToTable(); break;
      case 'pending_payment': setFilterStatus('pending_payment' as AdStatusFilter); setEndingSoonOnly(false); scrollToTable(); break;
      case 'renewal_risk':
        setFilterStatus('active'); setEndingSoonOnly(false); scrollToTable();
        showToast('Renewal Risk — review active ads yang expire <30 hari', 'ok');
        break;
      case 'slot_empty': scrollToSlotInventory(); break;
    }
  }, [scrollToTable, scrollToSlotInventory, showToast]);

  const handlePipelineStageClick = useCallback((status: string) => {
    setFilterStatus(status as AdStatusFilter);
    setEndingSoonOnly(false);
    scrollToTable();
  }, [scrollToTable]);

  const handlePositionClick = useCallback((positionKey: string) => {
    showToast(`Filter posisi "${positionKey}" — coming Phase 2`, 'ok');
  }, [showToast]);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchAds(), fetchActionQueue(false)]);
  }, [fetchAds, fetchActionQueue]);

  // ═══════════════════════════════════════════════════════════════
  // Sub-Phase 8-E-6 Mini B: Bulk Action — open modal (replace native)
  // ═══════════════════════════════════════════════════════════════

  const handleBulkActionRequest = useCallback((action: BulkActionType, adIds: string[]) => {
    if (adIds.length === 0) {
      showToast('Tidak ada iklan eligible untuk action ini', 'err');
      return;
    }

    const eligibleAds = ads.filter((a) => adIds.includes(a.id));
    setBulkModal({ open: true, action, eligibleAds });
  }, [ads, showToast]);

  const handleBulkActionConfirm = useCallback(async (
    action: BulkActionType,
    adIds: string[],
    reason?: string
  ) => {
    if (!token) throw new Error('Token tidak tersedia');

    const res = await fetch(`${API}/admin/ads/bulk-action`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        Authorization:   `Bearer ${token}`,
      },
      body: JSON.stringify({
        action,
        ad_ids: adIds,
        ...(reason ? { reason } : {}),
      }),
    });

    const json: BulkActionResponse = await res.json();

    if (!json.success || !json.data) {
      throw new Error(json.error?.message ?? `Gagal ${action}`);
    }

    const { success_count, failed_count, total, errors } = json.data;

    const actionLabel = {
      pause:        'pause',
      resume:       'resume',
      soft_delete:  'hapus',
    }[action];

    if (failed_count === 0) {
      showToast(`✓ Berhasil ${actionLabel} ${success_count} iklan`, 'ok');
    } else if (success_count === 0) {
      showToast(
        `✕ Semua ${total} iklan gagal ${actionLabel}. Error: ${errors[0]?.error ?? 'unknown'}`,
        'err'
      );
    } else {
      showToast(
        `⚠ ${actionLabel}: ${success_count} sukses, ${failed_count} gagal. Error pertama: ${errors[0]?.error ?? 'unknown'}`,
        'err'
      );
    }

    setBulkModal({ open: false });
    setSelectedAdIds(new Set());
    await refreshAll();
  }, [token, showToast, refreshAll]);

  // ═══════════════════════════════════════════════════════════════
  // Sub-Phase 8-E-6 Mini C: Preview handler
  // ═══════════════════════════════════════════════════════════════

  const handlePreview = useCallback((ad: AdRow) => {
    setPreviewAdId(ad.id);
  }, []);

  // ─── Single action handlers (unchanged) ───────────────────────

  const handleStatusTransition = async (adId: string, to: string) => {
    try {
      const res = await fetch(`${API}/admin/ads/${adId}/status`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          Authorization:   `Bearer ${token}`,
        },
        body: JSON.stringify({ to }),
      });
      const json = await res.json();
      if (!json.success) {
        showToast(json.error?.message ?? 'Gagal ubah status', 'err');
        return;
      }
      showToast(`✓ Status diubah ke ${to}`, 'ok');
      await refreshAll();
    } catch (err: any) {
      showToast(err?.message ?? 'Network error', 'err');
    }
  };

  const handleSoftDelete = (adId: string, _title: string) => {
    const ad = ads.find((a) => a.id === adId);
    if (!ad) return;
    setModal({ kind: 'delete', ad });
  };

  const handleSoftDeleteConfirm = async (adId: string, reason: string) => {
    const res = await fetch(`${API}/admin/ads/${adId}/soft-delete`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        Authorization:   `Bearer ${token}`,
      },
      body: JSON.stringify({ reason }),
    });
    const json = await res.json();
    if (!json.success) {
      throw new Error(json.error?.message ?? 'Gagal hapus iklan');
    }
    showToast(`🗑 Iklan dipindah ke Sampah`, 'ok');
    setModal({ kind: 'none' });
    await refreshAll();
  };

  const handleRestore = async (adId: string) => {
    if (!window.confirm('Pulihkan iklan dari Sampah?')) return;

    try {
      const res = await fetch(`${API}/admin/ads/${adId}/restore`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!json.success) {
        showToast(json.error?.message ?? 'Gagal restore', 'err');
        return;
      }
      showToast(`↩ Iklan dipulihkan ke status: ${json.restored_to ?? 'paused'}`, 'ok');
      await refreshAll();
    } catch (err: any) {
      showToast(err?.message ?? 'Network error', 'err');
    }
  };

  const handleReject = (adId: string, _title: string) => {
    const ad = ads.find((a) => a.id === adId);
    if (!ad) return;
    setModal({ kind: 'reject', ad });
  };

  const handleRejectConfirm = async (adId: string, reason: string) => {
    const res = await fetch(`${API}/admin/ads/${adId}/reject`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        Authorization:   `Bearer ${token}`,
      },
      body: JSON.stringify({ reason }),
    });
    const json = await res.json();
    if (!json.success) {
      throw new Error(json.error?.message ?? 'Gagal reject');
    }
    showToast(`✕ Iklan ditolak`, 'ok');
    setModal({ kind: 'none' });
    await refreshAll();
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 rounded-full border-2 border-ads border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error && ads.length === 0) {
    return (
      <div className="bg-status-critical/8 border border-status-critical/30 rounded-xl p-4 flex items-center gap-3">
        <AlertCircle className="text-status-critical shrink-0" size={20} />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-status-critical">Gagal memuat data iklan</p>
          <p className="text-[11px] text-text-muted mt-0.5">{error}</p>
        </div>
        <button
          type="button"
          onClick={refreshAll}
          className="shrink-0 px-3 py-1.5 rounded-md bg-status-critical text-white text-[11px] font-bold hover:bg-status-critical/90 transition-colors"
        >
          Coba lagi
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={cn(
                'flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg animate-in slide-in-from-right',
                t.type === 'ok' ? 'bg-status-healthy text-white' : 'bg-status-critical text-white'
              )}
            >
              {t.type === 'ok' ? <CheckCircle2 size={18} className="shrink-0" /> : <AlertCircle size={18} className="shrink-0" />}
              <span className="text-[12px] font-semibold">{t.msg}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold text-text tracking-tight">ADS Command Center</h2>
          <p className="text-[12px] text-text-muted mt-0.5">Kelola semua iklan TeraLoka dalam satu layar</p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/ads/new"
            className={cn(
              'inline-flex items-center gap-2 px-4 py-1.5 rounded-md',
              'bg-ads text-white text-[11px] font-bold uppercase tracking-wide',
              'hover:bg-ads-strong transition-colors shadow-sm'
            )}
            title="Onboard advertiser baru via form"
          >
            <Plus size={12} />
            Tambah Iklan
          </Link>

          <button
            type="button"
            onClick={() => setShowDeleted((v) => !v)}
            className={cn(
              'inline-flex items-center gap-2 px-3 py-1.5 rounded-md',
              'text-[11px] font-bold uppercase tracking-wide transition-colors',
              showDeleted
                ? 'bg-balapor/12 text-balapor border border-balapor/30'
                : 'bg-surface border border-border text-text-muted hover:text-text'
            )}
            title={showDeleted ? 'Sembunyikan Sampah' : 'Tampilkan Sampah'}
          >
            <Trash2 size={12} />
            Sampah
          </button>

          <button
            type="button"
            onClick={refreshAll}
            disabled={loading}
            className={cn(
              'inline-flex items-center gap-2 px-3 py-1.5 rounded-md',
              'bg-surface border border-border text-text text-[11px] font-bold uppercase tracking-wide',
              'hover:bg-surface-muted transition-colors',
              loading && 'opacity-50 cursor-not-allowed'
            )}
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <AdsStatsCards
        ads={ads}
        total={total}
        loading={loading && ads.length === 0}
        onCardClick={handleStatsCardClick}
      />

      <AdsBottomPanels
        ads={ads}
        actionQueueData={actionQueue}
        actionQueueLoading={actionQueueLoading}
        onPositionClick={handlePositionClick}
        onStageClick={handlePipelineStageClick}
        onActionQueueClick={handleActionQueueClick}
      />

      <AdsSmartFilter
        status={filterStatus}
        advertiserType={filterType}
        search={searchQuery}
        region={filterRegion}
        dateRange={dateRange}
        sortBy={sortBy}
        onStatusChange={setFilterStatus}
        onAdvertiserTypeChange={setFilterType}
        onSearchChange={setSearchQuery}
        onRegionChange={setFilterRegion}
        onDateRangeChange={setDateRange}
        onSortByChange={setSortBy}
        statusCounts={statusCounts}
        typeCounts={typeCounts}
      />

      {endingSoonOnly && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-status-warning/8 border border-status-warning/30">
          <AlarmClock className="text-status-warning shrink-0" size={14} />
          <span className="text-[12px] font-semibold text-status-warning flex-1">
            Filter tambahan: <strong>Akan Berakhir &lt; 24 jam</strong>
          </span>
          <button
            type="button"
            onClick={() => setEndingSoonOnly(false)}
            className="shrink-0 p-1 rounded hover:bg-status-warning/15 transition-colors"
            title="Hapus filter ending soon"
          >
            <X size={12} className="text-status-warning" />
          </button>
        </div>
      )}

      <div id="ads-table-section">
        <AdsTable
          ads={filteredAds}
          showDeleted={showDeleted}
          selectedAdIds={selectedAdIds}
          onSelectionChange={setSelectedAdIds}
          onBulkAction={handleBulkActionRequest}
          onPreview={handlePreview}
          onTransition={handleStatusTransition}
          onSoftDelete={handleSoftDelete}
          onRestore={handleRestore}
          onReject={handleReject}
        />
      </div>

      {/* Sub-Phase 8-E-6 Mini B: BulkActionModal */}
      <BulkActionModal
        action={bulkModal.open ? bulkModal.action : null}
        ads={bulkModal.open ? bulkModal.eligibleAds : []}
        onConfirm={handleBulkActionConfirm}
        onClose={() => setBulkModal({ open: false })}
      />

      {/* Sub-Phase 8-E-6 Mini C: AdPreviewModal */}
      <AdPreviewModal
        adId={previewAdId}
        onClose={() => setPreviewAdId(null)}
      />

      {/* Existing single action modals */}
      <DeleteAdModal
        ad={modal.kind === 'delete' ? modal.ad : null}
        onConfirm={handleSoftDeleteConfirm}
        onClose={() => setModal({ kind: 'none' })}
      />
      <RejectAdModal
        ad={modal.kind === 'reject' ? modal.ad : null}
        onConfirm={handleRejectConfirm}
        onClose={() => setModal({ kind: 'none' })}
      />
    </div>
  );
}
