'use client';

/**
 * TeraLoka — AdvertiserEditModal
 * SESI 5A BATCH 2B + SUB-BATCH GEO (18 Mei 2026)
 * ------------------------------------------------------------
 * Tabbed form untuk Create / Edit Advertiser.
 *
 * History:
 *   - v1 (BATCH 2B): 3-tab form (General/Business/Politik conditional)
 *   - v2 (SUB-BATCH GEO): + LocationAutocomplete untuk business_kabupaten + business_city
 *                          REUSE existing infrastructure: shared/locations
 *                          (useLocationSearch hook + LocationType + Location types)
 *                          Data source: public.locations (1073 entries MalUt, BPS Permendagri 72/2019)
 *
 * 3 tabs:
 *   1. General   — Identity + PIC
 *   2. Business  — Address, NPWP, Industry, Legal Form + Lokasi (autocomplete)
 *   3. Politik   — CONDITIONAL (hanya muncul kalau account_type='politik')
 *                  Includes 4 mandatory clauses (Pasal 270 UU Pemilu compliance).
 *
 * Politik compliance: Submit button DISABLED kalau ada clauses unchecked.
 */

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  X,
  Save,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Briefcase,
  Building2,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LocationAutocomplete } from '@/components/shared/locations';
import type { Advertiser, AccountType } from './AdvertiserPanel';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

type TabId = 'general' | 'business' | 'politik';

interface AdvertiserEditModalProps {
  advertiser: Advertiser | null;
  onClose:    () => void;
  onSaved:    () => void;
}

interface FormState {
  account_type:                      AccountType;
  business_name:                     string;
  pic_name:                          string;
  pic_phone:                         string;
  pic_email:                         string;
  pic_role:                          string;
  business_address:                  string;
  business_city:                     string;
  business_kabupaten:                string;
  business_npwp:                     string;
  business_legal_form:               string;
  business_industry:                 string;
  politik_partai:                    string;
  politik_calon:                     string;
  politik_jabatan:                   string;
  politik_periode:                   string;
  politik_kpu_verified:              boolean;
  politik_anti_black_signed:         boolean;
  politik_liability_signed:          boolean;
  politik_kill_switch_acknowledged:  boolean;
}

const EMPTY_FORM: FormState = {
  account_type:                     'umkm',
  business_name:                    '',
  pic_name:                         '',
  pic_phone:                        '',
  pic_email:                        '',
  pic_role:                         '',
  business_address:                 '',
  business_city:                    '',
  business_kabupaten:               '',
  business_npwp:                    '',
  business_legal_form:              '',
  business_industry:                '',
  politik_partai:                   '',
  politik_calon:                    '',
  politik_jabatan:                  '',
  politik_periode:                  '',
  politik_kpu_verified:             false,
  politik_anti_black_signed:        false,
  politik_liability_signed:         false,
  politik_kill_switch_acknowledged: false,
};

const ACCOUNT_TYPES: { value: AccountType; label: string; desc: string; colorClass: string }[] = [
  { value: 'umkm',            label: 'UMKM',            desc: 'Usaha mikro / kecil',       colorClass: 'border-status-healthy/40 bg-status-healthy/8 text-status-healthy' },
  { value: 'local_corporate', label: 'Local Corporate', desc: 'Perusahaan lokal MalUt',    colorClass: 'border-status-info/40 bg-status-info/8 text-status-info' },
  { value: 'premium',         label: 'Premium',         desc: 'Enterprise besar',          colorClass: 'border-bakabar/40 bg-bakabar/8 text-bakabar' },
  { value: 'politik',         label: 'Politik',         desc: 'Caleg / partai politik',    colorClass: 'border-balapor/40 bg-balapor/8 text-balapor' },
  { value: 'pemerintah',      label: 'Pemerintah',      desc: 'Instansi/program PemKab',   colorClass: 'border-baronda/40 bg-baronda/8 text-baronda' },
  // SESI 9 Sub-Phase A.5 (24 Mei 2026) — Internal: founder/spouse businesses + TeraLoka self-promo
  // Use case: Edukazia, BMK, TeraLoka own brand campaigns. Visual amber theme = signal related-party.
  { value: 'internal',        label: 'Internal',        desc: 'Bisnis owner/spouse + TeraLoka', colorClass: 'border-amber-500/40 bg-amber-500/10 text-amber-700' },
];

const LEGAL_FORM_OPTIONS = ['', 'PT', 'CV', 'UD', 'Firma', 'Koperasi', 'Yayasan', 'Perseorangan'];

export default function AdvertiserEditModal({ advertiser, onClose, onSaved }: AdvertiserEditModalProps) {
  const { token } = useAuth();
  const isEdit = advertiser !== null;

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill form di edit mode
  useEffect(() => {
    if (advertiser) {
      setForm({
        account_type:                     advertiser.account_type,
        business_name:                    advertiser.business_name,
        pic_name:                         advertiser.pic_name,
        pic_phone:                        advertiser.pic_phone,
        pic_email:                        advertiser.pic_email ?? '',
        pic_role:                         advertiser.pic_role ?? '',
        business_address:                 advertiser.business_address ?? '',
        business_city:                    advertiser.business_city ?? '',
        business_kabupaten:               advertiser.business_kabupaten ?? '',
        business_npwp:                    advertiser.business_npwp ?? '',
        business_legal_form:              advertiser.business_legal_form ?? '',
        business_industry:                advertiser.business_industry ?? '',
        politik_partai:                   advertiser.politik_partai ?? '',
        politik_calon:                    advertiser.politik_calon ?? '',
        politik_jabatan:                  advertiser.politik_jabatan ?? '',
        politik_periode:                  advertiser.politik_periode ?? '',
        politik_kpu_verified:             advertiser.politik_kpu_verified,
        politik_anti_black_signed:        advertiser.politik_anti_black_signed,
        politik_liability_signed:         advertiser.politik_liability_signed,
        politik_kill_switch_acknowledged: advertiser.politik_kill_switch_acknowledged,
      });
    }
  }, [advertiser]);

  // Compute compliance status untuk politik
  const politikStatus = useMemo(() => {
    if (form.account_type !== 'politik') return null;

    const metadata = {
      partai:  form.politik_partai.trim() !== '',
      calon:   form.politik_calon.trim() !== '',
      jabatan: form.politik_jabatan.trim() !== '',
      periode: form.politik_periode.trim() !== '',
    };
    const clauses = {
      kpu_verified:              form.politik_kpu_verified,
      anti_black_signed:         form.politik_anti_black_signed,
      liability_signed:          form.politik_liability_signed,
      kill_switch_acknowledged:  form.politik_kill_switch_acknowledged,
    };

    const metadataComplete = Object.values(metadata).every(Boolean);
    const clausesComplete = Object.values(clauses).every(Boolean);

    return {
      metadata,
      clauses,
      metadataComplete,
      clausesComplete,
      allComplete: metadataComplete && clausesComplete,
    };
  }, [form]);

  // Compute submit button state
  const canSubmit = useMemo(() => {
    if (submitting) return false;
    if (!form.business_name.trim()) return false;
    if (!form.pic_name.trim()) return false;
    if (!form.pic_phone.trim()) return false;
    if (form.account_type === 'politik' && politikStatus && !politikStatus.allComplete) {
      return false;
    }
    return true;
  }, [submitting, form, politikStatus]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!token || !canSubmit) return;
    setError(null);
    setSubmitting(true);

    try {
      const payload: any = {
        account_type:    form.account_type,
        business_name:   form.business_name.trim(),
        pic_name:        form.pic_name.trim(),
        pic_phone:       form.pic_phone.replace(/[\s\-]/g, ''),
      };

      if (form.pic_email.trim()) payload.pic_email = form.pic_email.trim();
      if (form.pic_role.trim()) payload.pic_role = form.pic_role.trim();
      if (form.business_address.trim()) payload.business_address = form.business_address.trim();
      if (form.business_city.trim()) payload.business_city = form.business_city.trim();
      if (form.business_kabupaten.trim()) payload.business_kabupaten = form.business_kabupaten.trim();
      if (form.business_npwp.trim()) payload.business_npwp = form.business_npwp.trim();
      if (form.business_legal_form.trim()) payload.business_legal_form = form.business_legal_form.trim();
      if (form.business_industry.trim()) payload.business_industry = form.business_industry.trim();

      if (form.account_type === 'politik') {
        payload.politik_partai = form.politik_partai.trim();
        payload.politik_calon = form.politik_calon.trim();
        payload.politik_jabatan = form.politik_jabatan.trim();
        payload.politik_periode = form.politik_periode.trim();
        payload.politik_kpu_verified = form.politik_kpu_verified;
        payload.politik_anti_black_signed = form.politik_anti_black_signed;
        payload.politik_liability_signed = form.politik_liability_signed;
        payload.politik_kill_switch_acknowledged = form.politik_kill_switch_acknowledged;
      }

      const url = isEdit
        ? `${API}/admin/advertisers/${advertiser!.id}`
        : `${API}/admin/advertisers`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? 'Submit gagal');

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'Gagal save');
      setSubmitting(false);
    }
  };

  // Auto-switch to Politik tab kalau account_type baru di-set ke politik
  useEffect(() => {
    if (form.account_type === 'politik' && activeTab !== 'politik' && isEdit && advertiser?.account_type !== 'politik') {
      setActiveTab('politik');
    }
  }, [form.account_type, activeTab, isEdit, advertiser]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={!submitting ? onClose : undefined}
    >
      <div
        className="bg-surface border border-border rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border bg-ads/8">
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-extrabold text-text">
              {isEdit ? 'Edit Advertiser' : 'Tambah Advertiser Baru'}
            </h2>
            {isEdit && advertiser && (
              <p className="text-[11px] text-text-muted mt-1 truncate">
                {advertiser.business_name} <span className="font-mono text-text-subtle">({advertiser.display_id})</span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-md hover:bg-surface-muted text-text-muted hover:text-text transition-colors shrink-0 disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-5 pt-3 border-b border-border bg-surface-muted/20">
          <TabButton
            id="general"
            active={activeTab === 'general'}
            onClick={() => setActiveTab('general')}
            icon={Briefcase}
            label="General"
          />
          <TabButton
            id="business"
            active={activeTab === 'business'}
            onClick={() => setActiveTab('business')}
            icon={Building2}
            label="Business"
          />
          {form.account_type === 'politik' && (
            <TabButton
              id="politik"
              active={activeTab === 'politik'}
              onClick={() => setActiveTab('politik')}
              icon={politikStatus?.allComplete ? ShieldCheck : ShieldAlert}
              label="Politik"
              variant={politikStatus?.allComplete ? 'success' : 'danger'}
              badge={politikStatus?.allComplete ? '✓' : '!'}
            />
          )}
        </div>

        {/* Body — Scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {error && (
            <div className="mb-3 px-3 py-2 rounded-md bg-balapor/12 border border-balapor/30 text-balapor text-[11px] font-bold">
              ⚠️ {error}
            </div>
          )}

          {/* ─── Tab: General ─── */}
          {activeTab === 'general' && (
            <div className="flex flex-col gap-4">
              {/* Account Type */}
              <div>
                <FieldLabel required>Tipe Account</FieldLabel>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-1.5">
                  {ACCOUNT_TYPES.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setField('account_type', opt.value)}
                      disabled={submitting}
                      className={cn(
                        'flex flex-col items-start gap-0.5 px-2.5 py-2 rounded-md border-2 text-left transition-all',
                        form.account_type === opt.value
                          ? opt.colorClass + ' shadow-sm'
                          : 'border-border bg-surface hover:bg-surface-muted/50 text-text',
                      )}
                    >
                      <span className="text-[11px] font-extrabold uppercase tracking-wide">{opt.label}</span>
                      <span className="text-[9px] opacity-80">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <FieldLabel required>Nama Bisnis</FieldLabel>
                  <Input
                    value={form.business_name}
                    onChange={(v) => setField('business_name', v)}
                    placeholder="Toko Sembako Bunda"
                    disabled={submitting}
                  />
                </div>

                <div>
                  <FieldLabel required>PIC Name</FieldLabel>
                  <Input
                    value={form.pic_name}
                    onChange={(v) => setField('pic_name', v)}
                    placeholder="Ibu Siti"
                    disabled={submitting}
                  />
                </div>

                <div>
                  <FieldLabel>PIC Role</FieldLabel>
                  <Input
                    value={form.pic_role}
                    onChange={(v) => setField('pic_role', v)}
                    placeholder="Owner / Marketing Manager"
                    disabled={submitting}
                  />
                </div>

                <div>
                  <FieldLabel required>WhatsApp Number</FieldLabel>
                  <Input
                    value={form.pic_phone}
                    onChange={(v) => setField('pic_phone', v)}
                    placeholder="081234567890"
                    disabled={submitting}
                    mono
                  />
                  <p className="text-[10px] text-text-muted mt-1">
                    Format: 8-15 digit (opsional +). WA harus unique.
                  </p>
                </div>

                <div>
                  <FieldLabel>Email</FieldLabel>
                  <Input
                    type="email"
                    value={form.pic_email}
                    onChange={(v) => setField('pic_email', v)}
                    placeholder="contact@example.com"
                    disabled={submitting}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ─── Tab: Business ─── */}
          {activeTab === 'business' && (
            <div className="flex flex-col gap-3">
              <div>
                <FieldLabel>Alamat Lengkap</FieldLabel>
                <textarea
                  value={form.business_address}
                  onChange={(e) => setField('business_address', e.target.value)}
                  placeholder="Jl. Pahlawan No. 123, Ternate Tengah"
                  rows={2}
                  disabled={submitting}
                  className="w-full px-3 py-2 rounded-md bg-surface border border-border text-[12px] text-text placeholder:text-text-subtle resize-none focus:outline-none focus:border-ads/50 focus:ring-2 focus:ring-ads/20 disabled:opacity-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Kabupaten / Kota</FieldLabel>
                  <LocationAutocomplete
                    value={form.business_kabupaten}
                    onChange={(v) => setField('business_kabupaten', v)}
                    placeholder="Cari kabupaten / kota..."
                    disabled={submitting}
                  />
                  <p className="text-[10px] text-text-muted mt-1">
                    💡 Tipe akan muncul di dropdown — pilih kabupaten atau kota
                  </p>
                </div>

                <div>
                  <FieldLabel>Kecamatan</FieldLabel>
                  <LocationAutocomplete
                    value={form.business_city}
                    onChange={(v) => setField('business_city', v)}
                    type="kecamatan"
                    placeholder="Cari kecamatan..."
                    disabled={submitting}
                  />
                </div>

                <div>
                  <FieldLabel>NPWP</FieldLabel>
                  <Input
                    value={form.business_npwp}
                    onChange={(v) => setField('business_npwp', v)}
                    placeholder="00.000.000.0-000.000"
                    disabled={submitting}
                    mono
                  />
                </div>

                <div>
                  <FieldLabel>Bentuk Hukum</FieldLabel>
                  <select
                    value={form.business_legal_form}
                    onChange={(e) => setField('business_legal_form', e.target.value)}
                    disabled={submitting}
                    className="w-full px-3 py-2 rounded-md bg-surface border border-border text-[12px] text-text focus:outline-none focus:border-ads/50 focus:ring-2 focus:ring-ads/20 disabled:opacity-50"
                  >
                    {LEGAL_FORM_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt || '— Pilih —'}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <FieldLabel>Industri</FieldLabel>
                  <Input
                    value={form.business_industry}
                    onChange={(v) => setField('business_industry', v)}
                    placeholder="F&B / Retail / Construction / dll"
                    disabled={submitting}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ─── Tab: Politik (CONDITIONAL) ─── */}
          {activeTab === 'politik' && form.account_type === 'politik' && (
            <div className="flex flex-col gap-4">
              {/* Compliance Banner */}
              {politikStatus && (
                <div className={cn(
                  'flex items-start gap-2 px-3 py-2.5 rounded-lg border',
                  politikStatus.allComplete
                    ? 'bg-status-healthy/8 border-status-healthy/30'
                    : 'bg-balapor/8 border-balapor/30',
                )}>
                  {politikStatus.allComplete ? (
                    <CheckCircle2 size={14} className="text-status-healthy shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle size={14} className="text-balapor shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className={cn(
                      'text-[11px] font-extrabold',
                      politikStatus.allComplete ? 'text-status-healthy' : 'text-balapor',
                    )}>
                      {politikStatus.allComplete
                        ? '✅ Semua compliance requirement terpenuhi'
                        : '⚠️ Compliance belum lengkap — Submit akan ditolak'}
                    </p>
                    <p className="text-[10px] text-text-muted mt-0.5">
                      Pasal 270 UU Pemilu mewajibkan 4 metadata + 4 clauses signed sebelum publish iklan politik.
                    </p>
                  </div>
                </div>
              )}

              {/* Metadata Section */}
              <section className="rounded-xl border border-balapor/30 bg-balapor/4 px-4 py-3">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-balapor mb-2">
                  Metadata Politik
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel required>Partai</FieldLabel>
                    <Input
                      value={form.politik_partai}
                      onChange={(v) => setField('politik_partai', v)}
                      placeholder="Partai XXX"
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <FieldLabel required>Nama Calon</FieldLabel>
                    <Input
                      value={form.politik_calon}
                      onChange={(v) => setField('politik_calon', v)}
                      placeholder="H. Joko Susilo"
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <FieldLabel required>Jabatan Dicalonkan</FieldLabel>
                    <Input
                      value={form.politik_jabatan}
                      onChange={(v) => setField('politik_jabatan', v)}
                      placeholder="DPRD Kota Ternate"
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <FieldLabel required>Periode</FieldLabel>
                    <Input
                      value={form.politik_periode}
                      onChange={(v) => setField('politik_periode', v)}
                      placeholder="2024-2029"
                      disabled={submitting}
                    />
                  </div>
                </div>
              </section>

              {/* Mandatory Clauses Section */}
              <section className="rounded-xl border border-balapor/30 bg-balapor/4 px-4 py-3">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-balapor mb-2">
                  Mandatory Compliance Clauses
                </h3>
                <div className="flex flex-col gap-2">
                  <ClauseCheckbox
                    checked={form.politik_kpu_verified}
                    onChange={(v) => setField('politik_kpu_verified', v)}
                    disabled={submitting}
                    label="KPU Verified"
                    description="Calon sudah terdaftar resmi di KPU (Komisi Pemilihan Umum) dan punya nomor urut/SK"
                  />
                  <ClauseCheckbox
                    checked={form.politik_anti_black_signed}
                    onChange={(v) => setField('politik_anti_black_signed', v)}
                    disabled={submitting}
                    label="Anti-Black Campaign Signed"
                    description="Setuju TIDAK melakukan kampanye hitam, SARA, hoax, atau fitnah terhadap kandidat lain"
                  />
                  <ClauseCheckbox
                    checked={form.politik_liability_signed}
                    onChange={(v) => setField('politik_liability_signed', v)}
                    disabled={submitting}
                    label="Liability Signed"
                    description="Bertanggung jawab penuh atas konten iklan. TeraLoka tidak bertanggung jawab atas pelanggaran"
                  />
                  <ClauseCheckbox
                    checked={form.politik_kill_switch_acknowledged}
                    onChange={(v) => setField('politik_kill_switch_acknowledged', v)}
                    disabled={submitting}
                    label="Kill Switch Acknowledged"
                    description="Mengakui TeraLoka berhak menghentikan iklan kapan saja tanpa refund jika violate compliance"
                  />
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-border bg-surface-muted/20">
          {/* Submit blocker message */}
          <div className="flex-1 min-w-0">
            {!canSubmit && !submitting && (
              <p className="text-[10px] text-balapor font-bold truncate">
                {!form.business_name.trim() && '⚠️ Nama bisnis wajib diisi'}
                {form.business_name.trim() && !form.pic_name.trim() && '⚠️ PIC Name wajib diisi'}
                {form.business_name.trim() && form.pic_name.trim() && !form.pic_phone.trim() && '⚠️ WhatsApp wajib diisi'}
                {form.business_name.trim() && form.pic_name.trim() && form.pic_phone.trim() &&
                  form.account_type === 'politik' && politikStatus && !politikStatus.allComplete &&
                  '⚠️ Politik compliance belum lengkap (Tab Politik)'}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-1.5 rounded-md bg-surface-muted text-text text-[11px] font-bold uppercase tracking-wide hover:bg-surface-muted/80 transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={cn(
                'inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wide transition-colors',
                canSubmit
                  ? 'bg-ads text-white hover:bg-ads/90'
                  : 'bg-surface-muted text-text-subtle cursor-not-allowed',
              )}
            >
              {submitting ? (
                <>
                  <Loader2 size={11} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={11} />
                  {isEdit ? 'Update' : 'Tambah'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-Components ──────────────────────────────────────────

function TabButton({
  active, onClick, icon: Icon, label, variant = 'default', badge,
}: {
  id:       TabId;
  active:   boolean;
  onClick:  () => void;
  icon:     typeof X;
  label:    string;
  variant?: 'default' | 'success' | 'danger';
  badge?:   string;
}) {
  const variantClass = {
    default: active ? 'border-ads text-ads' : 'border-transparent text-text-muted hover:text-text',
    success: active ? 'border-status-healthy text-status-healthy' : 'border-transparent text-status-healthy/70 hover:text-status-healthy',
    danger:  active ? 'border-balapor text-balapor' : 'border-transparent text-balapor/70 hover:text-balapor',
  }[variant];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold uppercase tracking-wide border-b-2 -mb-px transition-colors',
        variantClass,
      )}
    >
      <Icon size={12} />
      {label}
      {badge && (
        <span className={cn(
          'inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] font-bold',
          variant === 'success' && 'bg-status-healthy text-white',
          variant === 'danger' && 'bg-balapor text-white',
        )}>
          {badge}
        </span>
      )}
    </button>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">
      {children} {required && <span className="text-balapor">*</span>}
    </label>
  );
}

function Input({
  type = 'text', value, onChange, placeholder, disabled, mono,
}: {
  type?:        string;
  value:        string;
  onChange:     (v: string) => void;
  placeholder?: string;
  disabled?:    boolean;
  mono?:        boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        'w-full px-3 py-2 rounded-md bg-surface border border-border text-[12px] text-text placeholder:text-text-subtle focus:outline-none focus:border-ads/50 focus:ring-2 focus:ring-ads/20 disabled:opacity-50',
        mono && 'font-mono',
      )}
    />
  );
}

function ClauseCheckbox({
  checked, onChange, disabled, label, description,
}: {
  checked:     boolean;
  onChange:    (v: boolean) => void;
  disabled?:   boolean;
  label:       string;
  description: string;
}) {
  return (
    <label className={cn(
      'flex items-start gap-2.5 px-3 py-2.5 rounded-md border cursor-pointer transition-colors',
      checked
        ? 'bg-status-healthy/8 border-status-healthy/30'
        : 'bg-surface border-border hover:bg-surface-muted/50',
      disabled && 'opacity-50 cursor-not-allowed',
    )}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="mt-0.5 w-4 h-4 rounded border-border accent-status-healthy cursor-pointer disabled:cursor-not-allowed"
      />
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-[12px] font-bold',
          checked ? 'text-status-healthy' : 'text-text',
        )}>
          {label}
        </p>
        <p className="text-[10px] text-text-muted mt-0.5 leading-relaxed">
          {description}
        </p>
      </div>
    </label>
  );
}
