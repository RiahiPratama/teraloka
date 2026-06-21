'use client';

/**
 * TeraLoka — Dialog
 * Phase 2 · Batch 7a2 — Reusable Modal Primitive
 * ------------------------------------------------------------
 * Modal dialog primitive dengan backdrop overlay.
 *
 * Features:
 * - Backdrop click → close
 * - Escape key → close
 * - Tombol X (close) pojok kanan-atas — gated `showClose` (default true)
 * - Body scroll lock saat open
 * - Focus auto ke first interactive element on open (skip tombol Close)
 * - Size variants (sm/md/lg)
 * - Compositional: Dialog + DialogHeader + DialogBody + DialogFooter
 *
 * CATATAN PADDING (penting):
 *   Padding horizontal/vertical header·body·footer dipasang via INLINE STYLE,
 *   BUKAN class padding Tailwind (px / py). Sebab: di konteks BAKOS publik ada reset
 *   CSS agresif yang nge-strip padding class Tailwind di <div> (gejala: konten
 *   mepet ke tepi). Inline style menang lawan reset stylesheet → padding konsisten
 *   di SEMUA konteks (admin + bakos). Caller masih bisa override via prop `style`.
 *
 * Usage:
 *   <Dialog open={open} onClose={() => setOpen(false)} size="md">
 *     <DialogHeader icon={<Plus size={18} />} title="Tambah User" tone="primary" />
 *     <DialogBody> ... </DialogBody>
 *     <DialogFooter> ... </DialogFooter>
 *   </Dialog>
 */

import {
  useEffect,
  useRef,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─── Types ─── */

type DialogSize = 'sm' | 'md' | 'lg';
type DialogTone = 'default' | 'primary' | 'warning' | 'danger' | 'info';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  /** Max width variant. Default 'md' (~420px). */
  size?: DialogSize;
  /** Disable close on backdrop click (default: bisa close) */
  disableBackdropClose?: boolean;
  /** Disable Escape key close */
  disableEscapeClose?: boolean;
  /** Tampilkan tombol X (close) di pojok kanan-atas. Default true.
   *  Set false untuk confirm-dialog yang maksa user milih lewat footer. */
  showClose?: boolean;
  /** Aria label untuk dialog */
  ariaLabel?: string;
  className?: string;
  children: ReactNode;
}

const SIZE_STYLES: Record<DialogSize, string> = {
  sm: 'max-w-sm',    // 384px
  md: 'max-w-md',    // 448px
  lg: 'max-w-lg',    // 512px
};

// Padding inline (lihat CATATAN PADDING). Angka = ekuivalen Tailwind sebelumnya, lega.
const PAD_X = 24;          // px-6
const PAD_X_RIGHT_X = 48;  // ruang buat tombol X di header

/* ─── Main Dialog ─── */

export function Dialog({
  open,
  onClose,
  size = 'md',
  disableBackdropClose = false,
  disableEscapeClose = false,
  showClose = true,
  ariaLabel,
  className,
  children,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Escape to close
  useEffect(() => {
    if (!open || disableEscapeClose) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, disableEscapeClose, onClose]);

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // Focus first interactive element on open (skip tombol Close)
  useEffect(() => {
    if (!open || !panelRef.current) return;
    const timer = requestAnimationFrame(() => {
      const focusable = panelRef.current?.querySelector<HTMLElement>(
        'input, textarea, select, button:not([aria-label="Close"])'
      );
      focusable?.focus();
    });
    return () => cancelAnimationFrame(timer);
  }, [open]);

  if (!open) return null;

  const handleBackdropClick = () => {
    if (!disableBackdropClose) onClose();
  };

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex items-center justify-center p-4',
        'bg-black/60 backdrop-blur-[2px]',
        'animate-in fade-in duration-150'
      )}
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'relative w-full bg-surface rounded-2xl',
          'border border-border shadow-2xl',
          'flex flex-col max-h-[90vh] overflow-hidden',
          SIZE_STYLES[size],
          className
        )}
        style={{ animation: 'fadeIn 0.2s ease' }}
      >
        {/* Tombol X — posisi+ukuran via INLINE STYLE biar tahan reset `.bakos-lp button`.
            aria-label="Close" → auto-focus primitive otomatis skip tombol ini. */}
        {showClose && (
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="text-text-muted hover:text-text transition-colors"
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 32,
              width: 32,
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        )}

        {children}
      </div>
    </div>
  );
}

/* ─── DialogHeader ─── */

const TONE_STYLES: Record<DialogTone, { iconBg: string; iconColor: string }> = {
  default: { iconBg: 'bg-surface-muted', iconColor: 'text-text-secondary' },
  primary: { iconBg: 'bg-brand-teal/10', iconColor: 'text-brand-teal' },
  warning: { iconBg: 'bg-status-warning/12', iconColor: 'text-status-warning' },
  danger:  { iconBg: 'bg-status-critical/12', iconColor: 'text-status-critical' },
  info:    { iconBg: 'bg-status-info/12', iconColor: 'text-status-info' },
};

export interface DialogHeaderProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  tone?: DialogTone;
  /** Centered layout (untuk confirm dialogs kecil) */
  centered?: boolean;
  className?: string;
}

export function DialogHeader({
  icon,
  title,
  description,
  tone = 'default',
  centered = false,
  className,
}: DialogHeaderProps) {
  const toneStyle = TONE_STYLES[tone];

  if (centered) {
    // padding inline (tahan reset bakos). pt-6/pb-2/px-6 ekuivalen.
    const centeredPad: CSSProperties = {
      paddingTop: 24, paddingBottom: 8, paddingLeft: PAD_X, paddingRight: PAD_X,
    };
    return (
      <div className={cn('flex flex-col items-center text-center', className)} style={centeredPad}>
        {icon && (
          <div
            className={cn(
              'flex items-center justify-center h-12 w-12 rounded-xl mb-3',
              toneStyle.iconBg,
              toneStyle.iconColor
            )}
          >
            {icon}
          </div>
        )}
        <h2 className="text-base font-bold text-text leading-tight">{title}</h2>
        {description && (
          <p className="text-sm text-text-muted mt-1.5 leading-relaxed max-w-sm">{description}</p>
        )}
      </div>
    );
  }

  // padding inline (tahan reset bakos). pr lebih besar = ruang tombol X.
  const headerPad: CSSProperties = {
    paddingTop: 20, paddingBottom: 12, paddingLeft: PAD_X, paddingRight: PAD_X_RIGHT_X,
  };
  return (
    <div className={cn('flex items-start gap-3', className)} style={headerPad}>
      {icon && (
        <div
          className={cn(
            'flex items-center justify-center h-10 w-10 rounded-lg shrink-0',
            toneStyle.iconBg,
            toneStyle.iconColor
          )}
        >
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0 pt-0.5">
        <h2 className="text-base font-bold text-text leading-tight">{title}</h2>
        {description && (
          <p className="text-xs text-text-muted mt-1 leading-relaxed">{description}</p>
        )}
      </div>
    </div>
  );
}

/* ─── DialogBody ─── */

export function DialogBody({
  className,
  children,
  style,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  // padding inline (tahan reset bakos); caller bisa override lewat prop `style`.
  const bodyPad: CSSProperties = {
    paddingTop: 12, paddingBottom: 12, paddingLeft: PAD_X, paddingRight: PAD_X,
    ...style,
  };
  return (
    <div
      className={cn('flex flex-col gap-3 overflow-y-auto', className)}
      style={bodyPad}
      {...props}
    >
      {children}
    </div>
  );
}

/* ─── DialogFooter ─── */

export function DialogFooter({
  className,
  children,
  style,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  // padding inline (tahan reset bakos); caller bisa override lewat prop `style`.
  const footerPad: CSSProperties = {
    paddingTop: 12, paddingBottom: 20, paddingLeft: PAD_X, paddingRight: PAD_X,
    marginTop: 8,
    ...style,
  };
  return (
    <div
      className={cn('flex items-center gap-2', '[&>button]:flex-1', className)}
      style={footerPad}
      {...props}
    >
      {children}
    </div>
  );
}
