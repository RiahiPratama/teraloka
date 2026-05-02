'use client';

/**
 * /owner/funding/campaigns/[id]/donations — Per-Campaign Donations View
 * 
 * Penggalang dedicated page untuk lihat & verify donasi di SATU kampanye.
 * Berbeda dengan /owner/funding/donations (global inbox) — page ini scoped per-campaign.
 * 
 * Filter & smart views:
 *   - Status tabs: Semua | Pending | Verified | Rejected
 *   - Search donor name
 *   - Pagination
 * 
 * Architecture: Backend (Otak) compute, Frontend (Wajah) display only.
 * Reuse endpoint /funding/my/campaigns/:id/donations
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { formatRupiah } from '@/utils/format';
import {
  ArrowLeft, Loader2, Search, HeartHandshake, Users,
  CheckCircle2, XCircle, Hourglass, AlertTriangle,
  ChevronLeft, ChevronRight, Filter,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

type StatusFilter = 'all' | 'pending' | 'verified' | 'rejected' | 'under_audit';

interface Campaign {
  id: string;
  title: string;
  slug: string;
  status: string;
  collected_amount: number;
  donor_count: number;
  target_amount: number;
}

interface Donation {
  id: string;
  donor_name: string;
  donor_phone: string | null;
  is_anonymous: boolean;
  amount: number;
  operational_fee: number;
  total_transfer: number;
  amount_received: number | null;
  discrepancy_amount: number | null;
  donation_code: string;
  message: string | null;
  transfer_proof_url: string | null;
  verification_status: string;
  verified_by_role: string | null;
  discrepancy_decision: string | null;
  confirmed_by_penggalang_at: string | null;
  escalated_to_admin_at: string | null;
  created_at: string;
}

const STATUS_TABS: Array<{
  value: StatusFilter;
  label: string;
  Icon: any;
  color: string;
  bg: string;
}> = [
  { value: 'all',         label: 'Semua',     Icon: Users,         color: '#6B7280', bg: 'bg-gray-100' },
  { value: 'pending',     label: 'Pending',   Icon: Hourglass,     color: '#B45309', bg: 'bg-amber-100' },
  { value: 'verified',    label: 'Verified',  Icon: CheckCircle2,  color: '#047857', bg: 'bg-emerald-100' },
  { value: 'rejected',    label: 'Rejected',  Icon: XCircle,       color: '#DC2626', bg: 'bg-red-100' },
];

const PAGE_SIZE = 20;

export default function PerCampaignDonationsPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const campaignId = params?.id as string;
  const { user, token, isLoading: authLoading } = useAuth();

  // URL-synced state
  const urlStatus = (searchParams.get('status') as StatusFilter) || 'all';
  const urlSearch = searchParams.get('q') || '';
  const urlPage = Number(searchParams.get('page')) || 1;

  const [statusFilter, setStatusFilter] = useState<StatusFilter>(urlStatus);
  const [searchInput, setSearchInput] = useState(urlSearch);
  const [page, setPage] = useState(urlPage);

  // Data
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── URL sync ──
  const updateUrl = useCallback((updates: Record<string, string | number | null>) => {
    const sp = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v === null || v === '' || v === undefined) sp.delete(k);
      else sp.set(k, String(v));
    });
    router.push(`?${sp.toString()}`);
  }, [searchParams, router]);

  // ── Fetch campaign + donations ──
  const fetchData = useCallback(async () => {
    if (!token || !campaignId) return;
    setLoading(true);
    setError('');

    try {
      const offset = (page - 1) * PAGE_SIZE;
      const sp = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
      });
      if (statusFilter !== 'all') sp.set('status', statusFilter);

      const [campaignRes, donationsRes] = await Promise.all([
        fetch(`${API}/funding/my/campaigns/${campaignId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.json()),

        fetch(`${API}/funding/my/campaigns/${campaignId}/donations?${sp.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.json()),
      ]);

      if (campaignRes.success) setCampaign(campaignRes.data);
      else setError(campaignRes.error?.message ?? 'Kampanye tidak ditemukan');

      if (donationsRes.success) {
        setDonations(donationsRes.data ?? []);
        setTotal(donationsRes.meta?.total ?? donationsRes.total ?? 0);
      }
    } catch {
      setError('Koneksi bermasalah. Refresh halaman ya.');
    } finally {
      setLoading(false);
    }
  }, [token, campaignId, statusFilter, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Client-side search filter (donor name) ──
  const filteredDonations = useMemo(() => {
    if (!urlSearch.trim()) return donations;
    const q = urlSearch.trim().toLowerCase();
    return donations.filter(d => {
      const name = d.is_anonymous ? 'Hamba Allah' : (d.donor_name || '');
      return name.toLowerCase().includes(q) || d.donation_code.includes(q);
    });
  }, [donations, urlSearch]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ── Handlers ──
  function handleStatusChange(s: StatusFilter) {
    setStatusFilter(s);
    setPage(1);
    updateUrl({ status: s === 'all' ? null : s, page: 1 });
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateUrl({ q: searchInput.trim() || null, page: 1 });
    setPage(1);
  }

  function handlePageChange(newPage: number) {
    setPage(newPage);
    updateUrl({ page: newPage });
  }

  // ── Auth guard ──
  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#003526]" />
      </div>
    );
  }

  if (!user || !token) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <p className="text-4xl mb-3">🔒</p>
          <h2 className="text-lg font-bold text-gray-900">Login Dulu</h2>
          <Link
            href="/login"
            className="mt-4 inline-block rounded-xl bg-[#003526] px-6 py-2.5 text-sm font-bold text-white"
          >
            Login Sekarang
          </Link>
        </div>
      </div>
    );
  }

  if (error && !campaign) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center bg-white rounded-2xl p-8 shadow-sm">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
            <AlertTriangle size={28} className="text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Tidak Dapat Dimuat</h2>
          <p className="text-sm text-gray-500 mb-5">{error}</p>
          <Link
            href="/owner/funding/campaigns"
            className="inline-block w-full bg-[#003526] text-white text-sm font-bold px-5 py-3 rounded-xl"
          >
            Kembali ke Kampanye Saya
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-[#003526] px-4 pt-6 pb-8">
        <div className="mx-auto max-w-lg">
          <Link
            href={`/owner/funding/campaigns/${campaignId}`}
            className="flex items-center gap-1.5 text-[#95d3ba] text-sm mb-4 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} /> Kembali ke Kampanye
          </Link>
          <div className="flex items-center gap-2 mb-2">
            <HeartHandshake size={20} className="text-[#F472B6]" />
            <p className="text-xs font-bold text-[#F472B6] uppercase tracking-widest">Donasi Masuk</p>
          </div>
          {campaign && (
            <>
              <h1 className="text-xl font-extrabold text-white leading-tight line-clamp-2">
                {campaign.title}
              </h1>
              <p className="text-xs text-white/70 mt-1">
                {campaign.donor_count} donatur · {formatRupiah(campaign.collected_amount)} terkumpul
              </p>
            </>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 -mt-4">
        {/* Tabs + Search */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 mb-4 space-y-3">
          {/* Status tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {STATUS_TABS.map(tab => {
              const TabIcon = tab.Icon;
              const isActive = statusFilter === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => handleStatusChange(tab.value)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-[#003526] text-white'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <TabIcon size={12} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Cari nama donatur atau kode unik..."
              className="w-full rounded-xl border border-gray-200 pl-9 pr-4 py-2.5 text-sm outline-none focus:border-[#003526]"
            />
          </form>
        </div>

        {/* Donations list */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-[#003526]" />
          </div>
        ) : filteredDonations.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <Users size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-gray-700 mb-1">
              {urlSearch ? 'Tidak ada donasi cocok pencarian' : 'Belum ada donasi'}
            </p>
            <p className="text-xs text-gray-500 leading-relaxed max-w-xs mx-auto">
              {urlSearch
                ? `Coba kata kunci lain atau hapus filter`
                : statusFilter === 'pending'
                ? 'Tidak ada donasi pending saat ini.'
                : 'Donasi yang masuk akan tampil di sini.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredDonations.map(d => (
              <DonationCard key={d.id} donation={d} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && filteredDonations.length > 0 && (
          <div className="flex items-center justify-between gap-2 mt-4 px-1">
            <button
              onClick={() => handlePageChange(Math.max(1, page - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={12} />
              Sebelumnya
            </button>
            <p className="text-xs text-gray-500">
              Halaman {page} dari {totalPages}
            </p>
            <button
              onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Selanjutnya
              <ChevronRight size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Donation Card
// ═══════════════════════════════════════════════════════════════

function DonationCard({ donation }: { donation: Donation }) {
  const statusMeta = (() => {
    switch (donation.verification_status) {
      case 'verified':
        return { label: 'Verified', color: '#047857', bg: 'bg-emerald-100', Icon: CheckCircle2 };
      case 'rejected':
        return { label: 'Rejected', color: '#DC2626', bg: 'bg-red-100', Icon: XCircle };
      case 'under_audit':
        return { label: 'Under Audit', color: '#CA8A04', bg: 'bg-yellow-100', Icon: AlertTriangle };
      default:
        return { label: 'Pending', color: '#B45309', bg: 'bg-amber-100', Icon: Hourglass };
    }
  })();
  const StatusIcon = statusMeta.Icon;

  const displayName = donation.is_anonymous ? 'Hamba Allah' : (donation.donor_name || 'Donatur');

  // "Hampir telat" warning: pending > 2 days old
  const ageMs = Date.now() - new Date(donation.created_at).getTime();
  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
  const isStale = donation.verification_status === 'pending' && ageDays >= 2;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:border-gray-200 transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-100 to-pink-50 flex items-center justify-center shrink-0">
          <HeartHandshake size={16} className="text-[#BE185D]" />
        </div>

        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-sm font-bold text-gray-900 truncate">{displayName}</p>
                {donation.is_anonymous && (
                  <span className="text-[9px] font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded uppercase tracking-wider">
                    Anonim
                  </span>
                )}
                {donation.verified_by_role === 'admin' && (
                  <span className="text-[9px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded uppercase tracking-wider">
                    Admin
                  </span>
                )}
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Kode: {donation.donation_code} · {new Date(donation.created_at).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>

            <span
              className={`shrink-0 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${statusMeta.bg}`}
              style={{ color: statusMeta.color }}
            >
              <StatusIcon size={9} />
              {statusMeta.label}
            </span>
          </div>

          {/* Amount */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <p className="text-[10px] text-gray-400">Donasi</p>
              <p className="text-sm font-extrabold text-[#003526]">{formatRupiah(donation.amount)}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400">Total Transfer</p>
              <p className="text-sm font-bold text-gray-700">{formatRupiah(donation.total_transfer)}</p>
            </div>
          </div>

          {/* Discrepancy indicator */}
          {donation.discrepancy_amount !== null && Number(donation.discrepancy_amount) !== 0 && (
            <div className="mt-2 rounded-lg bg-orange-50 border border-orange-100 px-2.5 py-1.5">
              <p className="text-[10px] font-bold text-orange-700">
                Mismatch: {Number(donation.discrepancy_amount) > 0 ? '+' : ''}
                {formatRupiah(Number(donation.discrepancy_amount))}
              </p>
            </div>
          )}

          {/* Stale warning */}
          {isStale && (
            <div className="mt-2 rounded-lg bg-red-50 border border-red-100 px-2.5 py-1.5 flex items-center gap-1.5">
              <AlertTriangle size={11} className="text-red-600" />
              <p className="text-[10px] font-bold text-red-700">
                Sudah {ageDays} hari belum diverifikasi
              </p>
            </div>
          )}

          {/* Message */}
          {donation.message && (
            <div className="mt-2 rounded-lg bg-pink-50/50 border border-pink-100 px-2.5 py-1.5">
              <p className="text-[11px] text-gray-700 leading-relaxed italic line-clamp-2">
                "{donation.message}"
              </p>
            </div>
          )}

          {/* Action button — verify donation */}
          {donation.verification_status === 'pending' && (
            <Link
              href={`/owner/funding/donations?id=${donation.id}`}
              className="mt-3 flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-gradient-to-r from-[#EC4899] to-[#BE185D] text-xs font-bold text-white hover:opacity-90 transition-opacity"
            >
              Verifikasi Sekarang →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
