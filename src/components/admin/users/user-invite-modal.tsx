'use client';

/**
 * TeraLoka — UserInviteModal
 * Phase 2 · Batch 7a2 — User Actions Modals
 * ------------------------------------------------------------
 * Modal untuk invite user baru. Pakai endpoint:
 *   POST /admin/users  body: { phone, name?, role }
 *
 * Role options: semua kecuali super_admin (tidak bisa di-set via invite).
 * User baru bisa langsung login via OTP WA setelah di-invite.
 *
 * Validation:
 * - Phone required, trim whitespace
 * - Role required (has default)
 * - Name optional
 *
 * API endpoint sama dengan existing — hanya UI yang baru.
 */

import { useState, type FormEvent } from 'react';
import { UserPlus } from 'lucide-react';
import { ApiError, useApi } from '@/lib/api/client';
import { INVITABLE_ROLES, type User, type UserRole } from '@/types/users';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

export interface UserInviteModalProps {
  open: boolean;
  onClose: () => void;
  /** Callback saat invite sukses — biasanya trigger refetch users */
  onSuccess: (newUser?: User) => void;
  /** Callback untuk toast (dipass dari page) */
  onToast: (message: string, ok: boolean) => void;
}

export function UserInviteModal({
  open,
  onClose,
  onSuccess,
  onToast,
}: UserInviteModalProps) {
  const api = useApi();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('service_user');
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const resetForm = () => {
    setPhone('');
    setName('');
    setRole('service_user');
    setPhoneError(null);
  };

  const handleClose = () => {
    if (loading) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    const trimmedPhone = phone.trim();

    if (!trimmedPhone) {
      setPhoneError('Nomor WA wajib diisi');
      return;
    }
    setPhoneError(null);

    setLoading(true);
    try {
      const newUser = await api.post<User>('/admin/users', {
        phone: trimmedPhone,
        name: name.trim() || undefined,
        role,
      });
      onToast('User berhasil ditambahkan', true);
      resetForm();
      onClose();
      onSuccess(newUser);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Gagal menambah user';
      onToast(message, false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      size="md"
      ariaLabel="Tambah user baru"
    >
      <DialogHeader
        icon={<UserPlus size={18} />}
        title="Tambah User Baru"
        description="User bisa langsung login via OTP WA setelah ditambahkan"
        tone="primary"
      />

      <form onSubmit={handleSubmit}>
        <DialogBody>
          <Input
            label="Nomor WA"
            required
            type="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              if (phoneError) setPhoneError(null);
            }}
            placeholder="628123456789 atau 0812..."
            error={phoneError ?? undefined}
            helperText={!phoneError ? 'Format: 628xxx atau 08xxx' : undefined}
            autoFocus
            disabled={loading}
          />

          <Input
            label="Nama"
            helperText="Opsional — bisa diisi user sendiri nanti"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama lengkap karyawan..."
            disabled={loading}
          />

          <Select
            label="Role"
            required
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            options={INVITABLE_ROLES}
            disabled={loading}
            helperText="Super Admin tidak bisa di-invite dari sini"
          />
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
          <Button
            type="submit"
            loading={loading}
            leftIcon={loading ? undefined : <UserPlus size={14} />}
          >
            {loading ? 'Menambahkan...' : 'Tambah User'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
