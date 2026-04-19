'use client';

/**
 * TeraLoka — Distribution Metrics View
 * Phase 2 · Batch 7e5 — Tab 3 Content Panel
 * ------------------------------------------------------------
 * Main orchestrator untuk Tab 3 Distribution Metrics.
 *
 * Data source: PostHog via backend proxy (GET /admin/articles/distribution-metrics).
 *
 * Layout:
 * 1. Period selector (30d / 90d / 180d / 1y)
 * 2. Summary cards (pageviews, shares, peak users, time on page)
 * 3. Pageviews Over Time (line chart, dual lines)
 * 4. Peak Hours Heatmap (full width)
 * 5. Share Platforms + Traffic Sources (2-col)
 * 6. Top Articles by Views (list)
 *
 * Pre-launch note: Most charts will show empty states karena belum ada real traffic.
 * Data akan terisi organic setelah platform public launch.
 */

import { useCallback, useEffect, useState } from 'react';
import { useApi, ApiError } from '@/lib/api/client';
import { Card } from '@/components/ui/card';
import { SharePlatformChart } from './charts/share-platform-chart';
import { TrafficSourcesChart } from './charts/traffic-sources-chart';
import { PeakHoursHeatmap } from './charts/peak-hours-heatmap';
import { PageviewsChart } from './charts/pageviews-chart';
import {
  DISTRIBUTION_PERIOD_LABELS,
  formatSeconds,
  type DistributionMetricsResponse,
  type DistributionPeriod,
} from '@/types/distribution-metrics';
import { formatNum } from '@/types/articles';

export function DistributionMetricsView() {
  const api = useApi();

  const [period, setPeriod] = useState<DistributionPeriod>('30d');
  const [data, setData] = useState<DistributionMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  /* ─── Fetch ─── */

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await api.get<DistributionMetricsResponse>(
          '/admin/articles/distribution-metrics',
          {
            params: { period },
            signal: controller.signal,
          }
        );

        if (cancelled) return;
        setData(res);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) {
          setError(err.message);
        } else if ((err as Error).name !== 'AbortError') {
          setError('Gagal memuat distribution metrics');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [api, period, retryNonce]);

  const refetch = useCallback(() => setRetryNonce((n) => n + 1), []);

  /* ─── Render ─── */

  return (
    <div className="space-y-6">
      {/* Header + Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-text flex items-center gap-2">
            <span>📈</span>
            <span>Distribution Metrics</span>
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Traffic intelligence · powered by PostHog · data untuk pitch mitra
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-surface p-0.5 self-start sm:self-auto">
          {(['30d', '90d', '180d', '1y'] as DistributionPeriod[]).map((p) => (
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
              {DISTRIBUTION_PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Pre-launch note */}
      <div className="rounded-lg bg-status-info/8 border border-status-info/30 px-3 py-2 text-xs text-status-info flex items-start gap-2">
        <span className="shrink-0">ℹ️</span>
        <span>
          <strong>Pre-launch note:</strong> Data traffic akan terisi organic setelah platform public launch.
          Saat ini charts mungkin empty — infrastructure siap collect data dari menit pertama launch.
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-lg bg-status-critical/10 border border-status-critical/30 text-status-critical text-sm flex items-center justify-between gap-3">
          <span>⚠️ {error}</span>
          <button
            onClick={refetch}
            className="text-xs font-semibold underline hover:no-underline"
          >
            Coba lagi
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <SummaryCards summary={data?.summary} loading={loading} />

      {/* Pageviews Over Time — full width */}
      <PageviewsChart data={data?.pageviewsOverTime || []} loading={loading} />

      {/* Peak Hours Heatmap — full width */}
      <PeakHoursHeatmap data={data?.peakHours || []} loading={loading} />

      {/* Share Platforms + Traffic Sources — 2-col */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SharePlatformChart
          data={data?.sharePlatforms || []}
          loading={loading}
        />
        <TrafficSourcesChart
          data={data?.trafficSources || []}
          loading={loading}
        />
      </div>

      {/* Top Articles by Views */}
      <TopArticlesList
        data={data?.topArticlesByViews || []}
        loading={loading}
      />
    </div>
  );
}

/* ─── Summary Cards ─── */

interface SummaryCardsProps {
  summary?: DistributionMetricsResponse['summary'];
  loading: boolean;
}

function SummaryCards({ summary, loading }: SummaryCardsProps) {
  const cards = [
    {
      label: 'Total Pageviews',
      value: summary?.total_pageviews ?? 0,
      emoji: '👁',
      format: 'compact',
    },
    {
      label: 'Total Shares',
      value: summary?.total_shares ?? 0,
      emoji: '↗',
      format: 'compact',
    },
    {
      label: 'Peak Unique Users',
      value: summary?.peak_unique_users ?? 0,
      emoji: '👥',
      format: 'num',
    },
    {
      label: 'Avg Time on Page',
      value: summary?.avg_time_seconds ?? 0,
      emoji: '⏱',
      format: 'seconds',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => (
        <Card padded key={c.label} className="!p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-text-muted">{c.label}</span>
            <span className="text-sm">{c.emoji}</span>
          </div>
          {loading ? (
            <div className="h-6 w-12 rounded bg-surface-muted animate-pulse mt-1" />
          ) : (
            <p className="text-xl font-bold text-text">
              {c.format === 'compact'
                ? formatNum(c.value)
                : c.format === 'seconds'
                ? formatSeconds(c.value)
                : c.value.toLocaleString('id-ID')}
            </p>
          )}
        </Card>
      ))}
    </div>
  );
}

/* ─── Top Articles List ─── */

interface TopArticlesListProps {
  data: DistributionMetricsResponse['topArticlesByViews'];
  loading: boolean;
}

function TopArticlesList({ data, loading }: TopArticlesListProps) {
  return (
    <Card padded>
      <div className="mb-4">
        <h3 className="text-sm font-bold text-text flex items-center gap-2">
          <span>🏆</span>
          <span>Top Articles by Views</span>
        </h3>
        <p className="text-xs text-text-muted mt-0.5">
          Artikel dengan view terbanyak (tracked via backend article_viewed event)
        </p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-9 rounded bg-surface-muted animate-pulse"
            />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="py-8 text-center flex flex-col items-center gap-1">
          <span className="text-3xl mb-1">📰</span>
          <p className="text-sm font-semibold text-text-muted">
            Belum ada view data
          </p>
          <p className="text-xs text-text-subtle max-w-[260px]">
            Top articles akan muncul setelah pengunjung mulai baca (post-launch)
          </p>
        </div>
      ) : (
        <ol className="space-y-1">
          {data.slice(0, 10).map((a, idx) => (
            <li
              key={a.article_slug}
              className="flex items-center gap-3 py-1.5 border-b border-border last:border-0"
            >
              <span
                className={`
                  flex items-center justify-center w-6 h-6 rounded-full shrink-0 text-[11px] font-bold
                  ${idx === 0
                    ? 'bg-yellow-500/20 text-yellow-600'
                    : idx === 1
                    ? 'bg-gray-400/20 text-gray-600'
                    : idx === 2
                    ? 'bg-amber-600/20 text-amber-700'
                    : 'bg-surface-muted text-text-muted'
                  }
                `}
              >
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-mono text-text truncate">
                  {a.article_slug}
                </p>
              </div>
              <span className="text-xs font-bold text-text-muted whitespace-nowrap">
                {formatNum(Number(a.views))} views
              </span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
