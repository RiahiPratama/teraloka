'use client';

// ═══════════════════════════════════════════════════════════════
// BALAJU Command Center — Ride Motor (list order ride_bike)
// Path: /admin/balaju/rides   Route guard: admin/layout.tsx (auth + role)
//
// Monitoring order ojek (ride_bike). Read-only v1 (detail order = future).
// Konsumsi: GET /admin/balaju/rides?service=ride_bike&status=&page=&limit=
//   → { rides[] (driver enriched), counts{by_status,total}, pagination }
//
// Tarif tampil = agreed_fare>0 ? agreed_fare : offered_fare (open=quote, completed=final).
// ═══════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from 'react';
import { Bike, MapPin, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApi, ApiError } from '@/lib/api/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const LIMIT = 20;
const SERVICE = 'ride_bike';

interface RideRow {
  id: string;
  service_type: string;
  status: string;
  pickup_address: string | null;
  dropoff_address: string | null;
  distance_estimate_m: number | null;
  offered_fare: number;
  agreed_fare: number;
  commission_amount: number;
  driver_earning: number;
  payment_method: string | null;
  payment_status: string | null;
  cancel_reason: string | null;
  cancelled_by: string | null;
  reopen_count: number;
  created_at: string;
  matched_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  driver: { name: string; phone: string } | null;
}
interface RidesResponse {
  rides: RideRow[];
  counts: { by_status: Record<string, number>; total: number };
  pagination: { page: number; limit: number; total: number; total_pages: number };
}

type StatusFilter = 'all' | 'open' | 'matched' | 'ongoing' | 'completed' | 'cancelled' | 'no_driver';

const FILTER_ORDER: StatusFilter[] = ['all', 'open', 'matched', 'ongoing', 'completed', 'no_driver', 'cancelled'];
const STATUS_LABELS: Record<string, string> = {
  all: 'Semua', open: 'Mencari driver', matched: 'Driver siap', ongoing: 'Berlangsung',
  completed: 'Selesai', cancelled: 'Dibatalkan', no_driver: 'Tanpa driver',
};
const STATUS_BADGE: Record<string, 'warning' | 'healthy' | 'info' | 'critical' | 'neutral'> = {
  open: 'warning', matched: 'info', ongoing: 'info', completed: 'healthy', cancelled: 'neutral', no_driver: 'critical',
};

const rupiah = (n: number) => 'Rp ' + (Number(n) || 0).toLocaleString('id-ID');
const km = (m: number | null) => (m ? `${(m / 1000).toFixed(1)} km` : '—');
const shortId = (id: string) => id.slice(0, 8);
const dt = (s: string | null) =>
  s ? new Date(s).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

export default function AdminBalajuRidesPage() {
  const api = useApi();

  const [status, setStatus] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);

  const [rides, setRides] = useState<RideRow[]>([]);
  const [byStatus, setByStatus] = useState<Record<string, number>>({});
  const [grandTotal, setGrandTotal] = useState(0);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRides = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<RidesResponse>('/admin/balaju/rides', {
        params: {
          service: SERVICE,
          status: status === 'all' ? undefined : status,
          page,
          limit: LIMIT,
        },
      });
      setRides(data.rides ?? []);
      setByStatus(data.counts?.by_status ?? {});
      setGrandTotal(data.counts?.total ?? 0);
      setTotal(data.pagination?.total ?? 0);
      setTotalPages(data.pagination?.total_pages ?? 0);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal memuat daftar order');
    } finally {
      setLoading(false);
    }
  }, [api, status, page]);

  useEffect(() => { fetchRides(); }, [fetchRides]);

  const filterCount = (f: StatusFilter): number => (f === 'all' ? grandTotal : byStatus[f] ?? 0);
  const fareOf = (r: RideRow) => (r.agreed_fare > 0 ? r.agreed_fare : r.offered_fare);

  return (
    <div className="px-4 py-4 sm:px-6">
      {/* Header */}
      <div className="mb-5">
        <h1 className="flex items-center gap-2 text-xl font-bold text-text">
          <Bike size={22} className="text-bapasiar" /> Ride Motor
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Monitoring order ojek (ride_bike) — Ternate. Tarif beku saat order dibuat.
        </p>
      </div>

      {/* Chip filter status (count dari by_status) */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTER_ORDER.map((f) => (
          <button
            key={f}
            onClick={() => { setStatus(f); setPage(1); }}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
              status === f
                ? 'border-bapasiar bg-bapasiar-muted text-bapasiar'
                : 'border-border text-text-muted hover:bg-surface-muted',
            )}
          >
            {STATUS_LABELS[f]}
            <span className="rounded-full bg-surface-muted px-1.5 text-[10px] tabular-nums text-text-light">
              {filterCount(f)}
            </span>
          </button>
        ))}
      </div>

      {/* States */}
      {loading && <div className="py-16 text-center text-sm text-text-muted">Memuat order…</div>}

      {!loading && error && (
        <Card variant="muted" className="py-12 text-center">
          <p className="text-sm font-semibold text-status-critical">{error}</p>
          <button onClick={fetchRides} className="mt-3 text-sm text-bapasiar hover:underline">Coba lagi</button>
        </Card>
      )}

      {!loading && !error && rides.length === 0 && (
        <Card variant="muted" className="py-16 text-center">
          <div className="mb-2 text-4xl">🛵</div>
          <p className="text-sm font-semibold text-text">Tidak ada order</p>
          <p className="mt-1 text-xs text-text-muted">
            {status === 'all' ? 'Belum ada order ride motor.' : `Tidak ada order berstatus "${STATUS_LABELS[status]}".`}
          </p>
        </Card>
      )}

      {/* Table */}
      {!loading && !error && rides.length > 0 && (
        <Card padded={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-surface-muted">
                <tr className="text-left text-xs font-bold uppercase tracking-wide text-text-muted">
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Rute</th>
                  <th className="px-4 py-3 text-right">Tarif</th>
                  <th className="px-4 py-3 text-right">Komisi</th>
                  <th className="px-4 py-3">Driver</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Waktu</th>
                </tr>
              </thead>
              <tbody>
                {rides.map((r) => (
                  <tr key={r.id} className="border-t border-border align-top hover:bg-surface-muted/60">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-semibold text-text">#{shortId(r.id)}</span>
                      <div className="mt-0.5 text-[11px] text-text-light">{km(r.distance_estimate_m)}</div>
                    </td>
                    <td className="px-4 py-3 max-w-[260px]">
                      <div className="flex items-start gap-1.5 text-xs text-text-muted">
                        <MapPin size={12} className="mt-0.5 shrink-0 text-bapasiar" />
                        <span className="truncate" title={r.pickup_address ?? ''}>{r.pickup_address ?? '—'}</span>
                      </div>
                      <div className="mt-1 flex items-start gap-1.5 text-xs text-text-muted">
                        <ArrowRight size={12} className="mt-0.5 shrink-0 text-text-light" />
                        <span className="truncate" title={r.dropoff_address ?? ''}>{r.dropoff_address ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="font-semibold tabular-nums text-text">{rupiah(fareOf(r))}</div>
                      {r.agreed_fare === 0 && r.status === 'open' && (
                        <div className="text-[11px] text-text-light">estimasi</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-text-muted">
                      {r.commission_amount > 0 ? rupiah(r.commission_amount) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-muted">
                      {r.driver ? r.driver.name : <span className="text-text-light">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="status" status={STATUS_BADGE[r.status] ?? 'neutral'}>
                        {STATUS_LABELS[r.status] ?? r.status}
                      </Badge>
                      {r.reopen_count > 0 && (
                        <div className="mt-1 text-[10px] text-text-light">re-dispatch ×{r.reopen_count}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-muted whitespace-nowrap">
                      {dt(r.completed_at ?? r.created_at)}
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
    </div>
  );
}
