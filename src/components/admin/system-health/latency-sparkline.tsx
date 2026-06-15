'use client';

/**
 * TeraLoka — Latency Sparkline (System Health · Level 2)
 * ------------------------------------------------------------
 * Mini line chart tren latency per service (recharts, pola dau-chart).
 * - Buang titik latency_ms === null (mis. `self` tak mengukur latency).
 * - Data tipis / semua null → catatan teks, BUKAN chart kosong/pecah.
 * - a11y: animasi off (reduced-motion safe) + aria-label ringkas (min/avg/max).
 */

import { useId, useMemo } from 'react';
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts';
import type { ServiceHistory } from '@/types/health';

interface Props {
  sparkline: ServiceHistory['sparkline'];
  /** Warna garis — CSS var. */
  color?: string;
  height?: number;
}

export function LatencySparkline({
  sparkline,
  color = 'var(--color-brand-teal-light)',
  height = 44,
}: Props) {
  const gradientId = useId();

  const points = useMemo(
    () =>
      sparkline
        .filter((p): p is { checked_at: string; latency_ms: number } => typeof p.latency_ms === 'number')
        .map((p) => ({ t: p.checked_at, ms: p.latency_ms })),
    [sparkline]
  );

  // Butuh ≥2 titik buat garis yang bermakna.
  if (points.length < 2) {
    return (
      <p className="text-[11px] text-text-muted italic">
        {sparkline.length === 0 ? 'Belum ada tren latency.' : 'Latency tak diukur.'}
      </p>
    );
  }

  const values = points.map((p) => p.ms);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);

  return (
    <div
      style={{ width: '100%', height }}
      role="img"
      aria-label={`Tren latency: min ${min} ms, rata-rata ${avg} ms, maks ${max} ms, dari ${points.length} pemeriksaan.`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 4, right: 2, left: 2, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <Area
            type="monotone"
            dataKey="ms"
            stroke={color}
            strokeWidth={1.75}
            fill={`url(#${gradientId})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
