'use client';

/**
 * /owner/funding/financial/fee-remittance — Setor Fee Operasional ke TeraLoka
 *
 * Penggalang setor fee yang dikumpulkan dari donasi ke rekening TeraLoka.
 * 4 Smart Views: Perlu Setor (default) | Sedang Direview | Riwayat Verified | Riwayat Ditolak
 *
 * Filosofi 4 Pilar:
 *  - Credibility: smart view "Perlu Setor" prioritize action saldo tertunggak
 *  - Transparency: history setoran lengkap dengan covered donations + bukti
 *  - Accountability: deadline aging (oldest_pending_days), reject reason visible
 *  - Comfort: mobile-first, single-tap CTA submit, status badge clear
 *
 * URL query sync: ?view=<smart_view>&page=<n>
 * 
 * Architecture: Backend (Otak) compute, frontend (Wajah) display only.
 * No business logic in frontend — just UI state + API calls.
 */

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Plus, Wallet, Loader2, CheckCircle2, XCircle,
  Hourglass, Clock, AlertCircle, TrendingUp, Receipt,
  Calendar, FileText, Eye, Info, ChevronRight,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

// ── Types ──────────────────────────────────────────────────────

type SmartView = 'perlu_setor' | 'sedang_review' | 'verified' | 'rejected' | 'all';
type RemittanceStatus = 'pending' | 'verified' | 'rejected';

interface PendingFeeData {
  total_fee_pending: number;
  pending_donations_count: number;
  oldest_pending_days: number;
  active_submission: {
    id: string;
    amount: number;
    submitted_at: string;
    status: string;
  } | null;
}

interface RemittanceListItem {
  id: string;
  amount: number;
  status: RemittanceStatus;
  submitted_at: string | null;
  reviewed_at: string | null;
  donation_count: number;
  reference_code: string | null;
  receipt_url: string | null;
  review_notes: string | null;
}

const SMART_VIEWS: Array<{ value: SmartView; label: string; emoji: string; color: string }> = [
  { value: 'perlu_setor',   label: 'Perlu Setor',     emoji: '💰', color: '#DC2626' },
  { value: 'sedang_review', label: 'Sedang Direview', emoji: '⏳', color: '#B45309' },
  { value: 'verified',      label: 'Verified',        emoji: '✅', color: '#16A34A' },
  { value: 'rejected',      label: 'Ditolak',         emoji: '❌', color: '#B91C1C' },
];

const STATUS_META: Record<RemittanceStatus, { label: string; color: string; bg: string; icon: any }> = {
  pending:  { label: 'Menunggu Review',  color: '#B45309', bg: '#FEF3C7', icon: Hourglass    },
  verified: { label: 'Terverifikasi',    color: '#047857', bg: '#D1FAE5', icon: CheckCircle2 },
  rejected: { label: 'Ditolak',          color: '#B91C1C', bg: '#FEE2E2', icon: XCircle      },
};

// ── Helpers ────────────────────────────────────────────────────

function rp(n: number) {
  return 'Rp ' + Number(n || 0).toLocaleString('id-ID');
}

function fmt(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

// ════════════════════════════════════════════════════════════════
// PAGE WRAPPER (Suspense for useSearchParams)
// ════════════════════════════════════════════════════════════════

export default function OwnerFeeRemittancePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <FeeRemittancePageContent />
    </Suspense>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="w-8 h-8 text-[#003526] animate-spin" />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// PAGE CONTENT
// ════════════════════════════════════════════════════════════════

function FeeRemittancePageContent() {
  const { user, token, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL state
  const currentView = (searchParams.get('view') as SmartView) || 'perlu_setor';

  // Data state
  const [pending, setPending] = useState<PendingFeeData | null>(null);
  const [remittances, setRemittances] = useState<RemittanceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Update URL helper ──────────────────────────────────────────
  const updateView = useCallback((view: SmartView) => {
    const params = new URLSearchParams(searchParams.toString());
    if (view === 'perlu_setor') {
      params.delete('view'); // default → no param
    } else {
      params.set('view', view);
    }
    router.replace(`${pathname}${params.toString() ? '?' + params.toString() : ''}`, { scroll: false });
  }, [pathname, router, searchParams]);

  // ── Fetch pending fee + remittances ────────────────────────────
  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [pendingRes, listRes] = await Promise.all([
        fetch(`${API}/funding/my/fee-remittances/pending`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.json()),
        fetch(`${API}/funding/my/fee-remittances?limit=50`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.json()),
      ]);

      if (pendingRes.success) setPending(pendingRes.data);
      if (listRes.success) setRemittances(listRes.data ?? []);
    } catch (err: any) {
      console.error('[FeeRemittance] Load error:', err);
      setError(err.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // ── Auth + initial load ────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login?redirect=/owner/funding/financial/fee-remittance');
      return;
    }
    loadData();
  }, [authLoading, user, router, loadData]);

  // ── Filter remittances based on smart view ─────────────────────
  const filteredRemittances = remittances.filter(r => {
    switch (currentView) {
      case 'sedang_review': return r.status === 'pending';
      case 'verified':      return r.status === 'verified';
      case 'rejected':      return r.status === 'rejected';
      case 'all':           return true;
      case 'perlu_setor':   return false; // perlu_setor view = focus saldo, no list
      default:              return true;
    }
  });

  // ── Counts per smart view ──────────────────────────────────────
  const counts = {
    sedang_review: remittances.filter(r => r.status === 'pending').length,
    verified:      remittances.filter(r => r.status === 'verified').length,
    rejected:      remittances.filter(r => r.status === 'rejected').length,
  };

  // ── Loading / error states ─────────────────────────────────────
  if (authLoading || loading) {
    return <LoadingFallback />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-800 mb-2">{error}</p>
          <Link href="/owner/funding/financial" className="text-sm text-[#003526] underline">
            Kembali ke Laporan Keuangan
          </Link>
        </div>
      </div>
    );
  }

  const totalPending = pending?.total_fee_pending ?? 0;
  const hasPending = totalPending > 0;
  const hasActiveSubmission = pending?.active_submission != null;
  const oldestDays = pending?.oldest_pending_days ?? 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/owner/funding/financial"
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft size={20} className="text-gray-700" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-900">Setor Fee</h1>
            <p className="text-xs text-gray-500">Setor fee operasional ke TeraLoka</p>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">

        {/* Saldo Card — always visible */}
        <div className="bg-gradient-to-br from-[#003526] to-[#0d4d3a] rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Wallet size={16} className="opacity-80" />
            <p className="text-xs font-semibold opacity-90 uppercase tracking-wide">Fee Belum Disetor</p>
          </div>
          <p className="text-3xl font-black mb-3">{rp(totalPending)}</p>
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/20 text-xs">
            <div>
              <p className="opacity-70 mb-0.5">Donasi Belum Disetor</p>
              <p className="font-bold">{pending?.pending_donations_count ?? 0} donasi</p>
            </div>
            <div>
              <p className="opacity-70 mb-0.5">Sudah Menunggu</p>
              <p className="font-bold">
                {oldestDays > 0 ? `${oldestDays} hari` : 'Belum ada'}
              </p>
            </div>
          </div>
        </div>

        {/* Aging warning kalau >30 hari */}
        {oldestDays >= 30 && hasPending && !hasActiveSubmission && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3 flex items-start gap-2.5">
            <Clock size={16} className="text-orange-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-orange-800 leading-relaxed">
              <strong>Sudah {oldestDays} hari donasi terlama belum disetor.</strong> Yuk segera setor supaya akuntabilitas penyaluran fee tetap terjaga.
            </p>
          </div>
        )}

        {/* Active Submission Card */}
        {hasActiveSubmission && pending?.active_submission && (
          <Link
            href={`/owner/funding/financial/fee-remittance/${pending.active_submission.id}`}
            className="block bg-amber-50 border border-amber-200 rounded-2xl p-4 hover:bg-amber-100 transition-colors"
          >
            <div className="flex items-start gap-3">
              <Hourglass size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-amber-800 mb-1">
                  Setoran Sedang Direview
                </p>
                <p className="text-xs text-amber-700 leading-relaxed">
                  Setoran <strong>{rp(pending.active_submission.amount)}</strong> sedang menunggu verifikasi admin. Tunggu review selesai sebelum submit baru.
                </p>
                <p className="text-xs text-amber-600 mt-2 font-semibold flex items-center gap-1">
                  Lihat detail <ChevronRight size={12} />
                </p>
              </div>
            </div>
          </Link>
        )}

        {/* Primary CTA */}
        {hasPending && !hasActiveSubmission && (
          <Link
            href="/owner/funding/financial/fee-remittance/new"
            className="flex items-center justify-center gap-2 bg-[#003526] hover:bg-[#0d4d3a] text-white font-bold py-3.5 px-4 rounded-2xl transition-colors"
          >
            <Plus size={18} />
            Setor Fee Sekarang
          </Link>
        )}

        {/* Lunas state */}
        {!hasPending && !hasActiveSubmission && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
            <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-800 leading-relaxed">
              <strong>Lunas!</strong> Saat ini tidak ada fee yang perlu disetor. Setoran akan muncul otomatis saat ada donasi baru yang verified.
            </div>
          </div>
        )}

        {/* Smart Views Tabs */}
        <div className="overflow-x-auto -mx-4 px-4 pb-1">
          <div className="flex gap-2 min-w-max">
            {SMART_VIEWS.map(view => {
              const isActive = currentView === view.value;
              const count = view.value === 'sedang_review' ? counts.sedang_review :
                            view.value === 'verified'      ? counts.verified :
                            view.value === 'rejected'      ? counts.rejected :
                            null;
              return (
                <button
                  key={view.value}
                  onClick={() => updateView(view.value)}
                  className="px-3 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5"
                  style={{
                    backgroundColor: isActive ? view.color : '#FFFFFF',
                    color: isActive ? '#FFFFFF' : '#374151',
                    border: `1px solid ${isActive ? view.color : '#E5E7EB'}`,
                  }}
                >
                  <span>{view.emoji}</span>
                  <span>{view.label}</span>
                  {count !== null && count > 0 && (
                    <span
                      className="text-[10px] font-black px-1.5 py-0.5 rounded-full"
                      style={{
                        backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : '#F3F4F6',
                        color: isActive ? '#FFFFFF' : '#6B7280',
                      }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content per Smart View */}
        {currentView === 'perlu_setor' ? (
          <PerluSetorView totalPending={totalPending} hasActiveSubmission={hasActiveSubmission} />
        ) : (
          <RemittanceList remittances={filteredRemittances} view={currentView} />
        )}

        {/* Info footer */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <Info size={16} className="text-gray-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-gray-600 leading-relaxed">
              <p className="font-bold text-gray-800 mb-1">Apa itu Setor Fee?</p>
              <p>
                Setiap donasi yang masuk dipotong fee operasional kecil untuk biaya platform TeraLoka. Fee ini disetor manual oleh penggalang ke rekening TeraLoka, lalu admin verifikasi bukti transfernya.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ════════════════════════════════════════════════════════════════

function PerluSetorView({ totalPending, hasActiveSubmission }: { totalPending: number; hasActiveSubmission: boolean }) {
  if (totalPending <= 0 && !hasActiveSubmission) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
        <CheckCircle2 size={40} className="text-emerald-300 mx-auto mb-3" />
        <p className="text-sm font-bold text-gray-700 mb-1">Tidak ada yang perlu disetor</p>
        <p className="text-xs text-gray-500 max-w-xs mx-auto">
          Saat ada donasi baru yang sudah Anda verifikasi, fee operasionalnya akan muncul di sini untuk disetor.
        </p>
      </div>
    );
  }

  if (hasActiveSubmission) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
        <Hourglass size={40} className="text-amber-300 mx-auto mb-3" />
        <p className="text-sm font-bold text-gray-700 mb-1">Sedang Menunggu Review</p>
        <p className="text-xs text-gray-500 max-w-xs mx-auto">
          Lihat status setoran di tab "Sedang Direview" atau klik card di atas.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
      <Wallet size={40} className="text-[#003526] mx-auto mb-3" />
      <p className="text-sm font-bold text-gray-700 mb-1">Saatnya Setor Fee</p>
      <p className="text-xs text-gray-500 max-w-xs mx-auto mb-4">
        Klik tombol "Setor Fee Sekarang" di atas untuk submit bukti transfer fee operasional ke TeraLoka.
      </p>
    </div>
  );
}

function RemittanceList({ remittances, view }: { remittances: RemittanceListItem[]; view: SmartView }) {
  if (remittances.length === 0) {
    const emptyText = {
      sedang_review: 'Belum ada setoran yang sedang direview.',
      verified:      'Belum ada setoran yang terverifikasi.',
      rejected:      'Belum ada setoran yang ditolak.',
      all:           'Belum ada riwayat setoran.',
      perlu_setor:   'Tidak ada saldo yang perlu disetor.',
    }[view] ?? 'Tidak ada data.';

    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
        <Receipt size={40} className="text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {remittances.map(r => <RemittanceCard key={r.id} r={r} />)}
    </div>
  );
}

function RemittanceCard({ r }: { r: RemittanceListItem }) {
  const meta = STATUS_META[r.status];
  const Icon = meta.icon;

  return (
    <Link
      href={`/owner/funding/financial/fee-remittance/${r.id}`}
      className="block bg-white rounded-2xl border border-gray-100 hover:border-gray-200 transition-colors"
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span
                className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md"
                style={{ color: meta.color, backgroundColor: meta.bg }}
              >
                <Icon size={11} />
                {meta.label}
              </span>
              {r.reference_code && (
                <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md truncate max-w-[140px]">
                  {r.reference_code}
                </span>
              )}
            </div>
            <p className="text-2xl font-black text-gray-900">{rp(r.amount)}</p>
          </div>
          <Eye size={16} className="text-gray-400 flex-shrink-0 mt-2" />
        </div>

        <div className="space-y-1.5 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <Calendar size={12} className="text-gray-400" />
            <span>Disubmit: <strong className="text-gray-800">{fmt(r.submitted_at)}</strong></span>
          </div>
          {r.donation_count > 0 && (
            <div className="flex items-center gap-2">
              <TrendingUp size={12} className="text-gray-400" />
              <span>Cover <strong className="text-gray-800">{r.donation_count}</strong> donasi</span>
            </div>
          )}
          {r.receipt_url && (
            <div className="flex items-center gap-2">
              <FileText size={12} className="text-gray-400" />
              <span>Bukti transfer terlampir</span>
            </div>
          )}
        </div>

        {r.status === 'rejected' && r.review_notes && (
          <div className="mt-3 bg-red-50 border border-red-100 rounded-lg p-2.5">
            <p className="text-[10px] font-bold text-red-700 uppercase mb-0.5">Alasan Ditolak</p>
            <p className="text-xs text-red-800 leading-relaxed">{r.review_notes}</p>
          </div>
        )}
      </div>
    </Link>
  );
}
