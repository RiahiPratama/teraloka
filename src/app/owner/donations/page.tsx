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

import { useEffect, useState, useCallback } from 'react';
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

const SMART_VIEWS: Array<{ value: SmartView; label: string; emoji: string; color: string }> = [
  { value: 'perlu_verifikasi', label: 'Perlu Verifikasi', emoji: '🔴', color: '#DC2626' },
  { value: 'hampir_telat', label: 'Hampir Telat', emoji: '⏰', color: '#EA580C' },
  { value: 'under_audit', label: 'Under Audit', emoji: '⚠️', color: '#CA8A04' },
  { value: 'mismatch_diterima', label: 'Mismatch Diterima', emoji: '📊', color: '#0891B2' },
  { value: 'verified_today', label: 'Verified Hari Ini', emoji: '✅', color: '#16A34A' },
];

export default function OwnerDonationsPage() {
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
      .catch(() => { });
  }, [token]);

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Inbox Donasi</h1>
              <p className="text-sm text-gray-600 mt-0.5">
                Verifikasi donasi yang masuk ke rekening Anda
              </p>
            </div>
            <button
              onClick={() => router.push('/owner')}
              className="text-sm text-pink-600 hover:underline"
            >
              ← Kembali ke Hub
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 space-y-4">
        {/* Smart Views Pills */}
        <div className="overflow-x-auto pb-1 -mx-1 px-1">
          <div className="flex gap-2 min-w-max">
            {SMART_VIEWS.map((view) => (
              <button
                key={view.value}
                onClick={() => {
                  setSmartView(view.value);
                  setPage(1);
                }}
                className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition border-2 ${smartView === view.value
                    ? 'border-current text-white shadow-sm'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                style={
                  smartView === view.value
                    ? { backgroundColor: view.color, borderColor: view.color }
                    : undefined
                }
              >
                <span className="mr-1.5">{view.emoji}</span>
                {view.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Cari nama donatur atau kode unik..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:ring-1 focus:ring-pink-500 focus:outline-none"
            />
          </div>

          {/* Campaign filter */}
          <select
            value={campaignFilter}
            onChange={(e) => {
              setCampaignFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:ring-1 focus:ring-pink-500 focus:outline-none bg-white"
          >
            <option value="all">Semua Kampanye</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>

        {/* Stats */}
        <div className="text-sm text-gray-600">
          {loading ? 'Memuat...' : `${total} donasi`}
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Donation List */}
        {loading && donations.length === 0 ? (
          <div className="text-center py-12 text-gray-400">Memuat donasi...</div>
        ) : donations.length === 0 ? (
          <div className="rounded-xl bg-white border border-gray-200 p-8 text-center">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-gray-700 font-medium mb-1">Belum ada donasi</p>
            <p className="text-sm text-gray-500">
              {smartView === 'perlu_verifikasi'
                ? 'Tidak ada donasi yang perlu diverifikasi saat ini.'
                : 'Tidak ada donasi yang cocok dengan filter saat ini.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 pt-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-gray-50"
            >
              ← Sebelumnya
            </button>
            <span className="px-3 py-1.5 text-sm text-gray-600">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-gray-50"
            >
              Selanjutnya →
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
          onSuccess={() => fetchDonations()}
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
          onSuccess={() => fetchDonations()}
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
        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <button
            onClick={onVerify}
            className="flex-1 rounded-lg px-3 py-2 text-sm font-medium text-white transition"
            style={{ backgroundColor: '#003526' }}
          >
            ✓ Verifikasi Diterima
          </button>
          <button
            onClick={onReject}
            className="rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Reject
          </button>
        </div>
      )}

      {/* Created time */}
      <p className="text-xs text-gray-400 mt-2">{formatDateTime(donation.created_at)}</p>
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
