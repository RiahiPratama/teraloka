'use client';
// ════════════════════════════════════════════════════════════════
// BALAUNDRY Admin — ConfirmModal (aksi konsekuensial)
// PATH: src/components/balaundry/admin/ConfirmModal.tsx
// Wrap Dialog primitive (@/components/ui/dialog). Material Symbols icon.
// Buat verify/tolak/suspend: konfirmasi + note/reason opsional + disable saat submit.
// ════════════════════════════════════════════════════════════════
import { useState } from 'react';
import {
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  /** Dipanggil dengan isi note/reason (string, bisa kosong). */
  onConfirm: (note: string) => void;
  title: string;
  description?: string;
  /** Material Symbols icon name */
  icon: string;
  /** Tone header Dialog */
  tone?: 'default' | 'primary' | 'warning' | 'danger' | 'info';
  confirmLabel: string;
  /** Warna tombol konfirmasi */
  confirmTone?: 'balaundry' | 'danger';
  /** Kalau diisi → tampil textarea note/reason (opsional). */
  noteLabel?: string;
  notePlaceholder?: string;
  /** Disable + spinner saat parent submit. */
  submitting?: boolean;
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  icon,
  tone = 'primary',
  confirmLabel,
  confirmTone = 'balaundry',
  noteLabel,
  notePlaceholder,
  submitting = false,
}: ConfirmModalProps) {
  const [note, setNote] = useState('');

  const handleClose = () => {
    if (submitting) return; // jangan tutup saat submit
    setNote('');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      size="sm"
      showClose={!submitting}
      disableBackdropClose={submitting}
      disableEscapeClose={submitting}
      ariaLabel={title}
    >
      <DialogHeader
        icon={<span className="material-symbols-outlined text-[22px]">{icon}</span>}
        title={title}
        description={description}
        tone={tone}
      />
      {noteLabel && (
        <DialogBody>
          <label className="text-xs font-medium text-text-muted">
            {noteLabel}
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={notePlaceholder}
              disabled={submitting}
              rows={3}
              className="mt-1 w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-colors focus:border-balaundry disabled:opacity-50"
            />
          </label>
        </DialogBody>
      )}
      <DialogFooter>
        <button
          type="button"
          onClick={handleClose}
          disabled={submitting}
          className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-text-muted transition-colors hover:text-text disabled:opacity-50"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={() => onConfirm(note.trim())}
          disabled={submitting}
          className={cn(
            'inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60',
            confirmTone === 'danger' ? 'bg-status-critical' : 'bg-balaundry',
          )}
        >
          {submitting && (
            <span className="material-symbols-outlined animate-spin text-[18px]">
              progress_activity
            </span>
          )}
          {confirmLabel}
        </button>
      </DialogFooter>
    </Dialog>
  );
}
