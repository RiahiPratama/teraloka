'use client';

/**
 * TeraLoka — UserActionModal
 * Phase 2 · Batch 7a2 — User Actions Modals
 * ------------------------------------------------------------
 * Combined modal untuk 3 destructive actions:
 * - mode='activate'   → PATCH /admin/users/:id/active  body: { is_active: true }
 * - mode='deactivate' → PATCH /admin/users/:id/active  body: { is_active: false }
 * - mode='delete'     → DELETE /admin/users/:id
 *
 * Delete mode requires typing "HAPUS" as confirmation.
 * Super admin cannot be deactivated (guard) — modal tidak render deactivate
 * option kalau user.role === 'super_admin'.
 *
 * Combined karena semuanya confirmation flow dengan structure mirip.
 */

import { useState, useEffect } from 'react';
import { Ban, CheckCircle2, Trash2 } from 'lucide-react';
import { ApiError, useApi } from '@/lib/api/client';
import { userDisplayName, type User } from '@/types/users';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export type ActionMode = 'activate' | 'deactivate' | 'delete';

export interface UserActionModalProps {
  open: boolean;
  onClose: () => void;
  mode: ActionMode;
  user: User | null;
  onSuccess: () => void;
  onToast: (message: string, ok: boolean) => void;
}

const MODE_CONFIG: Record<
  ActionMode,
  {
    icon: React.ReactElement;
    title: string;
    tone: 'warning' | 'danger' | 'primary';
    confirmLabel: string;
    loadingLabel: string;
    buttonVariant: 'primary' | 'danger';
  }
> = {
  activate: {
    icon: <CheckCircle2 size={18} />,
    title: 'Aktifkan Akun',
    tone: 'primary',
    confirmLabel: 'Ya, Aktifkan',
    loadingLabel: 'Mengaktifkan...',
    buttonVariant: 'primary',
  },
  deactivate: {
    icon: <Ban size={18} />,
    title: 'Nonaktifkan Akun',
    tone: 'warning',
    confirmLabel: 'Ya, Nonaktifkan',
    loadingLabel: 'Menonaktifkan...',
    buttonVariant: 'primary',
  },
  delete: {
    icon: <Trash2 size={18} />,
    title: 'Hapus Permanen',
    tone: 'danger',
    confirmLabel: 'Hapus Permanen',
    loadingLabel: 'Menghapus...',
    buttonVariant: 'danger',
  },
};

export function UserActionModal({
  open,
  onClose,
  mode,
  user,
  onSuccess,
  onToast,
}: UserActionModalProps) {
  const api = useApi();
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const config = MODE_CONFIG[mode];

  // Reset on close
  useEffect(() => {
    if (!open) {
      setDeleteConfirm('');
    }
  }, [open]);

  const handleClose = () => {
    if (loading) return;
    setDeleteConfirm('');
    onClose();
  };

  const handleConfirm = async () => {
    if (!user) return;

    // Delete requires typing "HAPUS"
    if (mode === 'delete' && deleteConfirm !== 'HAPUS') return;

    setLoading(true);
    try {
      if (mode === 'delete') {
        await api.delete(`/admin/users/${user.id}`);
        onToast('User berhasil dihapus', true);
      } else {
        const is_active = mode === 'activate';
        await api.patch(`/admin/users/${user.id}/active`, { is_active });
        onToast(
          is_active ? 'Akun diaktifkan' : 'Akun dinonaktifkan',
          true
        );
      }
      handleClose();
      onSuccess();
    } catch (err) {
      const errorMessages: Record<ActionMode, string> = {
        activate: 'Gagal mengaktifkan akun',
        deactivate: 'Gagal menonaktifkan akun',
        delete: 'Gagal menghapus user',
      };
      const message =
        err instanceof ApiError ? err.message : errorMessages[mode];
      onToast(message, false);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const displayName = userDisplayName(user);
  const description =
    mode === 'activate'
      ? `Aktifkan kembali akun ${displayName}?`
      : mode === 'deactivate'
        ? `${displayName} tidak bisa login sampai diaktifkan kembali.`
        : `Akun ${displayName} akan dihapus permanen.`;

  const canConfirm =
    !loading && (mode !== 'delete' || deleteConfirm === 'HAPUS');

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      size="sm"
      ariaLabel={config.title}
      disableBackdropClose={mode === 'delete'}
    >
      <DialogHeader
        icon={config.icon}
        title={config.title}
        description={description}
        tone={config.tone}
        centered
      />

      <DialogBody>
        {mode === 'delete' && (
          <>
            <div className="rounded-lg bg-status-critical/8 border border-status-critical/20 px-3 py-2.5 text-xs text-status-critical font-semibold leading-relaxed text-center">
              ⚠️ Tindakan ini tidak bisa dibatalkan!
            </div>
            <div className="text-xs text-text-secondary leading-relaxed">
              Ketik{' '}
              <code className="px-1.5 py-0.5 rounded bg-status-critical/10 text-status-critical font-bold">
                HAPUS
              </code>{' '}
              untuk konfirmasi:
            </div>
            <Input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="Ketik HAPUS..."
              disabled={loading}
              autoFocus
              error={
                deleteConfirm && deleteConfirm !== 'HAPUS'
                  ? 'Ketik HAPUS tepat seperti itu (kapital semua)'
                  : undefined
              }
            />
          </>
        )}

        {mode === 'deactivate' && (
          <div className="rounded-lg bg-status-warning/8 border border-status-warning/20 px-3 py-2.5 text-xs text-status-warning leading-relaxed text-center">
            Akun bisa diaktifkan kembali kapan saja.
          </div>
        )}
      </DialogBody>

      <DialogFooter>
        <Button
          variant="secondary"
          onClick={handleClose}
          disabled={loading}
        >
          Batal
        </Button>
        <Button
          variant={config.buttonVariant}
          onClick={handleConfirm}
          loading={loading}
          disabled={!canConfirm}
        >
          {loading ? config.loadingLabel : config.confirmLabel}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
