/**
 * TeraLoka — Article Types
 * Phase 2 · Batch 7e1 — Content Panel Migration
 * ------------------------------------------------------------
 * Type definitions + constants untuk BAKABAR content management.
 * Mirror shape dari backend `GET /admin/articles` response.
 */

/* ─── Core Article Type ─── */

export type ArticleStatus = 'draft' | 'review' | 'published' | 'archived';

export interface Article {
  id: string;
  title: string;
  slug: string;
  status: ArticleStatus;
  category: string | null;
  author_name: string;
  author_id?: string | null;
  view_count: number;
  share_count: number;
  viral_score: number;
  is_viral: boolean;
  is_breaking: boolean;
  is_ticker?: boolean;
  published_at: string | null;
  created_at: string;
  updated_at?: string | null;
  cover_image_url?: string | null;
  source_url?: string | null;
  source_platform?: string | null;
}

/* ─── Status Config ─── */

/**
 * Map article status → Badge variant props.
 * Use with <Badge variant="status" status={...}>.
 */
export const STATUS_CONFIG: Record<
  ArticleStatus,
  {
    badgeStatus: 'healthy' | 'warning' | 'critical' | 'info' | 'neutral';
    label: string;
  }
> = {
  published: { badgeStatus: 'healthy', label: 'Published' },
  draft:     { badgeStatus: 'warning', label: 'Draft' },
  review:    { badgeStatus: 'info',    label: 'Review' },
  archived:  { badgeStatus: 'neutral', label: 'Archived' },
};

/* ─── Stats Period ─── */

export type StatsPeriod = '7d' | '30d' | '90d' | 'all';

export const STATS_PERIOD_LABELS: Record<StatsPeriod, string> = {
  '7d':  'Minggu ini',
  '30d': '30 hari',
  '90d': '90 hari',
  'all': 'Semua waktu',
};

/* ─── Filter State ─── */

export interface ArticleFilters {
  search: string;
  status: ArticleStatus | '';
  period: StatsPeriod;
  page: number;
}

export const DEFAULT_FILTERS: ArticleFilters = {
  search: '',
  status: '',
  period: 'all',
  page: 1,
};

/* ─── Helpers ─── */

/**
 * Format relative time — "5 mnt lalu", "3 jam lalu", "2 hari lalu".
 * Returns '—' kalau dateStr kosong.
 */
export function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60_000) return 'baru saja';
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} hari lalu`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} bln lalu`;
  return `${Math.floor(mo / 12)} thn lalu`;
}

/**
 * Format number — 1234 → "1.2k", 1234567 → "1.2M".
 * Kompak tapi tetap readable.
 */
export function formatNum(n: number | null | undefined): string {
  if (!n && n !== 0) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

/**
 * Convert StatsPeriod → { from, to } ISO date strings untuk API query.
 * Returns empty object kalau 'all' (tanpa filter tanggal).
 */
export function getDateRange(
  period: StatsPeriod
): { from?: string; to?: string } {
  if (period === 'all') return {};
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const from = new Date(now.getTime() - days * 24 * 3600 * 1000)
    .toISOString()
    .split('T')[0];
  return { from, to: today };
}

/* ─── Stats Computation (client-side) ─── */

export interface ArticleStats {
  total: number;
  published: number;
  draft: number;
  review: number;
  archived: number;
  totalViews: number;
  totalShares: number;
  staleDrafts: number; // draft > 3 jam
}

/**
 * Compute aggregate stats dari list of articles.
 * Stale draft = draft yang belum published lebih dari 3 jam.
 */
export function computeArticleStats(articles: Article[]): ArticleStats {
  const now = Date.now();
  const staleThreshold = 3 * 3600 * 1000; // 3 hours

  return articles.reduce<ArticleStats>(
    (acc, a) => {
      acc.total++;
      if (a.status === 'published') {
        acc.published++;
        acc.totalViews += a.view_count || 0;
        acc.totalShares += a.share_count || 0;
      } else if (a.status === 'draft') {
        acc.draft++;
        if (now - new Date(a.created_at).getTime() > staleThreshold) {
          acc.staleDrafts++;
        }
      } else if (a.status === 'review') {
        acc.review++;
      } else if (a.status === 'archived') {
        acc.archived++;
      }
      return acc;
    },
    {
      total: 0,
      published: 0,
      draft: 0,
      review: 0,
      archived: 0,
      totalViews: 0,
      totalShares: 0,
      staleDrafts: 0,
    }
  );
}

/**
 * Filter articles berdasar periode publish (client-side, untuk Trending section).
 * Published articles dengan published_at dalam range.
 */
export function filterByPeriod(
  articles: Article[],
  period: StatsPeriod
): Article[] {
  if (period === 'all') return articles;
  const { from } = getDateRange(period);
  if (!from) return articles;
  const fromTime = new Date(from).getTime();
  return articles.filter((a) => {
    const date = a.published_at || a.created_at;
    return new Date(date).getTime() >= fromTime;
  });
}

/**
 * Sort articles by viral_score desc (untuk Trending).
 */
export function sortByViralScore(articles: Article[]): Article[] {
  return [...articles].sort((a, b) => (b.viral_score || 0) - (a.viral_score || 0));
}

/**
 * Sort articles by published_at desc, fallback ke created_at (untuk Recent).
 */
export function sortByPublishedDate(articles: Article[]): Article[] {
  return [...articles].sort((a, b) => {
    const dateA = new Date(a.published_at || a.created_at).getTime();
    const dateB = new Date(b.published_at || b.created_at).getTime();
    return dateB - dateA;
  });
}
