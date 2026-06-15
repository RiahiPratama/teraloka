'use client';

/**
 * TeraLoka — System Health
 * ------------------------------------------------------------
 * Observability internal (super_admin). Konsumsi backend /health/deep LIVE
 * via PROXY server-side /api/health (HEALTH_SECRET TIDAK pernah ke browser).
 *
 * Final 4 service, dikelompokkan: Core (API + Supabase) vs Notifikasi WA
 * (Fonnte + WAHA). 🛡️ a11y: status pakai ikon + label teks + warna (bukan warna
 * doang). 🔴 WAHA: surface session + detail mentah + actionable.
 *
 * Level 1 — stateless, murni dari response. TANPA tabel/cron/migration.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  SERVICE_META,
  GROUPS,
  TONE_TEXT,
  TONE_BG,
  latencyTone,
  type StatusTone,
} from '@/components/admin/system-health/shared';
import { HealthHistorySection } from '@/components/admin/system-health/health-history-section';
import type {
  DeepHealth,
  HealthServiceKey,
  ServiceHealth,
} from '@/types/health';

function statusView(status: string | undefined): {
  label: string;
  tone: StatusTone;
  Icon: LucideIcon;
} {
  const v = (status ?? '').toLowerCase();
  if (v === 'ok' || v === 'healthy' || v === 'up')
    return { label: 'Operational', tone: 'healthy', Icon: CheckCircle2 };
  if (v === 'degraded' || v === 'warning' || v === 'slow')
    return { label: 'Degraded', tone: 'warning', Icon: AlertTriangle };
  if (!v || v === 'unknown')
    return { label: 'Unknown', tone: 'neutral', Icon: HelpCircle };
  return { label: 'Down', tone: 'critical', Icon: XCircle };
}

/* ─── WAHA helpers (paling rapuh — device fisik) ─── */
function wahaDetailTone(detail: string | undefined): StatusTone {
  switch ((detail ?? '').toUpperCase()) {
    case 'WORKING':
      return 'healthy';
    case 'SCAN_QR_CODE':
    case 'STARTING':
      return 'warning';
    case 'FAILED':
    case 'STOPPED':
      return 'critical';
    default:
      return 'neutral';
  }
}

function wahaHint(detail: string | undefined): string | null {
  switch ((detail ?? '').toUpperCase()) {
    case 'WORKING':
      return null;
    case 'SCAN_QR_CODE':
      return 'Session logout — scan QR ulang di server WAHA.';
    case 'FAILED':
      return 'Session gagal — restart WAHA lalu scan QR ulang.';
    case 'STOPPED':
      return 'Session berhenti — start WAHA & scan QR.';
    default:
      return detail ? `Status session: ${detail}` : null;
  }
}

/* ─── Relative "Xs lalu" (counter hidup) ─── */
function agoLabel(iso: string, now: number): string {
  const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s} detik lalu`;
  if (s < 3600) return `${Math.floor(s / 60)} menit ${s % 60} detik lalu`;
  return `${Math.floor(s / 3600)} jam lalu`;
}

export default function SystemHealthPage() {
  const { token } = useAuth();
  const [data, setData] = useState<DeepHealth | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(
    async (manual = false) => {
      if (!token) return;
      if (manual) setRefreshing(true);
      try {
        const res = await fetch('/api/health', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.success) {
          setErr(json?.error?.message ?? 'Gagal memuat status sistem.');
        } else {
          setData(json.data as DeepHealth);
          setErr(null);
        }
      } catch {
        setErr('Tidak bisa memuat status sistem.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  // Auto-refresh tiap 30s + initial load.
  useEffect(() => {
    if (!token) return;
    load();
    const id = setInterval(() => load(), 30_000);
    return () => clearInterval(id);
  }, [token, load]);

  // Timestamp hidup — tick tiap detik (JS, bukan animasi → aman reduced-motion).
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, []);

  const overall = data ? statusView(data.status) : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-text tracking-tight flex items-center gap-2">
            <Activity size={24} className="text-brand-teal" />
            System Health
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Monitoring infrastruktur TeraLoka — realtime
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={
            <RefreshCw
              size={13}
              className={cn(refreshing && 'animate-spin motion-reduce:animate-none')}
            />
          }
          onClick={() => load(true)}
          disabled={refreshing}
        >
          Refresh
        </Button>
      </div>

      {/* Loading awal */}
      {loading && !data && !err && (
        <div className="text-center py-16 text-text-muted text-sm">
          Memuat status sistem…
        </div>
      )}

      {/* Error / setup notice */}
      {err && (
        <div className="flex items-start gap-3 rounded-xl bg-status-critical/8 border border-status-critical/20 px-4 py-3">
          <AlertTriangle size={18} className="text-status-critical shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-status-critical">
              Gagal memuat status
            </p>
            <p className="text-xs text-text-muted mt-0.5">{err}</p>
          </div>
        </div>
      )}

      {/* Banner ringkasan */}
      {data && overall && (
        <div
          className={cn(
            'rounded-2xl border p-5 flex items-center gap-4 flex-wrap',
            overall.tone === 'healthy' && 'bg-status-healthy/8 border-status-healthy/25',
            overall.tone === 'warning' && 'bg-status-warning/8 border-status-warning/25',
            overall.tone === 'critical' && 'bg-status-critical/8 border-status-critical/25',
            overall.tone === 'neutral' && 'bg-surface border-border'
          )}
        >
          {/* Live pulse dot — hormati prefers-reduced-motion */}
          <span className="relative flex h-3 w-3 shrink-0" aria-hidden="true">
            <span
              className={cn(
                'absolute inline-flex h-full w-full rounded-full opacity-60',
                'animate-ping motion-reduce:animate-none',
                TONE_BG[overall.tone]
              )}
            />
            <span className={cn('relative inline-flex h-3 w-3 rounded-full', TONE_BG[overall.tone])} />
          </span>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <overall.Icon size={20} className={TONE_TEXT[overall.tone]} />
              <span className={cn('text-lg font-bold', TONE_TEXT[overall.tone])}>
                {data.status === 'ok' ? 'Semua sistem normal' : 'Sebagian layanan terganggu'}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-1 tabular-nums" aria-live="polite">
              Diperiksa {agoLabel(data.checked_at, now)}
            </p>
          </div>

          <Badge variant="status" status={overall.tone} size="md">
            {data.status === 'ok' ? 'OK' : 'DEGRADED'}
          </Badge>
        </div>
      )}

      {/* Service groups */}
      {data &&
        GROUPS.map((g) => (
          <section key={g.title} className="space-y-2.5">
            <h2 className="text-[12px] font-bold uppercase tracking-wide text-text-secondary flex items-center gap-2">
              <g.Icon size={14} className="text-text-muted" />
              {g.title}
              <span className="font-medium normal-case text-text-muted">· {g.desc}</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {g.keys.map((key) => (
                <ServiceCard key={key} svcKey={key} svc={data.services?.[key]} />
              ))}
            </div>
          </section>
        ))}

      {/* ─── Level 2 — Riwayat (historis) ─── */}
      {data && <HealthHistorySection />}
    </div>
  );
}

/* ─── Latency meter (visual bar + angka) ─── */
function LatencyMeter({ ms }: { ms: number }) {
  const tone = latencyTone(ms);
  const pct = Math.min(100, Math.max(4, (ms / 1000) * 100));
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="text-text-muted">Latency</span>
        <span className={cn('font-semibold tabular-nums', TONE_TEXT[tone])}>{ms} ms</span>
      </div>
      <div
        className="h-1.5 w-full rounded-full bg-surface-muted overflow-hidden"
        role="img"
        aria-label={`Latency ${ms} milidetik (${tone === 'healthy' ? 'cepat' : tone === 'warning' ? 'sedang' : 'lambat'})`}
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none',
            TONE_BG[tone]
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ─── Service card ─── */
function ServiceCard({
  svcKey,
  svc,
}: {
  svcKey: HealthServiceKey;
  svc: ServiceHealth | undefined;
}) {
  const meta = SERVICE_META[svcKey];
  const view = statusView(svc?.status);
  const isWaha = svcKey === 'waha';
  const hint = isWaha ? wahaHint(svc?.detail) : null;

  return (
    <div
      className={cn(
        'rounded-xl border bg-surface p-4',
        // WAHA dikasih bobot lebih (paling rapuh).
        isWaha ? 'border-border ring-1 ring-inset ring-border/60' : 'border-border'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="grid place-items-center h-9 w-9 rounded-lg bg-surface-muted text-text-secondary shrink-0">
            <meta.Icon size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-text leading-tight">{meta.label}</p>
            <p className="text-xs text-text-muted">{meta.desc}</p>
          </div>
        </div>

        {/* Status: ikon + label + warna (a11y — bukan warna doang) */}
        <Badge variant="status" status={view.tone} size="sm" className="gap-1">
          <view.Icon size={12} aria-hidden="true" />
          {view.label}
        </Badge>
      </div>

      {/* Latency visual */}
      {typeof svc?.latency_ms === 'number' && <LatencyMeter ms={svc.latency_ms} />}

      {/* 🔴 WAHA: session + detail mentah (selalu tampil, bukan cuma "Operational") */}
      {isWaha && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-text-muted">Session</span>
            <span className="font-semibold text-text-secondary">
              {svc?.session ?? 'default'}
            </span>
            {svc?.detail && (
              <Badge variant="status" status={wahaDetailTone(svc.detail)} size="xs">
                {svc.detail}
              </Badge>
            )}
          </div>

          {hint && (
            <div className="flex items-start gap-2 rounded-lg bg-status-warning/10 border border-status-warning/25 px-3 py-2">
              <AlertTriangle size={14} className="text-status-warning shrink-0 mt-0.5" />
              <p className="text-xs text-text-secondary">{hint}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
