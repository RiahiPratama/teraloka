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
 *   - Tailwind v4 SEMANTIC TOKEN (bg-surface/text-text/border-border/
 *     status-*) — adaptif dark/light otomatis (Pattern AAP). NO hardcode
 *     warna gray/white (fix 4 Jun: panel awal hardcode → gak ikut dark mode).
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

// ─── Status badge styling (token semantik, adaptif theme) ─────────

function statusBadge(status: string): { label: string; cls: string } {
  if (status === 'sent') {
    return { label: 'Terkirim', cls: 'bg-status-healthy/12 text-status-healthy' };
  }
  if (status === 'failed') {
    return { label: 'Gagal', cls: 'bg-status-critical/12 text-status-critical' };
  }
  if (status.startsWith('skipped')) {
    const reason =
      status === 'skipped_short_code' ? 'Hotline' :
      status === 'skipped_no_phone' ? 'Tanpa No.' :
      status === 'skipped_invalid' ? 'No. Invalid' : 'Dilewati';
    return { label: reason, cls: 'bg-status-warning/12 text-status-warning' };
  }
  return { label: status, cls: 'bg-surface-muted text-text-muted' };
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
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-status-healthy/12 text-status-healthy">
            <MessageSquare size={18} />
          </div>
          <div>
            <h2 className="text-[16px] font-extrabold text-text">Notifikasi WA TeraLoka</h2>
            <p className="text-[11px] text-text-muted mt-0.5">
              Monitor pengiriman WhatsApp lintas-layanan &amp; provider
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
          {/* Total */}
          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-surface-muted text-text-muted mb-2">
              <MessageSquare size={16} />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-text-muted">Total Pesan</p>
            <p className="text-[22px] font-extrabold text-text tabular-nums mt-1">{summary.total}</p>
          </div>

          {/* Terkirim */}
          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-status-healthy/12 text-status-healthy mb-2">
              <CheckCircle2 size={16} />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-text-muted">Terkirim</p>
            <p className="text-[22px] font-extrabold text-status-healthy tabular-nums mt-1">{summary.sent}</p>
          </div>

          {/* Dilewati (skipped) — ganti "Delivered" yg gak ada di data */}
          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-status-warning/12 text-status-warning mb-2">
              <MinusCircle size={16} />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-text-muted">Dilewati</p>
            <p className="text-[22px] font-extrabold text-status-warning tabular-nums mt-1">{summary.skipped}</p>
          </div>

          {/* Gagal + success rate */}
          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-status-critical/12 text-status-critical mb-2">
              <XCircle size={16} />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-text-muted">Gagal</p>
            <p className="text-[22px] font-extrabold text-status-critical tabular-nums mt-1">
              {summary.failed}
              <span className="text-[11px] font-semibold text-text-subtle ml-2">
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
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <Layers size={14} className="text-status-healthy" />
              <h3 className="text-[12px] font-bold text-text uppercase tracking-wider">Per Layanan</h3>
            </div>
            {data.by_service.length === 0 ? (
              <p className="text-[11px] text-text-subtle px-4 py-6 text-center">Belum ada data</p>
            ) : (
              <div className="divide-y divide-border">
                {data.by_service.map((row) => (
                  <div key={row.key} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-[12px] font-semibold text-text">{labelOf(SERVICE_LABELS, row.key)}</span>
                    <div className="flex items-center gap-2 text-[10px] tabular-nums">
                      <span className="text-status-healthy font-bold">{row.sent} terkirim</span>
                      {row.skipped > 0 && <span className="text-status-warning">{row.skipped} dilewati</span>}
                      {row.failed > 0 && <span className="text-status-critical">{row.failed} gagal</span>}
                      <span className="text-text-subtle">/ {row.total}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Per Provider */}
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <Radio size={14} className="text-status-info" />
              <h3 className="text-[12px] font-bold text-text uppercase tracking-wider">Per Provider</h3>
            </div>
            {data.by_provider.length === 0 ? (
              <p className="text-[11px] text-text-subtle px-4 py-6 text-center">Belum ada data</p>
            ) : (
              <div className="divide-y divide-border">
                {data.by_provider.map((row) => (
                  <div key={row.key} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-[12px] font-semibold text-text">{labelOf(PROVIDER_LABELS, row.key)}</span>
                    <div className="flex items-center gap-2 text-[10px] tabular-nums">
                      <span className="text-status-healthy font-bold">{row.sent} terkirim</span>
                      {row.skipped > 0 && <span className="text-status-warning">{row.skipped} dilewati</span>}
                      {row.failed > 0 && <span className="text-status-critical">{row.failed} gagal</span>}
                      <span className="text-text-subtle">/ {row.total}</span>
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
        <div className="flex items-center gap-2 flex-wrap p-3 bg-surface-muted border border-border rounded-xl">
          <Filter size={14} className="text-text-subtle shrink-0" />

          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="text-[11px] font-semibold rounded-lg border border-border bg-surface px-2.5 py-1.5 text-text"
          >
            <option value="">Semua Layanan</option>
            {serviceOptions.map((s) => (
              <option key={s} value={s}>{labelOf(SERVICE_LABELS, s)}</option>
            ))}
          </select>

          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="text-[11px] font-semibold rounded-lg border border-border bg-surface px-2.5 py-1.5 text-text"
          >
            <option value="">Semua Provider</option>
            {providerOptions.map((p) => (
              <option key={p} value={p}>{labelOf(PROVIDER_LABELS, p)}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-[11px] font-semibold rounded-lg border border-border bg-surface px-2.5 py-1.5 text-text"
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
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide bg-surface-muted text-text-muted hover:text-text transition-colors"
            >
              <X size={11} /> Reset
            </button>
          )}
        </div>
      )}

      {/* ─── Tabel Log ─── */}
      {data && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-[12px] font-bold text-text uppercase tracking-wider">Log Pengiriman</h3>
            <span className="text-[10px] font-mono text-text-subtle">{data.recent.length} terbaru</span>
          </div>

          {data.recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <MessageSquare className="text-text-subtle mb-2" size={32} />
              <p className="text-[12px] text-text-muted">Belum ada log untuk filter ini</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-surface-muted/40">
                  <tr>
                    <th className="px-3 py-2 text-left text-[9px] font-bold text-text-muted uppercase tracking-wider">Tipe</th>
                    <th className="px-3 py-2 text-left text-[9px] font-bold text-text-muted uppercase tracking-wider">Layanan</th>
                    <th className="px-3 py-2 text-left text-[9px] font-bold text-text-muted uppercase tracking-wider">Penerima</th>
                    <th className="px-3 py-2 text-left text-[9px] font-bold text-text-muted uppercase tracking-wider">Provider</th>
                    <th className="px-3 py-2 text-center text-[9px] font-bold text-text-muted uppercase tracking-wider">Status</th>
                    <th className="px-3 py-2 text-left text-[9px] font-bold text-text-muted uppercase tracking-wider">Waktu</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent.map((log) => {
                    const badge = statusBadge(log.status);
                    return (
                      <tr key={log.id} className="border-t border-border hover:bg-surface-muted/30 transition-colors">
                        <td className="px-3 py-2.5 text-[11px] font-semibold text-text">{labelOf(TEMPLATE_LABELS, log.template)}</td>
                        <td className="px-3 py-2.5 text-[11px] text-text-muted">{labelOf(SERVICE_LABELS, log.service)}</td>
                        <td className="px-3 py-2.5 font-mono text-[10px] text-text-muted">{log.phone_masked ?? '—'}</td>
                        <td className="px-3 py-2.5 text-[10px] text-text-muted">{labelOf(PROVIDER_LABELS, log.provider)}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold', badge.cls)}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-[10px] text-text-muted whitespace-nowrap">
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
      <div className="flex items-start gap-2 p-3 rounded-lg bg-status-info/4 border border-status-info/20">
        <MessageSquare size={12} className="text-status-info shrink-0 mt-0.5" />
        <p className="text-[10px] text-status-info leading-relaxed">
          <strong>Source:</strong> notification_logs (lintas-layanan + provider).
          Layanan baru otomatis muncul saat mulai kirim WA via sendCriticalWA.
          &quot;Dilewati&quot; = nomor tidak deliverable (hotline / kosong / invalid).
        </p>
      </div>
    </div>
  );
}
