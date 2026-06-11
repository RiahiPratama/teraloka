'use client';

/**
 * TeraLoka — UserEditModal
 * Phase 2 · Batch 7a3 — Avatar Upload Integration
 * ------------------------------------------------------------
 * Combined modal untuk 4 edit actions:
 * - mode='name'   → PATCH /admin/users/:id/name    body: { name }
 * - mode='phone'  → PATCH /admin/users/:id/phone   body: { phone, reason }
 * - mode='email'  → PATCH /admin/users/:id/email   body: { email, reason }
 * - mode='avatar' → PATCH /admin/users/:id/avatar  body: { avatar_url }
 *
 * Avatar mode menggunakan ImageUpload component (upload langsung ke
 * Supabase Storage bucket 'avatars'). Backend menerima URL hasil upload.
 *
 * Phone mode extra field: reason (optional audit trail).
 * Phone mode warning: JWT lama masih valid sampai expired.
 *
 * EMAIL mode (11 Jun 2026 — TL-AUTH-LINK):
 *   Set/ubah email = ACCOUNT LINKING. User OTP lama yang di-set email-nya
 *   bisa login Google ke akun LAMA mereka (handler /auth/google auto-link
 *   by verified email). KRUSIAL untuk selamatkan super_admin dari lockout.
 *   Warning keamanan: email = kunci login Google, harus benar & dikuasai user.
 */

import { useState, useEffect, type FormEvent } from 'react';
import { Edit3, Phone, Mail, Camera, Trash2 } from 'lucide-react';
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
import ImageUpload from '@/components/ui/ImageUpload';

export type EditMode = 'name' | 'phone' | 'email' | 'avatar';

export interface UserEditModalProps {
  open: boolean;
  onClose: () => void;
  /** Mode edit: 'name', 'phone', 'email', atau 'avatar' */
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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize state when modal opens or user/mode changes
  useEffect(() => {
    if (!open || !user) {
      setValue('');
      setReason('');
      setAvatarUrl(null);
      setError(null);
      return;
    }
    if (mode === 'name') {
      setValue(user.name ?? '');
    } else if (mode === 'phone') {
      setValue(user.phone ?? '');
      setReason('');
    } else if (mode === 'email') {
      setValue(user.email ?? '');
      setReason('');
    } else if (mode === 'avatar') {
      setAvatarUrl(user.avatar_url);
    }
  }, [open, user, mode]);

  const handleClose = () => {
    if (loading) return;
    setValue('');
    setReason('');
    setAvatarUrl(null);
    setError(null);
    onClose();
  };

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!user) return;

    // Validation untuk name/phone/email modes
    if (mode === 'name' || mode === 'phone' || mode === 'email') {
      const trimmed = value.trim();
      if (!trimmed) {
        setError(
          mode === 'name' ? 'Nama tidak boleh kosong' :
          mode === 'phone' ? 'Nomor WA tidak boleh kosong' :
          'Email tidak boleh kosong'
        );
        return;
      }
      // Validasi format email (sebelum kirim ke server)
      if (mode === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        setError('Format email tidak valid');
        return;
      }
    }
    setError(null);

    setLoading(true);
    try {
      if (mode === 'name') {
        await api.patch(`/admin/users/${user.id}/name`, { name: value.trim() });
        onToast('Nama berhasil diubah', true);
      } else if (mode === 'phone') {
        await api.patch(`/admin/users/${user.id}/phone`, {
          phone: value.trim(),
          reason: reason.trim(),
        });
        onToast('Nomor WA berhasil diubah', true);
      } else if (mode === 'email') {
        await api.patch(`/admin/users/${user.id}/email`, {
          email: value.trim(),
          reason: reason.trim(),
        });
        onToast('Email berhasil diubah', true);
      } else if (mode === 'avatar') {
        // avatar_url bisa null (remove) atau string URL (new avatar)
        await api.patch(`/admin/users/${user.id}/avatar`, {
          avatar_url: avatarUrl,
        });
        onToast(
          avatarUrl
            ? 'Foto profil berhasil diubah'
            : 'Foto profil berhasil dihapus',
          true
        );
      }
      handleClose();
      onSuccess();
    } catch (err) {
      const errorMap: Record<EditMode, string> = {
        name: 'Gagal mengubah nama',
        phone: 'Gagal mengubah nomor WA',
        email: 'Gagal mengubah email',
        avatar: 'Gagal mengubah foto profil',
      };
      const message =
        err instanceof ApiError ? err.message : errorMap[mode];
      onToast(message, false);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAvatar = () => {
    if (loading) return;
    setAvatarUrl(null);
  };

  // Header config per mode
  const icon =
    mode === 'name' ? <Edit3 size={18} /> :
    mode === 'phone' ? <Phone size={18} /> :
    mode === 'email' ? <Mail size={18} /> :
    <Camera size={18} />;

  const title =
    mode === 'name' ? 'Edit Nama' :
    mode === 'phone' ? 'Ganti Nomor WA' :
    mode === 'email' ? 'Ganti Email' :
    'Ganti Foto Profil';

  const description =
    mode === 'name' ? 'Nama tampil di platform TeraLoka' :
    mode === 'phone' ? 'Nomor WA lama akan diganti. JWT lama tetap valid sampai expired.' :
    mode === 'email' ? 'Email dipakai untuk login Google. Pastikan email benar & dikuasai user.' :
    'Upload foto baru atau hapus foto existing';

  const tone: 'primary' | 'warning' =
    mode === 'name' ? 'primary' :
    mode === 'phone' ? 'warning' :
    mode === 'email' ? 'warning' :
    'primary';

  const submitLabel =
    mode === 'name' ? 'Simpan' :
    mode === 'phone' ? 'Ganti Nomor' :
    mode === 'email' ? 'Simpan Email' :
    'Simpan Foto';

  const submitLoadingLabel =
    mode === 'name' ? 'Menyimpan...' :
    mode === 'phone' ? 'Mengganti...' :
    mode === 'email' ? 'Menyimpan...' :
    'Menyimpan...';

  // Determine if submit enabled — untuk avatar, enable kalau ada perubahan
  const avatarChanged = mode === 'avatar' && avatarUrl !== (user?.avatar_url ?? null);
  const canSubmit =
    mode === 'name' || mode === 'phone' || mode === 'email'
      ? value.trim().length > 0
      : avatarChanged;

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
          {/* Phone warning banner */}
          {mode === 'phone' && (
            <div className="rounded-lg bg-status-warning/8 border border-status-warning/20 px-3 py-2.5 text-xs text-status-warning leading-relaxed">
              ⚠️ JWT lama tetap valid sampai expired (30 hari). User harus
              verifikasi ulang dengan nomor baru untuk relogin.
            </div>
          )}

          {/* Email warning banner — account linking security */}
          {mode === 'email' && (
            <div className="rounded-lg bg-status-warning/8 border border-status-warning/20 px-3 py-2.5 text-xs text-status-warning leading-relaxed">
              ⚠️ Email ini jadi kunci login Google ke akun user. Siapa pun yang
              bisa login Google dengan email ini akan masuk ke akun ini. Pastikan
              email benar & beneran dikuasai user yang bersangkutan.
            </div>
          )}

          {/* Name / Phone / Email input */}
          {(mode === 'name' || mode === 'phone' || mode === 'email') && (
            <>
              <Input
                label={
                  mode === 'name' ? 'Nama Lengkap' :
                  mode === 'phone' ? 'Nomor WA Baru' :
                  'Email Baru'
                }
                required
                type={
                  mode === 'name' ? 'text' :
                  mode === 'phone' ? 'tel' :
                  'email'
                }
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={
                  mode === 'name' ? 'Nama lengkap...' :
                  mode === 'phone' ? '628XXXXXXXXXX' :
                  'nama@gmail.com'
                }
                error={error ?? undefined}
                autoFocus
                disabled={loading}
              />

              {(mode === 'phone' || mode === 'email') && (
                <Input
                  label="Alasan"
                  helperText="Opsional — untuk audit log"
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={
                    mode === 'phone'
                      ? 'HP hilang, ganti kartu, dll...'
                      : 'Link akun ke Google, pemulihan akses, dll...'
                  }
                  disabled={loading}
                />
              )}
            </>
          )}

          {/* Avatar upload */}
          {mode === 'avatar' && (
            <div className="flex flex-col gap-3">
              <ImageUpload
                bucket="avatars"
                existingUrls={avatarUrl ? [avatarUrl] : []}
                onUpload={(urls) => {
                  setAvatarUrl(urls[0] ?? null);
                }}
                label="Foto Profil"
                maxFiles={1}
                maxSizeMB={1}
              />

              {/* Extra "Hapus foto" button — backup jika user ingin remove tanpa upload baru */}
              {avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-status-critical hover:text-status-critical/80 disabled:opacity-50 transition-colors self-start"
                >
                  <Trash2 size={12} />
                  Hapus foto profil
                </button>
              )}

              <p className="text-[11px] text-text-muted leading-relaxed">
                Upload max 1 foto, 1MB. Format: JPG, PNG, WebP.
                {avatarChanged && (
                  <span className="block mt-1 font-semibold text-status-info">
                    ℹ️ Klik &quot;Simpan Foto&quot; untuk konfirmasi perubahan.
                  </span>
                )}
              </p>
            </div>
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
          <Button
            type="submit"
            loading={loading}
            disabled={!canSubmit && !loading}
          >
            {loading ? submitLoadingLabel : submitLabel}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
