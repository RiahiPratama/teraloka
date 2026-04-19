'use client';

/**
 * TeraLoka — Newsroom Analytics View
 * Phase 2 · Batch 7e4 — Tab 2 Content Panel
 * ------------------------------------------------------------
 * Main orchestrator untuk Tab 2 Newsroom Analytics.
 *
 * Layout:
 * 1. Period selector (30d / 90d / 180d / 1y)
 * 2. Summary cards (total articles, published, views, shares)
 * 3. Publishing Velocity (line chart)
 * 4. Cycle Time + Status Breakdown (2-col)
 * 5. Category Distribution (donut + legend)
 * 6. Top Authors (ranked list)
 * 7. Viral Score Distribution (histogram)
 *
 * Fetches from: GET /admin/articles/newsroom-analytics?period=XXX
 */

import { useCallback, useEffect, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { useApi, ApiError } from '@/lib/api/client';
import { Card } from '@/components/ui/card';
import { VelocityChart } from './charts/velocity-chart';
import { CategoryPie } from './charts/category-pie';
import { ViralHistogram } from './charts/viral-histogram';
import {
  formatHours,
  NEWSROOM_PERIOD_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  type NewsroomAnalyticsResponse,
  type NewsroomPeriod,
} from '@/types/newsroom-analytics';
import { formatNum } from '@/types/articles';

export function NewsroomAnalyticsView() {
  const api = useApi();

  const [period, setPeriod] = useState<NewsroomPeriod>('30d');
  const [data, setData] = useState<NewsroomAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  /* ─── Fetch analytics ─── */

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await api.get<NewsroomAnalyticsResponse>(
          '/admin/articles/newsroom-analytics',
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
          setError('Gagal memuat analytics');
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
            <span>📰</span>
            <span>Newsroom Analytics</span>
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Editorial intelligence untuk optimize workflow + content strategy
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-surface p-0.5 self-start sm:self-auto">
          {(['30d', '90d', '180d', '1y'] as NewsroomPeriod[]).map((p) => (
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
              {NEWSROOM_PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
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

      {/* Publishing Velocity — full width */}
      <VelocityChart data={data?.velocity || []} loading={loading} />

      {/* Cycle Time + Status Breakdown — 2-col */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CycleTimeCard data={data?.cycleTime} loading={loading} />
        <StatusBreakdown data={data?.statusBreakdown || []} loading={loading} />
      </div>

      {/* Category Distribution — full width (donut + legend layout needs space) */}
      <CategoryPie data={data?.categories || []} loading={loading} />

      {/* Top Authors + Viral Histogram — 2-col */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopAuthorsList data={data?.topAuthors || []} loading={loading} />
        <ViralHistogram data={data?.viralDistribution || []} loading={loading} />
      </div>
    </div>
  );
}

/* ─── Summary Cards ─── */

interface SummaryCardsProps {
  summary?: NewsroomAnalyticsResponse['summary'];
  loading: boolean;
}

function SummaryCards({ summary, loading }: SummaryCardsProps) {
  const cards = [
    {
      label: 'Total Artikel',
      value: summary?.total_articles ?? 0,
      emoji: '📝',
      format: 'num',
    },
    {
      label: 'Published',
      value: summary?.total_published ?? 0,
      emoji: '✓',
      format: 'num',
    },
    {
      label: 'Total Views',
      value: summary?.total_views ?? 0,
      emoji: '👁',
      format: 'compact',
    },
    {
      label: 'Total Shares',
      value: summary?.total_shares ?? 0,
      emoji: '↗',
      format: 'compact',
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
              {c.format === 'compact' ? formatNum(c.value) : c.value.toLocaleString('id-ID')}
            </p>
          )}
        </Card>
      ))}
    </div>
  );
}

/* ─── Cycle Time Card ─── */

interface CycleTimeCardProps {
  data?: NewsroomAnalyticsResponse['cycleTime'];
  loading: boolean;
}

function CycleTimeCard({ data, loading }: CycleTimeCardProps) {
  return (
    <Card padded>
      <div className="mb-4">
        <h3 className="text-sm font-bold text-text flex items-center gap-2">
          <span>⏱️</span>
          <span>Cycle Time (Draft → Publish)</span>
        </h3>
        <p className="text-xs text-text-muted mt-0.5">
          {loading ? '...' : `Berdasar ${data?.samples || 0} artikel published`}
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-8 rounded bg-surface-muted animate-pulse"
            />
          ))}
        </div>
      ) : !data || data.samples === 0 ? (
        <div className="py-8 text-center text-sm text-text-subtle">
          Belum ada artikel published
        </div>
      ) : (
        <div className="space-y-3 text-sm">
          <Metric label="Rata-rata" value={formatHours(data.avg_hours)} emoji="⏱" tone="info" />
          <Metric label="Median" value={formatHours(data.median_hours)} emoji="📊" tone="info" />
          <Metric label="90th percentile" value={formatHours(data.p90_hours)} emoji="🐢" tone="warning" />
          <div className="pt-2 mt-2 border-t border-border flex justify-between text-xs text-text-muted">
            <span>Tercepat: {formatHours(data.fastest_hours)}</span>
            <span>Terlama: {formatHours(data.slowest_hours)}</span>
          </div>
        </div>
      )}
    </Card>
  );
}

/* ─── Status Breakdown (mini donut) ─── */

interface StatusBreakdownProps {
  data: { status: string; count: number }[];
  loading: boolean;
}

function StatusBreakdown({ data, loading }: StatusBreakdownProps) {
  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <Card padded>
      <div className="mb-4">
        <h3 className="text-sm font-bold text-text flex items-center gap-2">
          <span>📊</span>
          <span>Status Breakdown</span>
        </h3>
        <p className="text-xs text-text-muted mt-0.5">
          {loading ? '...' : `${total} total artikel`}
        </p>
      </div>

      {loading ? (
        <div className="h-[180px] rounded bg-surface-muted animate-pulse" />
      ) : total === 0 ? (
        <div className="h-[180px] flex items-center justify-center text-sm text-text-subtle">
          Belum ada data
        </div>
      ) : (
        <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
          <div className="h-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={60}
                  paddingAngle={2}
                  stroke="var(--color-surface)"
                  strokeWidth={1}
                >
                  {data.map((d, idx) => (
                    <Cell
                      key={idx}
                      fill={STATUS_COLORS[d.status] || '#6B7280'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-surface-elevated)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                    color: 'var(--color-text)',
                  }}
                  formatter={(value: any, _n: any, p: any) => [
                    `${value} artikel`,
                    STATUS_LABELS[p?.payload?.status] || p?.payload?.status,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <ul className="space-y-1.5 text-xs">
            {data.map((d) => {
              const pct = ((d.count / total) * 100).toFixed(1);
              return (
                <li key={d.status} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-sm shrink-0"
                      style={{ backgroundColor: STATUS_COLORS[d.status] || '#6B7280' }}
                    />
                    <span className="text-text">
                      {STATUS_LABELS[d.status] || d.status}
                    </span>
                  </div>
                  <span className="text-text-muted whitespace-nowrap">
                    {d.count} ({pct}%)
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Card>
  );
}

/* ─── Top Authors List ─── */

interface TopAuthorsListProps {
  data: NewsroomAnalyticsResponse['topAuthors'];
  loading: boolean;
}

function TopAuthorsList({ data, loading }: TopAuthorsListProps) {
  return (
    <Card padded>
      <div className="mb-4">
        <h3 className="text-sm font-bold text-text flex items-center gap-2">
          <span>🏆</span>
          <span>Top Authors</span>
        </h3>
        <p className="text-xs text-text-muted mt-0.5">
          Ranked by total artikel published
        </p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-10 rounded bg-surface-muted animate-pulse"
            />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="py-8 text-center text-sm text-text-subtle">
          Belum ada data author
        </div>
      ) : (
        <ol className="space-y-1">
          {data.slice(0, 10).map((a, idx) => (
            <li
              key={a.author_id}
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
                <p className="text-sm font-semibold text-text truncate">
                  {a.name}
                </p>
                <p className="text-[11px] text-text-muted">
                  {a.articles} artikel · {formatNum(a.total_views)} views · {formatNum(a.total_shares)} shares
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

/* ─── Helper: Metric row ─── */

interface MetricProps {
  label: string;
  value: string;
  emoji: string;
  tone?: 'info' | 'warning' | 'default';
}

function Metric({ label, value, emoji, tone = 'default' }: MetricProps) {
  const toneClass: Record<NonNullable<MetricProps['tone']>, string> = {
    default: 'text-text',
    info:    'text-status-info',
    warning: 'text-status-warning',
  };

  return (
    <div className="flex items-center justify-between">
      <span className="text-text-muted flex items-center gap-2">
        <span className="text-base">{emoji}</span>
        <span>{label}</span>
      </span>
      <span className={`font-bold ${toneClass[tone]}`}>{value}</span>
    </div>
  );
}
