'use client';

import { useState } from 'react';
import ImageUpload from '@/components/ui/ImageUpload';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

const CATEGORIES = [
  { key: 'kesehatan', label: '🏥 Kesehatan' },
  { key: 'bencana', label: '🌊 Bencana Alam' },
  { key: 'duka', label: '🕊️ Duka / Musibah' },
  { key: 'anak_yatim', label: '👶 Anak Yatim' },
  { key: 'lansia', label: '👴 Lansia' },
  { key: 'hunian_darurat', label: '🏚️ Hunian Darurat' },
];

const STEPS = ['Data Penerima', 'Detail Campaign', 'Rekening Partner', 'Review'];

export default function NewCampaignPage() {
  const router = useRouter();
  const { user, token } = useAuth();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const [coverUrl, setCoverUrl] = useState('');

  // Step 0 — Data penerima
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [beneficiaryRelation, setBeneficiaryRelation] = useState('');
  const [category, setCategory] = useState('');

  // Step 1 — Detail campaign
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  // Step 2 — Rekening komunitas partner
  const [partnerName, setPartnerName] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');

  if (!user || !token) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <p className="text-4xl mb-3">🔒</p>
          <h2 className="text-lg font-semibold text-gray-900">Login Dulu</h2>
          <p className="mt-1 text-sm text-gray-500 mb-4">
            Kamu harus login untuk mengajukan campaign BASUMBANG.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="rounded-xl bg-[#1B6B4A] px-6 py-2.5 text-sm font-semibold text-white"
          >
            Login sekarang
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
            <svg className="h-8 w-8 text-[#1B6B4A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Campaign Diajukan!</h2>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            Tim TeraLoka akan memverifikasi campaign kamu dalam 1×24 jam.
            Setelah disetujui, campaign akan tampil di halaman BASUMBANG.
          </p>
          <p className="mt-2 text-xs text-gray-400">
            Dana donasi akan masuk ke rekening komunitas partner yang kamu daftarkan.
            Laporan penggunaan dana wajib diupload secara berkala.
          </p>
          <button
            onClick={() => router.push('/fundraising')}
            className="mt-5 rounded-xl bg-[#1B6B4A] px-6 py-2.5 text-sm font-semibold text-white"
          >
            Lihat BASUMBANG
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/funding/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          description,
          category,
          cover_image_url: coverUrl || null,
          beneficiary_name: beneficiaryName,
          beneficiary_relation: beneficiaryRelation,
          target_amount: Number(targetAmount.replace(/\D/g, '')),
          bank_name: bankName,
          bank_account_number: bankAccountNumber,
          bank_account_name: bankAccountName,
          deadline: deadline || null,
          is_urgent: isUrgent,
          partner_name: partnerName,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSubmitted(true);
      } else {
        setError(data.error?.message ?? 'Gagal mengajukan campaign.');
      }
    } catch {
      setError('Koneksi bermasalah. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const formatRupiah = (val: string) => {
    const num = val.replace(/\D/g, '');
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const canNext = [
    beneficiaryName.trim() && beneficiaryRelation.trim() && category,
    title.trim().length >= 10 && description.trim().length >= 30 && targetAmount,
    partnerName.trim() && bankName.trim() && bankAccountNumber.trim() && bankAccountName.trim(),
    true,
  ][step];

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-[#1B6B4A]">Ajukan Campaign</h1>
        <p className="text-sm text-gray-500">BASUMBANG — Galang Dana Kemanusiaan</p>
      </div>

      {/* Step indicator */}
      <div className="mb-6 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
              i < step ? 'bg-[#1B6B4A] text-white' :
              i === step ? 'border-2 border-[#1B6B4A] text-[#1B6B4A]' :
              'bg-gray-100 text-gray-400'
            }`}>
              {i < step ? '✓' : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 w-8 ${i < step ? 'bg-[#1B6B4A]' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
        <span className="ml-2 text-xs text-gray-500">{STEPS[step]}</span>
      </div>

      {/* ─── Step 0: Data Penerima ─── */}
      {step === 0 && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Nama Penerima Manfaat</label>
            <input
              type="text"
              value={beneficiaryName}
              onChange={e => setBeneficiaryName(e.target.value)}
              placeholder="Nama lengkap yang dibantu"
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#1B6B4A]"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Hubungan dengan Pengaju</label>
            <input
              type="text"
              value={beneficiaryRelation}
              onChange={e => setBeneficiaryRelation(e.target.value)}
              placeholder="Contoh: diri sendiri, keluarga, tetangga, warga"
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#1B6B4A]"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Kategori Kemanusiaan</label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.key}
                  onClick={() => setCategory(cat.key)}
                  className={`rounded-xl px-3 py-2.5 text-left text-xs font-medium transition-colors ${
                    category === cat.key
                      ? 'bg-[#1B6B4A] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Step 1: Detail Campaign ─── */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Judul Campaign</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Contoh: Bantu Ibu Fatima Biaya Operasi"
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#1B6B4A]"
            />
            <p className="mt-1 text-right text-xs text-gray-400">{title.length} / 100</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Cerita & Kebutuhan</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ceritakan kondisi penerima, kebutuhan mendesak, dan bagaimana dana akan digunakan..."
              rows={6}
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#1B6B4A]"
            />
            <p className="mt-1 text-right text-xs text-gray-400">{description.length} karakter (min. 30)</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Target Dana</label>
            <div className="relative mt-1.5">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">Rp</span>
              <input
                type="text"
                value={targetAmount}
                onChange={e => setTargetAmount(formatRupiah(e.target.value))}
                placeholder="5.000.000"
                className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#1B6B4A]"
              />
            </div>
          </div>

          <ImageUpload
            bucket="campaigns"
            label="Foto Campaign (opsional)"
            onUpload={url => setCoverUrl(url)}
            existingUrl={coverUrl}
          />

          <div>
            <label className="text-sm font-medium text-gray-700">Batas Waktu <span className="text-gray-400">(opsional)</span></label>
            <input
              type="date"
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#1B6B4A]"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={isUrgent}
              onChange={e => setIsUrgent(e.target.checked)}
              className="h-4 w-4 accent-[#1B6B4A]"
            />
            <span className="text-sm text-gray-700">
              🚨 Tandai sebagai <strong>mendesak</strong> (akan diprioritaskan di halaman utama)
            </span>
          </label>
        </div>
      )}

      {/* ─── Step 2: Rekening Komunitas Partner ─── */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
            <p className="text-xs text-amber-800 leading-relaxed">
              <strong>Penting:</strong> Dana donasi akan masuk langsung ke rekening komunitas partner di bawah.
              TeraLoka hanya mempublish laporan dana masuk & keluar untuk transparansi publik.
              Pastikan rekening valid dan atas nama komunitas/lembaga terpercaya.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Nama Komunitas / Lembaga Partner</label>
            <input
              type="text"
              value={partnerName}
              onChange={e => setPartnerName(e.target.value)}
              placeholder="Contoh: Yayasan Peduli Maluku Utara"
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#1B6B4A]"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Bank</label>
            <input
              type="text"
              value={bankName}
              onChange={e => setBankName(e.target.value)}
              placeholder="Contoh: BRI, BNI, Mandiri, BSI"
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#1B6B4A]"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Nomor Rekening</label>
            <input
              type="text"
              value={bankAccountNumber}
              onChange={e => setBankAccountNumber(e.target.value.replace(/\D/g, ''))}
              placeholder="Nomor rekening tanpa spasi"
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#1B6B4A]"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Nama Pemilik Rekening</label>
            <input
              type="text"
              value={bankAccountName}
              onChange={e => setBankAccountName(e.target.value)}
              placeholder="Sesuai nama di buku tabungan"
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#1B6B4A]"
            />
          </div>
        </div>
      )}

      {/* ─── Step 3: Review ─── */}
      {step === 3 && (
        <div className="space-y-3">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
            <div>
              <p className="text-xs text-gray-400">Kategori</p>
              <p className="text-sm font-medium text-gray-800">{CATEGORIES.find(c => c.key === category)?.label}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Penerima</p>
              <p className="text-sm font-medium text-gray-800">{beneficiaryName} ({beneficiaryRelation})</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Judul Campaign</p>
              <p className="text-sm font-medium text-gray-800">{title}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Target Dana</p>
              <p className="text-sm font-medium text-gray-800">Rp {targetAmount}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Komunitas Partner</p>
              <p className="text-sm font-medium text-gray-800">{partnerName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Rekening Tujuan Donasi</p>
              <p className="text-sm font-medium text-gray-800">{bankName} — {bankAccountNumber} a/n {bankAccountName}</p>
            </div>
            {isUrgent && (
              <div className="rounded-lg bg-red-50 px-3 py-1.5">
                <p className="text-xs font-medium text-red-700">🚨 Ditandai sebagai mendesak</p>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 p-3">
            <p className="text-xs text-gray-500 leading-relaxed">
              Dengan mengajukan campaign ini, saya menyatakan bahwa semua informasi yang diberikan
              adalah benar dan saya bersedia mempertanggungjawabkan penggunaan dana kepada publik
              melalui laporan transparansi di TeraLoka.
            </p>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="mt-6 flex gap-2">
        {step > 0 && (
          <button
            onClick={() => setStep(s => s - 1)}
            className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600"
          >
            ← Kembali
          </button>
        )}
        {step < 3 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={!canNext}
            className="flex-1 rounded-xl bg-[#1B6B4A] py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            Lanjut →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 rounded-xl bg-[#1B6B4A] py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            {loading ? 'Mengajukan...' : 'Ajukan Campaign'}
          </button>
        )}
      </div>
    </div>
  );
}
