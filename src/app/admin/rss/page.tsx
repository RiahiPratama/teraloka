'use client';

/**
 * TeraLoka — Admin RSS Page
 * Phase 2 · Batch 7d — Admin RSS Management Migration
 * ------------------------------------------------------------
 * Review queue untuk artikel RSS dari media nasional.
 *
 * Flow:
 * - Cron job backend fetch artikel baru setiap jam
 * - Admin review: approve (→ publish ke BAKABAR) atau reject (→ dibuang)
 * - Pagination 20 per halaman
 *
 * Design decisions (Batch 7d):
 * - Straight action (tidak ada confirmation modal) — admin workflow rapid review
 * - Optimistic UI: remove card dari list immediately setelah action
 * - Toast feedback 3s auto-dismiss
 * - No auto-refresh (cron handle fetch, admin trigger refresh manual)
 *
 * Pattern consistency dengan Reports migration (Batch 7b).
 */

import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  PartyPopper,
  RefreshCw,
  Rss,
  XCircle,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ApiError, useApi } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { RSSArticleCard } from '@/components/admin/rss/rss-article-card';
import type { RSSArticle } from '@/types/rss';

const PAGE_LIMIT = 20;

interface ToastData {
  message: string;
  ok: boolean;
}

export default function AdminRSSPage() {
  const api = useApi();

  // Data state
  const [articles, setArticles] = useState<RSSArticle[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  // UI state
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);

  const showToast = useCallback((message: string, ok: boolean) => {
    setToast({ message, ok });
  }, []);

  /* ── Toast auto-dismiss ── */
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  /* ── Fetch articles ── */
  // Note: /admin/rss pakai `paginated()` helper di backend yang return
  // { success: true, data: [...], meta: {...} }. Helper useApi() cuma unwrap
  // `parsed.data` (array), jadi meta hilang. Solusi: raw fetch untuk endpoint
  // ini saja — konsisten dengan cara legacy RSSpage.tsx handle.
  useEffect(() => {
    if (!api.token) return;
    const controller = new AbortController();

    setLoading(true);
    setError(null);

    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL ??
      'https://teraloka-api.vercel.app/api/v1';

    fetch(
      `${apiUrl}/admin/rss?page=${page}&limit=${PAGE_LIMIT}`,
      {
        headers: {
          Authorization: `Bearer ${api.token}`,
          Accept: 'application/json',
        },
        signal: controller.signal,
      }
    )
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(
            json?.error?.message ??
              `Request failed (${res.status})`
          );
        }
        const typed = json as {
          success: true;
          data: RSSArticle[];
          meta: { page: number; limit: number; total: number; has_more: boolean };
        };
        setArticles(typed.data ?? []);
        setTotal(typed.meta?.total ?? 0);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        const message =
          err instanceof Error ? err.message : 'Gagal memuat artikel RSS';
        setError(message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [api.token, page, retryNonce]);

  const handleRefresh = useCallback(() => {
    setRetryNonce((n) => n + 1);
  }, []);

  /* ── Approve handler ── */
  const handleApprove = useCallback(
    async (id: string) => {
      setProcessingId(id);
      try {
        await api.post(`/admin/rss/${id}/approve`);
        showToast('Artikel dipublish ke BAKABAR', true);
        // Optimistic remove
        setArticles((prev) => prev.filter((a) => a.id !== id));
        setTotal((t) => Math.max(0, t - 1));
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : 'Gagal approve artikel';
        showToast(message, false);
      } finally {
        setProcessingId(null);
      }
    },
    [api, showToast]
  );

  /* ── Reject handler ── */
  const handleReject = useCallback(
    async (id: string) => {
      setProcessingId(id);
      try {
        await api.post(`/admin/rss/${id}/reject`);
        showToast('Artikel ditolak', true);
        // Optimistic remove
        setArticles((prev) => prev.filter((a) => a.id !== id));
        setTotal((t) => Math.max(0, t - 1));
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : 'Gagal reject artikel';
        showToast(message, false);
      } finally {
        setProcessingId(null);
      }
    },
    [api, showToast]
  );

  const totalPages = Math.ceil(total / PAGE_LIMIT);
  const canPrevPage = page > 1;
  const canNextPage = page < totalPages;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* ── Toast ── */}
      {toast && (
        <div
          className="fixed top-20 right-6 z-[60] pointer-events-none"
          role="status"
          aria-live="polite"
        >
          <div
            className={cn(
              'flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg',
              'font-semibold text-sm pointer-events-auto',
              toast.ok
                ? 'bg-status-healthy text-white'
                : 'bg-status-critical text-white'
            )}
          >
            {toast.ok ? (
              <CheckCircle2 size={16} className="shrink-0" />
            ) : (
              <XCircle size={16} className="shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-text tracking-tight flex items-center gap-2">
            <Rss size={24} className="text-bakabar" />
            RSS Nasional
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Review artikel dari media nasional sebelum dipublish ke BAKABAR.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!loading && total > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-status-warning/12 border border-status-warning/25">
              <span className="text-[13px] font-extrabold text-status-warning tabular-nums">
                {total}
              </span>
              <span className="text-[11px] font-semibold text-text-muted">
                menunggu review
              </span>
            </span>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            leftIcon={
              <RefreshCw size={12} className={cn(loading && 'animate-spin')} />
            }
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl bg-status-critical/8 border border-status-critical/20 px-4 py-3">
          <AlertCircle
            size={18}
            className="text-status-critical shrink-0 mt-0.5"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-status-critical">
              Gagal memuat artikel RSS
            </p>
            <p className="text-xs text-text-muted mt-0.5">{error}</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            leftIcon={<RefreshCw size={12} />}
          >
            Retry
          </Button>
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {loading && articles.length === 0 && !error && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-surface border border-border rounded-xl overflow-hidden flex gap-0"
            >
              <div className="w-36 h-32 bg-surface-muted animate-pulse shrink-0" />
              <div className="flex-1 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-28 bg-surface-muted animate-pulse rounded-full" />
                  <div className="h-3 w-24 bg-surface-muted animate-pulse rounded" />
                </div>
                <div className="h-4 w-3/4 bg-surface-muted animate-pulse rounded" />
                <div className="h-3 w-full bg-surface-muted animate-pulse rounded" />
                <div className="h-3 w-2/3 bg-surface-muted animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && !error && articles.length === 0 && (
        <EmptyState
          icon={<PartyPopper size={32} />}
          title="Semua artikel sudah diproses!"
          description="Cron job akan fetch artikel baru setiap jam dari media nasional."
          variant="default"
          tone="healthy"
          size="md"
          action={{
            label: 'Refresh sekarang',
            onClick: handleRefresh,
          }}
        />
      )}

      {/* ── Article cards ── */}
      {articles.length > 0 && (
        <div className="space-y-3">
          {articles.map((article) => (
            <RSSArticleCard
              key={article.id}
              article={article}
              onApprove={handleApprove}
              onReject={handleReject}
              processingId={processingId}
            />
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={!canPrevPage}
            leftIcon={<ChevronLeft size={14} />}
          >
            Sebelumnya
          </Button>
          <span className="px-3 text-[13px] text-text-muted tabular-nums">
            <span className="font-bold text-text">{page}</span>{' '}
            <span className="text-text-subtle">dari</span>{' '}
            <span className="font-bold text-text">{totalPages}</span>
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={!canNextPage}
            rightIcon={<ChevronRight size={14} />}
          >
            Selanjutnya
          </Button>
        </div>
      )}

      {/* ── Info footer ── */}
      {!error && !loading && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-bakabar/8 border border-bakabar/20">
          <AlertCircle size={14} className="text-bakabar shrink-0" />
          <p className="text-[11px] text-text-secondary flex-1">
            <span className="font-semibold">Tentang RSS:</span> Cron job fetch
            artikel dari 8 sumber media tiap jam. Artikel yang di-approve akan
            masuk ke BAKABAR, yang di-reject dibuang permanen.
          </p>
        </div>
      )}
    </div>
  );
}
