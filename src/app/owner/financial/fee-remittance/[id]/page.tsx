'use client';

/**
 * /owner/financial/fee-remittance/[id] — Detail Setoran Fee
 *
 * Show full status setoran: bukti transfer, amount, status timeline,
 * covered donations (kalau verified), reject reason (kalau rejected).
 *
 * Filosofi 4 Pilar:
 *  - Credibility: status banner clear (pending/verified/rejected)
 *  - Transparency: bukti transfer visible, covered donations dengan fee snapshot
 *  - Accountability: reject reason highlighted dengan CTA submit ulang
 *  - Comfort: mobile-first, single-screen scroll, image preview tap-to-zoom
 *
 * Architecture: Backend (Otak) compute, frontend (Wajah) display only.
 */

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, AlertCircle, CheckCircle2, XCircle,
  Hourglass, Calendar, FileText, ExternalLink, TrendingUp,
  User, Hash, MessageCircle, Clock, ArrowRight, RefreshCw,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

// ── Types ──────────────────────────────────────────────────────

type RemittanceStatus = 'pending' | 'verified' | 'rejected';

interface CoveredDonation {
  id: string;
  donation_code: string;
  donor_name: string;
  amount: number;
  fee_snapshot: number;
  operational_fee_current: number;
  verified_at: string;
  campaign_id: string;
}

interface RemittanceDetail {
  id: string;
  amount: number;
  status: RemittanceStatus;
  partner_name: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  reference_code: string | null;
  receipt_url: string | null;
  notes: string | null;
  donation_count: number;
  covered_donations: CoveredDonation[];
}

const STATUS_META: Record<RemittanceStatus, {
  label: string;
  color: string;
  bg: string;
  icon: any;
  description: string;
}> = {
  pending: {
    label: 'Menunggu Review',
    color: '#B45309',
    bg: '#FEF3C7',
    icon: Hourglass,
    description: 'Admin sedang memverifikasi bukti transfer Anda. Biasanya selesai dalam 1x24 jam.',
  },
  verified: {
    label: 'Terverifikasi',
    color: '#047857',
    bg: '#D1FAE5',
    icon: CheckCircle2,
    description: 'Setoran sudah dikonfirmasi admin. Donasi yang ter-cover sudah ditandai sebagai disetor.',
  },
  rejected: {
    label: 'Ditolak',
    color: '#B91C1C',
    bg: '#FEE2E2',
    icon: XCircle,
    description: 'Setoran ditolak admin. Lihat alasan di bawah dan submit ulang dengan bukti yang benar.',
  },
};

// ── Helpers ────────────────────────────────────────────────────

function rp(n: number) {
  return 'Rp ' + Number(n || 0).toLocaleString('id-ID');
}

function fmtFull(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtShort(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function isPdf(url: string | null) {
  return !!url && url.toLowerCase().endsWith('.pdf');
}

// ════════════════════════════════════════════════════════════════
// PAGE WRAPPER
// ════════════════════════════════════════════════════════════════

export default function FeeRemittanceDetailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <DetailContent />
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

function DetailContent() {
  const { user, token, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const remittanceId = params.id as string;

  const [detail, setDetail] = useState<RemittanceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ── Fetch detail ───────────────────────────────────────────────
  const loadData = useCallback(async (silent = false) => {
    if (!token || !remittanceId) return;
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${API}/funding/my/fee-remittances/${remittanceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || 'Setoran tidak ditemukan');
      }

      // Detect status change saat silent refresh untuk feedback toast
      if (silent && detail && detail.status !== json.data.status) {
        const newStatusLabel =
          json.data.status === 'verified' ? 'Terverifikasi ✅' :
          json.data.status === 'rejected' ? 'Ditolak ❌' :
          'Menunggu Review ⏳';
        setToastMessage(`Status diperbarui: ${newStatusLabel}`);
        setTimeout(() => setToastMessage(null), 3000);
      } else if (silent) {
        setToastMessage('Belum ada perubahan');
        setTimeout(() => setToastMessage(null), 2000);
      }

      setDetail(json.data);
    } catch (err: any) {
      console.error('[FeeRemittanceDetail] Load error:', err);
      if (!silent) setError(err.message || 'Gagal memuat detail');
      else {
        setToastMessage('Gagal memuat data');
        setTimeout(() => setToastMessage(null), 2000);
      }
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, [token, remittanceId, detail]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push(`/login?redirect=/owner/financial/fee-remittance/${remittanceId}`);
      return;
    }
    loadData(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, router, remittanceId]);

  // Auto-refresh saat tab balik focus (owner balik dari WA / app lain)
  useEffect(() => {
    function handleVisibility() {
      if (detail && document.visibilityState === 'visible') {
        loadData(true); // silent refresh
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [detail, loadData]);

  // Manual refresh handler
  function handleRefresh() {
    setRefreshing(true);
    loadData(true);
  }

  // ── States ─────────────────────────────────────────────────────

  if (authLoading || loading) {
    return <LoadingFallback />;
  }

  if (error || !detail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-800 mb-2">{error || 'Setoran tidak ditemukan'}</p>
          <Link href="/owner/financial/fee-remittance" className="text-sm text-[#003526] underline">
            Kembali ke Setor Fee
          </Link>
        </div>
      </div>
    );
  }

  const meta = STATUS_META[detail.status];
  const Icon = meta.icon;

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/owner/financial/fee-remittance"
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft size={20} className="text-gray-700" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-900">Detail Setoran</h1>
            <p className="text-xs text-gray-500 font-mono truncate">
              {detail.id.slice(0, 8)}...
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-opacity"
            aria-label="Refresh status setoran"
            title="Refresh status setoran"
          >
            <RefreshCw
              size={18}
              className={`text-gray-600 ${refreshing ? 'animate-spin' : ''}`}
            />
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">

        {/* Status Banner */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: meta.bg }}>
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'white' }}
            >
              <Icon size={20} style={{ color: meta.color }} />
            </div>
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: meta.color }}
              >
                Status
              </p>
              <p className="text-lg font-black" style={{ color: meta.color }}>
                {meta.label}
              </p>
            </div>
          </div>
          <p
            className="text-xs leading-relaxed"
            style={{ color: meta.color, opacity: 0.85 }}
          >
            {meta.description}
          </p>
        </div>

        {/* Amount Card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Jumlah Setoran
          </p>
          <p className="text-3xl font-black text-gray-900">{rp(detail.amount)}</p>
          {detail.donation_count > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              Cover <strong className="text-gray-800">{detail.donation_count}</strong> donasi
            </p>
          )}
        </div>

        {/* Reject Reason — kalau status rejected */}
        {detail.status === 'rejected' && detail.review_notes && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <XCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-red-700 mb-1.5 uppercase">Alasan Ditolak</p>
                <p className="text-sm text-red-800 leading-relaxed">{detail.review_notes}</p>
                <Link
                  href="/owner/financial/fee-remittance/new"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-red-700 hover:text-red-900 mt-3"
                >
                  Submit Ulang Setoran <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Detail Info */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
              Informasi Setoran
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            <DetailRow icon={Calendar} label="Disubmit" value={fmtFull(detail.submitted_at)} />
            {detail.reviewed_at && (
              <DetailRow
                icon={Clock}
                label={detail.status === 'verified' ? 'Diverifikasi' : 'Direview'}
                value={fmtFull(detail.reviewed_at)}
              />
            )}
            <DetailRow icon={User} label="Penggalang" value={detail.partner_name} />
            {detail.reference_code && (
              <DetailRow
                icon={Hash}
                label="Kode Referensi"
                value={detail.reference_code}
                mono
              />
            )}
            {detail.notes && (
              <DetailRow icon={MessageCircle} label="Catatan" value={detail.notes} />
            )}
          </div>
        </div>

        {/* Bukti Transfer */}
        {detail.receipt_url && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                Bukti Transfer
              </h2>
            </div>
            <div className="p-5">
              {isPdf(detail.receipt_url) ? (
                <a
                  href={detail.receipt_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText size={20} className="text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800">Bukti Transfer (PDF)</p>
                    <p className="text-xs text-gray-500">Klik untuk buka</p>
                  </div>
                  <ExternalLink size={16} className="text-gray-400 flex-shrink-0" />
                </a>
              ) : (
                <a
                  href={detail.receipt_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group"
                >
                  <img
                    src={detail.receipt_url}
                    alt="Bukti transfer"
                    className="w-full max-h-96 object-contain rounded-xl border border-gray-200 group-hover:border-gray-300 transition-colors"
                  />
                  <p className="text-xs text-gray-500 text-center mt-2">
                    Klik gambar untuk lihat ukuran penuh
                  </p>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Covered Donations — kalau verified */}
        {detail.status === 'verified' && detail.covered_donations.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                <TrendingUp size={12} />
                Donasi Yang Tercover ({detail.covered_donations.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-100">
              {detail.covered_donations.map(d => (
                <div key={d.id} className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800 truncate">{d.donor_name}</p>
                      <p className="text-xs text-gray-500 font-mono mt-0.5">
                        Kode: {d.donation_code}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-500">Donasi</p>
                      <p className="text-sm font-bold text-gray-800">{rp(d.amount)}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-50">
                    <span className="text-gray-500">{fmtShort(d.verified_at)}</span>
                    <span className="font-semibold text-emerald-700">
                      Fee: {rp(d.fee_snapshot)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-700">Total Fee Tercover</span>
                <span className="font-black text-emerald-700">
                  {rp(detail.covered_donations.reduce((s, d) => s + d.fee_snapshot, 0))}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toast notification — feedback untuk refresh action */}
      {toastMessage && (
        <div
          className="fixed left-1/2 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-sm font-semibold"
          style={{
            bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
            transform: 'translateX(-50%)',
            animation: 'slideUpFade 0.3s ease-out',
          }}
        >
          {toastMessage}
        </div>
      )}

      <style jsx>{`
        @keyframes slideUpFade {
          from { transform: translate(-50%, 20px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ════════════════════════════════════════════════════════════════

function DetailRow({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: any;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="px-5 py-3 flex items-start gap-3">
      <Icon size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className={`text-sm text-gray-800 break-words ${mono ? 'font-mono' : ''}`}>
          {value}
        </p>
      </div>
    </div>
  );
}
