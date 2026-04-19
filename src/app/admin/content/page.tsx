'use client';

/**
 * TeraLoka — Admin Content Page (BAKABAR Command Center)
 * Phase 2 · Batch 7e1 — Content Panel Migration
 * ------------------------------------------------------------
 * BAKABAR admin dashboard — monitor + manage articles.
 *
 * Structure (3 tabs):
 * - Overview:         Stats + Trending + Manajemen (THIS batch: Stats only)
 * - Newsroom Analytics:  DB-based editorial metrics (Batch 7e4)
 * - Distribution Metrics: PostHog-powered traffic metrics (Batch 7e5)
 *
 * Batch 7e1 scope:
 * - Page shell with 3-tab navigation
 * - Overview tab: Stats cards functional
 * - Trending + Manajemen: placeholder ("coming in next batch")
 * - Tab 2 + 3: "Coming Soon" roadmap placeholder
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useApi, ApiError } from '@/lib/api/client';
import { ArticleStats } from '@/components/admin/content/article-stats';
import {
  computeArticleStats,
  filterByPeriod,
  type Article,
  type StatsPeriod,
  STATS_PERIOD_LABELS,
} from '@/types/articles';

type Tab = 'overview' | 'newsroom' | 'distribution';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'overview',     label: 'Overview',             icon: '📊' },
  { key: 'newsroom',     label: 'Newsroom Analytics',   icon: '📰' },
  { key: 'distribution', label: 'Distribution Metrics', icon: '📈' },
];

export default function AdminContentPage() {
  const api = useApi();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [period, setPeriod] = useState<StatsPeriod>('7d');

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  /* ─── Fetch articles (top 50 recent) ─── */

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    setLoading(true);
    setError(null);

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

        // API wrapper sometimes returns { data, total } or flat array.
        // Defensive: check shape.
        const list = Array.isArray(res) ? res : res?.data || [];
        setArticles(list);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) {
          setError(err.message);
        } else if ((err as Error).name !== 'AbortError') {
          setError('Gagal memuat artikel');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [api, retryNonce]);

  const refetch = useCallback(() => setRetryNonce((n) => n + 1), []);

  /* ─── Derived state ─── */

  const periodArticles = filterByPeriod(articles, period);
  const stats = computeArticleStats(periodArticles);
  const periodLabel = STATS_PERIOD_LABELS[period];

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

      {/* Error banner */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-status-critical/10 border border-status-critical/30 text-status-critical text-sm flex items-center justify-between gap-3">
          <span>⚠️ {error}</span>
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
        <OverviewTab
          stats={stats}
          periodLabel={periodLabel}
          period={period}
          onPeriodChange={setPeriod}
          loading={loading}
        />
      )}

      {activeTab === 'newsroom' && <ComingSoonTab tab="newsroom" />}

      {activeTab === 'distribution' && <ComingSoonTab tab="distribution" />}
    </div>
  );
}

/* ─── Overview Tab (Batch 7e1: partial — stats only) ─── */

interface OverviewTabProps {
  stats: ReturnType<typeof computeArticleStats>;
  periodLabel: string;
  period: StatsPeriod;
  onPeriodChange: (p: StatsPeriod) => void;
  loading: boolean;
}

function OverviewTab({
  stats,
  periodLabel,
  period,
  onPeriodChange,
  loading,
}: OverviewTabProps) {
  return (
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
              onClick={() => onPeriodChange(p)}
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
      <ArticleStats stats={stats} periodLabel={periodLabel} loading={loading} />

      {/* Placeholder — Trending + Manajemen datang di Batch 7e2 */}
      <div className="rounded-xl border border-dashed border-border bg-surface-muted/50 p-8 text-center">
        <p className="text-sm text-text-muted">
          🚧 <strong>Trending, Perlu Perhatian, dan Manajemen Artikel</strong>{' '}
          akan hadir di Batch 7e2 (segera)
        </p>
        <p className="text-xs text-text-subtle mt-2">
          Scope: Top 5 trending artikel, alert untuk draft stale, dan table
          lengkap manajemen dengan filter + delete.
        </p>
      </div>
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
      description: 'Editorial intelligence — metrics untuk optimize editorial strategy',
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
              <li
                key={f}
                className="text-sm text-text flex items-start gap-2"
              >
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
