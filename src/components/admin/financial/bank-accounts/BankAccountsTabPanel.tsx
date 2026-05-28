'use client';

/**
 * TeraLoka — BankAccountsTabPanel
 * SESI 5F (19 Mei 2026) — BATCH 4 Delivery 2
 * ------------------------------------------------------------
 * Tab ke-4 di /admin/financial: kelola rekening penerima TeraLoka.
 *
 * Features:
 *   - List rekening (table) — active + deleted (toggle filter)
 *   - 2 Stats cards: Active count, Deleted count
 *   - Action per row: Edit, Soft Delete (inline confirm), Restore
 *   - Button "+ Tambah Rekening" → BankAccountFormModal (create mode)
 *   - Edit click → BankAccountFormModal (edit mode)
 *   - Refresh setelah action
 *
 * Privacy Display Rules:
 *   - account_holder_real: 🔒 (icon only, redacted)
 *   - account_holder_alias: VISIBLE (public)
 *   - owner_label: VISIBLE (internal AR/RY)
 *   - account_number: VISIBLE (super admin view)
 *
 * Backend:
 *   - GET    /admin/bank-accounts (?include_deleted=true)
 *   - DELETE /admin/bank-accounts/:id  (require reason)
 *   - POST   /admin/bank-accounts/:id/restore
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Building2, Plus, Pencil, Trash2, Undo2, Loader2,
  AlertTriangle, Check, X, CheckCircle, XCircle, Lock,
  RefreshCw, EyeOff,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import BankAccountFormModal, { type BankAccountFull } from './BankAccountFormModal';

const API =
  process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

// ─── Types ───────────────────────────────────────────────────────

interface ListResponse {
  success: boolean;
  data?: {
    accounts: BankAccountFull[];
    total:    number;
  };
  error?: { code: string; message: string };
}

interface InlineConfirmState {
  accountId: string;
  reason:    string;
}

// ─── Component ───────────────────────────────────────────────────

export default function BankAccountsTabPanel() {
  const { token, isLoading: authLoading } = useAuth();

  const [accounts, setAccounts]       = useState<BankAccountFull[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);

  // Form modal state
  const [formModal, setFormModal] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    account: BankAccountFull | null;
  }>({ open: false, mode: 'create', account: null });

  // Inline delete confirm state
  const [deleteConfirm, setDeleteConfirm] = useState<InlineConfirmState | null>(null);

  // Toast state (simple inline)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  // ─── Fetch ───────────────────────────────────────────────────

  const fetchAccounts = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (showDeleted) params.set('include_deleted', 'true');
      params.set('limit', '100');

      const res = await fetch(
        `${API}/admin/bank-accounts?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const json: ListResponse = await res.json();

      if (!json.success || !json.data) {
        setError(json.error?.message ?? 'Gagal memuat data rekening');
        return;
      }

      setAccounts(json.data.accounts);
    } catch (err: any) {
      setError(err?.message ?? 'Network error — cek koneksi internet');
    } finally {
      setLoading(false);
    }
  }, [token, showDeleted]);

  useEffect(() => {
    if (!authLoading) fetchAccounts();
  }, [authLoading, fetchAccounts]);

  // ─── Toast helper ────────────────────────────────────────────

  const showToast = useCallback((msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4500);
  }, []);

  // ─── Action handlers ─────────────────────────────────────────

  const handleAdd = () => {
    setFormModal({ open: true, mode: 'create', account: null });
  };

  const handleEdit = (account: BankAccountFull) => {
    setFormModal({ open: true, mode: 'edit', account });
  };

  const handleFormSuccess = (msg: string) => {
    showToast(msg, 'ok');
    void fetchAccounts();
  };

  const handleFormError = (msg: string) => {
    showToast(msg, 'err');
  };

  // Soft delete (inline confirm)
  const handleDeleteRequest = (accountId: string) => {
    setDeleteConfirm({ accountId, reason: '' });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm || !token) return;
    if (deleteConfirm.reason.trim().length < 5) {
      showToast('Alasan hapus min 5 karakter', 'err');
      return;
    }

    try {
      const res = await fetch(
        `${API}/admin/bank-accounts/${deleteConfirm.accountId}`,
        {
          method:  'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization:  `Bearer ${token}`,
          },
          body: JSON.stringify({ reason: deleteConfirm.reason.trim() }),
        }
      );
      const json = await res.json();

      if (!json.success) {
        showToast(json.error?.message ?? 'Gagal hapus rekening', 'err');
        return;
      }

      showToast('✓ Rekening dipindah ke Sampah', 'ok');
      setDeleteConfirm(null);
      void fetchAccounts();
    } catch (err: any) {
      showToast(err?.message ?? 'Network error', 'err');
    }
  };

  const handleRestore = async (accountId: string) => {
    if (!token) return;

    try {
      const res = await fetch(
        `${API}/admin/bank-accounts/${accountId}/restore`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const json = await res.json();

      if (!json.success) {
        showToast(json.error?.message ?? 'Gagal restore rekening', 'err');
        return;
      }

      showToast('✓ Rekening dipulihkan', 'ok');
      void fetchAccounts();
    } catch (err: any) {
      showToast(err?.message ?? 'Network error', 'err');
    }
  };

  // ─── Computed ────────────────────────────────────────────────

  const activeCount  = accounts.filter((a) => !('deleted_at' in a) || !(a as any).deleted_at).length;
  const deletedCount = accounts.filter((a) => 'deleted_at' in a && (a as any).deleted_at).length;
  const totalShown   = accounts.length;

  // ─── Render ──────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4 pb-12">

      {/* ─── Page Header ─── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-extrabold text-text">Bank Accounts</h2>
          <p className="text-[11px] text-text-muted mt-0.5">
            Kelola rekening penerima pembayaran TeraLoka (3-tier privacy)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchAccounts()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wide bg-surface-muted text-text-muted hover:text-text transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wide bg-status-info text-white hover:bg-status-info/90 transition-colors"
          >
            <Plus size={12} />
            Tambah Rekening
          </button>
        </div>
      </div>

      {/* ─── Stats Cards (2 cards: Active + Deleted) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-status-healthy/12 text-status-healthy shrink-0">
            <CheckCircle size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
              Rekening Aktif
            </p>
            <p className="text-[24px] font-extrabold text-text tabular-nums leading-tight">
              {activeCount}
            </p>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-balapor/12 text-balapor shrink-0">
            <XCircle size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
              Di Sampah
            </p>
            <p className="text-[24px] font-extrabold text-text tabular-nums leading-tight">
              {showDeleted ? deletedCount : '—'}
            </p>
            {!showDeleted && (
              <button
                type="button"
                onClick={() => setShowDeleted(true)}
                className="text-[10px] text-balapor underline hover:no-underline mt-0.5"
              >
                Tampilkan
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Filter toggle ─── */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-text-muted">
          Menampilkan {totalShown} rekening
          {showDeleted && ' (termasuk Sampah)'}
        </p>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showDeleted}
            onChange={(e) => setShowDeleted(e.target.checked)}
            className="w-4 h-4 rounded border-border accent-balapor"
          />
          <span className="text-[11px] font-semibold text-text-muted">
            Tampilkan yang dihapus
          </span>
        </label>
      </div>

      {/* ─── Error ─── */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-status-critical/8 border border-status-critical/20">
          <AlertTriangle size={14} className="text-status-critical shrink-0 mt-0.5" />
          <p className="text-[11px] text-status-critical">{error}</p>
        </div>
      )}

      {/* ─── Loading ─── */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-12 bg-surface border border-border rounded-xl">
          <Loader2 size={16} className="animate-spin text-text-muted" />
          <span className="text-[12px] text-text-muted">Memuat rekening...</span>
        </div>
      )}

      {/* ─── Empty state ─── */}
      {!loading && accounts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-surface border border-border rounded-xl">
          <Building2 className="text-text-subtle mb-3" size={36} />
          <p className="text-[13px] font-semibold text-text">
            {showDeleted ? 'Sampah kosong' : 'Belum ada rekening'}
          </p>
          <p className="text-[11px] text-text-muted mt-1">
            {showDeleted
              ? 'Tidak ada rekening yang dihapus.'
              : 'Klik "Tambah Rekening" untuk memulai.'}
          </p>
        </div>
      )}

      {/* ─── Table ─── */}
      {!loading && accounts.length > 0 && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[920px]">
              <thead className="bg-surface-muted/40">
                <tr>
                  <th className="px-3 py-2.5 text-left text-[10px] font-bold text-text-muted uppercase tracking-wider w-10">#</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-bold text-text-muted uppercase tracking-wider">Bank · Account</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-bold text-text-muted uppercase tracking-wider">Alias (PUBLIC)</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-bold text-text-muted uppercase tracking-wider">Owner</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-bold text-text-muted uppercase tracking-wider">Status</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-bold text-text-muted uppercase tracking-wider">Notes</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-bold text-text-muted uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => {
                  const isDeleted = 'deleted_at' in account && Boolean((account as any).deleted_at);
                  const isInlineConfirming = deleteConfirm?.accountId === account.id;

                  return (
                    <tr
                      key={account.id}
                      className={cn(
                        'border-t border-border hover:bg-surface-muted/30 transition-colors',
                        isDeleted && 'opacity-60'
                      )}
                    >
                      <td className="px-3 py-3 text-[11px] font-mono text-text-muted tabular-nums">
                        {account.display_order}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col">
                          <span className="text-[12px] font-bold text-text">{account.bank_name}</span>
                          <span className="text-[10px] font-mono text-text-muted tabular-nums">
                            {account.account_number}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-[11px] text-text">{account.account_holder_alias}</span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className={cn(
                            'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide',
                            account.is_personal_owner
                              ? 'bg-status-healthy/12 text-status-healthy'
                              : account.is_spouse
                              ? 'bg-baronda/12 text-baronda'
                              : 'bg-surface-muted text-text-muted'
                          )}>
                            <Lock size={9} />
                            {account.owner_label}
                          </span>
                          <span className="text-[9px] text-text-subtle">
                            {account.is_personal_owner ? 'Owner' : account.is_spouse ? 'Spouse' : '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {isDeleted ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-balapor/12 text-balapor">
                            Deleted
                          </span>
                        ) : account.is_active ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-status-healthy/12 text-status-healthy">
                            <span className="w-1.5 h-1.5 rounded-full bg-status-healthy animate-pulse" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-surface-muted text-text-muted">
                            <EyeOff size={9} />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 max-w-[180px]">
                        <p className="text-[10px] text-text-muted line-clamp-2">
                          {account.notes ?? '—'}
                        </p>
                      </td>
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        {isInlineConfirming ? (
                          // ─── Inline Delete Confirm ───
                          <div className="flex flex-col gap-1.5 items-end">
                            <input
                              type="text"
                              value={deleteConfirm.reason}
                              onChange={(e) => setDeleteConfirm({ ...deleteConfirm, reason: e.target.value })}
                              placeholder="Alasan (min 5 char)"
                              autoFocus
                              className="w-40 px-2 py-1 text-[10px] bg-surface-muted border border-balapor/40 rounded focus:outline-none focus:ring-1 focus:ring-balapor"
                            />
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={handleDeleteConfirm}
                                className="inline-flex items-center gap-0.5 px-2 py-1 rounded text-[10px] font-bold bg-balapor text-white hover:bg-balapor/90"
                              >
                                <Check size={10} />
                                Hapus
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirm(null)}
                                className="inline-flex items-center gap-0.5 px-2 py-1 rounded text-[10px] font-bold bg-surface-muted text-text-muted hover:text-text"
                              >
                                <X size={10} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-1">
                            {isDeleted ? (
                              <button
                                type="button"
                                onClick={() => handleRestore(account.id)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide bg-status-info/12 text-status-info hover:bg-status-info/20 transition-colors"
                                title="Pulihkan dari Sampah"
                              >
                                <Undo2 size={11} />
                                Restore
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleEdit(account)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide bg-baronda/12 text-baronda hover:bg-baronda/20 transition-colors"
                                  title="Edit rekening"
                                >
                                  <Pencil size={11} />
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRequest(account.id)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide bg-balapor/12 text-balapor hover:bg-balapor/20 transition-colors"
                                  title="Hapus ke Sampah"
                                >
                                  <Trash2 size={11} />
                                  Hapus
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Form Modal ─── */}
      {formModal.open && (
        <BankAccountFormModal
          mode={formModal.mode}
          account={formModal.account}
          token={token}
          onSuccess={handleFormSuccess}
          onError={handleFormError}
          onClose={() => setFormModal({ open: false, mode: 'create', account: null })}
        />
      )}

      {/* ─── Toast ─── */}
      {toast && (
        <div
          className={cn(
            'fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-2xl text-[12px] font-semibold animate-in slide-in-from-bottom',
            toast.type === 'ok'
              ? 'bg-status-healthy text-white'
              : 'bg-status-critical text-white'
          )}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
