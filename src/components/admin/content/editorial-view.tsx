'use client';

/**
 * TeraLoka — EditorialView (tab Editorial di BAKABAR Command Center)
 * Wave 2 · 1 Juni 2026
 * ------------------------------------------------------------
 * Port dari /office/newsroom/bakabar/hub (AdminThemeContext+inline)
 * → Tailwind semantic tokens (konsisten Command Center).
 *
 * A+ smart-link: tulis/edit navigate ke editor existing (jalan sempurna),
 * gak inline. Status workflow (Pattern A) via PATCH /admin/articles/:id/status.
 * Status filter = state lokal (bukan URL — biar gak tabrak tab Command Center).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useApi, ApiError } from '@/lib/api/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

interface Article {
  id: string;
  title: string;
  slug: string;
  status: string;
  category: string | null;
  author_name: string;
  created_at: string;
  published_at: string | null;
  view_count: number;
  viral_score: number;
  is_viral: boolean;
  is_breaking: boolean;
  source: string;
}

const STATUS_TABS = [
  { value: '', label: 'Semua' },
  { value: 'draft', label: 'Draft' },
  { value: 'review', label: 'Review' },
  { value: 'published', label: 'Publikasi' },
  { value: 'archived', label: 'Arsip' },
];

const CATEGORIES = [
  'berita', 'transportasi', 'sosial', 'kesehatan',
  'pendidikan', 'ekonomi', 'lingkungan', 'olahraga',
];

/** Badge style per status (Tailwind tokens). */
const STATUS_BADGE: Record<string, string> = {
  published: 'bg-status-healthy/12 text-status-healthy',
  draft: 'bg-status-warning/12 text-status-warning',
  review: 'bg-status-info/12 text-status-info',
  archived: 'bg-surface-muted text-text-muted',
};
const STATUS_LABEL: Record<string, string> = {
  published: 'Published', draft: 'Draft', review: 'Review', archived: 'Arsip',
};

const PAGE_SIZE = 20;

function timeAgo(dateStr: string) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.floor(h / 24)} hari lalu`;
}

function useDebounce<T>(value: T, delay: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

export function EditorialView() {
  const api = useApi();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionKey, setActionKey] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounce(searchInput, 400);
  const [page, setPage] = useState(1);
  const [reloadNonce, setReloadNonce] = useState(0);

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // Reset page saat filter berubah
  useEffect(() => { setPage(1); }, [statusFilter, categoryFilter, search]);

  // Fetch list
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const params: Record<string, string | number> = { page, limit: PAGE_SIZE };
        if (statusFilter) params.status = statusFilter;
        if (categoryFilter) params.category = categoryFilter;
        if (search.trim()) params.q = search.trim();

        const res = await api.get<unknown>('/admin/articles', {
          params,
          signal: controller.signal,
        });
        if (cancelled) return;
        // Defensif: data bisa di root atau nested .data
        const r: any = res;
        const list: Article[] = r?.data?.data ?? r?.data ?? [];
        const tot: number = r?.data?.total ?? r?.total ?? 0;
        setArticles(Array.isArray(list) ? list : []);
        setTotal(tot);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) setError(err.message);
        else if ((err as Error).name !== 'AbortError') setError('Gagal memuat artikel');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; controller.abort(); };
  }, [api, statusFilter, categoryFilter, search, page, reloadNonce]);

  const updateStatus = useCallback(
    async (id: string, newStatus: string, title: string) => {
      const key = id + newStatus;
      setActionKey(key);
      try {
        await api.patch(`/admin/articles/${id}/status`, { status: newStatus });
        showToast(`"${title.slice(0, 28)}…" → ${STATUS_LABEL[newStatus] ?? newStatus}`);
        setReloadNonce((n) => n + 1);
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : 'Gagal update status';
        showToast(msg, false);
      } finally {
        setActionKey(null);
      }
    },
    [api, showToast],
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const isBusy = (id: string, s: string) => actionKey === id + s;

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-2.5 rounded-lg text-sm font-semibold text-white shadow-lg ${
            toast.ok ? 'bg-status-healthy' : 'bg-status-critical'
          }`}
        >
          {toast.ok ? '✓' : '✗'} {toast.msg}
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-bold text-text flex items-center gap-2">
            <span>📝</span> Editorial Hub
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            {total.toLocaleString('id-ID')} artikel · halaman {page}/{totalPages}
          </p>
        </div>
        <Link
          href="/office/newsroom/bakabar/hub/new"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-brand-teal text-white text-xs font-semibold hover:bg-brand-teal/90 transition-colors"
        >
          ✍️ Tulis Artikel
        </Link>
      </div>

      {/* Toolbar */}
      <div className="rounded-xl border border-border bg-surface p-3 flex flex-wrap gap-2 items-center">
        {/* Search */}
        <div className="flex items-center gap-2 bg-surface-muted rounded-lg px-3 py-1.5 border border-border flex-1 min-w-[180px]">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted shrink-0"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari judul artikel…"
            className="bg-transparent border-none outline-none text-xs text-text w-full placeholder:text-text-muted"
          />
        </div>

        {/* Status tabs */}
        <div className="flex gap-0.5 bg-surface-muted rounded-lg p-1 border border-border">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                statusFilter === tab.value
                  ? 'bg-brand-teal text-white'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Category */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg border border-border text-[11px] text-text bg-surface cursor-pointer outline-none"
        >
          <option value="">Semua Kategori</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-status-critical/10 border border-status-critical/30 px-3 py-2 flex items-center justify-between gap-3">
          <span className="text-sm text-status-critical">⚠️ {error}</span>
          <button onClick={() => setReloadNonce((n) => n + 1)} className="text-xs font-semibold text-status-critical underline hover:no-underline shrink-0">Coba lagi</button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        {/* Header */}
        <div className="hidden md:grid grid-cols-[110px_1fr_64px_64px_96px_110px_220px] gap-2 px-4 py-2.5 bg-surface-muted border-b border-border text-[10px] font-bold text-text-muted uppercase tracking-wide">
          <span>Status</span>
          <span>Judul</span>
          <span className="text-right">Score</span>
          <span className="text-right">Views</span>
          <span>Updated</span>
          <span>Editor</span>
          <span>Aksi</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-text-muted">Memuat artikel…</div>
        ) : articles.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-3xl mb-2">📭</p>
            <p className="text-sm text-text-muted">
              {search ? `Tidak ada hasil untuk "${search}"` : 'Tidak ada artikel'}
            </p>
          </div>
        ) : (
          articles.map((a, idx) => (
            <div
              key={a.id}
              className={`grid grid-cols-2 md:grid-cols-[110px_1fr_64px_64px_96px_110px_220px] gap-2 px-4 py-3 items-center hover:bg-surface-muted/50 transition-colors ${
                idx < articles.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              {/* Status */}
              <div className="flex flex-col gap-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full w-fit ${STATUS_BADGE[a.status] ?? 'bg-surface-muted text-text-muted'}`}>
                  {STATUS_LABEL[a.status] ?? a.status}
                </span>
                {a.is_viral && <span className="text-[10px] font-bold text-status-warning">🔥 Viral</span>}
                {a.is_breaking && <span className="text-[10px] font-bold text-status-critical">🔴 Breaking</span>}
              </div>

              {/* Judul */}
              <div className="min-w-0 pr-2">
                <p className="font-semibold text-[13px] text-text truncate">{a.title}</p>
                <p className="text-[11px] text-text-muted">
                  {a.category || 'Umum'}
                  {a.source === 'balapor' && ' · 📢 BALAPOR'}
                  {a.source === 'rss' && ' · 🗞️ RSS'}
                </p>
              </div>

              {/* Score */}
              <div className="hidden md:block text-right">
                <span className={`text-[13px] font-bold ${a.viral_score > 100 ? 'text-status-warning' : 'text-text'}`}>
                  {a.viral_score ?? 0}
                </span>
              </div>

              {/* Views */}
              <div className="hidden md:block text-right">
                <span className="text-[13px] font-semibold text-text-muted">
                  {a.view_count >= 1000 ? `${(a.view_count / 1000).toFixed(1)}k` : a.view_count ?? 0}
                </span>
              </div>

              {/* Updated */}
              <div className="hidden md:block">
                <p className="text-[11px] text-text-muted">{timeAgo(a.published_at || a.created_at)}</p>
              </div>

              {/* Editor */}
              <div className="hidden md:flex items-center gap-1.5 min-w-0">
                <span className="text-[11px] text-text-muted font-medium truncate">
                  {a.author_name?.split(' ')[0] ?? '—'}
                </span>
              </div>

              {/* Aksi (Pattern A workflow) */}
              <div className="flex gap-1 items-center flex-wrap col-span-2 md:col-span-1">
                {a.status === 'draft' && (
                  <>
                    <button onClick={() => updateStatus(a.id, 'published', a.title)} disabled={isBusy(a.id, 'published')} className="px-2 py-1 rounded-md bg-status-healthy/12 text-status-healthy text-[11px] font-bold disabled:opacity-50">
                      {isBusy(a.id, 'published') ? '…' : 'Publish'}
                    </button>
                    <button onClick={() => updateStatus(a.id, 'review', a.title)} disabled={isBusy(a.id, 'review')} className="px-2 py-1 rounded-md bg-status-info/12 text-status-info text-[11px] font-bold disabled:opacity-50">
                      {isBusy(a.id, 'review') ? '…' : 'Review'}
                    </button>
                  </>
                )}
                {a.status === 'review' && (
                  <>
                    {isSuperAdmin && (
                      <button onClick={() => updateStatus(a.id, 'published', a.title)} disabled={isBusy(a.id, 'published')} className="px-2 py-1 rounded-md bg-status-healthy/12 text-status-healthy text-[11px] font-bold disabled:opacity-50">
                        {isBusy(a.id, 'published') ? '…' : 'Approve'}
                      </button>
                    )}
                    <button onClick={() => updateStatus(a.id, 'draft', a.title)} disabled={isBusy(a.id, 'draft')} className="px-2 py-1 rounded-md bg-status-warning/10 text-status-warning text-[11px] font-bold disabled:opacity-50">
                      {isBusy(a.id, 'draft') ? '…' : 'Draft'}
                    </button>
                  </>
                )}
                {a.status === 'published' && (
                  <button onClick={() => updateStatus(a.id, 'archived', a.title)} disabled={isBusy(a.id, 'archived')} className="px-2 py-1 rounded-md bg-surface-muted text-text-muted text-[11px] font-bold disabled:opacity-50">
                    {isBusy(a.id, 'archived') ? '…' : 'Arsip'}
                  </button>
                )}
                {a.status === 'archived' && isSuperAdmin && (
                  <button onClick={() => updateStatus(a.id, 'draft', a.title)} disabled={isBusy(a.id, 'draft')} className="px-2 py-1 rounded-md bg-status-warning/10 text-status-warning text-[11px] font-bold disabled:opacity-50">
                    {isBusy(a.id, 'draft') ? '…' : 'Draft'}
                  </button>
                )}

                <a href={`/news/${a.slug}`} target="_blank" rel="noopener noreferrer" className="px-2 py-1 rounded-md bg-surface-muted text-text-muted text-[11px] font-bold no-underline">
                  Lihat
                </a>
                <Link href={`/office/newsroom/bakabar/hub/${a.id}/edit`} className="px-2 py-1 rounded-md bg-status-info/8 text-status-info text-[11px] font-bold no-underline">
                  Edit
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {total > PAGE_SIZE && !loading && (
        <div className="flex items-center justify-between gap-3 px-1">
          <p className="text-xs text-text-muted">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} dari {total.toLocaleString('id-ID')}
          </p>
          <div className="flex gap-2 items-center">
            <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>‹ Prev</Button>
            <span className="text-xs font-semibold text-text px-2">{page} / {totalPages}</span>
            <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next ›</Button>
          </div>
        </div>
      )}
    </div>
  );
}
