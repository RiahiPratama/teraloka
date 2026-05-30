'use client';

/**
 * TeraLoka — AdFormSectionAdvertiser
 * Mission 8 Sub-Phase 8-B + SESI 5B STEP 3 (18 Mei 2026)
 * SESI 11 Spine Batch 2 (30 Mei 2026) — Paket wajib (anchor) + demote Mode Cepat
 * ------------------------------------------------------------
 * Section 1 form: Informasi Advertiser & Pricing Tier.
 *
 * SESI 11 Spine Batch 2:
 *   - Pricing Tier jadi WAJIB (anchor). isComplete = advertiser + paket.
 *     (Gate spine di AdFormPage udah nahan, label di sini sekarang jujur.)
 *   - "Mode Cepat" (free-text) di-DEMOTE: dari toggle prominent jadi link kecil
 *     "darurat" — jalur normal selalu Picker (tipe auto dari akun, gak manual).
 *
 * Modes (Hybrid Q2 C — Mode Cepat toggle):
 *   - Picker Mode (default): AdvertiserPicker + auto-fill metadata
 *   - Mode Cepat (darurat): free-text inputs untuk emergency/back-compat
 *
 * Mapping logic (account_type → tier_category) — PHASE 3 SYMMETRIC:
 *   - umkm → 'umkm' · local_corporate → 'local_corporate' · premium → 'premium'
 *   - politik → 'politik' · pemerintah → 'pemerintah'
 *
 * History:
 *   - α/Batch 1 (16 Mei 2026): initial
 *   - SESI 5B STEP 3 (18 Mei 2026): wire AdvertiserPicker + PricingTierPicker
 *   - PHASE 3 (18 Mei 2026): symmetric mapping 5×5
 *   - SESI 5C-B (18 Mei 2026): + Harga Final field + sync pricing_tier_data
 *   - SESI 11 Spine Batch 2 (30 Mei 2026): paket wajib + demote Mode Cepat
 */

import { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Check,
  Sparkles,
  AlertTriangle,
  Zap,
  UserCheck,
  DollarSign,    // SESI 5C-B
  Wallet,        // SESI 5C-B
  // SESI 5E Phase 3b: Modern icons untuk TIPE ADVERTISER (replace emoji)
  Users,         // Umum
  Briefcase,     // Komersial
  Crown,         // Premium
  Building2,     // Pemerintah
  Landmark,      // Politisi
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
// SESI 5E Phase 3b: ImageUpload removed — Logo Advertiser field eliminated
import { useAdForm, type AdvertiserType } from './AdFormProvider';
import AdvertiserPicker from './advertisers/AdvertiserPicker';
import PricingTierPicker, {
  type TierCategory,
  type PricingTier,
} from './pricing-tiers/PricingTierPicker';
import type { Advertiser } from './advertisers/AdvertiserPanel';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

// ─── Helper: Map account_type (advertiser entity) → tier_category ───
// PHASE 3: Symmetric 5×5 mapping (no more fallback to umkm/premium)
function getTierCategoryForAccount(accountType: string): TierCategory | undefined {
  const map: Record<string, TierCategory | undefined> = {
    umkm:            'umkm',
    local_corporate: 'local_corporate',  // ← PHASE 3 FIX (was 'umkm')
    premium:         'premium',
    politik:         'politik',
    pemerintah:      'pemerintah',       // ← PHASE 3 FIX (was 'premium')
    internal:        'internal',         // ← SESI 11 Batch 7: iklan rumahan (gratis, akses penuh)
  };
  return map[accountType];
}

// ─── Helper: Map free-text AdvertiserType → tier_category ───
// PHASE 3: pemerintah symmetric fix.
// SESI 5C-B HOTFIX (18 Mei 2026): komersial → 'local_corporate' (was 'umkm').
// SESI 5C-B Premium gap (18 Mei 2026): + 'premium' → 'premium' tier (brand nasional besar).
function getTierCategoryForFreeText(advertiserType: AdvertiserType): TierCategory | undefined {
  const map: Record<AdvertiserType, TierCategory | undefined> = {
    umum:       'umkm',           // UMKM, individual, organisasi non-formal
    komersial:  'local_corporate', // SESI 5C-B HOTFIX (was 'umkm')
    premium:    'premium',         // SESI 5C-B Premium gap fix
    politisi:   'politik',
    pemerintah: 'pemerintah',     // PHASE 3 FIX (was 'premium')
  };
  return map[advertiserType];
}

// ─── Helper: Map account_type → advertiser_type (denormalized cache) ───
// SESI 5C-B: premium account_type → premium advertiser_type (was 'komersial').
function mapAccountTypeToAdvertiserType(accountType: string): AdvertiserType {
  const map: Record<string, AdvertiserType> = {
    umkm:            'umum',
    local_corporate: 'komersial',
    premium:         'premium',    // SESI 5C-B: symmetric (was 'komersial')
    politik:         'politisi',
    pemerintah:      'pemerintah',
    internal:        'komersial',  // SESI 11 Batch 7: cache denormalized (lolos validTypes backend)
  };
  return map[accountType] ?? 'komersial';
}

// ─── Free-text TYPE_OPTIONS (5-card radio, semantic 2-row layout) ──
const TYPE_OPTIONS: Array<{
  value: AdvertiserType;
  label: string;
  description: string;
  icon: LucideIcon;
  warning?: string;
  autoReview: boolean;
}> = [
  { value: 'umum',       label: 'Umum',       icon: Users,     autoReview: false, description: 'UMKM, individual, organisasi non-formal' },
  { value: 'komersial',  label: 'Komersial',  icon: Briefcase, autoReview: false, description: 'PT/CV lokal, brand daerah, korporasi menengah' },
  { value: 'premium',    label: 'Premium',    icon: Crown,     autoReview: false, description: 'Brand nasional besar (Telkomsel, Indomie, BCA, dll)' },
  { value: 'pemerintah', label: 'Pemerintah', icon: Building2, autoReview: true,  description: 'Instansi pemerintah, BUMN, BPJS', warning: 'Auto pending_review' },
  { value: 'politisi',   label: 'Politisi',   icon: Landmark,  autoReview: true,  description: 'Calon legislatif, partai politik, calon kepala daerah', warning: 'KPU compliance + pending_review' },
];

// ════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════

export default function AdFormSectionAdvertiser() {
  const { state, setField, errorFor } = useAdForm();
  const { token } = useAuth();
  const [expanded, setExpanded] = useState(true);

  // Local cache: entities untuk display (controlled component props)
  const [advertiserEntity, setAdvertiserEntity] = useState<Advertiser | null>(null);
  const [pricingTierEntity, setPricingTierEntity] = useState<PricingTier | null>(null);

  // Bootstrap: fetch Advertiser entity kalau state punya ID (edit mode)
  useEffect(() => {
    if (!state.advertiser_account_id || !token) {
      setAdvertiserEntity(null);
      return;
    }
    fetch(`${API}/admin/advertisers/${state.advertiser_account_id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((j) => {
        if (j.success && j.data) setAdvertiserEntity(j.data);
      })
      .catch(() => {});
  }, [state.advertiser_account_id, token]);

  // Bootstrap: fetch PricingTier entity kalau state punya ID
  // SESI 5C-B: ALSO sync ke context state.pricing_tier_data
  useEffect(() => {
    if (!state.pricing_tier_id || !token) {
      setPricingTierEntity(null);
      if (state.pricing_tier_data !== null) {
        setField('pricing_tier_data', null);
      }
      return;
    }
    fetch(`${API}/admin/ads/pricing-tiers/${state.pricing_tier_id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((j) => {
        if (j.success && j.data) {
          setPricingTierEntity(j.data);
          setField('pricing_tier_data', j.data);
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.pricing_tier_id, token]);

  // Derive highlightCategory untuk PricingTierPicker (Q1 B — Soft Filter)
  const highlightCategory: TierCategory | undefined = state.use_free_text_mode
    ? getTierCategoryForFreeText(state.advertiser_type)
    : advertiserEntity
      ? getTierCategoryForAccount(advertiserEntity.account_type)
      : undefined;

  // SESI 11 Spine Batch 2: paket WAJIB (anchor). Section 1 beres = advertiser + paket.
  const advertiserDone = state.use_free_text_mode
    ? state.advertiser_name.trim().length > 0 && Boolean(state.advertiser_type)
    : state.advertiser_account_id !== null;
  const isComplete = advertiserDone && state.pricing_tier_id !== null;

  const nameError = errorFor('advertiser_name');
  const advertiserAccountError = errorFor('advertiser_account_id');

  // ─── Handlers ──────────────────────────────────────────────

  const handleAdvertiserSelect = (adv: Advertiser | null) => {
    setAdvertiserEntity(adv);
    if (adv) {
      setField('advertiser_account_id', adv.id);
      // Auto-fill denormalized fields (backend uses sebagai cache + fallback)
      setField('advertiser_name', adv.business_name);
      setField('advertiser_type', mapAccountTypeToAdvertiserType(adv.account_type));
      setField('advertiser_phone', adv.pic_phone);
    } else {
      setField('advertiser_account_id', null);
    }
  };

  const handlePricingTierSelect = (tier: PricingTier | null) => {
    setPricingTierEntity(tier);
    setField('pricing_tier_id', tier?.id ?? null);
    setField('pricing_tier_data', tier);
    if (tier === null) {
      setField('price_paid', null);
    }
  };

  const handleToggleMode = () => {
    const newMode = !state.use_free_text_mode;
    setField('use_free_text_mode', newMode);
  };

  // ─── Render ────────────────────────────────────────────────

  return (
    <section className="bg-surface border border-border rounded-xl overflow-hidden">
      {/* Section header (clickable to toggle) */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-3 p-4 hover:bg-surface-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-ads/12 text-ads shrink-0">
            <Sparkles size={16} />
          </div>
          <div className="min-w-0 text-left">
            <h3 className="text-[13px] font-bold text-text uppercase tracking-wider">
              1. Advertiser & Paket
            </h3>
            <p className="text-[11px] text-text-muted mt-0.5">
              Anchor: pilih advertiser + paket — tipe, harga, posisi, durasi ngikut
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isComplete && (
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-status-healthy/12 text-status-healthy">
              <Check size={12} />
            </span>
          )}
          {expanded ? (
            <ChevronUp size={16} className="text-text-muted" />
          ) : (
            <ChevronDown size={16} className="text-text-muted" />
          )}
        </div>
      </button>

      {/* Section body */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-border">
          {/* ════ Advertiser Section ════ */}
          {!state.use_free_text_mode ? (
            // ─── Picker Mode (default) ───
            <div className="flex flex-col gap-2 pt-4">
              <label className="block text-[11px] font-bold uppercase tracking-wide text-text-muted">
                Pilih Advertiser <span className="text-status-critical">*</span>
              </label>
              <AdvertiserPicker
                value={advertiserEntity}
                onSelect={handleAdvertiserSelect}
              />
              {advertiserAccountError && (
                <p className="text-[10px] text-status-critical">{advertiserAccountError}</p>
              )}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-[10px] text-text-subtle leading-relaxed">
                  💡 Tipe + paket ngikut otomatis dari advertiser. Belum kedaftar? Tambah via Tab "Advertiser".
                </p>
                {/* SESI 11 Batch 2: Mode Cepat DEMOTED ke link darurat kecil */}
                <button
                  type="button"
                  onClick={handleToggleMode}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-text-subtle hover:text-status-warning transition-colors shrink-0"
                >
                  <Zap size={10} />
                  Mode cepat (darurat)
                </button>
              </div>
            </div>
          ) : (
            // ─── Free-Text Mode (Mode Cepat, darurat) ───
            <div className="flex flex-col gap-4 pt-4">
              {/* SESI 11 Batch 2: banner darurat + back-to-picker */}
              <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-status-warning/8 border border-status-warning/30">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-status-warning">
                  <Zap size={12} />
                  Mode Cepat (darurat) — disarankan pakai Picker
                </span>
                <button
                  type="button"
                  onClick={handleToggleMode}
                  className="text-[10px] font-bold text-ads hover:text-ads/80 transition-colors shrink-0"
                >
                  ← Balik ke Picker
                </button>
              </div>

              {/* Advertiser name */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-text-muted mb-1.5">
                  Nama Advertiser <span className="text-status-critical">*</span>
                </label>
                <input
                  type="text"
                  value={state.advertiser_name}
                  onChange={(e) => setField('advertiser_name', e.target.value)}
                  placeholder="Contoh: Pertashop Halmahera Utara"
                  maxLength={80}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg',
                    'bg-surface border text-[13px] text-text',
                    'placeholder:text-text-subtle',
                    'focus:outline-none focus:ring-2 focus:ring-ads/20 transition-all',
                    nameError
                      ? 'border-status-critical/40 focus:border-status-critical/60'
                      : 'border-border focus:border-ads/50',
                  )}
                />
                <div className="flex items-center justify-between mt-1">
                  {nameError ? (
                    <p className="text-[10px] text-status-critical">{nameError}</p>
                  ) : (
                    <span />
                  )}
                  <p className="text-[10px] text-text-subtle">
                    {state.advertiser_name.length}/80
                  </p>
                </div>
              </div>

              {/* Advertiser type — radio cards (SESI 5C-B: 2-row semantic) */}
              {/* Row 1: Brand commercial (autoReview=false) — Umum + Komersial + Premium */}
              {/* Row 2: Compliance (autoReview=true) — Pemerintah + Politisi */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-text-muted mb-2">
                  Tipe Advertiser <span className="text-status-critical">*</span>
                </label>

                {/* Row 1 — 3 cards brand commercial */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {TYPE_OPTIONS.filter((o) => !o.autoReview).map((opt) => {
                    const isActive = state.advertiser_type === opt.value;
                    return (
                      <label
                        key={opt.value}
                        className={cn(
                          'flex items-start gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors',
                          isActive
                            ? 'bg-ads/8 border-ads/40'
                            : 'bg-surface border-border hover:bg-surface-muted',
                        )}
                      >
                        <input
                          type="radio"
                          name="advertiser_type"
                          checked={isActive}
                          onChange={() => setField('advertiser_type', opt.value)}
                          className="accent-ads mt-0.5 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <opt.icon size={16} className={cn(isActive ? "text-ads" : "text-text-muted")} aria-hidden />
                            <span
                              className={cn(
                                'text-[12px] font-bold',
                                isActive ? 'text-text' : 'text-text-muted',
                              )}
                            >
                              {opt.label}
                            </span>
                          </div>
                          <p className="text-[10px] text-text-muted mt-0.5 leading-relaxed">
                            {opt.description}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {/* Separator note antar 2 row */}
                <p className="text-[9px] text-text-subtle mt-2 mb-1.5 flex items-center gap-1">
                  <AlertTriangle size={9} className="text-status-warning" />
                  Tipe di bawah ini wajib review compliance (auto pending_review):
                </p>

                {/* Row 2 — 2 cards compliance auto-review */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {TYPE_OPTIONS.filter((o) => o.autoReview).map((opt) => {
                    const isActive = state.advertiser_type === opt.value;
                    return (
                      <label
                        key={opt.value}
                        className={cn(
                          'flex items-start gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors',
                          isActive
                            ? 'bg-ads/8 border-ads/40'
                            : 'bg-surface border-border hover:bg-surface-muted',
                        )}
                      >
                        <input
                          type="radio"
                          name="advertiser_type"
                          checked={isActive}
                          onChange={() => setField('advertiser_type', opt.value)}
                          className="accent-ads mt-0.5 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <opt.icon size={16} className={cn(isActive ? "text-ads" : "text-text-muted")} aria-hidden />
                            <span
                              className={cn(
                                'text-[12px] font-bold',
                                isActive ? 'text-text' : 'text-text-muted',
                              )}
                            >
                              {opt.label}
                            </span>
                          </div>
                          <p className="text-[10px] text-text-muted mt-0.5 leading-relaxed">
                            {opt.description}
                          </p>
                          {opt.warning && (
                            <div className="flex items-center gap-1 mt-1.5">
                              <AlertTriangle size={9} className="text-status-warning shrink-0" />
                              <span className="text-[9px] font-semibold text-status-warning">
                                {opt.warning}
                              </span>
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-text-muted mb-1.5">
                  Nomor Kontak <span className="text-text-subtle">(opsional)</span>
                </label>
                <input
                  type="tel"
                  value={state.advertiser_phone}
                  onChange={(e) => setField('advertiser_phone', e.target.value)}
                  placeholder="Contoh: 08123456789"
                  className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-[13px] text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-ads/20 focus:border-ads/50 transition-all"
                />
                <p className="text-[10px] text-text-subtle mt-1">
                  Untuk koordinasi pembaruan iklan / billing
                </p>
              </div>
            </div>
          )}

          {/* ════ Pricing Tier Section (ALWAYS visible, both modes) ════ */}
          {/* SESI 11 Spine Batch 2: paket WAJIB (anchor). */}
          <div className="mt-5 pt-5 border-t border-border">
            <label className="block text-[11px] font-bold uppercase tracking-wide text-text-muted mb-2">
              Paket Harga <span className="text-status-critical">*</span>
              <span className="text-text-subtle font-normal normal-case ml-1">
                — anchor: nentuin posisi, gerak, harga & durasi
              </span>
            </label>
            <PricingTierPicker
              value={pricingTierEntity}
              onSelect={handlePricingTierSelect}
              highlightCategory={highlightCategory}
            />
            <p className="text-[10px] text-text-subtle mt-2 leading-relaxed">
              💡 Paket nentuin posisi yang boleh, jenis materi (gambar/dinamis), harga, & durasi tayang.
            </p>
          </div>

          {/* ════ SESI 5C-B: HARGA FINAL DISETUJUI ════ */}
          {pricingTierEntity && (
            <PriceFinalField
              tier={pricingTierEntity}
              value={state.price_paid}
              onChange={(v) => setField('price_paid', v)}
            />
          )}
        </div>
      )}
    </section>
  );
}

// ════════════════════════════════════════════════════════════════════
// SESI 5C-B: PriceFinalField — input "Harga Final Disetujui"
// ════════════════════════════════════════════════════════════════════
// Q1 HYBRID + Q3 SOFT warning out_of_range

function PriceFinalField({
  tier,
  value,
  onChange,
}: {
  tier:     PricingTier;
  value:    number | null;
  onChange: (v: number | null) => void;
}) {
  const [inputValue, setInputValue] = useState<string>(
    value === null ? '' : value.toString(),
  );

  useEffect(() => {
    if (value === null) {
      setInputValue('');
    } else {
      setInputValue(value.toString());
    }
  }, [value]);

  const outOfRange = (() => {
    if (value === null || value <= 0) return null;
    if (value < tier.price_normal_min) return 'below';
    if (value > tier.price_normal_max) return 'above';
    return null;
  })();

  const handleInputChange = (raw: string) => {
    const digitsOnly = raw.replace(/[^\d]/g, '');
    setInputValue(digitsOnly);
    onChange(digitsOnly === '' ? null : parseInt(digitsOnly, 10));
  };

  const formatRp = (n: number | null) =>
    n === null ? '—' : `Rp ${n.toLocaleString('id-ID')}`;

  return (
    <div className="mt-5 pt-5 border-t border-border">
      <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-text-muted mb-2">
        <Wallet size={12} className="text-ads" />
        Harga Final Disetujui
        <span className="text-text-subtle font-normal normal-case">
          (opsional saat create — confirm di modal pembayaran)
        </span>
      </label>

      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-bold text-text-muted">
          Rp
        </span>
        <input
          type="text"
          inputMode="numeric"
          value={inputValue ? parseInt(inputValue, 10).toLocaleString('id-ID') : ''}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={`${tier.price_normal_min.toLocaleString('id-ID')} - ${tier.price_normal_max.toLocaleString('id-ID')}`}
          className={cn(
            'w-full pl-9 pr-3 py-2 rounded-lg bg-surface border text-[13px] text-text font-mono',
            'focus:outline-none focus:ring-2 focus:ring-ads/20 transition-colors',
            outOfRange
              ? 'border-status-warning focus:border-status-warning/50'
              : 'border-border focus:border-ads/50',
          )}
        />
      </div>

      <p className="text-[10px] text-text-subtle mt-1.5 flex items-center gap-1">
        <DollarSign size={10} />
        Range tier <strong className="text-text-muted">{tier.tier_name}</strong>:
        {' '}{formatRp(tier.price_normal_min)} – {formatRp(tier.price_normal_max)}
        {' '}({tier.duration_days} hari)
      </p>

      {outOfRange === 'below' && (
        <div className="mt-2 flex items-start gap-2 px-3 py-2 rounded-md bg-status-warning/8 border border-status-warning/30">
          <AlertTriangle size={12} className="text-status-warning shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-status-warning">
              Harga di BAWAH range tier
            </p>
            <p className="text-[10px] text-text-muted mt-0.5 leading-relaxed">
              Tier minimum: {formatRp(tier.price_normal_min)}. Boleh save (diskon/promo OK),
              tapi akan di-flag <code>out_of_range</code> di audit log.
            </p>
          </div>
        </div>
      )}

      {outOfRange === 'above' && (
        <div className="mt-2 flex items-start gap-2 px-3 py-2 rounded-md bg-status-warning/8 border border-status-warning/30">
          <AlertTriangle size={12} className="text-status-warning shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-status-warning">
              Harga di ATAS range tier
            </p>
            <p className="text-[10px] text-text-muted mt-0.5 leading-relaxed">
              Tier maximum: {formatRp(tier.price_normal_max)}. Boleh save (premium custom OK),
              tapi akan di-flag <code>out_of_range</code> di audit log.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
