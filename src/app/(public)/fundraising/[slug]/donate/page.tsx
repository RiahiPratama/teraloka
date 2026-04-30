'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Heart, HeartHandshake, MessageCircle, User,
  Info, Loader2, Phone,
} from 'lucide-react';
import { formatRupiah } from '@/utils/format';
import {
  calculateTeralokaFee,
  calculatePenggalangFee,
  calculateTotalEstimate,
  MIN_DONATION,
} from '@/utils/fee-calculator';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

interface Campaign {
  id: string;
  slug: string;
  title: string;
  beneficiary_name: string;
  target_amount: number;
  collected_amount: number;
  donor_count: number;
  cover_image_url?: string;
  status: 'active' | 'pending_review' | 'draft' | 'completed' | 'rejected';
  // FIX-FEE fields
  operational_fee_mode: 'volunteer' | 'professional';
  penggalang_fee_percent: number;
}

const AMOUNT_PRESETS = [25000, 50000, 100000, 250000, 500000, 1000000];

const QUICK_NAMES = ['Hamba Allah', 'Keluarga Besar'];

export default function DonatePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  // Campaign data
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  // Form state
  const [amount, setAmount] = useState(0);
  const [customAmount, setCustomAmount] = useState('');
  const [donorName, setDonorName] = useState('');
  const [donorPhone, setDonorPhone] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [message, setMessage] = useState('');

  // Penggalang fee opt-in (default FALSE — ethical opt-in pure, donor aktif klik)
  const [includePenggalangFee, setIncludePenggalangFee] = useState(false);
  const [customPenggalangFeeRaw, setCustomPenggalangFeeRaw] = useState(0); // raw number
  const [customPenggalangFeeDisplay, setCustomPenggalangFeeDisplay] = useState(''); // formatted display

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Fetch campaign
  useEffect(() => {
    async function fetchCampaign() {
      if (!slug) return;
      setLoading(true);
      setFetchError('');
      try {
        const res = await fetch(`${API}/funding/campaigns/${slug}`);
        const json = await res.json();
        if (res.ok && json.success && json.data) {
          const c = json.data;
          if (c.status !== 'active') {
            setFetchError('Kampanye ini tidak menerima donasi saat ini.');
          } else {
            setCampaign({
              ...c,
              // Defensive defaults — kalau backend tidak return field baru
              operational_fee_mode: c.operational_fee_mode ?? 'volunteer',
              penggalang_fee_percent: Number(c.penggalang_fee_percent ?? 0),
            });
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

  // Auto-compute fees (real-time as donor types)
  const feeTeraloka = useMemo(() => calculateTeralokaFee(amount), [amount]);

  const feePenggalang = useMemo(() => {
    if (!campaign || !includePenggalangFee) return 0;
    // Professional mode: pakai custom amount kalau diisi (raw number, no parsing ambiguity)
    if (campaign.operational_fee_mode === 'professional' && customPenggalangFeeRaw > 0) {
      // Batasi: max = donation amount
      return Math.min(customPenggalangFeeRaw, amount);
    }
    return calculatePenggalangFee(
      amount,
      campaign.operational_fee_mode,
      campaign.penggalang_fee_percent,
      includePenggalangFee
    );
  }, [amount, campaign, includePenggalangFee, customPenggalangFeeRaw]);

  const totalEstimate = useMemo(
    () => calculateTotalEstimate(amount, feeTeraloka, feePenggalang),
    [amount, feeTeraloka, feePenggalang]
  );

  const progressPct = useMemo(() => {
    if (!campaign || campaign.target_amount === 0) return 0;
    return Math.min(100, (campaign.collected_amount / campaign.target_amount) * 100);
  }, [campaign]);

  // Show penggalang fee section?
  const showPenggalangFeeOption = campaign?.operational_fee_mode === 'professional';

  function handleAmountPreset(val: number) {
    setAmount(val);
    setCustomAmount('');
  }

  function handleCustomAmount(val: string) {
    const digits = val.replace(/\D/g, '');
    setCustomAmount(digits);
    setAmount(Number(digits) || 0);
  }

  function handleNamePreset(name: string) {
    setDonorName(name);
    setIsAnonymous(false);
  }

  function handleAnonymousToggle() {
    const next = !isAnonymous;
    setIsAnonymous(next);
    if (next) {
      setDonorName('Anonim');
    } else {
      setDonorName('');
    }
  }

  const canSubmit = useMemo(() => {
    if (submitting) return false;
    if (!campaign || campaign.status !== 'active') return false;
    if (amount < MIN_DONATION) return false;
    if (!isAnonymous && !donorName.trim()) return false;
    return true;
  }, [submitting, campaign, amount, isAnonymous, donorName]);

  const validationMsg = useMemo(() => {
    if (amount > 0 && amount < MIN_DONATION) {
      return `Minimum donasi ${formatRupiah(MIN_DONATION)}`;
    }
    if (amount === 0) return 'Pilih atau masukkan jumlah donasi';
    if (!isAnonymous && !donorName.trim()) return 'Isi nama atau pilih Anonim';
    return '';
  }, [amount, isAnonymous, donorName]);

  async function handleSubmit() {
    if (!canSubmit || !campaign) return;

    setSubmitting(true);
    setSubmitError('');

    try {
      const body: any = {
        campaign_id: campaign.id,
        donor_name: isAnonymous ? 'Anonim' : donorName.trim(),
        donor_phone: donorPhone.trim() || null,
        is_anonymous: isAnonymous,
        amount,
        message: message.trim() || undefined,
      };

      // Only include flag if professional mode (avoid noise di volunteer)
      if (campaign.operational_fee_mode === 'professional') {
        body.include_penggalang_fee = includePenggalangFee;
      }

      const res = await fetch(`${API}/funding/donate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      const donationId = json?.data?.donation?.id ?? json?.data?.id;

      if (res.ok && json.success && donationId) {
        router.push(`/fundraising/${slug}/konfirmasi?id=${donationId}`);
      } else {
        setSubmitError(json?.error?.message || 'Gagal membuat donasi. Coba lagi.');
        setSubmitting(false);
      }
    } catch {
      setSubmitError('Koneksi bermasalah. Coba lagi.');
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 size={32} className="animate-spin text-[#003526]" />
      </div>
    );
  }

  if (!campaign || fetchError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center bg-white rounded-2xl p-8 shadow-sm">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
            <Info size={28} className="text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Tidak Dapat Donasi</h2>
          <p className="text-sm text-gray-500 mb-5">{fetchError || 'Campaign tidak tersedia.'}</p>
          <Link
            href="/fundraising"
            className="inline-block w-full bg-[#003526] text-white text-sm font-bold px-5 py-3 rounded-xl hover:opacity-90 transition-opacity"
          >
            Kembali ke Daftar Campaign
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-36">
      {/* Header */}
      <div className="bg-[#003526] px-4 pt-6 pb-8">
        <div className="mx-auto max-w-lg">
          <Link
            href={`/fundraising/${slug}`}
            className="flex items-center gap-1.5 text-[#95d3ba] text-sm mb-4 hover:text-white transition-colors"
          >
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
            <div
              className="h-full bg-gradient-to-r from-[#003526] to-[#1B6B4A] rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {campaign.donor_count} donatur · untuk{' '}
            <span className="font-semibold text-gray-600">{campaign.beneficiary_name}</span>
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
              <button
                key={val}
                type="button"
                onClick={() => handleAmountPreset(val)}
                className={`py-2.5 rounded-xl text-sm font-bold transition-all ${
                  amount === val && !customAmount
                    ? 'bg-[#003526] text-white'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {val >= 1000000 ? `${val / 1000000}jt` : `${val / 1000}rb`}
              </button>
            ))}
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              Atau Jumlah Lain
            </label>
            <div className="relative mt-1.5">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">
                Rp
              </span>
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

        {/* 2. Fee Penggalang Opt-In — only show if professional mode */}
        {showPenggalangFeeOption && amount >= MIN_DONATION && (
          <div className={`bg-white rounded-2xl border shadow-sm p-5 transition-colors ${
            includePenggalangFee ? 'border-pink-200' : 'border-gray-100'
          }`}>
            <h2 className="text-sm font-bold text-gray-800 mb-1 flex items-center gap-2">
              <HeartHandshake size={16} className="text-[#EC4899]" />
              Bantu Operasional Penggalang
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-auto">
                Opsional
              </span>
            </h2>
            <p className="text-xs text-gray-500 mb-3 leading-relaxed">
              Penggalang ambil <strong>{campaign.penggalang_fee_percent}%</strong> dari donasi untuk transport, dokumentasi, dan logistik. <strong>Pilihan kamu</strong> — bisa skip atau bantu.
            </p>

            <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
              includePenggalangFee
                ? 'bg-pink-50 border-pink-300'
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
            }`}>
              <input
                type="checkbox"
                checked={includePenggalangFee}
                onChange={e => {
                  setIncludePenggalangFee(e.target.checked);
                  if (!e.target.checked) {
                    setCustomPenggalangFeeRaw(0);
                    setCustomPenggalangFeeDisplay('');
                  }
                }}
                className="mt-0.5 w-4 h-4 accent-[#EC4899]"
              />
              <div className="flex-1 min-w-0">
                {includePenggalangFee ? (
                  <>
                    <p className="text-sm font-bold text-[#BE185D]">
                      ✅ Kamu bantu Rp {feePenggalang.toLocaleString('id-ID')} untuk operasional penggalang
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Klik untuk batalkan jika berubah pikiran.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-bold text-gray-700">
                      Ingin juga bantu operasional penggalang?
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Klik checkbox untuk tambah Rp {Math.round(amount * (campaign.penggalang_fee_percent / 100)).toLocaleString('id-ID')}
                    </p>
                  </>
                )}
              </div>
            </label>
          </div>
        )}

        {/* 3. Identitas Donor */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <User size={16} className="text-[#003526]" />
            Identitas Donor
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                Nama (atau pilih anonim)
              </label>
              <input
                type="text"
                value={donorName}
                onChange={e => {
                  setDonorName(e.target.value);
                  setIsAnonymous(false);
                }}
                placeholder="Masukkan nama Anda"
                disabled={isAnonymous}
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#003526] disabled:bg-gray-50"
              />
              <div className="flex flex-wrap gap-2 mt-2">
                <p className="w-full text-xs text-gray-400">Atau pilih cepat:</p>
                {QUICK_NAMES.map(name => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => handleNamePreset(name)}
                    className="px-3 py-1.5 rounded-lg bg-gray-100 text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors"
                  >
                    {name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleAnonymousToggle}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isAnonymous
                      ? 'bg-[#003526] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {isAnonymous ? '✓ Anonim' : '🎭 Donasi Anonim'}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                <Phone size={11} />
                No. WhatsApp (Opsional)
              </label>
              <input
                type="tel"
                value={donorPhone}
                onChange={e => setDonorPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="081234567890"
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#003526]"
              />
              <p className="text-xs text-gray-400 mt-1">Untuk konfirmasi donasi via WA</p>
            </div>
          </div>
        </div>

        {/* 4. Pesan Doa */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <MessageCircle size={16} className="text-[#003526]" />
            Pesan / Doa (Opsional)
          </h2>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Sampaikan doa atau pesan untuk penerima..."
            rows={3}
            maxLength={300}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#003526] resize-none"
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{message.length}/300</p>
        </div>

        {/* 5. Submit */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sticky bottom-4">
          {/* Breakdown */}
          {amount >= MIN_DONATION && (
            <div className="rounded-xl bg-[#f0f9f4] border border-[#003526]/20 p-4 mb-4 space-y-1.5">
              <p className="text-xs font-bold text-[#003526] uppercase tracking-wide mb-2">
                Rincian Transfer
              </p>
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Donasi</span>
                <span className="font-semibold text-gray-900">{formatRupiah(amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Fee Layanan TeraLoka</span>
                <span className="font-semibold text-gray-900">{formatRupiah(feeTeraloka)}</span>
              </div>
              {feePenggalang > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">Bantuan Operasional Penggalang</span>
                  <span className="font-semibold text-gray-900">{formatRupiah(feePenggalang)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold pt-2 border-t border-[#003526]/10">
                <span className="text-[#003526]">Subtotal</span>
                <span className="text-[#003526]">{formatRupiah(totalEstimate.subtotal)}</span>
              </div>
              <div className="flex items-start gap-1.5 mt-2 pt-2 border-t border-[#003526]/10">
                <Info size={11} className="text-gray-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Total final akan ditampilkan di halaman konfirmasi, ditambah <strong>3-digit kode unik</strong> (100-999) untuk verifikasi otomatis transfer.
                </p>
              </div>
            </div>
          )}

          {validationMsg && (
            <p className="text-xs text-amber-600 mb-3 text-center font-medium">{validationMsg}</p>
          )}

          {submitError && (
            <p className="text-xs text-red-600 mb-3 text-center font-medium">{submitError}</p>
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
