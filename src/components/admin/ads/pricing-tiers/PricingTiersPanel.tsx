'use client';

/**
 * TeraLoka — PricingTiersPanel
 * SESI 3 BATCH 2 (18 Mei 2026) — Modal Wiring Update
 * ------------------------------------------------------------
 * Main panel — list pricing tier dengan tab Active vs Legacy (D3).
 *
 * Tab structure:
 *   [Tier Aktif (N)]  [Legacy (M)]
 *
 * Per-tier row Quick Actions (Z1.75):
 *   [Edit] [Duplicate] [Preview Pricing] [Disable/Enable] [Audit]
 *
 * Legacy tab: badge READ ONLY, Edit + Toggle disabled.
 *
 * Modal orchestration (BATCH 2 update):
 *   - EditModal     → PricingTierEditModal (Batch 1A)
 *   - PreviewModal  → PricingTierPreviewModal (Batch 2 NEW) ✅
 *   - AuditModal    → PricingTierAuditModal (Batch 2 NEW) ✅
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  Pencil,
  Copy,
  Eye,
  ToggleLeft,
  ToggleRight,
  ClipboardList,
  Lock,
  Plus,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import PricingTierEditModal from './PricingTierEditModal';
import PricingTierPreviewModal from './PricingTierPreviewModal';
import PricingTierAuditModal from './PricingTierAuditModal';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

export interface PricingTier {
  id:                       string;
  display_id:               string;
  tier_code:                string;
  tier_name:                string;
  tier_category:            'umkm' | 'premium' | 'politik';
  price_starter_min:        number;
  price_starter_max:        number;
  price_growth_min:         number | null;
  price_growth_max:         number | null;
  price_normal_min:         number;
  price_normal_max:         number;
  price_enterprise_min:     number | null;
  price_enterprise_max:     number | null;
  duration_days:            number;
  positions_allowed:        string[];
  features:                 Record<string, any>;
  priority_level:           number;
  requires_pkp_invoice:     boolean;
  requires_manual_review:   boolean;
  requires_compliance_fee:  boolean;
  requires_politik_clauses: boolean;
  is_active:                boolean;
  is_public:                boolean;
  display_order:            number;
  created_at:               string;
  updated_at:               string;
}

type ActiveTab = 'active' | 'legacy';

const CATEGORY_LABEL: Record<string, string> = {
  umkm:    'UMKM',
  premium: 'Premium',
  politik: 'Politik',
};

const CATEGORY_COLOR: Record<string, string> = {
  umkm:    'bg-status-healthy/12 text-status-healthy',
  premium: 'bg-bakabar/12 text-bakabar',
  politik: 'bg-balapor/12 text-balapor',
};

export default function PricingTiersPanel() {
  const { token } = useAuth();
  const [tiers, setTiers]               = useState<PricingTier[]>([]);
  const [loading, setLoading]           = useState(true);
  const [activeTab, setActiveTab]       = useState<ActiveTab>('active');
  const [processing, setProcessing]     = useState<string | null>(null);
  const [toast, setToast]               = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  // Modal states
  const [editingTier, setEditingTier]       = useState<PricingTier | null>(null);
  const [creating, setCreating]             = useState(false);
  const [previewingTier, setPreviewingTier] = useState<PricingTier | null>(null);
  const [auditingTier, setAuditingTier]     = useState<PricingTier | null>(null);

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchTiers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/ads/pricing-tiers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message);
      setTiers(json.data ?? []);
    } catch (err: any) {
      showToast(err.message ?? 'Gagal load tier', 'err');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchTiers();
  }, [fetchTiers]);

  // Heuristic legacy detection: tier_code includes 'legacy' OR features.legacy === true
  const isLegacy = (t: PricingTier): boolean => {
    return t.tier_code.includes('legacy') || t.features?.legacy === true;
  };

  const activeTiers = tiers.filter((t) => !isLegacy(t));
  const legacyTiers = tiers.filter((t) => isLegacy(t));
  const visibleTiers = activeTab === 'active' ? activeTiers : legacyTiers;

  const handleToggleActive = async (tier: PricingTier) => {
    if (!token) return;
    setProcessing(tier.id);
    try {
      const res = await fetch(`${API}/admin/ads/pricing-tiers/${tier.id}/toggle-active`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message);
      showToast(`Tier ${tier.is_active ? 'dinonaktifkan' : 'diaktifkan'}`);
      fetchTiers();
    } catch (err: any) {
      showToast(err.message ?? 'Gagal toggle', 'err');
    } finally {
      setProcessing(null);
    }
  };

  const handleDuplicate = async (tier: PricingTier) => {
    if (!token) return;
    if (!confirm(`Duplikat tier "${tier.tier_name}"?\n\nTier baru akan dibuat dengan tier_code "${tier.tier_code}_copy" dan default inactive+hidden.`)) {
      return;
    }
    setProcessing(tier.id);
    try {
      const res = await fetch(`${API}/admin/ads/pricing-tiers/${tier.id}/duplicate`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message);
      showToast(`✅ Tier diduplikat: ${json.data.tier_name}`);
      fetchTiers();
    } catch (err: any) {
      showToast(err.message ?? 'Gagal duplicate', 'err');
    } finally {
      setProcessing(null);
    }
  };

  const handleEditSaved = () => {
    setEditingTier(null);
    setCreating(false);
    fetchTiers();
    showToast('✅ Tier tersimpan');
  };

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className={cn(
          'fixed top-5 right-5 z-50 px-4 py-2.5 rounded-lg shadow-2xl text-[12px] font-bold',
          toast.type === 'ok'
            ? 'bg-status-healthy text-white'
            : 'bg-status-critical text-white',
        )}>
          {toast.msg}
        </div>
      )}

      <div className="flex flex-col gap-4">
        {/* ── Tab Switcher + Create Button ── */}
        <div className="flex items-center justify-between gap-3 border-b border-border">
          <div className="flex items-center gap-1">
            <TabButton
              active={activeTab === 'active'}
              onClick={() => setActiveTab('active')}
              label="Tier Aktif"
              count={activeTiers.length}
            />
            <TabButton
              active={activeTab === 'legacy'}
              onClick={() => setActiveTab('legacy')}
              label="Legacy"
              count={legacyTiers.length}
              tagReadOnly
            />
          </div>

          {activeTab === 'active' && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 mb-1 rounded-md bg-ads text-white text-[11px] font-bold uppercase tracking-wide hover:bg-ads/90 transition-colors shadow-sm"
            >
              <Plus size={11} />
              Tambah Tier
            </button>
          )}
        </div>

        {/* Legacy notice */}
        {activeTab === 'legacy' && legacyTiers.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-surface-muted/40 border border-border">
            <Lock size={12} className="text-text-muted shrink-0" />
            <p className="text-[10px] text-text-muted">
              <span className="font-bold">READ ONLY.</span> Tier legacy preserved untuk integrity kontrak existing.
              Edit &amp; toggle disabled. Deprecated sejak Z1 migration (18 Mei 2026).
            </p>
          </div>
        )}

        {/* ── Tier List ── */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="text-ads animate-spin" />
          </div>
        ) : visibleTiers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 rounded-xl bg-surface-muted/40 border border-border border-dashed">
            <p className="text-[14px] font-bold text-text-muted">
              {activeTab === 'active' ? 'Belum ada tier aktif' : 'Tidak ada tier legacy'}
            </p>
            <p className="text-[11px] text-text-subtle mt-1">
              {activeTab === 'active' ? 'Klik "Tambah Tier" untuk create baru' : 'Legacy tier muncul setelah migration Z1'}
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {visibleTiers.map((tier) => (
              <TierRow
                key={tier.id}
                tier={tier}
                isLegacy={activeTab === 'legacy'}
                processing={processing === tier.id}
                onEdit={() => setEditingTier(tier)}
                onDuplicate={() => handleDuplicate(tier)}
                onToggleActive={() => handleToggleActive(tier)}
                onPreview={() => setPreviewingTier(tier)}
                onAudit={() => setAuditingTier(tier)}
              />
            ))}
          </ul>
        )}
      </div>

      {/* ─── Modals ─── */}

      {/* Edit/Create Modal */}
      {(editingTier || creating) && (
        <PricingTierEditModal
          tier={editingTier}
          isCreate={creating}
          onClose={() => {
            setEditingTier(null);
            setCreating(false);
          }}
          onSaved={handleEditSaved}
        />
      )}

      {/* Preview Modal */}
      {previewingTier && (
        <PricingTierPreviewModal
          tier={previewingTier}
          onClose={() => setPreviewingTier(null)}
        />
      )}

      {/* Audit Modal */}
      {auditingTier && (
        <PricingTierAuditModal
          tier={auditingTier}
          onClose={() => setAuditingTier(null)}
        />
      )}
    </>
  );
}

// ─── TabButton ────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  label,
  count,
  tagReadOnly,
}: {
  active:       boolean;
  onClick:      () => void;
  label:        string;
  count:        number;
  tagReadOnly?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 px-4 py-2 text-[12px] font-bold uppercase tracking-wide transition-colors border-b-2 -mb-px',
        active
          ? 'border-ads text-ads'
          : 'border-transparent text-text-muted hover:text-text',
      )}
    >
      {label}
      <span className={cn(
        'inline-flex items-center justify-center min-w-[20px] h-[18px] px-1.5 rounded-full text-[9px] font-extrabold',
        active ? 'bg-ads text-white' : 'bg-surface-muted text-text-muted',
      )}>
        {count}
      </span>
      {tagReadOnly && (
        <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider bg-text-subtle/12 text-text-muted">
          Read Only
        </span>
      )}
    </button>
  );
}

// ─── TierRow ──────────────────────────────────────────────────

function TierRow({
  tier,
  isLegacy,
  processing,
  onEdit,
  onDuplicate,
  onToggleActive,
  onPreview,
  onAudit,
}: {
  tier:           PricingTier;
  isLegacy:       boolean;
  processing:     boolean;
  onEdit:         () => void;
  onDuplicate:    () => void;
  onToggleActive: () => void;
  onPreview:      () => void;
  onAudit:        () => void;
}) {
  const fmtRp = (n: number | null) => n === null ? '—' : `Rp ${n.toLocaleString('id-ID')}`;
  const priceRange = tier.price_normal_min === tier.price_normal_max
    ? fmtRp(tier.price_normal_min)
    : `${fmtRp(tier.price_normal_min)} – ${fmtRp(tier.price_normal_max)}`;

  return (
    <li className={cn(
      'flex flex-col gap-2.5 px-4 py-3 rounded-xl border bg-surface',
      tier.is_active ? 'border-border' : 'border-border opacity-60',
    )}>
      {/* Top Row: Tier Info */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-[14px] font-extrabold text-text">{tier.tier_name}</h4>
            <span className={cn(
              'px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide',
              CATEGORY_COLOR[tier.tier_category],
            )}>
              {CATEGORY_LABEL[tier.tier_category]}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-surface-muted text-text-muted font-mono">
              {tier.display_id}
            </span>
            {tier.is_active ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-status-healthy">
                <CheckCircle2 size={10} />
                Aktif
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-text-muted">
                <XCircle size={10} />
                Nonaktif
              </span>
            )}
            {!tier.is_public && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-text-subtle/12 text-text-muted">
                Hidden
              </span>
            )}
          </div>

          <p className="text-[11px] text-text-muted mt-1 font-mono">
            {tier.tier_code} · Priority {tier.priority_level} · {tier.duration_days} hari
          </p>
        </div>

        <div className="text-right shrink-0">
          <p className="text-[13px] font-extrabold text-text tabular-nums">{priceRange}</p>
          <p className="text-[10px] text-text-muted mt-0.5">Normal mode</p>
        </div>
      </div>

      {/* Bottom Row: Positions + Quick Actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex flex-wrap gap-1 min-w-0">
          {tier.positions_allowed.slice(0, 5).map((p) => (
            <span key={p} className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-baronda/10 text-baronda">
              {p}
            </span>
          ))}
          {tier.positions_allowed.length > 5 && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-surface-muted text-text-muted">
              +{tier.positions_allowed.length - 5}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <QuickActionBtn icon={Eye}  label="Preview" onClick={onPreview} disabled={processing} />
          <QuickActionBtn icon={ClipboardList} label="Audit" onClick={onAudit} disabled={processing} />
          {!isLegacy && (
            <>
              <QuickActionBtn icon={Copy}    label="Duplicate" onClick={onDuplicate} disabled={processing} />
              <QuickActionBtn
                icon={tier.is_active ? ToggleRight : ToggleLeft}
                label={tier.is_active ? 'Disable' : 'Enable'}
                onClick={onToggleActive}
                disabled={processing}
                variant={tier.is_active ? 'warn' : 'success'}
              />
              <QuickActionBtn icon={Pencil}  label="Edit"     onClick={onEdit} disabled={processing} variant="primary" />
            </>
          )}
          {isLegacy && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold text-text-muted bg-surface-muted/60">
              <Lock size={10} />
              READ ONLY
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

// ─── QuickActionBtn ───────────────────────────────────────────

function QuickActionBtn({
  icon: Icon,
  label,
  onClick,
  disabled,
  variant = 'default',
}: {
  icon:     typeof Pencil;
  label:    string;
  onClick:  () => void;
  disabled: boolean;
  variant?: 'default' | 'primary' | 'warn' | 'success';
}) {
  const variantClass = {
    default: 'bg-surface-muted text-text hover:bg-surface-muted/80',
    primary: 'bg-ads/12 text-ads hover:bg-ads/20',
    warn:    'bg-status-warning/12 text-status-warning hover:bg-status-warning/20',
    success: 'bg-status-healthy/12 text-status-healthy hover:bg-status-healthy/20',
  }[variant];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide transition-colors',
        variantClass,
        disabled && 'opacity-50 cursor-not-allowed',
      )}
      title={label}
    >
      <Icon size={10} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
