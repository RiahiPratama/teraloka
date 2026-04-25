'use client';

import { useState } from 'react';
import ImageUpload from '@/components/ui/ImageUpload';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Stethoscope, CloudRainWind, Flower, Baby, UserRound, Home, Siren } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

const BANKS = [
  { value: 'Bank Maluku Utara', label: '🏦 Bank Maluku Utara (Lokal)', local: true },
  { value: 'BRI', label: 'BRI — Bank Rakyat Indonesia' },
  { value: 'BNI', label: 'BNI — Bank Negara Indonesia' },
  { value: 'Bank Mandiri', label: 'Bank Mandiri' },
  { value: 'BSI', label: 'BSI — Bank Syariah Indonesia' },
  { value: 'BCA', label: 'BCA — Bank Central Asia' },
  { value: 'BTN', label: 'BTN — Bank Tabungan Negara' },
  { value: 'CIMB Niaga', label: 'CIMB Niaga' },
  { value: 'Bank Danamon', label: 'Bank Danamon' },
  { value: 'Permata Bank', label: 'Permata Bank' },
  { value: 'Bank Muamalat', label: 'Bank Muamalat' },
  { value: 'Bank Mega', label: 'Bank Mega' },
  { value: 'OCBC NISP', label: 'OCBC NISP' },
  { value: 'Maybank', label: 'Maybank Indonesia' },
  { value: 'Bank Bukopin', label: 'Bank Bukopin' },
  { value: 'Bank Maluku', label: 'Bank Maluku' },
  { value: 'Bank Papua', label: 'Bank Papua' },
  { value: 'BPD Maluku Utara', label: 'BPD Maluku Utara' },
  { value: 'Lainnya', label: 'Lainnya (ketik manual)' },
];

// Kategori kemanusiaan — icon pakai Lucide (modern, konsisten dengan seluruh app).
// Warna tint per kategori biar gampang dikenali secara visual.
const CATEGORIES = [
  { key: 'kesehatan',      label: 'Kesehatan',      Icon: Stethoscope,   color: '#D85A30', desc: 'Biaya pengobatan, operasi, perawatan' },
  { key: 'bencana',        label: 'Bencana Alam',   Icon: CloudRainWind, color: '#378ADD', desc: 'Banjir, gempa, tanah longsor' },
  { key: 'duka',           label: 'Duka / Musibah', Icon: Flower,        color: '#888780', desc: 'Biaya pemakaman, musibah mendadak' },
  { key: 'anak_yatim',     label: 'Anak Yatim',     Icon: Baby,          color: '#E8963A', desc: 'Beasiswa, kebutuhan anak kurang mampu' },
  { key: 'lansia',         label: 'Lansia',         Icon: UserRound,     color: '#BA7517', desc: 'Bantuan orang tua tidak mampu' },
  { key: 'hunian_darurat', label: 'Hunian Darurat', Icon: Home,          color: '#0891B2', desc: 'Rumah rusak, tidak layak huni' },
];

const STEPS = [
  { label: 'Data Penerima', icon: 'person' },
  { label: 'Detail Campaign', icon: 'campaign' },
  { label: 'Rekening Partner', icon: 'account_balance' },
  { label: 'Review', icon: 'fact_check' },
];

function formatRupiah(val: string) {
  return val.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export default function NewCampaignPage() {
  const router = useRouter();
  const { user, token } = useAuth();

  const [step, setStep]       = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [coverUrl, setCoverUrl]   = useState('');
  const [proofDocs, setProofDocs] = useState<string[]>([]);   // ⭐ NEW: dokumen pendukung

  // Step 0
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [beneficiaryRelation, setBeneficiaryRelation] = useState('');
  const [category, setCategory] = useState('');

  // Step 1
  const [title, setTitle]           = useState('');
  const [description, setDescription] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline]     = useState('');
  const [isUrgent, setIsUrgent]     = useState(false);

  // Step 2
  const [isIndependent, setIsIndependent] = useState(false); // ⭐ NEW: penggalang perorangan/komunitas
  const [partnerName, setPartnerName]     = useState('');
  const [bankValue, setBankValue]         = useState('');
  const [bankCustom, setBankCustom]       = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');

  const bankName = bankValue === 'Lainnya' ? bankCustom : bankValue;

  if (!user || !token) return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-[#003526]/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-[#003526] text-3xl">lock</span>
        </div>
        <h2 className="text-lg font-bold text-gray-900">Login Diperlukan</h2>
        <p className="mt-2 text-sm text-gray-500">Kamu harus login untuk mengajukan campaign BADONASI.</p>
        <button onClick={() => router.push('/login')} className="mt-5 w-full rounded-xl bg-[#003526] px-6 py-3 text-sm font-bold text-white">Login Sekarang</button>
      </div>
    </div>
  );

  // ⭐ Success state — redirect ke dashboard penggalang (BUKAN /fundraising)
  if (submitted) return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-[#003526] flex items-center justify-center">
          <span className="material-symbols-outlined text-white text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Campaign Diajukan!</h2>
        <p className="mt-2 text-sm text-gray-500 leading-relaxed">
          Tim TeraLoka akan memverifikasi dalam 1×24 jam. Setelah disetujui, campaign tampil di BADONASI.
        </p>
        <div className="mt-3 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-left">
          <p className="text-xs text-amber-700 flex items-start gap-2">
            <span className="material-symbols-outlined text-sm shrink-0">info</span>
            Dana donasi masuk ke rekening komunitas partner. Laporan penggunaan dana wajib diupload secara berkala.
          </p>
        </div>
        <div className="mt-5 space-y-2">
          {/* ⭐ Primary CTA — ke dashboard penggalang */}
          <button
            onClick={() => router.push('/owner/campaign')}
            className="w-full rounded-xl bg-[#003526] py-3 text-sm font-bold text-white hover:opacity-90 transition-opacity"
          >
            Lihat Kampanye Saya →
          </button>
          {/* Secondary — ke BADONASI public */}
          <button
            onClick={() => router.push('/fundraising')}
            className="w-full rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Kembali ke BADONASI
          </button>
        </div>
      </div>
    </div>
  );

  const handleSubmit = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/funding/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title, description, category,
          cover_image_url: coverUrl || null,
          proof_documents: proofDocs,       // ⭐ NEW: kirim dokumen pendukung
          beneficiary_name: beneficiaryName,
          beneficiary_relation: beneficiaryRelation,
          target_amount: Number(targetAmount.replace(/\D/g, '')),
          bank_name: bankName,
          bank_account_number: bankAccountNumber,
          bank_account_name: bankAccountName,
          deadline: deadline || null,
          is_urgent: isUrgent,
          is_independent: isIndependent,   // ⭐ NEW: perorangan/komunitas flag
          partner_name: partnerName,
        }),
      });
      const data = await res.json();
      if (res.ok) setSubmitted(true);
      else setError(data.error?.message ?? 'Gagal mengajukan campaign.');
    } catch { setError('Koneksi bermasalah. Coba lagi.'); }
    finally { setLoading(false); }
  };

  // ⭐ Step 1 validation expanded: cover + proof_documents required
  const canNext = [
    !!(beneficiaryName.trim() && beneficiaryRelation.trim() && category),
    !!(
      title.trim().length >= 10 &&
      description.trim().length >= 30 &&
      targetAmount &&
      coverUrl &&                  // ⭐ Cover wajib
      proofDocs.length >= 1        // ⭐ Min 1 dokumen pendukung
    ),
    !!(partnerName.trim() && bankName.trim() && bankAccountNumber.trim() && bankAccountName.trim()),
    true,
  ][step];

  const selectedCat = CATEGORIES.find(c => c.key === category);

  return (
    <div className="min-h-screen bg-[#f9f9f8]">
      {/* Header */}
      <div className="bg-[#003526] px-6 pt-8 pb-10">
        <div className="mx-auto max-w-lg">
          <button onClick={() => router.back()} className="flex items-center gap-1 text-[#95d3ba] text-sm mb-4 hover:text-white transition-colors">
            <span className="material-symbols-outlined text-sm">arrow_back</span> Kembali
          </button>
          <h1 className="text-xl font-extrabold text-white">Ajukan Campaign</h1>
          <p className="text-sm text-[#95d3ba] mt-1">BADONASI — Galang Dana Kemanusiaan Maluku Utara</p>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 -mt-4 pb-24">

        {/* Step indicator */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <div className="flex items-center">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    i < step ? 'bg-[#003526] text-white' :
                    i === step ? 'border-2 border-[#003526] text-[#003526]' :
                    'bg-gray-100 text-gray-400'
                  }`}>
                    {i < step ? <span className="material-symbols-outlined text-sm">check</span> : i + 1}
                  </div>
                  <span className={`text-xs mt-1 font-medium hidden sm:block whitespace-nowrap ${i === step ? 'text-[#003526]' : 'text-gray-400'}`}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-1 mb-4 ${i < step ? 'bg-[#003526]' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
          <p className="text-xs text-center text-[#003526] font-semibold mt-2 sm:hidden">
            Langkah {step + 1}: {STEPS[step].label}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5">

            {/* Step 0 */}
            {step === 0 && (
              <div className="space-y-5">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Data Penerima Manfaat</p>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Nama Penerima Manfaat</label>
                  <input type="text" value={beneficiaryName} onChange={e => setBeneficiaryName(e.target.value)}
                    placeholder="Nama lengkap yang dibantu"
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#003526]" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Hubungan dengan Pengaju</label>
                  <input type="text" value={beneficiaryRelation} onChange={e => setBeneficiaryRelation(e.target.value)}
                    placeholder="Contoh: diri sendiri, keluarga, tetangga, warga"
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#003526]" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 block">Kategori Kemanusiaan</label>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map(cat => {
                      const CatIcon = cat.Icon;
                      const isActive = category === cat.key;
                      return (
                        <button key={cat.key} onClick={() => setCategory(cat.key)}
                          className={`flex items-start gap-3 p-3.5 rounded-xl text-left border-2 transition-all ${
                            isActive ? 'border-[#003526] bg-[#003526]/5' : 'border-transparent bg-gray-50 hover:bg-gray-100'
                          }`}>
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: `${cat.color}15`, border: `0.5px solid ${cat.color}40` }}>
                            <CatIcon size={18} strokeWidth={2} style={{ color: cat.color }} />
                          </div>
                          <div className="min-w-0">
                            <p className={`text-xs font-bold ${isActive ? 'text-[#003526]' : 'text-gray-700'}`}>{cat.label}</p>
                            <p className="text-xs text-gray-400 mt-0.5 leading-tight">{cat.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Step 1 */}
            {step === 1 && (
              <div className="space-y-5">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Detail Campaign</p>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Judul Campaign</label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                    placeholder="Contoh: Bantu Ibu Fatima Biaya Operasi"
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#003526]" />
                  <p className="mt-1 text-right text-xs text-gray-400">{title.length}/100</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Cerita & Kebutuhan</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)}
                    placeholder="Ceritakan kondisi penerima, kebutuhan mendesak, dan bagaimana dana akan digunakan..."
                    rows={6} className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#003526] resize-none" />
                  <p className="mt-1 text-right text-xs text-gray-400">{description.length} karakter (min. 30)</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Target Dana</label>
                  <div className="relative mt-2">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">Rp</span>
                    <input type="text" value={targetAmount} onChange={e => setTargetAmount(formatRupiah(e.target.value))}
                      placeholder="5.000.000"
                      className="w-full rounded-xl border border-gray-200 py-3 pl-12 pr-4 text-sm outline-none focus:border-[#003526]" />
                  </div>
                </div>

                {/* ⭐ Foto Cover — required */}
                <div>
                  <ImageUpload bucket="campaigns" label="Foto Cover Campaign"
                    onUpload={(urls: string[]) => setCoverUrl(urls[0] ?? '')}
                    existingUrls={coverUrl ? [coverUrl] : []} />
                  <p className="mt-1.5 text-xs text-gray-500">
                    Foto utama yang ditampilkan di halaman kampanye (wajib).
                  </p>
                </div>

                {/* ⭐ NEW: Dokumen Pendukung — required min 1 */}
                <div>
                  <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 mb-3">
                    <p className="text-xs text-blue-800 leading-relaxed flex items-start gap-2">
                      <span className="material-symbols-outlined text-sm shrink-0 text-blue-600">verified_user</span>
                      <span>
                        <strong className="font-bold">Dokumen Pendukung (Wajib)</strong>
                        <br />
                        Upload bukti kondisi penerima untuk verifikasi tim TeraLoka.
                        Contoh: KTP, surat dokter, foto lokasi, surat kelurahan, dll.
                      </span>
                    </p>
                  </div>
                  <ImageUpload bucket="campaigns" label="Upload Dokumen (minimal 1, bisa lebih)"
                    maxFiles={5} maxSizeMB={5}
                    onUpload={(urls: string[]) => setProofDocs(urls)}
                    existingUrls={proofDocs} />
                  {proofDocs.length > 0 && (
                    <p className="mt-2 text-xs text-emerald-700 font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      {proofDocs.length} dokumen tersimpan
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                    Batas Waktu <span className="text-gray-300 font-normal">(Opsional)</span>
                  </label>
                  <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#003526]" />
                </div>
                <label className="flex cursor-pointer items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-100">
                  <input type="checkbox" checked={isUrgent} onChange={e => setIsUrgent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-red-600" />
                  <div>
                    <p className="text-sm font-bold text-red-700">🚨 Tandai sebagai Mendesak</p>
                    <p className="text-xs text-red-500 mt-0.5">Campaign akan diprioritaskan di halaman utama BADONASI</p>
                  </div>
                </label>
              </div>
            )}

            {/* Step 2 — Bank dropdown */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                    {isIndependent ? 'Rekening Penggalang Pribadi' : 'Rekening Komunitas Partner'}
                  </p>
                  <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 mt-3">
                    <p className="text-xs text-amber-800 leading-relaxed flex items-start gap-2">
                      <span className="material-symbols-outlined text-sm shrink-0 text-amber-600">info</span>
                      Dana donasi masuk langsung ke rekening {isIndependent ? 'penggalang' : 'komunitas partner'}. TeraLoka hanya mempublish laporan dana untuk transparansi publik.
                    </p>
                  </div>
                </div>

                {/* ⭐ NEW: Toggle Perorangan / Komunitas */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">
                    Penggalang Atas Nama
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsIndependent(false);
                        // Clear partner_name kalau pindah dari perorangan ke komunitas
                        if (isIndependent) setPartnerName('');
                      }}
                      className={`flex flex-col items-center gap-1.5 p-3.5 rounded-xl text-center border-2 transition-all ${
                        !isIndependent ? 'border-[#003526] bg-[#003526]/5' : 'border-transparent bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <span className="text-2xl">🏢</span>
                      <p className={`text-xs font-bold ${!isIndependent ? 'text-[#003526]' : 'text-gray-700'}`}>
                        Komunitas / Lembaga
                      </p>
                      <p className="text-[10px] text-gray-400 leading-tight">
                        Yayasan, panti, ormas, dll
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsIndependent(true);
                        // Pre-fill partner_name dengan nama user kalau pindah ke perorangan
                        if (!isIndependent && user?.name) setPartnerName(user.name);
                      }}
                      className={`flex flex-col items-center gap-1.5 p-3.5 rounded-xl text-center border-2 transition-all ${
                        isIndependent ? 'border-[#003526] bg-[#003526]/5' : 'border-transparent bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <span className="text-2xl">👤</span>
                      <p className={`text-xs font-bold ${isIndependent ? 'text-[#003526]' : 'text-gray-700'}`}>
                        Perorangan / Pribadi
                      </p>
                      <p className="text-[10px] text-gray-400 leading-tight">
                        Saya sendiri yang menggalang
                      </p>
                    </button>
                  </div>

                  {/* Reminder buat perorangan */}
                  {isIndependent && (
                    <div className="mt-3 rounded-xl bg-blue-50 border border-blue-100 p-3">
                      <p className="text-xs text-blue-800 leading-relaxed flex items-start gap-2">
                        <span className="material-symbols-outlined text-sm shrink-0 text-blue-600">verified_user</span>
                        Penggalang perorangan akan diverifikasi extra ketat oleh tim TeraLoka. Pastikan dokumen pendukung lengkap dan kuat.
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                    {isIndependent ? 'Nama Penggalang' : 'Nama Komunitas / Lembaga Partner'}
                  </label>
                  <input type="text" value={partnerName} onChange={e => setPartnerName(e.target.value)}
                    placeholder={isIndependent ? 'Nama lengkap kamu' : 'Contoh: Yayasan Peduli Maluku Utara'}
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#003526]" />
                </div>

                {/* Bank dropdown */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Bank</label>
                  <select value={bankValue} onChange={e => setBankValue(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#003526] bg-white appearance-none cursor-pointer">
                    <option value="">— Pilih Bank —</option>
                    <optgroup label="🏦 Bank Lokal Maluku Utara">
                      {BANKS.filter(b => b.local).map(b => (
                        <option key={b.value} value={b.value}>{b.label}</option>
                      ))}
                    </optgroup>
                    <optgroup label="🏛️ Bank Nasional">
                      {BANKS.filter(b => !b.local && b.value !== 'Lainnya').map(b => (
                        <option key={b.value} value={b.value}>{b.label}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Lainnya">
                      <option value="Lainnya">Lainnya (ketik manual)</option>
                    </optgroup>
                  </select>
                  {bankValue === 'Lainnya' && (
                    <input type="text" value={bankCustom} onChange={e => setBankCustom(e.target.value)}
                      placeholder="Nama bank..."
                      className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#003526]" />
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Nama Pemilik Rekening</label>
                  <input type="text" value={bankAccountName} onChange={e => setBankAccountName(e.target.value)}
                    placeholder="Sesuai nama di buku tabungan"
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#003526]" />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Nomor Rekening</label>
                  <input type="text" value={bankAccountNumber}
                    onChange={e => setBankAccountNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="Nomor rekening tanpa spasi"
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#003526] font-mono tracking-wider" />
                </div>

                {/* Preview rekening */}
                {bankName && bankAccountNumber && bankAccountName && (
                  <div className="rounded-xl bg-green-50 border border-green-100 p-4">
                    <p className="text-xs font-bold text-green-700 mb-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">account_balance</span>
                      Preview Rekening Donasi
                    </p>
                    <p className="text-base font-black text-gray-900">{bankName}</p>
                    <p className="text-xl font-mono font-bold text-[#003526] mt-0.5">{bankAccountNumber}</p>
                    <p className="text-sm text-gray-600">a/n {bankAccountName}</p>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Review */}
            {step === 3 && (
              <div className="space-y-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Review Campaign</p>
                {selectedCat && (() => {
                  const SelectedIcon = selectedCat.Icon;
                  return (
                    <div className="flex items-center gap-3 p-3 bg-[#003526]/5 rounded-xl">
                      <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: `${selectedCat.color}15`, border: `0.5px solid ${selectedCat.color}40` }}>
                        <SelectedIcon size={22} strokeWidth={2} style={{ color: selectedCat.color }} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Kategori</p>
                        <p className="text-sm font-bold text-[#003526]">{selectedCat.label}</p>
                      </div>
                    </div>
                  );
                })()}
                <div className="rounded-xl border border-gray-100 bg-gray-50 divide-y divide-gray-100">
                  {[
                    { label: 'Penerima Manfaat', value: `${beneficiaryName} (${beneficiaryRelation})` },
                    { label: 'Judul Campaign', value: title },
                    { label: 'Target Dana', value: `Rp ${targetAmount}` },
                    { label: 'Tipe Penggalang', value: isIndependent ? '👤 Perorangan / Pribadi' : '🏢 Komunitas / Lembaga' },
                    { label: isIndependent ? 'Nama Penggalang' : 'Komunitas Partner', value: partnerName },
                    { label: 'Rekening Donasi', value: `${bankName} ${bankAccountNumber} a/n ${bankAccountName}` },
                    { label: 'Dokumen Pendukung', value: `${proofDocs.length} dokumen terupload` },
                    ...(deadline ? [{ label: 'Batas Waktu', value: new Date(deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) }] : []),
                  ].map(item => (
                    <div key={item.label} className="px-4 py-3">
                      <p className="text-xs text-gray-400">{item.label}</p>
                      <p className="text-sm font-semibold text-gray-800 mt-0.5">{item.value}</p>
                    </div>
                  ))}
                </div>
                {isUrgent && (
                  <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 flex items-center gap-2">
                    <Siren size={16} strokeWidth={2.2} style={{ color: '#dc2626' }} />
                    <p className="text-xs font-bold text-red-700">Ditandai sebagai Mendesak</p>
                  </div>
                )}
                <div className="rounded-xl border border-gray-100 p-4">
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Dengan mengajukan campaign ini, saya menyatakan semua informasi benar dan bersedia mempertanggungjawabkan penggunaan dana kepada publik melalui laporan transparansi di TeraLoka.
                  </p>
                </div>
                {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
              </div>
            )}
          </div>

          {/* Navigation buttons */}
          <div className="px-5 pb-5 flex gap-2">
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)}
                className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50">
                ← Kembali
              </button>
            )}
            {step < 3 ? (
              <button onClick={() => setStep(s => s + 1)} disabled={!canNext}
                className="flex-1 rounded-xl bg-[#003526] py-3 text-sm font-bold text-white disabled:opacity-40">
                Lanjut →
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={loading}
                className="flex-1 rounded-xl bg-[#003526] py-3 text-sm font-bold text-white disabled:opacity-50">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Mengajukan...
                  </span>
                ) : '💚 Ajukan Campaign'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
