/**
 * TeraLoka — Report Type Definitions
 * Phase 2 · Batch 7b1 — Reports Page Migration (Shell + Overview)
 * Updated: 8 Mei 2026 — Sub-Sprint 1C-C-10 civic feedback admin visibility
 * ------------------------------------------------------------
 * Shared types + config untuk admin reports page.
 *
 * Data model:
 * - Report = entity dari BALAPOR (public reports)
 * - Priority: urgent / high / normal (3 levels)
 * - Category: 8 fixed categories (keamanan, infrastruktur, dll)
 * - FollowUp: civic feedback status dari pelapor (4 states)
 *
 * Color mapping strategy:
 * - Priority → status tokens (urgent=critical, high=warning, normal=healthy)
 * - Category → service colors (balapor primary, variants untuk diferensiasi)
 * - FollowUp → direct tailwind colors (consistency dengan citizen-facing UI)
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
  | 'layanan_publik'
  | 'kesehatan'
  | 'pendidikan'
  | 'transportasi'
  | 'lainnya';

/**
 * Civic Feedback Status (Sub-Sprint 1C-B.3)
 * Pelapor update tindak lanjut real-world.
 * Filosofi: TeraLoka = independent civic platform; ground-truth dari pelapor.
 */
export type FollowUpStatus =
  | 'belum_ditangani'   // belum ada perubahan di lokasi (default)
  | 'sedang_ditangani'  // ada tindakan terlihat, belum selesai
  | 'sudah_selesai'     // masalah teratasi
  | 'tidak_jelas';      // kondisi sama, status ambigu

export interface Report {
  id: string;
  title: string;
  /** Backend enum: pending | reviewing | verified | rejected | published */
  status: string;
  category: ReportCategory | string | null;
  /** Legacy free-text location (pre-Phase A). Preserved untuk backward compat. */
  location: string | null;
  /** FK ke public.locations (Phase A migration, 3 Mei 2026) */
  location_id: string | null;
  /** Hasil JOIN ke public.locations.name (di-enrich di backend via enrichWithLocation) */
  location_name: string | null;
  /** Hasil JOIN ke public.locations.type — kelurahan/desa/kecamatan/kota_kabupaten/provinsi */
  location_type: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  priority: ReportPriority;
  is_spam: boolean;
  forwarded_at: string | null;
  photos: string[] | null;
  /** Civic feedback cache — current status (Sub-Sprint 1C-C-10 admin visibility) */
  follow_up_current_status?: FollowUpStatus | null;
  /** Civic feedback cache — last updated timestamp */
  follow_up_updated_at?: string | null;
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
  layanan_publik: {
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

/* ─── Civic Feedback Config (Sub-Sprint 1C-C-10) ─── */

interface FollowUpConfigItem {
  label: string;
  emoji: string;
  /** Compact label untuk badge inline */
  compactLabel: string;
  /** Tailwind utility classes untuk badge styling */
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  /** Hex untuk visual reference */
  hex: string;
}

export const FOLLOW_UP_CONFIG: Record<FollowUpStatus, FollowUpConfigItem> = {
  belum_ditangani: {
    label: 'Belum Ditangani',
    compactLabel: 'Belum',
    emoji: '⚠️',
    badgeBg: 'bg-amber-500/10',
    badgeText: 'text-amber-600 dark:text-amber-400',
    badgeBorder: 'border-amber-500/30',
    hex: '#F59E0B',
  },
  sedang_ditangani: {
    label: 'Sedang Ditangani',
    compactLabel: 'Sedang',
    emoji: '🔧',
    badgeBg: 'bg-blue-500/10',
    badgeText: 'text-blue-600 dark:text-blue-400',
    badgeBorder: 'border-blue-500/30',
    hex: '#3B82F6',
  },
  sudah_selesai: {
    label: 'Sudah Selesai',
    compactLabel: 'Selesai',
    emoji: '✅',
    badgeBg: 'bg-emerald-500/10',
    badgeText: 'text-emerald-600 dark:text-emerald-400',
    badgeBorder: 'border-emerald-500/30',
    hex: '#10B981',
  },
  tidak_jelas: {
    label: 'Tidak Jelas',
    compactLabel: 'Tdk Jelas',
    emoji: '❓',
    badgeBg: 'bg-gray-500/10',
    badgeText: 'text-gray-600 dark:text-gray-400',
    badgeBorder: 'border-gray-500/30',
    hex: '#6B7280',
  },
};

export const FOLLOW_UP_ORDER: FollowUpStatus[] = [
  'belum_ditangani',
  'sedang_ditangani',
  'sudah_selesai',
  'tidak_jelas',
];

/* ─── Helpers ─── */

/**
 * Get best display location dari report.
 * Priority: location_name (dari JOIN public.locations) > location (legacy text) > null
 */
export function getBestLocation(
  r: Pick<Report, 'location_name' | 'location'>
): string | null {
  return r.location_name || r.location || null;
}

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
 */
export function isUnhandled(r: Pick<Report, 'status' | 'created_at'>): boolean {
  if (r.status !== 'pending') return false;
  const diff = Date.now() - new Date(r.created_at).getTime();
  return diff > 2 * 3600 * 1000;
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
 */
export function topLocations(
  reports: Report[],
  limit = 5
): Array<{ location: string; count: number }> {
  const locCount: Record<string, number> = {};
  for (const r of reports) {
    const key = getBestLocation(r);
    if (key) locCount[key] = (locCount[key] || 0) + 1;
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
 * Civic feedback distribution stats (Sub-Sprint 1C-C-10).
 * Ground-truth dari pelapor — gak ada bias klaim instansi.
 */
export interface CivicDistribution {
  belum_ditangani: number;
  sedang_ditangani: number;
  sudah_selesai: number;
  tidak_jelas: number;
  /** Reports tanpa civic feedback (warga belum update) */
  no_feedback: number;
  /** Reports yang eligible (verified atau published) — denominator untuk %  */
  eligible_total: number;
}

export function computeCivicDistribution(reports: Report[]): CivicDistribution {
  // Eligible reports = verified atau published (sesuai aturan engine)
  const eligible = reports.filter(
    (r) => r.status === 'verified' || r.status === 'published'
  );

  return {
    belum_ditangani: eligible.filter(
      (r) => r.follow_up_current_status === 'belum_ditangani'
    ).length,
    sedang_ditangani: eligible.filter(
      (r) => r.follow_up_current_status === 'sedang_ditangani'
    ).length,
    sudah_selesai: eligible.filter(
      (r) => r.follow_up_current_status === 'sudah_selesai'
    ).length,
    tidak_jelas: eligible.filter(
      (r) => r.follow_up_current_status === 'tidak_jelas'
    ).length,
    no_feedback: eligible.filter((r) => !r.follow_up_current_status).length,
    eligible_total: eligible.length,
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

/**
 * Safe get follow-up config — null/undefined return null.
 */
export function getFollowUpConfig(
  status: FollowUpStatus | null | undefined
): FollowUpConfigItem | null {
  if (!status) return null;
  return FOLLOW_UP_CONFIG[status] ?? null;
}
