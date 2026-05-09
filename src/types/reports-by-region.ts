/**
 * TeraLoka — BALAPOR Reports by Region Types
 * Sub-Sprint 1C-C-12 (9 Mei 2026)
 * ------------------------------------------------------------
 * Type definitions for geographic aggregation API.
 * Mirror backend: src/domains/balapor/reports/reports-by-region.ts
 *
 * Endpoints:
 *   GET /admin/balapor/by-region                              → RegionAggregation
 *   GET /admin/balapor/by-region/:kabupatenId/kecamatan       → KecamatanAggregation
 */

export type RegionType = 'kabupaten' | 'kota';

export interface RegionStats {
  region_id: string;
  region_name: string;
  region_type: RegionType;
  bps_code: string | null;

  // Counters
  total_reports: number;
  pending: number;
  reviewing: number;
  verified: number;
  published: number;
  rejected: number;
  urgent: number;
  civic_resolved: number;
  civic_pending: number;

  // Computed metrics (3 terpisah, D3=C)
  verified_rate: number;          // (verified + published) / total
  civic_resolution_rate: number;  // civic_resolved / (verified + published)
  published_rate: number;         // published / total
}

export interface KecamatanStats {
  kecamatan_id: string;
  kecamatan_name: string;
  bps_code: string | null;
  parent_id: string;

  total_reports: number;
  pending: number;
  reviewing: number;
  verified: number;
  published: number;
  rejected: number;
  urgent: number;
  civic_resolved: number;
  civic_pending: number;

  verified_rate: number;
  civic_resolution_rate: number;
  published_rate: number;
}

export interface RegionAggregationMeta {
  total_reports_aggregated: number;
  unmapped_reports_count: number;
  total_regions_with_reports: number;
  last_computed: string;
}

export interface RegionAggregation {
  regions: RegionStats[];
  meta: RegionAggregationMeta;
}

export interface KecamatanAggregationMeta {
  total_reports_aggregated: number;
  unmapped_reports_count: number;
  total_kecamatan_with_reports: number;
  last_computed: string;
}

export interface KecamatanAggregation {
  kabupaten: {
    id: string;
    name: string;
    type: RegionType;
    bps_code: string | null;
  };
  kecamatan: KecamatanStats[];
  meta: KecamatanAggregationMeta;
}

/* ─── Sort options ─── */

export type RegionSortKey =
  | 'name'
  | 'total_reports'
  | 'urgent'
  | 'verified_rate'
  | 'civic_resolution_rate'
  | 'published_rate';

export type SortDirection = 'asc' | 'desc';

/* ─── Display helpers ─── */

/**
 * Format rate (0-1) ke percentage display dengan handling 0 = "—".
 */
export function formatRate(rate: number, hasDenominator: boolean = true): string {
  if (!hasDenominator) return '—';
  if (rate === 0) return '0%';
  return `${(rate * 100).toFixed(1)}%`;
}

/**
 * Color-code rate value untuk visual signal:
 *   >= 70% → green (high performance)
 *   40-70% → amber (moderate)
 *   < 40%  → red (low / attention needed)
 *   No data → muted
 */
export function getRateColorClass(rate: number, hasDenominator: boolean = true): string {
  if (!hasDenominator) return 'text-text-muted';
  if (rate >= 0.7) return 'text-status-positive';
  if (rate >= 0.4) return 'text-status-caution';
  return 'text-status-critical';
}

/**
 * Compute verified count (verified + published) untuk denominator metrics.
 */
export function getVerifiedTotal(stats: { verified: number; published: number }): number {
  return stats.verified + stats.published;
}
