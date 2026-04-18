'use client';

/**
 * TeraLoka — Admin Users Page
 * Phase 2 · Batch 7a1 — Users Page Migration
 * ------------------------------------------------------------
 * Admin users management page — list view + filters + stats.
 *
 * Batch 7a1 scope:
 * - Page shell
 * - UserStats row (4 metric cards)
 * - Filter bar (status select + role select + search)
 * - Table composing UserRow components
 * - Loading / error / empty states
 * - "Add User" button DISABLED (placeholder, akan di-wire Batch 7a2)
 * - Action dropdown items DISABLED dengan label "Segera"
 *
 * Batch 7a2 scope (future):
 * - 7 modals (invite, editName, editPhone, role, deactivate, activate, delete)
 * - Avatar upload flow
 * - Wire semua action callbacks
 *
 * Preserved dari existing:
 * - searchInput vs search (debounce-like: Enter/click to apply)
 * - Role filter via API (server-side)
 * - Status filter client-side (karena backend gak support filter is_active)
 * - fetchUsers dengan URLSearchParams
 * - currentUser detection
 */

import { useCallback, useEffect, useState } from 'react';
import { Plus, Search, X, RefreshCw, Users as UsersIcon, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ApiError, useApi } from '@/lib/api/client';
import {
  type User,
  type UserRole,
  ROLE_FILTER_OPTIONS,
  STATUS_FILTER_OPTIONS,
  computeUserStats,
} from '@/types/users';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { UserStats } from '@/components/admin/users/user-stats';
import { UserRow, UserTableHeader } from '@/components/admin/users/user-row';

/* ─── API response shape (paginated list) ─── */

interface UsersListResponse {
  data: User[];
  total: number;
  limit?: number;
  offset?: number;
}

/* ─── Page ─── */

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const api = useApi();

  // Data state
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  // Filter state
  const [search, setSearch] = useState(''); // applied filter
  const [searchInput, setSearchInput] = useState(''); // live input
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  /* ── Fetch users ── */
  useEffect(() => {
    if (!api.token) return;
    const controller = new AbortController();

    setLoading(true);
    setError(null);

    const params: Record<string, string | number> = { limit: 50 };
    if (search) params.q = search;
    if (roleFilter) params.role = roleFilter;

    api
      .get<UsersListResponse>('/admin/users', {
        params,
        signal: controller.signal,
      })
      .then((data) => {
        let filtered = data.data;
        // Client-side status filter (backend gak support)
        if (statusFilter === 'aktif') {
          filtered = filtered.filter((u) => u.is_active !== false);
        } else if (statusFilter === 'nonaktif') {
          filtered = filtered.filter((u) => u.is_active === false);
        }
        setUsers(filtered);
        setTotal(data.total);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof ApiError ? err.message : 'Gagal memuat users');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [api, search, roleFilter, statusFilter, retryNonce]);

  const handleRetry = useCallback(() => {
    setRetryNonce((n) => n + 1);
  }, []);

  const applySearch = useCallback(() => {
    setSearch(searchInput.trim());
  }, [searchInput]);

  const clearSearch = useCallback(() => {
    setSearch('');
    setSearchInput('');
  }, []);

  /* ── Derivations ── */
  const stats = computeUserStats(users, total);
  const isEmptyAfterFilter =
    !loading && !error && users.length === 0 && (search || roleFilter || statusFilter);
  const isEmptyEntirely =
    !loading && !error && users.length === 0 && !search && !roleFilter && !statusFilter;

  /* ── 7a2 placeholder handlers ──
   * Undefined callback = action di-disable di UserRow.
   * Batch 7a2 akan set ini ke function yang open modal.
   */
  const handlers = {
    onEditName: undefined,
    onEditPhone: undefined,
    onToggleActive: undefined,
    onDelete: undefined,
    onChangeRole: undefined as ((user: User, newRole: UserRole) => void) | undefined,
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-text tracking-tight flex items-center gap-2">
            <UsersIcon size={24} className="text-brand-teal" />
            Management User
          </h1>
          <p className="text-sm text-text-muted mt-1">
            {loading
              ? 'Memuat data…'
              : `${total.toLocaleString('id-ID')} total user terdaftar`}
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          leftIcon={<Plus size={14} />}
          disabled
          title="Akan tersedia di Batch 7a2"
        >
          Tambah User
        </Button>
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
              Gagal memuat users
            </p>
            <p className="text-xs text-text-muted mt-0.5">{error}</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRetry}
            leftIcon={<RefreshCw size={12} />}
          >
            Retry
          </Button>
        </div>
      )}

      {/* ── Stats ── */}
      {!error && <UserStats stats={stats} loading={loading && users.length === 0} />}

      {/* ── Filter Bar ── */}
      {!error && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-surface border border-border rounded-xl">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={
              'px-3 py-2 rounded-lg border border-border bg-surface ' +
              'text-[12px] font-semibold text-text cursor-pointer outline-none ' +
              'focus:border-brand-teal transition-colors'
            }
          >
            {STATUS_FILTER_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

          {/* Role filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className={
              'px-3 py-2 rounded-lg border border-border bg-surface ' +
              'text-[12px] font-semibold text-text cursor-pointer outline-none ' +
              'focus:border-brand-teal transition-colors'
            }
          >
            {ROLE_FILTER_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

          {/* Search */}
          <div className="flex-1 min-w-[200px] flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-surface focus-within:border-brand-teal transition-colors">
            <Search size={13} className="text-text-muted shrink-0" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applySearch();
              }}
              placeholder="Cari nama atau nomor WA…"
              className="flex-1 min-w-0 bg-transparent border-none outline-none text-[12px] text-text placeholder:text-text-subtle"
            />
            {searchInput && (
              <button
                type="button"
                onClick={clearSearch}
                className="shrink-0 text-text-muted hover:text-text transition-colors"
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={applySearch}
          >
            Cari
          </Button>
        </div>
      )}

      {/* ── Table or Loading or Empty ── */}
      {!error && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <UserTableHeader />

          {loading && users.length === 0 ? (
            /* Initial load skeleton */
            <div className="divide-y divide-border">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="grid items-center gap-3 px-4 py-4"
                  style={{
                    gridTemplateColumns:
                      '48px minmax(0, 1fr) 180px 110px 130px 110px 80px',
                  }}
                >
                  <div className="h-9 w-9 rounded-full bg-surface-muted animate-pulse" />
                  <div className="space-y-2">
                    <div className="h-3 w-32 bg-surface-muted animate-pulse rounded" />
                    <div className="h-2.5 w-24 bg-surface-muted animate-pulse rounded" />
                  </div>
                  <div className="h-5 w-20 bg-surface-muted animate-pulse rounded" />
                  <div className="h-5 w-16 bg-surface-muted animate-pulse rounded" />
                  <div className="h-5 w-24 bg-surface-muted animate-pulse rounded" />
                  <div className="h-3 w-20 bg-surface-muted animate-pulse rounded" />
                  <div className="h-7 w-16 bg-surface-muted animate-pulse rounded ml-auto" />
                </div>
              ))}
            </div>
          ) : isEmptyAfterFilter ? (
            <div className="py-8 px-6">
              <EmptyState
                icon={<Search size={28} />}
                title="Tidak ditemukan"
                description="Coba ubah kata kunci atau filter."
                variant="muted"
                size="sm"
                action={
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      clearSearch();
                      setRoleFilter('');
                      setStatusFilter('');
                    }}
                  >
                    Reset filter
                  </Button>
                }
              />
            </div>
          ) : isEmptyEntirely ? (
            <div className="py-10 px-6">
              <EmptyState
                icon={<UsersIcon size={32} />}
                title="Belum ada user"
                description="User baru bisa login via OTP WA setelah diundang."
                variant="muted"
                size="sm"
              />
            </div>
          ) : (
            <>
              {users.map((u) => (
                <UserRow
                  key={u.id}
                  user={u}
                  currentUserId={currentUser?.id}
                  {...handlers}
                />
              ))}
              {/* Footer */}
              <div
                className={
                  'flex items-center justify-between px-4 py-3 ' +
                  'bg-surface-muted/40 border-t border-border'
                }
              >
                <span className="text-[11px] text-text-muted">
                  Menampilkan{' '}
                  <span className="font-semibold text-text">
                    {users.length}
                  </span>{' '}
                  dari{' '}
                  <span className="font-semibold text-text">
                    {total.toLocaleString('id-ID')}
                  </span>{' '}
                  total
                </span>
                {total > 50 && (
                  <span className="text-[11px] text-text-muted">
                    Tampil 50 pertama. Gunakan filter untuk mempersempit.
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Batch 7a1 notice ── */}
      {!error && !loading && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-status-info/8 border border-status-info/20">
          <AlertCircle size={14} className="text-status-info shrink-0" />
          <p className="text-[11px] text-text-secondary flex-1">
            <span className="font-semibold">Tampilan baru aktif.</span>{' '}
            Aksi Edit/Nonaktifkan/Hapus akan tersedia di update berikutnya.
          </p>
        </div>
      )}
    </div>
  );
}
