'use client';

/**
 * TeraLoka — IconButton
 * Phase 2 · Batch 3a — UI Primitives Core
 * ------------------------------------------------------------
 * Tombol square icon-only untuk toolbar, header, table row actions.
 * Selalu butuh `aria-label` untuk accessibility (wajib di type).
 *
 * Sama variants sama Button (primary / secondary / ghost / danger).
 * Sizes beda: pakai square (width = height).
 *
 * Contoh:
 *   <IconButton aria-label="Edit" onClick={edit}>
 *     <Edit2 size={14} />
 *   </IconButton>
 *
 *   <IconButton aria-label="Hapus" variant="danger" loading>
 *     <Trash2 size={14} />
 *   </IconButton>
 */

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from './spinner';

type IconButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'aria-label'> {
  /** WAJIB — screen reader label */
  'aria-label': string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
  children: ReactNode;
}

const BASE =
  'inline-flex items-center justify-center shrink-0 rounded-lg ' +
  'transition-colors duration-150 select-none ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
  'focus-visible:ring-offset-background ' +
  'disabled:cursor-not-allowed disabled:opacity-60';

const VARIANTS: Record<IconButtonVariant, string> = {
  primary: cn(
    'bg-brand-teal text-white',
    'hover:bg-brand-teal-light active:bg-brand-teal',
    'focus-visible:ring-brand-teal'
  ),
  secondary: cn(
    'bg-surface text-text border border-border',
    'hover:bg-surface-muted active:bg-surface-elevated',
    'focus-visible:ring-brand-teal'
  ),
  ghost: cn(
    'bg-transparent text-text-muted',
    'hover:bg-surface-muted hover:text-text',
    'focus-visible:ring-brand-teal'
  ),
  danger: cn(
    'bg-transparent text-text-muted',
    'hover:bg-status-critical/10 hover:text-status-critical',
    'focus-visible:ring-status-critical'
  ),
};

const SIZES: Record<IconButtonSize, string> = {
  sm: 'h-8 w-8',
  md: 'h-9 w-9',
  lg: 'h-10 w-10',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      variant = 'ghost',
      size = 'md',
      loading = false,
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
        className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
        {...props}
      >
        {loading ? <Spinner size="sm" /> : children}
      </button>
    );
  }
);
