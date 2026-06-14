'use client';

/**
 * TeraLoka — BAKABAR Action Queue ("Perlu Tindak Lanjut")
 * Wave 1 (1 Juni 2026) · revisi layout selevel BADONASI
 * ------------------------------------------------------------
 * Stat-card row actionable, di dalam tab Overview.
 *
 * Label section = "Perlu Tindak Lanjut" (BUKAN "Mission Control")
 * supaya gak duplikat label box Mission Control di sidebar.
 *
 * 4 bucket → tindak lanjut:
 *   - Draft Mangkrak       → onReviewStaleDrafts() (filter draft + scroll)
 *   - RSS Belum Dikurasi   → /admin/rss
 *   - Opini Menunggu Review→ (Wave 2-3, count-only)
 *   - Suara Warga Siap     → /admin/balapor (tab Convert BAKABAR)
 *
 * Styling: Card + tone token (status-warning/info/healthy) — mode-aware.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Zap } from 'lucide-react';
import { useApi, ApiError } from '@/lib/api/client';
import { Card } from '@/components/ui/card';

interface ActionQueue {
  total: number;
  stale_drafts: number;
  rss_pending: number;
  review_pending: number;
  balapor_candidates: number;
}

interface Props {
  /** Reuse handler dari page: filter status=draft + scroll ke Manajemen. */
  onReviewStaleDrafts?: () => void;
}

type Tone = 'warning' | 'info' | 'healthy' | 'default';

const TONE_CLASS: Record<Tone, string> = {
  warning: 'text-status-warning bg-status-warning/12',
  info: 'text-status-info bg-status-info/12',
  healthy: 'text-status-healthy bg-status-healthy/12',
  default: 'text-text-muted bg-surface-muted',
};

/* ─── Inline SVG icons (20px, lucide style) ─── */
const IconDraft = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
);
const IconRss = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 11a9 9 0 0 1 9 9" /><path d="M4 4a16 16 0 0 1 16 16" /><circle cx="5" cy="19" r="1" /></svg>
);
const IconReview = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
);
const IconMegaphone = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3 11 18-5v12L3 14v-3z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></svg>
);

interface BucketDef {
  key: keyof Omit<ActionQueue, 'total'>;
  icon: React.ReactNode;
  label: string;
  tone: Tone;
  /** Teks badge aksi di pojok (uppercase). */
  action: string;
  href?: string;
  onClickKey?: 'staleDrafts';
}

const BUCKETS: BucketDef[] = [
  { key: 'stale_drafts', icon: <IconDraft />, label: 'Draft Mangkrak', tone: 'warning', action: 'Tinjau →', onClickKey: 'staleDrafts' },
  { key: 'rss_pending', icon: <IconRss />, label: 'RSS Belum Dikurasi', tone: 'info', action: 'Kurasi →', href: '/admin/rss' },
  { key: 'review_pending', icon: <IconReview />, label: 'Opini Menunggu Review', tone: 'default', action: 'Review →' },
  { key: 'balapor_candidates', icon: <IconMegaphone />, label: 'Suara Warga Siap Terbit', tone: 'healthy', action: 'Terbitkan →', href: '/admin/balapor' },
];

export function MissionControlBakabar({ onReviewStaleDrafts }: Props) {
  const api = useApi();
  const [queue, setQueue] = useState<ActionQueue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await api.get<unknown>('/admin/bakabar/command-center', {
          params: { period: '7d' },
          signal: controller.signal,
        });
        if (cancelled) return;
        const aq =
          (res as any)?.action_queue ??
          (res as any)?.data?.action_queue ??
          null;
        setQueue(aq);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) setError(err.message);
        else if ((err as Error).name !== 'AbortError')
          setError('Gagal memuat antrian aksi');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [api, retryNonce]);

  /* Section header (label "Perlu Tindak Lanjut" — bukan "Mission Control") */
  const header = (
    <div className="flex items-center justify-between gap-3 mb-3">
      <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide flex items-center gap-1.5">
        <Zap size={15} className="text-text-muted shrink-0" aria-hidden /> Perlu Tindak Lanjut
      </h2>
      {queue && (
        <span className="text-xs text-text-muted">
          <span className="font-bold text-text tabular-nums">
            {queue.total.toLocaleString('id-ID')}
          </span>{' '}
          aksi menunggu
        </span>
      )}
    </div>
  );

  if (loading) {
    return (
      <div>
        {header}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-surface-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        {header}
        <div className="rounded-xl border border-status-critical/30 bg-status-critical/10 p-4 flex items-center justify-between gap-3">
          <span className="text-sm text-status-critical flex items-center gap-1.5"><AlertTriangle size={16} aria-hidden /> {error}</span>
          <button
            onClick={() => setRetryNonce((n) => n + 1)}
            className="text-xs font-semibold text-status-critical underline hover:no-underline shrink-0"
          >
            Coba lagi
          </button>
        </div>
      </div>
    );
  }

  if (!queue) return null;

  return (
    <div>
      {header}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {BUCKETS.map((b) => {
          const count = queue[b.key];
          const active = count > 0;

          const inner = (
            <Card padded className="h-full">
              <div className="flex items-start justify-between gap-2">
                <div
                  className={`flex items-center justify-center h-10 w-10 rounded-lg shrink-0 ${
                    active ? TONE_CLASS[b.tone] : TONE_CLASS.default
                  }`}
                >
                  {b.icon}
                </div>
                {active && (b.href || b.onClickKey) && (
                  <span className="text-[10px] font-bold uppercase tracking-wide text-brand-teal">
                    {b.action}
                  </span>
                )}
              </div>
              <p
                className={`text-2xl font-bold mt-3 leading-none tabular-nums ${
                  active ? 'text-text' : 'text-text-muted'
                }`}
              >
                {count.toLocaleString('id-ID')}
              </p>
              <p className="text-xs font-medium text-text-muted mt-1 leading-tight">
                {b.label}
              </p>
            </Card>
          );

          if (b.href && active) {
            return (
              <Link key={b.key} href={b.href} className="block transition-transform hover:-translate-y-0.5">
                {inner}
              </Link>
            );
          }
          if (b.onClickKey === 'staleDrafts' && onReviewStaleDrafts && active) {
            return (
              <button key={b.key} onClick={onReviewStaleDrafts} className="block w-full text-left transition-transform hover:-translate-y-0.5">
                {inner}
              </button>
            );
          }
          return (
            <div key={b.key} className="opacity-70">
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}
