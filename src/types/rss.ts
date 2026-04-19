/**
 * TeraLoka — RSS Article Types
 * Phase 2 · Batch 7d — Admin RSS Management Migration
 * ------------------------------------------------------------
 * Types + config untuk RSS review workflow.
 *
 * Flow:
 * - Cron job fetch artikel dari media nasional setiap jam
 * - Admin review + approve (→ publish ke BAKABAR) atau reject (→ dibuang)
 * - Sumber: 8 media nasional + regional Maluku Utara
 */

/* ─── RSS Article entity ─── */

export interface RSSArticle {
  id: string;
  source_name: string;
  source_url: string;
  title: string;
  excerpt: string;
  image_url: string | null;
  published_at: string;
  status: string;
  fetched_at: string;
}

/* ─── Source color config ─── */

/**
 * Mapping source name → hex color untuk badge.
 * Color cuma untuk visual diferensiasi, tidak carry semantic meaning.
 * Default (#374151 — neutral gray) untuk source yang tidak ada di mapping.
 */
export const SOURCE_COLORS: Record<string, string> = {
  'Antara Maluku Utara': '#E67E22',
  'CNN Indonesia': '#C0392B',
  'Tribun Ternate': '#2980B9',
  'Kumparan': '#8E44AD',
  'Kompas Nusantara': '#27AE60',
  'Detik Nasional': '#E74C3C',
  'Detik Regional': '#E74C3C',
  'Disway': '#16A085',
};

export function getSourceColor(sourceName: string): string {
  return SOURCE_COLORS[sourceName] ?? '#374151';
}

/* ─── Formatters ─── */

/**
 * Format ISO date ke "19 Apr 2026, 14:30"
 */
export function formatArticleDate(d: string): string {
  return new Date(d).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Relative time untuk "fetched_at" (internal timestamp).
 * Mirip timeAgo di reports.ts, tapi duplicate karena beda domain + avoid cross-import.
 */
export function fetchedAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Baru saja';
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.floor(h / 24)} hari lalu`;
}

/* ─── API response shape ─── */

/**
 * Response dari GET /admin/rss.
 * Backend pakai `paginated()` helper → data + meta.
 */
export interface RSSListResponse {
  data: RSSArticle[];
  meta: {
    page: number;
    limit: number;
    total: number;
    has_more: boolean;
  };
}
