'use client';

/**
 * DonationRejectModal
 * 
 * Penggalang reject donasi dengan 5 reason standar.
 * 'other' wajib notes minimal 10 karakter (audit trail).
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://teraloka-api.vercel.app/api/v1';

type RejectReason =
  | 'amount_mismatch'
  | 'transfer_not_received'
  | 'duplicate_donation'
  | 'wrong_recipient'
  | 'other';

interface Props {
  donationId: string;
  donorName: string;
  isAnonymous: boolean;
  totalTransfer: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const REJECT_OPTIONS: Array<{ value: RejectReason; label: string; desc: string }> = [
  {
    value: 'transfer_not_received',
    label: 'Tidak Ada Uang Masuk',
    desc: 'Tidak ditemukan transfer di mutasi rekening yang cocok dengan kode unik ini.',
  },
  {
    value: 'amount_mismatch',
    label: 'Nominal Sangat Tidak Cocok',
    desc: 'Ada uang masuk tapi nominalnya jauh berbeda dan tidak bisa dipertanggungjawabkan.',
  },
  {
    value: 'duplicate_donation',
    label: 'Duplikat Donasi',
    desc: 'Donor sudah pernah donasi ini sebelumnya, ini entry double-input.',
  },
  {
    value: 'wrong_recipient',
    label: 'Salah Rekening Tujuan',
    desc: 'Donor transfer ke rekening lain (bukan rekening kampanye ini).',
  },
  {
    value: 'other',
    label: 'Alasan Lain',
    desc: 'Alasan di luar daftar — wajib jelaskan di catatan minimal 10 karakter.',
  },
];

export default function DonationRejectModal({
  donationId,
  donorName,
  isAnonymous,
  totalTransfer,
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  const { token } = useAuth();
  const [reason, setReason] = useState<RejectReason | ''>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setNotes('');
      setSubmitting(false);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const displayDonorName = isAnonymous ? 'Hamba Allah' : donorName;
  const isOtherReason = reason === 'other';
  const isNotesValid = !isOtherReason || notes.trim().length >= 10;
  const canSubmit = reason !== '' && isNotesValid;

  async function handleSubmit() {
    if (!canSubmit) {
      if (isOtherReason && notes.trim().length < 10) {
        setError("Untuk alasan 'lain', catatan wajib minimal 10 karakter");
      } else {
        setError('Pilih alasan terlebih dahulu');
      }
      return;
    }

    const ok = window.confirm(
      `Yakin reject donasi dari ${displayDonorName}?\n\n` +
      `Alasan: ${REJECT_OPTIONS.find((o) => o.value === reason)?.label}\n\n` +
      `Aksi ini tercatat di audit trail dan tidak bisa di-undo. Hanya admin yang bisa override.`
    );
    if (!ok) return;

    setSubmitting(true);
    setError(null);

    try {
      const body: Record<string, unknown> = { reason };
      if (notes.trim()) body.notes = notes.trim();

      const res = await fetch(`${API_URL}/funding/my/donations/${donationId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'Gagal menolak donasi');

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan');
      setSubmitting(false);
    }
  }

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
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl bg-red-600 px-6 py-4 text-white">
          <div>
            <h2 className="text-lg font-bold">Reject Donasi</h2>
            <p className="text-xs opacity-80">Tandai donasi tidak diterima / tidak valid</p>
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
        <div className="p-6 space-y-4">
          {/* Donation Info */}
          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-xs text-gray-500">Donatur</p>
            <p className="font-semibold text-gray-900">
              {displayDonorName}
              {isAnonymous && (
                <span className="ml-2 inline-block rounded bg-gray-200 px-2 py-0.5 text-xs font-normal text-gray-700">
                  Anonim
                </span>
              )}
            </p>
            <p className="text-xs text-gray-500 mt-2">Nominal Target Transfer</p>
            <p className="font-semibold text-gray-900">Rp {formatRp(totalTransfer)}</p>
          </div>

          {/* Warning */}
          <div className="rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-sm font-medium text-red-900">⚠️ Perhatian</p>
            <p className="text-xs text-red-800 mt-1">
              Aksi reject akan menandai donasi ini <b>tidak diterima</b>. Donor mungkin akan
              di-notify. Aksi ini tercatat permanent di audit trail. Hanya admin yang bisa override.
            </p>
          </div>

          {/* Reason Options */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Alasan Reject *</p>
            {REJECT_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex gap-3 rounded-lg border-2 p-3 cursor-pointer transition ${reason === opt.value
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-gray-400'
                  }`}
              >
                <input
                  type="radio"
                  name="reject_reason"
                  value={opt.value}
                  checked={reason === opt.value}
                  onChange={() => setReason(opt.value)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-sm">{opt.label}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>

          {/* Notes */}
          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              Catatan {isOtherReason ? '(wajib min. 10 karakter)' : '(opsional)'}
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                isOtherReason
                  ? 'Jelaskan alasan reject...'
                  : 'Detail tambahan untuk audit trail...'
              }
              rows={3}
              className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:ring-1 focus:outline-none resize-none ${isOtherReason && notes.trim().length > 0 && notes.trim().length < 10
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-red-500 focus:ring-red-500'
                }`}
            />
            {isOtherReason && (
              <p
                className={`text-xs mt-1 ${notes.trim().length >= 10 ? 'text-green-600' : 'text-gray-500'
                  }`}
              >
                {notes.trim().length}/10 karakter minimum
              </p>
            )}
          </label>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={submitting}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {submitting ? 'Memproses...' : 'Reject Donasi'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatRp(num: number): string {
  return new Intl.NumberFormat('id-ID').format(num);
}
