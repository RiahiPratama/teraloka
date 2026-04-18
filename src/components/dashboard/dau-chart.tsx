'use client';

/**
 * TeraLoka — DAUChart
 * Phase 2 · Batch 4c — Domain Components
 * ------------------------------------------------------------
 * Chart Daily Active Users dengan optional event markers.
 * Pakai Recharts 3.x — Area chart dengan gradient fill.
 *
 * Features:
 * - Period toggle (7d / 30d / 90d) — optional
 * - Event markers (ReferenceLine dashed) untuk spike moment
 *   (contoh: "Gempa Halmahera", "Viral Banjir")
 * - Custom tooltip format Indonesia
 * - Empty state saat data kosong (pre-launch reality)
 * - Loading skeleton
 * - Responsive container
 *
 * Phase 1 reality: endpoint `/admin/analytics/dau` BELUM ADA.
 * Default ke empty state dengan message "Data DAU akan tersedia setelah
 * 7 hari data terkumpul" — siap consume data real di Phase 3+.
 *
 * Contoh:
 *   // Empty state (default pre-launch)
 *   <DAUChart />
 *
 *   // With data
 *   <DAUChart
 *     data={[
 *       { date: '2026-04-01', value: 120 },
 *       { date: '2026-04-02', value: 145 },
 *       ...
 *     ]}
 *     events={[
 *       { date: '2026-04-10', label: 'Gempa Halmahera', tone: 'critical' },
 *     ]}
 *     period="30d"
 *     onPeriodChange={setPeriod}
 *   />
 */

import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

export interface DAUPoint {
  /** ISO date string YYYY-MM-DD */
  date: string;
  value: number;
}

export interface DAUEvent {
  date: string;
  label: string;
  tone?: 'info' | 'warning' | 'critical';
}

export type DAUPeriod = '7d' | '30d' | '90d';

export interface DAUChartProps {
  data?: DAUPoint[];
  events?: DAUEvent[];
  period?: DAUPeriod;
  onPeriodChange?: (period: DAUPeriod) => void;
  title?: string;
  subtitle?: string;
  loading?: boolean;
  /** Warna garis utama — default brand-teal */
  color?: string;
  /** Tinggi chart (px) */
  height?: number;
  className?: string;
}

const EVENT_COLOR: Record<NonNullable<DAUEvent['tone']>, string> = {
  info: '#3B82F6',
  warning: '#F59E0B',
  critical: '#EF4444',
};

const PERIODS: { value: DAUPeriod; label: string }[] = [
  { value: '7d', label: '7H' },
  { value: '30d', label: '30H' },
  { value: '90d', label: '90H' },
];

/* ─── Format helpers ─── */

function formatDate(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return isoDate;
  }
}

function formatFullDate(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    return d.toLocaleDateString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return isoDate;
  }
}

/* ─── Custom tooltip ─── */

interface TooltipPayload {
  value?: number;
  payload?: DAUPoint;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  return (
    <div className="rounded-lg bg-surface border border-border shadow-lg px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-text-muted mb-0.5">
        {formatFullDate(point.date)}
      </div>
      <div className="text-sm font-bold text-text tabular-nums">
        {point.value.toLocaleString('id-ID')}
        <span className="ml-1 text-xs font-medium text-text-muted">
          active users
        </span>
      </div>
    </div>
  );
}

/* ─── Period toggle ─── */

function PeriodToggle({
  value,
  onChange,
}: {
  value: DAUPeriod;
  onChange: (v: DAUPeriod) => void;
}) {
  return (
    <div className="inline-flex items-center p-0.5 rounded-lg bg-surface-muted">
      {PERIODS.map((p) => (
        <button
          key={p.value}
          type="button"
          onClick={() => onChange(p.value)}
          className={cn(
            'px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors',
            value === p.value
              ? 'bg-surface text-text shadow-sm'
              : 'text-text-muted hover:text-text'
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

/* ─── Main component ─── */

export function DAUChart({
  data,
  events = [],
  period = '30d',
  onPeriodChange,
  title = 'Daily Active Users',
  subtitle,
  loading = false,
  color = 'var(--color-brand-teal-light)',
  height = 220,
  className,
}: DAUChartProps) {
  const hasData = Boolean(data && data.length > 0);

  // Gradient ID unique per instance
  const gradientId = useMemo(
    () => `dau-gradient-${Math.random().toString(36).slice(2, 9)}`,
    []
  );

  // Compute nice Y-axis max (round up to nearest "nice" number)
  const yMax = useMemo(() => {
    if (!data || data.length === 0) return 100;
    const max = Math.max(...data.map((d) => d.value));
    if (max <= 10) return 10;
    const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
    return Math.ceil(max / magnitude) * magnitude;
  }, [data]);

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="flex-row items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Activity size={16} className="text-analytics shrink-0" />
          <div className="min-w-0">
            <CardTitle className="text-sm">{title}</CardTitle>
            {subtitle && (
              <p className="text-[11px] text-text-muted mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        {onPeriodChange && hasData && (
          <PeriodToggle value={period} onChange={onPeriodChange} />
        )}
      </CardHeader>

      <CardContent className="p-0 flex-1">
        {loading ? (
          <div
            className="w-full rounded-lg bg-surface-muted animate-pulse"
            style={{ height }}
          />
        ) : !hasData ? (
          <EmptyState
            icon={<Activity size={24} />}
            title="Data DAU belum tersedia"
            description="Chart akan aktif setelah user aktif 7 hari berturut-turut."
            helper="Estimasi: Setelah launch"
            variant="muted"
            tone="info"
            size="sm"
          />
        ) : (
          <div style={{ width: '100%', height }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ top: 8, right: 8, left: -12, bottom: 4 }}
              >
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.02} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                  vertical={false}
                />

                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{
                    fontSize: 10,
                    fill: 'var(--color-text-muted)',
                  }}
                  axisLine={{ stroke: 'var(--color-border)' }}
                  tickLine={{ stroke: 'var(--color-border)' }}
                  minTickGap={30}
                />

                <YAxis
                  domain={[0, yMax]}
                  tick={{
                    fontSize: 10,
                    fill: 'var(--color-text-muted)',
                  }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />

                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{
                    stroke: 'var(--color-border)',
                    strokeDasharray: '3 3',
                  }}
                />

                {/* Event reference lines */}
                {events.map((ev) => (
                  <ReferenceLine
                    key={`${ev.date}-${ev.label}`}
                    x={ev.date}
                    stroke={EVENT_COLOR[ev.tone ?? 'info']}
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: ev.label,
                      position: 'top',
                      fontSize: 10,
                      fill: EVENT_COLOR[ev.tone ?? 'info'],
                    }}
                  />
                ))}

                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={color}
                  strokeWidth={2}
                  fill={`url(#${gradientId})`}
                  dot={false}
                  activeDot={{
                    r: 4,
                    stroke: color,
                    strokeWidth: 2,
                    fill: 'var(--color-surface)',
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
