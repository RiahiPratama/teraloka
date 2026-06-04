'use client';

/**
 * TeraLoka — WaMonitoringPanel
 * Dashboard "Notifikasi WA TeraLoka" (4 Jun 2026)
 * ────────────────────────────────────────────────────────────────
 * Monitor pengiriman WA lintas-layanan + lintas-provider.
 * Source: GET /admin/monitoring/wa (engine wa-monitoring-engine.ts).
 *
 * Filosofi:
 *   - Frontend = WAJAH: cuma display. SEMUA agregasi di backend (OTAK).
 *   - Data-driven: dimensi (service/provider/template) dari data nyata,
 *     BUKAN hardcode per-layanan. Layanan baru muncul otomatis.
 *
 * Pattern (mirror AdsFinancialPanel):
 *   - 'use client' + useAuth() token + fetch ${API}
 *   - Tailwind v4 utility (no AdminThemeContext) — Pattern AAP
 *   - lucide icons + cn() helper
 *
 * Beda dari Edukazia dashboard:
 *   - Data-driven 3 dimensi (service/provider/template), bukan hardcode tipe
 *   - Support status skipped_* (Edukazia gak punya) — hotline short code dll
 *   - Card ke-3 = "Dilewati" (skipped), bukan "Delivered" (status itu gak ada di data)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MessageSquare, CheckCircle2, XCircle, MinusCircle, RefreshCw,
  Loader2, AlertTriangle, Layers, Radio, Filter, X, Clock,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const API =
  process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

// ─── Types (mirror response engine) ──────────────────────────────

interface WaSummary {
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  success_rate: number;
}

interface WaDimensionRow {
  key: string;
  total: number;
  sent: number;
  failed: number;
  skipped: number;
}

interface WaRecentLog {
  id: string;
  service: string | null;
  template: string | null;
  provider: string | null;
  phone_masked: string | null;
  status: string;
  created_at: string;
}

interface WaMonitoringData {
  summary: WaSummary;
  by_service: WaDimensionRow[];
  by_provider: WaDimensionRow[];
  by_template: WaDimensionRow[];
  recent: WaRecentLog[];
  recent_total: number;
}

interface ApiResponse {
  success: boolean;
  data?: WaMonitoringData;
  error?: { code: string; message: string };
}

// ─── Label maps (cosmetic; fallback ke raw key kalau gak dikenal) ─

const SERVICE_LABELS: Record<string, string> = {
  auth: 'Login / OTP',
  balapor: 'BALAPOR',
  badonasi: 'BADONASI',
  ads: 'Iklan',
  bakos: 'BAKOS',
  bajasa: 'BAJASA',
  baniaga: 'BANIAGA',
  balaju: 'BALAJU',
  bahibur: 'BAHIBUR',
  bapasiar: 'BAPASIAR',
  baronda: 'BARONDA',
  babayar: 'BABAYAR',
  system: 'Sistem',
};

const PROVIDER_LABELS: Record<string, string> = {
  fonnte: 'Fonnte',
  waha: 'WAHA',
  meta_api: 'Meta API',
  none: '(tidak terkirim)',
};

const TEMPLATE_LABELS: Record<string, string> = {
  otp_login: 'OTP Login',
  sos_admin_alert: 'SOS — Admin',
  sos_authority_alert: 'SOS — Otoritas',
};

const labelOf = (map: Record<string, string>, key: string | null) =>
  key ? (map[key] ?? key) : '—';

// ─── Status badge styling ─────────────────────────────────────────

function statusBadge(status: string): { label: string; cls: string } {
  if (status === 'sent') {
    return { label: 'Terkirim', cls: 'bg-green-100 text-green-700' };
  }
  if (status === 'failed') {
    return { label: 'Gagal', cls: 'bg-red-100 text-red-700' };
  }
  if (status.startsWith('skipped')) {
    const reason =
      status === 'skipped_short_code' ? 'Hotline' :
      status === 'skipped_no_phone' ? 'Tanpa No.' :
      status === 'skipped_invalid' ? 'No. Invalid' : 'Dilewati';
    return { label: reason, cls: 'bg-amber-100 text-amber-700' };
  }
  return { label: status, cls: 'bg-gray-100 text-gray-600' };
}

// ─── Helpers ──────────────────────────────────────────────────────

const formatDateTime = (d: string) =>
  new Date(d).toLocaleString('id-ID', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });

// ─── Component ────────────────────────────────────────────────────

export default function WaMonitoringPanel() {
  const { token, isLoading: authLoading } = useAuth();

  const [data, setData] = useState<WaMonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [serviceFilter, setServiceFilter] = useState<string>('');
  const [providerFilter, setProviderFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (serviceFilter) params.set('service', serviceFilter);
    if (providerFilter) params.set('provider', providerFilter);
    if (statusFilter) params.set('status', statusFilter);

    try {
      const res = await fetch(
        `${API}/admin/monitoring/wa${params.toString() ? `?${params}` : ''}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const json = (await res.json()) as ApiResponse;
      if (json?.success && json.data) {
        setData(json.data);
      } else {
        setError(json?.error?.message ?? 'Gagal memuat data monitoring WA');
      }
    } catch (err: any) {
      setError(err?.message ?? 'Network error');
    } finally {
      setLoading(false);
    }
  }, [token, serviceFilter, providerFilter, statusFilter]);

  useEffect(() => {
    if (!authLoading) fetchData();
  }, [authLoading, fetchData]);

  const hasActiveFilter = !!(serviceFilter || providerFilter || statusFilter);
  const clearFilters = useCallback(() => {
    setServiceFilter('');
    setProviderFilter('');
    setStatusFilter('');
  }, []);

  // Distinct service/provider untuk dropdown filter (dari breakdown)
  const serviceOptions = useMemo(
    () => (data?.by_service ?? []).map((r) => r.key),
    [data],
  );
  const providerOptions = useMemo(
    () => (data?.by_provider ?? []).map((r) => r.key),
    [data],
  );

  const summary = data?.summary;

  return (
    <div className="flex flex-col gap-4">

      {/* ─── Header ─── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#1B6B4A]/12 text-[#1B6B4A]">
            <MessageSquare size={18} />
          </div>
          <div>
            <h2 className="text-[16px] font-extrabold text-gray-900">Notifikasi WA TeraLoka</h2>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Monitor pengiriman WhatsApp lintas-layanan & provider
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wide bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* ─── Error ─── */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
          <AlertTriangle size={14} className="text-red-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-red-700">{error}</p>
        </div>
      )}

      {/* ─── Loading ─── */}
      {loading && !data && (
        <div className="flex items-center justify-center gap-2 py-16 bg-white border border-gray-100 rounded-xl">
          <Loader2 size={16} className="animate-spin text-gray-400" />
          <span className="text-[12px] text-gray-500">Memuat data...</span>
        </div>
      )}

      {/* ─── Stat Cards (4) ─── */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Total */}
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 text-gray-600 mb-2">
              <MessageSquare size={16} />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Total Pesan</p>
            <p className="text-[22px] font-extrabold text-gray-900 tabular-nums mt-1">{summary.total}</p>
          </div>

          {/* Terkirim */}
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-green-100 text-green-700 mb-2">
              <CheckCircle2 size={16} />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Terkirim</p>
            <p className="text-[22px] font-extrabold text-green-700 tabular-nums mt-1">{summary.sent}</p>
          </div>

          {/* Dilewati (skipped) — ganti "Delivered" yg gak ada di data */}
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-100 text-amber-700 mb-2">
              <MinusCircle size={16} />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Dilewati</p>
            <p className="text-[22px] font-extrabold text-amber-700 tabular-nums mt-1">{summary.skipped}</p>
          </div>

          {/* Gagal + success rate */}
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-red-100 text-red-700 mb-2">
              <XCircle size={16} />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Gagal</p>
            <p className="text-[22px] font-extrabold text-red-700 tabular-nums mt-1">
              {summary.failed}
              <span className="text-[11px] font-semibold text-gray-400 ml-2">
                {summary.success_rate}% sukses
              </span>
            </p>
          </div>
        </div>
      )}

      {/* ─── Breakdown per Service + per Provider ─── */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Per Service */}
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
              <Layers size={14} className="text-[#1B6B4A]" />
              <h3 className="text-[12px] font-bold text-gray-900 uppercase tracking-wider">Per Layanan</h3>
            </div>
            {data.by_service.length === 0 ? (
              <p className="text-[11px] text-gray-400 px-4 py-6 text-center">Belum ada data</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {data.by_service.map((row) => (
                  <div key={row.key} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-[12px] font-semibold text-gray-700">{labelOf(SERVICE_LABELS, row.key)}</span>
                    <div className="flex items-center gap-2 text-[10px] tabular-nums">
                      <span className="text-green-700 font-bold">{row.sent} terkirim</span>
                      {row.skipped > 0 && <span className="text-amber-600">{row.skipped} dilewati</span>}
                      {row.failed > 0 && <span className="text-red-600">{row.failed} gagal</span>}
                      <span className="text-gray-400">/ {row.total}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Per Provider */}
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
              <Radio size={14} className="text-[#0891B2]" />
              <h3 className="text-[12px] font-bold text-gray-900 uppercase tracking-wider">Per Provider</h3>
            </div>
            {data.by_provider.length === 0 ? (
              <p className="text-[11px] text-gray-400 px-4 py-6 text-center">Belum ada data</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {data.by_provider.map((row) => (
                  <div key={row.key} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-[12px] font-semibold text-gray-700">{labelOf(PROVIDER_LABELS, row.key)}</span>
                    <div className="flex items-center gap-2 text-[10px] tabular-nums">
                      <span className="text-green-700 font-bold">{row.sent} terkirim</span>
                      {row.skipped > 0 && <span className="text-amber-600">{row.skipped} dilewati</span>}
                      {row.failed > 0 && <span className="text-red-600">{row.failed} gagal</span>}
                      <span className="text-gray-400">/ {row.total}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Filter Bar ─── */}
      {data && (
        <div className="flex items-center gap-2 flex-wrap p-3 bg-gray-50 border border-gray-100 rounded-xl">
          <Filter size={14} className="text-gray-400 shrink-0" />

          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="text-[11px] font-semibold rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-gray-700"
          >
            <option value="">Semua Layanan</option>
            {serviceOptions.map((s) => (
              <option key={s} value={s}>{labelOf(SERVICE_LABELS, s)}</option>
            ))}
          </select>

          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="text-[11px] font-semibold rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-gray-700"
          >
            <option value="">Semua Provider</option>
            {providerOptions.map((p) => (
              <option key={p} value={p}>{labelOf(PROVIDER_LABELS, p)}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-[11px] font-semibold rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-gray-700"
          >
            <option value="">Semua Status</option>
            <option value="sent">Terkirim</option>
            <option value="failed">Gagal</option>
            <option value="skipped_short_code">Dilewati — Hotline</option>
            <option value="skipped_no_phone">Dilewati — Tanpa No.</option>
            <option value="skipped_invalid">Dilewati — No. Invalid</option>
          </select>

          {hasActiveFilter && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors"
            >
              <X size={11} /> Reset
            </button>
          )}
        </div>
      )}

      {/* ─── Tabel Log ─── */}
      {data && (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-[12px] font-bold text-gray-900 uppercase tracking-wider">Log Pengiriman</h3>
            <span className="text-[10px] font-mono text-gray-400">{data.recent.length} terbaru</span>
          </div>

          {data.recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <MessageSquare className="text-gray-300 mb-2" size={32} />
              <p className="text-[12px] text-gray-500">Belum ada log untuk filter ini</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-[9px] font-bold text-gray-500 uppercase tracking-wider">Tipe</th>
                    <th className="px-3 py-2 text-left text-[9px] font-bold text-gray-500 uppercase tracking-wider">Layanan</th>
                    <th className="px-3 py-2 text-left text-[9px] font-bold text-gray-500 uppercase tracking-wider">Penerima</th>
                    <th className="px-3 py-2 text-left text-[9px] font-bold text-gray-500 uppercase tracking-wider">Provider</th>
                    <th className="px-3 py-2 text-center text-[9px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-3 py-2 text-left text-[9px] font-bold text-gray-500 uppercase tracking-wider">Waktu</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent.map((log) => {
                    const badge = statusBadge(log.status);
                    return (
                      <tr key={log.id} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="px-3 py-2.5 text-[11px] font-semibold text-gray-700">{labelOf(TEMPLATE_LABELS, log.template)}</td>
                        <td className="px-3 py-2.5 text-[11px] text-gray-600">{labelOf(SERVICE_LABELS, log.service)}</td>
                        <td className="px-3 py-2.5 font-mono text-[10px] text-gray-500">{log.phone_masked ?? '—'}</td>
                        <td className="px-3 py-2.5 text-[10px] text-gray-500">{labelOf(PROVIDER_LABELS, log.provider)}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold', badge.cls)}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-[10px] text-gray-500 whitespace-nowrap">
                          <Clock size={9} className="inline mr-1" />
                          {formatDateTime(log.created_at)}
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
      <div className="flex items-start gap-2 p-3 rounded-lg bg-[#0891B2]/4 border border-[#0891B2]/20">
        <MessageSquare size={12} className="text-[#0891B2] shrink-0 mt-0.5" />
        <p className="text-[10px] text-[#0891B2] leading-relaxed">
          <strong>Source:</strong> notification_logs (lintas-layanan + provider).
          Layanan baru otomatis muncul saat mulai kirim WA via sendCriticalWA.
          "Dilewati" = nomor tidak deliverable (hotline / kosong / invalid).
        </p>
      </div>
    </div>
  );
}
