/**
 * TeraLoka — Report Type Definitions
 * Phase 2 · Batch 7b1 — Reports Page Migration (Shell + Overview)
 * ------------------------------------------------------------
 * Shared types + config untuk admin reports page.
 *
 * Data model:
 * - Report = entity dari BALAPOR (public reports)
 * - Priority: urgent / high / normal (3 levels)
 * - Category: 8 fixed categories (keamanan, infrastruktur, dll)
 *
 * Color mapping strategy:
 * - Priority → status tokens (urgent=critical, high=warning, normal=healthy)
 * - Category → service colors (balapor primary, variants untuk diferensiasi)
 *
 * Helpers di-colocate di sini karena tightly coupled dengan Report data.
 */

import type { ServiceKey } from '@/components/ui/badge';

/* ─── Report entity (match /admin/reports response) ─── */

export type ReportPriority = 'urgent' | 'high' | 'normal';

export type ReportCategory =
  | 'keamanan'
  | 'infrastruktur'
  | 'lingkungan'
  | 'layanan publik'
  | 'kesehatan'
  | 'pendidikan'
  | 'transportasi'
  | 'lainnya';

export interface Report {
  id: string;
  title: string;
  status: string; // 'pending', 'verified', 'rejected', 'converted', etc
  category: ReportCategory | string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  priority: ReportPriority;
  is_spam: boolean;
  forwarded_at: string | null;
  photos: string[] | null;
}

/* ─── Priority config ─── */

interface PriorityConfigItem {
  label: string;
  emoji: string;
  /** Semantic status color token (tanpa var()) */
  statusToken: 'status-critical' | 'status-warning' | 'status-healthy';
  /** Hex fallback untuk inline usage (e.g., Leaflet markers) */
  hex: string;
  /** Radius di map marker (px) */
  mapMarkerRadius: number;
}

export const PRIORITY_CONFIG: Record<ReportPriority, PriorityConfigItem> = {
  urgent: {
    label: 'Urgent',
    emoji: '🔴',
    statusToken: 'status-critical',
    hex: '#EF4444',
    mapMarkerRadius: 12,
  },
  high: {
    label: 'High',
    emoji: '🟠',
    statusToken: 'status-warning',
    hex: '#F59E0B',
    mapMarkerRadius: 9,
  },
  normal: {
    label: 'Normal',
    emoji: '🟢',
    statusToken: 'status-healthy',
    hex: '#10B981',
    mapMarkerRadius: 7,
  },
};

export const PRIORITY_ORDER: ReportPriority[] = ['urgent', 'high', 'normal'];

/* ─── Category config ─── */

interface CategoryConfigItem {
  label: string;
  emoji: string;
  /** Service key untuk Badge variant (semantic coloring) */
  service: ServiceKey;
}

export const CATEGORY_CONFIG: Record<ReportCategory, CategoryConfigItem> = {
  keamanan: {
    label: 'Keamanan',
    emoji: '🛡️',
    service: 'balapor',
  },
  infrastruktur: {
    label: 'Infrastruktur',
    emoji: '🔧',
    service: 'bakos',
  },
  lingkungan: {
    label: 'Lingkungan',
    emoji: '🌳',
    service: 'properti',
  },
  'layanan publik': {
    label: 'Layanan Publik',
    emoji: '🏛️',
    service: 'bakabar',
  },
  kesehatan: {
    label: 'Kesehatan',
    emoji: '❤️',
    service: 'badonasi',
  },
  pendidikan: {
    label: 'Pendidikan',
    emoji: '🎓',
    service: 'bakabar',
  },
  transportasi: {
    label: 'Transportasi',
    emoji: '🚢',
    service: 'bapasiar',
  },
  lainnya: {
    label: 'Lainnya',
    emoji: '⋯',
    service: 'kendaraan',
  },
};

/** Filter options untuk dropdown/pill — includes "Semua" */
export const CATEGORY_FILTER_OPTIONS = [
  { value: '', label: 'Semua', emoji: '📋' },
  ...(Object.entries(CATEGORY_CONFIG) as [ReportCategory, CategoryConfigItem][]).map(
    ([value, config]) => ({
      value,
      label: config.label,
      emoji: config.emoji,
    })
  ),
];

/** Priority filter (untuk pills) */
export const PRIORITY_FILTER_OPTIONS = [
  { value: '', label: 'Semua', emoji: '📋' },
  {
    value: 'urgent' as ReportPriority,
    label: PRIORITY_CONFIG.urgent.label,
    emoji: PRIORITY_CONFIG.urgent.emoji,
  },
  {
    value: 'high' as ReportPriority,
    label: PRIORITY_CONFIG.high.label,
    emoji: PRIORITY_CONFIG.high.emoji,
  },
  {
    value: 'normal' as ReportPriority,
    label: PRIORITY_CONFIG.normal.label,
    emoji: PRIORITY_CONFIG.normal.emoji,
  },
];

/* ─── Helpers ─── */

/**
 * Relative time dari date string.
 * "5 mnt lalu" / "3 jam lalu" / "2 hari lalu"
 */
export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Baru saja';
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} hari lalu`;
  return `${Math.floor(d / 30)} bln lalu`;
}

/**
 * Cek apakah report "belum ditangani" — status pending > 2 jam.
 * Digunakan untuk hitung stat urgensi dan show warning.
 */
export function isUnhandled(r: Pick<Report, 'status' | 'created_at'>): boolean {
  if (r.status !== 'pending') return false;
  const diff = Date.now() - new Date(r.created_at).getTime();
  return diff > 2 * 3600 * 1000; // 2 jam
}

/**
 * Sort reports: urgent dulu, lalu high, lalu normal.
 * Dalam priority sama, newest first.
 */
export function sortReportsByPriority(reports: Report[]): Report[] {
  const order: Record<ReportPriority, number> = { urgent: 0, high: 1, normal: 2 };
  return [...reports].sort((a, b) => {
    if (order[a.priority] !== order[b.priority]) {
      return order[a.priority] - order[b.priority];
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

/**
 * Group reports by category. Fallback ke 'lainnya' kalau null/unknown.
 */
export function groupByCategory(reports: Report[]): Record<string, Report[]> {
  const groups: Record<string, Report[]> = {};
  for (const r of reports) {
    const key = r.category || 'lainnya';
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  }
  return groups;
}

/**
 * Count top locations (desc by count).
 * Return max top N.
 */
export function topLocations(
  reports: Report[],
  limit = 5
): Array<{ location: string; count: number }> {
  const locCount: Record<string, number> = {};
  for (const r of reports) {
    if (r.location) locCount[r.location] = (locCount[r.location] || 0) + 1;
  }
  return Object.entries(locCount)
    .map(([location, count]) => ({ location, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/* ─── Stats derivation ─── */

export interface ReportStats {
  total: number;
  urgent: number;
  high: number;
  normal: number;
  unhandled: number;
  pending: number;
}

export function computeReportStats(reports: Report[], total: number): ReportStats {
  return {
    total,
    urgent: reports.filter((r) => r.priority === 'urgent').length,
    high: reports.filter((r) => r.priority === 'high').length,
    normal: reports.filter((r) => r.priority === 'normal').length,
    unhandled: reports.filter(isUnhandled).length,
    pending: reports.filter((r) => r.status === 'pending').length,
  };
}

/**
 * Safe get category config — fallback ke 'lainnya' kalau tidak ada mapping.
 */
export function getCategoryConfig(
  category: string | null | undefined
): CategoryConfigItem {
  if (!category) return CATEGORY_CONFIG.lainnya;
  return (
    CATEGORY_CONFIG[category as ReportCategory] ?? CATEGORY_CONFIG.lainnya
  );
}
