'use client';

// ═══════════════════════════════════════════════════════════════
// BALAJU Command Center — Driver Roster (fleet operasional)
// Path: /admin/balaju/roster   Route guard: admin/layout.tsx (auth + role)
//
// Beda dari Verifikasi (/admin/balaju/drivers): lensa OPERASIONAL, bukan triase KYC.
//   - Default filter = verified (fleet aktif), bukan pending.
//   - Kolom ONLINE dot + performa (rides + rating).
//   - Reuse DriverReviewModal (detail + suspend/reinstate dari roster).
//
// Konsumsi: GET /admin/balaju/drivers?status=&q=&page=&limit=
//   (SELECT backend udah include is_online/is_active/rating_count)
// ═══════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from 'react';
import { Users, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApi, ApiError } from '@/lib/api/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import DriverReviewModal from '@/components/admin/balaju/DriverReviewModal';

const LIMIT = 20;

interface DriverRow {
  id: string;
  name: string;
  phone: string;
  service_capabilities: string[];
  verification_status: 'pending' | 'verified' | 'suspended' | 'rejected';
  verification_tier: 'bronze' | 'silver' | 'gold';
  rides_completed: number;
  rating_avg: number;
  rating_count: number;
  is_online: boolean;
  is_active: boolean;
  created_at: string;
}
interface Counts {
  pending: number; verified: number; suspended: number; rejected: number;
  pending_aging_24h: number; total: number;
}
interface QueueResponse {
  drivers: DriverRow[];
  counts: Counts;
  pagination: { page: number; limit: number; total: number; total_pages: number };
}

type StatusFilter = 'verified' | 'suspended' | 'pending' | 'rejected' | 'all';

const FILTER_ORDER: StatusFilter[] = ['verified', 'suspended', 'pending', 'rejected', 'all'];
const FILTER_LABELS: Record<StatusFilter, string> = {
  verified: 'Verified', suspended: 'Suspended', pending: 'Pending', rejected: 'Rejected', all: 'Semua',
};
const SERVICE_LABELS: Record<string, string> = { ride_bike: 'Ojek', courier: 'Kurir', ride_car: 'Mobil' };
const STATUS_BADGE: Record<DriverRow['verification_status'], 'warning' | 'healthy' | 'info' | 'critical'> = {
  pending: 'warning', verified: 'healthy', suspended: 'info', rejected: 'critical',
};
const STATUS_LABELS: Record<DriverRow['verification_status'], string> = {
  pending: 'Pending', verified: 'Verified', suspended: 'Suspended', rejected: 'Rejected',
};
const DEFAULT_COUNTS: Counts = { pending: 0, verified: 0, suspended: 0, rejected: 0, pending_aging_24h: 0, total: 0 };

export default function AdminBalajuRosterPage() {
  const api = useApi();

  const [status, setStatus] = useState<StatusFilter>('verified');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [counts, setCounts] = useState<Counts>(DEFAULT_COUNTS);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reviewId, setReviewId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const h = setTimeout(() => { setSearchQuery(searchInput); setPage(1); }, 300);
    return () => clearTimeout(h);
  }, [searchInput]);

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<QueueResponse>('/admin/balaju/drivers', {
        params: {
          status: status === 'all' ? undefined : status,
          q: searchQuery || undefined,
          page,
          limit: LIMIT,
        },
      });
      setDrivers(data.drivers ?? []);
      setCounts(data.counts ?? DEFAULT_COUNTS);
      setTotal(data.pagination?.total ?? 0);
      setTotalPages(data.pagination?.total_pages ?? 0);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal memuat data driver');
    } finally {
      setLoading(false);
    }
  }, [api, status, searchQuery, page]);

  useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleActionDone = useCallback((msg: string) => {
    setToast(msg);
    setReviewId(null);
    fetchDrivers();
  }, [fetchDrivers]);

  const filterCount = (f: StatusFilter): number =>
    f === 'all' ? counts.total : counts[f as Exclude<StatusFilter, 'all'>];

  return (
    <div className="px-4 py-4 sm:px-6">
      {/* Header */}
      <div className="mb-5">
        <h1 className="flex items-center gap-2 text-xl font-bold text-text">
          <Users size={22} className="text-balaju" /> Driver Roster
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Fleet driver BALAJU — status online, tier, dan performa. Klik baris untuk detail &amp; aksi.
        </p>
      </div>

      {/* Filter chips + search */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {FILTER_ORDER.map((f) => (
            <button
              key={f}
              onClick={() => { setStatus(f); setPage(1); }}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                status === f
                  ? 'border-balaju bg-balaju-muted text-balaju'
                  : 'border-border text-text-muted hover:bg-surface-muted',
              )}
            >
              {FILTER_LABELS[f]}
              <span className="rounded-full bg-surface-muted px-1.5 text-[10px] tabular-nums text-text-light">
                {filterCount(f)}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full max-w-xs">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-light" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari nama atau nomor HP..."
            className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm text-text outline-none focus:border-balaju"
          />
        </div>
      </div>

      {/* States */}
      {loading && <div className="py-16 text-center text-sm text-text-muted">Memuat roster driver…</div>}

      {!loading && error && (
        <Card variant="muted" className="py-12 text-center">
          <p className="text-sm font-semibold text-status-critical">{error}</p>
          <button onClick={fetchDrivers} className="mt-3 text-sm text-balaju hover:underline">Coba lagi</button>
        </Card>
      )}

      {!loading && !error && drivers.length === 0 && (
        <Card variant="muted" className="py-16 text-center">
          <div className="mb-2 text-4xl">🛵</div>
          <p className="text-sm font-semibold text-text">Tidak ada driver</p>
          <p className="mt-1 text-xs text-text-muted">
            Tidak ada driver dengan status &quot;{FILTER_LABELS[status]}&quot;.
          </p>
        </Card>
      )}

      {/* Table */}
      {!loading && !error && drivers.length > 0 && (
        <Card padded={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-surface-muted">
                <tr className="text-left text-xs font-bold uppercase tracking-wide text-text-muted">
                  <th className="px-4 py-3">Driver</th>
                  <th className="px-4 py-3">Online</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Layanan</th>
                  <th className="px-4 py-3">Tier</th>
                  <th className="px-4 py-3">Performa</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((d) => {
                  const online = d.is_online && d.verification_status === 'verified';
                  return (
                    <tr key={d.id} className="cursor-pointer border-t border-border hover:bg-surface-muted/60" onClick={() => setReviewId(d.id)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-balaju-muted text-sm font-bold text-balaju">
                            {(d.name ?? '?').charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-text">{d.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <span className={cn('h-2 w-2 rounded-full', online ? 'bg-status-healthy' : 'bg-text-light')} />
                          <span className={cn(online ? 'font-semibold text-status-healthy' : 'text-text-light')}>
                            {online ? 'Online' : 'Offline'}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-text-muted">{d.phone}</td>
                      <td className="px-4 py-3 text-text-muted">
                        {(d.service_capabilities ?? []).map((s) => SERVICE_LABELS[s] ?? s).join(', ')}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-surface-muted px-2 py-0.5 text-xs font-semibold capitalize text-text-muted">
                          {d.verification_tier}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-text-muted">
                        {d.rides_completed} trip
                        {d.rating_count > 0 ? ` • ⭐${Number(d.rating_avg).toFixed(1)} (${d.rating_count})` : ''}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="status" status={STATUS_BADGE[d.verification_status]}>
                          {STATUS_LABELS[d.verification_status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); setReviewId(d.id); }}
                          className="rounded-lg border border-border px-3.5 py-1.5 text-xs font-semibold text-text-muted hover:bg-surface-muted"
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-3">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="rounded-lg border border-border px-3.5 py-2 text-xs font-semibold text-text disabled:cursor-not-allowed disabled:opacity-50">
            ← Sebelumnya
          </button>
          <span className="text-xs text-text-muted">Halaman {page} dari {totalPages} • {total} total</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="rounded-lg border border-border px-3.5 py-2 text-xs font-semibold text-text disabled:cursor-not-allowed disabled:opacity-50">
            Berikutnya →
          </button>
        </div>
      )}

      {/* Modal review (reuse) */}
      {reviewId && (
        <DriverReviewModal
          driverId={reviewId}
          onClose={() => setReviewId(null)}
          onActionDone={handleActionDone}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-lg bg-text px-4 py-2.5 text-sm font-medium text-surface shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
