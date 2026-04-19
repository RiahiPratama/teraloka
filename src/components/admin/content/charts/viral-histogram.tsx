'use client';

/**
 * TeraLoka — Viral Distribution Histogram
 * Phase 2 · Batch 7e4 — Newsroom Analytics
 * ------------------------------------------------------------
 * Bar chart — distribution of viral_score buckets (0-20, 20-40, ...).
 * Helps identify if content is mostly "dud" (low score) or "hit-driven".
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';
import { Card } from '@/components/ui/card';
import type { ViralBucket } from '@/types/newsroom-analytics';

interface ViralHistogramProps {
  data: ViralBucket[];
  loading?: boolean;
}

// Gradient: low score = muted, high score = vivid brand
const BUCKET_COLORS = [
  '#9CA3AF', // 0-20 gray
  '#60A5FA', // 20-40 blue
  '#34D399', // 40-60 green
  '#FBBF24', // 60-80 amber
  '#F87171', // 80-100 red (hot/viral)
];

export function ViralHistogram({ data, loading = false }: ViralHistogramProps) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const viral = data.find((d) => d.range === '80-100')?.count || 0;
  const viralPct = total > 0 ? ((viral / total) * 100).toFixed(1) : '0';

  return (
    <Card padded>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-text flex items-center gap-2">
            <span>🔥</span>
            <span>Viral Score Distribution</span>
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            {viral} artikel viral ({viralPct}% dari {total} total)
          </p>
        </div>
      </div>

      {loading ? (
        <div className="h-[220px] rounded bg-surface-muted animate-pulse" />
      ) : total === 0 ? (
        <div className="h-[220px] flex items-center justify-center text-sm text-text-subtle">
          Belum ada data viral score
        </div>
      ) : (
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.4} />
              <XAxis
                dataKey="range"
                tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
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
                formatter={(value: any) => [`${value} artikel`, 'Count']}
                labelFormatter={(label) => `Score: ${label}`}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.map((_, idx) => (
                  <Cell key={idx} fill={BUCKET_COLORS[idx] || '#6B7280'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
