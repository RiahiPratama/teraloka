'use client';

/**
 * TeraLoka — DeepDiveView
 * Phase 2 · Batch 7b3 — Reports Deep Dive Analytics
 * ------------------------------------------------------------
 * Analytics panel untuk Deep Dive tab di /admin/reports.
 *
 * Sections (top → bottom):
 * 1. Stats row (4 cards): Total 30d / Per Hari / Urgent / Normal
 * 2. Trend bar chart (30 hari harian) + Top Locations list
 * 3. Category breakdown (horizontal bar) + User Segments + Peak Hour
 * 4. Alert Clusters (hanya tampil kalau ada)
 *
 * Charts: inline SVG/div (no chart library — konsisten dengan dashboard).
 * Colors: pakai status tokens + service color palette cycling.
 *
 * Loading state: skeleton per section.
 * Empty state: "Siap Menganalisis" dengan Muat Data button.
 */

import { cn } from '@/lib/utils';
import { Activity, MapPin, RefreshCw, Siren, TrendingUp, Users as UsersIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  formatPctChange,
  formatPeakHourWindow,
  formatShortDate,
  pctChangeColorClass,
  type DeepDiveResponse,
} from '@/types/reports-deepdive';

export interface DeepDiveViewProps {
  data: DeepDiveResponse | null;
  loading: boolean;
  onRefresh: () => void;
  className?: string;
}

/* ─── Palette untuk category bars (cycling) ─── */

const CATEGORY_BAR_COLORS = [
  'bg-balapor',
  'bg-bakabar',
  'bg-bakos',
  'bg-badonasi',
  'bg-bapasiar',
  'bg-properti',
  'bg-kendaraan',
] as const;

export function DeepDiveView({
  data,
  loading,
  onRefresh,
  className,
}: DeepDiveViewProps) {
  /* ── Header (always visible) ── */
  const header = (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="min-w-0">
        <h2 className="text-lg font-extrabold text-text flex items-center gap-2">
          <Activity size={18} className="text-balapor" />
          Deep Dive Analytics
        </h2>
        <p className="text-[12px] text-text-muted mt-0.5">
          Data laporan 30 hari terakhir, dibandingkan dengan 30-60 hari sebelumnya.
        </p>
      </div>
      <Button
        variant="secondary"
        size="sm"
        onClick={onRefresh}
        disabled={loading}
        leftIcon={<RefreshCw size={12} className={cn(loading && 'animate-spin')} />}
      >
        {loading ? 'Memuat...' : 'Refresh'}
      </Button>
    </div>
  );

  /* ── Empty state (data belum di-fetch) ── */
  if (!loading && !data) {
    return (
      <div className={cn('space-y-5', className)}>
        {header}
        <EmptyState
          icon={<Activity size={32} />}
          title="Siap Menganalisis"
          description="Klik Refresh untuk memuat data analytics 30 hari."
          variant="default"
          tone="info"
          size="md"
          action={{
            label: 'Muat Data',
            onClick: onRefresh,
          }}
        />
      </div>
    );
  }

  /* ── Loading skeleton ── */
  if (loading && !data) {
    return (
      <div className={cn('space-y-5', className)}>
        {header}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 bg-surface-muted rounded-xl animate-pulse"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
          <div className="h-48 bg-surface-muted rounded-xl animate-pulse" />
          <div className="h-48 bg-surface-muted rounded-xl animate-pulse" />
        </div>
        <div className="h-56 bg-surface-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!data) return null;

  const categoryMax = Math.max(1, ...data.categories.map((c) => c.count));
  const hourMax = Math.max(1, ...data.peak_hours.map((h) => h.count));
  const trendMax = Math.max(1, ...data.trend.map((t) => t.count));

  return (
    <div className={cn('space-y-5', className)}>
      {header}

      {/* ── 1. Stats row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Laporan 30 Hari"
          value={data.stats.total_30days}
          sub={
            data.stats.pct_change !== null
              ? `${formatPctChange(data.stats.pct_change)} vs periode lalu`
              : 'Baseline bulan ini'
          }
          subClass={pctChangeColorClass(data.stats.pct_change)}
          accent="text-balapor"
        />
        <StatCard
          label="Rata-rata per Hari"
          value={data.stats.per_day}
          sub="Semua status"
          isDecimal
        />
        <StatCard
          label="Urgent"
          value={data.stats.urgent}
          sub={`${data.stats.high} High`}
          subClass="text-status-warning font-semibold"
          accent="text-status-critical"
        />
        <StatCard
          label="Normal"
          value={data.stats.normal}
          sub="Prioritas rendah"
          accent="text-status-healthy"
        />
      </div>

      {/* ── 2. Trend bar chart + Top Locations ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
        {/* Trend chart */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={14} className="text-balapor" />
            <h3 className="text-sm font-bold text-text">Tren Laporan 30 Hari</h3>
          </div>

          {/* Chart bars */}
          <div className="flex items-end gap-[2px] h-24">
            {data.trend.map((d, i) => {
              const heightPct = (d.count / trendMax) * 100;
              const isToday = i === data.trend.length - 1;
              return (
                <div
                  key={d.date}
                  className={cn(
                    'flex-1 rounded-t transition-all duration-300',
                    'min-h-[4px]',
                    isToday
                      ? 'bg-balapor'
                      : d.count > 0
                        ? 'bg-balapor/35 hover:bg-balapor/60'
                        : 'bg-surface-muted'
                  )}
                  style={{ height: `${Math.max(5, heightPct)}%` }}
                  title={`${formatShortDate(d.date)}: ${d.count} laporan`}
                />
              );
            })}
          </div>

          {/* X-axis labels (cuma beberapa tanggal penting) */}
          <div className="flex justify-between mt-2 text-[9px] text-text-muted tabular-nums">
            <span>{formatShortDate(data.trend[0]?.date ?? '')}</span>
            <span>
              {formatShortDate(data.trend[Math.floor(data.trend.length / 2)]?.date ?? '')}
            </span>
            <span className="font-semibold text-balapor">Hari ini</span>
          </div>

          {/* Summary */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
            <span className="text-[11px] text-text-muted">
              Total 30 hari:{' '}
              <span className="font-extrabold text-text tabular-nums">
                {data.stats.total_30days.toLocaleString('id-ID')}
              </span>
            </span>
            <span className="text-[11px] text-text-muted">
              Puncak:{' '}
              <span className="font-extrabold text-text tabular-nums">
                {trendMax}
              </span>
              /hari
            </span>
          </div>
        </div>

        {/* Top Locations */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <MapPin size={14} className="text-balapor" />
            <h3 className="text-sm font-bold text-text">Top Locations</h3>
          </div>

          {data.top_locations.length === 0 ? (
            <p className="text-xs text-text-muted">Belum ada data lokasi.</p>
          ) : (
            <div className="space-y-3">
              {data.top_locations.map((loc, i) => (
                <div key={loc.location} className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      'flex items-center justify-center shrink-0',
                      'h-5 w-5 rounded-full',
                      'text-[9px] font-extrabold text-white',
                      i === 0
                        ? 'bg-status-critical'
                        : i === 1
                          ? 'bg-status-warning'
                          : 'bg-status-healthy'
                    )}
                    aria-label={`Rank ${i + 1}`}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold text-text truncate">
                      {loc.location}
                    </div>
                    {loc.pct_change !== null && (
                      <div
                        className={cn(
                          'text-[10px] font-semibold',
                          pctChangeColorClass(loc.pct_change)
                        )}
                      >
                        {formatPctChange(loc.pct_change)} vs bulan lalu
                      </div>
                    )}
                  </div>
                  <span className="shrink-0 text-[12px] font-extrabold text-text tabular-nums">
                    {loc.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 3. Categories + User Segments + Peak Hour ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_220px_220px] gap-5">
        {/* Categories horizontal bar chart */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <h3 className="text-sm font-bold text-text mb-4">Kategori Laporan</h3>

          {data.categories.length === 0 ? (
            <p className="text-xs text-text-muted">Belum ada kategori.</p>
          ) : (
            <div className="space-y-3">
              {data.categories.slice(0, 7).map((c, i) => {
                const widthPct = Math.max(4, (c.count / categoryMax) * 100);
                const barColor = CATEGORY_BAR_COLORS[i % CATEGORY_BAR_COLORS.length];
                return (
                  <div key={c.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] font-semibold text-text capitalize truncate">
                        {c.name}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className="text-[12px] font-extrabold text-text tabular-nums">
                          {c.count}
                        </span>
                        {c.pct_change !== null && (
                          <span
                            className={cn(
                              'text-[10px] font-semibold tabular-nums',
                              pctChangeColorClass(c.pct_change)
                            )}
                          >
                            {formatPctChange(c.pct_change)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-500',
                          barColor
                        )}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* User Segments */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <UsersIcon size={14} className="text-balapor" />
            <h3 className="text-sm font-bold text-text">User Segments</h3>
          </div>

          <div className="text-center mb-4 pb-3 border-b border-border">
            <div className="text-2xl font-extrabold text-text tabular-nums">
              {(data.user_segments.total ?? 0).toLocaleString('id-ID')}
            </div>
            <div className="text-[10px] text-text-muted mt-1">
              Total Pelapor
            </div>
          </div>

          <div className="space-y-2.5">
            {[
              {
                label: 'Baru (7 hari)',
                value: data.user_segments.newly_registered ?? 0,
                color: 'bg-brand-teal',
              },
              {
                label: 'Pelapor Aktif',
                value: data.user_segments.trusted_user ?? 0,
                color: 'bg-balapor',
              },
              {
                label: 'Tanpa Akun',
                value: data.user_segments.other ?? 0,
                color: 'bg-text-subtle',
              },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn('h-2 w-2 rounded-full', s.color)} />
                  <span className="text-[11px] text-text-muted">{s.label}</span>
                </div>
                <span className="text-[12px] font-bold text-text tabular-nums">
                  {s.value.toLocaleString('id-ID')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Peak Hour */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <h3 className="text-sm font-bold text-text mb-2">Peak Hour</h3>
          <div className="text-lg font-extrabold text-balapor mb-3 tabular-nums">
            {formatPeakHourWindow(data.peak_hour)}
          </div>

          {/* Hour bars (0-23) */}
          <div className="flex items-end gap-[1px] h-14">
            {data.peak_hours.map((h) => {
              const heightPct = (h.count / hourMax) * 100;
              const isInPeakWindow =
                h.hour >= data.peak_hour &&
                h.hour < data.peak_hour + 4;
              return (
                <div
                  key={h.hour}
                  className={cn(
                    'flex-1 rounded-t min-h-[2px] transition-colors',
                    isInPeakWindow
                      ? 'bg-balapor'
                      : h.count > 0
                        ? 'bg-balapor/30'
                        : 'bg-surface-muted'
                  )}
                  style={{ height: `${Math.max(3, heightPct)}%` }}
                  title={`${String(h.hour).padStart(2, '0')}:00 — ${h.count} laporan`}
                />
              );
            })}
          </div>

          {/* Hour axis */}
          <div className="flex justify-between mt-1.5 text-[9px] text-text-muted tabular-nums">
            <span>00</span>
            <span>06</span>
            <span>12</span>
            <span>18</span>
            <span>23</span>
          </div>

          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-[10px] text-text-muted leading-relaxed">
              Jam sibuk — laporan paling banyak masuk di window ini.
            </p>
          </div>
        </div>
      </div>

      {/* ── 4. Alert Clusters (optional) ── */}
      {data.alert_clusters.length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Siren size={14} className="text-status-critical" />
              <h3 className="text-sm font-bold text-text">Alert Clusters</h3>
            </div>
            <span className="text-[11px] text-text-muted">
              Lonjakan &gt; 50% vs bulan lalu
            </span>
          </div>

          <div className="space-y-2">
            {data.alert_clusters.map((a) => (
              <div
                key={a.location}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg',
                  a.priority === 'urgent'
                    ? 'bg-status-critical/5 border border-status-critical/20'
                    : 'bg-status-warning/5 border border-status-warning/20'
                )}
              >
                <span className="text-lg shrink-0" aria-hidden="true">
                  {a.priority === 'urgent' ? '🔴' : '🟠'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-text truncate">
                    {a.location}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div
                    className={cn(
                      'text-[13px] font-extrabold tabular-nums',
                      a.priority === 'urgent'
                        ? 'text-status-critical'
                        : 'text-status-warning'
                    )}
                  >
                    {a.count} laporan
                  </div>
                  {a.pct_change !== null && (
                    <div
                      className={cn(
                        'text-[10px] font-semibold',
                        pctChangeColorClass(a.pct_change)
                      )}
                    >
                      {formatPctChange(a.pct_change)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── StatCard helper component ─── */

interface StatCardProps {
  label: string;
  value: number;
  sub?: string;
  /** Text class untuk sub (pct change color) */
  subClass?: string;
  /** Text class untuk value — default text-text */
  accent?: string;
  /** Pakai toFixed(1) untuk value (e.g. per_day) */
  isDecimal?: boolean;
}

function StatCard({
  label,
  value,
  sub,
  subClass,
  accent = 'text-text',
  isDecimal = false,
}: StatCardProps) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <div className="text-[11px] text-text-muted mb-1.5 font-semibold">
        {label}
      </div>
      <div
        className={cn(
          'text-2xl font-extrabold tabular-nums leading-none tracking-tight',
          accent
        )}
      >
        {isDecimal
          ? value.toFixed(1).replace('.', ',')
          : value.toLocaleString('id-ID')}
      </div>
      {sub && (
        <div
          className={cn(
            'text-[11px] mt-1.5 leading-tight',
            subClass ?? 'text-text-muted'
          )}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
