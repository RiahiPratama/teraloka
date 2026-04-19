'use client';

/**
 * TeraLoka — Pageviews Chart
 * Phase 2 · Batch 7e5 — Distribution Metrics
 * ------------------------------------------------------------
 * Dual-line chart: pageviews + unique users over time.
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { formatDateShort } from '@/types/newsroom-analytics';
import type { PageviewPoint } from '@/types/distribution-metrics';

interface PageviewsChartProps {
  data: PageviewPoint[];
  loading?: boolean;
}

export function PageviewsChart({ data, loading = false }: PageviewsChartProps) {
  // Normalize data — ensure numbers
  const chartData = data.map((d) => ({
    date: d.date,
    pageviews: Number(d.pageviews) || 0,
    unique_users: Number(d.unique_users) || 0,
  }));

  const tickInterval = Math.max(1, Math.floor(chartData.length / 10));
  const totalPageviews = chartData.reduce((s, d) => s + d.pageviews, 0);
  const peakUsers = chartData.reduce(
    (m, d) => (d.unique_users > m ? d.unique_users : m),
    0
  );

  return (
    <Card padded>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-text flex items-center gap-2">
            <span>👁</span>
            <span>Pageviews Over Time</span>
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Artikel BAKABAR — daily pageviews + unique users
          </p>
        </div>
        <div className="flex gap-3 text-xs">
          <div className="text-right">
            <p className="text-text-subtle">Total Views</p>
            <p className="font-bold text-text">{totalPageviews.toLocaleString('id-ID')}</p>
          </div>
          <div className="text-right">
            <p className="text-text-subtle">Peak Users</p>
            <p className="font-bold text-brand-teal">{peakUsers}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-[240px] rounded bg-surface-muted animate-pulse" />
      ) : chartData.length === 0 || totalPageviews === 0 ? (
        <div className="h-[240px] flex flex-col items-center justify-center text-center gap-1">
          <span className="text-3xl mb-1">📊</span>
          <p className="text-sm font-semibold text-text-muted">
            Belum ada pageviews pada BAKABAR
          </p>
          <p className="text-xs text-text-subtle max-w-[260px]">
            Line chart akan muncul setelah pengunjung mulai baca artikel
          </p>
        </div>
      ) : (
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-border)"
                opacity={0.4}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                tickFormatter={formatDateShort}
                interval={tickInterval}
                axisLine={{ stroke: 'var(--color-border)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                allowDecimals={false}
                axisLine={{ stroke: 'var(--color-border)' }}
                tickLine={false}
                width={30}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-surface-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '0.5rem',
                  fontSize: '12px',
                  color: 'var(--color-text)',
                }}
                labelFormatter={(label) => formatDateShort(String(label))}
              />
              <Legend
                wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }}
                iconType="circle"
              />
              <Line
                type="monotone"
                dataKey="pageviews"
                name="Pageviews"
                stroke="#1B6B4A"
                strokeWidth={2}
                dot={{ r: 2, fill: '#1B6B4A' }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="unique_users"
                name="Unique Users"
                stroke="#0891B2"
                strokeWidth={2}
                dot={{ r: 2, fill: '#0891B2' }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
