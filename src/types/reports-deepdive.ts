/**
 * TeraLoka — Reports Deep Dive Type Definitions
 * Phase 2 · Batch 7b3 — Reports Deep Dive Analytics
 * ------------------------------------------------------------
 * Types untuk response GET /admin/reports/deepdive.
 *
 * Backend: src/routes/admin.ts `app.get('/reports/deepdive', ...)`
 * Aggregates 30 hari terakhir + perbandingan dengan 30-60 hari prev.
 *
 * IMPORTANT: `pct_change` bisa `null` kalau periode sebelumnya kosong
 * (tidak ada data untuk dibandingkan). UI harus handle null.
 */

/* ─── Stats utama ─── */

export interface DeepDiveStats {
  total_30days: number;
  per_day: number;
  urgent: number;
  high: number;
  normal: number;
  /** % change vs 30-60 days prior. Null/0 berarti no baseline. */
  pct_change: number | null;
}

/* ─── Tren harian ─── */

export interface TrendPoint {
  /** ISO date YYYY-MM-DD */
  date: string;
  count: number;
}

/* ─── Kategori breakdown ─── */

export interface CategoryBreakdown {
  name: string;
  count: number;
  prev: number;
  /** null kalau prev=0 (tidak bisa compute percentage) */
  pct_change: number | null;
}

/* ─── Top locations ─── */

export interface LocationBreakdown {
  location: string;
  count: number;
  pct_change: number | null;
}

/* ─── Peak hour ─── */

export interface HourBreakdown {
  /** 0-23 */
  hour: number;
  count: number;
}

/* ─── User segments ─── */

export interface UserSegments {
  total?: number;
  newly_registered?: number;
  trusted_user?: number;
  other?: number;
}

/* ─── Alert clusters (lokasi dengan lonjakan >50%) ─── */

export interface AlertCluster {
  location: string;
  count: number;
  pct_change: number | null;
  priority: 'urgent' | 'high';
}

/* ─── Full response shape ─── */

export interface DeepDiveResponse {
  stats: DeepDiveStats;
  trend: TrendPoint[];
  categories: CategoryBreakdown[];
  top_locations: LocationBreakdown[];
  /** Jam 0-23 dengan count tertinggi */
  peak_hour: number;
  peak_hours: HourBreakdown[];
  user_segments: UserSegments;
  alert_clusters: AlertCluster[];
}

/* ─── Helpers ─── */

/**
 * Format percentage change dengan sign.
 * null → "" (no baseline)
 * >0 → "+12%"
 * <0 → "-8%"
 * 0 → "0%"
 */
export function formatPctChange(pct: number | null): string {
  if (pct === null || pct === undefined) return '';
  if (pct > 0) return `+${pct}%`;
  return `${pct}%`;
}

/**
 * Tentukan color tone berdasarkan pct change.
 * - null → text-muted (no baseline)
 * - > 0  → text-status-critical (naik = lebih banyak laporan = jelek)
 * - ≤ 0  → text-status-healthy (turun = bagus)
 *
 * Note: untuk reports "lebih banyak = lebih jelek" karena artinya
 * lebih banyak masalah di masyarakat. Di konteks lain (e.g. sales)
 * mungkin sebaliknya.
 */
export function pctChangeColorClass(pct: number | null): string {
  if (pct === null || pct === undefined) return 'text-text-muted';
  if (pct > 0) return 'text-status-critical';
  if (pct < 0) return 'text-status-healthy';
  return 'text-text-muted';
}

/**
 * Format jam dari number ke "HH:00 – HH:00" window (4 jam).
 * peak_hour=14 → "14:00 – 18:00"
 */
export function formatPeakHourWindow(hour: number): string {
  const end = (hour + 4) % 24;
  return `${String(hour).padStart(2, '0')}:00 – ${String(end).padStart(2, '0')}:00`;
}

/**
 * Format ISO date (YYYY-MM-DD) → "DD/MM" (short).
 * "2026-04-19" → "19/4"
 */
export function formatShortDate(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const day = parseInt(parts[2], 10);
  const month = parseInt(parts[1], 10);
  return `${day}/${month}`;
}
