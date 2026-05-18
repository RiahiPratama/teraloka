'use client';

/**
 * TeraLoka — PricingTierAuditModal
 * SESI 3 BATCH 2 (18 Mei 2026)
 * ------------------------------------------------------------
 * Audit timeline modal — fetch GET /pricing-tiers/:id/audit
 *
 * Layout:
 *   1. Header     — tier name + display_id
 *   2. Timeline   — list audit entries (newest first)
 *      Per entry: action badge + user + timestamp + collapsible diff
 *
 * Action labels:
 *   - create        — "Tier dibuat"
 *   - update        — "Tier diupdate"
 *   - toggle_active — "Toggle aktif/nonaktif"
 *   - toggle_public — "Toggle public/hidden"
 *   - duplicate     — "Tier diduplikat"
 *
 * Pattern mirror: AdPreviewModal audit section (Sub-Phase 8-E-6).
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  X,
  ClipboardList,
  Clock,
  User,
  AlertCircle,
  Plus,
  Pencil,
  ToggleRight,
  Eye,
  Copy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PricingTier } from './PricingTiersPanel';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

type TierAuditAction = 'create' | 'update' | 'toggle_active' | 'toggle_public' | 'duplicate';

interface AuditEntry {
  id:         string;
  action:     TierAuditAction;
  old_data:   Record<string, any> | null;
  new_data:   Record<string, any> | null;
  created_at: string;
  user: {
    id:   string;
    name: string;
    role: string;
  };
}

export interface PricingTierAuditModalProps {
  tier: PricingTier | null;
  onClose: () => void;
}

const ACTION_CONFIG: Record<TierAuditAction, {
  label:     string;
  icon:      typeof Plus;
  colorBg:   string;
  colorText: string;
}> = {
  create: {
    label:     'Created',
    icon:      Plus,
    colorBg:   'bg-status-healthy/12',
    colorText: 'text-status-healthy',
  },
  update: {
    label:     'Updated',
    icon:      Pencil,
    colorBg:   'bg-status-info/12',
    colorText: 'text-status-info',
  },
  toggle_active: {
    label:     'Toggle Active',
    icon:      ToggleRight,
    colorBg:   'bg-status-warning/12',
    colorText: 'text-status-warning',
  },
  toggle_public: {
    label:     'Toggle Public',
    icon:      Eye,
    colorBg:   'bg-bakabar/12',
    colorText: 'text-bakabar',
  },
  duplicate: {
    label:     'Duplicated',
    icon:      Copy,
    colorBg:   'bg-ads/12',
    colorText: 'text-ads',
  },
};

export default function PricingTierAuditModal({ tier, onClose }: PricingTierAuditModalProps) {
  const { token } = useAuth();
  const [entries, setEntries]   = useState<AuditEntry[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    if (!tier || !token) return;
    setLoading(true);
    setError(null);
    setEntries([]);

    fetch(`${API}/admin/ads/pricing-tiers/${tier.id}/audit?limit=50`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((json) => {
        if (!json.success) {
          setError(json.error?.message ?? 'Gagal memuat audit history');
          return;
        }
        setEntries(json.data ?? []);
      })
      .catch((err) => setError(err?.message ?? 'Network error'))
      .finally(() => setLoading(false));
  }, [tier, token]);

  if (!tier) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-ads/12 text-ads shrink-0">
              <ClipboardList size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="text-[15px] font-extrabold text-text">
                Audit Timeline — {tier.tier_name}
              </h3>
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
        <div className="flex-1 overflow-y-auto p-5">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 rounded-full border-2 border-ads border-t-transparent animate-spin" />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-status-critical/8 border border-status-critical/30">
              <AlertCircle size={18} className="text-status-critical shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-status-critical">
                  Gagal memuat audit
                </p>
                <p className="text-[11px] text-text-muted mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && entries.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-4 rounded-xl bg-surface-muted/40 border border-border border-dashed">
              <Clock size={24} className="text-text-subtle mb-2" />
              <p className="text-[12px] font-bold text-text-muted">Belum ada audit log</p>
              <p className="text-[10px] text-text-subtle mt-1">
                Aksi pada tier ini akan tercatat di sini
              </p>
            </div>
          )}

          {!loading && !error && entries.length > 0 && (
            <>
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-3 flex items-center gap-1.5">
                <Clock size={11} />
                Timeline ({entries.length} entries)
              </p>
              <ul className="flex flex-col gap-2">
                {entries.map((entry) => (
                  <AuditRow key={entry.id} entry={entry} />
                ))}
              </ul>
            </>
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

// ─── AuditRow ────────────────────────────────────────────────

function AuditRow({ entry }: { entry: AuditEntry }) {
  const [expanded, setExpanded] = useState(false);
  const config = ACTION_CONFIG[entry.action] ?? ACTION_CONFIG.update;
  const ActionIcon = config.icon;

  const hasOldData = entry.old_data && Object.keys(entry.old_data).length > 0;
  const hasNewData = entry.new_data && Object.keys(entry.new_data).length > 0;
  const hasDiff    = hasOldData || hasNewData;

  return (
    <li className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-surface-muted/40 border border-border">
      <div className={cn(
        'flex items-center justify-center w-8 h-8 rounded-lg shrink-0',
        config.colorBg,
        config.colorText,
      )}>
        <ActionIcon size={14} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn(
            'px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide',
            config.colorBg,
            config.colorText,
          )}>
            {config.label}
          </span>
          <span className="text-[11px] font-bold text-text inline-flex items-center gap-1">
            <User size={10} className="text-text-muted" />
            {entry.user.name}
          </span>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-surface text-text-muted">
            {entry.user.role}
          </span>
        </div>
        <p className="text-[10px] text-text-muted mt-0.5">
          {formatDateTime(entry.created_at)}
        </p>

        {hasDiff && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="mt-1.5 text-[10px] text-text-muted hover:text-text underline"
          >
            {expanded ? 'Sembunyikan detail' : 'Lihat detail perubahan'}
          </button>
        )}

        {expanded && hasDiff && (
          <div className="mt-2 flex flex-col gap-1.5">
            {hasOldData && (
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted mb-0.5">
                  Sebelum
                </p>
                <pre className="text-[10px] text-text-muted bg-surface p-2 rounded overflow-x-auto font-mono">
                  {JSON.stringify(entry.old_data, null, 2)}
                </pre>
              </div>
            )}
            {hasNewData && (
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted mb-0.5">
                  Sesudah
                </p>
                <pre className="text-[10px] text-text-muted bg-surface p-2 rounded overflow-x-auto font-mono">
                  {JSON.stringify(entry.new_data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

// ─── Helper ───────────────────────────────────────────────────

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', {
    day:    'numeric',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });
}
