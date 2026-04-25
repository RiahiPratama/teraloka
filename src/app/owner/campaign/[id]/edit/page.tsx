'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import ImageUpload from '@/components/ui/ImageUpload';
import {
  ArrowLeft, HeartHandshake, Save, Send, AlertTriangle,
  Stethoscope, CloudRainWind, Flower, Baby, UserRound, Home,
  Loader2, AlertCircle, CheckCircle2, Siren,
  UserCircle2, FileText, Landmark, Info, X,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';
const TOKEN_KEY = 'tl_token';

// ═══════════════════════════════════════════════════════════════
// Constants (matched with wizard for consistency)
// ═══════════════════════════════════════════════════════════════

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
];

const CATEGORIES = [
  { key: 'kesehatan',      label: 'Kesehatan',      Icon: Stethoscope,   color: '#D85A30', desc: 'Biaya pengobatan, operasi, perawatan' },
  { key: 'bencana',        label: 'Bencana Alam',   Icon: CloudRainWind, color: '#378ADD', desc: 'Banjir, gempa, tanah longsor' },
  { key: 'duka',           label: 'Duka / Musibah', Icon: Flower,        color: '#888780', desc: 'Biaya pemakaman, musibah mendadak' },
  { key: 'anak_yatim',     label: 'Anak Yatim',     Icon: Baby,          color: '#E8963A', desc: 'Beasiswa, kebutuhan anak kurang mampu' },
  { key: 'lansia',         label: 'Lansia',         Icon: UserRound,     color: '#BA7517', desc: 'Bantuan orang tua tidak mampu' },
  { key: 'hunian_darurat', label: 'Hunian Darurat', Icon: Home,          color: '#0891B2', desc: 'Rumah rusak, tidak layak huni' },
];

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface Campaign {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'pending_review' | 'active' | 'completed' | 'rejected';
  category?: string;
  cover_image_url?: string;
  beneficiary_name?: string;
  beneficiary_relation?: string;
  description?: string;
  target_amount: number;
  deadline?: string | null;
  is_urgent: boolean;
  is_independent?: boolean;
  partner_name?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_name?: string;
  proof_documents?: string[];
}

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

function formatRupiahInput(val: string): string {
  return val.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function parseRupiahInput(val: string): number {
  return Number(val.replace(/\D/g, '')) || 0;
}

// ═══════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════

export default function EditCampaignPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params?.id as string;
  const { user, token, isLoading: authLoading } = useAuth();

  // Campaign data
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Form state
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [beneficiaryRelation, setBeneficiaryRelation] = useState('');
  const [category, setCategory] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [coverUrl, setCoverUrl] = useState('');
  const [proofDocs, setProofDocs] = useState<string[]>([]);

  const [partnerName, setPartnerName] = useState('');
  const [isIndependent, setIsIndependent] = useState(false);
  const [bankValue, setBankValue] = useState('');
  const [bankCustom, setBankCustom] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');

  // UI state
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);

  const bankName = bankValue === 'Lainnya' ? bankCustom : bankValue;

  // Fetch campaign
  useEffect(() => {
    if (!token || !campaignId) return;
    async function fetchCampaign() {
      setLoading(true);
      setLoadError('');
      try {
        const res = await fetch(`${API}/funding/my/campaigns/${campaignId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          setLoadError(json.error?.message ?? 'Kampanye tidak ditemukan');
          return;
        }

        const c: Campaign = json.data;

        // Block edit for active/completed
        if (['active', 'completed'].includes(c.status)) {
          setLoadError(`Kampanye dengan status "${c.status}" tidak bisa diedit. Hanya admin yang bisa mengubah kampanye aktif/selesai.`);
          setCampaign(c);
          return;
        }

        setCampaign(c);

        // Pre-fill form
        setBeneficiaryName(c.beneficiary_name ?? '');
        setBeneficiaryRelation(c.beneficiary_relation ?? '');
        setCategory(c.category ?? '');
        setTitle(c.title ?? '');
        setDescription(c.description ?? '');
        setTargetAmount(c.target_amount > 0 ? formatRupiahInput(String(c.target_amount)) : '');
        setDeadline(c.deadline ? c.deadline.split('T')[0] : '');
        setIsUrgent(c.is_urgent ?? false);
        setCoverUrl(c.cover_image_url ?? '');
        setProofDocs(c.proof_documents ?? []);
        setPartnerName(c.partner_name ?? '');
        setIsIndependent(c.is_independent ?? false);
        setBankAccountNumber(c.bank_account_number ?? '');
        setBankAccountName(c.bank_account_name ?? '');

        // Bank pre-fill logic
        const matchingBank = BANKS.find(b => b.value === c.bank_name);
        if (matchingBank) {
          setBankValue(matchingBank.value);
        } else if (c.bank_name) {
          setBankValue('Lainnya');
          setBankCustom(c.bank_name);
        }
      } catch {
        setLoadError('Koneksi bermasalah. Refresh halaman ya.');
      } finally {
        setLoading(false);
      }
    }
    fetchCampaign();
  }, [token, campaignId]);

  // Validation
  function validate(): string | null {
    if (!beneficiaryName.trim()) return 'Nama penerima wajib diisi';
    if (!beneficiaryRelation.trim()) return 'Hubungan dengan penerima wajib diisi';
    if (!category) return 'Pilih kategori';
    if (title.trim().length < 10) return 'Judul minimal 10 karakter';
    if (description.trim().length < 30) return 'Cerita minimal 30 karakter';
    const target = parseRupiahInput(targetAmount);
    if (target <= 0) return 'Target dana harus lebih dari 0';
    if (!partnerName.trim()) return 'Nama partner wajib diisi';
    if (!bankName.trim()) return 'Pilih bank';
    if (!bankAccountNumber.trim()) return 'Nomor rekening wajib diisi';
    if (!bankAccountName.trim()) return 'Nama pemilik rekening wajib diisi';
    return null;
  }

  // Save handler
  async function handleSave(options: { thenSubmit?: boolean } = {}) {
    if (!token || !campaign) return;

    const validationError = validate();
    if (validationError) {
      setSaveError(validationError);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);

    try {
      // PATCH save
      const patchRes = await fetch(`${API}/funding/my/campaigns/${campaign.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          cover_image_url: coverUrl || null,
          beneficiary_name: beneficiaryName.trim(),
          beneficiary_relation: beneficiaryRelation.trim(),
          target_amount: parseRupiahInput(targetAmount),
          bank_name: bankName.trim(),
          bank_account_number: bankAccountNumber.trim(),
          bank_account_name: bankAccountName.trim(),
          deadline: deadline || null,
          is_urgent: isUrgent,
          is_independent: isIndependent,
          partner_name: partnerName.trim(),
          proof_documents: proofDocs,
        }),
      });

      const patchJson = await patchRes.json();
      if (!patchRes.ok || !patchJson.success) {
        setSaveError(patchJson.error?.message ?? 'Gagal menyimpan');
        return;
      }

      // If thenSubmit: chain with POST /submit
      if (options.thenSubmit) {
        const submitRes = await fetch(`${API}/funding/my/campaigns/${campaign.id}/submit`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        const submitJson = await submitRes.json();
        if (!submitRes.ok || !submitJson.success) {
          setSaveError(
            `Tersimpan, tapi gagal submit: ${submitJson.error?.message ?? 'Unknown error'}`
          );
          return;
        }
        // Success: redirect to detail
        router.replace(`/owner/campaign/${campaign.id}`);
        return;
      }

      // Plain save: show success
      setSaveSuccess(true);
      setCampaign({ ...campaign, ...patchJson.data });
      // Auto-dismiss success after 3s
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setSaveError('Koneksi bermasalah. Coba lagi.');
    } finally {
      setSaving(false);
      setSubmitModalOpen(false);
    }
  }

  // ── Auth guard ──
  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#003526]" />
      </div>
    );
  }

  if (!user || !token) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-[#003526]/10 flex items-center justify-center">
            <HeartHandshake size={28} className="text-[#003526]" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Login Dulu</h2>
          <p className="mt-2 text-sm text-gray-500">
            Kamu perlu login untuk mengedit kampanye.
          </p>
          <button
            onClick={() => router.push(`/login?redirect=/owner/campaign/${campaignId}/edit`)}
            className="mt-5 w-full rounded-xl bg-[#003526] px-6 py-3 text-sm font-bold text-white"
          >
            Login Sekarang
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f9f9f8]">
        <div className="bg-[#003526] px-4 pt-6 pb-14"></div>
        <div className="mx-auto max-w-lg px-4 -mt-8 space-y-4">
          <div className="h-40 bg-white rounded-2xl animate-pulse" />
          <div className="h-64 bg-white rounded-2xl animate-pulse" />
          <div className="h-40 bg-white rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  // Block edit for active/completed
  if (loadError) {
    return (
      <div className="min-h-screen bg-[#f9f9f8] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle size={28} className="text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Tidak Bisa Diedit</h2>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            {loadError}
          </p>
          <Link
            href={campaign ? `/owner/campaign/${campaign.id}` : '/owner/campaign'}
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-[#003526] px-5 py-2.5 text-sm font-bold text-white"
          >
            <ArrowLeft size={14} />
            Kembali
          </Link>
        </div>
      </div>
    );
  }

  if (!campaign) return null;

  const selectedCat = CATEGORIES.find(c => c.key === category);

  // Submit button label varies by status
  const getPrimaryCTA = () => {
    if (campaign.status === 'draft') return { label: 'Submit untuk Review', icon: Send };
    if (campaign.status === 'rejected') return { label: 'Submit Ulang', icon: Send };
    return null;
  };

  const primaryCTA = getPrimaryCTA();

  return (
    <div className="min-h-screen bg-[#f9f9f8] pb-32">

      {/* Header */}
      <div className="bg-gradient-to-br from-[#003526] via-[#003526] to-[#1B6B4A] px-4 pt-6 pb-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-56 h-56 rounded-full bg-[#EC4899]/15 blur-3xl -translate-y-1/3 translate-x-1/3"></div>

        <div className="relative mx-auto max-w-lg">
          <Link
            href={`/owner/campaign/${campaign.id}`}
            className="inline-flex items-center gap-1.5 text-[#95d3ba] text-xs mb-3 hover:text-white transition-colors"
          >
            <ArrowLeft size={13} />
            Detail Kampanye
          </Link>

          <div className="flex items-center gap-2">
            <HeartHandshake size={18} className="text-[#F472B6] shrink-0" strokeWidth={2.2} />
            <div>
              <p className="text-[10px] font-bold text-[#F472B6] uppercase tracking-widest">
                BADONASI · Edit Kampanye
              </p>
              <h1 className="text-lg font-extrabold text-white leading-tight">
                {campaign.title || '(Tanpa judul)'}
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Form content */}
      <div className="mx-auto max-w-lg px-4 -mt-4 space-y-4">

        {/* Status-based warning banner */}
        {campaign.status === 'pending_review' && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-900 mb-1">
                Kampanye sedang direview
              </p>
              <p className="text-xs text-amber-800 leading-relaxed">
                Perubahan apapun mungkin membuat tim TeraLoka me-review ulang kampanye kamu dari awal. Kalau perubahan mayor, lebih baik tarik kembali dulu lalu edit.
              </p>
            </div>
          </div>
        )}

        {campaign.status === 'rejected' && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
            <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-red-900 mb-1">
                Kampanye ditolak — perbaiki lalu submit ulang
              </p>
              <p className="text-xs text-red-800 leading-relaxed">
                Setelah memperbaiki, klik <strong>Submit Ulang</strong> untuk mengirim kembali ke tim review.
              </p>
            </div>
          </div>
        )}

        {/* Error banner */}
        {saveError && (
          <div className="rounded-2xl bg-red-50 border border-red-100 p-4 flex items-start gap-3">
            <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-bold text-red-700 mb-0.5">Gagal menyimpan</p>
              <p className="text-xs text-red-600">{saveError}</p>
            </div>
            <button onClick={() => setSaveError('')} className="shrink-0 text-red-500 hover:text-red-700">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Success banner */}
        {saveSuccess && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4 flex items-start gap-3">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-bold text-emerald-700 mb-0.5">Tersimpan!</p>
              <p className="text-xs text-emerald-600">Perubahan kampanye berhasil disimpan.</p>
            </div>
          </div>
        )}

        {/* SECTION 1: Data Penerima */}
        <FormSection
          icon={UserCircle2}
          title="Data Penerima Manfaat"
          number="1"
        >
          <FormField label="Nama Penerima Manfaat">
            <input
              type="text"
              value={beneficiaryName}
              onChange={e => setBeneficiaryName(e.target.value)}
              placeholder="Nama lengkap yang dibantu"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#003526]"
            />
          </FormField>

          <FormField label="Hubungan dengan Pengaju">
            <input
              type="text"
              value={beneficiaryRelation}
              onChange={e => setBeneficiaryRelation(e.target.value)}
              placeholder="Contoh: diri sendiri, keluarga, tetangga"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#003526]"
            />
          </FormField>

          <FormField label="Kategori Kemanusiaan">
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(cat => {
                const CatIcon = cat.Icon;
                const isActive = category === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setCategory(cat.key)}
                    className={`flex items-start gap-3 p-3 rounded-xl text-left border-2 transition-all ${
                      isActive ? 'border-[#003526] bg-[#003526]/5' : 'border-transparent bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${cat.color}15`, border: `0.5px solid ${cat.color}40` }}
                    >
                      <CatIcon size={18} strokeWidth={2} style={{ color: cat.color }} />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-bold ${isActive ? 'text-[#003526]' : 'text-gray-700'}`}>
                        {cat.label}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{cat.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </FormField>
        </FormSection>

        {/* SECTION 2: Detail Kampanye */}
        <FormSection
          icon={FileText}
          title="Detail Kampanye"
          number="2"
        >
          <FormField label="Judul Kampanye">
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Contoh: Bantu Ibu Fatima Biaya Operasi"
              maxLength={100}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#003526]"
            />
            <p className="mt-1 text-right text-[10px] text-gray-400">{title.length}/100</p>
          </FormField>

          <FormField label="Cerita & Kebutuhan">
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ceritakan kondisi penerima, kebutuhan mendesak, dan bagaimana dana akan digunakan..."
              rows={6}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#003526] resize-none"
            />
            <p className="mt-1 text-right text-[10px] text-gray-400">
              {description.length} karakter (min. 30)
            </p>
          </FormField>

          <FormField label="Target Dana">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">
                Rp
              </span>
              <input
                type="text"
                value={targetAmount}
                onChange={e => setTargetAmount(formatRupiahInput(e.target.value))}
                placeholder="5.000.000"
                className="w-full rounded-xl border border-gray-200 py-3 pl-12 pr-4 text-sm outline-none focus:border-[#003526]"
              />
            </div>
          </FormField>

          <FormField label="Foto Cover Kampanye">
            <ImageUpload
              bucket="campaigns"
              label=""
              onUpload={(urls: string[]) => setCoverUrl(urls[0] ?? '')}
              existingUrls={coverUrl ? [coverUrl] : []}
            />
          </FormField>

          <FormField label="Dokumen Bukti (minimal 1, bisa lebih)">
            <ImageUpload
              bucket="campaigns"
              label=""
              maxFiles={5}
              maxSizeMB={5}
              onUpload={(urls: string[]) => setProofDocs(urls)}
              existingUrls={proofDocs}
            />
            <p className="mt-1.5 text-[10px] text-gray-500 leading-relaxed">
              Upload foto/dokumen bukti kondisi penerima (KTP, surat dokter, foto lokasi, dll). Maksimal 5 file, 5MB per file.
            </p>
          </FormField>

          <FormField label="Batas Waktu (Opsional)">
            <input
              type="date"
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#003526]"
            />
          </FormField>

          <label className="flex cursor-pointer items-start gap-3 p-3.5 rounded-xl bg-red-50 border border-red-100">
            <input
              type="checkbox"
              checked={isUrgent}
              onChange={e => setIsUrgent(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-red-600"
            />
            <div className="flex items-start gap-2">
              <Siren size={16} className="text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-red-700">Tandai sebagai Mendesak</p>
                <p className="text-[10px] text-red-500 mt-0.5 leading-relaxed">
                  Campaign akan diprioritaskan di halaman utama BADONASI
                </p>
              </div>
            </div>
          </label>
        </FormSection>

        {/* SECTION 3: Rekening Partner */}
        <FormSection
          icon={Landmark}
          title={isIndependent ? 'Rekening Penggalang Pribadi' : 'Rekening Komunitas Partner'}
          number="3"
        >
          <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 mb-3">
            <p className="text-[11px] text-amber-800 leading-relaxed flex items-start gap-2">
              <Info size={13} className="shrink-0 mt-0.5 text-amber-600" />
              Dana donasi masuk langsung ke rekening {isIndependent ? 'penggalang' : 'komunitas partner'}. TeraLoka hanya mempublish laporan dana untuk transparansi publik.
            </p>
          </div>

          {/* Toggle Perorangan / Komunitas */}
          <FormField label="Penggalang Atas Nama">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsIndependent(false);
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

            {isIndependent && (
              <div className="mt-3 rounded-xl bg-blue-50 border border-blue-100 p-3">
                <p className="text-xs text-blue-800 leading-relaxed flex items-start gap-2">
                  <Info size={13} className="shrink-0 mt-0.5 text-blue-600" />
                  Penggalang perorangan akan diverifikasi extra ketat oleh tim TeraLoka. Pastikan dokumen pendukung lengkap dan kuat.
                </p>
              </div>
            )}
          </FormField>

          <FormField label={isIndependent ? 'Nama Penggalang' : 'Nama Komunitas / Lembaga Partner'}>
            <input
              type="text"
              value={partnerName}
              onChange={e => setPartnerName(e.target.value)}
              placeholder={isIndependent ? 'Nama lengkap kamu' : 'Contoh: Yayasan Peduli Maluku Utara'}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#003526]"
            />
          </FormField>

          <FormField label="Bank">
            <select
              value={bankValue}
              onChange={e => setBankValue(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#003526] bg-white appearance-none cursor-pointer"
            >
              <option value="">— Pilih Bank —</option>
              <optgroup label="🏦 Bank Lokal Maluku Utara">
                {BANKS.filter(b => b.local).map(b => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </optgroup>
              <optgroup label="🏛️ Bank Nasional">
                {BANKS.filter(b => !b.local).map(b => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </optgroup>
              <optgroup label="Lainnya">
                <option value="Lainnya">Lainnya (ketik manual)</option>
              </optgroup>
            </select>
            {bankValue === 'Lainnya' && (
              <input
                type="text"
                value={bankCustom}
                onChange={e => setBankCustom(e.target.value)}
                placeholder="Nama bank..."
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#003526]"
              />
            )}
          </FormField>

          <FormField label="Nama Pemilik Rekening">
            <input
              type="text"
              value={bankAccountName}
              onChange={e => setBankAccountName(e.target.value)}
              placeholder="Sesuai nama di buku tabungan"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#003526]"
            />
          </FormField>

          <FormField label="Nomor Rekening">
            <input
              type="text"
              value={bankAccountNumber}
              onChange={e => setBankAccountNumber(e.target.value.replace(/\D/g, ''))}
              placeholder="Nomor rekening tanpa spasi"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#003526] font-mono tracking-wider"
            />
          </FormField>

          {/* Preview */}
          {bankName && bankAccountNumber && bankAccountName && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
              <p className="text-[10px] font-bold text-emerald-700 mb-2 uppercase tracking-wider flex items-center gap-1">
                <Landmark size={11} />
                Preview Rekening Donasi
              </p>
              <p className="text-sm font-black text-gray-900">{bankName}</p>
              <p className="text-lg font-mono font-bold text-[#003526] mt-0.5">
                {bankAccountNumber}
              </p>
              <p className="text-sm text-gray-600">a/n {bankAccountName}</p>
            </div>
          )}
        </FormSection>

      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <div className="mx-auto max-w-lg px-4 py-3 space-y-2">
          {primaryCTA ? (
            // Draft or Rejected: [Save] + [Submit (CTA)]
            (() => {
              const CTAIcon = primaryCTA.icon;
              return (
                <div className="grid grid-cols-5 gap-2">
                  <button
                    onClick={() => handleSave()}
                    disabled={saving}
                    className="col-span-2 flex items-center justify-center gap-1.5 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Simpan
                  </button>
                  <button
                    onClick={() => setSubmitModalOpen(true)}
                    disabled={saving}
                    className="col-span-3 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-gradient-to-r from-[#EC4899] to-[#BE185D] text-sm font-extrabold text-white shadow-md hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <CTAIcon size={14} />}
                    {primaryCTA.label}
                  </button>
                </div>
              );
            })()
          ) : (
            // Pending: just [Save Changes] (single button)
            <button
              onClick={() => handleSave()}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#003526] text-sm font-extrabold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Simpan Perubahan
            </button>
          )}
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {submitModalOpen && primaryCTA && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5">
            <div className="mx-auto w-12 h-12 rounded-full bg-pink-50 flex items-center justify-center mb-3">
              <Send size={22} className="text-[#BE185D]" />
            </div>
            <h3 className="text-base font-bold text-gray-900 text-center mb-2">
              {campaign.status === 'rejected' ? 'Submit Ulang?' : 'Submit untuk Review?'}
            </h3>
            <p className="text-xs text-gray-600 text-center mb-4 leading-relaxed">
              {campaign.status === 'rejected'
                ? 'Perubahan akan disimpan dulu, lalu dikirim ulang ke tim TeraLoka. Pastikan sudah diperbaiki sesuai feedback sebelumnya.'
                : 'Perubahan akan disimpan dulu, lalu kampanye dikirim ke tim TeraLoka untuk direview. Proses review biasanya 1-2 hari kerja.'}
            </p>

            {saveError && (
              <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 mb-3">
                <p className="text-xs text-red-700">{saveError}</p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setSubmitModalOpen(false)}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={() => handleSave({ thenSubmit: true })}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-[#003526] text-sm font-bold text-white hover:opacity-90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {saving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    {primaryCTA.label}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Subcomponents
// ═══════════════════════════════════════════════════════════════

function FormSection({
  icon: Icon,
  title,
  number,
  children,
}: {
  icon: any;
  title: string;
  number: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 bg-gradient-to-r from-[#003526]/5 to-transparent flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-[#003526] text-white flex items-center justify-center text-[10px] font-extrabold shrink-0">
          {number}
        </div>
        <Icon size={15} className="text-[#003526]" />
        <h2 className="text-sm font-bold text-gray-800">{title}</h2>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">
        {label}
      </label>
      {children}
    </div>
  );
}
