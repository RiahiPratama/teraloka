'use client';

/**
 * /owner/financial/fee-remittance/new — Form Submit Setoran Fee
 *
 * Form 1-step: amount + bukti transfer + reference code + notes.
 * Backend validate amount (5% rounding tolerance), prevent double-submit
 * kalau ada active submission.
 *
 * Filosofi 4 Pilar:
 *  - Credibility: pre-fill amount dari saldo, tooltip toleransi rounding
 *  - Transparency: nilai pending visible saat input, peringatan jika partial
 *  - Accountability: bukti transfer mandatory, mengajak owner upload langsung dari HP
 *  - Comfort: ImageUpload v2 (camera + galeri + PDF), single CTA "Submit"
 *
 * Architecture: Backend (Otak) compute, frontend (Wajah) display only.
 */

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';
import ImageUpload from '@/components/ui/ImageUpload';
import {
  ArrowLeft, Wallet, Loader2, CheckCircle2, AlertCircle, Info,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

interface PendingFeeData {
  total_fee_pending: number;
  pending_donations_count: number;
  active_submission: { id: string } | null;
}

// ── Helpers ────────────────────────────────────────────────────

function rp(n: number) {
  return 'Rp ' + Number(n || 0).toLocaleString('id-ID');
}

// ════════════════════════════════════════════════════════════════
// PAGE WRAPPER
// ════════════════════════════════════════════════════════════════

export default function NewFeeRemittancePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <NewFeeRemittanceContent />
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

function NewFeeRemittanceContent() {
  const { user, token, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [pending, setPending] = useState<PendingFeeData | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [amount, setAmount] = useState('');
  const [referenceCode, setReferenceCode] = useState('');
  const [notes, setNotes] = useState('');
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // ── Load pending data + redirect kalau ada active submission ──
  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/funding/my/fee-remittances/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();

      if (!json.success) {
        throw new Error(json?.error?.message || 'Gagal memuat data');
      }

      setPending(json.data);

      // Redirect kalau udah ada active submission
      if (json.data.active_submission) {
        toast.warning('Anda sudah punya setoran yang sedang direview');
        router.replace(`/owner/financial/fee-remittance/${json.data.active_submission.id}`);
        return;
      }

      // Redirect kalau gak ada saldo
      if (json.data.total_fee_pending <= 0) {
        toast.warning('Tidak ada fee yang perlu disetor saat ini');
        router.replace('/owner/financial/fee-remittance');
        return;
      }

      // Pre-fill amount dengan total saldo (owner bisa edit)
      setAmount(String(Math.round(json.data.total_fee_pending)));
    } catch (err: any) {
      console.error('[NewFeeRemittance] Load error:', err);
      toast.error('Gagal memuat data saldo');
    } finally {
      setLoading(false);
    }
  }, [token, router, toast]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login?redirect=/owner/financial/fee-remittance/new');
      return;
    }
    loadData();
  }, [authLoading, user, router, loadData]);

  // ── Handlers ───────────────────────────────────────────────────

  const handleEvidenceUpload = useCallback((urls: string[]) => {
    setEvidenceUrls(urls);
  }, []);

  const handleSubmit = useCallback(async () => {
    const amountNum = Number(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      toast.error('Jumlah setoran tidak valid');
      return;
    }
    if (evidenceUrls.length === 0) {
      toast.error('Bukti transfer wajib diupload');
      return;
    }

    const totalPending = pending?.total_fee_pending ?? 0;
    const maxAllowed = totalPending * 1.05;
    if (amountNum > maxAllowed) {
      toast.error(`Setoran melebihi yang perlu disetor. Maksimal ${rp(Math.floor(maxAllowed))}.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/funding/my/fee-remittances`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: amountNum,
          evidence_url: evidenceUrls[0],
          reference_code: referenceCode.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || 'Gagal submit setoran');
      }

      toast.success('Setoran berhasil dikirim! Tunggu verifikasi admin.');
      router.push(`/owner/financial/fee-remittance/${json.data.id}`);
    } catch (err: any) {
      console.error('[NewFeeRemittance] Submit error:', err);
      toast.error(err.message || 'Gagal submit setoran');
      setSubmitting(false);
    }
  }, [amount, evidenceUrls, pending, token, referenceCode, notes, router, toast]);

  // ── Render states ──────────────────────────────────────────────

  if (authLoading || loading) {
    return <LoadingFallback />;
  }

  if (!pending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-800 mb-2">Data saldo tidak tersedia</p>
          <Link href="/owner/financial/fee-remittance" className="text-sm text-[#003526] underline">
            Kembali
          </Link>
        </div>
      </div>
    );
  }

  const totalPending = pending.total_fee_pending;
  const amountNum = Number(amount) || 0;
  const isAmountValid = amountNum > 0 && amountNum <= totalPending * 1.05;
  const canSubmit = isAmountValid && evidenceUrls.length > 0 && !submitting;

  // Status hint untuk amount input
  let amountHint: { text: string; color: string } | null = null;
  if (amountNum > 0) {
    if (amountNum > totalPending * 1.05) {
      amountHint = { text: `Melebihi maksimum ${rp(Math.floor(totalPending * 1.05))}`, color: '#DC2626' };
    } else if (amountNum < totalPending) {
      const sisa = totalPending - amountNum;
      amountHint = { text: `Setoran sebagian. Sisa ${rp(sisa)} masih belum disetor.`, color: '#B45309' };
    } else {
      amountHint = { text: 'Sesuai dengan yang perlu disetor', color: '#047857' };
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
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
            <h1 className="text-base font-bold text-gray-900">Setor Fee Baru</h1>
            <p className="text-xs text-gray-500">Submit bukti transfer setoran fee</p>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">

        {/* Saldo info card */}
        <div className="bg-gradient-to-br from-[#003526] to-[#0d4d3a] rounded-2xl p-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <Wallet size={14} className="opacity-80" />
            <p className="text-xs font-semibold opacity-90 uppercase tracking-wide">Total Yang Perlu Disetor</p>
          </div>
          <p className="text-2xl font-black">{rp(totalPending)}</p>
          <p className="text-xs opacity-70 mt-1">
            {pending.pending_donations_count} donasi belum disetor
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <Info size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-800 leading-relaxed space-y-2">
              <p className="font-bold">Cara setor fee:</p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Transfer fee ke rekening TeraLoka (info di Dashboard)</li>
                <li>Snap atau upload bukti transfer di bawah</li>
                <li>Cek jumlah, isi catatan kalau perlu</li>
                <li>Klik Submit, tunggu admin verify (&lt; 1x24 jam)</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-5">

          {/* Amount input */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Jumlah Setoran <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500 pointer-events-none">
                Rp
              </span>
              <input
                type="number"
                inputMode="numeric"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl text-base font-bold focus:outline-none focus:border-[#003526]"
                disabled={submitting}
              />
            </div>
            {amountHint && (
              <div className="mt-1.5 text-xs font-medium" style={{ color: amountHint.color }}>
                {amountHint.text}
              </div>
            )}
          </div>

          {/* Evidence upload */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Bukti Transfer <span className="text-red-500">*</span>
            </label>
            <ImageUpload
              bucket="donations"
              onUpload={handleEvidenceUpload}
              existingUrls={evidenceUrls}
              maxFiles={1}
              maxSizeMB={5}
            />
            <p className="mt-1.5 text-xs text-gray-500">
              Foto / screenshot bukti transfer dari mobile banking. Mendukung JPG, PNG, WEBP, dan PDF (maks 5 MB).
            </p>
          </div>

          {/* Reference code */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Kode Referensi <span className="text-gray-400 font-normal">(opsional)</span>
            </label>
            <input
              type="text"
              value={referenceCode}
              onChange={e => setReferenceCode(e.target.value)}
              placeholder="Contoh: TF20260501-001"
              maxLength={50}
              className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#003526]"
              disabled={submitting}
            />
            <p className="mt-1 text-xs text-gray-500">
              Nomor referensi transfer dari bank (jika ada).
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Catatan <span className="text-gray-400 font-normal">(opsional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Misal: Setoran fee April 2026, bank BCA"
              rows={3}
              maxLength={500}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#003526] resize-none"
              disabled={submitting}
            />
            <p className="mt-1 text-xs text-gray-500">
              {notes.length}/500 karakter
            </p>
          </div>
        </div>
      </div>

      {/* Sticky submit button */}
      <div className="fixed left-0 right-0 bg-white border-t border-gray-200 p-4 z-20" style={{ bottom: 'calc(60px + env(safe-area-inset-bottom, 0px))' }}>
        <div className="max-w-3xl mx-auto">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full bg-[#003526] hover:bg-[#0d4d3a] text-white font-bold py-3.5 px-4 rounded-2xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Menyimpan setoran...
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                Submit Setoran
              </>
            )}
          </button>
          <p className="mt-2 text-xs text-gray-500 text-center">
            Setelah submit, setoran akan masuk antrian review admin.
          </p>
        </div>
      </div>
    </div>
  );
}
