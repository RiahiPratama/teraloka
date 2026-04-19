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
 * - Body scroll lock saat open
 * - Focus auto ke first interactive element on open
 * - Size variants (sm/md/lg)
 * - Compositional: Dialog + DialogHeader + DialogBody + DialogFooter
 *
 * Usage:
 *   const [open, setOpen] = useState(false);
 *
 *   <Dialog open={open} onClose={() => setOpen(false)} size="md">
 *     <DialogHeader
 *       icon={<Plus size={18} />}
 *       title="Tambah User Baru"
 *       description="User bisa langsung login via OTP WA"
 *       tone="primary"
 *     />
 *     <DialogBody>
 *       <Input label="Nomor WA" required />
 *       <Input label="Nama" />
 *     </DialogBody>
 *     <DialogFooter>
 *       <Button variant="secondary" onClick={() => setOpen(false)}>Batal</Button>
 *       <Button onClick={handleSubmit}>Simpan</Button>
 *     </DialogFooter>
 *   </Dialog>
 */

import {
  useEffect,
  useRef,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
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

/* ─── Main Dialog ─── */

export function Dialog({
  open,
  onClose,
  size = 'md',
  disableBackdropClose = false,
  disableEscapeClose = false,
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

  // Focus first interactive element on open
  useEffect(() => {
    if (!open || !panelRef.current) return;
    // Delay 1 frame biar animation start + DOM ready
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
        'fixed inset-0 z-50 flex items-center justify-center p-4',
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
        {children}
      </div>
    </div>
  );
}

/* ─── DialogHeader ─── */

const TONE_STYLES: Record<DialogTone, { iconBg: string; iconColor: string }> = {
  default: {
    iconBg: 'bg-surface-muted',
    iconColor: 'text-text-secondary',
  },
  primary: {
    iconBg: 'bg-brand-teal/10',
    iconColor: 'text-brand-teal',
  },
  warning: {
    iconBg: 'bg-status-warning/12',
    iconColor: 'text-status-warning',
  },
  danger: {
    iconBg: 'bg-status-critical/12',
    iconColor: 'text-status-critical',
  },
  info: {
    iconBg: 'bg-status-info/12',
    iconColor: 'text-status-info',
  },
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
    return (
      <div className={cn('flex flex-col items-center text-center px-6 pt-6 pb-2', className)}>
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
        <h2 className="text-base font-bold text-text leading-tight">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-text-muted mt-1.5 leading-relaxed max-w-sm">
            {description}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex items-start gap-3 px-5 pt-5 pb-3', className)}>
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
        <h2 className="text-base font-bold text-text leading-tight">
          {title}
        </h2>
        {description && (
          <p className="text-xs text-text-muted mt-1 leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── DialogBody ─── */

export function DialogBody({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'px-5 py-3 flex flex-col gap-3 overflow-y-auto',
        className
      )}
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
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-5 pt-3 pb-5 mt-2',
        '[&>button]:flex-1',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
