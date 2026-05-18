'use client';

/**
 * TeraLoka — PricingTierEditModal
 * SESI 3 BATCH 1A (18 Mei 2026)
 * PHASE 3 (18 Mei 2026) — extend tier_category type & dropdown ke 5 values
 * ------------------------------------------------------------
 * Modal edit/create pricing tier — tabbed form (D4 Hybrid).
 *
 * Tabs:
 *   1. General      — name, category, duration, positions, order, toggles
 *   2. Pricing      — 4-mode matrix (Starter / Growth / Normal / Enterprise)
 *                     + Effective Price Preview (bonus Z1.75)
 *   3. Advanced     — collapsible: Compliance flags, Features JSONB
 *
 * Modes:
 *   - tier=null,  isCreate=true   → CREATE flow (tier_code editable)
 *   - tier=PT,    isCreate=false  → EDIT flow (tier_code LOCKED)
 *
 * API:
 *   - CREATE: POST /admin/ads/pricing-tiers
 *   - UPDATE: PUT  /admin/ads/pricing-tiers/:id
 *
 * Pattern mirror: AdPreviewModal (Sub-Phase 8-E-6 17 Mei).
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  X,
  Pencil,
  Plus,
  Settings,
  DollarSign,
  Wrench,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Calculator,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PricingTier } from './PricingTiersPanel';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

const ALL_POSITIONS = [
  'native', 'sidebar', 'banner', 'homepage', 'in_article',
  'political_banner', 'homepage_hero_banner',
  'top_leaderboard', 'skyscraper_left', 'skyscraper_right',
  'region_stack', 'trending_native', 'inline_native', 'inline_banner', 'sidebar_native',
];

type TabKey = 'general' | 'pricing' | 'advanced';

interface FormState {
  tier_code:                string;
  tier_name:                string;
  // PHASE 3: extended 3 → 5 kategori symmetric (mirror PricingTier interface)
  tier_category:            'umkm' | 'local_corporate' | 'premium' | 'politik' | 'pemerintah';
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
  features:                 string;  // JSON string untuk textarea
  priority_level:           number;
  requires_pkp_invoice:     boolean;
  requires_manual_review:   boolean;
  requires_compliance_fee:  boolean;
  requires_politik_clauses: boolean;
  is_active:                boolean;
  is_public:                boolean;
  display_order:            number;
}

const INITIAL_FORM: FormState = {
  tier_code:                '',
  tier_name:                '',
  tier_category:            'umkm',
  price_starter_min:        0,
  price_starter_max:        0,
  price_growth_min:         null,
  price_growth_max:         null,
  price_normal_min:         0,
  price_normal_max:         0,
  price_enterprise_min:     null,
  price_enterprise_max:     null,
  duration_days:            7,
  positions_allowed:        [],
  features:                 '{}',
  priority_level:           1,
  requires_pkp_invoice:     false,
  requires_manual_review:   false,
  requires_compliance_fee:  false,
  requires_politik_clauses: false,
  is_active:                true,
  is_public:                true,
  display_order:            99,
};

export interface PricingTierEditModalProps {
  tier:     PricingTier | null;
  isCreate: boolean;
  onClose:  () => void;
  onSaved:  () => void;
}

export default function PricingTierEditModal({ tier, isCreate, onClose, onSaved }: PricingTierEditModalProps) {
  const { token } = useAuth();
  const [tab, setTab]                 = useState<TabKey>('general');
  const [form, setForm]               = useState<FormState>(INITIAL_FORM);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const isEditMode = !isCreate && tier !== null;

  // Init form from tier prop
  useEffect(() => {
    if (tier && !isCreate) {
      setForm({
        tier_code:                tier.tier_code,
        tier_name:                tier.tier_name,
        tier_category:            tier.tier_category,
        price_starter_min:        tier.price_starter_min,
        price_starter_max:        tier.price_starter_max,
        price_growth_min:         tier.price_growth_min,
        price_growth_max:         tier.price_growth_max,
        price_normal_min:         tier.price_normal_min,
        price_normal_max:         tier.price_normal_max,
        price_enterprise_min:     tier.price_enterprise_min,
        price_enterprise_max:     tier.price_enterprise_max,
        duration_days:            tier.duration_days,
        positions_allowed:        tier.positions_allowed,
        features:                 JSON.stringify(tier.features ?? {}, null, 2),
        priority_level:           tier.priority_level,
        requires_pkp_invoice:     tier.requires_pkp_invoice,
        requires_manual_review:   tier.requires_manual_review,
        requires_compliance_fee:  tier.requires_compliance_fee,
        requires_politik_clauses: tier.requires_politik_clauses,
        is_active:                tier.is_active,
        is_public:                tier.is_public,
        display_order:            tier.display_order,
      });
    } else if (isCreate) {
      setForm(INITIAL_FORM);
    }
    setError(null);
    setTab('general');
  }, [tier, isCreate]);

  const togglePosition = (pos: string) => {
    setForm((p) => ({
      ...p,
      positions_allowed: p.positions_allowed.includes(pos)
        ? p.positions_allowed.filter((x) => x !== pos)
        : [...p.positions_allowed, pos],
    }));
  };

  const handleSubmit = async () => {
    if (!token) return;
    setError(null);

    // Client-side validation
    if (!form.tier_name.trim()) return setError('Nama tier wajib diisi');
    if (isCreate && !form.tier_code.trim()) return setError('Tier code wajib diisi');
    if (form.positions_allowed.length === 0) return setError('Pilih minimal 1 posisi');
    if (form.duration_days < 1) return setError('Durasi minimal 1 hari');

    // Parse features JSON
    let parsedFeatures: Record<string, any> = {};
    try {
      parsedFeatures = JSON.parse(form.features || '{}');
    } catch (err) {
      return setError('Features JSON invalid format');
    }

    setSubmitting(true);

    const payload: any = {
      tier_name:                form.tier_name.trim(),
      tier_category:            form.tier_category,
      price_starter_min:        form.price_starter_min,
      price_starter_max:        form.price_starter_max,
      price_growth_min:         form.price_growth_min,
      price_growth_max:         form.price_growth_max,
      price_normal_min:         form.price_normal_min,
      price_normal_max:         form.price_normal_max,
      price_enterprise_min:     form.price_enterprise_min,
      price_enterprise_max:     form.price_enterprise_max,
      duration_days:            form.duration_days,
      positions_allowed:        form.positions_allowed,
      features:                 parsedFeatures,
      priority_level:           form.priority_level,
      requires_pkp_invoice:     form.requires_pkp_invoice,
      requires_manual_review:   form.requires_manual_review,
      requires_compliance_fee:  form.requires_compliance_fee,
      requires_politik_clauses: form.requires_politik_clauses,
      is_active:                form.is_active,
      is_public:                form.is_public,
      display_order:            form.display_order,
    };

    if (isCreate) {
      payload.tier_code = form.tier_code.trim().toLowerCase();
    }

    try {
      const url    = isCreate ? `${API}/admin/ads/pricing-tiers` : `${API}/admin/ads/pricing-tiers/${tier!.id}`;
      const method = isCreate ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? 'Gagal save');
        setSubmitting(false);
        return;
      }
      onSaved();
    } catch (err: any) {
      setError(err?.message ?? 'Network error');
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="w-full max-w-[980px] bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: '85vh' }}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-ads/12 text-ads shrink-0">
              {isCreate ? <Plus size={18} /> : <Pencil size={18} />}
            </div>
            <div className="min-w-0">
              <h3 className="text-[15px] font-extrabold text-text">
                {isCreate ? 'Tambah Tier Baru' : `Edit Tier — ${tier?.tier_name}`}
              </h3>
              {tier?.display_id && (
                <p className="text-[11px] font-mono text-text-muted mt-0.5">{tier.display_id}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-md hover:bg-surface-muted transition-colors"
          >
            <X size={16} className="text-text-muted" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 px-5 pt-3 border-b border-border">
          <TabBtn active={tab === 'general'}  onClick={() => setTab('general')}  icon={Settings}    label="General" />
          <TabBtn active={tab === 'pricing'}  onClick={() => setTab('pricing')}  icon={DollarSign} label="Pricing" />
          <TabBtn active={tab === 'advanced'} onClick={() => setTab('advanced')} icon={Wrench}     label="Advanced" />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === 'general'  && <GeneralTab form={form} setForm={setForm} togglePosition={togglePosition} isCreate={isCreate} />}
          {tab === 'pricing'  && <PricingTab form={form} setForm={setForm} />}
          {tab === 'advanced' && <AdvancedTab form={form} setForm={setForm} />}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-5 mb-3 px-3 py-2 rounded-lg bg-status-critical/8 border border-status-critical/30 flex items-center gap-2">
            <AlertTriangle size={14} className="text-status-critical shrink-0" />
            <p className="text-[11px] font-semibold text-status-critical">{error}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border bg-surface-muted/20">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-1.5 rounded-md bg-surface border border-border text-text text-[11px] font-bold uppercase tracking-wide hover:bg-surface-muted transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-1.5 rounded-md bg-ads text-white text-[11px] font-bold uppercase tracking-wide hover:bg-ads/90 transition-colors shadow-sm disabled:opacity-50"
          >
            {submitting ? 'Saving...' : isCreate ? 'Create Tier' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── TabBtn ───────────────────────────────────────────────────

function TabBtn({
  active, onClick, icon: Icon, label,
}: {
  active: boolean; onClick: () => void; icon: typeof Settings; label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold uppercase tracking-wide transition-colors border-b-2 -mb-px',
        active ? 'border-ads text-ads' : 'border-transparent text-text-muted hover:text-text',
      )}
    >
      <Icon size={11} />
      {label}
    </button>
  );
}

// ─── TAB 1: General ───────────────────────────────────────────

function GeneralTab({
  form, setForm, togglePosition, isCreate,
}: {
  form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>>;
  togglePosition: (pos: string) => void;
  isCreate: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* tier_code (CREATE only) */}
      {isCreate && (
        <Field label="Tier Code *" hint="lowercase + underscore, contoh: premium_bronze">
          <input
            type="text"
            value={form.tier_code}
            onChange={(e) => setForm((p) => ({ ...p, tier_code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
            placeholder="premium_bronze"
            className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-[12px] text-text font-mono focus:outline-none focus:border-ads/50 focus:ring-2 focus:ring-ads/20"
          />
        </Field>
      )}

      {/* tier_name */}
      <Field label="Tier Name *">
        <input
          type="text"
          value={form.tier_name}
          onChange={(e) => setForm((p) => ({ ...p, tier_name: e.target.value }))}
          placeholder="Starter, Growth, Premium Gold..."
          className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-[12px] text-text focus:outline-none focus:border-ads/50 focus:ring-2 focus:ring-ads/20"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        {/* category — PHASE 3: 5 kategori symmetric */}
        <Field label="Category *">
          <select
            value={form.tier_category}
            onChange={(e) => setForm((p) => ({ ...p, tier_category: e.target.value as any }))}
            className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-[12px] text-text focus:outline-none focus:border-ads/50"
          >
            <option value="umkm">UMKM</option>
            <option value="local_corporate">Local Corporate</option>
            <option value="premium">Premium</option>
            <option value="politik">Politik</option>
            <option value="pemerintah">Pemerintah</option>
          </select>
        </Field>

        {/* priority_level */}
        <Field label="Priority Level (1-9) *">
          <input
            type="number"
            min={1}
            max={9}
            value={form.priority_level}
            onChange={(e) => setForm((p) => ({ ...p, priority_level: Math.max(1, Math.min(9, Number(e.target.value) || 1)) }))}
            className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-[12px] text-text focus:outline-none focus:border-ads/50"
          />
        </Field>

        {/* duration_days */}
        <Field label="Duration (days) *">
          <input
            type="number"
            min={1}
            value={form.duration_days}
            onChange={(e) => setForm((p) => ({ ...p, duration_days: Math.max(1, Number(e.target.value) || 1) }))}
            className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-[12px] text-text focus:outline-none focus:border-ads/50"
          />
        </Field>

        {/* display_order */}
        <Field label="Display Order">
          <input
            type="number"
            min={0}
            value={form.display_order}
            onChange={(e) => setForm((p) => ({ ...p, display_order: Math.max(0, Number(e.target.value) || 0) }))}
            className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-[12px] text-text focus:outline-none focus:border-ads/50"
          />
        </Field>
      </div>

      {/* positions_allowed */}
      <Field label="Positions Allowed *">
        <div className="grid grid-cols-3 gap-2">
          {ALL_POSITIONS.map((pos) => {
            const active = form.positions_allowed.includes(pos);
            return (
              <label key={pos} className={cn(
                'flex items-center gap-2 px-2.5 py-1.5 rounded-lg border cursor-pointer transition-colors',
                active ? 'bg-ads/12 border-ads/30' : 'bg-surface-muted/40 border-border hover:border-text-muted/30',
              )}>
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => togglePosition(pos)}
                  className="accent-ads"
                />
                <span className={cn('text-[10px] font-mono', active ? 'text-ads font-bold' : 'text-text-muted')}>
                  {pos}
                </span>
              </label>
            );
          })}
        </div>
      </Field>

      {/* toggles */}
      <div className="flex flex-col gap-2">
        <Toggle
          checked={form.is_active}
          onChange={(v) => setForm((p) => ({ ...p, is_active: v }))}
          label="Tier Active"
          hint="Aktif = tampil di list active. Nonaktif = hidden tapi data preserved."
        />
        <Toggle
          checked={form.is_public}
          onChange={(v) => setForm((p) => ({ ...p, is_public: v }))}
          label="Public Visibility"
          hint="Public = tampil di /pasang-iklan. Hidden = admin-only."
        />
      </div>
    </div>
  );
}

// ─── TAB 2: Pricing Matrix + Effective Preview ────────────────

function PricingTab({
  form, setForm,
}: {
  form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  const fmtRp = (n: number | null) => n === null ? '—' : `Rp ${n.toLocaleString('id-ID')}`;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[11px] text-text-muted">
        Set price range per 4 CAS mode. Min ≤ Max. Growth & Enterprise nullable kalau gak applicable.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-[12px] border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted">Mode</th>
              <th className="px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted">Min</th>
              <th className="px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted">Max</th>
              <th className="px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted">Preview</th>
            </tr>
          </thead>
          <tbody>
            <PriceRow label="Starter"    color="text-status-critical"
              minVal={form.price_starter_min} maxVal={form.price_starter_max}
              required
              onMin={(v) => setForm((p) => ({ ...p, price_starter_min: v ?? 0 }))}
              onMax={(v) => setForm((p) => ({ ...p, price_starter_max: v ?? 0 }))}
              fmtRp={fmtRp}
            />
            <PriceRow label="Growth"     color="text-status-warning"
              minVal={form.price_growth_min} maxVal={form.price_growth_max}
              onMin={(v) => setForm((p) => ({ ...p, price_growth_min: v }))}
              onMax={(v) => setForm((p) => ({ ...p, price_growth_max: v }))}
              fmtRp={fmtRp}
            />
            <PriceRow label="Normal"     color="text-status-healthy"
              minVal={form.price_normal_min} maxVal={form.price_normal_max}
              required
              onMin={(v) => setForm((p) => ({ ...p, price_normal_min: v ?? 0 }))}
              onMax={(v) => setForm((p) => ({ ...p, price_normal_max: v ?? 0 }))}
              fmtRp={fmtRp}
            />
            <PriceRow label="Enterprise" color="text-bakabar"
              minVal={form.price_enterprise_min} maxVal={form.price_enterprise_max}
              onMin={(v) => setForm((p) => ({ ...p, price_enterprise_min: v }))}
              onMax={(v) => setForm((p) => ({ ...p, price_enterprise_max: v }))}
              fmtRp={fmtRp}
            />
          </tbody>
        </table>
      </div>

      {/* Effective Price Preview (Bonus Z1.75) */}
      <div className="flex flex-col gap-2 px-4 py-3 rounded-xl bg-ads/8 border border-ads/30">
        <div className="flex items-center gap-2">
          <Calculator size={12} className="text-ads" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-ads">Effective Price Preview</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <PreviewLine label="🔴 STARTER MODE"    val={`${fmtRp(form.price_starter_min)} – ${fmtRp(form.price_starter_max)}`} />
          <PreviewLine label="🟡 GROWTH MODE"     val={`${fmtRp(form.price_growth_min)} – ${fmtRp(form.price_growth_max)}`} />
          <PreviewLine label="🟢 NORMAL MODE"     val={`${fmtRp(form.price_normal_min)} – ${fmtRp(form.price_normal_max)}`} />
          <PreviewLine label="🟣 ENTERPRISE MODE" val={`${fmtRp(form.price_enterprise_min)} – ${fmtRp(form.price_enterprise_max)}`} />
        </div>
      </div>
    </div>
  );
}

function PriceRow({
  label, color, minVal, maxVal, required, onMin, onMax, fmtRp,
}: {
  label:    string;
  color:    string;
  minVal:   number | null;
  maxVal:   number | null;
  required?: boolean;
  onMin:    (v: number | null) => void;
  onMax:    (v: number | null) => void;
  fmtRp:    (n: number | null) => string;
}) {
  const handleInput = (val: string, setter: (v: number | null) => void) => {
    if (val === '') return setter(required ? 0 : null);
    setter(Math.max(0, Number(val) || 0));
  };

  const previewVal = minVal === maxVal ? fmtRp(minVal) : `${fmtRp(minVal)} – ${fmtRp(maxVal)}`;

  return (
    <tr className="border-b border-border">
      <td className="px-2 py-2">
        <span className={cn('text-[11px] font-bold', color)}>{label}{required ? ' *' : ''}</span>
      </td>
      <td className="px-2 py-2">
        <input
          type="number"
          min={0}
          step={1000}
          value={minVal ?? ''}
          onChange={(e) => handleInput(e.target.value, onMin)}
          placeholder={required ? '0' : 'null'}
          className="w-full px-2 py-1 rounded bg-surface border border-border text-[11px] text-text focus:outline-none focus:border-ads/50"
        />
      </td>
      <td className="px-2 py-2">
        <input
          type="number"
          min={0}
          step={1000}
          value={maxVal ?? ''}
          onChange={(e) => handleInput(e.target.value, onMax)}
          placeholder={required ? '0' : 'null'}
          className="w-full px-2 py-1 rounded bg-surface border border-border text-[11px] text-text focus:outline-none focus:border-ads/50"
        />
      </td>
      <td className="px-2 py-2 text-[10px] font-mono text-text-muted">{previewVal}</td>
    </tr>
  );
}

function PreviewLine({ label, val }: { label: string; val: string }) {
  return (
    <div className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-surface">
      <span className="text-[10px] font-bold text-text-muted">{label}</span>
      <span className="text-[10px] font-mono text-text">{val}</span>
    </div>
  );
}

// ─── TAB 3: Advanced (Collapsible) ────────────────────────────

function AdvancedTab({
  form, setForm,
}: {
  form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  const [openCompliance, setOpenCompliance] = useState(false);
  const [openFeatures, setOpenFeatures]     = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] text-text-muted mb-2">
        Advanced settings — sections collapsed by default (90% waktu gak disentuh).
      </p>

      {/* Compliance Section */}
      <CollapseSection
        open={openCompliance}
        onToggle={() => setOpenCompliance(!openCompliance)}
        title="Compliance Flags"
        subtitle="PKP invoice, manual review, compliance fee, politik clauses"
      >
        <div className="flex flex-col gap-2 mt-2">
          <Toggle
            checked={form.requires_pkp_invoice}
            onChange={(v) => setForm((p) => ({ ...p, requires_pkp_invoice: v }))}
            label="Requires PKP Invoice"
            hint="Tier butuh invoice formal PKP (PT TeraLoka mode required)."
          />
          <Toggle
            checked={form.requires_manual_review}
            onChange={(v) => setForm((p) => ({ ...p, requires_manual_review: v }))}
            label="Requires Manual Review"
            hint="Setiap ad di tier ini wajib review manual sebelum publish."
          />
          <Toggle
            checked={form.requires_compliance_fee}
            onChange={(v) => setForm((p) => ({ ...p, requires_compliance_fee: v }))}
            label="Requires Compliance Fee"
            hint="Charge extra fee untuk KPU verification, legal review, dll."
          />
          <Toggle
            checked={form.requires_politik_clauses}
            onChange={(v) => setForm((p) => ({ ...p, requires_politik_clauses: v }))}
            label="Requires Politik Clauses"
            hint="Mandatory 3 clauses (Kill Switch + Anti-Black + Liability) untuk politik tier."
          />
        </div>
      </CollapseSection>

      {/* Features JSON Section */}
      <CollapseSection
        open={openFeatures}
        onToggle={() => setOpenFeatures(!openFeatures)}
        title="Features JSON"
        subtitle="JSONB metadata fleksibel (self_serve, posisi_count, etc)"
      >
        <textarea
          value={form.features}
          onChange={(e) => setForm((p) => ({ ...p, features: e.target.value }))}
          rows={8}
          placeholder='{"self_serve": true, "posisi_count": 1}'
          className="w-full px-3 py-2 mt-2 rounded-lg bg-surface border border-border text-[11px] text-text font-mono focus:outline-none focus:border-ads/50 focus:ring-2 focus:ring-ads/20 resize-none"
        />
        <p className="text-[10px] text-text-muted mt-1">
          Valid JSON format. Akan di-parse saat save.
        </p>
      </CollapseSection>
    </div>
  );
}

function CollapseSection({
  open, onToggle, title, subtitle, children,
}: {
  open:      boolean;
  onToggle:  () => void;
  title:     string;
  subtitle?: string;
  children:  React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-muted/40">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-surface-muted/60 transition-colors rounded-xl"
      >
        <div className="min-w-0">
          <p className="text-[12px] font-bold text-text">{title}</p>
          {subtitle && <p className="text-[10px] text-text-muted mt-0.5">{subtitle}</p>}
        </div>
        {open ? <ChevronDown size={14} className="text-text-muted shrink-0" /> : <ChevronRight size={14} className="text-text-muted shrink-0" />}
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

// ─── Field Helper ─────────────────────────────────────────────

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="text-[11px] font-bold uppercase tracking-wider text-text mb-1.5 block">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-text-muted mt-1">{hint}</p>}
    </div>
  );
}

// ─── Toggle Helper ────────────────────────────────────────────

function Toggle({
  checked, onChange, label, hint,
}: {
  checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string;
}) {
  return (
    <label className="flex items-start gap-2 px-3 py-2 rounded-lg bg-surface border border-border cursor-pointer hover:bg-surface-muted/60 transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-ads mt-0.5"
      />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold text-text">{label}</p>
        {hint && <p className="text-[10px] text-text-muted mt-0.5">{hint}</p>}
      </div>
    </label>
  );
}
