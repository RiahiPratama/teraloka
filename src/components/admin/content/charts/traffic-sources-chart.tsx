'use client';

/**
 * TeraLoka — Traffic Sources Chart
 * Phase 2 · Batch 7e5 — Distribution Metrics
 * ------------------------------------------------------------
 * Donut chart showing traffic source distribution:
 * Direct, Google, social media, etc.
 */

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Card } from '@/components/ui/card';
import {
  SOURCE_COLORS,
  getSourceLabel,
  type TrafficSource,
} from '@/types/distribution-metrics';

interface TrafficSourcesChartProps {
  data: TrafficSource[];
  loading?: boolean;
}

export function TrafficSourcesChart({
  data,
  loading = false,
}: TrafficSourcesChartProps) {
  // Normalize labels + consolidate
  const consolidated: Record<string, number> = {};
  for (const d of data) {
    const label = getSourceLabel(d.source);
    consolidated[label] = (consolidated[label] || 0) + Number(d.count || 0);
  }

  const chartData = Object.entries(consolidated)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const total = chartData.reduce((s, d) => s + d.count, 0);

  return (
    <Card padded>
      <div className="mb-4">
        <h3 className="text-sm font-bold text-text flex items-center gap-2">
          <span>🌐</span>
          <span>Traffic Sources</span>
        </h3>
        <p className="text-xs text-text-muted mt-0.5">
          {total} pageviews · darimana pengunjung datang
        </p>
      </div>

      {loading ? (
        <div className="h-[220px] rounded bg-surface-muted animate-pulse" />
      ) : chartData.length === 0 ? (
        <div className="h-[220px] flex flex-col items-center justify-center text-center gap-1">
          <span className="text-3xl mb-1">🌍</span>
          <p className="text-sm font-semibold text-text-muted">
            Belum ada traffic data
          </p>
          <p className="text-xs text-text-subtle max-w-[240px]">
            Source breakdown akan muncul setelah pengunjung datang (post-launch)
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={65}
                  paddingAngle={2}
                  stroke="var(--color-surface)"
                  strokeWidth={1}
                >
                  {chartData.map((_, idx) => (
                    <Cell
                      key={idx}
                      fill={SOURCE_COLORS[idx % SOURCE_COLORS.length]}
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
                    `${value} views (${((Number(value) / total) * 100).toFixed(1)}%)`,
                    p?.payload?.name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <ul className="space-y-1.5 text-xs max-h-[160px] overflow-y-auto pr-1">
            {chartData.map((d, idx) => {
              const pct = total > 0 ? ((d.count / total) * 100).toFixed(1) : '0';
              return (
                <li key={d.name} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-3 h-3 rounded-sm shrink-0"
                      style={{
                        backgroundColor:
                          SOURCE_COLORS[idx % SOURCE_COLORS.length],
                      }}
                    />
                    <span className="text-text truncate">{d.name}</span>
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
