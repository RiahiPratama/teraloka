/**
 * TeraLoka — Distribution Metrics Types
 * Phase 2 · Batch 7e5 — Tab 3 Content Panel
 * ------------------------------------------------------------
 * Types untuk response dari GET /admin/articles/distribution-metrics.
 * Data source: PostHog via HogQL Query API (backend proxy).
 */

/* ─── Period ─── */

export type DistributionPeriod = '30d' | '90d' | '180d' | '1y';

export const DISTRIBUTION_PERIOD_LABELS: Record<DistributionPeriod, string> = {
  '30d':  '30 Hari',
  '90d':  '90 Hari',
  '180d': '6 Bulan',
  '1y':   '1 Tahun',
};

/* ─── Response sections ─── */

/** Share platform row */
export interface SharePlatform {
  platform: string;
  count: number;
}

/** Traffic source row */
export interface TrafficSource {
  source: string;
  count: number;
}

/** Peak hours row — one per hour/day combo */
export interface PeakHourRow {
  day_of_week: number; // 1-7 (Mon=1, Sun=7 in PostHog)
  hour: number;        // 0-23
  count: number;
}

/** Pageviews over time */
export interface PageviewPoint {
  date: string;
  pageviews: number;
  unique_users: number;
}

/** Top article by views */
export interface TopArticleView {
  article_slug: string;
  views: number;
}

/** Summary aggregate */
export interface DistributionSummary {
  total_pageviews: number;
  total_shares: number;
  peak_unique_users: number;
  avg_time_seconds: number;
  median_time_seconds: number;
  period: DistributionPeriod;
  period_days: number;
}

/** Full response from endpoint */
export interface DistributionMetricsResponse {
  summary: DistributionSummary;
  sharePlatforms: SharePlatform[];
  trafficSources: TrafficSource[];
  peakHours: PeakHourRow[];
  pageviewsOverTime: PageviewPoint[];
  topArticlesByViews: TopArticleView[];
}

/* ─── Formatting helpers ─── */

/**
 * Format seconds → readable "1m 23s" or "45s"
 */
export function formatSeconds(seconds: number): string {
  if (!seconds || seconds < 0) return '—';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

/**
 * Day of week label (PostHog uses 1=Mon, 7=Sun)
 */
export const DAY_LABELS: Record<number, string> = {
  1: 'Sen',
  2: 'Sel',
  3: 'Rab',
  4: 'Kam',
  5: 'Jum',
  6: 'Sab',
  7: 'Min',
};

export const DAY_LABELS_FULL: Record<number, string> = {
  1: 'Senin',
  2: 'Selasa',
  3: 'Rabu',
  4: 'Kamis',
  5: 'Jumat',
  6: 'Sabtu',
  7: 'Minggu',
};

/**
 * Platform color mapping (for share platform chart)
 */
export const PLATFORM_COLORS: Record<string, string> = {
  whatsapp: '#25D366',
  wa:       '#25D366',
  facebook: '#1877F2',
  fb:       '#1877F2',
  twitter:  '#1DA1F2',
  x:        '#1DA1F2',
  telegram: '#0088CC',
  tg:       '#0088CC',
  copy:     '#6B7280',
  link:     '#6B7280',
  'copy-link': '#6B7280',
  email:    '#EA4335',
  native:   '#8B5CF6',
  unknown:  '#9CA3AF',
};

/**
 * Get platform display name (capitalize + normalize)
 */
export function getPlatformLabel(platform: string): string {
  const map: Record<string, string> = {
    whatsapp:    'WhatsApp',
    wa:          'WhatsApp',
    facebook:    'Facebook',
    fb:          'Facebook',
    twitter:     'Twitter/X',
    x:           'Twitter/X',
    telegram:    'Telegram',
    tg:          'Telegram',
    copy:        'Copy Link',
    link:        'Copy Link',
    'copy-link': 'Copy Link',
    email:       'Email',
    native:      'Native Share',
    unknown:     'Tidak Diketahui',
  };
  const key = platform.toLowerCase();
  return map[key] || platform.charAt(0).toUpperCase() + platform.slice(1);
}

/**
 * Traffic source color mapping
 */
export const SOURCE_COLORS = [
  '#1B6B4A', // brand teal — direct
  '#0891B2', // cyan — google
  '#1877F2', // blue — facebook
  '#25D366', // green — whatsapp
  '#E8963A', // orange — misc
  '#8B5CF6', // purple
  '#EF4444', // red
  '#F59E0B', // amber
];

/**
 * Get normalized traffic source label
 */
export function getSourceLabel(source: string): string {
  if (!source || source === '(direct)' || source === 'direct') return 'Direct';
  const s = source.toLowerCase();
  if (s.includes('google')) return 'Google';
  if (s.includes('facebook') || s.includes('fb.com')) return 'Facebook';
  if (s.includes('whatsapp') || s.includes('wa.me')) return 'WhatsApp';
  if (s.includes('twitter') || s.includes('x.com') || s.includes('t.co'))
    return 'Twitter/X';
  if (s.includes('telegram') || s.includes('t.me')) return 'Telegram';
  if (s.includes('instagram')) return 'Instagram';
  // Strip www. + extract base
  return source.replace(/^www\./, '');
}
