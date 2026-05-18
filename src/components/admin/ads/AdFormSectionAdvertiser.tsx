'use client';

/**
 * TeraLoka — AdFormSectionAdvertiser
 * Mission 8 Sub-Phase 8-B + SESI 5B STEP 3 (18 Mei 2026)
 * ------------------------------------------------------------
 * Section 1 form: Informasi Advertiser & Pricing Tier.
 *
 * Modes (Hybrid Q2 C — Mode Cepat toggle):
 *   - Picker Mode (default): AdvertiserPicker + auto-fill metadata
 *   - Mode Cepat (legacy): existing free-text inputs untuk emergency/back-compat
 *
 * Always visible: PricingTierPicker (both modes, optional select untuk SESI 5B MVP)
 *
 * Edit mode handling:
 *   - state.use_free_text_mode derived from ad.advertiser_account_id presence
 *     (handled in AdFormProvider edit bootstrap)
 *   - Section fetches entity by ID for display (cached locally)
 *
 * Mapping logic (account_type → tier_category) — PHASE 3 SYMMETRIC:
 *   - umkm            → 'umkm'
 *   - local_corporate → 'local_corporate' (PHASE 3 NEW — no more umkm fallback)
 *   - premium         → 'premium'
 *   - politik         → 'politik'
 *   - pemerintah      → 'pemerintah' (PHASE 3 NEW — no more premium fallback)
 *
 * History:
 *   - α/Batch 1 (16 Mei 2026): initial
 *   - SESI 5B STEP 3 (18 Mei 2026): wire AdvertiserPicker + PricingTierPicker
 *   - PHASE 3 (18 Mei 2026): symmetric mapping 5×5, hapus fallback stale
 */

import { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Check,
  Building2,
  AlertTriangle,
  Zap,
  UserCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import ImageUpload from '@/components/ui/ImageUpload';
import { useAdForm, type AdvertiserType } from './AdFormProvider';
import AdvertiserPicker from './advertisers/AdvertiserPicker';
import PricingTierPicker, {
  type TierCategory,
  type PricingTier,
} from './pricing-tiers/PricingTierPicker';
import type { Advertiser } from './advertisers/AdvertiserPanel';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

// ─── Helper: Map account_type (advertiser entity) → tier_category ───
// PHASE 3: Symmetric 5×5 mapping (no more fallback to umkm/premium)
function getTierCategoryForAccount(accountType: string): TierCategory | undefined {
  const map: Record<string, TierCategory | undefined> = {
    umkm:            'umkm',
    local_corporate: 'local_corporate',  // ← PHASE 3 FIX (was 'umkm')
    premium:         'premium',
    politik:         'politik',
    pemerintah:      'pemerintah',       // ← PHASE 3 FIX (was 'premium')
  };
  return map[accountType];
}

// ─── Helper: Map free-text AdvertiserType → tier_category ───
// PHASE 3: pemerintah symmetric fix. komersial+umum tetap → umkm
// (legacy free-text type gak punya local_corporate concept).
function getTierCategoryForFreeText(advertiserType: AdvertiserType): TierCategory | undefined {
  const map: Record<AdvertiserType, TierCategory | undefined> = {
    umum:       'umkm',
    komersial:  'umkm',         // legacy back-compat: 'komersial' generic → UMKM tier
    politisi:   'politik',
    pemerintah: 'pemerintah',    // ← PHASE 3 FIX (was 'premium')
  };
  return map[advertiserType];
}

// ─── Helper: Map account_type → advertiser_type (denormalized cache) ───
function mapAccountTypeToAdvertiserType(accountType: string): AdvertiserType {
  const map: Record<string, AdvertiserType> = {
    umkm:            'umum',
    local_corporate: 'komersial',
    premium:         'komersial',
    politik:         'politisi',
    pemerintah:      'pemerintah',
  };
  return map[accountType] ?? 'komersial';
}

// ─── Free-text TYPE_OPTIONS (legacy 4-card radio) ──────────────────
const TYPE_OPTIONS: Array<{
  value: AdvertiserType;
  label: string;
  description: string;
  emoji: string;
  warning?: string;
}> = [
  { value: 'umum',       label: 'Umum',       emoji: '🌐', description: 'UMKM, individual, organisasi non-formal' },
  { value: 'komersial',  label: 'Komersial',  emoji: '💼', description: 'PT/CV, brand nasional, korporasi' },
  { value: 'pemerintah', label: 'Pemerintah', emoji: '🏢', description: 'Instansi pemerintah, BUMN, BPJS', warning: 'Auto pending_review' },
  { value: 'politisi',   label: 'Politisi',   emoji: '🏛️', description: 'Calon legislatif, partai politik, calon kepala daerah', warning: 'KPU compliance + pending_review' },
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
  useEffect(() => {
    if (!state.pricing_tier_id || !token) {
      setPricingTierEntity(null);
      return;
    }
    fetch(`${API}/admin/ads/pricing-tiers/${state.pricing_tier_id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((j) => {
        if (j.success && j.data) setPricingTierEntity(j.data);
      })
      .catch(() => {});
  }, [state.pricing_tier_id, token]);

  // Derive highlightCategory untuk PricingTierPicker (Q1 B — Soft Filter)
  const highlightCategory: TierCategory | undefined = state.use_free_text_mode
    ? getTierCategoryForFreeText(state.advertiser_type)
    : advertiserEntity
      ? getTierCategoryForAccount(advertiserEntity.account_type)
      : undefined;

  // Completion check (depends on mode)
  const isComplete = state.use_free_text_mode
    ? state.advertiser_name.trim().length > 0 && Boolean(state.advertiser_type)
    : state.advertiser_account_id !== null;

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
      // Logo: keep current state (admin upload manual, independent dari entity)
    } else {
      setField('advertiser_account_id', null);
      // Don't clear other fields — admin might want to keep them as draft
    }
  };

  const handlePricingTierSelect = (tier: PricingTier | null) => {
    setPricingTierEntity(tier);
    setField('pricing_tier_id', tier?.id ?? null);
  };

  const handleToggleMode = () => {
    const newMode = !state.use_free_text_mode;
    setField('use_free_text_mode', newMode);
    // Switching to picker mode: clear free-text-only data? NO — keep as cache
    // Switching to free-text mode: clear advertiser_account_id? NO — keep for round-trip
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
            <Building2 size={16} />
          </div>
          <div className="min-w-0 text-left">
            <h3 className="text-[13px] font-bold text-text uppercase tracking-wider">
              1. Informasi Advertiser & Pricing Tier
            </h3>
            <p className="text-[11px] text-text-muted mt-0.5">
              Siapa yang pasang iklan ini + paket harga
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
          {/* ════ Mode Toggle ════ */}
          <div className="flex items-center justify-between gap-2 pt-3 pb-3 mb-2">
            <div className="flex items-center gap-2">
              {state.use_free_text_mode ? (
                <>
                  <Zap size={14} className="text-status-warning" />
                  <span className="text-[11px] font-bold text-status-warning uppercase tracking-wide">
                    Mode Cepat (Free-Text)
                  </span>
                </>
              ) : (
                <>
                  <UserCheck size={14} className="text-ads" />
                  <span className="text-[11px] font-bold text-ads uppercase tracking-wide">
                    Mode Picker (Direkomendasikan)
                  </span>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={handleToggleMode}
              className="text-[10px] font-bold uppercase tracking-wide text-ads hover:text-ads/80 transition-colors px-2 py-1 rounded hover:bg-ads/8"
            >
              {state.use_free_text_mode ? '🎯 Beralih ke Picker' : '⚡ Pakai Mode Cepat'}
            </button>
          </div>

          {/* ════ Advertiser Section ════ */}
          {!state.use_free_text_mode ? (
            // ─── Picker Mode (default) ───
            <div className="flex flex-col gap-2">
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
              <p className="text-[10px] text-text-subtle leading-relaxed">
                💡 Belum ada advertiser? Tambah dulu via Tab "Advertiser" di /admin/ads,
                atau aktifkan <strong>Mode Cepat</strong> untuk input free-text.
              </p>
            </div>
          ) : (
            // ─── Free-Text Mode (Mode Cepat, legacy) ───
            <div className="flex flex-col gap-4">
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

              {/* Advertiser type — radio cards */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-text-muted mb-2">
                  Tipe Advertiser <span className="text-status-critical">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {TYPE_OPTIONS.map((opt) => {
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
                            <span aria-hidden className="text-[15px]">{opt.emoji}</span>
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

              {/* Logo upload */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-text-muted mb-1.5">
                  Logo Advertiser <span className="text-text-subtle">(opsional)</span>
                </label>
                <ImageUpload
                  bucket="ads"
                  maxFiles={1}
                  maxSizeMB={0.5}
                  existingUrls={state.advertiser_logo_url ? [state.advertiser_logo_url] : []}
                  onUpload={(urls) => setField('advertiser_logo_url', urls[0] ?? '')}
                  label="Logo (square, max 500KB)"
                />
                <p className="text-[10px] text-text-subtle mt-1">
                  Logo tampil di card iklan native (rekomen 200×200px)
                </p>
              </div>
            </div>
          )}

          {/* ════ Pricing Tier Section (ALWAYS visible, both modes) ════ */}
          {/* PHASE 3: Picker default-strict by category, dengan tombol "Lihat Semua" override */}
          <div className="mt-5 pt-5 border-t border-border">
            <label className="block text-[11px] font-bold uppercase tracking-wide text-text-muted mb-2">
              Pricing Tier <span className="text-text-subtle">(opsional MVP)</span>
            </label>
            <PricingTierPicker
              value={pricingTierEntity}
              onSelect={handlePricingTierSelect}
              highlightCategory={highlightCategory}
            />
            <p className="text-[10px] text-text-subtle mt-2 leading-relaxed">
              💡 Pilih tier untuk reference harga.
              Payment akan di-record manual oleh admin di tab keuangan (SESI 5C).
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
