'use client';

/**
 * TeraLoka — Category Pie Chart
 * Phase 2 · Batch 7e4 — Newsroom Analytics
 * ------------------------------------------------------------
 * Donut chart untuk category distribution.
 * Shows top N categories, rest grouped sebagai "Others".
 *
 * Legend: list dengan color swatch + count + %.
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
  CATEGORY_COLORS,
  type CategoryCount,
} from '@/types/newsroom-analytics';

interface CategoryPieProps {
  data: CategoryCount[];
  loading?: boolean;
  /** Top N show individually, rest = "Others" */
  topN?: number;
}

export function CategoryPie({ data, loading = false, topN = 8 }: CategoryPieProps) {
  // Collapse after topN into "Others"
  const displayData = (() => {
    if (data.length <= topN) return data;
    const top = data.slice(0, topN);
    const restCount = data.slice(topN).reduce((s, d) => s + d.count, 0);
    if (restCount > 0) {
      return [...top, { name: 'Lainnya', count: restCount }];
    }
    return top;
  })();

  const total = displayData.reduce((s, d) => s + d.count, 0);

  return (
    <Card padded>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-text flex items-center gap-2">
            <span>🗂️</span>
            <span>Distribusi Kategori</span>
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            {total} artikel dalam {displayData.length} kategori
          </p>
        </div>
      </div>

      {loading ? (
        <div className="h-[240px] rounded bg-surface-muted animate-pulse" />
      ) : data.length === 0 ? (
        <div className="h-[240px] flex items-center justify-center text-sm text-text-subtle">
          Belum ada data kategori
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-4 items-center">
          {/* Pie */}
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={displayData}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={75}
                  paddingAngle={2}
                  stroke="var(--color-surface)"
                  strokeWidth={1}
                >
                  {displayData.map((_, idx) => (
                    <Cell
                      key={idx}
                      fill={CATEGORY_COLORS[idx % CATEGORY_COLORS.length]}
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
                    `${value} artikel (${((Number(value) / total) * 100).toFixed(1)}%)`,
                    p?.payload?.name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <ul className="space-y-1.5 text-xs max-h-[180px] overflow-y-auto pr-2">
            {displayData.map((d, idx) => {
              const pct = ((d.count / total) * 100).toFixed(1);
              return (
                <li
                  key={d.name}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-3 h-3 rounded-sm shrink-0"
                      style={{
                        backgroundColor:
                          CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
                      }}
                    />
                    <span className="text-text truncate">{d.name}</span>
                  </div>
                  <span className="text-text-muted shrink-0 whitespace-nowrap">
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
