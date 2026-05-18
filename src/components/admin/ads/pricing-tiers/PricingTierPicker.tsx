'use client';

/**
 * TeraLoka — PricingTierPicker
 * SESI 5B STEP 2 (18 Mei 2026)
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
 *   - Sort: matching highlightCategory first → display_order ascending
 *   - Card display: tier_name + category badge + price_normal range + duration
 *   - Selected state: thick ads-color border + checkmark
 *
 * USAGE:
 *   const [tier, setTier] = useState<PricingTier | null>(null);
 *
 *   <PricingTierPicker
 *     value={tier}
 *     onSelect={setTier}
 *     highlightCategory={advertiser?.account_type === 'umkm' ? 'umkm' : undefined}
 *   />
 *
 * Q3 LOCKED (Hybrid display+manual):
 *   Picker cuma DISPLAY price, gak auto-populate price_paid. Saat admin
 *   pilih tier, store pricing_tier_id di state. Payment manual entry SESI 5C.
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

// ─── Types (mirror schema) ──────────────────────────────────

export type TierCategory = 'umkm' | 'premium' | 'politik';

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

// ─── Constants ──────────────────────────────────────────────

const TIER_CATEGORY_LABEL: Record<TierCategory, string> = {
  umkm:    'UMKM',
  premium: 'Premium',
  politik: 'Politik',
};

const TIER_CATEGORY_COLOR: Record<TierCategory, string> = {
  umkm:    'bg-status-healthy/12 text-status-healthy border-status-healthy/30',
  premium: 'bg-bakabar/12 text-bakabar border-bakabar/30',
  politik: 'bg-balapor/12 text-balapor border-balapor/30',
};

// ─── Props ──────────────────────────────────────────────────

export interface PricingTierPickerProps {
  /** Currently selected tier (controlled) */
  value: PricingTier | null;

  /** Called when user picks tier OR clears */
  onSelect: (tier: PricingTier | null) => void;

  /**
   * Optional category to highlight at top (soft filter).
   * Parent responsibility to map advertiser.account_type → tier_category.
   * Pass undefined for no highlight (e.g. local_corporate or pemerintah advertiser).
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
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        // Filter active only + sort
        const activeTiers: PricingTier[] = (json.data ?? []).filter(
          (t: PricingTier) => t.is_active !== false,
        );
        setTiers(sortTiers(activeTiers, highlightCategory));
      } catch (err: any) {
        setError(err?.message ?? 'Network error');
      } finally {
        setLoading(false);
      }
    };
    fetchTiers();
  }, [token, highlightCategory]);

  // Re-sort kalau highlightCategory berubah (tanpa re-fetch)
  useEffect(() => {
    if (tiers.length > 0) {
      setTiers((prev) => sortTiers(prev, highlightCategory));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightCategory]);

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

  // ─── Empty State ───────────────────────────────────────────
  if (tiers.length === 0) {
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

  // ─── Tier Grid ─────────────────────────────────────────────
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {tiers.map((tier) => (
        <TierCard
          key={tier.id}
          tier={tier}
          selected={value?.id === tier.id}
          isHighlighted={
            highlightCategory !== undefined && tier.tier_category === highlightCategory
          }
          disabled={disabled}
          onClick={() => onSelect(value?.id === tier.id ? null : tier)}
        />
      ))}
    </div>
  );
}

// ─── Sub-Component: TierCard ───────────────────────────────────

function TierCard({
  tier,
  selected,
  isHighlighted,
  disabled,
  onClick,
}: {
  tier:          PricingTier;
  selected:      boolean;
  isHighlighted: boolean;
  disabled?:     boolean;
  onClick:       () => void;
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
        selected
          ? 'border-ads bg-ads/8 shadow-md'
          : isHighlighted
            ? 'border-ads/40 bg-ads/4 hover:border-ads/60'
            : 'border-border bg-surface hover:bg-surface-muted/50',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      {/* Match badge kalau highlighted */}
      {isHighlighted && !selected && (
        <span className="absolute top-1.5 right-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-ads/15 text-ads">
          <Sparkles size={9} />
          Match
        </span>
      )}

      {/* Selected checkmark */}
      {selected && (
        <span className="absolute top-1.5 right-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-ads text-white">
          <Check size={9} />
          Dipilih
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
        selected ? 'text-ads' : 'text-text',
      )}>
        {tier.tier_name}
      </p>

      {/* Price + duration */}
      <div className="flex flex-col gap-0.5">
        <p className={cn(
          'text-[13px] font-bold',
          selected ? 'text-ads' : 'text-text',
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
