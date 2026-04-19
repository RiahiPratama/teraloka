'use client';

/**
 * TeraLoka — Velocity Chart
 * Phase 2 · Batch 7e4 — Newsroom Analytics
 * ------------------------------------------------------------
 * Line chart: publishing velocity per hari.
 * X-axis: date (smart tick density based on period)
 * Y-axis: count of published articles
 *
 * Uses recharts ResponsiveContainer + LineChart.
 * Smart date label formatting:
 * - 30d: show every 3-5 days
 * - 90d: show every 10-14 days (weekly)
 * - 180d: show every 30 days (monthly)
 * - 1y:  show every 30-60 days
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { formatDateShort, type VelocityPoint } from '@/types/newsroom-analytics';

interface VelocityChartProps {
  data: VelocityPoint[];
  loading?: boolean;
}

export function VelocityChart({ data, loading = false }: VelocityChartProps) {
  // Decide tick density based on # of points
  const tickInterval = Math.max(1, Math.floor(data.length / 10));

  // Stats
  const total = data.reduce((s, d) => s + d.count, 0);
  const avg = data.length > 0 ? total / data.length : 0;
  const peak = data.reduce((m, d) => (d.count > m ? d.count : m), 0);

  return (
    <Card padded>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-text flex items-center gap-2">
            <span>📈</span>
            <span>Publishing Velocity</span>
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Artikel terbit per hari
          </p>
        </div>
        <div className="flex gap-3 text-xs">
          <div className="text-right">
            <p className="text-text-subtle">Total</p>
            <p className="font-bold text-text">{total}</p>
          </div>
          <div className="text-right">
            <p className="text-text-subtle">Rata-rata</p>
            <p className="font-bold text-text">{avg.toFixed(1)}/hari</p>
          </div>
          <div className="text-right">
            <p className="text-text-subtle">Peak</p>
            <p className="font-bold text-brand-teal">{peak}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-[240px] rounded bg-surface-muted animate-pulse" />
      ) : data.length === 0 ? (
        <div className="h-[240px] flex items-center justify-center text-sm text-text-subtle">
          Belum ada data velocity
        </div>
      ) : (
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.4} />
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
                width={28}
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
                formatter={(value: any) => [`${value} artikel`, 'Published']}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#1B6B4A"
                strokeWidth={2}
                dot={{ r: 2, fill: '#1B6B4A' }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
