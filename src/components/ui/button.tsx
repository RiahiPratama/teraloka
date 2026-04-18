'use client';

/**
 * TeraLoka — Button
 * Phase 2 · Batch 3a — UI Primitives Core
 * ------------------------------------------------------------
 * Reusable button dengan 4 variants + 3 sizes + loading state.
 *
 * Variants:
 * - primary   → brand teal, solid (primary actions, submit)
 * - secondary → surface muted, bordered (secondary actions)
 * - ghost     → transparent (tertiary, toolbar)
 * - danger    → red, untuk destructive action (delete, deactivate)
 *
 * Sizes:
 * - sm → 32px height, text-sm
 * - md → 38px height, text-sm (default)
 * - lg → 44px height, text-base
 *
 * Contoh:
 *   <Button onClick={save}>Simpan</Button>
 *   <Button variant="secondary" size="sm">Batal</Button>
 *   <Button variant="danger" loading>Menghapus...</Button>
 *   <Button leftIcon={<Plus size={14} />}>Tambah User</Button>
 */

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from './spinner';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Tampilkan spinner + disable klik. Loading text pakai children. */
  loading?: boolean;
  /** Icon di kiri text */
  leftIcon?: ReactNode;
  /** Icon di kanan text */
  rightIcon?: ReactNode;
  /** Full width parent container */
  fullWidth?: boolean;
  /** type attribute — default 'button' supaya gak auto-submit di dalam form */
  type?: 'button' | 'submit' | 'reset';
}

const BASE =
  'inline-flex items-center justify-center gap-2 font-semibold rounded-lg ' +
  'transition-colors duration-150 select-none ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
  'focus-visible:ring-offset-background ' +
  'disabled:cursor-not-allowed disabled:opacity-60';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: cn(
    'bg-brand-teal text-white',
    'hover:bg-brand-teal-light',
    'active:bg-brand-teal',
    'focus-visible:ring-brand-teal',
    'disabled:hover:bg-brand-teal'
  ),
  secondary: cn(
    'bg-surface text-text border border-border',
    'hover:bg-surface-muted',
    'active:bg-surface-elevated',
    'focus-visible:ring-brand-teal'
  ),
  ghost: cn(
    'bg-transparent text-text-secondary',
    'hover:bg-surface-muted hover:text-text',
    'active:bg-surface-elevated',
    'focus-visible:ring-brand-teal'
  ),
  danger: cn(
    'bg-status-critical text-white',
    'hover:brightness-110',
    'active:brightness-95',
    'focus-visible:ring-status-critical'
  ),
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-[38px] px-4 text-sm',
  lg: 'h-11 px-5 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      type = 'button',
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={loading}
        className={cn(
          BASE,
          VARIANTS[variant],
          SIZES[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {loading ? (
          <Spinner size={size === 'lg' ? 'md' : 'sm'} />
        ) : leftIcon ? (
          <span className="shrink-0">{leftIcon}</span>
        ) : null}
        {children}
        {!loading && rightIcon ? (
          <span className="shrink-0">{rightIcon}</span>
        ) : null}
      </button>
    );
  }
);
