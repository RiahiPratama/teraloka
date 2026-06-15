'use client';

/**
 * TeraLoka — System Health · Level 2 (Riwayat historis)
 * ------------------------------------------------------------
 * Section DI BAWAH kartu real-time Level 1. Konsumsi LANGSUNG
 * GET /admin/health/history?days=1..30 (Bearer JWT super_admin via useApi —
 * BUKAN proxy HEALTH_SECRET; itu khusus /health/deep).
 *
 * Per service: uptime % + status-history bar (3 state) + sparkline latency.
 * Incident log gabungan di bawah. 🛡️ Data historis masih tipis → graceful:
 * uptime null → "—", chart kosong → catatan, no crash.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { History, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ApiError, useApi } from '@/lib/api/client';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import {
  SERVICE_META,
  GROUPS,
  TONE_TEXT,
  uptimeTone,
} from '@/components/admin/system-health/shared';
import { StatusHistoryBar } from '@/components/admin/system-health/status-history-bar';
import { LatencySparkline } from '@/components/admin/system-health/latency-sparkline';
import { IncidentLog } from '@/components/admin/system-health/incident-log';
import type {
  HealthRange,
  HealthHistorySummary,
  HealthServiceKey,
  ServiceHistory,
} from '@/types/health';

const RANGES: { value: HealthRange; label: string; days: number }[] = [
  { value: '24h', label: '24 jam', days: 1 },
  { value: '7d', label: '7 hari', days: 7 },
  { value: '30d', label: '30 hari', days: 30 },
];

/* ─── Range toggle (pola dau-chart) ─── */
function RangeToggle({
  value,
  onChange,
  disabled,
}: {
  value: HealthRange;
  onChange: (v: HealthRange) => void;
  disabled?: boolean;
}) {
  return (
    <div className="inline-flex items-center p-0.5 rounded-lg bg-surface-muted">
      {RANGES.map((r) => (
        <button
          key={r.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(r.value)}
          className={cn(
            'px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors motion-reduce:transition-none',
            value === r.value
              ? 'bg-surface text-text shadow-sm'
              : 'text-text-muted hover:text-text',
            disabled && 'opacity-60 cursor-not-allowed'
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

/* ─── Legend 3-state (a11y: warna + teks) ─── */
function Legend() {
  const items: { cls: string; label: string }[] = [
    { cls: 'bg-status-healthy', label: 'Operational' },
    { cls: 'bg-status-critical', label: 'Down' },
    { cls: 'bg-text-muted/25', label: 'Tidak ada data' },
  ];
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1.5 text-[11px] text-text-muted">
          <span className={cn('h-2.5 w-2.5 rounded-[2px]', it.cls)} aria-hidden="true" />
          {it.label}
        </span>
      ))}
    </div>
  );
}

/* ─── Kartu historis per service ─── */
function ServiceHistoryCard({
  svcKey,
  history,
  windowDays,
  now,
}: {
  svcKey: HealthServiceKey;
  history: ServiceHistory;
  windowDays: number;
  now: number;
}) {
  const meta = SERVICE_META[svcKey];
  const tone = uptimeTone(history.uptime_pct);
  const hasData = history.samples > 0;

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="grid place-items-center h-8 w-8 rounded-lg bg-surface-muted text-text-secondary shrink-0">
            <meta.Icon size={16} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-text leading-tight">{meta.label}</p>
            <p className="text-[11px] text-text-muted">{meta.desc}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className={cn('text-xl font-extrabold tabular-nums leading-none', TONE_TEXT[tone])}>
            {history.uptime_pct === null ? '—' : `${history.uptime_pct}%`}
          </div>
          <div className="text-[10px] text-text-muted mt-1">
            {hasData ? `uptime · ${history.samples} cek` : 'uptime'}
          </div>
        </div>
      </div>

      {!hasData ? (
        <p className="text-[11px] text-text-muted italic">
          Belum ada data historis. Snapshot berjalan tiap ~15 menit.
        </p>
      ) : (
        <>
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
              Status
            </span>
            <StatusHistoryBar history={history} windowDays={windowDays} now={now} />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
              Latency
            </span>
            <LatencySparkline sparkline={history.sparkline} />
          </div>
        </>
      )}
    </Card>
  );
}

/* ─── Section ─── */
export function HealthHistorySection() {
  const { token } = useAuth();
  const api = useApi();
  const [range, setRange] = useState<HealthRange>('7d');
  const [data, setData] = useState<HealthHistorySummary | null>(null);
  const [windowEnd, setWindowEnd] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const days = RANGES.find((r) => r.value === range)?.days ?? 7;

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.get<HealthHistorySummary>('/admin/health/history', {
        params: { days },
      });
      setData(res);
      setWindowEnd(Date.now()); // akhir window = waktu fetch (callback → pure di render)
      setErr(null);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Gagal memuat riwayat.');
    } finally {
      setLoading(false);
    }
  }, [api, token, days]);

  useEffect(() => {
    load();
  }, [load]);

  const totalSamples = useMemo(
    () =>
      data
        ? (Object.keys(data.services) as HealthServiceKey[]).reduce(
            (sum, k) => sum + data.services[k].samples,
            0
          )
        : 0,
    [data]
  );

  return (
    <section className="space-y-3 pt-2">
      {/* Header + toggle */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-[12px] font-bold uppercase tracking-wide text-text-secondary flex items-center gap-2">
          <History size={14} className="text-text-muted" />
          Riwayat
          <span className="font-medium normal-case text-text-muted">· uptime & insiden</span>
        </h2>
        <RangeToggle value={range} onChange={setRange} disabled={loading} />
      </div>

      {/* Error */}
      {err && (
        <div className="rounded-xl bg-status-critical/8 border border-status-critical/20 px-4 py-3">
          <p className="text-sm font-semibold text-status-critical">Gagal memuat riwayat</p>
          <p className="text-xs text-text-muted mt-0.5">{err}</p>
        </div>
      )}

      {/* Loading awal */}
      {loading && !data && !err && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-surface-muted animate-pulse motion-reduce:animate-none" />
          ))}
        </div>
      )}

      {/* Empty (semua service belum ada sample) */}
      {data && totalSamples === 0 && !err && (
        <EmptyState
          icon={<BarChart3 size={24} />}
          title="Riwayat belum terkumpul"
          description="Snapshot health ditulis tiap ~15 menit. Data akan terisi seiring waktu — cek lagi nanti."
          variant="muted"
          tone="info"
          size="sm"
        />
      )}

      {/* Konten */}
      {data && totalSamples > 0 && (
        <div className={cn('space-y-4', loading && 'opacity-60')}>
          <Legend />

          {GROUPS.map((g) => (
            <div key={g.title} className="space-y-2">
              <h3 className="text-[11px] font-semibold text-text-muted flex items-center gap-1.5">
                <g.Icon size={12} />
                {g.title}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {g.keys.map((key) => (
                  <ServiceHistoryCard
                    key={key}
                    svcKey={key}
                    history={data.services[key]}
                    windowDays={data.window_days}
                    now={windowEnd}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Incident log */}
          <div className="space-y-2">
            <h3 className="text-[11px] font-semibold text-text-muted">Insiden</h3>
            <IncidentLog services={data.services} />
          </div>
        </div>
      )}
    </section>
  );
}
