/**
 * TeraLoka — Admin Type Definitions
 * Phase 2 · Batch 6 — Dashboard Overview
 * ------------------------------------------------------------
 * Shared types untuk data admin (stats, action items, dashboard UI).
 * Single source of truth — import dari sini, bukan define inline.
 *
 * Scope: hanya types yg dipakai lintas admin page. Types per-page
 * (misal UserEditForm) tetap di dekat page-nya.
 */

/* ─── /admin/stats response ─────────────────────────────────── */

export interface StatsCategoryMetric {
  total: number;
  pending?: number;
  draft?: number;
}

export interface AdminStats {
  users: { total: number };
  listings: { total: number; pending: number };
  articles: { total: number; draft: number };
  campaigns: { total: number; pending: number };
  reports: { total: number; pending: number };
}

/* ─── Standard API response envelope ────────────────────────── */

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error?: {
    code?: string;
    message?: string;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/* ─── Derivasi untuk UI Dashboard ───────────────────────────── */

export type ActionPriority = 'urgent' | 'high' | 'medium' | 'low';

export interface ActionSummary {
  /** Total semua pending aksi cross-service */
  totalPending: number;
  /** Total semua item aktif (handled + pending) */
  totalActive: number;
  /** Boolean kapan ada urgent yg butuh attention segera */
  hasUrgent: boolean;
}

/* ─── User role enum (centralized) ──────────────────────────── */

export type AdminRole =
  | 'super_admin'
  | 'admin_content'
  | 'admin_transport'
  | 'admin_listing'
  | 'admin_funding';

/* ─── Helper derivasi dari AdminStats ───────────────────────── */

export function summarizeActions(stats: AdminStats | null): ActionSummary {
  if (!stats) {
    return { totalPending: 0, totalActive: 0, hasUrgent: false };
  }
  const totalPending =
    stats.listings.pending +
    stats.articles.draft +
    stats.campaigns.pending +
    stats.reports.pending;

  const totalActive =
    stats.listings.total +
    stats.articles.total +
    stats.campaigns.total +
    stats.reports.total;

  // Reports pending = urgent (laporan warga butuh cepat)
  const hasUrgent = stats.reports.pending > 0;

  return { totalPending, totalActive, hasUrgent };
}
