'use client';
// ════════════════════════════════════════════════════════════════
// BALAUNDRY Admin — Daftar Laundry + Verifikasi (Tahap B)
// PATH: src/app/admin/balaundry/laundry/page.tsx
// GET /admin/balaundry/businesses (filter ke BE, sort BE — JANGAN re-sort FE).
// PATCH verify {verified,note?} · PATCH status {is_active,reason?}.
// Pagination: infer via fetch limit+1 (meta sibling, useApi drop meta) →
//   Prev/Next + "Halaman N", tanpa total count. NOL raw fetch, NOL sentuh client.ts.
// Aksi konsekuensial → ConfirmModal + toast + disable saat submit.
// ════════════════════════════════════════════════════════════════
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useApi, ApiError } from '@/lib/api/client';
import { useToast } from '@/components/ui/Toast';
import type { AdminBusinessRow, Business } from '@/lib/balaundry-links';
import { LaundryFilterBar, type TriFilter } from '@/components/balaundry/admin/LaundryFilterBar';
import { LaundryCard } from '@/components/balaundry/admin/LaundryCard';
import { ConfirmModal } from '@/components/balaundry/admin/ConfirmModal';
import { BulkResultModal, type BulkVerifyResult } from '@/components/balaundry/admin/BulkResultModal';

const PAGE_SIZE = 20;
const BULK_MAX = 100; // mirror BE admin-engine.ts:214 — >100 ditolak 400.

type ActionType = 'verify' | 'reject' | 'suspend' | 'activate';
interface ModalState {
  type: ActionType;
  row: AdminBusinessRow;
}

const MODAL_CONFIG: Record<
  ActionType,
  {
    title: string;
    icon: string;
    tone: 'primary' | 'warning' | 'danger';
    confirmLabel: string;
    confirmTone: 'balaundry' | 'danger';
    noteLabel: string;
  }
> = {
  verify: { title: 'Verifikasi laundry?', icon: 'verified', tone: 'primary', confirmLabel: 'Verifikasi', confirmTone: 'balaundry', noteLabel: 'Catatan (opsional)' },
  reject: { title: 'Batalkan verifikasi?', icon: 'cancel', tone: 'warning', confirmLabel: 'Batalkan', confirmTone: 'danger', noteLabel: 'Alasan (opsional)' },
  suspend: { title: 'Suspend laundry?', icon: 'block', tone: 'danger', confirmLabel: 'Suspend', confirmTone: 'danger', noteLabel: 'Alasan (opsional)' },
  activate: { title: 'Aktifkan laundry?', icon: 'play_circle', tone: 'primary', confirmLabel: 'Aktifkan', confirmTone: 'balaundry', noteLabel: 'Catatan (opsional)' },
};

function LaundryListPage() {
  const api = useApi();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  // ?filter=pending dari CTA command center → mulai di filter "belum verif".
  const [verified, setVerified] = useState<TriFilter>(
    searchParams.get('filter') === 'pending' ? 'false' : 'all',
  );
  const [active, setActive] = useState<TriFilter>('all');
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState<AdminBusinessRow[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [modal, setModal] = useState<ModalState | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ── Bulk-verify (multi-select) ──
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkVerifyResult | null>(null);
  const [bulkNameMap, setBulkNameMap] = useState<Record<string, string>>({});

  // ── Debounce search → reset ke halaman 1 ──
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(q);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  // ── Fetch list (filter ke BE) ──
  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // limit+1: fetch lebih 1 → kalau kebawa > PAGE_SIZE berarti ada next page.
        const data = await api.get<AdminBusinessRow[]>('/admin/balaundry/businesses', {
          params: {
            verified, // 'all' → BE tidak filter
            active: active === 'all' ? undefined : active,
            q: debouncedQ || undefined,
            page,
            limit: PAGE_SIZE + 1,
          },
          signal: ac.signal,
        });
        if (cancelled) return;
        const more = data.length > PAGE_SIZE;
        setHasMore(more);
        setRows(more ? data.slice(0, PAGE_SIZE) : data);
      } catch (e) {
        if (cancelled || (e instanceof DOMException && e.name === 'AbortError')) return;
        if (e instanceof ApiError) {
          if (e.code === 'AUTH_FORBIDDEN' || e.status === 403) setError('Akses admin diperlukan.');
          else if (e.status === 401) setError('Sesi berakhir. Silakan login ulang.');
          else setError(e.message || 'Gagal memuat daftar laundry.');
        } else {
          setError('Gagal memuat daftar laundry.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [api, verified, active, debouncedQ, page, reloadKey]);

  // ── Ganti filter → reset halaman 1 ──
  const changeVerified = (v: TriFilter) => { setVerified(v); setPage(1); };
  const changeActive = (v: TriFilter) => { setActive(v); setPage(1); };

  // ── Buka modal aksi ──
  const askVerify = (row: AdminBusinessRow) => setModal({ type: 'verify', row });
  const askReject = (row: AdminBusinessRow) => setModal({ type: 'reject', row });
  const askToggle = (row: AdminBusinessRow) =>
    setModal({ type: row.is_active ? 'suspend' : 'activate', row });

  // ── Konfirmasi aksi → PATCH → update row in-place ──
  const handleConfirm = async (note: string) => {
    if (!modal) return;
    const { type, row } = modal;
    setSubmitting(true);
    try {
      let updated: Business;
      if (type === 'verify' || type === 'reject') {
        updated = await api.patch<Business>(
          `/admin/balaundry/businesses/${row.id}/verify`,
          { verified: type === 'verify', note: note || undefined },
        );
      } else {
        updated = await api.patch<Business>(
          `/admin/balaundry/businesses/${row.id}/status`,
          { is_active: type === 'activate', reason: note || undefined },
        );
      }
      // Merge: pertahankan services_count/orders_count (verify/status tidak balikin count).
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, ...updated } : r)));
      toast.success(
        type === 'verify' ? 'Laundry terverifikasi.'
        : type === 'reject' ? 'Verifikasi dibatalkan.'
        : type === 'suspend' ? 'Laundry disuspend.'
        : 'Laundry diaktifkan.',
      );
      setModal(null);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Gagal memproses aksi.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Selection (cap BULK_MAX) ──
  const atCap = selected.size >= BULK_MAX;
  const toggleSelect = (row: AdminBusinessRow) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(row.id)) next.delete(row.id);
      else if (next.size < BULK_MAX) next.add(row.id);
      return next;
    });
  };
  const pageIds = rows.map((r) => r.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const toggleSelectPage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        for (const id of pageIds) {
          if (next.size >= BULK_MAX) break;
          next.add(id);
        }
      }
      return next;
    });
  };
  const clearSelection = () => setSelected(new Set());

  // ── Bulk-verify: POST → tampil partial-failure → refresh ──
  const handleBulkConfirm = async (note: string) => {
    const ids = [...selected];
    if (ids.length === 0) return;
    // Snapshot nama buat baris gagal (rows berubah setelah refresh).
    const nameMap: Record<string, string> = {};
    for (const id of ids) nameMap[id] = rows.find((r) => r.id === id)?.name ?? id;

    setBulkSubmitting(true);
    try {
      const result = await api.post<BulkVerifyResult>(
        '/admin/balaundry/businesses/bulk-verify',
        { business_ids: ids, verified: true, note: note || undefined },
      );
      setBulkNameMap(nameMap);
      setBulkResult(result);
      setBulkConfirm(false);
      clearSelection();
      setReloadKey((k) => k + 1); // refresh otoritatif (BE re-sort/re-filter)
      if (result.failed > 0) {
        toast.warning(`${result.succeeded} sukses, ${result.failed} gagal.`);
      } else {
        toast.success(`${result.succeeded} laundry terverifikasi.`);
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Gagal verifikasi massal.');
    } finally {
      setBulkSubmitting(false);
    }
  };

  const cfg = modal ? MODAL_CONFIG[modal.type] : null;

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-text">
          <span className="material-symbols-outlined text-balaundry">local_laundry_service</span>
          Daftar Laundry
        </h1>
        <p className="mt-0.5 text-sm text-text-muted">
          Verifikasi, aktif/suspend laundry. Pending-verify tampil paling atas.
        </p>
      </div>

      {/* ── Filter ── */}
      <LaundryFilterBar
        verified={verified}
        active={active}
        q={q}
        onVerifiedChange={changeVerified}
        onActiveChange={changeActive}
        onQChange={setQ}
      />

      {/* ── Error ── */}
      {error && !loading && (
        <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4">
          <span className="material-symbols-outlined text-text-subtle">error</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-text">{error}</p>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-balaundry hover:underline"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              Coba lagi
            </button>
          </div>
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-surface-muted" />
          ))}
        </div>
      )}

      {/* ── Empty ── */}
      {!loading && !error && rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center">
          <span className="material-symbols-outlined text-[40px] text-text-subtle">search_off</span>
          <p className="mt-2 text-sm font-medium text-text">Tidak ada laundry</p>
          <p className="mt-0.5 text-xs text-text-muted">Coba ubah filter atau kata kunci pencarian.</p>
        </div>
      )}

      {/* ── List ── */}
      {!loading && !error && rows.length > 0 && (
        <>
          {/* Toolbar select-all (halaman ini) */}
          <div className="flex items-center justify-between gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-text-muted">
              <input
                type="checkbox"
                checked={allPageSelected}
                onChange={toggleSelectPage}
                className="h-4 w-4 accent-balaundry"
              />
              Pilih semua (halaman ini)
            </label>
            {selected.size > 0 && (
              <span className="text-xs text-text-subtle">{selected.size}/{BULK_MAX} dipilih</span>
            )}
          </div>

          <div className="space-y-3">
            {rows.map((row) => (
              <LaundryCard
                key={row.id}
                row={row}
                busy={submitting && modal?.row.id === row.id}
                onVerify={askVerify}
                onReject={askReject}
                onToggleStatus={askToggle}
                selected={selected.has(row.id)}
                onToggleSelect={toggleSelect}
                selectDisabled={atCap}
              />
            ))}
          </div>

          {/* ── Pagination (Prev/Next + Halaman N) ── */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:text-text disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              Sebelumnya
            </button>
            <span className="text-sm font-medium text-text-muted">Halaman {page}</span>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasMore || loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:text-text disabled:opacity-40"
            >
              Berikutnya
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </>
      )}

      {/* ── Bulk action bar (sticky, muncul saat ada pilihan) ── */}
      {selected.size > 0 && (
        <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-balaundry/40 bg-surface p-3 shadow-lg">
          <span className="text-sm font-semibold text-text">
            {selected.size} dipilih
            <span className="ml-1 font-normal text-text-subtle">(maks {BULK_MAX})</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={clearSelection}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:text-text"
            >
              Bersihkan
            </button>
            <button
              type="button"
              onClick={() => setBulkConfirm(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-balaundry px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <span className="material-symbols-outlined text-[18px]">verified</span>
              Verifikasi terpilih
            </button>
          </div>
        </div>
      )}

      {/* ── Confirm modal (per-row) ── */}
      {modal && cfg && (
        <ConfirmModal
          open
          onClose={() => setModal(null)}
          onConfirm={handleConfirm}
          title={cfg.title}
          description={`${modal.row.name}${modal.row.display_id ? ` · ${modal.row.display_id}` : ''}`}
          icon={cfg.icon}
          tone={cfg.tone}
          confirmLabel={cfg.confirmLabel}
          confirmTone={cfg.confirmTone}
          noteLabel={cfg.noteLabel}
          notePlaceholder="Tulis di sini…"
          submitting={submitting}
        />
      )}

      {/* ── Confirm modal (bulk-verify) ── */}
      {bulkConfirm && (
        <ConfirmModal
          open
          onClose={() => setBulkConfirm(false)}
          onConfirm={handleBulkConfirm}
          title={`Verifikasi ${selected.size} laundry?`}
          description={
            selected.size >= 20
              ? 'Aksi massal — proses bisa lama (BE throttle notif ~1.2 dtk/laundry). Tunggu sampai selesai.'
              : 'Verifikasi semua laundry terpilih sekaligus.'
          }
          icon="verified"
          tone="primary"
          confirmLabel="Verifikasi terpilih"
          confirmTone="balaundry"
          noteLabel="Catatan (opsional)"
          notePlaceholder="Tulis di sini…"
          submitting={bulkSubmitting}
        />
      )}

      {/* ── Hasil bulk (partial-failure) ── */}
      {bulkResult && (
        <BulkResultModal
          open
          onClose={() => setBulkResult(null)}
          result={bulkResult}
          nameById={bulkNameMap}
        />
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="h-32 animate-pulse rounded-xl bg-surface-muted" />}>
      <LaundryListPage />
    </Suspense>
  );
}
