'use client';

/**
 * TeraLoka — Admin Content Page (BAKABAR Command Center)
 * Phase 2 · Batch 7e2 — Tab 1 COMPLETE
 * ------------------------------------------------------------
 * BAKABAR admin dashboard — Tab 1 fully functional.
 *
 * Tab 1 (Overview) sections:
 * - Period selector (7d default)
 * - Stats cards (published, views, stale drafts)
 * - Trending + Perlu Perhatian (2-col)
 * - Manajemen Artikel (filter + table + pagination + delete)
 *
 * Tab 2 + 3: Coming Soon placeholder (Batch 7e4 + 7e5)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useApi, ApiError } from '@/lib/api/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ArticleStats } from '@/components/admin/content/article-stats';
import { TrendingSection } from '@/components/admin/content/trending-section';
import {
  ArticleFilters,
  useDebounce,
} from '@/components/admin/content/article-filters';
import { ArticleRow } from '@/components/admin/content/article-row';
import { DeleteArticleModal } from '@/components/admin/content/delete-article-modal';
import {
  computeArticleStats,
  filterByPeriod,
  getDateRange,
  type Article,
  type ArticleStatus,
  type StatsPeriod,
  STATS_PERIOD_LABELS,
} from '@/types/articles';

type Tab = 'overview' | 'newsroom' | 'distribution';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'overview',     label: 'Overview',             icon: '📊' },
  { key: 'newsroom',     label: 'Newsroom Analytics',   icon: '📰' },
  { key: 'distribution', label: 'Distribution Metrics', icon: '📈' },
];

const PAGE_SIZE = 10;

export default function AdminContentPage() {
  const api = useApi();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  /* ─── Tab + period state ─── */

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [period, setPeriod] = useState<StatsPeriod>('7d');

  /* ─── Main articles (50 terbaru, untuk stats + trending) ─── */

  const [articles, setArticles] = useState<Article[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(true);
  const [articlesError, setArticlesError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  /* ─── Manajemen articles (filtered, paginated) ─── */

  const [searchInput, setSearchInput] = useState('');
  const search = useDebounce(searchInput, 300);
  const [statusFilter, setStatusFilter] = useState<ArticleStatus | ''>('');
  const [periodFilter, setPeriodFilter] = useState<StatsPeriod>('all');
  const [page, setPage] = useState(1);

  const [manageArticles, setManageArticles] = useState<Article[]>([]);
  const [manageTotal, setManageTotal] = useState(0);
  const [manageLoading, setManageLoading] = useState(false);
  const [manageError, setManageError] = useState<string | null>(null);

  /* ─── Delete modal state ─── */

  const [deleteTarget, setDeleteTarget] = useState<Article | null>(null);

  /* ─── Manajemen section ref (untuk scroll from Perlu Perhatian) ─── */

  const manajemenRef = useRef<HTMLDivElement>(null);

  /* ─── Fetch main articles (stats + trending) ─── */

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    setArticlesLoading(true);
    setArticlesError(null);

    (async () => {
      try {
        const res = await api.get<{ data: Article[]; total: number }>(
          '/admin/articles',
          {
            params: { limit: 50, page: 1 },
            signal: controller.signal,
          }
        );

        if (cancelled) return;
        const list = Array.isArray(res) ? res : res?.data || [];
        setArticles(list);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) {
          setArticlesError(err.message);
        } else if ((err as Error).name !== 'AbortError') {
          setArticlesError('Gagal memuat artikel');
        }
      } finally {
        if (!cancelled) setArticlesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [api, retryNonce]);

  /* ─── Fetch manajemen articles (dengan filter) ─── */

  const fetchManageArticles = useCallback(
    async (signal?: AbortSignal) => {
      if (!isSuperAdmin) return;

      setManageLoading(true);
      setManageError(null);

      try {
        const { from, to } = getDateRange(periodFilter);
        const params: Record<string, string | number> = {
          page,
          limit: PAGE_SIZE,
        };
        if (search.trim()) params.q = search.trim();
        if (statusFilter) params.status = statusFilter;
        if (from) params.from = from;
        if (to) params.to = to;

        const res = await api.get<{ data: Article[]; total: number }>(
          '/admin/articles',
          { params, signal }
        );

        setManageArticles(res?.data || []);
        setManageTotal(res?.total || 0);
      } catch (err) {
        if (err instanceof ApiError) {
          setManageError(err.message);
        } else if ((err as Error).name !== 'AbortError') {
          setManageError('Gagal memuat artikel');
        }
      } finally {
        setManageLoading(false);
      }
    },
    [api, isSuperAdmin, search, statusFilter, periodFilter, page]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchManageArticles(controller.signal);
    return () => controller.abort();
  }, [fetchManageArticles]);

  // Reset page ke 1 saat filter berubah
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, periodFilter]);

  /* ─── Event handlers ─── */

  const refetch = useCallback(() => setRetryNonce((n) => n + 1), []);

  const handleReviewStaleDrafts = useCallback(() => {
    // Scroll to Manajemen + auto-filter status=draft
    setStatusFilter('draft');
    manajemenRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, []);

  const handleDeleteSuccess = useCallback((deletedId: string) => {
    // Optimistic update — remove from both lists
    setArticles((prev) => prev.filter((a) => a.id !== deletedId));
    setManageArticles((prev) => prev.filter((a) => a.id !== deletedId));
    setManageTotal((n) => Math.max(0, n - 1));
  }, []);

  const clearFilters = useCallback(() => {
    setSearchInput('');
    setStatusFilter('');
    setPeriodFilter('all');
  }, []);

  const hasActiveFilters =
    search.length > 0 || statusFilter !== '' || periodFilter !== 'all';

  /* ─── Derived state ─── */

  const periodArticles = filterByPeriod(articles, period);
  const stats = computeArticleStats(periodArticles);
  const periodLabel = STATS_PERIOD_LABELS[period];
  const totalPages = Math.max(1, Math.ceil(manageTotal / PAGE_SIZE));

  /* ─── Render ─── */

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text tracking-tight flex items-center gap-2">
            <span>📰</span>
            <span>BAKABAR Command Center</span>
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Monitor performa konten + editorial workflow
          </p>
        </div>
        <Link
          href="/office/newsroom/bakabar/hub"
          className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-brand-teal text-white text-xs font-semibold hover:bg-brand-teal/90 transition-colors shrink-0"
        >
          Editorial Hub →
        </Link>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-border overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`
              relative px-3 sm:px-4 py-2.5 text-sm font-semibold whitespace-nowrap
              transition-colors
              ${
                activeTab === tab.key
                  ? 'text-brand-teal'
                  : 'text-text-muted hover:text-text'
              }
            `}
          >
            <span className="mr-1.5">{tab.icon}</span>
            {tab.label}
            {activeTab === tab.key && (
              <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-brand-teal" />
            )}
          </button>
        ))}
      </div>

      {/* Error banner for main articles */}
      {articlesError && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-status-critical/10 border border-status-critical/30 text-status-critical text-sm flex items-center justify-between gap-3">
          <span>⚠️ {articlesError}</span>
          <button
            onClick={refetch}
            className="text-xs font-semibold underline hover:no-underline"
          >
            Coba lagi
          </button>
        </div>
      )}

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Period selector */}
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide">
              Ringkasan
            </h2>
            <div className="flex gap-1 rounded-lg border border-border bg-surface p-0.5">
              {(['7d', '30d', '90d', 'all'] as StatsPeriod[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`
                    px-3 py-1 text-xs font-semibold rounded-md transition-colors
                    ${
                      period === p
                        ? 'bg-brand-teal text-white'
                        : 'text-text-muted hover:text-text'
                    }
                  `}
                >
                  {STATS_PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          {/* Stats cards */}
          <ArticleStats
            stats={stats}
            periodLabel={periodLabel}
            loading={articlesLoading}
          />

          {/* Trending + Perlu Perhatian */}
          <TrendingSection
            articles={periodArticles}
            onReviewStaleDrafts={isSuperAdmin ? handleReviewStaleDrafts : undefined}
            loading={articlesLoading}
          />

          {/* Manajemen Artikel — super_admin only */}
          {isSuperAdmin && (
            <div
              ref={manajemenRef}
              className="rounded-xl border border-border bg-surface p-4 sm:p-5 scroll-mt-6"
            >
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="text-sm font-bold text-text flex items-center gap-2">
                  <span>📋</span>
                  <span>Manajemen Artikel</span>
                </h3>
                <span className="text-xs text-text-muted">
                  {manageTotal.toLocaleString('id-ID')} total artikel
                </span>
              </div>

              {/* Filters */}
              <div className="mb-4">
                <ArticleFilters
                  searchValue={searchInput}
                  onSearchChange={setSearchInput}
                  statusValue={statusFilter}
                  onStatusChange={setStatusFilter}
                  periodValue={periodFilter}
                  onPeriodChange={setPeriodFilter}
                  hasActiveFilters={hasActiveFilters}
                  onClearFilters={clearFilters}
                />
              </div>

              {/* Error */}
              {manageError && (
                <div className="mb-3 px-3 py-2 rounded-lg bg-status-critical/10 border border-status-critical/30 text-status-critical text-sm">
                  {manageError}
                </div>
              )}

              {/* Table */}
              {manageLoading ? (
                <div className="space-y-2 py-6">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="h-12 rounded bg-surface-muted animate-pulse"
                    />
                  ))}
                </div>
              ) : manageArticles.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-3xl mb-2">🔎</p>
                  <p className="text-sm text-text-muted">
                    {hasActiveFilters
                      ? 'Tidak ada artikel yang cocok dengan filter.'
                      : 'Belum ada artikel.'}
                  </p>
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="mt-3 text-xs font-semibold text-brand-teal hover:underline"
                    >
                      Clear semua filter
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  {manageArticles.map((article) => (
                    <ArticleRow
                      key={article.id}
                      article={article}
                      variant="compact"
                      actionSlot={
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setDeleteTarget(article)}
                        >
                          Hapus
                        </Button>
                      }
                    />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {manageTotal > 0 && !manageLoading && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border gap-3">
                  <p className="text-xs text-text-muted">
                    {(page - 1) * PAGE_SIZE + 1}–
                    {Math.min(page * PAGE_SIZE, manageTotal)} dari{' '}
                    {manageTotal.toLocaleString('id-ID')}
                  </p>
                  <div className="flex gap-2 items-center">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      ‹ Prev
                    </Button>
                    <span className="text-xs font-semibold text-text px-2">
                      {page} / {totalPages}
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page >= totalPages}
                    >
                      Next ›
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Non-super_admin note */}
          {!isSuperAdmin && (
            <div className="rounded-xl border border-dashed border-border bg-surface-muted/50 p-6 text-center">
              <p className="text-sm text-text-muted">
                🔒 Manajemen Artikel (delete, filter advanced) hanya untuk
                Super Admin
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'newsroom' && <ComingSoonTab tab="newsroom" />}

      {activeTab === 'distribution' && <ComingSoonTab tab="distribution" />}

      {/* Delete modal */}
      <DeleteArticleModal
        article={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}

/* ─── Coming Soon Tab ─── */

interface ComingSoonTabProps {
  tab: 'newsroom' | 'distribution';
}

function ComingSoonTab({ tab }: ComingSoonTabProps) {
  const config = {
    newsroom: {
      title: 'Newsroom Analytics',
      emoji: '📰',
      description:
        'Editorial intelligence — metrics untuk optimize editorial strategy',
      features: [
        'Publishing velocity (30-day trend chart)',
        'Top authors by articles + views',
        'Category distribution (pie/bar chart)',
        'Draft → publish cycle time',
        'Viral score distribution (histogram)',
        'Article status breakdown',
      ],
      eta: 'Batch 7e4 — segera setelah Tab 1 complete',
      dependsOn: 'Data dari `articles` table (sudah ada)',
    },
    distribution: {
      title: 'Distribution Metrics',
      emoji: '📈',
      description:
        'Traffic intelligence — data untuk pitch ke mitra + optimize distribusi',
      features: [
        'Share platform breakdown (WA/FB/Twitter/TG/copy-link)',
        'Traffic source analysis (direct/search/social)',
        'Peak reading hours heatmap',
        'Article pageviews over time',
        'Avg time on page per article',
        'Bounce rate per category',
      ],
      eta: 'Batch 7e5 — setelah Tab 2 functional',
      dependsOn:
        'PostHog events (✅ sudah live sejak Batch 7e3). Data akan terkumpul organic setelah launch.',
    },
  }[tab];

  return (
    <div className="rounded-xl border border-border bg-surface p-8">
      <div className="text-center mb-6">
        <div className="text-4xl mb-3">{config.emoji}</div>
        <h3 className="text-xl font-bold text-text mb-2">{config.title}</h3>
        <p className="text-sm text-text-muted max-w-md mx-auto">
          {config.description}
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-4">
        <div>
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
            Fitur Yang Akan Datang
          </p>
          <ul className="space-y-1.5">
            {config.features.map((f) => (
              <li key={f} className="text-sm text-text flex items-start gap-2">
                <span className="text-brand-teal mt-0.5">•</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="pt-4 border-t border-border space-y-2">
          <div className="flex items-start gap-2 text-sm">
            <span className="text-text-muted shrink-0">📅 ETA:</span>
            <span className="text-text">{config.eta}</span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <span className="text-text-muted shrink-0">📊 Data source:</span>
            <span className="text-text">{config.dependsOn}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
