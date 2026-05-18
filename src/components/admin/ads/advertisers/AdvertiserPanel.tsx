'use client';

/**
 * TeraLoka — AdvertiserPanel
 * SESI 5A BATCH 2A + 2B WIRED (18 Mei 2026)
 * ------------------------------------------------------------
 * Main panel — list advertiser dengan smart filter + Quick Actions.
 *
 * History:
 *   - v1 (BATCH 2A): Stats + Filter + List + Detail/Suspend modals
 *   - v2 (BATCH 2B): EditModal wired (replace placeholder)
 *
 * Smart Filter:
 *   - Search: business_name OR pic_name OR pic_phone
 *   - Account type: umkm / local_corporate / premium / politik / pemerintah
 *   - Status: active / suspended / banned
 *   - Founder veto: yes / no
 *
 * Per-row Quick Actions (3 max, contextual):
 *   - [Detail] — open AdvertiserDetailModal (read-only + audit + actions)
 *   - [Edit]   — open AdvertiserEditModal (3-tab form, politik conditional)
 *   - Primary action (status-conditional):
 *     · status=active     → [Suspend] (opens AdvertiserSuspendModal)
 *     · status=suspended  → [Unsuspend] (direct action with confirm)
 *     · status=banned     → [Unban] (direct action with confirm)
 *
 * Advanced actions (Ban, FounderVeto) accessible via DetailModal action panel.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  Eye,
  Pencil,
  Pause,
  Play,
  RotateCcw,
  Plus,
  Loader2,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Search,
  X,
  Phone,
  MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import AdvertiserStatsCards from './AdvertiserStatsCards';
import AdvertiserDetailModal from './AdvertiserDetailModal';
import AdvertiserSuspendModal from './AdvertiserSuspendModal';
import AdvertiserEditModal from './AdvertiserEditModal';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

// ─── Types ───────────────────────────────────────────────────

export type AccountType = 'umkm' | 'local_corporate' | 'premium' | 'politik' | 'pemerintah';
export type AdvertiserStatus = 'active' | 'suspended' | 'banned';

export interface Advertiser {
  id:                                string;
  display_id:                        string;
  account_type:                      AccountType;
  business_name:                     string;
  pic_name:                          string;
  pic_phone:                         string;
  pic_email:                         string | null;
  pic_role:                          string | null;
  business_address:                  string | null;
  business_city:                     string | null;
  business_kabupaten:                string | null;
  business_npwp:                     string | null;
  business_legal_form:               string | null;
  business_industry:                 string | null;
  politik_partai:                    string | null;
  politik_calon:                     string | null;
  politik_jabatan:                   string | null;
  politik_periode:                   string | null;
  politik_kpu_verified:              boolean;
  politik_anti_black_signed:         boolean;
  politik_liability_signed:          boolean;
  politik_kill_switch_acknowledged:  boolean;
  politik_clauses_signed_at:         string | null;
  user_id:                           string | null;
  has_portal_access:                 boolean;
  status:                            AdvertiserStatus;
  first_ad_at:                       string | null;
  last_ad_at:                        string | null;
  total_spent:                       number;
  total_ads_count:                   number;
  failed_payment_count:              number;
  abuse_strike_count:                number;
  suspended_until:                   string | null;
  founder_rejected:                  boolean;
  founder_rejected_at:               string | null;
  created_at:                        string;
  updated_at:                        string;
}

const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  umkm:            'UMKM',
  local_corporate: 'Local Corp',
  premium:         'Premium',
  politik:         'Politik',
  pemerintah:      'Pemerintah',
};

const ACCOUNT_TYPE_COLOR: Record<AccountType, string> = {
  umkm:            'bg-status-healthy/12 text-status-healthy',
  local_corporate: 'bg-status-info/12 text-status-info',
  premium:         'bg-bakabar/12 text-bakabar',
  politik:         'bg-balapor/12 text-balapor',
  pemerintah:      'bg-baronda/12 text-baronda',
};

export default function AdvertiserPanel() {
  const { token } = useAuth();
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [loading, setLoading]         = useState(true);
  const [processing, setProcessing]   = useState<string | null>(null);
  const [toast, setToast]             = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm]               = useState('');
  const [debouncedSearch, setDebouncedSearch]     = useState('');
  const [filterAccountType, setFilterAccountType] = useState<AccountType | 'all'>('all');
  const [filterStatus, setFilterStatus]           = useState<AdvertiserStatus | 'all'>('all');
  const [filterFounderVeto, setFilterFounderVeto] = useState<'all' | 'yes' | 'no'>('all');

  // Modal states
  const [detailingAdv, setDetailingAdv]   = useState<Advertiser | null>(null);
  const [suspendingAdv, setSuspendingAdv] = useState<Advertiser | null>(null);
  const [editingAdv, setEditingAdv]       = useState<Advertiser | null>(null);
  const [creating, setCreating]           = useState(false);

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Debounce search input (300ms)
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(handle);
  }, [searchTerm]);

  const fetchAdvertisers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterAccountType !== 'all') params.set('account_type', filterAccountType);
      if (filterStatus !== 'all') params.set('status', filterStatus);
      if (filterFounderVeto === 'yes') params.set('founder_rejected', 'true');
      if (filterFounderVeto === 'no') params.set('founder_rejected', 'false');
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      params.set('limit', '100');

      const res = await fetch(`${API}/admin/advertisers?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message);
      setAdvertisers(json.data ?? []);
    } catch (err: any) {
      showToast(err.message ?? 'Gagal load advertiser', 'err');
    } finally {
      setLoading(false);
    }
  }, [token, filterAccountType, filterStatus, filterFounderVeto, debouncedSearch]);

  useEffect(() => {
    fetchAdvertisers();
  }, [fetchAdvertisers]);

  const handleUnsuspend = async (adv: Advertiser) => {
    if (!token) return;
    if (!confirm(`Aktifkan kembali "${adv.business_name}"?`)) return;
    setProcessing(adv.id);
    try {
      const res = await fetch(`${API}/admin/advertisers/${adv.id}/unsuspend`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message);
      showToast(`✅ ${adv.business_name} di-unsuspend`);
      fetchAdvertisers();
    } catch (err: any) {
      showToast(err.message ?? 'Gagal unsuspend', 'err');
    } finally {
      setProcessing(null);
    }
  };

  const handleUnban = async (adv: Advertiser) => {
    if (!token) return;
    if (!confirm(`Aktifkan kembali "${adv.business_name}" dari status BANNED?\n\nLakukan hanya kalau lo yakin ban-nya gak valid lagi.`)) return;
    setProcessing(adv.id);
    try {
      const res = await fetch(`${API}/admin/advertisers/${adv.id}/unban`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message);
      showToast(`✅ ${adv.business_name} di-unban`);
      fetchAdvertisers();
    } catch (err: any) {
      showToast(err.message ?? 'Gagal unban', 'err');
    } finally {
      setProcessing(null);
    }
  };

  const handleSuspendConfirm = async (suspended_until: string) => {
    if (!suspendingAdv || !token) return;
    setProcessing(suspendingAdv.id);
    try {
      const res = await fetch(`${API}/admin/advertisers/${suspendingAdv.id}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ suspended_until }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message);
      showToast(`✅ ${suspendingAdv.business_name} di-suspend sampai ${formatDate(suspended_until)}`);
      setSuspendingAdv(null);
      fetchAdvertisers();
    } catch (err: any) {
      showToast(err.message ?? 'Gagal suspend', 'err');
    } finally {
      setProcessing(null);
    }
  };

  const handleDetailRefresh = () => {
    fetchAdvertisers();
  };

  const handleEditSaved = () => {
    setEditingAdv(null);
    setCreating(false);
    fetchAdvertisers();
    showToast('✅ Advertiser berhasil disimpan');
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterAccountType('all');
    setFilterStatus('all');
    setFilterFounderVeto('all');
  };

  const hasActiveFilter =
    debouncedSearch.trim() !== '' ||
    filterAccountType !== 'all' ||
    filterStatus !== 'all' ||
    filterFounderVeto !== 'all';

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className={cn(
          'fixed top-5 right-5 z-50 px-4 py-2.5 rounded-lg shadow-2xl text-[12px] font-bold',
          toast.type === 'ok' ? 'bg-status-healthy text-white' : 'bg-status-critical text-white',
        )}>
          {toast.msg}
        </div>
      )}

      <div className="flex flex-col gap-4">
        {/* Stats Cards */}
        <AdvertiserStatsCards advertisers={advertisers} loading={loading} />

        {/* Header + Create Button */}
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[14px] font-extrabold text-text">Daftar Advertiser</h2>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-ads text-white text-[11px] font-bold uppercase tracking-wide hover:bg-ads/90 transition-colors shadow-sm"
          >
            <Plus size={11} />
            Tambah Advertiser
          </button>
        </div>

        {/* Smart Filter */}
        <div className="flex flex-col gap-2 px-3 py-3 rounded-xl bg-surface-muted/40 border border-border">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nama bisnis / PIC / WA..."
                className="w-full pl-8 pr-3 py-1.5 rounded-md bg-surface border border-border text-[12px] text-text placeholder:text-text-subtle focus:outline-none focus:border-ads/50 focus:ring-2 focus:ring-ads/20"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-surface-muted"
                >
                  <X size={10} className="text-text-muted" />
                </button>
              )}
            </div>

            {/* Account Type Filter */}
            <select
              value={filterAccountType}
              onChange={(e) => setFilterAccountType(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-md bg-surface border border-border text-[11px] font-semibold text-text focus:outline-none focus:border-ads/50"
            >
              <option value="all">Semua Tipe</option>
              <option value="umkm">UMKM</option>
              <option value="local_corporate">Local Corp</option>
              <option value="premium">Premium</option>
              <option value="politik">Politik</option>
              <option value="pemerintah">Pemerintah</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-md bg-surface border border-border text-[11px] font-semibold text-text focus:outline-none focus:border-ads/50"
            >
              <option value="all">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="suspended">Suspended</option>
              <option value="banned">Banned</option>
            </select>

            {/* Founder Veto Filter */}
            <select
              value={filterFounderVeto}
              onChange={(e) => setFilterFounderVeto(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-md bg-surface border border-border text-[11px] font-semibold text-text focus:outline-none focus:border-ads/50"
            >
              <option value="all">Founder Veto: Semua</option>
              <option value="yes">Founder Veto: Ya</option>
              <option value="no">Founder Veto: Tidak</option>
            </select>

            {hasActiveFilter && (
              <button
                type="button"
                onClick={resetFilters}
                className="px-2.5 py-1.5 rounded-md bg-balapor/12 text-balapor text-[11px] font-bold uppercase tracking-wide hover:bg-balapor/20 transition-colors"
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="text-ads animate-spin" />
          </div>
        ) : advertisers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 rounded-xl bg-surface-muted/40 border border-border border-dashed">
            <p className="text-[14px] font-bold text-text-muted">
              {hasActiveFilter ? 'Tidak ada advertiser match filter' : 'Belum ada advertiser'}
            </p>
            <p className="text-[11px] text-text-subtle mt-1">
              {hasActiveFilter ? 'Coba reset filter' : 'Klik "Tambah Advertiser" untuk create baru'}
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {advertisers.map((adv) => (
              <AdvertiserRow
                key={adv.id}
                advertiser={adv}
                processing={processing === adv.id}
                onDetail={() => setDetailingAdv(adv)}
                onEdit={() => setEditingAdv(adv)}
                onSuspend={() => setSuspendingAdv(adv)}
                onUnsuspend={() => handleUnsuspend(adv)}
                onUnban={() => handleUnban(adv)}
              />
            ))}
          </ul>
        )}
      </div>

      {/* ─── Modals ─── */}
      {detailingAdv && (
        <AdvertiserDetailModal
          advertiser={detailingAdv}
          onClose={() => setDetailingAdv(null)}
          onAction={handleDetailRefresh}
        />
      )}

      {suspendingAdv && (
        <AdvertiserSuspendModal
          advertiser={suspendingAdv}
          onConfirm={handleSuspendConfirm}
          onClose={() => setSuspendingAdv(null)}
        />
      )}

      {(editingAdv || creating) && (
        <AdvertiserEditModal
          advertiser={editingAdv}
          onClose={() => { setEditingAdv(null); setCreating(false); }}
          onSaved={handleEditSaved}
        />
      )}
    </>
  );
}

// ─── AdvertiserRow ──────────────────────────────────────────

function AdvertiserRow({
  advertiser: adv,
  processing,
  onDetail,
  onEdit,
  onSuspend,
  onUnsuspend,
  onUnban,
}: {
  advertiser: Advertiser;
  processing: boolean;
  onDetail:   () => void;
  onEdit:     () => void;
  onSuspend:  () => void;
  onUnsuspend: () => void;
  onUnban:    () => void;
}) {
  return (
    <li className={cn(
      'flex flex-col gap-2.5 px-4 py-3 rounded-xl border bg-surface',
      adv.status === 'banned' ? 'border-balapor/30 opacity-70' : 'border-border',
    )}>
      {/* Top Row: Identity */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-[14px] font-extrabold text-text">{adv.business_name}</h4>
            <span className={cn(
              'px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide',
              ACCOUNT_TYPE_COLOR[adv.account_type],
            )}>
              {ACCOUNT_TYPE_LABEL[adv.account_type]}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-surface-muted text-text-muted font-mono">
              {adv.display_id}
            </span>
            <StatusBadge advertiser={adv} />
            {adv.founder_rejected && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-bakabar/12 text-bakabar">
                <ShieldAlert size={9} />
                Founder Veto
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <p className="text-[11px] text-text-muted">
              <span className="font-semibold text-text">{adv.pic_name}</span>
              {adv.pic_role && <span className="opacity-70"> ({adv.pic_role})</span>}
            </p>
            <p className="text-[11px] text-text-muted inline-flex items-center gap-1 font-mono">
              <Phone size={10} />
              {adv.pic_phone}
            </p>
            {adv.business_kabupaten && (
              <p className="text-[11px] text-text-muted inline-flex items-center gap-1">
                <MapPin size={10} />
                {adv.business_kabupaten}
              </p>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          <p className="text-[13px] font-extrabold text-text tabular-nums">
            {adv.total_ads_count} <span className="text-[10px] font-normal text-text-muted">ads</span>
          </p>
          <p className="text-[10px] text-text-muted mt-0.5">
            {adv.total_spent > 0 ? `Rp ${adv.total_spent.toLocaleString('id-ID')}` : '—'}
          </p>
        </div>
      </div>

      {/* Bottom Row: Quick Actions */}
      <div className="flex items-center justify-end gap-1">
        <QuickActionBtn icon={Eye} label="Detail" onClick={onDetail} disabled={processing} />
        <QuickActionBtn icon={Pencil} label="Edit" onClick={onEdit} disabled={processing} variant="primary" />

        {/* Status-conditional primary action */}
        {adv.status === 'active' && (
          <QuickActionBtn icon={Pause} label="Suspend" onClick={onSuspend} disabled={processing} variant="warn" />
        )}
        {adv.status === 'suspended' && (
          <QuickActionBtn icon={Play} label="Unsuspend" onClick={onUnsuspend} disabled={processing} variant="success" />
        )}
        {adv.status === 'banned' && (
          <QuickActionBtn icon={RotateCcw} label="Unban" onClick={onUnban} disabled={processing} variant="success" />
        )}
      </div>
    </li>
  );
}

// ─── StatusBadge ────────────────────────────────────────────

function StatusBadge({ advertiser: adv }: { advertiser: Advertiser }) {
  if (adv.status === 'active') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-status-healthy">
        <CheckCircle2 size={10} />
        Aktif
      </span>
    );
  }
  if (adv.status === 'suspended') {
    const until = adv.suspended_until ? new Date(adv.suspended_until) : null;
    const isExpired = until && until < new Date();
    return (
      <span className={cn(
        'inline-flex items-center gap-1 text-[10px] font-bold',
        isExpired ? 'text-baronda' : 'text-status-warning',
      )}>
        <Pause size={10} />
        {isExpired ? 'Suspended Expired' : `Suspended s/d ${until ? formatDate(until.toISOString()) : '—'}`}
      </span>
    );
  }
  if (adv.status === 'banned') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-balapor">
        <XCircle size={10} />
        Banned
      </span>
    );
  }
  return null;
}

// ─── QuickActionBtn ─────────────────────────────────────────

function QuickActionBtn({
  icon: Icon, label, onClick, disabled, variant = 'default',
}: {
  icon: typeof Eye;
  label: string;
  onClick: () => void;
  disabled: boolean;
  variant?: 'default' | 'primary' | 'warn' | 'success';
}) {
  const variantClass = {
    default: 'bg-surface-muted text-text hover:bg-surface-muted/80',
    primary: 'bg-ads/12 text-ads hover:bg-ads/20',
    warn:    'bg-status-warning/12 text-status-warning hover:bg-status-warning/20',
    success: 'bg-status-healthy/12 text-status-healthy hover:bg-status-healthy/20',
  }[variant];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide transition-colors',
        variantClass,
        disabled && 'opacity-50 cursor-not-allowed',
      )}
      title={label}
    >
      <Icon size={10} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

// ─── Helpers ────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day:   'numeric',
    month: 'short',
    year:  'numeric',
  });
}
