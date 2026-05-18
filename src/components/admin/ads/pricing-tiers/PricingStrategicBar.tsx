'use client';

/**
 * TeraLoka — PricingStrategicBar
 * SESI 3 BATCH 1A (18 Mei 2026)
 * ------------------------------------------------------------
 * Sticky strategic status bar untuk CAS Mode visibility.
 *
 * Color coding (D2 enhanced):
 *   🔴 STARTER     — bg red, pricing safe (50% premium discount)
 *   🟡 GROWTH      — bg yellow, ramping up (75% premium)
 *   🟢 NORMAL      — bg green, full price (100%)
 *   🟣 ENTERPRISE  — bg purple, premium scaled (150%+)
 *
 * Data fetched dari: GET /admin/ads/pricing-tiers/mode
 * Change mode dispatch: POST /admin/ads/pricing-tiers/mode
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  TrendingDown,
  TrendingUp,
  Target,
  Sparkles,
  RefreshCw,
  X,
  ChevronDown,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

type PricingMode = 'starter' | 'growth' | 'normal' | 'enterprise';

interface ModeData {
  mode:          PricingMode;
  cas_final:     number;
  snapshot_date: string;
  notes:         string | null;
}

interface ModeConfig {
  label:       string;
  icon:        typeof TrendingDown;
  iconClass:   string;
  bgClass:     string;
  textClass:   string;
  borderClass: string;
  description: string;
  multiplier:  string;
}

const MODE_CONFIG: Record<PricingMode, ModeConfig> = {
  starter: {
    label:       'STARTER',
    icon:        TrendingDown,
    iconClass:   'text-status-critical',
    bgClass:     'bg-status-critical/8',
    textClass:   'text-status-critical',
    borderClass: 'border-status-critical/30',
    description: 'Safe baseline — 50% Premium discount',
    multiplier:  '0.50x',
  },
  growth: {
    label:       'GROWTH',
    icon:        TrendingUp,
    iconClass:   'text-status-warning',
    bgClass:     'bg-status-warning/8',
    textClass:   'text-status-warning',
    borderClass: 'border-status-warning/30',
    description: 'Ramping up — 75% Premium',
    multiplier:  '0.75x',
  },
  normal: {
    label:       'NORMAL',
    icon:        Target,
    iconClass:   'text-status-healthy',
    bgClass:     'bg-status-healthy/8',
    textClass:   'text-status-healthy',
    borderClass: 'border-status-healthy/30',
    description: 'Full price standard',
    multiplier:  '1.00x',
  },
  enterprise: {
    label:       'ENTERPRISE',
    icon:        Sparkles,
    iconClass:   'text-bakabar',
    bgClass:     'bg-bakabar/8',
    textClass:   'text-bakabar',
    borderClass: 'border-bakabar/30',
    description: 'Premium scaled — 150%+',
    multiplier:  '1.50x+',
  },
};

export default function PricingStrategicBar() {
  const { token } = useAuth();
  const [data, setData]               = useState<ModeData | null>(null);
  const [loading, setLoading]         = useState(true);
  const [showChangeModal, setShowChangeModal] = useState(false);

  const fetchMode = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/ads/pricing-tiers/mode`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (err) {
      console.error('[StrategicBar] fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMode();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading || !data) {
    return (
      <div className="px-4 py-3 rounded-xl bg-surface-muted/40 border border-border animate-pulse">
        <div className="h-4 w-32 bg-surface-muted rounded" />
      </div>
    );
  }

  const config = MODE_CONFIG[data.mode];
  const Icon = config.icon;

  return (
    <>
      <div
        className={cn(
          'flex items-center justify-between gap-3 px-4 py-3 rounded-xl border',
          config.bgClass,
          config.borderClass,
        )}
      >
        {/* Left: Icon + Mode + Description */}
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn('flex items-center justify-center w-9 h-9 rounded-lg bg-surface', config.iconClass)}>
            <Icon size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn('text-[12px] font-extrabold uppercase tracking-wider', config.textClass)}>
                {config.label} MODE
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-surface text-text-muted font-mono">
                CAS {data.cas_final}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-surface text-text-muted">
                {config.multiplier}
              </span>
            </div>
            <p className="text-[10px] text-text-muted mt-0.5 truncate">
              {config.description}
              {data.snapshot_date && (
                <span className="ml-2 inline-flex items-center gap-1">
                  <Clock size={9} />
                  {new Date(data.snapshot_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={fetchMode}
            className="p-1.5 rounded-md hover:bg-surface transition-colors"
            title="Refresh"
          >
            <RefreshCw size={12} className="text-text-muted" />
          </button>
          <button
            type="button"
            onClick={() => setShowChangeModal(true)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md',
              'bg-surface border text-[11px] font-bold uppercase tracking-wide transition-colors hover:bg-surface-muted',
              config.borderClass,
              config.textClass,
            )}
          >
            <ChevronDown size={11} />
            Change Mode
          </button>
        </div>
      </div>

      {/* Change Mode Modal */}
      {showChangeModal && (
        <ChangeModeModal
          currentMode={data.mode}
          onClose={() => setShowChangeModal(false)}
          onSuccess={() => {
            setShowChangeModal(false);
            fetchMode();
          }}
        />
      )}
    </>
  );
}

// ─── ChangeModeModal Subcomponent ──────────────────────────────

function ChangeModeModal({
  currentMode,
  onClose,
  onSuccess,
}: {
  currentMode: PricingMode;
  onClose:     () => void;
  onSuccess:   () => void;
}) {
  const { token } = useAuth();
  const [selectedMode, setSelectedMode] = useState<PricingMode>(currentMode);
  const [casFinal, setCasFinal]         = useState<number>(0);
  const [notes, setNotes]               = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!token) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/admin/ads/pricing-tiers/mode`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify({
          mode:        selectedMode,
          cas_final:   casFinal,
          notes:       notes.trim() || undefined,
          data_source: 'admin_manual',
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? 'Gagal set mode');
        setSubmitting(false);
        return;
      }
      onSuccess();
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
      <div className="w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border">
          <div>
            <h3 className="text-[15px] font-extrabold text-text">Change Pricing Mode</h3>
            <p className="text-[11px] text-text-muted mt-0.5">
              Pilih mode + masukin CAS score baru
            </p>
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
          {/* Mode Selector — 4 buttons */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-text mb-2 block">
              Pricing Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(MODE_CONFIG) as PricingMode[]).map((mode) => {
                const cfg = MODE_CONFIG[mode];
                const ModeIcon = cfg.icon;
                const isSelected = selectedMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setSelectedMode(mode)}
                    className={cn(
                      'flex flex-col items-start gap-1 px-3 py-2.5 rounded-lg border-2 transition-all',
                      isSelected
                        ? cn(cfg.bgClass, cfg.borderClass)
                        : 'bg-surface-muted/40 border-transparent hover:border-border',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <ModeIcon size={12} className={cfg.iconClass} />
                      <span className={cn('text-[11px] font-extrabold uppercase tracking-wide', isSelected ? cfg.textClass : 'text-text')}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-text-muted text-left">{cfg.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* CAS Score */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-text mb-1.5 block">
              CAS Final Score (0-100)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={casFinal}
              onChange={(e) => setCasFinal(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
              disabled={submitting}
              className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-[12px] text-text focus:outline-none focus:border-ads/50 focus:ring-2 focus:ring-ads/20"
            />
            <p className="text-[10px] text-text-muted mt-1">
              Pre-launch baseline: 15 (Starter Mode default). Update setelah PostHog data available.
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-text mb-1.5 block">
              Notes (Audit Trail)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={submitting}
              rows={3}
              placeholder="Alasan ganti mode (optional)..."
              className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-[12px] text-text placeholder:text-text-subtle focus:outline-none focus:border-ads/50 focus:ring-2 focus:ring-ads/20 resize-none"
            />
          </div>

          {error && (
            <div className="px-3 py-2 rounded-lg bg-status-critical/8 border border-status-critical/30">
              <p className="text-[11px] font-semibold text-status-critical">{error}</p>
            </div>
          )}
        </div>

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
            {submitting ? 'Saving...' : 'Set Mode'}
          </button>
        </div>
      </div>
    </div>
  );
}
