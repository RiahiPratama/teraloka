/**
 * TeraLoka — Reporters (Pelapor) Type Definitions
 * Sub-Sprint 1C-C-13 Phase 3 (9 Mei 2026)
 * ------------------------------------------------------------
 * Types untuk Tab Pelapor — frontend mirror dari backend
 * `domains/balapor/reports/reports-by-reporter.ts`.
 *
 * Privacy architecture:
 *   - List/Detail responses: MASKED phone (0813****5678), no IP/UA
 *   - Reveal response: FULL phone + IP + UA (audit-logged)
 *   - Contact response: phone + wa.me URL (audit-logged)
 *
 * Pattern reference: types/reports-by-region.ts
 */

export type AnonymityLevel = 'anonim' | 'pseudonym' | 'nama_terang';
export type AccessType = 'identity_reveal' | 'contact_wa' | 'forensic_reveal';
export type ReporterSortKey = 'latest_activity' | 'total_reports' | 'first_seen';

/* ─── Aggregate (List Response) ──────────────────────────────────── */

export interface ReporterAggregate {
  reporter_id: string;
  // Masked identity
  phone_masked: string | null;
  name_display: string | null;
  pseudonym_display: string | null;
  anonymity_level_dominant: AnonymityLevel;
  // Aggregate stats
  total_reports: number;
  pending_count: number;
  reviewing_count: number;
  verified_count: number;
  rejected_count: number;
  published_count: number;
  spam_count: number;
  // Activity timeline
  first_report_at: string;
  latest_report_at: string;
  // Forensic indicators (count only)
  distinct_ips_count: number;
  distinct_devices_count: number;
  // Audit indicators
  reveal_count: number;
  contact_count: number;
  last_audit_action_at: string | null;
}

/* ─── Detail (Single Reporter Response) ──────────────────────────── */

export interface ReporterReportSummary {
  id: string;
  display_id: string | null;
  title: string;
  status: string;
  priority: string | null;
  category: string | null;
  location_label: string | null;
  created_at: string;
  submitted_device: string | null;
}

export interface ReporterAuditEntry {
  id: string;
  access_type: AccessType;
  admin_id: string | null;
  reason: string;
  viewed_at: string | null;
}

export interface ReporterDetail {
  reporter_id: string;
  phone_masked: string | null;
  name_display: string | null;
  pseudonym_display: string | null;
  anonymity_level_dominant: AnonymityLevel;
  joined_at: string | null;
  aggregate: ReporterAggregate;
  reports: ReporterReportSummary[];
  audit_history: ReporterAuditEntry[];
}

/* ─── Reveal (Forensic) Response ─────────────────────────────────── */

export interface ReporterFullIdentity {
  reporter_id: string;
  phone: string | null;
  name: string | null;
  pseudonym_dominant: string | null;
  anonymity_level_dominant: AnonymityLevel;
  joined_at: string | null;
  latest_ip: string | null;
  latest_user_agent: string | null;
  latest_device: string | null;
  distinct_ips: string[];
  distinct_devices: string[];
  accessed_by: string;
  reason: string;
  accessed_at: string;
}

/* ─── Contact (WA) Response ──────────────────────────────────────── */

export interface ContactReporterResult {
  reporter_id: string;
  phone: string;
  wa_url: string;
  accessed_by: string;
  reason: string;
  accessed_at: string;
}

/* ─── List Response Wrapper ──────────────────────────────────────── */

export interface ReporterListResponse {
  data: ReporterAggregate[];
  meta?: {
    pagination: {
      page: number;
      limit: number;
      total: number;
      has_more: boolean;
    };
  };
}

/* ─── Helper Functions ───────────────────────────────────────────── */

/**
 * Format anonymity level untuk display admin.
 */
export function getAnonymityLabel(level: AnonymityLevel): string {
  switch (level) {
    case 'nama_terang':
      return 'Nama Terang';
    case 'pseudonym':
      return 'Pseudonim';
    case 'anonim':
      return 'Anonim';
  }
}

/**
 * Get color class untuk anonymity level badge.
 */
export function getAnonymityColorClass(level: AnonymityLevel): string {
  switch (level) {
    case 'nama_terang':
      return 'bg-status-healthy/12 text-status-healthy';
    case 'pseudonym':
      return 'bg-status-warning/12 text-status-warning';
    case 'anonim':
      return 'bg-text-muted/12 text-text-muted';
  }
}

/**
 * Get icon emoji untuk anonymity level.
 */
export function getAnonymityIcon(level: AnonymityLevel): string {
  switch (level) {
    case 'nama_terang':
      return '👤';
    case 'pseudonym':
      return '🎭';
    case 'anonim':
      return '🔒';
  }
}

/**
 * Format access type untuk audit log display.
 */
export function getAccessTypeLabel(type: AccessType): string {
  switch (type) {
    case 'forensic_reveal':
      return 'Reveal Identity';
    case 'identity_reveal':
      return 'Reveal Report';
    case 'contact_wa':
      return 'Contact WA';
  }
}

export function getAccessTypeIcon(type: AccessType): string {
  switch (type) {
    case 'forensic_reveal':
      return '🔍';
    case 'identity_reveal':
      return '📋';
    case 'contact_wa':
      return '💬';
  }
}

/**
 * Compute resolution rate dari aggregate.
 * (verified + published) / total — civic engagement quality indicator.
 */
export function computeResolutionRate(agg: ReporterAggregate): number {
  if (agg.total_reports === 0) return 0;
  return (agg.verified_count + agg.published_count) / agg.total_reports;
}

/**
 * Format rate as percentage string (0-100%).
 */
export function formatRate(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

/**
 * Sort key options for UI dropdown.
 */
export const SORT_OPTIONS: Array<{ key: ReporterSortKey; label: string }> = [
  { key: 'latest_activity', label: 'Aktivitas Terbaru' },
  { key: 'total_reports', label: 'Jumlah Laporan' },
  { key: 'first_seen', label: 'Pelapor Lama' },
];
