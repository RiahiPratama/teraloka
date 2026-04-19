'use client';

/**
 * TeraLoka — Admin Users Page
 * Phase 2 · Batch 7a2 — Users Page Migration (Modals + Actions)
 * ------------------------------------------------------------
 * Admin users management page — complete CRUD now wired.
 *
 * Batch 7a2 scope (current):
 * - 5 modals wired up (invite + editName + editPhone + role + activate/deactivate/delete)
 * - Toast notification inline (auto-dismiss 3.5s)
 * - Role change flow: UserRow triggers onChangeRole → modal confirm
 * - "Tambah User" button NOW functional
 *
 * Batch 7a3 scope (future):
 * - Avatar upload flow
 * - Backend endpoint PATCH /admin/users/:id/avatar (separate delivery)
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Plus,
  Search,
  X,
  RefreshCw,
  Users as UsersIcon,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
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
import { UserInviteModal } from '@/components/admin/users/user-invite-modal';
import { UserEditModal, type EditMode } from '@/components/admin/users/user-edit-modal';
import { UserRoleModal } from '@/components/admin/users/user-role-modal';
import { UserActionModal, type ActionMode } from '@/components/admin/users/user-action-modal';

/* ─── API response shape (paginated list) ─── */

interface UsersListResponse {
  data: User[];
  total: number;
  limit?: number;
  offset?: number;
}

/* ─── Modal state — discriminated union for clarity ─── */

type ModalState =
  | { type: null }
  | { type: 'invite' }
  | { type: 'edit'; mode: EditMode; user: User }
  | { type: 'role'; user: User; newRole: UserRole }
  | { type: 'action'; mode: ActionMode; user: User };

/* ─── Toast ─── */

interface ToastData {
  message: string;
  ok: boolean;
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
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Modal state
  const [modal, setModal] = useState<ModalState>({ type: null });

  // Toast state
  const [toast, setToast] = useState<ToastData | null>(null);

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

  const refetchUsers = useCallback(() => {
    setRetryNonce((n) => n + 1);
  }, []);

  /* ── Toast helper ── */
  const showToast = useCallback((message: string, ok: boolean) => {
    setToast({ message, ok });
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  /* ── Modal handlers ── */
  const closeModal = useCallback(() => {
    setModal({ type: null });
  }, []);

  const handleInvite = useCallback(() => {
    setModal({ type: 'invite' });
  }, []);

  const handleEditName = useCallback((user: User) => {
    setModal({ type: 'edit', mode: 'name', user });
  }, []);

  const handleEditPhone = useCallback((user: User) => {
    setModal({ type: 'edit', mode: 'phone', user });
  }, []);

  const handleChangeRole = useCallback((user: User, newRole: UserRole) => {
    if (newRole === user.role) return;
    setModal({ type: 'role', user, newRole });
  }, []);

  const handleToggleActive = useCallback((user: User) => {
    // Super admin cannot be deactivated (UX guard, backend also enforces)
    if (user.role === 'super_admin' && user.is_active !== false) {
      showToast('Super Admin tidak bisa dinonaktifkan', false);
      return;
    }
    setModal({
      type: 'action',
      mode: user.is_active !== false ? 'deactivate' : 'activate',
      user,
    });
  }, [showToast]);

  const handleDelete = useCallback((user: User) => {
    // Guard: cannot delete self
    if (user.id === currentUser?.id) {
      showToast('Tidak bisa menghapus akun sendiri', false);
      return;
    }
    // Guard: cannot delete super admin
    if (user.role === 'super_admin') {
      showToast('Super Admin tidak bisa dihapus', false);
      return;
    }
    setModal({ type: 'action', mode: 'delete', user });
  }, [currentUser?.id, showToast]);

  /* ── Derivations ── */
  const stats = computeUserStats(users, total);
  const isEmptyAfterFilter =
    !loading && !error && users.length === 0 && (search || roleFilter || statusFilter);
  const isEmptyEntirely =
    !loading && !error && users.length === 0 && !search && !roleFilter && !statusFilter;

  return (
    <div className="max-w-7xl mx-auto space-y-5">
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
              'animate-in fade-in slide-in-from-right-2 duration-200',
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
          onClick={handleInvite}
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

          <Button variant="primary" size="sm" onClick={applySearch}>
            Cari
          </Button>
        </div>
      )}

      {/* ── Table ── */}
      {!error && (
        <div className="bg-surface border border-border rounded-xl">
          <UserTableHeader />

          {loading && users.length === 0 ? (
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
                action={{
                  label: 'Reset filter',
                  onClick: () => {
                    clearSearch();
                    setRoleFilter('');
                    setStatusFilter('');
                  },
                }}
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
                action={{
                  label: 'Tambah user pertama',
                  onClick: handleInvite,
                }}
              />
            </div>
          ) : (
            <>
              {users.map((u) => (
                <UserRow
                  key={u.id}
                  user={u}
                  currentUserId={currentUser?.id}
                  onEditName={handleEditName}
                  onEditPhone={handleEditPhone}
                  onToggleActive={handleToggleActive}
                  onDelete={handleDelete}
                  onChangeRole={handleChangeRole}
                />
              ))}
              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-3 bg-surface-muted/40 border-t border-border rounded-b-xl">
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

      {/* ── Modals ── */}
      <UserInviteModal
        open={modal.type === 'invite'}
        onClose={closeModal}
        onSuccess={refetchUsers}
        onToast={showToast}
      />

      <UserEditModal
        open={modal.type === 'edit'}
        onClose={closeModal}
        mode={modal.type === 'edit' ? modal.mode : 'name'}
        user={modal.type === 'edit' ? modal.user : null}
        onSuccess={refetchUsers}
        onToast={showToast}
      />

      <UserRoleModal
        open={modal.type === 'role'}
        onClose={closeModal}
        user={modal.type === 'role' ? modal.user : null}
        newRole={modal.type === 'role' ? modal.newRole : null}
        onSuccess={refetchUsers}
        onToast={showToast}
      />

      <UserActionModal
        open={modal.type === 'action'}
        onClose={closeModal}
        mode={modal.type === 'action' ? modal.mode : 'activate'}
        user={modal.type === 'action' ? modal.user : null}
        onSuccess={refetchUsers}
        onToast={showToast}
      />
    </div>
  );
}
