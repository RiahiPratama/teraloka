'use client';

import { useState, useEffect } from 'react';
import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { formatRupiah } from '@/utils/format';
import {
  ArrowLeft, Loader2, CheckCircle2, XCircle, AlertCircle,
  UserRound, Calendar, Phone, Hash, MessageCircle, ImageIcon,
  ExternalLink, ShieldCheck, Calculator,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';
const ADMIN_ROLES = ['admin_funding', 'super_admin'];

interface DonationDetail {
  id: string;
  donor_name: string;
  donor_phone: string | null;
  is_anonymous: boolean;
  amount: number;
  operational_fee: number;
  total_transfer: number;
  donation_code: string;
  message: string | null;
  transfer_proof_url: string | null;
  verification_status: string;
  rejection_reason: string | null;
  verified_at: string | null;
  created_at: string;
  campaigns: {
    id: string;
    title: string;
    slug: string;
    bank_name: string;
    bank_account_number: string;
    bank_account_name: string;
    partner_name: string | null;
    cover_image_url: string | null;
    target_amount: number;
    collected_amount: number;
  };
}

function formatFullDate(date: string): string {
  return new Date(date).toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function maskPhone(phone: string | null): string {
  if (!phone) return '-';
  if (phone.length < 8) return phone;
  return phone.slice(0, 4) + '*'.repeat(phone.length - 8) + phone.slice(-4);
}

export default function AdminDonationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const { user, token, isLoading: authLoading } = useAuth();

  const [donation, setDonation] = useState<DonationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Auth guard
  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    if (!ADMIN_ROLES.includes(user.role)) { router.push('/'); return; }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || !ADMIN_ROLES.includes(user.role)) return;

    async function fetchDonation() {
      try {
        const res = await fetch(`${API}/funding/donations/${id}`);
        const json = await res.json();
        if (json.success && json.data) {
          setDonation(json.data);
        } else {
          setFetchError(json?.error?.message || 'Donasi tidak ditemukan.');
        }
      } catch {
        setFetchError('Gagal memuat donasi.');
      } finally {
        setLoading(false);
      }
    }
    fetchDonation();
  }, [id, user]);

  async function handleAction(action: 'verify' | 'reject') {
    if (!token || !donation) return;
    if (action === 'reject' && !rejectReason.trim()) {
      setActionError('Alasan reject wajib diisi.');
      return;
    }

    setSubmitting(true);
    setActionError('');

    try {
      const res = await fetch(`${API}/funding/donations/${id}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action,
          reason: action === 'reject' ? rejectReason.trim() : undefined,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setActionSuccess(
          action === 'verify'
            ? '✅ Donasi berhasil diverifikasi. Total campaign sudah auto-increment.'
            : '❌ Donasi berhasil di-reject.'
        );
        setShowRejectModal(false);
        setTimeout(() => router.push('/admin/funding/donations'), 1500);
      } else {
        setActionError(json?.error?.message || 'Gagal memproses.');
      }
    } catch {
      setActionError('Koneksi bermasalah.');
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-[#003526]" />
      </div>
    );
  }

  if (!user || !ADMIN_ROLES.includes(user.role)) {
    return null;
  }

  if (fetchError || !donation) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Link href="/admin/funding/donations" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#003526] mb-4">
          <ArrowLeft size={16} /> Kembali ke Daftar
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <AlertCircle size={32} className="text-red-500 mx-auto mb-2" />
          <p className="text-sm font-bold text-red-900">{fetchError || 'Donasi tidak ditemukan'}</p>
        </div>
      </div>
    );
  }

  const isPending = donation.verification_status === 'pending_review' || donation.verification_status === 'pending';
  const isVerified = donation.verification_status === 'verified';
  const isRejected = donation.verification_status === 'rejected';

  return (
    <div className="p-6 max-w-3xl mx-auto pb-32">
      {/* Back */}
      <Link
        href="/admin/funding/donations"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#003526] mb-4 hover:opacity-80 transition-opacity"
      >
        <ArrowLeft size={16} /> Kembali ke Daftar
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">Review Donasi</h1>
        <p className="text-sm text-gray-500 mt-1">
          ID: <span className="font-mono">{donation.id.slice(0, 8)}...</span>
        </p>
      </div>

      {/* Status banner */}
      {isVerified && (
        <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3">
          <CheckCircle2 size={20} className="text-emerald-600" />
          <div>
            <p className="text-sm font-bold text-emerald-900">Sudah Terverifikasi</p>
            <p className="text-xs text-emerald-700">
              Diverifikasi pada {formatFullDate(donation.verified_at!)}
            </p>
          </div>
        </div>
      )}

      {isRejected && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <XCircle size={20} className="text-red-600" />
            <p className="text-sm font-bold text-red-900">Di-reject</p>
          </div>
          {donation.rejection_reason && (
            <p className="text-xs text-red-700 mt-2 pl-8">
              <strong>Alasan:</strong> {donation.rejection_reason}
            </p>
          )}
        </div>
      )}

      {/* Success toast */}
      {actionSuccess && (
        <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3">
          <CheckCircle2 size={20} className="text-emerald-600" />
          <p className="text-sm font-bold text-emerald-900">{actionSuccess}</p>
        </div>
      )}

      {/* Campaign info */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
        <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Campaign</p>
        <Link
          href={`/fundraising/${donation.campaigns.slug}`}
          target="_blank"
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          {donation.campaigns.cover_image_url && (
            <img
              src={donation.campaigns.cover_image_url}
              alt=""
              className="w-14 h-14 rounded-xl object-cover shrink-0"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-gray-900 truncate">{donation.campaigns.title}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Terkumpul {formatRupiah(donation.campaigns.collected_amount)} / {formatRupiah(donation.campaigns.target_amount)}
            </p>
          </div>
          <ExternalLink size={14} className="text-gray-400 shrink-0" />
        </Link>
      </div>

      {/* Donor info */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
        <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">Donor</p>
        <div className="space-y-2.5">
          <div className="flex items-center gap-3">
            <UserRound size={16} className="text-gray-400" />
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900">{donation.donor_name}</p>
              {donation.is_anonymous && (
                <p className="text-[10px] font-bold text-gray-500 bg-gray-100 inline-block px-2 py-0.5 rounded mt-0.5">
                  ANONIM (nama asli disembunyikan publik)
                </p>
              )}
            </div>
          </div>
          {donation.donor_phone && (
            <div className="flex items-center gap-3">
              <Phone size={16} className="text-gray-400" />
              <div>
                <p className="text-sm font-mono text-gray-700">{donation.donor_phone}</p>
                <p className="text-[10px] text-gray-400">Publik hanya lihat: {maskPhone(donation.donor_phone)}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Calendar size={16} className="text-gray-400" />
            <p className="text-sm text-gray-700">{formatFullDate(donation.created_at)}</p>
          </div>
        </div>
      </div>

      {/* Amount breakdown */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Calculator size={16} className="text-[#003526]" />
          <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Rincian Transfer</p>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Donasi</span>
            <span className="font-bold text-gray-900">{formatRupiah(donation.amount)}</span>
          </div>
          {donation.operational_fee > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Biaya operasional</span>
              <span className="font-bold text-[#BA7517]">{formatRupiah(donation.operational_fee)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600 flex items-center gap-1.5">
              <Hash size={11} /> Kode unik
            </span>
            <span className="font-bold font-mono text-[#EC4899]">{donation.donation_code}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-gray-100">
            <span className="text-sm font-bold text-gray-900">TOTAL TRANSFER</span>
            <span className="text-base font-extrabold text-[#003526]">
              {formatRupiah(donation.total_transfer)}
            </span>
          </div>
        </div>
        <div className="mt-3 rounded-lg bg-amber-50 border border-amber-100 p-3">
          <p className="text-[11px] text-amber-800 leading-relaxed">
            💡 <strong>Verifikasi:</strong> nominal yang masuk ke rekening <strong>{donation.campaigns.bank_name} · {donation.campaigns.bank_account_number}</strong> harus <strong>PERSIS {formatRupiah(donation.total_transfer)}</strong>. Kalau beda → reject.
          </p>
        </div>
      </div>

      {/* Message */}
      {donation.message && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle size={16} className="text-[#EC4899]" />
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Doa / Harapan</p>
          </div>
          <p className="text-sm text-gray-700 italic leading-relaxed bg-pink-50/40 rounded-xl p-3 border border-pink-100">
            &ldquo;{donation.message}&rdquo;
          </p>
        </div>
      )}

      {/* Bukti transfer */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <ImageIcon size={16} className="text-[#003526]" />
          <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Bukti Transfer</p>
        </div>
        {donation.transfer_proof_url ? (
          <a
            href={donation.transfer_proof_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-xl overflow-hidden bg-gray-100 border border-gray-200 hover:border-gray-300 transition-colors"
          >
            <img
              src={donation.transfer_proof_url}
              alt="Bukti transfer"
              className="w-full max-h-[500px] object-contain bg-gray-50"
            />
            <div className="py-2 text-center bg-gray-50 border-t border-gray-200">
              <p className="text-xs text-gray-600 font-semibold inline-flex items-center gap-1">
                <ExternalLink size={11} /> Klik untuk ukuran penuh
              </p>
            </div>
          </a>
        ) : (
          <div className="py-8 text-center bg-gray-50 rounded-xl">
            <AlertCircle size={24} className="text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Bukti transfer belum di-upload</p>
          </div>
        )}
      </div>

      {/* Action error */}
      {actionError && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 flex items-start gap-2">
          <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-700">{actionError}</p>
        </div>
      )}

      {/* Action buttons (only if pending) */}
      {isPending && !actionSuccess && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg p-4">
          <div className="max-w-3xl mx-auto flex gap-3">
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-white border-2 border-red-200 text-red-600 text-sm font-bold hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <XCircle size={18} />
              Reject
            </button>
            <button
              onClick={() => handleAction('verify')}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-sm font-bold shadow-md hover:shadow-lg hover:opacity-95 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <ShieldCheck size={18} />
                  Verify Donasi
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !submitting && setShowRejectModal(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center">
                <XCircle size={22} className="text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Reject Donasi</h3>
            </div>

            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
              Alasan akan dikirim ke donor. Pastikan jelas agar donor bisa memperbaiki.
            </p>

            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Contoh: Nominal transfer Rp 50.000 tidak sesuai dengan yang dikonfirmasi (Rp 50.036). Mohon transfer ulang dengan nominal persis."
              rows={4}
              maxLength={500}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-red-400 resize-none"
            />
            <p className="text-right text-xs text-gray-400 mt-1">{rejectReason.length}/500</p>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowRejectModal(false)}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl bg-gray-100 text-sm font-semibold text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={() => handleAction('reject')}
                disabled={submitting || !rejectReason.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  'Kirim Reject'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
