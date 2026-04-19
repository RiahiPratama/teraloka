/**
 * TeraLoka — Newsroom Analytics Types
 * Phase 2 · Batch 7e4 — Tab 2 Content Panel
 * ------------------------------------------------------------
 * Types untuk response dari GET /admin/articles/newsroom-analytics.
 * Used by Tab 2 charts + orchestrator view.
 */

/* ─── Period ─── */

export type NewsroomPeriod = '30d' | '90d' | '180d' | '1y';

export const NEWSROOM_PERIOD_LABELS: Record<NewsroomPeriod, string> = {
  '30d':  '30 Hari',
  '90d':  '90 Hari',
  '180d': '6 Bulan',
  '1y':   '1 Tahun',
};

export const NEWSROOM_PERIOD_DAYS: Record<NewsroomPeriod, number> = {
  '30d':  30,
  '90d':  90,
  '180d': 180,
  '1y':   365,
};

/* ─── Response sections ─── */

/** Daily publishing count — chart x=date, y=count */
export interface VelocityPoint {
  date: string; // YYYY-MM-DD
  count: number;
}

/** Author aggregated metrics */
export interface TopAuthor {
  author_id: string;
  name: string;
  articles: number;
  total_views: number;
  total_shares: number;
}

/** Category distribution */
export interface CategoryCount {
  name: string;
  count: number;
}

/** Cycle time statistics (draft → publish in hours) */
export interface CycleTimeStats {
  samples: number;
  avg_hours: number;
  median_hours: number;
  p90_hours: number;
  fastest_hours: number;
  slowest_hours: number;
}

/** Viral score histogram bucket */
export interface ViralBucket {
  range: string; // '0-20', '20-40', etc.
  count: number;
}

/** Status breakdown */
export interface StatusCount {
  status: string;
  count: number;
}

/** Summary aggregate */
export interface NewsroomSummary {
  total_articles: number;
  total_published: number;
  total_views: number;
  total_shares: number;
  period: NewsroomPeriod;
  period_days: number;
}

/** Full response from endpoint */
export interface NewsroomAnalyticsResponse {
  summary: NewsroomSummary;
  velocity: VelocityPoint[];
  topAuthors: TopAuthor[];
  categories: CategoryCount[];
  cycleTime: CycleTimeStats;
  viralDistribution: ViralBucket[];
  statusBreakdown: StatusCount[];
}

/* ─── Formatting helpers ─── */

/**
 * Format hours → readable duration
 * 0.5 → "30 mnt"
 * 2.5 → "2 jam 30 mnt"
 * 48  → "2 hari"
 * 100 → "4 hari 4 jam"
 */
export function formatHours(hours: number): string {
  if (hours < 1) {
    const mins = Math.round(hours * 60);
    return `${mins} mnt`;
  }
  if (hours < 24) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h} jam ${m} mnt` : `${h} jam`;
  }
  const d = Math.floor(hours / 24);
  const h = Math.floor(hours % 24);
  return h > 0 ? `${d} hari ${h} jam` : `${d} hari`;
}

/**
 * Format date string YYYY-MM-DD → short display "12 Apr"
 */
export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

/**
 * Status label (Indonesian)
 */
export const STATUS_LABELS: Record<string, string> = {
  draft:     'Draft',
  review:    'Review',
  published: 'Published',
  archived:  'Archived',
};

/**
 * Status color (hex) untuk pie chart
 */
export const STATUS_COLORS: Record<string, string> = {
  draft:     '#F59E0B', // amber
  review:    '#0891B2', // cyan
  published: '#10B981', // green
  archived:  '#6B7280', // gray
};

/**
 * Category color palette (cycling untuk pie/bar charts)
 */
export const CATEGORY_COLORS = [
  '#1B6B4A', // brand teal
  '#0891B2', // cyan
  '#E8963A', // orange
  '#8B5CF6', // purple
  '#EF4444', // red
  '#F59E0B', // amber
  '#10B981', // green
  '#6366F1', // indigo
  '#EC4899', // pink
  '#14B8A6', // teal
];
