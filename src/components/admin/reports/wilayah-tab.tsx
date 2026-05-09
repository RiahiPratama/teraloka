'use client';

/**
 * TeraLoka — Wilayah Tab (Geographic Analytics)
 * Sub-Sprint 1C-C-12 (9 Mei 2026)
 * ------------------------------------------------------------
 * Tab "Wilayah" untuk admin BALAPOR command center.
 *
 * Sections:
 *   1. Stats banner (4 cards: regions count, mapped, unmapped, regions with reports)
 *   2. Top 5 regions chart (Recharts horizontal bar)
 *   3. Sortable region table (10 kabupaten/kota Maluku Utara)
 *   4. Click row → drill-down modal (kecamatan view)
 *
 * D1=B: Drill-down via modal (kecamatan)
 * D2=A: All 10 region returned (include 0-laporan)
 * D3=C: 3 metrics terpisah (verified_rate, civic_resolution_rate, published_rate)
 *
 * Pattern reference: DeepDiveView (deep-dive tab)
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  MapPin,
  RefreshCw,
  AlertTriangle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { cn } from '@/lib/utils';
import { ApiError, useApi } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { WilayahKecamatanModal } from './wilayah-kecamatan-modal';
import {
  formatRate,
  getRateColorClass,
  getVerifiedTotal,
  type RegionAggregation,
  type RegionStats,
  type RegionSortKey,
  type SortDirection,
} from '@/types/reports-by-region';

interface WilayahTabProps {
  /** Mount/unmount controlled by parent activeTab === 'wilayah' */
  active: boolean;
  /** Refresh nonce dari parent (e.g. global refresh button) */
  nonce: number;
  /** Toast handler dari parent */
  onToast: (message: string, ok: boolean) => void;
}

export function WilayahTab({ active, nonce, onToast }: WilayahTabProps) {
  const api = useApi();

  const [data, setData] = useState<RegionAggregation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sort state
  const [sortKey, setSortKey] = useState<RegionSortKey>('total_reports');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  // Drill-down modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [drillKabupaten, setDrillKabupaten] = useState<{
    id: string;
    name: string;
  } | null>(null);

  /* ── Fetch effect ── */
  useEffect(() => {
    if (!active || !api.token) return;

    const controller = new AbortController();

    setLoading(true);
    setError(null);

    api
      .get<RegionAggregation>('/admin/balapor/by-region', {
        signal: controller.signal,
      })
      .then(setData)
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        const message =
          err instanceof ApiError
            ? err.message
            : 'Gagal memuat data wilayah';
        setError(message);
        onToast(message, false);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [active, api, nonce, onToast]);

  /* ── Sort handler ── */
  const handleSort = useCallback((key: RegionSortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        // Toggle direction
        setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
        return prev;
      }
      // New sort key: default to desc (kecuali nama → asc)
      setSortDir(key === 'name' ? 'asc' : 'desc');
      return key;
    });
  }, []);

  /* ── Drill-down handler ── */
  const handleRowClick = useCallback((stats: RegionStats) => {
    if (stats.total_reports === 0) return; // skip empty regions
    setDrillKabupaten({ id: stats.region_id, name: stats.region_name });
    setModalOpen(true);
  }, []);

  /* ── Sorted rows ── */
  const sortedRegions = useMemo(() => {
    if (!data) return [];
    const arr = [...data.regions];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name':
          cmp = a.region_name.localeCompare(b.region_name);
          break;
        case 'total_reports':
          cmp = a.total_reports - b.total_reports;
          break;
        case 'urgent':
          cmp = a.urgent - b.urgent;
          break;
        case 'verified_rate':
          cmp = a.verified_rate - b.verified_rate;
          break;
        case 'civic_resolution_rate':
          cmp = a.civic_resolution_rate - b.civic_resolution_rate;
          break;
        case 'published_rate':
          cmp = a.published_rate - b.published_rate;
          break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return arr;
  }, [data, sortKey, sortDir]);

  /* ── Top 5 chart data ── */
  const topRegions = useMemo(() => {
    if (!data) return [];
    return [...data.regions]
      .filter((r) => r.total_reports > 0)
      .sort((a, b) => b.total_reports - a.total_reports)
      .slice(0, 5)
      .map((r) => ({
        name: r.region_name,
        total: r.total_reports,
        urgent: r.urgent,
        type: r.region_type,
      }));
  }, [data]);

  if (!active) return null;

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between bg-surface border border-border rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-balapor/12 flex items-center justify-center">
            <MapPin size={18} className="text-balapor" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text">Wilayah</h2>
            <p className="text-xs text-text-muted">
              Distribusi laporan per kabupaten/kota Maluku Utara
            </p>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && !data && (
        <div className="flex items-center justify-center py-12 bg-surface border border-border rounded-xl">
          <RefreshCw size={20} className="text-text-muted animate-spin" />
          <span className="ml-3 text-sm text-text-muted">
            Memuat data wilayah...
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl bg-status-critical/8 border border-status-critical/20 px-4 py-3">
          <AlertTriangle
            size={16}
            className="text-status-critical shrink-0 mt-0.5"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-status-critical">
              Gagal memuat data wilayah
            </p>
            <p className="text-xs text-text-muted mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Content */}
      {data && !loading && !error && (
        <>
          <StatsBanner data={data} />

          {topRegions.length > 0 && <TopRegionsChart rows={topRegions} />}

          <RegionTable
            regions={sortedRegions}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            onRowClick={handleRowClick}
          />

          {data.meta.unmapped_reports_count > 0 && (
            <UnmappedNotice count={data.meta.unmapped_reports_count} />
          )}
        </>
      )}

      {/* Drill-down modal */}
      <WilayahKecamatanModal
        open={modalOpen}
        kabupatenId={drillKabupaten?.id ?? null}
        kabupatenName={drillKabupaten?.name ?? null}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Stats Banner — 4 cards
   ════════════════════════════════════════════════════════════════ */

function StatsBanner({ data }: { data: RegionAggregation }) {
  const totalRegions = data.regions.length;
  const withReports = data.meta.total_regions_with_reports;
  const aggregated = data.meta.total_reports_aggregated;
  const unmapped = data.meta.unmapped_reports_count;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <BannerCard label="Total Wilayah" value={totalRegions} />
      <BannerCard
        label="Aktif"
        value={withReports}
        accent="positive"
        sublabel={`dari ${totalRegions}`}
      />
      <BannerCard label="Total Laporan" value={aggregated} accent="balapor" />
      <BannerCard
        label="Tidak Terpetakan"
        value={unmapped}
        accent={unmapped > 0 ? 'caution' : 'muted'}
        sublabel={unmapped > 0 ? 'level provinsi' : 'semua terpetakan'}
      />
    </div>
  );
}

function BannerCard({
  label,
  value,
  sublabel,
  accent = 'default',
}: {
  label: string;
  value: number;
  sublabel?: string;
  accent?: 'default' | 'balapor' | 'positive' | 'caution' | 'muted';
}) {
  const accentClasses = {
    default: 'text-text',
    balapor: 'text-balapor',
    positive: 'text-status-positive',
    caution: 'text-status-caution',
    muted: 'text-text-muted',
  };

  return (
    <div className="bg-surface border border-border rounded-xl px-4 py-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
        {label}
      </div>
      <div
        className={cn(
          'text-2xl md:text-3xl font-extrabold mt-1 tabular-nums',
          accentClasses[accent],
        )}
      >
        {value}
      </div>
      {sublabel && (
        <div className="text-[11px] text-text-muted mt-0.5">{sublabel}</div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Top 5 Regions Chart — Recharts horizontal bar
   ════════════════════════════════════════════════════════════════ */

interface TopRow {
  name: string;
  total: number;
  urgent: number;
  type: 'kabupaten' | 'kota';
}

function TopRegionsChart({ rows }: { rows: TopRow[] }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-text">Top 5 Wilayah</h3>
        <p className="text-[10px] font-bold uppercase tracking-wide text-text-muted bg-surface-muted px-2 py-1 rounded">
          Berdasarkan jumlah laporan
        </p>
      </div>

      <div className="w-full" style={{ height: rows.length * 48 + 32 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 8, right: 30, left: 8, bottom: 8 }}
          >
            <XAxis
              type="number"
              hide
              domain={[0, 'dataMax']}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={140}
              tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: 'var(--color-surface-muted)', opacity: 0.5 }}
              content={<ChartTooltip />}
            />
            <Bar
              dataKey="total"
              radius={[0, 6, 6, 0]}
              label={{
                position: 'right',
                fill: 'var(--color-text)',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {rows.map((row, i) => (
                <Cell
                  key={i}
                  fill={
                    row.urgent > 0
                      ? 'var(--color-status-critical)'
                      : 'var(--color-balapor)'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload as TopRow;

  return (
    <div className="bg-surface border border-border rounded-lg px-3 py-2 shadow-lg">
      <div className="text-xs font-bold text-text">{data.name}</div>
      <div className="text-[10px] uppercase tracking-wider text-text-muted mt-0.5">
        {data.type}
      </div>
      <div className="mt-1.5 space-y-0.5">
        <div className="text-xs text-text-secondary">
          Total: <span className="font-bold text-text">{data.total}</span>
        </div>
        {data.urgent > 0 && (
          <div className="text-xs text-status-critical font-semibold">
            🔴 {data.urgent} urgent
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Region Table — sortable, click to drill-down
   ════════════════════════════════════════════════════════════════ */

interface RegionTableProps {
  regions: RegionStats[];
  sortKey: RegionSortKey;
  sortDir: SortDirection;
  onSort: (key: RegionSortKey) => void;
  onRowClick: (stats: RegionStats) => void;
}

function RegionTable({
  regions,
  sortKey,
  sortDir,
  onSort,
  onRowClick,
}: RegionTableProps) {
  if (regions.length === 0) {
    return (
      <EmptyState
        icon={<MapPin size={32} className="text-text-muted" />}
        title="Belum ada data wilayah"
        description="Belum ada laporan warga yang ter-mapping ke kabupaten/kota"
      />
    );
  }

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-muted text-[11px] uppercase font-bold text-text-muted">
              <SortableHeader
                label="Wilayah"
                sortKey="name"
                currentKey={sortKey}
                currentDir={sortDir}
                onClick={onSort}
                align="left"
              />
              <SortableHeader
                label="Total"
                sortKey="total_reports"
                currentKey={sortKey}
                currentDir={sortDir}
                onClick={onSort}
                align="right"
              />
              <SortableHeader
                label="Urgent"
                sortKey="urgent"
                currentKey={sortKey}
                currentDir={sortDir}
                onClick={onSort}
                align="right"
              />
              <SortableHeader
                label="Verified %"
                sortKey="verified_rate"
                currentKey={sortKey}
                currentDir={sortDir}
                onClick={onSort}
                align="right"
              />
              <SortableHeader
                label="Civic %"
                sortKey="civic_resolution_rate"
                currentKey={sortKey}
                currentDir={sortDir}
                onClick={onSort}
                align="right"
              />
              <SortableHeader
                label="Published %"
                sortKey="published_rate"
                currentKey={sortKey}
                currentDir={sortDir}
                onClick={onSort}
                align="right"
              />
              <th className="px-3 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {regions.map((stats) => (
              <RegionRow
                key={stats.region_id}
                stats={stats}
                onClick={() => onRowClick(stats)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SortableHeader({
  label,
  sortKey,
  currentKey,
  currentDir,
  onClick,
  align,
}: {
  label: string;
  sortKey: RegionSortKey;
  currentKey: RegionSortKey;
  currentDir: SortDirection;
  onClick: (key: RegionSortKey) => void;
  align: 'left' | 'right';
}) {
  const isActive = sortKey === currentKey;
  return (
    <th
      className={cn(
        'px-3 py-3 cursor-pointer select-none hover:bg-surface',
        align === 'left' ? 'text-left' : 'text-right',
      )}
      onClick={() => onClick(sortKey)}
    >
      <span
        className={cn(
          'inline-flex items-center gap-1',
          align === 'right' && 'flex-row-reverse',
        )}
      >
        {label}
        {isActive ? (
          currentDir === 'desc' ? (
            <ArrowDown size={11} className="text-balapor" />
          ) : (
            <ArrowUp size={11} className="text-balapor" />
          )
        ) : (
          <ArrowUpDown size={11} className="text-text-muted opacity-50" />
        )}
      </span>
    </th>
  );
}

function RegionRow({
  stats,
  onClick,
}: {
  stats: RegionStats;
  onClick: () => void;
}) {
  const verifiedTotal = getVerifiedTotal(stats);
  const isEmpty = stats.total_reports === 0;

  return (
    <tr
      className={cn(
        'border-t border-border transition-colors',
        isEmpty
          ? 'opacity-50 cursor-default'
          : 'cursor-pointer hover:bg-surface-muted/30',
      )}
      onClick={isEmpty ? undefined : onClick}
    >
      <td className="px-3 py-3">
        <div className="font-semibold text-text">{stats.region_name}</div>
        <div className="text-[10px] text-text-muted mt-0.5 flex items-center gap-1.5">
          <span className="uppercase font-bold tracking-wider">
            {stats.region_type}
          </span>
          {stats.bps_code && (
            <span className="font-mono">{stats.bps_code}</span>
          )}
        </div>
      </td>
      <td className="px-3 py-3 text-right">
        <span
          className={cn(
            'tabular-nums font-bold',
            isEmpty ? 'text-text-muted' : 'text-text',
          )}
        >
          {stats.total_reports}
        </span>
      </td>
      <td className="px-3 py-3 text-right">
        {stats.urgent > 0 ? (
          <span className="tabular-nums font-bold text-status-critical">
            {stats.urgent}
          </span>
        ) : (
          <span className="text-text-muted">—</span>
        )}
      </td>
      <td className="px-3 py-3 text-right">
        <span
          className={cn(
            'tabular-nums text-xs font-semibold',
            getRateColorClass(stats.verified_rate, stats.total_reports > 0),
          )}
        >
          {formatRate(stats.verified_rate, stats.total_reports > 0)}
        </span>
      </td>
      <td className="px-3 py-3 text-right">
        <span
          className={cn(
            'tabular-nums text-xs font-semibold',
            getRateColorClass(stats.civic_resolution_rate, verifiedTotal > 0),
          )}
        >
          {formatRate(stats.civic_resolution_rate, verifiedTotal > 0)}
        </span>
      </td>
      <td className="px-3 py-3 text-right">
        <span
          className={cn(
            'tabular-nums text-xs font-semibold',
            getRateColorClass(stats.published_rate, stats.total_reports > 0),
          )}
        >
          {formatRate(stats.published_rate, stats.total_reports > 0)}
        </span>
      </td>
      <td className="px-3 py-3 text-right">
        {!isEmpty && (
          <ChevronRight size={14} className="text-text-muted inline-block" />
        )}
      </td>
    </tr>
  );
}

/* ════════════════════════════════════════════════════════════════
   Unmapped notice (e.g. provinsi-level reports)
   ════════════════════════════════════════════════════════════════ */

function UnmappedNotice({ count }: { count: number }) {
  return (
    <div className="rounded-xl bg-status-caution/8 border border-status-caution/20 px-4 py-3">
      <p className="text-xs text-text-secondary">
        <span className="font-semibold text-status-caution">
          {count} laporan
        </span>{' '}
        belum ter-mapping ke kabupaten/kota — biasanya laporan dengan lokasi
        di level provinsi (Maluku Utara) tanpa info kab/kota spesifik.
      </p>
    </div>
  );
}
