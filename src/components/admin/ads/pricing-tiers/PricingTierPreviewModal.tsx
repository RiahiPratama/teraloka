'use client';

/**
 * TeraLoka — PricingTierPreviewModal
 * SESI 3 BATCH 2 (18 Mei 2026)
 * ------------------------------------------------------------
 * Read-only preview modal — show tier complete config.
 *
 * Layout (4 sections):
 *   1. Header             — tier_name + category + status
 *   2. Pricing Matrix     — 4 mode (Starter / Growth / Normal / Enterprise)
 *   3. Positions & Config — positions_allowed, duration, priority, display_order
 *   4. Compliance Flags   — 4 boolean flags + Features JSON
 *
 * Pattern mirror: AdPreviewModal (Sub-Phase 8-E-6 17 Mei).
 */

import {
  X,
  Eye,
  DollarSign,
  Settings,
  Shield,
  CheckCircle2,
  XCircle,
  MapPin,
  Clock,
  Hash,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PricingTier } from './PricingTiersPanel';

export interface PricingTierPreviewModalProps {
  tier: PricingTier | null;
  onClose: () => void;
}

// PHASE 3 (18 Mei 2026): 5 kategori symmetric colors
//   umkm            = status-healthy (hijau)
//   local_corporate = ads (biru-corporate)
//   premium         = bakabar (oranye)
//   politik         = balapor (merah)
//   pemerintah      = status-warning (kuning)
const CATEGORY_COLOR: Record<string, string> = {
  umkm:            'bg-status-healthy/12 text-status-healthy',
  local_corporate: 'bg-ads/12 text-ads',
  premium:         'bg-bakabar/12 text-bakabar',
  politik:         'bg-balapor/12 text-balapor',
  pemerintah:      'bg-status-warning/12 text-status-warning',
};

const MODE_COLOR: Record<string, string> = {
  starter:    'text-status-critical bg-status-critical/8 border-status-critical/30',
  growth:     'text-status-warning bg-status-warning/8 border-status-warning/30',
  normal:     'text-status-healthy bg-status-healthy/8 border-status-healthy/30',
  enterprise: 'text-bakabar bg-bakabar/8 border-bakabar/30',
};

const fmtRp = (n: number | null) =>
  n === null ? '—' : `Rp ${n.toLocaleString('id-ID')}`;

const formatRange = (min: number | null, max: number | null): string => {
  if (min === null && max === null) return '— (not configured)';
  if (min === max) return fmtRp(min);
  return `${fmtRp(min)} – ${fmtRp(max)}`;
};

export default function PricingTierPreviewModal({ tier, onClose }: PricingTierPreviewModalProps) {
  if (!tier) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-3xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-ads/12 text-ads shrink-0">
              <Eye size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-[15px] font-extrabold text-text">{tier.tier_name}</h3>
                <span className={cn(
                  'px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide',
                  CATEGORY_COLOR[tier.tier_category],
                )}>
                  {tier.tier_category}
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
              <p className="text-[11px] font-mono text-text-muted mt-0.5">
                {tier.display_id} · {tier.tier_code}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-surface-muted transition-colors shrink-0"
            title="Tutup"
          >
            <X size={16} className="text-text-muted" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          {/* ─── Section 1: Pricing Matrix ─── */}
          <section>
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2 flex items-center gap-1.5">
              <DollarSign size={11} />
              Pricing Matrix per CAS Mode
            </h4>

            <div className="grid grid-cols-2 gap-2.5">
              <ModeCell
                label="🔴 STARTER"
                colorClass={MODE_COLOR.starter}
                value={formatRange(tier.price_starter_min, tier.price_starter_max)}
                multiplier="0.50x"
                description="Safe baseline"
              />
              <ModeCell
                label="🟡 GROWTH"
                colorClass={MODE_COLOR.growth}
                value={formatRange(tier.price_growth_min, tier.price_growth_max)}
                multiplier="0.75x"
                description="Ramping up"
              />
              <ModeCell
                label="🟢 NORMAL"
                colorClass={MODE_COLOR.normal}
                value={formatRange(tier.price_normal_min, tier.price_normal_max)}
                multiplier="1.00x"
                description="Standard rate"
              />
              <ModeCell
                label="🟣 ENTERPRISE"
                colorClass={MODE_COLOR.enterprise}
                value={formatRange(tier.price_enterprise_min, tier.price_enterprise_max)}
                multiplier="1.50x+"
                description="Premium scaled"
              />
            </div>
          </section>

          {/* ─── Section 2: Positions & Config ─── */}
          <section>
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2 flex items-center gap-1.5">
              <Settings size={11} />
              Positions & Configuration
            </h4>

            <div className="grid grid-cols-2 gap-2.5">
              <MetaCell label="Duration" icon={<Clock size={10} />} value={
                <span className="text-[11px] font-semibold text-text">
                  {tier.duration_days} hari
                </span>
              } />
              <MetaCell label="Priority Level" icon={<Hash size={10} />} value={
                <span className="text-[11px] font-semibold text-text">
                  {tier.priority_level} <span className="text-text-muted">(1=lowest, 9=highest)</span>
                </span>
              } />
              <MetaCell label="Display Order" value={
                <span className="text-[11px] font-semibold text-text">
                  {tier.display_order}
                </span>
              } />
              <MetaCell label="Created At" value={
                <span className="text-[11px] font-semibold text-text">
                  {new Date(tier.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              } />
              <MetaCell label="Positions Allowed" colSpan={2} icon={<MapPin size={10} />} value={
                tier.positions_allowed.length === 0 ? (
                  <span className="text-[11px] italic text-text-muted">Tidak ada posisi configured</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {tier.positions_allowed.map((p) => (
                      <span key={p} className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-baronda/10 text-baronda">
                        {p}
                      </span>
                    ))}
                  </div>
                )
              } />
            </div>
          </section>

          {/* ─── Section 3: Compliance Flags ─── */}
          <section>
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2 flex items-center gap-1.5">
              <Shield size={11} />
              Compliance Flags
            </h4>

            <div className="grid grid-cols-2 gap-2">
              <ComplianceCell label="PKP Invoice Required" value={tier.requires_pkp_invoice} />
              <ComplianceCell label="Manual Review Required" value={tier.requires_manual_review} />
              <ComplianceCell label="Compliance Fee Required" value={tier.requires_compliance_fee} />
              <ComplianceCell label="Politik Clauses Required" value={tier.requires_politik_clauses} />
            </div>
          </section>

          {/* ─── Section 4: Features JSON ─── */}
          {tier.features && Object.keys(tier.features).length > 0 && (
            <section>
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2">
                Features (JSONB)
              </h4>
              <pre className="text-[10px] text-text-muted bg-surface-muted/40 border border-border rounded-lg p-3 overflow-x-auto font-mono">
                {JSON.stringify(tier.features, null, 2)}
              </pre>
            </section>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border bg-surface-muted/20">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-surface border border-border text-text text-[11px] font-bold uppercase tracking-wide hover:bg-surface-muted transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Subcomponents ───────────────────────────────────────────

function ModeCell({
  label,
  colorClass,
  value,
  multiplier,
  description,
}: {
  label:       string;
  colorClass:  string;
  value:       string;
  multiplier:  string;
  description: string;
}) {
  return (
    <div className={cn('flex flex-col gap-1 px-3 py-2.5 rounded-lg border', colorClass)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-extrabold uppercase tracking-wider">{label}</span>
        <span className="text-[9px] font-bold opacity-70">{multiplier}</span>
      </div>
      <span className="text-[13px] font-extrabold tabular-nums text-text mt-0.5">{value}</span>
      <span className="text-[9px] opacity-70">{description}</span>
    </div>
  );
}

function MetaCell({
  label,
  value,
  icon,
  colSpan = 1,
}: {
  label:   string;
  value:   React.ReactNode;
  icon?:   React.ReactNode;
  colSpan?: 1 | 2;
}) {
  return (
    <div className={cn(
      'flex flex-col gap-1 px-3 py-2 rounded-lg bg-surface-muted/40 border border-border',
      colSpan === 2 && 'col-span-2',
    )}>
      <span className="text-[9px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
        {icon}
        {label}
      </span>
      {value}
    </div>
  );
}

function ComplianceCell({ label, value }: { label: string; value: boolean }) {
  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-2 rounded-lg border',
      value
        ? 'bg-status-warning/8 border-status-warning/30'
        : 'bg-surface-muted/40 border-border',
    )}>
      {value ? (
        <CheckCircle2 size={14} className="text-status-warning shrink-0" />
      ) : (
        <XCircle size={14} className="text-text-subtle shrink-0" />
      )}
      <span className={cn(
        'text-[11px] font-semibold',
        value ? 'text-status-warning' : 'text-text-muted',
      )}>
        {label}
      </span>
    </div>
  );
}
