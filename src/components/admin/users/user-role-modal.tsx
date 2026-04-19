'use client';

/**
 * TeraLoka — UserRoleModal
 * Phase 2 · Batch 7a2 — User Actions Modals
 * ------------------------------------------------------------
 * Modal konfirmasi ubah role. Endpoint:
 *   PATCH /admin/users/:id/role  body: { role }
 *
 * Why dedicated modal (not merged with edit or action):
 * - Unique UI: role select + warning box untuk super_admin
 * - Destructive enough untuk butuh explicit confirm
 * - Super admin role punya extra security warning
 *
 * Trigger flow:
 *   User pilih role baru dari dropdown di UserRow →
 *   page.tsx open modal dengan { user, newRole } →
 *   Konfirmasi → PATCH API.
 */

import { useState } from 'react';
import { Shield, AlertTriangle } from 'lucide-react';
import { ApiError, useApi } from '@/lib/api/client';
import {
  ROLE_CONFIG,
  userDisplayName,
  type User,
  type UserRole,
} from '@/types/users';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
} from '@/components/ui/dialog';

export interface UserRoleModalProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
  newRole: UserRole | null;
  onSuccess: () => void;
  onToast: (message: string, ok: boolean) => void;
}

export function UserRoleModal({
  open,
  onClose,
  user,
  newRole,
  onSuccess,
  onToast,
}: UserRoleModalProps) {
  const api = useApi();
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  const handleConfirm = async () => {
    if (!user || !newRole) return;

    setLoading(true);
    try {
      await api.patch(`/admin/users/${user.id}/role`, { role: newRole });
      onToast(
        `Role diubah ke ${ROLE_CONFIG[newRole].label}`,
        true
      );
      onClose();
      onSuccess();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Gagal mengubah role';
      onToast(message, false);
    } finally {
      setLoading(false);
    }
  };

  if (!user || !newRole) return null;

  const currentRoleConfig = ROLE_CONFIG[user.role];
  const newRoleConfig = ROLE_CONFIG[newRole];
  const isElevatingToSuperAdmin = newRole === 'super_admin';
  const displayName = userDisplayName(user);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      size="md"
      ariaLabel="Konfirmasi ubah role"
    >
      <DialogHeader
        icon={
          isElevatingToSuperAdmin ? (
            <AlertTriangle size={18} />
          ) : (
            <Shield size={18} />
          )
        }
        title="Konfirmasi Ubah Role"
        description={`Ubah role ${displayName}?`}
        tone={isElevatingToSuperAdmin ? 'warning' : 'primary'}
      />

      <DialogBody>
        {/* Role comparison */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-muted border border-border">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">
              Dari
            </div>
            <RoleChip role={user.role} />
          </div>
          <div className="text-text-subtle text-lg">→</div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">
              Menjadi
            </div>
            <RoleChip role={newRole} />
          </div>
        </div>

        {/* Portal access info */}
        <div className="text-xs text-text-muted leading-relaxed">
          <span className="font-semibold text-text">Akses portal baru:</span>{' '}
          {newRoleConfig.portals.map((p) => p.label).join(', ')}
        </div>

        {/* Super admin warning */}
        {isElevatingToSuperAdmin && (
          <div className="flex gap-2 rounded-lg bg-status-critical/8 border border-status-critical/20 px-3 py-3">
            <AlertTriangle
              size={14}
              className="text-status-critical shrink-0 mt-0.5"
            />
            <div className="text-xs text-status-critical leading-relaxed">
              <div className="font-bold mb-1">Akses Penuh Platform!</div>
              Super Admin bisa mengelola semua user, semua layanan, dan tidak
              bisa dinonaktifkan tanpa bantuan teknis. Pastikan user tepercaya.
            </div>
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
          variant={isElevatingToSuperAdmin ? 'danger' : 'primary'}
          onClick={handleConfirm}
          loading={loading}
        >
          {loading ? 'Mengubah...' : 'Ya, Ubah Role'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

/* ─── Role chip helper — mini badge dengan label ─── */

function RoleChip({ role }: { role: UserRole }) {
  const config = ROLE_CONFIG[role];

  // Special case super_admin + service_user (no service color)
  if (role === 'super_admin') {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-bold bg-brand-teal/10 text-brand-teal border border-brand-teal/20 whitespace-nowrap">
        {config.label}
      </span>
    );
  }
  if (role === 'service_user') {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-bold bg-surface-muted text-text-muted border border-border whitespace-nowrap">
        {config.label}
      </span>
    );
  }

  return (
    <Badge variant="service" service={config.service!} style_="soft" size="sm">
      {config.label}
    </Badge>
  );
}
