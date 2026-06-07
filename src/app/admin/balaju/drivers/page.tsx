'use client';

// ═══════════════════════════════════════════════════════════════
// WAJAH-1 — Admin BALAJU: Antrian Verifikasi Driver (List)
// Path: /admin/balaju/drivers   Route guard: admin/layout.tsx (auth + role)
//
// Gaya BARU: useApi + Tailwind semantic tokens + KPICard/Card/Badge.
// Review driver = MODAL (DriverReviewModal) — triase cepat tanpa pindah halaman.
//
// Konsumsi: GET /admin/balaju/drivers?status=&q=&page=&limit=
//   → { drivers[], counts{...,pending_aging_24h}, pagination }
// ═══════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock, CheckCircle2, Ban, XCircle, Search, Bike } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApi, ApiError } from '@/lib/api/client';
import { KPICard } from '@/components/dashboard/kpi-card';
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

type StatusFilter = 'pending' | 'verified' | 'suspended' | 'rejected' | 'all';

const STATUS_LABELS: Record<StatusFilter, string> = {
  pending: 'Pending', verified: 'Verified', suspended: 'Suspended', rejected: 'Rejected', all: 'Semua',
};
const SERVICE_LABELS: Record<string, string> = { ride_bike: 'Ojek', courier: 'Kurir', ride_car: 'Mobil' };
const STATUS_BADGE: Record<DriverRow['verification_status'], 'warning' | 'healthy' | 'info' | 'critical'> = {
  pending: 'warning', verified: 'healthy', suspended: 'info', rejected: 'critical',
};
const DEFAULT_COUNTS: Counts = { pending: 0, verified: 0, suspended: 0, rejected: 0, pending_aging_24h: 0, total: 0 };

export default function AdminBalajuDriversPage() {
  const api = useApi();

  const [status, setStatus] = useState<StatusFilter>('pending');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [counts, setCounts] = useState<Counts>(DEFAULT_COUNTS);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // modal review + toast
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

  // dipanggil modal setelah aksi sukses → refresh list + counts + tutup + toast
  const handleActionDone = useCallback((msg: string) => {
    setToast(msg);
    setReviewId(null);
    fetchDrivers();
  }, [fetchDrivers]);

  const statusCounts = useMemo(() => ({
    pending: counts.pending, verified: counts.verified,
    suspended: counts.suspended, rejected: counts.rejected, all: counts.total,
  }), [counts]);

  const statCards = useMemo(() => ([
    { key: 'pending' as const, label: 'Pending', value: counts.pending, icon: <Clock size={20} />,
      sublabel: 'Menunggu verifikasi',
      badge: counts.pending_aging_24h > 0 ? { label: `${counts.pending_aging_24h} >24 jam`, tone: 'warning' as const } : undefined },
    { key: 'verified' as const, label: 'Verified', value: counts.verified, icon: <CheckCircle2 size={20} />, sublabel: 'Driver aktif' },
    { key: 'suspended' as const, label: 'Suspended', value: counts.suspended, icon: <Ban size={20} />, sublabel: 'Dibekukan' },
    { key: 'rejected' as const, label: 'Rejected', value: counts.rejected, icon: <XCircle size={20} />, sublabel: 'Ditolak' },
  ]), [counts]);

  return (
    <div className="px-4 py-4 sm:px-6">
      {/* Header */}
      <div className="mb-5">
        <h1 className="flex items-center gap-2 text-xl font-bold text-text">
          <Bike size={22} className="text-bapasiar" /> Verifikasi Driver
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Tinjau pengajuan driver BALAJU. Hanya driver terverifikasi yang bisa menerima order.
        </p>
      </div>

      {/* Stat cards — klik buat filter */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map((c) => (
          <KPICard
            key={c.key}
            service="bapasiar"
            icon={c.icon}
            label={c.label}
            value={c.value}
            sublabel={c.sublabel}
            badge={c.badge}
            onClick={() => { setStatus(c.key); setPage(1); }}
            className={cn(status === c.key && 'ring-2 ring-bapasiar ring-offset-2 ring-offset-surface')}
          />
        ))}
      </div>

      {/* Filter aktif + search */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <span>Menampilkan:</span>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-muted px-3 py-1 font-semibold text-text">
            {STATUS_LABELS[status]}
            {status !== 'all' && (
              <button onClick={() => { setStatus('all'); setPage(1); }} className="text-text-light hover:text-text" aria-label="Hapus filter">
                ✕
              </button>
            )}
          </span>
        </div>

        <div className="relative w-full max-w-xs">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-light" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari nama atau nomor HP..."
            className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm text-text outline-none focus:border-bapasiar"
          />
        </div>
      </div>

      {/* States */}
      {loading && <div className="py-16 text-center text-sm text-text-muted">Memuat antrian driver…</div>}

      {!loading && error && (
        <Card variant="muted" className="py-12 text-center">
          <p className="text-sm font-semibold text-status-critical">{error}</p>
          <button onClick={fetchDrivers} className="mt-3 text-sm text-bapasiar hover:underline">Coba lagi</button>
        </Card>
      )}

      {!loading && !error && drivers.length === 0 && (
        <Card variant="muted" className="py-16 text-center">
          <div className="mb-2 text-4xl">🛵</div>
          <p className="text-sm font-semibold text-text">Tidak ada driver</p>
          <p className="mt-1 text-xs text-text-muted">
            {status === 'pending' ? 'Belum ada driver yang menunggu verifikasi.' : `Tidak ada driver dengan status "${STATUS_LABELS[status]}".`}
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
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Layanan</th>
                  <th className="px-4 py-3">Tier</th>
                  <th className="px-4 py-3">Track</th>
                  <th className="px-4 py-3">Tgl Daftar</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((d) => (
                  <tr key={d.id} className="cursor-pointer border-t border-border hover:bg-surface-muted/60" onClick={() => setReviewId(d.id)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bapasiar-muted text-sm font-bold text-bapasiar">
                          {(d.name ?? '?').charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-text">{d.name}</span>
                      </div>
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
                      {d.rides_completed} trip{d.rating_avg > 0 ? ` • ⭐${Number(d.rating_avg).toFixed(1)}` : ''}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-muted">
                      {d.created_at ? new Date(d.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="status" status={STATUS_BADGE[d.verification_status]}>
                        {STATUS_LABELS[d.verification_status as StatusFilter]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); setReviewId(d.id); }}
                        className={cn(
                          'rounded-lg px-3.5 py-1.5 text-xs font-semibold',
                          d.verification_status === 'pending'
                            ? 'bg-bapasiar text-white hover:opacity-90'
                            : 'border border-border text-text-muted hover:bg-surface-muted',
                        )}
                      >
                        {d.verification_status === 'pending' ? 'Review →' : 'Detail'}
                      </button>
                    </td>
                  </tr>
                ))}
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

      {/* Modal review */}
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
