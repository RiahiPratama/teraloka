'use client';

// ═══════════════════════════════════════════════════════════════
// BALAJU Command Center — Dashboard (Overview)
// Path: /admin/balaju   Route guard: admin/layout.tsx (auth + role)
//
// Gaya BARU: useApi + Tailwind semantic tokens + KPICard/Card/Badge.
// Konsumsi: GET /admin/balaju/overview
//   → { drivers, rides{by_status}, commission, revenue{per_service}, gmv_payment, live_map, meta }
//
// 🛡️ FILOSOFI PRD: tampilkan yang ADA backend-nya. gmv_payment + live_map = null
//    (F4 payment & GPS driver app belum) → state "Coming soon", JANGAN angka palsu.
// 🛡️ by_status = SNAPSHOT status saat ini, BUKAN funnel konversi historis → label jujur.
// ═══════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from 'react';
import {
  LayoutDashboard, Radio, Clock, Package, AlertTriangle,
  Wallet, TrendingUp, Bike, Map, CreditCard, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApi, ApiError } from '@/lib/api/client';
import { KPICard } from '@/components/dashboard/kpi-card';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// ─── Tipe respons (mirror shape backend overview-service.ts) ──────
interface PerService {
  service_type: string;
  rides: number;
  trip_value: number;
  commission: number;
  driver_earning: number;
}
interface OverviewResponse {
  drivers: {
    total: number; pending: number; verified: number; suspended: number;
    rejected: number; pending_aging_24h: number; online: number;
  };
  rides: { total: number; today: number; by_status: Record<string, number> };
  commission: { currency: string; total_accrued: number; today: number };
  revenue: {
    currency: string; total_trip_value: number; total_driver_earning: number;
    per_service: PerService[];
  };
  gmv_payment: unknown | null;
  live_map: unknown | null;
  meta: { scope: string; generated_at: string; commission_source: string };
}

const rupiah = (n: number) => 'Rp ' + (Number(n) || 0).toLocaleString('id-ID');
const SERVICE_LABELS: Record<string, string> = { ride_bike: 'Ojek', courier: 'Kurir', ride_car: 'Mobil' };

// Urutan + meta tampilan status (snapshot)
const STATUS_VIEW: { key: string; label: string; tone: string }[] = [
  { key: 'open', label: 'Mencari driver', tone: 'bg-status-warning' },
  { key: 'matched', label: 'Driver siap', tone: 'bg-bapasiar' },
  { key: 'ongoing', label: 'Berlangsung', tone: 'bg-bapasiar' },
  { key: 'completed', label: 'Selesai', tone: 'bg-status-healthy' },
  { key: 'cancelled', label: 'Dibatalkan', tone: 'bg-text-light' },
  { key: 'no_driver', label: 'Tanpa driver', tone: 'bg-status-critical' },
];

export default function AdminBalajuDashboardPage() {
  const api = useApi();
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<OverviewResponse>('/admin/balaju/overview');
      setData(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal memuat ringkasan');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);

  const d = data?.drivers;
  const r = data?.rides;
  const com = data?.commission;
  const rev = data?.revenue;

  // sinyal ops: % order gagal cari driver (no_driver / total)
  const noDriver = r?.by_status?.no_driver ?? 0;
  const noDriverPct = r && r.total > 0 ? Math.round((noDriver / r.total) * 100) : 0;

  const maxStatus = r ? Math.max(1, ...Object.values(r.by_status ?? {})) : 1;

  return (
    <div className="px-4 py-4 sm:px-6">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-text">
            <LayoutDashboard size={22} className="text-balaju" /> Dashboard BALAJU
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Ringkasan operasional mobilitas darat — Ternate.
          </p>
        </div>
        {data?.meta?.generated_at && (
          <span className="hidden text-xs text-text-light sm:block">
            Diperbarui {new Date(data.meta.generated_at).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Error state */}
      {!loading && error && (
        <Card variant="muted" className="py-12 text-center">
          <p className="text-sm font-semibold text-status-critical">{error}</p>
          <button onClick={fetchOverview} className="mt-3 text-sm text-balaju hover:underline">Coba lagi</button>
        </Card>
      )}

      {!error && (
        <>
          {/* ─── KPI utama ───────────────────────────────────────── */}
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KPICard
              service="balaju" icon={<Radio size={20} />} label="Driver Online"
              value={d?.online ?? 0} loading={loading}
              sublabel={d ? `dari ${d.verified} terverifikasi` : undefined}
              emptyMessage="Belum ada driver online"
            />
            <KPICard
              service="balaju" icon={<Clock size={20} />} label="Pending Verifikasi"
              value={d?.pending ?? 0} loading={loading}
              sublabel="Menunggu tinjauan"
              badge={d && d.pending_aging_24h > 0 ? { label: `${d.pending_aging_24h} >24 jam`, tone: 'warning' } : undefined}
              href="/admin/balaju/drivers"
              emptyMessage="Antrian kosong"
            />
            <KPICard
              service="balaju" icon={<Package size={20} />} label="Total Order"
              value={r?.total ?? 0} loading={loading}
              sublabel={r ? `${r.today} hari ini` : undefined}
              emptyMessage="Belum ada order"
            />
            <KPICard
              service="balaju" icon={<AlertTriangle size={20} />} label="Order Tanpa Driver"
              value={noDriver} loading={loading}
              sublabel="Gagal cari driver"
              badge={noDriver > 0 ? { label: `${noDriverPct}% dari total`, tone: 'critical' } : undefined}
              emptyMessage="Semua order dapat driver"
            />
          </div>

          {/* ─── Strip uang (akrual) ─────────────────────────────── */}
          <div className="mb-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MoneyCard
              loading={loading} icon={<Wallet size={18} />} label="Komisi Akrual"
              value={com?.total_accrued ?? 0}
              sub={com ? `Hari ini: ${rupiah(com.today)}` : ''}
            />
            <MoneyCard
              loading={loading} icon={<TrendingUp size={18} />} label="Nilai Transaksi"
              value={rev?.total_trip_value ?? 0}
              sub="Total tarif order selesai"
            />
            <MoneyCard
              loading={loading} icon={<Bike size={18} />} label="Pendapatan Driver"
              value={rev?.total_driver_earning ?? 0}
              sub="Bagian driver (di luar komisi)"
            />
          </div>
          <p className="mb-5 text-xs text-text-light">
            Komisi = <span className="font-semibold">akrual</span> (tercatat saat order selesai, belum tentu sudah disetor driver).
          </p>

          {/* ─── Distribusi status order ─────────────────────────── */}
          <Card className="mb-5">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-sm font-bold text-text">Distribusi Status Order</h2>
              <span className="text-xs text-text-light">{r?.total ?? 0} total</span>
            </div>
            <p className="mb-4 text-xs text-text-muted">
              Snapshot status saat ini — bukan funnel konversi historis.
            </p>
            <div className="space-y-2.5">
              {STATUS_VIEW.map((s) => {
                const v = r?.by_status?.[s.key] ?? 0;
                return (
                  <div key={s.key} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 text-xs font-medium text-text-muted">{s.label}</span>
                    <div className="h-5 flex-1 overflow-hidden rounded-md bg-surface-muted">
                      <div
                        className={cn('h-full rounded-md transition-all', s.tone)}
                        style={{ width: loading ? '0%' : `${(v / maxStatus) * 100}%`, minWidth: v > 0 ? '0.5rem' : 0 }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right text-sm font-bold tabular-nums text-text">{v}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* ─── Performa per layanan ────────────────────────────── */}
          <Card padded={false} className="mb-5 overflow-hidden">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-bold text-text">Performa per Layanan</h2>
              <p className="mt-0.5 text-xs text-text-muted">Operasional dipisah per layanan untuk keputusan bisnis (margin Ojek vs Kurir vs Mobil).</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-surface-muted">
                  <tr className="text-left text-xs font-bold uppercase tracking-wide text-text-muted">
                    <th className="px-4 py-2.5">Layanan</th>
                    <th className="px-4 py-2.5 text-right">Order</th>
                    <th className="px-4 py-2.5 text-right">Nilai Transaksi</th>
                    <th className="px-4 py-2.5 text-right">Komisi</th>
                    <th className="px-4 py-2.5 text-right">Pendapatan Driver</th>
                  </tr>
                </thead>
                <tbody>
                  {(rev?.per_service ?? []).map((p) => {
                    const active = p.rides > 0;
                    return (
                      <tr key={p.service_type} className="border-t border-border">
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-2 font-semibold text-text">
                            {SERVICE_LABELS[p.service_type] ?? p.service_type}
                            {!active && <Badge variant="status" status="neutral" size="sm">Coming soon</Badge>}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-text">{p.rides}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-text-muted">{active ? rupiah(p.trip_value) : '—'}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-text-muted">{active ? rupiah(p.commission) : '—'}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-text-muted">{active ? rupiah(p.driver_earning) : '—'}</td>
                      </tr>
                    );
                  })}
                  {loading && (
                    <tr><td colSpan={5} className="px-4 py-6 text-center text-xs text-text-muted">Memuat…</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* ─── Coming soon (jujur, nol angka palsu) ────────────── */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ComingSoon
              icon={<CreditCard size={18} />} title="GMV & Metode Pembayaran"
              note="Menunggu sistem pembayaran (F4). Saat ini order cash-only, breakdown metode belum tersedia."
            />
            <ComingSoon
              icon={<Map size={18} />} title="Peta Live Driver"
              note="Menunggu aplikasi driver (GPS stream). Posisi real-time belum tersedia."
            />
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Kartu uang (Rupiah berformat, tanpa count-up) ─── */
function MoneyCard({
  icon, label, value, sub, loading,
}: { icon: React.ReactNode; label: string; value: number; sub: string; loading: boolean }) {
  return (
    <Card className="flex flex-col">
      <div className="mb-2 flex items-center gap-2 text-text-muted">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-finansial-muted text-finansial">{icon}</span>
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      {loading ? (
        <div className="h-7 w-28 animate-pulse rounded-md bg-surface-muted" />
      ) : (
        <div className="text-2xl font-bold tabular-nums text-text">{rupiah(value)}</div>
      )}
      {sub && !loading && <div className="mt-1 text-xs text-text-light">{sub}</div>}
    </Card>
  );
}

/* ─── Kartu Coming soon (state jujur, bukan angka palsu) ─── */
function ComingSoon({ icon, title, note }: { icon: React.ReactNode; title: string; note: string }) {
  return (
    <Card variant="muted" className="flex items-start gap-3 border-dashed">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface text-text-light">{icon}</span>
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-text">{title}</h3>
          <Badge variant="status" status="neutral" size="sm">
            <Sparkles size={11} className="mr-1" /> Coming soon
          </Badge>
        </div>
        <p className="mt-1 text-xs text-text-muted">{note}</p>
      </div>
    </Card>
  );
}
