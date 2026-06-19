'use client';

// ═══════════════════════════════════════════════════════════════
// /owner/funding/campaigns/[id]/disbursements/new/page.tsx
// Form ajukan pencairan dana (owner)
//
// Backend endpoint: POST /funding/my/disbursements
// Required: amount, disbursed_to, disbursed_at, evidence_urls[], beneficiary_phone.
//   [KTP-B] Identitas penerima = HP saja (one-of BE terpenuhi via phone; phone WAJIB
//   di level campaign self/wali → prefill ke sini). beneficiary_ktp_url di-drop dari form.
//   Bukti adaptif per metode (transfer=struk · cash/goods/service=serah-terima+blur).
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import { formatRupiah } from '@/utils/format';
import ImageUpload from '@/components/ui/ImageUpload';
import {
  ArrowLeft, Loader2, AlertCircle, Wallet, Banknote,
  Calendar, User, Phone, ShieldCheck, FileText, Camera,
  Send, Info, AlertTriangle, ChevronRight,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';
const TOKEN_KEY = 'tl_token';

interface CampaignSummary {
  id: string;
  title: string;
  status: string;
  collected_amount: number;
  created_at: string;  // ⭐ Used untuk date input min constraint (validate disbursed_at >= campaign created)
  // [PENCAIRAN-REDESIGN] prefill penerima (BE balikin via select('*'))
  beneficiary_name?: string | null;
  beneficiary_phone?: string | null;
}

interface FinancialSummary {
  total_collected: number;
  total_disbursed: number;
  total_disbursed_pending: number;
  saldo: number;  // [SALDO-FIELD-FIX] match BE getMyFinancialSummary (dulu 'saldo_available' → undefined → Rp 0 → form nolak semua)
}

const METHODS = [
  { value: 'transfer', label: 'Transfer Bank' },
  { value: 'cash',     label: 'Tunai' },
  { value: 'goods',    label: 'Barang/Logistik' },
  { value: 'service',  label: 'Layanan/Jasa' },
];

// [PENCAIRAN-REDESIGN] Field "Bukti" adaptif per metode — SELALU nulis evidence_urls (1 bucket: donations).
// blur=true → privacyEditor (foto serah-terima ada wajah → buramkan PRE-upload, pola cover/proof).
// transfer: struk (no face) → tanpa blur, + field serah-terima opsional terpisah.
const EVIDENCE_CFG: Record<string, { label: string; hint: string; blur: boolean }> = {
  transfer: { label: 'Bukti Transfer', hint: 'Minimal 1 file. Struk transfer, screenshot mutasi, atau bukti pembayaran.', blur: false },
  cash:     { label: 'Bukti/Kuitansi Serah-Terima', hint: 'Minimal 1 file. Foto kuitansi/tanda terima saat dana diserahkan. Wajah penerima bisa diburamkan dulu di editor.', blur: true },
  goods:    { label: 'Bukti Serah-Terima Barang', hint: 'Minimal 1 file. Foto serah-terima barang ke penerima. Wajah bisa diburamkan dulu di editor.', blur: true },
  service:  { label: 'Bukti Layanan', hint: 'Minimal 1 file. Foto/dokumen bukti layanan diberikan. Wajah bisa diburamkan dulu di editor.', blur: true },
};

export default function OwnerCampaignDisbursementNewPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id as string;
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [campaign, setCampaign] = useState<CampaignSummary | null>(null);
  const [financial, setFinancial] = useState<FinancialSummary | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Form state
  const [amountRaw, setAmountRaw] = useState(0);
  const [amountDisplay, setAmountDisplay] = useState('');
  const [disbursedTo, setDisbursedTo] = useState('');
  const [disbursedAt, setDisbursedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState('transfer');
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [handoverPhotoUrl, setHandoverPhotoUrl] = useState('');
  const [beneficiaryPhone, setBeneficiaryPhone] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/masuk'); return; }
    if (!campaignId) return;

    async function load() {
      const token = localStorage.getItem(TOKEN_KEY);
      try {
        const [campRes, finRes] = await Promise.all([
          fetch(`${API}/funding/my/campaigns/${campaignId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then(r => r.json()),
          fetch(`${API}/funding/my/financial-summary?campaign_id=${campaignId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then(r => r.json()).catch(() => ({ success: false })),
        ]);
        if (!campRes.success) throw new Error(campRes?.error?.message || 'Gagal load kampanye');
        setCampaign(campRes.data);
        // [PENCAIRAN-REDESIGN] Prefill penerima dari data kampanye — EDITABLE (multi-disbursement
        // bisa ubah; one-of phone cukup → gak perlu re-upload KTP kalau cair ke beneficiary kampanye).
        if (campRes.data?.beneficiary_name) setDisbursedTo(prev => prev || campRes.data.beneficiary_name);
        if (campRes.data?.beneficiary_phone) {
          setBeneficiaryPhone(prev => prev || String(campRes.data.beneficiary_phone).replace(/\D/g, ''));
        }
        if (finRes.success) setFinancial(finRes.data);
      } catch (err: any) {
        setLoadError(err.message);
      } finally {
        setLoadingData(false);
      }
    }
    load();
  }, [campaignId, authLoading, user, router]);

  const saldo = financial?.saldo ?? 0;
  const overSaldo = amountRaw > saldo;
  // [KTP-B] Identitas penerima = HP saja (one-of BE terpenuhi via phone; phone selalu ada,
  // prefill dari campaign.beneficiary_phone yg WAJIB self/wali). KTP di-drop (redundan).
  const hasIdentity = !!beneficiaryPhone.trim();

  const validation = (() => {
    if (amountRaw <= 0) return 'Nominal pencairan wajib diisi';
    if (overSaldo) return `Nominal melebihi saldo tersedia (${formatRupiah(saldo)})`;
    if (!disbursedTo.trim()) return 'Nama penerima wajib diisi';
    if (!disbursedAt) return 'Tanggal pencairan wajib diisi';
    if (evidenceUrls.length === 0) return 'Bukti wajib diupload (minimal 1 file)';
    if (!hasIdentity) return 'Nomor HP penerima wajib diisi';
    return '';
  })();

  async function handleSubmit() {
    if (validation) return;
    setSubmitting(true);
    setError('');

    const token = localStorage.getItem(TOKEN_KEY);
    try {
      const res = await fetch(`${API}/funding/my/disbursements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          campaign_id: campaignId,
          amount: amountRaw,
          disbursed_to: disbursedTo.trim(),
          disbursed_at: new Date(disbursedAt).toISOString(),
          method,
          evidence_urls: evidenceUrls,
          handover_photo_url: handoverPhotoUrl || undefined,
          beneficiary_phone: beneficiaryPhone.trim() || undefined,
          disbursement_notes: notes.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || 'Gagal mengajukan pencairan');
      }

      toast.success('Pencairan berhasil diajukan, menunggu review admin');
      router.push(`/owner/funding/campaigns/${campaignId}/disbursements?created=1`);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
      setSubmitting(false);
    }
  }

  if (loadingData || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-[#003526] animate-spin" />
      </div>
    );
  }

  if (loadError || !campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-800 mb-2">{loadError || 'Kampanye tidak ditemukan'}</p>
          <Link href={`/owner/funding/campaigns/${campaignId}/disbursements`} className="text-sm text-[#003526] underline">Kembali</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href={`/owner/funding/campaigns/${campaignId}/disbursements`} className="p-2 -ml-2 rounded-lg hover:bg-gray-100">
            <ArrowLeft size={20} className="text-gray-700" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-900 truncate">Ajukan Pencairan</h1>
            <p className="text-xs text-gray-500 truncate">{campaign.title}</p>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-5">
        {/* Saldo info */}
        <div className="bg-[#003526] rounded-2xl p-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <Wallet size={14} className="opacity-80" />
            <p className="text-[10px] font-semibold opacity-90 uppercase tracking-wider">Saldo Tersedia</p>
          </div>
          <p className="text-2xl font-black">{formatRupiah(saldo)}</p>
        </div>

        {/* Anti-fraud reminder */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <ShieldCheck size={18} className="text-amber-700 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <p className="font-bold mb-1">Pencairan akan diverifikasi admin</p>
            Pastikan bukti transfer authentic & identitas penerima valid. Pencairan yang ditolak/flagged akan terbuka untuk publik di halaman transparansi.
          </div>
        </div>

        {/* Form: Amount */}
        <Section icon={<Banknote size={18} />} title="Nominal Pencairan" required>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">Rp</span>
            <input
              type="text"
              inputMode="numeric"
              value={amountDisplay}
              onChange={e => {
                const raw = e.target.value.replace(/\D/g, '');
                const num = Number(raw) || 0;
                setAmountRaw(num);
                setAmountDisplay(raw ? num.toLocaleString('id-ID') : '');
              }}
              placeholder="0"
              className={`w-full rounded-xl border pl-10 pr-4 py-3 text-base font-bold outline-none ${
                overSaldo
                  ? 'border-red-300 bg-red-50 text-red-900 focus:border-red-500'
                  : 'border-gray-200 text-gray-900 focus:border-[#003526]'
              }`}
            />
          </div>
          {overSaldo && (
            <p className="text-xs text-red-600 mt-1.5 font-medium">
              ⚠️ Melebihi saldo tersedia ({formatRupiah(saldo)})
            </p>
          )}
        </Section>

        {/* Form: Penerima Manfaat — nama + kontak HP (merged; alur logis nama → kontak) */}
        <Section icon={<User size={18} />} title="Penerima Manfaat" required>
          <p className="text-xs text-gray-500 mb-3">
            Nama & nomor kontak penerima dana (boleh wali/perwakilan keluarga). Terisi dari data kampanye — ubah bila penerima berbeda.
          </p>
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
            <User size={10} /> Nama Penerima
          </label>
          <input
            type="text"
            value={disbursedTo}
            onChange={e => setDisbursedTo(e.target.value)}
            placeholder="Nama penerima atau wakil"
            maxLength={200}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#003526] mb-3"
          />
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
            <Phone size={10} /> Nomor HP Penerima
          </label>
          <input
            type="tel"
            value={beneficiaryPhone}
            onChange={e => setBeneficiaryPhone(e.target.value.replace(/\D/g, ''))}
            placeholder="081234567890"
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-mono outline-none focus:border-[#003526]"
          />
          {hasIdentity && (
            <p className="text-xs text-green-700 mt-2 font-medium flex items-center gap-1.5">
              ✓ Kontak penerima sudah diisi
            </p>
          )}
        </Section>

        {/* Form: Date + Method */}
        <Section icon={<Calendar size={18} />} title="Tanggal & Metode" required>
          <div className="space-y-2">
            <input
              type="date"
              value={disbursedAt}
              onChange={e => setDisbursedAt(e.target.value)}
              min={campaign?.created_at?.slice(0, 10)}
              max={new Date().toISOString().slice(0, 10)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#003526]"
            />
            {/* ⭐ Helper text: explain valid date range untuk donor + penggalang clarity */}
            {campaign?.created_at && (
              <p className="text-[11px] text-gray-500 leading-relaxed pl-1">
                📅 Pilih tanggal saat dana benar-benar cair. Boleh dari{' '}
                <strong className="text-gray-700">
                  {new Date(campaign.created_at).toLocaleDateString('id-ID', {
                    day: 'numeric', month: 'long', year: 'numeric'
                  })}
                </strong>
                {' '}(kampanye dibuka) sampai hari ini.
              </p>
            )}
            <select
              value={method}
              onChange={e => setMethod(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#003526] bg-white"
            >
              {METHODS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        </Section>

        {/* Form: Bukti (adaptif per metode) — SELALU isi evidence_urls (1 bucket: donations) */}
        {(() => {
          const cfg = EVIDENCE_CFG[method] ?? EVIDENCE_CFG.transfer;
          return (
            <Section icon={<FileText size={18} />} title={cfg.label} required>
              <p className="text-xs text-gray-500 mb-2.5">{cfg.hint}</p>
              <ImageUpload
                bucket="donations"
                label=""
                maxFiles={5}
                maxSizeMB={5}
                privacyEditor={cfg.blur}
                onUpload={(urls: string[]) => setEvidenceUrls(urls)}
                existingUrls={evidenceUrls}
              />
            </Section>
          );
        })()}

        {/* Form: Foto Serah-Terima — opsional, HANYA transfer (non-transfer udah jadi bukti utama di atas) */}
        {method === 'transfer' && (
          <Section icon={<Camera size={18} />} title="Foto Serah-Terima" hint="Opsional tapi sangat membantu verifikasi. Wajah penerima bisa diburamkan dulu di editor.">
            <ImageUpload
              bucket="donations"
              label=""
              maxFiles={1}
              maxSizeMB={5}
              privacyEditor
              onUpload={(urls: string[]) => setHandoverPhotoUrl(urls[0] ?? '')}
              existingUrls={handoverPhotoUrl ? [handoverPhotoUrl] : []}
            />
          </Section>
        )}

        {/* Form: Notes */}
        <Section icon={<FileText size={18} />} title="Catatan" hint="Opsional. Konteks tambahan untuk admin">
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Misal: Pencairan tahap 1 dari 3 sesuai rencana..."
            rows={3}
            maxLength={1000}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#003526] resize-none"
          />
          <p className="text-xs text-gray-400 text-right mt-1">{notes.length}/1000</p>
        </Section>

        {/* Submit area */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sticky bottom-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3 flex items-start gap-2">
              <AlertCircle size={14} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-800">{error}</p>
            </div>
          )}
          {validation && !error && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3 flex items-start gap-2">
              <Info size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">{validation}</p>
            </div>
          )}
          <button
            onClick={handleSubmit}
            disabled={!!validation || submitting}
            className="w-full inline-flex items-center justify-center gap-2 bg-[#003526] hover:bg-[#0d4d3a] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-colors"
          >
            {submitting ? (
              <><Loader2 size={16} className="animate-spin" /> Mengajukan...</>
            ) : (
              <><Send size={16} /> Ajukan Pencairan</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({
  icon, title, required, hint, children,
}: {
  icon: React.ReactNode; title: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="text-[#003526]">{icon}</div>
        <h2 className="text-sm font-bold text-gray-800">
          {title} {required && <span className="text-red-500">*</span>}
        </h2>
      </div>
      {hint && <p className="text-xs text-gray-500 mb-2.5">{hint}</p>}
      {children}
    </div>
  );
}
