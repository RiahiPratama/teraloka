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
  ExternalLink, ShieldCheck, Calculator, TrendingDown, TrendingUp,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';
const ADMIN_ROLES = ['admin_funding', 'super_admin'];

// ─── Helpers ─────────────────────────────────────────────────────

function formatRupiahInput(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  return digits ? Number(digits).toLocaleString('id-ID') : '';
}

function parseRupiah(formatted: string): number {
  return Number(formatted.replace(/\D/g, '')) || 0;
}

// ─── Types ───────────────────────────────────────────────────────

interface DonationDetail {
  id: string;
  donor_name: string;
  donor_phone: string | null;
  is_anonymous: boolean;
  amount: number;
  operational_fee: number;
  penggalang_fee?: number;
  total_transfer: number;
  donation_code: string;
  message: string | null;
  transfer_proof_url: string | null;
  verification_status: string;
  rejection_reason: string | null;
  verified_at: string | null;
  verified_by: string | null;
  escalated_to_admin_at: string | null;
  escalation_reason: string | null;
  // ⭐ Discrepancy tracking
  amount_received: number | null;
  discrepancy_amount: number | null;
  // FIX-G-C: Verifier info
  verifier?: {
    id: string;
    name: string | null;
    role: string;
  } | null;
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

// ─── Main Page ───────────────────────────────────────────────────

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

  // ⭐ Discrepancy: nominal yang masuk ke rekening (input admin)
  const [amountReceived, setAmountReceived] = useState('');

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
          // Pre-fill kalau sudah pernah diisi sebelumnya
          if (json.data.amount_received) {
            setAmountReceived(Number(json.data.amount_received).toLocaleString('id-ID'));
          }
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

    const amountReceivedNum = parseRupiah(amountReceived);

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
          // ⭐ Kirim amount_received kalau ada
          amount_received: amountReceivedNum > 0 ? amountReceivedNum : undefined,
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

  if (!user || !ADMIN_ROLES.includes(user.role)) return null;

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

  // ⭐ Discrepancy calculation
  const amountReceivedNum = parseRupiah(amountReceived);
  const hasAmountInput = amountReceivedNum > 0;
  const discrepancy = hasAmountInput ? amountReceivedNum - donation.total_transfer : 0;
  const isUnderPaid = discrepancy < 0;
  const isOverPaid = discrepancy > 0;
  const isExact = discrepancy === 0 && hasAmountInput;

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

      {/* Escalation banner */}
      {donation.escalated_to_admin_at && (
        <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 p-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xl">⚡</span>
            <p className="text-sm font-bold text-amber-900">Auto-Escalated ke Admin</p>
          </div>
          {donation.escalation_reason && (
            <p className="text-xs text-amber-800 pl-8 leading-relaxed">
              <strong>Alasan:</strong> {donation.escalation_reason}
            </p>
          )}
          <p className="text-[10px] text-amber-700 pl-8 mt-1">
            Di-escalate {formatFullDate(donation.escalated_to_admin_at)}
          </p>
        </div>
      )}

      {/* Status banner */}
      {isVerified && (
        <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <p className="text-sm font-bold text-emerald-900">Sudah Terverifikasi</p>
                {donation.verifier && <RoleBadge role={donation.verifier.role} />}
              </div>
              <p className="text-xs text-emerald-700">
                Diverifikasi pada {formatFullDate(donation.verified_at!)}
              </p>
              {donation.verifier && (
                <p className="text-xs text-emerald-700 mt-0.5">
                  oleh <strong>{donation.verifier.name || 'Admin'}</strong>
                </p>
              )}
              {/* Show recorded discrepancy if any */}
              {donation.amount_received && (
                <div className="mt-2 pt-2 border-t border-emerald-200">
                  <p className="text-xs text-emerald-700">
                    Nominal diterima: <strong>{formatRupiah(donation.amount_received)}</strong>
                    {donation.discrepancy_amount !== null && donation.discrepancy_amount !== 0 && (
                      <span className={`ml-2 font-bold ${donation.discrepancy_amount < 0 ? 'text-red-600' : 'text-amber-600'}`}>
                        ({donation.discrepancy_amount > 0 ? '+' : ''}{formatRupiah(donation.discrepancy_amount)})
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isRejected && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-4">
          <div className="flex items-start gap-3">
            <XCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <p className="text-sm font-bold text-red-900">Di-reject</p>
                {donation.verifier && <RoleBadge role={donation.verifier.role} />}
              </div>
              {donation.verifier && (
                <p className="text-xs text-red-700 mb-1">
                  oleh <strong>{donation.verifier.name || 'Admin'}</strong>
                  {donation.verified_at && ` · ${formatFullDate(donation.verified_at)}`}
                </p>
              )}
              {donation.rejection_reason && (
                <p className="text-xs text-red-700 mt-1">
                  <strong>Alasan:</strong> {donation.rejection_reason}
                </p>
              )}
            </div>
          </div>
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
          href={`/fundraising/${donation.campaigns?.slug ?? ''}`}
          target="_blank"
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          {donation.campaigns?.cover_image_url && (
            <img src={donation.campaigns?.cover_image_url} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-gray-900 truncate">{donation.campaigns?.title}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Terkumpul {formatRupiah(donation.campaigns?.collected_amount ?? 0)} / {formatRupiah(donation.campaigns?.target_amount ?? 0)}
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
          {(donation.penggalang_fee ?? 0) > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Fee Penggalang</span>
              <span className="font-bold text-[#EC4899]">{formatRupiah(donation.penggalang_fee!)}</span>
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
            💡 <strong>Verifikasi:</strong> nominal yang masuk ke rekening <strong>{donation.campaigns?.bank_name} · {donation.campaigns?.bank_account_number}</strong> harus <strong>PERSIS {formatRupiah(donation.total_transfer)}</strong>. Kalau beda → input nominal aktual di bawah.
          </p>
        </div>
      </div>

      {/* ⭐ Discrepancy Input + Analysis */}
      {isPending && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Calculator size={16} className="text-[#003526]" />
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
              Nominal Diterima di Rekening
            </p>
            <span className="ml-auto text-[10px] text-gray-400 font-medium">
              Opsional — tapi sangat dianjurkan
            </span>
          </div>

          <div className="relative mb-3">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">Rp</span>
            <input
              type="text"
              inputMode="numeric"
              value={amountReceived}
              onChange={e => setAmountReceived(formatRupiahInput(e.target.value))}
              placeholder={donation.total_transfer.toLocaleString('id-ID')}
              className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 text-sm font-mono focus:border-[#003526] focus:outline-none focus:ring-2 focus:ring-[#003526]/20"
            />
          </div>

          {/* Analysis card */}
          {isExact && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center gap-2.5">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <div>
                <p className="text-sm font-bold text-emerald-800">SESUAI PERSIS ✅</p>
                <p className="text-xs text-emerald-600">Nominal transfer cocok. Aman untuk di-verify.</p>
              </div>
            </div>
          )}

          {isUnderPaid && (
            <div className="rounded-xl bg-red-50 border-2 border-red-300 px-4 py-3">
              <div className="flex items-start gap-2.5">
                <TrendingDown size={16} className="text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-red-800">⚠️ KURANG BAYAR</p>
                  <p className="text-xs text-red-700 mt-0.5 leading-relaxed">
                    Nominal masuk <strong>{formatRupiah(amountReceivedNum)}</strong> — kurang{' '}
                    <strong>{formatRupiah(Math.abs(discrepancy))}</strong> dari yang seharusnya ({formatRupiah(donation.total_transfer)}).
                  </p>
                  <p className="text-xs font-bold text-red-700 mt-1.5">
                    → Disarankan REJECT. Minta donor transfer ulang dengan nominal persis.
                  </p>
                </div>
              </div>
            </div>
          )}

          {isOverPaid && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
              <div className="flex items-start gap-2.5">
                <TrendingUp size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-800">⚠️ LEBIH BAYAR</p>
                  <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                    Nominal masuk <strong>{formatRupiah(amountReceivedNum)}</strong> — lebih{' '}
                    <strong>{formatRupiah(discrepancy)}</strong> dari yang seharusnya. Kelebihan dicatat otomatis.
                  </p>
                  <p className="text-xs text-amber-600 mt-1.5 font-semibold">
                    → Bisa di-verify. Selisih lebih tersimpan untuk transparansi.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!hasAmountInput && (
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Input nominal dari mutasi rekening untuk verifikasi selisih otomatis. Kosongkan jika tidak mau input.
            </p>
          )}
        </div>
      )}

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
          <a href={donation.transfer_proof_url} target="_blank" rel="noopener noreferrer"
            className="block rounded-xl overflow-hidden bg-gray-100 border border-gray-200 hover:border-gray-300 transition-colors">
            <img src={donation.transfer_proof_url} alt="Bukti transfer"
              className="w-full max-h-[500px] object-contain bg-gray-50" />
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

      {/* ⭐ Action bar — sticky bottom dengan discrepancy warning */}
      {isPending && !actionSuccess && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg">
          {/* Discrepancy warning strip di atas tombol */}
          {isUnderPaid && (
            <div className="bg-red-600 px-4 py-2 flex items-center gap-2">
              <TrendingDown size={13} className="text-white shrink-0" />
              <p className="text-xs font-bold text-white">
                KURANG BAYAR {formatRupiah(Math.abs(discrepancy))} — Disarankan REJECT
              </p>
            </div>
          )}
          {isOverPaid && (
            <div className="bg-amber-500 px-4 py-2 flex items-center gap-2">
              <TrendingUp size={13} className="text-white shrink-0" />
              <p className="text-xs font-bold text-white">
                LEBIH BAYAR {formatRupiah(discrepancy)} — Bisa di-verify, selisih tercatat
              </p>
            </div>
          )}
          {isExact && (
            <div className="bg-emerald-600 px-4 py-2 flex items-center gap-2">
              <CheckCircle2 size={13} className="text-white shrink-0" />
              <p className="text-xs font-bold text-white">SESUAI PERSIS — Aman untuk di-verify</p>
            </div>
          )}

          <div className="p-4 max-w-3xl mx-auto flex gap-3">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => !submitting && setShowRejectModal(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center">
                <XCircle size={22} className="text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Reject Donasi</h3>
            </div>

            {/* Show discrepancy context in reject modal */}
            {isUnderPaid && (
              <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                <p className="text-xs font-bold text-red-700">
                  Kurang bayar {formatRupiah(Math.abs(discrepancy))} — cantumkan di alasan reject di bawah.
                </p>
              </div>
            )}

            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
              Alasan akan dikirim ke donor. Pastikan jelas agar donor bisa memperbaiki.
            </p>

            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder={isUnderPaid
                ? `Nominal transfer Rp ${amountReceivedNum.toLocaleString('id-ID')} tidak sesuai (seharusnya Rp ${donation.total_transfer.toLocaleString('id-ID')}). Mohon transfer ulang dengan nominal persis termasuk kode unik.`
                : 'Contoh: Nominal transfer tidak sesuai. Mohon transfer ulang dengan nominal persis.'}
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
                {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Kirim Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── RoleBadge ───────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const meta = (() => {
    switch (role) {
      case 'super_admin':    return { label: 'Super Admin',     color: '#7C3AED', bg: '#F3E8FF', icon: '⭐' };
      case 'admin_funding':  return { label: 'Admin BADONASI',  color: '#047857', bg: '#D1FAE5', icon: '🛡️' };
      case 'admin_content':  return { label: 'Admin Konten',    color: '#1D4ED8', bg: '#DBEAFE', icon: '📝' };
      case 'user':           return { label: 'Penggalang',      color: '#4B5563', bg: '#F3F4F6', icon: '👤' };
      default:               return { label: role,              color: '#4B5563', bg: '#F3F4F6', icon: '🔹' };
    }
  })();
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      style={{ background: meta.bg, color: meta.color }}>
      <span style={{ fontSize: 9 }}>{meta.icon}</span>
      {meta.label}
    </span>
  );
}
