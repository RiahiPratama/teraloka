'use client';

/**
 * TeraLoka — PricingTierPicker
 * SESI 5B STEP 2 (18 Mei 2026) + PHASE 3 (18 Mei 2026)
 * ────────────────────────────────────────────────────────────────────
 * Card-style selector untuk pilih Pricing Tier saat create/edit ad.
 *
 * Used by:
 *   - AdFormSectionAdvertiser (Mission 8 Sub-Phase 8-B) — alongside AdvertiserPicker
 *
 * Pattern: Card grid mirror account_type cards di AdvertiserEditModal.
 *
 * Behavior:
 *   - Fetch GET /admin/ads/pricing-tiers (filter is_active=true client-side)
 *   - HYBRID FILTER (PHASE 3):
 *     - Default: STRICT mode — hanya tampil tier matching highlightCategory
 *     - Toggle "Lihat Semua Tier" → expand all (match di-atas dengan badge)
 *   - Empty state per-kategori kalau zero match
 *   - Card display: tier_name + category badge + price_normal range + duration
 *   - Selected state: thick ads-color border + checkmark
 *
 * USAGE:
 *   const [tier, setTier] = useState<PricingTier | null>(null);
 *
 *   <PricingTierPicker
 *     value={tier}
 *     onSelect={setTier}
 *     highlightCategory={advertiser?.account_type as TierCategory}
 *   />
 *
 * Q3 LOCKED (Hybrid display+manual):
 *   Picker cuma DISPLAY price, gak auto-populate price_paid. Saat admin
 *   pilih tier, store pricing_tier_id di state. Payment manual entry SESI 5C.
 *
 * PHASE 3 — HYBRID FILTER UX:
 *   Default-strict + override "Lihat Semua" — defense in depth, fleksibel
 *   saat exception. Backend tetap reject mismatch di submit (Step 1.10/1.11).
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  Loader2,
  Clock,
  Check,
  AlertCircle,
  Sparkles,
  FileText,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

// ─── Types (mirror schema PHASE 3 — 5 kategori) ──────────────

export type TierCategory =
  | 'umkm'
  | 'local_corporate'
  | 'premium'
  | 'politik'
  | 'pemerintah';

export interface PricingTier {
  id:                       string;
  display_id:               string;
  tier_code:                string;
  tier_name:                string;
  tier_category:            TierCategory;
  price_starter_min:        number;
  price_starter_max:        number;
  price_growth_min:         number | null;
  price_growth_max:         number | null;
  price_normal_min:         number;
  price_normal_max:         number;
  price_enterprise_min:     number | null;
  price_enterprise_max:     number | null;
  duration_days:            number;
  target_industry:          string[] | null;
  positions_allowed:        string[] | null;
  features:                 any | null;
  priority_level:           number;
  requires_pkp_invoice:     boolean | null;
  requires_manual_review:   boolean | null;
  requires_compliance_fee:  boolean | null;
  requires_politik_clauses: boolean | null;
  is_active:                boolean | null;
  display_order:            number | null;
  is_public:                boolean | null;
  created_at:               string;
  updated_at:               string | null;
}

// ─── Constants — 5 kategori ──────────────────────────────────

const TIER_CATEGORY_LABEL: Record<TierCategory, string> = {
  umkm:            'UMKM',
  local_corporate: 'Local Corp',
  premium:         'Premium',
  politik:         'Politik',
  pemerintah:      'Pemerintah',
};

const TIER_CATEGORY_COLOR: Record<TierCategory, string> = {
  umkm:            'bg-status-healthy/12 text-status-healthy border-status-healthy/30',
  local_corporate: 'bg-ads/12 text-ads border-ads/30',
  premium:         'bg-bakabar/12 text-bakabar border-bakabar/30',
  politik:         'bg-balapor/12 text-balapor border-balapor/30',
  pemerintah:      'bg-status-warning/12 text-status-warning border-status-warning/30',
};

// ─── Props ──────────────────────────────────────────────────

export interface PricingTierPickerProps {
  /** Currently selected tier (controlled) */
  value: PricingTier | null;

  /** Called when user picks tier OR clears */
  onSelect: (tier: PricingTier | null) => void;

  /**
   * Optional category to filter (PHASE 3 — strict default).
   * Parent responsibility to map advertiser.account_type → tier_category.
   * If provided: picker default-shows ONLY matching tier (HYBRID OPSI C).
   * User can toggle "Lihat Semua" untuk expand all.
   * If undefined: picker shows all tier (no filter).
   */
  highlightCategory?: TierCategory;

  /** Disabled state */
  disabled?: boolean;
}

// ─── Component ──────────────────────────────────────────────

export default function PricingTierPicker({
  value,
  onSelect,
  highlightCategory,
  disabled,
}: PricingTierPickerProps) {
  const { token } = useAuth();
  const [allTiers, setAllTiers]   = useState<PricingTier[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  // PHASE 3 HYBRID: toggle untuk override strict filter
  const [showAllTiers, setShowAllTiers] = useState(false);

  // Fetch all tiers on mount
  useEffect(() => {
    if (!token) return;

    const fetchTiers = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API}/admin/ads/pricing-tiers`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!json.success) {
          setError(json.error?.message ?? 'Gagal memuat pricing tiers');
          return;
        }
        // Filter active only
        const activeTiers: PricingTier[] = (json.data ?? []).filter(
          (t: PricingTier) => t.is_active !== false,
        );
        setAllTiers(activeTiers);
      } catch (err: any) {
        setError(err?.message ?? 'Network error');
      } finally {
        setLoading(false);
      }
    };
    fetchTiers();
  }, [token]);

  // PHASE 3 HYBRID: compute displayed tiers based on filter mode
  // - If highlightCategory undefined → tampil semua (no filter)
  // - If highlightCategory provided + showAllTiers=false → STRICT (cuma match)
  // - If highlightCategory provided + showAllTiers=true → ALL (match di-atas)
  const displayedTiers: PricingTier[] = (() => {
    if (!highlightCategory) return sortTiers(allTiers, undefined);
    if (!showAllTiers) {
      // STRICT: cuma tier matching kategori
      return sortTiers(
        allTiers.filter((t) => t.tier_category === highlightCategory),
        highlightCategory,
      );
    }
    // ALL: tampil semua, match di atas
    return sortTiers(allTiers, highlightCategory);
  })();

  // Count for toggle button
  const totalCount   = allTiers.length;
  const matchCount   = highlightCategory
    ? allTiers.filter((t) => t.tier_category === highlightCategory).length
    : 0;
  const nonMatchCount = totalCount - matchCount;

  // ─── Loading State ─────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-4 rounded-md bg-surface border border-border">
        <Loader2 size={14} className="text-ads animate-spin" />
        <p className="text-[12px] text-text-muted">Memuat pricing tiers...</p>
      </div>
    );
  }

  // ─── Error State ───────────────────────────────────────────
  if (error) {
    return (
      <div className="flex items-start gap-2 px-3 py-3 rounded-md bg-balapor/8 border border-balapor/30">
        <AlertCircle size={14} className="text-balapor shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-bold text-balapor">Gagal memuat tiers</p>
          <p className="text-[10px] text-text-muted mt-0.5">{error}</p>
        </div>
      </div>
    );
  }

  // ─── Empty State (PHASE 3 — kategori-aware) ────────────────
  if (displayedTiers.length === 0) {
    // CASE 1: total empty (gak ada tier sama sekali)
    if (totalCount === 0) {
      return (
        <div className="flex items-start gap-2 px-3 py-3 rounded-md bg-surface border border-border">
          <Sparkles size={14} className="text-text-muted shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-bold text-text-muted">
              Belum ada pricing tier aktif
            </p>
            <p className="text-[10px] text-text-subtle mt-0.5">
              💡 Setup pricing tier di Tab Pricing Tiers dulu sebelum buat iklan.
            </p>
          </div>
        </div>
      );
    }

    // CASE 2: kategori-specific empty (highlight match = 0, tapi total > 0)
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-start gap-2 px-3 py-3 rounded-md bg-status-warning/8 border border-status-warning/30">
          <AlertCircle size={14} className="text-status-warning shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-bold text-status-warning">
              Belum ada tier untuk kategori{' '}
              <span className="uppercase">{TIER_CATEGORY_LABEL[highlightCategory!]}</span>
            </p>
            <p className="text-[10px] text-text-subtle mt-0.5 leading-relaxed">
              💡 Hubungi admin untuk setup tier kategori ini, atau klik
              "Lihat Semua Tier" untuk override (akan di-warning saat submit).
            </p>
          </div>
        </div>
        {/* Toggle to expand all */}
        <button
          type="button"
          onClick={() => setShowAllTiers(true)}
          disabled={disabled}
          className={cn(
            'flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-[11px] font-bold',
            'border border-border bg-surface text-text-muted',
            'hover:bg-surface-muted hover:text-text transition-colors',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
        >
          <Eye size={12} />
          Lihat Semua Tier ({totalCount})
        </button>
      </div>
    );
  }

  // ─── Tier Grid + Toggle Button ─────────────────────────────
  return (
    <div className="flex flex-col gap-2">
      {/* Tier cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {displayedTiers.map((tier) => (
          <TierCard
            key={tier.id}
            tier={tier}
            selected={value?.id === tier.id}
            isMatch={
              highlightCategory !== undefined && tier.tier_category === highlightCategory
            }
            isMismatchWarning={
              // Warning kuning kalau admin pilih tier mismatch (defense layer 2 visual)
              highlightCategory !== undefined &&
              value?.id === tier.id &&
              tier.tier_category !== highlightCategory
            }
            disabled={disabled}
            onClick={() => onSelect(value?.id === tier.id ? null : tier)}
          />
        ))}
      </div>

      {/* PHASE 3 HYBRID — Toggle Button (only kalau highlightCategory + ada non-match) */}
      {highlightCategory && nonMatchCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAllTiers(!showAllTiers)}
          disabled={disabled}
          className={cn(
            'flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-[11px] font-bold',
            'border border-border bg-surface text-text-muted',
            'hover:bg-surface-muted hover:text-text transition-colors',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
        >
          {showAllTiers ? (
            <>
              <EyeOff size={12} />
              Sembunyikan Non-Match (tampil {matchCount} match saja)
            </>
          ) : (
            <>
              <Eye size={12} />
              Lihat Semua Tier ({totalCount}) — termasuk {nonMatchCount} non-match
            </>
          )}
        </button>
      )}

      {/* Mismatch warning kalau selected tier beda kategori */}
      {value && highlightCategory && value.tier_category !== highlightCategory && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-status-warning/8 border border-status-warning/30">
          <AlertCircle size={12} className="text-status-warning shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-status-warning">
              Tier mismatch kategori
            </p>
            <p className="text-[10px] text-text-muted mt-0.5 leading-relaxed">
              Tier kategori <strong>{TIER_CATEGORY_LABEL[value.tier_category]}</strong> berbeda
              dari advertiser kategori <strong>{TIER_CATEGORY_LABEL[highlightCategory]}</strong>.
              Backend akan reject saat submit. Pilih tier match atau ganti advertiser.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-Component: TierCard ───────────────────────────────────

function TierCard({
  tier,
  selected,
  isMatch,
  isMismatchWarning,
  disabled,
  onClick,
}: {
  tier:               PricingTier;
  selected:           boolean;
  isMatch:            boolean;
  isMismatchWarning:  boolean;
  disabled?:          boolean;
  onClick:            () => void;
}) {
  const priceDisplay = formatPriceRange(tier.price_normal_min, tier.price_normal_max);
  const hasComplianceFlags =
    tier.requires_pkp_invoice ||
    tier.requires_compliance_fee ||
    tier.requires_politik_clauses;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative flex flex-col items-stretch gap-2 px-3 py-3 rounded-lg border-2 text-left transition-all',
        selected && isMismatchWarning
          ? 'border-status-warning bg-status-warning/8 shadow-md'
          : selected
            ? 'border-ads bg-ads/8 shadow-md'
            : isMatch
              ? 'border-ads/40 bg-ads/4 hover:border-ads/60'
              : 'border-border bg-surface hover:bg-surface-muted/50',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      {/* Match badge kalau matching kategori (and not selected) */}
      {isMatch && !selected && (
        <span className="absolute top-1.5 right-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-ads/15 text-ads">
          <Sparkles size={9} />
          Match
        </span>
      )}

      {/* Selected checkmark */}
      {selected && !isMismatchWarning && (
        <span className="absolute top-1.5 right-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-ads text-white">
          <Check size={9} />
          Dipilih
        </span>
      )}

      {/* Mismatch warning badge */}
      {selected && isMismatchWarning && (
        <span className="absolute top-1.5 right-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-status-warning text-white">
          <AlertCircle size={9} />
          Mismatch
        </span>
      )}

      {/* Category badge */}
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            'inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border',
            TIER_CATEGORY_COLOR[tier.tier_category],
          )}
        >
          {TIER_CATEGORY_LABEL[tier.tier_category]}
        </span>
        <span className="text-[9px] font-mono text-text-subtle">{tier.tier_code}</span>
      </div>

      {/* Tier name */}
      <p className={cn(
        'text-[14px] font-extrabold leading-tight',
        selected ? (isMismatchWarning ? 'text-status-warning' : 'text-ads') : 'text-text',
      )}>
        {tier.tier_name}
      </p>

      {/* Price + duration */}
      <div className="flex flex-col gap-0.5">
        <p className={cn(
          'text-[13px] font-bold',
          selected ? (isMismatchWarning ? 'text-status-warning' : 'text-ads') : 'text-text',
        )}>
          {priceDisplay}
        </p>
        <div className="flex items-center gap-1 text-[10px] text-text-muted">
          <Clock size={10} />
          <span>{tier.duration_days} hari</span>
        </div>
      </div>

      {/* Compliance flags (kalau ada) */}
      {hasComplianceFlags && (
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-border/50">
          {tier.requires_pkp_invoice && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-text-muted">
              <FileText size={9} />
              PKP
            </span>
          )}
          {tier.requires_compliance_fee && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-text-muted">
              <ShieldCheck size={9} />
              Compliance Fee
            </span>
          )}
          {tier.requires_politik_clauses && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-balapor">
              <ShieldCheck size={9} />
              Politik Clauses
            </span>
          )}
        </div>
      )}
    </button>
  );
}

// ─── Helpers ────────────────────────────────────────────────

/**
 * Sort tiers: matching highlightCategory at top, then by display_order ascending.
 */
function sortTiers(tiers: PricingTier[], highlightCategory?: TierCategory): PricingTier[] {
  return tiers.slice().sort((a, b) => {
    // 1. Matching category goes first
    if (highlightCategory) {
      const aMatch = a.tier_category === highlightCategory ? 1 : 0;
      const bMatch = b.tier_category === highlightCategory ? 1 : 0;
      if (aMatch !== bMatch) return bMatch - aMatch;
    }

    // 2. display_order ascending (lower number = top)
    const aOrder = a.display_order ?? 999;
    const bOrder = b.display_order ?? 999;
    if (aOrder !== bOrder) return aOrder - bOrder;

    // 3. Fallback: tier_name alphabetical
    return a.tier_name.localeCompare(b.tier_name, 'id');
  });
}

/**
 * Format price range:
 *   - min === max → "Rp 50.000"
 *   - min !== max → "Rp 300.000 - Rp 500.000"
 */
function formatPriceRange(min: number, max: number): string {
  const formatIDR = (n: number) =>
    `Rp ${n.toLocaleString('id-ID')}`;

  if (min === max) return formatIDR(min);
  return `${formatIDR(min)} - ${formatIDR(max)}`;
}
