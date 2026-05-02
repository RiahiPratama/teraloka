'use client';

// ═══════════════════════════════════════════════════════════════
// /owner/funding/campaigns/[id]/disbursements/[disbId]/edit/page.tsx
// Owner edit existing disbursement (pending atau rejected)
//
// Backend: PATCH /funding/my/disbursements/:id
// Constraint: hanya boleh edit kalau status pending atau rejected
//             (kalau verified/flagged akan ditolak backend)
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import { formatRupiah } from '@/utils/format';
import ImageUpload from '@/components/ui/ImageUpload';
import {
  ArrowLeft, Loader2, AlertCircle, Save, AlertTriangle,
  User, Phone, Calendar, Wallet, FileText, Camera,
  ShieldCheck, Info, Lock,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';
const TOKEN_KEY = 'tl_token';

type DisbStatus = 'pending' | 'verified' | 'rejected' | 'flagged';

interface DisbursementDetail {
  id: string;
  campaign_id: string;
  stage_number: number;
  amount: number;
  disbursed_to: string;
  disbursed_at: string;
  method: 'transfer' | 'cash' | 'goods' | 'service';
  evidence_urls: string[];
  handover_photo_url: string | null;
  beneficiary_phone: string | null;
  beneficiary_ktp_url: string | null;
  disbursement_notes: string | null;
  status: DisbStatus;
  admin_review_notes: string | null;
  campaigns?: {
    title: string;
    slug: string;
  };
}

const METHODS = [
  { value: 'transfer', label: 'Transfer Bank' },
  { value: 'cash',     label: 'Tunai' },
  { value: 'goods',    label: 'Barang/Logistik' },
  { value: 'service',  label: 'Layanan/Jasa' },
];

function formatNumberWithThousands(num: number): string {
  if (!num || num === 0) return '';
  return new Intl.NumberFormat('id-ID').format(num);
}

function parseFormattedNumber(str: string): number {
  return parseInt(str.replace(/\D/g, '') || '0', 10);
}

export default function OwnerDisbursementEditPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id as string;
  const disbId = params.disbId as string;
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [disb, setDisb] = useState<DisbursementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [amountRaw, setAmountRaw] = useState(0);
  const [amountDisplay, setAmountDisplay] = useState('');
  const [disbursedTo, setDisbursedTo] = useState('');
  const [disbursedAt, setDisbursedAt] = useState('');
  const [method, setMethod] = useState('transfer');
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [handoverPhotoUrl, setHandoverPhotoUrl] = useState('');
  const [beneficiaryPhone, setBeneficiaryPhone] = useState('');
  const [beneficiaryKtpUrl, setBeneficiaryKtpUrl] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    if (!disbId) return;

    async function load() {
      const token = localStorage.getItem(TOKEN_KEY);
      try {
        const res = await fetch(`${API}/funding/my/disbursements/${disbId}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const json = await res.json();
        if (!json.success) {
          setLoadError(json?.error?.message || 'Gagal memuat detail');
          return;
        }
        const d: DisbursementDetail = json.data;
        setDisb(d);

        // Populate form
        setAmountRaw(Number(d.amount));
        setAmountDisplay(formatNumberWithThousands(Number(d.amount)));
        setDisbursedTo(d.disbursed_to);
        setDisbursedAt(d.disbursed_at?.slice(0, 10) ?? '');
        setMethod(d.method);
        setEvidenceUrls(d.evidence_urls ?? []);
        setHandoverPhotoUrl(d.handover_photo_url ?? '');
        setBeneficiaryPhone(d.beneficiary_phone ?? '');
        setBeneficiaryKtpUrl(d.beneficiary_ktp_url ?? '');
        setNotes(d.disbursement_notes ?? '');
      } catch (err: any) {
        setLoadError(err.message || 'Koneksi bermasalah');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [authLoading, user, disbId, router]);

  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = parseFormattedNumber(e.target.value);
    setAmountRaw(raw);
    setAmountDisplay(formatNumberWithThousands(raw));
  }

  async function handleSubmit() {
    setError('');

    if (amountRaw < 1000) {
      setError('Nominal minimal Rp 1.000');
      return;
    }
    if (!disbursedTo.trim() || disbursedTo.trim().length < 3) {
      setError('Nama penerima minimal 3 karakter');
      return;
    }
    if (!disbursedAt) {
      setError('Tanggal pencairan wajib diisi');
      return;
    }
    if (evidenceUrls.length < 1) {
      setError('Upload minimal 1 bukti pencairan');
      return;
    }
    if (!beneficiaryPhone.trim() && !beneficiaryKtpUrl) {
      setError('Wajib isi salah satu: nomor HP penerima ATAU upload KTP');
      return;
    }

    setSubmitting(true);
    const token = localStorage.getItem(TOKEN_KEY);
    try {
      const body: any = {
        amount: amountRaw,
        disbursed_to: disbursedTo.trim(),
        disbursed_at: disbursedAt,
        method,
        evidence_urls: evidenceUrls,
        handover_photo_url: handoverPhotoUrl || null,
        beneficiary_phone: beneficiaryPhone.trim() || null,
        beneficiary_ktp_url: beneficiaryKtpUrl || null,
        disbursement_notes: notes.trim() || null,
      };

      const res = await fetch(`${API}/funding/my/disbursements/${disbId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || 'Gagal update pencairan');
      }
      toast.success('Pencairan berhasil diupdate');
      router.push(`/owner/funding/campaigns/${campaignId}/disbursements/${disbId}`);
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-[#003526] animate-spin" />
      </div>
    );
  }

  if (loadError || !disb) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-800 mb-2">{loadError || 'Pencairan tidak ditemukan'}</p>
          <Link
            href={`/owner/funding/campaigns/${campaignId}/disbursements`}
            className="inline-flex items-center gap-1 text-sm text-[#003526] hover:underline"
          >
            <ArrowLeft size={14} />
            Kembali
          </Link>
        </div>
      </div>
    );
  }

  // Block edit kalau verified/flagged
  if (disb.status === 'verified' || disb.status === 'flagged') {
    return (
      <div className="min-h-screen bg-gray-50 pb-28">
        <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
            <Link
              href={`/owner/funding/campaigns/${campaignId}/disbursements/${disbId}`}
              className="p-2 -ml-2 rounded-lg hover:bg-gray-100"
            >
              <ArrowLeft size={20} className="text-gray-700" />
            </Link>
            <h1 className="text-base font-bold text-gray-900">Edit Pencairan</h1>
          </div>
        </header>
        <div className="max-w-3xl mx-auto px-4 py-12">
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <Lock size={32} className="text-gray-400 mx-auto mb-3" />
            <p className="text-base font-bold text-gray-900 mb-1">Tidak Dapat Diedit</p>
            <p className="text-sm text-gray-600 mb-5 max-w-xs mx-auto leading-relaxed">
              Pencairan dengan status <span className="font-bold">{disb.status === 'verified' ? 'Terverifikasi' : 'Dalam Investigasi'}</span> tidak bisa diubah lagi.
            </p>
            <Link
              href={`/owner/funding/campaigns/${campaignId}/disbursements/${disbId}`}
              className="inline-flex items-center gap-2 bg-[#003526] hover:bg-[#0d4d3a] text-white text-sm font-bold py-2.5 px-5 rounded-xl"
            >
              <ArrowLeft size={14} />
              Kembali ke Detail
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isRejected = disb.status === 'rejected';

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href={`/owner/funding/campaigns/${campaignId}/disbursements/${disbId}`}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 active:scale-95 transition-transform"
          >
            <ArrowLeft size={20} className="text-gray-700" />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-gray-500 leading-tight">Edit Pencairan #{disb.stage_number}</p>
            <h1 className="text-sm font-bold text-gray-900 truncate">
              {disb.campaigns?.title ?? 'Edit Pencairan'}
            </h1>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        {/* Rejected reason banner */}
        {isRejected && disb.admin_review_notes && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-red-700 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold text-red-800 mb-1">Pencairan Ditolak Admin</p>
                <p className="text-xs text-red-900 leading-relaxed mb-2">
                  Perbaiki sesuai catatan, lalu klik &quot;Simpan & Ajukan Ulang&quot;.
                </p>
                <div className="bg-white rounded-lg p-2.5 border border-red-100">
                  <p className="text-[10px] font-bold text-red-700 uppercase mb-1 tracking-wider">Catatan Admin</p>
                  <p className="text-xs text-gray-800 leading-relaxed">{disb.admin_review_notes}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pending info banner */}
        {disb.status === 'pending' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
            <Info size={14} className="text-amber-700 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-900 leading-relaxed">
              Edit perubahan akan reset status verifikasi. Admin akan review ulang (1-2 hari kerja).
            </p>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-5">
          {/* Amount */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Wallet size={12} />
              Nominal Pencairan <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-bold">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                value={amountDisplay}
                onChange={handleAmountChange}
                placeholder="0"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 text-sm font-bold outline-none focus:border-[#003526]"
              />
            </div>
          </div>

          {/* Disbursed To */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <User size={12} />
              Nama Penerima <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={disbursedTo}
              onChange={e => setDisbursedTo(e.target.value)}
              placeholder="RS Jakarta Pusat / Pak Ahmad"
              maxLength={100}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#003526]"
            />
          </div>

          {/* Date + Method side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Calendar size={12} />
                Tanggal <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={disbursedAt}
                onChange={e => setDisbursedAt(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                className="w-full px-3 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#003526]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Metode <span className="text-red-500">*</span>
              </label>
              <select
                value={method}
                onChange={e => setMethod(e.target.value)}
                className="w-full px-3 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#003526] bg-white"
              >
                {METHODS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <FileText size={12} />
              Catatan <span className="text-gray-400 font-normal">(opsional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Detail penggunaan dana, dll..."
              rows={3}
              maxLength={500}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#003526] resize-none"
            />
            <p className="text-[10px] text-gray-400 mt-1 text-right">{notes.length}/500</p>
          </div>
        </div>

        {/* Beneficiary Identity Card (one of) */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck size={14} className="text-[#003526]" />
            <p className="text-sm font-bold text-gray-900">Identitas Penerima <span className="text-red-500">*</span></p>
          </div>
          <p className="text-xs text-gray-500 mb-4 leading-relaxed">
            Wajib isi <strong>salah satu</strong>: nomor HP atau upload KTP penerima.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Phone size={12} />
                Nomor HP Penerima
              </label>
              <input
                type="tel"
                value={beneficiaryPhone}
                onChange={e => setBeneficiaryPhone(e.target.value)}
                placeholder="08123456789"
                maxLength={20}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#003526]"
              />
            </div>

            <div className="text-center text-[10px] text-gray-400 uppercase tracking-wider font-bold">atau</div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Camera size={12} />
                KTP / ID Penerima
              </label>
              <ImageUpload
                bucket="campaigns"
                label=""
                maxFiles={1}
                maxSizeMB={3}
                onUpload={(urls: string[]) => setBeneficiaryKtpUrl(urls[0] ?? '')}
                existingUrls={beneficiaryKtpUrl ? [beneficiaryKtpUrl] : []}
              />
            </div>
          </div>
        </div>

        {/* Evidence Photos */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={14} className="text-[#003526]" />
            <p className="text-sm font-bold text-gray-900">
              Bukti Pencairan <span className="text-red-500">*</span>
            </p>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Upload 1-5 foto bukti (struk transfer, foto serah terima, kuitansi, dll).
          </p>
          <ImageUpload
            bucket="campaigns"
            label=""
            maxFiles={5}
            maxSizeMB={3}
            onUpload={(urls: string[]) => setEvidenceUrls(urls)}
            existingUrls={evidenceUrls}
          />
        </div>

        {/* Handover Photo (optional) */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Camera size={14} className="text-gray-500" />
            <p className="text-sm font-bold text-gray-900">
              Foto Serah Terima <span className="text-gray-400 font-normal text-xs">(opsional)</span>
            </p>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Foto saat dana/barang diserahkan ke penerima — menambah trust donor.
          </p>
          <ImageUpload
            bucket="campaigns"
            label=""
            maxFiles={1}
            maxSizeMB={3}
            onUpload={(urls: string[]) => setHandoverPhotoUrl(urls[0] ?? '')}
            existingUrls={handoverPhotoUrl ? [handoverPhotoUrl] : []}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
            <AlertCircle size={14} className="text-red-700 shrink-0 mt-0.5" />
            <p className="text-xs text-red-800">{error}</p>
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-2">
          <Link
            href={`/owner/funding/campaigns/${campaignId}/disbursements/${disbId}`}
            className="px-5 inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-bold border border-gray-200 py-3 rounded-xl active:scale-95 transition-all"
          >
            Batal
          </Link>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-[#003526] hover:bg-[#0d4d3a] disabled:bg-gray-300 text-white text-sm font-bold py-3 rounded-xl active:scale-95 transition-all"
          >
            {submitting ? (
              <><Loader2 size={14} className="animate-spin" /> Menyimpan...</>
            ) : (
              <>
                <Save size={14} />
                {isRejected ? 'Simpan & Ajukan Ulang' : 'Simpan Perubahan'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
