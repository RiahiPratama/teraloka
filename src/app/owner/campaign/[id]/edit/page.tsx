'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import ImageUpload from '@/components/ui/ImageUpload';
import {
  ArrowLeft, ArrowRight, HeartHandshake, Save, Send, AlertTriangle,
  Stethoscope, CloudRainWind, Flower, Baby, UserRound, Home,
  Loader2, AlertCircle, CheckCircle2, Siren, Edit3,
  UserCircle2, FileText, Landmark, Info, X, Check,
  ShieldCheck, Lock,
} from 'lucide-react';
import FeeModeSection from '@/components/owner/campaign/FeeModeSection';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';
const TOKEN_KEY = 'tl_token';

// ═══════════════════════════════════════════════════════════════
// Constants
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

const STEPS = [
  { num: 1, label: 'Penerima',   icon: UserCircle2, desc: 'Data penerima manfaat' },
  { num: 2, label: 'Detail',     icon: FileText,    desc: 'Cerita & target dana' },
  { num: 3, label: 'Rekening',   icon: Landmark,    desc: 'Bank & operasional' },
  { num: 4, label: 'Review',     icon: CheckCircle2, desc: 'Tinjau & ajukan' },
] as const;

type StepNum = 1 | 2 | 3 | 4;

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
  beneficiary_id_documents?: string[];
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
  operational_fee_mode?: 'volunteer' | 'professional';
  penggalang_fee_percent?: number;
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

function formatRupiah(n: number): string {
  return 'Rp ' + n.toLocaleString('id-ID');
}

// ═══════════════════════════════════════════════════════════════
// Main Page — Wizard 4-Step
// ═══════════════════════════════════════════════════════════════

export default function EditCampaignPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params?.id as string;
  const { user, token, isLoading: authLoading } = useAuth();

  // Wizard state
  const [currentStep, setCurrentStep] = useState<StepNum>(1);

  // Campaign state
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Step 1 — Penerima
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [beneficiaryRelation, setBeneficiaryRelation] = useState('');
  const [category, setCategory] = useState('');
  const [idDocs, setIdDocs] = useState<string[]>([]);

  // Step 2 — Detail
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [coverUrl, setCoverUrl] = useState('');
  const [proofDocs, setProofDocs] = useState<string[]>([]);

  // Step 3 — Rekening
  const [partnerName, setPartnerName] = useState('');
  const [isIndependent, setIsIndependent] = useState(false);
  const [bankValue, setBankValue] = useState('');
  const [bankCustom, setBankCustom] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [operationalFeeMode, setOperationalFeeMode] = useState<'volunteer' | 'professional'>('volunteer');
  const [penggalangFeePercent, setPenggalangFeePercent] = useState<number>(0);

  // Save state
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [stepError, setStepError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);

  // Bank computed value
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

        if (['active', 'completed'].includes(c.status)) {
          setLoadError(`Kampanye dengan status "${c.status}" tidak bisa diedit. Hanya admin yang bisa mengubah kampanye aktif/selesai.`);
          setCampaign(c);
          return;
        }

        setCampaign(c);

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
        setIdDocs(c.beneficiary_id_documents ?? []);
        setPartnerName(c.partner_name ?? '');
        setIsIndependent(c.is_independent ?? false);
        setBankAccountNumber(c.bank_account_number ?? '');
        setBankAccountName(c.bank_account_name ?? '');

        const matchingBank = BANKS.find(b => b.value === c.bank_name);
        if (matchingBank) {
          setBankValue(matchingBank.value);
        } else if (c.bank_name) {
          setBankValue('Lainnya');
          setBankCustom(c.bank_name);
        }

        setOperationalFeeMode((c.operational_fee_mode as 'volunteer' | 'professional') ?? 'volunteer');
        setPenggalangFeePercent(Number(c.penggalang_fee_percent ?? 0));
      } catch {
        setLoadError('Koneksi bermasalah. Refresh halaman ya.');
      } finally {
        setLoading(false);
      }
    }
    fetchCampaign();
  }, [token, campaignId]);

  // ─── Per-step Validation ───────────────────────────────────────
  function validateStep1(): string | null {
    if (!beneficiaryName.trim()) return 'Nama penerima manfaat wajib diisi';
    if (!beneficiaryRelation.trim()) return 'Hubungan dengan pengaju wajib diisi';
    if (!category) return 'Pilih kategori kemanusiaan';
    if (idDocs.length < 1) return 'Identitas penerima wajib (KTP/KK/Akta — minimal 1 file)';
    return null;
  }

  function validateStep2(): string | null {
    if (title.trim().length < 10) return 'Judul kampanye minimal 10 karakter';
    if (description.trim().length < 30) return 'Cerita & kebutuhan minimal 30 karakter';
    const target = parseRupiahInput(targetAmount);
    if (target <= 0) return 'Target dana harus lebih dari Rp 0';
    if (!coverUrl) return 'Foto cover kampanye wajib diupload';
    if (proofDocs.length < 1) return 'Dokumen bukti wajib (minimal 1 file)';
    return null;
  }

  function validateStep3(): string | null {
    if (!partnerName.trim()) {
      return isIndependent ? 'Nama penggalang wajib diisi' : 'Nama komunitas/lembaga wajib diisi';
    }
    if (!bankName.trim()) return 'Pilih bank';
    if (!bankAccountNumber.trim()) return 'Nomor rekening wajib diisi';
    if (!bankAccountName.trim()) return 'Nama pemilik rekening wajib diisi';
    return null;
  }

  function validateAll(): string | null {
    return validateStep1() ?? validateStep2() ?? validateStep3();
  }

  // ─── Step status checks ────────────────────────────────────────
  const stepCompleted = useMemo(() => ({
    1: validateStep1() === null,
    2: validateStep2() === null,
    3: validateStep3() === null,
  }), [
    beneficiaryName, beneficiaryRelation, category, idDocs,
    title, description, targetAmount, coverUrl, proofDocs,
    partnerName, bankName, bankAccountNumber, bankAccountName, isIndependent,
  ]);

  // ─── Save handler (PATCH backend) ──────────────────────────────
  async function handleSave(options: { thenSubmit?: boolean; silent?: boolean } = {}) {
    if (!token || !campaign) return;

    const validationError = options.thenSubmit ? validateAll() : null;
    if (validationError) {
      setSaveError(validationError);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setSubmitModalOpen(false);
      return;
    }

    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);

    try {
      const patchRes = await fetch(`${API}/funding/my/campaigns/${campaign.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim() || undefined,
          description: description.trim() || undefined,
          category: category || undefined,
          cover_image_url: coverUrl || null,
          beneficiary_name: beneficiaryName.trim() || undefined,
          beneficiary_relation: beneficiaryRelation.trim() || undefined,
          target_amount: parseRupiahInput(targetAmount),
          bank_name: bankName.trim() || undefined,
          bank_account_number: bankAccountNumber.trim() || undefined,
          bank_account_name: bankAccountName.trim() || undefined,
          deadline: deadline || null,
          is_urgent: isUrgent,
          is_independent: isIndependent,
          partner_name: partnerName.trim() || undefined,
          proof_documents: proofDocs,
          beneficiary_id_documents: idDocs,
          operational_fee_mode: operationalFeeMode,
          penggalang_fee_percent: penggalangFeePercent,
        }),
      });

      const patchJson = await patchRes.json();
      if (!patchRes.ok || !patchJson.success) {
        setSaveError(patchJson.error?.message ?? 'Gagal menyimpan');
        return false;
      }

      if (options.thenSubmit) {
        const submitRes = await fetch(`${API}/funding/my/campaigns/${campaign.id}/submit`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        const submitJson = await submitRes.json();
        if (!submitRes.ok || !submitJson.success) {
          setSaveError(`Tersimpan, namun gagal diajukan: ${submitJson.error?.message ?? 'Unknown error'}`);
          return false;
        }
        router.replace(`/owner/campaign/${campaign.id}`);
        return true;
      }

      if (!options.silent) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      }
      setCampaign({ ...campaign, ...patchJson.data });
      return true;
    } catch {
      setSaveError('Koneksi bermasalah. Coba lagi.');
      return false;
    } finally {
      setSaving(false);
      setSubmitModalOpen(false);
    }
  }

  // ─── Step navigation ───────────────────────────────────────────
  async function handleNextStep() {
    setStepError('');

    let validator: (() => string | null) | null = null;
    if (currentStep === 1) validator = validateStep1;
    else if (currentStep === 2) validator = validateStep2;
    else if (currentStep === 3) validator = validateStep3;

    if (validator) {
      const err = validator();
      if (err) {
        setStepError(err);
        return;
      }
    }

    // Auto-save on advance (silent)
    const saved = await handleSave({ silent: true });
    if (!saved) return;

    if (currentStep < 4) {
      setCurrentStep((s) => (s + 1) as StepNum);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function handlePrevStep() {
    setStepError('');
    if (currentStep > 1) {
      setCurrentStep((s) => (s - 1) as StepNum);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function jumpToStep(step: StepNum) {
    setStepError('');
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
            <UserCircle2 size={32} className="text-[#003526]" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Login Dulu</h2>
          <p className="mt-2 text-sm text-gray-600">
            Anda perlu login terlebih dahulu sebelum dapat mengedit kampanye.
          </p>
          <Link
            href="/login"
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-[#003526] px-6 py-2.5 text-sm font-semibold text-white"
          >
            Login Sekarang
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#003526]" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle size={32} className="text-red-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Tidak Bisa Diedit</h2>
          <p className="mt-2 text-sm text-gray-600">{loadError}</p>
          <Link
            href="/owner/campaign"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#003526] px-6 py-2.5 text-sm font-semibold text-white"
          >
            <ArrowLeft size={16} /> Kembali ke Kampanye Saya
          </Link>
        </div>
      </div>
    );
  }

  if (!campaign) return null;

  const submitButtonLabel =
    campaign.status === 'pending_review' ? 'Simpan Perubahan' :
    campaign.status === 'rejected' ? 'Ajukan Ulang' :
    'Ajukan untuk Peninjauan';
  const isPendingReview = campaign.status === 'pending_review';

  return (
    <div className="min-h-screen bg-[#f9f9f8] pb-32">
      {/* Hero — match BADONASI public + NewInfo style (pb-24 untuk floating pill space) */}
      <div className="bg-gradient-to-br from-[#003526] via-[#003526] to-[#1B6B4A] text-white px-4 pt-8 pb-24 relative overflow-hidden">
        {/* Pink accent decoration */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-[#EC4899] rounded-full opacity-10 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#EC4899] rounded-full opacity-5 blur-3xl"></div>

        <div className="max-w-2xl mx-auto relative z-10">
          <Link
            href={`/owner/campaign/${campaign.id}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-white/80 hover:text-white mb-4"
          >
            <ArrowLeft size={16} /> Detail Kampanye
          </Link>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#EC4899]/20 backdrop-blur-sm flex items-center justify-center shrink-0 border border-[#EC4899]/30">
              <HeartHandshake size={24} className="text-[#F472B6]" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-extrabold text-[#F472B6] uppercase tracking-widest mb-0.5">
                BADONASI · Edit Kampanye
              </p>
              <h1 className="text-xl font-extrabold truncate">{campaign.title || 'Kampanye Baru'}</h1>
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          FLOATING SECTION: Trust Pill + Stepper Bridge
          ════════════════════════════════════════════════════════════
          Design system:
          • Pill: trust info (status-aware), pulled up from hero -mt-14
          • Stepper: 4 circles MELAYANG keluar pill bottom (-mt-5)
                     dengan white ring (ilusi menggantung di udara)
          • Body content: pt-2 untuk slight gap dari stepper
      */}
      <div className="max-w-2xl mx-auto px-4 -mt-14 relative z-20">

        {/* Trust Pill — status-aware */}
        <div className="relative z-20">
          {campaign.status === 'draft' && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 px-4 py-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                <ShieldCheck size={20} className="text-emerald-600" strokeWidth={2.2} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-gray-800">Data tersimpan otomatis</p>
                <p className="text-xs text-gray-400">Identitas penerima dirahasiakan & terenkripsi.</p>
              </div>
            </div>
          )}

          {campaign.status === 'pending_review' && (
            <div className="bg-white rounded-2xl shadow-md border border-amber-200 px-4 py-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                <Loader2 size={20} className="text-amber-600 animate-spin" strokeWidth={2.2} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-gray-800">Sedang ditinjau admin TeraLoka</p>
                <p className="text-xs text-gray-400">Hasil peninjauan dalam 1-2 hari kerja.</p>
              </div>
            </div>
          )}

          {campaign.status === 'rejected' && (
            <div className="bg-white rounded-2xl shadow-md border border-red-200 px-4 py-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <AlertCircle size={20} className="text-red-600" strokeWidth={2.2} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-gray-800">Perlu diperbaiki sebelum diajukan ulang</p>
                <p className="text-xs text-gray-400">Lihat masukan admin di halaman detail kampanye.</p>
              </div>
            </div>
          )}
        </div>

        {/* ────────────────────────────────────────────────────────
            STEPPER BRIDGE — floating between pill & content
            ────────────────────────────────────────────────────────
            • -mt-5 → overlap pill bottom edge (visual hanging)
            • z-30 → above pill (z-20) and content (z-0)
            • White ring 4px → "menggantung di udara" illusion
            • Size hierarchy: active 44px > completed 36px > pending 32px
            • Mobile: connector max-w-[32px], gap-1
            • Desktop: connector max-w-[64px], gap-2
        */}
        <div className={`
          relative z-30 -mt-5 mb-3 flex items-center justify-center
          ${campaign.status === 'pending_review' ? 'opacity-60 pointer-events-none' : ''}
        `}>
          {STEPS.map((step, idx) => {
            const StepIcon = step.icon;
            const isActive = step.num === currentStep;
            const isCompleted = step.num < currentStep || (
              step.num <= 3 && stepCompleted[step.num as 1 | 2 | 3]
            );
            const isClickable = step.num < currentStep || (
              step.num === currentStep ||
              (step.num <= 3 && stepCompleted[step.num as 1 | 2 | 3]) ||
              step.num === currentStep + 1
            );

            return (
              <div key={step.num} className="flex items-center">
                <button
                  onClick={() => isClickable && jumpToStep(step.num as StepNum)}
                  disabled={!isClickable}
                  aria-label={`Step ${step.num}: ${step.label}`}
                  className={`
                    relative flex items-center justify-center transition-all duration-300
                    ${isClickable ? 'cursor-pointer hover:scale-105' : 'cursor-not-allowed'}
                  `}
                >
                  {/* Active glow halo (behind circle) */}
                  {isActive && (
                    <span className="absolute inset-0 -m-2 bg-gradient-to-br from-[#EC4899]/30 to-[#BE185D]/10 rounded-full blur-md animate-pulse" />
                  )}

                  {/* Step circle */}
                  <span className={`
                    relative flex items-center justify-center rounded-full font-extrabold
                    ring-4 ring-white transition-all duration-300
                    ${isActive
                      ? 'w-11 h-11 bg-gradient-to-br from-[#EC4899] to-[#BE185D] text-white shadow-lg shadow-[#EC4899]/40 text-sm'
                      : ''}
                    ${!isActive && isCompleted
                      ? 'w-9 h-9 bg-gradient-to-br from-[#003526] to-[#1B6B4A] text-white shadow-md shadow-[#003526]/25 text-xs'
                      : ''}
                    ${!isActive && !isCompleted
                      ? 'w-8 h-8 bg-white border-2 border-gray-200 text-gray-400 text-xs'
                      : ''}
                  `}>
                    {isCompleted && !isActive ? (
                      <Check size={16} strokeWidth={3} />
                    ) : isActive ? (
                      <StepIcon size={18} strokeWidth={2.5} />
                    ) : (
                      <span>{step.num}</span>
                    )}
                  </span>
                </button>

                {/* Connector line */}
                {idx < STEPS.length - 1 && (
                  <div className="
                    w-8 sm:w-12 md:w-16 h-0.5 mx-1 sm:mx-1.5 rounded-full overflow-hidden
                    bg-gray-200
                  ">
                    <div className={`
                      h-full rounded-full transition-all duration-700 ease-out
                      ${step.num < currentStep
                        ? 'w-full bg-gradient-to-r from-[#003526] to-[#1B6B4A]'
                        : 'w-0'}
                    `} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Active step label (below stepper, mobile-friendly) */}
        <div className="text-center mb-1">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#EC4899]">
            Step {currentStep} · {STEPS[currentStep - 1].label}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">
            {STEPS[currentStep - 1].desc}
          </p>
        </div>

      </div>

      <div className="max-w-2xl mx-auto px-4 pt-2 pb-5 space-y-4">
        {/* Status banners */}
        {campaign.status === 'pending_review' && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
            <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <p className="font-bold mb-0.5">Kampanye sedang ditinjau</p>
              <p>Anda tetap dapat memperbaiki data jika ada kekeliruan — perubahan akan ikut terlihat saat admin meninjau.</p>
            </div>
          </div>
        )}

        {campaign.status === 'rejected' && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 flex items-start gap-2">
            <AlertCircle size={16} className="text-red-600 mt-0.5 shrink-0" />
            <div className="text-xs text-red-900 leading-relaxed">
              <p className="font-bold mb-0.5">Kampanye sebelumnya ditolak</p>
              <p>Perbaiki sesuai masukan admin, kemudian ajukan ulang. Detail alasan penolakan ada di halaman detail kampanye.</p>
            </div>
          </div>
        )}

        {/* Save error banner */}
        {saveError && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 flex items-start gap-2">
            <AlertCircle size={16} className="text-red-600 mt-0.5 shrink-0" />
            <div className="flex-1 text-xs text-red-900">
              <p className="font-bold mb-0.5">Gagal menyimpan</p>
              <p>{saveError}</p>
            </div>
            <button onClick={() => setSaveError('')} className="text-red-600 hover:text-red-800">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Save success toast */}
        {saveSuccess && (
          <div className="rounded-xl bg-green-50 border border-green-200 p-3 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-green-600" />
            <p className="text-xs text-green-900 font-semibold">Tersimpan ✓</p>
          </div>
        )}

        {/* Step error inline */}
        {stepError && (
          <div className="rounded-xl bg-orange-50 border border-orange-200 p-3 flex items-start gap-2">
            <AlertTriangle size={16} className="text-orange-600 mt-0.5 shrink-0" />
            <p className="text-xs text-orange-900 font-semibold">{stepError}</p>
          </div>
        )}

        {/* ═══════════ STEP 1: PENERIMA MANFAAT ═══════════ */}
        {currentStep === 1 && (
          <StepCard title="Data Penerima Manfaat" icon={UserCircle2}>
            <FormField label="Nama Penerima Manfaat">
              <input
                type="text"
                value={beneficiaryName}
                onChange={e => setBeneficiaryName(e.target.value)}
                placeholder="Nama lengkap penerima dana"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:border-[#003526] focus:outline-none text-sm"
              />
            </FormField>

            <FormField label="Hubungan dengan Pengaju">
              <input
                type="text"
                value={beneficiaryRelation}
                onChange={e => setBeneficiaryRelation(e.target.value)}
                placeholder="Mis: Anak, Tetangga, Diri Sendiri"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:border-[#003526] focus:outline-none text-sm"
              />
            </FormField>

            <FormField label="Kategori Kemanusiaan">
              <div className="grid grid-cols-2 gap-2.5">
                {CATEGORIES.map((cat) => {
                  const isActive = category === cat.key;
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setCategory(cat.key)}
                      className={`
                        text-left p-3.5 rounded-xl border-2 transition-all
                        ${isActive
                          ? 'border-[#EC4899] bg-gradient-to-br from-[#EC4899]/5 to-[#BE185D]/5 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: `${cat.color}15` }}
                        >
                          <cat.Icon size={18} style={{ color: cat.color }} />
                        </div>
                        <p className="text-xs font-extrabold text-gray-900">{cat.label}</p>
                      </div>
                      <p className="text-[10px] text-gray-500 leading-tight">{cat.desc}</p>
                    </button>
                  );
                })}
              </div>
            </FormField>

            <FormField label="🔒 Identitas Penerima Manfaat (RAHASIA)">
              <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 mb-3">
                <p className="text-xs text-blue-900 leading-relaxed">
                  <strong>Hanya admin TeraLoka yang bisa lihat.</strong> Identitas penerima TIDAK ditampilkan ke donor/publik. Disimpan terenkripsi sesuai UU PDP.
                </p>
              </div>
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 mb-3">
                <p className="text-xs text-amber-900 leading-relaxed">
                  <strong>Upload 1-3 file</strong> sesuai kondisi:<br />
                  🪪 KTP penerima (bila dewasa)<br />
                  👶 KTP Wali + Akta Kelahiran (bila anak-anak)<br />
                  📋 Kartu Keluarga (KK) sebagai alternatif<br />
                  📄 Surat Keterangan RT/RW/Kelurahan
                </p>
              </div>
              <ImageUpload
                bucket="campaigns"
                label=""
                maxFiles={3}
                maxSizeMB={5}
                onUpload={(urls: string[]) => setIdDocs(urls)}
                existingUrls={idDocs}
              />
              {idDocs.length > 0 && (
                <p className="mt-2 text-xs text-green-700 font-semibold">
                  ✓ {idDocs.length} file identitas tersimpan (rahasia)
                </p>
              )}
            </FormField>
          </StepCard>
        )}

        {/* ═══════════ STEP 2: DETAIL KAMPANYE ═══════════ */}
        {currentStep === 2 && (
          <StepCard title="Detail Kampanye" icon={FileText}>
            <FormField label="Judul Kampanye">
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Mis: Bantu Operasi Jantung Bu Marlina"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:border-[#003526] focus:outline-none text-sm"
              />
              <p className="mt-1 text-[11px] text-gray-500">Min 10 karakter — buat singkat & jelas</p>
            </FormField>

            <FormField label="Cerita & Kebutuhan">
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Ceritakan kondisi penerima, kenapa butuh bantuan, dan bagaimana dana akan digunakan..."
                rows={6}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:border-[#003526] focus:outline-none text-sm resize-none"
              />
              <p className="mt-1 text-[11px] text-gray-500">
                Min 30 karakter · {description.length} char
              </p>
            </FormField>

            <FormField label="Target Dana">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-semibold">
                  Rp
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={targetAmount}
                  onChange={e => setTargetAmount(formatRupiahInput(e.target.value))}
                  placeholder="0"
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl focus:border-[#003526] focus:outline-none text-sm font-semibold"
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
              <p className="text-[11px] text-gray-500 mb-2 leading-relaxed">
                Foto lokasi, surat dokter (KTP/NIK diblur), surat keterangan kelurahan. Ditampilkan ke donor untuk transparansi.<br />
                <strong className="text-amber-700">⚠️ Jangan upload KTP/NIK polos di sini</strong> — KTP penerima sudah di Step 1 (rahasia).
              </p>
              <ImageUpload
                bucket="campaigns"
                label=""
                maxFiles={5}
                maxSizeMB={5}
                onUpload={(urls: string[]) => setProofDocs(urls)}
                existingUrls={proofDocs}
              />
            </FormField>

            <FormField label="Batas Waktu (Opsional)">
              <input
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:border-[#003526] focus:outline-none text-sm"
              />
              <p className="mt-1 text-[11px] text-gray-500">
                Kosongkan jika tidak ada batas waktu tertentu
              </p>
            </FormField>

            <FormField label="Status Urgensi">
              <label className="flex items-start gap-3 p-3 rounded-xl border-2 border-gray-200 cursor-pointer hover:border-orange-300 transition-all">
                <input
                  type="checkbox"
                  checked={isUrgent}
                  onChange={e => setIsUrgent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-orange-600"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <Siren size={14} className="text-orange-600" />
                    <span className="text-sm font-bold text-gray-900">Tandai sebagai URGENT</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Kampanye urgent ditampilkan di slide depan BADONASI dengan label merah
                  </p>
                </div>
              </label>
            </FormField>
          </StepCard>
        )}

        {/* ═══════════ STEP 3: REKENING & FEE ═══════════ */}
        {currentStep === 3 && (
          <StepCard title="Penggalang & Rekening" icon={Landmark}>
            <FormField label="Penggalang Atas Nama">
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsIndependent(true)}
                  className={`
                    p-3.5 rounded-xl border-2 transition-all text-left
                    ${isIndependent
                      ? 'border-[#EC4899] bg-gradient-to-br from-[#EC4899]/5 to-[#BE185D]/5 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                    }
                  `}
                >
                  <p className="text-sm font-extrabold text-gray-900 mb-0.5">Perorangan</p>
                  <p className="text-[10px] text-gray-500">Penggalang individu</p>
                </button>
                <button
                  type="button"
                  onClick={() => setIsIndependent(false)}
                  className={`
                    p-3.5 rounded-xl border-2 transition-all text-left
                    ${!isIndependent
                      ? 'border-[#EC4899] bg-gradient-to-br from-[#EC4899]/5 to-[#BE185D]/5 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                    }
                  `}
                >
                  <p className="text-sm font-extrabold text-gray-900 mb-0.5">Komunitas/Lembaga</p>
                  <p className="text-[10px] text-gray-500">Atas nama partner</p>
                </button>
              </div>
            </FormField>

            <FormField label={isIndependent ? 'Nama Penggalang' : 'Nama Komunitas / Lembaga Partner'}>
              <input
                type="text"
                value={partnerName}
                onChange={e => setPartnerName(e.target.value)}
                placeholder={isIndependent ? 'Nama lengkap kamu' : 'Misal: Komunitas Peduli Maluku'}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:border-[#003526] focus:outline-none text-sm"
              />
            </FormField>

            <FormField label="Bank">
              <select
                value={bankValue}
                onChange={e => setBankValue(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:border-[#003526] focus:outline-none text-sm bg-white"
              >
                <option value="">Pilih bank...</option>
                {BANKS.map(b => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
                <option value="Lainnya">Lainnya...</option>
              </select>

              {bankValue === 'Lainnya' && (
                <input
                  type="text"
                  value={bankCustom}
                  onChange={e => setBankCustom(e.target.value)}
                  placeholder="Nama bank custom"
                  className="mt-2 w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:border-[#003526] focus:outline-none text-sm"
                />
              )}
            </FormField>

            <FormField label="Nomor Rekening">
              <input
                type="text"
                inputMode="numeric"
                value={bankAccountNumber}
                onChange={e => setBankAccountNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="1234567890"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:border-[#003526] focus:outline-none text-sm font-mono"
              />
            </FormField>

            <FormField label="Nama Pemilik Rekening">
              <input
                type="text"
                value={bankAccountName}
                onChange={e => setBankAccountName(e.target.value)}
                placeholder="Nama persis sesuai buku tabungan"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:border-[#003526] focus:outline-none text-sm"
              />
            </FormField>

            <div className="pt-2 border-t border-gray-100">
              <FeeModeSection
                mode={operationalFeeMode}
                percent={penggalangFeePercent}
                onModeChange={setOperationalFeeMode}
                onPercentChange={setPenggalangFeePercent}
                locked={campaign?.status === 'active' || campaign?.status === 'completed'}
              />
            </div>
          </StepCard>
        )}

        {/* ═══════════ STEP 4: REVIEW & SUBMIT ═══════════ */}
        {currentStep === 4 && (
          <StepCard title="Tinjau & Ajukan" icon={CheckCircle2}>
            {campaign.status === 'pending_review' ? (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 mb-3">
                <div className="flex items-start gap-2">
                  <Info size={14} className="text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-900 leading-relaxed">
                    Kampanye sedang ditinjau admin TeraLoka. Anda tetap dapat memperbaiki data jika ada kekeliruan — perubahan akan ikut terlihat saat admin meninjau.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 mb-3">
                <div className="flex items-start gap-2">
                  <Info size={14} className="text-blue-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-900 leading-relaxed">
                    Tinjau semua data di bawah. Klik <strong>Edit</strong> pada bagian yang ingin diubah. Jika semua sudah sesuai, klik <strong>{submitButtonLabel}</strong> di bawah.
                  </p>
                </div>
              </div>
            )}

            {/* Section 1 Review — Penerima */}
            <ReviewSection
              title="1. Penerima Manfaat"
              icon={UserCircle2}
              valid={stepCompleted[1]}
              onEdit={() => jumpToStep(1)}
            >
              <ReviewRow label="Nama Penerima" value={beneficiaryName} />
              <ReviewRow label="Hubungan" value={beneficiaryRelation} />
              <ReviewRow label="Kategori" value={CATEGORIES.find(c => c.key === category)?.label ?? '—'} />
              <ReviewRow
                label="Identitas (rahasia)"
                value={idDocs.length > 0 ? `${idDocs.length} file tersimpan 🔒` : '—'}
              />
            </ReviewSection>

            {/* Section 2 Review — Detail */}
            <ReviewSection
              title="2. Detail Kampanye"
              icon={FileText}
              valid={stepCompleted[2]}
              onEdit={() => jumpToStep(2)}
            >
              <ReviewRow label="Judul" value={title} />
              <ReviewRow label="Target Dana" value={formatRupiah(parseRupiahInput(targetAmount))} />
              <ReviewRow
                label="Cerita"
                value={description.length > 100 ? description.slice(0, 100) + '...' : description}
              />
              <ReviewRow label="Foto Cover" value={coverUrl ? '✓ Sudah upload' : '—'} />
              <ReviewRow label="Dokumen Bukti" value={`${proofDocs.length} file`} />
              <ReviewRow label="Deadline" value={deadline || '— (opsional)'} />
              <ReviewRow label="Urgent" value={isUrgent ? '🚨 Ya' : 'Tidak'} />
            </ReviewSection>

            {/* Section 3 Review — Bank */}
            <ReviewSection
              title="3. Penggalang & Rekening"
              icon={Landmark}
              valid={stepCompleted[3]}
              onEdit={() => jumpToStep(3)}
            >
              <ReviewRow label="Tipe Penggalang" value={isIndependent ? 'Perorangan' : 'Komunitas/Lembaga'} />
              <ReviewRow label="Nama" value={partnerName} />
              <ReviewRow label="Bank" value={bankName || '—'} />
              <ReviewRow label="No. Rekening" value={bankAccountNumber} />
              <ReviewRow label="Atas Nama" value={bankAccountName} />
              <ReviewRow
                label="Mode Operasional"
                value={operationalFeeMode === 'volunteer' ? 'Volunteer (0%)' : `Professional (${penggalangFeePercent}%)`}
              />
            </ReviewSection>

            {/* Submit confirmation */}
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 mt-4">
              <div className="flex items-start gap-2">
                <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
                <div className="text-xs text-amber-900 leading-relaxed">
                  <p className="font-bold mb-1">Sebelum mengajukan, pastikan:</p>
                  <ul className="space-y-0.5 list-disc list-inside">
                    <li>Semua data benar (terutama rekening)</li>
                    <li>Cerita kampanye jelas & jujur</li>
                    <li>Bukti pendukung valid (tidak rekayasa)</li>
                    <li>Setelah diajukan, perubahan akan ditinjau ulang oleh admin</li>
                  </ul>
                </div>
              </div>
            </div>
          </StepCard>
        )}
      </div>

      {/* Sticky Footer Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
          {currentStep > 1 && (
            <button
              onClick={handlePrevStep}
              disabled={saving}
              className="flex-shrink-0 px-3 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-700 font-semibold text-sm flex items-center gap-1.5 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <ArrowLeft size={14} /> <span className="hidden sm:inline">Kembali</span>
            </button>
          )}

          <button
            onClick={() => handleSave()}
            disabled={saving}
            className="flex-shrink-0 px-3 py-2.5 rounded-xl border border-[#003526] bg-white text-[#003526] font-semibold text-sm flex items-center gap-1.5 hover:bg-[#003526]/5 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            <span className="hidden sm:inline">Simpan Draft</span>
            <span className="sm:hidden">Simpan</span>
          </button>

          {currentStep < 4 ? (
            <button
              onClick={handleNextStep}
              disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#EC4899] to-[#BE185D] text-white font-bold text-sm flex items-center justify-center gap-1.5 hover:opacity-90 shadow-md disabled:opacity-50 transition-opacity"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <>Lanjut <ArrowRight size={14} /></>}
            </button>
          ) : (
            <button
              onClick={() => isPendingReview ? handleSave() : setSubmitModalOpen(true)}
              disabled={saving || !stepCompleted[1] || !stepCompleted[2] || !stepCompleted[3]}
              className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#EC4899] to-[#BE185D] text-white font-bold text-sm flex items-center justify-center gap-1.5 hover:opacity-90 shadow-md disabled:opacity-50 transition-opacity"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <>{submitButtonLabel} <Send size={14} /></>}
            </button>
          )}
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {submitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5">
            <div className="flex items-center gap-2 mb-3">
              <Send size={20} className="text-[#EC4899]" />
              <h3 className="text-base font-bold text-gray-900">Konfirmasi Pengajuan</h3>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed mb-4">
              Setelah diajukan, kampanye akan masuk ke antrian peninjauan admin TeraLoka (1-2 hari kerja). Anda tetap dapat mengedit data jika diperlukan.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setSubmitModalOpen(false)}
                className="flex-1 px-3 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={() => handleSave({ thenSubmit: true })}
                disabled={saving}
                className="flex-1 px-3 py-2.5 rounded-xl bg-[#EC4899] text-white font-bold text-sm hover:bg-[#BE185D] disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <>Ajukan <Send size={12} /></>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════

function StepCard({ title, icon: Icon, children }: {
  title: string;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-[#003526] to-[#1B6B4A] px-5 py-3.5 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-[#EC4899]/20 backdrop-blur-sm border border-[#EC4899]/30 flex items-center justify-center shrink-0">
          <Icon size={16} className="text-[#F472B6]" />
        </div>
        <h2 className="text-sm font-extrabold text-white tracking-wide">{title}</h2>
      </div>
      <div className="p-5 space-y-4">
        {children}
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function ReviewSection({
  title, icon: Icon, valid, onEdit, children,
}: {
  title: string;
  icon: any;
  valid: boolean;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={`
      rounded-xl border-2 p-3 mb-3
      ${valid ? 'border-green-200 bg-green-50/30' : 'border-red-200 bg-red-50/30'}
    `}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon size={14} className={valid ? 'text-green-700' : 'text-red-600'} />
          <p className={`text-xs font-bold ${valid ? 'text-green-900' : 'text-red-900'}`}>
            {title} {valid ? '✓' : '⚠️ Belum lengkap'}
          </p>
        </div>
        <button
          onClick={onEdit}
          className="text-xs font-semibold text-[#EC4899] hover:text-[#BE185D] flex items-center gap-1"
        >
          <Edit3 size={12} /> Edit
        </button>
      </div>
      <div className="space-y-1">
        {children}
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      <span className="text-gray-500 shrink-0">{label}:</span>
      <span className="text-gray-900 font-medium text-right break-words">{value || '—'}</span>
    </div>
  );
}
