'use client';

/**
 * TeraLoka — Share Platform Chart
 * Phase 2 · Batch 7e5 — Distribution Metrics
 * ------------------------------------------------------------
 * Horizontal bar chart dengan custom colors per platform.
 * Menampilkan platform mana yang paling banyak share artikel.
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card } from '@/components/ui/card';
import {
  PLATFORM_COLORS,
  getPlatformLabel,
  type SharePlatform,
} from '@/types/distribution-metrics';

interface SharePlatformChartProps {
  data: SharePlatform[];
  loading?: boolean;
}

export function SharePlatformChart({ data, loading = false }: SharePlatformChartProps) {
  // Normalize + sort
  const chartData = data
    .map((d) => ({
      platform: getPlatformLabel(d.platform),
      count: Number(d.count) || 0,
      color: PLATFORM_COLORS[d.platform.toLowerCase()] || '#9CA3AF',
    }))
    .sort((a, b) => b.count - a.count);

  const total = chartData.reduce((s, d) => s + d.count, 0);

  return (
    <Card padded>
      <div className="mb-4">
        <h3 className="text-sm font-bold text-text flex items-center gap-2">
          <span>↗</span>
          <span>Share Platform Breakdown</span>
        </h3>
        <p className="text-xs text-text-muted mt-0.5">
          {total} total shares · distribusi per platform
        </p>
      </div>

      {loading ? (
        <div className="h-[220px] rounded bg-surface-muted animate-pulse" />
      ) : chartData.length === 0 ? (
        <EmptyState
          emoji="📤"
          title="Belum ada share data"
          message="Data akan muncul setelah user mulai share artikel (post-launch)"
        />
      ) : (
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
            >
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="platform"
                tick={{ fontSize: 11, fill: 'var(--color-text)' }}
                axisLine={false}
                tickLine={false}
                width={100}
              />
              <Tooltip
                cursor={{ fill: 'var(--color-surface-muted)' }}
                contentStyle={{
                  backgroundColor: 'var(--color-surface-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '0.5rem',
                  fontSize: '12px',
                  color: 'var(--color-text)',
                }}
                formatter={(value: any) => [`${value} shares`, 'Count']}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {chartData.map((d, idx) => (
                  <Cell key={idx} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

/* ─── Empty state ─── */

interface EmptyStateProps {
  emoji: string;
  title: string;
  message: string;
}

function EmptyState({ emoji, title, message }: EmptyStateProps) {
  return (
    <div className="h-[220px] flex flex-col items-center justify-center text-center gap-1">
      <span className="text-3xl mb-1">{emoji}</span>
      <p className="text-sm font-semibold text-text-muted">{title}</p>
      <p className="text-xs text-text-subtle max-w-[240px]">{message}</p>
    </div>
  );
}
