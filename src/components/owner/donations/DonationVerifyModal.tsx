'use client';

/**
 * DonationVerifyModal
 * 
 * Smart verify flow untuk penggalang BADONASI:
 * 1. Penggalang lihat target transfer (nominal + kode unik)
 * 2. Input nominal aktual yang diterima
 * 3. Smart detection:
 *    - Exact match → langsung verified (1 klik)
 *    - Mismatch → prompt pilih decision (5 opsi state machine)
 * 4. Optional: upload bukti rekening koran sebagai counter-proof
 * 
 * Filosofi: transparency-first. Setiap decision tracked di audit trail.
 * Backend (Otak) compute discrepancy, modal cuma display + collect input.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://teraloka-api.vercel.app/api/v1';

type DiscrepancyDecision =
  | 'accepted_partial'
  | 'accepted_excess'
  | 'awaiting_topup'
  | 'refund_pending';

export interface DonationForVerify {
  id: string;
  donor_name: string;
  is_anonymous: boolean;
  amount: number;
  operational_fee: number;
  total_transfer: number;
  donation_code: string;
  message?: string | null;
  transfer_proof_url?: string | null;
  created_at: string;
  campaign_title?: string | null;
}

interface Props {
  donation: DonationForVerify;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DonationVerifyModal({ donation, isOpen, onClose, onSuccess }: Props) {
  const { token } = useAuth();
  const [amountReceived, setAmountReceived] = useState<string>('');
  const [decision, setDecision] = useState<DiscrepancyDecision | ''>('');
  const [notes, setNotes] = useState<string>('');
  const [showLightbox, setShowLightbox] = useState(false);

  const [step, setStep] = useState<'input' | 'decision' | 'confirm'>('input');
  const [discrepancy, setDiscrepancy] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state ketika modal dibuka
  useEffect(() => {
    if (isOpen) {
      setAmountReceived('');
      setDecision('');
      setNotes('');
      setStep('input');
      setDiscrepancy(0);
      setSubmitting(false);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const expectedAmount = Number(donation.total_transfer);
  const receivedNum = Number(amountReceived);
  const isValidAmount = amountReceived !== '' && Number.isFinite(receivedNum) && receivedNum >= 0;

  const computedDiscrepancy = isValidAmount ? receivedNum - expectedAmount : 0;
  const isExactMatch = isValidAmount && computedDiscrepancy === 0;
  const isUnderpaid = computedDiscrepancy < 0;
  const isOverpaid = computedDiscrepancy > 0;

  // Display donor name (anonymous-aware)
  const displayDonorName = donation.is_anonymous ? 'Hamba Allah' : donation.donor_name;

  // Submit handler
  async function handleSubmit() {
    if (!isValidAmount) {
      setError('Nominal diterima harus diisi dengan angka valid');
      return;
    }
    if (!isExactMatch && !decision) {
      setError('Pilih keputusan untuk selisih nominal');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        amount_received: receivedNum,
      };
      if (!isExactMatch) {
        body.decision = decision;
      }
      if (notes.trim()) {
        body.notes = notes.trim();
      }

      const res = await fetch(`${API_URL}/funding/my/donations/${donation.id}/confirm`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        // Smart: if backend returns DECISION_REQUIRED, move to decision step
        if (data?.error?.code === 'DECISION_REQUIRED') {
          setDiscrepancy(data.error.discrepancy ?? computedDiscrepancy);
          setStep('decision');
          setSubmitting(false);
          return;
        }
        throw new Error(data?.error?.message || 'Gagal memverifikasi donasi');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan');
      setSubmitting(false);
    }
  }

  function handleNext() {
    if (!isValidAmount) {
      setError('Nominal diterima harus diisi dengan angka valid');
      return;
    }
    setError(null);
    if (isExactMatch) {
      setStep('confirm');
    } else {
      setStep('decision');
    }
  }

  // Decision options
  const decisionOptions: Array<{ value: DiscrepancyDecision; label: string; desc: string; show: boolean }> = [
    {
      value: 'accepted_partial',
      label: 'Terima Apa Adanya (Kurang)',
      desc: `Donor kurang transfer Rp ${formatRp(Math.abs(computedDiscrepancy))}, tetap diterima sebagai donasi penuh.`,
      show: isUnderpaid,
    },
    {
      value: 'awaiting_topup',
      label: 'Tunggu Top-up dari Donor',
      desc: 'Hubungi donor untuk top-up selisihnya. Donasi akan masuk status under_audit.',
      show: isUnderpaid,
    },
    {
      value: 'accepted_excess',
      label: 'Terima Bonus (Lebih)',
      desc: `Donor transfer lebih Rp ${formatRp(Math.abs(computedDiscrepancy))}, terima sebagai bonus donasi.`,
      show: isOverpaid,
    },
    {
      value: 'refund_pending',
      label: 'Akan Kembalikan Selisih',
      desc: `Refund Rp ${formatRp(Math.abs(computedDiscrepancy))} ke donor. Donasi tetap masuk sesuai amount asli.`,
      show: isOverpaid,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl px-6 py-4 text-white"
          style={{ backgroundColor: '#003526' }}
        >
          <div>
            <h2 className="text-lg font-bold">Verifikasi Donasi</h2>
            <p className="text-xs opacity-80">Konfirmasi penerimaan dana di rekening</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:bg-white/10"
            aria-label="Tutup"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Donation Info Card */}
          <div className="rounded-xl bg-gray-50 p-4 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">Donatur</p>
                <p className="font-semibold text-gray-900 truncate">
                  {displayDonorName}
                  {donation.is_anonymous && (
                    <span className="ml-2 inline-block rounded bg-gray-200 px-2 py-0.5 text-xs font-normal text-gray-700">
                      Anonim
                    </span>
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Kode Unik</p>
                <p className="font-mono font-semibold text-gray-900">{donation.donation_code}</p>
              </div>
            </div>
            {donation.campaign_title && (
              <div className="pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-500">Kampanye</p>
                <p className="text-sm text-gray-700 truncate">{donation.campaign_title}</p>
              </div>
            )}
            {donation.message && (
              <div className="pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-500">Pesan Donatur</p>
                <p className="text-sm text-gray-700 italic">&ldquo;{donation.message}&rdquo;</p>
              </div>
            )}
          </div>

          {/* Target Transfer Box */}
          <div
            className="rounded-xl border-2 p-4 space-y-1"
            style={{ borderColor: '#003526', backgroundColor: '#f0f9f4' }}
          >
            <p className="text-xs font-medium" style={{ color: '#003526' }}>
              💰 NOMINAL YANG HARUS DITERIMA
            </p>
            <p className="text-3xl font-bold" style={{ color: '#003526' }}>
              Rp {formatRp(donation.total_transfer)}
            </p>
            <p className="text-xs text-gray-600">
              Donasi Rp {formatRp(donation.amount)} + Fee Rp {formatRp(donation.operational_fee)} − 500 + kode {donation.donation_code}
            </p>
          </div>

          {/* Bukti Transfer */}
          {donation.transfer_proof_url && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Bukti Transfer dari Donor</p>
              <button
                onClick={() => setShowLightbox(true)}
                className="block w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-100 hover:border-gray-400 transition"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={donation.transfer_proof_url}
                  alt="Bukti transfer dari donor"
                  className="w-full max-h-[280px] object-contain"
                />
                <div className="bg-gray-100 px-3 py-2 text-xs text-gray-600 text-left">
                  📷 Tap untuk perbesar
                </div>
              </button>
              <a
                href={donation.transfer_proof_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-pink-600 hover:underline"
              >
                Buka di tab baru →
              </a>
            </div>
          )}
          {!donation.transfer_proof_url && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
              <p className="text-xs text-amber-800">
                ⚠️ Donor belum upload bukti transfer. Verifikasi tetap bisa dilakukan berdasarkan mutasi rekening Anda.
              </p>
            </div>
          )}

          {/* Step: Input Amount Received */}
          {step === 'input' && (
            <div className="space-y-3 pt-2 border-t border-gray-200">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  Nominal Aktual yang Diterima di Rekening *
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  placeholder="Contoh: 51100"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-pink-500 focus:ring-1 focus:ring-pink-500 focus:outline-none"
                  autoFocus
                />
              </label>

              {/* Real-time discrepancy preview */}
              {isValidAmount && (
                <div
                  className={`rounded-lg p-3 text-sm ${isExactMatch
                      ? 'bg-green-50 border border-green-200 text-green-800'
                      : 'bg-amber-50 border border-amber-200 text-amber-800'
                    }`}
                >
                  {isExactMatch ? (
                    <p>✅ <b>Nominal cocok persis.</b> Donasi siap diverifikasi.</p>
                  ) : (
                    <p>
                      ⚠️ <b>Selisih: {computedDiscrepancy > 0 ? '+' : ''}Rp {formatRp(Math.abs(computedDiscrepancy))}</b>
                      {' '}({isUnderpaid ? 'donor kurang transfer' : 'donor lebih transfer'}).
                      Pilih keputusan di langkah berikutnya.
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={onClose}
                  disabled={submitting}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleNext}
                  disabled={!isValidAmount || submitting}
                  className="flex-1 rounded-lg px-4 py-2.5 font-medium text-white disabled:opacity-50"
                  style={{ backgroundColor: '#003526' }}
                >
                  Lanjut →
                </button>
              </div>
            </div>
          )}

          {/* Step: Decision (when mismatch) */}
          {step === 'decision' && (
            <div className="space-y-3 pt-2 border-t border-gray-200">
              <div className="rounded-lg bg-amber-50 border border-amber-300 p-3">
                <p className="text-sm font-medium text-amber-900">
                  Selisih: {computedDiscrepancy > 0 ? '+' : ''}Rp {formatRp(Math.abs(computedDiscrepancy))}
                </p>
                <p className="text-xs text-amber-800 mt-1">
                  Pilih bagaimana Anda menangani selisih ini. Keputusan tercatat di audit trail.
                </p>
              </div>

              <div className="space-y-2">
                {decisionOptions.filter((opt) => opt.show).map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex gap-3 rounded-lg border-2 p-3 cursor-pointer transition ${decision === opt.value
                        ? 'border-pink-500 bg-pink-50'
                        : 'border-gray-200 hover:border-gray-400'
                      }`}
                  >
                    <input
                      type="radio"
                      name="decision"
                      value={opt.value}
                      checked={decision === opt.value}
                      onChange={() => setDecision(opt.value)}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{opt.label}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  Catatan (opsional)
                </span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Catatan tambahan untuk audit trail..."
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:ring-1 focus:ring-pink-500 focus:outline-none resize-none"
                />
              </label>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep('input')}
                  disabled={submitting}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  ← Kembali
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!decision || submitting}
                  className="flex-1 rounded-lg px-4 py-2.5 font-medium text-white disabled:opacity-50"
                  style={{ backgroundColor: '#EC4899' }}
                >
                  {submitting ? 'Memproses...' : 'Verifikasi'}
                </button>
              </div>
            </div>
          )}

          {/* Step: Final Confirm (exact match) */}
          {step === 'confirm' && (
            <div className="space-y-3 pt-2 border-t border-gray-200">
              <div className="rounded-lg bg-green-50 border border-green-300 p-4">
                <p className="font-medium text-green-900">✅ Konfirmasi Verifikasi</p>
                <p className="text-sm text-green-800 mt-1">
                  Anda akan menandai donasi <b>Rp {formatRp(receivedNum)}</b> dari{' '}
                  <b>{displayDonorName}</b> sebagai diterima dan terverifikasi.
                </p>
              </div>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  Catatan (opsional)
                </span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Misal: dana sudah masuk rekening pukul 14:00..."
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-pink-500 focus:ring-1 focus:ring-pink-500 focus:outline-none resize-none"
                />
              </label>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep('input')}
                  disabled={submitting}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  ← Kembali
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 rounded-lg px-4 py-2.5 font-medium text-white disabled:opacity-50"
                  style={{ backgroundColor: '#003526' }}
                >
                  {submitting ? 'Memproses...' : 'Konfirmasi Diterima'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox for transfer proof */}
      {showLightbox && donation.transfer_proof_url && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setShowLightbox(false)}
        >
          <button
            onClick={() => setShowLightbox(false)}
            className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Tutup"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={donation.transfer_proof_url}
            alt="Bukti transfer (zoom)"
            className="max-w-full max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

function formatRp(num: number): string {
  return new Intl.NumberFormat('id-ID').format(num);
}
