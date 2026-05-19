/**
 * TeraLoka ADS — PositionCapacityBadge
 * SESI 5D-2 (19 Mei 2026) Phase 3
 * ────────────────────────────────────────────────────────────────
 * Reusable badge component untuk render position capacity status.
 *
 * Display variants:
 *   - SINGLE_FIXED unlimited      : "5 di pool"        (gray subtle)
 *   - SINGLE_FIXED empty          : "0 di pool"        (yellow available)
 *   - CAROUSEL_MULTI 3/7          : "3/7 di carousel"  (color by ratio)
 *   - LIST_STACKED 2/3            : "2/3 slot terisi"  (color by ratio)
 *   - over_capacity               : "8/7 OVER"         (red warning)
 *
 * Drop-in untuk AdsBottomPanels (slot inventory section) atau dimanapun
 * butuh display capacity per posisi.
 *
 * Usage:
 *   <PositionCapacityBadge positionKey="political_banner" activeCount={3} />
 */

import {
  POSITION_RENDER_METADATA,
  getPositionMetadata,
  computeCapacityStatus,
  formatCapacityDisplay,
  type CapacityStatus,
} from './position-render-metadata';

interface Props {
  positionKey:  string;
  activeCount:  number;
  /** Variant compact (badge only) vs detail (badge + render type label) */
  variant?:     'compact' | 'detail';
  /** Tailwind class override untuk container */
  className?:   string;
}

const STATUS_STYLES: Record<CapacityStatus, { bg: string; text: string; label: string }> = {
  available:     { bg: 'bg-status-warning/10', text: 'text-status-warning', label: 'KOSONG' },
  optimal:       { bg: 'bg-status-healthy/10', text: 'text-status-healthy', label: 'OPTIMAL' },
  near_full:     { bg: 'bg-amber-500/10',      text: 'text-amber-500',      label: 'MENDEKATI BATAS' },
  over_capacity: { bg: 'bg-status-critical/10', text: 'text-status-critical', label: 'OVER' },
  unlimited_ok:  { bg: 'bg-status-healthy/10', text: 'text-status-healthy', label: 'AKTIF' },
};

const RENDER_TYPE_LABEL: Record<string, string> = {
  SINGLE_FIXED:   'POOL',
  CAROUSEL_MULTI: 'CAROUSEL',
  LIST_STACKED:   'LIST',
};

export default function PositionCapacityBadge({
  positionKey,
  activeCount,
  variant = 'compact',
  className = '',
}: Props) {
  const metadata = getPositionMetadata(positionKey);
  const status   = computeCapacityStatus(activeCount, metadata.recommendedMaxActive);
  const style    = STATUS_STYLES[status];
  const display  = formatCapacityDisplay(metadata, activeCount);

  if (variant === 'compact') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${style.bg} ${style.text} ${className}`}
        title={`${metadata.renderType}: ${display}`}
      >
        <span className="opacity-60">{RENDER_TYPE_LABEL[metadata.renderType]}</span>
        <span>·</span>
        <span>{display}</span>
      </span>
    );
  }

  // ─── Detail variant ─────────────────────────────────
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${style.bg} ${style.text}`}
      >
        {RENDER_TYPE_LABEL[metadata.renderType]}
      </span>
      <div>
        <p className={`text-[11px] font-bold ${style.text}`}>{display}</p>
        <p className="text-[9px] text-text-subtle">{style.label}</p>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// HOOK: useCapacityData
// ────────────────────────────────────────────────────────────────
// Fetch capacity data dari backend, cache 30 detik di-client.
// Optional helper untuk konsumen yang perlu live data.
// ════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';

interface CapacityData {
  positions:        Array<{ position: string; active_count: number }>;
  total_active_ads: number;
  generated_at:     string;
  cached:           boolean;
}

export function useCapacityData() {
  const [data, setData]       = useState<CapacityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch('/api/v1/admin/ads/positions/capacity')
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.success) {
          setData(json.data);
        } else {
          setError(json.error?.message ?? 'Capacity fetch failed');
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  /** Get active count untuk position key (helper) */
  const getActiveCount = (positionKey: string): number => {
    if (!data) return 0;
    return data.positions.find((p) => p.position === positionKey)?.active_count ?? 0;
  };

  return { data, loading, error, getActiveCount };
}
