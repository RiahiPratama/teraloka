'use client';

/**
 * TeraLoka — SOS Tab (Admin BALAPOR Command Center)
 * Bridge Sprint Day 12 Step 7 Batch B1 (10 Mei 2026)
 * ------------------------------------------------------------
 * Tab SOS untuk admin BALAPOR command center.
 *
 * Mounted di: src/app/admin/balapor/page.tsx (case 'sos')
 *
 * Theming: CSS variables (auto-adaptive light + dark via .dark class).
 *
 * Hotfix evening 10 Mei 2026:
 *   - Replace bg-white/text-gray-* hardcoded → CSS variables
 */

import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { useApi } from '@/lib/api/client';
import { useToast } from '@/components/ui/Toast';
import { useSosRealtime } from '@/hooks/useSosRealtime';
import { SosStatsCards } from '@/components/admin/reports/sos-stats-cards';
import { SosListTable } from '@/components/admin/reports/sos-list-table';
import { ACTIVE_STATUSES } from '@/types/sos-admin';
import type {
  AdminSosListResult,
  AdminSosStats,
} from '@/types/sos-admin';
import type { SosStatus, EmergencyType } from '@/types/sos';

const PAGE_SIZE = 20;

type StatusFilter = SosStatus | 'all' | 'active';

interface SosTabProps {
  refreshNonce?: number;
}

export function SosTab({ refreshNonce = 0 }: SosTabProps) {
  const api = useApi();
  const { toast } = useToast();

  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all');
  const [filterType, setFilterType] = useState<EmergencyType | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [pageOffset, setPageOffset] = useState(0);

  const [stats, setStats] = useState<AdminSosStats | null>(null);
  const [listResult, setListResult] = useState<AdminSosListResult | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const data = await api.get<AdminSosStats>('/admin/balapor/sos/stats');
      setStats(data);
    } catch (err) {
      console.error('[SOS Tab] fetchStats error:', err);
    } finally {
      setIsLoadingStats(false);
    }
  }, [api]);

  const fetchList = useCallback(async () => {
    setIsLoadingList(true);
    setErrorMessage(null);

    try {
      const params = new URLSearchParams();

      if (filterStatus !== 'all' && filterStatus !== 'active') {
        params.set('status', filterStatus);
      }

      if (filterType !== 'all') {
        params.set('emergency_type', filterType);
      }

      if (searchTerm) {
        params.set('search', searchTerm);
      }

      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(pageOffset));

      const result = await api.get<AdminSosListResult>(
        `/admin/balapor/sos?${params.toString()}`,
      );

      if (filterStatus === 'active') {
        const filtered = result.data.filter((sos) =>
          ACTIVE_STATUSES.includes(sos.status),
        );
        setListResult({
          ...result,
          data: filtered,
          total: filtered.length,
        });
      } else {
        setListResult(result);
      }
    } catch (err) {
      console.error('[SOS Tab] fetchList error:', err);
      const message = err instanceof Error ? err.message : 'Gagal memuat daftar SOS';
      setErrorMessage(message);
    } finally {
      setIsLoadingList(false);
    }
  }, [api, filterStatus, filterType, searchTerm, pageOffset]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats, refreshNonce]);

  useEffect(() => {
    fetchList();
  }, [fetchList, refreshNonce]);

  const { isConnected, lastEventAt, manualRefresh } = useSosRealtime({
    onNew: (newSos) => {
      toast.warning(`🚨 SOS Baru: ${newSos.display_id} (${newSos.emergency_type})`);
      fetchStats();
      fetchList();
    },
    onUpdate: () => {
      fetchStats();
      fetchList();
    },
    onPoll: () => {
      fetchStats();
      fetchList();
    },
    enableRealtime: true,
    pollIntervalMs: 60000,
  });

  const handleFilterStatusChange = (status: StatusFilter) => {
    setFilterStatus(status);
    setPageOffset(0);
  };

  const handleFilterTypeChange = (type: EmergencyType | 'all') => {
    setFilterType(type);
    setPageOffset(0);
  };

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
    setPageOffset(0);
  };

  return (
    <div className="space-y-6">
      {/* Tab Header dengan Connection + Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2
            className="text-lg font-extrabold tracking-tight"
            style={{ color: 'var(--color-text)' }}
          >
            Panggilan Darurat (SOS)
          </h2>
          <p
            className="text-xs mt-0.5"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Monitor & response panggilan darurat warga Maluku Utara
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ConnectionIndicator isConnected={isConnected} lastEventAt={lastEventAt} />

          <button
            type="button"
            onClick={() => {
              manualRefresh();
              fetchStats();
              fetchList();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold active:scale-95 transition"
            style={{
              background: 'var(--color-surface)',
              color: 'var(--color-text-secondary)',
              border: '2px solid var(--color-border)',
            }}
          >
            <RefreshCw className="h-4 w-4" strokeWidth={2.5} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error banner */}
      {errorMessage && (
        <div
          className="rounded-xl p-3 flex items-start gap-2"
          style={{
            background: 'var(--color-balapor-muted)',
            border: '2px solid var(--color-balapor)',
          }}
        >
          <AlertCircle
            className="h-5 w-5 flex-shrink-0 mt-0.5"
            style={{ color: 'var(--color-balapor)' }}
          />
          <div className="flex-1">
            <p
              className="text-sm font-bold"
              style={{ color: 'var(--color-balapor-strong)' }}
            >
              Gagal memuat data
            </p>
            <p
              className="text-xs mt-0.5"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {errorMessage}
            </p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <SosStatsCards stats={stats} isLoading={isLoadingStats} />

      {/* List Table */}
      <SosListTable
        result={listResult}
        isLoading={isLoadingList}
        filterStatus={filterStatus}
        filterType={filterType}
        searchTerm={searchTerm}
        onFilterStatusChange={handleFilterStatusChange}
        onFilterTypeChange={handleFilterTypeChange}
        onSearchChange={handleSearchChange}
        onPageChange={setPageOffset}
      />
    </div>
  );
}

// ─── Connection Status Indicator ────────────────────────────────

function ConnectionIndicator({
  isConnected,
  lastEventAt,
}: {
  isConnected: boolean;
  lastEventAt: Date | null;
}) {
  // Status colors menggunakan semantic tokens (auto-adaptive)
  const colorMain = isConnected
    ? 'var(--color-status-healthy)'
    : 'var(--color-status-warning)';

  return (
    <div
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
      style={{
        background: isConnected
          ? 'rgba(16, 185, 129, 0.10)'  // emerald tint
          : 'rgba(245, 158, 11, 0.10)', // amber tint
        color: colorMain,
        border: `2px solid ${colorMain}`,
      }}
      title={
        lastEventAt
          ? `Update terakhir: ${lastEventAt.toLocaleTimeString('id-ID')}`
          : 'Belum ada event'
      }
    >
      <span
        className="inline-flex h-2 w-2 rounded-full"
        style={{
          background: colorMain,
          animation: isConnected ? 'pulse 2s ease-in-out infinite' : undefined,
        }}
      />
      <span className="hidden sm:inline">
        {isConnected ? 'Realtime' : 'Polling'}
      </span>
    </div>
  );
}
