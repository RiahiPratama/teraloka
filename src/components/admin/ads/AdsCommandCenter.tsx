'use client';

/**
 * TeraLoka — AdsCommandCenter (v7 — Sub-Phase 8-E-5)
 * Sub-Phase 8-E-4 → 8-E-5 (17 Mei 2026)
 * ------------------------------------------------------------
 * CHANGES Sub-Phase 8-E-5:
 *   - ADD state: region, dateRange, sortBy
 *   - ADD state: selectedAdIds (Set<string>) untuk bulk selection
 *   - UPDATE filteredAds useMemo: + region filter + date range + sort
 *   - Wire 3 new filters ke AdsSmartFilter
 *   - Wire selectedAdIds ke AdsTable
 *
 * Filter pipeline (client-side, max 100 ads loaded):
 *   1. status filter
 *   2. advertiser_type filter
 *   3. region filter (Sub-Phase 8-E-5)
 *   4. search filter
 *   5. ending soon filter
 *   6. date range filter (Sub-Phase 8-E-5)
 *   7. sort (Sub-Phase 8-E-5)
 *
 * History:
 *   - 16 Mei 2026: v1-v4 (Mission 8 progression)
 *   - 18 Mei 2026: Sesi 4 v5 — Wire click handlers + endingSoonOnly filter
 *   - 17 Mei 2026: Sub-Phase 8-E-4 v6 — Action Queue API + polling
 *   - 17 Mei 2026: Sub-Phase 8-E-5 v7 — Region/Date/Sort filters + bulk selection UI
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  RefreshCw,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Plus,
  X,
  AlarmClock,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import AdsStatsCards from './AdsStatsCards';
import AdsBottomPanels, {
  type ActionQueueKind,
  type ActionQueueData,
} from './AdsBottomPanels';
import AdsTable from './AdsTable';
import AdsSmartFilter, {
  type AdStatusFilter,
  type AdvertiserTypeFilter,
  type AdRegionFilter,
  type AdDateRangeFilter,
  type AdSortBy,
  REGION_OPTIONS,
  DATE_RANGE_OPTIONS,
} from './AdsSmartFilter';
import DeleteAdModal from './DeleteAdModal';
import RejectAdModal from './RejectAdModal';

const API =
  process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

// Sub-Phase 8-E-4: polling interval per PRD Section 6.3
const ACTION_QUEUE_POLL_MS = 60_000;

// ─── Types ───────────────────────────────────────────────────────

export type AdRow = {
  id:                  string;
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

type Toast = {
  id:   number;
  msg:  string;
  type: 'ok' | 'err';
};

type ModalState =
  | { kind: 'none' }
  | { kind: 'delete'; ad: AdRow }
  | { kind: 'reject'; ad: AdRow };

// ─── Component ───────────────────────────────────────────────────

export default function AdsCommandCenter() {
  const { token, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Data state
  const [ads, setAds]                 = useState<AdRow[]>([]);
  const [total, setTotal]             = useState(0);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [toasts, setToasts]           = useState<Toast[]>([]);

  // Action Queue state (Sub-Phase 8-E-4)
  const [actionQueue, setActionQueue]               = useState<ActionQueueData | null>(null);
  const [actionQueueLoading, setActionQueueLoading] = useState(true);
  const actionQueuePollingRef = useRef<NodeJS.Timeout | null>(null);

  // Filter state
  const [filterStatus, setFilterStatus]     = useState<AdStatusFilter>('all');
  const [filterType, setFilterType]         = useState<AdvertiserTypeFilter>('all');
  const [searchQuery, setSearchQuery]       = useState('');
  const [endingSoonOnly, setEndingSoonOnly] = useState(false);

  // Sub-Phase 8-E-5: Filter + Sort + Selection
  const [filterRegion, setFilterRegion]   = useState<AdRegionFilter>('all');
  const [dateRange, setDateRange]         = useState<AdDateRangeFilter>('all');
  const [sortBy, setSortBy]               = useState<AdSortBy>('created_desc');
  const [selectedAdIds, setSelectedAdIds] = useState<Set<string>>(new Set());

  const [modal, setModal] = useState<ModalState>({ kind: 'none' });

  // Auto-reset endingSoonOnly saat filterStatus berubah
  useEffect(() => {
    if (filterStatus !== 'active' && endingSoonOnly) {
      setEndingSoonOnly(false);
    }
  }, [filterStatus, endingSoonOnly]);

  // Sub-Phase 8-E-5: Clear selection saat filter berubah
  useEffect(() => {
    setSelectedAdIds(new Set());
  }, [filterStatus, filterType, filterRegion, dateRange, searchQuery, showDeleted]);

  const showToast = useCallback((msg: string, type: 'ok' | 'err' = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
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

  // ─── Sub-Phase 8-E-5: Filter + Sort pipeline ───────────────────
  const filteredAds = useMemo(() => {
    const now = Date.now();
    const next24h = now + 24 * 60 * 60 * 1000;

    const dateRangeCfg = DATE_RANGE_OPTIONS.find((d) => d.key === dateRange);
    const dateCutoff = dateRangeCfg?.days
      ? now - dateRangeCfg.days * 24 * 60 * 60 * 1000
      : null;

    const regionCfg = REGION_OPTIONS.find((r) => r.key === filterRegion);
    const regionMatchValues = regionCfg?.matchValues ?? [];

    const filtered = ads.filter((ad) => {
      // 1. Status
      if (filterStatus !== 'all' && ad.status !== filterStatus) return false;

      // 2. Advertiser type
      if (filterType !== 'all' && ad.advertiser_type !== filterType) return false;

      // 3. Region (E-5): null=universal include, else match contains
      if (filterRegion !== 'all' && regionMatchValues.length > 0) {
        const isUniversal = ad.target_regions === null;
        const isMatched = ad.target_regions?.some((r) =>
          regionMatchValues.some((m) => r.toLowerCase().includes(m.toLowerCase()))
        );
        if (!isUniversal && !isMatched) return false;
      }

      // 4. Search
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.trim().toLowerCase();
        const haystack =
          `${ad.title ?? ''} ${ad.body ?? ''} ${ad.advertiser_name}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      // 5. Ending soon (<24h)
      if (endingSoonOnly) {
        const endsMs = new Date(ad.ends_at).getTime();
        if (!(endsMs > now && endsMs < next24h)) return false;
      }

      // 6. Date range (E-5): filter by created_at
      if (dateCutoff !== null) {
        const createdMs = new Date(ad.created_at).getTime();
        if (createdMs < dateCutoff) return false;
      }

      return true;
    });

    // 7. Sort (E-5)
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'created_desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'ends_asc':
          return new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime();
        case 'impression_desc':
          return b.impression_count - a.impression_count;
        case 'name_asc':
          return a.advertiser_name.localeCompare(b.advertiser_name, 'id');
        default:
          return 0;
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
    const counts: Partial<Record<AdvertiserTypeFilter, number>> = {
      all: ads.length,
    };
    ads.forEach((ad) => {
      const key = ad.advertiser_type as AdvertiserTypeFilter;
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return counts;
  }, [ads]);

  // Click handlers
  const scrollToTable = useCallback(() => {
    const el = document.getElementById('ads-table-section');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const scrollToSlotInventory = useCallback(() => {
    const el = document.getElementById('slot-inventory-panel');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleStatsCardClick = useCallback((id: string) => {
    switch (id) {
      case 'slot':
        scrollToSlotInventory();
        break;
      case 'active':
        setFilterStatus('active');
        setEndingSoonOnly(false);
        scrollToTable();
        break;
      case 'pending':
        setFilterStatus('pending_review' as AdStatusFilter);
        setEndingSoonOnly(false);
        scrollToTable();
        break;
      case 'ending':
        setFilterStatus('active');
        setEndingSoonOnly(true);
        scrollToTable();
        break;
      case 'revenue':
        router.push('/admin/financial');
        break;
    }
  }, [router, scrollToTable, scrollToSlotInventory]);

  const handleActionQueueClick = useCallback((kind: ActionQueueKind) => {
    switch (kind) {
      case 'pending_review':
        setFilterStatus('pending_review' as AdStatusFilter);
        setEndingSoonOnly(false);
        scrollToTable();
        break;
      case 'expire_soon':
        setFilterStatus('active');
        setEndingSoonOnly(true);
        scrollToTable();
        break;
      case 'pending_payment':
        setFilterStatus('pending_payment' as AdStatusFilter);
        setEndingSoonOnly(false);
        scrollToTable();
        break;
      case 'renewal_risk':
        setFilterStatus('active');
        setEndingSoonOnly(false);
        scrollToTable();
        showToast('Renewal Risk — review active ads yang expire <30 hari', 'ok');
        break;
      case 'slot_empty':
        scrollToSlotInventory();
        break;
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
      showToast(
        `↩ Iklan dipulihkan ke status: ${json.restored_to ?? 'paused'}`,
        'ok'
      );
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
          <p className="text-[13px] font-semibold text-status-critical">
            Gagal memuat data iklan
          </p>
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
                'flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg',
                'animate-in slide-in-from-right',
                t.type === 'ok'
                  ? 'bg-status-healthy text-white'
                  : 'bg-status-critical text-white'
              )}
            >
              {t.type === 'ok' ? (
                <CheckCircle2 size={18} className="shrink-0" />
              ) : (
                <AlertCircle size={18} className="shrink-0" />
              )}
              <span className="text-[12px] font-semibold">{t.msg}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold text-text tracking-tight">
            ADS Command Center
          </h2>
          <p className="text-[12px] text-text-muted mt-0.5">
            Kelola semua iklan TeraLoka dalam satu layar
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/ads/new"
            className={cn(
              'inline-flex items-center gap-2 px-4 py-1.5 rounded-md',
              'bg-ads text-white',
              'text-[11px] font-bold uppercase tracking-wide',
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
              'bg-surface border border-border text-text',
              'text-[11px] font-bold uppercase tracking-wide',
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
          onTransition={handleStatusTransition}
          onSoftDelete={handleSoftDelete}
          onRestore={handleRestore}
          onReject={handleReject}
        />
      </div>

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
