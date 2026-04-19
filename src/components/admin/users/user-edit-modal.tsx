'use client';

/**
 * TeraLoka — UserEditModal
 * Phase 2 · Batch 7a2 — User Actions Modals
 * ------------------------------------------------------------
 * Combined modal untuk 2 edit actions:
 * - mode='name'  → PATCH /admin/users/:id/name   body: { name }
 * - mode='phone' → PATCH /admin/users/:id/phone  body: { phone, reason }
 *
 * Dipisah dari invite karena edit punya target user specific (bukan create).
 * Dipisah dari role/action modals karena form-based (bukan confirm).
 *
 * Phone mode extra field: reason (optional audit trail).
 * Phone mode warning: JWT lama masih valid sampai expired.
 */

import { useState, useEffect, type FormEvent } from 'react';
import { Edit3, Phone } from 'lucide-react';
import { ApiError, useApi } from '@/lib/api/client';
import type { User } from '@/types/users';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export type EditMode = 'name' | 'phone';

export interface UserEditModalProps {
  open: boolean;
  onClose: () => void;
  /** Mode edit: 'name' atau 'phone' */
  mode: EditMode;
  /** Target user */
  user: User | null;
  onSuccess: () => void;
  onToast: (message: string, ok: boolean) => void;
}

export function UserEditModal({
  open,
  onClose,
  mode,
  user,
  onSuccess,
  onToast,
}: UserEditModalProps) {
  const api = useApi();
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize value when modal opens or user changes
  useEffect(() => {
    if (!open || !user) {
      setValue('');
      setReason('');
      setError(null);
      return;
    }
    if (mode === 'name') {
      setValue(user.name ?? '');
    } else {
      setValue(user.phone ?? '');
      setReason('');
    }
  }, [open, user, mode]);

  const handleClose = () => {
    if (loading) return;
    setValue('');
    setReason('');
    setError(null);
    onClose();
  };

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!user) return;

    const trimmed = value.trim();
    if (!trimmed) {
      setError(mode === 'name' ? 'Nama tidak boleh kosong' : 'Nomor WA tidak boleh kosong');
      return;
    }
    setError(null);

    setLoading(true);
    try {
      if (mode === 'name') {
        await api.patch(`/admin/users/${user.id}/name`, { name: trimmed });
        onToast('Nama berhasil diubah', true);
      } else {
        await api.patch(`/admin/users/${user.id}/phone`, {
          phone: trimmed,
          reason: reason.trim(),
        });
        onToast('Nomor WA berhasil diubah', true);
      }
      handleClose();
      onSuccess();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : mode === 'name'
            ? 'Gagal mengubah nama'
            : 'Gagal mengubah nomor WA';
      onToast(message, false);
    } finally {
      setLoading(false);
    }
  };

  const icon = mode === 'name' ? <Edit3 size={18} /> : <Phone size={18} />;
  const title = mode === 'name' ? 'Edit Nama' : 'Ganti Nomor WA';
  const description =
    mode === 'name'
      ? 'Nama tampil di platform TeraLoka'
      : 'Nomor WA lama akan diganti. JWT lama tetap valid sampai expired.';
  const tone: 'primary' | 'warning' = mode === 'name' ? 'primary' : 'warning';
  const submitLabel = mode === 'name' ? 'Simpan' : 'Ganti Nomor';
  const submitLoadingLabel = mode === 'name' ? 'Menyimpan...' : 'Mengganti...';

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      size="md"
      ariaLabel={title}
    >
      <DialogHeader
        icon={icon}
        title={title}
        description={description}
        tone={tone}
      />

      <form onSubmit={handleSubmit}>
        <DialogBody>
          {mode === 'phone' && (
            <div className="rounded-lg bg-status-warning/8 border border-status-warning/20 px-3 py-2.5 text-xs text-status-warning leading-relaxed">
              ⚠️ JWT lama tetap valid sampai expired (30 hari). User harus
              verifikasi ulang dengan nomor baru untuk relogin.
            </div>
          )}

          <Input
            label={mode === 'name' ? 'Nama Lengkap' : 'Nomor WA Baru'}
            required
            type={mode === 'name' ? 'text' : 'tel'}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(null);
            }}
            placeholder={
              mode === 'name' ? 'Nama lengkap...' : '628XXXXXXXXXX'
            }
            error={error ?? undefined}
            autoFocus
            disabled={loading}
          />

          {mode === 'phone' && (
            <Input
              label="Alasan"
              helperText="Opsional — untuk audit log"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="HP hilang, ganti kartu, dll..."
              disabled={loading}
            />
          )}
        </DialogBody>

        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={loading}
          >
            Batal
          </Button>
          <Button type="submit" loading={loading}>
            {loading ? submitLoadingLabel : submitLabel}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
