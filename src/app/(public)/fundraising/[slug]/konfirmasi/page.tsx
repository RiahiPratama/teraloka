'use client';

import { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Copy, Check, Building2, Hash, User, HeartHandshake,
  Info, FileCheck, Loader2, AlertCircle, ShieldCheck,
} from 'lucide-react';
import ImageUpload from '@/components/ui/ImageUpload';
import { formatRupiah } from '@/utils/format';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

interface Donation {
  id: string;
  campaign_id: string;
  donor_name: string;
  donor_phone?: string;
  is_anonymous: boolean;
  amount: number;
  operational_fee: number;
  total_transfer: number;
  donation_code: string;
  transfer_proof_url?: string;
  verification_status: string;
  created_at: string;
  // Joined campaign info (from engine.getDonation)
  campaigns?: {
    id: string;
    title: string;
    slug: string;
    bank_name: string;
    bank_account_number: string;
    bank_account_name: string;
    partner_name?: string;
    cover_image_url?: string;
    target_amount: number;
    collected_amount: number;
  };
}

export default function KonfirmasiPage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { slug } = use(params);
  const donationId = searchParams.get('id');

  const [donation, setDonation] = useState<Donation | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  // Upload state
  const [proofUrl, setProofUrl] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Copy-to-clipboard state
  const [copiedField, setCopiedField] = useState<string>('');

  // Fetch donation on mount
  useEffect(() => {
    if (!donationId) {
      setFetchError('ID donasi tidak valid.');
      setLoading(false);
      return;
    }

    async function fetchDonation() {
      try {
        const res = await fetch(`${API}/funding/donations/${donationId}`);
        const json = await res.json();
        if (json.success && json.data) {
          setDonation(json.data);
          // Kalau bukti udah ke-upload sebelumnya, simpan URL
          if (json.data.transfer_proof_url) {
            setProofUrl(json.data.transfer_proof_url);
          }
        } else {
          setFetchError(json.error?.message || 'Donasi tidak ditemukan.');
        }
      } catch {
        setFetchError('Gagal memuat data donasi. Coba refresh halaman.');
      } finally {
        setLoading(false);
      }
    }
    fetchDonation();
  }, [donationId]);

  // Handle copy-to-clipboard
  function copyToClipboard(text: string, fieldName: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(''), 2000);
    });
  }

  // Handle submit konfirmasi
  async function handleSubmit() {
    if (!donation || !proofUrl) return;

    setSubmitting(true);
    setSubmitError('');

    try {
      const res = await fetch(`${API}/funding/donations/${donation.id}/upload-proof`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transfer_proof_url: proofUrl }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        router.push(`/fundraising/${slug}/terima-kasih?id=${donation.id}`);
      } else {
        setSubmitError(json.error?.message || 'Gagal mengirim konfirmasi. Coba lagi.');
        setSubmitting(false);
      }
    } catch {
      setSubmitError('Koneksi bermasalah. Coba lagi.');
      setSubmitting(false);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Loading state
  // ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 size={32} className="animate-spin text-[#003526]" />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Fetch error
  // ─────────────────────────────────────────────────────────────
  if (!donation || fetchError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center bg-white rounded-2xl p-8 shadow-sm">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
            <Info size={28} className="text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Data Donasi Tidak Ditemukan</h2>
          <p className="text-sm text-gray-500 mb-5">{fetchError || 'Silakan coba ulang donasi.'}</p>
          <Link href={`/fundraising/${slug}`}
            className="inline-block w-full bg-[#003526] text-white text-sm font-bold px-5 py-3 rounded-xl hover:opacity-90 transition-opacity">
            Kembali ke Campaign
          </Link>
        </div>
      </div>
    );
  }

  const campaign = donation.campaigns;

  return (
    <div className="min-h-screen bg-gray-50 pb-32">

      {/* Header */}
      <div className="bg-[#003526] px-4 pt-6 pb-8">
        <div className="mx-auto max-w-lg">
          <Link href={`/fundraising/${slug}/donate`}
            className="flex items-center gap-1.5 text-[#95d3ba] text-sm mb-4 hover:text-white transition-colors">
            <ArrowLeft size={16} /> Ubah Donasi
          </Link>
          <div className="flex items-center gap-2 mb-2">
            <HeartHandshake size={20} className="text-[#F472B6]" />
            <p className="text-xs font-bold text-[#F472B6] uppercase tracking-widest">Konfirmasi Pembayaran</p>
          </div>
          <h1 className="text-xl font-extrabold text-white leading-tight">Langkah Terakhir</h1>
          <p className="text-sm text-white/80 mt-1">
            Transfer nominal persis lalu upload bukti. Tim verifikasi dalam 1-3 jam kerja.
          </p>
        </div>
      </div>

      {/* Total Transfer Card — HERO */}
      <div className="mx-auto max-w-lg px-4 -mt-4">
        <div className="bg-gradient-to-br from-[#EC4899] to-[#BE185D] rounded-2xl shadow-lg p-5 text-white">
          <p className="text-xs font-bold uppercase tracking-widest text-white/80 mb-1">Nominal Transfer</p>
          <div className="flex items-baseline gap-2 mb-3">
            <p className="text-3xl font-extrabold">{formatRupiah(donation.total_transfer)}</p>
            <button
              onClick={() => copyToClipboard(String(donation.total_transfer), 'amount')}
              className="text-white/80 hover:text-white transition-colors">
              {copiedField === 'amount' ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>
          <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
            <Hash size={14} className="text-white/80" />
            <p className="text-xs text-white/90">
              <span className="font-semibold">3 digit terakhir nominal ({donation.donation_code})</span> = kode unik transaksimu. Transfer <span className="font-bold">nominal persis ini</span>, jangan dibulatkan.
            </p>
          </div>
        </div>
      </div>

      {/* Bank Info */}
      <div className="mx-auto max-w-lg px-4 mt-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Building2 size={16} className="text-[#003526]" />
            Transfer ke Rekening Partner
          </h2>

          {campaign ? (
            <div className="space-y-3">
              {/* Bank name */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-gray-100">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-400 mb-0.5">Bank</p>
                  <p className="text-sm font-bold text-gray-900">{campaign.bank_name}</p>
                </div>
              </div>

              {/* Account number — COPYABLE */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-gray-100">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-400 mb-0.5">Nomor Rekening</p>
                  <p className="text-base font-bold text-gray-900 font-mono tracking-wider">
                    {campaign.bank_account_number}
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(campaign.bank_account_number, 'account')}
                  className="flex items-center gap-1 text-xs font-semibold text-[#003526] px-3 py-1.5 rounded-lg bg-[#003526]/5 hover:bg-[#003526]/10 transition-colors shrink-0">
                  {copiedField === 'account' ? (
                    <><Check size={14} /> Tersalin</>
                  ) : (
                    <><Copy size={14} /> Salin</>
                  )}
                </button>
              </div>

              {/* Account name */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-gray-100">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-400 mb-0.5">Atas Nama</p>
                  <p className="text-sm font-bold text-gray-900">{campaign.bank_account_name}</p>
                </div>
              </div>

              {/* Partner name */}
              {campaign.partner_name && (
                <div className="flex items-start gap-2 mt-2">
                  <User size={14} className="text-gray-400 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-400">Komunitas Partner</p>
                    <p className="text-sm font-semibold text-gray-700">{campaign.partner_name}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-500">Info bank tidak tersedia. Kontak admin.</p>
          )}
        </div>
      </div>

      {/* Step-by-step */}
      <div className="mx-auto max-w-lg px-4 mt-4">
        <div className="bg-[#003526]/5 rounded-2xl border border-[#003526]/10 p-5">
          <h3 className="text-sm font-bold text-[#003526] mb-3">Cara Transfer:</h3>
          <ol className="space-y-2.5 text-sm text-gray-700">
            <li className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-[#003526] text-white text-xs font-bold flex items-center justify-center">1</span>
              <span>Buka aplikasi m-banking atau ATM</span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-[#003526] text-white text-xs font-bold flex items-center justify-center">2</span>
              <span>Transfer ke rekening di atas dengan nominal <span className="font-bold text-[#003526]">{formatRupiah(donation.total_transfer)}</span> (persis, jangan dibulatkan)</span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-[#003526] text-white text-xs font-bold flex items-center justify-center">3</span>
              <span>Screenshot atau simpan bukti transfer (foto/PDF)</span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-[#EC4899] text-white text-xs font-bold flex items-center justify-center">4</span>
              <span>Upload bukti di bawah, lalu klik &quot;Konfirmasi Donasi&quot;</span>
            </li>
          </ol>
        </div>
      </div>

      {/* Upload Bukti */}
      <div className="mx-auto max-w-lg px-4 mt-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-1 flex items-center gap-2">
            <FileCheck size={16} className="text-[#EC4899]" />
            Upload Bukti Transfer
          </h2>
          <p className="text-xs text-gray-500 mb-3 leading-relaxed">
            Wajib. Upload screenshot atau PDF struk transfer agar tim bisa verifikasi donasimu.
          </p>
          <ImageUpload
            bucket="donations"
            label=""
            onUpload={(urls: string[]) => setProofUrl(urls[0] ?? '')}
            existingUrls={proofUrl ? [proofUrl] : []}
          />
        </div>
      </div>

      {/* Security note */}
      <div className="mx-auto max-w-lg px-4 mt-4">
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 flex items-start gap-2">
          <ShieldCheck size={14} className="text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-xs text-emerald-800 leading-relaxed">
            Donasimu langsung masuk ke rekening komunitas partner. TeraLoka tidak menahan dana donasi. Semua transaksi transparan dan bisa ditelusuri.
          </p>
        </div>
      </div>

      {/* Submit error */}
      {submitError && (
        <div className="mx-auto max-w-lg px-4 mt-4">
          <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 flex items-start gap-2">
            <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-red-700">Gagal mengirim konfirmasi</p>
              <p className="text-xs text-red-600 mt-0.5">{submitError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Sticky bottom: CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg">
        <div className="mx-auto max-w-lg px-4 py-4">
          <button
            onClick={handleSubmit}
            disabled={!proofUrl || submitting}
            className="w-full bg-gradient-to-r from-[#EC4899] to-[#BE185D] text-white text-sm font-bold py-4 rounded-2xl hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md">
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Mengirim konfirmasi...
              </>
            ) : (
              <>
                <FileCheck size={16} />
                Konfirmasi Donasi
              </>
            )}
          </button>
          {!proofUrl && (
            <p className="text-xs text-amber-600 mt-2 text-center">
              Upload bukti transfer dulu ya
            </p>
          )}
        </div>
      </div>

    </div>
  );
}
