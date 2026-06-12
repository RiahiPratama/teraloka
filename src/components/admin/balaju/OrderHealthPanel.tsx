'use client';

// ═══════════════════════════════════════════════════════════════
// TeraLoka — OrderHealthPanel
// Dashboard "Order Health BALAJU" (12 Jun 2026)
// Path render: /admin/balaju/order-health
// ───────────────────────────────────────────────────────────────
// Jawab pertanyaan ORDER-CENTRIC yang gak bisa dijawab /admin/notifications
// (yang message-centric): "Order #X fanout ke berapa driver, berapa yang
// BENERAN ke-notif WA, hasilnya apa?". Pendamping visual dari ALARM gone-dark (L1).
//
// Source: GET /admin/balaju/order-health?limit=&gone_dark=1
//   (OTAK: domains/balaju/admin/order-health-service.ts)
//
// 🛡️ Pola useApi (KONSISTEN tetangga BALAJU overview/rides), BUKAN useAuth+fetch.
//    api.get<T> auto: auth header + ApiError + unwrap {success,data} (Pattern II).
// 🛡️ Semantic token TW-v4 (status-*/text-*/surface) — adaptif dark/light (Pattern AAP).
//
// GREP MARKER: BALAJU_ORDER_HEALTH_PANEL_V1

import { useCallback, useEffect, useState } from 'react';
import {
  Bike, CheckCircle2, AlertTriangle, MinusCircle, RefreshCw,
  Loader2, ShieldAlert, Filter, Clock, Radio,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApi, ApiError } from '@/lib/api/client';

// ─── Types (mirror response order-health-service) ────────────────

type HealthKind = 'healthy' | 'gone_dark' | 'no_dispatch';

interface OrderHealthRow {
  id: string;
  service_type: string;
  status: string;
  pickup_address: string | null;
  dropoff_address: string | null;
  reopen_count: number;
  created_at: string;
  dispatched: number;
  notified_wa: number;
  notified_realtime: number;
  accepted: number;
  health: HealthKind;
}

interface OrderHealthData {
  summary: { total: number; healthy: number; gone_dark: number; no_dispatch: number };
  orders: OrderHealthRow[];
  window_limit: number;
}

// ─── Label maps ──────────────────────────────────────────────────

const SERVICE_LABELS: Record<string, string> = {
  ride_bike: 'Ojek',
  courier: 'Kurir',
  ride_car: 'Mobil',
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  open: 'Mencari',
  matched: 'Dapat driver',
  arrived: 'Driver tiba',
  ongoing: 'Berjalan',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
  no_driver: 'Tanpa driver',
};

const svcLabel = (t: string) => SERVICE_LABELS[t] ?? t;
const statusLabel = (s: string) => ORDER_STATUS_LABELS[s] ?? s;

// ─── Health badge (token semantik, adaptif theme) ────────────────

function healthBadge(h: HealthKind): { label: string; cls: string; icon: typeof CheckCircle2 } {
  if (h === 'healthy') {
    return { label: 'Sehat', cls: 'bg-status-healthy/12 text-status-healthy', icon: CheckCircle2 };
  }
  if (h === 'gone_dark') {
    return { label: 'Gone-Dark', cls: 'bg-status-critical/12 text-status-critical', icon: ShieldAlert };
  }
  return { label: 'Tanpa kandidat', cls: 'bg-status-warning/12 text-status-warning', icon: MinusCircle };
}

// ─── Helpers ──────────────────────────────────────────────────────

const formatDateTime = (d: string) =>
  new Date(d).toLocaleString('id-ID', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Jayapura', // WIT (Ternate)
  });

const shortId = (id: string) => id.slice(0, 8);

// ─── Component ────────────────────────────────────────────────────

export default function OrderHealthPanel() {
  const api = useApi();

  const [data, setData] = useState<OrderHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [limit, setLimit] = useState<number>(50);
  const [onlyGoneDark, setOnlyGoneDark] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set('limit', String(limit));
    if (onlyGoneDark) params.set('gone_dark', '1');

    try {
      const res = await api.get<OrderHealthData>(`/admin/balaju/order-health?${params}`);
      setData(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal memuat data order health');
    } finally {
      setLoading(false);
    }
  }, [api, limit, onlyGoneDark]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const summary = data?.summary;

  return (
    <div className="flex flex-col gap-4">

      {/* ─── Header ─── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-status-healthy/12 text-status-healthy">
            <Bike size={18} />
          </div>
          <div>
            <h2 className="text-[16px] font-extrabold text-text">Order Health BALAJU</h2>
            <p className="text-[11px] text-text-muted mt-0.5">
              Reliabilitas notif dispatch per order — deteksi order &quot;gone-dark&quot;
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wide bg-surface-muted text-text-muted hover:text-text transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* ─── Error ─── */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-status-critical/8 border border-status-critical/20">
          <AlertTriangle size={14} className="text-status-critical shrink-0 mt-0.5" />
          <p className="text-[11px] text-status-critical">{error}</p>
        </div>
      )}

      {/* ─── Loading ─── */}
      {loading && !data && (
        <div className="flex items-center justify-center gap-2 py-16 bg-surface border border-border rounded-xl">
          <Loader2 size={16} className="animate-spin text-text-muted" />
          <span className="text-[12px] text-text-muted">Memuat data...</span>
        </div>
      )}

      {/* ─── Stat Cards (4) ─── */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-surface-muted text-text-muted mb-2">
              <Bike size={16} />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-text-muted">Total Order</p>
            <p className="text-[22px] font-extrabold text-text tabular-nums mt-1">{summary.total}</p>
          </div>

          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-status-healthy/12 text-status-healthy mb-2">
              <CheckCircle2 size={16} />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-text-muted">Sehat</p>
            <p className="text-[22px] font-extrabold text-status-healthy tabular-nums mt-1">{summary.healthy}</p>
          </div>

          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-status-critical/12 text-status-critical mb-2">
              <ShieldAlert size={16} />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-text-muted">Gone-Dark</p>
            <p className="text-[22px] font-extrabold text-status-critical tabular-nums mt-1">{summary.gone_dark}</p>
          </div>

          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-status-warning/12 text-status-warning mb-2">
              <MinusCircle size={16} />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-text-muted">Tanpa Kandidat</p>
            <p className="text-[22px] font-extrabold text-status-warning tabular-nums mt-1">{summary.no_dispatch}</p>
          </div>
        </div>
      )}

      {/* ─── Filter Bar ─── */}
      {data && (
        <div className="flex items-center gap-2 flex-wrap p-3 bg-surface-muted border border-border rounded-xl">
          <Filter size={14} className="text-text-subtle shrink-0" />

          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="text-[11px] font-semibold rounded-lg border border-border bg-surface px-2.5 py-1.5 text-text"
          >
            <option value={20}>20 order terakhir</option>
            <option value={50}>50 order terakhir</option>
            <option value={100}>100 order terakhir</option>
            <option value={200}>200 order terakhir</option>
          </select>

          <button
            type="button"
            onClick={() => setOnlyGoneDark((v) => !v)}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors',
              onlyGoneDark
                ? 'bg-status-critical/12 text-status-critical'
                : 'bg-surface-muted text-text-muted hover:text-text',
            )}
          >
            <ShieldAlert size={11} />
            {onlyGoneDark ? 'Hanya Gone-Dark' : 'Semua Order'}
          </button>
        </div>
      )}

      {/* ─── Tabel Order ─── */}
      {data && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-[12px] font-bold text-text uppercase tracking-wider">Daftar Order</h3>
            <span className="text-[10px] font-mono text-text-subtle">{data.orders.length} order</span>
          </div>

          {data.orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Bike className="text-text-subtle mb-2" size={32} />
              <p className="text-[12px] text-text-muted">
                {onlyGoneDark ? 'Tidak ada order gone-dark 🎉' : 'Belum ada order'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-surface-muted/40">
                  <tr>
                    <th className="px-3 py-2 text-left text-[9px] font-bold text-text-muted uppercase tracking-wider">Order</th>
                    <th className="px-3 py-2 text-left text-[9px] font-bold text-text-muted uppercase tracking-wider">Layanan</th>
                    <th className="px-3 py-2 text-left text-[9px] font-bold text-text-muted uppercase tracking-wider">Rute</th>
                    <th className="px-3 py-2 text-center text-[9px] font-bold text-text-muted uppercase tracking-wider">Fanout</th>
                    <th className="px-3 py-2 text-center text-[9px] font-bold text-text-muted uppercase tracking-wider">Ke-WA</th>
                    <th className="px-3 py-2 text-left text-[9px] font-bold text-text-muted uppercase tracking-wider">Status</th>
                    <th className="px-3 py-2 text-center text-[9px] font-bold text-text-muted uppercase tracking-wider">Health</th>
                    <th className="px-3 py-2 text-left text-[9px] font-bold text-text-muted uppercase tracking-wider">Waktu</th>
                  </tr>
                </thead>
                <tbody>
                  {data.orders.map((o) => {
                    const badge = healthBadge(o.health);
                    const BadgeIcon = badge.icon;
                    return (
                      <tr key={o.id} className="border-t border-border hover:bg-surface-muted/30 transition-colors">
                        <td className="px-3 py-2.5 font-mono text-[10px] text-text-muted">
                          #{shortId(o.id)}
                          {o.reopen_count > 0 && (
                            <span className="ml-1 text-status-warning" title={`reopen ${o.reopen_count}x`}>
                              ↻{o.reopen_count}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-[11px] font-semibold text-text">{svcLabel(o.service_type)}</td>
                        <td className="px-3 py-2.5 text-[10px] text-text-muted max-w-[200px] truncate">
                          {(o.pickup_address ?? '—')} → {(o.dropoff_address ?? '—')}
                        </td>
                        <td className="px-3 py-2.5 text-center text-[11px] font-semibold text-text tabular-nums">
                          {o.dispatched}
                        </td>
                        <td className="px-3 py-2.5 text-center text-[11px] tabular-nums">
                          <span className={o.notified_wa === 0 && o.dispatched > 0 ? 'text-status-critical font-bold' : 'text-text-muted'}>
                            {o.notified_wa}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-[10px] text-text-muted whitespace-nowrap">{statusLabel(o.status)}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold', badge.cls)}>
                            <BadgeIcon size={10} />
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-[10px] text-text-muted whitespace-nowrap">
                          <Clock size={9} className="inline mr-1" />
                          {formatDateTime(o.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── Footer note ─── */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-status-info/4 border border-status-info/20">
        <Radio size={12} className="text-status-info shrink-0 mt-0.5" />
        <p className="text-[10px] text-status-info leading-relaxed">
          <strong>Fanout</strong> = jumlah driver yang diundang ke order. <strong>Ke-WA</strong> = berapa
          yang berhasil di-notif WhatsApp. <strong className="text-status-critical">Gone-Dark</strong> = fanout
          tapi 0 ke-WA (WAHA gagal / F6 nonaktif) — order bisa mati tanpa driver tahu; alarm L1 menembak ops.
          <strong className="text-status-warning"> Tanpa kandidat</strong> = tidak ada driver di area (sepi),
          bukan kegagalan teknis. Data lama (pra-notif) wajar terlihat merah.
        </p>
      </div>
    </div>
  );
}
