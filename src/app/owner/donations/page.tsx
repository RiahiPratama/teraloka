'use client';

/**
 * /owner/donations — Global Donations Inbox
 *
 * Penggalang inbox untuk semua donations dari semua kampanye.
 * 5 Smart Views: Perlu Verifikasi (default) | Hampir Telat | Under Audit | 
 *                Mismatch Diterima | Verified Hari Ini
 * 
 * Filosofi 4 Pilar:
 *  - Credibility: smart views fokus action (Perlu Verifikasi default)
 *  - Transparency: Mismatch Diterima view, audit trail visible per donation
 *  - Accountability: Under Audit highlighted, deadline countdown
 *  - Comfort: mobile-first, infinite scroll, keyboard shortcuts
 *
 * Filter row: status tabs, search donor name, campaign filter
 * URL query sync (consistent dengan admin BADONASI)
 * 
 * Architecture: Backend (Otak) compute, frontend (Wajah) display only.
 * No business logic in frontend — just UI state + API calls.
 */

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, useSearchParams } from 'next/navigation';
import DonationVerifyModal, { DonationForVerify } from '@/components/owner/donations/DonationVerifyModal';
import DonationRejectModal from '@/components/owner/donations/DonationRejectModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://teraloka-api.vercel.app/api/v1';

type SmartView = 'perlu_verifikasi' | 'hampir_telat' | 'under_audit' | 'mismatch_diterima' | 'verified_today' | 'all';
type StatusFilter = 'all' | 'pending' | 'verified' | 'rejected' | 'under_audit';

interface DonationListItem {
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
  campaign_id: string;
  campaign_title?: string | null;
  confirmed_by_penggalang_at: string | null;
  escalated_to_admin_at: string | null;
  verified_at: string | null;
  created_at: string;
}

interface CampaignOption {
  id: string;
  title: string;
}

interface FinancialSummary {
  total_collected: number;
  total_disbursed: number;
  saldo: number;
  total_fee_penggalang: number;
  total_kode_unik: number;
  penggalang_revenue: number;
  total_donors: number;
  pending_count: number;
  verified_count: number;
  platform_phase: string;
}

const SMART_VIEWS: Array<{ value: SmartView; label: string; emoji: string; color: string }> = [
  { value: 'perlu_verifikasi', label: 'Perlu Verifikasi', emoji: '🔴', color: '#DC2626' },
  { value: 'hampir_telat', label: 'Hampir Telat', emoji: '⏰', color: '#EA580C' },
  { value: 'under_audit', label: 'Under Audit', emoji: '⚠️', color: '#CA8A04' },
  { value: 'mismatch_diterima', label: 'Mismatch Diterima', emoji: '📊', color: '#0891B2' },
  { value: 'verified_today', label: 'Verified Hari Ini', emoji: '✅', color: '#16A34A' },
];

export default function OwnerDonationsPage() {
  return (
    <Suspense fallback={<DonationsLoadingFallback />}>
      <DonationsPageContent />
    </Suspense>
  );
}

function DonationsLoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500">Memuat inbox donasi...</p>
    </div>
  );
}

function DonationsPageContent() {
  const { user, token, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filter state (URL-synced)
  const [smartView, setSmartView] = useState<SmartView>(
    (searchParams.get('view') as SmartView) || 'perlu_verifikasi'
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    (searchParams.get('status') as StatusFilter) || 'all'
  );
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('q') || '');
  const [campaignFilter, setCampaignFilter] = useState<string>(searchParams.get('campaign') || 'all');
  const [page, setPage] = useState<number>(Number(searchParams.get('page')) || 1);

  // Data state
  const [donations, setDonations] = useState<DonationListItem[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Financial summary state (FIX-OWNER-FIN: ringkasan keuangan penggalang)
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // Modal state
  const [verifyDonation, setVerifyDonation] = useState<DonationForVerify | null>(null);
  const [rejectDonation, setRejectDonation] = useState<DonationListItem | null>(null);

  // Sync state to URL
  const syncUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (smartView !== 'perlu_verifikasi') params.set('view', smartView);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (searchQuery) params.set('q', searchQuery);
    if (campaignFilter !== 'all') params.set('campaign', campaignFilter);
    if (page > 1) params.set('page', String(page));
    const qs = params.toString();
    router.replace(qs ? `/owner/donations?${qs}` : '/owner/donations', { scroll: false });
  }, [smartView, statusFilter, searchQuery, campaignFilter, page, router]);

  // Fetch user's campaigns for filter dropdown
  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/funding/my/campaigns?limit=50`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((j) => {
        if (j?.success && Array.isArray(j.data)) {
          setCampaigns(j.data.map((c: any) => ({ id: c.id, title: c.title })));
        }
      })
      .catch(() => {});
  }, [token]);

  // Fetch financial summary on mount + after successful verify/reject
  const fetchSummary = useCallback(async () => {
    if (!token) return;
    setSummaryLoading(true);
    try {
      const res = await fetch(`${API_URL}/funding/my/financial-summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json();
      if (j?.success && j.data) {
        setSummary(j.data);
      }
    } catch {
      // silent fail — summary is supplementary
    } finally {
      setSummaryLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Fetch donations based on filters
  const fetchDonations = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      // Determine which campaigns to query
      const targetCampaigns =
        campaignFilter !== 'all'
          ? [campaignFilter]
          : campaigns.map((c) => c.id);

      if (targetCampaigns.length === 0) {
        setDonations([]);
        setTotal(0);
        setLoading(false);
        return;
      }

      // Smart view → status filter mapping
      let effectiveStatus = statusFilter;
      if (smartView === 'perlu_verifikasi') effectiveStatus = 'pending';
      else if (smartView === 'under_audit') effectiveStatus = 'under_audit';
      else if (smartView === 'verified_today') effectiveStatus = 'verified';
      else if (smartView === 'hampir_telat') effectiveStatus = 'pending';
      else if (smartView === 'mismatch_diterima') effectiveStatus = 'verified';

      // Fetch from each campaign in parallel (limit per campaign)
      const limit = 50;
      const results = await Promise.all(
        targetCampaigns.map((campaignId) =>
          fetch(
            `${API_URL}/funding/my/campaigns/${campaignId}/donations?status=${effectiveStatus}&limit=${limit}`,
            { headers: { Authorization: `Bearer ${token}` } }
          )
            .then((r) => r.json())
            .then((j) => {
              if (j?.success && Array.isArray(j.data)) {
                const camp = campaigns.find((c) => c.id === campaignId);
                return j.data.map((d: any) => ({
                  ...d,
                  campaign_id: campaignId,
                  campaign_title: camp?.title ?? null,
                }));
              }
              return [];
            })
            .catch(() => [])
        )
      );

      // Flatten + apply client-side smart view filter
      let merged: DonationListItem[] = results.flat();

      // Smart view client-side filtering (where backend doesn't support)
      if (smartView === 'hampir_telat') {
        const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
        merged = merged.filter((d) => new Date(d.created_at).getTime() < twoDaysAgo);
      } else if (smartView === 'verified_today') {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        merged = merged.filter(
          (d) => d.verified_at && new Date(d.verified_at).getTime() >= todayStart.getTime()
        );
      } else if (smartView === 'mismatch_diterima') {
        merged = merged.filter(
          (d) =>
            d.discrepancy_decision === 'accepted_partial' ||
            d.discrepancy_decision === 'accepted_excess'
        );
      }

      // Search filter (client-side)
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        merged = merged.filter(
          (d) =>
            d.donor_name?.toLowerCase().includes(q) ||
            d.donation_code?.toLowerCase().includes(q)
        );
      }

      // Sort: newest first
      merged.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setTotal(merged.length);

      // Pagination
      const pageSize = 20;
      const offset = (page - 1) * pageSize;
      setDonations(merged.slice(offset, offset + pageSize));
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat donasi');
      setDonations([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [token, campaigns, smartView, statusFilter, searchQuery, campaignFilter, page]);

  // Auto-fetch when filters or campaigns change
  useEffect(() => {
    if (campaigns.length > 0 || campaignFilter !== 'all') {
      fetchDonations();
    }
  }, [fetchDonations, campaigns.length]);

  // Sync URL on filter change
  useEffect(() => {
    syncUrl();
  }, [syncUrl]);

  // Auth gate
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Memuat...</p>
      </div>
    );
  }
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-md">
          <p className="text-gray-700 mb-4">Anda harus login terlebih dahulu</p>
          <button
            onClick={() => router.push('/auth/login')}
            className="rounded-lg px-6 py-2.5 font-medium text-white"
            style={{ backgroundColor: '#003526' }}
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="min-h-screen bg-[#f9f9f8]">
      {/* Header — BADONASI gradient, mobile-first */}
      <div className="bg-gradient-to-br from-[#003526] via-[#003526] to-[#1B6B4A] relative overflow-hidden">
        {/* Pink accent decorations */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#EC4899] rounded-full opacity-10 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#EC4899] rounded-full opacity-5 blur-2xl"></div>

        <div className="relative mx-auto max-w-2xl px-4 py-5">
          <button
            onClick={() => router.push('/owner')}
            className="inline-flex items-center gap-1.5 text-xs text-[#F9A8D4] hover:text-white transition-colors mb-3 font-semibold"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Kembali ke Hub
          </button>

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#EC4899] flex items-center justify-center shadow-lg shadow-pink-500/30 shrink-0">
              <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>inbox</span>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-extrabold text-white leading-tight">Inbox Donasi</h1>
              <p className="text-xs text-[#95d3ba] mt-0.5 leading-relaxed">
                Verifikasi donasi ke rekening kampanye
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-5 space-y-3 pb-20">
        {/* Financial Summary — owner transparency dashboard */}
        <FinancialSummaryCard summary={summary} loading={summaryLoading} />

        {/* Smart Views Pills — mobile-first horizontal scroll */}
        <div className="overflow-x-auto -mx-4 px-4 pb-1 scrollbar-hide">
          <div className="flex gap-2 min-w-max">
            {SMART_VIEWS.map((view) => {
              const isActive = smartView === view.value;
              return (
                <button
                  key={view.value}
                  onClick={() => {
                    setSmartView(view.value);
                    setPage(1);
                  }}
                  className={`flex-shrink-0 rounded-full px-3.5 py-2 text-xs font-bold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-gradient-to-r from-[#003526] to-[#BE185D] text-white shadow-md shadow-pink-500/20'
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-[#EC4899]/30 hover:text-[#003526]'
                  }`}
                >
                  <span className="mr-1">{view.emoji}</span>
                  {view.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter Row — search full-width mobile-first */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg pointer-events-none">search</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Cari nama donatur atau kode..."
            className="w-full rounded-xl border border-gray-200 pl-10 pr-3 py-3 text-sm focus:border-[#EC4899] focus:ring-2 focus:ring-[#EC4899]/20 focus:outline-none transition-all bg-white"
          />
        </div>

        {/* Campaign Filter Pills — horizontal scroll mobile */}
        {campaigns.length > 0 && (
          <div className="overflow-x-auto -mx-4 px-4 pb-1 scrollbar-hide">
            <div className="flex gap-2 min-w-max">
              <button
                onClick={() => {
                  setCampaignFilter('all');
                  setPage(1);
                }}
                className={`flex-shrink-0 rounded-full px-3.5 py-2 text-xs font-bold transition-all whitespace-nowrap inline-flex items-center gap-1.5 ${
                  campaignFilter === 'all'
                    ? 'bg-gradient-to-r from-[#003526] to-[#BE185D] text-white shadow-md shadow-pink-500/20'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-[#EC4899]/30 hover:text-[#003526]'
                }`}
              >
                <span className="material-symbols-outlined text-sm">apps</span>
                Semua Kampanye
              </button>
              {campaigns.map((c) => {
                const isActive = campaignFilter === c.id;
                const truncatedTitle = c.title.length > 22 ? c.title.slice(0, 22) + '…' : c.title;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setCampaignFilter(c.id);
                      setPage(1);
                    }}
                    className={`flex-shrink-0 rounded-full px-3.5 py-2 text-xs font-bold transition-all whitespace-nowrap inline-flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-gradient-to-r from-[#003526] to-[#BE185D] text-white shadow-md shadow-pink-500/20'
                        : 'bg-white text-gray-600 border border-gray-200 hover:border-[#EC4899]/30 hover:text-[#003526]'
                    }`}
                    title={c.title}
                  >
                    <span className="material-symbols-outlined text-sm">campaign</span>
                    {truncatedTitle}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-2 text-sm">
          {loading ? (
            <span className="text-gray-500 flex items-center gap-2">
              <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
              Memuat...
            </span>
          ) : (
            <span className="text-gray-700">
              <strong className="text-[#003526] font-extrabold">{total}</strong>
              <span className="text-gray-500"> donasi</span>
              {searchQuery && <span className="text-gray-500 italic"> · cocok dengan pencarian</span>}
            </span>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Donation List */}
        {loading && donations.length === 0 ? (
          <div className="rounded-2xl bg-white border border-gray-100 p-8 text-center">
            <span className="material-symbols-outlined text-3xl text-[#EC4899] animate-spin">progress_activity</span>
            <p className="text-sm text-gray-500 mt-2">Memuat donasi...</p>
          </div>
        ) : donations.length === 0 ? (
          <EmptyState smartView={smartView} hasFilter={!!searchQuery || campaignFilter !== 'all'} />
        ) : (
          <div className="space-y-3">
            {donations.map((d) => (
              <DonationCard
                key={d.id}
                donation={d}
                onVerify={() =>
                  setVerifyDonation({
                    id: d.id,
                    donor_name: d.donor_name,
                    is_anonymous: d.is_anonymous,
                    amount: Number(d.amount),
                    operational_fee: Number(d.operational_fee),
                    total_transfer: Number(d.total_transfer),
                    donation_code: d.donation_code,
                    message: d.message,
                    transfer_proof_url: d.transfer_proof_url,
                    created_at: d.created_at,
                    campaign_title: d.campaign_title,
                  })
                }
                onReject={() => setRejectDonation(d)}
              />
            ))}
          </div>
        )}

        {/* Pagination — mobile compact, sm+ with text */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 pt-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#EC4899]/40 hover:text-[#003526] transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">chevron_left</span>
              <span className="hidden sm:inline">Sebelumnya</span>
            </button>
            <span className="px-3 py-2 text-sm font-bold text-[#003526]">
              {page} <span className="text-gray-400 font-normal">/</span> {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#EC4899]/40 hover:text-[#003526] transition-all flex items-center gap-1.5"
            >
              <span className="hidden sm:inline">Selanjutnya</span>
              <span className="material-symbols-outlined text-base">chevron_right</span>
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {verifyDonation && (
        <DonationVerifyModal
          donation={verifyDonation}
          isOpen={!!verifyDonation}
          onClose={() => setVerifyDonation(null)}
          onSuccess={() => { fetchDonations(); fetchSummary(); }}
        />
      )}
      {rejectDonation && (
        <DonationRejectModal
          donationId={rejectDonation.id}
          donorName={rejectDonation.donor_name}
          isAnonymous={rejectDonation.is_anonymous}
          totalTransfer={Number(rejectDonation.total_transfer)}
          isOpen={!!rejectDonation}
          onClose={() => setRejectDonation(null)}
          onSuccess={() => { fetchDonations(); fetchSummary(); }}
        />
      )}
    </div>
  );
}

// ───── Inline DonationCard component ─────
function DonationCard({
  donation,
  onVerify,
  onReject,
}: {
  donation: DonationListItem;
  onVerify: () => void;
  onReject: () => void;
}) {
  const status = donation.verification_status;
  const isPending = status === 'pending';
  const isVerified = status === 'verified';
  const isRejected = status === 'rejected';
  const isUnderAudit = status === 'under_audit';

  // Status badge styling
  const statusBadge = isPending
    ? { bg: '#FEF3C7', text: '#92400E', label: 'Pending' }
    : isVerified
    ? { bg: '#D1FAE5', text: '#065F46', label: 'Verified' }
    : isRejected
    ? { bg: '#FEE2E2', text: '#991B1B', label: 'Rejected' }
    : { bg: '#FEF3C7', text: '#854D0E', label: 'Under Audit' };

  // Discrepancy display — defensive against undefined/null/string from backend
  const hasDiscrepancy = donation.discrepancy_decision && donation.discrepancy_decision !== 'exact_match';
  const amountReceivedNum =
    donation.amount_received !== null && donation.amount_received !== undefined
      ? Number(donation.amount_received)
      : null;
  const discrepancyAmt =
    donation.discrepancy_amount !== null && donation.discrepancy_amount !== undefined
      ? Number(donation.discrepancy_amount)
      : null;

  // Anonymous-aware donor name
  const displayName = donation.is_anonymous ? 'Hamba Allah' : donation.donor_name;

  // "Hampir telat" warning
  const ageMs = Date.now() - new Date(donation.created_at).getTime();
  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
  const isStale = isPending && ageDays >= 2;

  return (
    <div className="rounded-xl bg-white border border-gray-200 p-4 hover:border-gray-300 transition">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900 truncate">{displayName}</p>
            {donation.is_anonymous && (
              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">Anonim</span>
            )}
          </div>
          {donation.campaign_title && (
            <p className="text-xs text-gray-500 truncate mt-0.5">{donation.campaign_title}</p>
          )}
        </div>

        <span
          className="rounded-full px-2.5 py-1 text-xs font-medium flex-shrink-0"
          style={{ backgroundColor: statusBadge.bg, color: statusBadge.text }}
        >
          {statusBadge.label}
        </span>
      </div>

      {/* Amount details */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-xs text-gray-500">Total Transfer</p>
          <p className="font-semibold text-gray-900">Rp {formatRp(donation.total_transfer)}</p>
          <p className="text-xs text-gray-500 mt-0.5">Kode: {donation.donation_code}</p>
        </div>
        {amountReceivedNum !== null && Number.isFinite(amountReceivedNum) && (
          <div>
            <p className="text-xs text-gray-500">Diterima</p>
            <p className="font-semibold text-gray-900">Rp {formatRp(amountReceivedNum)}</p>
            {discrepancyAmt !== null && Number.isFinite(discrepancyAmt) && discrepancyAmt !== 0 && (
              <p className={`text-xs mt-0.5 ${discrepancyAmt < 0 ? 'text-orange-600' : 'text-blue-600'}`}>
                Selisih: {discrepancyAmt > 0 ? '+' : ''}Rp {formatRp(Math.abs(discrepancyAmt))}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Decision badge */}
      {hasDiscrepancy && donation.discrepancy_decision && (
        <div className="mb-3 inline-block rounded-lg bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs text-blue-800">
          📊 {decisionLabel(donation.discrepancy_decision)}
        </div>
      )}

      {/* Verifier badge */}
      {isVerified && donation.verified_by_role && (
        <div className="mb-3 inline-block rounded-lg bg-green-50 border border-green-200 px-2.5 py-1 text-xs text-green-800">
          ✅ Verified by {donation.verified_by_role === 'penggalang' ? 'Anda' : 'Admin'}
          {donation.verified_at && (
            <span className="text-green-600 ml-1">
              · {formatDate(donation.verified_at)}
            </span>
          )}
        </div>
      )}

      {/* Stale warning */}
      {isStale && (
        <div className="mb-3 rounded-lg bg-orange-50 border border-orange-200 px-3 py-2 text-xs text-orange-800">
          ⏰ <b>Sudah {ageDays} hari pending.</b> Akan di-escalate ke admin di hari ke-3.
        </div>
      )}

      {/* Under Audit notice */}
      {isUnderAudit && (
        <div className="mb-3 rounded-lg bg-yellow-50 border border-yellow-300 px-3 py-2 text-xs text-yellow-900">
          ⚠️ <b>Status under audit.</b> Donasi menunggu keputusan lanjutan (top-up / refund).
        </div>
      )}

      {/* Message preview */}
      {donation.message && (
        <p className="text-sm text-gray-600 italic mb-3 line-clamp-2">
          &ldquo;{donation.message}&rdquo;
        </p>
      )}

      {/* Actions (only for pending) */}
      {isPending && (
        <div className="flex gap-2 pt-3 border-t border-gray-100">
          <button
            onClick={onVerify}
            className="flex-1 rounded-lg px-4 py-2.5 text-sm font-bold text-white transition-all hover:opacity-95 shadow-sm shadow-pink-500/20 flex items-center justify-center gap-2 bg-gradient-to-r from-[#003526] to-[#BE185D]"
          >
            <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
            Verifikasi Diterima
          </button>
          <button
            onClick={onReject}
            className="rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 hover:border-red-300 transition-all flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base">close</span>
            Reject
          </button>
        </div>
      )}

      {/* Created time */}
      <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
        <span className="material-symbols-outlined text-xs">schedule</span>
        {formatDateTime(donation.created_at)}
      </p>
    </div>
  );
}

// ───── FinancialSummaryCard — owner transparency dashboard ─────
function FinancialSummaryCard({
  summary,
  loading,
}: {
  summary: FinancialSummary | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-[#003526] to-[#1B6B4A] p-4 text-center">
        <span className="material-symbols-outlined text-2xl text-[#F9A8D4] animate-spin">progress_activity</span>
        <p className="text-xs text-[#95d3ba] mt-1">Memuat ringkasan keuangan...</p>
      </div>
    );
  }
  if (!summary) return null;

  const isPhase1 = summary.platform_phase === 'phase1_penggalang_account';

  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#003526] via-[#003526] to-[#1B6B4A] p-4 relative overflow-hidden shadow-lg">
      {/* Pink decoration */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-[#EC4899] rounded-full opacity-10 blur-2xl"></div>

      <div className="relative">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-[#EC4899] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-white text-base" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-[#F9A8D4] uppercase tracking-widest">Ringkasan Keuangan Saya</p>
            <p className="text-xs text-[#95d3ba]">Real-time dari semua kampanye</p>
          </div>
        </div>

        {/* Main metric: Saldo (yang masih di rekening) */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 mb-2 border border-white/10">
          <p className="text-[10px] text-[#F9A8D4] font-bold uppercase tracking-wider mb-1">💼 Saldo di Rekening</p>
          <p className="text-2xl font-extrabold text-white leading-none">
            {formatRupiahFull(summary.saldo)}
          </p>
          <p className="text-[10px] text-[#95d3ba] mt-1">
            Yang akan disalurkan ke penerima manfaat
          </p>
        </div>

        {/* 2x2 grid: Terkumpul, Disalurkan, Donatur, Pending */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <SummaryStat
            icon="trending_up"
            label="Terkumpul"
            value={formatRupiahFull(summary.total_collected)}
            sublabel={`${summary.verified_count} donasi`}
            color="#10B981"
          />
          <SummaryStat
            icon="check_circle"
            label="Disalurkan"
            value={formatRupiahFull(summary.total_disbursed)}
            sublabel="Ke penerima"
            color="#34D399"
          />
          <SummaryStat
            icon="groups"
            label="Donatur"
            value={`${summary.total_donors}`}
            sublabel="orang"
            color="#F472B6"
          />
          <SummaryStat
            icon="pending_actions"
            label="Belum Verify"
            value={`${summary.pending_count}`}
            sublabel="donasi"
            color={summary.pending_count > 0 ? '#FBBF24' : '#6B7280'}
          />
        </div>

        {/* Revenue section: Fee Penggalang + Kode Unik (phase-aware) */}
        <div className="rounded-xl bg-gradient-to-r from-[#EC4899]/20 to-[#BE185D]/20 backdrop-blur-sm p-3 border border-[#EC4899]/30">
          <p className="text-[10px] text-[#F9A8D4] font-bold uppercase tracking-wider mb-2">
            🌸 Pendapatan Penggalang
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-[#F9A8D4] mb-0.5">Fee Penggalang</p>
              <p className="text-sm font-extrabold text-white">
                {formatRupiahFull(summary.total_fee_penggalang)}
              </p>
              <p className="text-[9px] text-[#95d3ba]">opt-in dari donor</p>
            </div>
            <div>
              <p className="text-[10px] text-[#F9A8D4] mb-0.5">
                Kode Unik {isPhase1 ? '' : '(ke TeraLoka)'}
              </p>
              <p className={`text-sm font-extrabold ${isPhase1 ? 'text-white' : 'text-[#95d3ba] line-through'}`}>
                {formatRupiahFull(summary.total_kode_unik)}
              </p>
              <p className="text-[9px] text-[#95d3ba]">
                {isPhase1 ? 'kompensasi verifikasi' : 'Phase 2: ke platform'}
              </p>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-[#EC4899]/20">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-[#F9A8D4] font-bold uppercase tracking-wider">Total Pendapatan</p>
              <p className="text-base font-extrabold text-[#F472B6]">
                {formatRupiahFull(summary.penggalang_revenue)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryStat({
  icon,
  label,
  value,
  sublabel,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  sublabel: string;
  color: string;
}) {
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5 border border-white/5">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="material-symbols-outlined text-sm" style={{ color, fontVariationSettings: "'FILL' 1" }}>{icon}</span>
        <p className="text-[10px] text-[#95d3ba] font-bold uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-sm font-extrabold text-white leading-tight truncate">{value}</p>
      <p className="text-[9px] text-[#95d3ba] mt-0.5">{sublabel}</p>
    </div>
  );
}

// Format helpers — full rupiah for trust, compact for stat grids
function formatRupiahFull(num: number): string {
  return 'Rp ' + new Intl.NumberFormat('id-ID').format(num);
}

function formatRupiahCompact(num: number): string {
  if (num >= 1_000_000_000) return 'Rp ' + (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1_000_000) return 'Rp ' + (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'jt';
  if (num >= 1_000) return 'Rp ' + (num / 1_000).toFixed(0) + 'rb';
  return 'Rp ' + num.toLocaleString('id-ID');
}

// ───── EmptyState (smart-view aware) ─────
function EmptyState({ smartView, hasFilter }: { smartView: SmartView; hasFilter: boolean }) {
  // Smart-view aware messaging — purpose-driven, motivating
  const meta = (() => {
    if (hasFilter) {
      return {
        icon: 'search_off',
        title: 'Tidak ada hasil',
        message: 'Coba ubah kata kunci atau pilih semua kampanye untuk melihat lebih banyak donasi.',
        accent: '#6B7280', // gray
      };
    }
    switch (smartView) {
      case 'perlu_verifikasi':
        return {
          icon: 'celebration',
          title: 'Semua sudah diverifikasi! 🎉',
          message: 'Tidak ada donasi yang menunggu. Penerima dapat dana tepat waktu — terima kasih atas kepedulian Anda!',
          accent: '#10B981', // emerald
        };
      case 'hampir_telat':
        return {
          icon: 'thumb_up',
          title: 'Aman terkendali',
          message: 'Tidak ada donasi yang tertunda lama. Pertahankan ritme verifikasi yang baik!',
          accent: '#10B981',
        };
      case 'under_audit':
        return {
          icon: 'check_circle',
          title: 'Bersih dari audit',
          message: 'Tidak ada donasi dalam status audit. Semua transaksi tercatat dengan jelas.',
          accent: '#10B981',
        };
      case 'mismatch_diterima':
        return {
          icon: 'balance',
          title: 'Cocok semua',
          message: 'Tidak ada donasi dengan selisih nominal. Donatur transfer sesuai nominal yang diharapkan.',
          accent: '#10B981',
        };
      case 'verified_today':
        return {
          icon: 'today',
          title: 'Belum ada verifikasi hari ini',
          message: 'Belum ada donasi yang diverifikasi hari ini. Cek tab "Perlu Verifikasi" untuk mulai.',
          accent: '#EC4899', // pink — gentle nudge
        };
      default:
        return {
          icon: 'inbox',
          title: 'Belum ada donasi',
          message: 'Saat ada donasi masuk ke kampanye Anda, akan muncul di sini.',
          accent: '#6B7280',
        };
    }
  })();

  return (
    <div className="rounded-2xl bg-white border border-gray-100 p-8 text-center shadow-sm">
      <div className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center"
           style={{ background: `${meta.accent}15` }}>
        <span className="material-symbols-outlined text-2xl"
              style={{ color: meta.accent, fontVariationSettings: "'FILL' 1" }}>
          {meta.icon}
        </span>
      </div>
      <p className="text-sm font-bold text-gray-800 mb-1">{meta.title}</p>
      <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">{meta.message}</p>
    </div>
  );
}

// ───── Helpers ─────
function formatRp(num: number): string {
  return new Intl.NumberFormat('id-ID').format(num);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function decisionLabel(d: string): string {
  const map: Record<string, string> = {
    exact_match: 'Cocok persis',
    accepted_partial: 'Donor kurang, diterima',
    accepted_excess: 'Donor lebih, diterima bonus',
    awaiting_topup: 'Menunggu top-up donor',
    refund_pending: 'Akan refund selisih',
  };
  return map[d] || d;
}
