'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Heart, HeartHandshake, Info, Lock, UserRound, Loader2, AlertCircle } from 'lucide-react';
import { formatRupiah } from '@/utils/format';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

// Preset nominal donasi (user bisa pilih + custom)
const AMOUNT_PRESETS = [25000, 50000, 100000, 250000, 500000, 1000000];

// Preset biaya operasional support platform (opsional)
const FEE_PRESETS = [
  { value: 0,     label: 'Tidak' },
  { value: 2000,  label: 'Rp 2rb' },
  { value: 5000,  label: 'Rp 5rb' },
  { value: 10000, label: 'Rp 10rb' },
];

// Preset nama alias untuk donor yang ga mau pakai nama real
const NAME_PRESETS = ['Hamba Allah', 'Keluarga Ternate', 'Bismillah'];

const MIN_DONATION = 25000;

interface Campaign {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  beneficiary_name: string;
  target_amount: number;
  collected_amount: number;
  donor_count: number;
  cover_image_url?: string;
  is_urgent: boolean;
  partner_name?: string;
  bank_name: string;
  status: string;
}

export default function DonatePage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter();
  const { slug } = use(params);

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');  // ← separate from submit error

  // Form state
  const [amount, setAmount] = useState<number>(0);
  const [customAmount, setCustomAmount] = useState('');
  const [fee, setFee] = useState<number>(0);
  const [customFee, setCustomFee] = useState('');
  const [donorName, setDonorName] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [donorPhone, setDonorPhone] = useState('');
  const [message, setMessage] = useState('');

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');  // ← separate from fetch error

  // Fetch campaign on mount
  useEffect(() => {
    async function fetchCampaign() {
      try {
        const res = await fetch(`${API}/funding/campaigns/${slug}`);
        const json = await res.json();
        if (json.success && json.data) {
          setCampaign(json.data);
          if (json.data.status !== 'active') {
            setFetchError('Campaign ini belum aktif untuk menerima donasi.');
          }
        } else {
          setFetchError('Campaign tidak ditemukan.');
        }
      } catch {
        setFetchError('Gagal memuat campaign. Coba refresh halaman.');
      } finally {
        setLoading(false);
      }
    }
    fetchCampaign();
  }, [slug]);

  // Computed total transfer
  const totalTransfer = useMemo(() => amount + fee, [amount, fee]);

  // Progress campaign
  const progressPct = useMemo(() => {
    if (!campaign || campaign.target_amount === 0) return 0;
    return Math.min(100, (campaign.collected_amount / campaign.target_amount) * 100);
  }, [campaign]);

  // Handle amount preset select
  function handleAmountPreset(val: number) {
    setAmount(val);
    setCustomAmount('');
  }

  // Handle custom amount input
  function handleCustomAmount(val: string) {
    const digits = val.replace(/\D/g, '');
    setCustomAmount(digits);
    setAmount(Number(digits) || 0);
  }

  // Handle fee preset select
  function handleFeePreset(val: number) {
    setFee(val);
    setCustomFee('');
  }

  function handleCustomFee(val: string) {
    const digits = val.replace(/\D/g, '');
    setCustomFee(digits);
    setFee(Number(digits) || 0);
  }

  // Handle name preset
  function handleNamePreset(name: string) {
    setDonorName(name);
    setIsAnonymous(false);
  }

  // Handle anonymous toggle
  function handleAnonymousToggle() {
    const next = !isAnonymous;
    setIsAnonymous(next);
    if (next) {
      setDonorName('Anonim');
    } else {
      setDonorName('');
    }
  }

  // Form validation
  const canSubmit = useMemo(() => {
    if (submitting) return false;
    if (!campaign || campaign.status !== 'active') return false;
    if (amount < MIN_DONATION) return false;
    if (!isAnonymous && !donorName.trim()) return false;
    return true;
  }, [submitting, campaign, amount, isAnonymous, donorName]);

  // Validation message
  const validationMsg = useMemo(() => {
    if (amount > 0 && amount < MIN_DONATION) {
      return `Minimum donasi ${formatRupiah(MIN_DONATION)}`;
    }
    if (amount === 0) return 'Pilih atau masukkan jumlah donasi';
    if (!isAnonymous && !donorName.trim()) return 'Isi nama atau pilih Anonim';
    return '';
  }, [amount, isAnonymous, donorName]);

  // Submit handler
  async function handleSubmit() {
    if (!canSubmit || !campaign) return;

    setSubmitting(true);
    setSubmitError('');

    try {
      const res = await fetch(`${API}/funding/donate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: campaign.id,
          donor_name: isAnonymous ? 'Anonim' : donorName.trim(),
          donor_phone: donorPhone.trim() || undefined,
          is_anonymous: isAnonymous,
          amount,
          operational_fee: fee,
        }),
      });

      const json = await res.json();

      // Handle 2 possible backend response formats:
      // FORMAT A (current): { success: true, data: { id, donation_code, ... } }
      //   → donation is directly in data
      // FORMAT B (future): { success: true, data: { donation: { id, ... }, campaign: {...} } }
      //   → donation nested under data.donation
      //
      // Extract donation_id from either format.
      const donationId = json?.data?.donation?.id ?? json?.data?.id;

      if (res.ok && json.success && donationId) {
        // Simpan pesan/doa ke localStorage (buat konfirmasi page nanti)
        if (message.trim()) {
          localStorage.setItem(`donation-msg-${donationId}`, message.trim());
        }
        // Redirect ke konfirmasi page
        router.push(`/fundraising/${slug}/konfirmasi?id=${donationId}`);
      } else {
        setSubmitError(json?.error?.message || 'Gagal membuat donasi. Coba lagi.');
        setSubmitting(false);
      }
    } catch {
      setSubmitError('Koneksi bermasalah. Coba lagi.');
      setSubmitting(false);
    }
    // Note: don't setSubmitting(false) on success — we're redirecting
  }

  // ─────────────────────────────────────────────────────────────
  // Loading state (fetch campaign)
  // ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 size={32} className="animate-spin text-[#003526]" />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Full-page error state — ONLY when campaign fetch fails
  // (NOT when submit fails — submit error shown inline)
  // ─────────────────────────────────────────────────────────────
  if (!campaign || fetchError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center bg-white rounded-2xl p-8 shadow-sm">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
            <Info size={28} className="text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Tidak Dapat Donasi</h2>
          <p className="text-sm text-gray-500 mb-5">{fetchError || 'Campaign tidak tersedia.'}</p>
          <Link href="/fundraising"
            className="inline-block w-full bg-[#003526] text-white text-sm font-bold px-5 py-3 rounded-xl hover:opacity-90 transition-opacity">
            Kembali ke Daftar Campaign
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">

      {/* Header */}
      <div className="bg-[#003526] px-4 pt-6 pb-8">
        <div className="mx-auto max-w-lg">
          <Link href={`/fundraising/${slug}`}
            className="flex items-center gap-1.5 text-[#95d3ba] text-sm mb-4 hover:text-white transition-colors">
            <ArrowLeft size={16} /> Kembali ke Campaign
          </Link>
          <div className="flex items-center gap-2 mb-2">
            <HeartHandshake size={20} className="text-[#F472B6]" />
            <p className="text-xs font-bold text-[#F472B6] uppercase tracking-widest">BADONASI</p>
          </div>
          <h1 className="text-xl font-extrabold text-white leading-tight">Donasi untuk</h1>
          <p className="text-lg font-bold text-white/90 line-clamp-2">{campaign.title}</p>
        </div>
      </div>

      {/* Campaign mini card */}
      <div className="mx-auto max-w-lg px-4 -mt-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">Terkumpul</span>
            <span className="text-xs text-gray-400">{progressPct.toFixed(1)}%</span>
          </div>
          <div className="mb-2">
            <p className="text-lg font-extrabold text-[#003526]">{formatRupiah(campaign.collected_amount)}</p>
            <p className="text-xs text-gray-500">dari target {formatRupiah(campaign.target_amount)}</p>
          </div>
          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#1B6B4A] to-[#EC4899] rounded-full transition-all"
              style={{ width: `${progressPct}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {campaign.donor_count} donatur · untuk <span className="font-semibold text-gray-600">{campaign.beneficiary_name}</span>
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="mx-auto max-w-lg px-4 space-y-4">

        {/* 1. Jumlah Donasi */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Heart size={16} className="text-[#EC4899]" />
            Jumlah Donasi
          </h2>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {AMOUNT_PRESETS.map(val => (
              <button key={val} type="button" onClick={() => handleAmountPreset(val)}
                className={`py-2.5 rounded-xl text-sm font-bold transition-all ${
                  amount === val && !customAmount
                    ? 'bg-[#003526] text-white'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}>
                {val >= 1000000 ? `${val / 1000000}jt` : `${val / 1000}rb`}
              </button>
            ))}
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              Atau Jumlah Lain
            </label>
            <div className="relative mt-1.5">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                value={customAmount ? Number(customAmount).toLocaleString('id-ID') : ''}
                onChange={e => handleCustomAmount(e.target.value)}
                placeholder="25.000"
                className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-3 text-sm outline-none focus:border-[#003526]"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Minimum {formatRupiah(MIN_DONATION)}</p>
          </div>
        </div>

        {/* 2. Biaya Operasional (optional) */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-1 flex items-center gap-2">
            <HeartHandshake size={16} className="text-[#BA7517]" />
            Dukung Operasional BADONASI
          </h2>
          <p className="text-xs text-gray-500 mb-3 leading-relaxed">
            Opsional. Bantu TeraLoka jalanin platform ini gratis untuk komunitas. 100% donasi tetap utuh ke penerima.
          </p>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {FEE_PRESETS.map(preset => (
              <button key={preset.value} type="button" onClick={() => handleFeePreset(preset.value)}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                  fee === preset.value && !customFee
                    ? 'bg-[#BA7517] text-white'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}>
                {preset.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">Rp</span>
            <input
              type="text"
              inputMode="numeric"
              value={customFee ? Number(customFee).toLocaleString('id-ID') : ''}
              onChange={e => handleCustomFee(e.target.value)}
              placeholder="Jumlah lain (opsional)"
              className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-2.5 text-xs outline-none focus:border-[#BA7517]"
            />
          </div>
        </div>

        {/* 3. Identitas Donor */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <UserRound size={16} className="text-[#003526]" />
            Nama Donor
          </h2>
          {/* Anonymous toggle */}
          <label className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl p-3 mb-3 cursor-pointer">
            <div>
              <p className="text-sm font-semibold text-gray-800">Donasi Anonim</p>
              <p className="text-xs text-gray-500">Nama kamu akan ditampilkan sebagai &quot;Anonim&quot;</p>
            </div>
            <button type="button" onClick={handleAnonymousToggle}
              className={`relative w-11 h-6 rounded-full transition-colors ${isAnonymous ? 'bg-[#003526]' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${isAnonymous ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </label>

          {/* Name input (hidden if anonymous) */}
          {!isAnonymous && (
            <>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                Nama yang Ditampilkan
              </label>
              <input
                type="text"
                value={donorName}
                onChange={e => setDonorName(e.target.value)}
                placeholder="Nama kamu atau alias"
                maxLength={50}
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#003526]"
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {NAME_PRESETS.map(preset => (
                  <button key={preset} type="button" onClick={() => handleNamePreset(preset)}
                    className="px-3 py-1.5 rounded-full bg-gray-50 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors">
                    {preset}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 4. Nomor WhatsApp (optional) */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-1">
            Nomor WhatsApp <span className="text-gray-400 font-normal">(Opsional)</span>
          </h2>
          <p className="text-xs text-gray-500 mb-3 leading-relaxed">
            Supaya tim BADONASI bisa kontak kalau ada kendala verifikasi. Tidak ditampilkan ke publik.
          </p>
          <input
            type="tel"
            inputMode="numeric"
            value={donorPhone}
            onChange={e => setDonorPhone(e.target.value.replace(/\D/g, ''))}
            placeholder="081xxxxxxxxx"
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#003526]"
          />
        </div>

        {/* 5. Pesan / Doa (optional) */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-1">
            Pesan atau Doa <span className="text-gray-400 font-normal">(Opsional)</span>
          </h2>
          <p className="text-xs text-gray-500 mb-3">
            Tulis pesan semangat atau doa untuk penerima manfaat.
          </p>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Semoga segera sembuh, sehat selalu..."
            rows={3}
            maxLength={200}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#003526] resize-none"
          />
          <p className="mt-1 text-right text-xs text-gray-400">{message.length}/200</p>
        </div>

        {/* Privacy note */}
        <div className="rounded-xl bg-[#003526]/5 border border-[#003526]/10 px-4 py-3 flex items-start gap-2">
          <Lock size={14} className="text-[#003526] shrink-0 mt-0.5" />
          <p className="text-xs text-[#003526] leading-relaxed">
            Data pribadi kamu dilindungi. Hanya nama donor yang muncul di halaman publik. Nomor WA & pesan hanya untuk admin + komunitas partner.
          </p>
        </div>

        {/* INLINE submit error banner (bukan full-page) */}
        {submitError && (
          <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 flex items-start gap-2">
            <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-red-700">Gagal membuat donasi</p>
              <p className="text-xs text-red-600 mt-0.5">{submitError}</p>
            </div>
          </div>
        )}

      </div>

      {/* Sticky bottom panel: total + CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg">
        <div className="mx-auto max-w-lg px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-gray-400">Total Transfer</p>
              <p className="text-xl font-extrabold text-[#003526]">
                {totalTransfer > 0 ? formatRupiah(totalTransfer) : 'Rp 0'}
              </p>
            </div>
            {fee > 0 && (
              <div className="text-right">
                <p className="text-xs text-gray-400">Donasi {formatRupiah(amount)}</p>
                <p className="text-xs text-[#BA7517]">+ operasional {formatRupiah(fee)}</p>
              </div>
            )}
          </div>
          {validationMsg && (
            <p className="text-xs text-amber-600 mb-2 text-center">{validationMsg}</p>
          )}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full bg-[#003526] text-white text-sm font-bold py-4 rounded-2xl hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Memproses...
              </>
            ) : (
              'Lanjut ke Pembayaran →'
            )}
          </button>
        </div>
      </div>

    </div>
  );
}
