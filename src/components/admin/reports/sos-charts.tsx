'use client';

/**
 * TeraLoka — SOS Charts
 * Bridge Sprint Day 12 Step 7 Batch B2 SMART (10 Mei 2026)
 * ------------------------------------------------------------
 * Charts visualization untuk SOS dashboard:
 *   - Pie chart: SOS by emergency type (today)
 *   - Donut display dengan center total
 *
 * Pattern reference: BADONASI revenue dashboard donut + Wilayah BarChart.
 */

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { AdminSosStats } from '@/types/sos-admin';
import { EMERGENCY_TYPE_OPTIONS } from '@/types/sos';

interface SosChartsProps {
  stats: AdminSosStats;
}

// Map emergency type ke color hex (untuk Recharts)
const TYPE_COLOR_MAP: Record<string, string> = {
  maritime: '#0891B2',
  fire: '#EF4444',
  medical: '#EC4899',
  security: '#1E293B',
  natural: '#0D9488',
  other: '#F59E0B',
};

export function SosCharts({ stats }: SosChartsProps) {
  // Build chart data dari by_type_today
  const chartData = EMERGENCY_TYPE_OPTIONS.map((meta) => ({
    name: meta.label,
    type: meta.type,
    value: stats.by_type_today[meta.type] ?? 0,
    color: TYPE_COLOR_MAP[meta.type] ?? '#94A3B8',
  })).filter((d) => d.value > 0);

  if (chartData.length === 0) {
    return (
      <div
        className="rounded-2xl p-8 flex flex-col items-center justify-center text-center"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          minHeight: 280,
        }}
      >
        <p
          className="text-sm font-bold"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Belum ada SOS hari ini
        </p>
        <p
          className="text-xs mt-1"
          style={{ color: 'var(--color-text-subtle)' }}
        >
          Chart akan muncul saat ada panggilan masuk
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      <h3
        className="text-xs font-bold uppercase tracking-wider mb-3"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Distribusi SOS Hari Ini
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Donut Chart */}
        <div className="relative" style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
                stroke="var(--color-surface)"
                strokeWidth={2}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'var(--color-surface-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: 'var(--color-text)' }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p
              className="text-3xl font-extrabold leading-none"
              style={{ color: 'var(--color-text)' }}
            >
              {stats.total_today}
            </p>
            <p
              className="text-[10px] uppercase tracking-wider font-bold mt-1"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Total Hari Ini
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col justify-center gap-2">
          {chartData.map((entry) => {
            const meta = EMERGENCY_TYPE_OPTIONS.find((m) => m.type === entry.type);
            const percent = ((entry.value / stats.total_today) * 100).toFixed(0);
            return (
              <div key={entry.type} className="flex items-center gap-2">
                <div
                  className={`h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${meta?.gradientFrom ?? ''} ${meta?.gradientTo ?? ''}`}
                >
                  <span
                    className="material-symbols-outlined text-white text-sm"
                    style={{ fontVariationSettings: "'FILL' 1, 'wght' 600" }}
                  >
                    {meta?.iconName ?? 'emergency'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-xs font-bold leading-tight"
                    style={{ color: 'var(--color-text)' }}
                  >
                    {entry.name}
                  </p>
                  <p
                    className="text-[10px]"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {entry.value} kasus · {percent}%
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
