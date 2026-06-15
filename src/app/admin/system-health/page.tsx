'use client';

/**
 * TeraLoka — System Health
 * ------------------------------------------------------------
 * Observability internal (super_admin). Konsumsi backend /health/deep LIVE
 * via PROXY server-side /api/health (HEALTH_SECRET TIDAK pernah ke browser).
 *
 * Final 4 service: self(API), Supabase, Fonnte, WAHA. (Vercel & Upstash di-drop.)
 * 🛡️ a11y: status pakai ikon + label teks + warna (bukan warna doang).
 * 🔴 WAHA: surface detail session (SCAN_QR_CODE/FAILED/STOPPED) + actionable.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  Server,
  Database,
  KeyRound,
  MessageCircle,
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
import type {
  DeepHealth,
  HealthServiceKey,
  ServiceHealth,
} from '@/types/health';

/* ─── Service metadata (label + deskripsi fungsi + ikon) ─── */
const SERVICE_META: Record<
  HealthServiceKey,
  { label: string; desc: string; Icon: LucideIcon }
> = {
  self: { label: 'API', desc: 'Backend TeraLoka', Icon: Server },
  supabase: { label: 'Supabase', desc: 'Database', Icon: Database },
  fonnte: { label: 'Fonnte', desc: 'WhatsApp OTP', Icon: KeyRound },
  waha: { label: 'WAHA', desc: 'WhatsApp Notifikasi', Icon: MessageCircle },
};

const SERVICE_ORDER: HealthServiceKey[] = ['self', 'supabase', 'fonnte', 'waha'];

/* ─── Status → tampilan (ikon + label + tone Badge) ─── */
type StatusTone = 'healthy' | 'warning' | 'critical' | 'neutral';

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

const TONE_TEXT: Record<StatusTone, string> = {
  healthy: 'text-status-healthy',
  warning: 'text-status-warning',
  critical: 'text-status-critical',
  neutral: 'text-text-muted',
};
const TONE_BG: Record<StatusTone, string> = {
  healthy: 'bg-status-healthy',
  warning: 'bg-status-warning',
  critical: 'bg-status-critical',
  neutral: 'bg-text-muted',
};

/* ─── WAHA actionable hint (paling rapuh — device fisik) ─── */
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

/* ─── Relative "Xs lalu" ─── */
function agoLabel(iso: string): string {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s} detik lalu`;
  if (s < 3600) return `${Math.floor(s / 60)} menit lalu`;
  return `${Math.floor(s / 3600)} jam lalu`;
}

export default function SystemHealthPage() {
  const { token } = useAuth();
  const [data, setData] = useState<DeepHealth | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const overall = data ? statusView(data.status) : null;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
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
            'rounded-2xl border p-4 flex items-center gap-4 flex-wrap',
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
              <overall.Icon size={18} className={TONE_TEXT[overall.tone]} />
              <span className={cn('text-base font-bold', TONE_TEXT[overall.tone])}>
                {data.status === 'ok' ? 'Semua sistem normal' : 'Sebagian layanan terganggu'}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Diperiksa {agoLabel(data.checked_at)}
            </p>
          </div>

          <Badge variant="status" status={overall.tone} size="md">
            {data.status === 'ok' ? 'OK' : 'DEGRADED'}
          </Badge>
        </div>
      )}

      {/* Service grid */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SERVICE_ORDER.map((key) => (
            <ServiceCard key={key} svcKey={key} svc={data.services?.[key]} />
          ))}
        </div>
      )}
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
  const hint = svcKey === 'waha' ? wahaHint(svc?.detail) : null;

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
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

      {/* Latency */}
      {typeof svc?.latency_ms === 'number' && (
        <p className="mt-3 text-xs text-text-muted">
          Latency: <span className="font-semibold text-text-secondary">{svc.latency_ms} ms</span>
        </p>
      )}

      {/* 🔴 WAHA actionable */}
      {hint && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-status-warning/10 border border-status-warning/25 px-3 py-2">
          <AlertTriangle size={14} className="text-status-warning shrink-0 mt-0.5" />
          <div className="min-w-0">
            {svc?.detail && (
              <p className="text-[11px] font-bold uppercase tracking-wide text-status-warning">
                {svc.detail}
              </p>
            )}
            <p className="text-xs text-text-secondary">{hint}</p>
          </div>
        </div>
      )}
    </div>
  );
}
