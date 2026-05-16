'use client';

/**
 * TeraLoka — AdsCommandCenter (v4)
 * Mission 8 Sub-Phase 8-C-2 + 8-B β.2 (Group 3)
 * ------------------------------------------------------------
 * Integration v3 + Tombol "+ Tambah Iklan" header.
 *
 * v4 Changes:
 *   - Tambah Link button "+ Tambah Iklan" di header (route /admin/ads/new)
 *   - Plus icon dari lucide-react
 *   - Next.js Link untuk native navigation (no full reload)
 *   - All other logic IDENTIK dengan v3 (zero regression)
 *
 * Auth + toast + filter + handlers + modals tetap sama dengan v3.
 *
 * History:
 *   - 16 Mei 2026 09:30: v1
 *   - 16 Mei 2026 10:00: v2 (useAuth, Tailwind utility, design tokens)
 *   - 16 Mei 2026 10:30: v3 (SmartFilter + Modals integration)
 *   - 16 Mei 2026 14:00: v4 (+Tambah Iklan button — Sub-Phase 8-B β.2)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { RefreshCw, Trash2, AlertCircle, CheckCircle2, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import AdsStatsCards from './AdsStatsCards';
import AdsBottomPanels from './AdsBottomPanels';
import AdsTable from './AdsTable';
import AdsSmartFilter, {
  type AdStatusFilter,
  type AdvertiserTypeFilter,
} from './AdsSmartFilter';
import DeleteAdModal from './DeleteAdModal';
import RejectAdModal from './RejectAdModal';

const API =
  process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

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

  // Data state
  const [ads, setAds]                 = useState<AdRow[]>([]);
  const [total, setTotal]             = useState(0);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [toasts, setToasts]           = useState<Toast[]>([]);

  // Filter state
  const [filterStatus, setFilterStatus]       = useState<AdStatusFilter>('all');
  const [filterType, setFilterType]           = useState<AdvertiserTypeFilter>('all');
  const [searchQuery, setSearchQuery]         = useState('');

  // Modal state
  const [modal, setModal] = useState<ModalState>({ kind: 'none' });

  // ─── Toast helper ─────────────────────────────────────────────
  const showToast = useCallback((msg: string, type: 'ok' | 'err' = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  // ─── Fetch ads list ────────────────────────────────────────────
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

  // ─── Filter logic (client-side, derived state) ────────────────
  const filteredAds = useMemo(() => {
    return ads.filter((ad) => {
      // Status filter
      if (filterStatus !== 'all' && ad.status !== filterStatus) return false;

      // Advertiser type filter
      if (filterType !== 'all' && ad.advertiser_type !== filterType) return false;

      // Search filter (title, body, advertiser_name)
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.trim().toLowerCase();
        const haystack =
          `${ad.title ?? ''} ${ad.body ?? ''} ${ad.advertiser_name}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [ads, filterStatus, filterType, searchQuery]);

  // ─── Status counts for filter pills badge ──────────────────────
  const statusCounts = useMemo(() => {
    const counts: Partial<Record<AdStatusFilter, number>> = { all: ads.length };
    ads.forEach((ad) => {
      const key = ad.status as AdStatusFilter;
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return counts;
  }, [ads]);

  // ─── Advertiser type counts ───────────────────────────────────
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

  // ─── Action handlers ──────────────────────────────────────────

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
      await fetchAds();
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
    await fetchAds();
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
      await fetchAds();
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
    await fetchAds();
  };

  // ─── Render guards ────────────────────────────────────────────

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
          onClick={fetchAds}
          className="shrink-0 px-3 py-1.5 rounded-md bg-status-critical text-white text-[11px] font-bold hover:bg-status-critical/90 transition-colors"
        >
          Coba lagi
        </button>
      </div>
    );
  }

  // ─── Main render ──────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">
      {/* ─── Toast stack ─── */}
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

      {/* ─── Header ─── */}
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
          {/* Tambah Iklan — primary CTA, Sub-Phase 8-B β.2 */}
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
            onClick={fetchAds}
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

      {/* ─── Row 1: Stats Cards (selalu pakai ALL ads, not filtered) ─── */}
      <AdsStatsCards
        ads={ads}
        total={total}
        loading={loading && ads.length === 0}
      />

      {/* ─── Row 2: Bottom Panels (selalu pakai ALL ads) ─── */}
      <AdsBottomPanels ads={ads} />

      {/* ─── Row 3: SMART Filter ─── */}
      <AdsSmartFilter
        status={filterStatus}
        advertiserType={filterType}
        search={searchQuery}
        onStatusChange={setFilterStatus}
        onAdvertiserTypeChange={setFilterType}
        onSearchChange={setSearchQuery}
        statusCounts={statusCounts}
        typeCounts={typeCounts}
      />

      {/* ─── Row 4: Daftar Iklan Table (filtered) ─── */}
      <AdsTable
        ads={filteredAds}
        showDeleted={showDeleted}
        onTransition={handleStatusTransition}
        onSoftDelete={handleSoftDelete}
        onRestore={handleRestore}
        onReject={handleReject}
      />

      {/* ─── Modals ─── */}
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
