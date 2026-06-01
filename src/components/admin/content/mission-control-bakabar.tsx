'use client';

/**
 * TeraLoka — Mission Control BAKABAR (Action Queue)
 * Wave 1 (1 Juni 2026)
 * ------------------------------------------------------------
 * Strip "X aksi menunggu" ala BALAPOR Mission Control.
 * Self-contained: fetch /admin/bakabar/command-center sendiri,
 * render 4 bucket Action Queue yang clickable (anti vanity metric).
 *
 * Bucket → tindak lanjut:
 *   - Draft mangkrak    → onReviewStaleDrafts() (filter draft + scroll)
 *   - RSS belum kurasi  → /admin/rss
 *   - Opini review      → (Wave 2-3, sekarang count-only)
 *   - Suara warga siap  → /admin/balapor (tab Convert BAKABAR)
 *
 * Styling: Tailwind semantic token (mode-aware) — konsisten dgn page.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useApi, ApiError } from '@/lib/api/client';

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

interface BucketDef {
  key: keyof Omit<ActionQueue, 'total'>;
  icon: string;
  label: string;
  /** true = warna urgent (status-critical) saat count > 0. */
  urgent?: boolean;
  href?: string;
  onClickKey?: 'staleDrafts';
}

const BUCKETS: BucketDef[] = [
  {
    key: 'stale_drafts',
    icon: '📝',
    label: 'Draft Mangkrak',
    urgent: true,
    onClickKey: 'staleDrafts',
  },
  {
    key: 'rss_pending',
    icon: '📡',
    label: 'RSS Belum Dikurasi',
    href: '/admin/rss',
  },
  {
    key: 'review_pending',
    icon: '👁️',
    label: 'Opini Menunggu Review',
  },
  {
    key: 'balapor_candidates',
    icon: '📣',
    label: 'Suara Warga Siap Terbit',
    href: '/admin/balapor',
  },
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
        // Defensif: api.get bisa unwrap .data atau return raw {success,data}.
        const aq =
          (res as any)?.action_queue ??
          (res as any)?.data?.action_queue ??
          null;
        setQueue(aq);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) setError(err.message);
        else if ((err as Error).name !== 'AbortError')
          setError('Gagal memuat Mission Control');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [api, retryNonce]);

  /* ─── Loading skeleton ─── */
  if (loading) {
    return (
      <div className="mb-6 rounded-xl border border-border bg-surface p-4 sm:p-5">
        <div className="h-5 w-40 rounded bg-surface-muted animate-pulse mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 rounded-lg bg-surface-muted animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  /* ─── Error state ─── */
  if (error) {
    return (
      <div className="mb-6 rounded-xl border border-status-critical/30 bg-status-critical/10 p-4 flex items-center justify-between gap-3">
        <span className="text-sm text-status-critical">
          ⚠️ Mission Control: {error}
        </span>
        <button
          onClick={() => setRetryNonce((n) => n + 1)}
          className="text-xs font-semibold text-status-critical underline hover:no-underline shrink-0"
        >
          Coba lagi
        </button>
      </div>
    );
  }

  if (!queue) return null;

  const allClear = queue.total === 0;

  return (
    <div className="mb-6 rounded-xl border border-border bg-surface p-4 sm:p-5">
      {/* Header */}
      <div className="flex items-end justify-between gap-3 mb-4">
        <div>
          <p className="text-xs font-bold text-text-muted uppercase tracking-wide flex items-center gap-1.5">
            <span>⚡</span> Mission Control
          </p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-text tabular-nums">
              {queue.total.toLocaleString('id-ID')}
            </span>
            <span className="text-sm text-text-muted">
              {allClear ? 'semua beres ✓' : 'aksi menunggu'}
            </span>
          </p>
        </div>
        {!allClear && (
          <p className="hidden sm:block text-xs text-text-muted max-w-[180px] text-right">
            Klik bucket untuk tindak lanjut
          </p>
        )}
      </div>

      {/* Bucket grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {BUCKETS.map((b) => {
          const count = queue[b.key];
          const isUrgent = b.urgent && count > 0;
          const numberColor = isUrgent ? 'text-status-critical' : 'text-brand-teal';

          const inner = (
            <>
              <div className="flex items-center justify-between">
                <span className="text-lg">{b.icon}</span>
                <span className={`text-2xl font-bold tabular-nums ${count > 0 ? numberColor : 'text-text-muted'}`}>
                  {count.toLocaleString('id-ID')}
                </span>
              </div>
              <p className="mt-2 text-xs font-semibold text-text leading-snug">
                {b.label}
              </p>
            </>
          );

          const baseCls =
            'rounded-lg border border-border bg-surface-muted/50 p-3 text-left transition-colors';
          const interactiveCls =
            'hover:border-brand-teal/40 hover:bg-surface-muted cursor-pointer';

          // Link bucket (rss, balapor)
          if (b.href && count > 0) {
            return (
              <Link key={b.key} href={b.href} className={`${baseCls} ${interactiveCls} block`}>
                {inner}
              </Link>
            );
          }

          // onClick bucket (stale drafts) — hanya kalau handler ada
          if (b.onClickKey === 'staleDrafts' && onReviewStaleDrafts && count > 0) {
            return (
              <button
                key={b.key}
                onClick={onReviewStaleDrafts}
                className={`${baseCls} ${interactiveCls} w-full`}
              >
                {inner}
              </button>
            );
          }

          // Non-interactive (count 0, atau review yang belum ada alurnya)
          return (
            <div key={b.key} className={`${baseCls} opacity-70`}>
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}
